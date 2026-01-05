/**
 * 🔄 DATA TRANSFORM HELPERS
 *
 * Centrální místo pro transformace dat mezi Frontend ↔ Backend
 * Specifikace: DATA-FORMAT-CONTRACT.md
 *
 * @author OrderForm25 Team
 * @date 2025-11-01
 */

/**
 * ✅ STŘEDISKA: Backend → Frontend
 *
 * Normalizuje střediska z BE do FE formátu
 *
 * @param {any} data - Raw data z backendu (může být array, JSON string, objekty)
 * @returns {string[]} - Array kódů středisek UPPERCASE
 *
 * @example
 * // Backend posílá array stringů (IDEÁLNÍ)
 * normalizeStrediskaFromBackend(["KLADNO", "BENESOV"])
 * // → ["KLADNO", "BENESOV"]
 *
 * @example
 * // Backend posílá JSON string (DEPRECATED)
 * normalizeStrediskaFromBackend('["KLADNO","BENESOV"]')
 * // → ["KLADNO", "BENESOV"]
 *
 * @example
 * // Backend posílá objekty (DEPRECATED)
 * normalizeStrediskaFromBackend([{kod_stavu: "KLADNO", nazev_stavu: "Kladno"}])
 * // → ["KLADNO"]
 */
export function normalizeStrediskaFromBackend(data) {
  if (!data) return [];

  // ✅ IDEÁLNÍ: Už je array stringů → vrátit UPPERCASE
  if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
    return data.map(kod => String(kod).toUpperCase().trim()).filter(Boolean);
  }

  // 🔄 FALLBACK 1: JSON string → parsovat
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'string') return item.toUpperCase().trim();
          if (item?.kod_stavu) return String(item.kod_stavu).toUpperCase().trim();
          if (item?.kod) return String(item.kod).toUpperCase().trim();
          return String(item).toUpperCase().trim();
        }).filter(Boolean);
      }
    } catch (e) {
      console.error('❌ [normalizeStrediskaFromBackend] Chyba parsování JSON:', e, 'Data:', data);
      return [];
    }
  }

  // 🔄 FALLBACK 2: Array objektů → extrahovat kódy
  if (Array.isArray(data) && data.some(item => typeof item === 'object' && item !== null)) {
    return data.map(item => {
      if (item?.kod_stavu) return String(item.kod_stavu).toUpperCase().trim();
      if (item?.kod) return String(item.kod).toUpperCase().trim();
      if (typeof item === 'string') return item.toUpperCase().trim();
      return String(item).toUpperCase().trim();
    }).filter(Boolean);
  }

  console.warn('⚠️ [normalizeStrediskaFromBackend] Neznámý formát dat:', typeof data, data);
  return [];
}

/**
 * ✅ STŘEDISKA: Frontend → Backend
 *
 * Normalizuje střediska z FE do BE formátu
 *
 * @param {string[]} codes - Array kódů středisek z formData
 * @returns {string[]} - Array kódů středisek UPPERCASE (BE očekává přesně tento formát)
 *
 * @example
 * normalizeStrediskaForBackend(["kladno", "benesov"])
 * // → ["KLADNO", "BENESOV"]
 */
export function normalizeStrediskaForBackend(codes) {
  if (!Array.isArray(codes)) return [];

  return codes
    .map(kod => String(kod).toUpperCase().trim())
    .filter(Boolean);
}

/**
 * ✅ FINANCOVÁNÍ: Backend → Frontend
 *
 * Normalizuje financování z BE do FE formátu (flat struktura pro formData)
 *
 * @param {any} data - Raw financovani objekt z backendu (může být objekt nebo JSON string)
 * @returns {object} - Flat objekt pro formData
 *
 * @example
 * // Backend posílá objekt (IDEÁLNÍ)
 * normalizeFinancovaniFromBackend({
 *   typ: "LP",
 *   lp_kody: ["LP123", "LP456"]
 * })
 * // → {
 * //   zpusob_financovani: "LP",
 * //   lp_kod: ["LP123", "LP456"],
 * //   cislo_smlouvy: "",
 * //   ...
 * // }
 *
 * @example
 * // Backend posílá JSON string (FALLBACK)
 * normalizeFinancovaniFromBackend('{"typ":"LP","lp_kody":["LP123"]}')
 * // → { zpusob_financovani: "LP", lp_kod: ["LP123"], ... }
 *
 * @example
 * // Backend posílá starý formát (DEPRECATED)
 * normalizeFinancovaniFromBackend({
 *   kod_stavu: "LP",
 *   nazev_stavu: "Limitovaný příslib",
 *   doplnujici_data: { lp_kod: ["LP123"] }
 * })
 * // → { zpusob_financovani: "LP", lp_kod: ["LP123"], ... }
 */
export function normalizeFinancovaniFromBackend(data) {
  if (!data) {
    return {};
  }

  let financing = data;

  // 🔄 FALLBACK: JSON string → parsovat
  if (typeof data === 'string') {
    try {
      financing = JSON.parse(data);
    } catch (e) {
      console.error('❌ [normalizeFinancovaniFromBackend] Chyba parsování JSON:', e, 'Data:', data);
      return {};
    }
  }

  // ✅ FORMÁT Z DB: {typ, lp_kody?, cislo_smlouvy?, individualni_schvaleni?, pojistna_udalost_cislo?}
  const result = {
    zpusob_financovani: financing.typ || financing.kod_stavu || financing.zdroj || ''
  };

  // LP kódy
  if (financing.lp_kody) result.lp_kod = financing.lp_kody;
  else if (financing.lp_kod) result.lp_kod = financing.lp_kod;

  // SMLOUVA pole
  if (financing.cislo_smlouvy) result.cislo_smlouvy = financing.cislo_smlouvy;
  if (financing.smlouva_poznamka) result.smlouva_poznamka = financing.smlouva_poznamka;

  // INDIVIDUÁLNÍ pole
  if (financing.individualni_schvaleni) result.individualni_schvaleni = financing.individualni_schvaleni;
  if (financing.individualni_poznamka) result.individualni_poznamka = financing.individualni_poznamka;

  // POJISTNÁ UDÁLOST pole
  if (financing.pojistna_udalost_cislo) result.pojistna_udalost_cislo = financing.pojistna_udalost_cislo;
  if (financing.pojistna_udalost_poznamka) result.pojistna_udalost_poznamka = financing.pojistna_udalost_poznamka;

  // 🔄 FALLBACK: STARÝ FORMÁT s doplnujici_data (pro zpětnou kompatibilitu)
  if (financing.doplnujici_data) {
    const data = financing.doplnujici_data;
    if (data.lp_kod && !result.lp_kod) result.lp_kod = data.lp_kod;
    if (data.lp_kody && !result.lp_kod) result.lp_kod = data.lp_kody;
    if (data.cislo_smlouvy && !result.cislo_smlouvy) result.cislo_smlouvy = data.cislo_smlouvy;
    if (data.smlouva_poznamka && !result.smlouva_poznamka) result.smlouva_poznamka = data.smlouva_poznamka;
    if (data.individualni_schvaleni && !result.individualni_schvaleni) result.individualni_schvaleni = data.individualni_schvaleni;
    if (data.individualni_poznamka && !result.individualni_poznamka) result.individualni_poznamka = data.individualni_poznamka;
    if (data.pojistna_udalost_cislo && !result.pojistna_udalost_cislo) result.pojistna_udalost_cislo = data.pojistna_udalost_cislo;
    if (data.pojistna_udalost_poznamka && !result.pojistna_udalost_poznamka) result.pojistna_udalost_poznamka = data.pojistna_udalost_poznamka;
  }

  return result;
}

/**
 * ✅ FINANCOVÁNÍ: Frontend → Backend
 *
 * Normalizuje financování z FE do BE formátu (vnořená struktura)
 *
 * @param {object} formData - Frontend form data
 * @param {array} financovaniOptions - Seznam dostupných zdrojů financování (pro dohledání názvu)
 * @returns {object|null} - Objekt pro backend API nebo null pokud není vyplněno
 *
 * @example
 * normalizeFinancovaniForBackend({
 *   zpusob_financovani: "LP",
 *   lp_kod: ["LP123", "LP456"],
 *   cislo_smlouvy: "",
 *   ...
 * }, financovaniOptions)
 * // → {
 * //   typ: "LP",
 * //   nazev: "Limitovaný příslib",
 * //   nazev_stavu: "Limitovaný příslib",
 * //   kod_stavu: "LP",
 * //   lp_kody: ["LP123", "LP456"]
 * // }
 */
export function normalizeFinancovaniForBackend(formData, financovaniOptions = []) {
  if (!formData || !formData.zpusob_financovani) {
    return null;
  }

  // ✅ Najít název v financovaniOptions pro backend validaci
  const selectedOption = financovaniOptions.find(opt => 
    opt.kod === formData.zpusob_financovani ||
    opt.kod_stavu === formData.zpusob_financovani ||
    opt.value === formData.zpusob_financovani
  );

  const result = {
    typ: formData.zpusob_financovani,
    nazev: selectedOption?.nazev || selectedOption?.nazev_stavu || selectedOption?.label || formData.zpusob_financovani,
    nazev_stavu: selectedOption?.nazev_stavu || selectedOption?.nazev || selectedOption?.label || formData.zpusob_financovani
  };

  // 🔥 KRITICKÉ: Posílat POUZE pole odpovídající vybranému typu!
  const typ = formData.zpusob_financovani;
  
  // LP: posílat POUZE lp_kody
  if (typ === 'LP') {
    if (formData.lp_kod && Array.isArray(formData.lp_kod) && formData.lp_kod.length > 0) {
      // Backend očekává array čísel: [3, 5], NE ["3", "5"]
      result.lp_kody = formData.lp_kod.map(id => parseInt(id, 10));
    }
  }
  // SMLOUVA: posílat POUZE cislo_smlouvy a smlouva_poznamka
  else if (typ === 'SMLOUVA') {
    if (formData.cislo_smlouvy) {
      result.cislo_smlouvy = formData.cislo_smlouvy;
    }
    if (formData.smlouva_poznamka) {
      result.smlouva_poznamka = formData.smlouva_poznamka;
    }
  }
  // INDIVIDUALNI_SCHVALENI: posílat POUZE individualni_schvaleni a poznamka
  else if (typ === 'INDIVIDUALNI_SCHVALENI' || typ === 'INDIVIDUÁLNÍ' || typ === 'INDIVIDUALNI') {
    if (formData.individualni_schvaleni) {
      result.individualni_schvaleni = formData.individualni_schvaleni;
    }
    if (formData.individualni_poznamka) {
      result.individualni_poznamka = formData.individualni_poznamka;
    }
  }
  // POJISTNA_UDALOST: posílat POUZE pojistna_udalost_cislo a poznamka
  else if (typ === 'POJISTNA_UDALOST' || typ === 'POJISTNÁ UDÁLOST' || typ === 'POJISTNA UDALOST') {
    if (formData.pojistna_udalost_cislo) {
      result.pojistna_udalost_cislo = formData.pojistna_udalost_cislo;
    }
    if (formData.pojistna_udalost_poznamka) {
      result.pojistna_udalost_poznamka = formData.pojistna_udalost_poznamka;
    }
  }

  return result;
}

/**
 * ✅ FAKTURY STŘEDISKA: Backend → Frontend
 *
 * Alias pro normalizeStrediskaFromBackend (stejná logika pro fa_strediska_kod)
 *
 * @param {any} data - Raw fa_strediska_kod z backendu
 * @returns {string[]} - Array kódů středisek UPPERCASE
 */
export function normalizeFakturaStrediskaFromBackend(data) {
  return normalizeStrediskaFromBackend(data);
}

/**
 * ✅ FAKTURY STŘEDISKA: Frontend → Backend
 *
 * Alias pro normalizeStrediskaForBackend (stejná logika pro fa_strediska_kod)
 *
 * @param {string[]} codes - Array kódů středisek
 * @returns {string[]} - Array kódů středisek UPPERCASE
 */
export function normalizeFakturaStrediskaForBackend(codes) {
  return normalizeStrediskaForBackend(codes);
}

/**
 * 🧪 TEST HELPER: Validuje, zda data odpovídají očekávanému formátu
 *
 * @param {any} data - Data k validaci
 * @param {string} type - Typ dat ('strediska' | 'financovani')
 * @returns {boolean} - True pokud data odpovídají formátu
 */
export function validateDataFormat(data, type) {
  switch (type) {
    case 'strediska':
      return Array.isArray(data) && data.every(item => typeof item === 'string');

    case 'financovani':
      return (
        data &&
        typeof data === 'object' &&
        typeof data.typ === 'string' &&
        !data.kod_stavu && // Starý formát
        !data.nazev_stavu && // Starý formát
        !data.doplnujici_data // Starý formát
      );

    default:
      return false;
  }
}

/**
 * 📊 DEBUG HELPER: Loguje formát dat pro debugging
 *
 * @param {any} data - Data k analýze
 * @param {string} label - Label pro log
 */
export function debugDataFormat(data, label = 'Data') {
  // Debug helper disabled for production
  return {
    type: typeof data,
    isArray: Array.isArray(data),
    isString: typeof data === 'string',
    isObject: typeof data === 'object' && !Array.isArray(data),
    value: data,
    keys: typeof data === 'object' ? Object.keys(data) : undefined
  };
}
