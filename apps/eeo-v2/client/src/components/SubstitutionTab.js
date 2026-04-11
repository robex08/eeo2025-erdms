import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { UserCheck, Plus, Trash2, Calendar, RefreshCw, AlertCircle, CheckCircle, X, Info, Users, Clock, Shield, Eye, ChevronRight, Loader, Star, Bell } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import DatePicker from './DatePicker';
import {
  fetchMySubstitutions,
  createSubstitution,
  deactivateSubstitution,
  fetchSubstitutionCandidates,
  fetchCurrentlySubstituting,
} from '../services/apiSubstitution';

// ─── Animace ──────────────────────────────────────────────────────────────────
const spinAnim = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}`;
const slideDown = keyframes`from{opacity:0;max-height:0;}to{opacity:1;max-height:800px;}`;

// ─── Layout ───────────────────────────────────────────────────────────────────
const Container = styled.div`max-width: 900px;`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
`;

const PageTitle = styled.div`
  h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.5;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

// ─── Karty ────────────────────────────────────────────────────────────────────
const Card = styled.div`
  background: white;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.4rem;
  background: ${({ $gradient }) => $gradient || 'white'};
  border-bottom: 1px solid ${({ $gradient }) => $gradient ? 'transparent' : '#f1f5f9'};
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ $light }) => $light ? 'white' : '#1e293b'};
  letter-spacing: -0.01em;
`;

const CardBody = styled.div`
  padding: 1.25rem 1.4rem;
`;

// ─── Formulář ─────────────────────────────────────────────────────────────────
const FormSlide = styled.div`
  overflow: hidden;
  animation: ${slideDown} 0.35s ease;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FieldLabel = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  ${({ $required }) => $required && `
    &::after { content: ' *'; color: #ef4444; }
  `}
`;

const Textarea = styled.textarea`
  padding: 0.65rem 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.875rem;
  color: #1e293b;
  resize: vertical;
  min-height: 72px;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  }
  &::placeholder { color: #94a3b8; }
`;

const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.775rem;
  color: #dc2626;
  margin-top: 0.15rem;
`;

// ─── Checkboxy oprávnění ───────────────────────────────────────────────────────
// ─── Toggle switch ────────────────────────────────────────────────────────────
const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1.5px solid ${({ $on, $color }) => $on ? ($color || '#c7d2fe') : '#e2e8f0'};
  background: ${({ $on, $bg }) => $on ? ($bg || '#eef2ff') : '#fafafa'};
  cursor: pointer;
  transition: all 0.18s;
  user-select: none;
  &:hover { border-color: ${({ $color }) => $color || '#a5b4fc'}; background: ${({ $bg }) => $bg || '#f5f3ff'}; }
  input { display: none; }
`;

const ToggleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
  min-width: 0;
`;

const ToggleIcon = styled.div`
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $on, $color }) => $on ? ($color || '#6366f1') : '#e2e8f0'};
  color: ${({ $on }) => $on ? 'white' : '#94a3b8'};
  transition: all 0.18s;
  svg { width: 15px; height: 15px; }
`;

const ToggleText = styled.div`
  flex: 1; min-width: 0;
  span { display: block; }
  .toggle-label { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .toggle-desc  { font-size: 0.75rem; color: #64748b; margin-top: 1px; }
`;

const ToggleTrack = styled.div`
  width: 42px; height: 23px; border-radius: 12px; flex-shrink: 0;
  background: ${({ $on, $color }) => $on ? ($color || '#6366f1') : '#cbd5e1'};
  position: relative; transition: background 0.2s;
`;

const ToggleThumb = styled.div`
  width: 17px; height: 17px; border-radius: 50%; background: white;
  position: absolute; top: 3px;
  left: ${({ $on }) => $on ? '22px' : '3px'};
  transition: left 0.22s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 1px 4px rgba(0,0,0,0.22);
`;

const ToggleGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PermBadge = styled.span`
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; padding: 0.15rem 0.5rem; border-radius: 4px;
  background: ${({ $bg }) => $bg || '#e0e7ff'};
  color: ${({ $color }) => $color || '#3730a3'};
  margin-left: 0.4rem;
`;

const PermChip = styled.label`
  display: flex; align-items: center; gap: 0.55rem;
  padding: 0.55rem 1rem; border-radius: 99px;
  border: 2px solid ${({ $checked }) => $checked ? '#6366f1' : '#e2e8f0'};
  background: ${({ $checked }) => $checked ? 'linear-gradient(135deg,#eef2ff,#e0e7ff)' : '#fafafa'};
  color: ${({ $checked }) => $checked ? '#4338ca' : '#64748b'};
  font-size: 0.84rem; font-weight: ${({ $checked }) => $checked ? '600' : '400'};
  cursor: pointer; transition: all 0.18s; user-select: none;
  &:hover { border-color: #6366f1; background: #eef2ff; color: #4338ca; }
  input { display: none; }
  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

// ─── Tlačítka ─────────────────────────────────────────────────────────────────
const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: ${({ $size }) => $size === 'sm' ? '0.4rem 0.75rem' : '0.6rem 1.2rem'};
  border-radius: 9px;
  border: none;
  font-size: ${({ $size }) => $size === 'sm' ? '0.8rem' : '0.875rem'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  background: ${({ $variant }) =>
    $variant === 'primary'   ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' :
    $variant === 'danger'    ? '#fee2e2' :
    $variant === 'ghost'     ? 'transparent' :
    $variant === 'success'   ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                               '#f1f5f9'};
  color: ${({ $variant }) =>
    $variant === 'primary'   ? 'white' :
    $variant === 'danger'    ? '#dc2626' :
    $variant === 'ghost'     ? '#64748b' :
    $variant === 'success'   ? 'white' :
                               '#475569'};
  &:hover:not(:disabled) {
    box-shadow: ${({ $variant }) =>
      $variant === 'primary' ? '0 4px 14px rgba(99,102,241,0.35)' :
      $variant === 'success' ? '0 4px 14px rgba(16,185,129,0.35)' : 'none'};
    transform: ${({ $variant }) =>
      ($variant === 'primary' || $variant === 'success') ? 'translateY(-1px)' : 'none'};
    background: ${({ $variant }) =>
      $variant === 'danger' ? '#fecaca' :
      $variant === 'ghost'  ? '#f1f5f9' : undefined};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
  svg { flex-shrink: 0; }
`;

const SpinIcon = styled(RefreshCw)`animation: ${spinAnim} 0.9s linear infinite;`;

// ─── Záznamy zastupování ───────────────────────────────────────────────────────
const SubstItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 11px;
  background: ${({ $status }) =>
    $status === 'active'  ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' :
    $status === 'future'  ? 'linear-gradient(135deg,#fefce8,#fef9c3)' :
                             '#f8fafc'};
  border: 1.5px solid ${({ $status }) =>
    $status === 'active' ? '#86efac' :
    $status === 'future' ? '#fde68a' :
                            '#e2e8f0'};
  border-left: 4px solid ${({ $status }) =>
    $status === 'active' ? '#22c55e' :
    $status === 'future' ? '#f59e0b' :
                            '#cbd5e1'};
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
`;

const SubstAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${({ $status }) =>
    $status === 'active' ? 'linear-gradient(135deg,#22c55e,#16a34a)' :
    $status === 'future' ? 'linear-gradient(135deg,#f59e0b,#d97706)' :
                            'linear-gradient(135deg,#94a3b8,#64748b)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
  letter-spacing: 0.03em;
`;

const SubstInfo = styled.div`flex: 1; min-width: 0;`;

const SubstName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.25rem;
`;

const SubstMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: #64748b;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  svg { width: 12px; height: 12px; }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $status }) =>
    $status === 'active' ? '#dcfce7' :
    $status === 'future' ? '#fef9c3' : '#f1f5f9'};
  color: ${({ $status }) =>
    $status === 'active' ? '#15803d' :
    $status === 'future' ? '#92400e' : '#94a3b8'};
`;

const PermPill = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
`;

const SubstActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
`;

const EmptyBox = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: #94a3b8;
`;

const EmptyIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.85rem;
  color: #cbd5e1;
`;

const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 1.1rem;
  line-height: 1.5;
  background: ${({ $type }) => $type === 'error' ? '#fef2f2' : $type === 'info' ? '#eff6ff' : '#f0fdf4'};
  color: ${({ $type }) => $type === 'error' ? '#dc2626' : $type === 'info' ? '#1d4ed8' : '#15803d'};
  border: 1px solid ${({ $type }) => $type === 'error' ? '#fecaca' : $type === 'info' ? '#bfdbfe' : '#bbf7d0'};
  svg { flex-shrink: 0; margin-top: 1px; }
`;

const FormDivider = styled.div`
  grid-column: 1 / -1;
  border-top: 1px solid #f1f5f9;
  margin: 0.25rem 0;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 1.1rem;
  border-top: 1px solid #f1f5f9;
  margin-top: 0.5rem;
`;

const InfoBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.1rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.84rem;
  color: #1e40af;
  line-height: 1.5;
  svg { flex-shrink: 0; color: #3b82f6; }
`;

const SubstList = styled.div`display: flex; flex-direction: column; gap: 0.65rem;`;

const SectionDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

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

// key, label, desc, icon, iconColor, trackColor, bg, borderColor, badge
const OPRAVNENI_META = [
  {
    key: 'view',
    label: 'Zobrazit doklady',
    desc: 'Zástupce vidí vaše objednávky a doklady',
    icon: Eye,
    iconColor: '#6366f1', trackColor: '#6366f1', bg: '#eef2ff', borderColor: '#c7d2fe',
    visible: () => true,
  },
  {
    key: 'approve',
    label: 'Schvalovat',
    desc: 'Zástupce může schvalovat doklady vaším jménem',
    icon: CheckCircle,
    iconColor: '#10b981', trackColor: '#10b981', bg: '#f0fdf4', borderColor: '#86efac',
    visible: () => true,
  },
  {
    key: 'confirm',
    label: 'Potvrzovat',
    desc: 'Zástupce může potvrzovat doklady vaším jménem',
    icon: Shield,
    iconColor: '#f59e0b', trackColor: '#f59e0b', bg: '#fffbeb', borderColor: '#fde68a',
    visible: () => true,
  },
  {
    key: 'administrator',
    label: 'Administrátorský přístup',
    desc: 'Zástupce získá administrátorský přístup',
    icon: Shield,
    iconColor: '#dc2626', trackColor: '#dc2626', bg: '#fff1f2', borderColor: '#fecdd3',
    badge: { text: 'Administrátor', bg: '#fee2e2', color: '#dc2626' },
    visible: (isAdmin) => isAdmin,
  },
  {
    key: 'superadmin',
    label: 'Superadmin přístup',
    desc: 'Zástupce získá plná práva superadministrátora',
    icon: Star,
    iconColor: '#7c3aed', trackColor: '#7c3aed', bg: '#faf5ff', borderColor: '#d8b4fe',
    badge: { text: 'Pouze Superadmin', bg: '#ede9fe', color: '#7c3aed' },
    visible: (isAdmin, isSuperAdmin) => isSuperAdmin,
  },
];

const STATUS_LABELS = {
  active: 'Aktivní', future: 'Plánované', past: 'Ukončené',
};

// ─── HLAVNÍ KOMPONENTA ────────────────────────────────────────────────────────
export default function SubstitutionTab({ token, username, showToast, hasPermission, isSuperAdmin }) {
  const isAdmin = !!(hasPermission && hasPermission('ADMIN'));
  // Data
  const [substitutions, setSubstitutions]   = useState([]);
  const [currentlySub, setCurrentlySub]     = useState([]);
  const [candidates, setCandidates]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [deactivating, setDeactivating]     = useState(null);

  // Formulář
  const [showForm, setShowForm]     = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError]   = useState('');
  const [form, setForm] = useState({
    zastupce_id: '',
    dt_od: today(),
    dt_do: '',
    opravneni: { view: true, approve: false, confirm: false, administrator: false, superadmin: false },
    send_notification: true,
    popis: '',
  });

  // CustomSelect state (vyžadováno CustomSelect komponentou)
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
    return options.filter(o => {
      const lbl = o.label || o.nazev || '';
      return lbl.toLowerCase().includes(t);
    });
  }, []);

  const getOptionLabel = useCallback((option) => option?.label || option?.nazev || '', []);

  // Load
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

  useEffect(() => { load(); }, [load]);

  // Zvýraznění změněných polí
  const [recentFields, setRecentFields] = useState(new Set());
  function touchField(f) {
    setRecentFields(prev => new Set([...prev, f]));
    setTimeout(() => setRecentFields(prev => { const n = new Set(prev); n.delete(f); return n; }), 1500);
  }

  function setFormField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    touchField(field);
    if (formError) setFormError('');
  }

  function togglePerm(key, checked) {
    setForm(prev => ({ ...prev, opravneni: { ...prev.opravneni, [key]: checked } }));
  }

  function resetForm() {
    setForm({ zastupce_id: '', dt_od: today(), dt_do: '', opravneni: { view: true, approve: false, confirm: false, administrator: false, superadmin: false }, send_notification: true, popis: '' });
    setFormError('');
    setSelectStates({});
    setSearchStates({});
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!form.zastupce_id) { setFormError('Vyberte zástupce ze seznamu.'); return; }
    if (!form.dt_od || !form.dt_do) { setFormError('Vyplňte datum začátku i konce zastupování.'); return; }
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
      await createSubstitution({ token, username, zastupce_id: parseInt(form.zastupce_id, 10), dt_od: form.dt_od, dt_do: form.dt_do, opravneni, popis: form.popis || null });
      showToast && showToast('success', 'Zastupování bylo úspěšně nastaveno.');
      setShowForm(false);
      resetForm();
      await load();
    } catch (e) {
      setFormError(e.message || 'Nepodařilo se uložit zastupování.');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeactivate(sub) {
    if (!window.confirm(`Opravdu zrušit zastupování uživatele ${sub.zastupce?.jmeno} ${sub.zastupce?.prijmeni}?`)) return;
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

  // Kandidáti do CustomSelect
  const candidateOptions = candidates.map(c => ({
    value: String(c.id),
    label: `${c.jmeno} ${c.prijmeni}` + (c.username ? ` (${c.username})` : ''),
    nazev: `${c.jmeno} ${c.prijmeni}` + (c.username ? ` (${c.username})` : ''),
  }));

  const activeAndFuture = substitutions.filter(s => s.aktivni === 1);
  const past = substitutions.filter(s => s.aktivni === 0);

  if (loading) {
    return (
      <Container>
        <Card>
          <CardBody style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <SpinIcon size={28} style={{ marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 500 }}>Načítám data zastupování…</div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      {/* ── Hlavička ─────────────────────────────────────────────────────── */}
      <PageHeader>
        <PageTitle>
          <h2><UserCheck size={22} color="#6366f1" /> Zastupování</h2>
          <p>Nastavte, kdo vás bude zastupovat po dobu nepřítomnosti. Zástupce získá přístup k vašim dokladům v&nbsp;rozsahu, který mu přidělíte.</p>
        </PageTitle>
        <HeaderActions>
          <Btn $variant="secondary" $size="sm" onClick={load} title="Obnovit data">
            <RefreshCw size={14} />
          </Btn>
          {!showForm && (
            <Btn $variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              Přidat zastupování
            </Btn>
          )}
        </HeaderActions>
      </PageHeader>

      {/* ── Kdo mě zastupuje NYNÍ ────────────────────────────────────────── */}
      {currentlySub.length > 0 && (
        <Card>
          <CardHeader $gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)">
            <CardTitle $light>
              <UserCheck size={17} />
              Kdo mě nyní zastupuje
            </CardTitle>
            <StatusPill $status="active" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              {currentlySub.length} aktivní
            </StatusPill>
          </CardHeader>
          <CardBody>
            <SubstList>
              {currentlySub.map(s => {
                const perms = decodeOpravneni(s.opravneni);
                return (
                  <SubstItem key={s.id} $status="active">
                    <SubstAvatar $status="active">
                      {getInitials(s.zastupce_jmeno, s.zastupce_prijmeni)}
                    </SubstAvatar>
                    <SubstInfo>
                      <SubstName>{s.zastupce_jmeno} {s.zastupce_prijmeni}</SubstName>
                      <SubstMeta>
                        <MetaItem><Calendar />  {formatDate(s.dt_od)} – {formatDate(s.dt_do)}</MetaItem>
                        {Object.entries(perms).filter(([k,v]) => v && k !== 'notify_zastupce').map(([k]) => {
                          const m = OPRAVNENI_META.find(x => x.key === k);
                          return m ? <PermPill key={k}>{m.label}</PermPill> : null;
                        })}
                        {s.popis && <MetaItem style={{ fontStyle: 'italic' }}>„{s.popis}"</MetaItem>}
                      </SubstMeta>
                    </SubstInfo>
                    <StatusPill $status="active">Aktivní</StatusPill>
                  </SubstItem>
                );
              })}
            </SubstList>
          </CardBody>
        </Card>
      )}

      {/* ── Formulář pro nové zastupování ───────────────────────────────── */}
      {showForm && (
        <Card>
          <CardHeader $gradient="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)">
            <CardTitle $light>
              <Plus size={17} />
              Nové zastupování
            </CardTitle>
            <Btn $variant="ghost" $size="sm" onClick={() => { setShowForm(false); resetForm(); }}
              style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)' }}>
              <X size={15} />
            </Btn>
          </CardHeader>
          <CardBody>
            <FormSlide>
              {formError && (
                <Alert $type="error">
                  <AlertCircle size={16} />
                  {formError}
                </Alert>
              )}

              {candidates.length === 0 && (
                <Alert $type="info">
                  <Info size={16} />
                  Žádní uživatelé s oprávněním být zástupcem nejsou k dispozici. Kontaktujte administrátora.
                </Alert>
              )}

              <form onSubmit={handleCreate}>
                <FormGrid>
                  {/* Zástupce */}
                  <FormField style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel $required>
                      <Users size={12} /> Zástupce
                    </FieldLabel>
                    <CustomSelect
                      field="zastupce_sub"
                      value={form.zastupce_id}
                      onChange={(val) => setFormField('zastupce_id', val)}
                      options={candidateOptions}
                      placeholder="— Vyberte zástupce —"
                      isClearable={true}
                      disabled={candidates.length === 0}
                      selectStates={selectStates}
                      setSelectStates={setSelectStates}
                      searchStates={searchStates}
                      setSearchStates={setSearchStates}
                      touchedSelectFields={touchedSelectFields}
                      setTouchedSelectFields={setTouchedSelectFields}
                      toggleSelect={toggleSelect}
                      filterOptions={filterOptions}
                      getOptionLabel={getOptionLabel}
                    />
                  </FormField>

                  {/* Datum od */}
                  <FormField>
                    <FieldLabel $required>
                      <Calendar size={12} /> Zastupování od
                    </FieldLabel>
                    <DatePicker
                      fieldName="subst_dt_od"
                      value={form.dt_od}
                      onChange={(val) => setFormField('dt_od', val)}
                      placeholder="Datum začátku"
                      hasError={!!(formError && !form.dt_od)}
                      highlight={recentFields.has('dt_od')}
                    />
                  </FormField>

                  {/* Datum do */}
                  <FormField>
                    <FieldLabel $required>
                      <Calendar size={12} /> Zastupování do
                    </FieldLabel>
                    <DatePicker
                      fieldName="subst_dt_do"
                      value={form.dt_do}
                      onChange={(val) => setFormField('dt_do', val)}
                      placeholder="Datum konce"
                      hasError={!!(formError && !form.dt_do)}
                      highlight={recentFields.has('dt_do')}
                    />
                  </FormField>

                  <FormDivider />

                  {/* Oprávnění - toggle switche */}
                  <FormField style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel $required>
                      <Shield size={12} /> Oprávnění zástupce
                    </FieldLabel>
                    <ToggleGrid>
                      {OPRAVNENI_META.filter(m => m.visible(isAdmin, isSuperAdmin)).map((meta) => {
                        const Icon = meta.icon;
                        const on = !!form.opravneni[meta.key];
                        return (
                          <ToggleRow
                            key={meta.key}
                            $on={on}
                            $color={meta.borderColor}
                            $bg={on ? meta.bg : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={e => togglePerm(meta.key, e.target.checked)}
                            />
                            <ToggleLeft>
                              <ToggleIcon $on={on} $color={on ? meta.iconColor : undefined}>
                                <Icon />
                              </ToggleIcon>
                              <ToggleText>
                                <span className="toggle-label">
                                  {meta.label}
                                  {meta.badge && (
                                    <PermBadge $bg={meta.badge.bg} $color={meta.badge.color}>
                                      {meta.badge.text}
                                    </PermBadge>
                                  )}
                                </span>
                                <span className="toggle-desc">{meta.desc}</span>
                              </ToggleText>
                            </ToggleLeft>
                            <ToggleTrack $on={on} $color={meta.trackColor}>
                              <ToggleThumb $on={on} />
                            </ToggleTrack>
                          </ToggleRow>
                        );
                      })}
                    </ToggleGrid>
                  </FormField>

                  {/* Notifikace */}
                  <FormField style={{ gridColumn: '1 / -1' }}>
                    <ToggleRow
                      $on={form.send_notification}
                      $color="#bfdbfe"
                      $bg={form.send_notification ? '#eff6ff' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={form.send_notification}
                        onChange={e => setFormField('send_notification', e.target.checked)}
                      />
                      <ToggleLeft>
                        <ToggleIcon $on={form.send_notification} $color={form.send_notification ? '#3b82f6' : undefined}>
                          <Bell />
                        </ToggleIcon>
                        <ToggleText>
                          <span className="toggle-label">Informovat zástupce notifikací</span>
                          <span className="toggle-desc">Zástupce obdrží notifikaci v&nbsp;rámci EEO systému</span>
                        </ToggleText>
                      </ToggleLeft>
                      <ToggleTrack $on={form.send_notification} $color="#3b82f6">
                        <ToggleThumb $on={form.send_notification} />
                      </ToggleTrack>
                    </ToggleRow>
                  </FormField>

                  {/* Poznámka */}
                  <FormField style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel>
                      <Info size={12} /> Poznámka (volitelně)
                    </FieldLabel>
                    <Textarea
                      value={form.popis}
                      onChange={e => setFormField('popis', e.target.value)}
                      placeholder="Např. dovolená, nemoc, pracovní cesta v zahraničí…"
                      rows={2}
                    />
                  </FormField>
                </FormGrid>

                <FormActions>
                  <Btn type="button" $variant="secondary" onClick={() => { setShowForm(false); resetForm(); }} disabled={formSaving}>
                    <X size={15} /> Zrušit
                  </Btn>
                  <Btn type="submit" $variant="success" disabled={formSaving || candidates.length === 0}>
                    {formSaving ? <SpinIcon size={15} /> : <CheckCircle size={15} />}
                    Uložit zastupování
                  </Btn>
                </FormActions>
              </form>
            </FormSlide>
          </CardBody>
        </Card>
      )}

      {/* ── Moje nastavená zastupování ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <UserCheck size={17} color="#6366f1" />
            Moje zastupování
          </CardTitle>
          <StatusPill $status={activeAndFuture.length > 0 ? 'active' : 'past'}>
            {activeAndFuture.length} nastaveno
          </StatusPill>
        </CardHeader>
        <CardBody>
          {activeAndFuture.length === 0 && !showForm ? (
            <EmptyBox>
              <EmptyIcon><UserCheck size={26} /></EmptyIcon>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Žádné zastupování</div>
              <div style={{ fontSize: '0.82rem' }}>Klikněte na „Přidat zastupování" a nastavte svého zástupce.</div>
            </EmptyBox>
          ) : (
            <SubstList>
              {activeAndFuture.map(sub => {
                const status = getSubstStatus(sub);
                const perms = decodeOpravneni(sub.opravneni);
                const initials = getInitials(sub.zastupce?.jmeno, sub.zastupce?.prijmeni);
                return (
                  <SubstItem key={sub.id} $status={status}>
                    <SubstAvatar $status={status}>{initials}</SubstAvatar>
                    <SubstInfo>
                      <SubstName>
                        {sub.zastupce?.jmeno} {sub.zastupce?.prijmeni}
                        {sub.zastupce?.username && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                            ({sub.zastupce.username})
                          </span>
                        )}
                      </SubstName>
                      <SubstMeta>
                        <MetaItem><Calendar /> {formatDate(sub.dt_od)} – {formatDate(sub.dt_do)}</MetaItem>
                        {Object.entries(perms).filter(([k,v]) => v && k !== 'notify_zastupce').map(([k]) => {
                          const m = OPRAVNENI_META.find(x => x.key === k);
                          return m ? <PermPill key={k}>{m.label}</PermPill> : null;
                        })}
                        {sub.popis && <MetaItem style={{ fontStyle: 'italic' }}>„{sub.popis}"</MetaItem>}
                      </SubstMeta>
                    </SubstInfo>
                    <SubstActions>
                      <StatusPill $status={status}>{STATUS_LABELS[status] || status}</StatusPill>
                      <Btn
                        $variant="danger"
                        $size="sm"
                        onClick={() => handleDeactivate(sub)}
                        disabled={deactivating === sub.id}
                        title="Zrušit zastupování"
                      >
                        {deactivating === sub.id ? <SpinIcon size={13} /> : <Trash2 size={13} />}
                      </Btn>
                    </SubstActions>
                  </SubstItem>
                );
              })}
            </SubstList>
          )}

          {/* Historická zastupování */}
          {past.length > 0 && (
            <>
              <SectionDivider>Ukončená zastupování</SectionDivider>
              <SubstList>
                {past.map(sub => {
                  const initials = getInitials(sub.zastupce?.jmeno, sub.zastupce?.prijmeni);
                  return (
                    <SubstItem key={sub.id} $status="past">
                      <SubstAvatar $status="past">{initials}</SubstAvatar>
                      <SubstInfo>
                        <SubstName style={{ color: '#64748b', fontWeight: 600 }}>
                          {sub.zastupce?.jmeno} {sub.zastupce?.prijmeni}
                        </SubstName>
                        <SubstMeta>
                          <MetaItem><Calendar /> {formatDate(sub.dt_od)} – {formatDate(sub.dt_do)}</MetaItem>
                          {sub.popis && <MetaItem style={{ fontStyle: 'italic' }}>„{sub.popis}"</MetaItem>}
                        </SubstMeta>
                      </SubstInfo>
                      <StatusPill $status="past">Ukončeno</StatusPill>
                    </SubstItem>
                  );
                })}
              </SubstList>
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
