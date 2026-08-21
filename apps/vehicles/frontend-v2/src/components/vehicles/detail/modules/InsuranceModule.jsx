import React, { useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';

const EMPTY_POLICY = {
  policy_type_code: '',
  policy_number: '',
  insurer_name: '',
  valid_from: '',
  valid_to: '',
  premium_amount: '',
  deductible_amount: '',
  note: '',
};

const EMPTY_CLAIM = {
  insurance_policy_id: '',
  claim_status_code: 'open',
  claim_date: '',
  settled_date: '',
  title: '',
  description: '',
  payout_amount: '',
  deductible_amount: '',
  external_reference: '',
};

export default function InsuranceModule({
  insurancePolicies = [],
  claims = [],
  onCreateInsurancePolicy,
  onDeleteInsurancePolicy,
  onCreateClaim,
  onDeleteClaim,
  insuranceLoading,
  insuranceError,
  insuranceMessage,
  creatingInsurance,
  creatingClaim,
  readOnly,
  lookupByCategory = {},
}) {
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [policyData, setPolicyData] = useState(EMPTY_POLICY);
  const [claimData, setClaimData] = useState(EMPTY_CLAIM);

  const insurerOptions = Array.isArray(lookupByCategory.insurance_company)
    ? lookupByCategory.insurance_company.filter((i) => i && i.is_active !== 0)
    : [];

  function editPolicy(policy) {
    setEditingPolicy(policy?.id || 'new');
    setPolicyData(policy
      ? { ...EMPTY_POLICY, ...policy, premium_amount: policy.premium_amount ?? '', deductible_amount: policy.deductible_amount ?? '' }
      : EMPTY_POLICY);
  }

  function editClaim(claim) {
    setEditingClaim(claim?.id || 'new');
    setClaimData(claim
      ? { ...EMPTY_CLAIM, ...claim, payout_amount: claim.payout_amount ?? '', deductible_amount: claim.deductible_amount ?? '', insurance_policy_id: claim.insurance_policy_id ?? '' }
      : EMPTY_CLAIM);
  }

  function cancelPolicy() { setEditingPolicy(null); setPolicyData(EMPTY_POLICY); }
  function cancelClaim() { setEditingClaim(null); setClaimData(EMPTY_CLAIM); }

  async function submitPolicy(e) {
    e.preventDefault();
    await onCreateInsurancePolicy({
      ...policyData,
      id: editingPolicy !== 'new' ? editingPolicy : undefined,
      premium_amount: policyData.premium_amount === '' ? null : policyData.premium_amount,
      deductible_amount: policyData.deductible_amount === '' ? null : policyData.deductible_amount,
    });
    cancelPolicy();
  }

  async function submitClaim(e) {
    e.preventDefault();
    await onCreateClaim({
      ...claimData,
      id: editingClaim !== 'new' ? editingClaim : undefined,
      insurance_policy_id: claimData.insurance_policy_id === '' ? null : Number(claimData.insurance_policy_id),
      payout_amount: claimData.payout_amount === '' ? null : claimData.payout_amount,
      deductible_amount: claimData.deductible_amount === '' ? null : claimData.deductible_amount,
    });
    cancelClaim();
  }

  function changePolicy(e) { setPolicyData((p) => ({ ...p, [e.target.name]: e.target.value })); }
  function changeClaim(e) { setClaimData((p) => ({ ...p, [e.target.name]: e.target.value })); }

  async function deletePolicy(policy) {
    if (window.confirm(`Opravdu smazat pojistnou smlouvu${policy.policy_number ? ` č. ${policy.policy_number}` : ''}?`)) {
      await onDeleteInsurancePolicy(policy);
    }
  }

  async function deleteClaim(claim) {
    if (window.confirm(`Opravdu smazat škodní událost${claim.title ? ` "${claim.title}"` : ''}?`)) {
      await onDeleteClaim(claim);
    }
  }

  if (insuranceLoading) return <p className="muted">Načítám pojištění...</p>;

  const activePolicies = insurancePolicies.filter((p) => !p.deleted_at);

  return (
    <div>
      {insuranceError && <div className="error-box">{insuranceError}</div>}
      {insuranceMessage && <div className="success-box">{insuranceMessage}</div>}

      <section style={{ marginBottom: '2rem' }}>
        <h4>Pojistné smlouvy</h4>

        {editingPolicy ? (
          <form onSubmit={submitPolicy} className="detail-form">
            <h5>{editingPolicy !== 'new' ? 'Upravit smlouvu' : 'Nová pojistná smlouva'}</h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label>
                Typ pojištění *
                <LookupSelect
                  name="policy_type_code"
                  category="insurance_policy_type"
                  lookupByCategory={lookupByCategory}
                  value={policyData.policy_type_code}
                  onChange={changePolicy}
                  required
                />
              </label>
              <label>
                Číslo smlouvy
                <input name="policy_number" value={policyData.policy_number || ''} onChange={changePolicy} />
              </label>
              <label>
                Pojišťovna
                <input
                  name="insurer_name"
                  value={policyData.insurer_name || ''}
                  onChange={changePolicy}
                  list="insurer-suggestions"
                  placeholder="Vyberte nebo napište"
                />
                <datalist id="insurer-suggestions">
                  {insurerOptions.map((i) => (
                    <option key={i.code} value={i.item_name} />
                  ))}
                </datalist>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <label>
                Platnost od
                <input type="date" name="valid_from" value={policyData.valid_from || ''} onChange={changePolicy} />
              </label>
              <label>
                Platnost do
                <input type="date" name="valid_to" value={policyData.valid_to || ''} onChange={changePolicy} />
              </label>
              <label>
                Roční pojistné (Kč)
                <input type="number" name="premium_amount" value={policyData.premium_amount === null ? '' : policyData.premium_amount} onChange={changePolicy} min="0" step="0.01" />
              </label>
              <label>
                Spoluúčast (Kč)
                <input type="number" name="deductible_amount" value={policyData.deductible_amount === null ? '' : policyData.deductible_amount} onChange={changePolicy} min="0" step="0.01" />
              </label>
            </div>

            <label>
              Poznámka
              <textarea name="note" rows={2} value={policyData.note || ''} onChange={changePolicy} />
            </label>

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={cancelPolicy}>Zrušit</button>
              <button type="submit" className="btn btn-primary" disabled={creatingInsurance}>
                {creatingInsurance ? 'Ukládám...' : 'Uložit'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {!readOnly && (
              <button className="btn btn-primary" onClick={() => editPolicy(null)} style={{ marginTop: '0.5rem' }}>
                <AppIcon name="service" size={16} />
                Přidat pojistnou smlouvu
              </button>
            )}

            {activePolicies.length === 0 ? (
              <p className="muted" style={{ marginTop: '1rem' }}>Žádné pojistné smlouvy</p>
            ) : (
              <div className="data-table" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Typ</th>
                      <th>Číslo smlouvy</th>
                      <th>Pojišťovna</th>
                      <th>Platnost</th>
                      <th>Pojistné</th>
                      <th>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePolicies.map((policy) => (
                      <tr key={policy.id}>
                        <td>{lookupLabel(lookupByCategory, 'insurance_policy_type', policy.policy_type_code)}</td>
                        <td>{policy.policy_number || '-'}</td>
                        <td>{policy.insurer_name || '-'}</td>
                        <td>{formatDateCs(policy.valid_from)} – {formatDateCs(policy.valid_to)}</td>
                        <td>{formatMoneyCs(policy.premium_amount, policy.premium_currency || 'CZK')}</td>
                        <td>
                          <div className="table-actions">
                            {!readOnly && (
                              <>
                                <button className="btn btn-ghost btn-sm" onClick={() => editPolicy(policy)} title="Upravit">
                                  <AppIcon name="edit" size={16} />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => deletePolicy(policy)} title="Smazat">
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
      </section>

      <section>
        <h4>Škodní události</h4>

        {editingClaim ? (
          <form onSubmit={submitClaim} className="detail-form">
            <h5>{editingClaim !== 'new' ? 'Upravit škodní událost' : 'Nová škodní událost'}</h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label>
                Vázáno na smlouvu
                <select name="insurance_policy_id" value={claimData.insurance_policy_id || ''} onChange={changeClaim}>
                  <option value="">-- Bez vazby --</option>
                  {activePolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number || `Smlouva #${p.id}`} ({lookupLabel(lookupByCategory, 'insurance_policy_type', p.policy_type_code)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stav *
                <LookupSelect
                  name="claim_status_code"
                  category="claim_status"
                  lookupByCategory={lookupByCategory}
                  value={claimData.claim_status_code}
                  onChange={changeClaim}
                  required
                />
              </label>
              <label>
                Datum události
                <input type="date" name="claim_date" value={claimData.claim_date || ''} onChange={changeClaim} />
              </label>
              <label>
                Datum uzavření
                <input type="date" name="settled_date" value={claimData.settled_date || ''} onChange={changeClaim} />
              </label>
            </div>

            <label>
              Název události
              <input name="title" value={claimData.title || ''} onChange={changeClaim} placeholder="Např. Kolize na křižovatce" />
            </label>

            <label>
              Popis
              <textarea name="description" rows={3} value={claimData.description || ''} onChange={changeClaim} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <label>
                Plnění (Kč)
                <input type="number" name="payout_amount" value={claimData.payout_amount === null ? '' : claimData.payout_amount} onChange={changeClaim} min="0" step="0.01" />
              </label>
              <label>
                Spoluúčast (Kč)
                <input type="number" name="deductible_amount" value={claimData.deductible_amount === null ? '' : claimData.deductible_amount} onChange={changeClaim} min="0" step="0.01" />
              </label>
              <label>
                Externí reference
                <input name="external_reference" value={claimData.external_reference || ''} onChange={changeClaim} placeholder="Číslo škodní události" />
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={cancelClaim}>Zrušit</button>
              <button type="submit" className="btn btn-primary" disabled={creatingClaim}>
                {creatingClaim ? 'Ukládám...' : 'Uložit'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {!readOnly && (
              <button className="btn btn-primary" onClick={() => editClaim(null)} style={{ marginTop: '0.5rem' }}>
                <AppIcon name="warning" size={16} />
                Přidat škodní událost
              </button>
            )}

            {claims.length === 0 ? (
              <p className="muted" style={{ marginTop: '1rem' }}>Žádné škodní události</p>
            ) : (
              <div className="data-table" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Název / referenc.</th>
                      <th>Smlouva</th>
                      <th>Stav</th>
                      <th>Plnění</th>
                      <th>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => {
                      const linkedPolicy = activePolicies.find((p) => p.id === claim.insurance_policy_id);
                      return (
                        <tr key={claim.id}>
                          <td>{formatDateCs(claim.claim_date)}</td>
                          <td>
                            <div>{claim.title || '-'}</div>
                            {claim.external_reference && (
                              <div className="muted" style={{ fontSize: '0.8rem' }}>Ref: {claim.external_reference}</div>
                            )}
                          </td>
                          <td>{linkedPolicy ? (linkedPolicy.policy_number || `Smlouva #${linkedPolicy.id}`) : '-'}</td>
                          <td>{lookupLabel(lookupByCategory, 'claim_status', claim.claim_status_code)}</td>
                          <td>{formatMoneyCs(claim.payout_amount, claim.payout_currency || 'CZK')}</td>
                          <td>
                            <div className="table-actions">
                              {!readOnly && (
                                <>
                                  <button className="btn btn-ghost btn-sm" onClick={() => editClaim(claim)} title="Upravit">
                                    <AppIcon name="edit" size={16} />
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => deleteClaim(claim)} title="Smazat">
                                    <AppIcon name="delete" size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
