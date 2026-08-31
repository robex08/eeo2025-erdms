import React, { useRef, useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';
import ModuleAttachmentUpload from './ModuleAttachmentUpload';
import { usePersistentDialog } from '../../../ui/PersistentDialog';
import DismissibleMessage from '../../../ui/DismissibleMessage';

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

export default function InsuranceModule({
  insurancePolicies = [],
  onCreateInsurancePolicy,
  onDeleteInsurancePolicy,
  insuranceLoading,
  insuranceError,
  insuranceMessage,
  creatingInsurance,
  attachmentUploadProgress,
  attachments = [], onUploadAttachment, onDeleteAttachment, onDownloadAttachment, uploadingAttachment,
  readOnly,
  lookupByCategory = {},
}) {
  const { confirm, showStatus } = usePersistentDialog();
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyData, setPolicyData] = useState(EMPTY_POLICY);
  const policyAttachmentUploadRef = useRef(null);
  const policyAttachmentQueueRef = useRef([]);
  const [policySubmitPhase, setPolicySubmitPhase] = useState('');

  const insurerOptions = Array.isArray(lookupByCategory.insurance_company)
    ? lookupByCategory.insurance_company.filter((i) => i && i.is_active !== 0)
    : [];
  const hasCurrentInsurerOption = insurerOptions.some(
    (item) => String(item.item_name || '').trim() === String(policyData.insurer_name || '').trim()
  );

  function editPolicy(policy) {
    setEditingPolicy(policy?.id || 'new');
    setPolicyData(policy
      ? { ...EMPTY_POLICY, ...policy, premium_amount: policy.premium_amount ?? '', deductible_amount: policy.deductible_amount ?? '' }
      : EMPTY_POLICY);
  }

  function cancelPolicy() { setEditingPolicy(null); setPolicyData(EMPTY_POLICY); policyAttachmentQueueRef.current = []; }

  async function submitPolicy(e) {
    e.preventDefault();
    if (policySubmitPhase) return;
    if (!policyAttachmentUploadRef.current?.validatePending()) return;

    const hasAttachments = policyAttachmentQueueRef.current.length > 0;
    setPolicySubmitPhase('record');
    showStatus({ title: hasAttachments ? 'Ukládám smlouvu a přílohy' : 'Ukládám smlouvu', message: hasAttachments ? 'Smlouva se ukládá a po dokončení se nahrají i přílohy.' : 'Smlouva se ukládá. Prosím čekejte.' });
    try {
      const result = await onCreateInsurancePolicy({
        ...policyData,
        id: editingPolicy !== 'new' ? editingPolicy : undefined,
        premium_amount: policyData.premium_amount === '' ? null : policyData.premium_amount,
        deductible_amount: policyData.deductible_amount === '' ? null : policyData.deductible_amount,
      });
      const recordId = Number(result?.id || (editingPolicy !== 'new' ? editingPolicy : 0));
      if (!Number.isFinite(recordId) || recordId <= 0) {
        showStatus({ title: 'Ukládání se nezdařilo', message: 'Smlouva nebyla uložena. Zkontrolujte vstupní data a zkuste to znovu.', confirmLabel: 'OK' });
        return;
      }

      if (hasAttachments) {
        setPolicySubmitPhase('attachments');
        showStatus({ title: 'Nahrávám přílohy', message: 'Přidávám přiložené soubory ke smlouvě. Prosím čekejte.' });
        await policyAttachmentUploadRef.current?.uploadQueued(recordId);
      }
      cancelPolicy();
      showStatus({ title: 'Úspěšně uloženo', message: hasAttachments ? 'Smlouva i všechny přílohy byly úspěšně uloženy.' : 'Smlouva byla úspěšně uložena.', confirmLabel: 'OK' });
    } catch {
      showStatus({ title: 'Ukládání se nezdařilo', message: 'Smlouva nebo přílohy nebyly uložené. Zkuste akci opakovat.', confirmLabel: 'OK' });
    } finally {
      setPolicySubmitPhase('');
    }
  }

  function changePolicy(e) { setPolicyData((p) => ({ ...p, [e.target.name]: e.target.value })); }

  async function deletePolicy(policy) {
    if (await confirm({ title: 'Smazat pojistnou smlouvu', message: `Opravdu smazat pojistnou smlouvu${policy.policy_number ? ` č. ${policy.policy_number}` : ''}?`, confirmLabel: 'Smazat', danger: true })) {
      await onDeleteInsurancePolicy(policy);
    }
  }

  if (insuranceLoading) return <p className="muted">Načítám pojištění...</p>;

  const activePolicies = insurancePolicies.filter((p) => !p.deleted_at);

  return (
    <div>
      <DismissibleMessage message={insuranceError} variant="error" />
      <DismissibleMessage message={insuranceMessage} variant="success" />

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
                <select
                  name="insurer_name"
                  value={policyData.insurer_name || ''}
                  onChange={changePolicy}
                >
                  <option value="">-- Vyberte pojišťovnu --</option>
                  {insurerOptions.map((i) => (
                    <option key={i.code} value={i.item_name}>{i.item_name}</option>
                  ))}
                  {policyData.insurer_name && !hasCurrentInsurerOption && (
                    <option value={policyData.insurer_name}>{policyData.insurer_name}</option>
                  )}
                </select>
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
              <button type="submit" className="btn btn-primary" disabled={Boolean(policySubmitPhase) || creatingInsurance || uploadingAttachment}>
                {policySubmitPhase === 'attachments'
                  ? `Nahrávám přílohy${Number.isFinite(Number(attachmentUploadProgress)) ? ` (${Math.round(Number(attachmentUploadProgress))} %)` : '...'}`
                  : policySubmitPhase === 'record' || creatingInsurance ? 'Ukládám záznam...' : 'Uložit'}
              </button>
            </div>
            <ModuleAttachmentUpload ref={policyAttachmentUploadRef} queueRef={policyAttachmentQueueRef} contextModule="insurance_policy" contextRecordId={editingPolicy === 'new' ? null : editingPolicy} attachments={attachments} onUpload={onUploadAttachment} onDelete={onDeleteAttachment} onDownload={onDownloadAttachment} uploading={uploadingAttachment} readOnly={readOnly} lookupByCategory={lookupByCategory} attachmentUploadProgress={attachmentUploadProgress} />
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
                      <th className="module-table-actions">Akce</th>
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
                        <td className="module-table-actions">
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

    </div>
  );
}
