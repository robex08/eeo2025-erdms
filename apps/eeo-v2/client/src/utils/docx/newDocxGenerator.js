/**
 * NOVÝ DOCX GENERÁTOR - DYNAMICKÉ MAPOVÁNÍ ZE ŠABLONY Z DATABÁZE
 *
 * KLÍČOVÉ ZMĚNY:
 * ✅ Načítá mapování z databáze (mapovani_json)
 * ✅ Žádné hardcoded mapování
 * ✅ Dynamické mapování podle JSON definice ze šablony
 * ✅ Podpora pro sloučení polí (+ operátor)
 */

import JSZip from 'jszip';
import { getDocxOrderEnrichedData } from '../../services/apiDocxOrders';
import { downloadDocxSablonaAsFile, getDocxSablonaDetail } from '../../services/apiv2Dictionaries';

/**
 * Formátuje datum do CZE formátu DD.MM.YYYY (bez mezer za tečkou)
 * @param {string|Date} value - Datum k formátování
 * @returns {string} - Formátované datum nebo původní hodnota
 */
function formatDateForDocx(value) {
  if (!value) return value;

  // Pokud je to už formátované datum ve správném formátu, vrátíme ho
  if (typeof value === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    return value;
  }

  try {
    let date;

    // Pokud je to string, zkus parsovat
    if (typeof value === 'string') {
      // ISO formát (YYYY-MM-DD nebo YYYY-MM-DDTHH:mm:ss)
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        date = new Date(value);
      }
      // DD.MM.YYYY s možnými mezerami
      else if (/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(value)) {
        const parts = value.split('.').map(p => p.trim());
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // měsíce jsou 0-11
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
      // Zkusíme obecné parsování
      else {
        date = new Date(value);
      }
    } else if (value instanceof Date) {
      date = value;
    } else {
      return value; // Není datum, vrátíme původní hodnotu
    }

    // Zkontroluj, jestli je datum validní
    if (isNaN(date.getTime())) {
      return value; // Neplatné datum, vrátíme původní hodnotu
    }

    // Formátuj do DD.MM.YYYY (bez mezer)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;

  } catch (error) {
    // Pokud se něco pokazí, vrátíme původní hodnotu
    return value;
  }
}

/**
 * Formátuje číslo jako měnu (s mezerami jako oddělovači tisíců a 2 desetinná místa)
 * @param {number|string} value - Číslo k formátování
 * @returns {string} - Formátovaná měna (např. "1 234 567.89")
 * 
 * ⚠️ DEPRECATED: Backend teď vrací už naformátované ceny v enriched endpointu
 * Tuto funkci ponecháváme jen pro zpětnou kompatibilitu
 */
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '0.00';

  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';

  // Formátuj na 2 desetinná místa s mezerou jako oddělovačem tisíců
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * ⚠️ DEPRECATED: Backend enriched endpoint už vrací všechny vypočítané hodnoty
 * Tato funkce se NEPOUŽÍVÁ při použití nového enriched endpointu
 * 
 * Ponecháno pouze pro referenci nebo fallback
 */
function addCalculatedVariables_DEPRECATED(apiData, selectedUserId = null) {

  const calculated = { ...apiData };

  // Inicializace kategorie pro vypočítané proměnné
  if (!calculated.vypocitane) {
    calculated.vypocitane = {};
  }

  // 🧮 VÝPOČTY Z POLOŽEK OBJEDNÁVKY
  if (apiData.polozky && Array.isArray(apiData.polozky)) {

    let celkovaCenaBezDph = 0;
    let celkovaCenaSdph = 0;

    apiData.polozky.forEach((polozka, index) => {
      // ⚠️ OPRAVA: Položky mají pole cena_bez_dph a cena_s_dph, NE celkova_cena_*
      const cena = parseFloat(polozka.cena_bez_dph || 0);
      const cenaSdph = parseFloat(polozka.cena_s_dph || 0);

      celkovaCenaBezDph += cena;
      celkovaCenaSdph += cenaSdph;

    });

    const vypocteneDph = celkovaCenaSdph - celkovaCenaBezDph;

    // ✅ Uložení vypočítaných hodnot
    calculated.vypocitane.celkova_cena_bez_dph = formatCurrency(celkovaCenaBezDph);
    calculated.vypocitane.celkova_cena_s_dph = formatCurrency(celkovaCenaSdph);
    calculated.vypocitane.vypoctene_dph = formatCurrency(vypocteneDph);

    // Přidáme i varianty s jednotkami
    calculated.vypocitane.celkova_cena_bez_dph_kc = `${formatCurrency(celkovaCenaBezDph)} Kč`;
    calculated.vypocitane.celkova_cena_s_dph_kc = `${formatCurrency(celkovaCenaSdph)} Kč`;
    calculated.vypocitane.vypoctene_dph_kc = `${formatCurrency(vypocteneDph)} Kč`;

  } else {
    calculated.vypocitane.celkova_cena_bez_dph = '0.00';
    calculated.vypocitane.celkova_cena_s_dph = '0.00';
    calculated.vypocitane.vypoctene_dph = '0.00';
    calculated.vypocitane.celkova_cena_bez_dph_kc = '0.00 Kč';
    calculated.vypocitane.celkova_cena_s_dph_kc = '0.00 Kč';
    calculated.vypocitane.vypoctene_dph_kc = '0.00 Kč';
  }

  // 📅 SPECIÁLNÍ PROMĚNNÉ
  // 👤 UŽIVATEL VYBRANÝ V DIALOGU (pro podpis)
  calculated.vypocitane.vybrany_uzivatel_cele_jmeno = '';
  calculated.vypocitane.vybrany_uzivatel_jmeno = '';
  calculated.vypocitane.vybrany_uzivatel_prijmeni = '';
  calculated.vypocitane.vybrany_uzivatel_titul_pred = '';
  calculated.vypocitane.vybrany_uzivatel_titul_za = '';
  calculated.vypocitane.vybrany_uzivatel_email = '';
  calculated.vypocitane.vybrany_uzivatel_telefon = '';

  if (selectedUserId) {
    // Najdi vybraného uživatele v datech objednávky
    let selectedUser = null;
    
    // ✅ OPRAVA: Zkontroluj všechny možné uživatelské objekty s CORRECT názvy z enriched API
    // ⚠️ POZOR: Enriched API vrací: garant_uzivatel, prikazce_uzivatel, schvalovatel, uzivatel, atd.
    // ⚠️ ID jsou ve formátu: garant_uzivatel_id, prikazce_id, schvalovatel_id, uzivatel_id
    
    if (apiData.garant_uzivatel_id === selectedUserId && apiData.garant_uzivatel) {
      selectedUser = apiData.garant_uzivatel;
    } else if (apiData.prikazce_id === selectedUserId && apiData.prikazce_uzivatel) {
      selectedUser = apiData.prikazce_uzivatel;
    } else if (apiData.schvalovatel_id === selectedUserId && apiData.schvalovatel) {
      selectedUser = apiData.schvalovatel;
    } else if (apiData.uzivatel_id === selectedUserId && apiData.uzivatel) {
      selectedUser = apiData.uzivatel;
    } else if (apiData.dodavatel_potvrdil_id === selectedUserId && apiData.dodavatel_potvrdil) {
      selectedUser = apiData.dodavatel_potvrdil;
    } else if (apiData.odesilatel_id === selectedUserId && apiData.odesilatel) {
      selectedUser = apiData.odesilatel;
    } else if (apiData.fakturant_id === selectedUserId && apiData.fakturant) {
      selectedUser = apiData.fakturant;
    } else if (apiData.potvrdil_vecnou_spravnost_id === selectedUserId && apiData.potvrdil_vecnou_spravnost) {
      selectedUser = apiData.potvrdil_vecnou_spravnost;
    } else if (apiData.dokoncil_id === selectedUserId && apiData.dokoncil) {
      selectedUser = apiData.dokoncil;
    }

    if (selectedUser) {
      
      // ✅ OPRAVA: API vrací 'cele_jmeno' ne 'plne_jmeno'
      calculated.vypocitane.vybrany_uzivatel_cele_jmeno = selectedUser.cele_jmeno || 
        `${selectedUser.titul_pred || ''} ${selectedUser.jmeno || ''} ${selectedUser.prijmeni || ''} ${selectedUser.titul_za || ''}`.replace(/\s+/g, ' ').trim();
      calculated.vypocitane.vybrany_uzivatel_jmeno = selectedUser.jmeno || '';
      calculated.vypocitane.vybrany_uzivatel_prijmeni = selectedUser.prijmeni || '';
      calculated.vypocitane.vybrany_uzivatel_titul_pred = selectedUser.titul_pred || '';
      calculated.vypocitane.vybrany_uzivatel_titul_za = selectedUser.titul_za || '';
      calculated.vypocitane.vybrany_uzivatel_email = selectedUser.email || '';
      calculated.vypocitane.vybrany_uzivatel_telefon = selectedUser.telefon || '';
    }
  }

  // Placeholder pro uživatelsky vybraný text
  calculated.vypocitane.uzivatelem_vybrany_text = '[TEXT_VYBRAN_UŽIVATELEM]';

  // 📊 STATISTIKY
  calculated.vypocitane.pocet_polozek = apiData.polozky?.length || 0;
  calculated.vypocitane.pocet_priloh = apiData.prilohy?.length || 0;

  // 📅 DATUM GENEROVÁNÍ
  const now = new Date();
  calculated.vypocitane.datum_generovani = formatDateForDocx(now);
  calculated.vypocitane.cas_generovani = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  calculated.vypocitane.datum_cas_generovani = `${formatDateForDocx(now)} ${calculated.vypocitane.cas_generovani}`;


  return calculated;
}

/**
 * Hlavní funkce pro generování DOCX dokumentu - KOMPLETNĚ DYNAMICKÁ
 * @param {Object} params - Parametry generování
 * @returns {Promise<Blob>} - Vygenerovaný DOCX soubor
 */
export async function generateDocxDocument({
  templateId,
  orderId,
  token,
  username,
  template,
  selectedUserId = null
  // orderData parametr už NENÍ POTŘEBA - používáme enriched endpoint!
}) {
  try {
    let sablonaData = null;

    // === KROK 0: Načtení detailu šablony z databáze ===

    try {
      const templateDetail = await getDocxSablonaDetail({
        token,
        username,
        id: templateId
      });

      if (!templateDetail || !templateDetail.data) {
        throw new Error('Šablona nenalezena nebo nemá data');
      }

      sablonaData = templateDetail.data;
    } catch (error) {
      console.error('❌ Chyba při načítání detailu šablony:', error);
      throw new Error(`Nepodařilo se načíst šablonu ID ${templateId}: ${error.message}`);
    }

    // === KROK 1: Načtení DOCX šablony ze serveru ===

    const templateFile = await downloadDocxSablonaAsFile({
      token,
      username,
      id: templateId,
      fileName: sablonaData.nazev || 'template.docx'
    });

    // === KROK 2: Rozbalení ZIP struktury ===

    const docxZip = await JSZip.loadAsync(templateFile);

    const documentXml = await docxZip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Neplatná DOCX šablona - chybí document.xml');
    }

    // === KROK 3: Načtení DYNAMICKÉHO MAPOVÁNÍ z databáze ===

    let templateMapping = {};

    const mappingSource = sablonaData.docx_mapping || sablonaData.mapovani_json;

    if (mappingSource) {
      try {
        templateMapping = typeof mappingSource === 'string'
          ? JSON.parse(mappingSource)
          : mappingSource;

      } catch (error) {
        console.error('❌ Chyba při parsování mapovani_json:', error);
        throw new Error(`Neplatné JSON mapování v šabloně: ${error.message}`);
      }
    } else {
      throw new Error('Šablona nemá definované mapování polí (mapovani_json). Nejdříve upravte šablonu a definujte mapování.');
    }

    // === KROK 4: Načtení ENRICHED DAT z nového endpointu ===
    
    // ✅ NOVÝ ENDPOINT: sablona_docx/order-enriched-data
    // Vrací KOMPLETNÍ data včetně enriched uživatelů a vypočítaných hodnot
    const apiData = await getDocxOrderEnrichedData({
      token,
      username,
      objednavka_id: orderId
    });

    if (!apiData) {
      throw new Error('Nepodařilo se získat enriched data z backendu');
    }
    
    // === KROK 4b: Vybraný uživatel pro podpis ===
    if (selectedUserId && apiData.vypocitane) {
      const vybranyUzivatel = apiData.dostupni_uzivatele_pro_podpis?.find(
        u => parseInt(u.id) === parseInt(selectedUserId)
      );
      
      if (vybranyUzivatel) {
        
        // Přidej do vypočítaných hodnot
        apiData.vypocitane.vybrany_uzivatel_cele_jmeno = vybranyUzivatel.cele_jmeno;
        apiData.vypocitane.vybrany_uzivatel_role = vybranyUzivatel.role;
        apiData.vypocitane.vybrany_uzivatel_lokalita = vybranyUzivatel.lokalita_nazev;
      }
    }

    // ⚠️ POZNÁMKA: normalizeApiData() a addCalculatedVariables() už NENÍ POTŘEBA!
    // Backend endpoint vrací data JIŽ NORMALIZOVANÁ a S VYPOČÍTANÝMI HODNOTAMI

    // === KROK 5: DYNAMICKÉ MAPOVÁNÍ polí ===

    const fieldMapping = createFieldMappingForDocx(apiData, templateMapping);

    // === KROK 6: Vyplnění XML dat ===

    let filledXml = fillXmlWithFieldData(documentXml, fieldMapping);

    // === KROK 7: Zabalení zpět do ZIP ===

    docxZip.file('word/document.xml', filledXml);

    const outputBlob = await docxZip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });


    return outputBlob;

  } catch (error) {
    console.error('❌ Chyba při generování DOCX:', error);
    throw error;
  }
}

/**
 * DYNAMICKÉ MAPOVÁNÍ POLÍ - podle JSON definice ze šablony
 * @param {Object} apiData - Data z POST /api.eeo/sablona_docx/order-data
 * @param {Object} templateMapping - JSON mapování ze šablony (mapovani_json)
 * @returns {Object} - Namapovaná pole pro DOCX
 */
function createFieldMappingForDocx(apiData, templateMapping) {

  const mappedData = {};
  const missingFields = [];

  // PROCHÁZÍME MAPOVÁNÍ ZE ŠABLONY - každé pole mapujeme podle definice
  Object.entries(templateMapping).forEach(([docxField, dbPath]) => {
    let value = '';

    try {
      // Zpracování speciálních případů (+ operátor pro sloučení)
      if (typeof dbPath === 'string' && dbPath.includes(' + ')) {
        // Sloučení více polí (např. "objednatel.prijmeni + objednatel.jmeno")
        const parts = dbPath.split(' + ').map(part => part.trim());
        const values = parts.map(part => {
          const v = getValueFromPath(apiData, part) || '';
          // Formátuj datum pokud to vypadá jako datum
          return formatDateForDocx(v);
        }).filter(v => v);
        value = values.join(' ');

      } else {
        // Standardní mapování pomocí tečkové notace
        value = getValueFromPath(apiData, dbPath);

        if (value === undefined || value === null) {
          missingFields.push({ docxField, dbPath });
          value = '';
        } else {
          // Formátuj datum pokud to vypadá jako datum
          value = formatDateForDocx(value);
        }
      }
    } catch (error) {
      value = '';
    }

    mappedData[docxField] = String(value || '');
  });

    templateFieldsCount: Object.keys(templateMapping).length,
    mappedFieldsCount: Object.keys(mappedData).length,
    missingFieldsCount: missingFields.length
  });

  if (missingFields.length > 0) {
  }

  return mappedData;
}

/**
 * ⚠️ DEPRECATED: Backend enriched endpoint už vrací normalizovaná data
 * Tato funkce se NEPOUŽÍVÁ při použití nového enriched endpointu
 * 
 * Ponecháno pouze pro referenci nebo fallback
 */
function normalizeApiData_DEPRECATED(data) {
  if (!data || typeof data !== 'object') return data;


  const normalized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.trim() !== '') {
      // Zkusíme parsovat jako JSON
      try {
        const parsed = JSON.parse(value);
        // Pokud je to objekt nebo array, použijeme parsovanou hodnotu a rekurzivně normalizujeme
        if (typeof parsed === 'object' && parsed !== null) {
          normalized[key] = normalizeApiData_DEPRECATED(parsed);
        } else {
          // Primitiva necháme jako string
          normalized[key] = value;
        }
      } catch {
        // Není platný JSON, ponecháme původní string
        normalized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Rekurzivně normalizujeme vnořené objekty/arrays
      normalized[key] = normalizeApiData_DEPRECATED(value);
    } else {
      // Primitiva (čísla, bool, null) ponecháme
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Získá hodnotu z vnořeného objektu podle cesty
 * Podporuje:
 * - Tečkovou notaci: "objednatel.jmeno" (pro vnořené objekty)
 * - Flat notaci: "dodavatel_kontakt_telefon" (pro flat fields)
 * - Array indexy: "prilohy[0].nazev"
 * - Kombinace: "prilohy[0].nahrano_uzivatel.jmeno"
 */
function getValueFromPath(obj, path) {
  if (!obj || !path) return undefined;

  try {
    // Rozděl cestu na části a zpracuj array indexy
    // Např: "prilohy[0].originalni_nazev_souboru" → ["prilohy", "0", "originalni_nazev_souboru"]
    const parts = path
      .replace(/\[(\d+)\]/g, '.$1') // Převeď [0] na .0
      .split('.')
      .filter(part => part !== ''); // Odstraň prázdné části

    return parts.reduce((current, key) => {
      if (current === undefined || current === null) return undefined;

      // Pokud je klíč číslo, přistupuj jako k array indexu
      if (/^\d+$/.test(key)) {
        const index = parseInt(key, 10);
        return Array.isArray(current) && current[index] !== undefined
          ? current[index]
          : undefined;
      }

      // Jinak přistupuj jako k property objektu
      return current[key];
    }, obj);
  } catch (error) {
    return undefined;
  }
}

/**
 * Naplní XML data - SPRÁVNÝ ALGORITMUS z plugins/processDocx.js
 * Parsuje XML a nahrazuje DOCVARIABLE/MERGEFIELD pole pomocí DOM
 * NEMAPOVANÁ POLE SE ODSTRANÍ Z DOKUMENTU
 */
function fillXmlWithFieldData(xmlContent, fieldValues) {

  try {
    const parser = new window.DOMParser();
    const serializer = new window.XMLSerializer();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

    let replacementCount = 0;
    let removedCount = 0;

    function processNode(node) {
      if (!node || !node.childNodes) return;

      // Najdi všechny <w:r> elementy (runs)
      let runs = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const n = node.childNodes[i];
        if (n.nodeType === 1 && n.localName === 'r') runs.push(n);
      }

      let i = 0;
      while (i < runs.length) {
        let beginIdx = -1, endIdx = -1, fieldName = null, instr = '';

        // Najdi begin fldChar
        for (let j = i; j < runs.length; j++) {
          const r = runs[j];
          for (let k = 0; k < r.childNodes.length; k++) {
            const n = r.childNodes[k];
            if (n.nodeType === 1 && n.localName === 'fldChar') {
              const typ = n.getAttribute('w:fldCharType') || n.getAttribute('fldCharType');
              if (typ === 'begin') {
                beginIdx = j;

                // Najdi instrText a end fldChar
                let foundEnd = false;
                for (let m = j + 1; m < runs.length; m++) {
                  const r2 = runs[m];
                  for (let n2 = 0; n2 < r2.childNodes.length; n2++) {
                    const nInstr = r2.childNodes[n2];
                    if (nInstr.nodeType === 1 && nInstr.localName === 'instrText') {
                      instr += nInstr.textContent;
                    }
                    if (nInstr.nodeType === 1 && nInstr.localName === 'fldChar') {
                      const typ2 = nInstr.getAttribute('w:fldCharType') || nInstr.getAttribute('fldCharType');
                      if (typ2 === 'end') {
                        endIdx = m;
                        foundEnd = true;
                        break;
                      }
                    }
                  }
                  if (foundEnd) break;
                }

                // Parsuj název pole z instrText
                const m = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_._ ]{1,})/i.exec(instr.replace(/\s+/g, ' '));
                if (m) {
                  fieldName = m[2].replace(/\s+/g, '');
                }
                break;
              }
            }
          }
          if (beginIdx !== -1) break;
        }

        // Pokud máme kompletní pole (begin...end)
        if (beginIdx !== -1 && endIdx !== -1 && fieldName) {
          const val = fieldValues[fieldName];

          // KONTROLA: Pokud pole NENÍ v mapování, ODSTRANÍME ho
          if (!(fieldName in fieldValues)) {

            // Smaž všechny runs včetně begin a end
            for (let del = endIdx; del >= beginIdx; del--) {
              node.removeChild(runs[del]);
            }

            // Refresh seznam runs
            runs = Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === 'r');
            i = 0;
            removedCount++;
            continue;
          }

          // Pokud máme hodnotu (i když je prázdná), vyplníme ji
          if (val !== undefined && val !== null) {

            // Nahraď první run hodnotou
            const firstR = runs[beginIdx];
            while (firstR.firstChild) firstR.removeChild(firstR.firstChild);
            const tNew = xmlDoc.createElementNS(firstR.namespaceURI, 'w:t');
            tNew.textContent = String(val);
            firstR.appendChild(tNew);

            // Smaž všechny runs mezi begin a end
            for (let del = endIdx; del > beginIdx; del--) {
              node.removeChild(runs[del]);
            }

            // Refresh seznam runs
            runs = Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === 'r');
            i = 0;
            replacementCount++;
            continue;
          }
        }

        i++;
      }

      // Rekurzivně zpracuj child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }
    }

    processNode(xmlDoc.documentElement);

    return serializer.serializeToString(xmlDoc);

  } catch (error) {
    console.error('❌ Chyba při DOM parsování XML:', error);

    // Fallback - jednoduchý string replace pro {FIELD_NAME}
    let filledXml = xmlContent;
    Object.entries(fieldValues).forEach(([fieldName, value]) => {
      const pattern = `{${fieldName}}`;
      if (filledXml.includes(pattern)) {
        filledXml = filledXml.replace(new RegExp(escapeRegExp(pattern), 'g'), String(value || ''));
      }
    });

    return filledXml;
  }
}

/**
 * Escape regex special characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stáhne vygenerovaný DOCX soubor
 */
export function downloadGeneratedDocx(docxBlob, fileName) {
  const url = window.URL.createObjectURL(docxBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
