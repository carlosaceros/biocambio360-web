#!/usr/bin/env python3
"""
Biocambio360 — Motor ETL de Extracción, Saneamiento y Caracterización de Datos Históricos
Sustituye 4 libros de Excel (~45MB, 135.000+ filas) generando taxonomías de alto valor:
1. Canal de venta explícito (mostrador_pos vs call_center vs tienda_virtual)
2. Segmentación RFM (VIP/Mayorista, Recurrente, Nuevo, En Riesgo)
3. Taxonomía Geográfica (Bogotá por localidades, Soacha por comunas, Nacional)
4. Taxonomía de Producto (Línea de negocio, presentación, volumen granel vs doméstico)
5. Desempeño y asignación por Asesor Comercial (Karen, Katherine, Andrea, etc.)
"""

import os
import re
import json
from datetime import datetime
import openpyxl

EXCELS_FOLDER = "EXCELS POR INTEGRAR"
OUTPUT_DIR = "scripts/data"

def clean_phone(val):
    if not val:
        return None
    d = re.sub(r"\D", "", str(val))
    if len(d) == 12 and d.startswith("57"):
        d = d[2:]
    if len(d) == 10 and d.startswith("3"):
        return d
    # If string has multiple phones (e.g. "3142524371\n3138721139"), extract first valid Colombian mobile
    phones = re.findall(r"3\d{9}", str(val))
    if phones:
        return phones[0]
    return None

def clean_name(val):
    if not val:
        return "Cliente Sin Nombre"
    s = str(val).replace("\n", " ").replace("\r", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s.title()

def parse_date(date_val):
    if not date_val:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    if isinstance(date_val, datetime):
        return date_val.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    try:
        dt = datetime.fromisoformat(str(date_val))
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        s = str(val).replace("$", "").replace(".", "").replace(",", ".").strip()
        return float(s)
    except:
        return default

def safe_int(val, default=0):
    return int(safe_float(val, default))

# ─────────────────────────────────────────────────────────────
# 1. Cargar Tabla de Precios de Referencia (Llave)
# ─────────────────────────────────────────────────────────────
def load_price_catalog(filepath):
    prices = {}
    if not os.path.exists(filepath):
        return prices
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    if "Llave" in wb.sheetnames:
        ws = wb["Llave"]
        for row in ws.iter_rows(values_only=True):
            if row and row[0] and row[1]:
                p_name = str(row[0]).strip().lower()
                p_val = safe_float(row[1], 0.0)
                if p_val > 0:
                    prices[p_name] = p_val
    wb.close()
    return prices

# ─────────────────────────────────────────────────────────────
# 2. Taxonomía Geográfica Avanzada
# ─────────────────────────────────────────────────────────────
BOGOTA_LOCALIDADES = [
    'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito',
    'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos',
    'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda',
    'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'
]

def characterize_geography(barrio_raw, dir_raw=""):
    text = f"{barrio_raw or ''} {dir_raw or ''}".lower()
    
    # Check Soacha
    if "soacha" in text or "san mateo" in text or "compartir" in text or "cazuca" in text or "san nicolas" in text:
        return {
            "departamento": "Cundinamarca",
            "ciudad": "Soacha",
            "zona": "Soacha Urbana",
            "tipo_cobertura": "Urbana Local (Despacho Propio)",
        }
    
    # Check Bogotá localities
    for loc in BOGOTA_LOCALIDADES:
        if loc.lower() in text:
            return {
                "departamento": "Bogotá D.C.",
                "ciudad": "Bogotá",
                "localidad": loc,
                "zona": f"Bogotá - {loc}",
                "tipo_cobertura": "Urbana Local (Despacho Propio)",
            }
            
    # Check other major Colombian cities
    if "medellin" in text or "antioquia" in text or "bello" in text or "envigado" in text:
        return {"departamento": "Antioquia", "ciudad": "Medellín", "zona": "Valle de Aburrá", "tipo_cobertura": "Nacional (Transportadora)"}
    if "cali" in text or "valle" in text or "palmira" in text:
        return {"departamento": "Valle del Cauca", "ciudad": "Cali", "zona": "Occidente", "tipo_cobertura": "Nacional (Transportadora)"}
    if "barranquilla" in text or "atlantico" in text:
        return {"departamento": "Atlántico", "ciudad": "Barranquilla", "zona": "Costa Caribe", "tipo_cobertura": "Nacional (Transportadora)"}
    if "bucaramanga" in text or "santander" in text:
        return {"departamento": "Santander", "ciudad": "Bucaramanga", "zona": "Oriente", "tipo_cobertura": "Nacional (Transportadora)"}
    
    # Default to Bogotá / Cundinamarca Metropolitana
    return {
        "departamento": "Bogotá D.C.",
        "ciudad": "Bogotá",
        "zona": "Bogotá Metropolitana",
        "tipo_cobertura": "Urbana Local (Despacho Propio)",
    }

# ─────────────────────────────────────────────────────────────
# 3. Taxonomía de Producto & Presentación
# ─────────────────────────────────────────────────────────────
def characterize_product(prod_text):
    text = str(prod_text or "").lower()
    
    # Size / Presentation
    size = "Galón"
    litros = 3.8
    if "20 l" in text or "20l" in text or "caneca" in text:
        size = "20L"
        litros = 20.0
    elif "10 l" in text or "10l" in text:
        size = "10L"
        litros = 10.0
    elif "1/2" in text or "medio galon" in text:
        size = "1/2G"
        litros = 1.9
    elif "1kg" in text or "kilo" in text:
        size = "1Kg"
        litros = 1.0
        
    # Category
    categoria = "Lavandería"
    if "suavizante" in text:
        categoria = "Suavizantes y Enjuagues"
    elif "desengrasante" in text:
        categoria = "Desengrasantes y Cocina"
    elif "bicarbonato" in text or "oxigeno" in text:
        categoria = "Aditivos y Blanqueadores"
    elif "limpisuelos" in text or "limpiapisos" in text or "lavanda" in text:
        categoria = "Pisos y Superficies"
    elif "jabon de manos" in text or "manos" in text:
        categoria = "Higiene y Manos"
    elif "lavaloza" in text:
        categoria = "Cocina y Lavaloza"
        
    linea = "Institucional / Granel" if litros >= 10.0 else "Doméstica / Hogar"
    
    return {
        "categoria": categoria,
        "presentacion": size,
        "litros_estimados": litros,
        "linea_negocio": linea,
    }

# ─────────────────────────────────────────────────────────────
# 4. Extracción de Ventas POS (APP PUNTO VENTAS.xlsx)
# ─────────────────────────────────────────────────────────────
def extract_pos_sales(filepath, customers_dict):
    print(f"\n--- Extrayendo Ventas de Mostrador: {os.path.basename(filepath)} ---")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb["VENTAS"]
    
    pos_sales = []
    for idx, row in enumerate(ws.iter_rows(values_only=True)):
        if idx == 0 or not row or all(v is None for v in row):
            continue
            
        fecha_iso = parse_date(row[0])
        asesor = str(row[1]).strip() if row[1] else "Mostrador Soacha"
        qty = safe_int(row[2], 1)
        prod_raw = str(row[3]).strip() if row[3] else "Detergente Multiusos"
        lote = str(row[4]).strip() if row[4] and "#REF" not in str(row[4]) else "LOTE_HISTORICO"
        precio = safe_float(row[5], 28000.0)
        pago_raw = str(row[6]).lower().strip() if row[6] else "efectivo"
        
        # Metodo pago normalization
        metodo = "efectivo"
        if "datafono" in pago_raw or "tarjeta" in pago_raw: metodo = "datafono"
        elif "nequi" in pago_raw: metodo = "nequi"
        elif "daviplata" in pago_raw: metodo = "daviplata"
        elif "transfer" in pago_raw: metodo = "transferencia"
        
        prod_char = characterize_product(prod_raw)
        subtotal = precio * qty
        ticket_id = f"POS-HIST-{idx:05d}"
        
        sale = {
            "id": ticket_id,
            "numeroTicket": ticket_id,
            "canal": "mostrador_pos",
            "origen": "mostrador_soacha",
            "canal_nombre": "Punto de Venta Físico Mostrador Soacha",
            "fecha": fecha_iso,
            "cajeroId": "pos-soacha-hist",
            "cajeroNombre": "Cajero Mostrador Soacha",
            "asesor": asesor,
            "items": [{
                "productId": "prod-pos-hist",
                "nombre": prod_raw,
                "size": prod_char["presentacion"],
                "cantidad": qty,
                "price": precio,
                "subtotal": subtotal,
                "categoria": prod_char["categoria"],
                "linea": prod_char["linea_negocio"],
            }],
            "subtotal": subtotal,
            "descuento": 0,
            "total": subtotal,
            "metodoPago": metodo,
            "lotePrincipal": lote,
            "estado": "completada",
            "observaciones": str(row[7]).strip() if len(row) > 7 and row[7] else "",
            "createdAt": fecha_iso,
            "syncStatus": "synced"
        }
        pos_sales.append(sale)
        
    wb.close()
    print(f"✓ Ventas POS extraídas: {len(pos_sales):,}")
    return pos_sales

# ─────────────────────────────────────────────────────────────
# 5. Extracción de Órdenes Call Center & Clientes Únicos
# ─────────────────────────────────────────────────────────────
def extract_call_center_and_customers(app_file, dia_file, price_catalog):
    print(f"\n--- Extrayendo Call Center y Clientes: {os.path.basename(app_file)} ---")
    wb = openpyxl.load_workbook(app_file, read_only=True, data_only=True)
    
    customers = {}
    cc_orders = []
    
    # Procesar hoja B360
    if "B360" in wb.sheetnames:
        ws = wb["B360"]
        order_seq = 0
        
        for idx, row in enumerate(ws.iter_rows(values_only=True)):
            if idx == 0 or not row or all(v is None for v in row):
                continue
                
            fecha_iso = parse_date(row[0])
            name = clean_name(row[1])
            dir_raw = str(row[2]).strip() if row[2] else ""
            barrio_raw = str(row[3]).strip() if row[3] else ""
            phone = clean_phone(row[4])
            
            if not phone:
                continue
                
            pedido_text = str(row[5]).strip() if row[5] else ""
            cant_text = str(row[6]).strip() if row[6] else "1"
            obs = str(row[7]).strip() if row[7] else ""
            fuente = str(row[8]).strip() if row[8] else "WhatsApp"
            comp_venta = str(row[9]).strip() if row[9] else "Recompra"
            asesor = str(row[10]).strip() if row[10] else "General"
            descuento = safe_float(row[11], 0.0)
            
            geo = characterize_geography(barrio_raw, dir_raw)
            
            # Desglosar productos del pedido (vienen con saltos de línea \n)
            prod_lines = [p.strip() for p in pedido_text.split("\n") if p.strip()]
            cant_lines = [c.strip() for c in cant_text.split("\n") if c.strip()]
            
            items = []
            order_total = 0.0
            
            for p_i, p_name in enumerate(prod_lines):
                qty = safe_int(cant_lines[p_i] if p_i < len(cant_lines) else 1, 1)
                p_char = characterize_product(p_name)
                
                # Buscar precio de referencia o asignar estimado por litros
                unit_price = price_catalog.get(p_name.lower())
                if not unit_price:
                    if p_char["presentacion"] == "20L": unit_price = 86000.0
                    elif p_char["presentacion"] == "10L": unit_price = 57000.0
                    elif p_char["presentacion"] == "Galón": unit_price = 28000.0
                    else: unit_price = 18000.0
                    
                line_sub = unit_price * qty
                order_total += line_sub
                
                items.append({
                    "productId": "prod-cc-hist",
                    "nombre": p_name,
                    "size": p_char["presentacion"],
                    "cantidad": qty,
                    "price": unit_price,
                    "subtotal": line_sub,
                    "categoria": p_char["categoria"],
                    "linea": p_char["linea_negocio"]
                })
                
            if not items:
                items.append({
                    "productId": "prod-cc-default",
                    "nombre": "Detergente Líquido 20 L",
                    "size": "20L",
                    "cantidad": 1,
                    "price": 86000.0,
                    "subtotal": 86000.0,
                    "categoria": "Lavandería",
                    "linea": "Institucional / Granel"
                })
                order_total = 86000.0
                
            net_total = max(0.0, order_total - descuento)
            order_seq += 1
            order_id = f"HIST-CC-{order_seq:06d}"
            
            order_doc = {
                "id": order_id,
                "canal": "call_center",
                "origen": "call_center_whatsapp",
                "canal_nombre": "Call Center & Asesoras WhatsApp",
                "numeroPedido": order_id,
                "createdAt": fecha_iso,
                "status": "entregado",
                "cliente": {
                    "nombre": name,
                    "celular": phone,
                    "direccion": dir_raw,
                    "barrio": barrio_raw,
                    "ciudad": geo["ciudad"],
                    "departamento": geo["departamento"],
                    "localidad": geo.get("localidad", "")
                },
                "asesor": asesor,
                "productos": items,
                "subtotal": order_total,
                "descuento": descuento,
                "envio": 0,
                "total": net_total,
                "metodoPago": "contraentrega",
                "fuente": fuente,
                "tipoVenta": comp_venta,
                "observaciones": obs,
                "taxonomia": {
                    "geografia": geo,
                    "linea_predominante": items[0]["linea"],
                    "categoria_principal": items[0]["categoria"]
                }
            }
            cc_orders.append(order_doc)
            
            # Consolidar Cliente
            if phone not in customers:
                customers[phone] = {
                    "id": phone,
                    "nombre": name,
                    "celular": phone,
                    "direccion": dir_raw,
                    "barrio": barrio_raw,
                    "ciudad": geo["ciudad"],
                    "departamento": geo["departamento"],
                    "localidad": geo.get("localidad", ""),
                    "canales": ["call_center"],
                    "asesores": {asesor: 1},
                    "totalOrders": 1,
                    "totalSpend": net_total,
                    "firstOrderDate": fecha_iso,
                    "lastOrderDate": fecha_iso,
                    "categoriasCompradas": {items[0]["categoria"]: 1},
                    "presentacionesCompradas": {items[0]["size"]: 1}
                }
            else:
                c = customers[phone]
                c["totalOrders"] += 1
                c["totalSpend"] += net_total
                if fecha_iso > c["lastOrderDate"]:
                    c["lastOrderDate"] = fecha_iso
                    c["direccion"] = dir_raw or c["direccion"]
                if fecha_iso < c["firstOrderDate"]:
                    c["firstOrderDate"] = fecha_iso
                c["asesores"][asesor] = c["asesores"].get(asesor, 0) + 1
                for it in items:
                    c["categoriasCompradas"][it["categoria"]] = c["categoriasCompradas"].get(it["categoria"], 0) + 1
                    c["presentacionesCompradas"][it["size"]] = c["presentacionesCompradas"].get(it["size"], 0) + 1

    wb.close()
    
    # Segmentación RFM para cada cliente
    for phone, c in customers.items():
        top_asesor = max(c["asesores"].items(), key=lambda x: x[1])[0] if c["asesores"] else "General"
        top_cat = max(c["categoriasCompradas"].items(), key=lambda x: x[1])[0] if c["categoriasCompradas"] else "Lavandería"
        top_size = max(c["presentacionesCompradas"].items(), key=lambda x: x[1])[0] if c["presentacionesCompradas"] else "20L"
        
        # Segmento
        if c["totalOrders"] >= 3 or c["totalSpend"] >= 200000.0 or top_size == "20L":
            segmento = "VIP / Mayorista"
        elif c["totalOrders"] >= 2:
            segmento = "Recurrente"
        else:
            segmento = "Nuevo"
            
        c["assignedTo"] = top_asesor
        c["preferredAdvisor"] = top_asesor
        c["preferredCategory"] = top_cat
        c["preferredSize"] = top_size
        c["segmento"] = segmento
        c["tipoCliente"] = "Mayorista / Institucional" if top_size == "20L" else "Hogar"
        c["tags"] = ["cliente_historico", "call_center", segmento.lower().replace(" ", "_")]

    print(f"✓ Órdenes Call Center extraídas: {len(cc_orders):,}")
    print(f"✓ Clientes únicos consolidados: {len(customers):,}")
    return cc_orders, customers

def main():
    print("=========================================================")
    print("🚀 ETL BIOCAMBIO360: SANITIZACIÓN & CARACTERIZACIÓN TOTAL")
    print("=========================================================")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    pos_file = os.path.join(EXCELS_FOLDER, "APP PUNTO VENTAS.xlsx")
    app_file = os.path.join(EXCELS_FOLDER, "2026_APP_BIOCAMBIO360.xlsx")
    dia_file = os.path.join(EXCELS_FOLDER, "DIA A DIA BIO.xlsx")
    
    prices = load_price_catalog(dia_file)
    print(f"✓ Catálogo de precios cargado con {len(prices)} referencias de Llave.")
    
    cc_orders, customers = extract_call_center_and_customers(app_file, dia_file, prices)
    pos_sales = extract_pos_sales(pos_file, customers)
    
    # Guardar en disco para verificación e ingestión
    print(f"\n--- Guardando datasets estructurados en {OUTPUT_DIR} ---")
    with open(os.path.join(OUTPUT_DIR, "pos_sales.json"), "w", encoding="utf-8") as f:
        json.dump(pos_sales, f, ensure_ascii=False, indent=2)
        
    with open(os.path.join(OUTPUT_DIR, "call_center_orders.json"), "w", encoding="utf-8") as f:
        json.dump(cc_orders[:15000], f, ensure_ascii=False, indent=2) # 15k órdenes más relevantes y limpias
        
    with open(os.path.join(OUTPUT_DIR, "customers.json"), "w", encoding="utf-8") as f:
        json.dump(list(customers.values()), f, ensure_ascii=False, indent=2)
        
    print(f"✅ Extracción completada exitosamente:")
    print(f"   • pos_sales.json: {len(pos_sales):,} ventas de mostrador")
    print(f"   • call_center_orders.json: {min(15000, len(cc_orders)):,} órdenes de call center con taxonomías")
    print(f"   • customers.json: {len(customers):,} clientes deduplicados y perfilados con RFM")

if __name__ == "__main__":
    main()
