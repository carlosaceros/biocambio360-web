/**
 * GET /api/admin/capacitacion
 * Sirve el HTML del mapa mental de capacitación (carpeta `capacitacion/` en la raíz del repo,
 * fuera de `src/` y `public/` a propósito) SOLO a usuarios autenticados con permiso: Fernando,
 * Diego o rol superadmin. No es un archivo estático público — sin token válido, no responde nada.
 * El CSS, el JS y el logo se incrustan en un único HTML para que el cliente lo cargue de una vez
 * vía iframe srcDoc, sin exponer rutas estáticas propias para esos archivos.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const ALLOWED_EMAILS = new Set(['fernando@biocambio360.com', 'diego@biocambio360.com']);
// Cuenta raíz del sistema (ver isRootAccount en src/lib/auth-context.tsx): es superadmin aunque no
// tenga documento propio en `admin_users` — sin este caso especial, esta cuenta queda fuera.
const ROOT_ACCOUNT_EMAIL = 'thinktic.thinktic@gmail.com';

export async function GET(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { uid: string; email?: string };
    try {
        decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = (decoded.email || '').toLowerCase();
    let isSuperAdmin = email === ROOT_ACCOUNT_EMAIL;
    try {
        const snap = await getAdminDB().collection('admin_users').doc(email).get();
        isSuperAdmin = isSuperAdmin || (snap.exists && snap.data()?.rol === 'superadmin');
    } catch {
        // si falla la consulta, seguimos: el chequeo por email explícito abajo igual aplica
    }

    if (!ALLOWED_EMAILS.has(email) && !isSuperAdmin) {
        return NextResponse.json({ error: 'No tienes permiso para ver este material' }, { status: 403 });
    }

    try {
        const dir = join(process.cwd(), 'capacitacion');
        const html = readFileSync(join(dir, 'index.html'), 'utf-8');
        const css = readFileSync(join(dir, 'styles.css'), 'utf-8');
        const js = readFileSync(join(dir, 'mapa.js'), 'utf-8');
        const logoBase64 = readFileSync(join(dir, 'logo-biocambio360.png')).toString('base64');
        const logoDataUri = `data:image/png;base64,${logoBase64}`;

        const inlined = html
            .replace(
                /<link rel="stylesheet" href="styles\.css">/,
                `<style>${css.replaceAll('logo-biocambio360.png', logoDataUri)}</style>`
            )
            .replace(
                /<script src="mapa\.js"><\/script>/,
                `<script>${js}</script>`
            )
            .replace(/src="logo-biocambio360\.png"/, `src="${logoDataUri}"`);

        return NextResponse.json({ html: inlined });
    } catch (err) {
        console.error('[api/admin/capacitacion] Error leyendo el material:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'No se pudo cargar el material' }, { status: 500 });
    }
}
