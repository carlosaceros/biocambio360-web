import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
}

/**
 * El "no hay nada todavía" centrado con ícono que aparece en inbox, kommo-preview, asesores,
 * entrenamiento-ia, etc. — cada uno con su propio layout ligeramente distinto. Uno solo.
 */
export default function EmptyState({ icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <div className="text-slate-300">{icon ?? <Inbox size={28} />}</div>
            <p className="text-sm text-slate-500">{title}</p>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
    );
}
