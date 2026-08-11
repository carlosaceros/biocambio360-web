import { NextResponse } from 'next/server';
import { adminSeedProducts } from '@/lib/products-admin';

export const dynamic = 'force-dynamic';

// Endpoint to sync the product catalog from code to Firestore (Admin SDK)
// Call: GET /api/admin/seed-products
export async function GET() {
    try {
        const result = await adminSeedProducts();
        return NextResponse.json({ success: true, message: 'Productos sincronizados con Firestore', ...result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }
}
