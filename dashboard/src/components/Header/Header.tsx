import { useApp } from '../../context/AppContext';
import { Sun, Moon, MessageSquare, Download, Wifi, WifiOff, Loader2 } from 'lucide-react';

export function Header() {
  const { theme, toggleTheme, kpis, apiOnline, setTemplateDrawerOpen, setExportModalOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0c14]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-violet-600 shadow-lg shadow-emerald-500/25">
            <span className="text-base font-black text-white">L</span>
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">LeadRadar</span>
            <span className="ml-2 badge badge-violet text-[10px]">Beta</span>
          </div>
        </div>

        {/* Scraper status */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            {apiOnline === null ? (
              <>
                <Loader2 size={14} className="animate-spin-slow text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Verificando API...</span>
              </>
            ) : apiOnline ? (
              <>
                <span className="animate-pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
                <Wifi size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">API Conectada</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <WifiOff size={14} className="text-red-400" />
                <span className="text-xs text-red-400 font-semibold">API Offline</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-xs text-gray-400">Leads no banco:</span>
            <span className="text-sm font-bold text-white">{kpis.total.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-templates"
            onClick={() => setTemplateDrawerOpen(true)}
            className="btn btn-secondary"
            title="Templates WhatsApp"
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            id="btn-open-export"
            onClick={() => setExportModalOpen(true)}
            className="btn btn-primary"
            title="Exportar Leads"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="btn btn-ghost w-9 h-9 p-0 justify-center"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
