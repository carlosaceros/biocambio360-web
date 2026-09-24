'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, ImageOff } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface MediaAttachmentProps {
    mediaId: string;
    type: string;
    mimeType?: string;
    fileName?: string;
}

/** Loads a customer's media through the authenticated proxy and renders it inline. */
export default function MediaAttachment({ mediaId, type, mimeType, fileName }: MediaAttachmentProps) {
    const [src, setSrc] = useState<string | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorText, setErrorText] = useState('');

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        // Outbound media may already be a real URL
        if (/^https?:\/\//i.test(mediaId)) {
            setSrc(mediaId);
            setState('ready');
            return;
        }

        (async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) throw new Error('Sin sesión');
                const res = await fetch(`/api/inbox/media?id=${encodeURIComponent(mediaId)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error ?? 'No se pudo cargar');
                }
                const blob = await res.blob();
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
                setState('ready');
            } catch (err) {
                if (cancelled) return;
                setErrorText(err instanceof Error ? err.message : 'No se pudo cargar');
                setState('error');
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [mediaId]);

    if (state === 'loading') {
        return (
            <div className="flex items-center gap-2 text-xs opacity-70 py-2">
                <Loader2 size={14} className="animate-spin" /> Cargando archivo...
            </div>
        );
    }

    if (state === 'error' || !src) {
        return (
            <div className="flex items-center gap-2 text-xs opacity-80 py-1">
                <ImageOff size={14} /> {errorText || 'Archivo no disponible'}
            </div>
        );
    }

    if (type === 'image' || type === 'sticker') {
        return (
            <a href={src} target="_blank" rel="noreferrer" title="Abrir imagen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Imagen del cliente" className="rounded-xl max-h-72 max-w-full object-contain bg-black/5" />
            </a>
        );
    }
    if (type === 'audio') {
        return <audio controls src={src} className="w-64 max-w-full" preload="metadata" />;
    }
    if (type === 'video') {
        return <video controls src={src} className="rounded-xl max-h-72 max-w-full" preload="metadata" />;
    }
    return (
        <a
            href={src}
            download={fileName ?? 'documento'}
            className="flex items-center gap-2 text-xs font-bold underline"
            title={mimeType}
        >
            <FileText size={14} /> {fileName ?? 'Descargar documento'}
        </a>
    );
}
