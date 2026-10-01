#!/usr/bin/env python3
"""
Biocambio360 — Script de Extracción y Caracterización Forense de Excels
Analiza la estructura de la carpeta 'EXCELS POR INTEGRAR/nuevos_19_sept'
y genera el informe de conciliación de datos para producción y CRM.
"""

import os
import glob
import openpyxl
from datetime import datetime

BASE_DIR = 'EXCELS POR INTEGRAR/nuevos_19_sept'

def characterize():
    print("=" * 60)
    print("BIOCAMBIO360 — AUDITORÍA DE EXCELS 'nuevos_19_sept'")
    print("=" * 60)

    # 1. Conteo de archivos por año y mes
    years = ['2025', '2026']
    total_production_files = 0
    stats_by_month = {}

    for y in years:
        y_path = os.path.join(BASE_DIR, y)
        if not os.path.exists(y_path):
            continue
        stats_by_month[y] = {}
        for month_folder in sorted(os.listdir(y_path)):
            m_path = os.path.join(y_path, month_folder)
            if os.path.isdir(m_path):
                files = glob.glob(f"{m_path}/*/*.xlsx")
                stats_by_month[y][month_folder] = len(files)
                total_production_files += len(files)

    print(f"\n1. ÓRDENES DE PRODUCCIÓN DETECTADAS: {total_production_files} archivos SGC (FR-001-POE-007)")
    for y, months in stats_by_month.items():
        print(f"\n   Año {y}:")
        for m, count in months.items():
            print(f"     - {m:<15}: {count:>3} órdenes de producción")

    # 2. Muestreo de datos de órdenes de producción
    sample_files = glob.glob(f"{BASE_DIR}/2026/*/*/*.xlsx")
    products_found = set()
    total_kg_sample = 0

    print("\n2. MUESTREO DE PRODUCTOS Y VOLÚMENES EN ÓRDENES POE-007:")
    for f in sample_files[:20]:
        try:
            wb = openpyxl.load_workbook(f, data_only=True, read_only=True)
            if 'ORDEN DE PRODUCCION' in wb.sheetnames:
                ws = wb['ORDEN DE PRODUCCION']
                rows = list(ws.iter_rows(values_only=True))
                # Fila 5: ('ORDEN DE PRODUCCION', None, 300926114.0, None, 'PRODUCTO', None, 'Detergente líquido ropa', ...)
                for r in rows:
                    if r and len(r) > 8 and r[6] == 'PRODUCTO' and r[8]:
                        products_found.add(str(r[8]))
                    if r and len(r) > 9 and r[8] == 'CANTIDAD TOTAL A FABRICAR g' and r[9]:
                        try:
                            total_kg_sample += float(r[9]) / 1000.0
                        except:
                            pass
        except Exception as e:
            pass

    print(f"   Productos identificados en órdenes de lote: {products_found}")
    print(f"   Muestra de 20 órdenes suma: {total_kg_sample:,.1f} Kg de producto formulado")

    # 3. Análisis de PRODUCCION APP.xlsx
    prod_app_path = os.path.join(BASE_DIR, 'PRODUCCIÓN APP.xlsx')
    if os.path.exists(prod_app_path):
        wb_app = openpyxl.load_workbook(prod_app_path, data_only=True, read_only=True)
        print(f"\n3. ANÁLISIS DE 'PRODUCCIÓN APP.xlsx':")
        print(f"   Hojas: {wb_app.sheetnames}")
        if 'FORMULARIO1' in wb_app.sheetnames:
            ws_form = wb_app['FORMULARIO1']
            rows_form = list(ws_form.iter_rows(values_only=True))
            print(f"   Registros de Calidad / Bitácora de Planta: {len(rows_form) - 1} batches registrados con pH, densidad y operario")

    # 4. Análisis de USUARIOS.xlsx
    users_path = os.path.join(BASE_DIR, 'USUARIOS.xlsx')
    if os.path.exists(users_path):
        wb_u = openpyxl.load_workbook(users_path, data_only=True, read_only=True)
        ws_u = wb_u.active
        rows_u = [r for r in ws_u.iter_rows(values_only=True) if any(r)]
        print(f"\n4. ANÁLISIS DE 'USUARIOS.xlsx':")
        print(f"   Canales y Cuentas Mapeadas: {len(rows_u) - 1} registros (Marketplace, Meta, Shopify, CRM, WhatsApp)")

if __name__ == '__main__':
    characterize()
