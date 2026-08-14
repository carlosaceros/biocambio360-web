import { NextResponse } from 'next/server';
import { getProductById, saveProduct } from '@/lib/products-service';
import { getMarketPricesForProduct } from '@/lib/pricing-service';

export const maxDuration = 60; // Allow up to 60s for external API calls

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
        }

        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        console.log(`Buscando precios de mercado reales para: ${product.nombre}...`);

        // 1. Query Google Search Colombia + Gemini API for live prices
        const extractedPrices = await getMarketPricesForProduct(product);

        if (!extractedPrices || extractedPrices.length === 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'No se encontraron precios recientes en Google Search Colombia para este producto.' 
            }, { status: 404 });
        }

        // 2. Merge extracted market average into competidorPromedio
        const updatedCompetidorPromedio = { ...(product.competidorPromedio || {}) };
        extractedPrices.forEach((item) => {
            if (item.size && item.averagePriceCOP > 0) {
                updatedCompetidorPromedio[item.size] = Math.round(item.averagePriceCOP);
            }
        });

        const updatedProduct = {
            ...product,
            competidorPromedio: updatedCompetidorPromedio
        };

        // 3. Save to database
        await saveProduct(updatedProduct);

        return NextResponse.json({
            success: true,
            productId: product.id,
            competidorPromedio: updatedCompetidorPromedio,
            extractedPrices
        });

    } catch (error: any) {
        console.error('Error actualizando precios de competencia:', error);
        return NextResponse.json({
            error: error.message || 'Error interno al consultar precios de mercado'
        }, { status: 500 });
    }
}
