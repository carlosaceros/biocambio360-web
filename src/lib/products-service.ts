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
let cachedProducts: Product[] | null = null;
let lastFetchTime = 0;

const productsCollection = collection(db, 'products');

const SUPPLY_KEYWORDS = [
    'aroma', 'bala', 'bicarbonato', 'campana', 'cremera', 'cuchara',
    'dispensador', 'domicilio', 'entrega envase', 'envase', 'etiqueta',
    'jarra medidora', 'pistolas', 'cuchillas', 'portacuchillas', 'registro',
    'spray', 'tapa', 'valvula', 'válvula', 'tapon', 'tapón', 'gatillo', 'atomizador',
    'frasco', 'garrafa vacia', 'garrafa vacía'
];

function isSupplyItem(p: Product): boolean {
    if (p.id === 'desinfectante-bicarbonato' || p.id.includes('destapacanerias')) return false;
    const name = p.nombre.toLowerCase();
    const id = p.id.toLowerCase();
    return SUPPLY_KEYWORDS.some(kw => name.includes(kw) || id.includes(kw));
}

/**
 * Gets all products from Firestore with fallback to static catalog.
 * Live edits/creations/deletions from Admin Firestore take precedence.
 */
export async function getAllProducts(forceRefresh = false): Promise<Product[]> {
    if (!forceRefresh && cachedProducts && Date.now() - lastFetchTime < CACHE_TIME) {
        return cachedProducts;
    }

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
            // Check if product was deleted or archived
            if (dbP.status === 'archived' || (dbP as any).isDeleted) {
                return;
            }
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
                status: dbP.status || 'active'
            });
        } else {
            allProductsMap.set(p.id, p);
        }
    });

    // 2. Include any NEW custom products created by the admin in Firestore that are not in the static file
    dbProductsMap.forEach((dbP, id) => {
        if (!allProductsMap.has(id)) {
            if (dbP.status === 'archived' || (dbP as any).isDeleted) return;
            allProductsMap.set(id, dbP);
        }
    });

    cachedProducts = Array.from(allProductsMap.values())
        .filter(p => !isSupplyItem(p))
        .map(p => ensureStockDefaults(p));
    lastFetchTime = Date.now();
    return cachedProducts;
}

/**
 * Gets a specific product by its ID (slug)
 */
export async function getProductById(id: string): Promise<Product | null> {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    const fallback = PRODUCTOS.find(p => p.id === id);

    let res: Product | null = null;
    if (docSnap.exists()) {
        const dbData = { id: docSnap.id, ...docSnap.data() } as Product;
        if ((dbData as any).isDeleted || dbData.status === 'archived') {
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
    }

    return res ? ensureStockDefaults(res) : null;
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
        stock,
        minStockThreshold: defaultThreshold,
        sku,
        status: product.status || 'active'
    };
}

/**
 * Creates or overwrites a product in Firestore
 */
export async function saveProduct(product: Product): Promise<void> {
    const docRef = doc(db, 'products', product.id);
    const now = new Date().toISOString();
    const { id, ...data } = product;

    const payload = {
        ...data,
        isDeleted: false,
        status: product.status || 'active',
        updatedAt: now,
        createdAt: product.createdAt || now
    };
    
    // Using setDoc to allow custom IDs (slugs)
    await setDoc(docRef, payload, { merge: true });
    
    // Invalidate cache immediately
    cachedProducts = null;
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

    cachedProducts = null;
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
    cachedProducts = null;
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
