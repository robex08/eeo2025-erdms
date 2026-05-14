import { useEffect, useState } from 'react';
import AppFrame from './components/layout/AppFrame';
import type { MobileStats, MobileUser, OrdersCategory } from './domain/mobile';
import { getUserDetail } from './api/auth';
import { getOrderStats } from './api/orders';
import { mockOrders, mockStats, mockUser } from './mock/mobileData';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import OrdersListPage from './pages/OrdersListPage';
import { useAuthStore } from './store';
import { formatCurrency } from './utils/format';

type AppView = 'dashboard' | 'orders';

const mapUserForDashboard = (apiUser: Awaited<ReturnType<typeof getUserDetail>>): MobileUser => {
  const fullName = `${apiUser.jmeno ?? ''} ${apiUser.prijmeni ?? ''}`.trim();
  const roleParts = [apiUser.pozice, apiUser.usek_zkr, apiUser.lokalita].filter(Boolean);

  return {
    name: fullName || apiUser.username,
    email: apiUser.email,
    roles: roleParts.length ? roleParts.join(' | ') : 'Uzivatel',
    phone: apiUser.telefon || '-',
  };
};

const mapStatsForDashboard = (apiStats: Awaited<ReturnType<typeof getOrderStats>>): MobileStats => {
  const inProgressCount =
    (apiStats.schvalena || 0) +
    (apiStats.rozpracovana || 0) +
    (apiStats.odeslana || 0) +
    (apiStats.potvrzena || 0) +
    (apiStats.k_uverejneni_do_registru || 0) +
    (apiStats.uverejnena || 0) +
    (apiStats.fakturace || 0) +
    (apiStats.vecna_spravnost || 0) +
    (apiStats.zkontrolovana || 0);

  return {
    total: {
      count: apiStats.total || 0,
      value: formatCurrency(apiStats.totalAmount || apiStats.total_amount || 0),
    },
    inProgress: {
      count: inProgressCount,
      value: formatCurrency(apiStats.rozpracovaneAmount || 0),
    },
    completed: {
      count: apiStats.dokoncena || 0,
      value: formatCurrency(apiStats.dokoncenaAmount || 0),
    },
    toApprove: apiStats.ke_schvaleni || 0,
    approved: apiStats.schvalena || 0,
    myOrders: apiStats.mojeObjednavky || 0,
  };
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeCategory, setActiveCategory] = useState<OrdersCategory | null>(null);
  const [dashboardUser, setDashboardUser] = useState<MobileUser>(mockUser);
  const [dashboardStats, setDashboardStats] = useState<MobileStats>(mockStats);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const { user, isAuthenticated, isLoading, error, login, logout } = useAuthStore();

  const handleLogin = async (loginId: string, password: string) => {
    await login(loginId, password);
  };

  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    setActiveCategory(null);
  };

  const openOrdersList = (categoryTitle: string, count: number) => {
    setActiveCategory({ title: categoryTitle, count });
    setCurrentView('orders');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboardUser(mockUser);
      setDashboardStats(mockStats);
      setDashboardError(null);
      setDashboardLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError(null);

      try {
        const [apiUser, apiStats] = await Promise.all([getUserDetail(), getOrderStats('current-year')]);
        if (cancelled) {
          return;
        }

        setDashboardUser(mapUserForDashboard(apiUser));
        setDashboardStats(mapStatsForDashboard(apiStats));
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : 'Dashboard API se nepodarilo nacist';
        setDashboardError(message);
        setDashboardUser(user ?? mockUser);
        setDashboardStats(mockStats);
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={error} />;
  }

  return (
    <AppFrame>
      {currentView === 'dashboard' ? (
        <DashboardPage
          user={dashboardUser}
          stats={dashboardStats}
          isLoading={dashboardLoading}
          error={dashboardError}
          onLogout={handleLogout}
          onOpenOrders={openOrdersList}
        />
      ) : (
        <OrdersListPage orders={mockOrders} onBack={() => setCurrentView('dashboard')} category={activeCategory} />
      )}
    </AppFrame>
  );
}
