import type { WhatsAppTemplate } from '../types/lead';

const STORAGE_KEY_TEMPLATES = 'leadradar:templates';
const STORAGE_KEY_STATUSES = 'leadradar:statuses';
const STORAGE_KEY_THEME = 'leadradar:theme';

// ---- Templates ----

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl-compra-sucata',
    name: 'Compra de Sucata Eletrônica',
    body: 'Olá, tudo bem? Trabalho com reciclagem / reaproveitamento de componentes e estou comprando sucata e placas condenadas de celulares/eletrônicos em lote. Vocês têm placas velhas ou aparelhos sucateados parados aí para vender? Compro em quantidade!',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-1',
    name: 'Apresentação Geral',
    body: 'Olá! Tudo bem? Vi a {empresa} no Google Maps e fiquei interessado nos seus serviços. Posso saber mais sobre os preços e disponibilidade?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-2',
    name: 'Assistência Técnica',
    body: 'Oi, {empresa}! Vi vocês atuando na área de {categoria} em {cidade}. Tenho um aparelho para manutenção — qual o prazo e o preço médio?',
    createdAt: new Date().toISOString(),
  },
];

export function loadTemplates(): WhatsAppTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: WhatsAppTemplate[]): void {
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
}

// ---- Lead statuses (persisted across refreshes) ----

export function loadStatuses(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATUSES);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

export function saveStatuses(statuses: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY_STATUSES, JSON.stringify(statuses));
}

// ---- Theme ----

export function loadTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore
  }
  return 'dark';
}

export function saveTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

// ---- WhatsApp message builder ----

export function buildWhatsAppUrl(
  phone: string,
  templateBody: string,
  variables: Record<string, string>
): string {
  let message = templateBody;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  const encoded = encodeURIComponent(message);
  return `${phone}?text=${encoded}`;
}
