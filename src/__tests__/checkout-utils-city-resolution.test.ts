import { describe, it, expect } from 'vitest';
import { crossCheckCityDepartment } from '@/lib/checkout-utils';

describe('crossCheckCityDepartment -- duplicate city names across departments', () => {
    it('resolves "Suarez" to Cauca when the department is given', () => {
        const result = crossCheckCityDepartment('Cauca', 'Suarez');
        expect(result.codigoDane).toBe('19780000');
        expect(result.departamento).toBe('Cauca');
    });

    it('resolves "Suarez" to Tolima when that department is given', () => {
        const result = crossCheckCityDepartment('Tolima', 'Suarez');
        expect(result.codigoDane).toBe('73770000');
        expect(result.departamento).toBe('Tolima');
    });

    it('does not silently claim a correct department match when none was given', () => {
        // Antes del fix, un departamento vacío volvía el chequeo de `.includes('')` siempre
        // verdadero, y el primer candidato del catálogo "ganaba" marcado como `corregido: false`
        // (como si el departamento hubiera coincidido de verdad). Ahora debe quedar honestamente
        // marcado como `corregido: true` -- se escogió sin poder confirmar el departamento.
        const result = crossCheckCityDepartment('', 'Suarez');
        expect(['19780000', '73770000']).toContain(result.codigoDane);
        expect(result.corregido).toBe(true);
    });
});
