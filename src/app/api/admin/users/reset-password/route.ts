import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';

// POST /api/admin/users/reset-password - Restablecer contraseña de cualquier usuario
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, newPassword, superAdminEmail } = body;

        if (!email || !newPassword) {
            return NextResponse.json({ success: false, message: 'Email y nueva contraseña requeridos' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const adminAuth = getAdminAuth();
        const db = getAdminDB();

        const userRecord = await adminAuth.getUserByEmail(cleanEmail);
        await adminAuth.updateUser(userRecord.uid, {
            password: newPassword
        });

        // Registrar en bitácora de auditoría ISO 9001
        const nowIso = new Date().toISOString();
        await db.collection('audit_logs').add({
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: superAdminEmail || 'superadmin',
            userEmail: superAdminEmail || 'superadmin@biocambio360.com',
            userName: 'Super Administrador',
            userRole: 'superadmin',
            modulo: 'usuarios',
            accion: 'reset_password',
            entidad: 'usuario',
            entidadId: cleanEmail,
            descripcion: `Restablecimiento de contraseña para usuario '${cleanEmail}'`,
            detalles: {
                ejecutadoPor: superAdminEmail || 'superadmin'
            }
        });

        return NextResponse.json({ success: true, message: 'Contraseña actualizada con éxito' });
    } catch (error: any) {
        console.error('[API/admin/users/reset-password] Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Error al restablecer contraseña' }, { status: 500 });
    }
}
