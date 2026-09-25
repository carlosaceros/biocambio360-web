import { describe, it, expect } from 'vitest';
import { isOptOutText } from '@/lib/wa-optout';

describe('opt-out detection', () => {
    it('matches explicit requests', () => {
        for (const t of ['Detener promociones', 'detener', 'STOP', 'Stop.', 'no quiero recibir más mensajes', 'Darme de baja', 'cancelar suscripción']) expect(isOptOutText(t)).toBe(true);
    });
    it('ignores normal messages', () => {
        for (const t of ['Hola', 'quiero parar el pedido de ayer y cambiarlo por otro producto', 'necesito ayuda', 'Quiero reabastecerme', '']) expect(isOptOutText(t)).toBe(false);
    });
});
