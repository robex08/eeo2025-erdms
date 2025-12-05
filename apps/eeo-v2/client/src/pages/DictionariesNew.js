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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { Building, Briefcase, Network, Building2, Circle, Shield, Key, FileText, Calculator, FileSignature } from 'lucide-react';
import { SmartTooltip } from '../styles/SmartTooltip';

// Import Tab komponent
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

// =============================================================================
// KOMPONENTA
// =============================================================================

const DictionariesNew = () => {
  // Load active tab from localStorage with fallback
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('dictionaries_activeTab') || 'docx';
    } catch {
      return 'docx';
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
         key.includes('docx_') ||
         key.includes('cashbook_') ||
         key.includes('smlouvy_')) &&
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
      'lokality': 'Lokality',
      'pozice': 'Pozice',
      'useky': 'Úseky',
      'organizace': 'Organizace',
      'stavy': 'Stavy',
      'role': 'Role',
      'prava': 'Práva',
      'docx': 'DOCX Šablony',
      'cashbook': 'Pokladní knihy',
      'smlouvy': 'Smlouvy'
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
          <Tab $active={activeTab === 'docx'} onClick={() => handleTabChange('docx')}>
            <FileText size={18} />
            DOCX Šablony
          </Tab>
          <Tab $active={activeTab === 'cashbook'} onClick={() => handleTabChange('cashbook')}>
            <Calculator size={18} />
            Pokladní knihy
          </Tab>
          <Tab $active={activeTab === 'smlouvy'} onClick={() => handleTabChange('smlouvy')}>
            <FileSignature size={18} />
            Smlouvy
          </Tab>
          <Tab $active={activeTab === 'lokality'} onClick={() => handleTabChange('lokality')}>
            <Building size={18} />
            Lokality
          </Tab>
          <Tab $active={activeTab === 'pozice'} onClick={() => handleTabChange('pozice')}>
            <Briefcase size={18} />
            Pozice
          </Tab>
          <Tab $active={activeTab === 'prava'} onClick={() => handleTabChange('prava')}>
            <Key size={18} />
            Práva
          </Tab>
          <Tab $active={activeTab === 'role'} onClick={() => handleTabChange('role')}>
            <Shield size={18} />
            Role
          </Tab>
          <Tab $active={activeTab === 'stavy'} onClick={() => handleTabChange('stavy')}>
            <Circle size={18} />
            Stavy
          </Tab>
          <Tab $active={activeTab === 'useky'} onClick={() => handleTabChange('useky')}>
            <Network size={18} />
            Úseky
          </Tab>
          <Tab $active={activeTab === 'organizace'} onClick={() => handleTabChange('organizace')}>
            <Building2 size={18} />
            Organizace
          </Tab>
        </TabHeader>

        {/* Tab Content - každý tab je samostatný komponent */}
        {activeTab === 'docx' && <DocxSablonyTab key={`docx-${refreshKey}`} />}
        {activeTab === 'cashbook' && <CashbookTab key={`cashbook-${refreshKey}`} />}
        {activeTab === 'smlouvy' && <SmlouvyTab key={`smlouvy-${refreshKey}`} />}
        {activeTab === 'lokality' && <LokalityTab key={`lokality-${refreshKey}`} />}
        {activeTab === 'pozice' && <PoziceTab key={`pozice-${refreshKey}`} />}
        {activeTab === 'prava' && <PravaTab key={`prava-${refreshKey}`} />}
        {activeTab === 'role' && <RoleTab key={`role-${refreshKey}`} />}
        {activeTab === 'stavy' && <StavyTab key={`stavy-${refreshKey}`} />}
        {activeTab === 'useky' && <UsekyTab key={`useky-${refreshKey}`} />}
        {activeTab === 'organizace' && <OrganizaceTab key={`organizace-${refreshKey}`} />}
      </TabContainer>
    </PageContainer>
  );
};

export default DictionariesNew;
