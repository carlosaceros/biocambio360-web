// Colombian departments and cities data
export const DEPARTAMENTOS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada'
];

export const CIUDADES_POR_DEPARTAMENTO: Record<string, string[]> = {
    'Cundinamarca': [
        'Bogotá D.C.', 'Soacha', 'Fusagasugá', 'Facatativá', 'Zipaquirá', 'Chía',
        'Madrid', 'Mosquera', 'Funza', 'Cajicá', 'Girardot', 'Villeta', 'Anapoima'
    ],
    'Antioquia': [
        'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro', 'Apartadó',
        'Turbo', 'Caucasia'
    ],
    'Valle del Cauca': [
        'Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Jamundí'
    ],
    'Atlántico': [
        'Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'
    ],
    'Santander': [
        'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja',
        'San Gil', 'Socorro'
    ],
    // Simplified for other departments - use main city
    'Bolívar': ['Cartagena', 'Magangué', 'Turbaco'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'],
    'Caldas': ['Manizales', 'Villamaría', 'Chinchiná'],
    'Cauca': ['Popayán', 'Santander de Quilichao'],
    'Cesar': ['Valledupar', 'Aguachica', 'Codazzi'],
    'Córdoba': ['Montería', 'Cereté', 'Lorica'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón'],
    'La Guajira': ['Riohacha', 'Maicao'],
    'Magdalena': ['Santa Marta', 'Ciénaga'],
    'Meta': ['Villavicencio', 'Granada', 'Acacías'],
    'Nariño': ['Pasto', 'Tumaco', 'Ipiales'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona'],
    'Quindío': ['Armenia', 'Calarcá', 'Montenegro'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
    'Tolima': ['Ibagué', 'Espinal', 'Girardot'],
    'Sucre': ['Sincelejo', 'Corozal'],
    'Caquetá': ['Florencia'],
    'Casanare': ['Yopal'],
    'Putumayo': ['Mocoa'],
    'Arauca': ['Arauca'],
    'Guaviare': ['San José del Guaviare'],
    'Vichada': ['Puerto Carreño'],
    'Guainía': ['Puerto Inírida'],
    'Vaupés': ['Mitú'],
    'Amazonas': ['Leticia'],
    'Chocó': ['Quibdó'],
    'San Andrés y Providencia': ['San Andrés']
};

// Shipping cost calculation by region (Biocambio360 Logistics)
export function calculateShipping(departamento: string, ciudad: string): number {
    const norm = normalizeDepartmentAndCity(departamento, ciudad);
    const isLocal = norm.departamento === 'Cundinamarca' && 
        ['Bogotá D.C.', 'Soacha', 'Sibaté', 'Chía', 'Cota', 'Mosquera', 'Funza', 'Madrid', 'Cajicá', 'Fusagasugá', 'Zipaquirá'].includes(norm.ciudad);

    if (isLocal) {
        return 9000;
    }

    // National
    return 18000;
}

/**
 * Normaliza departamento y ciudad para evitar incongruencias geográficas.
 * En particular, en Biocambio360 la ciudad 'Bogotá D.C.', 'Soacha' y municipios
 * de Cundinamarca deben tener SIEMPRE departamento 'Cundinamarca', nunca 'Amazonas'
 * ni valores desfasados como 'BOGOTA, D.C.'.
 */
export function normalizeDepartmentAndCity(
    deptInput?: string,
    cityInput?: string
): { departamento: string; ciudad: string } {
    const rawDept = (deptInput || '').trim();
    const rawCity = (cityInput || '').trim();

    const cleanDept = rawDept.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const cleanCity = rawCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    // 1. Si la ciudad o departamento menciona Bogotá / Distrito Capital / D.C.
    if (
        cleanCity.includes('BOGOTA') ||
        cleanCity.includes('SANTAFE DE BOGOTA') ||
        cleanDept.includes('BOGOTA') ||
        cleanDept === 'D.C.' ||
        cleanDept === 'DC' ||
        cleanDept.includes('DISTRITO CAPITAL')
    ) {
        return {
            departamento: 'Cundinamarca',
            ciudad: 'Bogotá D.C.'
        };
    }

    // 2. Si la ciudad menciona Soacha
    if (cleanCity.includes('SOACHA')) {
        return {
            departamento: 'Cundinamarca',
            ciudad: 'Soacha'
        };
    }

    // 3. Si la ciudad pertenece a Cundinamarca
    const cundinamarcaCities = CIUDADES_POR_DEPARTAMENTO['Cundinamarca'] || [];
    const matchedCund = cundinamarcaCities.find(c => {
        const normC = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return normC === cleanCity || cleanCity.includes(normC);
    });
    if (matchedCund) {
        return {
            departamento: 'Cundinamarca',
            ciudad: matchedCund
        };
    }

    // 4. Si el departamento dice 'Amazonas' pero la ciudad NO es de Amazonas (Leticia)
    // (Caso típico donde el select se desfasó a la primera opción 'Amazonas')
    if (cleanDept === 'AMAZONAS' && !cleanCity.includes('LETICIA') && !cleanCity.includes('AMAZONAS')) {
        // Intentar encontrar el departamento al que pertenece la ciudad
        for (const [dName, cList] of Object.entries(CIUDADES_POR_DEPARTAMENTO)) {
            const found = cList.find(c => {
                const normC = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                return normC === cleanCity || cleanCity.includes(normC);
            });
            if (found) {
                return {
                    departamento: dName,
                    ciudad: found
                };
            }
        }
        // Fallback predeterminado de Biocambio360
        return {
            departamento: 'Cundinamarca',
            ciudad: rawCity || 'Bogotá D.C.'
        };
    }

    // 5. Normalizar el departamento al nombre canónico exacto en DEPARTAMENTOS
    let canonicalDept: string | undefined = undefined;
    if (cleanDept && cleanDept.length >= 3) {
        canonicalDept = DEPARTAMENTOS.find(d => {
            const normD = d.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            return normD === cleanDept;
        });

        if (!canonicalDept) {
            canonicalDept = DEPARTAMENTOS.find(d => {
                const normD = d.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                return normD.includes(cleanDept) || cleanDept.includes(normD);
            });
        }
    }

    const finalDept = canonicalDept || 'Cundinamarca';
    const deptCities = CIUDADES_POR_DEPARTAMENTO[finalDept] || [];

    const canonicalCity = deptCities.find(c => {
        const normC = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return normC === cleanCity || cleanCity.includes(normC);
    }) || rawCity || deptCities[0] || 'Bogotá D.C.';

    return {
        departamento: finalDept,
        ciudad: canonicalCity
    };
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
