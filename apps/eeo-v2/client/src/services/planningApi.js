/**
 * Planning Module API Service
 *
 * Backend endpoint: /api.eeo/planning/*
 * Autentifikace: JWT token + username (POST metoda)
 *
 * Endpointy:
 * ZPRÁVY (Dashboard messages):
 * - POST /planning/messages/list - Seznam zpráv
 * - POST /planning/messages/get - Detail zprávy
 * - POST /planning/messages/create - Vytvořit zprávu
 * - POST /planning/messages/update - Aktualizovat zprávu
 * - POST /planning/messages/delete - Smazat zprávu
 *
 * UDÁLOSTI (Calendar events):
 * - POST /planning/events/list - Seznam událostí
 * - POST /planning/events/get - Detail události
 * - POST /planning/events/create - Vytvořit událost
 * - POST /planning/events/update - Aktualizovat událost
 * - POST /planning/events/delete - Smazat událost
 *
 * @author GitHub Copilot
 * @date 2026-04-24
 */

import axios from 'axios';
import { loadAuthData } from '../utils/authStorage';

// =============================================================================
// API CLIENT
// =============================================================================

const planningApi = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo',
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Získání auth dat z šifrovaného storage
 */
const getAuthData = async () => {
  try {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();

    if (!token || !user?.username) {
      console.error('❌ [Planning API] Chybí token nebo username!');
      throw new Error('Missing authentication data');
    }

    return {
      token,
      username: user.username,
      user_id: user.id
    };
  } catch (error) {
    console.error('❌ [Planning API] Auth error:', error);
    throw new Error('Missing authentication data');
  }
};

/**
 * Error handler pro API response
 */
const handleApiResponse = (response) => {
  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'API error');
  }

  return response.data;
};

// =============================================================================
// MESSAGES API
// =============================================================================

/**
 * Seznam zpráv
 * @returns {Promise<Object>} - { status, data: [], count }
 */
export const getMessagesList = async () => {
  try {
    const auth = await getAuthData();
    const response = await planningApi.post('/planning/messages/list', auth);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getMessagesList error:', error);
    throw error;
  }
};

/**
 * Detail zprávy
 * @param {number} id - ID zprávy
 * @returns {Promise<Object>} - { status, data: {...} }
 */
export const getMessage = async (id) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id };
    const response = await planningApi.post('/planning/messages/get', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getMessage error:', error);
    throw error;
  }
};

/**
 * Vytvoření zprávy
 * @param {Object} data - Data zprávy
 * @param {string} data.nazev - Název zprávy
 * @param {string} data.obsah - Obsah zprávy
 * @param {string} data.dt_od - Datum od (YYYY-MM-DD HH:mm:ss)
 * @param {string} data.dt_do - Datum do (YYYY-MM-DD HH:mm:ss)
 * @param {number} data.pouzit_hierarchii - Použít org. hierarchii (0/1)
 * @param {number} data.hierarchy_profile_id - ID hierarchického profilu
 * @param {Array} data.prijemci - [{typ_prijemce: 'role'/'user', kod_role?: string, user_id?: number}]
 * @returns {Promise<Object>} - { status, message, data: {id} }
 */
export const createMessage = async (data) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, ...data };
    const response = await planningApi.post('/planning/messages/create', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] createMessage error:', error);
    throw error;
  }
};

/**
 * Aktualizace zprávy
 * @param {number} id - ID zprávy
 * @param {Object} data - Data pro update
 * @returns {Promise<Object>} - { status, message }
 */
export const updateMessage = async (id, data) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id, ...data };
    const response = await planningApi.post('/planning/messages/update', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] updateMessage error:', error);
    throw error;
  }
};

/**
 * Smazání zprávy (soft delete)
 * @param {number} id - ID zprávy
 * @returns {Promise<Object>} - { status, message }
 */
export const deleteMessage = async (id) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id };
    const response = await planningApi.post('/planning/messages/delete', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] deleteMessage error:', error);
    throw error;
  }
};

// =============================================================================
// EVENTS API
// =============================================================================

/**
 * Seznam událostí
 * @returns {Promise<Object>} - { status, data: [], count }
 */
export const getEventsList = async () => {
  try {
    const auth = await getAuthData();
    const response = await planningApi.post('/planning/events/list', auth);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getEventsList error:', error);
    throw error;
  }
};

/**
 * Detail události
 * @param {number} id - ID události
 * @returns {Promise<Object>} - { status, data: {...} }
 */
export const getEvent = async (id) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id };
    const response = await planningApi.post('/planning/events/get', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getEvent error:', error);
    throw error;
  }
};

/**
 * Vytvoření události
 * @param {Object} data - Data události
 * @param {string} data.nazev - Název události
 * @param {string} data.popis - Popis události
 * @param {string} data.dt_od - Datum od (YYYY-MM-DD HH:mm:ss)
 * @param {string} data.dt_do - Datum do (YYYY-MM-DD HH:mm:ss)
 * @param {number} data.pouzit_hierarchii - Použít org. hierarchii (0/1)
 * @param {number} data.hierarchy_profile_id - ID hierarchického profilu
 * @param {Array} data.prijemci - [{typ_prijemce: 'role'/'user', kod_role?: string, user_id?: number}]
 * @returns {Promise<Object>} - { status, message, data: {id} }
 */
export const createEvent = async (data) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, ...data };
    const response = await planningApi.post('/planning/events/create', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] createEvent error:', error);
    throw error;
  }
};

/**
 * Aktualizace události
 * @param {number} id - ID události
 * @param {Object} data - Data pro update
 * @returns {Promise<Object>} - { status, message }
 */
export const updateEvent = async (id, data) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id, ...data };
    const response = await planningApi.post('/planning/events/update', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] updateEvent error:', error);
    throw error;
  }
};

/**
 * Smazání události (soft delete)
 * @param {number} id - ID události
 * @returns {Promise<Object>} - { status, message }
 */
export const deleteEvent = async (id) => {
  try {
    const auth = await getAuthData();
    const payload = { ...auth, id };
    const response = await planningApi.post('/planning/events/delete', payload);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] deleteEvent error:', error);
    throw error;
  }
};

// =============================================================================
// RECIPIENTS (PŘÍJEMCI) API
// =============================================================================

/**
 * Seznam aktivních rolí pro výběr příjemců
 * @returns {Promise<Object>} - { status, data: [{id, kod_role, nazev_role, Popis}], count }
 */
export const getActiveRoles = async () => {
  try {
    const auth = await getAuthData();
    const response = await planningApi.post('/planning/recipients/roles', auth);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getActiveRoles error:', error);
    throw error;
  }
};

/**
 * Seznam aktivních uživatelů pro výběr příjemců
 * @returns {Promise<Object>} - { status, data: [{id, jmeno, prijmeni, email}], count }
 */
export const getActiveUsers = async () => {
  try {
    const auth = await getAuthData();
    const response = await planningApi.post('/planning/recipients/users', auth);
    return handleApiResponse(response);
  } catch (error) {
    console.error('❌ [Planning] getActiveUsers error:', error);
    throw error;
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Messages
  getMessagesList,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  
  // Events
  getEventsList,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  
  // Recipients
  getActiveRoles,
  getActiveUsers
};
