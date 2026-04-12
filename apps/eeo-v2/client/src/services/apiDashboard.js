/**
 * 🏠 API Dashboard
 * 
 * API funkce pro uživatelský dashboard
 * Agregovaný endpoint pro načtení všech dat dashboardu
 */

import { api2 } from './api2auth';

/**
 * Načtení dat pro dashboard
 * 
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} [params.days=7] - Časový horizont v dnech
 * @returns {Promise<Object>} - Dashboard data
 */
export async function getDashboardData({ token, username, days = 7, cashbook_month = null }) {
  if (!token || !username) {
    throw new Error('Missing required parameters: token or username');
  }

  const payload = { token, username, days };
  if (cashbook_month !== null) payload.cashbook_month = cashbook_month;

  const response = await api2.post('dashboard/data', payload);

  return response.data;
}

/**
 * Načtení jen cashbook summary (bez full dashboard reload)
 */
export async function getCashbookSummary({ token, username, cashbook_month }) {
  const response = await api2.post('dashboard/cashbook-summary', { token, username, cashbook_month });
  return response.data;
}

/**
 * Načtení aktivních uživatelů pro SUPERADMIN dashboard widget
 * Auto-refresh každých 30s
 */
export async function getActiveUsersAdmin({ token, username, period = '5min' }) {
  try {
    const response = await api2.post('dashboard/active-users', { token, username, period });
    return response.data.status === 'success' ? response.data.data : null;
  } catch {
    return null;
  }
}

/**
 * Načtení jen chart timeline dat (bez full dashboard reload)
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.chart_days - 7, 14 nebo 30
 */
export async function getDashboardChartTimeline({ token, username, chart_days = 30 }) {
  const response = await api2.post('dashboard/chart-timeline', { token, username, chart_days });
  return response.data;
}

/**
 * Admin: Načtení matice role → DASHBOARD_* práva
 */
export async function getWidgetPermissions({ token, username }) {
  const response = await api2.post('dashboard/admin/widget-permissions', { token, username });
  return response.data;
}

/**
 * Admin: Uložení matice role → DASHBOARD_* práva
 */
export async function saveWidgetPermissions({ token, username, assignments }) {
  const response = await api2.post('dashboard/admin/save-widget-permissions', { token, username, assignments });
  return response.data;
}

/**
 * Načtení RSS feed dat
 * Volá se po přihlášení a pak dle intervalu z app settings
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} [params.max_items=10]
 * @returns {Promise<Object>} - RSS data { status, data[], rss_enabled, refresh_interval, count }
 */
export async function getRssFeed({ token, username, max_items = 10 }) {
  try {
    const response = await api2.post('rss-feed', { token, username, max_items });
    return response.data;
  } catch {
    return { status: 'error', data: [], rss_enabled: false, refresh_interval: 15 };
  }
}

/**
 * Admin: Načtení DASHBOARD_* práv pro konkrétního uživatele
 */
export async function getUserWidgetPermissions({ token, username, target_user_id }) {
  const response = await api2.post('dashboard/admin/user-widget-permissions', { token, username, target_user_id });
  return response.data;
}

/**
 * Admin: Uložení přímých DASHBOARD_* práv pro uživatele
 */
export async function saveUserWidgetPermissions({ token, username, target_user_id, direct_permissions }) {
  const response = await api2.post('dashboard/admin/save-user-widget-permissions', { token, username, target_user_id, direct_permissions });
  return response.data;
}

/**
 * Admin: Načtení seznamu uživatelů s přímými DASHBOARD_* právy
 */
export async function getUsersWithDirectPermissions({ token, username }) {
  const response = await api2.post('dashboard/admin/users-with-direct-permissions', { token, username });
  return response.data;
}

/**
 * Načtení finančních dat (krypto + FX kurzy + akcie) přes backend proxy
 * Backend cachuje data na 15 minut
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {string[]} [params.stock_tickers] - tickery akcií (např. ['AAPL', 'MSFT'])
 * @param {string[]} [params.crypto_ids] - CoinGecko IDs (např. ['bitcoin', 'ethereum'])
 * @param {string[]} [params.fx_pairs] - cílové měny od EUR (např. ['CZK', 'USD'])
 */
export async function getFinanceMarkets({ token, username, stock_tickers, crypto_ids, fx_pairs }) {
  try {
    const payload = { token, username };
    if (stock_tickers) payload.stock_tickers = stock_tickers;
    if (crypto_ids) payload.crypto_ids = crypto_ids;
    if (fx_pairs) payload.fx_pairs = fx_pairs;
    const response = await api2.post('dashboard/finance-markets', payload);
    return response.data;
  } catch {
    return { status: 'error', data: null };
  }
}

export async function getFinanceChart({ token, username, ticker, range = '1mo' }) {
  try {
    const response = await api2.post('dashboard/finance-chart', { token, username, ticker, range });
    return response.data;
  } catch {
    return { status: 'error', data: null };
  }
}
