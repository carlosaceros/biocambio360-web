'use client';

import { useState, useEffect } from 'react';

const TIMER_KEY = 'biocambio360_fomo_timer_start';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export interface FomoTimerState {
    isVisible: boolean;
    remainingSeconds: number;
    formattedTime: string;
}

export function useFomoTimer(): FomoTimerState {
    const [timerState, setTimerState] = useState<FomoTimerState>({
        isVisible: true,
        remainingSeconds: 24 * 3600,
        formattedTime: '23:59:59',
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initOrGetTimer = (): number => {
            const stored = localStorage.getItem(TIMER_KEY);
            const now = Date.now();

            if (!stored) {
                localStorage.setItem(TIMER_KEY, now.toString());
                return now;
            }

            const startTime = parseInt(stored, 10);
            const elapsed = now - startTime;

            // If 72 hours passed since original start, reset cycle
            if (elapsed >= SEVENTY_TWO_HOURS_MS) {
                localStorage.setItem(TIMER_KEY, now.toString());
                return now;
            }

            return startTime;
        };

        const updateTimer = () => {
            const startTime = initOrGetTimer();
            const now = Date.now();
            const elapsed = now - startTime;

            if (elapsed < TWENTY_FOUR_HOURS_MS) {
                const remainingMs = TWENTY_FOUR_HOURS_MS - elapsed;
                const totalSec = Math.floor(remainingMs / 1000);

                const hours = Math.floor(totalSec / 3600);
                const minutes = Math.floor((totalSec % 3600) / 60);
                const seconds = totalSec % 60;

                const pad = (n: number) => n.toString().padStart(2, '0');
                const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

                setTimerState({
                    isVisible: true,
                    remainingSeconds: totalSec,
                    formattedTime: formatted,
                });
            } else {
                // 24h expired, keep hidden until 72h elapsed
                setTimerState({
                    isVisible: false,
                    remainingSeconds: 0,
                    formattedTime: '00:00:00',
                });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    return timerState;
}
