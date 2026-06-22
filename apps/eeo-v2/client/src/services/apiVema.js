/**
 * VEMA Deník - API Service
 * Frontend služba pro komunikaci s VEMA endpointy
 * 
 * @author EEO Development Team
 * @date 2026-06-22
 */

// API Base URL z .env
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Načte seznam firem z VEMA systému
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.limit - Max počet záznamů (výchozí: 1000)
 * @param {number} params.offset - Offset pro stránkování (výchozí: 0)
 * @param {string} params.search - Vyhledávací text (název, IČO, email)
 * @param {string} params.stav - Filtr stavu ('aktivni', 'smazano', 'neaktivni')
 * @returns {Promise<Object>} Response {status, data, count, pagination, message}
 */
export async function loadVemaFirmy({ token, username, limit = 1000, offset = 0, search = '', stav = '' }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }

  const response = await fetch(`${API_BASE_URL}/vema/firmy/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      limit,
      offset,
      search,
      stav
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte seznam faktur z VEMA systému
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.limit - Max počet záznamů (výchozí: 500)
 * @param {number} params.offset - Offset pro stránkování (výchozí: 0)
 * @param {number} params.firma - Filtr na ID firmy
 * @param {number} params.stav - Filtr na stav faktury
 * @param {number} params.vlast - Filtr na vlastníka
 * @param {number} params.usek - Filtr na úsek
 * @param {string} params.search - Vyhledávací text (číslo faktury, název)
 * @returns {Promise<Object>} Response {status, data, count, pagination, message}
 */
export async function loadVemaFaktury({ 
  token, 
  username, 
  limit = 500, 
  offset = 0, 
  firma = null, 
  stav = null,
  vlast = null,
  usek = null,
  search = '' 
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }

  const payload = {
    token,
    username,
    limit,
    offset,
    search
  };

  // Přidat volitelné filtry pouze pokud jsou zadány
  if (firma !== null) payload.firma = firma;
  if (stav !== null) payload.stav = stav;
  if (vlast !== null) payload.vlast = vlast;
  if (usek !== null) payload.usek = usek;

  const response = await fetch(`${API_BASE_URL}/vema/faktury/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte seznam smluv z VEMA systému
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.limit - Max počet záznamů (výchozí: 500)
 * @param {number} params.offset - Offset pro stránkování (výchozí: 0)
 * @param {number} params.firma - Filtr na ID firmy
 * @param {number} params.typsml - Filtr na typ smlouvy
 * @param {number} params.usek - Filtr na úsek
 * @param {string} params.search - Vyhledávací text (číslo smlouvy, název)
 * @returns {Promise<Object>} Response {status, data, count, pagination, message}
 */
export async function loadVemaSmlouvy({ 
  token, 
  username, 
  limit = 500, 
  offset = 0, 
  firma = null, 
  typsml = null,
  usek = null,
  search = '' 
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }

  const payload = {
    token,
    username,
    limit,
    offset,
    search
  };

  // Přidat volitelné filtry pouze pokud jsou zadány
  if (firma !== null) payload.firma = firma;
  if (typsml !== null) payload.typsml = typsml;
  if (usek !== null) payload.usek = usek;

  const response = await fetch(`${API_BASE_URL}/vema/smlouvy/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload a import VEMA XLSX souborů
 * Parsuje 3 Excel soubory a importuje data do databáze
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {File} params.firmyuplFile - firmyupl.xlsx soubor
 * @param {File} params.fpazahlFile - fpazahl.xlsx soubor
 * @param {File} params.smlaFile - smla.xlsx soubor
 * @param {Function} params.onProgress - Callback pro progress update (0-100)
 * @returns {Promise<Object>} Response {status, message, data: {batch_id, imported}}
 */
export async function uploadVemaFiles({ 
  token, 
  username, 
  firmyuplFile, 
  fpazahlFile, 
  smlaFile,
  onProgress = () => {}
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }

  if (!firmyuplFile || !fpazahlFile || !smlaFile) {
    throw new Error('Musíte nahrát všechny 3 soubory (firmyupl, fpazahl, smla)');
  }

  // Dynamický import xlsx knihovny
  const XLSX = await import('xlsx');

  try {
    onProgress(10);

    // Parsování firmyupl.xlsx
    const firmyuplData = await parseXLSXFile(firmyuplFile, XLSX);
    onProgress(30);

    // Parsování fpazahl.xlsx
    const fpazahlData = await parseXLSXFile(fpazahlFile, XLSX);
    onProgress(50);

    // Parsování smla.xlsx
    const smlaData = await parseXLSXFile(smlaFile, XLSX);
    onProgress(70);

    // Odeslání na backend jako JSON
    const response = await fetch(`${API_BASE_URL}/vema/import/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        firmyupl: firmyuplData,
        fpazahl: fpazahlData,
        smla: smlaData
      }),
    });

    onProgress(90);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    onProgress(100);

    return result;
  } catch (error) {
    onProgress(0);
    throw error;
  }
}

/**
 * Helper: Parsování XLSX souboru do pole objektů
 * @private
 */
async function parseXLSXFile(file, XLSX) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Předpokládáme že data jsou na prvním sheetu
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Převod na JSON (pole objektů)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: true,  // Zachovat čísla (včetně Excel serial dates)
          defval: null // Prázdné buňky jako null
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Chyba při parsování XLSX souboru: ' + error.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Konverze Excel serial date na JS Date
 * Excel serial date je počet dní od 1900-01-01
 * 
 * @param {number} serial - Excel serial date (např. 46140)
 * @returns {Date|null} JS Date objekt nebo null
 */
export function excelSerialToDate(serial) {
  if (!serial || serial === 0) return null;
  
  // Excel epoch start: 1900-01-01 (minus 2 dny kvůli Excel bug s rokem 1900)
  const excelEpoch = new Date(1899, 11, 30);
  const milliseconds = serial * 86400000; // 24*60*60*1000
  
  return new Date(excelEpoch.getTime() + milliseconds);
}

/**
 * Formátování Excel serial date na string
 * 
 * @param {number} serial - Excel serial date
 * @param {string} format - Formát ('date' | 'datetime' | 'iso')
 * @returns {string|null} Formátovaný datum nebo null
 */
export function formatExcelDate(serial, format = 'date') {
  const date = excelSerialToDate(serial);
  if (!date) return null;
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString('cs-CZ');
    case 'datetime':
      return date.toLocaleString('cs-CZ');
    case 'iso':
      return date.toISOString().split('T')[0];
    default:
      return date.toLocaleDateString('cs-CZ');
  }
}


/**
 * Smaže všechna VEMA data ze všech 3 tabulek (TRUNCATE)
 * Pouze pro SUPERADMIN!
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @returns {Promise<Object>} Response {status, message, deleted_counts}
 */
export async function truncateVemaData({ token, username }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }

  const response = await fetch(`${API_BASE_URL}/vema/truncate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
