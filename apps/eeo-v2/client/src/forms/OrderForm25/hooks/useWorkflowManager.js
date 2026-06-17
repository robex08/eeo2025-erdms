/**
 * useWorkflowManager.js
 *
 * 🎯 CENTRALIZOVANÝ WORKFLOW MANAGER pro OrderForm25
 *
 * Účel:
 * - Jednotná logika pro určení aktuální fáze objednávky (1-10)
 * - Generování progress baru s fázemi
 * - Určení téma barev podle fáze
 * - Eliminace duplicitní logiky v komponentě
 *
 * @author Senior Developer
 * @date 31. října 2025
 */

import { useMemo, useCallback, useState } from 'react';

const WORKFLOW_MANAGER_DEBUG_LOGS = false;

// Dedupe varování (spam) — zapamatujeme si už vypsaná varování a vypíšeme je pouze jednou.
const _loggedWarnings = new Set();
function warnOnce(id, msg, meta) {
  try {
    const key = id + '|' + (meta && typeof meta === 'object' ? JSON.stringify(meta) : String(meta));
    if (_loggedWarnings.has(key)) return;
    _loggedWarnings.add(key);
  } catch (_err) {
    // Pokud JSON.stringify selže, fallback na id-only klíč
    if (_loggedWarnings.has(id)) return;
    _loggedWarnings.add(id);
  }

  if (typeof console !== 'undefined') {
    if (console.error) console.error(msg, meta);
    else if (console.warn) console.warn(msg, meta);
  }
}

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
  const result = states.includes(state);

  // 🐛 DEBUG: Log typu state parametru — vypisujeme pouze jednou pro stejný payload
  if (typeof state !== 'string' || (typeof state === 'string' && state.includes(',')) || Array.isArray(state)) {
    warnOnce('hasWorkflowState', '⚠️ [hasWorkflowState] CHYBA: state by měl být string, ne pole!', {
      state,
      typeofState: typeof state,
      isArray: Array.isArray(state),
      workflowCode,
      parsedStates: states
    });
  }

  return result;
};

/**
 * 🔒 DEFINICE SEKCÍ S JEJICH WORKFLOW VAZBAMI
 *
 * Každá sekce má:
 * - name: Lidsky čitelný název
 * - phase: Číslo fáze, kdy se sekce zobrazuje (null = vždy viditelná)
 * - visibilityLogic: Funkce určující, zda je sekce VIDITELNÁ (context) => boolean
 * - lockLogic: Funkce určující, zda je sekce ZAMČENÁ/DISABLED (context) => boolean
 */
const SECTION_DEFINITIONS = {
  objednatel: {
    name: 'Objednatel',
    phase: 1,
    visibilityLogic: (context) => context.currentPhase >= 1,
    lockLogic: (context) => {
      // ✅ FÁZE 1 (NOVA) = VŽDY ODEMČENO pro nové objednávky
      if (context.currentPhase === 1 && !context.formData.id) {
        return false; // ODEMČENO
      }

      // ✅ ADMIN UNLOCK: Pokud admin odemkl fázi 1, povolit editaci
      if (context.unlockStates?.phase1) {
        return false; // ODEMČENO adminorem
      }

      // ✅ ADMIN UNLOCK FÁZE 2: Pokud admin odemkl fázi 2 (resetuje na FÁZI 2), povolit editaci
      // Tento unlock se používá z PO sekce a resetuje workflow na ODESLANA_KE_SCHVALENI
      if (context.unlockStates?.phase2) {
        return false; // ODEMČENO adminorem (resetoval na FÁZI 2, objednatel musí být odemčený)
      }

      // 🔒 FÁZE 2 (ODESLANA_KE_SCHVALENI / CEKA_SE): po znovu-otevření má být sekce pro běžné uživatele READONLY.
      // Výjimka: uživatel s oprávněním upravovat během schvalování (např. ORDER_APPROVE/ORDER_MANAGE, příkazce objednávky, admin).
      if (context.currentPhase === 2 && !!context.formData?.id && !context.canEditDuringApprovalPhase) {
        return true; // ZAMČENO během schvalování
      }

      // ✅ Zamknout POUZE pokud jsme PŘEŠLI fázi 2 (currentPhase > 2)
      // FÁZE 2 = ODESLANA_KE_SCHVALENI - sekce Objednatel musí být odemčená
      if (context.currentPhase > 2) {
        return true; // ZAMČENO (jsme už dál než fáze 2)
      }

      return false; // Jinak ODEMČENO
    }
  },
  schvaleni: {
    name: 'Schválení',
    phase: 1,
    visibilityLogic: (context) => context.currentPhase >= 1,
    lockLogic: (context) => {
      // ✅ FÁZE 1 (NOVA) = VŽDY ODEMČENO pro nové objednávky
      if (context.currentPhase === 1 && !context.formData.id) {
        return false; // ODEMČENO
      }

      // ✅ ADMIN UNLOCK: Pokud admin odemkl fázi 1, povolit editaci
      if (context.unlockStates?.phase1) {
        return false; // ODEMČENO adminorem
      }

      // ✅ ADMIN UNLOCK FÁZE 2: Pokud admin odemkl fázi 2 (resetuje na FÁZI 2), povolit editaci
      // Tento unlock se používá z PO sekce a resetuje workflow na ODESLANA_KE_SCHVALENI
      if (context.unlockStates?.phase2) {
        return false; // ODEMČENO adminorem (resetoval na FÁZI 2, takže PO sekce musí být odemčená)
      }

      // 🔒 FÁZE 2 (ODESLANA_KE_SCHVALENI / CEKA_SE): po znovu-otevření má být sekce pro běžné uživatele READONLY.
      // Výjimka: uživatel s oprávněním upravovat během schvalování (např. ORDER_APPROVE/ORDER_MANAGE, příkazce objednávky, admin).
      if (context.currentPhase === 2 && !!context.formData?.id && !context.canEditDuringApprovalPhase) {
        return true; // ZAMČENO během schvalování
      }

      // ✅ Zamknout POUZE pokud jsme PŘEŠLI fázi 2 (currentPhase > 2)
      // FÁZE 2 = ODESLANA_KE_SCHVALENI - PO sekce (schválení) musí být odemčená
      if (context.currentPhase > 2) {
        return true; // ZAMČENO (jsme už dál než fáze 2)
      }

      return false; // Jinak ODEMČENO
    }
  },
  // ❌ SEKCE "prilohy" ODSTRANĚNA - je nyní mimo workflow systém, řízena samostatně v OrderForm25.js
  // Viditelná pouze když má objednávka ID, zamčená pouze při stavu DOKONCENA
  financovani: {
    name: 'Financování',
    phase: 1, // ✅ Fáze 1-2 (viditelné a editovatelné od začátku)
    visibilityLogic: (context) => context.currentPhase >= 1, // ✅ Viditelné od fáze 1
    lockLogic: (context) => {
      // ✅ FÁZE 1: Odemčeno pro vyplnění
      if (context.currentPhase === 1) {
        return false; // ODEMČENO
      }

      // 🔒 FÁZE 2 (ODESLANA_KE_SCHVALENI / CEKA_SE): běžný uživatel po znovu-otevření nesmí měnit financování.
      // Výjimka: uživatel s oprávněním upravovat během schvalování (ORDER_APPROVE/ORDER_MANAGE, příkazce, admin).
      if (context.currentPhase === 2) {
        return !!context.formData?.id && !context.canEditDuringApprovalPhase;
      }

      // ✅ FÁZE 3+: Zamčeno (financování se už nemění po schválení)
      if (context.currentPhase >= 3) {
        return true; // ZAMČENO
      }

      return false; // Jinak odemčeno (fallback)
    }
  },
  dodavatel: {
    name: 'Dodavatel',
    phase: 3, // ✅ Fáze 3
    visibilityLogic: (context) => context.currentPhase >= 3,
    lockLogic: (context) => {
      if (context.unlockStates?.phase3_sections) {
        return false;
      }
      if (context.currentPhase > 3) {
        return true;
      }
      return false;
    }
  },
  kontakt: {
    name: 'Kontakt',
    phase: 3, // ✅ Fáze 3
    visibilityLogic: (context) => context.currentPhase >= 3,
    lockLogic: (context) => {
      if (context.unlockStates?.phase3_sections) {
        return false;
      }
      if (context.currentPhase > 3) {
        return true;
      }
      return false;
    }
  },
  detaily: {
    name: 'Detaily',
    phase: 3, // ✅ Fáze 3
    visibilityLogic: (context) => context.currentPhase >= 3,
    lockLogic: (context) => {
      if (context.unlockStates?.phase3_sections) {
        return false;
      }
      if (context.currentPhase > 3) {
        return true;
      }
      return false;
    }
  },
  dodaci_podminky: {
    name: 'Dodací podmínky',
    phase: 3, // ✅ Fáze 3
    visibilityLogic: (context) => context.currentPhase >= 3,
    lockLogic: (context) => {
      if (context.unlockStates?.phase3_sections) {
        return false;
      }
      if (context.currentPhase > 3) {
        return true;
      }
      return false;
    }
  },
  stav_odeslani: {
    name: 'Stav odeslání',
    phase: 3, // ✅ Fáze 3
    visibilityLogic: (context) => context.currentPhase >= 3,
    lockLogic: (context) => {
      if (context.unlockStates?.phase3_sections) {
        return false;
      }
      if (context.currentPhase > 3) {
        return true;
      }
      return false;
    }
  },
  potvrzeni_objednavky: {
    name: 'Potvrzení objednávky',
    phase: 3,
    visibilityLogic: (context) => {
      // ❌ SKRYTÁ pro POKLADNA režim
      if (context.isPokladna) return false;
      return context.currentPhase >= 4;
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto od FÁZE 5+ (pokud není explicitně odemčeno)
      return context.currentPhase >= 5 && !context.unlockStates?.potvrzeni;
    }
  },
  registr_smluv: {
    name: 'Registr smluv',
    phase: 4,  // ✅ FÁZE 4 - pouze CHECKBOX "Má být zveřejněna"
    visibilityLogic: (context) => {
      // ❌ SKRYTÁ pro POKLADNA režim
      if (context.isPokladna) return false;
      // ✅ Viditelný ve FÁZI 4+ když dodavatel potvrdil ANO
      // ✅ ZMĚNA: Zobrazit i ve FÁZI 6+ (historie rozhodnutí)
      const potvrzeniAno = context.formData.dodavatel_zpusob_potvrzeni?.potvrzeni === 'ANO';
      return potvrzeniAno && context.currentPhase >= 4;
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto od FÁZE 5+ (pokud není explicitně odemčeno)
      return context.currentPhase >= 5 && !context.unlockStates?.registr;
    }
  },
  registr_smluv_vyplneni: {
    name: 'Vyplnění registru smluv',
    phase: 5,  // ✅ NOVÁ FÁZE 5 - DATUM + IDDT + checkbox
    visibilityLogic: (context) => {
      // ❌ SKRYTÁ pro POKLADNA režim
      if (context.isPokladna) return false;
      // ✅ Viditelný když workflow obsahuje UVEREJNIT nebo UVEREJNENA
      // ✅ ZMĚNA: Zobrazit i když je UVEREJNENA (jako disabled ve FÁZI 6+)
      const hasUverejnit = hasWorkflowState(context.formData.stav_workflow_kod, 'UVEREJNIT');
      const hasUverejnena = hasWorkflowState(context.formData.stav_workflow_kod, 'UVEREJNENA');
      return hasUverejnit || hasUverejnena;
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto od FÁZE 6+ (pokud není explicitně odemčeno)
      return context.currentPhase >= 6 && !context.unlockStates?.registr_vyplneni;
    }
  },
  prubeh_objednavky: {
    name: 'Průběh objednávky',
    phase: null,
    visibilityLogic: () => true, // Vždy viditelná
    lockLogic: () => false // Nikdy zamčená
  },
  dodaci_informace: {
    name: 'Dodací informace',
    phase: null,
    visibilityLogic: () => true,
    lockLogic: () => false
  },
  fakturace: {
    name: 'Fakturace',
    phase: 6,  // ✅ ZMĚNA: 8 → 6
    visibilityLogic: (context) => {
      // ❌ SKRYTÁ pro POKLADNA režim
      if (context.isPokladna) return false;
      // ✅ Viditelná od fáze 6 A VÝŠE (6, 7, 8, 9)
      // Zobrazí se když: UVEREJNENA (z FÁZE 5) nebo NEUVEREJNIT (přeskočeno z FÁZE 4) nebo FAKTURACE
      return context.currentPhase >= 6;
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto od FÁZE 7+ (pokud není explicitně odemčeno)
      return context.currentPhase >= 7 && !context.unlockStates?.fakturace;
    }
  },
  vecna_spravnost: {
    name: 'Věcná správnost',
    phase: 7,  // ✅ ZMĚNA: 9 → 7
    visibilityLogic: (context) => {
      // ✅ Viditelná od fáze 7 A VÝŠE (7, 8, 9)
      return context.currentPhase >= 7;
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto od FÁZE 8+ (pokud není explicitně odemčeno)
      return context.currentPhase >= 8 && !context.unlockStates?.vecna_spravnost;
    }
  },
  dokonceni: {
    name: 'Dokončení',
    phase: 8,  // ✅ FÁZE 8 - zobrazuje se po ZKONTROLOVANA (ve stejné fázi)
    visibilityLogic: (context) => {
      // 🔒 Viditelná POUZE když:
      // 1. Objednávka je SKUTEČNĚ DOKONČENA (stav DOKONCENA)
      // 2. NEBO má uživatel právo canUnlockAnything (bude předáno z extendedSectionStates)
      // Poznámka: canUnlockAnything kontrola je v OrderForm25.js v extendedSectionStates
      const isDokoncena = hasWorkflowState(context.formData.stav_workflow_kod, 'DOKONCENA');
      return isDokoncena; // základní viditelnost - rozšířeno v extendedSectionStates
    },
    lockLogic: (context) => {
      // 🔒 Zamknuto po DOKONCENA (pokud není explicitně odemčeno)
      return hasWorkflowState(context.formData.stav_workflow_kod, 'DOKONCENA') && !context.unlockStates?.dokonceni;
    }
  }
};

/**
 * 🎯 CENTRALIZOVANÁ LOGIKA STAVU SEKCÍ
 *
 * Určuje kompletní stav sekce: visible (viditelná) a enabled (odemčená).
 * Toto je JEDINÁ SOURCE OF TRUTH pro stavy sekcí!
 *
 * @param {string} sectionKey - Klíč sekce (např. 'objednatel', 'prilohy')
 * @param {Object} formData - Data formuláře
 * @param {Object} unlockStates - Stavy odemčení sekcí
 * @param {Object} context - Dodatečný kontext (permissions, flags)
 * @returns {Object} { visible: boolean, enabled: boolean }
 */
const calculateSectionState = (sectionKey, formData, unlockStates = {}, context = {}) => {
  const section = SECTION_DEFINITIONS[sectionKey];
  if (!section) {
    return { visible: false, enabled: false }; // neznámá sekce není viditelná ani odemčená
  }

  // 🏛️ Detekce archivované objednávky
  const isArchived = context.isArchived || false;

  // Kontext pro vyhodnocení (všechny potřebné flagy)
  const evalContext = {
    formData,
    currentPhase: context.currentPhase || calculateCurrentPhase(formData),
    isArchived, // 🏛️ Přidán flag pro archivované objednávky

    // 🔒 Permission/role gating pro editace ve fázi 2 (ke schválení)
    canEditDuringApprovalPhase: context.canEditDuringApprovalPhase || false,

    // Unlock stavy (pro přístup v lockLogic funkcích)
    // ✅ FIX: Použít správné klíče z OrderForm25.js (phase1, phase2, phase3, ...)
    unlockStates: {
      phase1: unlockStates.phase1 || false,
      phase2: unlockStates.phase2 || false,
      phase3: unlockStates.phase3 || false,
      registr: unlockStates.registr || false,
      fakturace: unlockStates.fakturace || false,
      vecna_spravnost: unlockStates.vecna_spravnost || false,
      dokonceni: unlockStates.dokonceni || false,
      potvrzeni: unlockStates.potvrzeni || false
    },

    // Permissions
    canEditApprovedSections: context.canEditApprovedSections || false,

    // UI flags
    showSaveProgress: context.showSaveProgress || false,
    isSaving: context.isSaving || false,

    // Workflow locks (centrální vypočítané hodnoty)
    isWorkflowLocked: context.isWorkflowLocked || false,

    // Phase-specific locks (vypočítané v OrderForm25)
    shouldLockPhase1Sections: context.shouldLockPhase1Sections || false,
    shouldLockPhase2Sections: context.shouldLockPhase2Sections || false,
    shouldLockPhase3Sections: context.shouldLockPhase3Sections || false,

    // Section-specific locks
    isRegistrLocked: context.isRegistrLocked || false,
    isFakturaceDisplayLocked: context.isFakturaceDisplayLocked || false,
    isVecnaSpravnostLocked: context.isVecnaSpravnostLocked || false,
    isDokonceniLocked: context.isDokonceniLocked || false
  };

  // 🏛️ ARCHIVOVANÉ OBJEDNÁVKY: Zobraz VŠECHNY sekce (viditelné vždy = true)
  // Vyhodnotit viditelnost: buď archivované (vždy true) NEBO původní logika podle fáze
  const visible = isArchived || section.visibilityLogic(evalContext);

  // 🔒 CENTRÁLNÍ GLOBÁLNÍ ZÁMEK: Pokud je isWorkflowLocked = true, VŠECHNY sekce jsou zamčené
  // isWorkflowLocked = isFormLocked (DOKONCENA || ZAMITNUTA || ZRUSENA) && !canUnlockAnything
  if (evalContext.isWorkflowLocked) {
    return {
      visible,
      enabled: false // GLOBÁLNĚ ZAMČENO - formulář je v jednom z finálních stavů
    };
  }

  // 🏛️ ARCHIVOVANÉ OBJEDNÁVKY: Všechny sekce ODEMČENÉ (locked = false)
  // Vyhodnotit zamčení: buď archivované (vždy false = odemčeno) NEBO původní logika
  const locked = visible ? (isArchived ? false : section.lockLogic(evalContext)) : false;

  return {
    visible,
    enabled: !locked // enabled = opak locked
  };
};

/**
 * 🔒 ZPĚTNÁ KOMPATIBILITA: CENTRALIZOVANÁ LOGIKA ZAMYKÁNÍ SEKCÍ
 *
 * @deprecated Použij raději calculateSectionState() která vrací { visible, enabled }
 * @returns {boolean} true = sekce JE zamčená, false = sekce NENÍ zamčená
 */
const calculateSectionLockState = (sectionKey, formData, unlockStates = {}, context = {}) => {
  // Použij novou funkci a vrať jen 'enabled' stav (invertovaný)
  const state = calculateSectionState(sectionKey, formData, unlockStates, context);
  return !state.enabled; // locked = opak enabled
};

/**
 * 🎯 DEFINICE 10 FÁZÍ WORKFLOW
 *
 * FÁZE 1/10: NOVA - Vytvoření konceptu (není v DB)
 * FÁZE 2/10: ODESLANA_KE_SCHVALENI - Čeká na schválení
 * FÁZE 3/10: SCHVALENA (+ROZPRACOVANA) - Schválená, uživatel vyplňuje detaily
 *             - SCHVALENA = právě odemknuto, čeká na vyplnění
 *             - SCHVALENA + ROZPRACOVANA = uloženo, ale ještě neodesláno (pracuje se na tom)
 * FÁZE 4/10: ODESLANA - Odesláno dodavateli (nahrazuje ROZPRACOVANA)
 * FÁZE 5/10: POTVRZENA - Potvrzena dodavatelem (zobrazí se sekce Registr smluv s checkboxem "Má být zveřejněna")
 * FÁZE 6/10: (REZERVOVÁNO - nyní nepoužito)
 * FÁZE 7/10: UVEREJNIT - Rozhodnuto o zveřejnění (vyplňování údajů o zveřejnění)
 * FÁZE 8/10: FAKTURACE nebo NEUVEREJNIT - Faktury přidány (nebo přeskočeno ze 5 pokud NE)
 * FÁZE 9/10: KONTROLA/ZKONTROLOVANA - Věcná správnost
 * FÁZE 10/10: DOKONCENA - Hotovo
 */
const PHASE_DEFINITIONS = [
  { id: 1, name: 'Vytvoření', class: 'phase-1', description: 'Vytvoření konceptu' },
  { id: 2, name: 'Ke schválení', class: 'phase-2', description: 'Čeká na schválení' },
  { id: 3, name: 'Schválená', class: 'phase-3', description: 'Schválená, rozpracovaná' },
  { id: 4, name: 'Odesláno', class: 'phase-4', description: 'Odesláno dodavateli' },
  { id: 5, name: 'Potvrzená', class: 'phase-5', description: 'Potvrzena dodavatelem' },
  { id: 6, name: 'Rozhodnutí', class: 'phase-6', description: 'Rozhodnutí o zveřejnění' },
  { id: 7, name: 'Uveřejnění', class: 'phase-7', description: 'Vyplnění údajů o zveřejnění' },
  { id: 8, name: 'Fakturace', class: 'phase-8', description: 'Faktury přidány' },
  { id: 9, name: 'Věcná správnost', class: 'phase-9', description: 'Věcná správnost' },
  { id: 10, name: 'Dokončená', class: 'phase-10', description: 'Hotovo' }
];

/**
 * 🎯 CENTRALIZOVANÁ LOGIKA PRO URČENÍ AKTUÁLNÍ FÁZE
 *
 * Tato funkce je JEDINÁ SOURCE OF TRUTH pro určení fáze objednávky.
 * Veškerá logika je zde - žádné duplicity!
 *
 * ✅ FÁZE SE URČUJE PODLE POSLEDNÍHO STAVU V stav_workflow_kod
 *
 * @param {Object} formData - Data formuláře objednávky
 * @returns {number} Číslo aktuální fáze (1-10)
 */
const calculateCurrentPhase = (formData) => {
  // FÁZE 1: Není uloženo v DB NEBO má explicitní stav NOVA/KONCEPT
  if (!formData.id || hasWorkflowState(formData.stav_workflow_kod, 'NOVA')) {
    return 1;
  }

  // ✅ KLÍČOVÁ ZMĚNA: Bere POUZE POSLEDNÍ STAV (aktuální), ne všechny historické
  const workflowStates = parseWorkflowStates(formData.stav_workflow_kod);
  const lastState = workflowStates[workflowStates.length - 1];

  // Mapování posledního stavu na fázi (8 fází celkem)
  const stateToPhaseMap = {
    'DOKONCENA': 8,          // ✅ DOKONCENA = konec procesu ve FÁZI 8 (ne samostatná fáze 9)
    'ZKONTROLOVANA': 8,      // ✅ FÁZE 8 - zobrazí sekci Dokončení
    'VECNA_SPRAVNOST': 7,    // ✅ FÁZE 7 - Věcná správnost
    'FAKTURACE': 6,          // ✅ FÁZE 6 - Fakturace
    'NEUVEREJNIT': 6,        // ✅ FÁZE 6 - přeskočí FÁZI 5
    'UVEREJNENA': 6,         // ✅ FÁZE 6
    'UVEREJNIT': 5,          // ✅ FÁZE 5 - volitelná (vyplnění registru)
    'POTVRZENA': 4,          // ✅ FÁZE 4 - Potvrzení dodavatele + rozhodnutí o zveřejnění
    'ODESLANA': 4,
    'ROZPRACOVANA': 3,
    'SCHVALENA': 3,
    'ZRUSENA': 3,            // 🚫 STORNOVÁNA = FÁZE 3 (storno před odesláním, viditelné jen do schválení)
    'ZAMITNUTA': 3,          // ❌ ZAMÍTNUTA = FÁZE 3 (zamítnutí při schválení)
    'CEKA_SE': 2,
    'ODESLANA_KE_SCHVALENI': 2,
    'NOVA': 1
  };

  const phase = stateToPhaseMap[lastState] || 1;
  
  // 🔍 DEBUG: Výpis aktuální fáze
  // console.log('🔍 WORKFLOW MANAGER - CALCULATE PHASE:', {
  //   stav_workflow_kod: formData.stav_workflow_kod,
  //   workflowStates: workflowStates,
  //   lastState: lastState,
  //   calculatedPhase: phase
  // });

  return phase;
};

/**
 * 🎨 Určení téma barvy podle fáze
 */
const getPhaseTheme = (workflowCode) => {
  // Storno má error téma - kontrola přes workflow stav ZRUSENA
  if (hasWorkflowState(workflowCode, 'ZRUSENA')) {
    return 'phase-error';
  }

  // FÁZE 4+: POTVRZENA nebo DOKONCENA
  if (hasWorkflowState(workflowCode, 'POTVRZENA') ||
      hasWorkflowState(workflowCode, 'DOKONCENA')) {
    return 'phase-4';
  }

  // FÁZE 3: SCHVALENA + ODESLANA
  if (hasWorkflowState(workflowCode, 'SCHVALENA') &&
      hasWorkflowState(workflowCode, 'ODESLANA')) {
    return 'phase-3';
  }

  // FÁZE 2: Pouze SCHVALENA (ale ne ODESLANA)
  if (hasWorkflowState(workflowCode, 'SCHVALENA')) {
    return 'phase-2';
  }

  // FÁZE 1: NOVA, CEKA_SE, ZAMITNUTA
  return 'phase-1';
};

/**
 * 🔓 UNLOCK HELPERS - Funkce pro odemykání sekcí s modifikací workflow
 *
 * Tyto funkce vrací POUZE DATA pro aktualizaci - nemodifikují state přímo!
 * OrderForm25 je zodpovědný za volání setFormData() s vrácenými daty.
 */

/**
 * Připraví data pro odemknutí FÁZE 2 (Přílohy)
 * Vrací: { updatedFormData, unlockState }
 */
const preparePhase2Unlock = (formData) => {
  // ✅ ODEMKNUTÍ FÁZE 2 = vrátit se na ODESLANA_KE_SCHVALENI (vymazat všechny vyšší fáze)
  const newWorkflowCode = JSON.stringify(['ODESLANA_KE_SCHVALENI']);

  return {
    updatedFormData: {
      ...formData,
      stav_odeslano: false,
      datum_odeslani: '',
      // 🛑 ODSTRANĚNO: stav_stornovano, datum_storna - neexistují v DB
      odeslani_storno_duvod: '',
      stav_workflow_kod: newWorkflowCode,
      dodavatel_zpusob_potvrzeni: { potvrzeni: '', datum: '', zpusob: '', poznamka: '' },
      dt_akceptace: '',
      stav_u_dodavatele: '',
      datum_zmeny_stavu: '',
      poznamka_stav: '',
      cislo_zasilky: '',
      prepravce: '',
      ocekavane_doruceni: '',
      skutecne_doruceni: '',
      cislo_faktury: '',
      datum_faktury: '',
      castka_bez_dph: '',
      castka_s_dph: '',
      datum_platby: '',
      dt_zverejneni: '',
      registr_iddt: '',
      ma_byt_zverejnena: false,
      faktury: []
    },
    unlockState: 'phase2',
    newPhase: 2
  };
};

/**
 * Připraví data pro odemknutí FÁZE 3 (Financování, Dodavatel, Detaily...)
 * Vrací: { updatedFormData, unlockState }
 */
const preparePhase3Unlock = (formData) => {
  // ✅ ODEMKNUTÍ FÁZE 3 = vrátit se na SCHVALENA (vymazat všechny vyšší fáze)
  const newWorkflowCode = JSON.stringify(['SCHVALENA']);

  return {
    updatedFormData: {
      ...formData,
      stav_workflow_kod: newWorkflowCode,
      stav_odeslano: false,
      datum_odeslani: '',
      dodavatel_zpusob_potvrzeni: { potvrzeni: '', datum: '', zpusob: '', poznamka: '' },
      dt_akceptace: '',
      stav_u_dodavatele: '',
      datum_zmeny_stavu: '',
      poznamka_stav: '',
      cislo_zasilky: '',
      prepravce: '',
      ocekavane_doruceni: '',
      skutecne_doruceni: '',
      cislo_faktury: '',
      datum_faktury: '',
      castka_bez_dph: '',
      castka_s_dph: '',
      datum_platby: '',
      faktury: [],
      dt_zverejneni: '',
      registr_iddt: '',
      ma_byt_zverejnena: false,
      potvrdil_vecnou_spravnost_id: '',
      dt_potvrzeni_vecne_spravnosti: '',
      vecna_spravnost_poznamka: ''
    },
    unlockState: 'phase3_sections',
    newPhase: 3
  };
};

/**
 * Připraví data pro odemknutí FÁZE 4 (Potvrzení dodavatele)
 * Vrací: { updatedFormData, unlockState }
 */
const preparePhase4Unlock = (formData) => {
  // ✅ ODEMKNUTÍ FÁZE 4 = vrátit se na ["SCHVALENA", "ODESLANA"] (vymazat všechny vyšší fáze)
  const newWorkflowCode = JSON.stringify(['SCHVALENA', 'ODESLANA']);

  return {
    updatedFormData: {
      ...formData,
      stav_workflow_kod: newWorkflowCode,
      dodavatel_zpusob_potvrzeni: { potvrzeni: '', datum: '', zpusob: '', poznamka: '' },
      dt_akceptace: '',
      dt_zverejneni: '',
      registr_iddt: '',
      faktury: [],
      potvrdil_vecnou_spravnost_id: null,
      dt_potvrzeni_vecne_spravnosti: '',
      potvrzeni_vecne_spravnosti: 0,
      dokoncil_id: null,
      dt_dokonceni: '',
      potvrzeni_dokonceni_objednavky: 0
    },
    unlockState: 'potvrzeni',
    newPhase: 4
  };
};

/**
 * ============================================================================
 * 🎯 WORKFLOW STATE MANAGEMENT - Centralizované řízení stavů workflow
 * ============================================================================
 * 
 * Tyto metody spravují VŠECHNY přechody mezi stavy workflow.
 * ŽÁDNÁ jiná část kódu by neměla manipulovat se stav_workflow_kod!
 */

/**
 * Základní pořadí stavů workflow
 */
const WORKFLOW_ORDER = [
  'ODESLANA_KE_SCHVALENI',
  'CEKA_SE',
  'ZAMITNUTA',
  'SCHVALENA',
  'ROZPRACOVANA',
  'ODESLANA',
  'ZRUSENA',
  'POTVRZENA',
  'UVEREJNIT',
  'UVEREJNENA',
  'NEUVEREJNIT',
  'FAKTURACE',
  'VECNA_SPRAVNOST',
  'ZKONTROLOVANA',
  'DOKONCENA'
];

/**
 * Přidá stav do workflow (pokud ještě není)
 */
const addWorkflowState = (currentStates, newState) => {
  const states = Array.isArray(currentStates) ? [...currentStates] : parseWorkflowStates(currentStates);
  if (!states.includes(newState)) {
    states.push(newState);
  }
  return states;
};

/**
 * Odebere stav z workflow
 */
const removeWorkflowState = (currentStates, stateToRemove) => {
  const states = Array.isArray(currentStates) ? [...currentStates] : parseWorkflowStates(currentStates);
  return states.filter(s => s !== stateToRemove);
};

/**
 * Odebere všechny stavy vyšší než zadaný stav (podle WORKFLOW_ORDER)
 */
const removeStatesAfter = (currentStates, afterState) => {
  const states = Array.isArray(currentStates) ? [...currentStates] : parseWorkflowStates(currentStates);
  const afterIndex = WORKFLOW_ORDER.indexOf(afterState);
  if (afterIndex === -1) return states;
  
  const allowedStates = WORKFLOW_ORDER.slice(0, afterIndex + 1);
  return states.filter(s => allowedStates.includes(s));
};

/**
 * 1️⃣ Schválení objednávky
 */
export const handleApproval = (currentWorkflow, skipWaitingStates = false) => {
  let states = parseWorkflowStates(currentWorkflow);
  
  // Odebrat konkurenční stavy
  states = states.filter(s => !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA'].includes(s));
  
  states = addWorkflowState(states, 'SCHVALENA');
  return states;
};

/**
 * 1️⃣B Čeká se na schválení
 */
export const handleWaitingForApproval = (currentWorkflow) => {
  let states = parseWorkflowStates(currentWorkflow);
  
  // Odebrat konkurenční stavy
  states = states.filter(s => !['ODESLANA_KE_SCHVALENI', 'ZAMITNUTA', 'SCHVALENA'].includes(s));
  
  states = addWorkflowState(states, 'CEKA_SE');
  return states;
};

/**
 * 2️⃣ Zamítnutí objednávky
 */
export const handleRejection = (currentWorkflow) => {
  let states = parseWorkflowStates(currentWorkflow);
  // Odebrat SCHVALENA a všechny vyšší stavy
  states = states.filter(s => !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'SCHVALENA', 'ROZPRACOVANA', 'ODESLANA', 'POTVRZENA', 'UVEREJNIT', 'UVEREJNENA', 'NEUVEREJNIT', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'].includes(s));
  states = addWorkflowState(states, 'ZAMITNUTA');
  return states;
};

/**
 * 3️⃣A Rozpracování schválené objednávky
 * Přidá ROZPRACOVANA pouze pokud už byla SCHVALENA (editace po schválení)
 */
export const handleWorkInProgress = (currentWorkflow, wasAlreadyApproved) => {
  let states = parseWorkflowStates(currentWorkflow);
  
  // Přidat ROZPRACOVANA pouze pokud už byla SCHVALENA předtím
  if (wasAlreadyApproved && states.includes('SCHVALENA') && !states.includes('ODESLANA')) {
    states = addWorkflowState(states, 'ROZPRACOVANA');
  } else {
    // Jinak odebrat (nemělo by být tam)
    states = removeWorkflowState(states, 'ROZPRACOVANA');
  }
  
  return states;
};

/**
 * 3️⃣B Odeslání dodavateli
 */
export const handleSendToSupplier = (currentWorkflow) => {
  let states = parseWorkflowStates(currentWorkflow);
  states = addWorkflowState(states, 'SCHVALENA');
  states = addWorkflowState(states, 'ODESLANA');
  return states;
};

/**
 * 4️⃣ Potvrzení dodavatelem
 */
export const handleSupplierConfirmation = (currentWorkflow, isConfirmed) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  if (isConfirmed) {
    states = addWorkflowState(states, 'POTVRZENA');
  } else {
    // Pokud dodavatel NEpotvrdil, vrátit na ODESLANA (odebrat POTVRZENA a vše za ní)
    states = removeStatesAfter(states, 'ODESLANA');
  }
  
  return states;
};

/**
 * 5️⃣ Rozhodnutí o zveřejnění v registru smluv
 */
export const handlePublishDecision = (currentWorkflow, shouldPublish) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  // Odstranit předchozí rozhodnutí
  states = states.filter(s => s !== 'UVEREJNIT' && s !== 'NEUVEREJNIT' && s !== 'UVEREJNENA');
  
  if (shouldPublish) {
    states = addWorkflowState(states, 'UVEREJNIT');
  } else {
    states = addWorkflowState(states, 'NEUVEREJNIT');
    // Automaticky přidat FAKTURACE
    states = addWorkflowState(states, 'FAKTURACE');
  }
  
  return states;
};

/**
 * 6️⃣ Vyplnění registru smluv (datum + IDDT) = skutečné zveřejnění
 */
export const handlePublishing = (currentWorkflow, hasDatum, hasIddt) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  if (hasDatum && hasIddt) {
    // Vyplněno → přejít na UVEREJNENA
    states = removeWorkflowState(states, 'UVEREJNIT');
    states = addWorkflowState(states, 'UVEREJNENA');
    states = addWorkflowState(states, 'FAKTURACE');
    // Odstranit vyšší fáze (pokud tam byly z předchozích změn)
    states = states.filter(s => !['VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'].includes(s));
    if (WORKFLOW_MANAGER_DEBUG_LOGS && typeof console !== 'undefined') {
      console.info('🧭 [WorkflowManager:handlePublishing]', {
        before: currentWorkflow,
        after: states,
        mode: 'UVEREJNENA + FAKTURACE',
      });
    }
  } else {
    // Smazáno → vrátit na UVEREJNIT
    states = removeWorkflowState(states, 'UVEREJNENA');
    states = states.filter(s => !['FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'].includes(s));
    states = addWorkflowState(states, 'UVEREJNIT');
    if (WORKFLOW_MANAGER_DEBUG_LOGS && typeof console !== 'undefined') {
      console.info('🧭 [WorkflowManager:handlePublishing]', {
        before: currentWorkflow,
        after: states,
        mode: 'UVEREJNIT',
      });
    }
  }
  
  return states;
};

/**
 * 7️⃣ Přidání/změna faktur
 * ⚠️ DEPRECATED: isPokladna parameter již není používán (vlastní modul Pokladní knihy)
 */
export const handleInvoiceChange = (currentWorkflow, hasInvoices, isPokladna = false) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  // ❌ POKLADNA režim byl DEPRECATED - již se nepoužívá
  
  // Normální režim fakturace
  if (hasInvoices) {
    // ✅ Má faktury → odebrat FAKTURACE (už není ve fázi "čekání na faktury")
    states = removeWorkflowState(states, 'FAKTURACE');
    
    // ✅ Přidat VECNA_SPRAVNOST (faktura přidána, čeká se na kontrolu věcné správnosti)
    states = addWorkflowState(states, 'VECNA_SPRAVNOST');
    if (WORKFLOW_MANAGER_DEBUG_LOGS && typeof console !== 'undefined') {
      console.info('🧭 [WorkflowManager:handleInvoiceChange]', {
        before: currentWorkflow,
        after: states,
        hasInvoices: true,
        isPokladna,
      });
    }
  } else {
    // ✅ DŮLEŽITÉ: Pokud je NEUVEREJNIT nebo UVEREJNENA, FAKTURACE zůstává (i bez faktur zatím)
    // NEUVEREJNIT → automaticky na FAKTURACE (čeká na přidání faktury)
    // UVEREJNENA → automaticky na FAKTURACE (čeká na přidání faktury)
    const maNeuverejnitNeboUverejnena = states.includes('NEUVEREJNIT') || states.includes('UVEREJNENA');
    
    if (maNeuverejnitNeboUverejnena) {
      // Zachovat FAKTURACE, ale odebrat vyšší fáze
      states = states.filter(s => !['VECNA_SPRAVNOST', 'ZKONTROLOVANA'].includes(s));
    } else {
      // Žádné faktury a nejsme v NEUVEREJNIT/UVEREJNENA → odebrat FAKTURACE a vyšší
      states = states.filter(s => !['FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'].includes(s));
    }
    if (WORKFLOW_MANAGER_DEBUG_LOGS && typeof console !== 'undefined') {
      console.info('🧭 [WorkflowManager:handleInvoiceChange]', {
        before: currentWorkflow,
        after: states,
        hasInvoices: false,
        isPokladna,
      });
    }
  }
  
  return states;
};

/**
 * 8️⃣ Potvrzení věcné správnosti (per-invoice checkboxy)
 */
export const handleQualityConfirmation = (currentWorkflow, allInvoicesConfirmed) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  if (allInvoicesConfirmed) {
    // Všechny faktury potvrzeny → ZKONTROLOVANA
    states = addWorkflowState(states, 'ZKONTROLOVANA');
  } else {
    // Některé faktury NEpotvrzeny → odebrat ZKONTROLOVANA
    states = removeWorkflowState(states, 'ZKONTROLOVANA');
  }
  
  return states;
};

/**
 * 9️⃣ Dokončení objednávky
 */
export const handleCompletion = (currentWorkflow, isCompleted) => {
  let states = parseWorkflowStates(currentWorkflow);

  // Pokud je objednávka stornovaná, vyšší workflow už nesmí vznikat
  if (states.includes('ZRUSENA')) {
    return states;
  }
  
  if (isCompleted) {
    states = addWorkflowState(states, 'DOKONCENA');
  } else {
    states = removeWorkflowState(states, 'DOKONCENA');
  }
  
  return states;
};

/**
 * 🔟 Storno objednávky
 */
export const handleCancellation = (currentWorkflow, isCancelled) => {
  let states = parseWorkflowStates(currentWorkflow);
  
  if (isCancelled) {
    // Pokud se objednávka stornuje, musí být ZRUSENA finální (aktuální) stav.
    // ✅ Odstranit všechny vyšší fáze (jinak by poslední stav mohl zůstat např. DOKONCENA)
    states = states.filter(s => ![
      'POTVRZENA',
      'UVEREJNIT',
      'NEUVEREJNIT',
      'UVEREJNENA',
      'FAKTURACE',
      'VECNA_SPRAVNOST',
      'ZKONTROLOVANA',
      'DOKONCENA',
      'K_DOKONCENI'
    ].includes(s));

    // Odebrat případné existující ZRUSENA a přidat ji nakonec (aktuální stav)
    states = states.filter(s => s !== 'ZRUSENA');
    states.push('ZRUSENA');
  } else {
    states = removeWorkflowState(states, 'ZRUSENA');
  }
  
  return states;
};

/**
 * ============================================================================
 * 🎯 HLAVNÍ HOOK - useWorkflowManager
 * ============================================================================
 *
 * Poskytuje centralizovaný přístup k workflow logice:
 * - getCurrentPhase() - aktuální fáze (1-10)
 * - getPhaseProgress() - data pro progress bar
 * - getPhaseTheme() - téma barvy pro fázi
 * - parseWorkflowStates() - parsování workflow kódu
 * - hasWorkflowState() - kontrola přítomnosti stavu
 * - unlockSection() - NOVÁ: Odemknutí sekce s vrácením dat pro update
 *
 * @param {Object} formData - Data formuláře objednávky
 * @param {boolean} isArchived - TRUE pokud je objednávka archivovaná
 * @returns {Object} Workflow manager API
 */
export const useWorkflowManager = (formData, isArchived = false) => {
  // 🔄 INTERNÍ STATE: Force refresh klíč pro přepočet workflow po změnách
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);

  // 💰 DETEKCE POKLADNA REŽIMU
  // Režim POKLADNA znamená:
  // - Přeskočení fází 3-6 (Potvrzení dodavatele, Registr, Zveřejnění, Fakturace)
  // - Automatický skok z ODESLANA → VECNA_SPRAVNOST (Fáze 7)
  // - Kontrola MAX ceny podle součtu položek (ne faktur)
  const isPokladna = useMemo(() => {
    // Kontrola v objektu financování
    const isPlatbaPokladnaObj = formData.financovani?.platba === 'pokladna';
    // Kontrola v dodavatel_zpusob_potvrzeni
    const isPlatbaPokladnaDodavatel = formData.dodavatel_zpusob_potvrzeni?.platba === 'pokladna';

    return isPlatbaPokladnaObj || isPlatbaPokladnaDodavatel;
  }, [formData.financovani?.platba, formData.dodavatel_zpusob_potvrzeni?.platba]);

  // 🔓 UNLOCK STATES: Centralizované stavy pro odemykání sekcí
  const [unlockedSections, setUnlockedSections] = useState({
    phase1: false,
    phase2: false,
    phase3_sections: false,
    potvrzeni: false,
    registr: false,
    registr_vyplneni: false,
    fakturace: false,
    vecna_spravnost: false,
    dokonceni: false
  });

  // 🔓 METODY PRO ODEMYKÁNÍ/ZAMYKÁNÍ SEKCÍ
  const unlockSection = useCallback((sectionKey) => {
    setUnlockedSections(prev => ({ ...prev, [sectionKey]: true }));
  }, []);

  const lockSection = useCallback((sectionKey) => {
    setUnlockedSections(prev => ({ ...prev, [sectionKey]: false }));
  }, []);

  const isSectionUnlocked = useCallback((sectionKey) => {
    return unlockedSections[sectionKey] || false;
  }, [unlockedSections]);

  const resetAllUnlocks = useCallback(() => {
    setUnlockedSections({
      phase1: false,
      phase2: false,
      phase3_sections: false,
      potvrzeni: false,
      registr: false,
      registr_vyplneni: false,
      fakturace: false,
      vecna_spravnost: false,
      dokonceni: false
    });
  }, []);

  // �🔄 FORCE REFRESH: Funkce pro vynucení přepočtu workflow (exportována v API)
  const forceRefresh = useCallback(() => {
    setWorkflowRefreshKey(prev => prev + 1);
  }, []);

  // 🎯 Aktuální fáze - useMemo pro optimalizaci
  // ✅ FÁZE SE URČUJE JEN PODLE stav_workflow_kod - žádné další atributy!
  // 🏛️ Pro archivované objednávky nastavíme fázi na 8 (všechny sekce viditelné)
  const currentPhase = useMemo(() => {
    // 🏛️ Archivované objednávky = fáze 8 (maximum)
    if (isArchived) {
      return 8;
    }

    const phase = calculateCurrentPhase(formData);
    return phase;
  }, [
    formData.id,
    formData.stav_workflow_kod,
    workflowRefreshKey,
    isArchived
  ]);

  // 🎯 Téma barvy pro fázi
  const phaseTheme = useMemo(() => {
    return getPhaseTheme(formData.stav_workflow_kod);
  }, [formData.stav_workflow_kod]);

  // 🎯 Progress bar data - kompletní informace o všech fázích
  const phaseProgress = useMemo(() => {
    // 🛑 ODSTRANĚNO: isStorno proměnná - používáme hasWorkflowState(workflowCode, 'ZRUSENA')
    const workflowCode = formData.stav_workflow_kod;

    return {
      currentPhase,
      phases: PHASE_DEFINITIONS.map((phase, index) => {
        const phaseNum = index + 1;
        let fillClass = phase.class;
        let isVisible = false;

        // Určení viditelnosti a barvy segmentu
        if (hasWorkflowState(workflowCode, 'ZRUSENA') && phaseNum >= 2) {
          fillClass = 'phase-error';
          isVisible = phaseNum <= Math.max(currentPhase, 2);
        } else {
          isVisible = phaseNum <= currentPhase;
        }

        return {
          ...phase,
          isVisible,
          isCurrent: phaseNum === currentPhase,
          fillClass
        };
      })
    };
  }, [currentPhase, formData.stav_workflow_kod]);

  // 🎯 Helper funkce jako useCallback
  const getCurrentPhaseCallback = useCallback(() => currentPhase, [currentPhase]);

  const getPhaseProgressCallback = useCallback(() => phaseProgress, [phaseProgress]);

  const getPhaseThemeCallback = useCallback(() => phaseTheme, [phaseTheme]);

  const parseWorkflowStatesCallback = useCallback((code) => {
    return parseWorkflowStates(code || formData.stav_workflow_kod);
  }, [formData.stav_workflow_kod]);

  // 🔥 OPRAVA: Callback musí přijímat 2 parametry (workflowCode, state)
  // protože v OrderForm25.js se volá ve 2 formách:
  // 1) hasWorkflowState(formData.stav_workflow_kod, 'STATE') - explicitní workflowCode
  // 2) hasWorkflowState('STATE') - použije formData.stav_workflow_kod
  const hasWorkflowStateCallback = useCallback((workflowCodeOrState, maybeState) => {
    // Pokud je pouze 1 parametr, použij formData.stav_workflow_kod jako workflowCode
    if (maybeState === undefined) {
      return hasWorkflowState(formData.stav_workflow_kod, workflowCodeOrState);
    }
    // Pokud jsou 2 parametry, použij první jako workflowCode
    return hasWorkflowState(workflowCodeOrState, maybeState);
  }, [formData.stav_workflow_kod]);

  // 🎯 Hlavní workflow state (pro zpětnou kompatibilitu s workflow25.js)
  const mainWorkflowState = useMemo(() => {
    const states = parseWorkflowStates(formData.stav_workflow_kod);

    // Hierarchie stavů pro určení hlavního stavu
    const stateHierarchy = [
      'DOKONCENA', 'POTVRZENA', 'CEKA_POTVRZENI', 'SCHVALENA',
      'ODESLANA_KE_SCHVALENI', 'ZAMITNUTA', 'ZRUSENA', 'NOVA'
    ];

    // Najdi nejvýznamnější stav
    for (const hierarchyState of stateHierarchy) {
      if (states.includes(hierarchyState)) {
        const stateMapping = {
          'CEKA_SE': 'ODESLANA_KE_SCHVALENI',
          'ODESLANA': 'CEKA_POTVRZENI'
        };
        return stateMapping[hierarchyState] || hierarchyState;
      }
    }

    // Fallback na poslední stav
    const lastState = states.length > 0 ? states[states.length - 1] : 'NOVA';

    // ROZPRACOVANA se chová jako SCHVALENA
    if (lastState === 'ROZPRACOVANA' && states.includes('SCHVALENA')) {
      return 'SCHVALENA';
    }

    return lastState || 'NOVA';
  }, [formData.stav_workflow_kod]);

  // 🎯 Section state helper (NOVÁ FUNKCE)
  const getSectionState = useCallback((sectionKey, unlockStates = {}, additionalContext = {}) => {
    return calculateSectionState(sectionKey, formData, unlockStates, {
      currentPhase,
      isPokladna,  // ✅ Přidáno: pro podmínky skrývání sekcí v POKLADNA režimu
      isArchived,  // 🏛️ Pro zobrazení všech sekcí u archivovaných
      ...additionalContext
    });
  }, [formData, currentPhase, isPokladna, isArchived]);

  // 🔒 Section locking helper (DEPRECATED - použij getSectionState)
  const getSectionLockState = useCallback((sectionKey, unlockStates = {}, additionalContext = {}) => {
    return calculateSectionLockState(sectionKey, formData, unlockStates, {
      currentPhase,
      isPokladna,  // ✅ Přidáno: pro podmínky skrývání sekcí v POKLADNA režimu
      ...additionalContext
    });
  }, [formData, currentPhase, isPokladna]);

  // 🔒 Get all section lock states (for Collapse All button)
  const getAllSectionLockStates = useCallback((unlockStates = {}, additionalContext = {}) => {
    const lockStates = {};
    Object.keys(SECTION_DEFINITIONS).forEach(sectionKey => {
      lockStates[sectionKey] = getSectionLockState(sectionKey, unlockStates, additionalContext);
    });
    return lockStates;
  }, [getSectionLockState]);

  // 🔒 DETEKCE DOKONČENÍ WORKFLOW (konečné stavy)
  // ✅ TRUE pro DOKONCENA, ZAMITNUTA, ZRUSENA - všechny jsou konec workflow
  const isWorkflowCompleted = useMemo(() => {
    return !!(
      formData.id && // Musí mít ID (uloženo v DB)
      (hasWorkflowStateCallback(formData.stav_workflow_kod, 'DOKONCENA') ||
       hasWorkflowStateCallback(formData.stav_workflow_kod, 'ZAMITNUTA') ||
       hasWorkflowStateCallback(formData.stav_workflow_kod, 'ZRUSENA'))
    );
  }, [formData.id, formData.stav_workflow_kod, hasWorkflowStateCallback, workflowRefreshKey]);

  // 🔒 DETEKCE ZAMÍTNUTÉ OBJEDNÁVKY
  const isWorkflowRejected = useMemo(() => {
    return !!(
      formData.id && // Musí mít ID (uloženo v DB)
      hasWorkflowStateCallback(formData.stav_workflow_kod, 'ZAMITNUTA') // Objednávka byla zamítnuta
    );
  }, [formData.id, formData.stav_workflow_kod, hasWorkflowStateCallback, workflowRefreshKey]);

  // 🔒 DETEKCE ZRUŠENÉ (STORNOVANÉ) OBJEDNÁVKY
  const isWorkflowCancelled = useMemo(() => {
    return !!(
      formData.id && // Musí mít ID (uloženo v DB)
      hasWorkflowStateCallback(formData.stav_workflow_kod, 'ZRUSENA') // Objednávka byla stornována
    );
  }, [formData.id, formData.stav_workflow_kod, hasWorkflowStateCallback, workflowRefreshKey]);

  // 🔒 UNIVERZÁLNÍ ZAMČENÍ FORMULÁŘE
  // TRUE když je objednávka v jednom z finálních stavů: DOKONCENA, ZAMITNUTA, ZRUSENA (stornována)
  const isFormLocked = useMemo(() => {
    return isWorkflowCompleted || isWorkflowRejected || isWorkflowCancelled;
  }, [isWorkflowCompleted, isWorkflowRejected, isWorkflowCancelled]);

  // 🎯 Get all section states (NOVÁ FUNKCE) - MUSÍ BÝT AŽ PO isFormLocked!
  const getAllSectionStates = useCallback((additionalContext = {}) => {
    const states = {};
    // � Přidat isWorkflowLocked do kontextu - když je formulář zamčený (DOKONCENA/ZAMITNUTA/ZRUSENA), všechny sekce jsou disabled
    const contextWithLock = {
      ...additionalContext,
      isWorkflowLocked: isFormLocked // ✅ Předat isFormLocked do všech sekcí
    };
    Object.keys(SECTION_DEFINITIONS).forEach(sectionKey => {
      states[sectionKey] = getSectionState(sectionKey, unlockedSections, contextWithLock);
    });

    return states;
  }, [getSectionState, currentPhase, formData.id, unlockedSections, isFormLocked]);

  // �🔓 UNLOCK API - Funkce pro přípravu odemknutí sekcí
  const unlockPhase2 = useCallback(() => {
    return preparePhase2Unlock(formData);
  }, [formData]);

  const unlockPhase3 = useCallback(() => {
    return preparePhase3Unlock(formData);
  }, [formData]);

  const unlockPhase4 = useCallback(() => {
    return preparePhase4Unlock(formData);
  }, [formData]);

  // 🎯 Return API
  return {
    // Computed values
    currentPhase,
    phaseTheme,
    phaseProgress,
    mainWorkflowState,

    // 💰 Payment mode detection
    isPokladna,                // NOVÁ: TRUE pokud je režim POKLADNA (přeskakují se fáze 3-6)

    // 🏛️ Archive mode detection
    isArchived,  // NOVÁ: TRUE pokud je objednávka archivovaná

    // 🆕 Workflow locking states
    isWorkflowCompleted,       // NOVÁ: objednávka je v konečném stavu (DOKONCENA || ZAMITNUTA || ZRUSENA)
    isWorkflowRejected,        // NOVÁ: objednávka byla zamítnuta
    isWorkflowCancelled,       // NOVÁ: objednávka byla stornována

    // 🔄 FORCE REFRESH API
    forceRefresh,              // NOVÁ: funkce pro vynucení přepočtu workflow

    // 🔓 UNLOCK/LOCK API - NOVÉ: Centralizované řízení odemykání sekcí
    unlockSection,             // Odemkne konkrétní sekci
    lockSection,               // Zamkne konkrétní sekci
    isSectionUnlocked,         // Zjistí zda je sekce odemčena
    resetAllUnlocks,           // Resetuje všechny unlock states (po uložení)
    unlockPhase2,              // Odemkne FÁZI 2 (Přílohy) - připraví data
    unlockPhase3,              // Odemkne FÁZI 3 (Financování, Dodavatel...) - připraví data
    unlockPhase4,              // Odemkne FÁZI 4 (Potvrzení dodavatele) - připraví data

    // 🆕 WORKFLOW STATE MANAGEMENT - Centralizované řízení všech přechodů
    handleApproval,            // Schválení objednávky
    handleWaitingForApproval,  // Čeká se na schválení (CEKA_SE)
    handleRejection,           // Zamítnutí objednávky
    handleWorkInProgress,      // Rozpracování (ROZPRACOVANA)
    handleSendToSupplier,      // Odeslání dodavateli
    handleSupplierConfirmation, // Potvrzení dodavatelem
    handlePublishDecision,     // Rozhodnutí o zveřejnění
    handlePublishing,          // Vyplnění registru (datum + IDDT)
    handleInvoiceChange,       // Přidání/změna faktur
    handleQualityConfirmation, // Potvrzení věcné správnosti
    handleCompletion,          // Dokončení objednávky
    handleCancellation,        // Storno objednávky

    // Helper functions
    getCurrentPhase: getCurrentPhaseCallback,
    getPhaseProgress: getPhaseProgressCallback,
    getPhaseTheme: getPhaseThemeCallback,
    parseWorkflowStates: parseWorkflowStatesCallback,
    hasWorkflowState: hasWorkflowStateCallback,

    // Section state API (NOVÉ)
    getSectionState,           // NOVÁ: vrací { visible, enabled }
    getAllSectionStates,       // NOVÁ: vrací všechny stavy sekcí

    // Section locking API (DEPRECATED - použij getSectionState)
    getSectionLockState,
    getAllSectionLockStates,
    sectionDefinitions: SECTION_DEFINITIONS,

    // Raw phase definitions (for UI rendering)
    phaseDefinitions: PHASE_DEFINITIONS
  };
};

// ❌ REMOVED: export default - používáme named export

