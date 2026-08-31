import React, { useRef, useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs } from './moduleUtils';
import { usePersistentDialog } from '../../../ui/PersistentDialog';
import DismissibleMessage from '../../../ui/DismissibleMessage';

export default function AttachmentsModule({
  attachments = [],
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  attachmentsLoading,
  attachmentsError,
  attachmentMessage,
  uploadingAttachment,
  attachmentUploadProgress = null,
  readOnly,
  lookupByCategory = {},
  contextRecords = {},
}) {
  const { confirm } = usePersistentDialog();
  const [pendingFile, setPendingFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const fileInputRef = useRef(null);

  function pickFile(event) {
    const file = event.target.files?.[0] || null;
    setPendingFile(file);
  }

  function selectFile(file) {
    if (file instanceof File) {
      setPendingFile(file);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!pendingFile || !documentType) return;
    try {
      await onUploadAttachment({ file: pendingFile, classKey: documentType, note });
      setPendingFile(null);
      setDocumentType('');
      setNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Chyba se zobrazuje přes attachmentsError z nadřazené karty.
    }
  }

  async function handleDelete(attachment) {
    if (await confirm({ title: 'Smazat přílohu', message: `Opravdu smazat přílohu „${attachment.original_filename}“?`, confirmLabel: 'Smazat', danger: true })) {
      await onDeleteAttachment(attachment);
    }
  }

  function formatSize(bytes) {
    if (!bytes) return '-';
    const units = ['B', 'kB', 'MB', 'GB'];
    let n = Number(bytes);
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
    return `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} ${units[i]}`;
  }

  const filteredAttachments = filter
    ? attachments.filter((a) => a.document_type_code === filter)
    : attachments;
  const contextLabels = {
    vehicle: 'Karta vozidla', service: 'Servisy a opravy', equipment: 'Výbava a zařízení',
    insurance: 'Pojištění a škody (historické)', insurance_policy: 'Pojistné smlouvy', insurance_claim: 'Škodní události', tires: 'Pneumatiky', funding: 'Dotace a financování',
    supplier: 'Dodavatelé', warranty_claim: 'Záruka a reklamace',
  };
  const linkedRecord = selectedAttachment?.context_record_id
    ? (contextRecords[selectedAttachment.context_module] || []).find((record) => Number(record.id) === Number(selectedAttachment.context_record_id))
    : null;
  const linkedRecordLabel = linkedRecord?.label
    || linkedRecord?.description
    || linkedRecord?.equipment_name
    || linkedRecord?.policy_number
    || linkedRecord?.title
    || linkedRecord?.tire_set_name
    || linkedRecord?.reference_number
    || linkedRecord?.supplier_name
    || null;

  if (attachmentsLoading) return <p className="muted">Načítám přílohy...</p>;

  return (
    <div>
      <DismissibleMessage message={attachmentsError} variant="error" />
      <DismissibleMessage message={attachmentMessage} variant="success" />
      {uploadingAttachment && (
        <p className="muted">
          Nahrávání přílohy{Number.isFinite(Number(attachmentUploadProgress)) ? `: ${Math.round(Number(attachmentUploadProgress))} %` : '...'}
        </p>
      )}

      {!readOnly && (
        <form onSubmit={submitUpload} className="detail-form attachment-upload-form" style={{ marginBottom: '1.5rem' }}>
          <h4>Nahrát přílohu</h4>
          <div
            className={`attachment-dropzone${isDragging ? ' is-dragging' : ''}${pendingFile ? ' has-file' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={handleDrop}
            aria-label="Přetáhněte soubor nebo jej vyberte"
          >
            <AppIcon name="upload" size={24} weight="duotone" />
            <div>
              <strong>{pendingFile ? pendingFile.name : 'Přetáhněte soubor sem'}</strong>
              <span>{pendingFile ? formatSize(pendingFile.size) : 'nebo kliknutím vyberte soubor ze zařízení'}</span>
            </div>
          </div>
          <input ref={fileInputRef} id="attachment-file" className="attachment-file-input" type="file" onChange={pickFile} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Soubor *
              <button type="button" className="attachment-file-picker" onClick={() => fileInputRef.current?.click()}>
                <AppIcon name="upload" size={17} weight="bold" />
                {pendingFile ? 'Změnit soubor' : 'Vybrat soubor'}
              </button>
            </label>
            <label>
              Typ dokumentu *
              <LookupSelect
                category="document_type"
                lookupByCategory={lookupByCategory}
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Poznámka
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Volitelný popis" />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={uploadingAttachment || !pendingFile || !documentType}>
              {uploadingAttachment ? 'Nahrávám...' : 'Nahrát'}
            </button>
          </div>
        </form>
      )}

      <div className="attachment-filter-row">
        <label className="attachment-filter-label">
          Filtr typu:
          <span className="attachment-filter-select">
            <LookupSelect
              category="document_type"
              lookupByCategory={lookupByCategory}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="-- Vše --"
            />
          </span>
        </label>
        {filter && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter('')}>Zrušit filtr</button>
        )}
      </div>

      {filteredAttachments.length === 0 ? (
        <p className="muted">Žádné přílohy</p>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Typ dokumentu</th>
                <th>Zdroj</th>
                <th>Název souboru</th>
                <th>Velikost</th>
                <th>Nahráno</th>
                <th className="module-table-actions">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{lookupLabel(lookupByCategory, 'document_type', attachment.document_type_code) || '-'}</td>
                  <td>{contextLabels[attachment.context_module] || attachment.context_module || contextLabels.vehicle}</td>
                  <td>
                    <div>{attachment.original_filename || '-'}</div>
                    {attachment.note && (
                      <div className="muted" style={{ fontSize: '0.8rem' }}>{attachment.note}</div>
                    )}
                  </td>
                  <td>{formatSize(attachment.size_bytes)}</td>
                  <td>{formatDateCs(attachment.created_at)}</td>
                  <td className="module-table-actions">
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => onDownloadAttachment(attachment)} title="Stáhnout">
                        <AppIcon name="download" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAttachment(attachment)} title="Detail přílohy">
                        <AppIcon name="edit" size={16} />
                      </button>
                      {!readOnly && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(attachment)} title="Smazat">
                          <AppIcon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAttachment && (
        <div className="lookup-editor-backdrop" role="presentation" onClick={() => setSelectedAttachment(null)}>
          <aside className="lookup-editor-drawer" role="dialog" aria-modal="true" aria-label="Detail přílohy" onClick={(event) => event.stopPropagation()}>
            <div className="lookup-editor-drawer-head">
              <div>
                <div className="lookup-section-label">PŘÍLOHA</div>
                <h3>{selectedAttachment.original_filename}</h3>
              </div>
              <button type="button" className="station-edit-close" onClick={() => setSelectedAttachment(null)} aria-label="Zavřít detail">×</button>
            </div>
            <div className="attachment-detail-panel">
              <p><strong>Zdroj:</strong> {contextLabels[selectedAttachment.context_module] || selectedAttachment.context_module || contextLabels.vehicle}</p>
              <p><strong>Typ dokumentu:</strong> {lookupLabel(lookupByCategory, 'document_type', selectedAttachment.document_type_code) || '-'}</p>
              <p><strong>Velikost:</strong> {formatSize(selectedAttachment.size_bytes)}</p>
              <p><strong>Nahráno:</strong> {formatDateCs(selectedAttachment.created_at)}</p>
              <p><strong>Poznámka:</strong> {selectedAttachment.note || '-'}</p>
              {selectedAttachment.context_record_id && <p><strong>Navázaný záznam:</strong> {linkedRecordLabel || `#${selectedAttachment.context_record_id}`}</p>}
              <button className="btn btn-primary" onClick={() => onDownloadAttachment(selectedAttachment)}><AppIcon name="detail" size={16} /> Stáhnout</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
