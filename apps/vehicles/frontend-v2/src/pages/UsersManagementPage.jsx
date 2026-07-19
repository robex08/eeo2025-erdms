import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppIcon from '../components/ui/AppIcon';
import {
  createUser,
  deleteUser,
  fetchUserVehicleAssignments,
  fetchUsers,
  fetchUsersVehiclesCatalog,
  updateUser,
} from '../services/apiClient';
import { useAuth } from '../auth/AuthContext';
import useDebouncedValue from '../hooks/useDebouncedValue';

const USERS_FILTERS_LS_KEY = 'vehicles_v2_users_filters';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SORT_FIELDS = ['username', 'display_name', 'role_code', 'auth_source', 'approval_status', 'is_active', 'created_at', 'updated_at'];
const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'fleet_manager', label: 'Správce vozového parku' },
  { value: 'user', label: 'Uživatel' },
];
const AUTH_SOURCE_OPTIONS = [
  { value: 'local', label: 'Lokální' },
  { value: 'entra_id', label: 'Entra ID' },
];
const APPROVAL_OPTIONS = [
  { value: 'approved', label: 'Schváleno' },
  { value: 'pending', label: 'Čeká na schválení' },
];
const ACCESS_OPTIONS = [
  { value: 'active', label: 'Aktivní' },
  { value: 'blocked', label: 'Blokovaný' },
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

function roleLabel(roleCode) {
  const found = ROLE_OPTIONS.find((option) => option.value === roleCode);
  return found ? found.label : roleCode;
}

function authSourceLabel(value) {
  const found = AUTH_SOURCE_OPTIONS.find((option) => option.value === value);
  return found ? found.label : value;
}

function approvalLabel(value) {
  const found = APPROVAL_OPTIONS.find((option) => option.value === value);
  return found ? found.label : value;
}

function accessLabel(isActive) {
  return isActive ? 'Aktivní' : 'Blokovaný';
}

function vehicleStatusLabel(value) {
  const normalized = String(value || '').trim();
  if (normalized === '') {
    return 'Neznámý';
  }

  const mapping = {
    aktivni: 'Aktivní',
    vyrazene: 'Vyřazené',
    neaktivni: 'Neaktivní',
    active: 'Aktivní',
    retired: 'Vyřazené',
    inactive: 'Neaktivní',
  };

  const lowered = normalizeText(normalized);
  if (mapping[lowered]) {
    return mapping[lowered];
  }

  return normalized;
}

function sortValue(user, field) {
  if (field === 'is_active') {
    return user.is_active ? '1' : '0';
  }

  return String(user[field] || '');
}

function createEmptyForm() {
  return {
    id: 0,
    username: '',
    display_name: '',
    email: '',
    role_code: 'user',
    auth_source: 'local',
    approval_status: 'approved',
    entra_id: '',
    is_active: true,
    must_change_password: true,
    has_all_vehicles: true,
    assigned_vehicle_ids: [],
    password: '',
  };
}

export default function UsersManagementPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState(createEmptyForm());
  const [vehicleCatalog, setVehicleCatalog] = useState([]);
  const [vehicleStatuses, setVehicleStatuses] = useState([]);
  const [vehicleCatalogLoading, setVehicleCatalogLoading] = useState(false);
  const [vehicleCatalogLoaded, setVehicleCatalogLoaded] = useState(false);
  const [vehicleAssignmentLoading, setVehicleAssignmentLoading] = useState(false);
  const [vehicleAssignmentError, setVehicleAssignmentError] = useState('');
  const [vehicleFilterQuery, setVehicleFilterQuery] = useState('');
  const [vehicleFilterStatus, setVehicleFilterStatus] = useState('all');
  const [activeEditTab, setActiveEditTab] = useState('basic');
  const restoredFromLsRef = useRef(false);

  const currentRole = String(user?.role || '').toLowerCase();
  const canManageUsers = currentRole === 'superadmin' || currentRole === 'administrator';

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

    const saved = localStorage.getItem(USERS_FILTERS_LS_KEY);
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
      localStorage.removeItem(USERS_FILTERS_LS_KEY);
      return;
    }

    localStorage.setItem(USERS_FILTERS_LS_KEY, serialized);
  }, [searchParams]);

  const query = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(query);
  const debouncedQueryInput = useDebouncedValue(queryInput, 750);
  const sortByRaw = searchParams.get('sortBy') || 'updated_at';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'updated_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const roleFilter = searchParams.get('role') || 'all';
  const authSourceFilter = searchParams.get('authSource') || 'all';
  const approvalFilter = searchParams.get('approval') || 'all';
  const accessFilter = searchParams.get('access') || 'all';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const perPageRaw = parsePositiveInt(searchParams.get('perPage'), 10);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw) ? perPageRaw : 10;

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  useEffect(() => {
    if (debouncedQueryInput === query) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (debouncedQueryInput.trim() === '') {
      next.delete('q');
    } else {
      next.set('q', debouncedQueryInput);
    }
    next.set('page', '1');
    setSearchParams(next);
  }, [debouncedQueryInput, query, searchParams, setSearchParams]);

  async function loadData() {
    if (!canManageUsers) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchUsers();
      setRows(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      setRows([]);
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Nepodařilo se načíst správu uživatelů.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [canManageUsers]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(query);

    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role_code !== roleFilter) {
        return false;
      }

      if (authSourceFilter !== 'all' && row.auth_source !== authSourceFilter) {
        return false;
      }

      if (approvalFilter !== 'all' && row.approval_status !== approvalFilter) {
        return false;
      }

      if (accessFilter === 'active' && !row.is_active) {
        return false;
      }

      if (accessFilter === 'blocked' && row.is_active) {
        return false;
      }

      if (needle === '') {
        return true;
      }

      const haystack = [
        row.username,
        row.display_name,
        row.email,
        row.entra_id,
        roleLabel(row.role_code),
      ].map((value) => normalizeText(value)).join(' ');

      return haystack.includes(needle);
    });
  }, [accessFilter, approvalFilter, authSourceFilter, query, roleFilter, rows]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((left, right) => {
      const cmp = sortValue(left, sortBy).localeCompare(sortValue(right, sortBy), 'cs', {
        sensitivity: 'base',
        numeric: true,
      });

      return sortDir === 'asc' ? cmp : -cmp;
    });
    return next;
  }, [filteredRows, sortBy, sortDir]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [perPage, safePage, sortedRows]);

  useEffect(() => {
    if (page <= totalPages) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('page', String(totalPages));
    setSearchParams(next);
  }, [page, searchParams, setSearchParams, totalPages]);

  function updateSearchParam(key, value, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '' || value === null) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }

    if (resetPage) {
      next.set('page', '1');
    }

    setSearchParams(next);
  }

  function handleSortChange(field) {
    const next = new URLSearchParams(searchParams);
    const nextDir = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    next.set('sortBy', field);
    next.set('sortDir', nextDir);
    next.set('page', '1');
    setSearchParams(next);
  }

  function handlePageChange(nextPage) {
    const normalized = Math.min(Math.max(1, nextPage), totalPages);
    updateSearchParam('page', normalized, false);
  }

  function openCreateModal() {
    setEditError('');
    setVehicleAssignmentError('');
    setVehicleFilterQuery('');
    setVehicleFilterStatus('all');
    setActiveEditTab('basic');
    setEditingId(-1);
    setForm(createEmptyForm());
    void ensureVehicleCatalogLoaded();
  }

  async function openEditModal(row) {
    setEditError('');
    setVehicleAssignmentError('');
    setVehicleFilterQuery('');
    setVehicleFilterStatus('all');
    setActiveEditTab('basic');
    setEditingId(Number(row.id || 0));
    setForm({
      id: Number(row.id || 0),
      username: String(row.username || ''),
      display_name: String(row.display_name || ''),
      email: String(row.email || ''),
      role_code: String(row.role_code || 'user'),
      auth_source: String(row.auth_source || 'local'),
      approval_status: String(row.approval_status || 'approved'),
      entra_id: String(row.entra_id || ''),
      is_active: Boolean(row.is_active),
      must_change_password: Boolean(row.must_change_password),
      has_all_vehicles: Boolean(row.has_all_vehicles ?? true),
      assigned_vehicle_ids: [],
      password: '',
    });

    await ensureVehicleCatalogLoaded();

    const userId = Number(row.id || 0);
    if (userId <= 0) {
      return;
    }

    setVehicleAssignmentLoading(true);
    try {
      const response = await fetchUserVehicleAssignments(userId);
      const item = response?.data?.item;
      setForm((prev) => ({
        ...prev,
        has_all_vehicles: Boolean(item?.has_all_vehicles ?? true),
        assigned_vehicle_ids: Array.isArray(item?.vehicle_ids)
          ? item.vehicle_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
          : [],
      }));
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setVehicleAssignmentError(apiMessage || 'Nepodařilo se načíst přiřazená vozidla.');
    } finally {
      setVehicleAssignmentLoading(false);
    }
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setEditingId(0);
    setEditError('');
  }

  function updateFormField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAllVehiclesFlag(value) {
    setForm((prev) => ({
      ...prev,
      has_all_vehicles: value,
      assigned_vehicle_ids: value ? [] : prev.assigned_vehicle_ids,
    }));
  }

  function toggleVehicleAssignment(vehicleId, checked) {
    setForm((prev) => {
      const nextSet = new Set(Array.isArray(prev.assigned_vehicle_ids) ? prev.assigned_vehicle_ids : []);
      if (checked) {
        nextSet.add(vehicleId);
      } else {
        nextSet.delete(vehicleId);
      }

      return {
        ...prev,
        assigned_vehicle_ids: Array.from(nextSet).sort((a, b) => a - b),
      };
    });
  }

  function addFilteredVehiclesToSelection() {
    const filteredIds = filteredAssignmentVehicles
      .map((vehicle) => Number(vehicle.id || 0))
      .filter((id) => Number.isFinite(id) && id > 0);

    setForm((prev) => {
      const selected = new Set(Array.isArray(prev.assigned_vehicle_ids) ? prev.assigned_vehicle_ids : []);
      for (const vehicleId of filteredIds) {
        selected.add(vehicleId);
      }

      return {
        ...prev,
        assigned_vehicle_ids: Array.from(selected).sort((a, b) => a - b),
      };
    });
  }

  function removeFilteredVehiclesFromSelection() {
    const filteredIds = new Set(
      filteredAssignmentVehicles
        .map((vehicle) => Number(vehicle.id || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    setForm((prev) => {
      const selected = Array.isArray(prev.assigned_vehicle_ids) ? prev.assigned_vehicle_ids : [];
      const next = selected.filter((vehicleId) => !filteredIds.has(Number(vehicleId)));

      return {
        ...prev,
        assigned_vehicle_ids: next.sort((a, b) => a - b),
      };
    });
  }

  async function ensureVehicleCatalogLoaded() {
    if (vehicleCatalogLoaded || vehicleCatalogLoading) {
      return;
    }

    setVehicleCatalogLoading(true);
    setVehicleAssignmentError('');
    try {
      const response = await fetchUsersVehiclesCatalog();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      const statuses = Array.isArray(response?.data?.statuses) ? response.data.statuses : [];
      setVehicleCatalog(items);
      setVehicleStatuses(statuses);
      setVehicleCatalogLoaded(true);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setVehicleAssignmentError(apiMessage || 'Nepodařilo se načíst seznam vozidel.');
    } finally {
      setVehicleCatalogLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setEditError('');
    setStatusMessage('');

    try {
      const payload = {
        id: form.id,
        username: form.username,
        display_name: form.display_name,
        email: form.email,
        role_code: form.role_code,
        auth_source: form.auth_source,
        approval_status: form.approval_status,
        entra_id: form.entra_id,
        is_active: form.is_active,
        must_change_password: form.must_change_password,
        has_all_vehicles: form.has_all_vehicles,
        assigned_vehicle_ids: form.assigned_vehicle_ids,
        password: form.password,
      };

      const response = editingId === -1 ? await createUser(payload) : await updateUser(payload);
      setStatusMessage(response?.data?.message || 'Uživatel byl uložen.');
      closeModal();
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setEditError(apiMessage || 'Uložení uživatele se nepodařilo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const userId = Number(row?.id || 0);
    if (userId <= 0) {
      return;
    }

    const confirmed = window.confirm(`Opravdu smazat uživatele „${row.username}“?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(userId);
    setStatusMessage('');

    try {
      const response = await deleteUser({ id: userId });
      setStatusMessage(response?.data?.message || 'Uživatel byl smazán.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setStatusMessage(apiMessage || 'Smazání uživatele se nepodařilo.');
    } finally {
      setDeletingId(0);
    }
  }

  async function handleToggleActive(row) {
    const nextActive = !Boolean(row.is_active);
    setStatusMessage('');

    try {
      const response = await updateUser({ id: row.id, is_active: nextActive });
      setStatusMessage(response?.data?.message || 'Stav uživatele byl aktualizován.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setStatusMessage(apiMessage || 'Změna stavu uživatele se nepodařila.');
    }
  }

  async function handleApprove(row) {
    setStatusMessage('');

    try {
      const response = await updateUser({ id: row.id, approval_status: 'approved', is_active: true });
      setStatusMessage(response?.data?.message || 'Účet byl schválen.');
      await loadData();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setStatusMessage(apiMessage || 'Schválení účtu se nepodařilo.');
    }
  }

  const filteredAssignmentVehicles = useMemo(() => {
    const needle = normalizeText(vehicleFilterQuery);
    const selectedStatus = String(vehicleFilterStatus || 'all').trim().toLowerCase();

    return vehicleCatalog.filter((vehicle) => {
      const statusRaw = String(vehicle?.status || '').trim().toLowerCase();
      if (selectedStatus !== 'all' && statusRaw !== selectedStatus) {
        return false;
      }

      if (needle === '') {
        return true;
      }

      const haystack = [
        vehicle.spz,
        vehicle.status,
        vehicle.w_popis,
        vehicle.w_stanoviste,
        vehicle.w_groupname,
        vehicle.w_tovarni_znacka,
        vehicle.w_model_vozu,
      ].map((value) => normalizeText(value)).join(' ');

      return haystack.includes(needle);
    });
  }, [vehicleCatalog, vehicleFilterQuery, vehicleFilterStatus]);

  const selectedAssignmentCount = Array.isArray(form.assigned_vehicle_ids) ? form.assigned_vehicle_ids.length : 0;
  const filteredVehicleIds = filteredAssignmentVehicles
    .map((vehicle) => Number(vehicle.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);
  const selectedInFilteredCount = filteredVehicleIds.filter((id) => form.assigned_vehicle_ids.includes(id)).length;

  function renderSortIcon(field) {
    if (sortBy !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={sortDir === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
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

  const hasAnyFilterActive = query.trim() !== '' || roleFilter !== 'all' || authSourceFilter !== 'all' || approvalFilter !== 'all' || accessFilter !== 'all';

  if (!canManageUsers) {
    return <div className="status-box">Správa uživatelů je dostupná pouze rolím superadmin a administrator.</div>;
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="users" size={20} weight="duotone" />
            <span>Správa uživatelů</span>
          </h2>
          <p className="muted">Přehled, schvalování a ruční správa přístupů do aplikace Vehicles V2. Správa uživatelů je dostupná pouze rolím administrátor a superadmin.</p>
        </div>

        <div className="overview-header-actions">
          <div className="icon-actions">
            <button
              className="icon-action-btn"
              type="button"
              onClick={() => {
                setQueryInput('');
                setSearchParams(new URLSearchParams());
              }}
              disabled={!hasAnyFilterActive}
              title="Zrušit filtry"
              aria-label="Zrušit filtry"
            >
              <AppIcon name="resetFilters" size={20} weight="regular" />
            </button>
            <button
              className="icon-action-btn icon-action-btn-primary"
              type="button"
              onClick={openCreateModal}
              title="Nový uživatel"
              aria-label="Nový uživatel"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overview-search-row">
        <div className="overview-search-wrap">
          <input
            className="search-input"
            placeholder="Hledat podle jména, role, emailu nebo Entra ID"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          {queryInput ? (
            <button
              className="overview-search-clear-icon"
              type="button"
              onClick={() => {
                setQueryInput('');
                updateSearchParam('q', '');
              }}
              aria-label="Vymazat fulltext"
              title="Vymazat"
            >
              <span aria-hidden="true">x</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="overview-filter-row users-filter-row">
        <label className="users-filter-select">
          Role
          <select value={roleFilter} onChange={(event) => updateSearchParam('role', event.target.value)}>
            <option value="all">Všechny</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="users-filter-select">
          Typ účtu
          <select value={authSourceFilter} onChange={(event) => updateSearchParam('authSource', event.target.value)}>
            <option value="all">Všechny</option>
            {AUTH_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="users-filter-select">
          Schválení
          <select value={approvalFilter} onChange={(event) => updateSearchParam('approval', event.target.value)}>
            <option value="all">Vše</option>
            {APPROVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="users-filter-select">
          Přístup
          <select value={accessFilter} onChange={(event) => updateSearchParam('access', event.target.value)}>
            <option value="all">Vše</option>
            {ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="status-box">{error}</div> : null}
      {statusMessage ? <div className="status-box">{statusMessage}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader field="username" label="Username" />
              <SortableHeader field="display_name" label="Jméno" />
              <SortableHeader field="role_code" label="Role" />
              <SortableHeader field="auth_source" label="Typ účtu" />
              <SortableHeader field="approval_status" label="Schválení" />
              <SortableHeader field="is_active" label="Přístup" />
              <th>Lokální heslo</th>
              <th>Entra ID</th>
              <SortableHeader field="updated_at" label="Poslední změna" />
              <th className="table-col-actions">Akce</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const isPending = row.approval_status === 'pending';
              const isSelf = Number(row.id) === Number(user?.id || 0);

              return (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td>{row.display_name || '-'}</td>
                  <td><span className="users-role-chip">{roleLabel(row.role_code)}</span></td>
                  <td>{authSourceLabel(row.auth_source)}</td>
                  <td>
                    <span className={`users-state-chip ${isPending ? 'is-pending' : 'is-approved'}`}>
                      {approvalLabel(row.approval_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`users-state-chip ${row.is_active ? 'is-approved' : 'is-blocked'}`}>
                      {accessLabel(row.is_active)}
                    </span>
                  </td>
                  <td>{row.has_local_password ? 'Ano' : 'Ne'}</td>
                  <td>{row.entra_id || '-'}</td>
                  <td>{formatDateTimeCs(row.updated_at)}</td>
                  <td className="table-cell-actions">
                    <div className="table-action-icons">
                      <button
                        className="table-icon-btn"
                        type="button"
                        onClick={() => void openEditModal(row)}
                        title="Upravit uživatele"
                        aria-label="Upravit uživatele"
                      >
                        <AppIcon name="edit" size={14} weight="duotone" />
                      </button>
                      {isPending ? (
                        <button
                          className="table-icon-btn table-icon-btn-primary"
                          type="button"
                          onClick={() => void handleApprove(row)}
                          title="Schválit účet"
                          aria-label="Schválit účet"
                        >
                          <AppIcon name="approve" size={14} weight="duotone" />
                        </button>
                      ) : null}
                      <button
                        className="table-icon-btn"
                        type="button"
                        onClick={() => void handleToggleActive(row)}
                        disabled={isSelf}
                        title={row.is_active ? 'Blokovat přístup' : 'Povolit přístup'}
                        aria-label={row.is_active ? 'Blokovat přístup' : 'Povolit přístup'}
                      >
                        <AppIcon name={row.is_active ? 'lock' : 'unlock'} size={14} weight="duotone" />
                      </button>
                      <button
                        className="table-icon-btn table-icon-btn-danger"
                        type="button"
                        onClick={() => void handleDelete(row)}
                        disabled={deletingId === Number(row.id) || isSelf}
                        title="Smazat uživatele"
                        aria-label="Smazat uživatele"
                      >
                        <AppIcon name="delete" size={14} weight="duotone" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && pagedRows.length === 0 ? (
              <tr>
                <td colSpan={10}>V tabulce zatím nejsou žádní uživatelé.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <div className="station-edit-modal-backdrop" role="presentation">
          <div className="station-edit-modal" role="dialog" aria-modal="true" aria-label="Správa uživatele">
            <div className="station-edit-modal-head">
              <h3 className="title-with-icon">
                <AppIcon name="users" size={18} weight="duotone" />
                <span>{editingId === -1 ? 'Nový uživatel' : 'Upravit uživatele'}</span>
              </h3>
              <button className="table-icon-btn" type="button" onClick={closeModal} aria-label="Zavřít okno">
                <span aria-hidden="true">x</span>
              </button>
            </div>

            <p className="muted user-admin-note">Správa uživatelů je dostupná pouze rolím administrátor a superadmin.</p>

            <div className="user-edit-tabs" role="tablist" aria-label="Sekce editace uživatele">
              <button
                type="button"
                role="tab"
                aria-selected={activeEditTab === 'basic'}
                className={`user-edit-tab-btn${activeEditTab === 'basic' ? ' is-active' : ''}`}
                onClick={() => setActiveEditTab('basic')}
              >
                Základní údaje
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeEditTab === 'vehicles'}
                className={`user-edit-tab-btn${activeEditTab === 'vehicles' ? ' is-active' : ''}`}
                onClick={() => setActiveEditTab('vehicles')}
              >
                Výběr vozů
                <span className="user-edit-tab-hint">{form.has_all_vehicles ? 'všechny' : selectedAssignmentCount}</span>
              </button>
            </div>

            {activeEditTab === 'basic' ? (
              <div className="station-edit-form-grid user-admin-form-grid" role="tabpanel">
                <label>
                  Username
                  <input className="search-input" value={form.username} onChange={(event) => updateFormField('username', event.target.value)} disabled={saving} />
                </label>

                <label>
                  Jméno / popis
                  <input className="search-input" value={form.display_name} onChange={(event) => updateFormField('display_name', event.target.value)} disabled={saving} />
                </label>

                <label>
                  E-mail
                  <input className="search-input" value={form.email} onChange={(event) => updateFormField('email', event.target.value)} disabled={saving} />
                </label>

                <label>
                  Entra ID / alias
                  <input className="search-input" value={form.entra_id} onChange={(event) => updateFormField('entra_id', event.target.value)} disabled={saving} />
                </label>

                <label>
                  Role
                  <select className="station-edit-select" value={form.role_code} onChange={(event) => updateFormField('role_code', event.target.value)} disabled={saving}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Typ účtu
                  <select className="station-edit-select" value={form.auth_source} onChange={(event) => updateFormField('auth_source', event.target.value)} disabled={saving}>
                    {AUTH_SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Schválení
                  <select className="station-edit-select" value={form.approval_status} onChange={(event) => updateFormField('approval_status', event.target.value)} disabled={saving}>
                    {APPROVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Heslo {editingId === -1 ? '' : '(nechte prázdné beze změny)'}
                  <input className="search-input" type="password" value={form.password} onChange={(event) => updateFormField('password', event.target.value)} disabled={saving} />
                </label>

                <label className="user-admin-checkbox-row">
                  <input type="checkbox" checked={form.is_active} onChange={(event) => updateFormField('is_active', event.target.checked)} disabled={saving || form.approval_status === 'pending'} />
                  <span>Přístup povolen</span>
                </label>

                <label className="user-admin-checkbox-row">
                  <input type="checkbox" checked={form.must_change_password} onChange={(event) => updateFormField('must_change_password', event.target.checked)} disabled={saving} />
                  <span>Vynutit změnu hesla při lokálním přihlášení</span>
                </label>
              </div>
            ) : null}

            {activeEditTab === 'vehicles' ? (
              <div className="user-vehicles-assignment-panel" role="tabpanel">
                <div className="user-vehicles-assignment-head">
                  <h4>Přiřazená vozidla</h4>
                  <span className="muted">
                    {form.has_all_vehicles
                      ? 'Uživatel má přístup ke všem vozům.'
                      : `Vybráno ${selectedAssignmentCount} vozidel.`}
                  </span>
                </div>

                <label className="user-admin-checkbox-row">
                  <input
                    type="checkbox"
                    checked={Boolean(form.has_all_vehicles)}
                    onChange={(event) => updateAllVehiclesFlag(event.target.checked)}
                    disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading}
                  />
                  <span>Všechny vozy</span>
                </label>

                {!form.has_all_vehicles ? (
                  <>
                    <div className="user-vehicles-filter-row">
                      <input
                        className="search-input"
                        placeholder="Filtrovat vozidla (SPZ, status, volací znak, stanoviště...)"
                        value={vehicleFilterQuery}
                        onChange={(event) => setVehicleFilterQuery(event.target.value)}
                        disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading}
                      />

                      <select
                        className="station-edit-select"
                        value={vehicleFilterStatus}
                        onChange={(event) => setVehicleFilterStatus(event.target.value)}
                        disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading}
                      >
                        <option value="all">Všechny statusy</option>
                        {vehicleStatuses.map((statusValue) => (
                          <option key={statusValue} value={String(statusValue).toLowerCase()}>
                            {vehicleStatusLabel(statusValue)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="user-vehicles-bulk-actions">
                      <button
                        type="button"
                        className="table-pager-btn"
                        onClick={addFilteredVehiclesToSelection}
                        disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading || filteredVehicleIds.length === 0}
                      >
                        Vybrat všechny filtrované ({filteredVehicleIds.length})
                      </button>
                      <button
                        type="button"
                        className="table-pager-btn"
                        onClick={removeFilteredVehiclesFromSelection}
                        disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading || selectedInFilteredCount === 0}
                      >
                        Odebrat filtrované ({selectedInFilteredCount})
                      </button>
                    </div>

                    <div className="user-vehicles-list" role="list">
                      {filteredAssignmentVehicles.map((vehicle) => {
                        const vehicleId = Number(vehicle.id || 0);
                        const isChecked = form.assigned_vehicle_ids.includes(vehicleId);

                        return (
                          <label key={vehicleId} className="user-vehicles-item" role="listitem">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => toggleVehicleAssignment(vehicleId, event.target.checked)}
                              disabled={saving || vehicleCatalogLoading || vehicleAssignmentLoading}
                            />

                            <span className="user-vehicles-item-main">
                              <strong>{vehicle.spz || `ID ${vehicleId}`}</strong>
                              <small>
                                {vehicle.w_popis || 'Bez volacího znaku'}
                                {' · '}
                                {vehicle.w_stanoviste || 'Bez stanoviště'}
                                {' · '}
                                {vehicle.w_groupname || 'Bez skupiny'}
                              </small>
                            </span>

                            <span className="users-state-chip user-vehicle-status-chip">
                              {vehicleStatusLabel(vehicle.status)}
                            </span>
                          </label>
                        );
                      })}

                      {!vehicleCatalogLoading && !vehicleAssignmentLoading && filteredAssignmentVehicles.length === 0 ? (
                        <div className="status-box">Žádná vozidla neodpovídají filtru.</div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {vehicleAssignmentError ? <div className="status-box">{vehicleAssignmentError}</div> : null}
            {editError ? <div className="status-box">{editError}</div> : null}

            <div className="station-edit-modal-actions">
              <button className="table-pager-btn" type="button" onClick={closeModal} disabled={saving}>
                Zrušit
              </button>
              <button className="table-pager-btn station-edit-save-btn" type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Ukládám...' : editingId === -1 ? 'Vytvořit uživatele' : 'Uložit změny'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="table-footer-controls">
        <p className="muted">Zobrazeno {pagedRows.length} z {total} položek.</p>

        <div className="table-pager-controls">
          <label className="table-page-size" htmlFor="users-page-size">
            Na stránku
            <select id="users-page-size" value={perPage} onChange={(event) => updateSearchParam('perPage', Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(safePage - 1)} disabled={safePage <= 1 || loading}>
            Předchozí
          </button>
          <span className="table-page-indicator">Strana {safePage} / {totalPages}</span>
          <button className="table-pager-btn" type="button" onClick={() => handlePageChange(safePage + 1)} disabled={safePage >= totalPages || loading}>
            Další
          </button>
        </div>
      </div>
    </section>
  );
}