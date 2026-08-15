import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, where, orderBy, addDoc, updateDoc } from 'firebase/firestore';

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
    sector: 'conjunto_residencial' | 'lavanderia' | 'restaurant' | 'school' | 'hotel' | 'clinic' | 'otro';
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
 * Saves a new B2B Proposal in Firestore
 */
export async function createB2BProposal(proposalData: Omit<B2BProposal, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>): Promise<B2BProposal> {
    const now = new Date().toISOString();
    const countSnap = await getDocs(proposalsRef);
    const count = countSnap.size + 101;
    const code = `COT-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;

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
        console.warn('Error saving B2B proposal to Firestore, returning local fallback:', e);
        return { ...newProposal, id: `local_${Date.now()}` };
    }
}

/**
 * Gets all B2B Proposals for Admin CRM
 */
export async function getAllB2BProposals(): Promise<B2BProposal[]> {
    try {
        const q = query(proposalsRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: B2BProposal[] = [];
        snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as B2BProposal);
        });
        return list;
    } catch (e) {
        console.warn('Error fetching B2B proposals from Firestore:', e);
        return [];
    }
}

/**
 * Updates status of a B2B Proposal in Admin CRM
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
