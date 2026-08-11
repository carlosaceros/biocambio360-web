import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Product, PRODUCTOS } from './products';

// Initialize Firebase Admin
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error) {
            console.warn('Warning: Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
        }
    } else {
        console.warn('Warning: FIREBASE_SERVICE_ACCOUNT environment variable is not set yet.');
    }
} else {
    getApp();
}

/**
 * Gets all products using Admin SDK
 */
export async function adminGetAllProducts(): Promise<Product[]> {
    try {
        const adminDb = getFirestore();
        const productsCollection = adminDb.collection('products');
        const snapshot = await productsCollection.orderBy('nombre', 'asc').get();
        
        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
            products.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });

        return products;
    } catch (e) {
        console.warn('Warning: Could not fetch products with Admin SDK:', e);
        return [];
    }
}

/**
 * Creates or overwrites a product using Admin SDK
 */
export async function adminSaveProduct(product: Product): Promise<void> {
    try {
        const adminDb = getFirestore();
        const docRef = adminDb.collection('products').doc(product.id);
        const { id, ...data } = product; // Avoid saving ID twice
        await docRef.set(data);
    } catch (e) {
        console.warn('Warning: Could not save product with Admin SDK:', e);
    }
}

/**
 * Deletes a product by ID using Admin SDK
 */
export async function adminDeleteProduct(id: string): Promise<void> {
    try {
        const adminDb = getFirestore();
        await adminDb.collection('products').doc(id).delete();
    } catch (e) {
        console.warn(`Warning: Could not delete product ${id} with Admin SDK:`, e);
    }
}

/**
 * Full sync: upserts all canonical products and deletes stale ones from Firestore
 */
export async function adminSeedProducts(): Promise<{ upserted: number; deleted: number }> {
    const adminDb = getFirestore();
    const productsCollection = adminDb.collection('products');

    // 1. Fetch existing IDs from Firestore
    const snapshot = await productsCollection.get();
    const firestoreIds = new Set(snapshot.docs.map(d => d.id));

    // 2. Canonical IDs from static catalog
    const canonicalIds = new Set(PRODUCTOS.map(p => p.id));

    // 3. Delete stale documents
    let deleted = 0;
    for (const fsId of firestoreIds) {
        if (!canonicalIds.has(fsId)) {
            await productsCollection.doc(fsId).delete();
            console.log(`🗑️  Deleted stale product: ${fsId}`);
            deleted++;
        }
    }

    // 4. Upsert all canonical products
    for (const prod of PRODUCTOS) {
        const { id, ...data } = prod;
        await productsCollection.doc(id).set(data);
    }

    console.log(`✅ Admin seed complete: ${PRODUCTOS.length} upserted, ${deleted} deleted.`);
    return { upserted: PRODUCTOS.length, deleted };
}
