import type { MobileStats } from '../../domain/mobile';
import SurfaceCard from '../layout/SurfaceCard';

interface OrdersStatsCardProps {
  stats: MobileStats;
  onOpenOrders: (title: string, count: number) => void;
}

function MiniStat({ title, value, borderClass }: { title: string; value: number; borderClass: string }) {
  return (
    <div className={`min-w-[120px] flex-shrink-0 rounded-xl bg-[#262c3d] p-3 border-l-4 ${borderClass}`}>
      <p className="mb-2 text-xs text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function OrdersStatsCard({ stats, onOpenOrders }: OrdersStatsCardProps) {
  return (
    <SurfaceCard className="border-gray-800/50 bg-[#1e2330] p-5">
      <h2 className="mb-4 text-lg font-bold text-white">Statistiky objednávek</h2>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#262c3d] p-3 text-center">
          <p className="mb-1 text-xs text-gray-400">Celkem</p>
          <p className="text-xl font-bold text-white">{stats.total.count}</p>
          <p className="mt-1 text-[10px] text-gray-500">{stats.total.value}</p>
        </div>

        <button
          onClick={() => onOpenOrders('Rozpracované', stats.inProgress.count)}
          className="rounded-xl border border-[#d97706]/30 bg-[#d97706]/10 p-3 text-center transition active:scale-95"
          type="button"
        >
          <p className="mb-1 text-xs text-[#d97706]">Rozpracované</p>
          <p className="text-xl font-bold text-[#f59e0b]">{stats.inProgress.count}</p>
          <p className="mt-1 text-[10px] text-[#d97706]/70">{stats.inProgress.value}</p>
        </button>

        <button
          onClick={() => onOpenOrders('Dokončené', stats.completed.count)}
          className="rounded-xl border border-[#059669]/30 bg-[#059669]/10 p-3 text-center transition active:scale-95"
          type="button"
        >
          <p className="mb-1 text-xs text-[#059669]">Dokončené</p>
          <p className="text-xl font-bold text-[#10b981]">{stats.completed.count}</p>
          <p className="mt-1 text-[10px] text-[#059669]/70">{stats.completed.value}</p>
        </button>
      </div>

      <div className="mb-4 h-px w-full bg-gray-700/50" />

      <div className="scrollbar-hide flex space-x-3 overflow-x-auto pb-2">
        <MiniStat title="Ke schválení" value={stats.toApprove} borderClass="border-red-500" />
        <MiniStat title="Schválené" value={stats.approved} borderClass="border-teal-500" />
        <MiniStat title="Moje obj" value={stats.myOrders} borderClass="border-purple-500" />
      </div>
    </SurfaceCard>
  );
}
