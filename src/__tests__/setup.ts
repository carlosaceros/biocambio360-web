// Global test setup — mocks for Next.js / Firebase / fs
import { vi } from 'vitest';

// ─── Next.js server mocks ───────────────────────────────────────────────────
vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: ResponseInit) => ({
            status: init?.status ?? 200,
            body,
        }),
    },
}));

// ─── Firebase mock ──────────────────────────────────────────────────────────
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    increment: vi.fn((val: number) => val),
    runTransaction: vi.fn(),
    Timestamp: {
        now: () => ({
            toDate: () => new Date(),
            toMillis: () => Date.now(),
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
        }),
    },
}));

