import { useState } from 'react';
import { MapPin, Search, Loader2, Wifi, WifiOff, Zap, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const IS_PRODUCTION = import.meta.env.PROD;

const CATEGORY_SUGGESTIONS = [
  'Assistência Técnica de Celular',
  'Assistência Técnica de Notebook',
  'Assistência Técnica de Tablet',
  'Assistência Técnica de Eletrônicos',
  'Loja de Celulares',
  'Loja de Recarga e Acessórios',
  'Compra de Sucata Eletrônica',
  'Reciclagem de Eletrônicos',
];

const DEPTH_OPTIONS = [1, 2, 5, 10, 15];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Enviando busca...',
  working: 'Buscando estabelecimentos no Google Maps...',
  ok: 'Busca concluída. Baixando resultados...',
  failed: 'A busca falhou no servidor.',
};

export function SearchBar() {
  const { runSearch, isSearching, search, apiOnline, isLoading, leads } = useApp();
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [depth, setDepth] = useState(1);
  const [fastMode, setFastMode] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim() && !city.trim()) return;
    // Em produção o modo navegador (Chromium) estoura a RAM do Render — trava
    // o modo rápido para nunca derrubar o servidor.
    const effectiveFastMode = IS_PRODUCTION ? true : fastMode;
    // Buscas profundas demoram mais; o tempo de espera escala com o depth.
    const pollBudgetSeconds = Math.min(60 + depth * 60, 60 * 60);
    void runSearch(category, city, { depth, maxTimeSeconds: pollBudgetSeconds, fastMode: effectiveFastMode });
  }

  const connectionLabel =
    apiOnline === null
      ? 'Verificando conexão...'
      : apiOnline
        ? 'API conectada'
        : 'API offline';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Search size={15} className="text-emerald-400" />
          Nova Busca no Google Maps
        </h2>
        <span className="text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            {apiOnline ? (
              <Wifi size={12} className="text-emerald-400" />
            ) : (
              <WifiOff size={12} className="text-red-400" />
            )}
            {connectionLabel}
          </span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-gray-400" htmlFor="search-category">
            Categoria
          </label>
          <input
            id="search-category"
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Assistência Técnica de Celular"
            disabled={isSearching}
            className="input"
          />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-gray-400" htmlFor="search-city">
            Cidade / Região
          </label>
          <div className="relative">
            <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="search-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex.: Fortaleza, CE"
              disabled={isSearching}
              className="input pl-9"
            />
          </div>
        </div>

        <div className="w-full lg:w-44">
          <label className="mb-1.5 block text-xs font-semibold text-gray-400" htmlFor="search-depth">
            Profundidade (páginas)
          </label>
          <select
            id="search-depth"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            disabled={isSearching}
            className="input appearance-none"
          >
            {DEPTH_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d >= 15 ? `Profunda (${d} páginas)` : `${d} ${d === 1 ? 'página' : 'páginas'}`}
              </option>
            ))}
          </select>
        </div>

        <label
          className="flex cursor-pointer items-center gap-1.5 self-end rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
          title={
            IS_PRODUCTION
              ? 'No Render o modo navegador estoura a RAM (OOM). O modo rápido é obrigatório em produção.'
              : 'Modo rápido usa HTTP stealth (sem Chromium), ideal para o plano gratuito do Render (512MB).'
          }
        >
          <input
            type="checkbox"
            checked={fastMode}
            onChange={(e) => {
              if (IS_PRODUCTION && !e.target.checked) {
                alert('Modo navegador está bloqueado em produção: ele derruba o servidor do Render (limite de 512 MB). O modo rápido é obrigatório.');
                setFastMode(true);
                return;
              }
              setFastMode(e.target.checked);
            }}
            disabled={isSearching}
            className="accent-emerald-500"
          />
          {IS_PRODUCTION ? <Lock size={13} className="text-emerald-400" /> : <Zap size={13} className="text-emerald-400" />}
          {IS_PRODUCTION ? 'Modo rápido (obrigatório)' : 'Modo rápido'}
        </label>

        <button
          type="submit"
          disabled={isSearching || (apiOnline === false && search.state !== 'success')}
          className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSearching ? <Loader2 size={15} className="animate-spin-slow" /> : <Search size={15} />}
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      <p className="mt-2 text-[11px] text-gray-500">
        A busca é enviada ao backend já formatada como “Categoria em Cidade” para priorizar
        resultados no Brasil. Ex.: “{category.trim() || 'Assistência Técnica de Celular'} em{' '}
        {city.trim() || 'Fortaleza, CE'}”.{' '}
        {IS_PRODUCTION || fastMode
          ? 'No modo rápido, a cidade é convertida em coordenadas e a região é varrida em grade para capturar todos os estabelecimentos sem navegador (recomendado).'
          : 'Sem o modo rápido, a busca abre um navegador no servidor — cuidado com o limite de memória do Render.'}
      </p>

      {/* Search progress / result summary */}
      {isSearching && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <Loader2 size={14} className="animate-spin-slow shrink-0" />
          <span className="truncate">
            {search.keyword}
            {search.status ? ` · ${STATUS_LABELS[search.status] ?? search.status}` : ''}
          </span>
        </div>
      )}

      {!isSearching && search.state === 'success' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <span className="font-semibold">{search.resultCount.toLocaleString('pt-BR')} leads</span>
          <span className="text-emerald-400/70">encontrados para</span>
          <span className="truncate font-medium">{search.keyword}</span>
        </div>
      )}

      {!isSearching && search.state === 'error' && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span className="font-semibold">Erro na busca: </span>
          {search.error}
          {apiOnline === false && (
            <span className="mt-1 block text-xs text-red-400/70">
              Não foi possível conectar à API em https://meu-scraper-leads.onrender.com. Verifique se o backend está no ar.
            </span>
          )}
        </div>
      )}

      {!isSearching && search.state === 'idle' && !isLoading && leads.length === 0 && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Nenhum dado carregado. Realize uma busca para encontrar leads.
        </div>
      )}
    </div>
  );
}