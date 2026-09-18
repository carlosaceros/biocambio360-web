/**
 * Biocambio360 — Template de Email para Resumen Diario
 * 
 * Enviado automáticamente a ADMIN_RECIPIENTS con:
 * - KPIs de ventas del día
 * - Pipeline de pedidos por estado
 * - Alertas de recompra (clientes en riesgo)
 * - Carritos abandonados del día
 */

import { sendEmail } from './email-service';

const FROM_NAME = 'Biocambio360 Admin';
const FROM_EMAIL = process.env.SMTP_FROM || 'tiendavirtual@biocambio360.com';

const ADMIN_RECIPIENTS = [
    { email: 'infobiocambio360@gmail.com', name: 'Biocambio360 Info' },
    { email: 'carlos.aceros@thinktic.co', name: 'Carlos Aceros' },
    { email: 'tiendavirtual@biocambio360.com', name: 'Tienda Virtual Biocambio360' },
];

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export interface DailyAlertData {
    // Ventas del día
    todaySales: number;
    todayOrdersCount: number;
    todayAvgTicket: number;

    // Pipeline
    pipeline: {
        pendiente: number;
        confirmado: number;
        preparacion: number;
        enviado: number;
        en_camino: number;
        entregado: number;
        cancelado: number;
    };

    // Recompra
    recompraAlerts: {
        customerName: string;
        customerPhone: string;
        status: string;
        daysRemaining: number;
        itemsSummary: string;
    }[];

    // Carritos abandonados
    abandonedCartsToday: number;
    abandonedCartsValue: number;

    // CRM
    crmStats?: {
        totalCustomers: number;
        atRisk: number;
        lost: number;
        newToday: number;
    };
}

export async function sendDailyAlertEmail(data: DailyAlertData): Promise<void> {
    const today = new Date().toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const pipelineRows = [
        { label: '⏳ Pendientes', count: data.pipeline.pendiente, color: '#eab308' },
        { label: '✅ Confirmados', count: data.pipeline.confirmado, color: '#3b82f6' },
        { label: '📦 En Preparación', count: data.pipeline.preparacion, color: '#8b5cf6' },
        { label: '🚚 Enviados', count: data.pipeline.enviado, color: '#6366f1' },
        { label: '📍 En Camino', count: data.pipeline.en_camino, color: '#f97316' },
        { label: '✓ Entregados (hoy)', count: data.pipeline.entregado, color: '#22c55e' },
        { label: '✕ Cancelados', count: data.pipeline.cancelado, color: '#ef4444' },
    ].map(row => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
            ${row.label}
          </td>
          <td align="right" style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:18px;font-weight:800;color:${row.color};">
            ${row.count}
          </td>
        </tr>
    `).join('');

    const recompraSection = data.recompraAlerts.length > 0 ? `
        <h2 style="font-size:16px;color:#111827;margin:24px 0 12px;">🔔 Alertas de Recompra (${data.recompraAlerts.length})</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <thead>
            <tr style="background:#fef3c7;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#92400e;text-transform:uppercase;">Cliente</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#92400e;text-transform:uppercase;">Estado</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#92400e;text-transform:uppercase;">Días</th>
            </tr>
          </thead>
          <tbody>
            ${data.recompraAlerts.slice(0, 10).map(alert => {
                const statusColor = alert.status === 'vencido' ? '#ef4444' : alert.status === 'critico_10_dias' ? '#f97316' : '#eab308';
                const statusLabel = alert.status === 'vencido' ? '🚨 Vencido' : alert.status === 'critico_10_dias' ? '⚠️ Crítico' : '🔔 Alerta';
                return `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">
                    <strong>${alert.customerName}</strong><br>
                    <span style="color:#9ca3af;font-size:11px;">${alert.customerPhone}</span>
                  </td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:${statusColor};font-weight:700;">
                    ${statusLabel}
                  </td>
                  <td align="right" style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:700;color:${statusColor};">
                    ${alert.daysRemaining}d
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
    ` : '';

    const crmSection = data.crmStats ? `
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;margin-bottom:24px;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#5b21b6;">📊 CRM</h3>
            <p style="margin:0;font-size:13px;color:#6d28d9;line-height:1.6;">
                <strong>${data.crmStats.totalCustomers}</strong> clientes totales · 
                <strong style="color:#f97316;">${data.crmStats.atRisk}</strong> en riesgo · 
                <strong style="color:#ef4444;">${data.crmStats.lost}</strong> perdidos · 
                <strong style="color:#22c55e;">${data.crmStats.newToday}</strong> nuevos hoy
            </p>
        </div>
    ` : '';

    const content = `
        <h1 style="margin:0 0 4px;color:#111827;font-size:22px;font-weight:800;">📊 Resumen del Día</h1>
        <p style="margin:0 0 24px;color:#9ca3af;font-size:13px;text-transform:capitalize;">${today}</p>

        <!-- KPIs -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td width="33%" style="padding:12px;background:#f0fdf4;border-radius:12px 0 0 12px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#166534;text-transform:uppercase;font-weight:700;">Ventas Hoy</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#15803d;">${formatCOP(data.todaySales)}</p>
            </td>
            <td width="33%" style="padding:12px;background:#eff6ff;text-align:center;">
              <p style="margin:0;font-size:11px;color:#1e40af;text-transform:uppercase;font-weight:700;">Pedidos</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#1d4ed8;">${data.todayOrdersCount}</p>
            </td>
            <td width="33%" style="padding:12px;background:#faf5ff;border-radius:0 12px 12px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6b21a8;text-transform:uppercase;font-weight:700;">Ticket Prom.</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#7c3aed;">${formatCOP(data.todayAvgTicket)}</p>
            </td>
          </tr>
        </table>

        <!-- Pipeline -->
        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">📋 Pipeline de Pedidos</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${pipelineRows}
        </table>

        ${recompraSection}

        <!-- Carritos Abandonados -->
        ${data.abandonedCartsToday > 0 ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#991b1b;">🛒 Carritos Abandonados Hoy</h3>
            <p style="margin:0;font-size:13px;color:#dc2626;line-height:1.6;">
                <strong>${data.abandonedCartsToday}</strong> carritos por un valor de <strong>${formatCOP(data.abandonedCartsValue)}</strong>
            </p>
        </div>
        ` : ''}

        ${crmSection}

        <div style="text-align:center;">
            <a href="https://biocambio360.com/admin" 
               style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;">
                Abrir Panel de Admin →
            </a>
        </div>
    `;

    const emailBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <tr>
                <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:24px;text-align:center;">
                  <span style="color:#ffffff;font-size:20px;font-weight:900;">Bio<span style="color:#3b82f6;">Cambio</span><span style="color:#ec4899;">360</span></span>
                  <span style="color:#64748b;font-size:12px;margin-left:8px;">Admin Report</span>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;">
                  <p style="margin:0;">Reporte automático generado por el sistema CRM de Biocambio360</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await sendEmail({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: ADMIN_RECIPIENTS,
        subject: `📊 Resumen Diario — ${formatCOP(data.todaySales)} en ventas · ${data.todayOrdersCount} pedidos`,
        htmlContent: emailBody,
    });
}
