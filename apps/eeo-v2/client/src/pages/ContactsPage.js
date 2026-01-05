import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ProgressContext } from '../context/ProgressContext';
import { Search, Building2, User, Mail, Phone, MapPin, CreditCard, Briefcase, RefreshCw, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { fetchEmployees, fetchSupplierContacts } from '../services/api2auth';

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  min-height: calc(100vh - var(--app-fixed-offset, 120px));
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #3b82f6;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 1rem;
`;

const Highlight = styled.mark`
  background-color: #fef08a;
  color: inherit;
  padding: 0 2px;
  margin: 0;
  font-weight: inherit;
  font-size: inherit;
  line-height: inherit;
  font-family: inherit;
  display: inline;
  border-radius: 2px;
  white-space: inherit;
  text-align: inherit;
  vertical-align: baseline;
`;

const SearchSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
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

const FilterButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.$active ? '#3b82f6' : '#e2e8f0'};
  border-radius: 8px;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    border-color: #3b82f6;
    ${props => !props.$active && `
      background: #eff6ff;
      color: #3b82f6;
    `}
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
    ${props => props.$loading && `
      animation: ${spinAnimation} 1s linear infinite;
    `}
  }

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;

  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  min-width: 100%;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;
  background: white;

  &:hover {
    background-color: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeader = styled.th`
  padding: 0.5rem 0.75rem;
  text-align: center;
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
  font-size: 0.9rem;
`;

const FilterHeader = styled.th`
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const FilterInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.5rem;
    color: #9ca3af;
    width: 14px;
    height: 14px;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 0.4rem 2.2rem 0.4rem 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: #475569;
  font-size: 0.95rem;
  vertical-align: top;
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => props.$type === 'employee' ? '#dbeafe' : '#fef3c7'};
  color: ${props => props.$type === 'employee' ? '#1e40af' : '#92400e'};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ContactName = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
  font-size: 1rem;
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;

  svg {
    width: 14px;
    height: 14px;
    color: #94a3b8;
    flex-shrink: 0;
  }

  a {
    color: #3b82f6;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748b;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    animation: ${spinAnimation} 1s linear infinite;
    color: #3b82f6;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
    color: #cbd5e1;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #475569;
    font-size: 1.25rem;
  }

  p {
    margin: 0;
    color: #94a3b8;
  }
`;

// Pagination
const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
`;

const ContactsPage = () => {
  const { token, username, user_id, userDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { startProgress, stopProgress } = useContext(ProgressContext);

  const [employees, setEmployees] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load state from localStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('contactsPage_searchTerm') || '';
  });
  
  const [filter, setFilter] = useState(() => {
    return localStorage.getItem('contactsPage_filter') || 'all';
  });
  
  // Column filters
  const [columnFilters, setColumnFilters] = useState(() => {
    const saved = localStorage.getItem('contactsPage_columnFilters');
    return saved ? JSON.parse(saved) : {
      type: '',
      name: '',
      phone: '',
      email: '',
      location: '',
      info: ''
    };
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem('contactsPage_sortConfig');
    return saved ? JSON.parse(saved) : { key: null, direction: 'asc' };
  });

  // Pagination
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('contactsPage_pageSize');
    return saved ? parseInt(saved, 10) : 100;
  });
  
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('contactsPage_currentPage');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Load data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    
    if (!isRefresh && startProgress) {
      startProgress();
    }

    try {
      const [employeesResult, suppliersResult] = await Promise.all([
        fetchEmployees({ token, username }),
        fetchSupplierContacts({
          token,
          username,
          user_id,
          load_all: true
        })
      ]);

      if (Array.isArray(employeesResult)) {
        setEmployees(employeesResult);
      }

      if (Array.isArray(suppliersResult)) {
        // Filtrovat jen aktivní dodavatele
        let activeSuppliers = suppliersResult.filter(s => 
          s.aktivni === 1 || s.aktivni === '1' || s.aktivni === true
        );
        
        // Filtrování podle práv - admini a CONTACT_MANAGE vidí všechny
        const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
        );
        const hasSupplierManage = hasPermission && hasPermission('SUPPLIER_MANAGE');
        
        if (!isAdmin && !hasSupplierManage) {
          // Ostatní vidí jen globální, osobní a úsekove
          const currentUserDepartment = userDetail?.usek_zkr || userDetail?.department || userDetail?.usek || '';
          
          activeSuppliers = activeSuppliers.filter(sup => {
            // Globální (visibility_type = 'global' nebo user_id = 0)
            if (sup.visibility_type === 'global' || sup.user_id === 0 || sup.user_id === '0') {
              return true;
            }
            
            // Osobní (visibility_type = 'user' a user_id = current user)
            if (sup.visibility_type === 'user' && (sup.user_id === user_id || sup.user_id === String(user_id))) {
              return true;
            }
            
            // Úsekové (visibility_type = 'department' a usek_zkr obsahuje úsek uživatele)
            if (sup.visibility_type === 'department' && sup.usek_zkr && currentUserDepartment) {
              try {
                const depts = JSON.parse(sup.usek_zkr || '[]');
                if (Array.isArray(depts) && depts.includes(currentUserDepartment)) {
                  return true;
                }
              } catch (e) {
                // Pokud není JSON, zkus přímé porovnání
                if (sup.usek_zkr === currentUserDepartment) {
                  return true;
                }
              }
            }
            
            return false;
          });
        }
        
        setSuppliers(activeSuppliers);
      }
    } catch (error) {
      if (showToast) {
        showToast('Chyba při načítání kontaktů: ' + error.message, 'error');
      }
    } finally {
      if (!isRefresh && stopProgress) {
        stopProgress();
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('contactsPage_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('contactsPage_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('contactsPage_columnFilters', JSON.stringify(columnFilters));
  }, [columnFilters]);

  useEffect(() => {
    localStorage.setItem('contactsPage_sortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  useEffect(() => {
    localStorage.setItem('contactsPage_pageSize', pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    localStorage.setItem('contactsPage_currentPage', currentPage.toString());
  }, [currentPage]);

  // Normalize text for search
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Highlight search term in text - case insensitive without diacritics
  // Can accept single search term or array of search terms
  const highlightText = (text, search, additionalSearch = null) => {
    if (!text) return text;
    
    // Collect all search terms
    const searchTerms = [];
    if (search && search.trim()) searchTerms.push(search.trim());
    if (additionalSearch && additionalSearch.trim()) searchTerms.push(additionalSearch.trim());
    
    if (searchTerms.length === 0) return text;
    
    const textStr = String(text);
    const normalizedText = normalizeText(textStr);
    
    // Find all matches for all search terms
    const allMatches = [];
    
    searchTerms.forEach(term => {
      const normalizedSearch = normalizeText(term);
      if (!normalizedSearch) return;
      
      let searchIndex = 0;
      while (searchIndex < normalizedText.length) {
        const foundIndex = normalizedText.indexOf(normalizedSearch, searchIndex);
        if (foundIndex === -1) break;
        
        allMatches.push({
          start: foundIndex,
          end: foundIndex + normalizedSearch.length
        });
        searchIndex = foundIndex + normalizedSearch.length;
      }
    });
    
    if (allMatches.length === 0) return textStr;
    
    // Sort matches by start position and merge overlapping ones
    allMatches.sort((a, b) => a.start - b.start);
    const mergedMatches = [];
    let current = allMatches[0];
    
    for (let i = 1; i < allMatches.length; i++) {
      const next = allMatches[i];
      if (next.start <= current.end) {
        // Overlapping or adjacent - merge
        current.end = Math.max(current.end, next.end);
      } else {
        mergedMatches.push(current);
        current = next;
      }
    }
    mergedMatches.push(current);
    
    // Build result with highlights
    const parts = [];
    let lastIndex = 0;
    
    mergedMatches.forEach((match, idx) => {
      // Add text before highlight
      if (match.start > lastIndex) {
        parts.push(textStr.substring(lastIndex, match.start));
      }
      // Add highlighted text
      parts.push(
        <Highlight key={`h-${idx}`}>{textStr.substring(match.start, match.end)}</Highlight>
      );
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < textStr.length) {
      parts.push(textStr.substring(lastIndex));
    }
    
    return <span style={{ display: 'inline' }}>{parts}</span>;
  };

  // Combined and filtered contacts
  const filteredContacts = useMemo(() => {
    let combined = [];

    // Add employees
    if (filter === 'all' || filter === 'employees') {
      const employeeContacts = employees
        .filter(emp => emp.aktivni === 1 || emp.aktivni === '1' || emp.aktivni === true)
        .filter(emp => emp.viditelny_v_tel_seznamu === 1 || emp.viditelny_v_tel_seznamu === '1')
        .map(emp => ({
          type: 'employee',
          id: `emp-${emp.id || emp.ID}`,
          name: `${emp.titul_pred ? emp.titul_pred + ' ' : ''}${emp.prijmeni || ''} ${emp.jmeno || ''}${emp.titul_za ? ', ' + emp.titul_za : ''}`.trim(),
          sortName: `${emp.prijmeni || ''} ${emp.jmeno || ''}`.trim(),
          phone: emp.telefon || '',
          email: emp.email || '',
          location: emp.lokalita_nazev ? 
            `${emp.lokalita_nazev}${emp.usek_zkr ? ` (${emp.usek_zkr})` : ''}` : 
            (emp.usek_zkr ? `(${emp.usek_zkr})` : ''),
          info: emp.nazev_pozice || '',
          rawData: emp
        }));
      combined = [...combined, ...employeeContacts];
    }

    // Add suppliers
    if (filter === 'all' || filter === 'suppliers') {
      const supplierContacts = suppliers.map(sup => {
        // Určení typu viditelnosti podle stejné logiky jako v ContactManagement
        let visibilityLabel = '';
        
        // 1. Pokud existuje usek_zkr (a není prázdný), je to kontakt úseků
        if (sup.usek_zkr && sup.usek_zkr.trim() !== '' && sup.usek_zkr !== '[]') {
          visibilityLabel = 'U';
        }
        // 2. Pokud je user_id === 0, je to globální kontakt
        else if (sup.user_id === 0 || sup.user_id === '0') {
          visibilityLabel = 'G';
        }
        // 3. Pokud je user_id > 0, je to osobní kontakt
        else if (sup.user_id && sup.user_id > 0) {
          visibilityLabel = 'O';
        }

        return {
          type: 'supplier',
          id: `sup-${sup.id || sup.ID}`,
          name: sup.nazev || sup.name || '',
          contactPerson: sup.kontakt_jmeno || sup.zastoupeny || '',
          sortName: sup.nazev || sup.name || '',
          phone: sup.kontakt_telefon || sup.kontaktni_osoba_telefon || sup.telefon || '',
          email: sup.kontakt_email || sup.kontaktni_osoba_email || sup.email || '',
          location: sup.adresa || sup.adresa_ulice || '',
          info: sup.ico || sup.dic ? { ico: sup.ico, dic: sup.dic } : '',
          infoText: [
            sup.ico ? `IČO: ${sup.ico}` : '',
            sup.dic ? `DIČ: ${sup.dic}` : ''
          ].filter(Boolean).join(' '),
          visibilityLabel,
          rawData: sup
        };
      });
      combined = [...combined, ...supplierContacts];
    }

    // Apply global search filter
    if (searchTerm.trim()) {
      const searchNormalized = normalizeText(searchTerm);
      combined = combined.filter(contact => {
        const nameMatch = normalizeText(contact.name).includes(searchNormalized);
        const phoneMatch = contact.phone && contact.phone.includes(searchTerm);
        const emailMatch = normalizeText(contact.email).includes(searchNormalized);
        const locationMatch = normalizeText(contact.location).includes(searchNormalized);
        const searchText = contact.infoText || (typeof contact.info === 'string' ? contact.info : '');
        const infoMatch = normalizeText(searchText).includes(searchNormalized);
        const contactPersonMatch = contact.contactPerson && normalizeText(contact.contactPerson).includes(searchNormalized);
        
        return nameMatch || phoneMatch || emailMatch || locationMatch || infoMatch || contactPersonMatch;
      });
    }

    // Apply column filters
    if (columnFilters.type.trim()) {
      const typeNormalized = normalizeText(columnFilters.type);
      combined = combined.filter(contact => {
        const typeText = contact.type === 'employee' ? 'zaměstnanec' : 'dodavatel';
        return normalizeText(typeText).includes(typeNormalized);
      });
    }
    if (columnFilters.name.trim()) {
      const nameNormalized = normalizeText(columnFilters.name);
      combined = combined.filter(contact => {
        const nameMatch = normalizeText(contact.name).includes(nameNormalized);
        const contactPersonMatch = contact.contactPerson && normalizeText(contact.contactPerson).includes(nameNormalized);
        return nameMatch || contactPersonMatch;
      });
    }
    if (columnFilters.phone.trim()) {
      combined = combined.filter(contact => contact.phone && contact.phone.includes(columnFilters.phone));
    }
    if (columnFilters.email.trim()) {
      const emailNormalized = normalizeText(columnFilters.email);
      combined = combined.filter(contact => normalizeText(contact.email).includes(emailNormalized));
    }
    if (columnFilters.location.trim()) {
      const locationNormalized = normalizeText(columnFilters.location);
      combined = combined.filter(contact => normalizeText(contact.location).includes(locationNormalized));
    }
    if (columnFilters.info.trim()) {
      const infoNormalized = normalizeText(columnFilters.info);
      combined = combined.filter(contact => {
        const searchText = contact.infoText || (typeof contact.info === 'string' ? contact.info : '');
        return normalizeText(searchText).includes(infoNormalized);
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      combined.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'type') {
          aValue = a.type === 'employee' ? 'Zaměstnanec' : 'Dodavatel';
          bValue = b.type === 'employee' ? 'Zaměstnanec' : 'Dodavatel';
        } else if (sortConfig.key === 'name') {
          aValue = a.sortName;
          bValue = b.sortName;
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort: employees first, then suppliers, alphabetically by sortName
      combined.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'employee' ? -1 : 1;
        }
        return a.sortName.localeCompare(b.sortName, 'cs');
      });
    }

    return combined;
  }, [employees, suppliers, filter, searchTerm, columnFilters, sortConfig]);

  // Pagination
  const paginatedContacts = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize);

  // Sorting handler
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(0); // Reset to first page when sorting
  };

  // Filter change handler - reset to first page
  const handleFilterChange = (key, value) => {
    setColumnFilters({...columnFilters, [key]: value});
    setCurrentPage(0);
  };

  const employeeCount = employees
    .filter(e => e.aktivni === 1 || e.aktivni === '1' || e.aktivni === true)
    .filter(e => e.viditelny_v_tel_seznamu === 1 || e.viditelny_v_tel_seznamu === '1')
    .length;
  const supplierCount = suppliers.length;

  return (
    <PageContainer>
      <Header>
        <Title>
          <Briefcase />
          Kontakty
        </Title>
        <Subtitle>Přehled zaměstnanců a dodavatelů</Subtitle>
      </Header>

      <SearchSection>
        <SearchContainer>
          <SearchInputContainer>
            <Search />
            <SearchInput
              type="text"
              placeholder="Hledat podle jména, telefonu, emailu, lokality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <ClearButton onClick={() => setSearchTerm('')}>
                <X />
              </ClearButton>
            )}
          </SearchInputContainer>

          <FilterButtons>
            <FilterButton
              $active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              Vše
            </FilterButton>
            <FilterButton
              $active={filter === 'employees'}
              onClick={() => setFilter('employees')}
            >
              <User />
              Zaměstnanci
            </FilterButton>
            <FilterButton
              $active={filter === 'suppliers'}
              onClick={() => setFilter('suppliers')}
            >
              <Building2 />
              Dodavatelé
            </FilterButton>
          </FilterButtons>

          <RefreshButton
            onClick={() => loadData(true)}
            disabled={refreshing}
            $loading={refreshing}
          >
            <RefreshCw />
            Obnovit
          </RefreshButton>
        </SearchContainer>

        <StatsBar>
          <StatItem>
            <User size={16} />
            <span>Zaměstnanci: <strong>{employeeCount}</strong></span>
          </StatItem>
          <StatItem>
            <Building2 size={16} />
            <span>Dodavatelé: <strong>{supplierCount}</strong></span>
          </StatItem>
          <StatItem>
            <Search size={16} />
            <span>Nalezeno: <strong>{filteredContacts.length}</strong></span>
          </StatItem>
        </StatsBar>
      </SearchSection>

      <TableContainer>
          <Table>
            <TableHead>
              {/* First row - column names */}
              <tr>
                <TableHeader onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Typ
                    {sortConfig.key === 'type' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
                <TableHeader onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Název / Jméno
                    {sortConfig.key === 'name' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
                <TableHeader onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Telefon
                    {sortConfig.key === 'phone' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
                <TableHeader onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Email
                    {sortConfig.key === 'email' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
                <TableHeader onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Lokalita / Adresa
                    {sortConfig.key === 'location' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
                <TableHeader onClick={() => handleSort('info')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Doplňující informace
                    {sortConfig.key === 'info' && (
                      <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faChevronUp : faChevronDown} />
                    )}
                  </div>
                </TableHeader>
              </tr>
              
              {/* Second row - column filters */}
              <tr>
                <FilterHeader>
                  <FilterInputWrapper>
                    <Search />
                    <FilterInput
                      type="text"
                      placeholder="Hledat typ..."
                      value={columnFilters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    />
                    {columnFilters.type && (
                      <ClearButton onClick={() => handleFilterChange('type', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
                <FilterHeader>
                  <FilterInputWrapper>
                    <Search />
                    <FilterInput
                      type="text"
                      placeholder="Hledat jméno..."
                      value={columnFilters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                    />
                    {columnFilters.name && (
                      <ClearButton onClick={() => handleFilterChange('name', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
                <FilterHeader>
                  <FilterInputWrapper>
                    <Phone />
                    <FilterInput
                      type="text"
                      placeholder="Hledat telefon..."
                      value={columnFilters.phone}
                      onChange={(e) => handleFilterChange('phone', e.target.value)}
                    />
                    {columnFilters.phone && (
                      <ClearButton onClick={() => handleFilterChange('phone', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
                <FilterHeader>
                  <FilterInputWrapper>
                    <Mail />
                    <FilterInput
                      type="text"
                      placeholder="Hledat email..."
                      value={columnFilters.email}
                      onChange={(e) => handleFilterChange('email', e.target.value)}
                    />
                    {columnFilters.email && (
                      <ClearButton onClick={() => handleFilterChange('email', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
                <FilterHeader>
                  <FilterInputWrapper>
                    <MapPin />
                    <FilterInput
                      type="text"
                      placeholder="Hledat lokalitu..."
                      value={columnFilters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                    {columnFilters.location && (
                      <ClearButton onClick={() => handleFilterChange('location', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
                <FilterHeader>
                  <FilterInputWrapper>
                    <Search />
                    <FilterInput
                      type="text"
                      placeholder="Hledat info..."
                      value={columnFilters.info}
                      onChange={(e) => handleFilterChange('info', e.target.value)}
                    />
                    {columnFilters.info && (
                      <ClearButton onClick={() => handleFilterChange('info', '')}>
                        <X />
                      </ClearButton>
                    )}
                  </FilterInputWrapper>
                </FilterHeader>
              </tr>
            </TableHead>
            <tbody>
              {paginatedContacts.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <TypeBadge $type={contact.type}>
                      {contact.type === 'employee' ? (
                        <>
                          <User />
                          Zaměstnanec
                        </>
                      ) : (
                        <>
                          <Building2 />
                          Dodavatel{contact.visibilityLabel && ` (${contact.visibilityLabel})`}
                        </>
                      )}
                    </TypeBadge>
                  </TableCell>
                  <TableCell>
                    {contact.type === 'employee' ? (
                      <ContactName>{highlightText(contact.name, searchTerm, columnFilters.name)}</ContactName>
                    ) : (
                      <ContactInfo>
                        <ContactName>{highlightText(contact.name, searchTerm, columnFilters.name)}</ContactName>
                        {contact.contactPerson && (
                          <InfoRow style={{ marginTop: '0.25rem' }}>
                            <User size={14} />
                            {highlightText(contact.contactPerson, searchTerm, columnFilters.name)}
                          </InfoRow>
                        )}
                      </ContactInfo>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <InfoRow>
                        <Phone />
                        <a href={`tel:${contact.phone}`}>{highlightText(contact.phone, searchTerm, columnFilters.phone)}</a>
                      </InfoRow>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <InfoRow>
                        <Mail />
                        <a href={`mailto:${contact.email}`}>{highlightText(contact.email, searchTerm, columnFilters.email)}</a>
                      </InfoRow>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.location ? (
                      <InfoRow>
                        <MapPin />
                        {highlightText(contact.location, searchTerm, columnFilters.location)}
                      </InfoRow>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.info ? (
                      <ContactInfo>
                        {contact.type === 'employee' ? (
                          <InfoRow>
                            <Briefcase />
                            {highlightText(contact.info, searchTerm, columnFilters.info)}
                          </InfoRow>
                        ) : (
                          <>
                            {contact.info.ico && (
                              <InfoRow>
                                <CreditCard />
                                IČO: {highlightText(contact.info.ico, searchTerm, columnFilters.info)}
                              </InfoRow>
                            )}
                            {contact.info.dic && (
                              <InfoRow>
                                <CreditCard />
                                DIČ: {highlightText(contact.info.dic, searchTerm, columnFilters.info)}
                              </InfoRow>
                            )}
                          </>
                        )}
                      </ContactInfo>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>

          {/* Empty state - shown when no results */}
          {filteredContacts.length === 0 && (
            <EmptyState>
              <Search />
              <h3>Žádné kontakty</h3>
              <p>
                {searchTerm.trim() || Object.values(columnFilters).some(f => f.trim())
                  ? 'Zkuste změnit vyhledávací výraz nebo filtr.'
                  : 'V systému nejsou zatím žádné kontakty.'}
              </p>
            </EmptyState>
          )}

          {/* Pagination */}
          <PaginationContainer>
            <PaginationInfo>
              Zobrazeno {paginatedContacts.length} z {filteredContacts.length} kontaktů
              {filteredContacts.length !== (employeeCount + supplierCount) && (
                <span> (filtrováno z {employeeCount + supplierCount})</span>
              )}
            </PaginationInfo>

            <PaginationControls>
              <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
                Zobrazit:
              </span>
              <PageSizeSelect
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setPageSize(newSize);
                  setCurrentPage(0);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </PageSizeSelect>

              <PageButton
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
              >
                ««
              </PageButton>
              <PageButton
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                ‹
              </PageButton>

              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                Stránka {currentPage + 1} z {totalPages || 1}
              </span>

              <PageButton
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                ›
              </PageButton>
              <PageButton
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
              >
                »»
              </PageButton>
            </PaginationControls>
          </PaginationContainer>
      </TableContainer>
    </PageContainer>
  );
};

export default ContactsPage;
