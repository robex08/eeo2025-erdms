/**
 * VirtualizedOrdersTable.js
 * 
 * 🚀 VIRTUALIZOVANÁ TABULKA PRO VELKÉ MNOŽSTVÍ DAT (1000+ řádků)
 * Conditional wrapper nad standardní OrdersTableV3 s virtual scrolling
 */

import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import useVirtualizedTable, { 
  VirtualizedTableContainer, 
  VirtualizedRowContainer 
} from '../../hooks/ordersV3/useVirtualizedTable';
import OrdersTableV3 from './OrdersTableV3';
import ORDERS_V3_CONFIG from '../../constants/ordersV3Config';

const {
  VIRTUALIZATION_THRESHOLD,
  ROW_HEIGHT,
  CONTAINER_HEIGHT,
  OVERSCAN_COUNT
} = ORDERS_V3_CONFIG;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const VirtualizedWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const PerformanceInfo = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  opacity: 0.8;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const VirtualRowWrapper = styled.div`
  height: ${ROW_HEIGHT}px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * VirtualizedOrdersTable - Conditional virtualization wrapper
 * 
 * Automaticky rozhodne na základě počtu řádků:
 * - < VIRTUALIZATION_THRESHOLD: Standard table
 * - >= VIRTUALIZATION_THRESHOLD: Virtual scrolling table
 * 
 * @param {Object} props - Všechny props z OrdersTableV3
 * @param {Array} props.data - Array objednávek
 * @param {boolean} props.forceVirtualization - Force virtual mode (pro testování)
 * @returns {JSX.Element}
 */
const VirtualizedOrdersTable = ({
  data = [],
  forceVirtualization = false,
  showPerformanceInfo = process.env.NODE_ENV === 'development',
  orderStatesList = [], // ✅ Options pro stavový filtr
  ...tableProps
}) => {
  
  // ✅ DECISION: Použít virtualizaci?
  const shouldVirtualize = forceVirtualization || data.length >= VIRTUALIZATION_THRESHOLD;
  
  // ✅ VIRTUAL TABLE LOGIC: Pouze pokud je potřeba
  const virtualTable = useVirtualizedTable({
    data,
    containerHeight: CONTAINER_HEIGHT,
    rowHeight: ROW_HEIGHT,
    overscan: OVERSCAN_COUNT
  });
  
  // ✅ PERFORMANCE METRICS: Pro monitoring
  const performanceMetrics = useMemo(() => {
    if (!shouldVirtualize) return null;
    
    return virtualTable.getPerformanceInfo();
  }, [shouldVirtualize, virtualTable.getPerformanceInfo]);
  
  // ============================================================================
  // STANDARD TABLE (malé datasety)
  // ============================================================================
  
  if (!shouldVirtualize) {
    return (
      <VirtualizedWrapper>
        {showPerformanceInfo && data.length > 100 && (
          <PerformanceInfo>
            📊 Standard: {data.length} řádků
          </PerformanceInfo>
        )}
        <OrdersTableV3 
          {...tableProps} 
          data={data}
          orderStatesList={orderStatesList}
        />
      </VirtualizedWrapper>
    );
  }
  
  // ============================================================================
  // VIRTUALIZED TABLE (velké datasety)
  // ============================================================================
  
  return (
    <VirtualizedWrapper>
      {showPerformanceInfo && performanceMetrics && (
        <PerformanceInfo>
          ⚡ Virtual: {performanceMetrics.visibleRows}/{performanceMetrics.totalRows} 
          ({performanceMetrics.renderRatio}%)
        </PerformanceInfo>
      )}
      
      <VirtualizedTableContainer
        totalHeight={virtualTable.totalHeight}
        containerHeight={CONTAINER_HEIGHT}
        onScroll={virtualTable.handleScroll}
        containerRef={virtualTable.containerRef}
      >
        <VirtualizedRowContainer 
          offsetY={virtualTable.offsetY}
        >
          {/* Render pouze viditelné řádky */}
          <OrdersTableV3
            {...tableProps}
            data={virtualTable.visibleItems}
            orderStatesList={orderStatesList}
            virtualizedProps={{
              startIndex: virtualTable.startIndex,
              endIndex: virtualTable.endIndex,
              totalItems: data.length,
              isVirtualized: true,
              scrollToRow: virtualTable.scrollToRow,
              scrollIntoView: virtualTable.scrollIntoView,
              isRowVisible: virtualTable.isRowVisible,
            }}
          />
        </VirtualizedRowContainer>
      </VirtualizedTableContainer>
    </VirtualizedWrapper>
  );
};

export default VirtualizedOrdersTable;