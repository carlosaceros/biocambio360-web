import { Quote, Star } from 'lucide-react';

export interface Review {
    name: string;
    meta: string;
    text: string;
}

// Verbatim reviews from the real Biocambio360 Google Business Profile (provided by the business owner)
export const REVIEWS: Review[] = [
    { name: 'Dama YH', meta: 'Local Guide · 23 opiniones', text: 'Excelentes productos, un aroma delicioso, rendidores, nada que comparar con productos del mercado, estos si te facilitan la vida, muy buenos super recomendados, me los traen hasta la puerta de mi casa y pago cómodamente, cuando los recibo.' },
    { name: 'Diana Marcela Vargas Hernandez', meta: 'Cliente en Google', text: 'Me gusta el punto de venta físico por que se puede comprar todos los productos de aseo para cada área del hogar. Además que la atención al cliente es muy cálida y técnica. Los productos son de excelente calidad y rinden mucho y el aroma es muy rico y perdura.' },
    { name: 'Graciela Vargas', meta: 'Cliente en Google', text: 'Los productos de Biocambio 360 son excelentes. Los llevo utilizando ya hace más de 4 años, vivía en Bogotá Suba, ahora me trasladé a Madrid Cundinamarca y hasta aquí llegan los productos…' },
    { name: 'Sulma Morales', meta: 'Cliente en Google', text: 'Los productos ofrecidos en Biocambio 360 son de alta calidad. Los llevo utilizando mucho tiempo y cada vez me siento más contenta por la economía y eficiencia: jabón de ropa, manos y lavaloza…' },
    { name: 'Diana Marcela Ariza Monroy', meta: 'Local Guide · 13 opiniones', text: 'Excelentes productos a muy buen precio, cliente fiel desde hace 3 años.' },
    { name: 'Milena Alvarez', meta: 'Cliente en Google', text: 'Este punto de venta físico cuenta con gran variedad de productos de aseo y otros… manejan buen stock y excelente servicio al cliente. ¡Recomendado!' },
    { name: 'survey COL', meta: 'Cliente en Google', text: 'El jabón para ropa Biocambio 360 deja la ropa limpia y con un olor muy agradable que deja el apartamento oliendo a rico, y aún más si se usa el suavizante. Fue una decisión muy acertada. Gracias.' },
    { name: 'Frandy Luzdey Montiel Angarita', meta: 'Cliente en Google', text: 'Super recomendado, son productos con una excelente calidad del 100%. Mi familia y yo nos sentimos satisfechos, tanto con la atención como con los precios, que nos ayudan a ahorrar tiempo y dinero…' },
    { name: 'Ana Yiseth Ortiz Ángel', meta: 'Local Guide · 4 opiniones', text: 'Excelente, me encanta el jabón de la ropa y el limpiavidrios.' },
    { name: 'Diego Alonso Cuervo Leon', meta: 'Cliente en Google', text: 'Me parecen productos confiables, de buena calidad, rendidores y a buen precio, los estoy usando hace varios meses y me encantan.' },
    { name: 'Juliana Tabares', meta: 'Cliente en Google', text: 'Estoy encantada con estos productos de limpieza, su calidad y el servicio al cliente. ¡Los recomiendo, son excelentes! 🫶🏼' },
    { name: 'Mirella Ramirez', meta: 'Cliente en Google', text: 'Los productos en general son muy buenos, en especial el jabón para lavar la ropa, para lavar la loza y las pastillas para el baño; nos ayudan a economizar bastante ya que duran mucho. Muy buen servicio al cliente también.' },
    { name: 'Yesica Olaya', meta: 'Cliente en Google', text: 'Es un producto de muy buena calidad: no mancha la ropa, no decolora la ropa, son muy cumplidos en la entrega. Super recomendado.' },
    { name: 'Viviana Quintero', meta: 'Cliente en Google', text: 'Llevo 2 años usando estos maravillosos productos de excelente calidad, adicional el domicilio es gratis y muy cumplidos.' },
    { name: 'Camilo Osorio', meta: 'Cliente en Google', text: 'Excelentes todos sus productos, rinden muchooo. Super recomendado 👌' },
    { name: 'Carlos Rodriguez', meta: 'Cliente en Google', text: 'Me parece el servicio y los productos de excelente calidad, la puntualidad con los pedidos magnífica.' },
];

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

function ReviewCard({ r }: { r: Review }) {
    return (
        <div className="w-[300px] sm:w-[340px] shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 text-white flex items-center justify-center font-black text-sm shrink-0">
                        {initials(r.name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{r.meta}</p>
                    </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0" aria-label="Google">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38z" />
                </svg>
            </div>
            <Quote size={16} className="text-gray-200 -mb-2" />
            <p className="text-[13px] leading-relaxed text-gray-700 line-clamp-5">{r.text}</p>
            <div className="flex gap-0.5 mt-auto pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
            </div>
        </div>
    );
}

function Row({ reviews, direction, duration }: { reviews: Review[]; direction: 'left' | 'right'; duration: number }) {
    return (
        <div className="reviews-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <div
                className={`reviews-track flex gap-4 ${direction === 'left' ? 'reviews-track-left' : 'reviews-track-right'}`}
                style={{ animationDuration: `${duration}s` }}
            >
                {[...reviews, ...reviews].map((r, i) => (
                    <ReviewCard key={`${r.name}-${i}`} r={r} />
                ))}
            </div>
        </div>
    );
}

export default function GoogleReviewsCarousel() {
    const mid = Math.ceil(REVIEWS.length / 2);
    const rowA = REVIEWS.slice(0, mid);
    const rowB = REVIEWS.slice(mid);

    return (
        <section className="py-12 sm:py-16 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 text-center mb-8">
                <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 shadow-sm mb-3">
                    <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-gray-700 ml-1">Reseñas reales en Google</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                    Lo que dicen nuestros clientes
                </h2>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xl mx-auto">
                    Familias, restaurantes y negocios en Bogotá y toda Colombia que ya confían en Biocambio360.
                </p>
            </div>

            <div className="space-y-4">
                <Row reviews={rowA} direction="left" duration={55} />
                <Row reviews={rowB} direction="right" duration={60} />
            </div>
        </section>
    );
}
