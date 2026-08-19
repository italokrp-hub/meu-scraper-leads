import { Users, Smartphone, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
  badge?: string;
  badgeColor?: string;
}

function KpiCard({ icon, label, value, gradient, badge, badgeColor }: KpiCardProps) {
  return (
    <div className={`kpi-card border-white/10 bg-gradient-to-br ${gradient} animate-fade-up`}>
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/5 blur-xl" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            {icon}
          </div>
          {badge && (
            <span className={`badge ${badgeColor}`}>{badge}</span>
          )}
        </div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="mt-1 text-3xl font-black text-white tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </p>
      </div>
    </div>
  );
}

export function KpiSection() {
  const { kpis, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kpi-card border-white/10 skeleton h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const whatsappPct = kpis.total > 0
    ? Math.round((kpis.withWhatsApp / kpis.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        icon={<Users size={20} className="text-violet-400" />}
        label="Total de Leads Encontrados"
        value={kpis.total}
        gradient="from-violet-900/40 to-violet-800/10"
        badge="Total"
        badgeColor="badge-violet"
      />
      <KpiCard
        icon={<Smartphone size={20} className="text-emerald-400" />}
        label="Válidos para WhatsApp"
        value={kpis.withWhatsApp}
        gradient="from-emerald-900/40 to-emerald-800/10"
        badge={`${whatsappPct}%`}
        badgeColor="badge-green"
      />
      <KpiCard
        icon={<CheckCircle2 size={20} className="text-blue-400" />}
        label="Contatados na Sessão"
        value={kpis.contacted}
        gradient="from-blue-900/40 to-blue-800/10"
        badge={kpis.contacted > 0 ? 'Ativo' : 'Nenhum'}
        badgeColor={kpis.contacted > 0 ? 'badge-blue' : 'badge-gray'}
      />
    </div>
  );
}
