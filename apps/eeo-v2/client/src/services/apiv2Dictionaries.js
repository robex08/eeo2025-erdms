/**
 * API služby pro číselníky - FINÁLNÍ VERZE podle BE dokumentace
 *
 * 🎯 FINÁLNÍ API:
 * - Base URL: /api.eeo/ciselniky/
 * - VŠE přes POST (i list, detail)
 * - VŽDY username + token v body
 * - Response: { "status": "ok", "data": [...] } nebo { "err": "message" }
 * - DELETE = HARD DELETE (skutečně maže z DB)
 *
 * 📋 Endpointy a parametry:
 *
 * LOKALITY (lokality/list|by-id|insert|update|delete)
 * - Pole: id, nazev, typ, parent_id, aktivni, pocet_uzivatelu
 * - Parametr: show_inactive (boolean) - true = i neaktivní, false = pouze aktivní
 *
 * POZICE (pozice/list|by-id|insert|update|delete)
 * - Pole: id, nazev_pozice, parent_id, usek_id, aktivni, usek_id_detail, usek_nazev, usek_zkr, pocet_uzivatelu
 * - Parametr: show_inactive (boolean)
 *
 * ÚSEKY (useky/list|by-id|insert|update|delete)
 * - Pole: id, usek_nazev, usek_zkr, aktivni, pocet_uzivatelu
 * - Parametr: show_inactive (boolean)
 *
 * ORGANIZACE (organizace/list|by-id|insert|update|delete)
 * - Pole: id, nazev_organizace, ico, dic, ulice_cislo, mesto, psc, zastoupeny,
 *         datova_schranka, email, telefon, dt_vytvoreni, dt_aktualizace, aktivni, pocet_uzivatelu
 * - Parametr: aktivni (1 = pouze aktivní, 0 = pouze neaktivní, neuvedeno = všechny)
 *
 * PRÁVA (prava/list|by-id)
 * - Pole: id, kod_prava, popis, aktivni, pocet_uzivatelu
 * - Parametr: show_inactive (boolean)
 *
 * ROLE (role/list|by-id|list-enriched)
 * - Pole: id, nazev_role, popis, aktivni
 * - /list-enriched: + prava_globalni[], statistiky { pocet_prav, pocet_uzivatelu }
 * - Parametr: show_inactive (boolean)
 *
 * STAVY (stavy/list) - read-only
 * DODAVATELÉ (dodavatele/list|by-id) - read-only
 *
 * 💡 POZNÁMKY:
 * - pocet_uzivatelu = počet uživatelů přiřazených k danému záznamu
 * - pocet_uzivatelu u práv v rolích = celkový počet napříč všemi rolemi + personalizace
 * - aktivni: 1 = aktivní, 0 = neaktivní (soft delete)
 *
 * @author Frontend Team
 * @date 2025-10-24
 * @version 5.0 - Aktualizováno podle nové BE dokumentace (aktivni parametry)
 */

import axios from 'axios';

// Base URL pro číselníky API - nové finální API včetně api.eeo prefixu
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

// Axios instance - VŠE přes POST s prefixem ciselniky/
const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// ERROR HANDLING - podle Orders25 pattern
// =============================================================================

const handleApiError = (error, defaultMessage = 'Chyba serveru') => {
  if (error.response) {
    const { status, data } = error.response;
    // Priorita: 1. data.err, 2. data.error, 3. data.message, 4. default
    const errorMessage = data?.err || data?.error || data?.message || defaultMessage;

    switch (status) {
      case 401:
        throw new Error('Neplatný token. Přihlaste se znovu.');
      case 403:
        throw new Error('Nemáte oprávnění k této akci.');
      case 404:
        throw new Error('Záznam nebyl nalezen.');
      case 400:
        throw new Error(errorMessage);
      default:
        throw new Error(errorMessage);
    }
  } else if (error.request) {
    throw new Error('Server neodpovídá. Zkontrolujte připojení.');
  } else {
    throw new Error(error.message || defaultMessage);
  }
};

// Pomocná funkce pro kontrolu response - standardizovaný BE formát
const checkResponse = (response, operation = 'operace') => {
  // Kontrola chyby v response (priorita)
  if (response.data?.err) {
    throw new Error(response.data.err);
  }

  // Kontrola error status
  if (response.data?.status === 'error') {
    throw new Error(response.data.message || `${operation} se nezdařila`);
  }

  // Kontrola úspěšného status
  if (response.data?.status !== 'ok') {
    throw new Error(`${operation} se nezdařila - neplatný status`);
  }

  return response.data;
};

// =============================================================================
// 1. LOKALITY
// =============================================================================

/**
 * DB struktura: id, nazev, typ, parent_id, aktivni, pocet_uzivatelu
 * Parametr: show_inactive (boolean) - true = i neaktivní, false/neuvedeno = pouze aktivní
 */

export async function getLokalityList({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/lokality/list', {
      username,
      token,
      show_inactive
    });

    const data = checkResponse(response, 'Načítání lokalit');
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání lokalit');
    throw error;
  }
}

export async function getLokalitaDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/lokality/by-id', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Načítání detailu lokality');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu lokality');
    throw error;
  }
}

export async function createLokalita({ token, username, nazev, typ, parent_id }) {
  try {
    const response = await api.post('ciselniky/lokality/insert', {
      username,
      token,
      nazev,
      typ,
      parent_id
    });

    const data = checkResponse(response, 'Vytváření lokality');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření lokality');
    throw error;
  }
}

export async function updateLokalita({ token, username, id, nazev, typ, parent_id }) {
  try {
    const payload = { username, token, id };
    if (nazev !== undefined) payload.nazev = nazev;
    if (typ !== undefined) payload.typ = typ;
    if (parent_id !== undefined) payload.parent_id = parent_id;

    const response = await api.post('ciselniky/lokality/update', payload);

    const data = checkResponse(response, 'Aktualizace lokality');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci lokality');
    throw error;
  }
}

export async function deleteLokalita({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/lokality/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání lokality');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání lokality');
    throw error;
  }
}

// =============================================================================
// 2. POZICE
// =============================================================================

/**
 * DB struktura: id, nazev_pozice, parent_id, usek_id, aktivni, pocet_uzivatelu
 * ⚠️ POZOR: nazev_pozice (ne jen "nazev")!
 * Parametr: show_inactive (boolean)
 */

export async function getPoziceList({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/pozice/list', {
      username,
      token,
      show_inactive
    });

    const data = checkResponse(response, 'Načítání pozic');
    const positions = Array.isArray(data.data) ? data.data : [];
    // Mapování nazev_pozice -> nazev pro UI konzistenci
    return positions.map(item => ({
      ...item,
      nazev: item.nazev_pozice || item.nazev
    }));
  } catch (error) {
    handleApiError(error, 'Chyba při načítání pozic');
    throw error;
  }
}

export async function getPoziceDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/pozice/by-id', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Načítání detailu pozice');
    if (data.data) {
      const item = data.data;
      return {
        ...item,
        nazev: item.nazev_pozice || item.nazev
      };
    }
    return null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu pozice');
    throw error;
  }
}

export async function createPozice({ token, username, nazev_pozice, parent_id, usek_id }) {
  try {
    const response = await api.post('ciselniky/pozice/insert', {
      username,
      token,
      nazev_pozice,
      usek_id
    });

    const data = checkResponse(response, 'Vytváření pozice');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření pozice');
    throw error;
  }
}

export async function updatePozice({ token, username, id, nazev, parent_id, usek_id }) {
  try {
    const payload = { username, token, id };
    if (nazev !== undefined) payload.nazev_pozice = nazev;
    if (parent_id !== undefined) payload.parent_id = parent_id;
    if (usek_id !== undefined) payload.usek_id = usek_id;

    const response = await api.post('ciselniky/pozice/update', payload);

    const data = checkResponse(response, 'Aktualizace pozice');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci pozice');
    throw error;
  }
}

export async function deletePozice({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/pozice/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání pozice');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání pozice');
    throw error;
  }
}

// =============================================================================
// 3. ÚSEKY
// =============================================================================

/**
 * DB struktura: id, usek_nazev, usek_zkr, aktivni, pocet_uzivatelu
 * ⚠️ POZOR: usek_nazev a usek_zkr podle finální BE dokumentace!
 * Parametr: show_inactive (boolean)
 */

export async function getUsekyList({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/useky/list', {
      username,
      token,
      show_inactive
    });

    const data = checkResponse(response, 'Načítání úseků');
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání úseků');
    throw error;
  }
}

export async function getUsekDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/useky/by-id', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Načítání detailu úseku');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu úseku');
    throw error;
  }
}

export async function createUsek({ token, username, nazev_useku, zkratka }) {
  try {
    const response = await api.post('ciselniky/useky/insert', {
      username,
      token,
      nazev_useku,
      zkratka
    });

    const data = checkResponse(response, 'Vytváření úseku');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření úseku');
    throw error;
  }
}

export async function updateUsek({ token, username, id, nazev_useku, zkratka }) {
  try {
    const response = await api.post('ciselniky/useky/update', {
      username,
      token,
      id,
      nazev_useku,
      zkratka
    });

    const data = checkResponse(response, 'Aktualizace úseku');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci úseku');
    throw error;
  }
}

export async function deleteUsek({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/useky/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání úseku');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání úseku');
    throw error;
  }
}

// =============================================================================
// 4. ORGANIZACE
// =============================================================================

/**
 * DB struktura: id, nazev_organizace, ico, dic, ulice_cislo, mesto, psc,
 *               zastoupeny, datova_schranka, email, telefon,
 *               dt_vytvoreni, dt_aktualizace, aktivni, pocet_uzivatelu
 * ⚠️ POZOR:
 * - nazev_organizace (ne jen "nazev")
 * - parametr "aktivni" (1 = pouze aktivní, 0 = pouze neaktivní, neuvedeno/null = všechny)
 */

export async function getOrganizaceList({ token, username, aktivni = null }) {
  try {
    const payload = {
      username,
      token
    };

    // Přidat aktivni pouze pokud je specifikováno (1 nebo 0)
    if (aktivni !== null && aktivni !== undefined) {
      payload.aktivni = aktivni;
    }

    const response = await api.post('ciselniky/organizace/list', payload);

    const data = checkResponse(response, 'Načítání organizací');
    const organizations = Array.isArray(data.data) ? data.data : [];
    // Mapování nazev_organizace -> nazev pro UI konzistenci
    return organizations.map(item => ({
      ...item,
      nazev: item.nazev_organizace || item.nazev
    }));
  } catch (error) {
    handleApiError(error, 'Chyba při načítání organizací');
    throw error;
  }
}

export async function getOrganizaceDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/organizace/by-id', {
      username,
      token,
      id
    });

    if (response.data?.status === 'ok' && response.data?.data) {
      const item = response.data.data;
      return {
        ...item,
        nazev: item.nazev_organizace || item.nazev
      };
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu organizace');
    throw error;
  }
}

export async function createOrganizace({ token, username, nazev_organizace, ico, adresa, email, telefon }) {
  try {
    const response = await api.post('ciselniky/organizace/insert', {
      username,
      token,
      nazev_organizace,
      ico,
      adresa,
      email,
      telefon
    });

    const data = checkResponse(response, 'Vytváření organizace');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření organizace');
    throw error;
  }
}

export async function updateOrganizace({ token, username, id, nazev_organizace, ico, adresa, email, telefon }) {
  try {
    const payload = { username, token, id };
    if (nazev_organizace !== undefined) payload.nazev_organizace = nazev_organizace;
    if (ico !== undefined) payload.ico = ico;
    if (adresa !== undefined) payload.adresa = adresa;
    if (email !== undefined) payload.email = email;
    if (telefon !== undefined) payload.telefon = telefon;

    const response = await api.post('ciselniky/organizace/update', payload);

    const data = checkResponse(response, 'Aktualizace organizace');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci organizace');
    throw error;
  }
}

export async function deleteOrganizace({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/organizace/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání organizace');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání organizace');
    throw error;
  }
}

// =============================================================================
// 5. DODAVATELÉ (Read-only)
// =============================================================================

export async function getDodavateleList({ token, username }) {
  try {
    const response = await api.post('ciselniky/dodavatele/list', {
      username,
      token
    });

    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
  } catch (error) {
    handleApiError(error, 'Chyba při načítání dodavatelů');
    throw error;
  }
}

export async function getDodavatelDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/dodavatele/by-id', {
      username,
      token,
      id
    });

    if (response.data?.status === 'ok' && response.data?.data) {
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu dodavatele');
    throw error;
  }
}

// =============================================================================
// 6. STAVY
// =============================================================================

/**
 * Načte seznam stavů z BE
 * @param {string} token - Autentizační token
 * @param {string} username - Uživatelské jméno
 * @param {boolean} zobrazit_neaktivni - Zobrazit i neaktivní stavy (aktivni=0)
 * @param {boolean} zobrazit_prosle - Zobrazit i stavy s prošlou platností
 * @param {string} typ_objektu - Filtr podle typu (OBJEDNAVKA, FAKTURA, ...)
 */
export async function getStavyList({ token, username, zobrazit_neaktivni = false, zobrazit_prosle = false, typ_objektu = null }) {
  try {
    const payload = {
      username,
      token,
      zobrazit_neaktivni,
      zobrazit_prosle
    };

    // Přidat typ_objektu pouze pokud je zadán
    if (typ_objektu) {
      payload.typ_objektu = typ_objektu;
    }

    const response = await api.post('ciselniky/stavy/list', payload);

    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání stavů');
    throw error;
  }
}

/**
 * Vytvoří nový stav
 */
export async function createStav({ token, username, ...data }) {
  try {
    const response = await api.post('ciselniky/stavy/create', {
      username,
      token,
      ...data
    });

    checkResponse(response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření stavu');
    throw error;
  }
}

/**
 * Aktualizuje existující stav
 */
export async function updateStav({ token, username, id, ...data }) {
  try {
    const response = await api.post('ciselniky/stavy/update', {
      username,
      token,
      id,
      ...data
    });

    checkResponse(response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci stavu');
    throw error;
  }
}

/**
 * Smaže stav
 */
export async function deleteStav({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/stavy/delete', {
      username,
      token,
      id
    });

    checkResponse(response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání stavu');
    throw error;
  }
}

// =============================================================================
// 7. ROLE (Read-only většinou)
// =============================================================================

export async function getRoleList({ token, username }) {
  try {
    const response = await api.post('ciselniky/role/list', {
      username,
      token
    });

    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
    return [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání rolí');
    throw error;
  }
}

/**
 * Načte seznam rolí obohacený o práva (globální + personalizované)
 *
 * @param {object} params
 * @param {string} params.token - JWT token
 * @param {string} params.username - Uživatelské jméno
 * @param {boolean} [params.show_inactive=false] - Zobrazit i neaktivní záznamy
 * @returns {Promise<Array>} Pole rolí s právy
 *
 * Response struktura (AKTUÁLNÍ - 25.10.2025):
 * {
 *   id: number,
 *   nazev_role: string,
 *   popis: string | null,
 *   aktivni: 0 | 1,
 *   dt_vytvoreni: string (ISO datetime),
 *   dt_aktualizace: string (ISO datetime),
 *   prava_globalni: [{
 *     id: number,
 *     kod_prava: string,
 *     popis: string | null,
 *     pravo_aktivni: 0 | 1,
 *     vazba_aktivni: 0 | 1,
 *     pocet_uzivatelu: number
 *   }],
 *   statistiky: {
 *     pocet_prav: number,           // Počet globálních práv role
 *     pocet_uzivatelu: number        // Celkový počet uživatelů s touto rolí
 *   }
 * }
 */
export async function getRoleListEnriched({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/role/list-enriched', {
      username,
      token,
      show_inactive
    });

    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání rolí s právy');
    throw error;
  }
}

export async function getRoleDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/role/by-id', {
      username,
      token,
      id
    });

    if (response.data?.status === 'ok' && response.data?.data) {
      return response.data.data;
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
    return null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu role');
    throw error;
  }
}

// =============================================================================
// 8. PRÁVA (Read-only většinou)
// =============================================================================

/**
 * DB struktura: id, kod_prava, popis, aktivni, pocet_uzivatelu
 * Parametr: show_inactive (boolean)
 */

export async function getPravaList({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/prava/list', {
      username,
      token,
      show_inactive
    });

    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
    return [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání práv');
    throw error;
  }
}

export async function getPravoDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/prava/by-id', {
      username,
      token,
      id
    });

    if (response.data?.status === 'ok' && response.data?.data) {
      return response.data.data;
    }
    // Opraveno: checkResponse() funkce již kontroluje status a err field
    return null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu práva');
    throw error;
  }
}

export async function createPravo({ token, username, kod_prava, popis, aktivni }) {
  try {
    const response = await api.post('ciselniky/prava/insert', {
      username,
      token,
      kod_prava,
      popis,
      aktivni: aktivni ? 1 : 0
    });

    const data = checkResponse(response, 'Vytváření práva');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření práva');
    throw error;
  }
}

export async function updatePravo({ token, username, id, kod_prava, popis, aktivni }) {
  try {
    const payload = { username, token, id };
    if (kod_prava !== undefined) payload.kod_prava = kod_prava;
    if (popis !== undefined) payload.popis = popis;
    if (aktivni !== undefined) payload.aktivni = aktivni ? 1 : 0;

    const response = await api.post('ciselniky/prava/update', payload);

    const data = checkResponse(response, 'Aktualizace práva');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci práva');
    throw error;
  }
}

export async function deletePravo({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/prava/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání práva');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání práva');
    throw error;
  }
}

// =============================================================================
// 8B. ROLE - CRUD API
// =============================================================================

export async function createRole({ token, username, nazev_role, popis, aktivni }) {
  try {
    const response = await api.post('ciselniky/role/insert', {
      username,
      token,
      nazev_role,
      popis,
      aktivni: aktivni ? 1 : 0
    });

    const data = checkResponse(response, 'Vytváření role');
    return data.data || null;
  } catch (error) {
    console.error('🔴 createRole ERROR:', error);
    handleApiError(error, 'Chyba při vytváření role');
    throw error;
  }
}

export async function updateRole({ token, username, id, nazev_role, popis, aktivni }) {
  try {
    const payload = { username, token, id };
    if (nazev_role !== undefined) payload.nazev_role = nazev_role;
    if (popis !== undefined) payload.popis = popis;
    if (aktivni !== undefined) payload.aktivni = aktivni ? 1 : 0;

    const response = await api.post('ciselniky/role/update', payload);

    const data = checkResponse(response, 'Aktualizace role');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci role');
    throw error;
  }
}

export async function deleteRole({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/role/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání role');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání role');
    throw error;
  }
}

// Přidělování práv k roli
export async function assignPravoToRole({ token, username, role_id, pravo_id }) {
  try {
    const payload = {
      username,
      token,
      role_id: parseInt(role_id, 10),  // Ensure integer
      pravo_id: parseInt(pravo_id, 10)  // Ensure integer
    };
    
    const response = await api.post('ciselniky/role/assign-pravo', payload);
    
    const data = checkResponse(response, 'Přidělení práva k roli');
    return data;
  } catch (error) {
    console.error('🔴 assignPravoToRole ERROR:', error);
    handleApiError(error, 'Chyba při přidělování práva');
    throw error;
  }
}

export async function removePravoFromRole({ token, username, role_id, pravo_id }) {
  try {
    const payload = {
      username,
      token,
      role_id: parseInt(role_id, 10),  // Ensure integer
      pravo_id: parseInt(pravo_id, 10)  // Ensure integer
    };
    
    const response = await api.post('ciselniky/role/remove-pravo', payload);
    
    const data = checkResponse(response, 'Odebrání práva z role');
    return data;
  } catch (error) {
    console.error('🔴 removePravoFromRole ERROR:', error);
    handleApiError(error, 'Chyba při odebírání práva');
    throw error;
  }
}

/**
 * Vyčištění duplicitních práv v rolích
 * POUZE PRO SUPERADMIN! Mění data v DB.
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {boolean} params.dry_run - Pokud true, pouze ukáže duplicity bez mazání
 * @returns {Promise<Object>} Response s počtem smazaných duplicit
 */
export async function cleanupDuplicatePrava({ token, username, dry_run = false }) {
  try {
    const response = await api.post('ciselniky/role/cleanup-duplicates', {
      username,
      token,
      confirm_cleanup: true,
      dry_run
    });

    return checkResponse(response, dry_run ? 'Náhled duplicit načten' : 'Duplicity byly vyčištěny');
  } catch (error) {
    console.error('🔴 ERROR cleanupDuplicatePrava:', error);
    handleApiError(error, 'Chyba při čištění duplicit');
    throw error;
  }
}

/**
 * Hromadná aktualizace práv role (přidání + odebrání v jedné transakci)
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.role_id - ID role
 * @param {number[]} params.prava_to_add - Pole ID práv k přidání (default: [])
 * @param {number[]} params.prava_to_remove - Pole ID práv k odebrání (default: [])
 * @returns {Promise<Object>} Response s počtem přidaných/odebraných práv
 */
export async function bulkUpdateRolePrava({ 
  token, 
  username, 
  role_id, 
  prava_to_add = [], 
  prava_to_remove = [] 
}) {
  try {
    const response = await api.post('ciselniky/role/bulk-update-prava', {
      username,
      token,
      role_id: parseInt(role_id, 10),
      prava_to_add: prava_to_add.map(id => parseInt(id, 10)),
      prava_to_remove: prava_to_remove.map(id => parseInt(id, 10))
    });

    return checkResponse(response, 'Práva byla aktualizována');
  } catch (error) {
    console.error('❌ bulkUpdateRolePrava ERROR:', error);
    handleApiError(error, 'Chyba při hromadné aktualizaci práv');
    throw error;
  }
}

// =============================================================================
// 9. DOCX ŠABLONY - KOMPLETNÍ API podle BE dokumentace
// =============================================================================

/**
 * Seznam všech DOCX šablon
 */
export async function getDocxSablonyList({ token, username, aktivni = null, typ_dokumentu = null, search = null, cena_bez_dph = null }) {
  try {
    const requestData = {
      username,
      token
    };

    // Přidat volitelné filtry
    if (aktivni !== null) requestData.aktivni = aktivni;
    if (typ_dokumentu) requestData.typ_dokumentu = typ_dokumentu;
    if (search) requestData.search = search;
    if (cena_bez_dph !== null && cena_bez_dph !== undefined) requestData.cena_bez_dph = cena_bez_dph;

    const response = await api.post('sablona_docx/list', requestData);

    return checkResponse(response, 'Seznam DOCX šablon načten');
  } catch (error) {
    handleApiError(error, 'Chyba při načítání DOCX šablon');
    throw error;
  }
}

/**
 * Detail konkrétní DOCX šablony
 */
export async function getDocxSablonaDetail({ token, username, id }) {
  try {
    const response = await api.post('sablona_docx/detail', {
      username,
      token,
      id
    });

    return checkResponse(response, 'Detail DOCX šablony načten');
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu DOCX šablony');
    throw error;
  }
}

/**
 * Vytvoření nové DOCX šablony (ZACHOVAT STÁVAJÍCÍ CHOVÁNÍ)
 */
export const createDocxSablona = async (token, formData) => {

  const response = await axios.post(
    `${API_BASE_URL}sablona_docx/create`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return checkResponse(response, 'DOCX šablona byla úspěšně vytvořena');
};

/**
 * Aktualizace pouze metadata (bez souboru)
 */
export async function updateDocxSablona({ token, username, id, nazev, popis, typ_dokumentu, aktivni, verze, castka_od, castka_do, platnost_od, platnost_do, mapovani_json, docx_mapping }) {
  try {
    const requestData = {
      username,
      token,
      id
    };

    // Přidat pouze pole, která se mají aktualizovat
    if (nazev !== undefined) requestData.nazev = nazev;
    if (popis !== undefined) requestData.popis = popis;
    if (typ_dokumentu !== undefined) requestData.typ_dokumentu = typ_dokumentu;
    if (aktivni !== undefined) requestData.aktivni = aktivni;
    if (verze !== undefined) requestData.verze = verze;
    if (castka_od !== undefined) requestData.castka_od = castka_od;
    if (castka_do !== undefined) requestData.castka_do = castka_do;
    if (platnost_od !== undefined) requestData.platnost_od = platnost_od;
    if (platnost_do !== undefined) requestData.platnost_do = platnost_do;
    // ⭐ Backend očekává 'mapovani_json' pro DOCX mapování
    if (mapovani_json !== undefined) requestData.mapovani_json = mapovani_json;
    if (docx_mapping !== undefined) {
      requestData.mapovani_json = typeof docx_mapping === 'string'
        ? docx_mapping
        : JSON.stringify(docx_mapping);
    }

    const response = await api.post('sablona_docx/update', requestData);

    return checkResponse(response, 'DOCX šablona byla úspěšně aktualizována');
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci DOCX šablony');
    throw error;
  }
}

/**
 * Aktualizace s možností výměny souboru
 */
export const updateDocxSablonaWithFile = async (token, id, formData) => {

  const response = await axios.post(
    `${API_BASE_URL}sablona_docx/update-with-file`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return checkResponse(response, 'DOCX šablona byla úspěšně aktualizována');
};

/**
 * Pouze výměna DOCX souboru
 */
export async function reuploadDocxSablona({ token, username, id, file }) {
  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);
    formData.append('id', id);
    formData.append('file', file); // POVINNÝ

    const response = await axios.post(`${API_BASE_URL}sablona_docx/reupload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return checkResponse(response, 'DOCX soubor byl úspěšně přenahran');
  } catch (error) {
    handleApiError(error, 'Chyba při přenahrávaní DOCX souboru');
    throw error;
  }
}

/**
 * Hard delete - pro DICT_MANAGE uživatele (skutečně smaže z DB + disk)
 */
export async function deleteDocxSablona({ token, username, id }) {
  try {
    const response = await api.post('sablona_docx/delete', {
      username,
      token,
      id
    });

    return checkResponse(response, 'DOCX šablona byla úspěšně smazána');
  } catch (error) {
    handleApiError(error, 'Chyba při mazání DOCX šablony');
    throw error;
  }
}

/**
 * Soft delete - pro ostatní uživatele (pouze označí jako neaktivní)
 * Používá specializovaný DOCX endpoint podle nové API specifikace
 */
export async function deactivateDocxSablona({ token, username, id }) {
  try {
    // Validace povinných parametrů
    if (!id) {
      throw new Error('ID šablony je povinné');
    }
    if (!token) {
      throw new Error('Token je povinný');
    }
    if (!username) {
      throw new Error('Username je povinný');
    }

    // Použij fetch místo axios pro application/x-www-form-urlencoded
    const response = await fetch(`${API_BASE_URL}sablona_docx/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        id: id.toString(),
        token: token,
        username: username
      })
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      return {
        success: true,
        status: 'ok',
        data: result.data,
        message: result.message || 'Šablona byla úspěšně deaktivována'
      };
    } else {
      return {
        success: false,
        status: 'error',
        message: result.message || 'Chyba při deaktivaci šablony'
      };
    }

  } catch (error) {

    // Vrať chybovou odpověď místo vyhození chyby
    return {
      success: false,
      status: 'error',
      message: error.message || 'Chyba připojení k serveru'
    };
  }
}

/**
 * Odstranění pouze souboru šablony (zachová záznam v DB)
 */
export async function removeDocxSablonaFile({ token, username, id }) {
  try {
    const response = await api.post('sablona_docx/remove-file', {
      username,
      token,
      id
    });

    return checkResponse(response, 'Soubor šablony byl úspěšně odstraněn');
  } catch (error) {
    handleApiError(error, 'Chyba při odstraňování souboru šablony');
    throw error;
  }
}

/**
 * Stažení DOCX souboru
 */
export async function downloadDocxSablona({ token, username, id }) {
  try {
    const response = await axios.post(`${API_BASE_URL}sablona_docx/download`, {
      username,
      token,
      id
    }, {
      responseType: 'blob' // Důležité pro binární soubor
    });

    return response.data; // Vrátí blob
  } catch (error) {
    handleApiError(error, 'Chyba při stahování DOCX šablony');
    throw error;
  }
}

/**
 * Stažení DOCX souboru jako File objekt pro analýzu
 */
export async function downloadDocxSablonaAsFile({ token, username, id, fileName = 'template.docx' }) {
  try {

    const response = await axios.post(`${API_BASE_URL}sablona_docx/download`, {
      username,
      token,
      id
    }, {
      responseType: 'blob'
    });

    // Vytvoř File objekt z blob
    const file = new File([response.data], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now()
    });

    return file;
  } catch (error) {

    // Rozlišuj mezi různými typy chyb
    if (error.response?.status === 404) {
      throw new Error('Soubor šablony nebyl nalezen na serveru');
    } else if (error.response?.status === 403) {
      throw new Error('Nemáte oprávnění ke stažení této šablony');
    } else {
      throw new Error('Chyba při stahování šablony ze serveru');
    }
  }
}

/**
 * Ověření všech šablon na disku
 */
export async function verifyDocxSablony({ token, username }) {
  try {
    const response = await api.post('sablona_docx/verify', {
      username,
      token
    });

    return checkResponse(response, 'Verifikace DOCX šablon dokončena');
  } catch (error) {
    handleApiError(error, 'Chyba při verifikaci DOCX šablon');
    throw error;
  }
}

/**
 * Ověření konkrétní šablony na disku
 */
export async function verifySingleDocxSablona({ token, username, id }) {
  try {
    const response = await api.post('sablona_docx/verify-single', {
      username,
      token,
      id
    });

    return checkResponse(response, 'Verifikace DOCX šablony dokončena');
  } catch (error) {
    handleApiError(error, 'Chyba při verifikaci DOCX šablony');
    throw error;
  }
}

// =============================================================================

// Export all
export default {
  // Lokality
  getLokalityList,
  getLokalitaDetail,
  createLokalita,
  updateLokalita,
  deleteLokalita,

  // Pozice
  getPoziceList,
  getPoziceDetail,
  createPozice,
  updatePozice,
  deletePozice,

  // Úseky
  getUsekyList,
  getUsekDetail,
  createUsek,
  updateUsek,
  deleteUsek,

  // Organizace
  getOrganizaceList,
  getOrganizaceDetail,
  createOrganizace,
  updateOrganizace,
  deleteOrganizace,

  // Dodavatelé (Read-only)
  getDodavateleList,
  getDodavatelDetail,

  // Stavy
  getStavyList,
  createStav,
  updateStav,
  deleteStav,

  // Role (CRUD + práva)
  getRoleList,
  getRoleListEnriched,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  assignPravoToRole,
  removePravoFromRole,
  bulkUpdateRolePrava,
  cleanupDuplicatePrava,

  // Práva (CRUD)
  getPravaList,
  getPravoDetail,
  createPravo,
  updatePravo,
  deletePravo,

  // DOCX Šablony
  getDocxSablonyList,
  getDocxSablonaDetail,
  createDocxSablona,
  updateDocxSablona,
  updateDocxSablonaWithFile,
  reuploadDocxSablona,
  deleteDocxSablona,
  deactivateDocxSablona,
  removeDocxSablonaFile,
  downloadDocxSablona,
  downloadDocxSablonaAsFile,
  verifyDocxSablony,
  verifySingleDocxSablona,
  
  // Roční poplatky - číselníky
  getDruhyRocnichPoplatku,
  getPlatbyRocnichPoplatku,
  getStavyRocnichPoplatku,
};

// =============================================================================
// ROČNÍ POPLATKY - Číselníky
// =============================================================================

/**
 * Načte druhy ročních poplatků z číselníku
 */
export async function getDruhyRocnichPoplatku({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/annual-fees-druhy/list', {
      token,
      username,
      show_inactive
    });
    checkResponse(response, 'načtení druhů ročních poplatků');
    return { status: 'ok', data: response.data.data || [] };
  } catch (error) {
    handleApiError(error, 'Chyba při načítání druhů ročních poplatků');
  }
}

/**
 * Načte typy plateb ročních poplatků z číselníku
 */
export async function getPlatbyRocnichPoplatku({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/annual-fees-platby/list', {
      token,
      username,
      show_inactive
    });
    checkResponse(response, 'načtení typů plateb');
    return { status: 'ok', data: response.data.data || [] };
  } catch (error) {
    handleApiError(error, 'Chyba při načítání typů plateb');
  }
}

/**
 * Načte stavy ročních poplatků z číselníku
 */
export async function getStavyRocnichPoplatku({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/annual-fees-stavy/list', {
      token,
      username,
      show_inactive
    });
    checkResponse(response, 'načtení stavů poplatků');
    return { status: 'ok', data: response.data.data || [] };
  } catch (error) {
    handleApiError(error, 'Chyba při načítání stavů poplatků');
  }
}
