import { Search, Filter, LayoutGrid, Table2, X, FileText, FileJson } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { LeadStatus } from '../../types/lead';
import { exportLeads, ALL_COLUMNS } from '../../utils/exportUtils';

const STATUS_OPTIONS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'sem_resposta', label: 'Sem Resposta' },
];

export function ControlBar() {
  const {
    view, setView,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    cityFilter, setCityFilter,
    statusFilter, setStatusFilter,
    filteredLeads,
    categories,
    cities,
  } = useApp();

  const hasActiveFilters = searchQuery || categoryFilter || cityFilter || statusFilter !== 'all';

  function clearFilters() {
    setSearchQuery('');
    setCategoryFilter('');
    setCityFilter('');
    setStatusFilter('all');
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            id="input-search"
            type="text"
            placeholder="Buscar por nome ou bairro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            id="select-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input pl-9 pr-8 min-w-[180px] appearance-none"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* City filter */}
        <select
          id="select-city"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="input pr-8 min-w-[150px] appearance-none"
        >
          <option value="">Todas as Cidades</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          id="select-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
          className="input pr-8 min-w-[160px] appearance-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            id="btn-clear-filters"
            onClick={clearFilters}
            className="btn btn-ghost gap-1 text-red-400 hover:text-red-300"
          >
            <X size={14} />
            Limpar
          </button>
        )}

        {/* Results count */}
        <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">
          {filteredLeads.length.toLocaleString('pt-BR')} resultados
        </span>

        {filteredLeads.length > 0 && (
          <div className="flex items-center gap-1.5" title="Baixar lista filtrada">
            <button
              onClick={() => exportLeads(filteredLeads, { format: 'csv', filter: 'all', columns: ALL_COLUMNS })}
              className="btn btn-secondary px-3 py-1.5 text-xs"
              title="Baixar filtrados em CSV"
            >
              <FileText size={13} /> CSV
            </button>
            <button
              onClick={() => exportLeads(filteredLeads, { format: 'json', filter: 'all', columns: ALL_COLUMNS })}
              className="btn btn-secondary px-3 py-1.5 text-xs"
              title="Baixar filtrados em JSON"
            >
              <FileJson size={13} /> JSON
            </button>
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            id="btn-view-table"
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              view === 'table'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Table2 size={13} /> Tabela
          </button>
          <button
            id="btn-view-kanban"
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              view === 'kanban'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={13} /> Cards
          </button>
        </div>
      </div>
    </div>
  );
}
