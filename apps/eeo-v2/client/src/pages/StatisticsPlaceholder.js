import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faChartPie,
  faUsers,
  faBuilding,
  faTachometerAlt,
  faMoneyBillWave,
  faShoppingCart,
  faCalendarAlt,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title as ChartTitle } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ProgressContext } from '../context/ProgressContext';
import { listOrdersV2 } from '../services/apiOrderV2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle, ChartDataLabels);

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 2rem 1rem;
`;

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PageTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #2563eb;
  }
`;

const RefreshButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #f9fafb;
    border-color: #2563eb;
    color: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  flex: 1;
  min-width: 150px;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' : '#f3f4f6'};
    color: ${props => props.active ? 'white' : '#1f2937'};
  }
`;

const ContentArea = styled.div`
  min-height: 400px;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const KPICard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => props.color || '#2563eb'};
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const KPIHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const KPIIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: ${props => props.bg || '#eff6ff'};
  color: ${props => props.color || '#2563eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
`;

const KPILabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const KPIValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const KPISubtext = styled.div`
  font-size: 0.875rem;
  color: #9ca3af;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ChartTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #2563eb;
  }
`;

const ChartWrapper = styled.div`
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #6b7280;
  gap: 1rem;

  svg {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #9ca3af;
  gap: 0.5rem;
  text-align: center;
  padding: 2rem;

  svg {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getUserKey = (userDetail, suffix) => {
  const userId = userDetail?.uzivatel_id || userDetail?.id || 'unknown';
  return `statistics_${suffix}_user_${userId}`;
};

const getUserStorage = (userDetail, key) => {
  try {
    const stored = localStorage.getItem(getUserKey(userDetail, key));
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

const setUserStorage = (userDetail, key, value) => {
  try {
    localStorage.setItem(getUserKey(userDetail, key), JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StatisticsPage = () => {
  const { token, username, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { setProgress } = useContext(ProgressContext);

  // TAB state (localStorage per user)
  const [activeTab, setActiveTab] = useState(() => {
    return getUserStorage(userDetail, 'activeTab') || 'overview';
  });

  // Data state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load orders on mount
  useEffect(() => {
    loadOrdersData();
  }, []);

  // Save activeTab to localStorage per user
  useEffect(() => {
    setUserStorage(userDetail, 'activeTab', activeTab);
  }, [activeTab, userDetail]);

  const loadOrdersData = async () => {
    if (!token || !username) return;

    setLoading(true);
    setProgress(30);

    try {
      const response = await listOrdersV2({
        token,
        username,
        filters: {
          archivovano: false // Pouze nearchivované objednávky
        }
      });

      setProgress(70);

      if (response.status === 'ok' && Array.isArray(response.data)) {
        setOrders(response.data);
        setLastUpdated(new Date());
      } else {
        showToast('Chyba při načítání dat objednávek', 'error');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Chyba při načítání dat: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  // =============================================================================
  // STATISTICS CALCULATIONS
  // =============================================================================

  const statistics = useMemo(() => {
    if (!orders.length) {
      return {
        totalOrders: 0,
        totalAmount: 0,
        avgAmount: 0,
        uniqueSuppliers: 0,
        topUsers: [],
        topSuppliers: []
      };
    }

    // Total orders
    const totalOrders = orders.length;

    // Total amount
    const totalAmount = orders.reduce((sum, order) => {
      const amount = parseFloat(order.max_cena_s_dph || order.cena_s_dph || 0);
      return sum + amount;
    }, 0);

    // Average amount
    const avgAmount = totalOrders > 0 ? totalAmount / totalOrders : 0;

    // Unique suppliers
    const suppliersSet = new Set();
    orders.forEach(order => {
      if (order.dodavatel_nazev) {
        suppliersSet.add(order.dodavatel_nazev);
      }
    });
    const uniqueSuppliers = suppliersSet.size;

    // Group by user (creator)
    const userOrdersMap = {};
    orders.forEach(order => {
      const userName = order.uzivatel_cely_jmeno || order.uzivatel_jmeno || 'Neznámý';
      if (!userOrdersMap[userName]) {
        userOrdersMap[userName] = { count: 0, amount: 0 };
      }
      userOrdersMap[userName].count += 1;
      userOrdersMap[userName].amount += parseFloat(order.max_cena_s_dph || order.cena_s_dph || 0);
    });

    // Sort users by count and take top 5
    const sortedUsers = Object.entries(userOrdersMap)
      .map(([name, data]) => ({ name, count: data.count, amount: data.amount }))
      .sort((a, b) => b.count - a.count);

    const top5Users = sortedUsers.slice(0, 5);
    const othersUsersCount = sortedUsers.slice(5).reduce((sum, u) => sum + u.count, 0);
    const topUsers = othersUsersCount > 0 
      ? [...top5Users, { name: 'Ostatní', count: othersUsersCount, amount: 0 }]
      : top5Users;

    // Group by supplier
    const supplierOrdersMap = {};
    orders.forEach(order => {
      const supplierName = order.dodavatel_nazev || 'Neuvedeno';
      if (!supplierOrdersMap[supplierName]) {
        supplierOrdersMap[supplierName] = { count: 0, amount: 0 };
      }
      supplierOrdersMap[supplierName].count += 1;
      supplierOrdersMap[supplierName].amount += parseFloat(order.max_cena_s_dph || order.cena_s_dph || 0);
    });

    // Sort suppliers by count and take top 5
    const sortedSuppliers = Object.entries(supplierOrdersMap)
      .map(([name, data]) => ({ name, count: data.count, amount: data.amount }))
      .sort((a, b) => b.count - a.count);

    const top5Suppliers = sortedSuppliers.slice(0, 5);
    const othersSuppliersCount = sortedSuppliers.slice(5).reduce((sum, s) => sum + s.count, 0);
    const topSuppliers = othersSuppliersCount > 0
      ? [...top5Suppliers, { name: 'Ostatní', count: othersSuppliersCount, amount: 0 }]
      : top5Suppliers;

    return {
      totalOrders,
      totalAmount,
      avgAmount,
      uniqueSuppliers,
      topUsers,
      topSuppliers
    };
  }, [orders]);

  // =============================================================================
  // CHART DATA
  // =============================================================================

  const userChartData = useMemo(() => {
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#9ca3af'];
    
    return {
      labels: statistics.topUsers.map(u => u.name),
      datasets: [{
        data: statistics.topUsers.map(u => u.count),
        backgroundColor: colors.slice(0, statistics.topUsers.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [statistics.topUsers]);

  const supplierChartData = useMemo(() => {
    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#9ca3af'];
    
    return {
      labels: statistics.topSuppliers.map(s => s.name),
      datasets: [{
        data: statistics.topSuppliers.map(s => s.count),
        backgroundColor: colors.slice(0, statistics.topSuppliers.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [statistics.topSuppliers]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: (context) => {
          const value = context.dataset.data[context.dataIndex];
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = (value / total) * 100;
          return percentage >= 5; // Show label only if >= 5%
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%`;
        },
        color: '#fff',
        font: { weight: 'bold', size: 13 }
      }
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const renderOverviewTab = () => (
    <>
      <KPIGrid>
        <KPICard color="#2563eb">
          <KPIHeader>
            <KPILabel>Celkem objednávek</KPILabel>
            <KPIIcon bg="#eff6ff" color="#2563eb">
              <FontAwesomeIcon icon={faShoppingCart} />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{statistics.totalOrders.toLocaleString('cs-CZ')}</KPIValue>
          <KPISubtext>Nearchivované objednávky</KPISubtext>
        </KPICard>

        <KPICard color="#10b981">
          <KPIHeader>
            <KPILabel>Celková hodnota</KPILabel>
            <KPIIcon bg="#d1fae5" color="#10b981">
              <FontAwesomeIcon icon={faMoneyBillWave} />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{(statistics.totalAmount / 1000000).toFixed(2)} M</KPIValue>
          <KPISubtext>{statistics.totalAmount.toLocaleString('cs-CZ')} Kč</KPISubtext>
        </KPICard>

        <KPICard color="#f59e0b">
          <KPIHeader>
            <KPILabel>Průměrná hodnota</KPILabel>
            <KPIIcon bg="#fef3c7" color="#f59e0b">
              <FontAwesomeIcon icon={faTachometerAlt} />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{(statistics.avgAmount / 1000).toFixed(1)} K</KPIValue>
          <KPISubtext>{statistics.avgAmount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč</KPISubtext>
        </KPICard>

        <KPICard color="#8b5cf6">
          <KPIHeader>
            <KPILabel>Dodavatelé</KPILabel>
            <KPIIcon bg="#ede9fe" color="#8b5cf6">
              <FontAwesomeIcon icon={faBuilding} />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{statistics.uniqueSuppliers}</KPIValue>
          <KPISubtext>Unikátních dodavatelů</KPISubtext>
        </KPICard>
      </KPIGrid>

      <ChartsGrid>
        <ChartCard>
          <ChartTitle>
            <FontAwesomeIcon icon={faUsers} />
            Top uživatelé podle počtu objednávek
          </ChartTitle>
          <ChartWrapper>
            {statistics.topUsers.length > 0 ? (
              <Pie data={userChartData} options={chartOptions} />
            ) : (
              <EmptyState>
                <FontAwesomeIcon icon={faUsers} />
                <div>Žádná data k zobrazení</div>
              </EmptyState>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>
            <FontAwesomeIcon icon={faBuilding} />
            Top dodavatelé podle počtu objednávek
          </ChartTitle>
          <ChartWrapper>
            {statistics.topSuppliers.length > 0 ? (
              <Pie data={supplierChartData} options={chartOptions} />
            ) : (
              <EmptyState>
                <FontAwesomeIcon icon={faBuilding} />
                <div>Žádná data k zobrazení</div>
              </EmptyState>
            )}
          </ChartWrapper>
        </ChartCard>
      </ChartsGrid>
    </>
  );

  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <PageTitle>
              <FontAwesomeIcon icon={faChartLine} />
              Statistiky
            </PageTitle>
          </HeaderLeft>
          <RefreshButton onClick={loadOrdersData} disabled={loading}>
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            Obnovit data
          </RefreshButton>
        </PageHeader>

        <TabsContainer>
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            <FontAwesomeIcon icon={faTachometerAlt} />
            Přehled
          </TabButton>
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
          >
            <FontAwesomeIcon icon={faUsers} />
            Uživatelé
          </TabButton>
          <TabButton
            active={activeTab === 'suppliers'}
            onClick={() => setActiveTab('suppliers')}
          >
            <FontAwesomeIcon icon={faBuilding} />
            Dodavatelé
          </TabButton>
        </TabsContainer>

        <ContentArea>
          {loading ? (
            <LoadingSpinner>
              <FontAwesomeIcon icon={faSyncAlt} spin />
              <div>Načítám data...</div>
            </LoadingSpinner>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'users' && renderOverviewTab()}
              {activeTab === 'suppliers' && renderOverviewTab()}
            </>
          )}
        </ContentArea>

        {lastUpdated && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faCalendarAlt} /> Poslední aktualizace: {lastUpdated.toLocaleString('cs-CZ')}
          </div>
        )}
      </PageContainer>
    </PageWrapper>
  );
};

export default StatisticsPage;
