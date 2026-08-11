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

// Shipping cost calculation by region (BioCambio360 / Pajarito Logistics)
export function calculateShipping(departamento: string, ciudad: string, subtotal: number): number {
    const isLocal = departamento === 'Cundinamarca' && 
        ['Bogotá D.C.', 'Soacha', 'Sibaté', 'Chía', 'Cota', 'Mosquera', 'Funza', 'Madrid', 'Cajicá', 'Fusagasugá', 'Zipaquirá'].includes(ciudad);

    if (isLocal) {
        if (subtotal >= 100000) return 0;
        return 9000;
    }

    // National
    if (subtotal >= 180000) return 0;
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
