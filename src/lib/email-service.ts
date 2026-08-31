/**
 * Biocambio360 Email Service
 * Uses Nodemailer via Hostinger SMTP (tiendavirtual@biocambio360.com)
 * with automatic Brevo fallback.
 */

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'tiendavirtual@biocambio360.com';
const SMTP_PASS = process.env.SMTP_PASS || 'z@8IL?=N/CZ';
const FROM_EMAIL = process.env.SMTP_FROM || 'tiendavirtual@biocambio360.com';
const FROM_NAME = 'Biocambio360';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const ADMIN_RECIPIENTS = [
    { email: 'infobiocambio360@gmail.com', name: 'Biocambio360 Info' },
    { email: 'carlos.aceros@thinktic.co', name: 'Carlos Aceros' },
    { email: 'tiendavirtual@biocambio360.com', name: 'Tienda Virtual Biocambio360' },
];

interface EmailPayload {
    sender?: { name: string; email: string };
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
    const toAddresses = payload.to.map(t => t.email).join(', ');

    // 1. Try sending via Hostinger SMTP (Primary)
    try {
        // Dynamic require to prevent bundler issues in Next.js build
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            tls: {
                rejectUnauthorized: false,
            },
        });

        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: toAddresses,
            subject: payload.subject,
            html: payload.htmlContent,
        });
        console.log('[Email/SMTP] Sent successfully via Hostinger SMTP:', info.messageId);
        return;
    } catch (err: any) {
        console.error('[Email/SMTP] Hostinger SMTP error:', err?.message || err);
    }

    // 2. Fallback to Brevo REST API if configured
    if (BREVO_API_KEY) {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: FROM_NAME, email: FROM_EMAIL },
                    to: payload.to,
                    subject: payload.subject,
                    htmlContent: payload.htmlContent,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('[Email/Brevo] Fallback failed:', res.status, errText);
            } else {
                const data = await res.json();
                console.log('[Email/Brevo] Fallback sent successfully:', data.messageId);
                return;
            }
        } catch (err: any) {
            console.error('[Email/Brevo] Fallback exception:', err?.message || err);
        }
    }
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
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
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:32px;text-align:center;">
                  <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Bio<span style="color:#3b82f6;">Cambio</span><span style="color:#ec4899;">360</span></span>
                  <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Soluciones de Limpieza Industrial</p>
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

// ─────────────────────────────────────────────────────────────
// Email: Payment Confirmed → Customer
// ─────────────────────────────────────────────────────────────
export async function sendPaymentConfirmedEmail(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    total: number;
}): Promise<void> {
    if (!data.customerEmail) return;

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;">¡Gracias por tu compra! 🎉</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola <strong>${data.customerName}</strong>, tu pago fue procesado exitosamente.</p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#166534;letter-spacing:1px;text-transform:uppercase;">Monto Pagado</p>
          <p style="margin:8px 0 0;font-size:36px;font-weight:800;color:#15803d;">${formatCOP(data.total)}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#166534;">Pedido <strong>#${data.orderId.slice(-8).toUpperCase()}</strong></p>
        </div>

        <p style="color:#6b7280;font-size:14px;line-height:1.6;">Tu pedido está en preparación. Te notificaremos cuando sea despachado. El tiempo de entrega estimado es de <strong>2 a 5 días hábiles</strong>.</p>

        <a href="https://biocambio360.com" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;">
          Seguir Comprando 🛒
        </a>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: `💳 Pago Confirmado — Pedido #${data.orderId.slice(-8).toUpperCase()}`,
        htmlContent: baseTemplate(content),
    });
}

// ─────────────────────────────────────────────────────────────
// Email: New Order Notification → Admins (infobiocambio360@gmail.com & carlos.aceros@thinktic.co)
// ─────────────────────────────────────────────────────────────
export async function sendNewOrderNotificationToAdmin(data: {
    orderId: string;
    cliente: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
    direccion?: string;
    total: number;
    estado?: string;
    items?: { nombre: string; size: string; cantidad: number; price: number }[];
}): Promise<void> {
    const estadoText = data.estado ? data.estado.toUpperCase() : 'NUEVO / PENDIENTE DE PAGO';
    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;">🔔 ¡Nuevo Pedido Recibido!</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Se ha registrado el pedido <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> en la tienda.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Estado del Pedido:</strong> <span style="display:inline-block;padding:4px 10px;background:#e0f2fe;color:#0369a1;border-radius:6px;font-weight:800;font-size:12px;">${estadoText}</span></p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">Total: ${formatCOP(data.total)}</p>
        </div>

        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Datos del Cliente</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${[
            ['Nombre', data.cliente],
            ['Email', data.email || 'N/A'],
            ['Teléfono', data.telefono || 'N/A'],
            ['Dirección', data.direccion || 'N/A'],
            ['Ciudad', data.ciudad || 'N/A'],
          ].map(([label, value]) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;width:40%;">${label}</td>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${value}</td>
            </tr>
          `).join('')}
        </table>

        <a href="https://biocambio360.com/admin/pedidos" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;">
          Ver en Admin Panel →
        </a>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: ADMIN_RECIPIENTS,
        subject: `🛒 [${estadoText}] Nuevo pedido #${data.orderId.slice(-8).toUpperCase()} — ${formatCOP(data.total)}`,
        htmlContent: baseTemplate(content),
    });
}

export async function sendNewOrderAdminEmail(data: {
    orderId: string;
    customerName: string;
    total: number;
    metodoPago: string;
    ciudad?: string;
    customerEmail?: string;
    telefono?: string;
    direccion?: string;
}): Promise<void> {
    return sendNewOrderNotificationToAdmin({
        orderId: data.orderId,
        cliente: data.customerName,
        email: data.customerEmail,
        telefono: data.telefono,
        direccion: data.direccion,
        total: data.total,
        estado: 'PENDIENTE',
        ciudad: data.ciudad,
    });
}

// ─────────────────────────────────────────────────────────────
// Email: Order Status Change → Admin Notification
// ─────────────────────────────────────────────────────────────
export async function sendOrderStatusUpdateEmailToAdmin(data: {
    orderId: string;
    cliente: string;
    estadoAnterior: string;
    nuevoEstado: string;
    total: number;
}): Promise<void> {
    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;">🔄 Estado de Pedido Actualizado</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">El estado del pedido <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> ha sido actualizado.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Cliente:</strong> ${data.cliente}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Estado Anterior:</strong> <span style="color:#ef4444;font-weight:700;">${data.estadoAnterior.toUpperCase()}</span></p>
          <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Nuevo Estado:</strong> <span style="display:inline-block;padding:4px 10px;background:#dcfce7;color:#15803d;border-radius:6px;font-weight:800;font-size:12px;">${data.nuevoEstado.toUpperCase()}</span></p>
          <p style="margin:12px 0 0;font-size:20px;font-weight:900;color:#0f172a;">Total: ${formatCOP(data.total)}</p>
        </div>

        <a href="https://biocambio360.com/admin/pedidos" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;">
          Ver en Admin Panel →
        </a>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: ADMIN_RECIPIENTS,
        subject: `📌 [${data.nuevoEstado.toUpperCase()}] Pedido #${data.orderId.slice(-8).toUpperCase()} — ${data.cliente}`,
        htmlContent: baseTemplate(content),
    });
}

// ─────────────────────────────────────────────────────────────
// Email: Order Confirmation → Customer
// ─────────────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    total: number;
    items: { nombre: string; size: string; cantidad: number; price: number }[];
    metodoPago: string;
    direccionEnvio: {
        direccion: string;
        ciudad: string;
        departamento?: string;
    };
}): Promise<void> {
    if (!data.customerEmail) return;

    const itemsHtml = (data.items || []).map((item: any) => {
        const nombreProducto = item.nombre || item.product?.nombre || item.product?.title || 'Producto Biocambio360';
        return `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">
                <strong>${nombreProducto}</strong><br>
                <span style="color:#9ca3af;font-size:12px;">Presentación: ${item.size || 'Estándar'} × ${item.cantidad || 1}</span>
              </td>
              <td align="right" style="padding:12px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:700;">
                ${formatCOP((item.price || 0) * (item.cantidad || 1))}
              </td>
            </tr>
        `;
    }).join('');

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;">¡Recibimos tu pedido! 📦</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola <strong>${data.customerName}</strong>, tu pedido <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> está registrado.</p>

        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Resumen de la Compra</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${itemsHtml}
          <tr>
            <td style="padding:16px 0 0;font-size:16px;font-weight:800;color:#111827;">Total</td>
            <td align="right" style="padding:16px 0 0;font-size:20px;font-weight:900;color:#059669;">${formatCOP(data.total)}</td>
          </tr>
        </table>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#111827;">Dirección de Entrega</h3>
          <p style="margin:0;color:#6b7280;font-size:14px;">${data.direccionEnvio.direccion || 'N/A'}, ${data.direccionEnvio.ciudad || 'N/A'}</p>
        </div>

        <a href="https://biocambio360.com" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;">
          Volver a la Tienda
        </a>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: `📦 Pedido Recibido #${data.orderId.slice(-8).toUpperCase()} — Biocambio360`,
        htmlContent: baseTemplate(content),
    });
}
