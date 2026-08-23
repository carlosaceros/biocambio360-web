import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';
import { PRODUCTOS } from '@/lib/products-data';
import { generateProductSlug } from '@/lib/product-utils';
import Footer from '@/components/Footer';

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return BLOG_POSTS.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = BLOG_POSTS.find((p) => p.slug === slug);
    if (!post) return {};

    return {
        title: `${post.title} | Academia Biocambio360`,
        description: post.summary,
        keywords: [post.category.toLowerCase(), post.geoTarget.toLowerCase(), 'productos de aseo', 'biocambio360'],
    };
}

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = BLOG_POSTS.find((p) => p.slug === slug);
    if (!post) {
        notFound();
    }

    // Find related products in store data
    const relatedProducts = PRODUCTOS.filter(prod => post.relatedProductIds.includes(prod.id));

    // Generate FAQ Schema JSON-LD
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': post.faq.map(f => ({
            '@type': 'Question',
            'name': f.q,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': f.a
            }
        }))
    };

    return (
        <>
            {/* Inject FAQ Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header Nav */}
                    <div className="flex justify-between items-center mb-8">
                        <Link href="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-[var(--brand-blue)] transition-colors font-bold text-sm">
                            <ArrowLeft size={16} /> Volver al Blog
                        </Link>
                        <Link href="/" className="text-xs font-black text-gray-400 hover:text-[var(--brand-blue)] uppercase tracking-wider">
                            Ir a la Tienda Principal
                        </Link>
                    </div>

                    {/* Main Article Container */}
                    <article className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-100 mb-12">
                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-400 mb-6 pb-6 border-b border-gray-100">
                            <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider">
                                <Tag size={12} /> {post.category}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} /> Publicado el {post.date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <User size={14} /> Redacción Técnica Biocambio360
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                            {post.title}
                        </h1>

                        {/* Summary / Lead */}
                        <blockquote className="border-l-4 border-[var(--brand-pink)] pl-4 text-gray-500 italic mb-8 text-base">
                            "{post.summary}"
                        </blockquote>

                        {/* Rendered HTML content */}
                        <div 
                            className="prose prose-blue max-w-none text-gray-600 leading-relaxed space-y-4"
                            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                        />

                        {/* Structured FAQs */}
                        {post.faq.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <h3 className="text-2xl font-black text-gray-900 mb-6">Preguntas Frecuentes Relacionadas (AEO/RAG)</h3>
                                <div className="space-y-6">
                                    {post.faq.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                            <h4 className="font-extrabold text-gray-900 text-base mb-2">
                                                {item.q}
                                            </h4>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {item.a}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </article>

                    {/* Contextual CTA: Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-lg">
                            <h3 className="font-black text-lg text-gray-900 mb-6 flex items-center gap-2">
                                <ShoppingBag size={20} className="text-[var(--brand-blue)]" />
                                Productos Recomendados Directos de Fábrica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {relatedProducts.map(prod => {
                                    const prodSlug = generateProductSlug(prod.id, prod.nombre);
                                    return (
                                        <div key={prod.id} className="border border-gray-100 p-5 rounded-2xl hover:border-[var(--brand-blue)] transition-colors flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-extrabold text-gray-900 text-sm mb-1">{prod.nombre}</h4>
                                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{prod.descripcion}</p>
                                            </div>
                                            <Link 
                                                href={`/producto/${prodSlug}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--brand-blue)] group hover:gap-2.5 transition-all mt-2"
                                            >
                                                Ver Producto <ArrowRight size={14} className="text-[var(--brand-blue)]" />
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
