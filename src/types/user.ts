export type SystemRole = 
    | 'superadmin' 
    | 'director' 
    | 'gestor' 
    | 'produccion_calidad' 
    | 'asesor' 
    | 'cajero'
    | 'mensajero';

export interface UserModuleCapabilities {
    pedidos: boolean;
    pos: boolean;
    asesores: boolean;
    produccion: boolean;
    finanzas: boolean;
    clientes: boolean;
    reabastecimiento: boolean;
    cupones: boolean;
    envios: boolean;
    auditoria: boolean;
    usuarios: boolean;
    mensajeria?: boolean;
}

export interface AdminUserRecord {
    uid?: string;
    email: string;
    nombre: string;
    rol: SystemRole;
    asesorAsignado?: string; // Ej: "Karen", "Katherine", "Camilo", etc.
    estado: 'activo' | 'inactivo';
    capacidades: UserModuleCapabilities;
    createdAt: string;
    updatedAt: string;
    ultimoIngreso?: string;
}

export const ROLE_DEFINITIONS: Record<SystemRole, {
    label: string;
    badgeColor: string;
    description: string;
    defaultPath: string;
    defaultCapabilities: UserModuleCapabilities;
}> = {
    superadmin: {
        label: 'Super Administrador',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Acceso total y configuración del sistema, gestión de usuarios y auditoría.',
        defaultPath: '/admin',
        defaultCapabilities: {
            pedidos: true,
            pos: true,
            asesores: true,
            produccion: true,
            finanzas: true,
            clientes: true,
            reabastecimiento: true,
            cupones: true,
            envios: true,
            auditoria: true,
            usuarios: true,
            mensajeria: true,
        }
    },
    director: {
        label: 'Director Estratégico',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        description: 'Fernando, Danilo y Julián. Visión 360°, métricas financieras, P&L, ventas y CRM.',
        defaultPath: '/admin',
        defaultCapabilities: {
            pedidos: true,
            pos: true,
            asesores: true,
            produccion: true,
            finanzas: true,
            clientes: true,
            reabastecimiento: true,
            cupones: true,
            envios: true,
            auditoria: true,
            usuarios: false,
            mensajeria: true,
        }
    },
    gestor: {
        label: 'Gestor Operativo / Logístico',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Despachos, guías de envío 99Envíos, cotizaciones y control operativo.',
        defaultPath: '/admin/pedidos',
        defaultCapabilities: {
            pedidos: true,
            pos: false,
            asesores: false,
            produccion: false,
            finanzas: false,
            clientes: true,
            reabastecimiento: true,
            cupones: true,
            envios: true,
            auditoria: false,
            usuarios: false,
            mensajeria: true,
        }
    },
    produccion_calidad: {
        label: 'Jefe de Planta & Calidad',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        description: 'Diego. Órdenes de producción, recetas BOM, formulaciones químicas y lotes INVIMA.',
        defaultPath: '/admin/produccion',
        defaultCapabilities: {
            pedidos: false,
            pos: false,
            asesores: false,
            produccion: true,
            finanzas: false,
            clientes: false,
            reabastecimiento: false,
            cupones: false,
            envios: false,
            auditoria: false,
            usuarios: false,
        }
    },
    asesor: {
        label: 'Asesor Comercial',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        description: 'Karen, Katherine, Andrea, Laura, Camilo. Cartera propia, recompra y WhatsApp.',
        defaultPath: '/admin/asesores',
        defaultCapabilities: {
            pedidos: false,
            pos: false,
            asesores: true,
            produccion: false,
            finanzas: false,
            clientes: true,
            reabastecimiento: true,
            cupones: false,
            envios: false,
            auditoria: false,
            usuarios: false,
            mensajeria: true,
        }
    },
    cajero: {
        label: 'Cajero Mostrador Soacha',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        description: 'Cobro táctil en mostrador, arqueo ciego de caja y traslados de bodega.',
        defaultPath: '/admin/pos',
        defaultCapabilities: {
            pedidos: false,
            pos: true,
            asesores: false,
            produccion: false,
            finanzas: false,
            clientes: false,
            reabastecimiento: false,
            cupones: false,
            envios: false,
            auditoria: false,
            usuarios: false,
            mensajeria: false,
        }
    },
    mensajero: {
        label: 'Mensajero Flota Propia',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Última milla Bogotá y Sabana: entrega de pedidos, recaudo contraentrega (COD) y reporte de novedades.',
        defaultPath: '/mensajero',
        defaultCapabilities: {
            pedidos: true,
            pos: false,
            asesores: false,
            produccion: false,
            finanzas: false,
            clientes: false,
            reabastecimiento: false,
            cupones: false,
            envios: false,
            auditoria: false,
            usuarios: false,
            mensajeria: true,
        }
    }
};
