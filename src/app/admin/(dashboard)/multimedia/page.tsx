'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, count, doc, getAggregateFromServer, onSnapshot, query, serverTimestamp, setDoc, sum, where } from 'firebase/firestore';
import { ArrowLeft, Archive, HardDrive, Trash2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';

type Mode = 'archive' | 'delete' | 'off';
interface Stat { files: number; bytes: number }

const mb = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`);

export default function MultimediaPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('archive');
    const [days, setDays] = useState(365);
    const [stats, setStats] = useState<Record<string, Stat>>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => onSnapshot(doc(db, 'bot_config', 'media_retention'), s => {
        const d = s.data() ?? {};
        setMode(d.mode === 'delete' || d.mode === 'off' ? d.mode : 'archive');
        setDays(Number(d.days) || 365);
    }), []);

    const loadStats = async () => {
        const out: Record<string, Stat> = {};
        for (const status of ['active', 'archived', 'deleted']) {
            try {
                const agg = await getAggregateFromServer(query(collection(db, 'media_files'), where('status', '==', status)), { files: count(), bytes: sum('size') });
                out[status] = { files: agg.data().files, bytes: Number(agg.data().bytes) || 0 };
            } catch {
                out[status] = { files: 0, bytes: 0 };
            }
        }
        setStats(out);
    };
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(u => u && loadStats());
        return unsub;
    }, []);

    const save = async () => {
        setSaving(true);
        await setDoc(doc(db, 'bot_config', 'media_retention'), { mode, days: Math.min(Math.max(days, 30), 3650), updatedAt: serverTimestamp() }, { merge: true });
        setSaving(false);
        setMessage('Política guardada.');
    };
    const applyNow = async () => {
        setMessage('Aplicando…');
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/media-retention', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        setMessage(res.ok ? `Listo: ${data.archived} archivados, ${data.deleted} eliminados.` : data.error ?? 'No se pudo aplicar');
        loadStats();
    };

    const Option = ({ value, title, text, icon }: { value: Mode; title: string; text: string; icon: React.ReactNode }) => (
        <label className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${mode === value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
            <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} className="mt-1 accent-indigo-600" />
            <span>
                <span className="flex items-center gap-1.5 text-sm font-black text-gray-900">{icon}{title}</span>
                <span className="text-xs text-gray-600">{text}</span>
            </span>
        </label>
    );

    return (
        <div className="space-y-5 pb-16 max-w-3xl mx-auto px-4 sm:px-6 pt-6">
            <div className="border-b border-gray-100 pb-4">
                <button onClick={() => router.push('/admin/inbox')} className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={14} /> Volver a la bandeja</button>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><HardDrive className="text-indigo-600" size={26} /> Multimedia de la bandeja</h1>
                <p className="text-xs text-gray-500 mt-1">Fotos, audios, videos y documentos de los clientes se guardan en un almacenamiento privado (Meta solo los conserva ~30 días) y se rigen por esta política de retención.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {([['active', 'Activos'], ['archived', 'Archivados'], ['deleted', 'Eliminados']] as const).map(([k, label]) => (
                    <div key={k} className="bg-white rounded-2xl border border-gray-200 p-4">
                        <p className="text-[11px] font-bold uppercase text-gray-500">{label}</p>
                        <p className="text-xl font-black text-gray-900">{stats[k]?.files ?? '…'}</p>
                        <p className="text-xs text-gray-500">{stats[k] ? mb(stats[k].bytes) : ''}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <h2 className="text-sm font-black text-gray-900">Qué pasa con los archivos viejos</h2>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    Después de
                    <input type="number" min={30} max={3650} value={days} onChange={e => setDays(Number(e.target.value))} className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm" />
                    días (365 = 1 año)
                </label>
                <div className="grid gap-2">
                    <Option value="archive" title="Archivar (recomendado)" text="Pasa al almacenamiento de archivo: cuesta una fracción y ya no ocupa el espacio normal, pero se sigue viendo y descargando desde el historial." icon={<Archive size={14} />} />
                    <Option value="delete" title="Eliminar" text="Borra el archivo definitivamente. En el chat queda el aviso «eliminado por la política de retención»; no se puede recuperar." icon={<Trash2 size={14} />} />
                    <Option value="off" title="No aplicar política" text="Los archivos se conservan tal cual." icon={<HardDrive size={14} />} />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50 cursor-pointer">Guardar política</button>
                    <button onClick={applyNow} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold cursor-pointer">Aplicar ahora</button>
                    {message && <span className="text-xs text-gray-600">{message}</span>}
                </div>
                <p className="text-[11px] text-gray-500">La política se aplica sola todos los días a las 3:00 a.m.</p>
            </div>
        </div>
    );
}
