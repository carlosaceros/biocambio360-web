'use client';

import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
    {
        label: 'Caras',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '😘', '😋', '😎', '🤗', '🤔', '😐', '😴', '😢', '😭', '😅', '🙄', '😮', '🥳', '🤝'],
    },
    {
        label: 'Gestos',
        emojis: ['👍', '👎', '👌', '🙌', '👏', '🙏', '💪', '👋', '🤞', '✌️', '👉', '👈', '☝️', '✅', '❌', '⚠️', '❗', '❓'],
    },
    {
        label: 'Negocio',
        emojis: ['📦', '🚚', '🛒', '💰', '💵', '🧾', '📄', '📱', '📞', '📍', '🕒', '📅', '🏢', '🏭', '🧴', '🧼', '🧽', '🧹', '🫧', '✨', '🌿', '♻️', '⭐', '🔥', '🎁', '💚', '❤️', '🎉'],
    },
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    disabled?: boolean;
}

export default function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                disabled={disabled}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-40 cursor-pointer"
                title="Emojis"
            >
                <Smile size={18} />
            </button>

            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-30 space-y-2">
                    {EMOJI_GROUPS.map(group => (
                        <div key={group.label}>
                            <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider px-1 mb-1">
                                {group.label}
                            </p>
                            <div className="grid grid-cols-8 gap-0.5">
                                {group.emojis.map((emoji, i) => (
                                    <button
                                        key={`${group.label}-${i}`}
                                        type="button"
                                        onClick={() => onSelect(emoji)}
                                        className="text-xl leading-none p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
