import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { SmartTooltip } from '../styles/SmartTooltip';
import { Search, Plus, Edit, Trash2, X, FolderSearch, RotateCw, Building, User, Globe, Grid3X3, List, Mail, Phone, MapPin, CreditCard, CheckCircle, UserCheck } from 'lucide-react';
import { fetchSupplierContacts, deleteSupplier, fetchEmployees } from '../services/api2auth';
import ContactEditDialog from './ContactEditDialog';
import ContactDeleteDialog from './ContactDeleteDialog';

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const refreshSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled.div`
  width: 100%;
`;

const SearchSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
`;

const SearchTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;

  > svg:first-of-type {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
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
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 14px !important;
    height: 14px !important;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const FilterChips = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const FilterChip = styled.button`
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.active ? '#3b82f6' : '#e2e8f0'};
  background: ${props => props.active ? '#eff6ff' : 'white'};
  color: ${props => props.active ? '#1d4ed8' : '#64748b'};
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    border-color: #3b82f6;
    color: #1d4ed8;
  }
`;

// Status Filter Components
const StatusFilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const StatusFilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 2px solid ${props => {
    if (props.active && props.filterType === 'all') return '#3b82f6';
    if (props.active && props.filterType === 'active') return '#10b981';
    if (props.active && props.filterType === 'inactive') return '#ef4444';
    return '#e2e8f0';
  }};
  background: ${props => {
    if (props.active && props.filterType === 'all') return '#eff6ff';
    if (props.active && props.filterType === 'active') return '#d1fae5';
    if (props.active && props.filterType === 'inactive') return '#fee2e2';
    return 'white';
  }};
  color: ${props => {
    if (props.active && props.filterType === 'all') return '#1e40af';
    if (props.active && props.filterType === 'active') return '#065f46';
    if (props.active && props.filterType === 'inactive') return '#991b1b';
    return '#6b7280';
  }};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${props => {
      if (props.filterType === 'all') return '#eff6ff';
      if (props.filterType === 'active') return '#d1fae5';
      if (props.filterType === 'inactive') return '#fee2e2';
      return '#f8fafc';
    }};
    border-color: ${props => {
      if (props.filterType === 'all') return '#3b82f6';
      if (props.filterType === 'active') return '#10b981';
      if (props.filterType === 'inactive') return '#ef4444';
      return '#cbd5e1';
    }};
    transform: translateY(-1px);
  }

  svg {
    flex-shrink: 0;
  }
`;

const ResultsSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const ResultsHeader = styled.div`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ResultsInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #64748b;
  font-size: 0.875rem;

  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

const ResultsHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RefreshIconButton = styled.button`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
`;

const ViewToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#64748b'};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover:not(:disabled) {
    background: ${props => props.active ? '#2563eb' : '#f8fafc'};
    color: ${props => props.active ? 'white' : '#374151'};
  }
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(368px, 1fr)); /* 320px * 1.15 = 368px */
  gap: 1rem;
  padding: 1.5rem;
`;

const ContactCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  padding-bottom: 4rem; /* Extra padding for action buttons and tags at bottom */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &:hover .card-actions {
    opacity: 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  position: relative;
`;

const CardTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
  flex: 1;
  display: inline;
`;

const CardIdIndex = styled.sup`
  font-size: 0.65rem;
  font-weight: 500;
  color: #94a3b8;
  margin-left: 0.35rem;
  letter-spacing: 0.3px;
  position: relative;
  top: -3px;
`;

const CardStatusBadge = styled.div`
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  flex-shrink: 0;
`;

const CardActions = styled.div`
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem; /* Ensures space between contact info and bottom tags */
`;

const CardField = styled.div`
  display: flex;
  align-items: flex-start; /* Changed from center to flex-start for multiline */
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.875rem;
`;

const CardLabel = styled.span`
  font-weight: 500;
  color: #374151;
  min-width: 80px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0; /* Prevent label from shrinking */
`;

const CardValue = styled.span`
  color: #64748b;
  line-height: 1.5;
  word-break: break-word;
`;

const CardDivider = styled.hr`
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.75rem 0;
`;

const CardTags = styled.div`
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  display: flex;
  flex-direction: column-reverse; /* Reverse order so last item is at bottom */
  gap: 0.35rem;
  align-items: flex-start;
`;

const CardTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${props => props.color || '#f1f5f9'};
  color: ${props => props.textColor || '#374151'};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  gap: 1rem;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  ${css`animation: ${spinAnimation} 1s linear infinite;`}
`;

const ContactList = styled.div`
  /* No max-height or overflow - let content expand naturally */
`;

const ContactItem = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ContactHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ContactInfo = styled.div`
  flex: 1;
`;

const ContactName = styled.h5`
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.125rem;
  font-weight: 600;
`;

const ContactICO = styled.div`
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const ContactAddress = styled.div`
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const ContactMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const VisibilityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.type) {
      case 'global': return '#dcfce7';
      case 'user': return '#dbeafe';
      case 'department': return '#fef3c7';
      default: return '#f1f5f9';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'global': return '#166534';
      case 'user': return '#1e40af';
      case 'department': return '#92400e';
      default: return '#64748b';
    }
  }};
`;

const DepartmentTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.5rem;
`;

const CreatorTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.5rem;
`;

const ContactActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const ActionButton = styled.button`
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
  }

  &.primary {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
    }
  }

  &.danger {
    &:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #dc2626;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.25rem;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 1rem;
`;

const ContactManagement = ({ contactType, permissionLevel, userDetail, showToast }) => {
  const { token, username, user_id } = useContext(AuthContext);

  // Debug removed  // State for contacts
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('contactManagement_viewMode') || 'list';
  }); // 'list' nebo 'grid'

  // State pro uživatele (pro získání jmen podle user_id)
  const [employees, setEmployees] = useState([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);

  // Dialog state
  const [editDialog, setEditDialog] = useState({ open: false, contact: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, contact: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // User's department(s) - může být string nebo JSON array
  const currentUserDepartments = useMemo(() => {
    const usekZkr = userDetail?.usek_zkr || userDetail?.department || userDetail?.usek || '';
    
    if (!usekZkr) return [];
    
    // Pokud je to JSON array string, parsuj ho
    if (typeof usekZkr === 'string' && usekZkr.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(usekZkr);
        return Array.isArray(parsed) ? parsed : [usekZkr];
      } catch (e) {
        return [usekZkr];
      }
    }
    
    // Pokud je to array, vrať ho
    if (Array.isArray(usekZkr)) {
      return usekZkr;
    }
    
    // Jinak vrať jako single item array
    return [usekZkr];
  }, [userDetail]);

  // Search timeout ref
  const searchTimeoutRef = useRef(null);

  // Uložení viewMode do localStorage při změně
  useEffect(() => {
    localStorage.setItem('contactManagement_viewMode', viewMode);
  }, [viewMode]);

  // Debug helper - removed for production

  // Utility function to normalize text for search (remove diacritics, lowercase)
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  };

  // Render department tags for úseky contacts
  const renderDepartmentTags = (contact) => {
    let usekArray = [];

    try {
      // usek_zkr přichází jako string "[\"PTN\",\"EN\"]", potřebujeme ho parsovat
      if (typeof contact.usek_zkr === 'string' && contact.usek_zkr.trim() !== '') {
        usekArray = JSON.parse(contact.usek_zkr);
      } else if (Array.isArray(contact.usek_zkr)) {
        usekArray = contact.usek_zkr;
      }
    } catch (error) {
      return null;
    }

    if (!usekArray || !Array.isArray(usekArray) || usekArray.length === 0) {
      return null;
    }

    return usekArray.map((usek, index) => (
      <DepartmentTag key={index}>
        {usek}
      </DepartmentTag>
    ));
  };

  // Render creator info tag
  const renderCreatorTag = (contact) => {
    if (!contact.user_id || contact.user_id === '0' || contact.user_id === 0) {
      return (
        <CreatorTag>
          👤 Správce
        </CreatorTag>
      );
    }

    // Pokud máme informace o uživateli z kontaktu, zobrazíme je
    if (contact.creator_name || contact.user_name) {
      return (
        <CreatorTag>
          👤 {contact.creator_name || contact.user_name}
        </CreatorTag>
      );
    }

    // Najdeme uživatele v načtených zaměstnancích podle user_id
    const userId = String(contact.user_id);
    const employee = employees.find(emp =>
      String(emp.id) === userId ||
      String(emp.user_id) === userId ||
      String(emp.ID) === userId
    );

    if (employee) {
      const titul_pred_str = employee.titul_pred ? employee.titul_pred + ' ' : '';
      const titul_za_str = employee.titul_za ? ', ' + employee.titul_za : '';
      const fullName = `${titul_pred_str}${employee.jmeno || ''} ${employee.prijmeni || ''}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      if (fullName) {
        return (
          <CreatorTag>
            👤 {fullName}
          </CreatorTag>
        );
      }
    }

    // Fallback - zobrazit pouze user_id
    return (
      <CreatorTag>
        👤 ID: {contact.user_id}
      </CreatorTag>
    );
  };

  // Render department tags pro card view
  const renderDepartmentTagsForCard = (contact) => {
    let usekArray = [];

    try {
      if (typeof contact.usek_zkr === 'string' && contact.usek_zkr.trim() !== '') {
        usekArray = JSON.parse(contact.usek_zkr);
      } else if (Array.isArray(contact.usek_zkr)) {
        usekArray = contact.usek_zkr;
      }
    } catch (error) {
      return null;
    }

    if (!usekArray || !Array.isArray(usekArray) || usekArray.length === 0) {
      return null;
    }

    return usekArray.map((usek, index) => (
      <CardTag key={index} color="#dbeafe" textColor="#1e40af">
        🏢 {usek}
      </CardTag>
    ));
  };

  // Render creator tag pro card view
  const renderCreatorTagForCard = (contact) => {
    if (!contact.user_id || contact.user_id === '0' || contact.user_id === 0) {
      return (
        <CardTag color="#dcfce7" textColor="#166534">
          👤 Správce
        </CardTag>
      );
    }

    if (contact.creator_name || contact.user_name) {
      return (
        <CardTag color="#dcfce7" textColor="#166534">
          👤 {contact.creator_name || contact.user_name}
        </CardTag>
      );
    }

    const userId = String(contact.user_id);
    const employee = employees.find(emp =>
      String(emp.id) === userId ||
      String(emp.user_id) === userId ||
      String(emp.ID) === userId
    );

    if (employee) {
      const titul_pred_str = employee.titul_pred ? employee.titul_pred + ' ' : '';
      const titul_za_str = employee.titul_za ? ', ' + employee.titul_za : '';
      const fullName = `${titul_pred_str}${employee.jmeno || ''} ${employee.prijmeni || ''}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      if (fullName) {
        return (
          <CardTag color="#dcfce7" textColor="#166534">
            👤 {fullName}
          </CardTag>
        );
      }
    }

    return (
      <CardTag color="#dcfce7" textColor="#166534">
        👤 ID: {contact.user_id}
      </CardTag>
    );
  };

  // Load employees for user name resolution - optimized with useCallback
  const loadEmployees = useCallback(async () => {
    if (employeesLoaded) return;

    try {
      const result = await fetchEmployees({ token, username });
      if (Array.isArray(result)) {
        setEmployees(result);
        setEmployeesLoaded(true);
      }
    } catch (error) {
    }
  }, [token, username, employeesLoaded]);

  // Load contacts - optimized with useCallback
  const loadContacts = useCallback(async () => {
    if (contactType !== 'suppliers') return;

    setLoading(true);
    try {
      const result = await fetchSupplierContacts({
        token: token,
        username: username,
        user_id: user_id,
        usek_zkr: currentUserDepartments[0] || undefined,
        load_all: permissionLevel === 'MANAGE' // Load all contacts for CONTACT_MANAGE users
      });

      if (Array.isArray(result)) {
        setContacts(result);
        setFilteredContacts(result);
      } else {
        setContacts([]);
        setFilteredContacts([]);
      }
    } catch (error) {
      if (showToast) {
        showToast('Chyba při načítání kontaktů: ' + error.message, 'error');
      }
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setLoading(false);
    }
  }, [contactType, token, username, user_id, currentUserDepartments, permissionLevel, showToast]);

  // Filter and search contacts
  const filterContacts = (searchValue, filterValue, statusFilterValue) => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchValue.trim()) {
      const searchNormalized = normalizeText(searchValue.trim());
      const isNumeric = /^\d+$/.test(searchValue.trim());

      filtered = filtered.filter(contact => {
        if (isNumeric) {
          // Search by ICO
          return contact.ico && contact.ico.includes(searchValue.trim());
        } else {
          // Search by name
          const contactName = normalizeText(contact.nazev || contact.name || '');
          return contactName.includes(searchNormalized);
        }
      });
    }

    // Apply visibility filter
    if (filterValue !== 'all') {
      filtered = filtered.filter(contact => {
        const visibilityType = getContactVisibilityType(contact);
        return visibilityType === filterValue;
      });
    }

    // Apply status filter (aktivni)
    // Podporujeme: 1, "1", true jako aktivní; 0, "0", false jako neaktivní
    if (statusFilterValue === 'active') {
      filtered = filtered.filter(contact =>
        contact.aktivni === 1 ||
        contact.aktivni === '1' ||
        contact.aktivni === true
      );
    } else if (statusFilterValue === 'inactive') {
      filtered = filtered.filter(contact =>
        contact.aktivni === 0 ||
        contact.aktivni === '0' ||
        contact.aktivni === false
      );
    }
    // 'all' means no filtering by status

    setFilteredContacts(filtered);
  };

  // Handle search change with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      filterContacts(value, activeFilter, statusFilter);
    }, 300);
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterContacts(searchTerm, filter, statusFilter);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    filterContacts(searchTerm, activeFilter, status);
  };

  // Determine if user can edit/delete contact
  const canEditContact = (contact) => {
    if (permissionLevel === 'MANAGE') return true;

    if (permissionLevel === 'EDIT') {
      const visibilityType = getContactVisibilityType(contact);

      // Může editovat své osobní kontakty
      if (visibilityType === 'user' && contact.user_id === user_id) {
        return true;
      }

      // Může editovat kontakty úseků, pokud má společný úsek
      if (visibilityType === 'department' && contact.usek_zkr && currentUserDepartments.length > 0) {
        try {
          const contactDepts = JSON.parse(contact.usek_zkr || '[]');
          if (Array.isArray(contactDepts)) {
            // Kontrola, zda má uživatel alespoň jeden společný úsek s kontaktem
            const hasCommonDepartment = contactDepts.some(dept => currentUserDepartments.includes(dept));
            if (hasCommonDepartment) {
              return true;
            }
          }
        } catch (e) {
          // Pokud není JSON array, zkusit direct string match s kterýmkoliv úsekem uživatele
          if (currentUserDepartments.includes(contact.usek_zkr)) {
            return true;
          }
        }
      }

      return false;
    }

    return false;
  };

  // Get visibility type for contact
  const getContactVisibilityType = (contact) => {
    if (!contact) return 'user';

    // Pokud existuje něco v usek_zkr, je to kontakt úseků (má prioritu)
    if (contact.usek_zkr && contact.usek_zkr.trim() !== '' && contact.usek_zkr !== '[]') {
      return 'department';
    }

    // Pokud je user_id === 0, je to globální kontakt
    if (contact.user_id === 0 || contact.user_id === '0') {
      return 'global';
    }

    // Pokud je user_id > 0, je to osobní kontakt
    if (contact.user_id && contact.user_id > 0) {
      return 'user';
    }

    // Default fallback
    return 'user';
  };

  // Get visibility label
  const getVisibilityLabel = (type) => {
    switch (type) {
      case 'global': return 'Globální kontakt';
      case 'user': return 'Osobní kontakt';
      case 'department': return 'Kontakty úseku';
      default: return 'Neznámý';
    }
  };

  // Get visibility icon
  const getVisibilityIcon = (type) => {
    switch (type) {
      case 'global': return <Globe size={12} />;
      case 'user': return <User size={12} />;
      case 'department': return <Building size={12} />;
      default: return null;
    }
  };

  // Load employees and contacts on component mount
  useEffect(() => {
    loadEmployees();
    loadContacts();
  }, [loadEmployees, loadContacts]);

  // Memoized filtered contacts list
  const filteredContactsList = useMemo(() => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchNormalized = normalizeText(searchTerm.trim());
      const isNumeric = /^\d+$/.test(searchTerm.trim());

      filtered = filtered.filter(contact => {
        if (isNumeric) {
          // Search by ICO
          return contact.ico && contact.ico.includes(searchTerm.trim());
        } else {
          // Search by name
          const contactName = normalizeText(contact.nazev || contact.name || '');
          return contactName.includes(searchNormalized);
        }
      });
    }

    // Apply visibility filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(contact => {
        const visibilityType = getContactVisibilityType(contact);
        return visibilityType === activeFilter;
      });
    }

    // Apply status filter (aktivni)
    if (statusFilter === 'active') {
      filtered = filtered.filter(contact =>
        contact.aktivni === 1 ||
        contact.aktivni === '1' ||
        contact.aktivni === true
      );
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(contact =>
        contact.aktivni === 0 ||
        contact.aktivni === '0' ||
        contact.aktivni === false
      );
    }

    return filtered;
  }, [contacts, searchTerm, activeFilter, statusFilter]);

  // Count active and inactive contacts from filtered list
  const activeContacts = useMemo(() => {
    return filteredContactsList.filter(contact =>
      contact.aktivni === 1 ||
      contact.aktivni === '1' ||
      contact.aktivni === true
    );
  }, [filteredContactsList]);

  const inactiveContacts = useMemo(() => {
    return filteredContactsList.filter(contact =>
      contact.aktivni === 0 ||
      contact.aktivni === '0' ||
      contact.aktivni === false
    );
  }, [filteredContactsList]);

  // Update filteredContacts when filteredContactsList changes
  useEffect(() => {
    setFilteredContacts(filteredContactsList);
  }, [filteredContactsList]);

  // Handle dialog actions
  const handleAddContact = () => {
    setEditDialog({ open: true, contact: null });
  };

  const handleEditContact = (contact) => {
    setEditDialog({ open: true, contact });
  };

  const handleDeleteContact = (contact) => {
    setDeleteDialog({ open: true, contact });
  };

  const handleVerifyInAres = async (contact) => {
    if (!contact.ico) {
      if (showToast) {
        showToast('Kontakt nemá zadané IČO', 'error');
      }
      return;
    }

    try {
      // Use direct ARES API call (same as OrderFormComponent)
      const url = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${contact.ico}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const aresName = data.obchodniJmeno || '';

        if (aresName) {
          if (showToast) {
            showToast(`ARES ověření: ${aresName}`, 'success');
          }
        } else {
          if (showToast) {
            showToast('V ARES nebyla nalezena žádná data', 'warning');
          }
        }
      } else {
        if (showToast) {
          showToast('V ARES nebyla nalezena žádná data', 'warning');
        }
      }
    } catch (error) {
      if (showToast) {
        showToast('Chyba při ověřování v ARES: ' + error.message, 'error');
      }
    }
  };

  const handleSaveContact = (savedContact) => {
    // Reload contacts after save
    loadContacts();
  };

  const handleConfirmDelete = async (contact) => {
    setDeleteLoading(true);

    if (!contact.id) {
      if (showToast) {
        showToast('Kontakt nemá databázové ID - nelze smazat', 'error');
      }
      setDeleteLoading(false);
      return;
    }

    try {
      await deleteSupplier({
        id: contact.id,
        token,
        username
      });

      if (showToast) {
        showToast('Kontakt byl úspěšně smazán', 'success');
      }

      // Reload contacts after delete
      loadContacts();
      setDeleteDialog({ open: false, contact: null });
    } catch (error) {
      if (showToast) {
        showToast('Chyba při mazání kontaktu: ' + error.message, 'error');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const canAddContact = permissionLevel !== 'READ';

  return (
    <Container>
      <SearchSection>
        <SearchHeader>
          <SearchTitle>
            <FolderSearch size={20} style={{ marginRight: '0.5rem' }} />
            Vyhledávání a správa kontaktů
          </SearchTitle>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {canAddContact && (
              <SmartTooltip text="Vytvořit nový kontakt" icon="success" preferredPosition="bottom">
                <AddButton onClick={handleAddContact}>
                  <Plus size={16} />
                  Přidat kontakt
                </AddButton>
              </SmartTooltip>
            )}
          </div>
        </SearchHeader>

        <SearchContainer>
          <SearchInputContainer>
            <Search size={16} />
            <SearchInput
              type="text"
              placeholder="Vyhledejte podle názvu nebo IČO..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <ClearButton onClick={() => setSearchTerm('')} title="Vymazat">
                <X size={14} />
              </ClearButton>
            )}
          </SearchInputContainer>

          <StatusFilterContainer>
            <SmartTooltip text="Zobrazit všechny kontakty" icon="info" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'all'}
                filterType="all"
                onClick={() => handleStatusFilterChange('all')}
              >
                <Globe size={16} />
                Všichni
              </StatusFilterButton>
            </SmartTooltip>

            <SmartTooltip text="Zobrazit pouze aktivní kontakty" icon="success" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'active'}
                filterType="active"
                onClick={() => handleStatusFilterChange('active')}
              >
                <CheckCircle size={16} />
                Aktivní
              </StatusFilterButton>
            </SmartTooltip>

            <SmartTooltip text="Zobrazit pouze neaktivní kontakty" icon="warning" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'inactive'}
                filterType="inactive"
                onClick={() => handleStatusFilterChange('inactive')}
              >
                <X size={16} />
                Neaktivní
              </StatusFilterButton>
            </SmartTooltip>
          </StatusFilterContainer>
        </SearchContainer>

        <FilterChips>
          <FilterChip
            active={activeFilter === 'all'}
            onClick={() => handleFilterChange('all')}
          >
            Všechny kontakty
          </FilterChip>
          <FilterChip
            active={activeFilter === 'global'}
            onClick={() => handleFilterChange('global')}
          >
            <Globe size={14} />
            Globální kontakt
          </FilterChip>
          <FilterChip
            active={activeFilter === 'user'}
            onClick={() => handleFilterChange('user')}
          >
            <User size={14} />
            Osobní kontakt
          </FilterChip>
          <FilterChip
            active={activeFilter === 'department'}
            onClick={() => handleFilterChange('department')}
          >
            <Building size={14} />
            Kontakty úseku
          </FilterChip>
        </FilterChips>
      </SearchSection>

      <ResultsSection>
        <ResultsHeader>
          <ResultsHeaderLeft>
            <SmartTooltip text="Obnovit seznam dodavatelů z databáze" icon="info" preferredPosition="bottom">
              <RefreshIconButton onClick={loadContacts}>
                <RotateCw size={16} />
              </RefreshIconButton>
            </SmartTooltip>
            <ResultsInfo>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={16} />
                <span>
                  Zobrazeno: <strong>{filteredContacts.length}</strong> z celkem <strong>{contacts.length}</strong> dodavatelů |
                  Aktivní: <strong>{activeContacts.length}</strong> |
                  Neaktivní: <strong>{inactiveContacts.length}</strong>
                </span>
              </div>
            </ResultsInfo>
          </ResultsHeaderLeft>

          <ViewToggle>
            <SmartTooltip text="Zobrazit jako seznam" icon="info" preferredPosition="bottom">
              <ViewToggleButton
                active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </ViewToggleButton>
            </SmartTooltip>

            <SmartTooltip text="Zobrazit jako dlaždice" icon="info" preferredPosition="bottom">
              <ViewToggleButton
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={16} />
              </ViewToggleButton>
            </SmartTooltip>
          </ViewToggle>
        </ResultsHeader>

        {loading ? (
          <LoadingContainer>
            <LoadingSpinner />
            <span>Načítám kontakty...</span>
          </LoadingContainer>
        ) : filteredContacts.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>📭</EmptyStateIcon>
            <EmptyStateTitle>
              {contacts.length === 0 ? 'Žádné kontakty' : 'Nenalezeny žádné výsledky'}
            </EmptyStateTitle>
            <EmptyStateText>
              {contacts.length === 0
                ? 'V adresáři zatím nejsou žádné kontakty.'
                : 'Zkuste upravit vyhledávací kritéria.'
              }
            </EmptyStateText>
          </EmptyState>
        ) : viewMode === 'list' ? (
          <ContactList>
            {filteredContacts.map((contact, index) => {
              const visibilityType = getContactVisibilityType(contact);
              const canEdit = canEditContact(contact);

              return (
                <ContactItem key={contact.id || index}>
                  <ContactHeader>
                    <ContactInfo>
                      {/* Název a Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ContactName>{contact.nazev || contact.name}</ContactName>
                        {(contact.aktivni === 1 || contact.aktivni === '1' || contact.aktivni === true) ? (
                          <VisibilityBadge style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                            <CheckCircle size={12} />
                            Aktivní
                          </VisibilityBadge>
                        ) : (
                          <VisibilityBadge style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                            <X size={12} />
                            Neaktivní
                          </VisibilityBadge>
                        )}
                      </div>

                      {/* Adresa */}
                      {contact.adresa && (
                        <ContactAddress>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={14} />
                            {contact.adresa}
                          </div>
                        </ContactAddress>
                      )}

                      {/* IČO a DIČ na jednom řádku */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', margin: '0.25rem 0' }}>
                        <ContactICO>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={14} />
                            IČO: {contact.ico}
                          </div>
                        </ContactICO>
                        {contact.dic && (
                          <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={14} />
                            DIČ: {contact.dic}
                          </span>
                        )}
                      </div>

                      {/* Zastoupený - zobrazíme vždy pokud existuje */}
                      {contact.zastoupeny && (
                        <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', fontStyle: 'italic', color: '#64748b' }}>
                          Zastoupen: {contact.zastoupeny}
                        </div>
                      )}

                      {/* Kontaktní osoba - jméno, email, telefon na jednom řádku */}
                      {(contact.kontakt_jmeno || contact.kontakt_telefon || contact.kontakt_email) && (
                        <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={14} />
                            Kontaktní osoba:
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {contact.kontakt_jmeno && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {contact.kontakt_jmeno}
                              </span>
                            )}
                            {contact.kontakt_email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Mail size={14} />
                                {contact.kontakt_email}
                              </span>
                            )}
                            {contact.kontakt_telefon && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Phone size={14} />
                                {contact.kontakt_telefon}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tagy - mírně oddělené jako poslední řádek */}
                      <ContactMeta style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <VisibilityBadge type={visibilityType}>
                          {getVisibilityIcon(visibilityType)}
                          {getVisibilityLabel(visibilityType)}
                        </VisibilityBadge>
                        {/* Zobrazení tagů úseků pro department kontakty */}
                        {visibilityType === 'department' && renderDepartmentTags(contact)}
                        {/* Informace o tvůrci kontaktu */}
                        {renderCreatorTag(contact)}
                      </ContactMeta>
                    </ContactInfo>

                    <ContactActions>
                      {canEdit && (
                        <>
                          <SmartTooltip text="Upravit kontakt" icon="info" preferredPosition="bottom">
                            <ActionButton
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit size={16} />
                            </ActionButton>
                          </SmartTooltip>
                          <SmartTooltip text="Ověřit aktuální data v ARES (force refresh)" icon="warning" preferredPosition="bottom">
                            <ActionButton
                              onClick={() => handleVerifyInAres(contact)}
                            >
                              <RotateCw size={16} />
                            </ActionButton>
                          </SmartTooltip>
                          <SmartTooltip text="Smazat kontakt" icon="error" preferredPosition="bottom">
                            <ActionButton
                              className="danger"
                              onClick={() => handleDeleteContact(contact)}
                            >
                              <Trash2 size={16} />
                            </ActionButton>
                          </SmartTooltip>
                        </>
                      )}
                    </ContactActions>
                  </ContactHeader>
                </ContactItem>
              );
            })}
          </ContactList>
        ) : (
          <ContactGrid>
            {filteredContacts.map((contact, index) => {
              const visibilityType = getContactVisibilityType(contact);
              const canEdit = canEditContact(contact);

              return (
                <ContactCard key={contact.id || index}>
                  <CardHeader>
                    <CardTitle>
                      {contact.nazev || contact.name}
                      <CardIdIndex>#ID {contact.id}</CardIdIndex>
                    </CardTitle>

                    {/* Status Badge - vpravo nahoře */}
                    {(contact.aktivni === 1 || contact.aktivni === '1' || contact.aktivni === true) ? (
                      <CardStatusBadge style={{ background: '#d1fae5', color: '#065f46' }}>
                        <CheckCircle size={12} />
                        Aktivní
                      </CardStatusBadge>
                    ) : (
                      <CardStatusBadge style={{ background: '#fee2e2', color: '#991b1b' }}>
                        <X size={12} />
                        Neaktivní
                      </CardStatusBadge>
                    )}
                  </CardHeader>

                  <CardInfo>
                    {contact.adresa && (
                      <CardField>
                        <CardLabel><MapPin size={14} />Adresa:</CardLabel>
                        <CardValue>{contact.adresa}</CardValue>
                      </CardField>
                    )}

                    <CardField>
                      <CardLabel><CreditCard size={14} />IČO:</CardLabel>
                      <CardValue>{contact.ico}</CardValue>
                    </CardField>

                    {contact.dic && (
                      <CardField>
                        <CardLabel><CreditCard size={14} />DIČ:</CardLabel>
                        <CardValue>{contact.dic}</CardValue>
                      </CardField>
                    )}

                    <CardDivider />

                    {contact.zastoupeny && (
                      <CardField>
                        <CardLabel><UserCheck size={16} />Zastoupen:</CardLabel>
                        <CardValue>{contact.zastoupeny}</CardValue>
                      </CardField>
                    )}

                    {contact.kontakt_jmeno && (
                      <CardField>
                        <CardLabel><User size={14} />Kontakt:</CardLabel>
                        <CardValue>{contact.kontakt_jmeno}</CardValue>
                      </CardField>
                    )}

                    {contact.kontakt_email && (
                      <CardField>
                        <CardLabel><Mail size={14} />Email:</CardLabel>
                        <CardValue>{contact.kontakt_email}</CardValue>
                      </CardField>
                    )}

                    {contact.kontakt_telefon && (
                      <CardField>
                        <CardLabel><Phone size={14} />Telefon:</CardLabel>
                        <CardValue>{contact.kontakt_telefon}</CardValue>
                      </CardField>
                    )}
                  </CardInfo>

                  <CardTags>
                    <CardTag
                      color={visibilityType === 'global' ? '#dcfce7' : visibilityType === 'department' ? '#dbeafe' : '#f3f4f6'}
                      textColor={visibilityType === 'global' ? '#166534' : visibilityType === 'department' ? '#1e40af' : '#374151'}
                    >
                      {getVisibilityIcon(visibilityType)}
                      {getVisibilityLabel(visibilityType)}
                    </CardTag>
                    {visibilityType === 'department' && renderDepartmentTagsForCard(contact)}
                    {renderCreatorTagForCard(contact)}
                  </CardTags>

                  {/* Action buttons - pravý dolní roh */}
                  {canEdit && (
                    <CardActions className="card-actions">
                      <SmartTooltip text="Upravit kontakt" icon="info" preferredPosition="bottom">
                        <ActionButton
                          onClick={() => handleEditContact(contact)}
                        >
                          <Edit size={14} />
                        </ActionButton>
                      </SmartTooltip>
                      <SmartTooltip text="Ověřit aktuální data v ARES (force refresh)" icon="warning" preferredPosition="bottom">
                        <ActionButton
                          onClick={() => handleVerifyInAres(contact)}
                        >
                          <RotateCw size={14} />
                        </ActionButton>
                      </SmartTooltip>
                      <SmartTooltip text="Smazat kontakt" icon="error" preferredPosition="bottom">
                        <ActionButton
                          className="danger"
                          onClick={() => handleDeleteContact(contact)}
                        >
                          <Trash2 size={14} />
                        </ActionButton>
                      </SmartTooltip>
                    </CardActions>
                  )}
                </ContactCard>
              );
            })}
          </ContactGrid>
        )}
      </ResultsSection>

      {/* Edit Dialog */}
      <ContactEditDialog
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false, contact: null })}
        contact={editDialog.contact}
        permissionLevel={permissionLevel}
        userDetail={userDetail}
        showToast={showToast}
        onSave={handleSaveContact}
      />

      {/* Delete Dialog */}
      <ContactDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, contact: null })}
        contact={deleteDialog.contact}
        onConfirm={handleConfirmDelete}
        loading={!!deleteLoading}
      />
    </Container>
  );
};

export default React.memo(ContactManagement);