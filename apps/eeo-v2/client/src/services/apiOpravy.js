/**
 * API Service pro modul Opravy (BETA)
 * Ruční opravy vazeb OBJ - SML - FA
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Objednávky financované ze smlouvy bez faktury + jejich smlouvy + faktury
 * napojené přímo na smlouvu (bez objednávky).
 * @returns {Promise<object>} {objednavky: [{..., smlouvy: [{..., faktury: [...]}]}], souhrn: {...}}
 */
export const getOpravyObjSmlFaktury = async (token, username) => {
  const response = await axios.post(
    `${API_BASE_URL}/opravy/obj-sml-faktury/list`,
    { token, username },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.data.status === 'success') {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Chyba při načítání dat pro opravy');
};

const postOpravy = async (endpoint, token, username, body = {}) => {
  const response = await axios.post(
    `${API_BASE_URL}/${endpoint}`,
    { token, username, ...body },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.data.status === 'success') {
    return { ...response.data.data, message: response.data.message };
  }
  throw new Error(response.data.message || 'Chyba při zpracování opravy');
};

/** Založí sdílené KONCEPTY spárování FA -> OBJ (faktura se zatím nemění). pairs: [{faktura_id, objednavka_id}] */
export const createOpravyNavrhy = (token, username, pairs) =>
  postOpravy('opravy/navrhy/create', token, username, { pairs });

/** Vrátí (smaže) koncepty. ids: [id] nebo all=true */
export const revertOpravyNavrhy = (token, username, { ids, all = false }) =>
  postOpravy('opravy/navrhy/revert', token, username, all ? { all: true } : { ids });

/** Uloží koncepty natrvalo do faktur (smlouva_id -> NULL, objednavka_id -> OBJ). ids volitelné = všechny */
export const commitOpravyNavrhy = (token, username, ids = null) =>
  postOpravy('opravy/navrhy/commit', token, username, ids ? { ids } : {});

/** Historie uložených/vrácených oprav */
export const getOpravyHistorie = (token, username) =>
  postOpravy('opravy/navrhy/historie', token, username);

/** Undo uložené opravy - vrátí faktuře původní vazbu na SML */
export const undoOpravyNavrh = (token, username, id) =>
  postOpravy('opravy/navrhy/undo', token, username, { id });
