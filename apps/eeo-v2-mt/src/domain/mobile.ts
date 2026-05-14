export interface MobileUser {
  name: string;
  email: string;
  roles: string;
  phone: string;
}

export interface StatBox {
  count: number;
  value: string;
}

export interface MobileStats {
  total: StatBox;
  inProgress: StatBox;
  completed: StatBox;
  toApprove: number;
  approved: number;
  myOrders: number;
}

export interface OrderDetailItem {
  name: string;
  code: string;
  price: string;
}

export interface OrderInvoice {
  vs: string;
  desc: string;
  center: string;
  price: string;
}

export interface MobileOrder {
  id: string;
  date: string;
  title: string;
  price: string;
  status: string;
  requester: string;
  finance: string;
  approver: string;
  badges: number[];
  supplier: {
    name: string;
    ico: string;
  };
  garant: string;
  created: string;
  itemsCount: number;
  type: string;
  details: OrderDetailItem[];
  invoicesCount: number;
  invoices: OrderInvoice[];
  totalAmountCena: string;
  totalAmountCastka: string;
}

export interface OrdersCategory {
  title: string;
  count: number;
}

export interface LoginPageProps {
  onLogin: () => void;
}

export interface DashboardPageProps {
  onLogout: () => void;
  onOpenOrders: (categoryTitle: string, count: number) => void;
}

export interface OrdersListPageProps {
  onBack: () => void;
  category: OrdersCategory | null;
}
