import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';

const EMPTY_FORM = {
  funding_status_code: 'none',
  grant_title_code: '',
  call_code: '',
  provider_name: '',
  reference_number: '',
  award_date: '',
  eligible_amount: '',
  grant_amount: '',
  own_share_amount: '',
  sustainability_from: '',
  sustainability_to: '',
  note: '',
};

export default function FundingModule({
  funding = [],
  onCreateFunding,
  onDeleteFunding,
  fundingLoading,
  fundingError,
  fundingMessage,
  creatingFunding,
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
        eligible_amount: record.eligible_amount ?? '',
        grant_amount: record.grant_amount ?? '',
        own_share_amount: record.own_share_amount ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }

  function handleCancel() { setEditing(null); setFormData(EMPTY_FORM); }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreateFunding({
      ...formData,
      id: editing !== 'new' ? editing : undefined,
      eligible_amount: formData.eligible_amount === '' ? null : formData.eligible_amount,
      grant_amount: formData.grant_amount === '' ? null : formData.grant_amount,
      own_share_amount: formData.own_share_amount === '' ? null : formData.own_share_amount,
    });
    handleCancel();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDelete(record) {
    const label = lookupLabel(lookupByCategory, 'grant_title', record.grant_title_code) || record.reference_number;
    if (window.confirm(`Opravdu smazat záznam financování${label ? ` "${label}"` : ''}?`)) {
      await onDeleteFunding(record);
    }
  }

  if (fundingLoading) return <p className="muted">Načítám dotace...</p>;

  return (
    <div>
      {fundingError && <div className="error-box">{fundingError}</div>}
      {fundingMessage && <div className="success-box">{fundingMessage}</div>}

      {editing ? (
        <form onSubmit={handleSubmit} className="detail-form">
          <h4>{editing !== 'new' ? 'Upravit financování' : 'Nové financování'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Stav financování *
              <LookupSelect
                name="funding_status_code"
                category="funding_status"
                lookupByCategory={lookupByCategory}
                value={formData.funding_status_code}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Dotační titul
              <LookupSelect
                name="grant_title_code"
                category="grant_title"
                lookupByCategory={lookupByCategory}
                value={formData.grant_title_code}
                onChange={handleChange}
                placeholder="-- Nevybráno --"
              />
            </label>
            <label>
              Výzva / kód
              <input name="call_code" value={formData.call_code || ''} onChange={handleChange} placeholder="Např. 42/2024" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Poskytovatel
              <input name="provider_name" value={formData.provider_name || ''} onChange={handleChange} placeholder="Např. MMR ČR" />
            </label>
            <label>
              Číslo smlouvy / rozhodnutí
              <input name="reference_number" value={formData.reference_number || ''} onChange={handleChange} />
            </label>
            <label>
              Datum přiznání
              <input type="date" name="award_date" value={formData.award_date || ''} onChange={handleChange} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Způsobilé výdaje (Kč)
              <input type="number" name="eligible_amount" min="0" step="0.01" value={formData.eligible_amount === null ? '' : formData.eligible_amount} onChange={handleChange} />
            </label>
            <label>
              Dotace (Kč)
              <input type="number" name="grant_amount" min="0" step="0.01" value={formData.grant_amount === null ? '' : formData.grant_amount} onChange={handleChange} />
            </label>
            <label>
              Vlastní podíl (Kč)
              <input type="number" name="own_share_amount" min="0" step="0.01" value={formData.own_share_amount === null ? '' : formData.own_share_amount} onChange={handleChange} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label>
              Udržitelnost od
              <input type="date" name="sustainability_from" value={formData.sustainability_from || ''} onChange={handleChange} />
            </label>
            <label>
              Udržitelnost do
              <input type="date" name="sustainability_to" value={formData.sustainability_to || ''} onChange={handleChange} />
            </label>
          </div>

          <label>
            Poznámka
            <textarea name="note" rows={2} value={formData.note || ''} onChange={handleChange} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>Zrušit</button>
            <button type="submit" className="btn btn-primary" disabled={creatingFunding}>
              {creatingFunding ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => handleEdit(null)}>
              <AppIcon name="service" size={16} />
              Přidat financování
            </button>
          )}

          {funding.length === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>Žádné záznamy financování</p>
          ) : (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Titul</th>
                    <th>Poskytovatel / reference</th>
                    <th>Stav</th>
                    <th>Přiznáno</th>
                    <th>Dotace</th>
                    <th>Udržitelnost do</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {funding.map((record) => (
                    <tr key={record.id}>
                      <td>{lookupLabel(lookupByCategory, 'grant_title', record.grant_title_code) || '-'}</td>
                      <td>
                        <div>{record.provider_name || '-'}</div>
                        {record.reference_number && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>Č.j.: {record.reference_number}</div>
                        )}
                      </td>
                      <td>{lookupLabel(lookupByCategory, 'funding_status', record.funding_status_code)}</td>
                      <td>{formatDateCs(record.award_date)}</td>
                      <td>{formatMoneyCs(record.grant_amount, record.amount_currency || 'CZK')}</td>
                      <td>{formatDateCs(record.sustainability_to)}</td>
                      <td>
                        <div className="table-actions">
                          {!readOnly && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(record)} title="Upravit">
                                <AppIcon name="edit" size={16} />
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(record)} title="Smazat">
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
