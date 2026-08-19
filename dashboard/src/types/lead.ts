// Raw data shape from assistencias.json
export interface RawLead {
  longitude: number;
  input_id: string;
  link: string;
  cid: string;
  title: string;
  categories: string[];
  category: string;
  address: string;
  open_hours: Record<string, string[]>;
  popular_times: Record<string, Record<string, number>>;
  web_site: string;
  phone: string;
  plus_code: string;
  review_count: number;
  review_rating: number;
  reviews_per_rating: Record<string, number>;
  latitude: number;
  longtitude: number;
  status: string;
  description: string;
  reviews_link: string;
  thumbnail: string;
  timezone: string;
  price_range: string;
  data_id: string;
  street_view_url: string;
  place_id: string;
  images: Array<{ title: string; image: string }> | null;
  complete_address: {
    borough: string;
    street: string;
    city: string;
    postal_code: string;
    state: string;
    country: string;
  };
  about: Array<{
    id: string;
    name: string;
    options: Array<{ name: string; enabled: boolean; values?: string[] }>;
  }> | null;
  emails: string[] | null;
}

// Phone type classification
export type PhoneType = 'celular' | 'fixo' | 'invalido';

// Normalized phone
export interface NormalizedPhone {
  raw: string;
  sanitized: string;        // digits only
  international: string;   // +55XXXXXXXXXXX
  display: string;         // formatted for display
  type: PhoneType;
  whatsappUrl: string | null;
}

// Lead contact status
export type LeadStatus = 'pendente' | 'contatado' | 'sem_resposta';

// Processed lead used throughout the UI
export interface Lead {
  id: string;               // derived from cid or place_id
  title: string;
  category: string;
  shortAddress: string;
  city: string;
  borough: string;
  state: string;
  phone: NormalizedPhone;
  website: string;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  mapLink: string;
  status: LeadStatus;
  raw: RawLead;
}

// WhatsApp template
export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

// Export filter options
export type ExportFilter = 'all' | 'whatsapp_only' | 'not_contacted';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filter: ExportFilter;
  columns: ExportColumn[];
}

export type ExportColumn =
  | 'title'
  | 'category'
  | 'city'
  | 'borough'
  | 'phone_display'
  | 'phone_international'
  | 'phone_type'
  | 'website'
  | 'rating'
  | 'reviewCount'
  | 'status'
  | 'mapLink';
