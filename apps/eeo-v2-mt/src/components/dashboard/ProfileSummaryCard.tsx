import { Power, Sun } from 'lucide-react';
import type { MobileStats, MobileUser } from '../../domain/mobile';
import IconActionButton from '../layout/IconActionButton';
import SurfaceCard from '../layout/SurfaceCard';

interface ProfileSummaryCardProps {
  user: MobileUser;
  stats: MobileStats;
  onLogout: () => void;
}

export default function ProfileSummaryCard({ user, stats, onLogout }: ProfileSummaryCardProps) {
  return (
    <SurfaceCard className="border-gray-800/50 bg-[#1e2330] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">Vítejte</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
        </div>
        <div className="flex space-x-3">
          <IconActionButton aria-label="Světlý režim" type="button" className="h-9 w-9 bg-[#2a3040]">
            <Sun className="h-5 w-5 text-slate-300" />
          </IconActionButton>
          <IconActionButton aria-label="Odhlásit" onClick={onLogout} type="button" danger className="h-9 w-9 bg-[#2a3040]">
            <Power className="h-5 w-5 text-slate-300" />
          </IconActionButton>
        </div>
      </div>

      <div className="mt-2 border-t border-gray-700/50 pt-4 text-sm">
        <div className="space-y-1 text-left">
          <p className="text-gray-300">{user.email}</p>
          <p className="text-xs text-gray-500">{user.roles}</p>
        </div>
        <div className="mt-3 text-right">
          <p className="font-semibold text-white">Celkem: {stats.total.count} obj</p>
          <p className="text-xs text-gray-400">{stats.total.value}</p>
          <p className="mt-1 text-xs text-gray-400">Telefon: {user.phone}</p>
        </div>
      </div>
    </SurfaceCard>
  );
}
