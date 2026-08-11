'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { FAQS_GENERALES, type FAQItem } from '@/lib/faqs';

interface FAQSectionProps {
    limit?: number;
}

export default function FAQSection({ limit }: FAQSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const displayedFAQs = limit ? FAQS_GENERALES.slice(0, limit) : FAQS_GENERALES;

    // Generate FAQ Schema.org JSON-LD
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": displayedFAQs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <>
            {/* Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/30 border border-gray-100 mb-16">
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <span className="text-[var(--brand-pink)] font-extrabold uppercase text-xs tracking-[0.2em] mb-2 block">Preguntas Frecuentes</span>
                    <h2 className="text-3xl font-extrabold text-[var(--brand-dark)] mb-4 tracking-tight">
                        TODO LO QUE NECESITAS SABER
                    </h2>
                    <p className="text-gray-500">
                        Respuestas directas de nuestros expertos en limpieza industrial
                    </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-2">
                    {displayedFAQs.map((faq, idx) => (
                        <div
                            key={idx}
                            className="border border-gray-100 rounded-xl overflow-hidden hover:border-[var(--brand-blue)]/20 transition-colors bg-white"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-[var(--brand-blue-50)] transition-colors group"
                            >
                                <span className="font-bold text-[var(--brand-dark)] pr-8 group-hover:text-[var(--brand-blue)] transition-colors">
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    size={20}
                                    className={`shrink-0 text-gray-400 group-hover:text-[var(--brand-blue)] transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'max-h-96' : 'max-h-0'
                                    }`}
                            >
                                <div className="px-6 pb-4 text-gray-600 leading-relaxed text-sm border-t border-gray-50 pt-4">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
