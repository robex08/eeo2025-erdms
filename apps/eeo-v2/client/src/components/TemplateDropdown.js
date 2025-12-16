import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faDatabase } from '@fortawesome/free-solid-svg-icons';
import { Search, X, RefreshCw, Eye, Plus, Trash } from 'lucide-react';

// Styled Components
const DropdownContainer = styled.div`
  position: absolute;
  top: calc(100% + 3px);
  left: ${props => props.$left || '0'};
  right: ${props => props.$right || 'auto'};
  z-index: 999999;
  width: 450px;
  background-color: white;
  border: 2px solid #10b981;
  border-radius: 8px;
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  max-height: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SectionHeader = styled.div`
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderActions = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => props.disabled ? '#9ca3af' : (props.$color || '#374151')};
  
  &:hover:not(:disabled) {
    opacity: 0.7;
  }
`;

const SearchBox = styled.div`
  position: relative;
  padding: 0 0.75rem 0.5rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #6b7280;
  
  &:hover {
    color: #374151;
  }
`;

const TemplateList = styled.div`
  max-height: 14rem;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
    
    &:hover {
      background: #9ca3af;
    }
  }
`;

const TemplateItem = styled.div`
  padding: 0.5rem 0.75rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
  transition: background-color 0.15s ease, border-left 0.15s ease;
  cursor: pointer;
  border-left: 3px solid transparent;
  
  &:hover {
    background-color: ${props => props.$type === 'user' ? '#f0fdf4' : '#f8fafc'};
    border-left-color: ${props => props.$type === 'user' ? '#22c55e' : '#3b82f6'};
  }
  
  &:not(:last-child) {
    border-bottom: 0.5px solid #f3f4f6;
  }
`;

const TemplateInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TemplateName = styled.div`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TemplateBadge = styled.div`
  margin-top: 3px;
  color: #1e40af;
  font-size: 0.7rem;
  background: #dbeafe;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  display: inline-block;
`;

const TemplateActions = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$color || '#6b7280'};
  padding: 0.125rem;
  cursor: pointer;
  
  &:hover {
    opacity: 0.7;
  }
`;

const LoadButton = styled.button`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background: ${props => props.disabled ? '#f3f4f6' : '#eff6ff'};
  color: ${props => props.disabled ? '#9ca3af' : '#1e3a8a'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  
  &:hover:not(:disabled) {
    background: #dbeafe;
  }
`;

const EmptyMessage = styled.div`
  padding: 0.5rem 0.75rem;
  color: ${props => props.$muted ? '#9ca3af' : '#6b7280'};
  ${props => props.$italic && 'font-style: italic;'}
`;

const Divider = styled.hr`
  margin: 0.5rem 0;
  border-color: #d1d5db;
  border-width: 2px;
  border-style: double;
`;

/**
 * TemplateDropdown - Komponent pro dropdown se šablonami
 * Zobrazuje předdefinované a uživatelské šablony s možností načtení do formuláře
 */
const TemplateDropdown = ({
  show,
  serverTemplates = [],
  savedTemplates = [],
  templatesLoading = false,
  searchQuery = '',
  showSearch = false,
  currentPhase = 1,
  isArchived = false,
  token = null,
  hasPermission,
  onSearch,
  onToggleSearch,
  onRefresh,
  onFillPo,
  onFillDetails,
  canFillTemplate = true,
  onCopyToUser,
  onCopyToGlobal,
  onShowPreview,
  onDelete,
  onEditName,
  editingTemplateId = null,
  editingTemplateName = '',
  matchesQuery
}) => {
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ left: '0', right: 'auto' });

  // Přepočítat pozici dropdownu, aby se vešel do okna
  useEffect(() => {
    if (show && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 450; // šířka dropdownu

      // Pokud dropdown přesahuje pravý okraj okna
      if (rect.right > viewportWidth) {
        // Přesunout doleva - zarovnat k pravému okraji
        setPosition({ left: 'auto', right: '0' });
      } 
      // Pokud dropdown přesahuje levý okraj okna (může nastat při right: 0)
      else if (rect.left < 0) {
        // Vrátit zpět k levému okraji
        setPosition({ left: '0', right: 'auto' });
      }
      // Pokud je dostatek místa, standardní pozice
      else if (rect.left >= 0 && rect.right <= viewportWidth) {
        setPosition({ left: '0', right: 'auto' });
      }
    }
  }, [show]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  if (!show) return null;

  // ✅ Ošetření, pokud serverTemplates nebo savedTemplates není array
  const safeServerTemplates = Array.isArray(serverTemplates) ? serverTemplates : [];
  const safeSavedTemplates = Array.isArray(savedTemplates) ? savedTemplates : [];

  const filteredServerTemplates = safeServerTemplates
    .filter(entry => entry && (entry.user_id === 0 || String(entry.user_id) === '0'))
    .filter(entry => matchesQuery(entry, searchQuery));

  const filteredSavedTemplates = safeSavedTemplates
    .filter(entry => matchesQuery(entry, searchQuery));

  return (
    <DropdownContainer ref={dropdownRef} $left={position.left} $right={position.right}>
      {/* Předdefinované šablony */}
      <SectionHeader>
        <HeaderTitle>
          <FontAwesomeIcon icon={faDatabase} style={{ color: '#3b82f6', fontSize: '14px' }} />
          <span>Předdefinované šablony</span>
        </HeaderTitle>
        <HeaderActions>
          <IconButton
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            title="Aktualizovat šablony z DB"
            disabled={!token || templatesLoading}
            $color="#10b981"
          >
            <RefreshCw size={16} />
          </IconButton>
          <IconButton
            onClick={onToggleSearch}
            title={showSearch ? 'Skrýt hledání' : 'Hledat'}
          >
            <Search size={16} />
          </IconButton>
        </HeaderActions>
      </SectionHeader>

      {/* Vyhledávání */}
      {showSearch && (
        <SearchBox>
          <SearchIcon>
            <Search size={16} />
          </SearchIcon>
          <SearchInput
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Hledat v šablonách..."
          />
          {searchQuery && (
            <SearchClearButton
              onClick={() => onSearch('')}
              title="Vymazat vyhledávání"
            >
              <X size={14} />
            </SearchClearButton>
          )}
        </SearchBox>
      )}

      {/* Seznam předdefinovaných šablon */}
      <TemplateList>
        {filteredServerTemplates.map((entry, idx) => {
          const t = entry.data || {};
          const typ = (entry.type || '').toString().toUpperCase();
          const allowedPo = typ.includes('PO') || typ === 'OBEJD' || typ === 'MIXED';
          const allowedDet = typ.includes('DET') || typ === 'OBEJD' || typ === 'MIXED';
          const displayName = entry.name || entry.dbName || (t.poApproval?.predmet || `Šablona ${entry.id || '?'}`);
          const badge = (typ === 'OBEJD' || (allowedPo && allowedDet)) ? 'PO+Detaily' : (allowedDet ? 'Detaily' : 'PO');

          return (
            <TemplateItem key={`predef-${entry.id}-${entry.ts}-${idx}`} $type="server">
              <TemplateInfo>
                <TemplateName>
                  {displayName}
                  {hasPermission?.('TEMPLATE_MANAGE') && (
                    <ActionButton
                      onClick={(e) => { e.stopPropagation(); onEditName(entry); }}
                      title="Přejmenovat šablonu"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </ActionButton>
                  )}
                </TemplateName>
                <TemplateBadge>{badge}</TemplateBadge>
              </TemplateInfo>
              
              <TemplateActions>
                <ActionButton onClick={() => onCopyToUser(entry)} title="Kopírovat do mých šablon" $color="#065f46">
                  <Plus size={16} />
                </ActionButton>
                <ActionButton onClick={() => onShowPreview(entry, entry.data)} title="Detailní náhled šablony">
                  <Eye size={16} />
                </ActionButton>
                {hasPermission?.('TEMPLATE_MANAGE') && (
                  <ActionButton onClick={() => onDelete(entry)} title="Smazat" $color="#dc2626">
                    <Trash size={16} />
                  </ActionButton>
                )}
              </TemplateActions>
              
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <LoadButton
                  onClick={() => onFillPo(entry)}
                  disabled={!canFillTemplate || (!isArchived && currentPhase >= 2) || !allowedPo}
                  title={!canFillTemplate ? 'Vyplňování nelze - objednávka je dokončena nebo má neuložené změny' : ((!isArchived && currentPhase >= 2) ? 'Nelze vložit PO po schválení' : (!allowedPo ? 'Tato šablona neobsahuje PO' : 'Načíst PO'))}
                >
                  PO
                </LoadButton>
                <LoadButton
                  onClick={() => onFillDetails(entry)}
                  disabled={!canFillTemplate || (!isArchived && currentPhase < 3) || !allowedDet}
                  title={!canFillTemplate ? 'Vyplňování nelze - objednávka je dokončena nebo má neuložené změny' : ((!isArchived && currentPhase < 3) ? 'Detaily se načítají až ve fázi 3 (po schválení)' : (!allowedDet ? 'Tato šablona neobsahuje Detaily' : 'Načíst detaily'))}
                >
                  Detaily
                </LoadButton>
              </div>
            </TemplateItem>
          );
        })}
        
        {searchQuery.trim() && filteredServerTemplates.length === 0 && (
          <EmptyMessage $muted>Nenalezeno</EmptyMessage>
        )}
      </TemplateList>

      <Divider />

      {/* Uživatelské šablony */}
      <SectionHeader>
        <HeaderTitle>
          <FontAwesomeIcon icon={faUser} style={{ color: '#22c55e', fontSize: '14px' }} />
          <span>Moje šablony</span>
        </HeaderTitle>
      </SectionHeader>

      {safeSavedTemplates.length === 0 && (
        <EmptyMessage>Žádné šablony</EmptyMessage>
      )}

      <TemplateList>
        {filteredSavedTemplates.map((entry, idx) => {
          const typ = (entry.type || '').toString().toUpperCase();
          const hasPo = typ === 'PO' || typ === 'OBEJD' || typ === 'MIXED' || !!entry?.data?.poApproval;
          const hasDet = typ === 'DETAIL' || typ === 'OBEJD' || typ === 'MIXED' || !!entry?.data?.orderDetails;
          const badge = (typ === 'OBEJD' || (hasPo && hasDet)) ? 'PO+Detaily' : (hasDet ? 'Detaily' : 'PO');

          return (
            <TemplateItem key={`user-${entry.id}-${entry.ts}-${idx}`} $type="user">
              <TemplateInfo>
                <TemplateName>
                  {entry.name}
                  <ActionButton
                    onClick={(e) => { e.stopPropagation(); onEditName(entry); }}
                    title="Přejmenovat šablonu"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </ActionButton>
                </TemplateName>
                <TemplateBadge>{badge}</TemplateBadge>
              </TemplateInfo>
              
              <TemplateActions>
                <ActionButton onClick={() => onShowPreview(entry, entry.data)} title="Detailní náhled šablony">
                  <Eye size={16} />
                </ActionButton>
                {hasPermission?.('TEMPLATE_MANAGE') && (
                  <ActionButton onClick={() => onCopyToGlobal(entry)} title="Kopírovat do globálních šablon" $color="#059669">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </ActionButton>
                )}
                <ActionButton onClick={() => onDelete(entry)} title="Smazat" $color="#dc2626">
                  <Trash size={16} />
                </ActionButton>
              </TemplateActions>
              
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <LoadButton
                  onClick={() => onFillPo(entry)}
                  disabled={!canFillTemplate || (!isArchived && currentPhase >= 2) || !hasPo}
                  title={!canFillTemplate ? 'Vyplňování nelze - objednávka je dokončena nebo má neuložené změny' : ((!isArchived && currentPhase >= 2) ? 'Nelze vložit PO po schválení' : (!hasPo ? 'Tato šablona neobsahuje PO' : 'Načíst PO'))}
                >
                  PO
                </LoadButton>
                <LoadButton
                  onClick={() => onFillDetails(entry)}
                  disabled={!canFillTemplate || (!isArchived && currentPhase < 3) || !hasDet}
                  title={!canFillTemplate ? 'Vyplňování nelze - objednávka je dokončena nebo má neuložené změny' : ((!isArchived && currentPhase < 3) ? 'Detaily se načítají až ve fázi 3 (po schválení)' : (!hasDet ? 'Tato šablona neobsahuje Detaily' : 'Načíst detaily'))}
                >
                  Detaily
                </LoadButton>
              </div>
            </TemplateItem>
          );
        })}
        
        {searchQuery.trim() && filteredSavedTemplates.length === 0 && (
          <EmptyMessage $muted>Nenalezeno</EmptyMessage>
        )}
      </TemplateList>
    </DropdownContainer>
  );
};

export default TemplateDropdown;
