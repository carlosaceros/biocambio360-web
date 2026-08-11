import * as admin from 'firebase-admin';

// Singleton: initialize only once, lazily (not at import time)
let _app: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App {
    if (_app) return _app;
    if (admin.apps.length > 0) {
        _app = admin.apps[0]!;
        return _app;
    }

    // Strategy 1: Individual env vars
    let projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Strategy 2: Parse FIREBASE_SERVICE_ACCOUNT JSON blob (used in this project)
    if ((!projectId || !clientEmail || !privateKey) && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            projectId = projectId || sa.project_id;
            clientEmail = clientEmail || sa.client_email;
            privateKey = privateKey || sa.private_key;
        } catch (e: any) {
            console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
        }
    }

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin env vars missing. Set FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.'
        );
    }

    _app = admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    return _app;
}

export function getAdminMessaging() {
    return admin.messaging(getFirebaseAdmin());
}

export function getAdminDB() {
    return admin.firestore(getFirebaseAdmin());
}

