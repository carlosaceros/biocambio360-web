/**
 * @file addi-service.test.ts
 * Pruebas unitarias para la integración con la API de ADDI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    validateAddiBasicAuth,
    getAddiAccessToken,
    createAddiApplication
} from '@/lib/addi-service';

describe('Servicio de Integración ADDI', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.restoreAllMocks();
        process.env = {
            ...originalEnv,
            ADDI_CLIENT_ID: 'test_client_id',
            ADDI_CLIENT_SECRET: 'test_client_secret',
            ADDI_WEBHOOK_USER: 'test_webhook_user',
            ADDI_WEBHOOK_PASSWORD: 'test_webhook_password',
            NEXT_PUBLIC_URL: 'https://biocambio360.com'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('validateAddiBasicAuth', () => {
        it('retorna true con credenciales correctas en Base64', () => {
            const validHeader = `Basic ${Buffer.from('test_webhook_user:test_webhook_password').toString('base64')}`;
            expect(validateAddiBasicAuth(validHeader)).toBe(true);
        });

        it('retorna false si el usuario o contraseña son incorrectos', () => {
            const invalidHeader = `Basic ${Buffer.from('wrong_user:wrong_password').toString('base64')}`;
            expect(validateAddiBasicAuth(invalidHeader)).toBe(false);
        });

        it('retorna false si no hay cabecera o no empieza con Basic', () => {
            expect(validateAddiBasicAuth(null)).toBe(false);
            expect(validateAddiBasicAuth('Bearer some_token')).toBe(false);
            expect(validateAddiBasicAuth('')).toBe(false);
        });
    });

    describe('createAddiApplication', () => {
        it('construye payload válido y captura redirectUrl desde header Location (HTTP 301)', async () => {
            const mockFetch = vi.fn();

            // Mock de autenticación OAuth
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: 'mock_jwt_token_123',
                    expires_in: 3600
                })
            });

            // Mock de /v1/online-applications respondiendo 301 con Location
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 301,
                headers: {
                    get: (header: string) => {
                        if (header.toLowerCase() === 'location') {
                            return 'https://co-checkout.addi.com/application/app-test-123';
                        }
                        return null;
                    }
                },
                text: async () => 'Redirecting'
            });

            global.fetch = mockFetch;

            const result = await createAddiApplication({
                orderId: 'ORD-TEST-001',
                total: 120000,
                shippingCost: 15000,
                customer: {
                    nombre: 'Carlos Aceros',
                    cedula: '1018456789',
                    celular: '3101234567',
                    email: 'carlos@biocambio360.com',
                    ciudad: 'Bogotá',
                    direccion: 'Calle 100 # 15-20'
                },
                items: [
                    {
                        nombre: 'Detergente Multiusos 4L',
                        sku: 'detergente-multiusos-4L',
                        cantidad: 2,
                        price: 60000,
                        imgFile: 'detergente-multiusos.webp'
                    }
                ],
                baseUrl: 'https://biocambio360.com'
            });

            expect(result.redirectUrl).toBe('https://co-checkout.addi.com/application/app-test-123');
            expect(result.orderAttemptId).toContain('ORD-TEST-001-att-');

            // Verificar llamada con payload correcto
            expect(mockFetch).toHaveBeenCalledTimes(2);
            const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
            expect(secondCallBody.totalAmount).toBe('120000.0');
            expect(secondCallBody.shippingAmount).toBe('15000.0');
            expect(secondCallBody.client.idType).toBe('CC');
            expect(secondCallBody.client.idNumber).toBe('1018456789');
            expect(secondCallBody.client.cellphoneCountryCode).toBe('+57');
            expect(secondCallBody.currency).toBe('COP');
        });
    });
});
