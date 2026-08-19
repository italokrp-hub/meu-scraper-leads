import { Globe, MapPin, MessageCircle, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import {
  phoneBadgeClass,
  statusBadgeClass,
  STATUS_LABELS,
  buildLeadWhatsAppUrl,
} from '../LeadCard/leadHelpers';

export function RawLeadModal() {
  const { rawModalLead, setRawModalLead, selectedTemplateId, templates } = useApp();

  if (!rawModalLead) return null;
  const lead = rawModalLead;
  const templateBody = templates.find((t) => t.id === selectedTemplateId)?.body ?? '';
  const whatsappUrl = lead.phone.whatsappUrl ? buildLeadWhatsAppUrl(lead, templateBody) : null;

  let hoursNode: ReactNode = <span className="text-gray-500">—</span>;
  const openHours = lead.raw.open_hours;
  if (openHours) {
    const lines = Object.entries(openHours)
      .map(([day, ranges]) => (
        <li key={day} className="flex justify-between gap-4">
          <span className="capitalize text-gray-400">{day}</span>
          <span className="text-gray-300">{ranges.join(', ')}</span>
        </li>
      ));
    hoursNode = <ul className="space-y-1">{lines}</ul>;
  }

  let aboutNode: ReactNode = null;
  if (lead.raw.about && lead.raw.about.length > 0) {
    aboutNode = (
      <div className="flex flex-wrap gap-1.5">
        {lead.raw.about.map((item) =>
          item.options
            .filter((o) => o.enabled)
            .map((o) => (
              <span key={`${item.id}-${o.name}`} className="badge badge-gray">
                {o.name}
              </span>
            ))
        )}
      </div>
    );
  }

  return (
    <>
      <div className="overlay" onClick={() => setRawModalLead(null)} />
      <div className="modal-box p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{lead.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`badge ${statusBadgeClass(lead.status)}`}>
                {STATUS_LABELS[lead.status]}
              </span>
              <span className="badge badge-gray">{lead.category}</span>
              {lead.rating > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star size={12} fill="currentColor" />
                  {lead.rating.toFixed(1)} ({lead.reviewCount})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setRawModalLead(null)}
            className="btn btn-ghost h-9 w-9 justify-center p-0"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
            <span className="text-gray-300">{lead.shortAddress || '—'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lead.phone.type === 'invalido' ? (
              <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>Telefone inválido</span>
            ) : (
              <span className={`badge ${phoneBadgeClass(lead.phone.type)}`}>
                {lead.phone.display}
              </span>
            )}
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost h-8 px-3 py-1 text-xs"
              >
                <Globe size={13} /> Website
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp h-8 px-3 py-1 text-xs"
              >
                <MessageCircle size={13} /> Abrir WhatsApp
              </a>
            )}
          </div>

          {lead.raw.description && (
            <p className="text-gray-300">{lead.raw.description}</p>
          )}

          {aboutNode && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Características
              </p>
              {aboutNode}
            </div>
          )}

          {openHours && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Horários
              </p>
              {hoursNode}
            </div>
          )}

          <div className="flex flex-wrap gap-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
            {lead.phone.international && (
              <span className="text-gray-400">
                Intl: <span className="text-gray-200">{lead.phone.international}</span>
              </span>
            )}
            {lead.state && (
              <span className="text-gray-400">
                UF: <span className="text-gray-200">{lead.state}</span>
              </span>
            )}
            {lead.city && (
              <span className="text-gray-400">
                Cidade: <span className="text-gray-200">{lead.city}</span>
              </span>
            )}
            {lead.raw.complete_address?.postal_code && (
              <span className="text-gray-400">
                CEP: <span className="text-gray-200">{lead.raw.complete_address.postal_code}</span>
              </span>
            )}
          </div>

          <a
            href={lead.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            Ver no Google Maps →
          </a>
        </div>
      </div>
    </>
  );
}