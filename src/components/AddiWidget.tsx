'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { Sparkles, CreditCard, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/products';

interface AddiWidgetProps {
  price: number;
  unitPrice?: number;
  quantity?: number;
  allySlug?: string;
  className?: string;
  showTeaserIfUnderMin?: boolean;
  onSetQuantity?: (qty: number) => void;
}

export const ADDI_MIN_AMOUNT = 50000;

export default function AddiWidget({
  price,
  unitPrice,
  quantity = 1,
  allySlug = process.env.NEXT_PUBLIC_ADDI_ALLY_SLUG || 'biocambio360-ecommerce',
  className = '',
  showTeaserIfUnderMin = true,
  onSetQuantity
}: AddiWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Reservar altura mínima para prevenir Cumulative Layout Shift (CLS)
    return <div className={`min-h-[52px] ${className}`} />;
  }

  const isEligible = price >= ADDI_MIN_AMOUNT;
  const basePrice = unitPrice || (quantity > 0 ? Math.round(price / quantity) : price);
  const unitsNeeded = basePrice > 0 ? Math.ceil(ADDI_MIN_AMOUNT / basePrice) : 1;
  const estimatedTotalAtMin = basePrice * unitsNeeded;
  const estimatedCuota = Math.ceil(estimatedTotalAtMin / 3);
  const cuota3 = Math.ceil(price / 3);
  const cuota2 = Math.ceil(price / 2);
  const singleUnitCuota = Math.ceil(basePrice / 3);

  return (
    <div className={`addi-widget-wrapper transition-all duration-300 ${className}`}>
      {/* Script oficial de Addi cargado de forma asíncrona */}
      <Script
        id="addi-widget-bundle"
        src="https://s3.amazonaws.com/widgets.addi.com/bundle.min.js"
        strategy="lazyOnload"
      />

      {isEligible ? (
        /* Caso A: Monto >= $50.000 COP -> Desglose Inmediato de Cuotas + Widget Oficial */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-pink-50/60 border-2 border-blue-200/80 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Top Header Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0050FF] text-white text-[10px] font-black tracking-wide uppercase shadow-sm">
                <Zap size={11} className="animate-pulse" />
                ADDI
              </span>
              <span className="text-xs font-black text-gray-900 tracking-tight">
                Paga a cuotas sin tarjeta de crédito
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Sparkles size={11} /> 0% Interés
            </span>
          </div>

          {/* Valor de las cuotas enseguida (Cálculo directo e inmediato) */}
          <div className="bg-white/95 rounded-xl p-3 my-2.5 border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#0050FF]">
                Valor de tu cuota mensual
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                  3 cuotas de {formatCurrency(cuota3)}
                </span>
                <span className="text-xs font-bold text-gray-500">/ mes</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Sparkles size={11} />
                0% de interés · Total a pagar: {formatCurrency(price)}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase">
                0% T.E.A.
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                o 2 cuotas de {formatCurrency(cuota2)}
              </span>
            </div>
          </div>

          {/* Render del Web Component Nativo de Addi (Permite abrir modal oficial y consultar cupo) */}
          <div className="addi-native-container min-h-[36px] flex items-center">
            {React.createElement('addi-widget', {
              key: `addi-widget-${price}`,
              price: price,
              'ally-slug': allySlug
            })}
          </div>

          {/* Micro Trust Pills */}
          <div className="mt-2 pt-2 border-t border-blue-100/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-600 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-blue-600 shrink-0" />
              Hasta 3 cuotas sin interés
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-pink-600 shrink-0" />
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
              Solo tu cédula y WhatsApp
            </span>
          </div>
        </div>
      ) : showTeaserIfUnderMin ? (
        /* Caso B: Monto < $50.000 COP -> Cuota estimada enseguida + AOV Booster */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 sm:p-4 shadow-md border border-blue-400/30">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#0050FF] to-[#0070FF] text-white text-[10px] font-black uppercase tracking-wider shadow">
                  <CreditCard size={11} />
                  PAGA CON ADDI
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30 text-[10px] font-bold">
                  0% Interés · 3 Cuotas
                </span>
              </div>

              {/* Title & Estimated Cuota enseguida */}
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                  ¿Prefieres pagar a cuotas sin tarjeta de crédito?
                </h4>
                <div className="mt-1.5 p-2.5 rounded-xl bg-white/10 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] text-blue-200 font-bold">
                    Cuota estimada de este producto:
                  </span>
                  <span className="text-sm font-black text-white">
                    3 cuotas de ~{formatCurrency(singleUnitCuota)}/mes
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1">
                  Financiación con <strong>ADDI</strong> disponible en compras desde <strong>$50.000 COP</strong> a 0% de interés.
                </p>
              </div>

              {/* Smart Suggestion */}
              {unitsNeeded > quantity && onSetQuantity && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onSetQuantity(unitsNeeded)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow transition-all cursor-pointer border border-blue-400/40"
                  >
                    <span>Llevar {unitsNeeded} unidades por {formatCurrency(estimatedTotalAtMin)} (3 cuotas de {formatCurrency(estimatedCuota)} sin interés)</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {(!onSetQuantity || unitsNeeded <= quantity) && (
                <p className="text-[10px] text-blue-200/90 italic pt-0.5">
                  💡 Agrega más unidades o combina con otros productos en tu carrito para diferir tu pago.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
