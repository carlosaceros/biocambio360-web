import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    recordUserLogin,
    recordUserLogout,
    recordUserHeartbeat,
} from '@/lib/user-sessions-service';

// Mock de Firestore
vi.mock('@/lib/firebase', () => ({
    db: {
        app: {},
    },
}));

const mockSetDoc = vi.fn(async (..._args: any[]) => {});
const mockUpdateDoc = vi.fn(async (..._args: any[]) => {});
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn((_db, _col, id) => ({ id })),
    setDoc: vi.fn(async (...args: any[]) => mockSetDoc(...args)),
    updateDoc: vi.fn(async (...args: any[]) => mockUpdateDoc(...args)),
    getDoc: vi.fn(async (...args: any[]) => mockGetDoc(...args)),
    getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    onSnapshot: vi.fn(() => () => {}),
    serverTimestamp: vi.fn(() => ({ seconds: 1726789000, nanoseconds: 0 })),
    Timestamp: {
        now: () => ({
            seconds: 1726789000,
            nanoseconds: 0,
            toDate: () => new Date('2026-09-19T18:00:00Z'),
        }),
    },
}));

describe('1. Registro de Sesiones y Presencia de Usuarios (Super Admin Log)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('registra el inicio de sesión del usuario con rol y navegador', async () => {
        const sessionId = await recordUserLogin('danilo@thinktic.co', 'Danilo Admin', 'superadmin');

        expect(sessionId).toBeDefined();
        expect(sessionId.startsWith('sess_')).toBe(true);
        expect(mockSetDoc).toHaveBeenCalledTimes(1);

        const callArgs = mockSetDoc.mock.calls[0] as any[];
        const record = callArgs?.[1];
        expect(record?.email).toBe('danilo@thinktic.co');
        expect(record?.nombre).toBe('Danilo Admin');
        expect(record?.rol).toBe('superadmin');
        expect(record?.isOnline).toBe(true);
        expect(record?.status).toBe('active');
    });

    it('actualiza el latido de actividad (heartbeat)', async () => {
        await recordUserHeartbeat('danilo@thinktic.co', 'sess_test_123');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('registra el cierre de sesión calculando duración', async () => {
        mockGetDoc.mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
                loginAt: {
                    toMillis: () => Date.now() - 30 * 60 * 1000,
                },
            }),
        });

        await recordUserLogout('danilo@thinktic.co', 'sess_test_123');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

        // Llamada 1: admin_users
        const adminCallArgs = mockUpdateDoc.mock.calls[0] as any[];
        expect(adminCallArgs?.[1]?.isOnline).toBe(false);

        // Llamada 2: user_sessions con duration y status closed
        const sessionCallArgs = mockUpdateDoc.mock.calls[1] as any[];
        const sessionUpdates = sessionCallArgs?.[1];
        expect(sessionUpdates?.isOnline).toBe(false);
        expect(sessionUpdates?.status).toBe('closed');
        expect(sessionUpdates?.durationMinutes).toBeGreaterThanOrEqual(29);
    });
});

describe('2. Deduplicación Matemática y Confiabilidad de Carritos Abandonados', () => {
    const rawCarts = [
        {
            id: 'cart-1',
            cartToken: 'tok-1',
            email: 'yudianacona@hotmail.com',
            phone: '3017020402',
            clientName: 'Yudi Masiel Anacona Obando',
            recovered: true,
            orderId: '8DuKwm',
            orderNumber: '8DuKwm',
            cartTotal: 120_000,
            status: 'recovered',
            updatedAt: '2026-09-19T10:00:00Z',
        },
        {
            id: 'cart-2',
            cartToken: 'tok-2',
            email: 'seleccionglobal39@gmail.com',
            phone: '3017020402',
            clientName: 'Yudi Masiel Anacona Obando',
            recovered: true,
            orderId: '8DuKwm',
            orderNumber: '8DuKwm',
            cartTotal: 120_000,
            status: 'recovered',
            updatedAt: '2026-09-19T10:05:00Z',
        },
        {
            id: 'cart-3',
            cartToken: 'tok-3',
            email: 'carlos@ejemplo.com',
            phone: '3109998877',
            clientName: 'Carlos Pérez',
            recovered: false,
            orderId: undefined,
            cartTotal: 85_000,
            status: 'abandoned',
            updatedAt: '2026-09-19T11:00:00Z',
        },
        {
            id: 'cart-4',
            cartToken: 'tok-4',
            email: 'carlos@ejemplo.com',
            phone: '3109998877',
            clientName: 'Carlos Pérez',
            recovered: false,
            orderId: undefined,
            cartTotal: 85_000,
            status: 'abandoned',
            updatedAt: '2026-09-19T11:15:00Z',
        },
    ];

    it('unifica carritos recuperados bajo el mismo pedido (evita inflar ventas recuperadas)', () => {
        const recoveredMap = new Map<string, any>();
        const recoveredCarts = rawCarts.filter(c => c.recovered || c.orderId);

        for (const c of recoveredCarts) {
            const key = c.orderId || c.orderNumber || c.cartToken;
            if (!recoveredMap.has(key)) {
                recoveredMap.set(key, { ...c, consolidationCount: 1 });
            } else {
                recoveredMap.get(key).consolidationCount += 1;
            }
        }

        const consolidatedRecovered = Array.from(recoveredMap.values());
        expect(consolidatedRecovered.length).toBe(1);
        expect(consolidatedRecovered[0].orderId).toBe('8DuKwm');
        expect(consolidatedRecovered[0].consolidationCount).toBe(2);
        const totalRecoveredVal = consolidatedRecovered.reduce((acc, c) => acc + c.cartTotal, 0);
        expect(totalRecoveredVal).toBe(120_000);
    });

    it('consolida múltiples intentos de abandono del mismo cliente en una sola oportunidad de rescate', () => {
        const abandonedPending = rawCarts.filter(c => !c.recovered && !c.orderId);
        const uniqueAbandonedMap = new Map<string, any>();

        for (const c of abandonedPending) {
            const clientKey = c.phone || c.email;
            if (!uniqueAbandonedMap.has(clientKey)) {
                uniqueAbandonedMap.set(clientKey, { ...c, attempts: 1 });
            } else {
                uniqueAbandonedMap.get(clientKey).attempts += 1;
            }
        }

        const consolidatedAbandoned = Array.from(uniqueAbandonedMap.values());
        expect(consolidatedAbandoned.length).toBe(1);
        expect(consolidatedAbandoned[0].clientName).toBe('Carlos Pérez');
        expect(consolidatedAbandoned[0].attempts).toBe(2);
        const totalLostVal = consolidatedAbandoned.reduce((acc, c) => acc + c.cartTotal, 0);
        expect(totalLostVal).toBe(85_000);
    });
});
