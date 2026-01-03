
/**
 * DOCX Processor - Utility pro zpracování DOCX souborů
 * Extrakce programových polí z DOCX jako XML
 * @date 2025-10-21
 */

import JSZip from 'jszip';

/**
 * Extraktuje programová pole z DOCX souboru
 * @param {File} file - DOCX soubor
 * @returns {Promise<Object>} - Objekt s nalezenými poli a metadaty
 */
export const extractDocxFields = async (file) => {
  try {
    const zipContent = await JSZip.loadAsync(file);

    // Získáme document.xml (hlavní obsah)
    const documentXml = await zipContent.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Neplatný DOCX soubor - chybí document.xml');
    }

    // Získáme app.xml (metadata aplikace)
    const appXml = await zipContent.file('docProps/app.xml')?.async('text');

    // Získáme core.xml (základní metadata)
    const coreXml = await zipContent.file('docProps/core.xml')?.async('text');

    // Extrakce programových polí
    const fields = extractFieldsFromXml(documentXml);

    // Extrakce metadat
    const metadata = extractMetadata(appXml, coreXml);

    return {
      success: true,
      fields,
      metadata,
      documentXml,
      fileName: file.name,
      fileSize: file.size,
      lastModified: new Date(file.lastModified)
    };

  } catch (error) {
    console.error('Chyba při zpracování DOCX:', error);
    return {
      success: false,
      error: error.message,
      fields: [],
      metadata: {}
    };
  }
};

/**
 * Extraktuje programová pole z XML obsahu dokumentu
 * Hledá různé typy polí: DOCVARIABLE, merge fields, bookmarks, content controls
 */
const extractFieldsFromXml = (documentXml) => {
  const fields = [];

  try {
    // 1. DOCVARIABLE Fields (nejčastější typ v našich šablonách)
    // Vzor: DOCVARIABLE "nazev_pole" \* MERGEFORMAT
    // Vzor: DOCVARIABLE nazev_pole
    // Vzor: DOCVARIABLE  nazev_pole  \* MERGEFORMAT
    // Vzor: DOCVARIABLE |DOCX.DTELEFON (s pipe a tečkou)
    // Rozšířený regex - zachytí i speciální znaky: | . - /
    const docVariableRegex = /DOCVARIABLE\s+(?:"([^"]+)"|([A-Z0-9_|.\-/]+))(?:\s+\\[^}]*)?/gi;
    let match;
    while ((match = docVariableRegex.exec(documentXml)) !== null) {
      const fieldName = match[1] || match[2]; // První skupina (s uvozovkami) nebo druhá (bez uvozovek)
      if (fieldName) {
        fields.push({
          type: 'docvariable',
          name: fieldName,
          fullMatch: match[0],
          position: match.index
        });
      }
    }

    // 1b. Rozložené DOCVARIABLE fields (může být rozdělené přes více XML uzlů)
    // Hledáme <w:instrText> obsahující DOCVARIABLE
    const instrTextRegex = /<w:instrText[^>]*>([^<]*DOCVARIABLE[^<]*)<\/w:instrText>/gi;
    while ((match = instrTextRegex.exec(documentXml)) !== null) {
      const instrContent = match[1];
      // Extrahuj název pole z instrText obsahu - rozšířený regex pro | . - /
      const fieldMatch = instrContent.match(/DOCVARIABLE\s+(?:"([^"]+)"|([A-Z0-9_|.\-/]+))/i);
      if (fieldMatch) {
        const fieldName = fieldMatch[1] || fieldMatch[2];
        if (fieldName && !fields.some(f => f.name === fieldName && f.type === 'docvariable')) {
          fields.push({
            type: 'docvariable',
            name: fieldName,
            fullMatch: match[0],
            position: match.index,
            source: 'instrText'
          });
        }
      }
    }

    // 1c. ✅ FRAGMENTOVANÉ FIELDY - DOCVARIABLE a název pole v různých <w:instrText> uzlech
    // Příklad: <w:instrText> DOCVARIABLE </w:instrText>...<w:instrText>DTELEFON</w:instrText>
    // Najdeme všechny <w:p> bloky a v nich spojíme všechny <w:instrText>
    const pRegex = /<w:p[\s\S]*?<\/w:p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(documentXml)) !== null) {
      const pXml = pMatch[0];

      // Najdi všechny <w:instrText> v rámci tohoto <w:p>
      const instrTexts = [];
      const instrRegex = /<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/gi;
      let instrMatch;
      while ((instrMatch = instrRegex.exec(pXml)) !== null) {
        instrTexts.push(instrMatch[1]);
      }

      if (instrTexts.length > 0) {
        // Spoj všechny instrText dohromady (Word často rozděluje fieldy)
        const combinedInstr = instrTexts.join('').replace(/\s+/g, ' ').trim();

        // Hledej DOCVARIABLE/MERGEFIELD s názvy polí
        const fieldRegex = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_|.\-/]+)/gi;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(combinedInstr)) !== null) {
          const fieldName = fieldMatch[2].replace(/\s+/g, ''); // ✅ OPRAVA: Bez .toUpperCase() aby se zachoval původní název

          // Přidej pouze pokud ještě neexistuje
          if (fieldName && !fields.some(f => f.name === fieldName && f.type === 'docvariable')) {
            fields.push({
              type: 'docvariable',
              name: fieldName,
              fullMatch: fieldMatch[0],
              position: pMatch.index,
              source: 'fragmentedInstrText'
            });
          }
        }
      }
    }

    // 2. Merge Fields (klassické Word merge fields)
    // Rozšířený regex - zachytí i speciální znaky: | . - /
    const mergeFieldRegex = /MERGEFIELD\s+([A-Z0-9_|.\-/]+)(?:\s+\\[^}]*)?/gi;
    while ((match = mergeFieldRegex.exec(documentXml)) !== null) {
      fields.push({
        type: 'mergefield',
        name: match[1],
        fullMatch: match[0],
        position: match.index
      });
    }

    // 3. Bookmarks (záložky)
    const bookmarkRegex = /<w:bookmarkStart[^>]*w:name="([^"]+)"/gi;
    while ((match = bookmarkRegex.exec(documentXml)) !== null) {
      fields.push({
        type: 'bookmark',
        name: match[1],
        fullMatch: match[0],
        position: match.index
      });
    }

    // 4. Content Controls (strukturované dokumentové tagy)
    const contentControlRegex = /<w:tag[^>]*w:val="([^"]+)"/gi;
    while ((match = contentControlRegex.exec(documentXml)) !== null) {
      fields.push({
        type: 'contentcontrol',
        name: match[1],
        fullMatch: match[0],
        position: match.index
      });
    }

    // 5. Custom XML parts (pokud jsou k dispozici)
    const customFieldRegex = /\{\{(\w+)\}\}/gi;
    while ((match = customFieldRegex.exec(documentXml)) !== null) {
      fields.push({
        type: 'custom',
        name: match[1],
        fullMatch: match[0],
        position: match.index
      });
    }

    // ✅ ODSTRANĚNÍ FRAGMENTOVANÝCH ČÁSTÍ
    // Pokud máme TERMIN_D i TERMIN_DODANI, odstraníme TERMIN_D (je to fragment)
    // Najdeme všechna fragmentovaná pole (source: 'fragmentedInstrText')
    const fragmentedFieldNames = fields
      .filter(f => f.source === 'fragmentedInstrText')
      .map(f => f.name);

    // Odfiltrujeme pole, která jsou prefixem fragmentovaných polí
    const filteredFields = fields.filter(field => {
      // Pokud je to samo fragmentované pole, necháme ho
      if (field.source === 'fragmentedInstrText') {
        return true;
      }
      
      // Zkontrolujeme, zda není prefix nějakého fragmentovaného pole
      const isFragmentOfLongerField = fragmentedFieldNames.some(fragName => 
        fragName.startsWith(field.name) && fragName !== field.name
      );
      
      // Ponecháme jen pole, které NEJSOU fragmenty
      return !isFragmentOfLongerField;
    });

    // ✅ Počítání výskytů jednotlivých polí (místo odstranění duplicit)
    // Vytvoříme mapu: název_pole -> počet výskytů
    const fieldCounts = {};
    filteredFields.forEach(field => {
      const key = `${field.name}|${field.type}`;
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    });

    // Vytvoříme unikátní seznam polí s počtem výskytů (1:1 case-sensitive)
    const uniqueFields = filteredFields.reduce((acc, field) => {
      const existing = acc.find(f =>
        f.name === field.name &&
        f.type === field.type
      );
      if (!existing) {
        const key = `${field.name}|${field.type}`;
        acc.push({
          ...field,
          count: fieldCounts[key] // ✅ Přidáme počet výskytů
        });
      }
      return acc;
    }, []);

    return uniqueFields.sort((a, b) => a.name.localeCompare(b.name));

  } catch (error) {
    console.error('Chyba při extrakci polí:', error);
    return [];
  }
};

/**
 * Extraktuje metadata z DOCX souboru
 */
const extractMetadata = (appXml, coreXml) => {
  const metadata = {};

  try {
    if (appXml) {
      // Extrakce z app.xml
      const appData = extractXmlValue(appXml, 'Application') || 'Unknown';
      const appVersion = extractXmlValue(appXml, 'AppVersion') || 'Unknown';
      const totalTime = extractXmlValue(appXml, 'TotalTime') || '0';

      metadata.application = appData;
      metadata.appVersion = appVersion;
      metadata.totalEditTime = totalTime;
    }

    if (coreXml) {
      // Extrakce z core.xml
      const title = extractXmlValue(coreXml, 'title');
      const creator = extractXmlValue(coreXml, 'creator');
      const created = extractXmlValue(coreXml, 'created');
      const modified = extractXmlValue(coreXml, 'modified');

      metadata.title = title;
      metadata.creator = creator;
      metadata.created = created;
      metadata.modified = modified;
    }

    return metadata;

  } catch (error) {
    console.error('Chyba při extrakci metadat:', error);
    return {};
  }
};

/**
 * Pomocná funkce pro extrakci hodnoty z XML
 */
const extractXmlValue = (xml, tagName) => {
  try {
    const regex = new RegExp(`<[^:]*:${tagName}[^>]*>([^<]*)<\/[^:]*:${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Databázová pole podle skutečné API response z /api.eeo/sablona_docx/order-data
 * AKTUALIZOVÁNO 22.10.2025 - PŘESNÉ DB NÁZVY SLOUPCŮ
 * Label: První řádek popis, druhý řádek {db_pole} typ
 */
export const getOrderFieldsForMapping = () => {
  return [
    // ⭐ NOVÁ SEKCE: Datumová pole workflow (samostatná sekce pro lepší přehlednost)
    {
      group: '📅 Datumová pole workflow',
      fields: [
        { key: 'dt_vytvoreni', label: 'Datum vytvoření objednávky\n{dt_vytvoreni}', type: 'datetime', example: '2025-01-10 14:30:00' },
        { key: 'dt_aktualizace', label: 'Datum poslední aktualizace\n{dt_aktualizace}', type: 'datetime', example: '2025-01-14 16:45:00' },
        { key: 'dt_objednavky', label: 'Datum objednávky\n{dt_objednavky}', type: 'datetime', example: '2025-01-15 10:30:00' },
        { key: 'dt_schvaleni', label: 'Datum schválení\n{dt_schvaleni}', type: 'datetime', example: '2025-01-12 10:00:00' },
        { key: 'dt_odeslani', label: 'Datum odeslání dodavateli\n{dt_odeslani}', type: 'datetime', example: '2025-01-13 15:00:00' },
        { key: 'dt_akceptace', label: 'Datum akceptace dodavatelem\n{dt_akceptace}', type: 'datetime', example: '2025-01-14 09:30:00' },
        { key: 'dt_zverejneni', label: 'Datum zveřejnění\n{dt_zverejneni}', type: 'datetime', example: '2025-01-20 12:00:00' },
        { key: 'dt_predpokladany_termin_dodani', label: 'Předpokládaný termín dodání\n{dt_predpokladany_termin_dodani}', type: 'date', example: '2025-02-15' }
      ]
    },

    // ✅ Základní údaje (klíčové pole objednávky BEZ datumů)
    {
      group: 'Základní údaje',
      fields: [
        { key: 'cislo_objednavky', label: 'Číslo objednávky\n{cislo_objednavky}', type: 'string', example: '2025-123' },
        { key: 'predmet', label: 'Předmět objednávky\n{predmet}', type: 'string', example: 'Předmět objednávky' },
        { key: 'strediska_kod', label: 'Kódy středisek\n{strediska_kod}', type: 'string', example: 'IT001,FIN002,ADM003' },
        { key: 'max_cena_s_dph', label: 'Max. cena s DPH\n{max_cena_s_dph}', type: 'currency', example: '250000.50' },
        { key: 'financovani', label: 'Financování (text)\n{financovani}', type: 'string', example: 'Rozpočet 2025' },
        { key: 'druh_objednavky_kod', label: 'Druh objednávky (kód)\n{druh_objednavky_kod}', type: 'string', example: 'STANDARD' },
        { key: 'schvaleni_komentar', label: 'Komentář schválení\n{schvaleni_komentar}', type: 'text', example: 'Objednávka schválena' },
        { key: 'misto_dodani', label: 'Místo dodání\n{misto_dodani}', type: 'string', example: 'Místo dodání' },
        { key: 'zaruka', label: 'Záruka\n{zaruka}', type: 'string', example: '24 měsíců' },
        { key: 'poznamka', label: 'Poznámka\n{poznamka}', type: 'text', example: 'Poznámka k objednávce' }
      ]
    },

    // Financování (vnořený objekt)
    {
      group: 'Financování',
      fields: [
        { key: 'financovani.typ', label: 'Typ financování\n{financovani.typ}', type: 'string', example: 'LP' },
        { key: 'financovani.nazev', label: 'Název financování\n{financovani.nazev}', type: 'string', example: 'Leasing Plus' },
        { key: 'financovani.nazev_stavu', label: 'Název stavu financování\n{financovani.nazev_stavu}', type: 'string', example: 'Limitovaný příslib' },
        { key: 'financovani.kod', label: 'Kód financování\n{financovani.kod}', type: 'string', example: 'LP001' },
        { key: 'financovani.kod_stavu', label: 'Kód stavu financování\n{financovani.kod_stavu}', type: 'string', example: 'LP' }
      ]
    },

    // Objednávka - rozšířené informace (přesné DB názvy z 25a_objednavky)
    {
      group: 'Objednávka - detail',
      fields: [
        { key: 'cislo_objednavky', label: 'Číslo objednávky\n{cislo_objednavky}', type: 'string', example: '2025-123' },
        { key: 'dt_objednavky', label: 'Datum objednávky\n{dt_objednavky}', type: 'datetime', example: '2025-01-15 10:30:00' },
        { key: 'predmet', label: 'Předmět objednávky\n{predmet}', type: 'string', example: 'Předmět objednávky' },
        { key: 'strediska_kod', label: 'Kódy středisek\n{strediska_kod}', type: 'string', example: 'IT001,FIN002,ADM003' },
        { key: 'max_cena_s_dph', label: 'Max. cena s DPH\n{max_cena_s_dph}', type: 'currency', example: '250000.50' },
        { key: 'financovani', label: 'Financování\n{financovani}', type: 'string', example: 'Rozpočet 2025' },
        { key: 'druh_objednavky_kod', label: 'Druh objednávky (kód)\n{druh_objednavky_kod}', type: 'string', example: 'STANDARD' },
        { key: 'dt_schvaleni', label: 'Datum schválení\n{dt_schvaleni}', type: 'datetime', example: '2025-01-12 10:00:00' },
        { key: 'schvaleni_komentar', label: 'Komentář schválení\n{schvaleni_komentar}', type: 'text', example: 'Objednávka schválena' },
        { key: 'dt_predpokladany_termin_dodani', label: 'Předpokládaný termín dodání\n{dt_predpokladany_termin_dodani}', type: 'date', example: '2025-02-15' },
        { key: 'misto_dodani', label: 'Místo dodání\n{misto_dodani}', type: 'string', example: 'Místo dodání' },
        { key: 'zaruka', label: 'Záruka\n{zaruka}', type: 'string', example: '24 měsíců' },
        { key: 'poznamka', label: 'Poznámka\n{poznamka}', type: 'text', example: 'Poznámka k objednávce' },
        { key: 'dt_vytvoreni', label: 'Datum vytvoření\n{dt_vytvoreni}', type: 'datetime', example: '2025-01-10 14:30:00' },
        { key: 'dt_aktualizace', label: 'Datum aktualizace\n{dt_aktualizace}', type: 'datetime', example: '2025-01-14 16:45:00' }
      ]
    },

    // Stavy a workflow (přesné DB názvy)
    {
      group: 'Stavy',
      fields: [
        { key: 'stav_workflow_kod', label: 'Kód workflow stavu\n{stav_workflow_kod}', type: 'string', example: 'ODESLANO_DODAVATELI' },
        { key: 'stav_objednavky', label: 'Název stavu\n{stav_objednavky}', type: 'string', example: 'Odesláno dodavateli' },
        { key: 'dt_odeslani', label: 'Datum odeslání\n{dt_odeslani}', type: 'datetime', example: '2025-01-13 15:00:00' },
        { key: 'dodavatel_zpusob_potvrzeni', label: 'Způsob potvrzení\n{dodavatel_zpusob_potvrzeni}', type: 'string', example: 'email,form' },
        { key: 'dt_akceptace', label: 'Datum akceptace\n{dt_akceptace}', type: 'datetime', example: '2025-01-14 09:30:00' },
        { key: 'dt_zverejneni', label: 'Datum zveřejnění\n{dt_zverejneni}', type: 'datetime', example: '2025-01-20 12:00:00' },
        { key: 'registr_iddt', label: 'Registr IDDT\n{registr_iddt}', type: 'string', example: 'REG-2025-001' }
      ]
    },

    // Objednatel
    {
      group: 'Objednatel',
      fields: [
        { key: 'objednatel.username', label: 'Username objednatele\n{objednatel.username}', type: 'string', example: 'jan.novak' },
        { key: 'objednatel.titul_pred', label: 'Titul před jménem\n{objednatel.titul_pred}', type: 'string', example: 'Ing.' },
        { key: 'objednatel.jmeno', label: 'Jméno objednatele\n{objednatel.jmeno}', type: 'string', example: 'Jan' },
        { key: 'objednatel.prijmeni', label: 'Příjmení objednatele\n{objednatel.prijmeni}', type: 'string', example: 'Novák' },
        { key: 'objednatel.titul_za', label: 'Titul za jménem\n{objednatel.titul_za}', type: 'string', example: 'Ph.D.' },
        { key: 'objednatel.email', label: 'Email objednatele\n{objednatel.email}', type: 'string', example: 'jan.novak@firma.cz' },
        { key: 'objednatel.telefon', label: 'Telefon objednatele\n{objednatel.telefon}', type: 'string', example: '+420 123 456 789' },
        { key: 'objednatel.cele_jmeno', label: 'Celé jméno objednatele\n{objednatel.cele_jmeno}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'objednatel.plne_jmeno', label: 'Plné jméno objednatele (alias)\n{objednatel.plne_jmeno}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'objednatel.lokalita.nazev', label: 'Lokalita objednatele\n{objednatel.lokalita.nazev}', type: 'string', example: 'Praha' }
      ]
    },

    // Garant
    {
      group: 'Garant',
      fields: [
        { key: 'garant.username', label: 'Username garanta\n{garant.username}', type: 'string', example: 'marie.svoboda' },
        { key: 'garant.titul_pred', label: 'Titul před jménem\n{garant.titul_pred}', type: 'string', example: '' },
        { key: 'garant.jmeno', label: 'Jméno garanta\n{garant.jmeno}', type: 'string', example: 'Marie' },
        { key: 'garant.prijmeni', label: 'Příjmení garanta\n{garant.prijmeni}', type: 'string', example: 'Svobodová' },
        { key: 'garant.titul_za', label: 'Titul za jménem\n{garant.titul_za}', type: 'string', example: '' },
        { key: 'garant.email', label: 'Email garanta\n{garant.email}', type: 'string', example: 'marie.svoboda@firma.cz' },
        { key: 'garant.telefon', label: 'Telefon garanta\n{garant.telefon}', type: 'string', example: '+420 987 654 321' },
        { key: 'garant.cele_jmeno', label: 'Celé jméno garanta\n{garant.cele_jmeno}', type: 'string', example: 'Marie Svobodová' },
        { key: 'garant.plne_jmeno', label: 'Plné jméno garanta (alias)\n{garant.plne_jmeno}', type: 'string', example: 'Marie Svobodová' },
        { key: 'garant.lokalita.nazev', label: 'Lokalita garanta\n{garant.lokalita.nazev}', type: 'string', example: 'Praha' }
      ]
    },

    // Uživatel (kdo vytvořil) - ZMĚNA z created_by na uzivatel
    {
      group: 'Uživatel (vytvořil)',
      fields: [
        { key: 'uzivatel.username', label: 'Username tvůrce\n{uzivatel.username}', type: 'string', example: 'jan.novak' },
        { key: 'uzivatel.titul_pred', label: 'Titul před jménem\n{uzivatel.titul_pred}', type: 'string', example: 'Ing.' },
        { key: 'uzivatel.jmeno', label: 'Jméno tvůrce\n{uzivatel.jmeno}', type: 'string', example: 'Jan' },
        { key: 'uzivatel.prijmeni', label: 'Příjmení tvůrce\n{uzivatel.prijmeni}', type: 'string', example: 'Novák' },
        { key: 'uzivatel.titul_za', label: 'Titul za jménem\n{uzivatel.titul_za}', type: 'string', example: 'Ph.D.' },
        { key: 'uzivatel.email', label: 'Email tvůrce\n{uzivatel.email}', type: 'string', example: 'jan.novak@firma.cz' },
        { key: 'uzivatel.telefon', label: 'Telefon tvůrce\n{uzivatel.telefon}', type: 'string', example: '+420 123 456 789' },
        { key: 'uzivatel.cele_jmeno', label: 'Celé jméno tvůrce\n{uzivatel.cele_jmeno}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'uzivatel.plne_jmeno', label: 'Plné jméno tvůrce (alias)\n{uzivatel.plne_jmeno}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'uzivatel.lokalita.nazev', label: 'Lokalita tvůrce\n{uzivatel.lokalita.nazev}', type: 'string', example: 'Praha' }
      ]
    },

    // Schvalovatel (schválil) - ZMĚNA z schvalil na schvalovatel
    {
      group: 'Schvalovatel',
      fields: [
        { key: 'schvalovatel.username', label: 'Username schvalovatele\n{schvalovatel.username}', type: 'string', example: 'admin' },
        { key: 'schvalovatel.titul_pred', label: 'Titul před jménem\n{schvalovatel.titul_pred}', type: 'string', example: 'Mgr.' },
        { key: 'schvalovatel.jmeno', label: 'Jméno schvalovatele\n{schvalovatel.jmeno}', type: 'string', example: 'Petr' },
        { key: 'schvalovatel.prijmeni', label: 'Příjmení schvalovatele\n{schvalovatel.prijmeni}', type: 'string', example: 'Ředitel' },
        { key: 'schvalovatel.titul_za', label: 'Titul za jménem\n{schvalovatel.titul_za}', type: 'string', example: 'MBA' },
        { key: 'schvalovatel.email', label: 'Email schvalovatele\n{schvalovatel.email}', type: 'string', example: 'reditel@firma.cz' },
        { key: 'schvalovatel.telefon', label: 'Telefon schvalovatele\n{schvalovatel.telefon}', type: 'string', example: '+420 111 222 333' },
        { key: 'schvalovatel.cele_jmeno', label: 'Celé jméno schvalovatele\n{schvalovatel.cele_jmeno}', type: 'string', example: 'Mgr. Petr Ředitel MBA' },
        { key: 'schvalovatel.plne_jmeno', label: 'Plné jméno schvalovatele (alias)\n{schvalovatel.plne_jmeno}', type: 'string', example: 'Mgr. Petr Ředitel MBA' },
        { key: 'schvalovatel.lokalita.nazev', label: 'Lokalita schvalovatele\n{schvalovatel.lokalita.nazev}', type: 'string', example: 'Praha' }
      ]
    },

    // Příkazce
    {
      group: 'Příkazce',
      fields: [
        { key: 'prikazce.username', label: 'Username příkazce\n{prikazce.username}', type: 'string', example: 'pavel.prikazce' },
        { key: 'prikazce.titul_pred', label: 'Titul před jménem\n{prikazce.titul_pred}', type: 'string', example: 'Bc.' },
        { key: 'prikazce.jmeno', label: 'Jméno příkazce\n{prikazce.jmeno}', type: 'string', example: 'Pavel' },
        { key: 'prikazce.prijmeni', label: 'Příjmení příkazce\n{prikazce.prijmeni}', type: 'string', example: 'Příkazce' },
        { key: 'prikazce.titul_za', label: 'Titul za jménem\n{prikazce.titul_za}', type: 'string', example: '' },
        { key: 'prikazce.email', label: 'Email příkazce\n{prikazce.email}', type: 'string', example: 'pavel.prikazce@firma.cz' },
        { key: 'prikazce.telefon', label: 'Telefon příkazce\n{prikazce.telefon}', type: 'string', example: '+420 444 555 666' },
        { key: 'prikazce.cele_jmeno', label: 'Celé jméno příkazce\n{prikazce.cele_jmeno}', type: 'string', example: 'Bc. Pavel Příkazce' },
        { key: 'prikazce.plne_jmeno', label: 'Plné jméno příkazce (alias)\n{prikazce.plne_jmeno}', type: 'string', example: 'Bc. Pavel Příkazce' },
        { key: 'prikazce.lokalita.nazev', label: 'Lokalita příkazce\n{prikazce.lokalita.nazev}', type: 'string', example: 'Praha' }
      ]
    },

    // Vypočítané hodnoty (z vypocitane objektu)
    {
      group: '🧮 Vypočítané hodnoty',
      fields: [
        { key: 'vypocitane.celkova_cena_bez_dph', label: 'Celková cena bez DPH\n{vypocitane.celkova_cena_bez_dph}', type: 'currency', example: '8264.46' },
        { key: 'vypocitane.celkova_cena_s_dph', label: 'Celková cena s DPH\n{vypocitane.celkova_cena_s_dph}', type: 'currency', example: '10000.00' },
        { key: 'vypocitane.vypoctene_dph', label: 'Vypočtené DPH\n{vypocitane.vypoctene_dph}', type: 'currency', example: '1735.54' },
        { key: 'vypocitane.celkova_cena_bez_dph_kc', label: 'Celková cena bez DPH (s Kč)\n{vypocitane.celkova_cena_bez_dph_kc}', type: 'string', example: '8 264.46 Kč' },
        { key: 'vypocitane.celkova_cena_s_dph_kc', label: 'Celková cena s DPH (s Kč)\n{vypocitane.celkova_cena_s_dph_kc}', type: 'string', example: '10 000.00 Kč' },
        { key: 'vypocitane.vypoctene_dph_kc', label: 'Vypočtené DPH (s Kč)\n{vypocitane.vypoctene_dph_kc}', type: 'string', example: '1 735.54 Kč' },
        { key: 'vypocitane.pocet_polozek', label: 'Počet položek\n{vypocitane.pocet_polozek}', type: 'number', example: '5' },
        { key: 'vypocitane.pocet_priloh', label: 'Počet příloh\n{vypocitane.pocet_priloh}', type: 'number', example: '3' },
        { key: 'vypocitane.datum_generovani', label: 'Datum generování\n{vypocitane.datum_generovani}', type: 'date', example: '24.11.2025' },
        { key: 'vypocitane.cas_generovani', label: 'Čas generování\n{vypocitane.cas_generovani}', type: 'time', example: '14:30' },
        { key: 'vypocitane.datum_cas_generovani', label: 'Datum a čas generování\n{vypocitane.datum_cas_generovani}', type: 'datetime', example: '24.11.2025 14:30' },
        // Kombinace jmen
        { key: 'vypocitane.garant_jmeno_prijmeni', label: 'Garant - Jméno Příjmení\n{vypocitane.garant_jmeno_prijmeni}', type: 'string', example: 'Jan Novák' },
        { key: 'vypocitane.garant_prijmeni_jmeno', label: 'Garant - Příjmení Jméno\n{vypocitane.garant_prijmeni_jmeno}', type: 'string', example: 'Novák Jan' },
        { key: 'vypocitane.garant_cele_jmeno_s_tituly', label: 'Garant - s tituly\n{vypocitane.garant_cele_jmeno_s_tituly}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'vypocitane.prikazce_jmeno_prijmeni', label: 'Příkazce - Jméno Příjmení\n{vypocitane.prikazce_jmeno_prijmeni}', type: 'string', example: 'Marie Svobodová' },
        { key: 'vypocitane.prikazce_prijmeni_jmeno', label: 'Příkazce - Příjmení Jméno\n{vypocitane.prikazce_prijmeni_jmeno}', type: 'string', example: 'Svobodová Marie' },
        { key: 'vypocitane.schvalovatel_jmeno_prijmeni', label: 'Schvalovatel - Jméno Příjmení\n{vypocitane.schvalovatel_jmeno_prijmeni}', type: 'string', example: 'Petr Dvořák' },
        { key: 'vypocitane.objednatel_jmeno_prijmeni', label: 'Objednatel - Jméno Příjmení\n{vypocitane.objednatel_jmeno_prijmeni}', type: 'string', example: 'Anna Nováková' }
      ]
    },

    // Dodavatel (ploché pole s prefixem dodavatel_ - podle BE response)
    {
      group: 'Dodavatel',
      fields: [
        { key: 'dodavatel_nazev', label: 'Název dodavatele\n{dodavatel_nazev}', type: 'string', example: 'DODAVATEL s.r.o.' },
        { key: 'dodavatel_adresa', label: 'Adresa dodavatele\n{dodavatel_adresa}', type: 'string', example: 'Obchodní 123, 110 00 Praha 1' },
        { key: 'dodavatel_ico', label: 'IČO dodavatele\n{dodavatel_ico}', type: 'string', example: '12345678' },
        { key: 'dodavatel_dic', label: 'DIČ dodavatele\n{dodavatel_dic}', type: 'string', example: 'CZ12345678' }
      ]
    },

    // Položky (array - podle BE response)
    {
      group: 'Položky',
      fields: [
        { key: 'polozky', label: 'Všechny položky (array)\n{polozky}', type: 'array', example: '[{id,popis,cena_bez_dph,sazba_dph,cena_s_dph}]' },
        { key: 'polozky[0].id', label: 'První položka - ID\n{polozky[0].id}', type: 'number', example: '1' },
        { key: 'polozky[0].popis', label: 'První položka - popis\n{polozky[0].popis}', type: 'string', example: 'Kancelářský stůl 120x80 cm' },
        { key: 'polozky[0].cena_bez_dph', label: 'První položka - cena bez DPH\n{polozky[0].cena_bez_dph}', type: 'currency', example: '8264.46' },
        { key: 'polozky[0].sazba_dph', label: 'První položka - sazba DPH\n{polozky[0].sazba_dph}', type: 'number', example: '21' },
        { key: 'polozky[0].cena_s_dph', label: 'První položka - cena s DPH\n{polozky[0].cena_s_dph}', type: 'currency', example: '10000.00' }
      ]
    },

    // Přílohy (array - podle BE response)
    {
      group: 'Přílohy',
      fields: [
        { key: 'prilohy', label: 'Všechny přílohy (array)\n{prilohy}', type: 'array', example: '[{id,originalni_nazev_souboru,velikost_souboru_b,...}]' },
        { key: 'prilohy[0].id', label: 'První příloha - ID\n{prilohy[0].id}', type: 'number', example: '1' },
        { key: 'prilohy[0].originalni_nazev_souboru', label: 'První příloha - název\n{prilohy[0].originalni_nazev_souboru}', type: 'string', example: 'Specifikace_objednavky.pdf' },
        { key: 'prilohy[0].velikost_souboru_b', label: 'První příloha - velikost\n{prilohy[0].velikost_souboru_b}', type: 'number', example: '245760' },
        { key: 'prilohy[0].typ_prilohy', label: 'První příloha - typ\n{prilohy[0].typ_prilohy}', type: 'string', example: 'specifikace' },
        { key: 'prilohy[0].dt_vytvoreni', label: 'První příloha - datum vytvoření\n{prilohy[0].dt_vytvoreni}', type: 'datetime', example: '2025-01-10 15:00:00' },
        { key: 'prilohy[0].nahrano_uzivatel.username', label: 'První příloha - nahrál username\n{prilohy[0].nahrano_uzivatel.username}', type: 'string', example: 'jan.novak' },
        { key: 'prilohy[0].nahrano_uzivatel.jmeno', label: 'První příloha - nahrál jméno\n{prilohy[0].nahrano_uzivatel.jmeno}', type: 'string', example: 'Jan' },
        { key: 'prilohy[0].nahrano_uzivatel.prijmeni', label: 'První příloha - nahrál příjmení\n{prilohy[0].nahrano_uzivatel.prijmeni}', type: 'string', example: 'Novák' }
      ]
    },

    // Faktury (array - podle tabulky 25a_objednavky_faktury)
    {
      group: 'Faktury',
      fields: [
        { key: 'faktury', label: 'Všechny faktury (array)\n{faktury}', type: 'array', example: '[{id,fa_cislo_vema,fa_datum_vystaveni,fa_castka,...}]' },
        { key: 'faktury[0].id', label: 'První faktura - ID\n{faktury[0].id}', type: 'number', example: '1' },
        { key: 'faktury[0].fa_cislo_vema', label: 'První faktura - číslo Fa/VPD\n{faktury[0].fa_cislo_vema}', type: 'string', example: 'FA-2025-001' },
        { key: 'faktury[0].fa_datum_vystaveni', label: 'První faktura - datum vystavení\n{faktury[0].fa_datum_vystaveni}', type: 'date', example: '2025-02-01' },
        { key: 'faktury[0].fa_datum_splatnosti', label: 'První faktura - datum splatnosti\n{faktury[0].fa_datum_splatnosti}', type: 'date', example: '2025-02-15' },
        { key: 'faktury[0].fa_datum_doruceni', label: 'První faktura - datum doručení\n{faktury[0].fa_datum_doruceni}', type: 'date', example: '2025-02-01' },
        { key: 'faktury[0].fa_dorucena', label: 'První faktura - doručena (0/1)\n{faktury[0].fa_dorucena}', type: 'number', example: '1' },
        { key: 'faktury[0].fa_castka', label: 'První faktura - částka\n{faktury[0].fa_castka}', type: 'currency', example: '10000.00' },
        { key: 'faktury[0].fa_strediska_kod', label: 'První faktura - střediska\n{faktury[0].fa_strediska_kod}', type: 'string', example: 'IT001,FIN002' },
        { key: 'faktury[0].fa_poznamka', label: 'První faktura - poznámka\n{faktury[0].fa_poznamka}', type: 'text', example: 'Poznámka k faktuře' },
        { key: 'faktury[0].vytvoril_uzivatel_id', label: 'První faktura - vytvořil (user ID)\n{faktury[0].vytvoril_uzivatel_id}', type: 'number', example: '5' },
        { key: 'faktury[0].dt_vytvoreni', label: 'První faktura - datum vytvoření\n{faktury[0].dt_vytvoreni}', type: 'datetime', example: '2025-02-01 10:00:00' },
        { key: 'faktury[0].dt_aktualizace', label: 'První faktura - datum aktualizace\n{faktury[0].dt_aktualizace}', type: 'datetime', example: '2025-02-01 15:30:00' }
      ]
    },

    // Položky faktur (array - podle tabulky 25a_faktury_polozky)
    {
      group: 'Faktury - Položky',
      fields: [
        { key: 'faktury[0].polozky', label: 'První faktura - všechny položky (array)\n{faktury[0].polozky}', type: 'array', example: '[{id,popis,cena_bez_dph,sazba_dph,cena_s_dph}]' },
        { key: 'faktury[0].polozky[0].id', label: 'První faktura, první položka - ID\n{faktury[0].polozky[0].id}', type: 'number', example: '1' },
        { key: 'faktury[0].polozky[0].popis', label: 'První faktura, první položka - popis\n{faktury[0].polozky[0].popis}', type: 'string', example: 'Kancelářský stůl 120x80 cm' },
        { key: 'faktury[0].polozky[0].mnozstvi', label: 'První faktura, první položka - množství\n{faktury[0].polozky[0].mnozstvi}', type: 'number', example: '1' },
        { key: 'faktury[0].polozky[0].jednotka', label: 'První faktura, první položka - jednotka\n{faktury[0].polozky[0].jednotka}', type: 'string', example: 'ks' },
        { key: 'faktury[0].polozky[0].cena_bez_dph', label: 'První faktura, první položka - cena bez DPH\n{faktury[0].polozky[0].cena_bez_dph}', type: 'currency', example: '8264.46' },
        { key: 'faktury[0].polozky[0].sazba_dph', label: 'První faktura, první položka - sazba DPH\n{faktury[0].polozky[0].sazba_dph}', type: 'number', example: '21' },
        { key: 'faktury[0].polozky[0].cena_s_dph', label: 'První faktura, první položka - cena s DPH\n{faktury[0].polozky[0].cena_s_dph}', type: 'currency', example: '10000.00' }
      ]
    },

    // Přílohy faktur (array - podle tabulky 25a_faktury_prilohy)
    {
      group: 'Faktury - Přílohy',
      fields: [
        { key: 'faktury[0].prilohy', label: 'První faktura - všechny přílohy (array)\n{faktury[0].prilohy}', type: 'array', example: '[{id,originalni_nazev_souboru,typ_prilohy,...}]' },
        { key: 'faktury[0].prilohy[0].id', label: 'První faktura, první příloha - ID\n{faktury[0].prilohy[0].id}', type: 'number', example: '1' },
        { key: 'faktury[0].prilohy[0].originalni_nazev_souboru', label: 'První faktura, první příloha - název\n{faktury[0].prilohy[0].originalni_nazev_souboru}', type: 'string', example: 'Faktura_FA-2025-001.pdf' },
        { key: 'faktury[0].prilohy[0].typ_prilohy', label: 'První faktura, první příloha - typ\n{faktury[0].prilohy[0].typ_prilohy}', type: 'string', example: 'FAKTURA' },
        { key: 'faktury[0].prilohy[0].velikost_souboru_b', label: 'První faktura, první příloha - velikost\n{faktury[0].prilohy[0].velikost_souboru_b}', type: 'number', example: '145280' },
        { key: 'faktury[0].prilohy[0].je_isdoc', label: 'První faktura, první příloha - je ISDOC\n{faktury[0].prilohy[0].je_isdoc}', type: 'boolean', example: 'ano' },
        { key: 'faktury[0].prilohy[0].dt_vytvoreni', label: 'První faktura, první příloha - datum vytvoření\n{faktury[0].prilohy[0].dt_vytvoreni}', type: 'datetime', example: '2025-02-01 10:00:00' }
      ]
    },

    // Vypočítané hodnoty (generované z položek objednávky - DOCX generátor)
    {
      group: 'Vypočítané',
      fields: [
        { key: 'vypocitane.celkova_cena_bez_dph', label: 'Celková cena bez DPH (součet položek)\n{vypocitane.celkova_cena_bez_dph}', type: 'currency', example: '82644.63' },
        { key: 'vypocitane.celkova_cena_s_dph', label: 'Celková cena s DPH (součet položek)\n{vypocitane.celkova_cena_s_dph}', type: 'currency', example: '100000.00' },
        { key: 'vypocitane.vypoctene_dph', label: 'Vypočtené DPH (rozdíl)\n{vypocitane.vypoctene_dph}', type: 'currency', example: '17355.37' },
        { key: 'vypocitane.celkova_cena_bez_dph_kc', label: 'Celková cena bez DPH s Kč\n{vypocitane.celkova_cena_bez_dph_kc}', type: 'string', example: '82 644.63 Kč' },
        { key: 'vypocitane.celkova_cena_s_dph_kc', label: 'Celková cena s DPH s Kč\n{vypocitane.celkova_cena_s_dph_kc}', type: 'string', example: '100 000.00 Kč' },
        { key: 'vypocitane.vypoctene_dph_kc', label: 'Vypočtené DPH s Kč\n{vypocitane.vypoctene_dph_kc}', type: 'string', example: '17 355.37 Kč' },
        { key: 'vypocitane.pocet_polozek', label: 'Počet položek objednávky\n{vypocitane.pocet_polozek}', type: 'number', example: '5' },
        { key: 'vypocitane.pocet_priloh', label: 'Počet příloh\n{vypocitane.pocet_priloh}', type: 'number', example: '3' },
        { key: 'vypocitane.datum_generovani', label: 'Datum generování dokumentu\n{vypocitane.datum_generovani}', type: 'date', example: '16.11.2025' },
        { key: 'vypocitane.cas_generovani', label: 'Čas generování dokumentu\n{vypocitane.cas_generovani}', type: 'time', example: '14:30' },
        { key: 'vypocitane.datum_cas_generovani', label: 'Datum a čas generování\n{vypocitane.datum_cas_generovani}', type: 'datetime', example: '16.11.2025 14:30' },
        { key: 'vypocitane.vybrany_uzivatel_cele_jmeno', label: 'Vybraný uživatel - celé jméno s tituly\n{vypocitane.vybrany_uzivatel_cele_jmeno}', type: 'string', example: 'Ing. Jan Novák Ph.D.' },
        { key: 'vypocitane.vybrany_uzivatel_jmeno', label: 'Vybraný uživatel - jméno\n{vypocitane.vybrany_uzivatel_jmeno}', type: 'string', example: 'Jan' },
        { key: 'vypocitane.vybrany_uzivatel_prijmeni', label: 'Vybraný uživatel - příjmení\n{vypocitane.vybrany_uzivatel_prijmeni}', type: 'string', example: 'Novák' },
        { key: 'vypocitane.vybrany_uzivatel_titul_pred', label: 'Vybraný uživatel - titul před\n{vypocitane.vybrany_uzivatel_titul_pred}', type: 'string', example: 'Ing.' },
        { key: 'vypocitane.vybrany_uzivatel_titul_za', label: 'Vybraný uživatel - titul za\n{vypocitane.vybrany_uzivatel_titul_za}', type: 'string', example: 'Ph.D.' },
        { key: 'vypocitane.vybrany_uzivatel_email', label: 'Vybraný uživatel - email\n{vypocitane.vybrany_uzivatel_email}', type: 'string', example: 'jan.novak@firma.cz' },
        { key: 'vypocitane.vybrany_uzivatel_telefon', label: 'Vybraný uživatel - telefon\n{vypocitane.vybrany_uzivatel_telefon}', type: 'string', example: '+420 123 456 789' },
        { key: 'vypocitane.uzivatelem_vybrany_text', label: 'Text vybraný uživatelem (placeholder)\n{vypocitane.uzivatelem_vybrany_text}', type: 'string', example: '[TEXT_VYBRAN_UŽIVATELEM]' }
      ]
    },

    // Systémové
    {
      group: 'Systémové',
      fields: [
        { key: 'aktualni_datum', label: 'Aktuální datum (generované FE)\n{aktualni_datum}', type: 'string', example: '22.10.2025' },
        { key: 'aktualni_cas', label: 'Aktuální čas (generované FE)\n{aktualni_cas}', type: 'string', example: '14:30:15' },
        { key: 'aktualni_datum_cas', label: 'Aktuální datum a čas (generované FE)\n{aktualni_datum_cas}', type: 'string', example: '22.10.2025 14:30:15' }
      ]
    }
  ];
};

/**
 * Mapuje data objednávky na DOCX pole podle SKUTEČNÉ API response struktury
 * AKTUALIZOVÁNO 22.10.2025 - NOVÁ DB STRUKTURA
 * @param {Object} orderData - Data z API /api.eeo/sablona_docx/order-data
 * @returns {Object} - Mapované hodnoty připravené pro DOCX
 */
export const mapOrderToDocxFields = (orderData) => {
  if (!orderData) {
    console.error('❌ mapOrderToDocxFields: Chybí orderData');
    return {};
  }

  const mappedData = {};

  // === ZÁKLADNÍ POLE OBJEDNÁVKY (NOVÉ NÁZVY) ===
  mappedData['cislo_objednavky'] = orderData.cislo_objednavky || '';
  mappedData['dt_objednavky'] = orderData.dt_objednavky || '';
  mappedData['predmet'] = orderData.predmet || '';
  mappedData['strediska_kod'] = orderData.strediska_kod || '';
  mappedData['max_cena_s_dph'] = orderData.max_cena_s_dph || '';
  
  // Financování - může být string nebo objekt
  if (typeof orderData.financovani === 'object' && orderData.financovani !== null) {
    mappedData['financovani'] = orderData.financovani.nazev_stavu || orderData.financovani.nazev || orderData.financovani.typ || '';
    mappedData['financovani.typ'] = orderData.financovani.typ || '';
    mappedData['financovani.nazev'] = orderData.financovani.nazev || '';
    mappedData['financovani.nazev_stavu'] = orderData.financovani.nazev_stavu || '';
    mappedData['financovani.kod'] = orderData.financovani.kod || '';
    mappedData['financovani.kod_stavu'] = orderData.financovani.kod_stavu || '';
  } else {
    mappedData['financovani'] = orderData.financovani || '';
  }
  
  mappedData['druh_objednavky_kod'] = orderData.druh_objednavky_kod || '';
  mappedData['dt_schvaleni'] = orderData.dt_schvaleni || '';
  mappedData['schvaleni_komentar'] = orderData.schvaleni_komentar || '';
  mappedData['dt_predpokladany_termin_dodani'] = orderData.dt_predpokladany_termin_dodani || '';
  mappedData['misto_dodani'] = orderData.misto_dodani || '';
  mappedData['zaruka'] = orderData.zaruka || '';
  mappedData['poznamka'] = orderData.poznamka || '';
  mappedData['dt_vytvoreni'] = orderData.dt_vytvoreni || '';
  mappedData['dt_aktualizace'] = orderData.dt_aktualizace || '';

  // === DATUMOVÁ POLE WORKFLOW ===
  mappedData['dt_schvaleni_zamitnutim'] = orderData.dt_schvaleni_zamitnutim || '';
  mappedData['dt_uzavreni'] = orderData.dt_uzavreni || '';
  mappedData['dt_zruseni'] = orderData.dt_zruseni || '';
  mappedData['dt_archivace'] = orderData.dt_archivace || '';

  // === STAVY A WORKFLOW (PLOCHÉ POLE, NE OBJEKT) ===
  mappedData['stav_workflow_kod'] = orderData.stav_workflow_kod || '';
  mappedData['stav_objednavky'] = orderData.stav_objednavky || '';
  mappedData['dt_odeslani'] = orderData.dt_odeslani || '';
  mappedData['dodavatel_zpusob_potvrzeni'] = orderData.dodavatel_zpusob_potvrzeni || '';
  mappedData['dt_akceptace'] = orderData.dt_akceptace || '';
  mappedData['dt_zverejneni'] = orderData.dt_zverejneni || '';
  mappedData['registr_iddt'] = orderData.registr_iddt || '';

  // === DODAVATEL (PLOCHÉ POLE S PREFIXEM, NE OBJEKT) ===
  mappedData['dodavatel_nazev'] = orderData.dodavatel_nazev || '';
  mappedData['dodavatel_adresa'] = orderData.dodavatel_adresa || '';
  mappedData['dodavatel_ico'] = orderData.dodavatel_ico || '';
  mappedData['dodavatel_dic'] = orderData.dodavatel_dic || '';
  mappedData['dodavatel_zastoupeny'] = orderData.dodavatel_zastoupeny || '';
  mappedData['dodavatel_kontakt_jmeno'] = orderData.dodavatel_kontakt_jmeno || '';
  mappedData['dodavatel_kontakt_email'] = orderData.dodavatel_kontakt_email || '';
  mappedData['dodavatel_kontakt_telefon'] = orderData.dodavatel_kontakt_telefon || '';

  // === OBJEDNATEL (vnořený objekt - BEZE ZMĚNY) ===
  if (orderData.objednatel) {
    const objednatel = orderData.objednatel;
    mappedData['objednatel.username'] = objednatel.username || '';
    mappedData['objednatel.titul_pred'] = objednatel.titul_pred || '';
    mappedData['objednatel.jmeno'] = objednatel.jmeno || '';
    mappedData['objednatel.prijmeni'] = objednatel.prijmeni || '';
    mappedData['objednatel.titul_za'] = objednatel.titul_za || '';
    mappedData['objednatel.email'] = objednatel.email || '';
    mappedData['objednatel.telefon'] = objednatel.telefon || '';
    mappedData['objednatel.plne_jmeno'] = objednatel.plne_jmeno || '';
  } else {
    ['username', 'titul_pred', 'jmeno', 'prijmeni', 'titul_za', 'email', 'telefon', 'plne_jmeno']
      .forEach(field => mappedData[`objednatel.${field}`] = '');
  }

  // === GARANT (vnořený objekt - BEZE ZMĚNY) ===
  if (orderData.garant) {
    const garant = orderData.garant;
    mappedData['garant.username'] = garant.username || '';
    mappedData['garant.titul_pred'] = garant.titul_pred || '';
    mappedData['garant.jmeno'] = garant.jmeno || '';
    mappedData['garant.prijmeni'] = garant.prijmeni || '';
    mappedData['garant.titul_za'] = garant.titul_za || '';
    mappedData['garant.email'] = garant.email || '';
    mappedData['garant.telefon'] = garant.telefon || '';
    mappedData['garant.plne_jmeno'] = garant.plne_jmeno || '';
  } else {
    ['username', 'titul_pred', 'jmeno', 'prijmeni', 'titul_za', 'email', 'telefon', 'plne_jmeno']
      .forEach(field => mappedData[`garant.${field}`] = '');
  }

  // === UŽIVATEL (kdo vytvořil) - ZMĚNA Z created_by ===
  if (orderData.uzivatel) {
    const uzivatel = orderData.uzivatel;
    mappedData['uzivatel.username'] = uzivatel.username || '';
    mappedData['uzivatel.titul_pred'] = uzivatel.titul_pred || '';
    mappedData['uzivatel.jmeno'] = uzivatel.jmeno || '';
    mappedData['uzivatel.prijmeni'] = uzivatel.prijmeni || '';
    mappedData['uzivatel.titul_za'] = uzivatel.titul_za || '';
    mappedData['uzivatel.email'] = uzivatel.email || '';
    mappedData['uzivatel.telefon'] = uzivatel.telefon || '';
    mappedData['uzivatel.plne_jmeno'] = uzivatel.plne_jmeno || '';
  } else {
    ['username', 'titul_pred', 'jmeno', 'prijmeni', 'titul_za', 'email', 'telefon', 'plne_jmeno']
      .forEach(field => mappedData[`uzivatel.${field}`] = '');
  }

  // === SCHVALOVATEL (schválil) - ZMĚNA Z schvalil ===
  if (orderData.schvalovatel) {
    const schvalovatel = orderData.schvalovatel;
    mappedData['schvalovatel.username'] = schvalovatel.username || '';
    mappedData['schvalovatel.titul_pred'] = schvalovatel.titul_pred || '';
    mappedData['schvalovatel.jmeno'] = schvalovatel.jmeno || '';
    mappedData['schvalovatel.prijmeni'] = schvalovatel.prijmeni || '';
    mappedData['schvalovatel.titul_za'] = schvalovatel.titul_za || '';
    mappedData['schvalovatel.email'] = schvalovatel.email || '';
    mappedData['schvalovatel.telefon'] = schvalovatel.telefon || '';
    mappedData['schvalovatel.plne_jmeno'] = schvalovatel.plne_jmeno || '';
  } else {
    ['username', 'titul_pred', 'jmeno', 'prijmeni', 'titul_za', 'email', 'telefon', 'plne_jmeno']
      .forEach(field => mappedData[`schvalovatel.${field}`] = '');
  }

  // === PŘÍKAZCE (vnořený objekt - BEZE ZMĚNY) ===
  if (orderData.prikazce) {
    const prikazce = orderData.prikazce;
    mappedData['prikazce.username'] = prikazce.username || '';
    mappedData['prikazce.titul_pred'] = prikazce.titul_pred || '';
    mappedData['prikazce.jmeno'] = prikazce.jmeno || '';
    mappedData['prikazce.prijmeni'] = prikazce.prijmeni || '';
    mappedData['prikazce.titul_za'] = prikazce.titul_za || '';
    mappedData['prikazce.email'] = prikazce.email || '';
    mappedData['prikazce.telefon'] = prikazce.telefon || '';
    mappedData['prikazce.plne_jmeno'] = prikazce.plne_jmeno || '';
  } else {
    ['username', 'titul_pred', 'jmeno', 'prijmeni', 'titul_za', 'email', 'telefon', 'plne_jmeno']
      .forEach(field => mappedData[`prikazce.${field}`] = '');
  }

  // === POLOŽKY (array) ===
  mappedData['polozky'] = orderData.polozky || [];
  mappedData['polozky_text'] = orderData.polozky ?
    orderData.polozky.map((item, index) =>
      `${index + 1}. ${item.popis || 'Položka'} - ${item.cena_s_dph || 0} Kč`
    ).join('\n') : '';

  // === PŘÍLOHY (array) ===
  mappedData['prilohy'] = orderData.prilohy || [];
  mappedData['prilohy_text'] = orderData.prilohy ?
    orderData.prilohy.map((priloha, index) =>
      `${index + 1}. ${priloha.puvodni_nazev || priloha.nazev_souboru || 'Příloha'}`
    ).join('\n') : '';

  // === FAKTURY (array) ===
  mappedData['faktury'] = orderData.faktury || [];
  mappedData['faktury_text'] = orderData.faktury ?
    orderData.faktury.map((faktura, index) =>
      `${index + 1}. ${faktura.cislo_faktury || 'Faktura'} - ${faktura.castka || 0} ${faktura.mena || 'Kč'} (splatnost: ${faktura.datum_splatnosti || 'neuvedeno'})`
    ).join('\n') : '';

  // Mapování položek faktur (pokud existují)
  if (orderData.faktury && orderData.faktury.length > 0) {
    orderData.faktury.forEach((faktura, fakturaIndex) => {
      // Mapuj základní pole faktury
      const fakturaPrefix = `faktury[${fakturaIndex}]`;
      mappedData[`${fakturaPrefix}.id`] = faktura.id || '';
      mappedData[`${fakturaPrefix}.cislo_faktury`] = faktura.cislo_faktury || '';
      mappedData[`${fakturaPrefix}.datum_vystaveni`] = faktura.datum_vystaveni || '';
      mappedData[`${fakturaPrefix}.datum_splatnosti`] = faktura.datum_splatnosti || '';
      mappedData[`${fakturaPrefix}.castka`] = faktura.castka || '';
      mappedData[`${fakturaPrefix}.mena`] = faktura.mena || 'CZK';
      mappedData[`${fakturaPrefix}.vs`] = faktura.vs || '';
      mappedData[`${fakturaPrefix}.stav`] = faktura.stav || '';
      mappedData[`${fakturaPrefix}.poznamka`] = faktura.poznamka || '';

      // Mapuj položky faktury
      mappedData[`${fakturaPrefix}.polozky`] = faktura.polozky || [];
      if (faktura.polozky && faktura.polozky.length > 0) {
        faktura.polozky.forEach((polozka, polozkaIndex) => {
          const polozkaPrefix = `${fakturaPrefix}.polozky[${polozkaIndex}]`;
          mappedData[`${polozkaPrefix}.id`] = polozka.id || '';
          mappedData[`${polozkaPrefix}.popis`] = polozka.popis || '';
          mappedData[`${polozkaPrefix}.mnozstvi`] = polozka.mnozstvi || '';
          mappedData[`${polozkaPrefix}.jednotka`] = polozka.jednotka || '';
          mappedData[`${polozkaPrefix}.cena_bez_dph`] = polozka.cena_bez_dph || '';
          mappedData[`${polozkaPrefix}.sazba_dph`] = polozka.sazba_dph || '';
          mappedData[`${polozkaPrefix}.cena_s_dph`] = polozka.cena_s_dph || '';
        });
      }

      // Mapuj přílohy faktury
      mappedData[`${fakturaPrefix}.prilohy`] = faktura.prilohy || [];
      if (faktura.prilohy && faktura.prilohy.length > 0) {
        faktura.prilohy.forEach((priloha, prilohaIndex) => {
          const prilohaPrefix = `${fakturaPrefix}.prilohy[${prilohaIndex}]`;
          mappedData[`${prilohaPrefix}.id`] = priloha.id || '';
          mappedData[`${prilohaPrefix}.originalni_nazev_souboru`] = priloha.originalni_nazev_souboru || '';
          mappedData[`${prilohaPrefix}.typ_prilohy`] = priloha.typ_prilohy || '';
          mappedData[`${prilohaPrefix}.velikost_souboru_b`] = priloha.velikost_souboru_b || '';
          mappedData[`${prilohaPrefix}.je_isdoc`] = priloha.je_isdoc ? 'ano' : '';
          mappedData[`${prilohaPrefix}.dt_vytvoreni`] = priloha.dt_vytvoreni || '';
        });
      }
    });
  }

  // === VYPOČÍTANÁ POLE ===
  mappedData['celkova_cena_bez_dph'] = orderData.celkova_cena_bez_dph || '';
  mappedData['celkova_cena_s_dph'] = orderData.celkova_cena_s_dph || '';
  mappedData['pocet_polozek'] = orderData.pocet_polozek || (orderData.polozky?.length || 0);
  mappedData['pocet_priloh'] = orderData.pocet_priloh || (orderData.prilohy?.length || 0);
  mappedData['pocet_faktur'] = orderData.faktury?.length || 0;

  // Celková částka faktur
  const celkovaFaktury = orderData.faktury?.reduce((sum, f) => sum + (parseFloat(f.castka) || 0), 0) || 0;
  mappedData['celkova_castka_faktur'] = celkovaFaktury.toFixed(2);

  // === SYSTÉMOVÁ POLE ===
  const aktualniDatum = new Date();
  mappedData['aktualni_datum'] = aktualniDatum.toLocaleDateString('cs-CZ');
  mappedData['aktualni_cas'] = aktualniDatum.toLocaleTimeString('cs-CZ');
  mappedData['aktualni_datum_cas'] = aktualniDatum.toLocaleString('cs-CZ');

  return mappedData;
};

  // === LOKALITA (vnořený objekt) - ODSTRANĚNO, není v nové DB struktuře ===

/**
 * Validuje DOCX soubor
 */
export const validateDocxFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('Nebyl vybrán žádný soubor');
    return { isValid: false, errors };
  }

  if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    errors.push('Soubor musí být ve formátu DOCX');
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    errors.push('Soubor je příliš velký (max 10MB)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Rozšířené mapování pro složená pole
 * @param {Object} mapping - Základní mapování z UI
 * @param {Array} orderFields - Definice polí z getOrderFieldsForMapping
 * @returns {Object} - Rozšířené mapování včetně složených polí
 */
export const createEnhancedFieldMapping = (mapping, orderFields) => {
  const enhanced = { ...mapping };

  // Projdi všechny skupiny polí
  orderFields.forEach(group => {
    group.fields.forEach(field => {
      // Pokud je pole složené a je namapované
      if (field.type === 'composed' && enhanced[Object.keys(enhanced).find(k => enhanced[k] === field.key)]) {
        const docxFieldName = Object.keys(enhanced).find(k => enhanced[k] === field.key);

        if (field.composition && field.composition.length > 0) {
          // Vytvoř placeholder hodnotu pro složené pole
          if (field.template) {
            // Použij template formát
            let template = field.template;
            field.composition.forEach((sourceField, idx) => {
              template = template.replace(`{${idx}}`, `{${sourceField}}`);
            });
            enhanced[docxFieldName] = template;
          } else {
            // Použij jednoduchý separator
            const separator = field.separator || ' ';
            enhanced[docxFieldName] = field.composition.map(f => `{${f}}`).join(separator);
          }
        }
      }
    });
  });

  return enhanced;
};

/**
 * Převede mapování na field values pro processDocxWithFields
 * OPRAVENO: zachovává původní názvy polí (bez převodu na UPPERCASE)
 * @param {Object} mapping - Mapování z UI nebo rozšířené mapování
 * @param {Object} orderData - Skutečná data objednávky (volitelné)
 * @returns {Object} - Field values pro DOCX procesování
 */
export const createFieldValuesFromMapping = (mapping, orderData = null) => {
  const fieldValues = {};

  Object.entries(mapping).forEach(([docxField, dbField]) => {
    if (orderData) {
      // Použij skutečná data, pokud jsou k dispozici (pro objednávky)
      // KRITICKÉ: Zachovej původní název pole (bez .toUpperCase())
      fieldValues[docxField] = getValueFromOrderData(orderData, dbField);
    } else {
      // Pro náhled DOCX šablon - zachovej původní dbField mapování
      fieldValues[docxField] = `{${dbField}}`;
    }
  });

  return fieldValues;
};

/**
 * Získá hodnotu z dat objednávky podle field key
 * Podporuje i složené hodnoty s template formátem
 * @param {Object} orderData - Data objednávky
 * @param {string} fieldKey - Klíč pole nebo template formát
 * @returns {string} - Hodnota pro dosazení
 */
const getValueFromOrderData = (orderData, fieldKey) => {
  // NOVÉ: Zpracuj přímo složené pole s operátorem + (bez vnějších {})
  if (fieldKey.includes('+') && !fieldKey.includes('{')) {
    const fieldParts = fieldKey.split('+').map(part => part.trim());

    const values = fieldParts.map(fieldPart => {
      const rawValue = getNestedValue(orderData, fieldPart);
      return formatFieldValue(fieldPart, rawValue);
    }).filter(val => val && val.trim()); // Odstraň prázdné hodnoty

    const combinedValue = values.join(' '); // Spoj mezerou
    return combinedValue;
  }

  // Pokud field obsahuje template formát s {field1} {field2}
  if (fieldKey.includes('{') && fieldKey.includes('}')) {
    let result = fieldKey;

    // Najdi všechny {fieldName} v template a nahraď je hodnotami
    const fieldMatches = fieldKey.match(/\{([^}]+)\}/g);
    if (fieldMatches) {
      fieldMatches.forEach(match => {
        const cleanFieldName = match.replace(/[{}]/g, '');

        // NOVÁ FUNKCE: Zpracování složených polí s operátorem +
        if (cleanFieldName.includes('+')) {
          const fieldParts = cleanFieldName.split('+').map(part => part.trim());

          const values = fieldParts.map(fieldPart => {
            const rawValue = getNestedValue(orderData, fieldPart);
            return formatFieldValue(fieldPart, rawValue);
          }).filter(val => val && val.trim()); // Odstraň prázdné hodnoty

          const combinedValue = values.join(' '); // Spoj mezerou
          result = result.replace(match, combinedValue);
        } else {
          // Původní logika pro jednoduché pole
          const rawValue = getNestedValue(orderData, cleanFieldName);
          const formattedValue = formatFieldValue(cleanFieldName, rawValue);
          result = result.replace(match, formattedValue || '');
        }
      });
    }

    return result;
  }

  // Jednoduchý field key
  const rawValue = getNestedValue(orderData, fieldKey);
  return formatFieldValue(fieldKey, rawValue) || `{${fieldKey}}`;
};

/**
 * Formátuje hodnotu pole podle jeho typu/názvu
 * AKTUALIZOVÁNO pro novou BE strukturu s novými datovými typy
 * @param {string} fieldKey - Název pole
 * @param {any} value - Surová hodnota
 * @returns {string} - Naformátovaná hodnota
 */
const formatFieldValue = (fieldKey, value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const fieldLower = fieldKey.toLowerCase();

  // Boolean hodnoty -> "ano" / "" (nová BE specifikace)
  if (typeof value === 'boolean') {
    return value ? 'ano' : '';
  }

  // Boolean text hodnoty (už jsou "ano"/"")
  if (fieldLower.includes('boolean_text') || (typeof value === 'string' && (value === 'ano' || value === ''))) {
    return value;
  }

  // Formátování cen - přidej tisícové oddělovače a "Kč"
  if (fieldLower.includes('cena') || fieldLower.includes('price') || fieldLower.includes('amount') ||
      fieldLower.includes('max_cena') || fieldLower.includes('currency')) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue.toLocaleString('cs-CZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }) + ' Kč';
    }
  }

  // Formátování datumů (date typ)
  if (fieldLower.includes('datum') || fieldLower.includes('date') ||
      fieldLower.includes('dt_') || fieldLower.includes('termin')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('cs-CZ');
      }
    } catch (error) {
      // Pokud se nepodaří parsovat jako datum, vrať jako string
    }
  }

  // Formátování datetime (datetime typ)
  if (fieldLower.includes('datetime') || fieldLower.includes('dt_vytvoreno') ||
      fieldLower.includes('dt_aktualizace') || fieldLower.includes('datum_schvaleni')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      // Pokud se nepodaří parsovat jako datum, vrať jako string
    }
  }

  // Formátování času (time typ)
  if (fieldLower.includes('time') && !fieldLower.includes('datetime')) {
    try {
      // Pokud je to čas ve formátu HH:MM nebo timestamp
      if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}$/)) {
        return value;
      }
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('cs-CZ', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      // Pokud se nepodaří parsovat, vrať jako string
    }
  }

  // Ostatní hodnoty vrať jako string
  return String(value);
};

/**
 * Získá hodnotu z vnořeného objektu podle tečkové notace
 * ROZŠÍŘENO pro zpracování položek objednávky a inteligentní skládání jmen
 * @param {Object} obj - Objektvá data
 * @param {string} path - Cesta k hodnotě (např. "uzivatel.jmeno")
 * @returns {any} - Hodnota nebo undefined
 */
const getNestedValue = (obj, path) => {
  // Speciální zpracování pro položky objednávky
  if (path.startsWith('polozky_') && obj.polozky && Array.isArray(obj.polozky)) {
    const polozky = obj.polozky;

    switch (path) {
      case 'polozky_count':
        return polozky.length;

      case 'polozky_celkova_cena':
        return polozky.reduce((sum, item) => sum + (parseFloat(item.cena_s_dph) || 0), 0);

      case 'polozky_celkova_cena_bez_dph':
        return polozky.reduce((sum, item) => sum + (parseFloat(item.cena_bez_dph) || 0), 0);

      case 'polozky_dph_celkem':
        const cenaSdph = polozky.reduce((sum, item) => sum + (parseFloat(item.cena_s_dph) || 0), 0);
        const cenaBezDph = polozky.reduce((sum, item) => sum + (parseFloat(item.cena_bez_dph) || 0), 0);
        return cenaSdph - cenaBezDph;

      case 'polozky_nazvy':
        return polozky.map(item => item.nazev || item.popis || '').filter(n => n).join(', ');

      case 'polozky_mnozstvi_celkem':
        return polozky.reduce((sum, item) => sum + (parseFloat(item.mnozstvi) || 0), 0);

      case 'polozky_jednotky':
        const jednotky = [...new Set(polozky.map(item => item.jednotka).filter(j => j))];
        return jednotky.join(', ');

      case 'polozky_dodavatele':
        const dodavatele = [...new Set(polozky.map(item => item.dodavatel_nazev).filter(d => d))];
        return dodavatele.join(', ');

      case 'polozky_katalogova_cisla':
        return polozky.map(item => item.katalogove_cislo).filter(k => k).join(', ');

      case 'polozky_popis_souhrnny':
        const popisy = polozky.map(item => item.popis || item.nazev || '').filter(p => p);
        return popisy.join('; ');

      case 'polozky_formatovane':
        return polozky.map((item, index) => {
          const nazev = item.nazev || item.popis || 'Položka';
          const mnozstvi = item.mnozstvi || 1;
          const jednotka = item.jednotka || 'ks';
          const cena = item.cena_s_dph || item.cena_bez_dph || 0;
          return `${index + 1}. ${nazev} (${mnozstvi}${jednotka} × ${cena} Kč)`;
        }).join('\n');

      default:
        // Pokud není speciální pole, zkus standardní přístup
        break;
    }
  }

  // Speciální zpracování pro složená pole typu "jmeno_cele"
  if (path.endsWith('.jmeno_cele')) {
    const basePath = path.replace('.jmeno_cele', '');
    const objPart = basePath ? path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj) : obj;

    if (objPart) {
      // Zkus najít přímo jmeno_cele
      if (objPart.jmeno_cele) {
        return objPart.jmeno_cele;
      }

      // Pokud ne, slož z jmeno + prijmeni
      const jmeno = objPart.jmeno || objPart.uzivatel_jmeno || '';
      const prijmeni = objPart.prijmeni || objPart.uzivatel_prijmeni || '';
      const celJemeno = `${jmeno} ${prijmeni}`.trim();

      if (celJemeno) {
        return celJemeno;
      }
    }

    // Pokud vnořený objekt neexistuje, zkus fallback na ploché názvy
    if (basePath === 'objednatel') {
      const jmeno = obj.uzivatel_jmeno || obj.jmeno || '';
      const prijmeni = obj.uzivatel_prijmeni || obj.prijmeni || '';
      return `${jmeno} ${prijmeni}`.trim();
    }

    if (basePath === 'garant') {
      const jmeno = obj.garant_jmeno || '';
      const prijmeni = obj.garant_prijmeni || '';
      return `${jmeno} ${prijmeni}`.trim();
    }

    if (basePath === 'schvalovatel') {
      const jmeno = obj.schvalovatel_jmeno || '';
      const prijmeni = obj.schvalovatel_prijmeni || '';
      return `${jmeno} ${prijmeni}`.trim();
    }

    return '';
  }

  // Standardní tečková notace
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * DYNAMICKÉ GENEROVÁNÍ POLÍ Z API DAT - S AUTOMATICKOU DETEKCÍ SKUPIN
 * Analyzuje skutečnou strukturu dat z BE a automaticky vytváří podsekce podle prefixů
 *
 * @param {Object} apiData - Data z POST /api.eeo/sablona_docx/order-data
 * @returns {Array} - Pole skupin s fieldy ve formátu pro DocxMappingExpandableSection
 */
export const generateFieldsFromApiData = (apiData) => {
  if (!apiData || typeof apiData !== 'object') {
    console.warn('⚠️ generateFieldsFromApiData: Neplatná data');
    return getOrderFieldsForMapping(); // Fallback na hardcoded
  }

  const groups = [];

  // Mapa prefixů na české názvy skupin
  const prefixToCzechName = {
    'dodavatel': 'Dodavatel',
    'objednatel': 'Objednatel',
    'garant': 'Garant',
    'uzivatel': 'Uživatel',
    'schvalovatel': 'Schvalovatel',
    'prikazce': 'Příkazce',
    'polozky': 'Položky',
    'prilohy': 'Přílohy',
    'smlouva': 'Smlouva',
    'faktury': 'Faktury', // ✅ OPRAVENO: množné číslo
    'platba': 'Platba'
  };

  // Helper pro získání typu hodnoty
  const getFieldType = (value) => {
    if (value === null || value === undefined) return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') {
      return value.toString().includes('.') ? 'currency' : 'number';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime';
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
      if (value.length > 100) return 'text';
      return 'string';
    }
    return 'string';
  };

  // Helper pro vytvoření fieldu
  const createField = (key, value, czechName = null) => {
    const type = getFieldType(value);
    const label = czechName
      ? `${czechName}\n{${key}}`
      : `${key}\n{${key}}`;

    return {
      key,
      label,
      type,
      example: value !== null && value !== undefined ? String(value).substring(0, 50) : ''
    };
  };

  // Helper pro detekci prefix skupiny z názvu pole
  const detectGroupFromKey = (key) => {
    // Kontrola podtržítka - např. dodavatel_email → dodavatel
    const underscoreMatch = key.match(/^([a-z]+)_/i);
    if (underscoreMatch) {
      const prefix = underscoreMatch[1].toLowerCase();
      if (prefixToCzechName[prefix]) {
        return { prefix, name: prefixToCzechName[prefix] };
      }
    }

    // Kontrola tečky - např. objednatel.email → objednatel
    const dotMatch = key.match(/^([a-z]+)\./i);
    if (dotMatch) {
      const prefix = dotMatch[1].toLowerCase();
      if (prefixToCzechName[prefix]) {
        return { prefix, name: prefixToCzechName[prefix] };
      }
    }

    // Kontrola přímého shodného jména - např. "polozky", "prilohy"
    const lowerKey = key.toLowerCase();
    if (prefixToCzechName[lowerKey]) {
      return { prefix: lowerKey, name: prefixToCzechName[lowerKey] };
    }

    return null;
  };

  // Helper pro rekurzivní procházení objektu
  const processObject = (obj, groupName, prefix = '') => {
    const fields = [];

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Vnořený objekt - přidej ho jako samostatné pole
        fields.push(createField(fullKey, JSON.stringify(value)));

        // A také jeho properties
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          fields.push(createField(`${fullKey}.${nestedKey}`, nestedValue));
        });
      } else if (Array.isArray(value) && value.length > 0) {
        // Array - přidej celý array i první prvek s indexem
        fields.push(createField(fullKey, `[${value.length} položek]`));

        if (typeof value[0] === 'object') {
          Object.entries(value[0]).forEach(([itemKey, itemValue]) => {
            fields.push(createField(`${fullKey}[0].${itemKey}`, itemValue));
          });
        }
      } else {
        // Primitivní hodnota
        fields.push(createField(fullKey, value));
      }
    });

    if (fields.length > 0) {
      groups.push({ group: groupName, fields });
    }
  };

  // Dočasné skupiny pro dynamickou detekci
  const dynamicGroups = {};
  const baseFields = []; // Pole bez prefixu

  // ✅ KLÍČOVÁ POLE OBJEDNÁVKY (měla by být v baseFields pro "Základní údaje")
  const orderKeyFields = [
    'cislo_objednavky', 'dt_objednavky', 'dt_vytvoreni', 'dt_aktualizace',
    'dt_schvaleni', 'dt_odeslani', 'dt_akceptace', 'dt_zverejneni',
    'predmet', 'strediska_kod', 'max_cena_s_dph', 'financovani',
    'druh_objednavky_kod', 'schvaleni_komentar', 'dt_predpokladany_termin_dodani',
    'misto_dodani', 'zaruka', 'poznamka', 'stav_workflow_kod', 'stav_objednavky',
    'dodavatel_zpusob_potvrzeni', 'registr_iddt'
  ];

  // 1. Procházíme všechna root level pole a seskupujeme podle prefixů
  Object.entries(apiData).forEach(([key, value]) => {
    // Pokud je hodnota vnořený objekt (ne array), zpracuj jako samostatnou sekci
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const groupInfo = detectGroupFromKey(key);
      const groupName = groupInfo ? groupInfo.name : key.charAt(0).toUpperCase() + key.slice(1);
      processObject(value, groupName, key);
      return;
    }

    // Pokud je hodnota array, zpracuj zvlášť
    if (Array.isArray(value)) {
      const groupInfo = detectGroupFromKey(key);
      const groupName = groupInfo ? groupInfo.name : key.charAt(0).toUpperCase() + key.slice(1);

      const arrayFields = [
        createField(key, `[${value.length} položek]`)
      ];

      if (value.length > 0 && typeof value[0] === 'object') {
        Object.entries(value[0]).forEach(([itemKey, itemValue]) => {
          if (typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue)) {
            // Vnořený objekt v array
            Object.entries(itemValue).forEach(([nestedKey, nestedValue]) => {
              arrayFields.push(createField(`${key}[0].${itemKey}.${nestedKey}`, nestedValue));
            });
          } else {
            arrayFields.push(createField(`${key}[0].${itemKey}`, itemValue));
          }
        });
      }

      groups.push({ group: groupName, fields: arrayFields });
      return;
    }

    // Primitivní hodnota - detekuj prefix
    const groupInfo = detectGroupFromKey(key);

    // ✅ OPRAVENO: Klíčová pole objednávky VŽDY do baseFields (i když mají prefix)
    if (orderKeyFields.includes(key)) {
      baseFields.push(createField(key, value));
    } else if (groupInfo) {
      // Pole patří do skupiny (např. dodavatel_ico → Dodavatel)
      if (!dynamicGroups[groupInfo.prefix]) {
        dynamicGroups[groupInfo.prefix] = {
          name: groupInfo.name,
          fields: []
        };
      }
      dynamicGroups[groupInfo.prefix].fields.push(createField(key, value));
    } else {
      // Pole bez prefixu → základní objednávka
      baseFields.push(createField(key, value));
    }
  });

  // 2. Přidej základní pole objednávky na začátek
  // ✅ OPRAVENO: Vytvoř TROJE skupiny - "Datumová pole", "Základní údaje" (bez datumů), "Objednávka - detail"
  if (baseFields.length > 0) {
    // ⭐ DATUMOVÁ POLE - samostatná sekce
    const dateFields = [
      'dt_vytvoreni', 'dt_aktualizace', 'dt_objednavky', 'dt_schvaleni',
      'dt_odeslani', 'dt_akceptace', 'dt_zverejneni', 'dt_predpokladany_termin_dodani'
    ];
    const dateOnlyFields = baseFields.filter(f => dateFields.includes(f.key));
    if (dateOnlyFields.length > 0) {
      groups.unshift({ group: '📅 Datumová pole workflow', fields: dateOnlyFields });
    }

    // Základní údaje - klíčová pole BEZ datumů
    const keyFieldsWithoutDates = [
      'cislo_objednavky', 'predmet', 'strediska_kod', 'max_cena_s_dph', 'financovani',
      'druh_objednavky_kod', 'schvaleni_komentar', 'misto_dodani', 'zaruka', 'poznamka',
      'stav_workflow_kod', 'stav_objednavky', 'dodavatel_zpusob_potvrzeni', 'registr_iddt'
    ];

    const basicFields = baseFields.filter(f => keyFieldsWithoutDates.includes(f.key));
    if (basicFields.length > 0) {
      groups.push({ group: 'Základní údaje', fields: basicFields });
    }

    // Objednávka - detail - všechna pole
    groups.push({ group: 'Objednávka - detail', fields: baseFields });
  }

  // 3. Přidej dynamicky detekované skupiny (seřazené podle známých prefixů)
  const knownPrefixOrder = Object.keys(prefixToCzechName);
  knownPrefixOrder.forEach(prefix => {
    if (dynamicGroups[prefix]) {
      groups.push({
        group: dynamicGroups[prefix].name,
        fields: dynamicGroups[prefix].fields
      });
    }
  });

  // 4. ✅ POJISTKA: VŽDY PŘIDEJ/DOPLŇ VŠECHNA DATUMOVÁ POLE (i když mají NULL hodnotu v API)
  const staticFields = getOrderFieldsForMapping();
  const staticDateGroup = staticFields.find(g => g.group === '📅 Datumová pole workflow');
  
  if (staticDateGroup) {
    const existingDateGroup = groups.find(g => g.group === '📅 Datumová pole workflow');
    
    if (existingDateGroup) {
      // Doplň chybějící datumová pole ze statické definice
      const existingKeys = existingDateGroup.fields.map(f => f.key);
      const missingDateFields = staticDateGroup.fields.filter(f => !existingKeys.includes(f.key));
      
      if (missingDateFields.length > 0) {
        // console.log(`⚠️ Doplňuji ${missingDateFields.length} chybějících datumových polí (NULL v API):`, 
        //   missingDateFields.map(f => f.key));
        existingDateGroup.fields.push(...missingDateFields);
      }
    } else {
      // Datumová sekce vůbec neexistuje - přidej celou statickou
      // Datumová sekce chybí úplně, přidávám statickou definici
      groups.unshift(staticDateGroup);
    }
  }

  // 5. ✅ POJISTKA: Pokud faktury nejsou v dynamických datech, přidej je staticky (bez duplikace)
  const fakturyGroups = staticFields.filter(g =>
    g.group === 'Faktury' ||
    g.group === 'Faktury - Položky' ||
    g.group === 'Faktury - Přílohy'
  );
  
  fakturyGroups.forEach(fakturyGroup => {
    if (!groups.some(g => g.group === fakturyGroup.group)) {
      groups.push(fakturyGroup);
    }
  });

  // 6. ✅ VŽDY PŘIDEJ VYPOČÍTANÁ POLE - jsou generována DOCX generátorem (bez duplikace)
  const vypocitaneGroup = staticFields.find(g => g.group === '🧮 Vypočítané hodnoty' || g.group === 'Vypočítané');
  if (vypocitaneGroup && !groups.some(g => g.group === vypocitaneGroup.group)) {
    groups.push(vypocitaneGroup);
  }

  // 7. ✅ VŽDY PŘIDEJ SYSTÉMOVÁ POLE (bez duplikace)
  const systemGroup = staticFields.find(g => g.group === 'Systémové');
  if (systemGroup && !groups.some(g => g.group === 'Systémové')) {
    groups.push(systemGroup);
  }

  // 8. ✅ POJISTKA: DOPLŇ ENRICHED UŽIVATELSKÉ SKUPINY (i když nejsou v API - NULL hodnoty)
  const userGroups = [
    'Objednatel', 'Garant', 'Uživatel (vytvořil)', 'Schvalovatel', 'Příkazce'
  ];
  
  userGroups.forEach(groupName => {
    const staticUserGroup = staticFields.find(g => g.group === groupName);
    if (!staticUserGroup) return;
    
    const existingUserGroup = groups.find(g => g.group === groupName);
    
    if (existingUserGroup) {
      // Skupina existuje - doplň chybějící pole
      const existingKeys = existingUserGroup.fields.map(f => f.key);
      const missingFields = staticUserGroup.fields.filter(f => !existingKeys.includes(f.key));
      
      if (missingFields.length > 0) {
        // console.log(`⚠️ Doplňuji ${missingFields.length} chybějících polí pro "${groupName}" (NULL v API):`,
        //   missingFields.map(f => f.key));
        existingUserGroup.fields.push(...missingFields);
      }
    } else {
      // Skupina neexistuje vůbec - přidej celou statickou (např. když garant není vyplněný)
      // console.log(`⚠️ Skupina "${groupName}" chybí úplně, přidávám statickou definici`);
      groups.push(staticUserGroup);
    }
  });

  // 9. ✅ FINÁLNÍ DEDUPLIKACE - odstraň duplicitní skupiny (ponech první výskyt)
  const uniqueGroups = [];
  const seenGroupNames = new Set();
  
  groups.forEach(group => {
    if (!seenGroupNames.has(group.group)) {
      seenGroupNames.add(group.group);
      uniqueGroups.push(group);
    } else {
      // console.warn(`⚠️ Odstraněna duplicitní skupina: "${group.group}"`);
    }
  });

  return uniqueGroups;
};

export default {
  extractDocxFields,
  getOrderFieldsForMapping,
  generateFieldsFromApiData,
  mapOrderToDocxFields,
  validateDocxFile,
  createEnhancedFieldMapping,
  createFieldValuesFromMapping,
  formatFieldValue
};