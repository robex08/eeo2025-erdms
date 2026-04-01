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
export async function getDashboardData({ token, username, days = 7 }) {
  if (!token || !username) {
    throw new Error('Missing required parameters: token or username');
  }

  const response = await api2.post('dashboard/data', {
    token,
    username,
    days
  });

  return response.data;
}
