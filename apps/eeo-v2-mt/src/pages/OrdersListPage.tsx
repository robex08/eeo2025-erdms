/**
 * Orders List Page - Modern Design
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrdersList } from '../api/orders';
import { formatCurrency, formatDate } from '../utils';
import { ArrowLeft, Search, Package, Building2, User } from 'lucide-react';
import OrderDetailSheet from '../components/orders/OrderDetailSheet';
import type { OrderStatus } from '../types/api';

export default function OrdersListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as OrderStatus) || 'all';

  const [selectedStatus] = useState<OrderStatus | 'all'>(initialStatus);
  const [searchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders-list', selectedStatus, searchQuery],
    queryFn: () => getOrdersList({
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      search: searchQuery || undefined,
    }),
    staleTime: 1000 * 60,
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NOVA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      ROZPRACOVANA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      KE_SCHVALENI: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      ODESLANA_KE_SCHVALENI: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      SCHVALENA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      DOKONCENA: 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="glass rounded-b-[2rem] p-4 safe-top mb-4 animate-scaleIn">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white flex-1">Objednávky</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Hledat objednávku..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Žádné objednávky</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((order, idx) => (
              <button
                key={order.id}
                onClick={() => handleOrderClick(order.id)}
                className="w-full glass rounded-xl p-4 text-left hover:bg-white/5 transition-all active:scale-98 animate-scaleIn"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {order.cislo_objednavky}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {formatDate(order.dt_vytvoreno)}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.stav_workflow_kod)}`}>
                    {order.stav_workflow_nazev}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-3">
                  {order.dodavatel_nazev && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">{order.dodavatel_nazev}</span>
                    </div>
                  )}
                  {(order.objednatel_jmeno || order.garant_jmeno) && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">
                        {order.objednatel_jmeno ? `${order.objednatel_jmeno} ${order.objednatel_prijmeni || ''}` :
                         order.garant_jmeno ? `${order.garant_jmeno} ${order.garant_prijmeni || ''}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <div className="text-slate-400 text-sm">
                    {order.pocet_polozek} položek · {order.pocet_faktur} faktur
                  </div>
                  <div className="text-white font-semibold">
                    {formatCurrency(order.celkova_castka)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      {selectedOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
