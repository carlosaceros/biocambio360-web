/**
 * Integra EXCELS POR INTEGRAR/ventas/Ventas_Biocambio_2026_Final.xlsx (22,925 líneas de producto,
 * ~9,623 facturas, ene-sep 2026) en `customers`, SIN tocar nombre/dirección/totalSpent/ordersCount
 * ni crear documentos en `orders`.
 *
 * Por qué NO se importa como `orders`: la colección `orders` ya tiene 4,800 documentos `HIST-CC-*`
 * (un import histórico previo) con exactamente el mismo número de teléfonos únicos que este Excel —
 * son casi con certeza la misma venta ya representada (de forma más cruda, un solo producto por
 * cliente). Crear pedidos nuevos aquí duplicaría el ingreso ya contado en `getTotalBusinessRevenue`
 * y en `customers.totalSpent` (reparado en este mismo trabajo). Por eso este script SOLO agrega
 * campos de referencia `ventas2026*` (con alcance ene-sep 2026, no lifetime) para consulta/auditoría,
 * y dedica una carpeta de revisión separada a los contactos sin match.
 *
 * Requiere haber corrido antes:
 *   python3 (via Claude) extract_ventas_ledger.py → escribe el JSON intermedio con el que corre esto.
 *
 * Uso:
 *   npx tsx scripts/import-ventas-ledger-2026.ts             → dry run
 *   npx tsx scripts/import-ventas-ledger-2026.ts --execute    → escribe de verdad
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
const LEDGER_JSON = '/private/tmp/claude-501/-Users-carlosaceros-Documents-pajarito-web-nueva-marca-nextjs/474144cd-cdef-4385-b3a9-7a4ed231e426/scratchpad/ventas-ledger.json';

interface LedgerEntry {
    nombre: string;
    facturasCount: number;
    total: number;
    tipoCliente: string;
    primeraCompra: string;
    ultimaCompra: string;
    productos: Record<string, number>;
    presentaciones: Record<string, number>;
}

function phoneVariants(digits: string): string[] {
    return Array.from(new Set([digits, `57${digits}`]));
}

async function main() {
    console.log('====================================================');
    console.log(`🔄 INTEGRACIÓN Ventas_Biocambio_2026_Final.xlsx  ${EXECUTE ? '(ESCRIBIENDO)' : '(DRY RUN)'}`);
    console.log('====================================================\n');

    const ledger: Record<string, LedgerEntry> = JSON.parse(readFileSync(LEDGER_JSON, 'utf-8'));
    const phones = Object.keys(ledger);
    console.log(`Teléfonos en el ledger: ${phones.length}\n`);

    const db = getAdminDB();
    let matched = 0;
    let unmatched = 0;
    let batch = db.batch();
    let pending = 0;
    let committed = 0;
    const sampleUnmatched: string[] = [];

    for (const phone of phones) {
        const entry = ledger[phone];
        let customerRef: FirebaseFirestore.DocumentReference | null = null;
        for (const v of phoneVariants(phone)) {
            const snap = await db.collection('customers').doc(v).get();
            if (snap.exists) {
                customerRef = snap.ref;
                break;
            }
        }

        if (!customerRef) {
            unmatched++;
            if (sampleUnmatched.length < 20) sampleUnmatched.push(`${phone} (${entry.nombre}) · ${entry.facturasCount} facturas · $${entry.total.toLocaleString('es-CO')}`);
            if (EXECUTE) {
                batch.set(db.collection('ventas_2026_unmatched').doc(phone), {
                    celular: phone,
                    nombre: entry.nombre,
                    facturasCount: entry.facturasCount,
                    total: entry.total,
                    tipoCliente: entry.tipoCliente,
                    primeraCompra: entry.primeraCompra,
                    ultimaCompra: entry.ultimaCompra,
                    productos: entry.productos,
                    revisadoManualmente: false,
                    fuente: 'Ventas_Biocambio_2026_Final.xlsx',
                    migratedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                pending++;
            }
        } else {
            matched++;
            if (EXECUTE) {
                batch.set(customerRef, {
                    ventas2026FacturasCount: entry.facturasCount,
                    ventas2026Total: entry.total,
                    ventas2026TipoCliente: entry.tipoCliente,
                    ventas2026PrimeraCompra: entry.primeraCompra,
                    ventas2026UltimaCompra: entry.ultimaCompra,
                    ventas2026Productos: entry.productos,
                    ventas2026Presentaciones: entry.presentaciones,
                    ventas2026MigratedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                pending++;
            }
        }

        if (pending >= 400) {
            await batch.commit();
            committed += pending;
            batch = db.batch();
            pending = 0;
            console.log(`  Escritos ${committed}...`);
        }
    }

    if (EXECUTE && pending > 0) {
        await batch.commit();
        committed += pending;
    }

    console.log('\n──────────────── RESUMEN ────────────────');
    console.log(`Emparejados con cliente existente:  ${matched}${EXECUTE ? ' (enriquecidos con ventas2026*)' : ''}`);
    console.log(`Sin cliente existente (revisar):    ${unmatched}${EXECUTE ? ' (guardados en ventas_2026_unmatched)' : ''}`);
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
