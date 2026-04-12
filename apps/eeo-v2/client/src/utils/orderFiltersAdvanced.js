/**
 * Komplexní filtry pro objednávky - globální vyhledávání, status, datum, částky
 * Část 2/2 utility souborů pro filtrování
 */

import { removeDiacritics } from './textHelpers';

/**
 * Pomocné funkce pro získání jmen z objednávky pro globální vyhledávání
 */
export const getGarantNameForSearch = (order, getUserDisplayName) => {
  const enriched = order._enriched || {};

  if (enriched.garant_uzivatel) {
    return getUserDisplayName(null, enriched.garant_uzivatel);
  }

  if (order.garant) {
    if (order.garant.jmeno && order.garant.prijmeni) {
      const titul_pred_str = order.garant.titul_pred ? order.garant.titul_pred + ' ' : '';
      const titul_za_str = order.garant.titul_za ? ', ' + order.garant.titul_za : '';
      return `${titul_pred_str}${order.garant.jmeno} ${order.garant.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
    } else {
      return order.garant.username || '';
    }
  }

  if (order.garant_uzivatel_id) {
    return getUserDisplayName(order.garant_uzivatel_id);
  }

  return '';
};

export const getPrikazceNameForSearch = (order, getUserDisplayName) => {
  const enriched = order._enriched || {};

  if (enriched.prikazce_uzivatel) {
    return getUserDisplayName(null, enriched.prikazce_uzivatel);
  }

  if (order.prikazce) {
    if (order.prikazce.jmeno && order.prikazce.prijmeni) {
      const titul_pred_str = order.prikazce.titul_pred ? order.prikazce.titul_pred + ' ' : '';
      const titul_za_str = order.prikazce.titul_za ? ', ' + order.prikazce.titul_za : '';
      return `${titul_pred_str}${order.prikazce.jmeno} ${order.prikazce.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
    } else if (order.prikazce.cele_jmeno) {
      return order.prikazce.cele_jmeno;
    } else {
      return order.prikazce.username || '';
    }
  }

  if (order.prikazce_id) {
    return getUserDisplayName(order.prikazce_id);
  }

  return '';
};

export const getSchvalovatelNameForSearch = (order, getUserDisplayName) => {
  const enriched = order._enriched || {};

  if (enriched.schvalovatel_uzivatel) {
    return getUserDisplayName(null, enriched.schvalovatel_uzivatel);
  }

  if (order.schvalovatel) {
    if (order.schvalovatel.jmeno && order.schvalovatel.prijmeni) {
      const titul_pred_str = order.schvalovatel.titul_pred ? order.schvalovatel.titul_pred + ' ' : '';
      const titul_za_str = order.schvalovatel.titul_za ? ', ' + order.schvalovatel.titul_za : '';
      return `${titul_pred_str}${order.schvalovatel.jmeno} ${order.schvalovatel.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
    } else if (order.schvalovatel.cele_jmeno) {
      return order.schvalovatel.cele_jmeno;
    } else {
      return order.schvalovatel.username || '';
    }
  }

  if (order.schvalovatel_id) {
    return getUserDisplayName(order.schvalovatel_id);
  }

  return '';
};

/**
 * Globální vyhledávání napříč všemi poli objednávky
 */
export const filterByGlobalSearch = (order, searchText, getUserDisplayName, getOrderDisplayStatus) => {
  if (!searchText) return true;

  const enriched = order._enriched || {};

  // Parse druh_objednavky nazev
  const getDruhObjednavkyNazev = () => {
    if (enriched.druh_objednavky?.nazev) {
      try {
        if (typeof enriched.druh_objednavky.nazev === 'string' && enriched.druh_objednavky.nazev.startsWith('{')) {
          const parsed = JSON.parse(enriched.druh_objednavky.nazev);
          return parsed.nazev_stavu || parsed.nazev || enriched.druh_objednavky.nazev;
        }
        return enriched.druh_objednavky.nazev;
      } catch (e) {
        return enriched.druh_objednavky.nazev;
      }
    }
    if (enriched.druh_objednavky?.nazev_stavu) return enriched.druh_objednavky.nazev_stavu;
    if (order.druh_objednavky_kod) {
      try {
        if (typeof order.druh_objednavky_kod === 'string' && order.druh_objednavky_kod.startsWith('{')) {
          const parsed = JSON.parse(order.druh_objednavky_kod);
          return parsed.nazev_stavu || parsed.nazev || '';
        }
        if (typeof order.druh_objednavky_kod === 'object' && order.druh_objednavky_kod.nazev_stavu) {
          return order.druh_objednavky_kod.nazev_stavu;
        }
        return order.druh_objednavky_kod;
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  const searchableText = removeDiacritics([
    // Základní informace o objednávce
    order.cislo_objednavky,
    order.predmet,
    order.dodavatel_nazev,
    order.dodavatel_ico,
    order.dodavatel_adresa,
    order.dodavatel_kontakt_jmeno,
    order.dodavatel_kontakt_email,
    order.dodavatel_kontakt_telefon,
    order.poznamka,
    
    // Uživatelé
    enriched.uzivatel ? getUserDisplayName(null, enriched.uzivatel) : '',
    getGarantNameForSearch(order, getUserDisplayName),
    getPrikazceNameForSearch(order, getUserDisplayName),
    getSchvalovatelNameForSearch(order, getUserDisplayName),
    getUserDisplayName(order.uzivatel_id),
    getUserDisplayName(order.objednatel_id),
    
    // 🔥 STAVY - VŽDY HLEDEJ V OBOU ZDROJÍCH
    order.stav_objednavky, // ✅ Základní stav (české názvy: "Dokončena", "Ke schválení", ...)
    enriched.stav_workflow?.nazev_stavu, // ✅ Enriched workflow stav
    enriched.stav_workflow?.nazev, // ✅ Enriched název
    getOrderDisplayStatus(order), // ✅ Výpočetní funkce jako fallback
    
    // Druh objednávky
    getDruhObjednavkyNazev(),
    
    // Střediska
    enriched.strediska ? enriched.strediska.map(s => `${s.kod} ${s.nazev}`).join(' ') : '',
    order.strediska_kod ? (Array.isArray(order.strediska_kod) ? order.strediska_kod.join(' ') : order.strediska_kod) : '',
    
    // Financování
    order.financovani?.typ_nazev,
    order.financovani?.typ,
    order.financovani?.lp_kody ? order.financovani.lp_kody.join(' ') : '',
    order.financovani?.lp_nazvy ? order.financovani.lp_nazvy.map(lp => `${lp.cislo_lp || lp.kod || ''} ${lp.nazev || ''}`).join(' ') : '',
    order.financovani?.poznamka,
    order.financovani?.cislo_smlouvy,
    order.financovani?.poznamka_smlouvy,
    
    // 🔥 POLOŽKY OBJEDNÁVKY + PODŘÁDKY
    ...(order.polozky && Array.isArray(order.polozky)
      ? order.polozky.flatMap(item => {
          const itemFields = [
            item.nazev_polozky,
            item.popis,
            item.poznamka,
            item.poznamka_umisteni,
            item.katalog_cislo,
            item.dodavatel_kod,
            item.usek_kod,
            item.budova_kod,
            item.mistnost_kod
          ].filter(Boolean).join(' ');
          
          // ✅ Přidej i podřádky položky
          const subItems = item.podradky && Array.isArray(item.podradky)
            ? item.podradky.map(sub => [
                sub.nazev_polozky,
                sub.popis,
                sub.poznamka,
                sub.poznamka_umisteni,
                sub.katalog_cislo,
                sub.dodavatel_kod,
                sub.usek_kod,
                sub.budova_kod,
                sub.mistnost_kod
              ].filter(Boolean).join(' '))
            : [];
          
          return [itemFields, ...subItems];
        })
      : []),
    
    // 🔥 FAKTURY + PODŘÁDKY FAKTUR
    ...(order.faktury && Array.isArray(order.faktury)
      ? order.faktury.flatMap(faktura => {
          const fakturaFields = [
            faktura.fa_cislo_vema,
            faktura.cislo_faktury,
            faktura.fa_poznamka,
            faktura.fa_strediska_kod 
              ? (Array.isArray(faktura.fa_strediska_kod) 
                  ? faktura.fa_strediska_kod.join(' ') 
                  : faktura.fa_strediska_kod) 
              : ''
          ].filter(Boolean).join(' ');
          
          // ✅ Přidej i podřádky faktury
          const fakturaSubItems = faktura.polozky && Array.isArray(faktura.polozky)
            ? faktura.polozky.map(fItem => [
                fItem.nazev_polozky,
                fItem.popis,
                fItem.poznamka,
                fItem.katalog_cislo
              ].filter(Boolean).join(' '))
            : [];
          
          return [fakturaFields, ...fakturaSubItems];
        })
      : []),
    
    // Přílohy objednávky
    ...(order.prilohy && Array.isArray(order.prilohy)
      ? order.prilohy.map(priloha => [
          priloha.nazev_souboru,
          priloha.nazev,
          priloha.popis
        ].filter(Boolean).join(' '))
      : []),
    
    // Dodatečné dokumenty
    ...(order.dodatecne_dokumenty && Array.isArray(order.dodatecne_dokumenty)
      ? order.dodatecne_dokumenty.map(dokument => [
          dokument.nazev_souboru,
          dokument.nazev,
          dokument.popis
        ].filter(Boolean).join(' '))
      : []),
    
    // Přílohy faktur
    ...(order.faktury && Array.isArray(order.faktury)
      ? order.faktury.flatMap(faktura =>
          faktura.prilohy && Array.isArray(faktura.prilohy)
            ? faktura.prilohy.map(priloha => [
                priloha.nazev_souboru,
                priloha.nazev,
                priloha.popis
              ].filter(Boolean).join(' '))
            : []
        )
      : [])
  ].filter(Boolean).join(' '));

  return searchableText.includes(removeDiacritics(searchText));
};

/**
 * Filtr podle statusu (podporuje pole stavů)
 * @param {Object} order - Objednávka
 * @param {Array} statusFilter - Pole systémových kódů statusů (např. ['KE_SCHVALENI', 'SCHVALENA'])
 * @param {Function} getOrderSystemStatus - Funkce pro získání systémového kódu z objednávky
 */
export const filterByStatusArray = (order, statusFilter, getOrderSystemStatus) => {
  if (!statusFilter || !Array.isArray(statusFilter) || statusFilter.length === 0) return true;

  // 🔧 MAPOVÁNÍ: České názvy → Systémové kódy
  const czechToSystemCode = {
    'Nová': 'NOVA',
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Schválená': 'SCHVALENA',
    'Zamítnutá': 'ZAMITNUTA',
    'Čeká se': 'CEKA_SE',
    'Odloženo': 'CEKA_SE',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Ke zveřejnění': 'K_UVEREJNENI_DO_REGISTRU',
    'Zveřejněno': 'UVEREJNENA',
    'Fakturace': 'FAKTURACE',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Dokončená': 'DOKONCENA',
    'Vyřízená': 'VYRIZENA',
    'Zrušená': 'ZRUSENA',
    'Smazaná': 'SMAZANA',
    'Archivováno': 'ARCHIVOVANO',
    // Další varianty
    'Koncept': 'NOVA',
    'Draft': 'NOVA'
  };

  // 🔧 OBOUSMĚRNÉ MAPOVÁNÍ: Systémové kódy → České názvy (pro případ, že displayStatus obsahuje systémový kód)
  const systemCodeToCzech = {
    'NOVA': 'Nová',
    'ODESLANA_KE_SCHVALENI': 'Ke schválení',
    'SCHVALENA': 'Schválená',
    'ZAMITNUTA': 'Zamítnutá',
    'CEKA_SE': 'Odloženo',
    'ROZPRACOVANA': 'Rozpracovaná',
    'ODESLANA': 'Odeslaná dodavateli',
    'POTVRZENA': 'Potvrzená dodavatelem',
    'K_UVEREJNENI_DO_REGISTRU': 'Ke zveřejnění',
    'UVEREJNENA': 'Zveřejněno',
    'FAKTURACE': 'Fakturace',
    'CEKA_POTVRZENI': 'Čeká na potvrzení',
    'VECNA_SPRAVNOST': 'Věcná správnost',
    'DOKONCENA': 'Dokončená',
    'VYRIZENA': 'Vyřízená',
    'ZRUSENA': 'Zrušená',
    'SMAZANA': 'Smazaná',
    'ARCHIVOVANO': 'Archivováno'
  };

  // 🔥 FIX: Získej OBOJE - český název z DB i systémový kód
  const czechStatus = order.stav_objednavky; // České názvy z DB: "Ke schválení", "Dokončená", atd.
  const systemStatus = getOrderSystemStatus(order); // Systémové kódy: "ODESLANA_KE_SCHVALENI", "DOKONCENA", atd.
  
  // 🐛 DEBUG
  if (statusFilter.includes('Ke schválení') && order.id < 165) {
    console.log('🔍 filterByStatusArray DEBUG:', {
      orderId: order.id,
      filterValue: statusFilter,
      czechStatus,
      systemStatus,
      match: czechStatus === 'Ke schválení'
    });
  }
  
  if ((!czechStatus && !systemStatus) || systemStatus === 'DRAFT') {
    return statusFilter.includes('Nová') || statusFilter.includes('Koncept') || statusFilter.includes('NOVA') || statusFilter.includes('Draft');
  }

  // 🎯 Porovnej s OBOJE - český název i systémový kód
  return statusFilter.some(filterValue => {
    // 1. PRIORITA: Přímé porovnání českého názvu (dlaždice → DB české názvy)
    if (czechStatus && filterValue === czechStatus) {
      return true;
    }
    
    // 2. Mapování českého názvu na systémový kód (sloupcový filtr)
    const expectedSystemCode = czechToSystemCode[filterValue];
    if (expectedSystemCode && expectedSystemCode === systemStatus) {
      return true;
    }
    
    // 3. Přímé porovnání systémového kódu (fallback)
    if (filterValue === systemStatus) {
      return true;
    }
    
    // 4. Systémový kód v malých písmenech
    if (filterValue.toUpperCase() === systemStatus) {
      return true;
    }
    
    // 5. Porovnání českého překladu systémového kódu (fallback)
    const czechFromSystem = systemCodeToCzech[systemStatus];
    if (czechFromSystem && removeDiacritics(czechFromSystem.toLowerCase()) === removeDiacritics(filterValue.toLowerCase())) {
      return true;
    }
    
    return false;
  });
};

/**
 * Filtr podle archivace
 */
export const filterByArchived = (order, showArchived, getOrderSystemStatus) => {
  if (showArchived) return true;

  const status = getOrderSystemStatus(order);
  return status !== 'ARCHIVOVANO';
};

/**
 * Filtr podle uživatele (creator nebo orderer)
 */
export const filterByUser = (order, userFilter) => {
  if (!userFilter) return true;

  const userId = parseInt(userFilter);
  const matchesCreator = order.uzivatel_id === userId;
  const matchesOrderer = order.objednatel_id === userId;

  return matchesCreator || matchesOrderer;
};

/**
 * Filtr podle data (dt_objednavky nebo datum_obj_do)
 */
export const filterByDateRange = (order, dateFromFilter, dateToFilter, getOrderDate) => {
  if (!dateFromFilter && !dateToFilter) return true;

  const dtObjednavky = getOrderDate(order);
  const datumObjDo = order.datum_obj_do ? order.datum_obj_do.split('T')[0] : null;

  const hasAnyDate = dtObjednavky || datumObjDo;
  if (!hasAnyDate) return true;

  let passesFilter = false;

  // Kontrola dt_objednavky
  if (dtObjednavky) {
    const orderDate = new Date(dtObjednavky);
    const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
    const toDate = dateToFilter ? new Date(dateToFilter) : null;

    if (toDate) toDate.setHours(23, 59, 59, 999);

    const afterFrom = !fromDate || orderDate >= fromDate;
    const beforeTo = !toDate || orderDate <= toDate;

    if (afterFrom && beforeTo) {
      passesFilter = true;
    }
  }

  // Kontrola datum_obj_do (pokud dt_objednavky neprošlo)
  if (!passesFilter && datumObjDo) {
    const objDoDate = new Date(datumObjDo);
    const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
    const toDate = dateToFilter ? new Date(dateToFilter) : null;

    if (toDate) toDate.setHours(23, 59, 59, 999);

    const afterFrom = !fromDate || objDoDate >= fromDate;
    const beforeTo = !toDate || objDoDate <= toDate;

    if (afterFrom && beforeTo) {
      passesFilter = true;
    }
  }

  return passesFilter;
};

/**
 * Filtr podle částky
 */
export const filterByAmountRange = (order, amountFromFilter, amountToFilter) => {
  const amount = parseFloat(order.max_cena_s_dph || 0);

  if (amountFromFilter && amount < parseFloat(amountFromFilter)) return false;
  if (amountToFilter && amount > parseFloat(amountToFilter)) return false;

  return true;
};

/**
 * Filtr podle stavu registru smluv
 */
export const filterByRegistrStatus = (order, filterMaBytZverejneno, filterByloZverejneno, getOrderWorkflowStatus) => {
  if (!filterMaBytZverejneno && !filterByloZverejneno) return true;

  const registr = order.registr_smluv;
  const workflowStatus = getOrderWorkflowStatus(order);

  const maZverejnit = workflowStatus === 'UVEREJNIT' || registr?.zverejnit === 'ANO';
  const jeZverejneno = registr?.dt_zverejneni && registr?.registr_iddt;

  // Pokud jsou zaškrtnuté OBOJE → zobraz objednávky které splňují ALESPOŇ JEDNO
  if (filterMaBytZverejneno && filterByloZverejneno) {
    return (maZverejnit && !jeZverejneno) || jeZverejneno;
  }
  // Pokud je zaškrtnuté jen "Má být zveřejněno"
  else if (filterMaBytZverejneno) {
    return maZverejnit && !jeZverejneno;
  }
  // Pokud je zaškrtnuté jen "Bylo již zveřejněno"
  else if (filterByloZverejneno) {
    return jeZverejneno;
  }

  return true;
};
