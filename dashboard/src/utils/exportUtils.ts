import * as XLSX from 'xlsx';
import type { Lead, ExportOptions, ExportColumn } from '../types/lead';

const COLUMN_LABELS: Record<ExportColumn, string> = {
  title: 'Nome da Empresa',
  category: 'Categoria',
  city: 'Cidade',
  borough: 'Bairro',
  phone_display: 'Telefone',
  phone_international: 'Telefone Internacional',
  phone_type: 'Tipo de Telefone',
  website: 'Website',
  rating: 'Avaliação',
  reviewCount: 'Nº de Reviews',
  status: 'Status',
  mapLink: 'Link Google Maps',
};

function getColumnValue(lead: Lead, column: ExportColumn): string | number {
  switch (column) {
    case 'title': return lead.title;
    case 'category': return lead.category;
    case 'city': return lead.city;
    case 'borough': return lead.borough;
    case 'phone_display': return lead.phone.display;
    case 'phone_international': return lead.phone.international;
    case 'phone_type': return lead.phone.type;
    case 'website': return lead.website;
    case 'rating': return lead.rating;
    case 'reviewCount': return lead.reviewCount;
    case 'status': return lead.status;
    case 'mapLink': return lead.mapLink;
    default: return '';
  }
}

function applyFilter(leads: Lead[], filter: ExportOptions['filter']): Lead[] {
  switch (filter) {
    case 'whatsapp_only':
      return leads.filter((l) => l.phone.whatsappUrl !== null);
    case 'not_contacted':
      return leads.filter((l) => l.status !== 'contatado');
    default:
      return leads;
  }
}

function buildRows(leads: Lead[], columns: ExportColumn[]): Record<string, string | number>[] {
  return leads.map((lead) => {
    const row: Record<string, string | number> = {};
    columns.forEach((col) => {
      row[COLUMN_LABELS[col]] = getColumnValue(lead, col);
    });
    return row;
  });
}

export function exportLeads(leads: Lead[], options: ExportOptions): void {
  const filtered = applyFilter(leads, options.filter);
  const rows = buildRows(filtered, options.columns);

  if (options.format === 'json') {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'leads.json');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  if (options.format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'leads.csv');
  } else {
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, 'leads.xlsx');
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const ALL_COLUMNS: ExportColumn[] = [
  'title',
  'category',
  'city',
  'borough',
  'phone_display',
  'phone_international',
  'phone_type',
  'website',
  'rating',
  'reviewCount',
  'status',
  'mapLink',
];

export { COLUMN_LABELS };
