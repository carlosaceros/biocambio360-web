/**
 * Marca con la etiqueta `venta-cerrada` las conversaciones de WhatsApp (`conversations`) cuyo
 * contactPhone aparece en el ledger de ventas 2026 (EXCELS POR INTEGRAR/ventas/Ventas_Biocambio_
 * 2026_Final.xlsx, ya extraído a JSON por extract_ventas_ledger.py). No toca nada más del documento:
 * solo agrega la etiqueta (arrayUnion) y un resumen `ventaCerradaInfo` de referencia.
 *
 * Uso:
 *   npx tsx scripts/tag-closed-sales-conversations.ts             → dry run
 *   npx tsx scripts/tag-closed-sales-conversations.ts --execute    → escribe de verdad
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
    ultimaCompra: string;
}

function last10(digits: string): string {
    return digits.replace(/\D/g, '').slice(-10);
}

async function main() {
    console.log('====================================================');
    console.log(`🏷️  ETIQUETADO "venta-cerrada" EN CONVERSATIONS  ${EXECUTE ? '(ESCRIBIENDO)' : '(DRY RUN)'}`);
    console.log('====================================================\n');

    const ledger: Record<string, LedgerEntry> = JSON.parse(readFileSync(LEDGER_JSON, 'utf-8'));
    const ledgerByLast10 = new Map<string, LedgerEntry>();
    for (const [phone, entry] of Object.entries(ledger)) {
        ledgerByLast10.set(last10(phone), entry);
    }
    console.log(`Teléfonos en el ledger de ventas: ${ledgerByLast10.size}\n`);

    const db = getAdminDB();
    const snap = await db.collection('conversations').where('channel', '==', 'whatsapp').get();
    console.log(`Conversaciones de WhatsApp a revisar: ${snap.size}`);

    let alreadyTagged = 0;
    let newlyTagged = 0;
    let noMatch = 0;
    let batch = db.batch();
    let pending = 0;
    const sampleTagged: string[] = [];

    for (const doc of snap.docs) {
        const data = doc.data();
        const phone = data.contactPhone as string | undefined;
        if (!phone) { noMatch++; continue; }

        const entry = ledgerByLast10.get(last10(phone));
        if (!entry) { noMatch++; continue; }

        if ((data.tags || []).includes('venta-cerrada')) {
            alreadyTagged++;
            continue;
        }

        newlyTagged++;
        if (sampleTagged.length < 15) {
            sampleTagged.push(`${phone} (${data.contactName || entry.nombre}) · ${entry.facturasCount} facturas · $${entry.total.toLocaleString('es-CO')}`);
        }

        if (EXECUTE) {
            batch.update(doc.ref, {
                tags: FieldValue.arrayUnion('venta-cerrada'),
                ventaCerradaInfo: {
                    facturasCount: entry.facturasCount,
                    total: entry.total,
                    tipoCliente: entry.tipoCliente,
                    ultimaCompra: entry.ultimaCompra,
                    fuente: 'Ventas_Biocambio_2026_Final.xlsx',
                },
            });
            pending++;
            if (pending >= 400) {
                await batch.commit();
                batch = db.batch();
                pending = 0;
            }
        }
    }

    if (EXECUTE && pending > 0) await batch.commit();

    console.log('\n──────────────── RESUMEN ────────────────');
    console.log(`Ya tenían la etiqueta:              ${alreadyTagged}`);
    console.log(`Nuevas conversaciones etiquetadas:  ${newlyTagged}${EXECUTE ? ' (escritas)' : ''}`);
    console.log(`Sin match en el ledger de ventas:   ${noMatch}`);
    if (sampleTagged.length > 0) {
        console.log('\nEjemplos:');
        sampleTagged.forEach(s => console.log(`  · ${s}`));
    }

    if (!EXECUTE) {
        console.log('\n👉 DRY RUN: no se escribió nada. Corre de nuevo con --execute si el resumen se ve correcto.');
    } else {
        console.log('\n✅ Etiquetas escritas en Firestore.');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
