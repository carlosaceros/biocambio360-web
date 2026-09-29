/**
 * API Route: /api/campanas/send
 * Envío masivo de plantillas de WhatsApp a una audiencia elegida por el asesor/coordinador
 * (segmento de Clientes o lista pegada a mano) — el equivalente mejorado a las "difusiones" de Kommo,
 * integrado con la bandeja unificada: cada envío queda registrado en la conversación del cliente.
 *
 * POST body:
 *   {
 *     phoneId: string,                 // línea de envío (Biocambio360 o Total Limpieza)
 *     wabaId: string,                  // cuenta de WhatsApp Business donde vive la plantilla
 *     templateName: string,
 *     templateLanguage: string,
 *     templateCategory: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
 *     recipients: Array<{ phone: string; nombre?: string }>,
 *     variableMapping: Array<{ index: number; source: 'nombre' | 'fixed'; value?: string }>,
 *     campaignName?: string,
 *     dryRun: boolean,
 *   }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendBulkTemplateMessages, findTemplate } from '@/lib/whatsapp-service';
import { buildConversationId } from '@/lib/inbox-service';
import { isOptedOut } from '@/lib/wa-optout';
import { WHATSAPP_ACCOUNTS, WhatsAppAccountKey } from '@/types/inbox';
import { REMINDER_WABA_ID } from '@/lib/whatsapp-sender';

// Costo estimado por conversación (Colombia +57), en USD — mismas tarifas usadas en bulk-reminder
const MARKETING_COST_USD = 0.0125;
const UTILITY_COST_USD = 0.0008;
const AUTH_COST_USD = 0.0135;

interface VariableMappingItem {
    index: number;
    source: 'nombre' | 'fixed';
    value?: string;
}

function costPerMessage(category: string): number {
    if (category === 'UTILITY') return UTILITY_COST_USD;
    if (category === 'AUTHENTICATION') return AUTH_COST_USD;
    return MARKETING_COST_USD;
}

function resolveLine(accountKey: WhatsAppAccountKey): { phoneId: string; wabaId: string } {
    if (accountKey === 'totalLimpieza') {
        return { phoneId: WHATSAPP_ACCOUNTS.totalLimpieza.phoneId, wabaId: REMINDER_WABA_ID };
    }
    return { phoneId: WHATSAPP_ACCOUNTS.biocambio360.phoneId, wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '' };
}

function buildComponents(nombre: string, mapping: VariableMappingItem[]): Array<{ type: string; parameters: Array<{ type: string; text: string }> }> | undefined {
    if (!mapping?.length) return undefined;
    const sorted = [...mapping].sort((a, b) => a.index - b.index);
    const parameters = sorted.map(m => ({
        type: 'text',
        text: m.source === 'nombre' ? (nombre || 'Cliente') : (m.value || ''),
    }));
    return [{ type: 'body', parameters }];
}

export async function POST(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { uid: string; email?: string };
    try {
        decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const {
        accountKey,
        templateName,
        templateLanguage = 'es',
        templateCategory = 'MARKETING',
        recipients,
        variableMapping = [],
        campaignName,
        dryRun = false,
    }: {
        accountKey: WhatsAppAccountKey;
        templateName: string;
        templateLanguage?: string;
        templateCategory?: string;
        recipients: Array<{ phone: string; nombre?: string }>;
        variableMapping?: VariableMappingItem[];
        campaignName?: string;
        dryRun?: boolean;
    } = body;

    if (!accountKey || !templateName || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: 'accountKey, templateName y recipients son obligatorios' }, { status: 400 });
    }
    const { phoneId, wabaId } = resolveLine(accountKey);
    if (recipients.length > 2000) {
        return NextResponse.json({ error: 'Máximo 2000 destinatarios por campaña. Divide la audiencia en varios envíos.' }, { status: 400 });
    }

    const db = getAdminDB();

    // Deduplicar y validar teléfonos; excluir a quienes pidieron no recibir promociones
    const seen = new Set<string>();
    const validRecipients: Array<{ phone: string; nombre: string }> = [];
    const skipped: Array<{ phone: string; reason: string }> = [];

    for (const r of recipients) {
        const digits = (r.phone || '').replace(/\D/g, '');
        const last10 = digits.slice(-10);
        if (last10.length !== 10) {
            skipped.push({ phone: r.phone || '', reason: 'Número inválido' });
            continue;
        }
        const waPhone = `57${last10}`;
        if (seen.has(waPhone)) continue;
        seen.add(waPhone);

        if (await isOptedOut(waPhone)) {
            skipped.push({ phone: waPhone, reason: 'El cliente pidió no recibir promociones' });
            continue;
        }
        validRecipients.push({ phone: waPhone, nombre: r.nombre || '' });
    }

    const total = validRecipients.length;
    const costPerMsg = costPerMessage(templateCategory);
    const estimatedCostUsd = Number((total * costPerMsg).toFixed(4));

    if (dryRun) {
        const found = wabaId ? await findTemplate(templateName, wabaId).catch(() => []) : [];
        return NextResponse.json({
            dryRun: true,
            template: { name: templateName, found: found.length > 0, languages: found.map(f => `${f.language} (${f.status})`) },
            total,
            skipped,
            estimatedCostUsd,
            costPerMsg,
        });
    }

    if (total === 0) {
        return NextResponse.json({ error: 'No quedó ningún destinatario válido para enviar', skipped }, { status: 400 });
    }

    const recipientsForSend = validRecipients.map(r => ({
        phone: r.phone,
        components: buildComponents(r.nombre, variableMapping),
    }));

    const { sent, failed, results } = await sendBulkTemplateMessages(phoneId, recipientsForSend, templateName, templateLanguage);

    // Cada envío queda registrado en la bandeja unificada: si el cliente responde, cae en el mismo chat
    const preview = `📢 Campaña: ${campaignName || templateName}`;
    for (let i = 0; i < results.length; i++) {
        if (!results[i].success) continue;
        const r = validRecipients[i];
        try {
            const convRef = db.collection('conversations').doc(buildConversationId('whatsapp', phoneId, r.phone));
            const existing = await convRef.get();
            if (existing.exists) {
                await convRef.update({
                    lastMessage: preview,
                    lastMessageAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    tags: FieldValue.arrayUnion('campana-whatsapp'),
                });
            } else {
                await convRef.set({
                    channel: 'whatsapp', phoneId, accountKey,
                    contactPhone: r.phone, contactUserId: null, contactName: r.nombre || `+${r.phone}`,
                    lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp(), unreadCount: 0, status: 'abierto', assignedTo: null,
                    tags: ['campana-whatsapp'], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
                });
            }
            await convRef.collection('messages').add({
                direction: 'outbound', type: 'template', content: preview, templateName,
                metaMessageId: results[i].messageId ?? 'unknown', agentUid: decoded.uid, agentName: `Campaña: ${campaignName || templateName}`,
                status: 'sent', timestamp: FieldValue.serverTimestamp(),
            });
        } catch (err) {
            console.warn('[campanas/send] No se pudo registrar el mensaje en la bandeja:', err instanceof Error ? err.message : err);
        }
    }

    await db.collection('campaign_logs').add({
        campaignName: campaignName || templateName,
        templateName,
        templateCategory,
        phoneId,
        accountKey,
        total,
        sent,
        failed,
        skippedCount: skipped.length,
        estimatedCostUsd: Number((sent * costPerMsg).toFixed(4)),
        sentBy: decoded.uid,
        sentByEmail: decoded.email || null,
        createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, total, sent, failed, skipped, estimatedCostUsd: Number((sent * costPerMsg).toFixed(4)), results });
}

/** GET /api/campanas/send — historial de campañas enviadas */
export async function GET(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDB();
    const snap = await db.collection('campaign_logs').orderBy('createdAt', 'desc').limit(30).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ logs });
}
