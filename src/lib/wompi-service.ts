import crypto from 'crypto';

interface WompiSignatureParams {
    reference: string;
    amountInCents: number;
    currency: string;
}

/**
 * Generates the integrity signature required by Wompi WebCheckout
 * Formula: SHA256(reference + amountInCents + currency + integritySecret)
 */
export function generateIntegritySignature({
    reference,
    amountInCents,
    currency
}: WompiSignatureParams): string {
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!integritySecret) {
        throw new Error('WOMPI_INTEGRITY_SECRET is not configured');
    }

    const stringToHash = `${reference}${amountInCents}${currency}${integritySecret}`;
    
    return crypto
        .createHash('sha256')
        .update(stringToHash)
        .digest('hex');
}

/**
 * Validates the signature received from Wompi Webhooks dynamically
 */
export function validateWebhookDynamicSignature(
    expectedChecksum: string,
    properties: string[], // e.g. ["transaction.id", "transaction.status", "transaction.amount_in_cents"]
    bodyData: any, // The body.data object
    timestamp: number | string
): boolean {
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

    if (!eventsSecret) {
        throw new Error('WOMPI_EVENTS_SECRET is not configured');
    }

    // Wompi calculates the hash by concatenating the values of the properties specified in the array
    let concatenatedValues = '';
    
    for (const propPath of properties) {
        // Split path like 'transaction.id' to get nested values from bodyData
        const parts = propPath.split('.');
        let value: any = bodyData;
        
        for (const part of parts) {
            if (value && value[part] !== undefined) {
                value = value[part];
            } else {
                value = ''; // Fallback if missing
                break;
            }
        }
        concatenatedValues += value.toString();
    }
    
    // Add timestamp and secret at the end as per Wompi docs
    concatenatedValues += timestamp.toString() + eventsSecret;
    
    const computedHash = crypto
        .createHash('sha256')
        .update(concatenatedValues)
        .digest('hex');

    return expectedChecksum === computedHash;
}
