import { ArrowLeft, Search } from 'lucide-react';
import type { OrdersCategory } from '../../domain/mobile';

interface OrdersScreenHeaderProps {
  category: OrdersCategory | null;
  totalVisible: number;
  onBack: () => void;
  onSearch: (value: string) => void;
}

export default function OrdersScreenHeader({ category, totalVisible, onBack, onSearch }: OrdersScreenHeaderProps) {
  return (
    <div className="z-10 shrink-0 bg-[#1e3a8a] p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center space-x-3">
          <button onClick={onBack} type="button" className="rounded-full p-1 transition hover:bg-white/10">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="truncate text-lg font-semibold">
            Objednávky: {category?.title ?? 'Vše'} ({totalVisible}/{category?.count ?? 863})
          </h1>
        </div>
        <button type="button" className="rounded-full p-1 transition hover:bg-white/10" onClick={() => onSearch('')}>
          <Search className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
