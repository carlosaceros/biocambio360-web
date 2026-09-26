/**
 * Customer media (photos, voice notes, videos, documents) kept in a PRIVATE Cloud Storage bucket, so
 * the history does not depend on Meta (whose media ids expire after ~30 days) and can be governed by a
 * retention policy:
 *   - registry:  Firestore `media_files/{mediaId}` (path, size, storedAt, status),
 *   - retention: bot_config/media_retention { mode: 'archive' | 'delete' | 'off', days }
 *       archive → after `days` the object moves to the ARCHIVE storage class (cheapest; still downloadable),
 *       delete  → after `days` the object is deleted; the chat keeps a "removed by retention policy" note.
 * Every function fails soft: media problems never break a conversation.
 */

import { getStorage } from 'firebase-admin/storage';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { downloadMedia } from '@/lib/whatsapp-service';

export const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'biocambio360-ecommerce-media';
const MAX_STORED_BYTES = 40 * 1024 * 1024;

export type MediaStatus = 'active' | 'archived' | 'deleted';

export interface MediaRecord {
    path: string;
    mimeType: string;
    size: number;
    conversationId?: string;
    messageId?: string;
    storedAt: Timestamp;
    status: MediaStatus;
}

export interface RetentionConfig {
    mode: 'archive' | 'delete' | 'off';
    days: number;
}

const bucket = () => getStorage().bucket(MEDIA_BUCKET);

const EXT: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac',
    'video/mp4': '.mp4', 'video/3gpp': '.3gp', 'application/pdf': '.pdf',
};

export async function loadRetentionConfig(): Promise<RetentionConfig> {
    try {
        const d = (await getAdminDB().collection('bot_config').doc('media_retention').get()).data() ?? {};
        const mode = d.mode === 'delete' || d.mode === 'off' ? d.mode : 'archive';
        const days = Math.min(Math.max(Number(d.days) || 365, 30), 3650);
        return { mode, days };
    } catch {
        return { mode: 'archive', days: 365 };
    }
}

export async function getMediaRecord(mediaId: string): Promise<MediaRecord | null> {
    try {
        const snap = await getAdminDB().collection('media_files').doc(mediaId).get();
        return snap.exists ? (snap.data() as MediaRecord) : null;
    } catch {
        return null;
    }
}

/** Saves a media buffer (already downloaded) unless it is already stored. */
export async function persistMediaBuffer(input: { mediaId: string; buffer: Buffer; mimeType: string; conversationId?: string; messageId?: string }): Promise<void> {
    try {
        if (input.buffer.length === 0 || input.buffer.length > MAX_STORED_BYTES) return;
        const ref = getAdminDB().collection('media_files').doc(input.mediaId);
        if ((await ref.get()).exists) return;
        const now = new Date();
        const mime = input.mimeType.split(';')[0];
        const path = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${input.mediaId}${EXT[mime] ?? ''}`;
        await bucket().file(path).save(input.buffer, { contentType: input.mimeType, resumable: false });
        const record: MediaRecord = { path, mimeType: input.mimeType, size: input.buffer.length, storedAt: Timestamp.now(), status: 'active', ...(input.conversationId ? { conversationId: input.conversationId } : {}), ...(input.messageId ? { messageId: input.messageId } : {}) };
        await ref.set(record);
    } catch (err) {
        console.warn('[media-store] Could not store media:', err instanceof Error ? err.message : err);
    }
}

/** Downloads a media file from Meta and stores it (used right after an inbound message). */
export async function persistMedia(input: { mediaId: string; conversationId?: string; messageId?: string }): Promise<void> {
    try {
        if ((await getMediaRecord(input.mediaId))?.status) return;
        const { buffer, mimeType } = await downloadMedia(input.mediaId);
        await persistMediaBuffer({ ...input, buffer, mimeType });
    } catch (err) {
        console.warn('[media-store] Meta download failed:', err instanceof Error ? err.message : err);
    }
}

export class MediaDeletedError extends Error {}

/** Media bytes: the stored copy when there is one, otherwise Meta (which keeps them ~30 days). */
export async function loadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string; fromStorage: boolean }> {
    const record = await getMediaRecord(mediaId);
    if (record?.status === 'deleted') throw new MediaDeletedError('deleted by retention policy');
    if (record) {
        try {
            const [buffer] = await bucket().file(record.path).download();
            return { buffer, mimeType: record.mimeType, fromStorage: true };
        } catch (err) {
            console.warn('[media-store] Stored copy unreadable, falling back to Meta:', err instanceof Error ? err.message : err);
        }
    }
    const { buffer, mimeType } = await downloadMedia(mediaId);
    return { buffer, mimeType, fromStorage: false };
}

/** Applies the retention policy to files older than `days`. Returns how many were processed. */
export async function applyRetention(limit = 300): Promise<{ archived: number; deleted: number; mode: RetentionConfig['mode'] }> {
    const cfg = await loadRetentionConfig();
    const stats = { archived: 0, deleted: 0, mode: cfg.mode };
    if (cfg.mode === 'off') return stats;

    const db = getAdminDB();
    const cutoff = Timestamp.fromMillis(Date.now() - cfg.days * 86400000);
    const snap = await db.collection('media_files').where('storedAt', '<', cutoff).orderBy('storedAt', 'asc').limit(limit).get();
    for (const doc of snap.docs) {
        const rec = doc.data() as MediaRecord;
        try {
            if (cfg.mode === 'archive' && rec.status === 'active') {
                await bucket().file(rec.path).setStorageClass('ARCHIVE');
                await doc.ref.update({ status: 'archived', archivedAt: Timestamp.now() });
                stats.archived++;
            } else if (cfg.mode === 'delete' && rec.status !== 'deleted') {
                await bucket().file(rec.path).delete({ ignoreNotFound: true });
                await doc.ref.update({ status: 'deleted', deletedAt: Timestamp.now() });
                stats.deleted++;
            }
        } catch (err) {
            console.warn(`[media-store] Retention failed for ${doc.id}:`, err instanceof Error ? err.message : err);
        }
    }
    return stats;
}
