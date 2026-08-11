import { NextResponse } from 'next/server';

/**
 * GET /api/notifications/test-email
 * Sends a test email via Brevo and returns the full API response for debugging.
 * Only use this in development — remove before going to full production.
 */
export async function GET() {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'info@biocambio360.com';
    const adminEmail = process.env.ADMIN_EMAIL || 'thinktic.thinktic@gmail.com';

    if (!apiKey) {
        return NextResponse.json({ error: 'BREVO_API_KEY not set in environment' }, { status: 500 });
    }

    const payload = {
        sender: { name: 'Biocambio360 Test', email: fromEmail },
        to: [{ email: adminEmail }],
        subject: '🧪 Test Email Biocambio360 — ' + new Date().toLocaleString('es-CO'),
        htmlContent: '<h1>¡Si ves esto, Brevo funciona! ✅</h1><p>Email enviado desde biocambio360.com</p>',
    };

    try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await res.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        return NextResponse.json({
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            brevoResponse: responseData,
            config: {
                fromEmail,
                toEmail: adminEmail,
                apiKeyPrefix: apiKey.slice(0, 12) + '...',
            },
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Fetch to Brevo failed',
            message: error.message,
        }, { status: 500 });
    }
}
