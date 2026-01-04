/**
 * Cashbook Tab - Správa pokladních knih a nastavení
 *
 * Obsahuje:
 * - Tabulku přiřazení pokladen (VPD/PPD čísla, uživatelé)
 * - Globální nastavení (cashbook_use_prefix)
 * - Admin panel pro správu číselných řad
 *
 * @author Frontend Team
 * @date 2025-11-08
 */

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faMinus, faEdit, faTrash, faSyncAlt, faEraser, faTimes,
  faCheckCircle, faTimesCircle, faCalculator, faChevronUp, faChevronDown,
  faCog, faSave, faExclamationTriangle, faBolt
} from '@fortawesome/free-solid-svg-icons';
import { Calculator, Settings, User, DollarSign } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { DictionaryCacheContext } from '../../../context/DictionaryCacheContext';
import cashbookAPI from '../../../services/cashbookService';
import EditCashboxDialog from '../../cashbook/EditCashboxDialog';
import DeleteAssignmentDialog from '../../cashbook/DeleteAssignmentDialog';
import CreateCashboxDialog from '../../cashbook/CreateCashboxDialog';
import ForceRenumberDialog from '../../cashbook/ForceRenumberDialog';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';

// =============================================================================
// SCROLLBAR STYLES
// =============================================================================

const scrollbarStyles = `
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;

    &:hover {
      background: #64748b;
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const SettingsPanel = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
`;

const SettingsTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
  }
`;

const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingsLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #0c4a6e;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const SettingsDescription = styled.div`
  font-size: 0.875rem;
  color: #475569;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 100%;
`;

const SearchIcon = styled(FontAwesomeIcon)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  font-size: 1rem;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    color: #dc2626;
    transform: translateY(-50%) scale(1.2);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.5rem;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$primary ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white'};
  color: ${props => props.$primary ? 'white' : '#64748b'};
  border: 2px solid ${props => props.$primary ? '#3b82f6' : '#e2e8f0'};
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$primary ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#f8fafc'};
    border-color: ${props => props.$primary ? '#2563eb' : '#cbd5e1'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 1rem;
  }
`;

const TableWrapper = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  ${scrollbarStyles}
`;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TheadTr = styled.tr`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const Th = styled.th`
  padding: 1rem 0.75rem;
  text-align: center;
  color: white;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;

  &:hover {
    background: ${props => props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  }

  &:first-of-type {
    text-align: left;
  }
`;

const Tbody = styled.tbody``;

const Td = styled.td`
  padding: 1rem 0.75rem;
  text-align: center;
  vertical-align: middle;
  border-bottom: 1px solid #e2e8f0;

  &:first-of-type {
    text-align: left;
  }
`;

const Tr = styled.tr`
  transition: background 0.2s;

  &:hover {
    background: #f8fafc;
  }

  &:last-child td {
    border-bottom: none;
  }
`;

const UserName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #1e293b;
`;

const UserIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$inactive ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const NumberBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  background: ${props => props.$type === 'vpd' ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$type === 'vpd' ? '#15803d' : '#b45309'};
  border: 1px solid ${props => props.$type === 'vpd' ? '#86efac' : '#fde68a'};
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: ${props => props.$active ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$active ? '#15803d' : '#991b1b'};
  border: 1px solid ${props => props.$active ? '#86efac' : '#fca5a5'};
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;

  svg {
    font-size: 0.875rem;
  }
`;

const ActionIcons = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${props => props.$warning ? '#f59e0b' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$warning ? '#fffbeb' : '#f1f5f9'};
    color: ${props => props.$delete ? '#dc2626' : props.$warning ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    font-size: 1rem;
  }
`;

// =============================================================================
// EXPANDABLE ROW STYLES
// =============================================================================

const ExpandedContent = styled.div`
  padding: 1.5rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #000;
`;

const UsersTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ExpandedUserIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const ExpandedUserName = styled.span`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
`;

const UserMeta = styled.span`
  font-size: 0.75rem;
  color: #64748b;
`;

const UserBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainBadge = styled.span`
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    transform: translateY(-1px);
  }
`;

const AddUserButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  svg {
    font-size: 1rem;
  }
`;

const EmptyUsers = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.875rem;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const PaginationButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;

  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    font-size: 1rem;
    margin: 0;
  }
`;

// Confirm Dialog Components
const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  cursor: pointer;
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 2rem;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 10001;
  cursor: default;
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ConfirmMessage = styled.p`
  margin: 0 0 1.5rem 0;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;

  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfirmCancelButton = styled(ConfirmButton)`
  background: white;
  color: #64748b;
  border: 1px solid #cbd5e1;

  &:hover {
    background: #f1f5f9;
  }
`;

const ConfirmDeleteButton = styled(ConfirmButton)`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;

  &:hover {
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    transform: translateY(-1px);
  }
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const CashbookTab = () => {
  const { user, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { invalidateCache } = useContext(DictionaryCacheContext) || {};

  // ============= LOCALSTORAGE HELPERS =============
  const user_id = user?.user_id;

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

  // States
  const [cashboxes, setCashboxes] = useState([]); // 🆕 ZMĚNA: pokladny místo assignments
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [usePrefixSetting, setUsePrefixSetting] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Pagination state
  const [pageSize, setPageSize] = useState(() => getUserStorage('cashbook_pageSize', 25));
  const [pageIndex, setPageIndex] = useState(() => getUserStorage('cashbook_pageIndex', 0));

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState({ show: false, assignmentId: null, userName: '' });
  const [forceRenumberDialogOpen, setForceRenumberDialogOpen] = useState(false);
  const [assignmentToRenumber, setAssignmentToRenumber] = useState(null);

  // Oprávnění
  const canManage = hasPermission('CASH_BOOK_MANAGE');

  // ============================================================================
  // PAGINATION PERSISTENCE
  // ============================================================================

  useEffect(() => {
    setUserStorage('cashbook_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('cashbook_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []); // ✅ Vždy načíst při mountu (i po F5)

  // Znovu načíst když se změní oprávnění
  useEffect(() => {
    if (canManage !== undefined) {
      loadData();
    }
  }, [canManage]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 🆕 ZMĚNA: Načíst seznam pokladen (místo assignments)
      const cashboxResult = await cashbookAPI.getCashboxList(
        true,  // activeOnly = true (jen aktivní pokladny)
        true   // includeUsers = true (načíst i uživatele)
      );

      if (cashboxResult.status === 'ok') {
        const pokladny = cashboxResult.data.pokladny || [];
        setCashboxes(pokladny);
      } else {
        showToast?.('Chyba při načítání pokladen', { type: 'error' });
      }

      // Načíst globální nastavení
      const settingsResult = await cashbookAPI.getSettings('cashbook_use_prefix');

      if (settingsResult.status === 'ok' && settingsResult.data) {
        // Backend vrací: {data: {key: 'cashbook_use_prefix', value: '0'}}
        const value = settingsResult.data.value;
        const prefixEnabled = value === '1' || value === 1;
        setUsePrefixSetting(prefixEnabled);
      }
    } catch (error) {
      showToast?.('Chyba při načítání dat', { type: 'error' });
      console.error('Error loading cashbook data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSaveSettings = async () => {
    if (!canManage) {
      showToast?.('Nemáte oprávnění pro správu nastavení', { type: 'error' });
      return;
    }

    setSettingsSaving(true);
    try {
      const valueToSave = usePrefixSetting ? '1' : '0';

      const result = await cashbookAPI.updateSetting(
        'cashbook_use_prefix',
        valueToSave,
        'Používat prefixovaná čísla dokladů (V599-001)'
      );


      if (result.status === 'ok') {
        showToast?.('Nastavení uloženo', { type: 'success' });

        // Invalidate cache
        if (invalidateCache) {
          invalidateCache(['cashbook', 'settings']);
        }
      } else {
        showToast?.('Chyba při ukládání nastavení', { type: 'error' });
      }
    } catch (error) {
      showToast?.('Chyba při ukládání nastavení', { type: 'error' });
      console.error('Error saving settings:', error);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleEdit = (cashbox) => {
    // 🆕 ZMĚNA: editujeme pokladnu (cashbox) místo assignment
    setSelectedAssignment(cashbox);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // Po úspěšné editaci znovu načíst data
    loadData();
    invalidateCache?.('cashbook');
  };

  // Aktualizovat selectedAssignment když se načtou nová data
  useEffect(() => {
    if (editDialogOpen && selectedAssignment?.id && cashboxes.length > 0) {
      const updatedCashbox = cashboxes.find(c => c.id === selectedAssignment.id);
      if (updatedCashbox) {
        setSelectedAssignment(updatedCashbox);
      }
    }
  }, [cashboxes, editDialogOpen, selectedAssignment?.id]);

  const handleDelete = (cashbox) => {
    // 🆕 ZMĚNA: mažeme pokladnu (cashbox) místo assignment
    setSelectedAssignment(cashbox);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    // Po úspěšném smazání znovu načíst data
    loadData();
    invalidateCache?.('cashbook');
  };

  const handleAddNew = () => {
    setAddDialogOpen(true);
  };

  const handleAddSuccess = () => {
    // Po úspěšném vytvoření znovu načíst data
    loadData();
    invalidateCache?.('cashbook');
  };

  // 🆕 ADMIN: Force přepočet dokladů
  const handleForceRenumber = async (cashbox) => {
    console.log('🔧 FORCE RENUMBER - pokladna ID:', cashbox.id);

    try {
      // ✅ PO ZMĚNĚ (commit 945cc8e): Přímo použít pokladna_id z řádku
      // Vytvořit objekt pro dialog (simulace assignment pro zpětnou kompatibilitu s dialogem)
      const assignmentData = {
        pokladna_id: cashbox.id,
        cislo_pokladny: cashbox.cislo_pokladny,
        nazev: cashbox.nazev,
        ciselna_rada_vpd: cashbox.ciselna_rada_vpd,
        ciselna_rada_ppd: cashbox.ciselna_rada_ppd
      };

      console.log('🔧 FORCE RENUMBER - použiji pokladnu:', assignmentData);

      setAssignmentToRenumber(assignmentData);
      setForceRenumberDialogOpen(true);
    } catch (error) {
      console.error('Chyba při přípravě force renumber:', error);
      showToast?.('Chyba při načítání dat pokladny', { type: 'error' });
    }
  };

  const handleForceRenumberConfirm = async (pokladnaId, year) => {
    try {
      // ✅ PO ZMĚNĚ (commit 945cc8e): Posílá se pokladna_id místo assignment_id
      const result = await cashbookAPI.forceRenumberDocuments(pokladnaId, year);

      // ✅ SMAZAT LOCALSTORAGE pro všechny uživatele + měsíce dané pokladny v daném roce
      if (result && result.status === 'ok') {

        // Projít všechny localStorage klíče a smazat ty, které patří k této pokladně a roku
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // Format klíče: cashbook_{userId}_{year}_{month}
          // Nemůžeme filtrovat podle pokladna_id (není v klíči), tak smažeme všechny knihy v daném roce
          if (key && key.startsWith('cashbook_') && key.includes(`_${year}_`)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Zobrazit toast
        showToast?.(
          `Přečíslováno ${result.data.total_renumbered} položek. LocalStorage vymazán - obnovte stránku pokladní knihy (F5).`,
          { type: 'success', timeout: 8000 }
        );
      }

      // ✅ DIALOG SE ZAVŘE SÁM přes tlačítko "Hotovo" nebo "Zavřít"
      // ❌ NESMÍME ho zavírat tady automaticky!

      // ✅ Vrátit result (úspěch i chybu) - dialog rozhodne co zobrazit
      return result;
    } catch (error) {
      console.error('Chyba při force přepočtu:', error);

      // ✅ Neházet výjimku! Vrátit error objekt pro dialog
      return {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Chyba při komunikaci se serverem'
      };
    }
  };

  // ============================================================================
  // EXPANDABLE ROW RENDERING - Seznam uživatelů
  // ============================================================================

  const renderSubComponent = useCallback(({ row }) => {
    const cashbox = row.original;
    const allUsers = cashbox.uzivatele || [];

    // Filtrovat jen aktivní přiřazení (platne_do je NULL nebo v budoucnosti)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const users = allUsers.filter(user => {
      if (!user.platne_do) return true; // NULL = aktivní navždy
      return user.platne_do > today; // Budoucí datum = ještě aktivní (dnes už ne)
    });

    if (!canManage) {
      return null; // Non-admin nemůže rozbalit
    }

    return (
      <ExpandedContent>
        <UsersTitle>
          <User size={16} />
          Přiřazená ({users.length})
        </UsersTitle>

        {users.length === 0 ? (
          <EmptyUsers>
            Žádná přiřazení. Klikněte na "+ Přiřadit uživatele" pro přidání.
          </EmptyUsers>
        ) : (
          <UsersList>
            {users.map(user => (
              <UserItem key={user.prirazeni_id}>
                <UserInfo>
                  <ExpandedUserIcon>
                    <User size={16} />
                  </ExpandedUserIcon>
                  <UserDetails>
                    <ExpandedUserName>
                      {user.uzivatel_cele_jmeno}
                      {(user.je_hlavni === 1 || user.je_hlavni === '1') ? (
                        <MainBadge style={{ marginLeft: '0.5rem' }}>Hlavní</MainBadge>
                      ) : (
                        <MainBadge style={{ marginLeft: '0.5rem', background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>Zástupce</MainBadge>
                      )}
                    </ExpandedUserName>
                    <UserMeta>
                      {user.username}
                      {user.lokalita_nazev && ` | ${user.lokalita_nazev}`}
                      {user.usek_nazev && ` | ${user.usek_nazev}`}
                       • Přiřazena od: {user.platne_od}
                      {user.platne_do ? ` • do: ${user.platne_do}` : ' • navždy'}
                      {user.poznamka && ` • ${user.poznamka}`}
                    </UserMeta>
                  </UserDetails>
                </UserInfo>

                <UserBadges>
                  <RemoveButton
                    onClick={() => handleUnassignUserClick(user.prirazeni_id, user.uzivatel_cele_jmeno)}
                    title="Odebrat uživatele z pokladny"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Odebrat
                  </RemoveButton>
                </UserBadges>
              </UserItem>
            ))}
          </UsersList>
        )}

        <div style={{ marginTop: '1rem' }}>
          <AddUserButton onClick={() => handleAssignUser(cashbox.id)}>
            <FontAwesomeIcon icon={faPlus} />
            Přiřadit uživatele
          </AddUserButton>
        </div>
      </ExpandedContent>
    );
  }, [canManage]);

  // Placeholder handlery pro assign/unassign (budou implementovány s dialogy)
  const handleAssignUser = useCallback((cashboxId) => {
    // TODO: Otevřít AssignUserDialog
    showToast('Funkce přiřazení uživatele - připravena pro implementaci', 'info');
  }, [showToast]);

  // User removal with custom confirm dialog
  const handleUnassignUserClick = useCallback((assignmentId, userName) => {
    setConfirmRemove({ show: true, assignmentId, userName });
  }, []);

  const handleUnassignUserConfirm = useCallback(async () => {
    const { assignmentId, userName } = confirmRemove;
    setConfirmRemove({ show: false, assignmentId: null, userName: '' });

    console.log('═══════════════════════════════════════════════════════');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 Assignment ID:', assignmentId);
    console.log('👤 Uživatel:', userName);

    try {
      console.log('📡 Volám API: cashbookAPI.unassignUserFromCashbox()');
      const result = await cashbookAPI.unassignUserFromCashbox(assignmentId);

      console.log('   Status:', result?.status);
      console.log('   Message:', result?.message);
      console.log('   Affected rows:', result?.data?.affected_rows);

      if (result.status === 'ok') {
        // Kontrola affected_rows - pokud je 0, záznam nebyl aktualizován
        const affectedRows = result?.data?.affected_rows;

        if (affectedRows === 0 || affectedRows === '0') {
          console.warn('⚠️  BE vrátilo affected_rows = 0 (žádná změna v DB)');
          console.warn('   Možné důvody:');
          console.warn('   1. Záznam s prirazeni_id =', assignmentId, 'neexistuje');
          console.warn('   2. Záznam už má platne_do nastavené na dnešní datum');
          console.warn('   3. SQL WHERE podmínka je špatně');
          showToast(`VAROVÁNÍ: Uživatel "${userName}" nebyl odebrán - záznam už neexistuje nebo byl již deaktivován`, 'warning');
          console.log('═══════════════════════════════════════════════════════');
          console.log('═══════════════════════════════════════════════════════');

          // I tak refreshneme data, ať vidíme aktuální stav
          loadData();
          invalidateCache?.('cashbook');
          return;
        }

        showToast(`Uživatel "${userName}" byl úspěšně odebrán z pokladny`, 'success');

        loadData(); // Reload data to reflect changes
        invalidateCache?.('cashbook');
        console.log('═══════════════════════════════════════════════════════');
        console.log('═══════════════════════════════════════════════════════');
      } else {
        console.error('❌ BE vrátilo neúspěšný status:', result?.status);
        showToast(result.message || 'Chyba při odebírání uživatele', 'error');
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ CASHBOOK TAB - FAILED');
        console.log('═══════════════════════════════════════════════════════');
      }
    } catch (error) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ CASHBOOK TAB - ERROR');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Response:', error?.response);
      console.error('Response Data:', error?.response?.data);
      showToast('Chyba při odebírání uživatele z pokladny', 'error');
    }
  }, [confirmRemove, showToast, invalidateCache]);

  const handleUnassignUserCancel = useCallback(() => {
    setConfirmRemove({ show: false, assignmentId: null, userName: '' });
  }, []);

  // ============================================================================
  // TABLE COLUMNS - 🆕 NOVÁ STRUKTURA: Pokladny místo uživatelů
  // ============================================================================

  const columns = useMemo(
    () => [
      {
        id: 'expander',
        header: ({ table }) => {
          const isAllExpanded = table.getIsAllRowsExpanded();
          return (
            <IconButton
              onClick={() => table.toggleAllRowsExpanded()}
              title={isAllExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
              style={{ 
                color: 'white',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
            >
              <FontAwesomeIcon icon={isAllExpanded ? faMinus : faPlus} />
            </IconButton>
          );
        },
        cell: ({ row }) => {
          const userCount = row.original.pocet_uzivatelu || 0;
          if (userCount === 0) return null;

          return (
            <IconButton
              onClick={() => row.toggleExpanded()}
              title={row.getIsExpanded() ? 'Zabalit uživatele' : 'Rozbalit uživatele'}
            >
              <FontAwesomeIcon
                icon={row.getIsExpanded() ? faMinus : faPlus}
              />
            </IconButton>
          );
        },
      },
      {
        accessorKey: 'cislo_pokladny',
        header: 'Číslo',
        cell: ({ row }) => (
          <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1e40af' }}>
            {row.original.cislo_pokladny}
          </div>
        ),
      },
      {
        accessorKey: 'nazev',
        header: 'Název pokladny',
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 500 }}>
              {row.original.nazev || `Pokladna ${row.original.cislo_pokladny}`}
            </div>
            {row.original.kod_pracoviste && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                {row.original.kod_pracoviste} - {row.original.nazev_pracoviste}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'ciselna_rada_vpd',
        header: 'VPD',
        cell: ({ row }) => (
          <div>
            <NumberBadge $type="vpd">
              V{row.original.ciselna_rada_vpd}
            </NumberBadge>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              od {row.original.vpd_od_cislo || 1}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'ciselna_rada_ppd',
        header: 'PPD',
        cell: ({ row }) => (
          <div>
            <NumberBadge $type="ppd">
              P{row.original.ciselna_rada_ppd}
            </NumberBadge>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              od {row.original.ppd_od_cislo || 1}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'pocet_uzivatelu',
        header: 'Uživatelů',
        cell: ({ row }) => {
          const count = row.original.pocet_uzivatelu || 0;
          return (
            <div style={{
              fontSize: '0.875rem',
              color: count > 0 ? '#059669' : '#94a3b8',
              fontWeight: count > 0 ? 600 : 400
            }}>
              <User style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />
              {count} {count === 1 ? 'uživatel' : count < 5 ? 'uživatelé' : 'uživatelů'}
            </div>
          );
        },
      },
      {
        accessorKey: 'aktivni',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge $active={row.original.aktivni}>
            <FontAwesomeIcon icon={row.original.aktivni ? faCheckCircle : faTimesCircle} />
            {row.original.aktivni ? 'Aktivní' : 'Neaktivní'}
          </StatusBadge>
        ),
      },
      {
        id: 'actions',
        header: () => (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
          </div>
        ),
        cell: ({ row }) => (
          <ActionIcons>
            <IconButton
              onClick={() => handleEdit(row.original)}
              disabled={!canManage}
              title="Upravit pokladnu (VPD/PPD)"
            >
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
            <IconButton
              onClick={() => handleDelete(row.original)}
              disabled={!canManage}
              $delete
              title="Smazat pokladnu"
            >
              <FontAwesomeIcon icon={faTrash} />
            </IconButton>
            {canManage && (
              <IconButton
                onClick={() => handleForceRenumber(row.original)}
                $warning
                title="Force přepočet pořadí dokladů (ADMIN)"
              >
                <FontAwesomeIcon icon={faCalculator} />
              </IconButton>
            )}
          </ActionIcons>
        ),
      },
    ],
    [canManage]
  );

  // ============================================================================
  // TABLE INSTANCE - 🆕 S PODPOROU EXPANDOVÁNÍ
  // ============================================================================

  const table = useReactTable({
    data: cashboxes, // 🆕 ZMĚNA: cashboxes místo assignments
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(), // 🆕 PŘIDÁNO: Pro expandování
    enableExpanding: true, // 🆕 Povolit expandování
    getRowCanExpand: () => true, // 🆕 Všechny řádky mohou expandovat
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    state: {
      globalFilter: globalSearch,
      pagination: { pageSize, pageIndex },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function'
        ? updater({ pageSize, pageIndex })
        : updater;
      setPageSize(newState.pageSize);
      setPageIndex(newState.pageIndex);
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      const values = [
        row.original.uzivatel_jmeno,
        row.original.uzivatel_prijmeni,
        row.original.uzivatel_id,
        row.original.cislo_pokladny,
        row.original.ciselna_rada_vpd,
        row.original.ciselna_rada_ppd,
      ].map(v => String(v || '').toLowerCase());

      return values.some(val => val.includes(searchValue));
    },
    state: {
      globalFilter: globalSearch,
    },
    onGlobalFilterChange: setGlobalSearch,
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Container>
        <EmptyState>
          <FontAwesomeIcon icon={faSyncAlt} spin />
          <p>Načítání...</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {/* Global Settings Panel */}
      {canManage && (
        <SettingsPanel>
          <SettingsTitle>
            <FontAwesomeIcon icon={faCog} />
            Globální nastavení pokladny
          </SettingsTitle>

          <SettingsRow>
            <SettingsLabel>
              <input
                type="checkbox"
                checked={usePrefixSetting}
                onChange={(e) => setUsePrefixSetting(e.target.checked)}
              />
              Použít prefixovaná čísla dokladů
            </SettingsLabel>
          </SettingsRow>

          <SettingsDescription>
            Pokud je zapnuto, čísla dokladů budou zobrazena ve formátu <strong>V599-001</strong> místo <strong>V001</strong>.
            <br />
            Prefix je tvořen z číselné řady VPD/PPD přiřazené uživateli.
          </SettingsDescription>

          <SaveButton onClick={handleSaveSettings} disabled={settingsSaving}>
            <FontAwesomeIcon icon={faSave} />
            {settingsSaving ? 'Ukládám...' : 'Uložit nastavení'}
          </SaveButton>
        </SettingsPanel>
      )}

      {/* Action Bar */}
      <ActionBar>
        <SearchWrapper>
          <SearchIcon icon={faSearch} />
          <SearchInput
            type="text"
            placeholder="Hledat v přiřazeních..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          {globalSearch && (
            <ClearButton onClick={() => setGlobalSearch('')} title="Vymazat vyhledávání">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchWrapper>

        {canManage && (
          <ActionButton onClick={handleAddNew} $primary>
            <FontAwesomeIcon icon={faPlus} />
            Přidat pokladnu
          </ActionButton>
        )}
      </ActionBar>

      {/* Table */}
      <TableWrapper>
        {table.getRowModel().rows.length === 0 ? (
          <EmptyState>
            <FontAwesomeIcon icon={faCalculator} />
            <p>Žádná přiřazení pokladen</p>
          </EmptyState>
        ) : (
          <>
            <Table>
              <Thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <TheadTr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <Th
                        key={header.id}
                        $sortable={header.column.getCanSort()}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted()] ?? null}
                      </Th>
                    ))}
                  </TheadTr>
                ))}
              </Thead>
              <Tbody>
                {table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    {/* Hlavní řádek s daty pokladny */}
                    <Tr>
                      {row.getVisibleCells().map(cell => (
                        <Td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Td>
                      ))}
                    </Tr>

                    {/* Expandable řádek se seznamem uživatelů */}
                    {row.getIsExpanded() && (
                      <Tr>
                        <Td colSpan={row.getVisibleCells().length} style={{ padding: 0 }}>
                          {renderSubComponent({ row })}
                        </Td>
                      </Tr>
                    )}
                  </React.Fragment>
                ))}
              </Tbody>
            </Table>

            {/* Pagination */}
            {table.getPageCount() > 0 && (
              <Pagination>
                <PageInfo>
                  Zobrazeno {Math.min(
                    pageIndex * pageSize + 1,
                    table.getFilteredRowModel().rows.length
                  )} - {Math.min(
                    (pageIndex + 1) * pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{' '}
                  z {table.getFilteredRowModel().rows.length} pokladen
                </PageInfo>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>Zobrazit:</span>
                  <PageSizeSelect
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setPageSize(newSize);
                      setPageIndex(0);
                    }}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="250">250</option>
                    <option value="500">500</option>
                  </PageSizeSelect>

                  <PaginationButton
                    onClick={() => setPageIndex(0)}
                    disabled={pageIndex === 0}
                  >
                    ««
                  </PaginationButton>
                  <PaginationButton
                    onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                    disabled={pageIndex === 0}
                  >
                    ‹
                  </PaginationButton>

                  <span style={{ margin: '0 0.5rem' }}>
                    Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
                  </span>

                  <PaginationButton
                    onClick={() => setPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1))}
                    disabled={pageIndex >= table.getPageCount() - 1}
                  >
                    ›
                  </PaginationButton>
                  <PaginationButton
                    onClick={() => setPageIndex(table.getPageCount() - 1)}
                    disabled={pageIndex >= table.getPageCount() - 1}
                  >
                    »»
                  </PaginationButton>
                </div>
              </Pagination>
            )}
          </>
        )}
      </TableWrapper>

      {/* Edit Cashbox Dialog - 🆕 NOVÝ: Editace pokladny + správa uživatelů */}
      <EditCashboxDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedAssignment(null);
        }}
        cashbox={selectedAssignment}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Assignment Dialog */}
      <DeleteAssignmentDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        onSuccess={handleDeleteSuccess}
      />

      {/* Create Cashbox Dialog */}
      <CreateCashboxDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* 🆕 Force Renumber Dialog (ADMIN) */}
      {assignmentToRenumber && (
        <ForceRenumberDialog
          isOpen={forceRenumberDialogOpen}
          onClose={() => {
            setForceRenumberDialogOpen(false);
            setAssignmentToRenumber(null);
          }}
          assignment={assignmentToRenumber}
          onConfirm={handleForceRenumberConfirm}
        />
      )}

      {/* Confirm Dialog for User Removal */}
      {confirmRemove.show && ReactDOM.createPortal(
        <>
          <ConfirmOverlay onClick={handleUnassignUserCancel} />
          <ConfirmDialog>
            <ConfirmTitle>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Odebrat uživatele?
            </ConfirmTitle>
            <ConfirmMessage>
              Opravdu chcete odebrat uživatele <strong>{confirmRemove.userName}</strong> z této pokladny?
            </ConfirmMessage>
            <ConfirmButtons>
              <ConfirmCancelButton onClick={handleUnassignUserCancel}>
                Zrušit
              </ConfirmCancelButton>
              <ConfirmDeleteButton onClick={handleUnassignUserConfirm}>
                <FontAwesomeIcon icon={faTrash} />
                Odebrat
              </ConfirmDeleteButton>
            </ConfirmButtons>
          </ConfirmDialog>
        </>,
        document.body
      )}
    </Container>
  );
};

export default CashbookTab;
