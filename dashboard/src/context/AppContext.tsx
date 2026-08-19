import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Lead, LeadStatus, WhatsAppTemplate } from '../types/lead';
import type { RawLead } from '../types/lead';
import { processLeads } from '../utils/phoneUtils';
import {
  loadTemplates,
  saveTemplates,
  loadStatuses,
  saveStatuses,
  loadTheme,
  saveTheme,
} from '../utils/storage';

interface AppContextValue {
  // Data
  leads: Lead[];
  isLoading: boolean;
  // View
  view: 'table' | 'kanban';
  setView: (v: 'table' | 'kanban') => void;
  // Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  cityFilter: string;
  setCityFilter: (c: string) => void;
  statusFilter: LeadStatus | 'all';
  setStatusFilter: (s: LeadStatus | 'all') => void;
  filteredLeads: Lead[];
  // Lead actions
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  // Templates
  templates: WhatsAppTemplate[];
  setTemplates: (t: WhatsAppTemplate[]) => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  // Drawers / modals
  isTemplateDrawerOpen: boolean;
  setTemplateDrawerOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  rawModalLead: Lead | null;
  setRawModalLead: (lead: Lead | null) => void;
  // KPIs
  kpis: { total: number; withWhatsApp: number; contacted: number };
  // All unique categories and cities for filters
  categories: string[];
  cities: string[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [templates, setTemplatesState] = useState<WhatsAppTemplate[]>(loadTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    loadTemplates()[0]?.id ?? null
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme);
  const [isTemplateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [rawModalLead, setRawModalLead] = useState<Lead | null>(null);

  // Load JSON data
  useEffect(() => {
    const storedStatuses = loadStatuses();

    fetch('/assistencias.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        // File is newline-delimited JSON (one JSON object per line)
        const rawLeads: RawLead[] = text
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));

        const processed = processLeads(rawLeads);

        // Apply persisted statuses
        const withStatuses = processed.map((lead) => ({
          ...lead,
          status: (storedStatuses[lead.id] as LeadStatus) || 'pendente',
        }));

        setLeads(withStatuses);
      })
      .catch((err) => {
        console.error('Failed to load leads:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Persist statuses on change
  const updateLeadStatus = useCallback((id: string, status: LeadStatus) => {
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, status } : l));
      const statuses = Object.fromEntries(updated.map((l) => [l.id, l.status]));
      saveStatuses(statuses);
      return updated;
    });
  }, []);

  const setTemplates = useCallback((t: WhatsAppTemplate[]) => {
    setTemplatesState(t);
    saveTemplates(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, []);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    if (q && !lead.title.toLowerCase().includes(q) && !lead.borough.toLowerCase().includes(q))
      return false;
    if (categoryFilter && lead.category !== categoryFilter) return false;
    if (cityFilter && lead.city !== cityFilter) return false;
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    return true;
  });

  // KPIs
  const kpis = {
    total: leads.length,
    withWhatsApp: leads.filter((l) => l.phone.whatsappUrl !== null).length,
    contacted: leads.filter((l) => l.status === 'contatado').length,
  };

  // Unique filter options
  const categories = [...new Set(leads.map((l) => l.category))].sort();
  const cities = [...new Set(leads.map((l) => l.city).filter(Boolean))].sort();

  return (
    <AppContext.Provider
      value={{
        leads,
        isLoading,
        view,
        setView,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        cityFilter,
        setCityFilter,
        statusFilter,
        setStatusFilter,
        filteredLeads,
        updateLeadStatus,
        templates,
        setTemplates,
        selectedTemplateId,
        setSelectedTemplateId,
        theme,
        toggleTheme,
        isTemplateDrawerOpen,
        setTemplateDrawerOpen,
        isExportModalOpen,
        setExportModalOpen,
        rawModalLead,
        setRawModalLead,
        kpis,
        categories,
        cities,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
