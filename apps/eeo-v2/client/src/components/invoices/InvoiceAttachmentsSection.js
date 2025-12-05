import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { Paperclip, ChevronDown, ChevronUp, AlertCircle, Loader } from 'lucide-react';
import InvoiceAttachmentUploadButton from './InvoiceAttachmentUploadButton';
import InvoiceAttachmentItem from './InvoiceAttachmentItem';
import ISDOCParsingDialog from './ISDOCParsingDialog';
import {
  uploadInvoiceAttachment25,
  listInvoiceAttachments25,
  downloadInvoiceAttachment25,
  deleteInvoiceAttachment25
} from '../../services/api25invoices';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { parseISDOCFile, isISDOCFile, createISDOCSummary } from '../../utils/isdocParser';

/**
 * InvoiceAttachmentsSection Component
 *
 * Hlavní komponenta pro správu příloh faktury
 * Zahrnuje: seznam příloh, upload, download, delete
 * Automaticky načte přílohy při mount nebo změně faktura_id
 */

const Section = styled.div`
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const HeaderTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 8px;
`;

const ToggleIcon = styled.div`
  display: flex;
  align-items: center;
  color: #6b7280;
  transition: transform 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Content = styled.div`
  padding: 16px;
  display: ${props => props.collapsed ? 'none' : 'block'};
`;

const UploadSection = styled.div`
  margin-bottom: ${props => props.hasAttachments ? '20px' : '0'};
`;

const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  gap: 8px;

  svg {
    width: 48px;
    height: 48px;
    opacity: 0.3;
  }
`;

const EmptyText = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 12px;
  color: #6b7280;
  font-size: 0.875rem;

  svg {
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const InvoiceAttachmentsSection = ({
  fakturaId,
  objednavkaId,
  readOnly = false,
  onAttachmentsChange,
  defaultCollapsed = false,
  onISDOCParsed // 🆕 Callback pro vyplnění faktury z ISDOC
}) => {
  const { username, token } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState(null);

  // 🆕 ISDOC parsing state
  const [showISDOCDialog, setShowISDOCDialog] = useState(false);
  const [pendingISDOCFile, setPendingISDOCFile] = useState(null);
  const [isdocSummary, setIsdocSummary] = useState(null);

  // Načtení příloh při mount nebo změně faktura_id
  useEffect(() => {
    if (fakturaId) {
      loadAttachments();
    } else {
      setAttachments([]);
    }
  }, [fakturaId]);

  // Načtení příloh z API
  const loadAttachments = async () => {
    if (!fakturaId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await listInvoiceAttachments25({
        token: token,
        username: username,
        faktura_id: fakturaId,
        objednavka_id: objednavkaId // ✅ PŘIDÁNO pro nové Order V2 API
      });

      // ✅ V2 API response structure: response.data.attachments
      const attachmentsList = response?.data?.attachments || response.prilohy || [];

      // 🔍 DEBUG: Kompletní výpis všech příloh

      // ⚠️ Kontrola existence fyzických souborů
      const processedAttachments = attachmentsList.map(att => {
        const fileExists = att.file_exists !== false; // Backend by měl vrátit file_exists: false pokud soubor chybí
        const hasError = att.error || att.file_error;

        if (!fileExists || hasError) {
          console.warn('⚠️ Příloha faktury má problém:', {
            id: att.id,
            name: att.original_name || att.originalni_nazev_souboru,
            file_exists: fileExists,
            error: hasError,
            path: att.systemova_cesta
          });
        }

        return {
          ...att,
          file_exists: fileExists,
          error: hasError || (!fileExists ? 'Fyzický soubor chybí na disku' : null)
        };
      });

      setAttachments(processedAttachments);

      // Callback pro parent
      if (onAttachmentsChange) {
        onAttachmentsChange(processedAttachments);
      }

    } catch (err) {
      setError(err.message || 'Chyba při načítání příloh');
      addToast?.('error', 'Chyba při načítání příloh faktury');
    } finally {
      setLoading(false);
    }
  };

  // Upload handler
  const handleUpload = async (file, isISDOC) => {
    if (!fakturaId || !objednavkaId) {
      throw new Error('Chybí ID faktury nebo objednávky');
    }

    try {
      // 🆕 Pokud je ISDOC, nabídnout parsing
      if (isISDOC && onISDOCParsed) {
        // Naparsovat ISDOC
        try {
          const isdocData = await parseISDOCFile(file);
          const summary = createISDOCSummary(isdocData);

          // Uložit pro pozdější použití
          setPendingISDOCFile({ file, isdocData });
          setIsdocSummary(summary);
          setShowISDOCDialog(true);

          // Nechat uživatele rozhodnout v dialogu
          return;

        } catch (parseError) {
          addToast?.('warning', 'Nepodařilo se naparsovat ISDOC soubor. Nahráno jako běžná příloha.');
          // Pokračovat jako běžný upload
        }
      }

      // Běžný upload (nebo ISDOC bez parsingu)
      await performUpload(file, isISDOC);

    } catch (err) {
      addToast?.('error', err.message || 'Chyba při nahrávání přílohy');
      throw err;
    }
  };

  // Provede skutečný upload na server
  const performUpload = async (file, isISDOC) => {
    // Určení typu přílohy
    const typ_prilohy = isISDOC ? 'ISDOC' : 'FAKTURA';

    const response = await uploadInvoiceAttachment25({
      token: token,
      username: username,
      faktura_id: fakturaId,
      objednavka_id: objednavkaId,
      typ_prilohy: typ_prilohy,
      file: file
    });


    addToast?.('success', isISDOC
      ? 'ISDOC soubor byl úspěšně nahrán'
      : 'Příloha byla úspěšně nahrána'
    );

    // Reload attachments
    await loadAttachments();
  };

  // 🆕 Potvrzení ISDOC parsingu - vyplnit fakturu
  const handleISDOCConfirm = async () => {
    if (!pendingISDOCFile) return;

    try {
      const { file, isdocData } = pendingISDOCFile;

      // 1. Zavolat callback pro vyplnění faktury
      if (onISDOCParsed) {
        onISDOCParsed(isdocData);
      }

      // 2. Nahrát ISDOC soubor jako přílohu
      await performUpload(file, true);

      // 3. Zavřít dialog
      setShowISDOCDialog(false);
      setPendingISDOCFile(null);
      setIsdocSummary(null);

      addToast?.('success', 'ISDOC faktura byla úspěšně načtena a údaje vyplněny');

    } catch (err) {
      addToast?.('error', err.message || 'Chyba při zpracování ISDOC');
    }
  };

  // 🆕 Nahrát ISDOC bez parsingu
  const handleISDOCUploadWithoutParsing = async () => {
    if (!pendingISDOCFile) return;

    try {
      const { file } = pendingISDOCFile;

      // Nahrát jako běžnou přílohu
      await performUpload(file, true);

      // Zavřít dialog
      setShowISDOCDialog(false);
      setPendingISDOCFile(null);
      setIsdocSummary(null);

    } catch (err) {
      addToast?.('error', err.message || 'Chyba při nahrávání ISDOC');
    }
  };

  // 🆕 Zrušení ISDOC dialogu
  const handleISDOCCancel = () => {
    setShowISDOCDialog(false);
    setPendingISDOCFile(null);
    setIsdocSummary(null);
  };

  // Download handler
  const handleDownload = async (attachment) => {
    try {
      const blob = await downloadInvoiceAttachment25({
        token: token,
        username: username,
        faktura_id: fakturaId, // ✅ Order V2 API
        priloha_id: attachment.id,
        objednavka_id: objednavkaId // ✅ Order V2 API - required
      });

      // Název souboru - support both API v2 and old API
      const filename = attachment.original_name || attachment.originalni_nazev_souboru || 'priloha.pdf';

      // Importovat utility funkce
      const { isPreviewableInBrowser, openInBrowser25 } = await import('../../services/api25orders');

      // Zkontrolovat, zda lze soubor zobrazit v prohlížeči
      if (isPreviewableInBrowser(filename)) {
        const opened = openInBrowser25(blob, filename);
        
        if (opened) {
          // Nabídnout možnost stažení
          const shouldDownload = window.confirm(
            `Příloha "${filename}" byla otevřena v novém okně.\n\nChcete ji také stáhnout?`
          );
          
          if (shouldDownload) {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            addToast?.('success', 'Soubor byl stažen');
          }
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

      addToast?.('success', 'Soubor byl stažen');

    } catch (err) {
      addToast?.('error', err.message || 'Chyba při stahování přílohy');
      throw err;
    }
  };

  // Delete handler
  const handleDelete = async (attachment) => {
    try {
      // ✅ HARD DELETE - fyzické smazání souboru z disku i DB
      const response = await deleteInvoiceAttachment25({
        token: token,
        username: username,
        faktura_id: fakturaId, // ✅ Order V2 API
        priloha_id: attachment.id,
        objednavka_id: objednavkaId, // ✅ Order V2 API - required
        hard_delete: 1 // 🔥 HARD DELETE - smaže soubor z disku
      });


      // ✅ Kontrola response před reloadem
      if (response && (response.status === 'ok' || response.status === 'success')) {
        // Log informací o smazání
        if (response.data) {
          const { file_existed, file_deleted_from_disk, db_record_deleted } = response.data;

          // 🎉 Zobrazit detailní toast notifikaci podle BE response
          if (db_record_deleted) {
            if (file_existed && file_deleted_from_disk) {
              // ✅ Scénář 1: Vše OK
              addToast?.('success', '✅ Příloha úspěšně smazána (DB + soubor)');
            } else if (!file_existed) {
              // ⚠️ Scénář 2: Soubor už neexistoval
              addToast?.('warning', '⚠️ DB záznam smazán, ale soubor již na disku neexistoval');
            } else if (file_existed && !file_deleted_from_disk) {
              // ⚠️ Scénář 3: Chyba oprávnění
              addToast?.('warning', '⚠️ DB záznam smazán, ale soubor se nepodařilo smazat z disku');
            } else {
              addToast?.('success', 'Příloha smazána z databáze');
            }
          } else {
            addToast?.('error', '❌ Nepodařilo se smazat DB záznam');
          }

          // Zobrazit warning pokud je v response
          if (response.warning) {
          }
        } else {
          addToast?.('success', 'Příloha byla smazána');
        }

        // Reload attachments
        await loadAttachments();
      } else {
        throw new Error(response?.message || 'Neočekávaná odpověď serveru');
      }

    } catch (err) {
      addToast?.('error', `❌ Chyba při mazání: ${err.message}`);
      throw err;
    }
  };

  const hasAttachments = attachments.length > 0;

  return (
    <>
      <Section>
        <Header onClick={() => setCollapsed(!collapsed)}>
          <HeaderLeft>
            <HeaderIcon>
              <Paperclip />
            </HeaderIcon>
            <HeaderTitle>
              Přílohy faktury
              {hasAttachments && <Badge>{attachments.length}</Badge>}
            </HeaderTitle>
          </HeaderLeft>

          <ToggleIcon>
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </ToggleIcon>
        </Header>

        <Content collapsed={collapsed}>
          {/* Upload sekce - VŽDY dostupné pokud není readOnly */}
          {!readOnly && (
            <UploadSection hasAttachments={hasAttachments}>
              <InvoiceAttachmentUploadButton
                onUpload={handleUpload}
                disabled={loading}
              />
            </UploadSection>
          )}

          {/* Error state */}
          {error && (
            <ErrorState>
              <AlertCircle />
              {error}
            </ErrorState>
          )}

          {/* Loading state */}
          {loading && (
            <LoadingState>
              <Loader />
              Načítám přílohy...
            </LoadingState>
          )}

          {/* Attachments list */}
          {!loading && hasAttachments && (
            <AttachmentsList>
              {attachments.map((attachment) => (
                <InvoiceAttachmentItem
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  readOnly={readOnly}
                />
              ))}
            </AttachmentsList>
          )}

          {/* Empty state */}
          {!loading && !error && !hasAttachments && (
            <EmptyState>
              <Paperclip />
              <EmptyText>
                {readOnly
                  ? 'Zatím nebyly nahrány žádné přílohy'
                  : 'Nahrajte přílohy k této faktuře'
                }
              </EmptyText>
            </EmptyState>
          )}
        </Content>
      </Section>

      {/* 🆕 ISDOC Parsing Dialog */}
      {showISDOCDialog && isdocSummary && ReactDOM.createPortal(
        <ISDOCParsingDialog
          isdocSummary={isdocSummary}
          onConfirm={handleISDOCConfirm}
          onCancel={handleISDOCCancel}
          onUploadWithoutParsing={handleISDOCUploadWithoutParsing}
        />,
        document.body
      )}
    </>
  );
};

export default InvoiceAttachmentsSection;
