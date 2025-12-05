/**
 * 🧹 USER DATA CLEANUP UTILITY
 *
 * Zajišťuje bezpečné vyčištění dat starého uživatele při změně uživatele.
 * Předchází "cross-user data leakage" - mixování dat mezi uživateli.
 */

/**
 * Vyčistí všechna data konkrétního uživatele z localStorage
 */
export const clearUserData = (userId) => {
  if (!userId) {
    return;
  }


  const keysToRemove = [];
  const keysPattern = `_user_${userId}`;

  // Najdi všechny klíče pro konkrétního uživatele
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(keysPattern)) {
      keysToRemove.push(key);
    }
  }

  // Najdi také starý formát klíčů s user_id na konci
  const oldPatterns = [
    // `-${userId}`,  // ❌ ZAKÁZÁNO: order25-draft-123 - DRAFTY MUSÍ ZŮSTAT!
    `_${userId}`,     // layout_tasks_123
    `${userId}`       // highlightOrderId-123 (ale ne order25-draft-${userId})
  ];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // 🛡️ OCHRANA: Nikdy nesmazat ORDER25 drafty!
      if (key.startsWith('order25_draft_') || key.startsWith('order25-draft-')) {
        continue; // Přeskoč draft klíče
      }

      for (const pattern of oldPatterns) {
        if (key.endsWith(pattern)) {
          keysToRemove.push(key);
          break;
        }
      }
    }
  }

  // Odstraň duplicity
  const uniqueKeys = [...new Set(keysToRemove)];

  // Smaž klíče
  let removedCount = 0;
  uniqueKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      removedCount++;
    } catch (error) {
    }
  });

  return removedCount;
};

/**
 * Vyčistí všechna data při kompletním logout
 */
export const clearAllUserData = () => {

  const keysToRemove = [];

  // Patterne pro user-specific data - ❌ VYLOUČENY ORDER25 DRAFTY!
  const userDataPatterns = [
    '_user_',           // Nový formát: key_user_123
    'layout_tasks_',    // layout_tasks_123
    'layout_notes_',    // layout_notes_123
    // 'order25-draft-',   // ❌ ZAKÁZÁNO: order25-draft-123 - DRAFTY MUSÍ ZŮSTAT!
    // 'order25_draft_',   // ❌ ZAKÁZÁNO: order25_draft_new_123 - DRAFTY MUSÍ ZŮSTAT!
    'order_templates_', // order_templates_123
    'notif_data_',      // notif_data_123
    'chat_data_',       // chat_data_123
    'userDetail_user_', // userDetail_user_123
    'translation_dict_user_', // translation_dict_user_123
    'order_open_for_edit_user_', // order_open_for_edit_user_123
    'orderData_user_',  // orderData_user_123 (pokud by se používalo)
    'cashbook_'         // 💰 cashbook_userId_assignmentId_year_month - CITLIVÁ FINANČNÍ DATA
  ];

  // Najdi všechny user-specific klíče
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // 🛡️ OCHRANA: Nikdy nesmazat ORDER25 drafty ani při kompletním logout!
      if (key.startsWith('order25_draft_') || key.startsWith('order25-draft-')) {
        continue; // Přeskoč draft klíče
      }

      for (const pattern of userDataPatterns) {
        if (key.includes(pattern)) {
          keysToRemove.push(key);
          break;
        }
      }
    }
  }

  // Smaž také auth data
  const authKeys = [
    'auth_token_persistent',
    'auth_user_persistent',
    'auth_user_detail_persistent',
    'auth_user_permissions_persistent',
    'current_user_id'
  ];

  keysToRemove.push(...authKeys);

  // Odstraň duplicity
  const uniqueKeys = [...new Set(keysToRemove)];

  // Smaž klíče
  let removedCount = 0;
  uniqueKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      removedCount++;
    } catch (error) {
    }
  });

  // Vymaž i sessionStorage
  try {
    sessionStorage.clear();
  } catch (error) {
  }

  return removedCount;
};

/**
 * Vyčistí data při změně uživatele (starý -> nový)
 */
export const handleUserChange = (oldUserId, newUserId) => {

  if (oldUserId && oldUserId !== newUserId) {
    // Vyčisti data starého uživatele
    clearUserData(oldUserId);
  }

  // Ulož ID nového uživatele pro budoucí reference
  if (newUserId) {
    try {
      localStorage.setItem('current_user_id', newUserId.toString());
    } catch (error) {
    }
  }
};

/**
 * Získá aktuální user ID z localStorage
 */
export const getCurrentUserId = () => {
  try {
    return localStorage.getItem('current_user_id');
  } catch (error) {
    return null;
  }
};

/**
 * Zkontroluje a vyčistí "orphaned" data bez známého vlastníka
 */
export const cleanupOrphanedData = () => {

  const currentUserId = getCurrentUserId();
  const keysToCheck = [];

  // Najdi všechny user-specific klíče
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('_user_') || key.includes('layout_') || key.includes('order25-draft-'))) {
      keysToCheck.push(key);
    }
  }

  if (!currentUserId) {
    return keysToCheck.length;
  }

  // Smaž klíče které nepatří aktuálnímu uživateli
  let orphanedCount = 0;
  keysToCheck.forEach(key => {
    const belongsToCurrentUser = key.includes(`_user_${currentUserId}`) ||
                                 key.endsWith(`_${currentUserId}`) ||
                                 key.endsWith(`-${currentUserId}`);

    if (!belongsToCurrentUser) {
      try {
        localStorage.removeItem(key);
        orphanedCount++;
      } catch (error) {
      }
    }
  });

  return orphanedCount;
};

export default {
  clearUserData,
  clearAllUserData,
  handleUserChange,
  getCurrentUserId,
  cleanupOrphanedData
};