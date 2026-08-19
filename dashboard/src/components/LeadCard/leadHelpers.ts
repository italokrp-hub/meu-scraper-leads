import type { Lead, LeadStatus, PhoneType } from '../../types/lead';

/** Returns the badge class for phone type */
export function phoneBadgeClass(type: PhoneType): string {
  if (type === 'celular') return 'badge-green';
  if (type === 'fixo') return 'badge-orange';
  return 'badge-red';
}

/** Returns the badge class for lead status */
export function statusBadgeClass(status: LeadStatus): string {
  if (status === 'contatado') return 'badge-blue';
  if (status === 'sem_resposta') return 'badge-red';
  return 'badge-gray';
}

/** Human-readable status labels */
export const STATUS_LABELS: Record<LeadStatus, string> = {
  pendente: 'Pendente',
  contatado: 'Contatado',
  sem_resposta: 'Sem Resposta',
};

/** Human-readable phone type labels */
export const PHONE_TYPE_LABELS: Record<PhoneType, string> = {
  celular: '📱 Celular',
  fixo: '☎️ Fixo',
  invalido: '❌ Inválido',
};

/** Cycle to next status */
export function nextStatus(current: LeadStatus): LeadStatus {
  if (current === 'pendente') return 'contatado';
  if (current === 'contatado') return 'sem_resposta';
  return 'pendente';
}

/** Rating stars string */
export function starsDisplay(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** Truncate long text */
export function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Build WhatsApp URL with template and lead variables */
export function buildLeadWhatsAppUrl(lead: Lead, templateBody: string): string {
  const variables: Record<string, string> = {
    empresa: lead.title,
    nome: lead.title,
    categoria: lead.category,
    cidade: lead.city,
    bairro: lead.borough,
    estado: lead.state,
    telefone: lead.phone.display,
  };

  let message = templateBody;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  const phoneUrl = lead.phone.whatsappUrl || '';
  return `${phoneUrl}?text=${encodeURIComponent(message)}`;
}
