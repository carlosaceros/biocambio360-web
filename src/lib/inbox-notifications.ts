/**
 * Inbox alerts: sound + browser notification for new inbound messages.
 * Browser-only helpers (safe to import from client components).
 */

const PREF_KEY = 'inbox_alerts_enabled';

export function getAlertsEnabled(): boolean {
    try {
        return localStorage.getItem(PREF_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function setAlertsEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(PREF_KEY, String(enabled));
    } catch { /* ignore */ }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission !== 'default') return Notification.permission;
    return Notification.requestPermission();
}

let audioCtx: AudioContext | null = null;

/** Short two-tone chime generated with Web Audio (no audio asset needed). */
export function playNotificationSound(): void {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        audioCtx = audioCtx ?? new Ctx();
        if (audioCtx.state === 'suspended') void audioCtx.resume();

        const now = audioCtx.currentTime;
        [880, 1174.66].forEach((freq, i) => {
            const osc = audioCtx!.createOscillator();
            const gain = audioCtx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = now + i * 0.16;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
            osc.connect(gain).connect(audioCtx!.destination);
            osc.start(start);
            osc.stop(start + 0.32);
        });
    } catch { /* audio blocked or unsupported */ }
}

export function showBrowserNotification(title: string, body: string, tag: string): void {
    if (getNotificationPermission() !== 'granted') return;
    try {
        const n = new Notification(title, { body, tag, icon: '/icon.png' });
        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch { /* ignore */ }
}
