/**
 * Human-advisor schedule (America/Bogota) and Colombian public holidays.
 * The AI agent covers every moment in which no human is online.
 */

export const TIMEZONE = 'America/Bogota';

const H = (h: number, m = 0) => h * 60 + m;

/** [opens, closes] in minutes from midnight, by weekday (0 = Sunday). Sundays and holidays: 9-18. */
const WEEK: Record<number, [number, number]> = {
    0: [H(9), H(18)],
    1: [H(6), H(21)],
    2: [H(6), H(21)],
    3: [H(6), H(21)],
    4: [H(6), H(20)],
    5: [H(6), H(19)],
    6: [H(7), H(19)],
};
const HOLIDAY_HOURS: [number, number] = [H(9), H(18)];

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

interface Ymd {
    y: number;
    m: number;
    d: number;
}

function bogotaNow(date: Date): Ymd & { minutes: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? '0');
    return { y: get('year'), m: get('month'), d: get('day'), minutes: (get('hour') % 24) * 60 + get('minute') };
}

const utc = ({ y, m, d }: Ymd, plusDays = 0) => new Date(Date.UTC(y, m - 1, d + plusDays));
const key = (dt: Date) => `${dt.getUTCMonth() + 1}-${dt.getUTCDate()}`;

/** Ley Emiliani: the holiday moves to the following Monday (stays if it already is a Monday). */
function toMonday(dt: Date): Date {
    const shift = (8 - dt.getUTCDay()) % 7;
    return new Date(dt.getTime() + shift * 86400000);
}

function easterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

function holidaysOf(year: number): Set<string> {
    const cached = holidayCache.get(year);
    if (cached) return cached;
    const set = new Set<string>();
    for (const [m, d] of [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]]) set.add(`${m}-${d}`);
    for (const [m, d] of [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]]) {
        set.add(key(toMonday(new Date(Date.UTC(year, m - 1, d)))));
    }
    const easter = easterSunday(year);
    const plus = (n: number) => new Date(easter.getTime() + n * 86400000);
    set.add(key(plus(-3))); // Holy Thursday
    set.add(key(plus(-2))); // Good Friday
    set.add(key(toMonday(plus(39)))); // Ascension
    set.add(key(toMonday(plus(60)))); // Corpus Christi
    set.add(key(toMonday(plus(68)))); // Sacred Heart
    holidayCache.set(year, set);
    return set;
}

export function isColombianHoliday(dt: Date): boolean {
    return holidaysOf(dt.getUTCFullYear()).has(key(dt));
}

function hoursOn(dt: Date): [number, number] {
    return isColombianHoliday(dt) ? HOLIDAY_HOURS : WEEK[dt.getUTCDay()];
}

/** True while at least one human advisor is scheduled to be online. */
export function isHumanOnline(date: Date = new Date()): boolean {
    const now = bogotaNow(date);
    const [open, close] = hoursOn(utc(now));
    return now.minutes >= open && now.minutes < close;
}

function timeLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

export interface NextOpening {
    /** "hoy desde las 6:00 a.m." | "mañana desde las 6:00 a.m." | "el lunes desde las 6:00 a.m." */
    label: string;
    /** "mañana a las 6:00 a.m." style, for sentences like "a primera hora" */
    when: string;
    time: string;
    daysAhead: number;
}

/** The next moment the human team opens (never "now": if they are online it looks to the next opening). */
export function nextOpening(date: Date = new Date()): NextOpening {
    const now = bogotaNow(date);
    for (let ahead = 0; ahead <= 8; ahead++) {
        const dt = utc(now, ahead);
        const [open] = hoursOn(dt);
        if (ahead === 0 && now.minutes >= open) continue;
        const time = timeLabel(open);
        const day = ahead === 0 ? 'hoy' : ahead === 1 ? 'mañana' : `el ${DAY_NAMES[dt.getUTCDay()]}`;
        return { label: `${day} desde las ${time}`, when: `${day} a las ${time}`, time, daysAhead: ahead };
    }
    return { label: 'mañana desde las 6:00 a.m.', when: 'mañana a las 6:00 a.m.', time: '6:00 a.m.', daysAhead: 1 };
}

/** Identifies the current "agent shift" (day of the last opening) to reset per-shift counters. */
export function shiftKey(date: Date = new Date()): string {
    const now = bogotaNow(date);
    const [open] = hoursOn(utc(now));
    const day = now.minutes >= open ? utc(now) : utc(now, -1);
    return day.toISOString().slice(0, 10);
}

export type DayPart = 'manana' | 'tarde' | 'noche';

/** Part of the day in Bogotá, with the matching greeting (used so a "good day" is never said at night). */
export function dayPartNow(date: Date = new Date()): { part: DayPart; greeting: string; noun: string } {
    const hour = Math.floor(bogotaNow(date).minutes / 60);
    if (hour >= 5 && hour < 12) return { part: 'manana', greeting: '¡Buenos días!', noun: 'día' };
    if (hour >= 12 && hour < 19) return { part: 'tarde', greeting: '¡Buenas tardes!', noun: 'tarde' };
    return { part: 'noche', greeting: '¡Buenas noches!', noun: 'noche' };
}
