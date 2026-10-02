/**
 * GPS en tiempo real de mensajeros, SOLO durante su turno laboral configurado -- nunca fuera de
 * turno, nunca sin el consentimiento explícito que el mensajero da una vez en /mensajero.
 *
 * Dos colecciones:
 * - `messenger_locations/{messengerId}`: última posición conocida (lectura rápida para el mapa
 *   en vivo del admin, un doc por mensajero, se sobreescribe).
 * - `messenger_location_history/{messengerId}/pings/{autoId}`: historial de posiciones del
 *   turno (permite ver el recorrido después). Se limpia por un cron aparte
 *   (/api/cron/cleanup-messenger-locations) -- no se conserva indefinidamente.
 *
 * Firestore rules restringen la escritura de ambas a la sesión cuyo custom claim `messengerId`
 * coincide con el documento (ver firestore.rules) -- nunca a "cualquier autenticado".
 */

import { collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { MessengerTurno } from './messengers-service';

export interface MessengerLocation {
    messengerId: string;
    messengerNombre: string;
    lat: number;
    lng: number;
    accuracy: number;
    updatedAt: Timestamp;
}

const BOGOTA_TZ = 'America/Bogota';

function bogotaParts(now: Date = new Date()): { dow: number; hhmm: string } {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: BOGOTA_TZ,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Sun';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    const WEEKDAY_TO_DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dow: WEEKDAY_TO_DOW[weekdayStr] ?? 0, hhmm: `${hour}:${minute}` };
}

/** ¿Está el mensajero dentro de su turno configurado, ahora mismo (hora de Bogotá)? */
export function isWithinShift(turno: MessengerTurno | undefined | null, now: Date = new Date()): boolean {
    if (!turno || !turno.diasSemana?.length || !turno.horaInicio || !turno.horaFin) return false;
    const { dow, hhmm } = bogotaParts(now);
    if (!turno.diasSemana.includes(dow)) return false;
    // Comparación lexicográfica de 'HH:mm' es válida porque el formato es de ancho fijo.
    if (turno.horaInicio <= turno.horaFin) {
        return hhmm >= turno.horaInicio && hhmm <= turno.horaFin;
    }
    // Turno que cruza medianoche (ej. 20:00 -> 02:00)
    return hhmm >= turno.horaInicio || hhmm <= turno.horaFin;
}

/** Reporta la posición actual -- última posición (sobreescribe) + un ping al historial del turno. */
export async function reportMessengerLocation(
    messengerId: string,
    messengerNombre: string,
    lat: number,
    lng: number,
    accuracy: number
): Promise<void> {
    await setDoc(doc(db, 'messenger_locations', messengerId), {
        messengerId,
        messengerNombre,
        lat,
        lng,
        accuracy,
        updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'messenger_location_history', messengerId, 'pings'), {
        lat,
        lng,
        accuracy,
        at: serverTimestamp(),
    });
}

/** Suscripción en vivo a la posición de todos los mensajeros, para el mapa del admin. */
export function subscribeToMessengerLocations(callback: (locations: MessengerLocation[]) => void) {
    return onSnapshot(
        collection(db, 'messenger_locations'),
        (snap) => callback(snap.docs.map((d) => d.data() as MessengerLocation)),
        () => callback([])
    );
}

/** Registra que el mensajero aceptó explícitamente compartir su ubicación durante el turno. */
export async function recordGpsConsent(email: string): Promise<void> {
    await setDoc(
        doc(db, 'admin_users', email.toLowerCase()),
        { gpsConsentAcceptedAt: new Date().toISOString() },
        { merge: true }
    );
}
