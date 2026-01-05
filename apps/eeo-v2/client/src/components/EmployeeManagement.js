import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { SmartTooltip } from '../styles/SmartTooltip';
import { fetchEmployees, toggleEmployeeVisibility } from '../services/api2auth';
import { Search, Users, List, Grid3X3, RotateCw, FolderSearch, CheckCircle, XCircle, Mail, Phone, Building, MapPin, Calendar, X, Eye, EyeOff } from 'lucide-react';

const refreshSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled.div`
  max-width: 100%;
`;

const ButtonGroup = styled.div`
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: #6b7280;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #374151;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }

  svg {
    ${props => props.$loading ? css`animation: ${refreshSpin} 1s linear infinite;` : 'animation: none;'}
  }
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
  justify-content: space-between;
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
  display: flex;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInputContainer = styled.div`
  flex: 1;
  min-width: 300px;
  position: relative;

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

// View Toggle Components
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
  justify-content: center;
  padding: 0.5rem;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#64748b'};
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f8fafc'};
    color: ${props => props.active ? 'white' : '#374151'};
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

const ResultsHeader = styled.div`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

const ResultsHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// Grid Layout
const EmployeeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(403px, 1fr)); /* 350px * 1.15 = 402.5px ≈ 403px */
  gap: 1.5rem;
`;

// List Layout
const EmployeeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmployeeListItem = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
  }
`;

const ListEmployeeInfo = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 100px;
  gap: 1rem;
  align-items: center;
`;

const ListEmployeeName = styled.div`
  font-weight: 600;
  color: #1e293b;
  display: inline;
`;

const ListEmployeePosition = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
`;

const ListEmployeeContact = styled.div`
  color: #4b5563;
  font-size: 0.875rem;
`;

const ListEmployeeDepartment = styled.div`
  color: #4b5563;
  font-size: 0.875rem;
`;

const ListStatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.active ? '#dcfce7' : '#fef2f2'};
  color: ${props => props.active ? '#166534' : '#dc2626'};
  white-space: nowrap;
`;

const VisibilityToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid ${props => props.$visible ? '#10b981' : '#e5e7eb'};
  background: ${props => props.$visible ? '#d1fae5' : '#f3f4f6'};
  color: ${props => props.$visible ? '#065f46' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  
  &:hover:not(:disabled) {
    background: ${props => props.$visible ? '#a7f3d0' : '#e5e7eb'};
    border-color: ${props => props.$visible ? '#059669' : '#d1d5db'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
  }
`;

const EmployeeCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const EmployeeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const EmployeeInfo = styled.div`
  flex: 1;
`;

const EmployeeName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  display: inline;
`;

const EmployeeIdIndex = styled.sup`
  font-size: 0.65rem;
  font-weight: 500;
  color: #94a3b8;
  margin-left: 0.35rem;
  letter-spacing: 0.3px;
  position: relative;
  top: -3px;
`;

const EmployeePosition = styled.p`
  margin: 0 0 0.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.active ? '#dcfce7' : '#fef2f2'};
  color: ${props => props.active ? '#166534' : '#dc2626'};
`;

const VisibilityToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border-radius: 6px;
  border: 1px solid ${props => props.visible ? '#10b981' : '#e5e7eb'};
  background: ${props => props.visible ? '#d1fae5' : '#f9fafb'};
  color: ${props => props.visible ? '#059669' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: ${props => props.visible ? '#a7f3d0' : '#f3f4f6'};
    border-color: ${props => props.visible ? '#059669' : '#d1d5db'};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ContactDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
`;

const ContactIcon = styled.div`
  color: #6b7280;
  flex-shrink: 0;
`;

const ContactText = styled.span`
  flex: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #374151;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 2rem;
`;

const EmployeeManagement = ({ permissionLevel, userDetail, showToast }) => {
  const { user, token } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('employeeManagement_viewMode') || 'grid';
  }); // 'list' nebo 'grid'

  // Uložení viewMode do localStorage při změně
  useEffect(() => {
    localStorage.setItem('employeeManagement_viewMode', viewMode);
  }, [viewMode]);

  // Helper function to check if employee is active
  // Supports: 1, "1", true as active; 0, "0", false as inactive
  const isEmployeeActive = (employee) => {
    return employee.aktivni === 1 ||
           employee.aktivni === '1' ||
           employee.aktivni === true;
  };

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter employees based on search term and status filter
  // Use useMemo to avoid unnecessary re-filters
  const filteredEmployeesList = useMemo(() => {
    let filtered = [...employees];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.full_name.toLowerCase().includes(term) ||
        emp.jmeno.toLowerCase().includes(term) ||
        emp.prijmeni.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.telefon.includes(term) ||
        emp.nazev_pozice.toLowerCase().includes(term) ||
        emp.usek_nazev.toLowerCase().includes(term) ||
        emp.lokalita_nazev.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(emp => isEmployeeActive(emp));
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(emp => !isEmployeeActive(emp));
    }
    // 'all' means no status filtering

    return filtered;
  }, [searchTerm, statusFilter, employees]);

  // Update filteredEmployees when filteredEmployeesList changes
  useEffect(() => {
    setFilteredEmployees(filteredEmployeesList);
  }, [filteredEmployeesList]);

  const loadEmployees = async () => {
    if (!user?.username || !token) {
      setError('Nejste přihlášen');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await fetchEmployees({ token, username: user.username });
      setEmployees(data);
    } catch (err) {
      setError(err.message || 'Chyba při načítání zaměstnanců');
      showToast?.(err.message || 'Chyba při načítání zaměstnanců', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (employee) => {
    if (!user?.username || !token) {
      showToast?.('Nejste přihlášen', { type: 'error' });
      return;
    }

    // Check permission - ADMIN/SUPERADMIN or PHONEBOOK_MANAGE
    const isSuperAdmin = userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN');
    const isAdmin = userDetail?.roles?.some(role => role.kod_role === 'ADMINISTRATOR');
    const hasPermission = userDetail?.permissions?.includes('PHONEBOOK_MANAGE');
    
    if (!isSuperAdmin && !isAdmin && !hasPermission) {
      showToast?.('Nemáte oprávnění změnit viditelnost zaměstnance', { type: 'error' });
      return;
    }

    const currentVisibility = employee.viditelny_v_tel_seznamu === 1;
    const newVisibility = !currentVisibility;
    const newVisibilityValue = newVisibility ? 1 : 0; // Převod boolean na číselnou hodnotu

    try {
      // Optimistic update - update UI immediately
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp.id === employee.id
            ? { ...emp, viditelny_v_tel_seznamu: newVisibilityValue }
            : emp
        )
      );

      // Call API
      await toggleEmployeeVisibility({
        token,
        username: user.username,
        user_id: employee.id,
        viditelny_v_tel_seznamu: newVisibilityValue
      });

      showToast?.(
        newVisibility
          ? 'Zaměstnanec bude viditelný v telefonním seznamu'
          : 'Zaměstnanec nebude viditelný v telefonním seznamu',
        { type: 'success' }
      );
    } catch (err) {
      // Revert optimistic update on error
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp.id === employee.id
            ? { ...emp, viditelny_v_tel_seznamu: currentVisibility ? 1 : 0 }
            : emp
        )
      );

      showToast?.(err.message || 'Chyba při změně viditelnosti zaměstnance', { type: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Neuvedeno';
    try {
      return new Date(dateString).toLocaleDateString('cs-CZ');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container>
        <div style={{display:'none'}}></div>
      </Container>
    );
  }

  const activeEmployees = employees.filter(emp => isEmployeeActive(emp));
  const inactiveEmployees = employees.filter(emp => !isEmployeeActive(emp));

  return (
    <Container>
      {error && (
        <ErrorState>
          <strong>Chyba:</strong> {error}
        </ErrorState>
      )}

      <SearchSection>
        <SearchHeader>
          <SearchTitle>
            <FolderSearch size={20} style={{ marginRight: '0.5rem' }} />
            Vyhledávání zaměstnanců
          </SearchTitle>
        </SearchHeader>

        <SearchContainer>
          <SearchInputContainer>
            <Search size={16} />
            <SearchInput
              type="text"
              placeholder="Vyhledat zaměstnance podle jména, pozice, emailu, telefonu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <ClearButton onClick={() => setSearchTerm('')} title="Vymazat">
                <X size={14} />
              </ClearButton>
            )}
          </SearchInputContainer>

          <StatusFilterContainer>
            <SmartTooltip text="Zobrazit všechny zaměstnance" icon="info" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'all'}
                filterType="all"
                onClick={() => setStatusFilter('all')}
              >
                <Users size={16} />
                Všichni
              </StatusFilterButton>
            </SmartTooltip>

            <SmartTooltip text="Zobrazit pouze aktivní zaměstnance" icon="success" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'active'}
                filterType="active"
                onClick={() => setStatusFilter('active')}
              >
                <CheckCircle size={16} />
                Aktivní
              </StatusFilterButton>
            </SmartTooltip>

            <SmartTooltip text="Zobrazit pouze neaktivní zaměstnance" icon="warning" preferredPosition="bottom">
              <StatusFilterButton
                active={statusFilter === 'inactive'}
                filterType="inactive"
                onClick={() => setStatusFilter('inactive')}
              >
                <XCircle size={16} />
                Neaktivní
              </StatusFilterButton>
            </SmartTooltip>
          </StatusFilterContainer>
        </SearchContainer>
      </SearchSection>

      <ResultsHeader>
        <ResultsHeaderLeft>
          <SmartTooltip text="Obnovit seznam zaměstnanců z databáze" icon="info" preferredPosition="bottom">
            <RefreshIconButton onClick={loadEmployees}>
              <RotateCw size={16} />
            </RefreshIconButton>
          </SmartTooltip>
          <ResultsInfo>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} />
              <span>
                Zobrazeno: <strong>{filteredEmployees.length}</strong> z celkem <strong>{employees.length}</strong> zaměstnanců |
                Aktivní: <strong>{activeEmployees.length}</strong> |
                Neaktivní: <strong>{inactiveEmployees.length}</strong>
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

      {filteredEmployees.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>
            {searchTerm ? 'Žádní zaměstnanci nenalezeni' : 'Žádní zaměstnanci'}
          </EmptyStateTitle>
          <p>
            {searchTerm
              ? 'Zkuste upravit vyhledávací kritéria'
              : 'V systému nejsou evidováni žádní zaměstnanci'
            }
          </p>
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <EmployeeGrid>
          {filteredEmployees.map((employee) => (
            <EmployeeCard key={employee.id}>
              <EmployeeHeader>
                <EmployeeInfo>
                  <EmployeeName>
                    {employee.full_name || 'Bez jména'}
                    <EmployeeIdIndex>#ID {employee.id}</EmployeeIdIndex>
                  </EmployeeName>
                  {employee.nazev_pozice && (
                    <EmployeePosition>{employee.nazev_pozice}</EmployeePosition>
                  )}
                </EmployeeInfo>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                  {(userDetail?.roles?.some(r => r.kod_role === 'ADMINISTRATOR' || r.kod_role === 'SUPERADMIN') || userDetail?.permissions?.includes('PHONEBOOK_MANAGE')) && (
                    <SmartTooltip
                      content={
                        employee.viditelny_v_tel_seznamu === 1
                          ? 'Viditelný v telefonním seznamu. Klikněte pro skrytí.'
                          : 'Skrytý v telefonním seznamu. Klikněte pro zobrazení.'
                      }
                    >
                      <VisibilityToggleButton
                        visible={employee.viditelny_v_tel_seznamu === 1}
                        onClick={() => handleToggleVisibility(employee)}
                      >
                        {employee.viditelny_v_tel_seznamu === 1 ? <Eye /> : <EyeOff />}
                      </VisibilityToggleButton>
                    </SmartTooltip>
                  )}
                  <StatusBadge active={isEmployeeActive(employee)}>
                    {isEmployeeActive(employee) ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {isEmployeeActive(employee) ? 'Aktivní' : 'Neaktivní'}
                  </StatusBadge>
                </div>
              </EmployeeHeader>

              <ContactDetails>
                {employee.email && (
                  <ContactItem>
                    <ContactIcon><Mail size={16} /></ContactIcon>
                    <ContactText>{employee.email}</ContactText>
                  </ContactItem>
                )}

                {employee.telefon && (
                  <ContactItem>
                    <ContactIcon><Phone size={16} /></ContactIcon>
                    <ContactText>{employee.telefon}</ContactText>
                  </ContactItem>
                )}

                {employee.usek_nazev && (
                  <ContactItem>
                    <ContactIcon><Building size={16} /></ContactIcon>
                    <ContactText>
                      {employee.usek_nazev}
                      {employee.usek_zkr && ` (${employee.usek_zkr})`}
                    </ContactText>
                  </ContactItem>
                )}

                {employee.lokalita_nazev && (
                  <ContactItem>
                    <ContactIcon><MapPin size={16} /></ContactIcon>
                    <ContactText>{employee.lokalita_nazev}</ContactText>
                  </ContactItem>
                )}

                {employee.dt_posledni_aktivita && (
                  <ContactItem>
                    <ContactIcon><Calendar size={16} /></ContactIcon>
                    <ContactText>
                      Poslední aktivita: {formatDate(employee.dt_posledni_aktivita)}
                    </ContactText>
                  </ContactItem>
                )}
              </ContactDetails>
            </EmployeeCard>
          ))}
        </EmployeeGrid>
      ) : (
        <EmployeeList>
          {filteredEmployees.map((employee) => (
            <EmployeeListItem key={employee.id}>
              <ListEmployeeInfo>
                <div>
                  <ListEmployeeName>
                    {employee.full_name || 'Bez jména'}
                    <EmployeeIdIndex>#ID {employee.id}</EmployeeIdIndex>
                  </ListEmployeeName>
                  <ListEmployeePosition>{employee.nazev_pozice || 'Pozice neuvedena'}</ListEmployeePosition>
                </div>
                <ListEmployeeContact>
                  {employee.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Mail size={14} />
                      {employee.email}
                    </div>
                  )}
                  {employee.telefon && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} />
                      {employee.telefon}
                    </div>
                  )}
                </ListEmployeeContact>
                <ListEmployeeDepartment>
                  {employee.usek_nazev && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Building size={14} />
                      {employee.usek_nazev}
                      {employee.usek_zkr && ` (${employee.usek_zkr})`}
                    </div>
                  )}
                  {employee.lokalita_nazev && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} />
                      {employee.lokalita_nazev}
                    </div>
                  )}
                </ListEmployeeDepartment>
                <div>
                  {employee.dt_posledni_aktivita && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      <Calendar size={12} />
                      {formatDate(employee.dt_posledni_aktivita)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                  {(userDetail?.roles?.some(r => r.kod_role === 'ADMINISTRATOR' || r.kod_role === 'SUPERADMIN') || userDetail?.permissions?.includes('PHONEBOOK_MANAGE')) && (
                    <SmartTooltip
                      content={
                        employee.viditelny_v_tel_seznamu === 1
                          ? 'Viditelný v telefonním seznamu. Klikněte pro skrytí.'
                          : 'Skrytý v telefonním seznamu. Klikněte pro zobrazení.'
                      }
                    >
                      <VisibilityToggleButton
                        visible={employee.viditelny_v_tel_seznamu === 1}
                        onClick={() => handleToggleVisibility(employee)}
                      >
                        {employee.viditelny_v_tel_seznamu === 1 ? <Eye /> : <EyeOff />}
                      </VisibilityToggleButton>
                    </SmartTooltip>
                  )}
                  <ListStatusBadge active={isEmployeeActive(employee)}>
                    {isEmployeeActive(employee) ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {isEmployeeActive(employee) ? 'Aktivní' : 'Neaktivní'}
                  </ListStatusBadge>
                </div>
              </ListEmployeeInfo>
            </EmployeeListItem>
          ))}
        </EmployeeList>
      )}
    </Container>
  );
};

export default EmployeeManagement;