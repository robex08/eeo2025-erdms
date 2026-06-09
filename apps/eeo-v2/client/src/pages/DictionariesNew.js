/**
 * Číselníky - Kompletní správa číselníků systému
 *
 * Moderní stránka s tab navigací pro správu všech číselníků:
 * - Lokality, Pozice, Úseky, Organizace
 * - Stavy, Role, Práva (read-only)
 * - DOCX Šablony
 *
 * @author Frontend Team
 * @date 2025-10-19
 */

import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { Building, Briefcase, Network, Building2, Circle, Shield, Key, FileText, Calculator, FileSignature, Coins, Users } from 'lucide-react';
import { SmartTooltip } from '../styles/SmartTooltip';
import { AuthContext } from '../context/AuthContext';

// Import Tab komponent
import MoznostiZastupovaniTab from '../components/dictionaries/tabs/MoznostiZastupovaniTab';
import LokalityTab from '../components/dictionaries/tabs/LokalityTab';
import PoziceTab from '../components/dictionaries/tabs/PoziceTab';
import UsekyTab from '../components/dictionaries/tabs/UsekyTab';
import OrganizaceTab from '../components/dictionaries/tabs/OrganizaceTab';
import StavyTab from '../components/dictionaries/tabs/StavyTab';
import RoleTab from '../components/dictionaries/tabs/RoleTab';
import PravaTab from '../components/dictionaries/tabs/PravaTab';
import DocxSablonyTab from '../components/dictionaries/tabs/DocxSablonyTab';
import CashbookTab from '../components/dictionaries/tabs/CashbookTab';
import SmlouvyTab from '../components/dictionaries/tabs/SmlouvyTab';
import LimitovanePrislibTab from '../components/dictionaries/tabs/LimitovanePrislibTab';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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

const RefreshIcon = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  svg {
    font-size: 1rem;
  }
`;

const PageDivider = styled.div`
  height: 1px;
  background: linear-gradient(to right, transparent, #e5e7eb 50%, transparent);
  margin: 1rem 0;
`;

const TabContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TabHeader = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;

  /* Hide scrollbar ale zachovat funkcionalitu */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  flex: 0 0 auto;
  min-width: 160px;
  padding: 0.6rem 1.2rem;
  background: ${props => props.$active ? 'white' : 'transparent'};
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;

  &:hover {
    background: ${props => props.$active ? 'white' : '#f1f5f9'};
    color: ${props => props.$active ? '#3b82f6' : '#3b82f6'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 8px;
  margin: 1rem 0;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.3;
`;

const EmptyStateTitle = styled.h2`
  font-size: 1.5rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const DictionariesNew = () => {
  const { hasPermission, hasAdminRole } = useContext(AuthContext);
  
  // Helper pro kontrolu viditelnosti záložky
  const canViewTab = (prefix) => {
    if (hasAdminRole()) return true;
    return hasPermission(`${prefix}_VIEW`) ||
           hasPermission(`${prefix}_CREATE`) ||
           hasPermission(`${prefix}_EDIT`) ||
           hasPermission(`${prefix}_DELETE`);
  };

  // Seznam všech záložek v pořadí
  const availableTabs = [
    { key: 'moznosti-zastupovani', prefix: 'ADMIN', name: 'Možnosti zastupování' },
    { key: 'docx', prefix: 'DOCX_TEMPLATES', name: 'DOCX Šablony' },
    { key: 'cashbook', prefix: 'CASH_BOOKS', name: 'Pokladní knihy' },
    { key: 'smlouvy', prefix: 'CONTRACT', name: 'Smlouvy' },
    { key: 'lp', prefix: 'LP', name: 'LP kódy' },
    { key: 'lokality', prefix: 'LOCATIONS', name: 'Lokality' },
    { key: 'pozice', prefix: 'POSITIONS', name: 'Pozice' },
    { key: 'prava', prefix: 'PERMISSIONS', name: 'Práva' },
    { key: 'role', prefix: 'ROLES', name: 'Role' },
    { key: 'stavy', prefix: 'STATES', name: 'Stavy' },
    { key: 'useky', prefix: 'DEPARTMENTS', name: 'Úseky' },
    { key: 'organizace', prefix: 'ORGANIZATIONS', name: 'Organizace' }
  ];

  // Zjistit dostupné záložky
  const accessibleTabs = availableTabs.filter(tab => canViewTab(tab.prefix));
  const hasAnyTab = accessibleTabs.length > 0;
  const firstAccessibleTab = accessibleTabs[0]?.key || null;

  // Load active tab from localStorage with fallback na první dostupnou záložku
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('dictionaries_activeTab');
      // Zkontrolovat, jestli má k uložené záložce přístup
      if (saved && accessibleTabs.some(t => t.key === saved)) {
        return saved;
      }
      return firstAccessibleTab;
    } catch {
      return firstAccessibleTab;
    }
  });

  // Save active tab to localStorage when it changes
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    try {
      localStorage.setItem('dictionaries_activeTab', tabKey);
    } catch (error) {
      // Ignorovat chyby localStorage
    }
  };

  // Refresh all dictionaries - force re-render by setting key
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefreshAllDictionaries = () => {
    // Clear all localStorage cache for dictionaries
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      // Clear filter states, page states, etc. but keep activeTab
      if (
        (key.includes('lokality_') ||
         key.includes('pozice_') ||
         key.includes('useky_') ||
         key.includes('organizace_') ||
         key.includes('stavy_') ||
         key.includes('role_') ||
         key.includes('prava_') ||
         key.includes('moznosti_zastupovani_') ||
         key.includes('docx_') ||
         key.includes('cashbook_') ||
         key.includes('smlouvy_') ||
         key.includes('lp_')) &&
        key !== 'dictionaries_activeTab'
      ) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignorovat
        }
      }
    });

    // Force re-render of all tabs by incrementing key
    setRefreshKey(prev => prev + 1);
  };

  // Function to get Czech display name for active tab
  const getTabDisplayName = (tabKey) => {
    const tabNames = {
      'moznosti-zastupovani': 'Možnosti zastupování',
      'lokality': 'Lokality',
      'pozice': 'Pozice',
      'useky': 'Úseky',
      'organizace': 'Organizace',
      'stavy': 'Stavy',
      'role': 'Role',
      'prava': 'Práva',
      'docx': 'DOCX Šablony',
      'cashbook': 'Pokladní knihy',
      'smlouvy': 'Smlouvy',
      'lp': 'LP kódy'
    };
    return tabNames[tabKey] || 'Číselníky';
  };

  return (
    <PageContainer>
      {/* Header */}
      <TitlePanel>
        <PageTitle>
          <FontAwesomeIcon icon={faBook} />
          Číselníky - {getTabDisplayName(activeTab)}
        </PageTitle>
        <SmartTooltip text="Obnovit všechny číselníky z databáze (force reload)" icon="warning" preferredPosition="bottom">
          <RefreshIcon
            onClick={handleRefreshAllDictionaries}
          >
            <FontAwesomeIcon icon={faSyncAlt} />
          </RefreshIcon>
        </SmartTooltip>
      </TitlePanel>

      {/* Tab Navigation */}
      <TabContainer>
        <TabHeader>
          {canViewTab('ADMIN') && (
            <Tab $active={activeTab === 'moznosti-zastupovani'} onClick={() => handleTabChange('moznosti-zastupovani')}>
              <Users size={18} />
              Možnosti zastupování
            </Tab>
          )}
          {canViewTab('DOCX_TEMPLATES') && (
            <Tab $active={activeTab === 'docx'} onClick={() => handleTabChange('docx')}>
              <FileText size={18} />
              DOCX Šablony
            </Tab>
          )}
          {canViewTab('CASH_BOOKS') && (
            <Tab $active={activeTab === 'cashbook'} onClick={() => handleTabChange('cashbook')}>
              <Calculator size={18} />
              Pokladní knihy
            </Tab>
          )}
          {canViewTab('CONTRACT') && (
            <Tab $active={activeTab === 'smlouvy'} onClick={() => handleTabChange('smlouvy')}>
              <FileSignature size={18} />
              Smlouvy
            </Tab>
          )}
          {canViewTab('LP') && (
            <Tab $active={activeTab === 'lp'} onClick={() => handleTabChange('lp')}>
              <Coins size={18} />
              LP kódy
            </Tab>
          )}
          {canViewTab('LOCATIONS') && (
            <Tab $active={activeTab === 'lokality'} onClick={() => handleTabChange('lokality')}>
              <Building size={18} />
              Lokality
            </Tab>
          )}
          {canViewTab('POSITIONS') && (
            <Tab $active={activeTab === 'pozice'} onClick={() => handleTabChange('pozice')}>
              <Briefcase size={18} />
              Pozice
            </Tab>
          )}
          {canViewTab('PERMISSIONS') && (
            <Tab $active={activeTab === 'prava'} onClick={() => handleTabChange('prava')}>
              <Key size={18} />
              Práva
            </Tab>
          )}
          {canViewTab('ROLES') && (
            <Tab $active={activeTab === 'role'} onClick={() => handleTabChange('role')}>
              <Shield size={18} />
              Role
            </Tab>
          )}
          {canViewTab('STATES') && (
            <Tab $active={activeTab === 'stavy'} onClick={() => handleTabChange('stavy')}>
              <Circle size={18} />
              Stavy
            </Tab>
          )}
          {canViewTab('DEPARTMENTS') && (
            <Tab $active={activeTab === 'useky'} onClick={() => handleTabChange('useky')}>
              <Network size={18} />
              Úseky
            </Tab>
          )}
          {canViewTab('ORGANIZATIONS') && (
            <Tab $active={activeTab === 'organizace'} onClick={() => handleTabChange('organizace')}>
              <Building2 size={18} />
              Organizace
            </Tab>
          )}
        </TabHeader>

        {/* Empty state - když uživatel nemá přístup k žádné záložce */}
        {!hasAnyTab && (
          <EmptyStateContainer>
            <EmptyStateIcon>🔒</EmptyStateIcon>
            <EmptyStateTitle>Nemáte přístup k žádným číselníkům</EmptyStateTitle>
            <EmptyStateText>
              Pro zobrazení číselníků potřebujete odpovídající oprávnění.<br />
              Kontaktujte prosím správce systému.
            </EmptyStateText>
          </EmptyStateContainer>
        )}

        {/* Tab Content - každý tab je samostatný komponent */}
        {hasAnyTab && activeTab === 'moznosti-zastupovani' && canViewTab('ADMIN') && <MoznostiZastupovaniTab key={`moznosti-zastupovani-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'docx' && canViewTab('DOCX_TEMPLATES') && <DocxSablonyTab key={`docx-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'cashbook' && canViewTab('CASH_BOOKS') && <CashbookTab key={`cashbook-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'smlouvy' && canViewTab('CONTRACT') && <SmlouvyTab key={`smlouvy-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'lp' && canViewTab('LP') && <LimitovanePrislibTab key={`lp-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'lokality' && canViewTab('LOCATIONS') && <LokalityTab key={`lokality-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'pozice' && canViewTab('POSITIONS') && <PoziceTab key={`pozice-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'prava' && canViewTab('PERMISSIONS') && <PravaTab key={`prava-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'role' && canViewTab('ROLES') && <RoleTab key={`role-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'stavy' && canViewTab('STATES') && <StavyTab key={`stavy-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'useky' && canViewTab('DEPARTMENTS') && <UsekyTab key={`useky-${refreshKey}`} />}
        {hasAnyTab && activeTab === 'organizace' && canViewTab('ORGANIZATIONS') && <OrganizaceTab key={`organizace-${refreshKey}`} />}
      </TabContainer>
    </PageContainer>
  );
};

export default DictionariesNew;
