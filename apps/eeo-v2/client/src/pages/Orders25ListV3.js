/**
 * 📋 Orders25ListV3.js
 * 
 * VERZE 3.0 - Nová implementace seznamu objednávek s backend paging
 * 
 * Datum: 23. ledna 2026
 * Účel: Paralelní implementace pro postupný přechod na BE paging/filtering
 * Status: 🚧 BETA - Ve vývoji, zatím jen pro ADMINY
 * 
 * Dokumentace: /docs/ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md
 * 
 * Změny oproti V2:
 * - ✅ Backend pagination (50-100 záznamů na stránku)
 * - ✅ Backend filtering (SQL místo JS)
 * - ✅ Postupné načítání (lazy loading)
 * - ✅ Optimalizované pro velké množství dat (10 000+ objednávek)
 * - ✅ Menší RAM footprint
 * - ✅ Rychlejší response time
 */

import React, { useContext, useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket, 
  faSpinner, 
  faExclamationTriangle,
  faInfoCircle,
  faCog,
  faChartBar,
  faFilter,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

// Context
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';

// Custom hooks
import { useOrdersV3 } from '../hooks/ordersV3/useOrdersV3';

// Components
import OrdersDashboardV3Full from '../components/ordersV3/OrdersDashboardV3Full';
import OrdersFiltersV3 from '../components/ordersV3/OrdersFiltersV3';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import OrdersColumnConfigV3 from '../components/ordersV3/OrdersColumnConfigV3';
import OrdersTableV3 from '../components/ordersV3/OrdersTableV3';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  width: 100%;
  padding: 1rem 1.5rem;
  margin: 0;
  min-height: calc(100vh - var(--app-fixed-offset, 140px));
  box-sizing: border-box;
`;


const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  border: 2px solid ${props => props.$active ? '#3b82f6' : '#e2e8f0'};
  border-radius: 8px;
  color: ${props => props.$active ? 'white' : '#475569'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f1f5f9'};
    border-color: ${props => props.$active ? '#2563eb' : '#3b82f6'};
  }

  svg {
    font-size: 0.9rem;
  }
`;

const YearSelector = styled.select`
  padding: 0.625rem 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const LoadingText = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;

  svg {
    font-size: 1.5rem;
    color: #3b82f6;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.5rem 0;
`;

const EmptyText = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin: 0;
`;

const ErrorAlert = styled.div`
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ErrorIcon = styled.div`
  font-size: 2rem;
  color: #ef4444;
`;

const ErrorMessage = styled.div`
  flex: 1;
  font-size: 1rem;
  color: #b91c1c;
  font-weight: 500;
`;

const TablePlaceholder = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  font-style: italic;
`;

// ============================================================================
// COLUMN LABELS (pro konfiguraci)
// ============================================================================

const COLUMN_LABELS = {
  expander: '',
  approve: '',
  dt_objednavky: 'Datum objednávky',
  cislo_objednavky: 'Evidenční číslo',
  zpusob_financovani: 'Financování',
  objednatel_garant: 'Objednatel / Garant',
  prikazce_schvalovatel: 'Příkazce / Schvalovatel',
  dodavatel_nazev: 'Dodavatel',
  stav_objednavky: 'Stav',
  stav_registru: 'Stav registru',
  max_cena_s_dph: 'Max. cena s DPH',
  cena_s_dph: 'Cena s DPH',
  faktury_celkova_castka_s_dph: 'Cena FA s DPH',
  actions: 'Akce',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function Orders25ListV3() {
  // Contexts
  const { token, username, user_id } = useContext(AuthContext);
  const { showProgress, hideProgress } = useContext(ProgressContext) || {};

  // Custom hook pro Orders V3
  const {
    // Data
    orders,
    loading,
    error,
    stats,
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    
    // Filtry
    selectedYear,
    setSelectedYear,
    columnFilters,
    dashboardFilters,
    handleColumnFilterChange,
    handleDashboardFilterChange,
    handleClearFilters,
    
    // Column Configuration
    columnVisibility,
    columnOrder,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    handleResetColumnConfig,
    
    // Expanded Rows
    expandedRows,
    subRowsData,
    handleToggleRow,
  } = useOrdersV3({
    token,
    username,
    userId: user_id,
    showProgress,
    hideProgress,
  });

  // Generovat roky pro selector
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Local state pro UI toggles
  const [showDashboard, setShowDashboard] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dashboardMode, setDashboardMode] = useState('FULL'); // FULL, DYNAMIC, COMPACT
  
  // State pro třídění
  const [sorting, setSorting] = useState([]);

  // Handler pro uložení konfigurace sloupců
  const handleSaveColumnConfig = async () => {
    try {
      // TODO: Implementovat uložení do user settings
      console.log('💾 Saving column config:', {
        columnVisibility,
        columnOrder,
      });
      
      // Placeholder - localStorage
      localStorage.setItem('ordersV3_columnVisibility', JSON.stringify(columnVisibility));
      localStorage.setItem('ordersV3_columnOrder', JSON.stringify(columnOrder));
      
      console.log('✅ Column config saved to localStorage');
    } catch (err) {
      console.error('❌ Error saving column config:', err);
    }
  };

  // Handler pro akce v tabulce
  const handleActionClick = (action, order) => {
    console.log('🎯 Action clicked:', action, order);
    // TODO: Implementovat akce (edit, create-invoice, export)
  };

  // Handler pro rozbalení řádku
  const handleRowExpand = (order) => {
    handleToggleRow(order.id);
  };

  // Dummy handlers pro actions (budou implementovány)
  const canEdit = () => true;
  const canCreateInvoice = () => true;
  const canExportDocument = () => true;

  return (
    <Container>
      {/* Header */}
      <Header>
        <TitleSection>
          <Title>
            <FontAwesomeIcon icon={faRocket} style={{ color: '#3b82f6' }} />
            Objednávky V3
            <Badge>
              <FontAwesomeIcon icon={faInfoCircle} />
              BETA
            </Badge>
          </Title>
        </TitleSection>

        <HeaderActions>
          {/* Toggle Dashboard */}
          <ToggleButton
            $active={showDashboard}
            onClick={() => setShowDashboard(!showDashboard)}
            title={showDashboard ? 'Skrýt dashboard' : 'Zobrazit dashboard'}
          >
            <FontAwesomeIcon icon={showDashboard ? faEyeSlash : faEye} />
            <FontAwesomeIcon icon={faChartBar} />
          </ToggleButton>

          {/* Toggle Filtry */}
          <ToggleButton
            $active={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? 'Skrýt filtry' : 'Zobrazit filtry'}
          >
            <FontAwesomeIcon icon={showFilters ? faEyeSlash : faEye} />
            <FontAwesomeIcon icon={faFilter} />
          </ToggleButton>

          {/* Výběr roku */}
          <YearSelector
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            disabled={loading}
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </YearSelector>

          {/* Konfigurace sloupců */}
          <OrdersColumnConfigV3
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            columnLabels={COLUMN_LABELS}
            onVisibilityChange={handleColumnVisibilityChange}
            onOrderChange={handleColumnOrderChange}
            onReset={handleResetColumnConfig}
            onSave={handleSaveColumnConfig}
          />
        </HeaderActions>
      </Header>

      {/* Error state */}
      {error && (
        <ErrorAlert>
          <ErrorIcon>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </ErrorIcon>
          <ErrorMessage>{error}</ErrorMessage>
        </ErrorAlert>
      )}

      {/* Dashboard */}
      {showDashboard && (
        <OrdersDashboardV3Full
          stats={stats}
          totalAmount={stats.totalAmount || 0}
          filteredTotalAmount={stats.filteredTotalAmount || stats.totalAmount || 0}
          filteredCount={orders.length}
          hasActiveFilters={dashboardFilters.filter_status || Object.keys(columnFilters).length > 0}
          activeStatus={dashboardFilters.filter_status}
          onStatusClick={handleDashboardFilterChange}
          onHide={() => setShowDashboard(false)}
          mode={dashboardMode}
          onModeChange={setDashboardMode}
        />
      )}

      {/* Filters */}
      {showFilters && (
        <OrdersFiltersV3
          filters={columnFilters}
          onFilterChange={handleColumnFilterChange}
          onClearAll={handleClearFilters}
          availableYears={years}
          availableStates={[]}
          availableUsers={[]}
          availableSuppliers={[]}
        />
      )}

      {/* Loading state */}
      {loading && orders.length === 0 && (
        <LoadingOverlay>
          <LoadingText>
            <FontAwesomeIcon icon={faSpinner} spin />
            Načítám objednávky...
          </LoadingText>
        </LoadingOverlay>
      )}

      {/* Table (placeholder pro nyní) */}
      {!loading && orders.length === 0 && !error && (
        <EmptyState>
          <EmptyIcon>📋</EmptyIcon>
          <EmptyTitle>Žádné objednávky</EmptyTitle>
          <EmptyText>
            Pro vybraný rok {selectedYear} nebyly nalezeny žádné objednávky.
          </EmptyText>
        </EmptyState>
      )}

      {/* Table */}
      {!loading && orders.length > 0 && (
        <OrdersTableV3
          data={orders}
          visibleColumns={Object.keys(columnVisibility).filter(col => columnVisibility[col])}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowExpand={handleRowExpand}
          onActionClick={handleActionClick}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onColumnReorder={handleColumnOrderChange}
          isLoading={loading}
          canEdit={canEdit}
          canCreateInvoice={canCreateInvoice}
          canExportDocument={canExportDocument}
        />
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <OrdersPaginationV3
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          loading={loading}
        />
      )}
    </Container>
  );
}

export default Orders25ListV3;
