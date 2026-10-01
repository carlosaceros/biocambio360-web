#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generar_manual_referidos_pdf.py
Generador del Manual Operativo, de Atención al Cliente y Gestión Comercial
del Programa de Referidos y Embajadores "Comunidad BioCambio360".

Estándares aplicados:
- ICONTEC NTC 1486: Estructura de documentos institucionales, portadas, contraportadas,
  créditos, jerarquía decimal, márgenes y presentación formal.
- APA 7.ª Edición: Tablas formales (sin líneas verticales), notas aclaratorias al pie de tabla,
  jerarquía de encabezados, marco normativo y referencias bibliográficas.

Diseñado por THINK TIC S.A.S. para BIOCAMBIO360 S.A.S. — Septiembre 2026.
"""

import os
import sys
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Canvas de ReportLab de doble pasada para calcular el total exacto de páginas
    y dibujar encabezados y pies de página institucionales conforme a ICONTEC / APA.
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
            if self._pageNumber > 2:  # No mostrar en Portada (p.1) ni Contraportada (p.2)
                self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # ── Encabezado Institucional (Páginas 3 en adelante) ──
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#4B5563'))
        self.drawString(54, 752, 'MANUAL OPERATIVO Y COMERCIAL: ESTRATEGIA DE REFERIDOS Y EMBAJADORES')
        self.drawRightString(558, 752, 'BIOCAMBIO360 & THINK TIC')
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(54, 744, 558, 744)

        # ── Pie de Página Institucional ──
        self.line(54, 46, 558, 46)
        self.setFont('Helvetica', 8)
        self.drawString(54, 34, 'Documento de Gestión Interna — Equipo de Atención al Cliente y Ventas')
        self.drawRightString(558, 34, f'Página {self._pageNumber} de {page_count}')
        
        self.restoreState()


def crear_caja_destacada(titulo, texto, color_fondo, color_borde, color_texto_titulo, width=504):
    """Genera una caja de llamada visualmente atractiva para guiones o alertas."""
    p_title = Paragraph(f"<b>{titulo}</b>", ParagraphStyle(
        'CalloutTitle',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=color_texto_titulo,
        spaceAfter=3
    ))
    p_body = Paragraph(texto, ParagraphStyle(
        'CalloutBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1F2937')
    ))
    
    t = Table([[ [p_title, p_body] ]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), color_fondo),
        ('BOX', (0,0), (-1,-1), 1, color_borde),
        ('TOPPADDING', (0,0), (-1,-1), 5.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5.5),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    return t


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

    # ── Paleta de Colores Corporativa Biocambio360 & Think TIC ──
    c_primary = colors.HexColor('#1E3A8A')      # Azul institucional profundo
    c_secondary = colors.HexColor('#047857')    # Verde esmeralda técnico
    c_amber = colors.HexColor('#B45309')        # Ámbar dorado / alertas
    c_dark = colors.HexColor('#111827')         # Gris carbón texto principal
    c_muted = colors.HexColor('#4B5563')        # Gris medio subtítulos
    c_border = colors.HexColor('#CBD5E1')       # Gris claro para bordes
    c_bg_light = colors.HexColor('#F8FAFC')     # Fondo suave para tablas
    c_box_green_bg = colors.HexColor('#ECFDF5') # Fondo verde suave
    c_box_green_br = colors.HexColor('#10B981') # Borde verde
    c_box_blue_bg = colors.HexColor('#EFF6FF')  # Fondo azul suave
    c_box_blue_br = colors.HexColor('#3B82F6')  # Borde azul
    c_box_amber_bg = colors.HexColor('#FFFBEB') # Fondo ámbar suave
    c_box_amber_br = colors.HexColor('#F59E0B') # Borde ámbar

    # ── Estilos Tipográficos Jerarquizados ──
    st_title_cover = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=23,
        alignment=1,
        textColor=c_dark,
        spaceAfter=10
    )

    st_sub_cover = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        alignment=1,
        textColor=c_muted,
        spaceAfter=20
    )

    st_inst_cover = ParagraphStyle(
        'CoverInst',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        alignment=1,
        textColor=c_primary,
        spaceAfter=12
    )

    st_h1 = ParagraphStyle(
        'Nivel1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    st_h2 = ParagraphStyle(
        'Nivel2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_secondary,
        spaceBefore=9,
        spaceAfter=4,
        keepWithNext=True
    )

    st_h3 = ParagraphStyle(
        'Nivel3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    st_body = ParagraphStyle(
        'Cuerpo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_dark,
        spaceAfter=5,
        alignment=4 # Justificado
    )

    st_bullet = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    st_table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_dark
    )

    st_table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    st_table_note = ParagraphStyle(
        'TableNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=c_muted,
        spaceBefore=3
    )

    st_script_speech = ParagraphStyle(
        'ScriptSpeech',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # =========================================================================
    # PÁGINA 1: PORTADA FORMAL (ICONTEC NTC 1486)
    # =========================================================================
    story.append(Spacer(1, 15))
    story.append(Paragraph("BIOCAMBIO360 S.A.S. & THINK TIC S.A.S.", st_inst_cover))
    story.append(Spacer(1, 35))

    story.append(Paragraph(
        "MANUAL DE OPERACIONES, ATENCIÓN AL CLIENTE Y GESTIÓN COMERCIAL:<br/>"
        "ESTRATEGIA DE REFERIDOS Y EMBAJADORES «COMUNIDAD BIOCAMBIO360»",
        st_title_cover
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="60%", thickness=2, color=c_secondary, spaceBefore=4, spaceAfter=14))

    story.append(Paragraph(
        "Guía Integral de Adopción Operativa, Arquitectura Técnica en Tienda Virtual, "
        "Guiones de Venta, Protocolos de Servicio al Cliente, Blindaje Antifraude "
        "y Gestión Administrativa con Estándares ICONTEC NTC 1486 y APA 7.ª Edición",
        st_sub_cover
    ))

    story.append(Spacer(1, 130))

    info_portada = [
        [Paragraph("<b>Destinatarios:</b>", st_table_cell), Paragraph("Equipo de Atención al Cliente, Asesores Comerciales y Operaciones", st_table_cell)],
        [Paragraph("<b>Concepción Comercial:</b>", st_table_cell), Paragraph("Diego & Fernando — Líderes del Equipo Comercial (BioCambio360 S.A.S.)", st_table_cell)],
        [Paragraph("<b>Diseño e Integración:</b>", st_table_cell), Paragraph("Equipo de Comunicación Estratégica e Ingeniería de Software (THINK TIC S.A.S.)", st_table_cell)],
        [Paragraph("<b>Vigencia Operativa:</b>", st_table_cell), Paragraph("Septiembre 2026 – 2027", st_table_cell)],
        [Paragraph("<b>Ciudad:</b>", st_table_cell), Paragraph("Soacha / Bogotá D.C., República de Colombia", st_table_cell)]
    ]
    t_portada = Table(info_portada, colWidths=[140, 364])
    t_portada.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, c_secondary),
    ]))
    story.append(t_portada)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 2: CONTRAPORTADA, CRÉDITOS INSTITUCIONALES Y RESUMEN
    # =========================================================================
    story.append(Paragraph("CRÉDITOS INSTITUCIONALES Y HOJA DE CONTROL", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

    tabla_creditos = [
        [Paragraph("<b>Entidad Emisora:</b>", st_table_cell), Paragraph("BIOCAMBIO360 S.A.S. — NIT 901.798.484-4", st_table_cell)],
        [Paragraph("<b>Firma Consultora & Tech:</b>", st_table_cell), Paragraph("THINK TIC S.A.S. — Transformación Digital & Software Engineering", st_table_cell)],
        [Paragraph("<b>Concepción Estratégica:</b>", st_table_cell), Paragraph("<b>Diego y Fernando</b> — Líderes del Equipo Comercial de BioCambio360", st_table_cell)],
        [Paragraph("<b>Afinamiento & Arquitectura:</b>", st_table_cell), Paragraph("Dirección de Comunicación Estratégica & Equipo de Ingeniería de Software (Think TIC)", st_table_cell)],
        [Paragraph("<b>Marco Regulatorio:</b>", st_table_cell), Paragraph("Ley 1480 de 2011 (Estatuto del Consumidor), Ley 1581 de 2012 (Habeas Data)", st_table_cell)],
        [Paragraph("<b>Versión del Sistema:</b>", st_table_cell), Paragraph("Release v2.4 (Plataforma E-Commerce Next.js 16 + Firebase Firestore)", st_table_cell)],
        [Paragraph("<b>Clasificación de Seguridad:</b>", st_table_cell), Paragraph("Confidencial / Uso Operativo Interno Exclusivo", st_table_cell)],
    ]
    t_cred = Table(tabla_creditos, colWidths=[150, 354])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cred)
    story.append(Spacer(1, 10))

    story.append(Paragraph("RESUMEN OPERATIVO DEL DOCUMENTO", st_h2))
    story.append(Paragraph(
        "El presente manual constituye el instrumento técnico y operativo oficial para todo el personal "
        "de atención al cliente, asesores comerciales, administradores de tienda virtual y personal logístico "
        "de BIOCAMBIO360 S.A.S. Su finalidad es estandarizar la divulgación, operación, liquidación y soporte "
        "del programa de lealtad y recomendación de clientes denominado <b>«Comunidad BioCambio360»</b>.",
        st_body
    ))
    story.append(Paragraph(
        "La estrategia se fundamenta en un modelo <b>«Ganar-Ganar» (Win-Win)</b> concebido por el liderazgo comercial "
        "(Diego y Fernando) e implementado integralmente por THINK TIC S.A.S., donde el nuevo cliente recibe "
        "un beneficio directo de <b>$10.000 COP</b> en su primera compra de fábrica (mínimo $50.000 COP) y el cliente "
        "referidor acumula <b>$10.000 COP</b> en saldo virtual redimible en sus próximas compras, condicionado a la "
        "entrega efectiva y recaudo exitoso del pedido.",
        st_body
    ))

    box_aviso = crear_caja_destacada(
        "OBJETIVO CRÍTICO PARA EL EQUIPO DE SERVICIO AL CLIENTE",
        "Este documento no es solo una guía técnica; es un protocolo de atención asertiva. El éxito del programa "
        "depende de que cada asesor domine las reglas de activación de saldos (Pendiente vs. Disponible), sepa "
        "comunicar con orgullo el beneficio de fábrica y resuelva cualquier inquietud con transparencia legal absoluta.",
        c_box_green_bg, c_box_green_br, c_secondary
    )
    story.append(Spacer(1, 4))
    story.append(box_aviso)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 3: TABLA DE CONTENIDO FORMAL
    # =========================================================================
    story.append(Paragraph("TABLA DE CONTENIDO GENERAL", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=10))

    contenido_filas = [
        [Paragraph("<b>CAPÍTULO 1: ORIGEN, CONCEPCIÓN Y FUNDAMENTACIÓN ESTRATÉGICA</b>", st_table_cell), Paragraph("<b>Pág. 4</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;1.1. Contexto del Modelo Directo a Fábrica", st_table_cell), Paragraph("4", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;1.2. La Visión Comercial: Aportes de Diego y Fernando", st_table_cell), Paragraph("4", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;1.3. Afinamiento Estratégico y Plataforma Tecnológica por THINK TIC S.A.S.", st_table_cell), Paragraph("4", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;1.4. Modelo Económico del Programa y Unit Economics", st_table_cell), Paragraph("4", st_table_cell)],
        
        [Paragraph("<b>CAPÍTULO 2: ARQUITECTURA TÉCNICA Y REGLAS DE NEGOCIO EN LA TIENDA VIRTUAL</b>", st_table_cell), Paragraph("<b>Pág. 5</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;2.1. Matriz de Parámetros Globales (ReferralConfig)", st_table_cell), Paragraph("5", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;2.2. Ciclo de Vida del Saldo: Pendiente vs. Disponible vs. Redimido", st_table_cell), Paragraph("5", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;2.3. Jerarquía de Gamificación y Niveles de Embajador", st_table_cell), Paragraph("5", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 3: EXPERIENCIA DEL CLIENTE (VISTAS FRONTEND EN LA PLATAFORMA)</b>", st_table_cell), Paragraph("<b>Pág. 6</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;3.1. Banner Superior y Header Global", st_table_cell), Paragraph("6", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;3.2. Portal de Comunidad (/comunidad): Acceso, Enlace y Redención", st_table_cell), Paragraph("6", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;3.3. Pasarela de Checkout (/checkout) y Confirmación de Pedido", st_table_cell), Paragraph("6", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 4: PANEL DE ADMINISTRACIÓN Y CONTROL OPERATIVO (/admin/referidos)</b>", st_table_cell), Paragraph("<b>Pág. 7</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;4.1. Dashboard de KPIs y Costo de Adquisición (CAC)", st_table_cell), Paragraph("7", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;4.2. Módulo de Embajadores y Modal de Ajuste con Auditoría Obligatoria", st_table_cell), Paragraph("7", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;4.3. Monitoreo de Transacciones y Bitácora Histórica Inalterable", st_table_cell), Paragraph("7", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 5: BLINDAJE ANTIFRAUDE Y SEGURIDAD OPERACIONAL</b>", st_table_cell), Paragraph("<b>Pág. 8</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;5.1. Regla de Compra Previa Verificada del Embajador ($50.000 COP)", st_table_cell), Paragraph("8", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;5.2. Bloqueo de Autorreferidos y Detección de Direcciones Duplicadas", st_table_cell), Paragraph("8", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;5.3. Lista Negra Administrativa y Cancelación de Saldos Ilícitos", st_table_cell), Paragraph("8", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 6: GUIONES DE VENTA Y PROSPECCIÓN PARA EL EQUIPO COMERCIAL</b>", st_table_cell), Paragraph("<b>Pág. 9</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;6.1. Guion Post-Venta WhatsApp (A las 24 horas de la entrega)", st_table_cell), Paragraph("9", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;6.2. Guion Telefónico de Cierre Comercial", st_table_cell), Paragraph("9", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;6.3. Guion Especial para Comercios y Clientes B2B (HORECA / Lavanderías)", st_table_cell), Paragraph("9", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 7: GUIONES DE ATENCIÓN AL CLIENTE Y RESOLUCIÓN DE PREGUNTAS FRECUENTES (FAQ)</b>", st_table_cell), Paragraph("<b>Pág. 10</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;7.1. Preguntas Frecuentes 1 a 7 con Respuestas Tipo", st_table_cell), Paragraph("10", st_table_cell)],

        [Paragraph("<b>CAPÍTULO 8: ELEMENTOS CLAVE DE ÉXITO, ADOPCIÓN Y GESTIÓN OPERATIVA</b>", st_table_cell), Paragraph("<b>Pág. 11-12</b>", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.1. Cuadro de Mando y Metas de Servicio al Cliente", st_table_cell), Paragraph("11", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.2. Procedimiento Operativo Estandarizado (SOP) ante Incidencias", st_table_cell), Paragraph("11", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.3. Matriz de Escalamiento Técnico y Administrativo", st_table_cell), Paragraph("12", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.4. Decálogo del Asesor de Excelencia BioCambio360", st_table_cell), Paragraph("12", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.5. Glosario Operativo para Asesores de Servicio al Cliente", st_table_cell), Paragraph("12", st_table_cell)],
        [Paragraph("&nbsp;&nbsp;8.6. Referencias Documentales y Normativas (APA 7.ª Edición)", st_table_cell), Paragraph("12", st_table_cell)],
    ]
    t_toc = Table(contenido_filas, colWidths=[440, 64])
    t_toc.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, colors.HexColor('#F1F5F9')),
    ]))
    story.append(t_toc)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 4: CAPÍTULO 1 - ORIGEN, CONCEPCIÓN Y FUNDAMENTACIÓN
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 1: ORIGEN, CONCEPCIÓN Y FUNDAMENTACIÓN ESTRATÉGICA", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph("1.1. Contexto del Modelo Directo a Fábrica", st_h2))
    story.append(Paragraph(
        "BIOCAMBIO360 S.A.S. opera bajo un modelo de manufactura y distribución directa de productos químicos de "
        "aseo, desinfección y lavandería de alta concentración desde su planta en Soacha (Cundinamarca). A diferencia "
        "del retail tradicional —donde intermediarios, cadenas de supermercados y costos de distribución incrementan "
        "el precio final hasta en un 60%—, BioCambio360 traslada ese ahorro al consumidor final mediante presentaciones "
        "institucionales (Garrafas de 10L, 20L y Galones de 3.8L).",
        st_body
    ))

    story.append(Paragraph("1.2. La Visión Comercial: Aportes Fundacionales de Diego y Fernando", st_h2))
    story.append(Paragraph(
        "Durante el proceso de estructuración del plan comercial 2026, los líderes del equipo comercial de BioCambio360, "
        "<b>Diego y Fernando</b>, identificaron un fenómeno altamente valioso: la tasa de recompra y satisfacción del "
        "cliente que prueba los productos concentrados supera el 85%, manifestando de manera espontánea recomendaciones "
        "a familiares, vecinos, administradores de conjuntos residenciales, restaurantes y pequeños negocios.",
        st_body
    ))
    story.append(Paragraph(
        "Bajo la directriz comercial de Diego y Fernando, se planteó que este <i>«boca a boca»</i> no debía quedar como un "
        "acto fortuito, sino transformarse en un <b>motor formal de adquisición de clientes y fidelización continua</b>. "
        "La premisa establecida fue: <i>«Recompensar tangiblemente a quien recomienda y eliminar la fricción de entrada al "
        "nuevo comprador con un incentivo económico de fábrica irrebatible»</i>.",
        st_body
    ))

    story.append(Paragraph("1.3. Afinamiento Estratégico y Plataforma Tecnológica por THINK TIC S.A.S.", st_h2))
    story.append(Paragraph(
        "El equipo de <b>Comunicación Estratégica e Ingeniería de Software de THINK TIC S.A.S.</b> tomó la visión comercial "
        "original y la sometió a un proceso riguroso de diseño de experiencia de usuario (UX), arquitectura de datos, "
        "viabilidad financiera y blindaje jurídico conforme a la legislación colombiana (Ley 1480 de 2011).",
        st_body
    ))
    story.append(Paragraph("• <b>Eliminación de barreras de acceso:</b> Acceso ultrarrápido por celular, sin contraseñas engorrosas.", st_bullet))
    story.append(Paragraph("• <b>Condición suspensiva antifraude:</b> División entre Saldo Pendiente y Disponible, atada a la entrega física.", st_bullet))
    story.append(Paragraph("• <b>Sostenibilidad en redención:</b> Regla del 50% de cobertura máxima del carrito para asegurar flujo de caja positivo.", st_bullet))
    story.append(Paragraph("• <b>Auditoría y trazabilidad total:</b> Bitácoras inalterables para cualquier ajuste administrativo en Firestore.", st_bullet))

    story.append(Spacer(1, 3))
    box_filosofia = crear_caja_destacada(
        "LA FILOSOFÍA «GANAR-GANAR» DE LA COMUNIDAD BIOCAMBIO360",
        "El programa no es un esquema de afiliados tradicional ni una red multinivel. Es un pacto de lealtad directo: "
        "El amigo ahorra $10.000 COP al pasarse a productos biodegradables de fábrica, y el embajador descuenta $10.000 COP "
        "en su propio hogar o negocio. Cero intermediarios, máxima honestidad comercial.",
        c_box_blue_bg, c_box_blue_br, c_primary
    )
    story.append(box_filosofia)

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.4. Modelo Económico del Programa y Unit Economics", st_h2))
    story.append(Paragraph(
        "Para el equipo comercial y de servicio al cliente es vital comprender que este programa está 100% financiado por "
        "el ahorro en pauta digital. En lugar de pagarle a Meta o Google un CAC de $22.500 COP por cliente, BioCambio360 "
        "invierte ese valor directamente en sus compradores y aliados recomendadores:",
        st_body
    ))

    # Tabla APA 1: Unit Economics
    tabla_ue_data = [
        [Paragraph("<b>Concepto Financiero</b>", st_table_header), Paragraph("<b>Canal Digital Pauta (Ads)</b>", st_table_header), Paragraph("<b>Canal Comunidad Referidos</b>", st_table_header), Paragraph("<b>Impacto Operativo</b>", st_table_header)],
        [Paragraph("Costo de Adquisición (CAC)", st_table_cell), Paragraph("$22.500 COP", st_table_cell), Paragraph("$20.000 COP ($10k amigo + $10k embajador)", st_table_cell), Paragraph("Ahorro neto inmediato del 11.1%", st_table_cell)],
        [Paragraph("Ticket Promedio de Entrada", st_table_cell), Paragraph("$52.000 COP", st_table_cell), Paragraph("$68.500 COP", st_table_cell), Paragraph("+31.7% por mayor confianza", st_table_cell)],
        [Paragraph("Tasa de Recompra a 90 días", st_table_cell), Paragraph("28.4%", st_table_cell), Paragraph("61.2%", st_table_cell), Paragraph("Fidelización 2.15 veces superior", st_table_cell)],
        [Paragraph("Destino de la Inversión", st_table_cell), Paragraph("Plataformas extranjeras (Meta/Google)", st_table_cell), Paragraph("Bolsillo de hogares y aliados colombianos", st_table_cell), Paragraph("Impacto social y sentido de pertenencia", st_table_cell)]
    ]
    t_ue = Table(tabla_ue_data, colWidths=[120, 115, 135, 134])
    t_ue.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_primary),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_ue)
    story.append(Paragraph("<i>Nota:</i> Tabla elaborada con base en auditoría de pedidos y atribución de tráfico en producción a Septiembre 2026.", st_table_note))

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 5: CAPÍTULO 2 - ARQUITECTURA TÉCNICA Y REGLAS DE NEGOCIO
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 2: ARQUITECTURA TÉCNICA Y REGLAS DE NEGOCIO EN LA TIENDA", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph(
        "El programa de referidos opera como un subsistema altamente sincronizado dentro de la tienda virtual "
        "desarrollada en <b>Next.js 16</b> y respaldada por la base de datos distribuida <b>Google Cloud Firestore</b>. "
        "A continuación se detallan las variables paramétricas maestras y la lógica operacional:",
        st_body
    ))

    story.append(Paragraph("2.1. Matriz de Parámetros Globales (ReferralConfig)", st_h2))

    tabla_config_data = [
        [Paragraph("<b>Parámetro Técnico</b>", st_table_header), Paragraph("<b>Valor Estándar</b>", st_table_header), Paragraph("<b>Descripción y Regla Operacional</b>", st_table_header)],
        [Paragraph("<code>rewardAmount</code>", st_table_cell), Paragraph("$10.000 COP", st_table_cell), Paragraph("Monto acreditado al embajador por cada compra referida exitosa.", st_table_cell)],
        [Paragraph("<code>friendDiscountAmount</code>", st_table_cell), Paragraph("$10.000 COP", st_table_cell), Paragraph("Descuento directo otorgado al nuevo cliente en su primera compra.", st_table_cell)],
        [Paragraph("<code>minOrderSubtotal</code>", st_table_cell), Paragraph("$50.000 COP", st_table_cell), Paragraph("Subtotal mínimo requerido en el carrito (excluyendo envío) para activar cupón.", st_table_cell)],
        [Paragraph("<code>minReferrerSpend</code>", st_table_cell), Paragraph("$50.000 COP", st_table_cell), Paragraph("Gasto histórico mínimo del embajador para habilitar su código unívoco.", st_table_cell)],
        [Paragraph("<code>validityDays</code>", st_table_cell), Paragraph("60 días calendario", st_table_cell), Paragraph("Tiempo de vigencia de los saldos disponibles antes de su caducidad.", st_table_cell)],
        [Paragraph("<code>maxRedemptionPercentage</code>", st_table_cell), Paragraph("50% del subtotal", st_table_cell), Paragraph("Tope máximo que el cupón de redención puede cubrir sobre el valor de la orden.", st_table_cell)],
        [Paragraph("<code>maxReferralsCap</code>", st_table_cell), Paragraph("15 amigos", st_table_cell), Paragraph("Tope preventivo de seguridad antes de requerir auditoría para ser Embajador VIP.", st_table_cell)],
        [Paragraph("<code>tierThresholds.aliado</code>", st_table_cell), Paragraph("3 pedidos entregados", st_table_cell), Paragraph("Umbral para ascender a Nivel 2 (Aliado Frecuente ⭐).", st_table_cell)],
        [Paragraph("<code>tierThresholds.embajador</code>", st_table_cell), Paragraph("10 pedidos entregados", st_table_cell), Paragraph("Umbral para ascender a Nivel 3 (Embajador VIP 🏆).", st_table_cell)],
    ]
    t_cfg = Table(tabla_config_data, colWidths=[120, 95, 289])
    t_cfg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_primary),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_cfg)

    story.append(Spacer(1, 8))
    story.append(Paragraph("2.2. Ciclo de Vida del Saldo: Pendiente vs. Disponible vs. Redimido", st_h2))

    pasos_saldo = [
        [Paragraph("<b>1. Saldo Pendiente</b>", st_table_cell), Paragraph("Se crea cuando el amigo ingresa el pedido en la web. El embajador ve los $10.000 COP en amarillo. <b>No se puede usar todavía</b> porque el pedido va a alistamiento y despacho.", st_table_cell)],
        [Paragraph("<b>2. Saldo Disponible</b>", st_table_cell), Paragraph("Se libera automáticamente cuando el domiciliario o transportadora marca la guía como <b>«Entregado»</b> y se confirma el recaudo. Pasa a verde y queda listo para generar cupón.", st_table_cell)],
        [Paragraph("<b>3. Saldo Redimido</b>", st_table_cell), Paragraph("Al pulsar «Redimir Saldo», el sistema descuenta el saldo disponible y genera un cupón unívoco (<code>REDIM-XXXX-XXXX</code>) que cubre hasta el 50% de su propia compra.", st_table_cell)],
        [Paragraph("<b>4. Saldo Cancelado</b>", st_table_cell), Paragraph("Si el pedido del amigo es rechazado en portería, cancelado antes de despacho o devuelto por dirección falsa, el saldo pendiente se elimina de inmediato.", st_table_cell)]
    ]
    t_pasos = Table(pasos_saldo, colWidths=[120, 384])
    t_pasos.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_pasos)

    story.append(Spacer(1, 6))
    story.append(Paragraph("2.3. Jerarquía de Gamificación y Niveles de Embajador", st_h2))

    tabla_tiers = [
        [Paragraph("<b>Nivel del Embajador</b>", st_table_header), Paragraph("<b>Umbral Entregas</b>", st_table_header), Paragraph("<b>Incentivo Base</b>", st_table_header), Paragraph("<b>Beneficios Adicionales de Fábrica</b>", st_table_header)],
        [Paragraph("<b>Nivel 1: Referidor 🌱</b>", st_table_cell), Paragraph("1 a 2 entregados", st_table_cell), Paragraph("$10.000 COP / amigo", st_table_cell), Paragraph("Acumulación estándar en monedero virtual.", st_table_cell)],
        [Paragraph("<b>Nivel 2: Aliado ⭐</b>", st_table_cell), Paragraph("3 a 9 entregados", st_table_cell), Paragraph("$10.000 COP / amigo", st_table_cell), Paragraph("Obsequio de producto adicional de 1/2 Galón en pedidos propios.", st_table_cell)],
        [Paragraph("<b>Nivel 3: VIP 🏆</b>", st_table_cell), Paragraph("10 o más entregados", st_table_cell), Paragraph("$10.000 COP / amigo", st_table_cell), Paragraph("Kit de muestras para demostración, soporte prioritario y preventas.", st_table_cell)],
    ]
    t_tiers = Table(tabla_tiers, colWidths=[115, 100, 115, 174])
    t_tiers.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_secondary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_secondary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_secondary),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_tiers)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 6: CAPÍTULO 3 - EXPERIENCIA DEL CLIENTE (FRONTEND)
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 3: EXPERIENCIA DEL CLIENTE (VISTAS FRONTEND)", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph(
        "La interfaz de usuario fue diseñada por THINK TIC S.A.S. con un enfoque <b>Mobile-First</b> (prioridad móvil), "
        "considerando que más del 82% de las transacciones de BioCambio360 se originan desde dispositivos celulares y WhatsApp. "
        "A continuación se describen las 4 pantallas clave del recorrido del cliente:",
        st_body
    ))

    story.append(Paragraph("3.1. Banner Superior Promocional (ReferralTopBanner.tsx)", st_h2))
    story.append(Paragraph(
        "Visible en la cabecera de todas las páginas de la tienda virtual:",
        st_body
    ))
    story.append(Paragraph(
        "<i>«🎁 Recomienda y Gana $10.000 COP: Tus amigos reciben $10.000 de descuento y tú acumulas saldo para tus compras. "
        "<u>Conoce la Comunidad BioCambio360 →</u>»</i>",
        st_script_speech
    ))

    story.append(Paragraph("3.2. Portal de la Comunidad (/comunidad)", st_h2))
    story.append(Paragraph("• <b>Acceso ultrarrápido por Celular:</b> Sin contraseñas que se olviden; solo digita su número de 10 dígitos.", st_bullet))
    story.append(Paragraph("• <b>Registro en 1 paso:</b> Si el número no existe, solicita Nombre, Cédula y Ciudad, generando el perfil y código unívoco (ej: <code>CARLOS360</code>) al instante.", st_bullet))
    story.append(Paragraph("• <b>Generador de Enlace Personalizado:</b> Crea la URL inteligente <code>https://biocambio360.com/?ref=CODIGO</code>.", st_bullet))
    story.append(Paragraph("• <b>Botón Compartir en WhatsApp:</b> Abre la app con mensaje pre-cargado listo para enviar a contactos o estados.", st_bullet))
    story.append(Paragraph("• <b>Tarjetas de Balances en Tiempo Real:</b> Muestra Saldo Pendiente, Saldo Disponible y Total Redimido Histórico.", st_bullet))
    story.append(Paragraph("• <b>Botón de Redención Instantánea:</b> Con saldo disponible >= $10.000 COP, genera cupón <code>REDIM-XXXX-XXXX</code> con un solo clic.", st_bullet))

    story.append(Spacer(1, 3))
    box_enlace = crear_caja_destacada(
        "¿CÓMO OPERA EL ENLACE ?ref= EN LA TIENDA VIRTUAL?",
        "Cuando un nuevo usuario hace clic en el enlace del embajador (ej. biocambio360.com/?ref=MARIA360), el sistema "
        "guarda una cookie segura de atribución y almacena el código en el almacenamiento local (localStorage). Cuando el "
        "amigo llega a la pantalla de pago (/checkout), el código se pre-aplica automáticamente en el campo de cupones, "
        "descontando los $10.000 COP sin que el usuario tenga que escribir nada manualmente.",
        c_box_green_bg, c_box_green_br, c_secondary
    )
    story.append(box_enlace)

    story.append(Spacer(1, 6))
    story.append(Paragraph("3.3. Pasarela de Pago (/checkout)", st_h2))
    story.append(Paragraph(
        "El motor de cupones valida en tiempo real: (1) Subtotal >= $50.000 COP; (2) Embajador con al menos una compra propia "
        "previa calificada; (3) Bloqueo de autorreferido (teléfono o cédula iguales); y (4) Si es cupón de redención (<code>REDIM-*</code>), "
        "que no supere el 50% del subtotal.",
        st_body
    ))

    story.append(Paragraph("3.4. Confirmación de Compra (/confirmacion/[orderId])", st_h2))
    story.append(Paragraph(
        "Al finalizar la compra, la pantalla de éxito invita al cliente: "
        "<i>«¡Gana $10.000 COP para tu próxima compra recomendando a tus amigos! Tu número ya quedó preinscrito. "
        "<u>Activa tu código de Embajador aquí →</u>»</i>, convirtiendo compradores satisfechos en embajadores inmediatamente.",
        st_body
    ))

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 7: CAPÍTULO 4 - PANEL DE ADMINISTRACIÓN (/admin/referidos)
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 4: PANEL DE ADMINISTRACIÓN Y CONTROL OPERATIVO", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph(
        "Ubicado en <code>/admin/referidos</code> y restringido a roles <i>Administrador</i> o <i>Auditor</i>. "
        "Ofrece control integral sobre el rendimiento del programa, métricas financieras y auditoría forense:",
        st_body
    ))

    story.append(Paragraph("4.1. Dashboard de Métricas y KPIs Consolidados", st_h2))

    tabla_kpis_admin = [
        [Paragraph("<b>Indicador Ejecutivo</b>", st_table_header), Paragraph("<b>Fórmula / Origen de Datos</b>", st_table_header), Paragraph("<b>Objetivo Estratégico</b>", st_table_header)],
        [Paragraph("<b>Total Pedidos Referidos</b>", st_table_cell), Paragraph("Conteo de documentos en <code>referral_transactions</code>", st_table_cell), Paragraph("Medir volumen global de atracción.", st_table_cell)],
        [Paragraph("<b>Ventas Generadas (COP)</b>", st_table_cell), Paragraph("Suma de <code>orderTotal</code> en pedidos recomendados", st_table_cell), Paragraph("Ingresos brutos atribuibles a la comunidad.", st_table_cell)],
        [Paragraph("<b>Recompensas Pagadas</b>", st_table_cell), Paragraph("Suma de recompensas en transacciones aprobadas", st_table_cell), Paragraph("Control de pasivo financiero del programa.", st_table_cell)],
        [Paragraph("<b>Descuentos Otorgados</b>", st_table_cell), Paragraph("Suma de $10.000 COP otorgados a amigos", st_table_cell), Paragraph("Inversión promocional en clientes nuevos.", st_table_cell)],
        [Paragraph("<b>CAC Efectivo del Canal</b>", st_table_cell), Paragraph("(Recompensas + Descuentos) / Nuevos Clientes", st_table_cell), Paragraph("Monitorear eficiencia frente a pauta digital.", st_table_cell)],
    ]
    t_kpi_adm = Table(tabla_kpis_admin, colWidths=[130, 185, 189])
    t_kpi_adm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_primary),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_kpi_adm)

    story.append(Spacer(1, 6))
    story.append(Paragraph("4.2. Módulo de Embajadores y Modal de Ajuste con Auditoría Obligatoria", st_h2))
    story.append(Paragraph(
        "Permite buscar embajadores por nombre, teléfono o código. Al hacer clic en «Gestionar», se despliega el modal. "
        "Si un administrador modifica manualmente el saldo disponible (para compensaciones o garantías), <b>el sistema "
        "exige obligatoriamente registrar un motivo</b>. Esto dispara la función <code>recordReferralBalanceAuditLog()</code> "
        "guardando en <code>referral_balance_audit_logs</code> quién hizo el cambio, saldo anterior, nuevo, diferencia, fecha y motivo.",
        st_body
    ))

    story.append(Paragraph("4.3. Monitoreo de Transacciones y Alertas de Seguridad", st_h2))
    story.append(Paragraph(
        "Detalla cada orden referida: Código de embajador, Nombre del comprador, Celular, Dirección de entrega, Subtotal, "
        "Descuento y Estado logístico. Si una misma dirección física recibe 2 o más pedidos con códigos del mismo embajador, "
        "el sistema enciende la alerta roja <b>«Alerta: Dirección Concentrada»</b> para auditoría preventiva de fraude.",
        st_body
    ))

    story.append(Paragraph("4.4. Bitácora de Auditoría Histórica Inalterable", st_h2))
    story.append(Paragraph(
        "La pestaña «Auditoría» permite a la gerencia auditar cronológicamente cualquier movimiento de dinero virtual, "
        "garantizando cero discrecionalidad injustificada y control interno a prueba de manipulaciones.",
        st_body
    ))

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 8: CAPÍTULO 5 - BLINDAJE ANTIFRAUDE Y SEGURIDAD
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 5: BLINDAJE ANTIFRAUDE Y SEGURIDAD OPERACIONAL", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph(
        "Para preservar la viabilidad comercial y evitar que personas inescrupulosas abusen de las promociones de fábrica, "
        "THINK TIC S.A.S. integró 4 filtros de protección automatizados y rigurosos:",
        st_body
    ))

    story.append(Paragraph("5.1. Regla de Compra Previa Verificada del Embajador ($50.000 COP)", st_h2))
    story.append(Paragraph(
        "Nadie puede generar ingresos recomendando productos que nunca ha probado. Cuando un cliente intenta usar el código "
        "de un embajador, la función <code>checkReferrerQualifiedPurchase()</code> consulta la colección de clientes y pedidos. "
        "Si el titular del código no cuenta con al menos un pedido entregado >= $50.000 COP, el sistema rechaza el cupón informando: "
        "<i>«El código aún no está activo. El embajador debe contar con al menos una compra previa mínima de $50.000 COP en BioCambio360»</i>.",
        st_body
    ))

    story.append(Paragraph("5.2. Bloqueo Automatizado de Autorreferidos", st_h2))
    story.append(Paragraph("• <b>Coincidencia telefónica:</b> El teléfono del comprador no puede ser idéntico al del embajador.", st_bullet))
    story.append(Paragraph("• <b>Coincidencia de Cédula / NIT:</b> El documento de identidad no puede coincidir con el del embajador.", st_bullet))
    story.append(Paragraph("• <b>Misma Dirección Física:</b> Alerta automática si el destino físico coincide exactamente con el titular.", st_bullet))

    story.append(Paragraph("5.3. Tope Máximo Preventivo de Amigos (Cap de Seguridad = 15)", st_h2))
    story.append(Paragraph(
        "Cada embajador puede acumular de forma automática hasta 15 referidos calificados ($150.000 COP en bonos). "
        "Al superar los 15 amigos, el sistema pausa nuevas acumulaciones y solicita al usuario contactar a la línea comercial. "
        "El equipo audita sus pedidos y, al verificar que es un promotor legítimo, lo asciende a <b>Embajador VIP</b> sin límite.",
        st_body
    ))

    story.append(Paragraph("5.4. Lista Negra Administrativa y Cancelación de Saldos", st_h2))
    story.append(Paragraph(
        "Si se detecta una maniobra fraudulenta comprobada (cuentas espejo, spam masivo, direcciones falsas), el administrador "
        "acciona el botón <b>«Enviar a Lista Negra»</b>. Esta acción desactiva el código inmediatamente, congela la cuenta y "
        "anula la totalidad de saldos pendientes y disponibles, dejando registro auditable conforme a la Cláusula 11 de los Términos.",
        st_body
    ))

    story.append(Spacer(1, 4))
    box_seguridad = crear_caja_destacada(
        "POSTURA OFICIAL ANTE INTENTOS DE FRAUDE",
        "El asesor de servicio al cliente NUNCA debe entrar en confrontaciones personales. Si un cliente sancionado reclama, "
        "el asesor debe remitirse con serenidad al Artículo 11 de los Términos del Programa publicados en la web (Ley 1480 de 2011), "
        "explicando que los algoritmos de seguridad identificaron compras cruzadas de la misma persona y que la empresa se reserva "
        "el derecho de anular beneficios promocionales obtenidos bajo simulación.",
        c_box_amber_bg, c_box_amber_br, c_amber
    )
    story.append(box_seguridad)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 9: CAPÍTULO 6 - GUIONES COMERCIALES Y DE PROSPECCIÓN
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 6: GUIONES DE VENTA Y PROSPECCIÓN PARA EL EQUIPO COMERCIAL", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph(
        "El programa de referidos solo alcanzará su máximo potencial si el equipo comercial y de atención al cliente lo "
        "promueve activamente en cada punto de contacto. A continuación se presentan los guiones oficiales estructurados:",
        st_body
    ))

    story.append(Paragraph("6.1. Guion Post-Venta por WhatsApp (A las 24 horas de la entrega)", st_h2))
    box_g1 = crear_caja_destacada(
        "PLANTILLA WHATSAPP: CONVERSIÓN POST-VENTA A EMBAJADOR",
        "«¡Hola {Nombre}! Te saluda {Tu Nombre} de BioCambio360 🌿. Queríamos confirmar que tu pedido de {Producto/Combo} "
        "haya llegado perfecto a tu hogar/negocio. Esperamos que disfrutes la calidad y el rendimiento concentrado de fábrica.<br/><br/>"
        "Queremos contarte que por ser cliente verificado, tienes activo un beneficio especial: en nuestro programa de "
        "<b>Comunidad BioCambio360</b> puedes regalarle <b>$10.000 COP de descuento</b> a tus amigos, vecinos o familiares para "
        "su primera compra de fábrica, y por cada uno que reciba su pedido, tú acumulas <b>$10.000 COP de saldo</b> para tus propias compras.<br/><br/>"
        "Consulta tu código único en solo 10 segundos aquí con tu celular: https://biocambio360.com/comunidad?phone={Celular}<br/>"
        "¡Muchos de nuestros clientes ya no pagan por sus productos de aseo gracias a sus recomendados! ¿Te gustaría que te "
        "enviemos tu enlace personalizado directo a este chat?»",
        c_box_green_bg, c_box_green_br, c_secondary
    )
    story.append(box_g1)

    story.append(Spacer(1, 6))
    story.append(Paragraph("6.2. Guion Telefónico de Cierre Comercial («El Gancho de los $10.000»)", st_h2))
    box_g2 = crear_caja_destacada(
        "GUION TELEFÓNICO: CIERRE CON PROMESA DE COMUNIDAD",
        "<b>Asesor:</b> «Listo, don {Nombre}, su pedido de Garrafa de 10L queda confirmado para entrega en 24-48 horas. "
        "Y una excelente noticia antes de colgar: apenas le entreguemos este paquete, su número queda habilitado como "
        "<b>Embajador BioCambio360</b>. Eso significa que si le cuenta a su hermano, a su compadre o a su vecino del local de al lado, "
        "a ellos les regalamos $10.000 en su primer pedido de fábrica y a usted le abonamos $10.000 para que su próxima garrafa le "
        "salga casi a mitad de precio. Cuando le entreguen el paquete le mandamos el enlace por WhatsApp para que lo empiece a compartir, ¿le parece?»",
        c_box_blue_bg, c_box_blue_br, c_primary
    )
    story.append(box_g2)

    story.append(Spacer(1, 6))
    story.append(Paragraph("6.3. Guion Especial B2B: Talleres, Lavanderías, Restaurantes y Hoteles", st_h2))
    box_g3 = crear_caja_destacada(
        "GUION B2B: RED DE ALIADOS COMERCIALES",
        "«Apreciado {Nombre}: En BioCambio360 sabemos que en su gremio ({lavaderos/restaurantes/conserjería}) los colegas se conocen y "
        "buscan bajar costos operativos de químicos. Nuestro programa <b>Aliados Comerciales</b> le permite recomendar nuestra línea "
        "institucional (garrafas de 20L y desengrasantes industriales) a otros colegas. Con solo 3 compras que ellos hagan con su código, "
        "usted sube a <i>Aliado Frecuente</i> y recibe producto de cortesía, además de acumular hasta $150.000 COP en descuentos para sus "
        "propios insumos. Con 5 negocios que usted refiera, los químicos de su propio local se pagan solos con los bonos acumulados.»",
        c_box_amber_bg, c_box_amber_br, c_amber
    )
    story.append(box_g3)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 10: CAPÍTULO 7 - GUIONES DE ATENCIÓN Y FAQ
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 7: GUIONES DE ATENCIÓN AL CLIENTE Y RESOLUCIÓN DE PREGUNTAS FRECUENTES (FAQ)", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    faq_items = [
        ("FAQ 1: «¿Por qué mi saldo aparece como 'Pendiente' y no lo puedo usar de una vez?»",
         "«¡Hola {Nombre}! Con mucho gusto te aclaramos. Tu saldo aparece en estado 'Pendiente' porque tu amigo {Nombre Amigo} "
         "ya generó la orden en la web, pero el pedido está actualmente en proceso de despacho en bodega. Para garantizar la seguridad "
         "del programa de fábrica, el saldo pasa a 'Disponible' en el momento exacto en que la transportadora le entrega el paquete "
         "físicamente y se confirma el recaudo. ¡Tan pronto lo reciba en su puerta, verás tus $10.000 COP listos para redimir!»"),

        ("FAQ 2: «Mi amigo intentó poner mi código en la página y le salió un error, ¿qué pasó?»",
         "«Con todo gusto te ayudamos a revisarlo. Generalmente esto ocurre por una de tres razones muy sencillas:<br/>"
         "1. <b>Pedido Mínimo:</b> El subtotal de productos en el carrito de tu amigo debe ser de mínimo $50.000 COP.<br/>"
         "2. <b>Compra previa del Embajador:</b> Recuerda que para que tu código esté activo debes tener al menos una compra propia entregada en BioCambio360.<br/>"
         "3. <b>Digitación del código:</b> Revisa que no tenga espacios al inicio o final (ej. CARLOS360). "
         "Regálame el número de celular de tu amigo y de inmediato te verificamos en el sistema qué sucedió.»"),

        ("FAQ 3: «¿Puedo pasar mi saldo a mi cuenta de Nequi, Daviplata o cobrarlo en efectivo?»",
         "«Entendemos tu consulta, {Nombre}. Conforme a los Términos y Condiciones del programa y la Ley 1480 de 2011, los saldos de "
         "la Comunidad BioCambio360 son <b>créditos comerciales de fábrica</b> otorgados para premiar tu lealtad. No constituyen dinero en "
         "efectivo, divisa ni depósitos bancarios, por lo que no son monetizables en cuentas corrientes ni plataformas digitales. "
         "Están diseñados exclusivamente para descontarse en tus próximas compras de productos de aseo para tu hogar o negocio.»"),

        ("FAQ 4: «Fui a redimir mi saldo de $20.000 COP y la página solo me descontó una parte, ¿por qué?»",
         "«Te explicamos con total transparencia: para garantizar la sostenibilidad de nuestros precios directos de fábrica sin "
         "intermediarios, la política del programa establece que el saldo redimido puede cubrir <b>hasta el 50% del valor total de los productos</b> "
         "de tu pedido. Por ejemplo, si tienes $20.000 en bonos acumulados, puedes aplicarlos en un pedido de $40.000 o más en productos, "
         "ahorrándote la mitad de tu compra y pagando únicamente el excedente y el flete si aplica. ¡Es un ahorro enorme directo de fábrica!»"),

        ("FAQ 5: «¿Mi saldo acumulado se vence o tengo plazo límite para usarlo?»",
         "«Sí, {Nombre}. Para mantener la dinamización del programa y la rotación de inventarios, cada saldo que pasa a estado "
         "'Disponible' cuenta con una vigencia de <b>60 días calendario</b> a partir de la fecha de entrega del pedido de tu amigo. "
         "Te recomendamos aprovecharlo y redimirlo en tus compras habituales de aseo mensual para no perder tus bonos acumulados.»"),

        ("FAQ 6: «¿Cómo hago para subir de nivel a Aliado Frecuente o Embajador VIP?»",
         "«¡Nos encanta que quieras crecer en la Comunidad! El ascenso es 100% automático según tus recomendaciones efectivas:<br/>"
         "• <b>Aliado Frecuente (⭐):</b> Se activa al acumular 3 compras entregadas de tus amigos. Te da regalos de producto en tus compras.<br/>"
         "• <b>Embajador VIP (🏆):</b> Se activa con 10 amigos entregados. Te enviamos muestras para demostración comercial, soporte prioritario "
         "y aumentamos tu tope de referidos. ¡Sigue compartiendo tu enlace!»"),

        ("FAQ 7: «¿Puedo referir a mi mamá, esposo o hijo que vive en mi misma casa?»",
         "«El programa premia la recomendación a nuevos hogares y clientes. Si tu familiar vive en otra residencia y maneja su propia economía, "
         "puede usar tu enlace sin ningún inconveniente. Sin embargo, nuestro sistema cuenta con alertas antifraude por repetición de dirección "
         "física y número de teléfono. Las compras destinadas al mismo domicilio del embajador deben realizarse desde la cuenta habitual y no "
         "califican para auto-descuento de referidos por políticas de seguridad.»")
    ]

    for titulo_faq, cuerpo_faq in faq_items:
        story.append(crear_caja_destacada(titulo_faq, cuerpo_faq, c_bg_light, c_border, c_primary))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 11: CAPÍTULO 8 - ELEMENTOS CLAVE DE ÉXITO (PARTE 1: CUADRO DE MANDO Y SOP)
    # =========================================================================
    story.append(Paragraph("CAPÍTULO 8: ELEMENTOS CLAVE DE ÉXITO, ADOPCIÓN Y GESTIÓN OPERATIVA", st_h1))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph("8.1. Cuadro de Mando y Metas de Servicio al Cliente (KPIs de Adopción)", st_h2))
    story.append(Paragraph(
        "Para transformar la estrategia de referidos en una cultura operativa diaria, cada asesor comercial y de soporte "
        "tendrá seguimiento sobre los siguientes 5 indicadores de desempeño semanal:",
        st_body
    ))

    tabla_metas_data = [
        [Paragraph("<b>Indicador de Desempeño (KPI)</b>", st_table_header), Paragraph("<b>Meta Operativa</b>", st_table_header), Paragraph("<b>Acción Clave del Asesor</b>", st_table_header)],
        [Paragraph("<b>Tasa de Invitación Post-Venta</b>", st_table_cell), Paragraph("100% de clientes entregados", st_table_cell), Paragraph("Enviar mensaje de WhatsApp a las 24 horas de entregado el pedido.", st_table_cell)],
        [Paragraph("<b>Tasa de Activación de Códigos</b>", st_table_cell), Paragraph("> 35% de compradores", st_table_cell), Paragraph("Guiar al cliente a consultar en <code>/comunidad</code> su código unívoco.", st_table_cell)],
        [Paragraph("<b>Conversión de Amigos Referidos</b>", st_table_cell), Paragraph("> 15% del total mensual", st_table_cell), Paragraph("Lograr que al menos 15 de cada 100 pedidos provengan de recomendaciones.", st_table_cell)],
        [Paragraph("<b>Tiempo de Respuesta a Dudas FAQ</b>", st_table_cell), Paragraph("< 15 minutos en horario hábil", st_table_cell), Paragraph("Aplicar los guiones oficiales del Capítulo 7 vía chat.", st_table_cell)],
        [Paragraph("<b>Satisfacción del Embajador (CSAT)</b>", st_table_cell), Paragraph("> 92% positiva", st_table_cell), Paragraph("Transparencia en la explicación de saldos pendientes y redención.", st_table_cell)],
    ]
    t_meta = Table(tabla_metas_data, colWidths=[140, 115, 249])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_primary),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 8))
    story.append(Paragraph("8.2. Procedimiento Operativo Estandarizado (SOP) ante Incidencias de Saldo", st_h2))
    story.append(Paragraph(
        "Cuando un usuario reclame que su saldo de embajador no fue acreditado o presenta retrasos, el asesor debe seguir "
        "estrictamente el siguiente flujo de resolución en cuatro pasos:",
        st_body
    ))

    sop_pasos = [
        [Paragraph("<b>Paso 1: Identificación y Filtrado</b>", st_table_cell), Paragraph("Solicitar el número de celular del embajador y el número de pedido o nombre del amigo referido. Verificar si el amigo digitó el código o entró por el enlace <code>?ref=</code>.", st_table_cell)],
        [Paragraph("<b>Paso 2: Búsqueda en Panel /admin</b>", st_table_cell), Paragraph("Ingresar a <code>/admin/referidos</code> y revisar la pestaña <i>Transacciones</i>. Confirmar si la transacción existe en estado <code>pending</code> o si fue rechazada por falta de compra previa.", st_table_cell)],
        [Paragraph("<b>Paso 3: Validación Logística Real</b>", st_table_cell), Paragraph("Revisar en la transportadora si la guía de entrega física ya fue confirmada. Si el paquete sigue en tránsito, explicar amablemente el principio de entrega efectiva del Capítulo 2.", st_table_cell)],
        [Paragraph("<b>Paso 4: Liberación y Registro en Bitácora</b>", st_table_cell), Paragraph("Si la entrega fue efectiva pero la transportadora no sincronizó el estado en el sistema, el administrador puede liberar el saldo en el modal, <b>registrando el motivo en la bitácora</b> (ej. <i>«Liberación validada con remisión #4521»</i>).", st_table_cell)]
    ]
    t_sop = Table(sop_pasos, colWidths=[140, 364])
    t_sop.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sop)

    story.append(Spacer(1, 8))
    box_sop = crear_caja_destacada(
        "REGLA DE ORO DE SERVICIO AL CLIENTE EN BIOCAMBIO360",
        "«La transparencia total genera lealtad eterna». Si un cliente tiene una duda sobre su saldo, nunca usemos tecnicismos "
        "ni frases evasivas. Expliquemos que el dinero del bono proviene directamente de la fábrica cuando la transportadora entrega "
        "el paquete, lo cual protege a ambas partes y mantiene los precios más bajos del mercado en aseo concentrado.",
        c_box_blue_bg, c_box_blue_br, c_primary
    )
    story.append(box_sop)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 12: CAPÍTULO 8 (PARTE 2) - ESCALAMIENTO, DECÁLOGO, GLOSARIO Y REFERENCIAS
    # =========================================================================
    story.append(Paragraph("8.3. Matriz de Escalamiento Técnico y Administrativo", st_h2))
    
    tabla_escalamiento = [
        [Paragraph("<b>Nivel</b>", st_table_header), Paragraph("<b>Responsable</b>", st_table_header), Paragraph("<b>Tipo de Incidencia / Decisión</b>", st_table_header), Paragraph("<b>Tiempo SLA</b>", st_table_header)],
        [Paragraph("<b>Nivel 1</b>", st_table_cell), Paragraph("Asesores de Atención al Cliente", st_table_cell), Paragraph("Atención general, envío de enlaces, resolución de dudas FAQ, consulta de saldos.", st_table_cell), Paragraph("Inmediato (< 15 min)", st_table_cell)],
        [Paragraph("<b>Nivel 2</b>", st_table_cell), Paragraph("Líderes Comerciales (Diego & Fernando)", st_table_cell), Paragraph("Aprobación de excepciones comerciales, acuerdos B2B, aumento de topes de referidos.", st_table_cell), Paragraph("< 4 horas hábiles", st_table_cell)],
        [Paragraph("<b>Nivel 3</b>", st_table_cell), Paragraph("Ingeniería THINK TIC S.A.S.", st_table_cell), Paragraph("Fallas en pasarela, desincronización de cupones, auditoría de base de datos Firestore.", st_table_cell), Paragraph("< 24 horas", st_table_cell)],
    ]
    t_esc = Table(tabla_escalamiento, colWidths=[65, 140, 219, 80])
    t_esc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('LINEABOVE', (0,0), (-1,0), 1, c_secondary),
        ('LINEBELOW', (0,0), (-1,0), 1, c_secondary),
        ('LINEBELOW', (0,-1), (-1,-1), 1, c_secondary),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_esc)

    story.append(Spacer(1, 5))
    story.append(Paragraph("8.4. Decálogo de Excelencia para el Asesor de BioCambio360", st_h2))
    story.append(Paragraph(
        "1. <b>Pasión de Fábrica:</b> Habla con orgullo de nuestros insumos concentrados. &nbsp;&nbsp;"
        "2. <b>Generosidad Sostenible:</b> Presenta el bono de $10.000 como un regalo mutuo real.<br/>"
        "3. <b>Claridad Total:</b> Explica siempre que el saldo se libera al momento de la entrega física. &nbsp;&nbsp;"
        "4. <b>Proactividad:</b> Comparte el enlace tras cada entrega exitosa.<br/>"
        "5. <b>Foco B2B:</b> Identifica comercios y lavaderos para convertirlos en Aliados Frecuentes. &nbsp;&nbsp;"
        "6. <b>Trazabilidad:</b> Cada ajuste manual debe quedar registrado en la bitácora con su motivo.<br/>"
        "7. <b>Seguridad:</b> Protege a la marca de autorreferidos sin perder la cortesía con el cliente. &nbsp;&nbsp;"
        "8. <b>Respaldo Legal:</b> Apóyate en la Ley 1480 de 2011 ante cualquier duda de monetización.<br/>"
        "9. <b>Velocidad:</b> Responde las dudas de comunidad en menos de 15 minutos usando las plantillas. &nbsp;&nbsp;"
        "10. <b>Comunidad:</b> Cada embajador fidelizado es un socio comercial estratégico para BioCambio360.",
        st_body
    ))

    story.append(Spacer(1, 5))
    story.append(Paragraph("8.5. Glosario Operativo para Asesores de Servicio al Cliente", st_h2))
    glosario_items = [
        [Paragraph("<b>Embajador / Referidor:</b>", st_table_cell), Paragraph("Cliente previo verificado con compra >= $50.000 COP que comparte su código único.", st_table_cell)],
        [Paragraph("<b>Amigo Referido:</b>", st_table_cell), Paragraph("Nuevo comprador que recibe $10.000 COP de descuento en su primer pedido de fábrica.", st_table_cell)],
        [Paragraph("<b>Saldo Pendiente:</b>", st_table_cell), Paragraph("Bono provisional visible mientras el pedido del amigo está en proceso de despacho.", st_table_cell)],
        [Paragraph("<b>Saldo Disponible:</b>", st_table_cell), Paragraph("Bono comercial activo y listo para redimir tras la entrega efectiva y recaudo.", st_table_cell)],
        [Paragraph("<b>Cupón REDIM:</b>", st_table_cell), Paragraph("Código unívoco generado al redimir saldo, aplicable en hasta el 50% del subtotal.", st_table_cell)],
        [Paragraph("<b>Lista Negra:</b>", st_table_cell), Paragraph("Sanción administrativa que desactiva códigos y anula saldos ante fraude comprobado.", st_table_cell)],
    ]
    t_glo = Table(glosario_items, colWidths=[130, 374])
    t_glo.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, colors.HexColor('#F1F5F9')),
    ]))
    story.append(t_glo)

    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=4))
    story.append(Paragraph("8.6. Referencias Documentales y Normativas (APA 7.ª Edición)", st_h3))
    story.append(Paragraph(
        "• Congreso de la República de Colombia. (2011). <i>Ley 1480 de 2011: Estatuto del Consumidor</i>. Diario Oficial No. 48.220.<br/>"
        "• Congreso de la República de Colombia. (2012). <i>Ley 1581 de 2012: Protección de datos personales (Habeas Data)</i>. Diario Oficial No. 48.587.<br/>"
        "• Instituto Colombiano de Normas Técnicas y Certificación [ICONTEC]. (2008). <i>Norma Técnica Colombiana NTC 1486: Documentación. Presentación de tesis, trabajos de grado y otros trabajos de investigación</i>. ICONTEC.<br/>"
        "• American Psychological Association [APA]. (2020). <i>Publication manual of the American Psychological Association</i> (7th ed.). https://doi.org/10.1037/0000165-000<br/>"
        "• THINK TIC S.A.S. (2026). <i>Especificación Técnica de Software y Modelo de Datos de Fidelización para BioCambio360 S.A.S.</i> Bogotá D.C., Colombia.",
        st_table_note
    ))

    # Construir PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {ruta_destino}")

if __name__ == '__main__':
    destino = sys.argv[1] if len(sys.argv) > 1 else 'MANUAL_OPERATIVO_PROGRAMA_REFERIDOS_BIOCAMBIO360.pdf'
    construir_pdf(destino)
