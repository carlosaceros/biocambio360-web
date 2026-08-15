import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            code = 'COT-2026-0101',
            nombreEncargado = 'Cliente Corporativo',
            nombreEmpresa = 'Empresa Cundinamarca',
            whatsapp = '3000000000',
            email = 'correo@empresa.com',
            ciudad = 'Soacha / Bogotá',
            sectorLabel = 'Propiedad Horizontal / Empresa',
            items = [],
            gastoMercadoMes = 0,
            gastoBiocambioMes = 0,
            ahorroMes = 0,
            ahorroAnual = 0,
            ahorroPct = 38
        } = body;

        const dateStr = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const validUntilStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const itemsHtml = items.map((item: any, idx: number) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${item.nombre}</td>
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #475569; text-align: center;">${item.presentacion}</td>
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #64748B; text-align: center;">${item.cantidad} garrafas</td>
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #94A3B8; text-decoration: line-through; text-align: right;">$${Number(item.subtotalMercado || 0).toLocaleString('es-CO')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; font-weight: 800; color: #16A34A; text-align: right;">$${Number(item.subtotalBiocambio || 0).toLocaleString('es-CO')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; font-weight: 800; color: #0D9488; text-align: right;">$${Number(item.ahorroItem || 0).toLocaleString('es-CO')}</td>
            </tr>
        `).join('');

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización Oficial ${code} — Biocambio360</title>
    <style>
        @media print {
            body { background: white !important; margin: 0; padding: 0; }
            .no-print { display: none !important; }
        }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #0F172A; margin: 0; padding: 20px; }
        .quote-card { max-width: 850px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 40px; border: 1px solid #E2E8F0; }
        .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #DC2626; padding-bottom: 20px; margin-bottom: 30px; }
        .brand-logo { font-size: 26px; font-weight: 900; letter-spacing: -1px; }
        .brand-red { color: #DC2626; }
        .brand-blue { color: #2563EB; }
        .quote-badge { background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; font-weight: 800; padding: 6px 14px; border-radius: 20px; font-size: 13px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #F8FAFC; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 30px; font-size: 13px; }
        .info-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748B; margin-bottom: 4px; }
        .info-val { font-weight: 700; color: #0F172A; }
        .savings-hero { background: linear-gradient(135deg, #0F766E, #0D9488); color: white; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 30px; }
        .savings-hero h3 { margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
        .savings-hero .amount { font-size: 36px; font-weight: 900; margin: 4px 0; }
        .savings-hero .sub { font-size: 13px; opacity: 0.95; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        th { background: #0F172A; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .terms-box { font-size: 11px; color: #64748B; background: #F1F5F9; padding: 16px; border-radius: 10px; line-height: 1.6; }
        .print-btn { display: block; width: 100%; max-width: 300px; margin: 20px auto 0 auto; background: #DC2626; color: white; border: none; padding: 14px; font-weight: 900; border-radius: 12px; font-size: 14px; cursor: pointer; text-align: center; text-decoration: none; }
    </style>
</head>
<body>
    <div class="quote-card">
        <div class="header-bar">
            <div>
                <img src="/images/logo-biocambio360.png" alt="Biocambio360" style="height: 48px; width: auto; object-fit: contain; display: block; margin-bottom: 6px;" />
                <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Fábrica Directa de Productos de Aseo Industrial y Hogar</div>
                <div style="font-size: 11px; color: #94A3B8;">NIT: 901.847.392-1 · Soacha / Cundinamarca</div>
            </div>
            <div style="text-align: right;">
                <div class="quote-badge">${code}</div>
                <div style="font-size: 12px; color: #64748B; margin-top: 8px;">Fecha: <strong>${dateStr}</strong></div>
                <div style="font-size: 11px; color: #EF4444;">Válida hasta: <strong>${validUntilStr}</strong></div>
            </div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-title">Cliente / Organización</div>
                <div class="info-val">${nombreEmpresa}</div>
                <div style="color: #64748B; margin-top: 2px;">Atn: ${nombreEncargado}</div>
                <div style="color: #64748B; font-size: 12px; margin-top: 2px;">Sector: <strong>${sectorLabel}</strong></div>
            </div>
            <div>
                <div class="info-title">Ubicación y Contacto</div>
                <div class="info-val">📍 ${ciudad}</div>
                <div style="color: #64748B; margin-top: 2px;">📱 WhatsApp: ${whatsapp}</div>
                <div style="color: #64748B; font-size: 12px; margin-top: 2px;">✉️ Email: ${email}</div>
            </div>
        </div>

        <div class="savings-hero">
            <h3>Ahorro Estimado Directo de Fábrica</h3>
            <div class="amount">$${Number(ahorroMes).toLocaleString('es-CO')} / mes</div>
            <div class="sub">Un ahorro del <strong>${ahorroPct}%</strong> equivalente a <strong>$${Number(ahorroAnual).toLocaleString('es-CO')} COP al año</strong></div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Producto Recomendado</th>
                    <th style="text-align: center;">Presentación</th>
                    <th style="text-align: center;">Volumen</th>
                    <th style="text-align: right;">Precio Mercado</th>
                    <th style="text-align: right;">Precio Fábrica</th>
                    <th style="text-align: right;">Ahorro Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="terms-box">
            <strong>Condiciones Comerciales Biocambio360:</strong><br>
            • Precios netos directo de fábrica sin intermediarios.<br>
            • Despachos en Soacha, Bogotá y municipios de Cundinamarca.<br>
            • Garantía total de rendimiento industrial concentrado y Fichas Técnicas bajo norma.<br>
            • Asesoría técnica sin costo para dosificación y mezclas óptimas.
        </div>

        <button onclick="window.print()" class="print-btn no-print">🖨️ IMPRIMIR / GUARDAR COMO PDF</button>
    </div>
</body>
</html>
        `;

        return new Response(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
    } catch (error: any) {
        console.error('Error generating PDF proposal HTML:', error);
        return NextResponse.json({ error: 'Error al generar la cotización' }, { status: 500 });
    }
}
