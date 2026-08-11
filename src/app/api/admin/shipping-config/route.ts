import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

// --- Tipos ---
export interface ShippingZone {
    id: string;
    nombre: string;
    descripcion?: string;
    cobertura: 'activa' | 'sin_cobertura';
    precio: number; // usado si cobertura = 'activa'
    ciudades: string[]; // códigos DANE 8 dígitos
    color?: string; // para la UI
}

export interface ShippingConfig {
    envioGratis: number; // subtotal mínimo para envío gratis
    precioDefault: number; // precio si la ciudad no está en ninguna zona
    zonas: ShippingZone[];
    updatedAt?: string;
}

const DEFAULT_CONFIG: ShippingConfig = {
    envioGratis: 100000,
    precioDefault: 18000,
    zonas: [
        {
            id: 'zone_bogota',
            nombre: 'Bogotá y área metropolitana',
            cobertura: 'activa',
            precio: 10000,
            ciudades: ['11001000'],
            color: '#3B82F6',
        },
        {
            id: 'zone_ciudades_principales',
            nombre: 'Ciudades principales',
            cobertura: 'activa',
            precio: 14000,
            ciudades: ['05001000', '76001000', '08001000', '13001000', '68001000'],
            color: '#10B981',
        },
        {
            id: 'zone_default',
            nombre: 'Resto del país',
            cobertura: 'activa',
            precio: 18000,
            ciudades: [],
            color: '#F59E0B',
        },
    ],
};

const CONFIG_DOC_PATH = 'admin_config/shipping';

/**
 * GET /api/admin/shipping-config
 * Returns the current shipping configuration from Firestore.
 */
export async function GET() {
    try {
        const db = getAdminDB();
        const doc = await db.doc(CONFIG_DOC_PATH).get();
        const configData = doc.exists ? doc.data() : DEFAULT_CONFIG;

        // Fetch audit logs
        let logs: any[] = [];
        try {
            const logsSnapshot = await db.collection('shipping_audit_logs')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e: any) {
            console.warn('[shipping-config] No logs found:', e.message);
        }

        return NextResponse.json({
            ...configData,
            logs,
        });
    } catch (e: any) {
        console.error('[shipping-config GET] Error:', e);
        return NextResponse.json(DEFAULT_CONFIG);
    }
}

/**
 * POST /api/admin/shipping-config
 * Saves updated shipping configuration to Firestore.
 */
export async function POST(request: Request) {
    try {
        const body: ShippingConfig = await request.json();

        // Basic validation
        if (typeof body.envioGratis !== 'number' || typeof body.precioDefault !== 'number') {
            return NextResponse.json({ error: 'envioGratis y precioDefault son requeridos' }, { status: 400 });
        }

        const configToSave: ShippingConfig = {
            envioGratis: body.envioGratis,
            precioDefault: body.precioDefault,
            zonas: (body.zonas || []).map((z, i) => ({
                id: z.id || `zone_${Date.now()}_${i}`,
                nombre: z.nombre || 'Sin nombre',
                descripcion: z.descripcion || '',
                cobertura: z.cobertura === 'sin_cobertura' ? 'sin_cobertura' : 'activa',
                precio: typeof z.precio === 'number' ? z.precio : 18000,
                ciudades: Array.isArray(z.ciudades) ? z.ciudades : [],
                color: z.color || '#6B7280',
            })),
            updatedAt: new Date().toISOString(),
        };

        const db = getAdminDB();
        await db.doc(CONFIG_DOC_PATH).set(configToSave);

        return NextResponse.json({ success: true, config: configToSave });
    } catch (error: any) {
        console.error('[ShippingConfig] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
