/**
 * POST /api/envios/importar-reporte  (multipart: file = "Envíos Completos" export from the 99 Envíos panel)
 *   dryRun=1 → preview only. Marks orders as delivered / not delivered from the real carrier status.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireStaff } from '@/lib/ai-training-auth';
import { syncShipmentStatuses, type ShipmentStatusRow } from '@/lib/shipping-sync';

const GUIDE_COLS = ['numero_de_guia', 'numero_guia', 'guia', 'guía'];
const STATUS_COLS = ['estado_del_envio', 'estado', 'status'];
const CARRIER_COLS = ['transportadora_nombre', 'transportadora'];
const PHONE_COLS = ['telefono_destinatario', 'telefono'];

function cellText(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object' && 'text' in (value as object)) return String((value as { text: unknown }).text);
    if (typeof value === 'object' && 'result' in (value as object)) return String((value as { result: unknown }).result);
    return String(value).trim();
}

export async function POST(req: NextRequest) {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Adjunta el archivo Excel del reporte de 99 Envíos.' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'El archivo supera 4 MB.' }, { status: 413 });

    const dryRun = form?.get('dryRun') !== '0';

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) return NextResponse.json({ error: 'El Excel no tiene hojas.' }, { status: 400 });

        const headerRow = sheet.getRow(1);
        const headers: Record<string, number> = {};
        headerRow.eachCell((cell, col) => { headers[cellText(cell.value).toLowerCase()] = col; });
        const pick = (names: string[]) => names.map(n => headers[n]).find(Boolean);
        const guideCol = pick(GUIDE_COLS);
        const statusCol = pick(STATUS_COLS);
        const carrierCol = pick(CARRIER_COLS);
        const phoneCol = pick(PHONE_COLS);
        if (!guideCol || !statusCol) {
            return NextResponse.json({ error: 'No encuentro las columnas "numero_de_guia" y "estado_del_envio". Usa el reporte "Envíos Completos" del panel de 99 Envíos.' }, { status: 400 });
        }

        const rows: ShipmentStatusRow[] = [];
        sheet.eachRow((row, index) => {
            if (index === 1) return;
            const guia = cellText(row.getCell(guideCol).value).replace(/\D/g, '');
            const estado = cellText(row.getCell(statusCol).value);
            if (guia && estado) rows.push({
                guia,
                estado,
                transportadora: carrierCol ? cellText(row.getCell(carrierCol).value) : undefined,
                telefono: phoneCol ? cellText(row.getCell(phoneCol).value) : undefined,
            });
        });

        const result = await syncShipmentStatuses(rows, { dryRun, source: 'importacion_99envios', actor: staff.email });
        return NextResponse.json({ dryRun, ...result });
    } catch (err) {
        console.error('[importar-reporte] Error:', err);
        return NextResponse.json({ error: 'No pude leer el archivo. Verifica que sea el .xlsx original del panel.' }, { status: 400 });
    }
}
