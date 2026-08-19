import * as XLSX from 'xlsx';
import type { RawLead } from '../types/lead';

/**
 * Converte uma célula do CSV em valor estruturado. Células com JSON (ex.:
 * complete_address, about, images, open_hours) vêm como strings; células já
 * tipadas pelo parser são mantidas.
 */
function parseCell(value: unknown): unknown {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;

  const text = String(value).trim();
  if (text === '') return null;
  if (text === 'null') return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function toStringArray(value: unknown): string[] {
  const parsed = parseCell(value);
  if (Array.isArray(parsed)) return parsed.map(toString);
  if (typeof parsed === 'string' && parsed !== '') return [parsed];
  return [];
}

// Campos JSON que devem ser re-hidratados em objetos/arrays.
const JSON_FIELDS = new Set([
  'open_hours',
  'popular_times',
  'reviews_per_rating',
  'images',
  'reservations',
  'order_online',
  'menu',
  'owner',
  'complete_address',
  'credit_cards_accepted',
  'about',
  'user_reviews',
  'user_reviews_extended',
  'emails',
]);

function makeRawLead(row: Record<string, unknown>): RawLead {
  const cAddr =
    (parseCell(row.complete_address) as { borough?: string; street?: string; city?: string; postal_code?: string; state?: string; country?: string } | null) || {};
  return {
    longitude: toNumber(row.longitude),
    input_id: toString(row.input_id),
    link: toString(row.link),
    cid: toString(row.cid),
    title: toString(row.title),
    categories: toStringArray(row.categories || row.category),
    category: toString(row.category),
    address: toString(row.address),
    open_hours: (parseCell(row.open_hours) as Record<string, string[]>) || {},
    popular_times: (parseCell(row.popular_times) as Record<string, Record<string, number>>) || {},
    web_site: toString(row.website),
    phone: toString(row.phone),
    plus_code: toString(row.plus_code),
    review_count: toNumber(row.review_count),
    review_rating: toNumber(row.review_rating),
    reviews_per_rating: (parseCell(row.reviews_per_rating) as Record<string, number>) || {},
    latitude: toNumber(row.latitude),
    longtitude: toNumber(row.longitude),
    status: toString(row.status),
    description: toString(row.descriptions),
    reviews_link: toString(row.reviews_link),
    thumbnail: toString(row.thumbnail),
    timezone: toString(row.timezone),
    price_range: toString(row.price_range),
    data_id: toString(row.data_id),
    street_view_url: toString(row.street_view_url),
    place_id: toString(row.place_id),
    images: (parseCell(row.images) as RawLead['images']) || null,
    complete_address: {
      borough: toString(cAddr.borough ?? ''),
      street: toString(cAddr.street ?? ''),
      city: toString(cAddr.city ?? ''),
      postal_code: toString(cAddr.postal_code ?? ''),
      state: toString(cAddr.state ?? ''),
      country: toString(cAddr.country ?? ''),
    },
    about: (parseCell(row.about) as RawLead['about']) || null,
    emails: (parseCell(row.emails) as string[]) || null,
  };
}

/**
 * Reconstrói as células JSON do CSV que o XLSX já transformou em objetos ao
 * converter para JSON rows — aqui apenas garantimos estabilidade de tipos.
 */
function hydrateJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const field of JSON_FIELDS) {
    if (out[field] == null || out[field] === '') {
      out[field] = null;
    }
  }
  return out;
}

/**
 * Parseia o CSV de resultados baixado do backend e devolve os leads brutos.
 * Resultados com endereço apontando para fora do Brasil são descartados para
 * manter o foco em prospecção nacional.
 */
export function parseResultsCsv(csvText: string): RawLead[] {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    raw: true,
    defval: '',
  });

  return rows
    .map((row) => makeRawLead(hydrateJsonFields(row)))
    .filter((lead) => lead.complete_address.country === '' || lead.complete_address.country === 'BR');
}