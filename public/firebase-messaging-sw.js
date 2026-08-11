// Firebase Messaging Service Worker
// This file MUST be at the root of public/ so it's served at /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config (public values, safe to include here)
firebase.initializeApp({
    apiKey: "AIzaSyC3-xL7Kju_rqtfprLvqMteRd1R0YmvxMg",
    authDomain: "pajarito-ecommerce.firebaseapp.com",
    projectId: "pajarito-ecommerce",
    storageBucket: "pajarito-ecommerce.firebasestorage.app",
    messagingSenderId: "239993302422",
    appId: "1:239993302422:web:d3456643d473c2d71a01b7",
});

const messaging = firebase.messaging();

// Handle background messages (when tab is closed or in background)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const { title, body, icon } = payload.notification || {};

    const notificationTitle = title || '🕊️ Pajarito Admin';
    const notificationOptions = {
        body: body || 'Tienes una nueva notificación',
        icon: icon || '/icon.png',
        badge: '/icon.png',
        data: payload.data || {},
        actions: [
            { action: 'open', title: 'Ver pedidos' },
            { action: 'dismiss', title: 'Descartar' }
        ],
        requireInteraction: true, // Notification stays until user interacts
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    // Navigate to admin pedidos on click
    const urlToOpen = new URL('/admin/pedidos', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If admin panel is already open, focus it
            for (const client of windowClients) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
