/**
 * API funkce pro systém zastupování uživatelů
 * Endpointy:
 *  POST substitution/list         - moje nastavená zastupování
 *  POST substitution/create       - vytvoření nového zastupování
 *  POST substitution/update       - aktualizace zastupování
 *  POST substitution/deactivate   - zrušení zastupování
 *  POST substitution/current      - koho aktuálně zastupuji já
 *  POST substitution/candidates   - uživatelé způsobilí být zástupcem
 */

const API_BASE = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

async function _post(endpoint, body) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * Načte seznam mých nastavených zastupování (kde jsem zastupovaný)
 */
export async function fetchMySubstitutions({ token, username }) {
  const data = await _post('substitution/list', { token, username });
  return data.data || [];
}

/**
 * Vytvoří nové zastupování
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.zastupce_id
 * @param {string} params.dt_od - YYYY-MM-DD
 * @param {string} params.dt_do - YYYY-MM-DD
 * @param {Object} params.opravneni - např. {view:1, approve:0, confirm:0}
 * @param {string} [params.popis]
 */
export async function createSubstitution({ token, username, zastupce_id, dt_od, dt_do, opravneni, popis }) {
  const data = await _post('substitution/create', { token, username, zastupce_id, dt_od, dt_do, opravneni, popis });
  return data.data || {};
}

/**
 * Deaktivuje (zruší) zastupování
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.id
 */
export async function deactivateSubstitution({ token, username, id }) {
  const data = await _post('substitution/deactivate', { token, username, id });
  return data;
}

/**
 * Načte seznam uživatelů způsobilých být zástupcem (mají právo USER_SUBSTITUTE)
 */
export async function fetchSubstitutionCandidates({ token, username }) {
  const data = await _post('substitution/candidates', { token, username });
  return data.data || [];
}

/**
 * Načte, koho aktuálně zastupuji já (jako zastupce)
 */
export async function fetchCurrentlySubstituting({ token, username }) {
  const data = await _post('substitution/current', { token, username });
  return data.data || [];
}

/**
 * Admin: seznam všech zastupování v systému
 */
export async function fetchAllSubstitutionsAdmin({ token, username }) {
  const data = await _post('substitution/admin-list', { token, username });
  return data.data || [];
}

/**
 * Admin: seznam uživatelů, za které může admin spravovat zastupování
 */
export async function fetchManageableUsers({ token, username }) {
  const data = await _post('substitution/manageable-users', { token, username });
  return data.data || [];
}

/**
 * Admin: vytvoří zastupování za jiného uživatele
 * Navíc přijímá zastupovany_id (jiného uživatele)
 */
export async function createSubstitutionAdmin({ token, username, zastupovany_id, zastupce_id, dt_od, dt_do, opravneni, popis }) {
  const data = await _post('substitution/create', { token, username, zastupovany_id, zastupce_id, dt_od, dt_do, opravneni, popis });
  return data.data || {};
}
