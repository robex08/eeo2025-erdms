import React, { useMemo, useRef, useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';
import ModuleAttachmentUpload from './ModuleAttachmentUpload';
import { usePersistentDialog } from '../../../ui/PersistentDialog';
import DismissibleMessage from '../../../ui/DismissibleMessage';

const EMPTY_FORM = {
  service_type_code: '',
  service_kind_code: '',
  status_code: 'planned',
  supplier_name: '',
  service_station_id: '',
  service_station: null,
  register_service_station: false,
  service_date: '',
  planned_date: '',
  completed_date: '',
  description: '',
  parts_description: '',
  cost_amount: '',
  external_reference: '',
};

export default function ServiceRecordsModule({
  serviceRecords = [],
  serviceStations = [],
  onCreateServiceRecord,
  onCreateServiceStation,
  onDeleteServiceRecord,
  serviceRecordsLoading,
  serviceRecordsError,
  serviceRecordMessage,
  creatingServiceRecord,
  attachmentUploadProgress,
  attachments = [], onUploadAttachment, onDeleteAttachment, onDownloadAttachment, uploadingAttachment,
  readOnly,
  lookupByCategory = {},
}) {
  const { confirm, showStatus } = usePersistentDialog();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitPhase, setSubmitPhase] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [newStationDialogOpen, setNewStationDialogOpen] = useState(false);
  const [newStationSaving, setNewStationSaving] = useState(false);
  const [newStationError, setNewStationError] = useState('');
  const [newStationForm, setNewStationForm] = useState({
    organizace: '',
    nazev_stanoviste: '',
    mesto: '',
    ulice: '',
    psc: '',
    w_ln_match: '',
  });
  const attachmentUploadRef = useRef(null);
  const attachmentQueueRef = useRef([]);

  const orderedServiceStations = useMemo(() => (
    [...serviceStations].sort((left, right) => (
      String(left.nazev_stanoviste || left.mesto || '').localeCompare(
        String(right.nazev_stanoviste || right.mesto || ''),
        'cs',
        { sensitivity: 'base' }
      )
    ))
  ), [serviceStations]);

  function handleEdit(record) {
    setEditing(record?.id || 'new');
    if (record) {
      setFormData({
        ...EMPTY_FORM,
        ...record,
        service_station: record.service_station_name ? {
          organization: record.service_organization || '',
          name: record.service_station_name,
          city: record.service_city || '',
          street: record.service_street || '',
          postal_code: record.service_postal_code || '',
        } : null,
        service_station_id: '',
        register_service_station: false,
        cost_amount: record.cost_amount ?? '',
      });
      setSelectedStationId('');
    } else {
      setFormData(EMPTY_FORM);
      setSelectedStationId('');
    }
  }

  function handleCancel() {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setSelectedStationId('');
    attachmentQueueRef.current = [];
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitPhase) return;
    if (!attachmentUploadRef.current?.validatePending()) return;

    const hasAttachments = attachmentQueueRef.current.length > 0;
    setSubmitPhase('record');
    showStatus({ title: hasAttachments ? 'Ukládám záznam a přílohy' : 'Ukládám záznam', message: hasAttachments ? 'Záznam se ukládá a po dokončení se nahrají i přílohy.' : 'Záznam se ukládá. Prosím čekejte.' });
    try {
      const payload = {
        ...formData,
        id: editing !== 'new' ? editing : undefined,
        cost_amount: formData.cost_amount === '' ? null : formData.cost_amount,
      };
      const result = await onCreateServiceRecord(payload);
      const recordId = Number(result?.id || (editing !== 'new' ? editing : 0));
      if (!Number.isFinite(recordId) || recordId <= 0) {
        showStatus({ title: 'Ukládání se nezdařilo', message: 'Záznam nebyl uložen. Zkontrolujte vstupní data a zkuste to znovu.', confirmLabel: 'OK' });
        return;
      }

      if (hasAttachments) {
        setSubmitPhase('attachments');
        showStatus({ title: 'Nahrávám přílohy', message: 'Přidávám přiložené soubory k záznamu. Prosím čekejte.' });
        await attachmentUploadRef.current?.uploadQueued(recordId);
      }
      handleCancel();
      showStatus({ title: 'Úspěšně uloženo', message: hasAttachments ? 'Záznam i všechny přílohy byly úspěšně uloženy.' : 'Záznam byl úspěšně uložen.', confirmLabel: 'OK' });
    } catch {
      showStatus({ title: 'Ukládání se nezdařilo', message: 'Záznam nebo přílohy nebyly uložené. Zkuste akci opakovat.', confirmLabel: 'OK' });
    } finally {
      setSubmitPhase('');
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleStationChange(event) {
    const stationId = event.target.value;
    setSelectedStationId(stationId);
    const station = orderedServiceStations.find((item) => String(item.id) === stationId);
    setFormData((prev) => ({
      ...prev,
      register_service_station: false,
      service_station_id: stationId,
      supplier_name: station?.nazev_stanoviste || station?.mesto || '',
      service_station: station ? {
        organization: station.organizace || '',
        name: station.nazev_stanoviste || station.mesto || '',
        city: station.mesto || '',
        street: station.ulice || '',
        postal_code: station.psc || '',
      } : null,
    }));
  }

  function openNewStationDialog() {
    setNewStationError('');
    setNewStationForm({
      organizace: '',
      nazev_stanoviste: '',
      mesto: '',
      ulice: '',
      psc: '',
      w_ln_match: '',
    });
    setNewStationDialogOpen(true);
  }

  function closeNewStationDialog() {
    if (!newStationSaving) {
      setNewStationDialogOpen(false);
      setNewStationError('');
    }
  }

  async function handleCreateStation() {
    if (!newStationForm.organizace.trim() || !newStationForm.nazev_stanoviste.trim() || !newStationForm.mesto.trim()) {
      setNewStationError('Vyplňte organizaci, název servisu a město.');
      return;
    }

    setNewStationSaving(true);
    setNewStationError('');
    try {
      const station = await onCreateServiceStation({ ...newStationForm, typ: 'Servis' });
      const stationId = String(station.id);
      setSelectedStationId(stationId);
      setFormData((previous) => ({
        ...previous,
        register_service_station: false,
        service_station_id: stationId,
        supplier_name: station.nazev_stanoviste || station.mesto || '',
        service_station: {
          organization: station.organizace || '',
          name: station.nazev_stanoviste || station.mesto || '',
          city: station.mesto || '',
          street: station.ulice || '',
          postal_code: station.psc || '',
        },
      }));
      setNewStationDialogOpen(false);
    } catch (error) {
      const apiMessage = error?.response?.data?.error?.message;
      setNewStationError(apiMessage || 'Nový servis se nepodařilo uložit.');
    } finally {
      setNewStationSaving(false);
    }
  }

  async function handleDelete(record) {
    const label = record.description || lookupLabel(lookupByCategory, 'service_type', record.service_type_code);
    if (await confirm({ title: 'Smazat servisní záznam', message: `Opravdu smazat servisní záznam${label ? ` „${label}“` : ''}?`, confirmLabel: 'Smazat', danger: true })) {
      await onDeleteServiceRecord(record);
    }
  }

  if (serviceRecordsLoading) {
    return <p className="muted">Načítám servisní záznamy...</p>;
  }

  return (
    <div>
      <DismissibleMessage message={serviceRecordsError} variant="error" />
      <DismissibleMessage message={serviceRecordMessage} variant="success" />

      {editing ? (
        <form onSubmit={handleSubmit} className="detail-form">
          <h4>{editing !== 'new' ? 'Upravit servisní záznam' : 'Nový servisní záznam'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Typ servisu *
              <LookupSelect
                name="service_type_code"
                category="service_type"
                lookupByCategory={lookupByCategory}
                value={formData.service_type_code}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Druh úkonu
              <LookupSelect
                name="service_kind_code"
                category="service_kind"
                lookupByCategory={lookupByCategory}
                value={formData.service_kind_code}
                onChange={handleChange}
              />
            </label>

            <label>
              Stav *
              <LookupSelect
                name="status_code"
                category="service_status"
                lookupByCategory={lookupByCategory}
                value={formData.status_code}
                onChange={handleChange}
                required
              />
            </label>

          </div>

          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Servis</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select id="service-station" value={selectedStationId} onChange={handleStationChange} style={{ flex: 1 }}>
                <option value="">Vyberte servis ze seznamu stanovišť</option>
                {orderedServiceStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {[station.organizace, station.nazev_stanoviste || station.mesto, station.mesto, station.ulice]
                      .filter(Boolean)
                      .join(' - ')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="table-icon-btn table-icon-btn-primary"
                style={{ width: 'var(--service-station-select-height, 44px)', height: 'var(--service-station-select-height, 44px)', minWidth: 'var(--service-station-select-height, 44px)', minHeight: 'var(--service-station-select-height, 44px)' }}
                onClick={openNewStationDialog}
                title="Přidat nový servis do seznamu stanovišť"
                aria-label="Přidat nový servis"
              >
                <AppIcon name="add" size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Datum servisu
              <input type="date" name="service_date" value={formData.service_date || ''} onChange={handleChange} />
            </label>
            <label>
              Plánované datum
              <input type="date" name="planned_date" value={formData.planned_date || ''} onChange={handleChange} />
            </label>
            <label>
              Datum dokončení
              <input type="date" name="completed_date" value={formData.completed_date || ''} onChange={handleChange} />
            </label>
          </div>

          <label>
            Popis
            <textarea
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Krátký popis zákroku"
            />
          </label>

          <label>
            Použité díly
            <textarea
              name="parts_description"
              rows={2}
              value={formData.parts_description || ''}
              onChange={handleChange}
              placeholder="Seznam použitých náhradních dílů"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Cena (Kč)
              <input
                type="number"
                name="cost_amount"
                value={formData.cost_amount === null ? '' : formData.cost_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </label>
            <label>
              Externí reference
              <input
                name="external_reference"
                value={formData.external_reference || ''}
                onChange={handleChange}
                placeholder="Číslo zakázky, protokolu..."
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>
              Zrušit
            </button>
              <button type="submit" className="btn btn-primary" disabled={Boolean(submitPhase) || creatingServiceRecord || uploadingAttachment}>
                {submitPhase === 'attachments'
                  ? `Nahrávám přílohy${Number.isFinite(Number(attachmentUploadProgress)) ? ` (${Math.round(Number(attachmentUploadProgress))} %)` : '...'}`
                  : submitPhase === 'record' || creatingServiceRecord ? 'Ukládám záznam...' : 'Uložit'}
            </button>
          </div>
          <ModuleAttachmentUpload ref={attachmentUploadRef} queueRef={attachmentQueueRef} contextModule="service" contextRecordId={editing === 'new' ? null : editing} attachments={attachments} onUpload={onUploadAttachment} onDelete={onDeleteAttachment} onDownload={onDownloadAttachment} uploading={uploadingAttachment} readOnly={readOnly} lookupByCategory={lookupByCategory} attachmentUploadProgress={attachmentUploadProgress} />
        </form>
      ) : (
        <>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => handleEdit(null)}>
              <AppIcon name="service" size={16} />
              Přidat servisní záznam
            </button>
          )}

          {serviceRecords.length === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>Žádné servisní záznamy</p>
          ) : (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Typ / úkon</th>
                    <th>Stav</th>
                    <th>Stanice / dodavatel</th>
                    <th>Cena</th>
                    <th className="module-table-actions">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDateCs(record.service_date || record.planned_date)}</td>
                      <td>
                        <div>{lookupLabel(lookupByCategory, 'service_type', record.service_type_code)}</div>
                        {record.service_kind_code && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>
                            {lookupLabel(lookupByCategory, 'service_kind', record.service_kind_code)}
                          </div>
                        )}
                      </td>
                      <td>{lookupLabel(lookupByCategory, 'service_status', record.status_code)}</td>
                      <td>
                        <div>{record.service_station_name || record.supplier_name || '-'}</div>
                        {(record.service_city || record.service_street) && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>
                            {[record.service_city, record.service_street, record.service_postal_code].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{formatMoneyCs(record.cost_amount, record.cost_currency || 'CZK')}</td>
                      <td className="module-table-actions">
                        <div className="table-actions">
                          {!readOnly && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEdit(record)}
                                title="Upravit"
                              >
                                <AppIcon name="edit" size={16} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDelete(record)}
                                title="Smazat"
                              >
                                <AppIcon name="delete" size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {newStationDialogOpen && (
        <div className="station-edit-modal-backdrop" role="presentation" onClick={closeNewStationDialog}>
          <div className="station-edit-modal" role="dialog" aria-modal="true" aria-label="Nový servis" onClick={(event) => event.stopPropagation()}>
            <div className="station-edit-modal-head">
              <h3 className="title-with-icon">
                <AppIcon name="service" size={18} weight="duotone" />
                <span>Nový servis</span>
              </h3>
              <button className="table-icon-btn" type="button" onClick={closeNewStationDialog} aria-label="Zavřít okno" disabled={newStationSaving}>
                <AppIcon name="close" size={16} />
              </button>
            </div>

            <p className="muted">Servis bude uložen do seznamu stanovišť a ihned vybrán pro tento záznam.</p>

            <div className="station-edit-form-grid">
              <label>
                Organizace / Firma
                <input className="search-input" value={newStationForm.organizace} onChange={(event) => setNewStationForm((previous) => ({ ...previous, organizace: event.target.value }))} disabled={newStationSaving} />
              </label>
              <label>
                Typ
                <input className="search-input station-edit-readonly-input" value="Servis" readOnly />
              </label>
              <label>
                Název stanoviště
                <input className="search-input" value={newStationForm.nazev_stanoviste} onChange={(event) => setNewStationForm((previous) => ({ ...previous, nazev_stanoviste: event.target.value }))} disabled={newStationSaving} />
              </label>
              <label>
                Město
                <input className="search-input" value={newStationForm.mesto} onChange={(event) => setNewStationForm((previous) => ({ ...previous, mesto: event.target.value }))} disabled={newStationSaving} />
              </label>
              <label>
                PSČ
                <input className="search-input" value={newStationForm.psc} onChange={(event) => setNewStationForm((previous) => ({ ...previous, psc: event.target.value }))} disabled={newStationSaving} />
              </label>
              <label className="station-edit-grid-full">
                Ulice
                <input className="search-input" value={newStationForm.ulice} onChange={(event) => setNewStationForm((previous) => ({ ...previous, ulice: event.target.value }))} disabled={newStationSaving} />
              </label>
              <label className="station-edit-grid-full">
                Webdispečink lokace
                <input className="search-input" value={newStationForm.w_ln_match} placeholder="CZ Město, Ulice" onChange={(event) => setNewStationForm((previous) => ({ ...previous, w_ln_match: event.target.value }))} disabled={newStationSaving} />
              </label>
            </div>

            <DismissibleMessage message={newStationError} variant="status" />

            <div className="station-edit-modal-actions">
              <button className="table-pager-btn" type="button" onClick={closeNewStationDialog} disabled={newStationSaving}>Zrušit</button>
              <button className="table-pager-btn station-edit-save-btn" type="button" onClick={() => void handleCreateStation()} disabled={newStationSaving}>
                {newStationSaving ? 'Ukládám...' : 'Vytvořit servis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
