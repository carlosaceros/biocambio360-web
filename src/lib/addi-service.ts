/**
 * ADDI Payment & Credit Application Service
 * Integración oficial con la API v1 de Addi (https://api.addi.com)
 */

interface AddiTokenCache {
    token: string;
    expiresAt: number; // Unix timestamp in seconds
}

let cachedToken: AddiTokenCache | null = null;

/**
 * Obtiene o reutiliza el token OAuth 2.0 de Addi con caching en memoria
 */
export async function getAddiAccessToken(): Promise<string> {
    const clientId = process.env.ADDI_CLIENT_ID;
    const clientSecret = process.env.ADDI_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('ADDI_CLIENT_ID o ADDI_CLIENT_SECRET no están configurados en el entorno.');
    }

    const nowInSec = Math.floor(Date.now() / 1000);

    // Reutilizar token si aún tiene al menos 5 minutos de vigencia
    if (cachedToken && cachedToken.expiresAt > nowInSec + 300) {
        return cachedToken.token;
    }

    const response = await fetch('https://auth.addi.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            audience: 'https://api.addi.com',
            grant_type: 'client_credentials'
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de autenticación con ADDI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresIn = data.expires_in || 86400; // Por defecto 24 horas

    cachedToken = {
        token,
        expiresAt: nowInSec + expiresIn
    };

    return token;
}

export interface AddiApplicationCustomer {
    nombre: string;
    cedula: string;
    celular: string;
    email?: string;
    ciudad: string;
    direccion: string;
}

export interface AddiApplicationItem {
    nombre: string;
    sku: string;
    cantidad: number;
    price: number;
    imgFile?: string;
}

export interface CreateAddiApplicationParams {
    orderId: string;
    total: number;
    shippingCost: number;
    customer: AddiApplicationCustomer;
    items: AddiApplicationItem[];
    baseUrl?: string;
}

export interface AddiApplicationResult {
    redirectUrl: string;
    applicationId?: string;
    orderAttemptId: string;
}

/**
 * Crea una nueva solicitud de crédito en Addi (POST /v1/online-applications)
 * y captura la URL de redirección (HTTP 301 Location o cuerpo JSON).
 */
export async function createAddiApplication(
    params: CreateAddiApplicationParams
): Promise<AddiApplicationResult> {
    const token = await getAddiAccessToken();

    const host = params.baseUrl || (
        process.env.NEXT_PUBLIC_URL && !process.env.NEXT_PUBLIC_URL.includes('localhost')
            ? process.env.NEXT_PUBLIC_URL
            : 'https://biocambio360.com'
    );

    // Separar nombres y apellidos
    const rawName = (params.customer.nombre || '').trim();
    const nameParts = rawName.split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Biocambio';

    // Limpiar cédula y celular
    const cleanId = (params.customer.cedula || '').replace(/\D/g, '');
    let cleanPhone = (params.customer.celular || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('57') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(2);
    }

    const cleanAddress = (params.customer.direccion || 'Dirección de Entrega').trim();
    const cleanCity = (params.customer.ciudad || 'Bogotá').trim();

    // Unique attempt id to prevent Addi duplicate order rejections on retries
    const orderAttemptId = `${params.orderId}-att-${Date.now()}`;

    // Mapear productos
    const addiItems = params.items.map((item, idx) => {
        let pictureUrl = `${host}/images/products/detergente-multiusos.webp`;
        if (item.imgFile) {
            pictureUrl = item.imgFile.startsWith('http')
                ? item.imgFile
                : `${host}/images/products/${item.imgFile}`;
        }

        return {
            name: item.nombre || `Producto ${idx + 1}`,
            sku: item.sku || `item-${idx + 1}`,
            quantity: Math.max(1, Number(item.cantidad) || 1),
            unitPrice: `${Number(item.price).toFixed(1)}`,
            pictureUrl,
            category: 'Aseo y Limpieza'
        };
    });

    const payload = {
        orderId: orderAttemptId,
        totalAmount: `${Number(params.total).toFixed(1)}`,
        shippingAmount: `${Number(params.shippingCost || 0).toFixed(1)}`,
        currency: 'COP',
        client: {
            idType: 'CC',
            idNumber: cleanId,
            firstName,
            lastName,
            email: params.customer.email || 'ventas@biocambio360.com',
            cellphone: cleanPhone,
            cellphoneCountryCode: '+57',
            address: {
                lineOne: cleanAddress,
                city: cleanCity,
                country: 'CO'
            }
        },
        shippingAddress: {
            lineOne: cleanAddress,
            city: cleanCity,
            country: 'CO'
        },
        billingAddress: {
            lineOne: cleanAddress,
            city: cleanCity,
            country: 'CO'
        },
        items: addiItems,
        allyUrlRedirection: {
            logoUrl: `${host}/images/logo-biocambio360.png`,
            callbackUrl: `${host}/api/addi/webhook`,
            redirectionUrl: `${host}/confirmacion/${params.orderId}`
        }
    };

    // Realizar la llamada con redirect: 'manual' para atrapar el 301 de Addi
    const response = await fetch('https://api.addi.com/v1/online-applications', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        redirect: 'manual'
    });

    // 1. Chequear header Location (HTTP 301 / 302 / 303 / 307 / 308)
    const locationHeader = response.headers.get('location');
    if (locationHeader) {
        return {
            redirectUrl: locationHeader,
            orderAttemptId
        };
    }

    // 2. Si responde 200/201 con cuerpo JSON
    if (response.ok) {
        const body = await response.json().catch(() => ({}));
        const redirectUrl = body.redirectionUrl || body.redirectUrl || body.url || body.checkoutUrl;
        if (redirectUrl) {
            return {
                redirectUrl,
                applicationId: body.applicationId || body.id,
                orderAttemptId
            };
        }
    }

    // 3. Si hubo error HTTP
    const errorBody = await response.text();
    console.error('[AddiService] Error al crear aplicación Addi:', response.status, errorBody);
    throw new Error(`Addi API Error (${response.status}): ${errorBody}`);
}

/**
 * Valida la cabecera HTTP Basic Auth del webhook de Addi
 */
export function validateAddiBasicAuth(authHeader: string | null): boolean {
    const expectedUser = process.env.ADDI_WEBHOOK_USER;
    const expectedPassword = process.env.ADDI_WEBHOOK_PASSWORD;

    if (!expectedUser || !expectedPassword) {
        console.error('[AddiService] Variables ADDI_WEBHOOK_USER o ADDI_WEBHOOK_PASSWORD no configuradas');
        return false;
    }

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    const base64Credentials = authHeader.substring(6).trim();
    try {
        const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [user, password] = decoded.split(':');
        return user === expectedUser && password === expectedPassword;
    } catch {
        return false;
    }
}
