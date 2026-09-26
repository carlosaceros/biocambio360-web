/**
 * API Route: POST /api/inbox/bulk-reminder
 * Sends bulk WhatsApp template messages to replenishment customers.
 * Rate-limited to ~50 messages/minute (Meta Tier 1).
 */

export const runtime = 'nodejs';

import { REMINDER_TEMPLATE_NAME, reminderComponents, reminderProduct } from '@/lib/reminder-template';
import { buildConversationId } from '@/lib/inbox-service';
import { REMINDER_PHONE_ID, REMINDER_WABA_ID } from '@/lib/whatsapp-sender';
import { createReminderCart, FALLBACK_BUTTON_TOKEN } from '@/lib/reminder-cart';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB, getAdminAuth } from '@/lib/firebase-admin';
import { sendBulkTemplateMessages, findTemplate } from '@/lib/whatsapp-service';
import { FieldValue } from 'firebase-admin/firestore';
import { isOptedOut } from '@/lib/wa-optout';

// Cost estimate per marketing conversation (Colombia +57) in USD
const MARKETING_COST_USD = 0.0125;
const UTILITY_COST_USD = 0.0008;

export async function POST(req: NextRequest) {
    // Auth
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { uid: string };
    try {
        decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const {
        customerIds,
        phoneId: requestedPhoneId,
        templateName,
        templateLanguage = 'es',
        templateType = 'marketing', // 'marketing' | 'utility'
        dryRun = false, // if true, only returns cost estimate without sending
        customers: provided, // records computed by the page (they have no Firestore document until a reminder is sent)
    } = body;

    // The replenishment template is sent from the reminder line (its templates live in that line's account)
    const isReminder = templateName === REMINDER_TEMPLATE_NAME;
    const phoneId: string = isReminder ? REMINDER_PHONE_ID : requestedPhoneId;

    if (!customerIds?.length || !phoneId || !templateName) {
        return NextResponse.json(
            { error: 'customerIds, phoneId, and templateName are required' },
            { status: 400 }
        );
    }

    const db = getAdminDB();

    // Fetch customer records from replenishment collection
    const customers: Array<{ id: string; phone: string; name: string; itemsSummary: string; email: string; city: string; lastOrderId: string }> = [];
    const customerErrors: Array<{ customerId: string; phone: string; error: string }> = [];

    const str = (v: unknown, max = 300) => String(v ?? '').slice(0, max);
    const providedById = new Map<string, Record<string, unknown>>(
        (Array.isArray(provided) ? provided : []).map((c: Record<string, unknown>) => [str(c?.id, 80), c] as [string, Record<string, unknown>])
    );
    for (const cid of customerIds as string[]) {
        const fromPage = providedById.get(cid);
        let data: FirebaseFirestore.DocumentData;
        if (fromPage) {
            data = {
                customerPhone: str(fromPage.customerPhone, 30),
                customerName: str(fromPage.customerName, 120),
                itemsSummary: str(fromPage.itemsSummary, 400),
                customerEmail: str(fromPage.customerEmail, 120),
                customerCity: str(fromPage.customerCity, 80),
                lastOrderId: str(fromPage.lastOrderId, 80),
            };
        } else {
            const snap = await db.collection('customer_replenishments').doc(cid).get();
            if (!snap.exists) {
                customerErrors.push({ customerId: cid, phone: '', error: 'Not found in replenishment records' });
                continue;
            }
            data = snap.data()!;
        }
        const phone = (data.customerPhone as string ?? '').replace(/\D/g, '');
        if (!phone || phone.length < 10) {
            customerErrors.push({ customerId: cid, phone, error: 'Invalid phone number' });
            continue;
        }
        if (await isOptedOut(`57${phone.slice(-10)}`)) {
            customerErrors.push({ customerId: cid, phone, error: 'El cliente pidió no recibir promociones' });
            continue;
        }
        customers.push({ id: cid, phone: `57${phone.slice(-10)}`, name: data.customerName ?? '', itemsSummary: data.itemsSummary ?? '', email: data.customerEmail ?? '', city: data.customerCity ?? '', lastOrderId: data.lastOrderId ?? '' });
    }

    const total = customers.length;
    const costPerMsg = templateType === 'marketing' ? MARKETING_COST_USD : UTILITY_COST_USD;
    const estimatedCostUsd = Number((total * costPerMsg).toFixed(4));

    // Dry run: return estimate without sending
    if (dryRun) {
        const found = await findTemplate(templateName, isReminder ? REMINDER_WABA_ID : undefined).catch(() => []);
        return NextResponse.json({
            dryRun: true,
            template: { name: templateName, found: found.length > 0, languages: found.map(f => `${f.language} (${f.status})`) },
            total,
            skipped: customerErrors.length,
            estimatedCostUsd,
            costPerMsg,
            customers: customers.map(c => ({ id: c.id, phone: c.phone, name: c.name })),
            errors: customerErrors,
        });
    }

    // Send bulk messages
    // The reminder template carries the customer's first name and last purchase as variables
    // and a pre-built cart (last order + their data) behind the "Pedir en la web" button
    const recipients: Array<{ phone: string; components?: unknown[] }> = [];
    for (const c of customers) {
        if (templateName !== REMINDER_TEMPLATE_NAME) {
            recipients.push({ phone: c.phone });
            continue;
        }
        const token = await createReminderCart({ name: c.name, email: c.email, phone: c.phone.slice(-10), city: c.city, lastOrderId: c.lastOrderId });
        recipients.push({ phone: c.phone, components: reminderComponents(c.name, c.itemsSummary, token ?? FALLBACK_BUTTON_TOKEN) });
    }
    const { sent, failed, results } = await sendBulkTemplateMessages(
        phoneId,
        recipients,
        templateName,
        templateLanguage
    );

    // Every delivered reminder is recorded in the inbox, so the customer's reply lands in the same chat
    const reminderTag = templateName === REMINDER_TEMPLATE_NAME ? 'reabastecimiento' : null;
    for (let i = 0; i < results.length; i++) {
        if (!results[i].success || !customers[i]) continue;
        try {
            const c = customers[i];
            const convRef = db.collection('conversations').doc(buildConversationId('whatsapp', phoneId, c.phone));
            const existing = await convRef.get();
            const preview = `📋 Plantilla: ${templateName}${c.itemsSummary ? ` · ${reminderProduct(c.itemsSummary)}` : ''}`;
            if (existing.exists) {
                await convRef.update({ lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), ...(reminderTag ? { tags: FieldValue.arrayUnion(reminderTag) } : {}) });
            } else {
                await convRef.set({
                    channel: 'whatsapp', phoneId,
                    accountKey: phoneId === process.env.WHATSAPP_PHONE_ID_LIMPIEZA ? 'totalLimpieza' : phoneId === process.env.WHATSAPP_PHONE_ID_BIOCAMBIO ? 'biocambio360' : null,
                    contactPhone: c.phone, contactUserId: null, contactName: c.name || `+${c.phone}`,
                    lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp(), unreadCount: 0, status: 'abierto', assignedTo: null,
                    tags: reminderTag ? [reminderTag] : [], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
                });
            }
            await convRef.collection('messages').add({
                direction: 'outbound', type: 'template', content: preview, templateName,
                metaMessageId: results[i].messageId ?? 'unknown', agentUid: decoded.uid, agentName: 'Recordatorio de reabastecimiento',
                status: 'sent', timestamp: FieldValue.serverTimestamp(),
            });
        } catch (err) {
            console.warn('[bulk-reminder] Could not record the message in the inbox:', err instanceof Error ? err.message : err);
        }
    }

    // Update lastReminderSentAt in Firestore for successful sends
    const now = FieldValue.serverTimestamp();
    for (let i = 0; i < results.length; i++) {
        if (results[i].success && customers[i]) {
            await db.collection('customer_replenishments').doc(customers[i].id).set({
                lastReminderSentAt: new Date().toISOString(),
                lastWhatsappReminderAt: new Date().toISOString(),
                lastWhatsappReminderTemplate: templateName,
            }, { merge: true });
        }
    }

    // Log the bulk send event
    await db.collection('bulk_reminder_logs').add({
        sentBy: decoded.uid,
        phoneId,
        templateName,
        templateType,
        total,
        sent,
        failed,
        skipped: customerErrors.length,
        estimatedCostUsd: Number((sent * costPerMsg).toFixed(4)),
        createdAt: now,
    });

    return NextResponse.json({
        success: true,
        total,
        sent,
        failed,
        skipped: customerErrors.length,
        estimatedCostUsd: Number((sent * costPerMsg).toFixed(4)),
        results,
        errors: customerErrors,
    });
}

/** GET /api/inbox/bulk-reminder — returns history of bulk sends */
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
    const snap = await db
        .collection('bulk_reminder_logs')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ logs });
}
