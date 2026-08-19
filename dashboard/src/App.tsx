import { Loader2, Info } from 'lucide-react';
import { Header } from './components/Header/Header';
import { SearchBar } from './components/SearchBar/SearchBar';
import { ControlBar } from './components/ControlBar/ControlBar';
import { KpiSection } from './components/KpiSection/KpiSection';
import { LeadTable } from './components/LeadTable/LeadTable';
import { LeadBoard } from './components/LeadBoard/LeadBoard';
import { ExportModal } from './components/ExportModal/ExportModal';
import { TemplateDrawer } from './components/TemplateDrawer/TemplateDrawer';
import { RawLeadModal } from './components/RawLeadModal/RawLeadModal';
import { useApp } from './context/AppContext';

export function App() {
  const { view, isLoading, filteredLeads, search } = useApp();

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white">
      <Header />
      <main className="mx-auto max-w-screen-2xl space-y-6 px-6 py-8">
        <SearchBar />

        {search.state === 'idle' && !isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-400">
            <Info size={13} className="shrink-0 text-gray-500" />
            <span>
              Exibindo dados de exemplo ({filteredLeads.length.toLocaleString('pt-BR')} leads). Faça
              uma busca acima para obter leads atualizados do Google Maps.
            </span>
          </div>
        )}

        <KpiSection />
        <ControlBar />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-400">
            <Loader2 size={28} className="animate-spin-slow text-emerald-400" />
            <span className="text-sm">Carregando leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-16 text-center animate-fade-up">
            <p className="text-sm text-gray-400">
              Nenhum lead encontrado. Ajuste os filtros ou inicie uma nova busca.
            </p>
          </div>
        ) : view === 'table' ? (
          <LeadTable />
        ) : (
          <LeadBoard />
        )}
      </main>

      <ExportModal />
      <TemplateDrawer />
      <RawLeadModal />
    </div>
  );
}