/**
 * WhatsApp marketing opt-out. A customer who taps "Detener promociones" (or writes "stop") is
 * recorded in `wa_optouts/{57XXXXXXXXXX}` and never receives automated reminders or campaigns again.
 * They can still write to us and get normal answers.
 */

import { getAdminDB } from '@/lib/firebase-admin';

export const OPTOUT_CONFIRMATION =
    'Listo, no volverás a recibir recordatorios ni promociones de Biocambio360. Si necesitas algo, escríbenos cuando quieras 🙌';

export function isOptOutText(text: string): boolean {
    const t = String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!t || t.length > 40) return false;
    return /^(detener( promociones| mensajes)?|stop|parar|baja|darme de baja|cancelar suscripcion|no quiero (recibir )?(mas )?(mensajes|promociones|publicidad)|no mas (mensajes|promociones|publicidad))$/.test(t);
}

export async function isOptedOut(whatsappId: string): Promise<boolean> {
    try {
        return (await getAdminDB().collection('wa_optouts').doc(whatsappId).get()).exists;
    } catch {
        return false;
    }
}

export async function registerOptOut(whatsappId: string, conversationId?: string): Promise<void> {
    await getAdminDB().collection('wa_optouts').doc(whatsappId).set({ at: new Date().toISOString(), conversationId: conversationId ?? null }, { merge: true });
}
