/**
 * Excel Export Utility
 * 
 * Utility funkce pro export dat do Excel formátu (.xlsx) s podporou více listů.
 * Využívá knihovnu xlsx-js-style pro podporu formátování (tučné písmo, barvy, filtry).
 * 
 * @author Frontend Team
 * @date 2026-05-14
 */

import * as XLSX from 'xlsx-js-style';

/**
 * Exportuje data do Excel souboru s více listy
 * 
 * @param {Array<Object>} sheets - Array objektů s definicí jednotlivých listů
 * @param {string} sheets[].name - Název listu (max 31 znaků pro Excel)
 * @param {Array<string>} sheets[].headers - Array názvů sloupců (hlavička)
 * @param {Array<Array>} sheets[].rows - Array řádků, kde každý řádek je array hodnot
 * @param {string} filename - Název souboru (bez přípony)
 * 
 * @example
 * exportToExcel([
 *   {
 *     name: 'Objednávky',
 *     headers: ['Číslo', 'Datum', 'Částka'],
 *     rows: [
 *       ['O-2026-001', '2026-05-01', 1500],
 *       ['O-2026-002', '2026-05-02', 2300]
 *     ]
 *   },
 *   {
 *     name: 'Faktury',
 *     headers: ['VS', 'Částka'],
 *     rows: [['123456', 1500]]
 *   }
 * ], 'export_data');
 */
export function exportToExcel(sheets, filename) {
  if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
    console.warn('exportToExcel: Žádné listy k exportu');
    return;
  }

  try {
    // Vytvoření nového workbook
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = workbook.Workbook || {};
    workbook.Workbook.Views = workbook.Workbook.Views || [];

    sheets.forEach((sheet, index) => {
      const { name, headers, rows } = sheet;

      if (!headers || !Array.isArray(headers)) {
        console.warn(`exportToExcel: List ${index} nemá definované hlavičky, přeskakuji`);
        return;
      }

      if (!rows || !Array.isArray(rows)) {
        console.warn(`exportToExcel: List ${index} nemá definované řádky, přeskakuji`);
        return;
      }

      // Vytvoření listu z array dat (headers + rows)
      // aoa_to_sheet = array of arrays to sheet
      const wsData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);

      // DŮLEŽITÉ: Explicitně nastavit rozsah PŘED jakýmkoliv formátováním
      const dataRange = {
        s: { c: 0, r: 0 }, // start: A1
        e: { c: headers.length - 1, r: rows.length } // end: poslední sloupec a řádek dat (ne hlavička navíc)
      };
      worksheet['!ref'] = XLSX.utils.encode_range(dataRange);

      // Formátování: nastavení šířky sloupců podle délky dat
      const colWidths = headers.map((header, colIndex) => {
        // Najdi maximální délku hodnoty ve sloupci
        const headerLen = String(header).length;
        const maxDataLen = rows.reduce((max, row) => {
          const cellValue = String(row[colIndex] || '');
          return Math.max(max, cellValue.length);
        }, 0);
        
        // Použij větší z délky hlavičky nebo dat, s limitem 50 znaků
        const width = Math.min(Math.max(headerLen, maxDataLen) + 2, 50);
        return { wch: width };
      });

      worksheet['!cols'] = colWidths;

      // Formátování hlavičky (tučné písmo + tmavší modré pozadí)
      headers.forEach((header, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: 's', v: header };
        }
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
          fill: { fgColor: { rgb: "4472C4" } }, // Tmavě modrá
          alignment: { horizontal: "center", vertical: "center", wrapText: false },
          border: {
            top: { style: "thin", color: { rgb: "FFFFFF" } },
            bottom: { style: "thin", color: { rgb: "FFFFFF" } },
            left: { style: "thin", color: { rgb: "FFFFFF" } },
            right: { style: "thin", color: { rgb: "FFFFFF" } }
          }
        };
      });

      // Formátování datových řádků - střídavé pruhy (liché/sudé)
      rows.forEach((row, rowIndex) => {
        const actualRowIndex = rowIndex + 1; // +1 protože 0 je hlavička
        const isEven = actualRowIndex % 2 === 0;
        const bgColor = isEven ? "F2F2F2" : "FFFFFF"; // Světle šedá pro sudé, bílá pro liché
        
        row.forEach((cell, colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: actualRowIndex, c: colIndex });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: 's', v: cell };
          }
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          worksheet[cellAddress].s.fill = { fgColor: { rgb: bgColor } };
          worksheet[cellAddress].s.border = {
            top: { style: "thin", color: { rgb: "D0D0D0" } },
            bottom: { style: "thin", color: { rgb: "D0D0D0" } },
            left: { style: "thin", color: { rgb: "D0D0D0" } },
            right: { style: "thin", color: { rgb: "D0D0D0" } }
          };
        });
      });

      // Nastavení automatických filtrů - jednoduchá forma která funguje v LibreOffice i Excel
      if (rows.length > 0 && headers.length > 0) {
        // AutoFilter musí začínat od A1 a končit na posledním sloupci a řádku
        const filterRange = XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: headers.length - 1, r: rows.length }
        });
        
        // Nastavení autofilter - jednoduché přímé přiřazení
        worksheet['!autofilter'] = { ref: filterRange };
        
        // Přidání views s filterMode pro aktivaci filtrů
        if (!worksheet['!views']) worksheet['!views'] = [];
        worksheet['!views'].push({
          rightToLeft: false,
          showGridLines: true,
          showRowColHeaders: true,
          state: 'frozen',
          xSplit: 0,
          ySplit: 1,
          topLeftCell: 'A2',
          activeCell: 'A1',
          filterMode: true // Klíčové nastavení pro aktivaci filtrů
        });
      }

      // Přidání listu do workbook
      // Zkrácení názvu na max 31 znaků (limit Excel)
      let sheetName = name || `List ${index + 1}`;
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Debug: Ověření že autofilter je nastaven
      console.log(`📊 List "${sheetName}":`, {
        ref: worksheet['!ref'],
        autofilter: worksheet['!autofilter'],
        rows: rows.length,
        cols: headers.length
      });
    });

    // Nastavení workbook metadata pro podporu filtrů
    if (!workbook.Workbook) workbook.Workbook = {};
    if (!workbook.Workbook.WBProps) workbook.Workbook.WBProps = {};
    workbook.Workbook.WBProps.filterPrivacy = false;
    workbook.Workbook.WBProps.date1904 = false;

    // Export do souboru s explicitními parametry pro správnou podporu filtrů
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Použití writeFile bez speciálních options - někdy to funguje lépe
    XLSX.writeFile(workbook, fileName);

    console.log(`✅ Excel Export: ${sheets.length} listů exportováno do ${fileName}`);
  } catch (error) {
    console.error('Chyba při exportu do Excel:', error);
    throw new Error(`Export do Excel selhal: ${error.message}`);
  }
}

/**
 * Převede číselnou hodnotu na formát pro Excel
 * (zajistí že čísla budou v Excelu čísla, ne text)
 * 
 * @param {*} value - Hodnota k převodu
 * @returns {number|string} Číslo nebo string
 */
export function formatValueForExcel(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Pokud je to již číslo, vrátíme ho
  if (typeof value === 'number') {
    return value;
  }

  // Pokus o konverzi string na číslo
  if (typeof value === 'string') {
    // Odstranit mezery a nahradit desetinnou čárku tečkou
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    
    // Pokud je validní číslo, vrátíme ho jako number
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }

  // Jinak vrátíme jako string
  return String(value);
}

export default {
  exportToExcel,
  formatValueForExcel
};
