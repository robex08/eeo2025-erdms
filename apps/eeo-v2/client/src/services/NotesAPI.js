/**
 * NotesAPI - Ukázková třída pro snadné použití API pro TODO a poznámky
 * Implementuje novou specifikaci s endpointy /api.eeo/load a /api.eeo/save
 *
 * @author EEO 2025
 * @version 1.0.0
 */

import { loadUserData, saveUserData, loadTodoData, saveTodoData, loadNotesData, saveNotesData, deleteTodoData, deleteNotesData } from './api2auth';

export class NotesAPI {
  constructor(token, username, user_id) {
    if (!token || !username || !user_id) {
      throw new Error('Token, username a user_id jsou povinné parametry');
    }

    this.token = token;
    this.username = username;
    this.user_id = user_id;
  }

  // =============================================================================
  // OBECNÉ METODY
  // =============================================================================

  /**
   * Načte data podle typu
   * @param {string} typ - 'TODO' nebo 'NOTES'
   * @returns {Promise<Object>}
   */
  async load(typ) {
    return await loadUserData({
      token: this.token,
      username: this.username,
      typ,
      user_id: this.user_id
    });
  }

  /**
   * Uloží data podle typu
   * @param {string} typ - 'TODO' nebo 'NOTES'
   * @param {Object|string} obsah - Data k uložení
   * @returns {Promise<Object>}
   */
  async save(typ, obsah, id = null) {
    return await saveUserData({
      token: this.token,
      username: this.username,
      typ,
      obsah,
      user_id: this.user_id,
      id
    });
  }

  // =============================================================================
  // TODO METODY
  // =============================================================================

  /**
   * Načte TODO data uživatele
   * @returns {Promise<Object>}
   */
  async loadTodo() {
    // NotesAPI.loadTodo() volání
    return await loadTodoData({
      token: this.token,
      username: this.username,
      user_id: this.user_id
    });
  }

  /**
   * Uloží TODO data uživatele
   * @param {Array|Object} todoData - TODO data (obvykle pole úkolů)
   * @returns {Promise<Object>}
   */
  async saveTodo(todoData, id = null) {
    return await saveTodoData({
      token: this.token,
      username: this.username,
      obsah: todoData,
      user_id: this.user_id,
      id
    });
  }

  // =============================================================================
  // POZNÁMKY METODY
  // =============================================================================

  /**
   * Načte poznámky uživatele
   * @returns {Promise<Object>}
   */
  async loadNotes() {
    // NotesAPI.loadNotes() volání
    return await loadNotesData({
      token: this.token,
      username: this.username,
      user_id: this.user_id
    });
  }

  /**
   * Uloží poznámky uživatele
   * @param {string|Object} notesData - Poznámky (obvykle string nebo objekt s metadaty)
   * @returns {Promise<Object>}
   */
  async saveNotes(notesData, id = null) {
    return await saveNotesData({
      token: this.token,
      username: this.username,
      obsah: notesData,
      user_id: this.user_id,
      id
    });
  }

  // =============================================================================
  // POMOCNÉ METODY
  // =============================================================================

  /**
   * Synchronizuje lokální TODO data se serverem
   * @param {Array} localTodos - Lokální TODO data
   * @returns {Promise<{saved: boolean, serverData: Object, error?: string}>}
   */
  async syncTodos(localTodos) {
    try {
      // Nejdříve načtem aktuální data ze serveru
      const serverData = await this.loadTodo();

      // Extrahujeme server TODO pro porovnání
      let serverTodos = [];
      if (Array.isArray(serverData)) {
        serverTodos = serverData;
      } else if (serverData && Array.isArray(serverData.items)) {
        serverTodos = serverData.items;
      } else if (serverData && Array.isArray(serverData.data)) {
        serverTodos = serverData.data;
      }

      // Pokud jsou lokální data validní a liší se od server dat
      const localArray = Array.isArray(localTodos) ? localTodos : [];
      const shouldSave = localArray.length > 0 && JSON.stringify(localArray) !== JSON.stringify(serverTodos);

      if (shouldSave) {
        await this.saveTodo(localTodos);
        return {
          saved: true,
          serverData,
          localData: localTodos
        };
      }

      return {
        saved: false,
        serverData,
        localData: localTodos
      };

    } catch (error) {
      return {
        saved: false,
        serverData: null,
        localData: localTodos,
        error: error.message
      };
    }
  }

  /**
   * Synchronizuje lokální poznámky se serverem
   * @param {string} localNotes - Lokální poznámky
   * @returns {Promise<{saved: boolean, serverData: Object, error?: string}>}
   */
  async syncNotes(localNotes) {
    try {
      // Nejdříve načteme aktuální data ze serveru
      const serverData = await this.loadNotes();

      // Extrahujeme server content pro porovnání
      let serverContent = '';
      if (typeof serverData === 'string') {
        serverContent = serverData;
      } else if (serverData && typeof serverData.content === 'string') {
        serverContent = serverData.content;
      }

      // Pokud jsou lokální data nenulové a liší se od server dat
      const localContent = typeof localNotes === 'string' ? localNotes.trim() : '';
      const shouldSave = localContent.length > 0 && localContent !== serverContent;

      if (shouldSave) {
        await this.saveNotes(localNotes);
        return {
          saved: true,
          serverData,
          localData: localNotes
        };
      }

      return {
        saved: false,
        serverData,
        localData: localNotes
      };

    } catch (error) {
      return {
        saved: false,
        serverData: null,
        localData: localNotes,
        error: error.message
      };
    }
  }

  /**
   * Aktualizuje token a username
   * @param {string} newToken - Nový token
   * @param {string} newUsername - Nové username
   */
  updateCredentials(newToken, newUsername) {
    if (!newToken || !newUsername) {
      throw new Error('Token a username jsou povinné parametry');
    }

    this.token = newToken;
    this.username = newUsername;
  }

  // =============================================================================
  // DELETE METODY
  // =============================================================================

  /**
   * Smaže TODO data ze serveru
   * @param {number} id - ID záznamu v databázi
   * @returns {Promise<Object>}
   */
  async deleteTodo(id) {
    return await deleteTodoData({
      token: this.token,
      username: this.username,
      user_id: this.user_id,
      id
    });
  }

  /**
   * Smaže poznámky ze serveru
   * @param {number} id - ID záznamu v databázi
   * @returns {Promise<Object>}
   */
  async deleteNotes(id) {
    return await deleteNotesData({
      token: this.token,
      username: this.username,
      user_id: this.user_id,
      id
    });
  }
}

// =============================================================================
// TOVÁRNÍ FUNKCE
// =============================================================================

/**
 * Vytvoří novou instanci NotesAPI
 * @param {string} token - Uživatelský token
 * @param {string} username - Uživatelské jméno
 * @returns {NotesAPI}
 */
export function createNotesAPI(token, username) {
  return new NotesAPI(token, username);
}

// =============================================================================
// PŘÍKLADY POUŽITÍ
// =============================================================================

/**
 * Ukázkové funkce - jak používat NotesAPI
 */

/*
// Základní použití:
const api = new NotesAPI('user_token', 'username');

// Načtení TODO
const todoData = await api.loadTodo();

// Uložení TODO
const newTodos = [
  { id: 1, text: 'Dokončit projekt', completed: false, createdAt: Date.now() },
  { id: 2, text: 'Zavolat klientovi', completed: true, createdAt: Date.now() }
];
await api.saveTodo(newTodos);

// Načtení poznámek
const notesData = await api.loadNotes();

// Uložení poznámek
await api.saveNotes('Tyto poznámky budou uloženy na server');

// Synchronizace s lokálními daty
const syncResult = await api.syncTodos(localTodosArray);
if (syncResult.saved) {
} else if (syncResult.error) {
}

// Tovární funkce
const api2 = createNotesAPI('token', 'user');
await api2.loadNotes();
*/

export default NotesAPI;