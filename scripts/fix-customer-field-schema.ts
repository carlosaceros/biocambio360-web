/**
 * Repara una inconsistencia de esquema descubierta al analizar EXCELS POR INTEGRAR/ventas/:
 * 11,054 de los 11,127 documentos de `customers` (99.3%) tienen sus estadísticas de compra bajo
 * `totalSpend`/`totalOrders` (de un import anterior, fuera de este repo), mientras que TODO el código
 * de la app (recompra, riesgo de fuga, CRM, referidos, POS, inbox) lee `totalSpent`/`ordersCount`.
 * Resultado: para el 99.3% de los clientes, esas pantallas muestran $0 / vacío aunque el cliente sí
 * tenga historial real.
 *
 * Esta reparación es puramente ADITIVA: copia totalSpend → totalSpent y totalOrders → ordersCount
 * SOLO cuando el campo "oficial" no existe todavía. Nunca borra ni sobrescribe totalSpend/totalOrders,
 * y nunca toca un totalSpent/ordersCount que ya tenga un valor real.
 *
 * Uso:
 *   npx tsx scripts/fix-customer-field-schema.ts             → dry run (reporta, no escribe)
 *   npx tsx scripts/fix-customer-field-schema.ts --execute    → escribe de verdad
 */

import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvLocal() {
    try {
        const raw = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
        const re = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/gm;
        let match: RegExpExecArray | null;
        while ((match = re.exec(raw))) {
            const key = match[1];
            let value = match[2];
            while (
                (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
                (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
            ) {
                value = value.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = value;
        }
    } catch {
        // sin .env.local: seguimos
    }
}
loadEnvLocal();

function repairDequotedServiceAccountJson() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw || raw.trim().startsWith('{"')) return;
    const KNOWN_FIELDS = [
        'type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id',
        'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url', 'universe_domain',
    ];
    const inner = raw.trim().replace(/^\{/, '').replace(/\}$/, '');
    const splitRe = new RegExp(`,(?=(?:${KNOWN_FIELDS.join('|')}):)`);
    const pairs = inner.split(splitRe).map(part => {
        const idx = part.indexOf(':');
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1);
        return `"${key}":"${value}"`;
    });
    const fixed = '{' + pairs.join(',') + '}';
    try {
        JSON.parse(fixed);
        process.env.FIREBASE_SERVICE_ACCOUNT = fixed;
    } catch (e) {
        console.error('  [env] No se pudo reconstruir FIREBASE_SERVICE_ACCOUNT:', e instanceof Error ? e.message : e);
    }
}
repairDequotedServiceAccountJson();

import { getAdminDB } from '../src/lib/firebase-admin';

const EXECUTE = process.argv.includes('--execute');

async function main() {
    console.log('====================================================');
    console.log(`🔧 REPARACIÓN DE ESQUEMA customers  ${EXECUTE ? '(ESCRIBIENDO EN FIRESTORE)' : '(DRY RUN — no escribe nada)'}`);
    console.log('====================================================\n');

    const db = getAdminDB();
    const snap = await db.collection('customers').get();

    let total = 0;
    let needsFix = 0;
    let alreadyOk = 0;
    let batch = db.batch();
    let pending = 0;
    let committed = 0;
    const samples: Array<{ id: string; totalSpend: unknown; totalOrders: unknown }> = [];

    for (const doc of snap.docs) {
        total++;
        const data = doc.data();
        const missingSpent = data.totalSpent === undefined && data.totalSpend !== undefined;
        const missingOrders = data.ordersCount === undefined && data.totalOrders !== undefined;

        if (!missingSpent && !missingOrders) {
            alreadyOk++;
            continue;
        }

        needsFix++;
        if (samples.length < 8) {
            samples.push({ id: doc.id, totalSpend: data.totalSpend, totalOrders: data.totalOrders });
        }

        if (EXECUTE) {
            const update: Record<string, unknown> = {};
            if (missingSpent) update.totalSpent = data.totalSpend;
            if (missingOrders) update.ordersCount = data.totalOrders;
            batch.set(doc.ref, update, { merge: true });
            pending++;
            if (pending >= 400) {
                await batch.commit();
                committed += pending;
                batch = db.batch();
                pending = 0;
                console.log(`  Escritos ${committed}...`);
            }
        }
    }

    if (EXECUTE && pending > 0) {
        await batch.commit();
        committed += pending;
    }

    console.log('\n──────────────── RESUMEN ────────────────');
    console.log(`Total customers:                ${total}`);
    console.log(`Ya tenían el campo correcto:    ${alreadyOk}`);
    console.log(`Necesitan la copia (reparados):  ${needsFix}${EXECUTE ? ` (escritos: ${committed})` : ''}`);
    console.log('\nEjemplos:');
    samples.forEach(s => console.log(`  · ${s.id}: totalSpend=${s.totalSpend} → totalSpent, totalOrders=${s.totalOrders} → ordersCount`));

    if (!EXECUTE) {
        console.log('\n👉 DRY RUN: no se escribió nada. Corre de nuevo con --execute si el resumen se ve correcto.');
    } else {
        console.log('\n✅ Campos reparados en Firestore (aditivo — totalSpend/totalOrders originales quedaron intactos).');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
