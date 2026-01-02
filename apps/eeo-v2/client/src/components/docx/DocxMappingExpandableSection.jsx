/**
 * DocxMappingExpandableSection - Kompaktní DOCX mapování s enrich poli
 * @date 2025-10-21
 */

import React, { useState, useEffect, useRef, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWord, faChevronDown, faExchangeAlt,
  faCode, faHashtag, faEye, faUser, faInfoCircle, faCopy,
  faCheck, faTimes, faSpinner, faDownload, faSync, faPlus, faMinus,
  faExpand, faCompress, faAngleDoubleDown, faAngleDoubleUp, faSearch
} from '@fortawesome/free-solid-svg-icons';
import { extractDocxFields, generateFieldsFromApiData, getOrderFieldsForMapping } from '../../utils/docx/docxProcessor';
import { ToastContext } from '../../context/ToastContext';
import { validateDocxMapping, getAllAvailableFields } from '../../utils/docx/validateDocxMapping';
import { getDocxOrderEnrichedData } from '../../services/apiDocxOrders';

// =============================================================================
// STYLED COMPONENTS - KOMPAKTNÍ LAYOUT
// =============================================================================

const ExpandableSection = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: ${props => props.$expanded ? '#f8fafc' : '#fafbfc'};
  border-bottom: ${props => props.$expanded ? '1px solid #e5e7eb' : 'none'};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #f1f5f9;
  }
`;

const SectionHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SectionIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  background: #6366f1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
`;

const SectionSubtitle = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
`;

const ExpandIcon = styled.div`
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #6b7280;
`;

const SectionContent = styled.div`
  max-height: ${props => props.$expanded ? 'none' : '0'};
  overflow: ${props => props.$expanded ? 'hidden' : 'hidden'};
  transition: max-height 0.3s ease;
  background: white;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Umožní správný flex shrink */
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;

  ${props => {
    switch (props.$status) {
      case 'analyzing':
        return 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;';
      case 'ready':
        return 'background: #d1fae5; color: #065f46; border: 1px solid #10b981;';
      case 'error':
        return 'background: #fee2e2; color: #991b1b; border: 1px solid #f87171;';
      default:
        return 'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';
    }
  }}
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #1f2937;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProcessingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

const SpinnerIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #6366f1;
`;

// Kompaktní mapovací layout
const CompactMappingContainer = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0; /* Umožní správný flex shrink */
  overflow: hidden; /* Zajistí, že obsah nepřeteče */
`;

const MappingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
  min-height: 0; /* Umožní správný flex shrink */
`;

const DocxFieldsPanel = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Umožní správný flex shrink a scrolling */
  overflow: hidden; /* Zajistí, že obsah nepřeteče */
`;

const DatabaseFieldsPanel = styled.div`
  background: #f0fdf4;
  border: 2px solid #d1fae5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Umožní správný flex shrink a scrolling */
  overflow: hidden; /* Zajistí, že obsah nepřeteče */
`;

const PanelHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  flex-shrink: 0;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const PanelHeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const HeaderIcon = styled.div`
  font-size: 1rem;
  color: #6366f1;
`;

const HeaderTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.375rem 0.75rem 0.375rem 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  pointer-events: none;
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
`;

const FieldsScrollArea = styled.div`
  overflow-y: auto; /* auto místo scroll - scrollbar se zobrazí jen když je potřeba */
  overflow-x: hidden;
  padding: 0.5rem;
  flex: 1;
  min-height: 0; /* Umožní správný flex shrink */

  &::-webkit-scrollbar {
    width: 8px;
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;

    &:hover {
      background: #64748b;
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

// Specifický scroll area pro DOCX pole - světlejší
const DocxFieldsScrollArea = styled(FieldsScrollArea)`
  &::-webkit-scrollbar {
    width: 8px;
    background: #f8fafc; /* Ladí s DOCX panel pozadím */
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1; /* Světlejší šedá pro DOCX */
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
`;

// Specifický scroll area pro DB pole - zelenkavý
const DatabaseFieldsScrollArea = styled(FieldsScrollArea)`
  &::-webkit-scrollbar {
    width: 8px;
    background: #f0fdf4; /* Ladí s DB panel pozadím */
  }

  &::-webkit-scrollbar-track {
    background: #dcfce7; /* Světle zelená */
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #86efac; /* Zelenkavá pro DB pole */
    border-radius: 4px;

    &:hover {
      background: #4ade80; /* Tmavší zelená při hover */
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #86efac #dcfce7;
`;

const DocxFieldCard = styled.div`
  background: white;
  border: 1px solid ${props => 
    props.$hasError ? '#ef4444' : 
    props.$mapped ? '#10b981' : '#d1d5db'
  };
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;

  ${props => props.$dragOver && `
    border-color: #3b82f6;
    background: #dbeafe;
  `}

  ${props => props.$hasError && `
    background: #fef2f2;
    border-color: #ef4444;
    border-width: 2px;
  `}

  ${props => props.$mapped && !props.$hasError && `
    background: #f0fdf4;
    border-color: #10b981;
  `}
`;

const FieldHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
`;

const FieldTypeIcon = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: white;

  ${props => {
    switch (props.$type) {
      case 'docvariable':
        return 'background: #3b82f6;';
      case 'bookmark':
        return 'background: #10b981;';
      case 'field':
        return 'background: #f59e0b;';
      default:
        return 'background: #6b7280;';
    }
  }}
`;

const FieldName = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
`;

const MappingZone = styled.div`
  padding: 0.5rem 0.75rem;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;

  ${props => props.$dragOver && `
    background: #dbeafe;
    border: 2px dashed #3b82f6;
    border-radius: 4px;
  `}
`;

const MappedField = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const MappedFieldLabel = styled.div`
  color: ${props => props.$hasError ? '#dc2626' : '#059669'};
  font-weight: 500;
  font-size: 0.8rem;
  flex: 1;
`;

const ValidationWarning = styled.div`
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #dc2626;
  line-height: 1.3;
`;

const ValidationSuggestion = styled.div`
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #166534;
  line-height: 1.3;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const MultiMappedFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
`;

const MappedFieldChip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props =>
    props.$isDragging ? '#f3f4f6' :
    props.$dragOver ? '#e5e7eb' :
    props.$isComposed ? '#fef3c7' : '#dcfce7'
  };
  border: 1px solid ${props =>
    props.$isDragging ? '#9ca3af' :
    props.$dragOver ? '#6b7280' :
    props.$isComposed ? '#fbbf24' : '#16a34a'
  };
  color: ${props =>
    props.$isDragging ? '#6b7280' :
    props.$dragOver ? '#374151' :
    props.$isComposed ? '#92400e' : '#166534'
  };
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'grab'};
  opacity: ${props => props.$isDragging ? 0.5 : 1};
  transform: ${props => props.$dragOver ? 'scale(1.02)' : 'scale(1)'};
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    background: ${props =>
      props.$isDragging ? '#f3f4f6' :
      props.$dragOver ? '#e5e7eb' :
      props.$isComposed ? '#fef08a' : '#bbf7d0'
    };
  }
`;

const FieldChipText = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
`;

const ChipRemoveButton = styled.button`
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 2px;
  margin-left: 0.25rem;
  font-size: 0.625rem;

  &:hover {
    background: rgba(220, 38, 38, 0.1);
  }
`;

const SeparatorIndicator = styled.div`
  font-size: 0.7rem;
  color: #6b7280;
  text-align: center;
  padding: 0.125rem;
  font-style: italic;
`;

const UnmapButton = styled.button`
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;

  &:hover {
    background: #fee2e2;
  }
`;

const DropPlaceholder = styled.div`
  color: #9ca3af;
  font-size: 0.8rem;
  font-style: italic;
`;

const FieldGroup = styled.div`
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: ${props => props.$expanded ? '1px solid #e5e7eb' : 'none'};

  &:hover {
    background: #f3f4f6;
  }
`;

const GroupToggleIcon = styled.div`
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  color: #6b7280;
  font-size: 0.75rem;
`;

const GroupFields = styled.div`
  display: ${props => props.$expanded ? 'flex' : 'none'};
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
`;

const DatabaseFieldCard = styled.div`
  background: white;
  border: 1px solid ${props => props.$isComposed ? '#e879f9' : '#d1fae5'};
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;

  ${props => props.$isComposed && `
    background: linear-gradient(135deg, #fef7ff 0%, #fdf4ff 100%);
    border-left: 3px solid #d946ef;
  `}

  &:hover {
    background: ${props => props.$isComposed ? '#fdf2f8' : '#f0fdf4'};
    border-color: ${props => props.$isComposed ? '#d946ef' : '#10b981'};
    transform: translateY(-1px);
  }

  &:active {
    cursor: grabbing;
  }
`;

const ComposedFieldBadge = styled.span`
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: #d946ef;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 600;
  line-height: 1;
`;

const ComposedFieldInfo = styled.div`
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid #f3e8ff;
  font-size: 0.7rem;
  color: #7c3aed;
`;

const FieldComposition = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const ComposedFieldTag = styled.span`
  background: #e879f9;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 500;
`;

const FieldInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FieldLabel = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 0.8rem;
  line-height: 1.2;
`;

const FieldMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FieldKey = styled.span`
  font-family: 'Courier New', monospace;
  color: #059669;
  font-size: 0.75rem;
  flex: 1;
`;

const FieldExample = styled.div`
  color: #059669;
  font-size: 0.75rem;
  font-style: italic;
  opacity: 0.8;
  display: none; /* Skrytý - už se nepoužívá */
`;

const FieldTypeTag = styled.span`
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-weight: 500;
`;

// AI Auto-mapping tlačítko
const AIAutoMapButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ExpandCollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #1f2937;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Převede validní API pole z validateDocxMapping na strukturu pro UI
 * @returns {Array} - Pole se strukturou [{group, fields: [{key, label, type}]}]
 */
function convertValidFieldsToGroups() {
  const allFields = getAllAvailableFields();
  
  // Vytvoř mapu skupin
  const groupsMap = {
    'Základní údaje': [],
    'Dodavatel': [],
    'Vypočítané hodnoty': [],
    'Objednatel': [],
    'Garant': [],
    'Příkazce': [],
    'Schvalovatel': [],
    'Odesílatel': [],
    'Fakturant': [],
    'Potvrdil dodavatel': [],
    'Potvrdil věcnou správnost': [],
    'Dokončil': []
  };
  
  allFields.forEach(path => {
    // Rozděl cestu na části
    const parts = path.split('.');
    
    // Top level pole
    if (!path.includes('.')) {
      groupsMap['Základní údaje'].push({
        key: path,
        label: formatFieldLabel(path),
        type: 'text'
      });
      return;
    }
    
    // Dodavatel
    if (path.startsWith('dodavatel_')) {
      groupsMap['Dodavatel'].push({
        key: path,
        label: formatFieldLabel(path.replace('dodavatel_', '')),
        type: 'text'
      });
      return;
    }
    
    // Vypočítané hodnoty
    if (parts[0] === 'vypocitane') {
      groupsMap['Vypočítané hodnoty'].push({
        key: path,
        label: formatFieldLabel(parts[1]),
        type: 'calculated'
      });
      return;
    }
    
    // Enriched uživatelé
    const userPrefixMap = {
      'uzivatel': 'Objednatel',
      'garant_uzivatel': 'Garant',
      'prikazce_uzivatel': 'Příkazce',
      'schvalovatel': 'Schvalovatel',
      'odesilatel': 'Odesílatel',
      'fakturant': 'Fakturant',
      'dodavatel_potvrdil': 'Potvrdil dodavatel',
      'potvrdil_vecnou_spravnost': 'Potvrdil věcnou správnost',
      'dokoncil': 'Dokončil'
    };
    
    const prefix = parts[0];
    if (userPrefixMap[prefix]) {
      const groupName = userPrefixMap[prefix];
      const fieldName = parts.slice(1).join('.');
      groupsMap[groupName].push({
        key: path,
        label: formatFieldLabel(fieldName),
        type: 'user'
      });
    }
  });
  
  // Převeď mapu na array a odstraň prázdné skupiny
  const groups = Object.entries(groupsMap)
    .filter(([_, fields]) => fields.length > 0)
    .map(([groupName, fields]) => ({
      group: groupName,
      fields: fields.sort((a, b) => a.label.localeCompare(b.label, 'cs'))
    }));
  
  return groups;
}

/**
 * Formátuje název pole pro UI
 * @param {string} fieldName - Název pole
 * @returns {string} - Formátovaný název
 */
function formatFieldLabel(fieldName) {
  // Odstraň podtržítka a převeď na title case
  return fieldName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DocxMappingExpandableSection = ({
  file,
  mapping = {},
  onMappingChange,
  onValidationChange, // ✅ Callback pro předání validace do parent komponenty
  expanded: controlledExpanded,
  onExpandChange,
  // ✅ NOVÉ: Auth parametry pro načítání enriched dat
  token = null,
  username = null,
  sampleOrderId = null,
  useDynamicFields = true
}) => {
  const { showToast } = useContext(ToastContext);

  const [internalExpanded, setInternalExpanded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMapping, setAiMapping] = useState(false);
  const [orderFields, setOrderFields] = useState([]);
  const [draggedField, setDraggedField] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  // State pro rozbalovací skupiny
  const [expandedGroups, setExpandedGroups] = useState({});

  // State pro multi-mapping (více polí na jedno DOCX pole)
  const [multiMapping, setMultiMapping] = useState({});

  // State pro drag & drop reordering v multi-mappingu
  const [draggedChip, setDraggedChip] = useState(null);
  const [dragOverChip, setDragOverChip] = useState(null);

  // State pro search v obou panelech
  const [docxFieldsSearch, setDocxFieldsSearch] = useState('');
  const [dbFieldsSearch, setDbFieldsSearch] = useState('');

  // State pro validaci mappingu
  const [mappingValidation, setMappingValidation] = useState(null);

  const jsonSectionRef = useRef(null);

  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // NAČÍTÁNÍ POLÍ - DYNAMICKY Z ENRICHED API nebo staticky
  useEffect(() => {
    const loadFields = async () => {
      // ✅ POKUD MÁME AUTH PARAMETRY A SAMPLE ORDER ID - NAČTI ENRICHED DATA
      if (useDynamicFields && token && username && sampleOrderId) {
        console.log('🔄 Načítám ENRICHED DB pole z API pro sampleOrderId:', sampleOrderId);
        try {
          const enrichedData = await getDocxOrderEnrichedData({ 
            token, 
            username, 
            objednavka_id: sampleOrderId 
          });
          
          const dynamicFields = generateFieldsFromApiData(enrichedData);
          setOrderFields(dynamicFields);
          
          console.log('✅ ENRICHED DB pole načtena z API:', {
            pocet_skupin: dynamicFields.length,
            celkem_poli: dynamicFields.reduce((sum, group) => sum + group.fields.length, 0),
            skupiny: dynamicFields.map(g => `${g.group} (${g.fields.length})`)
          });
        } catch (error) {
          console.error('❌ Chyba při načítání enriched dat, fallback na statické pole:', error);
          // Fallback na statické pole z getOrderFieldsForMapping
          const staticFields = getOrderFieldsForMapping();
          setOrderFields(staticFields);
        }
      } else {
        // ✅ FALLBACK: POUŽIJ STATICKÉ POLE (kompatibilita se starou verzí)
        console.log('🔄 Načítám STATICKÉ DB pole (fallback - žádné auth parametry)...');
        const staticFields = getOrderFieldsForMapping();
        setOrderFields(staticFields);
        
        console.log('✅ STATICKÉ DB pole načtena:', {
          pocet_skupin: staticFields.length,
          celkem_poli: staticFields.reduce((sum, group) => sum + group.fields.length, 0)
        });
      }
    };

    loadFields();
  }, [useDynamicFields, token, username, sampleOrderId]); // Žádné závislosti - pole jsou statická z ENRICHED_API_STRUCTURE

  // Aktualizuj expandedGroups když se změní orderFields
  useEffect(() => {
    if (orderFields.length === 0) return;

    const initialExpanded = {};
    orderFields.forEach((group, index) => {
      initialExpanded[group.group] = false; // Všechny skupiny defaultně SBALENÉ
    });
    setExpandedGroups(initialExpanded);
  }, [orderFields]);

  // Validace mappingu při každé změně
  useEffect(() => {
    if (!mapping || Object.keys(mapping).length === 0) {
      setMappingValidation(null);
      return;
    }

    const validation = validateDocxMapping(mapping);
    
    // ✅ NOVÁ VALIDACE: Zkontroluj, zda všechna pole v JSON existují v DOCX
    if (analysisResult?.fields && analysisResult.fields.length > 0) {
      const docxFieldNames = analysisResult.fields.map(f => f.name);
      const mappingKeys = Object.keys(mapping);
      
      // Najdi pole v JSON mapování, která neexistují v DOCX
      const orphanFields = mappingKeys.filter(key => !docxFieldNames.includes(key));
      
      if (orphanFields.length > 0) {
        console.warn('⚠️ Pole v JSON mapování, která NEEXISTUJÍ v DOCX souboru:', orphanFields);
        
        // Přidej tyto chyby do validace
        if (!validation.errors) validation.errors = [];
        orphanFields.forEach(fieldName => {
          validation.errors.push({
            type: 'missing_in_docx',
            docxField: fieldName,
            apiPath: mapping[fieldName],
            reason: `Pole "${fieldName}" je v JSON mapování, ale NEEXISTUJE ve Word dokumentu. Možná jste přejmenovali pole ve Wordu, ale aktualizovali jste mapování.`,
            suggestion: `Klikněte na tlačítko "Obnovit detekci" pro znovu načtení polí z DOCX nebo odstraňte toto pole z mapování.`
          });
        });
        validation.valid = false;
      }
    }
    
    setMappingValidation(validation);

    // ✅ Předej validaci do parent komponenty
    if (onValidationChange) {
      onValidationChange(validation);
    }

    if (validation && !validation.valid) {
      console.log('⚠️ Mapping obsahuje chyby:', {
        errors: validation.errors.length,
        warnings: validation.warnings?.length || 0
      });
    }
  }, [mapping, analysisResult, onValidationChange]);

  // Parsuj existující mapování a rozlož složená pole do multi-mapping
  useEffect(() => {
    if (!mapping || Object.keys(mapping).length === 0 || orderFields.length === 0) return;

    const newMultiMapping = {};
    const allFields = orderFields.flatMap(g => g.fields);

    Object.entries(mapping).forEach(([docxField, mappedValue]) => {
      // Zkontroluj, zda je to složené mapování (obsahuje " + ")
      if (typeof mappedValue === 'string' && mappedValue.includes(' + ')) {
        const fieldKeys = mappedValue.split(' + ').map(key => key.trim());

        // Najdi objekty polí pro tyto klíče
        const fieldObjects = fieldKeys.map(key =>
          allFields.find(field => field.key === key)
        ).filter(Boolean); // Odstraň undefined hodnoty

        // Pokud se podařilo najít všechny pole, vytvoř multi-mapping
        if (fieldObjects.length === fieldKeys.length && fieldObjects.length > 1) {
          newMultiMapping[docxField] = fieldObjects;
        }
      }
    });

    // Aktualizuj multi-mapping pouze pokud se něco změnilo
    if (Object.keys(newMultiMapping).length > 0) {
      setMultiMapping(prev => {
        const updated = { ...prev, ...newMultiMapping };
        return updated;
      });
    }
  }, [mapping, orderFields]);

  // Helper funkce - vrátí error pro konkrétní DOCX pole
  const getFieldError = (docxFieldName) => {
    if (!mappingValidation || !mapping[docxFieldName]) return null;
    
    return mappingValidation.errors.find(error => error.docxField === docxFieldName);
  };

  // Toggle funkce pro skupiny
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Expand all skupin
  const expandAllGroups = () => {
    const allExpanded = {};
    orderFields.forEach(group => {
      allExpanded[group.group] = true;
    });
    setExpandedGroups(allExpanded);
  };

  // Collapse all skupin
  const collapseAllGroups = () => {
    const allCollapsed = {};
    orderFields.forEach(group => {
      allCollapsed[group.group] = false;
    });
    setExpandedGroups(allCollapsed);
  };

  // Zjisti, jestli jsou všechny skupiny rozbalené nebo sbalené
  const areAllGroupsExpanded = () => {
    return orderFields.every(group => expandedGroups[group.group]);
  };

  const areAllGroupsCollapsed = () => {
    return orderFields.every(group => !expandedGroups[group.group]);
  };

  useEffect(() => {
    if (file && expanded && !analysisResult) {
      analyzeDocxFile(file);
    }
  }, [file, expanded]);

  // ✅ AUTOMATICKÁ ANALÝZA při načtení souboru (i když je sekce sbalená) - pro validaci
  useEffect(() => {
    if (file && !analysisResult && !analyzing) {
      // Spusť analýzu i když je sekce sbalená - potřebujeme validaci
      console.log('🔍 Automaticky analyzuji DOCX pro validaci mapování...');
      analyzeDocxFile(file);
    }
  }, [file]);

  // Reset analýzy při změně souboru
  useEffect(() => {
    if (file) {
      setAnalysisResult(null);
      setAnalyzing(false);
      setMultiMapping({});
    }
  }, [file]);

  const analyzeDocxFile = async (docxFile) => {
    if (!docxFile || analyzing) return;

    console.log('🔍 === DOCX ANALÝZA START ===');
    console.log('📄 Soubor:', docxFile.name, '| Velikost:', (docxFile.size / 1024).toFixed(2), 'KB');

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await extractDocxFields(docxFile);
      
      console.log('✅ DOCX analýza dokončena:');
      console.log('  - Úspěch:', result.success);
      console.log('  - Počet polí:', result.fields?.length || 0);
      console.log('  - Detekovaná pole:', result.fields?.map(f => f.name).sort() || []);
      console.log('🔍 === DOCX ANALÝZA KONEC ===');
      
      setAnalysisResult(result);
    } catch (error) {
      console.error('❌ Chyba při analýze DOCX:', error);
      console.log('🔍 === DOCX ANALÝZA SELHALA ===');
      setAnalysisResult({
        success: false,
        error: error.message || 'Neočekávaná chyba při analýze'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getFieldIcon = (fieldType) => {
    switch (fieldType) {
      case 'docvariable': return faHashtag;
      case 'bookmark': return faEye;
      case 'field': return faCode;
      default: return faUser;
    }
  };

  const getStatus = () => {
    if (analyzing) return { status: 'analyzing', text: 'Analyzuji...' };
    
    // ✅ KRITICKÁ PRIORITA: Validační chyby mapování (DOCX pole chybí v JSON nebo naopak)
    if (mappingValidation && !mappingValidation.valid && mappingValidation.errors?.length > 0) {
      const errorCount = mappingValidation.errors.length;
      return { 
        status: 'error', 
        text: `${errorCount} ${errorCount === 1 ? 'chyba' : errorCount < 5 ? 'chyby' : 'chyb'} v mapování` 
      };
    }
    
    // ✅ Analýza DOCX a mapování
    if (analysisResult?.success && analysisResult.fields?.length > 0) {
      const mappedCount = Object.keys(mapping).length;
      
      // Pokud je validace OK, ukaž to
      if (mappingValidation?.valid) {
        return {
          status: 'ready',
          text: `✓ ${analysisResult.fields.length} polí, ${mappedCount} namapováno`
        };
      }
      
      return {
        status: 'ready',
        text: `${analysisResult.fields.length} polí, ${mappedCount} namapováno`
      };
    }
    if (analysisResult?.success && analysisResult.fields?.length === 0) {
      return { status: 'error', text: 'Žádná pole nenalezena' };
    }
    if (analysisResult && !analysisResult.success) {
      return { status: 'error', text: 'Chyba při analýze' };
    }
    return { status: 'waiting', text: 'Rozbalte pro analýzu' };
  };

  // AI automatické mapování polí - VYLEPŠENÁ VERZE s inteligencí
  const handleAIAutoMapping = async () => {
    if (!analysisResult?.fields?.length || aiMapping || !orderFields?.length) {
      console.warn('⚠️ AI mapování nelze spustit - chybí data nebo už běží');
      return;
    }

    setAiMapping(true);

    try {
      // Flatten všechna pole ze všech skupin
      const allFields = orderFields.flatMap(group => group.fields || []);

      // =========================================================================
      // INTELIGENTNÍ MAPOVACÍ PRAVIDLA s váhami
      // =========================================================================
      const intelligentRules = [
        // DATUM pravidla (priorita 100)
        {
          docxPatterns: [
            /datum.*vytvor/i, /date.*creat/i, /datum.*zalozen/i,
            /datum/i, /date/i, /den/i, /mesic/i, /rok/i
          ],
          dbFields: ['objednavky.datum_vytvoreni', 'objednavky.created_at', 'objednavky.datum'],
          priority: 100,
          category: 'datum'
        },
        {
          docxPatterns: [/datum.*uprav/i, /date.*modif/i, /datum.*zmeny/i],
          dbFields: ['objednavky.datum_upravy', 'objednavky.updated_at'],
          priority: 95,
          category: 'datum'
        },
        {
          docxPatterns: [/termin/i, /deadline/i, /splatnost/i, /due/i],
          dbFields: ['objednavky.termin_plneni', 'objednavky.deadline', 'objednavky.termin'],
          priority: 90,
          category: 'datum'
        },

        // ČÍSLO/ID pravidla (priorita 85)
        {
          docxPatterns: [/cislo.*objednavk/i, /order.*number/i, /^cislo$/i, /^number$/i],
          dbFields: ['objednavky.cislo_objednavky', 'objednavky.order_number'],
          priority: 85,
          category: 'cislo'
        },
        {
          docxPatterns: [/^id$/i, /identifikator/i, /identifier/i],
          dbFields: ['objednavky.id', 'objednavky.order_id'],
          priority: 80,
          category: 'cislo'
        },

        // NÁZEV/POPIS pravidla (priorita 75)
        {
          docxPatterns: [/nazev/i, /name/i, /title/i, /nadpis/i, /heading/i],
          dbFields: ['objednavky.nazev', 'objednavky.title', 'objednavky.name'],
          priority: 75,
          category: 'text'
        },
        {
          docxPatterns: [/popis/i, /description/i, /desc/i, /text/i],
          dbFields: ['objednavky.popis', 'objednavky.description'],
          priority: 70,
          category: 'text'
        },
        {
          docxPatterns: [/poznamka/i, /note/i, /comment/i, /komentar/i],
          dbFields: ['objednavky.poznamka', 'objednavky.notes', 'objednavky.interni_poznamka'],
          priority: 65,
          category: 'text'
        },

        // CENA/FINANCE pravidla (priorita 60)
        {
          docxPatterns: [/cena.*celk/i, /total.*price/i, /celkem/i, /total/i, /suma/i],
          dbFields: ['objednavky.celkova_cena', 'objednavky.total_price', 'objednavky.cena_celkem'],
          priority: 60,
          category: 'finance'
        },
        {
          docxPatterns: [/cena.*bez.*dph/i, /price.*without.*vat/i, /net.*price/i],
          dbFields: ['objednavky.cena_bez_dph', 'objednavky.net_price'],
          priority: 55,
          category: 'finance'
        },
        {
          docxPatterns: [/dph/i, /vat/i, /tax/i, /dan/i],
          dbFields: ['objednavky.dph', 'objednavky.vat', 'objednavky.tax'],
          priority: 50,
          category: 'finance'
        },
        {
          docxPatterns: [/cena/i, /price/i, /castka/i, /amount/i, /hodnota/i],
          dbFields: ['objednavky.cena', 'objednavky.price', 'objednavky.amount'],
          priority: 45,
          category: 'finance'
        },

        // STATUS/STAV pravidla (priorita 40)
        {
          docxPatterns: [/stav/i, /status/i, /state/i],
          dbFields: ['objednavky.stav', 'objednavky.status', 'objednavky.state'],
          priority: 40,
          category: 'status'
        },

        // KONTAKTY pravidla (priorita 35)
        {
          docxPatterns: [/email/i, /e-mail/i, /mail/i, /posta/i],
          dbFields: ['objednavky.email', 'objednavky.kontakt_email', 'objednavky.mail'],
          priority: 35,
          category: 'kontakt'
        },
        {
          docxPatterns: [/telefon/i, /phone/i, /tel/i, /mobil/i, /gsm/i],
          dbFields: ['objednavky.telefon', 'objednavky.phone', 'objednavky.mobil'],
          priority: 30,
          category: 'kontakt'
        },

        // DODAVATEL/FIRMA pravidla (priorita 25)
        {
          docxPatterns: [/dodavatel/i, /supplier/i, /vendor/i],
          dbFields: ['objednavky.dodavatel', 'objednavky.supplier', 'objednavky.vendor_name'],
          priority: 25,
          category: 'firma'
        },
        {
          docxPatterns: [/firma/i, /company/i, /spolecnost/i],
          dbFields: ['objednavky.firma', 'objednavky.company', 'objednavky.company_name'],
          priority: 20,
          category: 'firma'
        },
        {
          docxPatterns: [/ico/i, /^ic$/i, /company.*id/i],
          dbFields: ['objednavky.ico', 'objednavky.company_id'],
          priority: 15,
          category: 'firma'
        },

        // ADRESA pravidla (priorita 10)
        {
          docxPatterns: [/adresa/i, /address/i],
          dbFields: ['objednavky.adresa', 'objednavky.address', 'objednavky.dodaci_adresa'],
          priority: 10,
          category: 'adresa'
        }
      ];

      // =========================================================================
      // MAPOVACÍ ALGORITMUS
      // =========================================================================
      const newMapping = {};
      const mappingLog = [];

      analysisResult.fields.forEach(docxField => {
        const fieldName = docxField.name?.toLowerCase() || '';
        let bestMatch = null;
        let bestScore = 0;
        let matchReason = '';

        // 1. PŘESNÁ SHODA - nejvyšší priorita
        const exactMatch = allFields.find(dbField => {
          const dbKey = dbField.key?.toLowerCase() || '';
          const dbLabel = dbField.label?.toLowerCase() || '';
          return fieldName === dbKey || fieldName === dbLabel;
        });

        if (exactMatch) {
          bestMatch = exactMatch;
          bestScore = 1000; // Maximální skóre
          matchReason = '🎯 Přesná shoda názvu';
        }

        // 2. INTELIGENTNÍ PRAVIDLA - hledání podle vzorů
        if (!bestMatch) {
          for (const rule of intelligentRules) {
            // Testuj všechny vzory pro toto pravidlo
            const patternMatches = rule.docxPatterns.some(pattern => pattern.test(fieldName));

            if (patternMatches) {
              // Najdi první dostupné DB pole z pravidla
              for (const dbFieldKey of rule.dbFields) {
                const dbField = allFields.find(f => f.key === dbFieldKey);
                if (dbField && rule.priority > bestScore) {
                  bestMatch = dbField;
                  bestScore = rule.priority;
                  matchReason = `🧠 Inteligentní pravidlo (${rule.category})`;
                  break; // Použij první nalezené pole z tohoto pravidla
                }
              }
            }
          }
        }

        // 3. FUZZY MATCHING - částečné shody
        if (!bestMatch || bestScore < 50) {
          const fuzzyMatch = findBestFuzzyMatch(fieldName, allFields);
          if (fuzzyMatch && fuzzyMatch.score > bestScore) {
            bestMatch = fuzzyMatch.field;
            bestScore = fuzzyMatch.score;
            matchReason = `🔍 Fuzzy match (skóre: ${fuzzyMatch.score})`;
          }
        }

        // 4. APLIKUJ MAPOVÁNÍ
        if (bestMatch && bestScore >= 10) { // Minimální threshold
          newMapping[docxField.name] = bestMatch.key;
          mappingLog.push({
            docx: docxField.name,
            db: bestMatch.key,
            label: bestMatch.label,
            score: bestScore,
            reason: matchReason
          });
        }
      });

      // =========================================================================
      // HELPER: Fuzzy matching funkce
      // =========================================================================
      function findBestFuzzyMatch(docxFieldName, dbFields) {
        let bestField = null;
        let bestScore = 0;

        dbFields.forEach(dbField => {
          const dbKey = (dbField.key || '').toLowerCase();
          const dbLabel = (dbField.label || '').toLowerCase();

          // Skóre podle podobnosti
          let score = 0;

          // Obsahuje klíčové slovo
          const docxWords = docxFieldName.split(/[_\s-]+/).filter(w => w.length > 2);
          const dbWords = [...dbKey.split(/[._\s-]+/), ...dbLabel.split(/[_\s-]+/)]
            .filter(w => w.length > 2);

          docxWords.forEach(docxWord => {
            dbWords.forEach(dbWord => {
              if (docxWord === dbWord) score += 30; // Přesná shoda slova
              else if (docxWord.includes(dbWord) || dbWord.includes(docxWord)) score += 15; // Částečná shoda
              else if (levenshteinDistance(docxWord, dbWord) <= 2) score += 10; // Podobné slovo
            });
          });

          if (score > bestScore) {
            bestScore = score;
            bestField = dbField;
          }
        });

        return bestScore > 0 ? { field: bestField, score: bestScore } : null;
      }

      // Levenshtein distance pro měření podobnosti stringů
      function levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
          matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
          matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
          for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[str2.length][str1.length];
      }

      // =========================================================================
      // APLIKUJ MAPOVÁNÍ A LOGUJ VÝSLEDKY
      // =========================================================================
      const finalMapping = { ...mapping, ...newMapping };
      onMappingChange(finalMapping);

    } catch (error) {
      console.error('❌ Chyba při AI mapování:', error);
    } finally {
      setAiMapping(false);
      // Dialog záměrně nezavíráme - uživatel může pokračovat v editaci mapování
    }
  };

  const handleExpand = () => {
    const newExpanded = !expanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }
    onExpandChange?.(newExpanded);
  };

  const handleDragStart = (e, field, source) => {
    setDraggedField({ ...field, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e, docxFieldName) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (draggedField && draggedField.source === 'order') {
      // Zkontroluj, zda už je něco namapované na tento DOCX field
      const existingMapping = mapping[docxFieldName];
      const existingMultiMapping = multiMapping[docxFieldName];

      if (existingMapping || existingMultiMapping) {
        // Už je něco namapované - přidej do multi-mapping
        let currentFields = [];

        if (existingMultiMapping && existingMultiMapping.length > 0) {
          // Už existuje multi-mapping, přidej k němu
          currentFields = [...existingMultiMapping];
        } else if (existingMapping) {
          // Existuje single mapping, převeď na multi-mapping
          // Najdi field object pro existující mapování
          const existingField = orderFields.flatMap(g => g.fields).find(f => f.key === existingMapping);
          if (existingField) {
            currentFields = [existingField];
          }
        }

        // Zkontroluj, zda už není přidané
        if (!currentFields.find(f => f.key === draggedField.key)) {
          const newMultiFields = [...currentFields, draggedField];

          // Aktualizuj multi-mapping
          setMultiMapping(prev => ({
            ...prev,
            [docxFieldName]: newMultiFields
          }));

          // Vytvoř složené mapování ve formátu pro backend
          const composedKey = newMultiFields.map(f => f.key).join(' + ');
          const newMapping = {
            ...mapping,
            [docxFieldName]: composedKey
          };
          onMappingChange?.(newMapping);
        }
      } else {
        // Jednoduchý single mapping
        const newMapping = {
          ...mapping,
          [docxFieldName]: draggedField.key
        };
        onMappingChange?.(newMapping);

        console.log('✅ Namapováno jednoduché pole:', {
          docxField: docxFieldName,
          dbField: draggedField.key
        });
      }
    }

    setDraggedField(null);
  };

  const handleRemoveMapping = (docxFieldName) => {
    const newMapping = { ...mapping };
    delete newMapping[docxFieldName];
    onMappingChange?.(newMapping);

    // Zruš i multi-mapping
    setMultiMapping(prev => {
      const newMulti = { ...prev };
      delete newMulti[docxFieldName];
      return newMulti;
    });
  };

  const handleRemoveFromMultiMapping = (docxFieldName, fieldToRemove) => {
    const currentMultiFields = multiMapping[docxFieldName] || [];
    const newMultiFields = currentMultiFields.filter(f => f.key !== fieldToRemove.key);

    if (newMultiFields.length === 0) {
      // Pokud nezůstalo žádné pole, zruš mapování úplně
      handleRemoveMapping(docxFieldName);
    } else if (newMultiFields.length === 1) {
      // Pokud zůstalo jen jedno pole, udělej z toho jednoduchý mapping
      setMultiMapping(prev => {
        const newMulti = { ...prev };
        delete newMulti[docxFieldName];
        return newMulti;
      });

      const newMapping = {
        ...mapping,
        [docxFieldName]: newMultiFields[0].key
      };
      onMappingChange?.(newMapping);
    } else {
      // Aktualizuj multi-mapping
      setMultiMapping(prev => ({
        ...prev,
        [docxFieldName]: newMultiFields
      }));

      const composedKey = newMultiFields.map(f => f.key).join(' + ');
      const newMapping = {
        ...mapping,
        [docxFieldName]: composedKey
      };
      onMappingChange?.(newMapping);
    }
  };

  // Funkce pro reordering polí v multi-mappingu
  const handleChipDragStart = (e, docxFieldName, fieldIndex) => {
    e.stopPropagation();
    setDraggedChip({ docxFieldName, fieldIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleChipDragOver = (e, docxFieldName, fieldIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverChip({ docxFieldName, fieldIndex });
  };

  const handleChipDragLeave = (e) => {
    e.stopPropagation();
    setDragOverChip(null);
  };

  const handleChipDrop = (e, docxFieldName, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedChip || draggedChip.docxFieldName !== docxFieldName) {
      setDraggedChip(null);
      setDragOverChip(null);
      return;
    }

    const sourceIndex = draggedChip.fieldIndex;
    if (sourceIndex === targetIndex) {
      setDraggedChip(null);
      setDragOverChip(null);
      return;
    }

    // Přeuspořádej pole v multi-mappingu
    const currentFields = [...multiMapping[docxFieldName]];
    const [movedField] = currentFields.splice(sourceIndex, 1);
    currentFields.splice(targetIndex, 0, movedField);

    // Aktualizuj multi-mapping state
    setMultiMapping(prev => ({
      ...prev,
      [docxFieldName]: currentFields
    }));

    // Aktualizuj hlavní mapping s novým pořadím
    const composedKey = currentFields.map(f => f.key).join(' + ');
    const newMapping = {
      ...mapping,
      [docxFieldName]: composedKey
    };
    onMappingChange?.(newMapping);

    setDraggedChip(null);
    setDragOverChip(null);
  };

  const handleRefresh = async () => {
    if (!file || analyzing) return;

    await analyzeDocxFile(file);
  };

  const status = getStatus();

  return (
    <ExpandableSection>
      <SectionHeader $expanded={true}>
        <SectionHeaderLeft>
          <SectionIcon>
            <FontAwesomeIcon icon={faFileWord} />
          </SectionIcon>
          <div>
            <SectionTitle>DOCX Mapování polí</SectionTitle>
            <SectionSubtitle>
              Automatická extrakce a mapování programových polí
            </SectionSubtitle>
          </div>
        </SectionHeaderLeft>
      </SectionHeader>

      <SectionContent $expanded={true}>
        {!file && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <FontAwesomeIcon icon={faFileWord} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>Nejdříve nahrajte DOCX soubor pro analýzu programových polí</p>
          </div>
        )}

        {file && analyzing && (
          <ProcessingOverlay>
            <SpinnerIcon>
              <FontAwesomeIcon icon={faSpinner} spin />
            </SpinnerIcon>
            <p>Analyzuji DOCX soubor a hledám programová pole...</p>
          </ProcessingOverlay>
        )}

        {file && analysisResult && analysisResult.success && (
          <CompactMappingContainer>
            {/* Hlavní mapovací grid */}
            <MappingGrid>
              {/* Levý panel - DOCX pole */}
              <DocxFieldsPanel>
                <PanelHeader>
                  <PanelHeaderTop>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HeaderIcon><FontAwesomeIcon icon={faFileWord} /></HeaderIcon>
                      <HeaderTitle>DOCX Pole ({analysisResult.fields.filter(f => 
                        !docxFieldsSearch || f.name.toLowerCase().includes(docxFieldsSearch.toLowerCase())
                      ).length}/{analysisResult.fields.length})</HeaderTitle>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AIAutoMapButton
                        type="button"
                        onClick={handleAIAutoMapping}
                        disabled={aiMapping || !analysisResult.fields.length}
                      title="AI automatické mapování polí - nevyžaduje uložení"
                    >
                      <FontAwesomeIcon icon={aiMapping ? faSpinner : faCode} spin={aiMapping} />
                      {aiMapping ? 'Mapuji...' : 'AI Map'}
                    </AIAutoMapButton>
                    {file && (
                      <RefreshButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh();
                        }}
                        disabled={analyzing}
                        title="Obnovit detekci DOCX polí"
                      >
                        <FontAwesomeIcon
                          icon={faSync}
                          spin={analyzing}
                        />
                      </RefreshButton>
                    )}
                  </div>
                  </PanelHeaderTop>
                  
                  {/* Search box pro DOCX pole */}
                  <SearchBox>
                    <SearchIcon>
                      <FontAwesomeIcon icon={faSearch} />
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Hledat DOCX pole..."
                      value={docxFieldsSearch}
                      onChange={(e) => setDocxFieldsSearch(e.target.value)}
                    />
                    {docxFieldsSearch && (
                      <ClearSearchButton
                        type="button"
                        onClick={() => setDocxFieldsSearch('')}
                        title="Vymazat hledání"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </ClearSearchButton>
                    )}
                  </SearchBox>
                </PanelHeader>

                <DocxFieldsScrollArea>
                  {analysisResult.fields
                    .filter(field => !docxFieldsSearch || field.name.toLowerCase().includes(docxFieldsSearch.toLowerCase()))
                    .sort((a, b) => {
                      // Primární řazení: abecedně podle názvu
                      const nameComparison = a.name.localeCompare(b.name, 'cs', {
                        sensitivity: 'base',
                        numeric: true
                      });
                      if (nameComparison !== 0) return nameComparison;

                      // Sekundární řazení: podle typu pole
                      const typeOrder = { 'docvariable': 1, 'bookmark': 2, 'field': 3 };
                      return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
                    })
                    .map((field, index) => {
                      const fieldError = getFieldError(field.name);
                      return (
                    <DocxFieldCard
                      key={index}
                      $mapped={!!mapping[field.name]}
                      $hasError={!!fieldError}
                      $dragOver={dragOverTarget === field.name}
                    >
                      <FieldHeader>
                        <FieldTypeIcon $type={field.type}>
                          <FontAwesomeIcon icon={getFieldIcon(field.type)} />
                        </FieldTypeIcon>
                        <FieldName>
                          {field.name}
                          {/* ✅ Zobrazit počet výskytů vedle názvu pole */}
                          {field.count && field.count > 1 && (
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              fontWeight: '400',
                              fontStyle: 'italic'
                            }}>
                              (×{field.count})
                            </span>
                          )}
                        </FieldName>
                      </FieldHeader>

                      <MappingZone
                        $mapped={!!mapping[field.name]}
                        $dragOver={dragOverTarget === field.name}
                        onDragOver={(e) => handleDragOver(e, field.name)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, field.name)}
                      >
                        {multiMapping[field.name] ? (
                          // Multi-mapping zobrazení
                          <MultiMappedFields>
                            {multiMapping[field.name].map((mappedField, idx) => (
                              <div key={mappedField.key || idx}>
                                <MappedFieldChip
                                  $isComposed={mappedField.type === 'composed'}
                                  $isDragging={draggedChip?.docxFieldName === field.name && draggedChip?.fieldIndex === idx}
                                  $dragOver={dragOverChip?.docxFieldName === field.name && dragOverChip?.fieldIndex === idx}
                                  draggable
                                  onDragStart={(e) => handleChipDragStart(e, field.name, idx)}
                                  onDragOver={(e) => handleChipDragOver(e, field.name, idx)}
                                  onDragLeave={handleChipDragLeave}
                                  onDrop={(e) => handleChipDrop(e, field.name, idx)}
                                  title="Přetáhněte pro změnu pořadí"
                                >
                                  <FieldChipText>
                                    {mappedField.label || mappedField.key}
                                  </FieldChipText>
                                  <ChipRemoveButton
                                    type="button"
                                    onClick={() => handleRemoveFromMultiMapping(field.name, mappedField)}
                                    title="Odebrat z mapování"
                                  >
                                    <FontAwesomeIcon icon={faTimes} />
                                  </ChipRemoveButton>
                                </MappedFieldChip>
                                {idx < multiMapping[field.name].length - 1 && (
                                  <SeparatorIndicator>+ mezera +</SeparatorIndicator>
                                )}
                              </div>
                            ))}
                          </MultiMappedFields>
                        ) : mapping[field.name] ? (
                          // Single mapping zobrazení
                          <MappedField>
                            <MappedFieldLabel $hasError={!!fieldError}>
                              {orderFields.flatMap(g => g.fields).find(f => f.key === mapping[field.name])?.label || mapping[field.name]}
                            </MappedFieldLabel>
                            <UnmapButton
                              type="button"
                              onClick={() => handleRemoveMapping(field.name)}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </UnmapButton>
                          </MappedField>
                        ) : (
                          <DropPlaceholder>Přetáhněte pole (nebo více polí pro slučování)</DropPlaceholder>
                        )}
                      </MappingZone>

                      {/* Validační chyba pod mapováním */}
                      {fieldError && (
                        <>
                          <ValidationWarning>
                            {fieldError.type === 'deprecated' && (
                              <>
                                ❌ <strong>Zastaralá cesta:</strong> <code>{fieldError.apiPath}</code>
                                <div style={{ marginTop: '0.25rem' }}>💡 {fieldError.reason}</div>
                              </>
                            )}
                            {fieldError.type === 'invalid' && (
                              <>
                                ❌ <strong>Neplatná cesta:</strong> <code>{fieldError.apiPath}</code>
                                <div style={{ marginTop: '0.25rem' }}>💡 Toto pole neexistuje v enriched API</div>
                              </>
                            )}
                            {fieldError.type === 'missing_in_docx' && (
                              <>
                                🚨 <strong>Pole CHYBÍ v DOCX:</strong> <code>{field.name}</code>
                                <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                                  💡 {fieldError.reason}
                                </div>
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '4px', fontSize: '0.85rem' }}>
                                  ✅ <strong>Řešení:</strong> {fieldError.suggestion}
                                </div>
                              </>
                            )}
                          </ValidationWarning>
                          {fieldError.suggestion && fieldError.type !== 'missing_in_docx' && (
                            <ValidationSuggestion>
                              ✅ Použijte: <strong>{fieldError.suggestion}</strong>
                            </ValidationSuggestion>
                          )}
                        </>
                      )}
                    </DocxFieldCard>
                      );
                    })}
                </DocxFieldsScrollArea>
              </DocxFieldsPanel>

              {/* Pravý panel - DB pole s enrich daty */}
              <DatabaseFieldsPanel>
                <PanelHeader>
                  <PanelHeaderTop>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HeaderIcon><FontAwesomeIcon icon={faDownload} /></HeaderIcon>
                      <HeaderTitle>Databázová pole ({orderFields.reduce((sum, group) => 
                        sum + group.fields.filter(f => 
                          !dbFieldsSearch || 
                          f.label.toLowerCase().includes(dbFieldsSearch.toLowerCase()) ||
                          f.key.toLowerCase().includes(dbFieldsSearch.toLowerCase())
                        ).length, 0)}/{orderFields.reduce((sum, group) => sum + group.fields.length, 0)})</HeaderTitle>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ExpandCollapseButton
                      type="button"
                      onClick={areAllGroupsExpanded() ? collapseAllGroups : expandAllGroups}
                      title={areAllGroupsExpanded() ? 'Sbalit všechny skupiny' : 'Rozbalit všechny skupiny'}
                    >
                      <FontAwesomeIcon
                        icon={areAllGroupsExpanded() ? faAngleDoubleUp : faAngleDoubleDown}
                      />
                    </ExpandCollapseButton>
                  </div>
                  </PanelHeaderTop>
                  
                  {/* Search box pro DB pole */}
                  <SearchBox>
                    <SearchIcon>
                      <FontAwesomeIcon icon={faSearch} />
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Hledat DB pole..."
                      value={dbFieldsSearch}
                      onChange={(e) => setDbFieldsSearch(e.target.value)}
                    />
                    {dbFieldsSearch && (
                      <ClearSearchButton
                        type="button"
                        onClick={() => setDbFieldsSearch('')}
                        title="Vymazat hledání"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </ClearSearchButton>
                    )}
                  </SearchBox>
                </PanelHeader>

                <DatabaseFieldsScrollArea>
                  {orderFields.map(group => {
                    // Filtruj pole v rámci skupiny podle search termu
                    const filteredFields = group.fields.filter(field =>
                      !dbFieldsSearch ||
                      field.label.toLowerCase().includes(dbFieldsSearch.toLowerCase()) ||
                      field.key.toLowerCase().includes(dbFieldsSearch.toLowerCase())
                    );
                    
                    // Nezobrazuj skupinu, pokud nemá žádná filtrovaná pole
                    if (filteredFields.length === 0) return null;
                    
                    return (
                    <FieldGroup key={group.group}>
                      <GroupHeader
                        $expanded={expandedGroups[group.group]}
                        onClick={() => toggleGroup(group.group)}
                      >
                        <span>{group.group} ({filteredFields.length}/{group.fields.length})</span>
                        <GroupToggleIcon $expanded={expandedGroups[group.group]}>
                          <FontAwesomeIcon icon={faChevronDown} />
                        </GroupToggleIcon>
                      </GroupHeader>
                      <GroupFields $expanded={expandedGroups[group.group]}>
                        {filteredFields.map(field => {
                          // Rozděl label na český název a DB pole
                          const labelParts = field.label?.split('\n') || [field.label || field.key];
                          const czechName = labelParts[0]; // Český název nebo celý label
                          const dbFieldName = labelParts[1] || `{${field.key}}`; // {db_pole} nebo fallback

                          return (
                            <DatabaseFieldCard
                              key={field.key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, field, 'order')}
                              $isComposed={field.type === 'composed'}
                            >
                              {field.type === 'composed' && (
                                <ComposedFieldBadge>SLOŽENÉ</ComposedFieldBadge>
                              )}

                              <FieldInfo>
                                <FieldLabel>{czechName}</FieldLabel>
                                <FieldMeta>
                                  <FieldKey>{dbFieldName}</FieldKey>
                                  <FieldTypeTag>{field.type}</FieldTypeTag>
                                </FieldMeta>
                              </FieldInfo>

                              {field.type === 'composed' && field.composition && (
                                <ComposedFieldInfo>
                                  <div>Skládá se z: {field.composition.join(` ${field.separator || ' '} `)}</div>
                                  {field.template && (
                                    <div>Formát: {field.template}</div>
                                  )}
                                  <FieldComposition>
                                    {field.composition.map((composedField, idx) => (
                                      <ComposedFieldTag key={idx}>{composedField}</ComposedFieldTag>
                                    ))}
                                  </FieldComposition>
                                </ComposedFieldInfo>
                              )}
                            </DatabaseFieldCard>
                          );
                        })}
                      </GroupFields>
                    </FieldGroup>
                    );
                  })}
                </DatabaseFieldsScrollArea>
              </DatabaseFieldsPanel>
            </MappingGrid>
          </CompactMappingContainer>
        )}

        {file && analysisResult && !analysisResult.success && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>Chyba při analýze DOCX souboru: {analysisResult.error}</p>
          </div>
        )}

        {file && analysisResult && analysisResult.success && analysisResult.fields.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#f59e0b' }}>
            <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>V DOCX souboru nebyla nalezena žádná programová pole.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Zkontrolujte, zda dokument obsahuje merge fields, bookmarks nebo content controls.
            </p>
          </div>
        )}
      </SectionContent>
    </ExpandableSection>
  );
};

export default DocxMappingExpandableSection;