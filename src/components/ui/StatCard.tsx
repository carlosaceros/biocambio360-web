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
    /** Si se pasa, la tarjeta se vuelve un botón clickeable (ej. abrir un detalle/filtro). */
    onClick?: () => void;
}

/**
 * Tarjeta de métrica (label + número grande) — se reescribió como función local al menos 4 veces
 * en /admin (pedidos, kpis-ia, entrenamiento-ia, kommo-preview) antes de centralizarla aquí.
 * Formatea el número en es-CO automáticamente si es numérico.
 */
export default function StatCard({ label, value, color = 'default', hint, onClick }: StatCardProps) {
    const display = typeof value === 'number' ? value.toLocaleString('es-CO') : value;
    const className = `rounded-xl border p-3 text-left w-full ${COLOR_CLASSES[color]} ${onClick ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`;
    const content = (
        <>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-lg font-black mt-0.5">{display}</p>
            {hint && <p className="text-[10px] opacity-60 mt-0.5">{hint}</p>}
        </>
    );
    if (onClick) {
        return <button type="button" onClick={onClick} className={className}>{content}</button>;
    }
    return <div className={className}>{content}</div>;
}
