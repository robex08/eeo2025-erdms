import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { Paperclip, Upload, Download, Trash2, AlertCircle, Loader, FileText, FileX, X, Info, AlertTriangle, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import {
  uploadInvoiceAttachment25,
  listInvoiceAttachments25,
  downloadInvoiceAttachment25,
  deleteInvoiceAttachment25,
  updateInvoiceAttachment25,
  verifyInvoiceAttachments25,
  createInvoiceWithAttachment25,
  isAllowedInvoiceFileType,
  isAllowedInvoiceFileSize,
  isISDOCFile,
  formatFileSize
} from '../../services/api25invoices';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { prettyDate } from '../../utils/format';
import ISDOCParsingDialog from './ISDOCParsingDialog';
import { parseISDOCFile, createISDOCSummary, mapISDOCToFaktura } from '../../utils/isdocParser';
import ConfirmDialog from '../ConfirmDialog'; // 🆕 Vlastní confirm dialog
import { extractTextFromPDF, extractInvoiceData } from '../../utils/invoiceOCR'; // 🆕 OCR

/**
 * InvoiceAttachmentsCompact Component
 *
 * PŘESNĚ PODLE VZORU OBJEDNÁVKY PŘÍLOH:
 * - attachments[] array (lokální + server)
 * - status: 'pending_classification' | 'uploaded'
 * - Klasifikace před uploadem pomocí <select>
 */

const Wrapper = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  align-items: center;
  gap: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: #3b82f6;
  }
`;

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-left: 6px;
`;

const DropZone = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 2px dashed ${props => props.isDragging ? '#3b82f6' : '#d1d5db'};
  border-radius: 8px;
  background: ${props => props.isDragging ? '#eff6ff' : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }

  ${props => props.disabled && `
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      border-color: #d1d5db;
      background: #ffffff;
    }
  `}
`;

const DropZoneIcon = styled.div`
  font-size: 1.5rem;
  color: ${props => props.isDragging ? '#3b82f6' : '#9ca3af'};
`;

const DropZoneText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DropZoneTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const DropZoneSubtitle = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const HiddenInput = styled.input`
  display: none;
`;

const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f3f4f6;
  }
`;

const AttachmentLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
`;

const AttachmentIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 6px;
  color: #ffffff;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const AttachmentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const AttachmentName = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AttachmentMeta = styled.div`
  font-size: 0.6875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ISDOCBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 0.625rem;
  font-weight: 600;
`;

const AttachmentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: ${props => props.variant === 'danger' ? '#fef2f2' : '#ffffff'};
  color: ${props => props.variant === 'danger' ? '#dc2626' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${props => props.variant === 'danger' ? '#fee2e2' : '#f3f4f6'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 0.8125rem;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// File Viewer Modal Styles (převzato ze Spisovky)
const FileModal = styled.div`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => props.w}px;
  height: ${props => props.h}px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
  z-index: 999998;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FileModalContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const FileModalHeader = styled.div`
  padding: 12px 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FileModalTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FileCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
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
    background: rgba(255, 255, 255, 0.3);
  }
`;

const FileObject = styled.object`
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
`;

const PdfFallback = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: #f8fafc;
  color: #334155;
`;

const DownloadButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
  }
`;


const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  color: #6b7280;
  font-size: 0.8125rem;

  svg {
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 8px;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const InfoText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
`;

const InvoiceAttachmentsCompact = ({
  fakturaId,
  objednavkaId,
  fakturaTypyPrilohOptions = [], // FAKTURA_TYP z OrderForm25
  readOnly = false, // ⚠️ KLÍČOVÉ: Pokud false, VŠECHNY přílohy jsou editovatelné!
  onISDOCParsed, // 🆕 Callback pro vyplnění faktury z ISDOC
  formData, // 🆕 Pro mapování středisek z objednávky
  faktura, // 🆕 Objekt faktury pro validaci povinných položek
  validateInvoiceForAttachments, // 🆕 Validační funkce pro fakturu
  isPokladna = false, // 🆕 Je to pokladní doklad? (bez validace povinných položek)
  onAttachmentUploaded, // 🆕 Callback po úspěšném uploadu jakékoliv přílohy (včetně ISDOC)
  onAttachmentRemoved, // 🆕 Callback při smazání přílohy (pro cleanup Spisovka metadata)
  onOpenViewerAttachment, // 🆕 Volitelné: otevřít sdílený AttachmentViewer (např. v evidenci faktur)
  attachments: externalAttachments = [], // 🆕 Attachments z formData.faktury[].attachments (controlled)
  onAttachmentsChange, // 🆕 Callback pro aktualizaci attachments (controlled component pattern)
  onCreateInvoiceInDB, // 🆕 Callback pro vytvoření faktury v DB (temp → real ID)
  onOCRDataExtracted, // 🆕 Callback pro předání OCR vytěžených dat
  allUsers = [] // 🆕 Seznam všech uživatelů pro zobrazení jména nahrávajícího uživatele
}) => {
  const { username, token, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext); // ✅ OPRAVENO: showToast místo addToast

  // 🔒 Normalizace stavu faktury (různé zdroje + whitespace/casing)
  const invoiceStateRaw = faktura?.stav ?? formData?.stav ?? formData?.stav_faktury ?? formData?.faktura_stav;
  const invoiceState = String(invoiceStateRaw || '').trim().toUpperCase();
  const isInvoiceCompleted = invoiceState === 'DOKONCENA';

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = React.useRef(null);

  // 🆕 ISDOC parsing state
  const [showISDOCDialog, setShowISDOCDialog] = useState(false);
  const [pendingISDOCFile, setPendingISDOCFile] = useState(null);
  const [isdocSummary, setIsdocSummary] = useState(null);

  // 🆕 File Viewer state (jako ve Spisovce)
  const [fileViewer, setFileViewer] = useState({ visible: false, url: '', filename: '', type: '' });
  const [fileViewerPosition, setFileViewerPosition] = useState(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // Šířka: 50% obrazovky, max 900px, min 400px
    const width = Math.max(400, Math.min(Math.floor(screenWidth * 0.5), 900));
    // Výška: 85% obrazovky
    const height = Math.floor(screenHeight * 0.85);
    // X pozice: zarovnat vpravo s 20px marginem
    const x = Math.max(20, screenWidth - width - 20);
    // Y pozice: vycentrovat vertikálně
    const y = Math.max(20, Math.floor((screenHeight - height) / 2));
    return { x, y, w: width, h: height };
  });
  const [isDraggingViewer, setIsDraggingViewer] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Offset myši při kliknutí

  // 🆕 Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // � FLAG: Sleduje, zda jsme už jednou načetli přílohy ze serveru (prevence infinite loop)
  const hasLoadedFromServerRef = React.useRef(false);

  // � REF: Sleduje ID souborů, které se právě uploadují nebo už byly uploadnuty
  // Prevence duplikace upload requestů
  const uploadingFilesRef = React.useRef(new Set());
  const uploadedFilesRef = React.useRef(new Set());

  // �🔄 LOKÁLNÍ STATE pro attachments - umožňuje okamžité UI aktualizace
  // Synchronizuje se s externalAttachments, ale může se měnit i lokálně
  const [localAttachments, setLocalAttachments] = useState([]);

  // 🔄 Synchronizovat lokální state s external attachments při změně props
  // ✅ OPRAVA: MERGOVAT místo přepsat - zachovat lokální uploading/uploaded stavy
  useEffect(() => {
    if (Array.isArray(externalAttachments)) {
      setLocalAttachments(prev => {
        // Pokud je lokální state prázdný, použít external přímo
        if (!prev || prev.length === 0) {
          return externalAttachments;
        }
        
        // Jinak mergovat: zachovat pending/uploading soubory z lokálního state
        const externalIds = new Set(externalAttachments.map(a => a.id || a.serverId));
        const pendingLocal = prev.filter(a => {
          // ✅ KRITICKÁ OPRAVA: NEPŘIDÁVAT soubory, které už jsou v externalAttachments
          // (prevence duplikace při callback → externalAttachments update → useEffect)
          if (externalIds.has(a.id)) {
            return false; // Soubor už je v external - přeskočit
          }
          
          // Zachovat soubory co jsou pending/uploading/s temp ID
          return (
            a.status === 'pending_upload' || 
            a.status === 'pending_classification' || 
            a.status === 'uploading' ||
            String(a.id || '').startsWith('pending-') ||
            // A TAKÉ zachovat čerstvě uploadnuté (status='uploaded') co ještě nejsou v external
            (a.status === 'uploaded' && a.serverId && !externalIds.has(a.serverId))
          );
        });
        
        // ✅ KRITICKÁ OPRAVA: DEDUPLIKACE podle ID před kombinací
        // Zabraňuje množení pending souborů při opakovaných re-renderech
        const combined = [...externalAttachments, ...pendingLocal];
        const seenIds = new Set();
        const deduplicated = combined.filter(a => {
          if (!a || !a.id) return false;
          if (seenIds.has(a.id)) {
            console.warn('⚠️ Duplicitní attachment ID:', a.id, '- odstraňuji');
            return false;
          }
          seenIds.add(a.id);
          return true;
        });
        
        // ✅ PREVENCE INFINITE LOOP: Porovnat staré a nové pole
        // Pokud jsou stejné, neaktualizovat (zabrání zbytečným re-renderům)
        if (prev.length === deduplicated.length) {
          const areEqual = prev.every((item, idx) => {
            const newItem = deduplicated[idx];
            return item.id === newItem?.id && item.status === newItem?.status;
          });
          if (areEqual) {
            return prev; // Žádná změna - neaktualizovat
          }
        }
        
        // Kombinovat: external (ze serveru) + pending local (rozpracované)
        return deduplicated;
      });
    }
  }, [externalAttachments]);

  // �🔄 Použít external attachments jako zdroj pravdy (controlled component)
  // ✅ BEZPEČNOSTNÍ KONTROLA: zajistit že attachments je vždy pole
  // ✅ OPRAVA: Mapovat file_size -> size pokud přijde z API
  // ✅ OPRAVA 2: Používat localAttachments pro okamžité UI updates
  const attachments = useMemo(() => {
    if (!Array.isArray(localAttachments)) return [];
    
    const mapped = localAttachments.map(att => {
      // Vždy přidat aliasy pro kompatibilitu (pokud chybí)
      return {
        ...att,
        name: att.name || att.originalni_nazev_souboru,
        size: att.size || att.velikost_souboru_b || 0,
        klasifikace: att.klasifikace || att.typ_prilohy,
        uploadDate: att.uploadDate || att.dt_vytvoreni,
        serverId: att.serverId || att.id,
        status: att.status || 'uploaded'
      };
    });
    
    return mapped;
  }, [localAttachments, fakturaId]);

  // 🔧 Helper funkce pro aktualizaci attachments (volá onAttachmentsChange callback)
  // ⚠️ DŮLEŽITÉ: Musí správně fungovat s controlled component pattern
  // ✅ OPRAVA: Používat localAttachments pro okamžité UI updates
  // ✅ OPRAVA 2: Ref pro prevenci duplicitních callback volání
  const lastCallbackDataRef = React.useRef(null);
  const callbackTimeoutRef = React.useRef(null);
  
  const updateAttachments = useCallback((updater) => {
    // ✅ Pokud je updater funkce, musíme ji zavolat s aktuálními attachments
    // ✅ Pokud je to hodnota, předat ji přímo
    if (typeof updater === 'function') {
      // ✅ OPRAVA: Aktualizovat lokální state OKAMŽITĚ pro UI
      setLocalAttachments(prev => {
        const updated = updater(prev || []);
        
        // ⚠️ DŮLEŽITÉ: Odložit callback do další event loop iterace
        // ✅ OPRAVA: Zrušit předchozí timeout (debouncing)
        if (callbackTimeoutRef.current) {
          clearTimeout(callbackTimeoutRef.current);
        }
        
        // ✅ DEDUPLIKACE: Porovnat s posledními daty před voláním callbacku
        callbackTimeoutRef.current = setTimeout(() => {
          if (onAttachmentsChange) {
            // Serializovat pro porovnání (jednoduchá kontrola změny)
            const newDataStr = JSON.stringify(updated.map(a => ({ id: a.id, status: a.status })));
            
            if (lastCallbackDataRef.current !== newDataStr) {
              lastCallbackDataRef.current = newDataStr;
              onAttachmentsChange(updated);
            }
          }
          callbackTimeoutRef.current = null;
        }, 50); // 50ms debounce pro batch updates
        
        return updated;
      });
    } else {
      // Přímá hodnota
      setLocalAttachments(updater);
      
      // ⚠️ DŮLEŽITÉ: Odložit callback do další event loop iterace
      // ✅ OPRAVA: Zrušit předchozí timeout (debouncing)
      if (callbackTimeoutRef.current) {
        clearTimeout(callbackTimeoutRef.current);
      }
      
      callbackTimeoutRef.current = setTimeout(() => {
        if (onAttachmentsChange) {
          // Serializovat pro porovnání
          const newDataStr = JSON.stringify(updater.map(a => ({ id: a.id, status: a.status })));
          
          if (lastCallbackDataRef.current !== newDataStr) {
            lastCallbackDataRef.current = newDataStr;
            onAttachmentsChange(updater);
          }
        }
        callbackTimeoutRef.current = null;
      }, 50); // 50ms debounce
    }
  }, [onAttachmentsChange]);

  // 📛 Helper funkce pro získání jména uživatele podle ID nebo přímo z objektu
  const getUserDisplayName = useCallback((userId, directJmeno, directPrijmeni) => {
    // Pokud máme přímo jméno a příjmení, použít je
    if (directJmeno || directPrijmeni) {
      const parts = [];
      if (directJmeno) parts.push(directJmeno);
      if (directPrijmeni) parts.push(directPrijmeni);
      return parts.length > 0 ? parts.join(' ') : (username || 'Neznámý uživatel');
    }
    
    if (!userId) return username || 'Neznámý uživatel';
    
    // Najít uživatele v seznamu
    const user = allUsers.find(u => u.id === userId || u.user_id === userId);
    if (!user) return `Uživatel #${userId}`;
    
    // Sestavit celé jméno s tituly
    const parts = [];
    if (user.titul_pred) parts.push(user.titul_pred);
    if (user.jmeno) parts.push(user.jmeno);
    if (user.prijmeni) parts.push(user.prijmeni);
    if (user.titul_za) parts.push(user.titul_za);
    
    return parts.length > 0 ? parts.join(' ') : (user.username || `Uživatel #${userId}`);
  }, [allUsers, username]);

  // 🛡️ Kontrola oprávnění pro editaci/mazání přílohy
  const canEditAttachment = useCallback((attachment) => {
    if (!attachment) return false;

    // Globální read-only režim UI
    if (readOnly) return false;
    
    // 🔒 KRITICKÁ KONTROLA: Pokud je faktura ve stavu DOKONCENA, NIKDO nemůže mazat/editovat přílohy
    // (včetně SUPERADMIN, ADMINISTRATOR, UCETNI)
    if (isInvoiceCompleted) {
      return false;
    }
    
    // Pending/uploading attachments může vždy editovat/mazat (ještě nejsou na serveru)
    if (attachment.status === 'pending' || 
        attachment.status === 'pending_classification' || 
        attachment.status === 'pending_upload' || 
        attachment.status === 'uploading') {
      return true;
    }
    
    // Načíst aktuálního uživatele z AuthContext
    const currentUserId = userDetail?.uzivatel_id || userDetail?.user_id || userDetail?.id;
    const currentUserUsekId = userDetail?.usek_id;
    const userRoles = userDetail?.roles || [];
    
    // Admin, SUPERADMIN a UCETNI může vše (ALE JEN POKUD NENÍ DOKONCENA - kontrola výše)
    const isAdmin = userRoles.some(role => 
      role.kod_role === 'SUPERADMIN' || 
      role.kod_role === 'ADMINISTRATOR' || 
      role.kod_role === 'UCETNI'
    );
    if (isAdmin) {
      return true;
    }
    
    // Uživatel s INVOICE_MANAGE nebo INVOICE_FULL_ACCESS může vše
    const directRights = userDetail?.direct_rights || [];
    const hasInvoiceManage = directRights.some(p => 
      p.kod_prava === 'INVOICE_MANAGE' || 
      p.kod_prava === 'INVOICE_FULL_ACCESS'
    );
    if (hasInvoiceManage) {
      return true;
    }
    
    // Vlastní příloha - porovnat ID uživatele
    const uploadedByUserId = attachment.nahrano_uzivatel_id || attachment.uploaded_by_user_id;
    if (uploadedByUserId && uploadedByUserId === currentUserId) {
      return true;
    }
    
    // ⚠️ FALLBACK: Pokud příloha nemá nahrano_uzivatel_id (čerstvě uploadnutá před refresh),
    // A NENÍ na serveru (nemá serverId), POVOLIT editaci (předpokládáme, že ji nahrál aktuální uživatel)
    if (!uploadedByUserId && !attachment.serverId) {
      return true;
    }
    
    // Příloha ze stejného úseku - najít uživatele v allUsers a porovnat usek_id
    if (uploadedByUserId && currentUserUsekId) {
      const uploaderUser = allUsers.find(u => u.id === uploadedByUserId || u.user_id === uploadedByUserId);
      if (uploaderUser && uploaderUser.usek_id === currentUserUsekId) {
        return true;
      }
    }
    
    return false;
  }, [allUsers, userDetail, readOnly, isInvoiceCompleted]);

  // 🛡️ Helper funkce pro zobrazení důvodů oprávnění
  const getPermissionReasonText = useCallback((reason) => {
    switch (reason) {
      case 'not_author':
        return 'Můžete mazat pouze vlastní přílohy';
      case 'different_department':
        return 'Můžete mazat pouze přílohy od kolegů ze svého úseku';
      case 'invoice_completed':
        return 'Faktura je ve stavu DOKONCENA - nelze upravovat přílohy';
      case 'admin_only':
        return 'Pouze administrátoři mohou mazat tuto přílohu';
      default:
        return reason || 'Nemáte oprávnění smazat tuto přílohu';
    }
  }, []);

  // �🎯 Drag handlers pro file viewer
  const handleFileViewerDrag = useCallback((e) => {
    if (!isDraggingViewer) return;
    e.preventDefault();
    
    setFileViewerPosition(prev => {
      // Použít uložený offset z mouseDown
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Omezení aby okno nevyjelo mimo obrazovku
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      const boundedX = Math.max(0, Math.min(newX, screenWidth - prev.w));
      const boundedY = Math.max(0, Math.min(newY, screenHeight - prev.h));
      
      return {
        ...prev,
        x: boundedX,
        y: boundedY
      };
    });
  }, [isDraggingViewer, dragOffset]);

  const handleFileViewerDragEnd = useCallback(() => {
    setIsDraggingViewer(false);
  }, []);

  useEffect(() => {
    if (isDraggingViewer) {
      const handleMouseMove = (e) => handleFileViewerDrag(e);
      const handleMouseUp = () => handleFileViewerDragEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingViewer, handleFileViewerDrag, handleFileViewerDragEnd]);

  // Načtení příloh při mount nebo změně faktura_id
  // ✅ OPRAVA INFINITE LOOP: Použít ref flag pro kontrolu, zda jsme už načetli data
  useEffect(() => {
    // ✅ Pokud se fakturaId změní, resetovat flag
    hasLoadedFromServerRef.current = false;
  }, [fakturaId]);

  useEffect(() => {
    if (fakturaId && !String(fakturaId).startsWith('temp-')) {
      // ✅ Pokud už máme attachments z props A NEJSOU undefined, použít je
      // (prázdné pole [] je validní stav - znamená 0 příloh)
      if (externalAttachments !== undefined && externalAttachments !== null) {
        return; // Máme data z props (i když prázdné)
      }
      
      // ✅ Pokud jsme už jednou načetli ze serveru, nepokračovat (prevence loop)
      if (hasLoadedFromServerRef.current) {
        return;
      }
      
      // Prázdné nebo undefined → načíst ze serveru (pouze jednou!)
      hasLoadedFromServerRef.current = true;
      loadAttachmentsFromServer();
    }
  }, [fakturaId, externalAttachments]);

  // 🆕 AUTO-UPLOAD pending příloh když se ID změní z temp na reálné
  const prevFakturaIdRef = React.useRef(fakturaId);
  
  // ✅ OPRAVA MNOŽENÍ PŘÍLOH: Ref pro sledování, zda už uploadujeme (prevence duplicit)
  const isUploadingRef = React.useRef(false);

  useEffect(() => {
    const uploadPendingAttachments = async () => {
      // ✅ PREVENCE DUPLICIT: Pokud už uploadujeme, neuploadovat znovu
      if (isUploadingRef.current) {
        return;
      }
      
      // Kontrola: ID se změnilo z temp na reálné
      const prevId = prevFakturaIdRef.current;
      const currentId = fakturaId;

      const wasTemp = String(prevId).startsWith('temp-');
      const isRealNow = currentId && !String(currentId).startsWith('temp-');

      if (!wasTemp || !isRealNow) {
        // Není to změna z temp na reálné - ukončit
        prevFakturaIdRef.current = currentId;
        return;
      }
      // Najdi všechny lokální přílohy, které po získání reálného ID můžeme bezpečně dohrát.
      // Sem patří i předchozí chyby při temp create flow, pokud pořád držíme File objekt.
      const pendingAttachments = attachments.filter(att => 
        (
          att.status === 'pending' ||
          att.status === 'pending_upload' ||
          att.status === 'pending_classification' ||
          att.status === 'error'
        ) && att.file
      );

      if (pendingAttachments.length === 0) {
        prevFakturaIdRef.current = currentId;
        return;
      }
      
      // ✅ ZAMKNOUT: Začínáme upload
      isUploadingRef.current = true;
      
      // Nahrát každou pending přílohu
      for (const attachment of pendingAttachments) {
        try {

          // Update status -> uploading
          updateAttachments(prev => prev.map(a =>
            a.id === attachment.id ? { ...a, status: 'uploading' } : a
          ));

          const response = await uploadInvoiceAttachment25({
            token: token,
            username: username,
            faktura_id: currentId,
            objednavka_id: objednavkaId,
            typ_prilohy: attachment.klasifikace || 'FAKTURA',
            file: attachment.file
          });
          
          // Získej ID přílohy z různých možných struktur
          const attachmentId = response.priloha?.id || 
                              response.priloha_id || 
                              response.data?.priloha?.id || 
                              response.data?.id || 
                              response.id;
          
          // Získej údaje o uživateli z response
          const nahrano_uzivatel_id = response.priloha?.nahrano_uzivatel_id || response.priloha?.nahrano_uzivatel?.id;
          const nahrano_uzivatel_jmeno = response.priloha?.nahrano_uzivatel?.jmeno;
          const nahrano_uzivatel_prijmeni = response.priloha?.nahrano_uzivatel?.prijmeni;
          
          // Update status -> uploaded
          updateAttachments(prev => prev.map(a =>
            a.id === attachment.id ? {
              ...a,
              status: 'uploaded',
              serverId: attachmentId,
              nahrano_uzivatel_id: nahrano_uzivatel_id,
              nahrano_uzivatel_jmeno: nahrano_uzivatel_jmeno,
              nahrano_uzivatel_prijmeni: nahrano_uzivatel_prijmeni,
              file: undefined // Odstraň File object
            } : a
          ));

          showToast&&showToast(`✅ Příloha "${attachment.originalni_nazev_souboru || attachment.name}" byla úspěšně nahrána`, { type: 'success' });

        } catch (uploadError) {

          // Update status -> error
          updateAttachments(prev => prev.map(a =>
            a.id === attachment.id ? { ...a, status: 'error', error: uploadError.message } : a
          ));

          showToast&&showToast(`Nepodařilo se nahrát přílohu "${attachment.originalni_nazev_souboru || attachment.name}"`, { type: 'error' });
        }
      }

      // Zavolat callback pro autosave
      if (onAttachmentUploaded) {
        onAttachmentUploaded();
      }

      // Uložit aktuální ID pro příští porovnání
      prevFakturaIdRef.current = currentId;
      
      // ✅ ODEMKNOUT: Upload dokončen
      isUploadingRef.current = false;
    };

    uploadPendingAttachments();
  }, [fakturaId]); // ✅ OPRAVA: Sleduj POUZE fakturaId, NE attachments (prevence infinite loop)

  // Načtení příloh ze serveru
  const loadAttachmentsFromServer = async () => {
    if (!fakturaId || String(fakturaId).startsWith('temp-')) return;
    setLoading(true);
    setError(null);

    try {
      const response = await listInvoiceAttachments25({
        token: token,
        username: username,
        faktura_id: fakturaId,
        objednavka_id: objednavkaId // ✅ PŘIDÁNO pro nové Order V2 API
      });

      // ✅ BACKEND VRACÍ ČESKÉ NÁZVY 1:1 JAK JSOU V DB
      const attachmentsList = response.data?.data?.attachments || response.data?.attachments || response.prilohy || [];

      // 🔍 DEBUG: Kompletní výpis všech příloh

      const serverAttachments = attachmentsList.map(att => {
        // ⚠️ Kontrola existence fyzického souboru
        const fileExists = att.file_exists !== false;
        const hasError = att.error || att.file_error;

        // 🔍 Najít název typu přílohy z číselníku
        const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === att.typ_prilohy);

        // 🛡️ Oprávnění z backendu
        const permissions = att.permissions || {};
        const canEdit = permissions.can_edit !== false; // Default true pokud není definováno
        const canDelete = permissions.can_delete !== false; // Default true pokud není definováno
        const editReason = permissions.edit_reason || null;
        const deleteReason = permissions.delete_reason || null;

        // ✅ ZACHOVAT ČESKÉ NÁZVY 1:1 JAK JSOU V DB - NEPŘEJMENOVÁVAT!
        // + přidat aliasy pro zpětnou kompatibilitu
        return {
          id: att.id,
          serverId: att.id,
          originalni_nazev_souboru: att.originalni_nazev_souboru,
          velikost_souboru_b: att.velikost_souboru_b,
          typ_prilohy: att.typ_prilohy,
          systemova_cesta: att.systemova_cesta,
          dt_vytvoreni: att.dt_vytvoreni,
          nahrano_uzivatel_id: att.nahrano_uzivatel_id,
          nahrano_uzivatel_jmeno: att.nahrano_uzivatel?.jmeno,
          nahrano_uzivatel_prijmeni: att.nahrano_uzivatel?.prijmeni,
          je_isdoc: att.je_isdoc,
          faktura_typ_nazev: typPrilohy?.nazev || att.faktura_typ_nazev,
          type: (att.originalni_nazev_souboru || '').endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          status: fileExists ? 'uploaded' : 'error',
          file_exists: fileExists,
          error: hasError || (!fileExists ? 'Fyzický soubor chybí na disku' : null),
          // 🛡️ Oprávnění pro UI
          permissions: {
            can_edit: canEdit,
            can_delete: canDelete,
            edit_reason: editReason,
            delete_reason: deleteReason
          },
          // Aliasy pro zpětnou kompatibilitu s kódem který používá name/size/klasifikace
          name: att.originalni_nazev_souboru,
          size: att.velikost_souboru_b,
          klasifikace: att.typ_prilohy,
          uploadDate: att.dt_vytvoreni
        };
      });
      
      // ⚠️ OCHRANA: Nepřepisovat attachments pokud jsou v procesu uploadu
      const hasPendingUploads = attachments.some(a => 
        a.status === 'pending_upload' || a.status === 'uploading'
      );
      
      if (hasPendingUploads && serverAttachments.length === 0) {
        return; // Nepřepisovat lokální pending attachments
      }
      
      // ⚠️ OPRAVA INFINITE LOOP: Neaktualizovat attachments pokud se nezměnily
      // (prevence zbytečných re-renderů a loop)
      const areAttachmentsEqual = (a, b) => {
        if (a.length !== b.length) return false;
        return a.every((att, i) => att.id === b[i]?.id && att.status === b[i]?.status);
      };
      
      // Zatím neaktualizovat - počkat na verify
      let finalAttachments = serverAttachments;

      // 🔍 VERIFY - Zkontrolovat fyzickou existenci souborů na serveru
      // ✅ OPRAVA: Použít invoice_id místo faktura_id + objednavka_id
      const numFakturaId = fakturaId ? Number(fakturaId) : null;
      const isFakturaValid = numFakturaId && !isNaN(numFakturaId) && !String(fakturaId).startsWith('temp-');

      if (isFakturaValid) {
        try {
          const verifyResult = await verifyInvoiceAttachments25({
            token,
            username,
            invoice_id: numFakturaId,
            objednavka_id: objednavkaId
          });

          if (verifyResult && verifyResult.attachments) {
            // ✅ OPRAVA: Aktualizovat serverAttachments (ne prev!), pak zavolat updateAttachments
            finalAttachments = serverAttachments.map(att => {
              const verifiedAtt = verifyResult.attachments.find(v => v.attachment_id === att.serverId);
              if (verifiedAtt && !verifiedAtt.file_exists) {
                return {
                  ...att,
                  status: 'error',
                  error: `Fyzický soubor chybí na serveru (${verifiedAtt.status})`
                };
              }
              return att;
            });

            // Zobrazit summary pokud jsou nějaké chybějící soubory
            const summary = verifyResult.summary || {};
            if (summary.missing_files > 0) {
              showToast&&showToast(`⚠️ ${summary.missing_files} příloha(y) faktury nemají fyzický soubor na serveru`, { type: 'warning' });
            }
          }
        } catch (verifyErr) {
          console.error('❌ Chyba při verify attachments:', verifyErr);
          // Neblokovat načítání kvůli chybě verify
        }
      }

      // ✅ AKTUALIZOVAT POUZE POKUD SE ZMĚNILY (prevence loop)
      if (!areAttachmentsEqual(finalAttachments, externalAttachments || [])) {
        updateAttachments(finalAttachments);
      }

    } catch (err) {
      console.error('❌ Chyba při načítání příloh faktury:', err);
      setError(err.message || 'Chyba při načítání příloh');
    } finally {
      setLoading(false);
    }
  };

  // Validace souboru
  const validateFile = (file) => {
    if (!isAllowedInvoiceFileType(file.name)) {
      throw new Error('Nepodporovaný formát souboru');
    }

    if (!isAllowedInvoiceFileSize(file.size)) {
      throw new Error('Soubor je příliš velký (max 10 MB)');
    }
  };

  // Přidání souborů do attachments s pending_classification
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);

    //🆕 Najít ISDOC soubory a nabídnout parsing
    const isdocFiles = fileArray.filter(f => isISDOCFile(f.name));
    const nonIsdocFiles = fileArray.filter(f => !isISDOCFile(f.name));

    // ✅ NOVÁ LOGIKA: Validace běžných souborů (ne-ISDOC) při uploadu
    // Pro každý ne-ISDOC soubor zkontroluj validaci faktury
    if (nonIsdocFiles.length > 0 && !isPokladna) {
      // Zkontroluj validaci (bez file parametru = kontrola základních polí)
      const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true, missingFields: [] };
      
      if (!validation.isValid) {
        // ⚠️ ZAMÍTNOUT běžné soubory - chybí povinná pole
        const fields = validation?.missingFields || [];
        
        if (fields.length > 0) {
          // ✅ Strukturovaná chybová zpráva s detaily
          const errorMessage = (
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={20} color="#ff4d4f" style={{ flexShrink: 0 }} />
                <span>Pro nahrání přílohy vyplňte nejprve tato pole:</span>
              </div>
              <div style={{ 
                fontSize: '13px',
                color: '#666',
                marginTop: '6px',
                backgroundColor: '#fff1f0',
                padding: '10px',
                borderRadius: '4px'
              }}>
                {fields.map((field, idx) => (
                  <div key={idx} style={{ 
                    marginTop: idx > 0 ? '4px' : '0',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ marginRight: '6px', color: '#ff4d4f', fontWeight: 'bold' }}>•</span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>
            </div>
          );
          
          showToast && showToast(errorMessage, { type: 'error', timeout: 8000 });
        } else {
          showToast && showToast('Vyplňte povinná pole faktury', { type: 'error' });
        }
        return; // Ukončit upload
      }
    }

    // 🆕 Pokud je právě 1 ISDOC soubor a máme callback, nabídnout parsing
    if (isdocFiles.length === 1 && onISDOCParsed) {
      const isdocFile = isdocFiles[0];

      try {
        // Validace souboru
        validateFile(isdocFile);

        // Naparsovat ISDOC
        const isdocData = await parseISDOCFile(isdocFile);
        const summary = createISDOCSummary(isdocData);

        // Uložit pro pozdější použití
        setPendingISDOCFile({
          file: isdocFile,
          isdocData,
          otherFiles: nonIsdocFiles // Případné další soubory
        });
        setIsdocSummary(summary);
        setShowISDOCDialog(true);

        // Zpracování probíhá v dialogu
        return;

      } catch (parseError) {
        showToast&&showToast('Nepodařilo se naparsovat ISDOC soubor. Nahráno jako běžná příloha.', { type: 'error' });
        // Pokračovat jako běžný upload (spadne do kódu níže)
      }
    }

    // Běžný upload (všechny soubory nebo ISDOC po chybě parsingu)
    const newFiles = fileArray.map((file, index) => {
      try {
        validateFile(file);

        // 🆕 Automatická klasifikace podle typu souboru
        const jeISDOC = isISDOCFile(file.name);
        // ISDOC -> 'ISDOC', ostatní soubory (PDF, JPG, atd.) -> 'FAKTURA' (výchozí)
        const autoKlasifikace = jeISDOC ? 'ISDOC' : 'FAKTURA';
        
        // ✅ OPRAVA: Přidat náhodný suffix pro zajištění unikátnosti ID (prevence duplicitních klíčů)
        const uniqueId = `pending-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;

        return {
          id: uniqueId,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          klasifikace: autoKlasifikace, // ✅ Automatická klasifikace
          uploadDate: new Date().toISOString(),
          status: 'pending_upload', // ✅ Ready k uploadu s auto-klasifikací
          je_isdoc: jeISDOC ? 1 : 0,
          // ✅ Přidat user data z AuthContext pro správné zobrazení jména
          nahrano_uzivatel_id: userDetail?.uzivatel_id || userDetail?.user_id || userDetail?.id,
          nahrano_uzivatel_jmeno: userDetail?.jmeno,
          nahrano_uzivatel_prijmeni: userDetail?.prijmeni,
          // 📋 SPISOVKA METADATA pro automatický tracking (pokud existují)
          ...(file.spisovka_dokument_id && { spisovka_dokument_id: file.spisovka_dokument_id }),
          ...(file.spisovka_file_id && { spisovka_file_id: file.spisovka_file_id })
        };
      } catch (err) {
        showToast&&showToast(`${file.name}: ${err.message}`, { type: 'error' });
        return null;
      }
    }).filter(Boolean);

    if (newFiles.length > 0) {
      // 🎯 TRACKING: Pokud je příloha ze Spisovky, nastavit aktivní dokument do LS
      const firstFile = newFiles[0];
      if (firstFile?.spisovka_dokument_id) {
        localStorage.setItem('spisovka_active_dokument', firstFile.spisovka_dokument_id);
      }
      
      // ✅ NEJDŘÍV přidat soubory do UI
      updateAttachments(prev => {
        // ✅ PREVENCE DUPLICIT: Zkontrolovat že soubory s těmito ID ještě nejsou v attachments
        const existingIds = new Set(prev.map(a => a.id));
        const filteredNewFiles = newFiles.filter(f => !existingIds.has(f.id));
        
        if (filteredNewFiles.length === 0) {
          console.warn('⚠️ Všechny soubory už jsou v attachments - přeskakuji');
          return prev;
        }
        
        const updated = [...prev, ...filteredNewFiles];
        return updated;
      });

      // 🎬 ODLOŽENÝ UPLOAD - čeká na vykreslení React komponent
      // requestAnimationFrame zajistí, že upload se spustí až PO vykreslení
      requestAnimationFrame(() => {
        // Ještě jeden frame delay pro jistotu (jako u objednávek)
        requestAnimationFrame(async () => {
          // Sekvenční upload (jako u objednávek) - zabraňuje race conditions
          for (const file of newFiles) {
            try {
              await uploadFileToServer(file.id, file.klasifikace, file);
            } catch (err) {
              console.error(`❌ Chyba při uploadu souboru ${file.name}:`, err);
              // Error handler je již v uploadFileToServer - označí soubor jako 'error'
            }
          }
        });
      });
      
      // ✅ OKAMŽITÝ NÁVRAT - přílohy jsou viditelné hned
      // Upload probíhá na pozadí s progress barem
      // ⚠️ ŽÁDNÝ REFRESH z DB - mohlo by to resetovat formulář při ukládání faktury
    }
  };

  // Pomocné funkce pro UI styling příloh - STEJNÉ JAKO U OBJEDNÁVEK
  const getFileBorderColor = (file) => {
    if (!file) return '#e5e7eb'; // Default pro undefined
    // ✅ PRIORITY: Status PŘED klasifikací
    if (file.status === 'uploading') return '#f59e0b';    // Oranžová - probíhá upload
    if (file.status === 'uploaded') return '#10b981';     // Zelená - úspěšně nahráno
    if (file.status === 'error') return '#fca5a5';        // Světle červená - chyba
    if (file.status === 'pending_upload') return '#3b82f6'; // Modrá pro čekající
    // Až pak klasifikace
    if (!file.klasifikace) return '#fca5a5';              // Červená - chybí klasifikace
    return '#e5e7eb';
  };

  const getFileBackgroundColor = (file) => {
    if (!file) return 'white'; // Default pro undefined
    // ✅ PRIORITY: Status PŘED klasifikací
    if (file.status === 'uploading') return '#fffbeb';    // Světle oranžová - probíhá upload
    if (file.status === 'uploaded') return '#f0fdf4';     // Světle zelená - úspěšně nahráno
    if (file.status === 'error') return '#fef2f2';        // Světle červená - chyba
    if (file.status === 'pending_upload') return '#eff6ff'; // Světle modrá pro čekající
    // Až pak klasifikace
    if (!file.klasifikace) return '#fef2f2';              // Červená - chybí klasifikace
    return 'white';
  };

  // Update klasifikace
  const updateFileKlasifikace = async (fileId, klasifikace) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    // ⚠️ Pokud je příloha ve stavu 'uploading', označit jako 'error' a umožnit změnu
    if (file.status === 'uploading') {
      updateAttachments(prev => prev.map(f =>
        f.id === fileId ? { 
          ...f, 
          status: 'error',
          error: 'Upload zrušen uživatelem',
          klasifikace 
        } : f
      ));
      showToast&&showToast('Upload byl zrušen. Můžete změnit klasifikaci a zkusit znovu.', { type: 'info' });
      return;
    }

    // Update lokálně
    updateAttachments(prev => prev.map(f =>
      f.id === fileId ? { ...f, klasifikace } : f
    ));

    // 🔧 Pokud má klasifikaci a čeká na upload -> automaticky upload
    // (pending_classification i pending_upload)
    if (klasifikace && klasifikace.trim() !== '' && (file.status === 'pending_classification' || file.status === 'pending_upload')) {
      // Triggering auto-upload for pending file
      // Upload s aktualizovanou klasifikací - PŘEDAT file objekt
      await uploadFileToServer(fileId, klasifikace, file);
    }
    // Pokud je již nahraná na serveru -> update přes API
    else if (klasifikace && klasifikace.trim() !== '' && file.status === 'uploaded' && file.serverId) {
      try {
        // ⚠️ Pokud je klasifikace stejná jako původní, přeskoč update
        if (file.klasifikace === klasifikace) {
          // Klasifikace se nezměnila, skip update
          return;
        }

        await updateInvoiceAttachment25({
          token: token,
          username: username,
          faktura_id: fakturaId,
          priloha_id: file.serverId,
          objednavka_id: objednavkaId,
          typ_prilohy: klasifikace,
          type: klasifikace  // ✅ Pošli OBA parametry pro jistotu (type má přednost)
        });

        // Najdi název typu přílohy pro zobrazení
        const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === klasifikace);

        // Update lokálně s názvem
        updateAttachments(prev => prev.map(f =>
          f.id === fileId ? {
            ...f,
            klasifikace,
            faktura_typ_nazev: typPrilohy?.nazev || klasifikace
          } : f
        ));

        showToast&&showToast('Klasifikace byla aktualizována', { type: 'success' });

      } catch (err) {
        showToast&&showToast(`Chyba při aktualizaci: ${err.message}`, { type: 'error' });

        // Vrátit zpět původní klasifikaci
        updateAttachments(prev => prev.map(f =>
          f.id === fileId ? { ...f, klasifikace: file.klasifikace } : f
        ));
      }
    }
  };

  // Upload na server
  const uploadFileToServer = async (fileId, klasifikaceOverride = null, fileObj = null) => {
    // ✅ KONTROLA DUPLIKACE: Pokud se soubor už uploaduje nebo byl uploadnutý, přeskoč
    if (uploadingFilesRef.current.has(fileId)) {
      console.warn(`⏭️ uploadFileToServer: Soubor ${fileId} se již uploaduje - přeskakuji`);
      return;
    }
    if (uploadedFilesRef.current.has(fileId)) {
      console.warn(`⏭️ uploadFileToServer: Soubor ${fileId} už byl uploadnutý - přeskakuji`);
      return;
    }
    
    // 🔒 Označit jako uploadující se HNED na začátku
    uploadingFilesRef.current.add(fileId);
    
    // ✅ DŮLEŽITÉ: Vždy použít fileObj (již obsahuje všechna data včetně File objektu)
    // attachments state může být zastaralý kvůli async aktualizacím
    const file = fileObj;
    if (!file || !file.file) {
      console.error('❌ uploadFileToServer: Chybí file nebo file.file', { fileId, fileObj });
      return;
    }

    const klasifikace = klasifikaceOverride || file.klasifikace;

    if (!klasifikace || klasifikace.trim() === '') {
      showToast&&showToast('Vyberte typ přílohy', { type: 'error' });
      return;
    }

    // 🆕 Pokud má faktura temp-ID, NEJDŘÍV vytvořit fakturu v DB
    const isTempFaktura = String(fakturaId).startsWith('temp-');
    
    // uploadFileToServer
    
    if (isTempFaktura) {
      // Validace povinných polí faktury před vytvořením v DB
      if (!isPokladna) {
        const validation = validateInvoiceForAttachments?.(faktura, file.file);
        
        // Validace faktury
        
        // 🆕 Pro ISDOC povolit upload i bez validních polí
        if (!validation?.isValid && !validation?.isISDOC) {
          const fields = validation?.missingFields || [];
          if (fields.length > 0) {
            // ✅ Strukturovaná chybová zpráva s detaily
            const errorMessage = (
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '12px', 
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={20} color="#ff4d4f" style={{ flexShrink: 0 }} />
                  <span>Pro nahrání přílohy vyplňte nejprve tato pole:</span>
                </div>
                <div style={{ 
                  fontSize: '13px',
                  color: '#666',
                  marginTop: '6px',
                  backgroundColor: '#fff1f0',
                  padding: '10px',
                  borderRadius: '4px'
                }}>
                  {fields.map((field, idx) => (
                    <div key={idx} style={{ 
                      marginTop: idx > 0 ? '4px' : '0',
                      display: 'flex',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ marginRight: '6px', color: '#ff4d4f', fontWeight: 'bold' }}>•</span>
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
            showToast&&showToast(errorMessage, { type: 'error', timeout: 8000 });
          } else {
            showToast&&showToast('Vyplňte povinná pole faktury', { type: 'error' });
          }
          return;
        }
        
        // Info pro ISDOC s chybějícími poli
        if (validation?.isISDOC && validation?.missingFields?.length > 0) {
          showToast&&showToast(
            '📄 ISDOC soubor - data faktury budou extrahována po nahrání',
            { type: 'info' }
          );
        }
      }

      // Označ jako "uploading" - vytváříme fakturu v DB
      updateAttachments(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'uploading',
          klasifikace
        } : f
      ));

      // 🔄 Proměnné pro rollback (musí být mimo try/catch)
      let realFakturaId = null;
      let attachmentId = null;

      try {
        // 🎯 CALLBACK: Vytvoř fakturu v DB a získej reálné ID
        if (!onCreateInvoiceInDB) {
          throw new Error('Chybí callback pro vytvoření faktury v DB');
        }

        // Volám onCreateInvoiceInDB callback
        // ❌ ODSTRANĚNO: Toast "Vytvářím fakturu..." - způsoboval spam
        
        realFakturaId = await onCreateInvoiceInDB(fakturaId);
        
        // Faktura vytvořena
        
        if (!realFakturaId || String(realFakturaId).startsWith('temp-')) {
          throw new Error('Nepodařilo se získat reálné ID faktury');
        }

        // ❌ ODSTRANĚNO: Toast "Faktura vytvořena..." - uživatel vidí jen finální úspěch

        // Najdi název typu přílohy pro zobrazení
        const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === klasifikace);

        // Teď nahrajeme přílohu s reálným ID faktury
        const response = await uploadInvoiceAttachment25({
          token: token,
          username: username,
          faktura_id: realFakturaId, // ✅ Reálné ID
          objednavka_id: objednavkaId,
          typ_prilohy: klasifikace,
          file: file.file
        });
        
        // ✅ KRITICKÁ VALIDACE: Zkontrolovat že upload byl skutečně úspěšný
        if (!response || response.status === 'error' || response.error) {
          throw new Error(response?.message || response?.error || 'Chyba při nahrávání souboru na server');
        }

        // Získej ID přílohy z různých možných struktur
        attachmentId = response.priloha?.id || 
                      response.priloha_id || 
                      response.data?.priloha?.id || 
                      response.data?.id || 
                      response.id;
        
        // ⚠️ KRITICKÁ VALIDACE: ID přílohy MUSÍ existovat
        if (!attachmentId) {
          console.error('❌ Backend nevrátil ID přílohy:', response);
          throw new Error('Server nevrátil ID přílohy - soubor se možná nenahral');
        }
        
        // ✅ VALIDACE: Zkontrolovat že soubor byl fyzicky nahrán (pokud backend vrací file_exists)
        if (response.priloha?.file_exists === false || response.data?.file_exists === false) {
          console.error('❌ Soubor nebyl fyzicky nahrán na server:', response);
          throw new Error('Soubor se nepodařilo nahrát na server - zkontrolujte oprávnění adresáře');
        }

        // Získej údaje o uživateli z response, nebo použij aktuálního uživatele
        const nahrano_uzivatel_id = response.priloha?.nahrano_uzivatel_id || 
                                    response.priloha?.nahrano_uzivatel?.id ||
                                    userDetail?.uzivatel_id || 
                                    userDetail?.user_id || 
                                    userDetail?.id;
        const nahrano_uzivatel_jmeno = response.priloha?.nahrano_uzivatel?.jmeno || userDetail?.jmeno;
        const nahrano_uzivatel_prijmeni = response.priloha?.nahrano_uzivatel?.prijmeni || userDetail?.prijmeni;

        // Attachment ID (temp upload)

        // Update s server ID a progress 100%
        updateAttachments(prev => {
          const updated = prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'uploaded',
              progress: 100, // ✅ DŮLEŽITÉ: Nastavit progress na 100%
              serverId: attachmentId,
              faktura_id: realFakturaId, // ✅ Aktualizovat faktura_id na reálné ID
              klasifikace: klasifikace, // ✅ Uložit klasifikaci pro pozdější porovnání
              faktura_typ_nazev: typPrilohy?.nazev || klasifikace,
              nahrano_uzivatel_id: nahrano_uzivatel_id,
              nahrano_uzivatel_jmeno: nahrano_uzivatel_jmeno,
              nahrano_uzivatel_prijmeni: nahrano_uzivatel_prijmeni,
              file: undefined, // Odstraň File object
              // 📋 Zachovat Spisovka metadata (pokud existují)
              ...(f.spisovka_dokument_id && { spisovka_dokument_id: f.spisovka_dokument_id }),
              ...(f.spisovka_file_id && { spisovka_file_id: f.spisovka_file_id })
            } : f
          );
          
          // ✅ Zavolat onAttachmentsChange pro propagaci změn do OrderForm25
          if (onAttachmentsChange) {
            onAttachmentsChange(updated);
          }
          
          return updated;
        });

        // ✅ Příloha úspěšně nahrána - JEDINÝ toast pro temp fakturu
        const successMessage = (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
            <div style={{ 
              fontSize: '15px', 
              fontWeight: '600', 
              marginBottom: '8px', 
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
              <span>Příloha úspěšně nahrána</span>
            </div>
            <div style={{ 
              padding: '8px',
              backgroundColor: '#f0fdf4',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#166534'
            }}>
              {file.file.name}
            </div>
          </div>
        );
        showToast&&showToast(successMessage, { type: 'success' });

        // ⚠️ NEREFRESHOVAT hned - způsobuje to zmizení přílohy z UI
        // Místo toho spoléháme na updateAttachments výše (řádek 930)
        // Refresh se provede automaticky při příštím načtení faktury

        // 💾 Zavolat callback pro autosave s uploadnutou přílohou
        if (onAttachmentUploaded) {
          const uploadedAttachment = {
            id: attachmentId,
            faktura_id: realFakturaId,
            typ_prilohy: klasifikace,
            typ_prilohy_nazev: typPrilohy?.nazev || klasifikace,
            nazev_souboru: file.file.name,
            velikost: file.file.size,
            status: 'uploaded',
            datum_vytvoreni: new Date().toISOString()
          };
          onAttachmentUploaded(realFakturaId, uploadedAttachment);
        }

        // ✅ CLEANUP: Přesunout z uploading do uploaded
        uploadingFilesRef.current.delete(fileId);
        uploadedFilesRef.current.add(fileId);

        return;

      } catch (err) {
        console.group('❌ CHYBA při uploadu s temp ID');
        console.error('Error object:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        }
        console.groupEnd();
        
        // 🔄 ROLLBACK: Pokud byl vytvořen záznam v DB ale soubor se nenahral,
        // měli bychom se pokusit smazat neplatný záznam
        if (attachmentId && err.message?.includes('nenahral')) {
          console.warn('⚠️ Pokus o rollback - mazání neplatného záznamu přílohy:', attachmentId);
          try {
            await deleteInvoiceAttachment25({
              token: token,
              username: username,
              faktura_id: realFakturaId,
              priloha_id: attachmentId,
              objednavka_id: objednavkaId,
              hard_delete: 1
            });
          } catch (rollbackErr) {
            console.error('❌ Rollback selhal:', rollbackErr);
            // Informovat uživatele o problému
            showToast&&showToast(
              '⚠️ Upozornění: Vytvořil se záznam v databázi, ale soubor se nenahral. Kontaktujte administrátora.',
              { type: 'warning' }
            );
          }
        }
        
        // Status -> error
        updateAttachments(prev => prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            status: 'error',
            error: err.message || 'Chyba při nahrávání'
          } : f
        ));

        // ❌ CLEANUP: Odebrat z uploading při chybě
        uploadingFilesRef.current.delete(fileId);

        // Lepší error zpráva s názvem souboru
        const fileName = fileObj?.name || 'soubor';
        let errorMsg = err.message || 'Nepodařilo se nahrát přílohu';
        
        // Zkontrolovat, jestli jde o nepodporovaný typ souboru
        if (errorMsg.includes('Nepodporovaný typ souboru') || errorMsg.includes('Povolené typy')) {
          showToast&&showToast(
            `❌ Soubor "${fileName}" nelze nahrát\n\n${errorMsg}`,
            { type: 'error' }
          );
        } else {
          showToast&&showToast(
            `❌ Chyba při nahrávání "${fileName}": ${errorMsg}`,
            { type: 'error' }
          );
        }
        return;
      }
    }

    // Status -> uploading s progress barem (simulace 0%)
    updateAttachments(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
    ));
    
    // 🎬 SIMULACE PROGRESS BARU (150ms intervaly pro plynulost)
    const progressInterval = setInterval(() => {
      updateAttachments(prev => prev.map(f => {
        if (f.id === fileId && f.status === 'uploading') {
          const currentProgress = f.progress || 0;
          const newProgress = Math.min(currentProgress + Math.random() * 20, 95);
          return { ...f, progress: newProgress };
        }
        return f;
      }));
    }, 150);
    
    // 🔄 Proměnná pro rollback (musí být mimo try/catch)
    let attachmentId = null;
    
    try {
      const response = await uploadInvoiceAttachment25({
        token: token,
        username: username,
        faktura_id: fakturaId,
        objednavka_id: objednavkaId,
        typ_prilohy: klasifikace, // Použij klasifikaci z parametru
        file: file.file
      });
      
      // Upload response
      
      // ✅ KRITICKÁ VALIDACE: Zkontrolovat že upload byl skutečně úspěšný
      if (!response || response.status === 'error' || response.error) {
        throw new Error(response?.message || response?.error || 'Chyba při nahrávání souboru na server');
      }
      
      // Najdi název typu přílohy pro zobrazení
      const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === klasifikace);
      
      // Získej ID přílohy z různých možných struktur
      attachmentId = response.priloha?.id || 
                    response.priloha_id || 
                    response.data?.priloha?.id || 
                    response.data?.id || 
                    response.id;
      
      // ⚠️ KRITICKÁ VALIDACE: ID přílohy MUSÍ existovat
      if (!attachmentId) {
        console.error('❌ Backend nevrátil ID přílohy:', response);
        throw new Error('Server nevrátil ID přílohy - soubor se možná nenahral');
      }
      
      // ✅ VALIDACE: Zkontrolovat že soubor byl fyzicky nahrán
      if (response.priloha?.file_exists === false || response.data?.file_exists === false) {
        console.error('❌ Soubor nebyl fyzicky nahrán na server:', response);
        throw new Error('Soubor se nepodařilo nahrát na server - zkontrolujte oprávnění adresáře');
      }

      // Získej údaje o uživateli z response, nebo použij aktuálního uživatele
      const nahrano_uzivatel_id = response.priloha?.nahrano_uzivatel_id || 
                                  response.priloha?.nahrano_uzivatel?.id ||
                                  userDetail?.uzivatel_id || 
                                  userDetail?.user_id || 
                                  userDetail?.id;
      const nahrano_uzivatel_jmeno = response.priloha?.nahrano_uzivatel?.jmeno || userDetail?.jmeno;
      const nahrano_uzivatel_prijmeni = response.priloha?.nahrano_uzivatel?.prijmeni || userDetail?.prijmeni;

      // Attachment ID
      
      // 🛑 ZASTAVIT PROGRESS BAR
      clearInterval(progressInterval);

      // Update s server ID a 100% progress
      updateAttachments(prev => {
        const updated = prev.map(f =>
          f.id === fileId ? {
            ...f,
            status: 'uploaded',
            progress: 100,
            serverId: attachmentId,
            klasifikace: klasifikace, // ✅ Uložit klasifikaci
            faktura_typ_nazev: typPrilohy?.nazev || klasifikace, // Název pro zobrazení
            nahrano_uzivatel_id: nahrano_uzivatel_id,
            nahrano_uzivatel_jmeno: nahrano_uzivatel_jmeno,
            nahrano_uzivatel_prijmeni: nahrano_uzivatel_prijmeni,
            file: undefined, // Odstraň File object
            // 📋 Zachovat Spisovka metadata (pokud existují)
            ...(f.spisovka_dokument_id && { spisovka_dokument_id: f.spisovka_dokument_id }),
            ...(f.spisovka_file_id && { spisovka_file_id: f.spisovka_file_id })
          } : f
        );
        return updated;
      });

      // ✅ JEDINÝ success toast pro existující fakturu
      const successMessage = (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: '600', 
            marginBottom: '8px', 
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
            <span>Příloha úspěšně nahrána</span>
          </div>
          <div style={{ 
            padding: '8px',
            backgroundColor: '#f0fdf4',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#166534'
          }}>
            {file.file.name}
          </div>
        </div>
      );
      showToast&&showToast(successMessage, { type: 'success' });

      // ⚠️ NEREFRESHOVAT hned - způsobuje to zmizení přílohy z UI
      // Místo toho spoléháme na updateAttachments výše
      // Refresh se provede automaticky při příštím načtení faktury

      // 💾 Zavolat callback pro autosave s uploadnutou přílohou
      if (onAttachmentUploaded) {
        const uploadedAttachment = {
          id: attachmentId,
          faktura_id: fakturaId,
          typ_prilohy: klasifikace,
          typ_prilohy_nazev: typPrilohy?.nazev || klasifikace,
          nazev_souboru: file.file.name,
          velikost: file.file.size,
          status: 'uploaded',
          datum_vytvoreni: new Date().toISOString()
        };
        onAttachmentUploaded(fakturaId, uploadedAttachment);
      }

      // ✅ CLEANUP: Přesunout z uploading do uploaded
      uploadingFilesRef.current.delete(fileId);
      uploadedFilesRef.current.add(fileId);

    } catch (err) {
      console.group('❌ CHYBA při uploadu s existující fakturou');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.groupEnd();
      
      // 🛑 ZASTAVIT PROGRESS BAR
      clearInterval(progressInterval);
      
      // 🔄 ROLLBACK: Pokud byl vytvořen záznam v DB ale soubor se nenahral,
      // měli bychom se pokusit smazat neplatný záznam
      if (attachmentId && err.message?.includes('nenahral')) {
        console.warn('⚠️ Pokus o rollback - mazání neplatného záznamu přílohy:', attachmentId);
        try {
          await deleteInvoiceAttachment25({
            token: token,
            username: username,
            faktura_id: fakturaId,
            priloha_id: attachmentId,
            objednavka_id: objednavkaId,
            hard_delete: 1
          });
        } catch (rollbackErr) {
          console.error('❌ Rollback selhal:', rollbackErr);
          // Informovat uživatele o problému
          showToast&&showToast(
            '⚠️ Upozornění: Vytvořil se záznam v databázi, ale soubor se nenahral. Kontaktujte administrátora.',
            { type: 'warning', duration: 8000 }
          );
        }
      }
      
      // Status -> error (pending znovu)
      updateAttachments(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'pending_classification', progress: 0 } : f
      ));

      // ❌ CLEANUP: Odebrat z uploading při chybě
      uploadingFilesRef.current.delete(fileId);

      showToast&&showToast(
        err.message || 'Nepodařilo se nahrát přílohu', 
        { type: 'error' }
      );
    }
  };

  // Odstranění souboru (lokální před uploadem)
  const removeFile = (fileId) => {
    if (isInvoiceCompleted) {
      showToast&&showToast('Faktura je ve stavu DOKONCENA - přílohy nelze mazat', { type: 'warning' });
      return;
    }
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    // 🛡️ Zobrazit confirm dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Odstranit přílohu',
      message: `Opravdu chcete odstranit přílohu "${file.originalni_nazev_souboru || file.name}"?`,
      onConfirm: () => {
        // ✅ Odstranit z lokálního stavu
        updateAttachments(prev => prev.filter(f => f.id !== fileId));
        showToast&&showToast('✅ Příloha odstraněna', { type: 'success' });
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        
        // 📋 Notify parent o smazání (pro Spisovka tracking cleanup)
        if (onAttachmentRemoved) {
          onAttachmentRemoved(file);
        }
      }
    });
  };

  // Smazání ze serveru
  const deleteFromServer = async (fileId) => {
    if (isInvoiceCompleted) {
      showToast&&showToast('Faktura je ve stavu DOKONCENA - přílohy nelze mazat', { type: 'warning' });
      return;
    }
    const file = attachments.find(f => f.id === fileId);
    if (!file || !file.serverId) {
      // Nemá serverId → lokální odstranění
      removeFile(fileId);
      return;
    }

    // 🛡️ Zobrazit confirm dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Smazat přílohu',
      message: `Opravdu chcete smazat přílohu "${file.originalni_nazev_souboru || file.name}"?`,
      onConfirm: async () => {

        try {
          // ✅ HARD DELETE - fyzické smazání souboru z disku i DB
          const response = await deleteInvoiceAttachment25({
            token: token,
            username: username,
            faktura_id: fakturaId, // ✅ Order V2 API
            priloha_id: file.serverId,
            objednavka_id: objednavkaId, // ✅ Order V2 API - required
            hard_delete: 1 // 🔥 HARD DELETE - smaže soubor z disku
          });

          // DELETE Response

          // ✅ Kontrola response před aktualizací UI
          if (response && (response.status === 'ok' || response.status === 'success' || response.success === true)) {
            // Log informací o smazání
            if (response.data) {
              // ✅ Podle BE dokumentace: Pokud je status='ok', DB záznam JE smazán (vždy)
              // Zobraz success, ale upozorni na warning pokud něco bylo špatně se souborem
              if (response.warning) {
                // ⚠️ Warning = DB smazáno, ale problém se souborem na disku
                showToast&&showToast('⚠️ Příloha smazána (s varováním)', { type: 'warning' });
                console.warn('⚠️ Warning:', response.warning);
              } else {
                // ✅ Vše OK - DB i soubor smazány
                showToast&&showToast('🗑️ Příloha byla úspěšně smazána', { type: 'success' });
              }
            } else {
              // Stará struktura bez detailů
              showToast&&showToast('🗑️ Příloha byla úspěšně smazána', { type: 'success' });
            }

            // ✅ Zavřít dialog
            setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });

            // 🚀 OPTIMISTIC DELETE - okamžitě odstranit z UI bez bliknutí
            updateAttachments(prev => prev.filter(f => f.id !== fileId));

            // � Notify parent o smazání (pro Spisovka tracking cleanup)
            if (onAttachmentRemoved) {
              onAttachmentRemoved(file);
            }

            // ⚠️ POZOR: onAttachmentUploaded se NEvolá při DELETE (není to upload!)
            // Pro autosave po smazání použijte jiný callback nebo hook
          } else {
            throw new Error(response?.message || 'Neočekávaná odpověď serveru');
          }

        } catch (err) {
          // ⚠️ FALLBACK: Pokud soubor neexistuje (404) nebo jiná chyba, 
          // stejně odstranit z UI (možná už byl smazán nebo nikdy nebyl nahraný)
          if (err.message?.includes('404') || err.message?.includes('Endpoint nenalezen') || err.message?.includes('Not Found')) {
            // Odstranit z lokálního stavu
            updateAttachments(prev => prev.filter(f => f.id !== fileId));
            
            showToast&&showToast('⚠️ Příloha byla odstraněna z UI (soubor nebyl nalezen na serveru)', { type: 'warning' });
            
            // Notify parent o smazání
            if (onAttachmentRemoved) {
              onAttachmentRemoved(file);
            }
          } else {
            // Jiná chyba - zobrazit error
            showToast&&showToast(`Nepodařilo se smazat přílohu: ${err.message}`, { type: 'error' });
          }
          
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Download / Preview v plovoucím okně
  const handleDownload = async (fileId) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file || !file.serverId) return;

    try {
      const blobData = await downloadInvoiceAttachment25({
        token: token,
        username: username,
        faktura_id: fakturaId,
        priloha_id: file.serverId,
        objednavka_id: objednavkaId
      });

      const filename = file.originalni_nazev_souboru || file.name || 'priloha.pdf';
      const ext = filename.toLowerCase().split('.').pop();

      // Určit MIME type podle přípony
      let mimeType = 'application/octet-stream';
      if (ext === 'pdf') {
        mimeType = 'application/pdf';
      } else if (['jpg', 'jpeg'].includes(ext)) {
        mimeType = 'image/jpeg';
      } else if (ext === 'png') {
        mimeType = 'image/png';
      } else if (ext === 'gif') {
        mimeType = 'image/gif';
      } else if (ext === 'bmp') {
        mimeType = 'image/bmp';
      } else if (ext === 'webp') {
        mimeType = 'image/webp';
      } else if (ext === 'svg') {
        mimeType = 'image/svg+xml';
      }

      // Vytvořit nový Blob se správným MIME typem
      const blob = new Blob([blobData], { type: mimeType });

      // Pro PDF zobrazit v plovoucím okně
      if (ext === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
        // ✅ Preferovat sdílený AttachmentViewer (má toolbar pro obrázky)
        if (typeof onOpenViewerAttachment === 'function') {
          onOpenViewerAttachment({
            filename: filename,
            fileType: ext === 'pdf' ? 'pdf' : 'image',
            blob: blob,
            mimeType: mimeType
          });
          return;
        }

        // Fallback: původní plovoucí okno
        const url = window.URL.createObjectURL(blob);
        setFileViewer({
          visible: true,
          url: url,
          filename: filename,
          type: ext === 'pdf' ? 'pdf' : 'image'
        });
        return;
      }

      // Pro ostatní soubory přímo stáhnout
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast&&showToast('Soubor stážen', { type: 'success' });

    } catch (err) {
      showToast&&showToast(`Chyba: ${err.message}`, { type: 'error' });
    }
  };

  // 🆕 OCR EXTRAKCE Z PDF
  const handleOCRExtraction = async (fileId) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    // Kontrola, zda je soubor PDF
    const isPDF = file.name?.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPDF) {
      showToast&&showToast('OCR funguje pouze pro PDF soubory', { type: 'error' });
      return;
    }

    // Získáme file object - buď z nahraného souboru nebo stáhneme ze serveru
    let fileBlob = file.file;
    
    if (!fileBlob && file.serverId) {
      // Pokud je soubor již nahrán na serveru, musíme ho stáhnout
      try {
        fileBlob = await downloadInvoiceAttachment25({
          token: token,
          username: username,
          faktura_id: fakturaId,
          priloha_id: file.serverId,
          objednavka_id: objednavkaId
        });
      } catch (err) {
        showToast&&showToast('Nepodařilo se stáhnout PDF pro OCR: ' + err.message, { type: 'error' });
        return;
      }
    }

    if (!fileBlob) {
      showToast&&showToast('Soubor není k dispozici pro OCR', { type: 'error' });
      return;
    }

    // Vytvoříme File object, pokud máme jen Blob
    const fileObject = fileBlob instanceof File 
      ? fileBlob 
      : new File([fileBlob], file.name, { type: 'application/pdf' });

    // Zobrazíme progress toast
    let currentToastId = null;
    
    const updateProgress = (progress, message) => {
      const progressContent = (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#8b5cf6" style={{ flexShrink: 0 }} />
            <span>OCR extrakce z PDF</span>
          </div>
          <div style={{ padding: '8px', backgroundColor: '#f5f3ff', borderRadius: '4px', fontSize: '13px', color: '#6d28d9' }}>
            <div style={{ marginBottom: '4px' }}>{message}</div>
            <div style={{ height: '4px', backgroundColor: '#e9d5ff', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progress}%`, 
                backgroundColor: '#8b5cf6', 
                transition: 'width 0.3s ease' 
              }} />
            </div>
          </div>
        </div>
      );

      if (currentToastId) {
        // Update existing toast - musíme najít a aktualizovat v ToastContext
        // Pro jednoduchost vytvoříme nový toast
        showToast&&showToast(progressContent, { type: 'info', duration: 999999 });
      } else {
        currentToastId = showToast&&showToast(progressContent, { type: 'info', duration: 999999 });
      }
    };

    try {
      // Spustíme OCR extrakci
      const extractedText = await extractTextFromPDF(fileObject, updateProgress);
      
      // Vytěžíme data faktury z textu
      const extractedData = extractInvoiceData(extractedText);


      // Zavřeme progress toast
      if (currentToastId) {
        // ToastContext by měl mít metodu na zavření konkrétního toastu
        // Pro teď jen necháme vymizet automaticky
      }

      // Zobrazit varování, pokud dokument není faktura
      if (extractedData.warning) {
        const warningContent = (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span>Varování - Není faktura</span>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#fffbeb', borderRadius: '4px', fontSize: '13px', color: '#92400e' }}>
              {extractedData.warning}
            </div>
          </div>
        );
        showToast&&showToast(warningContent, { type: 'warning', duration: 8000 });
      }

      // Zkontrolujeme, co se podařilo vytěžit
      const foundFields = [];
      if (extractedData.variabilniSymbol) foundFields.push('Variabilní symbol');
      if (extractedData.datumVystaveni) foundFields.push('Datum vystavení');
      if (extractedData.datumSplatnosti) foundFields.push('Datum splatnosti');
      if (extractedData.castka) foundFields.push('Částka');

      if (foundFields.length === 0) {
        showToast&&showToast('❌ Nepodařilo se vytěžit žádná data z PDF', { type: 'error' });
        return;
      }

      // Zobrazíme nalezené údaje
      const successContent = (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
            <span>OCR extrakce úspěšná</span>
          </div>
          <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '4px', fontSize: '13px', color: '#166534' }}>
            <div style={{ marginBottom: '4px', fontWeight: '500' }}>Nalezené údaje:</div>
            {extractedData.variabilniSymbol && (
              <div>• Variabilní symbol: {extractedData.variabilniSymbol}</div>
            )}
            {extractedData.datumVystaveni && (
              <div>• Datum vystavení: {extractedData.datumVystaveni}</div>
            )}
            {extractedData.datumSplatnosti && (
              <div>• Datum splatnosti: {extractedData.datumSplatnosti}</div>
            )}
            {extractedData.castka && (
              <div>• Částka vč. DPH: {extractedData.castka.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč</div>
            )}
          </div>
        </div>
      );

      showToast&&showToast(successContent, { type: 'success', duration: 10000 });

      // 🎯 CALLBACK: Předat vytěžená data zpět do formuláře
      if (onOCRDataExtracted) {
        onOCRDataExtracted(extractedData);
      }

    } catch (err) {
      console.error('❌ OCR Error:', err);
      
      const errorContent = (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>Chyba při OCR extrakci</span>
          </div>
          <div style={{ padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', fontSize: '13px', color: '#991b1b' }}>
            {err.message}
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              💡 Můžete vyplnit údaje manuálně z náhledu PDF
            </div>
          </div>
        </div>
      );
      
      showToast&&showToast(errorContent, { type: 'error', duration: 8000 });
    }
  };

  // 🆕 Validace faktury pro přidání příloh - VYPOČÍTAT PŘED HANDLERS
  // ✅ FIX: Použít specifické properties jako dependencies místo celého objektu
  const invoiceValidation = useMemo(() => {
    if (isPokladna) {
      return { isValid: true, missingFields: [] };
    }
    if (!faktura) {
      return { isValid: false, missingFields: ['Faktura'] };
    }
    if (!validateInvoiceForAttachments) {
      return { isValid: true, missingFields: [] };
    }
    return validateInvoiceForAttachments(faktura);
  }, [
    // ✅ Specifické properties místo celého objektu - React detekuje změny hodnot
    faktura?.fa_typ,
    faktura?.fa_typ_faktury,
    faktura?.fa_cislo_vema,
    faktura?.fa_castka,
    faktura?.fa_datum_doruceni,
    faktura?.fa_datum_vystaveni,
    faktura?.fa_splatnost,
    validateInvoiceForAttachments,
    isPokladna
  ]);

  // ✅ NOVÁ LOGIKA: Dropzona je VŽDY aktivní (validace probíhá při uploadu)
  // Disabled pouze když: uploading, loading, readOnly NEBO faktura je DOKONCENA
  const isDropzoneDisabled = uploading || loading || readOnly || isInvoiceCompleted;

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDropzoneDisabled) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    if (isDropzoneDisabled) return;

    // 🔔 PRIORITA 1a: Kontrola drag & drop VŠECH příloh faktury ze spisovky
    const spisovkaAttachmentsJson = e.dataTransfer.getData('text/spisovka-attachments');
    
    if (spisovkaAttachmentsJson) {
      try {
        const attachments = JSON.parse(spisovkaAttachmentsJson);
        
        if (!Array.isArray(attachments) || attachments.length === 0) {
          showToast && showToast('❌ Žádné přílohy k nahrání', { type: 'error' });
          return;
        }

        // ✅ VALIDACE PŘED STAŽENÍM (jen pro ne-ISDOC soubory)
        const hasISDOC = attachments.some(a => isISDOCFile(a.filename));
        
        if (!hasISDOC && !isPokladna) {
          const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true, missingFields: [] };
          
          if (!validation.isValid) {
            const fields = validation?.missingFields || [];
            
            if (fields.length > 0) {
              // ✅ Strukturovaná chybová zpráva s detaily
              const errorMessage = (
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px', 
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={20} color="#ff4d4f" style={{ flexShrink: 0 }} />
                    <span>Pro nahrání příloh ze spisovky vyplňte nejprve tato pole:</span>
                  </div>
                  <div style={{ 
                    fontSize: '13px',
                    color: '#666',
                    marginTop: '6px',
                    backgroundColor: '#fff1f0',
                    padding: '10px',
                    borderRadius: '4px'
                  }}>
                    {fields.map((field, idx) => (
                      <div key={idx} style={{ 
                        marginTop: idx > 0 ? '4px' : '0',
                        display: 'flex',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ marginRight: '6px', color: '#ff4d4f', fontWeight: 'bold' }}>•</span>
                        <span>{field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
              showToast && showToast(errorMessage, { type: 'error', timeout: 8000 });
            } else {
              showToast && showToast('Vyplňte povinná pole faktury', { type: 'error' });
            }
            return;
          }
        }

        // Stáhnout všechny soubory paralelně
        const downloadPromises = attachments.map(async (attachment) => {
          const proxyUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/proxy-file?url=${encodeURIComponent(attachment.url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Chyba při stahování ${attachment.filename}`);
          
          const originalFilename = response.headers.get('X-Original-Filename');
          const finalFilename = originalFilename || attachment.filename;
          
          const blob = await response.blob();
          return new File([blob], finalFilename, { type: attachment.mime_type || blob.type });
        });

        const files = await Promise.all(downloadPromises);
        
        // Zpracovat všechny soubory najednou
        await handleFileUpload(files);
        
        // Zelený success toast po nahrání
        const successMessage = (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
            <div style={{ 
              fontSize: '15px', 
              fontWeight: '600', 
              marginBottom: '8px', 
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
              <span>Přílohy úspěšně nahrány</span>
            </div>
            <div style={{ 
              padding: '8px',
              backgroundColor: '#f0fdf4',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#166534'
            }}>
              Nahráno {files.length} {files.length === 1 ? 'příloha' : files.length < 5 ? 'přílohy' : 'příloh'} ze spisovky
            </div>
          </div>
        );
        showToast && showToast(successMessage, { type: 'success' });
      } catch (error) {
        console.error('❌ Chyba při stahování příloh ze spisovky:', error);
        
        // Lepší error zpráva - extrahovat název souboru z chybové zprávy
        let errorMsg = error.message;
        if (errorMsg.includes('Chyba při stahování')) {
          showToast && showToast(`❌ ${errorMsg}`, { type: 'error' });
        } else {
          showToast && showToast(`❌ Chyba při zpracování příloh: ${errorMsg}`, { type: 'error' });
        }
      }
      return;
    }

    // 🔔 PRIORITA 1b: Kontrola drag & drop jedné přílohy ze spisovky (CORS proxy)
    const spisovkaFileUrl = e.dataTransfer.getData('text/spisovka-file-url');
    const spisovkaFileName = e.dataTransfer.getData('text/spisovka-file-name');
    const spisovkaFileMime = e.dataTransfer.getData('text/spisovka-file-mime');
    const spisovkaFileId = e.dataTransfer.getData('text/spisovka-file-id'); // 🆕 ID přílohy
    const spisovkaDokumentId = e.dataTransfer.getData('text/spisovka-dokument-id'); // 🆕 ID dokumentu
    
    if (spisovkaFileUrl && spisovkaFileName) {
      // ✅ VALIDACE PŘED STAŽENÍM (pro běžné soubory)
      const isISDOC = isISDOCFile(spisovkaFileName);
      
      if (!isISDOC && !isPokladna) {
        // Zkontroluj validaci faktury před stažením
        const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true, categories: {} };
        
        if (!validation.isValid) {
          // ⚠️ ZAMÍTNOUT - chybí povinná pole
          const errorMessage = (
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5' }}>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={20} color="#ff4d4f" style={{ flexShrink: 0 }} />
                <span>Pro uložení je nutné vyplnit následující položky:</span>
              </div>
              {validation.categories && Object.values(validation.categories).map((cat, idx) => 
                cat.errors.length > 0 && (
                  <div key={idx} style={{ 
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: '#fff1f0',
                    borderRadius: '4px'
                  }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '13px',
                      color: '#d32f2f',
                      marginBottom: '6px'
                    }}>
                      {cat.label}
                    </div>
                    {cat.errors.map((err, errIdx) => (
                      <div key={errIdx} style={{ 
                        fontSize: '12px',
                        color: '#666',
                        marginLeft: '8px',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ marginRight: '6px', color: '#ff4d4f', fontWeight: 'bold' }}>•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
          showToast && showToast(errorMessage, { type: 'error' });
          return; // Ukončit upload
        }
      }

      // Stažení souboru ze spisovky přes proxy a vytvoření File objektu
      try {
        // Použít proxy endpoint pro stažení (řešení CORS)
        const proxyUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/proxy-file?url=${encodeURIComponent(spisovkaFileUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Chyba při stahování souboru');
        
        // ✅ Získat původní název souboru z HTTP hlavičky (pokud je k dispozici)
        const originalFilename = response.headers.get('X-Original-Filename');
        const finalFilename = originalFilename || spisovkaFileName;
        
        const blob = await response.blob();
        const file = new File([blob], finalFilename, { type: spisovkaFileMime || blob.type });
        
        // 🆕 Přidat Spisovka metadata jako custom properties pro tracking
        if (spisovkaFileId) {
          file.spisovka_file_id = parseInt(spisovkaFileId);
        }
        if (spisovkaDokumentId) {
          file.spisovka_dokument_id = parseInt(spisovkaDokumentId);
        }
        
        // Zpracovat jako běžný soubor
        await handleFileUpload([file]);
        
        // ✅ Toast se zobrazí automaticky v handleFileUpload -> uploadAttachment
      } catch (error) {
        console.error('❌ Chyba při stahování souboru ze spisovky:', error);
        showToast && showToast('❌ Chyba při stahování souboru ze spisovky', { type: 'error' });
      }
      return;
    }
    
    // PRIORITA 2: Standardní drag & drop z filesystému
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await handleFileUpload(files);
  };

  // File input handler
  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await handleFileUpload(files);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Click handler
  const handleDropZoneClick = () => {
    if (!isDropzoneDisabled) {
      fileInputRef.current?.click();
    }
  };

  // 🆕 ISDOC Dialog Handlers - NOVÝ ATOMICKÝ WORKFLOW
  const handleISDOCConfirm = async (useVariableSymbol = true) => {
    if (!pendingISDOCFile) return;
    try {
      const { file, isdocData, otherFiles } = pendingISDOCFile;

      // 1. Namapovat ISDOC data na fakturu
      if (!formData) {
        throw new Error('Chybí data formuláře objednávky');
      }

      // 🎯 Předat useVariableSymbol do mapování
      const mappedData = mapISDOCToFaktura(isdocData, formData, useVariableSymbol);

      // ✅ KONTROLA: Má už faktura reálné ID?
      const hasRealId = fakturaId && !String(fakturaId).startsWith('temp-');

      let response;

      if (hasRealId) {
        // 🔄 FAKTURA UŽ EXISTUJE → POUZE NAHRÁT PŘÍLOHU

        const uploadResponse = await uploadInvoiceAttachment25({
          token: token,
          username: username,
          faktura_id: fakturaId,
          objednavka_id: objednavkaId,
          typ_prilohy: 'FAKTURA',
          file: file
        });

        response = {
          faktura_id: fakturaId, // Použít existující ID
          priloha_id: uploadResponse.priloha_id,
          priloha: uploadResponse.priloha
        };
      } else {
        // 🆕 NOVÁ FAKTURA → ATOMICKY VYTVOŘIT FAKTURU + PŘÍLOHU

        response = await createInvoiceWithAttachment25({
          token: token,
          username: username,
          objednavka_id: objednavkaId,
          // Faktura metadata z ISDOC
          fa_castka: mappedData.fa_castka,
          fa_cislo_vema: mappedData.fa_cislo_vema,
          fa_datum_vystaveni: mappedData.fa_datum_vystaveni,
          fa_datum_splatnosti: mappedData.fa_datum_splatnosti,
          fa_datum_doruceni: mappedData.fa_datum_doruceni,
          fa_strediska_kod: mappedData.fa_strediska_kod,
          fa_poznamka: mappedData.fa_poznamka,
          fa_dorucena: 1,
          // Příloha
          file: file,
          typ_prilohy: 'FAKTURA'
        });

      }

      // 3. Aktualizovat UI s REÁLNÝMI ID z BE
      if (onISDOCParsed) {
        // ✅ KRITICKÉ: Předat VŽDY mappedData, ať už faktura byla nová nebo existující
        // Callback v OrderForm25 UPDATNE fakturu novými daty z ISDOC
        const dataToPass = {
          ...mappedData,
          id: response.faktura_id, // ✅ REÁLNÉ ID faktury z BE
          _realId: response.faktura_id,
          _updateExisting: hasRealId // Flag pro OrderForm25 - má se UPDATOVAT existující faktura
        };
        onISDOCParsed(dataToPass, response.faktura_id);
      }

      // 4. Přidat přílohu do lokálního stavu (už s reálným ID)
      const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === 'FAKTURA');

      const serverAttachment = {
        id: response.priloha_id, // REÁLNÉ ID z BE
        serverId: response.priloha_id,
        faktura_id: response.faktura_id,
        objednavka_id: objednavkaId,
        name: file.name,
        size: file.size,
        type: file.type,
        klasifikace: 'FAKTURA',
        faktura_typ_nazev: typPrilohy?.nazev || 'FAKTURA',
        uploadDate: response.priloha?.dt_vytvoreni || new Date().toISOString(),
        status: 'uploaded',
        je_isdoc: 1,
        guid: response.priloha?.guid,
        nahrano_uzivatel_id: response.priloha?.nahrano_uzivatel_id || response.priloha?.nahrano_uzivatel?.id,
        nahrano_uzivatel_jmeno: response.priloha?.nahrano_uzivatel?.jmeno,
        nahrano_uzivatel_prijmeni: response.priloha?.nahrano_uzivatel?.prijmeni
      };

      updateAttachments(prev => [...prev, serverAttachment]);

      // 5. Zpracovat ostatní soubory (pokud byly nahrány společně)
      if (otherFiles && otherFiles.length > 0) {
        await handleFileUpload(otherFiles);
      }

      // 6. Zavřít dialog
      setShowISDOCDialog(false);
      setPendingISDOCFile(null);
      setIsdocSummary(null);

      showToast&&showToast('Faktura včetně ISDOC přílohy byla úspěšně vytvořena', { type: 'success' });

      // 💾 Zavolat callback pro refresh
      if (onAttachmentUploaded) {
        onAttachmentUploaded();
      }

    } catch (err) {
      showToast&&showToast(err.message || 'Chyba při vytváření faktury s přílohou', { type: 'error' });
    }
  };

  const handleISDOCUploadWithoutParsing = async () => {
    if (!pendingISDOCFile) return;

    try {
      const { file, otherFiles } = pendingISDOCFile;

      // Přidat ISDOC soubor bez parsingu - klasifikace ISDOC
      const isdocAttachment = {
        id: `pending-${Date.now()}`,
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        klasifikace: 'ISDOC', // ✅ ISDOC typ pro ISDOC soubory
        uploadDate: new Date().toISOString(),
        status: 'pending_upload',
        je_isdoc: 1,
        // ✅ Přidat user data z AuthContext
        nahrano_uzivatel_id: userDetail?.uzivatel_id || userDetail?.user_id || userDetail?.id,
        nahrano_uzivatel_jmeno: userDetail?.jmeno,
        nahrano_uzivatel_prijmeni: userDetail?.prijmeni
      };

      updateAttachments(prev => [...prev, isdocAttachment]);
      await uploadFileToServer(isdocAttachment.id, 'ISDOC'); // ✅ Upload s ISDOC typem

      // Zpracovat ostatní soubory
      if (otherFiles && otherFiles.length > 0) {
        await handleFileUpload(otherFiles);
      }

      // Zavřít dialog
      setShowISDOCDialog(false);
      setPendingISDOCFile(null);
      setIsdocSummary(null);

      showToast&&showToast('ISDOC soubor byl nahrán bez extrakce dat', { type: 'success' });

    } catch (err) {
      showToast&&showToast(err.message || 'Chyba při nahrávání ISDOC', { type: 'error' });
    }
  };

  const handleISDOCCancel = () => {
    setShowISDOCDialog(false);
    setPendingISDOCFile(null);
    setIsdocSummary(null);
    showToast&&showToast('Nahrání ISDOC zrušeno', { type: 'info' });
  };

  return (
    <>
    <Wrapper>
      <Header>
        <Title>
          <Paperclip />
          Přílohy faktury
          {attachments.length > 0 && <Badge>{attachments.length}</Badge>}
        </Title>
      </Header>

      {/* Hidden file input */}
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept=".pdf,.isdoc,.jpg,.jpeg,.png,.xml"
        multiple
        onChange={handleFileSelect}
        disabled={isDropzoneDisabled}
      />

      {/* 🆕 Validační hlášení - zobrazit když nejsou vyplněny povinné položky */}
      {!invoiceValidation.isValid && !readOnly && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <Info size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: '500',
              color: '#92400e',
              marginBottom: '0.25rem'
            }}>
              Vyplňte povinné položky faktury
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#78350f'
            }}>
              Pro přidání příloh je nutné vyplnit tato pole: {invoiceValidation.missingFields?.join(', ') || 'povinná pole'}.
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop zóna */}
      {!readOnly && (
        <DropZone
          onClick={handleDropZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragging={dragging}
          disabled={isDropzoneDisabled}
        >
          <DropZoneIcon isDragging={dragging}>
            {dragging ? '⬇️' : '📎'}
          </DropZoneIcon>
          <DropZoneText>
            <DropZoneTitle>
              {faktura?.stav === 'DOKONCENA'
                ? '🔒 Faktura je dokončena - nelze přidávat přílohy'
                : uploading
                  ? 'Nahrávám...'
                  : dragging
                    ? 'Pusťte soubor'
                    : 'Přetáhněte PDF, ISDOC, JPG, PNG, DOC, DOCX, XLS, XLSX nebo XML (max 10 MB)'}
            </DropZoneTitle>
            <DropZoneSubtitle>
              {faktura?.stav === 'DOKONCENA'
                ? 'Pro přidání příloh je nutné fakturu vrátit do stavu NOVA nebo ROZPRACOVANA'
                : 'Kliknutím otevřete dialog • Po přidání vyberte typ přílohy'}
            </DropZoneSubtitle>
          </DropZoneText>
        </DropZone>
      )}

      {error && (
        <ErrorMessage>
          <AlertCircle />
          {error}
        </ErrorMessage>
      )}

      {loading && (
        <LoadingState>
          <Loader />
          Načítám přílohy...
        </LoadingState>
      )}

      {/* Empty state - když nejsou žádné přílohy */}
      {!loading && attachments.length === 0 && (
        <EmptyState>
          <Paperclip />
          Žádné přílohy nejsou
        </EmptyState>
      )}

      {/* Attachments list - PŘESNĚ JAKO OBJEDNÁVKY */}
      {!loading && attachments.length > 0 && (
        <AttachmentsList>
          {attachments.filter(file => file && file.id).map((file) => (
            <div key={file.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              border: `1px solid ${getFileBorderColor(file)}`,
              borderRadius: '6px',
              backgroundColor: getFileBackgroundColor(file),
              marginBottom: '0.5rem',
              opacity: file.status === 'uploading' ? 0.6 : 1,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Ikona s indikátorem stavu - 32x44px aby se vešly 2 řádky textu */}
              <div style={{
                width: '32px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative'
              }}>
                {file.file_exists === false ? (
                  <FileX
                    size={24}
                    style={{
                      color: '#dc2626'
                    }}
                  />
                ) : (
                  <FileText
                    size={24}
                    style={{
                      color: file.status === 'uploaded' ? '#10b981' : '#dc2626'
                    }}
                  />
                )}
                {file.status === 'uploaded' && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%'
                  }} />
                )}
                {file.status === 'uploading' && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#f59e0b',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
              </div>

              {/* 🎬 PROGRESS BAR pro uploading status - musí být před obsahem */}
              {file.status === 'uploading' && file.progress !== undefined && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '0 0 6px 6px',
                  overflow: 'hidden',
                  zIndex: 10
                }}>
                  <div style={{
                    height: '100%',
                    width: `${file.progress}%`,
                    backgroundColor: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 100%)',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 100%)',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)'
                  }} />
                </div>
              )}
              
              {/* Informace o souboru - 2 řádky */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* ŘÁDEK 1: Název + velikost + akce (stažení + koš) */}
                <div style={{
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  color: '#374151',
                  marginBottom: '2px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {/* Název souboru s hvězdičkou */}
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      position: 'relative'
                    }}>
                      {file.name}
                      {/* Červená hvězdička jako horní index */}
                      {!file.klasifikace && (
                        <span style={{
                          color: '#dc2626',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          position: 'absolute',
                          top: '-2px',
                          marginLeft: '2px'
                        }}>
                          *
                        </span>
                      )}
                    </span>

                    {/* Warning pro soubory, které neexistují na disku */}
                    {file.file_exists === false && (
                      <span style={{
                        color: '#dc2626',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        backgroundColor: '#fee2e2',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        flexShrink: 0
                      }}>
                        ⚠ SOUBOR NENALEZEN
                      </span>
                    )}

                    {/* Velikost souboru */}
                    <span style={{
                      color: '#6b7280',
                      fontWeight: 'normal',
                      fontSize: '0.75rem',
                      flexShrink: 0
                    }}>
                      ({Math.round((file.velikost_souboru_b || file.size || 0) / 1024)} kB)
                    </span>

                    {/* Náhled v novém okně */}
                    {file.status === 'uploaded' && file.serverId && (
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                        title="Náhled / otevřít"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}

                    {/* Koš - zobrazit pouze pokud má uživatel oprávnění k této konkrétní příloze */}
                    {canEditAttachment(file) && (
                      <button
                        type="button"
                        onClick={() => {
                          // ⚠️ Pokud má serverId → smazat ze serveru, jinak lokální odstranění
                          if (file.serverId) {
                            deleteFromServer(file.id);
                          } else {
                            removeFile(file.id);
                          }
                        }}
                        disabled={false}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 1,
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                        title={file.serverId ? "Smazat ze serveru" : "Smazat soubor"}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    
                    {/* Informace o oprávnění - zobrazit důvod pro read-only přílohy */}
                    {!canEditAttachment(file) && file.serverId && (
                      <span style={{
                        color: '#6b7280',
                        fontSize: '0.6875rem',
                        backgroundColor: '#f3f4f6',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        flexShrink: 0
                      }}
                      title={
                        faktura?.stav === 'DOKONCENA'
                          ? "Faktura je ve stavu DOKONCENA - nelze upravovat přílohy"
                          : userDetail?.roles?.some(role => 
                              role.kod_role === 'SUPERADMIN' || 
                              role.kod_role === 'ADMINISTRATOR' || 
                              role.kod_role === 'UCETNI'
                            ) 
                              ? "Uzamčeno" 
                              : (file.nahrano_uzivatel_id && file.nahrano_uzivatel_id !== (userDetail?.uzivatel_id || userDetail?.user_id || userDetail?.id))
                                ? "Přílohu nahrál jiný uživatel - můžete pouze prohlížet"
                                : "Přílohy může mazat pouze autor, administrátor nebo účetní"
                      }
                      >
                        🔒
                      </span>
                    )}
                  </div>
                </div>

                {/* ŘÁDEK 2: Datum + typ souboru + uživatel */}
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>
                    {file.uploadDate && !isNaN(new Date(file.uploadDate).getTime())
                      ? `${new Date(file.uploadDate).toLocaleDateString('cs-CZ')} ${new Date(file.uploadDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`
                      : '—'
                    }
                  </span>
                  <span>•</span>
                  <span style={{
                    textTransform: 'uppercase',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: '500'
                  }}>
                    {file.name ? (file.name.endsWith('.pdf') ? 'PDF' : file.name.split('.').pop().toUpperCase()) : 'FILE'}
                  </span>
                  <span>•</span>
                  <span style={{
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: '500'
                  }}>
                    Nahráno: {getUserDisplayName(file.nahrano_uzivatel_id, file.nahrano_uzivatel_jmeno, file.nahrano_uzivatel_prijmeni)}
                  </span>
                  {file.faktura_typ_nazev && (
                    <>
                      <span>•</span>
                      <span style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: '500'
                      }}>
                        {file.faktura_typ_nazev}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Dropdown pro klasifikaci - PŘESNĚ JAKO OBJEDNÁVKY */}
              <div style={{ minWidth: '180px', flexShrink: 0 }}>
                <select
                  value={file.klasifikace || ''}
                  onChange={(e) => updateFileKlasifikace(file.id, e.target.value)}
                  disabled={readOnly}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: `1px solid ${!file.klasifikace ? '#fca5a5' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: readOnly ? '#f3f4f6' : 'white',
                    color: file.klasifikace ? '#111827' : '#6b7280',
                    cursor: readOnly ? 'not-allowed' : 'pointer',
                    opacity: readOnly ? 0.6 : 1
                  }}
                  title={readOnly ? 'Přílohy jsou uzamčeny po uložení objednávky' : ''}
                >
                  <option value="" style={{ color: '#6b7280', fontWeight: '400' }}>Vyberte...</option>
                  {fakturaTypyPrilohOptions.map(typ => (
                    <option key={typ.kod} value={typ.kod} style={{ fontWeight: '600', color: '#111827' }}>
                      {typ.nazev}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </AttachmentsList>
      )}
    </Wrapper>

    {/* 🆕 ISDOC Parsing Dialog */}
    {showISDOCDialog && isdocSummary && ReactDOM.createPortal(
      <ISDOCParsingDialog
        isdocSummary={isdocSummary}
        isdocData={pendingISDOCFile?.isdocData}
        onConfirm={handleISDOCConfirm}
        onCancel={handleISDOCCancel}
        onUploadWithoutParsing={handleISDOCUploadWithoutParsing}
      />,
      document.body
    )}

    {/* 🛡️ Confirm Dialog pro mazání příloh */}
    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      title={confirmDialog.title}
      confirmText="Smazat"
      variant="danger"
      onConfirm={confirmDialog.onConfirm}
      onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
    >
      {confirmDialog.message}
    </ConfirmDialog>

    {/* 👁️ File Viewer Modal (plovoucí okno jako ve Spisovce) */}
    {fileViewer.visible && ReactDOM.createPortal(
      <FileModal 
        x={fileViewerPosition.x}
        y={fileViewerPosition.y}
        w={fileViewerPosition.w}
        h={fileViewerPosition.h}
      >
        <FileModalContent>
          <FileModalHeader
            onMouseDown={(e) => {
              // Uložit offset myši vůči levému hornímu rohu okna
              const rect = e.currentTarget.parentElement.parentElement.getBoundingClientRect();
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
              setIsDraggingViewer(true);
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ cursor: isDraggingViewer ? 'grabbing' : 'grab' }}
          >
            <FileModalTitle>
              <FileText size={20} />
              {fileViewer.filename}
            </FileModalTitle>
            <FileCloseButton onClick={() => {
              if (fileViewer.url) {
                window.URL.revokeObjectURL(fileViewer.url);
              }
              setFileViewer({ visible: false, url: '', filename: '', type: '' });
            }}>
              <X size={18} />
            </FileCloseButton>
          </FileModalHeader>
          <FileObject 
            data={fileViewer.url}
            type={fileViewer.type === 'pdf' ? 'application/pdf' : undefined}
            title={fileViewer.filename}
          >
            <PdfFallback>
              <AlertCircle size={48} color="#64748b" />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Soubor nelze zobrazit v prohlížeči</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', maxWidth: '400px' }}>
                Váš prohlížeč nepodporuje zobrazení tohoto typu souborů. Můžete soubor stáhnout a otevřít externě.
              </div>
              <DownloadButton href={fileViewer.url} download={fileViewer.filename}>
                <Download size={18} />
                Stáhnout soubor
              </DownloadButton>
            </PdfFallback>
          </FileObject>
        </FileModalContent>
      </FileModal>,
      document.body
    )}
    </>
  );
};

export default InvoiceAttachmentsCompact;
