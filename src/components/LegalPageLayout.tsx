'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface LegalPageLayoutProps {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-4 text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        Volver al inicio
                    </Link>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-4xl font-black text-gray-900"
                        style={{ fontFamily: '"Archivo Black", sans-serif' }}
                    >
                        {title}
                    </motion.h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Última actualización: {lastUpdated}
                    </p>
                </div>
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-4xl mx-auto px-4 py-10"
            >
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 prose prose-lg prose-gray prose-headings:font-black prose-headings:text-gray-900 prose-p:text-gray-800 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800 prose-a:text-red-700 prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 max-w-none">
                    {children}
                </div>
            </motion.div>

            {/* Mini Footer */}
            <div className="max-w-4xl mx-auto px-4 pb-10 text-center text-xs text-gray-400">
                © 2026 Biocambio360 S.A.S. Todos los derechos reservados.
            </div>
        </div>
    );
}
