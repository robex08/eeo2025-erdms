/**
 * Validace DOCX mappingu proti enriched API struktuře
 * @date 2025-11-16
 */

/**
 * Definice dostupných polí z enriched endpointu
 * podle specifikace: docs/DOCX-ENRICHED-ENDPOINT-SPEC.md
 */
const ENRICHED_API_STRUCTURE = {
  // Základní pole objednávky (top level)
  topLevel: [
    'id',
    'cislo_objednavky',
    'dt_objednavky',
    'predmet',
    'max_cena_s_dph',
    'poznamka',
    'strediska_kod',
    'druh_objednavky_kod',
    'stav_workflow_kod',
    'dt_predpokladany_termin_dodani',
    'misto_dodani',
    'zaruka',
    'polozky_count',
    'prilohy_count',
    // Datumová pole workflow
    'dt_vytvoreni',
    'dt_aktualizace',
    'dt_schvaleni',
    'dt_schvaleni_zamitnutim',
    'dt_uzavreni',
    'dt_zruseni',
    'dt_archivace',
    'dt_odeslani',
    'dt_akceptace',
    'dt_zverejneni',
    // Další workflow pole
    'schvaleni_komentar',
    'financovani',
    'stav_objednavky',
    'dodavatel_zpusob_potvrzeni',
    'registr_iddt'
  ],

  // Dodavatel pole (top level)
  dodavatel: [
    'dodavatel_id',
    'dodavatel_nazev',
    'dodavatel_adresa',
    'dodavatel_ico',
    'dodavatel_dic',
    'dodavatel_zastoupeny',
    'dodavatel_kontakt_jmeno',
    'dodavatel_kontakt_email',
    'dodavatel_kontakt_telefon'
  ],

  // Enriched uživatelé - struktura pro každého
  enrichedUserFields: [
    'id',
    'cele_jmeno',
    'jmeno',
    'prijmeni',
    'titul_pred',
    'titul_za',
    'email',
    'telefon',
    'username',
    'lokalita.id',
    'lokalita.nazev',
    'lokalita.kod'
  ],

  // Enriched uživatelé - prefixes
  enrichedUserPrefixes: [
    'garant_uzivatel',
    'garant',
    'prikazce_uzivatel',
    'prikazce',
    'schvalovatel',
    'uzivatel', // objednatel
    'objednatel',
    'odesilatel',
    'fakturant',
    'dodavatel_potvrdil',
    'potvrdil_vecnou_spravnost',
    'dokoncil'
  ],

  // Vypočítané hodnoty
  vypocitane: [
    // Ceny
    'celkova_cena_bez_dph',
    'celkova_cena_s_dph',
    'vypoctene_dph',
    'celkova_cena_bez_dph_kc',
    'celkova_cena_s_dph_kc',
    'vypoctene_dph_kc',
    
    // Statistiky
    'pocet_polozek',
    'pocet_priloh',
    
    // Datum a čas
    'datum_generovani',
    'cas_generovani',
    'datum_cas_generovani',
    
    // Vybraný uživatel
    'vybrany_uzivatel_cele_jmeno',
    'vybrany_uzivatel_role',
    'vybrany_uzivatel_lokalita',
    
    // Kombinace jmen pro všechny uživatele
    // GARANT
    'garant_jmeno_prijmeni',
    'garant_prijmeni_jmeno',
    'garant_cele_jmeno_s_tituly',
    'garant_cele_jmeno',
    'garant_jmeno',
    'garant_prijmeni',
    'garant_email',
    'garant_telefon',
    
    // PŘÍKAZCE
    'prikazce_jmeno_prijmeni',
    'prikazce_prijmeni_jmeno',
    'prikazce_cele_jmeno_s_tituly',
    'prikazce_cele_jmeno',
    'prikazce_jmeno',
    'prikazce_prijmeni',
    'prikazce_email',
    'prikazce_telefon',
    
    // SCHVALOVATEL
    'schvalovatel_jmeno_prijmeni',
    'schvalovatel_prijmeni_jmeno',
    'schvalovatel_cele_jmeno_s_tituly',
    'schvalovatel_cele_jmeno',
    'schvalovatel_jmeno',
    'schvalovatel_prijmeni',
    'schvalovatel_email',
    'schvalovatel_telefon',
    
    // OBJEDNATEL (uzivatel)
    'objednatel_jmeno_prijmeni',
    'objednatel_prijmeni_jmeno',
    'objednatel_cele_jmeno_s_tituly',
    'objednatel_cele_jmeno',
    'objednatel_jmeno',
    'objednatel_prijmeni',
    'objednatel_email',
    'objednatel_telefon',
    
    // ODESÍLATEL
    'odesilatel_jmeno_prijmeni',
    'odesilatel_prijmeni_jmeno',
    'odesilatel_cele_jmeno_s_tituly',
    'odesilatel_cele_jmeno',
    'odesilatel_jmeno',
    'odesilatel_prijmeni',
    'odesilatel_email',
    'odesilatel_telefon',
    
    // FAKTURANT
    'fakturant_jmeno_prijmeni',
    'fakturant_prijmeni_jmeno',
    'fakturant_cele_jmeno_s_tituly',
    'fakturant_cele_jmeno',
    'fakturant_jmeno',
    'fakturant_prijmeni',
    'fakturant_email',
    'fakturant_telefon'
  ]
};

/**
 * Mapa starých (deprecated) polí na nová
 */
const DEPRECATED_FIELDS_MAP = {
  // Ceny - přesun do vypocitane objektu
  'celkova_cena_bez_dph': {
    newPath: 'vypocitane.celkova_cena_bez_dph',
    reason: 'Ceny jsou nyní v objektu vypocitane'
  },
  'celkova_cena_s_dph': {
    newPath: 'vypocitane.celkova_cena_s_dph',
    reason: 'Ceny jsou nyní v objektu vypocitane'
  },
  'vypoctene_dph': {
    newPath: 'vypocitane.vypoctene_dph',
    reason: 'DPH je nyní v objektu vypocitane'
  },
  
  // Objednatel -> uzivatel
  'objednatel.plne_jmeno': {
    newPath: 'uzivatel.cele_jmeno',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.cele_jmeno': {
    newPath: 'uzivatel.cele_jmeno',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.jmeno': {
    newPath: 'uzivatel.jmeno',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.prijmeni': {
    newPath: 'uzivatel.prijmeni',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.email': {
    newPath: 'uzivatel.email',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.telefon': {
    newPath: 'uzivatel.telefon',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.lokalita.nazev': {
    newPath: 'uzivatel.lokalita.nazev',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  'objednatel.lokalita.kod': {
    newPath: 'uzivatel.lokalita.kod',
    reason: 'Enriched endpoint používá uzivatel místo objednatel'
  },
  
  // Datum
  'aktualni_datum': {
    newPath: 'vypocitane.datum_generovani',
    reason: 'Datum je nyní v objektu vypocitane'
  }
};

/**
 * Zkontroluje, zda cesta existuje v enriched API struktuře
 */
function isValidPath(path) {
  // Top level pole
  if (ENRICHED_API_STRUCTURE.topLevel.includes(path)) {
    return true;
  }
  
  // Dodavatel pole
  if (ENRICHED_API_STRUCTURE.dodavatel.includes(path)) {
    return true;
  }
  
  // Vypočítané hodnoty
  if (path.startsWith('vypocitane.')) {
    const fieldName = path.substring('vypocitane.'.length);
    return ENRICHED_API_STRUCTURE.vypocitane.includes(fieldName);
  }
  
  // Enriched uživatelé
  for (const prefix of ENRICHED_API_STRUCTURE.enrichedUserPrefixes) {
    if (path.startsWith(prefix + '.')) {
      const fieldName = path.substring(prefix.length + 1);
      return ENRICHED_API_STRUCTURE.enrichedUserFields.includes(fieldName);
    }
  }
  
  // Vnořené objekty
  // Financování
  if (path.startsWith('financovani.')) {
    return ['typ', 'nazev', 'nazev_stavu', 'kod', 'kod_stavu'].includes(path.substring('financovani.'.length));
  }
  
  // Střediska (může být array)
  if (path.startsWith('strediska_kod.') || path === 'strediska_kod') {
    return true;
  }
  
  // Pole v arrays (polozky, prilohy, faktury) - nevalidujeme detailně
  if (path.startsWith('polozky.') || path.startsWith('prilohy.') || path.startsWith('faktury.')) {
    return true;
  }
  
  return false;
}

/**
 * Validuje celý mapping objekt
 * @param {object} mapping - JSON mapping ze šablony
 * @returns {object} - { valid: boolean, errors: array, warnings: array }
 */
export function validateDocxMapping(mapping) {
  const errors = [];
  const warnings = [];
  
  if (!mapping || typeof mapping !== 'object') {
    return {
      valid: false,
      errors: [{ message: 'Mapping není platný objekt' }],
      warnings: []
    };
  }
  
  // Projdi všechna pole v mappingu
  Object.entries(mapping).forEach(([docxField, apiPath]) => {
    // Přeskoč prázdné hodnoty
    if (!apiPath) {
      warnings.push({
        docxField,
        apiPath,
        type: 'empty',
        message: `Pole ${docxField} není namapováno`,
        severity: 'warning'
      });
      return;
    }
    
    // Kontrola deprecated polí
    if (DEPRECATED_FIELDS_MAP[apiPath]) {
      const deprecated = DEPRECATED_FIELDS_MAP[apiPath];
      errors.push({
        docxField,
        apiPath,
        type: 'deprecated',
        message: `Pole ${apiPath} je zastaralé`,
        suggestion: deprecated.newPath,
        reason: deprecated.reason,
        severity: 'error'
      });
      return;
    }
    
    // Kontrola validity cesty
    if (!isValidPath(apiPath)) {
      errors.push({
        docxField,
        apiPath,
        type: 'invalid',
        message: `Pole ${apiPath} neexistuje v enriched API`,
        severity: 'error'
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalFields: Object.keys(mapping).length,
    validFields: Object.keys(mapping).length - errors.length - warnings.filter(w => w.type === 'empty').length
  };
}

/**
 * Vygeneruje doporučený mapping (automatická oprava)
 * @param {object} mapping - Starý mapping
 * @returns {object} - Opravený mapping
 */
export function autoFixMapping(mapping) {
  const fixed = { ...mapping };
  
  Object.entries(mapping).forEach(([docxField, apiPath]) => {
    // Oprav deprecated pole
    if (DEPRECATED_FIELDS_MAP[apiPath]) {
      fixed[docxField] = DEPRECATED_FIELDS_MAP[apiPath].newPath;
    }
  });
  
  return fixed;
}

/**
 * Vrátí seznam všech dostupných polí pro autocomplete
 * @returns {array} - Array všech validních cest
 */
export function getAllAvailableFields() {
  const fields = [];
  
  // Top level
  fields.push(...ENRICHED_API_STRUCTURE.topLevel);
  
  // Dodavatel
  fields.push(...ENRICHED_API_STRUCTURE.dodavatel);
  
  // Vypočítané
  ENRICHED_API_STRUCTURE.vypocitane.forEach(field => {
    fields.push(`vypocitane.${field}`);
  });
  
  // Enriched uživatelé
  ENRICHED_API_STRUCTURE.enrichedUserPrefixes.forEach(prefix => {
    ENRICHED_API_STRUCTURE.enrichedUserFields.forEach(field => {
      fields.push(`${prefix}.${field}`);
    });
  });
  
  return fields.sort();
}
