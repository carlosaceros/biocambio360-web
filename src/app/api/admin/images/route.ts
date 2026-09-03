import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminDB } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const imageSet = new Set<string>();

        // 1. Read files from local disk if available
        const publicImagesDirectory = path.join(process.cwd(), 'public', 'images');
        try {
            if (fs.existsSync(publicImagesDirectory)) {
                const files = fs.readdirSync(publicImagesDirectory);
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (imageExtensions.includes(ext) && !file.startsWith('.')) {
                        imageSet.add(file);
                    }
                }
            }
        } catch (fsErr) {
            console.warn('[API/admin/images] Warning reading local public/images directory:', fsErr);
        }

        // 2. Read custom uploaded images from Firestore 'product_images' collection
        try {
            const db = getAdminDB();
            const snapshot = await db.collection('product_images').get();
            snapshot.forEach(doc => {
                const name = doc.data()?.name || doc.id;
                if (name && !name.startsWith('.')) {
                    imageSet.add(name);
                }
            });
        } catch (dbErr) {
            console.warn('[API/admin/images] Warning reading Firestore product_images collection:', dbErr);
        }

        // Sort alphabetically
        const images = Array.from(imageSet).sort((a, b) => a.localeCompare(b));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error reading images directory:', error);
        return NextResponse.json({ error: 'Failed to read images' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());

        // Clean and sanitize filename (preserves exact test contract)
        const originalName = file.name || 'uploaded_image.webp';
        const ext = path.extname(originalName);
        let baseName = originalName;
        if (ext) {
            baseName = path.basename(originalName, ext);
        }

        let cleanName = baseName.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]/g, '_') // replace non-alphanumeric with underscores
            .replace(/_+/g, '_') // collapse multiple underscores
            .replace(/^_+|_+$/g, ''); // trim underscores

        if (!cleanName) {
            cleanName = 'image_' + Date.now();
        }

        // Preserve webp or jpg extension
        const targetExt = ext && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.webp';
        const filename = `${cleanName}${targetExt}`;
        const mimeType = file.type || (targetExt === '.png' ? 'image/png' : targetExt === '.jpg' || targetExt === '.jpeg' ? 'image/jpeg' : 'image/webp');

        let savedToStorage = false;

        // 1. Persist to Firestore 'product_images' collection (essential for Vercel / serverless)
        try {
            const db = getAdminDB();
            const docRef = db.collection('product_images').doc(filename);
            const base64Str = rawBuffer.toString('base64');
            const CHUNK_SIZE = 450 * 1024; // 450KB chunk size (well within Firestore 1MB document limit)

            if (base64Str.length <= 700 * 1024) {
                // Small file: single document
                await docRef.set({
                    id: filename,
                    name: filename,
                    base64: base64Str,
                    mimeType,
                    size: rawBuffer.length,
                    uploadedAt: new Date().toISOString(),
                    isChunked: false,
                });
            } else {
                // Large file: chunked storage in subcollection
                const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);
                const batch = db.batch();

                batch.set(docRef, {
                    id: filename,
                    name: filename,
                    mimeType,
                    size: rawBuffer.length,
                    uploadedAt: new Date().toISOString(),
                    isChunked: true,
                    totalChunks,
                });

                for (let i = 0; i < totalChunks; i++) {
                    const chunkData = base64Str.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    const chunkRef = docRef.collection('chunks').doc(String(i));
                    batch.set(chunkRef, { index: i, data: chunkData });
                }

                await batch.commit();
            }

            savedToStorage = true;
        } catch (dbErr: any) {
            console.error('[API/admin/images] Could not write to Firestore product_images:', dbErr?.message || dbErr);
        }

        // 2. Also try writing to local disk if running on localhost / writable environment
        try {
            const imagesDirectory = path.join(process.cwd(), 'public', 'images');
            if (!fs.existsSync(imagesDirectory)) {
                fs.mkdirSync(imagesDirectory, { recursive: true });
            }
            const filePath = path.join(imagesDirectory, filename);
            await fs.promises.writeFile(filePath, rawBuffer);
            savedToStorage = true;
        } catch (fsErr: any) {
            // Read-only filesystem is expected on Vercel lambda
            console.log('[API/admin/images] Local disk write skipped/failed (normal in serverless):', fsErr?.message);
        }

        if (!savedToStorage) {
            throw new Error('No storage backend was able to persist the image');
        }

        return NextResponse.json({ 
            success: true, 
            filename: filename,
            message: 'Image uploaded and saved successfully' 
        });
    } catch (error: any) {
        console.error('Error saving uploaded image:', error);
        return NextResponse.json({ error: error?.message || 'Failed to upload image' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // Prevent path traversal and protect system placeholders
        const sanitizedFilename = path.basename(filename);
        if (sanitizedFilename === 'placeholder.png' || sanitizedFilename.startsWith('.')) {
            return NextResponse.json({ error: 'No se puede eliminar este archivo protegido del sistema' }, { status: 403 });
        }

        let deleted = false;

        // 1. Delete from Firestore 'product_images' collection if present
        try {
            const db = getAdminDB();
            const docRef = db.collection('product_images').doc(sanitizedFilename);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data?.isChunked) {
                    const chunksSnap = await docRef.collection('chunks').get();
                    const batch = db.batch();
                    chunksSnap.forEach(c => batch.delete(c.ref));
                    batch.delete(docRef);
                    await batch.commit();
                } else {
                    await docRef.delete();
                }
                deleted = true;
            }
        } catch (dbErr) {
            console.warn('[API/admin/images] Could not delete from Firestore product_images:', dbErr);
        }

        // 2. Delete from local disk if present
        try {
            const publicImagesDirectory = path.join(process.cwd(), 'public', 'images');
            const filePath = path.join(publicImagesDirectory, sanitizedFilename);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                deleted = true;
            }
        } catch (fsErr) {
            console.warn('[API/admin/images] Could not unlink from local disk:', fsErr);
        }

        if (!deleted) {
            return NextResponse.json({ error: 'El archivo no existe' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: `Imagen ${sanitizedFilename} eliminada exitosamente`
        });
    } catch (error: any) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: error?.message || 'Error al eliminar imagen del servidor' }, { status: 500 });
    }
}
