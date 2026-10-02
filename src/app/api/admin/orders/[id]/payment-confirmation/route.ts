/**
 * POST /api/admin/orders/[id]/payment-confirmation
 * Marca (o revierte) que el pago contraentrega de un pedido ya fue confirmado por un asesor --
 * ej. verificó un comprobante de transferencia en el chat antes de que llegue el mensajero.
 *
 * Existe como ruta de servidor (Admin SDK) a propósito, y NO como escritura directa del cliente:
 * firestore.rules ahora bloquea cualquier escritura a pagoConfirmado/pagoConfirmadoAt/
 * pagoConfirmadoPor desde el SDK de cliente (ver comentario en firestore.rules, colección
 * `orders`), porque antes CUALQUIER sesión autenticada -- incluida la de un mensajero -- podía
 * escribir esos campos directamente (la regla de orders solo exigía `request.auth != null`, sin
 * distinguir rol). Aquí el rol sí se valida antes de escribir.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Roles autorizados a confirmar un pago manualmente -- excluye explícitamente 'mensajero' (a quien
// esta confirmación le informa, no se la otorga) y 'produccion_calidad' (sin relación con pagos).
// Incluye los alias legacy de 'gestor' (ver toSystemRole en types/user.ts) porque admin_users
// puede tener guardado cualquiera de esos valores crudos.
const ALLOWED_ROLES = ['superadmin', 'director', 'asesor', 'cajero', 'gestor', 'gestor_pedidos', 'logistico', 'logistica'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireRole(req, ALLOWED_ROLES);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const confirmed = !!body?.confirmed;

    const db = getAdminDB();
    const orderRef = db.collection('orders').doc(id);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    await orderRef.update({
        pagoConfirmado: confirmed,
        pagoConfirmadoAt: confirmed ? nowIso : FieldValue.delete(),
        pagoConfirmadoPor: confirmed ? auth.email : FieldValue.delete(),
        updatedAt: Timestamp.now(),
    });

    const noteText = confirmed
        ? 'Pago confirmado manualmente por el asesor (ej. comprobante de transferencia verificado en el chat).'
        : 'Se revirtió la confirmación manual de pago.';
    const note = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: noteText,
        authorEmail: auth.email,
        authorName: auth.email,
        authorRole: auth.role,
        createdAt: nowIso,
        stageAtCreation: orderSnap.data()?.status || 'pendiente',
        isStatusChangeNote: false,
    };
    await orderRef.update({ notasInternas: FieldValue.arrayUnion(note) });

    return NextResponse.json({ success: true, pagoConfirmado: confirmed, pagoConfirmadoAt: confirmed ? nowIso : null, pagoConfirmadoPor: confirmed ? auth.email : null });
}
