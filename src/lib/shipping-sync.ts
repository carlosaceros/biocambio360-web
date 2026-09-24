/**
 * Applies real shipment statuses (from the 99 Envíos panel export) to orders.
 *
 * 99 Envíos' integration API has no webhook nor delivery-tracking endpoint (spec v2.0.0), so the
 * delivered state comes from the panel's "Envíos Completos" export. Only orders that are NOT yet in a
 * final state change, so customers are never re-notified about deliveries that were already recorded.
 */

import { getAdminDB } from '@/lib/firebase-admin';
import { updateOrderStatus } from '@/lib/orders-service';
import { classifyShippingEvent } from '@/lib/99envios-status';

export interface ShipmentStatusRow {
    guia: string;
    estado: string;
    transportadora?: string;
    fecha?: string;
    /** recipient phone (used to match orders whose guide was never linked) */
    telefono?: string;
}

export interface SyncChange {
    guia: string;
    orderId: string;
    from: string;
    to: 'entregado' | 'no_entregado';
    estado: string;
    /** true when the guide was matched by recipient phone and will be linked to the order */
    linkedByPhone?: boolean;
}

export interface SyncResult {
    rows: number;
    changes: SyncChange[];
    alreadyUpToDate: number;
    notFound: number;
    notFoundSample: string[];
    ignored: number;
    applied: number;
    errors: string[];
}

const FINAL_STATES = ['entregado', 'cancelado'];
// A "novedad" that is not a firm return/non-delivery is a transient incident: never change the order for it
const FIRM_FAILURE = /devuelt|devolucion|no entregad|no se entrega|returned/;

function normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const ACTIVE_STATES = ['pendiente', 'confirmado', 'preparacion', 'enviado', 'en_camino', 'no_entregado'];

function phone10(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '').slice(-10);
}

type OrderDoc = FirebaseFirestore.QueryDocumentSnapshot;

/** Looks orders up by guide number in batches of 30 (Firestore `in`), on both guide fields. */
async function findOrdersByGuides(guides: string[]): Promise<Map<string, OrderDoc>> {
    const db = getAdminDB();
    const found = new Map<string, OrderDoc>();
    for (const field of ['guiaTransportadora', 'shippingGuide']) {
        const pending = guides.filter(g => !found.has(g));
        for (let i = 0; i < pending.length; i += 30) {
            const snap = await db.collection('orders').where(field, 'in', pending.slice(i, i + 30)).get();
            snap.docs.forEach(d => {
                const g = String(d.get(field) ?? '');
                if (g && !found.has(g)) found.set(g, d);
            });
        }
    }
    return found;
}

export async function syncShipmentStatuses(
    rows: ShipmentStatusRow[],
    opts: { dryRun: boolean; source: string; actor: string }
): Promise<SyncResult> {
    const result: SyncResult = { rows: rows.length, changes: [], alreadyUpToDate: 0, notFound: 0, notFoundSample: [], ignored: 0, applied: 0, errors: [] };

    const decided = rows
        .filter(r => r.guia && r.estado)
        .map(row => ({ row, kind: classifyShippingEvent(row.estado) }));
    result.ignored = decided.filter(d => d.kind === 'informativo').length;
    const actionable = decided.filter(d => d.kind !== 'informativo');

    const byGuide = await findOrdersByGuides([...new Set(actionable.map(d => d.row.guia))]);

    // Orders still in progress whose guide was never linked: candidates to match by recipient phone
    const activeSnap = await getAdminDB().collection('orders').where('status', 'in', ACTIVE_STATES).limit(500).get();
    const activeByPhone = new Map<string, OrderDoc[]>();
    activeSnap.docs.forEach(d => {
        if (d.get('guiaTransportadora') || d.get('shippingGuide')) return;
        const p = phone10(d.get('cliente.celular'));
        if (p.length === 10) activeByPhone.set(p, [...(activeByPhone.get(p) ?? []), d]);
    });

    for (const d of actionable) {
        let doc: OrderDoc | undefined = byGuide.get(d.row.guia);
        let linkedByPhone = false;
        if (!doc && d.row.telefono) {
            const candidates = activeByPhone.get(phone10(d.row.telefono)) ?? [];
            if (candidates.length === 1) { doc = candidates[0]; linkedByPhone = true; } // only when unambiguous
        }
        if (!doc) {
            result.notFound++;
            if (result.notFoundSample.length < 10) result.notFoundSample.push(d.row.guia);
            continue;
        }

        const order = doc.data() as { status?: string; tipoEnvio?: string };
        if (order.tipoEnvio === 'flota_propia') { result.ignored++; continue; }
        const current = order.status ?? '';

        if (d.kind === 'entregado') {
            if (FINAL_STATES.includes(current)) result.alreadyUpToDate++;
            else result.changes.push({ guia: d.row.guia, orderId: doc.id, from: current, to: 'entregado', estado: d.row.estado, linkedByPhone });
        } else if (FIRM_FAILURE.test(normalize(d.row.estado))) {
            if ([...FINAL_STATES, 'no_entregado'].includes(current)) result.alreadyUpToDate++;
            else result.changes.push({ guia: d.row.guia, orderId: doc.id, from: current, to: 'no_entregado', estado: d.row.estado, linkedByPhone });
        } else {
            result.ignored++;
        }
    }

    if (opts.dryRun) return result;

    const db = getAdminDB();
    for (const change of result.changes) {
        try {
            const note =
                change.to === 'entregado'
                    ? `Entrega confirmada en el reporte de 99 Envíos (guía ${change.guia}, estado "${change.estado}"). Importado por ${opts.actor}.`
                    : `99 Envíos reporta "${change.estado}" para la guía ${change.guia}. Importado por ${opts.actor}.`;
            if (change.linkedByPhone) {
                await db.collection('orders').doc(change.orderId).set(
                    { guiaTransportadora: change.guia, tipoEnvio: '99envios', updatedAt: new Date().toISOString() },
                    { merge: true }
                );
            }
            await updateOrderStatus(change.orderId, change.to, note, {
                email: 'importacion@99envios.app',
                nombre: 'Sistema (reporte 99 Envíos)',
                role: 'sistema',
            });
            if (change.to === 'entregado') {
                await db.collection('orders').doc(change.orderId).set(
                    { timelineEntrega99: { guia: change.guia, estado: change.estado, actualizadoAt: new Date().toISOString(), origen: opts.source } },
                    { merge: true }
                );
            }
            await db.collection('envios_webhook_events').add({
                receivedAt: new Date().toISOString(),
                decision: change.to === 'entregado' ? 'entregado' : 'novedad',
                guia: change.guia,
                orderId: null,
                matchedOrderId: change.orderId,
                statusRaw: change.estado,
                eventRaw: opts.source,
                previousStatus: change.from,
                detail: `Importado por ${opts.actor}`,
                payload: '',
            });
            result.applied++;
        } catch (err) {
            result.errors.push(`${change.guia}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return result;
}
