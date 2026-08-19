import type { ReactNode } from 'react';
import { MapPin, Star, Globe, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react';
import type { Lead } from '../../types/lead';
import { useApp } from '../../context/AppContext';
import {
  phoneBadgeClass,
  statusBadgeClass,
  STATUS_LABELS,
  PHONE_TYPE_LABELS,
  truncate,
  nextStatus,
  buildLeadWhatsAppUrl,
} from './leadHelpers';

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  const { setRawModalLead, selectedTemplateId, templates, updateLeadStatus } = useApp();

  const templateBody = templates.find((t) => t.id === selectedTemplateId)?.body ?? '';
  const whatsappUrl = lead.phone.whatsappUrl
    ? buildLeadWhatsAppUrl(lead, templateBody)
    : null;

  let phoneNode: ReactNode;
  if (lead.phone.type === 'invalido') {
    phoneNode = <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>{PHONE_TYPE_LABELS.invalido}</span>;
  } else {
    phoneNode = (
      <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>
        {lead.phone.display}
      </span>
    );
  }

  return (
    <div className="kanban-card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm leading-snug font-bold text-white">{lead.title}</h3>
        <span className={`badge shrink-0 ${statusBadgeClass(lead.status)}`}>
          {STATUS_LABELS[lead.status]}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {phoneNode}
        {lead.rating > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Star size={12} fill="currentColor" />
            {lead.rating.toFixed(1)}
          </span>
        )}
        <span className="text-xs text-gray-500">{lead.category}</span>
      </div>

      <p className="mb-3 flex items-start gap-1.5 text-xs text-gray-400">
        <MapPin size={12} className="mt-0.5 shrink-0" />
        {truncate(lead.shortAddress || lead.city || lead.borough || '—', 46)}
      </p>

      <div className="flex items-center gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp px-3 py-1.5 text-xs"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        ) : (
          <span className="btn cursor-not-allowed px-3 py-1.5 text-xs text-gray-500">
            Sem WhatsApp
          </span>
        )}

        {lead.website && (
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost h-8 w-8 justify-center p-0"
            title="Website"
          >
            <Globe size={13} />
          </a>
        )}

        <button
          onClick={() => setRawModalLead(lead)}
          className="btn btn-ghost ml-auto h-8 w-8 justify-center p-0"
          title="Ver detalhes"
        >
          <ExternalLink size={13} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
        <button
          onClick={() => updateLeadStatus(lead.id, nextStatus(lead.status))}
          className="text-xs text-gray-400 transition-colors hover:text-emerald-400"
        >
          Alterar status
        </button>
        <ChevronRight size={14} className="text-gray-600" />
      </div>
    </div>
  );
}