import { describe, it, expect } from 'vitest';
import { ROLE_DEFINITIONS, SystemRole } from '@/types/user';
import { AuditLogEntry } from '@/lib/audit-service';

describe('Sistema de Roles y Capacidades ERP Biocambio360', () => {
    it('define los 6 roles requeridos por la organización', () => {
        const expectedRoles: SystemRole[] = [
            'superadmin',
            'director',
            'gestor',
            'produccion_calidad',
            'asesor',
            'cajero'
        ];

        expectedRoles.forEach(role => {
            expect(ROLE_DEFINITIONS[role]).toBeDefined();
            expect(ROLE_DEFINITIONS[role].label).toBeTruthy();
            expect(ROLE_DEFINITIONS[role].defaultPath).toBeTruthy();
            expect(ROLE_DEFINITIONS[role].defaultCapabilities).toBeDefined();
        });
    });

    it('Superadmin tiene todas las capacidades habilitadas', () => {
        const caps = ROLE_DEFINITIONS.superadmin.defaultCapabilities;
        expect(caps.usuarios).toBe(true);
        expect(caps.auditoria).toBe(true);
        expect(caps.pedidos).toBe(true);
        expect(caps.pos).toBe(true);
        expect(caps.produccion).toBe(true);
        expect(caps.finanzas).toBe(true);
    });

    it('Directores (Fernando, Danilo, Julian) tienen visión 360 pero sin CRUD de usuarios', () => {
        const caps = ROLE_DEFINITIONS.director.defaultCapabilities;
        expect(caps.usuarios).toBe(false);
        expect(caps.finanzas).toBe(true);
        expect(caps.pedidos).toBe(true);
        expect(caps.pos).toBe(true);
        expect(caps.produccion).toBe(true);
        expect(caps.auditoria).toBe(true);
    });

    it('Jefe de Planta & Calidad (Diego) está restringido a producción e inventario', () => {
        const caps = ROLE_DEFINITIONS.produccion_calidad.defaultCapabilities;
        expect(caps.produccion).toBe(true);
        expect(caps.pedidos).toBe(false);
        expect(caps.finanzas).toBe(false);
        expect(caps.usuarios).toBe(false);
        expect(caps.pos).toBe(false);
    });

    it('Asesores (Karen, Katherine, Camilo) tienen acceso a su cockpit, clientes y reabastecimiento', () => {
        const caps = ROLE_DEFINITIONS.asesor.defaultCapabilities;
        expect(caps.asesores).toBe(true);
        expect(caps.clientes).toBe(true);
        expect(caps.reabastecimiento).toBe(true);
        expect(caps.finanzas).toBe(false);
        expect(caps.produccion).toBe(false);
        expect(caps.usuarios).toBe(false);
    });

    it('Cajero Mostrador tiene acceso exclusivo al TPV', () => {
        const caps = ROLE_DEFINITIONS.cajero.defaultCapabilities;
        expect(caps.pos).toBe(true);
        expect(caps.pedidos).toBe(false);
        expect(caps.finanzas).toBe(false);
        expect(caps.produccion).toBe(false);
        expect(caps.usuarios).toBe(false);
    });
});

describe('Estructura de Auditoría ISO 9001', () => {
    it('valida la estructura canónica de un log de auditoría', () => {
        const sampleLog: AuditLogEntry = {
            id: 'log-123',
            fechaIso: new Date().toISOString(),
            userId: 'fernando@biocambio360.com',
            userEmail: 'fernando@biocambio360.com',
            userName: 'Fernando Gómez',
            userRole: 'director',
            modulo: 'pedidos',
            accion: 'cambio_estado',
            entidad: 'pedido',
            entidadId: 'ORD-999',
            descripcion: 'Pedido #ORD-999 cambió a entregado',
            detalles: {
                estadoAnterior: 'enviado',
                nuevoEstado: 'entregado'
            }
        };

        expect(sampleLog.userId).toBe('fernando@biocambio360.com');
        expect(sampleLog.modulo).toBe('pedidos');
        expect(sampleLog.accion).toBe('cambio_estado');
        expect(sampleLog.detalles?.nuevoEstado).toBe('entregado');
    });
});
