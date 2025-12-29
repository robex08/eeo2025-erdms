/**
 * API služba pro LP čerpání na fakturách
 * Endpoint: /faktury/lp-cerpani/*
 * 
 * ⚠️ DŮLEŽITÉ: API očekává token a username v BODY (ne v headerech!)
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Uložit LP čerpání na faktuře
 * @param {number} fakturaId - ID faktury
 * @param {Array} lpCerpani - Array of {lp_cislo, lp_id, castka, poznamka}
 * @param {string} token - Auth token (předat z AuthContext)
 * @param {string} username - Username (předat z AuthContext)
 * @returns {Promise} Response s uloženými daty
 */
export async function saveFakturaLPCerpani(fakturaId, lpCerpani, token, username) {
  if (!token || !username) {
    throw new Error('Chybí autentizační údaje (token nebo username)');
  }

  const response = await api.post('/faktury/lp-cerpani/save', {
    token,
    username,
    faktura_id: fakturaId,
    lp_cerpani: lpCerpani
  });

  return response.data;
}

/**
 * Načíst LP čerpání pro fakturu
 * @param {number} fakturaId - ID faktury
 * @param {string} token - Auth token (předat z AuthContext)
 * @param {string} username - Username (předat z AuthContext)
 * @returns {Promise} Response s LP čerpáním
 */
export async function getFakturaLPCerpani(fakturaId, token, username) {
  if (!token || !username) {
    throw new Error('Chybí autentizační údaje (token nebo username)');
  }

  const response = await api.post('/faktury/lp-cerpani/get', {
    token,
    username,
    faktura_id: fakturaId
  });

  return response.data;
}
