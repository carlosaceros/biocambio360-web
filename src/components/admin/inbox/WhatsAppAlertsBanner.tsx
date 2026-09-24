'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { subscribeToWhatsAppAlerts, acknowledgeWhatsAppAlert, WhatsAppAlert } from '@/lib/whatsapp-alerts-service';

const SEVERITY_STYLES: Record<WhatsAppAlert['severity'], { bg: string; text: string; icon: typeof AlertTriangle }> = {
    critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: AlertCircle },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: AlertTriangle },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Info },
};

export default function WhatsAppAlertsBanner() {
    const [alerts, setAlerts] = useState<WhatsAppAlert[]>([]);
    const [dismissing, setDismissing] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeToWhatsAppAlerts((all) => {
            setAlerts(all.filter(a => !a.acknowledged));
        });
        return () => unsub();
    }, []);

    const handleAcknowledge = async (alertId: string) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setDismissing(alertId);
        try {
            await acknowledgeWhatsAppAlert(alertId, uid);
        } finally {
            setDismissing(null);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="bg-white border-b border-gray-100 px-4 py-2 space-y-1.5 shrink-0 max-h-40 overflow-y-auto">
            {alerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
                const Icon = style.icon;
                return (
                    <div
                        key={alert.id}
                        className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${style.bg} ${style.text}`}
                    >
                        <Icon size={14} className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{alert.title}</p>
                            <p className="text-[11px] opacity-80">{alert.message}</p>
                        </div>
                        <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={dismissing === alert.id}
                            className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Marcar como leída"
                        >
                            <X size={13} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
