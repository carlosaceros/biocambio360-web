export type StatCardColor = 'default' | 'emerald' | 'amber' | 'indigo' | 'red';

const COLOR_CLASSES: Record<StatCardColor, string> = {
    default: 'text-slate-900 bg-white border-slate-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-800 bg-amber-50 border-amber-200',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    red: 'text-red-700 bg-red-50 border-red-200',
};

interface StatCardProps {
    label: string;
    value: number | string;
    color?: StatCardColor;
    /** Ej. "pedidos", "clientes" — se muestra chico debajo del valor. */
    hint?: string;
}

/**
 * Tarjeta de métrica (label + número grande) — se reescribió como función local al menos 4 veces
 * en /admin (pedidos, kpis-ia, entrenamiento-ia, kommo-preview) antes de centralizarla aquí.
 * Formatea el número en es-CO automáticamente si es numérico.
 */
export default function StatCard({ label, value, color = 'default', hint }: StatCardProps) {
    const display = typeof value === 'number' ? value.toLocaleString('es-CO') : value;
    return (
        <div className={`rounded-xl border p-3 ${COLOR_CLASSES[color]}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-lg font-black mt-0.5">{display}</p>
            {hint && <p className="text-[10px] opacity-60 mt-0.5">{hint}</p>}
        </div>
    );
}
