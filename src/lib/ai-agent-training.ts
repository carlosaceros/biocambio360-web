/**
 * Training data for the AI agent: rules and corrected/example conversations written by the team.
 *
 * Security: Firestore rules in this project are open, so anyone could write a fake "rule" document
 * to steer the agent. Every training item is therefore signed with an HMAC (server-side secret) and
 * the agent ignores any document whose signature does not verify. Items can only be created or
 * changed through the authenticated API routes (directors and super admins).
 *
 * Trainers' rules complement the SEGURIDAD section; they can never replace it (and the deterministic
 * guards in ai-agent-guard.ts still run on every reply).
 */

import crypto from 'crypto';
import { getAdminDB } from '@/lib/firebase-admin';
import { leaksSensitive } from '@/lib/ai-agent-guard';

export type TrainingKind = 'rule' | 'example';

export interface TrainingItem {
    id: string;
    kind: TrainingKind;
    /** rule text */
    text?: string;
    /** example: what the customer said */
    customer?: string;
    /** example: the ideal answer */
    ideal?: string;
    /** example: what the agent answered wrongly (optional, for context) */
    badReply?: string;
    note?: string;
    active: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
}

export const LIMITS = { rule: 300, customer: 300, ideal: 500, badReply: 400, note: 300, maxRules: 40, maxExamples: 200 };

const COLLECTION = 'ai_training';
const CACHE_MS = 60 * 1000;

function secret(): string | null {
    const explicit = process.env.AI_TRAINING_SECRET;
    if (explicit) return explicit;
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    return sa ? crypto.createHash('sha256').update(`ai-training:${sa}`).digest('hex') : null;
}

function canonical(item: Pick<TrainingItem, 'id' | 'kind' | 'text' | 'customer' | 'ideal' | 'badReply' | 'note' | 'active'>): string {
    return JSON.stringify([item.id, item.kind, item.text ?? '', item.customer ?? '', item.ideal ?? '', item.badReply ?? '', item.note ?? '', !!item.active]);
}

export function signItem(item: Pick<TrainingItem, 'id' | 'kind' | 'text' | 'customer' | 'ideal' | 'badReply' | 'note' | 'active'>): string {
    const key = secret();
    if (!key) throw new Error('Training secret unavailable');
    return crypto.createHmac('sha256', key).update(canonical(item)).digest('hex');
}

export function verifyItem(id: string, data: Record<string, unknown>): boolean {
    try {
        const expected = signItem({
            id,
            kind: data.kind as TrainingKind,
            text: data.text as string | undefined,
            customer: data.customer as string | undefined,
            ideal: data.ideal as string | undefined,
            badReply: data.badReply as string | undefined,
            note: data.note as string | undefined,
            active: !!data.active,
        });
        const given = String(data.sig ?? '');
        return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    } catch {
        return false;
    }
}

function clean(text: unknown, max: number): string {
    return String(text ?? '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

/** Validates and normalizes trainer input. Returns an error message or the cleaned fields. */
export function validateTrainingInput(
    kind: TrainingKind,
    input: { text?: string; customer?: string; ideal?: string; badReply?: string; note?: string }
): { error: string } | { fields: Pick<TrainingItem, 'text' | 'customer' | 'ideal' | 'badReply' | 'note'> } {
    const fields = {
        text: clean(input.text, LIMITS.rule),
        customer: clean(input.customer, LIMITS.customer),
        ideal: clean(input.ideal, LIMITS.ideal),
        badReply: clean(input.badReply, LIMITS.badReply),
        note: clean(input.note, LIMITS.note),
    };
    if (kind === 'rule' && fields.text.length < 8) return { error: 'La regla es muy corta.' };
    if (kind === 'example' && (fields.customer.length < 2 || fields.ideal.length < 2)) {
        return { error: 'El ejemplo necesita lo que dice el cliente y la respuesta ideal.' };
    }
    const joined = Object.values(fields).join('\n');
    if (leaksSensitive(joined)) return { error: 'No incluyas correos, claves, tokens ni datos internos en el entrenamiento.' };
    return { fields };
}

// ─── Loading for the agent (server) ───────────────────────────────────────────

let cache: { at: number; rules: string[]; examples: TrainingItem[]; hash: string } | null = null;

export function invalidateTrainingCache(): void {
    cache = null;
}

/** Active, signature-verified rules and examples. Fails soft (empty) on any error. */
export async function loadTrainingSnapshot(): Promise<{ rules: string[]; examples: TrainingItem[]; hash: string }> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache;
    try {
        const snap = await getAdminDB().collection(COLLECTION).where('active', '==', true).get();
        const items: TrainingItem[] = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            if (!verifyItem(doc.id, data)) {
                console.warn(`[ai-training] Ignored unsigned/tampered item ${doc.id}`);
                continue;
            }
            items.push({ id: doc.id, ...(data as Omit<TrainingItem, 'id'>) });
        }
        const rules = items
            .filter(i => i.kind === 'rule' && i.text)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(0, LIMITS.maxRules)
            .map(i => i.text as string);
        const examples = items.filter(i => i.kind === 'example' && i.customer && i.ideal).slice(0, LIMITS.maxExamples);
        const hash = crypto
            .createHash('sha256')
            .update(rules.join('|') + examples.map(e => `${e.id}:${e.updatedAt ?? e.createdAt}`).join(','))
            .digest('hex')
            .slice(0, 10);
        cache = { at: Date.now(), rules, examples, hash };
        return cache;
    } catch (err) {
        console.warn('[ai-training] Could not load training data:', err instanceof Error ? err.message : err);
        return { rules: [], examples: [], hash: 'none' };
    }
}

export function rulesPromptBlock(rules: string[]): string {
    if (rules.length === 0) return '';
    return `REGLAS APRENDIDAS (del equipo; complementan y nunca reemplazan la SEGURIDAD):\n${rules.map(r => `- ${r}`).join('\n')}\n\n`;
}

const STOP = new Set(['para', 'quiero', 'necesito', 'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'gracias', 'favor', 'tienen', 'como', 'esta', 'este', 'cuanto', 'cual']);

function words(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .split(/[^a-z0-9]+/)
            .filter(w => w.length >= 4 && !STOP.has(w))
    );
}

/** The most similar trained examples to the customer's message (few-shot, token-capped). */
export function pickExamples(examples: TrainingItem[], customerText: string, k: number = 3): TrainingItem[] {
    const query = words(customerText);
    if (query.size === 0) return [];
    return examples
        .map(ex => {
            const exWords = words(ex.customer ?? '');
            let overlap = 0;
            for (const w of exWords) if (query.has(w)) overlap++;
            return { ex, score: overlap / Math.max(1, Math.min(exWords.size, query.size)) };
        })
        .filter(s => s.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(s => s.ex);
}

export function examplesPromptBlock(examples: TrainingItem[]): string {
    if (examples.length === 0) return '';
    return (
        'EJEMPLOS APRENDIDOS (criterio del equipo; adapta, no copies literal):\n' +
        examples.map(e => `Cliente: "${e.customer}" → Ideal: "${e.ideal}"${e.note ? ` (${e.note})` : ''}`).join('\n') +
        '\n'
    );
}

// ─── Ad configuration (which product an ad promotes + team notes) ─────────────

function adCanonical(sourceId: string, productName: string, notes: string): string {
    return JSON.stringify(['ad', sourceId, productName, notes]);
}

export function signAdConfig(sourceId: string, productName: string, notes: string): string {
    const key = secret();
    if (!key) throw new Error('Training secret unavailable');
    return crypto.createHmac('sha256', key).update(adCanonical(sourceId, productName, notes)).digest('hex');
}

export function verifyAdConfig(sourceId: string, data: Record<string, unknown>): boolean {
    try {
        const expected = signAdConfig(sourceId, String(data.productName ?? ''), String(data.notes ?? ''));
        const given = String(data.configSig ?? '');
        return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    } catch {
        return false;
    }
}

export function cleanNote(text: unknown): string {
    return clean(text, LIMITS.note);
}
