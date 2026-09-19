import citiesData from './cities-99envios.json';

// Colombian departments and cities data (32 departamentos oficiales de Colombia)
export const DEPARTAMENTOS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada'
];

/**
 * Mapeo de nombres oficiales de departamentos en 99 Envíos a los 32 nombres canónicos de Biocambio360
 */
export const DEPT_MAP_99: Record<string, string> = {
    'AMAZONAS': 'Amazonas',
    'ANTIOQUIA': 'Antioquia',
    'ARAUCA': 'Arauca',
    'ATLANTICO': 'Atlántico',
    'BOGOTA, D.C.': 'Cundinamarca',
    'BOLIVAR': 'Bolívar',
    'BOYACA': 'Boyacá',
    'CALDAS': 'Caldas',
    'CAQUETA': 'Caquetá',
    'CASANARE': 'Casanare',
    'CAUCA': 'Cauca',
    'CESAR': 'Cesar',
    'CHOCO': 'Chocó',
    'CORDOBA': 'Córdoba',
    'CUNDINAMARCA': 'Cundinamarca',
    'GUAINIA': 'Guainía',
    'GUAVIARE': 'Guaviare',
    'HUILA': 'Huila',
    'LA GUAJIRA': 'La Guajira',
    'MAGDALENA': 'Magdalena',
    'META': 'Meta',
    'NARIÑO': 'Nariño',
    'NORTE DE SANTANDER': 'Norte de Santander',
    'PUTUMAYO': 'Putumayo',
    'QUINDIO': 'Quindío',
    'RISARALDA': 'Risaralda',
    'ARCHIPIELAGO DE SAN ANDRES, PROVIDENCIA Y SANTA CATALINA': 'San Andrés y Providencia',
    'SAN ANDRES': 'San Andrés y Providencia',
    'SANTANDER': 'Santander',
    'SUCRE': 'Sucre',
    'TOLIMA': 'Tolima',
    'VALLE DEL CAUCA': 'Valle del Cauca',
    'VAUPES': 'Vaupés',
    'VICHADA': 'Vichada'
};

const normStr = (s?: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

/**
 * Ciudades principales y metropolitanas por departamento (aparecen de primero en selectores)
 */
const CIUDADES_PRINCIPALES: Record<string, string[]> = {
    'Cundinamarca': ['Bogotá D.C.', 'Soacha', 'Chía', 'Cota', 'Zipaquirá', 'Fusagasugá', 'Facatativá', 'Madrid', 'Mosquera', 'Funza', 'Cajicá', 'Girardot', 'Sibaté', 'Villeta', 'Anapoima'],
    'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro', 'Sabaneta', 'Apartadó', 'Turbo', 'Caucasia'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro'],
    'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
    'Caldas': ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
    'Quindío': ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya'],
    'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Mariquita', 'Honda'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
    'Meta': ['Villavicencio', 'Acacías', 'Granada'],
    'Nariño': ['Pasto', 'Ipiales', 'Tumaco'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios'],
    'Cesar': ['Valledupar', 'Aguachica', 'Codazzi'],
    'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Sahagún'],
    'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación'],
    'Sucre': ['Sincelejo', 'Corozal'],
    'Cauca': ['Popayán', 'Santander de Quilichao'],
    'La Guajira': ['Riohacha', 'Maicao'],
    'Caquetá': ['Florencia'],
    'Casanare': ['Yopal', 'Aguazul'],
    'Putumayo': ['Mocoa', 'Puerto Asís'],
    'Arauca': ['Arauca', 'Saravena'],
    'Chocó': ['Quibdó'],
    'Amazonas': ['Leticia', 'Puerto Nariño'],
    'Guaviare': ['San José del Guaviare'],
    'Guainía': ['Puerto Inírida'],
    'Vaupés': ['Mitú'],
    'Vichada': ['Puerto Carreño'],
    'San Andrés y Providencia': ['San Andrés', 'Providencia']
};

const CANONICAL_CITY_MAP = new Map<string, string>();
for (const list of Object.values(CIUDADES_PRINCIPALES)) {
    for (const c of list) {
        CANONICAL_CITY_MAP.set(normStr(c), c);
    }
}

/**
 * Formatea nombres en Title Case limpio para UI preservando excepciones de distritos
 */
export function formatCityTitleCase(rawName: string): string {
    const clean = (rawName || '').trim();
    if (!clean) return '';
    const norm = normStr(clean);
    if (norm.includes('BOGOTA') || norm.includes('DISTRITO CAPITAL')) return 'Bogotá D.C.';
    if (norm.includes('SANTIAGO DE CALI')) return 'Cali';
    if (norm.includes('BARRANQUILLA')) return 'Barranquilla';
    if (norm.includes('CARTAGENA')) return 'Cartagena';
    if (norm.includes('SANTA MARTA')) return 'Santa Marta';
    if (norm.includes('SAN JUAN DE PASTO')) return 'Pasto';
    if (norm.includes('SAN FRANCISCO DE QUIBDO')) return 'Quibdó';
    if (norm.includes('RIOHACHA')) return 'Riohacha';

    if (CANONICAL_CITY_MAP.has(norm)) {
        return CANONICAL_CITY_MAP.get(norm)!;
    }

    return clean.toLowerCase().split(' ').map((w, i) => {
        if (i > 0 && ['de', 'del', 'la', 'las', 'los', 'y', 'el', 'en'].includes(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
}

// Prefijos DANE de la Zona Local (Flota propia y flete preferencial $9.000 COP)
const ZONA_LOCAL_PREFIXES = [
    '11001', // Bogotá D.C.
    '25754', // Soacha
    '25755', // Sibaté
    '25126', // Cajicá
    '25175', // Chía
    '25290', // Funza
    '25214', // Cota
    '25473', // Mosquera
    '25430', // Madrid
    '25286', // Fusagasugá
    '25899', // Zipaquirá
    '25019', // Albán
    '25269', // El Rosal
    '25785', // Subachoque
];

export function isLocalDaneCode(code?: string): boolean {
    if (!code) return false;
    return ZONA_LOCAL_PREFIXES.some(prefix => code.startsWith(prefix));
}

// Estructura interna de 99 Envíos
export interface CityEntry99 {
    codigo: string;
    ciudad: string;
    ciudadNorm: string;
    departamento99: string;
    departamentoNorm: string;
    departamentoCanonico: string;
}

// Indexación en memoria (0 ms) de los 1,120 municipios de 99 Envíos
const entries99: CityEntry99[] = Object.values(citiesData as Record<string, { codigo: string; ciudad: string; departamento: string }>).map(item => ({
    codigo: item.codigo,
    ciudad: item.ciudad,
    ciudadNorm: normStr(item.ciudad),
    departamento99: item.departamento,
    departamentoNorm: normStr(item.departamento),
    departamentoCanonico: DEPT_MAP_99[item.departamento] || 'Cundinamarca'
}));

const citiesByCode = new Map<string, CityEntry99>();
const citiesByName = new Map<string, CityEntry99[]>();

for (const entry of entries99) {
    citiesByCode.set(entry.codigo, entry);
    const existing = citiesByName.get(entry.ciudadNorm) || [];
    existing.push(entry);
    citiesByName.set(entry.ciudadNorm, existing);
}

// Construcción completa de CIUDADES_POR_DEPARTAMENTO con los 1,120 municipios
const builtCiudadesPorDepto: Record<string, string[]> = {};
for (const dep of DEPARTAMENTOS) {
    builtCiudadesPorDepto[dep] = [...(CIUDADES_PRINCIPALES[dep] || [])];
}

for (const item of entries99) {
    const dept = item.departamentoCanonico;
    if (!builtCiudadesPorDepto[dept]) builtCiudadesPorDepto[dept] = [];
    if (item.codigo === '11001000') continue; // Ya presente como Bogotá D.C.

    const titleCity = formatCityTitleCase(item.ciudad);
    const alreadyExists = builtCiudadesPorDepto[dept].some(c => normStr(c) === normStr(titleCity));
    if (!alreadyExists) {
        builtCiudadesPorDepto[dept].push(titleCity);
    }
}

// Ordenar: ciudades principales primero, resto ordenado alfabéticamente
for (const dep of DEPARTAMENTOS) {
    const primaryCount = (CIUDADES_PRINCIPALES[dep] || []).length;
    const prim = builtCiudadesPorDepto[dep].slice(0, primaryCount);
    const rest = builtCiudadesPorDepto[dep].slice(primaryCount).sort((a, b) => a.localeCompare(b));
    builtCiudadesPorDepto[dep] = [...prim, ...rest];
}

export const CIUDADES_POR_DEPARTAMENTO: Record<string, string[]> = builtCiudadesPorDepto;

export interface CityDepartmentMatchResult {
    departamento: string;
    ciudad: string;
    codigoDane: string;
    valido: boolean;
    corregido: boolean;
    esLocal: boolean;
    departamento99?: string;
    ciudad99?: string;
}

const COMMON_ALIASES: Record<string, string> = {
    'CALI': '76001000',
    'SANTIAGO DE CALI': '76001000',
    'BOGOTA': '11001000',
    'BOGOTA D.C.': '11001000',
    'BOGOTA DC': '11001000',
    'SANTAFE DE BOGOTA': '11001000',
    'SOACHA': '25754000',
    'BARRANQUILLA': '08001000',
    'CARTAGENA': '13001000',
    'SANTA MARTA': '47001000',
    'PASTO': '52001000',
    'SAN JUAN DE PASTO': '52001000',
    'QUIBDO': '27001000',
    'SAN FRANCISCO DE QUIBDO': '27001000',
    'RIOHACHA': '44001000',
    'SAN ANDRES': '88001000',
    'PROVIDENCIA': '88564000'
};

/**
 * Coteja y normaliza de forma estricta una combinación de ciudad y departamento
 * contra el catálogo oficial de 1,120 códigos DANE de 99 Envíos.
 * Si la ciudad pertenece a otro departamento (ej: Bogotá o Bucaramanga con Amazonas),
 * corrige automáticamente el departamento a su ubicación legal y oficial.
 */
export function crossCheckCityDepartment(
    deptInput?: string,
    cityInput?: string,
    codeInput?: string
): CityDepartmentMatchResult {
    const rawCity = (cityInput || '').trim();
    const rawDept = (deptInput || '').trim();
    const cCity = normStr(rawCity);
    const cDept = normStr(rawDept);
    const cCode = (codeInput || '').trim();

    // 1. Cotejo directo por código DANE oficial de 99 Envíos
    if (cCode && citiesByCode.has(cCode)) {
        const item = citiesByCode.get(cCode)!;
        const finalCity = item.codigo === '11001000' ? 'Bogotá D.C.' : item.codigo === '25754000' ? 'Soacha' : formatCityTitleCase(item.ciudad);
        return {
            departamento: item.departamentoCanonico,
            ciudad: finalCity,
            codigoDane: item.codigo,
            valido: true,
            corregido: false,
            esLocal: isLocalDaneCode(item.codigo),
            departamento99: item.departamento99,
            ciudad99: item.ciudad
        };
    }

    // 2. Alias de ciudades principales (Cali, Bogotá, Soacha, Cartagena, Barranquilla, Pasto...)
    if (COMMON_ALIASES[cCity] && citiesByCode.has(COMMON_ALIASES[cCity])) {
        const item = citiesByCode.get(COMMON_ALIASES[cCity])!;
        const finalCity = item.codigo === '11001000' ? 'Bogotá D.C.' : item.codigo === '25754000' ? 'Soacha' : formatCityTitleCase(item.ciudad);
        const wasDeptCorrect = normStr(item.departamentoCanonico) === cDept || item.departamentoNorm === cDept;
        return {
            departamento: item.departamentoCanonico,
            ciudad: finalCity,
            codigoDane: item.codigo,
            valido: true,
            corregido: !wasDeptCorrect,
            esLocal: isLocalDaneCode(item.codigo),
            departamento99: item.departamento99,
            ciudad99: item.ciudad
        };
    }

    // 3. Regla Bogotá y Distrito Capital
    if (
        cCity.includes('BOGOTA') ||
        cCity.includes('SANTAFE DE BOGOTA') ||
        cDept.includes('BOGOTA') ||
        cDept === 'D.C.' ||
        cDept === 'DC' ||
        cDept.includes('DISTRITO CAPITAL')
    ) {
        return {
            departamento: 'Cundinamarca',
            ciudad: 'Bogotá D.C.',
            codigoDane: '11001000',
            valido: true,
            corregido: cDept !== 'CUNDINAMARCA',
            esLocal: true,
            departamento99: 'BOGOTA, D.C.',
            ciudad99: 'BOGOTA, DISTRITO CAPITAL'
        };
    }

    // 4. Regla Soacha
    if (cCity.includes('SOACHA')) {
        return {
            departamento: 'Cundinamarca',
            ciudad: 'Soacha',
            codigoDane: '25754000',
            valido: true,
            corregido: cDept !== 'CUNDINAMARCA',
            esLocal: true,
            departamento99: 'CUNDINAMARCA',
            ciudad99: 'SOACHA'
        };
    }

    // 5. Coincidencia exacta en catálogo de 99 Envíos
    const exactMatches = citiesByName.get(cCity) || [];
    if (exactMatches.length > 0) {
        const matchWithDept = exactMatches.find(m => {
            const canNorm = normStr(m.departamentoCanonico);
            return m.departamentoNorm === cDept || canNorm === cDept || cDept.includes(canNorm) || canNorm.includes(cDept);
        });

        const chosen = matchWithDept || exactMatches[0];
        const isCorregido = !matchWithDept;
        const isBog = chosen.codigo === '11001000';
        const isSoa = chosen.codigo === '25754000';
        const finalCity = isBog ? 'Bogotá D.C.' : isSoa ? 'Soacha' : formatCityTitleCase(chosen.ciudad);

        return {
            departamento: chosen.departamentoCanonico,
            ciudad: finalCity,
            codigoDane: chosen.codigo,
            valido: true,
            corregido: isCorregido,
            esLocal: isLocalDaneCode(chosen.codigo),
            departamento99: chosen.departamento99,
            ciudad99: chosen.ciudad
        };
    }

    // 6. Coincidencia difusa / parcial
    if (cCity.length >= 4) {
        for (const [name, list] of citiesByName.entries()) {
            if (name.includes(cCity) || cCity.includes(name)) {
                const matchWithDept = list.find(m => {
                    const canNorm = normStr(m.departamentoCanonico);
                    return m.departamentoNorm === cDept || canNorm === cDept;
                });
                const chosen = matchWithDept || list[0];
                return {
                    departamento: chosen.departamentoCanonico,
                    ciudad: formatCityTitleCase(chosen.ciudad),
                    codigoDane: chosen.codigo,
                    valido: true,
                    corregido: true,
                    esLocal: isLocalDaneCode(chosen.codigo),
                    departamento99: chosen.departamento99,
                    ciudad99: chosen.ciudad
                };
            }
        }
    }

    // 7. Fallback canónico seguro
    const fallbackDept = DEPT_MAP_99[cDept] || DEPARTAMENTOS.find(d => normStr(d) === cDept) || 'Cundinamarca';
    return {
        departamento: fallbackDept,
        ciudad: rawCity || (fallbackDept === 'Cundinamarca' ? 'Bogotá D.C.' : 'Capital'),
        codigoDane: fallbackDept === 'Cundinamarca' ? '11001000' : '00000000',
        valido: false,
        corregido: true,
        esLocal: fallbackDept === 'Cundinamarca',
        departamento99: fallbackDept.toUpperCase(),
        ciudad99: rawCity.toUpperCase()
    };
}

/**
 * Normaliza departamento y ciudad ejecutando el cotejo de 99 Envíos.
 * Compatible 100% con firmas anteriores de { departamento, ciudad }.
 */
export function normalizeDepartmentAndCity(
    deptInput?: string,
    cityInput?: string,
    codeInput?: string
): CityDepartmentMatchResult {
    return crossCheckCityDepartment(deptInput, cityInput, codeInput);
}

/**
 * Obtiene el código DANE oficial de 99 Envíos mediante cotejo geográfico estricto
 */
export function findDaneCode(
    dept?: string,
    city?: string,
    codeInput?: string
): {
    codigo: string;
    nombre: string;
    departamento: string;
    valido: boolean;
    esLocal: boolean;
} {
    const res = crossCheckCityDepartment(dept, city, codeInput);
    return {
        codigo: res.codigoDane,
        nombre: res.ciudad99 || res.ciudad,
        departamento: res.departamento,
        valido: res.valido,
        esLocal: res.esLocal
    };
}

// Shipping cost calculation by region (Biocambio360 Logistics)
export function calculateShipping(departamento: string, ciudad: string, codigoDane?: string): number {
    const norm = crossCheckCityDepartment(departamento, ciudad, codigoDane);
    if (norm.esLocal) {
        return 9000;
    }
    return 18000;
}


// Validate Colombian ID number (basic validation)
export function validateCedula(cedula: string): boolean {
    // Remove spaces and non-numeric characters
    const cleaned = cedula.replace(/\D/g, '');

    // Must be between 6 and 10 digits
    return cleaned.length >= 6 && cleaned.length <= 10;
}

// Validate Colombian phone number
export function validateCelular(celular: string): boolean {
    // Remove spaces and non-numeric characters
    const cleaned = celular.replace(/\D/g, '');

    // Must be 10 digits and start with 3
    return cleaned.length === 10 && cleaned.startsWith('3');
}

// Format currency
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(value);
}
