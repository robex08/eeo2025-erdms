import { useEffect, useMemo, useState } from 'react';
import OrdersDetailPane from '../components/orders/OrdersDetailPane';
import OrdersListPane from '../components/orders/OrdersListPane';
import OrdersScreenHeader from '../components/orders/OrdersScreenHeader';
import type { MobileOrder, OrdersCategory } from '../domain/mobile';

interface OrdersListPageProps {
  orders: MobileOrder[];
  onBack: () => void;
  category: OrdersCategory | null;
}

export default function OrdersListPage({ orders, onBack, category }: OrdersListPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<MobileOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const visibleOrders = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return orders;
    }

    return orders.filter((order) => {
      return [order.id, order.title, order.requester, order.approver, order.finance].join(' ').toLowerCase().includes(needle);
    });
  }, [orders, searchText]);

  // Simulace načtení dat
  useEffect(() => {
    setIsLoading(true);
    setSelectedOrder(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [category, orders]);

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-2rem)] max-h-[920px] max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-800/60 bg-[#111216] shadow-[0_20px_70px_rgba(0,0,0,0.45)] animate-[fade-up_320ms_ease-out]">
      <OrdersScreenHeader
        category={category}
        totalVisible={visibleOrders.length}
        onBack={onBack}
        onSearch={(value) => setSearchText(value)}
      />

      <div className="border-b border-blue-900/40 bg-[#162857] px-4 py-2">
        <input
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Hledat objednavky, objednatele nebo financovani"
          className="w-full rounded-lg border border-blue-300/20 bg-[#0f1f47] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-300/60 focus:outline-none"
        />
      </div>

      <div className={`flex-1 overflow-y-auto p-3 transition-all duration-300 ${selectedOrder ? 'h-[45vh] pb-32' : 'h-full'}`}>
        <OrdersListPane
          isLoading={isLoading}
          orders={visibleOrders}
          selectedOrderId={selectedOrder?.id ?? null}
          onSelectOrder={setSelectedOrder}
        />
      </div>

      <div className="z-20 shrink-0 border-y border-gray-800 bg-[#111216] py-2 text-center text-xs text-gray-500 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
        Zobrazeno {visibleOrders.length} z {category?.count ?? 863}
      </div>

      <div
        className={`w-full shrink-0 bg-[#111216] transition-all duration-300 ease-in-out ${selectedOrder ? 'h-[50vh] border-t border-gray-800' : 'h-24 justify-center items-center'}`}
      >
        <OrdersDetailPane order={selectedOrder} />
      </div>
    </div>
  );
}
