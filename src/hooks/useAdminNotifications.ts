'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '@/lib/firebase';
import app from '@/lib/firebase';
import { Order } from '@/types/order';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function safeToDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    return new Date();
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
    type: 'new_order' | 'payment_confirmed';
    orderId: string;
}

async function registerFCMToken() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!VAPID_KEY) {
        console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set, skipping FCM token registration');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
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
    const isFirstLoad = useRef(true);

    // Request browser notification permission + register FCM token
    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        const initNotifications = async () => {
            let permission = Notification.permission;

            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission === 'granted') {
                setPermissionGranted(true);
                // Register FCM token for background push
                await registerFCMToken();

                // Listen for foreground FCM messages
                try {
                    const messaging = getMessaging(app);
                    onMessage(messaging, (payload) => {
                        const { title, body } = payload.notification || {};
                        if (title) {
                            new Notification(title, {
                                body: body || '',
                                icon: '/icon.png',
                            });
                        }
                    });
                } catch (e) {
                    console.warn('[FCM] Could not set up foreground listener', e);
                }
            }
        };

        initNotifications();
    }, []);

    // Subscribe to orders and detect new ones (for in-app notifications)
    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // On the very first load, just record all existing order IDs (no notifications)
            if (isFirstLoad.current) {
                snapshot.docs.forEach((doc) => knownOrderIds.current.add(doc.id));
                isFirstLoad.current = false;
                return;
            }

            // For every change, detect added documents
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && !knownOrderIds.current.has(change.doc.id)) {
                    const data = change.doc.data() as Order;
                    knownOrderIds.current.add(change.doc.id);

                    const customerName = data.cliente?.nombre || 'Cliente desconocido';
                    const total = formatPrice(data.total || 0);
                    const isPaid = data.status === 'confirmado' || data.metodoPago === 'wompi';

                    const notification: AdminNotification = {
                        id: change.doc.id + '_' + Date.now(),
                        title: isPaid ? '💳 ¡Pago Confirmado!' : '🛒 ¡Nuevo Pedido!',
                        body: isPaid
                            ? `${customerName} pagó ${total} con tarjeta`
                            : `${customerName} hizo un pedido de ${total} (contraentrega)`,
                        timestamp: safeToDate(data.createdAt),
                        read: false,
                        type: isPaid ? 'payment_confirmed' : 'new_order',
                        orderId: change.doc.id,
                    };

                    // Add to in-app list
                    setNotifications((prev) => [notification, ...prev]);

                    // Show browser notification if permission granted (fallback for non-FCM)
                    if (Notification.permission === 'granted') {
                        try {
                            const browserNotif = new Notification(notification.title, {
                                body: notification.body,
                                icon: '/icon.png',
                                badge: '/icon.png',
                                tag: change.doc.id,
                            });
                            browserNotif.onclick = () => {
                                window.focus();
                                window.location.href = '/admin/pedidos';
                                browserNotif.close();
                            };
                        } catch (e) {
                            console.warn('[Notifications] No se pudo mostrar notificación del navegador', e);
                        }
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
        if (typeof window === 'undefined' || !('Notification' in window)) return false;
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        if (granted) {
            setPermissionGranted(true);
            await registerFCMToken();
        }
        return granted;
    };

    return {
        notifications,
        unreadCount,
        permissionGranted: permissionGranted || (typeof window !== 'undefined' && Notification.permission === 'granted'),
        markAllAsRead,
        markAsRead,
        requestPermission,
    };
}
