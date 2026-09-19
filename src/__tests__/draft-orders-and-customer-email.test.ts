import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { getCarrierDisplayName, getTrackingUrl } from '@/lib/shipping-tracking';
import { ORDER_STATUS_CONFIG } from '@/types/order';
import { createOrder, updateOrderStatus, safeToArray, getDraftOrdersByAdvisor } from '@/lib/orders-service';
import { decrementStockForOrderItems } from '@/lib/products-service';
import { sendOrderStatusCustomerEmail, emailTransport } from '@/lib/email-service';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        doc: vi.fn(),
        addDoc: vi.fn().mockResolvedValue({ id: 'mock-order-uuid-123' }),
        getDoc: vi.fn(),
        getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
        updateDoc: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        Timestamp: {
            now: vi.fn(() => ({ toMillis: () => 1726000000000, seconds: 1726000000 })),
            fromMillis: vi.fn((m) => ({ toMillis: () => m })),
        },
        arrayUnion: vi.fn((...items) => items),
    };
});

vi.mock('@/lib/products-service', () => ({
    decrementStockForOrderItems: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/customers-service', () => ({
    upsertCustomerFromOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/abandoned-cart-service', () => ({
    autoRecoverMatchingAbandonedCarts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit-service', () => ({
    recordAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/referrals-service', () => ({
    updateReferralTransactionOnOrderStatusChange: vi.fn().mockResolvedValue(undefined),
    renewReferralExpiration: vi.fn().mockResolvedValue(undefined),
}));

describe('Borradores Comerciales, Tracking 99 Envíos & Notificaciones de Estado al Cliente', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Módulo de Trazabilidad y Tracking (shipping-tracking.ts)', () => {
        it('debe normalizar nombres de transportadoras correctamente', () => {
            expect(getCarrierDisplayName('Flota Propia Local')).toBe('Flota Propia Biocambio360');
            expect(getCarrierDisplayName('domicilio')).toBe('Flota Propia Biocambio360');
            expect(getCarrierDisplayName('interrapidisimo')).toBe('Interrapidísimo');
            expect(getCarrierDisplayName('coordinadora')).toBe('Coordinadora');
            expect(getCarrierDisplayName('servientrega')).toBe('Servientrega');
            expect(getCarrierDisplayName('envia')).toBe('Envía');
            expect(getCarrierDisplayName('tcc')).toBe('TCC');
            expect(getCarrierDisplayName('')).toBe('99 Envíos');
        });

        it('debe generar URL de rastreo directo para Interrapidísimo', () => {
            const url = getTrackingUrl('Interrapidísimo', '700123456789', 'order-abc');
            expect(url).toBe('https://www.interrapidisimo.com/sigue-tu-envio/?guia=700123456789');
        });

        it('debe generar URL de rastreo directo para Coordinadora', () => {
            const url = getTrackingUrl('Coordinadora', '98765432100', 'order-abc');
            expect(url).toBe('https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=98765432100');
        });

        it('debe dirigir a la confirmación del pedido si es Flota Propia Biocambio360', () => {
            const url = getTrackingUrl('Flota Propia', 'LOCAL-001', 'order-xyz');
            expect(url).toBe('https://biocambio360.com/confirmacion/order-xyz');
        });

        it('debe usar el portal de 99 Envíos como fallback si es otra transportadora', () => {
            const url = getTrackingUrl('Otra Transportadora', 'GUIA-99-4455', 'order-123');
            expect(url).toBe('https://99envios.app/tracking/GUIA-99-4455');
        });
    });

    describe('2. Configuración y Reglas de Estado "Borrador"', () => {
        it('ORDER_STATUS_CONFIG debe incluir el estado borrador con su etiqueta y colores', () => {
            const draftConfig = ORDER_STATUS_CONFIG['borrador'];
            expect(draftConfig).toBeDefined();
            expect(draftConfig.label).toBe('Borrador / Cotización');
            expect(draftConfig.color).toContain('amber');
        });

        it('createOrder con status="borrador" NO debe descontar inventario en bodega', async () => {
            const orderId = await createOrder({
                cliente: {
                    nombre: 'Pedro Pérez',
                    cedula: '12345678',
                    celular: '3001234567',
                    departamento: 'Cundinamarca',
                    ciudad: 'Bogotá D.C.',
                    direccion: 'Calle 123 # 45 - 67',
                },
                productos: [
                    {
                        product: { id: 'det-ropa-5l', nombre: 'Detergente Ropa 5L', imgFile: 'det.png' },
                        size: '5L',
                        cantidad: 2,
                        price: 35000,
                    }
                ],
                subtotal: 70000,
                envio: 9000,
                total: 79000,
                metodoPago: 'contraentrega',
                status: 'borrador',
                motivoBorrador: 'Consulta con socio o familia',
                canal: 'call_center',
                asesorNombre: 'Karen'
            });

            expect(orderId).toBe('mock-order-uuid-123');
            expect(decrementStockForOrderItems).not.toHaveBeenCalled();
        });

        it('createOrder con status="confirmado" SÍ debe descontar inventario', async () => {
            const orderId = await createOrder({
                cliente: {
                    nombre: 'Laura Gómez',
                    cedula: '87654321',
                    celular: '3119876543',
                    departamento: 'Cundinamarca',
                    ciudad: 'Soacha',
                    direccion: 'Carrera 7C # 44 - 17',
                },
                productos: [
                    {
                        product: { id: 'deseng-ind-20l', nombre: 'Desengrasante 20L', imgFile: 'deseng.png' },
                        size: '20L',
                        cantidad: 1,
                        price: 120000,
                    }
                ],
                subtotal: 120000,
                envio: 0,
                total: 120000,
                metodoPago: 'contraentrega',
                status: 'confirmado',
                canal: 'call_center',
                asesorNombre: 'Katherine'
            });

            expect(orderId).toBe('mock-order-uuid-123');
            expect(decrementStockForOrderItems).toHaveBeenCalledTimes(1);
        });
    });

    describe('3. Reactivación de Borrador a Confirmado y Notificaciones al Cliente', () => {
        it('updateOrderStatus de "borrador" a "confirmado" debe descontar stock', async () => {
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    status: 'borrador',
                    total: 95000,
                    cliente: {
                        nombre: 'Andrés López',
                        email: 'andres@example.com',
                        celular: '3151234567',
                        ciudad: 'Bogotá D.C.'
                    },
                    productos: [
                        {
                            product: { id: 'suav-5l', nombre: 'Suavizante 5L', imgFile: 'suav.png' },
                            size: '5L',
                            cantidad: 2,
                            price: 32000
                        }
                    ]
                })
            } as any);

            await updateOrderStatus('mock-order-uuid-123', 'confirmado', 'Borrador cerrado por asesor');

            expect(firestore.updateDoc).toHaveBeenCalled();
            expect(decrementStockForOrderItems).toHaveBeenCalledTimes(1);
        });
    });

    describe('4. Plantilla de Correo de Notificación de Estado al Cliente', () => {
        it('sendOrderStatusCustomerEmail debe omitirse si el estado es borrador', async () => {
            const sendSpy = vi.spyOn(emailTransport, 'send').mockResolvedValue({ success: true, messageId: 'test-id' });

            await sendOrderStatusCustomerEmail({
                orderId: 'order-123456',
                customerName: 'Cliente Prueba',
                customerEmail: 'prueba@biocambio360.com',
                status: 'borrador',
                total: 50000
            });

            expect(sendSpy).not.toHaveBeenCalled();
        });

        it('sendOrderStatusCustomerEmail debe incluir el botón de rastreo si el estado es enviado o en_camino', async () => {
            const sendSpy = vi.spyOn(emailTransport, 'send').mockResolvedValue({ success: true, messageId: 'test-id' });

            await sendOrderStatusCustomerEmail({
                orderId: 'order-789012',
                customerName: 'Cliente Destinatario',
                customerEmail: 'cliente@ejemplo.com',
                status: 'en_camino',
                total: 89000,
                shippingCarrier: 'Interrapidísimo',
                trackingNumber: '700998877665',
                items: [{ nombre: 'Detergente Industrial 5L', cantidad: 2 }]
            });

            expect(sendSpy).toHaveBeenCalledTimes(1);
            const callArgs = sendSpy.mock.calls[0][0];
            expect(callArgs.subject).toContain('EN CAMINO');
            expect(callArgs.subject).toContain('order-789012'.slice(-8).toUpperCase());
            expect(callArgs.htmlContent).toContain('700998877665');
            expect(callArgs.htmlContent).toContain('Interrapidísimo');
            expect(callArgs.htmlContent).toContain('Rastrear Envío en Vivo');
            expect(callArgs.htmlContent).toContain('https://www.interrapidisimo.com/sigue-tu-envio/?guia=700998877665');
        });
    });

    describe('5. Resiliencia de Productos de Borradores (safeToArray y compatibilidad con objetos de Firestore)', () => {
        it('safeToArray debe convertir arrays, objetos numéricos, null y valores indefinidos de forma segura', () => {
            // Caso array normal
            const arr = [{ id: 1 }, { id: 2 }];
            expect(safeToArray(arr)).toEqual(arr);

            // Caso objeto con llaves numéricas serializado por Firestore
            const firestoreObj = {
                '0': { id: 'prod-1', cantidad: 2 },
                '1': { id: 'prod-2', cantidad: 1 }
            };
            const converted = safeToArray(firestoreObj);
            expect(Array.isArray(converted)).toBe(true);
            expect(converted.length).toBe(2);
            expect(converted[0].id).toBe('prod-1');
            expect(converted[1].id).toBe('prod-2');

            // Casos null, undefined y primitivos
            expect(safeToArray(null)).toEqual([]);
            expect(safeToArray(undefined)).toEqual([]);
            expect(safeToArray('string')).toEqual([]);
            expect(safeToArray(123)).toEqual([]);
        });

        it('getDraftOrdersByAdvisor debe normalizar órdenes con productos como objeto a un Array válido', async () => {
            // Simular Firestore con productos guardados como objeto en lugar de array
            vi.mocked(firestore.getDocs).mockResolvedValueOnce({
                docs: [
                    {
                        id: 'draft-order-obj-123',
                        data: () => ({
                            status: 'borrador',
                            total: 180000,
                            asesorNombre: 'Karen',
                            cliente: {
                                nombre: 'Detergentes SAS',
                                celular: '3109998877',
                                ciudad: 'Bogotá D.C.'
                            },
                            // Objeto simulado de Firestore
                            productos: {
                                '0': {
                                    cantidad: 2,
                                    product: { nombre: 'Detergente Industrial 20L' },
                                    size: '20L',
                                    price: 65000
                                },
                                '1': {
                                    cantidad: 1,
                                    product: { nombre: 'Desengrasante 20L' },
                                    size: '20L',
                                    price: 50000
                                }
                            },
                            createdAt: { toMillis: () => 1726000000000 }
                        })
                    }
                ],
                empty: false
            } as any);

            const drafts = await getDraftOrdersByAdvisor('Karen');
            expect(drafts.length).toBe(1);
            const draft = drafts[0];

            // Debe ser un Array
            expect(Array.isArray(draft.productos)).toBe(true);
            expect(draft.productos.length).toBe(2);

            // Debe poder mapearse directamente sin lanzar '(e.productos || []).map is not a function'
            expect(() => {
                const itemsSummary = (draft.productos || [])
                    .map((p: any) => `${p.cantidad}x ${p.product?.nombre} (${p.size})`)
                    .join('\n• ');
                expect(itemsSummary).toContain('2x Detergente Industrial 20L (20L)');
                expect(itemsSummary).toContain('1x Desengrasante 20L (20L)');
            }).not.toThrow();
        });
    });
});
