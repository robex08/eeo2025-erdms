import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  FileImage,
  FileX,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment,
  generateAttachmentGUID,
  isAllowedFileExtension,
  isAllowedFileSize,
  createDownloadLink,
  getFileExtension
} from '../services/api2auth';

// Animace
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Stylované komponenty
const Container = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const UploadZone = styled.div`
  border: 2px dashed ${props => props.isDragging ? '#667eea' : '#cbd5e1'};
  border-radius: 8px;
  padding: 32px 24px;
  text-align: center;
  background: ${props => props.isDragging ? '#f0f9ff' : '#f8fafc'};
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 24px;

  &:hover {
    border-color: #667eea;
    background: #f0f9ff;
  }

  .upload-icon {
    font-size: 2rem;
    color: #94a3b8;
    margin-bottom: 12px;
  }

  .upload-text {
    font-size: 1rem;
    color: #475569;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .upload-hint {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 16px;
  }

  .upload-button {
    background: #667eea;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: #5a67d8;
    }

    &:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }
  }
`;

const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
  animation: ${fadeIn} 0.3s ease-out;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
`;

const FileIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  background: ${props => props.bgColor || '#f1f5f9'};
  color: ${props => props.color || '#64748b'};
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;

  .file-name {
    font-weight: 500;
    color: #1e293b;
    margin-bottom: 4px;
    word-break: break-word;
  }

  .file-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.875rem;
    color: #64748b;
    flex-wrap: wrap;
  }

  .file-size {
    font-weight: 500;
  }

  .file-type {
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .file-user {
    background: #f0fdf4;
    color: #166534;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .file-date {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
`;

const ActionButton = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;

  &:hover {
    background: ${props => props.hoverColor || '#f1f5f9'};
    border-color: ${props => props.hoverBorderColor || '#cbd5e1'};
    color: ${props => props.hoverTextColor || '#374151'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.delete {
    &:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
  }

  &.download {
    &:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #2563eb;
    }
  }
`;

const TypeSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${props => props.hasError ? '#ef4444' : '#d1d5db'};
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ef4444' : '#667eea'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(102, 126, 234, 0.1)'};
  }
`;

const ErrorText = styled.div`
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 4px;
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;

  .count {
    font-weight: 600;
    color: #374151;
  }

  .refresh-btn {
    background: none;
    border: 1px solid #d1d5db;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 0.875rem;
    transition: all 0.2s ease;

    &:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spin {
      animation: ${spin} 1s linear infinite;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #64748b;

  .icon {
    animation: ${spin} 1s linear infinite;
    margin-right: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #64748b;

  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .title {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 8px;
    color: #374151;
  }

  .description {
    font-size: 0.875rem;
  }
`;

// Konfigurace typů příloh
const ATTACHMENT_TYPES = [
  { value: '', label: 'Vyberte typ...' },
  { value: 'objednavka', label: 'Objednávka' },
  { value: 'faktura', label: 'Faktura' },
  { value: 'kosilka', label: 'Košilka' },
  { value: 'schvaleni', label: 'Schválení' },
  { value: 'jine', label: 'Jiné' }
];

// Utility funkce
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIconAndColor = (filename, fileExists = true) => {
  // If file doesn't exist on disk, show broken file indicator
  if (fileExists === false) {
    return { icon: FileX, bgColor: '#fef2f2', color: '#dc2626' };
  }

  const ext = getFileExtension(filename);

  switch (ext) {
    case 'pdf':
      return { icon: FileText, bgColor: '#fef2f2', color: '#dc2626' };
    case 'doc':
    case 'docx':
      return { icon: FileText, bgColor: '#eff6ff', color: '#2563eb' };
    case 'xls':
    case 'xlsx':
      return { icon: FileText, bgColor: '#f0fdf4', color: '#16a34a' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return { icon: FileImage, bgColor: '#fefce8', color: '#ca8a04' };
    default:
      return { icon: File, bgColor: '#f1f5f9', color: '#64748b' };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    return dateString;
  }
};

// Hlavní komponenta
const AttachmentManager = ({ orderId, readonly = false, onChange }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Načtení seznamu příloh
  const loadAttachments = useCallback(async () => {
    if (!orderId || !user?.token) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    try {
      const result = await listAttachments({
        token: user.token,
        objednavka_id: orderId
      });

      setAttachments(result.attachments || []);

      // Notifikace rodiče o změně
      if (onChange) {
        onChange(result.attachments || []);
      }

    } catch (error) {
      showToast && showToast('Chyba při načítání příloh: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.token, onChange, showToast]);

  // Inicializace
  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    if (dragCounter === 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragCounter(0);
    setIsDragging(false);

    if (readonly || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  // Upload souborů
  const handleFileUpload = async (files) => {
    if (!files.length || readonly || uploading || !user?.token) return;

    setUploading(true);
    const errors = {};

    try {
      for (const file of files) {
        // Validace souboru
        if (!isAllowedFileExtension(file.name)) {
          errors[file.name] = 'Nepodporovaný typ souboru';
          continue;
        }

        if (!isAllowedFileSize(file.size)) {
          errors[file.name] = 'Soubor je příliš velký (max 5MB)';
          continue;
        }

        // Generace GUID
        const guid = generateAttachmentGUID();

        try {
          const result = await uploadAttachment({
            token: user.token,
            objednavka_id: orderId,
            originalni_nazev: file.name,
            systemovy_nazev: guid,
            velikost: file.size,
            typ_prilohy: '', // Bude potřeba nastavit uživatelem
            file: file
          });

          showToast && showToast('Soubor ' + file.name + ' byl nahrán', 'success');

        } catch (uploadError) {
          errors[file.name] = uploadError.message;
        }
      }

      // Zobrazit chyby
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([filename, error]) => {
          showToast && showToast(`${filename}: ${error}`, 'error');
        });
      }

      // Obnovit seznam
      await loadAttachments();

    } catch (error) {
      showToast && showToast('Chyba při nahrávání souborů', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Stažení přílohy
  const handleDownload = async (attachment) => {
    if (!user?.token) return;

    try {
      const blob = await downloadAttachment({
        token: user.token,
        guid: attachment.guid
      });

      // Support both API v2 (original_name) and old API (originalni_nazev)
      const fileName = attachment.original_name || attachment.originalni_nazev || 'priloha';
      createDownloadLink(blob, fileName);
      showToast && showToast('Soubor byl stažen', 'success');

    } catch (error) {
      showToast && showToast('Chyba při stahování: ' + error.message, 'error');
    }
  };

  // Smazání přílohy
  const handleDelete = async (attachment) => {
    if (!user?.token || readonly) return;

    // Support both API v2 (original_name) and old API (originalni_nazev)
    const fileName = attachment.original_name || attachment.originalni_nazev || 'tento soubor';

    // Zobrazit toast s potvrzením místo systémového okna
    showToast && showToast(`Opravdu chcete smazat přílohu "${fileName}"?`, {
      type: 'warning',
      action: {
        label: 'Ano, smazat',
        onClick: async () => {
          try {
            await deleteAttachment({
              token: user.token,
              guid: attachment.guid
            });

            showToast && showToast('Příloha byla smazána', 'success');
            await loadAttachments();

          } catch (error) {
            showToast && showToast('Chyba při mazání: ' + error.message, 'error');
          }
        }
      }
    });
    return; // Ukončit původní funkci
  };

  // Změna typu přílohy
  const handleTypeChange = (attachmentId, newType) => {
    // Tato funkce by měla updateovat typ na serveru
    // Pro teď pouze lokálně
    setAttachments(prev => prev.map(att =>
      att.id === attachmentId
        ? { ...att, typ_prilohy: newType }
        : att
    ));

    // Vyčistit chybu validace
    if (validationErrors[`attachment_${attachmentId}_type`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`attachment_${attachmentId}_type`];
        return newErrors;
      });
    }
  };

  // File input handler
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    e.target.value = ''; // Vyčistit input
  };

  // Token kontrola dočasně vypnuta - předpokládáme, že uživatel je přihlášený
  // if (!user?.token) {
  //   return (
  //     <Container>
  //       <Header>
  //         <h3><File size={20} />Přílohy</h3>
  //       </Header>
  //       <Content>
  //         <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
  //           Pro správu příloh se musíte přihlásit
  //         </div>
  //       </Content>
  //     </Container>
  //   );
  // }

  if (!orderId) {
    return (
      <Container>
        <Header>
          <h3><File size={20} />Přílohy objednávky</h3>
        </Header>
        <Content>
          <EmptyState>
            <File className="icon" />
            <div className="title">Přílohy budou dostupné po uložení objednávky</div>
            <div className="description">
              Nejdříve uložte objednávku, poté můžete přidávat přílohy
            </div>
          </EmptyState>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h3><File size={20} />Přílohy objednávky</h3>
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          {attachments.length} {attachments.length === 1 ? 'příloha' : attachments.length < 5 ? 'přílohy' : 'příloh'}
        </div>
      </Header>

      <Content>
        {!readonly && (
          <UploadZone
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('attachment-file-input')?.click()}
          >
            <Upload className="upload-icon" />
            <div className="upload-text">
              {isDragging ? 'Pusťte soubory zde...' : 'Přetáhněte soubory nebo klikněte pro výběr'}
            </div>
            <div className="upload-hint">
              Povolené formáty: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF (max 5MB)
            </div>
            <button
              className="upload-button"
              disabled={uploading}
              type="button"
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} style={{ marginRight: 8 }} className="spin" />
                  Nahrávání...
                </>
              ) : (
                <>
                  <Plus size={16} style={{ marginRight: 8 }} />
                  Vybrat soubory
                </>
              )}
            </button>

            <input
              id="attachment-file-input"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
            />
          </UploadZone>
        )}

        {loading ? (
          <LoadingSpinner>
            <RefreshCw className="icon" />
            Načítání příloh...
          </LoadingSpinner>
        ) : attachments.length === 0 ? (
          <EmptyState>
            <File className="icon" />
            <div className="title">Žádné přílohy</div>
            <div className="description">
              {readonly
                ? 'K této objednávce nejsou připojeny žádné přílohy'
                : 'Přidejte první přílohu přetažením nebo kliknutím na tlačítko výše'
              }
            </div>
          </EmptyState>
        ) : (
          <AttachmentsList>
            {attachments.map((attachment) => {
              // Support both API v2 (original_name) and old API (originalni_nazev)
              const fileName = attachment.original_name || attachment.originalni_nazev || 'Neznámý soubor';
              const fileExists = attachment.file_exists !== false; // Default to true if not specified
              const { icon: IconComponent, bgColor, color } = getFileIconAndColor(fileName, fileExists);
              const hasTypeError = validationErrors[`attachment_${attachment.id}_type`];

              return (
                <AttachmentItem key={attachment.id || attachment.guid}>
                  <FileIcon bgColor={bgColor} color={color}>
                    <IconComponent size={20} />
                  </FileIcon>

                  <FileInfo>
                    <div className="file-name" style={{
                      color: !fileExists ? '#dc2626' : 'inherit'
                    }}>
                      {fileName}
                      {!fileExists && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '0.75rem',
                          color: '#dc2626',
                          fontWeight: 600
                        }}>
                          ⚠ Soubor nenalezen na disku
                        </span>
                      )}
                    </div>
                    <div className="file-meta">
                      <span className="file-size">
                        {formatFileSize(attachment.velikost)}
                      </span>

                      {!readonly ? (
                        <div>
                          <TypeSelect
                            value={attachment.typ_prilohy || ''}
                            onChange={(e) => handleTypeChange(attachment.id, e.target.value)}
                            hasError={hasTypeError}
                          >
                            {ATTACHMENT_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </TypeSelect>
                          {hasTypeError && (
                            <ErrorText>Vyberte typ přílohy</ErrorText>
                          )}
                        </div>
                      ) : attachment.typ_prilohy ? (
                        <span className="file-type">
                          {ATTACHMENT_TYPES.find(t => t.value === attachment.typ_prilohy)?.label || attachment.typ_prilohy}
                        </span>
                      ) : null}

                      {attachment.nahrano_uzivatel && (
                        <span className="file-user">
                          {attachment.nahrano_uzivatel.celne_jmeno ||
                           `${attachment.nahrano_uzivatel.jmeno} ${attachment.nahrano_uzivatel.prijmeni}`}
                        </span>
                      )}

                      {attachment.dt_vytvoreni && (
                        <span className="file-date">
                          {formatDate(attachment.dt_vytvoreni)}
                        </span>
                      )}
                    </div>
                  </FileInfo>

                  <Actions>
                    <ActionButton
                      className="download"
                      onClick={() => handleDownload(attachment)}
                      title="Stáhnout přílohu"
                    >
                      <Download size={16} />
                    </ActionButton>

                    {!readonly && (
                      <ActionButton
                        className="delete"
                        onClick={() => handleDelete(attachment)}
                        title="Smazat přílohu"
                      >
                        <Trash2 size={16} />
                      </ActionButton>
                    )}
                  </Actions>
                </AttachmentItem>
              );
            })}
          </AttachmentsList>
        )}
      </Content>

      <Stats>
        <div>
          Celkem <span className="count">{attachments.length}</span> příloh
        </div>
        <button
          className="refresh-btn"
          onClick={loadAttachments}
          disabled={loading}
          title="Obnovit seznam"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Obnovit
        </button>
      </Stats>
    </Container>
  );
};

export default AttachmentManager;