/**
 * DOCX Template Processor
 * Zpracuje DOCX šablonu a vyplní ji daty z objednávky
 */

import JSZip from 'jszip';

/**
 * Vyplní DOCX šablonu skutečnými daty
 * @param {Blob} templateFile - DOCX šablona jako Blob
 * @param {Object} fieldValues - Mapované hodnoty pro pole
 * @param {string} fileName - Název výsledného souboru
 * @returns {Promise<Blob>} - Vyplněný DOCX soubor
 */
export const fillDocxTemplate = async (templateFile, fieldValues, fileName = 'vyplneny_dokument.docx') => {
  try {
    console.log('[fillDocxTemplate]', {
      templateSize: templateFile.size,
      fieldsCount: Object.keys(fieldValues).length,
      fields: fieldValues
    });

    // Načti DOCX jako ZIP
    const zip = await JSZip.loadAsync(templateFile);

    // Najdi document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Neplatná DOCX šablona - chybí document.xml');
    }


    // Vyplň pole v XML
    let filledXml = documentXml;
    let replacementCount = 0;

    // Vyplň pole ve formátu {FIELD_NAME}
    Object.entries(fieldValues).forEach(([fieldName, value]) => {
      const placeholder = `{${fieldName.toUpperCase()}}`;
      const regex = new RegExp(escapeRegExp(placeholder), 'g');
      const beforeLength = filledXml.length;
      filledXml = filledXml.replace(regex, String(value || ''));
      const afterLength = filledXml.length;

      if (beforeLength !== afterLength) {
        replacementCount++;
      } else {
      }
    });

    // Také zkus vzor s DOCVARIABLE (Word merge fields)
    Object.entries(fieldValues).forEach(([fieldName, value]) => {
      // Specifický pattern pro {DOCVARIABLE FIELD_NAME} formát ze šablony
      const docvariablePattern = `\\{\\s*DOCVARIABLE\\s+${escapeRegExp(fieldName)}\\s*\\}`;
      const regex = new RegExp(docvariablePattern, 'gi');
      const beforeLength = filledXml.length;
      filledXml = filledXml.replace(regex, String(value || ''));
      const afterLength = filledXml.length;

      if (beforeLength !== afterLength) {
        replacementCount++;
      }

      // Další patterns pro různé formáty
      const additionalPatterns = [
        { name: 'DOCVARIABLE_space', regex: new RegExp(`DOCVARIABLE\\s+${escapeRegExp(fieldName)}`, 'gi') },
        { name: '|DOCX.', regex: new RegExp(`\\|DOCX\\.${escapeRegExp(fieldName)}`, 'gi') },
        { name: 'MERGEFIELD', regex: new RegExp(`\\{\\s*MERGEFIELD\\s+${escapeRegExp(fieldName)}\\s*\\}`, 'gi') },
        { name: 'simple_braces', regex: new RegExp(`\\{${escapeRegExp(fieldName)}\\}`, 'gi') }
      ];

      additionalPatterns.forEach(({ name, regex }) => {
        const beforeLen = filledXml.length;
        filledXml = filledXml.replace(regex, String(value || ''));
        const afterLen = filledXml.length;

        if (beforeLen !== afterLen) {
          replacementCount++;
        }
      });
    });


    // Aktualizuj XML v ZIP
    zip.file('word/document.xml', filledXml);

    // Vygeneruj nový DOCX
    const outputBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    console.log('[fillDocxTemplate] Result:', {
      originalSize: templateFile.size,
      filledSize: outputBlob.size,
      fieldsProcessed: Object.keys(fieldValues).length,
      replacementsMade: replacementCount
    });

    return outputBlob;

  } catch (error) {
    throw new Error(`Chyba při zpracování DOCX šablony: ${error.message}`);
  }
};

/**
 * Vytvoří náhled polí, která budou vyplněna
 * @param {Blob} templateFile - DOCX šablona
 * @returns {Promise<Array>} - Seznam nalezených polí
 */
export const previewDocxFields = async (templateFile) => {
  try {
    const zip = await JSZip.loadAsync(templateFile);
    const documentXml = await zip.file('word/document.xml')?.async('text');

    if (!documentXml) {
      throw new Error('Neplatná DOCX šablona');
    }

    const fields = [];


    // Najdi pole ve formátu {FIELD_NAME}
    const curlyFieldMatches = documentXml.match(/\{[A-Z_0-9]+\}/g);
    if (curlyFieldMatches) {
      curlyFieldMatches.forEach(match => {
        const fieldName = match.replace(/[{}]/g, '');
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      });
    }

    // Najdi DOCVARIABLE pole
    const docVarMatches = documentXml.match(/DOCVARIABLE\s+([A-Z_0-9]+)/gi);
    if (docVarMatches) {
      docVarMatches.forEach(match => {
        const fieldName = match.replace(/DOCVARIABLE\s+/i, '');
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      });
    }

    // Najdi |DOCX. pole
    const docxFieldMatches = documentXml.match(/\|DOCX\.([A-Z_0-9]+)/gi);
    if (docxFieldMatches) {
      docxFieldMatches.forEach(match => {
        const fieldName = match.replace(/\|DOCX\./i, '');
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      });
    }

    // Najdi MERGEFIELD pole
    const mergeFieldMatches = documentXml.match(/MERGEFIELD\s+([A-Z_0-9]+)/gi);
    if (mergeFieldMatches) {
      mergeFieldMatches.forEach(match => {
        const fieldName = match.replace(/MERGEFIELD\s+/i, '');
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      });
    }

    return fields.sort();

  } catch (error) {
    return [];
  }
};

/**
 * Stáhne vyplněný soubor v prohlížeči
 * @param {Blob} fileBlob - Soubor k stažení
 * @param {string} fileName - Název souboru
 */
export const downloadBlob = (fileBlob, fileName) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(fileBlob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Escape regex speciální znaky
 * @param {string} string - String k escape
 * @returns {string} - Escaped string
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default {
  fillDocxTemplate,
  previewDocxFields,
  downloadBlob
};