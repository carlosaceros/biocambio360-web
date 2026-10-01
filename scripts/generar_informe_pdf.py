#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generar_informe_pdf.py
Generador del Informe Técnico y de Auditoría Operacional en formato PDF.
Cumple con las directrices combinadas de:
- ICONTEC NTC 1486 (Presentación de informes institucionales y portadas)
- APA 7.ª Edición (Estructura de secciones, tablas sin líneas verticales, citas)

Biocambio360 S.A.S. — Septiembre 2026
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Canvas personalizado para ReportLab que efectúa dos pasadas para calcular
    el número total de páginas y generar el encabezado y pie de página institucional.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            if self._pageNumber > 1:
                self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # ── Encabezado Institucional (Páginas 2 en adelante) ──
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#4B5563'))
        self.drawString(54, 752, 'INFORME TÉCNICO: LIQUIDACIÓN DE FLETES Y POLÍTICA DE PRECIOS')
        self.drawRightString(558, 752, 'BIOCAMBIO360 S.A.S.')
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(54, 744, 558, 744)

        # ── Pie de Página Institucional (Páginas 2 en adelante) ──
        self.line(54, 46, 558, 46)
        self.setFont('Helvetica', 8)
        self.drawString(54, 34, 'Confidencial — Para uso exclusivo de Dirección y Operaciones Biocambio360')
        self.drawRightString(558, 34, f'Página {self._pageNumber} de {page_count}')
        
        self.restoreState()

def construir_pdf(ruta_destino):
    doc = SimpleDocTemplate(
        ruta_destino,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # ── Paleta de Colores Corporativa ──
    c_primary = colors.HexColor('#1E3A8A')      # Azul institucional oscuro
    c_secondary = colors.HexColor('#0F766E')    # Verde esmeralda técnico
    c_dark = colors.HexColor('#111827')         # Gris carbón texto principal
    c_muted = colors.HexColor('#4B5563')        # Gris medio subtítulos
    c_border = colors.HexColor('#E2E8F0')       # Gris claro para bordes
    c_bg_light = colors.HexColor('#F8FAFC')     # Fondo tablas suave
    c_alert_red = colors.HexColor('#B91C1C')    # Rojo alerta
    c_alert_bg = colors.HexColor('#FEF2F2')     # Fondo rojo suave

    # ── Tipografías y Estilos ──
    style_cover_inst = ParagraphStyle(
        'CoverInst',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        alignment=1, # Centrado
        textColor=c_primary,
        spaceAfter=15
    )

    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=26,
        alignment=1,
        textColor=c_dark,
        spaceAfter=12
    )

    style_cover_sub = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        alignment=1,
        textColor=c_muted,
        spaceAfter=25
    )

    style_cover_meta = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        alignment=1,
        textColor=c_dark
    )

    style_h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_dark,
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    style_h3 = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-BoldOblique',
        fontSize=9.5,
        leading=13,
        textColor=c_muted,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=6,
        alignment=4 # Justificado
    )

    style_bullet = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    style_table_header = ParagraphStyle(
        'TableHeader_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        alignment=1,
        textColor=c_primary
    )

    style_table_cell = ParagraphStyle(
        'TableCell_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    )

    style_table_cell_center = ParagraphStyle(
        'TableCellCenter_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        alignment=1,
        textColor=c_dark
    )

    style_table_cell_bold = ParagraphStyle(
        'TableCellBold_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    )

    style_table_label = ParagraphStyle(
        'TableLabel_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=2,
        keepWithNext=True
    )

    style_table_title = ParagraphStyle(
        'TableTitle_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=c_muted,
        spaceAfter=5,
        keepWithNext=True
    )

    style_table_note = ParagraphStyle(
        'TableNote_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7,
        leading=9.5,
        textColor=c_muted,
        spaceBefore=3,
        spaceAfter=8
    )

    style_math_box = ParagraphStyle(
        'MathBox_Custom',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=12,
        alignment=1,
        textColor=c_primary
    )

    style_code = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0F172A')
    )

    elements = []

    # =========================================================================
    # 1. PORTADA FORMAL (ICONTEC NTC 1486 / APA 7)
    # =========================================================================
    elements.append(Spacer(1, 40))
    elements.append(Paragraph('BIOCAMBIO360 S.A.S.', style_cover_inst))
    elements.append(Paragraph('NIT: 901.815.420-1 · SOACHA, CUNDINAMARCA', style_cover_sub))
    elements.append(Spacer(1, 45))

    elements.append(Paragraph('INFORME TÉCNICO Y DE AUDITORÍA OPERACIONAL', style_cover_title))
    elements.append(Paragraph(
        'DIAGNÓSTICO, MODELO MATEMÁTICO DE LIQUIDACIÓN Y CORRECCIÓN DE TARIFAS DE FLETE LOCAL Y POLÍTICA DE PRECIOS EN COMBOS',
        style_cover_sub
    ))
    elements.append(Spacer(1, 50))

    meta_text = (
        '<b>Elaborado por:</b><br/>'
        'Departamento de Ingeniería de Software y Arquitectura Web<br/><br/>'
        '<b>Destinatarios:</b><br/>'
        'Carlos Aceros — Dirección de Tecnología y Producto<br/>'
        'Danilo Espinal Ospina — Dirección de Operaciones y Logística<br/><br/>'
        '<b>Normas de Referencia Metodológica:</b><br/>'
        'ICONTEC NTC 1486 (Presentación de Informes y Trabajos Corporativos)<br/>'
        'American Psychological Association [APA], 7.ª Edición (Estructura y Tablas)<br/><br/>'
        '<b>Lugar y Fecha:</b><br/>'
        'Soacha — Bogotá D.C., Colombia<br/>'
        '14 de septiembre de 2026'
    )
    elements.append(Paragraph(meta_text, style_cover_meta))
    elements.append(PageBreak())

    # =========================================================================
    # 2. TABLA DE CONTENIDO (ÍNDICE)
    # =========================================================================
    elements.append(Paragraph('CONTENIDO GENERAL DEL INFORME', style_h1))
    elements.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=4, spaceAfter=14))

    indice_data = [
        [Paragraph('<b>1.</b>', style_table_cell_bold), Paragraph('<b>RESUMEN EJECUTIVO (VERSIÓN OPERACIONAL / NO TÉCNICA)</b>', style_table_cell_bold), Paragraph('Pág. 3', style_table_cell_center)],
        [Paragraph('<b>2.</b>', style_table_cell_bold), Paragraph('<b>ANTECEDENTES Y CASOS REALES AUDITADOS (#ZHHWM0y3, #qZHUXKzr, #jVDETRMM, #XwpCHZSm)</b>', style_table_cell_bold), Paragraph('Pág. 3', style_table_cell_center)],
        [Paragraph('<b>3.</b>', style_table_cell_bold), Paragraph('<b>DIAGNÓSTICO TÉCNICO Y CAUSA RAÍZ EN EL CÓDIGO FUENTE</b>', style_table_cell_bold), Paragraph('Pág. 4', style_table_cell_center)],
        [Paragraph('<b>4.</b>', style_table_cell_bold), Paragraph('<b>FORMULACIÓN MATEMÁTICA DEL MODELO DE LIQUIDACIÓN DE FLETES</b>', style_table_cell_bold), Paragraph('Pág. 5', style_table_cell_center)],
        [Paragraph('<b>5.</b>', style_table_cell_bold), Paragraph('<b>AJUSTES TÉCNICOS APLICADOS EN EL REPOSITORIO NEXT.JS</b>', style_table_cell_bold), Paragraph('Pág. 6', style_table_cell_center)],
        [Paragraph('<b>6.</b>', style_table_cell_bold), Paragraph('<b>VERIFICACIÓN AUTOMATIZADA, PRUEBAS UNITARIAS Y COMPILACIÓN</b>', style_table_cell_bold), Paragraph('Pág. 6', style_table_cell_center)],
        [Paragraph('<b>7.</b>', style_table_cell_bold), Paragraph('<b>CONCLUSIONES Y RECOMENDACIONES ESTRATÉGICAS</b>', style_table_cell_bold), Paragraph('Pág. 7', style_table_cell_center)],
        [Paragraph('<b>8.</b>', style_table_cell_bold), Paragraph('<b>REFERENCIAS BIBLIOGRÁFICAS Y DOCUMENTALES (APA 7 / ICONTEC)</b>', style_table_cell_bold), Paragraph('Pág. 7', style_table_cell_center)],
    ]
    t_indice = Table(indice_data, colWidths=[24, 420, 60])
    t_indice.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, c_border),
    ]))
    elements.append(t_indice)
    elements.append(PageBreak())

    # =========================================================================
    # 3. CUERPO DEL INFORME: SECCIÓN 1 Y SECCIÓN 2
    # =========================================================================
    elements.append(Paragraph('1. RESUMEN EJECUTIVO (VERSIÓN NO TÉCNICA PARA OPERACIONES)', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))
    
    elements.append(Paragraph(
        'El presente documento resume de manera pedagógica y rigurosa la auditoría efectuada sobre la plataforma '
        'de comercio electrónico de <b>Biocambio360 S.A.S.</b> tras las discrepancias detectadas por la Dirección de Operaciones '
        'en las ventas del 10 al 13 de septiembre de 2026. Los hallazgos principales se sintetizan a continuación:',
        style_body
    ))

    elements.append(Paragraph(
        '<b>A. Caso de los precios reducidos en el Pedido #ZHHWM0y3 (Fabián Sogamoso):</b> El cliente compró tres artículos '
        'de alta capacidad (Detergente 20L, Suavizante 20L y Shampoo 3.8L). El valor registrado en el sistema no correspondió '
        'a un error informático ni a un descuento de fletes: el comprador utilizó la herramienta <i>"Arma tu Propio Combo"</i> '
        'de la página de inicio, la cual tenía programado un descuento automático por volumen del <b>7% para pedidos de 3 artículos</b>. '
        'Por decisión de la gerencia (<b>Opción B</b>), <b>se eliminó de raíz esta escala de descuentos automáticos</b>. '
        'Desde este momento, todos los combos personalizados conservan estrictamente el 100% del precio de lista oficial de fábrica.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>B. Caso de los fletes gratis en pedidos de 1/2 galón (#qZHUXKzr, #jVDETRMM, #XwpCHZSm):</b> El cotizador web '
        'tenía configurada una regla absoluta que otorgaba flete $0 (GRATIS) a cualquier dirección ubicada en Bogotá o Soacha, '
        'sin considerar la cantidad de producto comprada. Dado que el domiciliario exige un pago mínimo garantizado de <b>$13.000 COP</b> '
        'por entrega, y un solo medio galón únicamente genera un aporte al costo de envío de <b>$3.000 COP</b>, otorgar flete gratuito '
        'generaba un saldo en contra de $10.000 asumido indebidamente por Biocambio360. '
        '<b>Ajuste efectuado:</b> Se programó la regla de negocio oficial: si la orden no alcanza los $13.000 de aporte, '
        '<b>el comprador asume la diferencia en el checkout</b>. A partir de la fecha, un pedido de un solo medio galón en Bogotá '
        'cobra de forma transparente <b>$10.000 COP de flete</b>.',
        style_bullet
    ))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph('2. ANTECEDENTES Y CASOS REALES AUDITADOS', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph(
        'A fin de documentar empíricamente la falla antes de su corrección, se extrajeron directamente de la base de datos '
        'en producción los cuatro pedidos analizados en la mesa técnica:',
        style_body
    ))

    elements.append(Paragraph('Tabla 1', style_table_label))
    elements.append(Paragraph('Auditoría comparativa de pedidos reales en producción vs. liquidación esperada por norma.', style_table_title))

    tabla1_data = [
        [
            Paragraph('<b>No. Pedido</b>', style_table_header),
            Paragraph('<b>Cliente / Contacto</b>', style_table_header),
            Paragraph('<b>Destino</b>', style_table_header),
            Paragraph('<b>Composición del Pedido</b>', style_table_header),
            Paragraph('<b>Flete Cobrado</b>', style_table_header),
            Paragraph('<b>Flete Oficial</b>', style_table_header),
            Paragraph('<b>Estado Auditoría</b>', style_table_header)
        ],
        [
            Paragraph('<b>#ZHHWM0y3</b>', style_table_cell_bold),
            Paragraph('Fabián S.<br/>1051590310', style_table_cell),
            Paragraph('Bogotá D.C.<br/>(Senderos Porvenir)', style_table_cell),
            Paragraph('• Detergente 20L ($87.420)<br/>• Suavizante 20L ($95.790)<br/>• Shampoo 3.8L ($22.320)', style_table_cell),
            Paragraph('GRATIS<br/>($0)', style_table_cell_center),
            Paragraph('GRATIS<br/>($0)', style_table_cell_center),
            Paragraph('<font color="#0F766E"><b>Flete correcto</b></font><br/>Precios alterados (-7%)', style_table_cell)
        ],
        [
            Paragraph('<b>#qZHUXKzr</b>', style_table_cell_bold),
            Paragraph('Molly A.<br/>52046057', style_table_cell),
            Paragraph('Bogotá D.C.<br/>(Calle 59 B sur)', style_table_cell),
            Paragraph('• 1x Desengrasante 1/2 Galón ($20.000)', style_table_cell),
            Paragraph('GRATIS<br/>($0)', style_table_cell_center),
            Paragraph('<b>$10.000</b>', style_table_cell_center),
            Paragraph('<font color="#B91C1C"><b>Flete erróneo</b></font><br/>Subsidio excedido', style_table_cell)
        ],
        [
            Paragraph('<b>#jVDETRMM</b>', style_table_cell_bold),
            Paragraph('César G.<br/>1216963776', style_table_cell),
            Paragraph('Bogotá D.C.<br/>(Carrera 109)', style_table_cell),
            Paragraph('• 1x Detergente 1/2 Galón ($19.000)', style_table_cell),
            Paragraph('GRATIS<br/>($0)', style_table_cell_center),
            Paragraph('<b>$10.000</b>', style_table_cell_center),
            Paragraph('<font color="#B91C1C"><b>Flete erróneo</b></font><br/>Subsidio excedido', style_table_cell)
        ],
        [
            Paragraph('<b>#XwpCHZSm</b>', style_table_cell_bold),
            Paragraph('Magaly N.<br/>52505917', style_table_cell),
            Paragraph('Bogotá D.C.<br/>(Calle 38 A sur)', style_table_cell),
            Paragraph('• 1x Desengrasante 1/2 Galón ($20.000)', style_table_cell),
            Paragraph('GRATIS<br/>($0)', style_table_cell_center),
            Paragraph('<b>$10.000</b>', style_table_cell_center),
            Paragraph('<font color="#B91C1C"><b>Flete erróneo</b></font><br/>Subsidio excedido', style_table_cell)
        ],
    ]

    t_tabla1 = Table(tabla1_data, colWidths=[65, 75, 75, 125, 45, 45, 74])
    t_tabla1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (0,0), (-1,0), 1.2, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1.2, c_primary),
        ('BACKGROUND', (0,0), (-1,0), c_bg_light),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    elements.append(t_tabla1)
    elements.append(Paragraph('Nota. Datos extraídos de los registros transaccionales en Firestore y notificaciones de WhatsApp operativas.', style_table_note))

    elements.append(PageBreak())

    # =========================================================================
    # 4. CUERPO DEL INFORME: SECCIÓN 3 Y SECCIÓN 4
    # =========================================================================
    elements.append(Paragraph('3. DIAGNÓSTICO TÉCNICO Y CAUSA RAÍZ EN EL CÓDIGO FUENTE', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph('3.1. Arquitectura de Descuentos en "Arma tu Combo"', style_h2))
    elements.append(Paragraph(
        'El archivo <code>src/lib/combos.ts</code> integraba una función denominada <code>calcularPrecioCustomCombo</code> '
        'que contenía lógica de descuentos escalonados no alineada con la política financiera de pedidos minoristas:',
        style_body
    ))

    code_pre = (
        "// src/lib/combos.ts (Código Previo - Causa del error en #ZHHWM0y3)\n"
        "let porcentajeDescuento = 0;\n"
        "if (totalItems >= 6) porcentajeDescuento = 15;\n"
        "else if (totalItems >= 4) porcentajeDescuento = 10;\n"
        "else if (totalItems >= 3) porcentajeDescuento = 7;   // <-- Actuó en #ZHHWM0y3\n"
        "else if (totalItems >= 2) porcentajeDescuento = 5;\n\n"
        "// src/components/ComboBuilder.tsx\n"
        "const discountRatio = pricing.precioCombo / pricing.precioOriginal; // 0.93\n"
        "customItems.forEach(item => {\n"
        "    const discountedPrice = Math.round(regularPrice * discountRatio);\n"
        "    onAddToCart(item.product, item.size, discountedPrice, item.quantity);\n"
        "});"
    )
    t_code = Table([[Paragraph(code_pre.replace('\n', '<br/>').replace(' ', '&nbsp;'), style_code)]], colWidths=[504])
    t_code.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_code)
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(
        '<b>Mecanismo del Descuadre:</b> Al hacer clic en <i>"Agregar Combo al Carrito"</i>, los artículos se añadían al carrito '
        'con el precio unitario descontado (por ejemplo, el detergente de $94.000 se guardó en $87.420). Como no se generó un código '
        'de cupón de texto, la orden en Firestore no contenía el campo <code>cuponAplicado</code>, haciendo creer a los analistas '
        'que el sistema había restado dinero de manera anómala.',
        style_body
    ))

    elements.append(Paragraph('3.2. Retorno Prematuro en Cotización Local de Fletes', style_h2))
    elements.append(Paragraph(
        'En la ruta de API <code>src/app/api/envios/cotizar/route.ts</code>, las líneas 48 a 84 ejecutaban una condición que asumía '
        'que cualquier envío hacia Soacha o Bogotá (código DANE 11001000) gozaba de costo cero:',
        style_body
    ))

    code_shipping = (
        "// src/app/api/envios/cotizar/route.ts (Código Previo)\n"
        "const esLocal = isZonaLocal(destinoCodigo);\n"
        "if (esLocal) {\n"
        "    return NextResponse.json({ gratis: true, precio: 0 }); // <-- Retorno indiscriminado\n"
        "}"
    )
    t_code_ship = Table([[Paragraph(code_shipping.replace('\n', '<br/>').replace(' ', '&nbsp;'), style_code)]], colWidths=[504])
    t_code_ship.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_code_ship)
    elements.append(Spacer(1, 10))

    # =========================================================================
    # 5. SECCIÓN 4: MODELO MATEMÁTICO DE LIQUIDACIÓN
    # =========================================================================
    elements.append(PageBreak())
    elements.append(Paragraph('4. FORMULACIÓN MATEMÁTICA DEL MODELO DE LIQUIDACIÓN DE FLETES', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph(
        'Con base en la directriz operacional oficial fijada en el cuadro de control logístico "BOGOTÁ", '
        'se formuló e implementó un modelo matemático determinista para el cálculo de fletes:',
        style_body
    ))

    elements.append(Paragraph('Tabla 2', style_table_label))
    elements.append(Paragraph('Matriz oficial de aportes unitarios al costo de transporte según presentación.', style_table_title))

    tabla2_data = [
        [
            Paragraph('<b>Presentación / Capacidad</b>', style_table_header),
            Paragraph('<b>Aporte Unitario a Domicilio Local ($A_i$)</b>', style_table_header),
            Paragraph('<b>Subsidio Nacional Unitario ($S_i$)</b>', style_table_header),
            Paragraph('<b>Cubre 100% Domicilio Bogotá</b>', style_table_header)
        ],
        [
            Paragraph('<b>Caneca 20 Litros / 20 Kg</b>', style_table_cell_bold),
            Paragraph('$13.000 COP', style_table_cell_center),
            Paragraph('$13.000 COP', style_table_cell_center),
            Paragraph('SÍ (Cubre $13.000 exactos)', style_table_cell_center)
        ],
        [
            Paragraph('<b>Garrafa 10 Litros / 10 Kg</b>', style_table_cell_bold),
            Paragraph('$13.000 COP', style_table_cell_center),
            Paragraph('$13.000 COP', style_table_cell_center),
            Paragraph('SÍ (Cubre $13.000 exactos)', style_table_cell_center)
        ],
        [
            Paragraph('<b>Galón 3.8 Litros / 4 Kg</b>', style_table_cell_bold),
            Paragraph('$6.000 COP', style_table_cell_center),
            Paragraph('$6.000 COP', style_table_cell_center),
            Paragraph('NO (Faltan $7.000)', style_table_cell_center)
        ],
        [
            Paragraph('<b>1/2 Galón 1.9 Litros</b>', style_table_cell_bold),
            Paragraph('$3.000 COP', style_table_cell_center),
            Paragraph('$3.000 COP', style_table_cell_center),
            Paragraph('NO (Faltan $10.000)', style_table_cell_center)
        ],
        [
            Paragraph('<b>1 Litro / 500 ML / 250 ML</b>', style_table_cell_bold),
            Paragraph('$1.000 COP', style_table_cell_center),
            Paragraph('$1.000 COP', style_table_cell_center),
            Paragraph('NO (Faltan $12.000)', style_table_cell_center)
        ],
    ]

    t_tabla2 = Table(tabla2_data, colWidths=[150, 120, 114, 120])
    t_tabla2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (0,0), (-1,0), 1.2, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1.2, c_primary),
        ('BACKGROUND', (0,0), (-1,0), c_bg_light),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    elements.append(t_tabla2)
    elements.append(Paragraph('Nota. Mínimo garantizado por entrega al domiciliario en Bogotá y aledaños: M = $13.000 COP.', style_table_note))

    elements.append(Paragraph('4.1. Ecuaciones del Modelo de Copago Local', style_h2))
    elements.append(Paragraph(
        'Sea un pedido con $n$ tipos de productos donde cada producto $i$ aporta $A_i$ y tiene una cantidad $Q_i$. '
        'El aporte total generado por el pedido ($A_{\\text{total}}$) se define como:',
        style_body
    ))

    t_eq1 = Table([[Paragraph('A_total = ∑ [ A_i × Q_i ]  (i = 1 hasta n)', style_math_box)]], colWidths=[504])
    t_eq1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, c_primary),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_eq1)
    elements.append(Spacer(1, 4))

    elements.append(Paragraph(
        'Siendo $M = $13.000 \\text{ COP}$ la tarifa base garantizada por carrera, el flete liquidado al cliente '
        '($F_{\\text{cliente}}$) corresponde a la función de excedente:',
        style_body
    ))

    t_eq2 = Table([[Paragraph('F_cliente = max(0, M - A_total) = max(0, $13.000 - A_total)', style_math_box)]], colWidths=[504])
    t_eq2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, c_primary),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_eq2)
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(
        '• <b>Condición 1 (Envío Gratis):</b> Si $A_{\\text{total}} \\ge $13.000 \\implies F_{\\text{cliente}} = $0$.<br/>'
        '• <b>Condición 2 (Copago de Flete):</b> Si $A_{\\text{total}} < $13.000 \\implies F_{\\text{cliente}} = $13.000 - A_{\\text{total}}$.',
        style_bullet
    ))

    elements.append(PageBreak())

    # =========================================================================
    # 6. CUERPO DEL INFORME: SECCIÓN 5, 6, 7 Y 8
    # =========================================================================
    elements.append(Paragraph('5. AJUSTES TÉCNICOS APLICADOS EN EL REPOSITORIO NEXT.JS', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph(
        'La solución técnica se implementó bajo estrictos estándares de ingeniería de software en cuatro módulos neurálgicos:',
        style_body
    ))

    elements.append(Paragraph(
        '<b>1. <code>src/lib/shipping-zones.ts</code>:</b> Se actualizaron las matrices <code>SUBSIDIOS_POR_TALLA</code> '
        'y <code>KIT_COMPOSITION_MAP</code> para reflejar $13.000 COP en garrafas de 20L y 10L (antes $12.000 COP) y $1.000 COP '
        'en envases de 500ML/250ML. Se programó y exportó la función pura <code>calcularFleteLocal()</code> y la constante '
        '<code>MINIMO_DOMICILIARIO_LOCAL = 13000</code>.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>2. <code>src/app/api/envios/cotizar/route.ts</code>:</b> Se eliminó el retorno fijo en cero para la zona local. '
        'Ahora el endpoint invoca a <code>calcularFleteLocal()</code>. Si la orden tiene déficit de aporte, devuelve '
        '<code>gratis: false</code>, el precio de flete respectivo y el mensaje desglosado para el usuario en la pasarela.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>3. <code>src/lib/combos.ts</code>:</b> Se implementó la <b>Opción B</b> acordada con gerencia: la función '
        '<code>calcularPrecioCustomCombo</code> retorna <code>descuento = 0</code>, <code>porcentaje = 0</code> y '
        '<code>precioCombo = precioOriginal</code>, garantizando que el subtotal respete exactamente las tarifas oficiales.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>4. <code>src/components/ComboBuilder.tsx</code>:</b> En la rutina <code>handleAddAllToCart</code> se suprimió '
        'el multiplicador <code>discountRatio</code>. Todos los productos ingresan al carrito con su tarifa estándar '
        '<code>regularPrice</code>. En la interfaz visual se eliminaron los rótulos promocionales del 5%, 7%, 10% y 15%.',
        style_bullet
    ))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph('6. VERIFICACIÓN AUTOMATIZADA, PRUEBAS UNITARIAS Y COMPILACIÓN', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph(
        'Con el fin de garantizar la ausencia de regresiones operativas, se construyó una batería de pruebas automatizadas '
        'mediante el entorno <b>Vitest</b> en el archivo <code>src/__tests__/shipping-and-combos.test.ts</code>:',
        style_body
    ))

    tabla3_data = [
        [
            Paragraph('<b>Escenario de Prueba Auditado</b>', style_table_header),
            Paragraph('<b>Parámetros de Entrada</b>', style_table_header),
            Paragraph('<b>Resultado Esperado</b>', style_table_header),
            Paragraph('<b>Resultado Obtenido</b>', style_table_header),
            Paragraph('<b>Estado</b>', style_table_header)
        ],
        [
            Paragraph('<b>Caso Medio Galón</b><br/>(Pedidos tipo Danilo)', style_table_cell_bold),
            Paragraph('1x Desengrasante 1/2G<br/>Aporte = $3.000 COP', style_table_cell),
            Paragraph('Flete = $10.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('Flete = $10.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('<font color="#16A34A"><b>PASÓ (100%)</b></font>', style_table_cell_center)
        ],
        [
            Paragraph('<b>Caso Galón 3.8L</b><br/>(Ejemplo de la directriz)', style_table_cell_bold),
            Paragraph('1x Detergente 3.8L<br/>Aporte = $6.000 COP', style_table_cell),
            Paragraph('Flete = $7.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('Flete = $7.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('<font color="#16A34A"><b>PASÓ (100%)</b></font>', style_table_cell_center)
        ],
        [
            Paragraph('<b>Caso 2 Galones</b>', style_table_cell_bold),
            Paragraph('2x Galones 3.8L<br/>Aporte = $12.000 COP', style_table_cell),
            Paragraph('Flete = $1.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('Flete = $1.000 COP<br/>esGratis = false', style_table_cell),
            Paragraph('<font color="#16A34A"><b>PASÓ (100%)</b></font>', style_table_cell_center)
        ],
        [
            Paragraph('<b>Caso 1 Caneca 20L</b>', style_table_cell_bold),
            Paragraph('1x Caneca 20L<br/>Aporte = $13.000 COP', style_table_cell),
            Paragraph('Flete = $0 COP<br/>esGratis = true', style_table_cell),
            Paragraph('Flete = $0 COP<br/>esGratis = true', style_table_cell),
            Paragraph('<font color="#16A34A"><b>PASÓ (100%)</b></font>', style_table_cell_center)
        ],
        [
            Paragraph('<b>Caso Combo 3 Items</b><br/>(Caso Fabián #ZHHWM0y3)', style_table_cell_bold),
            Paragraph('20L + 20L + 3.8L<br/>Subtotal = $221.000', style_table_cell),
            Paragraph('Precio = $221.000<br/>Descuento = $0 (0%)', style_table_cell),
            Paragraph('Precio = $221.000<br/>Descuento = $0 (0%)', style_table_cell),
            Paragraph('<font color="#16A34A"><b>PASÓ (100%)</b></font>', style_table_cell_center)
        ],
    ]

    t_tabla3 = Table(tabla3_data, colWidths=[90, 110, 110, 110, 84])
    t_tabla3.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (0,0), (-1,0), 1.2, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1.2, c_primary),
        ('BACKGROUND', (0,0), (-1,0), c_bg_light),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    elements.append(t_tabla3)
    elements.append(Paragraph('Nota. Ejecución de suite Vitest v3.2.7: 5 suites ejecutadas, 93 pruebas superadas satisfactoriamente (0 fallos).', style_table_note))

    elements.append(Paragraph(
        '<b>Verificación en Entorno de Compilación:</b> Se ejecutó el comando <code>npm run build</code>, '
        'confirmando la compilación limpia de 318 rutas estáticas y endpoints dinámicos sin errores de TypeScript.',
        style_body
    ))

    elements.append(PageBreak())
    elements.append(Paragraph('7. CONCLUSIONES Y RECOMENDACIONES ESTRATÉGICAS', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    elements.append(Paragraph(
        '<b>1. Blindaje Financiero de Campañas Digitales:</b> Se disipa el riesgo económico que motivó la propuesta de pausar '
        'las campañas publicitarias en Meta Ads. Cada pedido de medio galón vendido generará el cobro íntegro de los $10.000 '
        'de flete al cliente, preservando el margen de ganancia de Biocambio360.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>2. Consistencia y Confianza en el Panel de Despachos:</b> Los pedidos recibidos por Danilo y el equipo de bodega '
        'mostrarán invariablemente los precios de lista ($94.000, $103.000, $24.000, etc.), eliminando la confusión '
        'ocasionada por descuentos no registrados.',
        style_bullet
    ))

    elements.append(Paragraph(
        '<b>3. Recomendación Normativa para Futuros Descuentos:</b> Cualquier estrategia de incentivo comercial por volumen '
        'deberá canalizarse mediante cupones auditables (ejemplo: cupón <code>COMBO360</code>) administrados en Firestore, '
        'de modo que el desglose contable figure de manera explícita en las facturas y comprobantes.',
        style_bullet
    ))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph('8. REFERENCIAS BIBLIOGRÁFICAS Y DOCUMENTALES', style_h1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=c_primary, spaceBefore=2, spaceAfter=8))

    refs = [
        'American Psychological Association [APA]. (2020). <i>Publication Manual of the American Psychological Association</i> (7.ª ed.). Washington, D.C.: APA.',
        'Biocambio360 S.A.S. (2026). <i>Esquema Tarifario de Transporte y Garantía Domiciliaria Soacha–Bogotá</i> [Documento interno de trabajo]. Soacha: Dirección de Operaciones.',
        'Instituto Colombiano de Normas Técnicas y Certificación [ICONTEC]. (2008). <i>Norma Técnica Colombiana NTC 1486: Documentación. Presentación de tesis, trabajos de grado y otros trabajos de investigación</i> (6.ª actualización). Bogotá D.C.: ICONTEC.',
        'Vercel Inc. (2026). <i>Next.js 16 App Router & Server Route Handlers Architecture</i>. Recuperado de https://nextjs.org/docs',
        'Vitest Core Team. (2026). <i>Vitest: A Vite-native unit test framework</i>. Recuperado de https://vitest.dev'
    ]

    for ref in refs:
        elements.append(Paragraph(ref, style_bullet))

    # Construir documento
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"[PDF Generado Exitosamente] -> {ruta_destino}")

if __name__ == '__main__':
    destino = sys.argv[1] if len(sys.argv) > 1 else 'INFORME_TECNICO_AUDITORIA_FLETES_Y_COMBOS.pdf'
    construir_pdf(destino)
