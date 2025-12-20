/**
 * Search Results Dropdown Component
 * 
 * Dropdown pod search inputem s:
 * - Kategoriemi (rozbalovací)
 * - Tabulkami s výsledky
 * - Highlight nalezených shod
 * - Loading/Empty states
 */

import React, { useState, useMemo, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import SlideInDetailPanel from './SlideInDetailPanel';
import { 
  UserDetailView, 
  OrderDetailView, 
  ContractDetailView, 
  InvoiceDetailView, 
  SupplierDetailView 
} from './EntityDetailViews';
import { getEntityDetail } from '../../services/apiEntityDetail';
import draftManager from '../../services/DraftManager';
import ConfirmDialog from '../ConfirmDialog';
import {
  faChevronDown,
  faChevronRight,
  faUser,
  faBox,
  faFileContract,
  faFileInvoice,
  faBuilding,
  faSpinner,
  faExternalLinkAlt,
  faTimes,
  faEye,
  faEdit,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// Styled components
const DropdownContainer = styled.div`
  position: fixed;
  top: ${props => props.$top || 'calc(100% + 8px)'}px;
  left: ${props => props.$left || 0}px;
  width: ${props => props.$width || 990}px;
  max-width: calc(100vw - 40px);
  max-height: ${props => props.$maxHeight || 600}px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  /* Zajistí, že se dropdown zobrazí i na menších obrazovkách */
  @media (max-width: 768px) {
    width: calc(100vw - 20px);
    left: 10px !important;
  }
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  position: relative;
`;

const HeaderTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;

  span {
    color: #3b82f6;
  }
`;

const HeaderMeta = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-right: 40px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #64748b;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  position: absolute;
  right: 16px;

  &:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const DropdownContent = styled.div`
  overflow-y: auto;
  flex: 1;
  
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const CategorySection = styled.div`
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`;

const CategoryHeader = styled.div`
  padding: 12px 16px;
  background: ${props => props.$expanded ? '#f8fafc' : 'white'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: #f8fafc;
  }

  &:active {
    background: #f1f5f9;
  }
`;

const CategoryIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: ${props => props.$color || '#e2e8f0'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
`;

const CategoryTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CategoryCount = styled.span`
  background: #e2e8f0;
  color: #475569;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const ExpandIcon = styled.div`
  color: #64748b;
  font-size: 12px;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(0deg)' : 'rotate(0deg)'};
`;

const CategoryContent = styled.div`
  max-height: ${props => props.$expanded ? 'none' : '0'};
  overflow: ${props => props.$expanded ? 'visible' : 'hidden'};
  transition: max-height 0.3s ease;
  background: #fafafa;
`;

const ResultTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const TableHeader = styled.thead`
  background: #f1f5f9;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.15s ease;
  cursor: text;
  user-select: text;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableCell = styled.td`
  padding: 10px 12px;
  color: #1e293b;
  vertical-align: middle;
  white-space: ${props => props.$noWrap ? 'nowrap' : 'normal'};

  &.highlight {
    background: #fef3c7;
    font-weight: 600;
    color: #92400e;
  }
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #e2e8f0;
    color: #3b82f6;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const IconButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
`;

const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #334155;
`;

const EmptyText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
`;

const WarningState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
`;

const WarningIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
`;

const WarningTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #f59e0b;
`;

const WarningText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
  color: #64748b;
`;

const LoadingState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  font-size: 32px;
  color: #3b82f6;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Ikony pro kategorie
const getCategoryIcon = (categoryKey) => {
  const icons = {
    users: { icon: faUser, color: '#3b82f6' },
    orders_2025: { icon: faBox, color: '#22c55e' },
    orders_legacy: { icon: faBox, color: '#94a3b8' },
    contracts: { icon: faFileContract, color: '#f59e0b' },
    invoices: { icon: faFileInvoice, color: '#ec4899' },
    suppliers: { icon: faBuilding, color: '#8b5cf6' },
    suppliers_from_orders: { icon: faBuilding, color: '#06b6d4' }  // 🆕 Cyan - odlišení od master seznamu
  };
  return icons[categoryKey] || { icon: faBox, color: '#64748b' };
};

/**
 * Highlight shod v textu
 */
const highlightMatch = (text, query) => {
  if (!text || !query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.toString().replace(regex, '<mark style="background: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>');
};

/**
 * Search Results Dropdown Component
 */
const SearchResultsDropdown = ({ results, loading, query, onClose, inputRef, username, token }) => {
  const navigate = useNavigate();
  
  // State pro rozbalené kategorie
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [position, setPosition] = useState({ top: 0, left: 0, width: 800, maxHeight: 600 });
  
  // State pro slide-in panel
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  
  // State pro confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    draftInfo: null,
    targetOrderId: null,
    onConfirm: null
  });

  /**
   * Calculate dropdown position based on input element and viewport
   */
  useEffect(() => {
    if (!inputRef?.current) return;

    const calculatePosition = () => {
      const inputRect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Optimální šířka dropdownu
      const dropdownWidth = Math.min(990, viewportWidth - 40);
      
      // Výška nad a pod inputem
      const spaceBelow = viewportHeight - inputRect.bottom - 20;
      const spaceAbove = inputRect.top - 20;
      
      // Max výška dropdownu
      const maxHeight = Math.max(Math.min(spaceBelow, 600), 300);
      
      // Určit zarovnání podle dostupného místa
      // Zkusit zarovnat na levou hranu inputu
      let left = inputRect.left;
      
      // Kontrola místa vpravo
      const spaceRight = viewportWidth - inputRect.left - 20;
      const spaceLeft = inputRect.right - 20;
      
      // Pokud není dost místa vpravo, zarovnat na pravou hranu inputu
      if (spaceRight < dropdownWidth && spaceLeft >= dropdownWidth) {
        left = inputRect.right - dropdownWidth;
      }
      
      // Zajistit, že se nevejde za okraj (fallback)
      if (left < 20) left = 20;
      if (left + dropdownWidth > viewportWidth - 20) {
        left = viewportWidth - dropdownWidth - 20;
      }
      
      setPosition({
        top: inputRect.bottom + 8,
        left,
        width: dropdownWidth,
        maxHeight
      });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);
    
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [inputRef]);

  /**
   * Toggle kategorie
   */
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  /**
   * Otevřít detail entity
   */
  const handleOpenDetail = (entity, categoryKey) => {
    const entityId = entity.id || entity.user_id || entity.order_id;
    
    // Rovnou použij data ze search výsledků - mají už všechny potřebné fieldy
    setSelectedEntity({
      type: categoryKey,
      id: entityId
    });
    setDetailData(entity); // Použij přímo data z vyhledávání
    setDetailLoading(false);
    setDetailError(null);
    setPanelOpen(true);
  };

  /**
   * Zavřít detail panel
   */
  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedEntity(null);
      setDetailData(null);
      setDetailError(null);
    }, 300);
  };

  /**
   * Zavřít panel i celý dropdown (při navigaci na objednávku)
   */
  const handleCloseAll = () => {
    setPanelOpen(false);
    setSelectedEntity(null);
    setDetailData(null);
    setDetailError(null);
    // Zavři i celý dropdown (callback do UniversalSearchInput)
    if (onClose) onClose();
  };

  /**
   * Přímá editace objednávky (bez slide panelu)
   */
  const handleDirectEdit = async (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const targetOrderId = parseInt(order.id || order.order_id);

    // Získej user_id
    let user_id = null;
    try {
      const userStr = localStorage.getItem('auth_user_persistent');
      if (userStr) {
        const userData = JSON.parse(userStr);
        user_id = userData?.id || userData?.user_id;
      }
    } catch (err) {
      console.error('SearchResultsDropdown - Chyba při čtení user_id:', err);
    }

    if (!user_id) {
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onClose) onClose();
      }, 100);
      return;
    }

    // Zkontroluj koncept
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    if (!hasDraft) {
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onClose) onClose();
      }, 100);
      return;
    }

    // Existuje draft
    const draftData = await draftManager.loadDraft();
    const draftOrderId = draftData.savedOrderId || draftData.formData?.id;

    // Pokud draft patří k TÉTO objednávce
    if (draftOrderId && String(draftOrderId) === String(targetOrderId)) {
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onClose) onClose();
      }, 100);
      return;
    }

    // Draft patří k JINÉ objednávce - zobraz custom confirm dialog
    const formData = draftData.formData || draftData;
    const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
    const isNewConcept = !draftData.savedOrderId && !formData.id;

    // Nastav dialog state
    setConfirmDialog({
      isOpen: true,
      title: 'Potvrzení editace objednávky',
      message: '',
      draftInfo: { draftTitle, isNewConcept },
      targetOrderId,
      onConfirm: () => {
        // 1. Smaž draft
        draftManager.deleteAllDraftKeys();
        
        // 2. Zavři dialog
        setConfirmDialog({
          isOpen: false,
          title: '',
          message: '',
          draftInfo: null,
          targetOrderId: null,
          onConfirm: null
        });
        
        // 3. Navigace
        navigate(`/order-form-25?edit=${targetOrderId}`);
        
        // 4. Zavři dropdown
        setTimeout(() => {
          if (onClose) onClose();
        }, 100);
      }
    });
  };

  /**
   * Render detail view podle typu entity
   */
  const renderDetailView = () => {
    if (!selectedEntity || !detailData) return null;

    if (detailError) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{detailError}</div>;
    }

    switch (selectedEntity.type) {
      case 'users':
        return <UserDetailView data={detailData} username={username} token={token} />;
      case 'orders_2025':
      case 'orders_legacy':
        return <OrderDetailView 
          data={detailData} 
          username={username} 
          token={token} 
          onCloseAll={handleCloseAll}
        />;
      case 'contracts':
        return <ContractDetailView data={detailData} username={username} token={token} />;
      case 'invoices':
        return <InvoiceDetailView data={detailData} username={username} token={token} />;
      case 'suppliers':
      case 'suppliers_from_orders':
        // Pro suppliers_from_orders zobrazit detail dodavatele (z master tabulky pokud existuje)
        return <SupplierDetailView data={detailData} username={username} token={token} onCloseAll={handleCloseAll} />;
      default:
        return <div>Nepodporovaný typ entity</div>;
    }
  };

  /**
   * Seřazené kategorie podle počtu výsledků
   */
  const sortedCategories = useMemo(() => {
    if (!results?.categories) return [];

    return Object.entries(results.categories)
      .filter(([_, cat]) => cat.total > 0)
      .sort(([_, a], [__, b]) => b.total - a.total)
      .map(([key, cat]) => ({ key, ...cat }));
  }, [results]);

  // Minimum characters warning
  if (query && query.length < 4) {
    return (
      <DropdownContainer
        $top={position.top}
        $left={position.left}
        $width={position.width}
        $maxHeight={position.maxHeight}
      >
        <WarningState>
          <WarningIcon>⚠️</WarningIcon>
          <WarningTitle>Zadejte alespoň 4 znaky</WarningTitle>
          <WarningText>
            Pro vyhledávání je potřeba zadat minimálně 4 znaky.
            <br /><br />
            💡 Pokračujte v psaní pro zahájení vyhledávání.
          </WarningText>
        </WarningState>
      </DropdownContainer>
    );
  }

  // Loading state
  if (loading) {
    return (
      <DropdownContainer
        $top={position.top}
        $left={position.left}
        $width={position.width}
        $maxHeight={position.maxHeight}
      >
        <LoadingState>
          <LoadingSpinner>
            <FontAwesomeIcon icon={faSpinner} />
          </LoadingSpinner>
          <div>Prohledávám databázi...</div>
        </LoadingState>
      </DropdownContainer>
    );
  }

  // Empty state
  if (results && results.total_results === 0) {
    return (
      <DropdownContainer
        $top={position.top}
        $left={position.left}
        $width={position.width}
        $maxHeight={position.maxHeight}
      >
        <EmptyState>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyTitle>Žádné výsledky</EmptyTitle>
          <EmptyText>
            Nenalezli jsme žádné záznamy odpovídající vašemu dotazu.
            <br /><br />
            💡 Zkuste zkrátit hledaný výraz nebo zkontrolovat překlepy.
          </EmptyText>
        </EmptyState>
      </DropdownContainer>
    );
  }

  // Results
  return (
    <DropdownContainer
      $top={position.top}
      $left={position.left}
      $width={position.width}
      $maxHeight={position.maxHeight}
    >
      <DropdownHeader>
        <HeaderTitle>
          Výsledky pro: <span>"{query}"</span>
        </HeaderTitle>
        <HeaderMeta>
          {results?.total_results || 0} výsledků za {results?.search_duration_ms || 0}ms
        </HeaderMeta>
        <CloseButton onClick={onClose} title="Zavřít">
          <FontAwesomeIcon icon={faTimes} />
        </CloseButton>
      </DropdownHeader>

      <DropdownContent>
        {sortedCategories.map(category => {
          const isExpanded = expandedCategories.has(category.key);
          const iconData = getCategoryIcon(category.key);

          return (
            <CategorySection key={category.key}>
              <CategoryHeader
                onClick={() => toggleCategory(category.key)}
                $expanded={isExpanded}
              >
                <CategoryIcon $color={iconData.color}>
                  <FontAwesomeIcon icon={iconData.icon} />
                </CategoryIcon>

                <CategoryTitle>
                  {category.category_label}
                  <CategoryCount>{category.total}</CategoryCount>
                </CategoryTitle>

                <ExpandIcon $expanded={isExpanded}>
                  <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                </ExpandIcon>
              </CategoryHeader>

              <CategoryContent $expanded={isExpanded}>
                {isExpanded && category.results && category.results.length > 0 && (
                  <ResultTable>
                    <TableHeader>
                      <tr>
                        {/* Dynamické sloupce podle kategorie */}
                        {category.key === 'users' && (
                          <>
                            <TableHeaderCell>Jméno</TableHeaderCell>
                            <TableHeaderCell>Email</TableHeaderCell>
                            <TableHeaderCell>Telefon</TableHeaderCell>
                            <TableHeaderCell>Pozice</TableHeaderCell>
                            <TableHeaderCell>Úsek</TableHeaderCell>
                            <TableHeaderCell>Lokalita</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                        {(category.key === 'orders_2025' || category.key === 'orders_legacy') && (
                          <>
                            <TableHeaderCell>Číslo</TableHeaderCell>
                            <TableHeaderCell>Předmět</TableHeaderCell>
                            <TableHeaderCell>Dodavatel</TableHeaderCell>
                            <TableHeaderCell>Cena</TableHeaderCell>
                            <TableHeaderCell>Datum</TableHeaderCell>
                            <TableHeaderCell>Stav</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                        {category.key === 'contracts' && (
                          <>
                            <TableHeaderCell>Číslo smlouvy</TableHeaderCell>
                            <TableHeaderCell>Název</TableHeaderCell>
                            <TableHeaderCell>Úsek</TableHeaderCell>
                            <TableHeaderCell>Firma</TableHeaderCell>
                            <TableHeaderCell>IČO</TableHeaderCell>
                            <TableHeaderCell>Platná do</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                        {category.key === 'invoices' && (
                          <>
                            <TableHeaderCell>Číslo faktury</TableHeaderCell>
                            <TableHeaderCell>Objednávka</TableHeaderCell>
                            <TableHeaderCell>Částka</TableHeaderCell>
                            <TableHeaderCell>Datum</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                        {category.key === 'suppliers' && (
                          <>
                            <TableHeaderCell>Název</TableHeaderCell>
                            <TableHeaderCell>Adresa</TableHeaderCell>
                            <TableHeaderCell>IČO</TableHeaderCell>
                            <TableHeaderCell>DIČ</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                        {category.key === 'suppliers_from_orders' && (
                          <>
                            <TableHeaderCell>Název</TableHeaderCell>
                            <TableHeaderCell>IČO</TableHeaderCell>
                            <TableHeaderCell>Kontakt</TableHeaderCell>
                            <TableHeaderCell>Počet obj.</TableHeaderCell>
                            <TableHeaderCell>Poslední použití</TableHeaderCell>
                            <TableHeaderCell style={{ width: '40px' }}></TableHeaderCell>
                          </>
                        )}
                      </tr>
                    </TableHeader>
                    <tbody>
                      {category.results.map((result, idx) => {
                        return (
                        <TableRow 
                          key={result.id || idx}
                          onDoubleClick={() => handleOpenDetail(result, category.key)}
                        >
                          {/* Users */}
                          {category.key === 'users' && (
                            <>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(`${result.titul_pred ? result.titul_pred + ' ' : ''}${result.jmeno} ${result.prijmeni}${result.titul_za ? ', ' + result.titul_za : ''}`, query) }} />
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.email, query) }} />
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.telefon, query) }} />
                              <TableCell>{result.pozice_nazev || '-'}</TableCell>
                              <TableCell>{result.usek || '-'}</TableCell>
                              <TableCell>{result.lokalita || '-'}</TableCell>
                              <TableCell>
                                <IconButton 
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(result, category.key); }}
                                  title="Zobrazit náhled"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </IconButton>
                              </TableCell>
                            </>
                          )}

                          {/* Orders */}
                          {(category.key === 'orders_2025' || category.key === 'orders_legacy') && (
                            <>
                              <TableCell $noWrap dangerouslySetInnerHTML={{ __html: highlightMatch(result.cislo_objednavky, query) }} />
                              <TableCell>{result.predmet}</TableCell>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.dodavatel_nazev, query) }} />
                              <TableCell $noWrap>{parseFloat(result.max_cena_s_dph || 0).toLocaleString('cs-CZ')} Kč</TableCell>
                              <TableCell $noWrap>{result.dt_vytvoreni ? new Date(result.dt_vytvoreni).toLocaleDateString('cs-CZ') : '-'}</TableCell>
                              <TableCell>{result.stav || result.stav_nazev || '-'}</TableCell>
                              <TableCell>
                                <IconButtonContainer>
                                  <IconButton 
                                    onClick={(e) => { e.stopPropagation(); handleOpenDetail(result, category.key); }}
                                    title="Zobrazit náhled"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </IconButton>
                                  <IconButton 
                                    onClick={(e) => { e.stopPropagation(); handleDirectEdit(result, e); }}
                                    title="Editovat objednávku"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </IconButton>
                                </IconButtonContainer>
                              </TableCell>
                            </>
                          )}

                          {/* Contracts */}
                          {category.key === 'contracts' && (
                            <>
                              <TableCell $noWrap dangerouslySetInnerHTML={{ __html: highlightMatch(result.cislo_smlouvy, query) }} />
                              <TableCell>{result.nazev_smlouvy}</TableCell>
                              <TableCell>{result.usek || '-'}</TableCell>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.nazev_firmy, query) }} />
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.ico, query) }} />
                              <TableCell $noWrap>
                                {(() => {
                                  // Zkus různé možné názvy polí z backendu
                                  const datumDo = result.datum_platnosti_do || result.platnost_do || result.platna_do || result.datum_do;
                                  if (!datumDo) return '-';
                                  try {
                                    return new Date(datumDo).toLocaleDateString('cs-CZ');
                                  } catch {
                                    return datumDo; // Fallback na raw hodnotu
                                  }
                                })()}
                              </TableCell>
                              <TableCell>
                                <IconButton 
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(result, category.key); }}
                                  title="Zobrazit náhled"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </IconButton>
                              </TableCell>
                            </>
                          )}

                          {/* Invoices */}
                          {category.key === 'invoices' && (
                            <>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.fa_cislo_vema, query) }} />
                              <TableCell>{result.smlouva_cislo || result.objednavka_cislo || '-'}</TableCell>
                              <TableCell $noWrap>{parseFloat(result.castka || 0).toLocaleString('cs-CZ')} Kč</TableCell>
                              <TableCell $noWrap>{result.datum_vystaveni}</TableCell>
                              <TableCell>
                                <IconButton 
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(result, category.key); }}
                                  title="Zobrazit náhled"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </IconButton>
                              </TableCell>
                            </>
                          )}

                          {/* Suppliers */}
                          {category.key === 'suppliers' && (
                            <>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.nazev, query) }} />
                              <TableCell>{result.adresa || '-'}</TableCell>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.ico, query) }} />
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.dic, query) }} />
                              <TableCell>
                                <IconButton 
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(result, category.key); }}
                                  title="Zobrazit náhled"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </IconButton>
                              </TableCell>
                            </>
                          )}

                          {/* Suppliers from Orders - 🆕 Agregovaní dodavatelé z objednávek */}
                          {category.key === 'suppliers_from_orders' && (
                            <>
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.dodavatel_nazev, query) }} />
                              <TableCell dangerouslySetInnerHTML={{ __html: highlightMatch(result.dodavatel_ico, query) }} />
                              <TableCell>
                                {result.dodavatel_kontakt_jmeno || result.dodavatel_kontakt_email || result.dodavatel_kontakt_telefon || '-'}
                              </TableCell>
                              <TableCell>
                                <span style={{ 
                                  background: '#dbeafe', 
                                  color: '#1e40af', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: '600' 
                                }}>
                                  {result.pocet_objednavek}
                                </span>
                              </TableCell>
                              <TableCell>
                                {result.posledni_pouziti ? new Date(result.posledni_pouziti).toLocaleDateString('cs-CZ') : '-'}
                              </TableCell>
                              <TableCell>
                                <IconButton 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    // Zobraz detail dodavatele (převedeme data do formátu pro SupplierDetailView)
                                    const supplierData = {
                                      nazev: result.dodavatel_nazev,
                                      ico: result.dodavatel_ico,
                                      dic: result.dodavatel_dic,
                                      adresa: result.dodavatel_sidlo,
                                      zastoupeny: result.dodavatel_zastoupeny,
                                      kontakt_jmeno: result.dodavatel_kontakt_jmeno,
                                      kontakt_email: result.dodavatel_kontakt_email,
                                      kontakt_telefon: result.dodavatel_kontakt_telefon,
                                      // Přídavné info z agregace
                                      pocet_objednavek: result.pocet_objednavek,
                                      posledni_pouziti: result.posledni_pouziti,
                                      nejnovejsi_objednavka_id: result.nejnovejsi_objednavka_id
                                    };
                                    handleOpenDetail(supplierData, category.key);
                                  }}
                                  title="Zobrazit náhled dodavatele"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </IconButton>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                      )}
                    </tbody>
                  </ResultTable>
                )}
              </CategoryContent>
            </CategorySection>
          );
        })}
      </DropdownContent>

      {/* Slide-in Detail Panel */}
      <SlideInDetailPanel
        isOpen={panelOpen}
        onClose={handleClosePanel}
        entityType={selectedEntity?.type}
        entityId={selectedEntity?.id}
        loading={detailLoading}
      >
        {renderDetailView()}
      </SlideInDetailPanel>

      {/* Custom Confirm Dialog pro draft warning */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          setConfirmDialog({
            isOpen: false,
            title: '',
            message: '',
            draftInfo: null,
            targetOrderId: null,
            onConfirm: null
          });
        }}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        icon={faExclamationTriangle}
        variant="warning"
        confirmText="Ano, pokračovat"
        cancelText="Ne, zůstat"
      >
        <p>
          Chystáte se editovat objednávku z výsledků vyhledávání.
        </p>

        {/* Zobraz varování o rozepracované objednávce */}
        {confirmDialog.draftInfo && (
          <p style={{ 
            background: '#fef3c7', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            border: '1px solid #f59e0b', 
            margin: '0.5rem 0',
            fontSize: '0.9375rem'
          }}>
            <strong>⚠️ POZOR:</strong> Máte rozpracovanou {confirmDialog.draftInfo.isNewConcept ? 'novou objednávku' : 'editaci objednávky'}{' '}
            <strong>"{confirmDialog.draftInfo.draftTitle}"</strong> s neuloženými změnami.
            <br /><br />
            Přepnutím na jinou objednávku <strong>přijdete o všechny neuložené změny!</strong>
          </p>
        )}

        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
          Chcete pokračovat a zahodit neuložené změny?
        </p>
      </ConfirmDialog>
    </DropdownContainer>
  );
};

export default SearchResultsDropdown;
