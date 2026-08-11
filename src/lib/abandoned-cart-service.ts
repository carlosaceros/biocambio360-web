import { db } from './firebase';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    updateDoc, 
    serverTimestamp 
} from 'firebase/firestore';
import { sendEmail } from './email-service';

export interface AbandonedCartItem {
    id: string;
    nombre: string;
    size: string;
    cantidad: number;
    price: number;
    imgFile?: string;
}

export interface AbandonedCartRecord {
    cartToken: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    ciudad?: string;
    direccion?: string;
    items: AbandonedCartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
    status: 'abandoned' | 'recovered' | 'expired';
    notificationCount: number; // 0, 1, 2, 3
    createdAt: any;
    updatedAt: any;
    lastNotifiedAt?: any;
}

const COLLECTION_NAME = 'abandoned_carts';

// Helper to format COP currency
function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Save or update an abandoned cart session
 */
export async function saveAbandonedCartSession(data: {
    cartToken: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    ciudad?: string;
    direccion?: string;
    items: AbandonedCartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
}): Promise<void> {
    if (!data.cartToken || !data.customerEmail || data.items.length === 0) return;

    const cartRef = doc(db, COLLECTION_NAME, data.cartToken);
    const existingSnap = await getDoc(cartRef);

    if (existingSnap.exists()) {
        const existing = existingSnap.data() as AbandonedCartRecord;
        // Don't overwrite if already recovered
        if (existing.status === 'recovered') return;

        await updateDoc(cartRef, {
            customerEmail: data.customerEmail,
            customerName: data.customerName || existing.customerName || '',
            customerPhone: data.customerPhone || existing.customerPhone || '',
            ciudad: data.ciudad || existing.ciudad || '',
            direccion: data.direccion || existing.direccion || '',
            items: data.items,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            total: data.total,
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(cartRef, {
            cartToken: data.cartToken,
            customerEmail: data.customerEmail,
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            ciudad: data.ciudad || '',
            direccion: data.direccion || '',
            items: data.items,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            total: data.total,
            status: 'abandoned',
            notificationCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}

/**
 * Retrieve cart details by session recovery token
 */
export async function getAbandonedCartByToken(cartToken: string): Promise<AbandonedCartRecord | null> {
    if (!cartToken) return null;
    const cartRef = doc(db, COLLECTION_NAME, cartToken);
    const snap = await getDoc(cartRef);

    if (!snap.exists()) return null;
    return snap.data() as AbandonedCartRecord;
}

/**
 * Mark an abandoned cart as successfully recovered after checkout
 */
export async function markCartAsRecovered(cartToken: string): Promise<void> {
    if (!cartToken) return;
    const cartRef = doc(db, COLLECTION_NAME, cartToken);
    try {
        await updateDoc(cartRef, {
            status: 'recovered',
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn('[AbandonedCart] Error marking cart recovered:', err);
    }
}

/**
 * Send Contact 1 (1 hour after abandonment): Asistencia y Soporte
 */
export async function sendContact1Email(cart: AbandonedCartRecord): Promise<void> {
    const recoveryUrl = `https://biocambio360.com/checkout?recovery_token=${cart.cartToken}`;
    const customerName = cart.customerName || 'Cliente';

    const itemsHtml = cart.items.map(item => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">
            <strong>${item.nombre}</strong> (${item.size}) × ${item.cantidad}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:700;">
            ${formatCOP(item.price * item.cantidad)}
          </td>
        </tr>
    `).join('');

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">¿Tuviste alguna duda con tu pedido en Biocambio360? 🛒</h1>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.5;">
          Hola <strong>${customerName}</strong>, notamos que iniciaste el proceso de compra de tus productos de fábrica pero no alcanzaste a finalizarlo.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:13px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Tus Productos Reservados</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr>
              <td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#111827;">Total Estimado</td>
              <td align="right" style="padding:12px 0 0;font-size:18px;font-weight:900;color:#2563eb;">${formatCOP(cart.total)}</td>
            </tr>
          </table>
        </div>

        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Si tuviste problemas con la tarjeta, la cobertura de envío o deseas pagar contraentrega en efectivo, estamos disponibles para asistirte por WhatsApp.
        </p>

        <div style="text-align:center;margin-bottom:16px;">
          <a href="${recoveryUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(37,99,235,0.3);">
            Reanudar mi Compra con 1 Clic 🚀
          </a>
        </div>
    `;

    const sendEmailFn = require('./email-service').sendEmail || sendEmail;
    await sendEmailFn({
        sender: { name: 'Biocambio360', email: 'tiendavirtual@biocambio360.com' },
        to: [{ email: cart.customerEmail, name: customerName }],
        subject: `🛒 ¿Tuviste alguna duda con tu pedido? Tu carrito sigue guardado`,
        htmlContent: baseTemplate(content),
    });
}

/**
 * Send Contact 2 (24 hours after abandonment): Valor + Prioridad de Despacho
 */
export async function sendContact2Email(cart: AbandonedCartRecord): Promise<void> {
    const recoveryUrl = `https://biocambio360.com/checkout?recovery_token=${cart.cartToken}`;
    const customerName = cart.customerName || 'Cliente';

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">🔥 Tu carrito de productos de fábrica tiene un beneficio esperándote</h1>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.5;">
          Hola <strong>${customerName}</strong>, mantenemos guardado tu pedido de insumos concentrados de limpieza directos de fábrica.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <span style="font-size:24px;">🚚</span>
          <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#166534;">Prioridad en Despacho Nacional Garantizada</p>
          <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Al completar tu compra hoy, tu pedido entra en el primer turno de producción del día.</p>
        </div>

        <div style="text-align:center;margin-bottom:16px;">
          <a href="${recoveryUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(22,163,74,0.3);">
            Completar mi Compra Ahora (${formatCOP(cart.total)}) 🛒
          </a>
        </div>
    `;

    const sendEmailFn = require('./email-service').sendEmail || sendEmail;
    await sendEmailFn({
        sender: { name: 'Biocambio360', email: 'tiendavirtual@biocambio360.com' },
        to: [{ email: cart.customerEmail, name: customerName }],
        subject: `🔥 Tu carrito de fábrica sigue guardado (+ Prioridad en Despacho)`,
        htmlContent: baseTemplate(content),
    });
}

/**
 * Send Contact 3 (48 hours after abandonment): Último Aviso / Expiración de Token
 */
export async function sendContact3Email(cart: AbandonedCartRecord): Promise<void> {
    const recoveryUrl = `https://biocambio360.com/checkout?recovery_token=${cart.cartToken}`;
    const customerName = cart.customerName || 'Cliente';

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">⏳ Últimas horas: Se liberará la reserva de tu pedido</h1>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.5;">
          Hola <strong>${customerName}</strong>, este es el último recordatorio. Tu enlace temporal de recuperación vencerá hoy y la reserva de lote de producción será liberada.
        </p>

        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="margin:0;font-size:14px;font-weight:800;color:#be123c;">El enlace vencerá próximamente</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9f1239;">Haz clic a continuación para conservar tus productos al precio directo de fábrica.</p>
        </div>

        <div style="text-align:center;margin-bottom:16px;">
          <a href="${recoveryUrl}" style="display:inline-block;background:linear-gradient(135deg,#e11d48,#be123c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(225,29,72,0.3);">
            Reservar y Finalizar Compra ⚡
          </a>
        </div>
    `;

    const sendEmailFn = require('./email-service').sendEmail || sendEmail;
    await sendEmailFn({
        sender: { name: 'Biocambio360', email: 'tiendavirtual@biocambio360.com' },
        to: [{ email: cart.customerEmail, name: customerName }],
        subject: `⏳ Últimas horas: Tu enlace de recuperación vencerá pronto`,
        htmlContent: baseTemplate(content),
    });
}

function baseTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Biocambio360</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <tr>
                <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:32px;text-align:center;">
                  <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Bio<span style="color:#3b82f6;">Cambio</span><span style="color:#ec4899;">360</span></span>
                  <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Soluciones de Limpieza Industrial</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 32px;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
                  <p style="margin:0 0 8px;">Biocambio360 S.A.S. — Cra. 7C #44-17 Sur, Soacha, Cundinamarca</p>
                  <p style="margin:0;">Atención WhatsApp: <a href="https://wa.me/573241005353" style="color:#2563eb;text-decoration:none;font-weight:700;">+57 324 100 5353</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
}
