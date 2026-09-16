import { NextResponse } from 'next/server';
import { generateMerchantFeedXml } from '@/lib/merchant-feed-generator';

export async function GET() {
    try {
        const xml = await generateMerchantFeedXml();
        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
            },
        });
    } catch (err: any) {
        console.error('[API/MerchantFeed] Error generating XML feed:', err);
        return new NextResponse('Error generating product feed', { status: 500 });
    }
}
