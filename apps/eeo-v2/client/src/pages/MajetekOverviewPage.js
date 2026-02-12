import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faRotateRight, faFilter, faLayerGroup, faGripVertical, faXmark, faChevronRight, faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { listMajetekOrdersV3 } from '../services/apiOrdersV3';
import { formatDateOnly } from '../utils/format';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 2rem 1rem;
`;

const PageContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: white;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 14px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
`;

const Toolbar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const ToolGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  min-width: 220px;
`;

const Select = styled.select`
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  background: white;
  color: #1e293b;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: ${props => props.$primary ? '#2563eb' : 'white'};
  color: ${props => props.$primary ? 'white' : '#2563eb'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatusChip = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #dbe2f8;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  background: #f8fafc;
  color: #1f2937;
  cursor: pointer;

  input {
    margin: 0;
  }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
`;

const SummaryLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1e40af;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;

  th, td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    font-size: 0.9rem;
  }

  th {
    background: #f8fafc;
    color: #1e293b;
    font-weight: 700;
  }

  tbody tr:hover {
    background: #f1f5f9;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
`;

const AggregationPanel = styled.div`
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(280px, 2fr);
  gap: 1.25rem;
  align-items: start;
`;

const AggregationBox = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  min-height: 120px;
`;

const AggregationTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
`;

const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`;

const ChipButton = styled.button`
  border: none;
  background: transparent;
  color: #4f46e5;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
`;

const AggregationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  border: 1px solid #cbd5f5;
  background: white;
  color: #1e40af;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eef2ff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


const HintText = styled.div`
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
`;


const PlaceholderBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  text-align: center;
`;

const PlaceholderTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
`;

const PlaceholderText = styled.p`
  margin: 0;
  color: #4b5563;
  max-width: 520px;
`;

export default function MajetekOverviewPage() {
  const { token, username } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 0 });
  const [period, setPeriod] = useState('last-month');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupFields, setGroupFields] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const handleItemsPerPageChange = (value) => {
    setPagination(prev => ({ ...prev, per_page: Number(value) }));
  };

  const statusOptions = [
    { value: 'ROZPRACOVANA', label: 'Rozpracovaná' },
    { value: 'ODESLANA', label: 'Odeslaná' },
    { value: 'POTVRZENA', label: 'Potvrzená' },
    { value: 'K_UVEREJNENI_DO_REGISTRU', label: 'K uveřejnění' },
    { value: 'FAKTURACE', label: 'Fakturace' },
    { value: 'VECNA_SPRAVNOST', label: 'Věcná správnost' },
    { value: 'ZKONTROLOVANA', label: 'Zkontrolovaná' },
    { value: 'DOKONCENA', label: 'Dokončená' }
  ];

  const periodOptions = [
    { value: 'last-month', label: 'Poslední měsíc' },
    { value: 'current-month', label: 'Aktuální měsíc' },
    { value: 'last-quarter', label: 'Poslední kvartál' },
    { value: 'all-months', label: 'Aktuální rok' },
    { value: 'all', label: 'Vše' }
  ];

  const groupOptions = [
    { id: 'dodavatel', columnId: 'dodavatel_nazev', label: 'Dodavatel' },
    { id: 'druh', columnId: 'druh_objednavky_nazev', label: 'Druh objednávky' },
    { id: 'stav', columnId: 'workflow_last', label: 'Stav workflow' },
    { id: 'strediska', columnId: 'strediska_nazvy', label: 'Střediska' },
    { id: 'usek', columnId: 'usek_kod', label: 'Úsek' },
    { id: 'budova', columnId: 'budova_kod', label: 'Budova' },
    { id: 'mistnost', columnId: 'mistnost_kod', label: 'Místnost' },
    { id: 'rok', columnId: 'rok', label: 'Rok' }
  ];

  const fetchData = useCallback(async (page = 1) => {
    if (!token || !username) return;
    setLoading(true);
    setError('');

    try {
      const response = await listMajetekOrdersV3({
        token,
        username,
        page,
        per_page: pagination.per_page,
        period,
        filters: selectedStatuses.length ? { stav: selectedStatuses } : {}
      });

      setOrders(response?.data?.orders || []);
      setPagination(response?.data?.pagination || { page, per_page: pagination.per_page, total: 0, total_pages: 0 });
    } catch (err) {
      setError(err?.message || 'Nepodařilo se načíst data');
    } finally {
      setLoading(false);
    }
  }, [token, username, period, selectedStatuses, pagination.per_page]);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [period, selectedStatuses, fetchData, token, username]);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [pagination.per_page, fetchData, token, username]);

  const toggleStatus = (status) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
  };

  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(number);
  };

  const getLocationSummary = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return '-';
    const unique = new Map();
    items.forEach(item => {
      const key = [item.usek_kod, item.budova_kod, item.mistnost_kod].filter(Boolean).join(' / ');
      if (!key) return;
      unique.set(key, item.poznamka || '');
    });
    return Array.from(unique.keys()).slice(0, 3).join(' • ');
  };

  const getUniqueCode = (items = [], key) => {
    if (!Array.isArray(items) || items.length === 0) return '';
    const values = Array.from(new Set(items.map(item => item[key]).filter(Boolean)));
    if (values.length === 0) return '';
    return values.length === 1 ? values[0] : 'Více';
  };

  const getWorkflowLast = (workflow) => {
    if (Array.isArray(workflow) && workflow.length > 0) {
      return workflow[workflow.length - 1];
    }
    if (typeof workflow === 'string') return workflow;
    return '-';
  };

  const workflowLabels = {
    NOVA: 'Nová',
    ODESLANA_KE_SCHVALENI: 'Odeslaná ke schválení',
    SCHVALENA: 'Schválená',
    ZAMITNUTA: 'Zamítnutá',
    ROZPRACOVANA: 'Rozpracovaná',
    ODESLANA: 'Odeslaná',
    POTVRZENA: 'Potvrzená',
    UVEREJNIT: 'K uveřejnění',
    K_UVEREJNENI_DO_REGISTRU: 'K uveřejnění',
    FAKTURACE: 'Fakturace',
    VECNA_SPRAVNOST: 'Věcná správnost',
    ZKONTROLOVANA: 'Zkontrolovaná',
    DOKONCENA: 'Dokončená',
    ZRUSENA: 'Zrušená',
    SMAZANA: 'Smazaná',
    UVEREJNENA: 'Uveřejněná'
  };

  const getWorkflowLabel = (status) => {
    if (!status) return '-';
    const key = String(status).toUpperCase();
    return workflowLabels[key] || status;
  };

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalInvoices = orders.reduce((acc, order) => acc + Number(order.faktury_celkova_castka_s_dph || 0), 0);
    const ordersWithInvoices = orders.filter(order => Number(order.pocet_faktur || 0) > 0).length;
    return { totalOrders, totalInvoices, ordersWithInvoices };
  }, [orders]);

  const availableGroupOptions = useMemo(() => {
    return groupOptions.filter(opt => !groupFields.includes(opt.columnId));
  }, [groupFields]);

  const handleDropGroup = (event) => {
    event.preventDefault();
    const optionId = event.dataTransfer.getData('text/plain');
    const option = groupOptions.find(opt => opt.id === optionId || opt.columnId === optionId);
    if (!option || groupFields.includes(option.columnId)) return;
    setGroupFields(prev => [...prev, option.columnId]);
  };

  const handleReorderGroup = (fromIndex, toIndex) => {
      const handleItemsPerPageChange = (value) => {
        setPagination(prev => ({ ...prev, per_page: Number(value) }));
      };

    if (fromIndex === toIndex) return;
    setGroupFields(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const tableData = useMemo(() => {
    const normalized = orders.map(order => ({
      ...order,
      workflow_last: getWorkflowLabel(getWorkflowLast(order.stav_workflow_kod)),
      umisteni_summary: getLocationSummary(order.umisteni_polozky),
      usek_kod: getUniqueCode(order.umisteni_polozky, 'usek_kod'),
      budova_kod: getUniqueCode(order.umisteni_polozky, 'budova_kod'),
      mistnost_kod: getUniqueCode(order.umisteni_polozky, 'mistnost_kod'),
      rok: order.dt_objednavky ? new Date(order.dt_objednavky).getFullYear() : ''
    }));

    if (!globalSearch) return normalized;
    const needle = globalSearch.toLowerCase();
    return normalized.filter(row => {
      return [
        row.cislo_objednavky,
        row.predmet,
        row.dodavatel_nazev,
        row.workflow_last,
        row.strediska_nazvy,
        row.umisteni_summary,
        row.usek_kod,
        row.budova_kod,
        row.mistnost_kod
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle));
    });
  }, [orders, globalSearch]);

  const columnHelper = useMemo(() => createColumnHelper(), []);

  const columns = useMemo(() => [
    columnHelper.accessor('budova_kod', {
      header: 'Budova',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('usek_kod', {
      header: 'Úsek',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('mistnost_kod', {
      header: 'Místnost',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('dt_objednavky', {
      header: 'Datum obj.',
      cell: info => formatDateOnly(info.getValue()),
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('cislo_objednavky', {
      header: 'Ev. číslo',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('dodavatel_nazev', {
      header: 'Dodavatel',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('predmet', {
      header: 'Předmět',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('workflow_last', {
      header: 'Stav',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('druh_objednavky_nazev', {
      header: 'Druh objednávky',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('strediska_nazvy', {
      header: 'Střediska',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('rok', {
      header: 'Rok',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('umisteni_summary', {
      header: 'Umístění',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor(row => Number(row.max_cena_s_dph || 0), {
      id: 'max_cena_s_dph',
      header: 'Max cena s DPH',
      cell: info => formatCurrency(info.getValue()),
      aggregationFn: 'sum',
      aggregatedCell: info => formatCurrency(info.getValue())
    }),
    columnHelper.accessor(row => Number(row.polozky_celkova_cena_s_dph || 0), {
      id: 'polozky_celkova_cena_s_dph',
      header: 'Součet položek (s DPH)',
      cell: info => formatCurrency(info.getValue()),
      aggregationFn: 'sum',
      aggregatedCell: info => formatCurrency(info.getValue())
    }),
    columnHelper.accessor(row => Number(row.pocet_faktur || 0), {
      id: 'pocet_faktur',
      header: 'Faktury (ks)',
      aggregationFn: 'sum',
      cell: info => info.getValue()
    }),
    columnHelper.accessor(row => Number(row.faktury_celkova_castka_s_dph || 0), {
      id: 'faktury_celkova_castka_s_dph',
      header: 'Faktury (s DPH)',
      cell: info => formatCurrency(info.getValue()),
      aggregationFn: 'sum',
      aggregatedCell: info => formatCurrency(info.getValue())
    })
  ], [columnHelper]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      grouping: groupFields,
      expanded
    },
    onGroupingChange: setGroupFields,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableGrouping: true
  });

  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faList} /> Přehled majetku
          </PageTitle>
        </PageHeader>

        <Card>
          <Toolbar>
            <ToolGroup>
              <FontAwesomeIcon icon={faFilter} />
              <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </ToolGroup>

            <ToolGroup>
              <FontAwesomeIcon icon={faSearch} />
              <SearchInput
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Hledat v tabulce"
              />
            </ToolGroup>

            <ToolGroup>
              <StatusList>
                {statusOptions.map(option => (
                  <StatusChip key={option.value}>
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                    />
                    {option.label}
                  </StatusChip>
                ))}
              </StatusList>
            </ToolGroup>

            <ToolGroup>
              <Select
                value={pagination.per_page}
                onChange={(e) => setPagination(prev => ({ ...prev, per_page: Number(e.target.value) }))}
              >
                {[25, 50, 100, 250].map(size => (
                  <option key={size} value={size}>{size} / stránku</option>
                ))}
              </Select>
              <Button $primary onClick={() => fetchData(1)} disabled={loading}>
                <FontAwesomeIcon icon={faRotateRight} /> Načíst
              </Button>
            </ToolGroup>
          </Toolbar>

          {error && (
            <PlaceholderBox>
              <PlaceholderTitle>Chyba načtení</PlaceholderTitle>
              <PlaceholderText>{error}</PlaceholderText>
            </PlaceholderBox>
          )}

          {!error && (
            <>
              <AggregationPanel>
                <AggregationBox onDragOver={(e) => e.preventDefault()} onDrop={handleDropGroup}>
                  <AggregationTitle>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FontAwesomeIcon icon={faLayerGroup} /> Agregace (grouping)
                    </span>
                    <AggregationActions>
                      <ActionButton
                        type="button"
                        onClick={() => setGroupFields([])}
                        disabled={groupFields.length === 0}
                        title="Odebrat všechny agregace"
                      >
                        Zrušit vše
                      </ActionButton>
                      <ActionButton
                        type="button"
                        onClick={() => setGroupFields(groupOptions.map(opt => opt.columnId))}
                        disabled={groupFields.length === groupOptions.length}
                        title="Přidat všechna pole do agregace"
                      >
                        Přidat vše
                      </ActionButton>
                    </AggregationActions>
                  </AggregationTitle>
                  {groupFields.length === 0 && (
                    <PlaceholderText>Sem přetáhni pole pro agregaci.</PlaceholderText>
                  )}
                  {groupFields.map((fieldId, index) => {
                    const meta = groupOptions.find(opt => opt.columnId === fieldId);
                    return (
                      <Chip
                        key={fieldId}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', fieldId);
                          e.dataTransfer.setData('from-index', String(index));
                        }}
                        onDrop={(e) => {
                          const fromIndex = Number(e.dataTransfer.getData('from-index'));
                          if (!Number.isInteger(fromIndex)) return;
                          handleReorderGroup(fromIndex, index);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon icon={faGripVertical} />
                        {meta?.label || fieldId}
                        <ChipButton onClick={() => setGroupFields(prev => prev.filter(id => id !== fieldId))}>
                          <FontAwesomeIcon icon={faXmark} />
                        </ChipButton>
                      </Chip>
                    );
                  })}
                  <HintText>Po změně se tabulka přepočítá okamžitě.</HintText>
                </AggregationBox>

                <div>
                  <AggregationTitle>
                    <FontAwesomeIcon icon={faLayerGroup} /> Připravená pole
                  </AggregationTitle>
                  <AggregationBox>
                    {availableGroupOptions.map(option => (
                      <Chip
                        key={option.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', option.id)}
                      >
                        <FontAwesomeIcon icon={faGripVertical} />
                        {option.label}
                      </Chip>
                    ))}
                  </AggregationBox>
                </div>
              </AggregationPanel>

              <SummaryRow>
                <SummaryCard>
                  <SummaryLabel>Celkem objednávek (stránka)</SummaryLabel>
                  <SummaryValue>{summary.totalOrders}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Objednávky s fakturou</SummaryLabel>
                  <SummaryValue>{summary.ordersWithInvoices}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Faktury celkem (s DPH)</SummaryLabel>
                  <SummaryValue>{formatCurrency(summary.totalInvoices)}</SummaryValue>
                </SummaryCard>
              </SummaryRow>

              <TableWrapper>
                <Table>
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={columns.length}>
                          <EmptyState>Načítám data…</EmptyState>
                        </td>
                      </tr>
                    )}
                    {!loading && table.getRowModel().rows.length === 0 && (
                      <tr>
                        <td colSpan={columns.length}>
                          <EmptyState>Žádné záznamy pro zvolený filtr.</EmptyState>
                        </td>
                      </tr>
                    )}
                    {!loading && table.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>
                            {cell.getIsGrouped() ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: `${row.depth * 12}px` }}>
                                <button
                                  onClick={row.getToggleExpandedHandler()}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                  <FontAwesomeIcon icon={row.getIsExpanded() ? faChevronDown : faChevronRight} />
                                </button>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                              </span>
                            ) : cell.getIsAggregated() ? (
                              flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                            ) : cell.getIsPlaceholder() ? null : (
                              flexRender(cell.column.columnDef.cell, cell.getContext())
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>

              <HintText>
                Agregace i souhrny jsou počítané z aktuální stránky. Pro další stránku použij stránkování níže.
              </HintText>

              {pagination.total > 0 && (
                <OrdersPaginationV3
                  currentPage={pagination.page}
                  totalPages={pagination.total_pages || 1}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.per_page}
                  onPageChange={fetchData}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={loading}
                />
              )}

            </>
          )}
        </Card>
      </PageContainer>
    </PageWrapper>
  );
}
