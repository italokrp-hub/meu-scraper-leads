import type { RawLead, Lead, NormalizedPhone, PhoneType } from '../types/lead';

/**
 * Strip all non-digit characters from a phone string.
 */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Classify a Brazilian phone number as celular, fixo or invalido.
 * Brazilian mobile numbers have 9 digits (starting with 9) after the area code.
 * Landlines have 8 digits.
 */
function classifyPhone(digits: string): PhoneType {
  // After stripping country code (+55), DDD (2 digits):
  // mobile: 11 digits total (55 + 2 DDD + 9 subscriber)
  // landline: 10 digits total (55 + 2 DDD + 8 subscriber)
  // Without country code:
  // mobile: 11 digits
  // landline: 10 digits
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return 'celular';
  if (local.length === 10) return 'fixo';
  if (local.length === 9 && local[0] === '9') return 'celular';
  if (local.length === 8) return 'fixo';
  return 'invalido';
}

/**
 * Format a local (without country code) number for display.
 */
function formatDisplay(local: string): string {
  if (local.length === 11) {
    // (XX) 9XXXX-XXXX
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    // (XX) XXXX-XXXX
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return local;
}

/**
 * Normalize a raw Brazilian phone string to a structured NormalizedPhone object.
 */
export function normalizePhone(rawPhone: string): NormalizedPhone {
  const sanitized = digitsOnly(rawPhone);

  if (!sanitized || sanitized.length < 8) {
    return {
      raw: rawPhone,
      sanitized,
      international: '',
      display: rawPhone || '—',
      type: 'invalido',
      whatsappUrl: null,
    };
  }

  // Determine local number (without country code)
  let local = sanitized;
  if (sanitized.startsWith('55') && sanitized.length > 10) {
    local = sanitized.slice(2);
  }

  const international = `+55${local}`;
  const display = formatDisplay(local);
  const type = classifyPhone(sanitized);
  const whatsappUrl = type === 'celular' ? `https://wa.me/55${local}` : null;

  return {
    raw: rawPhone,
    sanitized,
    international,
    display,
    type,
    whatsappUrl,
  };
}

/**
 * Build a short address from the complete_address object.
 */
function buildShortAddress(raw: RawLead): string {
  const addr = raw.complete_address;
  if (!addr) return raw.address || '—';
  const parts = [addr.street, addr.borough, addr.city].filter(Boolean);
  return parts.join(', ');
}

/**
 * Transform a raw lead from the JSON into a normalized Lead.
 */
export function processLead(raw: RawLead): Lead {
  const id = raw.cid || raw.place_id || raw.data_id || String(Math.random());
  const phone = normalizePhone(raw.phone || '');
  const addr = raw.complete_address || {
    borough: '',
    street: '',
    city: '',
    postal_code: '',
    state: '',
    country: 'BR',
  };

  return {
    id,
    title: raw.title || '(sem nome)',
    category: raw.category || raw.categories?.[0] || 'Outros',
    shortAddress: buildShortAddress(raw),
    city: addr.city || '',
    borough: addr.borough || '',
    state: addr.state || '',
    phone,
    website: raw.web_site || '',
    rating: raw.review_rating || 0,
    reviewCount: raw.review_count || 0,
    thumbnail: raw.thumbnail || '',
    mapLink: raw.link || '',
    status: 'pendente',
    raw,
  };
}

/**
 * Deduplicate leads by phone (international) and title.
 * Keeps the first occurrence.
 */
export function deduplicateLeads(leads: Lead[]): Lead[] {
  const seenPhones = new Set<string>();
  const seenTitles = new Set<string>();

  return leads.filter((lead) => {
    const phoneKey = lead.phone.international;
    const titleKey = lead.title.toLowerCase().trim();

    // If we have a valid phone, deduplicate by phone
    if (phoneKey) {
      if (seenPhones.has(phoneKey)) return false;
      seenPhones.add(phoneKey);
    }

    // Also deduplicate by exact title (catches entries with no phone)
    if (seenTitles.has(titleKey)) return false;
    seenTitles.add(titleKey);

    return true;
  });
}

/**
 * Process an array of raw leads into cleaned, deduplicated Lead objects.
 */
export function processLeads(rawLeads: RawLead[]): Lead[] {
  const processed = rawLeads.map(processLead);
  return deduplicateLeads(processed);
}
