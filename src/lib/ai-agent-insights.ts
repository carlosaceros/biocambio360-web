/**
 * Memory and analytics fed by every conversation the AI agent handles.
 *
 *  - customer_memory/{phone}: what we learned about a customer (name, delivery data, products,
 *    contact-time preference, last summary). It is loaded into the agent's context on later
 *    conversations so a returning customer does not repeat everything.
 *  - analytics_daily/{yyyy-mm-dd}: additive counters (conversations, intents, products, ads, PQRS,
 *    hours) for marketing / sales KPIs. Only counters, no personal data.
 *
 * Everything fails soft: analytics or memory problems must never break a conversation.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { TIMEZONE } from '@/lib/business-hours';
import { isReplyableId } from '@/lib/whatsapp-service';
import type { PreOrder } from '@/types/inbox';

export const INTENTS = ['compra', 'consulta_precio', 'consulta_producto', 'pqrs', 'otro'] as const;
export type Intent = (typeof INTENTS)[number];

export interface CustomerMemory {
    nombre?: string;
    ciudad?: string;
    direccion?: string;
    metodoPago?: string;
    productos?: string[];
    horarioContacto?: string;
    ultimoResumen?: string;
    ultimaIntencion?: string;
    conversaciones?: number;
    ultimaVez?: string;
}

const bogotaDay = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
const bogotaHour = (d: Date = new Date()) =>
    String(Number(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: '2-digit', hour12: false }).format(d)) % 24).padStart(2, '0');

/** Firestore-safe counter key. */
const slug = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 60) || 'x';

export interface AnalyticsEvent {
    /** first time the agent answers a conversation in a shift */
    newConversation?: { mode: string; adSourceId?: string; channel?: string };
    intent?: Intent;
    products?: string[];
    pqrsType?: string;
    preOrderReady?: boolean;
    horario?: string;
}

export async function recordAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
        const inc = (n = 1) => FieldValue.increment(n);
        const data: Record<string, unknown> = { agentTurns: inc(), updatedAt: FieldValue.serverTimestamp() };
        data.byHour = { [bogotaHour()]: inc() };
        if (event.newConversation) {
            data.conversations = inc();
            data.byMode = { [event.newConversation.mode]: inc() };
            data.byChannel = { [event.newConversation.channel ?? 'whatsapp']: inc() };
            if (event.newConversation.adSourceId) data.byAd = { [slug(event.newConversation.adSourceId)]: inc() };
            else data.organic = inc();
        }
        if (event.intent) data.byIntent = { [event.intent]: inc() };
        if (event.products?.length) data.byProduct = Object.fromEntries(event.products.map(p => [slug(p), inc()]));
        if (event.pqrsType) data.byPqrs = { [event.pqrsType]: inc() };
        if (event.preOrderReady) data.preOrdersReady = inc();
        if (event.horario) data.byContactWindow = { [event.horario]: inc() };
        await getAdminDB().collection('analytics_daily').doc(bogotaDay()).set(data, { merge: true });
    } catch (err) {
        console.warn('[ai-insights] analytics failed:', err instanceof Error ? err.message : err);
    }
}

/** Every brand-new conversation, whoever answers it (marketing KPIs: volume by channel, ad and hour). */
export async function recordNewInboundConversation(info: { channel: string; adSourceId?: string | null; humanOnline: boolean }): Promise<void> {
    try {
        const inc = FieldValue.increment(1);
        await getAdminDB().collection('analytics_daily').doc(bogotaDay()).set(
            {
                newConversations: inc,
                newByChannel: { [info.channel]: inc },
                newByHour: { [bogotaHour()]: inc },
                newBySchedule: { [info.humanOnline ? 'equipo' : 'agente']: inc },
                ...(info.adSourceId ? { newByAd: { [slug(info.adSourceId)]: inc } } : { newOrganic: inc }),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
    } catch (err) {
        console.warn('[ai-insights] inbound analytics failed:', err instanceof Error ? err.message : err);
    }
}

export async function loadCustomerMemory(phone: string): Promise<CustomerMemory | null> {
    try {
        if (!isReplyableId(phone)) return null;
        const snap = await getAdminDB().collection('customer_memory').doc(phone).get();
        return snap.exists ? (snap.data() as CustomerMemory) : null;
    } catch {
        return null;
    }
}

export async function saveCustomerMemory(
    phone: string,
    update: { preOrder: PreOrder | null; resumen?: string; intent?: Intent; isNewConversation: boolean }
): Promise<void> {
    try {
        if (!isReplyableId(phone)) return;
        const pre = update.preOrder;
        const data: Record<string, unknown> = { ultimaVez: new Date().toISOString() };
        if (pre?.nombreCliente) data.nombre = pre.nombreCliente;
        if (pre?.ciudad) data.ciudad = pre.ciudad;
        if (pre?.direccion) data.direccion = pre.direccion;
        if (pre?.metodoPago) data.metodoPago = pre.metodoPago;
        if (pre?.horarioContacto) data.horarioContacto = pre.horarioContacto;
        if (pre?.items?.length) data.productos = pre.items.map(i => `${i.cantidad}x ${i.producto} ${i.presentacion}`.trim()).slice(0, 8);
        if (update.resumen) data.ultimoResumen = update.resumen.slice(0, 300);
        if (update.intent) data.ultimaIntencion = update.intent;
        if (update.isNewConversation) data.conversaciones = FieldValue.increment(1);
        await getAdminDB().collection('customer_memory').doc(phone).set(data, { merge: true });
    } catch (err) {
        console.warn('[ai-insights] memory save failed:', err instanceof Error ? err.message : err);
    }
}

/** Compact block for the agent's context. The data belongs to this same chat's phone number. */
export function memoryPromptBlock(memory: CustomerMemory | null): string {
    if (!memory) return '';
    const lines = [
        memory.nombre && `nombre: ${memory.nombre}`,
        memory.ciudad && `ciudad: ${memory.ciudad}`,
        memory.direccion && `dirección anterior: ${memory.direccion}`,
        memory.metodoPago && `pago preferido: ${memory.metodoPago}`,
        memory.productos?.length && `pidió antes: ${memory.productos.join('; ')}`,
        memory.horarioContacto && `horario de contacto: ${memory.horarioContacto}`,
        memory.ultimoResumen && `última conversación: ${memory.ultimoResumen}`,
    ].filter(Boolean);
    if (lines.length === 0) return '';
    return `MEMORIA DEL CLIENTE (ya nos conoce; no le pidas de nuevo lo que ya sabes, solo confirma si sigue igual):\n${lines.join('\n')}\n`;
}
