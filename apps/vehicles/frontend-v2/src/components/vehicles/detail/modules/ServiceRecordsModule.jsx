import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';

const EMPTY_FORM = {
  service_type_code: '',
  service_kind_code: '',
  status_code: 'planned',
  service_station_code: '',
  supplier_name: '',
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
  onCreateServiceRecord,
  onDeleteServiceRecord,
  serviceRecordsLoading,
  serviceRecordsError,
  serviceRecordMessage,
  creatingServiceRecord,
  readOnly,
  lookupByCategory = {},
}) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  function handleEdit(record) {
    setEditing(record?.id || 'new');
    if (record) {
      setFormData({
        ...EMPTY_FORM,
        ...record,
        cost_amount: record.cost_amount ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }

  function handleCancel() {
    setEditing(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...formData,
      id: editing !== 'new' ? editing : undefined,
      cost_amount: formData.cost_amount === '' ? null : formData.cost_amount,
    };
    await onCreateServiceRecord(payload);
    handleCancel();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDelete(record) {
    const label = record.description || lookupLabel(lookupByCategory, 'service_type', record.service_type_code);
    if (window.confirm(`Opravdu smazat servisní záznam${label ? ` "${label}"` : ''}?`)) {
      await onDeleteServiceRecord(record);
    }
  }

  if (serviceRecordsLoading) {
    return <p className="muted">Načítám servisní záznamy...</p>;
  }

  return (
    <div>
      {serviceRecordsError && <div className="error-box">{serviceRecordsError}</div>}
      {serviceRecordMessage && <div className="success-box">{serviceRecordMessage}</div>}

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

            <label>
              Servisní stanice
              <LookupSelect
                name="service_station_code"
                category="service_station"
                lookupByCategory={lookupByCategory}
                value={formData.service_station_code}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Dodavatel / název servisu
            <input
              name="supplier_name"
              value={formData.supplier_name || ''}
              onChange={handleChange}
              placeholder="Např. AutoServis Novák s.r.o."
            />
          </label>

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
            <button type="submit" className="btn btn-primary" disabled={creatingServiceRecord}>
              {creatingServiceRecord ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
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
                    <th>Akce</th>
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
                        <div>{lookupLabel(lookupByCategory, 'service_station', record.service_station_code) || '-'}</div>
                        {record.supplier_name && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>{record.supplier_name}</div>
                        )}
                      </td>
                      <td>{formatMoneyCs(record.cost_amount, record.cost_currency || 'CZK')}</td>
                      <td>
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
    </div>
  );
}
