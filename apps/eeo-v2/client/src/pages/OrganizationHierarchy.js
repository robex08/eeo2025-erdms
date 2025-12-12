import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  Handle,
  Position,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import dagre from 'dagre';
import { graphlib } from 'dagre';
import { loadAuthData } from '../utils/authStorage';
import { 
  faSitemap, 
  faUsers, 
  faMapMarkerAlt, 
  faBell, 
  faKey,
  faSearch,
  faPlus,
  faTimes,
  faChevronDown,
  faChevronRight,
  faUserTie,
  faBuilding,
  faEnvelope,
  faSave,
  faTrash,
  faEdit,
  faEye,
  faEyeSlash,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

// Potlačit neškodnou ResizeObserver chybu (běžné u ReactFlow)
const resizeObserverErr = window.console.error;
window.console.error = (...args) => {
  if (args[0]?.includes?.('ResizeObserver loop completed')) {
    return; // Ignorovat tuto konkrétní chybu
  }
  resizeObserverErr(...args);
};

// Styled Components
const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  margin-top: -1em; /* Kompenzace padding-top z Layout Content */
`;

const Header = styled.div`
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: ${props => props.primary ? '#3b82f6' : 'white'};
  color: ${props => props.primary ? '#fff' : '#2c3e50'};
  border: 1px solid ${props => props.primary ? '#3b82f6' : '#e0e6ed'};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background: ${props => props.primary ? '#2563eb' : '#f8fafc'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #dc2626;
  font-size: 1.25rem;
  font-weight: 700;
`;

const ModalBody = styled.div`
  color: #475569;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 24px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.variant === 'danger' ? `
    background: #dc2626;
    color: white;
    &:hover {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    }
  ` : `
    background: #f1f5f9;
    color: #475569;
    &:hover {
      background: #e2e8f0;
    }
  `}
`;


const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 400px;
  background: white;
  border-right: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e6ed;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SidebarTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SearchBox = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e0e6ed;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 32px 8px 36px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: #f8fafc;
  color: #2c3e50;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 28px;
  top: 22px;
  color: #94a3b8;
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 24px;
  top: 20px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #e2e8f0;
    color: #475569;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  padding-bottom: 190px; /* Prostor pro obě fixní tlačítka (Přidat vybrané + Resetovat plochu) */

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const CollapsibleSection = styled.div`
  margin-bottom: 8px;
`;

const SectionHeader = styled.div`
  padding: 10px 12px;
  background: ${props => props.expanded ? '#f1f5f9' : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
  }

  svg:first-of-type {
    width: 12px;
  }
`;

const SectionContent = styled.div`
  margin-top: 4px;
  padding-left: 8px;
  display: ${props => props.expanded ? 'block' : 'none'};
`;

const UserItem = styled.div`
  padding: 10px 12px;
  margin-bottom: 6px;
  background: ${props => props.isDragging ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
  border: 2px solid ${props => props.isDragging ? '#667eea' : '#e0e6ed'};
  border-radius: 8px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  color: ${props => props.isDragging ? '#fff' : '#2c3e50'};
  box-shadow: ${props => props.isDragging ? '0 8px 24px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'};

  &:hover {
    border-color: #3b82f6;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  &:active {
    cursor: grabbing;
  }
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
`;

const UserMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  gap: 6px;
  align-items: center;
`;

const LocationItem = styled(UserItem)`
  cursor: ${props => props.isDragging ? 'grabbing' : 'grab'};
  opacity: ${props => props.isDragging ? 0.8 : 1};
  transform: ${props => props.isDragging ? 'rotate(2deg) scale(1.05)' : 'none'};
  
  &:hover {
    transform: ${props => props.isDragging ? 'rotate(2deg) scale(1.05)' : 'translateX(4px)'};
  }
`;

const LocationIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #92400e 0%, #78350f 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(146, 64, 14, 0.3);
`;

const DepartmentIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
`;

const CanvasArea = styled.div`
  flex: 1;
  position: relative;
  background: #f5f7fa;
  
  /* Výchozí pointer kurzor pro pan */
  .react-flow__pane {
    cursor: default !important;
  }
  
  /* Grab kurzor při drag panování */
  .react-flow__pane:active {
    cursor: grab !important;
  }
  
  /* Pointer kurzor při hover nad nodem nebo edge */
  .react-flow__node,
  .react-flow__edge {
    cursor: pointer !important;
  }
  
  /* Crosshair při SHIFT (selection mode) */
  .react-flow.selection-mode .react-flow__pane {
    cursor: crosshair !important;
  }
  
  /* Styl pro výběrový obdélník (box-select) */
  .react-flow__selection {
    background: rgba(102, 126, 234, 0.08) !important;
    border: 2px dashed #667eea !important;
    border-radius: 8px !important;
  }
  
  .react-flow__nodesselection {
    background: transparent !important;
    border: none !important;
  }
`;

const DetailPanel = styled.div`
  width: 380px;
  background: white;
  border-left: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0,0,0,0.05);
`;

const DetailHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const DetailHeaderTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const DetailContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const DetailSection = styled.div`
  margin-bottom: 28px;
`;

const DetailSectionTitle = styled.h4`
  margin: 0 0 16px 0;
  color: #475569;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: #f8fafc;
  color: #2c3e50;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:read-only {
    background: #e2e8f0;
    cursor: not-allowed;
  }
`;

const ProfileSelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  background: white;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  transition: all 0.2s;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ProfileSelect = styled.select`
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 500;
  outline: none;
  appearance: none;
  padding-right: 40px;
  
  option {
    padding: 8px;
  }
`;

const ProfileSelectArrow = styled.div`
  position: absolute;
  right: 45px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #64748b;
  font-size: 0.7rem;
`;

const ProfileDeleteButton = styled.button`
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-left: 1px solid #e0e6ed;
  color: ${props => props.disabled ? '#cbd5e1' : '#dc2626'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border-radius: 0 5px 5px 0;
  min-width: 42px;
  
  &:hover:not(:disabled) {
    background: #fee2e2;
    color: #b91c1c;
  }
  
  &:active:not(:disabled) {
    background: #fecaca;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 16px;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  background: white;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
  height: 40px;
  font-weight: 500;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: #f8fafc;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #667eea;
  }
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Tag = styled.div`
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
  color: #667eea;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  border: 1px solid #667eea30;

  button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #e0e6ed;
  margin: 20px 0;
`;

const CombinationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.9rem;

  th {
    background: #f8f9fa;
    padding: 8px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
  }

  td {
    padding: 8px;
    border-bottom: 1px solid #e9ecef;
  }

  tr:hover {
    background: #f8f9fa;
  }

  button {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;

const CombinationAddRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-top: 12px;

  > div {
    flex: 1;
  }

  button {
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
    white-space: nowrap;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

// Custom Dialog Components
const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DialogBox = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const DialogIcon = styled.div`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 16px;
`;

const DialogTitle = styled.h2`
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 1.5rem;
  text-align: center;
`;

const DialogMessage = styled.div`
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
  white-space: pre-line;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const DialogButton = styled.button`
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  
  ${props => props.primary ? `
    background: #667eea;
    color: white;
    &:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: #e0e6ed;
    color: #64748b;
    &:hover {
      background: #cbd5e1;
    }
  `}
`;

const DialogStats = styled.div`
  background: #f8fafc;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  
  div {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 0.9rem;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e0e6ed;
    }
    
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    
    span {
      color: #667eea;
      font-weight: 700;
    }
  }
`;

// Custom Node Component
const CustomNode = ({ data, selected }) => {
  // Rozlišit typ node (user, location, department, template)
  const isTemplate = data.type === 'template';
  const isLocation = data.type === 'location';
  const isDepartment = data.type === 'department';
  const isUser = !isLocation && !isDepartment && !isTemplate;
  
  // Pro template nodes - jen zelený výstupní bod
  if (isTemplate) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
          : 'white',
        border: `3px solid ${selected ? '#f59e0b' : '#f59e0b'}`,
        minWidth: '200px',
        boxShadow: selected 
          ? '0 6px 16px rgba(245, 158, 11, 0.4)'
          : '0 2px 8px rgba(245, 158, 11, 0.15)',
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {/* Jen zelený source handle - šablona vysílá notifikace */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: '16px',
            height: '16px',
            background: '#10b981',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
            cursor: 'crosshair',
            right: '-10px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }}>
            🔔
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#78350f',
              fontSize: '0.85rem',
              marginBottom: '2px'
            }}>
              {data.name}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#92400e',
              fontWeight: 500
            }}>
              {data.position}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pro location/department nodes - zjednodušená vizualizace
  if (isLocation || isDepartment) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? (isLocation ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)')
          : 'white',
        border: `3px solid ${selected ? (isLocation ? '#92400e' : '#059669') : (isLocation ? '#92400e' : '#059669')}`,
        minWidth: '160px',
        boxShadow: selected 
          ? `0 6px 16px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`
          : `0 2px 8px ${isLocation ? 'rgba(146, 64, 14, 0.15)' : 'rgba(5, 150, 105, 0.15)'}`,
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        textAlign: 'center'
      }}>
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: '14px',
            height: '14px',
            background: isLocation ? '#92400e' : '#059669',
            border: '2px solid white',
            boxShadow: `0 2px 6px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
            cursor: 'crosshair'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: '14px',
            height: '14px',
            background: isLocation ? '#92400e' : '#059669',
            border: '2px solid white',
            boxShadow: `0 2px 6px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
            cursor: 'crosshair'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <FontAwesomeIcon 
            icon={isLocation ? faMapMarkerAlt : faUserTie} 
            style={{ 
              color: isLocation ? '#92400e' : '#059669',
              fontSize: '1.1rem'
            }} 
          />
          <div style={{ 
            fontWeight: 700, 
            color: '#2c3e50',
            fontSize: '0.9rem'
          }}>
            {data.name}
          </div>
        </div>
      </div>
    );
  }
  
  // User node - původní vizualizace
  return (
    <div style={{
      padding: '14px',
      borderRadius: '12px',
      background: selected ? 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)' : 'white',
      border: `3px solid ${selected ? '#3b82f6' : '#3b82f6'}`,
      minWidth: '220px',
      boxShadow: selected 
        ? '0 8px 24px rgba(59, 130, 246, 0.5), 0 0 0 2px #93c5fd' 
        : '0 4px 12px rgba(59, 130, 246, 0.15)',
      transition: 'all 0.2s',
      position: 'relative',
      transform: selected ? 'scale(1.02)' : 'scale(1)'
    }}>
      {/* Target handle - kam přijdou šipky (nahoře) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '16px',
          height: '16px',
          background: '#3b82f6',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
          cursor: 'crosshair'
        }}
      />
      
      {/* Source handle - odkud táhneme šipky (dole) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: '16px',
          height: '16px',
          background: '#10b981',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
          cursor: 'crosshair'
        }}
      />

      {/* Notification badges - pravý horní roh */}
      {data.notifications && (data.notifications.hasEmail || data.notifications.hasInApp) && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          alignItems: 'center'
        }}>
          {data.notifications.hasEmail && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(102, 126, 234, 0.4)',
              cursor: 'help'
            }} title="Email notifikace aktivní">
              <FontAwesomeIcon icon={faEnvelope} style={{ color: 'white', fontSize: '0.7rem' }} />
            </div>
          )}
          {data.notifications.hasInApp && (
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(245, 87, 108, 0.4)',
              cursor: 'help'
            }} title="In-app notifikace aktivní">
              <FontAwesomeIcon icon={faBell} style={{ color: 'white', fontSize: '0.7rem' }} />
            </div>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <UserAvatar>{data.initials}</UserAvatar>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem', marginBottom: '2px' }}>
            {data.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            {data.position}
          </div>
        </div>
      </div>
      {data.metadata && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#64748b', 
          paddingTop: '10px', 
          borderTop: '1px solid #e0e6ed',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#f5576c' }} />
            {data.metadata.location}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faUserTie} style={{ color: '#00f2fe' }} />
            {data.metadata.department}
          </div>
          {data.notifications && data.notifications.types && data.notifications.types.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginTop: '4px',
              paddingTop: '6px',
              borderTop: '1px dashed #e0e6ed'
            }}>
              <FontAwesomeIcon icon={faBell} style={{ color: '#667eea' }} />
              <span style={{ fontSize: '0.7rem', color: '#667eea', fontWeight: 600 }}>
                {data.notifications.types.length} typ{data.notifications.types.length > 1 ? 'y' : ''} notifikací
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// Main Component
const OrganizationHierarchy = () => {
  const reactFlowWrapper = useRef(null);
  
  // Search terms pro každou sekci (načíst z LS)
  const [searchUsers, setSearchUsers] = useState(() => localStorage.getItem('hierarchy_search_users') || '');
  const [searchLocations, setSearchLocations] = useState(() => localStorage.getItem('hierarchy_search_locations') || '');
  const [searchDepartments, setSearchDepartments] = useState(() => localStorage.getItem('hierarchy_search_departments') || '');
  const [searchTemplates, setSearchTemplates] = useState(() => localStorage.getItem('hierarchy_search_templates') || '');
  
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('hierarchy_expanded_sections');
    return saved ? JSON.parse(saved) : {
      users: true,
      locations: false,
      departments: false,
      notificationTemplates: false
    };
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Data from API
  const [allUsers, setAllUsers] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [allNotificationTemplates, setAllNotificationTemplates] = useState([]);
  
  // Detail panel data - rozsirene lokality a notifikace pro vybrany vztah
  const [selectedExtendedLocations, setSelectedExtendedLocations] = useState([]);
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState([]);
  const [notificationEmailEnabled, setNotificationEmailEnabled] = useState(false);
  const [notificationInAppEnabled, setNotificationInAppEnabled] = useState(true);
  
  // Detail panel data - rozsirene useky
  const [selectedExtendedDepartments, setSelectedExtendedDepartments] = useState([]);
  
  // Detail panel data - kombinace lokalita+utvar
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  
  // Profily organizacnich radu
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileDialogMode, setProfileDialogMode] = useState('save'); // 'save' or 'saveAs'
  
  // Auto-save rozsirenych lokalit, useku, kombinaci a notifikaci do edge
  React.useEffect(() => {
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === selectedEdge.id) {
            return {
              ...e,
              data: {
                ...e.data,
                extended: {
                  locations: selectedExtendedLocations,
                  departments: selectedExtendedDepartments,
                  combinations: selectedCombinations
                },
                notifications: {
                  ...(e.data?.notifications || {}),
                  types: selectedNotificationTypes,
                  email: notificationEmailEnabled,
                  inapp: notificationInAppEnabled
                }
              }
            };
          }
          return e;
        })
      );
    }
  }, [selectedExtendedLocations, selectedExtendedDepartments, selectedCombinations, selectedNotificationTypes, notificationEmailEnabled, notificationInAppEnabled, selectedEdge]);
  
  // Selection state pro levy panel (checkboxy)
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState(new Set());
  const [selectedNotificationTemplates, setSelectedNotificationTemplates] = useState(new Set());
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // UI state
  const [showHelp, setShowHelp] = useState(() => {
    const saved = localStorage.getItem('hierarchy_help_collapsed');
    return saved ? saved === 'false' : true; // Default: zobrazit
  });
  
  // Custom dialog state
  const [dialog, setDialog] = useState({
    show: false,
    type: 'confirm', // 'confirm' | 'alert' | 'success'
    icon: '❓',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Pokračovat',
    cancelText: 'Zrušit',
    stats: null
  });

  // LocalStorage keys pro persistenci
  const LS_NODES_KEY = 'hierarchy_draft_nodes';
  const LS_EDGES_KEY = 'hierarchy_draft_edges';
  const LS_TIMESTAMP_KEY = 'hierarchy_draft_timestamp';
  const LS_SEARCH_USERS = 'hierarchy_search_users';
  const LS_SEARCH_LOCATIONS = 'hierarchy_search_locations';
  const LS_SEARCH_DEPARTMENTS = 'hierarchy_search_departments';
  const LS_SEARCH_TEMPLATES = 'hierarchy_search_templates';
  const LS_EXPANDED_SECTIONS = 'hierarchy_expanded_sections';

  // State pro sledování, zda byl draft načten
  const [hasDraft, setHasDraft] = useState(false);

  // Auto-save search terms do localStorage
  useEffect(() => {
    localStorage.setItem('hierarchy_search_users', searchUsers);
  }, [searchUsers]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_locations', searchLocations);
  }, [searchLocations]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_departments', searchDepartments);
  }, [searchDepartments]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_templates', searchTemplates);
  }, [searchTemplates]);
  
  // Auto-save expanded sections do localStorage
  useEffect(() => {
    localStorage.setItem('hierarchy_expanded_sections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Auto-save do localStorage při změně nodes/edges
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      try {
        localStorage.setItem(LS_NODES_KEY, JSON.stringify(nodes));
        localStorage.setItem(LS_EDGES_KEY, JSON.stringify(edges));
        localStorage.setItem(LS_TIMESTAMP_KEY, new Date().toISOString());
      } catch (err) {
        console.warn('Failed to save draft:', err);
      }
    }
  }, [nodes, edges]);

  // Handler pro smazání vybraných nodes/edges pomocí DELETE klávesy
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return; // Nic není vybráno
    }

    // Zobrazit custom confirm dialog
    setDialog({
      show: true,
      type: 'confirm',
      icon: '🗑️',
      title: 'Smazat vybrané prvky?',
      message: `Opravdu chcete smazat ${selectedNodes.length} uzlů a ${selectedEdges.length} vztahů?`,
      confirmText: 'Smazat',
      cancelText: 'Zrušit',
      onConfirm: () => {
        // Smazat vybrané nodes
        if (selectedNodes.length > 0) {
          const nodeIdsToDelete = selectedNodes.map(n => n.id);
          setNodes(nds => nds.filter(n => !nodeIdsToDelete.includes(n.id)));
          // Smazat i edges spojené s těmito nodes
          setEdges(eds => eds.filter(e => 
            !nodeIdsToDelete.includes(e.source) && 
            !nodeIdsToDelete.includes(e.target)
          ));
        }
        
        // Smazat vybrané edges
        if (selectedEdges.length > 0) {
          const edgeIdsToDelete = selectedEdges.map(e => e.id);
          setEdges(eds => eds.filter(e => !edgeIdsToDelete.includes(e.id)));
        }
        
        setDialog({ ...dialog, show: false });
        console.log(`✅ Deleted ${selectedNodes.length} nodes and ${selectedEdges.length} edges`);
      },
      onCancel: () => {
        setDialog({ ...dialog, show: false });
      }
    });
  }, [nodes, edges, setNodes, setEdges, dialog]);

  // Keyboard listener pro DELETE klávesu
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Delete nebo Backspace (na Macu)
      if (event.key === 'Delete' || (event.key === 'Backspace' && event.metaKey)) {
        event.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected]);

  // Load data from API
  useEffect(() => {
    const loadHierarchyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. NEJDŘÍVE zkontrolovat localStorage draft
        let draftLoaded = false;
        try {
          const savedNodes = localStorage.getItem(LS_NODES_KEY);
          const savedEdges = localStorage.getItem(LS_EDGES_KEY);
          const savedTimestamp = localStorage.getItem(LS_TIMESTAMP_KEY);
          
          if (savedNodes && savedEdges && savedTimestamp) {
            const timestamp = new Date(savedTimestamp);
            const hoursSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
            
            // Načíst pouze pokud je draft mladší než 24 hodin
            if (hoursSince < 24) {
              const parsedNodes = JSON.parse(savedNodes);
              const parsedEdges = JSON.parse(savedEdges);
              
              if (parsedNodes.length > 0 || parsedEdges.length > 0) {
                draftLoaded = true;
                setHasDraft(true);
                setNodes(parsedNodes);
                setEdges(parsedEdges);
              }
            } else {
              localStorage.removeItem(LS_NODES_KEY);
              localStorage.removeItem(LS_EDGES_KEY);
              localStorage.removeItem(LS_TIMESTAMP_KEY);
            }
          }
        } catch (err) {
          console.warn('Failed to restore draft:', err);
        }

        // 2. Načíst token a user data
        const token = await loadAuthData.token();
        const userData = await loadAuthData.user();
        const username = userData?.username || localStorage.getItem('username');
        
        console.log('🔑 Auth debug:', { 
          hasToken: !!token, 
          tokenLength: token?.length,
          username,
          userData 
        });

        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

        // POST requesty pro PHP API
        const fetchData = async (endpoint) => {
          const response = await fetch(`${apiBase}/${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, username })
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${endpoint}`);
          }
          return response.json();
        };

        // 3. Paralelní načtení všech dat z API
        const [usersData, locationsData, departmentsData, profilesData, structureData, notifTypesData, templatesData] = await Promise.all([
          fetchData('hierarchy/users'),
          fetchData('hierarchy/locations'),
          fetchData('hierarchy/departments'),
          fetchData('hierarchy/profiles/list'),
          fetchData('hierarchy/structure'),
          fetchData('hierarchy/notification-types'),
          fetchData('notifications/templates/list')
        ]);

        setAllUsers(usersData.data || []);
        setAllLocations(locationsData.data || []);
        setAllDepartments(departmentsData.data || []);
        setNotificationTypes(notifTypesData.data || []);
        setAllNotificationTemplates(templatesData.data || []);
        
        // Nastavit profily a najít aktivní
        const profilesList = profilesData.data || [];
        setProfiles(profilesList);
        const activeProfile = profilesList.find(p => p.isActive) || profilesList[0];
        setCurrentProfile(activeProfile || null);
        
        console.log('📋 Profiles loaded:', profilesList.length, 'Active:', activeProfile?.name);
        console.log('🔍 Draft status:', { draftLoaded, hasStructureData: !!structureData.data });
        console.log('📥 Structure data:', structureData);
        
        // DŮLEŽITÉ: Pokud je draft, ale struktura z API má data, preferovat API data
        // Draft je jen pro dočasné změny, ne pro perzistentní uložení
        // V2 API vrací 'relations' místo 'edges'
        const shouldLoadFromApi = structureData.data && structureData.data.relations && structureData.data.relations.length > 0;
        
        if (shouldLoadFromApi) {
          console.log('✅ Loading from API V2 (overriding draft if present)');
        }

        // 4. Nastavit hierarchickou strukturu z API V2 (preferovat API před draftem)
        if (shouldLoadFromApi) {
          console.log('📥 V2 Loading hierarchy from API');
          console.log('📊 V2 API Response:', structureData);
          
          // V2 API vrací { nodes, relations } místo { nodes, edges }
          const apiNodes = structureData.data.nodes || [];
          const apiRelations = structureData.data.relations || [];
          
          console.log('📦 V2 Received from API:', apiNodes.length, 'nodes,', apiRelations.length, 'relations');

          const timestamp = Date.now();
          
          // Konvertovat API nodes na ReactFlow nodes
          const flowNodes = apiNodes.map((node, index) => {
            let nodeId, nodeData;
            
            if (node.type === 'user') {
              nodeId = `user-${node.userId}-${timestamp}-${index}`;
              nodeData = {
                userId: String(node.userId),
                name: node.name,
                position: node.position,
                initials: node.initials,
                type: 'user',
                metadata: node.metadata || {
                  location: null,
                  department: null
                }
              };
            } else if (node.type === 'location') {
              nodeId = `location-${node.locationId}-${timestamp}-${index}`;
              nodeData = {
                locationId: node.locationId,
                name: node.name,
                type: 'location'
              };
            } else if (node.type === 'department') {
              nodeId = `department-${node.departmentId}-${timestamp}-${index}`;
              nodeData = {
                departmentId: node.departmentId,
                name: node.name,
                type: 'department'
              };
            } else if (node.type === 'template') {
              nodeId = `template-${node.templateId}-${timestamp}-${index}`;
              nodeData = {
                templateId: node.templateId,
                name: node.name,
                position: 'Notifikační šablona',
                initials: '🔔',
                type: 'template',
                metadata: {
                  type: 'template',
                  template: node.name
                }
              };
            }
            
            return {
              id: nodeId,
              type: 'custom',
              position: node.position_1 || node.position_2 || { x: 100 + (index % 4) * 250, y: 50 + Math.floor(index / 4) * 200 },
              data: nodeData
            };
          });
          
          // Funkce pro určení barvy vztahu podle typu
          const getEdgeColor = (relationType) => {
            if (relationType.includes('template')) {
              return '#f59e0b'; // Oranžová pro notifikační šablony
            } else if (relationType.includes('location')) {
              return '#92400e'; // Tmavě hnědá pro lokality
            } else if (relationType.includes('department')) {
              return '#059669'; // Tmavě zelená pro útvary
            } else if (relationType === 'user-user') {
              return '#3b82f6'; // Modrá pro uživatel-uživatel
            }
            return '#667eea'; // Výchozí modrá
          };

          // Konvertovat relations na ReactFlow edges
          const flowEdges = apiRelations.map((rel, index) => {
            // Najít source a target nodes podle typu vztahu
            let sourceNode, targetNode;
            
            const relType = rel.type; // 'user-user', 'location-user', etc.
            const [sourceType, targetType] = relType.split('-');
            
            // Najít source node
            if (sourceType === 'user') {
              sourceNode = flowNodes.find(n => n.data.userId === String(rel.user_id_1));
            } else if (sourceType === 'location') {
              sourceNode = flowNodes.find(n => n.data.locationId === rel.lokalita_id);
            } else if (sourceType === 'department') {
              sourceNode = flowNodes.find(n => n.data.departmentId === rel.usek_id);
            } else if (sourceType === 'template') {
              sourceNode = flowNodes.find(n => n.data.templateId === rel.template_id);
            }
            
            // Najít target node
            if (targetType === 'user') {
              targetNode = flowNodes.find(n => n.data.userId === String(rel.user_id_2 || rel.user_id_1));
            } else if (targetType === 'location') {
              targetNode = flowNodes.find(n => n.data.locationId === rel.lokalita_id);
            } else if (targetType === 'department') {
              targetNode = flowNodes.find(n => n.data.departmentId === rel.usek_id);
            } else if (targetType === 'template') {
              targetNode = flowNodes.find(n => n.data.templateId === rel.template_id);
            }
            
            if (!sourceNode || !targetNode) {
              console.warn('⚠️ Relation node not found:', rel);
              return null;
            }
            
            // Aplikovat pozice z relations
            if (rel.position_1) {
              sourceNode.position = rel.position_1;
            }
            if (rel.position_2) {
              targetNode.position = rel.position_2;
            }
            
            const edgeColor = getEdgeColor(relType);
            
            return {
              id: `rel-${rel.id || index}`,
              source: sourceNode.id,
              target: targetNode.id,
              type: 'smoothstep',
              animated: true,
              markerEnd: { 
                type: MarkerType.ArrowClosed,
                color: edgeColor 
              },
              style: { 
                stroke: edgeColor, 
                strokeWidth: 3 
              },
              data: {
                level: rel.level,
                visibility: rel.visibility,
                notifications: rel.notifications,
                type: relType
              }
            };
          }).filter(e => e !== null);
          
          console.log('✅ V2 Created nodes:', flowNodes.length);
          console.log('✅ V2 Created edges:', flowEdges.length);
          setNodes(flowNodes);
          setEdges(flowEdges);
          console.log('✅ Initial hierarchy loaded:', flowNodes.length, 'nodes,', flowEdges.length, 'edges');
          
          // Pokud jsme nactli z API, vymazat draft
          localStorage.removeItem(LS_NODES_KEY);
          localStorage.removeItem(LS_EDGES_KEY);
          localStorage.removeItem(LS_TIMESTAMP_KEY);
          setHasDraft(false);
        } else if (draftLoaded) {
          console.log('📝 Using draft from localStorage');
        } else {
          console.log('⚠️ No data to load - empty profile');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading hierarchy:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadHierarchyData();
  }, []);

  const onConnect = useCallback((params) => {
    // Určit typ vztahu a barvu podle source a target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    let relationType = 'user-user';
    if (sourceNode && targetNode) {
      const sourceType = sourceNode.data?.type || 'user';
      const targetType = targetNode.data?.type || 'user';
      relationType = `${sourceType}-${targetType}`;
    }
    
    // Určit barvu podle typu
    let edgeColor = '#667eea'; // výchozí
    if (relationType.includes('template')) {
      edgeColor = '#ea580c'; // Tmavší oranžová pro notifikace
    } else if (relationType.includes('location')) {
      edgeColor = '#10b981'; // Zelená pro lokality
    } else if (relationType.includes('department')) {
      edgeColor = '#059669'; // Tmavě zelená pro útvary
    } else if (relationType === 'user-user') {
      edgeColor = '#3b82f6'; // Modrá pro uživatel-uživatel
    }
    
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { 
        type: MarkerType.ArrowClosed,
        color: edgeColor 
      },
      style: { 
        stroke: edgeColor, 
        strokeWidth: 3 
      },
      data: {
        type: relationType
      }
    }, eds));
  }, [nodes]);

  const onNodeClick = useCallback((event, node) => {
    // Pokud není CTRL/CMD, zobrazit detail panel (single selection)
    if (!event.ctrlKey && !event.metaKey) {
      setSelectedNode(node);
      setSelectedEdge(null);
      setShowDetailPanel(true);
    } else {
      // Multi-select - skrýt detail panel
      setShowDetailPanel(false);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowDetailPanel(true);
    
    // Najit source a target nodes pro zobrazeni jmen
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    // Nacist rozsirene lokality z edge data
    const extendedLocs = edge.data?.extended?.locations || edge.data?.permissions?.extended?.locations || [];
    setSelectedExtendedLocations(extendedLocs);
    
    // Nacist rozsirene useky z edge data
    const extendedDepts = edge.data?.extended?.departments || edge.data?.permissions?.extended?.departments || [];
    setSelectedExtendedDepartments(extendedDepts);
    
    // Nacist notifikacni nastaveni z edge data
    setNotificationEmailEnabled(edge.data?.notifications?.email || false);
    setNotificationInAppEnabled(edge.data?.notifications?.inapp !== false);
    
    // Nacist kombinace lokalita+utvar z edge data
    const combos = edge.data?.extended?.combinations || edge.data?.permissions?.extended?.combinations || [];
    setSelectedCombinations(combos);
    
    // Nacist typy notifikaci z edge data
    const notifTypes = edge.data?.notifications?.types || edge.data?.permissions?.notifications?.types || [];
    setSelectedNotificationTypes(notifTypes);
    
    // Pridat metadata k edge pro zobrazeni
    setSelectedEdge({
      ...edge,
      metadata: {
        sourceName: sourceNode?.data?.name || 'Neznamy',
        targetName: targetNode?.data?.name || 'Neznamy',
        sourceType: sourceNode?.data?.metadata?.type || 'user',
        targetType: targetNode?.data?.metadata?.type || 'user'
      }
    });
  }, [nodes]);

  // Handler pro automatické uložení layout pozic po přetažení uzlu
  const onNodeDragStop = useCallback(async (event, node) => {
    console.log('🎯 Node drag stopped:', node.id, 'Position:', node.position);
    
    // Aktualizovat pozici uzlu v state (už je hotovo přes onNodesChange)
    // Nyní jen zalogovat pro debug
    const updatedNode = nodes.find(n => n.id === node.id);
    if (updatedNode) {
      console.log('📍 Updated node position saved to local state:', {
        id: updatedNode.id,
        userId: updatedNode.data?.userId,
        position: updatedNode.position
      });
    }
  }, [nodes]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // === SELECTION HANDLERS PRO LEVÝ PANEL ===
  
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleLocationSelection = (locationId) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const toggleDepartmentSelection = (deptId) => {
    setSelectedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const deselectAllUsers = () => {
    setSelectedUsers(new Set());
  };

  const selectAllLocations = () => {
    setSelectedLocations(new Set(filteredLocations.map(l => l.id)));
  };

  const deselectAllLocations = () => {
    setSelectedLocations(new Set());
  };

  const selectAllDepartments = () => {
    setSelectedDepartments(new Set(filteredDepartments.map(d => d.id)));
  };

  const deselectAllDepartments = () => {
    setSelectedDepartments(new Set());
  };

  const toggleNotificationTemplateSelection = (templateId) => {
    setSelectedNotificationTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const selectAllNotificationTemplates = () => {
    setSelectedNotificationTemplates(new Set(filteredNotificationTemplates.map(t => t.id)));
  };

  const deselectAllNotificationTemplates = () => {
    setSelectedNotificationTemplates(new Set());
  };

  // Přidat vybrané položky na plochu
  const addSelectedToCanvas = () => {
    const newNodes = [];
    let index = nodes.length;
    const timestamp = Date.now();

    // Přidat vybrané uživatele (povolujeme duplicity)
    selectedUsers.forEach((userId, userIndex) => {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        newNodes.push({
          id: `user-${userId}-${timestamp}-${userIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            userId: userId, // Původní user ID
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        });
        index++;
      }
    });

    // Přidat vybrané lokality jako samostatné nodes
    selectedLocations.forEach((locationId, locIndex) => {
      const location = allLocations.find(l => l.id === locationId);
      if (location) {
        newNodes.push({
          id: `location-${locationId}-${timestamp}-${locIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'location',
            locationId: locationId,
            name: location.name
          }
        });
        index++;
      }
    });

    // Přidat vybrané útvary jako samostatné nodes
    selectedDepartments.forEach((deptId, deptIndex) => {
      const department = allDepartments.find(d => d.id === deptId);
      if (department) {
        newNodes.push({
          id: `department-${deptId}-${timestamp}-${deptIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'department',
            departmentId: deptId,
            name: department.name
          }
        });
        index++;
      }
    });

    // Přidat vybrané notifikační šablony jako samostatné nodes
    selectedNotificationTemplates.forEach((templateId, tplIndex) => {
      const template = allNotificationTemplates.find(t => t.id === templateId);
      if (template) {
        newNodes.push({
          id: `template-${templateId}-${timestamp}-${tplIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'template',
            templateId: templateId,
            name: template.name,
            position: 'Notifikační šablona',
            initials: '🔔',
            metadata: {
              type: 'template',
              template: template.name
            }
          }
        });
        index++;
      }
    });

    if (newNodes.length > 0) {
      setNodes(prevNodes => [...prevNodes, ...newNodes]);
      console.log(`✅ Added ${newNodes.length} nodes to canvas`);
      
      // Vymazat výběr
      setSelectedUsers(new Set());
      setSelectedLocations(new Set());
      setSelectedDepartments(new Set());
    }
  };

  // Store dragged item info for HTML5 drag & drop
  const [draggedItem, setDraggedItem] = React.useState(null);

  const onReactFlowDrop = (event) => {
    event.preventDefault();
    
    if (!draggedItem) {
      console.log('⚠️ No dragged item');
      return;
    }
    
    if (!reactFlowInstance) {
      console.log('⚠️ ReactFlow instance not ready');
      return;
    }
    
    const dragId = draggedItem;
    
    // Najdi ReactFlow wrapper (.react-flow) a získej jeho pozici
    const reactFlowElement = event.currentTarget.querySelector('.react-flow');
    if (!reactFlowElement) {
      console.error('⚠️ ReactFlow element not found');
      return;
    }
    
    const reactFlowBounds = reactFlowElement.getBoundingClientRect();
    
    // Vypočítej pozici pomocí screenToFlowPosition (ReactFlow 11.x)
    // Odečti polovinu šířky/výšky nodu, aby kurzor byl přibližně ve středu karty
    const nodeWidth = 220;  // Přibližná šířka custom node
    const nodeHeight = 80;  // Přibližná výška custom node
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - nodeWidth / 2,
      y: event.clientY - nodeHeight / 2,
    });
    
    console.log('📦 Drop:', { 
      dragId, 
      position, 
      clientX: event.clientX, 
      clientY: event.clientY,
      bounds: { left: reactFlowBounds.left, top: reactFlowBounds.top },
      viewport: reactFlowInstance.getViewport()
    });
    
    // Zpracování notifikační šablony - přidat jako node
    if (dragId.startsWith('notif-')) {
      const notifId = parseInt(dragId.replace('notif-', ''), 10);
      const template = allNotificationTemplates.find(t => t.id === notifId);
      
      if (template) {
        const nodeId = `template-${notifId}-${Date.now()}`;
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'template',
            templateId: notifId,
            name: template.name,
            position: 'Notifikační šablona',
            initials: '🔔',
            metadata: {
              type: 'template',
              template: template.name
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
        console.log(`✅ Added notification template node: ${template.name}`);
      }
      return;
    }
    
    // Zpracování uživatele
    if (!dragId.startsWith('loc-') && !dragId.startsWith('dept-')) {
      const user = allUsers.find(u => u.id === dragId);
      
      if (user) {
        // Generuj unikátní ID pro node (povoluje duplicity stejného uživatele)
        const nodeId = `user-${dragId}-${Date.now()}`;
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'user',
            userId: dragId, // Původní user ID pro propojení s DB
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
      return;
    }
    
    // Zpracovani lokality - prida samotnou lokalitu jako node
    if (dragId.startsWith('loc-')) {
      const locationId = dragId.replace('loc-', '');
      console.log('📍 LOCATION DROP - ID:', locationId);
      const location = allLocations.find(l => l.id === locationId);
      
      if (!location) {
        console.error('❌ Location not found:', locationId);
        return;
      }
      
      const nodeId = `location-${locationId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'location',
          locationId: locationId,
          name: location.name,
          position: 'Lokalita',
          initials: location.name.substring(0, 2).toUpperCase(),
          metadata: {
            type: 'location',
            location: location.name
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      console.log(`✅ Added location node: ${location.name}`);
      return;
    }
    
    // Zpracovani utvaru - prida samotny utvar jako node
    if (dragId.startsWith('dept-')) {
      const deptId = dragId.replace('dept-', '');
      console.log('🏢 DEPARTMENT DROP - ID:', deptId);
      const department = allDepartments.find(d => d.id === deptId);
      
      if (!department) {
        console.error('❌ Department not found:', deptId);
        return;
      }
      
      const nodeId = `department-${deptId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'department',
          departmentId: deptId,
          name: department.name,
          position: 'Utvar',
          initials: department.name.substring(0, 2).toUpperCase(),
          metadata: {
            type: 'department',
            department: department.name
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      console.log(`✅ Added department node: ${department.name}`);
      return;
    }
  };

  const onReactFlowDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleAutoGenerateHierarchy = () => {
    // Kontrola zda jsou vybrané nody na ploše
    const selectedNodes = nodes.filter(n => n.selected);
    
    if (selectedNodes.length === 0) {
      setDialog({
        show: true,
        type: 'alert',
        icon: '⚠️',
        title: 'Žádné položky nevybrány na ploše',
        message: 'Pro vytvoření AI hierarchie musíte nejprve vybrat nody na ploše.\n\nPoužijte:\n• Táhněte myší pro výběr oblasti (crosshair kurzor)\n• CTRL+klik pro individuální výběr\n• SHIFT+klik pro rozsah',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    // Generovat hierarchii pouze z vybraných nodů na ploše
    generateHierarchyFromSelectedNodes(selectedNodes);
  };

  // Automatické rozložení grafu pomocí dagre
  const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    const nodeWidth = 200;
    const nodeHeight = 120;
    
    dagreGraph.setGraph({ 
      rankdir: direction,
      nodesep: 80,      // Horizontální mezera mezi uzly
      ranksep: 120,     // Vertikální mezera mezi úrovněmi
      marginx: 50,
      marginy: 50
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  // Pomocná funkce pro výpočet skóre shody mezi dvěma zkratkami útvarů
  // Vrací číslo 0-100, čím vyšší tím lepší shoda
  const getDepartmentMatchScore = (code1, code2) => {
    if (!code1 || !code2) return 0;
    
    const c1 = code1.trim().toUpperCase();
    const c2 = code2.trim().toUpperCase();
    
    if (c1 === c2) return 100; // Přesná shoda
    
    // Rozdělit na části (např. "PTN BN" -> ["PTN", "BN"])
    const parts1 = c1.split(/\s+/);
    const parts2 = c2.split(/\s+/);
    
    // Počet společných částí
    let commonParts = 0;
    parts1.forEach(p1 => {
      if (parts2.includes(p1)) commonParts++;
    });
    
    if (commonParts === 0) return 0;
    
    // Skóre = (počet společných částí / větší počet částí) * 80
    const maxParts = Math.max(parts1.length, parts2.length);
    return Math.floor((commonParts / maxParts) * 80);
  };
  
  // Najde nejlepšího nadřízeného ze seznamu podle shody útvaru
  const findBestDepartmentMatch = (user, candidates) => {
    if (!candidates || candidates.length === 0) return null;
    if (!user?.departmentCode) return candidates[0]; // Fallback na prvního
    
    let bestMatch = null;
    let bestScore = 0;
    
    candidates.forEach(candidate => {
      const score = getDepartmentMatchScore(user.departmentCode, candidate.departmentCode);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    });
    
    // Vrátit pouze pokud je skóre > 0 (aspoň nějaká shoda)
    return bestScore > 0 ? bestMatch : null;
  };

  const generateHierarchyFromSelected = () => {
    console.log('🤖 AI: Generating hierarchy from SELECTED items only...');

    // Získat všechny vybrané uživatele
    let selectedUsersList = [];
    
    // Přidat přímo vybrané uživatele
    selectedUsers.forEach(userId => {
      const user = allUsers.find(u => u.id === userId);
      if (user) selectedUsersList.push(user);
    });
    
    // Přidat uživatele z vybraných lokalit
    selectedLocations.forEach(locationId => {
      const location = allLocations.find(l => l.id === locationId);
      if (location) {
        const usersInLocation = allUsers.filter(u => u.location === location.name);
        usersInLocation.forEach(user => {
          if (!selectedUsersList.find(u => u.id === user.id)) {
            selectedUsersList.push(user);
          }
        });
      }
    });
    
    // Přidat uživatele z vybraných útvarů
    selectedDepartments.forEach(deptId => {
      const department = allDepartments.find(d => d.id === deptId);
      if (department) {
        const usersInDept = allUsers.filter(u => u.department === department.name);
        usersInDept.forEach(user => {
          if (!selectedUsersList.find(u => u.id === user.id)) {
            selectedUsersList.push(user);
          }
        });
      }
    });

    if (selectedUsersList.length === 0) {
      setDialog({
        show: true,
        type: 'alert',
        icon: '⚠️',
        title: 'Žádní uživatelé',
        message: 'Ve vybraných položkách nejsou žádní uživatelé.',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    console.log(`🤖 AI: Working with ${selectedUsersList.length} selected users`);

    // Analyzovat role z vybraných uživatelů
    const director = selectedUsersList.find(u => {
      const pos = u.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    const deputies = selectedUsersList.filter(u => 
      u.position?.toLowerCase().includes('náměstek')
    );
    
    const directorHeads = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && (dept.includes('ředitel') || pos.includes('ředitel'));
    });
    
    const heads = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && !dept.includes('ředitel') && !pos.includes('ředitel');
    });
    
    const others = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      return !pos.includes('ředitel') &&
             !pos.includes('náměstek') &&
             !pos.includes('vedoucí');
    });

    // Vytvořit nodes a edges
    const newNodes = [];
    const newEdges = [];
    const timestamp = Date.now();

    // Ředitel
    if (director) {
      newNodes.push({
        id: `user-${director.id}-${timestamp}-0`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: director.id,
          name: director.name,
          position: director.position,
          initials: director.initials,
          metadata: {
            location: director.location,
            department: director.department
          }
        }
      });
    }

    // Náměstci
    deputies.forEach((deputy, i) => {
      const nodeId = `user-${deputy.id}-${timestamp}-${i + 1}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: deputy.id,
          name: deputy.name,
          position: deputy.position,
          initials: deputy.initials,
          metadata: {
            location: deputy.location,
            department: deputy.department
          }
        }
      });

      if (director) {
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Vedoucí úseku ředitele
    let nodeIndex = 1 + deputies.length;
    directorHeads.forEach((head, i) => {
      const nodeId = `user-${head.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: head.id,
          name: head.name,
          position: head.position,
          initials: head.initials,
          metadata: {
            location: head.location,
            department: head.department
          }
        }
      });

      if (director) {
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Ostatní vedoucí
    nodeIndex += directorHeads.length;
    heads.forEach((head, i) => {
      const nodeId = `user-${head.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: head.id,
          name: head.name,
          position: head.position,
          initials: head.initials,
          metadata: {
            location: head.location,
            department: head.department
          }
        }
      });

      // Připojit k náměstkovi se stejným útvarem
      const deputyWithSameDept = deputies.find(d => d.department === head.department);
      if (deputyWithSameDept) {
        const deputyNode = newNodes.find(n => n.data.userId === deputyWithSameDept.id);
        if (deputyNode) {
          newEdges.push({
            id: `e-${deputyNode.id}-${nodeId}`,
            source: deputyNode.id,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      } else if (director) {
        // Fallback na ředitele
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Ostatní zaměstnanci
    nodeIndex += heads.length;
    others.forEach((user, i) => {
      const nodeId = `user-${user.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: user.id,
          name: user.name,
          position: user.position,
          initials: user.initials,
          metadata: {
            location: user.location,
            department: user.department
          }
        }
      });

      // Připojit k vedoucímu stejného útvaru
      const headWithSameDept = heads.find(h => h.department === user.department);
      if (headWithSameDept) {
        const headNode = newNodes.find(n => n.data.userId === headWithSameDept.id);
        if (headNode) {
          newEdges.push({
            id: `e-${headNode.id}-${nodeId}`,
            source: headNode.id,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      }
    });

    // Aplikovat layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Vyčistit výběr
    setSelectedUsers(new Set());
    setSelectedLocations(new Set());
    setSelectedDepartments(new Set());

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'AI Hierarchie vytvořena!',
      message: 'Hierarchie byla automaticky vygenerovana z vybranych polozek.\nZkontrolujte strukturu a pripadne upravte.\nNezapomente ulozit!',
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí úseku ředitele': directorHeads.length,
        'Vedoucí ostatních úseků': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Celkem uzlů': layoutedNodes.length,
        'Celkem vztahů': layoutedEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  // Nová funkce pro práci s vybranými nody na ploše
  const generateHierarchyFromSelectedNodes = (selectedNodes) => {
    console.log('🤖 AI: Reorganizing hierarchy from SELECTED NODES on canvas...', selectedNodes.length);

    if (selectedNodes.length === 0) return;

    // Analyzovat role z vybraných nodů
    const director = selectedNodes.find(n => {
      const pos = n.data.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    const deputies = selectedNodes.filter(n => 
      n.data.position?.toLowerCase().includes('náměstek')
    );
    
    const heads = selectedNodes.filter(n => 
      n.data.position?.toLowerCase().includes('vedoucí')
    );
    
    const others = selectedNodes.filter(n => 
      !n.data.position?.toLowerCase().includes('ředitel') &&
      !n.data.position?.toLowerCase().includes('náměstek') &&
      !n.data.position?.toLowerCase().includes('vedoucí')
    );

    // Vytvo\u0159 nové edges podle hierarchie
    const newEdges = [];
    const timestamp = Date.now();

    // Náměstci -> Ředitel
    if (director) {
      deputies.forEach(deputy => {
        newEdges.push({
          id: `e-${director.id}-${deputy.id}-${timestamp}`,
          source: director.id,
          target: deputy.id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      });

      // Vedoucí -> Ředitel nebo Náměstek (podle útvaru)
      heads.forEach(head => {
        const deputyWithSameDept = deputies.find(d => 
          d.data.metadata?.department === head.data.metadata?.department
        );
        
        const sourceNode = deputyWithSameDept || director;
        newEdges.push({
          id: `e-${sourceNode.id}-${head.id}-${timestamp}`,
          source: sourceNode.id,
          target: head.id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      });
    }

    // Odstranit staré edges mezi vybranými nody
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => 
      !selectedNodeIds.has(e.source) || !selectedNodeIds.has(e.target)
    );

    // Přidat nové edges
    const updatedEdges = [...filteredEdges, ...newEdges];
    
    // Aplikovat layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, updatedEdges, 'TB');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'Hierarchie reorganizována!',
      message: `Vybrané nody (${selectedNodes.length}) byly reorganizovány podle rolí.\nZkontrolujte strukturu a případně upravte.`,
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Nové vztahy': newEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  const generateHierarchy = () => {

    console.log('🤖 AI: Generating hierarchy from positions...');

    // Pokud už existují vztahy (načtené z DB), použít je a jen aplikovat layout
    if (edges.length > 0) {
      console.log('✅ Using existing relationships from DB:', edges.length);
      
      // Vytvořit nodes ze všech uživatelů
      const existingNodes = allUsers.map((user) => ({
        id: user.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Bude přepočítáno dagre
        data: {
          name: user.name,
          position: user.position,
          initials: user.initials,
          metadata: {
            location: user.location,
            department: user.department
          }
        }
      }));

      // Aplikovat dagre layout na existující strukturu
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(existingNodes, edges, 'TB');
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setDialog({
        show: true,
        type: 'success',
        icon: '✅',
        title: 'Layout aplikován!',
        message: 'Pouzity existujici vztahy z databaze.\nAplikovano prehledne automaticke rozlozeni.',
        stats: {
          'Celkem uzlů': layoutedNodes.length,
          'Vztahů z DB': layoutedEdges.length
        },
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    // Pokud neexistují vztahy, vygenerovat nové ze STÁVAJÍCÍCH PŘIŘAZENÍ v DB
    console.log('🤖 No existing relationships, generating from DB assignments...');

    // 1. Seskupení podle útvarů a pozic (používáme REÁLNÁ přiřazení z 25_uzivatele)
    // Ředitel = přesně "Ředitel" (ne vedoucí, ne náměstek)
    const director = allUsers.find(u => {
      const pos = u.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    // Náměstci - seskupeni podle jejich útvarů (department/departmentCode)
    const deputies = allUsers.filter(u => 
      u.position?.toLowerCase().includes('náměstek')
    );
    
    // Vedoucí úseku ředitele - jdou PŘÍMO pod ředitele
    const directorHeads = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && (dept.includes('ředitel') || pos.includes('ředitel'));
    });
    
    // Ostatní vedoucí (ne ředitelského úseku) - BUDOU nadřízeni svému útvaru
    const heads = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && !dept.includes('ředitel') && !pos.includes('ředitel');
    });
    
    // Ostatní zaměstnanci - přiřazeni podle svého útvaru (department)
    const others = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      return !pos.includes('ředitel') &&
             !pos.includes('náměstek') &&
             !pos.includes('vedoucí');
    });

    console.log('🤖 AI: Structure from DB assignments:', { 
      director: director ? `${director.name} (${director.department}, ${director.location})` : 'None',
      deputies: deputies.map(d => ({ name: d.name, dept: d.department, code: d.departmentCode })),
      directorHeads: directorHeads.map(h => ({ name: h.name, dept: h.department })),
      heads: heads.map(h => ({ name: h.name, dept: h.department, code: h.departmentCode })),
      others: `${others.length} users`
    });

    // 2. Vytvoření nodes (pozice budou přepočítány dagre)
    const newNodes = [];
    const newEdges = [];
    let yPos = 100;
    const xSpacing = 280;
    const ySpacing = 180;

    // Ředitel nahoře (střed)
    if (director) {
      newNodes.push({
        id: director.id,
        type: 'custom',
        position: { x: 500, y: yPos },
        data: {
          name: director.name,
          position: director.position,
          initials: director.initials,
          metadata: {
            location: director.location,
            department: director.department
          }
        }
      });
      yPos += ySpacing;
    }

    // Náměstci pod ředitelem
    if (deputies.length > 0) {
      const startX = 500 - ((deputies.length - 1) * xSpacing) / 2;
      deputies.forEach((deputy, i) => {
        newNodes.push({
          id: deputy.id,
          type: 'custom',
          position: { x: startX + (i * xSpacing), y: yPos },
          data: {
            name: deputy.name,
            position: deputy.position,
            initials: deputy.initials,
            metadata: {
              location: deputy.location,
              department: deputy.department
            }
          }
        });

        // Spojit s ředitelem
        if (director) {
          newEdges.push({
            id: `e-${director.id}-${deputy.id}`,
            source: director.id,
            target: deputy.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Vedoucí úseku ředitele - PŘÍMO pod ředitele (ne přes náměstky!)
    if (directorHeads.length > 0) {
      const startX = 200;
      directorHeads.forEach((head, i) => {
        newNodes.push({
          id: head.id,
          type: 'custom',
          position: { x: startX + (i * 250), y: yPos },
          data: {
            name: head.name,
            position: head.position,
            initials: head.initials,
            metadata: {
              location: head.location,
              department: head.department
            }
          }
        });

        // Vedoucí ředitelského úseku jde PŘÍMO na ředitele
        if (director) {
          newEdges.push({
            id: `e-${director.id}-${head.id}`,
            source: director.id,
            target: head.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Ostatní vedoucí - pod náměstky (podle útvaru)
    if (heads.length > 0) {
      const startX = 200;
      heads.forEach((head, i) => {
        newNodes.push({
          id: head.id,
          type: 'custom',
          position: { x: startX + (i * 250), y: yPos },
          data: {
            name: head.name,
            position: head.position,
            initials: head.initials,
            metadata: {
              location: head.location,
              department: head.department
            }
          }
        });

        // Najít náměstka s nejlepší shodou útvaru (podle zkratky), nebo ředitele
        const sameDepDeputy = findBestDepartmentMatch(head, deputies);
        const parent = sameDepDeputy || (deputies.length > 0 ? deputies[0] : director);
        
        if (parent) {
          newEdges.push({
            id: `e-${parent.id}-${head.id}`,
            source: parent.id,
            target: head.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Ostatní zaměstnanci
    if (others.length > 0) {
      const startX = 100;
      const maxPerRow = 5;
      others.forEach((user, i) => {
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        
        newNodes.push({
          id: user.id,
          type: 'custom',
          position: { x: startX + (col * 220), y: yPos + (row * ySpacing) },
          data: {
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        });

        // Najít nadřízeného s nejlepší shodou útvaru - porovnat všechny možnosti
        const allPossibleParents = [...heads, ...directorHeads, ...deputies];
        const bestMatch = findBestDepartmentMatch(user, allPossibleParents);
        const parent = bestMatch || (deputies.length > 0 ? deputies[0] : director);
        
        // Debug: zobrazit skóre shody
        if (bestMatch) {
          const score = getDepartmentMatchScore(user.departmentCode, bestMatch.departmentCode);
          console.log(`🔗 ${user.name} (${user.departmentCode}) → ${bestMatch.name} (${bestMatch.departmentCode}) [score: ${score}]`);
        }
        
        if (parent) {
          newEdges.push({
            id: `e-${parent.id}-${user.id}`,
            source: parent.id,
            target: user.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
    }

    // Aplikovat automatické rozložení pomocí dagre
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');
    
    // Nastavit nové nodes a edges s optimálním layoutem
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    console.log('✅ AI: Generated hierarchy with auto-layout:', {
      nodes: layoutedNodes.length,
      edges: layoutedEdges.length
    });

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'Hierarchie automaticky vytvorena!',
      message: 'Zkontrolujte strukturu a případně upravte.\nNezapomeňte uložit!',
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí úseku ředitele': directorHeads.length,
        'Vedoucí ostatních úseků': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Celkem uzlů': layoutedNodes.length,
        'Celkem vztahů': layoutedEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  // ============ PROFILE MANAGEMENT ============
  
  const loadProfiles = async () => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const response = await fetch(`${apiBase}/hierarchy/profiles/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username })
      });
      
      const result = await response.json();
      if (result.success) {
        setProfiles(result.data || []);
        const activeProfile = result.data.find(p => p.isActive) || result.data[0];
        setCurrentProfile(activeProfile || null);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleDeleteProfile = async () => {
    if (!currentProfile || profiles.length <= 1) {
      return;
    }

    const relationshipsText = currentProfile.relationshipsCount > 0 
      ? `\n\n⚠️ Profil obsahuje ${currentProfile.relationshipsCount} vztahů, které budou také smazány!`
      : '';

    setDialog({
      show: true,
      type: 'confirm',
      icon: '🗑️',
      title: 'Smazat profil?',
      message: `Opravdu chcete smazat profil "${currentProfile.name}"?${relationshipsText}\n\nTato akce je nevratná!`,
      onConfirm: async () => {
        try {
          const token = await loadAuthData.token();
          const userData = await loadAuthData.user();
          const username = userData?.username || localStorage.getItem('username');
          const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

          const response = await fetch(`${apiBase}/hierarchy/profiles/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token, 
              username, 
              profile_id: currentProfile.id 
            })
          });

          const result = await response.json();
          
          if (result.success) {
            setDialog({
              show: true,
              type: 'success',
              icon: '✅',
              title: 'Profil smazán',
              message: `Profil "${currentProfile.name}" byl úspěšně smazán.`,
              onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
              confirmText: 'OK',
              cancelText: null
            });

            // Obnovit seznam profilů a vybrat první dostupný
            await loadProfiles();
            
            // Vyčistit canvas
            setNodes([]);
            setEdges([]);
          } else {
            throw new Error(result.error || 'Chyba při mazání profilu');
          }
        } catch (err) {
          console.error('Delete profile error:', err);
          setDialog({
            show: true,
            type: 'alert',
            icon: '❌',
            title: 'Chyba při mazání',
            message: err.message,
            onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
            confirmText: 'OK',
            cancelText: null
          });
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'Smazat',
      cancelText: 'Zrušit'
    });
  };
  
  const handleProfileChange = async (profileId) => {
    console.log('🔄 handleProfileChange called with profileId:', profileId);
    const profile = profiles.find(p => p.id === parseInt(profileId));
    console.log('🔍 Found profile:', profile);
    if (!profile) {
      console.log('❌ Profile not found!');
      return;
    }
    
    // Pokud ma draft, zeptat se zda chce prepisat
    if (hasDraft && (nodes.length > 0 || edges.length > 0)) {
      if (!window.confirm(`Máte neuložené změny v auto-draftu.\n\nChcete načíst profil "${profile.name}"?\n\nNeuložené změny budou ztraceny.`)) {
        return;
      }
    }
    
    setCurrentProfile(profile);
    console.log('📂 Loading profile:', profile.name, 'ID:', profileId);
    
    // Nacist strukturu pro vybrany profil
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const response = await fetch(`${apiBase}/hierarchy/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, profile_id: profileId })
      });
      
      const result = await response.json();
      console.log('📥 Profile structure response:', result);
      
      if (result.success && result.data) {
        const { nodes: apiNodes, edges: apiEdges } = result.data;
        
        if (apiNodes.length === 0 && apiEdges.length === 0) {
          setNodes([]);
          setEdges([]);
          console.log('📭 Empty profile loaded');
        } else {
          // Transformovat nody z API do React Flow formatu
          const nodeIdMap = {};
          const transformedNodes = apiNodes.map((node, index) => {
            const nodeId = `user-${node.id}-${Date.now()}-${index}`;
            nodeIdMap[node.id] = nodeId;
            
            // Použít uloženou pozici nebo default
            const position = node.layoutPosition || { 
              x: index * 250, 
              y: 0 
            };
            
            return {
              id: nodeId,
              type: 'custom',
              position: position,
              data: {
                userId: node.id,
                name: node.name,
                position: node.position,
                initials: node.initials,
                metadata: node.metadata
              }
            };
          });
          
          // Transformovat edges s pouzitim nodeIdMap
          const transformedEdges = apiEdges.map(edge => ({
            id: edge.id,
            source: nodeIdMap[edge.source] || edge.source,
            target: nodeIdMap[edge.target] || edge.target,
            type: 'default',
            animated: false,
            data: edge.permissions
          }));
          
          setNodes(transformedNodes);
          setEdges(transformedEdges);
          
          console.log('✅ Profile loaded:', transformedNodes.length, 'nodes,', transformedEdges.length, 'edges');
        }
        
        // Vymazat draft pri nacitani profilu
        localStorage.removeItem(LS_NODES_KEY);
        localStorage.removeItem(LS_EDGES_KEY);
        localStorage.removeItem(LS_TIMESTAMP_KEY);
        setHasDraft(false);
      }
    } catch (err) {
      console.error('Failed to load profile structure:', err);
    }
  };
  
  const handleSaveAs = () => {
    setProfileDialogMode('saveAs');
    setShowProfileDialog(true);
  };
  
  const handleProfileSaveConfirm = async (profileName, profileDescription) => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      // Nejdrive vytvorit profil
      const createResponse = await fetch(`${apiBase}/hierarchy/profiles/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          username,
          name: profileName,
          description: profileDescription,
          set_active: false
        })
      });
      
      const createResult = await createResponse.json();
      
      if (createResult.code === 'PROFILE_EXISTS') {
        // Profil existuje - zobrazit confirm dialog
        return { exists: true, profileName };
      }
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Chyba pri vytvareni profilu');
      }
      
      const newProfileId = createResult.profile_id;
      
      // Ulozit hierarchii do noveho profilu
      await handleSave(newProfileId);
      
      // Obnovit seznam profilu
      await loadProfiles();
      
      setShowProfileDialog(false);
      
      return { success: true };
      
    } catch (err) {
      console.error('Profile save error:', err);
      return { error: err.message };
    }
  };

  const handleSave = async (targetProfileId = null) => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const profileId = targetProfileId || currentProfile?.id || 1;
      
      console.log('📊 V2 SAVE START - Current state:', {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodes: nodes.map(n => ({id: n.id, userId: n.data?.userId, locationId: n.data?.locationId, type: n.data?.type || n.type})),
        edges: edges.map(e => ({id: e.id, source: e.source, target: e.target}))
      });
      
      // === NOVÝ SYSTÉM: Převést edges na vztahy (relations) ===
      const relations = [];
      
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) {
          console.warn('⚠️ Skipping edge - node not found:', edge.id);
          continue;
        }
        
        // Určit typ nodes z data (nikdy z ReactFlow node.type který je 'custom')
        const getNodeType = (node) => {
          if (node.data?.type) return node.data.type;
          if (node.data?.userId) return 'user';
          if (node.data?.locationId) return 'location';
          if (node.data?.departmentId) return 'department';
          if (node.data?.templateId) return 'template';
          return 'user'; // default fallback
        };
        
        const sourceType = getNodeType(sourceNode);
        const targetType = getNodeType(targetNode);
        
        // Vytvořit vztah podle typu
        const relation = {
          type: `${sourceType}-${targetType}`, // 'user-user', 'location-user', etc.
          position_1: sourceNode.position,
          position_2: targetNode.position,
          level: edge.data?.level || 1,
          visibility: edge.data?.visibility || {
            objednavky: false,
            faktury: false,
            smlouvy: false,
            pokladna: false,
            uzivatele: false,
            lp: false
          },
          notifications: edge.data?.notifications || {
            email: false,
            inapp: false,
            types: []
          }
        };
        
        // Přiřadit IDs podle typu
        if (sourceType === 'user') {
          relation.user_id_1 = parseInt(sourceNode.data.userId);
        } else if (sourceType === 'location') {
          relation.lokalita_id = parseInt(sourceNode.data.locationId);
        } else if (sourceType === 'department') {
          relation.usek_id = parseInt(sourceNode.data.departmentId);
        } else if (sourceType === 'template') {
          relation.template_id = parseInt(sourceNode.data.templateId);
        }
        
        if (targetType === 'user') {
          relation.user_id_2 = parseInt(targetNode.data.userId);
        } else if (targetType === 'location') {
          relation.lokalita_id = parseInt(targetNode.data.locationId);
        } else if (targetType === 'department') {
          relation.usek_id = parseInt(targetNode.data.departmentId);
        } else if (targetType === 'template') {
          relation.template_id = parseInt(targetNode.data.templateId);
        }
        
        console.log('✅ Relation:', relation);
        relations.push(relation);
      }
      
      const payload = {
        token,
        username,
        profile_id: profileId,
        relations: relations
      };
      
      console.log('📊 V2 SAVE START - Current state:', {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodes: nodes.map(n => ({id: n.id, userId: n.data?.userId, type: n.data?.type})),
        edges: edges.map(e => ({id: e.id, source: e.source, target: e.target}))
      });
      
      console.log('💾 V2 SAVE - Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${apiBase}/hierarchy/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 SAVE Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SAVE Error response:', errorText);
        throw new Error('Chyba pri ukladani');
      }

      const result = await response.json();
      console.log('✅ SAVE Result:', result);
      if (result.success) {
        localStorage.removeItem(LS_NODES_KEY);
        localStorage.removeItem(LS_EDGES_KEY);
        localStorage.removeItem(LS_TIMESTAMP_KEY);
        setHasDraft(false);
        
        setDialog({
          show: true,
          type: 'success',
          icon: '✅',
          title: 'Hierarchie uspesne ulozena!',
          message: 'Data byla ulozena do databaze.\nDraft byl automaticky vymazan z localStorage.',
          stats: {
            'Ulozenych uzlu': nodes.length,
            'Ulozenych vztahu': edges.length
          },
          onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
          confirmText: 'OK',
          cancelText: null
        });
      } else {
        console.error('❌ SAVE Failed:', result.error, result.details);
        throw new Error(result.error || 'Neznama chyba');
      }
    } catch (err) {
      console.error('💥 SAVE Exception:', err);
      setDialog({
        show: true,
        type: 'alert',
        icon: '❌',
        title: 'Chyba pri ukladani',
        message: err.message,
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
    }
  };

  const handleDeleteNode = async () => {
    if (selectedNode) {
      // Najít všechny hrany spojené s tímto uzlem
      const relatedEdges = edges.filter(e => 
        e.source === selectedNode.id || e.target === selectedNode.id
      );

      // Smazat vztahy z DB pomocí hierarchy/remove
      try {
        const token = await loadAuthData.token();
        const userData = await loadAuthData.user();
        const username = userData?.username || localStorage.getItem('username');
        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
        
        for (const edge of relatedEdges) {
          await fetch(`${apiBase}/hierarchy/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token,
              username,
              nadrizeny_id: edge.source,
              podrizeny_id: edge.target
            })
          });
        }
      } catch (err) {
        console.error('Delete error:', err);
        setDialog({
          show: true,
          type: 'alert',
          icon: '⚠️',
          title: 'Chyba při mazání',
          message: err.message,
          onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
          confirmText: 'OK',
          cancelText: null
        });
      }

      // Odstranit z UI
      setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setShowDetailPanel(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.position.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.location.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredLocations = allLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchLocations.toLowerCase()) ||
    loc.code.toLowerCase().includes(searchLocations.toLowerCase())
  );

  const filteredDepartments = allDepartments.filter(dept =>
    dept.name.toLowerCase().includes(searchDepartments.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchDepartments.toLowerCase())
  );

  const filteredNotificationTemplates = allNotificationTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTemplates.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTemplates.toLowerCase()))
  );

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Systém workflow a notifikací
          </Title>
        </Header>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#64748b',
          fontSize: '1.1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div>Načítání hierarchie...</div>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Systém workflow a notifikací
          </Title>
        </Header>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#ef4444',
          fontSize: '1.1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <div>Chyba při načítání: {error}</div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FontAwesomeIcon icon={faSitemap} />
          Systém workflow a notifikací
        </Title>
        <HeaderActions>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
              Profil:
            </label>
            <ProfileSelectWrapper>
              <ProfileSelect 
                value={currentProfile?.id || ''} 
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} {profile.isActive ? '⭐' : ''}
                    {profile.relationshipsCount > 0 ? ` (${profile.relationshipsCount})` : ''}
                  </option>
                ))}
              </ProfileSelect>
              <ProfileSelectArrow>▼</ProfileSelectArrow>
              <ProfileDeleteButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProfile();
                }}
                disabled={!currentProfile || profiles.length <= 1}
                title={profiles.length <= 1 ? 'Nelze smazat poslední profil' : 'Smazat aktuální profil'}
              >
                🗑️
              </ProfileDeleteButton>
            </ProfileSelectWrapper>
          </div>
          {(nodes.length > 0 || edges.length > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: hasDraft ? '#dbeafe' : '#fef3c7',
              border: `1px solid ${hasDraft ? '#60a5fa' : '#fbbf24'}`,
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: hasDraft ? '#1e3a8a' : '#92400e'
            }}>
              <span style={{ fontSize: '1.2rem' }}>{hasDraft ? '💾' : '⚠️'}</span>
              <span>
                <strong>{nodes.length}</strong> uzlů, <strong>{edges.length}</strong> vztahů
                <br/>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {hasDraft ? 'Nacteno z auto-draftu' : 'Neulozeno (auto-draft)'}
                </span>
              </span>
            </div>
          )}
          <Button onClick={handleAutoGenerateHierarchy} disabled={loading || allUsers.length === 0}>
            <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>🤖</span>
            AI Asistent
          </Button>
          <Button 
            onClick={() => {
              if (nodes.length > 0) {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'TB');
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                console.log('📐 Manual layout applied');
              }
            }}
            disabled={nodes.length === 0}
            title="Automaticky prerovnat existujici strukturu"
          >
            <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>📐</span>
            Přerovnat
          </Button>
          <Button>
            <FontAwesomeIcon icon={faEye} />
            Náhled
          </Button>
          <Button primary onClick={() => handleSave()} disabled={loading || (nodes.length === 0 && edges.length === 0)}>
            <FontAwesomeIcon icon={faSave} />
            Uložit
          </Button>
          <Button onClick={handleSaveAs} disabled={loading || (nodes.length === 0 && edges.length === 0)}>
            <FontAwesomeIcon icon={faSave} />
            Uložit jako...
          </Button>
        </HeaderActions>
      </Header>

      {/* Legenda barev vztahů */}
      <div style={{
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
        borderBottom: '2px solid #e0e6ed',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontSize: '0.8rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 700, color: '#475569' }}>Legenda vztahů:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></div>
          <span style={{ color: '#1e40af' }}>Uživatel → Uživatel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#10b981', borderRadius: '2px' }}></div>
          <span style={{ color: '#047857' }}>Lokalita</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#059669', borderRadius: '2px' }}></div>
          <span style={{ color: '#065f46' }}>Útvar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#ea580c', borderRadius: '2px' }}></div>
          <span style={{ color: '#c2410c' }}>Notifikace</span>
        </div>
      </div>

      <MainContent>
        <Sidebar>
            <SidebarHeader>
              <SidebarTitle>
                <FontAwesomeIcon icon={faLayerGroup} />
                Přehled položek workflow
              </SidebarTitle>
            </SidebarHeader>

            {/* Globální search box - vyhledává ve všech sekcích najednou */}
            <SearchBox>
              <SearchIcon>
                <FontAwesomeIcon icon={faSearch} />
              </SearchIcon>
              <SearchInput
                placeholder="Hledat ve všech sekcích..."
                value={searchUsers}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchUsers(value);
                  setSearchLocations(value);
                  setSearchDepartments(value);
                  setSearchTemplates(value);
                }}
              />
              {searchUsers && (
                <SearchClearButton
                  onClick={() => {
                    setSearchUsers('');
                    setSearchLocations('');
                    setSearchDepartments('');
                    setSearchTemplates('');
                  }}
                  title="Vymazat vyhledávání ve všech sekcích"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </SearchClearButton>
              )}
            </SearchBox>

            <SidebarContent>
              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.users}
                  onClick={() => toggleSection('users')}
                >
                  <FontAwesomeIcon icon={expandedSections.users ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faUsers} />
                  UŽIVATELÉ ({filteredUsers.length})
                  {selectedUsers.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#667eea', fontWeight: 'bold' }}>
                      {selectedUsers.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.users}>
                  {/* Search box pro uživatele */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat uživatele..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchUsers && (
                        <SearchClearButton
                          onClick={() => setSearchUsers('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedUsers.size === filteredUsers.length) {
                          deselectAllUsers();
                        } else {
                          selectAllUsers();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedUsers.size === filteredUsers.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredUsers.map((user) => (
                      <UserItem
                        key={user.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', user.id);
                          setDraggedItem(user.id);
                          console.log('👉 Drag start:', user.id, user.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          console.log('🚩 Drag end');
                        }}
                        style={{
                          background: selectedUsers.has(user.id) ? '#ede9fe' : 'white',
                          borderColor: selectedUsers.has(user.id) ? '#8b5cf6' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.has(user.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleUserSelection(user.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#8b5cf6',
                                    flexShrink: 0
                                  }}
                                />
                                <UserAvatar>{user.initials}</UserAvatar>
                                <UserInfo>
                                  <UserName>{user.name}</UserName>
                                  <UserMeta>
                                    {user.position} • {user.location}
                                  </UserMeta>
                        </UserInfo>
                      </UserItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.locations}
                  onClick={() => toggleSection('locations')}
                >
                  <FontAwesomeIcon icon={expandedSections.locations ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  LOKALITY ({filteredLocations.length})
                  {selectedLocations.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f5576c', fontWeight: 'bold' }}>
                      {selectedLocations.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.locations}>
                  {/* Search box pro lokality */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat lokalitu..."
                        value={searchLocations}
                        onChange={(e) => setSearchLocations(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchLocations && (
                        <SearchClearButton
                          onClick={() => setSearchLocations('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedLocations.size === filteredLocations.length) {
                          deselectAllLocations();
                        } else {
                          selectAllLocations();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedLocations.size === filteredLocations.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredLocations.map((loc) => (
                      <LocationItem
                        key={loc.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `loc-${loc.id}`);
                          setDraggedItem(`loc-${loc.id}`);
                          console.log('📍 Drag start location:', loc.id, loc.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          console.log('🏁 Drag end');
                        }}
                        style={{
                          background: selectedLocations.has(loc.id) ? '#fef3c7' : 'white',
                          borderColor: selectedLocations.has(loc.id) ? '#fbbf24' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedLocations.has(loc.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleLocationSelection(loc.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#f59e0b',
                                    flexShrink: 0
                                  }}
                                />
                                <LocationIcon>
                                  <FontAwesomeIcon icon={faBuilding} />
                                </LocationIcon>
                        <UserInfo>
                          <UserName>{loc.name}</UserName>
                          <UserMeta>{loc.userCount} uživatelů • {loc.code}</UserMeta>
                        </UserInfo>
                      </LocationItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.departments}
                  onClick={() => toggleSection('departments')}
                >
                  <FontAwesomeIcon icon={expandedSections.departments ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faUserTie} />
                  ÚSEKY ({filteredDepartments.length})
                  {selectedDepartments.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#00f2fe', fontWeight: 'bold' }}>
                      {selectedDepartments.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.departments}>
                  {/* Search box pro útvary */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat útvar..."
                        value={searchDepartments}
                        onChange={(e) => setSearchDepartments(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchDepartments && (
                        <SearchClearButton
                          onClick={() => setSearchDepartments('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDepartments.size === filteredDepartments.length) {
                          deselectAllDepartments();
                        } else {
                          selectAllDepartments();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedDepartments.size === filteredDepartments.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredDepartments.map((dept) => (
                      <LocationItem
                        key={dept.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `dept-${dept.id}`);
                          setDraggedItem(`dept-${dept.id}`);
                          console.log('🏢 Drag start department:', dept.id, dept.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          console.log('🏁 Drag end');
                        }}
                        style={{
                          background: selectedDepartments.has(dept.id) ? '#dbeafe' : 'white',
                          borderColor: selectedDepartments.has(dept.id) ? '#60a5fa' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedDepartments.has(dept.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleDepartmentSelection(dept.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#3b82f6',
                                    flexShrink: 0
                                  }}
                                />
                                <DepartmentIcon>
                                  <FontAwesomeIcon icon={faUserTie} />
                                </DepartmentIcon>
                        <UserInfo>
                          <UserName>{dept.name}</UserName>
                          <UserMeta>{dept.userCount} uživatelů • {dept.code}</UserMeta>
                        </UserInfo>
                      </LocationItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              {/* NOTIFIKAČNÍ ŠABLONY - Nová sekce */}
              <CollapsibleSection>
                <SectionHeader
                  expanded={expandedSections.notificationTemplates}
                  onClick={() => toggleSection('notificationTemplates')}
                >
                  <FontAwesomeIcon icon={expandedSections.notificationTemplates ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faBell} />
                  NOTIFIKAČNÍ ŠABLONY ({filteredNotificationTemplates.length})
                  {selectedNotificationTemplates.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                      {selectedNotificationTemplates.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.notificationTemplates}>
                  {/* Search box pro notifikační šablony */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat šablonu..."
                        value={searchTemplates}
                        onChange={(e) => setSearchTemplates(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchTemplates && (
                        <SearchClearButton
                          onClick={() => setSearchTemplates('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedNotificationTemplates.size === filteredNotificationTemplates.length) {
                          deselectAllNotificationTemplates();
                        } else {
                          selectAllNotificationTemplates();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedNotificationTemplates.size === filteredNotificationTemplates.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredNotificationTemplates.map((template) => (
                      <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `notif-${template.id}`);
                          setDraggedItem(`notif-${template.id}`);
                          console.log('🔔 Drag start notification template:', template.id, template.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          console.log('🏁 Drag end');
                        }}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #e0e6ed',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'grab',
                          background: selectedNotificationTemplates.has(template.id) ? '#fef3c7' : 'white',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => toggleNotificationTemplateSelection(template.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotificationTemplates.has(template.id)}
                          onChange={() => toggleNotificationTemplateSelection(template.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#f59e0b',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        />
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                        }}>
                          <FontAwesomeIcon icon={faBell} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#2c3e50', 
                            fontSize: '0.9rem',
                            marginBottom: '4px'
                          }}>
                            {template.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <code style={{ 
                              background: '#f1f5f9', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              {template.type}
                            </code>
                            {template.email?.sendByDefault && (
                              <span style={{ color: '#3b82f6' }}>
                                <FontAwesomeIcon icon={faEnvelope} /> Email
                              </span>
                            )}
                            <span style={{ 
                              color: template.priorityDefault === 'urgent' ? '#dc2626' : 
                                     template.priorityDefault === 'high' ? '#f59e0b' : '#64748b',
                              fontWeight: '600'
                            }}>
                              {template.priorityDefault}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>
            </SidebarContent>

            {/* Akční tlačítka - Přidat vybrané (nad fixní patičkou) */}
            {(selectedUsers.size > 0 || selectedLocations.size > 0 || selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && (
              <div style={{
                position: 'absolute',
                bottom: '66px',
                left: 0,
                right: 0,
                padding: '16px',
                borderTop: '2px solid #e0e6ed',
                background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                zIndex: 9
              }}>
                <button
                  onClick={addSelectedToCanvas}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  <span>
                    Přidat vybrané ({selectedUsers.size + selectedLocations.size + selectedDepartments.size + selectedNotificationTemplates.size})
                  </span>
                </button>
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  {selectedUsers.size > 0 && `${selectedUsers.size} uživatelů`}
                  {selectedUsers.size > 0 && (selectedLocations.size > 0 || selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && ' • '}
                  {selectedLocations.size > 0 && `${selectedLocations.size} lokalit`}
                  {selectedLocations.size > 0 && (selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && ' • '}
                  {selectedDepartments.size > 0 && `${selectedDepartments.size} útvarů`}
                  {selectedDepartments.size > 0 && selectedNotificationTemplates.size > 0 && ' • '}
                  {selectedNotificationTemplates.size > 0 && `${selectedNotificationTemplates.size} šablon`}
                </div>
              </div>
            )}

            {/* Fixní patička - Reset plochy (vždy viditelná) */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'white',
              borderTop: '2px solid #e0e6ed',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Resetovat plochu',
                    message: 'Opravdu chcete smazat celou plochu a začít znovu od začátku? Tato akce je nevratná.',
                    onConfirm: () => {
                      setNodes([]);
                      setEdges([]);
                      localStorage.removeItem('hierarchy_draft_nodes');
                      localStorage.removeItem('hierarchy_draft_edges');
                      localStorage.removeItem('hierarchy_draft_timestamp');
                      setHasDraft(false);
                      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
                    }
                  });
                }}
                disabled={nodes.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: nodes.length === 0 ? '#f1f5f9' : 'white',
                  color: nodes.length === 0 ? '#94a3b8' : '#dc2626',
                  border: `2px solid ${nodes.length === 0 ? '#e2e8f0' : '#fecaca'}`,
                  borderRadius: '8px',
                  cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (nodes.length > 0) {
                    e.target.style.background = '#fef2f2';
                    e.target.style.borderColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nodes.length > 0) {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#fecaca';
                  }
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
                <span>Resetovat plochu</span>
              </button>
            </div>
          </Sidebar>

          <CanvasArea
            onDrop={onReactFlowDrop}
            onDragOver={onReactFlowDragOver}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodeDragStop={onNodeDragStop}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              selectionOnDrag={true}
              panOnDrag={[1, 2]}
              panOnScroll={true}
              zoomOnScroll={true}
              zoomOnDoubleClick={false}
              selectionMode="partial"
              selectionKeyCode="Shift"
              multiSelectionKeyCode="Control"
              selectNodesOnDrag={false}
              onSelectionChange={(params) => {
                const selectedNodesCount = params.nodes.length;
                const selectedEdgesCount = params.edges.length;
                const totalSelected = selectedNodesCount + selectedEdgesCount;
                
                // Zobrazit detail panel jen když je vybrán právě 1 prvek
                if (totalSelected === 1) {
                  if (selectedNodesCount === 1) {
                    setSelectedNode(params.nodes[0]);
                    setSelectedEdge(null);
                    setShowDetailPanel(true);
                  } else if (selectedEdgesCount === 1) {
                    setSelectedEdge(params.edges[0]);
                    setSelectedNode(null);
                    setShowDetailPanel(true);
                  }
                } else if (totalSelected > 1) {
                  // Multi-select - skrýt panel
                  setShowDetailPanel(false);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                } else {
                  // Nic není vybráno
                  setShowDetailPanel(false);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }
              }}
            >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls />
                    <MiniMap 
                      nodeColor={(node) => {
                        if (node.data?.type === 'template') return '#f59e0b'; // Oranžová pro šablony
                        if (node.data?.type === 'location') return '#92400e'; // Tmavě hnědá pro lokality
                        if (node.data?.type === 'department') return '#059669'; // Tmavě zelená pro útvary
                        return '#3b82f6'; // Modrá pro uživatele
                      }}
                      maskColor="rgba(245, 247, 250, 0.8)"
                      pannable={true}
                      zoomable={true}
                      style={{
                        background: 'white',
                        border: '1px solid #e0e6ed',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    />
                    {showHelp ? (
                      <Panel position="top-left" style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e0e6ed',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '16px',
                        width: '360px',
                        maxHeight: 'calc(100vh - 120px)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #e0e6ed'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.4rem' }}>💡</span>
                            <strong style={{ color: '#2c3e50', fontSize: '0.95rem' }}>Nápověda</strong>
                          </div>
                          <button
                            onClick={() => {
                              setShowHelp(false);
                              localStorage.setItem('hierarchy_help_collapsed', 'true');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.3rem',
                              color: '#94a3b8',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#64748b';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#94a3b8';
                            }}
                            title="Skrýt nápovědu"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          color: '#64748b',
                          fontSize: '0.82rem',
                          lineHeight: '1.5',
                          paddingRight: '8px'
                        }}>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              1. Ovládání plátna:
                            </strong>
                            • <strong>Posun:</strong> Táhněte myší (bez klávesy)<br/>
                            • <strong>SHIFT + tažení:</strong> Výběr více nodů najednou<br/>
                            • <strong>CTRL + klik:</strong> Přidat/odebrat node do výběru
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              2. Přidejte uživatele:
                            </strong>
                            • Přetáhněte z levého panelu<br/>
                            • Nebo použijte 🤖 AI Struktura
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              3. Vytvořte vztah (šipku):
                            </strong>
                            • Najděte 🟢 zelený kroužek DOLE u nadřízeného<br/>
                            • Držte a táhněte myší<br/>
                            • Pusťte na 🔵 modrý kroužek NAHOŘE u podřízeného
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              4. Přerovnání:
                            </strong>
                            • Tlacitko 📐 Prerovnat = automaticky layout<br/>
                            • Nebo přetahujte uzly ručně
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              5. Detail vztahu:
                            </strong>
                            • Klikněte na šipku → otevře se pravý panel<br/>
                            • Nastavte práva a lokality
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#f5576c', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              6. Ulozeni:
                            </strong>
                            • Tlačítko "Uložit do DB" vpravo nahoře
                          </div>
                          <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              💾 Auto-save:
                            </strong>
                            <span style={{ fontSize: '0.8rem' }}>
                              Pozice uzlu se ukladaji automaticky do localStorage a obnovi se po refreshi. Draft se vymaze po ulozeni do DB.
                            </span>
                          </div>
                        </div>
                      </Panel>
                    ) : (
                      <Panel position="top-left" style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e0e6ed',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        width: '52px',
                        height: '52px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setShowHelp(true);
                        localStorage.setItem('hierarchy_help_collapsed', 'false');
                      }}>
                        <span 
                          style={{ fontSize: '1.7rem', transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Zobrazit nápovědu"
                        >
                          💡
                        </span>
                      </Panel>
                    )}
            </ReactFlow>
          </CanvasArea>

        {showDetailPanel && (selectedNode || selectedEdge) && (
          <DetailPanel>
            <DetailHeader>
              <DetailHeaderTitle>
                <FontAwesomeIcon icon={faEdit} />
                {selectedNode ? 'Detail uzlu' : 'Detail vztahu'}
              </DetailHeaderTitle>
              <CloseButton onClick={() => {
                setShowDetailPanel(false);
                setSelectedNode(null);
                setSelectedEdge(null);
                setNodes((nds) =>
                  nds.map((n) => ({
                    ...n,
                    data: { ...n.data, isSelected: false }
                  }))
                );
              }}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </DetailHeader>

            <DetailContent>
              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faUserTie} />
                  Základní informace
                </DetailSectionTitle>
                {selectedNode && (
                  <>
                    <FormGroup>
                      <Label>Uživatel</Label>
                      <Input value={selectedNode.data.name} readOnly />
                    </FormGroup>
                    <FormGroup>
                      <Label>Pozice</Label>
                      <Input value={selectedNode.data.position} readOnly />
                    </FormGroup>
                    <FormGroup style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e6ed' }}>
                      <Label style={{ color: '#10b981' }}>
                        📍 Výchozí lokalita (z DB)
                      </Label>
                      <Input 
                        value={selectedNode.data.metadata?.location || 'Neuvedeno'} 
                        readOnly 
                        style={{ background: '#f0fdf4', fontWeight: '500', border: '1px solid #86efac' }}
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label style={{ color: '#10b981' }}>
                        🏢 Výchozí útvar (z DB)
                      </Label>
                      <Input 
                        value={selectedNode.data.metadata?.department || 'Neuvedeno'} 
                        readOnly 
                        style={{ background: '#f0fdf4', fontWeight: '500', border: '1px solid #86efac' }}
                      />
                    </FormGroup>
                  </>
                )}
                {selectedEdge && (
                  <>
                    <FormGroup>
                      <Label>Nadřízený</Label>
                      <Input value={selectedEdge.metadata?.sourceName || 'N/A'} readOnly />
                    </FormGroup>
                    <FormGroup>
                      <Label>Podřízený</Label>
                      <Input value={selectedEdge.metadata?.targetName || 'N/A'} readOnly />
                    </FormGroup>
                  </>
                )}
                <FormGroup>
                  <Label>Typ vztahu</Label>
                  <Select>
                    <option value="prime">Přímý nadřízený</option>
                    <option value="zastupovani">Zastupování</option>
                    <option value="delegovani">Delegování</option>
                    <option value="rozsirene">Rozšířené oprávnění</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Úroveň oprávnění</Label>
                  <Select>
                    <option value="1">Základní - pouze zobrazení</option>
                    <option value="2">Rozšířené - editace</option>
                    <option value="3">Plné - schvalování</option>
                  </Select>
                </FormGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faEye} />
                  Viditelnost modulů
                </DetailSectionTitle>
                <CheckboxGroup>
                  <CheckboxLabel>
                    <input type="checkbox" defaultChecked />
                    Objednávky
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" defaultChecked />
                    Faktury
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" />
                    Smlouvy
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" />
                    Pokladna
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" />
                    Uživatelé
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" />
                    Likvidační protokoly
                  </CheckboxLabel>
                </CheckboxGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Rozšířené lokality
                </DetailSectionTitle>
                <TagList>
                  {selectedExtendedLocations.map((locationId) => {
                    const location = allLocations.find(l => l.id === locationId);
                    return location ? (
                      <Tag key={locationId}>
                        {location.name}
                        <button onClick={() => {
                          setSelectedExtendedLocations(prev => prev.filter(id => id !== locationId));
                        }}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </Tag>
                    ) : null;
                  })}
                </TagList>
                <FormGroup style={{ marginTop: '12px' }}>
                  <Select onChange={(e) => {
                    const locationId = e.target.value;
                    if (locationId && !selectedExtendedLocations.includes(locationId)) {
                      setSelectedExtendedLocations(prev => [...prev, locationId]);
                    }
                    e.target.value = '';
                  }}>
                    <option value="">-- Vyberte lokalitu --</option>
                    {allLocations
                      .filter(loc => !selectedExtendedLocations.includes(loc.id))
                      .map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.code ? `(${loc.code})` : ''}
                        </option>
                      ))
                    }
                  </Select>
                </FormGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faBuilding} />
                  Rozsirene utvary
                </DetailSectionTitle>
                <TagList>
                  {selectedExtendedDepartments.map((deptId) => {
                    const dept = allDepartments.find(d => d.id === deptId);
                    return dept ? (
                      <Tag key={deptId}>
                        {dept.name}
                        <button onClick={() => {
                          setSelectedExtendedDepartments(prev => prev.filter(id => id !== deptId));
                        }}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </Tag>
                    ) : null;
                  })}
                </TagList>
                <FormGroup style={{ marginTop: '12px' }}>
                  <Select onChange={(e) => {
                    const deptId = e.target.value;
                    if (deptId && !selectedExtendedDepartments.includes(deptId)) {
                      setSelectedExtendedDepartments(prev => [...prev, deptId]);
                    }
                    e.target.value = '';
                  }}>
                    <option value="">-- Vyberte utvar --</option>
                    {allDepartments
                      .filter(dept => !selectedExtendedDepartments.includes(dept.id))
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))
                    }
                  </Select>
                </FormGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faLayerGroup} />
                  Kombinace lokalita + utvar
                </DetailSectionTitle>
                <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '12px' }}>
                  Specificke kombinace lokalita+utvar (AND logika). Napr. "jen IT z Berouna".
                </p>
                {selectedCombinations.length > 0 ? (
                  <CombinationTable>
                    <thead>
                      <tr>
                        <th>Lokalita</th>
                        <th>Utvar</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCombinations.map((combo, index) => {
                        const location = allLocations.find(l => l.id === combo.locationId);
                        const department = allDepartments.find(d => d.id === combo.departmentId);
                        return (
                          <tr key={index}>
                            <td>{location?.name || 'N/A'}</td>
                            <td>{department?.name || 'N/A'}</td>
                            <td>
                              <button onClick={() => {
                                setSelectedCombinations(prev => prev.filter((_, i) => i !== index));
                              }}>
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </CombinationTable>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#adb5bd', fontStyle: 'italic', marginTop: '8px' }}>
                    Zatim zadne kombinace
                  </p>
                )}
                <CombinationAddRow>
                  <FormGroup style={{ marginBottom: 0 }}>
                    <Label>Lokalita</Label>
                    <Select id="combo-location-select">
                      <option value="">-- Vyberte lokalitu --</option>
                      {allLocations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.code ? `(${loc.code})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup style={{ marginBottom: 0 }}>
                    <Label>Utvar</Label>
                    <Select id="combo-department-select">
                      <option value="">-- Vyberte utvar --</option>
                      {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <button onClick={() => {
                    const locSelect = document.getElementById('combo-location-select');
                    const deptSelect = document.getElementById('combo-department-select');
                    const locationId = locSelect.value;
                    const departmentId = deptSelect.value;
                    
                    if (locationId && departmentId) {
                      // Check if combination already exists
                      const exists = selectedCombinations.some(
                        c => c.locationId === locationId && c.departmentId === departmentId
                      );
                      
                      if (!exists) {
                        setSelectedCombinations(prev => [...prev, { locationId, departmentId }]);
                        locSelect.value = '';
                        deptSelect.value = '';
                      }
                    }
                  }}>
                    Pridat
                  </button>
                </CombinationAddRow>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faBell} />
                  Notifikace
                </DetailSectionTitle>
                <CheckboxGroup>
                  <CheckboxLabel>
                    <input type="checkbox" defaultChecked />
                    <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '4px' }} />
                    E-mail notifikace
                  </CheckboxLabel>
                  <CheckboxLabel>
                    <input type="checkbox" defaultChecked />
                    <FontAwesomeIcon icon={faBell} style={{ marginRight: '4px' }} />
                    In-app notifikace
                  </CheckboxLabel>
                </CheckboxGroup>
                <FormGroup style={{ marginTop: '16px' }}>
                  <Label>Typy událostí</Label>
                  <TagList>
                    {selectedNotificationTypes.map((typeId) => {
                      const notifType = notificationTypes.find(nt => nt.id === typeId);
                      return notifType ? (
                        <Tag key={typeId}>
                          {notifType.name}
                          <button onClick={() => {
                            setSelectedNotificationTypes(prev => prev.filter(id => id !== typeId));
                          }}>
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </Tag>
                      ) : null;
                    })}
                  </TagList>
                  <Select 
                    style={{ marginTop: '12px', width: '100%' }}
                    onChange={(e) => {
                      const typeId = e.target.value;
                      if (typeId && !selectedNotificationTypes.includes(typeId)) {
                        setSelectedNotificationTypes(prev => [...prev, typeId]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">-- Vyberte typ události --</option>
                    {notificationTypes
                      .filter(nt => !selectedNotificationTypes.includes(nt.id))
                      .map(nt => (
                        <option key={nt.id} value={nt.id}>
                          {nt.name}
                        </option>
                      ))
                    }
                  </Select>
                </FormGroup>
              </DetailSection>

              <Divider />

              {/* Sekce notifikací - zobraz jen když edge obsahuje template */}
              {selectedEdge && (() => {
                const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                const targetNode = nodes.find(n => n.id === selectedEdge.target);
                const isTemplateEdge = sourceNode?.data?.type === 'template' || targetNode?.data?.type === 'template';
                
                if (!isTemplateEdge) return null;
                
                return (
                  <>
                    <DetailSection>
                      <DetailSectionTitle>
                        <FontAwesomeIcon icon={faBell} />
                        Nastavení notifikací
                      </DetailSectionTitle>
                      <div style={{ 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: '6px',
                        marginBottom: '12px',
                        border: '1px solid #fbbf24'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#78350f', fontWeight: 500 }}>
                          🔔 <strong>{sourceNode?.data?.type === 'template' ? sourceNode.data.name : targetNode.data.name}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '4px' }}>
                          Bude odesílána: {targetNode?.data?.type === 'template' ? sourceNode.data.name : targetNode.data.name}
                        </div>
                      </div>
                      
                      <CheckboxGroup>
                        <CheckboxLabel>
                          <input 
                            type="checkbox" 
                            checked={notificationEmailEnabled}
                            onChange={(e) => setNotificationEmailEnabled(e.target.checked)}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FontAwesomeIcon icon={faEnvelope} style={{ color: '#667eea' }} />
                            <span>Poslat emailem</span>
                          </div>
                        </CheckboxLabel>
                        <CheckboxLabel>
                          <input 
                            type="checkbox" 
                            checked={notificationInAppEnabled}
                            onChange={(e) => setNotificationInAppEnabled(e.target.checked)}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FontAwesomeIcon icon={faBell} style={{ color: '#f5576c' }} />
                            <span>Zobrazit ve zvonečku (in-app)</span>
                          </div>
                        </CheckboxLabel>
                      </CheckboxGroup>
                      
                      <div style={{ 
                        marginTop: '12px',
                        padding: '10px',
                        background: '#f0fdf4',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#166534',
                        border: '1px solid #86efac'
                      }}>
                        <strong>ℹ️ Hierarchie rozhodování:</strong>
                        <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                          <li>Globální nastavení aplikace</li>
                          <li>Nastavení tohoto vztahu (zde)</li>
                          <li>Uživatelské preference v profilu</li>
                        </ol>
                        <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#15803d' }}>
                          Notifikace se odešle pouze když jsou všechny 3 úrovně povoleny.
                        </div>
                      </div>
                    </DetailSection>
                    <Divider />
                  </>
                );
              })()}

              <DetailSection>
                <Button primary style={{ width: '100%', marginBottom: '10px' }}>
                  <FontAwesomeIcon icon={faSave} />
                  Uložit změny
                </Button>
                <button
                  onClick={handleDeleteNode}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#b91c1c';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Odstranit vztah</span>
                </button>
              </DetailSection>
            </DetailContent>
          </DetailPanel>
        )}
      </MainContent>

      {dialog.show && (
        <DialogOverlay onClick={() => dialog.onCancel?.()}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <DialogIcon>{dialog.icon}</DialogIcon>
            <DialogTitle>{dialog.title}</DialogTitle>
            <DialogMessage>{dialog.message}</DialogMessage>
            {dialog.stats && (
              <DialogStats>
                {Object.entries(dialog.stats).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </DialogStats>
            )}
            <DialogActions>
              {dialog.cancelText && (
                <DialogButton onClick={dialog.onCancel}>
                  {dialog.cancelText}
                </DialogButton>
              )}
              <DialogButton primary onClick={dialog.onConfirm}>
                {dialog.confirmText}
              </DialogButton>
            </DialogActions>
          </DialogBox>
        </DialogOverlay>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog.isOpen && (
        <ModalOverlay onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <FontAwesomeIcon icon={faTrash} />
              {confirmDialog.title}
            </ModalHeader>
            <ModalBody>
              {confirmDialog.message}
            </ModalBody>
            <ModalActions>
              <ModalButton
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
              >
                Zrušit
              </ModalButton>
              <ModalButton
                variant="danger"
                onClick={confirmDialog.onConfirm}
              >
                Ano, smazat
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Profile Save As Dialog */}
      {showProfileDialog && (
        <ProfileDialog
          mode={profileDialogMode}
          onClose={() => setShowProfileDialog(false)}
          onSave={handleProfileSaveConfirm}
          existingProfiles={profiles}
        />
      )}
    </Container>
  );
};

// Profile Dialog Component
const ProfileDialog = ({ mode, onClose, onSave, existingProfiles }) => {
  const [profileName, setProfileName] = React.useState('');
  const [profileDescription, setProfileDescription] = React.useState('');
  const [error, setError] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  
  const handleSubmit = async () => {
    if (!profileName.trim()) {
      setError('Nazev profilu je povinny');
      return;
    }
    
    const result = await onSave(profileName, profileDescription);
    
    if (result.exists) {
      setShowConfirm(true);
    } else if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };
  
  const handleOverwrite = async () => {
    // TODO: Implementovat přepsání existujícího profilu
    setShowConfirm(false);
    onClose();
  };
  
  if (showConfirm) {
    return (
      <DialogOverlay onClick={onClose}>
        <DialogBox onClick={(e) => e.stopPropagation()}>
          <DialogIcon>⚠️</DialogIcon>
          <DialogTitle>Profil jiz existuje</DialogTitle>
          <DialogMessage>
            Profil s nazvem "<strong>{profileName}</strong>" jiz existuje.
            <br/><br/>
            Chcete jej prepsat?
          </DialogMessage>
          <DialogActions>
            <DialogButton onClick={() => setShowConfirm(false)}>
              Zrusit
            </DialogButton>
            <DialogButton primary onClick={handleOverwrite}>
              Ano, prepsat
            </DialogButton>
          </DialogActions>
        </DialogBox>
      </DialogOverlay>
    );
  }
  
  return (
    <DialogOverlay onClick={onClose}>
      <DialogBox onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <DialogIcon>💾</DialogIcon>
        <DialogTitle>{mode === 'saveAs' ? 'Ulozit jako novy profil' : 'Ulozit profil'}</DialogTitle>
        <div style={{ padding: '20px', textAlign: 'left' }}>
          <FormGroup>
            <Label>Nazev profilu *</Label>
            <Input
              type="text"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                setError('');
              }}
              placeholder="napr. ZZSSK 2025, DEV DEMO..."
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Label>Popis (volitelny)</Label>
            <textarea
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Strucny popis profilu..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #e0e6ed',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </FormGroup>
          {error && (
            <div style={{ 
              padding: '10px', 
              background: '#fee', 
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c00',
              fontSize: '0.9rem',
              marginTop: '10px'
            }}>
              {error}
            </div>
          )}
        </div>
        <DialogActions>
          <DialogButton onClick={onClose}>
            Zrusit
          </DialogButton>
          <DialogButton primary onClick={handleSubmit}>
            Ulozit
          </DialogButton>
        </DialogActions>
      </DialogBox>
    </DialogOverlay>
  );
};

export default OrganizationHierarchy;
