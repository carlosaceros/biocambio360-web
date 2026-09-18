/**
 * Biocambio360 SARLAFT Service (Básico)
 * 
 * Verificación inicial contra listas restrictivas locales.
 * Para compliance completo se recomienda integrar con Infolaft o TransUnion.
 * 
 * SARLAFT = Sistema de Autocontrol y Gestión del Riesgo Integral de
 * Lavado de Activos, Financiación del Terrorismo y Financiamiento
 * de la Proliferación de Armas de Destrucción Masiva.
 */

import {
    doc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { SARLAFTCheckResult, SARLAFTStatus } from '@/types/crm';
import { addCRMActivity } from './crm-service';

const customersRef = 'customers';

// ─────────────────────────────────────────────────────────────
// Lista local de ejemplo (PEPs y listas restrictivas conocidas)
// En producción, esto debería ser una colección de Firestore
// actualizada periódicamente con datos de fuentes oficiales.
// ─────────────────────────────────────────────────────────────

// Nombres normalizados para comparación fuzzy
function normalizeText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Solo alfanuméricos
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula similitud entre dos strings (coeficiente de Sørensen–Dice).
 * Retorna un valor entre 0 y 1.
 */
function calculateSimilarity(a: string, b: string): number {
    const normalA = normalizeText(a);
    const normalB = normalizeText(b);

    if (normalA === normalB) return 1;
    if (normalA.length < 2 || normalB.length < 2) return 0;

    const bigramsA = new Set<string>();
    for (let i = 0; i < normalA.length - 1; i++) {
        bigramsA.add(normalA.substring(i, i + 2));
    }

    const bigramsB = new Set<string>();
    for (let i = 0; i < normalB.length - 1; i++) {
        bigramsB.add(normalB.substring(i, i + 2));
    }

    let intersection = 0;
    bigramsA.forEach(bigram => {
        if (bigramsB.has(bigram)) intersection++;
    });

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Verifica un cliente contra listas restrictivas locales.
 * 
 * @param cedula Número de documento del cliente
 * @param nombre Nombre completo del cliente
 * @param checkedBy Email del usuario que realiza la verificación
 * @returns Resultado de la verificación con coincidencias encontradas
 */
export async function checkSARLAFT(
    cedula: string,
    nombre: string,
    checkedBy?: string,
): Promise<SARLAFTCheckResult> {
    const matches: SARLAFTCheckResult['matches'] = [];

    // En producción, aquí se consultaría:
    // 1. Colección Firestore 'sarlaft_lists' con listas OFAC, ONU, UE
    // 2. API de Infolaft o TransUnion para PEPs colombianos
    // 3. Lista Clinton / SDN list
    //
    // Por ahora, verificamos formato básico y generamos resultado clean.
    // Las listas reales se cargarán en la colección sarlaft_lists.

    try {
        // Intentar consultar la colección sarlaft_lists si existe
        const { collection: firestoreCollection, getDocs, query, limit: firestoreLimit } = await import('firebase/firestore');
        const listsRef = firestoreCollection(db, 'sarlaft_lists');
        const q = query(listsRef, firestoreLimit(500));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const normalizedNombre = normalizeText(nombre);
            const cleanCedula = cedula.replace(/\D/g, '');

            snap.forEach(docSnap => {
                const entry = docSnap.data();
                const entryName = entry.nombre || entry.name || '';
                const entryDoc = entry.documento || entry.document || '';

                // Coincidencia por documento
                if (cleanCedula && entryDoc && cleanCedula === entryDoc.replace(/\D/g, '')) {
                    matches.push({
                        source: entry.source || 'Lista Restrictiva',
                        name: entryName,
                        document: entryDoc,
                        matchScore: 1.0,
                    });
                    return;
                }

                // Coincidencia por nombre (similitud > 0.85)
                if (entryName) {
                    const similarity = calculateSimilarity(nombre, entryName);
                    if (similarity >= 0.85) {
                        matches.push({
                            source: entry.source || 'Lista Restrictiva',
                            name: entryName,
                            document: entryDoc,
                            matchScore: similarity,
                        });
                    }
                }
            });
        }
    } catch (error) {
        // Si la colección no existe o hay error, continuar sin matches
        console.warn('[SARLAFT] No se pudo consultar sarlaft_lists:', error);
    }

    const result: SARLAFTCheckResult = {
        status: matches.length === 0 ? 'clean' : matches.some(m => m.matchScore >= 0.95) ? 'match' : 'review',
        matches,
        checkedAt: new Date().toISOString(),
        checkedBy,
    };

    return result;
}

/**
 * Actualiza el estado SARLAFT de un cliente y registra actividad CRM.
 */
export async function updateSARLAFTStatus(
    customerId: string,
    status: SARLAFTStatus,
    checkResult?: SARLAFTCheckResult,
    authorEmail?: string,
    authorName?: string,
): Promise<void> {
    try {
        const customerDocRef = doc(db, customersRef, customerId);
        await updateDoc(customerDocRef, {
            sarlaftStatus: status,
            sarlaftCheckedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const statusLabels: Record<SARLAFTStatus, string> = {
            pendiente: '⏳ Pendiente',
            verificado: '✅ Verificado (Limpio)',
            rechazado: '❌ Rechazado (Coincidencia)',
        };

        await addCRMActivity({
            customerId,
            type: 'sarlaft_check',
            description: `SARLAFT: ${statusLabels[status]}${checkResult?.matches.length ? ` — ${checkResult.matches.length} coincidencia(s)` : ''}`,
            authorEmail,
            authorName,
            metadata: checkResult ? {
                matchCount: checkResult.matches.length,
                status: checkResult.status,
            } : undefined,
        });
    } catch (error) {
        console.error('[SARLAFT] Error updating status:', error);
        throw error;
    }
}

/**
 * Ejecuta verificación SARLAFT completa: check + update de estado.
 */
export async function runSARLAFTCheck(
    customerId: string,
    cedula: string,
    nombre: string,
    authorEmail?: string,
    authorName?: string,
): Promise<SARLAFTCheckResult> {
    const result = await checkSARLAFT(cedula, nombre, authorEmail);

    const newStatus: SARLAFTStatus = result.status === 'clean' ? 'verificado' : 'rechazado';
    await updateSARLAFTStatus(customerId, newStatus, result, authorEmail, authorName);

    return result;
}
