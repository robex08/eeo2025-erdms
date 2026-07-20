import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppIcon from '../components/ui/AppIcon';
import {
  createStationAddress,
  deleteStationAddress,
  fetchStationAddresses,
  fetchWebdispecinkLocations,
  triggerQuickSync,
  triggerSync,
  upsertStationAddressFromWebdispecink,
  updateStationAddress,
} from '../services/apiClient';
import useDebouncedValue from '../hooks/useDebouncedValue';

const STATION_ADDRESSES_FILTERS_LS_KEY = 'vehicles_v2_station_addresses_filters';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SORT_FIELDS = ['organizace', 'nazev_stanoviste', 'mesto', 'typ', 'ulice', 'psc', 'w_ln_match'];
const WD_SORT_FIELDS = ['w_ln', 'cnt', 'typ'];
const TYP_FILTER_OPTIONS = ['all', 'VS', 'Servis', 'Mimo'];
const STATION_TYPE_OPTIONS = [
  { value: 'VS', label: 'VS' },
  { value: 'Servis', label: 'Servis' },
  { value: 'Mimo', label: 'Mimo' },
];
const WD_TYPE_OPTIONS = [
  { value: 'VS', label: 'VS' },
  { value: 'Servis', label: 'Servis' },
  { value: 'Mimo', label: 'Mimo' },
];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeText(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === '') {
    return '';
  }

  try {
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    return raw;
  }
}

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

export default function StationAddressesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stationFilterRowRef = useRef(null);
  const wdFilterRowRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [wdLocations, setWdLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [upsertingKey, setUpsertingKey] = useState('');
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [editingId, setEditingId] = useState(0);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(0);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    organizace: '',
    nazev_stanoviste: '',
    mesto: '',
    typ: 'VS',
    ulice: '',
    psc: '',
    w_ln_match: '',
  });
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageVisible, setSyncMessageVisible] = useState(false);
  const [error, setError] = useState('');
  const skipNextDebouncedQuerySyncRef = useRef(false);
  const skipNextDebouncedWdQuerySyncRef = useRef(false);
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

    const saved = localStorage.getItem(STATION_ADDRESSES_FILTERS_LS_KEY);
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
      localStorage.removeItem(STATION_ADDRESSES_FILTERS_LS_KEY);
      return;
    }

    localStorage.setItem(STATION_ADDRESSES_FILTERS_LS_KEY, serialized);
  }, [searchParams]);

  const query = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(query);
  const debouncedQueryInput = useDebouncedValue(queryInput, 750);
  const sortByRaw = searchParams.get('sortBy') || 'nazev_stanoviste';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'nazev_stanoviste';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const selectedStationTypes = useMemo(() => {
    const values = parseCsvValues(searchParams.get('stationTypes'));
    const normalized = values.filter((value) => TYP_FILTER_OPTIONS.includes(value) && value !== 'all');
    if (normalized.length > 0) {
      return normalized;
    }

    const legacySingle = searchParams.get('stationType') || 'all';
    return TYP_FILTER_OPTIONS.includes(legacySingle) && legacySingle !== 'all' ? [legacySingle] : [];
  }, [searchParams]);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const perPageRaw = parsePositiveInt(searchParams.get('perPage'), 25);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw) ? perPageRaw : 25;

  const wdQuery = searchParams.get('wdQ') || '';
  const [wdQueryInput, setWdQueryInput] = useState(wdQuery);
  const debouncedWdQueryInput = useDebouncedValue(wdQueryInput, 750);
  const selectedWdTypes = useMemo(() => {
    const values = parseCsvValues(searchParams.get('wdTypes'));
    const normalized = values.filter((value) => TYP_FILTER_OPTIONS.includes(value) && value !== 'all');
    if (normalized.length > 0) {
      return normalized;
    }

    const legacySingle = searchParams.get('wdType') || 'all';
    return TYP_FILTER_OPTIONS.includes(legacySingle) && legacySingle !== 'all' ? [legacySingle] : [];
  }, [searchParams]);
  const wdSortByRaw = searchParams.get('wdSortBy') || 'w_ln';
  const wdSortBy = WD_SORT_FIELDS.includes(wdSortByRaw) ? wdSortByRaw : 'w_ln';
  const wdSortDir = searchParams.get('wdSortDir') === 'desc' ? 'desc' : 'asc';
  const wdPage = parsePositiveInt(searchParams.get('wdPage'), 1);
  const wdPerPageRaw = parsePositiveInt(searchParams.get('wdPerPage'), 25);
  const wdPerPage = PAGE_SIZE_OPTIONS.includes(wdPerPageRaw) ? wdPerPageRaw : 25;

  const hasAnyHeaderFilterActive =
    query.trim() !== ''
    || wdQuery.trim() !== ''
    || selectedStationTypes.length > 0
    || selectedWdTypes.length > 0;

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
    setWdQueryInput(wdQuery);
  }, [wdQuery]);

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

  useEffect(() => {
    if (skipNextDebouncedWdQuerySyncRef.current) {
      skipNextDebouncedWdQuerySyncRef.current = false;
      return;
    }

    if (debouncedWdQueryInput === wdQuery) {
      return;
    }

    updateSearchParams({ wdQ: debouncedWdQueryInput, wdPage: 1 });
  }, [debouncedWdQueryInput, wdQuery, updateSearchParams]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [addressesResponse, locationsResponse] = await Promise.all([
        fetchStationAddresses(),
        fetchWebdispecinkLocations(),
      ]);

      setRows(Array.isArray(addressesResponse?.data?.items) ? addressesResponse.data.items : []);
      setWdLocations(Array.isArray(locationsResponse?.data?.items) ? locationsResponse.data.items : []);
    } catch (err) {
      setRows([]);
      setWdLocations([]);
      setError('Nepodařilo se načíst seznam výjezdových stanovišť / servisů.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void loadData().then(() => {
      if (!active) {
        return;
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalizeText(query);

    return rows.filter((row) => {
      if (selectedStationTypes.length > 0 && !selectedStationTypes.includes(String(row.typ || 'VS'))) {
        return false;
      }

      if (q === '') {
        return true;
      }

      const haystack = [row.id, row.organizace, row.mesto, row.typ, row.ulice, row.psc, row.w_ln_match]
        .map((value) => normalizeText(value))
        .join(' ');

      return haystack.includes(q);
    });
  }, [rows, query, selectedStationTypes]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      const left = String(a[sortBy] || '');
      const right = String(b[sortBy] || '');
      const cmp = left.localeCompare(right, 'cs', { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filteredRows, sortBy, sortDir]);

  const total = sortedRows.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [perPage, total]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [page, perPage, sortedRows]);

  const wdFilteredRows = useMemo(() => {
    const q = normalizeText(wdQuery);

    return wdLocations.filter((row) => {
      if (selectedWdTypes.length > 0 && !selectedWdTypes.includes(String(row.typ || 'Mimo'))) {
        return false;
      }

      if (q === '') {
        return true;
      }

      const haystack = [row.w_ln, row.cnt, row.typ]
        .map((value) => normalizeText(value))
        .join(' ');

      return haystack.includes(q);
    });
  }, [wdLocations, wdQuery, selectedWdTypes]);

  const wdSortedRows = useMemo(() => {
    const list = [...wdFilteredRows];
    list.sort((a, b) => {
      if (wdSortBy === 'cnt') {
        const left = Number(a.cnt || 0);
        const right = Number(b.cnt || 0);
        return wdSortDir === 'asc' ? left - right : right - left;
      }

      const left = String(a[wdSortBy] || '');
      const right = String(b[wdSortBy] || '');
      const cmp = left.localeCompare(right, 'cs', { sensitivity: 'base', numeric: true });
      return wdSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [wdFilteredRows, wdSortBy, wdSortDir]);

  const wdTotal = wdSortedRows.length;
  const wdTotalPages = useMemo(() => Math.max(1, Math.ceil(wdTotal / wdPerPage)), [wdTotal, wdPerPage]);

  const wdPagedRows = useMemo(() => {
    const start = (wdPage - 1) * wdPerPage;
    return wdSortedRows.slice(start, start + wdPerPage);
  }, [wdPage, wdPerPage, wdSortedRows]);

  useEffect(() => {
    if (page > totalPages) {
      updateSearchParams({ page: totalPages });
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (wdPage > wdTotalPages) {
      updateSearchParams({ wdPage: wdTotalPages });
    }
  }, [wdPage, wdTotalPages]);

  useEffect(() => {
    if (!openFilterKey) {
      return undefined;
    }

    function handleOutsidePointerDown(event) {
      const stationFilterContains = stationFilterRowRef.current?.contains(event.target);
      const wdFilterContains = wdFilterRowRef.current?.contains(event.target);

      if (!stationFilterContains && !wdFilterContains) {
        setOpenFilterKey(null);
        return;
      }
    }

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [openFilterKey]);

  useEffect(() => {
    function scrollToHashTarget() {
      const hash = window.location.hash;
      if (!hash) {
        return;
      }

      const targetId = hash.startsWith('#') ? hash.slice(1) : hash;
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    scrollToHashTarget();
    window.addEventListener('hashchange', scrollToHashTarget);

    return () => window.removeEventListener('hashchange', scrollToHashTarget);
  }, []);

  useEffect(() => {
    if (!editingId) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && !editSaving) {
        setEditingId(0);
        setEditError('');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingId, editSaving]);

  function handleSortChange(field) {
    const nextDir = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    updateSearchParams({ sortBy: field, sortDir: nextDir, page: 1 });
  }

  function handlePageChange(nextPage) {
    const normalized = Math.min(Math.max(1, nextPage), totalPages);
    updateSearchParams({ page: normalized });
  }

  function handleWdSortChange(field) {
    const nextDir = wdSortBy === field ? (wdSortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    updateSearchParams({ wdSortBy: field, wdSortDir: nextDir, wdPage: 1 });
  }

  function handleWdPageChange(nextPage) {
    const normalized = Math.min(Math.max(1, nextPage), wdTotalPages);
    updateSearchParams({ wdPage: normalized });
  }

  function toggleWdTypeFilter(value) {
    const set = new Set(selectedWdTypes);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }

    const next = Array.from(set);
    updateSearchParams({ wdTypes: next.length > 0 ? next.join(',') : null, wdType: null, wdPage: 1 });
  }

  function toggleStationTypeFilter(value) {
    const set = new Set(selectedStationTypes);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }

    const next = Array.from(set);
    updateSearchParams({ stationTypes: next.length > 0 ? next.join(',') : null, stationType: null, page: 1 });
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

  async function handleSync(fullSync) {
    setSyncing(true);
    setSyncMessage('');
    setSyncMessageVisible(false);

    try {
      if (fullSync) {
        const syncResponse = await triggerSync();
        const synchronized = Number(syncResponse?.data?.affectedRows || 0);
        setSyncMessage(`Plná synchronizace byla úspěšně dokončena. Synchronizováno: ${synchronized}.`);
      } else {
        const syncResponse = await triggerQuickSync();
        const synchronized = Number(syncResponse?.data?.affectedRows || 0);
        setSyncMessage(`Rychlá synchronizace byla úspěšně dokončena. Synchronizováno: ${synchronized}.`);
      }
      setSyncMessageVisible(true);
      await loadData();
    } catch {
      setSyncMessage('Aktualizace dat z Webdispečinku se nepodařila.');
      setSyncMessageVisible(true);
    } finally {
      setSyncing(false);
    }
  }

  function renderSortIcon(field) {
    if (sortBy !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={sortDir === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
  }

  function renderWdSortIcon(field) {
    if (wdSortBy !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={wdSortDir === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
  }

  function SortableHeader({ field, label }) {
    const isActive = sortBy === field;
    const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort}>
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

  function SortableWdHeader({ field, label, className = '' }) {
    const isActive = wdSortBy === field;
    const ariaSort = isActive ? (wdSortDir === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort} className={className}>
        <button
          className={`table-sort-btn${isActive ? ' is-active' : ''}`}
          type="button"
          onClick={() => handleWdSortChange(field)}
        >
          <span>{label}</span>
          {renderWdSortIcon(field)}
        </button>
      </th>
    );
  }

  async function handlePromoteWln(wLn, typ) {
    const key = `${typ}:${wLn}`;
    setUpsertingKey(key);
    setSyncMessage('');

    try {
      const response = await upsertStationAddressFromWebdispecink({
        w_ln: wLn,
        typ,
        organizace: 'ZZS SK',
      });

      setSyncMessage(response?.data?.message || 'Adresa byla uložena do hlavní tabulky.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setSyncMessage(apiMessage || 'Adresu se nepodařilo uložit do hlavní tabulky.');
    } finally {
      setUpsertingKey('');
    }
  }

  function openEditModal(row) {
    setEditError('');
    setEditingId(Number(row.id || 0));
    setEditForm({
      organizace: String(row.organizace || 'ZZS SK'),
      nazev_stanoviste: String(row.nazev_stanoviste || row.mesto || row.stanoviste || ''),
      mesto: String(row.mesto || row.stanoviste || ''),
      typ: String(row.typ || 'VS'),
      ulice: String(row.ulice || ''),
      psc: String(row.psc || ''),
      w_ln_match: String(row.w_ln_match || ''),
    });
  }

  function openCreateModal() {
    setEditError('');
    setEditingId(-1);
    setEditForm({
      organizace: 'ZZS SK',
      nazev_stanoviste: '',
      mesto: '',
      typ: 'VS',
      ulice: '',
      psc: '',
      w_ln_match: '',
    });
  }

  function closeEditModal() {
    if (editSaving) {
      return;
    }

    setEditingId(0);
    setEditError('');
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleEditSave() {
    if (!editingId) {
      return;
    }

    setEditSaving(true);
    setEditError('');
    setSyncMessage('');

    try {
      const payload = {
        organizace: editForm.organizace,
        nazev_stanoviste: editForm.nazev_stanoviste,
        mesto: editForm.mesto,
        typ: editForm.typ,
        ulice: editForm.ulice,
        psc: editForm.psc,
        w_ln_match: editForm.w_ln_match,
      };
      const response = editingId === -1
        ? await createStationAddress(payload)
        : await updateStationAddress({ ...payload, id: editingId });

      setSyncMessage(response?.data?.message || (editingId === -1
        ? 'Stanoviště bylo úspěšně vytvořeno.'
        : 'Stanoviště bylo úspěšně upraveno.'));
      setEditingId(0);
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setEditError(apiMessage || 'Uložení změn se nepodařilo.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteRow(row) {
    const id = Number(row?.id || 0);
    if (id <= 0) {
      setSyncMessage('Záznam nelze smazat: chybí platné ID.');
      return;
    }

    const rowTyp = String(row?.typ || 'VS').trim();
    if (rowTyp === 'VS') {
      setSyncMessage('Výchozí stanoviště typu VS nelze v této verzi mazat.');
      return;
    }

    const stationName = String(row?.nazev_stanoviste || row?.mesto || row?.stanoviste || 'neznámé stanoviště').trim();
    const confirmed = window.confirm(`Opravdu smazat stanoviště „${stationName}“ (ID ${id})?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setSyncMessage('');

    try {
      const response = await deleteStationAddress({ id });
      setSyncMessage(response?.data?.message || 'Záznam stanoviště byl smazán.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setSyncMessage(apiMessage || 'Smazání záznamu se nepodařilo.');
    } finally {
      setDeletingId(0);
    }
  }

  return (
    <section id="stations-main" className="station-anchor-target">
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="map" size={20} weight="duotone" />
            <span>Seznam výjezdových stanovišť / servisů</span>
          </h2>
          <p className="muted">Přehled výjezdových stanovišť a servisních adres s filtrováním, řazením a stránkováním.</p>
        </div>

        <div className="overview-header-actions">
          <div className="icon-actions">
            <button
              className="icon-action-btn"
              type="button"
              onClick={() => {
                skipNextDebouncedQuerySyncRef.current = true;
                skipNextDebouncedWdQuerySyncRef.current = true;
                setQueryInput('');
                setWdQueryInput('');
                updateSearchParams({
                  q: '',
                  page: 1,
                  stationTypes: null,
                  stationType: null,
                  wdQ: '',
                  wdPage: 1,
                  wdTypes: null,
                  wdType: null,
                });
              }}
              disabled={!hasAnyHeaderFilterActive}
              title="Zrušit filtry"
              aria-label="Zrušit filtry"
            >
              <AppIcon name="resetFilters" size={20} weight="regular" />
            </button>
            <button
              className="icon-action-btn"
              type="button"
              onClick={() => void handleSync(false)}
              disabled={syncing}
              title="Rychlá aktualizace z Webdispečinku"
              aria-label="Rychlá aktualizace z Webdispečinku"
            >
              <AppIcon name="db" size={20} weight="regular" />
            </button>
            <button
              className="icon-action-btn icon-action-btn-primary"
              type="button"
              onClick={openCreateModal}
              title="Přidat nové stanoviště"
              aria-label="Přidat nové stanoviště"
            >
              <span aria-hidden="true">+</span>
            </button>
            <button
              className="icon-action-btn icon-action-btn-primary"
              type="button"
              onClick={() => void handleSync(true)}
              disabled={syncing}
              title="Aktualizace z Webdispečinku"
              aria-label="Aktualizace z Webdispečinku"
            >
              <AppIcon name="sync" size={20} weight="regular" />
            </button>
          </div>
        </div>
      </div>

      <div className="overview-search-row">
        <div className="overview-search-wrap">
          <input
            className="search-input"
            placeholder="Hledat podle stanoviště, města, ulice, PSČ nebo lokace Webdispečinku"
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
              <span aria-hidden="true">x</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="overview-filter-row" ref={stationFilterRowRef}>
        <details
          className="overview-multifilter"
          open={openFilterKey === 'stationTypes'}
          onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'stationTypes' : null)}
        >
          <summary>Typ: {selectedLabel(selectedStationTypes, 'vše')}</summary>
          <div className="overview-multifilter-menu">
            {STATION_TYPE_OPTIONS.map((option) => (
              <label key={`station-type-${option.value}`} className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedStationTypes.includes(option.value)}
                  onChange={() => toggleStationTypeFilter(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      {error ? <div className="status-box">{error}</div> : null}
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader field="organizace" label="Organizace" />
              <SortableHeader field="nazev_stanoviste" label="Název stanoviště" />
              <SortableHeader field="mesto" label="Město" />
              <SortableHeader field="typ" label="Typ" />
              <SortableHeader field="ulice" label="Ulice" />
              <SortableHeader field="psc" label="PSČ" />
              <SortableHeader field="w_ln_match" label="Webdispečink lokace" />
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id || `${row.organizace}-${row.mesto || row.stanoviste}-${row.ulice}-${row.psc || 'bez-psc'}`}>
                <td>{row.organizace || '-'}</td>
                <td>{row.nazev_stanoviste || row.mesto || row.stanoviste || '-'}</td>
                <td>{row.mesto || row.stanoviste || '-'}</td>
                <td>{row.typ || 'VS'}</td>
                <td>{row.ulice || '-'}</td>
                <td>{row.psc || '-'}</td>
                <td>{row.w_ln_match || '-'}</td>
                <td>
                  <div className="table-action-icons">
                    <button
                      className="table-icon-btn"
                      type="button"
                      onClick={() => openEditModal(row)}
                      title="Upravit stanoviště"
                      aria-label="Upravit stanoviště"
                      disabled={deletingId === Number(row.id || 0)}
                    >
                      <AppIcon name="edit" size={14} />
                    </button>
                    <button
                      className="table-icon-btn table-icon-btn-danger"
                      type="button"
                      onClick={() => void handleDeleteRow(row)}
                      title={String(row.typ || 'VS').trim() === 'VS' ? 'Výchozí stanoviště typu VS nelze mazat' : 'Smazat záznam stanoviště'}
                      aria-label="Smazat záznam stanoviště"
                      disabled={deletingId === Number(row.id || 0) || String(row.typ || 'VS').trim() === 'VS'}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && pagedRows.length === 0 ? (
              <tr>
                <td colSpan={8}>V tabulce zatím nejsou žádná data.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <div className="station-edit-modal-backdrop" role="presentation">
          <div className="station-edit-modal" role="dialog" aria-modal="true" aria-label={editingId === -1 ? 'Nové stanoviště' : 'Upravit stanoviště'}>
            <div className="station-edit-modal-head">
              <h3 className="title-with-icon">
                <AppIcon name="edit" size={18} weight="duotone" />
                <span>{editingId === -1 ? 'Nové stanoviště' : 'Upravit stanoviště'}</span>
              </h3>
              <button className="table-icon-btn" type="button" onClick={closeEditModal} aria-label="Zavřít okno">
                <span aria-hidden="true">x</span>
              </button>
            </div>

            <p className="muted">{editingId === -1
              ? 'Ručně přidané stanoviště se uloží do hlavního seznamu i bez vazby na Webdispečink.'
              : 'Změny se uloží do hlavního seznamu výjezdových stanovišť / servisů.'}
            </p>

            <div className="station-edit-form-grid">
              <label>
                Organizace
                <input
                  className="search-input"
                  value={editForm.organizace}
                  onChange={(event) => updateEditField('organizace', event.target.value)}
                  disabled={editSaving}
                />
              </label>

              <label>
                Typ
                <select
                  className="station-edit-select"
                  value={editForm.typ}
                  onChange={(event) => updateEditField('typ', event.target.value)}
                  disabled={editSaving}
                >
                  <option value="VS">VS</option>
                  <option value="Servis">Servis</option>
                  <option value="Mimo">Mimo</option>
                </select>
              </label>

              <label>
                Název stanoviště
                <input
                  className="search-input"
                  value={editForm.nazev_stanoviste}
                  onChange={(event) => updateEditField('nazev_stanoviste', event.target.value)}
                  disabled={editSaving}
                />
              </label>

              <label>
                Město
                <input
                  className="search-input"
                  value={editForm.mesto}
                  onChange={(event) => updateEditField('mesto', event.target.value)}
                  disabled={editSaving}
                />
              </label>

              <label>
                PSČ
                <input
                  className="search-input"
                  value={editForm.psc}
                  onChange={(event) => updateEditField('psc', event.target.value)}
                  disabled={editSaving}
                />
              </label>

              <label className="station-edit-grid-full">
                Ulice
                <input
                  className="search-input"
                  value={editForm.ulice}
                  onChange={(event) => updateEditField('ulice', event.target.value)}
                  disabled={editSaving}
                />
              </label>

              <label className="station-edit-grid-full">
                Webdispečink lokace
                <input
                  className={`search-input${editingId === -1 ? '' : ' station-edit-readonly-input'}`}
                  value={editForm.w_ln_match}
                  placeholder="CZ Město, Ulice"
                  readOnly={editingId !== -1}
                  onChange={(event) => updateEditField('w_ln_match', event.target.value)}
                  disabled={editSaving}
                />
              </label>
            </div>

            {editError ? <div className="status-box">{editError}</div> : null}

            <div className="station-edit-modal-actions">
              <button className="table-pager-btn" type="button" onClick={closeEditModal} disabled={editSaving}>
                Zrušit
              </button>
              <button className="table-pager-btn station-edit-save-btn" type="button" onClick={() => void handleEditSave()} disabled={editSaving}>
                {editSaving ? 'Ukládám...' : editingId === -1 ? 'Vytvořit stanoviště' : 'Uložit změny'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="table-footer-controls">
        <p className="muted">Zobrazeno {pagedRows.length} z {total} položek.</p>

        <div className="table-pager-controls">
          <label className="table-page-size" htmlFor="stations-page-size">
            Na stránku
            <select
              id="stations-page-size"
              value={perPage}
              onChange={(event) => updateSearchParams({ perPage: Number(event.target.value), page: 1 })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
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

      <section id="stations-webdispecink" className="station-secondary-list station-anchor-target">
        <div className="section-head">
          <div>
            <h3 className="title-with-icon">
              <AppIcon name="map" size={18} weight="duotone" />
              <span>Všechny adresy z Webdispečinku</span>
            </h3>
            <p className="muted">Přehled unikátních adres načtených z Webdispečinku.</p>
          </div>
        </div>

        <div className="overview-search-row">
          <div className="overview-search-wrap">
            <input
              className="search-input"
              placeholder="Hledat ve Webdispečink lokacích"
              value={wdQueryInput}
              onChange={(event) => setWdQueryInput(event.target.value)}
            />
            {wdQueryInput ? (
              <button
                className="overview-search-clear-icon"
                type="button"
                onClick={() => {
                  skipNextDebouncedWdQuerySyncRef.current = true;
                  setWdQueryInput('');
                  updateSearchParams({ wdQ: '', wdPage: 1 });
                }}
                aria-label="Vymazat fulltext Webdispečinku"
                title="Vymazat"
              >
                <span aria-hidden="true">x</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="overview-filter-row" ref={wdFilterRowRef}>
          <details
            className="overview-multifilter"
            open={openFilterKey === 'wdTypes'}
            onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'wdTypes' : null)}
          >
            <summary>Typ: {selectedLabel(selectedWdTypes, 'vše')}</summary>
            <div className="overview-multifilter-menu">
              {WD_TYPE_OPTIONS.map((option) => (
                <label key={`wd-type-${option.value}`} className="overview-multifilter-option">
                  <input
                    type="checkbox"
                    checked={selectedWdTypes.includes(option.value)}
                    onChange={() => toggleWdTypeFilter(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="table-wrap table-wrap-wd-locations">
          <table>
            <thead>
              <tr>
                <SortableWdHeader field="w_ln" label="Webdispečink lokace" className="wd-col-location" />
                <SortableWdHeader field="cnt" label="Výskyt" className="wd-col-count" />
                <SortableWdHeader field="typ" label="Typ" className="wd-col-type" />
                <th className="wd-col-actions">Akce</th>
              </tr>
            </thead>
            <tbody>
              {wdPagedRows.map((row, index) => (
                <tr key={`${row.w_ln || 'empty'}-${index}`}>
                  <td className="wd-col-location" title={row.w_ln || '-'}>{row.w_ln || '-'}</td>
                  <td className="wd-col-count">{row.cnt || 0}</td>
                  <td className="wd-col-type">{row.typ || 'Mimo'}</td>
                  <td className="wd-col-actions">
                    <div className="table-action-inline">
                      {(() => {
                        const canPromote = Boolean(row.w_ln);

                        return ['VS', 'Servis', 'Mimo'].map((targetTyp) => {
                          const isActive = String(row.typ || 'Mimo') === targetTyp;
                          const actionKey = `${targetTyp}:${row.w_ln || ''}`;
                          return (
                            <button
                              key={targetTyp}
                              className={`table-typ-btn${isActive ? ' is-active' : ''}`}
                              type="button"
                              onClick={() => void handlePromoteWln(String(row.w_ln || ''), targetTyp)}
                              disabled={upsertingKey === actionKey || !canPromote}
                              title={canPromote
                                ? `Nastavit typ ${targetTyp} v hlavní tabulce stanovišť`
                                : 'Nelze přidat: chybí lokace'}
                            >
                              {targetTyp}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && wdPagedRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>Zatím nejsou dostupné žádné lokace Webdispečinku.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="table-footer-controls">
          <p className="muted">Zobrazeno {wdPagedRows.length} z {wdTotal} položek.</p>

          <div className="table-pager-controls">
            <label className="table-page-size" htmlFor="wd-page-size">
              Na stránku
              <select
                id="wd-page-size"
                value={wdPerPage}
                onChange={(event) => updateSearchParams({ wdPerPage: Number(event.target.value), wdPage: 1 })}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={`wd-${size}`} value={size}>{size}</option>
                ))}
              </select>
            </label>

            <button className="table-pager-btn" type="button" onClick={() => handleWdPageChange(wdPage - 1)} disabled={wdPage <= 1 || loading}>
              Předchozí
            </button>
            <span className="table-page-indicator">Strana {Math.min(wdPage, wdTotalPages)} / {wdTotalPages}</span>
            <button className="table-pager-btn" type="button" onClick={() => handleWdPageChange(wdPage + 1)} disabled={wdPage >= wdTotalPages || loading}>
              Další
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}