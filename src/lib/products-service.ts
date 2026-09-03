import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, PRODUCTOS } from './products';

const IS_DEV = process.env.NODE_ENV === 'development';
const CACHE_TIME = IS_DEV ? 0 : 1000 * 60 * 5; // 0 cache in development, 5 minutes in production
let cachedRawProducts: Product[] | null = null;
let lastFetchTime = 0;

const productsCollection = collection(db, 'products');

const SUPPLY_KEYWORDS = [
    'aroma', 'bala', 'bicarbonato', 'campana', 'cremera', 'cuchara',
    'dispensador', 'domicilio', 'entrega envase', 'envase', 'etiqueta',
    'jarra medidora', 'pistolas', 'cuchillas', 'portacuchillas', 'registro',
    'spray', 'tapa', 'valvula', 'válvula', 'tapon', 'tapón', 'gatillo', 'atomizador',
    'frasco', 'garrafa vacia', 'garrafa vacía'
];

export interface GetAllProductsOptions {
    forceRefresh?: boolean;
    includeDrafts?: boolean;
    includeArchived?: boolean;
}

function isSupplyItem(p: Product): boolean {
    if (p.id === 'desinfectante-bicarbonato' || p.id.includes('destapacanerias')) return false;
    const name = p.nombre.toLowerCase();
    const id = p.id.toLowerCase();
    return SUPPLY_KEYWORDS.some(kw => name.includes(kw) || id.includes(kw));
}

/**
 * Gets products from Firestore with fallback to static catalog.
 * By default (public storefront), returns only ACTIVE products (drafts and archived excluded).
 * Pass { includeDrafts: true, includeArchived: true } for Admin CMS view.
 */
export async function getAllProducts(
    optionsOrForceRefresh: boolean | GetAllProductsOptions = false
): Promise<Product[]> {
    const options: GetAllProductsOptions = typeof optionsOrForceRefresh === 'boolean'
        ? { forceRefresh: optionsOrForceRefresh }
        : (optionsOrForceRefresh || {});

    const {
        forceRefresh = false,
        includeDrafts = false,
        includeArchived = false
    } = options;

    if (forceRefresh || !cachedRawProducts || Date.now() - lastFetchTime >= CACHE_TIME) {
        const dbProductsMap = new Map<string, Product>();
        try {
            const q = query(productsCollection, orderBy('nombre', 'asc'));
            const snapshot = await getDocs(q);
            snapshot.forEach((docSnap) => {
                dbProductsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Product);
            });
        } catch (e) {
            console.warn('Warning: Could not fetch products from Firestore, using static fallback:', e);
        }

        const allProductsMap = new Map<string, Product>();

        // 1. Load static catalog as base template
        PRODUCTOS.forEach(p => {
            const dbP = dbProductsMap.get(p.id);
            if (dbP) {
                allProductsMap.set(p.id, {
                    ...p,
                    ...dbP,
                    precios: dbP.precios && Object.keys(dbP.precios).length > 0 ? dbP.precios : p.precios,
                    competidorPromedio: dbP.competidorPromedio || p.competidorPromedio,
                    stock: dbP.stock || p.stock,
                    nombre: dbP.nombre || p.nombre,
                    slogan: dbP.slogan || p.slogan,
                    descripcion: dbP.descripcion || p.descripcion,
                    shortDescription: dbP.shortDescription || p.shortDescription,
                    categoria: dbP.categoria || p.categoria,
                    subcategoria: dbP.subcategoria !== undefined ? dbP.subcategoria : p.subcategoria,
                    imgFile: dbP.imgFile || p.imgFile,
                    imgFiles: dbP.imgFiles || p.imgFiles,
                    badge: dbP.badge !== undefined ? dbP.badge : p.badge,
                    beneficios: dbP.beneficios && dbP.beneficios.length > 0 ? dbP.beneficios : p.beneficios,
                    faqs: dbP.faqs && dbP.faqs.length > 0 ? dbP.faqs : p.faqs,
                    sku: dbP.sku || p.sku,
                    status: dbP.status || 'active',
                    isDeleted: (dbP as any).isDeleted ?? (dbP.status === 'archived'),
                    diferenciadores: dbP.diferenciadores || p.diferenciadores,
                    instrucciones: dbP.instrucciones || p.instrucciones,
                    ph: dbP.ph !== undefined ? dbP.ph : p.ph,
                    dilucion: dbP.dilucion !== undefined ? dbP.dilucion : p.dilucion,
                    biodegradabilidad: dbP.biodegradabilidad !== undefined ? dbP.biodegradabilidad : p.biodegradabilidad,
                    usoRecomendado: dbP.usoRecomendado !== undefined ? dbP.usoRecomendado : p.usoRecomendado,
                    schwartzCopy: dbP.schwartzCopy || p.schwartzCopy,
                    manualContent: dbP.manualContent || p.manualContent
                });
            } else {
                allProductsMap.set(p.id, {
                    ...p,
                    status: p.status || 'active',
                    isDeleted: false
                });
            }
        });

        // 2. Include any NEW custom products created by the admin in Firestore that are not in the static file
        dbProductsMap.forEach((dbP, id) => {
            if (!allProductsMap.has(id)) {
                allProductsMap.set(id, {
                    ...dbP,
                    status: dbP.status || 'active',
                    isDeleted: (dbP as any).isDeleted ?? (dbP.status === 'archived')
                });
            }
        });

        cachedRawProducts = Array.from(allProductsMap.values())
            .filter(p => !isSupplyItem(p))
            .map(p => ensureStockDefaults(p));
        lastFetchTime = Date.now();
    }

    // Filter according to requested visibility options:
    return (cachedRawProducts || []).filter(p => {
        if (!includeArchived && (p.status === 'archived' || (p as any).isDeleted)) {
            return false;
        }
        if (!includeDrafts && p.status === 'draft') {
            return false;
        }
        return true;
    });
}

/**
 * Gets a specific product by its ID (slug).
 * By default, returns null if product is draft, archived, or deleted.
 */
export async function getProductById(id: string, includeDrafts = false): Promise<Product | null> {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    const fallback = PRODUCTOS.find(p => p.id === id);

    let res: Product | null = null;
    if (docSnap.exists()) {
        const dbData = { id: docSnap.id, ...docSnap.data() } as Product;
        if ((dbData as any).isDeleted || dbData.status === 'archived' || (!includeDrafts && dbData.status === 'draft')) {
            return null;
        }
        if (fallback) {
            res = {
                ...fallback,
                ...dbData,
                precios: dbData.precios && Object.keys(dbData.precios).length > 0 ? dbData.precios : fallback.precios,
            };
        } else {
            res = dbData;
        }
    } else {
        res = fallback || null;
        if (res && !includeDrafts && res.status === 'draft') {
            return null;
        }
    }

    return res ? ensureStockDefaults(res) : null;
}

function cleanBadge(badge?: string): string {
    if (!badge) return '';
    return badge.replace(/\s*\.\d{3,}$/g, '').trim();
}

/**
 * Helper to ensure a product has valid stock data per size
 */
function ensureStockDefaults(product: Product): Product {
    const stock: Record<string, number> = product.stock ? { ...product.stock } : {};
    const defaultThreshold = product.minStockThreshold ?? 5;
    const sku = product.sku || `BIO-${product.id.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10)}`;

    // Initialize stock for all price sizes if not present
    if (product.precios) {
        Object.keys(product.precios).forEach(size => {
            if (stock[size] === undefined) {
                // Default initial stock per size
                stock[size] = size === '20L' ? 10 : size === '10L' ? 15 : size === '3.8L' ? 30 : 25;
            }
        });
    }

    return {
        ...product,
        badge: cleanBadge(product.badge),
        stock,
        minStockThreshold: defaultThreshold,
        sku,
        status: product.status || 'active'
    };
}

export interface PriceAuditLog {
    id?: string;
    timestamp: string;
    userEmail: string;
    userName: string;
    userRole: string;
    productId: string;
    productName: string;
    size: string;
    oldPrice: number;
    newPrice: number;
    oldCompetitorPrice?: number;
    newCompetitorPrice?: number;
    difference: number;
    percentageChange: number;
    source?: string;
}

const priceAuditCollection = collection(db, 'price_audit_logs');

/**
 * Records price changes in the audit log
 */
export async function recordPriceAuditLogs(logs: Omit<PriceAuditLog, 'id'>[]): Promise<void> {
    if (!logs || logs.length === 0) return;
    try {
        for (const logItem of logs) {
            const logDocRef = doc(priceAuditCollection);
            await setDoc(logDocRef, {
                ...logItem,
                createdAt: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('[PriceAudit] Error saving price audit logs:', err);
    }
}

/**
 * Fetches recent price audit logs for traceability
 */
export async function getPriceAuditLogs(limitCount = 100): Promise<PriceAuditLog[]> {
    try {
        const q = query(priceAuditCollection, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const logs: PriceAuditLog[] = [];
        snapshot.forEach((docSnap) => {
            if (logs.length < limitCount) {
                logs.push({ id: docSnap.id, ...docSnap.data() } as PriceAuditLog);
            }
        });
        return logs;
    } catch (err) {
        console.warn('[PriceAudit] Could not fetch price audit logs from Firestore:', err);
        return [];
    }
}

/**
 * Recursively removes undefined values from an object so Firestore doesn't reject the write.
 */
function removeUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item)) as unknown as T;
    }
    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, typeof v === 'object' && v !== null ? removeUndefined(v) : v])
    ) as T;
}

/**
 * Saves or updates a product in Firestore (Admin CMS).
 * Validates and strips undefined fields to prevent Firestore setDoc exceptions.
 */
export async function saveProduct(
    product: Product,
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    // 1. Audit price changes if previous product exists
    try {
        const previousProduct = await getProductById(product.id);
        if (previousProduct && userContext) {
            const oldPrices = previousProduct.precios || {};
            const newPrices = product.precios || {};
            const oldCompetitors = previousProduct.competidorPromedio || {};
            const newCompetitors = product.competidorPromedio || {};
            
            const auditLogsToRecord: Omit<PriceAuditLog, 'id'>[] = [];
            const allSizes = Array.from(new Set([...Object.keys(oldPrices), ...Object.keys(newPrices)]));
            const now = new Date().toISOString();

            for (const size of allSizes) {
                const oldP = oldPrices[size] || 0;
                const newP = newPrices[size] || 0;
                const oldComp = oldCompetitors[size] || 0;
                const newComp = newCompetitors[size] || 0;

                const priceChanged = oldP !== newP && (oldP > 0 || newP > 0);
                const competitorChanged = oldComp !== newComp && (oldComp > 0 || newComp > 0);

                if (priceChanged || competitorChanged) {
                    const diff = newP - oldP;
                    const pct = oldP > 0 ? Number(((diff / oldP) * 100).toFixed(1)) : 100;
                    auditLogsToRecord.push({
                        timestamp: now,
                        userEmail: userContext.email || 'desconocido@biocambio360.com',
                        userName: userContext.nombre || 'Gestor / Logística',
                        userRole: userContext.role || 'logistico',
                        productId: product.id,
                        productName: product.nombre,
                        size,
                        oldPrice: oldP,
                        newPrice: newP,
                        oldCompetitorPrice: oldComp,
                        newCompetitorPrice: newComp,
                        difference: diff,
                        percentageChange: pct,
                        source: 'admin_panel'
                    });
                }
            }

            if (auditLogsToRecord.length > 0) {
                await recordPriceAuditLogs(auditLogsToRecord);
            }
        }
    } catch (auditErr) {
        console.warn('[PriceAudit] Warning while auditing prices:', auditErr);
    }

    const docRef = doc(db, 'products', product.id);
    const now = new Date().toISOString();
    const { id, ...data } = product;

    const rawPayload = {
        ...data,
        badge: cleanBadge(data.badge),
        isDeleted: product.status === 'archived' ? true : (product.isDeleted === true),
        status: product.status || 'active',
        updatedAt: now,
        createdAt: product.createdAt || now
    };
    
    const payload = removeUndefined(rawPayload);

    try {
        // Using setDoc to allow custom IDs (slugs)
        await setDoc(docRef, payload, { merge: true });
    } catch (error) {
        console.error('[saveProduct] Error guardando producto en Firestore:', error);
        throw error;
    }
    
    // Invalidate cache immediately
    cachedRawProducts = null;
    lastFetchTime = 0;
}

/**
 * Updates publication visibility status for a product (active, draft, archived)
 */
export async function updateProductVisibility(
    id: string, 
    status: 'active' | 'draft' | 'archived'
): Promise<void> {
    const docRef = doc(db, 'products', id);
    const updatedAt = new Date().toISOString();
    const isDeleted = status === 'archived';

    try {
        await setDoc(docRef, { status, isDeleted, updatedAt }, { merge: true });
    } catch (error) {
        console.error(`[updateProductVisibility] Error actualizando visibilidad de ${id}:`, error);
        throw error;
    }

    // Invalidate cache immediately
    cachedRawProducts = null;
    lastFetchTime = 0;
}

/**
 * Updates stock quantity for a specific product size
 */
export async function updateProductStock(id: string, size: string, newStockQuantity: number): Promise<void> {
    const product = await getProductById(id);
    if (!product) throw new Error('Producto no encontrado');

    const updatedStock = { ...(product.stock || {}), [size]: Math.max(0, newStockQuantity) };
    const docRef = doc(db, 'products', id);
    await setDoc(docRef, { stock: updatedStock, updatedAt: new Date().toISOString() }, { merge: true });

    cachedRawProducts = null;
    lastFetchTime = 0;
}

/**
 * Deletes a product (soft delete + purge)
 */
export async function deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, 'products', id);
    // Mark as archived / isDeleted to prevent fallback recovery
    await setDoc(docRef, { isDeleted: true, status: 'archived', updatedAt: new Date().toISOString() }, { merge: true });
    try {
        await deleteDoc(docRef);
    } catch (e) {
        console.warn('Warning: Soft-delete fallback applied for product:', id);
    }
    
    // Invalidate cache immediately
    cachedRawProducts = null;
    lastFetchTime = 0;
}

/**
 * ONE-TIME SCRIPT: Uploads the hardcoded products to Firestore
 * Also removes any Firestore documents that are no longer in the static catalog.
 */
export async function seedProductsToFirestore(): Promise<{ upserted: number; deleted: number }> {
    // 1. Get current IDs from Firestore
    const snapshot = await getDocs(productsCollection);
    const firestoreIds = new Set(snapshot.docs.map(d => d.id));

    // 2. Build set of canonical IDs from code
    const canonicalIds = new Set(PRODUCTOS.map(p => p.id));

    // 3. Delete stale documents (in Firestore but not in code)
    let deleted = 0;
    for (const fsId of firestoreIds) {
        if (!canonicalIds.has(fsId)) {
            await deleteDoc(doc(db, 'products', fsId));
            console.log(`🗑️  Deleted stale product: ${fsId}`);
            deleted++;
        }
    }

    // 4. Upsert all products from code
    for (const prod of PRODUCTOS) {
        await saveProduct(prod);
    }

    console.log(`✅ Seed complete: ${PRODUCTOS.length} upserted, ${deleted} deleted.`);
    return { upserted: PRODUCTOS.length, deleted };
}
