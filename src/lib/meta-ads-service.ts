/**
 * Mide pauta paga vs. ingresos reales, con tres capas de confianza distinta (todas se muestran, nunca
 * se mezclan en un solo número):
 *
 * 1. `negocioTotal` — ingreso REAL de todo el negocio (tienda + POS + asesores) en el rango, sin
 *    importar el canal de origen. La cifra más confiable para "¿somos rentables?", pero no dice qué
 *    campaña específica lo generó.
 * 2. Atribución directa por campaña (`campanas[].revenue`) — venta REAL y verificada (marcada cerrada
 *    por el asesor, o cerrada vía Kommo) en conversaciones que llegaron por un anuncio de clic-a-
 *    WhatsApp. WhatsApp entrega `referral.source_id` (el ID del anuncio) al escribir, guardado como
 *    `adReferral.sourceId` en la conversación (ver /api/webhook/meta) y en `ad_referrals`; la venta
 *    real vive en `lastSaleValue`/`lastSaleAt` de esa conversación. Exacta pero parcial: solo cubre
 *    WhatsApp, no pedidos pagados directo en el checkout de la tienda.
 * 3. `campanas[].metaPurchaseValue` — referencia de Meta: lo que SU propio píxel/CAPI le atribuye a
 *    cada campaña (evento "Purchase" que ya dispara la página de confirmación de pedido, matcheado
 *    por Meta vía fbclid/fbc — no es algo que nosotros decodifiquemos). Da granularidad por campaña
 *    para TODA la tienda, no solo WhatsApp, pero es autoreportado por Meta: puede sobreestimar
 *    (ventanas de atribución largas, clics duplicados) o subestimar (bloqueadores de cookies).
 */

import { getAdminDB } from './firebase-admin';

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getToken(): string {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error('META_ACCESS_TOKEN no configurado');
    return token;
}

function getAdAccountId(): string {
    const id = process.env.META_AD_ACCOUNT_ID;
    if (!id) throw new Error('META_AD_ACCOUNT_ID no configurado');
    return id;
}

export interface CampaignSpend {
    campaignId: string;
    campaignName: string;
    spend: number;
    impressions: number;
    clicks: number;
    /**
     * Valor de compras que Meta atribuye a esta campaña por su propio píxel/CAPI (evento "Purchase"
     * que ya dispara la página de confirmación de pedido, matcheado por Meta vía fbclid/fbc — no algo
     * que nosotros decodifiquemos). Es una REFERENCIA, no una cifra verificada: puede sobreestimar
     * (ventanas de atribución, clics duplicados) o subestimar (bloqueadores de cookies, consentimiento
     * rechazado). Null si Meta no reportó compras para esa campaña en el rango.
     */
    metaPurchaseValue: number | null;
}

interface MetaActionValue { action_type: string; value: string }

function extractPurchaseValue(actionValues: MetaActionValue[] | undefined): number | null {
    if (!actionValues?.length) return null;
    const match = actionValues.find(a => a.action_type === 'purchase') ?? actionValues.find(a => a.action_type === 'omni_purchase');
    return match ? Number(match.value) || 0 : null;
}

/** Gasto real por campaña de Meta en el rango de fechas (formato YYYY-MM-DD), con la referencia de
 *  compras que el propio píxel de Meta le atribuye a cada una. */
export async function getCampaignSpend(since: string, until: string): Promise<CampaignSpend[]> {
    const url = new URL(`${GRAPH_API_BASE}/act_${getAdAccountId()}/insights`);
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,action_values');
    url.searchParams.set('time_range', JSON.stringify({ since, until }));
    url.searchParams.set('limit', '500');
    url.searchParams.set('access_token', getToken());

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? 'Error consultando gasto en Meta Ads');

    return (data.data ?? []).map((row: Record<string, string> & { action_values?: MetaActionValue[] }) => ({
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        metaPurchaseValue: extractPurchaseValue(row.action_values),
        spend: Number(row.spend) || 0,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
    }));
}

const cacheColl = () => getAdminDB().collection('ad_referrals');

/** A qué campaña pertenece un anuncio (por su sourceId / ad id) — cacheado en Firestore. */
async function resolveCampaignForAd(adId: string): Promise<{ campaignId: string; campaignName: string } | null> {
    const ref = cacheColl().doc(adId);
    const snap = await ref.get();
    const cached = snap.data();
    if (cached?.campaignId) {
        return { campaignId: cached.campaignId, campaignName: cached.campaignName ?? '' };
    }

    try {
        const url = new URL(`${GRAPH_API_BASE}/${adId}`);
        url.searchParams.set('fields', 'campaign{id,name}');
        url.searchParams.set('access_token', getToken());
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok || !data.campaign) return null;

        const resolved = { campaignId: data.campaign.id as string, campaignName: data.campaign.name as string };
        await ref.set({ campaignId: resolved.campaignId, campaignName: resolved.campaignName }, { merge: true });
        return resolved;
    } catch {
        return null;
    }
}

export interface CampaignPerformance {
    campaignId: string;
    campaignName: string;
    spend: number;
    revenue: number;
    ventas: number;
    roas: number | null;
    roiPct: number | null;
    /** Referencia de Meta (su propio píxel/CAPI), no verificado — ver CampaignSpend.metaPurchaseValue. */
    metaPurchaseValue: number | null;
}

export interface AdsPerformanceReport {
    since: string;
    until: string;
    campanas: CampaignPerformance[];
    totales: {
        spend: number;
        revenue: number;
        ventas: number;
        roas: number | null;
        roiPct: number | null;
    };
    sinAtribuir: {
        // Ventas de conversaciones que llegaron por anuncio pero el anuncio no se pudo resolver a campaña
        revenue: number;
        ventas: number;
    };
    /**
     * Ingreso de TODO el negocio (tienda online + POS + asesores) en el mismo rango, sin importar el
     * canal de origen. La atribución por campaña de arriba solo cuenta ventas cerradas en conversaciones
     * de WhatsApp — un pedido de la tienda pagado directo en checkout no pasa por ahí, así que el ROAS
     * "totales" de arriba casi siempre SUBESTIMA el ingreso real. Este número da el panorama honesto de
     * si el negocio en general es rentable frente a lo que se gasta en pauta, aunque no diga qué
     * campaña específica lo generó.
     */
    negocioTotal: {
        revenue: number;
        roas: number | null;
        roiPct: number | null;
        desglose: RevenueBreakdown;
    };
}

/**
 * Ingreso de TODO el negocio en el rango (tienda online + POS + asesores), sin importar si el pedido
 * pasó o no por una conversación de WhatsApp. Excluye pedidos cancelados.
 *
 * Nota: `orders.createdAt` no se guarda como Timestamp nativo de Firestore sino como mapa plano
 * {seconds, nanoseconds} (bug preexistente en `removeUndefined()` de orders-service.ts, ya detectado
 * antes en este proyecto pero no corregido) — por eso el rango se consulta contra `createdAt.seconds`
 * (un número dentro del mapa) en vez de comparar directo contra un Timestamp/Date, que nunca haría
 * match. `pos_sales.createdAt` sí es un string ISO consistente, así que ese rango se compara como texto.
 */
const CANAL_LABELS: Record<string, string> = {
    tienda_virtual: 'Tienda Virtual (checkout web)',
    call_center: 'Call Center (asesor)',
    whatsapp: 'WhatsApp (asesor)',
    pos: 'Punto de Venta (en colección orders)',
    b2b: 'B2B',
    sistema_externo: 'Sistema Externo (integración)',
};

export interface RevenueBreakdownRow {
    fuente: string;
    coleccion: 'orders' | 'pos_sales';
    pedidos: number;
    total: number;
}

export interface RevenueBreakdown {
    total: number;
    filas: RevenueBreakdownRow[];
    /** Pedidos excluidos del total por estar cancelados, para que la tabla explique cualquier diferencia. */
    canceladosExcluidos: { pedidos: number; total: number };
}

async function getTotalBusinessRevenue(since: string, until: string): Promise<RevenueBreakdown> {
    const db = getAdminDB();

    const sinceSeconds = Math.floor(new Date(`${since}T00:00:00-05:00`).getTime() / 1000);
    const untilSeconds = Math.floor(new Date(`${until}T23:59:59-05:00`).getTime() / 1000);
    // pos_sales.createdAt se guarda como string ISO en UTC (new Date().toISOString()), no como
    // Timestamp -- hay que convertir los mismos límites de Bogotá a ISO UTC para comparar como
    // string, en vez de truncar a medianoche UTC (eso contaba ventas del día anterior en Bogotá).
    const sincePosIso = new Date(sinceSeconds * 1000).toISOString();
    const untilPosIso = new Date(untilSeconds * 1000).toISOString();

    const [ordersSnap, posSnap] = await Promise.all([
        db.collection('orders').where('createdAt.seconds', '>=', sinceSeconds).where('createdAt.seconds', '<=', untilSeconds).get(),
        db.collection('pos_sales').where('createdAt', '>=', sincePosIso).where('createdAt', '<=', untilPosIso).get(),
    ]);

    const porCanal = new Map<string, { pedidos: number; total: number }>();
    let canceladosPedidos = 0;
    let canceladosTotal = 0;

    for (const doc of ordersSnap.docs) {
        const data = doc.data();
        const monto = Number(data.total) || 0;
        if (data.status === 'cancelado') {
            canceladosPedidos++;
            canceladosTotal += monto;
            continue;
        }
        const canal = String(data.canal || 'tienda_virtual');
        const prev = porCanal.get(canal) ?? { pedidos: 0, total: 0 };
        prev.pedidos += 1;
        prev.total += monto;
        porCanal.set(canal, prev);
    }

    const filas: RevenueBreakdownRow[] = [...porCanal.entries()]
        .map(([canal, v]) => ({
            fuente: CANAL_LABELS[canal] ?? `Canal: ${canal}`,
            coleccion: 'orders' as const,
            pedidos: v.pedidos,
            total: v.total,
        }))
        .sort((a, b) => b.total - a.total);

    if (posSnap.size > 0) {
        const posTotal = posSnap.docs.reduce((acc, d) => acc + (Number(d.data().total) || 0), 0);
        filas.push({
            fuente: 'Mostrador POS (colección pos_sales)',
            coleccion: 'pos_sales',
            pedidos: posSnap.size,
            total: posTotal,
        });
    }

    const total = filas.reduce((acc, f) => acc + f.total, 0);

    return {
        total,
        filas,
        canceladosExcluidos: { pedidos: canceladosPedidos, total: canceladosTotal },
    };
}

/**
 * Reporte principal: gasto real por campaña + ingreso real atribuido (venta cerrada en conversaciones
 * que llegaron por esa campaña), con ROAS y ROI calculados sobre datos reales, no estimados.
 */
export async function getAdsPerformanceReport(since: string, until: string): Promise<AdsPerformanceReport> {
    const db = getAdminDB();

    const sinceTs = new Date(`${since}T00:00:00-05:00`);
    const untilTs = new Date(`${until}T23:59:59-05:00`);

    const [spendByCampaign, negocioTotalDesglose] = await Promise.all([
        getCampaignSpend(since, until),
        getTotalBusinessRevenue(since, until),
    ]);
    const negocioTotalRevenue = negocioTotalDesglose.total;

    // Ventas reales cerradas en el rango, en conversaciones que llegaron por un anuncio
    const salesSnap = await db
        .collection('conversations')
        .where('lastSaleAt', '>=', sinceTs)
        .where('lastSaleAt', '<=', untilTs)
        .get();

    const revenueByAdId = new Map<string, { revenue: number; ventas: number }>();
    for (const doc of salesSnap.docs) {
        const data = doc.data();
        const adId = data.adReferral?.sourceId as string | undefined;
        const value = Number(data.lastSaleValue) || 0;
        if (!adId || value <= 0) continue;
        const prev = revenueByAdId.get(adId) ?? { revenue: 0, ventas: 0 };
        prev.revenue += value;
        prev.ventas += 1;
        revenueByAdId.set(adId, prev);
    }

    // Resolver cada anuncio con ventas a su campaña (en paralelo, con caché)
    const adIds = [...revenueByAdId.keys()];
    const resolved = await Promise.all(adIds.map(async (adId) => ({ adId, campaign: await resolveCampaignForAd(adId) })));

    const revenueByCampaign = new Map<string, { revenue: number; ventas: number; campaignName: string }>();
    let sinAtribuirRevenue = 0;
    let sinAtribuirVentas = 0;

    for (const { adId, campaign } of resolved) {
        const { revenue, ventas } = revenueByAdId.get(adId)!;
        if (!campaign) {
            sinAtribuirRevenue += revenue;
            sinAtribuirVentas += ventas;
            continue;
        }
        const prev = revenueByCampaign.get(campaign.campaignId) ?? { revenue: 0, ventas: 0, campaignName: campaign.campaignName };
        prev.revenue += revenue;
        prev.ventas += ventas;
        revenueByCampaign.set(campaign.campaignId, prev);
    }

    // Unir gasto + ingreso por campaña (una campaña puede tener gasto sin ventas todavía, o viceversa)
    const campaignIds = new Set([...spendByCampaign.map(c => c.campaignId), ...revenueByCampaign.keys()]);
    const campanas: CampaignPerformance[] = [...campaignIds].map((id) => {
        const spendRow = spendByCampaign.find(c => c.campaignId === id);
        const revRow = revenueByCampaign.get(id);
        const spend = spendRow?.spend ?? 0;
        const revenue = revRow?.revenue ?? 0;
        return {
            campaignId: id,
            campaignName: spendRow?.campaignName ?? revRow?.campaignName ?? id,
            spend,
            revenue,
            ventas: revRow?.ventas ?? 0,
            roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : null,
            roiPct: spend > 0 ? Number((((revenue - spend) / spend) * 100).toFixed(1)) : null,
            metaPurchaseValue: spendRow?.metaPurchaseValue ?? null,
        };
    }).sort((a, b) => b.spend - a.spend);

    const totalSpend = campanas.reduce((acc, c) => acc + c.spend, 0);
    const totalRevenue = campanas.reduce((acc, c) => acc + c.revenue, 0) + sinAtribuirRevenue;
    const totalVentas = campanas.reduce((acc, c) => acc + c.ventas, 0) + sinAtribuirVentas;

    return {
        since,
        until,
        campanas,
        totales: {
            spend: totalSpend,
            revenue: totalRevenue,
            ventas: totalVentas,
            roas: totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : null,
            roiPct: totalSpend > 0 ? Number((((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1)) : null,
        },
        sinAtribuir: { revenue: sinAtribuirRevenue, ventas: sinAtribuirVentas },
        negocioTotal: {
            revenue: negocioTotalRevenue,
            roas: totalSpend > 0 ? Number((negocioTotalRevenue / totalSpend).toFixed(2)) : null,
            roiPct: totalSpend > 0 ? Number((((negocioTotalRevenue - totalSpend) / totalSpend) * 100).toFixed(1)) : null,
            desglose: negocioTotalDesglose,
        },
    };
}
