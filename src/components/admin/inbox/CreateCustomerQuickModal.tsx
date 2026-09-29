'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { quickCreateCustomer } from '@/lib/customers-service';
import { Customer } from '@/types/customer';
import { DEPARTAMENTOS, CIUDADES_POR_DEPARTAMENTO, normalizeDepartmentAndCity } from '@/lib/checkout-utils';

interface CreateCustomerQuickModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Phone the ficha will be tied to — comes from the open conversation, not editable here */
    phone: string;
    /** Name suggested from the conversation's contact, editable before saving */
    suggestedName?: string;
    onCreated: (customer: Customer) => void;
}

export default function CreateCustomerQuickModal({
    isOpen,
    onClose,
    phone,
    suggestedName,
    onCreated,
}: CreateCustomerQuickModalProps) {
    const [nombre, setNombre] = useState('');
    const [cedula, setCedula] = useState('');
    const [direccion, setDireccion] = useState('');
    const [departamento, setDepartamento] = useState('Cundinamarca');
    const [ciudad, setCiudad] = useState('Soacha');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNombre(suggestedName?.trim() || '');
            setCedula('');
            setDireccion('');
            const norm = normalizeDepartmentAndCity('Cundinamarca', 'Soacha');
            setDepartamento(norm.departamento);
            setCiudad(norm.ciudad);
            setError(null);
        }
    }, [isOpen, suggestedName]);

    const availableCities = useMemo(() => {
        const dept = DEPARTAMENTOS.includes(departamento) ? departamento : 'Cundinamarca';
        return CIUDADES_POR_DEPARTAMENTO[dept] || ['Bogotá D.C.'];
    }, [departamento]);

    const handleSubmit = async () => {
        if (!nombre.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            const created = await quickCreateCustomer({
                nombre,
                celular: phone,
                cedula: cedula || undefined,
                direccion: direccion || undefined,
                ciudad,
                departamento,
            });
            onCreated(created);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo crear la ficha. Intenta de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200"
                    >
                        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/90 flex items-center justify-center shrink-0">
                                    <UserPlus size={16} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-sm">Crear ficha de cliente</h2>
                                    <p className="text-[11px] text-slate-400">Solo lo esencial — puedes completarla después</p>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Celular (de esta conversación)</span>
                                <span className="font-mono font-bold text-slate-800">{phone}</span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre completo *</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Ana Morales"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Cédula / NIT (opcional)</label>
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    placeholder="Se puede completar luego"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección (opcional)</label>
                                <input
                                    type="text"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    placeholder="Se puede completar luego"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white bg-slate-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Departamento</label>
                                    <select
                                        value={departamento}
                                        onChange={(e) => {
                                            setDepartamento(e.target.value);
                                            setCiudad(CIUDADES_POR_DEPARTAMENTO[e.target.value]?.[0] || 'Bogotá D.C.');
                                        }}
                                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-400"
                                    >
                                        {DEPARTAMENTOS.map((d) => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ciudad</label>
                                    <select
                                        value={ciudad}
                                        onChange={(e) => setCiudad(e.target.value)}
                                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-400"
                                    >
                                        {availableCities.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSaving || !nombre.trim()}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                <span>{isSaving ? 'Creando...' : 'Crear ficha'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
