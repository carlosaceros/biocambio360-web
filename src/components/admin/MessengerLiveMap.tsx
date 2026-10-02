'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToMessengerLocations, MessengerLocation } from '@/lib/messenger-location-service';

// Mismo fix de íconos que CheckoutMap.tsx (los bundlers rompen las rutas por defecto de Leaflet).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BOGOTA_CENTER: [number, number] = [4.6534, -74.0836];

function minutesAgo(updatedAt: { toMillis?: () => number; seconds?: number } | null | undefined): number | null {
    if (!updatedAt) return null;
    const ms = typeof updatedAt.toMillis === 'function' ? updatedAt.toMillis() : (updatedAt.seconds || 0) * 1000;
    if (!ms) return null;
    return Math.round((Date.now() - ms) / 60000);
}

export default function MessengerLiveMap() {
    const [locations, setLocations] = useState<MessengerLocation[]>([]);

    useEffect(() => subscribeToMessengerLocations(setLocations), []);

    return (
        <div className="space-y-2">
            <div className="rounded-xl overflow-hidden border border-gray-200 h-[480px] w-full">
                <MapContainer center={BOGOTA_CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {locations.map((loc) => {
                        const ago = minutesAgo(loc.updatedAt as unknown as { toMillis?: () => number; seconds?: number });
                        const stale = ago !== null && ago > 15;
                        return (
                            <Marker key={loc.messengerId} position={[loc.lat, loc.lng]}>
                                <Popup>
                                    <strong>{loc.messengerNombre}</strong>
                                    <br />
                                    {ago !== null ? (stale ? `⚠️ Sin señal hace ${ago} min` : `Actualizado hace ${ago} min`) : 'Sin datos de tiempo'}
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
            {locations.length === 0 && (
                <p className="text-xs text-gray-400 text-center">
                    Ningún mensajero está reportando ubicación ahora mismo (solo se reporta durante el turno configurado, con su consentimiento).
                </p>
            )}
        </div>
    );
}
