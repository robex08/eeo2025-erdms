import React, { useRef, useState } from 'react';
import AppIcon from '../../../ui/AppIcon';
import LookupSelect from './LookupSelect';
import { lookupLabel, formatDateCs, formatMoneyCs } from './moduleUtils';
import ModuleAttachmentUpload from './ModuleAttachmentUpload';
import { usePersistentDialog } from '../../../ui/PersistentDialog';
import DismissibleMessage from '../../../ui/DismissibleMessage';

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

export default function ClaimsModule({
  claims = [],
  insurancePolicies = [],
  onCreateClaim,
  onDeleteClaim,
  claimsLoading,
  claimsError,
  claimsMessage,
  creatingClaim,
  attachmentUploadProgress,
  attachments = [],
  onUploadAttachment,
  onDeleteAttachment,
  onDownloadAttachment,
  uploadingAttachment,
  readOnly,
  lookupByCategory = {},
}) {
  const { confirm, showStatus } = usePersistentDialog();
  const [editingClaim, setEditingClaim] = useState(null);
  const [claimData, setClaimData] = useState(EMPTY_CLAIM);
  const claimAttachmentUploadRef = useRef(null);
  const claimAttachmentQueueRef = useRef([]);
  const [claimSubmitPhase, setClaimSubmitPhase] = useState('');

  const activePolicies = Array.isArray(insurancePolicies)
    ? insurancePolicies.filter((policy) => !policy.deleted_at)
    : [];

  function editClaim(claim) {
    setEditingClaim(claim?.id || 'new');
    setClaimData(
      claim
        ? {
            ...EMPTY_CLAIM,
            ...claim,
            payout_amount: claim.payout_amount ?? '',
            deductible_amount: claim.deductible_amount ?? '',
            insurance_policy_id: claim.insurance_policy_id ?? '',
          }
        : EMPTY_CLAIM
    );
  }

  function cancelClaim() {
    setEditingClaim(null);
    setClaimData(EMPTY_CLAIM);
    claimAttachmentQueueRef.current = [];
  }

  function changeClaim(e) {
    setClaimData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  }

  async function submitClaim(e) {
    e.preventDefault();
    if (claimSubmitPhase) return;
    if (!claimAttachmentUploadRef.current?.validatePending()) return;

    const hasAttachments = claimAttachmentQueueRef.current.length > 0;
    setClaimSubmitPhase('record');
    showStatus({
      title: hasAttachments ? 'Ukládám událost a přílohy' : 'Ukládám událost',
      message: hasAttachments ? 'Událost se ukládá a po dokončení se nahrají i přílohy.' : 'Událost se ukládá. Prosím čekejte.',
    });

    try {
      const result = await onCreateClaim({
        ...claimData,
        id: editingClaim !== 'new' ? editingClaim : undefined,
        insurance_policy_id: claimData.insurance_policy_id === '' ? null : Number(claimData.insurance_policy_id),
        payout_amount: claimData.payout_amount === '' ? null : claimData.payout_amount,
        deductible_amount: claimData.deductible_amount === '' ? null : claimData.deductible_amount,
      });

      const recordId = Number(result?.id || (editingClaim !== 'new' ? editingClaim : 0));
      if (!Number.isFinite(recordId) || recordId <= 0) {
        showStatus({
          title: 'Ukládání se nezdařilo',
          message: 'Událost nebyla uložena. Zkontrolujte vstupní data a zkuste to znovu.',
          confirmLabel: 'OK',
        });
        return;
      }

      if (hasAttachments) {
        setClaimSubmitPhase('attachments');
        showStatus({ title: 'Nahrávám přílohy', message: 'Přidávám přiložené soubory ke škodní události. Prosím čekejte.' });
        await claimAttachmentUploadRef.current?.uploadQueued(recordId);
      }

      cancelClaim();
      showStatus({
        title: 'Úspěšně uloženo',
        message: hasAttachments ? 'Událost i všechny přílohy byly úspěšně uloženy.' : 'Událost byla úspěšně uložena.',
        confirmLabel: 'OK',
      });
    } catch {
      showStatus({
        title: 'Ukládání se nezdařilo',
        message: 'Událost nebo přílohy nebyly uloženy. Zkuste akci opakovat.',
        confirmLabel: 'OK',
      });
    } finally {
      setClaimSubmitPhase('');
    }
  }

  async function deleteClaim(claim) {
    if (
      await confirm({
        title: 'Smazat škodní událost',
        message: `Opravdu smazat škodní událost${claim.title ? ` „${claim.title}“` : ''}?`,
        confirmLabel: 'Smazat',
        danger: true,
      })
    ) {
      await onDeleteClaim(claim);
    }
  }

  if (claimsLoading) return <p className="muted">Načítám škodní události...</p>;

  return (
    <div>
      <DismissibleMessage message={claimsError} variant="error" />
      <DismissibleMessage message={claimsMessage} variant="success" />

      <section>
        <h4>Škodní události</h4>

        {editingClaim ? (
          <form onSubmit={submitClaim} className="detail-form">
            <h5>{editingClaim !== 'new' ? 'Upravit škodní událost' : 'Nová škodní událost'}</h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label>
                Vazba na pojistnou smlouvu
                <select name="insurance_policy_id" value={claimData.insurance_policy_id || ''} onChange={changeClaim}>
                  <option value="">-- Bez vazby --</option>
                  {activePolicies.length === 0 && (
                    <option value="" disabled>Nejprve založte pojistnou smlouvu</option>
                  )}
                  {activePolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.policy_number || `Smlouva #${policy.id}`} ({lookupLabel(lookupByCategory, 'insurance_policy_type', policy.policy_type_code)})
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
              <button type="submit" className="btn btn-primary" disabled={Boolean(claimSubmitPhase) || creatingClaim || uploadingAttachment}>
                {claimSubmitPhase === 'attachments'
                  ? `Nahrávám přílohy${Number.isFinite(Number(attachmentUploadProgress)) ? ` (${Math.round(Number(attachmentUploadProgress))} %)` : '...'}`
                  : claimSubmitPhase === 'record' || creatingClaim ? 'Ukládám záznam...' : 'Uložit'}
              </button>
            </div>
            <ModuleAttachmentUpload
              ref={claimAttachmentUploadRef}
              queueRef={claimAttachmentQueueRef}
              contextModule="insurance_claim"
              contextRecordId={editingClaim === 'new' ? null : editingClaim}
              attachments={attachments}
              onUpload={onUploadAttachment}
              onDelete={onDeleteAttachment}
              onDownload={onDownloadAttachment}
              uploading={uploadingAttachment}
              readOnly={readOnly}
              lookupByCategory={lookupByCategory}
              attachmentUploadProgress={attachmentUploadProgress}
            />
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
                      <th className="module-table-actions">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => {
                      const linkedPolicy = activePolicies.find((policy) => Number(policy.id) === Number(claim.insurance_policy_id));
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
                          <td className="module-table-actions">
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
