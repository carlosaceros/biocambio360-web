/**
 * API Route: POST /api/inbox/bulk-reminder
 * Sends bulk WhatsApp template messages to replenishment customers.
 * Rate-limited to ~50 messages/minute (Meta Tier 1).
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB, getAdminAuth } from '@/lib/firebase-admin';
import { sendBulkTemplateMessages } from '@/lib/whatsapp-service';
import { FieldValue } from 'firebase-admin/firestore';

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
        phoneId,
        templateName,
        templateLanguage = 'es',
        templateType = 'marketing', // 'marketing' | 'utility'
        dryRun = false, // if true, only returns cost estimate without sending
    } = body;

    if (!customerIds?.length || !phoneId || !templateName) {
        return NextResponse.json(
            { error: 'customerIds, phoneId, and templateName are required' },
            { status: 400 }
        );
    }

    const db = getAdminDB();

    // Fetch customer records from replenishment collection
    const customers: Array<{ id: string; phone: string; name: string }> = [];
    const customerErrors: Array<{ customerId: string; phone: string; error: string }> = [];

    for (const cid of customerIds as string[]) {
        const snap = await db.collection('customer_replenishments').doc(cid).get();
        if (!snap.exists) {
            customerErrors.push({ customerId: cid, phone: '', error: 'Not found in replenishment records' });
            continue;
        }
        const data = snap.data()!;
        const phone = (data.customerPhone as string ?? '').replace(/\D/g, '');
        if (!phone || phone.length < 10) {
            customerErrors.push({ customerId: cid, phone, error: 'Invalid phone number' });
            continue;
        }
        customers.push({ id: cid, phone: `57${phone}`, name: data.customerName ?? '' });
    }

    const total = customers.length;
    const costPerMsg = templateType === 'marketing' ? MARKETING_COST_USD : UTILITY_COST_USD;
    const estimatedCostUsd = Number((total * costPerMsg).toFixed(4));

    // Dry run: return estimate without sending
    if (dryRun) {
        return NextResponse.json({
            dryRun: true,
            total,
            skipped: customerErrors.length,
            estimatedCostUsd,
            costPerMsg,
            customers: customers.map(c => ({ id: c.id, phone: c.phone, name: c.name })),
            errors: customerErrors,
        });
    }

    // Send bulk messages
    const recipients = customers.map(c => ({ phone: c.phone }));
    const { sent, failed, results } = await sendBulkTemplateMessages(
        phoneId,
        recipients,
        templateName,
        templateLanguage
    );

    // Update lastReminderSentAt in Firestore for successful sends
    const now = FieldValue.serverTimestamp();
    for (let i = 0; i < results.length; i++) {
        if (results[i].success && customers[i]) {
            await db.collection('customer_replenishments').doc(customers[i].id).update({
                lastReminderSentAt: now,
                lastWhatsappReminderAt: now,
                lastWhatsappReminderTemplate: templateName,
            });
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
