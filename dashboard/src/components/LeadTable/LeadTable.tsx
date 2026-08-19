import { useMemo, useState } from 'react';
import { Star, Globe, MessageCircle, ExternalLink, ArrowUpDown } from 'lucide-react';
import type { Lead } from '../../types/lead';
import { useApp } from '../../context/AppContext';
import {
  phoneBadgeClass,
  statusBadgeClass,
  STATUS_LABELS,
  PHONE_TYPE_LABELS,
  buildLeadWhatsAppUrl,
} from '../LeadCard/leadHelpers';

type SortKey = 'title' | 'category' | 'rating' | 'reviewCount' | 'city';

const PAGE_SIZE = 50;

export function LeadTable() {
  const { filteredLeads, updateLeadStatus, setRawModalLead, selectedTemplateId, templates } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const templateBody = templates.find((t) => t.id === selectedTemplateId)?.body ?? '';

  const sorted = useMemo(() => {
    const arr = [...filteredLeads];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredLeads, sortKey, sortDir]);

  const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortHeader(label: string, key: SortKey, alignRight = false) {
    return (
      <th
        onClick={() => toggleSort(key)}
        className={alignRight ? '!text-right' : undefined}
      >
        <span className={`inline-flex gap-1 ${alignRight ? 'justify-end !text-right' : ''}`}>
          {label}
          <ArrowUpDown size={11} className="opacity-60" />
        </span>
      </th>
    );
  }

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {sortHeader('Empresa', 'title')}
              {sortHeader('Categoria', 'category')}
              <th>Telefone</th>
              {sortHeader('Cidade', 'city')}
              {sortHeader('Avaliação', 'rating', true)}
              <th>Status</th>
              <th className="!bg-transparent">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const whatsappUrl = lead.phone.whatsappUrl
                ? buildLeadWhatsAppUrl(lead, templateBody)
                : null;
              return (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  whatsappUrl={whatsappUrl}
                  onView={() => setRawModalLead(lead)}
                  onCycleStatus={() => updateLeadStatus(lead.id, lead.status === 'pendente' ? 'contatado' : lead.status === 'contatado' ? 'sem_resposta' : 'pendente')}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="text-xs text-gray-500">
          {sorted.length.toLocaleString('pt-BR')} leads
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

interface LeadRowProps {
  lead: Lead;
  whatsappUrl: string | null;
  onView: () => void;
  onCycleStatus: () => void;
}

function LeadRow({ lead, whatsappUrl, onView, onCycleStatus }: LeadRowProps) {
  return (
    <tr>
      <td>
        <button
          onClick={onView}
          className="text-left text-sm font-semibold text-white transition-colors hover:text-emerald-400"
        >
          {lead.title}
        </button>
      </td>
      <td className="text-xs text-gray-400">{lead.category}</td>
      <td>
        {lead.phone.type === 'invalido' ? (
          <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>
            {PHONE_TYPE_LABELS.invalido}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>
              {lead.phone.display}
            </span>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Chamar no WhatsApp"
                className="btn btn-whatsapp h-7 w-7 justify-center rounded-full p-0"
              >
                <MessageCircle size={13} />
              </a>
            )}
          </div>
        )}
      </td>
      <td className="text-xs text-gray-400">
        {lead.city || '—'}
        {lead.borough ? ` · ${lead.borough}` : ''}
      </td>
      <td className="text-right">
        {lead.rating > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm text-amber-400">
            <Star size={13} fill="currentColor" />
            {lead.rating.toFixed(1)}
          </span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      <td>
        <button
          onClick={onCycleStatus}
          title="Clique para alterar o status"
          className={`badge ${statusBadgeClass(lead.status)} cursor-pointer transition-opacity hover:opacity-80`}
        >
          {STATUS_LABELS[lead.status]}
        </button>
      </td>
      <td>
        <div className="flex items-center justify-end gap-1">
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              title="Website"
              className="btn btn-ghost h-8 w-8 justify-center p-0"
            >
              <Globe size={14} />
            </a>
          )}
          <button
            onClick={onView}
            title="Detalhes"
            className="btn btn-ghost h-8 w-8 justify-center p-0"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}