/**
 * API služba pro možnosti zastupování (vazební tabulka M:N)
 * Definuje "kdo může koho zastupovat" na základě uživatelů, rolí, úseků nebo lokalit
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Načtení možností zastupování pro konkrétního uživatele
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.zastupovanyId - ID uživatele, jehož možnosti načíst (0 = current user)
 * @returns {Promise<Array>} Seznam možností zastupování
 */
export async function fetchSubstitutionRules({ token, username, zastupovanyId = 0 }) {
  const response = await fetch(`${API_BASE_URL}/moznosti-zastupovani/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token, 
      username,
      zastupovany_id: zastupovanyId
    })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při načítání možností zastupování');
  }

  return data.data || [];
}

/**
 * Načtení VŠECH možností zastupování v systému (admin only)
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @returns {Promise<Array>} Seznam všech možností zastupování
 */
export async function fetchAllSubstitutionRules({ token, username }) {
  const response = await fetch(`${API_BASE_URL}/moznosti-zastupovani/list-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při načítání všech možností zastupování');
  }

  return data.data || [];
}

/**
 * Vytvoření nové možnosti zastupování
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {Object} params.ruleData - Data pravidla
 * @param {number} params.ruleData.zastupovany_id - ID zastupovaného uživatele
 * @param {string} params.ruleData.typ_zastupce - 'user'|'role'|'usek'|'lokalita'
 * @param {number} [params.ruleData.zastupce_user_id] - ID uživatele (když typ=user)
 * @param {number} [params.ruleData.zastupce_role_id] - ID role (když typ=role)
 * @param {number} [params.ruleData.zastupce_usek_id] - ID úseku (když typ=usek)
 * @param {number} [params.ruleData.zastupce_lokalita_id] - ID lokality (když typ=lokalita)
 * @param {string} [params.ruleData.poznamka] - Volitelná poznámka
 * @returns {Promise<Object>} Response s novým ID
 */
export async function createSubstitutionRule({ token, username, ruleData }) {
  const response = await fetch(`${API_BASE_URL}/moznosti-zastupovani/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      username,
      ...ruleData
    })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při vytváření možnosti zastupování');
  }

  return data;
}

/**
 * Smazání (deaktivace) možnosti zastupování
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.ruleId - ID pravidla ke smazání
 * @returns {Promise<Object>} Response
 */
export async function deleteSubstitutionRule({ token, username, ruleId }) {
  const response = await fetch(`${API_BASE_URL}/moznosti-zastupovani/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      username,
      id: ruleId
    })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při mazání možnosti zastupování');
  }

  return data;
}

/**
 * Aktualizace existující možnosti zastupování
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {Object} params.ruleData - Data pravidla k aktualizaci
 * @param {number} params.ruleData.id - ID pravidla
 * @param {number} params.ruleData.zastupovany_id - ID zastupovaného uživatele
 * @param {string} params.ruleData.typ_zastupce - 'user'|'role'|'usek'|'lokalita'
 * @param {number} [params.ruleData.zastupce_user_id] - ID uživatele (když typ=user)
 * @param {number} [params.ruleData.zastupce_role_id] - ID role (když typ=role)
 * @param {number} [params.ruleData.zastupce_usek_id] - ID úseku (když typ=usek)
 * @param {number} [params.ruleData.zastupce_lokalita_id] - ID lokality (když typ=lokalita)
 * @param {string} [params.ruleData.poznamka] - Volitelná poznámka
 * @returns {Promise<Object>} Response
 */
export async function updateSubstitutionRule({ token, username, ruleData }) {
  const response = await fetch(`${API_BASE_URL}/moznosti-zastupovani/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      username,
      ...ruleData
    })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při aktualizaci možnosti zastupování');
  }

  return data;
}

/**
 * Admin: Načtení VŠECH uživatelů pro konfiguraci "Možnosti zastupování"
 * (bez filtrů na práva - admini definují kdo může koho zastupovat)
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @returns {Promise<Array>} Seznam všech aktivních uživatelů
 */
export async function fetchAllUsersForAdmin({ token, username }) {
  const response = await fetch(`${API_BASE_URL}/substitution/all-users-for-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username })
  });

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Chyba při načítání všech uživatelů');
  }

  return data.data || [];
}
