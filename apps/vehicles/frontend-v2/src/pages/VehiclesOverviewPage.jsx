import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDashboardMetrics, fetchVehicles, triggerQuickSync } from '../services/apiClient';
import OverviewActionButtons from '../components/vehicles/OverviewActionButtons';
import SyncGate from '../components/vehicles/SyncGate';
import VehiclesTable from '../components/vehicles/VehiclesTable';
import AppIcon from '../components/ui/AppIcon';
import useDebouncedValue from '../hooks/useDebouncedValue';

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
  'last_update',
  'dotace',
  'status',
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
];
const LOCATION_FILTER_FETCH_PAGE_SIZE = 200;

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

function calculateLocationStateCounts(items) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = String(item?.location_state || '').toLowerCase();
    if (key === 'doma') {
      acc.doma += 1;
    } else if (key === 'v_akci') {
      acc.v_akci += 1;
    } else if (key === 'v_servisu') {
      acc.v_servisu += 1;
    } else {
      acc.nezname += 1;
    }
    acc.total += 1;
    return acc;
  }, {
    doma: 0,
    v_akci: 0,
    v_servisu: 0,
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
  const nezname = Number(summary.nezname || 0);
  const computedTotal = doma + vAkci + vServisu + nezname;
  const total = Number(summary.total || computedTotal || 0);

  return {
    doma,
    v_akci: vAkci,
    v_servisu: vServisu,
    nezname,
    total,
  };
}

export default function VehiclesOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
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
  const [locationStateCounts, setLocationStateCounts] = useState({
    doma: 0,
    v_akci: 0,
    v_servisu: 0,
    nezname: 0,
    total: 0,
  });
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const filterRowRef = useRef(null);
  const loadRequestRef = useRef(0);
  const skipNextDebouncedQuerySyncRef = useRef(false);
  const restoredFromLsRef = useRef(false);

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

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
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
  const statusRaw = String(searchParams.get('status') || 'all').toLowerCase();
  const status = STATUS_OPTIONS.some((item) => item.value === statusRaw) ? statusRaw : 'all';
  const selectedTypes = useMemo(() => parseCsvValues(searchParams.get('types')), [searchParams]);
  const selectedCallSigns = useMemo(() => parseCsvValues(searchParams.get('callSigns')), [searchParams]);
  const selectedLocationStates = useMemo(() => {
    const raw = parseCsvValues(searchParams.get('locationStates'));
    const allowed = new Set(LOCATION_STATE_OPTIONS.map((item) => item.value));
    return raw.filter((value) => allowed.has(value));
  }, [searchParams]);
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
      const isLocationFilterActive = selectedLocationStates.length > 0;

      if (isLocationFilterActive) {
        const selectedLocationSet = new Set(selectedLocationStates);
        const baseParams = {
          ...buildVehiclesParams(true),
          page: 1,
          perPage: LOCATION_FILTER_FETCH_PAGE_SIZE,
        };

        const firstResponse = await fetchVehicles(baseParams);
        if (loadRequestRef.current !== requestId) {
          return;
        }

        const firstItems = Array.isArray(firstResponse?.data?.items) ? firstResponse.data.items : [];
        const totalFromServer = Number(firstResponse?.data?.total || firstItems.length || 0);
        const totalPagesFromServer = Math.max(1, Math.ceil(totalFromServer / LOCATION_FILTER_FETCH_PAGE_SIZE));

        let allItems = firstItems;
        if (totalPagesFromServer > 1) {
          const pageRequests = [];
          for (let nextPage = 2; nextPage <= totalPagesFromServer; nextPage += 1) {
            pageRequests.push(fetchVehicles({
              ...baseParams,
              includeFilterOptions: '0',
              page: nextPage,
            }));
          }

          const restResponses = await Promise.all(pageRequests);
          const restItems = restResponses.flatMap((response) => {
            const items = response?.data?.items;
            return Array.isArray(items) ? items : [];
          });
          allItems = [...firstItems, ...restItems];
        }

        const filteredItems = allItems.filter((item) => selectedLocationSet.has(String(item?.location_state || '').toLowerCase()));
        const totalFiltered = filteredItems.length;
        const safePage = Math.max(1, page);
        const offset = (safePage - 1) * perPage;
        const pagedItems = filteredItems.slice(offset, offset + perPage);

        setRows(pagedItems);
        setTotal(totalFiltered);
        setTotalAll(Number(firstResponse?.data?.totalAll || firstResponse?.data?.total || totalFiltered));
        setUpdatedAt(firstResponse?.data?.updatedAt || null);
        setLocationStateCounts(calculateLocationStateCounts(filteredItems));
        setFilterOptions(firstResponse?.data?.filterOptions || {
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
        return;
      }

      const fastResponse = await fetchVehicles(buildVehiclesParams(false));
      if (loadRequestRef.current !== requestId) {
        return;
      }

      setRows(fastResponse?.data?.items || []);
      setTotal(Number(fastResponse?.data?.total || 0));
      setTotalAll(Number(fastResponse?.data?.totalAll || fastResponse?.data?.total || 0));
      setUpdatedAt(fastResponse?.data?.updatedAt || null);
      setLocationStateCounts(normalizeLocationStateSummary(fastResponse?.data?.locationStateSummary, fastResponse?.data?.items || []));

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
    page,
    perPage,
    selectedLocationStates,
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
    const next = new URLSearchParams(searchParams);

    Object.entries(nextState).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  useEffect(() => {
    if (skipNextDebouncedQuerySyncRef.current) {
      skipNextDebouncedQuerySyncRef.current = false;
      return;
    }

    if (debouncedQueryInput === query) {
      return;
    }

    updateSearchParams({ q: debouncedQueryInput, page: 1 });
  }, [debouncedQueryInput, query, updateSearchParams]);

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
    || selectedGroups.length > 0
    || selectedStations.length > 0
    || selectedModels.length > 0
    || selectedManufacturers.length > 0
    || selectedFuels.length > 0
    || selectedYears.length > 0
    || selectedMileageBands.length > 0
    || chartCarIds.length > 0
    || String(searchParams.get('mileageBand') || '').trim() !== '';

  function clearChartFilter() {
    skipNextDebouncedQuerySyncRef.current = true;
    setQueryInput('');
    updateSearchParams({ chartCarids: null, page: 1, q: '' });
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
              <span>V servisu ({locationStateCounts.v_servisu})</span>
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

      <VehiclesTable
        items={rows}
        sortField={sortBy}
        sortDirection={sortDir}
        onSortChange={handleSortChange}
      />

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
