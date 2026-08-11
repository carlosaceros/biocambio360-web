import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';

/**
 * GET /api/envios/test
 * Diagnostic endpoint: tests login + quote against 99 Envíos API.
 */
export async function GET() {
    const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        hasCredentials: !!(process.env.ENV_99ENVIOS_EMAIL && process.env.ENV_99ENVIOS_PASSWORD),
    };

    // 1. Test login
    try {
        const loginRes = await fetch('https://integration1.99envios.app/api/integration/v1/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                email: process.env.ENV_99ENVIOS_EMAIL || '',
                password: process.env.ENV_99ENVIOS_PASSWORD || '',
            }),
        });

        const loginText = await loginRes.text();
        results.login = {
            status: loginRes.status,
            ok: loginRes.ok,
            body: loginText.length > 500 ? loginText.slice(0, 500) + '...' : loginText,
        };

        if (!loginRes.ok) {
            return NextResponse.json(results);
        }

        // Parse token
        const loginData = JSON.parse(loginText);
        results.login.hasToken = !!loginData.token;

    } catch (e: any) {
        results.login = { error: e.message };
        return NextResponse.json(results);
    }

    // 2. Test quote (Soacha → Bogotá, basic small package)
    try {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();

        const quote = await cotizarEnvio(
            '11001000',
            'BOGOTA, DISTRITO CAPITAL',
            50000,
            false,
        );

        results.quote = {
            ok: true,
            data: quote,
        };
    } catch (e: any) {
        results.quote = { ok: false, error: e.message };
    }

    return NextResponse.json(results);
}
