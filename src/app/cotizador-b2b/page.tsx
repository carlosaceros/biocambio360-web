'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Shirt,
    Utensils,
    GraduationCap,
    Hotel,
    Stethoscope,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    FileText,
    ShoppingCart,
    MessageCircle,
    TrendingDown,
    ShieldCheck,
    Calculator,
    Factory
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { createB2BProposal, updateB2BProposalStatus, B2BProposalItem } from '@/lib/b2b-proposal-service';
import HeaderMessage from '@/components/HeaderMessage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface SectorConfig {
    id: 'conjunto_residencial' | 'lavanderia' | 'restaurant' | 'school' | 'hotel' | 'clinic';
    title: string;
    description: string;
    icon: any;
    defaultUnitsLabel: string;
    defaultUnits: number;
    recommendedItems: { nombre: string; presentacion: string; precioMercado: number; precioBiocambio: number; factorUnidad: number }[];
}

const SECTORS: SectorConfig[] = [
    {
        id: 'conjunto_residencial',
        title: 'Conjunto Residencial / Propiedad Horizontal',
        description: 'Edificios, torres y conjuntos residenciales en Soacha, Bogotá y Cundinamarca.',
        icon: Building2,
        defaultUnitsLabel: 'Número de Apartamentos',
        defaultUnits: 250,
        recommendedItems: [
            { nombre: 'Limpiapisos Aromático Concentrado', presentacion: '20 Litros', precioMercado: 75000, precioBiocambio: 46000, factorUnidad: 0.02 },
            { nombre: 'Desinfectante Limpiador Multiusos', presentacion: '20 Litros', precioMercado: 82000, precioBiocambio: 51000, factorUnidad: 0.02 },
            { nombre: 'Blanqueador Desinfectante de Hipoclorito', presentacion: '20 Litros', precioMercado: 68000, precioBiocambio: 42000, factorUnidad: 0.015 },
            { nombre: 'Desengrasante Industrial Potente', presentacion: '20 Litros', precioMercado: 95000, precioBiocambio: 58000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'lavanderia',
        title: 'Lavandería Industrial / Tintorería',
        description: 'Plantas de lavado, tintorerías y lavanderías comerciales.',
        icon: Shirt,
        defaultUnitsLabel: 'Kilos de Ropa Procesados al Día',
        defaultUnits: 400,
        recommendedItems: [
            { nombre: 'Detergente Industrial Concentrado', presentacion: '20 Litros', precioMercado: 110000, precioBiocambio: 68000, factorUnidad: 0.03 },
            { nombre: 'Suavizante Textil de Alto Rendimiento', presentacion: '20 Litros', precioMercado: 98000, precioBiocambio: 59000, factorUnidad: 0.025 },
            { nombre: 'Blanqueador Oxigenado Ropa Color y Blanca', presentacion: '20 Litros', precioMercado: 92000, precioBiocambio: 56000, factorUnidad: 0.02 },
            { nombre: 'Desengrasante Removedor de Manchas', presentacion: '20 Litros', precioMercado: 105000, precioBiocambio: 64000, factorUnidad: 0.015 }
        ]
    },
    {
        id: 'restaurant',
        title: 'Restaurante / Casino Empresarial / Catering',
        description: 'Establecimientos gastronómicos, comedores industriales y servicios de catering.',
        icon: Utensils,
        defaultUnitsLabel: 'Servicios o Platos Preparados al Día',
        defaultUnits: 350,
        recommendedItems: [
            { nombre: 'Detergente Lavaloza Concentrado Cocina', presentacion: '20 Litros', precioMercado: 83000, precioBiocambio: 52000, factorUnidad: 0.025 },
            { nombre: 'Desengrasante Removedor de Grasa Pesada', presentacion: '20 Litros', precioMercado: 98000, precioBiocambio: 61000, factorUnidad: 0.02 },
            { nombre: 'Desinfectante Grado Alimentario', presentacion: '20 Litros', precioMercado: 85000, precioBiocambio: 53000, factorUnidad: 0.015 },
            { nombre: 'Jabón Antibacterial para Manos Cocina', presentacion: '10 Litros', precioMercado: 55000, precioBiocambio: 34000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'school',
        title: 'Colegio / Universidad / Institución Educativa',
        description: 'Planteles educativos, campus universitarios y jardines infantiles.',
        icon: GraduationCap,
        defaultUnitsLabel: 'Número de Estudiantes',
        defaultUnits: 800,
        recommendedItems: [
            { nombre: 'Limpiapisos Aromático Alto Relleno', presentacion: '20 Litros', precioMercado: 75000, precioBiocambio: 46000, factorUnidad: 0.015 },
            { nombre: 'Desinfectante Hospitalario/Escolar', presentacion: '20 Litros', precioMercado: 84000, precioBiocambio: 52000, factorUnidad: 0.015 },
            { nombre: 'Jabón Espuma para Manos Institucional', presentacion: '20 Litros', precioMercado: 92000, precioBiocambio: 57000, factorUnidad: 0.01 },
            { nombre: 'Blanqueador Sanitizante de Baterías Sanitarias', presentacion: '20 Litros', precioMercado: 68000, precioBiocambio: 42000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'hotel',
        title: 'Hotel / Alojamiento / Hospedaje',
        description: 'Hoteles, hostales, apartahoteles y centros de alojamiento.',
        icon: Hotel,
        defaultUnitsLabel: 'Número de Habitaciones',
        defaultUnits: 60,
        recommendedItems: [
            { nombre: 'Detergente Ropa de Cama y Toallas', presentacion: '20 Litros', precioMercado: 108000, precioBiocambio: 67000, factorUnidad: 0.1 },
            { nombre: 'Suavizante Aroma Prolongado', presentacion: '20 Litros', precioMercado: 95000, precioBiocambio: 58000, factorUnidad: 0.08 },
            { nombre: 'Limpiador de Vidrios y Azulejos', presentacion: '20 Litros', precioMercado: 83000, precioBiocambio: 49000, factorUnidad: 0.05 },
            { nombre: 'Desinfectante Amonio Cuaternario 5ta Gen', presentacion: '20 Litros', precioMercado: 89000, precioBiocambio: 55000, factorUnidad: 0.05 }
        ]
    },
    {
        id: 'clinic',
        title: 'Clínica / Centro Médico / IPS / Consultorio',
        description: 'Centros odontológicos, IPS, laboratorios y clínicas de salud.',
        icon: Stethoscope,
        defaultUnitsLabel: 'Número de Consultorios / Unidades',
        defaultUnits: 15,
        recommendedItems: [
            { nombre: 'Desinfectante Quirúrgico Amonio 5ta Gen', presentacion: '20 Litros', precioMercado: 115000, precioBiocambio: 71000, factorUnidad: 0.3 },
            { nombre: 'Jabón Antiséptico para Manos', presentacion: '20 Litros', precioMercado: 102000, precioBiocambio: 63000, factorUnidad: 0.25 },
            { nombre: 'Blanqueador Desinfectante de Áreas Críticas', presentacion: '20 Litros', precioMercado: 72000, precioBiocambio: 44000, factorUnidad: 0.2 },
            { nombre: 'Limpiador Germicida de Pisos', presentacion: '20 Litros', precioMercado: 85000, precioBiocambio: 53000, factorUnidad: 0.2 }
        ]
    }
];

export default function CotizadorB2BPage() {
    const { addToCart, setIsCartOpen } = useCart();

    const [selectedSector, setSelectedSector] = useState<SectorConfig>(SECTORS[0]);
    const [units, setUnits] = useState<number>(SECTORS[0].defaultUnits);

    // Lead Form inputs
    const [nombreEncargado, setNombreEncargado] = useState('');
    const [nombreEmpresa, setNombreEmpresa] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [ciudad, setCiudad] = useState('Soacha / Bogotá');

    const [isSaving, setIsSaving] = useState(false);
    const [generatedProposal, setGeneratedProposal] = useState<any | null>(null);

    const handleSectorSelect = (sec: SectorConfig) => {
        setSelectedSector(sec);
        setUnits(sec.defaultUnits);
        setGeneratedProposal(null);
    };

    // Calculate items and savings dynamically
    const calculatedItems: B2BProposalItem[] = selectedSector.recommendedItems.map(item => {
        const cantidad = Math.max(1, Math.round(units * item.factorUnidad));
        const subtotalMercado = cantidad * item.precioMercado;
        const subtotalBiocambio = cantidad * item.precioBiocambio;
        const ahorroItem = subtotalMercado - subtotalBiocambio;

        return {
            nombre: item.nombre,
            presentacion: item.presentacion,
            precioMercado: item.precioMercado,
            precioBiocambio: item.precioBiocambio,
            cantidad,
            subtotalMercado,
            subtotalBiocambio,
            ahorroItem
        };
    });

    const gastoMercadoMes = calculatedItems.reduce((sum, i) => sum + i.subtotalMercado, 0);
    const gastoBiocambioMes = calculatedItems.reduce((sum, i) => sum + i.subtotalBiocambio, 0);
    const ahorroMes = gastoMercadoMes - gastoBiocambioMes;
    const ahorroAnual = ahorroMes * 12;
    const ahorroPct = Math.round((ahorroMes / gastoMercadoMes) * 100);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreEncargado.trim() || !nombreEmpresa.trim() || !whatsapp.trim()) return;

        setIsSaving(true);

        const proposal = await createB2BProposal({
            sector: selectedSector.id,
            sectorLabel: selectedSector.title,
            nombreEncargado,
            nombreEmpresa,
            whatsapp,
            email: email || 'sin-correo@empresa.com',
            ciudad,
            habitacionesOEstudiantes: units,
            gastoMercadoMes,
            gastoBiocambioMes,
            ahorroMes,
            ahorroAnual,
            ahorroPct,
            items: calculatedItems
        });

        setIsSaving(false);
        setGeneratedProposal(proposal);
    };

    const handleDownloadPDF = async () => {
        if (!generatedProposal) return;

        // Trazabilidad CRM B2B: Registrar estado 'descargado' en Firestore automáticamente
        if (generatedProposal.id && generatedProposal.status !== 'contactado' && generatedProposal.status !== 'negociacion' && generatedProposal.status !== 'cerrado') {
            try {
                await updateB2BProposalStatus(generatedProposal.id, 'descargado');
                setGeneratedProposal((prev: any) => prev ? { ...prev, status: 'descargado' } : null);
            } catch (err) {
                console.warn('No se pudo actualizar estado a descargado:', err);
            }
        }

        const res = await fetch('/api/b2b/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generatedProposal)
        });
        const html = await res.text();
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    const handleAddToCart = () => {
        // Add recommended items to cart
        calculatedItems.forEach(item => {
            const productObj: any = {
                id: `b2b_${item.nombre.replace(/\s+/g, '_')}`,
                nombre: item.nombre,
                presentaciones: [
                    { size: '20L', price: item.precioBiocambio, precioMercado: item.precioMercado }
                ],
                imgFile: '/images/detergente-bicarbonato.png',
                categoria: 'Industrial B2B'
            };
            addToCart(productObj, '20L', item.precioBiocambio, item.cantidad);
        });

        setIsCartOpen(true);
    };

    const handleOpenWhatsApp = async () => {
        if (!generatedProposal) return;

        // Trazabilidad CRM B2B: Registrar estado 'contactado' en Firestore automáticamente
        if (generatedProposal.id && generatedProposal.status !== 'negociacion' && generatedProposal.status !== 'cerrado') {
            try {
                await updateB2BProposalStatus(generatedProposal.id, 'contactado');
                setGeneratedProposal((prev: any) => prev ? { ...prev, status: 'contactado' } : null);
            } catch (err) {
                console.warn('No se pudo actualizar estado a contactado:', err);
            }
        }

        const msg = `Hola Biocambio360 👋. Represento a *${nombreEmpresa}* (${selectedSector.title} en ${ciudad}). Acabo de generar la cotización *${generatedProposal.code}* en la web con un ahorro de *$${ahorroMes.toLocaleString('es-CO')}/mes*. Deseo acordar la entrega de nuestra primera orden corporativa.`;
        window.open(`https://wa.me/573241005353?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            <div>
                <HeaderMessage />
                <Header />

                {/* Hero Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white py-12 px-4 sm:px-6 relative overflow-hidden border-b border-teal-800/40">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0D9488_1px,transparent_1px)] [background-size:16px_16px]" />

                    <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3 flex flex-col items-center justify-center">
                        <span className="bg-teal-500/20 text-teal-300 font-extrabold text-xs px-4 py-1.5 rounded-full border border-teal-500/30 uppercase tracking-widest inline-flex items-center gap-1.5">
                            <Factory size={14} />
                            FÁBRICA DIRECTA BOGOTÁ & CUNDINAMARCA
                        </span>
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
                            Cotizador Expreso B2B & Simulador de Ahorro
                        </h1>
                        <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto">
                            Calcula en 1 minuto el costo de tus insumos de aseo comprando directo a nuestra fábrica en Soacha. Ahorros reales comprobados entre <strong>34% y 38%</strong> vs marcas comerciales.
                        </p>
                    </div>
                </div>

                {/* Main Funnel Wizard */}
                <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10">
                    {/* STEP 1: Sector Selector */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">1</span>
                            <h2 className="text-lg font-black text-gray-900">Selecciona el Sector de tu Organización</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                            {SECTORS.map((sec) => {
                                const IconComponent = sec.icon;
                                const isSelected = selectedSector.id === sec.id;

                                return (
                                    <button
                                        key={sec.id}
                                        onClick={() => handleSectorSelect(sec)}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                            isSelected
                                                ? 'bg-white border-teal-600 shadow-xl ring-2 ring-teal-500/30'
                                                : 'bg-white/80 border-gray-200 hover:border-gray-300 hover:bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                                <IconComponent size={22} />
                                            </div>
                                            {isSelected && (
                                                <CheckCircle2 size={20} className="text-teal-600" />
                                            )}
                                        </div>
                                        <h3 className="font-bold text-sm text-gray-900 mb-1">{sec.title}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2">{sec.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* STEP 2: Scale Input & Live Savings Card */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">2</span>
                            <h2 className="text-lg font-black text-gray-900">Ajusta la Escala Operativa</h2>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="space-y-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    {selectedSector.defaultUnitsLabel}
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={10000}
                                        value={units}
                                        onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg font-black text-gray-900 focus:border-teal-600 focus:outline-none bg-gray-50"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Ajusta este número para recalcular el volumen de garrafas y el ahorro exacto.
                                </p>
                            </div>

                            {/* Savings Summary Pill */}
                            <div className="md:col-span-2 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wider block">
                                        Ahorro Mensual Estimado Directo de Fábrica
                                    </span>
                                    <div className="text-3xl font-black text-white mt-1">
                                        ${ahorroMes.toLocaleString('es-CO')} <span className="text-sm font-normal text-teal-200">/ mes</span>
                                    </div>
                                    <div className="text-xs text-gray-300 mt-0.5">
                                        Equivale a <strong>${ahorroAnual.toLocaleString('es-CO')} COP al año</strong>
                                    </div>
                                </div>

                                <div className="bg-teal-500/20 border border-teal-400/40 text-teal-300 px-4 py-2.5 rounded-xl font-black text-sm whitespace-nowrap">
                                    -{ahorroPct}% de Descuento
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: Recommended Product Mix Breakdown */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">3</span>
                            <h2 className="text-lg font-black text-gray-900">Mix de Abastecimiento Recomendado</h2>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                                            <th className="p-4">Producto Concentrado</th>
                                            <th className="p-4 text-center">Presentación</th>
                                            <th className="p-4 text-center">Cantidad Est.</th>
                                            <th className="p-4 text-right">Precio Mercado</th>
                                            <th className="p-4 text-right">Precio Fábrica</th>
                                            <th className="p-4 text-right">Ahorro Ítem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {calculatedItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">{item.nombre}</td>
                                                <td className="p-4 text-center text-xs text-gray-600 bg-gray-50 rounded-lg">{item.presentacion}</td>
                                                <td className="p-4 text-center font-bold text-gray-800">{item.cantidad} garrafas</td>
                                                <td className="p-4 text-right text-gray-400 line-through text-xs">${item.subtotalMercado.toLocaleString('es-CO')}</td>
                                                <td className="p-4 text-right font-black text-green-700">${item.subtotalBiocambio.toLocaleString('es-CO')}</td>
                                                <td className="p-4 text-right font-black text-teal-600">${item.ahorroItem.toLocaleString('es-CO')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* STEP 4: Lead Lead Form & Action Buttons */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">4</span>
                            <h2 className="text-lg font-black text-gray-900">Genera tu Cotización PDF o Haz tu Pedido Directo</h2>
                        </div>

                        {!generatedProposal ? (
                            <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Encargado *</label>
                                        <input
                                            type="text"
                                            value={nombreEncargado}
                                            onChange={(e) => setNombreEncargado(e.target.value)}
                                            placeholder="Ej: Ing. Carlos Pérez"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Empresa o Conjunto *</label>
                                        <input
                                            type="text"
                                            value={nombreEmpresa}
                                            onChange={(e) => setNombreEmpresa(e.target.value)}
                                            placeholder="Ej: Conjunto Residencial Hayuelos / Restaurante"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número de WhatsApp *</label>
                                        <input
                                            type="text"
                                            value={whatsapp}
                                            onChange={(e) => setWhatsapp(e.target.value)}
                                            placeholder="Ej: 3001234567"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico (Opcional)</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Ej: compras@empresa.com"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad / Municipio</label>
                                        <input
                                            type="text"
                                            value={ciudad}
                                            onChange={(e) => setCiudad(e.target.value)}
                                            placeholder="Ej: Soacha, Bogotá, Mosquera, Chía"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-gradient-to-r from-teal-600 to-slate-900 hover:opacity-95 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                                >
                                    {isSaving ? 'GENERANDO COTIZACIÓN OFICIAL...' : '📄 GENERAR COTIZACIÓN OFICIAL CON MEMBRETE'}
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        ) : (
                            /* Generated Proposal Action Panel */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 text-center"
                            >
                                <div className="inline-flex items-center justify-center p-3 bg-teal-600 text-white rounded-2xl shadow-md">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                                        ¡Cotización {generatedProposal.code} Generada Exitosamente!
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto mt-1">
                                        Se ha registrado la propuesta formal para <strong>{generatedProposal.nombreEmpresa}</strong> con tarifa garantizada de fábrica por 30 días.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FileText size={18} />
                                        DESCARGAR PDF CON MEMBRETE
                                    </button>

                                    <button
                                        onClick={handleAddToCart}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShoppingCart size={18} />
                                        COMPRAR ONLINE AHORA
                                    </button>

                                    <button
                                        onClick={handleOpenWhatsApp}
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <MessageCircle size={18} />
                                        CONTACTAR ASESOR WHATSAPP
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
