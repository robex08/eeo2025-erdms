import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import DismissibleMessage from '../../../ui/DismissibleMessage';
import { lookupLabel } from './moduleUtils';

const ModuleAttachmentUpload = forwardRef(function ModuleAttachmentUpload({
  contextModule,
  contextRecordId,
  attachments = [],
  onUpload,
  onDelete,
  onDownload,
  uploading,
  readOnly,
  lookupByCategory = {},
  attachmentUploadProgress = null,
  queueRef,
}, ref) {
  const inputId = useId();
  const inputRef = useRef(null);
  const fallbackQueueRef = useRef([]);
  const nextClientIdRef = useRef(1);
  // Fronta je držena v rodiči, aby přežila remount této komponenty během ukládání.
  const pendingRef = queueRef ?? fallbackQueueRef;
  const [, forceRender] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!Array.isArray(pendingRef.current)) {
    pendingRef.current = [];
  }

  useEffect(() => {
    const maxClientId = pendingRef.current.reduce((max, item) => Math.max(max, item.clientId || 0), 0);
    nextClientIdRef.current = maxClientId + 1;
  }, [pendingRef]);

  const numericRecordId = Number(contextRecordId);
  const recordAttachments = attachments.filter((attachment) => (
    attachment.context_module === contextModule
    && Number(attachment.context_record_id) === numericRecordId
  ));

  function sync() {
    forceRender((value) => value + 1);
  }

  function formatSize(bytes) {
    if (!bytes) return '-';
    const units = ['B', 'kB', 'MB', 'GB'];
    let n = Number(bytes);
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i += 1;
    }
    return `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} ${units[i]}`;
  }

  function appendFiles(fileList) {
    const files = Array.from(fileList || []).filter((item) => item instanceof File);
    if (files.length === 0) return;
    pendingRef.current = [
      ...pendingRef.current,
      ...files.map((file) => ({
        clientId: nextClientIdRef.current++,
        file,
        documentType: '',
        note: '',
      })),
    ];
    setUploadError('');
    setUploadMessage('');
    if (inputRef.current) inputRef.current.value = '';
    sync();
  }

  function updatePendingItem(clientId, patch) {
    pendingRef.current = pendingRef.current.map((item) => (
      item.clientId === clientId ? { ...item, ...patch } : item
    ));
    sync();
  }

  function removePendingItem(clientId) {
    pendingRef.current = pendingRef.current.filter((item) => item.clientId !== clientId);
    sync();
  }

  function validatePendingItems() {
    const itemWithoutType = pendingRef.current.find((item) => !item.documentType);
    if (itemWithoutType) {
      setUploadError(`Pro soubor „${itemWithoutType.file.name}“ zvolte typ dokumentu.`);
      return false;
    }
    setUploadError('');
    return true;
  }

  async function runUpload(recordId) {
    const queue = [...pendingRef.current];
    if (queue.length === 0) return true;

    const targetId = Number(recordId);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      setUploadError('Přílohu lze nahrát až po uložení záznamu.');
      return false;
    }
    if (!validatePendingItems()) return false;

    setUploadError('');
    setUploadMessage('');
    setBusy(true);
    try {
      for (const item of queue) {
        await onUpload({
          file: item.file,
          classKey: item.documentType,
          note: item.note,
          contextModule,
          contextRecordId: targetId,
        });
        pendingRef.current = pendingRef.current.filter((current) => current.clientId !== item.clientId);
        sync();
      }
      setUploadMessage(queue.length > 1 ? 'Přílohy byly nahrány.' : 'Příloha byla nahrána.');
      return true;
    } catch (err) {
      setUploadError(
        err?.response?.data?.error?.message || err?.message || 'Přílohu se nepodařilo nahrát.'
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({
    hasPending() {
      return pendingRef.current.length > 0;
    },
    validatePending() {
      return validatePendingItems();
    },
    async uploadQueued(recordId) {
      if (pendingRef.current.length === 0) return;
      const uploaded = await runUpload(recordId);
      if (!uploaded) {
        throw new Error('Nahrání přílohy selhalo.');
      }
    },
  }));

  const pendingItems = pendingRef.current;
  const pendingCount = pendingItems.length;
  const isUploading = busy || Boolean(uploading);

  return (
    <section className="module-attachment-upload">
      <h5>Přílohy záznamu</h5>
      {!readOnly && (
        <>
          <div
            className={`attachment-dropzone${dragging ? ' is-dragging' : ''}${pendingCount > 0 ? ' has-file' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); }
            }}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); appendFiles(event.dataTransfer.files); }}
          >
            <AppIcon name="upload" size={22} weight="duotone" />
            <div>
              <strong>{pendingCount > 0 ? `Připraveno souborů: ${pendingCount}` : 'Přetáhněte přílohy sem'}</strong>
              <span>{pendingCount > 0 ? 'Nahrají se po uložení záznamu.' : 'nebo je vyberte kliknutím (lze i více najednou)'}</span>
            </div>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            className="attachment-file-input"
            type="file"
            multiple
            onChange={(event) => appendFiles(event.target.files)}
          />
        </>
      )}

      {!readOnly && pendingCount > 0 && (
        <div className="module-attachment-pending">
          {pendingItems.map((item) => (
            <div key={item.clientId} className="module-attachment-pending-row">
              <div className="module-attachment-pending-head">
                <div>
                  <strong>{item.file.name}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{formatSize(item.file.size)}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removePendingItem(item.clientId)}
                  disabled={isUploading}
                >
                  Odstranit
                </button>
              </div>
              <div className="module-attachment-pending-fields">
                <label>
                  Typ dokumentu *
                  <LookupSelect
                    category="document_type"
                    lookupByCategory={lookupByCategory}
                    value={item.documentType}
                    onChange={(event) => updatePendingItem(item.clientId, { documentType: event.target.value })}
                    disabled={isUploading}
                    required
                  />
                </label>
                <label>
                  Poznámka
                  <input
                    value={item.note}
                    onChange={(event) => updatePendingItem(item.clientId, { note: event.target.value })}
                    placeholder="Volitelný popis"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <DismissibleMessage message={uploadError} variant="error" />
      <DismissibleMessage message={uploadMessage} variant="success" />

      {isUploading && (
        <p className="muted">
          Nahrávám přílohy{Number.isFinite(Number(attachmentUploadProgress)) ? `: ${Math.round(Number(attachmentUploadProgress))} %` : '...'}
        </p>
      )}

      {recordAttachments.length > 0 && (
        <div className="module-attachment-list">
          <strong>Přílohy tohoto záznamu</strong>
          {recordAttachments.map((attachment) => (
            <div key={attachment.id} className="module-attachment-list-item">
              <div className="module-attachment-list-info">
                <span className="module-attachment-list-filename">{attachment.original_filename}</span>
                <span className="module-attachment-list-type muted">{lookupLabel(lookupByCategory, 'document_type', attachment.document_type_code)}</span>
              </div>
              <div className="module-attachment-list-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDownload(attachment)} title="Stáhnout přílohu">
                  <AppIcon name="download" size={16} />
                </button>
                {!readOnly && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(attachment)} title="Smazat přílohu">
                    <AppIcon name="delete" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export default ModuleAttachmentUpload;
