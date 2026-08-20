import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Lead, LeadStatus, WhatsAppTemplate } from '../types/lead';
import type { RawLead } from '../types/lead';
import { processLeads } from '../utils/phoneUtils';
import { parseResultsCsv } from '../utils/csv';
import { createSearchJob, pollJob, downloadJobResults, buildSearchKeyword, checkApiStatus, geocodeCity } from '../lib/api';
import type { SearchState } from '../lib/api';
import {
  loadTemplates,
  saveTemplates,
  loadStatuses,
  saveStatuses,
  loadTheme,
  saveTheme,
} from '../utils/storage';

interface SearchOptions {
  depth: number;
  maxTimeSeconds: number;
  /** Modo rápido (stealth HTTP) — recomendado no Render free. */
  fastMode: boolean;
}

interface AppContextValue {
  // Data
  leads: Lead[];
  isLoading: boolean;
  // API connection
  apiOnline: boolean | null;
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
  // Live search via API
  search: SearchState;
  runSearch: (category: string, city: string, opts: SearchOptions) => Promise<void>;
  isSearching: boolean;
  // Lead actions
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  markContacted: (id: string) => void;
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

const DEFAULT_SEARCH: SearchState = {
  state: 'idle',
  keyword: null,
  jobId: null,
  status: null,
  resultCount: 0,
  error: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
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
  const [search, setSearch] = useState<SearchState>(DEFAULT_SEARCH);
  const searchNonce = useRef(0);

  // Load demo JSON data on first mount (shown until a live search is run)
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

  // Check API connectivity once
  useEffect(() => {
    checkApiStatus()
      .then(setApiOnline)
      .catch(() => setApiOnline(false));
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

  const markContacted = useCallback(
    (id: string) => updateLeadStatus(id, 'contatado'),
    [updateLeadStatus],
  );

  // Run a live search against the deployed backend
  const runSearch = useCallback(async (category: string, city: string, opts: SearchOptions) => {
    const keyword = buildSearchKeyword(category, city);
    if (!keyword) {
      setSearch({ ...DEFAULT_SEARCH, state: 'error', error: 'Informe a categoria e a cidade para buscar.' });
      return;
    }

    const nonce = ++searchNonce.current;
    setSearch({ state: 'running', keyword, jobId: null, status: 'pending', resultCount: 0, error: null });

    try {
      // Modo rápido exige coordenadas do centro da cidade. Se a geocodificação
      // falhar (ou não houver cidade), cai para o modo navegador.
      let fastMode = opts.fastMode;
      let geo: { lat: number; lon: number } | null = null;

      if (fastMode && city.trim()) {
        geo = await geocodeCity(city);
        if (!geo) fastMode = false;
      } else if (fastMode) {
        fastMode = false;
      }

      const job = await createSearchJob({
        name: keyword.slice(0, 60),
        keywords: [keyword],
        lang: 'br',
        zoom: 15,
        depth: opts.depth,
        radius: 10000,
        maxTimeSeconds: opts.maxTimeSeconds,
        fastMode,
        lat: fastMode && geo ? String(geo.lat) : '',
        lon: fastMode && geo ? String(geo.lon) : '',
      });

      if (searchNonce.current !== nonce) return;

      setSearch((prev) => ({ ...prev, jobId: job.id }));

      const finalJob = await pollJob(
        job.id,
        (status) => {
          if (searchNonce.current === nonce) {
            setSearch((prev) => (prev.jobId === job.id ? { ...prev, status } : prev));
          }
        },
        opts.maxTimeSeconds * 1000 + 60000,
        5000,
      );

      if (searchNonce.current !== nonce) return;

      if (finalJob.Status === 'failed') {
        setSearch({
          state: 'error',
          keyword,
          jobId: job.id,
          status: 'failed',
          resultCount: 0,
          error: 'A busca falhou no servidor. Tente novamente com outros termos.',
        });
        return;
      }

      const csv = await downloadJobResults(job.id);
      const rawLeads = parseResultsCsv(csv);
      const processed = processLeads(rawLeads);

      const storedStatuses = loadStatuses();
      const withStatuses = processed.map((lead) => ({
        ...lead,
        status: (storedStatuses[lead.id] as LeadStatus) || 'pendente',
      }));

      setLeads(withStatuses);

      setSearch({
        state: 'success',
        keyword,
        jobId: job.id,
        status: 'ok',
        resultCount: processed.length,
        error: null,
      });
    } catch (err) {
      if (searchNonce.current !== nonce) return;
      const message = err instanceof Error ? err.message : 'Erro inesperado na busca.';
      setSearch({ ...DEFAULT_SEARCH, state: 'error', keyword, error: message });
    }
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

  const isSearching = search.state === 'running';

  return (
    <AppContext.Provider
      value={{
        leads,
        isLoading,
        apiOnline,
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
        search,
        runSearch,
        isSearching,
        updateLeadStatus,
        markContacted,
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