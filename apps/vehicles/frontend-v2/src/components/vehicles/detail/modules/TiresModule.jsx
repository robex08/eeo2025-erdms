import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';

const EMPTY_FORM = {
  season_code: '',
  status_code: 'active',
  tire_set_name: '',
  dimension: '',
  quantity: 4,
  tread_depth_mm: '',
  acquired_at: '',
  installed_at: '',
  removed_at: '',
  supplier_name: '',
  storage_location: '',
  cost_amount: '',
  note: '',
};

export default function TiresModule({
  tires = [],
  onCreateTires,
  onDeleteTires,
  tiresLoading,
  tiresError,
  tiresMessage,
  creatingTires,
  readOnly,
  lookupByCategory = {},
}) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  function handleEdit(tire) {
    setEditing(tire?.id || 'new');
    if (tire) {
      setFormData({
        ...EMPTY_FORM,
        ...tire,
        tread_depth_mm: tire.tread_depth_mm ?? '',
        cost_amount: tire.cost_amount ?? '',
        quantity: tire.quantity ?? 4,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }

  function handleCancel() { setEditing(null); setFormData(EMPTY_FORM); }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreateTires({
      ...formData,
      id: editing !== 'new' ? editing : undefined,
      tread_depth_mm: formData.tread_depth_mm === '' ? null : formData.tread_depth_mm,
      cost_amount: formData.cost_amount === '' ? null : formData.cost_amount,
      quantity: Number(formData.quantity) || 4,
    });
    handleCancel();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDelete(tire) {
    const label = tire.tire_set_name
      || lookupLabel(lookupByCategory, 'tire_season', tire.season_code);
    if (window.confirm(`Opravdu smazat sadu pneumatik${label ? ` "${label}"` : ''}?`)) {
      await onDeleteTires(tire);
    }
  }

  if (tiresLoading) return <p className="muted">Načítám pneumatiky...</p>;

  return (
    <div>
      {tiresError && <div className="error-box">{tiresError}</div>}
      {tiresMessage && <div className="success-box">{tiresMessage}</div>}

      {editing ? (
        <form onSubmit={handleSubmit} className="detail-form">
          <h4>{editing !== 'new' ? 'Upravit sadu pneumatik' : 'Nová sada pneumatik'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Sezóna *
              <LookupSelect
                name="season_code"
                category="tire_season"
                lookupByCategory={lookupByCategory}
                value={formData.season_code}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Stav *
              <LookupSelect
                name="status_code"
                category="tire_status"
                lookupByCategory={lookupByCategory}
                value={formData.status_code}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Rozměr
              <input name="dimension" value={formData.dimension || ''} onChange={handleChange} placeholder="205/55 R16" />
            </label>
            <label>
              Počet kusů
              <input type="number" name="quantity" min="1" max="20" value={formData.quantity} onChange={handleChange} />
            </label>
          </div>

          <label>
            Název sady
            <input name="tire_set_name" value={formData.tire_set_name || ''} onChange={handleChange} placeholder="Např. Michelin CrossClimate 2" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Hloubka dezénu (mm)
              <input type="number" name="tread_depth_mm" min="0" step="0.1" value={formData.tread_depth_mm === null ? '' : formData.tread_depth_mm} onChange={handleChange} />
            </label>
            <label>
              Datum pořízení
              <input type="date" name="acquired_at" value={formData.acquired_at || ''} onChange={handleChange} />
            </label>
            <label>
              Datum nasazení
              <input type="date" name="installed_at" value={formData.installed_at || ''} onChange={handleChange} />
            </label>
            <label>
              Datum sundání
              <input type="date" name="removed_at" value={formData.removed_at || ''} onChange={handleChange} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Dodavatel
              <input name="supplier_name" value={formData.supplier_name || ''} onChange={handleChange} />
            </label>
            <label>
              Umístění skladu
              <input name="storage_location" value={formData.storage_location || ''} onChange={handleChange} />
            </label>
            <label>
              Cena (Kč)
              <input type="number" name="cost_amount" min="0" step="0.01" value={formData.cost_amount === null ? '' : formData.cost_amount} onChange={handleChange} />
            </label>
          </div>

          <label>
            Poznámka
            <textarea name="note" rows={2} value={formData.note || ''} onChange={handleChange} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>Zrušit</button>
            <button type="submit" className="btn btn-primary" disabled={creatingTires}>
              {creatingTires ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => handleEdit(null)}>
              <AppIcon name="service" size={16} />
              Přidat sadu pneumatik
            </button>
          )}

          {tires.length === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>Žádné pneumatiky</p>
          ) : (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Sezóna</th>
                    <th>Rozměr / název</th>
                    <th>Počet</th>
                    <th>Stav</th>
                    <th>Dezén (mm)</th>
                    <th>Nasazeny</th>
                    <th>Cena</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {tires.map((tire) => (
                    <tr key={tire.id}>
                      <td>{lookupLabel(lookupByCategory, 'tire_season', tire.season_code)}</td>
                      <td>
                        <div>{tire.dimension || '-'}</div>
                        {tire.tire_set_name && <div className="muted" style={{ fontSize: '0.8rem' }}>{tire.tire_set_name}</div>}
                      </td>
                      <td>{tire.quantity ?? '-'}</td>
                      <td>{lookupLabel(lookupByCategory, 'tire_status', tire.status_code)}</td>
                      <td>{tire.tread_depth_mm ?? '-'}</td>
                      <td>{formatDateCs(tire.installed_at)}</td>
                      <td>{formatMoneyCs(tire.cost_amount, tire.cost_currency || 'CZK')}</td>
                      <td>
                        <div className="table-actions">
                          {!readOnly && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(tire)} title="Upravit">
                                <AppIcon name="edit" size={16} />
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(tire)} title="Smazat">
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
