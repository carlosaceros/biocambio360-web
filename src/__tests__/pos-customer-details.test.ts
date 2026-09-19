import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { Customer } from '@/types/customer';
import {
    getCustomerPurchaseHistory,
    CustomerPurchaseHistoryItem
} from '@/lib/customers-service';
import { PosItem } from '@/types/pos';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        doc: vi.fn(),
        addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-1' }),
        setDoc: vi.fn().mockResolvedValue(undefined),
        getDoc: vi.fn(),
        getDocs: vi.fn(),
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

describe('POS Mostrador Soacha: Ficha y Detalles de Clientes Antiguos', () => {
    const mockCustomer: Customer = {
        id: '3142733410',
        nombre: 'Carlos Aceros',
        celular: '+57 314 273 3410',
        cedula: '1023456789',
        email: 'carlos@biocambio360.com',
        direccion: 'Cra 7C #44-17 Sur',
        ciudad: 'Soacha',
        departamento: 'Cundinamarca',
        totalSpent: 485000,
        ordersCount: 4,
        lastOrderDate: { seconds: 1726500000, toMillis: () => 1726500000000 } as any,
        firstOrderDate: { seconds: 1715000000, toMillis: () => 1715000000000 } as any,
        createdAt: { seconds: 1715000000 } as any,
        updatedAt: { seconds: 1726500000 } as any,
        asesorAsignado: 'Carlos',
        isReferrer: true,
        referralCode: 'CARLOS360'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Consulta y Unificación de Historial de Compras (getCustomerPurchaseHistory)', () => {
        it('debe limpiar el celular y retornar compras ordenadas descendentemente por fecha', async () => {
            const mockPosDocs = [
                {
                    id: 'pos-sale-1',
                    data: () => ({
                        numeroTicket: 'POS-260918-1001',
                        fecha: { seconds: 1726650000, toMillis: () => 1726650000000 },
                        createdAt: { seconds: 1726650000, toMillis: () => 1726650000000 },
                        total: 125000,
                        subtotal: 125000,
                        descuento: 0,
                        metodoPago: 'efectivo',
                        items: [
                            {
                                productId: 'detergente-liquido-ropa',
                                nombre: 'Detergente Líquido Ropa',
                                size: '20L',
                                cantidad: 1,
                                precioUnitario: 85000,
                                subtotal: 85000
                            },
                            {
                                productId: 'suavizante-textil',
                                nombre: 'Suavizante Textil',
                                size: '10L',
                                cantidad: 1,
                                precioUnitario: 40000,
                                subtotal: 40000
                            }
                        ]
                    })
                }
            ];

            const mockOrderDocs = [
                {
                    id: 'order-web-1',
                    data: () => ({
                        createdAt: { seconds: 1726600000, toMillis: () => 1726600000000 },
                        total: 95000,
                        discountAmount: 10000,
                        paymentMethod: 'contraentrega',
                        status: 'entregado',
                        items: [
                            {
                                product: { id: 'desengrasante-industrial', nombre: 'Desengrasante Industrial' },
                                size: '20L',
                                cantidad: 1,
                                price: 95000
                            }
                        ]
                    })
                }
            ];

            // Mock getDocs to return POS sales on first call and orders on second call
            vi.mocked(firestore.getDocs)
                .mockResolvedValueOnce({ docs: mockPosDocs as any } as any)
                .mockResolvedValueOnce({ docs: mockOrderDocs as any } as any);

            const history = await getCustomerPurchaseHistory('+57 314 273 3410');

            expect(history).toHaveLength(2);
            // First item should be the most recent one (pos-sale-1 with 1726650000)
            expect(history[0].tipo).toBe('POS Mostrador');
            expect(history[0].numeroComprobante).toBe('POS-260918-1001');
            expect(history[0].total).toBe(125000);
            expect(history[0].items).toHaveLength(2);

            // Second item should be order-web-1 (1726600000)
            expect(history[1].tipo).toBe('Pedido Online / Asesor');
            expect(history[1].numeroComprobante).toBe('order-web-1');
            expect(history[1].total).toBe(95000);
            expect(history[1].items[0].nombre).toBe('Desengrasante Industrial');
        });

        it('debe manejar clientes sin historial o números vacíos sin arrojar error', async () => {
            const emptyResult = await getCustomerPurchaseHistory('');
            expect(emptyResult).toEqual([]);

            vi.mocked(firestore.getDocs)
                .mockResolvedValueOnce({ docs: [] as any } as any)
                .mockResolvedValueOnce({ docs: [] as any } as any);

            const noPurchases = await getCustomerPurchaseHistory('3000000000');
            expect(noPurchases).toEqual([]);
        });
    });

    describe('2. Clasificación de Categoría / Tier de Fidelidad del Cliente', () => {
        const getTier = (c: Customer) => {
            if (c.ordersCount >= 4 || c.totalSpent >= 300000) return 'VIP';
            if (c.ordersCount >= 2) return 'Frecuente';
            if (c.ordersCount === 1) return 'Primera Compra';
            return 'Prospecto';
        };

        it('debe categorizar correctamente según compras y monto acumulado', () => {
            expect(getTier(mockCustomer)).toBe('VIP');

            const clienteFrecuente: Customer = {
                ...mockCustomer,
                ordersCount: 2,
                totalSpent: 120000
            };
            expect(getTier(clienteFrecuente)).toBe('Frecuente');

            const clienteNuevo: Customer = {
                ...mockCustomer,
                ordersCount: 1,
                totalSpent: 50000
            };
            expect(getTier(clienteNuevo)).toBe('Primera Compra');

            const prospecto: Customer = {
                ...mockCustomer,
                ordersCount: 0,
                totalSpent: 0
            };
            expect(getTier(prospecto)).toBe('Prospecto');
        });
    });

    describe('3. Reorden y Carga en Carrito POS (Reorder)', () => {
        it('debe convertir ítems de compra previa en PosItem y sumar cantidades si ya existen', () => {
            const currentCart: PosItem[] = [
                {
                    productId: 'detergente-liquido-ropa',
                    nombre: 'Detergente Líquido Ropa',
                    size: '20L',
                    price: 85000,
                    precioUnitario: 85000,
                    cantidad: 1,
                    subtotal: 85000
                }
            ];

            const reorderItems: PosItem[] = [
                {
                    productId: 'detergente-liquido-ropa',
                    nombre: 'Detergente Líquido Ropa',
                    size: '20L',
                    price: 85000,
                    precioUnitario: 85000,
                    cantidad: 2,
                    subtotal: 170000
                },
                {
                    productId: 'suavizante-textil',
                    nombre: 'Suavizante Textil',
                    size: '10L',
                    price: 40000,
                    precioUnitario: 40000,
                    cantidad: 1,
                    subtotal: 40000
                }
            ];

            let updatedCart = [...currentCart];
            for (const newItem of reorderItems) {
                const idx = updatedCart.findIndex(it => it.productId === newItem.productId && it.size === newItem.size);
                if (idx >= 0) {
                    const existing = updatedCart[idx]!;
                    updatedCart[idx] = {
                        ...existing,
                        cantidad: existing.cantidad + newItem.cantidad,
                        subtotal: (existing.cantidad + newItem.cantidad) * existing.price
                    };
                } else {
                    updatedCart.push(newItem);
                }
            }


            expect(updatedCart).toHaveLength(2);
            // Detergente should now have quantity 1 + 2 = 3
            expect(updatedCart[0].cantidad).toBe(3);
            expect(updatedCart[0].subtotal).toBe(255000);
            // Suavizante should be added with quantity 1
            expect(updatedCart[1].productId).toBe('suavizante-textil');
            expect(updatedCart[1].cantidad).toBe(1);
        });
    });

    describe('4. Generación de Ficha Completa para Portapapeles', () => {
        it('debe estructurar texto limpio con datos de despacho y contacto', () => {
            const info = `*FICHA DE CLIENTE BIOCAMBIO360*\n` +
                `• Nombre: ${mockCustomer.nombre}\n` +
                `• Celular: ${mockCustomer.celular}\n` +
                `• Cédula / NIT: ${mockCustomer.cedula}\n` +
                `• Ciudad: ${mockCustomer.ciudad} (${mockCustomer.departamento})\n` +
                `• Dirección: ${mockCustomer.direccion}`;

            expect(info).toContain('Carlos Aceros');
            expect(info).toContain('314 273 3410');
            expect(info).toContain('Cra 7C #44-17 Sur');
            expect(info).toContain('Soacha (Cundinamarca)');
        });
    });
});
