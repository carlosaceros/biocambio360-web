import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CUSTOMERS_MACRO_STATS, COMPACT_CUSTOMERS_TOP_INDEX } from '@/lib/integrated-customers-summary';
import { getAdminDB } from '@/lib/firebase-admin';

const KOMMO_FIELDS = ['kommoContactId', 'kommoLeadNota', 'kommoObservacion', 'kommoEtapa', 'kommoTipoCliente'] as const;

/**
 * El dataset base de esta ruta es un snapshot estático (integrated-customers-data.json,
 * generado en enero desde un export CSV de Kommo) -- NO la colección `customers` de Firestore.
 * La migración de Kommo por API (kommo-migrate-tags.ts, corrida en octubre) escribe directo a
 * Firestore, así que ese snapshot nunca la refleja: un cliente podía tener kommoLeadNota real
 * en Firestore y aun así no mostrar nada aquí. Se enriquece solo la página actual (máx. 200
 * docs) con una lectura en vivo, sin tocar el resto del pipeline (stats/búsqueda/paginación
 * siguen sobre el snapshot) -- una migración completa de esta pantalla a Firestore en vivo es
 * un cambio más grande, aparte.
 */
async function enrichWithLiveKommoData(items: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (items.length === 0) return items;
    try {
        const db = getAdminDB();
        const refs = items.map((c) => db.collection('customers').doc(String(c.id)));
        const snaps = await db.getAll(...refs);
        const kommoById = new Map<string, Record<string, unknown>>();
        snaps.forEach((snap) => {
            if (!snap.exists) return;
            const data = snap.data() as Record<string, unknown>;
            const kommoData: Record<string, unknown> = {};
            let hasAny = false;
            for (const field of KOMMO_FIELDS) {
                if (data[field]) {
                    kommoData[field] = data[field];
                    hasAny = true;
                }
            }
            if (hasAny) kommoById.set(snap.id, kommoData);
        });
        if (kommoById.size === 0) return items;
        return items.map((c) => {
            const kommo = kommoById.get(String(c.id));
            return kommo ? { ...c, ...kommo } : c;
        });
    } catch (err) {
        console.warn('[api/admin/customers] No se pudo enriquecer con datos de Kommo en vivo:', err);
        return items;
    }
}

export const dynamic = 'force-dynamic';

// Cache en memoria en el runtime de Node.js
let cachedCustomers: any[] | null = null;

function loadCustomersFromDisk(): any[] {
    if (cachedCustomers) return cachedCustomers;
    try {
        const filePath = path.join(process.cwd(), 'src', 'lib', 'integrated-customers-data.json');
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf-8');
            cachedCustomers = JSON.parse(fileData);
            return cachedCustomers || [];
        }
    } catch (err) {
        console.warn('[api/admin/customers] Error loading JSON dataset, using top index fallback:', err);
    }
    return COMPACT_CUSTOMERS_TOP_INDEX as any[];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
        const search = (searchParams.get('search') || '').trim().toLowerCase();
        const advisor = (searchParams.get('advisor') || 'all').trim();
        const stage = (searchParams.get('stage') || 'all').trim();
        const activeOnly = searchParams.get('activeOnly') === 'true';

        const allCustomers = loadCustomersFromDisk();

        // Filtrado en memoria ultra veloz
        let filtered = allCustomers;

        if (activeOnly) {
            filtered = filtered.filter(c => c.activo === true);
        }

        if (advisor !== 'all') {
            if (advisor === 'unassigned' || advisor === 'sin_asignar' || advisor === 'Libre') {
                filtered = filtered.filter(c => !c.asesorAsignado);
            } else {
                filtered = filtered.filter(c => 
                    c.asesorAsignado && c.asesorAsignado.toLowerCase() === advisor.toLowerCase()
                );
            }
        }

        if (stage !== 'all') {
            filtered = filtered.filter(c => c.stage === stage);
        }

        if (search) {
            filtered = filtered.filter(c => {
                const name = (c.nombre || '').toLowerCase();
                const phone = (c.celular || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const cedula = (c.cedula || '').toLowerCase();
                const city = (c.ciudad || '').toLowerCase();
                const tags = Array.isArray(c.etiquetas) ? c.etiquetas.join(' ').toLowerCase() : '';

                return (
                    name.includes(search) ||
                    phone.includes(search) ||
                    email.includes(search) ||
                    cedula.includes(search) ||
                    city.includes(search) ||
                    tags.includes(search)
                );
            });
        }

        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / limit) || 1;
        const offset = (page - 1) * limit;
        const paginatedItems = await enrichWithLiveKommoData(filtered.slice(offset, offset + limit));

        return NextResponse.json({
            customers: paginatedItems,
            totalCount,
            page,
            totalPages,
            limit,
            stats: CUSTOMERS_MACRO_STATS
        });
    } catch (error: any) {
        console.error('[api/admin/customers] Error:', error);
        return NextResponse.json(
            { error: 'Error al consultar catálogo de clientes', details: error?.message },
            { status: 500 }
        );
    }
}
