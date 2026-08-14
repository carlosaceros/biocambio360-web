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
 * Gets all products from Firestore.
 * Caches the result in memory for a few minutes to reduce reads.
 */
export async function getAllProducts(forceRefresh = false): Promise<Product[]> {
    if (!forceRefresh && cachedProducts && Date.now() - lastFetchTime < CACHE_TIME) {
        return cachedProducts;
    }

    const products: Product[] = [];
    try {
        const q = query(productsCollection, orderBy('nombre', 'asc'));
        const snapshot = await getDocs(q);
        snapshot.forEach((docSnap) => {
            products.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
    } catch (e) {
        console.warn('Warning: Could not fetch products from Firestore during build, using static fallback:', e);
    }

    // Merge hardcoded with DB (Static code definitions win for catalog metadata and prices)
    const allProductsMap = new Map<string, Product>();
    PRODUCTOS.forEach(p => allProductsMap.set(p.id, p));
    products.forEach(p => {
        const staticP = PRODUCTOS.find(sp => sp.id === p.id);
        if (staticP) {
            allProductsMap.set(p.id, {
                ...p,
                ...staticP,
                precios: staticP.precios
            });
        }
        // Obsolete/deleted DB documents NOT present in static PRODUCTOS are excluded
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
        if (fallback) {
            res = {
                ...dbData,
                ...fallback,
                precios: fallback.precios
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
        sku
    };
}

/**
 * Creates or overwrites a product
 */
export async function saveProduct(product: Product): Promise<void> {
    const docRef = doc(db, 'products', product.id);
    const { id, ...data } = product; // Avoid saving ID twice
    
    // Using setDoc to allow custom IDs (slugs)
    await setDoc(docRef, data);
    
    // Invalidate cache
    cachedProducts = null;
}

/**
 * Updates stock quantity for a specific product size
 */
export async function updateProductStock(id: string, size: string, newStockQuantity: number): Promise<void> {
    const product = await getProductById(id);
    if (!product) throw new Error('Producto no encontrado');

    const updatedStock = { ...(product.stock || {}), [size]: Math.max(0, newStockQuantity) };
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, { stock: updatedStock });

    cachedProducts = null;
}

/**
 * Deletes a product
 */
export async function deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
    
    // Invalidate cache
    cachedProducts = null;
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
