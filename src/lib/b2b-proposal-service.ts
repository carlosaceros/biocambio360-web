import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';

export interface SectorRecommendedItem {
    nombre: string;
    presentacion: string;
    precioMercado: number;
    precioBiocambio: number;
    factorUnidad: number;
}

export interface SectorConfig {
    id: string;
    title: string;
    description: string;
    iconKey: 'Building2' | 'Shirt' | 'Utensils' | 'GraduationCap' | 'Hotel' | 'Stethoscope' | 'Factory' | 'Sparkles' | string;
    defaultUnitsLabel: string;
    defaultUnits: number;
    recommendedItems: SectorRecommendedItem[];
}

export const DEFAULT_SECTORS: SectorConfig[] = [
    {
        id: 'conjunto_residencial',
        title: 'Conjunto Residencial / Propiedad Horizontal',
        description: 'Edificios, torres y conjuntos residenciales en Soacha, Bogotá y Cundinamarca.',
        iconKey: 'Building2',
        defaultUnitsLabel: 'Número de Apartamentos',
        defaultUnits: 250,
        recommendedItems: [
            { nombre: 'Limpiapisos Aromático Concentrado', presentacion: '20 Litros', precioMercado: 75000, precioBiocambio: 46000, factorUnidad: 0.02 },
            { nombre: 'Desinfectante Limpiador Multiusos', presentacion: '20 Litros', precioMercado: 82000, precioBiocambio: 51000, factorUnidad: 0.02 },
            { nombre: 'Blanqueador Desinfectante de Hipoclorito', presentacion: '20 Litros', precioMercado: 68000, precioBiocambio: 42000, factorUnidad: 0.015 },
            { nombre: 'Desengrasante Industrial Potente', presentacion: '20 Litros', precioMercado: 95000, precioBiocambio: 58000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'lavanderia',
        title: 'Lavandería Industrial / Tintorería',
        description: 'Plantas de lavado, tintorerías y lavanderías comerciales.',
        iconKey: 'Shirt',
        defaultUnitsLabel: 'Kilos de Ropa Procesados al Día',
        defaultUnits: 400,
        recommendedItems: [
            { nombre: 'Detergente Industrial Concentrado', presentacion: '20 Litros', precioMercado: 110000, precioBiocambio: 68000, factorUnidad: 0.03 },
            { nombre: 'Suavizante Textil de Alto Rendimiento', presentacion: '20 Litros', precioMercado: 98000, precioBiocambio: 59000, factorUnidad: 0.025 },
            { nombre: 'Blanqueador Oxigenado Ropa Color y Blanca', presentacion: '20 Litros', precioMercado: 92000, precioBiocambio: 56000, factorUnidad: 0.02 },
            { nombre: 'Desengrasante Removedor de Manchas', presentacion: '20 Litros', precioMercado: 105000, precioBiocambio: 64000, factorUnidad: 0.015 }
        ]
    },
    {
        id: 'restaurant',
        title: 'Restaurante / Casino Empresarial / Catering',
        description: 'Establecimientos gastronómicos, comedores industriales y servicios de catering.',
        iconKey: 'Utensils',
        defaultUnitsLabel: 'Servicios o Platos Preparados al Día',
        defaultUnits: 350,
        recommendedItems: [
            { nombre: 'Detergente Lavaloza Concentrado Cocina', presentacion: '20 Litros', precioMercado: 83000, precioBiocambio: 52000, factorUnidad: 0.025 },
            { nombre: 'Desengrasante Removedor de Grasa Pesada', presentacion: '20 Litros', precioMercado: 98000, precioBiocambio: 61000, factorUnidad: 0.02 },
            { nombre: 'Desinfectante Grado Alimentario', presentacion: '20 Litros', precioMercado: 85000, precioBiocambio: 53000, factorUnidad: 0.015 },
            { nombre: 'Jabón Antibacterial para Manos Cocina', presentacion: '10 Litros', precioMercado: 55000, precioBiocambio: 34000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'school',
        title: 'Colegio / Universidad / Institución Educativa',
        description: 'Planteles educativos, campus universitarios y jardines infantiles.',
        iconKey: 'GraduationCap',
        defaultUnitsLabel: 'Número de Estudiantes',
        defaultUnits: 800,
        recommendedItems: [
            { nombre: 'Limpiapisos Aromático Alto Relleno', presentacion: '20 Litros', precioMercado: 75000, precioBiocambio: 46000, factorUnidad: 0.015 },
            { nombre: 'Desinfectante Hospitalario/Escolar', presentacion: '20 Litros', precioMercado: 84000, precioBiocambio: 52000, factorUnidad: 0.015 },
            { nombre: 'Jabón Espuma para Manos Institucional', presentacion: '20 Litros', precioMercado: 92000, precioBiocambio: 57000, factorUnidad: 0.01 },
            { nombre: 'Blanqueador Sanitizante de Baterías Sanitarias', presentacion: '20 Litros', precioMercado: 68000, precioBiocambio: 42000, factorUnidad: 0.01 }
        ]
    },
    {
        id: 'hotel',
        title: 'Hotel / Alojamiento / Hospedaje',
        description: 'Hoteles, hostales, apartahoteles y centros de alojamiento.',
        iconKey: 'Hotel',
        defaultUnitsLabel: 'Número de Habitaciones',
        defaultUnits: 60,
        recommendedItems: [
            { nombre: 'Detergente Ropa de Cama y Toallas', presentacion: '20 Litros', precioMercado: 108000, precioBiocambio: 67000, factorUnidad: 0.1 },
            { nombre: 'Suavizante Aroma Prolongado', presentacion: '20 Litros', precioMercado: 95000, precioBiocambio: 58000, factorUnidad: 0.08 },
            { nombre: 'Limpiador de Vidrios y Azulejos', presentacion: '20 Litros', precioMercado: 83000, precioBiocambio: 49000, factorUnidad: 0.05 },
            { nombre: 'Desinfectante Amonio Cuaternario 5ta Gen', presentacion: '20 Litros', precioMercado: 89000, precioBiocambio: 55000, factorUnidad: 0.05 }
        ]
    },
    {
        id: 'clinic',
        title: 'Clínica / Centro Médico / IPS / Consultorio',
        description: 'Centros odontológicos, IPS, laboratorios y clínicas de salud.',
        iconKey: 'Stethoscope',
        defaultUnitsLabel: 'Número de Consultorios / Unidades',
        defaultUnits: 15,
        recommendedItems: [
            { nombre: 'Desinfectante Quirúrgico Amonio 5ta Gen', presentacion: '20 Litros', precioMercado: 115000, precioBiocambio: 71000, factorUnidad: 0.3 },
            { nombre: 'Jabón Antiséptico para Manos', presentacion: '20 Litros', precioMercado: 102000, precioBiocambio: 63000, factorUnidad: 0.25 },
            { nombre: 'Blanqueador Desinfectante de Áreas Críticas', presentacion: '20 Litros', precioMercado: 72000, precioBiocambio: 44000, factorUnidad: 0.2 },
            { nombre: 'Limpiador Germicida de Pisos', presentacion: '20 Litros', precioMercado: 85000, precioBiocambio: 53000, factorUnidad: 0.2 }
        ]
    }
];

export interface B2BProposalItem {
    nombre: string;
    presentacion: string;
    precioMercado: number;
    precioBiocambio: number;
    cantidad: number;
    subtotalBiocambio: number;
    subtotalMercado: number;
    ahorroItem: number;
}

export interface B2BProposal {
    id?: string;
    code: string; // e.g., 'COT-2026-001'
    sector: string;
    sectorLabel: string;
    nombreEncargado: string;
    nombreEmpresa: string;
    whatsapp: string;
    email: string;
    ciudad: string;
    habitacionesOEstudiantes?: number;
    
    // Financials
    gastoMercadoMes: number;
    gastoBiocambioMes: number;
    ahorroMes: number;
    ahorroAnual: number;
    ahorroPct: number;
    
    items: B2BProposalItem[];
    
    status: 'nuevo' | 'descargado' | 'contactado' | 'negociacion' | 'cerrado' | 'no_aplica';
    createdAt: string;
    updatedAt: string;
    lastContactedAt?: string;
    notasAdmin?: string;
}

const proposalsRef = collection(db, 'b2b_proposals');

/**
 * Gets dynamic B2B sector pricing configurations from Firestore
 */
export async function getB2BSectorsConfig(): Promise<SectorConfig[]> {
    try {
        const configDoc = await getDoc(doc(db, 'b2b_config', 'sectors_pricing'));
        if (configDoc.exists()) {
            const data = configDoc.data();
            if (data?.sectors && Array.isArray(data.sectors) && data.sectors.length > 0) {
                return data.sectors as SectorConfig[];
            }
        }
        return DEFAULT_SECTORS;
    } catch (e) {
        console.warn('Error fetching dynamic B2B sectors from Firestore, using defaults:', e);
        return DEFAULT_SECTORS;
    }
}

/**
 * Saves dynamic B2B sector pricing configurations to Firestore
 */
export async function saveB2BSectorsConfig(sectors: SectorConfig[]): Promise<boolean> {
    try {
        await setDoc(doc(db, 'b2b_config', 'sectors_pricing'), {
            sectors,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error('Error saving dynamic B2B sectors to Firestore:', e);
        return false;
    }
}

/**
 * Resets B2B sector pricing configuration to factory defaults in Firestore
 */
export async function resetB2BSectorsConfig(): Promise<boolean> {
    try {
        await setDoc(doc(db, 'b2b_config', 'sectors_pricing'), {
            sectors: DEFAULT_SECTORS,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error('Error resetting dynamic B2B sectors in Firestore:', e);
        return false;
    }
}

/**
 * Saves a new B2B Proposal in Firestore
 */
export async function createB2BProposal(proposalData: Omit<B2BProposal, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>): Promise<B2BProposal> {
    const now = new Date().toISOString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `COT-${new Date().getFullYear()}-${randomSuffix}`;

    const newProposal: B2BProposal = {
        ...proposalData,
        code,
        status: 'nuevo',
        createdAt: now,
        updatedAt: now
    };

    try {
        const docRef = await addDoc(proposalsRef, newProposal);
        return { ...newProposal, id: docRef.id };
    } catch (e) {
        console.warn('Error saving B2B proposal to Firestore, returning local proposal:', e);
        return { ...newProposal, id: `local_${Date.now()}` };
    }
}

/**
 * Gets all B2B Proposals for Admin CRM
 */
export async function getAllB2BProposals(): Promise<B2BProposal[]> {
    try {
        let snap;
        try {
            const q = query(proposalsRef, orderBy('createdAt', 'desc'));
            snap = await getDocs(q);
        } catch (idxErr) {
            console.warn('Index error or permission on ordered query, falling back to simple getDocs:', idxErr);
            snap = await getDocs(proposalsRef);
        }

        const list: B2BProposal[] = [];
        snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as B2BProposal);
        });

        // Sort locally in JS by createdAt desc
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return list;
    } catch (e) {
        console.warn('Error fetching B2B proposals from Firestore:', e);
        return [];
    }
}

/**
 * Updates status and notes of a B2B Proposal in Admin CRM
 */
export async function updateB2BProposalStatus(id: string, status: B2BProposal['status'], notasAdmin?: string): Promise<void> {
    try {
        const docRef = doc(db, 'b2b_proposals', id);
        const updateData: any = {
            status,
            updatedAt: new Date().toISOString()
        };
        if (status === 'contactado') {
            updateData.lastContactedAt = new Date().toISOString();
        }
        if (notasAdmin !== undefined) {
            updateData.notasAdmin = notasAdmin;
        }
        await updateDoc(docRef, updateData);
    } catch (e) {
        console.error('Error updating B2B proposal status:', e);
    }
}

/**
 * Updates items, custom pricing, and recalculated financial totals for a specific proposal
 */
export async function updateB2BProposalItems(
    id: string,
    items: B2BProposalItem[],
    financials: {
        gastoMercadoMes: number;
        gastoBiocambioMes: number;
        ahorroMes: number;
        ahorroAnual: number;
        ahorroPct: number;
    },
    notasAdmin?: string
): Promise<boolean> {
    try {
        const docRef = doc(db, 'b2b_proposals', id);
        const updateData: any = {
            items,
            ...financials,
            updatedAt: new Date().toISOString()
        };
        if (notasAdmin !== undefined) {
            updateData.notasAdmin = notasAdmin;
        }
        await updateDoc(docRef, updateData);
        return true;
    } catch (e) {
        console.error('Error updating B2B proposal items in Firestore:', e);
        return false;
    }
}

