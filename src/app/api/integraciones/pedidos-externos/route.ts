/**
 * POST /api/integraciones/pedidos-externos
 *
 * Recibe pedidos creados en el sistema externo de gestión (pedidos, inventario, materia prima y
 * contabilidad) y los ingresa al tablero de pedidos de Biocambio360 en la columna "pendiente",
 * marcados como canal='sistema_externo' para que el asesor los identifique y los valide antes de
 * continuar el flujo normal.
 *
 * Autenticación: header Authorization: Bearer <EXTERNAL_ORDERS_WEBHOOK_SECRET>
 * Idempotencia: un mismo idExterno nunca crea un segundo pedido; reintentos son seguros.
 *
 * Ver docs/Integracion_Sistema_Externo_Pedidos_Inventario.pdf para el contrato completo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { getMatchingProducts } from '@/lib/ai-agent-knowledge';
import type { Order, OrderItem } from '@/types/order';

interface ExternalOrderItem {
    nombre: string;
    presentacion?: string;
    cantidad: number;
    precioUnitario: number;
}

interface ExternalOrderPayload {
    idExterno: string;
    sistema?: string;
    fecha?: string;
    cliente: {
        nombre: string;
        cedula?: string;
        celular: string;
        email?: string;
        departamento?: string;
        ciudad: string;
        direccion: string;
        barrio?: string;
    };
    productos: ExternalOrderItem[];
    envio?: number;
    total?: number;
    metodoPago?: string;
    notas?: string;
}

function unauthorized() {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

/** Recursively removes undefined values so the Admin SDK doesn't reject the document (arrays kept as arrays). */
function removeUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => (typeof v === 'object' && v !== null ? removeUndefined(v) : v)) as T;
    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, typeof v === 'object' && v !== null ? removeUndefined(v) : v])
    ) as T;
}

export async function POST(req: NextRequest) {
    const secret = process.env.EXTERNAL_ORDERS_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[pedidos-externos] EXTERNAL_ORDERS_WEBHOOK_SECRET no está configurado: rechazando por defecto');
        return unauthorized();
    }
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return unauthorized();

    let body: ExternalOrderPayload;
    try {
        body = await req.json();
    } catch {
        return badRequest('JSON inválido');
    }

    const idExterno = String(body.idExterno || '').trim();
    if (!idExterno) return badRequest('idExterno es obligatorio');
    if (!body.cliente?.nombre || !body.cliente?.celular || !body.cliente?.direccion || !body.cliente?.ciudad) {
        return badRequest('cliente.nombre, cliente.celular, cliente.direccion y cliente.ciudad son obligatorios');
    }
    if (!Array.isArray(body.productos) || body.productos.length === 0) {
        return badRequest('productos debe traer al menos un artículo');
    }
    if (body.productos.length > 50) return badRequest('productos excede el máximo de 50 artículos por pedido');

    const db = getAdminDB();
    const sistema = String(body.sistema || 'sistema_externo').slice(0, 80);

    // Idempotencia: un idExterno ya ingresado nunca crea un segundo pedido
    const existing = await db.collection('orders').where('externo.idExterno', '==', idExterno).limit(1).get();
    if (!existing.empty) {
        return NextResponse.json({ ok: true, orderId: existing.docs[0].id, yaExistia: true });
    }

    // Cada línea se intenta emparejar contra nuestro catálogo (por nombre); si no hay una
    // coincidencia clara, se conserva la línea con los datos que envió el sistema externo y se
    // marca para que el asesor la revise manualmente, en vez de perder o inventar el producto.
    const productosNoIdentificados: string[] = [];
    const productos: OrderItem[] = await Promise.all(
        body.productos.slice(0, 50).map(async (item): Promise<OrderItem> => {
            const nombre = String(item.nombre || '').slice(0, 200);
            const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
            const price = Math.max(0, Number(item.precioUnitario) || 0);
            const matches = nombre ? await getMatchingProducts([nombre], 2) : [];
            if (matches.length === 1) {
                const p = matches[0];
                return {
                    product: { id: p.id, nombre: p.nombre, imgFile: p.imgFile || 'placeholder.png' },
                    size: String(item.presentacion || 'DEFAULT'),
                    cantidad,
                    price,
                };
            }
            productosNoIdentificados.push(nombre);
            return {
                product: { id: 'externo-no-identificado', nombre: nombre || 'Producto sin identificar', imgFile: 'placeholder.png' },
                size: String(item.presentacion || ''),
                cantidad,
                price,
            };
        })
    );

    const subtotal = productos.reduce((sum, p) => sum + p.price * p.cantidad, 0);
    const envio = Math.max(0, Number(body.envio) || 0);
    const total = body.total !== undefined ? Math.max(0, Number(body.total) || 0) : subtotal + envio;
    const now = new Date().toISOString();

    // removeUndefined only touches plain data (never the FieldValue sentinels below, which must
    // keep their special class identity or Firestore will reject/misinterpret them).
    const cliente = removeUndefined({
        nombre: String(body.cliente.nombre).slice(0, 160),
        cedula: String(body.cliente.cedula || 'No registrada').slice(0, 30),
        celular: String(body.cliente.celular).slice(0, 30),
        email: body.cliente.email ? String(body.cliente.email).slice(0, 160) : undefined,
        departamento: String(body.cliente.departamento || '').slice(0, 80),
        ciudad: String(body.cliente.ciudad).slice(0, 80),
        direccion: String(body.cliente.direccion).slice(0, 240),
        barrio: body.cliente.barrio ? String(body.cliente.barrio).slice(0, 80) : undefined,
    });
    const externo = removeUndefined({
        sistema,
        idExterno,
        productosNoIdentificados: productosNoIdentificados.length > 0 ? productosNoIdentificados : undefined,
        recibidoAt: now,
    });

    const order: Omit<Order, 'id'> = {
        cliente,
        productos,
        subtotal,
        envio,
        total,
        metodoPago: String(body.metodoPago || 'contraentrega').slice(0, 40),
        status: 'pendiente',
        timeline: [
            {
                status: 'pendiente',
                timestamp: Timestamp.now(),
                note: `Pedido recibido desde ${sistema}${productosNoIdentificados.length > 0 ? ' — tiene productos sin identificar, revisar antes de confirmar' : ''}`,
            } as never,
        ],
        ...(body.notas ? { notas: [String(body.notas).slice(0, 500)] } : {}),
        canal: 'sistema_externo',
        createdAt: FieldValue.serverTimestamp() as never,
        updatedAt: FieldValue.serverTimestamp() as never,
        externo,
    };

    const ref = await db.collection('orders').add(order);
    console.log(`[pedidos-externos] Pedido ${ref.id} creado desde ${sistema} (idExterno=${idExterno})`);
    return NextResponse.json({ ok: true, orderId: ref.id, productosNoIdentificados }, { status: 201 });
}
