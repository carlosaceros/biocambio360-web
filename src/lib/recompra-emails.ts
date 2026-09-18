/**
 * Biocambio360 — Email Templates de Recompra Proactiva
 * 
 * Dos niveles de urgencia:
 * 1. Alerta Temprana (25 días antes de agotarse)
 * 2. Crítico (10 días o menos)
 * 
 * Usa el mismo sendEmail() e infraestructura SMTP/Brevo de email-service.ts
 */

import { sendEmail } from './email-service';

const FROM_NAME = 'Biocambio360';
const FROM_EMAIL = process.env.SMTP_FROM || 'tiendavirtual@biocambio360.com';

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function recompraTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Biocambio360 — Hora de Reabastecer</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #059669 0%, #047857 100%);padding:32px;text-align:center;">
                  <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Bio<span style="color:#a7f3d0;">Cambio</span><span style="color:#fbbf24;">360</span></span>
                  <p style="margin:4px 0 0;color:#d1fae5;font-size:13px;font-weight:600;letter-spacing:0.5px;">¡Es hora de reabastecer! 🔄</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
                  <p style="margin:0 0 8px;">Biocambio360 S.A.S. — Cra. 7C #44-17 Sur, Soacha, Cundinamarca</p>
                  <p style="margin:0;">WhatsApp: <a href="https://wa.me/573241005353" style="color:#059669;text-decoration:none;font-weight:700;">+57 324 100 5353</a></p>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">Si no deseas recibir más recordatorios, responde a este correo con "NO RECORDAR".</p>
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

// ─────────────────────────────────────────────────────────────
// Contacto 1: Alerta Temprana (faltan ~25 días)
// ─────────────────────────────────────────────────────────────

export async function sendRecompraAlertaTempranaEmail(data: {
    customerName: string;
    customerEmail: string;
    itemsSummary: string;
    daysRemaining: number;
    lastOrderDate: string;
}): Promise<void> {
    if (!data.customerEmail) return;

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">
            ¡Hola ${data.customerName}! 👋
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
            Según tu última compra del <strong>${new Date(data.lastOrderDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, 
            estimamos que tus productos podrían estar por acabarse en unos <strong>${data.daysRemaining} días</strong>.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                📦 Tu última compra incluyó:
            </p>
            <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">
                ${data.itemsSummary}
            </p>
        </div>

        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
            🚚 <strong>Recuerda:</strong> Biocambio360 subsidia parte del envío para que ahorres en tu compra. 
            Además, los productos concentrados rinden hasta <strong>3x más</strong> que los convencionales.
        </p>

        <div style="text-align:center;margin-bottom:16px;">
            <a href="https://biocambio360.com?utm_source=recompra&utm_medium=email&utm_campaign=alerta_temprana" 
               style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
                Reabastecer Ahora 🛒
            </a>
        </div>

        <div style="text-align:center;">
            <a href="https://wa.me/573241005353?text=Hola%2C%20quiero%20reabastecer%20mis%20productos%20Biocambio360" 
               style="color:#059669;font-size:13px;text-decoration:none;font-weight:600;">
                💬 O pide por WhatsApp directamente
            </a>
        </div>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: `🔄 ${data.customerName}, ¿se está acabando tu detergente? Reabastécete con envío subsidiado`,
        htmlContent: recompraTemplate(content),
    });
}

// ─────────────────────────────────────────────────────────────
// Contacto 2: Crítico (faltan ≤10 días o ya venció)
// ─────────────────────────────────────────────────────────────

export async function sendRecompraCriticoEmail(data: {
    customerName: string;
    customerEmail: string;
    itemsSummary: string;
    daysRemaining: number;
    lastOrderDate: string;
}): Promise<void> {
    if (!data.customerEmail) return;

    const isOverdue = data.daysRemaining <= 0;
    const urgencyText = isOverdue
        ? '¡Tus productos ya podrían haberse agotado!'
        : `¡Solo te quedan ~${data.daysRemaining} días de producto!`;

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">
            ${data.customerName}, ${urgencyText} ⏰
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
            Basándonos en tu compra del <strong>${new Date(data.lastOrderDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, 
            ${isOverdue ? 'es muy probable que ya necesites reabastecer.' : 'estimamos que tu producto está por acabarse.'}
        </p>

        <div style="background:${isOverdue ? '#fef2f2' : '#fffbeb'};border:1px solid ${isOverdue ? '#fecaca' : '#fed7aa'};border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:${isOverdue ? '#991b1b' : '#92400e'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                ${isOverdue ? '🚨 Reabastecimiento Urgente' : '⚠️ Producto por Agotarse'}
            </p>
            <p style="margin:0;font-size:14px;color:${isOverdue ? '#dc2626' : '#d97706'};line-height:1.6;">
                ${data.itemsSummary}
            </p>
        </div>

        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#0369a1;line-height:1.6;">
                💡 <strong>¿Sabías?</strong> Si ordenas hoy, tu pedido puede llegar en <strong>24h (zona local)</strong> 
                o <strong>2-5 días hábiles (nacional)</strong>.
            </p>
        </div>

        <div style="text-align:center;margin-bottom:16px;">
            <a href="https://biocambio360.com?utm_source=recompra&utm_medium=email&utm_campaign=critico" 
               style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 12px rgba(220,38,38,0.3);">
                Ordenar Ahora — Envío Subsidiado 🚚
            </a>
        </div>

        <div style="text-align:center;">
            <a href="https://wa.me/573241005353?text=Hola%2C%20necesito%20reabastecer%20urgente%20mis%20productos%20Biocambio360" 
               style="color:#dc2626;font-size:13px;text-decoration:none;font-weight:600;">
                💬 Pedir por WhatsApp (respuesta inmediata)
            </a>
        </div>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: `⏰ ${data.customerName}, ${isOverdue ? '¡tu producto se acabó!' : 'tu detergente está por acabarse'} — Ordena con envío subsidiado`,
        htmlContent: recompraTemplate(content),
    });
}
