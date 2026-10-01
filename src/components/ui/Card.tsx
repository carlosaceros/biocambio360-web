import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    /** p-4 por defecto; "none" para cuando el contenido (ej. una tabla) necesita manejar su propio padding. */
    padding?: 'none' | 'sm' | 'md';
}

/**
 * El contenedor blanco redondeado con borde que aparece en prácticamente toda pantalla de
 * /admin ("bg-white rounded-2xl border border-slate-200 shadow-xs"). Centralizarlo no cambia
 * nada visualmente, solo evita repetir la misma cadena de clases en cada archivo.
 */
export default function Card({ children, padding = 'md', className = '', ...rest }: CardProps) {
    const paddingClass = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5';
    return (
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs ${paddingClass} ${className}`} {...rest}>
            {children}
        </div>
    );
}
