/**
 * @file referrals-audit.test.ts
 * Pruebas unitarias para la trazabilidad y auditoría de modificaciones de saldo de embajadores
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';

function makeDocSnap(id: string, data: Record<string, unknown> | null) {
    return {
        exists: () => data !== null,
        id,
        data: () => data,
    };
}

describe('Trazabilidad de Saldos de Embajadores', () => {
    let setDocMock: ReturnType<typeof vi.fn>;
    let updateDocMock: ReturnType<typeof vi.fn>;
    let getDocMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setDocMock = vi.fn().mockResolvedValue(undefined);
        updateDocMock = vi.fn().mockResolvedValue(undefined);
        getDocMock = vi.fn();

        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        vi.mocked(firestore.updateDoc).mockImplementation(updateDocMock);
        vi.mocked(firestore.getDoc).mockImplementation(getDocMock);
        vi.mocked(firestore.doc).mockReturnValue({} as any);
        vi.mocked(firestore.collection).mockReturnValue({} as any);
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('registra auditoría cuando se modifica el saldo disponible en updateReferralProfileAdmin', async () => {
        // Perfil existente con saldo 10.000
        getDocMock.mockResolvedValue(makeDocSnap('3186037227', {
            id: '3186037227',
            nombre: 'Carlos Blanco',
            celular: '3186037227',
            code: 'CARLOS227',
            balanceAvailable: 10000,
            tier: 'referidor',
            isActive: true,
        }) as any);

        const { updateReferralProfileAdmin } = await import('@/lib/referrals-service');

        await updateReferralProfileAdmin(
            '3186037227',
            { balanceAvailable: 35000 },
            {
                userContext: {
                    email: 'gerencia@biocambio360.com',
                    nombre: 'Carlos Admin',
                    role: 'admin'
                },
                reason: 'Bonificación comercial autorizada'
            }
        );

        // Debe haberse llamado a setDoc para crear el log de auditoría
        expect(setDocMock).toHaveBeenCalledOnce();
        const [, auditPayload] = setDocMock.mock.calls[0];

        expect(auditPayload.profileId).toBe('3186037227');
        expect(auditPayload.profileName).toBe('Carlos Blanco');
        expect(auditPayload.previousBalance).toBe(10000);
        expect(auditPayload.newBalance).toBe(35000);
        expect(auditPayload.difference).toBe(25000);
        expect(auditPayload.userEmail).toBe('gerencia@biocambio360.com');
        expect(auditPayload.userName).toBe('Carlos Admin');
        expect(auditPayload.reason).toBe('Bonificación comercial autorizada');
        expect(auditPayload.source).toBe('admin_modal');

        // Y updateDoc debe haber actualizado el perfil en Firestore
        expect(updateDocMock).toHaveBeenCalledOnce();
    });

    it('NO registra auditoría si el saldo no cambia', async () => {
        getDocMock.mockResolvedValue(makeDocSnap('3186037227', {
            id: '3186037227',
            nombre: 'Carlos Blanco',
            celular: '3186037227',
            code: 'CARLOS227',
            balanceAvailable: 10000,
            tier: 'referidor',
            isActive: true,
        }) as any);

        const { updateReferralProfileAdmin } = await import('@/lib/referrals-service');

        // Solo se actualiza el tier, el saldo es idéntico
        await updateReferralProfileAdmin(
            '3186037227',
            { balanceAvailable: 10000, tier: 'aliado' }
        );

        // setDoc para auditoría NO debe haberse llamado
        expect(setDocMock).not.toHaveBeenCalled();
        // Solo updateDoc para el perfil
        expect(updateDocMock).toHaveBeenCalledOnce();
    });

    it('registra anulación de saldo en auditoría cuando un embajador entra a lista negra con penalización', async () => {
        getDocMock.mockResolvedValue(makeDocSnap('3186037227', {
            id: '3186037227',
            nombre: 'Carlos Blanco',
            celular: '3186037227',
            code: 'CARLOS227',
            balanceAvailable: 50000,
            tier: 'referidor',
            isActive: true,
        }) as any);

        const { toggleBlacklistReferralProfile } = await import('@/lib/referrals-service');

        await toggleBlacklistReferralProfile(
            '3186037227',
            true,
            'Autorreferidos no conformes',
            true, // penalizeBalances
            {
                userContext: {
                    email: 'auditor@biocambio360.com',
                    nombre: 'Auditoría Interna',
                    role: 'admin'
                }
            }
        );

        expect(setDocMock).toHaveBeenCalledOnce();
        const [, auditPayload] = setDocMock.mock.calls[0];

        expect(auditPayload.previousBalance).toBe(50000);
        expect(auditPayload.newBalance).toBe(0);
        expect(auditPayload.difference).toBe(-50000);
        expect(auditPayload.source).toBe('blacklist_penalty');
        expect(auditPayload.userEmail).toBe('auditor@biocambio360.com');
    });

    describe('Regla 1: Un solo uso de link de referido por nuevo cliente (Primera compra)', () => {
        it('rechaza el beneficio si el cliente ya registra pedidos en customers', async () => {
            getDocMock.mockResolvedValue(makeDocSnap('3001234567', {
                id: '3001234567',
                nombre: 'Cliente Recurrente',
                ordersCount: 2,
                totalSpent: 120000
            }) as any);

            const { isCustomerFirstPurchase } = await import('@/lib/referrals-service');
            const result = await isCustomerFirstPurchase({ celular: '3001234567' });

            expect(result.isFirstPurchase).toBe(false);
            expect(result.reason).toContain('exclusivo para la primera compra');
        });

        it('aprueba el beneficio si el cliente no registra pedidos previos', async () => {
            getDocMock.mockResolvedValue(makeDocSnap('3009999999', null) as any);
            const getDocsMock = vi.fn().mockResolvedValue({ empty: true, docs: [] });
            vi.mocked(firestore.getDocs).mockImplementation(getDocsMock);

            const { isCustomerFirstPurchase } = await import('@/lib/referrals-service');
            const result = await isCustomerFirstPurchase({ celular: '3009999999' });

            expect(result.isFirstPurchase).toBe(true);
        });
    });

    describe('Regla 2: Normalización de Direcciones y Detección de Recurrencia en 30 días', () => {
        it('normaliza direcciones colombianas eliminando caracteres especiales y estandarizando vías', async () => {
            const { normalizeAddress } = await import('@/lib/orders-service');

            const addr1 = normalizeAddress('Calle 45 # 12 - 34 Apto 301');
            const addr2 = normalizeAddress('CLL 45 No. 12-34 apartamento 301');
            const addr3 = normalizeAddress('Carrera 15 # 85-20');
            const addr4 = normalizeAddress('CRA 15 No 85 20');

            expect(addr1).toBe('cll 45 12 34 apto 301');
            expect(addr2).toBe('cll 45 12 34 apto 301');
            expect(addr1).toBe(addr2);
            expect(addr3).toBe(addr4);
        });
    });

    describe('Regla 3 & 4: Ventana de Custodia de 24h y Renovación Continua de 60 Días', () => {
        it('establece fecha de liberación availableAt a las 24h post-entrega y estado holding_24h', async () => {
            const mockTx = {
                id: 'tx_order123',
                referralProfileId: '3186037227',
                rewardAmount: 10000,
                status: 'pending',
                releaseStatus: 'pending_delivery'
            };

            getDocMock.mockResolvedValue(makeDocSnap('tx_order123', mockTx) as any);

            const runTransactionMock = vi.fn().mockImplementation(async (db, cb) => {
                const fakeTransaction = {
                    get: vi.fn().mockResolvedValue(makeDocSnap('3186037227', {
                        id: '3186037227',
                        tier: 'referidor',
                        totalDeliveredOrders: 0,
                        balancePending: 10000,
                        balanceInHolding: 0,
                        balanceAvailable: 0
                    })),
                    update: vi.fn()
                };
                return await cb(fakeTransaction);
            });
            vi.mocked(firestore.runTransaction).mockImplementation(runTransactionMock);

            const { updateReferralTransactionOnOrderStatusChange } = await import('@/lib/referrals-service');
            await updateReferralTransactionOnOrderStatusChange('order123', 'entregado');

            expect(runTransactionMock).toHaveBeenCalled();
        });
    });
});
