import { sendEmail } from './email-service';
import { AbandonedCartRecord } from './abandoned-cart-service';

const BASE_URL = 'https://www.biocambio360.com';

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
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);max-width:600px;">
              <!-- Official Header with Brand Logo -->
              <tr>
                <td style="background:#ffffff;padding:28px 32px 20px;text-align:center;border-bottom:1px solid #f1f5f9;">
                  <a href="${BASE_URL}" target="_blank" style="text-decoration:none;display:inline-block;">
                    <img src="${BASE_URL}/images/logo-biocambio360.png" width="190" alt="Biocambio360" style="display:block;margin:0 auto;max-width:190px;height:auto;border:0;" />
                  </a>
                  <p style="margin:8px 0 0;color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Soluciones de Limpieza Directas de Fábrica</p>
                </td>
              </tr>
              <!-- Email Body Content -->
              <tr>
                <td style="padding:36px 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Official Footer -->
              <tr>
                <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
                  <p style="margin:0 0 8px;font-weight:600;">Biocambio360 S.A.S. — NIT 901.798.484-4 — Soacha, Cundinamarca</p>
                  <p style="margin:0;">Atención WhatsApp Directa: <a href="https://wa.me/573241005353" style="color:#2563eb;text-decoration:none;font-weight:700;">+57 324 100 5353</a></p>
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

/**
 * Send Contact 1 (1 hour after abandonment): Asistencia y Soporte
 */
export async function sendContact1Email(cart: AbandonedCartRecord): Promise<void> {
    if (!cart.customerEmail) return;

    const clickUrl = `${BASE_URL}/api/track/click?token=${cart.cartToken}&contact=1&target=${encodeURIComponent(`/checkout?recovery_token=${cart.cartToken}`)}`;
    const openPixelUrl = `${BASE_URL}/api/track/open?token=${cart.cartToken}&contact=1`;
    const customerName = cart.customerName || 'Cliente';

    const itemsHtml = cart.items.map(item => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">
            <strong>${item.nombre}</strong> <span style="color:#6b7280;">(${item.size})</span> × ${item.cantidad}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:700;">
            ${formatCOP(item.price * item.cantidad)}
          </td>
        </tr>
    `).join('');

    const content = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 14px;display:inline-block;margin-bottom:16px;">
          <span style="color:#1d4ed8;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">🛒 Carrito Guardado</span>
        </div>
        <h1 style="margin:0 0 10px;color:#111827;font-size:22px;font-weight:900;line-height:1.3;">¿Tuviste alguna duda con tu pedido en Biocambio360?</h1>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
          Hola <strong>${customerName}</strong>, notamos que estuviste seleccionando productos de fábrica pero no alcanzaste a finalizar tu compra.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px;margin-bottom:24px;">
          <p style="margin:0 0 14px;font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Tus Productos Reservados en Fábrica</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr>
              <td style="padding:14px 0 0;font-size:15px;font-weight:800;color:#111827;">Total Estimado</td>
              <td align="right" style="padding:14px 0 0;font-size:19px;font-weight:900;color:#2563eb;">${formatCOP(cart.total)}</td>
            </tr>
          </table>
        </div>

        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin-bottom:24px;">
          ✅ <strong>Disponemos de Pago Contraentrega en Efectivo o Transferencia</strong> y pasarela segura Wompi (Tarjetas / PSE / Nequi / Bancolombia). Tus datos ya están listos en el checkout para completar tu compra en un instante.
        </p>

        <div style="text-align:center;margin:28px 0 12px;">
          <a href="${clickUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
            Reanudar mi Compra en 1 Clic 🚀
          </a>
        </div>
        <img src="${openPixelUrl}" width="1" height="1" style="display:none;" alt="" />
    `;

    await sendEmail({
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
    if (!cart.customerEmail) return;

    const clickUrl = `${BASE_URL}/api/track/click?token=${cart.cartToken}&contact=2&target=${encodeURIComponent(`/checkout?recovery_token=${cart.cartToken}`)}`;
    const openPixelUrl = `${BASE_URL}/api/track/open?token=${cart.cartToken}&contact=2`;
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
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;display:inline-block;margin-bottom:16px;">
          <span style="color:#166534;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">🚚 Despacho Prioritario Reservado</span>
        </div>
        <h1 style="margin:0 0 10px;color:#111827;font-size:22px;font-weight:900;line-height:1.3;">Tus insumos de fábrica siguen reservados para despacho prioritario</h1>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
          Hola <strong>${customerName}</strong>, queremos recordarte que tus productos siguen listos en nuestra planta de producción de Soacha para despacho inmediato.
        </p>

        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="margin:0;font-size:16px;font-weight:800;color:#166534;">📦 Primer Turno de Envíos Garantizado</p>
          <p style="margin:6px 0 0;font-size:13px;color:#15803d;line-height:1.5;">Al completar tu pedido hoy, tu guía será emitida inmediatamente con cobertura nacional.</p>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr>
              <td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#111827;">Total Pedido</td>
              <td align="right" style="padding:12px 0 0;font-size:18px;font-weight:900;color:#16a34a;">${formatCOP(cart.total)}</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;margin:28px 0 12px;">
          <a href="${clickUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(22,163,74,0.35);">
            Completar mi Pedido Ahora (${formatCOP(cart.total)}) 🛒
          </a>
        </div>
        <img src="${openPixelUrl}" width="1" height="1" style="display:none;" alt="" />
    `;

    await sendEmail({
        sender: { name: 'Biocambio360', email: 'tiendavirtual@biocambio360.com' },
        to: [{ email: cart.customerEmail, name: customerName }],
        subject: `🔥 Tus insumos de fábrica siguen reservados (+ Prioridad en Despacho)`,
        htmlContent: baseTemplate(content),
    });
}

/**
 * Send Contact 3 (48 hours after abandonment): Último Aviso / Expiración de Token
 */
export async function sendContact3Email(cart: AbandonedCartRecord): Promise<void> {
    if (!cart.customerEmail) return;

    const clickUrl = `${BASE_URL}/api/track/click?token=${cart.cartToken}&contact=3&target=${encodeURIComponent(`/checkout?recovery_token=${cart.cartToken}`)}`;
    const openPixelUrl = `${BASE_URL}/api/track/open?token=${cart.cartToken}&contact=3`;
    const customerName = cart.customerName || 'Cliente';

    const content = `
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:8px 14px;display:inline-block;margin-bottom:16px;">
          <span style="color:#be123c;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">⏳ Último Aviso de Reserva</span>
        </div>
        <h1 style="margin:0 0 10px;color:#111827;font-size:22px;font-weight:900;line-height:1.3;">Últimas horas: Tu enlace de recuperación vencerá pronto</h1>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
          Hola <strong>${customerName}</strong>, este es nuestro último recordatorio. Tu sesión de carrito y precios reservados se liberarán hoy para otros pedidos.
        </p>

        <div style="background:#fff1f2;border:1px solid #fda4af;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="margin:0;font-size:15px;font-weight:900;color:#9f1239;">⚠️ Liberación de Inventario Programada</p>
          <p style="margin:6px 0 0;font-size:13px;color:#be123c;line-height:1.5;">No te quedes sin tus insumos al precio oficial de fábrica 2026.</p>
        </div>

        <div style="text-align:center;margin:28px 0 12px;">
          <a href="${clickUrl}" style="display:inline-block;background:linear-gradient(135deg,#e11d48,#be123c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(225,29,72,0.35);">
            Finalizar mi Compra Antes de Expirar ⚡
          </a>
        </div>
        <img src="${openPixelUrl}" width="1" height="1" style="display:none;" alt="" />
    `;

    await sendEmail({
        sender: { name: 'Biocambio360', email: 'tiendavirtual@biocambio360.com' },
        to: [{ email: cart.customerEmail, name: customerName }],
        subject: `⏳ Últimas horas: Tu enlace de recuperación vencerá pronto`,
        htmlContent: baseTemplate(content),
    });
}
