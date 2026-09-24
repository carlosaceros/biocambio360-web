/**
 * Token-saving caches for the AI agent.
 *
 *  1. Prompt cache (Gemini explicit context caching): the static prefix (rules + catalog, ~5k tokens)
 *     is stored once at Google and billed at ~10% on every following turn. The cache handle is shared
 *     across serverless instances through Firestore and is created lazily, so nothing is stored (or
 *     paid) while there is no traffic.
 *  2. Response cache: the same first message ("hola", "precio del detergente de 20L") gets the same
 *     stateless answer, so the model is not called at all. Keyed by the catalog hash: a price change
 *     invalidates it automatically.
 *  3. Usage metering per day (tokens, cached tokens, cache hits) to see the real savings.
 *
 * Every function here fails soft: on any error the agent simply falls back to the uncached path.
 */

import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleAICacheManager } from '@google/generative-ai/server';
import { getAdminDB } from '@/lib/firebase-admin';

const MODEL = 'gemini-2.5-flash';
const PROMPT_CACHE_TTL_SECONDS = 30 * 60;
const PROMPT_CACHE_REFRESH_MARGIN_MS = 2 * 60 * 1000;
const RESPONSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const sha = (text: string, len = 16) => crypto.createHash('sha256').update(text).digest('hex').slice(0, len);

// ─── 1. Prompt cache ──────────────────────────────────────────────────────────

let promptCacheMemo: { name: string; hash: string; expiresAtMs: number } | null = null;

/**
 * Returns the name of a live Gemini cached-content holding `systemPrompt`, creating it if needed.
 * Returns null when caching is unavailable (caller must use the normal uncached request).
 */
export async function getPromptCacheName(apiKey: string, systemPrompt: string): Promise<string | null> {
    try {
        const hash = sha(systemPrompt);
        const now = Date.now();

        if (promptCacheMemo && promptCacheMemo.hash === hash && promptCacheMemo.expiresAtMs - now > PROMPT_CACHE_REFRESH_MARGIN_MS) {
            return promptCacheMemo.name;
        }

        const ref = getAdminDB().collection('bot_config').doc('ai_prompt_cache');
        const snap = await ref.get();
        const data = snap.data();
        if (data && data.hash === hash && data.model === MODEL && Date.parse(data.expiresAt) - now > PROMPT_CACHE_REFRESH_MARGIN_MS) {
            promptCacheMemo = { name: data.name, hash, expiresAtMs: Date.parse(data.expiresAt) };
            return data.name;
        }

        const created = await new GoogleAICacheManager(apiKey).create({
            model: `models/${MODEL}`,
            displayName: `biocambio-agent-${hash}`,
            systemInstruction: systemPrompt,
            // A base exchange so the real conversation can start with a user turn
            contents: [
                { role: 'user', parts: [{ text: 'Contexto base del asistente cargado.' }] },
                { role: 'model', parts: [{ text: 'Entendido.' }] },
            ],
            ttlSeconds: PROMPT_CACHE_TTL_SECONDS,
        });

        const expiresAtMs = now + PROMPT_CACHE_TTL_SECONDS * 1000;
        promptCacheMemo = { name: created.name as string, hash, expiresAtMs };
        await ref.set({ name: created.name, hash, model: MODEL, expiresAt: new Date(expiresAtMs).toISOString() });
        console.log(`[ai-cache] Prompt cache created: ${created.name}`);
        return created.name as string;
    } catch (err) {
        console.warn('[ai-cache] Prompt cache unavailable, using uncached request:', err instanceof Error ? err.message : err);
        return null;
    }
}

export function invalidatePromptCache(): void {
    promptCacheMemo = null;
}

// ─── 2. Response cache ────────────────────────────────────────────────────────

export interface CachedAgentReply {
    mensajes: string[];
    options: string[];
    items: Array<{ producto: string; presentacion: string; cantidad: number }>;
    botonWeb?: boolean;
}

function normalizeQuestion(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Only short, stateless first messages are cacheable (no personal data can be inside them). */
export function cacheKeyFor(message: string, catalogHash: string, extra: string = ''): string | null {
    const normalized = normalizeQuestion(message);
    if (normalized.length < 2 || normalized.length > 80) return null;
    return sha(`${catalogHash}|${extra}|${normalized}`, 32);
}

export async function getCachedReply(key: string): Promise<CachedAgentReply | null> {
    try {
        const ref = getAdminDB().collection('ai_response_cache').doc(key);
        const snap = await ref.get();
        const data = snap.data();
        if (!data || Date.parse(data.expiresAt) < Date.now()) return null;
        ref.update({ hits: FieldValue.increment(1), lastHitAt: new Date().toISOString() }).catch(() => undefined);
        return { mensajes: data.mensajes ?? [], options: data.options ?? [], items: data.items ?? [], botonWeb: !!data.botonWeb };
    } catch {
        return null;
    }
}

export async function storeCachedReply(key: string, reply: CachedAgentReply): Promise<void> {
    try {
        await getAdminDB().collection('ai_response_cache').doc(key).set({
            ...reply,
            hits: 0,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + RESPONSE_CACHE_TTL_MS).toISOString(),
        });
    } catch (err) {
        console.warn('[ai-cache] Could not store cached reply:', err instanceof Error ? err.message : err);
    }
}

// ─── 3. Usage metering ────────────────────────────────────────────────────────

function bogotaDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export async function recordUsage(entry: {
    promptTokens?: number;
    cachedTokens?: number;
    outputTokens?: number;
    responseCacheHit?: boolean;
}): Promise<void> {
    try {
        await getAdminDB().collection('ai_usage').doc(bogotaDate()).set(
            {
                llmCalls: FieldValue.increment(entry.responseCacheHit ? 0 : 1),
                responseCacheHits: FieldValue.increment(entry.responseCacheHit ? 1 : 0),
                promptTokens: FieldValue.increment(entry.promptTokens ?? 0),
                cachedTokens: FieldValue.increment(entry.cachedTokens ?? 0),
                outputTokens: FieldValue.increment(entry.outputTokens ?? 0),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
    } catch {
        /* metering must never break a conversation */
    }
}
