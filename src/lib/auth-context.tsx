'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 
    | 'superadmin' 
    | 'director' 
    | 'gestor' 
    | 'gestor_pedidos' 
    | 'logistico' 
    | 'logistica' 
    | 'produccion_calidad' 
    | 'asesor' 
    | 'cajero'
    | 'mensajero'
    | 'user';

export interface AdminUserProfile {
    email: string;
    nombre: string;
    role: UserRole;
    asesorAsignado?: string;
    estado?: 'activo' | 'inactivo';
    capacidades?: Record<string, boolean>;
    permissions?: Record<string, string>;
}

interface AuthContextType {
    user: User | null;
    userProfile: AdminUserProfile | null;
    role: UserRole;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
    canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<AdminUserProfile | null>(null);
    const [role, setRole] = useState<UserRole>('user');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set persistence to LOCAL (survives browser restarts)
        setPersistence(auth, browserLocalPersistence).catch(console.error);

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser && currentUser.email) {
                const email = currentUser.email.toLowerCase().trim();
                const isSuper = email === 'thinktic.thinktic@gmail.com';
                const determinedRole: UserRole = isSuper ? 'superadmin' : 'gestor';
                const determinedName = isSuper ? 'Super Administrador THINK TIC' : 'Gestor de Pedidos & Logística';

                setRole(determinedRole);

                try {
                    const docRef = doc(db, 'admin_users', email);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Bloqueo de seguridad si la cuenta fue suspendida/inactivada
                        if (data.estado === 'inactivo') {
                            await firebaseSignOut(auth);
                            setUser(null);
                            setUserProfile(null);
                            setRole('user');
                            setLoading(false);
                            alert('⚠️ Tu cuenta ha sido suspendida o inactivada por el Administrador.');
                            return;
                        }

                        const finalRole = (data.rol || data.role || determinedRole) as UserRole;
                        const profile: AdminUserProfile = {
                            email,
                            nombre: data.nombre || determinedName,
                            role: finalRole,
                            asesorAsignado: data.asesorAsignado || undefined,
                            estado: data.estado || 'activo',
                            capacidades: data.capacidades || undefined,
                            permissions: data.permissions || (finalRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full' }),
                        };
                        setUserProfile(profile);
                        setRole(finalRole);
                    } else {
                        const profile: AdminUserProfile = {
                            email,
                            nombre: determinedName,
                            role: determinedRole,
                            estado: 'activo',
                            permissions: determinedRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full' },
                        };
                        setUserProfile(profile);
                        setRole(determinedRole);
                    }
                } catch (e) {
                    console.warn('[AuthContext] Error cargando perfil admin_users:', e);
                    const profile: AdminUserProfile = {
                        email,
                        nombre: determinedName,
                        role: determinedRole,
                        estado: 'activo',
                        permissions: determinedRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full' },
                    };
                    setUserProfile(profile);
                    setRole(determinedRole);
                }
            } else {
                setUserProfile(null);
                setRole('user');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setRole('user');
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    const changePassword = async (newPassword: string) => {
        if (!auth.currentUser) {
            throw new Error('No hay una sesión activa de usuario.');
        }
        if (!newPassword || newPassword.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        try {
            await firebaseUpdatePassword(auth.currentUser, newPassword);
        } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('Por seguridad, debes cerrar sesión e iniciar sesión nuevamente antes de cambiar la contraseña.');
            }
            throw new Error(error.message || 'Error al actualizar la contraseña');
        }
    };

    const canAccess = (module: string): boolean => {
        if (role === 'superadmin') return true;
        if (role === 'director') return true;

        // Comprobación granular si el usuario tiene capacidades explícitas configuradas
        if (userProfile?.capacidades && typeof userProfile.capacidades[module] === 'boolean') {
            return userProfile.capacidades[module];
        }

        if (role === 'gestor' || role === 'gestor_pedidos' || role === 'logistico' || role === 'logistica') {
            return ['pedidos', 'cotizaciones-b2b', 'auditoria-envios', 'inventario', 'dashboard', 'carritos-abandonados', 'finanzas', 'productos', 'clientes', 'reabastecimiento'].includes(module);
        }
        if (role === 'produccion_calidad') {
            return ['produccion', 'inventario'].includes(module);
        }
        if (role === 'asesor') {
            return ['asesores', 'clientes', 'reabastecimiento'].includes(module);
        }
        if (role === 'cajero') {
            return ['pos'].includes(module);
        }
        if (role === 'mensajero') {
            return ['mensajero', 'mensajeros'].includes(module);
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, role, loading, signIn, signOut, changePassword, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
