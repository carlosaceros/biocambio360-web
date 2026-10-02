'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Los bundlers (webpack/turbopack) rompen las rutas por defecto de los íconos de Leaflet -- fix estándar.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface CheckoutMapProps {
    lat: number;
    lng: number;
}

// Recentra el mapa cuando cambian las coordenadas (ej. el cliente ajusta la dirección)
function Recenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
}

export default function CheckoutMap({ lat, lng }: CheckoutMapProps) {
    return (
        <div className="rounded-xl overflow-hidden border border-gray-200 h-48 w-full">
            <MapContainer
                center={[lat, lng]}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker position={[lat, lng]} />
                <Recenter lat={lat} lng={lng} />
            </MapContainer>
        </div>
    );
}
