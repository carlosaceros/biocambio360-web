/**
 * Reverse geocoding for WhatsApp location pins (OpenStreetMap Nominatim, free, ~1 request per
 * conversation turn). Fails soft: on any error the pin is still usable through its map link.
 */

export interface GeoResult {
    address: string;
    city: string;
}

export const mapsLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`,
            { headers: { 'User-Agent': 'Biocambio360-Inbox/1.0 (tiendavirtual@biocambio360.com)' }, signal: controller.signal }
        );
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = (await res.json()) as { address?: Record<string, string> };
        const a = data.address ?? {};
        const street = [a.road, a.house_number].filter(Boolean).join(' ');
        const area = [a.neighbourhood, a.suburb, a.quarter].find(x => x && !/^UPZ/i.test(x)) ?? '';
        const city = (a.city || a.town || a.municipality || a.village || a.county || '').replace(/\s+ciudad$/i, '');
        const address = [street, area].filter(Boolean).join(', ');
        if (!address && !city) return null;
        return { address, city };
    } catch {
        return null;
    }
}
