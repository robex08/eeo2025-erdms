/**
 * Možnosti zastupování Tab - Správa pravidel zastupování (M:N vazby)
 * Definuje "kdo může koho zastupovat" na základě uživatelů, rolí, úseků nebo lokalit
 * @date 2026-06-09
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, X, Info, Users, Shield, Loader, Edit2
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import ConfirmDialog from '../../ConfirmDialog';
import { CustomSelect } from '../../CustomSelect';
import {
  fetchAllSubstitutionRules,
  createSubstitutionRule,
  updateSubstitutionRule,
  deleteSubstitutionRule,
  fetchAllUsersForAdmin,
} from '../../../services/apiSubstitutionRules';
import { getRoleList, getUsekyList, getLokalityList } from '../../../services/apiv2Dictionaries';

// ─── Animace ──────────────────────────────────────────────────────────────────
const spinAnim   = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const fadeInUp   = keyframes`from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}`;
const highlightPulse = keyframes`
  0% { background-color: #dcfce7; }
  100% { background-color: transparent; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────
const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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

const Card = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  overflow: visible;
  margin-bottom: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardBody = styled.div`
  padding: ${({ $noPadding }) => $noPadding ? '0' : '1.25rem'};
`;

// ─── Tabulka ──────────────────────────────────────────────────────────────────
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const Thead = styled.thead`
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.8rem 1rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
`;

const Td = styled.td`
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
`;

const Tr = styled.tr`
  &:hover { background: #f8fafc; }
  &:last-child td { border-bottom: none; }
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────
const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  border: 1px solid transparent;
  white-space: nowrap;

  ${({ $variant }) => {
    if ($variant === 'primary') return `
      background: #3b82f6;
      color: white;
      &:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.25); }
    `;
    if ($variant === 'danger') return `
      background: #ef4444;
      color: white;
      &:hover:not(:disabled) { background: #dc2626; }
    `;
    if ($variant === 'ghost') return `
      background: transparent;
      color: #64748b;
      &:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    `;
    return `
      background: white;
      color: #0f172a;
      border-color: #e2e8f0;
      &:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.18s;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    color: #0f172a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionButtonsRow = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  white-space: nowrap;
`;

// ─── Form ─────────────────────────────────────────────────────────────────────
const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.18s;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: all 0.18s;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #334155;
  input {
    cursor: pointer;
  }
`;

// ─── Edit Form Grid Layout ────────────────────────────────────────────────────
const EditFormContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const EditFormSection = styled.div`
  display: contents;
  
  ${FormGroup} {
    grid-column: span 1;
  }
  
  &.full-width ${FormGroup} {
    grid-column: 1 / -1;
  }
  
  &.radio-group ${FormGroup} {
    grid-column: 1 / -1;
  }
`;

const EditFormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  grid-column: 1 / -1;
  margin-top: 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  
  @media (max-width: 480px) {
    flex-direction: column-reverse;
    
    button {
      width: 100%;
    }
  }
`;

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${({ $type }) => {
    if ($type === 'user') return 'background: #dbeafe; color: #1e40af;';
    if ($type === 'role') return 'background: #fce7f3; color: #9f1239;';
    if ($type === 'usek') return 'background: #fef3c7; color: #92400e;';
    if ($type === 'lokalita') return 'background: #d1fae5; color: #065f46;';
    if ($type === 'all') return 'background: #e0e7ff; color: #3730a3;';
    return 'background: #f1f5f9; color: #64748b;';
  }}
`;

// ─── Inline Edit Row ──────────────────────────────────────────────────────────
const EditRow = styled.tr`
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  
  td {
    padding: 1.5rem !important;
  }
`;

const EditingTr = styled(Tr)`
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  
  td {
    font-weight: 500;
  }
`;

// ─── Messages ─────────────────────────────────────────────────────────────────
const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: #94a3b8;
  font-size: 0.9rem;
  svg {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    opacity: 0.3;
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;

  ${({ $type }) => {
    if ($type === 'error') return `
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    `;
    if ($type === 'success') return `
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    `;
    return `
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    `;
  }}

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const Spinner = styled(Loader)`
  animation: ${spinAnim} 1s linear infinite;
`;

// ─── Komponenta ───────────────────────────────────────────────────────────────
export default function MoznostiZastupovaniTab() {
  // Získat auth context
  const { token, username, userDetail } = useContext(AuthContext);
  const user_id = userDetail?.user_id;
  
  // ============= LOCALSTORAGE HELPERS =============
  const getUserKey = (baseKey) => {
    const sid = user_id || 'anon';
    return `${baseKey}_${sid}`;
  };

  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby
    }
  };
  
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [useky, setUseky] = useState([]);
  const [lokality, setLokality] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(() => getUserStorage('moznosti_zastupovani_showForm', false));
  const [editingRuleId, setEditingRuleId] = useState(null); // null = nové, number = editace
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [highlightRuleId, setHighlightRuleId] = useState(null); // ID pravidla k zvýraznění po uložení

  // Form state
  const [formData, setFormData] = useState({
    zastupovany_id: '',
    typ_zastupce: 'user',
    zastupce_user_id: '',
    zastupce_role_id: '',
    zastupce_usek_id: '',
    zastupce_lokalita_id: '',
    poznamka: ''
  });

  // Uložit showForm do localStorage když se změní
  useEffect(() => {
    setUserStorage('moznosti_zastupovani_showForm', showForm);
  }, [showForm, user_id]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  // ─── CustomSelect state (stejně jako v SubstitutionTab) ───────────────────
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
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
    return options.filter(o => (o.label || o.nazev || o.nazev_role || o.prijmeni || '').toLowerCase().includes(t));
  }, []);

  const getOptionLabel = useCallback((o) => o?.label || o?.nazev || o?.nazev_role || '', []);

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllSubstitutionRules({ token, username });
      setRules(data);
      
      // Po načtení pravidel, zkontroluj localStorage pro highlight
      const lastEdited = localStorage.getItem('lastEditedRuleId');
      const highlightUntil = parseInt(localStorage.getItem('highlightUntil'), 10);
      
      if (lastEdited && highlightUntil && Date.now() < highlightUntil) {
        setHighlightRuleId(parseInt(lastEdited));
        
        // Automaticky vypnout highlight po vypršení času
        const timeout = setTimeout(() => {
          setHighlightRuleId(null);
          localStorage.removeItem('lastEditedRuleId');
          localStorage.removeItem('highlightUntil');
        }, Math.max(0, highlightUntil - Date.now()));
        
        return () => clearTimeout(timeout);
      }
    } catch (err) {
      setError(err.message || 'Chyba při načítání pravidel');
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  const loadAuxiliaryData = useCallback(async () => {
    try {
      // Načíst VŠECHNY uživatele pro admin nastavení (bez filtrů na práva)
      const usersData = await fetchAllUsersForAdmin({ token, username });
      setUsers(usersData);

      // Načíst role, úseky, lokality
      const [rolesData, usekyData, lokalityData] = await Promise.all([
        getRoleList({ token, username }).catch(err => { console.error('Chyba načítání rolí:', err); return []; }),
        getUsekyList({ token, username, show_inactive: false }).catch(err => { console.error('Chyba načítání úseků:', err); return []; }),
        getLokalityList({ token, username, show_inactive: false }).catch(err => { console.error('Chyba načítání lokalit:', err); return []; })
      ]);
      
      setRoles(rolesData);
      setUseky(usekyData);
      setLokality(lokalityData);
    } catch (err) {
      console.error('Chyba při načítání pomocných dat:', err);
    }
  }, [token, username]);

  useEffect(() => {
    loadRules();
    loadAuxiliaryData();
  }, [loadRules, loadAuxiliaryData]);

  // ─── Handle form ──────────────────────────────────────────────────────────
  const handleInputChange = (field, value) => {
    // CustomSelect vrací event-like objekt s target.value
    const val = value?.target?.value !== undefined ? value.target.value : value;
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validace
    if (!formData.zastupovany_id) {
      setError('Vyberte zastupovaného uživatele');
      return;
    }

    const isAllTargets = formData.zastupovany_id === 'ALL_USERS';

    if (isAllTargets && formData.typ_zastupce === 'user') {
      setError('Pro "Zastupovaný uživatel: Všichni" použijte typ Role, Úsek nebo Lokalita');
      return;
    }

    // Pro 'user' musí být konkrétní ID, pro ostatní může být i "Všechny" (prázdná hodnota)
    let targetId = null;
    if (formData.typ_zastupce === 'user') {
      targetId = formData.zastupce_user_id;
      if (!targetId) {
        setError('Vyberte konkrétního uživatele');
        return;
      }
    } else if (formData.typ_zastupce === 'all') {
      // Globální pravidlo - všichni mohou zastupovat zastupovaného
      targetId = null;
    } else if (formData.typ_zastupce === 'role') {
      // Pro role je OK i prázdná hodnota (znamená "Všechny role")
      targetId = formData.zastupce_role_id !== undefined ? formData.zastupce_role_id : null;
    } else if (formData.typ_zastupce === 'usek') {
      // Pro úseky je OK i prázdná hodnota (znamená "Všechny úseky")
      targetId = formData.zastupce_usek_id !== undefined ? formData.zastupce_usek_id : null;
    } else if (formData.typ_zastupce === 'lokalita') {
      // Pro lokality je OK i prázdná hodnota (znamená "Všechny lokality")
      targetId = formData.zastupce_lokalita_id !== undefined ? formData.zastupce_lokalita_id : null;
    } else {
      setError('Zvolte typ zástupce');
      return;
    }

    try {
      // Parsování ID - prázdná hodnota zůstane null
      const parseId = (val) => val && val !== '' ? parseInt(val) : null;

      const baseRuleData = {
        typ_zastupce: formData.typ_zastupce,
        zastupce_user_id: formData.typ_zastupce === 'user' ? parseId(formData.zastupce_user_id) : null,
        zastupce_role_id: formData.typ_zastupce === 'role' ? parseId(formData.zastupce_role_id) : null,
        zastupce_usek_id: formData.typ_zastupce === 'usek' ? parseId(formData.zastupce_usek_id) : null,
        zastupce_lokalita_id: formData.typ_zastupce === 'lokalita' ? parseId(formData.zastupce_lokalita_id) : null,
        poznamka: formData.poznamka
      };

      if (isAllTargets && !editingRuleId) {
        // Globální pravidlo – jeden záznam s zastupovany_id = 0
        const result = await createSubstitutionRule({
          token,
          username,
          ruleData: {
            ...baseRuleData,
            zastupovany_id: 0
          }
        });
        if (!result || result.status === 'error') {
          throw new Error(result?.message || 'Nepodařilo se vytvořit globální pravidlo');
        }
        setSuccess('Globální pravidlo vytvořeno (platí pro všechny uživatele)');
      } else {
        const ruleData = {
          ...baseRuleData,
          zastupovany_id: parseInt(formData.zastupovany_id, 10)
        };

        if (editingRuleId) {
          // UPDATE existujícího pravidla
          ruleData.id = editingRuleId;
          await updateSubstitutionRule({
            token,
            username,
            ruleData
          });
          setSuccess('Možnost zastupování byla úspěšně aktualizována');

          // Uložit ID editovaného pravidla do localStorage PŘED změnou state
          const ruleIdToHighlight = editingRuleId;
          localStorage.setItem('lastEditedRuleId', ruleIdToHighlight);
          localStorage.setItem('highlightUntil', Date.now() + 4000);
        } else {
          // CREATE nového pravidla
          await createSubstitutionRule({
            token,
            username,
            ruleData
          });
          setSuccess('Možnost zastupování byla úspěšně vytvořena');
        }
      }

      setShowForm(false);
      setEditingRuleId(null);
      setFormData({
        zastupovany_id: '',
        typ_zastupce: 'user',
        zastupce_user_id: '',
        zastupce_role_id: '',
        zastupce_usek_id: '',
        zastupce_lokalita_id: '',
        poznamka: ''
      });
      
      loadRules();
    } catch (err) {
      setError(err.message || (editingRuleId ? 'Chyba při aktualizaci možnosti zastupování' : 'Chyba při vytváření možnosti zastupování'));
    }
  };

  const handleEdit = (rule) => {
    // ⚠️ Zajistit, že zastupovaný uživatel je v users array
    // (může se stát když uživatel již neexistuje nebo ztratil právo USER_SUBSTITUTE_SET)
    const missingUsers = [];
    
    const zastupovanyExists = rule.zastupovany_id === 0 ? true : users.some(u => u.id === rule.zastupovany_id);
    if (!zastupovanyExists && rule.zastupovany_id && rule.zastupovany_id !== 0) {
      const displayName = rule.zastupovany_jmeno && rule.zastupovany_prijmeni 
        ? `${rule.zastupovany_jmeno} ${rule.zastupovany_prijmeni}`.trim()
        : rule.zastupovany_username || `User ${rule.zastupovany_id}`;
      
      missingUsers.push({
        id: rule.zastupovany_id,
        username: rule.zastupovany_username || '',
        jmeno: rule.zastupovany_jmeno || '',
        prijmeni: rule.zastupovany_prijmeni || '',
        cele_jmeno: displayName
      });
    }
    
    // Pokud je typ "user" a zástupce není v users array, přidat ho
    if (rule.typ_zastupce === 'user' && rule.zastupce_user_id) {
      const zastupceExists = users.some(u => u.id === rule.zastupce_user_id);
      if (!zastupceExists) {
        const displayName = rule.zastupce_user_jmeno && rule.zastupce_user_prijmeni
          ? `${rule.zastupce_user_jmeno} ${rule.zastupce_user_prijmeni}`.trim()
          : rule.zastupce_user_username || `User ${rule.zastupce_user_id}`;
        
        missingUsers.push({
          id: rule.zastupce_user_id,
          username: rule.zastupce_user_username || '',
          jmeno: rule.zastupce_user_jmeno || '',
          prijmeni: rule.zastupce_user_prijmeni || '',
          cele_jmeno: displayName
        });
      }
    }
    
    if (missingUsers.length > 0) {
      setUsers(prev => [...prev, ...missingUsers]);
    }
    
    // Načíst data do formuláře
    const resolvedType = (rule.typ_zastupce === 'role' && !rule.zastupce_role_id) ? 'all' : rule.typ_zastupce;
    const resolvedZastupovanyId = (rule.global_all_users || rule.zastupovany_id === 0)
      ? 'ALL_USERS'
      : rule.zastupovany_id.toString();
    setFormData({
      zastupovany_id: resolvedZastupovanyId,
      typ_zastupce: resolvedType,
      zastupce_user_id: rule.zastupce_user_id ? rule.zastupce_user_id.toString() : '',
      zastupce_role_id: rule.zastupce_role_id ? rule.zastupce_role_id.toString() : '',
      zastupce_usek_id: rule.zastupce_usek_id ? rule.zastupce_usek_id.toString() : '',
      zastupce_lokalita_id: rule.zastupce_lokalita_id ? rule.zastupce_lokalita_id.toString() : '',
      poznamka: rule.poznamka || ''
    });
    
    // Inicializovat selectStates - aby CustomSelect zobrazil vybrané hodnoty
    setSelectStates({});
    setSearchStates({});
    setTouchedSelectFields(new Set());
    
    setEditingRuleId(rule.id);
    // Pro editaci NEzobrazovat form nahoře, pouze inline
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleDelete = (ruleId) => {
    setConfirmDialog({
      open: true,
      title: 'Smazat možnost zastupování?',
      message: 'Tato akce je nevratná. Opravdu chcete smazat tuto možnost zastupování?',
      onConfirm: async () => {
        try {
          await deleteSubstitutionRule({ token, username, ruleId });
          setSuccess('Možnost zastupování byla smazána');
          loadRules();
        } catch (err) {
          setError(err.message || 'Chyba při mazání možnosti zastupování');
        } finally {
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      }
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const userOptions = users.map(u => ({
    id: u.id,
    value: String(u.id),
    label: u.cele_jmeno || `${u.jmeno} ${u.prijmeni}`,
    nazev: u.cele_jmeno || `${u.jmeno} ${u.prijmeni}`
  }));
  const zastupovanyUserOptions = [
    { id: -1, value: 'ALL_USERS', label: 'Všichni uživatelé (globální pravidlo)', nazev: 'Všichni uživatelé (globální pravidlo)' },
    ...userOptions
  ];
  const roleOptions = [
    { id: 0, value: '', label: 'Všechny role', nazev: 'Všechny role' },
    ...roles.map(r => ({
      id: r.id,
      value: String(r.id),
      label: r.nazev_role || r.nazev || `Role ${r.id}`,
      nazev: r.nazev_role || r.nazev || `Role ${r.id}`
    }))
  ];
  const usekOptions = [
    { id: 0, value: '', label: 'Všechny úseky', nazev: 'Všechny úseky' },
    ...useky.map(u => ({
      id: u.id,
      value: String(u.id),
      label: `${u.usek_nazev} (${u.usek_zkr})`,
      nazev: `${u.usek_nazev} (${u.usek_zkr})`
    }))
  ];
  const lokalitaOptions = [
    { id: 0, value: '', label: 'Všechny lokality', nazev: 'Všechny lokality' },
    ...lokality.map(l => ({
      id: l.id,
      value: String(l.id),
      label: l.nazev || `Lokalita ${l.id}`,
      nazev: l.nazev || `Lokalita ${l.id}`
    }))
  ];

  return (
    <Container>
      <PageHeader>
        <PageTitle>
          <h2>
            <Shield size={24} />
            Možnosti zastupování
          </h2>
          <p>Správa pravidel "kdo může koho zastupovat" na základě uživatelů, rolí, úseků, lokalit nebo globálně (všichni)</p>
        </PageTitle>
        <HeaderActions>
          <Btn $variant="ghost" onClick={loadRules} disabled={loading}>
            <RefreshCw size={16} />
            Obnovit
          </Btn>
          <Btn $variant="primary" onClick={() => {
            setShowForm(!showForm);
            setEditingRuleId(null);
            setFormData({
              zastupovany_id: '',
              typ_zastupce: 'user',
              zastupce_user_id: '',
              zastupce_role_id: '',
              zastupce_usek_id: '',
              zastupce_lokalita_id: '',
              poznamka: ''
            });
            setError('');
            setSuccess('');
          }}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Zrušit' : 'Nové pravidlo'}
          </Btn>
        </HeaderActions>
      </PageHeader>

      {error && (
        <Alert $type="error">
          <AlertCircle />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert $type="success">
          <CheckCircle />
          <span>{success}</span>
        </Alert>
      )}

      {showForm && !editingRuleId && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Plus size={18} />
              Nová možnost zastupování
            </CardTitle>
          </CardHeader>
          <CardBody>
            <FormGroup>
              <Label>Zastupovaný uživatel *</Label>
              <CustomSelect
                field="zastupovany_id"
                value={formData.zastupovany_id}
                onChange={(e) => handleInputChange('zastupovany_id', e.target.value)}
                options={zastupovanyUserOptions}
                placeholder="Vyberte uživatele"
                selectStates={selectStates} setSelectStates={setSelectStates}
                searchStates={searchStates} setSearchStates={setSearchStates}
                touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
              />
            </FormGroup>

            <FormGroup>
              <Label>Typ zástupce *</Label>
              <RadioGroup>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="user"
                    checked={formData.typ_zastupce === 'user'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Konkrétní uživatel
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="all"
                    checked={formData.typ_zastupce === 'all'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Všichni uživatelé
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="role"
                    checked={formData.typ_zastupce === 'role'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celá role
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="usek"
                    checked={formData.typ_zastupce === 'usek'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celý úsek
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="lokalita"
                    checked={formData.typ_zastupce === 'lokalita'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celá lokalita
                </RadioLabel>
              </RadioGroup>
            </FormGroup>

            {formData.typ_zastupce === 'user' && (
              <FormGroup>
                <Label>Zástupce - uživatel *</Label>
                <CustomSelect
                  field="zastupce_user_id"
                  value={formData.zastupce_user_id}
                  onChange={(e) => handleInputChange('zastupce_user_id', e.target.value)}
                  options={userOptions}
                  placeholder="Vyberte uživatele"
                  selectStates={selectStates} setSelectStates={setSelectStates}
                  searchStates={searchStates} setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                />
              </FormGroup>
            )}

            {formData.typ_zastupce === 'role' && (
              <FormGroup>
                <Label>Zástupce - role *</Label>
                <CustomSelect
                  field="zastupce_role_id"
                  value={formData.zastupce_role_id}
                  onChange={(e) => handleInputChange('zastupce_role_id', e.target.value)}
                  options={roleOptions}
                  placeholder="Vyberte roli"
                  selectStates={selectStates} setSelectStates={setSelectStates}
                  searchStates={searchStates} setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                />
              </FormGroup>
            )}

            {formData.typ_zastupce === 'usek' && (
              <FormGroup>
                <Label>Zástupce - úsek *</Label>
                <CustomSelect
                  field="zastupce_usek_id"
                  value={formData.zastupce_usek_id}
                  onChange={(e) => handleInputChange('zastupce_usek_id', e.target.value)}
                  options={usekOptions}
                  placeholder="Vyberte úsek"
                  selectStates={selectStates} setSelectStates={setSelectStates}
                  searchStates={searchStates} setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                />
              </FormGroup>
            )}

            {formData.typ_zastupce === 'lokalita' && (
              <FormGroup>
                <Label>Zástupce - lokalita *</Label>
                <CustomSelect
                  field="zastupce_lokalita_id"
                  value={formData.zastupce_lokalita_id}
                  onChange={(e) => handleInputChange('zastupce_lokalita_id', e.target.value)}
                  options={lokalitaOptions}
                  placeholder="Vyberte lokalitu"
                  selectStates={selectStates} setSelectStates={setSelectStates}
                  searchStates={searchStates} setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                />
              </FormGroup>
            )}

            <FormGroup>
              <Label>Poznámka</Label>
              <Textarea
                value={formData.poznamka}
                onChange={(e) => handleInputChange('poznamka', e.target.value)}
                placeholder="Volitelná poznámka k tomuto pravidlu"
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Btn onClick={() => {
                setShowForm(false);
                setEditingRuleId(null);
                setError('');
                setSuccess('');
              }}>Zrušit</Btn>
              <Btn $variant="primary" onClick={handleSubmit}>
                {editingRuleId ? <CheckCircle size={16} /> : <Plus size={16} />}
                {editingRuleId ? 'Uložit změny' : 'Vytvořit'}
              </Btn>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Users size={18} />
            Přehled pravidel ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardBody $noPadding>
          {loading ? (
            <EmptyState>
              <Spinner size={48} />
              <div>Načítání...</div>
            </EmptyState>
          ) : rules.length === 0 ? (
            <EmptyState>
              <Shield />
              <div>Zatím nejsou definována žádná pravidla zastupování</div>
            </EmptyState>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Zastupovaný</Th>
                  <Th>Typ</Th>
                  <Th>Zástupce/Skupina</Th>
                  <Th>Poznámka</Th>
                  <Th style={{ width: '100px', textAlign: 'center' }}>Akce</Th>
                </Tr>
              </Thead>
              <tbody>
                {rules.map((rule) => (
                  <React.Fragment key={rule.id}>
                    {editingRuleId === rule.id ? (
                      <EditingTr>
                        <Td>{rule.zastupovany_display}</Td>
                        <Td>
                          <Badge $type={rule.typ_zastupce === 'role' && !rule.zastupce_role_id ? 'all' : rule.typ_zastupce}>
                            {rule.typ_zastupce === 'user' && 'Uživatel'}
                            {rule.typ_zastupce === 'role' && !rule.zastupce_role_id && 'Všichni'}
                            {rule.typ_zastupce === 'role' && !!rule.zastupce_role_id && 'Role'}
                            {rule.typ_zastupce === 'usek' && 'Úsek'}
                            {rule.typ_zastupce === 'lokalita' && 'Lokalita'}
                          </Badge>
                        </Td>
                        <Td>{rule.zastupce_display}</Td>
                        <Td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {rule.poznamka || '—'}
                        </Td>
                        <Td style={{ textAlign: 'center' }}>
                          <ActionButtonsRow>
                            <IconBtn onClick={() => {
                              setEditingRuleId(null);
                              setError('');
                              setSuccess('');
                            }} title="Zrušit editaci">
                              <X size={16} />
                            </IconBtn>
                          </ActionButtonsRow>
                        </Td>
                      </EditingTr>
                    ) : (
                      <Tr style={highlightRuleId === rule.id ? {
                        animation: `${highlightPulse} 3s ease-out forwards`,
                        backgroundColor: '#dcfce7'
                      } : {}}>
                        <Td>{rule.zastupovany_display}</Td>
                        <Td>
                          <Badge $type={rule.typ_zastupce === 'role' && !rule.zastupce_role_id ? 'all' : rule.typ_zastupce}>
                            {rule.typ_zastupce === 'user' && 'Uživatel'}
                            {rule.typ_zastupce === 'role' && !rule.zastupce_role_id && 'Všichni'}
                            {rule.typ_zastupce === 'role' && !!rule.zastupce_role_id && 'Role'}
                            {rule.typ_zastupce === 'usek' && 'Úsek'}
                            {rule.typ_zastupce === 'lokalita' && 'Lokalita'}
                          </Badge>
                        </Td>
                        <Td>{rule.zastupce_display}</Td>
                        <Td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {rule.poznamka || '—'}
                        </Td>
                        <Td style={{ textAlign: 'center' }}>
                          <ActionButtonsRow>
                            <IconBtn onClick={() => handleEdit(rule)} title="Upravit">
                              <Edit2 size={16} />
                            </IconBtn>
                            <IconBtn onClick={() => handleDelete(rule.id)} title="Smazat">
                              <Trash2 size={16} />
                            </IconBtn>
                          </ActionButtonsRow>
                        </Td>
                      </Tr>
                    )}
                    
                    {editingRuleId === rule.id && (
                      <EditRow>
                        <td colSpan="5">
                          <div style={{ maxWidth: 'none', padding: '0 0' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Edit2 size={16} />
                              Upravit pravidlo zastupování
                            </h3>
                            
                            <EditFormContainer>
                              <FormGroup>
                                <Label>Zastupovaný uživatel *</Label>
                                <CustomSelect
                                  field="zastupovany_id_edit"
                                  value={formData.zastupovany_id}
                                  onChange={(e) => handleInputChange('zastupovany_id', e.target.value)}
                                  options={userOptions}
                                  placeholder="Vyberte uživatele"
                                  selectStates={selectStates} setSelectStates={setSelectStates}
                                  searchStates={searchStates} setSearchStates={setSearchStates}
                                  touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                                  toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                                />
                              </FormGroup>

                              <FormGroup style={{ gridColumn: 'span 2' }}>
                                <Label>Typ zástupce *</Label>
                                <RadioGroup>
                                  <RadioLabel>
                                    <input
                                      type="radio"
                                      name="typ_zastupce"
                                      value="user"
                                      checked={formData.typ_zastupce === 'user'}
                                      onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                                    />
                                    Uživatel
                                  </RadioLabel>
                                  <RadioLabel>
                                    <input
                                      type="radio"
                                      name="typ_zastupce"
                                      value="all"
                                      checked={formData.typ_zastupce === 'all'}
                                      onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                                    />
                                    Všichni
                                  </RadioLabel>
                                  <RadioLabel>
                                    <input
                                      type="radio"
                                      name="typ_zastupce"
                                      value="role"
                                      checked={formData.typ_zastupce === 'role'}
                                      onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                                    />
                                    Role
                                  </RadioLabel>
                                  <RadioLabel>
                                    <input
                                      type="radio"
                                      name="typ_zastupce"
                                      value="usek"
                                      checked={formData.typ_zastupce === 'usek'}
                                      onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                                    />
                                    Úsek
                                  </RadioLabel>
                                  <RadioLabel>
                                    <input
                                      type="radio"
                                      name="typ_zastupce"
                                      value="lokalita"
                                      checked={formData.typ_zastupce === 'lokalita'}
                                      onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                                    />
                                    Lokalita
                                  </RadioLabel>
                                </RadioGroup>
                              </FormGroup>

                              {formData.typ_zastupce === 'user' && (
                                <FormGroup>
                                  <Label>Zástupce - uživatel *</Label>
                                  <CustomSelect
                                    field="zastupce_user_id_edit"
                                    value={formData.zastupce_user_id}
                                    onChange={(e) => handleInputChange('zastupce_user_id', e.target.value)}
                                    options={userOptions}
                                    placeholder="Vyberte uživatele"
                                    selectStates={selectStates} setSelectStates={setSelectStates}
                                    searchStates={searchStates} setSearchStates={setSearchStates}
                                    touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                                    toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                                  />
                                </FormGroup>
                              )}

                              {formData.typ_zastupce === 'role' && (
                                <FormGroup>
                                  <Label>Zástupce - role *</Label>
                                  <CustomSelect
                                    field="zastupce_role_id_edit"
                                    value={formData.zastupce_role_id}
                                    onChange={(e) => handleInputChange('zastupce_role_id', e.target.value)}
                                    options={roleOptions}
                                    placeholder="Vyberte roli"
                                    selectStates={selectStates} setSelectStates={setSelectStates}
                                    searchStates={searchStates} setSearchStates={setSearchStates}
                                    touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                                    toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                                  />
                                </FormGroup>
                              )}

                              {formData.typ_zastupce === 'usek' && (
                                <FormGroup>
                                  <Label>Zástupce - úsek *</Label>
                                  <CustomSelect
                                    field="zastupce_usek_id_edit"
                                    value={formData.zastupce_usek_id}
                                    onChange={(e) => handleInputChange('zastupce_usek_id', e.target.value)}
                                    options={usekOptions}
                                    placeholder="Vyberte úsek"
                                    selectStates={selectStates} setSelectStates={setSelectStates}
                                    searchStates={searchStates} setSearchStates={setSearchStates}
                                    touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                                    toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                                  />
                                </FormGroup>
                              )}

                              {formData.typ_zastupce === 'lokalita' && (
                                <FormGroup>
                                  <Label>Zástupce - lokalita *</Label>
                                  <CustomSelect
                                    field="zastupce_lokalita_id_edit"
                                    value={formData.zastupce_lokalita_id}
                                    onChange={(e) => handleInputChange('zastupce_lokalita_id', e.target.value)}
                                    options={lokalitaOptions}
                                    placeholder="Vyberte lokalitu"
                                    selectStates={selectStates} setSelectStates={setSelectStates}
                                    searchStates={searchStates} setSearchStates={setSearchStates}
                                    touchedSelectFields={touchedSelectFields} setTouchedSelectFields={setTouchedSelectFields}
                                    toggleSelect={toggleSelect} filterOptions={filterOptions} getOptionLabel={getOptionLabel}
                                  />
                                </FormGroup>
                              )}

                              <FormGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>Poznámka</Label>
                                <Textarea
                                  value={formData.poznamka}
                                  onChange={(e) => handleInputChange('poznamka', e.target.value)}
                                  placeholder="Volitelná poznámka k tomuto pravidlu"
                                />
                              </FormGroup>

                              <EditFormActions>
                                <Btn onClick={() => {
                                  setEditingRuleId(null);
                                  setError('');
                                  setSuccess('');
                                }}>Zrušit</Btn>
                                <Btn $variant="primary" onClick={handleSubmit}>
                                  <CheckCircle size={16} />
                                  Uložit změny
                                </Btn>
                              </EditFormActions>
                            </EditFormContainer>
                          </div>
                        </td>
                      </EditRow>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {confirmDialog.open && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
          confirmText="Smazat"
          cancelText="Zrušit"
        />
      )}
    </Container>
  );
}
