/**
 * OrdersFiltersV3.js
 * 
 * Komponenta pro filtrování objednávek
 * Obsahuje veškeré filtry pro Orders V3
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilter,
  faXmark,
  faSearch,
  faCalendarAlt,
  faUser,
  faBuilding,
  faMoneyBill,
  faFileContract,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const FiltersContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FiltersHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FiltersTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #3b82f6;
    font-size: 1.25rem;
  }
`;

const ClearAllButton = styled.button`
  background: transparent;
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    color: white;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    font-size: 0.9rem;
    color: #94a3b8;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FilterDateRange = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.5rem;
  align-items: center;

  span {
    text-align: center;
    color: #94a3b8;
    font-size: 0.875rem;
  }
`;

const ActiveFiltersBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const ActiveFilterChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #1e40af;
  font-weight: 600;

  button {
    background: transparent;
    border: none;
    color: #1e40af;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    transition: color 0.15s ease;

    &:hover {
      color: #dc2626;
    }
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrdersFiltersV3 - Filtrační komponenta pro Orders V3
 */
const OrdersFiltersV3 = ({
  filters = {},
  onFilterChange,
  onClearAll,
  availableYears = [],
  availableStates = [],
  availableUsers = [],
  availableSuppliers = [],
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange?.(key, value);
  };

  const handleRemoveFilter = (key) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFilterChange?.(key, null);
  };

  const handleClearAll = () => {
    setLocalFilters({});
    onClearAll?.();
  };

  const activeFiltersCount = Object.keys(localFilters).filter(
    key => localFilters[key] !== null && localFilters[key] !== '' && localFilters[key] !== undefined
  ).length;

  const getFilterLabel = (key, value) => {
    const labels = {
      cislo_objednavky: 'Číslo',
      predmet: 'Předmět',
      dodavatel_nazev: 'Dodavatel',
      stav_objednavky: 'Stav',
      objednatel: 'Objednatel',
      garant: 'Garant',
      prikazce: 'Příkazce',
      schvalovatel: 'Schvalovatel',
      min_cena: 'Min. cena',
      max_cena: 'Max. cena',
      dt_od: 'Od',
      dt_do: 'Do',
      registr_smluv: 'Registr smluv',
      mimoradna_udalost: 'Mimořádná událost',
    };
    return `${labels[key] || key}: ${value}`;
  };

  return (
    <FiltersContainer>
      <FiltersHeader>
        <FiltersTitle>
          <FontAwesomeIcon icon={faFilter} />
          Filtry
          {activeFiltersCount > 0 && (
            <span style={{ 
              background: '#3b82f6', 
              color: 'white', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '12px', 
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {activeFiltersCount}
            </span>
          )}
        </FiltersTitle>
        <ClearAllButton 
          onClick={handleClearAll}
          disabled={activeFiltersCount === 0}
        >
          <FontAwesomeIcon icon={faXmark} />
          Vymazat vše
        </ClearAllButton>
      </FiltersHeader>

      <FiltersGrid>
        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faSearch} />
            Číslo objednávky
          </FilterLabel>
          <FilterInput
            type="text"
            placeholder="např. OBJ-2026-0001"
            value={localFilters.cislo_objednavky || ''}
            onChange={(e) => handleFilterChange('cislo_objednavky', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faSearch} />
            Předmět
          </FilterLabel>
          <FilterInput
            type="text"
            placeholder="Hledat v předmětu..."
            value={localFilters.predmet || ''}
            onChange={(e) => handleFilterChange('predmet', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faBuilding} />
            Dodavatel
          </FilterLabel>
          {availableSuppliers.length > 0 ? (
            <FilterSelect
              value={localFilters.dodavatel_nazev || ''}
              onChange={(e) => handleFilterChange('dodavatel_nazev', e.target.value)}
            >
              <option value="">-- Všichni dodavatelé --</option>
              {availableSuppliers.map(supplier => (
                <option key={supplier.id} value={supplier.nazev}>
                  {supplier.nazev}
                </option>
              ))}
            </FilterSelect>
          ) : (
            <FilterInput
              type="text"
              placeholder="Název dodavatele..."
              value={localFilters.dodavatel_nazev || ''}
              onChange={(e) => handleFilterChange('dodavatel_nazev', e.target.value)}
            />
          )}
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faFileContract} />
            Stav objednávky
          </FilterLabel>
          <FilterSelect
            value={localFilters.stav_objednavky || ''}
            onChange={(e) => handleFilterChange('stav_objednavky', e.target.value)}
          >
            <option value="">-- Všechny stavy --</option>
            <option value="NOVA">Nová</option>
            <option value="KE_SCHVALENI">Ke schválení</option>
            <option value="SCHVALENA">Schválená</option>
            <option value="ZAMITNUTA">Zamítnutá</option>
            <option value="ROZPRACOVANA">Rozpracovaná</option>
            <option value="ODESLANA">Odeslaná</option>
            <option value="POTVRZENA">Potvrzená</option>
            <option value="K_UVEREJNENI_DO_REGISTRU">K uveřejnění</option>
            <option value="UVEREJNENA">Uveřejněná</option>
            <option value="DOKONCENA">Dokončená</option>
            <option value="ZRUSENA">Zrušená</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faUser} />
            Objednatel
          </FilterLabel>
          {availableUsers.length > 0 ? (
            <FilterSelect
              value={localFilters.objednatel || ''}
              onChange={(e) => handleFilterChange('objednatel', e.target.value)}
            >
              <option value="">-- Všichni --</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.cele_jmeno}
                </option>
              ))}
            </FilterSelect>
          ) : (
            <FilterInput
              type="text"
              placeholder="Jméno objednatele..."
              value={localFilters.objednatel || ''}
              onChange={(e) => handleFilterChange('objednatel', e.target.value)}
            />
          )}
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faUser} />
            Garant
          </FilterLabel>
          <FilterInput
            type="text"
            placeholder="Jméno garanta..."
            value={localFilters.garant || ''}
            onChange={(e) => handleFilterChange('garant', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faMoneyBill} />
            Cena od - do (Kč)
          </FilterLabel>
          <FilterDateRange>
            <FilterInput
              type="number"
              placeholder="Min"
              value={localFilters.min_cena || ''}
              onChange={(e) => handleFilterChange('min_cena', e.target.value)}
            />
            <span>—</span>
            <FilterInput
              type="number"
              placeholder="Max"
              value={localFilters.max_cena || ''}
              onChange={(e) => handleFilterChange('max_cena', e.target.value)}
            />
          </FilterDateRange>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faCalendarAlt} />
            Datum od - do
          </FilterLabel>
          <FilterDateRange>
            <FilterInput
              type="date"
              value={localFilters.dt_od || ''}
              onChange={(e) => handleFilterChange('dt_od', e.target.value)}
            />
            <span>—</span>
            <FilterInput
              type="date"
              value={localFilters.dt_do || ''}
              onChange={(e) => handleFilterChange('dt_do', e.target.value)}
            />
          </FilterDateRange>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faFileContract} />
            Registr smluv
          </FilterLabel>
          <FilterSelect
            value={localFilters.registr_smluv || ''}
            onChange={(e) => handleFilterChange('registr_smluv', e.target.value)}
          >
            <option value="">-- Všechny --</option>
            <option value="ANO">Ano</option>
            <option value="NE">Ne</option>
            <option value="ZVEREJNENO">Zveřejněno</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Mimořádná událost</FilterLabel>
          <FilterSelect
            value={localFilters.mimoradna_udalost || ''}
            onChange={(e) => handleFilterChange('mimoradna_udalost', e.target.value)}
          >
            <option value="">-- Všechny --</option>
            <option value="ANO">Ano</option>
            <option value="NE">Ne</option>
          </FilterSelect>
        </FilterGroup>
      </FiltersGrid>

      {activeFiltersCount > 0 && (
        <ActiveFiltersBar>
          {Object.keys(localFilters).map(key => {
            const value = localFilters[key];
            if (!value || value === '') return null;
            
            return (
              <ActiveFilterChip key={key}>
                {getFilterLabel(key, value)}
                <button onClick={() => handleRemoveFilter(key)}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </ActiveFilterChip>
            );
          })}
        </ActiveFiltersBar>
      )}
    </FiltersContainer>
  );
};

export default OrdersFiltersV3;
