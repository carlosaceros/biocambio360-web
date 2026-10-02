'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker, LeafletEvent } from 'leaflet';
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
    /** Si se pasa, el marcador se puede arrastrar -- el ajuste es siempre opcional, nunca bloquea el checkout. */
    onPositionChange?: (lat: number, lng: number) => void;
}

// Recentra el mapa cuando cambian las coordenadas (ej. el cliente ajusta la dirección escrita).
// No se dispara por un arrastre del marcador (eso lo maneja DraggableMarker localmente, sin
// tocar esta prop), así que arrastrar no "salta" de vuelta al centro.
function Recenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
}

function DraggableMarker({ lat, lng, onPositionChange }: { lat: number; lng: number; onPositionChange?: (lat: number, lng: number) => void }) {
    const markerRef = useRef<LeafletMarker | null>(null);

    return (
        <Marker
            position={[lat, lng]}
            draggable={!!onPositionChange}
            ref={markerRef}
            eventHandlers={{
                dragend: (e: LeafletEvent) => {
                    const marker = e.target as LeafletMarker;
                    const pos = marker.getLatLng();
                    onPositionChange?.(pos.lat, pos.lng);
                },
            }}
        />
    );
}

export default function CheckoutMap({ lat, lng, onPositionChange }: CheckoutMapProps) {
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
                <DraggableMarker lat={lat} lng={lng} onPositionChange={onPositionChange} />
                <Recenter lat={lat} lng={lng} />
            </MapContainer>
        </div>
    );
}
