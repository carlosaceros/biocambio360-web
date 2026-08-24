'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, X, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const { user, changePassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newPassword || newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden. Verifica e intenta de nuevo.');
            return;
        }

        setLoading(true);
        try {
            await changePassword(newPassword);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setNewPassword('');
                setConfirmPassword('');
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-indigo-950 p-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                                <Key className="text-indigo-300" size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-white">Cambiar Contraseña</h3>
                                <p className="text-xs text-gray-300 truncate max-w-[240px]">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 text-center space-y-3"
                            >
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 size={36} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">¡Contraseña Actualizada!</h4>
                                <p className="text-sm text-gray-500">Tu nueva clave ha sido guardada con éxito.</p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                                        <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Nueva Contraseña */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirmar Contraseña */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Shield size={16} />
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repite la nueva contraseña"
                                            required
                                            minLength={6}
                                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Key size={15} />
                                                Actualizar Clave
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
