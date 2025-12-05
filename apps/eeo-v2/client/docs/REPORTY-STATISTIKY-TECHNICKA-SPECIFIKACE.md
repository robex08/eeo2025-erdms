# 🔧 REPORTY & STATISTIKY - Technická Specifikace

**Datum:** 27. listopadu 2025  
**Status:** TECHNICAL DESIGN  
**Pro:** Frontend & Backend vývojáře

---

## 📋 OBSAH

1. [Frontend Komponenty](#frontend-komponenty)
2. [Backend API Endpoints](#backend-api-endpoints)
3. [Datové struktury](#datové-struktury)
4. [Custom Hooks](#custom-hooks)
5. [Styling & Responsivita](#styling--responsivita)
6. [Error Handling](#error-handling)

---

## 🎨 FRONTEND KOMPONENTY

### 1. ReportsPage.js

**Zodpovědnost:** Hlavní stránka reportů s TAB navigací

```javascript
// src/pages/ReportsPage.js

import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faDownload } from '@fortawesome/free-solid-svg-icons';
import { UserContext } from '../context/UserContext';

// TABs
import ComplianceReportsTab from '../components/reports/tabs/ComplianceReportsTab';
import BudgetReportsTab from '../components/reports/tabs/BudgetReportsTab';
import WorkflowReportsTab from '../components/reports/tabs/WorkflowReportsTab';
import AssetReportsTab from '../components/reports/tabs/AssetReportsTab';

const TABS = [
  { id: 'compliance', label: 'Kontrolní', icon: faChartBar },
  { id: 'budget', label: 'Rozpočet', icon: faChartBar },
  { id: 'workflow', label: 'Workflow', icon: faChartBar },
  { id: 'asset', label: 'Majetek', icon: faChartBar },
];

export default function ReportsPage() {
  const { hasPermission } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('reports_activeTab') || 'compliance';
  });

  // Uložit aktivní TAB do localStorage
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('reports_activeTab', tabId);
  };

  // Check export permission
  const canExport = hasPermission && hasPermission('REPORT_EXPORT');

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <FontAwesomeIcon icon={faChartBar} />
          <h1>Reporty</h1>
        </HeaderLeft>
        {canExport && (
          <ExportButton>
            <FontAwesomeIcon icon={faDownload} /> Export
          </ExportButton>
        )}
      </PageHeader>

      <TabsContainer>
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
          >
            <FontAwesomeIcon icon={tab.icon} /> {tab.label}
          </Tab>
        ))}
      </TabsContainer>

      <TabContent>
        {activeTab === 'compliance' && <ComplianceReportsTab />}
        {activeTab === 'budget' && <BudgetReportsTab />}
        {activeTab === 'workflow' && <WorkflowReportsTab />}
        {activeTab === 'asset' && <AssetReportsTab />}
      </TabContent>
    </PageContainer>
  );
}

// Styled Components
const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  h1 {
    margin: 0;
    font-size: 2rem;
  }
`;

const ExportButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  
  &:hover {
    background: #5568d3;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? '#667eea' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#4a5568'};
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#667eea' : 'transparent'};
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? '#667eea' : '#f7fafc'};
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;
```

---

### 2. ComplianceReportsTab.js

**Zodpovědnost:** TAB s kontrolními reporty

```javascript
// src/components/reports/tabs/ComplianceReportsTab.js

import React, { useState } from 'react';
import styled from '@emotion/styled';
import ReportCard from '../ReportCard';
import ReportModal from '../ReportModal';
import { useReportData } from '../../../hooks/useReportData';

const COMPLIANCE_REPORTS = [
  {
    id: 'to-publish',
    title: 'Objednávky ke zveřejnění',
    icon: '⚠️',
    description: 'Objednávky, které se mají zveřejnit, ale ještě nejsou',
    endpoint: 'to-publish',
  },
  {
    id: 'over-limit',
    title: 'Objednávky nad 50 000 Kč',
    icon: '💰',
    description: 'Hlídání limitů',
    endpoint: 'over-limit',
  },
  {
    id: 'published',
    title: 'Zveřejněné objednávky',
    icon: '📢',
    description: 'Podle ID zveřejnění',
    endpoint: 'published',
  },
  {
    id: 'invoice-discrepancy',
    title: 'Fakturace vyšší než částka na kontrole',
    icon: '❗',
    description: 'Nesrovnalosti mezi objednávkou a fakturou',
    endpoint: 'invoice-discrepancy',
  },
  {
    id: 'retroactive',
    title: 'Objednávky vytvořené po fakturaci',
    icon: '⏪',
    description: 'Zpětné objednávky (rizikové)',
    endpoint: 'retroactive-orders',
  },
  {
    id: 'urgent-payments',
    title: 'Faktury se splatností < 5 dní',
    icon: '⚡',
    description: 'Urgentní platby',
    endpoint: 'urgent-payments',
  },
];

export default function ComplianceReportsTab() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  return (
    <Container>
      <SectionTitle>Kontrolní reporty</SectionTitle>
      <SectionDescription>
        Reporty zaměřené na dodržování pravidel a limitů
      </SectionDescription>

      <ReportsGrid>
        {COMPLIANCE_REPORTS.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onClick={() => handleReportClick(report)}
          />
        ))}
      </ReportsGrid>

      {isModalOpen && selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={handleCloseModal}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  padding: 1rem 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #2d3748;
`;

const SectionDescription = styled.p`
  color: #718096;
  margin-bottom: 2rem;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;
```

---

### 3. ReportCard.js

**Zodpovědnost:** Karta jednoho reportu

```javascript
// src/components/reports/ReportCard.js

import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useReportData } from '../../hooks/useReportData';

export default function ReportCard({ report, onClick }) {
  const { data, loading, error } = useReportData(report.endpoint, {
    count_only: true // Získat pouze počet záznamů
  });

  const count = data?.total_count || 0;

  return (
    <Card onClick={onClick}>
      <CardIcon>{report.icon}</CardIcon>
      <CardContent>
        <CardTitle>{report.title}</CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardContent>
      <CardFooter>
        {loading ? (
          <CountBadge $loading>...</CountBadge>
        ) : (
          <>
            <CountBadge $alert={count > 0}>{count}</CountBadge>
            <FontAwesomeIcon icon={faChevronRight} />
          </>
        )}
      </CardFooter>
    </Card>
  );
}

const Card = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const CardIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const CardContent = styled.div`
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.125rem;
  margin: 0 0 0.5rem 0;
  color: #2d3748;
`;

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
`;

const CountBadge = styled.span`
  background: ${props => {
    if (props.$loading) return '#e2e8f0';
    if (props.$alert) return '#fed7d7';
    return '#c6f6d5';
  }};
  color: ${props => {
    if (props.$loading) return '#718096';
    if (props.$alert) return '#c53030';
    return '#22543d';
  }};
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
`;
```

---

### 4. ReportModal.js

**Zodpovědnost:** Modal s detailním reportem

```javascript
// src/components/reports/ReportModal.js

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faFilter } from '@fortawesome/free-solid-svg-icons';
import ReportFilterBar from './ReportFilterBar';
import ReportDataTable from './ReportDataTable';
import { useReportData } from '../../hooks/useReportData';
import { useReportExport } from '../../hooks/useReportExport';

export default function ReportModal({ report, onClose }) {
  const [filters, setFilters] = useState({
    period: 'Q4_2025',
    department_id: null,
    page: 1,
    page_size: 50,
  });

  const { data, loading, error, refetch } = useReportData(
    report.endpoint,
    filters
  );

  const { exportCSV, exporting } = useReportExport();

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleExport = () => {
    exportCSV(report.endpoint, filters, report.title);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <span>{report.icon}</span>
            <h2>{report.title}</h2>
          </HeaderLeft>
          <HeaderRight>
            <ExportButton onClick={handleExport} disabled={exporting}>
              <FontAwesomeIcon icon={faDownload} />
              {exporting ? 'Exportuji...' : 'Export CSV'}
            </ExportButton>
            <CloseButton onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </HeaderRight>
        </ModalHeader>

        <ModalBody>
          <ReportFilterBar
            filters={filters}
            onChange={handleFilterChange}
          />

          {loading && <LoadingMessage>Načítám data...</LoadingMessage>}
          
          {error && (
            <ErrorMessage>
              ❌ Chyba při načítání dat: {error.message}
            </ErrorMessage>
          )}

          {!loading && !error && data && (
            <>
              <ResultsSummary>
                Nalezeno: <strong>{data.total_count}</strong> záznamů
              </ResultsSummary>

              <ReportDataTable
                data={data.items}
                totalCount={data.total_count}
                page={filters.page}
                pageSize={filters.page_size}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
}

// Styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  span {
    font-size: 2rem;
  }
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
`;

const ExportButton = styled.button`
  padding: 0.5rem 1rem;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: #38a169;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CloseButton = styled.button`
  padding: 0.5rem 1rem;
  background: #e2e8f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover {
    background: #cbd5e0;
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #718096;
  font-size: 1.125rem;
`;

const ErrorMessage = styled.div`
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const ResultsSummary = styled.div`
  margin-bottom: 1rem;
  color: #4a5568;
  font-size: 0.875rem;
  
  strong {
    color: #2d3748;
    font-size: 1rem;
  }
`;
```

---

### 5. ReportDataTable.js

**Zodpovědnost:** Tabulka s daty reportu (využívá @tanstack/react-table)

```javascript
// src/components/reports/ReportDataTable.js

import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSort,
  faSortUp,
  faSortDown,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export default function ReportDataTable({
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
}) {
  // Define columns
  const columns = useMemo(() => [
    {
      accessorKey: 'order_number',
      header: 'Číslo objednávky',
      cell: (info) => <OrderNumber>{info.getValue()}</OrderNumber>,
    },
    {
      accessorKey: 'date',
      header: 'Datum',
      cell: (info) => formatDate(info.getValue()),
    },
    {
      accessorKey: 'supplier_name',
      header: 'Dodavatel',
    },
    {
      accessorKey: 'total_amount',
      header: 'Částka',
      cell: (info) => formatCurrency(info.getValue()),
    },
    {
      accessorKey: 'status',
      header: 'Stav',
      cell: (info) => <StatusBadge status={info.getValue()}>{info.getValue()}</StatusBadge>,
    },
    {
      accessorKey: 'section',
      header: 'Úsek',
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Container>
      <TableContainer>
        <Table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    $sortable={header.column.getCanSort()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getCanSort() && (
                      <SortIcon>
                        <FontAwesomeIcon
                          icon={
                            header.column.getIsSorted() === 'asc'
                              ? faSortUp
                              : header.column.getIsSorted() === 'desc'
                              ? faSortDown
                              : faSort
                          }
                        />
                      </SortIcon>
                    )}
                  </Th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Pagination>
          <PaginationButton
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </PaginationButton>

          <PageInfo>
            Stránka {page} z {totalPages}
          </PageInfo>

          <PaginationButton
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </PaginationButton>
        </Pagination>
      )}
    </Container>
  );
}

// Helper functions
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('cs-CZ');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
  }).format(amount);
};

// Styled components
const Container = styled.div`
  width: 100%;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  background: #f7fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #2d3748;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  
  &:hover {
    background: ${props => props.$sortable ? '#edf2f7' : '#f7fafc'};
  }
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
`;

const SortIcon = styled.span`
  margin-left: 0.5rem;
  color: #a0aec0;
`;

const OrderNumber = styled.span`
  font-weight: 600;
  color: #667eea;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'DOKONCENA': return '#c6f6d5';
      case 'SCHVALENA': return '#bee3f8';
      case 'ROZPRACOVANA': return '#feebc8';
      default: return '#e2e8f0';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'DOKONCENA': return '#22543d';
      case 'SCHVALENA': return '#2c5282';
      case 'ROZPRACOVANA': return '#7c2d12';
      default: return '#2d3748';
    }
  }};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: #5568d3;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: #4a5568;
  font-size: 0.875rem;
`;
```

---

## 🔌 BACKEND API ENDPOINTS

### 1. Objednávky ke zveřejnění

```php
// api.eeo/endpoints/reports/to-publish.php

<?php
require_once '../includes/auth.php';
require_once '../includes/db.php';

// Check authentication
$auth = authenticate();
if (!$auth['success']) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// Check permission
if (!hasPermission($auth['user_id'], 'REPORT_VIEW')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit;
}

// Get filters
$filters = json_decode(file_get_contents('php://input'), true);
$period = $filters['period'] ?? 'all';
$department_id = $filters['department_id'] ?? null;
$page = intval($filters['page'] ?? 1);
$page_size = intval($filters['page_size'] ?? 50);
$count_only = $filters['count_only'] ?? false;

// Build WHERE clause
$where = [];
$params = [];

// Must publish = true
$where[] = "(cena_rok >= 50000 AND zverejneno IS NULL)";

// Period filter
if ($period !== 'all') {
    if (preg_match('/^(\d{4})$/', $period, $m)) {
        // Year
        $where[] = "YEAR(datum_vytvoreni) = ?";
        $params[] = $m[1];
    } elseif (preg_match('/^Q(\d)_(\d{4})$/', $period, $m)) {
        // Quarter
        $quarter = intval($m[1]);
        $year = $m[2];
        $start_month = ($quarter - 1) * 3 + 1;
        $end_month = $quarter * 3;
        $where[] = "YEAR(datum_vytvoreni) = ? AND MONTH(datum_vytvoreni) BETWEEN ? AND ?";
        $params[] = $year;
        $params[] = $start_month;
        $params[] = $end_month;
    }
}

// Department filter
if ($department_id) {
    $where[] = "usek_id = ?";
    $params[] = $department_id;
}

// User permissions (critical!)
if (!hasPermission($auth['user_id'], 'ORDER_VIEW_ALL')) {
    $where[] = "vytvoril_user_id = ?";
    $params[] = $auth['user_id'];
}

$where_clause = implode(' AND ', $where);

// Count only?
if ($count_only) {
    $sql = "SELECT COUNT(*) as total FROM orders25 WHERE $where_clause";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'ok',
        'data' => ['total_count' => intval($result['total'])]
    ]);
    exit;
}

// Get data with pagination
$offset = ($page - 1) * $page_size;

$sql = "
    SELECT 
        o.id as order_id,
        o.cislo_objednavky as order_number,
        o.datum_vytvoreni as date,
        d.nazev as supplier_name,
        o.cena_rok as total_amount,
        o.stav as status,
        u.nazev as section
    FROM orders25 o
    LEFT JOIN dodavatele d ON o.dodavatel_id = d.id
    LEFT JOIN useky u ON o.usek_id = u.id
    WHERE $where_clause
    ORDER BY o.datum_vytvoreni DESC
    LIMIT ? OFFSET ?
";

$params[] = $page_size;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get total count
$count_sql = "SELECT COUNT(*) as total FROM orders25 WHERE $where_clause";
$count_stmt = $pdo->prepare($count_sql);
$count_stmt->execute(array_slice($params, 0, -2)); // Remove LIMIT params
$total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

echo json_encode([
    'status' => 'ok',
    'data' => [
        'items' => $items,
        'total_count' => intval($total_count),
        'page' => $page,
        'page_size' => $page_size,
    ]
]);
```

---

### 2. Čerpání LP

```php
// api.eeo/endpoints/reports/lp-status.php

<?php
require_once '../includes/auth.php';
require_once '../includes/db.php';

$auth = authenticate();
if (!$auth['success']) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

if (!hasPermission($auth['user_id'], 'REPORT_VIEW')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit;
}

$filters = json_decode(file_get_contents('php://input'), true);
$year = intval($filters['year'] ?? date('Y'));
$account_id = $filters['account_id'] ?? null;
$department_id = $filters['department_id'] ?? null;

// Get total LP limit
$sql_limit = "
    SELECT SUM(castka_limit) as total_limit
    FROM lp
    WHERE rok = ?
";
$params_limit = [$year];

if ($account_id) {
    $sql_limit .= " AND ucet_id = ?";
    $params_limit[] = $account_id;
}

if ($department_id) {
    $sql_limit .= " AND usek_id = ?";
    $params_limit[] = $department_id;
}

$stmt = $pdo->prepare($sql_limit);
$stmt->execute($params_limit);
$total_limit = floatval($stmt->fetch(PDO::FETCH_ASSOC)['total_limit'] ?? 0);

// Get total spent
$sql_spent = "
    SELECT SUM(cena_rok) as total_spent
    FROM orders25
    WHERE YEAR(datum_vytvoreni) = ?
    AND stav NOT IN ('ZRUSENA', 'SMAZANA')
";
$params_spent = [$year];

if ($account_id) {
    $sql_spent .= " AND ucet_id = ?";
    $params_spent[] = $account_id;
}

if ($department_id) {
    $sql_spent .= " AND usek_id = ?";
    $params_spent[] = $department_id;
}

$stmt = $pdo->prepare($sql_spent);
$stmt->execute($params_spent);
$total_spent = floatval($stmt->fetch(PDO::FETCH_ASSOC)['total_spent'] ?? 0);

// Calculate remaining and percentage
$remaining = $total_limit - $total_spent;
$percentage = $total_limit > 0 ? ($total_spent / $total_limit) * 100 : 0;

// Get breakdown by accounts
$sql_by_accounts = "
    SELECT 
        u.id as account_id,
        u.nazev as account_name,
        COALESCE(lp.limit_sum, 0) as limit,
        COALESCE(o.spent_sum, 0) as spent,
        COALESCE(lp.limit_sum, 0) - COALESCE(o.spent_sum, 0) as remaining,
        CASE 
            WHEN COALESCE(lp.limit_sum, 0) > 0 
            THEN (COALESCE(o.spent_sum, 0) / lp.limit_sum) * 100 
            ELSE 0 
        END as percentage
    FROM ucty u
    LEFT JOIN (
        SELECT ucet_id, SUM(castka_limit) as limit_sum
        FROM lp
        WHERE rok = ?
        GROUP BY ucet_id
    ) lp ON u.id = lp.ucet_id
    LEFT JOIN (
        SELECT ucet_id, SUM(cena_rok) as spent_sum
        FROM orders25
        WHERE YEAR(datum_vytvoreni) = ?
        AND stav NOT IN ('ZRUSENA', 'SMAZANA')
        GROUP BY ucet_id
    ) o ON u.id = o.ucet_id
    WHERE lp.limit_sum IS NOT NULL OR o.spent_sum IS NOT NULL
";

$stmt = $pdo->prepare($sql_by_accounts);
$stmt->execute([$year, $year]);
$by_accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Similar for departments...

echo json_encode([
    'status' => 'ok',
    'data' => [
        'total_limit' => $total_limit,
        'total_spent' => $total_spent,
        'remaining' => $remaining,
        'percentage' => round($percentage, 2),
        'by_accounts' => $by_accounts,
        // 'by_departments' => $by_departments,
    ]
]);
```

---

## 🎣 CUSTOM HOOKS

### useReportData Hook

```javascript
// src/hooks/useReportData.js

import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { reportsApi } from '../services/reportsApi';

export function useReportData(endpoint, filters = {}) {
  const { username, token } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportsApi.fetch(endpoint, {
        username,
        token,
        filters,
      });

      if (response.status === 'ok') {
        setData(response.data);
      } else {
        throw new Error(response.message || 'Chyba při načítání dat');
      }
    } catch (err) {
      console.error('useReportData error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username && token && endpoint) {
      fetchData();
    }
  }, [endpoint, JSON.stringify(filters)]); // Refetch on filter change

  return { data, loading, error, refetch: fetchData };
}
```

---

### useReportExport Hook

```javascript
// src/hooks/useReportExport.js

import { useState, useContext } from 'react';
import Papa from 'papaparse';
import { UserContext } from '../context/UserContext';
import { reportsApi } from '../services/reportsApi';

export function useReportExport() {
  const { username, token } = useContext(UserContext);
  const [exporting, setExporting] = useState(false);

  const exportCSV = async (endpoint, filters, reportTitle) => {
    setExporting(true);

    try {
      // Fetch all data (without pagination)
      const response = await reportsApi.fetch(endpoint, {
        username,
        token,
        filters: { ...filters, page: 1, page_size: 10000 },
      });

      if (response.status !== 'ok') {
        throw new Error('Chyba při načítání dat pro export');
      }

      const data = response.data.items;

      // Convert to CSV
      const csv = Papa.unparse(data, {
        header: true,
        delimiter: ';',
      });

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Chyba při exportu: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return { exportCSV, exporting };
}
```

---

## 📦 SERVICES

### reportsApi Service

```javascript
// src/services/reportsApi.js

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.eeo.local';

export const reportsApi = {
  /**
   * Generic fetch for any report endpoint
   */
  async fetch(endpoint, payload) {
    try {
      const response = await axios.post(
        `${API_BASE}/reports/${endpoint}`,
        payload,
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      console.error(`reportsApi.fetch(${endpoint}) error:`, error);
      throw error;
    }
  },

  /**
   * Specific methods for each report
   */
  async getToPublish(filters) {
    return this.fetch('to-publish', filters);
  },

  async getOverLimit(filters) {
    return this.fetch('over-limit', filters);
  },

  async getPublished(filters) {
    return this.fetch('published', filters);
  },

  async getInvoiceDiscrepancy(filters) {
    return this.fetch('invoice-discrepancy', filters);
  },

  async getRetroactiveOrders(filters) {
    return this.fetch('retroactive-orders', filters);
  },

  async getUrgentPayments(filters) {
    return this.fetch('urgent-payments', filters);
  },

  async getPendingApprovals(filters) {
    return this.fetch('pending-approvals', filters);
  },

  async getLpStatus(filters) {
    return this.fetch('lp-status', filters);
  },
};
```

---

## 🎨 STYLING PATTERNS

### Theme Colors

```javascript
// src/theme/reportColors.js

export const reportColors = {
  primary: '#667eea',
  primaryHover: '#5568d3',
  
  success: '#48bb78',
  successLight: '#c6f6d5',
  successDark: '#22543d',
  
  warning: '#ed8936',
  warningLight: '#feebc8',
  warningDark: '#7c2d12',
  
  danger: '#f56565',
  dangerLight: '#fed7d7',
  dangerDark: '#c53030',
  
  info: '#4299e1',
  infoLight: '#bee3f8',
  infoDark: '#2c5282',
  
  gray100: '#f7fafc',
  gray200: '#edf2f7',
  gray300: '#e2e8f0',
  gray400: '#cbd5e0',
  gray500: '#a0aec0',
  gray600: '#718096',
  gray700: '#4a5568',
  gray800: '#2d3748',
  gray900: '#1a202c',
};
```

---

## ✅ CHECKLIST IMPLEMENTACE

### Frontend
- [ ] Vytvořit ReportsPage.js s TAB navigací
- [ ] Vytvořit StatisticsPage.js s TAB navigací
- [ ] Implementovat ReportCard komponenty
- [ ] Implementovat ReportModal s filtry
- [ ] Implementovat ReportDataTable (@tanstack/react-table)
- [ ] Vytvořit useReportData hook
- [ ] Vytvořit useReportExport hook
- [ ] Přidat menu items do Layout.js
- [ ] Přidat routes do App.js
- [ ] Aktualizovat availableSections.js

### Backend
- [ ] Vytvořit reports/ endpoints strukturu
- [ ] Implementovat to-publish.php
- [ ] Implementovat over-limit.php
- [ ] Implementovat lp-status.php
- [ ] Implementovat invoice-discrepancy.php
- [ ] Přidat indexy na databázové tabulky
- [ ] Otestovat oprávnění (ORDER_VIEW_OWN vs ORDER_VIEW_ALL)

### Databáze
- [ ] Vytvořit nová práva (REPORT_VIEW, REPORT_EXPORT, atd.)
- [ ] Přiřadit práva k rolím
- [ ] Vytvořit indexy pro optimalizaci dotazů

### Testování
- [ ] Unit testy pro hooks
- [ ] Integration testy pro API
- [ ] E2E testy pro user flow
- [ ] Performance testy (velkých datasetů)
- [ ] Security testy (oprávnění)

---

**Status:** ✅ READY FOR DEVELOPMENT  
**Odhadovaný čas:** 12-15 dní  
**Autor:** AI Assistant  
**Datum:** 27. listopadu 2025
