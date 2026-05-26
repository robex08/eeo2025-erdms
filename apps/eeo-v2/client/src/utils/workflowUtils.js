
// Utility functions for workflow management in OrderForm25
import {
  WORKFLOW_STATES,
  WORKFLOW_PHASES,
  getWorkflowPhase,
  canTransitionTo,
  getRequiredFields,
  getVisibleSections,
  getWorkflowInfo
} from '../constants/workflow25';

/**
 * Helper funkce pro parsování workflow stavů z JSON
 */
const parseWorkflowStates = (workflowCode) => {
  if (!workflowCode) return ['ODESLANA_KE_SCHVALENI'];
  if (typeof workflowCode === 'string') {
    try {
      const parsed = JSON.parse(workflowCode);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : ['ODESLANA_KE_SCHVALENI'];
      }
      return [workflowCode];
    } catch {
      return [workflowCode];
    }
  }
  const result = Array.isArray(workflowCode) ? workflowCode : [workflowCode];
  return result.length > 0 ? result : ['ODESLANA_KE_SCHVALENI'];
};

/**
 * Helper funkce pro kontrolu přítomnosti workflow stavu
 */
const hasWorkflowState = (workflowCode, state) => {
  const states = parseWorkflowStates(workflowCode);
  return states.includes(state);
};

// Mapa pro překlad systémových názvů polí na lidsky čitelné labely
const FIELD_LABELS = {
  predmet: 'Předmět objednávky',
  garant_uzivatel_id: 'Garant',
  prikazce_id: 'Příkazce',
  max_cena_s_dph: 'Maximální cena s DPH',
  strediska_kod: 'Středisko',
  jmeno: 'Jméno objednatele',
  email: 'E-mail objednatele',
  dodavatel_nazev: 'Název dodavatele',
  dodavatel_adresa: 'Adresa dodavatele',
  dodavatel_ico: 'IČO dodavatele',
  dodavatel_kontakt: 'Kontakt na dodavatele',
  druh_objednavky_kod: 'Druh objednávky',
  polozky_objednavky: 'Položky objednávky',
  zpusob_financovani: 'Způsob financování',
  lp_kod: 'LP kód',
  lp_poznamka: 'Poznámka k LP',
  cislo_smlouvy: 'Číslo smlouvy',
  smlouva_poznamka: 'Poznámka ke smlouvě',
  individualni_schvaleni: 'Identifikátor schválení',
  individualni_poznamka: 'Poznámka k schválení',
  pojistna_udalost_cislo: 'Číslo pojistné události',
  pojistna_udalost_poznamka: 'Poznámka k pojistné události',
  datum_odeslani: 'Datum odeslání',
  schvaleni_komentar: 'Komentář',
  odeslani_storno_duvod: 'Důvod stornování',
  dodavatel_zpusob_potvrzeni: 'Způsob potvrzení',
  zpusob_platby: 'Způsob platby',
  dt_akceptace: 'Datum akceptace',
  dt_zverejneni: 'Datum zveřejnění (VZ)',
  registr_iddt: 'Identifikátor IDDT',
  ma_byt_zverejnena: 'Zveřejnění'
};

/**
 * Validates form data based on current workflow state
 * @param {Object} formData - Current form data
 * @param {string} workflowCode - Current workflow state code
 * @param {Object} sectionStates - Optional object with section visibility and lock states
 *   e.g. { phase1: { visible: true, locked: false }, phase3: { visible: true, locked: true } }
 * @returns {Object} - Validation errors object
 */
export const validateWorkflowData = (formData, workflowCode = 'NOVA', sectionStates = null) => {
  const errors = {};
  const requiredFields = getRequiredFields(workflowCode);

  // Helper: Určí, zda validovat pole podle fáze/sekce
  const shouldValidateField = (fieldPhase, fieldName) => {
    if (!sectionStates || !fieldPhase) return true; // Pokud nemáme info o sekcích, validuj vždy

    const sectionState = sectionStates[fieldPhase];
    if (!sectionState) return true; // Pokud sekce není definována, validuj

    // ⚠️ VÝJIMKY: Tato pole se VŽDY validují i když je sekce zamčená
    // Důvod: Jsou to KRITICKÁ pole která musí být vyplněná pro uložení objednávky
    const alwaysValidateFields = [
      'dodavatel_nazev', 'dodavatel_adresa', 'dodavatel_ico', 'dodavatel_kontakt', // Dodavatel
      'prikazce_id', 'max_cena_s_dph', 'garant_uzivatel_id', 'predmet', 'strediska_kod' // Schválení PO - FÁZE 1
    ];
    if (alwaysValidateFields.includes(fieldName)) {
      const shouldValidate = sectionState.visible;
      return shouldValidate; // Validuj pokud je sekce viditelná (ignoruj locked)
    }

    // VALIDOVAT: Sekce je viditelná A odemčená
    // NEVALIDOVAT: Sekce není viditelná NEBO je zamčená
    const shouldValidate = sectionState.visible && !sectionState.locked;
    return shouldValidate;
  };

  // Mapa pole → fáze/sekce (pro kontrolu viditelnosti a zamčení)
  const FIELD_TO_PHASE = {
    // Fáze 1: Základní údaje
    predmet: 'phase1',
    garant_uzivatel_id: 'phase1',
    prikazce_id: 'phase1',
    max_cena_s_dph: 'phase1',
    strediska_kod: 'phase1',
    jmeno: 'phase1',
    email: 'phase1',

    // Financování: Samostatná sekce (viditelná ve FÁZI 1, validovaná podle svého stavu)
    zpusob_financovani: 'financovani',
    lp_kod: 'financovani',
    lp_poznamka: 'financovani',
    cislo_smlouvy: 'financovani',
    smlouva_poznamka: 'financovani',
    individualni_schvaleni: 'financovani',
    individualni_poznamka: 'financovani',
    pojistna_udalost_cislo: 'financovani',
    pojistna_udalost_poznamka: 'financovani',

    // Fáze 3: Dodavatel a položky
    dodavatel_nazev: 'phase3',
    dodavatel_adresa: 'phase3',
    dodavatel_ico: 'phase3',
    dodavatel_kontakt: 'phase3',
    druh_objednavky_kod: 'phase3',
    polozky_objednavky: 'phase3',

    // Fáze 4-6: Odeslání a potvrzení
    datum_odeslani: 'phase4to6',
    dodavatel_zpusob_potvrzeni: 'phase4to6',
    zpusob_platby: 'phase4to6',
    dt_akceptace: 'phase4to6',

    // Fáze 2: Schválení
    schvaleni_komentar: 'phase2',
    odeslani_storno_duvod: 'phase2'
  };

  // Zkontroluj, zda je vybraná Pokladna jako způsob financování
  // Pokud ano, přeskoč validaci dodavatele
  const isPokladnaFinancing = (() => {
    const zpusob = formData.zpusob_financovani;
    if (!zpusob) return false;
    // Může být string nebo objekt - kontroluj nazev_stavu nebo nazev
    if (typeof zpusob === 'string') {
      return zpusob.toLowerCase().includes('pokladna');
    }
    if (typeof zpusob === 'object' && zpusob !== null) {
      const nazev = zpusob.nazev_stavu || zpusob.nazev || '';
      return nazev.toLowerCase().includes('pokladna');
    }
    return false;
  })();

  requiredFields.forEach(field => {
    // Zjisti, ve které fázi/sekci pole je
    const fieldPhase = FIELD_TO_PHASE[field];

    // ⚠️ NOVÁ LOGIKA: Validuj pouze pokud je sekce viditelná a odemčená
    if (!shouldValidateField(fieldPhase, field)) {
      return; // Přeskoč validaci - sekce je neviditelná nebo zamčená
    }

    // Skip dodavatel fields když je vybraná Pokladna
    if (isPokladnaFinancing && ['dodavatel_nazev', 'dodavatel_adresa', 'dodavatel_ico', 'dodavatel_kontakt'].includes(field)) {
      return; // Přeskoč validaci tohoto pole
    }

    switch (field) {
      case 'predmet':
        if (!formData.predmet?.trim()) {
          errors.predmet = `${FIELD_LABELS.predmet} je povinný - zadejte stručný popis toho, co objednáváte`;
        }
        break;

      case 'max_cena_s_dph':
        if (!formData.max_cena_s_dph || formData.max_cena_s_dph <= 0) {
          errors.max_cena_s_dph = `${FIELD_LABELS.max_cena_s_dph} je povinná - zadejte předpokládanou celkovou cenu včetně DPH`;
        }
        break;

      case 'strediska_kod':
        if (!formData.strediska_kod ||
            (Array.isArray(formData.strediska_kod) && formData.strediska_kod.length === 0)) {
          errors.strediska_kod = `${FIELD_LABELS.strediska_kod} - vyberte alespoň jedno středisko, ke kterému se objednávka vztahuje`;
        }
        break;

      case 'garant_uzivatel_id':
        if (!formData.garant_uzivatel_id || formData.garant_uzivatel_id === '') {
          errors.garant_uzivatel_id = `${FIELD_LABELS.garant_uzivatel_id} je povinný - vyberte osobu zodpovědnou za objednávku`;
        }
        break;

      case 'prikazce_id':
        if (!formData.prikazce_id || formData.prikazce_id === '') {
          errors.prikazce_id = `${FIELD_LABELS.prikazce_id} je povinný - vyberte osobu, která schvaluje objednávku`;
        }
        break;

      case 'jmeno':
        if (!formData.jmeno?.trim() || formData.jmeno === 'Neuvedeno') {
          errors.jmeno = `${FIELD_LABELS.jmeno} je povinné - zkontrolujte své uživatelské údaje`;
        }
        break;

      case 'email':
        if (!formData.email?.trim()) {
          errors.email = `${FIELD_LABELS.email} je povinný - zadejte platnou e-mailovou adresu`;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'E-mail má neplatný formát - zkontrolujte, zda obsahuje @ a doménu';
        }
        break;

      case 'dodavatel_nazev':
        if (!formData.dodavatel_nazev?.trim()) {
          errors.dodavatel_nazev = `${FIELD_LABELS.dodavatel_nazev} je povinný - zadejte název firmy dodavatele`;
        }
        break;

      case 'dodavatel_adresa':
        // Formulář i DB používají dodavatel_adresa
        if (!formData.dodavatel_adresa?.trim()) {
          errors.dodavatel_adresa = `${FIELD_LABELS.dodavatel_adresa} je povinná - zadejte úplnou adresu dodavatele`;
        }
        break;

      case 'dodavatel_ico':
        if (!formData.dodavatel_ico?.trim()) {
          errors.dodavatel_ico = `${FIELD_LABELS.dodavatel_ico} je povinné - zadejte IČO dodavatele (8 číslic)`;
        }
        break;

      case 'druh_objednavky_kod':
        if (!formData.druh_objednavky_kod?.trim()) {
          errors.druh_objednavky_kod = `${FIELD_LABELS.druh_objednavky_kod} je povinný - vyberte typ objednávky`;
        }
        break;

      case 'polozky_objednavky':
        if (!formData.polozky_objednavky || formData.polozky_objednavky.length === 0) {
          errors.polozky_objednavky = `${FIELD_LABELS.polozky_objednavky} - přidejte alespoň jednu položku s názvem a cenou`;
        } else {
          // Validace jednotlivých položek
          let hasItemError = false;
          formData.polozky_objednavky.forEach((polozka, index) => {
            // Název/popis je povinný (formulář i DB: popis)
            if (!polozka.popis?.trim()) {
              errors[`polozka_${index}_popis`] = `Položka ${index + 1}: Vyplňte název nebo popis položky`;
              hasItemError = true;
            }
            // Cena bez DPH je povinná
            if (!polozka.cena_bez_dph || parseFloat(polozka.cena_bez_dph) <= 0) {
              errors[`polozka_${index}_cena_bez_dph`] = `Položka ${index + 1}: Zadejte cenu bez DPH (musí být větší než 0)`;
              hasItemError = true;
            }
            // Cena s DPH je povinná
            if (!polozka.cena_s_dph || parseFloat(polozka.cena_s_dph) <= 0) {
              errors[`polozka_${index}_cena_s_dph`] = `Položka ${index + 1}: Zadejte cenu s DPH (musí být větší než 0)`;
              hasItemError = true;
            }
            // DPH sazba není povinná, má výchozí hodnotu (formulář i DB: sazba_dph)
          });
          if (hasItemError) {
            errors.polozky_objednavky = 'Některé položky obsahují chyby - zkontrolujte název a ceny všech položek';
          }
        }
        break;

      case 'dodavatel_kontakt':
        if (!formData.dodavatel_kontakt?.trim()) {
          errors.dodavatel_kontakt = `${FIELD_LABELS.dodavatel_kontakt} je povinný - zadejte e-mail nebo telefon na dodavatele`;
        }
        break;

      case 'druh_objednavky':
        // Legacy podpora druh_objednavky - mapuje na druh_objednavky_kod
        if (!formData.druh_objednavky_kod?.trim()) {
          errors.druh_objednavky_kod = `${FIELD_LABELS.druh_objednavky_kod} je povinný - vyberte typ objednávky`;
        }
        break;

      case 'financovani':
      case 'zpusob_financovani':
        // ✅ Validace způsobu financování (formData obsahuje STRING kód typu financování)
        // Formát: formData.zpusob_financovani = "LP" | "POKLADNA" | "SMLOUVA" | "DOTACE" atd.
        if (!formData.zpusob_financovani ||
            (typeof formData.zpusob_financovani === 'string' && !formData.zpusob_financovani.trim())) {
          errors.zpusob_financovani = `${FIELD_LABELS.zpusob_financovani} je povinný - vyberte zdroj financování`;
        }
        break;

      case 'lp_kod':
        if (!formData.lp_kod ||
            (Array.isArray(formData.lp_kod) ? formData.lp_kod.length === 0 :
             (typeof formData.lp_kod === 'string' ? !formData.lp_kod.trim() : !formData.lp_kod))) {
          errors.lp_kod = `${FIELD_LABELS.lp_kod} je povinný - vyberte limitovaný příslib pro financování`;
        }
        break;

      case 'cislo_smlouvy':
        // ⚠️ Podmíněná validace - pouze pokud je vybraná "Smlouva" jako způsob financování
        // Tato validace se provádí dynamicky v OrderForm25.js (řádek 13246)
        if (!formData.cislo_smlouvy?.trim()) {
          errors.cislo_smlouvy = `${FIELD_LABELS.cislo_smlouvy} je povinné - zadejte evidenční číslo smlouvy`;
        }
        break;

      case 'individualni_schvaleni':
        // ⚠️ Podmíněná validace - pouze pokud je vybrané "Individuální schválení"
        // Tato validace se provádí dynamicky v OrderForm25.js (řádek 13252)
        if (!formData.individualni_schvaleni?.trim()) {
          errors.individualni_schvaleni = `${FIELD_LABELS.individualni_schvaleni} je povinný - zadejte identifikátor schválení`;
        }
        break;

      case 'pojistna_udalost_cislo':
        // ⚠️ Podmíněná validace - pouze pokud je vybraná "Pojistná událost"
        // Tato validace se provádí dynamicky v OrderForm25.js (řádek 13263)
        if (!formData.pojistna_udalost_cislo?.trim()) {
          errors.pojistna_udalost_cislo = `${FIELD_LABELS.pojistna_udalost_cislo} je povinné - zadejte číslo pojistné události`;
        }
        break;

      // Poznámkové pole k financování - nejsou povinné, proto není validace
      case 'smlouva_poznamka':
      case 'individualni_poznamka':
      case 'pojistna_udalost_poznamka':
        // Poznámky nejsou povinné - přeskočit validaci
        break;

      default:
        break;
    }
  });

  // Validace komentáře pouze pokud uživatel vybral stav (neschváleno nebo čeká se)
  if ((formData.stav_schvaleni === 'neschvaleno' || formData.stav_schvaleni === 'ceka_se') &&
      !formData.schvaleni_komentar?.trim()) {
    errors.schvaleni_komentar = formData.stav_schvaleni === 'neschvaleno'
      ? `${FIELD_LABELS.schvaleni_komentar} - vysvětlete, proč objednávku neschvalujete`
      : `${FIELD_LABELS.schvaleni_komentar} - uveďte důvod odložení schválení`;
  }

  // Validace stavu odeslání a data
  if (formData.stav_odeslani && formData.stav_odeslani.trim() !== '') {
    if (!formData.datum_odeslani?.trim()) {
      errors.datum_odeslani = `${FIELD_LABELS.datum_odeslani} je povinné při vybraném stavu odeslání`;
    }
  }

  // Validace stornování - důvod je povinný při stornování (kontrola workflow stavu ZRUSENA)
  const isZrusena = hasWorkflowState(formData.stav_workflow_kod, 'ZRUSENA');
  if (isZrusena) {
    if (!formData.odeslani_storno_duvod?.trim()) {
      errors.odeslani_storno_duvod = `${FIELD_LABELS.odeslani_storno_duvod} je povinný - uveďte, proč objednávku stornujete`;
    }
  }

  // ✅ VALIDACE ZVEŘEJNĚNÍ V REGISTRU SMLUV
  // Pokud je checkbox "Má být zveřejněna" zaškrtnutý, pak jsou POVINNÁ:
  // - dt_zverejneni (Datum zveřejnění VZ)
  // - registr_iddt (Identifikátor IDDT)
  // 🔒 VALIDACE POUZE pokud je sekce registr_smluv_vyplneni viditelná A odemčená
  // (což znamená, že uživatel má právo ORDER_PUBLISH_REGISTRY)
  if (formData.ma_byt_zverejnena === true || formData.ma_byt_zverejnena === 1) {
    // Zkontroluj, zda je sekce registr_smluv_vyplneni viditelná a odemčená
    const registrSection = sectionStates?.registr_smluv_vyplneni;
    // ✅ OPRAVA: Validovat POUZE pokud je sekce explicitně viditelná A odemčená
    // Pokud registrSection není definována, NEVALIDOVAT (uživatel nemá právo)
    const shouldValidateRegistr = registrSection && registrSection.visible && !registrSection.locked;
    
    if (shouldValidateRegistr) {
      if (!formData.dt_zverejneni || !String(formData.dt_zverejneni).trim()) {
        errors.dt_zverejneni = 'Datum zveřejnění je povinné když má být objednávka zveřejněna';
      }
      if (!formData.registr_iddt || !String(formData.registr_iddt).trim()) {
        errors.registr_iddt = 'Identifikátor IDDT je povinný když má být objednávka zveřejněna';
      }
    }
  }

  // Validace stavu fakturace a data
  if (formData.stav_fakturace && formData.stav_fakturace.trim() !== '') {
    if (!formData.datum_fakturace?.trim()) {
      errors.datum_fakturace = `${FIELD_LABELS.datum_fakturace} je povinné při vybraném stavu fakturace`;
    }

    // Validace čísla faktury
    if (!formData.cislo_faktury?.trim()) {
      errors.cislo_faktury = `${FIELD_LABELS.cislo_faktury} je povinné - zadejte číslo přijaté faktury`;
    }

    // Validace částek fakturace
    if (!formData.fakturovana_cena_bez_dph || parseFloat(formData.fakturovana_cena_bez_dph) <= 0) {
      errors.fakturovana_cena_bez_dph = `${FIELD_LABELS.fakturovana_cena_bez_dph} je povinná a musí být větší než 0 - zadejte částku z faktury bez DPH`;
    }
    if (!formData.fakturovana_cena_s_dph || parseFloat(formData.fakturovana_cena_s_dph) <= 0) {
      errors.fakturovana_cena_s_dph = `${FIELD_LABELS.fakturovana_cena_s_dph} je povinná a musí být větší než 0 - zadejte celkovou částku z faktury včetně DPH`;
    }
  }

  return errors;
};

/**
 * Determines which sections should be visible based on workflow state and order phase
 * @param {string} workflowCode - Current workflow state code
 * @param {number} orderPhase - Current order phase (1 = NOVÁ, 2 = PO SCHVÁLENÍ)
 * @returns {Object} - Object with section visibility flags
 */
export const getSectionVisibility = (workflowCode = 'NOVA', orderPhase = 1, isArchived = false) => {
  // 🏛️ ARCHIVOVANÉ OBJEDNÁVKY: Zobraz VŠECHNY sekce
  if (isArchived) {
    return {
      objednatel: true,
      schvaleni: true,
      financovani: true,
      dodavatel: true,
      kontakt: true,
      detaily: true,
      dodaci_podminky: true,
      stav_odeslani: true
    };
  }

  const visibleSections = getVisibleSections(workflowCode);

  // Základní sekce viditelné vždy
  const baseVisibility = {
    objednatel: visibleSections.includes('objednatel'),
    schvaleni: visibleSections.includes('schvaleni')
  };

  // ✅ Rozšířené sekce
  // Financování: Viditelné od FÁZE 1 (součást sekce Schválení PO)
  // Ostatní sekce: Viditelné od FÁZE 2/8 (ODESLANA_KE_SCHVALENI - po uložení do DB)
  const extendedVisibility = {
    financovani: visibleSections.includes('financovani'), // ✅ Financování viditelné VŽDY (je součástí sekce Schválení PO ve FÁZI 1)
    dodavatel: orderPhase >= 2 && visibleSections.includes('dodavatel'),
    kontakt: orderPhase >= 2 && visibleSections.includes('kontakt'),
    detaily: orderPhase >= 2 && visibleSections.includes('detaily'),
    dodaci_podminky: orderPhase >= 2 && visibleSections.includes('dodaci_podminky'),
    stav_odeslani: orderPhase >= 2 && visibleSections.includes('stav_odeslani')
  };

  return {
    ...baseVisibility,
    ...extendedVisibility
  };
};

/**
 * Determines which fields should be editable based on workflow state and user permissions
 * @param {string} workflowCode - Current workflow state code
 * @param {Object} userPermissions - User permissions object
 * @param {string} currentUserId - Current user ID
 * @param {string} orderAuthorId - Order author ID
 * @returns {Object} - Object with field editability flags
 */
export const getFieldEditability = (workflowCode, userPermissions = {}, currentUserId, orderAuthorId) => {
  const phase = getWorkflowPhase(workflowCode);
  const isAuthor = currentUserId === orderAuthorId;
  const canApprove = userPermissions.ORDER_APPROVE || userPermissions.hasPermission?.('ORDER_APPROVE');
  const canEdit = userPermissions.ORDER_EDIT || userPermissions.hasPermission?.('ORDER_EDIT');

  switch (phase) {
    case 'draft':
      // Nová - autor může editovat vše
      return {
        basic_info: isAuthor,
        approval_section: false,
        extended_sections: false,
        workflow_actions: isAuthor
      };

    case 'approval':
      // Čeká na schválení - pouze schvalovatel může měnit stav schválení
      return {
        basic_info: false,
        approval_section: canApprove,
        extended_sections: false,
        workflow_actions: canApprove
      };

    case 'approved':
      // Schváleno - rozšířené sekce editovatelné, základní info uzamčeno
      return {
        basic_info: false,
        approval_section: canApprove, // možnost vrátit ke schválení
        extended_sections: canEdit || isAuthor,
        workflow_actions: canEdit || canApprove
      };

    case 'rejected':
      // Zamítnuto - autor může editovat a poslat znovu
      return {
        basic_info: isAuthor,
        approval_section: false,
        extended_sections: false,
        workflow_actions: isAuthor
      };

    case 'supplier_pending':
    case 'supplier_confirmed':
      // U dodavatele - omezené editace
      return {
        basic_info: false,
        approval_section: false,
        extended_sections: canEdit,
        workflow_actions: canEdit
      };

    case 'completed':
    case 'cancelled':
      // Finální stavy - pouze čtení
      return {
        basic_info: false,
        approval_section: false,
        extended_sections: false,
        workflow_actions: false
      };

    default:
      return {
        basic_info: false,
        approval_section: false,
        extended_sections: false,
        workflow_actions: false
      };
  }
};

/**
 * Gets available workflow actions based on current state and user permissions
 * @param {string} workflowCode - Current workflow state code
 * @param {Object} userPermissions - User permissions object
 * @param {string} currentUserId - Current user ID
 * @param {string} orderAuthorId - Order author ID
 * @returns {Array} - Array of available actions
 */
export const getAvailableActions = (workflowCode, userPermissions = {}, currentUserId, orderAuthorId) => {
  const phase = getWorkflowPhase(workflowCode);
  const isAuthor = currentUserId === orderAuthorId;
  const canApprove = userPermissions.ORDER_APPROVE || userPermissions.hasPermission?.('ORDER_APPROVE');
  const canEdit = userPermissions.ORDER_EDIT || userPermissions.hasPermission?.('ORDER_EDIT');

  const actions = [];

  switch (phase) {
    case 'draft':
      if (isAuthor) {
        actions.push({
          code: 'SEND_FOR_APPROVAL',
          label: 'Odeslat ke schválení',
          targetState: 'ODESLANA_KE_SCHVALENI',
          color: '#f59e0b',
          icon: '📤'
        });
        actions.push({
          code: 'SAVE_DRAFT',
          label: 'Uložit koncept',
          targetState: 'NOVA',
          color: '#6b7280',
          icon: '💾'
        });
      }
      break;

    case 'approval':
      if (canApprove) {
        actions.push({
          code: 'APPROVE',
          label: 'Schválit',
          targetState: 'SCHVALENA',
          color: '#10b981',
          icon: '✅'
        });
        actions.push({
          code: 'REJECT',
          label: 'Zamítnout',
          targetState: 'ZAMITNUTA',
          color: '#ef4444',
          icon: '❌'
        });
        actions.push({
          code: 'RETURN_TO_AUTHOR',
          label: 'Vrátit k úpravě',
          targetState: 'NOVA',
          color: '#6b7280',
          icon: '↩️'
        });
      }
      break;

    case 'approved':
      if (canEdit || isAuthor) {
        actions.push({
          code: 'SEND_TO_SUPPLIER',
          label: 'Odeslat dodavateli',
          targetState: 'CEKA_POTVRZENI',
          color: '#3b82f6',
          icon: '📤'
        });
      }
      if (canApprove) {
        actions.push({
          code: 'REOPEN_APPROVAL',
          label: 'Znovu ke schválení',
          targetState: 'ODESLANA_KE_SCHVALENI',
          color: '#f59e0b',
          icon: '🔄'
        });
      }
      break;

    case 'rejected':
      if (isAuthor) {
        actions.push({
          code: 'RESUBMIT',
          label: 'Poslat znovu ke schválení',
          targetState: 'ODESLANA_KE_SCHVALENI',
          color: '#f59e0b',
          icon: '🔄'
        });
        actions.push({
          code: 'EDIT_DRAFT',
          label: 'Upravit koncept',
          targetState: 'NOVA',
          color: '#6b7280',
          icon: '✏️'
        });
      }
      break;

    case 'supplier_pending':
      if (canEdit) {
        actions.push({
          code: 'CONFIRM_SUPPLIER',
          label: 'Potvrdit od dodavatele',
          targetState: 'POTVRZENA',
          color: '#059669',
          icon: '✅'
        });
      }
      break;

    case 'supplier_confirmed':
      if (canEdit) {
        actions.push({
          code: 'COMPLETE',
          label: 'Dokončit objednávku',
          targetState: 'DOKONCENA',
          color: '#6b7280',
          icon: '🏁'
        });
      }
      break;
  }

  // Všechny stavy kromě finálních umožňují zrušení
  if (!['completed', 'cancelled'].includes(phase) && (canEdit || isAuthor)) {
    actions.push({
      code: 'CANCEL',
      label: 'Zrušit objednávku',
      targetState: 'ZRUSENA',
      color: '#9ca3af',
      icon: '🗑️',
      confirmRequired: true
    });
  }

  return actions;
};

/**
 * Formats workflow state for display
 * @param {string} workflowCode - Workflow state code
 * @returns {Object} - Formatted state info for UI
 */
export const formatWorkflowState = (workflowCode) => {
  const info = getWorkflowInfo(workflowCode);
  return {
    code: info.code,
    name: info.name,
    description: info.description,
    color: info.color,
    icon: info.icon,
    phase: info.phase
  };
};

/**
 * Gets human-readable label for a field
 * @param {string} fieldName - Field name
 * @returns {string} - Human-readable label
 */
export const getFieldLabel = (fieldName) => {
  return FIELD_LABELS[fieldName] || fieldName;
};

export default {
  validateWorkflowData,
  getSectionVisibility,
  getFieldEditability,
  getAvailableActions,
  formatWorkflowState,
  getFieldLabel
};