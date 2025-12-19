import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { Paperclip, Upload, Download, Trash2, AlertCircle, Loader, FileText, FileX, X, Info, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
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
`;

const Title = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: #3b82f6;
  }
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
  readOnly = false,
  onISDOCParsed, // 🆕 Callback pro vyplnění faktury z ISDOC
  formData, // 🆕 Pro mapování středisek z objednávky
  faktura, // 🆕 Objekt faktury pro validaci povinných položek
  validateInvoiceForAttachments, // 🆕 Validační funkce pro fakturu
  isPokladna = false, // 🆕 Je to pokladní doklad? (bez validace povinných položek)
  onAttachmentUploaded, // 🆕 Callback po úspěšném uploadu jakékoliv přílohy (včetně ISDOC)
  attachments: externalAttachments = [], // 🆕 Attachments z formData.faktury[].attachments (controlled)
  onAttachmentsChange, // 🆕 Callback pro aktualizaci attachments (controlled component pattern)
  onCreateInvoiceInDB, // 🆕 Callback pro vytvoření faktury v DB (temp → real ID)
  onOCRDataExtracted // 🆕 Callback pro předání OCR vytěžených dat
}) => {
  const { username, token } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext); // ✅ OPRAVENO: showToast místo addToast

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = React.useRef(null);

  // 🆕 ISDOC parsing state
  const [showISDOCDialog, setShowISDOCDialog] = useState(false);
  const [pendingISDOCFile, setPendingISDOCFile] = useState(null);
  const [isdocSummary, setIsdocSummary] = useState(null);

  // 🆕 Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // 🔄 Použít external attachments jako zdroj pravdy (controlled component)
  const attachments = externalAttachments;

  // 🔧 Helper funkce pro aktualizaci attachments (volá onAttachmentsChange callback)
  const updateAttachments = useCallback((updater) => {
    if (!onAttachmentsChange) {
      return;
    }

    // Pokud je updater funkce, zavolej ji s aktuálními attachments
    const newAttachments = typeof updater === 'function' ? updater(attachments) : updater;

    onAttachmentsChange(newAttachments);
  }, [attachments, onAttachmentsChange]);

  // Načtení příloh při mount nebo změně faktura_id
  useEffect(() => {

    if (fakturaId && !String(fakturaId).startsWith('temp-')) {
      loadAttachmentsFromServer();
    } else {
      // NEnulovat attachments - přílohy se vytvoří až po uploadu
    }
  }, [fakturaId]);

  // 🆕 AUTO-UPLOAD pending příloh když se ID změní z temp na reálné
  const prevFakturaIdRef = React.useRef(fakturaId);

  useEffect(() => {
    const uploadPendingAttachments = async () => {
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
      // Najdi všechny přílohy se statusem 'pending_upload' nebo 'pending'
      const pendingAttachments = attachments.filter(att => 
        (att.status === 'pending' || att.status === 'pending_upload') && att.file
      );

      if (pendingAttachments.length === 0) {
        prevFakturaIdRef.current = currentId;
        return;
      }
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
          
          // Update status -> uploaded
          updateAttachments(prev => prev.map(a =>
            a.id === attachment.id ? {
              ...a,
              status: 'uploaded',
              serverId: attachmentId,
              file: undefined // Odstraň File object
            } : a
          ));

          showToast&&showToast(`✅ Příloha "${attachment.name}" byla úspěšně nahrána`, { type: 'success' });

        } catch (uploadError) {

          // Update status -> error
          updateAttachments(prev => prev.map(a =>
            a.id === attachment.id ? { ...a, status: 'error', error: uploadError.message } : a
          ));

          showToast&&showToast(`Nepodařilo se nahrát přílohu "${attachment.name}"`, { type: 'error' });
        }
      }

      // Zavolat callback pro autosave
      if (onAttachmentUploaded) {
        onAttachmentUploaded();
      }

      // Uložit aktuální ID pro příští porovnání
      prevFakturaIdRef.current = currentId;
    };

    uploadPendingAttachments();
  }, [fakturaId, attachments]); // Sleduj fakturaId i attachments

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

      // ✅ NOVÁ V2 STRUKTURA: response.data.attachments (místo response.prilohy)
      const attachmentsList = response.data?.attachments || response.prilohy || [];

      // 🔍 DEBUG: Kompletní výpis všech příloh

      const serverAttachments = attachmentsList.map(att => {
        // ⚠️ Kontrola existence fyzického souboru
        const fileExists = att.file_exists !== false; // Backend by měl vrátit file_exists: false pokud soubor chybí
        const hasError = att.error || att.file_error;

        return {
          id: att.id,
          serverId: att.id,
          name: att.original_name || att.originalni_nazev_souboru,
          size: att.file_size || att.velikost_souboru_b,
          type: (att.original_name || att.originalni_nazev_souboru || '').endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          klasifikace: att.type || att.typ_prilohy || 'FILE', // ✅ Fallback na 'FILE' pokud chybí
          faktura_typ_nazev: att.faktura_typ_nazev,
          uploadDate: att.upload_date || att.dt_vytvoreni || new Date().toISOString(), // ✅ Fallback na aktuální čas
          status: fileExists ? 'uploaded' : 'error', // ⚠️ Označit poškozené přílohy
          je_isdoc: att.je_isdoc,
          error: hasError || (!fileExists ? 'Fyzický soubor chybí na disku' : null) // ⚠️ Chybová zpráva
        };
      });
      updateAttachments(serverAttachments);

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
            const verifiedAttachments = serverAttachments.map(att => {
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

            // Pouze pokud se něco změnilo, aktualizuj
            if (verifiedAttachments.some((att, i) => att.status !== serverAttachments[i].status)) {
              updateAttachments(verifiedAttachments);
            }

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
      } else {
        // VERIFY ATTACHMENTS přeskočeno - neplatné ID faktury
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
      const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true };
      
      if (!validation.isValid) {
        // ⚠️ ZAMÍTNOUT běžné soubory - chybí povinná pole
        // ✅ Strukturovaná chybová zpráva (PŘESNĚ jako OrderForm25)
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
            {Object.values(validation.categories).map((cat, idx) => 
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

        return {
          id: `pending-${Date.now()}-${index}`,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          klasifikace: autoKlasifikace, // ✅ Automatická klasifikace
          uploadDate: new Date().toISOString(),
          status: 'pending_upload', // ✅ Ready k uploadu s auto-klasifikací
          je_isdoc: jeISDOC ? 1 : 0
        };
      } catch (err) {
        showToast&&showToast(`${file.name}: ${err.message}`, { type: 'error' });
        return null;
      }
    }).filter(Boolean);

    if (newFiles.length > 0) {
      updateAttachments(prev => [...prev, ...newFiles]);

      // New files added

      // 🆕 Automatický upload všech souborů (mají již klasifikaci)
      // 🚫 Toast "Nahrávám..." odstraněn - zbytečné info, uživatel vidí progress

      // 🆕 Pro temp faktury pouze uložit lokálně, pro reálné faktury uploadnout
      const isTempFaktura = String(fakturaId).startsWith('temp-');
      
      // Auto-uploading files
      
      // ⚠️ State update je async, musíme počkat na další render
      // Místo toho používáme newFiles přímo
      if (!isTempFaktura) {
        // Starting upload for non-temp faktura
        for (const file of newFiles) {
          await uploadFileToServer(file.id, file.klasifikace, file);
        }
      } else {
        // Starting upload for temp faktura
        // Pro temp faktury zavolat uploadFileToServer (který je uloží lokálně s pending_upload)
        for (const file of newFiles) {
          await uploadFileToServer(file.id, file.klasifikace, file);
        }
      }
    }
  };

  // Pomocné funkce pro UI styling příloh - STEJNÉ JAKO U OBJEDNÁVEK
  const getFileBorderColor = (file) => {
    if (!file) return '#e5e7eb'; // Default pro undefined
    if (file.status === 'error') return '#fca5a5';
    if (!file.klasifikace) return '#fca5a5';
    if (file.status === 'uploading') return '#f59e0b';
    if (file.status === 'uploaded') return '#10b981';
    if (file.status === 'pending_upload') return '#3b82f6'; // Modrá pro čekající
    return '#e5e7eb';
  };

  const getFileBackgroundColor = (file) => {
    if (!file) return 'white'; // Default pro undefined
    if (file.status === 'error') return '#fef2f2';
    if (!file.klasifikace) return '#fef2f2';
    if (file.status === 'uploading') return '#fffbeb';
    if (file.status === 'uploaded') return '#f0fdf4';
    if (file.status === 'pending_upload') return '#eff6ff'; // Světle modrá pro čekající
    return 'white';
  };

  // Update klasifikace
  const updateFileKlasifikace = async (fileId, klasifikace) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    // Update lokálně
    updateAttachments(prev => prev.map(f =>
      f.id === fileId ? { ...f, klasifikace } : f
    ));

    // 🔧 Pokud má klasifikaci a čeká na upload -> automaticky upload
    // (pending_classification i pending_upload)
    if (klasifikace && klasifikace.trim() !== '' && (file.status === 'pending_classification' || file.status === 'pending_upload')) {
      // Triggering auto-upload for pending file
      // Upload s aktualizovanou klasifikací
      await uploadFileToServer(fileId, klasifikace);
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
    // Použij předaný fileObj nebo hledej v attachments state
    const file = fileObj || attachments.find(f => f.id === fileId);
    if (!file || !file.file) {
      // File not found or no file object
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
          showToast&&showToast(
            `Pro nahrání této přílohy vyplňte nejprve: ${validation?.missingFields?.join(', ') || 'povinná pole'}`,
            { type: 'error' }
          );
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

      try {
        // 🎯 CALLBACK: Vytvoř fakturu v DB a získej reálné ID
        if (!onCreateInvoiceInDB) {
          throw new Error('Chybí callback pro vytvoření faktury v DB');
        }

        // Volám onCreateInvoiceInDB callback
        // ❌ ODSTRANĚNO: Toast "Vytvářím fakturu..." - způsoboval spam
        
        const realFakturaId = await onCreateInvoiceInDB(fakturaId);
        
        // Faktura vytvořena
        
        if (!realFakturaId || String(realFakturaId).startsWith('temp-')) {
          throw new Error('Nepodařilo se získat reálné ID faktury');
        }

        // ❌ ODSTRANĚNO: Toast "Faktura vytvořena..." - uživatel vidí jen finální úspěch

        // Najdi název typu přílohy pro zobrazení
        const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === klasifikace);

        // 🔍 DEBUG: Payload před uploadem přílohy
        const attachmentPayload = {
          token: token,
          username: username,
          faktura_id: realFakturaId,
          objednavka_id: objednavkaId,
          typ_prilohy: klasifikace,
          file: {
            name: file.file.name,
            size: file.file.size,
            type: file.file.type
          }
        };
        console.group('🔍 DEBUG: Upload přílohy faktury');
        // REQUEST Payload

        // Teď nahrajeme přílohu s reálným ID faktury
        const response = await uploadInvoiceAttachment25({
          token: token,
          username: username,
          faktura_id: realFakturaId, // ✅ Reálné ID
          objednavka_id: objednavkaId,
          typ_prilohy: klasifikace,
          file: file.file
        });

        // 🔍 DEBUG: Response z backendu
        // RESPONSE
        console.groupEnd();

        // Získej ID přílohy z různých možných struktur
        const attachmentId = response.priloha?.id || 
                            response.priloha_id || 
                            response.data?.priloha?.id || 
                            response.data?.id || 
                            response.id;

        // Attachment ID (temp upload)

        // Update s server ID
        updateAttachments(prev => prev.map(f =>
          f.id === fileId ? {
            ...f,
            status: 'uploaded',
            serverId: attachmentId,
            klasifikace: klasifikace, // ✅ Uložit klasifikaci pro pozdější porovnání
            faktura_typ_nazev: typPrilohy?.nazev || klasifikace,
            file: undefined // Odstraň File object
          } : f
        ));

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

        // � Refresh attachments ze serveru pro synchronizaci
        await loadAttachmentsFromServer();

        // �💾 Zavolat callback pro autosave s uploadnutou přílohou
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
        
        // Status -> error
        updateAttachments(prev => prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            status: 'error',
            error: err.message || 'Chyba při nahrávání'
          } : f
        ));

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

    // Status -> uploading
    updateAttachments(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'uploading' } : f
    ));
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
      
      // Najdi název typu přílohy pro zobrazení
      const typPrilohy = fakturaTypyPrilohOptions.find(t => t.kod === klasifikace);

      // Získej ID přílohy z různých možných struktur
      const attachmentId = response.priloha?.id || 
                          response.priloha_id || 
                          response.data?.priloha?.id || 
                          response.data?.id || 
                          response.id;

      // Attachment ID

      // Update s server ID
      updateAttachments(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'uploaded',
          serverId: attachmentId,
          klasifikace: klasifikace, // ✅ Uložit klasifikaci
          faktura_typ_nazev: typPrilohy?.nazev || klasifikace, // Název pro zobrazení
          file: undefined // Odstraň File object
        } : f
      ));

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

      // � Refresh attachments ze serveru pro synchronizaci
      await loadAttachmentsFromServer();

      // �💾 Zavolat callback pro autosave s uploadnutou přílohou
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

    } catch (err) {

      // Status -> error (pending znovu)
      updateAttachments(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'pending_classification' } : f
      ));

      showToast&&showToast('Nepodařilo se nahrát přílohu', { type: 'error' });
    }
  };

  // Odstranění souboru (lokální před uploadem)
  const removeFile = (fileId) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    // 🛡️ Zobrazit confirm dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Odstranit přílohu',
      message: `Opravdu chcete odstranit přílohu "${file.name}"?`,
      onConfirm: () => {
        // ✅ Odstranit z lokálního stavu
        updateAttachments(prev => prev.filter(f => f.id !== fileId));
        showToast&&showToast('✅ Příloha odstraněna', { type: 'success' });
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // Smazání ze serveru
  const deleteFromServer = async (fileId) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file || !file.serverId) {
      return;
    }

    // 🛡️ Zobrazit confirm dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Smazat přílohu',
      message: `Opravdu chcete smazat přílohu "${file.name}"?`,
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

            // 🔄 RELOAD příloh ze serveru (synchronizace)
            await loadAttachmentsFromServer();

            // 💾 Zavolat callback pro autosave (pokud existuje)
            if (onAttachmentUploaded) {
              onAttachmentUploaded();
            }
          } else {
            throw new Error(response?.message || 'Neočekávaná odpověď serveru');
          }

        } catch (err) {
          console.error('❌ DELETE Error:', err);
          console.error('Error message:', err.message);
          console.error('Error response:', err.response?.data);
          showToast&&showToast(`Nepodařilo se smazat přílohu: ${err.message}`, { type: 'error' });
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Download
  const handleDownload = async (fileId) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file || !file.serverId) return;

    try {
      const blob = await downloadInvoiceAttachment25({
        token: token,
        username: username,
        faktura_id: fakturaId, // ✅ Order V2 API
        priloha_id: file.serverId,
        objednavka_id: objednavkaId // ✅ Order V2 API - required
      });

      const filename = file.name || 'priloha.pdf';

      // Importovat utility funkce
      const { isPreviewableInBrowser, openInBrowser25 } = await import('../../services/api25orders');

      // Zkontrolovat, zda lze soubor zobrazit v prohlížeči
      if (isPreviewableInBrowser(filename)) {
        const opened = openInBrowser25(blob, filename);
        
        if (opened) {
          // ✅ Soubor otevřen v novém okně - neptat se na stažení
          showToast&&showToast('Příloha otevřena v novém okně', { type: 'success' });
          return;
        }
      }

      // Pokud nelze zobrazit v prohlížeči, přímo stáhnout
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
      
      console.log('📄 OCR Extracted Data:', extractedData);

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
  const invoiceValidation = useMemo(() => {
    if (isPokladna) {
      // Pokladní doklad nemá povinné položky
      return { isValid: true, missingFields: [] };
    }
    if (!faktura) {
      // Pokud není faktura předána, nelze validovat
      return { isValid: false, missingFields: ['Faktura'] };
    }
    if (!validateInvoiceForAttachments) {
      // Pokud není validační funkce, předpokládáme že je validní (fallback)
      return { isValid: true, missingFields: [] };
    }
    return validateInvoiceForAttachments(faktura);
  }, [faktura, validateInvoiceForAttachments, isPokladna]);

  // ✅ NOVÁ LOGIKA: Dropzona je VŽDY aktivní (validace probíhá při uploadu)
  // Disabled pouze když: uploading, loading nebo readOnly
  const isDropzoneDisabled = uploading || loading || readOnly;

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
          const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true };
          
          if (!validation.isValid) {
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
                {Object.values(validation.categories).map((cat, idx) => 
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
    
    if (spisovkaFileUrl && spisovkaFileName) {
      // ✅ VALIDACE PŘED STAŽENÍM (pro běžné soubory)
      const isISDOC = isISDOCFile(spisovkaFileName);
      
      if (!isISDOC && !isPokladna) {
        // Zkontroluj validaci faktury před stažením
        const validation = validateInvoiceForAttachments ? validateInvoiceForAttachments(faktura) : { isValid: true };
        
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
              {Object.values(validation.categories).map((cat, idx) => 
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
        guid: response.priloha?.guid
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
        je_isdoc: 1
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
              Pro přidání příloh je nutné vyplnit: {invoiceValidation.missingFields?.join(', ') || 'povinná pole'}
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
              {uploading
                ? 'Nahrávám...'
                : dragging
                  ? 'Pusťte soubor'
                  : 'Přetáhněte PDF, ISDOC, JPG, PNG, DOC, DOCX, XLS, XLSX nebo XML (max 10 MB)'}
            </DropZoneTitle>
            <DropZoneSubtitle>
              Kliknutím otevřete dialog • Po přidání vyberte typ přílohy
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
              opacity: file.status === 'uploading' ? 0.6 : 1
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
                      ({Math.round((file.size || 0) / 1024)} kB)
                    </span>

                    {/* Stažení pro nahrané soubory */}
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
                        title="Stáhnout soubor"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {/* OCR Extrakce - pouze pro PDF */}
                    {(file.name?.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') && (
                      <button
                        type="button"
                        onClick={() => handleOCRExtraction(file.id)}
                        disabled={file.status === 'uploading'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: file.status === 'uploading' ? '#9ca3af' : '#8b5cf6',
                          cursor: file.status === 'uploading' ? 'not-allowed' : 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: file.status === 'uploading' ? 0.6 : 1,
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                        title="Vytěžit údaje pomocí OCR"
                      >
                        <Sparkles size={14} />
                      </button>
                    )}

                    {/* Koš */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => file.serverId ? deleteFromServer(file.id) : removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: file.status === 'uploading' ? '#9ca3af' : '#dc2626',
                          cursor: file.status === 'uploading' ? 'not-allowed' : 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: file.status === 'uploading' ? 0.6 : 1,
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                        title={file.serverId ? "Smazat ze serveru" : "Smazat soubor"}
                      >
                        <Trash2 size={14} />
                      </button>
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
                    Nahráno: {username || 'Super ADMIN'}
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
                  disabled={file.status === 'uploading' || readOnly}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: `1px solid ${!file.klasifikace ? '#fca5a5' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: (file.status === 'uploading' || readOnly) ? '#f3f4f6' : 'white',
                    color: file.klasifikace ? '#374151' : '#6b7280',
                    cursor: (file.status === 'uploading' || readOnly) ? 'not-allowed' : 'pointer',
                    opacity: (file.status === 'uploading' || readOnly) ? 0.6 : 1
                  }}
                >
                  <option value="" style={{ color: '#6b7280' }}>Vyberte...</option>
                  {fakturaTypyPrilohOptions.map(typ => (
                    <option key={typ.kod} value={typ.kod}>
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
    </>
  );
};

export default InvoiceAttachmentsCompact;
