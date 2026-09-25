'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Bot, Mail, MessageCircle } from 'lucide-react';
import { db } from '@/lib/firebase';

interface Config {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    whatsappSteps: number[];
    whatsappTemplate: string;
}

const DEFAULTS: Config = { emailEnabled: true, whatsappEnabled: false, whatsappSteps: [1, 3], whatsappTemplate: 'carrito_abandonado' };
const STEP_LABEL: Record<number, string> = { 1: '2 h', 2: '8 h', 3: '24 h' };

export default function CartAutomationPanel() {
    const [cfg, setCfg] = useState<Config>(DEFAULTS);
    const [saving, setSaving] = useState(false);

    useEffect(
        () =>
            onSnapshot(doc(db, 'bot_config', 'abandoned_cart'), snap => {
                const d = snap.data() ?? {};
                setCfg({
                    emailEnabled: d.emailEnabled !== false,
                    whatsappEnabled: d.whatsappEnabled === true,
                    whatsappSteps: Array.isArray(d.whatsappSteps) ? d.whatsappSteps : DEFAULTS.whatsappSteps,
                    whatsappTemplate: d.whatsappTemplate || DEFAULTS.whatsappTemplate,
                });
            }),
        []
    );

    const save = async (next: Partial<Config>) => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'bot_config', 'abandoned_cart'), { ...cfg, ...next, updatedAt: serverTimestamp() }, { merge: true });
        } finally {
            setSaving(false);
        }
    };

    const toggleStep = (step: number) =>
        save({ whatsappSteps: cfg.whatsappSteps.includes(step) ? cfg.whatsappSteps.filter(s => s !== step) : [...cfg.whatsappSteps, step].sort() });

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
                <Bot size={16} className="text-violet-600" />
                <h2 className="text-sm font-black text-gray-900">Recordatorios automáticos</h2>
                {saving && <span className="text-[10px] text-gray-400">Guardando…</span>}
            </div>
            <p className="text-xs text-gray-500">
                Se envían a las <strong>2 h</strong>, <strong>8 h</strong> y <strong>24 h</strong> desde la última actividad del cliente en el carrito. Si el cliente compra, se detienen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-gray-100 rounded-xl p-3 space-y-1">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800"><Mail size={14} className="text-blue-600" /> Correo (3 recordatorios)</span>
                        <input type="checkbox" checked={cfg.emailEnabled} onChange={e => save({ emailEnabled: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                    </label>
                    <p className="text-[11px] text-gray-500">Solo a carritos que dejaron su correo.</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800"><MessageCircle size={14} className="text-green-600" /> WhatsApp (plantilla)</span>
                        <input type="checkbox" checked={cfg.whatsappEnabled} onChange={e => save({ whatsappEnabled: e.target.checked })} className="w-4 h-4 accent-green-600" />
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                        {[1, 2, 3].map(step => (
                            <button
                                key={step}
                                onClick={() => toggleStep(step)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${cfg.whatsappSteps.includes(step) ? 'bg-green-100 border-green-300 text-green-800' : 'border-gray-200 text-gray-500'}`}
                            >
                                A las {STEP_LABEL[step]}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500">
                        Requiere la plantilla <code className="bg-gray-100 px-1 rounded">{cfg.whatsappTemplate}</code> aprobada en Meta. Respeta a quien pidió &quot;Detener promociones&quot;.
                    </p>
                </div>
            </div>
        </div>
    );
}
