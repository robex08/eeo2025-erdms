/**
 * Utility funkce pro převod různých formátů příloh na unifikovaný formát
 * používaný novým AttachmentManager
 */

/**
 * Převede starý formát příloh na nový
 * @param {Array} oldAttachments - Pole příloh v starém formátu
 * @returns {Array} Pole příloh v novém formátu
 */
export function convertLegacyAttachments(oldAttachments) {
  if (!Array.isArray(oldAttachments)) return [];

  return oldAttachments.map(att => {
    // Starý formát může mít různé struktury
    return {
      id: att.id,
      guid: att.guid || att.systemovy_nazev || '',
      originalni_nazev: att.originalni_nazev || att.originalName || att.nazev || att.filename || 'unknown',
      systemovy_nazev: att.systemovy_nazev || att.generatedName || att.guid || '',
      velikost: att.velikost || att.velikost_souboru_b || att.size || 0,
      typ_prilohy: att.typ_prilohy || att.type || att.popis || '',
      nahrano_uzivatel: att.nahrano_uzivatel || att.user || null,
      dt_vytvoreni: att.dt_vytvoreni || att.createdAt || att.created_at || null,
      dt_aktualizace: att.dt_aktualizace || att.updatedAt || att.updated_at || null
    };
  });
}

/**
 * Převede nový formát příloh na starý pro zpetnou kompatibilitu
 * @param {Array} newAttachments - Pole příloh v novém formátu
 * @returns {Array} Pole příloh ve starém formátu
 */
export function convertToLegacyAttachments(newAttachments) {
  if (!Array.isArray(newAttachments)) return [];

  return newAttachments.map(att => ({
    id: att.id,
    originalName: att.originalni_nazev,
    generatedName: att.systemovy_nazev,
    guid: att.guid,
    type: att.typ_prilohy,
    size: att.velikost,
    createdBy: att.nahrano_uzivatel?.id || null,
    createdAt: att.dt_vytvoreni,
    url: att.url || null // pro zpětnou kompatibilitu s download linky
  }));
}

/**
 * Normalizuje attachment objekt do standardního formátu
 * @param {Object} attachment - Attachment objekt v jakémkoliv formátu
 * @returns {Object} Normalizovaný attachment objekt
 */
export function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;

  return {
    id: attachment.id || null,
    guid: attachment.guid || attachment.systemovy_nazev || '',
    originalni_nazev: attachment.originalni_nazev || attachment.originalName || attachment.nazev || attachment.filename || 'unknown',
    systemovy_nazev: attachment.systemovy_nazev || attachment.generatedName || attachment.guid || '',
    velikost: attachment.velikost || attachment.velikost_souboru_b || attachment.size || 0,
    typ_prilohy: attachment.typ_prilohy || attachment.type || attachment.popis || '',
    nahrano_uzivatel: attachment.nahrano_uzivatel || attachment.user || {
      id: attachment.createdBy || null,
      jmeno: '',
      prijmeni: '',
      email: '',
      celne_jmeno: ''
    },
    dt_vytvoreni: attachment.dt_vytvoreni || attachment.createdAt || attachment.created_at || null,
    dt_aktualizace: attachment.dt_aktualizace || attachment.updatedAt || attachment.updated_at || null,
    url: attachment.url || null
  };
}

/**
 * Validuje attachment objekt
 * @param {Object} attachment - Attachment objekt k validaci
 * @returns {Object} Výsledek validace {valid: boolean, errors: Array}
 */
export function validateAttachment(attachment) {
  const errors = [];

  if (!attachment) {
    return { valid: false, errors: ['Attachment objekt je prázdný'] };
  }

  if (!attachment.originalni_nazev) {
    errors.push('Chybí původní název souboru');
  }

  if (!attachment.guid && !attachment.systemovy_nazev) {
    errors.push('Chybí GUID nebo systémový název');
  }

  if (!attachment.velikost || attachment.velikost <= 0) {
    errors.push('Neplatná velikost souboru');
  }

  if (!attachment.typ_prilohy) {
    errors.push('Chybí typ přílohy');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Vytvoří prázdný attachment objekt s výchozími hodnotami
 * @param {Object} overrides - Hodnoty k přepsání výchozích
 * @returns {Object} Nový attachment objekt
 */
export function createEmptyAttachment(overrides = {}) {
  return {
    id: null,
    guid: '',
    originalni_nazev: '',
    systemovy_nazev: '',
    velikost: 0,
    typ_prilohy: '',
    nahrano_uzivatel: null,
    dt_vytvoreni: null,
    dt_aktualizace: null,
    url: null,
    ...overrides
  };
}