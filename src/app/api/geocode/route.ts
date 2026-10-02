/**
 * GET /api/geocode?direccion=...&ciudad=...&departamento=...
 * Geocodificación directa para el mapa en vivo del checkout. Proxied server-side (en vez de llamar
 * Nominatim directo desde el navegador) para poder mandar un User-Agent identificable -- los
 * navegadores ignoran ese header si se intenta setear desde fetch() del lado del cliente -- y para
 * mantener el mismo patrón que reverseGeocode (usado server-side en ai-order-agent.ts).
 * Público, sin auth: no expone ni modifica datos de clientes, es un passthrough de geocoding.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { forwardGeocode } from '@/lib/geocode';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const direccion = searchParams.get('direccion') || '';
    const ciudad = searchParams.get('ciudad') || undefined;
    const departamento = searchParams.get('departamento') || undefined;

    if (!direccion.trim()) {
        return NextResponse.json({ error: 'Falta la dirección' }, { status: 400 });
    }

    const result = await forwardGeocode(direccion, ciudad, departamento);
    if (!result) {
        return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, lat: result.lat, lng: result.lng });
}
