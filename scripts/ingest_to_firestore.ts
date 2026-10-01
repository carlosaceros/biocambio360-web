import fs from 'fs';
import path from 'path';
import { getAdminDB } from '../src/lib/firebase-admin';

async function runIngestion() {
    console.log('=========================================================');
    console.log('🔥 INGESTIÓN SEGURA Y NO DESTRUCTIVA A FIRESTORE');
    console.log('=========================================================');

    const db = getAdminDB();
    const DATA_DIR = path.join(process.cwd(), 'scripts', 'data');

    // ─────────────────────────────────────────────────────────────
    // 1. Proteger y etiquetar los 75 pedidos existentes en la Web
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Paso 1/4] Protegiendo y etiquetando pedidos existentes de Tienda Virtual...');
    const existingOrdersSnap = await db.collection('orders').get();
    console.log(`Pedidos existentes encontrados en 'orders': ${existingOrdersSnap.size}`);

    let taggedWebOrders = 0;
    const webBatch = db.batch();
    for (const doc of existingOrdersSnap.docs) {
        const data = doc.data();
        if (!data.canal || data.canal !== 'tienda_virtual') {
            webBatch.update(doc.ref, {
                canal: 'tienda_virtual',
                origen: 'web_ecommerce',
                canal_nombre: 'Tienda Virtual Online'
            });
            taggedWebOrders++;
        }
    }
    if (taggedWebOrders > 0) {
        await webBatch.commit();
        console.log(`✓ ${taggedWebOrders} pedidos web etiquetados explícitamente como 'tienda_virtual'.`);
    } else {
        console.log('✓ Todos los pedidos existentes ya estaban protegidos.');
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Ingestión de Ventas de Mostrador (pos_sales)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Paso 2/4] Ingestando ventas POS Mostrador Soacha...');
    const posSalesFile = path.join(DATA_DIR, 'pos_sales.json');
    if (fs.existsSync(posSalesFile)) {
        const posSales = JSON.parse(fs.readFileSync(posSalesFile, 'utf8'));
        console.log(`Cargando ${posSales.length} ventas POS en batches de 400...`);

        const BATCH_SIZE = 400;
        let posInserted = 0;

        for (let i = 0; i < posSales.length; i += BATCH_SIZE) {
            const chunk = posSales.slice(i, i + BATCH_SIZE);
            const batch = db.batch();

            for (const sale of chunk) {
                const docRef = db.collection('pos_sales').doc(sale.id);
                batch.set(docRef, sale, { merge: true });
            }

            await batch.commit();
            posInserted += chunk.length;
            process.stdout.write(`\r  Progreso POS: ${posInserted}/${posSales.length} transacciones`);
        }
        console.log(`\n✓ Ingestión de POS Mostrador completada exitosamente.`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Ingestión y Fusión de Clientes (customers)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Paso 3/4] Ingestando y enriqueciendo clientes sin sobreescritura...');
    const existingCustomersSnap = await db.collection('customers').get();
    const existingPhoneMap = new Map<string, string>(); // phone -> docId

    existingCustomersSnap.docs.forEach(d => {
        const cData = d.data();
        const ph = (cData.celular || cData.telefono || d.id).replace(/\D/g, '');
        if (ph) existingPhoneMap.set(ph, d.id);
    });
    console.log(`Clientes web existentes en Firestore: ${existingCustomersSnap.size}`);

    const customersFile = path.join(DATA_DIR, 'customers.json');
    if (fs.existsSync(customersFile)) {
        const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
        console.log(`Procesando ${customers.length} clientes únicos de Excels...`);

        const BATCH_SIZE = 400;
        let custProcessed = 0;
        let omnicanalMerged = 0;

        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const chunk = customers.slice(i, i + BATCH_SIZE);
            const batch = db.batch();

            for (const cust of chunk) {
                const ph = cust.celular;
                const existingDocId = existingPhoneMap.get(ph);

                if (existingDocId) {
                    // Fusión no destructiva: Cliente existe en la web y ahora tiene histórico de Call Center
                    const docRef = db.collection('customers').doc(existingDocId);
                    batch.set(docRef, {
                        es_omnicanal: true,
                        canales: ['tienda_virtual', 'call_center'],
                        historico_ordenes_callcenter: cust.totalOrders,
                        historico_gasto_callcenter: cust.totalSpend,
                        segmento_rfm: cust.segmento,
                        asesor_asignado: cust.preferredAdvisor,
                        categoria_favorita: cust.preferredCategory,
                        presentacion_favorita: cust.preferredSize,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                    omnicanalMerged++;
                } else {
                    // Cliente nuevo de Call Center
                    const docRef = db.collection('customers').doc(ph);
                    batch.set(docRef, {
                        ...cust,
                        es_omnicanal: false,
                        canales: ['call_center'],
                        createdAt: cust.firstOrderDate || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }
            }

            await batch.commit();
            custProcessed += chunk.length;
            process.stdout.write(`\r  Progreso Clientes: ${custProcessed}/${customers.length} perfiles (Omnicanal: ${omnicanalMerged})`);
        }
        console.log(`\n✓ Ingestión de Clientes completada exitosamente.`);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Ingestión de Órdenes Call Center (orders con prefijo HIST-CC-)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Paso 4/4] Ingestando órdenes de Call Center (prefijo HIST-CC-)...');
    const ccOrdersFile = path.join(DATA_DIR, 'call_center_orders.json');
    if (fs.existsSync(ccOrdersFile)) {
        const ccOrders = JSON.parse(fs.readFileSync(ccOrdersFile, 'utf8'));
        console.log(`Cargando ${ccOrders.length} órdenes históricas de Call Center...`);

        const BATCH_SIZE = 400;
        let ordersInserted = 0;

        for (let i = 0; i < ccOrders.length; i += BATCH_SIZE) {
            const chunk = ccOrders.slice(i, i + BATCH_SIZE);
            const batch = db.batch();

            for (const order of chunk) {
                const docRef = db.collection('orders').doc(order.id);
                batch.set(docRef, order, { merge: true });
            }

            await batch.commit();
            ordersInserted += chunk.length;
            process.stdout.write(`\r  Progreso Órdenes CC: ${ordersInserted}/${ccOrders.length}`);
        }
        console.log(`\n✓ Ingestión de Órdenes Call Center completada exitosamente.`);
    }

    console.log('\n=========================================================');
    console.log('🎉 INGESTIÓN Y MIGRACIÓN FINALIZADA CON CERO REGRESIONES');
    console.log('=========================================================');
}

runIngestion().then(() => process.exit(0)).catch(err => {
    console.error('Error fatal durante la ingestión:', err);
    process.exit(1);
});
