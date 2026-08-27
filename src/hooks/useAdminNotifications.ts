'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { isSupported, getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '@/lib/firebase';
import app from '@/lib/firebase';
import { Order } from '@/types/order';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function safeToDate(timestamp: any): Date {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') {
        try {
            return timestamp.toDate();
        } catch {
            return new Date(0);
        }
    }
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(0);
}

function formatPrice(price: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
}

export interface AdminNotification {
    id: string;
    title: string;
    body: string;
    timestamp: Date;
    read: boolean;
    type: 'new_order' | 'payment_confirmed' | 'payment_pending' | 'payment_declined';
    orderId: string;
}

function buildOrderNotification(docId: string, data: Order): AdminNotification {
    const customerName = data.cliente?.nombre || 'Cliente';
    const total = formatPrice(data.total || 0);
    const isWompi = data.metodoPago === 'wompi';
    const wompiStatus = (data.wompiTransaction?.status || '').toUpperCase();
    const isWompiApproved = wompiStatus === 'APPROVED' || data.status === 'confirmado';
    const isWompiDeclined = wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED' || data.status === 'cancelado';

    if (isWompi) {
        if (isWompiApproved) {
            const wompiId = data.wompiTransaction?.id || (data as any).wompiTransactionId || '';
            return {
                id: `${docId}_approved_${Date.now()}`,
                title: '🟢 ¡Pago Aprobado en Wompi!',
                body: `${customerName} · ${total} pagado con éxito ${wompiId ? `(ID: ${wompiId.slice(-6)})` : ''}`,
                timestamp: safeToDate(data.updatedAt || data.createdAt),
                read: false,
                type: 'payment_confirmed',
                orderId: docId,
            };
        } else if (isWompiDeclined) {
            return {
                id: `${docId}_declined_${Date.now()}`,
                title: '🔴 Pago Declinado en Wompi',
                body: `${customerName} · ${total} fue rechazado por el banco/pasarela`,
                timestamp: safeToDate(data.updatedAt || data.createdAt),
                read: false,
                type: 'payment_declined',
                orderId: docId,
            };
        } else {
            return {
                id: `${docId}_pending_${Date.now()}`,
                title: '🟡 Pedido Wompi (Sin Pago Aún)',
                body: `${customerName} · ${total} (Checkout iniciado, pendiente de pago en pasarela)`,
                timestamp: safeToDate(data.createdAt),
                read: false,
                type: 'payment_pending',
                orderId: docId,
            };
        }
    } else {
        return {
            id: `${docId}_contra_${Date.now()}`,
            title: '🛒 ¡Nuevo Pedido Contraentrega!',
            body: `${customerName} · ${total} (Se cobrará en efectivo al entregar)`,
            timestamp: safeToDate(data.createdAt),
            read: false,
            type: 'new_order',
            orderId: docId,
        };
    }
}

async function registerFCMToken() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!VAPID_KEY) {
        console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set, skipping FCM token registration');
        return;
    }

    try {
        const supported = await isSupported().catch(() => false);
        if (!supported) return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => null);
        if (!registration) return;

        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        }).catch(() => null);

        if (token) {
            await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            }).catch(() => {});
            console.log('[FCM] Token registered successfully');
        }
    } catch (error) {
        console.warn('[FCM] Could not get FCM token:', error);
    }
}

export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const knownOrderIds = useRef<Set<string>>(new Set());
    const knownOrderStatuses = useRef<Map<string, string>>(new Map());
    const isFirstLoad = useRef(true);

    // Request browser notification permission + register FCM token
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initNotifications = async () => {
            try {
                const notifAPI = (window as any).Notification;
                if (!notifAPI) return;

                let permission = notifAPI.permission;

                if (permission === 'granted') {
                    setPermissionGranted(true);
                    // Register FCM token for background push
                    await registerFCMToken();

                    const supported = await isSupported().catch(() => false);
                    if (supported) {
                        try {
                            const messaging = getMessaging(app);
                            onMessage(messaging, (payload) => {
                                const { title, body } = payload.notification || {};
                                const curNotifAPI = typeof window !== 'undefined' ? (window as any).Notification : null;
                                if (title && curNotifAPI && curNotifAPI.permission === 'granted') {
                                    try {
                                        new curNotifAPI(title, {
                                            body: body || '',
                                            icon: '/icon.png',
                                        });
                                    } catch (_) {}
                                }
                            });
                        } catch (e) {
                            console.warn('[FCM] Could not set up foreground listener', e);
                        }
                    }
                }
            } catch (err) {
                console.warn('[Notifications] Error in initNotifications:', err);
            }
        };

        initNotifications();
    }, []);

    // Subscribe to orders and detect new ones or status updates (for in-app notifications)
    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // On the very first load, record existing orders and load recent 15 into dropdown
            if (isFirstLoad.current) {
                const initialList: AdminNotification[] = [];
                snapshot.docs.forEach((doc) => {
                    const data = doc.data() as Order;
                    knownOrderIds.current.add(doc.id);
                    const statusKey = `${data.status}_${data.wompiTransaction?.status || ''}`;
                    knownOrderStatuses.current.set(doc.id, statusKey);

                    const notif = buildOrderNotification(doc.id, data);
                    notif.read = true; // Mark historical items as already read
                    initialList.push(notif);
                });

                // Ordenar estrictamente por fecha descendente (más reciente arriba)
                initialList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setNotifications(initialList.slice(0, 15));
                isFirstLoad.current = false;
                return;
            }

            // For every change, detect added or modified documents
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data() as Order;
                const docId = change.doc.id;
                const currentStatusKey = `${data.status}_${data.wompiTransaction?.status || ''}`;
                const previousStatusKey = knownOrderStatuses.current.get(docId);

                let shouldNotify = false;

                if (change.type === 'added' && !knownOrderIds.current.has(docId)) {
                    knownOrderIds.current.add(docId);
                    knownOrderStatuses.current.set(docId, currentStatusKey);
                    shouldNotify = true;
                } else if (change.type === 'modified' && previousStatusKey !== currentStatusKey) {
                    knownOrderStatuses.current.set(docId, currentStatusKey);
                    shouldNotify = true;
                }

                if (shouldNotify) {
                    const notification = buildOrderNotification(docId, data);

                    // Add to in-app list, merge without duplicate orderIds, and sort chronologically
                    setNotifications((prev) => {
                        const merged = [notification, ...prev.filter(n => n.orderId !== docId)];
                        return merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
                    });

                    // Show browser notification if permission granted (fallback for non-FCM)
                    try {
                        const notifAPI = typeof window !== 'undefined' ? (window as any).Notification : null;
                        if (notifAPI && notifAPI.permission === 'granted') {
                            const browserNotif = new notifAPI(notification.title, {
                                body: notification.body,
                                icon: '/icon.png',
                                badge: '/icon.png',
                                tag: docId,
                            });
                            browserNotif.onclick = () => {
                                window.focus();
                                window.location.href = '/admin/pedidos';
                                browserNotif.close();
                            };
                        }
                    } catch (e) {
                        console.warn('[Notifications] No se pudo mostrar notificación del navegador', e);
                    }
                }
            });
        });

        return unsubscribe;
    }, [permissionGranted]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    };

    const requestPermission = async () => {
        try {
            if (typeof window === 'undefined') return false;
            const notifAPI = (window as any).Notification;
            if (!notifAPI || typeof notifAPI.requestPermission !== 'function') return false;
            const permission = await notifAPI.requestPermission();
            const granted = permission === 'granted';
            if (granted) {
                setPermissionGranted(true);
                await registerFCMToken();
            }
            return granted;
        } catch (_) {
            return false;
        }
    };

    const isPermGranted = permissionGranted || Boolean(
        typeof window !== 'undefined' &&
        (window as any).Notification &&
        (window as any).Notification.permission === 'granted'
    );

    return {
        notifications,
        unreadCount,
        permissionGranted: isPermGranted,
        markAllAsRead,
        markAsRead,
        requestPermission,
    };
}
