/**
 * Biocambio360 — Servicio Transaccional de Punto de Venta (POS Mostrador Soacha)
 * Maneja ventas rápidas, sesiones de caja con arqueo ciego, control de inventario físico y traslados.
 */

import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    runTransaction,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    PosSale,
    PosItem,
    PosPaymentMethod,
    PosInventoryItem,
    PosWarehouseTransfer,
    PosCashRegisterSession,
} from '@/types/pos';

const POS_SALES_REF = 'pos_sales';
const POS_INVENTORY_REF = 'pos_inventory';
const POS_TRANSFERS_REF = 'pos_transfers';
const POS_SESSIONS_REF = 'pos_cash_sessions';

// ─────────────────────────────────────────────────────────────
// Consecutivos y Formateo
// ─────────────────────────────────────────────────────────────

export function generateTicketNumber(): string {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `POS-${datePart}-${randomPart}`;
}

export function generateTransferConsecutive(): string {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `TRF-${datePart}-${randomPart}`;
}

// ─────────────────────────────────────────────────────────────
// Ventas de Mostrador (POS)
// ─────────────────────────────────────────────────────────────

export async function createPosSale(data: {
    cajeroId: string;
    cajeroNombre: string;
    asesor?: string;
    cliente?: { nombre?: string; cedula?: string; celular?: string; email?: string };
    items: PosItem[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: PosPaymentMethod;
    montoEfectivo?: number;
    montoCambio?: number;
    comprobanteTransaccion?: string;
    observaciones?: string;
    lotePrincipal?: string;
}): Promise<PosSale> {
    const ticketNumber = generateTicketNumber();
    const salesCol = collection(db, POS_SALES_REF);

    const newSaleData = {
        ...data,
        numeroTicket: ticketNumber,
        fecha: serverTimestamp(),
        estado: 'completada' as const,
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(salesCol, newSaleData);

    // Descontar inventario de mostrador en segundo plano (fire-and-forget seguro)
    for (const item of data.items) {
        discountPosStock(item.productId, item.size, item.cantidad).catch(err =>
            console.warn(`[POS] Error descontando stock para ${item.productId}:`, err)
        );
    }

    return {
        id: docRef.id,
        ...newSaleData,
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    } as PosSale;
}

export async function getPosSales(limitCount: number = 50): Promise<PosSale[]> {
    try {
        const salesCol = collection(db, POS_SALES_REF);
        const q = query(salesCol, orderBy('createdAt', 'desc'), limit(limitCount));
        const snap = await getDocs(q);

        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as PosSale));
    } catch (error) {
        console.warn('[POS] Error ordenando por createdAt, usando fallback:', error);
        const salesCol = collection(db, POS_SALES_REF);
        const q = query(salesCol, limit(limitCount));
        const snap = await getDocs(q);
        const sales = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as PosSale));
        return sales.sort((a, b) => {
            const tA = (a.createdAt as any)?.seconds || 0;
            const tB = (b.createdAt as any)?.seconds || 0;
            return tB - tA;
        });
    }
}

// ─────────────────────────────────────────────────────────────
// Control de Inventario de Mostrador
// ─────────────────────────────────────────────────────────────

export async function discountPosStock(
    productId: string,
    size: string,
    quantity: number
): Promise<void> {
    const inventoryId = `${productId}_${size}`;
    const itemRef = doc(db, POS_INVENTORY_REF, inventoryId);

    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                // Inicializar si no existe
                transaction.set(itemRef, {
                    productId,
                    nombre: productId,
                    size,
                    stockActual: Math.max(0, 50 - quantity), // Stock base estimado
                    stockMinimoSeguridad: 10,
                    entradasTotales: 50,
                    salidasTotales: quantity,
                    updatedAt: serverTimestamp(),
                });
            } else {
                const currentStock = itemDoc.data().stockActual || 0;
                const salidasTotales = itemDoc.data().salidasTotales || 0;
                transaction.update(itemRef, {
                    stockActual: Math.max(0, currentStock - quantity),
                    salidasTotales: salidasTotales + quantity,
                    updatedAt: serverTimestamp(),
                });
            }
        });
    } catch (error) {
        console.error(`[POS] Error en transacción de stock para ${inventoryId}:`, error);
    }
}

export async function getPosInventory(): Promise<PosInventoryItem[]> {
    try {
        const invCol = collection(db, POS_INVENTORY_REF);
        const snap = await getDocs(invCol);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as PosInventoryItem));
    } catch (error) {
        console.error('[POS] Error obteniendo inventario POS:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// Sesiones de Caja y Arqueo Ciego
// ─────────────────────────────────────────────────────────────

export async function openCashRegister(
    cajeroId: string,
    cajeroNombre: string,
    baseInicial: number
): Promise<string> {
    const sessionsCol = collection(db, POS_SESSIONS_REF);
    const docRef = await addDoc(sessionsCol, {
        cajeroId,
        cajeroNombre,
        fechaApertura: serverTimestamp(),
        baseInicialEfectivo: baseInicial,
        totalVentasEfectivoCalculado: 0,
        totalVentasElectronicasCalculado: 0,
        estado: 'abierta',
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getActiveCashRegisterSession(cajeroId?: string): Promise<PosCashRegisterSession | null> {
    try {
        const sessionsCol = collection(db, POS_SESSIONS_REF);
        let q = query(sessionsCol, where('estado', '==', 'abierta'), limit(1));
        if (cajeroId) {
            q = query(sessionsCol, where('estado', '==', 'abierta'), where('cajeroId', '==', cajeroId), limit(1));
        }
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as PosCashRegisterSession;
    } catch (error) {
        console.error('[POS] Error verificando sesión de caja activa:', error);
        return null;
    }
}

export async function closeCashRegister(
    sessionId: string,
    efectivoFisicoReportado: number,
    observacionesCierre?: string
): Promise<PosCashRegisterSession> {
    const sessionRef = doc(db, POS_SESSIONS_REF, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
        throw new Error('Sesión de caja no encontrada');
    }

    const sessionData = sessionSnap.data();
    const baseInicial = sessionData.baseInicialEfectivo || 0;
    const ventasEfectivo = sessionData.totalVentasEfectivoCalculado || 0;
    const esperadoEfectivo = baseInicial + ventasEfectivo;
    const diferencia = efectivoFisicoReportado - esperadoEfectivo;

    const updatePayload = {
        fechaCierre: serverTimestamp(),
        efectivoFisicoReportado,
        diferenciaEfectivo: diferencia,
        estado: 'cerrada' as const,
        observacionesCierre: observacionesCierre || '',
        updatedAt: serverTimestamp(),
    };

    await updateDoc(sessionRef, updatePayload);

    return {
        id: sessionId,
        ...sessionData,
        ...updatePayload,
    } as unknown as PosCashRegisterSession;
}

// ─────────────────────────────────────────────────────────────
// Traslados Fábrica -> Mostrador
// ─────────────────────────────────────────────────────────────

export async function requestWarehouseTransfer(data: {
    solicitadoPor: string;
    items: { productId: string; nombre: string; size: string; cantidadSolicitada: number }[];
    notas?: string;
}): Promise<string> {
    const transfersCol = collection(db, POS_TRANSFERS_REF);
    const consecutivo = generateTransferConsecutive();

    const docRef = await addDoc(transfersCol, {
        consecutivo,
        solicitadoPor: data.solicitadoPor,
        items: data.items,
        estado: 'pendiente',
        notas: data.notas || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

export async function getWarehouseTransfers(limitCount: number = 20): Promise<PosWarehouseTransfer[]> {
    try {
        const transfersCol = collection(db, POS_TRANSFERS_REF);
        const q = query(transfersCol, limit(limitCount));
        const snap = await getDocs(q);
        const transfers = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as PosWarehouseTransfer));
        return transfers.sort((a, b) => {
            const tA = (a.createdAt as any)?.seconds || 0;
            const tB = (b.createdAt as any)?.seconds || 0;
            return tB - tA;
        });
    } catch (error) {
        console.error('[POS] Error cargando traslados:', error);
        return [];
    }
}
