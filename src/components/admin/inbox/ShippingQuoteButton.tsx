'use client';

import { useEffect, useRef, useState } from 'react';
import { Truck } from 'lucide-react';
import { DEPARTAMENTOS, CIUDADES_POR_DEPARTAMENTO, findDaneCode } from '@/lib/checkout-utils';

interface ShippingQuoteButtonProps {
    disabled?: boolean;
    /** Inserts the ready-to-send quote text into the message composer. */
    onInsert: (text: string) => void;
}

interface SizeOption {
    key: '1/2G' | '3.8L' | '10L' | '20L';
    label: string;
}

const SIZES: SizeOption[] = [
    { key: '1/2G', label: 'Medio galón' },
    { key: '3.8L', label: 'Galón' },
    { key: '10L', label: '10 L' },
    { key: '20L', label: '20 L' },
];

interface QuoteResult {
    precio: number;
    transportadora: string;
    dias: string | number;
    gratis: boolean;
    esLocal: boolean;
    mensaje: string;
    subsidioEfectivo: number;
}

export default function ShippingQuoteButton({ disabled, onInsert }: ShippingQuoteButtonProps) {
    const [open, setOpen] = useState(false);
    const [departamento, setDepartamento] = useState('Cundinamarca');
    const [ciudad, setCiudad] = useState('Bogotá D.C.');
    const [qty, setQty] = useState<Record<string, number>>({ '20L': 1 });
    const [contrapago, setContrapago] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QuoteResult | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    const ciudadOptions = CIUDADES_POR_DEPARTAMENTO[departamento] ?? [];

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const totalUnidades = Object.values(qty).reduce((a, b) => a + b, 0);

    const cotizar = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const dane = findDaneCode(departamento, ciudad);
            const itemsSizes = SIZES.filter(s => (qty[s.key] ?? 0) > 0).map(s => ({ size: s.key, cantidad: qty[s.key] }));
            const res = await fetch('/api/envios/cotizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinoCodigo: dane.codigo,
                    destinoNombre: dane.nombre || ciudad,
                    aplicaContrapago: contrapago,
                    itemsSizes,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo cotizar el envío');
            setResult({
                precio: data.precio ?? 0,
                transportadora: data.transportadora ?? '',
                dias: data.dias ?? '2-4',
                gratis: !!data.gratis,
                esLocal: !!data.esLocal,
                mensaje: data.mensaje ?? '',
                subsidioEfectivo: data.subsidioEfectivo ?? 0,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cotizar el envío');
        } finally {
            setLoading(false);
        }
    };

    const insertar = () => {
        if (!result) return;
        const destino = ciudad === 'Bogotá D.C.' ? 'Bogotá' : `${ciudad}, ${departamento}`;
        const subsidioLine = !result.gratis && result.subsidioEfectivo > 0
            ? `\n✨ Biocambio360 te ayuda con *$${result.subsidioEfectivo.toLocaleString('es-CO')} COP* de subsidio en este envío.`
            : '';
        const text = result.gratis
            ? `🚚 ¡Buenas noticias! El envío a ${destino} es *GRATIS*, llega en ${result.dias} días hábiles.`
            : `🚚 El envío a ${destino} tiene un costo de *$${result.precio.toLocaleString('es-CO')} COP* (${result.transportadora}${result.esLocal ? '' : ` · pago ${contrapago ? 'contra entrega' : 'anticipado'}`}), llega en ${result.dias} días hábiles.${subsidioLine}`;
        onInsert(text);
        setOpen(false);
        setResult(null);
    };

    return (
        <div className="relative" ref={boxRef}>
            <button
                type="button"
                aria-label="Cotizar envío para el cliente"
                disabled={disabled}
                onClick={() => setOpen(v => !v)}
                title="Cotizar envío a la ciudad del cliente sin salir del chat"
                className={`p-2 transition-colors disabled:opacity-40 ${open ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
            >
                <Truck size={18} />
            </button>

            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 p-3 space-y-2.5">
                    <p className="text-xs font-black text-gray-800">Cotizar envío</p>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={departamento}
                            onChange={e => { setDepartamento(e.target.value); setCiudad(''); setResult(null); }}
                            className="col-span-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                        >
                            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                            value={ciudad}
                            onChange={e => { setCiudad(e.target.value); setResult(null); }}
                            className="col-span-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                        >
                            <option value="">Elige la ciudad…</option>
                            {ciudadOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                        {SIZES.map(s => (
                            <div key={s.key} className="flex items-center justify-between gap-1 border border-gray-100 rounded-lg px-1.5 py-1">
                                <span className="text-[10px] font-bold text-gray-600 truncate">{s.label}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => { setQty(q => ({ ...q, [s.key]: Math.max(0, (q[s.key] ?? 0) - 1) })); setResult(null); }}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-600 font-bold text-xs"
                                    >−</button>
                                    <span className="w-4 text-center text-xs font-bold">{qty[s.key] ?? 0}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setQty(q => ({ ...q, [s.key]: (q[s.key] ?? 0) + 1 })); setResult(null); }}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-600 font-bold text-xs"
                                    >+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                        <input type="checkbox" checked={contrapago} onChange={e => { setContrapago(e.target.checked); setResult(null); }} className="rounded" />
                        Pago contra entrega
                    </label>

                    {error && <p className="text-[11px] text-red-600">{error}</p>}

                    {result ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-2 space-y-1.5">
                            <p className="text-xs font-black text-blue-800">
                                {result.gratis ? 'Envío GRATIS' : `$${result.precio.toLocaleString('es-CO')} COP`}
                            </p>
                            <p className="text-[10px] text-blue-700">{result.transportadora} · {result.dias} días hábiles</p>
                            {!result.gratis && result.subsidioEfectivo > 0 && (
                                <p className="text-[10px] font-bold text-emerald-700">✨ Biocambio360 subsidia ${result.subsidioEfectivo.toLocaleString('es-CO')}</p>
                            )}
                            <button
                                type="button"
                                onClick={insertar}
                                className="w-full text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5"
                            >
                                Insertar en el mensaje
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={!ciudad || totalUnidades === 0 || loading}
                            onClick={cotizar}
                            className="w-full text-xs font-bold bg-gray-900 hover:bg-black disabled:opacity-40 text-white rounded-lg py-1.5"
                        >
                            {loading ? 'Cotizando…' : 'Cotizar'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
