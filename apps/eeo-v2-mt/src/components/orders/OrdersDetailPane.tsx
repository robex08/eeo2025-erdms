import type { MobileOrder } from '../../domain/mobile';

interface OrdersDetailPaneProps {
  order: MobileOrder | null;
}

export default function OrdersDetailPane({ order }: OrdersDetailPaneProps) {
  if (!order) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-sm text-gray-500">Vyberte objednávku pro zobrazení detailu</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-10">
      <div className="bg-[#93c5fd] px-4 py-2.5 text-[15px] font-bold text-[#111827] shadow-sm">Detail objednávky</div>

      <div className="space-y-4 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Počet položek:</span>
          <span className="font-medium text-white">{order.itemsCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Druh objednávky:</span>
          <span className="font-medium text-white">{order.type}</span>
        </div>

        <div className="mt-2 space-y-0">
          {order.details.map((item, index) => (
            <div key={`${order.id}-detail-${index}`} className="-mx-4 border-y border-gray-700/70 bg-[#1a202c] px-4 py-3">
              <div className="mb-1 flex items-start justify-between">
                <p className="pr-2 text-[15px] font-semibold text-white">{item.name}</p>
                <p className="whitespace-nowrap text-sm text-gray-300">{item.price}</p>
              </div>
              <p className="text-xs text-gray-500">{item.code}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 text-sm">
          <span className="text-gray-400">Celková cena:</span>
          <span className="text-base font-bold text-white">{order.totalAmountCena}</span>
        </div>
      </div>

      <div className="mt-2 bg-[#86efac] px-4 py-2.5 text-[15px] font-bold text-[#111827] shadow-sm">Faktury</div>

      <div className="space-y-4 p-4 pb-8">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Počet faktur:</span>
          <span className="font-medium text-white">{order.invoicesCount}</span>
        </div>

        <div className="mt-2 space-y-0">
          {order.invoices.map((invoice, index) => (
            <div key={`${order.id}-invoice-${index}`} className="-mx-4 border-y border-gray-700/70 bg-[#1a202c] px-4 py-3">
              <div className="mb-1.5 flex items-start justify-between">
                <p className="pr-2 text-[15px] font-bold text-white">{invoice.vs}</p>
                <p className="whitespace-nowrap text-[15px] font-bold text-white">{invoice.price}</p>
              </div>
              <p className="mb-1 text-xs text-gray-500">{invoice.desc}</p>
              <p className="text-xs text-gray-500">{invoice.center}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 text-sm">
          <span className="text-gray-400">Celková částka:</span>
          <span className="text-base font-bold text-white">{order.totalAmountCastka}</span>
        </div>
      </div>
    </div>
  );
}
