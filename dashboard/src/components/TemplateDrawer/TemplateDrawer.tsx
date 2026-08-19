import { useState } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import type { WhatsAppTemplate } from '../../types/lead';
import { useApp } from '../../context/AppContext';

export function TemplateDrawer() {
  const { isTemplateDrawerOpen, setTemplateDrawerOpen, templates, setTemplates, selectedTemplateId, setSelectedTemplateId } = useApp();
  const [editingName, setEditingName] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  if (!isTemplateDrawerOpen) return null;

  function startNew() {
    setEditingId(null);
    setIsNew(true);
    setEditingName('');
    setEditingBody('');
  }

  function startEdit(tpl: WhatsAppTemplate) {
    setEditingId(tpl.id);
    setIsNew(false);
    setEditingName(tpl.name);
    setEditingBody(tpl.body);
  }

  function save() {
    if (!editingName.trim() || !editingBody.trim()) return;
    const now = new Date().toISOString();
    if (isNew) {
      const tpl: WhatsAppTemplate = {
        id: `tpl-${Date.now()}`,
        name: editingName.trim(),
        body: editingBody.trim(),
        createdAt: now,
      };
      setTemplates([...templates, tpl]);
      setSelectedTemplateId(tpl.id);
    } else if (editingId) {
      setTemplates(
        templates.map((t) => (t.id === editingId ? { ...t, name: editingName.trim(), body: editingBody.trim() } : t))
      );
    }
    setEditingId(null);
    setIsNew(false);
  }

  function remove(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    if (selectedTemplateId === id) setSelectedTemplateId(next[0]?.id ?? null);
    if (editingId === id) {
      setEditingId(null);
      setIsNew(false);
    }
  }

  return (
    <>
      <div className="overlay" onClick={() => setTemplateDrawerOpen(false)} />
      <aside className="drawer-box p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <MessageSquare size={18} className="text-emerald-400" />
            Templates de WhatsApp
          </h2>
          <button
            onClick={() => setTemplateDrawerOpen(false)}
            className="btn btn-ghost h-9 w-9 justify-center p-0"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <button onClick={startNew} className="btn btn-secondary mb-4 w-full justify-center">
          <Plus size={15} />
          Novo template
        </button>

        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${
                selectedTemplateId === tpl.id
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
              }`}
              onClick={() => startEdit(tpl)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{tpl.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(tpl.id);
                  }}
                  className="text-gray-500 transition-colors hover:text-red-400"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-400">{tpl.body}</p>
            </div>
          ))}
        </div>

        {(isNew || editingId) && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">
              {isNew ? 'Novo template' : 'Editar template'}
            </p>
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Nome (ex.: Apresentação)"
              className="input"
            />
            <textarea
              value={editingBody}
              onChange={(e) => setEditingBody(e.target.value)}
              placeholder="Mensagem... Variáveis: {empresa}, {categoria}, {cidade}, {bairro}, {estado}"
              rows={4}
              className="input"
            />
            <div className="flex gap-2">
              <button onClick={save} className="btn btn-primary flex-1 justify-center">
                Salvar
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setIsNew(false);
                }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}