// Workflow constants for Order Management System 2025
// Centralizované definice stavů a přechodů pro objednávky

export const WORKFLOW_STATES = {
  NOVA: {
    code: 'NOVA',
    name: 'Nová',
    description: 'Objednávka je v přípravě, viditelná pouze pro autora',
    color: '#94a3b8',
    icon: '📝',
    phase: 'draft'
  },
  ODESLANA_KE_SCHVALENI: {
    code: 'ODESLANA_KE_SCHVALENI',
    name: 'Ke schválení',
    description: 'Objednávka byla odeslána a čeká na akci schvalovatele',
    color: '#f59e0b',
    icon: '⏳',
    phase: 'approval'
  },
  SCHVALENA: {
    code: 'SCHVALENA',
    name: 'Schválená',
    description: 'Objednávka byla schválena příslušným manažerem',
    color: '#10b981',
    icon: '✅',
    phase: 'approved'
  },
  ZAMITNUTA: {
    code: 'ZAMITNUTA',
    name: 'Zamítnuta',
    description: 'Objednávka byla schvalovatelem zamítnuta',
    color: '#ef4444',
    icon: '❌',
    phase: 'rejected'
  },
  CEKA_POTVRZENI: {
    code: 'CEKA_POTVRZENI',
    name: 'Čeká na potvrzení',
    description: 'Objednávka byla odeslána, čeká na potvrzení dodavatele',
    color: '#3b82f6',
    icon: '📤',
    phase: 'supplier_pending'
  },
  POTVRZENA: {
    code: 'POTVRZENA',
    name: 'Potvrzená dodavatelem',
    description: 'Dodavatel potvrdil přijetí a akceptaci objednávky',
    color: '#059669',
    icon: '✅',
    phase: 'supplier_confirmed'
  },
  DOKONCENA: {
    code: 'DOKONCENA',
    name: 'Dokončená',
    description: 'Zboží/služba bylo dodáno, proces je uzavřen',
    color: '#6b7280',
    icon: '🏁',
    phase: 'completed'
  },
  ZRUSENA: {
    code: 'ZRUSENA',
    name: 'Zrušena',
    description: 'Objednávka byla stornována před dokončením',
    color: '#9ca3af',
    icon: '🗑️',
    phase: 'cancelled'
  },
  ROZPRACOVANA: {
    code: 'ROZPRACOVANA',
    name: 'Rozpracovaná',
    description: 'Schválená objednávka je v procesu zpracování',
    color: '#8b5cf6',
    icon: '🔧',
    phase: 'in_progress'
  }
};

// Povolené přechody mezi stavy
export const WORKFLOW_TRANSITIONS = {
  NOVA: ['ODESLANA_KE_SCHVALENI', 'ZRUSENA'],
  ODESLANA_KE_SCHVALENI: ['SCHVALENA', 'ZAMITNUTA', 'NOVA'], // vrácení k úpravě
  SCHVALENA: ['CEKA_POTVRZENI', 'DOKONCENA', 'ZRUSENA', 'ROZPRACOVANA'],
  ZAMITNUTA: ['NOVA', 'ZRUSENA'], // možnost opravy
  CEKA_POTVRZENI: ['POTVRZENA', 'ZRUSENA'],
  POTVRZENA: ['DOKONCENA', 'ZRUSENA'],
  ROZPRACOVANA: ['CEKA_POTVRZENI', 'DOKONCENA', 'ZRUSENA'],
  DOKONCENA: [], // finální stav
  ZRUSENA: [] // finální stav
};

// Fáze workflow pro UI logiku
export const WORKFLOW_PHASES = {
  DRAFT: 'draft',           // NOVA
  APPROVAL: 'approval',     // ODESLANA_KE_SCHVALENI
  APPROVED: 'approved',     // SCHVALENA
  REJECTED: 'rejected',     // ZAMITNUTA
  SUPPLIER_PENDING: 'supplier_pending',   // CEKA_POTVRZENI
  SUPPLIER_CONFIRMED: 'supplier_confirmed', // POTVRZENA
  IN_PROGRESS: 'in_progress',  // ROZPRACOVANA
  COMPLETED: 'completed',   // DOKONCENA
  CANCELLED: 'cancelled'    // ZRUSENA
};

// Mapování stavů na fáze
export const getWorkflowPhase = (stateCode) => {
  const state = WORKFLOW_STATES[stateCode];
  return state ? state.phase : 'draft';
};

// Kontrola povolených přechodů
export const canTransitionTo = (fromState, toState) => {
  const allowedTransitions = WORKFLOW_TRANSITIONS[fromState] || [];
  return allowedTransitions.includes(toState);
};

// Validace povinných polí podle stavu workflow
export const getRequiredFields = (workflowCode) => {
  // ✅ Financování je povinné ve všech fázích od začátku
  const baseFields = ['predmet', 'max_cena_s_dph', 'strediska_kod', 'zpusob_financovani'];

  switch (workflowCode) {
    case 'NOVA':
      return baseFields;

    case 'ODESLANA_KE_SCHVALENI':
      return [
        ...baseFields,
        'garant_uzivatel_id',
        'prikazce_id',
        'jmeno',
        'email'
      ];

    case 'SCHVALENA':
      return [
        ...baseFields,
        'garant_uzivatel_id',
        'prikazce_id',
        'jmeno',
        'email',
        'schvalovatel_id',
        'dt_schvaleni',
        // Fáze 3 - Povinná pole pro dodavatele
        'dodavatel_nazev',
        'dodavatel_adresa', // v DB je dodavatel_adresa, ne dodavatel_sidlo
        'dodavatel_ico',
        // dodavatel_dic není povinné
        // dodavatel_zastoupeny není povinné
        // kontaktní adresa není povinná (dodavatel_kontakt_*)
        'druh_objednavky_kod', // v DB je druh_objednavky_kod
        'polozky_objednavky' // min. 1 položka s povinnými poli
      ];

    case 'CEKA_POTVRZENI':
      return [
        ...baseFields,
        'garant_uzivatel_id',
        'prikazce_id',
        'jmeno',
        'email',
        'dodavatel_nazev',
        'dodavatel_kontakt'
      ];

    default:
      return baseFields;
  }
};

// Sekce formuláře viditelné podle stavu workflow
export const getVisibleSections = (workflowCode) => {
  const baseSections = ['objednatel', 'schvaleni'];

  switch (workflowCode) {
    case 'NOVA':
      return baseSections;

    case 'ODESLANA_KE_SCHVALENI':
      return baseSections;

    case 'SCHVALENA':
    case 'CEKA_POTVRZENI':
    case 'POTVRZENA':
    case 'DOKONCENA':
      return [
        ...baseSections,
        'financovani',
        'dodavatel',
        'kontakt',
        'detaily',
        'dodaci_podminky',
        'stav_odeslani'
      ];

    case 'ZAMITNUTA':
      return baseSections;

    case 'ZRUSENA':
      return [...baseSections, 'stav_odeslani'];

    default:
      return baseSections;
  }
};

// Helper funkce pro získání informací o stavu
export const getWorkflowInfo = (stateCode) => {
  return WORKFLOW_STATES[stateCode] || WORKFLOW_STATES.NOVA;
};

// Export všech stavů jako pole pro selecty
export const WORKFLOW_STATES_ARRAY = Object.values(WORKFLOW_STATES);