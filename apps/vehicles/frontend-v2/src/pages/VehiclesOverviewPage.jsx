import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  bulkUpdateVehicleLocationState,
  bulkUpdateVehicleStatus,
  fetchLookupItems,
  fetchDashboardMetrics,
  fetchVehicleDetail,
  fetchVehicleManualEvents,
  fetchVehicles,
  fetchVehicleServiceRecords,
  triggerQuickSync,
} from '../services/apiClient';
import OverviewActionButtons from '../components/vehicles/OverviewActionButtons';
import SyncGate from '../components/vehicles/SyncGate';
import VehiclesTable from '../components/vehicles/VehiclesTable';
import VehicleMonthlyBillingCard from '../components/vehicles/detail/VehicleMonthlyBillingCard';
import AppIcon from '../components/ui/AppIcon';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useAuth } from '../auth/AuthContext';

const VEHICLES_OVERVIEW_FILTERS_LS_KEY = 'vehicles_v2_overview_filters';
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SORT_FIELDS = [
  'spz',
  'zzs_typ',
  'w_popis',
  'w_groupname',
  'w_stanoviste',
  'w_tovarni_znacka',
  'w_model_vozu',
  'w_typ_phm',
  'datum_zarazeni',
  'najeto_km',
  'location_state',
  'last_update',
  'eeo_service_count',
  'dotace',
  'status',
  'has_ccs',
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Všechny stavy' },
  { value: 'aktivni', label: 'Jen aktivní' },
  { value: 'vyrazene', label: 'Jen vyřazené' },
  { value: 'neaktivni', label: 'Jen neaktivní' },
];

const LOCATION_STATE_OPTIONS = [
  { value: 'doma', label: 'Doma' },
  { value: 'v_akci', label: 'V akci' },
  { value: 'v_servisu', label: 'V servisu' },
  { value: 'nezname', label: 'Neznámé' },
];

const CCS_STATE_OPTIONS = [
  { value: 'has', label: 'Má CCS' },
  { value: 'none', label: 'Nemá CCS' },
];
const INITIAL_BULK_SERVICE_FORM = {
  serviceName: '',
  serviceAddress: '',
  serviceContact: '',
  serviceNote: '',
};
const INITIAL_BULK_SERVICE_CANCEL_FORM = {
  cancelReason: 'service_finished',
  serviceNote: '',
};
const INITIAL_STATUS_CHANGE_FORM = {
  statusReason: 'technicka_zavada',
  statusNote: '',
};
const FALLBACK_SERVICE_CANCEL_REASON_OPTIONS = [
  { code: 'service_finished', item_name: 'Servis byl dokončen' },
  { code: 'auto_false_positive', item_name: 'Chybné automatické označení' },
];
const FALLBACK_STATUS_REASON_OPTIONS = [
  { code: 'technicka_zavada', item_name: 'Technická závada' },
  { code: 'planovana_odstavka', item_name: 'Plánovaná odstávka' },
  { code: 'administrativni_blokace', item_name: 'Administrativní blokace' },
  { code: 'k_vyrazeni', item_name: 'K vyřazení' },
  { code: 'jine', item_name: 'Jiný důvod' },
];

function parseCsvValues(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')
    )
  );
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMileageBandLabel(label) {
  const normalized = String(label || '').trim().toUpperCase();
  const map = {
    '0K': '0 - 99 999 km',
    '100K': '100 000 - 199 999 km',
    '200K': '200 000 - 249 999 km',
    '250K': '250 000 - 299 999 km',
    '300K': '300 000 - 399 999 km',
    '400K': '400 000 - 499 999 km',
    '500K+': '500 000+ km',
  };

  return map[normalized] || normalized;
}

function formatDateTimeCs(value) {
  if (!value) {
    return 'Neznámé';
  }

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseServiceContext(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object') {
    return rawValue;
  }

  try {
    const decoded = JSON.parse(String(rawValue));
    return decoded && typeof decoded === 'object' ? decoded : {};
  } catch {
    return {};
  }
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return '-';
  }
  return `${num.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kč`;
}

function printableValue(value, fallback = 'Nezadáno') {
  const normalized = String(value || '').trim();
  return normalized !== '' ? normalized : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function joinNonEmpty(parts, separator = ' • ') {
  const normalized = Array.from(new Set(parts.map((item) => normalizeText(item)).filter((item) => item !== '')));
  return normalized.join(separator);
}

function formatVehicleStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    aktivni: 'Aktivní',
    neaktivni: 'Neaktivní',
    vyrazene: 'Vyřazené',
  };

  return labels[normalized] || printableValue(value, 'Neznámý stav');
}

function formatLocationState(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    doma: 'Doma',
    v_akci: 'V akci',
    v_servisu: 'V servisu',
    nezname: 'Neznámá',
    auto: 'Automatická poloha',
  };

  return labels[normalized] || printableValue(value, 'Nezadáno');
}

function formatEventType(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    service: 'Servis',
    service_start: 'Odesláno do servisu',
    service_cancel: 'Zrušení servisu',
    status_change: 'Změna stavu vozidla',
    technical_inspection: 'Technická kontrola',
    stk: 'Technická kontrola',
    emisni_kontrola: 'Emisní kontrola',
  };

  return labels[normalized] || printableValue(value, 'Událost');
}

function formatEventSource(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    manual: 'Manuální zadání',
    bulk_location_state: 'Hromadná změna polohy',
    bulk_service_cancel: 'Hromadné zrušení servisu',
    bulk_status: 'Hromadná změna stavu',
    sync: 'Synchronizace',
  };

  return labels[normalized] || printableValue(value, 'Neznámý zdroj');
}

function formatCancelReason(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    auto_false_positive: 'Chybné automatické označení',
    service_finished: 'Servis byl dokončen',
  };

  return labels[normalized] || printableValue(value, 'Neurčeno');
}

function formatStatusReason(value) {
  const normalized = normalizeText(value).toLowerCase();
  const labels = {
    technicka_zavada: 'Technická závada',
    planovana_odstavka: 'Plánovaná odstávka',
    administrativni_blokace: 'Administrativní blokace',
    k_vyrazeni: 'K vyřazení',
    jine: 'Jiný důvod',
  };

  return labels[normalized] || printableValue(value, 'Neurčeno');
}

function formatEventState(eventType, value) {
  const eventTypeNormalized = normalizeText(eventType).toLowerCase();
  if (eventTypeNormalized === 'status_change') {
    return formatVehicleStatus(value);
  }

  return formatLocationState(value);
}

function parseEventMetadata(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object') {
    return rawValue;
  }

  try {
    const decoded = JSON.parse(String(rawValue));
    return decoded && typeof decoded === 'object' ? decoded : {};
  } catch {
    return {};
  }
}

function calculateLocationStateCounts(items) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = String(item?.location_state || '').toLowerCase();
    const manualState = String(item?.manual_location_state || '').toLowerCase();
    if (key === 'doma') {
      acc.doma += 1;
    } else if (key === 'v_akci') {
      acc.v_akci += 1;
    } else if (key === 'v_servisu') {
      acc.v_servisu += 1;
      if (manualState === 'v_servisu') {
        acc.v_servisu_manual += 1;
      } else {
        acc.v_servisu_auto += 1;
      }
    } else {
      acc.nezname += 1;
    }
    acc.total += 1;
    return acc;
  }, {
    doma: 0,
    v_akci: 0,
    v_servisu: 0,
    v_servisu_manual: 0,
    v_servisu_auto: 0,
    nezname: 0,
    total: 0,
  });
}

function normalizeLocationStateSummary(summary, fallbackItems = []) {
  if (!summary || typeof summary !== 'object') {
    return calculateLocationStateCounts(fallbackItems);
  }

  const doma = Number(summary.doma || 0);
  const vAkci = Number(summary.v_akci || 0);
  const vServisu = Number(summary.v_servisu || 0);
  const vServisuManualRaw = Number(summary.v_servisu_manual || 0);
  const vServisuAutoRaw = Number(summary.v_servisu_auto || 0);
  const hasSplit = Number.isFinite(vServisuManualRaw + vServisuAutoRaw) && (vServisuManualRaw + vServisuAutoRaw) > 0;
  const vServisuManual = hasSplit ? vServisuManualRaw : 0;
  const vServisuAuto = hasSplit ? vServisuAutoRaw : vServisu;
  const nezname = Number(summary.nezname || 0);
  const computedTotal = doma + vAkci + vServisu + nezname;
  const total = Number(summary.total || computedTotal || 0);

  return {
    doma,
    v_akci: vAkci,
    v_servisu: vServisu,
    v_servisu_manual: vServisuManual,
    v_servisu_auto: vServisuAuto,
    nezname,
    total,
  };
}

export default function VehiclesOverviewPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [bulkModeEnabled, setBulkModeEnabled] = useState(false);
  const [selectedVehicleKeys, setSelectedVehicleKeys] = useState([]);
  const [bulkActionSaving, setBulkActionSaving] = useState(false);
  const [bulkServiceDialogOpen, setBulkServiceDialogOpen] = useState(false);
  const [bulkServiceDialogMode, setBulkServiceDialogMode] = useState('start');
  const [serviceDialogVehicleIds, setServiceDialogVehicleIds] = useState([]);
  const [bulkServiceForm, setBulkServiceForm] = useState(INITIAL_BULK_SERVICE_FORM);
  const [bulkServiceCancelForm, setBulkServiceCancelForm] = useState(INITIAL_BULK_SERVICE_CANCEL_FORM);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogTargetStatus, setStatusDialogTargetStatus] = useState('neaktivni');
  const [statusDialogVehicleIds, setStatusDialogVehicleIds] = useState([]);
  const [statusChangeForm, setStatusChangeForm] = useState(INITIAL_STATUS_CHANGE_FORM);
  const [lookupByCategory, setLookupByCategory] = useState({
    service_cancel_reason: FALLBACK_SERVICE_CANCEL_REASON_OPTIONS,
    vehicle_status_reason: FALLBACK_STATUS_REASON_OPTIONS,
  });
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageVisible, setSyncMessageVisible] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    types: [],
    callSigns: [],
    groups: [],
    stations: [],
    models: [],
    manufacturers: [],
    fuels: [],
    years: [],
    mileageBands: [],
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailDrawerVehicleId, setDetailDrawerVehicleId] = useState(null);
  const [detailDrawerSummary, setDetailDrawerSummary] = useState(null);
  const [detailDrawerItem, setDetailDrawerItem] = useState(null);
  const [detailDrawerEvents, setDetailDrawerEvents] = useState([]);
  const [detailDrawerLoading, setDetailDrawerLoading] = useState(false);
  const [detailDrawerError, setDetailDrawerError] = useState('');
  const [locationStateCounts, setLocationStateCounts] = useState({
    doma: 0,
    v_akci: 0,
    v_servisu: 0,
    v_servisu_manual: 0,
    v_servisu_auto: 0,
    nezname: 0,
    total: 0,
  });
  const [ccsExpirySummary, setCcsExpirySummary] = useState({
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [eeoHistoryModalOpen, setEeoHistoryModalOpen] = useState(false);
  const [eeoHistoryVehicle, setEeoHistoryVehicle] = useState(null);
  const [eeoHistoryOrders, setEeoHistoryOrders] = useState([]);
  const [eeoHistoryLoading, setEeoHistoryLoading] = useState(false);
  const [eeoHistoryError, setEeoHistoryError] = useState('');
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const filterRowRef = useRef(null);
  const loadRequestRef = useRef(0);
  const detailDrawerRequestRef = useRef(0);
  const skipNextDebouncedQuerySyncRef = useRef(false);
  const restoredFromLsRef = useRef(false);
  // Avoids the persist effect wiping the LS backup with the still-empty URL from the same mount tick.
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (restoredFromLsRef.current) {
      return;
    }
    restoredFromLsRef.current = true;

    if (typeof window === 'undefined') {
      return;
    }

    if (searchParams.toString() !== '') {
      return;
    }

    const saved = localStorage.getItem(VEHICLES_OVERVIEW_FILTERS_LS_KEY);
    if (!saved) {
      return;
    }

    const next = new URLSearchParams(saved);
    if (next.toString() === '') {
      return;
    }

    // Prevents the debounced-query sync effect from firing with the stale (pre-restore) input value and wiping the restored "q".
    skipNextDebouncedQuerySyncRef.current = true;
    skipNextPersistRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const serialized = searchParams.toString();
    if (serialized === '') {
      localStorage.removeItem(VEHICLES_OVERVIEW_FILTERS_LS_KEY);
      return;
    }

    localStorage.setItem(VEHICLES_OVERVIEW_FILTERS_LS_KEY, serialized);
  }, [searchParams]);

  const query = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(query);
  const debouncedQueryInput = useDebouncedValue(queryInput, 750);
  // Tracks the last query value we know about (from URL or from a debounced push), so the sync effect below
  // can tell a genuine user edit apart from the URL changing externally (LS restore, browser back, ...).
  const lastSyncedQueryRef = useRef(query);
  const statusRaw = String(searchParams.get('status') || 'all').toLowerCase();
  const status = STATUS_OPTIONS.some((item) => item.value === statusRaw) ? statusRaw : 'all';
  const selectedTypes = useMemo(() => parseCsvValues(searchParams.get('types')), [searchParams]);
  const selectedCallSigns = useMemo(() => parseCsvValues(searchParams.get('callSigns')), [searchParams]);
  const selectedLocationStates = useMemo(() => {
    const raw = parseCsvValues(searchParams.get('locationStates'));
    const allowed = new Set(LOCATION_STATE_OPTIONS.map((item) => item.value));
    return raw.filter((value) => allowed.has(value));
  }, [searchParams]);
  const selectedCcsStates = useMemo(() => {
    const raw = parseCsvValues(searchParams.get('ccsStates'));
    const allowed = new Set(CCS_STATE_OPTIONS.map((item) => item.value));
    return raw.filter((value) => allowed.has(value));
  }, [searchParams]);
  const ccsExpiryFilterRaw = String(searchParams.get('ccsExpiry') || '').trim().toLowerCase();
  const ccsExpiryFilter = ccsExpiryFilterRaw === 'expiring' || ccsExpiryFilterRaw === 'expired'
    ? ccsExpiryFilterRaw
    : '';
  const selectedGroups = useMemo(() => parseCsvValues(searchParams.get('groups')), [searchParams]);
  const selectedStations = useMemo(() => parseCsvValues(searchParams.get('stations')), [searchParams]);
  const selectedModels = useMemo(() => parseCsvValues(searchParams.get('models')), [searchParams]);
  const selectedManufacturers = useMemo(() => parseCsvValues(searchParams.get('manufacturers')), [searchParams]);
  const selectedFuels = useMemo(() => parseCsvValues(searchParams.get('fuels')), [searchParams]);
  const selectedYears = useMemo(() => parseCsvValues(searchParams.get('years')), [searchParams]);
  const selectedMileageBands = useMemo(() => {
    const many = parseCsvValues(searchParams.get('mileageBands'));
    if (many.length > 0) {
      return many.map((value) => String(value).toUpperCase());
    }

    const legacy = String(searchParams.get('mileageBand') || '').trim().toUpperCase();
    return legacy ? [legacy] : [];
  }, [searchParams]);
  const sortByRaw = searchParams.get('sortBy') || 'spz';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'spz';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const displayRows = rows;
  const chartCarIdsParam = searchParams.get('chartCarids') || '';
  const chartCarIds = useMemo(() => {
    if (!chartCarIdsParam) {
      return [];
    }

    return Array.from(
      new Set(
        chartCarIdsParam
          .split(',')
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
  }, [chartCarIdsParam]);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const perPageRaw = parsePositiveInt(searchParams.get('perPage'), 25);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw) ? perPageRaw : 25;
  const currentRole = String(user?.role || '').toLowerCase();
  const canEditVehicles = ['superadmin', 'administrator', 'fleet_manager'].includes(currentRole);

  const serviceCancelReasonOptions = Array.isArray(lookupByCategory.service_cancel_reason) && lookupByCategory.service_cancel_reason.length > 0
    ? lookupByCategory.service_cancel_reason
    : FALLBACK_SERVICE_CANCEL_REASON_OPTIONS;
  const statusReasonOptions = Array.isArray(lookupByCategory.vehicle_status_reason) && lookupByCategory.vehicle_status_reason.length > 0
    ? lookupByCategory.vehicle_status_reason
    : FALLBACK_STATUS_REASON_OPTIONS;

  useEffect(() => {
    let cancelled = false;

    async function loadLookupOptions() {
      try {
        const response = await fetchLookupItems({
          categories: 'service_cancel_reason,vehicle_status_reason',
        });

        if (cancelled) {
          return;
        }

        const byCategory = response?.data?.byCategory || {};

        const nextServiceOptions = Array.isArray(byCategory.service_cancel_reason) && byCategory.service_cancel_reason.length > 0
          ? byCategory.service_cancel_reason
          : FALLBACK_SERVICE_CANCEL_REASON_OPTIONS;
        const nextStatusOptions = Array.isArray(byCategory.vehicle_status_reason) && byCategory.vehicle_status_reason.length > 0
          ? byCategory.vehicle_status_reason
          : FALLBACK_STATUS_REASON_OPTIONS;

        setLookupByCategory({
          service_cancel_reason: nextServiceOptions,
          vehicle_status_reason: nextStatusOptions,
        });
      } catch {
        if (!cancelled) {
          setLookupByCategory({
            service_cancel_reason: FALLBACK_SERVICE_CANCEL_REASON_OPTIONS,
            vehicle_status_reason: FALLBACK_STATUS_REASON_OPTIONS,
          });
        }
      }
    }

    void loadLookupOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const buildVehiclesParams = useCallback((includeFilterOptions = true) => ({
    q: query,
    status,
    sortBy,
    sortDir,
    page,
    perPage,
    chartCarids: chartCarIds.length > 0 ? chartCarIds.join(',') : undefined,
    types: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
    callSigns: selectedCallSigns.length > 0 ? selectedCallSigns.join(',') : undefined,
    groups: selectedGroups.length > 0 ? selectedGroups.join(',') : undefined,
    stations: selectedStations.length > 0 ? selectedStations.join(',') : undefined,
    locationStates: selectedLocationStates.length > 0 ? selectedLocationStates.join(',') : undefined,
    ccsStates: selectedCcsStates.length > 0 ? selectedCcsStates.join(',') : undefined,
    ccsExpiry: ccsExpiryFilter !== '' ? ccsExpiryFilter : undefined,
    models: selectedModels.length > 0 ? selectedModels.join(',') : undefined,
    manufacturers: selectedManufacturers.length > 0 ? selectedManufacturers.join(',') : undefined,
    fuels: selectedFuels.length > 0 ? selectedFuels.join(',') : undefined,
    years: selectedYears.length > 0 ? selectedYears.join(',') : undefined,
    mileageBands: selectedMileageBands.length > 0 ? selectedMileageBands.join(',') : undefined,
    includeFilterOptions: includeFilterOptions ? '1' : '0',
  }), [
    chartCarIds,
    page,
    perPage,
    query,
    selectedFuels,
    selectedGroups,
    selectedCallSigns,
    selectedCcsStates,
    ccsExpiryFilter,
    selectedLocationStates,
    selectedManufacturers,
    selectedMileageBands,
    selectedModels,
    selectedStations,
    selectedTypes,
    selectedYears,
    sortBy,
    sortDir,
    status,
  ]);

  const loadData = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    setLoading(true);
    try {
      const fastResponse = await fetchVehicles(buildVehiclesParams(false));
      if (loadRequestRef.current !== requestId) {
        return;
      }

      setRows(fastResponse?.data?.items || []);
      setTotal(Number(fastResponse?.data?.total || 0));
      setTotalAll(Number(fastResponse?.data?.totalAll || fastResponse?.data?.total || 0));
      setUpdatedAt(fastResponse?.data?.updatedAt || null);
      setLocationStateCounts(normalizeLocationStateSummary(fastResponse?.data?.locationStateSummary, fastResponse?.data?.items || []));
      setCcsExpirySummary({
        expiringSoonCount: Number(fastResponse?.data?.ccsExpirySummary?.expiringSoonCount || 0),
        expiredCount: Number(fastResponse?.data?.ccsExpirySummary?.expiredCount || 0),
      });

      void fetchVehicles(buildVehiclesParams(true))
        .then((optionsResponse) => {
          if (loadRequestRef.current !== requestId) {
            return;
          }

          setFilterOptions(optionsResponse?.data?.filterOptions || {
            types: [],
            callSigns: [],
            groups: [],
            stations: [],
            models: [],
            manufacturers: [],
            fuels: [],
            years: [],
            mileageBands: [],
          });
        })
        .catch(() => {
          // keep current filter options if background load fails
        });
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [
    buildVehiclesParams,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!syncing) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSyncSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [syncing]);

  const updateSearchParams = useCallback((nextState) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      Object.entries(nextState).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });

      return next;
    });
  }, [setSearchParams]);

  // react-router's setSearchParams (and thus updateSearchParams) gets a new identity on every URL change,
  // so the debounce-sync effect below reads it through a ref to avoid re-firing on external URL changes.
  const updateSearchParamsRef = useRef(updateSearchParams);
  useEffect(() => {
    updateSearchParamsRef.current = updateSearchParams;
  });

  useEffect(() => {
    setQueryInput(query);
    lastSyncedQueryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (skipNextDebouncedQuerySyncRef.current) {
      skipNextDebouncedQuerySyncRef.current = false;
      return;
    }

    if (debouncedQueryInput === lastSyncedQueryRef.current) {
      return;
    }

    lastSyncedQueryRef.current = debouncedQueryInput;
    updateSearchParamsRef.current({ q: debouncedQueryInput, page: 1 });
  }, [debouncedQueryInput]);

  async function handleSync() {
    setSyncMessage('');
    setSyncMessageVisible(false);
    setSyncing(true);
    setSyncSeconds(0);

    try {
      const syncResponse = await triggerQuickSync();
      const [summaryResponse] = await Promise.all([
        fetchDashboardMetrics({ status: 'all' }),
        loadData(),
      ]);

      const synchronized = Number(syncResponse?.data?.affectedRows || 0);
      const summary = summaryResponse?.data?.summary || {};
      const active = Number(summary?.active || 0);
      const retired = Number(summary?.retired || 0);
      const inactive = Number(summary?.inactive || 0);

      setSyncMessage(`Synchronizace byla úspěšně dokončena. Synchronizováno: ${synchronized}. Aktivní: ${active}, vyřazené: ${retired}, neaktivní: ${inactive}.`);
      setSyncMessageVisible(true);
    } catch (err) {
      if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
        setSyncMessage('Rychlá synchronizace běží déle než obvykle. Zkuste prosím akci za chvíli znovu.');
        setSyncMessageVisible(true);
        return;
      }

      setSyncMessage('Synchronizace dat se nepodařila.');
      setSyncMessageVisible(true);
    } finally {
      setSyncing(false);
    }
  }

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / perPage));
  }, [perPage, total]);

  useEffect(() => {
    if (page > totalPages) {
      updateSearchParams({ page: totalPages });
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!openFilterKey) {
      return undefined;
    }

    function handleOutsidePointerDown(event) {
      if (!filterRowRef.current) {
        return;
      }

      if (!filterRowRef.current.contains(event.target)) {
        setOpenFilterKey(null);
      }
    }

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [openFilterKey]);

  function handleSortChange(field) {
    const nextDir = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    updateSearchParams({ sortBy: field, sortDir: nextDir, page: 1 });
  }

  function handlePageChange(nextPage) {
    const normalized = Math.min(Math.max(1, nextPage), totalPages);
    updateSearchParams({ page: normalized });
  }

  function toggleMultiFilter(key, values, value) {
    const set = new Set(values);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }

    const next = Array.from(set);
    updateSearchParams({ [key]: next.length > 0 ? next.join(',') : null, page: 1 });
  }

  function clearAllFilters() {
    skipNextDebouncedQuerySyncRef.current = true;
    setQueryInput('');
    updateSearchParams({
      q: '',
      status: 'all',
      types: null,
      groups: null,
      stations: null,
      models: null,
      manufacturers: null,
      fuels: null,
      chartCarids: null,
      callSigns: null,
      locationStates: null,
      ccsStates: null,
      ccsExpiry: null,
      years: null,
      mileageBands: null,
      mileageBand: null,
      page: 1,
    });
  }

  function selectedLabel(values, fallback) {
    if (values.length === 0) {
      return fallback;
    }
    if (values.length === 1) {
      return values[0];
    }
    return `${values.length} vybráno`;
  }

  const hasAnyFilterActive =
    query !== ''
    || status !== 'all'
    || selectedTypes.length > 0
    || selectedCallSigns.length > 0
    || selectedLocationStates.length > 0
    || selectedCcsStates.length > 0
    || ccsExpiryFilter !== ''
    || selectedGroups.length > 0
    || selectedStations.length > 0
    || selectedModels.length > 0
    || selectedManufacturers.length > 0
    || selectedFuels.length > 0
    || selectedYears.length > 0
    || selectedMileageBands.length > 0
    || chartCarIds.length > 0
    || String(searchParams.get('mileageBand') || '').trim() !== '';

  const serviceDialogTargetCount = serviceDialogVehicleIds.length > 0
    ? serviceDialogVehicleIds.length
    : selectedVehicleKeys.length;
  const statusDialogTargetCount = statusDialogVehicleIds.length > 0
    ? statusDialogVehicleIds.length
    : selectedVehicleKeys.length;

  function clearChartFilter() {
    skipNextDebouncedQuerySyncRef.current = true;
    setQueryInput('');
    updateSearchParams({ chartCarids: null, page: 1, q: '' });
  }

  function toggleCcsExpiryFilter(nextFilter) {
    updateSearchParams({
      ccsExpiry: ccsExpiryFilter === nextFilter ? null : nextFilter,
      page: 1,
    });
  }

  const visibleVehicleKeys = useMemo(() => {
    return rows
      .map((item) => {
        const key = item?.id;
        if (key === null || key === undefined || key === '') {
          return null;
        }
        return String(key);
      })
      .filter((value) => value !== null);
  }, [rows]);

  const selectedVisibleCount = useMemo(() => {
    const visibleSet = new Set(visibleVehicleKeys);
    return selectedVehicleKeys.filter((key) => visibleSet.has(key)).length;
  }, [selectedVehicleKeys, visibleVehicleKeys]);

  function handleBulkModeToggle() {
    setBulkModeEnabled((previous) => {
      if (previous) {
        setSelectedVehicleKeys([]);
        setBulkServiceDialogOpen(false);
        setBulkServiceDialogMode('start');
        setServiceDialogVehicleIds([]);
        setBulkServiceForm(INITIAL_BULK_SERVICE_FORM);
        setBulkServiceCancelForm(INITIAL_BULK_SERVICE_CANCEL_FORM);
        setStatusDialogOpen(false);
        setStatusDialogTargetStatus('neaktivni');
        setStatusDialogVehicleIds([]);
        setStatusChangeForm(INITIAL_STATUS_CHANGE_FORM);
      }
      return !previous;
    });
  }

  function handleOpenBulkStatusDialog(nextStatus, targetVehicleId = null) {
    if (bulkActionSaving) {
      return;
    }

    const normalizedStatus = String(nextStatus || '').trim().toLowerCase();
    if (!['aktivni', 'neaktivni'].includes(normalizedStatus)) {
      setSyncMessage('Neplatný cílový stav vozidla.');
      setSyncMessageVisible(true);
      return;
    }

    const singleVehicleId = Number.parseInt(String(targetVehicleId || ''), 10);
    if (Number.isFinite(singleVehicleId) && singleVehicleId > 0) {
      setStatusDialogVehicleIds([singleVehicleId]);
      setStatusDialogTargetStatus(normalizedStatus);
      setStatusChangeForm({
        statusReason: normalizedStatus === 'neaktivni' ? 'technicka_zavada' : '',
        statusNote: '',
      });
      setStatusDialogOpen(true);
      return;
    }

    if (selectedVehicleKeys.length === 0) {
      setSyncMessage('Nejsou vybrána žádná vozidla pro změnu stavu.');
      setSyncMessageVisible(true);
      return;
    }

    setStatusDialogVehicleIds([]);
    setStatusDialogTargetStatus(normalizedStatus);
    setStatusChangeForm({
      statusReason: normalizedStatus === 'neaktivni' ? 'technicka_zavada' : '',
      statusNote: '',
    });
    setStatusDialogOpen(true);
  }

  function handleCloseStatusDialog() {
    if (bulkActionSaving) {
      return;
    }

    setStatusDialogOpen(false);
    setStatusDialogTargetStatus('neaktivni');
    setStatusDialogVehicleIds([]);
    setStatusChangeForm(INITIAL_STATUS_CHANGE_FORM);
  }

  function handleOpenBulkServiceDialog(targetVehicleId = null) {
    if (bulkActionSaving) {
      return;
    }

    const singleVehicleId = Number.parseInt(String(targetVehicleId || ''), 10);
    if (Number.isFinite(singleVehicleId) && singleVehicleId > 0) {
      setServiceDialogVehicleIds([singleVehicleId]);
      setBulkServiceDialogMode('start');
      setBulkServiceDialogOpen(true);
      return;
    }

    if (selectedVehicleKeys.length === 0) {
      setSyncMessage('Nejsou vybrána žádná vozidla pro hromadnou akci.');
      setSyncMessageVisible(true);
      return;
    }

    setServiceDialogVehicleIds([]);
    setBulkServiceDialogMode('start');
    setBulkServiceDialogOpen(true);
  }

  function handleOpenBulkServiceCancelDialog(targetVehicleId = null) {
    if (bulkActionSaving) {
      return;
    }

    const singleVehicleId = Number.parseInt(String(targetVehicleId || ''), 10);
    if (Number.isFinite(singleVehicleId) && singleVehicleId > 0) {
      setServiceDialogVehicleIds([singleVehicleId]);
      setBulkServiceDialogMode('cancel');
      setBulkServiceDialogOpen(true);
      return;
    }

    if (selectedVehicleKeys.length === 0) {
      setSyncMessage('Nejsou vybrána žádná vozidla pro hromadnou akci.');
      setSyncMessageVisible(true);
      return;
    }

    setServiceDialogVehicleIds([]);
    setBulkServiceDialogMode('cancel');
    setBulkServiceDialogOpen(true);
  }

  function handleCloseBulkServiceDialog() {
    if (bulkActionSaving) {
      return;
    }
    setBulkServiceDialogOpen(false);
    setServiceDialogVehicleIds([]);
  }

  function closeDetailDrawer() {
    setDetailDrawerOpen(false);
    setDetailDrawerVehicleId(null);
    setDetailDrawerSummary(null);
    setDetailDrawerItem(null);
    setDetailDrawerEvents([]);
    setDetailDrawerError('');
  }

  async function handleOpenVehicleDetailDrawer(item) {
    const vehicleId = Number(item?.id || 0);
    if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
      setSyncMessage('Vybrané vozidlo nemá validní ID pro načtení detailu.');
      setSyncMessageVisible(true);
      return;
    }

    const requestId = detailDrawerRequestRef.current + 1;
    detailDrawerRequestRef.current = requestId;

    setDetailDrawerVehicleId(vehicleId);
    setDetailDrawerSummary(item || null);
    setDetailDrawerOpen(true);
    setDetailDrawerLoading(true);
    setDetailDrawerError('');

    try {
      const [detailResponse, eventsResponse] = await Promise.all([
        fetchVehicleDetail(vehicleId),
        fetchVehicleManualEvents(vehicleId, { limit: 40 }),
      ]);

      if (detailDrawerRequestRef.current !== requestId) {
        return;
      }

      setDetailDrawerItem(detailResponse?.data?.item || null);
      setDetailDrawerEvents(Array.isArray(eventsResponse?.data?.items) ? eventsResponse.data.items : []);
    } catch (error) {
      if (detailDrawerRequestRef.current !== requestId) {
        return;
      }

      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setDetailDrawerError(message !== '' ? message : 'Detail vozidla se nepodařilo načíst.');
    } finally {
      if (detailDrawerRequestRef.current === requestId) {
        setDetailDrawerLoading(false);
      }
    }
  }

  async function handleShowEeoHistory(vehicle) {
    const spz = String(vehicle?.spz || '').trim();
    if (!spz) {
      setSyncMessage('Vozidlo nemá SPZ pro načtení servisní historie z EEO.');
      setSyncMessageVisible(true);
      return;
    }

    setEeoHistoryVehicle(vehicle);
    setEeoHistoryModalOpen(true);
    setEeoHistoryLoading(true);
    setEeoHistoryError('');
    setEeoHistoryOrders([]);

    try {
      const response = await fetchVehicleServiceRecords(vehicle?.id);
      const records = Array.isArray(response?.data?.items) ? response.data.items : [];
      const orders = records.map((record) => ({
        id: record.id,
        cislo_objednavky: record.external_reference || `SERVIS-${record.id}`,
        stav_objednavky: record.status_code,
        predmet: record.description || record.service_kind_code || record.service_type_code,
        dodavatel_nazev: record.supplier_name,
        dt_dokonceni: record.completed_date,
        dt_objednavky: record.service_date || record.planned_date,
        polozky_celkem: record.cost_amount,
      }));
      setEeoHistoryOrders(orders);
    } catch (error) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setEeoHistoryError(message !== '' ? message : 'Servisní historii se nepodařilo načíst z EEO.');
    } finally {
      setEeoHistoryLoading(false);
    }
  }

  function handleCloseEeoHistory() {
    setEeoHistoryModalOpen(false);
    setEeoHistoryVehicle(null);
    setEeoHistoryOrders([]);
    setEeoHistoryError('');
  }

  function handleToggleVehicleSelection(vehicleKey, checked) {
    const normalizedKey = String(vehicleKey);
    setSelectedVehicleKeys((previous) => {
      const nextSet = new Set(previous);
      if (checked) {
        nextSet.add(normalizedKey);
      } else {
        nextSet.delete(normalizedKey);
      }
      return Array.from(nextSet);
    });
  }

  function handleTogglePageSelection(checked) {
    setSelectedVehicleKeys((previous) => {
      const nextSet = new Set(previous);
      visibleVehicleKeys.forEach((key) => {
        if (checked) {
          nextSet.add(key);
        } else {
          nextSet.delete(key);
        }
      });
      return Array.from(nextSet);
    });
  }

  async function handleBulkMarkAsInService(servicePayload = null) {
    if (bulkActionSaving) {
      return;
    }

    const baseVehicleKeys = serviceDialogVehicleIds.length > 0
      ? serviceDialogVehicleIds.map((id) => String(id))
      : selectedVehicleKeys;

    const vehicleIds = baseVehicleKeys
      .map((key) => Number.parseInt(String(key), 10))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (vehicleIds.length === 0) {
      setSyncMessage('Nejsou vybrána žádná validní vozidla pro hromadnou akci.');
      setSyncMessageVisible(true);
      return;
    }

    setBulkActionSaving(true);
    try {
      const serviceName = String(servicePayload?.serviceName || '').trim();
      const serviceAddress = String(servicePayload?.serviceAddress || '').trim();
      const serviceContact = String(servicePayload?.serviceContact || '').trim();
      const serviceNote = String(servicePayload?.serviceNote || '').trim();
      const hasContext = serviceName !== '' || serviceAddress !== '' || serviceContact !== '';

      const response = await bulkUpdateVehicleLocationState({
        vehicleIds,
        locationState: 'v_servisu',
        serviceContext: hasContext
          ? {
            name: serviceName,
            address: serviceAddress,
            contact: serviceContact,
          }
          : null,
        serviceNote: serviceNote !== '' ? serviceNote : null,
      });

      const updatedCount = Number(response?.data?.updatedCount || 0);
      setSyncMessage(
        serviceDialogVehicleIds.length > 0
          ? `Akce dokončena. Vozidlo bylo označeno jako "v servisu".`
          : `Hromadná akce dokončena. Jako "v servisu" označeno ${updatedCount} vozidel.`
      );
      setSyncMessageVisible(true);
      if (serviceDialogVehicleIds.length === 0) {
        setSelectedVehicleKeys([]);
      }
      setBulkServiceDialogOpen(false);
      setBulkServiceDialogMode('start');
      setServiceDialogVehicleIds([]);
      setBulkServiceForm(INITIAL_BULK_SERVICE_FORM);
      setBulkServiceCancelForm(INITIAL_BULK_SERVICE_CANCEL_FORM);
      await loadData();
    } catch (error) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setSyncMessage(message !== '' ? `Hromadná akce selhala: ${message}` : 'Hromadná akce selhala.');
      setSyncMessageVisible(true);
    } finally {
      setBulkActionSaving(false);
    }
  }

  async function handleBulkCancelService(cancelPayload = null) {
    if (bulkActionSaving) {
      return;
    }

    const baseVehicleKeys = serviceDialogVehicleIds.length > 0
      ? serviceDialogVehicleIds.map((id) => String(id))
      : selectedVehicleKeys;

    const vehicleIds = baseVehicleKeys
      .map((key) => Number.parseInt(String(key), 10))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (vehicleIds.length === 0) {
      setSyncMessage('Nejsou vybrána žádná validní vozidla pro hromadnou akci.');
      setSyncMessageVisible(true);
      return;
    }

    setBulkActionSaving(true);
    try {
      const cancelReason = String(cancelPayload?.cancelReason || '').trim() || 'service_finished';
      const serviceNote = String(cancelPayload?.serviceNote || '').trim();

      const response = await bulkUpdateVehicleLocationState({
        vehicleIds,
        locationState: 'auto',
        serviceContext: null,
        serviceNote: serviceNote !== '' ? serviceNote : null,
        operationType: 'service_cancel',
        cancelReason,
      });

      const updatedCount = Number(response?.data?.updatedCount || 0);
      setSyncMessage(
        serviceDialogVehicleIds.length > 0
          ? 'Akce dokončena. Servis byl u vozidla zrušen.'
          : `Hromadná akce dokončena. Servis byl zrušen u ${updatedCount} vozidel.`
      );
      setSyncMessageVisible(true);
      if (serviceDialogVehicleIds.length === 0) {
        setSelectedVehicleKeys([]);
      }
      setBulkServiceDialogOpen(false);
      setBulkServiceDialogMode('start');
      setServiceDialogVehicleIds([]);
      setBulkServiceForm(INITIAL_BULK_SERVICE_FORM);
      setBulkServiceCancelForm(INITIAL_BULK_SERVICE_CANCEL_FORM);
      await loadData();
    } catch (error) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setSyncMessage(message !== '' ? `Hromadná akce selhala: ${message}` : 'Hromadná akce selhala.');
      setSyncMessageVisible(true);
    } finally {
      setBulkActionSaving(false);
    }
  }

  async function handleBulkSetVehicleStatus(nextStatus, targetVehicleId = null, statusPayload = null) {
    if (bulkActionSaving) {
      return;
    }

    const normalizedStatus = String(nextStatus || '').trim().toLowerCase();
    if (!['aktivni', 'neaktivni'].includes(normalizedStatus)) {
      setSyncMessage('Neplatný cílový stav vozidla.');
      setSyncMessageVisible(true);
      return;
    }

    const normalizedStatusReason = String(statusPayload?.statusReason || '').trim().toLowerCase();
    if (normalizedStatus === 'neaktivni' && normalizedStatusReason === '') {
      setSyncMessage('Doplňte prosím důvod neaktivace vozidla.');
      setSyncMessageVisible(true);
      return;
    }

    const singleVehicleId = Number.parseInt(String(targetVehicleId || ''), 10);
    const baseVehicleKeys = statusDialogVehicleIds.length > 0
      ? statusDialogVehicleIds.map((id) => String(id))
      : (Number.isFinite(singleVehicleId) && singleVehicleId > 0
        ? [String(singleVehicleId)]
        : selectedVehicleKeys);

    const vehicleIds = baseVehicleKeys
      .map((key) => Number.parseInt(String(key), 10))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (vehicleIds.length === 0) {
      setSyncMessage('Nejsou vybrána žádná validní vozidla pro změnu stavu.');
      setSyncMessageVisible(true);
      return;
    }

    setBulkActionSaving(true);
    try {
      const statusNote = String(statusPayload?.statusNote || '').trim();
      const response = await bulkUpdateVehicleStatus({
        vehicleIds,
        status: normalizedStatus,
        statusReason: normalizedStatusReason !== '' ? normalizedStatusReason : null,
        statusNote: statusNote !== '' ? statusNote : null,
      });

      const updatedCount = Number(response?.data?.updatedCount || 0);
      const statusLabel = normalizedStatus === 'aktivni' ? 'aktivní' : 'neaktivní';

      setSyncMessage(
        vehicleIds.length === 1
          ? `Akce dokončena. Vozidlo je nyní ${statusLabel}.`
          : `Hromadná akce dokončena. Na ${statusLabel} nastaveno ${updatedCount} vozidel.`
      );
      setSyncMessageVisible(true);

      const isSingleAction = statusDialogVehicleIds.length === 1 || (Number.isFinite(singleVehicleId) && singleVehicleId > 0);
      if (!isSingleAction) {
        setSelectedVehicleKeys([]);
      }

      setStatusDialogOpen(false);
      setStatusDialogTargetStatus('neaktivni');
      setStatusDialogVehicleIds([]);
      setStatusChangeForm(INITIAL_STATUS_CHANGE_FORM);

      await loadData();
    } catch (error) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setSyncMessage(message !== '' ? `Změna stavu selhala: ${message}` : 'Změna stavu selhala.');
      setSyncMessageVisible(true);
    } finally {
      setBulkActionSaving(false);
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="car" size={20} weight="duotone" />
            <span>Přehled vozidel</span>
          </h2>
          <p className="muted">Aktuální seznam vozidel s možností filtrování a řazení.</p>
        </div>

        <div className="overview-header-actions">
          {Number(ccsExpirySummary.expiringSoonCount || 0) > 0 ? (
            <button
              type="button"
              className={`overview-ccs-expiry-badge overview-ccs-expiry-badge-expiring${ccsExpiryFilter === 'expiring' ? ' is-active' : ''}`}
              onClick={() => toggleCcsExpiryFilter('expiring')}
              title={`Filtrovat vozidla s CCS kartou končící do 3 měsíců. Nalezeno: ${Number(ccsExpirySummary.expiringSoonCount || 0)}`}
              aria-label={`Filtrovat vozidla s CCS kartou končící do 3 měsíců. Nalezeno: ${Number(ccsExpirySummary.expiringSoonCount || 0)}`}
            >
              <AppIcon name="warning" size={14} weight="fill" className="overview-ccs-expiry-badge-icon" />
              <span className="overview-ccs-expiry-badge-label">CCS brzy končí</span>
              <span>{Number(ccsExpirySummary.expiringSoonCount || 0)}</span>
            </button>
          ) : null}

          {Number(ccsExpirySummary.expiredCount || 0) > 0 ? (
            <button
              type="button"
              className={`overview-ccs-expiry-badge overview-ccs-expiry-badge-expired${ccsExpiryFilter === 'expired' ? ' is-active' : ''}`}
              onClick={() => toggleCcsExpiryFilter('expired')}
              title={`Filtrovat vozidla s propadlou CCS kartou. Nalezeno: ${Number(ccsExpirySummary.expiredCount || 0)}`}
              aria-label={`Filtrovat vozidla s propadlou CCS kartou. Nalezeno: ${Number(ccsExpirySummary.expiredCount || 0)}`}
            >
              <AppIcon name="warning" size={14} weight="fill" className="overview-ccs-expiry-badge-icon" />
              <span className="overview-ccs-expiry-badge-label">CCS po splatnosti</span>
              <span>{Number(ccsExpirySummary.expiredCount || 0)}</span>
            </button>
          ) : null}

          <div className="overview-location-legend" aria-label="Legenda polohy vozidel">
            <span className="overview-location-legend-title">Legenda:</span>
            <span className="overview-location-legend-item">
              <span className="overview-location-legend-strip overview-location-legend-strip-doma" aria-hidden="true" />
              <span>Doma ({locationStateCounts.doma})</span>
            </span>
            <span className="overview-location-legend-item">
              <span className="overview-location-legend-strip overview-location-legend-strip-v-akci" aria-hidden="true" />
              <span>V akci ({locationStateCounts.v_akci})</span>
            </span>
            <span className="overview-location-legend-item">
              <span className="overview-location-legend-strip overview-location-legend-strip-v-servisu" aria-hidden="true" />
              <span>V servisu - <span title="Sr = manuální zadání">Sr</span>: {locationStateCounts.v_servisu_manual}, <span title="Sa = automatický stav">Sa</span>: {locationStateCounts.v_servisu_auto}</span>
            </span>
          </div>

          <span className="overview-last-update-pill" title={`Poslední aktualizace: ${formatDateTimeCs(updatedAt)}`}>
            Poslední aktualizace: <strong>{formatDateTimeCs(updatedAt)}</strong>
          </span>

          <OverviewActionButtons
            loading={loading}
            syncing={syncing}
            canResetFilters={hasAnyFilterActive}
            onResetFilters={clearAllFilters}
            onReloadFromDb={loadData}
            onSyncFromWebDispecink={handleSync}
          />
        </div>
      </div>

      <div className="overview-search-row">
        <div className="overview-search-wrap">
          <input
            className="search-input"
            placeholder="Hledat podle SPZ, volacího znaku, výrobce nebo modelu"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          {queryInput ? (
            <button
              className="overview-search-clear-icon"
              type="button"
              onClick={() => {
                skipNextDebouncedQuerySyncRef.current = true;
                setQueryInput('');
                updateSearchParams({ q: '', page: 1 });
              }}
              aria-label="Vymazat fulltext"
              title="Vymazat"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="overview-filter-row" ref={filterRowRef}>
        <label className="overview-filter-item" htmlFor="vehicles-status-filter">
          Stav
          <select
            id="vehicles-status-filter"
            value={status}
            onMouseDown={() => setOpenFilterKey(null)}
            onFocus={() => setOpenFilterKey(null)}
            onChange={(event) => updateSearchParams({ status: event.target.value, page: 1 })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'locationStates'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'locationStates' : null)}
        >
          <summary>
            Poloha: {selectedLabel(
              selectedLocationStates.map((value) => LOCATION_STATE_OPTIONS.find((option) => option.value === value)?.label || value),
              'vše'
            )}
          </summary>
          <div className="overview-multifilter-menu">
            {LOCATION_STATE_OPTIONS.map((option) => (
              <label key={`location-state-${option.value}`} className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedLocationStates.includes(option.value)}
                  onChange={() => toggleMultiFilter('locationStates', selectedLocationStates, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'ccsStates'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'ccsStates' : null)}
        >
          <summary>
            CCS: {selectedLabel(
              selectedCcsStates.map((value) => CCS_STATE_OPTIONS.find((option) => option.value === value)?.label || value),
              'vše'
            )}
          </summary>
          <div className="overview-multifilter-menu">
            {CCS_STATE_OPTIONS.map((option) => (
              <label key={`ccs-state-${option.value}`} className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedCcsStates.includes(option.value)}
                  onChange={() => toggleMultiFilter('ccsStates', selectedCcsStates, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'types'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'types' : null)}
        >
          <summary>Typ vozidla: {selectedLabel(selectedTypes, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.types || []).map((value) => (
              <label key={`type-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedTypes.includes(value)} onChange={() => toggleMultiFilter('types', selectedTypes, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'callSigns'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'callSigns' : null)}
        >
          <summary>Volací znak: {selectedLabel(selectedCallSigns, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.callSigns || []).map((value) => (
              <label key={`call-sign-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedCallSigns.includes(value)} onChange={() => toggleMultiFilter('callSigns', selectedCallSigns, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'manufacturers'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'manufacturers' : null)}
        >
          <summary>Výrobce: {selectedLabel(selectedManufacturers, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.manufacturers || []).map((value) => (
              <label key={`manufacturer-${value}`} className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedManufacturers.includes(value)}
                  onChange={() => toggleMultiFilter('manufacturers', selectedManufacturers, value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'models'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'models' : null)}
        >
          <summary>Model: {selectedLabel(selectedModels, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.models || []).map((value) => (
              <label key={`model-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedModels.includes(value)} onChange={() => toggleMultiFilter('models', selectedModels, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'fuels'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'fuels' : null)}
        >
          <summary>Palivo: {selectedLabel(selectedFuels, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.fuels || []).map((value) => (
              <label key={`fuel-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedFuels.includes(value)} onChange={() => toggleMultiFilter('fuels', selectedFuels, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'stations'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'stations' : null)}
        >
          <summary>Místo: {selectedLabel(selectedStations, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.stations || []).map((value) => (
              <label key={`station-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedStations.includes(value)} onChange={() => toggleMultiFilter('stations', selectedStations, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'groups'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'groups' : null)}
        >
          <summary>Skupina: {selectedLabel(selectedGroups, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.groups || []).map((value) => (
              <label key={`group-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedGroups.includes(value)} onChange={() => toggleMultiFilter('groups', selectedGroups, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'years'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'years' : null)}
        >
          <summary>Rok zařazení: {selectedLabel(selectedYears, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.years || []).map((value) => (
              <label key={`year-${value}`} className="overview-multifilter-option">
                <input type="checkbox" checked={selectedYears.includes(value)} onChange={() => toggleMultiFilter('years', selectedYears, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>

        <details
          className="overview-multifilter"
          open={openFilterKey === 'mileageBands'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'mileageBands' : null)}
        >
          <summary>Nájezd: {selectedLabel(selectedMileageBands.map((value) => formatMileageBandLabel(value)), 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {(filterOptions.mileageBands || []).map((value) => (
              <label key={`mileage-${value}`} className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedMileageBands.includes(String(value).toUpperCase())}
                  onChange={() => toggleMultiFilter('mileageBands', selectedMileageBands, String(value).toUpperCase())}
                />
                <span>{formatMileageBandLabel(value)}</span>
              </label>
            ))}
          </div>
        </details>

      </div>

      {chartCarIds.length > 0 ? (
        <div className="status-box">
          Aktivní filtr z grafu 250k: {chartCarIds.length} vozidel.
        </div>
      ) : null}

      {selectedMileageBands.length > 0 ? (
        <div className="status-box">
          Aktivní filtr nájezdu: {selectedMileageBands.map((value) => formatMileageBandLabel(value)).join(', ')}.
        </div>
      ) : null}

      {selectedTypes.length > 0 ? (
        <div className="status-box">
          Aktivní filtr typu: {selectedTypes.join(', ')}.
        </div>
      ) : null}

      {selectedLocationStates.length > 0 ? (
        <div className="status-box">
          Aktivní filtr polohy: {selectedLocationStates.map((value) => LOCATION_STATE_OPTIONS.find((option) => option.value === value)?.label || value).join(', ')}.
        </div>
      ) : null}

      {selectedCcsStates.length > 0 ? (
        <div className="status-box">
          Aktivní filtr CCS: {selectedCcsStates.map((value) => CCS_STATE_OPTIONS.find((option) => option.value === value)?.label || value).join(', ')}.
        </div>
      ) : null}

      {ccsExpiryFilter === 'expiring' ? (
        <div className="status-box status-box-warning">
          Aktivní filtr CCS: vozidla s kartou končící do 3 měsíců.
        </div>
      ) : null}

      {ccsExpiryFilter === 'expired' ? (
        <div className="status-box status-box-alert">
          Aktivní filtr CCS: vozidla s kartou po splatnosti.
        </div>
      ) : null}

      {syncMessage && syncMessageVisible ? (
        <div className="status-box sync-message-box" role="status" aria-live="polite">
          <span>{syncMessage}</span>
          <button
            type="button"
            className="sync-message-close"
            onClick={() => setSyncMessageVisible(false)}
            aria-label="Skrýt informační hlášku"
            title="Skrýt"
          >
            ×
          </button>
        </div>
      ) : null}

      {syncing ? <SyncGate syncSeconds={syncSeconds} /> : null}

      {canEditVehicles ? (
        <div className={`bulk-ops-panel${bulkModeEnabled ? ' is-enabled' : ''}`} aria-label="Sekce hromadných operací vozidel">
        <div className="bulk-ops-panel-meta">
          <span className="bulk-ops-kicker">Hromadné operace</span>
          <p className="bulk-ops-description">Samostatný režim výběru vozidel pro následné hromadné akce.</p>
        </div>

        <div className="bulk-ops-controls">
          <button
            type="button"
            className={`bulk-mode-toggle${bulkModeEnabled ? ' is-active' : ''}`}
            onClick={handleBulkModeToggle}
          >
            {bulkModeEnabled ? 'Ukončit hromadný výběr' : 'Aktivovat hromadný výběr'}
          </button>

          {bulkModeEnabled ? (
            <button
              type="button"
              className="bulk-selection-clear"
              onClick={() => setSelectedVehicleKeys([])}
              disabled={selectedVehicleKeys.length === 0}
            >
              Vymazat výběr
            </button>
          ) : null}
        </div>
        </div>
      ) : null}

      {canEditVehicles && bulkModeEnabled ? (
        <div className="bulk-toolbar" role="status" aria-live="polite" aria-label="Toolbar hromadných operací">
          <div className="bulk-toolbar-status">
            <strong>Vybráno {selectedVehicleKeys.length}</strong>
            <span>Na této stránce: {selectedVisibleCount}</span>
          </div>

          <div className="bulk-toolbar-actions" role="toolbar" aria-label="Akce hromadného výběru vozidel">
            <button
              type="button"
              className="bulk-toolbar-btn bulk-toolbar-btn-icon-only is-success"
              data-tooltip={bulkActionSaving ? 'Ukládám stav aktivní' : 'Označit vybraná vozidla jako aktivní'}
              aria-label={bulkActionSaving ? 'Ukládám stav aktivní' : 'Označit vybraná vozidla jako aktivní'}
              onClick={() => handleBulkSetVehicleStatus('aktivni')}
              disabled={selectedVehicleKeys.length === 0 || bulkActionSaving}
            >
              <AppIcon name="unlock" size={18} weight="duotone" />
            </button>

            <button
              type="button"
              className="bulk-toolbar-btn bulk-toolbar-btn-icon-only is-danger"
              data-tooltip={bulkActionSaving ? 'Ukládám stav neaktivní' : 'Označit vybraná vozidla jako neaktivní (s důvodem)'}
              aria-label={bulkActionSaving ? 'Ukládám stav neaktivní' : 'Označit vybraná vozidla jako neaktivní (s důvodem)'}
              onClick={() => handleOpenBulkStatusDialog('neaktivni')}
              disabled={selectedVehicleKeys.length === 0 || bulkActionSaving}
            >
              <AppIcon name="lock" size={18} weight="duotone" />
            </button>

            <button
              type="button"
              className="bulk-toolbar-btn bulk-toolbar-btn-icon-only is-primary"
              data-tooltip={bulkActionSaving ? 'Ukládám označení do servisu' : 'Označit vybraná vozidla do servisu'}
              aria-label={bulkActionSaving ? 'Ukládám označení do servisu' : 'Označit vybraná vozidla do servisu'}
              onClick={handleOpenBulkServiceDialog}
              disabled={selectedVehicleKeys.length === 0 || bulkActionSaving}
            >
              <AppIcon name="service" size={18} weight="duotone" />
            </button>

            <button
              type="button"
              className="bulk-toolbar-btn bulk-toolbar-btn-icon-only"
              data-tooltip={bulkActionSaving ? 'Ukládám zrušení servisu' : 'Zrušit servis u vybraných vozidel'}
              aria-label={bulkActionSaving ? 'Ukládám zrušení servisu' : 'Zrušit servis u vybraných vozidel'}
              onClick={handleOpenBulkServiceCancelDialog}
              disabled={selectedVehicleKeys.length === 0 || bulkActionSaving}
            >
              <AppIcon name="approve" size={18} weight="duotone" />
            </button>
          </div>
        </div>
      ) : null}

      {bulkServiceDialogOpen ? (
        <div className="bulk-service-dialog-backdrop" role="presentation" onClick={handleCloseBulkServiceDialog}>
          <div
            className="bulk-service-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Doplnění servisních metadat"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bulk-service-dialog-head">
              <h3>
                {bulkServiceDialogMode === 'cancel'
                  ? (serviceDialogTargetCount === 1 ? 'Zrušit servis u vozidla' : 'Zrušit servis u vybraných vozidel')
                  : (serviceDialogTargetCount === 1 ? 'Označit vozidlo do servisu' : 'Označit vybraná vozidla do servisu')}
              </h3>
              <button
                type="button"
                className="station-edit-close"
                onClick={handleCloseBulkServiceDialog}
                aria-label="Zavřít dialog"
                disabled={bulkActionSaving}
              >
                ×
              </button>
            </div>

            <p className="muted">
              Vybráno vozidel: <strong>{serviceDialogTargetCount}</strong>.
              {bulkServiceDialogMode === 'cancel'
                ? ' Uveďte důvod zrušení. Po ukončení servisu se poloha přepne zpět na automatické vyhodnocení.'
                : ' Volitelné informace se uloží jako metadata servisní události.'}
            </p>

            {bulkServiceDialogMode === 'cancel' ? (
              <>
                <label htmlFor="bulk_service_cancel_reason">Důvod zrušení servisu</label>
                <select
                  id="bulk_service_cancel_reason"
                  value={bulkServiceCancelForm.cancelReason}
                  onChange={(event) => setBulkServiceCancelForm((prev) => ({ ...prev, cancelReason: event.target.value }))}
                  disabled={bulkActionSaving}
                >
                  {serviceCancelReasonOptions.map((optionItem) => {
                    const optionCode = String(optionItem?.code || '').trim();
                    const optionLabel = String(optionItem?.item_name || optionItem?.label || optionCode || '').trim();
                    if (optionCode === '' || optionLabel === '') {
                      return null;
                    }

                    return (
                      <option key={`service-cancel-reason-${optionCode}`} value={optionCode}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>

                <label htmlFor="bulk_service_cancel_note">Poznámka ke zrušení</label>
                <textarea
                  id="bulk_service_cancel_note"
                  rows={4}
                  value={bulkServiceCancelForm.serviceNote}
                  onChange={(event) => setBulkServiceCancelForm((prev) => ({ ...prev, serviceNote: event.target.value }))}
                  placeholder="Např. servis dokončen, převzato zpět na základnu"
                  disabled={bulkActionSaving}
                />
              </>
            ) : (
              <>
                <label htmlFor="bulk_service_name">Název servisu</label>
                <input
                  id="bulk_service_name"
                  type="text"
                  value={bulkServiceForm.serviceName}
                  onChange={(event) => setBulkServiceForm((prev) => ({ ...prev, serviceName: event.target.value }))}
                  placeholder="Např. AutoServis Novák"
                  disabled={bulkActionSaving}
                />

                <label htmlFor="bulk_service_address">Adresa servisu</label>
                <input
                  id="bulk_service_address"
                  type="text"
                  value={bulkServiceForm.serviceAddress}
                  onChange={(event) => setBulkServiceForm((prev) => ({ ...prev, serviceAddress: event.target.value }))}
                  placeholder="Např. U Dílny 12, Kladno"
                  disabled={bulkActionSaving}
                />

                <label htmlFor="bulk_service_contact">Kontakt servisu</label>
                <input
                  id="bulk_service_contact"
                  type="text"
                  value={bulkServiceForm.serviceContact}
                  onChange={(event) => setBulkServiceForm((prev) => ({ ...prev, serviceContact: event.target.value }))}
                  placeholder="Telefon nebo e-mail"
                  disabled={bulkActionSaving}
                />

                <label htmlFor="bulk_service_note">Poznámka k opravě</label>
                <textarea
                  id="bulk_service_note"
                  rows={4}
                  value={bulkServiceForm.serviceNote}
                  onChange={(event) => setBulkServiceForm((prev) => ({ ...prev, serviceNote: event.target.value }))}
                  placeholder="Např. převzetí vozu, rozsah opravy, termín..."
                  disabled={bulkActionSaving}
                />
              </>
            )}

            <div className="bulk-service-dialog-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCloseBulkServiceDialog}
                disabled={bulkActionSaving}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (bulkServiceDialogMode === 'cancel') {
                    handleBulkCancelService(bulkServiceCancelForm);
                    return;
                  }
                  handleBulkMarkAsInService(bulkServiceForm);
                }}
                disabled={bulkActionSaving}
              >
                {bulkActionSaving
                  ? 'Ukládám...'
                  : (bulkServiceDialogMode === 'cancel' ? 'Potvrdit zrušení servisu' : 'Potvrdit a označit do servisu')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusDialogOpen ? (
        <div className="bulk-service-dialog-backdrop" role="presentation" onClick={handleCloseStatusDialog}>
          <div
            className="bulk-service-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Doplnění důvodu změny stavu vozidla"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bulk-service-dialog-head">
              <h3>
                {statusDialogTargetStatus === 'neaktivni'
                  ? (statusDialogTargetCount === 1 ? 'Označit vozidlo jako neaktivní' : 'Označit vybraná vozidla jako neaktivní')
                  : (statusDialogTargetCount === 1 ? 'Označit vozidlo jako aktivní' : 'Označit vybraná vozidla jako aktivní')}
              </h3>
              <button
                type="button"
                className="station-edit-close"
                onClick={handleCloseStatusDialog}
                aria-label="Zavřít dialog"
                disabled={bulkActionSaving}
              >
                ×
              </button>
            </div>

            <p className="muted">
              Vybráno vozidel: <strong>{statusDialogTargetCount}</strong>. Změna se uloží jako událost do historie vozidla.
            </p>

            {statusDialogTargetStatus === 'neaktivni' ? (
              <>
                <label htmlFor="bulk_status_reason">Důvod neaktivace</label>
                <select
                  id="bulk_status_reason"
                  value={statusChangeForm.statusReason}
                  onChange={(event) => setStatusChangeForm((prev) => ({ ...prev, statusReason: event.target.value }))}
                  disabled={bulkActionSaving}
                >
                  {statusReasonOptions.map((optionItem) => {
                    const optionCode = String(optionItem?.code || '').trim();
                    const optionLabel = String(optionItem?.item_name || optionItem?.label || optionCode || '').trim();
                    if (optionCode === '' || optionLabel === '') {
                      return null;
                    }

                    return (
                      <option key={`status-reason-${optionCode}`} value={optionCode}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
              </>
            ) : null}

            <label htmlFor="bulk_status_note">Poznámka</label>
            <textarea
              id="bulk_status_note"
              rows={4}
              value={statusChangeForm.statusNote}
              onChange={(event) => setStatusChangeForm((prev) => ({ ...prev, statusNote: event.target.value }))}
              placeholder="Např. mimo provoz do dokončení opravy"
              disabled={bulkActionSaving}
            />

            <div className="bulk-service-dialog-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCloseStatusDialog}
                disabled={bulkActionSaving}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleBulkSetVehicleStatus(statusDialogTargetStatus, null, statusChangeForm)}
                disabled={bulkActionSaving || (statusDialogTargetStatus === 'neaktivni' && String(statusChangeForm.statusReason || '').trim() === '')}
              >
                {bulkActionSaving ? 'Ukládám...' : 'Potvrdit změnu stavu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <VehiclesTable
        items={displayRows}
        sortField={sortBy}
        sortDirection={sortDir}
        onSortChange={handleSortChange}
        showSelectionColumn={bulkModeEnabled}
        selectedRowKeys={selectedVehicleKeys}
        onToggleRowSelection={handleToggleVehicleSelection}
        onTogglePageSelection={handleTogglePageSelection}
        onOpenVehicleDetail={handleOpenVehicleDetailDrawer}
        onMarkVehicleInService={canEditVehicles ? ((item) => handleOpenBulkServiceDialog(item?.id)) : undefined}
        onCancelVehicleService={canEditVehicles ? ((item) => handleOpenBulkServiceCancelDialog(item?.id)) : undefined}
        onSetVehicleStatusActive={canEditVehicles ? ((item) => handleBulkSetVehicleStatus('aktivni', item?.id)) : undefined}
        onSetVehicleStatusInactive={canEditVehicles ? ((item) => handleOpenBulkStatusDialog('neaktivni', item?.id)) : undefined}
        canEditVehicleCard={canEditVehicles}
        onShowEeoHistory={handleShowEeoHistory}
      />

      {detailDrawerOpen ? (
        <div className="vehicle-detail-drawer-backdrop" role="presentation" onClick={closeDetailDrawer}>
          <aside
            className="vehicle-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Detail vozidla"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vehicle-detail-drawer-head vehicle-detail-drawer-hero">
              <div className="vehicle-detail-drawer-head-main">
                <p className="vehicle-detail-drawer-kicker">Rychlý detail vozidla</p>
                <h3>
                  {(() => {
                    const manufacturer = printableValue(
                      detailDrawerItem?.w_tovarni_znacka || detailDrawerSummary?.w_tovarni_znacka,
                      'Nezadáno'
                    );
                    const model = printableValue(
                      detailDrawerItem?.w_model_vozu || detailDrawerSummary?.w_model_vozu,
                      'Nezadáno'
                    );
                    const webdispecinkCarId = String(
                      detailDrawerSummary?.legacy_carid || detailDrawerItem?.legacy_carid || ''
                    ).trim();
                    const title = `${manufacturer} ${model}`.trim();

                    return (
                      <>
                        {title}
                        {webdispecinkCarId !== '' ? (
                          <sup className="vehicle-detail-drawer-wd-id" title="WebDispečink ID vozidla">
                            #{webdispecinkCarId}
                          </sup>
                        ) : null}
                      </>
                    );
                  })()}
                </h3>
                <p className="vehicle-detail-drawer-subline">
                  <AppIcon name="detail" size={14} weight="duotone" />
                  <strong>{printableValue(detailDrawerSummary?.w_popis, 'Bez volacího znaku')}</strong>
                  <span>•</span>
                  <span>{printableValue(detailDrawerSummary?.spz, `ID ${detailDrawerVehicleId || '-'}`)}</span>
                </p>
                <p className="vehicle-detail-drawer-subline vehicle-detail-drawer-subline-secondary">
                  <AppIcon name="mapLocate" size={14} weight="duotone" />
                  <strong>Místo:</strong>
                  <span>{printableValue(detailDrawerSummary?.w_stanoviste)}</span>
                  <span>•</span>
                  <strong>Skupina:</strong>
                  <span>{printableValue(detailDrawerSummary?.w_groupname)}</span>
                </p>
              </div>

              <div className="vehicle-detail-drawer-head-side">
                <button
                  type="button"
                  className="station-edit-close"
                  onClick={closeDetailDrawer}
                  aria-label="Zavřít detail vozidla"
                >
                  ×
                </button>

                <span className="vehicle-detail-drawer-status-pill">{formatVehicleStatus(detailDrawerSummary?.status)}</span>
              </div>
            </div>

            {detailDrawerLoading ? (
              <p className="muted">Načítám detail a historii událostí...</p>
            ) : null}

            {detailDrawerError ? (
              <div className="status-box status-box-warning">{detailDrawerError}</div>
            ) : null}

            {!detailDrawerLoading ? (
              <div className="vehicle-detail-drawer-body">
                <section className="vehicle-detail-drawer-block">
                  <h4>
                    <AppIcon name="car" size={16} weight="duotone" />
                    <span>Základní data</span>
                  </h4>
                  <div className="vehicle-detail-drawer-grid">
                    <p><strong>SPZ:</strong> {printableValue(detailDrawerSummary?.spz)}</p>
                    <p><strong>Volací znak:</strong> {printableValue(detailDrawerSummary?.w_popis)}</p>
                    <p><strong>Typ:</strong> {printableValue(detailDrawerSummary?.zzs_typ)}</p>
                    <p><strong>Stav:</strong> {formatVehicleStatus(detailDrawerSummary?.status)}</p>
                    <p><strong>Výrobce:</strong> {printableValue(detailDrawerSummary?.w_tovarni_znacka)}</p>
                    <p><strong>Model:</strong> {printableValue(detailDrawerSummary?.w_model_vozu)}</p>
                    <p><strong>Palivo:</strong> {printableValue(detailDrawerSummary?.w_typ_phm)}</p>
                    <p><strong>Poslední aktualizace:</strong> {formatDateTimeCs(detailDrawerSummary?.last_update)}</p>
                  </div>
                </section>

                <section className="vehicle-detail-drawer-block">
                  <h4>
                    <AppIcon name="edit" size={16} weight="duotone" />
                    <span>Detail karty</span>
                  </h4>
                  {(() => {
                    const detail = detailDrawerItem || {};
                    const serviceContext = parseServiceContext(detail.service_context_json);
                    return (
                      <div className="vehicle-detail-drawer-grid">
                        <p><strong>ZZS typ:</strong> {printableValue(detail.zzs_typ)}</p>
                        <p><strong>Stanoviště:</strong> {printableValue(detailDrawerSummary?.w_stanoviste)}</p>
                        <p><strong>Servis (název):</strong> {printableValue(serviceContext.name || serviceContext.service_name)}</p>
                        <p><strong>Servis (adresa):</strong> {printableValue(serviceContext.address || serviceContext.service_address)}</p>
                        <p><strong>Servis (kontakt):</strong> {printableValue(serviceContext.contact || serviceContext.service_contact)}</p>
                        <p><strong>Manuální poloha:</strong> {formatLocationState(detail.manual_location_state)}</p>
                        <p className="vehicle-detail-drawer-grid-full"><strong>Poznámka k opravě:</strong> {printableValue(detail.service_notes, 'Bez poznámky')}</p>
                        <p><strong>Pojistka:</strong> {printableValue(detail.insurance_policy)}</p>
                        <p><strong>STK do:</strong> {printableValue(detail.stk_valid_to)}</p>
                      </div>
                    );
                  })()}
                </section>

                <VehicleMonthlyBillingCard
                  vehicleId={Number(detailDrawerVehicleId || 0)}
                  carName={joinNonEmpty([
                    detailDrawerSummary?.w_tovarni_znacka,
                    detailDrawerSummary?.w_model_vozu,
                    detailDrawerSummary?.spz,
                  ], ' ')}
                />

                <section className="vehicle-detail-drawer-block">
                  <h4>
                    <AppIcon name="legacy" size={16} weight="duotone" />
                    <span>Historie událostí</span>
                  </h4>
                  {detailDrawerEvents.length === 0 ? (
                    <p className="muted">Zatím bez uložených událostí.</p>
                  ) : (
                    <div className="vehicle-detail-events-list">
                      {detailDrawerEvents.map((eventItem) => {
                        const eventMetadata = parseEventMetadata(eventItem.metadata_json);
                        const operation = normalizeText(eventMetadata.operation).toLowerCase();
                        const eventTypeNormalized = normalizeText(eventItem.event_type).toLowerCase();
                        const isServiceCancelEvent = operation === 'service_cancel' || normalizeText(eventItem.event_type).toLowerCase() === 'service_cancel';
                        const isStatusChangeEvent = eventTypeNormalized === 'status_change' || operation === 'status_activate' || operation === 'status_deactivate';
                        const linkedServiceAt = normalizeText(eventMetadata.linked_service_effective_at || eventMetadata.linked_service_created_at);
                        const linkedServiceEventId = Number.parseInt(String(eventMetadata.linked_service_event_id || ''), 10);

                        return (
                          <article key={`event-${eventItem.id}`} className="vehicle-detail-event-item">
                            <div className="vehicle-detail-event-head">
                              <strong>{formatEventType(eventItem.event_type)}</strong>
                              <span>{formatDateTimeCs(eventItem.effective_at || eventItem.created_at)}</span>
                            </div>
                            <p className="vehicle-detail-event-meta">
                              Stav: {formatEventState(eventItem.event_type, eventItem.event_state)} • Zdroj: {formatEventSource(eventItem.source)}
                            </p>
                            {isStatusChangeEvent ? (
                              <p className="vehicle-detail-event-meta">
                                Důvod změny stavu: {formatStatusReason(eventMetadata.status_reason)}
                              </p>
                            ) : null}
                            {isServiceCancelEvent ? (
                              <p className="vehicle-detail-event-meta">
                                Důvod zrušení: {formatCancelReason(eventMetadata.cancel_reason)}
                              </p>
                            ) : null}
                            {isServiceCancelEvent && linkedServiceAt !== '' ? (
                              <p className="vehicle-detail-event-meta">
                                Navázáno na odeslání do servisu: {formatDateTimeCs(linkedServiceAt)}
                                {Number.isFinite(linkedServiceEventId) && linkedServiceEventId > 0 ? ` (událost #${linkedServiceEventId})` : ''}
                              </p>
                            ) : null}
                            {(eventItem.service_name || eventItem.service_address || eventItem.service_contact) ? (
                              <p className="vehicle-detail-event-meta">
                                {eventItem.service_name ? `Servis: ${eventItem.service_name}` : ''}
                                {eventItem.service_address ? ` • Adresa: ${eventItem.service_address}` : ''}
                                {eventItem.service_contact ? ` • Kontakt: ${eventItem.service_contact}` : ''}
                              </p>
                            ) : null}
                            <p>{printableValue(eventItem.note, 'Bez poznámky')}</p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {eeoHistoryModalOpen ? (() => {
        // Spočítat celkový součet cen ze všech objednávek
        const totalEeoPrice = eeoHistoryOrders.reduce((sum, order) => {
          const price = Number(order?.faktura_celkem) > 0 
            ? Number(order?.faktura_celkem) 
            : Number(order?.polozky_celkem || 0);
          return sum + price;
        }, 0);

        return (
          <div className="vehicle-detail-drawer-backdrop" role="presentation" onClick={handleCloseEeoHistory}>
            <aside
              className="vehicle-detail-drawer eeo-history-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Servisní historie z EEO"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="vehicle-detail-drawer-head">
                <div className="vehicle-detail-drawer-head-main">
                  <h3>
                    <AppIcon name="legacy" size={20} weight="duotone" />
                    <span>Servisní historie z EEO</span>
                  </h3>
                  <p className="vehicle-detail-drawer-subline">
                    <strong>{printableValue(eeoHistoryVehicle?.spz)}</strong>
                    <span>•</span>
                    <span>{printableValue(eeoHistoryVehicle?.w_popis, 'Bez volacího znaku')}</span>
                  </p>
                </div>
                <div className="vehicle-detail-drawer-head-side">
                  <button
                    type="button"
                    className="station-edit-close"
                    onClick={handleCloseEeoHistory}
                    aria-label="Zavřít servisní historii"
                  >
                    ×
                  </button>
                  {eeoHistoryOrders.length > 0 && (
                    <div className="eeo-total-price">
                      <strong>{formatMoney(totalEeoPrice)}</strong>
                    </div>
                  )}
                </div>
              </div>

            <div className="vehicle-detail-drawer-body">
              {eeoHistoryLoading ? (
                <p className="muted">Načítám servisní historii z EEO...</p>
              ) : null}

              {eeoHistoryError ? (
                <div className="status-box status-box-warning">{eeoHistoryError}</div>
              ) : null}

              {!eeoHistoryLoading && !eeoHistoryError && eeoHistoryOrders.length === 0 ? (
                <p className="muted">V EEO nebyly nalezeny servisní objednávky pro toto vozidlo.</p>
              ) : null}

              {!eeoHistoryLoading && eeoHistoryOrders.length > 0 ? (
                <div className="eeo-history-list">
                  {eeoHistoryOrders.map((order, index) => {
                    const orderNumber = order?.cislo_objednavky || '-';
                    const orderState = order?.stav_objednavky || '-';
                    const orderSubject = order?.predmet || '-';
                    const supplier = order?.dodavatel_nazev || '-';
                    const sentDate = formatDateTimeCs(order?.dt_odeslani);
                    
                    // Prioritně zobrazit dt_dokonceni, pokud není, tak dt_akceptace
                    const completedDate = order?.dt_dokonceni;
                    const acceptedDate = order?.dt_akceptace;
                    const displayDate = completedDate || acceptedDate || order?.dt_odeslani || order?.dt_objednavky;
                    const displayDateFormatted = formatDateTimeCs(displayDate);
                    const displayLabel = completedDate ? 'Dokončeno' : 'Potvrzeno';
                    
                    const total = Number(order?.faktura_celkem) > 0 ? formatMoney(order?.faktura_celkem) : formatMoney(order?.polozky_celkem);
                    const stateClass = normalizeText(orderState).includes('dokonc') ? 'done' : 'default';

                    return (
                      <article key={`order-${order?.id || index}`} className="eeo-history-item">
                        <div className="eeo-history-head">
                          <strong>{orderNumber}</strong>
                          <span className="eeo-history-price">{total}</span>
                        </div>
                        <p className="eeo-history-subject">{orderSubject}</p>
                        <div className="eeo-history-meta">
                          <span>Odesláno: {sentDate}</span>
                          <span>{displayLabel}: {displayDateFormatted}</span>
                        </div>
                        <div className="eeo-history-meta">
                          <span>{supplier}</span>
                          <span className={`eeo-history-state ${stateClass}`}>{orderState}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
        );
      })() : null}

      <div className="table-footer-controls">
        <p className="muted">
          Zobrazeno {rows.length} z {total} položek{query ? ` (celkem: ${totalAll})` : ''}.
        </p>

        <div className="table-pager-controls">
          <label className="table-page-size" htmlFor="vehicles-page-size">
            Na stránku
            <select
              id="vehicles-page-size"
              value={perPage}
              onChange={(event) => updateSearchParams({ perPage: Number(event.target.value), page: 1 })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>
            Předchozí
          </button>
          <span className="table-page-indicator">
            Strana {Math.min(page, totalPages)} / {totalPages}
          </span>
          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>
            Další
          </button>
        </div>
      </div>
    </section>
  );
}
