/**
 * 📦 useOrderDataLoader Hook
 * Načítá data objednávky z DB a transformuje je pro formulář
 *
 * ✨ V2 API Migration: Uses Order V2 API with standardized data types
 * - strediska_kod: string[] (array of codes)
 * - financovani: {typ, nazev, lp_kody?}
 * - druh_objednavky_kod: string
 * - max_cena_s_dph: string (for precision)
 */

import { useState, useCallback, useRef } from 'react';
import { getOrderV2, getNextOrderNumberV2, listInvoiceAttachments } from '../../../services/apiOrderV2'; // ✅ V2 API + přílohy faktur
import { WORKFLOW_STATES } from '../../../constants/workflow25';

export const useOrderDataLoader = ({ token, username, dictionaries }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);

  /**
   * Helper: Extrahování enriched user dat z backendu
   */
  const extractEnrichedUserData = useCallback((enrichedUser) => {
    if (!enrichedUser) return null;

    const titul_pred = enrichedUser.titul_pred || '';
    const jmeno = enrichedUser.jmeno || '';
    const prijmeni = enrichedUser.prijmeni || '';
    const titul_za = enrichedUser.titul_za || '';

    const displayName = `${titul_pred ? titul_pred + ' ' : ''}${jmeno} ${prijmeni}${titul_za ? ', ' + titul_za : ''}`.trim();

    return {
      displayName,
      email: enrichedUser.email || '',
      telefon: enrichedUser.telefon || ''
    };
  }, []);

  /**
   * Helper: Transformace dat z DB do formátu formuláře
   *
   * ✨ V2 API: Backend už posílá standardizovaný formát:
   * - strediska_kod: string[] (ne objekty!)
   * - financovani: {typ, nazev, lp_kody} (ne kod_stavu!)
   * - druh_objednavky_kod: string (ne objekt!)
   * - max_cena_s_dph: string (ne number!)
   *
   * 📚 V2 API /enriched endpoint:
   * - Posílá _enriched.objednatel data (user info)
   * - Není potřeba fallback na dictionaries.data.allUsers
   */
  const transformOrderData = useCallback((dbOrder, dictionaries) => {
    if (!dbOrder) return null;

    // Doplnit údaje objednatele z _enriched (V2 API /enriched endpoint)
    let objednatelData = {};
    if (dbOrder.objednatel_id) {
      // V2 /enriched endpoint: Data přijdou v _enriched.objednatel
      if (dbOrder._enriched?.objednatel) {
        const enriched = extractEnrichedUserData(dbOrder._enriched.objednatel);
        if (enriched) {
          objednatelData = {
            jmeno: enriched.displayName,
            email: enriched.email,
            telefon: enriched.telefon
          };
        }
      }

      // Fallback na číselník jen pokud enriched data chybí
      if (!objednatelData.jmeno && dictionaries?.data?.allUsers) {
        const objednatel = dictionaries.data.allUsers.find(u =>
          (u.id && u.id === dbOrder.objednatel_id) ||
          (u.user_id && u.user_id === dbOrder.objednatel_id)
        );

        if (objednatel) {
          const titul_pred_str = objednatel.titul_pred ? objednatel.titul_pred + ' ' : '';
          const jmeno_str = objednatel.jmeno || '';
          const prijmeni_str = objednatel.prijmeni || '';
          const titul_za_str = objednatel.titul_za ? ', ' + objednatel.titul_za : '';
          const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim();

          objednatelData = {
            jmeno: displayName || objednatel.username || '',
            email: objednatel.email || '',
            telefon: objednatel.telefon || ''
          };
        }
      }
    }

    // ✨ V2 API: Střediska jsou už array stringů ["KLADNO", "PRAHA"]
    const strediskaKod = (() => {
      // Backend V2 vrací už správný formát
      if (Array.isArray(dbOrder.strediska_kod)) {
        const result = dbOrder.strediska_kod.map(kod => String(kod).toUpperCase());
        return result;
      }
      // Fallback: enriched data (pro kompatibilitu se starým API)
      if (dbOrder._enriched?.strediska && Array.isArray(dbOrder._enriched.strediska)) {
        const result = dbOrder._enriched.strediska.map(s => s.kod.toUpperCase());
        return result;
      }
      return [];
    })();

    // ✨ V2 API: Financování je {typ, nazev, lp_kody}
    const zpusobFinancovani = (() => {
      // Backend V2 vrací {typ: "LP", nazev: "...", lp_kody: [...]}
      if (dbOrder.financovani && typeof dbOrder.financovani === 'object') {
        return dbOrder.financovani.typ || '';
      }
      // Fallback pro starý formát (během migrace)
      if (dbOrder.financovani && typeof dbOrder.financovani === 'string') {
        try {
          const parsed = JSON.parse(dbOrder.financovani);
          return parsed.typ || parsed.kod_stavu || '';
        } catch (e) {
          return dbOrder.zpusob_financovani || '';
        }
      }
      return dbOrder.zpusob_financovani || '';
    })();

    // ✨ V2 API: Vnořená data financování
    let financovaniVnorena = {};
    if (dbOrder.financovani && typeof dbOrder.financovani === 'object') {
      financovaniVnorena = {
        lp_kod: dbOrder.financovani.lp_kody || [], // V2 používá "lp_kody"
        lp_nazev: dbOrder.financovani.nazev || '', // Název LP
        // Další pole (pokud existují)
        paragraf: dbOrder.financovani.paragraf || '',
        polozka: dbOrder.financovani.polozka || '',
        investice: dbOrder.financovani.investice || '',
        // ✅ SMLOUVA - číslo a poznámka (načítají se z root objektu, fallback na financovani)
        cislo_smlouvy: dbOrder.cislo_smlouvy || dbOrder.financovani.cislo_smlouvy || '',
        smlouva_poznamka: dbOrder.smlouva_poznamka || dbOrder.financovani.smlouva_poznamka || ''
      };
    }

    // ✅ INDIVIDUÁLNÍ SCHVÁLENÍ a POJISTNÁ UDÁLOST - načítat z root objektu (stejně jako cislo_smlouvy)
    const individualni_schvaleni = dbOrder.individualni_schvaleni 
      ? String(dbOrder.individualni_schvaleni)
      : (dbOrder.financovani?.individualni_schvaleni ? String(dbOrder.financovani.individualni_schvaleni) : '');
    const individualni_poznamka = dbOrder.individualni_poznamka || dbOrder.financovani?.individualni_poznamka || '';
    const pojistna_udalost_cislo = dbOrder.pojistna_udalost_cislo || dbOrder.financovani?.pojistna_udalost_cislo || '';
    const pojistna_udalost_poznamka = dbOrder.pojistna_udalost_poznamka || dbOrder.financovani?.pojistna_udalost_poznamka || '';

    // ✨ V2 API: Druh objednávky je string "AUTA"
    const druhObjednavky = (() => {
      // Backend V2 vrací už jen string
      if (typeof dbOrder.druh_objednavky_kod === 'string') {
        return dbOrder.druh_objednavky_kod;
      }
      // Fallback pro starý formát (během migrace)
      if (dbOrder.druh_objednavky_kod && typeof dbOrder.druh_objednavky_kod === 'object') {
        return dbOrder.druh_objednavky_kod.kod_stavu || dbOrder.druh_objednavky_kod.kod || '';
      }
      return '';
    })();

    // 🏷️ Stav objednávky - převést workflow kód na text
    const stavObjednavky = (() => {
      try {
        // Parsuj workflow stavy (může být array nebo JSON string)
        const stavyArray = Array.isArray(dbOrder.stav_workflow_kod)
          ? dbOrder.stav_workflow_kod
          : JSON.parse(dbOrder.stav_workflow_kod || '["NOVA"]');

        if (!Array.isArray(stavyArray) || stavyArray.length === 0) {
          return 'Nová';
        }

        // Získej poslední (nejvýznamnější) stav
        const poslednSta = stavyArray[stavyArray.length - 1];
        const stavInfo = WORKFLOW_STATES[poslednSta];

        if (stavInfo) {
          return stavInfo.name;
        }

        // Fallback
        return poslednSta || 'Nová';
      } catch (e) {
        return 'Nová';
      }
    })();

    // Transformovaná data
    const transformedData = {
      ...dbOrder,
      ...objednatelData,
      id: dbOrder.id,
      ev_cislo: dbOrder.cislo_objednavky || dbOrder.ev_cislo,
      stav_workflow_kod: dbOrder.stav_workflow_kod || 'NOVA',
      stav_objednavky: stavObjednavky, // 🏷️ Textový popis stavu
      mimoradna_udalost: dbOrder.mimoradna_udalost || false, // Mimořádná událost

      // 🔍 Detekce stavů checkboxů podle workflow
      // ODESLANA: stav obsahuje "ODESLANA" + dt_odeslani != null + odesilatel_id != null
      stav_odeslano: (() => {
        try {
          const stavyArray = Array.isArray(dbOrder.stav_workflow_kod)
            ? dbOrder.stav_workflow_kod
            : JSON.parse(dbOrder.stav_workflow_kod || '[]');
          const maOdeslanu = Array.isArray(stavyArray) && stavyArray.includes('ODESLANA');
          const maDatum = !!dbOrder.dt_odeslani;
          const maOdesilatele = !!dbOrder.odesilatel_id;
          return maOdeslanu && maDatum && maOdesilatele;
        } catch (e) {
          return false;
        }
      })(),

      // STORNOVANA: stav obsahuje "STORNOVANA"
      stav_stornovano: (() => {
        try {
          const stavyArray = Array.isArray(dbOrder.stav_workflow_kod)
            ? dbOrder.stav_workflow_kod
            : JSON.parse(dbOrder.stav_workflow_kod || '[]');
          return Array.isArray(stavyArray) && stavyArray.includes('STORNOVANA');
        } catch (e) {
          return false;
        }
      })(),

      // 🎯 FÁZE 1: Stav schválení (UI helper odvozený ze workflow stavů)
      // ✅ Checkbox se zobrazuje pro všechny stavy KROMĚ "NOVA"
      // Mapování stavů: SCHVALENA → 'schvaleno', ZAMITNUTA → 'neschvaleno', CEKA_SE → 'ceka_se'
      // Pro ostatní stavy (ODESLAN_KE_SCHVALENI apod.) → checkbox zůstane prázdný
      stav_schvaleni: (() => {
        try {
          const stavyArray = Array.isArray(dbOrder.stav_workflow_kod)
            ? dbOrder.stav_workflow_kod
            : JSON.parse(dbOrder.stav_workflow_kod || '[]');

          if (!Array.isArray(stavyArray)) return '';

          // ✅ Mapování workflow stavů na UI checkbox hodnoty
          if (stavyArray.includes('SCHVALENA')) {
            return 'schvaleno';
          } else if (stavyArray.includes('ZAMITNUTA')) {
            return 'neschvaleno';
          } else if (stavyArray.includes('CEKA_SE')) {
            return 'ceka_se';
          }

          // ODESLAN_KE_SCHVALENI nebo jiné → checkbox zůstane prázdný (ale zobrazí se)
          return '';
        } catch (e) {
          return '';
        }
      })(),

      // Datumová pole
      datum_odeslani: dbOrder.dt_odeslani || dbOrder.dt_odeslano ? (dbOrder.dt_odeslani || dbOrder.dt_odeslano).split(' ')[0] : '',
      datum_storna: dbOrder.dt_odeslani || dbOrder.dt_odeslano ? (dbOrder.dt_odeslani || dbOrder.dt_odeslano).split(' ')[0] : '',
      dt_akceptace: dbOrder.dt_akceptace ? dbOrder.dt_akceptace.split(' ')[0] : '',
      datum_vytvoreni: dbOrder.dt_vytvoreni ? dbOrder.dt_vytvoreni.split(' ')[0] : '',
      datum_splatnosti: dbOrder.dt_splatnost ? dbOrder.dt_splatnost.split(' ')[0] : '',
      temp_datum_objednavky: dbOrder.datum_objednavky ? dbOrder.datum_objednavky.split(' ')[0] : (dbOrder.dt_objednavky ? dbOrder.dt_objednavky.split(' ')[0] : ''),

      // Workflow tracking pole
      odesilatel_id: dbOrder.odesilatel_id || null,
      dodavatel_potvrdil_id: dbOrder.dodavatel_potvrdil_id || null,
      zverejnil_id: dbOrder.zverejnil_id || null,
      dt_zverejneni_potvrzeni: dbOrder.dt_zverejneni_potvrzeni ? dbOrder.dt_zverejneni_potvrzeni.split(' ')[0] : '',
      potvrdil_vecnou_spravnost_id: dbOrder.potvrdil_vecnou_spravnost_id || null,
      dt_potvrzeni_vecne_spravnosti: dbOrder.dt_potvrzeni_vecne_spravnosti || '',
      potvrzeni_vecne_spravnosti: (() => {
        const rawValue = dbOrder.potvrzeni_vecne_spravnosti;
        // Handle boolean from V2 API
        if (typeof rawValue === 'boolean') return rawValue ? 1 : 0;
        // Handle number
        if (typeof rawValue === 'number') return rawValue;
        // Handle string
        if (typeof rawValue === 'string') return parseInt(rawValue, 10) || 0;
        // Default
        return 0;
      })(),
      vecna_spravnost_umisteni_majetku: dbOrder.vecna_spravnost_umisteni_majetku || '',
      vecna_spravnost_poznamka: dbOrder.vecna_spravnost_poznamka || '',
      fakturant_id: dbOrder.fakturant_id || null,
      dt_faktura_pridana: dbOrder.dt_faktura_pridana || '',
      dokoncil_id: dbOrder.dokoncil_id || null,
      dt_dokonceni: dbOrder.dt_dokonceni || '',
      dokonceni_poznamka: dbOrder.dokonceni_poznamka || '',
      potvrzeni_dokonceni_objednavky: (() => {
        const rawValue = dbOrder.potvrzeni_dokonceni_objednavky;
        // Handle boolean from V2 API
        if (typeof rawValue === 'boolean') return rawValue ? 1 : 0;
        // Handle number
        if (typeof rawValue === 'number') return rawValue;
        // Handle string
        if (typeof rawValue === 'string') return parseInt(rawValue, 10) || 0;
        // Default
        return 0;
      })(),

      // ✨ V2 API: Střediska a financování v novém formátu
      strediska_kod: strediskaKod,
      zpusob_financovani: zpusobFinancovani,
      ...financovaniVnorena,
      
      // ✅ INDIVIDUÁLNÍ SCHVÁLENÍ a POJISTNÁ UDÁLOST - z root objektu
      individualni_schvaleni,
      individualni_poznamka,
      pojistna_udalost_cislo,
      pojistna_udalost_poznamka,

      // ✨ V2 API: Druh objednávky jako string
      druh_objednavky_kod: druhObjednavky,

      // Položky objednávky - backend posílá jako 'polozky', frontend používá 'polozky_objednavky'
      polozky_objednavky: Array.isArray(dbOrder.polozky) ? dbOrder.polozky : [],

      // ✅ FAKTURY: Mapování DB -> FE (fa_datum_splatnosti -> fa_splatnost)
      faktury: (() => {
        if (!Array.isArray(dbOrder.faktury)) return [];

        return dbOrder.faktury.map(faktura => ({
          ...faktura,
          // ✅ MAPOVÁNÍ 1:1 mezi DB sloupci a FE poli
          fa_dorucena: faktura.fa_datum_doruceni ? 1 : 0, // ✅ Boolean flag zda má datum doručení
          fa_splatnost: faktura.fa_datum_splatnosti ? faktura.fa_datum_splatnosti.split(' ')[0] : '', // ✅ DB -> FE: fa_datum_splatnosti -> fa_splatnost
          // ✅ Zachovat originální DB pole pro API odesílání
          fa_datum_doruceni: faktura.fa_datum_doruceni,
          fa_datum_splatnosti: faktura.fa_datum_splatnosti,
          fa_datum_vystaveni: faktura.fa_datum_vystaveni,
          // 📎 PŘÍLOHY: Přenést attachments z dbOrder (načtené v loadOrderForEdit)
          attachments: faktura.attachments || []
          // ✅ VĚCNÁ SPRÁVNOST: 1:1 mapování - žádné přejmenovávání polí!
          // vecna_spravnost_umisteni_majetku, vecna_spravnost_poznamka, vecna_spravnost_potvrzeno,
          // potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti - vše 1:1 z DB
        }));
      })(),

      // ✨ V2 API: Dodavatel způsob potvrzení {zpusob_potvrzeni[], zpusob_platby}
      dodavatel_zpusob_potvrzeni: (() => {
        try {
          // ✅ ANO = pokud existuje dt_akceptace A dodavatel_potvrdil_id (bez ohledu na dodavatel_zpusob_potvrzeni)
          const maAkceptaci = !!(dbOrder.dt_akceptace && dbOrder.dodavatel_potvrdil_id);

          // Kontrola prázdné hodnoty
          if (!dbOrder.dodavatel_zpusob_potvrzeni ||
              dbOrder.dodavatel_zpusob_potvrzeni === '' ||
              (typeof dbOrder.dodavatel_zpusob_potvrzeni === 'string' && dbOrder.dodavatel_zpusob_potvrzeni.trim() === '')) {
            // Pokud máme dt_akceptace + dodavatel_potvrdil_id, ale chybí dodavatel_zpusob_potvrzeni -> ANO s prázdnými daty
            if (maAkceptaci) {
              return {
                potvrzeni: 'ANO',
                zpusoby: [],
                platba: 'faktura' // vždy faktura (pevně nastaveno)
              };
            }
            // Jinak NE
            return {
              potvrzeni: 'NE',
              zpusoby: [],
              platba: 'faktura' // vždy faktura (pevně nastaveno)
            };
          }

          if (typeof dbOrder.dodavatel_zpusob_potvrzeni === 'object') {
            // ✅ BE formát: {potvrzeno: true, zpusoby: [], platba: ""}
            // NEBO starý formát BEZ potvrzeno: {zpusoby: [], platba: ""}
            const beData = dbOrder.dodavatel_zpusob_potvrzeni;

            // ✅ FALLBACK: Pokud DB neobsahuje 'potvrzeno', odvoď z dt_akceptace
            const potvrzenoValue = beData.potvrzeno !== undefined
              ? beData.potvrzeno          // DB má potvrzeno
              : maAkceptaci;              // DB nemá → odvozeno z dt_akceptace

            return {
              potvrzeni: potvrzenoValue ? 'ANO' : 'NE',
              // 🔧 OPRAVA: zpusoby (množné číslo!) - DB vrací "zpusoby" ne "zpusob"
              zpusoby: beData.zpusoby || beData.zpusob || beData.zpusob_potvrzeni || [],
              platba: 'faktura' // vždy faktura (pevně nastaveno)
            };
          } else if (typeof dbOrder.dodavatel_zpusob_potvrzeni === 'string') {
            // Starý formát (fallback během migrace) - parsuj jen neprázdný string
            const trimmed = dbOrder.dodavatel_zpusob_potvrzeni.trim();
            if (trimmed.length === 0) {
              return {
                potvrzeni: 'NE',
                zpusoby: [],
                platba: ''
              };
            }

            const parsed = JSON.parse(trimmed);
            // ✅ FALLBACK: Pokud DB nemá 'potvrzeno', odvoď z dt_akceptace
            const potvrzenoValue = parsed.potvrzeno !== undefined
              ? parsed.potvrzeno    // DB má potvrzeno
              : maAkceptaci;        // DB nemá → odvozeno z dt_akceptace

            return {
              potvrzeni: potvrzenoValue ? 'ANO' : 'NE',
              // 🔧 OPRAVA: zpusoby (množné číslo!) - DB vrací "zpusoby" ne "zpusob"
              zpusoby: parsed.zpusoby || parsed.zpusob || parsed.zpusob_potvrzeni || [],
              platba: 'faktura' // vždy faktura (pevně nastaveno)
            };
          } else {
            // Default - NE
            return {
              potvrzeni: 'NE',
              zpusoby: [],
              platba: 'faktura' // vždy faktura (pevně nastaveno)
            };
          }
        } catch (e) {
          return {
            potvrzeni: 'NE',
            zpusoby: [],
            platba: ''
          };
        }
      })()
    };

    // 🏛️ ARCHIVOVANÉ OBJEDNÁVKY - speciální pravidla
    // Detekce archivované objednávky (stav workflow)
    const currentStates = Array.isArray(transformedData.stav_workflow_kod)
      ? transformedData.stav_workflow_kod
      : (transformedData.stav_workflow_kod ? [transformedData.stav_workflow_kod] : []);

    // ⚠️ KRITICKÉ: Detekovat podle PŮVODNÍ DB hodnoty stav_objednavky, NE podle transformované!
    const isArchived = dbOrder.stav_objednavky === 'ARCHIVOVANO' ||
                       dbOrder.stav_objednavky === 'Archivováno' ||
                       currentStates.includes('ARCHIVOVANO');

    if (isArchived) {

      // 1. Nastav workflow stav pouze na ARCHIVOVANO (NESMÍ SE PŘEPSAT!)
      transformedData.stav_workflow_kod = ['ARCHIVOVANO'];
      transformedData.stav_objednavky = 'Archivováno';

      // 2. Nastav všechny dokončené fáze jako completed
      transformedData.stav_odeslano = true;
      transformedData.stav_schvaleni = 'schvaleno';

      // 3. Pokud má "má být zveřejněna", označ jako zveřejněnou
      if (transformedData.ma_byt_zverejnena || transformedData.ma_byt_zverejnena === 1) {
        // 🔥 FIX: Použít lokální datum místo UTC
        transformedData.dt_zverejneni = transformedData.dt_zverejneni || (() => {
          const now = new Date();
          const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
          return `${y}-${m}-${d}`;
        })();
      }

      // 4. Nastav jako zkontrolováno
      transformedData.potvrzeni_vecne_spravnosti = 1;

      // 5. Normalizuj příkazce a schvalovatele na string (včetně '0' pro SYSTEM)
      if (transformedData.prikazce_id === 0 || transformedData.prikazce_id === null || transformedData.prikazce_id === '') {
        transformedData.prikazce_id = '0'; // SYSTEM
      } else if (transformedData.prikazce_id) {
        transformedData.prikazce_id = String(transformedData.prikazce_id);
      }

      if (transformedData.schvalovatel_id === 0 || transformedData.schvalovatel_id === null || transformedData.schvalovatel_id === '') {
        transformedData.schvalovatel_id = '0'; // SYSTEM
      } else if (transformedData.schvalovatel_id) {
        transformedData.schvalovatel_id = String(transformedData.schvalovatel_id);
      }

    } else {
      // ✅ BĚŽNÉ OBJEDNÁVKY - žádná speciální logika, jen normalizace ID na string
      if (transformedData.prikazce_id !== null && transformedData.prikazce_id !== undefined && transformedData.prikazce_id !== '') {
        transformedData.prikazce_id = String(transformedData.prikazce_id);
      }

      if (transformedData.schvalovatel_id !== null && transformedData.schvalovatel_id !== undefined && transformedData.schvalovatel_id !== '') {
        transformedData.schvalovatel_id = String(transformedData.schvalovatel_id);
      }
    }

    return transformedData;
  }, [extractEnrichedUserData]);

  /**
    // Detekce archivované objednávky (URL param nebo stav workflow)
    const currentStates = Array.isArray(transformedData.stav_workflow_kod)
      ? transformedData.stav_workflow_kod
      : (transformedData.stav_workflow_kod ? [transformedData.stav_workflow_kod] : []);

    const isArchived = transformedData.archivovano === 1 ||
                       transformedData.archivovano === '1' ||
                       currentStates.includes('ARCHIVOVANO') ||
                       transformedData.stav_objednavky === 'ARCHIVOVANO' ||
                       transformedData.stav_objednavky === 'Archivováno';

    if (isArchived) {

      // 1. Nastav workflow stav pouze na ARCHIVOVANO (NESMÍ SE PŘEPSAT!)
      transformedData.stav_workflow_kod = ['ARCHIVOVANO'];
      transformedData.stav_objednavky = 'Archivováno';

      // 2. Nastav všechny dokončené fáze jako completed
      transformedData.stav_odeslano = true;
      transformedData.stav_schvaleni = 'schvaleno';

      // 3. Pokud má "má být zveřejněna", označ jako zveřejněnou
      if (transformedData.ma_byt_zverejnena || transformedData.ma_byt_zverejnena === 1) {
        // 🔥 FIX: Použít lokální datum místo UTC
        transformedData.dt_zverejneni = transformedData.dt_zverejneni || (() => {
          const now = new Date();
          const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
          return `${y}-${m}-${d}`;
        })();
      }

      // 4. Nastav jako zkontrolováno
      transformedData.potvrzeni_vecne_spravnosti = 1;

      // 5. Normalizuj příkazce a schvalovatele na '0' pokud chybí
      if (!transformedData.prikazce_id ||
          transformedData.prikazce_id === 0 ||
          transformedData.prikazce_id === null) {
        transformedData.prikazce_id = '0';
      } else {
        transformedData.prikazce_id = String(transformedData.prikazce_id);
      }

      if (!transformedData.schvalovatel_id ||
          transformedData.schvalovatel_id === 0 ||
          transformedData.schvalovatel_id === null) {
        transformedData.schvalovatel_id = '0';
      } else {
        transformedData.schvalovatel_id = String(transformedData.schvalovatel_id);
      }

    } else {
      // 🔧 PRIORITA 2: BĚŽNÉ OBJEDNÁVKY - normalizace SYSTEM uživatelů
      let maSystemUzivatele = false;

      // Pokud není příkazce (null, undefined, '', 0), nastav SYSTEM (string '0')
      if (!transformedData.prikazce_id ||
          transformedData.prikazce_id === '' ||
          transformedData.prikazce_id === null ||
          transformedData.prikazce_id === 0 ||
          transformedData.prikazce_id === '0') {
        transformedData.prikazce_id = '0';
        maSystemUzivatele = true;
      } else {
        // Zajisti že ID je string
        transformedData.prikazce_id = String(transformedData.prikazce_id);
      }

      // Pokud není schvalovatel (null, undefined, '', 0), nastav SYSTEM (string '0')
      if (!transformedData.schvalovatel_id ||
          transformedData.schvalovatel_id === '' ||
          transformedData.schvalovatel_id === null ||
          transformedData.schvalovatel_id === 0 ||
          transformedData.schvalovatel_id === '0') {
        transformedData.schvalovatel_id = '0';
        maSystemUzivatele = true;
      } else {
        // Zajisti že ID je string
        transformedData.schvalovatel_id = String(transformedData.schvalovatel_id);
      }

      // Pokud má SYSTEM uživatele, nastav workflow stavy na SCHVALENA + ROZPRACOVANA
      if (maSystemUzivatele) {
        transformedData.stav_workflow_kod = ['SCHVALENA', 'ROZPRACOVANA'];
        transformedData.stav_objednavky = 'Schválená';
      }
    }

    console.log('� Po normalizaci:', {
      prikazce_id: transformedData.prikazce_id,
      prikazce_id_type: typeof transformedData.prikazce_id,
      schvalovatel_id: transformedData.schvalovatel_id,
      schvalovatel_id_type: typeof transformedData.schvalovatel_id,
      stav_workflow_kod: transformedData.stav_workflow_kod,
      stav_objednavky: transformedData.stav_objednavky
    });

    return transformedData;
  }, [extractEnrichedUserData]);

  /**
   * 🔄 Načtení objednávky pro EDIT režim
   *
   * ✨ V2 API Migration: Uses getOrderV2() instead of getOrder25()
   */
  const loadOrderForEdit = useCallback(async ({ orderId, archivovano = 0 }) => {
    if (!token || !username) {
      console.error('❌ [useOrderDataLoader] Missing token or username!');
      throw new Error('Missing token or username');
    }

    // ⚠️ NOTE: dictionaries.isReady check REMOVED
    // Reason: Closure captures old dictionaries state
    // Check is now done in useFormController with polling
    // See: useFormController.js lines 63-83

    if (loadingRef.current) {
      // Already loading - skip duplicate call
      return null;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // ✨ V2 API: Use getOrderV2() - returns standardized data with enriched=true
      const dbOrder = await getOrderV2(orderId, token, username, true, archivovano); // ✅ enriched=true + archivovano parameter

      if (!dbOrder) {
        console.error('❌ [useOrderDataLoader] dbOrder is null!');
        throw new Error(`Order ${orderId} not found`);
      }

      // 📎 NAČÍST PŘÍLOHY PRO FAKTURY (pokud existují)
      if (dbOrder.faktury && Array.isArray(dbOrder.faktury) && dbOrder.faktury.length > 0) {
        const fakturyWithAttachments = await Promise.all(
          dbOrder.faktury.map(async (faktura) => {
            let attachments = [];
            
            // Načíst přílohy pouze pro reálné ID (ne temp-)
            if (faktura.id && !String(faktura.id).startsWith('temp-')) {
              try {
                const attachResponse = await listInvoiceAttachments(
                  faktura.id,
                  username,
                  token,
                  orderId
                );
                attachments = attachResponse.data?.attachments || attachResponse.data || [];
              } catch (err) {
                console.error(`❌ [useOrderDataLoader] Chyba při načítání příloh faktury ID=${faktura.id}:`, err);
                // Pokračovat i při chybě - přílohy jsou optional
                attachments = []; // ✅ Ujistit se, že attachments je pole i při chybě
              }
            }
            
            return { ...faktura, attachments };
          })
        );
        
        // Nahradit faktury včetně příloh
        dbOrder.faktury = fakturyWithAttachments;
      } else if (dbOrder.faktury && Array.isArray(dbOrder.faktury)) {
        // ✅ I když faktury nemají přílohy, ujistit se že mají prázdné pole attachments
        dbOrder.faktury = dbOrder.faktury.map(f => ({ ...f, attachments: [] }));
      }

      const transformedData = transformOrderData(dbOrder, dictionaries);
      return transformedData;
    } catch (err) {
      console.error('❌ [useOrderDataLoader] Error in loadOrderForEdit:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [token, username, dictionaries, transformOrderData]);

  /**
   * 📋 Načtení objednávky pro COPY režim
   */
  const loadOrderForCopy = useCallback(async ({ orderId, archivovano = 0, userId }) => {
    if (!token || !username) {
      throw new Error('Missing token or username');
    }

    // ⚠️ NOTE: dictionaries.isReady check REMOVED
    // Reason: Closure captures old dictionaries state
    // Check is now done in useFormController with polling
    // See: useFormController.js lines 63-83

    if (loadingRef.current) {
      // Already loading - skip duplicate call
      return null;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Načti zdrojovou objednávku - ✅ V2 API
      const dbOrder = await getOrderV2(
        orderId,
        token,
        username,
        true // enriched = true
      );

      if (!dbOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Získej nové evidenční číslo (pouze pro ZOBRAZENÍ) - ✅ V2 API
      const nextNumberResponse = await getNextOrderNumberV2(token, username);
      // V2 API vrací: { data: { next_order_string, order_number_string, ... } }
      // ⚠️ DŮLEŽITÉ: Toto číslo je POUZE pro ZOBRAZENÍ - neposílá se v CREATE/UPDATE
      const newEvCislo = nextNumberResponse?.order_number_string || nextNumberResponse?.next_order_string || nextNumberResponse?.next_number;

      if (!newEvCislo) {
        throw new Error('Failed to get new order number');
      }

      // Transformuj a reset polí pro kopii
      const transformedData = transformOrderData(dbOrder, dictionaries);

      const copiedOrder = {
        ...transformedData,

        // Reset ID a evidenčního čísla
        id: null,
        objednavka_id: null,
        ev_cislo: newEvCislo,
        // 🔥 FIX: Použít lokální datum místo UTC
        temp_datum_objednavky: (() => {
          const now = new Date();
          const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
          return `${y}-${m}-${d}`;
        })(),

        // Reset workflow
        stav_workflow_kod: 'NOVA',
        schvalovatel_id: '',
        dt_schvaleni: '',
        schvaleni_komentar: '',

        // Reset časových razítek
        datum_vytvoreni: '',
        datum_posledni_zmeny: '',
        vytvoril_uzivatel_id: userId,
        uzivatel_id: userId,

        // Reset stavů
        stav_odeslano: false,
        datum_odeslani: '',
        stav_stornovano: false,
        datum_storna: '',

        // Reset příloh a faktur
        prilohy_dokumenty: [],
        faktury: []
      };

      return { data: copiedOrder, sourceOrderId: orderId };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [token, username, dictionaries, transformOrderData]);

  return {
    loading,
    error,
    loadOrderForEdit,
    loadOrderForCopy
  };
};
