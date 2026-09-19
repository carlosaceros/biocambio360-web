import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const SYSTEM_INSTRUCTION = `Eres el Copilot de Inteligencia Comercial de Biocambio360, una empresa colombiana líder en productos de aseo, limpieza y desinfección biodegradables de alta concentración directo de fábrica (Soacha / Bogotá).
Tus valores son: calidez humana, empatía profunda (ataque positivo al sistema límbico: cuidado del hogar, bienestar familiar, prendas impecables), honestidad, ética, lealtad y respeto por el cliente.

Directrices de venta innegociables:
1. Flete: Explicar que el envío nacional está *subsidiado en un alto porcentaje por Biocambio360*, dejando un costo mínimo de logística para el cliente como un beneficio directo de fábrica.
2. Comparativa de precio: Nuestros productos son concentrados industriales. Una garrafa de 20L o Galón rinde de 3 a 5 veces más que los productos diluidos de supermercado tradicional (D1, Ara, Éxito), logrando un costo por lavada inferior a $600 COP.
3. Métodos de pago oficiales: Contraentrega en efectivo a nivel nacional, Wompi (tarjetas/PSE), Addi (cuotas sin interés), Daviplata oficial y Bancolombia oficial de fundadores (Danilo Espinal / Sandra Garzón).
4. Tono: Cercano, afectuoso, profesional, 100% colombiano pero formal, con emojis oportunos y sin promesas falsas.`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (!action) {
            return NextResponse.json({ error: 'Falta el parámetro "action"' }, { status: 400 });
        }

        // 1. Inicializar Gemini
        let genAI: GoogleGenerativeAI | null = null;
        if (GEMINI_KEY && GEMINI_KEY.length > 10) {
            genAI = new GoogleGenerativeAI(GEMINI_KEY);
        }

        // Helper para llamar a Gemini con fallback seguro
        const callGemini = async (prompt: string, fallbackResponse: any) => {
            if (!genAI) return fallbackResponse;
            try {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    systemInstruction: SYSTEM_INSTRUCTION,
                });
                const result = await model.generateContent(prompt);
                const text = result.response.text();
                return text;
            } catch (err) {
                console.warn('[SalesCopilot/Gemini] Fallback activated due to API error:', err);
                return fallbackResponse;
            }
        };

        // ACCIÓN 1: RESOLUCIÓN DE OBJECIÓN COMERCIAL
        if (action === 'objecion') {
            const { objecion, cliente = 'Cliente', producto = 'Detergente Líquido 20L', canal = 'whatsapp' } = body;
            
            const prompt = `Un cliente llamado "${cliente}" tiene la siguiente duda u objeción comercial al comprar "${producto}" por canal ${canal}:
"${objecion}"

Genera exactamente 3 opciones persuasivas de respuesta listas para copiar y pegar por WhatsApp:
1. OPCIÓN CÁLIDA / LÍMBICA: Enfocada en el bienestar de su hogar, cuidado de la familia, ropa impecable y gratitud sincera.
2. OPCIÓN DIRECTA / NÚMEROS: Enfocada en rendimiento matemático, ahorro por litro, concentración de fábrica y costo por lavada.
3. OPCIÓN CIERRE DE VALOR: Enfocada en el envío nacional subsidiado por Biocambio360 como beneficio exclusivo y cierre con pregunta orientada a confirmar dirección o método de pago (contraentrega/Wompi/Addi).

Devuelve tu respuesta en formato JSON estrictamente válido con este esquema:
{
  "opcion_calida": "texto aquí...",
  "opcion_directa": "texto aquí...",
  "opcion_cierre_valor": "texto aquí...",
  "consejo_asesor": "Breve consejo táctico para el asesor comercial sobre cómo modular su voz o mensaje."
}`;

            const fallback = JSON.stringify({
                opcion_calida: `¡Hola ${cliente}! Comprendo totalmente tu inquietud 🌿. En Biocambio360 queremos que cada garrafa traiga paz y bienestar a tu hogar. Nuestra fórmula de ${producto} está concentrada al máximo para cuidar las prendas y la piel de tu familia sin desgastar los tejidos. ¿Te gustaría que te programemos la entrega directa de fábrica para que compruebes la suavidad y el aroma fresco desde el primer lavado?`,
                opcion_directa: `¡Hola ${cliente}! Te entiendo perfectamente. Si revisamos los números, una garrafa de ${producto} rinde más de 120 cargas completas, lo que significa menos de $650 pesos por lavado frente a los más de $1.600 que cuestan marcas comerciales diluidas. Además, compras directo de fábrica sin intermediarios. ¿Deseas pagarlo contraentrega al recibirlo?`,
                opcion_cierre_valor: `¡Hola ${cliente}! Excelente punto. Justamente para tu tranquilidad, en Biocambio360 tenemos el envío nacional subsidiado en un alto porcentaje por nosotros como beneficio directo de fábrica, pagando tú un valor mínimo de logística. Podemos despachártelo hoy mismo con pago contraentrega en efectivo para que no arriesgues tu dinero. ¿Nos confirmas tu dirección para apartar tu cupo en ruta?`,
                consejo_asesor: 'Valida siempre la emoción del cliente antes de debatir el precio. El beneficio de fábrica y el flete subsidiado reducen el 80% de las fricciones de compra.'
            });

            const rawAiResponse = await callGemini(prompt, fallback);
            let parsedData;
            try {
                const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleaned);
            } catch (e) {
                parsedData = JSON.parse(fallback);
            }

            return NextResponse.json({ success: true, ...parsedData });
        }

        // ACCIÓN 2: SUGERENCIA TÁCTICA DE META
        if (action === 'meta_tactica') {
            const {
                advisorName = 'Asesor',
                metaMensual = 30000000,
                ventasActuales = 18500000,
                diasRestantes = 12,
                ticketPromedio = 85000
            } = body;

            const faltante = Math.max(0, metaMensual - ventasActuales);
            const pedidosNecesarios = ticketPromedio > 0 ? Math.ceil(faltante / ticketPromedio) : 0;
            const pedidosPorDia = diasRestantes > 0 ? Math.ceil(pedidosNecesarios / diasRestantes) : pedidosNecesarios;

            const prompt = `Eres el Director Comercial de Biocambio360. El asesor "${advisorName}" tiene el siguiente estado comercial:
- Meta mensual: $${metaMensual.toLocaleString('es-CO')} COP
- Ventas cerradas acumuladas: $${ventasActuales.toLocaleString('es-CO')} COP
- Faltante para meta: $${faltante.toLocaleString('es-CO')} COP
- Días laborales restantes en el mes: ${diasRestantes} días
- Ticket promedio actual: $${ticketPromedio.toLocaleString('es-CO')} COP
- Pedidos necesarios: ${pedidosNecesarios} (${pedidosPorDia} pedidos diarios)

Genera una estrategia comercial táctica y motivadora para que el asesor supere su meta. Sugiere combos estrella (ej: Combo Garrafa 20L + Galón Lavaloza + Desengrasante), acciones de reactivación de clientes dormidos (>45 días sin comprar), uso del flete subsidiado y referidos.

Devuelve respuesta estrictamente en JSON:
{
  "resumen": "Resumen ejecutivo del reto (1 frase inspiradora)",
  "meta_diaria_pedidos": ${pedidosPorDia},
  "combos_recomendados": [
    { "nombre": "Combo Hogar Total 20L", "precio_cop": 115000, "argumento_venta": "..." },
    { "nombre": "Dúo Lavandería Concentrada", "precio_cop": 85000, "argumento_venta": "..." }
  ],
  "acciones_prioritarias": [
    "Acción táctica 1",
    "Acción táctica 2",
    "Acción táctica 3"
  ],
  "mensaje_motivacional": "Mensaje de liderazgo y energía para el asesor."
}`;

            const fallback = JSON.stringify({
                resumen: `Tienes ${diasRestantes} días para cerrar $${faltante.toLocaleString('es-CO')} COP: enfocándote en solo ${pedidosPorDia} pedidos diarios de $85.000 logras el bono del 3.5%.`,
                meta_diaria_pedidos: pedidosPorDia,
                combos_recomendados: [
                    {
                        nombre: "Combo Mega Ahorro Fábrica (Detergente 20L + Lavaloza Galón)",
                        precio_cop: 118000,
                        argumento_venta: "Eleva el ticket promedio en una sola llamada ofreciendo el flete subsidiado por llevar ambas referencias."
                    },
                    {
                        nombre: "Dúo Cocina & Pisos (Desengrasante 3.8L + Lavaloza 3.8L)",
                        precio_cop: 68000,
                        argumento_venta: "Ideal para clientes que buscan probar la línea con inversión moderada y alta recompra."
                    }
                ],
                acciones_prioritarias: [
                    "Llamar hoy a los 10 clientes con más de 45 días sin compra usando el script de Alerta de Recompra Programada.",
                    "Ofrecer activación en la Comunidad de Referidos: cada amigo que recomienden les acumula saldo para sus próximos pedidos.",
                    "Hacer seguimiento a los carritos y cotizaciones en borrador pendientes con el mensaje de despacho prioritario hoy."
                ],
                mensaje_motivacional: `¡Vamos con toda, ${advisorName}! Estás a solo ${pedidosPorDia} cierres al día de alcanzar la gloria y maximizar tus comisiones. Tu asesoría transforma la economía y el bienestar de los hogares colombianos.`
            });

            const rawAiResponse = await callGemini(prompt, fallback);
            let parsedData;
            try {
                const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleaned);
            } catch (e) {
                parsedData = JSON.parse(fallback);
            }

            return NextResponse.json({ success: true, ...parsedData });
        }

        // ACCIÓN 3: ANALIZAR CHAT O MENSAJE DE CLIENTE
        if (action === 'analizar_chat') {
            const { chatTranscript = '', clienteNombre = 'Cliente' } = body;

            if (!chatTranscript.trim()) {
                return NextResponse.json({ error: 'El texto del chat está vacío' }, { status: 400 });
            }

            const prompt = `Analiza la siguiente conversación o mensaje de WhatsApp de un cliente de Biocambio360 (Nombre: ${clienteNombre}):
"""
${chatTranscript}
"""

Identifica:
1. Nivel de interés (Alto, Medio, Bajo, En riesgo de fuga, Molesto).
2. Puntos de dolor u objeciones detectadas (flete, precio, desconfianza, método de pago, tiempos de entrega).
3. La mejor respuesta redactada lista para enviar por WhatsApp, usando los valores de Biocambio360 (cálida, empática, aclarando flete subsidiado o beneficio directo de fábrica si aplica).
4. El siguiente paso concreto recomendado para el asesor.

Devuelve respuesta estrictamente en JSON:
{
  "nivel_interes": "Alto | Medio | Bajo | Crítico",
  "puntos_dolor": ["dolor 1", "dolor 2"],
  "respuesta_whatsapp": "Texto listo para enviar...",
  "siguiente_paso": "Paso recomendado para cerrar o fidelizar..."
}`;

            const fallback = JSON.stringify({
                nivel_interes: "Medio",
                puntos_dolor: ["Duda sobre entrega y medios de pago"],
                respuesta_whatsapp: `¡Hola ${clienteNombre}! Con gusto te ayudamos con todos los detalles de tu entrega directa de fábrica 🌿. Podemos despachártelo hoy mismo con nuestro envío subsidiado y pago contraentrega en efectivo para tu total comodidad. ¿En qué ciudad o dirección te encuentras para confirmarte los tiempos exactos de ruta?`,
                siguiente_paso: "Preguntar la dirección para cotizar el flete subsidiado y ofrecer confirmación de despacho inmediata."
            });

            const rawAiResponse = await callGemini(prompt, fallback);
            let parsedData;
            try {
                const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleaned);
            } catch (e) {
                parsedData = JSON.parse(fallback);
            }

            return NextResponse.json({ success: true, ...parsedData });
        }

        // ACCIÓN 4: CONSOLIDACIÓN MACRO ESTRATÉGICA (TRIMESTRE / SEMESTRE / AÑO)
        if (action === 'consolidar_macro') {
            const { macroData } = body;

            const periodLabel = macroData?.periodLabel || 'Consolidado Periódico';
            const ventasTotal = macroData?.ventasTotalesMillones || 0;
            const pctCumplimiento = macroData?.porcentajeCumplimiento || 0;
            const nuevosTotal = macroData?.clientesNuevosTotales || 0;
            const ticketPonderado = macroData?.ticketPromedioPonderado || 0;
            const topAsesores = macroData?.macroHallazgos?.concentracion?.topAsesores?.join(' y ') || 'Karen y Katherine';
            const shareConcentracion = macroData?.macroHallazgos?.concentracion?.shareTotal || 54;
            const hunter = macroData?.macroHallazgos?.cazadorPeriodo?.asesor || 'Laura';
            const hunterNuevos = macroData?.macroHallazgos?.cazadorPeriodo?.clientesNuevos || 0;
            const critico = macroData?.macroHallazgos?.asesorCriticoPeriodo?.asesor || 'Camilo';
            const criticoPct = macroData?.macroHallazgos?.asesorCriticoPeriodo?.cumplimiento || 0;

            const prompt = `Actúa como Director Comercial Ejecutivo y Asesor Estratégico de los Fundadores de Biocambio360 (Julián y Danilo).
Analiza el siguiente informe comercial consolidado para el período: "${periodLabel}".

MÉTRICAS MACRO ACUMULADAS:
- Ventas Totales: $${ventasTotal} Millones COP (${pctCumplimiento}% de la meta del período).
- Clientes Nuevos Captados: ${nuevosTotal}.
- Ticket Promedio Ponderado: $${ticketPonderado.toLocaleString('es-CO')} COP.
- Concentración de Cartera: ${topAsesores} generan el ${shareConcentracion}% de las ventas totales.
- Líder de Prospección (Hunter): ${hunter} con ${hunterNuevos} clientes nuevos.
- Asesor en Riesgo Operativo: ${critico} con ${criticoPct}% de cumplimiento.

Genera una respuesta en formato JSON estrictamente válido con los siguientes campos:
{
  "diagnostico_gerencial": "Diagnóstico conciso de 3 a 4 oraciones analizando la salud comercial del período, balance entre recompra y nuevos clientes, y sostenibilidad.",
  "riesgo_estructural": "Análisis del riesgo de concentración en ${topAsesores} y cómo blindar la cartera institucional.",
  "palanca_crecimiento": "La principal palanca comercial a activar en el próximo período (ej. cross-selling, combos 20L, HORECA).",
  "plan_accion_directores": [
    "Acción directiva 1 específica con métrica y responsable",
    "Acción directiva 2 específica con métrica y responsable",
    "Acción directiva 3 específica con métrica y responsable"
  ],
  "mensaje_motivacional_equipo": "Párrafo inspirador y honesto para transmitir a los asesores comerciales en el comité mensual."
}`;

            const fallback = JSON.stringify({
                diagnostico_gerencial: `Durante ${periodLabel}, la fábrica alcanzó $${ventasTotal}M COP (${pctCumplimiento}% de cumplimiento) demostrando una lealtad excepcional en recompra de la cartera histórica. Sin embargo, se evidencia una alta disparidad entre asesores farmers y hunters que debe equilibrarse.`,
                riesgo_estructural: `La concentración del ${shareConcentracion}% en ${topAsesores} requiere un protocolo de co-asignación de cuentas para evitar vulnerabilidad operativa si una asesora se incapacita o rota.`,
                palanca_crecimiento: `Impulsar el combo Dúo 10+10 y garrafas de 20L con flete nacional subsidiado para clientes que compran presentaciones individuales de supermercado.`,
                plan_accion_directores: [
                    `1. Reasignar 25 cuentas de recompra semestral a ${critico} bajo supervisión directa para elevar su cuota por encima del 50%.`,
                    `2. Capacitar a ${hunter} en técnicas de cross-selling con Desengrasante 4L para subir su ticket promedio a más de $120.000 COP.`,
                    `3. Fortalecer el protocolo de alertas de recompra a 45 días con envíos de prueba de Bactokil para fidelización institucional.`
                ],
                mensaje_motivacional_equipo: `¡Equipo Biocambio360! Cada litro que despachamos lleva bienestar, ahorro real y dignidad a los hogares colombianos. Tenemos una base de clientes que nos ama y un mercado inmenso por conquistar con nuestras fórmulas de fábrica.`
            });

            const rawAiResponse = await callGemini(prompt, fallback);
            let parsedData;
            try {
                const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleaned);
            } catch (e) {
                parsedData = JSON.parse(fallback);
            }

            return NextResponse.json({ success: true, ...parsedData });
        }

        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });

    } catch (error: any) {
        console.error('[SalesCopilot/POST] Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del Copilot Comercial', details: error.message },
            { status: 500 }
        );
    }
}
