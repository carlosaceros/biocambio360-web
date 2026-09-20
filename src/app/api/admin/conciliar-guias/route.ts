import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

interface GuiaItem {
    guia: string;
    transportadora?: string;
    telefono?: string;
    cedula?: string;
    nombre?: string;
    orderId?: string;
    estado?: string;
}

function normalizePhone(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-10);
}

function normalizeDoc(doc?: string): string {
    if (!doc) return '';
    return doc.replace(/\D/g, '');
}

function parseTrackingUrl(carrier: string, guide: string): string {
    const c = carrier.toLowerCase();
    if (c.includes('inter')) {
        return `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${guide}`;
    }
    if (c.includes('coord')) {
        return `https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastreo-de-guias/?guia=${guide}`;
    }
    if (c.includes('servi')) {
        return `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${guide}`;
    }
    if (c.includes('envia')) {
        return `https://enviacolvanes.com.co/rastreo?guia=${guide}`;
    }
    return `https://www.google.com/search?q=rastreo+guia+${guide}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let items: GuiaItem[] = [];

        if (Array.isArray(body.items)) {
            items = body.items;
        } else if (typeof body.rawText === 'string') {
            const lines = body.rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
            for (const line of lines) {
                const cols = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : line.split(',');
                const cleanCols = cols.map((c: string) => c.trim().replace(/^["']|["']$/g, ''));
                if (cleanCols.length >= 1 && cleanCols[0]) {
                    const guia = cleanCols[0];
                    let telefono = '';
                    let cedula = '';
                    let nombre = '';
                    let transportadora = body.defaultTransportadora || '99envios';

                    for (let i = 1; i < cleanCols.length; i++) {
                        const val = cleanCols[i];
                        const digits = val.replace(/\D/g, '');
                        if (digits.length >= 10 && digits.startsWith('3')) {
                            telefono = digits;
                        } else if (digits.length >= 7 && digits.length <= 10 && !telefono) {
                            cedula = digits;
                        } else if (val.length > 3 && isNaN(Number(val))) {
                            if (!nombre) nombre = val;
                        }
                    }

                    items.push({
                        guia,
                        telefono,
                        cedula,
                        nombre,
                        transportadora,
                        estado: body.marcarEntregado ? 'entregado' : undefined
                    });
                }
            }
        }

        if (items.length === 0) {
            return NextResponse.json({ error: 'No se enviaron guías válidas para conciliar.' }, { status: 400 });
        }

        const db = getAdminDB();
        const results = {
            total: items.length,
            vinculados: 0,
            noEncontrados: [] as any[],
            detalles: [] as any[]
        };

        for (const item of items) {
            const guia = String(item.guia || '').trim();
            if (!guia) continue;

            let matchedDoc: FirebaseFirestore.DocumentSnapshot | null = null;

            // 1. Direct match by Order ID
            if (item.orderId) {
                const docRef = db.collection('orders').doc(item.orderId);
                const s = await docRef.get();
                if (s.exists) matchedDoc = s;
            }

            // 2. Match by phone
            const cleanPhone = normalizePhone(item.telefono);
            if (!matchedDoc && cleanPhone.length >= 7) {
                const qSnap = await db.collection('orders')
                    .where('cliente.celular', '==', cleanPhone)
                    .limit(1)
                    .get();

                if (!qSnap.empty) {
                    matchedDoc = qSnap.docs[0];
                } else {
                    const qSnap2 = await db.collection('orders')
                        .where('cliente.celular', '==', `57${cleanPhone}`)
                        .limit(1)
                        .get();
                    if (!qSnap2.empty) matchedDoc = qSnap2.docs[0];
                }
            }

            // 3. Match by cédula
            const cleanDocNum = normalizeDoc(item.cedula);
            if (!matchedDoc && cleanDocNum.length >= 6) {
                const qSnap = await db.collection('orders')
                    .where('cliente.cedula', '==', cleanDocNum)
                    .limit(1)
                    .get();
                if (!qSnap.empty) matchedDoc = qSnap.docs[0];
            }

            if (matchedDoc) {
                const orderData = matchedDoc.data() || {};
                const transportadora = item.transportadora || orderData.transportadora || '99envios';
                const trackingUrl = parseTrackingUrl(transportadora, guia);

                const updatePayload: any = {
                    guiaTransportadora: guia,
                    transportadora,
                    trackingUrl,
                    updatedAt: new Date()
                };

                if (item.estado === 'entregado' && orderData.status !== 'entregado') {
                    updatePayload.status = 'entregado';
                }

                const noteItem = {
                    id: `note_concilia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    text: `📦 Guía retroactiva #${guia} vinculada mediante conciliador masivo (${transportadora}).`,
                    authorEmail: body.userEmail || 'sistema@biocambio360.com',
                    authorName: body.userName || 'Conciliador Logístico',
                    authorRole: 'logistica',
                    createdAt: new Date().toISOString()
                };

                const currentNotes = Array.isArray(orderData.notasInternas) ? orderData.notasInternas : [];
                updatePayload.notasInternas = [...currentNotes, noteItem];

                await matchedDoc.ref.update(updatePayload);

                try {
                    await db.collection('pedidos').doc(matchedDoc.id).set({
                        guiaTransportadora: guia,
                        numeroGuia: guia,
                        transportadora,
                        trackingUrl
                    }, { merge: true });
                } catch (_) {}

                results.vinculados++;
                results.detalles.push({
                    orderId: matchedDoc.id,
                    cliente: orderData.cliente?.nombre || 'Cliente',
                    guia,
                    transportadora
                });
            } else {
                results.noEncontrados.push({
                    guia,
                    telefono: item.telefono || '',
                    cedula: item.cedula || '',
                    nombre: item.nombre || ''
                });
            }
        }

        return NextResponse.json({
            exito: true,
            mensaje: `Conciliación finalizada: ${results.vinculados} pedidos actualizados de ${results.total} registros.`,
            ...results
        });
    } catch (e: any) {
        console.error('[conciliar-guias] Error:', e);
        return NextResponse.json({ error: e.message || 'Error en conciliación masiva' }, { status: 500 });
    }
}
