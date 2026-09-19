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

import { OrderStatus } from '@/types/order';
import { getCarrierDisplayName, getTrackingUrl } from '@/lib/shipping-tracking';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const ADMIN_RECIPIENTS = [
    { email: 'infobiocambio360@gmail.com', name: 'Biocambio360 Info' },
    { email: 'carlos.aceros@thinktic.co', name: 'Carlos Aceros' },
    { email: 'daniloespinalospina@gmail.com', name: 'Danilo Espinal' },
    { email: 'thinktic.thinktic@gmail.com', name: 'Think TIC' },
    { email: 'tiendavirtual@biocambio360.com', name: 'Tienda Virtual Biocambio360' },
];

export interface EmailPayload {
    sender?: { name: string; email: string };
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const toAddresses = payload.to.map(t => t.name ? `"${t.name}" <${t.email}>` : t.email).join(', ');
    const senderName = payload.sender?.name || FROM_NAME;
    const senderEmail = payload.sender?.email || FROM_EMAIL;

    let smtpError: string | null = null;

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
            from: `"${senderName}" <${senderEmail}>`,
            to: toAddresses,
            subject: payload.subject,
            html: payload.htmlContent,
        });
        console.log('[Email/SMTP] Sent successfully via Hostinger SMTP:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err: any) {
        smtpError = err?.message || String(err);
        console.error('[Email/SMTP] Hostinger SMTP error:', smtpError);
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
                    sender: payload.sender || { name: FROM_NAME, email: FROM_EMAIL },
                    to: payload.to,
                    subject: payload.subject,
                    htmlContent: payload.htmlContent,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('[Email/Brevo] Fallback failed:', res.status, errText);
                return { success: false, error: `SMTP: ${smtpError} | Brevo: ${res.status} ${errText}` };
            } else {
                const data = await res.json();
                console.log('[Email/Brevo] Fallback sent successfully:', data.messageId);
                return { success: true, messageId: data.messageId };
            }
        } catch (err: any) {
            console.error('[Email/Brevo] Fallback exception:', err?.message || err);
            return { success: false, error: `SMTP: ${smtpError} | Brevo exception: ${err?.message || err}` };
        }
    }

    return { success: false, error: smtpError || 'No email transport succeeded' };
}

export const emailTransport = {
    send: (payload: EmailPayload) => sendEmail(payload),
};

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
// Email: Order Status Change → Customer Notification (With Carrier Tracking)
// ─────────────────────────────────────────────────────────────
export async function sendOrderStatusCustomerEmail(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    status: OrderStatus;
    total: number;
    shippingCarrier?: string;
    trackingNumber?: string;
    items?: { nombre: string; cantidad: number }[];
}): Promise<void> {
    if (!data.customerEmail || data.status === 'borrador') return;

    const carrierName = getCarrierDisplayName(data.shippingCarrier);
    const trackingUrl = getTrackingUrl(data.shippingCarrier, data.trackingNumber, data.orderId);
    const orderShort = data.orderId.slice(-8).toUpperCase();

    let title = '';
    let headline = '';
    let description = '';
    let badgeBg = '#dbeafe';
    let badgeText = '#1e40af';
    let badgeLabel = '';
    let showTrackingBtn = false;

    switch (data.status) {
        case 'confirmado':
            title = '¡Qué emoción tenerte en la familia Biocambio360! 💚✨';
            headline = 'acabas de tomar una decisión maravillosa para tu hogar y tu tranquilidad';
            description = `Hola <strong>${data.customerName}</strong>, queremos darte las gracias de todo corazón por confiar en nosotros.<br><br>Cada vez que eliges Biocambio360, no solo estás adquiriendo productos de limpieza con la mayor concentración y rendimiento directo de fábrica; estás eligiendo cuidar la salud de tu familia, disfrutar de un aroma a limpio inconfundible y proteger a quienes más amas con fórmulas biodegradables y respetuosas con el medio ambiente.<br><br>Tu orden ya está confirmada en nuestro sistema y el equipo de planta la tiene lista para alistarla con todo el cariño y la rigurosidad que te mereces.`;
            badgeBg = '#dbeafe';
            badgeText = '#1e40af';
            badgeLabel = 'CONFIRMADO CON AMOR';
            break;
        case 'preparacion':
            title = '¡Tus productos se están empacando con todo el cuidado! 🌿🧼';
            headline = 'consentimos cada detalle directamente desde nuestra fábrica';
            description = `¡Excelentes noticias, <strong>${data.customerName}</strong>! Tus productos ya están en nuestra línea de alistamiento.<br><br>Nuestro equipo de bodega está inspeccionando personalmente cada lote, verificando el sellado hermético y reforzando las esquinas con embalaje de alta resistencia para que cada garrafa llegue a tu puerta tan impecable y fresca como cuando fue envasada.<br><br>Nos llena de alegría saber que muy pronto tu ropa, tu cocina y tus espacios favoritos van a respirar esta frescura y pureza inigualable.`;
            badgeBg = '#fef3c7';
            badgeText = '#92400e';
            badgeLabel = 'EN PREPARACIÓN ARTESANAL';
            break;
        case 'enviado':
        case 'en_camino':
            title = '¡Tu pedido ya viaja rumbo a tus manos! 🚚💨';
            headline = 'un paso más cerca de transformar tu rutina de limpieza';
            description = `¡Qué felicidad! El transportador de <strong>${carrierName}</strong> ya tiene tu paquete en ruta hacia tu dirección.<br><br>Muy pronto vas a comprobar por qué miles de familias y lavanderías en Colombia aman la fragancia duradera, el ahorro real y el poder desmanchador de nuestras fórmulas.<br><br>${
                data.trackingNumber 
                    ? `Puedes seguir el recorrido en tiempo real con el número de guía <strong>${data.trackingNumber}</strong> (${carrierName}) haciendo clic en el botón de abajo.`
                    : `Nuestro equipo logístico está monitoreando el despacho para que lo recibas en el menor tiempo posible.`
            }`;
            badgeBg = '#e0e7ff';
            badgeText = '#3730a3';
            badgeLabel = 'EN CAMINO';
            showTrackingBtn = true;
            break;
        case 'entregado':
            title = '¡Entregado! Tu hogar está a punto de brillar con frescura 🏡✨';
            headline = 'gracias infinitas por abrirnos las puertas de tu espacio';
            description = `¡Llegó el momento más esperado, <strong>${data.customerName}</strong>! La transportadora nos confirma que tu paquete ya está en tus manos.<br><br>Deseamos de todo corazón que disfrutes cada gota: el aroma acogedor que perdura en tus prendas, la facilidad con que arranca la grasa sin maltratar tus manos y la satisfacción de saber que estás apoyando con orgullo la industria nacional ecológica.<br><br><strong>Un tip de amigos:</strong> nuestras fórmulas son ultra concentradas; no necesitas usar de más. ¡Una pequeña medida hace maravillas!`;
            badgeBg = '#dcfce7';
            badgeText = '#15803d';
            badgeLabel = '¡ENTREGADO CON ÉXITO!';
            break;
        case 'no_entregado':
            title = '¡No te preocupes! Estamos aquí para ayudarte a recibir tu pedido 🤝';
            headline = 'tuvimos un pequeño tropiezo con la entrega hoy, pero lo solucionaremos juntos';
            description = `Hola <strong>${data.customerName}</strong>, el transportador nos informó que hoy no fue posible completar la entrega en tu dirección (quizás saliste un momento o hubo una novedad en la vía).<br><br>¡Respira tranquilo(a)! Tu paquete está 100% seguro bajo nuestro resguardo y tu satisfacción es nuestra máxima prioridad. Ya estamos coordinando un reintento para que lo recibas cómodamente en la franja y dirección que mejor te convenga. Si prefieres, escríbenos directamente a nuestro WhatsApp para programarlo a tu gusto.`;
            badgeBg = '#ffe4e6';
            badgeText = '#9f1239';
            badgeLabel = 'NOVEDAD / REINTENTO SEGURO';
            showTrackingBtn = !!data.trackingNumber;
            break;
        case 'cancelado':
            title = 'Estamos siempre aquí para escucharte y apoyarte 💙';
            headline = 'actualización sincera sobre tu orden';
            description = `Hola <strong>${data.customerName}</strong>, te escribimos para confirmarte que tu pedido ha sido cancelado en el sistema. Sabemos que a veces los planes cambian o se presentan imprevistos.<br><br>Queremos que sepas que en Biocambio360 cuentas con un equipo de amigos dispuestos a orientarte con honestidad, ética y sin presiones. Si más adelante deseas retomar tu pedido o tienes cualquier pregunta sobre nuestros productos, estaremos felices de atenderte con la misma calidez de siempre.`;
            badgeBg = '#fee2e2';
            badgeText = '#b91c1c';
            badgeLabel = 'PEDIDO CANCELADO';
            break;
        default:
            return;
    }

    const itemsSummary = (data.items && data.items.length > 0)
        ? `<div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:12px;font-size:13px;color:#334155;border:1px solid #f1f5f9;">
            <strong style="color:#0f172a;display:block;margin-bottom:8px;font-size:14px;">🛍️ Tus productos elegidos:</strong>
            <ul style="margin:0 0 0 16px;padding:0;line-height:1.6;">
                ${data.items.map(it => `<li style="margin-bottom:4px;"><strong>${it.cantidad}x</strong> ${it.nombre}</li>`).join('')}
            </ul>
           </div>`
        : '';

    const content = `
        <div style="text-align:center;margin-bottom:24px;">
          <span style="display:inline-block;padding:6px 16px;background:${badgeBg};color:${badgeText};border-radius:100px;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">
            ${badgeLabel}
          </span>
          <h1 style="margin:14px 0 8px;color:#0f172a;font-size:22px;font-weight:900;line-height:1.3;">${title}</h1>
          <p style="margin:0;color:#64748b;font-size:14px;">Hola <strong>${data.customerName}</strong>, ${headline}.</p>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:26px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="color:#334155;font-size:14px;line-height:1.7;margin-bottom:20px;">
            ${description}
          </div>

          ${itemsSummary}

          <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-top:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">N° Pedido</span>
                  <p style="margin:2px 0 0;font-size:15px;font-weight:900;color:#0f172a;">#${orderShort}</p>
                </td>
                <td align="right">
                  <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Total Invertido</span>
                  <p style="margin:2px 0 0;font-size:18px;font-weight:900;color:#059669;">${formatCOP(data.total)}</p>
                </td>
              </tr>
            </table>
          </div>

          ${data.trackingNumber ? `
          <div style="margin-top:18px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
            <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
              <strong>Transportadora Aliada:</strong> ${carrierName}<br/>
              <strong>Número de Guía:</strong> <span style="font-family:monospace;font-weight:800;letter-spacing:0.5px;font-size:14px;">${data.trackingNumber}</span>
            </p>
          </div>` : ''}

          <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #e2e8f0;font-size:12px;color:#64748b;font-style:italic;line-height:1.5;">
            "La limpieza no solo es un deber, es el acto de cuidar y llenar de armonía el lugar donde florece tu familia."
            <br/><span style="font-style:normal;font-weight:700;color:#0f172a;">— Con cariño, Julián, Danilo y todo el equipo de Biocambio360 🌱</span>
          </div>
        </div>

        <div style="text-align:center;margin-top:24px;">
          ${showTrackingBtn ? `
            <a href="${trackingUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:100px;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(37,99,235,0.25);margin-right:8px;margin-bottom:8px;">
              🔍 Rastrear Envío en Vivo
            </a>
          ` : ''}
          <a href="https://biocambio360.com/confirmacion/${data.orderId}" target="_blank" style="display:inline-block;background:#f1f5f9;color:#334155;text-decoration:none;padding:14px 24px;border-radius:100px;font-weight:700;font-size:13px;margin-bottom:8px;">
            Ver Estado de mi Pedido
          </a>
        </div>
    `;

    await emailTransport.send({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: `${badgeLabel === 'EN CAMINO' ? '🚚' : '📦'} [${badgeLabel}] Pedido #${orderShort} — Biocambio360`,
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

// ─────────────────────────────────────────────────────────────
// Email: Notificación al Referidor (Presión Social de Entrega)
// ─────────────────────────────────────────────────────────────
export async function sendReferralRewardPendingEmail(data: {
    referrerEmail: string;
    referrerName: string;
    friendName: string;
    rewardAmount: number;
    orderId: string;
}): Promise<void> {
    if (!data.referrerEmail) return;

    const content = `
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;">¡Tu amigo acaba de comprar! 🎁</h1>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;">
            Hola <strong>${data.referrerName}</strong>, tenemos una excelente noticia: tu amigo(a) <strong>${data.friendName}</strong> acaba de realizar un pedido utilizando tu código de embajador.
        </p>

        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;color:#6d28d9;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Recompensa Pendiente</p>
          <p style="margin:8px 0 0;font-size:36px;font-weight:900;color:#7c3aed;">+${formatCOP(data.rewardAmount)} COP</p>
          <p style="margin:8px 0 0;font-size:13px;color:#5b21b6;font-weight:600;">
            ⏳ Saldo en proceso de canje (Pedido #${data.orderId.slice(-8).toUpperCase()})
          </p>
        </div>

        <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">
            <strong>¿Cuándo se libera tu saldo?</strong><br/>
            Este dinero pasará automáticamente a tu <strong>Saldo Disponible</strong> tan pronto como la transportadora entregue el pedido a tu amigo. 
            ¡Asegúrate de animarlo a recibirlo en su domicilio para que ambos disfruten de los beneficios!
          </p>
        </div>

        <div style="text-align:center;">
          <a href="https://biocambio360.com/comunidad" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            Consultar mi Monedero de Embajador
          </a>
        </div>
    `;

    await sendEmail({
        sender: { name: 'Comunidad Biocambio360', email: FROM_EMAIL },
        to: [{ email: data.referrerEmail, name: data.referrerName }],
        subject: `🎉 ¡Tu amigo ${data.friendName} usó tu código! Tienes ${formatCOP(data.rewardAmount)} pendientes`,
        htmlContent: baseTemplate(content),
    });
}
