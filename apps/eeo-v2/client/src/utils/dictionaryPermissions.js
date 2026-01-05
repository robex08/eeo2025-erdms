/**
 * Dictionary Permissions Helper
 * 
 * Pomocné funkce pro kontrolu granulárních oprávnění v číselnících
 * Podporuje zpětnou kompatibilitu s DICT_MANAGE (superpravo)
 * 
 * @date 2026-01-05
 */

/**
 * Vytvoří helper pro kontrolu práv specifického číselníku
 * @param {string} prefix - Prefix práva (např. 'LOCATIONS', 'POSITIONS')
 * @param {function} hasPermission - funkce hasPermission z AuthContext
 * @returns {object} Objekt s funkcemi pro kontrolu práv
 */
export const createDictionaryPermissionHelper = (prefix, hasPermission) => {
  if (!hasPermission) {
    return {
      canView: () => false,
      canCreate: () => false,
      canEdit: () => false,
      canDelete: () => false,
      hasAnyPermission: () => false
    };
  }

  return {
    /**
     * Může zobrazit položky (READ)
     */
    canView: () => {
      return hasPermission('DICT_MANAGE') || 
             hasPermission(`${prefix}_VIEW`) ||
             hasPermission(`${prefix}_CREATE`) ||
             hasPermission(`${prefix}_EDIT`) ||
             hasPermission(`${prefix}_DELETE`);
    },

    /**
     * Může vytvářet nové položky (CREATE)
     */
    canCreate: () => {
      return hasPermission('DICT_MANAGE') || 
             hasPermission(`${prefix}_CREATE`);
    },

    /**
     * Může editovat existující položky (EDIT)
     */
    canEdit: () => {
      return hasPermission('DICT_MANAGE') || 
             hasPermission(`${prefix}_EDIT`);
    },

    /**
     * Může mazat položky (DELETE)
     */
    canDelete: () => {
      return hasPermission('DICT_MANAGE') || 
             hasPermission(`${prefix}_DELETE`);
    },

    /**
     * Má jakékoliv oprávnění k tomuto číselníku
     */
    hasAnyPermission: () => {
      return hasPermission('DICT_MANAGE') ||
             hasPermission(`${prefix}_VIEW`) ||
             hasPermission(`${prefix}_CREATE`) ||
             hasPermission(`${prefix}_EDIT`) ||
             hasPermission(`${prefix}_DELETE`);
    }
  };
};

/**
 * Zkontroluje, zda má uživatel přístup k číselníkům obecně
 * (pro zobrazení celé sekce)
 */
export const hasAnydictionaryPermission = (hasPermission) => {
  if (!hasPermission) return false;

  const prefixes = [
    'LOCATIONS', 'POSITIONS', 'CONTRACTS', 'ORGANIZATIONS',
    'DEPARTMENTS', 'STATES', 'ROLES', 'PERMISSIONS',
    'DOCX_TEMPLATES', 'CASH_BOOKS'
  ];

  // Starý způsob - DICT_MANAGE nebo DICT_VIEW
  if (hasPermission('DICT_MANAGE') || hasPermission('DICT_VIEW')) {
    return true;
  }

  // Nový způsob - jakékoliv granulární právo
  for (const prefix of prefixes) {
    if (hasPermission(`${prefix}_VIEW`) ||
        hasPermission(`${prefix}_CREATE`) ||
        hasPermission(`${prefix}_EDIT`) ||
        hasPermission(`${prefix}_DELETE`)) {
      return true;
    }
  }

  return false;
};
