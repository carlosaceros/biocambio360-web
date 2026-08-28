import { NextRequest, NextResponse } from 'next/server';
import { sendCapiEvent, CapiEvent } from '@/lib/meta-capi';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            event_name,
            custom_data,
            event_id,
            email,
            phone,
            name,
            city,
            url,
        } = body;

        if (!event_name) {
            return NextResponse.json({ ok: false, error: 'event_name is required' }, { status: 400 });
        }

        // Split name into first and last name if provided
        let fn: string | undefined;
        let ln: string | undefined;
        if (name && typeof name === 'string') {
            const parts = name.trim().split(/\s+/);
            fn = parts[0];
            if (parts.length > 1) {
                ln = parts.slice(1).join(' ');
            }
        }

        const forwardedFor = req.headers.get('x-forwarded-for');
        const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || '');
        const userAgent = req.headers.get('user-agent') || '';
        const refererUrl = url || req.headers.get('referer') || 'https://www.biocambio360.com';

        const event: CapiEvent = {
            event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: refererUrl,
            event_id: event_id || crypto.randomUUID(),
            action_source: 'website',
            user_data: {
                em: email || undefined,
                ph: phone || undefined,
                fn,
                ln,
                ct: city || undefined,
                country: 'co',
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent || undefined,
                fbc: req.cookies.get('_fbc')?.value,
                fbp: req.cookies.get('_fbp')?.value,
            },
            custom_data: {
                currency: 'COP',
                ...custom_data,
            },
        };

        const result = await sendCapiEvent([event]);
        return NextResponse.json({ ok: true, result });
    } catch (err: any) {
        console.error('[API /api/events] Error processing event:', err);
        return NextResponse.json({ ok: false, error: err?.message || 'INTERNAL_ERROR' }, { status: 500 });
    }
}
