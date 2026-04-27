/**
 * Dashboard Page - Modern Mobile-First Design
 * Senior Developer Edition
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import { getOrderStats } from '../api/orders';
import { LogOut, TrendingUp, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import type { OrderStats } from '../types/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: stats, isLoading } = useQuery<OrderStats>({
    queryKey: ['order-stats', 'current-year'],
    queryFn: () => getOrderStats('current-year'),
    staleTime: 1000 * 60 * 5,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const statCards = [
    {
      title: 'Celkem',
      value: stats?.total || 0,
      amount: stats?.totalAmount || 0,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'Rozpracované',
      value: (stats?.rozpracovana || 0) + (stats?.odeslana || 0) + (stats?.potvrzena || 0),
      amount: stats?.rozpracovaneAmount || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      onClick: () => navigate('/orders?status=ROZPRACOVANA'),
    },
    {
      title: 'Dokončené',
      value: stats?.dokoncena || 0,
      amount: stats?.dokoncenaAmount || 0,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-600',
      onClick: () => navigate('/orders?status=DOKONCENA'),
    },
  ];

  const actionCards = [
    {
      title: 'Ke schválení',
      value: stats?.ke_schvaleni || 0,
      icon: AlertCircle,
      color: 'text-blue-400',
      borderColor: 'border-blue-500',
      onClick: () => navigate('/orders?status=KE_SCHVALENI'),
    },
    {
      title: 'Schválené',
      value: stats?.schvalena || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500',
      onClick: () => navigate('/orders?status=SCHVALENA'),
    },
    {
      title: 'Moje obj.',
      value: stats?.mojeObjednavky || 0,
      icon: FileText,
      color: 'text-purple-400',
      borderColor: 'border-purple-500',
      onClick: () => navigate('/orders'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Card */}
      <div className="glass rounded-b-[2rem] p-6 safe-top mb-6 animate-scaleIn">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Vítejte zpět</p>
            <h1 className="text-2xl font-bold text-white">
              {user.jmeno} {user.prijmeni}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-300">{user.email}</p>
          <p className="text-slate-400">
            @{user.username} · {user.pozice || 'Zaměstnanec'}
          </p>
        </div>

        {stats && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Celkem objednávek</span>
              <span className="text-white font-semibold">{stats.total}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-8 space-y-6">
        {/* Section Title */}
        <h2 className="text-lg font-semibold text-white">Přehled</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Main Stats - Large Cards */}
            <div className="grid grid-cols-3 gap-3">
              {statCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={card.onClick}
                    className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 text-left card-shadow hover:card-shadow-lg transition-all active:scale-95 animate-scaleIn`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <Icon className="w-5 h-5 text-white/90 mb-3" />
                    <div className="text-white/80 text-xs mb-1">{card.title}</div>
                    <div className="text-white text-2xl font-bold mb-1">{card.value}</div>
                    <div className="text-white/70 text-xs">
                      {(card.amount / 1000000).toFixed(1)} M Kč
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Cards - Secondary */}
            <div className="grid grid-cols-3 gap-3">
              {actionCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={card.onClick}
                    className={`glass rounded-xl p-4 text-left border-l-4 ${card.borderColor} hover:bg-white/5 transition-all active:scale-95 animate-scaleIn`}
                    style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                  >
                    <Icon className={`w-4 h-4 ${card.color} mb-2`} />
                    <div className="text-slate-400 text-xs mb-1">{card.title}</div>
                    <div className="text-white text-2xl font-bold">{card.value}</div>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 animate-fadeIn" style={{ animationDelay: '600ms' }}>
              <button
                onClick={() => navigate('/orders')}
                className="w-full glass rounded-xl p-4 text-left hover:bg-white/5 transition-all active:scale-98 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium mb-1">Všechny objednávky</div>
                    <div className="text-slate-400 text-sm">
                      Zobrazit kompletní seznam
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-white transition-colors">
                    →
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
