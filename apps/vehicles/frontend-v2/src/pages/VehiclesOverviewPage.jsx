import { useCallback, useEffect, useMemo, useState } from 'react';
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
  'w_tovarni_znacka',
  'w_model_vozu',
  'w_typ_phm',
  'last_update',
  'status',
];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

  const query = searchParams.get('q') || '';
  const sortByRaw = searchParams.get('sortBy') || 'spz';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'spz';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const perPageRaw = parsePositiveInt(searchParams.get('perPage'), 25);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw) ? perPageRaw : 25;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchVehicles({
        q: query,
        sortBy,
        sortDir,
        page,
        perPage,
      });

      setRows(response?.data?.items || []);
      setTotal(Number(response?.data?.total || 0));
      setTotalAll(Number(response?.data?.totalAll || response?.data?.total || 0));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, query, sortBy, sortDir]);

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
      setSyncMessage(response?.data?.message || 'Synchronizace spuštěna.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setSyncMessage(apiMessage || 'Synchronizace z WebDispečinku selhala.');
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

  function handleSortChange(field) {
    const nextDir = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    updateSearchParams({ sortBy: field, sortDir: nextDir, page: 1 });
  }

  function handlePageChange(nextPage) {
    const normalized = Math.min(Math.max(1, nextPage), totalPages);
    updateSearchParams({ page: normalized });
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="car" size={20} weight="duotone" />
            <span>Přehled vozidel</span>
          </h2>
          <p className="muted">Seznam vozidel synchronizovaný z WebDispečinku přes API v2.</p>
        </div>

        <OverviewActionButtons
          loading={loading}
          syncing={syncing}
          onReloadFromDb={loadData}
          onSyncFromWebDispecink={handleSync}
        />
      </div>

      <input
        className="search-input"
        placeholder="Hledat podle SPZ, výrobce nebo modelu"
        value={query}
        onChange={(event) => updateSearchParams({ q: event.target.value, page: 1 })}
      />

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
          Zobrazeno {rows.length} z {total} položek{query ? ` (celkem v DB: ${totalAll})` : ''}.
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
