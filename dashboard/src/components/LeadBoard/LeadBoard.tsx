import { STATUS_LABELS } from '../LeadCard/leadHelpers';
import { LeadCard } from '../LeadCard/LeadCard';
import { useApp } from '../../context/AppContext';
import type { LeadStatus } from '../../types/lead';

const COLUMN_ORDER: LeadStatus[] = ['pendente', 'contatado', 'sem_resposta'];

const COLUMN_ACCENT: Record<LeadStatus, string> = {
  pendente: 'text-gray-400',
  contatado: 'text-emerald-400',
  sem_resposta: 'text-red-400',
};

export function LeadBoard() {
  const { filteredLeads } = useApp();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-fade-up">
      {COLUMN_ORDER.map((status) => {
        const columnLeads = filteredLeads.filter((l) => l.status === status);
        return (
          <div key={status} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className={`mb-3 flex items-center justify-between px-2 ${COLUMN_ACCENT[status]}`}>
              <span className="text-xs font-bold uppercase tracking-wider">
                {STATUS_LABELS[status]}
              </span>
              <span className="badge badge-gray">{columnLeads.length}</span>
            </div>
            <div className="space-y-3">
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {columnLeads.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-gray-500">
                  Sem leads nesta coluna
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}