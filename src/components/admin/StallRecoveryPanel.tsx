'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';

export default function StallRecoveryPanel() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => onSnapshot(doc(db, 'bot_config', 'stall_recovery'), s => setEnabled(s.data()?.enabled === true), () => undefined), []);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-600" />
                    <h3 className="text-sm font-black text-gray-900">Recuperar conversaciones frías</h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => setDoc(doc(db, 'bot_config', 'stall_recovery'), { enabled: e.target.checked, updatedAt: serverTimestamp() }, { merge: true })}
                        className="w-4 h-4 accent-violet-600"
                    />
                    {enabled ? 'Activado' : 'Desactivado'}
                </label>
            </div>
            <p className="text-xs text-gray-500">
                Cuando un lead con intención real (vino de un anuncio o ya tiene un pre-pedido) deja de responder al agente, se le escribe automáticamente dos veces, sin sonar insistente:
                un mensaje cálido retomando el tema (2-6 h de silencio) y, si tampoco responde, un cierre elegante antes de que se cierre la ventana de chat (8-20 h). Nunca interrumpe a un asesor humano ni insiste una tercera vez.
            </p>
        </div>
    );
}
