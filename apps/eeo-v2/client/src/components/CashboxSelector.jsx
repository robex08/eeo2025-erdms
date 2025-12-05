/**
 * 🏦 Výběr pokladny s vyhledáváním
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faCheckCircle, faSearch, faChevronDown } from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PeriodSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SelectWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
`;

const SelectButton = styled.button`
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    border-color: #007bff;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const DropdownIcon = styled.span`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6c757d;
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
`;

const SearchWrapper = styled.div`
  position: relative;
  border-bottom: 1px solid #dee2e6;

  &:focus-within .search-icon {
    color: #007bff;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: none;
  font-size: 1rem;

  &:focus {
    outline: none;
  }
`;

const OptionsList = styled.div`
  max-height: 240px;
  overflow-y: auto;
`;

const Option = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: #f8f9fa;
  }

  ${props => props.$selected && `
    background: #e7f3ff;
    font-weight: 600;
  `}
`;

const OptionLabel = styled.span`
  flex: 1;
`;

const OptionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const OptionTitle = styled.div`
  font-weight: 500;
`;

const OptionSubtitle = styled.div`
  font-size: 0.875rem;
  color: #6c757d;
`;

const OptionBadge = styled.span`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #007bff;
  color: white;
  border-radius: 3px;
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  white-space: nowrap;
  font-weight: 600;

  ${props => {
    if (props.$status === 'aktivni') {
      return `
        background: #28a745;
        color: white;
      `;
    } else if (props.$status === 'uzavrena_uzivatelem') {
      return `
        background: #ffc107;
        color: #212529;
      `;
    } else if (props.$status === 'zamknuta_spravcem') {
      return `
        background: #dc3545;
        color: white;
      `;
    }
    return `
      background: #6c757d;
      color: white;
    `;
  }}
`;

const Info = styled.div`
  font-size: 0.875rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CashboxSelector = ({
  currentCashbox,
  userCashboxes = [],
  allCashboxes = [],
  permissions = {},
  canSeeAllCashboxes = false,
  onCashboxChange,
  currentYear,
  currentMonth,
  onPeriodChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus na search input při otevření
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const canReadAll = permissions.canReadAll || permissions.canManage;

  // ✅ Stabilní detekce vlastnictví aktuální pokladny pomocí ID
  const isCurrentCashboxOwned = useMemo(() => {
    if (!currentCashbox) return false;
    return userCashboxes.some(uc =>
      String(uc.id) === String(currentCashbox.id) ||
      (uc.cislo_pokladny && String(uc.cislo_pokladny) === String(currentCashbox.cislo_pokladny))
    );
  }, [currentCashbox, userCashboxes]);

  const availableCashboxes = useMemo(() => {
    let boxes = [];
    if (canReadAll && allCashboxes.length > 0) {
      // ✅ FIX: Pro adminy - zobrazit JEN hlavní assignments (je_hlavni === 1)
      // aby se každá pokladna zobrazila jen jednou
      boxes = allCashboxes.filter(cb => parseInt(cb.je_hlavni, 10) === 1);

      // Pokud žádný assignment nemá je_hlavni=1, vzít první z každé pokladny
      if (boxes.length === 0) {
        const seen = new Set();
        boxes = allCashboxes.filter(cb => {
          const key = cb.cislo_pokladny || cb.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    } else {
      boxes = userCashboxes;
    }
    return boxes;
  }, [canReadAll, allCashboxes, userCashboxes]);

  // Filtrované pokladny podle hledání
  const filteredCashboxes = useMemo(() => {
    if (!searchQuery.trim()) return availableCashboxes;

    const query = searchQuery.toLowerCase();
    return availableCashboxes.filter(cb => {
      const number = String(cb.cislo_pokladny || '').toLowerCase();
      const name = (cb.nazev || cb.nazev_pracoviste || '').toLowerCase();
      const userName = (cb.uzivatel_cele_jmeno ||
                       (cb.uzivatel_jmeno && cb.uzivatel_prijmeni
                         ? `${cb.uzivatel_jmeno} ${cb.uzivatel_prijmeni}`
                         : '')).toLowerCase();
      const lokalita = (cb.lokalita_nazev || cb.lokalita_kod || '').toLowerCase();
      const usek = (cb.usek_nazev || '').toLowerCase();
      const location = (cb.nazev_pracoviste || cb.kod_pracoviste || '').toLowerCase();

      return number.includes(query) ||
             name.includes(query) ||
             userName.includes(query) ||
             lokalita.includes(query) ||
             usek.includes(query) ||
             location.includes(query);
    });
  }, [availableCashboxes, searchQuery]);

  const handleSelect = (cashbox) => {
    if (onCashboxChange) {
      onCashboxChange(cashbox);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const getCurrentLabel = () => {
    if (!currentCashbox) return { label: 'Vyberte pokladnu...', isOwn: false };

    const userName = currentCashbox.uzivatel_cele_jmeno ||
                     (currentCashbox.uzivatel_jmeno && currentCashbox.uzivatel_prijmeni
                       ? `${currentCashbox.uzivatel_jmeno} ${currentCashbox.uzivatel_prijmeni}`
                       : null);
    const lokalita = currentCashbox.lokalita_nazev || currentCashbox.lokalita_kod || null;
    const usek = currentCashbox.usek_nazev || null;
    const location = currentCashbox.nazev_pracoviste || currentCashbox.kod_pracoviste || null;
    const cashboxName = currentCashbox.nazev || currentCashbox.nazev_pracoviste || '';

    // Formát: č. XXX - Název pokladny (Celé jméno uživatele, Lokalita, Úsek, Oddělení)
    let label = '';
    if (isCurrentCashboxOwned) label += '★ '; // Hvězdička pro vlastní pokladny
    label += `č. ${currentCashbox.cislo_pokladny}`;
    if (cashboxName) label += ` - ${cashboxName}`;

    // Přidat závorky s info
    const details = [];
    if (userName) details.push(userName);
    if (lokalita) details.push(lokalita);
    if (usek) details.push(usek);
    if (location) details.push(location);
    if (details.length > 0) {
      label += ` (${details.join(', ')})`;
    }

    return { label, isOwn: isCurrentCashboxOwned };
  };

  // Měsíce pro select
  const months = [
    { value: 1, label: 'Leden' },
    { value: 2, label: 'Únor' },
    { value: 3, label: 'Březen' },
    { value: 4, label: 'Duben' },
    { value: 5, label: 'Květen' },
    { value: 6, label: 'Červen' },
    { value: 7, label: 'Červenec' },
    { value: 8, label: 'Srpen' },
    { value: 9, label: 'Září' },
    { value: 10, label: 'Říjen' },
    { value: 11, label: 'Listopad' },
    { value: 12, label: 'Prosinec' }
  ];

  // Roky - od 2025 (fixní start) do aktuálního roku
  const now = new Date();
  const currentYearNow = now.getFullYear();
  const currentMonthNow = now.getMonth() + 1; // 1-12
  const MIN_YEAR = 2025; // ✅ Minimální rok - začátek systému pokladní knihy

  const years = [];
  for (let y = MIN_YEAR; y <= currentYearNow; y++) {
    years.push(y);
  }

  // ✅ Omezit měsíce když je vybraný aktuální rok
  const availableMonths = useMemo(() => {
    if (currentYear === currentYearNow) {
      // Aktuální rok - jen měsíce do teď
      return months.filter(m => m.value <= currentMonthNow);
    }
    // Starší roky - všechny měsíce
    return months;
  }, [currentYear, currentYearNow, currentMonthNow]);

  if (availableCashboxes.length <= 1 && !onPeriodChange) {
    return null;
  }

  return (
    <Container>
      {/* Řádek 1: Výběr měsíce a roku */}
      {onPeriodChange && (
        <Row>
          <Label>
            📅 Období:
          </Label>
          <PeriodSelect
            value={currentMonth}
            onChange={(e) => onPeriodChange(currentYear, parseInt(e.target.value))}
          >
            {availableMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </PeriodSelect>
          <PeriodSelect
            value={currentYear}
            onChange={(e) => {
              const newYear = parseInt(e.target.value);
              // ✅ Pokud je vybraný aktuální rok a měsíc je v budoucnosti, upravit na aktuální měsíc
              let newMonth = currentMonth;
              if (newYear === currentYearNow && currentMonth > currentMonthNow) {
                newMonth = currentMonthNow;
              }
              onPeriodChange(newYear, newMonth);
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </PeriodSelect>
          <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            {availableCashboxes.length} {availableCashboxes.length === 1 ? 'pokladna' :
             availableCashboxes.length < 5 ? 'pokladny' : 'pokladen'} v tomto období
          </span>
        </Row>
      )}

      {/* Řádek 2: Výběr pokladny */}
      {availableCashboxes.length > 1 && (
        <Row>
          <Label>
            <FontAwesomeIcon icon={faCalculator} />
            Pokladna:
          </Label>

      <SelectWrapper ref={dropdownRef}>
        <SelectButton
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {(() => {
            const labelData = getCurrentLabel();
            return (
              <span style={{
                flex: 1,
                fontWeight: labelData.isOwn ? 'bold' : 'normal',
                color: labelData.isOwn ? '#007bff' : 'inherit'
              }}>
                {labelData.label}
              </span>
            );
          })()}
          {currentCashbox?.stav_knihy && (
            <StatusBadge
              $status={currentCashbox.stav_knihy}
              style={{ marginLeft: '0.5rem' }}
            >
              {currentCashbox.stav_knihy === 'aktivni' && '✅ Aktivní'}
              {currentCashbox.stav_knihy === 'uzavrena_uzivatelem' && '⚠️ Uzavřena'}
              {currentCashbox.stav_knihy === 'zamknuta_spravcem' && '🔒 Zamknuta'}
            </StatusBadge>
          )}
        </SelectButton>

        <DropdownIcon>
          <FontAwesomeIcon icon={faChevronDown} />
        </DropdownIcon>

        {isOpen && (
          <Dropdown>
            <SearchWrapper>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder="Hledat podle čísla nebo názvu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="search-icon">
                <FontAwesomeIcon icon={faSearch} />
              </SearchIcon>
            </SearchWrapper>

            <OptionsList>
              {filteredCashboxes.length === 0 ? (
                <Option style={{ color: '#6c757d', cursor: 'default' }}>
                  Žádné výsledky
                </Option>
              ) : (
                filteredCashboxes.map((cashbox, index) => {
                  // Sestavit info o uživateli
                  const userName = cashbox.uzivatel_cele_jmeno ||
                                   (cashbox.uzivatel_jmeno && cashbox.uzivatel_prijmeni
                                     ? `${cashbox.uzivatel_jmeno} ${cashbox.uzivatel_prijmeni}`
                                     : null);
                  const lokalita = cashbox.lokalita_nazev || cashbox.lokalita_kod || null;
                  const usek = cashbox.usek_nazev || null;
                  const location = cashbox.nazev_pracoviste || cashbox.kod_pracoviste || null;

                  // ✅ Zkontrolovat, jestli je to pokladna přihlášeného uživatele
                  // Zvýrazní se pouze pokladny, kde je uživatel vlastníkem (v userCashboxes)
                  // Porovnáváme jak podle ID, tak podle čísla pokladny pro jistotu
                  const isMyOwnCashbox = userCashboxes.some(uc =>
                    String(uc.id) === String(cashbox.id) ||
                    (uc.cislo_pokladny && String(uc.cislo_pokladny) === String(cashbox.cislo_pokladny))
                  );

                  // Stav knihy
                  const bookStatus = cashbox.stav_knihy || 'aktivni';
                  const statusLabels = {
                    'aktivni': '✅ Aktivní',
                    'uzavrena_uzivatelem': '⚠️ Uzavřena',
                    'zamknuta_spravcem': '🔒 Zamknuta'
                  };

                  return (
                    <Option
                      key={`${cashbox.id}-${cashbox.cislo_pokladny}-${index}`}
                      onClick={() => handleSelect(cashbox)}
                      $selected={currentCashbox?.id === cashbox.id}
                    >
                      <OptionLabel>
                        <OptionDetails>
                          <OptionTitle style={{
                            fontWeight: isMyOwnCashbox ? 'bold' : 'normal',
                            color: isMyOwnCashbox ? '#007bff' : 'inherit'
                          }}>
                            {isMyOwnCashbox && '★ '}č. {cashbox.cislo_pokladny} - {cashbox.nazev || cashbox.nazev_pracoviste || 'Bez názvu'}
                          </OptionTitle>
                          {(userName || lokalita || usek || location) && (
                            <OptionSubtitle>
                              {userName && `👤 ${userName}`}
                              {userName && (lokalita || usek || location) && ' • '}
                              {lokalita && `🏢 ${lokalita}`}
                              {lokalita && (usek || location) && ' • '}
                              {usek && `📋 ${usek}`}
                              {usek && location && ' • '}
                              {location && `📍 ${location}`}
                            </OptionSubtitle>
                          )}
                        </OptionDetails>
                      </OptionLabel>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <StatusBadge $status={bookStatus}>
                          {statusLabels[bookStatus] || bookStatus}
                        </StatusBadge>
                        {currentCashbox?.id === cashbox.id && (
                          <OptionBadge>
                            <FontAwesomeIcon icon={faCheckCircle} /> Vybrána
                          </OptionBadge>
                        )}
                      </div>
                    </Option>
                  );
                })
              )}
            </OptionsList>
          </Dropdown>
        )}
        </SelectWrapper>

        {currentCashbox && (
          <Info>
            <FontAwesomeIcon icon={faCheckCircle} />
            {' '}{parseInt(currentCashbox.je_hlavni, 10) === 1
              ? 'Hlavní pokladník'
              : 'Zástupce'}
          </Info>
        )}
      </Row>
      )}
    </Container>
  );
};

export default CashboxSelector;
