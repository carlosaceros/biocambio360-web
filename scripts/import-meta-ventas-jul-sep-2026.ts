/**
 * Integra EXCELS POR INTEGRAR/ventas/BASE META JUL - SEPT.xlsx (389 filas, jul-sep 2026, $52.5M,
 * ventas atribuidas a Meta Ads) en `customers`. Mismo criterio no-destructivo que el resto de esta
 * sesión (Kommo, ventas ledger 2026):
 *  - Localidad/Barrio: solo se rellenan si el cliente NO los tiene ya (nunca se sobrescribe un dato real).
 *  - El resto queda en campos de referencia `metaVentasJulSep2026*` (no se toca `orders` ni totalSpent/
 *    ordersCount — mismo razonamiento de evitar doble conteo de ingreso que en el ledger de ventas).
 *  - Sin match por celular → colección de revisión `meta_ventas_jul_sep_unmatched`.
 *
 * Requiere haber corrido antes el extractor Python que genera meta-ventas.json.
 *
 * Uso:
 *   npx tsx scripts/import-meta-ventas-jul-sep-2026.ts             → dry run
 *   npx tsx scripts/import-meta-ventas-jul-sep-2026.ts --execute    → escribe de verdad
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
        // sin .env.local
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
import { FieldValue } from 'firebase-admin/firestore';

const EXECUTE = process.argv.includes('--execute');
const JSON_PATH = '/private/tmp/claude-501/-Users-carlosaceros-Documents-pajarito-web-nueva-marca-nextjs/474144cd-cdef-4385-b3a9-7a4ed231e426/scratchpad/meta-ventas.json';

interface MetaVentaEntry {
    nombre: string;
    localidad: string;
    barrio: string;
    barrioLocalidadCompleto: string;
    pedidosCount: number;
    total: number;
    primeraCompra: string;
    ultimaCompra: string;
    productos: Record<string, number>;
}

function phoneVariants(digits: string): string[] {
    return Array.from(new Set([digits, `57${digits}`]));
}

async function main() {
    console.log('====================================================');
    console.log(`🔄 INTEGRACIÓN BASE META JUL - SEPT.xlsx  ${EXECUTE ? '(ESCRIBIENDO)' : '(DRY RUN)'}`);
    console.log('====================================================\n');

    const data: Record<string, MetaVentaEntry> = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
    const phones = Object.keys(data);
    console.log(`Teléfonos a procesar: ${phones.length}\n`);

    const db = getAdminDB();
    let matched = 0;
    let unmatched = 0;
    let localidadFilled = 0;
    let batch = db.batch();
    let pending = 0;
    let committed = 0;
    const sampleUnmatched: string[] = [];

    for (const phone of phones) {
        const entry = data[phone];
        let customerRef: FirebaseFirestore.DocumentReference | null = null;
        let customerData: FirebaseFirestore.DocumentData | undefined;
        for (const v of phoneVariants(phone)) {
            const snap = await db.collection('customers').doc(v).get();
            if (snap.exists) {
                customerRef = snap.ref;
                customerData = snap.data();
                break;
            }
        }

        if (!customerRef) {
            unmatched++;
            if (sampleUnmatched.length < 20) sampleUnmatched.push(`${phone} (${entry.nombre}) · ${entry.barrioLocalidadCompleto}`);
            if (EXECUTE) {
                batch.set(db.collection('meta_ventas_jul_sep_unmatched').doc(phone), {
                    celular: phone,
                    ...entry,
                    revisadoManualmente: false,
                    fuente: 'BASE META JUL - SEPT.xlsx',
                    migratedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                pending++;
            }
        } else {
            matched++;
            const update: Record<string, unknown> = {
                metaVentasJulSep2026PedidosCount: entry.pedidosCount,
                metaVentasJulSep2026Total: entry.total,
                metaVentasJulSep2026PrimeraCompra: entry.primeraCompra,
                metaVentasJulSep2026UltimaCompra: entry.ultimaCompra,
                metaVentasJulSep2026Productos: entry.productos,
                metaVentasJulSep2026MigratedAt: FieldValue.serverTimestamp(),
            };
            const hasLocalidad = !!(customerData?.localidad || customerData?.ciudad);
            const hasBarrio = !!customerData?.barrio;
            if (!hasLocalidad && entry.localidad) { update.localidad = entry.localidad; localidadFilled++; }
            if (!hasBarrio && entry.barrio) update.barrio = entry.barrio;

            if (EXECUTE) {
                batch.set(customerRef, update, { merge: true });
                pending++;
            }
        }

        if (pending >= 400) {
            await batch.commit();
            committed += pending;
            batch = db.batch();
            pending = 0;
        }
    }

    if (EXECUTE && pending > 0) {
        await batch.commit();
        committed += pending;
    }

    console.log('\n──────────────── RESUMEN ────────────────');
    console.log(`Emparejados con cliente existente:  ${matched}${EXECUTE ? ' (enriquecidos con metaVentasJulSep2026*)' : ''}`);
    console.log(`  De esos, con Localidad rellenada (antes vacía): ${localidadFilled}`);
    console.log(`Sin cliente existente (revisar):    ${unmatched}${EXECUTE ? ' (guardados en meta_ventas_jul_sep_unmatched)' : ''}`);
    if (sampleUnmatched.length > 0) {
        console.log('\nEjemplos sin emparejar:');
        sampleUnmatched.forEach(s => console.log(`  · ${s}`));
    }

    if (!EXECUTE) {
        console.log('\n👉 DRY RUN: no se escribió nada. Corre de nuevo con --execute si el resumen se ve correcto.');
    } else {
        console.log(`\n✅ Integración escrita en Firestore (${committed} escrituras).`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
