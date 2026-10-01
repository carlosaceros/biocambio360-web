/**
 * reconciliar_guias_99.js
 * Script para conciliar masivamente el archivo Envios_Completos_2026-09-20.xlsx
 * con la colección de 'orders' y 'pedidos' en Firestore.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin usando FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saEnv) {
        console.error('ERROR: FIREBASE_SERVICE_ACCOUNT no está definido en el entorno.');
        process.exit(1);
    }
    const sa = JSON.parse(saEnv);
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: sa.project_id,
            clientEmail: sa.client_email,
            privateKey: sa.private_key
        })
    });
}

const db = admin.firestore();

function normalizePhone(p) {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeStr(s) {
    if (!s) return '';
    return String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseTrackingUrl(carrier, guide) {
    const c = (carrier || '').toLowerCase();
    if (c.includes('coord')) {
        return `https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastreo-de-guias/?guia=${guide}`;
    }
    if (c.includes('inter')) {
        return `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${guide}`;
    }
    if (c.includes('servi')) {
        return `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${guide}`;
    }
    return `https://www.google.com/search?q=rastreo+guia+${guide}`;
}

async function runReconciliation() {
    console.log('🚀 Iniciando conciliación masiva desde reporte 99 Envíos...');

    const jsonPath = path.join(process.cwd(), 'public', 'data_envios_99_conciliados.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('No se encontró public/data_envios_99_conciliados.json. Ejecuta primero la extracción.');
        process.exit(1);
    }

    const fileContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const records = fileContent.records || [];
    console.log(`📦 Se cargaron ${records.length} despachos de 99 Envíos para conciliar.`);

    // Crear índices de búsqueda rápida
    const phoneMap = new Map();
    const nameMap = new Map();

    for (const r of records) {
        const cleanP = normalizePhone(r.telefono);
        if (cleanP && cleanP.length >= 7) {
            if (!phoneMap.has(cleanP)) phoneMap.set(cleanP, []);
            phoneMap.get(cleanP).push(r);
        }
        const cleanN = normalizeStr(r.nombre);
        if (cleanN && cleanN.length > 5) {
            if (!nameMap.has(cleanN)) nameMap.set(cleanN, []);
            nameMap.get(cleanN).push(r);
        }
    }

    console.log(`🔍 Índices preparados: ${phoneMap.size} teléfonos únicos.`);

    try {
        console.log('Consultando pedidos en Firestore...');
        const ordersSnap = await db.collection('orders').get();
        console.log(`📋 Se encontraron ${ordersSnap.size} pedidos en Firestore.`);

        let vinculados = 0;
        let yaVinculados = 0;
        let sinCoincidencia = 0;

        for (const doc of ordersSnap.docs) {
            const o = doc.data();
            const orderId = doc.id;

            if (o.guiaTransportadora) {
                yaVinculados++;
                continue;
            }

            const orderPhone = normalizePhone(o.cliente?.celular || o.cliente?.telefono);
            const orderName = normalizeStr(o.cliente?.nombre);

            let matchedShipment = null;

            // 1. Coincidencia por teléfono
            if (orderPhone && phoneMap.has(orderPhone)) {
                matchedShipment = phoneMap.get(orderPhone)[0];
            }

            // 2. Coincidencia por nombre
            if (!matchedShipment && orderName) {
                for (const [nameKey, shipList] of nameMap.entries()) {
                    if (orderName.includes(nameKey) || nameKey.includes(orderName)) {
                        matchedShipment = shipList[0];
                        break;
                    }
                }
            }

            if (matchedShipment) {
                const guia = matchedShipment.guia;
                const carrier = matchedShipment.transportadora || 'coordinadora';
                const trackingUrl = parseTrackingUrl(carrier, guia);

                const updates = {
                    guiaTransportadora: guia,
                    transportadora: carrier,
                    trackingUrl: trackingUrl,
                    fleteReal99: Number(matchedShipment.valor) || null,
                    updatedAt: new Date()
                };

                // Si en 99 envíos figura como entregada, sincronizar estado
                const estadoEnvio = (matchedShipment.estado_envio || '').toLowerCase();
                if (estadoEnvio.includes('entregad') && o.status !== 'entregado') {
                    updates.status = 'entregado';
                }

                // Agregar nota interna
                const note = {
                    id: `note_reconcilia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    text: `📦 Guía retroactiva #${guia} vinculada desde reporte oficial 99 Envíos (${carrier.toUpperCase()}). Estado en transportadora: ${matchedShipment.estado_envio}.`,
                    authorEmail: 'sistema@biocambio360.com',
                    authorName: 'Conciliador 99 Envíos',
                    authorRole: 'logistica',
                    createdAt: new Date().toISOString()
                };

                const currentNotes = Array.isArray(o.notasInternas) ? o.notasInternas : [];
                updates.notasInternas = [...currentNotes, note];

                await doc.ref.update(updates);

                // Sincronizar en pedidos
                try {
                    await db.collection('pedidos').doc(orderId).set({
                        guiaTransportadora: guia,
                        numeroGuia: guia,
                        transportadora: carrier,
                        trackingUrl: trackingUrl
                    }, { merge: true });
                } catch (_) {}

                console.log(`✅ Pedido #${orderId.slice(-8)} (${o.cliente?.nombre}) -> Guía #${guia} (${carrier})`);
                vinculados++;
            } else {
                sinCoincidencia++;
            }
        }

        console.log('\n========================================');
        console.log(`🎉 Resumen de Conciliación:`);
        console.log(`   Total pedidos evaluados: ${ordersSnap.size}`);
        console.log(`   Guías vinculadas hoy: ${vinculados}`);
        console.log(`   Pedidos que ya tenían guía: ${yaVinculados}`);
        console.log(`   Pedidos sin guía en reporte: ${sinCoincidencia}`);
        console.log('========================================\n');

    } catch (e) {
        console.error('Error durante la conciliación en Firestore:', e.message);
        if (e.message.includes('Quota exceeded')) {
            console.log('ℹ️ La cuota de lectura diaria de Firestore se alcanzó. El proceso puede reanudarse en cuanto se restablezca la cuota o ejecutarse desde la interfaz en `/admin/pedidos` usando el botón "⚡ Auto-Conciliar 99 Envíos".');
        }
    }
}

runReconciliation();
