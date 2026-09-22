/**
 * 99envios-service.ts
 * Integración con la API de 99 Envíos (multi-mensajería).
 * Origen fijo: Soacha / Biocambio360 S.A.S.
 */

const API_BASE = 'https://integration1.99envios.app/api/integration/v1';

const ORIGEN = {
    codigo: '25754000',
    nombre: 'SOACHA',
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAuthToken(): Promise<string> {
    const email = process.env.ENV_99ENVIOS_EMAIL || 'daniloespinalospina@gmail.com';
    const password = process.env.ENV_99ENVIOS_PASSWORD || 'Ventas2050*';

    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            throw new Error(`Login 99 Envíos falló: ${res.status}`);
        }

        const data = await res.json();
        if (!data.token) throw new Error('No se recibió token de 99 Envíos');

        cachedToken = data.token;
        tokenExpiry = Date.now() + 55 * 60 * 1000;
        return cachedToken as string;
    } catch (e: any) {
        console.error('[99envios-service] Error de autenticación:', e.message);
        throw e;
    }
}

export interface QuoteCarrier {
    mensaje: string;
    valor: number;
    valor_contrapago: number;
    seguro99?: number;
    sobreflete?: number;
    dias: string | number;
    fecha_entrega: string | null;
    exito: boolean;
    IdServicio: number;
}

export interface QuoteResult {
    cheapest: {
        transportadora: string;
        valor: number;
        valor_contrapago: number;
        dias: string | number;
        fecha_entrega?: string | null;
    };
    all: Record<string, QuoteCarrier>;
}

export async function cotizarEnvio(
    destinoCodigo: string,
    destinoNombre: string,
    valorDeclarado: number,
    aplicaContrapago: boolean = true,
    pesoKg: number = 5,
    dimensions?: { alto: number; largo: number; ancho: number }
): Promise<QuoteResult> {
    const token = await getAuthToken();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const yyyy = tomorrow.getFullYear();
    const fecha = `${dd}-${mm}-${yyyy}`;

    const alto = dimensions?.alto || (pesoKg >= 20 ? 38 : (pesoKg >= 10 ? 32 : 25));
    const largo = dimensions?.largo || (pesoKg >= 20 ? 38 : (pesoKg >= 10 ? 30 : 25));
    const ancho = dimensions?.ancho || (pesoKg >= 20 ? 42 : (pesoKg >= 10 ? 30 : 25));

    const payload = {
        destino: { codigo: destinoCodigo, nombre: destinoNombre },
        origen: ORIGEN,
        IdTipoEntrega: 1,
        IdServicio: 1,
        fecha,
        valorDeclarado: Math.max(75000, valorDeclarado),
        peso: Math.max(1, Math.round(pesoKg * 10) / 10),
        alto,
        largo,
        ancho,
        seguro99: false,
        seguro99plus: aplicaContrapago ? 1 : 0,
        AplicaContrapago: aplicaContrapago,
    };

    try {
        const res = await fetch(`${API_BASE}/cotizar`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error(`Error cotizar: ${res.status}`);
        }

        const data: Record<string, QuoteCarrier> = await res.json();
        let cheapestName = 'interrapidisimo';
        let cheapestVal = Infinity;

        for (const [name, carrier] of Object.entries(data)) {
            if (carrier.exito && carrier.valor > 0 && carrier.valor < cheapestVal) {
                cheapestVal = carrier.valor;
                cheapestName = name;
            }
        }

        const cheapestCarrier = data[cheapestName];

        return {
            cheapest: {
                transportadora: cheapestName,
                valor: cheapestVal === Infinity ? 18000 : cheapestVal,
                valor_contrapago: cheapestCarrier?.valor_contrapago ?? 0,
                dias: cheapestCarrier?.dias ?? 2,
                fecha_entrega: cheapestCarrier?.fecha_entrega ?? null,
            },
            all: data,
        };
    } catch (e: any) {
        return {
            cheapest: {
                transportadora: 'interrapidisimo',
                valor: 18000,
                valor_contrapago: 0,
                dias: 2,
            },
            all: {},
        };
    }
}

export interface PreenvioData {
    destinatario: {
        tipoDocumento: string;
        numeroDocumento?: string;
        nombre: string;
        primerApellido: string;
        telefono: string;
        direccion: string;
        idLocalidad: string;
        correo?: string;
    };
    valorDeclarado: number;
    valorContrapago?: number;
    transportadora: string;
    pesoKg?: number;
    diceContener?: string;
    observaciones?: string;
}

export async function crearPreenvio(data: PreenvioData): Promise<any> {
    const token = await getAuthToken();
    const pesoKg = data.pesoKg ?? 5;
    const pesoGuia = Math.min(pesoKg, 30);

    const payload = {
        IdTipoEntrega: 1,
        IdServicio: 1,
        AplicaContrapago: !!(data.valorContrapago && data.valorContrapago > 0),
        peso: pesoGuia,
        largo: Math.max(15, Math.round(pesoGuia * 1.2)),
        ancho: Math.max(15, Math.round(pesoGuia * 1.0)),
        alto: Math.max(20, Math.round(pesoGuia * 1.5)),
        diceContener: data.diceContener || 'Productos de limpieza y aseo Biocambio360',
        valorDeclarado: Math.max(75000, data.valorDeclarado),
        seguro99: false,
        seguro99plus: !!(data.valorContrapago && data.valorContrapago > 0) ? 1 : 0,
        Destinatario: {
            tipoDocumento: data.destinatario.tipoDocumento || 'CC',
            numeroDocumento: data.destinatario.numeroDocumento || '222222222',
            nombre: data.destinatario.nombre,
            primerApellido: data.destinatario.primerApellido || 'Cliente',
            telefono: data.destinatario.telefono,
            direccion: data.destinatario.direccion,
            idLocalidad: data.destinatario.idLocalidad || '11001000',
            correo: data.destinatario.correo || '',
        },
        Observaciones: data.observaciones || 'FRÁGIL - PRODUCTOS DE ASEO LÍQUIDOS',
        transportadora: {
            pais: 'colombia',
            nombre: data.transportadora || 'interrapidisimo',
        },
        origenCreacion: 1,
    };

    const res = await fetch(`${API_BASE}/preenvio`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(`Preenvío falló: ${JSON.stringify(result)}`);
    return result;
}

export async function obtenerPdfGuia(
    guiaOLista: string | string[],
    transportadoraParam?: string,
    tipoPdf: 'sticker' | 'estandar' = 'sticker'
): Promise<{ buffer: Buffer; contentType: string; url?: string }> {
    const token = await getAuthToken();
    const pdfEndpoint = tipoPdf === 'sticker' ? 'sticker' : 'pdf';
    const guia = Array.isArray(guiaOLista) ? guiaOLista[0] : guiaOLista;

    if (!guia) {
        throw new Error('Número de guía no proporcionado');
    }

    // 1. Determinar transportadora sugerida o por defecto
    let transportadoraCandidata = transportadoraParam?.toLowerCase().trim();

    if (!transportadoraCandidata) {
        // Heurísticas según numeración de guías en Colombia
        if (/^64\d{9}$/.test(guia)) {
            transportadoraCandidata = 'coordinadora';
        } else if (/^(24|70|71|72)\d{7,8}$/.test(guia)) {
            transportadoraCandidata = 'interrapidisimo';
        } else if (/^\d{10}$/.test(guia)) {
            transportadoraCandidata = 'servientrega';
        } else {
            transportadoraCandidata = 'coordinadora';
        }
    }

    // Lista ordenada de transportadoras a probar en caso de 422
    const transportadorasAProbar = Array.from(
        new Set([
            transportadoraCandidata,
            'coordinadora',
            'interrapidisimo',
            'servientrega',
            'envia'
        ])
    );

    let lastError = '';

    for (const transportadora of transportadorasAProbar) {
        try {
            const payload = {
                guia,
                transportadora: {
                    pais: 'colombia',
                    nombre: transportadora,
                },
            };

            const res = await fetch(`${API_BASE}/pdf/${pdfEndpoint}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/pdf, application/json, text/plain, text/html',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                lastError = `Error ${res.status} al obtener PDF (${transportadora}): ${errText.slice(0, 300)}`;
                // Si es 422 o 404, probamos con la siguiente transportadora
                continue;
            }

            const contentTypeHeader = res.headers.get('content-type') || '';

            // Caso A: Respuesta JSON (puede contener url o pdfBase64)
            if (contentTypeHeader.includes('application/json')) {
                const json = await res.json();
                if (json.pdfBase64) {
                    return { buffer: Buffer.from(json.pdfBase64, 'base64'), contentType: 'application/pdf' };
                }
                if (json.url) {
                    const pdfRes = await fetch(json.url);
                    if (pdfRes.ok) {
                        const arrayBuffer = await pdfRes.arrayBuffer();
                        return { buffer: Buffer.from(arrayBuffer), contentType: 'application/pdf', url: json.url };
                    }
                }
            }

            // Caso B: La respuesta es texto plano o HTML conteniendo una URL directa
            const textResponse = await res.text();
            const trimmed = textResponse.trim().replace(/^"|"$/g, '');

            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                // Descargar el binario del PDF desde la URL provista por 99 Envíos
                const pdfRes = await fetch(trimmed);
                if (pdfRes.ok) {
                    const arrayBuffer = await pdfRes.arrayBuffer();
                    return { buffer: Buffer.from(arrayBuffer), contentType: 'application/pdf', url: trimmed };
                }
            }

            // Caso C: Binario directo en el cuerpo (application/pdf)
            // Si el texto contenía binario PDF (comienza con %PDF)
            if (textResponse.startsWith('%PDF') || contentTypeHeader.includes('application/pdf')) {
                return { buffer: Buffer.from(textResponse, 'binary'), contentType: 'application/pdf' };
            }

            lastError = `Respuesta inesperada de 99 Envíos: ${trimmed.slice(0, 150)}`;
        } catch (callErr: any) {
            lastError = callErr.message;
        }
    }

    throw new Error(lastError || `No se pudo obtener el PDF de la guía ${guia}`);
}

