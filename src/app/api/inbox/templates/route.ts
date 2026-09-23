/**
 * API Route: GET /api/inbox/templates
 * Fetches approved WhatsApp message templates from Meta Graph API.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const wabaId = searchParams.get('wabaId') ?? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!wabaId) {
        return NextResponse.json({ error: 'wabaId is required' }, { status: 400 });
    }

    const token = process.env.WHATSAPP_PERMANENT_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'WHATSAPP_PERMANENT_TOKEN not configured' }, { status: 500 });
    }

    try {
        const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?fields=id,name,status,language,category,components&limit=100&status=APPROVED`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            next: { revalidate: 300 }, // cache 5 min
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.error?.message ?? 'Meta API error');
        }

        return NextResponse.json({ templates: data.data ?? [] });
    } catch (err: any) {
        console.error('[inbox/templates] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 502 });
    }
}
