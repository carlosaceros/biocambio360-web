/**
 * GET /api/ai-kpis?days=30 — marketing / sales KPIs of the inbox and the AI agent.
 * Sources: analytics_daily (counters written by the webhook and the agent), conversations (funnel,
 * sales, advisors), pqrs, ad_referrals (ad names) and ai_usage (model cost).
 * Directors and super admins only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/ai-training-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { computeMetrics, median, percentile, average, type ConvMetrics } from '@/lib/response-metrics';

type Counter = Record<string, number>;

const bogotaDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const merge = (target: Counter, source: unknown) => {
    if (!source || typeof source !== 'object') return;
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) target[k] = (target[k] ?? 0) + num(v);
};
const toMs = (v: unknown): number => {
    const t = v as { toMillis?: () => number } | string | undefined;
    if (t && typeof t === 'object' && typeof t.toMillis === 'function') return t.toMillis();
    const parsed = Date.parse(String(t ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

export async function GET(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days') ?? 30) || 30, 1), 180);
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const sinceDay = bogotaDay(since);
    const db = getAdminDB();

    const [dailySnap, usageSnap, convSnap, pqrsSnap, adsSnap, cartSnap, cartConvSnap] = await Promise.all([
        db.collection('analytics_daily').where('__name__', '>=', sinceDay).get(),
        db.collection('ai_usage').where('__name__', '>=', sinceDay).get(),
        db.collection('conversations').where('createdAt', '>=', since).limit(4000).get(),
        db.collection('pqrs').where('createdAt', '>=', since).limit(1000).get(),
        db.collection('ad_referrals').limit(500).get(),
        db.collection('abandoned_carts').where('createdAt', '>=', since).limit(3000).get(),
        db.collection('conversations').where('tags', 'array-contains', 'carrito-abandonado').limit(1500).get(),
    ]);

    // ── Daily counters ───────────────────────────────────────────────────────
    const daily: Array<{ date: string; newConversations: number; agentConversations: number; preOrdersReady: number }> = [];
    const t = {
        newConversations: 0,
        agentTurns: 0,
        conversationsAgent: 0,
        preOrdersReady: 0,
        organic: 0,
    };
    const byChannel: Counter = {};
    const byHour: Counter = {};
    const bySchedule: Counter = {};
    const byIntent: Counter = {};
    const byProduct: Counter = {};
    const byPqrs: Counter = {};
    const byContactWindow: Counter = {};
    const byMode: Counter = {};

    for (const d of dailySnap.docs) {
        const x = d.data();
        t.newConversations += num(x.newConversations);
        t.agentTurns += num(x.agentTurns);
        t.conversationsAgent += num(x.conversations);
        t.preOrdersReady += num(x.preOrdersReady);
        t.organic += num(x.newOrganic);
        merge(byChannel, x.newByChannel);
        merge(byHour, x.newByHour);
        merge(bySchedule, x.newBySchedule);
        merge(byIntent, x.byIntent);
        merge(byProduct, x.byProduct);
        merge(byPqrs, x.byPqrs);
        merge(byContactWindow, x.byContactWindow);
        merge(byMode, x.byMode);
        daily.push({ date: d.id, newConversations: num(x.newConversations), agentConversations: num(x.conversations), preOrdersReady: num(x.preOrdersReady) });
    }
    daily.sort((a, b) => a.date.localeCompare(b.date));

    // ── Ad names ─────────────────────────────────────────────────────────────
    const adInfo = new Map<string, { headline: string; product: string }>();
    for (const d of adsSnap.docs) {
        const x = d.data();
        adInfo.set(d.id, { headline: String(x.headline ?? ''), product: String(x.productName ?? '') });
    }

    // ── Conversations: funnel, sales, ads, advisors ─────────────────────────
    const funnel = { conversations: 0, withPreOrder: 0, preOrderReady: 0, preOrderConfirmed: 0, closedSales: 0, revenue: 0 };
    const ads = new Map<string, { id: string; headline: string; conversations: number; preOrders: number; sales: number; revenue: number }>();
    const advisors = new Map<string, { name: string; assigned: number; sales: number; revenue: number }>();
    const status: Counter = {};
    const channelFunnel: Counter = {};

    for (const d of convSnap.docs) {
        const c = d.data();
        funnel.conversations++;
        status[String(c.status ?? 'abierto')] = (status[String(c.status ?? 'abierto')] ?? 0) + 1;
        channelFunnel[String(c.channel ?? 'whatsapp')] = (channelFunnel[String(c.channel ?? 'whatsapp')] ?? 0) + 1;

        const items = Array.isArray(c.preOrder?.items) ? c.preOrder.items.length : 0;
        const hasPre = items > 0;
        if (hasPre) funnel.withPreOrder++;
        if (hasPre && (c.preOrder?.estado === 'listo' || c.preOrder?.estado === 'confirmado')) funnel.preOrderReady++;
        if (hasPre && c.preOrder?.estado === 'confirmado') funnel.preOrderConfirmed++;

        const sold = toMs(c.lastSaleAt) > 0;
        const value = num(c.lastSaleValue);
        if (sold) {
            funnel.closedSales++;
            funnel.revenue += value;
        }

        const adId = c.adReferral?.sourceId ? String(c.adReferral.sourceId) : c.adReferral?.headline ? `h_${String(c.adReferral.headline).slice(0, 40)}` : '';
        if (adId) {
            const row = ads.get(adId) ?? { id: adId, headline: adInfo.get(adId)?.headline || String(c.adReferral?.headline ?? adId), conversations: 0, preOrders: 0, sales: 0, revenue: 0 };
            row.conversations++;
            if (hasPre) row.preOrders++;
            if (sold) {
                row.sales++;
                row.revenue += value;
            }
            ads.set(adId, row);
        }

        if (c.assignedToName) {
            const name = String(c.assignedToName);
            const row = advisors.get(name) ?? { name, assigned: 0, sales: 0, revenue: 0 };
            row.assigned++;
            if (sold) {
                row.sales++;
                row.revenue += value;
            }
            advisors.set(name, row);
        }
    }

    // ── Advisor management times ──────────────────────────────────────────────
    // Metrics live on each conversation (`metrics`, `metricsAt`); the stale or missing ones are computed
    // now (max 100 per request, the rest on the next load) and stored so later loads are cheap.
    const metricsOf = new Map<string, ConvMetrics>();
    const stale: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (const d of convSnap.docs) {
        const c = d.data();
        if (c.metrics && (Date.parse(String(c.metricsAt ?? '')) || 0) >= toMs(c.lastMessageAt)) metricsOf.set(d.id, c.metrics as ConvMetrics);
        else stale.push(d);
    }
    for (let i = 0; i < Math.min(stale.length, 100); i += 10) {
        await Promise.all(
            stale.slice(i, i + 10).map(async d => {
                const ms = await d.ref.collection('messages').select('direction', 'type', 'timestamp', 'agentUid', 'agentName', 'metaMessageId').get();
                const metrics = computeMetrics(
                    ms.docs.map(m => {
                        const x = m.data();
                        return { direction: x.direction, ts: toMs(x.timestamp), agentUid: x.agentUid, agentName: x.agentName, metaMessageId: x.metaMessageId, type: x.type };
                    })
                );
                metricsOf.set(d.id, metrics);
                await d.ref.update({ metrics, metricsAt: new Date().toISOString() }).catch(() => undefined);
            })
        );
    }
    const sla = (() => {
        const leadsAll = convSnap.docs.filter(d => metricsOf.get(d.id)?.lead);
        const answered = leadsAll.filter(d => metricsOf.get(d.id)?.firstResponseBizMin !== undefined);
        const firstBiz = answered.map(d => metricsOf.get(d.id)?.firstResponseBizMin as number);
        const firstWall = answered.map(d => metricsOf.get(d.id)?.firstResponseWallMin as number).filter(v => v !== undefined);
        const bucketOf = (m: number) => (m < 5 ? 'lt5' : m < 15 ? 'm5_15' : m < 60 ? 'm15_60' : m < 240 ? 'h1_4' : 'gt4h');
        const buckets: Counter = {};
        firstBiz.forEach(m => (buckets[bucketOf(m)] = (buckets[bucketOf(m)] ?? 0) + 1));

        type Adv = { name: string; first: number[]; pairs: number[]; sales: number; closeHours: number[] };
        const byAdvisor = new Map<string, Adv>();
        const adv = (name: string) => byAdvisor.get(name) ?? (byAdvisor.set(name, { name, first: [], pairs: [], sales: 0, closeHours: [] }), byAdvisor.get(name) as Adv);
        const allPairs: number[] = [];
        for (const d of convSnap.docs) {
            const m = metricsOf.get(d.id);
            if (!m) continue;
            if (m.firstResponder && m.lead && m.firstResponseBizMin !== undefined) adv(m.firstResponder).first.push(m.firstResponseBizMin);
            for (const [biz, , by] of m.pairs) {
                allPairs.push(biz);
                adv(by).pairs.push(biz);
            }
        }
        const closeFromContact: number[] = [];
        const closeFromReply: number[] = [];
        for (const d of convSnap.docs) {
            const c = d.data();
            const m = metricsOf.get(d.id);
            const sold = toMs(c.lastSaleAt);
            if (!sold || !m) continue;
            const owner = String(c.assignedToName || m.firstResponder || 'Sin asesor');
            adv(owner).sales++;
            if (m.firstInboundAt && sold > m.firstInboundAt) {
                const h = (sold - m.firstInboundAt) / 3600000;
                closeFromContact.push(h);
                adv(owner).closeHours.push(h);
            }
            if (m.firstHumanReplyAt && sold > m.firstHumanReplyAt) closeFromReply.push((sold - m.firstHumanReplyAt) / 3600000);
        }
        return {
            leads: leadsAll.length,
            answered: answered.length,
            unanswered: leadsAll.length - answered.length,
            pending: stale.length > 100 ? stale.length - 100 : 0,
            firstResponse: {
                medianBizMin: median(firstBiz),
                avgBizMin: average(firstBiz),
                p90BizMin: percentile(firstBiz, 90),
                medianWallMin: median(firstWall),
                pctWithin15: firstBiz.length ? firstBiz.filter(v => v <= 15).length / firstBiz.length : null,
                pctWithin60: firstBiz.length ? firstBiz.filter(v => v <= 60).length / firstBiz.length : null,
            },
            buckets,
            betweenMessages: { count: allPairs.length, medianBizMin: median(allPairs), avgBizMin: average(allPairs), p90BizMin: percentile(allPairs, 90) },
            close: {
                sales: closeFromContact.length,
                medianHoursFromContact: median(closeFromContact),
                avgHoursFromContact: average(closeFromContact),
                medianHoursFromFirstReply: median(closeFromReply),
            },
            byAdvisor: [...byAdvisor.values()]
                .map(a => ({
                    name: a.name,
                    firstResponses: a.first.length,
                    medianFirstBizMin: median(a.first),
                    replies: a.pairs.length + a.first.length,
                    medianBetweenBizMin: median(a.pairs),
                    sales: a.sales,
                    medianCloseHours: median(a.closeHours),
                }))
                .filter(a => a.replies > 0 || a.sales > 0)
                .sort((a, b) => b.replies - a.replies),
        };
    })();

    // ── Abandoned carts ──────────────────────────────────────────────────────
    const cartConvByToken = new Map<string, FirebaseFirestore.DocumentData>();
    cartConvSnap.docs.forEach(d => {
        const x = d.data();
        if (x.cartToken) cartConvByToken.set(String(x.cartToken), x);
    });
    const carts = {
        total: 0,
        recovered: 0,
        abandoned: 0,
        recoveredValue: 0,
        lostValue: 0,
        withEmail: 0,
        withPhone: 0,
        recoveredAfterClick: 0,
        recoveredOnTheirOwn: 0,
        steps: [1, 2, 3].map(step => ({ step, emailSent: 0, emailOpened: 0, emailClicked: 0, waSent: 0, waReplied: 0, recovered: 0 })),
        waConversations: cartConvSnap.size,
    };
    for (const d of cartSnap.docs) {
        const c = d.data();
        // Replenishment reminders reuse the cart mechanism but are not abandoned carts
        if (c.status === 'reminder') continue;
        carts.total++;
        const value = num(c.total);
        const recovered = c.status === 'recovered';
        if (recovered) {
            carts.recovered++;
            carts.recoveredValue += value;
            if (toMs(c.clickedAt) > 0) carts.recoveredAfterClick++;
            else carts.recoveredOnTheirOwn++;
        } else if (c.status === 'abandoned') {
            carts.abandoned++;
            carts.lostValue += value;
        }
        if (c.customerEmail) carts.withEmail++;
        if (c.customerPhone) carts.withPhone++;

        const sent = (c.sent ?? {}) as Record<string, { ok?: boolean; at?: string }>;
        const legacy = !c.sent && c.customerEmail; // carts processed before the step log existed
        for (const s of carts.steps) {
            const email = sent[`email_${s.step}`];
            if ((email && email.ok) || (legacy && num(c.notificationCount) >= s.step)) s.emailSent++;
            const wa = sent[`wa_${s.step}`];
            if (wa?.ok) {
                s.waSent++;
                const conv = cartConvByToken.get(String(c.cartToken ?? d.id));
                if (conv && toMs(conv.lastInboundAt) > (Date.parse(wa.at ?? '') || 0)) s.waReplied++;
            }
            if (recovered && num(c.lastContactClicked) === s.step) s.recovered++;
        }
        const openedStep = num(c.lastContactOpened);
        const clickedStep = num(c.lastContactClicked);
        if (openedStep >= 1 && openedStep <= 3) carts.steps[openedStep - 1].emailOpened++;
        if (clickedStep >= 1 && clickedStep <= 3) carts.steps[clickedStep - 1].emailClicked++;
    }

    // ── PQRS ─────────────────────────────────────────────────────────────────
    const pqrsState: Counter = {};
    for (const d of pqrsSnap.docs) {
        const s = String(d.data().estado ?? 'nuevo');
        pqrsState[s] = (pqrsState[s] ?? 0) + 1;
    }

    // ── Model usage / cost (Gemini 2.5 Flash list prices, USD per 1M tokens) ─
    const usage = { llmCalls: 0, responseCacheHits: 0, promptTokens: 0, cachedTokens: 0, outputTokens: 0 };
    for (const d of usageSnap.docs) {
        const x = d.data();
        usage.llmCalls += num(x.llmCalls);
        usage.responseCacheHits += num(x.responseCacheHits);
        usage.promptTokens += num(x.promptTokens);
        usage.cachedTokens += num(x.cachedTokens);
        usage.outputTokens += num(x.outputTokens);
    }
    const freshInput = Math.max(0, usage.promptTokens - usage.cachedTokens);
    const estimatedCostUsd = (freshInput * 0.3 + usage.cachedTokens * 0.03 + usage.outputTokens * 2.5) / 1_000_000;
    const withoutCacheUsd = (usage.promptTokens * 0.3 + usage.outputTokens * 2.5) / 1_000_000;

    return NextResponse.json({
        days,
        since: sinceDay,
        totals: { ...t, ...funnel },
        daily,
        byChannel,
        byHour,
        bySchedule,
        byIntent,
        byProduct,
        byPqrs,
        pqrsState,
        byContactWindow,
        byMode,
        status,
        channelFunnel,
        ads: [...ads.values()].sort((a, b) => b.conversations - a.conversations).slice(0, 25),
        advisors: [...advisors.values()].sort((a, b) => b.revenue - a.revenue || b.assigned - a.assigned),
        sla,
        carts,
        usage: { ...usage, estimatedCostUsd, savedByCacheUsd: Math.max(0, withoutCacheUsd - estimatedCostUsd) },
        truncated: convSnap.size >= 4000,
    });
}
