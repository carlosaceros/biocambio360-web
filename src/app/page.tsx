'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  ArrowDown, 
  Menu, 
  X, 
  LayoutGrid, 
  Search,
  Home as HomeIcon,
  Key,
  Coffee,
  Briefcase,
  Car,
  ChevronDown,
  Utensils,
  Shirt,
  Grid,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Droplets,
  Package,
  Building2
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useDeferredValue, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import FAQSection from '@/components/FAQSection';
import FactoryTrustSection from '@/components/FactoryTrustSection';
import SoachaLocationCard from '@/components/SoachaLocationCard';
import FomoTopBanner from '@/components/FomoTopBanner';
import KitsSection from '@/components/KitsSection';
import Toast from '@/components/Toast';
import HeaderMessage from '@/components/HeaderMessage';
import ComboBuilder from '@/components/ComboBuilder';
import SidebarMenu from '@/components/SidebarMenu';
import ProductQuickView from '@/components/ProductQuickView';
import { Product, ProductSize } from '@/lib/products';
import { PRODUCTOS } from '@/lib/products-data';
import { useCart } from '@/lib/cart-context';
import { getProductAffinities } from '@/lib/product-utils';
import { getAllProducts } from '@/lib/products-service';

// Helper to determine if a product is a bundle/combo/kit
const isComboOrKit = (p: Product) => {
  const cat = (p.categoria || '').toLowerCase();
  const sub = (p.subcategoria || '').toLowerCase();
  const id = (p.id || '').toLowerCase();
  const nombre = (p.nombre || '').toLowerCase();
  return (
    cat.includes('kit') ||
    cat.includes('combo') ||
    sub.includes('kit') ||
    sub.includes('combo') ||
    id.startsWith('kit-') ||
    id.startsWith('combo-') ||
    nombre.startsWith('kit ') ||
    nombre.startsWith('combo ') ||
    nombre.includes('pack ')
  );
};

function HomeContent() {
  const { addToCart, setIsCartOpen, getTotalItems } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({ name: '', size: '' });
  
  // Dynamic products from Firestore
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    getAllProducts().then(setDbProducts).catch(err => {
      console.error('Error loading products on home page:', err);
    });
  }, []);
  
  // Routing & URL-based filters
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedCategory   = searchParams.get('cat');
  const selectedSubcategory = searchParams.get('sub');
  const selectedSegment    = searchParams.get('seg');
  const selectedSolution   = searchParams.get('sol');
  const searchQuery        = searchParams.get('q') || '';

  // Local state for search input (SEARCH-01: immediate responsive typing without re-mounting input)
  const [inputValue, setInputValue] = useState(searchQuery);
  const deferredQuery = useDeferredValue(inputValue);
  const hasScrolledForQueryRef = useRef(false);

  // Sync local input value when URL changes from external navigation
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // SEARCH-03: Debounced replaceState without router.push/router.replace (preserves input focus)
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (inputValue.trim()) {
            url.searchParams.set('q', inputValue.trim());
          } else {
            url.searchParams.delete('q');
          }
          const targetPath = url.pathname + (url.search ? url.search : '');
          window.history.replaceState(window.history.state, '', targetPath);
        }
      } catch (e) {
        // ignore Safari history replaceState security exceptions
      }
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [inputValue]);

  // Auto-scroll to catalog when user begins typing or searching
  useEffect(() => {
    if (deferredQuery.trim().length >= 2) {
      if (!hasScrolledForQueryRef.current) {
        hasScrolledForQueryRef.current = true;
        const el = document.getElementById('catalogo');
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 250 || rect.top < -100) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    } else {
      hasScrolledForQueryRef.current = false;
    }
  }, [deferredQuery]);

  /**
   * applyFilter — construye una URL limpia con un único filtro activo.
   * Al aplicar un filtro se limpian todos los demás para evitar acumulación.
   */
  const applyFilter = useCallback((type: 'cat' | 'sub' | 'seg' | 'sol' | 'q' | null, value: string | null) => {
    const params = new URLSearchParams();
    if (type && value) params.set(type, value);
    const query = params.toString();
    if (type === 'q') {
      setInputValue(value || '');
      if (value && value.trim()) {
        setTimeout(() => {
          document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    } else {
      setInputValue('');
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setTimeout(() => {
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [router, pathname]);

  // Layout states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Pagination state for optimized initial rendering
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset visibleCount whenever any filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [selectedCategory, selectedSubcategory, selectedSegment, selectedSolution, deferredQuery]);

  // SEARCH-02: Accent-insensitive normalized token matching with deferred value
  const filteredProducts = useMemo(() => {
    let results = dbProducts.length > 0 ? dbProducts : PRODUCTOS;

    const normalizeText = (val?: string | null) =>
      (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Unless selectedCategory explicitly equals 'Kits & Combos', filter OUT Kits from main catalog (unless filtering by Solution, Segment or Search)
    if (selectedCategory !== 'Kits & Combos' && !selectedSolution && !selectedSegment && !deferredQuery.trim()) {
      results = results.filter(p => p.categoria !== 'Kits & Combos');
    }

    if (selectedCategory) {
      results = results.filter(p => p.categoria === selectedCategory);
    }
    if (selectedSubcategory) {
      results = results.filter(p => p.subcategoria === selectedSubcategory);
    }
    if (selectedSegment) {
      results = results.filter(p => {
        const { segments } = getProductAffinities(p);
        return segments.includes(selectedSegment);
      });
    }
    if (selectedSolution) {
      results = results.filter(p => {
        const { solutions } = getProductAffinities(p);
        return solutions.includes(selectedSolution);
      });
    }

    if (deferredQuery.trim()) {
      const tokens = normalizeText(deferredQuery).split(/\s+/).filter(Boolean);
      results = results.filter(p => {
        const searchable = normalizeText(
          `${p.nombre} ${p.shortDescription || ''} ${p.descripcion} ${p.categoria} ${p.subcategoria || ''}`
        );
        return tokens.every(token => searchable.includes(token));
      });
    }

    // Prioritize products that have real images (non-placeholder)
    return [...results].sort((a, b) => {
      const aHasImg = a.imgFile && a.imgFile !== 'placeholder.png';
      const bHasImg = b.imgFile && b.imgFile !== 'placeholder.png';
      if (aHasImg && !bHasImg) return -1;
      if (!aHasImg && bHasImg) return 1;
      return 0;
    });
  }, [dbProducts, selectedCategory, selectedSubcategory, selectedSegment, selectedSolution, deferredQuery]);

  // Is searching state
  const isSearching = Boolean(deferredQuery.trim());

  // Split search results: individual products first, kits & combos below
  const searchIndividualProducts = useMemo(() => {
    if (!isSearching) return [];
    return filteredProducts.filter(p => !isComboOrKit(p));
  }, [filteredProducts, isSearching]);

  const searchComboProducts = useMemo(() => {
    if (!isSearching) return [];
    return filteredProducts.filter(p => isComboOrKit(p));
  }, [filteredProducts, isSearching]);

  // Products to render in the current batch for non-search browsing
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleAddToCart = (product: any, size: string, price: number, cantidad: number) => {
    addToCart(product, size as ProductSize, price, cantidad);
    setToastData({ name: product.nombre, size });
    setShowToast(true);
  };

  const openQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] flex flex-col">
      {/* Toast Notification */}
      <Toast
        show={showToast}
        message="Producto agregado"
        productName={toastData.name}
        size={toastData.size}
        onClose={() => setShowToast(false)}
      />

      {/* Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* Top Banner FOMO Timer */}
      <FomoTopBanner />

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-2xl border-b border-[var(--brand-border)] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 max-w-7xl">
          
          {/* Top Bar for Mobile / Main Brand Area */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2.5 bg-[var(--brand-blue-50)] text-[var(--brand-blue)] rounded-2xl hover:bg-[var(--brand-blue-light)] transition-colors shadow-sm"
                aria-label="Abrir menú"
              >
                <Menu size={22} />
              </motion.button>
              <img src="/images/logo-biocambio360.png" alt="Biocambio360" className="h-9 md:h-12 object-contain" />
            </div>

            {/* Mobile Actions Button */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href="/comunidad"
                className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-2xs"
                title="Gana $10.000 recomendando"
              >
                🎁 $10.000
              </Link>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 text-[var(--brand-gray)] hover:text-[var(--brand-blue)] transition-all bg-white border border-[var(--brand-border)] rounded-2xl shadow-sm"
                aria-label="Ver Carrito"
              >
                <ShoppingCart size={20} />
                <AnimatePresence>
                  {getTotalItems() > 0 && (
                    <motion.span
                      key={getTotalItems()}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 bg-[var(--brand-pink)] text-white text-[10px] font-black min-w-[18px] h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                    >
                      {getTotalItems()}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Search Input — Visible on BOTH Mobile and Desktop */}
          <div className="w-full md:max-w-xs mx-0 md:mx-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Buscar productos (ej. desengrasante)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2 pl-9 pr-8 text-base focus:outline-none focus:border-[var(--brand-blue)] focus:ring-1 focus:ring-[var(--brand-blue)] text-gray-900 transition-all shadow-inner"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              {inputValue && (
                <button 
                  onClick={() => {
                    setInputValue('');
                    const url = new URL(window.location.href);
                    url.searchParams.delete('q');
                    window.history.replaceState(window.history.state, '', url.toString());
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation / Mega Menu Dropdowns */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-gray-700 mx-4">
            {/* Dropdown 1: Soluciones */}
            <div className="relative group py-2">
              <button className="flex items-center gap-1 hover:text-[var(--brand-blue)] transition-colors">
                Soluciones <ChevronDown size={14} />
              </button>
              <div className="absolute top-full left-0 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 w-52 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-50 space-y-1">
                {[
                  { name: 'Cocina', icon: <Utensils size={14} className="text-gray-400" /> },
                  { name: 'Lavandería', icon: <Shirt size={14} className="text-gray-400" /> },
                  { name: 'Desinfección', icon: <ShieldAlert size={14} className="text-gray-400" /> },
                  { name: 'Pisos', icon: <Grid size={14} className="text-gray-400" /> },
                  { name: 'Baños', icon: <Droplets size={14} className="text-gray-400" /> },
                  { name: 'Cuidado Personal', icon: <Sparkles size={14} className="text-gray-400" /> },
                  { name: 'Automotriz', icon: <Car size={14} className="text-gray-400" /> },
                  { name: 'Vidrios y Ventanas', icon: <Sparkles size={14} className="text-gray-400" /> },
                  { name: 'Muebles y Madera', icon: <Package size={14} className="text-gray-400" /> },
                  { name: 'Industrial', icon: <Package size={14} className="text-gray-400" /> }
                ].map(sol => (
                  <button
                    key={sol.name}
                    onClick={() => applyFilter('sol', sol.name)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-gray-50 text-gray-700 hover:text-[var(--brand-blue)] transition-colors"
                  >
                    {sol.icon}
                    {sol.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown 2: Perfiles */}
            <div className="relative group py-2">
              <button className="flex items-center gap-1 hover:text-[var(--brand-blue)] transition-colors">
                Perfiles <ChevronDown size={14} />
              </button>
              <div className="absolute top-full left-0 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 w-52 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-50 space-y-1">
                {[
                  { name: 'Hogar', label: 'Hogar Familiar', icon: <HomeIcon size={14} className="text-gray-400" /> },
                  { name: 'Airbnb', label: 'Airbnb / Rentas', icon: <Key size={14} className="text-gray-400" /> },
                  { name: 'Restaurante', label: 'Restaurantes/Cafés', icon: <Coffee size={14} className="text-gray-400" /> },
                  { name: 'Oficina', label: 'Oficinas/Empresas', icon: <Briefcase size={14} className="text-gray-400" /> }
                ].map(seg => (
                  <button
                    key={seg.name}
                    onClick={() => applyFilter('seg', seg.name)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-gray-50 text-gray-700 hover:text-[var(--brand-blue)] transition-colors"
                  >
                    {seg.icon}
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => document.getElementById('combos')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-[var(--brand-blue)] transition-colors cursor-pointer"
            >
              Combos
            </button>
            <Link
              href="/blog"
              className="hover:text-[var(--brand-blue)] transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/guia-uso-y-mezclas"
              className="hover:text-[var(--brand-pink)] transition-colors text-[var(--brand-pink)] font-black flex items-center gap-1"
            >
              <ShieldCheck size={14} /> Guía & Mezclas
            </Link>
            <Link
              href="/comunidad"
              className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-full transition-all text-xs font-black flex items-center gap-1 shadow-md shadow-purple-600/20 hover:scale-105"
            >
              🎁 Gana $10.000
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCartOpen(true)}
              className="relative p-3 text-[var(--brand-gray)] hover:text-[var(--brand-blue)] transition-all bg-white border border-[var(--brand-border)] rounded-2xl shadow-sm cursor-pointer"
            >
              <ShoppingCart size={22} />
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span
                    key={getTotalItems()}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-[var(--brand-pink)] text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>



      <div className="flex-1 flex flex-col md:flex-row container mx-auto max-w-7xl relative">
        {/* ─── SIDEBAR MENU ─────────────────────────────────── */}
        <SidebarMenu 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          onCategorySelect={(cat) => applyFilter('cat', cat)}
          onSubcategorySelect={(sub) => applyFilter('sub', sub)}
          onSegmentSelect={(seg) => applyFilter('seg', seg)}
          onSolutionSelect={(sol) => applyFilter('sol', sol)}
          activeCategory={selectedCategory}
          activeSubcategory={selectedSubcategory}
          activeSegment={selectedSegment}
          activeSolution={selectedSolution}
        />

        {/* ─── MAIN CONTENT Area ───────────────────────────── */}
        <div className="flex-1 min-w-0 pb-20">
          
          {/* Hero Section - Refined */}
          <div className="p-4 md:p-6">
            <div className="rounded-[2.5rem] relative overflow-hidden bg-[var(--brand-dark)] min-h-[400px] flex flex-col justify-center px-8 md:px-16 py-12">
              {/* Background Design & Video Stream */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105 z-0"
              >
                <source src="/videos/fabrica-biocambio360.mp4" type="video/mp4" />
                <source src="/videos/fabrica-biocambio360.mov" type="video/quicktime" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744]/40 via-[var(--brand-dark)]/60 to-[#0c1221]/70 z-[1]" />
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 bg-[url('/images/logo-biocambio360.png')] bg-no-repeat bg-right-center bg-contain mix-blend-overlay grayscale z-[2]" />
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--brand-blue)]/20 rounded-full blur-[120px] z-[2]" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[var(--brand-pink)]/10 rounded-full blur-[100px] z-[2]" />

              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full mb-8">
                  <span className="w-2 h-2 bg-[var(--brand-success)] rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-black tracking-widest uppercase">
                    Directo de Fábrica · {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-6">
                  CALIDAD <br />
                  <span className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-pink)] bg-clip-text text-transparent italic">QUE RINDE.</span>
                </h1>
                
                <p className="text-white/90 text-2xl md:text-4xl lg:text-5xl font-semibold mb-10 max-w-2xl leading-tight">
                  Soluciones de limpieza profesional fabricadas en Colombia. Concentrados para durar <strong className="text-white font-black underline decoration-[var(--brand-pink)] decoration-4 underline-offset-4">3x más</strong>.
                </p>

                <div className="flex flex-wrap gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white text-[var(--brand-dark)] font-black px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm tracking-tight cursor-pointer"
                  >
                    VER PRODUCTOS
                    <ArrowDown size={18} strokeWidth={3} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => document.getElementById('combos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white/5 backdrop-blur-md border border-white/10 text-white font-black px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-sm tracking-tight cursor-pointer"
                  >
                    🔥 ARMAR COMBO
                  </motion.button>
                  <Link
                    href="/comunidad"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black px-7 py-4 rounded-2xl shadow-xl flex items-center gap-2 text-sm tracking-tight transition-all hover:scale-105 border border-purple-400/30 cursor-pointer"
                  >
                    <span>🎁 GANA $10.000</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase">Referidos</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Kits & Combos Section (Hidden when searching so user sees search results immediately) */}
          {!isSearching && (
            <KitsSection 
              onAddToCart={handleAddToCart} 
              onViewDetails={openQuickView}
              onVerTodosKits={() => {
                applyFilter('cat', 'Kits & Combos');
              }}
            />
          )}

          {/* ─── PRODUCT CATALOG ────────────────────────────────── */}
          <div id="catalogo" className="px-6 py-12 scroll-mt-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
              <div>
                <span className="text-[var(--brand-blue)] font-black uppercase text-[10px] tracking-[0.3em] mb-2 block">
                  {isSearching ? 'Búsqueda en Catálogo' : (selectedCategory || selectedSegment || selectedSolution ? 'Filtrado por' : 'Nuestro Catálogo')}
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-[var(--brand-dark)] tracking-tighter uppercase">
                  {isSearching ? `Resultados para "${deferredQuery}"` : (
                    selectedSubcategory || 
                    selectedCategory || 
                    (selectedSegment ? `Perfil: ${selectedSegment}` : null) || 
                    (selectedSolution ? `Solución: ${selectedSolution}` : null) || 
                    'Colección Completa'
                  )}
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
                {/* Catalog Search Input */}
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    placeholder="Filtrar catálogo..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl py-2 pl-9 pr-8 text-base md:text-xs focus:outline-none focus:border-[var(--brand-blue)] focus:ring-1 focus:ring-[var(--brand-blue)] text-gray-900 transition-all shadow-sm"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  {inputValue && (
                    <button 
                      onClick={() => {
                        setInputValue('');
                        applyFilter(null, null);
                      }}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold text-gray-500">
                  <span>{filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}</span>
                  {(selectedCategory || selectedSubcategory || selectedSegment || selectedSolution || inputValue) && (
                    <button 
                      onClick={() => {
                        setInputValue('');
                        applyFilter(null, null);
                      }}
                      className="text-xs font-black text-[var(--brand-pink)] hover:underline flex items-center gap-1 bg-[var(--brand-pink-50)] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                    >
                      Limpiar <X size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Selector (Segment Filter) — Hidden during active search */}
            {!isSearching && (
              <div className="mb-10 bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                  Selecciona tu perfil para ver soluciones a tu medida
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Hogar', label: 'Hogar Familiar', icon: <HomeIcon className="w-5 h-5" />, desc: 'Ahorro y rendimiento', color: 'hover:border-[var(--brand-pink)] hover:bg-[var(--brand-pink)]/5' },
                  { name: 'Airbnb', label: 'Anfitrión Airbnb', icon: <Key className="w-5 h-5" />, desc: 'Fragancia y limpieza top', color: 'hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/5' },
                  { name: 'Restaurante', label: 'Restaurantes y Cafés', icon: <Coffee className="w-5 h-5" />, desc: 'Desengrase y alimentos', color: 'hover:border-amber-500 hover:bg-amber-500/5' },
                  { name: 'Oficina', label: 'Oficinas e Institucional', icon: <Briefcase className="w-5 h-5" />, desc: 'Alto tráfico y oficinas', color: 'hover:border-indigo-500 hover:bg-indigo-500/5' }
                ].map((profile) => {
                  const isActive = selectedSegment === profile.name;
                  return (
                    <motion.button
                      key={profile.name}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        applyFilter('seg', isActive ? null : profile.name);
                        setTimeout(() => {
                          document.getElementById('grid-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }}
                      className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                        isActive 
                          ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/5 shadow-md font-bold' 
                          : `border-gray-100 bg-white ${profile.color}`
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isActive ? 'bg-[var(--brand-blue)] text-white' : 'bg-gray-50 text-gray-500'}`}>
                        {profile.icon}
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 leading-tight mb-1">{profile.label}</h4>
                      <p className="text-[10px] text-gray-400 font-medium leading-tight">{profile.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            )}

            {/* ─── RENDERING LOGIC: SEARCH VS NORMAL BROWSING ─── */}
            {isSearching ? (
              <div className="space-y-12">
                {/* 1. Individual Products Section */}
                {searchIndividualProducts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                      <h3 className="text-xl md:text-2xl font-black text-[var(--brand-dark)] flex items-center gap-2">
                        <Package className="text-[var(--brand-blue)]" size={24} />
                        Productos Individuales
                      </h3>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3.5 py-1 rounded-full">
                        {searchIndividualProducts.length} {searchIndividualProducts.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <div id="grid-productos" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 scroll-mt-28">
                      {searchIndividualProducts.map((producto) => (
                        <ProductCard
                          key={producto.id}
                          product={producto}
                          onAddToCart={handleAddToCart}
                          onViewDetails={openQuickView}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Kits & Combos Section (Shown underneath individual products) */}
                {searchComboProducts.length > 0 && (
                  <div className="p-6 md:p-8 bg-gradient-to-br from-pink-50/50 via-amber-50/30 to-purple-50/40 rounded-[2.5rem] border-2 border-pink-200/60 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-pink-200/50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 bg-pink-100 px-3 py-1 rounded-full inline-block mb-1">
                          🔥 Ahorro en Combo & Kits
                        </span>
                        <h3 className="text-xl md:text-2xl font-black text-[var(--brand-dark)] flex items-center gap-2">
                          <Sparkles className="text-pink-600" size={24} />
                          Kits y Combos con este producto
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5 font-medium">
                          Lleva más cantidad o combina con otros productos con descuento directo de fábrica
                        </p>
                      </div>
                      <span className="text-xs font-bold text-pink-800 bg-pink-100 px-3.5 py-1.5 rounded-full self-start sm:self-auto shadow-xs">
                        {searchComboProducts.length} {searchComboProducts.length === 1 ? 'combo disponible' : 'combos disponibles'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                      {searchComboProducts.map((producto) => (
                        <ProductCard
                          key={producto.id}
                          product={producto}
                          onAddToCart={handleAddToCart}
                          onViewDetails={openQuickView}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Empty State if no products match */}
                {filteredProducts.length === 0 && (
                  <div className="py-16 text-center bg-white rounded-3xl border border-gray-200 p-8 shadow-sm my-6">
                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={28} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">
                      No encontramos resultados para &quot;{deferredQuery}&quot;
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                      Prueba buscando con palabras como <em>detergente</em>, <em>desengrasante</em>, <em>lavaloza</em>, <em>suavizante</em> o <em>limpiapisos</em>.
                    </p>
                    <button
                      onClick={() => {
                        setInputValue('');
                        applyFilter(null, null);
                      }}
                      className="bg-[var(--brand-blue)] text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Ver Todos los Productos
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div id="grid-productos" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 scroll-mt-28">
                  {visibleProducts.map((producto) => (
                    <ProductCard
                      key={producto.id}
                      product={producto}
                      onAddToCart={handleAddToCart}
                      onViewDetails={openQuickView}
                    />
                  ))}
                </div>

                {/* Load More Products Button & Count */}
                {visibleCount < filteredProducts.length && (
                  <div className="mt-12 flex flex-col items-center justify-center gap-3">
                    <p className="text-xs font-bold text-gray-400">
                      Mostrando {visibleProducts.length} de {filteredProducts.length} productos
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="bg-[var(--brand-blue)] hover:bg-blue-700 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg shadow-[var(--brand-blue)]/20 text-xs tracking-widest flex items-center gap-2 transition-all cursor-pointer uppercase"
                    >
                      CARGAR MÁS PRODUCTOS
                      <ChevronDown size={16} strokeWidth={3} />
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── COMBOTIZER SECTION ─────────────────────────────── */}
          <div id="combos" className="px-6 pb-20">
             <ComboBuilder products={PRODUCTOS} onAddToCart={handleAddToCart} />
          </div>

          {/* ─── TRUST & FAQ ─────────────────────────────────── */}
          <div className="px-6 space-y-20">
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="grid md:grid-cols-3 gap-12 text-center">
                  <div>
                    <div className="w-16 h-16 bg-[var(--brand-blue-50)] text-[var(--brand-blue)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                       <TruckIcon size={32} />
                    </div>
                    <h4 className="font-black text-[var(--brand-dark)] mb-3">Envíos Rápidos</h4>
                    <p className="text-sm text-gray-400 font-medium">Entregas en 24-48h en las principales ciudades de Colombia.</p>
                  </div>
                  <div>
                    <div className="w-16 h-16 bg-[var(--brand-pink-50)] text-[var(--brand-pink)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                       <CreditCard size={32} />
                    </div>
                    <h4 className="font-black text-[var(--brand-dark)] mb-3">Pago Seguro</h4>
                    <p className="text-sm text-gray-400 font-medium">PSE, Nequi, Daviplata y pago contraentrega en efectivo.</p>
                  </div>
                  <div>
                    <div className="w-16 h-16 bg-[var(--brand-success-light)] text-[var(--brand-success)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                       <Factory size={32} />
                    </div>
                    <h4 className="font-black text-[var(--brand-dark)] mb-3">Fábrica Propia</h4>
                    <p className="text-sm text-gray-400 font-medium">Calidad garantizada sin intermediarios desde nuestra planta en Soacha.</p>
                  </div>
               </div>
            </div>
             <FactoryTrustSection />
             <SoachaLocationCard />
             <FAQSection />
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[var(--brand-dark)] text-white pt-20 pb-10 rounded-t-[4rem]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <img src="/images/logo-biocambio360.png" alt="Biocambio360" className="h-10 mb-8 brightness-0 invert" />
              <p className="text-white/40 text-sm leading-relaxed mb-6 font-medium">
                Revolucionando la limpieza en Colombia con productos industriales concentrados y de alto rendimiento.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer">IG</div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer">FB</div>
              </div>
            </div>

            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-white/40">Tienda</h4>
              <ul className="space-y-4 text-sm font-bold text-white/70">
                <li><button onClick={() => applyFilter(null, null)} className="hover:text-white transition-colors">Todos los Productos</button></li>
                <li><button onClick={() => applyFilter('cat', 'Aseo Hogar')} className="hover:text-white transition-colors">Aseo Hogar</button></li>
                <li><button onClick={() => applyFilter('cat', 'Automotriz')} className="hover:text-white transition-colors">Automotriz</button></li>
                <li><button onClick={() => applyFilter('cat', 'Línea Industrial')} className="hover:text-white transition-colors">Línea Industrial</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-white/40">Ayuda</h4>
              <ul className="space-y-4 text-sm font-bold text-white/70">
                <li><a href="/politica-envios" className="hover:text-white transition-colors">Envíos y Entregas</a></li>
                <li><a href="/politica-devolucion" className="hover:text-white transition-colors">Devoluciones</a></li>
                <li><a href="/privacidad" className="hover:text-white transition-colors">Privacidad y Tratamiento de Datos</a></li>
                <li><a href="/politica-tratamiento-datos-biocambio360-2026.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">📄 Política Tratamiento de Datos (PDF)</a></li>
                <li><a href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><Link href="/comunidad" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-bold">🎁 Programa de Referidos (Gana $10.000)</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog & Academia</Link></li>
                <li><Link href="/guia-uso-y-mezclas" className="hover:text-white transition-colors text-blue-400 flex items-center gap-1 font-black">🧪 Guía de Mezclas & Bioseguridad</Link></li>
              </ul>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
              <h4 className="font-black text-sm mb-4">¿Necesitas ayuda?</h4>
              <p className="text-white/40 text-xs mb-6 font-medium">Atención personalizada por WhatsApp de Lunes a Sábado.</p>
              <a 
                href="https://wa.me/573241005353?text=Hola%20Biocambio360%20👋%20quiero%20informaci%C3%B3n%20sobre%20sus%20productos" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-[var(--brand-dark)] px-6 py-3 rounded-2xl font-black text-xs shadow-xl"
              >
                HABLAR CON EXPERTO
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">© 2026 BIOCAMBIO360 S.A.S. - TODOS LOS DERECHOS RESERVADOS</p>
            <p className="flex items-center gap-1.5 flex-wrap justify-center font-medium">
              <span>Diseñado y desarrollado con amor por</span>
              <a 
                href="https://thinktic.co" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-white hover:text-orange-400 underline decoration-orange-500/60 hover:decoration-orange-500 transition-colors"
              >
                THINK TIC
              </a>
              <span className="text-orange-500">🧡</span>
              <span>🇨🇴</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Thumb-Bar for Mobile Nav */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] w-[92%] max-w-md">
        <div className="bg-[var(--brand-dark)]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-2 flex items-center justify-between shadow-2xl">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 text-white/70 hover:text-white transition-colors"
          >
            <Menu size={18} />
            <span className="text-[9px] font-extrabold">MENÚ</span>
          </button>
          <div className="w-px h-7 bg-white/10" />
          <Link
            href="/cotizador-b2b"
            className="flex-1 flex flex-col items-center gap-1 py-1.5 text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Building2 size={18} />
            <span className="text-[9px] font-black tracking-tight">B2B/EMPRESAS</span>
          </Link>
          <div className="w-px h-7 bg-white/10" />
          <button 
            onClick={() => applyFilter(null, null)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 text-white/70 hover:text-white transition-colors"
          >
            <LayoutGrid size={18} />
            <span className="text-[9px] font-extrabold">TIENDA</span>
          </button>
          <div className="w-px h-7 bg-white/10" />
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 text-[var(--brand-pink)] transition-colors relative"
          >
            <ShoppingCart size={18} />
            <span className="text-[9px] font-extrabold">CARRITO</span>
            {getTotalItems() > 0 && (
                <span className="absolute top-0.5 right-3 bg-white text-[var(--brand-pink)] text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {getTotalItems()}
                </span>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand-surface)]" />}>
      <HomeContent />
    </Suspense>
  );
}

function TruckIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>; }
function CreditCard({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; }
function Factory({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V9l4-2v13M10 20V5l4-2v17M18 20V9l4-2v13M2 20h20" /></svg>; }

