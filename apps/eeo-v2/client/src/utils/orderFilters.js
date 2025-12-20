/**
 * Utility funkce pro filtrování objednávek
 * Rozděleno z masivního useMemo v Orders25List.js pro lepší maintainability
 */

import { removeDiacritics } from './textHelpers';
import { formatDateOnly } from './format';

/**
 * Filtr "Jen moje objednávky" - pouze pro SUPERADMIN a ADMINISTRATOR
 */
export const filterMyOrders = (order, showOnlyMyOrders, userDetail, currentUserId) => {
  if (!showOnlyMyOrders || !userDetail?.roles) return true;

  const isSuperAdminOrAdmin = userDetail.roles.some(
    role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );

  if (!isSuperAdminOrAdmin) return true;

  // Filtruj objednávky kde je uživatel jako Objednatel, Garant, Schvalovatel nebo Příkazce
  const isObjednatel = order.objednatel_id === currentUserId || order.uzivatel_id === currentUserId;
  const isGarant = order.garant_uzivatel_id === currentUserId;
  const isSchvalovatel = order.schvalovatel_id === currentUserId;
  const isPrikazce = order.prikazce_id === currentUserId;

  return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
};

/**
 * Filtr podle data objednávky
 */
export const filterByOrderDate = (order, filterValue, getOrderDate) => {
  if (!filterValue) return true;

  const orderDateValue = getOrderDate(order);
  if (!orderDateValue) return false;

  const dateStr = formatDateOnly(new Date(orderDateValue));
  return dateStr.toLowerCase().includes(filterValue.toLowerCase());
};

/**
 * Filtr podle čísla objednávky
 * Hledá ZÁROVEŇ v čísle objednávky i v předmětu (dva řádky ve sloupci "Evidenční číslo")
 */
export const filterByOrderNumber = (order, filterValue) => {
  if (!filterValue) return true;

  const cislo = removeDiacritics(order.cislo_objednavky || '');
  const predmet = removeDiacritics(order.predmet || '');
  const normalizedFilter = removeDiacritics(filterValue);

  // Filtruj podle čísla NEBO předmětu (OR podmínka)
  return cislo.includes(normalizedFilter) || predmet.includes(normalizedFilter);
};

/**
 * Filtr podle předmětu objednávky
 */
export const filterBySubject = (order, filterValue) => {
  if (!filterValue) return true;

  const predmet = removeDiacritics(order.predmet || '');
  return predmet.includes(removeDiacritics(filterValue));
};

/**
 * Filtr podle objednatele
 * Podporuje:
 * - Textové vyhledávání (z hlavičky tabulky) - filtruje podle jména
 * - Multiselect (z rozšířeného filtru) - filtruje podle ID oddělených |
 */
export const filterByObjednatel = (order, filterValue, getUserDisplayName) => {
  if (!filterValue) return true;

  const enriched = order._enriched || {};

  // Detekuj typ filtru: pokud obsahuje pouze číslice oddělené |, je to filtr podle ID
  const isIdFilter = /^[\d|]+$/.test(filterValue);

  if (isIdFilter) {
    // === FILTR PODLE ID (multiselect) ===
    let objednatelId = null;

    // Získej ID objednatele
    if (enriched?.uzivatel?.id) {
      objednatelId = String(enriched.uzivatel.id);
    } else if (order.objednatel_uzivatel?.id) {
      objednatelId = String(order.objednatel_uzivatel.id);
    } else if (order.objednatel?.id) {
      objednatelId = String(order.objednatel.id);
    } else if (order.uzivatel_id) {
      objednatelId = String(order.uzivatel_id);
    } else if (order.objednatel_id) {
      objednatelId = String(order.objednatel_id);
    }

    // Pokud nemá ID, nezobrazuj (když je aktivní ID filtr)
    if (!objednatelId) return false;

    // Multiselect: filterValue obsahuje ID oddělená '|'
    const selectedIds = filterValue.split('|').map(id => id.trim());
    return selectedIds.includes(objednatelId);
  } else {
    // === TEXTOVÝ FILTR (hlavička tabulky) ===
    let name = '';

    // 1. Priorita: Order V2 API enriched data s tituly (objednatel_uzivatel)
    if (order.objednatel_uzivatel) {
      if (order.objednatel_uzivatel.cele_jmeno) {
        name = order.objednatel_uzivatel.cele_jmeno;
      } else {
        name = getUserDisplayName(null, order.objednatel_uzivatel);
      }
    }
    // 2. Pak zkus objekt objednatel přímo z BE dat
    else if (order.objednatel) {
      const obj = order.objednatel;
      if (obj.cele_jmeno) {
        name = obj.cele_jmeno;
      } else if (obj.jmeno && obj.prijmeni) {
        const titul_pred_str = obj.titul_pred ? obj.titul_pred + ' ' : '';
        const titul_za_str = obj.titul_za ? ', ' + obj.titul_za : '';
        name = `${titul_pred_str}${obj.jmeno} ${obj.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      } else if (obj.username) {
        name = obj.username;
      }
    }
    // 3. Fallback na lokální users mapping podle ID
    else if (order.objednatel_id) {
      name = getUserDisplayName(order.objednatel_id);
    }

    // Textové vyhledávání bez diakritiky
    const normalizedText = removeDiacritics(name.toLowerCase());
    const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

    return normalizedText.includes(normalizedFilter);
  }
};

/**
 * Filtr podle stavu objednávky
 */
export const filterByStatus = (order, filterValue, getOrderDisplayStatus) => {
  if (!filterValue) return true;

  const displayStatus = removeDiacritics(getOrderDisplayStatus(order));
  return displayStatus.includes(removeDiacritics(filterValue));
};

/**
 * Filtr podle dodavatele
 * Vyhledává v názvu, IČO, adrese, emailu, telefonu a kontaktní osobě
 */
export const filterByDodavatel = (order, filterValue) => {
  if (!filterValue) return true;

  // Sestavení prohledávatelného textu ze všech polí dodavatele
  const searchableText = [
    order.dodavatel_nazev || '',
    order.dodavatel_ico || '',
    order.dodavatel_ulice || '',
    order.dodavatel_mesto || '',
    order.dodavatel_psc || '',
    order.dodavatel_kontakt_email || '',
    order.dodavatel_kontakt_telefon || '',
    order.dodavatel_kontakt_jmeno || ''
  ].join(' ').toLowerCase();

  const normalizedText = removeDiacritics(searchableText);
  const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

  return normalizedText.includes(normalizedFilter);
};

/**
 * Pomocná funkce pro porovnání numerické hodnoty s filtrem
 * Podporuje operátory: >10000, <5000, =1234 nebo textové vyhledávání
 * @param {number} value - Hodnota k porovnání
 * @param {string} filterValue - Filtr (např. ">10000", "<5000", "=1234", nebo jen "1000")
 * @returns {boolean}
 */
const compareNumericValue = (value, filterValue) => {
  if (!filterValue) return true;

  const trimmed = filterValue.trim();

  // Pokus se detekovat operátor na začátku
  const operatorMatch = trimmed.match(/^(>|<|=)\s*(.+)$/);

  if (operatorMatch) {
    const operator = operatorMatch[1];
    const numStr = operatorMatch[2].replace(/\s/g, '').replace(/,/g, '.');
    const filterNum = parseFloat(numStr);

    if (isNaN(filterNum)) return false;

    switch (operator) {
      case '>':
        return value > filterNum;
      case '<':
        return value < filterNum;
      case '=':
        return Math.abs(value - filterNum) < 0.01; // Tolerance pro desetinná čísla
      default:
        return false;
    }
  }

  // Bez operátoru - textové vyhledávání v naformátované hodnotě
  const amountStr = value > 0 ? value.toLocaleString('cs-CZ') : '';
  return amountStr.includes(filterValue);
};

/**
 * Filtr podle maximální ceny s DPH
 * Podporuje operátory: >10000, <5000, =1234 nebo textové vyhledávání
 */
export const filterByMaxPrice = (order, filterValue) => {
  if (!filterValue) return true;

  const amount = parseFloat(order.max_cena_s_dph || 0);
  return compareNumericValue(amount, filterValue);
};

/**
 * Pomocná funkce pro získání ID uživatele z různých zdrojů
 */
const getUserId = (order, role) => {
  const enriched = order._enriched;

  switch (role) {
    case 'garant':
      if (enriched?.garant_uzivatel?.id) return String(enriched.garant_uzivatel.id);
      if (order.garant?.id) return String(order.garant.id);
      if (order.garant_uzivatel_id) return String(order.garant_uzivatel_id);
      return null;

    case 'prikazce':
      if (enriched?.prikazce_uzivatel?.id) return String(enriched.prikazce_uzivatel.id);
      if (order.prikazce?.id) return String(order.prikazce.id);
      if (order.prikazce_id) return String(order.prikazce_id);
      return null;

    case 'schvalovatel':
      if (enriched?.schvalovatel_uzivatel?.id) return String(enriched.schvalovatel_uzivatel.id);
      if (order.schvalovatel?.id) return String(order.schvalovatel.id);
      if (order.schvalovatel_id) return String(order.schvalovatel_id);
      return null;

    default:
      return null;
  }
};

/**
 * Pomocná funkce pro získání jména uživatele z objednávky
 */
const getUserName = (order, role, getUserDisplayName) => {
  const enriched = order._enriched || {};

  switch (role) {
    case 'garant':
      if (order.garant?.jmeno && order.garant?.prijmeni) {
        const gar = order.garant;
        const titul_pred_str = gar.titul_pred ? gar.titul_pred + ' ' : '';
        const titul_za_str = gar.titul_za ? ', ' + gar.titul_za : '';
        return `${titul_pred_str}${gar.jmeno} ${gar.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      }
      if (enriched?.garant_uzivatel) return getUserDisplayName(null, enriched.garant_uzivatel);
      if (order.garant_uzivatel_id) return getUserDisplayName(order.garant_uzivatel_id);
      return '';

    case 'prikazce':
      if (order.prikazce?.jmeno && order.prikazce?.prijmeni) {
        const pri = order.prikazce;
        const titul_pred_str = pri.titul_pred ? pri.titul_pred + ' ' : '';
        const titul_za_str = pri.titul_za ? ', ' + pri.titul_za : '';
        return `${titul_pred_str}${pri.jmeno} ${pri.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      }
      if (enriched?.prikazce_uzivatel) return getUserDisplayName(null, enriched.prikazce_uzivatel);
      if (order.prikazce_id) return getUserDisplayName(order.prikazce_id);
      return '';

    case 'schvalovatel':
      if (order.schvalovatel?.jmeno && order.schvalovatel?.prijmeni) {
        const sch = order.schvalovatel;
        const titul_pred_str = sch.titul_pred ? sch.titul_pred + ' ' : '';
        const titul_za_str = sch.titul_za ? ', ' + sch.titul_za : '';
        return `${titul_pred_str}${sch.jmeno} ${sch.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
      }
      if (enriched?.schvalovatel) return getUserDisplayName(null, enriched.schvalovatel);
      if (order.schvalovatel_id) return getUserDisplayName(order.schvalovatel_id);
      return '';

    default:
      return '';
  }
};

/**
 * Obecná funkce pro filtrování podle role (garant, příkazce, schvalovatel)
 * Podporuje:
 * - Textové vyhledávání (z hlavičky tabulky) - filtruje podle jména
 * - Multiselect (z rozšířeného filtru) - filtruje podle ID oddělených |
 */
export const filterByUserRole = (order, filterValue, role, getUserDisplayName) => {
  if (!filterValue) return true;

  const trimmedValue = filterValue.trim();

  // Detekuj typ filtru: pokud obsahuje pouze číslice oddělené |, je to filtr podle ID
  const isIdFilter = /^[\d|]+$/.test(trimmedValue);

  if (isIdFilter) {
    // === FILTR PODLE ID (multiselect) ===
    const userId = getUserId(order, role);
    if (!userId) return false; // Pokud nemá ID, nezobrazuj (když je aktivní ID filtr)

    const selectedIds = trimmedValue.split('|').map(id => id.trim());
    return selectedIds.includes(userId);
  } else {
    // === TEXTOVÝ FILTR (hlavička tabulky) ===
    const userName = getUserName(order, role, getUserDisplayName);
    return removeDiacritics(userName.toLowerCase()).includes(removeDiacritics(trimmedValue.toLowerCase()));
  }
};

/**
 * Aplikuje všechny sloupcové filtry na objednávku
 */
export const applyColumnFilters = (order, columnFilters, getOrderDate, getOrderDisplayStatus, getUserDisplayName) => {
  // Filtr podle data
  if (!filterByOrderDate(order, columnFilters.dt_objednavky, getOrderDate)) return false;

  // Filtr podle čísla objednávky
  if (!filterByOrderNumber(order, columnFilters.cislo_objednavky)) return false;

  // Filtr podle předmětu
  if (!filterBySubject(order, columnFilters.predmet)) return false;

  // Filtr podle objednatele
  if (!filterByObjednatel(order, columnFilters.objednatel, getUserDisplayName)) return false;

  // Filtr podle stavu
  if (!filterByStatus(order, columnFilters.stav_objednavky, getOrderDisplayStatus)) return false;

  // Filtr podle ceny
  if (!filterByMaxPrice(order, columnFilters.max_cena_s_dph)) return false;

  // Filtr podle dodavatele
  if (!filterByDodavatel(order, columnFilters.dodavatel_nazev)) return false;

  // 🔧 FIX: Sloučené sloupce - hledačky používají objednatel_garant a prikazce_schvalovatel
  // Pro objednatel_garant hledej v objednateli i garantovi
  if (columnFilters.objednatel_garant) {
    const filterValue = columnFilters.objednatel_garant;
    const objednatelMatch = filterByObjednatel(order, filterValue, getUserDisplayName);
    const garantMatch = filterByUserRole(order, filterValue, 'garant', getUserDisplayName);
    if (!objednatelMatch && !garantMatch) return false;
  }

  // Pro prikazce_schvalovatel hledej v příkazci i schvalovateli
  if (columnFilters.prikazce_schvalovatel) {
    const filterValue = columnFilters.prikazce_schvalovatel;
    const prikazceMatch = filterByUserRole(order, filterValue, 'prikazce', getUserDisplayName);
    const schvalovatelMatch = filterByUserRole(order, filterValue, 'schvalovatel', getUserDisplayName);
    if (!prikazceMatch && !schvalovatelMatch) return false;
  }

  // Filtry podle rolí (separátní klíče pro rozšířený filtr)
  if (!filterByUserRole(order, columnFilters.garant, 'garant', getUserDisplayName)) return false;
  if (!filterByUserRole(order, columnFilters.prikazce, 'prikazce', getUserDisplayName)) return false;
  if (!filterByUserRole(order, columnFilters.schvalovatel, 'schvalovatel', getUserDisplayName)) return false;

  return true;
};
