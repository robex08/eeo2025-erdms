/**
 * Utility funkce pro filtrování objednávek
 * Rozděleno z masivního useMemo v Orders25List.js pro lepší maintainability
 */

import { removeDiacritics } from './textHelpers';
import { formatDateOnly } from './format';

/**
 * Filtr "Jen moje objednávky" - pro všechny uživatele
 */
export const filterMyOrders = (order, showOnlyMyOrders, userDetail, currentUserId) => {
  // 🐛 DEBUG: Log první 3 objednávky
  if (order.id <= 20) {
    console.log(`🔍 filterMyOrders - Order #${order.id}:`, {
      showOnlyMyOrders,
      currentUserId,
      order_ids: {
        objednatel_id: order.objednatel_id,
        uzivatel_id: order.uzivatel_id,
        garant_uzivatel_id: order.garant_uzivatel_id,
        schvalovatel_id: order.schvalovatel_id,
        prikazce_id: order.prikazce_id,
        fakturant_id: order.fakturant_id,
        potvrdil_vecnou_spravnost_id: order.potvrdil_vecnou_spravnost_id,
        dokoncil_id: order.dokoncil_id,
        zverejnil_id: order.zverejnil_id
      }
    });
  }

  // Pokud filtr není aktivní, zobraz všechny objednávky
  if (!showOnlyMyOrders) return true;

  // Filtruj objednávky kde je uživatel v JAKÉKOLIV roli
  // 🔥 KRITICKÉ: Konverze všech ID na number pro spolehlivé porovnání
  const objednatelId = parseInt(order.objednatel_id, 10);
  const uzivatelId = parseInt(order.uzivatel_id, 10);
  const garantId = parseInt(order.garant_uzivatel_id, 10);
  const schvalovatelId = parseInt(order.schvalovatel_id, 10);
  const prikazceId = parseInt(order.prikazce_id, 10);
  const fakturantId = parseInt(order.fakturant_id, 10);
  const potvrdilId = parseInt(order.potvrdil_vecnou_spravnost_id, 10);
  const dokoncilId = parseInt(order.dokoncil_id, 10);
  const zverejnilId = parseInt(order.zverejnil_id, 10);
  
  const isObjednatel = objednatelId === currentUserId || uzivatelId === currentUserId;
  const isGarant = garantId === currentUserId;
  const isSchvalovatel = schvalovatelId === currentUserId;
  const isPrikazce = prikazceId === currentUserId;
  const isFakturant = fakturantId === currentUserId;
  const isPotvrdil = potvrdilId === currentUserId;
  const isDokoncil = dokoncilId === currentUserId;
  const isZverejnil = zverejnilId === currentUserId;

  const result = isObjednatel || isGarant || isSchvalovatel || isPrikazce || 
                 isFakturant || isPotvrdil || isDokoncil || isZverejnil;
  
  // 🐛 DEBUG: Log výsledek pro první objednávky
  if (order.id <= 20) {
    console.log(`🔍 filterMyOrders - Order #${order.id} RESULT:`, {
      result,
      matches: { 
        isObjednatel, isGarant, isSchvalovatel, isPrikazce,
        isFakturant, isPotvrdil, isDokoncil, isZverejnil
      },
      converted_ids: { 
        objednatelId, uzivatelId, garantId, schvalovatelId, prikazceId,
        fakturantId, potvrdilId, dokoncilId, zverejnilId
      }
    });
  }

  return result;
};

/**
 * Filtr podle data objednávky
 * Prohledává:
 * - Datum poslední změny (dt_aktualizace nebo dt_objednavky)
 * - Datum vytvoření (dt_vytvoreni)
 * - Čas vytvoření
 */
export const filterByOrderDate = (order, filterValue, getOrderDate) => {
  if (!filterValue) return true;

  // Získat datum objednávky (použije se jako fallback)
  const orderDate = getOrderDate(order);
  
  // Datum poslední změny (bez času)
  const lastModified = order.dt_aktualizace || order.dt_objednavky || (orderDate ? new Date(orderDate).toISOString() : null);
  const lastModifiedStr = lastModified ? formatDateOnly(new Date(lastModified)) : '';

  // Datum a čas vytvoření
  const created = order.dt_vytvoreni || (orderDate ? new Date(orderDate).toISOString() : null);
  let createdDateStr = '';
  let createdTimeStr = '';
  if (created) {
    const createdDate = new Date(created);
    createdDateStr = formatDateOnly(createdDate);
    createdTimeStr = createdDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }

  // Převést filterValue (yyyy-mm-dd) na dd.mm.yyyy pro porovnání, pokud je to datum z DatePickeru
  let searchText = filterValue;
  if (filterValue.includes('-') && filterValue.length === 10) {
    // Formát yyyy-mm-dd z DatePickeru
    const date = new Date(filterValue);
    if (!isNaN(date.getTime())) {
      searchText = formatDateOnly(date);
    }
  }

  // Spojit všechny tři hodnoty pro prohledávání
  const fullText = `${lastModifiedStr} ${createdDateStr} ${createdTimeStr}`;

  // Case-insensitive a bez diakritiky
  const normalizedText = removeDiacritics(fullText.toLowerCase());
  const normalizedFilter = removeDiacritics(searchText.toLowerCase());

  return normalizedText.includes(normalizedFilter);
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
 * Filtr podle způsobu financování
 * Používá stejnou logiku jako sloupec a podřádek - order.financovani.typ_nazev nebo order.financovani.typ
 */
export const filterByFinancovani = (order, filterValue) => {
  if (!filterValue) return true;

  let financovaniText = '';

  // STEJNÁ LOGIKA JAKO V PODŘÁDKU: order.financovani.typ_nazev nebo order.financovani.typ
  if (order.financovani && typeof order.financovani === 'object') {
    financovaniText = order.financovani.typ_nazev || order.financovani.typ || '';
  }

  // Pokud je prázdný, hledej "---"
  if (!financovaniText) {
    const normalizedFilter = removeDiacritics(filterValue.toLowerCase());
    return normalizedFilter === '---' || normalizedFilter === '';
  }

  // Case-insensitive a bez diakritiky
  const normalizedText = removeDiacritics(financovaniText.toLowerCase());
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
  
  // Pokud je prázdný string, vrať všechno
  if (!trimmed) return true;

  // Pokus se detekovat operátor na začátku
  const operatorMatch = trimmed.match(/^(>|<|=)\s*(.+)$/);

  if (operatorMatch) {
    const operator = operatorMatch[1];
    const numStr = operatorMatch[2].replace(/\s/g, '').replace(/,/g, '.');
    const filterNum = parseFloat(numStr);

    // Pokud není validní číslo po operátoru, vrať všechno
    if (isNaN(filterNum)) return true;

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
 * Filtr podle ceny s DPH (z položek)
 */
export const filterByItemsPrice = (order, filterValue) => {
  if (!filterValue) return true;

  let amount = 0;
  
  // Priorita: položky_celkova_cena_s_dph nebo součet položek
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value) && value > 0) amount = value;
  } else if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    amount = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
  }
  
  return compareNumericValue(amount, filterValue);
};

/**
 * Filtr podle celkové částky faktur
 */
export const filterByInvoicesPrice = (order, filterValue) => {
  if (!filterValue) return true;

  const amount = parseFloat(order.faktury_celkova_castka_s_dph || 0);
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
  
  // Filtr podle ceny s DPH (položky)
  if (!filterByItemsPrice(order, columnFilters.cena_s_dph)) return false;
  
  // Filtr podle celkové částky faktur
  if (!filterByInvoicesPrice(order, columnFilters.faktury_celkova_castka_s_dph)) return false;

  // Filtr podle dodavatele
  if (!filterByDodavatel(order, columnFilters.dodavatel_nazev)) return false;

  // Filtr podle způsobu financování
  if (!filterByFinancovani(order, columnFilters.zpusob_financovani)) return false;

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
