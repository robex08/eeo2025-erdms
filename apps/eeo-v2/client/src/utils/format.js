// Date/time small helpers
export function prettyDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d)) return dt;

  // Formátujeme bez mezer - 19.10.2025 16:30:00
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');

  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
}

export function formatDateOnly(dt) {
  if (!dt) return '00.00.0000';
  const d = new Date(dt);
  if (isNaN(d)) return '00.00.0000';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Moderní CSV export s podporou dynamických sloupců a separátorů
 * @param {Array<Object>} rows - Pole objektů k exportu (každý objekt = 1 řádek)
 * @param {string} filename - Název souboru bez přípony
 * @param {Object} options - Volitelné parametry
 * @param {string} options.separator - Oddělovač sloupců: ';' (default), ',' nebo '\t'
 * @param {boolean} options.includeBOM - Přidat UTF-8 BOM pro Excel (default: true)
 */
export function exportCsv(rows, filename = 'export', options = {}) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    console.warn('exportCsv: Žádná data k exportu');
    return;
  }

  // Výchozí nastavení
  const separator = options.separator || ';'; // Středoevropský standard je středník
  const includeBOM = options.includeBOM !== false; // Default true
  
  // Získej všechny sloupce z prvního řádku (předpokládáme konzistentní strukturu)
  const columns = Object.keys(rows[0]);
  
  if (columns.length === 0) {
    console.warn('exportCsv: První řádek neobsahuje žádné sloupce');
    return;
  }

  const lines = [];
  
  // Hlavička - názvy sloupců
  lines.push(columns.map(col => `"${String(col).replace(/"/g, '""')}"`).join(separator));
  
  // Řádky dat
  for (const row of rows) {
    const values = columns.map(col => {
      const value = row[col];
      
      // Zpracování null/undefined
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Zpracování hodnot
      let stringValue = String(value);
      
      // Escapování uvozovek (Excel standard)
      stringValue = stringValue.replace(/"/g, '""');
      
      // Obalení uvozovkami (bezpečné pro separátory a nové řádky v datech)
      return `"${stringValue}"`;
    });
    
    lines.push(values.join(separator));
  }
  
  // Sestavení CSV
  let csvContent = lines.join('\n');
  
  // Přidání UTF-8 BOM pro správné zobrazení v Excelu
  // BOM zajistí, že Excel správně rozpozná UTF-8 kódování (diakritika, spec. znaky)
  if (includeBOM) {
    csvContent = '\uFEFF' + csvContent;
  }
  
  // Vytvoření a stažení souboru
  const blob = new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log(`✅ CSV Export: ${rows.length} řádků, ${columns.length} sloupců, separátor: "${separator}"`);
}
