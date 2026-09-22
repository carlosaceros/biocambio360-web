import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';
import { recordShippingAuditLog } from '@/lib/shipping-audit-service';
import {
    getCartPackagingAnalysis,
    isZonaLocal,
    calcularFleteLocal,
    calcularFleteNacional,
    MINIMO_DOMICILIARIO_LOCAL,
    PISO_FLETE_NACIONAL,
    TOPE_SUBSIDIO_NACIONAL,
    CartItemQuote,
} from '@/lib/shipping-zones';

async function writeAuditLog(log: Record<string, unknown>) {
    try {
        await recordShippingAuditLog(log as any);
    } catch (e: any) {
        console.warn('[Cotizar] No se pudo escribir log de auditoría:', e.message);
    }
}


export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            destinoCodigo = '11001000',
            destinoNombre = 'BOGOTA D.C.',
            subtotal = 0,
            aplicaContrapago = true,
            totalWeightKg: weightParam,
            items = [],
            itemsSizes = [],
        } = body;

        const esLocal = isZonaLocal(destinoCodigo);

        // Analizar empaque, bultos, pesos reales y subsidio de fábrica
        const rawItems: CartItemQuote[] = (items && items.length > 0) ? items : itemsSizes;
        const analysis = getCartPackagingAnalysis(rawItems);
        const totalWeightKg = analysis.totalWeightKg || weightParam || 5;
        const bultos = analysis.bultos;
        const subsidioBruto = analysis.subsidioBruto;

        // ── ZONA LOCAL → Domicilio Bogotá y aledaños (Flota propia / mensajería local) ──
        if (esLocal) {
            const { fleteCliente, esGratis, subsidioFabrica } = calcularFleteLocal(subsidioBruto);

            const mensaje = esGratis
                ? '🚚 ¡Envío GRATIS en Bogotá y aledaños asumido por Biocambio360!'
                : `Domicilio local Bogotá: $${fleteCliente.toLocaleString('es-CO')} COP (Biocambio360 asume $${subsidioFabrica.toLocaleString('es-CO')} del costo mínimo del domiciliario de $13.000).`;

            const auditData = {
                destinoCodigo,
                destinoNombre,
                subtotal,
                totalWeightKg,
                bultos,
                subsidioBruto,
                subsidioEfectivo: subsidioFabrica,
                cotizacionBruta99: MINIMO_DOMICILIARIO_LOCAL,
                fleteCliente,
                precioFinal: fleteCliente,
                esGratis,
                esLocal: true,
                source: esGratis ? 'free_shipping' : 'local_copay',
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                desgloseSubsidio: analysis.desgloseSubsidio,
                durationMs: Date.now() - startTime,
            };

            await writeAuditLog(auditData);

            return NextResponse.json({
                gratis: esGratis,
                precio: fleteCliente,
                cotizacionBruta99: MINIMO_DOMICILIARIO_LOCAL,
                subsidioBruto,
                subsidioEfectivo: subsidioFabrica,
                totalWeightKg,
                bultos,
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                esLocal,
                source: esGratis ? 'free_shipping' : 'local_copay',
                mensaje,
            });
        }

        // ── ZONA NACIONAL → 99 Envíos API ────────────────────────────────────────
        let cotizacionBruta99 = 0;
        let valorContrapago = 0;
        let cheapestCarrierName = 'coordinadora';
        let cheapestDays: string | number = 3;
        let allQuotesCombined: Record<string, any> = {};

        const paquetes = (analysis.paquetesDetalle && analysis.paquetesDetalle.length > 0)
            ? analysis.paquetesDetalle
            : [{ pesoKg: totalWeightKg, alto: analysis.dimensions.alto, largo: analysis.dimensions.largo, ancho: analysis.dimensions.ancho, descripcion: 'Bulto Único' }];

        try {
            if (paquetes.length > 1) {
                // Cotización multi-bulto real en paralelo (cada paquete con su peso y dimensiones exactas)
                const quotesPromises = paquetes.map((pkg, idx) => {
                    // El valor declarado se distribuye proporcionalmente o mínimo 75.000
                    const valorPkg = Math.max(75000, Math.round((subtotal * (pkg.pesoKg / totalWeightKg))));
                    return cotizarEnvio(
                        destinoCodigo,
                        destinoNombre,
                        valorPkg,
                        aplicaContrapago,
                        pkg.pesoKg,
                        { alto: pkg.alto, largo: pkg.largo, ancho: pkg.ancho }
                    );
                });

                const results = await Promise.all(quotesPromises);

                // Acumular costos por transportadora para ver cuál resulta más económica en la suma total
                const carrierSums: Record<string, { totalValor: number; totalContrapago: number; dias: string | number; countOk: number }> = {};

                for (const res of results) {
                    for (const [name, carrier] of Object.entries(res.all)) {
                        if (carrier.exito && carrier.valor > 0) {
                            if (!carrierSums[name]) {
                                carrierSums[name] = { totalValor: 0, totalContrapago: 0, dias: carrier.dias, countOk: 0 };
                            }
                            carrierSums[name].totalValor += carrier.valor;
                            carrierSums[name].totalContrapago += carrier.valor_contrapago || 0;
                            carrierSums[name].countOk += 1;
                        }
                    }
                }

                // Filtrar solo transportadoras que hayan cotizado exitosamente todos los bultos
                const validCarriers = Object.entries(carrierSums).filter(([_, data]) => data.countOk === paquetes.length);

                if (validCarriers.length > 0) {
                    // Ordenar por el valor total más económico
                    validCarriers.sort((a, b) => a[1].totalValor - b[1].totalValor);
                    cheapestCarrierName = validCarriers[0][0];
                    cotizacionBruta99 = validCarriers[0][1].totalValor;
                    valorContrapago = aplicaContrapago ? validCarriers[0][1].totalContrapago : 0;
                    cheapestDays = validCarriers[0][1].dias;
                    allQuotesCombined = carrierSums;
                } else {
                    // Fallback sumando cheapest individual
                    for (const r of results) {
                        cotizacionBruta99 += r.cheapest.valor;
                        if (aplicaContrapago) valorContrapago += (r.cheapest.valor_contrapago || 0);
                        cheapestCarrierName = r.cheapest.transportadora || cheapestCarrierName;
                        cheapestDays = r.cheapest.dias || cheapestDays;
                    }
                }
            } else {
                // Cotización estándar para 1 solo bulto
                const quote99 = await cotizarEnvio(
                    destinoCodigo,
                    destinoNombre,
                    subtotal,
                    aplicaContrapago,
                    totalWeightKg,
                    analysis.dimensions
                );
                cotizacionBruta99 = quote99.cheapest.valor;
                valorContrapago = aplicaContrapago ? (quote99.cheapest.valor_contrapago || 0) : 0;
                cheapestCarrierName = quote99.cheapest.transportadora || 'coordinadora';
                cheapestDays = quote99.cheapest.dias || 3;
                allQuotesCombined = quote99.all;
            }
        } catch (err: any) {
            console.warn('[Cotizar] Fallback 99 Envíos API:', err.message);
            cotizacionBruta99 = 35000 * Math.max(1, paquetes.length);
            valorContrapago = aplicaContrapago ? 3500 * Math.max(1, paquetes.length) : 0;
            cheapestCarrierName = 'coordinadora';
            cheapestDays = 3;
        }

        const costoBrutoTotal = cotizacionBruta99 + valorContrapago;

        // ── SUBSIDIO NACIONAL (PISO $13.000 + TOPE $15.000) ───────────────────────
        // Regla aprobada: Piso mínimo nacional de $13.000 COP y tope de subsidio de fábrica de $15.000 COP.
        const {
            fleteCliente,
            subsidioEfectivo,
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
        } = calcularFleteNacional(costoBrutoTotal, subsidioBruto);
        const esGratis = fleteCliente === 0;

        // ── AUDITORÍA ─────────────────────────────────────────────────────────────
        const auditData = {
            destinoCodigo,
            destinoNombre,
            subtotal,
            totalWeightKg,
            bultos,
            paquetesDetalle: paquetes,
            subsidioBruto,

            subsidioEfectivo,
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
            cotizacionBruta99,
            valorContrapago,
            costoBrutoTotal,
            fleteCliente,
            precioFinal: fleteCliente,
            esGratis,
            esLocal,
            source: '99envios',
            transportadora: cheapestCarrierName,
            dias: cheapestDays,
            api99Cotizaciones: allQuotesCombined,
            desgloseSubsidio: analysis.desgloseSubsidio,
            durationMs: Date.now() - startTime,
        };

        await writeAuditLog(auditData);

        return NextResponse.json({
            gratis: esGratis,
            precio: fleteCliente,
            cotizacionBruta99,
            valorContrapago,
            costoBrutoTotal,
            subsidioBruto,
            subsidioEfectivo,
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
            totalWeightKg,
            bultos,
            paquetesDetalle: paquetes,
            transportadora: cheapestCarrierName,
            dias: cheapestDays,
            esLocal,
            source: '99envios',
            mensaje: esGratis
                ? '¡Envío GRATIS asumido por Biocambio360!'
                : `Flete $${fleteCliente.toLocaleString('es-CO')} (${cheapestCarrierName.toUpperCase()} · ${bultos} bulto${bultos > 1 ? 's' : ''}). Biocambio360 subsidia $${subsidioEfectivo.toLocaleString('es-CO')} de fábrica (Ahorro garantizado).`,
        });
    } catch (e: any) {
        console.error('[Cotizar API] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al cotizar envío' }, { status: 500 });
    }
}

