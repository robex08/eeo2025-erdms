/**
 * OrdersFiltersV3Full.js
 * 
 * Plnohodnotný filtrovací panel pro Orders V3
 * Přesný clone filtrovací sekce z Orders25List.js
 * 
 * Datum: 6. února 2026
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilter, faSearch, faTimes, faUser, faShield, faList,
  faCalendarAlt, faMoneyBillWave, faFileContract, faBoltLightning,
  faEraser, faChevronUp, faChevronDown, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from '../DatePicker';
import { fetchAllUsers, fetchApprovers, fetchCiselniky } from '../../services/api2auth';
import { fetchLPList } from '../../services/apiOrdersV3';
import { SmartTooltip } from '../../styles/SmartTooltip'; // ✅ Custom tooltip component

// ============================================================================
// MULTISELECT KOMPONENTA
// ============================================================================

const MultiSelectLocal = ({ field, value, onChange, options, placeholder, icon, showSecondColumn = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Zavři dropdown při kliku mimo
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus na vyhledávací pole při otevření
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Memoizuj aktuální hodnoty
  const valueSet = React.useMemo(() => {
    const arr = Array.isArray(value) ? value : [];
    return new Set(arr.map(v => String(v)));
  }, [value]);

  // Filtrované options podle vyhledávání
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;

    const search = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return options.filter(opt => {
      const label = (opt.label || opt.displayName || opt.nazev_stavu || opt.nazev || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const code = (opt.id || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const usek = (opt.usekLabel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return label.includes(search) || code.includes(search) || usek.includes(search);
    });
  }, [options, searchTerm]);

  const getDisplayValue = React.useCallback(() => {
    if (!value || value.length === 0) return placeholder || 'Vyberte...';
    if (value.length === 1) {
      const opt = options?.find(o => String(o.id) === String(value[0]));
      return opt ? (opt.label || opt.displayName || opt.nazev_stavu || opt.nazev || value[0]) : value[0];
    }
    return `Vybráno: ${value.length}`;
  }, [value, options, placeholder]);

  const handleToggle = React.useCallback((optValue) => {
    const currentValue = Array.isArray(value) ? value : [];
    const newValue = currentValue.includes(optValue)
      ? currentValue.filter(v => v !== optValue)
      : [...currentValue, optValue];

    const fakeEvent = {
      target: {
        options: newValue.map(v => ({ value: v, selected: true }))
      }
    };
    onChange(fakeEvent);
  }, [value, onChange]);

  const handleMainClick = React.useCallback((e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  const handleItemClick = React.useCallback((e, optValue) => {
    e.stopPropagation();
    handleToggle(optValue);
  }, [handleToggle]);

  if (!options || options.length === 0) {
    return (
      <div style={{
        padding: '0.5rem 0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        color: '#9ca3af',
        fontSize: '0.875rem',
        minHeight: '38px',
        display: 'flex',
        alignItems: 'center'
      }}>
        Načítání...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={handleMainClick}
        style={{
          width: '100%',
          padding: '0.5rem 2rem 0.5rem 0.75rem',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.875rem',
          background: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          color: (!value || value.length === 0) ? '#9ca3af' : '#1f2937',
          fontWeight: (value && value.length > 0) ? '500' : '400',
          minHeight: '38px'
        }}
      >
        <span>{getDisplayValue()}</span>
        <svg
          style={{
            position: 'absolute',
            right: '0.5rem',
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: showSecondColumn ? 0 : 'auto',
          left: showSecondColumn ? 'auto' : 0,
          width: showSecondColumn ? 'fit-content' : '100%',
          minWidth: showSecondColumn ? '650px' : '100%',
          maxWidth: showSecondColumn ? '850px' : 'none',
          marginTop: '4px',
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          zIndex: 9999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px'
        }}>
          {/* Vyhledávací pole */}
          <div style={{
            padding: '0.75rem',
            borderBottom: '2px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            zIndex: 1
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '12px',
                  height: '12px',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hledat..."
                style={{
                  width: '100%',
                  padding: '0.5rem 2rem 0.5rem 2rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease',
                    zIndex: 2,
                    width: '20px',
                    height: '20px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  title="Vymazat"
                >
                  <FontAwesomeIcon icon={faTimes} style={{ fontSize: '0.875rem' }} />
                </button>
              )}
            </div>
          </div>

          {/* Seznam options */}
          <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.875rem'
              }}>
                Žádné výsledky
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optValue = String(opt.id || '');
                const optLabel = opt.label || opt.displayName || opt.nazev_stavu || opt.nazev || 'Bez názvu';
                const isChecked = valueSet.has(optValue);

                // Renderování group headeru (název úseku)
                if (opt.isGroupHeader) {
                  return (
                    <div
                      key={optValue || idx}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f3f4f6',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {optLabel}
                    </div>
                  );
                }

                // Normální položka
                return (
                  <div
                    key={optValue || idx}
                    onClick={(e) => handleItemClick(e, optValue)}
                    style={{
                      padding: '0.75rem 1rem',
                      paddingLeft: '1.5rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      background: isChecked ? '#eff6ff' : 'transparent',
                      borderBottom: idx < filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                        pointerEvents: 'none',
                        flexShrink: 0,
                        marginTop: '0.15rem'
                      }}
                    />
                    {showSecondColumn && opt.cerpanoLabel ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        flex: 1
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            fontSize: '0.875rem',
                            color: isChecked ? '#1e3a8a' : '#374151',
                            fontWeight: isChecked ? '600' : '500',
                            userSelect: 'none'
                          }}>
                            {optLabel}
                          </span>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.15rem 0.5rem',
                            background: opt.badgeColor || '#10b981',
                            color: '#ffffff',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            fontFamily: 'monospace',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            lineHeight: 1
                          }}>
                            {opt.procentoLabel}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem',
                          paddingLeft: '0.1rem'
                        }}>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            fontFamily: 'monospace'
                          }}>
                            {opt.cerpanoLabel}
                          </span>
                          {opt.usekLabel && (
                            <span style={{
                              fontSize: '0.7rem',
                              color: '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                              {opt.usekLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: '0.875rem',
                        color: isChecked ? '#1e3a8a' : '#374151',
                        fontWeight: isChecked ? '600' : '400',
                        userSelect: 'none',
                        flex: 1
                      }}>
                        {optLabel}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const FiltersPanel = styled.div`
  background: linear-gradient(135deg, #f8f9fb 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  font-family: var(--app-font-family, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
`;

const FiltersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.875rem;
  margin-top: 1.25rem;

  & > div {
    min-width: 0;
  }

  @media (max-width: 1600px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.125rem;
  gap: 0.5rem;
`;

const FilterLabelLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterClearButton = styled.button`
  background: transparent;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.875rem;
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  transition: all 0.2s ease;

  &:hover {
    color: #991b1b;
    transform: scale(1.1);
  }
`;

const FilterInputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    width: 14px;
    height: 14px;
    pointer-events: none;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  padding: ${props => props.hasIcon ? '0.5rem 2.5rem 0.5rem 2rem' : '0.5rem 0.75rem'};
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s ease;
  min-height: 38px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
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
`;

const SelectWithIcon = styled.div`
  position: relative;
`;

const DateRangeGroup = styled(FilterGroup)`
  grid-column: span 2;

  @media (max-width: 1600px) {
    grid-column: span 1;
  }
`;

const DateRangeInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

const DateInputWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const DateSeparator = styled.span`
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.875rem;
`;

const PriceRangeGroup = styled(FilterGroup)`
  grid-column: span 2;

  @media (max-width: 1600px) {
    grid-column: span 1;
  }
`;

const PriceRangeInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

const PriceInputWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    width: 12px;
    height: 12px;
    pointer-events: none;
  }
`;

const PriceSeparator = styled.span`
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.875rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3b82f6;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const HintText = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  kbd {
    background: #f1f5f9;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrdersFiltersV3Full = ({
  // Auth
  token,
  username,
  userId,
  
  // Filters state
  filters,
  onFilterChange,
  onClearAll, // ✅ Vráceno zpět pro panel filtrů
  
  // Global search
  globalFilter,
  onGlobalFilterChange,
  
  // UI state
  showFilters,
  onToggleFilters,
  onHide
}) => {
  // State pro loaded data
  const [usersList, setUsersList] = useState([]);
  const [approversList, setApproversList] = useState([]);
  const [orderStatesList, setOrderStatesList] = useState([]);
  const [lpList, setLpList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State pro zobrazování rozšířených filtrů (nezávislé na showFilters)
  const [showExtendedFilters, setShowExtendedFilters] = useState(true);

  // Load data from API při mountu
  useEffect(() => {
    const loadFiltersData = async () => {
      if (!token || !username) return;

      try {
        setLoading(true);

        // Načíst všechny data paralelně
        const [usersData, approversData, statesData, lpData] = await Promise.all([
          fetchAllUsers({ token, username, show_inactive: true }),
          fetchApprovers({ token, username }),
          fetchCiselniky({ token, username, typ: 'OBJEDNAVKA' }),
          fetchLPList({ token, username })
        ]);

        // Zpracuj approvers data - přidej displayName s tituly (jako v Orders25List)
        const approversWithDisplayName = (approversData || []).map(approver => {
          if (approver.displayName) return approver;

          const titul_pred_str = approver.titul_pred ? approver.titul_pred + ' ' : '';
          const jmeno_str = approver.jmeno || '';
          const prijmeni_str = approver.prijmeni || '';
          const titul_za_str = approver.titul_za ? ', ' + approver.titul_za : '';
          const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim() ||
                             approver.jmeno_prijmeni ||
                             approver.username ||
                             approver.uzivatelske_jmeno ||
                             `User ${approver.user_id || approver.uzivatel_id}`;

          return { ...approver, displayName };
        });

        // Přidej systémového uživatele SYSTEM (ID 0) pro archivované objednávky
        approversWithDisplayName.unshift({
          id: '0',
          user_id: '0',
          uzivatel_id: '0',
          jmeno: 'SYSTEM',
          prijmeni: '',
          titul_pred: '',
          titul_za: '',
          username: 'system',
          deaktivovan: 0,
          aktivni: 1,
          displayName: 'SYSTEM'
        });

        setUsersList(usersData || []);
        setApproversList(approversWithDisplayName);
        setOrderStatesList(statesData || []);
        setLpList(lpData || []);
      } catch (error) {
        console.error('❌ Chyba při načítání dat pro filtry:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFiltersData();
  }, [token, username]);

  // Připrav sorted users
  const sortedActiveUsers = useMemo(() => {
    if (!usersList || usersList.length === 0) return [];

    return [...usersList]
      .filter(user => user.aktivni === 1 || user.aktivni === '1' || user.aktivni === true)
      .map(user => ({
        ...user,
        id: user.id,
        displayName: user.jmeno_prijmeni || `${user.jmeno || ''} ${user.prijmeni || ''}`.trim() || `User ${user.id}`
      }))
      .sort((a, b) => {
        const nameA = a.displayName || '';
        const nameB = b.displayName || '';
        return nameA.localeCompare(nameB);
      });
  }, [usersList]);

  // Připrav sorted approvers (s tituly a bez deaktivovaných)
  const sortedActiveApprovers = useMemo(() => {
    if (!approversList || approversList.length === 0) return [];

    return [...approversList]
      .filter(approver => {
        // Filtruj aktivní uživatele
        if (approver.aktivni !== undefined && approver.aktivni !== null) {
          return approver.aktivni === 1 || approver.aktivni === '1' || approver.aktivni === true;
        }
        // Fallback na deaktivovan (0 = aktivní, 1 = neaktivní)
        if (approver.deaktivovan !== undefined && approver.deaktivovan !== null) {
          return approver.deaktivovan === 0 || approver.deaktivovan === '0' || approver.deaktivovan === false;
        }
        return true;
      })
      .map(approver => {
        // ID pro API (user_id nebo uzivatel_id nebo id)
        const approverId = approver.user_id || approver.uzivatel_id || approver.id;
        
        return {
          ...approver,
          id: String(approverId),
          displayName: approver.displayName || approver.jmeno_prijmeni || `${approver.jmeno || ''} ${approver.prijmeni || ''}`.trim() || `User ${approverId}`
        };
      })
      .sort((a, b) => {
        const nameA = a.displayName || '';
        const nameB = b.displayName || '';
        return nameA.localeCompare(nameB);
      });
  }, [approversList]);

  // Připrav LP options
  const lpOptions = useMemo(() => {
    if (!lpList || lpList.length === 0) return [];

    // Nejdřív zpracuj a transformuj data
    const transformedData = [...lpList].map(lp => {
      const cerpano = parseFloat(lp.cerpano_celkem || 0);
      const limit = parseFloat(lp.limit_celkem || 0);
      const procento = limit > 0 ? (cerpano / limit) * 100 : 0;
      
      // Určení barvy podle čerpání
      let badgeColor = '#10b981'; // zelená (0-50%)
      if (procento > 80) badgeColor = '#ef4444'; // červená (>80%)
      else if (procento > 50) badgeColor = '#f59e0b'; // oranžová (50-80%)
      
      const formatCerpano = cerpano.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const formatLimit = limit.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const formatProcento = procento.toFixed(1);
      
      // Formát: "Název úseku (ZKRATKA)" nebo jen zkratka/název pokud chybí druhá část
      let usekLabel = 'Bez úseku';
      if (lp.usek_nazev && lp.usek_zkr) {
        usekLabel = `${lp.usek_nazev} (${lp.usek_zkr})`;
      } else if (lp.usek_zkr) {
        usekLabel = lp.usek_zkr;
      } else if (lp.usek_nazev) {
        usekLabel = lp.usek_nazev;
      }
      
      return {
        ...lp,
        id: String(lp.id),
        label: `${lp.cislo_lp} - ${lp.nazev_uctu || ''}`,
        cerpanoLabel: `${formatCerpano} Kč / ${formatLimit} Kč`,
        procentoLabel: `${formatProcento}%`,
        cerpanoValue: cerpano,
        badgeColor,
        usekLabel
      };
    });

    // Zgrupuj podle úseku
    const grouped = transformedData.reduce((acc, lp) => {
      const usek = lp.usekLabel;
      if (!acc[usek]) {
        acc[usek] = {
          items: [],
          usek_nazev: lp.usek_nazev || lp.usek_zkr || 'Bez úseku',
          usek_zkr: lp.usek_zkr || ''
        };
      }
      acc[usek].items.push(lp);
      return acc;
    }, {});

    // Vytvoř finální pole s group headers a položkami
    const result = [];
    
    // Seřaď úseky podle názvu (ne zkratky)
    const sortedUseky = Object.keys(grouped).sort((a, b) => {
      const nameA = grouped[a].usek_nazev.toLowerCase();
      const nameB = grouped[b].usek_nazev.toLowerCase();
      return nameA.localeCompare(nameB, 'cs');
    });
    
    sortedUseky.forEach(usek => {
      // Přidej group header
      result.push({
        id: `header-${usek}`,
        label: usek,
        isGroupHeader: true
      });
      
      // Přidej položky úseku (seřazené podle cislo_lp)
      const sortedItems = grouped[usek].items.sort((a, b) => 
        (a.cislo_lp || '').localeCompare(b.cislo_lp || '')
      );
      result.push(...sortedItems);
    });

    return result;
  }, [lpList]);

  // Připrav status options
  const statusOptions = useMemo(() => {
    if (!orderStatesList || orderStatesList.length === 0) return [];

    return [...orderStatesList].map(status => {
      const kod = status.kod_stavu || status.kod || '';
      const nazev = status.nazev_stavu || status.nazev || kod;
      return {
        ...status,
        id: kod, // ✅ VALUE = workflow kód pro backend
        label: nazev, // ✅ ZOBRAZENÍ = český název (bez závorek)
        kod_stavu: kod
      };
    });
  }, [orderStatesList]);

  // Format number with spaces
  const formatNumberWithSpaces = (value) => {
    if (!value) return '';
    const numStr = String(value).replace(/\s/g, '');
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Parse number from string with spaces
  const parseNumber = (value) => {
    if (!value) return '';
    const cleaned = String(value).replace(/\s/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num;
  };

  // Handlers
  const handleFilterChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleMultiSelectChange = (field) => (event) => {
    const selectedOptions = event.target.options;
    const values = Array.from(selectedOptions).map(opt => opt.value);
    handleFilterChange(field, values);
  };

  const handleAmountFromChange = (e) => {
    const value = e.target.value;
    handleFilterChange('amountFrom', parseNumber(value));
  };

  const handleAmountToChange = (e) => {
    const value = e.target.value;
    handleFilterChange('amountTo', parseNumber(value));
  };

  const clearFilter = (field) => {
    // ✅ FIX: Odstranit pole/hodnotu z objektu místo nastavení na [] nebo ''
    // Jinak se při reloadu načte z localStorage prázdné pole a filtr zůstane "aktivní"
    const newFilters = { ...filters };
    delete newFilters[field];
    onFilterChange(newFilters);
  };

  return (
    <FiltersPanel>
      <FiltersHeader>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FontAwesomeIcon icon={faFilter} style={{ color: '#3b82f6' }} />
          Filtry a vyhledávání
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <SmartTooltip text="Vymaže všechny aktivní filtry včetně fulltext searche" icon="warning" preferredPosition="bottom">
            <ActionButton onClick={onClearAll} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white' }}>
              <FontAwesomeIcon icon={faEraser} />
              Vymazat filtry
            </ActionButton>
          </SmartTooltip>

          <SmartTooltip text="Skryje rozšířené filtry, fulltext search zůstane" icon="info" preferredPosition="bottom">
            <ActionButton onClick={() => setShowExtendedFilters(!showExtendedFilters)}>
              <FontAwesomeIcon icon={showExtendedFilters ? faChevronUp : faChevronDown} />
              {showExtendedFilters ? 'Skrýt filtr' : 'Rozšířený filtr'}
            </ActionButton>
          </SmartTooltip>

          <SmartTooltip text="Skryje celý filtrovací panel včetně fulltext searche" icon="warning" preferredPosition="bottom">
            <ActionButton onClick={onHide}>
              <FontAwesomeIcon icon={faTimes} />
              Skrýt
            </ActionButton>
          </SmartTooltip>
        </div>
      </FiltersHeader>

      {/* Fulltext search */}
      <FilterGroup>
        <FilterLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faSearch} />
            <span>Fulltext vyhledávání</span>
          </div>
          <HintText>
            💡 Bez diakritiky
          </HintText>
        </FilterLabel>
        <FilterInputWithIcon>
          <FontAwesomeIcon icon={faSearch} />
          <FilterInput
            type="text"
            placeholder="Hledat v evidenčním čísle, předmětu, objednateli..."
            value={globalFilter || ''}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            hasIcon
          />
          {globalFilter && (
            <ClearButton onClick={() => onGlobalFilterChange('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </FilterInputWithIcon>
      </FilterGroup>

      {/* Extended filters */}
      {showExtendedFilters && (
        <FiltersGrid>
          {/* Objednatel */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faUser} />
                Objednatel
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.objednatel?.length > 0}
                onClick={() => clearFilter('objednatel')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="objednatel"
                value={filters.objednatel || []}
                onChange={handleMultiSelectChange('objednatel')}
                options={sortedActiveUsers}
                placeholder="Vyberte objednatele..."
                icon={<FontAwesomeIcon icon={faUser} />}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Garant */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faUser} />
                Garant
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.garant?.length > 0}
                onClick={() => clearFilter('garant')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="garant"
                value={filters.garant || []}
                onChange={handleMultiSelectChange('garant')}
                options={sortedActiveUsers}
                placeholder="Vyberte guaranty..."
                icon={<FontAwesomeIcon icon={faUser} />}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Příkazce */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faUser} />
                Příkazce
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.prikazce?.length > 0}
                onClick={() => clearFilter('prikazce')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="prikazce"
                value={filters.prikazce || []}
                onChange={handleMultiSelectChange('prikazce')}
                options={sortedActiveApprovers}
                placeholder="Vyberte příkazce..."
                icon={<FontAwesomeIcon icon={faUser} />}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Schvalovatel */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faShield} />
                Schvalovatel
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.schvalovatel?.length > 0}
                onClick={() => clearFilter('schvalovatel')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="schvalovatel"
                value={filters.schvalovatel || []}
                onChange={handleMultiSelectChange('schvalovatel')}
                options={sortedActiveApprovers}
                placeholder="Vyberte schvalovatele..."
                icon={<FontAwesomeIcon icon={faShield} />}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Stav objednávky */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faList} />
                Stav objednávky
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.stav?.length > 0}
                onClick={() => clearFilter('stav')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="stav"
                value={filters.stav || []}
                onChange={handleMultiSelectChange('stav')}
                options={statusOptions}
                placeholder="Vyberte stavy..."
                icon={<FontAwesomeIcon icon={faList} />}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Datum od-do */}
          <DateRangeGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faCalendarAlt} />
                Datum od - do
              </FilterLabelLeft>
            </FilterLabel>
            <DateRangeInputs>
              <DateInputWrapper>
                <DatePicker
                  fieldName="dateFrom"
                  value={filters.dateFrom || ''}
                  onChange={(value) => handleFilterChange('dateFrom', value || '')}
                  placeholder="Datum od"
                />
              </DateInputWrapper>
              <DateSeparator>—</DateSeparator>
              <DateInputWrapper>
                <DatePicker
                  fieldName="dateTo"
                  value={filters.dateTo || ''}
                  onChange={(value) => handleFilterChange('dateTo', value || '')}
                  placeholder="Datum do"
                />
              </DateInputWrapper>
            </DateRangeInputs>
          </DateRangeGroup>

          {/* Cena od-do */}
          <PriceRangeGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faMoneyBillWave} />
                Cena od - do (Kč)
              </FilterLabelLeft>
            </FilterLabel>
            <PriceRangeInputs>
              <PriceInputWrapper style={{ position: 'relative' }}>
                <FontAwesomeIcon icon={faMoneyBillWave} />
                <FilterInput
                  type="text"
                  placeholder="0"
                  value={formatNumberWithSpaces(filters.amountFrom)}
                  onChange={handleAmountFromChange}
                  hasIcon
                  style={{ textAlign: 'right', paddingRight: filters.amountFrom ? '2.8rem' : '2.5rem' }}
                />
                {filters.amountFrom && (
                  <button
                    type="button"
                    onClick={() => clearFilter('amountFrom')}
                    title="Smazat minimum"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: 'none',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'normal',
                      lineHeight: '1',
                      transition: 'all 0.15s ease',
                      zIndex: 2,
                      padding: 0,
                      opacity: 0.7
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#64748b';
                      e.target.style.transform = 'translateY(-50%) scale(1.15)';
                      e.target.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#94a3b8';
                      e.target.style.transform = 'translateY(-50%)';
                      e.target.style.opacity = '0.7';
                    }}
                    onMouseDown={(e) => {
                      e.target.style.transform = 'translateY(-50%) scale(0.9)';
                    }}
                    onMouseUp={(e) => {
                      e.target.style.transform = 'translateY(-50%) scale(1.15)';
                    }}
                  >
                    ×
                  </button>
                )}
              </PriceInputWrapper>
              <PriceSeparator>—</PriceSeparator>
              <PriceInputWrapper style={{ position: 'relative' }}>
                <FontAwesomeIcon icon={faMoneyBillWave} />
                <FilterInput
                  type="text"
                  placeholder="∞"
                  value={formatNumberWithSpaces(filters.amountTo)}
                  onChange={handleAmountToChange}
                  hasIcon
                  style={{ textAlign: 'right', paddingRight: filters.amountTo ? '2.8rem' : '2.5rem' }}
                />
                {filters.amountTo && (
                  <button
                    type="button"
                    onClick={() => clearFilter('amountTo')}
                    title="Smazat maximum"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: 'none',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'normal',
                      lineHeight: '1',
                      transition: 'all 0.15s ease',
                      zIndex: 2,
                      padding: 0,
                      opacity: 0.7
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#64748b';
                      e.target.style.transform = 'translateY(-50%) scale(1.15)';
                      e.target.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#94a3b8';
                      e.target.style.transform = 'translateY(-50%)';
                      e.target.style.opacity = '0.7';
                    }}
                    onMouseDown={(e) => {
                      e.target.style.transform = 'translateY(-50%) scale(0.9)';
                    }}
                    onMouseUp={(e) => {
                      e.target.style.transform = 'translateY(-50%) scale(1.15)';
                    }}
                  >
                    ×
                  </button>
                )}
              </PriceInputWrapper>
            </PriceRangeInputs>
          </PriceRangeGroup>

          {/* Limitované příslíby - vpravo pod Stav objednávky, za Cena od-do */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faFileContract} />
                Limitované příslíby
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                visible={filters.lp_kody?.length > 0}
                onClick={() => clearFilter('lp_kody')}
                title="Vymazat filtr"
              >
                <FontAwesomeIcon icon={faTimes} />
              </FilterClearButton>
            </FilterLabel>
            <SelectWithIcon>
              <MultiSelectLocal
                field="lp_kody"
                value={filters.lp_kody || []}
                onChange={handleMultiSelectChange('lp_kody')}
                options={lpOptions}
                placeholder="Vyberte LP kódy..."
                icon={<FontAwesomeIcon icon={faFileContract} />}
                showSecondColumn={true}
              />
            </SelectWithIcon>
          </FilterGroup>

          {/* Stav registru */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faFileContract} />
                Stav registru
              </FilterLabelLeft>
            </FilterLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filters.maBytZverejneno ? '600' : '400',
                color: filters.maBytZverejneno ? '#f59e0b' : '#4b5563'
              }}>
                <input
                  type="checkbox"
                  checked={filters.maBytZverejneno || false}
                  onChange={(e) => handleFilterChange('maBytZverejneno', e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#f59e0b'
                  }}
                />
                <span>Má být zveřejněno</span>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filters.byloZverejneno ? '600' : '400',
                color: filters.byloZverejneno ? '#10b981' : '#4b5563'
              }}>
                <input
                  type="checkbox"
                  checked={filters.byloZverejneno || false}
                  onChange={(e) => handleFilterChange('byloZverejneno', e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#10b981'
                  }}
                />
                <span>Bylo již zveřejněno</span>
              </label>
            </div>
          </FilterGroup>

          {/* Mimořádné události */}
          <FilterGroup>
            <FilterLabel>
              <FilterLabelLeft>
                <FontAwesomeIcon icon={faBoltLightning} />
                Mimořádné události
              </FilterLabelLeft>
            </FilterLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filters.mimoradneObjednavky ? '600' : '400',
                color: filters.mimoradneObjednavky ? '#dc2626' : '#4b5563'
              }}>
                <input
                  type="checkbox"
                  checked={filters.mimoradneObjednavky || false}
                  onChange={(e) => handleFilterChange('mimoradneObjednavky', e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#dc2626'
                  }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Krize / Havárie
                </span>
              </label>
            </div>
          </FilterGroup>
        </FiltersGrid>
      )}
    </FiltersPanel>
  );
};

export default OrdersFiltersV3Full;
