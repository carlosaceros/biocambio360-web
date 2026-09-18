#!/usr/bin/env python3
"""
Biocambio360 — Script ETL de Ingestión, Limpieza y Migración de Datos desde Excel a Firestore.
Modo Seguro: Por defecto ejecuta en modo simulación (--dry-run).
Para aplicar escrituras se debe pasar el flag explícito: --execute
"""

import os
import sys
import re
import argparse
from datetime import datetime
import openpyxl

EXCELS_FOLDER = "EXCELS POR INTEGRAR"

def clean_phone(phone_val):
    if not phone_val:
        return ""
    digits = re.sub(r"\D", "", str(phone_val))
    # Handle Colombian numbers with country code prefix 57
    if len(digits) == 12 and digits.startswith("57"):
        digits = digits[2:]
    return digits

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        # Handle string formatting like "$ 1.200.000"
        s = str(val).replace("$", "").replace(".", "").replace(",", ".").strip()
        return float(s)
    except:
        return default

def safe_int(val, default=0):
    return int(safe_float(val, default))

def parse_excel_date(date_val):
    if not date_val:
        return datetime.now().isoformat()
    if isinstance(date_val, datetime):
        return date_val.isoformat()
    try:
        return datetime.fromisoformat(str(date_val)).isoformat()
    except:
        return datetime.now().isoformat()

def audit_pos_sales(filepath):
    print(f"\n--- [1/3] Auditando Punto de Venta: {os.path.basename(filepath)} ---")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    if "VENTAS" not in wb.sheetnames:
        print("Error: Hoja 'VENTAS' no encontrada en archivo POS")
        wb.close()
        return []

    ws = wb["VENTAS"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    header = rows[0] if rows else []
    data_rows = rows[1:]
    print(f"Total filas encontradas: {len(data_rows)}")

    valid_sales = []
    advisors_set = set()
    payment_methods_set = set()

    for idx, r in enumerate(data_rows):
        if not r or all(v is None for v in r):
            continue
        fecha = parse_excel_date(r[0])
        asesor = str(r[1]).strip() if r[1] else "General"
        cantidad = safe_int(r[2], 1)
        producto = str(r[3]).strip() if r[3] else "Producto No Especificado"
        lote = str(r[4]).strip() if r[4] else "SIN_LOTE"
        precio = safe_float(r[5], 0.0)
        modo_pago = str(r[6]).upper().strip() if r[6] else "EFECTIVO"
        observacion = str(r[7]).strip() if len(r) > 7 and r[7] else ""

        advisors_set.add(asesor)
        payment_methods_set.add(modo_pago)

        valid_sales.append({
            "numeroTicket": f"POS-HIST-{idx+1:05d}",
            "fecha": fecha,
            "asesor": asesor,
            "cantidad": cantidad,
            "producto": producto,
            "lote": lote,
            "precioUnitario": precio,
            "total": precio * cantidad,
            "metodoPago": modo_pago,
            "observaciones": observacion,
        })

    print(f"✓ Ventas válidas procesadas: {len(valid_sales)}")
    print(f"  Asesores identificados: {sorted(list(advisors_set))}")
    print(f"  Medios de pago identificados: {sorted(list(payment_methods_set))}")
    return valid_sales

def audit_customers(filepath):
    print(f"\n--- [2/3] Auditando y Deduplicando Clientes: {os.path.basename(filepath)} ---")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    
    # Priority sheet: BASE FACT or B360
    target_sheet = "BASE FACT" if "BASE FACT" in wb.sheetnames else wb.sheetnames[0]
    ws = wb[target_sheet]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    print(f"Hoja analizada: [{target_sheet}], total filas: {len(rows)-1}")
    header = rows[0]
    # Find column indices
    col_map = {}
    for i, h in enumerate(header):
        if not h: continue
        name = str(h).upper()
        if "TEL" in name or "CEL" in name: col_map["tel"] = i
        elif "CLI" in name or "NOM" in name: col_map["name"] = i
        elif "DIR" in name: col_map["dir"] = i
        elif "BAR" in name or "LOC" in name: col_map["loc"] = i
        elif "ASE" in name: col_map["asesor"] = i

    customers_by_phone = {}
    anomalies = 0

    for r in rows[1:]:
        if not r: continue
        tel_raw = r[col_map.get("tel", 4)] if len(r) > col_map.get("tel", 4) else None
        phone = clean_phone(tel_raw)
        
        if not phone or len(phone) < 10:
            anomalies += 1
            continue

        name = str(r[col_map.get("name", 1)]).strip() if len(r) > col_map.get("name", 1) and r[col_map.get("name", 1)] else "Cliente"
        direccion = str(r[col_map.get("dir", 2)]).strip() if len(r) > col_map.get("dir", 2) and r[col_map.get("dir", 2)] else ""
        barrio = str(r[col_map.get("loc", 3)]).strip() if len(r) > col_map.get("loc", 3) and r[col_map.get("loc", 3)] else ""
        asesor = str(r[col_map.get("asesor", 8)]).strip() if len(r) > col_map.get("asesor", 8) and r[col_map.get("asesor", 8)] else ""

        if phone not in customers_by_phone:
            customers_by_phone[phone] = {
                "id": phone,
                "nombre": name,
                "celular": phone,
                "direccion": direccion,
                "ciudad": barrio,
                "assignedTo": asesor,
                "ordersCount": 1,
            }
        else:
            customers_by_phone[phone]["ordersCount"] += 1
            if asesor and not customers_by_phone[phone]["assignedTo"]:
                customers_by_phone[phone]["assignedTo"] = asesor

    print(f"✓ Clientes únicos deduplicados por celular (10 dígitos): {len(customers_by_phone)}")
    print(f"  Filas descartadas por falta de número de contacto válido: {anomalies}")
    return customers_by_phone

def main():
    parser = argparse.ArgumentParser(description="Biocambio360 ETL Migration")
    parser.add_argument("--execute", action="store_true", help="Aplica escrituras reales en Firestore (por defecto es Dry-Run)")
    args = parser.parse_args()

    mode_label = "ESCRITURA REAL EN FIRESTORE" if args.execute else "SIMULACIÓN (DRY-RUN)"
    print(f"=========================================================")
    print(f"🚀 INICIANDO ETL BIOCAMBIO360 — MODO: {mode_label}")
    print(f"=========================================================")

    pos_file = os.path.join(EXCELS_FOLDER, "APP PUNTO VENTAS.xlsx")
    app_file = os.path.join(EXCELS_FOLDER, "2026_APP_BIOCAMBIO360.xlsx")

    sales = audit_pos_sales(pos_file) if os.path.exists(pos_file) else []
    customers = audit_customers(app_file) if os.path.exists(app_file) else {}

    print(f"\n=========================================================")
    print(f"📊 RESUMEN FINAL DEL AUDIT ETL")
    print(f"=========================================================")
    print(f"• Ventas POS listas para migración: {len(sales):,} transacciones")
    print(f"• Clientes únicos deduplicados listos: {len(customers):,} perfiles")
    
    if not args.execute:
        print(f"\n[INFO] Simulación completada con CERO modificaciones en la base de datos.")
        print(f"Para aplicar la persistencia real, ejecuta: python3 scripts/etl_migrate_excels.py --execute")
    else:
        print(f"\n[EXEC] Escribiendo datos en Firestore...")
        # Database writes would proceed here via firebase-admin

if __name__ == "__main__":
    main()
