import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  UserCheck, Plus, Trash2, Calendar, RefreshCw, AlertCircle, CheckCircle,
  X, Info, Users, Clock, Shield, Eye, Loader, Star, Bell, Edit2, ChevronRight, XCircle,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import DatePicker from './DatePicker';
import {
  fetchMySubstitutions,
  createSubstitution,
  updateSubstitution,
  createSubstitutionAdmin,
  deactivateSubstitution,
  fetchSubstitutionCandidates,
  fetchCurrentlySubstituting,
  fetchAllSubstitutionsAdmin,
  fetchManageableUsers,
} from '../services/apiSubstitution';

// ─── Animace ──────────────────────────────────────────────────────────────────
const spinAnim   = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const fadeInUp   = keyframes`from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}`;
const fadeInBg   = keyframes`from{opacity:0;}to{opacity:1;}`;
const slideInUp  = keyframes`from{opacity:0;transform:translateY(32px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}`;

// ─── Layout ───────────────────────────────────────────────────────────────────
const Container = styled.div`
  width: 100%;
  animation: ${fadeInUp} 0.3s ease;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PageTitle = styled.div`
  h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0;
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.5;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
`;

// ─── View switcher (Moje / Systém) ────────────────────────────────────────────
const ViewSwitcher = styled.div`
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 1.25rem;
  width: fit-content;
`;

const ViewTab = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  background: ${({ $active }) => $active ? 'white' : 'transparent'};
  color: ${({ $active }) => $active ? '#1e293b' : '#64748b'};
  box-shadow: ${({ $active }) => $active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'};
  &:hover:not([disabled]) { color: #1e293b; }
`;

// ─── Karta / tabulka ──────────────────────────────────────────────────────────
const Card = styled.div`
  background: white;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  margin-bottom: 1.25rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.95rem 1.4rem;
  background: #fafafa;
  border-bottom: 1px solid #f1f5f9;
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
`;

// ─── Tabulka ──────────────────────────────────────────────────────────────────
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
`;

const Th = styled.th`
  padding: 0.6rem 1rem;
  text-align: left;
  font-weight: 700;
  color: #64748b;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #1e293b;
`;

const Tr = styled.tr`
  transition: background 0.15s;
  &:last-child td { border-bottom: none; }
  &:hover { background: #f8fafc; }
`;

const EmptyRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
    color: #94a3b8;
  }
`;

const EmptyIcon = styled.div`
  width: 52px; height: 52px; border-radius: 50%;
  background: #f1f5f9; display: flex; align-items: center;
  justify-content: center; margin: 0 auto 0.75rem;
  color: #cbd5e1;
`;

// ─── Status Pills ─────────────────────────────────────────────────────────────
const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  background: ${({ $s }) =>
    $s === 'active' ? '#dcfce7' : $s === 'future' ? '#fef9c3' : '#f1f5f9'};
  color: ${({ $s }) =>
    $s === 'active' ? '#15803d' : $s === 'future' ? '#92400e' : '#94a3b8'};
`;

const PermPill = styled.span`
  padding: 0.15rem 0.45rem;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
  white-space: nowrap;
`;

const PermList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  max-width: 340px;
`;

// ─── Akce tlačítka ────────────────────────────────────────────────────────────
const ActionBtn = styled.button`
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border-radius: 7px; border: 1.5px solid #e2e8f0;
  background: #fff; color: #64748b; cursor: pointer;
  transition: all 0.16s;
  &:hover:not(:disabled) {
    border-color: ${({ $danger }) => $danger ? '#fca5a5' : '#a5b4fc'};
    color: ${({ $danger }) => $danger ? '#dc2626' : '#4f46e5'};
    background: ${({ $danger }) => $danger ? '#fff1f2' : '#eef2ff'};
  }
  &:disabled { opacity: 0.35; cursor: default; }
`;

const ActionsCell = styled.div`
  display: flex; gap: 0.35rem; align-items: center;
`;

// ─── Hlavní tlačítka ──────────────────────────────────────────────────────────
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: ${({ $sm }) => $sm ? '0.38rem 0.7rem' : '0.55rem 1.1rem'};
  border-radius: 9px; border: none;
  font-size: ${({ $sm }) => $sm ? '0.78rem' : '0.85rem'};
  font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap;
  background: ${({ $v }) =>
    $v === 'primary' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' :
    $v === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' :
    $v === 'danger'  ? '#fee2e2' :
    $v === 'ghost'   ? 'transparent' : '#f1f5f9'};
  color: ${({ $v }) =>
    $v === 'primary' || $v === 'success' ? 'white' :
    $v === 'danger'  ? '#dc2626' :
    $v === 'ghost'   ? '#64748b' : '#475569'};
  &:hover:not(:disabled) {
    box-shadow: ${({ $v }) =>
      $v === 'primary' ? '0 4px 14px rgba(99,102,241,.35)' :
      $v === 'success' ? '0 4px 14px rgba(16,185,129,.35)' : 'none'};
    transform: ${({ $v }) => ($v === 'primary' || $v === 'success') ? 'translateY(-1px)' : 'none'};
    background: ${({ $v }) => $v === 'danger' ? '#fecaca' : $v === 'ghost' ? '#f1f5f9' : undefined};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
  svg { flex-shrink: 0; }
`;

const SpinIcon = styled(RefreshCw)`animation: ${spinAnim} 0.9s linear infinite;`;

// ─── Info banner (kdo mě zastupuje) ──────────────────────────────────────────
const InfoBanner = styled.div`
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.875rem 1.1rem;
  background: linear-gradient(135deg,#f0fdf4,#dcfce7);
  border: 1px solid #86efac;
  border-radius: 12px;
  margin-bottom: 1.25rem;
  font-size: 0.84rem; color: #15803d; line-height: 1.5;
  svg { flex-shrink: 0; margin-top: 1px; }
`;

const Alert = styled.div`
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.8rem 1rem; border-radius: 9px;
  font-size: 0.83rem; line-height: 1.5;
  background: ${({ $t }) => $t === 'error' ? '#fef2f2' : $t === 'info' ? '#eff6ff' : '#f0fdf4'};
  color: ${({ $t }) => $t === 'error' ? '#dc2626' : $t === 'info' ? '#1d4ed8' : '#15803d'};
  border: 1px solid ${({ $t }) => $t === 'error' ? '#fecaca' : $t === 'info' ? '#bfdbfe' : '#bbf7d0'};
  margin-bottom: 1rem;
  svg { flex-shrink: 0; margin-top: 1px; }
`;

// ─── MODAL ────────────────────────────────────────────────────────────────────
const ModalOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(15,23,42,0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; padding: 1rem;
  animation: ${fadeInBg} 0.2s ease;
`;

const ModalBox = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 620px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,.15);
  animation: ${slideInUp} 0.35s cubic-bezier(.16,1,.3,1);
`;

const ModalHead = styled.div`
  padding: 1.25rem 1.5rem;
  background: ${({ $admin }) =>
    $admin ? 'linear-gradient(135deg,#dc2626,#b91c1c)' :
             'linear-gradient(135deg,#4f46e5,#6366f1)'};
  color: white;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  flex-shrink: 0;
`;

const ModalHeadTitle = styled.div`
  h3 { margin: 0 0 0.2rem; font-size: 1.05rem; font-weight: 700; }
  p  { margin: 0; font-size: 0.8rem; opacity: 0.82; }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  display: flex; justify-content: flex-end; gap: 0.65rem;
  background: #fafafa;
  flex-shrink: 0;
`;

const CloseBtn = styled.button`
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: rgba(255,255,255,0.18); color: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.28); }
`;

// ─── Formulářové prvky ────────────────────────────────────────────────────────
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const FormField = styled.div`
  display: flex; flex-direction: column; gap: 0.32rem;
`;

const Label = styled.label`
  font-size: 0.7rem; font-weight: 700; color: #475569;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; gap: 0.3rem;
  ${({ $req }) => $req && `&::after { content: ' *'; color: #ef4444; }`}
`;

const Textarea = styled.textarea`
  padding: 0.6rem 0.85rem; border: 1.5px solid #e2e8f0; border-radius: 9px;
  font-size: 0.875rem; color: #1e293b; resize: vertical; min-height: 68px;
  font-family: inherit; line-height: 1.5; transition: border-color .15s, box-shadow .15s;
  &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
  &::placeholder { color: #94a3b8; }
`;

const FormDivider = styled.div`
  grid-column: 1 / -1; border-top: 1px solid #f1f5f9; margin: 0.1rem 0;
`;

// ─── Toggle row ───────────────────────────────────────────────────────────────
const ToggleRow = styled.label`
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.7rem 0.9rem; border-radius: 10px;
  border: 1.5px solid ${({ $on, $c }) => $on ? ($c || '#c7d2fe') : '#e2e8f0'};
  background: ${({ $on, $bg }) => $on ? ($bg || '#eef2ff') : '#fafafa'};
  cursor: pointer; transition: all .18s; user-select: none;
  &:hover { border-color: ${({ $c }) => $c || '#a5b4fc'}; }
  input { display: none; }
`;

const ToggleLeft = styled.div`
  display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0;
`;

const ToggleIcon = styled.div`
  width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $on, $c }) => $on ? ($c || '#6366f1') : '#e2e8f0'};
  color: ${({ $on }) => $on ? 'white' : '#94a3b8'}; transition: all .18s;
  svg { width: 14px; height: 14px; }
`;

const ToggleText = styled.div`
  flex: 1; min-width: 0;
  .tl { display: block; font-size: .83rem; font-weight: 600; color: #0f172a; }
  .td { display: block; font-size: .72rem; color: #64748b; margin-top: 1px; }
`;

const Track = styled.div`
  width: 40px; height: 22px; border-radius: 11px; flex-shrink: 0;
  background: ${({ $on, $c }) => $on ? ($c || '#6366f1') : '#cbd5e1'};
  position: relative; transition: background .2s;
`;

const Thumb = styled.div`
  width: 16px; height: 16px; border-radius: 50%; background: white;
  position: absolute; top: 3px;
  left: ${({ $on }) => $on ? '21px' : '3px'};
  transition: left .22s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
`;

const ToggleGrid = styled.div`
  display: flex; flex-direction: column; gap: 0.45rem;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('cs-CZ'); } catch { return d; }
}

function getInitials(jmeno, prijmeni) {
  return ((jmeno || '').charAt(0) + (prijmeni || '').charAt(0)).toUpperCase() || '??';
}

function getSubstStatus(sub) {
  if (!sub.aktivni) return 'past';
  const now = today();
  if (sub.dt_od <= now && sub.dt_do >= now) return 'active';
  if (sub.dt_od > now) return 'future';
  return 'past';
}

function decodeOpravneni(v) {
  if (!v) return {};
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
  return v;
}

function isFuture(sub) {
  return sub.aktivni === 1 && sub.dt_od > today();
}

const STATUS_LABELS = { active: 'Aktivní', future: 'Plánované', past: 'Ukončeno' };

function getPermissionLabel(key, value) {
  if (key === 'view_scope') {
    return value === 'inherit' ? 'Rozsah zobrazení: Dědit práva' : 'Rozsah zobrazení: Vlastní';
  }
  if (key === 'approve_scope') {
    return value === 'inherit' ? 'Rozsah schvalování: Dědit práva' : 'Rozsah schvalování: Vlastní';
  }
  const m = OPRAVNENI_META.find(x => x.key === key);
  return m?.label || key;
}

const OPRAVNENI_META = [
  {
    key: 'view', label: 'Zobrazit objednávky a faktury',
    desc: 'Zástupce vidí vaše objednávky a faktury',
    icon: Eye, iconColor: '#6366f1', trackColor: '#6366f1', bg: '#eef2ff', borderColor: '#c7d2fe',
    visible: () => true,
  },
  {
    key: 'approve', label: 'Schvalovat',
    desc: 'Zástupce může schvalovat doklady vaším jménem',
    icon: CheckCircle, iconColor: '#10b981', trackColor: '#10b981', bg: '#f0fdf4', borderColor: '#86efac',
    visible: () => true,
  },
  {
    key: 'confirm', label: 'Potvrzovat',
    desc: 'Zástupce může potvrzovat doklady vaším jménem',
    icon: Shield, iconColor: '#f59e0b', trackColor: '#f59e0b', bg: '#fffbeb', borderColor: '#fde68a',
    visible: () => true,
  },
  {
    key: 'administrator', label: 'Administrátorský přístup',
    desc: 'Zástupce získá administrátorský přístup',
    icon: Shield, iconColor: '#dc2626', trackColor: '#dc2626', bg: '#fff1f2', borderColor: '#fecdd3',
    visible: (isAdmin) => isAdmin,
  },
  {
    key: 'superadmin', label: 'Superadmin přístup',
    desc: 'Zástupce získá plná práva superadministrátora',
    icon: Star, iconColor: '#7c3aed', trackColor: '#7c3aed', bg: '#faf5ff', borderColor: '#d8b4fe',
    visible: (isAdmin, isSuperAdmin) => isSuperAdmin,
  },
];

const EMPTY_FORM = () => ({
  zastupce_id: '',
  dt_od: today(),
  dt_do: '',
  opravneni: { view: true, approve: false, confirm: false, administrator: false, superadmin: false },
  send_notification: true,
  popis: '',
});

const EMPTY_ADMIN_FORM = () => ({
  zastupovany_id: '',
  zastupce_id: '',
  dt_od: today(),
  dt_do: '',
  opravneni: { view: true, approve: false, confirm: false },
  popis: '',
});

// ─── HLAVNÍ KOMPONENTA ────────────────────────────────────────────────────────
export default function SubstitutionTab({ token, username, showToast, hasPermission, isSuperAdmin }) {
  const isAdmin = !!(hasPermission && hasPermission('ADMIN'));

  // Data
  const [substitutions, setSubstitutions] = useState([]);
  const [currentlySub, setCurrentlySub]   = useState([]);
  const [candidates, setCandidates]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [deactivating, setDeactivating]   = useState(null);

  // Admin data
  const [adminSubstitutions, setAdminSubstitutions] = useState([]);
  const [manageableUsers, setManageableUsers]       = useState([]);
  const [adminLoading, setAdminLoading]             = useState(false);
  const [adminDeactivating, setAdminDeactivating]   = useState(null);

  // View přepínač
  const [view, setView] = useState('mine'); // 'mine' | 'system'

  // Modal stav
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'admin'
  const [editingSub, setEditingSub] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError]   = useState('');
  const [form, setForm]             = useState(EMPTY_FORM());
  const [adminForm, setAdminForm]   = useState(EMPTY_ADMIN_FORM());
  const [adminFormSaving, setAdminFormSaving] = useState(false);
  const [adminFormError, setAdminFormError]   = useState('');

  // CustomSelect state
  const [selectStates, setSelectStates]               = useState({});
  const [searchStates, setSearchStates]               = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

  const toggleSelect = useCallback((field) => {
    setSelectStates(prev => {
      const isOpen = prev[field];
      if (!isOpen) return { [field]: true };
      return { ...prev, [field]: false };
    });
  }, []);

  const filterOptions = useCallback((options, searchTerm) => {
    if (!searchTerm) return options;
    const t = searchTerm.toLowerCase();
    return options.filter(o => (o.label || o.nazev || '').toLowerCase().includes(t));
  }, []);

  const getOptionLabel = useCallback((o) => o?.label || o?.nazev || '', []);

  // Načtení dat
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, curr, cands] = await Promise.all([
        fetchMySubstitutions({ token, username }),
        fetchCurrentlySubstituting({ token, username }),
        fetchSubstitutionCandidates({ token, username }),
      ]);
      setSubstitutions(subs);
      setCurrentlySub(curr);
      setCandidates(cands);
    } catch (e) {
      showToast && showToast('error', 'Nepodařilo se načíst data zastupování: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [token, username, showToast]);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const [allSubs, users] = await Promise.all([
        fetchAllSubstitutionsAdmin({ token, username }),
        fetchManageableUsers({ token, username }),
      ]);
      setAdminSubstitutions(allSubs);
      setManageableUsers(users);
    } catch (e) {
      showToast && showToast('error', 'Nepodařilo se načíst admin data');
    } finally {
      setAdminLoading(false);
    }
  }, [token, username, showToast, isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAdmin(); }, [loadAdmin]);

  // Zavření modalu
  function closeModal() {
    setModal(null);
    setEditingSub(null);
    setFormError('');
    setAdminFormError('');
    setForm(EMPTY_FORM());
    setAdminForm(EMPTY_ADMIN_FORM());
    setSelectStates({});
    setSearchStates({});
  }

  // Otevření modalu pro vytvoření
  function openCreate() {
    setForm(EMPTY_FORM());
    setEditingSub(null);
    setFormError('');
    setSelectStates({});
    setSearchStates({});
    setModal('create');
  }

  // Otevření modalu pro editaci
  function openEdit(sub) {
    const perms = decodeOpravneni(sub.opravneni);
    setForm({
      zastupce_id: sub.zastupce?.id || sub.zastupce_id || '',
      dt_od: sub.dt_od || today(),
      dt_do: sub.dt_do || '',
      opravneni: {
        view:          !!perms.view,
        approve:       !!perms.approve,
        confirm:       !!perms.confirm,
        administrator: !!perms.administrator,
        superadmin:    !!perms.superadmin,
      },
      send_notification: false,
      popis: sub.popis || '',
    });
    setEditingSub(sub);
    setFormError('');
    setSelectStates({});
    setSearchStates({});
    setModal('edit');
  }

  // Otevření admin modalu
  function openAdminCreate() {
    setAdminForm(EMPTY_ADMIN_FORM());
    setAdminFormError('');
    setSelectStates({});
    setSearchStates({});
    setModal('admin');
  }

  // Odeslání formuláře (create / edit)
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.zastupce_id) { setFormError('Vyberte zástupce ze seznamu.'); return; }
    if (!form.dt_od || !form.dt_do) { setFormError('Vyplňte datum začátku i konce zastupování.'); return; }
    if (modal !== 'edit' && form.dt_od < today()) { setFormError('Datum začátku nesmí být v minulosti.'); return; }
    if (form.dt_od >= form.dt_do) { setFormError('Datum začátku musí být před datem konce.'); return; }
    const opravneni = {};
    Object.keys(form.opravneni).forEach(k => { opravneni[k] = form.opravneni[k] ? 1 : 0; });
    opravneni.notify_zastupce = form.send_notification ? 1 : 0;
    const baseKeys = ['view', 'approve', 'confirm', 'administrator', 'superadmin'];
    if (!baseKeys.some(k => opravneni[k] === 1)) {
      setFormError('Vyberte alespoň jedno oprávnění pro zástupce.');
      return;
    }
    setFormSaving(true);
    try {
      if (modal === 'edit' && editingSub) {
        await updateSubstitution({
          token, username, id: editingSub.id,
          zastupce_id: parseInt(form.zastupce_id, 10),
          dt_od: form.dt_od, dt_do: form.dt_do,
          opravneni, popis: form.popis || null,
        });
        showToast && showToast('success', 'Zastupování bylo aktualizováno.');
      } else {
        await createSubstitution({
          token, username,
          zastupce_id: parseInt(form.zastupce_id, 10),
          dt_od: form.dt_od, dt_do: form.dt_do,
          opravneni, popis: form.popis || null,
        });
        showToast && showToast('success', 'Zastupování bylo úspěšně nastaveno.');
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message || 'Nepodařilo se uložit zastupování.');
    } finally {
      setFormSaving(false);
    }
  }

  // Admin submit
  async function handleAdminSubmit(e) {
    e.preventDefault();
    setAdminFormError('');
    if (!adminForm.zastupovany_id) { setAdminFormError('Vyberte zastupovaného uživatele.'); return; }
    if (!adminForm.zastupce_id) { setAdminFormError('Vyberte zástupce.'); return; }
    if (adminForm.zastupovany_id === adminForm.zastupce_id) { setAdminFormError('Zastupovaný a zástupce nesmí být stejný uživatel.'); return; }
    if (!adminForm.dt_od || !adminForm.dt_do) { setAdminFormError('Vyplňte datum začátku i konce.'); return; }
    if (adminForm.dt_od >= adminForm.dt_do) { setAdminFormError('Datum začátku musí být před datem konce.'); return; }
    const opravneni = {};
    Object.keys(adminForm.opravneni).forEach(k => { opravneni[k] = adminForm.opravneni[k] ? 1 : 0; });
    setAdminFormSaving(true);
    try {
      await createSubstitutionAdmin({
        token, username,
        zastupovany_id: parseInt(adminForm.zastupovany_id, 10),
        zastupce_id:    parseInt(adminForm.zastupce_id, 10),
        dt_od: adminForm.dt_od, dt_do: adminForm.dt_do,
        opravneni, popis: adminForm.popis || null,
      });
      showToast && showToast('success', 'Zastupování bylo nastaveno adminem.');
      closeModal();
      await Promise.all([load(), loadAdmin()]);
    } catch (e) {
      setAdminFormError(e.message || 'Nepodařilo se uložit zastupování.');
    } finally {
      setAdminFormSaving(false);
    }
  }

  // Deaktivace
  async function handleDeactivate(sub) {
    const name = sub.zastupce?.jmeno
      ? `${sub.zastupce.jmeno} ${sub.zastupce.prijmeni}`
      : (sub.zastupce_jmeno || 'zástupce');
    if (!window.confirm(`Opravdu zrušit zastupování uživatele ${name}?`)) return;
    setDeactivating(sub.id);
    try {
      await deactivateSubstitution({ token, username, id: sub.id });
      showToast && showToast('success', 'Zastupování bylo zrušeno.');
      await load();
    } catch (e) {
      showToast && showToast('error', 'Chyba při rušení: ' + e.message);
    } finally {
      setDeactivating(null);
    }
  }

  // Admin deaktivace
  async function handleAdminDeactivate(sub) {
    const name = sub.zastupce_jmeno || 'zástupce';
    if (!window.confirm(`Admin: zrušit zastupování uživatele ${name}?`)) return;
    setAdminDeactivating(sub.id);
    try {
      await deactivateSubstitution({ token, username, id: sub.id });
      showToast && showToast('success', 'Zastupování bylo zrušeno.');
      await loadAdmin();
    } catch (e) {
      showToast && showToast('error', 'Chyba při rušení: ' + e.message);
    } finally {
      setAdminDeactivating(null);
    }
  }

  // Options pro select
  const candidateOptions = candidates.map(c => ({
    id: c.id,
    value: String(c.id),
    label: `${c.jmeno} ${c.prijmeni}${c.username ? ` (${c.username})` : ''}`,
    nazev: `${c.jmeno} ${c.prijmeni}${c.username ? ` (${c.username})` : ''}`,
    activeSubCount: c.active_substitutions_count || 0,
  }));

  const manageableOptions = manageableUsers.map(u => ({
    id: u.id,
    value: String(u.id),
    label: `${u.jmeno} ${u.prijmeni}${u.username ? ` (${u.username})` : ''}`,
    nazev: `${u.jmeno} ${u.prijmeni}${u.username ? ` (${u.username})` : ''}`,
  }));

  // Loading state
  if (loading) {
    return (
      <Container>
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <SpinIcon size={28} style={{ display: 'block', margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 500 }}>Načítám data zastupování…</div>
          </div>
        </Card>
      </Container>
    );
  }

  const activeAndFuture = substitutions.filter(s => s.aktivni === 1);
  const past = substitutions.filter(s => s.aktivni === 0);

  // ─── Tabulka mých zastupování ────────────────────────────────────────────
  function renderMyTable() {
    const rows = [...activeAndFuture, ...past];
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <UserCheck size={16} color="#6366f1" />
            Moje zastupování
            <StatusPill $s={activeAndFuture.length > 0 ? 'active' : 'past'} style={{ marginLeft: 4 }}>
              {activeAndFuture.length} aktivních
            </StatusPill>
          </CardTitle>
          <Btn $v="primary" $sm onClick={openCreate}>
            <Plus size={14} /> Přidat
          </Btn>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <Th>Zástupce</Th>
                <Th>Email</Th>
                <Th>Telefon</Th>
                <Th>Období</Th>
                <Th>Ukončeno</Th>
                <Th>Oprávnění</Th>
                <Th>Stav</Th>
                <Th style={{ width: 80 }}>Akce</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow>
                  <td colSpan={8}>
                    <EmptyIcon><UserCheck size={24} /></EmptyIcon>
                    <div style={{ fontWeight: 600, color: '#475569', marginBottom: '.25rem' }}>Žádné zastupování</div>
                    <div style={{ fontSize: '.8rem' }}>Klikněte na „+ Přidat" a nastavte svého zástupce.</div>
                  </td>
                </EmptyRow>
              ) : rows.map(sub => {
                const status = getSubstStatus(sub);
                const perms  = decodeOpravneni(sub.opravneni);
                const canEdit   = isFuture(sub);
                const canDelete = sub.aktivni === 1;
                const initials  = getInitials(sub.zastupce?.jmeno, sub.zastupce?.prijmeni);
                return (
                  <Tr key={sub.id}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: status === 'active' ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                            : status === 'future' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                            : 'linear-gradient(135deg,#94a3b8,#64748b)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '.78rem',
                        }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>
                            {sub.zastupce?.jmeno} {sub.zastupce?.prijmeni}
                          </div>
                          {sub.zastupce?.username && (
                            <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{sub.zastupce.username}</div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {sub.zastupce?.email || '–'}
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {sub.zastupce?.telefon || '–'}
                    </Td>
                    <Td style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem' }}>
                        <Calendar size={12} color="#94a3b8" />
                        {formatDate(sub.dt_od)} – {formatDate(sub.dt_do)}
                      </div>
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: sub.dt_ukonceni ? '#dc2626' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {sub.dt_ukonceni ? (
                        <div title={`Předčasně ukončeno: ${sub.dt_ukonceni}`}>
                          ⛔ {formatDate(sub.dt_ukonceni.substring(0, 10))}
                        </div>
                      ) : sub.aktivni === 0 ? (
                        <span style={{ color: '#94a3b8' }}>{sub.dt_do ? formatDate(sub.dt_do) : '—'}</span>
                      ) : '–'}
                    </Td>
                    <Td>
                      <PermList>
                        {Object.entries(perms)
                          .filter(([k, v]) => v && k !== 'notify_zastupce')
                          .map(([k, v]) => {
                            const label = getPermissionLabel(k, v);
                            return label ? <PermPill key={k}>{label}</PermPill> : null;
                          })}
                      </PermList>
                    </Td>
                    <Td>
                      <StatusPill $s={status}>{STATUS_LABELS[status] || status}</StatusPill>
                    </Td>
                    <Td>
                      <ActionsCell>
                        {canEdit && (
                          <ActionBtn title="Upravit" onClick={() => openEdit(sub)}>
                            <Edit2 size={13} />
                          </ActionBtn>
                        )}
                        {canDelete && (
                          <ActionBtn $danger title="Zrušit zastupování" onClick={() => handleDeactivate(sub)} disabled={deactivating === sub.id}>
                            {deactivating === sub.id ? <Loader size={13} style={{ animation: `${spinAnim} .9s linear infinite` }} /> : <XCircle size={14} style={{ color: '#dc2626' }} />}
                          </ActionBtn>
                        )}
                      </ActionsCell>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    );
  }

  // ─── Admin tabulka systému ────────────────────────────────────────────────
  function renderAdminTable() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Shield size={16} color="#dc2626" />
            Přehled zastupování v systému
            <span style={{ fontSize: '.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 4 }}>
              {adminSubstitutions.length} záznamů
            </span>
          </CardTitle>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <ActionBtn title="Obnovit" onClick={loadAdmin} disabled={adminLoading}>
              <RefreshCw size={13} style={{ animation: adminLoading ? `${spinAnim} .9s linear infinite` : 'none' }} />
            </ActionBtn>
            <Btn $v="danger" $sm onClick={openAdminCreate} style={{ borderColor: 'transparent' }}>
              <Plus size={14} /> Přidat
            </Btn>
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <Th>Zastupovaný</Th>
                <Th><ChevronRight size={10} style={{ display: 'inline' }} /> Zástupce</Th>
                <Th>Email</Th>
                <Th>Telefon</Th>
                <Th>Období</Th>
                <Th>Ukončeno</Th>
                <Th>Oprávnění</Th>
                <Th>Stav</Th>
                <Th style={{ width: 60 }}>Akce</Th>
              </tr>
            </thead>
            <tbody>
              {adminLoading ? (
                <EmptyRow>
                  <td colSpan={9}>
                    <SpinIcon size={22} style={{ display: 'block', margin: '0 auto .5rem', color: '#94a3b8' }} />
                    <div style={{ color: '#94a3b8' }}>Načítám…</div>
                  </td>
                </EmptyRow>
              ) : adminSubstitutions.length === 0 ? (
                <EmptyRow>
                  <td colSpan={9}>
                    <EmptyIcon><Users size={22} /></EmptyIcon>
                    <div style={{ fontSize: '.82rem', color: '#94a3b8' }}>Žádná zastupování v systému</div>
                  </td>
                </EmptyRow>
              ) : adminSubstitutions.map((s, i) => {
                const now = today();
                const status = s.aktivni
                  ? (s.dt_od <= now && s.dt_do >= now ? 'active' : s.dt_od > now ? 'future' : 'past')
                  : 'past';
                const perms = decodeOpravneni(s.opravneni);
                const canDelete = s.aktivni === 1;
                return (
                  <Tr key={s.id}>
                    <Td>
                      <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{s.zastupovany_jmeno}</div>
                      <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{s.zastupovany_username}</div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{s.zastupce_jmeno}</div>
                      <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{s.zastupce_username}</div>
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {s.zastupce_email || '–'}
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {s.zastupce_telefon || '–'}
                    </Td>
                    <Td style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem' }}>
                        <Calendar size={12} color="#94a3b8" />
                        {formatDate(s.dt_od)} – {formatDate(s.dt_do)}
                      </div>
                    </Td>
                    <Td style={{ fontSize: '.75rem', color: s.dt_ukonceni ? '#dc2626' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {s.dt_ukonceni ? (
                        <div title={`Předčasně ukončeno: ${s.dt_ukonceni}`}>
                          ⛔ {formatDate(s.dt_ukonceni.substring(0, 10))}
                        </div>
                      ) : !s.aktivni ? (
                        <span style={{ color: '#94a3b8' }}>{s.dt_do ? formatDate(s.dt_do) : '—'}</span>
                      ) : '–'}
                    </Td>
                    <Td>
                      <PermList>
                        {Object.entries(perms)
                          .filter(([k, v]) => v && k !== 'notify_zastupce')
                          .map(([k, v]) => {
                            return <PermPill key={k}>{getPermissionLabel(k, v)}</PermPill>;
                          })}
                      </PermList>
                    </Td>
                    <Td><StatusPill $s={status}>{STATUS_LABELS[status] || status}</StatusPill></Td>
                    <Td>
                      {canDelete && (
                        <ActionBtn $danger title="Zrušit zastupování" onClick={() => handleAdminDeactivate(s)} disabled={adminDeactivating === s.id}>
                          {adminDeactivating === s.id ? <Loader size={13} style={{ animation: `${spinAnim} .9s linear infinite` }} /> : <XCircle size={14} style={{ color: '#dc2626' }} />}
                        </ActionBtn>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    );
  }

  // ─── Modal formulář ───────────────────────────────────────────────────────
  function renderModal() {
    if (!modal) return null;
    const isAdminModal = modal === 'admin';
    const isEditModal  = modal === 'edit';
    const currentForm  = isAdminModal ? adminForm : form;
    const currentError = isAdminModal ? adminFormError : formError;
    const isSaving     = isAdminModal ? adminFormSaving : formSaving;

    const setField = (k, v) => {
      if (isAdminModal) setAdminForm(p => ({ ...p, [k]: v }));
      else setForm(p => ({ ...p, [k]: v }));
    };

    const togglePerm = (k, checked) => {
      if (isAdminModal) setAdminForm(p => ({ ...p, opravneni: { ...p.opravneni, [k]: checked } }));
      else setForm(p => ({ ...p, opravneni: { ...p.opravneni, [k]: checked } }));
    };

    const visiblePerms = OPRAVNENI_META.filter(m => {
      if (isAdminModal && ['administrator','superadmin'].includes(m.key)) return false;
      return m.visible(isAdmin, isSuperAdmin);
    });

    return ReactDOM.createPortal(
      <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <ModalBox>
          <ModalHead $admin={isAdminModal}>
            <ModalHeadTitle>
              {isAdminModal ? (
                <>
                  <h3>Nastavit zastupování <span style={{ opacity: .7, fontWeight: 400 }}>· Admin</span></h3>
                  <p>Nastavíte zastupování za jiného uživatele</p>
                </>
              ) : isEditModal ? (
                <>
                  <h3>Upravit zastupování</h3>
                  <p>Změna je možná pouze u plánovaných zastupování (ještě nezačala)</p>
                </>
              ) : (
                <>
                  <h3>Nové zastupování</h3>
                  <p>Nastavte, kdo vás bude zastupovat v době nepřítomnosti</p>
                </>
              )}
            </ModalHeadTitle>
            <CloseBtn onClick={closeModal}><X size={16} /></CloseBtn>
          </ModalHead>

          <form onSubmit={isAdminModal ? handleAdminSubmit : handleSubmit} style={{ display: 'contents' }}>
            <ModalBody>
              {currentError && (
                <Alert $t="error"><AlertCircle size={15} />{currentError}</Alert>
              )}

              {!isAdminModal && candidates.length === 0 && (
                <Alert $t="info">
                  <Info size={15} />
                  V systému nejsou žádní způsobilí zástupci (uživatelé s právem USER_SUBSTITUTE).
                </Alert>
              )}

              <FormGrid>
                {/* Admin: zastupovaný */}
                {isAdminModal && (
                  <FormField>
                    <Label $req><Users size={11} /> Zastupovaný uživatel</Label>
                    <CustomSelect
                      field="adm_zastupovany"
                      value={adminForm.zastupovany_id}
                      options={manageableOptions}
                      placeholder="Vyberte zastupovaného…"
                      onChange={e => setAdminForm(p => ({ ...p, zastupovany_id: e.target.value || '' }))}
                      hasError={!!(adminFormError && !adminForm.zastupovany_id)}
                      selectStates={selectStates} setSelectStates={setSelectStates}
                      searchStates={searchStates} setSearchStates={setSearchStates}
                      touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                      toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                    />
                  </FormField>
                )}

                {/* Zástupce */}
                <FormField style={isAdminModal ? {} : { gridColumn: '1 / -1' }}>
                  <Label $req><UserCheck size={11} /> Zástupce</Label>
                  <CustomSelect
                    field={isAdminModal ? 'adm_zastupce' : 'subst_zastupce'}
                    value={currentForm.zastupce_id}
                    options={candidateOptions}
                    placeholder="— Vyberte zástupce —"
                    isClearable={!isEditModal}
                    disabled={candidates.length === 0 && !isAdminModal}
                    onChange={e => setField('zastupce_id', e.target.value || '')}
                    hasError={!!(currentError && !currentForm.zastupce_id)}
                    selectStates={selectStates} setSelectStates={setSelectStates}
                    searchStates={searchStates} setSearchStates={setSearchStates}
                    touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                    toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                  />
                  {/* Varování když vybraný zástupce již má aktivní zastupování */}
                  {(() => {
                    const sel = candidateOptions.find(o => String(o.id) === String(currentForm.zastupce_id));
                    if (!sel || !sel.activeSubCount) return null;
                    const cnt = sel.activeSubCount;
                    return (
                      <div style={{ marginTop: '0.4rem', padding: '0.45rem 0.65rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', color: '#92400e', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <span style={{ flexShrink: 0 }}>&#9888;</span>
                        <span>Tato osoba aktuálně zastupuje {cnt} {cnt === 1 ? 'osobu' : cnt < 5 ? 'osoby' : 'osob'}. Zastupování více příkazců je povoleno.</span>
                      </div>
                    );
                  })()}
                </FormField>

                {/* Datum od */}
                <FormField>
                  <Label $req><Calendar size={11} /> Zastupování od</Label>
                  <DatePicker
                    fieldName={isAdminModal ? 'adm_dt_od' : 'subst_dt_od'}
                    value={currentForm.dt_od}
                    onChange={val => setField('dt_od', val)}
                    placeholder="Datum začátku"
                    hasError={!!(currentError && !currentForm.dt_od)}
                    minDate={(!isAdminModal && !isEditModal) ? today() : undefined}
                  />
                </FormField>

                {/* Datum do */}
                <FormField>
                  <Label $req><Calendar size={11} /> Zastupování do</Label>
                  <DatePicker
                    fieldName={isAdminModal ? 'adm_dt_do' : 'subst_dt_do'}
                    value={currentForm.dt_do}
                    onChange={val => setField('dt_do', val)}
                    placeholder="Datum konce"
                    hasError={!!(currentError && !currentForm.dt_do)}
                    minDate={(!isAdminModal && !isEditModal) ? (currentForm.dt_od || today()) : undefined}
                  />
                </FormField>

                <FormDivider />

                {/* Oprávnění */}
                <FormField style={{ gridColumn: '1 / -1' }}>
                  <Label $req><Shield size={11} /> Oprávnění zástupce</Label>
                  <ToggleGrid>
                    {visiblePerms.map((meta) => {
                      const Icon = meta.icon;
                      const on = !!currentForm.opravneni[meta.key];
                      return (
                        <ToggleRow key={meta.key} $on={on} $c={meta.borderColor} $bg={on ? meta.bg : undefined}>
                          <input type="checkbox" checked={on} onChange={e => togglePerm(meta.key, e.target.checked)} />
                          <ToggleLeft>
                            <ToggleIcon $on={on} $c={on ? meta.iconColor : undefined}>
                              <Icon />
                            </ToggleIcon>
                            <ToggleText>
                              <span className="tl">{meta.label}</span>
                              <span className="td">{meta.desc}</span>
                            </ToggleText>
                          </ToggleLeft>
                          <Track $on={on} $c={meta.trackColor}><Thumb $on={on} /></Track>
                        </ToggleRow>
                      );
                    })}
                  </ToggleGrid>
                </FormField>

                {/* Notifikace – jen při vytváření, ne admin, ne edit */}
                {!isAdminModal && !isEditModal && (
                  <FormField style={{ gridColumn: '1 / -1' }}>
                    <ToggleRow
                      $on={form.send_notification} $c="#bfdbfe"
                      $bg={form.send_notification ? '#eff6ff' : undefined}
                    >
                      <input type="checkbox" checked={form.send_notification}
                        onChange={e => setField('send_notification', e.target.checked)} />
                      <ToggleLeft>
                        <ToggleIcon $on={form.send_notification} $c={form.send_notification ? '#3b82f6' : undefined}>
                          <Bell />
                        </ToggleIcon>
                        <ToggleText>
                          <span className="tl">Informovat zástupce notifikací</span>
                          <span className="td">Zástupce obdrží notifikaci v rámci EEO systému</span>
                        </ToggleText>
                      </ToggleLeft>
                      <Track $on={form.send_notification} $c="#3b82f6"><Thumb $on={form.send_notification} /></Track>
                    </ToggleRow>
                  </FormField>
                )}

                {/* Poznámka */}
                <FormField style={{ gridColumn: '1 / -1' }}>
                  <Label><Info size={11} /> Poznámka <span style={{ fontWeight: 400, textTransform: 'none' }}>(volitelně)</span></Label>
                  <Textarea
                    value={currentForm.popis}
                    onChange={e => setField('popis', e.target.value)}
                    placeholder="Např. dovolená, nemoc, pracovní cesta…"
                    rows={2}
                  />
                </FormField>
              </FormGrid>
            </ModalBody>

            <ModalFooter>
              <Btn type="button" $v="secondary" onClick={closeModal} disabled={isSaving}>
                <X size={14} /> Zrušit
              </Btn>
              <Btn type="submit" $v={isAdminModal ? 'danger' : 'success'}
                disabled={isSaving || (candidates.length === 0 && !isAdminModal)}
                style={isAdminModal ? { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white' } : {}}>
                {isSaving ? <SpinIcon size={15} /> : isEditModal ? <CheckCircle size={15} /> : <Plus size={15} />}
                {isEditModal ? 'Uložit změny' : isAdminModal ? 'Nastavit zastupování' : 'Uložit zastupování'}
              </Btn>
            </ModalFooter>
          </form>
        </ModalBox>
      </ModalOverlay>,
      document.body
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Container>
      {/* Hlavička */}
      <PageHeader>
        <PageTitle>
          <h2><UserCheck size={20} color="#6366f1" /> Zastupování</h2>
          <p>
            Nastavte, kdo vás bude zastupovat po dobu nepřítomnosti.
            Zástupce získá přístup k vašim dokladům v rozsahu, který mu přidělíte.
          </p>
        </PageTitle>
        <HeaderActions>
          <Btn $v="secondary" $sm onClick={() => { load(); loadAdmin(); }} title="Obnovit data">
            <RefreshCw size={14} />
          </Btn>
        </HeaderActions>
      </PageHeader>

      {/* Banner: kdo mě nyní zastupuje */}
      {currentlySub.length > 0 && (
        <InfoBanner>
          <Clock size={16} />
          <div>
            <strong>Nyní vás zastupuje: </strong>
            {currentlySub.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                <strong>{s.zastupce_jmeno} {s.zastupce_prijmeni}</strong>
                {' '}({formatDate(s.dt_od)} – {formatDate(s.dt_do)})
              </span>
            ))}
          </div>
        </InfoBanner>
      )}

      {/* View přepínač pro adminy */}
      {isAdmin && (
        <ViewSwitcher>
          <ViewTab $active={view === 'mine'} onClick={() => setView('mine')}>
            <UserCheck size={14} /> Moje zastupování
          </ViewTab>
          <ViewTab $active={view === 'system'} onClick={() => setView('system')}>
            <Shield size={14} color={view === 'system' ? '#dc2626' : undefined} />
            Přehled systému
          </ViewTab>
        </ViewSwitcher>
      )}

      {/* Tabulka */}
      {view === 'mine' ? renderMyTable() : renderAdminTable()}

      {/* Modal */}
      {renderModal()}
    </Container>
  );
}
