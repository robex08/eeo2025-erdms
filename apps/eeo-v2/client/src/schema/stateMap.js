// Central mapping between numeric stav_id values and semantic approval/workflow statuses.
// Adjust the numeric IDs below to match the real database ciselnik.

// NOTE: Placeholder numeric values (null) must be replaced with actual IDs.
// Provide: draft, pending (user requested approval), approved, rejected, supplierPending (waiting for supplier confirmation), supplierConfirmed, finished, canceled.

// Fallback numeric IDs (loaded dynamically later, but we now embed real values from the provided SQL dump)
// 1 NOVA, 2 ODESLANA_KE_SCHVALENI, 3 SCHVALENA, 4 ZAMITNUTA, 5 CEKA_SE, 6 ODESLANA,
// 7 POTVRZENA, 8 DOKONCENA, 9 ZRUSENA, 10 CEKA_POTVRZENI
export const STATE_ID = {
  draft: 1,              // NOVA
  pending: 2,            // ODESLANA_KE_SCHVALENI (alias CEKA_SCHVALENI, CEKA_SE)
  approved: 3,           // SCHVALENA
  rejected: 4,           // ZAMITNUTA
  supplierPending: 10,   // CEKA_POTVRZENI (waiting for supplier confirmation)
  supplierConfirmed: 7,  // POTVRZENA
  finished: 8,           // DOKONCENA
  canceled: 9            // ZRUSENA
};

// Allow runtime injection after fetching 25_ciselnik_stavy (typ_objektu=OBJEDNAVKA)
export function injectStateIdsFromCiselnik(list) {
  if (!Array.isArray(list)) return;
  // Expect each row: { id, typ_objektu, kod_stavu, nazev_stavu, popis }
  const byCode = {};
  list.forEach(r => { if (r && r.kod_stavu && r.id != null) byCode[String(r.kod_stavu).toUpperCase()] = r.id; });
  const map = {
    draft: 'NOVA',
    pending: 'ODESLANA_KE_SCHVALENI', // primary canonical pending
    approved: 'SCHVALENA',
    rejected: 'ZAMITNUTA',
    supplierPending: 'CEKA_POTVRZENI',
    supplierConfirmed: 'POTVRZENA',
    finished: 'DOKONCENA',
    canceled: 'ZRUSENA'
  };
  Object.entries(map).forEach(([key, code]) => {
    const upper = code.toUpperCase();
    if (byCode[upper] != null) STATE_ID[key] = byCode[upper];
  });
  // reset reverse index so it rebuilds with new values
  _reverse = null;
}

// Normalise raw kod_stavu from DB to one of our semantic buckets
export function semanticFromCode(rawCode) {
  if (!rawCode) return 'draft';
  const c = String(rawCode).toUpperCase();
  if (c === 'NOVA') return 'draft';
  if (c === 'ODESLANA_KE_SCHVALENI' || c === 'CEKA_SCHVALENI' || c === 'CEKA_SE') return 'pending';
  if (c === 'SCHVALENA') return 'approved';
  if (c === 'ZAMITNUTA') return 'rejected';
  if (c === 'CEKA_POTVRZENI' || c === 'ODESLANA') return 'supplierPending';
  if (c === 'POTVRZENA') return 'supplierConfirmed';
  if (c === 'DOKONCENA') return 'finished';
  if (c === 'ZRUSENA') return 'canceled';
  return 'unknown';
}

// Reverse index (computed lazily when first accessed)
let _reverse = null;
function ensureReverse() {
  if (_reverse) return _reverse;
  _reverse = {};
  Object.entries(STATE_ID).forEach(([k,v]) => { if (v != null) _reverse[v] = k; });
  return _reverse;
}

// Map stav_id (number) -> semantic status string (draft|pending|approved|rejected|supplierPending|supplierConfirmed|finished|canceled|unknown)
export function statusFromStateId(stateId) {
  if (stateId == null) return 'draft';
  const rev = ensureReverse();
  return rev[stateId] || 'unknown';
}

// Map transient approvalStatus (approved|rejected|pending|'') to next stateId.
// If a state is already terminal (approved/rejected) we keep the existing provided currentStateId unless override = true.
export function stateIdForApprovalStatus(approvalStatus, currentStateId, { override = false } = {}) {
  const curStatus = statusFromStateId(currentStateId);
  if (!override && (curStatus === 'approved' || curStatus === 'rejected')) return currentStateId; // frozen
  switch (approvalStatus) {
    case 'approved': return STATE_ID.approved ?? currentStateId ?? null;
    case 'rejected': return STATE_ID.rejected ?? currentStateId ?? null;
    case 'pending': return STATE_ID.pending ?? currentStateId ?? null;
    case '':
    default:
      // empty means revert to draft if not yet persisted
      return STATE_ID.draft ?? currentStateId ?? null;
  }
}

// Decide stateId for save based on existing stateId + transient approvalStatus + whether supplier confirmation is set.
export function deriveStateId({ currentStateId, approvalStatus, orderConfirmed }) {
  // If supplier confirmed and we have approved state, prefer supplierConfirmed if configured.
  if (orderConfirmed && STATE_ID.supplierConfirmed != null) return STATE_ID.supplierConfirmed;
  return stateIdForApprovalStatus(approvalStatus, currentStateId);
}

// For UI labeling if needed.
export const STATUS_LABELS = {
  draft: 'Nová',
  pending: 'Čeká na schválení',
  approved: 'Schválená',
  rejected: 'Zamítnutá',
  supplierPending: 'Čeká na potvrzení',
  supplierConfirmed: 'Potvrzená dodavatelem',
  finished: 'Dokončená',
  canceled: 'Zrušená',
  unknown: 'Neznámý stav'
};

export function labelForStateId(stateId) {
  return STATUS_LABELS[statusFromStateId(stateId)] || STATUS_LABELS.unknown;
}

export default {
  STATE_ID,
  statusFromStateId,
  stateIdForApprovalStatus,
  deriveStateId,
  semanticFromCode,
  labelForStateId,
  STATUS_LABELS
};
