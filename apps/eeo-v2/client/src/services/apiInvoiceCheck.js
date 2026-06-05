/**
 * API funkce pro kontrolu řádků faktur (InvoiceCheckHandlers)
 * Datum: 2026-01-20
 * Aktualizace: 2026-06-05 - Přidána podpora pro věcnou správnost (status 0/1/2)
 * 
 * Endpointy:
 * - POST /invoices/toggle-check - Přepne stav kontroly faktury (nebo věcnou správnost)
 * - POST /invoices/get-checks    - Načte stavy kontrol pro více faktur
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Konstanty pro stavy věcné správnosti
 * Odpovídá VS_STATUS_* konstantám v PHP backend (api.php)
 */
export const VS_STATUS = {
  NEPOTVRZENA: 0,  // Neověřeno (faktura předána ke kontrole)
  POTVRZENA: 1,    // Potvrzeno (poznámka volitelná)
  ZAMITNUTA: 2     // Zamítnuto (poznámka POVINNÁ = důvod)
};

/**
 * Přepne stav kontroly faktury (checkbox v řádku tabulky)
 * 
 * BACKWARD COMPATIBILITY:
 * - Pokud je kontrolovano (bool), mapuje se na status 0/1
 * - Nový způsob: použít status (0/1/2) pro věcnou správnost
 * 
 * @param {number} fakturaId - ID faktury
 * @param {boolean|number} kontrolovanoOrStatus - DEPRECATED: boolean kontrolovano NEBO status (0/1/2)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {string} [poznamka] - Poznámka k věcné správnosti (POVINNÁ pro status 2)
 * @returns {Promise<Object>} Response s informací o změně
 */
export async function toggleInvoiceCheck(fakturaId, kontrolovanoOrStatus, token, username, poznamka = '') {
  const payload = {
    token,
    username,
    faktura_id: fakturaId
  };
  
  // Backward compatibility: kontrolovano (bool) → status 0/1
  if (typeof kontrolovanoOrStatus === 'boolean') {
    payload.kontrolovano = kontrolovanoOrStatus;
  } else {
    // Nový způsob: status 0/1/2
    payload.status = kontrolovanoOrStatus;
    
    if (poznamka) {
      payload.vecna_spravnost_poznamka = poznamka;
    }
  }

  const response = await fetch(`${API_BASE_URL}/invoices/toggle-check`, {
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
 * Nastaví věcnou správnost faktury (0=neověřeno, 1=potvrzeno, 2=zamítnuto)
 * 
 * POUŽITÍ:
 * - status 0: Reset (vrátit fakturu k novému ověření)
 * - status 1: Potvrdit (poznámka volitelná)
 * - status 2: Zamítnout (poznámka POVINNÁ - min 5 znaků)
 * 
 * ZAMKNUTÍ:
 * - Pokud je faktura zamítnuta (status 2) a účetní ji pak neupravila,
 *   backend vrátí HTTP 423 Locked
 * - Odemčení: účetní upraví fakturu (dt_aktualizace > dt_potvrzeni)
 * 
 * @param {number} fakturaId - ID faktury
 * @param {number} status - 0=neověřeno, 1=potvrzeno, 2=zamítnuto
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {string} [poznamka] - Poznámka (POVINNÁ pro status 2, volitelná pro 1)
 * @returns {Promise<Object>} Response { status, message, data }
 * @throws {Error} Pokud je faktura uzamčena (423) nebo chybí povinná poznámka
 */
export async function toggleVecnaSpravnost(fakturaId, status, token, username, poznamka = '') {
  // Validace na FE straně (backend má vlastní validaci)
  if (status === VS_STATUS.ZAMITNUTA && (!poznamka || poznamka.trim().length < 5)) {
    throw new Error('Pro zamítnutí faktury je povinný důvod (minimálně 5 znaků)');
  }
  
  if (![VS_STATUS.NEPOTVRZENA, VS_STATUS.POTVRZENA, VS_STATUS.ZAMITNUTA].includes(status)) {
    throw new Error('Neplatný status věcné správnosti. Musí být 0, 1 nebo 2.');
  }

  const response = await fetch(`${API_BASE_URL}/invoices/toggle-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      faktura_id: fakturaId,
      status,
      vecna_spravnost_poznamka: poznamka || undefined
    }),
  });

  if (!response.ok) {
    // HTTP 423 Locked = faktura je uzamčena
    if (response.status === 423) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Faktura je uzamčena. Požádejte účetní o opravu faktury před novým rozhodnutím.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte stavy kontrol pro více faktur najednou
 * @param {number[]} fakturaIds - Pole ID faktur
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response s mapou faktura_id => kontrola_stav
 */
export async function getInvoiceChecks(fakturaIds, token, username) {
  const response = await fetch(`${API_BASE_URL}/invoices/get-checks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      faktura_ids: fakturaIds
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
