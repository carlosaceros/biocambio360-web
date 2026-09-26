/**
 * Advisor management times computed from a conversation's messages:
 *  - first human response to a lead (wall clock and business-hours minutes),
 *  - every later customer → advisor response ("pairs"),
 *  - the advisor who answered.
 * Replies of the AI agent and of automations do NOT count as human responses.
 */

import { businessMinutesBetween } from '@/lib/business-hours';

export interface MsgLite {
    direction: 'inbound' | 'outbound';
    ts: number;
    agentUid?: string;
    agentName?: string;
    metaMessageId?: string;
    type?: string;
}

export interface ConvMetrics {
    /** the conversation started with a customer message (a lead), not with our template */
    lead: boolean;
    firstInboundAt?: number;
    firstHumanReplyAt?: number;
    firstResponseWallMin?: number;
    firstResponseBizMin?: number;
    firstResponder?: string;
    /** later answers: [business minutes, wall minutes, advisor] (max 40) */
    pairs: Array<[number, number, string]>;
    messages: number;
}

const AUTOMATION_UIDS = new Set(['ai-agent', 'cart-automation', 'delivery-alerts', 'system-optout']);

export function isHumanReply(m: MsgLite): boolean {
    if (m.direction !== 'outbound') return false;
    if (m.agentUid && AUTOMATION_UIDS.has(m.agentUid)) return false;
    if (String(m.metaMessageId ?? '').startsWith('internal_')) return false; // "sale registered" system notes
    if (m.type === 'reaction') return false;
    return true;
}

export function computeMetrics(messages: MsgLite[]): ConvMetrics {
    const msgs = [...messages].filter(m => m.ts > 0).sort((a, b) => a.ts - b.ts);
    const metrics: ConvMetrics = { lead: msgs[0]?.direction === 'inbound', pairs: [], messages: msgs.length };
    let awaiting: number | null = null;

    for (const m of msgs) {
        if (m.direction === 'inbound') {
            if (metrics.firstInboundAt === undefined) metrics.firstInboundAt = m.ts;
            if (awaiting === null) awaiting = m.ts;
            continue;
        }
        if (!isHumanReply(m)) continue;
        const by = m.agentName || 'Asesor';
        if (awaiting !== null) {
            const wall = (m.ts - awaiting) / 60000;
            const biz = businessMinutesBetween(awaiting, m.ts);
            if (metrics.firstHumanReplyAt === undefined) {
                metrics.firstHumanReplyAt = m.ts;
                metrics.firstResponseWallMin = Math.round(wall * 10) / 10;
                metrics.firstResponseBizMin = Math.round(biz * 10) / 10;
                metrics.firstResponder = by;
            } else if (metrics.pairs.length < 40) {
                metrics.pairs.push([Math.round(biz * 10) / 10, Math.round(wall * 10) / 10, by]);
            }
            awaiting = null;
        } else if (metrics.firstHumanReplyAt === undefined) {
            metrics.firstHumanReplyAt = m.ts; // proactive first contact by an advisor
            metrics.firstResponder = by;
        }
    }
    return metrics;
}

// ─── Aggregation helpers (KPI API) ───────────────────────────────────────────

export const median = (values: number[]) => {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
export const percentile = (values: number[], p: number) => {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
export const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
