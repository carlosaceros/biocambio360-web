/**
 * Kit mínimo de UI compartido para /admin. Nace de la auditoría de arquitectura: cuatro pantallas
 * ya reinventaban su propio StatCard, 21 repetían el mismo manejo de loading, y cada botón se
 * escribía a mano con ~15 clases de Tailwind. Nada de esto cambia el diseño visual existente —
 * son exactamente las mismas clases, solo en un lugar.
 *
 * Migración: progresiva, no retroactiva. Se usa en pantallas nuevas desde ya; las existentes se
 * actualizan solo cuando se tocan por otra razón (bug, feature), nunca en una migración masiva.
 */
export { default as Badge } from './Badge';
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as StatCard } from './StatCard';
export { default as EmptyState } from './EmptyState';
export type { BadgeColor } from './Badge';
export type { ButtonVariant, ButtonSize } from './Button';
export type { StatCardColor } from './StatCard';
