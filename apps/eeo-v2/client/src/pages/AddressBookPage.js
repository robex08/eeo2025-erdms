import React, { useState, useContext, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Building } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAddressBook, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { SmartTooltip } from '../styles/SmartTooltip';
import ContactManagement from '../components/ContactManagement';
import EmployeeManagement from '../components/EmployeeManagement';
import { createDictionaryPermissionHelper } from '../utils/dictionaryPermissions';

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  position: relative;
  z-index: 1;

  @media (min-width: 1400px) {
    padding: 2rem 3rem;
  }

  @media (min-width: 1800px) {
    padding: 2rem 4rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(${props => props.$visible ? '8px' : '0px'});
  -webkit-backdrop-filter: blur(${props => props.$visible ? '8px' : '0px'});
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.5s ease-in-out, backdrop-filter 0.6s ease-in-out;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LoadingSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
  transform: scale(${props => props.$visible ? 1 : 0.8});
  transition: transform 0.5s ease-in-out;

  @keyframes spin {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(360deg) scale(1); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.1s, opacity 0.5s ease-in-out 0.1s;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.15s, opacity 0.5s ease-in-out 0.15s;
`;

const PageContent = styled.div`
  filter: blur(${props => props.$blurred ? '3px' : '0px'});
  transition: filter 0.6s ease-in-out;
  pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: none;
  margin: 0 auto;
`;

const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;

const TitleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  width: 42px;
  height: 42px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PageDivider = styled.div`
  border-bottom: 3px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const PageDescription = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 1.125rem;
  line-height: 1.6;
`;

const TabContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const TabHeader = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Tab = styled.button`
  flex: 1;
  padding: 1.5rem 2rem;
  background: ${props => props.active ? 'white' : 'transparent'};
  border: none;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.active ? '#3b82f6' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    color: ${props => props.active ? '#3b82f6' : '#1e293b'};
    background: ${props => props.active ? 'white' : '#f1f5f9'};
  }

  ${props => props.active && `
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #3b82f6;
    }
  `}
`;

const TabContent = styled.div`
  padding: 2rem;
`;

const PermissionInfo = styled.div`
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PermissionText = styled.span`
  color: #0c4a6e;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
`;

const UserManagementLink = styled.span`
  color: #0284c7;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    color: #0369a1;
    text-decoration: none;
  }
`;

const AddressBookPage = () => {
  const { hasPermission, hasAdminRole, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext) || {};
  const navigate = useNavigate();

  // Permission helper
  const permissions = createDictionaryPermissionHelper('PHONEBOOK', hasPermission, hasAdminRole);

  // Kontrola oprávnění pro zobrazení záložek
  const canManageSuppliers = hasAdminRole?.() || hasPermission?.('SUPPLIER_MANAGE');
  const canManagePhonebook = hasAdminRole?.() || hasPermission?.('PHONEBOOK_MANAGE');

  // Refs pro volání refresh funkcí v child komponentách
  const contactManagementRef = useRef(null);
  const employeeManagementRef = useRef(null);

  // Helper functions for user-specific localStorage
  const user_id = userDetail?.user_id;
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
    }
  };

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = getUserStorage('addressBook_activeTab', 'suppliers');
    // Pokud má uživatel pouze jedno právo, nastav odpovídající záložku
    if (canManageSuppliers && !canManagePhonebook) return 'suppliers';
    if (canManagePhonebook && !canManageSuppliers) return 'employees';
    return savedTab;
  });

  // Uložení activeTab do localStorage při změně
  useEffect(() => {
    setUserStorage('addressBook_activeTab', activeTab);
  }, [activeTab, user_id]);

  // Funkce pro refresh dat z databáze
  const handleRefresh = () => {
    if (activeTab === 'suppliers' && contactManagementRef.current) {
      contactManagementRef.current.refreshData();
    } else if (activeTab === 'employees' && employeeManagementRef.current) {
      employeeManagementRef.current.refreshData();
    }
  };

  // Access control - pokud nemá žádné právo, zobrazíme prázdný stav
  if (!permissions.hasAnyPermission()) {
    return (
      <PageContainer>
        <ContentWrapper>
          <TitlePanel>
            <TitleLeft>
              <SmartTooltip text="Obnovit data z databáze (force reload)" icon="warning" preferredPosition="bottom">
                <RefreshButton onClick={handleRefresh}>
                  <FontAwesomeIcon icon={faSyncAlt} />
                </RefreshButton>
              </SmartTooltip>
            </TitleLeft>
            <PageTitle>
              Adresář
              <FontAwesomeIcon icon={faAddressBook} />
            </PageTitle>
          </TitlePanel>

          <PageDivider />

          <PageDescription style={{ marginTop: '1rem' }}>
            Nemáte oprávnění pro přístup k adresáři kontaktů.
          </PageDescription>
        </ContentWrapper>
      </PageContainer>
    );
  }

  const getPermissionDescription = () => {
    if (hasAdminRole()) {
      return (
        <>
          🔓 Máte plná oprávnění (administrátor) pro správu všech kontaktů.
          Správa uživatelských kontaktů se provádí v sekci{' '}
          <UserManagementLink onClick={() => navigate('/users')}>
            Uživatelé
          </UserManagementLink>.
        </>
      );
    }

    const parts = [];
    if (permissions.canView()) parts.push('👁️ zobrazení');
    if (permissions.canCreate()) parts.push('➕ vytváření');
    if (permissions.canEdit()) parts.push('✏️ úpravy');
    if (permissions.canDelete()) parts.push('🗑️ mazání');

    if (parts.length === 0) {
      return '🔒 Nemáte žádná oprávnění pro práci s kontakty';
    }

    return `Máte oprávnění: ${parts.join(', ')}`;
  };

  // Convert granular permissions to legacy permissionLevel format for child components
  const getPermissionLevel = () => {
    if (hasAdminRole()) return 'MANAGE';
    if (permissions.canEdit() || permissions.canCreate() || permissions.canDelete()) return 'EDIT';
    if (permissions.canView()) return 'READ';
    return 'NONE';
  };

  const permissionLevel = getPermissionLevel();

  return (
    <PageContainer>
      <ContentWrapper>
        <TitlePanel>
          <TitleLeft>
            <SmartTooltip text="Obnovit data z databáze (force reload)" icon="warning" preferredPosition="bottom">
              <RefreshButton onClick={handleRefresh}>
                <FontAwesomeIcon icon={faSyncAlt} />
              </RefreshButton>
            </SmartTooltip>
          </TitleLeft>
          <PageTitle>
            Adresář
            <FontAwesomeIcon icon={faAddressBook} />
          </PageTitle>
        </TitlePanel>

        <PageDivider />

        <TabContainer>
          <TabHeader>
            {canManageSuppliers && (
              <Tab
                active={activeTab === 'suppliers'}
                onClick={() => setActiveTab('suppliers')}
              >
                <span>🏢</span> Adresář dodavatelů
              </Tab>
            )}
            {canManagePhonebook && (
              <Tab
                active={activeTab === 'employees'}
                onClick={() => setActiveTab('employees')}
              >
                <span>👥</span> Adresář zaměstnanců
              </Tab>
            )}
          </TabHeader>

          <TabContent>
            <PermissionInfo>
              <span>ℹ️</span>
              <PermissionText>{getPermissionDescription()}</PermissionText>
            </PermissionInfo>

            {activeTab === 'suppliers' && (
              <ContactManagement
                contactType="suppliers"
                permissionLevel={permissionLevel}
                userDetail={userDetail}
                showToast={showToast}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManagement
                permissionLevel={permissionLevel}
                userDetail={userDetail}
                showToast={showToast}
              />
            )}
          </TabContent>
        </TabContainer>
      </ContentWrapper>
    </PageContainer>
  );
};

export default AddressBookPage;