import type { ReactNode } from 'react';

export type BadgeColor = 'slate' | 'indigo' | 'emerald' | 'amber' | 'red' | 'violet' | 'blue';

const COLOR_CLASSES: Record<BadgeColor, string> = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    violet: 'bg-violet-100 text-violet-700',
    blue: 'bg-blue-100 text-blue-700',
};

interface BadgeProps {
    children: ReactNode;
    color?: BadgeColor;
    /** Blanco sobre el color (para usar dentro de superficies ya coloreadas, ej. una fila activa). */
    solid?: boolean;
    className?: string;
}

/**
 * Pill de estado/etiqueta — el mismo patrón de "text-[10px] font-black uppercase px-2 py-0.5
 * rounded-full bg-X-100 text-X-700" que se repite a mano en inbox, kommo-preview, asesores,
 * referidos, etc. Úsalo en vez de reescribir las clases cada vez.
 */
export default function Badge({ children, color = 'slate', solid = false, className = '' }: BadgeProps) {
    const colorClasses = solid
        ? 'bg-white/20 text-white'
        : COLOR_CLASSES[color];
    return (
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${colorClasses} ${className}`}>
            {children}
        </span>
    );
}
