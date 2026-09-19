import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { normalizeDepartmentAndCity, crossCheckCityDepartment, findDaneCode, calculateShipping, DEPARTAMENTOS } from '@/lib/checkout-utils';
import { lookupCustomerByPhone } from '@/lib/orders-service';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

describe('Normalización Geográfica Colombiana (Cundinamarca / Bogotá D.C. / Soacha)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. normalizeDepartmentAndCity (Casos Críticos)', () => {
        it('debe corregir "Amazonas / Bogotá D.C." forzando a "Cundinamarca / Bogotá D.C."', () => {
            const res = normalizeDepartmentAndCity('Amazonas', 'Bogotá D.C.');
            expect(res.departamento).toBe('Cundinamarca');
            expect(res.ciudad).toBe('Bogotá D.C.');
        });

        it('debe corregir "Amazonas / BOGOTA, DISTRITO CAPITAL" a "Cundinamarca / Bogotá D.C."', () => {
            const res = normalizeDepartmentAndCity('Amazonas', 'BOGOTA, DISTRITO CAPITAL');
            expect(res.departamento).toBe('Cundinamarca');
            expect(res.ciudad).toBe('Bogotá D.C.');
        });

        it('debe corregir "BOGOTA, D.C. / BOGOTA, DISTRITO CAPITAL" a "Cundinamarca / Bogotá D.C."', () => {
            const res = normalizeDepartmentAndCity('BOGOTA, D.C.', 'BOGOTA, DISTRITO CAPITAL');
            expect(res.departamento).toBe('Cundinamarca');
            expect(res.ciudad).toBe('Bogotá D.C.');
        });

        it('debe corregir variantes de D.C. y Distrito Capital a Cundinamarca', () => {
            expect(normalizeDepartmentAndCity('D.C.', 'Bogota')).toMatchObject({
                departamento: 'Cundinamarca',
                ciudad: 'Bogotá D.C.'
            });
            expect(normalizeDepartmentAndCity('DC', 'Santafe de Bogota')).toMatchObject({
                departamento: 'Cundinamarca',
                ciudad: 'Bogotá D.C.'
            });
            expect(normalizeDepartmentAndCity('DISTRITO CAPITAL', '')).toMatchObject({
                departamento: 'Cundinamarca',
                ciudad: 'Bogotá D.C.'
            });
        });

        it('debe asignar Cundinamarca cuando la ciudad es Soacha (sede de planta)', () => {
            const res = normalizeDepartmentAndCity('Amazonas', 'Soacha');
            expect(res.departamento).toBe('Cundinamarca');
            expect(res.ciudad).toBe('Soacha');
        });

        it('debe asignar Cundinamarca cuando la ciudad es un municipio de Cundinamarca (Chía, Cota, Zipaquirá)', () => {
            expect(normalizeDepartmentAndCity('Amazonas', 'Chía')).toMatchObject({
                departamento: 'Cundinamarca',
                ciudad: 'Chía'
            });
            expect(normalizeDepartmentAndCity('', 'Zipaquirá')).toMatchObject({
                departamento: 'Cundinamarca',
                ciudad: 'Zipaquirá'
            });
        });

        it('debe conservar Amazonas cuando la ciudad realmente es Leticia', () => {
            const res = normalizeDepartmentAndCity('Amazonas', 'Leticia');
            expect(res.departamento).toBe('Amazonas');
            expect(res.ciudad).toBe('Leticia');
        });

        it('debe reasignar departamento correcto si vino con desfase Amazonas pero ciudad de otro departamento', () => {
            // Caso donde el select HTML cayó en Amazonas (primera opción alfabética) por un valor desconocido
            const resMedellin = normalizeDepartmentAndCity('Amazonas', 'Medellín');
            expect(resMedellin.departamento).toBe('Antioquia');
            expect(resMedellin.ciudad).toBe('Medellín');

            const resCali = normalizeDepartmentAndCity('Amazonas', 'Cali');
            expect(resCali.departamento).toBe('Valle del Cauca');
            expect(resCali.ciudad).toBe('Cali');
        });

        it('debe manejar entradas nulas o vacías con valores por defecto seguros', () => {
            const res = normalizeDepartmentAndCity(undefined, undefined);
            expect(res.departamento).toBe('Cundinamarca');
            expect(res.ciudad).toBe('Bogotá D.C.');
        });

        it('todos los departamentos retornados deben existir en la lista oficial DEPARTAMENTOS', () => {
            const testDepts = ['Amazonas', 'BOGOTA, D.C.', 'Antioquia', 'Cundinamarca', 'Valle', 'Santander', ''];
            testDepts.forEach(d => {
                const norm = normalizeDepartmentAndCity(d, 'Bogotá D.C.');
                expect(DEPARTAMENTOS).toContain(norm.departamento);
            });
        });
    });

    describe('2. calculateShipping con Normalización Geo', () => {
        it('debe cobrar tarifa local ($9.000) para Bogotá incluso si el departamento viene como Amazonas', () => {
            const cost = calculateShipping('Amazonas', 'Bogotá D.C.');
            expect(cost).toBe(9000);
        });

        it('debe cobrar tarifa local ($9.000) para Bogotá si departamento viene como BOGOTA, D.C.', () => {
            const cost = calculateShipping('BOGOTA, D.C.', 'BOGOTA, DISTRITO CAPITAL');
            expect(cost).toBe(9000);
        });

        it('debe cobrar tarifa local ($9.000) para Soacha y municipios de Cundinamarca', () => {
            expect(calculateShipping('Cundinamarca', 'Soacha')).toBe(9000);
            expect(calculateShipping('Amazonas', 'Soacha')).toBe(9000);
            expect(calculateShipping('Cundinamarca', 'Chía')).toBe(9000);
        });

        it('debe cobrar tarifa nacional ($18.000) para otras ciudades y Leticia', () => {
            expect(calculateShipping('Antioquia', 'Medellín')).toBe(18000);
            expect(calculateShipping('Amazonas', 'Leticia')).toBe(18000);
            expect(calculateShipping('Valle del Cauca', 'Cali')).toBe(18000);
        });
    });

    describe('3. lookupCustomerByPhone con Saneamiento de Datos', () => {
        it('debe sanear registro en customers si tenía departamento Amazonas y ciudad Bogotá', async () => {
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    nombre: 'Aura Salazar',
                    cedula: '52443322',
                    celular: '3002150262',
                    departamento: 'Amazonas', // Error registrado previamente
                    ciudad: 'Bogotá D.C.',
                    direccion: 'Calle 159 No 19A - 20 Apto 502'
                })
            } as any);

            const res = await lookupCustomerByPhone('3002150262');
            expect(res).not.toBeNull();
            expect(res?.nombre).toBe('Aura Salazar');
            expect(res?.departamento).toBe('Cundinamarca');
            expect(res?.ciudad).toBe('Bogotá D.C.');
        });

        it('debe sanear registro en fallback de orders si tenía departamento BOGOTA, D.C.', async () => {
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => false,
            } as any);

            vi.mocked(firestore.getDocs).mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            cliente: {
                                nombre: 'Cliente 99 Envios',
                                celular: '3119998877',
                                departamento: 'BOGOTA, D.C.',
                                ciudad: 'BOGOTA, DISTRITO CAPITAL',
                                direccion: 'Cra 15 # 85 - 10'
                            },
                            createdAt: { toMillis: () => 1000 }
                        })
                    }
                ]
            } as any);

            const res = await lookupCustomerByPhone('3119998877');
            expect(res).not.toBeNull();
            expect(res?.departamento).toBe('Cundinamarca');
            expect(res?.ciudad).toBe('Bogotá D.C.');
        });
    });

    describe('4. Cotejo Estricto con Catálogo de 99 Envíos (1,120 Municipios y Códigos DANE)', () => {
        it('debe detectar incongruencia y corregir Bucaramanga con Amazonas a Santander con código DANE 68001000', () => {
            const res = crossCheckCityDepartment('Amazonas', 'Bucaramanga');
            expect(res.departamento).toBe('Santander');
            expect(res.ciudad).toBe('Bucaramanga');
            expect(res.codigoDane).toBe('68001000');
            expect(res.valido).toBe(true);
            expect(res.corregido).toBe(true);
            expect(res.esLocal).toBe(false);
        });

        it('debe detectar incongruencia y corregir Cali con Amazonas a Valle del Cauca con código DANE 76001000', () => {
            const res = crossCheckCityDepartment('Amazonas', 'Cali');
            expect(res.departamento).toBe('Valle del Cauca');
            expect(res.ciudad).toBe('Cali');
            expect(res.codigoDane).toBe('76001000');
            expect(res.valido).toBe(true);
            expect(res.corregido).toBe(true);
            expect(res.esLocal).toBe(false);
        });

        it('debe resolver alias y nombres largos oficiales de 99 Envíos (Santiago de Cali, Distrito Capital)', () => {
            const res1 = crossCheckCityDepartment('Valle del Cauca', 'Santiago de Cali');
            expect(res1.ciudad).toBe('Cali');
            expect(res1.codigoDane).toBe('76001000');
            expect(res1.departamento).toBe('Valle del Cauca');

            const res2 = crossCheckCityDepartment('Atlántico', 'Barranquilla');
            expect(res2.ciudad).toBe('Barranquilla');
            expect(res2.codigoDane).toBe('08001000');
            expect(res2.departamento).toBe('Atlántico');

            const res3 = crossCheckCityDepartment('Bolívar', 'Cartagena');
            expect(res3.ciudad).toBe('Cartagena');
            expect(res3.codigoDane).toBe('13001000');
            expect(res3.departamento).toBe('Bolívar');
        });

        it('debe respetar homónimos departamentales (Barbosa en Antioquia vs Barbosa en Santander)', () => {
            // Barbosa Antioquia
            const resAnt = crossCheckCityDepartment('Antioquia', 'Barbosa');
            expect(resAnt.departamento).toBe('Antioquia');
            expect(resAnt.codigoDane).toBe('05079000');
            expect(resAnt.corregido).toBe(false);

            // Barbosa Santander
            const resSan = crossCheckCityDepartment('Santander', 'Barbosa');
            expect(resSan.departamento).toBe('Santander');
            expect(resSan.codigoDane).toBe('68077000');
            expect(resSan.corregido).toBe(false);

            // Barbosa con departamento erróneo (Amazonas) debe corregirse
            const resErr = crossCheckCityDepartment('Amazonas', 'Barbosa');
            expect(['Antioquia', 'Santander']).toContain(resErr.departamento);
            expect(resErr.corregido).toBe(true);
        });

        it('debe resolver búsqueda inversa exacta por código DANE', () => {
            const resMedellin = crossCheckCityDepartment(undefined, undefined, '05001000');
            expect(resMedellin.departamento).toBe('Antioquia');
            expect(resMedellin.ciudad).toBe('Medellín');
            expect(resMedellin.codigoDane).toBe('05001000');
            expect(resMedellin.valido).toBe(true);

            const resBogota = crossCheckCityDepartment(undefined, undefined, '11001000');
            expect(resBogota.departamento).toBe('Cundinamarca');
            expect(resBogota.ciudad).toBe('Bogotá D.C.');
            expect(resBogota.esLocal).toBe(true);

            const resSoacha = crossCheckCityDepartment(undefined, undefined, '25754000');
            expect(resSoacha.departamento).toBe('Cundinamarca');
            expect(resSoacha.ciudad).toBe('Soacha');
            expect(resSoacha.esLocal).toBe(true);
        });

        it('findDaneCode debe retornar la estructura requerida para cotización de fletes 99 Envíos', () => {
            const daneSoacha = findDaneCode('Cundinamarca', 'Soacha');
            expect(daneSoacha.codigo).toBe('25754000');
            expect(daneSoacha.esLocal).toBe(true);
            expect(daneSoacha.valido).toBe(true);

            const danePasto = findDaneCode('Nariño', 'Pasto');
            expect(danePasto.codigo).toBe('52001000');
            expect(danePasto.esLocal).toBe(false);
            expect(danePasto.valido).toBe(true);
        });
    });
});
