'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs',
    ghost: 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
    loading?: boolean;
}

/**
 * Botón compartido — reemplaza el className de ~15 clases repetido a mano en cada pantalla
 * ("px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black
 * shadow-xs transition-all cursor-pointer"). Mismos colores/variantes que ya se usan en todo
 * /admin, solo centralizados.
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    disabled,
    className = '',
    ...rest
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
            {...rest}
        >
            {loading ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : icon}
            {children}
        </button>
    );
}
