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

export type UserRole = 'superadmin' | 'gestor_pedidos' | 'logistico' | 'logistica' | 'user';

export interface AdminUserProfile {
    email: string;
    nombre: string;
    role: UserRole;
    permissions: Record<string, string>;
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
                const determinedRole: UserRole = isSuper ? 'superadmin' : 'logistico';
                const determinedName = isSuper ? 'Super Administrador THINK TIC' : 'Gestor de Pedidos & Logística';

                // Asignar de inmediato de forma síncrona
                setRole(determinedRole);

                try {
                    const docRef = doc(db, 'admin_users', email);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const finalRole = (data.role as UserRole) || determinedRole;
                        const profile: AdminUserProfile = {
                            email,
                            nombre: data.nombre || determinedName,
                            role: finalRole,
                            permissions: data.permissions || (finalRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full', 'cotizaciones-b2b': 'full', auditoria_envios: 'read', inventario: 'read', carritos_abandonados: 'full' }),
                        };
                        setUserProfile(profile);
                        setRole(finalRole);
                    } else {
                        const profile: AdminUserProfile = {
                            email,
                            nombre: determinedName,
                            role: determinedRole,
                            permissions: determinedRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full', 'cotizaciones-b2b': 'full', auditoria_envios: 'read', inventario: 'read', carritos_abandonados: 'full' },
                        };
                        setUserProfile(profile);
                        setRole(determinedRole);
                    }
                } catch {
                    const profile: AdminUserProfile = {
                        email,
                        nombre: determinedName,
                        role: determinedRole,
                        permissions: determinedRole === 'superadmin' ? { all: 'full' } : { pedidos: 'full', 'cotizaciones-b2b': 'full', auditoria_envios: 'read', inventario: 'read', carritos_abandonados: 'full' },
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
        if (role === 'gestor_pedidos' || role === 'logistico' || role === 'logistica') {
            return ['pedidos', 'cotizaciones-b2b', 'auditoria-envios', 'inventario', 'dashboard', 'carritos-abandonados', 'finanzas', 'productos'].includes(module);
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
