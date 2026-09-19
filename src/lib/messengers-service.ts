import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, OrderStatus } from '@/types/order';
import { updateOrderStatus } from './orders-service';

export interface Messenger {
    id: string;
    nombre: string;
    cedula: string;
    telefono: string;
    tipoVehiculo: 'moto' | 'carro' | 'furgon' | 'bicicleta';
    placaVehiculo: string;
    zonaPrincipal: string; // Ej: 'Bogotá Sur & Soacha', 'Bogotá Norte & Sabana Centro'
    activo: boolean;
    fechaIngreso: string;
    email?: string;
    notas?: string;
}

export interface MessengerRateConfig {
    id: string;
    tarifaUrbanaBogota: number; // Ej: $10.000 COP
    tarifaSabanaAledanos: number; // Ej: $15.000 COP
    tarifaReintentoNovedad: number; // Ej: $5.000 COP
    updatedAt: string;
    updatedBy: string;
}

export interface MessengerSettlement {
    id: string;
    messengerId: string;
    messengerNombre: string;
    fecha: string; // YYYY-MM-DD
    pedidosTotales: number;
    pedidosEntregados: number;
    pedidosNovedad: number;
    totalRecaudadoEfectivo: number; // Cash On Delivery recaudado
    totalFletesDevengados: number; // Honorarios del mensajero
    balanceNetoEntregar: number; // Efectivo que el mensajero entrega a tesorería (Recaudo - Fletes)
    pedidosIds: string[];
    estado: 'liquidado' | 'pagado';
    liquidadoPor: string;
    liquidadoAt: string;
    observaciones?: string;
}

export interface MessengerSettlementSummary {
    messengerId: string;
    messengerNombre: string;
    fecha: string;
    pedidos: Order[];
    pedidosTotales: number;
    pedidosEntregados: number;
    pedidosNovedad: number;
    totalRecaudadoEfectivo: number;
    totalFletesDevengados: number;
    balanceNetoEntregar: number;
}

// 📋 FLOTA OFICIAL BIOCAMBIO360 (7 Domiciliarios):
// Motocicletas (2): Edilberto, Sandro -> Zonas urbanas y cercanas (Día de por medio)
// Automóviles (5): Deivy, Daniel, Heiler, Álex, José -> Zonas lejanas y municipios aledaños (Sabana 2x/semana)
export const INITIAL_MESSENGERS_SEED: Messenger[] = [
    {
        id: 'msg-edilberto',
        nombre: 'Edilberto',
        cedula: '19.450.820',
        telefono: '3114508201',
        tipoVehiculo: 'moto',
        placaVehiculo: 'EDM-01M',
        zonaPrincipal: 'Bogotá Cercana / Zonas Urbanas (Sur - Centro)',
        activo: true,
        fechaIngreso: '2025-01-15',
        notas: 'Motocicleta para distribución rápida en zonas urbanas y cercanas de Bogotá.',
    },
    {
        id: 'msg-sandro',
        nombre: 'Sandro',
        cedula: '80.231.904',
        telefono: '3123456789',
        tipoVehiculo: 'moto',
        placaVehiculo: 'SDM-02M',
        zonaPrincipal: 'Bogotá Cercana / Zonas Urbanas (Centro - Norte)',
        activo: true,
        fechaIngreso: '2025-01-20',
        notas: 'Motocicleta para distribución ágil en localidades céntricas y cercanas.',
    },
    {
        id: 'msg-deivy',
        nombre: 'Deivy',
        cedula: '101.420.551',
        telefono: '3139876543',
        tipoVehiculo: 'carro',
        placaVehiculo: 'DVA-01C',
        zonaPrincipal: 'Zonas Lejanas Bogotá & Municipios Aledaños',
        activo: true,
        fechaIngreso: '2025-02-01',
        notas: 'Automóvil para distribución en zonas lejanas y municipios de la Sabana.',
    },
    {
        id: 'msg-daniel',
        nombre: 'Daniel',
        cedula: '102.531.662',
        telefono: '3145678901',
        tipoVehiculo: 'carro',
        placaVehiculo: 'DNA-02C',
        zonaPrincipal: 'Zonas Lejanas Bogotá & Municipios Aledaños',
        activo: true,
        fechaIngreso: '2025-02-05',
        notas: 'Automóvil para distribución en zonas lejanas y municipios de la Sabana.',
    },
    {
        id: 'msg-heiler',
        nombre: 'Heiler',
        cedula: '103.642.773',
        telefono: '3156789012',
        tipoVehiculo: 'carro',
        placaVehiculo: 'HLA-03C',
        zonaPrincipal: 'Zonas Lejanas Bogotá & Municipios Aledaños',
        activo: true,
        fechaIngreso: '2025-02-10',
        notas: 'Automóvil para distribución en zonas lejanas y municipios de la Sabana.',
    },
    {
        id: 'msg-alex',
        nombre: 'Álex',
        cedula: '104.753.884',
        telefono: '3167890123',
        tipoVehiculo: 'carro',
        placaVehiculo: 'ALA-04C',
        zonaPrincipal: 'Zonas Lejanas Bogotá & Municipios Aledaños',
        activo: true,
        fechaIngreso: '2025-02-12',
        notas: 'Automóvil para distribución en zonas lejanas y municipios de la Sabana.',
    },
    {
        id: 'msg-jose',
        nombre: 'José',
        cedula: '105.864.995',
        telefono: '3178901234',
        tipoVehiculo: 'carro',
        placaVehiculo: 'JSA-05C',
        zonaPrincipal: 'Zonas Lejanas Bogotá & Municipios Aledaños',
        activo: true,
        fechaIngreso: '2025-02-15',
        notas: 'Automóvil para distribución en zonas lejanas y municipios de la Sabana.',
    },
];

export const DEFAULT_MESSENGER_RATES: MessengerRateConfig = {
    id: 'default',
    tarifaUrbanaBogota: 10_000,
    tarifaSabanaAledanos: 15_000,
    tarifaReintentoNovedad: 5_000,
    updatedAt: new Date().toISOString(),
    updatedBy: 'sistema',
};

// ── CRUD MENSAJEROS ──────────────────────────────────────────────────────────

export async function getMessengers(): Promise<Messenger[]> {
    try {
        const colRef = collection(db, 'mensajeros');
        const snap = await getDocs(colRef);
        if (snap.empty) {
            // Inicializar con la flota oficial de 7
            for (const msg of INITIAL_MESSENGERS_SEED) {
                await setDoc(doc(db, 'mensajeros', msg.id), msg);
            }
            return INITIAL_MESSENGERS_SEED;
        }
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Messenger));
        // Si falta alguno de los 7 domiciliarios oficiales en la base de datos, incorporarlo
        const hasOfficial = list.some(m => m.nombre === 'Edilberto' || m.nombre === 'Sandro');
        if (!hasOfficial) {
            for (const msg of INITIAL_MESSENGERS_SEED) {
                await setDoc(doc(db, 'mensajeros', msg.id), msg);
            }
            return INITIAL_MESSENGERS_SEED;
        }
        return list;
    } catch (e: any) {
        console.warn('[MessengersService] Error consultando mensajeros Firestore, usando seed:', e.message);
        return INITIAL_MESSENGERS_SEED;
    }
}

export async function saveMessenger(messenger: Messenger): Promise<void> {
    const id = messenger.id || `msg-${Date.now()}`;
    const docRef = doc(db, 'mensajeros', id);
    await setDoc(docRef, { ...messenger, id }, { merge: true });
}

export async function toggleMessengerStatus(id: string, activo: boolean): Promise<void> {
    const docRef = doc(db, 'mensajeros', id);
    await updateDoc(docRef, { activo });
}

// ── TARIFAS DE MENSAJERÍA ────────────────────────────────────────────────────

export async function getMessengerRates(): Promise<MessengerRateConfig> {
    try {
        const docRef = doc(db, 'messenger_rates', 'default');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data() as MessengerRateConfig;
        }
        await setDoc(docRef, DEFAULT_MESSENGER_RATES);
        return DEFAULT_MESSENGER_RATES;
    } catch (e: any) {
        console.warn('[MessengersService] Usando tarifas por defecto:', e.message);
        return DEFAULT_MESSENGER_RATES;
    }
}

export async function saveMessengerRates(
    rates: Partial<MessengerRateConfig>,
    userEmail: string = 'admin'
): Promise<void> {
    const docRef = doc(db, 'messenger_rates', 'default');
    const updated: MessengerRateConfig = {
        id: 'default',
        tarifaUrbanaBogota: rates.tarifaUrbanaBogota ?? DEFAULT_MESSENGER_RATES.tarifaUrbanaBogota,
        tarifaSabanaAledanos: rates.tarifaSabanaAledanos ?? DEFAULT_MESSENGER_RATES.tarifaSabanaAledanos,
        tarifaReintentoNovedad: rates.tarifaReintentoNovedad ?? DEFAULT_MESSENGER_RATES.tarifaReintentoNovedad,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
    };
    await setDoc(docRef, updated, { merge: true });
}

// ── ASIGNACIÓN DE PEDIDOS ─────────────────────────────────────────────────────

export async function assignOrderToMessenger(
    orderId: string,
    messengerId: string,
    fechaProgramada: string,
    franjaHoraria: string = 'todo_el_dia',
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const messengers = await getMessengers();
    const messenger = messengers.find(m => m.id === messengerId);
    if (!messenger) throw new Error(`Mensajero no encontrado: ${messengerId}`);

    const rates = await getMessengerRates();
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (!orderSnap.exists()) throw new Error(`Pedido no encontrado: ${orderId}`);

    const orderData = orderSnap.data() as Order;
    const ciudadUpper = (orderData.cliente?.ciudad || '').toUpperCase();

    // Determinar tarifa según zona de destino
    const esSabana = ['CHIA', 'CHÍA', 'COTA', 'CAJICA', 'CAJICÁ', 'FUNZA', 'MOSQUERA', 'MADRID', 'ZIPAQUIRA', 'ZIPAQUIRÁ', 'FUSAGASUGA', 'FUSAGASUGÁ'].some(c => ciudadUpper.includes(c));
    const tarifa = esSabana ? rates.tarifaSabanaAledanos : rates.tarifaUrbanaBogota;

    const updatePayload: Record<string, any> = {
        tipoEnvio: 'flota_propia',
        mensajeroId: messenger.id,
        mensajeroNombre: messenger.nombre,
        mensajeroTelefono: messenger.telefono,
        mensajeroPlaca: messenger.placaVehiculo,
        mensajeroAsignadoAt: new Date().toISOString(),
        fechaProgramadaEntrega: fechaProgramada,
        franjaHorariaEntrega: franjaHoraria,
        estadoMensajeria: 'asignado',
        tarifaFleteMensajero: tarifa,
        updatedAt: Timestamp.now(),
    };

    await updateDoc(orderDocRef, updatePayload);

    // Registrar en el historial de notas internas
    const franjaLabel = franjaHoraria === 'manana' ? 'Mañana (8am-12pm)' : franjaHoraria === 'tarde' ? 'Tarde (1pm-6pm)' : 'Todo el día';
    const noteText = `Asignado a mensajero flota propia: ${messenger.nombre} (${messenger.placaVehiculo}). Fecha programada: ${fechaProgramada} - Franja: ${franjaLabel}. Tarifa asignada: $${tarifa.toLocaleString('es-CO')} COP.`;

    await updateOrderStatus(
        orderId,
        'enviado',
        noteText,
        userContext || { nombre: 'Gestor Logístico', email: 'logistica@biocambio360.com', role: 'gestor' }
    );
}

// ── CONFIRMACIÓN DE ENTREGA POR MENSAJERO ─────────────────────────────────────

export async function markMessengerDelivered(
    orderId: string,
    messengerId: string,
    data: {
        recibidoPor: string;
        documentoRecibido?: string;
        recaudoEfectivo?: number;
        parentesco?: string;
        notas?: string;
    },
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (!orderSnap.exists()) throw new Error(`Pedido no encontrado: ${orderId}`);

    const orderData = orderSnap.data() as Order;
    const nowIso = new Date().toISOString();
    const efectivo = data.recaudoEfectivo ?? (orderData.metodoPago === 'contraentrega' ? orderData.total : 0);

    const updatePayload: Record<string, any> = {
        estadoMensajeria: 'entregado',
        recaudoEfectivoRecibido: efectivo,
        pruebaEntrega: {
            recibidoPor: data.recibidoPor,
            documentoRecibido: data.documentoRecibido || 'N/A',
            parentesco: data.parentesco || 'Titular / Residente',
            recaudadoEfectivo: efectivo,
            fecha: nowIso,
            origen: 'mensajero_flota_propia',
        },
        updatedAt: Timestamp.now(),
    };

    await updateDoc(orderDocRef, updatePayload);

    const docInfo = data.documentoRecibido ? ` (Doc: ${data.documentoRecibido})` : '';
    const noteText = `Entrega exitosa confirmada por mensajero ${orderData.mensajeroNombre || messengerId}. Recibió: ${data.recibidoPor}${docInfo}. Efectivo recaudado contraentrega (COD): $${efectivo.toLocaleString('es-CO')} COP.${data.notas ? ` Observaciones: ${data.notas}` : ''}`;

    await updateOrderStatus(
        orderId,
        'entregado',
        noteText,
        userContext || { nombre: orderData.mensajeroNombre || 'Mensajero', role: 'mensajero' }
    );
}

// ── REPORTE DE NOVEDAD POR MENSAJERO ──────────────────────────────────────────

export async function reportMessengerException(
    orderId: string,
    messengerId: string,
    exceptionData: {
        motivo: 'cliente_ausente' | 'sin_dinero' | 'direccion_erronea' | 'solicito_reprogramacion' | 'rechazado' | 'averiado' | string;
        motivoDetalle?: string;
    },
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (!orderSnap.exists()) throw new Error(`Pedido no encontrado: ${orderId}`);

    const orderData = orderSnap.data() as Order;
    const nowIso = new Date().toISOString();

    const motivosLabels: Record<string, string> = {
        cliente_ausente: 'Cliente no se encuentra / No contesta el portero',
        sin_dinero: 'No tiene el dinero en efectivo completo',
        direccion_erronea: 'Dirección no existe o incompleta',
        solicito_reprogramacion: 'Cliente solicitó reprogramar la entrega',
        rechazado: 'Cliente rechazó el producto',
        averiado: 'Producto averiado / derrame en transporte',
    };

    const motivoHuman = motivosLabels[exceptionData.motivo] || exceptionData.motivo;

    const updatePayload: Record<string, any> = {
        estadoMensajeria: 'novedad',
        novedadEntrega: {
            motivo: exceptionData.motivo,
            motivoDetalle: exceptionData.motivoDetalle || motivoHuman,
            fechaNovedad: nowIso,
            reportadoPor: orderData.mensajeroNombre || messengerId,
        },
        updatedAt: Timestamp.now(),
    };

    await updateDoc(orderDocRef, updatePayload);

    const noteText = `⚠️ Novedad reportada en entrega por mensajero ${orderData.mensajeroNombre || messengerId}: ${motivoHuman}.${exceptionData.motivoDetalle ? ` Detalle: ${exceptionData.motivoDetalle}` : ''}`;

    await updateOrderStatus(
        orderId,
        'no_entregado',
        noteText,
        userContext || { nombre: orderData.mensajeroNombre || 'Mensajero', role: 'mensajero' }
    );
}

// ── LIQUIDACIÓN DE MENSAJERÍA ─────────────────────────────────────────────────

export async function getMessengerSettlementSummary(
    messengerId: string,
    fecha?: string
): Promise<MessengerSettlementSummary> {
    const messengers = await getMessengers();
    const messenger = messengers.find(m => m.id === messengerId);
    const messengerNombre = messenger ? messenger.nombre : messengerId;

    const ordersCol = collection(db, 'orders');
    const q = query(
        ordersCol,
        where('mensajeroId', '==', messengerId),
        limit(200)
    );

    let orders: Order[] = [];
    try {
        const snap = await getDocs(q);
        orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    } catch (e: any) {
        console.warn('[MessengersService] Error consultando pedidos asignados:', e.message);
    }

    // Filtrar por fecha si se proporcionó
    const filteredOrders = fecha
        ? orders.filter(o => o.fechaProgramadaEntrega === fecha)
        : orders;

    let pedidosEntregados = 0;
    let pedidosNovedad = 0;
    let totalRecaudadoEfectivo = 0;
    let totalFletesDevengados = 0;

    const rates = await getMessengerRates();

    for (const ord of filteredOrders) {
        const tarifa = ord.tarifaFleteMensajero || rates.tarifaUrbanaBogota;

        if (ord.status === 'entregado') {
            pedidosEntregados++;
            totalFletesDevengados += tarifa;
            const recaudo = ord.recaudoEfectivoRecibido ?? (ord.metodoPago === 'contraentrega' ? ord.total : 0);
            totalRecaudadoEfectivo += recaudo;
        } else if (ord.status === 'no_entregado') {
            pedidosNovedad++;
            totalFletesDevengados += rates.tarifaReintentoNovedad;
        }
    }

    const balanceNetoEntregar = Math.max(0, totalRecaudadoEfectivo - totalFletesDevengados);

    return {
        messengerId,
        messengerNombre,
        fecha: fecha || new Date().toISOString().split('T')[0],
        pedidos: filteredOrders,
        pedidosTotales: filteredOrders.length,
        pedidosEntregados,
        pedidosNovedad,
        totalRecaudadoEfectivo,
        totalFletesDevengados,
        balanceNetoEntregar,
    };
}

export async function saveMessengerSettlement(
    settlement: Omit<MessengerSettlement, 'id'>
): Promise<string> {
    const id = `settlement-${settlement.messengerId}-${Date.now()}`;
    const docRef = doc(db, 'messenger_settlements', id);
    const fullSettlement: MessengerSettlement = {
        ...settlement,
        id,
    };
    await setDoc(docRef, fullSettlement);

    // Marcar pedidos como liquidados
    for (const ordId of settlement.pedidosIds) {
        try {
            await updateDoc(doc(db, 'orders', ordId), {
                mensajeroLiquidado: true,
                fechaLiquidacionMensajero: settlement.fecha,
                updatedAt: Timestamp.now(),
            });
        } catch (e: any) {
            console.warn(`[MessengersService] No se pudo marcar pedido ${ordId} como liquidado:`, e.message);
        }
    }

    return id;
}

export async function getMessengerSettlements(messengerId?: string): Promise<MessengerSettlement[]> {
    try {
        const colRef = collection(db, 'messenger_settlements');
        let snap;
        if (messengerId) {
            const q = query(colRef, where('messengerId', '==', messengerId));
            snap = await getDocs(q);
        } else {
            snap = await getDocs(colRef);
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MessengerSettlement));
    } catch (e: any) {
        console.warn('[MessengersService] Error leyendo liquidaciones:', e.message);
        return [];
    }
}

/**
 * 📍 Criterio de asignación operativa:
 * - Motocicletas (Edilberto, Sandro): Zonas cercanas / urbanas de Bogotá y Soacha (Día de por medio).
 * - Automóviles (Deivy, Daniel, Heiler, Álex, José): Zonas lejanas de Bogotá y municipios aledaños (2x/semana).
 */
export function recommendVehicleAndZone(
    direccion: string = '',
    ciudad: string = ''
): {
    recommendedType: 'moto' | 'carro';
    zoneLabel: string;
    frequencyLabel: string;
    reason: string;
} {
    const fullText = `${direccion} ${ciudad}`.toUpperCase();

    // 1. Municipios aledaños fuera de Bogotá
    const MUNICIPIOS_SABANA = [
        'CHIA', 'CHÍA', 'CAJICA', 'CAJICÁ', 'COTA', 'ZIPAQUIRA', 'ZIPAQUIRÁ',
        'SOPO', 'SOPÓ', 'TOCANCIPA', 'TOCANCIPÁ', 'FUNZA', 'MOSQUERA',
        'MADRID', 'FACATATIVA', 'FACATATIVÁ', 'SIBATE', 'SIBATÉ', 'TABIO', 'TENJO'
    ];

    const esMunicipio = MUNICIPIOS_SABANA.some(m => fullText.includes(m));
    if (esMunicipio) {
        return {
            recommendedType: 'carro',
            zoneLabel: 'Municipios Aledaños (Sabana)',
            frequencyLabel: '2 veces por semana (2 zonas diferentes)',
            reason: 'Destino fuera de Bogotá: requiere automóvil para alto volumen y distancia.',
        };
    }

    // 2. Localidades lejanas / periféricas de Bogotá
    const LOCALIDADES_LEJANAS = [
        'SUBA', 'USAQUEN', 'USAQUÉN', 'ENGATIVA', 'ENGATIVÁ', 'FONTIBON', 'FONTIBÓN',
        'SAN CRISTOBAL', 'SAN CRISTÓBAL', 'USME', 'CIUDAD BOLIVAR', 'CIUDAD BOLÍVAR',
        'RAFAEL URIBE', 'SUMAPAZ'
    ];

    const esLejana = LOCALIDADES_LEJANAS.some(loc => fullText.includes(loc));
    if (esLejana) {
        return {
            recommendedType: 'carro',
            zoneLabel: 'Bogotá Zonas Lejanas',
            frequencyLabel: 'Día de por medio',
            reason: 'Localidad periférica o extensa: óptima para automóvil.',
        };
    }

    // 3. Localidades cercanas / céntricas de Bogotá y Soacha
    return {
        recommendedType: 'moto',
        zoneLabel: 'Bogotá Cercana / Zonas Urbanas',
        frequencyLabel: 'Día de por medio',
        reason: 'Zona urbana cercana: óptima para motocicleta (Edilberto o Sandro) para agilidad en tráfico.',
    };
}

export interface WeeklySettlementConsolidated {
    messengerId: string;
    messengerNombre: string;
    tipoVehiculo: string;
    placaVehiculo: string;
    totalDiasLiquidados: number;
    totalPedidosEntregados: number;
    totalPedidosNovedad: number;
    totalFletesDevengados: number;
    totalRecaudadoEfectivo: number;
    balanceNetoEntregar: number;
}

/**
 * Consolida liquidaciones diarias en corte semanal por domiciliario
 */
export function getWeeklySettlementsConsolidated(
    settlements: MessengerSettlement[],
    startDate?: string,
    endDate?: string
): WeeklySettlementConsolidated[] {
    const filtered = settlements.filter(s => {
        if (startDate && s.fecha < startDate) return false;
        if (endDate && s.fecha > endDate) return false;
        return true;
    });

    const byMessenger = new Map<string, WeeklySettlementConsolidated>();

    for (const s of filtered) {
        if (!byMessenger.has(s.messengerId)) {
            const seedInfo = INITIAL_MESSENGERS_SEED.find(m => m.id === s.messengerId);
            byMessenger.set(s.messengerId, {
                messengerId: s.messengerId,
                messengerNombre: s.messengerNombre,
                tipoVehiculo: seedInfo?.tipoVehiculo || 'moto',
                placaVehiculo: seedInfo?.placaVehiculo || 'N/A',
                totalDiasLiquidados: 1,
                totalPedidosEntregados: s.pedidosEntregados,
                totalPedidosNovedad: s.pedidosNovedad,
                totalFletesDevengados: s.totalFletesDevengados,
                totalRecaudadoEfectivo: s.totalRecaudadoEfectivo,
                balanceNetoEntregar: s.balanceNetoEntregar,
            });
        } else {
            const agg = byMessenger.get(s.messengerId)!;
            agg.totalDiasLiquidados += 1;
            agg.totalPedidosEntregados += s.pedidosEntregados;
            agg.totalPedidosNovedad += s.pedidosNovedad;
            agg.totalFletesDevengados += s.totalFletesDevengados;
            agg.totalRecaudadoEfectivo += s.totalRecaudadoEfectivo;
            agg.balanceNetoEntregar += s.balanceNetoEntregar;
        }
    }

    return Array.from(byMessenger.values()).sort((a, b) => b.totalFletesDevengados - a.totalFletesDevengados);
}
