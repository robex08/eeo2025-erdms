import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faSync, faFilter, faLayerGroup, faGripVertical, faXmark, faPlus, faMinus, faSearch, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AuthContext } from '../context/AuthContext';
import { listMajetekOrdersV3 } from '../services/apiOrdersV3';
import { formatDateOnly } from '../utils/format';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import { CustomSelect } from '../components/CustomSelect';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: transparent;
  padding: 1.5rem 1rem 2rem;
`;

const PageContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1.5rem;
  color: white;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  order: 2;

  @media (max-width: 768px) {
    order: 1;
    width: 100%;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  order: 1;

  @media (max-width: 768px) {
    order: 2;
    width: 100%;
    justify-content: center;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
`;

const FilterPanel = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FilterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SearchField = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #64748b;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    color: #1e293b;
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.95rem;
  color: #1e293b;
  background: transparent;

  &::placeholder {
    color: #94a3b8;
  }
`;

const PeriodSelector = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  option {
    background: #1e40af;
    color: white;
  }
`;

const ReloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 0.9rem;
    animation: ${props => props.$loading ? 'spin 1s linear infinite' : 'none'};
  }
`;

const FilterLabel = styled.div`
  font-size: 0.85rem;
  color: #475569;
  font-weight: 600;
  margin-right: 0.35rem;
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin: 0;
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  text-align: right;
`;

const SummaryLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1e40af;
  margin-bottom: 0.25rem;
  text-align: right;
`;

const SummaryValue = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  text-align: right;
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
  font-family: "Roboto Condensed", "Roboto", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

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

  tbody tr.base-row:hover {
    background: #eef2ff;
  }

  tbody tr.group-row:hover {
    background: #e0e7ff;
  }

  tbody tr.child-row:hover {
    background: #f1f5f9;
  }

  tbody tr.base-row:nth-of-type(even) {
    background: #fbfdff;
  }

  tbody tr.group-row {
    background: #f1f5ff;
    font-weight: 600;
    color: #1e3a8a;
  }

  tbody tr.group-row.group-depth-0 { background: #eef2ff; }
  tbody tr.group-row.group-depth-1 { background: #e0e7ff; }
  tbody tr.group-row.group-depth-2 { background: #dbeafe; }
  tbody tr.group-row.group-depth-3 { background: #e0f2fe; }

  tbody tr.child-row {
    background: #f8fafc;
    color: #334155;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
`;

const AggregationPanel = styled.div`
  margin-top: 1.5rem;
  margin-bottom: 1.75rem;
  display: grid;
  grid-template-columns: 7fr 3fr;
  gap: 1.25rem;
  align-items: stretch;
`;

const AggregationLeft = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(280px, 2fr);
  gap: 1.25rem;
  align-items: stretch;
`;

const FiltersAndAggregation = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1.25rem;
  align-items: stretch;
`;

const AggregationChartPanel = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ChartContainer = styled.div`
  flex: 1;
  min-height: 0;
  height: 100%;
`;


const ChartPlaceholder = styled.div`
  flex: 1;
  border-radius: 10px;
  background: repeating-linear-gradient(
    -45deg,
    rgba(59, 130, 246, 0.08),
    rgba(59, 130, 246, 0.08) 12px,
    rgba(59, 130, 246, 0.16) 12px,
    rgba(59, 130, 246, 0.16) 24px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e3a8a;
  font-weight: 600;
  font-size: 0.95rem;
`;

const AggregationBox = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  min-height: 120px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  background: #eef2f7;
  color: #334155;
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
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
`;

const ChipIndex = styled.sup`
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.25rem;
  line-height: 1;
`;

const ChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
`;

const AggregationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
  justify-content: flex-end;
  align-self: flex-start;
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
  const { token, username, userDetail } = useContext(AuthContext);
  const isMountedRef = useRef(false);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const userId = userDetail?.user_id;
  const getUserKey = useCallback((baseKey) => {
    const sid = userId || 'anon';
    return `${baseKey}_${sid}`;
  }, [userId]);

  const getUserStorage = useCallback((baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }, [getUserKey]);

  const setUserStorage = useCallback((baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby zápisu
    }
  }, [getUserKey]);

  const [pagination, setPagination] = useState(() => ({
    page: 1,
    per_page: getUserStorage('majetek_per_page', 50),
    total: 0,
    total_pages: 0
  }));
  const [period, setPeriod] = useState(() => getUserStorage('majetek_period', 'last-month'));
  const [selectedStatuses, setSelectedStatuses] = useState(() => getUserStorage('majetek_statuses', []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupFields, setGroupFields] = useState(() => getUserStorage('majetek_group_fields', []));
  const [globalSearch, setGlobalSearch] = useState(() => getUserStorage('majetek_global_search', ''));
  const [expanded, setExpanded] = useState({});
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});

  const handleStatusFilterChange = useCallback((value) => {
    if (Array.isArray(value)) {
      setSelectedStatuses(value);
      return;
    }
    if (Array.isArray(value?.target?.value)) {
      setSelectedStatuses(value.target.value);
      return;
    }
    setSelectedStatuses([]);
  }, []);

  const handleItemsPerPageChange = (value) => {
    setPagination(prev => ({ ...prev, per_page: Number(value) }));
  };

  const statusOptions = [
    { id: 'ROZPRACOVANA', label: 'Rozpracovaná' },
    { id: 'ODESLANA', label: 'Odeslaná' },
    { id: 'POTVRZENA', label: 'Potvrzená' },
    { id: 'K_UVEREJNENI_DO_REGISTRU', label: 'K uveřejnění' },
    { id: 'FAKTURACE', label: 'Fakturace' },
    { id: 'VECNA_SPRAVNOST', label: 'Věcná správnost' },
    { id: 'ZKONTROLOVANA', label: 'Zkontrolovaná' },
    { id: 'DOKONCENA', label: 'Dokončená' }
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

      if (!isMountedRef.current) return;
      const pageOrders = response?.data?.orders || [];
      const pagePagination = response?.data?.pagination || { page, per_page: pagination.per_page, total: 0, total_pages: 0 };
      setOrders(pageOrders);
      setPagination(pagePagination);

      const totalCount = Number(pagePagination.total || 0);
      const perPage = Number(pagePagination.per_page || 0);
      if (totalCount > 0 && totalCount > perPage) {
        try {
          const allResponse = await listMajetekOrdersV3({
            token,
            username,
            page: 1,
            per_page: totalCount,
            period,
            filters: selectedStatuses.length ? { stav: selectedStatuses } : {}
          });
          if (!isMountedRef.current) return;
          setAllOrders(allResponse?.data?.orders || pageOrders);
        } catch (allErr) {
          if (!isMountedRef.current) return;
          setAllOrders(pageOrders);
        }
      } else {
        setAllOrders(pageOrders);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Nepodařilo se načíst data');
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, [token, username, period, selectedStatuses, pagination.per_page]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [period, selectedStatuses, fetchData, token, username]);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [pagination.per_page, fetchData, token, username]);

  useEffect(() => {
    setUserStorage('majetek_period', period);
  }, [period, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_statuses', selectedStatuses);
  }, [selectedStatuses, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_global_search', globalSearch);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [globalSearch, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_group_fields', groupFields);
  }, [groupFields, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_per_page', pagination.per_page);
  }, [pagination.per_page, setUserStorage]);

  const toggleSelect = useCallback((field) => {
    setSelectStates(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

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

  const aggregationSource = useMemo(() => (allOrders.length ? allOrders : orders), [allOrders, orders]);

  const summary = useMemo(() => {
    const totalOrders = aggregationSource.length;
    const totalInvoices = aggregationSource.reduce((acc, order) => acc + Number(order.faktury_celkova_castka_s_dph || 0), 0);
    const ordersWithInvoices = aggregationSource.filter(order => Number(order.pocet_faktur || 0) > 0).length;
    return { totalOrders, totalInvoices, ordersWithInvoices };
  }, [aggregationSource]);

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
    const normalized = aggregationSource.map(order => ({
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
  }, [aggregationSource, globalSearch]);

  const aggregationData = tableData;

  const pagedTableData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.per_page;
    const end = start + pagination.per_page;
    return tableData.slice(start, end);
  }, [tableData, pagination.page, pagination.per_page]);

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
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    columnHelper.accessor(row => Number(row.polozky_celkova_cena_s_dph || 0), {
      id: 'polozky_celkova_cena_s_dph',
      header: 'Součet položek (s DPH)',
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    columnHelper.accessor(row => Number(row.pocet_faktur || 0), {
      id: 'pocet_faktur',
      header: 'Faktury (ks)',
      aggregationFn: 'sum',
      cell: info => (
        <span style={{ display: 'block', textAlign: 'center' }}>
          {info.getValue()}
        </span>
      ),
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'center' }}>
          {info.getValue()}
        </span>
      )
    }),
    columnHelper.accessor(row => Number(row.faktury_celkova_castka_s_dph || 0), {
      id: 'faktury_celkova_castka_s_dph',
      header: 'Faktury (s DPH)',
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    })
  ], [columnHelper]);

  const table = useReactTable({
    data: pagedTableData,
    columns,
    state: {
      grouping: groupFields,
      expanded
    },
    autoResetPageIndex: false,
    onGroupingChange: setGroupFields,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableGrouping: true
  });

  const chartInfo = useMemo(() => {
    const primaryField = groupFields[0];
    if (!primaryField) return null;
    const secondaryField = groupFields[1] || null;
    const buckets = new Map();

    const getValue = (row, field) => {
      if (!field) return 'Celkem';
      const raw = row?.[field];
      if (Array.isArray(raw)) return raw.length ? raw.join(', ') : 'Neurčeno';
      return raw ? String(raw) : 'Neurčeno';
    };

    aggregationData.forEach(row => {
      const primary = getValue(row, primaryField);
      const secondary = secondaryField ? getValue(row, secondaryField) : 'Celkem';
      if (!buckets.has(primary)) buckets.set(primary, new Map());
      const inner = buckets.get(primary);
      if (!inner.has(secondary)) inner.set(secondary, { items: 0, invoices: 0 });
      const entry = inner.get(secondary);
      entry.items += 1;
      entry.invoices += Number(row?.faktury_celkova_castka_s_dph || 0);
    });

    const primaryTotals = Array.from(buckets.entries()).map(([label, inner]) => {
      let total = 0;
      inner.forEach(value => { total += value.items; });
      return { label, total };
    });
    const sortedPrimaries = primaryTotals.sort((a, b) => b.total - a.total).slice(0, 10);
    const labels = sortedPrimaries.map(entry => entry.label);

    const secondaryTotals = new Map();
    buckets.forEach(inner => {
      inner.forEach((value, key) => {
        secondaryTotals.set(key, (secondaryTotals.get(key) || 0) + value.invoices);
      });
    });
    const sortedSecondary = Array.from(secondaryTotals.entries())
      .sort((a, b) => b[1] - a[1]);
    const topLimit = 10;
    const topSecondary = sortedSecondary.slice(0, topLimit).map(entry => entry[0]);
    const hasOther = sortedSecondary.length > topLimit;

    if (hasOther) {
      buckets.forEach(inner => {
        let otherItems = 0;
        let otherInvoices = 0;
        Array.from(inner.keys()).forEach(key => {
          if (!topSecondary.includes(key)) {
            const entry = inner.get(key);
            otherItems += entry?.items || 0;
            otherInvoices += entry?.invoices || 0;
            inner.delete(key);
          }
        });
        if (otherItems > 0 || otherInvoices > 0) {
          inner.set('Ostatní', { items: otherItems, invoices: otherInvoices });
        }
      });
    }

    const secondaryLabels = new Set();
    sortedPrimaries.forEach(entry => {
      const inner = buckets.get(entry.label);
      inner?.forEach((_, key) => secondaryLabels.add(key));
    });

    return {
      labels,
      secondaryLabels: Array.from(secondaryLabels),
      buckets
    };
  }, [aggregationData, groupFields]);

  const chartPalette = [
    'rgba(59, 130, 246, 0.65)',
    'rgba(14, 116, 144, 0.65)',
    'rgba(99, 102, 241, 0.65)',
    'rgba(16, 185, 129, 0.65)',
    'rgba(245, 158, 11, 0.65)',
    'rgba(239, 68, 68, 0.65)',
    'rgba(124, 58, 237, 0.65)',
    'rgba(2, 132, 199, 0.65)'
  ];

  const buildInvoiceDatasets = useCallback(() => {
    if (!chartInfo) return [];
    return chartInfo.secondaryLabels.map((secondary, index) => {
      const data = chartInfo.labels.map(label => {
        const inner = chartInfo.buckets.get(label);
        const entry = inner?.get(secondary);
        return entry?.invoices || 0;
      });
      const itemsData = chartInfo.labels.map(label => {
        const inner = chartInfo.buckets.get(label);
        const entry = inner?.get(secondary);
        return entry?.items || 0;
      });
      const color = chartPalette[index % chartPalette.length];
      return {
        label: secondary,
        data,
        itemsData,
        backgroundColor: color,
        borderColor: color.replace('0.65', '1'),
        borderWidth: 1,
        borderRadius: 6,
        stack: 'invoices'
      };
    });
  }, [chartInfo, chartPalette]);

  const chartData = useMemo(() => {
    if (!chartInfo) return null;
    return {
      labels: chartInfo.labels,
      datasets: buildInvoiceDatasets()
    };
  }, [chartInfo, buildInvoiceDatasets]);

  const hasMultipleStacks = (chartInfo?.secondaryLabels?.length || 0) > 1;

  const stackedOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', display: hasMultipleStacks },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const value = context.parsed?.y || 0;
            const items = context.dataset?.itemsData?.[context.dataIndex] || 0;
            return `${context.dataset.label}: ${items} ks, ${formatCurrency(value)}`;
          }
        }
      },
      datalabels: {
        color: '#ffffff',
        anchor: 'center',
        align: 'center',
        clamp: true,
        display: (context) => {
          const items = context.dataset?.itemsData?.[context.dataIndex];
          return Number(items) > 0;
        },
        formatter: (value, context) => {
          const items = context.dataset?.itemsData?.[context.dataIndex];
          return items ? `${items}` : '';
        },
        font: {
          size: 11,
          weight: '700'
        }
      }
    },
    scales: {
      x: { stacked: hasMultipleStacks, ticks: { color: '#1e293b', maxRotation: 30, minRotation: 0 } },
      y: {
        stacked: hasMultipleStacks,
        ticks: {
          color: '#1e293b',
          precision: 0,
          beginAtZero: true,
          callback: (value) => formatCurrency(value)
        }
      }
    }
  }), [hasMultipleStacks]);

  const totalItems = tableData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pagination.per_page)));

  const normalizeGroupLabel = useCallback((value) => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Neurčeno';
    if (value == null || value === '') return 'Neurčeno';
    return String(value);
  }, []);

  const getGroupedCount = useCallback((row) => {
    if (!chartInfo || !groupFields.length) return row.subRows.length;

    if (row.depth === 0 && groupFields[0]) {
      const label = normalizeGroupLabel(row.getValue(groupFields[0]));
      const inner = chartInfo.buckets.get(label);
      if (!inner) return row.subRows.length;
      let total = 0;
      inner.forEach(value => { total += value.items; });
      return total;
    }

    if (row.depth === 1 && groupFields[0] && groupFields[1]) {
      const parent = row.getParentRow?.();
      const primaryLabel = normalizeGroupLabel(parent?.getValue(groupFields[0]));
      const secondaryLabel = normalizeGroupLabel(row.getValue(groupFields[1]));
      const inner = chartInfo.buckets.get(primaryLabel);
      const entry = inner?.get(secondaryLabel);
      if (entry) return entry.items;
    }

    return row.subRows.length;
  }, [chartInfo, groupFields, normalizeGroupLabel]);

  useEffect(() => {
    if (pagination.page > totalPages) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [pagination.page, totalPages]);

  const handlePageChange = useCallback((nextPage) => {
    setPagination(prev => ({ ...prev, page: nextPage }));
  }, []);

  return (
    <PageWrapper>
      <PageContainer>
        <Header>
          <TitleSection>
            <Title>
              <FontAwesomeIcon icon={faList} /> Přehled majetku
            </Title>
          </TitleSection>

          <HeaderActions>
            <PeriodSelector value={period} onChange={(e) => setPeriod(e.target.value)} disabled={loading}>
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </PeriodSelector>
            <ReloadButton
              onClick={() => fetchData(1)}
              disabled={loading}
              $loading={loading}
              title="Obnovit data"
              aria-label="Obnovit data"
            >
              <FontAwesomeIcon icon={faSync} />
            </ReloadButton>
          </HeaderActions>
        </Header>

        <Card>
          <AggregationPanel>
            <FiltersAndAggregation>
              <FilterPanel>
                <FilterHeader>
                  <FilterTitle>
                    <FontAwesomeIcon icon={faFilter} /> Filtry
                  </FilterTitle>
                </FilterHeader>

                <FilterGrid>
                  <FilterItem>
                    <FilterLabel>Hledání</FilterLabel>
                    <SearchField>
                      <FontAwesomeIcon icon={faSearch} />
                      <SearchInput
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        placeholder="Hledat v tabulce"
                      />
                    </SearchField>
                  </FilterItem>
                  <FilterItem>
                    <FilterLabel>Stavy</FilterLabel>
                    <CustomSelect
                      field="majetek_stavy"
                      value={selectedStatuses}
                      onChange={handleStatusFilterChange}
                      options={statusOptions}
                      placeholder="Vyber stavy"
                      multiple
                      isClearable
                      enableSearch
                      selectStates={selectStates}
                      setSelectStates={setSelectStates}
                      searchStates={searchStates}
                      setSearchStates={setSearchStates}
                      toggleSelect={toggleSelect}
                      getOptionLabel={(option) => option?.label || option?.id || ''}
                    />
                  </FilterItem>
                </FilterGrid>
              </FilterPanel>

              <AggregationLeft>
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
                  {groupFields.length > 0 && (
                    <ChipsWrap>
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
                            <ChipIndex>{index + 1}</ChipIndex>
                            <ChipButton onClick={() => setGroupFields(prev => prev.filter(id => id !== fieldId))}>
                              <FontAwesomeIcon icon={faXmark} />
                            </ChipButton>
                          </Chip>
                        );
                      })}
                    </ChipsWrap>
                  )}
                </AggregationBox>
                <AggregationBox>
                  <AggregationTitle>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FontAwesomeIcon icon={faLayerGroup} /> Připravená pole
                    </span>
                  </AggregationTitle>
                  <ChipsWrap>
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
                  </ChipsWrap>
                </AggregationBox>
              </AggregationLeft>
              <SummaryRow>
                <SummaryCard>
                  <SummaryLabel>Celkem objednávek</SummaryLabel>
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
            </FiltersAndAggregation>
            <AggregationChartPanel>
              <AggregationTitle>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FontAwesomeIcon icon={faChartBar} /> Agregační graf
                </span>
              </AggregationTitle>
              {chartData ? (
                <ChartContainer>
                  <Bar data={chartData} options={stackedOptions} />
                </ChartContainer>
              ) : (
                <ChartPlaceholder>Zapni grouping pro graf</ChartPlaceholder>
              )}
            </AggregationChartPanel>
          </AggregationPanel>

          {error && (
            <PlaceholderBox>
              <PlaceholderTitle>Chyba načtení</PlaceholderTitle>
              <PlaceholderText>{error}</PlaceholderText>
            </PlaceholderBox>
          )}

          {!error && (
            <>
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
                      <tr
                        key={row.id}
                        className={row.getIsGrouped()
                          ? `group-row group-depth-${row.depth}`
                          : row.depth > 0
                            ? 'child-row'
                            : 'base-row'
                        }
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>
                            {cell.getIsGrouped() ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: `${row.depth * 12}px` }}>
                                <button
                                  onClick={row.getToggleExpandedHandler()}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                  <FontAwesomeIcon icon={row.getIsExpanded() ? faMinus : faPlus} />
                                </button>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())} ({getGroupedCount(row)})
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

              {totalItems > 0 && (
                <OrdersPaginationV3
                  currentPage={pagination.page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={pagination.per_page}
                  onPageChange={handlePageChange}
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
