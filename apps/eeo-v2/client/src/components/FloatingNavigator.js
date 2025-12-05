import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Building,
  Package,
  Calendar,
  FileText as FileTextIcon,
  Calculator,
  Maximize2,
  Minimize2,
  Minus,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faClipboardCheck,
  faFileContract,
  faCheckCircle,
  faClipboard,
  faBookmark,
  faExpand,
  faCompress,
  faSave
} from '@fortawesome/free-solid-svg-icons';
import TemplateDropdown from './TemplateDropdown';

// Konstanta pro šířku navigátoru
const NAVIGATOR_WIDTH = 305; // +25px
const NAVIGATOR_MINIMIZED_WIDTH = 40;
const NAVIGATOR_COMPACT_WIDTH = 305; // Kompaktní režim (jen dropzone)
const DROPZONE_HEIGHT = 120;

// Styled Components
const NavigatorContainer = styled.div`
  position: fixed;
  top: ${props => props.$position.y}px;
  left: ${props => props.$position.x}px;
  width: ${props => {
    if (props.$isMinimized) return `${NAVIGATOR_MINIMIZED_WIDTH}px`;
    if (props.$isCompact) return `${NAVIGATOR_COMPACT_WIDTH}px`;
    return `${NAVIGATOR_WIDTH}px`;
  }};
  background: ${props => props.$isMinimized
    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)'
  };
  backdrop-filter: blur(12px);
  border-radius: ${props => props.$isMinimized ? '0 8px 8px 0' : '12px'};
  box-shadow: ${props => props.$isMinimized
    ? '0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06)'
    : '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08)'};
  z-index: ${props => props.$isFullscreen ? '999999' : '99999'};
  cursor: ${props => props.$isDragging ? 'grabbing' : 'default'};
  transition: ${props => props.$isDragging
    ? 'none'
    : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'};
  display: flex;
  flex-direction: column;
  max-height: ${props => props.$isMinimized ? '400px' : '80vh'};
  user-select: none;
  will-change: width, left, border-radius, box-shadow;

  ${props => props.$isMinimized && `
    left: 0;
    border-radius: 0 8px 8px 0;
  `}
`;

const NavigatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.$isMinimized ? '12px 8px' : '16px 20px'};
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e2e8f0;
  cursor: ${props => props.$isMinimized ? 'default' : 'grab'};
  border-radius: ${props => props.$isMinimized ? '0 8px 0 0' : '12px 12px 0 0'};
  transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    cursor: ${props => props.$isMinimized ? 'default' : 'grabbing'};
  }
`;

const MinimizedText = styled.div`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  letter-spacing: 2px;
  text-transform: uppercase;
  line-height: 1.2;
  animation: fadeInScaleDelayed 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;

  @keyframes fadeInScaleDelayed {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const NavigatorTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeInSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  svg {
    width: 18px;
    height: 18px;
    color: #3b82f6;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  animation: fadeInSlideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeInSlideLeft {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const ToolbarSection = styled.div`
  padding: 12px 16px;
  border-bottom: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ToolbarButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ToolbarButton = styled.button`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  color: #475569;
  opacity: ${props => props.disabled ? 0.4 : 1};
  position: relative;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  ${props => props.$withPlus && `
    &::after {
      content: '+';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background: #f59e0b;
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }
  `}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const IconButton = styled.button`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #475569;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MinimizedExpandButton = styled(IconButton)`
  margin: 8px auto;
  display: flex;
  animation: fadeInBounce 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;

  @keyframes fadeInBounce {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(-10px);
    }
    60% {
      transform: scale(1.05) translateY(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const NavigatorContent = styled.div`
  flex: 1;
  overflow: hidden;
  padding: ${props => props.$isMinimized ? '8px 4px' : '12px 8px'};
  transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$isMinimized ? '0' : '1'};
  transform: ${props => props.$isMinimized ? 'scale(0.95) translateX(-10px)' : 'scale(1) translateX(0)'};
  transform-origin: left center;

  ${props => !props.$isMinimized && `
    overflow-y: auto;
  `}

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;

    &:hover {
      background: rgba(100, 116, 139, 0.7);
    }
  }
`;

const SectionItem = styled.div`
  padding: ${props => props.$isMinimized ? '8px 4px' : '10px 14px'};
  margin-bottom: 6px;
  border-radius: 8px;
  cursor: pointer; /* ✅ Vždy pointer - umožňuje scrollování i k zamčeným sekcím */
  transition: all 0.2s ease;
  opacity: ${props => props.$isDisabled ? 0.45 : 1};
  background: ${props => {
    if (props.$isDisabled) return 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
    return props.$bgColor || 'rgba(255, 255, 255, 0.8)';
  }};
  border: 2px solid ${props => {
    if (props.$isDisabled) return '#cbd5e1';
    return props.$borderColor || '#94a3b8';
  }};
  box-shadow: ${props => props.$isActive
    ? '0 2px 8px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(59, 130, 246, 0.3)'
    : '0 1px 3px rgba(0, 0, 0, 0.05)'
  };

  &:hover {
    opacity: ${props => props.$isDisabled ? 0.55 : 1}; /* ✅ Mírné zesvětlení i pro disabled */
    transform: translateX(2px); /* ✅ Hover efekt i pro disabled - ukazuje že je to klikatelné */
    box-shadow: ${props => props.$isDisabled
      ? '0 2px 6px rgba(0, 0, 0, 0.08)' /* ✅ Mírný stín pro disabled */
      : '0 4px 12px rgba(0, 0, 0, 0.12)'
    };
  }
`;

const SectionItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.$isMinimized ? '0' : '12px'};
  justify-content: ${props => props.$isMinimized ? 'center' : 'flex-start'};
`;

const SectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.$isDisabled ? '#64748b' : props.$color || '#94a3b8'};
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SectionInfo = styled.div`
  flex: 1;
  min-width: 0;
  color: ${props => props.$textColor || '#1e293b'};
`;

const SectionName = styled.div`
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ValidationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$hasErrors ? '#ef4444' : '#10b981'};
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  flex-shrink: 0;
`;

const DropzoneContainer = styled.div`
  margin: 12px 8px 12px 8px;
  padding: ${props => props.$isMinimized ? '12px 8px' : '20px'};
  border: 2px dashed ${props => props.$isDisabled ? '#d1d5db' : (props.$isDragOver ? '#dc2626' : '#fca5a5')};
  border-radius: 8px;
  background: ${props => props.$isDisabled
    ? '#f3f4f6'
    : (props.$isDragOver
      ? 'linear-gradient(135deg, rgba(254, 202, 202, 0.5) 0%, rgba(252, 165, 165, 0.5) 100%)'
      : 'linear-gradient(135deg, rgba(254, 226, 226, 0.3) 0%, rgba(254, 202, 202, 0.3) 100%)')
  };
  transition: all 0.2s ease;
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$isDisabled ? 0.5 : 1};
  pointer-events: ${props => props.$isDisabled ? 'none' : 'auto'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.$isMinimized ? '4px' : '8px'};
  height: ${props => props.$isMinimized ? '60px' : `${DROPZONE_HEIGHT}px`};

  &:hover {
    border-color: ${props => props.$isDisabled ? '#d1d5db' : '#dc2626'};
    background: ${props => props.$isDisabled ? '#f3f4f6' : 'linear-gradient(135deg, rgba(254, 202, 202, 0.5) 0%, rgba(252, 165, 165, 0.5) 100%)'};
  }
`;

const DropzoneIcon = styled.div`
  color: ${props => props.$isDisabled ? '#9ca3af' : (props.$isDragOver ? '#dc2626' : '#991b1b')};
  transition: all 0.2s ease;

  svg {
    width: ${props => props.$isMinimized ? '20px' : '32px'};
    height: ${props => props.$isMinimized ? '20px' : '32px'};
  }
`;

const DropzoneText = styled.div`
  font-size: ${props => props.$isMinimized ? '10px' : '13px'};
  font-weight: 600;
  color: ${props => props.$isDisabled ? '#9ca3af' : (props.$isDragOver ? '#dc2626' : '#991b1b')};
  text-align: center;
  line-height: 1.4;
`;

// Definice sekcí formuláře - barvy odpovídají OrderForm25 schématu
const FORM_SECTIONS = [
  {
    id: 'objednatel',
    name: 'Informace o objednateli',
    icon: faUser,
    color: '#4b5563', // section-grey text color
    bgColor: 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
    borderColor: '#9ca3af',
    phase: 1,
    required: ['jmeno', 'prijmeni']
  },
  {
    id: 'schvaleni',
    name: 'Schválení nákupu PO',
    icon: faClipboardCheck,
    color: '#4b5563', // section-grey text color
    bgColor: 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
    borderColor: '#9ca3af',
    phase: 1,
    required: ['schvalovatel_id']
  },
  // 'financovani' je podsekce schválení - není v navigátoru samostatně
  {
    id: 'dodavatel',
    name: 'Dodavatel',
    icon: Building,
    iconType: 'lucide',
    color: '#92400e', // section-orange text color
    bgColor: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.95) 100%)',
    borderColor: '#f59e0b',
    phase: 2,
    required: ['dodavatel_ico', 'dodavatel_nazev']
  },
  {
    id: 'detaily',
    name: 'Detaily objednávky',
    icon: Package,
    iconType: 'lucide',
    color: '#92400e', // section-orange text color
    bgColor: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.95) 100%)',
    borderColor: '#f59e0b',
    phase: 2,
    required: ['predmet', 'celkova_cena']
  },
  {
    id: 'dodaci_podminky',
    name: 'Dodací a záruční podmínky',
    icon: Calendar,
    iconType: 'lucide',
    color: '#92400e', // section-orange text color
    bgColor: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.95) 100%)',
    borderColor: '#f59e0b',
    phase: 2,
    required: []
  },
  {
    id: 'prilohy',
    name: 'Přílohy k objednávce',
    icon: FileTextIcon,
    iconType: 'lucide',
    color: '#991b1b', // section-red text color
    bgColor: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 202, 202, 0.95) 100%)',
    borderColor: '#dc2626',
    phase: 2,
    required: []
  },
  {
    id: 'stav_odeslani',
    name: 'Stav odeslání objednávky',
    icon: Package,
    iconType: 'lucide',
    color: '#92400e', // section-orange text color
    bgColor: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.95) 100%)',
    borderColor: '#f59e0b',
    phase: 3,
    required: []
  },
  {
    id: 'potvrzeni_objednavky',
    name: 'Potvrzení objednávky',
    icon: faCheckCircle,
    color: '#1e40af', // section-blue text color
    bgColor: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.95) 100%)',
    borderColor: '#3b82f6',
    phase: 3,
    required: []
  },
  {
    id: 'registr_smluv',
    name: 'Registr smluv',
    icon: faFileContract,
    color: '#1e40af', // section-blue text color
    bgColor: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.95) 100%)',
    borderColor: '#3b82f6',
    phase: 4,
    required: []
  },
  {
    id: 'registr_smluv_vyplneni',
    name: 'Potvrzení zveřejnění',
    icon: faFileContract,
    color: '#7e22ce', // section-purple text color
    bgColor: 'linear-gradient(135deg, rgba(243, 232, 255, 0.95) 0%, rgba(233, 213, 255, 0.95) 100%)',
    borderColor: '#a855f7',
    phase: 5,
    required: []
  },
  {
    id: 'fakturace',
    name: 'Fakturace',
    icon: Calculator,
    iconType: 'lucide',
    color: '#1e40af', // section-blue text color
    bgColor: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.95) 100%)',
    borderColor: '#3b82f6',
    phase: 6,
    required: []
  },
  {
    id: 'vecna_spravnost',
    name: 'Věcná správnost',
    icon: CheckCircle2,
    iconType: 'lucide',
    color: '#1e40af', // section-blue text color
    bgColor: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.95) 100%)',
    borderColor: '#3b82f6',
    phase: 7,
    required: []
  },
  {
    id: 'dokonceni',
    name: 'Dokončení',
    icon: faCheckCircle,
    color: '#059669', // zelená pro dokončení
    bgColor: 'linear-gradient(135deg, rgba(209, 250, 229, 0.95) 0%, rgba(167, 243, 208, 0.95) 100%)',
    borderColor: '#10b981',
    phase: 8,
    required: []
  }
  // ✅ "Přílohy k objednávce" jsou vyrenderované SAMOSTATNĚ POD dropzone (viz níže v JSX)
];

/**
 * FloatingNavigator - Plovoucí navigátor pro OrderForm25
 *
 * @param {Object} props
 * @param {Function} props.onSectionClick - Callback při kliknutí na sekci (sectionId)
 * @param {Function} props.onFilesDrop - Callback při dropnutí souborů (files)
 * @param {number} props.currentPhase - Aktuální fáze workflow (1-5+)
 * @param {Object} props.validationErrors - Objekt s validačními chybami
 * @param {Object} props.formData - Data formuláře pro kontrolu vyplnění
 * @param {boolean} props.isFullscreen - Zda je formulář ve fullscreen režimu
 * @param {Function} props.isSectionActive - Funkce pro určení, zda je sekce aktivní
 * @param {boolean} props.canPublishRegistry - Má uživatel právo ORDER_PUBLISH_REGISTRY
 */
const FloatingNavigator = ({
  onSectionClick,
  onFilesDrop,
  onToggleSections, // ✅ Nové: callback pro sbalení/rozbalení sekcí
  areSectionsCollapsed = false, // ✅ Nové: stav sbalení sekcí
  currentPhase = 1,
  validationErrors = {},
  formData = {},
  isFullscreen = false,
  isSectionActive,
  allSectionStates = {}, // ✅ Přidáno: stavy sekcí z workflowManager
  isWorkflowCompleted = false, // ✅ Nové: indikátor dokončeného workflow (DOKONCENA/ZAMITNUTA/ZRUSENA)
  canPublishRegistry = false, // 🔒 Nové: oprávnění pro sekci registru smluv
  canUnlockAnything = false, // 🔒 Nové: pouze ADMIN + ORDER_MANAGE vidí sekci Dokončení
  // 🎯 NOVÉ: Toolbar akce
  onTemplateClick,
  onSaveAsTemplate,
  onGenerateDocx,
  onToggleFullscreen,
  canGenerateDocx = false,
  canSaveTemplate = false,
  // 📋 Template Dropdown props
  showTemplateDropdown = false,
  serverTemplates = [],
  savedTemplates = [],
  templatesLoading = false,
  searchQuery = '',
  showSearch = false,
  token = null,
  hasPermission,
  onTemplateSearch,
  onToggleTemplateSearch,
  onRefreshTemplates,
  onFillPoApproval,
  onFillDetails,
  canFillTemplate = true, // ✅ Nové: může uživatel vyplnit data ze šablony
  onCopyTemplateToUser,
  onCopyTemplateToGlobal,
  onShowTemplatePreview,
  onDeleteTemplate,
  onEditTemplateName,
  editingTemplateId = null,
  editingTemplateName = '',
  matchesTemplateQuery,
  isArchived = false
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCompact, setIsCompact] = useState(false); // ✅ Nový: Kompaktní režim
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 150 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false); // 📋 State pro dropdown šablon
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const contentRef = useRef(null); // ✅ Ref pro scroll pozici

  // Save position to localStorage
  const savePosition = useCallback((newPosition) => {
    localStorage.setItem('floatingNavigatorPosition', JSON.stringify(newPosition));
  }, []);

  // ✅ Funkce pro kontrolu a úpravu pozice při změně velikosti okna
  const constrainToViewport = useCallback((pos) => {
    const navigatorWidth = isMinimized ? NAVIGATOR_MINIMIZED_WIDTH :
                           isCompact ? NAVIGATOR_COMPACT_WIDTH : NAVIGATOR_WIDTH;

    // Minimální okraj kolem navigátoru
    const margin = 20;
    
    // Získat skutečnou výšku navigátoru z DOM
    const navigatorHeight = containerRef.current?.offsetHeight || 400;

    const maxX = Math.max(0, window.innerWidth - navigatorWidth - margin);
    const maxY = Math.max(0, window.innerHeight - navigatorHeight - margin);

    const constrainedX = Math.max(0, Math.min(pos.x, maxX));
    const constrainedY = Math.max(0, Math.min(pos.y, maxY));

    return { x: constrainedX, y: constrainedY };
  }, [isMinimized, isCompact]);

    // Load position and scroll from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('floatingNavigatorPosition');
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        // ✅ Zkontrolovat, zda uložená pozice je stále validní pro aktuální velikost okna
        const constrainedPos = constrainToViewport(savedPos);
        setPosition(constrainedPos);

        // Uložit upravenou pozici, pokud se změnila
        if (constrainedPos.x !== savedPos.x || constrainedPos.y !== savedPos.y) {
          savePosition(constrainedPos);
        }
      } catch (e) {
        console.warn('Failed to parse saved navigator position');
      }
    }

    const savedMinimized = localStorage.getItem('floatingNavigatorMinimized');
    if (savedMinimized === 'true') {
      setIsMinimized(true);
    }

    const savedCompact = localStorage.getItem('floatingNavigatorCompact');
    if (savedCompact === 'true') {
      setIsCompact(true);
    }

    // ✅ Obnovení scroll pozice
    const savedScroll = localStorage.getItem('floatingNavigatorScroll');
    if (savedScroll && contentRef.current) {
      try {
        const scrollPos = parseInt(savedScroll, 10);
        contentRef.current.scrollTop = scrollPos;
      } catch (e) {
        console.warn('Failed to restore scroll position');
      }
    }
  }, [constrainToViewport, savePosition]);

  // ✅ Handler pro změnu velikosti okna
  const handleWindowResize = useCallback(() => {
    setPosition(prevPosition => {
      const newPosition = constrainToViewport(prevPosition);

      // Uložit novou pozici jen pokud se skutečně změnila
      if (newPosition.x !== prevPosition.x || newPosition.y !== prevPosition.y) {
        savePosition(newPosition);
        return newPosition;
      }

      return prevPosition;
    });
  }, [constrainToViewport, savePosition]);

  // ✅ Sledování změn velikosti okna
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize handler pro lepší výkon
      clearTimeout(handleResize.timeoutId);
      handleResize.timeoutId = setTimeout(handleWindowResize, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(handleResize.timeoutId);
    };
  }, [handleWindowResize]);

  // Save minimized state
  const saveMinimizedState = useCallback((minimized) => {
    localStorage.setItem('floatingNavigatorMinimized', minimized.toString());
  }, []);

  // Save compact state
  const saveCompactState = useCallback((compact) => {
    localStorage.setItem('floatingNavigatorCompact', compact.toString());
  }, []);

  // ✅ Save scroll position (debounced)
  const scrollTimeoutRef = useRef(null);
  const saveScrollPosition = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (contentRef.current) {
        localStorage.setItem('floatingNavigatorScroll', contentRef.current.scrollTop.toString());
      }
    }, 300); // uloží až po 300ms bez scrollování
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (isMinimized) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, [isMinimized]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Použít centralizovanou constraint logiku
    const constrainedPosition = constrainToViewport({ x: newX, y: newY });

    setPosition(constrainedPosition);
  }, [isDragging, dragOffset, constrainToViewport]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position, savePosition]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Toggle minimized
  const toggleMinimized = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    saveMinimizedState(newMinimized);

    if (newMinimized) {
      // Přilepit k levému okraji
      const newPosition = { ...position, x: 0 };
      setPosition(newPosition);
      savePosition(newPosition);
    } else {
      // Při rozbálení zkontrolovat, zda je pozice stále validní
      setPosition(prevPos => {
        const constrainedPos = constrainToViewport(prevPos);
        if (constrainedPos.x !== prevPos.x || constrainedPos.y !== prevPos.y) {
          savePosition(constrainedPos);
        }
        return constrainedPos;
      });
    }
  }, [isMinimized, position, saveMinimizedState, savePosition, constrainToViewport]);

  // Toggle compact mode
  const toggleCompact = useCallback(() => {
    const newCompact = !isCompact;
    setIsCompact(newCompact);
    saveCompactState(newCompact);

    // Po změně compact režimu zkontrolovat pozici (jiná šířka navigátoru)
    setTimeout(() => {
      setPosition(prevPos => {
        const constrainedPos = constrainToViewport(prevPos);
        if (constrainedPos.x !== prevPos.x || constrainedPos.y !== prevPos.y) {
          savePosition(constrainedPos);
        }
        return constrainedPos;
      });
    }, 50); // Krátká prodleva pro dokončení CSS přechodu
  }, [isCompact, saveCompactState, constrainToViewport, savePosition]);

  // Dropzone handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Zkontroluj, zda opravdu opouštíme celou dropzone oblast
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFilesDrop) {
      onFilesDrop(files);
    }
  }, [onFilesDrop]);

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFilesDrop) {
      onFilesDrop(files);
    }
    // Reset input
    e.target.value = '';
  }, [onFilesDrop]);

  // 📋 Handler pro toggle template dropdownu
  const handleToggleTemplateDropdown = useCallback(() => {
    setIsTemplateDropdownOpen(prev => !prev);
    // Při otevření volitelně zavolat refresh šablon
    if (!isTemplateDropdownOpen && onRefreshTemplates) {
      onRefreshTemplates();
    }
  }, [isTemplateDropdownOpen, onRefreshTemplates]);

  // 📋 Zavřít dropdown při kliknutí mimo něj
  useEffect(() => {
    if (!isTemplateDropdownOpen) return;

    const handleClickOutside = (event) => {
      // Zkontroluj, jestli klik nebyl na tlačítko nebo dropdown
      const dropdown = event.target.closest('[data-template-dropdown]');
      const toolbarButton = event.target.closest('[data-template-button]');
      
      if (!dropdown && !toolbarButton) {
        setIsTemplateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplateDropdownOpen]);

  // Section click handler - umožňuje scrollování i k zamčeným sekcím pro čtení
  const handleSectionClick = useCallback((section) => {
    if (onSectionClick) {
      onSectionClick(section.id);
    }
  }, [onSectionClick]);

  // Count fields for section - počítá VŠECHNY chyby validace v sekci
  const getSectionValidationInfo = useCallback((section) => {
    // Najdi všechny validační chyby pro tuto sekci
    // Validační chyby mají klíče ve formátu "nazev_pole" nebo obsahují section.id
    const sectionErrors = Object.keys(validationErrors).filter(key => {
      // Hledáme chyby které patří k této sekci
      // Může být buď přímý match, nebo prefix
      return key.includes(section.id) || validationErrors[key]?.section === section.id;
    });

    const errorCount = sectionErrors.length;

    return {
      missingCount: 0, // Nepoužíváme - zobrazujeme jen chyby
      errorCount: errorCount,
      totalRequired: errorCount // Pro zobrazení použijeme počet chyb
    };
  }, [validationErrors]);

  // ✅ Kontrola viditelnosti a enabled stavu podle WorkflowManager
  const isSectionVisibleAndEnabled = useCallback((sectionId) => {
    const sectionState = allSectionStates[sectionId];
    if (!sectionState) return { visible: true, enabled: true }; // fallback

    // ✅ Používat section states přímo z WorkflowManager (přes allSectionStates)
    // Všechny podmínky viditelnosti jsou už vyřešené v OrderForm25 (extendedSectionStates)
    return {
      visible: sectionState.visible !== false, // sekce je viditelná
      enabled: sectionState.enabled !== false  // sekce je enabled (ne disabled)
    };
  }, [allSectionStates]);

  // Render section icon
  const renderSectionIcon = (section) => {
    if (section.iconType === 'lucide') {
      const IconComponent = section.icon;
      return <IconComponent />;
    }
    return <FontAwesomeIcon icon={section.icon} />;
  };

  const navigatorContent = (
    <NavigatorContainer
      ref={containerRef}
      $position={position}
      $isMinimized={isMinimized}
      $isCompact={isCompact}
      $isDragging={isDragging}
      $isFullscreen={isFullscreen}
    >
      <NavigatorHeader
        $isMinimized={isMinimized}
        onMouseDown={handleMouseDown}
      >
        {isMinimized ? (
          <MinimizedText>NAVIGATOR</MinimizedText>
        ) : (
          <>
            <NavigatorTitle>
              <Menu />
              Navigace
            </NavigatorTitle>
            <HeaderControls>
              <IconButton
                onClick={toggleCompact}
                title={isCompact ? "Zobrazit všechny sekce" : "Zobrazit jen Přílohy + Dropzone"}
              >
                {isCompact ? <Maximize2 /> : <Minimize2 />}
              </IconButton>
              <IconButton onClick={toggleMinimized} title="Minimalizovat (schovat na levou stranu)">
                <ChevronLeft />
              </IconButton>
            </HeaderControls>
          </>
        )}
      </NavigatorHeader>

      {/* 🎯 TOOLBAR: Akce pro práci s objednávkou */}
      {!isMinimized && (
        <ToolbarSection>
          <ToolbarButtons>
            <ToolbarButton
              data-template-button
              onClick={handleToggleTemplateDropdown}
              title={canFillTemplate ? "Načíst šablonu objednávky" : "Načítání šablon není k dispozici - objednávka je dokončena nebo má neuložené změny"}
              disabled={!canFillTemplate}
            >
              <FontAwesomeIcon icon={faBookmark} />
            </ToolbarButton>
            {onSaveAsTemplate && (
              <ToolbarButton
                $withPlus
                onClick={onSaveAsTemplate}
                title="Uložit aktuální formulář jako šablonu"
                disabled={!canSaveTemplate}
              >
                <FontAwesomeIcon icon={faBookmark} />
              </ToolbarButton>
            )}
            {onGenerateDocx && (
              <ToolbarButton
                onClick={onGenerateDocx}
                title="Generovat DOCX ze šablony"
                disabled={!canGenerateDocx}
              >
                <FileDown size={16} />
              </ToolbarButton>
            )}
            {onToggleSections && (
              <ToolbarButton
                onClick={onToggleSections}
                title={areSectionsCollapsed ? "Rozbalit všechny sekce" : "Sbalit zamčené sekce"}
              >
                {areSectionsCollapsed ? <ChevronDown size={16} /> : <Minus size={16} />}
              </ToolbarButton>
            )}
            {onToggleFullscreen && (
              <ToolbarButton
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Ukončit fullscreen režim" : "Přepnout do fullscreen režimu"}
              >
                <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
              </ToolbarButton>
            )}
          </ToolbarButtons>
          
          {/* 📋 Dropdown se šablonami - zobrazí se pod ikonami */}
          <div data-template-dropdown style={{ position: 'relative' }}>
            <TemplateDropdown
              show={isTemplateDropdownOpen}
              serverTemplates={serverTemplates}
              savedTemplates={savedTemplates}
              templatesLoading={templatesLoading}
              searchQuery={searchQuery}
              showSearch={showSearch}
              currentPhase={currentPhase}
              isArchived={isArchived}
              token={token}
              hasPermission={hasPermission}
              onSearch={onTemplateSearch}
              onToggleSearch={onToggleTemplateSearch}
              onRefresh={onRefreshTemplates}
              onFillPo={onFillPoApproval}
              onFillDetails={onFillDetails}
              canFillTemplate={canFillTemplate}
              onCopyToUser={onCopyTemplateToUser}
              onCopyToGlobal={onCopyTemplateToGlobal}
              onShowPreview={onShowTemplatePreview}
              onDelete={onDeleteTemplate}
              onEditName={onEditTemplateName}
              editingTemplateId={editingTemplateId}
              editingTemplateName={editingTemplateName}
              matchesQuery={matchesTemplateQuery}
            />
          </div>
        </ToolbarSection>
      )}

      {/* Tlačítko pro rozbalení když je minimalizovaný */}
      {isMinimized && (
        <MinimizedExpandButton
          onClick={toggleMinimized}
          title="Rozbalit navigátor"
        >
          <ChevronRight />
        </MinimizedExpandButton>
      )}

      {!isMinimized && (
        <NavigatorContent
          ref={contentRef}
          $isMinimized={isMinimized}
          onScroll={saveScrollPosition}
        >
          {/* ✅ ČÁST 1: Všechny položky menu z FORM_SECTIONS */}
          {FORM_SECTIONS.map((section) => {
            // ❌ SKIP "prilohy" - renderuje se samostatně pod dropzone
            if (section.id === 'prilohy') return null;

            // ✅ V kompaktním režimu SKRÝT všechny běžné sekce
            if (isCompact) return null;

            // ✅ Kontrola viditelnosti podle WorkflowManager
            const { visible, enabled } = isSectionVisibleAndEnabled(section.id);

            // Pokud sekce není viditelná, neukázat ji
            if (!visible) return null;

            const isDisabled = !enabled; // ✅ Disabled podle WorkflowManager
            const isActive = isSectionActive ? isSectionActive(section.id) : false;
            const validationInfo = getSectionValidationInfo(section);
            const showBadge = validationInfo.errorCount > 0; // ✅ Zobrazit jen pokud jsou chyby

            return (
              <SectionItem
                key={section.id}
                $isDisabled={isDisabled}
                $isActive={isActive}
                $color={section.color}
                $bgColor={section.bgColor}
                $borderColor={section.borderColor}
                $isMinimized={isMinimized}
                onClick={() => handleSectionClick(section)}
                title={isDisabled ? `${section.name} (zamčeno - kliknutím zobrazíte vyplněná data)` : section.name}
              >
                <SectionItemContent $isMinimized={isMinimized}>
                  <SectionIcon $color={section.color} $isDisabled={isDisabled}>
                    {renderSectionIcon(section)}
                  </SectionIcon>
                  {!isMinimized && (
                    <SectionInfo $textColor={isDisabled ? '#64748b' : section.color}>
                      <SectionName $isDisabled={isDisabled}>
                        {section.name}
                        {showBadge && (
                          <ValidationBadge $hasErrors={true}>
                            {validationInfo.errorCount}
                          </ValidationBadge>
                        )}
                      </SectionName>
                    </SectionInfo>
                  )}
                </SectionItemContent>
              </SectionItem>
            );
          })}
        </NavigatorContent>
      )}

      {/* ✅ DROPZONE - JEN když má objednávka ID (je uložená) */}
      {!isMinimized && formData.id && (() => {
        // ⚠️ Použít stejnou logiku jako pro sekci Přílohy
        const sectionState = allSectionStates?.prilohy;
        const isDropzoneDisabled = sectionState ? !sectionState.enabled : isWorkflowCompleted;
        
        return (
        <DropzoneContainer
          $isDragOver={isDragOver}
          $isMinimized={isMinimized}
          $isDisabled={isDropzoneDisabled}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleDropzoneClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <DropzoneIcon 
            $isDragOver={isDragOver} 
            $isMinimized={isMinimized}
            $isDisabled={isDropzoneDisabled}
          >
            <Upload />
          </DropzoneIcon>
          <DropzoneText 
            $isDragOver={isDragOver} 
            $isMinimized={isMinimized}
            $isDisabled={isDropzoneDisabled}
          >
            {isDragOver ? 'Pusťte soubory zde' : 'Přetáhněte soubory'}
          </DropzoneText>
        </DropzoneContainer>
        );
      })()}

      {/* ✅ INFORMAČNÍ BANNER - když je dropzone vypnutá kvůli zamčené objednávce */}
      {!isMinimized && formData.id && (() => {
        const sectionState = allSectionStates?.prilohy;
        const isDropzoneDisabled = sectionState ? !sectionState.enabled : isWorkflowCompleted;
        return isDropzoneDisabled && (
        <div style={{
          margin: '12px 8px',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(229, 229, 229, 0.95) 0%, rgba(209, 213, 219, 0.95) 100%)',
          border: '2px solid #9ca3af',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#4b5563',
          fontSize: '13px',
          fontWeight: '600',
          lineHeight: '1.4'
        }}>
          <div style={{ marginBottom: '4px' }}>🔒 Objednávka zamčena</div>
          <div style={{ fontSize: '11px', fontWeight: '400' }}>
            Přílohy jsou uzamčené
          </div>
        </div>
        );
      })()}

      {/* ✅ ČÁST 3: Sekce "Přílohy k objednávce" POD dropzone - JEN když má objednávka ID */}
      {!isMinimized && formData.id && (() => {
        // ✅ Samostatná sekce "Přílohy k objednávce" (není v FORM_SECTIONS ani SECTION_DEFINITIONS)
        const section = {
          id: 'prilohy',
          name: 'Přílohy k objednávce',
          icon: faClipboard,
          color: '#991b1b',
          bgColor: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 202, 202, 0.95) 100%)',
          borderColor: '#dc2626'
        };

        // ✅ Sekce Přílohy je disabled, když je objednávka zamčená (dokončena/zamítnuta/zrušena) - CENTRÁLNÍ ŘÍZENÍ
        // ⚠️ DŮLEŽITÉ: Použít allSectionStates pokud je dostupný (přichází z OrderForm25.js s isPrilohyLocked)
        const sectionState = allSectionStates?.prilohy;
        const isDisabled = sectionState ? !sectionState.enabled : isWorkflowCompleted;
        const isActive = isSectionActive ? isSectionActive(section.id) : false;
        const validationInfo = getSectionValidationInfo(section);
        const showBadge = validationInfo.errorCount > 0;

        return (
          <NavigatorContent $isMinimized={isMinimized}>
            <SectionItem
              $isDisabled={isDisabled}
              $isActive={isActive}
              $color={section.color}
              $bgColor={section.bgColor}
              $borderColor={section.borderColor}
              $isMinimized={isMinimized}
              onClick={() => handleSectionClick(section)}
              title={isDisabled ? `${section.name} (zamčeno - kliknutím zobrazíte vyplněná data)` : section.name}
            >
              <SectionItemContent $isMinimized={isMinimized}>
                <SectionIcon $color={section.color} $isDisabled={isDisabled}>
                  <FontAwesomeIcon icon={section.icon} />
                </SectionIcon>
                {!isMinimized && (
                  <SectionInfo $textColor={isDisabled ? '#64748b' : section.color}>
                    <SectionName $isDisabled={isDisabled}>
                      {section.name}
                      {showBadge && (
                        <ValidationBadge $hasErrors={true}>
                          {validationInfo.errorCount}
                        </ValidationBadge>
                      )}
                    </SectionName>
                  </SectionInfo>
                )}
              </SectionItemContent>
            </SectionItem>
          </NavigatorContent>
        );
      })()}
    </NavigatorContainer>
  );

  // Použití React Portal pro vykreslení mimo DOM hierarchii rodiče
  return typeof document !== 'undefined'
    ? ReactDOM.createPortal(navigatorContent, document.body)
    : navigatorContent;
};

export default FloatingNavigator;
