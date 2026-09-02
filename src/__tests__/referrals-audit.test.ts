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
});
