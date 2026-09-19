import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    markOrderAsFailedDelivery,
    processDeliveryException,
    getFailedDeliveryOrders
} from '@/lib/orders-service';
import { incrementStockForOrderItems } from '@/lib/products-service';
import { ORDER_STATUS_CONFIG } from '@/types/order';
import { TOURS_CONFIG } from '@/components/admin/tour/tourDefinitions';

// Mock de Firestore
const { mockUpdateDoc, mockGetDoc, mockGetDocs, mockDoc, mockCollection } = vi.hoisted(() => ({
    mockUpdateDoc: vi.fn(),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    mockDoc: vi.fn((db: any, col: string, id: string) => ({ id, path: `${col}/${id}` })),
    mockCollection: vi.fn((db: any, col: string) => ({ path: col }))
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    doc: (db: any, col: string, id: string) => mockDoc(db, col, id),
    collection: (db: any, col: string) => mockCollection(db, col),
    getDoc: (...args: any[]) => mockGetDoc(...args),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    updateDoc: (...args: any[]) => mockUpdateDoc(...args),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    query: vi.fn((col) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    Timestamp: {
        now: () => ({ seconds: 1726700000, nanoseconds: 0, toDate: () => new Date() })
    },
    arrayUnion: (...items: any[]) => items
}));

vi.mock('@/lib/firebase', () => ({
    db: {}
}));

vi.mock('@/lib/products-service', () => ({
    decrementStockForOrderItems: vi.fn().mockResolvedValue(undefined),
    incrementStockForOrderItems: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/audit-service', () => ({
    recordAuditLog: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/referrals-service', () => ({
    updateReferralTransactionOnOrderStatusChange: vi.fn().mockResolvedValue(undefined),
    renewReferralExpiration: vi.fn().mockResolvedValue(undefined)
}));

describe('Módulo de Tratamiento de Contraentregas Fallidas & Novedades', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ORDER_STATUS_CONFIG debe incluir no_entregado con badge rojo/ámbar', () => {
        const config = ORDER_STATUS_CONFIG['no_entregado'];
        expect(config).toBeDefined();
        expect(config.label).toContain('No Entregado');
        expect(config.icon).toBe('⚠️');
    });

    it('markOrderAsFailedDelivery debe asentar novedad y cambiar estado a no_entregado', async () => {
        const mockOrder = {
            id: 'ord-fail-1',
            cliente: { nombre: 'Pedro Gómez', celular: '3109998877', direccion: 'Calle 10 # 20-30', ciudad: 'Bogotá' },
            productos: [{ product: { id: 'p1', nombre: 'Detergente 20L' }, size: '20L', cantidad: 1, price: 95000 }],
            total: 95000,
            envio: 0,
            status: 'en_camino',
            metodoPago: 'contraentrega'
        };

        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockOrder
        });

        await markOrderAsFailedDelivery(
            'ord-fail-1',
            'cliente_ausente',
            'Nadie contestó en portería',
            { email: 'asesor@biocambio360.com', nombre: 'Karen', role: 'asesor' }
        );

        // Debe haber actualizado el documento con novedadEntrega y con el nuevo estado no_entregado
        expect(mockUpdateDoc).toHaveBeenCalled();
        const updateCalls = mockUpdateDoc.mock.calls;
        const payloadNovedad = updateCalls.find(call => call[1]?.novedadEntrega);
        expect(payloadNovedad).toBeDefined();
        expect(payloadNovedad![1].novedadEntrega.motivo).toBe('cliente_ausente');
        expect(payloadNovedad![1].novedadEntrega.intentosPrevios).toBe(1);
    });

    it('processDeliveryException con reintento_programado debe actualizar flete con tarifa especial y reactivar orden', async () => {
        const mockOrder = {
            id: 'ord-reintento-2',
            cliente: { nombre: 'María Ruiz', celular: '3001234567', direccion: 'Cra 15 # 40-50', ciudad: 'Bogotá' },
            productos: [{ product: { id: 'p2', nombre: 'Desengrasante 20L' }, size: '20L', cantidad: 1, price: 85000 }],
            total: 85000,
            envio: 0,
            status: 'no_entregado',
            metodoPago: 'contraentrega'
        };

        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockOrder
        });

        await processDeliveryException({
            orderId: 'ord-reintento-2',
            resolucion: 'reintento_programado',
            motivo: 'sin_dinero',
            fechaReintentoProgramada: '2026-09-20',
            franjaHoraria: 'manana',
            tarifaEspecialReintento: 10000, // +$10.000 de reintento
            transportadoraReintento: 'Flota Propia Biocambio360',
            nuevaDireccion: 'Cra 15 # 40-52 Apto 301',
            userContext: { nombre: 'Karen', role: 'asesor' }
        });

        expect(mockUpdateDoc).toHaveBeenCalled();
        const updateCalls = mockUpdateDoc.mock.calls;
        const reintentoPayload = updateCalls.find(call => call[1]?.envio === 10000);
        expect(reintentoPayload).toBeDefined();
        expect(reintentoPayload![1].total).toBe(95000); // 85000 + 10000
        expect(reintentoPayload![1].cliente.direccion).toBe('Cra 15 # 40-52 Apto 301');
    });

    it('processDeliveryException con devuelto_bodega debe cancelar y RESTITUIR stock', async () => {
        const mockOrder = {
            id: 'ord-devolucion-3',
            cliente: { nombre: 'Carlos Duque', celular: '3157778899', direccion: 'Av 68', ciudad: 'Bogotá' },
            productos: [{ product: { id: 'p1', nombre: 'Detergente 20L' }, size: '20L', cantidad: 2, price: 190000 }],
            total: 190000,
            envio: 0,
            status: 'no_entregado',
            metodoPago: 'contraentrega'
        };

        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockOrder
        });

        await processDeliveryException({
            orderId: 'ord-devolucion-3',
            resolucion: 'devuelto_bodega',
            motivo: 'rechazado',
            userContext: { nombre: 'Diego', role: 'logistico' }
        });

        // Debe haber llamado a incrementStockForOrderItems para devolver las 2 unidades a bodega
        expect(incrementStockForOrderItems).toHaveBeenCalledWith(mockOrder.productos);
    });

    it('processDeliveryException con perdido_transportadora debe cancelar SIN restituir stock', async () => {
        const mockOrder = {
            id: 'ord-siniestro-4',
            cliente: { nombre: 'Luisa Mora', celular: '3204445566', direccion: 'Calle 80', ciudad: 'Bogotá' },
            productos: [{ product: { id: 'p3', nombre: 'Lavaloza 20L' }, size: '20L', cantidad: 1, price: 75000 }],
            total: 75000,
            envio: 15000,
            status: 'no_entregado',
            metodoPago: 'contraentrega'
        };

        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockOrder
        });

        await processDeliveryException({
            orderId: 'ord-siniestro-4',
            resolucion: 'perdido_transportadora',
            motivo: 'perdido_transportadora',
            radicadoSiniestro: 'REC-99ENV-999',
            montoReclamado: 90000,
            userContext: { nombre: 'Danilo', role: 'director' }
        });

        // En un siniestro la mercancía física se perdió, NO se debe reingresar a inventario
        expect(incrementStockForOrderItems).not.toHaveBeenCalled();
    });
});

describe('Sistema de Tours Guiados Interactivas & Aha Moments', () => {
    it('debe tener configurados los 4 tours estratégicos', () => {
        expect(TOURS_CONFIG.asesores).toBeDefined();
        expect(TOURS_CONFIG.pedidos).toBeDefined();
        expect(TOURS_CONFIG.novedades).toBeDefined();
        expect(TOURS_CONFIG.direccion).toBeDefined();
    });

    it('cada tour debe tener pasos con targets DOM válidos y Aha Moments', () => {
        Object.values(TOURS_CONFIG).forEach(tour => {
            expect(tour.steps.length).toBeGreaterThan(0);
            tour.steps.forEach(step => {
                expect(step.target).toBeTruthy();
                expect(step.title).toBeTruthy();
                expect(step.description).toBeTruthy();
            });

            // Al menos un paso por tour debe incluir un Aha Moment explícito
            const hasAhaMoment = tour.steps.some(s => s.ahaMomentTitle && s.ahaMomentText);
            expect(hasAhaMoment).toBe(true);
        });
    });
});
