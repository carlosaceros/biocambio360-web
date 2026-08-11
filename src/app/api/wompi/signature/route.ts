import { NextResponse } from 'next/server';
import { generateIntegritySignature } from '@/lib/wompi-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { reference, amountInCents, currency } = body;

        if (!reference || !amountInCents || !currency) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const signature = generateIntegritySignature({
            reference,
            amountInCents,
            currency
        });

        return NextResponse.json({ signature });
    } catch (error) {
        console.error('Error generating Wompi signature:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
