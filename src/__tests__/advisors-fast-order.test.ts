import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { lookupCustomerByPhone, createOrder } from '@/lib/orders-service';
import { decrementStockForOrderItems } from '@/lib/products-service';
import { getAdvisorPortfolio } from '@/lib/advisors-service';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

describe('Centralización de Ventas Call Center / WhatsApp & Fast Order Entry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. lookupCustomerByPhone (Autocompletado Predictivo <50ms)', () => {
        it('debe retornar datos del cliente cuando existe en la colección customers', async () => {
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    nombre: 'Carlos Mario Ruiz',
                    cedula: '1020304050',
                    celular: '3123456789',
                    email: 'carlos@example.com',
                    departamento: 'Cundinamarca',
                    ciudad: 'Soacha',
                    direccion: 'Carrera 7 # 12 - 34',
                    barrio: 'San Mateo'
                })
            } as any);

            const result = await lookupCustomerByPhone('312-345-6789');
            expect(result).not.toBeNull();
            expect(result?.nombre).toBe('Carlos Mario Ruiz');
            expect(result?.ciudad).toBe('Soacha');
            expect(result?.direccion).toBe('Carrera 7 # 12 - 34');
            expect(result?.barrio).toBe('San Mateo');
        });

        it('debe consultar fallback en orders si no existe en customers', async () => {
            // customers retorna null
            vi.mocked(firestore.getDoc).mockResolvedValueOnce({
                exists: () => false,
            } as any);

            // orders retorna 1 pedido histórico
            vi.mocked(firestore.getDocs).mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            cliente: {
                                nombre: 'María Fernanda Gómez',
                                cedula: '52123456',
                                celular: '3109876543',
                                departamento: 'Cundinamarca',
                                ciudad: 'Bogotá D.C.',
                                direccion: 'Calle 100 # 15 - 20 Apto 402',
                                barrio: 'Chicó'
                            },
                            createdAt: { toMillis: () => Date.now() - 10000 }
                        })
                    }
                ]
            } as any);

            const result = await lookupCustomerByPhone('3109876543');
            expect(result).not.toBeNull();
            expect(result?.nombre).toBe('María Fernanda Gómez');
            expect(result?.direccion).toBe('Calle 100 # 15 - 20 Apto 402');
        });

        it('debe retornar null para números de teléfono inválidos (< 7 dígitos)', async () => {
            const result = await lookupCustomerByPhone('12345');
            expect(result).toBeNull();
        });
    });

    describe('2. decrementStockForOrderItems (Afectación Inmediata de Inventarios)', () => {
        it('debe descontar la cantidad comprada del stock del producto y presentación correspondiente', async () => {
            // Simular getProductById (se llama en decrementStockForOrderItems y en updateProductStock)
            vi.mocked(firestore.getDoc).mockResolvedValue({
                exists: () => true,
                id: 'detergente-ropa-profesional',
                data: () => ({
                    id: 'detergente-ropa-profesional',
                    nombre: 'Detergente Líquido Ropa',
                    stock: { '3.8L': 25, '20L': 10 }
                })
            } as any);

            await decrementStockForOrderItems([
                {
                    product: { id: 'detergente-ropa-profesional', nombre: 'Detergente Líquido' },
                    size: '3.8L',
                    cantidad: 3
                }
            ]);

            // setDoc debe haberse llamado con el nuevo stock (25 - 3 = 22)
            expect(firestore.setDoc).toHaveBeenCalled();
            const setDocCall = vi.mocked(firestore.setDoc).mock.calls[0];
            expect(setDocCall[1]).toMatchObject({
                stock: expect.objectContaining({
                    '3.8L': 22
                })
            });
        });
    });

    describe('3. createOrder con Atribución Comercial y Auditoría ISO 9001', () => {
        it('debe guardar el pedido con asesorNombre, asesorEmail, canal y descontar inventario', async () => {
            vi.mocked(firestore.addDoc).mockResolvedValueOnce({ id: 'order-callcenter-123' } as any);
            vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any);
            vi.mocked(firestore.getDoc).mockResolvedValue({
                exists: () => true,
                id: 'desengrasante-multiusos',
                data: () => ({
                    id: 'desengrasante-multiusos',
                    nombre: 'Desengrasante Multiusos',
                    stock: { '10L': 15 }
                })
            } as any);

            const orderId = await createOrder({
                cliente: {
                    nombre: 'Pedro Pérez',
                    cedula: '79123456',
                    celular: '3001234567',
                    departamento: 'Cundinamarca',
                    ciudad: 'Bogotá D.C.',
                    direccion: 'Calle 26 # 68 - 10',
                    barrio: 'Salitre'
                },
                productos: [
                    {
                        product: { id: 'desengrasante-multiusos', nombre: 'Desengrasante', imgFile: 'desengrasante.png' },
                        size: '10L',
                        cantidad: 2,
                        price: 55000
                    }
                ],
                subtotal: 110000,
                envio: 0,
                total: 110000,
                metodoPago: 'contraentrega',
                status: 'confirmado',
                canal: 'call_center',
                asesorNombre: 'Karen',
                asesorEmail: 'karen@biocambio360.com',
                asesorId: 'karen-uid'
            });

            expect(orderId).toBe('order-callcenter-123');
            expect(firestore.addDoc).toHaveBeenCalled();

            // Verificar que el payload de la orden incluya el asesor y canal
            const addDocCall = vi.mocked(firestore.addDoc).mock.calls[0];
            expect(addDocCall[1]).toMatchObject({
                canal: 'call_center',
                asesorNombre: 'Karen',
                asesorEmail: 'karen@biocambio360.com',
                status: 'confirmado'
            });
        });
    });

    describe('4. getAdvisorPortfolio con Órdenes del Mes y Comisiones', () => {
        it('debe calcular ventas reales del mes y comisiones con base en las órdenes de Firestore', async () => {
            // Mock de customers para cartera
            vi.mocked(firestore.getDocs).mockResolvedValueOnce({
                forEach: (cb: any) => {
                    cb({
                        id: '3001112233',
                        data: () => ({
                            nombre: 'Cliente 1',
                            celular: '3001112233',
                            totalSpent: 150000,
                            ordersCount: 2,
                            assignedTo: 'Karen'
                        })
                    });
                }
            } as any);

            // Mock de getOrdersByAdvisor (órdenes del mes)
            vi.mocked(firestore.getDocs).mockResolvedValueOnce({
                docs: [
                    {
                        id: 'ord-1',
                        data: () => ({
                            asesorNombre: 'Karen',
                            total: 500000,
                            status: 'entregado',
                            createdAt: { toMillis: () => Date.now() }
                        })
                    },
                    {
                        id: 'ord-2',
                        data: () => ({
                            asesorNombre: 'Karen',
                            total: 700000,
                            status: 'confirmado',
                            createdAt: { toMillis: () => Date.now() }
                        })
                    }
                ]
            } as any);

            const portfolio = await getAdvisorPortfolio('Karen');
            expect(portfolio.advisorName).toBe('Karen');
            expect(portfolio.ventasAcumuladasMes).toBe(1200000); // 500k + 700k
            expect(portfolio.pedidosMesCount).toBe(2);
            expect(portfolio.ticketPromedioMes).toBe(600000);
            expect(portfolio.pedidosHoyCount).toBe(2);
            // Comisiones base 2.0%: 1,200,000 * 0.02 = 24,000
            expect(portfolio.comisionesEstimadasCOP).toBe(24000);
        });
    });
});
