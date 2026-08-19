import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, X } from 'lucide-react';
import type { ExportColumn, ExportFilter } from '../../types/lead';
import { exportLeads, ALL_COLUMNS, COLUMN_LABELS } from '../../utils/exportUtils';
import { useApp } from '../../context/AppContext';

const FORMATS: { value: 'csv' | 'json' | 'xlsx'; label: string; icon: typeof FileText }[] = [
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
];

const FILTERS: { value: ExportFilter; label: string }[] = [
  { value: 'all', label: 'Todos os leads' },
  { value: 'whatsapp_only', label: 'Somente com WhatsApp' },
  { value: 'not_contacted', label: 'Ainda não contatados' },
];

export function ExportModal() {
  const { isExportModalOpen, setExportModalOpen, leads } = useApp();
  const [format, setFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [filter, setFilter] = useState<ExportFilter>('all');
  const [columns, setColumns] = useState<ExportColumn[]>(ALL_COLUMNS);

  if (!isExportModalOpen) return null;

  function toggleColumn(col: ExportColumn) {
    setColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function handleExport() {
    if (columns.length === 0) return;
    exportLeads(leads, { format, filter, columns });
    setExportModalOpen(false);
  }

  return (
    <>
      <div className="overlay" onClick={() => setExportModalOpen(false)} />
      <div className="modal-box p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Exportar Leads</h2>
          <button
            onClick={() => setExportModalOpen(false)}
            className="btn btn-ghost h-9 w-9 justify-center p-0"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Format */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Formato
        </p>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {FORMATS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFormat(value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
                format === value
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Quais leads
        </p>
        <div className="mb-5 space-y-1.5">
          {FILTERS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <input
                type="radio"
                name="export-filter"
                checked={filter === value}
                onChange={() => setFilter(value)}
                className="accent-emerald-500"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Columns */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Colunas
        </p>
        <div className="mb-6 grid grid-cols-2 gap-1.5">
          {ALL_COLUMNS.map((col) => (
            <label
              key={col}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={columns.includes(col)}
                onChange={() => toggleColumn(col)}
                className="accent-emerald-500"
              />
              {COLUMN_LABELS[col]}
            </label>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={columns.length === 0}
          className="btn btn-primary w-full justify-center disabled:opacity-40"
        >
          <Download size={15} />
          Exportar {leads.length.toLocaleString('pt-BR')} leads
        </button>
      </div>
    </>
  );
}