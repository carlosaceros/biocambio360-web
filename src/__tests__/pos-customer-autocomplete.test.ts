import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { Customer } from '@/types/customer';
import { searchCustomers, quickCreateCustomer } from '@/lib/customers-service';
import { createPosSale } from '@/lib/pos-service';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        doc: vi.fn(),
        addDoc: vi.fn().mockResolvedValue({ id: 'mock-pos-sale-1' }),
        setDoc: vi.fn().mockResolvedValue(undefined),
        getDoc: vi.fn(),
        getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
        updateDoc: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        runTransaction: vi.fn().mockResolvedValue(undefined),
        serverTimestamp: vi.fn(() => ({ toMillis: () => 1726000000000 })),
        Timestamp: {
            now: vi.fn(() => ({ toMillis: () => 1726000000000, seconds: 1726000000 })),
            fromMillis: vi.fn((m) => ({ toMillis: () => m })),
        },
    };
});

vi.mock('@/lib/customers-service', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/customers-service')>();
    return {
        ...actual,
        upsertCustomerFromOrder: vi.fn().mockResolvedValue(undefined),
    };
});

describe('POS Mostrador Soacha: Directorio de Clientes, Autocompletado y Creación Rápida', () => {
    const mockCache: Customer[] = [
        {
            id: '3142733410',
            nombre: 'Carlos Aceros',
            celular: '3142733410',
            cedula: '1023456789',
            email: 'carlos@biocambio360.com',
            direccion: 'Cra 7C #44-17 Sur',
            ciudad: 'Soacha',
            departamento: 'Cundinamarca',
            totalSpent: 450000,
            ordersCount: 5,
            lastOrderDate: {} as any,
            firstOrderDate: {} as any,
            createdAt: {} as any,
            updatedAt: {} as any,
            asesorAsignado: 'Carlos'
        },
        {
            id: '3109876543',
            nombre: 'Ferretería El Progreso',
            celular: '3109876543',
            cedula: '901234567-1',
            email: 'contacto@elprogreso.com',
            direccion: 'Autopista Sur km 14',
            ciudad: 'Soacha',
            departamento: 'Cundinamarca',
            totalSpent: 1200000,
            ordersCount: 12,
            lastOrderDate: {} as any,
            firstOrderDate: {} as any,
            createdAt: {} as any,
            updatedAt: {} as any,
            asesorAsignado: 'Mayerli'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Autocompletado y Búsqueda Reactiva (searchCustomers)', () => {
        it('debe encontrar cliente por número de celular exacto o parcial', async () => {
            const results = await searchCustomers('3142733410', mockCache);
            expect(results).toHaveLength(1);
            expect(results[0].nombre).toBe('Carlos Aceros');
            expect(results[0].celular).toBe('3142733410');

            const partialResults = await searchCustomers('310987', mockCache);
            expect(partialResults).toHaveLength(1);
            expect(partialResults[0].nombre).toBe('Ferretería El Progreso');
        });

        it('debe encontrar cliente por nombre insensible a mayúsculas/minúsculas', async () => {
            const results = await searchCustomers('progreso', mockCache);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('3109876543');
        });

        it('debe encontrar cliente por cédula o NIT', async () => {
            const results = await searchCustomers('1023456789', mockCache);
            expect(results).toHaveLength(1);
            expect(results[0].nombre).toBe('Carlos Aceros');
        });

        it('debe retornar lista vacía si el término está vacío o en blanco', async () => {
            const results = await searchCustomers('   ', mockCache);
            expect(results).toEqual([]);
        });

        it('debe consultar Firestore remoto si el número tiene 7+ dígitos y no está en caché local', async () => {
            const remoteCustomer = {
                id: '3201112233',
                nombre: 'Cliente Remoto Firestore',
                celular: '3201112233',
                cedula: '222222222222',
            };

            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => true,
                id: '3201112233',
                data: () => remoteCustomer,
            } as any);

            const results = await searchCustomers('3201112233', mockCache);
            expect(results).toHaveLength(1);
            expect(results[0].nombre).toBe('Cliente Remoto Firestore');
            expect(results[0].celular).toBe('3201112233');
        });
    });

    describe('2. Creación Rápida de Cliente en Mostrador (quickCreateCustomer)', () => {
        it('debe limpiar caracteres no numéricos del celular y asignar valores por defecto colombianos', async () => {
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => false,
                data: () => null,
            } as any);

            const newCust = await quickCreateCustomer({
                nombre: 'Nuevo Cliente Express',
                celular: '+57 (311) 555-4433',
                asesorAsignado: 'Carlos'
            });

            expect(newCust.celular).toBe('573115554433');
            expect(newCust.cedula).toBe('222222222222');
            expect(newCust.ciudad).toBe('Soacha');
            expect(newCust.departamento).toBe('Cundinamarca');
            expect(newCust.direccion).toBe('Venta Mostrador Soacha');
            expect(newCust.asesorAsignado).toBe('Carlos');
            expect(firestore.setDoc).toHaveBeenCalledTimes(1);
        });

        it('debe lanzar un error si el celular está vacío', async () => {
            await expect(quickCreateCustomer({
                nombre: 'Sin Celular',
                celular: 'abc---'
            })).rejects.toThrow('El número celular es obligatorio');
        });
    });

    describe('3. Integración POS y Registro de Venta con Cliente Vinculado', () => {
        it('debe registrar la venta POS vinculando la información completa del cliente', async () => {
            const sale = await createPosSale({
                cajeroId: 'pos-test-1',
                cajeroNombre: 'Cajero Soacha',
                asesor: 'Carlos',
                cliente: {
                    nombre: 'Carlos Aceros',
                    celular: '3142733410',
                    cedula: '1023456789',
                    direccion: 'Cra 7C #44-17 Sur',
                    ciudad: 'Soacha',
                    departamento: 'Cundinamarca'
                },
                items: [{
                    productId: 'detergente-multiusos',
                    nombre: 'Detergente Multiusos',
                    size: '20L',
                    cantidad: 2,
                    price: 45000,
                    subtotal: 90000
                }],
                subtotal: 90000,
                descuento: 0,
                total: 90000,
                metodoPago: 'efectivo',
                montoEfectivo: 100000,
                montoCambio: 10000
            });

            expect(sale).toBeDefined();
            expect(sale.cliente?.celular).toBe('3142733410');
            expect(sale.cliente?.ciudad).toBe('Soacha');
            expect(sale.cliente?.direccion).toBe('Cra 7C #44-17 Sur');
            expect(sale.total).toBe(90000);
            expect(sale.numeroTicket).toMatch(/^POS-/);
        });
    });
});
