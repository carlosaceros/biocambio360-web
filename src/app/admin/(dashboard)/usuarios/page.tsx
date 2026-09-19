'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Shield,
    Key,
    UserPlus,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Search,
    Filter,
    Clock,
    RefreshCw,
    Edit,
    Lock,
    Eye,
    AlertTriangle,
    FileText,
    Award,
    Store,
    FlaskConical,
    Activity,
    Check,
    X,
    Globe,
    Laptop,
    LogIn,
    LogOut,
    Radio
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
    subscribeToAdminUsers,
    createAdminUser,
    updateAdminUser,
    toggleUserStatus,
    resetUserPassword
} from '@/lib/users-service';
import { subscribeToAuditLogs, AuditLogEntry } from '@/lib/audit-service';
import {
    subscribeToOnlineUsers,
    subscribeToSessionLogs,
    UserSessionRecord,
    OnlineUserInfo
} from '@/lib/user-sessions-service';
import { AdminUserRecord, SystemRole, ROLE_DEFINITIONS, UserModuleCapabilities } from '@/types/user';

export default function AdminUsuariosPage() {
    const router = useRouter();
    const { user: currentAuthUser, role: currentRole } = useAuth();

    const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria' | 'sesiones'>('usuarios');
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
    const [sessionLogs, setSessionLogs] = useState<UserSessionRecord[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingAudit, setIsLoadingAudit] = useState(true);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);

    // Filtros de sesiones
    const [sessionSearch, setSessionSearch] = useState('');
    const [sessionRoleFilter, setSessionRoleFilter] = useState('');
    const [sessionStatusFilter, setSessionStatusFilter] = useState('');

    // Filtros de usuarios
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Filtros de auditoría
    const [auditSearch, setAuditSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState<string>('');

    // Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
    const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);

    // Formulario Crear Usuario
    const [newEmail, setNewEmail] = useState('');
    const [newNombre, setNewNombre] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<SystemRole>('gestor');
    const [newAsesorAsignado, setNewAsesorAsignado] = useState('');
    const [newCapabilities, setNewCapabilities] = useState<UserModuleCapabilities>(ROLE_DEFINITIONS.gestor.defaultCapabilities);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    // Formulario Editar Usuario
    const [editNombre, setEditNombre] = useState('');
    const [editRole, setEditRole] = useState<SystemRole>('gestor');
    const [editAsesorAsignado, setEditAsesorAsignado] = useState('');
    const [editCapabilities, setEditCapabilities] = useState<UserModuleCapabilities>(ROLE_DEFINITIONS.gestor.defaultCapabilities);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Formulario Reset Password
    const [resetPasswordVal, setResetPasswordVal] = useState('');
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);

    // Feedback
    const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const unsubUsers = subscribeToAdminUsers((data) => {
            setUsers(data);
            setIsLoadingUsers(false);
        });

        const unsubAudit = subscribeToAuditLogs((data) => {
            setAuditLogs(data);
            setIsLoadingAudit(false);
        });

        const unsubOnline = subscribeToOnlineUsers((data) => {
            setOnlineUsers(data);
        });

        const unsubSessions = subscribeToSessionLogs((data) => {
            setSessionLogs(data);
            setIsLoadingSessions(false);
        });

        return () => {
            unsubUsers();
            unsubAudit();
            unsubOnline();
            unsubSessions();
        };
    }, []);

    const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
        setActionFeedback({ message, type });
        setTimeout(() => setActionFeedback(null), 4000);
    };

    // Actualizar capacidades por defecto al cambiar de rol en el modal de creación
    const handleRoleChangeInCreate = (role: SystemRole) => {
        setNewRole(role);
        const def = ROLE_DEFINITIONS[role]?.defaultCapabilities;
        if (def) setNewCapabilities({ ...def });
    };

    // Actualizar capacidades por defecto al cambiar de rol en el modal de edición
    const handleRoleChangeInEdit = (role: SystemRole) => {
        setEditRole(role);
        const def = ROLE_DEFINITIONS[role]?.defaultCapabilities;
        if (def) setEditCapabilities({ ...def });
    };

    const handleOpenEditModal = (u: AdminUserRecord) => {
        setSelectedUser(u);
        setEditNombre(u.nombre);
        setEditRole(u.rol);
        setEditAsesorAsignado(u.asesorAsignado || '');
        setEditCapabilities(u.capacidades || ROLE_DEFINITIONS[u.rol]?.defaultCapabilities || ROLE_DEFINITIONS.gestor.defaultCapabilities);
        setIsEditModalOpen(true);
    };

    const handleOpenResetPasswordModal = (u: AdminUserRecord) => {
        setSelectedUser(u);
        setResetPasswordVal('');
        setIsResetPasswordModalOpen(true);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newPassword || !newNombre) {
            alert('Por favor completa todos los campos requeridos.');
            return;
        }
        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsSubmittingCreate(true);
        try {
            await createAdminUser({
                email: newEmail,
                password: newPassword,
                nombre: newNombre,
                rol: newRole,
                asesorAsignado: newRole === 'asesor' ? (newAsesorAsignado || undefined) : undefined,
                capacidades: newCapabilities,
                superAdminEmail: currentAuthUser?.email || 'superadmin'
            });

            showFeedback(`✅ Usuario ${newEmail} creado con éxito.`);
            setIsCreateModalOpen(false);
            setNewEmail('');
            setNewNombre('');
            setNewPassword('');
            setNewRole('gestor');
            setNewAsesorAsignado('');
        } catch (err: any) {
            showFeedback(`❌ Error creando usuario: ${err.message}`, 'error');
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setIsSubmittingEdit(true);
        try {
            await updateAdminUser({
                email: selectedUser.email,
                nombre: editNombre,
                rol: editRole,
                asesorAsignado: editRole === 'asesor' ? (editAsesorAsignado || null) : null,
                capacidades: editCapabilities,
                superAdminEmail: currentAuthUser?.email || 'superadmin'
            });

            showFeedback(`✅ Usuario ${selectedUser.email} actualizado con éxito.`);
            setIsEditModalOpen(false);
        } catch (err: any) {
            showFeedback(`❌ Error actualizando: ${err.message}`, 'error');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleToggleStatus = async (u: AdminUserRecord) => {
        const actionText = u.estado === 'activo' ? 'suspender' : 'activar';
        if (!confirm(`¿Estás seguro de que deseas ${actionText} el acceso para ${u.nombre} (${u.email})?`)) {
            return;
        }

        try {
            await toggleUserStatus(u.email, u.estado, currentAuthUser?.email || 'superadmin');
            showFeedback(`✅ Estado de ${u.email} cambiado a ${u.estado === 'activo' ? 'Inactivo' : 'Activo'}.`);
        } catch (err: any) {
            showFeedback(`❌ Error cambiando estado: ${err.message}`, 'error');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        if (resetPasswordVal.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsSubmittingReset(true);
        try {
            await resetUserPassword(selectedUser.email, resetPasswordVal, currentAuthUser?.email || 'superadmin');
            showFeedback(`✅ Contraseña de ${selectedUser.email} restablecida.`);
            setIsResetPasswordModalOpen(false);
            setResetPasswordVal('');
        } catch (err: any) {
            showFeedback(`❌ Error restableciendo clave: ${err.message}`, 'error');
        } finally {
            setIsSubmittingReset(false);
        }
    };

    // Filtrar usuarios
    const filteredUsers = users.filter(u => {
        if (userSearch) {
            const q = userSearch.toLowerCase();
            const matchName = u.nombre.toLowerCase().includes(q);
            const matchEmail = u.email.toLowerCase().includes(q);
            const matchAsesor = (u.asesorAsignado || '').toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchAsesor) return false;
        }
        if (roleFilter && u.rol !== roleFilter) return false;
        if (statusFilter && u.estado !== statusFilter) return false;
        return true;
    });

    // Filtrar auditoría
    const filteredAudit = auditLogs.filter(a => {
        if (auditSearch) {
            const q = auditSearch.toLowerCase();
            const matchUser = (a.userEmail || '').toLowerCase().includes(q) || (a.userName || '').toLowerCase().includes(q);
            const matchDesc = (a.descripcion || '').toLowerCase().includes(q);
            const matchEnt = (a.entidadId || '').toLowerCase().includes(q);
            if (!matchUser && !matchDesc && !matchEnt) return false;
        }
        if (moduleFilter && a.modulo !== moduleFilter) return false;
        return true;
    });

    // Filtrar sesiones
    const filteredSessions = sessionLogs.filter(s => {
        if (sessionSearch) {
            const q = sessionSearch.toLowerCase();
            const matchUser = (s.email || '').toLowerCase().includes(q) || (s.nombre || '').toLowerCase().includes(q);
            const matchDevice = (s.browser || '').toLowerCase().includes(q) || (s.device || '').toLowerCase().includes(q);
            if (!matchUser && !matchDevice) return false;
        }
        if (sessionRoleFilter && s.rol !== sessionRoleFilter) return false;
        if (sessionStatusFilter === 'online' && !s.isOnline) return false;
        if (sessionStatusFilter === 'closed' && s.isOnline) return false;
        return true;
    });

    // KPIs
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.estado === 'activo').length;
    const asesorCount = users.filter(u => u.rol === 'asesor').length;
    const directorsCount = users.filter(u => u.rol === 'superadmin' || u.rol === 'director').length;
    const onlineCount = onlineUsers.filter(u => u.isOnline).length;

    const ALL_CAPABILITIES_KEYS: (keyof UserModuleCapabilities)[] = [
        'pedidos', 'pos', 'asesores', 'produccion', 'finanzas', 'clientes', 'reabastecimiento', 'cupones', 'envios', 'mensajeria', 'auditoria'
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                title="Volver al Dashboard"
                            >
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    <Shield className="text-purple-600" size={26} />
                                    GESTIÓN DE USUARIOS & AUDITORÍA ISO 9001
                                </h1>
                                <p className="text-xs text-gray-500 font-medium">
                                    Control de acceso, roles empresariales, capacidades modulares y trazabilidad de acciones.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Pestañas */}
                            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('usuarios')}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === 'usuarios' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    👥 Usuarios ({totalUsers})
                                </button>
                                <button
                                    onClick={() => setActiveTab('sesiones')}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'sesiones' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <span className="relative flex h-2 w-2">
                                        {onlineCount > 0 && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        )}
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineCount > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                    </span>
                                    En Línea & Sesiones ({onlineCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('auditoria')}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === 'auditoria' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    📋 Auditoría ISO ({auditLogs.length})
                                </button>
                            </div>

                            {activeTab === 'usuarios' && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <UserPlus size={16} />
                                    <span>Crear Usuario</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Feedback Alert */}
            {actionFeedback && (
                <div className={`py-2 px-4 text-center text-xs font-bold text-white transition-all ${actionFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {actionFeedback.message}
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 w-full flex-1">
                {activeTab === 'usuarios' && (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                                <span className="text-[10px] font-black uppercase text-gray-400">Total Usuarios</span>
                                <p className="text-2xl font-black text-gray-900 mt-1">{totalUsers}</p>
                                <p className="text-[11px] font-medium text-gray-500">En plataforma</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 shadow-xs">
                                <span className="text-[10px] font-black uppercase text-emerald-700">Usuarios Activos</span>
                                <p className="text-2xl font-black text-emerald-700 mt-1">{activeUsers}</p>
                                <p className="text-[11px] font-medium text-emerald-600">Con acceso habilitado</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/30 shadow-xs">
                                <span className="text-[10px] font-black uppercase text-amber-700">Asesores Comerciales</span>
                                <p className="text-2xl font-black text-amber-800 mt-1">{asesorCount}</p>
                                <p className="text-[11px] font-medium text-amber-600">Cartera y Call Center</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-purple-100 bg-purple-50/30 shadow-xs">
                                <span className="text-[10px] font-black uppercase text-purple-700">Directores & Super</span>
                                <p className="text-2xl font-black text-purple-800 mt-1">{directorsCount}</p>
                                <p className="text-[11px] font-medium text-purple-600">Fernando, Danilo, Julián</p>
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Buscar por nombre, correo o asesor..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                            >
                                <option value="">Todos los Roles</option>
                                <option value="superadmin">Super Administrador</option>
                                <option value="director">Director Estratégico</option>
                                <option value="gestor">Gestor Logístico</option>
                                <option value="produccion_calidad">Jefe de Planta (Diego)</option>
                                <option value="asesor">Asesor Comercial</option>
                                <option value="cajero">Cajero Mostrador</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                            >
                                <option value="">Todos los Estados</option>
                                <option value="activo">🟢 Solo Activos</option>
                                <option value="inactivo">🔴 Solo Inactivos / Suspendidos</option>
                            </select>
                        </div>

                        {/* Tabla de Usuarios */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                            <th className="p-4">Usuario & Nombre</th>
                                            <th className="p-4">Rol en el Sistema</th>
                                            <th className="p-4">Asesor Asignado</th>
                                            <th className="p-4">Capacidades Modulares</th>
                                            <th className="p-4 text-center">Estado Acceso</th>
                                            <th className="p-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                        {isLoadingUsers ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                                    Cargando usuarios autorizados...
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                                    No se encontraron usuarios con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((u) => {
                                                const roleDef = ROLE_DEFINITIONS[u.rol] || ROLE_DEFINITIONS.gestor;
                                                const isSelf = currentAuthUser?.email?.toLowerCase() === u.email.toLowerCase();

                                                return (
                                                    <tr key={u.email} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-black text-gray-900 text-sm">{u.nombre}</div>
                                                            <div className="text-gray-400 font-mono text-[11px]">{u.email}</div>
                                                        </td>

                                                        <td className="p-4">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${roleDef.badgeColor}`}>
                                                                <Shield size={10} />
                                                                {roleDef.label}
                                                            </span>
                                                        </td>

                                                        <td className="p-4">
                                                            {u.asesorAsignado ? (
                                                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                                                    <Award size={12} />
                                                                    {u.asesorAsignado}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-[11px]">—</span>
                                                            )}
                                                        </td>

                                                        <td className="p-4">
                                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                                {u.capacidades ? (
                                                                    Object.entries(u.capacidades)
                                                                        .filter(([, allowed]) => allowed)
                                                                        .map(([mod]) => (
                                                                            <span key={mod} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold">
                                                                                {mod}
                                                                            </span>
                                                                        ))
                                                                ) : (
                                                                    <span className="text-gray-400 text-[11px]">Por rol</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={() => handleToggleStatus(u)}
                                                                disabled={isSelf}
                                                                title={isSelf ? 'No puedes suspender tu propio usuario' : 'Clic para alternar estado'}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${u.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-100 text-red-800 hover:bg-red-200'} ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                            >
                                                                <span className={`w-2 h-2 rounded-full ${u.estado === 'activo' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                                                                <span>{u.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                                                            </button>
                                                        </td>

                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleOpenEditModal(u)}
                                                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                                    title="Editar rol y permisos"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenResetPasswordModal(u)}
                                                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                                    title="Restablecer contraseña"
                                                                >
                                                                    <Lock size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'sesiones' && (
                    <div className="space-y-6">
                        {/* Monitor de Usuarios en Línea */}
                        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <Radio size={18} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                            Usuarios Conectados en Tiempo Real
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                                                {onlineUsers.filter(u => u.isOnline).length} en línea
                                            </span>
                                        </h2>
                                        <p className="text-[11px] text-gray-500">
                                            Monitor de presencia con latido cada 90s. Muestra colaboradores con actividad en los últimos 5 minutos.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                    <Clock size={12} /> Auto-actualizable
                                </span>
                            </div>

                            {onlineUsers.filter(u => u.isOnline).length === 0 ? (
                                <div className="p-6 bg-gray-50 rounded-xl text-center text-gray-400 text-xs">
                                    No hay otros colaboradores conectados en este instante.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {onlineUsers.filter(u => u.isOnline).map((u) => {
                                        const roleBadge = ROLE_DEFINITIONS[u.rol as SystemRole]?.badgeColor || 'bg-gray-100 text-gray-800';
                                        const roleLabel = ROLE_DEFINITIONS[u.rol as SystemRole]?.label || u.rol;
                                        return (
                                            <div key={u.email} className="p-3.5 bg-emerald-50/40 border border-emerald-200/70 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center">
                                                            {u.nombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900">{u.nombre}</p>
                                                        <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.email}</p>
                                                        <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[9px] font-black uppercase ${roleBadge}`}>
                                                            {roleLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                        Activo ahora
                                                    </span>
                                                    {u.device && (
                                                        <p className="text-[9px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                                                            <Laptop size={10} /> {u.device}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Search & Filters para Historial de Sesiones */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={sessionSearch}
                                    onChange={(e) => setSessionSearch(e.target.value)}
                                    placeholder="Buscar por usuario, correo o navegador..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <select
                                value={sessionRoleFilter}
                                onChange={(e) => setSessionRoleFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                            >
                                <option value="">Todos los Roles</option>
                                <option value="superadmin">Super Administrador</option>
                                <option value="director">Director Estratégico</option>
                                <option value="gestor">Gestor Logístico</option>
                                <option value="asesor">Asesor Comercial</option>
                                <option value="cajero">Cajero Mostrador</option>
                                <option value="mensajero">Mensajero</option>
                            </select>

                            <select
                                value={sessionStatusFilter}
                                onChange={(e) => setSessionStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                            >
                                <option value="">Todas las Sesiones</option>
                                <option value="online">🟢 Sesiones Activas / En Línea</option>
                                <option value="closed">⚪ Sesiones Cerradas / Salidas</option>
                            </select>
                        </div>

                        {/* Tabla de Logs de Ingreso y Salida */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <LogIn size={16} className="text-purple-600" />
                                    Bitácora Cronológica de Ingresos y Salidas
                                </h3>
                                <span className="text-[11px] text-gray-500 font-bold">
                                    {filteredSessions.length} registros
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                            <th className="p-3.5">Usuario</th>
                                            <th className="p-3.5">Rol</th>
                                            <th className="p-3.5">Estado Sesión</th>
                                            <th className="p-3.5">Ingreso</th>
                                            <th className="p-3.5">Salida</th>
                                            <th className="p-3.5">Duración</th>
                                            <th className="p-3.5">Dispositivo / Navegador</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                        {isLoadingSessions ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                                    Cargando bitácora de accesos...
                                                </td>
                                            </tr>
                                        ) : filteredSessions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                                    No hay registros de sesiones para el filtro actual.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSessions.map((sess) => {
                                                const loginDate = sess.loginAt?.toMillis ? new Date(sess.loginAt.toMillis()) : null;
                                                const logoutDate = sess.logoutAt?.toMillis ? new Date(sess.logoutAt.toMillis()) : null;
                                                const roleBadge = ROLE_DEFINITIONS[sess.rol as SystemRole]?.badgeColor || 'bg-gray-100 text-gray-800';
                                                const roleLabel = ROLE_DEFINITIONS[sess.rol as SystemRole]?.label || sess.rol;

                                                return (
                                                    <tr key={sess.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="p-3.5">
                                                            <p className="font-black text-gray-900">{sess.nombre}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{sess.email}</p>
                                                        </td>
                                                        <td className="p-3.5">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${roleBadge}`}>
                                                                {roleLabel}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5">
                                                            {sess.isOnline ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    En Línea
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                                    Cerrada
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-gray-600">
                                                            {loginDate ? (
                                                                <span>
                                                                    {loginDate.toLocaleDateString('es-CO')} {loginDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-gray-600">
                                                            {logoutDate ? (
                                                                <span>
                                                                    {logoutDate.toLocaleDateString('es-CO')} {logoutDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            ) : sess.isOnline ? (
                                                                <span className="text-emerald-600 font-bold">Activa ahora</span>
                                                            ) : (
                                                                <span className="text-gray-400">Cierre automático</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap text-xs font-bold text-gray-800">
                                                            {sess.durationMinutes ? (
                                                                sess.durationMinutes >= 60
                                                                    ? `${Math.floor(sess.durationMinutes / 60)}h ${sess.durationMinutes % 60}m`
                                                                    : `${sess.durationMinutes} min`
                                                            ) : sess.isOnline ? (
                                                                <span className="text-emerald-600 text-[11px]">En curso...</span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="p-3.5">
                                                            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                                                                <Laptop size={13} className="text-gray-400 shrink-0" />
                                                                <span>{sess.browser || 'Navegador Web'}</span>
                                                                <span className="text-gray-400 text-[10px]">({sess.device || 'Escritorio'})</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'auditoria' && (
                    /* Tab Bitácora de Auditoría en Vivo */
                    <div className="space-y-4">
                        {/* Search & Filter Auditoría */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    placeholder="Buscar en auditoría por usuario, pedido, lote o acción..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <select
                                value={moduleFilter}
                                onChange={(e) => setModuleFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                            >
                                <option value="">Todos los Módulos Auditados</option>
                                <option value="pedidos">📦 Pedidos & Envíos</option>
                                <option value="pos">🏪 TPV Mostrador Soacha</option>
                                <option value="produccion">🧪 Producción & Recetas</option>
                                <option value="usuarios">👥 Gestión de Usuarios</option>
                                <option value="clientes">🤝 Clientes & CRM</option>
                                <option value="finanzas">💰 Finanzas & Facturación</option>
                            </select>
                        </div>

                        {/* Tabla de Logs */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                            <th className="p-4">Fecha & Hora</th>
                                            <th className="p-4">Usuario Responsable</th>
                                            <th className="p-4">Módulo</th>
                                            <th className="p-4">Acción</th>
                                            <th className="p-4">Descripción del Evento</th>
                                            <th className="p-4 text-right">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                        {isLoadingAudit ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                                    Consultando registros inmutables de auditoría...
                                                </td>
                                            </tr>
                                        ) : filteredAudit.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                                    No hay registros de auditoría para este filtro.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAudit.map((log, idx) => {
                                                const d = log.fechaIso ? new Date(log.fechaIso) : new Date();
                                                const isActionDanger = log.accion === 'suspender_usuario' || log.accion === 'eliminar' || log.accion === 'rechazar_lote';
                                                const isActionSuccess = log.accion === 'crear' || log.accion === 'activar_usuario' || log.accion === 'liberar_lote';

                                                return (
                                                    <tr key={log.id || idx} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                                                            {d.toLocaleDateString('es-CO')} {d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </td>

                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-900">{log.userName || log.userEmail}</div>
                                                            <div className="text-gray-400 text-[10px]">{log.userEmail} · ({log.userRole})</div>
                                                        </td>

                                                        <td className="p-4">
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold uppercase text-[10px]">
                                                                {log.modulo}
                                                            </span>
                                                        </td>

                                                        <td className="p-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isActionDanger ? 'bg-red-100 text-red-800' : isActionSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                                {log.accion}
                                                            </span>
                                                        </td>

                                                        <td className="p-4 max-w-md truncate">
                                                            <span className="text-gray-900 font-medium">{log.descripcion}</span>
                                                            {log.entidadId && (
                                                                <span className="text-gray-400 font-mono text-[10px] ml-1.5">[{log.entidadId}]</span>
                                                            )}
                                                        </td>

                                                        <td className="p-4 text-right">
                                                            {log.detalles && Object.keys(log.detalles).length > 0 ? (
                                                                <button
                                                                    onClick={() => setSelectedAuditLog(log)}
                                                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                                                >
                                                                    Ver JSON
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-300 text-[10px]">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL: Crear Usuario */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <UserPlus className="text-purple-600" size={20} />
                                    Crear Nuevo Usuario del Sistema
                                </h3>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newNombre}
                                        onChange={(e) => setNewNombre(e.target.value)}
                                        placeholder="Ej: Diego Martínez"
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico (Login) *</label>
                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="diego@biocambio360.com"
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña Inicial * (mínimo 6 caracteres)</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Rol en la Organización *</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => handleRoleChangeInCreate(e.target.value as SystemRole)}
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none focus:border-purple-600"
                                    >
                                        <option value="superadmin">👑 Super Administrador (Acceso Total + Usuarios)</option>
                                        <option value="director">👔 Director Estratégico (Fernando, Danilo, Julián)</option>
                                        <option value="gestor">📦 Gestor de Pedidos & Logística</option>
                                        <option value="produccion_calidad">🧪 Jefe de Planta & Calidad (Diego)</option>
                                        <option value="asesor">💼 Asesor Comercial (Karen, Katherine, Camilo)</option>
                                        <option value="cajero">🏪 Cajero Mostrador Soacha</option>
                                        <option value="mensajero">🛵 Mensajero (Flota Propia Bogotá/Sabana)</option>
                                    </select>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        {ROLE_DEFINITIONS[newRole]?.description}
                                    </p>
                                </div>

                                {newRole === 'asesor' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Asesor Asignado (para Cartera & Metas)</label>
                                        <input
                                            type="text"
                                            value={newAsesorAsignado}
                                            onChange={(e) => setNewAsesorAsignado(e.target.value)}
                                            placeholder="Ej: Karen, Katherine, Andrea, Camilo"
                                            className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Capacidades Modulares Permitidas</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        {ALL_CAPABILITIES_KEYS.map((key) => (
                                            <label key={key} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!newCapabilities[key]}
                                                    onChange={(e) => setNewCapabilities({ ...newCapabilities, [key]: e.target.checked })}
                                                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                />
                                                <span className="capitalize">{key}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingCreate}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmittingCreate ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        <span>{isSubmittingCreate ? 'Creando...' : 'Crear Usuario'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: Editar Usuario */}
            <AnimatePresence>
                {isEditModalOpen && selectedUser && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                        <Edit className="text-purple-600" size={20} />
                                        Editar Usuario & Capacidades
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">{selectedUser.email}</p>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={editNombre}
                                        onChange={(e) => setEditNombre(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Rol en la Organización</label>
                                    <select
                                        value={editRole}
                                        onChange={(e) => handleRoleChangeInEdit(e.target.value as SystemRole)}
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none focus:border-purple-600"
                                    >
                                        <option value="superadmin">👑 Super Administrador</option>
                                        <option value="director">👔 Director Estratégico (Fernando, Danilo, Julián)</option>
                                        <option value="gestor">📦 Gestor de Pedidos & Logística</option>
                                        <option value="produccion_calidad">🧪 Jefe de Planta & Calidad (Diego)</option>
                                        <option value="asesor">💼 Asesor Comercial</option>
                                        <option value="cajero">🏪 Cajero Mostrador Soacha</option>
                                        <option value="mensajero">🛵 Mensajero (Flota Propia Bogotá/Sabana)</option>
                                    </select>
                                </div>

                                {editRole === 'asesor' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Asesor Asignado (para Cartera & Metas)</label>
                                        <input
                                            type="text"
                                            value={editAsesorAsignado}
                                            onChange={(e) => setEditAsesorAsignado(e.target.value)}
                                            placeholder="Ej: Karen"
                                            className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Capacidades Modulares</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        {ALL_CAPABILITIES_KEYS.map((key) => (
                                            <label key={key} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!editCapabilities[key]}
                                                    onChange={(e) => setEditCapabilities({ ...editCapabilities, [key]: e.target.checked })}
                                                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                />
                                                <span className="capitalize">{key}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingEdit}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmittingEdit ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        <span>{isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: Restablecer Contraseña */}
            <AnimatePresence>
                {isResetPasswordModalOpen && selectedUser && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                        <Lock className="text-indigo-600" size={20} />
                                        Restablecer Contraseña
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">Usuario: {selectedUser.nombre}</p>
                                </div>
                                <button
                                    onClick={() => setIsResetPasswordModalOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña (mínimo 6 caracteres)</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={resetPasswordVal}
                                        onChange={(e) => setResetPasswordVal(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
                                    />
                                </div>

                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <span>Esta acción quedará registrada en la bitácora de auditoría ISO 9001 con tu identidad.</span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsResetPasswordModalOpen(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReset}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmittingReset ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                        <span>{isSubmittingReset ? 'Actualizando...' : 'Actualizar Clave'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: Detalle de Auditoría JSON */}
            <AnimatePresence>
                {selectedAuditLog && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                        <FileText className="text-indigo-600" size={18} />
                                        Registro de Auditoría Detallado
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">{selectedAuditLog.id || selectedAuditLog.fechaIso}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedAuditLog(null)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="font-bold text-gray-500 uppercase text-[10px]">Descripción:</span>
                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedAuditLog.descripcion}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Responsable:</span>
                                        <p className="font-bold text-gray-800">{selectedAuditLog.userName} ({selectedAuditLog.userRole})</p>
                                        <p className="text-[11px] text-gray-500 font-mono">{selectedAuditLog.userEmail}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Módulo / Acción:</span>
                                        <p className="font-bold text-gray-800">{selectedAuditLog.modulo} &gt; {selectedAuditLog.accion}</p>
                                        <p className="text-[11px] text-gray-500">Entidad: {selectedAuditLog.entidadId || 'N/A'}</p>
                                    </div>
                                </div>

                                {selectedAuditLog.detalles && (
                                    <div>
                                        <span className="font-bold text-gray-500 uppercase text-[10px]">Payload Técnico (Valores Anteriores vs Nuevos):</span>
                                        <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                                            {JSON.stringify(selectedAuditLog.detalles, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-2 border-t">
                                <button
                                    onClick={() => setSelectedAuditLog(null)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
