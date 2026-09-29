/**
 * Mide pauta paga vs. ingresos reales: cruza el gasto en anuncios de Meta Marketing API con la venta
 * real registrada en la plataforma (no con el "valor de compra" que reporta el píxel de Meta, que
 * suele sobreestimar) — así el ROAS/ROI que se muestra es el que de verdad entró a caja.
 *
 * Atribución: cuando un lead escribe por un anuncio de clic-a-WhatsApp, WhatsApp entrega
 * `referral.source_id` (el ID del anuncio) — eso ya se guarda como `adReferral.sourceId` en cada
 * conversación (ver /api/webhook/meta) y también en el registro `ad_referrals`. La venta real de esa
 * conversación (si el asesor la marcó cerrada, o llegó por Kommo) vive en `lastSaleValue`/`lastSaleAt`
 * de esa misma conversación. Este servicio: 1) suma esa venta real por anuncio, 2) resuelve a qué
 * campaña pertenece cada anuncio (con caché en Firestore para no golpear la API de Meta cada vez),
 * 3) la cruza contra el gasto real de esa campaña en el mismo rango de fechas.
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
}

/** Gasto real por campaña de Meta en el rango de fechas (formato YYYY-MM-DD). */
export async function getCampaignSpend(since: string, until: string): Promise<CampaignSpend[]> {
    const url = new URL(`${GRAPH_API_BASE}/act_${getAdAccountId()}/insights`);
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks');
    url.searchParams.set('time_range', JSON.stringify({ since, until }));
    url.searchParams.set('limit', '500');
    url.searchParams.set('access_token', getToken());

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? 'Error consultando gasto en Meta Ads');

    return (data.data ?? []).map((row: Record<string, string>) => ({
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
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
}

/**
 * Reporte principal: gasto real por campaña + ingreso real atribuido (venta cerrada en conversaciones
 * que llegaron por esa campaña), con ROAS y ROI calculados sobre datos reales, no estimados.
 */
export async function getAdsPerformanceReport(since: string, until: string): Promise<AdsPerformanceReport> {
    const db = getAdminDB();

    const [spendByCampaign, sinceTs, untilTs] = await Promise.all([
        getCampaignSpend(since, until),
        Promise.resolve(new Date(`${since}T00:00:00-05:00`)),
        Promise.resolve(new Date(`${until}T23:59:59-05:00`)),
    ]);

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
    };
}
