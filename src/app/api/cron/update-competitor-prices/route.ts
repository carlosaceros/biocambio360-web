import { NextResponse } from 'next/server';
import { adminGetAllProducts, adminSaveProduct } from '@/lib/products-admin';
import { getMarketPricesForProduct } from '@/lib/pricing-service';

export const maxDuration = 60; // Allow Vercel to run this for up to 60 seconds

export async function GET(request: Request) {
    try {
        // Enforce basic auth or secret token for cron (optional but recommended)
        const authHeader = request.headers.get('authorization');
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('Starting automated competitor pricing update...');
        
        // 1. Fetch all products from Firestore
        const products = await adminGetAllProducts();
        const updatedProducts = [];

        for (const product of products) {
            console.log(`Analyzing prices for ${product.nombre}...`);
            
            // 2. Query IA for new prices
            const extractedPrices = await getMarketPricesForProduct(product);
            
            if (extractedPrices.length > 0) {
                const newCompetidorPromedio = { ...product.competidorPromedio };

                extractedPrices.forEach((priceData) => {
                    // Make sure it matches our sizes
                    if (priceData.size in newCompetidorPromedio) {
                        newCompetidorPromedio[priceData.size as keyof typeof newCompetidorPromedio] = priceData.averagePriceCOP;
                    }
                });

                // Update product in memory
                product.competidorPromedio = newCompetidorPromedio;
                
                // 3. Save updated product to Firestore
                await adminSaveProduct(product);
                updatedProducts.push(product.id);
                console.log(`Successfully updated ${product.id}`);
            } else {
                console.warn(`Could not extract prices for ${product.id}`);
            }
            
            // Artificial delay to avoid rate limits on Serper/Gemini
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedProducts.length} products`,
            updatedProducts
        });

    } catch (error: any) {
        console.error('Error during cron execution:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
