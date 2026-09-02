import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const publicImagesDirectory = path.join(process.cwd(), 'public', 'images');
        
        const files = fs.readdirSync(publicImagesDirectory);
        
        // Filter only image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const images = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext) && !file.startsWith('.');
        });
        
        // Sort alphabetically
        images.sort((a, b) => a.localeCompare(b));
        
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

        const buffer = Buffer.from(await file.arrayBuffer());
        const imagesDirectory = path.join(process.cwd(), 'public', 'images');
        
        // Ensure directory exists
        if (!fs.existsSync(imagesDirectory)) {
            fs.mkdirSync(imagesDirectory, { recursive: true });
        }
        
        // Clean filename (lowercase, remove accents, replace spaces/special chars)
        const originalName = file.name || 'uploaded_image.webp';
        
        // Strip original extension and append .webp if not present
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

        const filename = `${cleanName}.webp`;
        const filePath = path.join(imagesDirectory, filename);
        
        // Save the file
        await fs.promises.writeFile(filePath, buffer);
        
        return NextResponse.json({ 
            success: true, 
            filename: filename,
            message: 'Image uploaded and saved successfully' 
        });
    } catch (error) {
        console.error('Error saving uploaded image:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
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

        const publicImagesDirectory = path.join(process.cwd(), 'public', 'images');
        const filePath = path.join(publicImagesDirectory, sanitizedFilename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'El archivo no existe' }, { status: 404 });
        }

        await fs.promises.unlink(filePath);

        return NextResponse.json({
            success: true,
            message: `Imagen ${sanitizedFilename} eliminada exitosamente`
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: 'Error al eliminar imagen del servidor' }, { status: 500 });
    }
}


