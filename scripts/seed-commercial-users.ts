import { getAdminAuth, getAdminDB } from '../src/lib/firebase-admin';
import { ROLE_DEFINITIONS, SystemRole, AdminUserRecord } from '../src/types/user';

interface UserToSeed {
    email: string;
    nombre: string;
    rol: SystemRole;
    asesorAsignado?: string;
    capacidadesEspeciales?: Partial<AdminUserRecord['capacidades']>;
}

const USERS_TO_SEED: UserToSeed[] = [
    {
        email: 'karen@biocambio360.com',
        nombre: 'Karen',
        rol: 'asesor',
        asesorAsignado: 'Karen'
    },
    {
        email: 'katherine@biocambio360.com',
        nombre: 'Katherine',
        rol: 'asesor',
        asesorAsignado: 'Katherine'
    },
    {
        email: 'andrea@biocambio360.com',
        nombre: 'Andrea',
        rol: 'asesor',
        asesorAsignado: 'Andrea'
    },
    {
        email: 'laura@biocambio360.com',
        nombre: 'Laura',
        rol: 'asesor',
        asesorAsignado: 'Laura'
    },
    {
        email: 'camilo@biocambio360.com',
        nombre: 'Camilo',
        rol: 'asesor',
        asesorAsignado: 'Camilo'
    },
    {
        email: 'diego@biocambio360.com',
        nombre: 'Diego',
        rol: 'director',
        asesorAsignado: 'Diego',
        capacidadesEspeciales: {
            finanzas: true,
            clientes: true,
            asesores: true,
            pedidos: true
        }
    },
    {
        email: 'fernando@biocambio360.com',
        nombre: 'Fernando',
        rol: 'director',
        asesorAsignado: 'Fernando',
        capacidadesEspeciales: {
            finanzas: true,
            clientes: true,
            asesores: true,
            pedidos: true,
            produccion: true
        }
    },
    {
        email: 'julian@biocambio360.com',
        nombre: 'Julián',
        rol: 'director',
        asesorAsignado: 'Julián'
    },
    {
        email: 'danilo@biocambio360.com',
        nombre: 'Danilo',
        rol: 'director',
        asesorAsignado: 'Danilo'
    }
];

async function seedUsers() {
    console.log('====================================================');
    console.log('👥 SEEDING DE USUARIOS COMERCIALES Y DIRECTIVOS');
    console.log('====================================================\n');

    const adminAuth = getAdminAuth();
    const db = getAdminDB();
    const nowIso = new Date().toISOString();

    for (const u of USERS_TO_SEED) {
        const cleanEmail = u.email.trim().toLowerCase();
        const password = cleanEmail;

        console.log(`\nProcesando usuario: ${u.nombre} (${cleanEmail})...`);

        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(cleanEmail);
            console.log(`  [Auth] Usuario ya existe en Auth (UID: ${userRecord.uid}). Actualizando password y nombre...`);
            await adminAuth.updateUser(userRecord.uid, {
                password: password,
                displayName: u.nombre,
                disabled: false
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`  [Auth] Creando nuevo usuario en Firebase Auth...`);
                userRecord = await adminAuth.createUser({
                    email: cleanEmail,
                    password: password,
                    displayName: u.nombre,
                    emailVerified: true
                });
                console.log(`  [Auth] ✓ Creado con UID: ${userRecord.uid}`);
            } else {
                console.error(`  [Auth] Error con usuario ${cleanEmail}:`, error.message);
                continue;
            }
        }

        const baseCaps = ROLE_DEFINITIONS[u.rol]?.defaultCapabilities || ROLE_DEFINITIONS.asesor.defaultCapabilities;
        const finalCaps = {
            ...baseCaps,
            ...(u.capacidadesEspeciales || {})
        };

        const userData: AdminUserRecord = {
            uid: userRecord.uid,
            email: cleanEmail,
            nombre: u.nombre,
            rol: u.rol,
            asesorAsignado: u.asesorAsignado || (null as any),
            estado: 'activo',
            capacidades: finalCaps,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        await db.collection('admin_users').doc(cleanEmail).set(userData, { merge: true });
        console.log(`  [Firestore] ✓ Registro sincronizado en 'admin_users/${cleanEmail}'`);

        await db.collection('audit_logs').add({
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: 'sistema',
            userEmail: 'admin@biocambio360.com',
            userName: 'Inicializador de Sistema',
            userRole: 'superadmin',
            modulo: 'usuarios',
            accion: 'crear',
            entidad: 'usuario',
            entidadId: cleanEmail,
            descripcion: `Creación/Sincronización de usuario '${u.nombre}' (${cleanEmail}) con rol '${u.rol}' y clave inicial.`,
            detalles: { rol: u.rol, asesorAsignado: u.asesorAsignado }
        });
    }

    console.log('\n====================================================');
    console.log('✅ TODOS LOS USUARIOS FUERON CREADOS Y SINCRONIZADOS');
    console.log('====================================================');
}

seedUsers().catch((err) => {
    console.error('Fatal error en seeding de usuarios:', err);
    process.exit(1);
});
