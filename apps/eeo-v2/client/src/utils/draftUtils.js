/**
 * Utility funkce pro práci s drafty objednávek
 */

// Funkce pro kontrolu zda je objednávka načtena/editována z DB
export const isDraftFromDB = (draftData) => {
  if (!draftData) return false;
  const actualData = draftData.formData || draftData;
  return !!(actualData.id || draftData.savedOrderId || draftData.isOrderSavedToDB);
};

// Funkce pro zjištění fáze a stavu objednávky z draftu
export const getOrderPhaseFromDraft = (draftData) => {
  if (!draftData) return { phase: 1, isZrusena: false };

  // Data mohou být v draftData.formData nebo přímo v draftData
  const actualData = draftData.formData || draftData;

  // Zkontroluj, zda objednávka není v DB (nemá ID) → vždy fáze 1
  if (!actualData.id) {
    return { phase: 1, isZrusena: false };
  }

  // Funkce pro kontrolu workflow stavu
  const hasWorkflowState = (workflowCode, targetState) => {
    if (!workflowCode) return false;
    try {
      if (typeof workflowCode === 'string' && workflowCode.startsWith('[')) {
        const states = JSON.parse(workflowCode);
        return Array.isArray(states) && states.includes(targetState);
      }
      return String(workflowCode).includes(targetState);
    } catch {
      return String(workflowCode).includes(targetState);
    }
  };

  // Zkontroluj zda je objednávka zrušená/stornovaná
  const isZrusena = hasWorkflowState(actualData.stav_workflow_kod, 'ZRUSENA') ||
                    actualData.stav_stornovano === true ||
                    actualData.stav_stornovano === '1';

  // Pokud je zrušená, vrať info že je zrušená (pro speciální zacházení)
  if (isZrusena) {
    return { phase: 2, isZrusena: true }; // Fáze 2 ale zrušená
  }

  // Zjisti fázi podle stejné logiky jako v OrderForm25.js
  // FÁZE 3: SCHVALENA + ODESLANA
  if (hasWorkflowState(actualData.stav_workflow_kod, 'SCHVALENA') &&
      hasWorkflowState(actualData.stav_workflow_kod, 'ODESLANA')) {
    return { phase: 3, isZrusena: false };
  }

  // Ostatní workflow stavy pro FÁZE 3
  if (hasWorkflowState(actualData.stav_workflow_kod, 'POTVRZENA') ||
      hasWorkflowState(actualData.stav_workflow_kod, 'DOKONCENA')) {
    return { phase: 3, isZrusena: false };
  }

  // FÁZE 2: SCHVÁLENO (bez odeslání)
  if (hasWorkflowState(actualData.stav_workflow_kod, 'SCHVALENA')) {
    return { phase: 2, isZrusena: false };
  }

  // FÁZE 1: ostatní stavy (NOVA, ZAMITNUTA, CEKA_SE)
  return { phase: 1, isZrusena: false };
};

// Funkce pro kontrolu zda je draft validní koncept (má nějaký obsah)
// POUZE pro nové objednávky (bez ID) - pro zobrazení jako nový řádek v seznamu
export const isValidConcept = (draftData) => {
  if (!draftData) return false;

  // ⭐ IGNORUJ invalidované drafty (uložené do DB)
  if (draftData.invalidated === true) return false;

  // Pokud je načtená z DB, není to koncept pro nový řádek
  if (isDraftFromDB(draftData)) return false;

  // Pokud je ve vyšší fázi nebo zrušená, není to koncept
  const phaseInfo = getOrderPhaseFromDraft(draftData);
  if (phaseInfo.phase > 1 || phaseInfo.isZrusena) return false;

  // Data jsou uložena v draftData.formData
  const formData = draftData.formData || draftData;

  // Kontrola polí z Fáze 1 - Info a Schválení PO
  // Validní koncept = uživatel vyplnil jakékoliv pole z Fáze 1 a došlo k auto save
  // IGNORUJE systémová pole: jmeno, telefon, email, uzivatel_id, objednatel_id
  const hasContent = (formData.predmet && String(formData.predmet).trim()) ||
                    formData.garant_uzivatel_id ||
                    formData.prikazce_id ||
                    (formData.strediska_kod && Array.isArray(formData.strediska_kod) && formData.strediska_kod.length > 0) ||
                    (formData.max_cena_s_dph && parseFloat(formData.max_cena_s_dph) > 0) ||
                    (formData.popis_pozadavku && String(formData.popis_pozadavku).trim());

  // Debug log odstraněn - způsoboval opakovaný výpis
  return hasContent;
};

// Funkce pro kontrolu zda má objednávka rozpracované změny v localStorage
// Pro barevné zvýraznění existujících řádků z DB
export const hasDraftChanges = (draftData) => {
  if (!draftData) return false;

  // ⭐ IGNORUJ invalidované drafty (uložené do DB)
  if (draftData.invalidated === true) return false;

  // Pouze objednávky z DB (mají ID)
  if (!isDraftFromDB(draftData)) return false;

  // Data jsou uložena v draftData.formData
  const formData = draftData.formData || draftData;

  // Kontrola zda má nějaký obsah (stejná logika jako isValidConcept)
  // IGNORUJE systémová pole: jmeno, telefon, email, uzivatel_id, objednatel_id
  const hasContent = (formData.predmet && String(formData.predmet).trim()) ||
                    formData.garant_uzivatel_id ||
                    formData.prikazce_id ||
                    (formData.strediska_kod && Array.isArray(formData.strediska_kod) && formData.strediska_kod.length > 0) ||
                    (formData.max_cena_s_dph && parseFloat(formData.max_cena_s_dph) > 0) ||
                    (formData.popis_pozadavku && String(formData.popis_pozadavku).trim());
  return hasContent;
};

// Helper pro generování správného draft klíče - ORDER25 STANDARD
// Vrací klíč pro localStorage ve stejném formátu jako order25DraftStorageService
// ORDER25 STANDARD: order25_draft_new_{userId}
export const getDraftKey = (userId) => userId ? `order25_draft_${userId}` : null;