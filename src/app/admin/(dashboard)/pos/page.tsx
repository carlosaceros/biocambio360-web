'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    DollarSign,
    CreditCard,
    Smartphone,
    UserCheck,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Printer,
    RefreshCw,
    Layers,
    Truck,
    Lock,
    Unlock,
    Receipt,
    X,
    AlertTriangle,
    Wifi,
    WifiOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PRODUCTOS, Product, ProductSize, isDisallowedSize } from '@/lib/products';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    PosItem,
    PosPaymentMethod,
    PosSale,
    PosCashRegisterSession
} from '@/types/pos';
import {
    createPosSale,
    getPosSales,
    getActiveCashRegisterSession,
    openCashRegister,
    closeCashRegister,
    requestWarehouseTransfer,
    getOfflinePendingSales,
    syncOfflinePosSales
} from '@/lib/pos-service';
import { useAuth } from '@/lib/auth-context';

const ADVISORS = ['Karen', 'Katherine', 'Andrea', 'Diego', 'Laura', 'Camilo'];

export default function PosPage() {
    const router = useRouter();
    const { user } = useAuth();

    // Catalog & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0);

    // Cart / Ticket
    const [cartItems, setCartItems] = useState<PosItem[]>([]);
    const [selectedAdvisor, setSelectedAdvisor] = useState<string>('Karen');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerCedula, setCustomerCedula] = useState('');
    const [discountAmount, setDiscountAmount] = useState<number>(0);

    // Payment Modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('efectivo');
    const [cashTendered, setCashTendered] = useState<number>(0);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<PosSale | null>(null);

    // Cash Register Session
    const [cashSession, setCashSession] = useState<PosCashRegisterSession | null>(null);
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);
    const [initialCashBase, setInitialCashBase] = useState<number>(150000);
    const [countedCash, setCountedCash] = useState<number>(0);

    // History / Transfer tabs
    const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'transfer'>('pos');
    const [historySales, setHistorySales] = useState<PosSale[]>([]);
    const [transferQty, setTransferQty] = useState<number>(10);
    const [transferNotes, setTransferNotes] = useState('');
    const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);

    // Network & Offline resilience
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    useEffect(() => {
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        setPendingOfflineCount(getOfflinePendingSales().length);

        const handleOnline = async () => {
            setIsOnline(true);
            await handleSyncOffline();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        loadSession();
        loadHistory();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSyncOffline = async () => {
        setIsSyncing(true);
        try {
            const res = await syncOfflinePosSales();
            setPendingOfflineCount(getOfflinePendingSales().length);
            if (res.synced > 0) {
                alert(`✅ Conexión recuperada: ${res.synced} venta(s) guardada(s) offline se sincronizaron con éxito en la nube.`);
                loadHistory();
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const loadSession = async () => {
        const session = await getActiveCashRegisterSession(user?.uid);
        setCashSession(session);
    };

    const loadHistory = async () => {
        const sales = await getPosSales(20);
        setHistorySales(sales);
    };

    // Filter categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        PRODUCTOS.forEach((p: Product) => {
            if (p.categoria) cats.add(p.categoria);
        });
        return ['all', ...Array.from(cats)];
    }, []);

    // Filter products
    const filteredProducts = useMemo(() => {
        return PRODUCTOS.filter((p: Product) => {
            const matchesSearch =
                p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCat = selectedCategory === 'all' || p.categoria === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [searchQuery, selectedCategory]);

    // Cart calculations
    const subtotal = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    }, [cartItems]);

    const total = useMemo(() => {
        return Math.max(0, subtotal - discountAmount);
    }, [subtotal, discountAmount]);

    const changeDue = useMemo(() => {
        if (paymentMethod !== 'efectivo') return 0;
        return Math.max(0, cashTendered - total);
    }, [cashTendered, total, paymentMethod]);

    // Add product to cart
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const existingIdx = cartItems.findIndex(
            item => item.productId === product.id && item.size === size
        );

        if (existingIdx >= 0) {
            const updated = [...cartItems];
            updated[existingIdx].cantidad += 1;
            updated[existingIdx].subtotal = updated[existingIdx].cantidad * updated[existingIdx].price;
            setCartItems(updated);
        } else {
            const newItem: PosItem = {
                productId: product.id,
                nombre: product.nombre,
                size: size,
                cantidad: 1,
                price: price,
                subtotal: price,
                imgFile: product.imgFile,
            };
            setCartItems([...cartItems, newItem]);
        }
    };

    const updateQuantity = (index: number, delta: number) => {
        const updated = [...cartItems];
        const newQty = updated[index].cantidad + delta;
        if (newQty <= 0) {
            updated.splice(index, 1);
        } else {
            updated[index].cantidad = newQty;
            updated[index].subtotal = newQty * updated[index].price;
        }
        setCartItems(updated);
    };

    // Open Payment Modal
    const handleOpenPayment = () => {
        if (cartItems.length === 0) return;
        setCashTendered(total);
        setIsPaymentModalOpen(true);
    };

    // Complete Sale
    const handleCompleteSale = async () => {
        if (cartItems.length === 0) return;
        setIsProcessingSale(true);
        try {
            const sale = await createPosSale({
                cajeroId: user?.uid || 'pos-soacha',
                cajeroNombre: user?.displayName || 'Cajero Mostrador',
                asesor: selectedAdvisor,
                cliente: customerPhone ? {
                    nombre: customerName || 'Cliente Mostrador',
                    celular: customerPhone,
                    cedula: customerCedula,
                } : undefined,
                items: cartItems,
                subtotal,
                descuento: discountAmount,
                total,
                metodoPago: paymentMethod,
                montoEfectivo: paymentMethod === 'efectivo' ? cashTendered : undefined,
                montoCambio: paymentMethod === 'efectivo' ? changeDue : undefined,
            });

            setLastCompletedSale(sale);
            if (sale.isOffline) {
                setPendingOfflineCount(getOfflinePendingSales().length);
                alert(`💾 Venta registrada en Modo Offline. El ticket #${sale.numeroTicket} quedó almacenado localmente y se sincronizará automáticamente con Firestore al recuperar conexión.`);
            }
            setCartItems([]);
            setDiscountAmount(0);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerCedula('');
            setIsPaymentModalOpen(false);
            loadHistory();
        } catch (error) {
            console.error('Error completando venta:', error);
            alert('Error al registrar la venta en la base de datos.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    // Open Cash Session
    const handleOpenSession = async () => {
        try {
            const sessionId = await openCashRegister(
                user?.uid || 'pos-soacha',
                user?.displayName || 'Cajero Mostrador',
                initialCashBase
            );
            await loadSession();
            setIsCashModalOpen(false);
        } catch (e) {
            console.error('Error abriendo caja:', e);
        }
    };

    // Close Cash Session
    const handleCloseSession = async () => {
        if (!cashSession) return;
        try {
            await closeCashRegister(cashSession.id, countedCash);
            await loadSession();
            setIsCashModalOpen(false);
            alert('Caja cerrada con éxito. El reporte fue registrado para auditoría contable.');
        } catch (e) {
            console.error('Error cerrando caja:', e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-400/30 rounded-xl flex items-center justify-center text-emerald-400">
                                <Store size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                                    Punto de Venta (TPV Mostrador Soacha)
                                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">En Vivo</span>
                                </h1>
                                <p className="text-[11px] text-slate-400">Cra. 7C #44-17 Sur · Terminal de Despacho Inmediato</p>
                            </div>
                        </div>
                    </div>

                    {/* Estado de Caja & Pestañas */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Indicador de Conexión & Modo Offline */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isOnline
                                ? pendingOfflineCount > 0
                                    ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-red-950/80 border-red-500/60 text-red-300 animate-pulse'
                        }`}>
                            {isOnline ? (
                                pendingOfflineCount > 0 ? (
                                    <button
                                        onClick={handleSyncOffline}
                                        disabled={isSyncing}
                                        className="flex items-center gap-1.5 hover:underline cursor-pointer"
                                        title="Haz clic para sincronizar las ventas guardadas localmente"
                                    >
                                        <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                        <span>{isSyncing ? 'Sincronizando...' : `${pendingOfflineCount} offline pendientes (Sincronizar)`}</span>
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Wifi size={14} className="text-emerald-400" />
                                        <span>En Línea (Nube)</span>
                                    </span>
                                )
                            ) : (
                                <span className="flex items-center gap-1.5" title="La red falló pero el POS sigue funcionando localmente">
                                    <WifiOff size={14} />
                                    <span>Modo Offline ({pendingOfflineCount} locales)</span>
                                </span>
                            )}
                        </div>

                        {/* Indicador de Turno de Caja */}
                        <button
                            onClick={() => setIsCashModalOpen(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                cashSession
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                            }`}
                        >
                            {cashSession ? <Unlock size={14} /> : <Lock size={14} />}
                            <span>{cashSession ? 'Caja Abierta' : 'Caja Cerrada (Abrir)'}</span>
                        </button>

                        <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
                            <button
                                onClick={() => setActiveTab('pos')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    activeTab === 'pos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Mostrador
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Tickets de Hoy
                            </button>
                            <button
                                onClick={() => setActiveTab('transfer')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    activeTab === 'transfer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Traslados Bodega
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* VISTA PRINCIPAL: MOSTRADOR TPV */}
            {activeTab === 'pos' && (
                <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* COLUMNA IZQUIERDA: CATÁLOGO Y BUSCADOR (7 columnas) */}
                    <div className="lg:col-span-7 flex flex-col space-y-3">
                        {/* Buscador y Categorías */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o escanear código de barras..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                />
                            </div>

                            {/* Categorías */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                                            selectedCategory === cat
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {cat === 'all' ? 'Todos' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid de Productos */}
                        <div className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs overflow-y-auto max-h-[calc(100vh-250px)]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {filteredProducts.map(p => (
                                    <div
                                        key={p.id}
                                        className="border border-slate-200 rounded-xl p-2.5 hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between bg-slate-50/50"
                                    >
                                        <div>
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block truncate">
                                                {p.categoria || 'Aseo'}
                                            </span>
                                            <h3 className="font-bold text-slate-900 text-xs mt-0.5 line-clamp-2">
                                                {p.nombre}
                                            </h3>
                                        </div>

                                        {/* Selector de Presentación y Botón Añadir */}
                                        <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(p.precios || {})
                                                    .filter(([sizeKey]) => !isDisallowedSize(sizeKey))
                                                    .map(([sizeKey, sizePrice]) => (
                                                        <button
                                                            key={sizeKey}
                                                            onClick={() => handleAddToCart(p, sizeKey, Number(sizePrice))}
                                                            className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 rounded-lg text-[10px] font-black transition-colors flex items-center gap-1 cursor-pointer"
                                                            title={`Añadir ${sizeKey} (${formatCurrency(Number(sizePrice))})`}
                                                        >
                                                            <span>{sizeKey}</span>
                                                            <span className="opacity-70">${Math.round(Number(sizePrice) / 1000)}k</span>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: TICKET Y COBRO (5 columnas) */}
                    <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-[calc(100vh-120px)] sticky top-20">
                        <div className="flex flex-col space-y-3 overflow-hidden">
                            {/* Cabecera del Ticket */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                                        <Receipt size={16} className="text-indigo-600" />
                                        Ticket de Venta
                                    </h2>
                                    <span className="text-[10px] text-slate-400">
                                        {cartItems.length} ítem(s) en orden
                                    </span>
                                </div>

                                {/* Asesor */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400">Asesor:</span>
                                    <select
                                        value={selectedAdvisor}
                                        onChange={(e) => setSelectedAdvisor(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                                    >
                                        {ADVISORS.map(adv => (
                                            <option key={adv} value={adv}>{adv}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Datos rápidos del cliente */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                                <input
                                    type="text"
                                    placeholder="Nombre cliente..."
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                                />
                                <input
                                    type="text"
                                    placeholder="Celular (10 dígitos)..."
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                                />
                            </div>

                            {/* Lista de Ítems en el Carrito */}
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
                                {cartItems.map((item, idx) => (
                                    <div
                                        key={`${item.productId}-${item.size}`}
                                        className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex-1 pr-2">
                                            <p className="font-bold text-slate-900 truncate">{item.nombre}</p>
                                            <p className="text-[10px] text-slate-500 font-semibold">{item.size} · {formatCurrency(item.price)}/un</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                                                <button
                                                    onClick={() => updateQuantity(idx, -1)}
                                                    className="p-1 text-slate-400 hover:text-slate-700"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="px-2 font-bold text-xs">{item.cantidad}</span>
                                                <button
                                                    onClick={() => updateQuantity(idx, 1)}
                                                    className="p-1 text-slate-400 hover:text-slate-700"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <span className="font-black text-slate-900 w-16 text-right">
                                                {formatCurrency(item.subtotal)}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {cartItems.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 text-xs italic">
                                        Selecciona productos a la izquierda para armar el ticket.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Totales y Botón de Cobro */}
                        <div className="pt-3 border-t border-slate-200 space-y-2.5">
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Descuento Especial</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={discountAmount || ''}
                                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                        placeholder="$0"
                                        className="w-20 text-right px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                                    <span>TOTAL A PAGAR</span>
                                    <span className="text-xl text-indigo-700">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleOpenPayment}
                                disabled={cartItems.length === 0}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <DollarSign size={18} />
                                <span>Cobrar Ticket {total > 0 && `(${formatCurrency(total)})`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 2: HISTORIAL DE TICKETS */}
            {activeTab === 'history' && (
                <div className="flex-1 max-w-7xl w-full mx-auto p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                        <h2 className="font-black text-base text-slate-900 mb-4">Tickets Recientes de Mostrador</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="py-2.5">Ticket #</th>
                                        <th className="py-2.5">Asesor</th>
                                        <th className="py-2.5">Cliente</th>
                                        <th className="py-2.5">Productos</th>
                                        <th className="py-2.5">Método Pago</th>
                                        <th className="py-2.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {historySales.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="py-3 font-mono font-bold text-indigo-600">{s.numeroTicket}</td>
                                            <td className="py-3 font-bold">{s.asesor || 'General'}</td>
                                            <td className="py-3">{s.cliente?.nombre || 'Mostrador'} ({s.cliente?.celular || 'S/N'})</td>
                                            <td className="py-3">{s.items?.length || 0} producto(s)</td>
                                            <td className="py-3 uppercase font-bold text-[10px] text-slate-500">{s.metodoPago}</td>
                                            <td className="py-3 text-right font-black text-slate-900">{formatCurrency(s.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 3: TRASLADOS DE BODEGA */}
            {activeTab === 'transfer' && (
                <div className="flex-1 max-w-4xl w-full mx-auto p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-black text-base text-slate-900">Solicitar Traslado de Bodega Fábrica a Mostrador</h2>
                        </div>
                        <p className="text-xs text-slate-500">
                            Genera una remisión de reposición inmediata para el equipo logístico de bodega.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Producto Requerido</label>
                                <select
                                    onChange={(e) => setSelectedProduct(PRODUCTOS.find(p => p.id === e.target.value) || null)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    {PRODUCTOS.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Cantidad de Garrafas / Unidades</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={transferQty}
                                    onChange={(e) => setTransferQty(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Observaciones</label>
                            <input
                                type="text"
                                placeholder="Ej: Urgente para quincena, lote específico..."
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                            />
                        </div>

                        <button
                            onClick={async () => {
                                setIsTransferSubmitting(true);
                                try {
                                    const prod = selectedProduct || PRODUCTOS[0];
                                    await requestWarehouseTransfer({
                                        solicitadoPor: user?.displayName || 'Cajero Mostrador',
                                        items: [{
                                            productId: prod.id,
                                            nombre: prod.nombre,
                                            size: Object.keys(prod.precios || {})[0] || '20L',
                                            cantidadSolicitada: transferQty,
                                        }],
                                        notas: transferNotes,
                                    });
                                    alert('¡Solicitud de traslado enviada a bodega con éxito!');
                                    setTransferNotes('');
                                    setActiveTab('pos');
                                } finally {
                                    setIsTransferSubmitting(false);
                                }
                            }}
                            disabled={isTransferSubmitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                            {isTransferSubmitting ? 'Enviando...' : 'Generar Solicitud de Traslado'}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DE PAGO (EFECTIVO / DATAFONO / NEQUI) */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="font-black text-base text-slate-900">Completar Cobro Mostrador</h3>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="text-center py-2 bg-slate-50 rounded-xl">
                                <span className="text-xs font-bold text-slate-500 uppercase">Monto a Cobrar</span>
                                <p className="text-3xl font-black text-indigo-700 mt-0.5">{formatCurrency(total)}</p>
                            </div>

                            {/* Selector de Medios de Pago */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
                                    { id: 'datafono', label: 'Datáfono', icon: CreditCard },
                                    { id: 'nequi', label: 'Nequi / QR', icon: Smartphone },
                                ].map(m => {
                                    const Icon = m.icon;
                                    const isSel = paymentMethod === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setPaymentMethod(m.id as PosPaymentMethod)}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                                                isSel
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span>{m.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Calculadora de Cambio para Efectivo */}
                            {paymentMethod === 'efectivo' && (
                                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-emerald-900">Efectivo Recibido:</span>
                                        <input
                                            type="number"
                                            step="1000"
                                            value={cashTendered}
                                            onChange={(e) => setCashTendered(Number(e.target.value))}
                                            className="w-32 text-right px-2 py-1 bg-white border border-emerald-300 rounded-lg font-black text-sm text-emerald-900 focus:outline-hidden"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60">
                                        <span className="font-bold text-emerald-900">Cambio / Vueltas:</span>
                                        <span className="text-lg font-black text-emerald-700">{formatCurrency(changeDue)}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCompleteSale}
                                disabled={isProcessingSale || (paymentMethod === 'efectivo' && cashTendered < total)}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                <span>{isProcessingSale ? 'Guardando Venta...' : 'Finalizar Venta & Imprimir'}</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL DE ARQUEO / APERTURA / CIERRE DE CAJA */}
            <AnimatePresence>
                {isCashModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="font-black text-base text-slate-900">
                                    {cashSession ? 'Cierre de Turno & Arqueo Ciego' : 'Apertura de Caja Mostrador'}
                                </h3>
                                <button onClick={() => setIsCashModalOpen(false)} className="p-1 text-slate-400">
                                    <X size={18} />
                                </button>
                            </div>

                            {!cashSession ? (
                                <div className="space-y-3 text-xs">
                                    <p className="text-slate-500">Ingresa la base de efectivo inicial en caja para iniciar el turno.</p>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Base Inicial en Efectivo (COP)</label>
                                        <input
                                            type="number"
                                            step="10000"
                                            value={initialCashBase}
                                            onChange={(e) => setInitialCashBase(Number(e.target.value))}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handleOpenSession}
                                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl"
                                    >
                                        Abrir Turno de Caja
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 text-xs">
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-900">
                                        <p className="font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> Arqueo a Ciegas (Auditoría)
                                        </p>
                                        <p className="text-[11px] mt-1 text-amber-800">
                                            Cuenta el dinero físico que hay en el cajón y digita el valor total exacto. El sistema comparará contra las ventas registradas.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Efectivo Físico Contado</label>
                                        <input
                                            type="number"
                                            step="1000"
                                            value={countedCash}
                                            onChange={(e) => setCountedCash(Number(e.target.value))}
                                            placeholder="$0"
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-base text-slate-900"
                                        />
                                    </div>

                                    <button
                                        onClick={handleCloseSession}
                                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                                    >
                                        Cerrar Turno y Enviar Arqueo
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
