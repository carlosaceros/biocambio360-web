import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { ROLE_DEFINITIONS, SystemRole, AdminUserRecord } from '@/types/user';

// GET /api/admin/users - Listar todos los usuarios administradores
export async function GET() {
    try {
        const db = getAdminDB();
        const snap = await db.collection('admin_users').get();
        const users: AdminUserRecord[] = [];

        snap.forEach(doc => {
            users.push({
                ...doc.data() as AdminUserRecord,
                email: doc.id
            });
        });

        // Ordenar por fecha de creación desc
        users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('[API/admin/users] Error al listar usuarios:', error);
        return NextResponse.json({ success: false, message: error.message || 'Error al obtener usuarios' }, { status: 500 });
    }
}

// POST /api/admin/users - Crear nuevo usuario en Firebase Auth y Firestore
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, nombre, rol, asesorAsignado, capacidades, superAdminEmail } = body;

        if (!email || !password || !nombre || !rol) {
            return NextResponse.json({ success: false, message: 'Todos los campos obligatorios deben estar presentes (email, password, nombre, rol)' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const adminAuth = getAdminAuth();
        const db = getAdminDB();

        // 1. Crear o sincronizar en Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(cleanEmail);
            // Si ya existe, actualizamos su displayName y contraseña
            await adminAuth.updateUser(userRecord.uid, {
                password,
                displayName: nombre,
                disabled: false
            });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                userRecord = await adminAuth.createUser({
                    email: cleanEmail,
                    password,
                    displayName: nombre,
                    emailVerified: true
                });
            } else {
                throw e;
            }
        }

        const nowIso = new Date().toISOString();
        const defaultCaps = ROLE_DEFINITIONS[rol as SystemRole]?.defaultCapabilities || ROLE_DEFINITIONS.gestor.defaultCapabilities;

        const userDocData: AdminUserRecord = {
            uid: userRecord.uid,
            email: cleanEmail,
            nombre: nombre.trim(),
            rol: rol as SystemRole,
            asesorAsignado: asesorAsignado?.trim() || null,
            estado: 'activo',
            capacidades: capacidades || defaultCaps,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        // 2. Guardar en colección admin_users
        await db.collection('admin_users').doc(cleanEmail).set(userDocData);

        // 3. Registrar en bitácora de auditoría ISO 9001
        await db.collection('audit_logs').add({
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: superAdminEmail || 'superadmin',
            userEmail: superAdminEmail || 'superadmin@biocambio360.com',
            userName: 'Super Administrador',
            userRole: 'superadmin',
            modulo: 'usuarios',
            accion: 'crear',
            entidad: 'usuario',
            entidadId: cleanEmail,
            descripcion: `Creación de usuario '${nombre}' (${cleanEmail}) con rol '${rol}'`,
            detalles: {
                rol,
                asesorAsignado: asesorAsignado || null,
                capacidades: userDocData.capacidades
            }
        });

        return NextResponse.json({ success: true, user: userDocData });
    } catch (error: any) {
        console.error('[API/admin/users] Error creando usuario:', error);
        return NextResponse.json({ success: false, message: error.message || 'Error al crear el usuario' }, { status: 500 });
    }
}

// PUT /api/admin/users - Actualizar rol, estado o capacidades
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, nombre, rol, asesorAsignado, estado, capacidades, superAdminEmail } = body;

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email es requerido' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        
        let db;
        try {
            db = getAdminDB();
        } catch (adminErr: any) {
            console.warn('[API/admin/users] Firebase Admin no configurado en servidor:', adminErr.message);
            return NextResponse.json({ success: true, message: 'Actualizado (Firestore client mode)' });
        }

        const userDocRef = db.collection('admin_users').doc(cleanEmail);
        const existingSnap = await userDocRef.get();
        const existingData = (existingSnap.exists ? existingSnap.data() : {}) as Partial<AdminUserRecord>;
        const nowIso = new Date().toISOString();

        const updateData: Partial<AdminUserRecord> = {
            updatedAt: nowIso
        };

        if (nombre) updateData.nombre = nombre.trim();
        if (rol) updateData.rol = rol as SystemRole;
        if (asesorAsignado !== undefined) updateData.asesorAsignado = asesorAsignado ? asesorAsignado.trim() : null;
        if (estado) updateData.estado = estado;
        if (capacidades) updateData.capacidades = capacidades;

        await userDocRef.set(updateData, { merge: true });

        // Si se cambió el estado, sincronizar con disabled en Firebase Auth solo si adminAuth está disponible
        if (estado) {
            try {
                const adminAuth = getAdminAuth();
                const userAuth = await adminAuth.getUserByEmail(cleanEmail);
                await adminAuth.updateUser(userAuth.uid, {
                    disabled: estado === 'inactivo'
                });
            } catch (authErr) {
                console.warn('[API/admin/users] No se pudo sincronizar disabled en Auth:', authErr);
            }
        }

        // Registrar en bitácora de auditoría
        await db.collection('audit_logs').add({
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: superAdminEmail || 'superadmin',
            userEmail: superAdminEmail || 'superadmin@biocambio360.com',
            userName: 'Super Administrador',
            userRole: 'superadmin',
            modulo: 'usuarios',
            accion: estado === 'inactivo' ? 'suspender_usuario' : (estado === 'activo' && existingData.estado === 'inactivo' ? 'activar_usuario' : 'editar'),
            entidad: 'usuario',
            entidadId: cleanEmail,
            descripcion: `Actualización de usuario '${cleanEmail}': Rol '${rol || existingData.rol}', Estado '${estado || existingData.estado}'`,
            detalles: {
                anterior: {
                    rol: existingData.rol,
                    estado: existingData.estado,
                    asesorAsignado: existingData.asesorAsignado
                },
                nuevo: {
                    rol: rol || existingData.rol,
                    estado: estado || existingData.estado,
                    asesorAsignado: asesorAsignado !== undefined ? asesorAsignado : existingData.asesorAsignado
                }
            }
        });

        return NextResponse.json({ success: true, updated: { ...existingData, ...updateData } });
    } catch (error: any) {
        console.error('[API/admin/users] Error actualizando usuario:', error);
        return NextResponse.json({ success: false, message: error.message || 'Error al actualizar usuario' }, { status: 500 });
    }
}
