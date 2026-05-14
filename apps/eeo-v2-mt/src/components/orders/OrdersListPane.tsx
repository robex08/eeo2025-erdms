import type { MobileOrder } from '../../domain/mobile';
import { cn } from '../../utils/cn';

interface OrdersListPaneProps {
  isLoading: boolean;
  orders: MobileOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (order: MobileOrder) => void;
}

export default function OrdersListPane({ isLoading, orders, selectedOrderId, onSelectOrder }: OrdersListPaneProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!orders.length) {
    return <p className="py-8 text-center text-sm text-gray-500">Nenalezeny žádné objednávky.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <button
          key={order.id}
          onClick={() => onSelectOrder(order)}
          type="button"
          className={cn(
            'w-full cursor-pointer rounded-xl border border-gray-800/50 bg-[#1e2330] p-4 text-left shadow-sm transition-colors',
            selectedOrderId === order.id ? 'border-blue-500 bg-[#242b3d]' : 'hover:border-gray-700'
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-bold text-white">{order.id}</h3>
            <span className="whitespace-nowrap font-bold text-white">{order.price}</span>
          </div>

          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">{order.date}</span>
            <span className="font-medium text-blue-300">{order.status}</span>
          </div>

          <p className="mb-4 line-clamp-2 text-sm text-gray-300">{order.title}</p>

          <div className="space-y-1 border-t border-gray-700/50 pt-3 text-xs">
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-gray-500">Objednatel:</span>
              <span className="text-gray-300">{order.requester}</span>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-gray-500">Financování:</span>
              <span className="text-gray-300">{order.finance}</span>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-gray-500">Příkazce:</span>
              <span className="text-gray-300">{order.approver}</span>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {order.badges.map((badge, index) => (
              <span
                key={`${order.id}-badge-${index}`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-2 text-[10px] font-bold text-blue-800"
              >
                {badge}
              </span>
            ))}
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-200 px-2 text-[10px] font-bold text-emerald-800">
              1
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
