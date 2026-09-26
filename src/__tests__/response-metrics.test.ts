import { describe, it, expect } from 'vitest';
import { businessMinutesBetween } from '@/lib/business-hours';
import { computeMetrics, median, percentile, type MsgLite } from '@/lib/response-metrics';

const bog = (iso: string) => new Date(`${iso}-05:00`).getTime();

describe('business minutes', () => {
    it('counts only the scheduled hours of the team', () => {
        expect(businessMinutesBetween(bog('2026-09-21T10:00:00'), bog('2026-09-21T10:30:00'))).toBe(30); // Mon
        // Mon 20:30 → Tue 06:30: 30 min before closing (21:00) + 30 min after opening (06:00)
        expect(businessMinutesBetween(bog('2026-09-21T20:30:00'), bog('2026-09-22T06:30:00'))).toBe(60);
        // Fully outside hours
        expect(businessMinutesBetween(bog('2026-09-22T22:00:00'), bog('2026-09-23T05:00:00'))).toBe(0);
        expect(businessMinutesBetween(bog('2026-09-21T10:00:00'), bog('2026-09-21T09:00:00'))).toBe(0);
    });
});

describe('response metrics', () => {
    const inbound = (t: string): MsgLite => ({ direction: 'inbound', ts: bog(t) });
    const human = (t: string, name = 'Laura'): MsgLite => ({ direction: 'outbound', ts: bog(t), agentUid: 'u1', agentName: name });
    const ai = (t: string): MsgLite => ({ direction: 'outbound', ts: bog(t), agentUid: 'ai-agent', agentName: 'Asistente IA' });

    it('measures the first human answer and ignores the AI agent', () => {
        const m = computeMetrics([inbound('2026-09-21T22:00:00'), ai('2026-09-21T22:00:05'), inbound('2026-09-22T06:10:00'), human('2026-09-22T06:40:00')]);
        expect(m.lead).toBe(true);
        expect(m.firstResponder).toBe('Laura');
        expect(m.firstResponseBizMin).toBe(40); // 06:00 → 06:40 (the night does not count)
        expect(m.firstResponseWallMin).toBeGreaterThan(500);
    });
    it('records the following answers per advisor', () => {
        const m = computeMetrics([inbound('2026-09-21T10:00:00'), human('2026-09-21T10:05:00'), inbound('2026-09-21T10:20:00'), human('2026-09-21T10:50:00', 'Camilo')]);
        expect(m.firstResponseBizMin).toBe(5);
        expect(m.pairs).toEqual([[30, 30, 'Camilo']]);
    });
    it('a conversation started by our template is not a lead', () => {
        expect(computeMetrics([{ direction: 'outbound', ts: bog('2026-09-21T10:00:00'), agentUid: 'cart-automation' }, inbound('2026-09-21T11:00:00')]).lead).toBe(false);
    });
    it('median and percentile', () => {
        expect(median([1, 5, 9])).toBe(5);
        expect(median([1, 3])).toBe(2);
        expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(10);
        expect(median([])).toBeNull();
    });
});
