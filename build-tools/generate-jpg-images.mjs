/**
 * Build step: WhatsApp product cards need JPEG/PNG photos, but the store's are WebP. Every WebP in
 * public/images gets an 800x800 JPEG twin in public/images-jpg (served as a static file by the CDN,
 * so no image processing happens at request time). Runs automatically before `next build`.
 */
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('public/images');
const OUT = path.resolve('public/images-jpg');

async function exists(file) {
    try {
        return await stat(file);
    } catch {
        return null;
    }
}

const files = (await readdir(SRC)).filter(f => /\.webp$/i.test(f));
await mkdir(OUT, { recursive: true });
let made = 0;
for (const name of files) {
    const target = path.join(OUT, name.replace(/\.webp$/i, '.jpg'));
    const [srcStat, outStat] = [await exists(path.join(SRC, name)), await exists(target)];
    if (outStat && srcStat && outStat.mtimeMs >= srcStat.mtimeMs) continue;
    try {
        await sharp(path.join(SRC, name))
            .resize(800, 800, { fit: 'contain', background: '#ffffff' })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 82 })
            .toFile(target);
        made++;
    } catch (err) {
        console.warn(`[images-jpg] skipped ${name}: ${err.message}`);
    }
}
console.log(`[images-jpg] ${files.length} WebP images, ${made} JPEG generated`);
