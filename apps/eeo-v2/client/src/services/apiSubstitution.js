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

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

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
 * Aktualizuje existující zastupování (pouze future záznamy – ještě nezačalo)
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.id
 * @param {number} params.zastupce_id
 * @param {string} params.dt_od - YYYY-MM-DD
 * @param {string} params.dt_do - YYYY-MM-DD
 * @param {Object} params.opravneni
 * @param {string} [params.popis]
 */
export async function updateSubstitution({ token, username, id, zastupce_id, dt_od, dt_do, opravneni, popis }) {
  const data = await _post('substitution/update', { token, username, id, zastupce_id, dt_od, dt_do, opravneni, popis });
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
export async function fetchSubstitutionCandidates({ token, username, zastupovany_id }) {
  const payload = { token, username };
  if (zastupovany_id) {
    payload.zastupovany_id = zastupovany_id;
  }
  const data = await _post('substitution/candidates', payload);
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
/**
 * Zjistí, zda je přihlášený uživatel v tabulce možností zastupování jako potenciální zástupce.
 * Používá se pro rozhodnutí zda zobrazit tab "Zastupování" i uživatelům bez USER_SUBSTITUTE_SET.
 */
export async function fetchIsSubstitutionCandidate({ token, username }) {
  const data = await _post('substitution/is-candidate', { token, username });
  return toBool(data.is_candidate);
}

/**
 * Vrátí detailní přístup k modulu zastupování z vazební tabulky.
 */
export async function fetchSubstitutionAccessScope({ token, username }) {
  const data = await _post('substitution/is-candidate', { token, username });
  return {
    hasTabAccess: toBool(data.is_candidate),
    canBeSubstitute: toBool(data.can_be_substitute),
    canSetOwnSubstitute: toBool(data.can_set_own_substitute),
  };
}

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
