import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CUSTOMERS_MACRO_STATS, COMPACT_CUSTOMERS_TOP_INDEX } from '@/lib/integrated-customers-summary';

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
        const paginatedItems = filtered.slice(offset, offset + limit);

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
