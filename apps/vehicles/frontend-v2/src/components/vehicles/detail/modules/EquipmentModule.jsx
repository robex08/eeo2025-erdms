import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';

const EMPTY_FORM = {
  equipment_type_code: '',
  status_code: 'active',
  equipment_name: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  inventory_number: '',
  supplier_name: '',
  acquired_at: '',
  warranty_valid_to: '',
  revision_valid_to: '',
  cost_amount: '',
  note: '',
};

export default function EquipmentModule({
  vehicleEquipment = [],
  onCreateEquipment,
  onDeleteEquipment,
  equipmentLoading,
  equipmentError,
  equipmentMessage,
  creatingEquipment,
  readOnly,
  lookupByCategory = {},
}) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  function handleEdit(equipment) {
    setEditing(equipment?.id || 'new');
    if (equipment) {
      setFormData({
        ...EMPTY_FORM,
        ...equipment,
        cost_amount: equipment.cost_amount ?? '',
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
    await onCreateEquipment({
      ...formData,
      id: editing !== 'new' ? editing : undefined,
      cost_amount: formData.cost_amount === '' ? null : formData.cost_amount,
    });
    handleCancel();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDelete(equipment) {
    const label = equipment.equipment_name || lookupLabel(lookupByCategory, 'equipment_type', equipment.equipment_type_code);
    if (window.confirm(`Opravdu smazat vybavení${label ? ` "${label}"` : ''}?`)) {
      await onDeleteEquipment(equipment);
    }
  }

  if (equipmentLoading) {
    return <p className="muted">Načítám vybavení...</p>;
  }

  return (
    <div>
      {equipmentError && <div className="error-box">{equipmentError}</div>}
      {equipmentMessage && <div className="success-box">{equipmentMessage}</div>}

      {editing ? (
        <form onSubmit={handleSubmit} className="detail-form">
          <h4>{editing !== 'new' ? 'Upravit vybavení' : 'Nové vybavení'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Typ vybavení *
              <LookupSelect
                name="equipment_type_code"
                category="equipment_type"
                lookupByCategory={lookupByCategory}
                value={formData.equipment_type_code}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Stav *
              <LookupSelect
                name="status_code"
                category="equipment_status"
                lookupByCategory={lookupByCategory}
                value={formData.status_code}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label>
            Název položky
            <input
              name="equipment_name"
              value={formData.equipment_name || ''}
              onChange={handleChange}
              placeholder="Např. LP15 defibrilátor"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Výrobce
              <input name="manufacturer" value={formData.manufacturer || ''} onChange={handleChange} />
            </label>
            <label>
              Model
              <input name="model" value={formData.model || ''} onChange={handleChange} />
            </label>
            <label>
              Sériové číslo
              <input name="serial_number" value={formData.serial_number || ''} onChange={handleChange} />
            </label>
            <label>
              Inventární číslo
              <input name="inventory_number" value={formData.inventory_number || ''} onChange={handleChange} />
            </label>
          </div>

          <label>
            Dodavatel
            <input name="supplier_name" value={formData.supplier_name || ''} onChange={handleChange} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Datum pořízení
              <input type="date" name="acquired_at" value={formData.acquired_at || ''} onChange={handleChange} />
            </label>
            <label>
              Záruka do
              <input type="date" name="warranty_valid_to" value={formData.warranty_valid_to || ''} onChange={handleChange} />
            </label>
            <label>
              Platnost revize do
              <input type="date" name="revision_valid_to" value={formData.revision_valid_to || ''} onChange={handleChange} />
            </label>
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
          </div>

          <label>
            Poznámka
            <textarea name="note" rows={2} value={formData.note || ''} onChange={handleChange} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>
              Zrušit
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingEquipment}>
              {creatingEquipment ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => handleEdit(null)}>
              <AppIcon name="detail" size={16} />
              Přidat vybavení
            </button>
          )}

          {vehicleEquipment.length === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>Žádné vybavení</p>
          ) : (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Název / model</th>
                    <th>Sériové číslo</th>
                    <th>Stav</th>
                    <th>Revize do</th>
                    <th>Cena</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleEquipment.map((equipment) => (
                    <tr key={equipment.id}>
                      <td>{lookupLabel(lookupByCategory, 'equipment_type', equipment.equipment_type_code)}</td>
                      <td>
                        <div>{equipment.equipment_name || '-'}</div>
                        {(equipment.manufacturer || equipment.model) && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>
                            {[equipment.manufacturer, equipment.model].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{equipment.serial_number || '-'}</div>
                        {equipment.inventory_number && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>Inv: {equipment.inventory_number}</div>
                        )}
                      </td>
                      <td>{lookupLabel(lookupByCategory, 'equipment_status', equipment.status_code)}</td>
                      <td>{formatDateCs(equipment.revision_valid_to)}</td>
                      <td>{formatMoneyCs(equipment.cost_amount, equipment.cost_currency || 'CZK')}</td>
                      <td>
                        <div className="table-actions">
                          {!readOnly && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEdit(equipment)}
                                title="Upravit"
                              >
                                <AppIcon name="edit" size={16} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDelete(equipment)}
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
