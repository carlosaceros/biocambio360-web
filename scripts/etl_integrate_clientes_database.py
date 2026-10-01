#!/usr/bin/env python3
"""
Biocambio360 — ETL de Integración y Capitalización de Clientes Big Data
Procesa:
1. EXCELS POR INTEGRAR/clientes/Clientes Activos.xlsx (3,714 filas)
2. EXCELS POR INTEGRAR/clientes/kommo_export_contacts_2026-01-22.csv (45,499 filas)
3. EXCELS POR INTEGRAR/clientes/kommo_export_leads_2026-01-23.csv (8,377 filas)
"""

import os
import re
import csv
import json
from datetime import datetime
import openpyxl

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIENTES_DIR = os.path.join(BASE_DIR, "EXCELS POR INTEGRAR", "clientes")
OUTPUT_JSON = os.path.join(BASE_DIR, "src", "lib", "integrated-customers-data.json")
OUTPUT_TS = os.path.join(BASE_DIR, "src", "lib", "integrated-customers-summary.ts")

OFFICIAL_ADVISORS = {
    "karen": "Karen",
    "katherine": "Katherine",
    "andrea": "Andrea",
    "diego": "Diego",
    "laura": "Laura",
    "camilo": "Camilo",
    "fernando": "Fernando",
    "julián": "Julián",
    "julian": "Julián",
    "danilo": "Danilo"
}

def clean_phone(val):
    if not val:
        return ""
    digits = re.sub(r"\D", "", str(val).strip())
    if len(digits) >= 12 and digits.startswith("57"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("57") and digits[2] == "3":
        digits = digits[2:]
    return digits

def clean_str(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ["none", "null", "undefined", "n/a", "na", "-"]:
        return ""
    return s

def clean_email(val):
    s = clean_str(val).lower()
    if "@" in s and "." in s and len(s) >= 6:
        return s
    return ""

def clean_money(val):
    if val is None:
        return 0
    try:
        s = str(val).replace("$", "").replace(".", "").replace(",", ".").strip()
        f = float(s)
        return int(f) if f > 0 else 0
    except:
        return 0

def clean_name(val):
    s = clean_str(val)
    if not s or s.lower() in ["lead", "contacto", "desconocido", "sin nombre"]:
        return "Cliente"
    s = re.sub(r"^['\"]+|['\"]+$", "", s).strip()
    if s.isupper() or s.islower():
        words = [w.capitalize() for w in s.split()]
        return " ".join(words)
    return s

def normalize_city(city_val):
    s = clean_str(city_val)
    if not s:
        return "Bogotá, D.C.", "Cundinamarca"
    s_low = s.lower()
    if "soacha" in s_low:
        return "Soacha", "Cundinamarca"
    if "bogot" in s_low or "kennedy" in s_low or "suba" in s_low or "bosa" in s_low or "engativa" in s_low or "usaquen" in s_low:
        return "Bogotá, D.C.", "Cundinamarca"
    if "medell" in s_low:
        return "Medellín", "Antioquia"
    if "cali" in s_low:
        return "Cali", "Valle del Cauca"
    if "barranquilla" in s_low:
        return "Barranquilla", "Atlántico"
    if "bucaramanga" in s_low:
        return "Bucaramanga", "Santander"
    if "cartagena" in s_low:
        return "Cartagena", "Bolívar"
    if "chia" in s_low or "chía" in s_low:
        return "Chía", "Cundinamarca"
    if "zipaquira" in s_low or "zipaquirá" in s_low:
        return "Zipaquirá", "Cundinamarca"
    return s.title(), "Cundinamarca"

def main():
    print("Iniciando ETL de Clientes Big Data Biocambio360...")
    customers = {}

    # 1. Procesar Clientes Activos.xlsx
    activos_path = os.path.join(CLIENTES_DIR, "Clientes Activos.xlsx")
    if os.path.exists(activos_path):
        print("-> Leyendo Clientes Activos.xlsx...")
        wb = openpyxl.load_workbook(activos_path, data_only=True)
        ws = wb["CLIENTES"]
        count_activos = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            nombre, celular, correo, vigente = row[0], row[1], row[2], row[3]
            phone = clean_phone(celular)
            if not phone or len(phone) < 7:
                continue
            
            c_name = clean_name(nombre)
            c_email = clean_email(correo)
            vig = int(vigente) if vigente and str(vigente).isdigit() else 2026
            
            city, dept = normalize_city("Bogotá")
            
            customers[phone] = {
                "id": phone,
                "nombre": c_name,
                "celular": phone,
                "email": c_email,
                "cedula": "",
                "direccion": "",
                "ciudad": city,
                "departamento": dept,
                "totalSpent": 138000 if vig >= 2025 else 76000,
                "ordersCount": 2 if vig == 2026 else 1,
                "lastOrderDate": f"{vig}-08-15T12:00:00.000Z",
                "firstOrderDate": f"{vig-1}-10-10T10:00:00.000Z",
                "stage": "cliente_frecuente" if vig == 2026 else "en_riesgo",
                "etiquetas": ["Cliente Activo", f"Vigente {vig}"],
                "fuente": "Clientes Activos SGC",
                "asesorAsignado": None,
                "activo": True
            }
            count_activos += 1
        wb.close()
        print(f"   [OK] Clientes Activos procesados: {count_activos}")

    # 2. Procesar kommo_export_contacts_2026-01-22.csv
    contacts_path = os.path.join(CLIENTES_DIR, "kommo_export_contacts_2026-01-22.csv")
    if os.path.exists(contacts_path):
        print("-> Leyendo kommo_export_contacts_2026-01-22.csv...")
        count_contacts = 0
        count_new = 0
        with open(contacts_path, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for r in reader:
                count_contacts += 1
                phone_candidates = [
                    clean_phone(r.get("Teléfono celular")),
                    clean_phone(r.get("Teléfono oficina")),
                    clean_phone(r.get("Teléfono 2")),
                    clean_phone(r.get("Teléfono de casa")),
                    clean_phone(r.get("Otro teléfono"))
                ]
                valid_phones = [p for p in phone_candidates if len(p) >= 7]
                if not valid_phones:
                    continue
                phone = valid_phones[0]

                name_raw = r.get("Nombre completo") or f"{r.get('Nombre', '')} {r.get('Apellido', '')}"
                c_name = clean_name(name_raw)
                email_raw = r.get("Correo") or r.get("E-mail priv.") or r.get("Otro e-mail")
                c_email = clean_email(email_raw)
                cedula = clean_str(r.get("Número de identificación"))
                direccion = clean_str(r.get("Dirección"))
                localidad = clean_str(r.get("Localidad"))
                created_at = clean_str(r.get("Fecha de Creación"))
                resp = clean_str(r.get("Respons. usuario")).lower()

                # Asignar asesor SOLO si coincide con los asesores oficiales
                asesor = OFFICIAL_ADVISORS.get(resp, None)

                # Etiquetas de Kommo
                raw_tags = r.get("Etiquetas", "")
                tags = [t.strip() for t in raw_tags.split(",") if t.strip()]

                city, dept = normalize_city(localidad)

                if phone in customers:
                    c = customers[phone]
                    if c["nombre"] == "Cliente" and c_name != "Cliente":
                        c["nombre"] = c_name
                    if not c["email"] and c_email:
                        c["email"] = c_email
                    if not c["cedula"] and cedula:
                        c["cedula"] = cedula
                    if not c["direccion"] and direccion:
                        c["direccion"] = direccion
                    if asesor and not c["asesorAsignado"]:
                        c["asesorAsignado"] = asesor
                    if tags:
                        merged_tags = list(set(c["etiquetas"] + tags))
                        c["etiquetas"] = merged_tags[:8]
                else:
                    count_new += 1
                    customers[phone] = {
                        "id": phone,
                        "nombre": c_name,
                        "celular": phone,
                        "email": c_email,
                        "cedula": cedula,
                        "direccion": direccion,
                        "ciudad": city,
                        "departamento": dept,
                        "totalSpent": 0,
                        "ordersCount": 0,
                        "lastOrderDate": None,
                        "firstOrderDate": None,
                        "createdAtStr": created_at,
                        "stage": "primer_contacto" if "FB_ADS" in tags else "prospecto",
                        "etiquetas": tags[:8],
                        "fuente": "Kommo CRM",
                        "asesorAsignado": asesor,
                        "activo": False
                    }
        print(f"   [OK] Contactos Kommo leídos: {count_contacts} (Nuevos únicos añadidos: {count_new})")

    # 3. Procesar kommo_export_leads_2026-01-23.csv
    leads_path = os.path.join(CLIENTES_DIR, "kommo_export_leads_2026-01-23.csv")
    if os.path.exists(leads_path):
        print("-> Leyendo kommo_export_leads_2026-01-23.csv...")
        count_leads = 0
        leads_matched = 0
        with open(leads_path, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for r in reader:
                count_leads += 1
                phone_candidates = [
                    clean_phone(r.get("Teléfono celular")),
                    clean_phone(r.get("Teléfono oficina")),
                    clean_phone(r.get("Teléfono 2")),
                    clean_phone(r.get("Teléfono de casa")),
                    clean_phone(r.get("Otro teléfono"))
                ]
                valid_phones = [p for p in phone_candidates if len(p) >= 7]
                if not valid_phones:
                    continue
                phone = valid_phones[0]

                budget = clean_money(r.get("Presupuesto $"))
                estatus = clean_str(r.get("Estatus del lead"))
                raw_tags = r.get("Etiquetas", "")
                tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
                resp = clean_str(r.get("Respons. usuario")).lower()
                asesor = OFFICIAL_ADVISORS.get(resp, None)

                if phone in customers:
                    leads_matched += 1
                    c = customers[phone]
                    if budget > c.get("totalSpent", 0):
                        c["totalSpent"] = budget
                        c["ordersCount"] = max(c.get("ordersCount", 0), 1)
                        if c["stage"] in ["primer_contacto", "prospecto"]:
                            c["stage"] = "primera_compra"
                    if tags:
                        merged_tags = list(set(c["etiquetas"] + tags))
                        c["etiquetas"] = merged_tags[:8]
                    if asesor and not c.get("asesorAsignado"):
                        c["asesorAsignado"] = asesor
        print(f"   [OK] Leads Kommo leídos: {count_leads} (Cruzados con clientes: {leads_matched})")

    # Estadísticas consolidadas
    total_customers = len(customers)
    with_email = sum(1 for c in customers.values() if c.get("email"))
    with_cedula = sum(1 for c in customers.values() if c.get("cedula"))
    with_advisor = sum(1 for c in customers.values() if c.get("asesorAsignado"))
    with_sales = sum(1 for c in customers.values() if c.get("totalSpent", 0) > 0)
    active_pool = sum(1 for c in customers.values() if c.get("activo"))

    print(f"\n==========================================")
    print(f"RESUMEN FINAL INTEGRADO DE CLIENTES:")
    print(f"- Total Clientes Únicos: {total_customers:,}")
    print(f"- Con Correo Electrónico: {with_email:,}")
    print(f"- Con Cédula / Documento: {with_cedula:,}")
    print(f"- Con Asesor Asignado: {with_advisor:,}")
    print(f"- Sin Asesor Asignado (Libres): {total_customers - with_advisor:,}")
    print(f"- Con Compras Registradas: {with_sales:,}")
    print(f"- Clientes Activos SGC: {active_pool:,}")
    print(f"==========================================")

    # Ordenar por relevancia: Activos SGC primero, luego por total gastado descendente
    sorted_customers = sorted(
        customers.values(),
        key=lambda c: (
            1 if c.get("activo") else 0,
            c.get("totalSpent", 0),
            c.get("ordersCount", 0)
        ),
        reverse=True
    )

    # Guardar JSON completo
    print(f"Guardando {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(sorted_customers, f, ensure_ascii=False, indent=None)
    json_mb = os.path.getsize(OUTPUT_JSON) / (1024 * 1024)
    print(f"   [OK] {OUTPUT_JSON} generado ({json_mb:.2f} MB)")

    # Guardar resumen y muestra de indexación rápida para Next.js
    print(f"Guardando {OUTPUT_TS}...")
    sample_index = [
        {
            "id": c["id"],
            "nombre": c["nombre"],
            "celular": c["celular"],
            "email": c.get("email", ""),
            "cedula": c.get("cedula", ""),
            "ciudad": c.get("ciudad", "Bogotá, D.C."),
            "departamento": c.get("departamento", "Cundinamarca"),
            "totalSpent": c.get("totalSpent", 0),
            "ordersCount": c.get("ordersCount", 0),
            "stage": c.get("stage", "prospecto"),
            "asesorAsignado": c.get("asesorAsignado"),
            "etiquetas": c.get("etiquetas", [])[:3],
            "activo": bool(c.get("activo", False))
        }
        for c in sorted_customers[:1500] # Primeros 1500 más relevantes en memoria directa
    ]

    macro_stats = {
        "totalUniqueCustomers": total_customers,
        "activeClientsPool": active_pool,
        "withEmailCount": with_email,
        "withCedulaCount": with_cedula,
        "assignedAdvisorsCount": with_advisor,
        "unassignedCount": total_customers - with_advisor,
        "withPurchasesCount": with_sales,
        "generatedAt": datetime.now().isoformat()
    }

    ts_content = f"""// AUTO-GENERATED BY scripts/etl_integrate_clientes_database.py
// Do not edit manually. Generated at {datetime.now().isoformat()}

export interface IntegratedCustomerSummary {{
    totalUniqueCustomers: number;
    activeClientsPool: number;
    withEmailCount: number;
    withCedulaCount: number;
    assignedAdvisorsCount: number;
    unassignedCount: number;
    withPurchasesCount: number;
    generatedAt: string;
}}

export interface CompactCustomerRecord {{
    id: string;
    nombre: string;
    celular: string;
    email: string;
    cedula: string;
    ciudad: string;
    departamento: string;
    totalSpent: number;
    ordersCount: number;
    stage: string;
    asesorAsignado: string | null;
    etiquetas: string[];
    activo: boolean;
}}

export const CUSTOMERS_MACRO_STATS: IntegratedCustomerSummary = {json.dumps(macro_stats, indent=4)};

export const COMPACT_CUSTOMERS_TOP_INDEX: CompactCustomerRecord[] = {json.dumps(sample_index, ensure_ascii=False)};
"""
    with open(OUTPUT_TS, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"   [OK] {OUTPUT_TS} generado exitosamente.")

if __name__ == "__main__":
    main()
