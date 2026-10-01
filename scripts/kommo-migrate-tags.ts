/**
 * Migración segura de Kommo → Biocambio360: trae los contactos de Kommo (nombre, apellido, etapa,
 * etiquetas, localidad, dirección, observación) y los fusiona en la colección `customers` existente,
 * SIN sobrescribir ni borrar nada.
 *
 * Por diseño es no-destructiva:
 *  - Todo lo que trae de Kommo se guarda bajo campos con prefijo `kommo*` (kommoNombre, kommoApellido,
 *    kommoEtapa, kommoLocalidad, kommoDireccion, kommoObservacion) en clientes que YA existen aquí
 *    (emparejados por celular) — nunca toca nombre, dirección, historial de compras, etc. del cliente
 *    real. Las etiquetas se AGREGAN (Firestore arrayUnion) al campo `externalTags`.
 *  - Los contactos de Kommo que NO logran emparejarse con un cliente existente por celular se guardan
 *    en la colección aparte `kommo_migration_unmatched` para revisión manual — nunca se crea un cliente
 *    "adivinado" a partir de datos de Kommo.
 *  - Por defecto corre en modo DRY RUN (no escribe nada): solo reporta qué haría.
 *
 * Campos cubiertos (de los 8 que pidió el negocio) y de dónde salen:
 *  - Nombre / Apellido → contact.first_name / contact.last_name (campos nativos de Kommo, no custom).
 *  - Etiqueta          → _embedded.tags (ya migrado desde el inicio).
 *  - Etapa             → el lead vinculado al contacto (_embedded.leads[0]) resuelto contra
 *                        /api/v4/leads/pipelines (este Kommo tiene un solo pipeline "Embudo de ventas").
 *  - Localidad         → custom_fields_values field_id 1287488.
 *  - Dirección         → custom_fields_values field_id 1291908.
 *  - Observación/Nota  → custom_fields_values field_id 1291916.
 *  - Historial         → investigado y NO incluido: se probó GET /leads/{id}/notes y
 *                        /contacts/{id}/notes en una muestra de contactos/leads reales y todos
 *                        devolvieron 204 (sin notas). Lo que se ve como "Historial" en la tarjeta de
 *                        Kommo es el hilo de chat de WhatsApp propio de su integración de mensajería,
 *                        no el timeline de notas genérico — no es extraíble por esta vía sin acceso
 *                        a esa integración específica.
 *
 * Requiere las variables de entorno KOMMO_HOST y KOMMO_TOKEN (token largo de una Integración Privada
 * de Kommo: Ajustes → Integraciones → Crear integración → Privada → "Token de acceso a largo plazo").
 * Sin ellas, el script se detiene con un mensaje claro — no intenta adivinar ni continuar a medias.
 *
 * Uso:
 *   npx tsx scripts/kommo-migrate-tags.ts                 → dry run (reporta, no escribe)
 *   npx tsx scripts/kommo-migrate-tags.ts --execute        → escribe de verdad
 *   npx tsx scripts/kommo-migrate-tags.ts --limit=50       → limita cuántos contactos de Kommo procesa (pruebas)
 *   npx tsx scripts/kommo-migrate-tags.ts --dump-preview   → además, vuelca el detalle de CADA contacto
 *                                                             (emparejado o no) a las colecciones de solo
 *                                                             lectura kommo_migration_preview_matched /
 *                                                             _unmatched, para revisarlo paginado en
 *                                                             /admin/kommo-preview antes de decidir --execute.
 *                                                             Es independiente de --execute: nunca toca
 *                                                             `customers`, solo estas colecciones de staging.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Carga manual de .env.local (no se asume que el entorno ya lo tenga cargado) ───
function loadEnvLocal() {
    try {
        const raw = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
        const re = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/gm;
        let match: RegExpExecArray | null;
        while ((match = re.exec(raw))) {
            const key = match[1];
            let value = match[2];
            // Puede venir con varias capas de comillas envolventes ("'...'" incluido) — se pelan todas.
            while (
                (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
                (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
            ) {
                value = value.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = value;
        }
    } catch {
        // sin .env.local: seguimos, puede que las vars ya estén en el entorno (CI, shell export, etc.)
    }
}
loadEnvLocal();

/**
 * En este .env.local, FIREBASE_SERVICE_ACCOUNT quedó guardado sin las comillas internas del JSON
 * (ej. `{type:service_account,project_id:...}` en vez de `{"type":"service_account",...}`), de una
 * subida anterior a Vercel. Lo reconstruye antes de que firebase-admin intente JSON.parse-arlo.
 */
function repairDequotedServiceAccountJson() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw || raw.trim().startsWith('{"')) return; // ya es JSON válido, no tocar

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
        JSON.parse(fixed); // valida antes de reemplazar
        process.env.FIREBASE_SERVICE_ACCOUNT = fixed;
        console.log('  [env] FIREBASE_SERVICE_ACCOUNT reconstruido (venía sin comillas internas).');
    } catch (e) {
        console.error('  [env] No se pudo reconstruir FIREBASE_SERVICE_ACCOUNT:', e instanceof Error ? e.message : e);
    }
}
repairDequotedServiceAccountJson();

import { getAdminDB } from '../src/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const KOMMO_HOST = process.env.KOMMO_HOST;
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DUMP_PREVIEW = args.includes('--dump-preview');
const limitArg = args.find(a => a.startsWith('--limit='));
const CONTACT_LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const startPageArg = args.find(a => a.startsWith('--start-page='));
const START_PAGE = startPageArg ? Number(startPageArg.split('=')[1]) : 1;

// IDs de custom fields descubiertos inspeccionando /api/v4/contacts/custom_fields en esta cuenta Kommo.
const FIELD_ID_LOCALIDAD = 1287488;
const FIELD_ID_DIRECCION = 1291908;
const FIELD_ID_OBSERVACION = 1291916;
const FIELD_ID_TIPO_CLIENTE = 1287492;
const FIELD_ID_CEDULA = 1287496;
const FIELD_ID_TELEFONO_2 = 1291906;

// IDs de custom fields de LEADS (/api/v4/leads/custom_fields) — separados de los de contacto.
// UTM/gclid/fbclid existen como campos pero están vacíos incluso en leads creados hoy: no se usan,
// no se migran. "Próxima cita" tampoco tiene ningún valor poblado en una muestra de 1,000 leads.
const LEAD_FIELD_ID_OBSERVACION = 1308958;
const LEAD_FIELD_ID_NOTA = 1308960;
const LEAD_FIELD_ID_NOTA_1 = 1234424;

interface KommoContact {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    custom_fields_values?: Array<{ field_id?: number; field_code?: string; values?: Array<{ value?: string }> }>;
    _embedded?: { tags?: Array<{ id: number; name: string }>; leads?: Array<{ id: number }> };
}

/** La API de Kommo corta la conexión de vez en cuando en corridas largas (ECONNRESET) — reintenta con backoff. */
async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
    for (let i = 1; i <= attempts; i++) {
        try {
            return await fetch(url, { headers: { Authorization: `Bearer ${KOMMO_TOKEN}` } });
        } catch (err) {
            if (i === attempts) throw err;
            const waitMs = 2000 * i;
            console.warn(`  ⚠️  Fallo de red (intento ${i}/${attempts}) en ${url}: ${err instanceof Error ? err.message : err}. Reintentando en ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw new Error('unreachable');
}

async function fetchContactsPage(page: number): Promise<{ contacts: KommoContact[]; hasMore: boolean }> {
    const url = `https://${KOMMO_HOST}/api/v4/contacts?with=tags,leads&page=${page}&limit=250`;
    const res = await fetchWithRetry(url);
    if (res.status === 204) return { contacts: [], hasMore: false };
    if (!res.ok) {
        throw new Error(`Kommo API ${res.status} en página ${page}: ${await res.text().catch(() => '')}`);
    }
    const data = (await res.json()) as { _embedded?: { contacts?: KommoContact[] }; _links?: { next?: unknown } };
    const contacts = data._embedded?.contacts ?? [];
    return { contacts, hasMore: contacts.length === 250 };
}

interface LeadData {
    statusId: number;
    observacion?: string;
    nota?: string;
    nota1?: string;
}

/** Trae todos los leads (id → status_id + notas/observación propias del lead) para resolver la "Etapa"
 *  de cada contacto y, de paso, capturar las pocas (~3%) que sí tienen texto libre de seguimiento. */
async function fetchAllLeadDataMap(): Promise<Map<number, LeadData>> {
    const map = new Map<number, LeadData>();
    let page = 1;
    while (true) {
        const url = `https://${KOMMO_HOST}/api/v4/leads?page=${page}&limit=250`;
        const res = await fetchWithRetry(url);
        if (res.status === 204) break;
        if (!res.ok) throw new Error(`Kommo API ${res.status} (leads) en página ${page}: ${await res.text().catch(() => '')}`);
        const data = (await res.json()) as {
            _embedded?: {
                leads?: Array<{
                    id: number;
                    status_id: number;
                    custom_fields_values?: Array<{ field_id?: number; values?: Array<{ value?: string }> }> | null;
                }>;
            };
        };
        const leads = data._embedded?.leads ?? [];
        if (leads.length === 0) break;
        for (const l of leads) {
            const findLeadField = (fieldId: number) => {
                const raw = l.custom_fields_values?.find(f => f.field_id === fieldId)?.values?.[0]?.value;
                return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
            };
            map.set(l.id, {
                statusId: l.status_id,
                observacion: findLeadField(LEAD_FIELD_ID_OBSERVACION),
                nota: findLeadField(LEAD_FIELD_ID_NOTA),
                nota1: findLeadField(LEAD_FIELD_ID_NOTA_1),
            });
        }
        console.log(`  [Etapas] Página ${page}: ${leads.length} leads (acumulado: ${map.size})`);
        if (leads.length < 250) break;
        page++;
    }
    return map;
}

/** Chats de WhatsApp que llegaron a Kommo pero NUNCA se convirtieron en contacto/lead — se pierden del
 *  embudo por completo. Se guardan aparte para que alguien los revise manualmente; no son clientes. */
async function fetchUnsortedLeads(): Promise<Array<{ uid: string; nombre: string; createdAt: number; lastMessageAt?: number }>> {
    const results: Array<{ uid: string; nombre: string; createdAt: number; lastMessageAt?: number }> = [];
    let page = 1;
    while (true) {
        const url = `https://${KOMMO_HOST}/api/v4/leads/unsorted?page=${page}&limit=250`;
        const res = await fetchWithRetry(url);
        if (res.status === 204) break;
        if (!res.ok) throw new Error(`Kommo API ${res.status} (unsorted) en página ${page}: ${await res.text().catch(() => '')}`);
        const data = (await res.json()) as {
            _embedded?: {
                unsorted?: Array<{
                    uid: string;
                    created_at: number;
                    metadata?: { client?: { name?: string }; from?: string; last_message_text?: number };
                }>;
            };
        };
        const items = data._embedded?.unsorted ?? [];
        if (items.length === 0) break;
        for (const u of items) {
            results.push({
                uid: u.uid,
                nombre: u.metadata?.client?.name || u.metadata?.from || 'Sin nombre',
                createdAt: u.created_at,
                lastMessageAt: u.metadata?.last_message_text,
            });
        }
        if (items.length < 250) break;
        page++;
    }
    return results;
}

/** Nombres de los estados de pipeline (Etapa) — este Kommo tiene un solo pipeline "Embudo de ventas". */
async function fetchStatusNameMap(): Promise<Map<number, string>> {
    const url = `https://${KOMMO_HOST}/api/v4/leads/pipelines`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`Kommo API ${res.status} (pipelines): ${await res.text().catch(() => '')}`);
    const data = (await res.json()) as { _embedded?: { pipelines?: Array<{ _embedded?: { statuses?: Array<{ id: number; name: string }> } }> } };
    const map = new Map<number, string>();
    for (const p of data._embedded?.pipelines ?? []) {
        for (const s of p._embedded?.statuses ?? []) map.set(s.id, s.name);
    }
    return map;
}

function extractPhone(c: KommoContact): string | null {
    const field = c.custom_fields_values?.find(f => f.field_code === 'PHONE');
    const raw = field?.values?.[0]?.value;
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
}

function extractCustomField(c: KommoContact, fieldId: number): string | null {
    const field = c.custom_fields_values?.find(f => f.field_id === fieldId);
    const raw = field?.values?.[0]?.value;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** "Teléfono 2" es un campo de texto libre (no multitext como el principal) — mismo criterio de limpieza. */
function extractSecondaryPhone(c: KommoContact): string | null {
    const raw = extractCustomField(c, FIELD_ID_TELEFONO_2);
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
}

/** Same phone-format ambiguity the rest of the codebase already handles (with/without 57, +57). */
function phoneVariants(digits: string): string[] {
    const last10 = digits.slice(-10);
    return Array.from(new Set([digits, last10, `57${last10}`]));
}

/** Prueba el celular principal primero y, si no hay match, el "Teléfono 2" del contacto. */
async function findExistingCustomerRef(db: FirebaseFirestore.Firestore, candidates: string[]) {
    const customersCol = db.collection('customers');
    for (const digits of candidates) {
        for (const variant of phoneVariants(digits)) {
            const snap = await customersCol.doc(variant).get();
            if (snap.exists) return snap;
        }
    }
    return null;
}

/**
 * Acumula escrituras de preview (kommo_migration_preview_matched / _unmatched) en lotes de Firestore,
 * para poder revisarlas paginadas en /admin/kommo-preview sin tener que volver a pegarle a la API de
 * Kommo. No tiene nada que ver con --execute: siempre es de solo lectura para `customers`.
 */
class PreviewBatcher {
    private db: FirebaseFirestore.Firestore;
    private batch: FirebaseFirestore.WriteBatch;
    private pending = 0;
    private committed = 0;

    constructor(db: FirebaseFirestore.Firestore) {
        this.db = db;
        this.batch = db.batch();
    }

    async add(collection: string, docId: string, data: Record<string, unknown>) {
        this.batch.set(this.db.collection(collection).doc(docId), data, { merge: false });
        this.pending++;
        if (this.pending >= 400) await this.flush();
    }

    async flush() {
        if (this.pending === 0) return;
        await this.batch.commit();
        this.committed += this.pending;
        this.batch = this.db.batch();
        this.pending = 0;
    }

    get totalCommitted() {
        return this.committed + this.pending;
    }
}

async function main() {
    console.log('====================================================');
    console.log(`🔄 MIGRACIÓN DE ETIQUETAS KOMMO → BIOCAMBIO360  ${EXECUTE ? '(ESCRIBIENDO EN FIRESTORE)' : '(DRY RUN — no escribe nada)'}`);
    console.log('====================================================\n');

    if (!KOMMO_HOST || !KOMMO_TOKEN) {
        console.error('❌ Faltan KOMMO_HOST y/o KOMMO_TOKEN en el entorno (.env.local o variables exportadas).');
        console.error('   Genera un token en Kommo: Ajustes → Integraciones → Crear integración → Privada,');
        console.error('   copia el "Token de acceso a largo plazo" y el subdominio (host), y vuelve a correr este script.');
        process.exit(1);
    }

    const db = getAdminDB();
    const tagFrequency = new Map<string, number>();
    let totalContacts = 0;
    let matched = 0;
    let unmatched = 0;
    let noPhone = 0;
    let taggedWritten = 0;
    let withEtapa = 0;
    let withLocalidad = 0;
    let withDireccion = 0;
    let withObservacion = 0;
    let withApellido = 0;
    let withCedula = 0;
    let withTipoCliente = 0;
    let withTelefono2 = 0;
    let matchedByTelefono2 = 0;
    let withLeadNota = 0;
    const sampleUnmatched: Array<{ id: number; name: string; phone: string | null; tags: string[] }> = [];
    const preview = DUMP_PREVIEW ? new PreviewBatcher(db) : null;

    console.log('📥 Cargando pipelines y leads de Kommo (para resolver la Etapa de cada contacto)...');
    const statusNameMap = await fetchStatusNameMap();
    const leadDataMap = await fetchAllLeadDataMap();
    console.log(`   ${statusNameMap.size} estados de pipeline, ${leadDataMap.size} leads cargados.\n`);

    let page = START_PAGE;
    if (START_PAGE > 1) console.log(`⏩ Retomando desde la página ${START_PAGE} (--start-page).\n`);
    while (totalContacts < CONTACT_LIMIT) {
        const { contacts, hasMore } = await fetchContactsPage(page);
        if (contacts.length === 0) break;

        for (const c of contacts) {
            if (totalContacts >= CONTACT_LIMIT) break;
            totalContacts++;

            const tags = (c._embedded?.tags ?? []).map(t => t.name).filter(Boolean);
            tags.forEach(t => tagFrequency.set(t, (tagFrequency.get(t) ?? 0) + 1));

            const leadIds = (c._embedded?.leads ?? []).map(l => l.id);
            const leadDatas = leadIds.map(id => leadDataMap.get(id)).filter((d): d is LeadData => d !== undefined);
            const statusId = leadDatas.find(d => d.statusId !== undefined)?.statusId;
            const etapa = statusId !== undefined ? statusNameMap.get(statusId) ?? null : null;
            const leadNotaParts = leadDatas.flatMap(d => [d.observacion, d.nota, d.nota1]).filter((v): v is string => !!v);
            const leadNota = leadNotaParts.length > 0 ? Array.from(new Set(leadNotaParts)).join(' | ') : null;
            const localidad = extractCustomField(c, FIELD_ID_LOCALIDAD);
            const direccion = extractCustomField(c, FIELD_ID_DIRECCION);
            const observacion = extractCustomField(c, FIELD_ID_OBSERVACION);
            const tipoCliente = extractCustomField(c, FIELD_ID_TIPO_CLIENTE);
            const cedula = extractCustomField(c, FIELD_ID_CEDULA);
            const telefono2 = extractSecondaryPhone(c);
            const apellido = c.last_name?.trim() || null;

            if (etapa) withEtapa++;
            if (localidad) withLocalidad++;
            if (direccion) withDireccion++;
            if (observacion) withObservacion++;
            if (apellido) withApellido++;
            if (cedula) withCedula++;
            if (tipoCliente) withTipoCliente++;
            if (telefono2) withTelefono2++;
            if (leadNota) withLeadNota++;

            const phone = extractPhone(c);
            const usablePhone = phone || telefono2;
            if (!usablePhone) {
                noPhone++;
                if (preview) {
                    await preview.add('kommo_migration_preview_unmatched', String(c.id), {
                        kommoContactId: String(c.id),
                        kommoContactIdNum: c.id,
                        kommoNombre: c.first_name?.trim() || '',
                        kommoApellido: apellido || '',
                        nombreCompletoKommo: c.name || '',
                        celular: '',
                        etiquetas: tags,
                        etapa: etapa || '',
                        localidad: localidad || '',
                        direccion: direccion || '',
                        observacion: observacion || '',
                        tipoCliente: tipoCliente || '',
                        cedula: cedula || '',
                        leadNota: leadNota || '',
                        motivoSinMatch: 'sin_celular_utilizable',
                        generatedAt: FieldValue.serverTimestamp(),
                    });
                }
                continue;
            }

            let snap = phone ? await findExistingCustomerRef(db, [phone]) : null;
            let viaSecondary = false;
            if (!snap && telefono2) {
                snap = await findExistingCustomerRef(db, [telefono2]);
                if (snap) viaSecondary = true;
            }
            if (viaSecondary) matchedByTelefono2++;

            if (!snap) {
                unmatched++;
                if (sampleUnmatched.length < 25) {
                    sampleUnmatched.push({ id: c.id, name: c.name, phone: usablePhone, tags });
                }
                if (EXECUTE) {
                    await db.collection('kommo_migration_unmatched').doc(String(c.id)).set({
                        kommoContactId: String(c.id),
                        nombre: c.name || '',
                        apellido: apellido || '',
                        celular: usablePhone,
                        etiquetas: tags,
                        etapa: etapa || '',
                        localidad: localidad || '',
                        direccion: direccion || '',
                        observacion: observacion || '',
                        tipoCliente: tipoCliente || '',
                        cedula: cedula || '',
                        leadNota: leadNota || '',
                        revisadoManualmente: false,
                        migratedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
                if (preview) {
                    await preview.add('kommo_migration_preview_unmatched', String(c.id), {
                        kommoContactId: String(c.id),
                        kommoContactIdNum: c.id,
                        kommoNombre: c.first_name?.trim() || '',
                        kommoApellido: apellido || '',
                        nombreCompletoKommo: c.name || '',
                        celular: usablePhone || '',
                        etiquetas: tags,
                        etapa: etapa || '',
                        localidad: localidad || '',
                        direccion: direccion || '',
                        observacion: observacion || '',
                        tipoCliente: tipoCliente || '',
                        cedula: cedula || '',
                        leadNota: leadNota || '',
                        motivoSinMatch: 'sin_cliente_con_ese_celular',
                        generatedAt: FieldValue.serverTimestamp(),
                    });
                }
                continue;
            }

            matched++;
            const hasAnyKommoData = tags.length > 0 || apellido || etapa || localidad || direccion || observacion || tipoCliente || cedula || leadNota;
            if (EXECUTE && hasAnyKommoData) {
                const update: Record<string, unknown> = {
                    kommoContactId: String(c.id),
                    kommoMigratedAt: Timestamp.now(),
                };
                if (tags.length > 0) update.externalTags = FieldValue.arrayUnion(...tags);
                if (c.first_name?.trim()) update.kommoNombre = c.first_name.trim();
                if (apellido) update.kommoApellido = apellido;
                if (etapa) update.kommoEtapa = etapa;
                if (tipoCliente) update.kommoTipoCliente = tipoCliente;
                if (cedula) update.kommoCedula = cedula;
                if (leadNota) update.kommoLeadNota = leadNota;
                if (localidad) update.kommoLocalidad = localidad;
                if (direccion) update.kommoDireccion = direccion;
                if (observacion) update.kommoObservacion = observacion;

                await snap.ref.set(update, { merge: true });
                taggedWritten++;
            }

            if (preview) {
                const existing = snap.data() || {};
                await preview.add('kommo_migration_preview_matched', String(c.id), {
                    kommoContactId: String(c.id),
                    kommoContactIdNum: c.id,
                    customerId: snap.id,
                    celular: usablePhone || '',
                    emparejadoPorTelefono2: viaSecondary,
                    // Lo que ya existe hoy en el cliente real (antes de tocar nada)
                    clienteActualNombre: existing.nombre || '',
                    clienteActualDireccion: existing.direccion || '',
                    clienteActualCiudad: existing.ciudad || '',
                    clienteActualExternalTags: existing.externalTags || [],
                    clienteActualTotalSpent: existing.totalSpent || 0,
                    clienteActualOrdersCount: existing.ordersCount || 0,
                    // Lo que se AGREGARÍA (campos kommo*, nunca pisa lo de arriba)
                    kommoNombre: c.first_name?.trim() || '',
                    kommoApellido: apellido || '',
                    kommoEtiquetasNuevas: tags,
                    kommoEtapa: etapa || '',
                    kommoLocalidad: localidad || '',
                    kommoDireccion: direccion || '',
                    kommoObservacion: observacion || '',
                    kommoTipoCliente: tipoCliente || '',
                    kommoCedula: cedula || '',
                    kommoLeadNota: leadNota || '',
                    generatedAt: FieldValue.serverTimestamp(),
                });
            }
        }

        console.log(`  Página ${page}: ${contacts.length} contactos procesados (acumulado: ${totalContacts})`);
        page++;
        if (!hasMore) break;
    }

    // Chats de WhatsApp que nunca se convirtieron en contacto — se pierden del embudo. Mismo criterio
    // dry-run/--execute que el resto del script: por defecto solo se reportan, no se escriben.
    console.log('\n📥 Revisando chats de WhatsApp que nunca se convirtieron en contacto (unsorted)...');
    const unsortedLeads = await fetchUnsortedLeads();
    if (EXECUTE && unsortedLeads.length > 0) {
        let unsortedBatch = db.batch();
        let unsortedPending = 0;
        for (const u of unsortedLeads) {
            unsortedBatch.set(db.collection('kommo_unsorted_chats').doc(u.uid), {
                kommoUid: u.uid,
                nombre: u.nombre,
                createdAt: new Date(u.createdAt * 1000).toISOString(),
                revisadoManualmente: false,
                migratedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            unsortedPending++;
            if (unsortedPending >= 400) {
                await unsortedBatch.commit();
                unsortedBatch = db.batch();
                unsortedPending = 0;
            }
        }
        if (unsortedPending > 0) await unsortedBatch.commit();
    }
    console.log(`   ${unsortedLeads.length} chats sin clasificar encontrados${EXECUTE ? ' y guardados en kommo_unsorted_chats' : ' (dry run: no se escribió nada)'} (nunca llegaron a ser contacto).`);

    if (preview) {
        await preview.flush();
        await db.collection('kommo_migration_preview_meta').doc('summary').set({
            totalContacts,
            matched,
            unmatched,
            noPhone,
            withEtapa,
            withLocalidad,
            withDireccion,
            withObservacion,
            withApellido,
            withCedula,
            withTipoCliente,
            withTelefono2,
            matchedByTelefono2,
            withLeadNota,
            unsortedChats: unsortedLeads.length,
            generatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`\n📋 Preview volcado a Firestore: ${matched} en kommo_migration_preview_matched, ${unmatched + noPhone} en kommo_migration_preview_unmatched.`);
        console.log('   Revísalo paginado en /admin/kommo-preview.');
    }

    const topTags = [...tagFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

    console.log('\n──────────────── RESUMEN ────────────────');
    console.log(`Contactos de Kommo procesados:      ${totalContacts}`);
    console.log(`Emparejados con cliente existente:  ${matched}${EXECUTE ? ` (datos escritos en ${taggedWritten})` : ''}`);
    console.log(`  De esos, emparejados solo por Teléfono 2: ${matchedByTelefono2}`);
    console.log(`Sin celular utilizable en Kommo:    ${noPhone}`);
    console.log(`Sin cliente existente (revisar):    ${unmatched}${EXECUTE ? ' (guardados en kommo_migration_unmatched)' : ''}`);
    console.log(`\nCobertura de campos (de los ${totalContacts} contactos procesados):`);
    console.log(`  · Apellido (last_name):    ${withApellido}`);
    console.log(`  · Etapa (pipeline):        ${withEtapa}`);
    console.log(`  · Localidad:               ${withLocalidad}`);
    console.log(`  · Dirección:               ${withDireccion}`);
    console.log(`  · Observación (contacto):  ${withObservacion}`);
    console.log(`  · Tipo de cliente:         ${withTipoCliente}`);
    console.log(`  · Cédula:                  ${withCedula}`);
    console.log(`  · Teléfono 2:              ${withTelefono2}`);
    console.log(`  · Nota/Observación (lead): ${withLeadNota}`);
    console.log(`  · Chats sin clasificar (nunca llegaron a contacto): ${unsortedLeads.length}`);
    console.log(`  · Historial de notas genéricas: no disponible vía API (ver comentario al inicio del script). Sí hay ~122 "tareas" (tasks) en toda la cuenta, pero no se migran por bajo volumen.`);
    console.log(`\nEtiquetas encontradas (top ${topTags.length}):`);
    topTags.forEach(([tag, count]) => console.log(`  · ${tag}  (${count})`));

    if (sampleUnmatched.length > 0) {
        console.log(`\nEjemplos sin emparejar (primeros ${sampleUnmatched.length}):`);
        sampleUnmatched.forEach(s => console.log(`  · #${s.id} ${s.name} · ${s.phone} · [${s.tags.join(', ')}]`));
    }

    if (!EXECUTE) {
        console.log('\n👉 Esto fue un DRY RUN: no se escribió nada en Firestore.');
        console.log('   Revisa el resumen y, si se ve correcto, corre de nuevo con --execute.');
    } else {
        console.log('\n✅ Migración escrita en Firestore.');
    }
}

main().catch(err => {
    console.error('Fatal error en la migración:', err);
    process.exit(1);
});
