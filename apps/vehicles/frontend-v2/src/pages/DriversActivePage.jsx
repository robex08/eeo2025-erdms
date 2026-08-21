import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/ui/AppIcon';
import SyncGate from '../components/vehicles/SyncGate';
import { 
  fetchDrivers, 
  triggerDriversQuickSync, 
  syncDriversKmForVehicle, 
  fetchVehiclesForDriversSync 
} from '../services/apiClient';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SORT_FIELDS = [
  'driver_name',
  'personal_number',
  'phone',
  'email',
  'vehicle_spz',
  'km_business_month',
  'km_private_month',
  'km_total_month',
  'costs_business_month',
  'costs_private_month',
  'costs_total_month',
  'last_sync_at',
];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDateTimeCs(value) {
  if (!value) {
    return '-';
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

function printableValue(value, fallback = '-') {
  const normalized = String(value || '').trim();
  return normalized !== '' ? normalized : fallback;
}

function normalizeText(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === '') {
    return '';
  }

  try {
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return raw;
  }
}

function formatDriverDisplayName(value) {
  const normalized = String(value || '').trim();
  if (normalized === '') {
    return 'Neznámý řidič';
  }

  const parts = normalized.split(/\s+/).filter((part) => part !== '');
  if (parts.length < 2) {
    return normalized;
  }

  const surname = parts[parts.length - 1];
  const firstNames = parts.slice(0, -1).join(' ');
  return `${surname} ${firstNames}`.trim();
}

function parseMatchedVehiclesPayload(value) {
  const raw = String(value || '').trim();
  if (raw === '') {
    return [];
  }

  return raw
    .split('||')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      const [idRaw = '', spzRaw = '', makeRaw = '', modelRaw = '', carIdRaw = ''] = chunk.split('::');
      const id = Number.parseInt(idRaw, 10);
      const spz = String(spzRaw || '').trim();
      const make = String(makeRaw || '').trim();
      const model = String(modelRaw || '').trim();
      const carId = String(carIdRaw || '').trim();

      const typeModel = [make, model].filter((part) => part !== '').join(' ');
      const label = typeModel !== '' && spz !== ''
        ? `${typeModel} (${spz})`
        : (typeModel || spz || '-');

      return {
        id: Number.isFinite(id) && id > 0 ? id : 0,
        label,
        carId,
      };
    });
}

function formatMetricValue(value, unit) {
  const numeric = Number(value || 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `${safe.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${unit}`;
}

function normalizeSpz(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function parseRawJsonMap(value) {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === 'object') {
    return value || {};
  }

  const raw = String(value || '').trim();
  if (raw === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function getVehicleMetricValue(rawMap, monthKey, vehicle, fieldName) {
  const monthMap = rawMap?._km_by_vehicle?.[monthKey];
  if (!monthMap || typeof monthMap !== 'object') {
    return null;
  }

  const carId = String(vehicle?.carId || '').trim();
  if (carId !== '' && Object.prototype.hasOwnProperty.call(monthMap, `carid:${carId}`)) {
    const metric = monthMap[`carid:${carId}`];
    return Number(metric?.[fieldName]);
  }

  const label = String(vehicle?.label || '');
  const spzMatch = label.match(/\(([^)]+)\)/);
  const spzFromLabel = spzMatch ? spzMatch[1] : '';
  const normalizedSpz = normalizeSpz(spzFromLabel);
  if (normalizedSpz !== '' && Object.prototype.hasOwnProperty.call(monthMap, `spz:${normalizedSpz}`)) {
    const metric = monthMap[`spz:${normalizedSpz}`];
    return Number(metric?.[fieldName]);
  }

  return null;
}

function renderDriverMetricLines(lineCount, hasMonthData, value, unit) {
  const lines = Math.max(1, Number(lineCount) || 1);

  if (!hasMonthData) {
    return (
      <div className="drivers-metric-list">
        {Array.from({ length: lines }).map((_, index) => (
          <span key={`metric-empty-${index}`} className="drivers-metric-line">-</span>
        ))}
      </div>
    );
  }

  const primaryValue = formatMetricValue(value, unit);

  return (
    <div className="drivers-metric-list">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={`metric-${unit}-${index}`} className="drivers-metric-line">
          {index === 0 ? primaryValue : `0 ${unit}`}
        </span>
      ))}
    </div>
  );
}

function renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, totalValue, unit, fieldName) {
  const lines = Array.isArray(vehicleItems) && vehicleItems.length > 0 ? vehicleItems : [{}];

  if (!hasMonthData) {
    return (
      <div className="drivers-metric-list">
        {lines.map((_, index) => (
          <span key={`metric-empty-${unit}-${index}`} className="drivers-metric-line">-</span>
        ))}
      </div>
    );
  }

  const values = lines.map((vehicle) => getVehicleMetricValue(rawMap, monthKey, vehicle, fieldName));
  const hasPerVehicleData = values.some((val) => Number.isFinite(val));

  if (!hasPerVehicleData) {
    // Pro starší data bez per-vehicle mapy: zobraz agregát u prvního řádku, ostatní prázdné
    return (
      <div className="drivers-metric-list">
        {lines.map((_, index) => (
          <span 
            key={`metric-agg-${fieldName}-${index}`} 
            className="drivers-metric-line"
            title={index === 0 ? "Agregovaná hodnota (nerozpadnutá per vozidlo)" : "Data pro toto vozidlo nejsou samostatně dostupná"}
          >
            {index === 0 ? formatMetricValue(totalValue, unit) : '-'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="drivers-metric-list">
      {values.map((val, index) => (
        <span key={`metric-${fieldName}-${index}`} className="drivers-metric-line">
          {formatMetricValue(Number.isFinite(val) ? val : 0, unit)}
        </span>
      ))}
    </div>
  );
}

export default function DriversActivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingKm, setSyncingKm] = useState(false);
  const [syncKmSeconds, setSyncKmSeconds] = useState(0);
  const [syncKmProgress, setSyncKmProgress] = useState({ current: 0, total: 0, vehicleName: '' });
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageVisible, setSyncMessageVisible] = useState(false);
  const [forceResyncDialogOpen, setForceResyncDialogOpen] = useState(false);

  const now = new Date();
  const query = searchParams.get('q') || '';
  const sortByRaw = searchParams.get('sortBy') || 'driver_name';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'driver_name';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const perPageRaw = parsePositiveInt(searchParams.get('perPage'), 25);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw) ? perPageRaw : 25;
  const year = parsePositiveInt(searchParams.get('year'), now.getFullYear());
  const month = parsePositiveInt(searchParams.get('month'), now.getMonth() + 1);

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

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const response = await fetchDrivers({ activeOnly: 1, year, month });
      setItems(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch {
      setItems([]);
      setError('Nepodařilo se načíst seznam aktivních řidičů.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [year, month]);

  useEffect(() => {
    if (!syncingKm) {
      setSyncKmSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSyncKmSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [syncingKm]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage('');
    setSyncMessageVisible(false);

    try {
      const response = await triggerDriversQuickSync();
      const message = String(response?.data?.message || '').trim();
      setSyncMessage(message !== '' ? message : 'Synchronizace řidičů byla dokončena.');
      setSyncMessageVisible(true);
      await loadData();
    } catch (err) {
      const message = String(err?.response?.data?.error?.message || '').trim();
      setSyncMessage(message !== '' ? message : 'Synchronizace řidičů selhala.');
      setSyncMessageVisible(true);
    } finally {
      setSyncing(false);
    }
  }

  async function handleKmSync(forceSync = false) {
    const isForceSync = forceSync === true;

    setSyncMessage('');
    setSyncMessageVisible(false);
    setSyncingKm(true);
    setSyncKmSeconds(0);
    setSyncKmProgress({ current: 0, total: 0, vehicleName: '' });

    try {
      // Načtení seznamu vozidel pro synchronizaci
      const selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const isPastMonth = selectedMonth < currentMonth;

      const vehiclesResponse = await fetchVehiclesForDriversSync(year, month, isForceSync);
      const vehicles = vehiclesResponse?.data?.items || [];

      if (vehicles.length === 0) {
        // Pro minulé měsíce: pokud není force sync, otevřít interní dialog (ne window.confirm).
        if (isPastMonth && !isForceSync) {
          setSyncingKm(false);
          setForceResyncDialogOpen(true);
          return;
        }
        
        // Pro aktuální měsíc nebo po force sync - jen zobrazit hlášku
        setSyncMessage(
          selectedMonth === currentMonth
            ? 'Žádná vozidla k synchronizaci pro aktuální měsíc.'
            : 'Žádná vozidla k synchronizaci pro vybraný měsíc.'
        );
        setSyncMessageVisible(true);
        setSyncingKm(false);
        return;
      }

      let totalDriversUpdated = 0;
      let totalVehiclesProcessed = 0;
      let totalVehiclesFailed = 0;

      // Postupné zpracování každého vozidla
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        const vehicleId = Number(vehicle?.id || 0);
        
        if (vehicleId <= 0) {
          continue;
        }

        // Formátování názvu vozidla
        const make = String(vehicle?.w_tovarni_znacka || '').trim();
        const model = String(vehicle?.w_model_vozu || '').trim();
        const spz = String(vehicle?.spz || '').trim();
        
        let vehicleName = '';
        if (make && model) {
          vehicleName = `${make} ${model}`;
        } else if (make) {
          vehicleName = make;
        } else if (model) {
          vehicleName = model;
        }
        
        if (spz) {
          vehicleName = vehicleName ? `${vehicleName} (${spz})` : spz;
        }
        
        if (!vehicleName) {
          vehicleName = `Vozidlo #${vehicleId}`;
        }

        // Aktualizace progressu
        setSyncKmProgress({
          current: i + 1,
          total: vehicles.length,
          vehicleName: vehicleName,
        });

        try {
          const result = await syncDriversKmForVehicle(vehicleId, year, month);
          
          const driversUpdated = Number(result?.data?.drivers_updated || 0);
          totalDriversUpdated += driversUpdated;
          totalVehiclesProcessed++;
        } catch (err) {
          console.error(`Chyba při zpracování vozidla ${vehicleName}:`, err);
          totalVehiclesFailed++;
        }
      }

      // Načtení aktualizovaných dat
      await loadData();

      // Sestavení výsledné zprávy
      const parts = [];
      if (totalVehiclesProcessed > 0) {
        parts.push(`zpracováno ${totalVehiclesProcessed} vozidel`);
      }
      if (totalDriversUpdated > 0) {
        parts.push(`aktualizováno ${totalDriversUpdated} řidičských záznamů`);
      }
      if (totalVehiclesFailed > 0) {
        parts.push(`chyby ${totalVehiclesFailed}`);
      }

      const message = parts.length > 0
        ? `Načtení km dokončeno: ${parts.join(', ')}.`
        : 'Načtení km dokončeno.';

      setSyncMessage(message);
      setSyncMessageVisible(true);
    } catch (err) {
      console.error('Km sync error:', err);
      const errorMessage = String(err?.response?.data?.error?.message || err?.message || '').trim();
      setSyncMessage(errorMessage !== '' ? errorMessage : 'Načtení km selhalo. Zkontrolujte připojení a zkuste to znovu.');
      setSyncMessageVisible(true);
    } finally {
      setSyncingKm(false);
      setSyncKmProgress({ current: 0, total: 0, vehicleName: '' });
    }
  }

  async function handleConfirmForceResync() {
    setForceResyncDialogOpen(false);
    await handleKmSync(true);
  }

  function handleCancelForceResync() {
    setForceResyncDialogOpen(false);
    setSyncMessage('Synchronizace zrušena uživatelem.');
    setSyncMessageVisible(true);
  }

  // Generuje seznam měsíců - jen ty které už proběhly v daném roce
  function getAvailableMonths(selectedYear) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    const allMonths = [
      { value: 1, label: 'Leden' },
      { value: 2, label: 'Únor' },
      { value: 3, label: 'Březen' },
      { value: 4, label: 'Duben' },
      { value: 5, label: 'Květen' },
      { value: 6, label: 'Červen' },
      { value: 7, label: 'Červenec' },
      { value: 8, label: 'Srpen' },
      { value: 9, label: 'Září' },
      { value: 10, label: 'Říjen' },
      { value: 11, label: 'Listopad' },
      { value: 12, label: 'Prosinec' },
    ];
    
    // Pro roky v budoucnosti nebo minulosti vrátit všechny měsíce
    if (selectedYear < currentYear) {
      return allMonths;
    }
    
    // Pro současný rok vrátit jen měsíce do aktuálního
    if (selectedYear === currentYear) {
      return allMonths.filter((m) => m.value <= currentMonth);
    }
    
    // Pro budoucí roky žádné měsíce
    return [];
  }

  const normalizedRows = useMemo(() => {
    return items.map((item) => {
      const resolvedWebdispCarId = String(item?.webdisp_carid || item?.legacy_carid || item?.vehicle_legacy_carid || '').trim();
      const matchedVehicles = parseMatchedVehiclesPayload(item?.matched_vehicles_payload);
      return {
        ...item,
        resolved_webdisp_carid: resolvedWebdispCarId,
        matched_vehicles: matchedVehicles,
      };
    });
  }, [items]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(query);
    if (needle === '') {
      return normalizedRows;
    }

    return normalizedRows.filter((item) => {
      const haystack = [
        item.driver_name,
        item.personal_number,
        item.phone,
        item.email,
        item.vehicle_identifier,
        item.vehicle_spz,
        item.w_tovarni_znacka,
        item.w_model_vozu,
        item.resolved_webdisp_carid,
        item.km_month,
        ...(Array.isArray(item.matched_vehicles)
          ? item.matched_vehicles.flatMap((vehicle) => [vehicle.label, vehicle.carId])
          : []),
      ]
        .map((value) => normalizeText(value))
        .join(' ');

      return haystack.includes(needle);
    });
  }, [normalizedRows, query]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];

    list.sort((left, right) => {
      if (sortBy === 'last_sync_at') {
        const leftTs = Date.parse(String(left.last_sync_at || '')) || 0;
        const rightTs = Date.parse(String(right.last_sync_at || '')) || 0;
        const cmp = leftTs - rightTs;
        return sortDir === 'asc' ? cmp : -cmp;
      }

      if (sortBy === 'driver_name') {
        const leftDriver = String(left.driver_name_sort || formatDriverDisplayName(left.driver_name) || '');
        const rightDriver = String(right.driver_name_sort || formatDriverDisplayName(right.driver_name) || '');
        const cmp = leftDriver.localeCompare(rightDriver, 'cs', { sensitivity: 'base', numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      }

      // Numerické sortování pro KM a náklady
      if (sortBy.startsWith('km_') || sortBy.startsWith('costs_')) {
        const leftNum = Number.parseFloat(left[sortBy]) || 0;
        const rightNum = Number.parseFloat(right[sortBy]) || 0;
        const cmp = leftNum - rightNum;
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const leftValue = String(left[sortBy] || '');
      const rightValue = String(right[sortBy] || '');
      const cmp = leftValue.localeCompare(rightValue, 'cs', { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filteredRows, sortBy, sortDir]);

  const total = sortedRows.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [page, perPage, sortedRows]);

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

  function renderSortIcon(field) {
    if (sortBy !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={sortDir === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
  }

  function SortableHeader({ field, label, className = '' }) {
    const isActive = sortBy === field;
    const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort} className={className}>
        <button
          className={`table-sort-btn${isActive ? ' is-active' : ''}`}
          type="button"
          onClick={() => handleSortChange(field)}
        >
          <span>{label}</span>
          {renderSortIcon(field)}
        </button>
      </th>
    );
  }

  const hasAnyFilterActive = query.trim() !== '';

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="users" size={20} weight="duotone" />
            <span>Seznam řidičů</span>
          </h2>
          <p className="muted">Data jsou načítána z WebDispečinku a ukládána do v2 cache tabulky.</p>
        </div>

        <div className="icon-actions">
          <button
            className="icon-action-btn"
            type="button"
            onClick={() => updateSearchParams({ q: '', page: 1 })}
            disabled={!hasAnyFilterActive}
            title="Resetovat filtry"
            aria-label="Resetovat filtry"
          >
            <AppIcon name="resetFilters" size={20} weight="regular" />
          </button>

          <button
            className="icon-action-btn"
            type="button"
            onClick={loadData}
            disabled={loading || syncing || syncingKm}
            title="Obnovit data z cache"
            aria-label="Obnovit data z cache"
          >
            <AppIcon name="db" size={20} weight="regular" />
          </button>

          <button
            className="icon-action-btn"
            type="button"
            onClick={() => {
              void handleKmSync(false);
            }}
            disabled={syncingKm}
            title={`Načíst km za měsíc ${month}/${year}`}
            aria-label="Načíst km z WebDispečinku"
          >
            <AppIcon name="refresh" size={20} weight="regular" />
          </button>

          <button
            className="icon-action-btn icon-action-btn-primary"
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="Načíst aktivní řidiče z WebDispečinku"
            aria-label="Načíst aktivní řidiče z WebDispečinku"
          >
            <AppIcon name="sync" size={20} weight="regular" />
          </button>
        </div>
      </div>

      <div className="overview-filter-row">
        <label className="overview-filter-label">
          <span>Rok:</span>
          <input
            type="number"
            className="overview-filter-input"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => updateSearchParams({ year: event.target.value, page: 1 })}
          />
        </label>

        <label className="overview-filter-label">
          <span>Měsíc:</span>
          <select
            className="overview-filter-select"
            value={month}
            onChange={(event) => updateSearchParams({ month: event.target.value, page: 1 })}
          >
            {getAvailableMonths(year).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overview-search-row">
        <div className="overview-search-wrap">
          <input
            className="search-input"
            placeholder="Hledat podle jména, osobního čísla, telefonu, e-mailu nebo vozidla"
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
              <span aria-hidden="true">x</span>
            </button>
          ) : null}
        </div>
      </div>

      {syncMessage && syncMessageVisible ? (
        <div className="status-box sync-message-box">
          <span>{syncMessage}</span>
          <button
            type="button"
            className="sync-message-close"
            aria-label="Skrýt zprávu"
            title="Skrýt"
            onClick={() => setSyncMessageVisible(false)}
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      {syncingKm ? (
        <SyncGate
          syncSeconds={syncKmSeconds}
          eyebrow="Načítání kilometrů"
          title={syncKmProgress.vehicleName 
            ? `Zpracovávám ${syncKmProgress.vehicleName}`
            : `Načítám kilometry a účtování za ${month}/${year}`}
          description={
            syncKmProgress.total > 0
              ? `Probíhá načítání dat z WebDispečinku pro jednotlivá vozidla a jejich řidiče. Zpracováno ${syncKmProgress.current} z ${syncKmProgress.total} vozidel. Po dokončení se seznam automaticky obnoví.`
              : 'Probíhá načítání dat ze všech vozidel z WebDispečinku pro všechny aktivní řidiče. Po dokončení se seznam automaticky obnoví.'
          }
          runtimeLabel="Doba běhu"
        />
      ) : null}

      {forceResyncDialogOpen ? (
        <div
          className="bulk-service-dialog-backdrop"
          role="presentation"
          onClick={handleCancelForceResync}
        >
          <div
            className="bulk-service-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Potvrzení force synchronizace"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bulk-service-dialog-head">
              <h3>Data už jsou načtená</h3>
              <button
                type="button"
                className="station-edit-close"
                onClick={handleCancelForceResync}
                aria-label="Zavřít dialog"
              >
                ×
              </button>
            </div>

            <p className="muted">
              Data pro {month}/{year} už byla synchronizována.
              Chcete přesto spustit novou force synchronizaci proti WebDispečinku?
            </p>

            <div className="bulk-service-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={handleCancelForceResync}>
                Ne, zrušit
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmForceResync}>
                Ano, force resync
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader field="driver_name" label="Řidič" />
              <SortableHeader field="personal_number" label="Osobní číslo" />
              <SortableHeader field="phone" label="Telefon" />
              <SortableHeader field="email" label="E-mail" />
              <SortableHeader field="vehicle_spz" label="Vozidlo" />
              <SortableHeader field="km_business_month" label="Služ. km" />
              <SortableHeader field="km_private_month" label="Soukr. km" />
              <SortableHeader field="km_total_month" label="Celkem km" />
              <SortableHeader field="costs_business_month" label="Účt. služ." />
              <SortableHeader field="costs_private_month" label="Účt. soukr." />
              <SortableHeader field="costs_total_month" label="Účt. celkem" />
              <SortableHeader field="last_sync_at" label="Poslední sync" />
              <th className="table-col-actions">Akce</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13}>Načítám data...</td>
              </tr>
            ) : null}

            {!loading && pagedRows.length === 0 ? (
              <tr>
                <td colSpan={13}>Žádní řidiči nenalezeni.</td>
              </tr>
            ) : null}

            {!loading
              ? pagedRows.map((item) => {
                const vehicleTypeModel = [printableValue(item?.w_tovarni_znacka, ''), printableValue(item?.w_model_vozu, '')]
                  .filter((part) => part !== '')
                  .join(' ');
                const vehicleSpz = printableValue(item?.vehicle_spz, '');
                const fallbackVehicleLabel =
                  vehicleTypeModel !== '' && vehicleSpz !== ''
                    ? `${vehicleTypeModel} (${vehicleSpz})`
                    : (vehicleTypeModel || vehicleSpz || printableValue(item?.vehicle_identifier, '') || '-');
                const fallbackVehicle = {
                  id: Number(item?.vehicle_id || 0),
                  label: fallbackVehicleLabel,
                  carId: printableValue(item?.resolved_webdisp_carid, ''),
                };
                const vehicleItems = Array.isArray(item?.matched_vehicles) && item.matched_vehicles.length > 0
                  ? item.matched_vehicles
                  : [fallbackVehicle];
                const vehicleLineCount = vehicleItems.length > 0 ? vehicleItems.length : 1;
                const hasVehicleLink = Number(item?.vehicle_id || 0) > 0;
                const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                const rawMap = parseRawJsonMap(item?.raw_json);
                const hasMonthData = item?.km_month === monthKey || Boolean(rawMap?._km_by_vehicle?.[monthKey]);

                return (
                  <tr key={`${String(item?.legacy_driverid || item?.id || 'driver')}-${String(item?.personal_number || '')}`}>
                    <td>{formatDriverDisplayName(item?.driver_name)}</td>
                    <td>{printableValue(item?.personal_number)}</td>
                    <td>{printableValue(item?.phone)}</td>
                    <td>{printableValue(item?.email)}</td>
                    <td>
                      <div className="drivers-vehicle-list">
                        {vehicleItems.map((vehicle, index) => {
                          const rowKey = `${String(item?.id || item?.legacy_driverid || 'driver')}-vehicle-${index}-${String(vehicle?.id || '')}`;
                          const label = printableValue(vehicle?.label, '-');
                          const carId = printableValue(vehicle?.carId, '');
                          const vehicleId = Number(vehicle?.id || 0);
                          const canLink = vehicleId > 0;

                          if (canLink) {
                            return (
                              <Link key={rowKey} className="drivers-vehicle-link" to={`/vehicles/${vehicleId}`}>
                                <span>{label}</span>
                                {carId !== '' ? <sup className="drivers-vehicle-carid">#{carId}</sup> : null}
                              </Link>
                            );
                          }

                          return (
                            <span key={rowKey} className="drivers-vehicle-line">
                              <span>{label}</span>
                              {carId !== '' ? <sup className="drivers-vehicle-carid">#{carId}</sup> : null}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.km_business_month, 'km', 'km_business')}
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.km_private_month, 'km', 'km_private')}
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.km_total_month, 'km', 'km_total')}
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.costs_business_month, 'Kč', 'costs_business')}
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.costs_private_month, 'Kč', 'costs_private')}
                    </td>
                    <td className="table-cell-number">
                      {renderDriverVehicleMetricLines(vehicleItems, rawMap, monthKey, hasMonthData, item?.costs_total_month, 'Kč', 'costs_total')}
                    </td>
                    <td>{formatDateTimeCs(item?.last_sync_at)}</td>
                    <td className="table-cell-actions">
                      <div className="table-action-icons">
                        {hasVehicleLink ? (
                          <Link
                            className="table-icon-btn"
                            to={`/vehicles/${Number(item.vehicle_id)}`}
                            title="Detail vozidla"
                            aria-label="Detail vozidla"
                          >
                            <AppIcon name="detail" size={14} weight="duotone" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="table-icon-btn table-icon-btn-disabled"
                            disabled
                            title="Detail vozidla není dostupný"
                            aria-label="Detail vozidla není dostupný"
                          >
                            <AppIcon name="detail" size={14} weight="duotone" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              : null}
          </tbody>
        </table>
      </div>

      <div className="table-footer-controls">
        <p className="muted">Zobrazeno {pagedRows.length} z {total} položek.</p>

        <div className="table-pager-controls">
          <label className="table-page-size" htmlFor="drivers-page-size">
            Na stránku
            <select
              id="drivers-page-size"
              value={perPage}
              onChange={(event) => updateSearchParams({ perPage: Number(event.target.value), page: 1 })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={`drivers-per-page-${size}`} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>
            Předchozí
          </button>
          <span className="table-page-indicator">Strana {Math.min(page, totalPages)} / {totalPages}</span>
          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>
            Další
          </button>
        </div>
      </div>

      {syncingKm ? (
        <SyncGate
          syncSeconds={syncKmSeconds}
          eyebrow="Načítání kilometrů"
          title={syncKmProgress.vehicleName || `Načítám km statistiky za ${month}/${year}`}
          description="Prosím vyčkejte. Data se načítají z WebDispečinku a ukládají do cache."
          progress={syncKmProgress.total > 0 ? `Zpracováno ${syncKmProgress.current} z ${syncKmProgress.total} vozidel` : null}
          runtimeLabel="Doba běhu"
          showRuntime
        />
      ) : null}
    </section>
  );
}
