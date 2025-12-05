import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faChartPie,
  faChartBar,
  faUsers,
  faBuilding,
  faTachometerAlt,
  faMoneyBillWave,
  faShoppingCart,
  faCalendarAlt,
  faSyncAlt,
  faDownload,
  faCheckCircle,
  faExpand,
  faCompress,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { listOrdersV2 } from '../services/apiOrderV2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: transparent;
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

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
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

const ExportButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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
  min-height: 48px;
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const KPIValueSmall = styled.span`
  font-size: 1.5rem;
  font-weight: 600;
  color: #10b981;
  line-height: 2rem;
  display: inline-flex;
  align-items: center;
`;

const KPIValueColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  &:last-child {
    align-items: flex-end;
  }
`;

const KPIValueNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.color || '#1f2937'};
`;

const KPIValueLabel = styled.div`
  font-size: 0.875rem;
  color: #9ca3af;
  font-weight: 400;
`;

const KPISubtext = styled.div`
  font-size: 0.875rem;
  color: #9ca3af;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;

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

const BarChartCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
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

const ChartTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    border-radius: 28px;
    transition: all 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
  }

  input:checked + span {
    background-color: #3b82f6;
  }

  input:checked + span::before {
    transform: translateX(28px);
  }

  input:focus + span {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ArchiveToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
  color: #6b7280;
`;

const ChartWrapper = styled.div`
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChartTitleWithFullscreen = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 1.1rem;

  &:hover {
    color: #2563eb;
    background: #f3f4f6;
  }
`;

const FullscreenModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const FullscreenContent = styled.div`
  background: white;
  border-radius: 12px;
  width: ${props => props.isBar ? '95vw' : '90vw'};
  height: ${props => props.isBar ? '75vh' : '85vh'};
  max-width: ${props => props.isBar ? '1600px' : '1200px'};
  padding: 2rem;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const FullscreenHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 1rem;
`;

const FullscreenTitle = styled.h2`
  font-size: 1.75rem;
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

const CloseButton = styled.button`
  background: #ef4444;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 50%;
  transition: all 0.2s;
  font-size: 1.2rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #dc2626;
    transform: scale(1.05);
  }
`;

const FullscreenChartWrapper = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
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

const StatsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  tbody tr {
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
      background: #f9fafb;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transform: scale(1.005);
    }
  }
`;

const StatsTableHeader = styled.th`
  text-align: ${props => props.align || 'left'};
  padding: 0.75rem 1rem;
  background: #f9fafb;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
`;

const StatsTableCell = styled.td`
  text-align: ${props => props.align || 'left'};
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  font-size: 0.9375rem;

  strong {
    color: #1f2937;
    font-weight: 600;
  }
`;

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.875rem;
  background: ${props => {
    if (props.rank === 1) return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    if (props.rank === 2) return 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)';
    if (props.rank === 3) return 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)';
    return '#f3f4f6';
  }};
  color: ${props => props.rank <= 3 ? 'white' : '#6b7280'};
  box-shadow: ${props => props.rank <= 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};
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
  const { setProgress } = useContext(ProgressContext);

  // TAB state (localStorage per user)
  const [activeTab, setActiveTab] = useState(() => {
    return getUserStorage(userDetail, 'activeTab') || 'overview';
  });

  // Data state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(() => {
    return getUserStorage(userDetail, 'includeArchived') || false;
  });
  const [fullscreenChart, setFullscreenChart] = useState(null);

  // Fullscreen handlers
  const openFullscreen = useCallback((chartData) => {
    setFullscreenChart(chartData);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenChart(null);
  }, []);

  // ESC key listener for closing fullscreen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && fullscreenChart) {
        closeFullscreen();
      }
    };

    if (fullscreenChart) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenChart, closeFullscreen]);

  // Load orders on mount
  useEffect(() => {
    loadOrdersData();
  }, []);

  // Reload when includeArchived changes
  useEffect(() => {
    if (orders.length > 0) { // Only reload if we already have data
      loadOrdersData();
    }
  }, [includeArchived]);

  // Save activeTab to localStorage per user
  useEffect(() => {
    setUserStorage(userDetail, 'activeTab', activeTab);
  }, [activeTab, userDetail]);

  // Save includeArchived to localStorage per user
  useEffect(() => {
    setUserStorage(userDetail, 'includeArchived', includeArchived);
  }, [includeArchived, userDetail]);

  // Export to CSV function
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      return;
    }

    // Create CSV header
    const headers = ['Pořadí', 'Název', 'Počet objednávek', 'Celková částka (Kč)', 'Průměrná částka (Kč)'];
    
    // Create CSV rows
    const rows = data.map((item, index) => [
      index + 1,
      item.name,
      item.count,
      item.amount.toFixed(2),
      item.avgAmount.toFixed(2)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeTab === 'users') {
      exportToCSV(fullUserStats, 'statistiky_uzivatelu');
    } else if (activeTab === 'suppliers') {
      exportToCSV(fullSupplierStats, 'statistiky_dodavatelu');
    } else {
      // Export overview data
      const overviewData = [
        { name: 'Celkem objednávek', count: statistics.totalOrders, amount: statistics.totalAmount, avgAmount: statistics.avgAmount },
        { name: 'Počet dodavatelů', count: statistics.uniqueSuppliers, amount: 0, avgAmount: 0 }
      ];
      exportToCSV(overviewData, 'statistiky_prehled');
    }
  };

  const loadOrdersData = async () => {
    if (!token || !username) return;

    setLoading(true);
    setProgress(30);

    try {
      // Načteme data pro celý aktuální rok (jako Orders25List)
      const currentYear = new Date().getFullYear();
      const datum_od = `${currentYear}-01-01`;
      const datum_do = `${currentYear}-12-31`;

      const archiveStatus = includeArchived ? 'i archivované' : 'nearchivované';

      // Správná signatura: listOrdersV2(filters, token, username, returnFullResponse, enriched)
      const filters = {
        datum_od,           // Od 1.1. aktuálního roku
        datum_do            // Do 31.12. aktuálního roku
      };

      // Podle Orders25List: archivovano: 1 pro archivované, jinak neposíláme filtr
      if (includeArchived) {
        filters.archivovano = 1; // Načte i archivované (stejně jako Orders25List)
      }
      // Pokud NEchceme archivované, NEPŘIDÁVÁME filtr (BE defaultně vrací jen aktivní)

      const ordersData = await listOrdersV2(filters, token, username, false, true);

      setProgress(70);

      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading orders:', error);
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
        completedCount: 0,
        topUsers: [],
        topSuppliers: [],
        monthlyData: Array(12).fill(0),
        workflowStatusMap: {},
        publicationStats: {
          zverejneno: 0,
          maBytZverejneno: 0,
          nezverejneno: 0
        }
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

    // Group by user (creator) - používá enriched API strukturu
    const userOrdersMap = {};
    orders.forEach(order => {
      // Enriched API: order.uzivatel.cele_jmeno
      const userName = order.uzivatel?.cele_jmeno || 
                       order.uzivatel_cely_jmeno || 
                       `${order.uzivatel?.jmeno || ''} ${order.uzivatel?.prijmeni || ''}`.trim() ||
                       'Neznámý';
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

    // Completed orders count - kontrola stav_workflow_kod (jako OrderForm25)
    let completedCount = 0;
    orders.forEach(order => {
      // Parsuj stav_workflow_kod (může být string nebo array)
      let states = [];
      if (order.stav_workflow_kod) {
        if (typeof order.stav_workflow_kod === 'string') {
          try {
            states = JSON.parse(order.stav_workflow_kod);
          } catch (e) {
            states = [];
          }
        } else if (Array.isArray(order.stav_workflow_kod)) {
          states = order.stav_workflow_kod;
        }
      }
      
      // Objednávka je dokončená pokud má stav DOKONCENA
      if (states.includes('DOKONCENA')) {
        completedCount++;
      }
    });

    // Monthly distribution - používá dt_vytvoreni
    const monthlyData = Array(12).fill(0);
    let processedCount = 0;
    orders.forEach(order => {
      // dt_vytvoreni je primární datum, fallback na dt_objednavky
      const dateStr = order.dt_vytvoreni || order.dt_objednavky;
      if (dateStr) {
        const orderDate = new Date(dateStr);
        const month = orderDate.getMonth(); // 0-11
        monthlyData[month] += 1;
        processedCount++;
      }
    });

    // Workflow Status Statistics (bez ARCHIVOVANO)
    const workflowStatusMap = {};
    orders.forEach(order => {
      let states = [];
      if (order.stav_workflow_kod) {
        try {
          states = typeof order.stav_workflow_kod === 'string' 
            ? JSON.parse(order.stav_workflow_kod) 
            : order.stav_workflow_kod;
          
          if (!Array.isArray(states)) {
            states = [order.stav_workflow_kod];
          }
        } catch (e) {
          states = [order.stav_workflow_kod];
        }
      }
      
      // Vezmi poslední stav (aktuální)
      const currentState = states.length > 0 ? states[states.length - 1] : 'NEZNAMY';
      
      // Vyfiltruj ARCHIVOVANO
      if (currentState !== 'ARCHIVOVANO') {
        if (!workflowStatusMap[currentState]) {
          workflowStatusMap[currentState] = 0;
        }
        workflowStatusMap[currentState]++;
      }
    });

    // Publication Statistics (zveřejnění)
    let zverejnenoCount = 0;       // Bylo zveřejněno (má dt_zverejneni a registr_iddt)
    let maBytZverejnenoCount = 0;  // Má být zveřejněno (stav UVEREJNIT nebo zverejnit=ANO, ale ještě není)
    let nezverejnenoCount = 0;     // Nezveřejněno (ani nemá být)

    orders.forEach(order => {
      const registr = order.registr_smluv;
      
      // Zjisti workflow stav
      let workflowStatus = '';
      if (order.stav_workflow_kod) {
        try {
          const states = typeof order.stav_workflow_kod === 'string' 
            ? JSON.parse(order.stav_workflow_kod) 
            : order.stav_workflow_kod;
          workflowStatus = Array.isArray(states) && states.length > 0 ? states[states.length - 1] : '';
        } catch (e) {
          workflowStatus = '';
        }
      }

      // Je zveřejněno?
      const jeZverejneno = registr?.dt_zverejneni && registr?.registr_iddt;
      
      // Má být zveřejněno?
      const maZverejnit = workflowStatus === 'UVEREJNIT' || registr?.zverejnit === 'ANO';
      
      if (jeZverejneno) {
        zverejnenoCount++;
      } else if (maZverejnit) {
        maBytZverejnenoCount++;
      } else {
        nezverejnenoCount++;
      }
    });

    return {
      totalOrders,
      totalAmount,
      avgAmount,
      uniqueSuppliers,
      completedCount,
      topUsers,
      topSuppliers,
      monthlyData,
      workflowStatusMap,
      publicationStats: {
        zverejneno: zverejnenoCount,
        maBytZverejneno: maBytZverejnenoCount,
        nezverejneno: nezverejnenoCount
      }
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

  // Workflow Status Chart Data
  const workflowStatusChartData = useMemo(() => {
    const statusLabels = {
      'NOVA': 'Nová',
      'ODESLANA_KE_SCHVALENI': 'Ke schválení',
      'SCHVALENA': 'Schválená',
      'NESCHVALENA': 'Neschválená',
      'ROZPRACOVANA': 'Rozpracovaná',
      'ODESLANA': 'Odeslaná',
      'POTVRZENA': 'Potvrzená',
      'UVEREJNIT': 'K zveřejnění',
      'UVEREJNENA': 'Zveřejněná',
      'NEUVEREJNIT': 'Nezveřejňovat',
      'FAKTURACE': 'Fakturace',
      'ZKONTROLOVANA': 'Zkontrolovaná',
      'DOKONCENA': 'Dokončená',
      'ZAMITNUTA': 'Zamítnutá',
      'ZRUSENA': 'Zrušená',
      'NEZNAMY': 'Neznámý'
    };

    const statusColors = {
      'NOVA': '#94a3b8',
      'ODESLANA_KE_SCHVALENI': '#fbbf24',
      'SCHVALENA': '#10b981',
      'NESCHVALENA': '#ef4444',
      'ROZPRACOVANA': '#3b82f6',
      'ODESLANA': '#8b5cf6',
      'POTVRZENA': '#06b6d4',
      'UVEREJNIT': '#f59e0b',
      'UVEREJNENA': '#10b981',
      'NEUVEREJNIT': '#6b7280',
      'FAKTURACE': '#06b6d4',
      'ZKONTROLOVANA': '#8b5cf6',
      'DOKONCENA': '#22c55e',
      'ZAMITNUTA': '#dc2626',
      'ZRUSENA': '#f87171',
      'NEZNAMY': '#9ca3af'
    };

    const entries = Object.entries(statistics.workflowStatusMap || {})
      .sort((a, b) => b[1] - a[1]); // Seřaď podle počtu

    return {
      labels: entries.map(([key]) => statusLabels[key] || key),
      datasets: [{
        data: entries.map(([, value]) => value),
        backgroundColor: entries.map(([key]) => statusColors[key] || '#9ca3af'),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [statistics.workflowStatusMap]);

  // Publication Status Chart Data
  const publicationChartData = useMemo(() => {
    const { zverejneno, maBytZverejneno, nezverejneno } = statistics.publicationStats || {};
    
    return {
      labels: ['Zveřejněno', 'Má být zveřejněno', 'Nezveřejněno'],
      datasets: [{
        data: [zverejneno || 0, maBytZverejneno || 0, nezverejneno || 0],
        backgroundColor: [
          '#10b981', // Zelená - zveřejněno
          '#f59e0b', // Oranžová - má být zveřejněno
          '#6b7280'  // Šedá - nezveřejněno
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [statistics.publicationStats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                return {
                  text: `${label} (${value})`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
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

  // Full user statistics for Users tab
  const fullUserStats = useMemo(() => {
    if (!orders.length) return [];

    const userOrdersMap = {};
    orders.forEach(order => {
      // Enriched API: order.uzivatel.cele_jmeno
      const userName = order.uzivatel?.cele_jmeno || 
                       order.uzivatel_cely_jmeno || 
                       `${order.uzivatel?.jmeno || ''} ${order.uzivatel?.prijmeni || ''}`.trim() ||
                       'Neznámý';
      if (!userOrdersMap[userName]) {
        userOrdersMap[userName] = { count: 0, amount: 0 };
      }
      userOrdersMap[userName].count += 1;
      userOrdersMap[userName].amount += parseFloat(order.max_cena_s_dph || order.cena_s_dph || 0);
    });

    return Object.entries(userOrdersMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        avgAmount: data.amount / data.count
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Full supplier statistics for Suppliers tab
  const fullSupplierStats = useMemo(() => {
    if (!orders.length) return [];

    const supplierOrdersMap = {};
    orders.forEach(order => {
      const supplierName = order.dodavatel_nazev || 'Neuvedeno';
      if (!supplierOrdersMap[supplierName]) {
        supplierOrdersMap[supplierName] = { count: 0, amount: 0 };
      }
      supplierOrdersMap[supplierName].count += 1;
      supplierOrdersMap[supplierName].amount += parseFloat(order.max_cena_s_dph || order.cena_s_dph || 0);
    });

    return Object.entries(supplierOrdersMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        avgAmount: data.amount / data.count
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // =============================================================================
  // RENDER
  // =============================================================================

  const renderOverviewTab = () => (
    <>
      <KPIGrid>
        <KPICard color="#2563eb">
          <KPIHeader>
            <KPILabel>Objednávky</KPILabel>
            <ArchiveToggleWrapper>
              <span>Archiv</span>
              <ToggleSwitch>
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                <span></span>
              </ToggleSwitch>
            </ArchiveToggleWrapper>
          </KPIHeader>
          <KPIValue>
            <KPIValueColumn>
              <KPIValueNumber>{statistics.totalOrders}</KPIValueNumber>
              <KPIValueLabel>celkem</KPIValueLabel>
            </KPIValueColumn>
            <KPIValueColumn>
              <KPIValueNumber color="#10b981">{statistics.completedCount}</KPIValueNumber>
              <KPIValueLabel>dokončeno</KPIValueLabel>
            </KPIValueColumn>
          </KPIValue>
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

      <BarChartCard>
        <ChartTitleWithFullscreen>
          <ChartTitle>
            <FontAwesomeIcon icon={faChartBar} />
            Počet objednávek v měsících ({new Date().getFullYear()})
          </ChartTitle>
          <FullscreenButton 
            onClick={() => openFullscreen({
              type: 'bar',
              title: `Počet objednávek v měsících (${new Date().getFullYear()})`,
              icon: faChartBar,
              data: {
                labels: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'],
                datasets: [{
                  label: 'Počet objednávek',
                  data: statistics.monthlyData,
                  backgroundColor: [
                    'rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 0.7)',
                    'rgba(74, 222, 128, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(74, 222, 128, 0.7)',
                    'rgba(250, 204, 21, 0.7)', 'rgba(250, 204, 21, 0.7)', 'rgba(250, 204, 21, 0.7)',
                    'rgba(249, 115, 22, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(249, 115, 22, 0.7)'
                  ],
                  borderColor: [
                    'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 1)',
                    'rgba(74, 222, 128, 1)', 'rgba(74, 222, 128, 1)', 'rgba(74, 222, 128, 1)',
                    'rgba(250, 204, 21, 1)', 'rgba(250, 204, 21, 1)', 'rgba(250, 204, 21, 1)',
                    'rgba(249, 115, 22, 1)', 'rgba(249, 115, 22, 1)', 'rgba(249, 115, 22, 1)'
                  ],
                  borderWidth: 2,
                  borderRadius: 6,
                  hoverBackgroundColor: [
                    'rgba(59, 130, 246, 0.9)', 'rgba(59, 130, 246, 0.9)', 'rgba(59, 130, 246, 0.9)',
                    'rgba(74, 222, 128, 0.9)', 'rgba(74, 222, 128, 0.9)', 'rgba(74, 222, 128, 0.9)',
                    'rgba(250, 204, 21, 0.9)', 'rgba(250, 204, 21, 0.9)', 'rgba(250, 204, 21, 0.9)',
                    'rgba(249, 115, 22, 0.9)', 'rgba(249, 115, 22, 0.9)', 'rgba(249, 115, 22, 0.9)'
                  ]
                }]
              }
            })}
          >
            <FontAwesomeIcon icon={faExpand} />
          </FullscreenButton>
        </ChartTitleWithFullscreen>
        <div style={{ height: '300px' }}>
          {statistics.monthlyData.some(val => val > 0) ? (
            <Bar
              data={{
                labels: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'],
                datasets: [{
                  label: 'Počet objednávek',
                  data: statistics.monthlyData,
                  backgroundColor: [
                    // Q1 - Zima (ledově modrá)
                    'rgba(59, 130, 246, 0.7)',   // Leden
                    'rgba(59, 130, 246, 0.7)',   // Únor
                    'rgba(59, 130, 246, 0.7)',   // Březen
                    // Q2 - Jaro (světle zelená)
                    'rgba(74, 222, 128, 0.7)',   // Duben
                    'rgba(74, 222, 128, 0.7)',   // Květen
                    'rgba(74, 222, 128, 0.7)',   // Červen
                    // Q3 - Léto (slunečně žlutá)
                    'rgba(250, 204, 21, 0.7)',   // Červenec
                    'rgba(250, 204, 21, 0.7)',   // Srpen
                    'rgba(250, 204, 21, 0.7)',   // Září
                    // Q4 - Podzim (oranžovo-rezavá)
                    'rgba(249, 115, 22, 0.7)',   // Říjen
                    'rgba(249, 115, 22, 0.7)',   // Listopad
                    'rgba(249, 115, 22, 0.7)'    // Prosinec
                  ],
                  borderColor: [
                    // Q1 - Zima
                    'rgba(59, 130, 246, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(59, 130, 246, 1)',
                    // Q2 - Jaro
                    'rgba(74, 222, 128, 1)',
                    'rgba(74, 222, 128, 1)',
                    'rgba(74, 222, 128, 1)',
                    // Q3 - Léto
                    'rgba(250, 204, 21, 1)',
                    'rgba(250, 204, 21, 1)',
                    'rgba(250, 204, 21, 1)',
                    // Q4 - Podzim
                    'rgba(249, 115, 22, 1)',
                    'rgba(249, 115, 22, 1)',
                    'rgba(249, 115, 22, 1)'
                  ],
                  borderWidth: 2,
                  borderRadius: 6,
                  hoverBackgroundColor: [
                    // Q1 - Zima
                    'rgba(59, 130, 246, 0.9)',
                    'rgba(59, 130, 246, 0.9)',
                    'rgba(59, 130, 246, 0.9)',
                    // Q2 - Jaro
                    'rgba(74, 222, 128, 0.9)',
                    'rgba(74, 222, 128, 0.9)',
                    'rgba(74, 222, 128, 0.9)',
                    // Q3 - Léto
                    'rgba(250, 204, 21, 0.9)',
                    'rgba(250, 204, 21, 0.9)',
                    'rgba(250, 204, 21, 0.9)',
                    // Q4 - Podzim
                    'rgba(249, 115, 22, 0.9)',
                    'rgba(249, 115, 22, 0.9)',
                    'rgba(249, 115, 22, 0.9)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                      label: (context) => `Objednávek: ${context.parsed.y}`
                    }
                  },
                  datalabels: {
                    display: (context) => context.dataset.data[context.dataIndex] > 0,
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    formatter: (value) => value,
                    color: '#374151',
                    font: { weight: 'bold', size: 12 }
                  }
                },
                layout: {
                  padding: {
                    top: 30 // Prostor pro číslka nad sloupci
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                      color: '#6b7280',
                      font: { size: 12 }
                    },
                    grid: {
                      color: '#f3f4f6',
                      drawBorder: false
                    }
                  },
                  x: {
                    ticks: {
                      color: '#6b7280',
                      font: { size: 12 }
                    },
                    grid: {
                      display: false,
                      drawBorder: false
                    }
                  }
                }
              }}
            />
          ) : (
            <EmptyState>
              <FontAwesomeIcon icon={faChartBar} />
              <div>Žádná data za aktuální rok</div>
            </EmptyState>
          )}
        </div>
      </BarChartCard>

      <ChartsGrid>
        <ChartCard>
          <ChartTitleWithFullscreen>
            <ChartTitle>
              <FontAwesomeIcon icon={faUsers} />
              Top uživatelé podle počtu objednávek
            </ChartTitle>
            <FullscreenButton 
              onClick={() => openFullscreen({
                type: 'pie',
                title: 'Top uživatelé podle počtu objednávek',
                icon: faUsers,
                data: userChartData,
                options: chartOptions
              })}
            >
              <FontAwesomeIcon icon={faExpand} />
            </FullscreenButton>
          </ChartTitleWithFullscreen>
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
          <ChartTitleWithFullscreen>
            <ChartTitle>
              <FontAwesomeIcon icon={faBuilding} />
              Top dodavatelé podle počtu objednávek
            </ChartTitle>
            <FullscreenButton 
              onClick={() => openFullscreen({
                type: 'pie',
                title: 'Top dodavatelé podle počtu objednávek',
                icon: faBuilding,
                data: supplierChartData,
                options: chartOptions
              })}
            >
              <FontAwesomeIcon icon={faExpand} />
            </FullscreenButton>
          </ChartTitleWithFullscreen>
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

      <ChartsGrid>
        <ChartCard>
          <ChartTitleWithFullscreen>
            <ChartTitle>
              <FontAwesomeIcon icon={faCheckCircle} />
              Stavy objednávek
            </ChartTitle>
            <FullscreenButton 
              onClick={() => openFullscreen({
                type: 'pie',
                title: 'Stavy objednávek',
                icon: faCheckCircle,
                data: workflowStatusChartData,
                options: chartOptions
              })}
            >
              <FontAwesomeIcon icon={faExpand} />
            </FullscreenButton>
          </ChartTitleWithFullscreen>
          <ChartWrapper>
            {Object.keys(statistics.workflowStatusMap || {}).length > 0 ? (
              <Pie data={workflowStatusChartData} options={chartOptions} />
            ) : (
              <EmptyState>
                <FontAwesomeIcon icon={faCheckCircle} />
                <div>Žádná data k zobrazení</div>
              </EmptyState>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitleWithFullscreen>
            <ChartTitle>
              <FontAwesomeIcon icon={faCalendarAlt} />
              Stav zveřejnění
            </ChartTitle>
            <FullscreenButton 
              onClick={() => openFullscreen({
                type: 'pie',
                title: 'Stav zveřejnění',
                icon: faCalendarAlt,
                data: publicationChartData,
                options: chartOptions
              })}
            >
              <FontAwesomeIcon icon={faExpand} />
            </FullscreenButton>
          </ChartTitleWithFullscreen>
          <ChartWrapper>
            {(statistics.publicationStats?.zverejneno || 0) + (statistics.publicationStats?.maBytZverejneno || 0) + (statistics.publicationStats?.nezverejneno || 0) > 0 ? (
              <Pie data={publicationChartData} options={chartOptions} />
            ) : (
              <EmptyState>
                <FontAwesomeIcon icon={faCalendarAlt} />
                <div>Žádná data k zobrazení</div>
              </EmptyState>
            )}
          </ChartWrapper>
        </ChartCard>
      </ChartsGrid>
    </>
  );

  const renderUsersTab = () => (
    <>
      <ChartCard>
        <ChartTitle>
          <FontAwesomeIcon icon={faUsers} />
          Detailní statistiky uživatelů
        </ChartTitle>
        {fullUserStats.length > 0 ? (
          <StatsTable>
            <thead>
              <tr>
                <StatsTableHeader>Pořadí</StatsTableHeader>
                <StatsTableHeader>Uživatel</StatsTableHeader>
                <StatsTableHeader align="right">Počet objednávek</StatsTableHeader>
                <StatsTableHeader align="right">Celková částka</StatsTableHeader>
                <StatsTableHeader align="right">Průměrná částka</StatsTableHeader>
              </tr>
            </thead>
            <tbody>
              {fullUserStats.map((user, index) => (
                <tr key={index}>
                  <StatsTableCell>
                    <RankBadge rank={index + 1}>#{index + 1}</RankBadge>
                  </StatsTableCell>
                  <StatsTableCell>{user.name}</StatsTableCell>
                  <StatsTableCell align="right">
                    <strong>{user.count}</strong>
                  </StatsTableCell>
                  <StatsTableCell align="right">
                    {user.amount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                  </StatsTableCell>
                  <StatsTableCell align="right">
                    {user.avgAmount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                  </StatsTableCell>
                </tr>
              ))}
            </tbody>
          </StatsTable>
        ) : (
          <EmptyState>
            <FontAwesomeIcon icon={faUsers} />
            <div>Žádní uživatelé k zobrazení</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Načtěte data objednávek pomocí tlačítka "Obnovit data"
            </div>
          </EmptyState>
        )}
      </ChartCard>
    </>
  );

  const renderSuppliersTab = () => (
    <>
      <ChartCard>
        <ChartTitle>
          <FontAwesomeIcon icon={faBuilding} />
          Detailní statistiky dodavatelů
        </ChartTitle>
        {fullSupplierStats.length > 0 ? (
          <StatsTable>
            <thead>
              <tr>
                <StatsTableHeader>Pořadí</StatsTableHeader>
                <StatsTableHeader>Dodavatel</StatsTableHeader>
                <StatsTableHeader align="right">Počet objednávek</StatsTableHeader>
                <StatsTableHeader align="right">Celková částka</StatsTableHeader>
                <StatsTableHeader align="right">Průměrná částka</StatsTableHeader>
              </tr>
            </thead>
            <tbody>
              {fullSupplierStats.map((supplier, index) => (
                <tr key={index}>
                  <StatsTableCell>
                    <RankBadge rank={index + 1}>#{index + 1}</RankBadge>
                  </StatsTableCell>
                  <StatsTableCell>{supplier.name}</StatsTableCell>
                  <StatsTableCell align="right">
                    <strong>{supplier.count}</strong>
                  </StatsTableCell>
                  <StatsTableCell align="right">
                    {supplier.amount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                  </StatsTableCell>
                  <StatsTableCell align="right">
                    {supplier.avgAmount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                  </StatsTableCell>
                </tr>
              ))}
            </tbody>
          </StatsTable>
        ) : (
          <EmptyState>
            <FontAwesomeIcon icon={faBuilding} />
            <div>Žádní dodavatelé k zobrazení</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Načtěte data objednávek pomocí tlačítka "Obnovit data"
            </div>
          </EmptyState>
        )}
      </ChartCard>
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
          <HeaderButtons>
            <ExportButton onClick={handleExport} disabled={loading || orders.length === 0}>
              <FontAwesomeIcon icon={faDownload} />
              Export CSV
            </ExportButton>
            <RefreshButton onClick={loadOrdersData} disabled={loading}>
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
              Obnovit data
            </RefreshButton>
          </HeaderButtons>
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
              {activeTab === 'users' && renderUsersTab()}
              {activeTab === 'suppliers' && renderSuppliersTab()}
            </>
          )}
        </ContentArea>

        {lastUpdated && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faCalendarAlt} /> Poslední aktualizace: {lastUpdated.toLocaleString('cs-CZ')}
          </div>
        )}
      </PageContainer>
      
      {/* Fullscreen Modal */}
      {fullscreenChart && createPortal(
        <FullscreenModal onClick={closeFullscreen}>
          <FullscreenContent 
            isBar={fullscreenChart.type === 'bar'} 
            onClick={(e) => e.stopPropagation()}
          >
            <FullscreenHeader>
              <FullscreenTitle>
                <FontAwesomeIcon icon={fullscreenChart.icon} />
                {fullscreenChart.title}
              </FullscreenTitle>
              <CloseButton onClick={closeFullscreen}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </FullscreenHeader>
            <FullscreenChartWrapper>
              {fullscreenChart.type === 'pie' ? (
                <Pie 
                  data={fullscreenChart.data} 
                  options={{
                    ...fullscreenChart.options,
                    responsive: true,
                    maintainAspectRatio: false
                  }} 
                />
              ) : (
                <Bar 
                  data={fullscreenChart.data} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                          font: { size: 16, weight: 'bold' },
                          padding: 20,
                          color: '#1f2937'
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 16,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        titleFont: { size: 16, weight: 'bold' },
                        bodyFont: { size: 14 },
                        callbacks: { 
                          label: (context) => `Objednávek: ${context.parsed.y}` 
                        }
                      },
                      datalabels: {
                        display: (context) => context.dataset.data[context.dataIndex] > 0,
                        anchor: 'end', 
                        align: 'end', 
                        offset: 8,
                        formatter: (value) => value,
                        color: '#1f2937', 
                        font: { weight: 'bold', size: 16 }
                      }
                    },
                    layout: { 
                      padding: { 
                        top: 50, 
                        bottom: 20, 
                        left: 20, 
                        right: 20 
                      } 
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { 
                          precision: 0, 
                          color: '#4b5563', 
                          font: { size: 16, weight: '500' },
                          padding: 10
                        },
                        grid: { 
                          color: '#e5e7eb', 
                          drawBorder: false,
                          lineWidth: 1
                        },
                        title: {
                          display: true,
                          text: 'Počet objednávek',
                          color: '#1f2937',
                          font: { size: 18, weight: 'bold' },
                          padding: { bottom: 10 }
                        }
                      },
                      x: {
                        ticks: { 
                          color: '#4b5563', 
                          font: { size: 16, weight: '500' },
                          padding: 10,
                          maxRotation: 0
                        },
                        grid: { 
                          display: false, 
                          drawBorder: false 
                        },
                        title: {
                          display: true,
                          text: 'Měsíce',
                          color: '#1f2937',
                          font: { size: 18, weight: 'bold' },
                          padding: { top: 10 }
                        }
                      }
                    }
                  }} 
                />
              )}
            </FullscreenChartWrapper>
          </FullscreenContent>
        </FullscreenModal>,
        document.body
      )}
    </PageWrapper>
  );
};

export default StatisticsPage;
