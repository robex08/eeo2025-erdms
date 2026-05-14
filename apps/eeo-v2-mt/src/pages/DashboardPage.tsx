import OrdersStatsCard from '../components/dashboard/OrdersStatsCard';
import ProfileSummaryCard from '../components/dashboard/ProfileSummaryCard';
import SurfaceCard from '../components/layout/SurfaceCard';
import type { MobileUser, MobileStats } from '../domain/mobile';

interface DashboardPageProps {
  user: MobileUser;
  stats: MobileStats;
  isLoading?: boolean;
  error?: string | null;
  onLogout: () => void;
  onOpenOrders: (categoryTitle: string, count: number) => void;
}

export default function DashboardPage({ user, stats, isLoading = false, error = null, onLogout, onOpenOrders }: DashboardPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-[fade-up_300ms_ease-out]">
      {isLoading ? (
        <SurfaceCard className="border-blue-500/20 bg-[#162857] px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-blue-100">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300/40 border-t-blue-200" />
            Nacitani dashboard dat z API...
          </div>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard className="border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">Nepodarilo se nacist dashboard z API: {error}</p>
        </SurfaceCard>
      ) : null}

      <ProfileSummaryCard user={user} stats={stats} onLogout={onLogout} />
      <OrdersStatsCard stats={stats} onOpenOrders={onOpenOrders} />

      <SurfaceCard className="border-gray-800/50 bg-[#1e2330] px-4 py-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-300">Uvodni stranka dashboard</p>
            <p className="text-xs text-slate-500">Rychly vstup do seznamu objednavek a detailu.</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenOrders('Vsechny objednavky', stats.total.count)}
            className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20"
          >
            Otevrit objednavky
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}
