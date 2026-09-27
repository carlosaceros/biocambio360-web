import { Star } from 'lucide-react';
import { REVIEWS } from './GoogleReviewsCarousel';

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

// Compact single-row version of the homepage reviews carousel, for pages (like a product page)
// where a full two-row marquee would add too much vertical scroll.
export default function GoogleReviewsLight() {
    const reviews = REVIEWS.slice(0, 8);

    return (
        <section className="py-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                </div>
                <span className="text-xs font-black text-gray-700">Reseñas reales en Google</span>
            </div>

            <div className="reviews-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                <div
                    className="reviews-track reviews-track-left flex gap-3"
                    style={{ animationDuration: '40s' }}
                >
                    {[...reviews, ...reviews].map((r, i) => (
                        <div
                            key={`${r.name}-${i}`}
                            className="w-[220px] shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                    {initials(r.name)}
                                </div>
                                <p className="text-xs font-bold text-gray-900 truncate min-w-0">{r.name}</p>
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-600 line-clamp-3">{r.text}</p>
                            <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
