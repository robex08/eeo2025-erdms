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
 * @param {function} hasAdminRole - funkce hasAdminRole z AuthContext
 * @returns {object} Objekt s funkcemi pro kontrolu práv
 */
export const createDictionaryPermissionHelper = (prefix, hasPermission, hasAdminRole) => {
  if (!hasPermission || !hasAdminRole) {
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
     * Může zobrazit záložku a položky (READ)
     * Vyžaduje VIEW právo nebo jakékoliv jiné právo pro tento číselník
     * ADMIN role má automatický přístup
     */
    canView: () => {
      return hasAdminRole() || 
             hasPermission(`${prefix}_VIEW`) ||
             hasPermission(`${prefix}_CREATE`) ||
             hasPermission(`${prefix}_EDIT`) ||
             hasPermission(`${prefix}_DELETE`);
    },

    /**
     * Může vytvářet nové položky (CREATE)
     * Vyžaduje specifické právo nebo ADMIN roli
     */
    canCreate: () => {
      return hasAdminRole() || 
             hasPermission(`${prefix}_CREATE`);
    },

    /**
     * Může editovat existující položky (EDIT)
     * ADMIN role má plný přístup automaticky
     */
    canEdit: () => {
      return hasAdminRole() || 
             hasPermission(`${prefix}_EDIT`);
    },

    /**
     * Může mazat položky (DELETE)
     * ADMIN role má plný přístup automaticky
     */
    canDelete: () => {
      return hasAdminRole() || 
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
