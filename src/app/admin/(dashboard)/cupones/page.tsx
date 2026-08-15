'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Ticket, 
    Plus, 
    Trash2, 
    Edit, 
    CheckCircle2, 
    XCircle, 
    Calendar, 
    Sparkles, 
    RefreshCw, 
    DollarSign, 
    Users, 
    ShieldCheck, 
    Sliders,
    Award
} from 'lucide-react';
import { 
    Coupon, 
    CouponType, 
    WheelConfig, 
    WheelSegment 
} from '@/lib/coupon-types';
import { 
    getAllCoupons, 
    saveCoupon, 
    deleteCoupon, 
    getWheelConfig, 
    saveWheelConfig 
} from '@/lib/coupons-service';
import { formatCurrency } from '@/lib/products';

export default function AdminCouponsPage() {
    const [activeTab, setActiveTab] = useState<'coupons' | 'wheel'>('coupons');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state for creating/editing coupon
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form states
    const [formCode, setFormCode] = useState('');
    const [formType, setFormType] = useState<CouponType>('percentage');
    const [formValue, setFormValue] = useState(10);
    const [formMinSubtotal, setFormMinSubtotal] = useState(30000);
    const [formMaxDiscount, setFormMaxDiscount] = useState<number | undefined>(30000);
    const [formValidFrom, setFormValidFrom] = useState(new Date().toISOString().split('T')[0]);
    const [formValidUntil, setFormValidUntil] = useState('2026-12-31');
    const [formMaxTotal, setFormMaxTotal] = useState<number | undefined>(500);
    const [formMaxPerUser, setFormMaxPerUser] = useState<number>(1);
    const [formFirstPurchase, setFormFirstPurchase] = useState(false);
    const [formIsActive, setFormIsActive] = useState(true);

    // Wheel configuration state
    const [wheelConfig, setWheelConfig] = useState<WheelConfig | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const list = await getAllCoupons();
            setCoupons(list);
            const wConf = await getWheelConfig();
            setWheelConfig(wConf);
        } catch (e) {
            console.error('Error al cargar cupones:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreateModal = () => {
        setEditingCoupon(null);
        setFormCode('');
        setFormType('percentage');
        setFormValue(10);
        setFormMinSubtotal(30000);
        setFormMaxDiscount(30000);
        setFormValidFrom(new Date().toISOString().split('T')[0]);
        setFormValidUntil('2026-12-31');
        setFormMaxTotal(500);
        setFormMaxPerUser(1);
        setFormFirstPurchase(false);
        setFormIsActive(true);
        setIsModalOpen(true);
    };

    const openEditModal = (c: Coupon) => {
        setEditingCoupon(c);
        setFormCode(c.code);
        setFormType(c.type);
        setFormValue(c.value);
        setFormMinSubtotal(c.minSubtotal || 0);
        setFormMaxDiscount(c.maxDiscountAmount);
        setFormValidFrom(c.validFrom ? c.validFrom.split('T')[0] : new Date().toISOString().split('T')[0]);
        setFormValidUntil(c.validUntil ? c.validUntil.split('T')[0] : '2026-12-31');
        setFormMaxTotal(c.maxRedemptionsTotal);
        setFormMaxPerUser(c.maxRedemptionsPerUser || 1);
        setFormFirstPurchase(!!c.firstPurchaseOnly);
        setFormIsActive(c.isActive);
        setIsModalOpen(true);
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCode.trim()) return alert('El código de cupón es requerido');

        setSaving(true);
        try {
            const couponToSave: Coupon = {
                id: editingCoupon ? editingCoupon.id : `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                code: formCode.trim().toUpperCase(),
                type: formType,
                value: Number(formValue),
                minSubtotal: Number(formMinSubtotal),
                maxDiscountAmount: formMaxDiscount ? Number(formMaxDiscount) : undefined,
                validFrom: new Date(formValidFrom).toISOString(),
                validUntil: new Date(`${formValidUntil}T23:59:59.000Z`).toISOString(),
                maxRedemptionsTotal: formMaxTotal ? Number(formMaxTotal) : undefined,
                redemptionsCount: editingCoupon ? editingCoupon.redemptionsCount : 0,
                maxRedemptionsPerUser: Number(formMaxPerUser),
                firstPurchaseOnly: formFirstPurchase,
                isActive: formIsActive,
                usageHistory: editingCoupon?.usageHistory || []
            };

            await saveCoupon(couponToSave);
            alert(`Cupón ${couponToSave.code} guardado exitosamente`);
            setIsModalOpen(false);
            await loadData();
        } catch (err: any) {
            alert('Error al guardar cupón: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (c: Coupon) => {
        try {
            await saveCoupon({ ...c, isActive: !c.isActive });
            await loadData();
        } catch (e) {
            console.error('Error al cambiar estado:', e);
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`¿Deseas eliminar permanentemente el cupón ${code}?`)) return;
        try {
            await deleteCoupon(id);
            await loadData();
        } catch (e) {
            alert('Error al eliminar cupón');
        }
    };

    const handleSaveWheel = async () => {
        if (!wheelConfig) return;
        setSaving(true);
        try {
            await saveWheelConfig(wheelConfig);
            alert('¡Configuración de la Ruleta guardada con éxito!');
        } catch (e) {
            alert('Error al guardar ruleta');
        } finally {
            setSaving(false);
        }
    };

    // Calculate overall metrics
    const totalActive = coupons.filter(c => c.isActive).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptionsCount || 0), 0);
    const totalDiscountAmount = coupons.reduce((sum, c) => {
        const usages = c.usageHistory || [];
        return sum + usages.reduce((uSum, u) => uSum + (u.discountAmount || 0), 0);
    }, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-700 p-2 rounded-xl">
                                <Ticket size={24} />
                            </span>
                            <h1 className="text-2xl font-black text-gray-900">Gestor de Cupones & Ruleta 2026</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Administra promociones, reglas comerciales (1ra compra, monto mínimo), vigencias y la Ruleta de Descuentos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                            title="Recargar datos"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition-all text-sm"
                        >
                            <Plus size={18} />
                            Crear Nuevo Cupón
                        </button>
                    </div>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Ticket size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Cupones Activos</p>
                            <p className="text-2xl font-black text-gray-900">{totalActive} / {coupons.length}</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Redenciones Totales</p>
                            <p className="text-2xl font-black text-gray-900">{totalRedemptions} pedidos</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Descuento Otorgado</p>
                            <p className="text-2xl font-black text-purple-700">{formatCurrency(totalDiscountAmount)}</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Ruleta Spin-to-Win</p>
                            <p className="text-2xl font-black text-gray-900">{wheelConfig?.isActive ? '🟢 Activa' : '🔴 Inactiva'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 space-x-4">
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`pb-3 font-extrabold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'coupons'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Ticket size={18} />
                        Listado de Cupones ({coupons.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('wheel')}
                        className={`pb-3 font-extrabold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'wheel'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Sparkles size={18} />
                        Ruleta de Descuentos (Spin-to-Win)
                    </button>
                </div>

                {/* TAB 1: Coupons Table */}
                {activeTab === 'coupons' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="p-4">Código / Tipo</th>
                                        <th className="p-4">Beneficio</th>
                                        <th className="p-4">Requisitos & Reglas</th>
                                        <th className="p-4">Vigencia</th>
                                        <th className="p-4 text-center">Usos / Límite</th>
                                        <th className="p-4 text-center">Estado</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {coupons.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-400">
                                                No hay cupones registrados. Da clic en "Crear Nuevo Cupón".
                                            </td>
                                        </tr>
                                    ) : (
                                        coupons.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-4 font-mono font-black text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg text-sm border border-gray-200">
                                                            {c.code}
                                                        </span>
                                                        {c.firstPurchaseOnly && (
                                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                                                                1ra Compra
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-900">
                                                    {c.type === 'percentage' && `${c.value}% OFF`}
                                                    {c.type === 'fixed_amount' && `${formatCurrency(c.value)} OFF`}
                                                    {c.type === 'free_shipping' && '🚚 Envío Gratis'}
                                                    {c.type === 'buy_x_get_y' && '🎁 Combo Especial'}
                                                    {c.maxDiscountAmount && (
                                                        <span className="block text-xs font-normal text-gray-500">
                                                            Máx: {formatCurrency(c.maxDiscountAmount)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs text-gray-600 space-y-0.5">
                                                    <div>Mínimo: <strong>{c.minSubtotal ? formatCurrency(c.minSubtotal) : 'Sin mínimo'}</strong></div>
                                                    <div>Límite/usuario: <strong>{c.maxRedemptionsPerUser || 1} vez</strong></div>
                                                </td>
                                                <td className="p-4 text-xs text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={13} className="text-gray-400" />
                                                        Hasta {c.validUntil ? new Date(c.validUntil).toLocaleDateString('es-CO') : 'Sin fecha'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-bold text-gray-800">
                                                    {c.redemptionsCount || 0} / {c.maxRedemptionsTotal || '∞'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(c)}
                                                        className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                                                            c.isActive
                                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {c.isActive ? '🟢 Activo' : '⚪ Inactivo'}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(c)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c.id, c.code)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: Wheel Configuration */}
                {activeTab === 'wheel' && wheelConfig && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <Sparkles className="text-amber-500" size={20} />
                                    Configurador de Ruleta de Descuentos (Spin-to-Win)
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Esta ventana emergente física permite capturar prospectos y regalar cupones configurados.
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className="text-sm font-bold text-gray-700">Estado de la Ruleta:</span>
                                <input
                                    type="checkbox"
                                    checked={wheelConfig.isActive}
                                    onChange={(e) => setWheelConfig({ ...wheelConfig, isActive: e.target.checked })}
                                    className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Título del Pop-up</label>
                                <input
                                    type="text"
                                    value={wheelConfig.title}
                                    onChange={(e) => setWheelConfig({ ...wheelConfig, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción corta</label>
                                <input
                                    type="text"
                                    value={wheelConfig.description}
                                    onChange={(e) => setWheelConfig({ ...wheelConfig, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Segments configuration */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Segmentos de la Ruleta (Premios)</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {wheelConfig.segments.map((seg, idx) => (
                                    <div key={seg.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-gray-600">Segmento #{idx + 1}</span>
                                            <input
                                                type="color"
                                                value={seg.color}
                                                onChange={(e) => {
                                                    const newSegs = [...wheelConfig.segments];
                                                    newSegs[idx].color = e.target.value;
                                                    setWheelConfig({ ...wheelConfig, segments: newSegs });
                                                }}
                                                className="w-8 h-8 rounded border-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600">Etiqueta Visible</label>
                                                <input
                                                    type="text"
                                                    value={seg.label}
                                                    onChange={(e) => {
                                                        const newSegs = [...wheelConfig.segments];
                                                        newSegs[idx].label = e.target.value;
                                                        setWheelConfig({ ...wheelConfig, segments: newSegs });
                                                    }}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600">Código Cupón Ganador</label>
                                                <input
                                                    type="text"
                                                    value={seg.couponCode}
                                                    onChange={(e) => {
                                                        const newSegs = [...wheelConfig.segments];
                                                        newSegs[idx].couponCode = e.target.value.toUpperCase();
                                                        setWheelConfig({ ...wheelConfig, segments: newSegs });
                                                    }}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white uppercase font-mono font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end border-t pt-4">
                            <button
                                onClick={handleSaveWheel}
                                disabled={saving}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Configuración de Ruleta'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal para Crear / Editar Cupón */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                            onClick={() => setIsModalOpen(false)}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <Ticket className="text-red-600" size={22} />
                                {editingCoupon ? `Editar Cupón: ${editingCoupon.code}` : 'Crear Nuevo Cupón Promocional'}
                            </h2>

                            <form onSubmit={handleSaveCoupon} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Código del Cupón *</label>
                                        <input
                                            type="text"
                                            value={formCode}
                                            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                            placeholder="EJ: BIENVENIDO2026"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 uppercase font-mono font-bold text-sm focus:border-red-600 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Descuento *</label>
                                        <select
                                            value={formType}
                                            onChange={(e) => setFormType(e.target.value as CouponType)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none bg-white"
                                        >
                                            <option value="percentage">Porcentaje (% OFF)</option>
                                            <option value="fixed_amount">Monto Fijo ($ COP OFF)</option>
                                            <option value="free_shipping">Envío GRATIS</option>
                                            <option value="buy_x_get_y">Combo / Descuento Especial</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Valor del Beneficio *</label>
                                        <input
                                            type="number"
                                            value={formValue}
                                            onChange={(e) => setFormValue(Number(e.target.value))}
                                            placeholder="Ej: 10 para 10% o 5000 para $5.000"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Subtotal Mínimo Requerido ($ COP)</label>
                                        <input
                                            type="number"
                                            value={formMinSubtotal}
                                            onChange={(e) => setFormMinSubtotal(Number(e.target.value))}
                                            placeholder="Ej: 30000"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Tope Máximo de Descuento ($ COP)</label>
                                        <input
                                            type="number"
                                            value={formMaxDiscount || ''}
                                            onChange={(e) => setFormMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                                            placeholder="Ej: 40000 (dejar vacío si no aplica)"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Límite Global de Usos</label>
                                        <input
                                            type="number"
                                            value={formMaxTotal || ''}
                                            onChange={(e) => setFormMaxTotal(e.target.value ? Number(e.target.value) : undefined)}
                                            placeholder="Ej: 500 (vacío para ilimitado)"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Válido Desde</label>
                                        <input
                                            type="date"
                                            value={formValidFrom}
                                            onChange={(e) => setFormValidFrom(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Válido Hasta</label>
                                        <input
                                            type="date"
                                            value={formValidUntil}
                                            onChange={(e) => setFormValidUntil(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formFirstPurchase}
                                            onChange={(e) => setFormFirstPurchase(e.target.checked)}
                                            className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                                        />
                                        <span className="text-sm font-bold text-gray-800">
                                            🔒 Exclusivo para la Primera Compra del Cliente (Valida 0 pedidos previos)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsActive}
                                            onChange={(e) => setFormIsActive(e.target.checked)}
                                            className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                                        />
                                        <span className="text-sm font-bold text-gray-800">
                                            🟢 Cupón Activo
                                        </span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
                                    >
                                        {saving ? 'Guardando...' : 'Guardar Cupón'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
