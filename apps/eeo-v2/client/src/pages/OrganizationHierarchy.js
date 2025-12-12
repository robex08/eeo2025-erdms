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
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

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
  padding: 8px 12px 8px 36px;
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

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  padding-bottom: 80px; /* Prostor pro fixní patičku */

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
    border-color: #667eea;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &:active {
    cursor: grabbing;
  }
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
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
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
`;

const DepartmentIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
`;

const CanvasArea = styled.div`
  flex: 1;
  position: relative;
  background: #f5f7fa;
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

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: white;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

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
const CustomNode = ({ data }) => {
  return (
    <div style={{
      padding: '14px',
      borderRadius: '12px',
      background: 'white',
      border: `3px solid ${data.isSelected ? '#667eea' : '#e0e6ed'}`,
      minWidth: '220px',
      boxShadow: data.isSelected 
        ? '0 8px 24px rgba(102, 126, 234, 0.3)' 
        : '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
      position: 'relative'
    }}>
      {/* Target handle - kam přijdou šipky (nahoře) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '16px',
          height: '16px',
          background: '#667eea',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    locations: false,
    departments: false,
    notificationTemplates: false
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
  
  // Detail panel data - rozšířené lokality a notifikace pro vybraný vztah
  const [selectedExtendedLocations, setSelectedExtendedLocations] = useState([]);
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState([]);
  
  // Selection state pro levý panel (checkboxy)
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

  // State pro sledování, zda byl draft načten
  const [hasDraft, setHasDraft] = useState(false);

  // Auto-save do localStorage při změně nodes/edges
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      try {
        localStorage.setItem(LS_NODES_KEY, JSON.stringify(nodes));
        localStorage.setItem(LS_EDGES_KEY, JSON.stringify(edges));
        localStorage.setItem(LS_TIMESTAMP_KEY, new Date().toISOString());
        console.log('💾 Auto-saved draft to localStorage:', {
          nodes: nodes.length,
          edges: edges.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save draft:', err);
      }
    }
  }, [nodes, edges]);

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
                console.log('📦 Found draft in localStorage:', {
                  nodes: parsedNodes.length,
                  edges: parsedEdges.length,
                  age: `${hoursSince.toFixed(1)}h ago`,
                  timestamp: savedTimestamp
                });
                draftLoaded = true;
                setHasDraft(true);
                setNodes(parsedNodes);
                setEdges(parsedEdges);
              }
            } else {
              // Vyčistit starý draft
              console.log('🗑️ Clearing old draft (>24h)');
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
        const [usersData, locationsData, departmentsData, structureData, notifTypesData, templatesData] = await Promise.all([
          fetchData('hierarchy/users'),
          fetchData('hierarchy/locations'),
          fetchData('hierarchy/departments'),
          fetchData('hierarchy/structure'),
          fetchData('hierarchy/notification-types'),
          fetchData('notifications/templates/list')
        ]);

        console.log('🔍 HIERARCHY API RESPONSES:');
        console.log('📊 Users:', usersData);
        console.log('📍 Locations:', locationsData);
        console.log('🏢 Departments:', departmentsData);
        console.log('🌳 Structure:', structureData);
        console.log('🔔 Notification Types:', notifTypesData);
        console.log('📧 Notification Templates:', templatesData);

        setAllUsers(usersData.data || []);
        setAllLocations(locationsData.data || []);
        setAllDepartments(departmentsData.data || []);
        setNotificationTypes(notifTypesData.data || []);
        setAllNotificationTemplates(templatesData.data || []);

        // 4. Nastavit hierarchickou strukturu POUZE pokud NENÍ draft
        if (!draftLoaded && structureData.data) {
          console.log('📥 Loading hierarchy from API (no draft found)');
          const { nodes: apiNodes, edges: apiEdges } = structureData.data;

          // Konvertovat nodes z API do React Flow formát
          const flowNodes = apiNodes.map((node, index) => ({
            id: node.id,
            type: 'custom',
            position: { 
              x: 100 + (index % 4) * 250, 
              y: 50 + Math.floor(index / 4) * 200 
            },
            data: {
              name: node.name,
              position: node.position,
              initials: node.initials,
              metadata: node.metadata
            }
          }));

          // Konvertovat edges z API do React Flow formát
          const flowEdges = apiEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 },
            data: edge.permissions // Uložit permissions pro detail panel
          }));

          setNodes(flowNodes);
          setEdges(flowEdges);
        } else if (draftLoaded) {
          console.log('✅ Using draft from localStorage (API data ignored for nodes/edges)');
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
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#667eea', strokeWidth: 3 }
    }, eds));
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setShowDetailPanel(true);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: n.id === node.id }
      }))
    );
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowDetailPanel(true);
    
    // Najít source a target nodes pro zobrazení jmen
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    // Přidat metadata k edge pro zobrazení
    setSelectedEdge({
      ...edge,
      metadata: {
        sourceName: sourceNode?.data?.name || 'Neznámý',
        targetName: targetNode?.data?.name || 'Neznámý'
      }
    });
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
    setSelectedLocations(new Set(allLocations.map(l => l.id)));
  };

  const deselectAllLocations = () => {
    setSelectedLocations(new Set());
  };

  const selectAllDepartments = () => {
    setSelectedDepartments(new Set(allDepartments.map(d => d.id)));
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
    setSelectedNotificationTemplates(new Set(allNotificationTemplates.map(t => t.id)));
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

    // Přidat uživatele z vybraných lokalit (povolujeme duplicity)
    selectedLocations.forEach(locationId => {
      const location = allLocations.find(l => l.id === locationId);
      if (location) {
        const usersInLocation = allUsers.filter(u => u.location === location.name);
        usersInLocation.forEach((user, userIndex) => {
          newNodes.push({
            id: `user-${user.id}-${timestamp}-loc${locationId}-${userIndex}`,
            type: 'custom',
            position: {
              x: 100 + (index % 5) * 250,
              y: 100 + Math.floor(index / 5) * 180
            },
            data: {
              userId: user.id, // Původní user ID
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
        });
      }
    });

    // Přidat uživatele z vybraných útvarů (povolujeme duplicity)
    selectedDepartments.forEach(deptId => {
      const department = allDepartments.find(d => d.id === deptId);
      if (department) {
        const usersInDept = allUsers.filter(u => u.department === department.name);
        usersInDept.forEach((user, userIndex) => {
          newNodes.push({
            id: `user-${user.id}-${timestamp}-dept${deptId}-${userIndex}`,
            type: 'custom',
            position: {
              x: 100 + (index % 5) * 250,
              y: 100 + Math.floor(index / 5) * 180
            },
            data: {
              userId: user.id, // Původní user ID
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
        });
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
    
    // ReactFlow's project() metoda přímo přijímá clientX/clientY a sama přepočítá zoom+pan
    // Není potřeba nic odečítat, project() to dělá interně
    const position = reactFlowInstance.project({
      x: event.clientX,
      y: event.clientY,
    });
    
    console.log('📦 Drop:', { 
      dragId, 
      position, 
      clientX: event.clientX, 
      clientY: event.clientY,
      viewport: reactFlowInstance.getViewport()
    });
    
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
    
    // Zpracování lokality - vytáhne všechny uživatele z této lokality
    if (dragId.startsWith('loc-')) {
      const locationId = dragId.replace('loc-', '');
      const location = allLocations.find(l => l.id === locationId);
      
      if (location) {
        const usersInLocation = allUsers.filter(u => u.location === location.name);
        
        console.log(`📍 Dropping location: ${location.name} with ${usersInLocation.length} users`);
        
        const timestamp = Date.now();
        const newNodes = usersInLocation.map((user, i) => ({
          id: `user-${user.id}-${timestamp}-${i}`,
          type: 'custom',
          position: { 
            x: position.x + (i % 3) * 250, 
            y: position.y + Math.floor(i / 3) * 180 
          },
          data: {
            userId: user.id, // Původní user ID
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        }));
        
        setNodes((nds) => [...nds, ...newNodes]);
      }
      return;
    }
    
    // Zpracování útvaru - vytáhne všechny uživatele z tohoto útvaru
    if (dragId.startsWith('dept-')) {
      const deptId = dragId.replace('dept-', '');
      const department = allDepartments.find(d => d.id === deptId);
      
      if (department) {
        const usersInDept = allUsers.filter(u => u.department === department.name);
        
        console.log(`🏢 Dropping department: ${department.name} with ${usersInDept.length} users`);
        
        const timestamp = Date.now();
        const newNodes = usersInDept.map((user, i) => ({
          id: `user-${user.id}-${timestamp}-${i}`,
          type: 'custom',
          position: { 
            x: position.x + (i % 3) * 250, 
            y: position.y + Math.floor(i / 3) * 180 
          },
          data: {
            userId: user.id, // Původní user ID
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        }));
        
        setNodes((nds) => [...nds, ...newNodes]);
      }
    }
  };

  const onReactFlowDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleAutoGenerateHierarchy = () => {
    // Kontrola zda jsou vybrané položky
    const totalSelected = selectedUsers.size + selectedLocations.size + selectedDepartments.size;
    
    if (totalSelected === 0) {
      setDialog({
        show: true,
        type: 'alert',
        icon: '⚠️',
        title: 'Žádné položky nevybrány',
        message: 'Pro vytvoření AI hierarchie musíte nejprve vybrat uživatele, lokality nebo útvary ze seznamu vlevo.\n\nPoužijte checkboxy pro výběr položek.',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    // Generovat hierarchii pouze z vybraných položek
    generateHierarchyFromSelected();
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
      message: 'Hierarchie byla automaticky vygenerována z vybraných položek.\nZkontrolujte strukturu a případně upravte.\nNezapomeňte uložit!',
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
        message: 'Použity existující vztahy z databáze.\nAplikováno přehledné automatické rozložení.',
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
      title: 'Hierarchie automaticky vytvořena!',
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

  const handleSave = async () => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const response = await fetch(`${apiBase}/hierarchy/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          username,
          nodes: nodes.map(n => ({
            id: n.data.userId || n.id, // Použít userId pokud existuje (duplicitní nodes)
            position: n.position,
            data: n.data
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceUserId: nodes.find(n => n.id === e.source)?.data?.userId, // Pro duplicity
            targetUserId: nodes.find(n => n.id === e.target)?.data?.userId, // Pro duplicity
            type: e.data?.type || 'prime',
            permissions: e.data || {}
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Chyba při ukládání');
      }

      const result = await response.json();
      if (result.success) {
        // Vyčistit localStorage draft po úspěšném uložení
        localStorage.removeItem(LS_NODES_KEY);
        localStorage.removeItem(LS_EDGES_KEY);
        localStorage.removeItem(LS_TIMESTAMP_KEY);
        setHasDraft(false);
        console.log('🗑️ Cleared localStorage draft after successful save');
        
        setDialog({
          show: true,
          type: 'success',
          icon: '✅',
          title: 'Hierarchie úspěšně uložena!',
          message: 'Data byla uložena do databáze.\nDraft byl automaticky vymazán z localStorage.',
          stats: {
            'Uložených uzlů': nodes.length,
            'Uložených vztahů': edges.length
          },
          onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
          confirmText: 'OK',
          cancelText: null
        });
      } else {
        throw new Error(result.error || 'Neznámá chyba');
      }
    } catch (err) {
      console.error('Save error:', err);
      setDialog({
        show: true,
        type: 'alert',
        icon: '❌',
        title: 'Chyba při ukládání',
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
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Organizační řád
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
            Organizační řád
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
          Organizační řád
        </Title>
        <HeaderActions>
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
                  {hasDraft ? 'Načteno z auto-draftu' : 'Neuloženo (auto-draft)'}
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
            title="Automaticky přerovnat existující strukturu"
          >
            <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>📐</span>
            Přerovnat
          </Button>
          <Button>
            <FontAwesomeIcon icon={faEye} />
            Náhled
          </Button>
          <Button primary onClick={handleSave} disabled={loading || (nodes.length === 0 && edges.length === 0)}>
            <FontAwesomeIcon icon={faSave} />
            Uložit do DB
          </Button>
        </HeaderActions>
      </Header>

      <MainContent>
        <Sidebar>
            <SidebarHeader>
              <SidebarTitle>
                <FontAwesomeIcon icon={faUsers} />
                Uživatelé & Lokality
              </SidebarTitle>
            </SidebarHeader>

            <SearchBox>
              <SearchIcon>
                <FontAwesomeIcon icon={faSearch} />
              </SearchIcon>
              <SearchInput
                placeholder="Hledat uživatele..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  LOKALITY ({allLocations.length})
                  {selectedLocations.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f5576c', fontWeight: 'bold' }}>
                      {selectedLocations.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.locations}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedLocations.size === allLocations.length) {
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
                      {selectedLocations.size === allLocations.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {allLocations.map((loc) => (
                      <LocationItem
                        key={loc.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `loc-${loc.id}`);
                          setDraggedItem(`loc-${loc.id}`);
                          console.log('👉 Drag start location:', loc.id, loc.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
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
                  ÚSEKY ({allDepartments.length})
                  {selectedDepartments.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#00f2fe', fontWeight: 'bold' }}>
                      {selectedDepartments.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.departments}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDepartments.size === allDepartments.length) {
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
                      {selectedDepartments.size === allDepartments.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {allDepartments.map((dept) => (
                      <LocationItem
                        key={dept.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `dept-${dept.id}`);
                          setDraggedItem(`dept-${dept.id}`);
                          console.log('👉 Drag start department:', dept.id, dept.name);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
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
                  NOTIFIKAČNÍ ŠABLONY ({allNotificationTemplates.length})
                  {selectedNotificationTemplates.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                      {selectedNotificationTemplates.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.notificationTemplates}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedNotificationTemplates.size === allNotificationTemplates.length) {
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
                      {selectedNotificationTemplates.size === allNotificationTemplates.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {allNotificationTemplates.map((template) => (
                      <div
                        key={template.id}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #e0e6ed',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer',
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

            {/* Akční tlačítka - Přidat vybrané */}
            {(selectedUsers.size > 0 || selectedLocations.size > 0 || selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && (
              <div style={{
                padding: '16px',
                borderTop: '2px solid #e0e6ed',
                background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)'
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
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls />
                    <MiniMap 
                      nodeColor="#667eea"
                      maskColor="rgba(245, 247, 250, 0.8)"
                      style={{
                        background: 'white',
                        border: '1px solid #e0e6ed',
                        borderRadius: '8px'
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
                              1. Přidejte uživatele:
                            </strong>
                            • Přetáhněte z levého panelu<br/>
                            • Nebo použijte 🤖 AI Struktura
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              2. Vytvořte vztah (šipku):
                            </strong>
                            • Najděte 🟢 zelený kroužek DOLE u nadřízeného<br/>
                            • Držte a táhněte myší<br/>
                            • Pusťte na 🔵 modrý kroužek NAHOŘE u podřízeného
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              3. Přerovnání:
                            </strong>
                            • Tlačítko 📐 Přerovnat = automatický layout<br/>
                            • Nebo přetahujte uzly ručně
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              4. Detail vztahu:
                            </strong>
                            • Klikněte na šipku → otevře se pravý panel<br/>
                            • Nastavte práva a lokality
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#f5576c', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              5. Uložení:
                            </strong>
                            • Tlačítko "Uložit do DB" vpravo nahoře
                          </div>
                          <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              💾 Auto-save:
                            </strong>
                            <span style={{ fontSize: '0.8rem' }}>
                              Pozice uzlů se ukládají automaticky do localStorage a obnoví se po refreshi. Draft se vymaže po uložení do DB.
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

              <DetailSection>
                <Button primary style={{ width: '100%', marginBottom: '10px' }}>
                  <FontAwesomeIcon icon={faSave} />
                  Uložit změny
                </Button>
                <Button onClick={handleDeleteNode} style={{ width: '100%' }}>
                  <FontAwesomeIcon icon={faTrash} />
                  Odstranit vztah
                </Button>
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
    </Container>
  );
};

export default OrganizationHierarchy;
