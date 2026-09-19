export interface TourStep {
    target: string; // CSS selector, e.g. '[data-tour="asesor-clientes-prioritarios"]'
    title: string;
    description: string;
    ahaMomentTitle?: string;
    ahaMomentText?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    requiredRoute?: string;
}

export interface TourDefinition {
    id: string;
    title: string;
    badge: string;
    role: string;
    estimatedMinutes: number;
    description: string;
    route: string;
    steps: TourStep[];
}

export const TOURS_CONFIG: Record<string, TourDefinition> = {
    asesores: {
        id: 'asesores',
        title: 'Cockpit del Asesor Comercial & Venta Rápida',
        badge: 'Comercial · CRM',
        role: 'Asesor Comercial / Telemercadeo',
        estimatedMinutes: 2,
        route: '/admin/asesores',
        description: 'Aprende a contactar clientes en ciclo de recompra, cotizar en caliente con Ctrl+N, guardar borradores y rescatar contraentregas.',
        steps: [
            {
                target: '[data-tour="asesor-header"]',
                title: 'Tu Panel de Control Comercial',
                description: 'Aquí monitoreas tu cartera asignada, las ventas del mes en tiempo real y la sincronización directa con bodega central de Soacha.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="asesor-clientes-prioritarios"]',
                title: 'Clientes en Ciclo de Recompra',
                description: 'El sistema calcula cuándo un cliente está por terminar su caneca de 20L o galón (25 a 35 días). ¡Contacta primero antes de que compren a la competencia!',
                ahaMomentTitle: 'Aha Moment: Contacto Oportuno',
                ahaMomentText: 'El 68% de las recompras se cierran en menos de 2 minutos cuando contactas al cliente justo antes de que se le agote el producto.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="asesor-fab-nuevo-pedido"]',
                title: 'Entrada Rápida de Pedidos (Ctrl + N)',
                description: 'Abre el formulario rápido en cualquier momento. Digita el celular y el sistema traerá el nombre, dirección y ciudad del cliente desde el CRM.',
                placement: 'left'
            },
            {
                target: '[data-tour="asesor-tab-borradores"]',
                title: 'Borradores y Cotizaciones en Caliente',
                description: '¿El cliente duda o pide permiso a su socio? Guárdalo como Borrador con el motivo de pausa. No descontará stock ni alterará finanzas hasta que lo confirmes.',
                ahaMomentTitle: 'Aha Moment: Cero Oportunidades Perdidas',
                ahaMomentText: 'Genera cotizaciones detalladas para WhatsApp al instante y retoma la venta con 1 solo clic cuando el cliente dé el visto bueno.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="asesor-tab-novedades"]',
                title: 'Rescate de Novedades Contraentrega',
                description: 'Si la transportadora no logró entregar hoy (cliente ausente, sin efectivo, etc.), aquí puedes contactar al cliente por WhatsApp y programar un reintento con tarifa especial.',
                ahaMomentTitle: 'Aha Moment: Rescate del 70% de Ventas',
                ahaMomentText: 'En lugar de dar por perdido un envío contraentrega, un contacto rápido el mismo día permite salvar la venta y coordinar con Flota Propia.',
                placement: 'bottom'
            }
        ]
    },
    pedidos: {
        id: 'pedidos',
        title: 'Tablero Kanban & Despachos Masivos',
        badge: 'Logística · Despachos',
        role: 'Gestor Operativo / Logístico',
        estimatedMinutes: 3,
        route: '/admin/pedidos',
        description: 'Domina el flujo de preparación en bodega, generación de guías 99 Envíos y trazabilidad en vivo.',
        steps: [
            {
                target: '[data-tour="pedidos-ventana-tiempo"]',
                title: 'Ventana de Tiempo y Rendimiento',
                description: 'Alterna entre los últimos 5, 15 o 30 días para una carga ultra veloz. ¡Las órdenes activas en tránsito nunca se ocultan!',
                placement: 'bottom'
            },
            {
                target: '[data-tour="pedidos-search-bar"]',
                title: 'Búsqueda Global en Todo el Histórico',
                description: 'Escribe el nombre del cliente, teléfono, número de guía o presiona Enter para consultar en el histórico completo de Firestore.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="pedidos-kanban-board"]',
                title: 'Flujo Kanban Drag & Drop',
                description: 'Arrastra las tarjetas de pedido entre etapas: Pendiente → Confirmado → En Preparación → Enviado → Entregado.',
                ahaMomentTitle: 'Aha Moment: Cero Hojas de Cálculo',
                ahaMomentText: 'Cada cambio de estado notifica automáticamente al cliente por correo con su enlace directo de rastreo oficial de transportadora.',
                placement: 'top'
            }
        ]
    },
    novedades: {
        id: 'novedades',
        title: 'Tratamiento Especial de Contraentregas Fallidas',
        badge: 'Operaciones · Calidad',
        role: 'Asesor Comercial / Logística',
        estimatedMinutes: 2,
        route: '/admin/asesores',
        description: 'Paso a paso para programar reintentos con tarifa especial, cambiar transportadora o registrar siniestros.',
        steps: [
            {
                target: '[data-tour="asesor-tab-novedades"]',
                title: 'Identificar la Novedad',
                description: 'Revisa qué transportadora falló y el motivo reportado (cliente ausente, sin dinero, dirección errada).',
                placement: 'bottom'
            },
            {
                target: '[data-tour="asesor-tab-novedades"]',
                title: 'Acción: Contactar por WhatsApp',
                description: 'Usa el botón verde para enviar un mensaje cordial al cliente ofreciéndole reprogramar en una fecha u horario conveniente.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="asesor-tab-novedades"]',
                title: 'Resolución: Reintento con Tarifa Especial',
                description: 'Abre "Tratar Novedad" para elegir la nueva fecha, franja horaria y seleccionar si aplicas flete de cortesía ($0) o tarifa de reexpedición.',
                ahaMomentTitle: 'Aha Moment: Integridad Contable y de Stock',
                ahaMomentText: 'Si el cliente desiste, la devolución restituye el stock a bodega. Si fue hurto en carretera, se registra siniestro sin alterar existencias físicas.',
                placement: 'bottom'
            }
        ]
    },
    direccion: {
        id: 'direccion',
        title: 'Visión Estratégica, P&L y Mapas de Calor',
        badge: 'Dirección · BI',
        role: 'Director Estratégico / Superadmin',
        estimatedMinutes: 2,
        route: '/admin/informe-ventas',
        description: 'Análisis de concentración geográfica de ventas en Bogotá y a nivel nacional con cálculo de rentabilidad neta.',
        steps: [
            {
                target: '[data-tour="bi-nav-geografia"]',
                title: 'Mapas de Calor Geográficos',
                description: 'Visualiza la demanda en las 20 localidades de Bogotá y municipios de la Sabana frente al resto del país.',
                placement: 'bottom'
            },
            {
                target: '[data-tour="bi-geo-view"]',
                title: 'Optimización de Flota Propia vs 99 Envíos',
                description: 'Compara la efectividad de entrega y costo promedio por zona para asignar camiones propios a las rutas más rentables.',
                ahaMomentTitle: 'Aha Moment: Toma de Decisiones con Datos Reales',
                ahaMomentText: 'Reduce hasta un 40% el costo de flete consolidando despachos con camiones propios en las localidades de mayor densidad.',
                placement: 'top'
            }
        ]
    }
};
