/**
 * Biocambio360 — Servicio de Fidelización Pos-Venta & Nurturing Semanal
 * Correos educativos, cercanos y éticos firmados por Julián y Danilo (Co-fundadores).
 * Conecta los productos comprados con artículos del blog y tips prácticos de uso.
 */

import { emailTransport } from './email-service';
import { BLOG_POSTS, BlogPost } from './blog-data';
import { Order } from '@/types/order';

export interface NurtureTip {
    semana: number;
    categoria: string;
    asunto: string;
    titulo: string;
    subtitulo: string;
    cuerpoParrafos: string[];
    tipDestacado: {
        titulo: string;
        texto: string;
    };
    blogSlugRecomendado?: string;
    blogTituloRecomendado?: string;
    blogResumenRecomendado?: string;
}

/**
 * Catálogo de contenidos semanales pos-venta clasificados por categoría de producto
 */
export const NURTURE_CATALOG: Record<string, NurtureTip[]> = {
    detergente: [
        {
            semana: 1,
            categoria: 'detergente',
            asunto: '🌿 El secreto de los 60ml: por qué más espuma no significa más limpio (Tips de Julián y Danilo)',
            titulo: 'El mito de la espuma y el secreto de los 60ml',
            subtitulo: 'Una recomendación honesta desde nuestra fábrica para cuidar tus prendas y tu bolsillo',
            cuerpoParrafos: [
                'Hola, te escribimos Julián y Danilo, co-fundadores de Biocambio360. Queremos saber cómo te fue con la llegada de tu pedido y darte una bienvenida sincera a esta comunidad de consumo consciente.',
                'En nuestra planta de Soacha, una de las dudas más frecuentes de las familias y lavanderías es cuánta cantidad de detergente aplicar. Durante años, la publicidad masiva nos enseñó erróneamente que "entre más espuma hace un detergente, mejor limpia". ¡La química industrial demuestra todo lo contrario!',
                'La espuma en exceso atrapa la suciedad en la superficie del agua en lugar de desprenderla, hace que la lavadora gaste litros adicionales de agua en enjuagues y deja residuos jabonosos en los tejidos que luego producen mal olor a humedad.'
            ],
            tipDestacado: {
                titulo: '💡 La Dosificación Maestra de Fábrica:',
                texto: 'Para una lavadora completa de 12 a 18 kg con ropa del diario, solo necesitas <strong>60 ml a 70 ml</strong> (aproximadamente una tacita pequeña o pocillo tintero). Gracias al bicarbonato de sodio activo y nuestros tensoactivos biodegradables concentrados, no necesitas saturar el agua para lograr blancura y desinfección total.'
            },
            blogSlugRecomendado: 'desmanchar-ropa-blanca-oxigeno-activo-bicarbonato',
            blogTituloRecomendado: 'Cómo Desmanchar Ropa Blanca sin Cloro: Oxígeno Activo y Bicarbonato',
            blogResumenRecomendado: 'Protocolo profesional para quitar percudido, grasa y manchas amarillas sin quemar las fibras de algodón con hipoclorito corrosivo.'
        },
        {
            semana: 2,
            categoria: 'detergente',
            asunto: '💧 Lavado en agua fría: cómo activar el 100% del poder desmanchador (Biocambio360)',
            titulo: 'El reto del agua fría en la sabana y cómo vencerlo',
            subtitulo: 'Aprende a lavar a 12°C protegiendo los colores y ahorrando energía',
            cuerpoParrafos: [
                'Hola nuevamente, esperamos que estés teniendo una excelente semana. Hoy Danilo y yo queríamos compartirte un truco muy específico para los climas fríos como Bogotá y la sabana.',
                'A temperaturas entre 10°C y 14°C, las grasas corporales y los aceites se solidifican en la ropa. Muchos detergentes en polvo no se disuelven y terminan dejando parches blancos en la ropa oscura.',
                'Nuestra fórmula líquida está diseñada para dispersarse en segundos incluso en agua helada, pero hay un paso que multiplica su eficacia por tres.'
            ],
            tipDestacado: {
                titulo: '💡 El Secreto del Pre-remojo de 15 Minutos:',
                texto: 'Si tienes prendas con manchas difíciles de sudor, salsa o cuellos sucios, aplica una gota de detergente puro sobre la mancha, frótala suavemente y déjala reposar 15 minutos antes de meterla a la lavadora. Los tensoactivos romperán la película de suciedad sin necesidad de usar agua caliente ni restregar con cepillos duros que desgastan la tela.'
            },
            blogSlugRecomendado: 'protocolo-lavado-desodorizacion-toallas-hoteles-clima-frio',
            blogTituloRecomendado: 'Protocolo de Lavado y Desodorización de Toallas y Ropa en Clima Frío',
            blogResumenRecomendado: 'Cómo eliminar el característico olor a "toalla húmeda" y mantener la suavidad esponjosa de las fibras en zonas de baja temperatura.'
        },
        {
            semana: 3,
            categoria: 'detergente',
            asunto: '✨ El mantenimiento preventivo de tu lavadora que te ahorrará miles de pesos',
            titulo: 'Tu lavadora también necesita un respiro: mantenimiento de 5 minutos',
            subtitulo: 'Cómo evitar hongos en el fuelle de caucho y cal en los filtros',
            cuerpoParrafos: [
                'Nos alegra saludarte. Cuando creamos Biocambio360, nuestro compromiso no fue solo vender insumos de aseo, sino educar con honestidad para que la vida útil de tus electrodomésticos se duplique.',
                'Incluso usando los mejores productos biodegradables, las fibras de la ropa y los minerales pesados del agua de la red pública van dejando sarro en el tambor interior.',
                'Hacer este mantenimiento una vez al mes garantiza que tu ropa salga oliendo a campo y frescura pura, sin ese molesto olor a desagüe que a veces queda impregnado.'
            ],
            tipDestacado: {
                titulo: '💡 Ciclo de Purga Mensual:',
                texto: 'Una vez cada 30 días, programa un ciclo de lavado corto con la lavadora completamente vacía, agregando 100 gramos de bicarbonato o media taza de vinagre blanco en agua tibia. Limpia con un trapo el caucho frontal de la compuerta y deja la tapa abierta para ventilar.'
            },
            blogSlugRecomendado: 'donde-comprar-canecas-productos-aseo-soacha-fabrica',
            blogTituloRecomendado: 'Economía Circular y Ahorro Directo de Fábrica en Insumos de Aseo',
            blogResumenRecomendado: 'Conoce cómo envasamos directamente en nuestra planta de Soacha para entregarte hasta un 45% más de rendimiento por peso invertido.'
        }
    ],

    desengrasante: [
        {
            semana: 1,
            categoria: 'desengrasante',
            asunto: '🍳 El truco de los 3 minutos en caliente para campanas y baldosas (Julián y Danilo)',
            titulo: 'Desengrase profesional sin fregar ni maltratar tus manos',
            subtitulo: 'El método que usamos en cocinas industriales y restaurantes',
            cuerpoParrafos: [
                'Hola, te escribimos Danilo y Julián con un afectuoso saludo desde la fábrica.',
                'El desengrasante multiusos que tienes en tus manos es una de nuestras fórmulas más potentes y balanceadas. A diferencia de los removedores cáusticos tradicionales que desprenden vapores asfixiantes y manchan el aluminio, nuestra fórmula emulsiona los ácidos grasos mediante agentes tensoactivos de grado industrial.',
                'Para campanas extractoras, filtros metálicos, freidoras o juntas de baldosas de cocina, hay un truco sencillo que te ahorrará horas de esfuerzo.'
            ],
            tipDestacado: {
                titulo: '💡 La Regla de Oro de los 3 Minutos:',
                texto: 'Aplica el desengrasante con atomizador (puro para grasa pesada, o diluido 1:3 en agua para grasa ligera). <strong>No limpies inmediatamente:</strong> deja que la fórmula actúe exactamente 3 minutos. Notarás cómo la grasa se vuelve líquida. Luego, pasa un paño de microfibra humedecido en agua tibia. ¡Quedará rechinando de limpio sin rayar el acero!'
            },
            blogSlugRecomendado: 'desmanchar-ropa-blanca-oxigeno-activo-bicarbonato',
            blogTituloRecomendado: 'Guía de Eliminación de Grasa y Manchas Difíciles',
            blogResumenRecomendado: 'Aprende a combinar nuestros limpiadores biodegradables para remover cochambre y aceites pegados sin productos corrosivos.'
        }
    ],

    oxigeno_activo: [
        {
            semana: 1,
            categoria: 'oxigeno_activo',
            asunto: '🛡️ Adiós al cloro: cómo devolver la vida a sábanas y toallas sin romperlas',
            titulo: 'La química del oxígeno activo frente a la quemadura por cloro',
            subtitulo: 'Por qué tus prendas blancas durarán hasta 3 veces más tiempo',
            cuerpoParrafos: [
                'Hola, qué gusto saludarte. Te escriben Danilo y Julián.',
                'Si compraste nuestro Oxígeno Activo o Blanqueador Desinfectante, tomaste una de las decisiones más saludables para tu hogar. El hipoclorito de sodio común (cloro) es un veneno para las fibras de algodón: quema los hilos hasta volverlos quebradizos y, paradójicamente, con el tiempo amarillea las prendas blancas por la reacción con las sales del sudor.',
                'El oxígeno activo libera millones de microburbujas efervescentes que levantan la mancha por presión física, protegiendo tanto las telas blancas como las de color firme.'
            ],
            tipDestacado: {
                titulo: '💡 Cómo Activar el Percarbonato:',
                texto: 'Disuelve 30 gramos de Oxígeno Activo en medio litro de agua tibia antes de verterlo a la lavadora o al balde de remojo. El calor suave acelera la liberación del oxígeno naciente, logrando un blanqueamiento deslumbrante en sábanas, toallas y cuellos de camisa.'
            },
            blogSlugRecomendado: 'desmanchar-ropa-blanca-oxigeno-activo-bicarbonato',
            blogTituloRecomendado: 'Cómo Desmanchar Ropa Blanca sin Cloro: Oxígeno Activo y Bicarbonato',
            blogResumenRecomendado: 'Protocolo químico paso a paso para lavanderías, hoteles y familias que buscan máxima blancura y durabilidad textil.'
        }
    ],

    general: [
        {
            semana: 1,
            categoria: 'general',
            asunto: '🌱 Gracias por confiar en la industria limpia colombiana — Danilo y Julián',
            titulo: 'Limpieza con ética, honestidad y respeto por el cliente',
            subtitulo: 'Un mensaje directo de los fundadores de Biocambio360',
            cuerpoParrafos: [
                'Hola, te enviamos un abrazo muy especial de parte de Julián y Danilo, co-fundadores de Biocambio360.',
                'Queremos darte las gracias personalmente por habernos elegido. Empezamos este proyecto en Soacha con la convicción de que los hogares y empresas merecen productos de calidad industrial a precios justos, sin intermediarios especuladores y con fórmulas que no destruyan nuestros ríos ni la salud respiratoria de las personas que limpian con amor sus espacios.',
                'Queremos que tu experiencia sea perfecta. Si en algún momento tienes dudas de rendimiento, si un producto no cumple 100% tus expectativas o si necesitas un consejo para alguna mancha rebelde, nosotros mismos y nuestro equipo te atenderemos con honestidad y cariño.'
            ],
            tipDestacado: {
                titulo: '💡 Recuerda Nuestro Compromiso de Fábrica:',
                texto: 'Nuestras garrafas son reutilizables y nuestras concentraciones son de grado profesional. Si compartes nuestros productos con tus vecinos o familiares, estás apoyando la economía circular y la industria limpia de Colombia.'
            },
            blogSlugRecomendado: 'donde-comprar-canecas-productos-aseo-soacha-fabrica',
            blogTituloRecomendado: 'Economía Circular y Venta Directa de Fábrica en Cundinamarca',
            blogResumenRecomendado: 'Descubre por qué comprar directamente al fabricante reduce la huella plástica y optimiza el presupuesto mensual de aseo.'
        }
    ]
};

/**
 * Identifica la mejor categoría de nurturing según los productos del pedido
 */
export function detectNurtureCategory(items: { nombre: string }[]): string {
    const text = items.map(i => i.nombre.toLowerCase()).join(' ');
    if (text.includes('desengrasante') || text.includes('cocina') || text.includes('industrial')) {
        return 'desengrasante';
    }
    if (text.includes('oxigeno') || text.includes('oxígeno') || text.includes('blanqueador') || text.includes('bactokill')) {
        return 'oxigeno_activo';
    }
    if (text.includes('detergente') || text.includes('ropa') || text.includes('lavadora') || text.includes('suavizante')) {
        return 'detergente';
    }
    return 'general';
}

/**
 * Obtiene el tip correspondiente a la semana y productos del cliente
 */
export function getNurtureTip(category: string, weekNumber: number = 1): NurtureTip {
    const tips = NURTURE_CATALOG[category] || NURTURE_CATALOG['general'];
    const tip = tips.find(t => t.semana === weekNumber) || tips[0] || NURTURE_CATALOG['general'][0];
    return tip;
}

/**
 * Genera el HTML enriquecido del correo pos-venta de los fundadores
 */
export function renderNurtureEmailHtml(data: {
    customerName: string;
    tip: NurtureTip;
    orderId?: string;
}): string {
    const greeting = `<p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;">Apreciado(a) ${data.customerName}:</p>`;
    const paragraphsHtml = greeting + data.tip.cuerpoParrafos
        .map(p => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${p}</p>`)
        .join('');

    const blogBoxHtml = data.tip.blogSlugRecomendado ? `
        <div style="margin:28px 0;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:20px;text-align:left;">
            <span style="font-size:11px;font-weight:900;color:#1d4ed8;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px;">
                📖 Lectura Recomendada del Blog Biocambio360
            </span>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:900;color:#1e3a8a;line-height:1.4;">
                ${data.tip.blogTituloRecomendado}
            </h3>
            <p style="margin:0 0 14px;font-size:13px;color:#3b82f6;line-height:1.5;">
                ${data.tip.blogResumenRecomendado}
            </p>
            <a href="https://biocambio360.com/blog/${data.tip.blogSlugRecomendado}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(37,99,235,0.2);">
                Leer Artículo Completo en el Blog →
            </a>
        </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.tip.asunto}</title>
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
              
              <!-- Cabecera Cálida y Humana -->
              <tr>
                <td style="background:linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);padding:36px 32px;text-align:center;color:#ffffff;">
                  <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;">Bio<span style="color:#60a5fa;">Cambio</span><span style="color:#f472b6;">360</span></span>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;font-weight:500;">
                    Mensaje especial de Danilo y Julián · Co-fundadores
                  </p>
                </td>
              </tr>

              <!-- Cuerpo de la Carta -->
              <tr>
                <td style="padding:40px 32px;">
                  <span style="display:inline-block;padding:5px 14px;background:#ecfdf5;color:#047857;border-radius:100px;font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:16px;">
                    Semana ${data.tip.semana} Pos-Entrega · Comunidad Biocambio360
                  </span>

                  <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:900;line-height:1.3;">
                    ${data.tip.titulo}
                  </h1>
                  <p style="margin:0 0 24px;color:#64748b;font-size:14px;font-style:italic;">
                    ${data.tip.subtitulo}
                  </p>

                  <div style="border-top:1px solid #f1f5f9;padding-top:20px;margin-bottom:20px;">
                    ${paragraphsHtml}
                  </div>

                  <!-- Tip Destacado de Fábrica -->
                  <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:12px;padding:18px 20px;margin:24px 0;">
                    <p style="margin:0 0 6px;color:#065f46;font-size:14px;font-weight:900;">
                      ${data.tip.tipDestacado.titulo}
                    </p>
                    <p style="margin:0;color:#047857;font-size:14px;line-height:1.6;">
                      ${data.tip.tipDestacado.texto}
                    </p>
                  </div>

                  ${blogBoxHtml}

                  <!-- Despedida Cercana con Firma -->
                  <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;">
                    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
                      Esperamos que estos pequeños secretos te sean de gran utilidad. Si tienes alguna prenda con manchas difíciles o quieres preguntarnos sobre diluciones especiales, solo dale responder a este correo o escríbenos directamente a WhatsApp. ¡Estamos para servirte!
                    </p>
                    <p style="margin:16px 0 0;font-size:14px;color:#0f172a;line-height:1.5;">
                      Con cariño, respeto y lealtad,<br>
                      <strong>Julián y Danilo</strong><br>
                      <span style="color:#64748b;font-size:12px;">Co-fundadores de Biocambio360 S.A.S.</span>
                    </p>
                  </div>

                  <!-- Botón de Contacto Amigable -->
                  <div style="text-align:center;margin-top:28px;">
                    <a href="https://wa.me/573241005353?text=Hola%20Juli%C3%A1n%20y%20Danilo%2C%20recib%C3%AD%20su%20correo%20de%20tips%20y%20tengo%20una%20pregunta" target="_blank" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:100px;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
                      💬 Escribirle a Danilo y Julián por WhatsApp
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer Ético -->
              <tr>
                <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
                  <p style="margin:0 0 6px;">Biocambio360 S.A.S. — Fábrica Principal: Cra. 7C #44-17 Sur, Soacha, Cundinamarca</p>
                  <p style="margin:0;">
                    Este correo busca compartir valor y educación para el cuidado de tu hogar. Cero spam, 100% gratitud y honestidad.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
}

/**
 * Envía un correo de nurturing semanal a un cliente
 */
export async function sendWeeklyNurtureEmail(data: {
    customerEmail: string;
    customerName: string;
    orderId?: string;
    purchasedProducts?: { nombre: string }[];
    weekNumber?: number;
}): Promise<{ success: boolean; error?: string; tipSent?: NurtureTip }> {
    if (!data.customerEmail) {
        return { success: false, error: 'Email de cliente requerido' };
    }

    const items = data.purchasedProducts || [{ nombre: 'Detergente Líquido para Ropa' }];
    const category = detectNurtureCategory(items);
    const tip = getNurtureTip(category, data.weekNumber || 1);
    const html = renderNurtureEmailHtml({
        customerName: data.customerName,
        tip,
        orderId: data.orderId
    });

    const result = await emailTransport.send({
        sender: { name: 'Julián y Danilo — Biocambio360', email: 'daniloyjulian@biocambio360.com' },
        to: [{ email: data.customerEmail, name: data.customerName }],
        subject: tip.asunto,
        htmlContent: html
    });

    return {
        success: result.success,
        error: result.error,
        tipSent: tip
    };
}
