import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs } from './moduleUtils';

export default function AttachmentsModule({
  attachments = [],
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  attachmentsLoading,
  attachmentsError,
  attachmentMessage,
  uploadingAttachment,
  readOnly,
  lookupByCategory = {},
}) {
  const [pendingFile, setPendingFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');

  function pickFile(event) {
    const file = event.target.files?.[0] || null;
    setPendingFile(file);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!pendingFile || !documentType) return;
    await onUploadAttachment({ file: pendingFile, classKey: documentType, note });
    setPendingFile(null);
    setDocumentType('');
    setNote('');
    const input = document.getElementById('attachment-file');
    if (input) input.value = '';
  }

  async function handleDelete(attachment) {
    if (window.confirm(`Opravdu smazat přílohu "${attachment.original_filename}"?`)) {
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

  if (attachmentsLoading) return <p className="muted">Načítám přílohy...</p>;

  return (
    <div>
      {attachmentsError && <div className="error-box">{attachmentsError}</div>}
      {attachmentMessage && <div className="success-box">{attachmentMessage}</div>}

      {!readOnly && (
        <form onSubmit={submitUpload} className="detail-form" style={{ marginBottom: '1.5rem' }}>
          <h4>Nahrát přílohu</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
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
            <label>
              Soubor *
              <input id="attachment-file" type="file" onChange={pickFile} required />
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

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Filtr typu:
          <LookupSelect
            category="document_type"
            lookupByCategory={lookupByCategory}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="-- Vše --"
          />
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
                <th>Název souboru</th>
                <th>Velikost</th>
                <th>Nahráno</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{lookupLabel(lookupByCategory, 'document_type', attachment.document_type_code) || '-'}</td>
                  <td>
                    <div>{attachment.original_filename || '-'}</div>
                    {attachment.note && (
                      <div className="muted" style={{ fontSize: '0.8rem' }}>{attachment.note}</div>
                    )}
                  </td>
                  <td>{formatSize(attachment.size_bytes)}</td>
                  <td>{formatDateCs(attachment.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => onDownloadAttachment(attachment)} title="Stáhnout">
                        <AppIcon name="detail" size={16} />
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
    </div>
  );
}
