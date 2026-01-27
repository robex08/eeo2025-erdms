import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faMinus, faFilter, faSearch, faCalendar, 
  faMoneyBill, faFileInvoice, faEdit, 
  faTrash, faCheckCircle, faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';

/**
 * 📋 EVIDENCE ROČNÍCH POPLATKŮ
 * 
 * Stránka pro správu ročních poplatků vázaných na smlouvy
 * - Rozbalitelné řádky (dropdown) podle vzoru Order V3
 * - Automatické generování položek podle typu platby (měsíční/kvartální/roční)
 * - Integrace se smlouvami a fakturami
 * 
 * ⚠️ DATA: Aktuálně MOCKDATA pro testování UI
 * Po otestování připojit na API endpoints:
 * - POST /api.eeo/annual-fees/list (s filtry)
 * - POST /api.eeo/annual-fees/detail (s položkami)
 * 
 * @version 1.1.0
 * @date 2026-01-27
 */

// 🎨 STYLED COMPONENTS

const PageContainer = styled.div`
  width: 100%;
  padding: 16px;
  margin: 0;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Využití celé šířky obrazovky jako u Order V3 */
  @media (min-width: 1920px) {
    padding: 20px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .beta-badge {
    padding: 4px 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    letter-spacing: 0.5px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: white;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const FiltersBar = styled.div`
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #d1d5db;
  }
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 8px 12px 8px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white;
  min-width: 300px;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 18px;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
  font-size: 0.875rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-bottom: 2px solid #e5e7eb;
`;

const Th = styled.th`
  padding: 12px 8px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  white-space: nowrap;
`;

const Tbody = styled.tbody`
  tr:hover {
    background: #f9fafb;
  }
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
  
  ${props => props.clickable && `
    cursor: pointer;
  `}
`;

const Td = styled.td`
  padding: 12px 8px;
  color: #1e293b;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  
  ${props => {
    switch(props.status) {
      case 'ZAPLACENO':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'NEZAPLACENO':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'V_RESENI':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const SubItemsContainer = styled.tr`
  background: #f9fafb;
`;

const SubItemsWrapper = styled.td`
  padding: 0 !important;
`;

const SubItemsTable = styled.table`
  width: 100%;
  background: #fafbfc;
  border-left: 4px solid #10b981;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
`;

const SubItemRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SubItemCell = styled.td`
  padding: 10px 12px;
  padding-left: ${props => props.indent ? '48px' : '16px'};
  color: #64748b;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
`;

// II. Styled komponenty pro inline "Nový řádek" formulář
const NewRowTr = styled.tr`
  background: #f0fdf4;
  border: 2px solid #10b981;
  
  &:hover {
    background: #dcfce7;
  }
`;

const NewRowButton = styled.button`
  background: transparent;
  border: 1px dashed #10b981;
  border-radius: 4px;
  color: #10b981;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  transition: all 0.15s ease;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    background: #10b981;
    color: white;
    border-style: solid;
  }
`;

const InlineInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }
`;

const InlineSelect = styled.select`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 0.95rem;
    margin: 0;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px auto;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// 🧩 MAIN COMPONENT

function AnnualFeesPage() {
  const { userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  // State
  const [loading, setLoading] = useState(true);
  const [annualFees, setAnnualFees] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showNewRow, setShowNewRow] = useState(false); // II. Inline nový řádek
  const [filters, setFilters] = useState({
    rok: new Date().getFullYear(),
    druh: 'all',
    platba: 'all',
    stav: 'all',
    smlouva: ''
  });
  
  // Load data
  useEffect(() => {
    loadAnnualFees();
  }, [filters]);
  
  const loadAnnualFees = async () => {
    try {
      setLoading(true);
      
      // TODO: Implementovat API call
      // const response = await fetch('/api.eeo/annual-fees/list', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     token: userDetail.token,
      //     username: userDetail.username,
      //     filters: filters
      //   })
      // });
      
      // Mockdata pro testování UI
      const mockData = [
        {
          id: 1,
          smlouva_cislo: '12548',
          dodavatel_nazev: 'XY s.r.o.',
          nazev: 'Roční poplatky 2026 - Nájem kanceláří',
          rok: 2026,
          druh: 'NAJEMNI',
          druh_nazev: 'Nájemní',
          platba: 'MESICNI',
          platba_nazev: 'Měsíční',
          celkova_castka: 12000.00,
          zaplaceno_celkem: 1000.00,
          zbyva_zaplatit: 11000.00,
          stav: 'NEZAPLACENO',
          stav_nazev: 'Nezaplaceno',
          pocet_polozek: 12,
          pocet_zaplaceno: 1,
          polozky: [
            { id: 1, poradi: 1, nazev_polozky: 'Leden 2026', castka: 1000.00, datum_splatnosti: '2026-01-20', datum_zaplaceni: '2026-01-20', stav: 'ZAPLACENO', faktura_cislo: 'FA123456' },
            { id: 2, poradi: 2, nazev_polozky: 'Únor 2026', castka: 1000.00, datum_splatnosti: '2026-02-20', datum_zaplaceni: null, stav: 'NEZAPLACENO', faktura_cislo: null },
            { id: 3, poradi: 3, nazev_polozky: 'Březen 2026', castka: 1000.00, datum_splatnosti: '2026-03-20', datum_zaplaceni: null, stav: 'NEZAPLACENO', faktura_cislo: null }
          ]
        }
      ];
      
      setAnnualFees(mockData);
      
    } catch (error) {
      console.error('Chyba při načítání ročních poplatků:', error);
      showToast('Chyba při načítání ročních poplatků', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK'
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faMoneyBill} />
          Evidence ročních poplatků
          <span className="beta-badge">BETA</span>
        </PageTitle>
        {/* II. Tlačítko přesunuto do tabulky jako inline řádek */}
      </PageHeader>
      
      <FiltersBar>
        <FilterGroup>
          <FilterLabel>Rok</FilterLabel>
          <Select 
            value={filters.rok} 
            onChange={(e) => handleFilterChange('rok', e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Druh</FilterLabel>
          <Select 
            value={filters.druh} 
            onChange={(e) => handleFilterChange('druh', e.target.value)}
          >
            <option value="all">Vše</option>
            <option value="NAJEMNI">Nájemní</option>
            <option value="ENERGIE">Energie</option>
            <option value="POPLATKY">Poplatky</option>
            <option value="JINE">Jiné</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Typ platby</FilterLabel>
          <Select 
            value={filters.platba} 
            onChange={(e) => handleFilterChange('platba', e.target.value)}
          >
            <option value="all">Vše</option>
            <option value="MESICNI">Měsíční</option>
            <option value="KVARTALNI">Kvartální</option>
            <option value="ROCNI">Roční</option>
            <option value="JINA">Jiná</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Stav</FilterLabel>
          <Select 
            value={filters.stav} 
            onChange={(e) => handleFilterChange('stav', e.target.value)}
          >
            <option value="all">Vše</option>
            <option value="ZAPLACENO">Zaplaceno</option>
            <option value="NEZAPLACENO">Nezaplaceno</option>
            <option value="V_RESENI">V řešení</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup style={{ flex: 1 }}>
          <FilterLabel>Hledat smlouvu</FilterLabel>
          <SearchInput 
            type="text"
            placeholder="Číslo smlouvy nebo dodavatel..."
            value={filters.smlouva}
            onChange={(e) => handleFilterChange('smlouva', e.target.value)}
          />
        </FilterGroup>
      </FiltersBar>
      
      <TableContainer>
        {loading ? (
          <LoadingState>
            <div className="spinner"></div>
            <p>Načítání ročních poplatků...</p>
          </LoadingState>
        ) : annualFees.length === 0 ? (
          <EmptyState>
            <div className="icon">
              <FontAwesomeIcon icon={faMoneyBill} />
            </div>
            <h3>Žádné roční poplatky</h3>
            <p>Začněte vytvořením nového ročního poplatku</p>
          </EmptyState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th style={{width: '50px'}}></Th>
                <Th>Smlouva</Th>
                <Th>Dodavatel</Th>
                <Th>Název</Th>
                <Th>Druh / Platba</Th>
                <Th>Celková částka</Th>
                <Th>Zaplaceno</Th>
                <Th>Zbývá</Th>
                <Th>Položky</Th>
                <Th>Stav</Th>
              </tr>
            </Thead>
            <Tbody>
              {/* II. Inline řádek pro vytvoření nového ročního poplatku */}
              {!showNewRow ? (
                <NewRowTr>
                  <Td colSpan="10" style={{textAlign: 'center', padding: '12px'}}>
                    <NewRowButton onClick={() => setShowNewRow(true)}>
                      <FontAwesomeIcon icon={faPlus} />
                      Nový roční poplatek
                    </NewRowButton>
                  </Td>
                </NewRowTr>
              ) : (
                <NewRowTr>
                  <Td>
                    <NewRowButton onClick={() => setShowNewRow(false)} title="Zrušit">
                      <FontAwesomeIcon icon={faMinus} />
                    </NewRowButton>
                  </Td>
                  <Td>
                    <InlineInput placeholder="Smlouva #" />
                  </Td>
                  <Td>
                    <InlineInput placeholder="Dodavatel" disabled style={{background: '#f9fafb'}} />
                  </Td>
                  <Td>
                    <InlineInput placeholder="Název ročního poplatku" />
                  </Td>
                  <Td>
                    <InlineSelect>
                      <option value="">Druh...</option>
                      <option value="NAJEMNI">Nájemní</option>
                      <option value="ENERGIE">Energie</option>
                      <option value="POPLATKY">Poplatky</option>
                      <option value="JINE">Jiné</option>
                    </InlineSelect>
                    <InlineSelect style={{marginTop: '4px'}}>
                      <option value="">Platba...</option>
                      <option value="MESICNI">Měsíční (12x)</option>
                      <option value="KVARTALNI">Kvartální (4x)</option>
                      <option value="ROCNI">Roční (1x)</option>
                      <option value="JINA">Jiná</option>
                    </InlineSelect>
                  </Td>
                  <Td>
                    <InlineInput placeholder="Částka" type="number" />
                  </Td>
                  <Td colSpan="4" style={{textAlign: 'right'}}>
                    <Button variant="primary" style={{padding: '6px 16px', fontSize: '0.85rem', marginRight: '8px'}}>
                      💾 Uložit
                    </Button>
                    <Button variant="secondary" onClick={() => setShowNewRow(false)} style={{padding: '6px 16px', fontSize: '0.85rem'}}>
                      Zrušit
                    </Button>
                  </Td>
                </NewRowTr>
              )}
              
              {/* Existující řádky */}
              {annualFees.map(fee => (
                <React.Fragment key={fee.id}>
                  <Tr clickable onClick={() => toggleRow(fee.id)}>
                    <Td>
                      <ExpandButton title={expandedRows.has(fee.id) ? 'Sbalit' : 'Rozbalit'}>
                        <FontAwesomeIcon icon={expandedRows.has(fee.id) ? faMinus : faPlus} />
                      </ExpandButton>
                    </Td>
                    <Td><strong>{fee.smlouva_cislo}</strong></Td>
                    <Td>{fee.dodavatel_nazev}</Td>
                    <Td>{fee.nazev}</Td>
                    <Td>
                      <div>{fee.druh_nazev}</div>
                      <div style={{fontSize: '0.85rem', color: '#9ca3af'}}>{fee.platba_nazev}</div>
                    </Td>
                    <Td><strong>{formatCurrency(fee.celkova_castka)}</strong></Td>
                    <Td style={{color: '#10b981'}}>{formatCurrency(fee.zaplaceno_celkem)}</Td>
                    <Td style={{color: '#ef4444'}}>{formatCurrency(fee.zbyva_zaplatit)}</Td>
                    <Td>
                      {fee.pocet_zaplaceno}/{fee.pocet_polozek}
                    </Td>
                    <Td>
                      <StatusBadge status={fee.stav}>
                        {fee.stav === 'ZAPLACENO' && <FontAwesomeIcon icon={faCheckCircle} />}
                        {fee.stav === 'V_RESENI' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        {fee.stav_nazev}
                      </StatusBadge>
                    </Td>
                  </Tr>
                  
                  {expandedRows.has(fee.id) && fee.polozky && (
                    <SubItemsContainer>
                      <SubItemsWrapper colSpan="10">
                        <SubItemsTable>
                          <thead>
                            <tr>
                              <Th indent style={{background: '#f3f4f6'}}>Položka</Th>
                              <Th style={{background: '#f3f4f6'}}>Částka</Th>
                              <Th style={{background: '#f3f4f6'}}>Splatnost</Th>
                              <Th style={{background: '#f3f4f6'}}>Zaplaceno</Th>
                              <Th style={{background: '#f3f4f6'}}>Faktura</Th>
                              <Th style={{background: '#f3f4f6'}}>Stav</Th>
                              <Th style={{background: '#f3f4f6'}}>Akce</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.polozky.map(item => (
                              <SubItemRow key={item.id}>
                                <SubItemCell indent>
                                  <strong>{item.nazev_polozky}</strong>
                                </SubItemCell>
                                <SubItemCell>{formatCurrency(item.castka)}</SubItemCell>
                                <SubItemCell>{formatDate(item.datum_splatnosti)}</SubItemCell>
                                <SubItemCell>{formatDate(item.datum_zaplaceni)}</SubItemCell>
                                <SubItemCell>
                                  {item.faktura_cislo || '-'}
                                </SubItemCell>
                                <SubItemCell>
                                  <StatusBadge status={item.stav}>
                                    {item.stav === 'ZAPLACENO' ? 'Zaplaceno' : 'Nezaplaceno'}
                                  </StatusBadge>
                                </SubItemCell>
                                <SubItemCell>
                                  <Button variant="secondary" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                                    <FontAwesomeIcon icon={faEdit} />
                                    Upravit
                                  </Button>
                                </SubItemCell>
                              </SubItemRow>
                            ))}
                          </tbody>
                        </SubItemsTable>
                      </SubItemsWrapper>
                    </SubItemsContainer>
                  )}
                </React.Fragment>
              ))}
            </Tbody>
          </Table>
        )}
      </TableContainer>
    </PageContainer>
  );
}

export default AnnualFeesPage;
