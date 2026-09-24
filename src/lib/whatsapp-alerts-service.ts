/**
 * WhatsApp Alerts Service (Firestore)
 * Real-time operational alerts for template status/quality changes and
 * phone number quality degradation, written by the webhook (Admin SDK)
 * and surfaced to admins in the Inbox UI.
 */

import {
    collection,
    doc,
    query,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    Timestamp,
    type Unsubscribe,
    type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export type WhatsAppAlertType = 'template_status' | 'template_quality' | 'phone_quality';
export type WhatsAppAlertSeverity = 'info' | 'warning' | 'critical';

export interface WhatsAppAlert {
    id: string;
    type: WhatsAppAlertType;
    severity: WhatsAppAlertSeverity;
    title: string;
    message: string;
    phoneNumberId?: string;
    accountKey?: string;
    templateName?: string;
    templateLanguage?: string;
    templateId?: string;
    event?: string;
    previousValue?: string;
    newValue?: string;
    rawPayload?: Record<string, unknown>;
    acknowledged: boolean;
    createdAt: Timestamp | Date | string;
    acknowledgedAt?: Timestamp | Date | string;
    acknowledgedBy?: string;
}

const alertsRef = () => collection(db, 'whatsapp_alerts');

function docToAlert(id: string, data: DocumentData): WhatsAppAlert {
    return {
        id,
        type: data.type ?? 'template_status',
        severity: data.severity ?? 'info',
        title: data.title ?? 'Alerta de WhatsApp',
        message: data.message ?? '',
        phoneNumberId: data.phoneNumberId,
        accountKey: data.accountKey,
        templateName: data.templateName,
        templateLanguage: data.templateLanguage,
        templateId: data.templateId,
        event: data.event,
        previousValue: data.previousValue,
        newValue: data.newValue,
        rawPayload: data.rawPayload,
        acknowledged: data.acknowledged ?? false,
        createdAt: data.createdAt,
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
    };
}

/**
 * Subscribes to the most recent WhatsApp alerts (unacknowledged first in the UI's own sort,
 * but ordered by creation time here so nothing is missed).
 */
export function subscribeToWhatsAppAlerts(
    callback: (alerts: WhatsAppAlert[]) => void,
    maxResults: number = 30
): Unsubscribe {
    const q = query(alertsRef(), orderBy('createdAt', 'desc'), limit(maxResults));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => docToAlert(d.id, d.data())));
    });
}

/**
 * Marks an alert as acknowledged (dismissed) by the current admin.
 */
export async function acknowledgeWhatsAppAlert(alertId: string, adminUid: string): Promise<void> {
    const ref = doc(db, 'whatsapp_alerts', alertId);
    await updateDoc(ref, {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: adminUid,
    });
}
