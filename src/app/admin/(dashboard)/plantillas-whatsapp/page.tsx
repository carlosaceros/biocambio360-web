'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Loader2, AlertCircle, MessageSquareText, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useApiResource } from '@/hooks/useApiResource';
import { Button, Badge, Card, EmptyState, type BadgeColor } from '@/components/ui';

type MetaButton = {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
};

type MetaComponent =
    | { type: 'HEADER'; format: string; text?: string }
    | { type: 'BODY'; text: string }
    | { type: 'FOOTER'; text: string }
    | { type: 'BUTTONS'; buttons: MetaButton[] };

interface MetaTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: MetaComponent[];
    rejected_reason?: string;
}

const STATUS_BADGE: Record<string, BadgeColor> = {
    APPROVED: 'emerald',
    PENDING: 'amber',
    REJECTED: 'red',
    PAUSED: 'slate',
    DISABLED: 'red',
    IN_APPEAL: 'violet',
    PENDING_DELETION: 'slate',
};

// Meta solo permite editar una plantilla en estos estados -- mientras está PENDING no se puede.
const EDITABLE_STATUSES = new Set(['APPROVED', 'REJECTED', 'PAUSED']);

function getComponent<T extends MetaComponent['type']>(components: MetaComponent[] | undefined, type: T) {
    return components?.find((c) => c.type === type) as Extract<MetaComponent, { type: T }> | undefined;
}

function detectPlaceholderCount(text: string): number {
    const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10));
    return matches.length > 0 ? Math.max(...matches) : 0;
}

interface FormState {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    headerText: string;
    bodyText: string;
    bodyExamples: string[];
    footerText: string;
    buttons: MetaButton[];
}

const EMPTY_FORM: FormState = {
    name: '', category: 'MARKETING', language: 'es_CO',
    headerText: '', bodyText: '', bodyExamples: [], footerText: '', buttons: [],
};

function templateToForm(t: MetaTemplate): FormState {
    const header = getComponent(t.components, 'HEADER');
    const body = getComponent(t.components, 'BODY');
    const footer = getComponent(t.components, 'FOOTER');
    const buttons = getComponent(t.components, 'BUTTONS');
    const bodyText = body?.text || '';
    return {
        name: t.name,
        category: (t.category as FormState['category']) || 'MARKETING',
        language: t.language,
        headerText: header?.format === 'TEXT' ? header.text || '' : '',
        bodyText,
        bodyExamples: Array(detectPlaceholderCount(bodyText)).fill(''),
        footerText: footer?.text || '',
        buttons: buttons?.buttons || [],
    };
}

export default function WhatsappTemplatesPage() {
    const router = useRouter();
    const { user, loading: authLoading, canAccess } = useAuth();
    const isAllowed = canAccess('mensajeria');

    const [accountKey, setAccountKey] = useState<'biocambio360' | 'totalLimpieza'>('biocambio360');
    const { data, loading, error, refetch } = useApiResource<{ templates: MetaTemplate[] }>(
        `/api/admin/whatsapp-templates?accountKey=${accountKey}`,
        { enabled: !authLoading && isAllowed }
    );
    const templates = useMemo(() => data?.templates ?? [], [data]);

    const [formOpen, setFormOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MetaTemplate | null>(null);

    const openCreate = () => { setEditingTemplate(null); setFormOpen(true); };
    const openEdit = (t: MetaTemplate) => { setEditingTemplate(t); setFormOpen(true); };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={32} />
                    <p className="font-black text-gray-900">Acceso restringido</p>
                    <p className="text-sm text-gray-500">Esta sección requiere el permiso de mensajería.</p>
                    <button onClick={() => router.push('/admin')} className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 shadow-xs px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push('/admin')} className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={18} />
                </button>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquareText size={14} className="text-white" />
                </div>
                <div className="flex-1">
                    <h1 className="font-black text-slate-900 text-sm leading-tight">Plantillas de WhatsApp</h1>
                    <p className="text-[10px] text-slate-400">Crear y editar plantillas, aprobación gestionada por Meta</p>
                </div>
                <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Nueva plantilla</Button>
            </header>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                <div className="flex gap-2">
                    {(['biocambio360', 'totalLimpieza'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setAccountKey(key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                accountKey === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                        >
                            {key === 'biocambio360' ? 'Biocambio360' : 'Total Limpieza'}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="py-16 flex items-center justify-center">
                        <Loader2 className="animate-spin text-slate-400" size={24} />
                    </div>
                )}

                {error && !loading && (
                    <Card padding="md" className="border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                    </Card>
                )}

                {!loading && !error && templates.length === 0 && (
                    <EmptyState title="No hay plantillas todavía" description="Crea la primera con el botón de arriba." />
                )}

                {!loading && !error && templates.map((t) => {
                    const body = getComponent(t.components, 'BODY');
                    const canEdit = EDITABLE_STATUSES.has(t.status);
                    return (
                        <Card key={t.id} padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-slate-900 text-sm">{t.name}</p>
                                        <Badge color={STATUS_BADGE[t.status] || 'slate'}>{t.status}</Badge>
                                        <Badge color="indigo">{t.category}</Badge>
                                        <Badge color="blue">{t.language}</Badge>
                                    </div>
                                    {body?.text && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{body.text}</p>}
                                    {t.status === 'REJECTED' && t.rejected_reason && (
                                        <p className="text-[11px] text-red-500 mt-1">Motivo: {t.rejected_reason}</p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={<Pencil size={12} />}
                                    disabled={!canEdit}
                                    title={canEdit ? 'Editar plantilla' : 'Meta no permite editar mientras está PENDING'}
                                    onClick={() => openEdit(t)}
                                >
                                    Editar
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {formOpen && (
                <TemplateFormModal
                    initial={editingTemplate ? templateToForm(editingTemplate) : EMPTY_FORM}
                    editingId={editingTemplate?.id ?? null}
                    accountKey={accountKey}
                    getIdToken={() => user!.getIdToken()}
                    onClose={() => setFormOpen(false)}
                    onSaved={() => { setFormOpen(false); refetch(); }}
                />
            )}
        </div>
    );
}

function TemplateFormModal({
    initial, editingId, accountKey, getIdToken, onClose, onSaved,
}: {
    initial: FormState;
    editingId: string | null;
    accountKey: string;
    getIdToken: () => Promise<string>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<FormState>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!editingId;
    const placeholderCount = detectPlaceholderCount(form.bodyText);

    const updateExample = (idx: number, value: string) => {
        setForm((f) => {
            const next = [...f.bodyExamples];
            next[idx] = value;
            return { ...f, bodyExamples: next };
        });
    };

    const addButton = () => {
        if (form.buttons.length >= 10) return;
        setForm((f) => ({ ...f, buttons: [...f.buttons, { type: 'QUICK_REPLY', text: '' }] }));
    };
    const updateButton = (idx: number, patch: Partial<MetaButton>) => {
        setForm((f) => {
            const next = [...f.buttons];
            next[idx] = { ...next[idx], ...patch };
            return { ...f, buttons: next };
        });
    };
    const removeButton = (idx: number) => {
        setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async () => {
        setError(null);
        setSaving(true);
        try {
            const idToken = await getIdToken();
            const payload = isEditing
                ? {
                    category: form.category,
                    headerText: form.headerText || undefined,
                    bodyText: form.bodyText,
                    bodyExamples: form.bodyExamples,
                    footerText: form.footerText || undefined,
                    buttons: form.buttons,
                }
                : {
                    accountKey,
                    name: form.name,
                    category: form.category,
                    language: form.language,
                    headerText: form.headerText || undefined,
                    bodyText: form.bodyText,
                    bodyExamples: form.bodyExamples,
                    footerText: form.footerText || undefined,
                    buttons: form.buttons,
                };

            const res = await fetch(
                isEditing ? `/api/admin/whatsapp-templates/${editingId}` : '/api/admin/whatsapp-templates',
                {
                    method: isEditing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify(payload),
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo guardar la plantilla.');
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white">
                    <h2 className="font-black text-slate-900 text-sm">{isEditing ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-4">
                    {isEditing && (
                        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Editar reinicia la plantilla a estado PENDING para que Meta la revise de nuevo. Meta permite
                            como máximo 1 edición al día y 10 al mes por plantilla. El nombre y el idioma no se pueden cambiar.
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500">Nombre</label>
                            <input
                                value={form.name}
                                disabled={isEditing}
                                onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                placeholder="confirmacion_pedido"
                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500">Idioma</label>
                            <input
                                value={form.language}
                                disabled={isEditing}
                                onChange={(e) => setForm({ ...form, language: e.target.value })}
                                placeholder="es_CO"
                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Categoría</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value as FormState['category'] })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        >
                            <option value="MARKETING">Marketing</option>
                            <option value="UTILITY">Utilidad</option>
                            <option value="AUTHENTICATION">Autenticación</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Encabezado (opcional, máx. 60 caracteres)</label>
                        <input
                            value={form.headerText}
                            maxLength={60}
                            onChange={(e) => setForm({ ...form, headerText: e.target.value })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">
                            Cuerpo del mensaje ({form.bodyText.length}/1024) — usa {'{{1}}'}, {'{{2}}'}... para variables
                        </label>
                        <textarea
                            value={form.bodyText}
                            maxLength={1024}
                            rows={4}
                            onChange={(e) => setForm({ ...form, bodyText: e.target.value, bodyExamples: Array(detectPlaceholderCount(e.target.value)).fill('') })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>

                    {placeholderCount > 0 && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500">Valores de ejemplo (Meta los exige para revisar)</label>
                            {Array.from({ length: placeholderCount }).map((_, idx) => (
                                <input
                                    key={idx}
                                    value={form.bodyExamples[idx] || ''}
                                    onChange={(e) => updateExample(idx, e.target.value)}
                                    placeholder={`Ejemplo para {{${idx + 1}}}`}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                />
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Pie de página (opcional, máx. 60 caracteres)</label>
                        <input
                            value={form.footerText}
                            maxLength={60}
                            onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-500">Botones (máx. 10)</label>
                            <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addButton} disabled={form.buttons.length >= 10}>
                                Agregar
                            </Button>
                        </div>
                        {form.buttons.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                                <select
                                    value={b.type}
                                    onChange={(e) => updateButton(idx, { type: e.target.value as MetaButton['type'] })}
                                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                                >
                                    <option value="QUICK_REPLY">Respuesta rápida</option>
                                    <option value="URL">Enlace</option>
                                    <option value="PHONE_NUMBER">Llamar</option>
                                </select>
                                <input
                                    value={b.text}
                                    onChange={(e) => updateButton(idx, { text: e.target.value })}
                                    placeholder="Texto del botón"
                                    maxLength={25}
                                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                                />
                                {b.type === 'URL' && (
                                    <input
                                        value={b.url || ''}
                                        onChange={(e) => updateButton(idx, { url: e.target.value })}
                                        placeholder="https://..."
                                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                                    />
                                )}
                                {b.type === 'PHONE_NUMBER' && (
                                    <input
                                        value={b.phone_number || ''}
                                        onChange={(e) => updateButton(idx, { phone_number: e.target.value })}
                                        placeholder="573001234567"
                                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                                    />
                                )}
                                <button onClick={() => removeButton(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 sticky bottom-0 bg-white">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} loading={saving} disabled={!form.name || !form.bodyText}>
                        {isEditing ? 'Guardar cambios' : 'Enviar a revisión de Meta'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
