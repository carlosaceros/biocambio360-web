'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    BookOpen,
    Search,
    Shield,
    CheckCircle2,
    Copy,
    Check,
    Users,
    Truck,
    Store,
    FlaskConical,
    BarChart3,
    AlertTriangle,
    Zap,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SystemRole } from '@/types/user';

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ManualSection {
    id: string;
    code: string;
    title: string;
    role: SystemRole | 'todos';
    category: 'Comercial' | 'Logística' | 'Mostrador' | 'Producción' | 'Finanzas' | 'Gobernanza';
    summary: string;
    steps: string[];
    importantNote?: string;
    whatsappTemplate?: string;
}

const MANUAL_SECTIONS: ManualSection[] = [
    {
        id: 'sop-adv-01',
        code: 'SOP-ADV-01',
        title: 'Prospección y Recompra Inteligente en el Cockpit',
        role: 'asesor',
        category: 'Comercial',
        summary: 'Atender llamadas o WhatsApp reduciendo el ciclo de contacto a menos de 2 minutos utilizando las alertas de recompra.',
        steps: [
            'Ingresa a la pestaña "Clientes Prioritarios & Tareas" en /admin/asesores.',
            'Identifica los clientes con etiqueta "Recompra Cumplida" (ciclo de 25-35 días para canecas 20L o galones).',
            'Haz clic en el botón verde WhatsApp para abrir el chat con el mensaje preformateado.',
            'Si el cliente confirma su pedido, presiona "⚡ Pedido 1-Clic" para precargar sus datos de facturación.'
        ],
        importantNote: 'Priorizar clientes marcados en rojo "En Riesgo Fuga" (+45 días sin compra).',
        whatsappTemplate: 'Hola [Nombre], te saluda [Asesor] de Biocambio360 🌿. Notamos que tu último pedido de detergente concentrado fue hace un mes. ¿Cómo va tu stock de limpieza? Recuerda que hoy tenemos tarifa subsidiada de envío para tu dirección.'
    },
    {
        id: 'sop-adv-02',
        code: 'SOP-ADV-02',
        title: 'Entrada Rápida de Pedidos y Cotizaciones en Borrador',
        role: 'asesor',
        category: 'Comercial',
        summary: 'Cotizar en caliente sin alterar el inventario físico ni los balances financieros hasta que el cliente cierre la compra.',
        steps: [
            'Presiona Ctrl + N o el botón flotante "⚡ Nuevo Pedido Rápido".',
            'Ingresa el número de celular del cliente; si ya existe en el CRM se autocompletarán nombre y dirección.',
            'Agrega los productos y selecciona la modalidad de flete (Flota Propia o 99 Envíos).',
            'Si el cliente solicita tiempo para decidir, selecciona el motivo de pausa y haz clic en "💾 Guardar como Borrador".',
            'Envía el mensaje de cotización detallada por WhatsApp generado al guardar.',
            'Para cerrar la venta: ve a la pestaña "Borradores & Cotizaciones", presiona "⚡ Retomar & Cerrar" y confirma. En ese instante se descuenta el stock.'
        ],
        importantNote: 'Los borradores NUNCA descuentan stock de bodega ni suman a las ventas cerradas de finanzas.',
        whatsappTemplate: 'Hola [Nombre], aquí tienes la cotización oficial de Biocambio360 🌿:\n- [Productos]\n- Flete coordinado a tu dirección\n- Total: $[Total] COP (Pago Contraentrega)\n¿Te confirmamos el despacho para mañana?'
    },
    {
        id: 'sop-adv-03',
        code: 'SOP-ADV-03',
        title: 'Tratamiento y Rescate de Contraentregas No Entregadas',
        role: 'asesor',
        category: 'Comercial',
        summary: 'Recuperar ventas contraentrega que fallaron en el primer intento acordando una nueva entrega con tarifa especial.',
        steps: [
            'Ingresa a la pestaña "⚠️ Novedades & Rescate" en /admin/asesores.',
            'Revisa el motivo del fallo reportado por el transportador (Cliente ausente, sin efectivo, etc.).',
            'Haz clic en "Contactar por WhatsApp" para validar con el cliente.',
            'Presiona "⚡ Tratar Novedad" y elige: Reintento de Entrega (programando fecha, tarifa especial de flete y transportadora) o Devolución a Bodega.',
            'Si se confirma devolución, el sistema restituye automáticamente el stock a bodega central.',
            'Si se confirma siniestro o paquete hurtado, se registra el expediente de reclamación a la transportadora sin reingresar stock.'
        ],
        importantNote: 'En Bogotá y Sabana, reasignar a Flota Propia Biocambio360 garantiza coordinación directa con el conductor.',
        whatsappTemplate: 'Hola [Nombre], te saluda [Asesor] de Biocambio360. La transportadora nos informó una novedad en la entrega de tu pedido contraentrega. Queremos coordinar contigo para reprogramar la visita en el día y horario que te quede más cómodo.'
    },
    {
        id: 'sop-log-01',
        code: 'SOP-LOG-01',
        title: 'Tablero Kanban y Despacho Masivo con 99 Envíos',
        role: 'gestor',
        category: 'Logística',
        summary: 'Controlar el flujo de alistamiento en bodega y generar guías con trazabilidad oficial de transportadoras.',
        steps: [
            'Accede a /admin/pedidos para visualizar las columnas del Kanban.',
            'Arrastra pedidos de "Pendiente" a "Confirmado" tras validar disponibilidad de inventario.',
            'Pasa los pedidos a "En Preparación" para que el equipo de empaque coloque los precintos antiderrames.',
            'Genera e imprime la guía de transporte (99 Envíos, Interrapidísimo o Flota Propia).',
            'Al pasar a "Enviado", el cliente recibe automáticamente un correo con el botón de seguimiento en vivo de su guía.'
        ],
        importantNote: 'Las órdenes activas nunca se ocultan por filtros de fecha para evitar despachos rezagados.'
    },
    {
        id: 'sop-pos-01',
        code: 'SOP-POS-01',
        title: 'Punto de Venta Mostrador Soacha y Arqueo Ciego',
        role: 'cajero',
        category: 'Mostrador',
        summary: 'Facturar ventas físicas directas de fábrica y cerrar caja con verificación ciega de efectivo.',
        steps: [
            'Ingresa a /admin/pos en la pantalla táctil de mostrador.',
            'Selecciona la categoría del producto químico y la presentación requerida (1L, Galón 3.8L, Garrafa 10L, Caneca 20L).',
            'Elige el método de pago (Efectivo Mostrador, Wompi QR, Transferencia Bancolombia/Nequi).',
            'Presiona "Completar Venta" para imprimir el comprobante de caja y descontar inventario local.',
            'Al cierre de turno, realiza el Arqueo Ciego digitando el efectivo físico en caja sin ver el total esperado del sistema.'
        ],
        importantNote: 'Cualquier diferencia superior a $5.000 COP debe asentarse con justificación en la bitácora de auditoría.'
    },
    {
        id: 'sop-prd-01',
        code: 'SOP-PRD-01',
        title: 'Formulaciones Químicas, Recetas BOM y Lotes INVIMA',
        role: 'produccion_calidad',
        category: 'Producción',
        summary: 'Planificar lotes industriales y asegurar el cumplimiento de parámetros fisicoquímicos antes de liberar a bodega.',
        steps: [
            'Ingresa a /admin/produccion.',
            'Selecciona la receta de producto químico a fabricar (Detergente Ropa, Desengrasante, Lavaloza, etc.).',
            'Verifica que el stock de materias primas cubra el lote planificado.',
            'Genera la orden con su consecutivo de lote INVIMA.',
            'Registra la medición de calidad (pH 7.0 ± 0.5, densidad y viscosidad) y aprueba la liberación de producto terminado.'
        ],
        importantNote: 'No se puede liberar a la venta ningún lote sin prueba de estabilidad y pH verificado.'
    },
    {
        id: 'sop-dir-01',
        code: 'SOP-DIR-01',
        title: 'Control Financiero P&L y Mapas de Calor Geográficos',
        role: 'director',
        category: 'Finanzas',
        summary: 'Monitorear la rentabilidad neta real y optimizar rutas de entrega en Bogotá y a nivel nacional.',
        steps: [
            'En /admin/finanzas, analiza el volumen de ventas brutas vs ventas efectivamente entregadas y recaudadas.',
            'Revisa los costos fijos asignados (nómina de planta Soacha, servicios, suministros) para validar el margen neto.',
            'En /admin/informe-ventas (pestaña "Distribución Geográfica"), consulta los Mapas de Calor.',
            'Identifica las localidades de Bogotá con mayor demanda (Suba, Kennedy, Engativá) para programar rutas de Flota Propia.',
            'Evalúa la efectividad contraentrega por departamento para ajustar políticas comerciales en zonas de riesgo.'
        ]
    },
    {
        id: 'sop-adm-01',
        code: 'SOP-ADM-01',
        title: 'Gobernanza RBAC y Bitácora de Auditoría ISO 9001',
        role: 'superadmin',
        category: 'Gobernanza',
        summary: 'Administrar los accesos por capacidades y auditar cualquier cambio crítico en el sistema.',
        steps: [
            'En /admin/usuarios, crea y gestiona cuentas asignando uno de los 6 roles oficiales.',
            'Activa o desactiva capacidades modulares específicas por usuario.',
            'En /admin/auditoria-envios, consulta el registro inmutable de auditoría (quién modificó qué pedido, cuándo y desde qué rol).',
            'Verifica alertas de direcciones duplicadas y control de accesos de asesores restringidos.'
        ]
    }
];

export default function UserManualModal({ isOpen, onClose }: UserManualModalProps) {
    const { role } = useAuth();
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!isOpen) return null;

    const filteredSections = MANUAL_SECTIONS.filter(sec => {
        const matchesRole = selectedRoleFilter === 'todos' || sec.role === selectedRoleFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            sec.title.toLowerCase().includes(q) ||
            sec.summary.toLowerCase().includes(q) ||
            sec.code.toLowerCase().includes(q) ||
            sec.steps.some(st => st.toLowerCase().includes(q));

        return matchesRole && matchesSearch;
    });

    const handleCopyTemplate = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                                <BookOpen size={26} className="text-amber-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300">
                                    Manual de Usuario Oficial · Estándares SWEBOK & ISO 9001
                                </span>
                                <h2 className="text-xl font-black" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    CENTRO DE PROCEDIMIENTOS Y CAPACITACIÓN BIOCAMBIO360
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Guía operativa estandarizada por roles para excelencia en atención y cero hojas de cálculo sueltas.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Filtros y Buscador */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        {/* Selector de Rol */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-black text-slate-400 mr-1">Filtrar por Rol:</span>
                            {[
                                { id: 'todos', label: 'Todos los Roles' },
                                { id: 'asesor', label: 'Asesor Comercial' },
                                { id: 'gestor', label: 'Gestor Logístico' },
                                { id: 'cajero', label: 'Cajero Mostrador' },
                                { id: 'produccion_calidad', label: 'Jefe Planta' },
                                { id: 'director', label: 'Director' },
                                { id: 'superadmin', label: 'Superadmin' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setSelectedRoleFilter(btn.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        selectedRoleFilter === btn.id
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar procedimiento, atajo o tema..."
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Listado de Procedimientos */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                        {filteredSections.map(sec => {
                            const isUserRole = role === sec.role;
                            return (
                                <div
                                    key={sec.id}
                                    className={`rounded-2xl border p-5 transition-all shadow-xs ${
                                        isUserRole 
                                            ? 'bg-gradient-to-b from-indigo-50/40 to-white border-indigo-200' 
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-md">
                                                {sec.code}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                                {sec.category}
                                            </span>
                                            {isUserRole && (
                                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                                    Tu Rol Asignado
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-[11px] font-bold text-slate-400">
                                            Aplica a: <strong>{sec.role === 'todos' ? 'Todos' : sec.role.toUpperCase()}</strong>
                                        </span>
                                    </div>

                                    <h3 className="text-base font-black text-slate-900 mb-1">
                                        {sec.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-4">
                                        {sec.summary}
                                    </p>

                                    {/* Pasos de ejecución */}
                                    <div className="space-y-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                                            Paso a Paso de Ejecución:
                                        </span>
                                        {sec.steps.map((step, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                                                <span className="font-mono font-bold text-indigo-600 shrink-0 mt-0.5">
                                                    {idx + 1}.
                                                </span>
                                                <span>{step}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Nota Importante / Regla Innegociable */}
                                    {sec.importantNote && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-start gap-2 mb-3">
                                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                            <span><strong>Regla de Calidad:</strong> {sec.importantNote}</span>
                                        </div>
                                    )}

                                    {/* Plantilla de WhatsApp Copiable */}
                                    {sec.whatsappTemplate && (
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                                            <div className="truncate text-slate-700">
                                                <span className="font-bold text-emerald-800 block text-[10px] uppercase">Plantilla WhatsApp:</span>
                                                <span className="text-[11px] text-slate-600 italic">"{sec.whatsappTemplate}"</span>
                                            </div>
                                            <button
                                                onClick={() => handleCopyTemplate(sec.id, sec.whatsappTemplate!)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                                            >
                                                {copiedId === sec.id ? (
                                                    <>
                                                        <Check size={13} />
                                                        <span>Copiado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={13} />
                                                        <span>Copiar</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredSections.length === 0 && (
                            <div className="text-center py-16 text-slate-400 text-xs italic">
                                No se encontraron procedimientos para el filtro seleccionado.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                        <span>Biocambio360 S.A.S. · Soacha, Cundinamarca · Versión 2.5 SWEBOK</span>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black transition-colors cursor-pointer"
                        >
                            Cerrar Manual
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
