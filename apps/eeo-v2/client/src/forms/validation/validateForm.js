import { isNonEmpty, isPositiveNumber } from '../../utils/validators';

// validateForm optionally accepts the intended next workflow status so that when the user
// is committing an approval (nextWorkflow === 'SCHVALENA') we require the full details.
export function validateForm({
  formData,
  sectionStates,
  purchaserSectionOpen,
  poApprovalSectionOpen,
  approvers,
  poOptions,
  attachments,
  hasPermission,
  areMiddleSectionsValid,
  nextWorkflow = null,
  strict = false
}) {
  const errors = {};
  // Determine visible sections (the form should validate mainly what's visible)
  const visible = {
    purchaser: !!purchaserSectionOpen,
    poApproval: !!poApprovalSectionOpen,
    financing: !!sectionStates.financing,
    supplier: !!sectionStates.supplier,
    orderDetails: !!sectionStates.orderDetails,
    delivery: !!sectionStates.delivery,
    docs: !!sectionStates.docs,
    sentConfirmation: !!sectionStates.sentConfirmation
  };

  // Always validate minimal core fields which are essential even if some blocks are collapsed
  if (!isNonEmpty(formData.predmet)) errors['predmet'] = true;
  if (!isPositiveNumber(formData.max_cena_s_dph)) errors['max_cena_s_dph'] = true;

  // If this is the first save (no persistedOrderId), enforce starred (red-asterisk) fields
  // but only for blocks that are currently visible in the UI.
  const isInitialSave = !formData?.orderId;
  if (isInitialSave) {
    if (visible.purchaser) {
      // Purchaser contact required fields (starred in UI)
      if (!isNonEmpty(formData?.purchaser?.contactPerson?.name)) errors['purchaser.contactPerson.name'] = true;
      if (!isNonEmpty(formData?.purchaser?.contactPerson?.email)) errors['purchaser.contactPerson.email'] = true;
      if (!isNonEmpty(formData?.purchaser?.contactPerson?.phone)) errors['purchaser.contactPerson.phone'] = true;
      if (!isNonEmpty(formData.garant_uzivatel_id)) errors['garant_uzivatel_id'] = true;
    }
    if (visible.poApproval) {
      // PO must be non-empty and must exist in the current PO options (approvers if loaded, otherwise fallback)
      const currentPoOptions = (Array.isArray(approvers) && approvers.length) ? approvers : poOptions;
      const isValueInOptions = (value, options) => options && options.some(o => String(o.id) === String(value) || String(o.value) === String(value) || String(o.code) === String(value));
      const poValue = formData.prikazce_id || formData.po_kod || formData.po; // Support legacy fields
      const poIsEmpty = !isNonEmpty(poValue);
      const poNotInOptions = !isValueInOptions(poValue, currentPoOptions);
      if (poIsEmpty || poNotInOptions) errors['prikazce_id'] = true;
      if (!Array.isArray(formData.strediska) || formData.strediska.length === 0) errors['strediska'] = true;
    }
    if (visible.financing) {
      if (!isNonEmpty(formData.zdroj_financovani)) errors['zdroj_financovani'] = true;
      if (formData.zdroj_financovani === 'LP' && !isNonEmpty(formData.lp_kod)) errors['lp_kod'] = true;
    }
    // Supplier starred fields when visible (non-Pokladna)
    if (visible.supplier && formData.zdroj_financovani !== 'Pokladna') {
      if (!isNonEmpty(formData.dodavatel_nazev)) errors['dodavatel_nazev'] = true;
      if (!isNonEmpty(formData.dodavatel_adresa)) errors['dodavatel_adresa'] = true;
      if (!isNonEmpty(formData.dodavatel_ico)) errors['dodavatel_ico'] = true;
    }
    // Order details starred fields when visible (Pokladna vs ne-Pokladna)
    if (visible.orderDetails && formData.zdroj_financovani === 'Pokladna') {
      // require at least one item with description and prices
      if (!Array.isArray(formData.polozky) || formData.polozky.length === 0) {
        errors['polozky[0].popis'] = true;
      } else {
        formData.polozky.forEach((item, idx) => {
          if (!isNonEmpty(item.popis)) errors[`polozky[${idx}].popis`] = true;
          if (!isPositiveNumber(item.cena_bez_dph)) errors[`polozky[${idx}].cena_bez_dph`] = true;
          if (!isPositiveNumber(item.cena_s_dph)) errors[`polozky[${idx}].cena_s_dph`] = true;
        });
      }
    } else if (visible.orderDetails && formData.zdroj_financovani !== 'Pokladna') {
      // Non-Pokladna: aggregate details are required
      if (!isNonEmpty(formData.druh_objednavky)) errors['druh_objednavky'] = true;
      if (!isNonEmpty(formData.description)) errors['description'] = true;
      if (!isPositiveNumber(formData.cena_bez_dph)) errors['cena_bez_dph'] = true;
      if (!isPositiveNumber(formData.cena_s_dph)) errors['cena_s_dph'] = true;
    }
  }

  // Purchaser block validation (only when visible)
  if (visible.purchaser) {
    if (!isNonEmpty(formData?.purchaser?.contactPerson?.name)) errors['purchaser.contactPerson.name'] = true;
    if (!isNonEmpty(formData?.purchaser?.contactPerson?.email)) errors['purchaser.contactPerson.email'] = true;
    if (!isNonEmpty(formData?.purchaser?.contactPerson?.phone)) errors['purchaser.contactPerson.phone'] = true;
    if (!isNonEmpty(formData.garant_uzivatel_id)) errors['garant_uzivatel_id'] = true;
  }

  // PO approval block (subject/po/center validated when that block is visible)
  if (visible.poApproval) {
    const currentPoOptions = (Array.isArray(approvers) && approvers.length) ? approvers : poOptions;
    const isValueInOptions = (value, options) => options && options.some(o => String(o.id) === String(value) || String(o.value) === String(value) || String(o.code) === String(value));
    const poValue = formData.prikazce_id || formData.po_kod || formData.po; // Support legacy fields
    if (!isNonEmpty(poValue) || !isValueInOptions(poValue, currentPoOptions)) errors['prikazce_id'] = true;
    if (!Array.isArray(formData.strediska) || formData.strediska.length === 0) errors['strediska'] = true;
  }

  // If the submit intends to commit the order into SCHVALENA, enforce the full validation.
  const earlyApprovalRelax = !strict && hasPermission && hasPermission('ORDER_APPROVE') && nextWorkflow === 'SCHVALENA' && !areMiddleSectionsValid();
  const committingApproval = nextWorkflow === 'SCHVALENA' && !earlyApprovalRelax;
  if (committingApproval) {
    // Phase 2: financing and supplier/order details must be present
    if (!isNonEmpty(formData.zdroj_financovani)) errors['zdroj_financovani'] = true;
    if (formData.zdroj_financovani !== 'Pokladna') {
      if (!isNonEmpty(formData.dodavatel_nazev)) { errors['dodavatel_nazev'] = true; }
    } else {
      // Pokladna položky
      if (!Array.isArray(formData.polozky) || formData.polozky.length === 0) {
        errors['polozky[0].popis'] = true;
      } else {
        formData.polozky.forEach((item, idx) => {
          if (!isNonEmpty(item.popis)) errors[`polozky[${idx}].popis`] = true;
          if (!isPositiveNumber(item.cena_bez_dph)) errors[`polozky[${idx}].cena_bez_dph`] = true;
          if (!isPositiveNumber(item.cena_s_dph)) errors[`polozky[${idx}].cena_s_dph`] = true;
          if (!isNonEmpty(item.sazba_dph)) errors[`polozky[${idx}].sazba_dph`] = true;
        });
      }
    }
    // Phase 3: Supplier confirmation is optional; if checked, method and acceptance date are required
    if (areMiddleSectionsValid() && formData.orderConfirmed === true) {
      const anyMethod = Array.isArray(formData.confirmationMethods) && formData.confirmationMethods.length > 0;
      if (!anyMethod) errors['confirmationMethod'] = true;
      if (!isNonEmpty(formData.acceptanceDate)) errors['acceptanceDate'] = true;
    }
  } else {
    // Non-commit save: validate only visible blocks for financing / supplier / items / aggregate details
    if (visible.financing) {
      if (!isNonEmpty(formData.zdroj_financovani)) errors['zdroj_financovani'] = true;
    }
    if (visible.supplier && formData.zdroj_financovani !== 'Pokladna') {
      if (!isNonEmpty(formData.dodavatel_nazev)) errors['dodavatel_nazev'] = true;
      if (!isNonEmpty(formData.dodavatel_adresa)) errors['dodavatel_adresa'] = true;
      if (!isNonEmpty(formData.dodavatel_ico)) errors['dodavatel_ico'] = true;
    }
    if (visible.orderDetails && formData.zdroj_financovani === 'Pokladna') {
      if (!Array.isArray(formData.polozky) || formData.polozky.length === 0) {
        errors['polozky[0].popis'] = true;
      } else {
        formData.polozky.forEach((item, idx) => {
          if (!isNonEmpty(item.popis)) errors[`polozky[${idx}].popis`] = true;
        });
      }
    } else if (visible.orderDetails && formData.zdroj_financovani !== 'Pokladna') {
      if (!isNonEmpty(formData.druh_objednavky)) errors['druh_objednavky'] = true;
      if (!isNonEmpty(formData.description)) errors['description'] = true;
      // keep prices optional until user interacts? No – starred => required
      if (!isPositiveNumber(formData.cena_bez_dph)) errors['cena_bez_dph'] = true;
      if (!isPositiveNumber(formData.cena_s_dph)) errors['cena_s_dph'] = true;
    }
  }

  // Attachments: each attached file must have classification selected (non-empty)
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      if (!att.type) {
        errors[`attachment.${att.id}.type`] = true;
      }
    });
  }

  // If approver selected 'rejected' or 'pending', require the corresponding comment
  const apprStatus = (formData.approvalStatus || '').trim();
  if (apprStatus === 'rejected' && !isNonEmpty(formData.stav_komentar)) {
    errors['stav_komentar'] = true;
  }
  if (apprStatus === 'pending') {
    if (!(isNonEmpty(formData.stav_komentar) || isNonEmpty(formData.pendingNote))) {
      errors['stav_komentar'] = true;
      errors['pendingNote'] = true;
    }
  }

  return errors;
}
