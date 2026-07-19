import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchVehicles, triggerSync } from '../services/apiClient';
import OverviewActionButtons from '../components/vehicles/OverviewActionButtons';
import SyncGate from '../components/vehicles/SyncGate';
import VehiclesTable from '../components/vehicles/VehiclesTable';
import AppIcon from '../components/ui/AppIcon';

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

export default function VehiclesOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    types: [],
    groups: [],
    stations: [],
    models: [],
    manufacturers: [],
    fuels: [],
    years: [],
    mileageBands: [],
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const filterRowRef = useRef(null);
  const loadRequestRef = useRef(0);

  const query = searchParams.get('q') || '';
  const statusRaw = String(searchParams.get('status') || 'all').toLowerCase();
  const status = STATUS_OPTIONS.some((item) => item.value === statusRaw) ? statusRaw : 'all';
  const selectedTypes = useMemo(() => parseCsvValues(searchParams.get('types')), [searchParams]);
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

      void fetchVehicles(buildVehiclesParams(true))
        .then((optionsResponse) => {
          if (loadRequestRef.current !== requestId) {
            return;
          }

          setFilterOptions(optionsResponse?.data?.filterOptions || {
            types: [],
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

  function updateSearchParams(nextState) {
    const next = new URLSearchParams(searchParams);

    Object.entries(nextState).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  }

  async function handleSync() {
    setSyncMessage('');
    setSyncing(true);
    setSyncSeconds(0);

    try {
      const response = await triggerSync();
      setSyncMessage(response?.data?.message || 'Aktualizace byla spuštěna.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setSyncMessage(apiMessage || 'Aktualizace dat se nepodařila.');
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
            placeholder="Hledat podle SPZ, výrobce nebo modelu"
            value={query}
            onChange={(event) => updateSearchParams({ q: event.target.value, page: 1 })}
          />
          {query ? (
            <button
              className="overview-search-clear-icon"
              type="button"
              onClick={() => updateSearchParams({ q: '', page: 1 })}
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
          <summary>Stanoviště: {selectedLabel(selectedStations, 'vše')}</summary>
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

      {syncMessage ? <div className="status-box">{syncMessage}</div> : null}

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
