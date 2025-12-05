/**
 * 🔐 CASHBOOK PERMISSIONS - Pomocné funkce pro kontrolu oprávnění
 *
 * Definuje oprávnění pro práci s pokladní knihou:
 * - READ (zobrazení)
 * - EDIT (editace)
 * - DELETE (mazání)
 * - EXPORT (export dat)
 * - MANAGE (kompletní správa včetně zamykání)
 *
 * Každé oprávnění existuje ve dvou variantách:
 * - _OWN - pouze vlastní pokladní kniha
 * - _ALL - všechny pokladní knihy
 *
 * @author FE Team
 * @date 9. listopadu 2025
 */

// =============================================================================
// KONSTANTY - Kódy oprávnění z databáze
// =============================================================================

export const PERMISSIONS = {
  // Zobrazení
  CASH_BOOK_READ_OWN: 'CASH_BOOK_READ_OWN',
  CASH_BOOK_READ_ALL: 'CASH_BOOK_READ_ALL',

  // Editace
  CASH_BOOK_EDIT_OWN: 'CASH_BOOK_EDIT_OWN',
  CASH_BOOK_EDIT_ALL: 'CASH_BOOK_EDIT_ALL',

  // Mazání
  CASH_BOOK_DELETE_OWN: 'CASH_BOOK_DELETE_OWN',
  CASH_BOOK_DELETE_ALL: 'CASH_BOOK_DELETE_ALL',

  // Export
  CASH_BOOK_EXPORT_OWN: 'CASH_BOOK_EXPORT_OWN',
  CASH_BOOK_EXPORT_ALL: 'CASH_BOOK_EXPORT_ALL',

  // Kompletní správa (včetně zamykání/odemykání)
  CASH_BOOK_MANAGE: 'CASH_BOOK_MANAGE'
};

// =============================================================================
// STAVY UZAMČENÍ POKLADNÍ KNIHY
// =============================================================================

export const LOCK_STATUS = {
  OPEN: 'open',           // Otevřená - lze editovat
  CLOSED: 'closed',       // Uzavřená uživatelem - může otevřít jen on sám nebo MANAGE
  LOCKED: 'locked'        // Zamknuta administrátorem - může otevřít jen MANAGE
};

// =============================================================================
// HELPER FUNKCE
// =============================================================================

/**
 * Získá všechna cashbook oprávnění z user objektu
 * @param {Object} userDetail - Detail uživatele z AuthContext
 * @returns {Set<string>} Množina kódů oprávnění
 */
export const getUserCashbookPermissions = (userDetail) => {
  if (!userDetail) {
    return new Set();
  }

  const permissions = new Set();

  // 1. Zkusit direct_rights (pole objektů s kod_prava)
  const directRights = userDetail.direct_rights || userDetail.directRights || [];
  if (Array.isArray(directRights)) {
    directRights.forEach(p => {
      if (p && typeof p === 'object') {
        const code = p.kod_prava || p.kod_opravneni || p.code || '';
        if (code.startsWith('CASH_BOOK_')) {
          permissions.add(code);
        }
      }
    });
  }

  // 2. Zkusit prava (pole objektů s kod_prava)
  const prava = userDetail.prava || [];
  if (Array.isArray(prava)) {
    prava.forEach(p => {
      if (p && typeof p === 'object') {
        const code = p.kod_prava || p.kod_opravneni || p.code || '';
        if (code.startsWith('CASH_BOOK_')) {
          permissions.add(code);
        }
      }
    });
  }

  // 3. Zkusit permissions (pole objektů nebo stringů)
  const perms = userDetail.permissions || [];
  if (Array.isArray(perms)) {
    perms.forEach(p => {
      if (typeof p === 'string' && p.startsWith('CASH_BOOK_')) {
        permissions.add(p);
      } else if (p && typeof p === 'object') {
        const code = p.kod_prava || p.kod_opravneni || p.code || '';
        if (code.startsWith('CASH_BOOK_')) {
          permissions.add(code);
        }
      }
    });
  }

  // 4. Zkusit roles -> prava
  const roles = userDetail.roles || [];
  if (Array.isArray(roles)) {
    roles.forEach(role => {
      if (role && typeof role === 'object') {
        const rolePrava = role.prava || role.rights || role.permissions || [];
        if (Array.isArray(rolePrava)) {
          rolePrava.forEach(p => {
            if (p && typeof p === 'object') {
              const code = p.kod_prava || p.kod_opravneni || p.code || '';
              if (code.startsWith('CASH_BOOK_')) {
                permissions.add(code);
              }
            } else if (typeof p === 'string' && p.startsWith('CASH_BOOK_')) {
              permissions.add(p);
            }
          });
        }
      }
    });
  }

  return permissions;
};

/**
 * Kontrola, zda má uživatel konkrétní oprávnění
 * @param {Object} userDetail - Detail uživatele
 * @param {string} permission - Kód oprávnění
 * @returns {boolean}
 */
export const hasPermission = (userDetail, permission) => {
  const permissions = getUserCashbookPermissions(userDetail);
  return permissions.has(permission);
};

/**
 * Získá objekt všech cashbook oprávnění pro snadné použití
 * @param {Object} userDetail - Detail uživatele z AuthContext
 * @returns {Object} Objekt s boolean hodnotami pro každé oprávnění
 */
export const getCashbookPermissionsObject = (userDetail) => {
  const permissions = getUserCashbookPermissions(userDetail);

  return {
    // Zobrazení
    canReadOwn: permissions.has(PERMISSIONS.CASH_BOOK_READ_OWN),
    canReadAll: permissions.has(PERMISSIONS.CASH_BOOK_READ_ALL) ||
                permissions.has(PERMISSIONS.CASH_BOOK_MANAGE),

    // Editace
    canEditOwn: permissions.has(PERMISSIONS.CASH_BOOK_EDIT_OWN),
    canEditAll: permissions.has(PERMISSIONS.CASH_BOOK_EDIT_ALL) ||
                permissions.has(PERMISSIONS.CASH_BOOK_MANAGE),

    // Mazání
    canDeleteOwn: permissions.has(PERMISSIONS.CASH_BOOK_DELETE_OWN),
    canDeleteAll: permissions.has(PERMISSIONS.CASH_BOOK_DELETE_ALL) ||
                  permissions.has(PERMISSIONS.CASH_BOOK_MANAGE),

    // Export
    canExportOwn: permissions.has(PERMISSIONS.CASH_BOOK_EXPORT_OWN),
    canExportAll: permissions.has(PERMISSIONS.CASH_BOOK_EXPORT_ALL) ||
                  permissions.has(PERMISSIONS.CASH_BOOK_MANAGE),

    // Kompletní správa
    canManage: permissions.has(PERMISSIONS.CASH_BOOK_MANAGE)
  };
};

/**
 * Kontrola, zda může uživatel editovat konkrétní pokladní knihu
 * @param {Object} userDetail - Detail uživatele
 * @param {Object} cashbook - Objekt pokladní knihy
 * @param {string} cashbook.stav_uzamceni - Stav uzamčení (open/closed/locked)
 * @param {number} cashbook.uzivatel_id - ID vlastníka pokladní knihy
 * @returns {Object} { canEdit: boolean, reason: string }
 */
export const canEditCashbook = (userDetail, cashbook) => {
  const perms = getCashbookPermissionsObject(userDetail);

  // 1. Kontrola uzamčení
  if (cashbook.stav_uzamceni === LOCK_STATUS.LOCKED) {
    // Zamknuto - může otevřít jen MANAGE
    if (!perms.canManage) {
      return {
        canEdit: false,
        reason: 'Pokladní kniha je zamknuta. Může ji odemknout jen správce.'
      };
    }
  } else if (cashbook.stav_uzamceni === LOCK_STATUS.CLOSED) {
    // Uzavřeno uživatelem
    const isOwner = cashbook.uzivatel_id === userDetail.id;
    if (!isOwner && !perms.canManage) {
      return {
        canEdit: false,
        reason: 'Pokladní kniha je uzavřena. Může ji otevřít jen vlastník nebo správce.'
      };
    }
  }

  // 2. Kontrola edit oprávnění
  const isOwner = cashbook.uzivatel_id === userDetail.id;

  if (perms.canEditAll) {
    return { canEdit: true, reason: 'Máte oprávnění editovat všechny pokladní knihy' };
  }

  if (perms.canEditOwn && isOwner) {
    return { canEdit: true, reason: 'Můžete editovat vlastní pokladní knihu' };
  }

  return {
    canEdit: false,
    reason: 'Nemáte oprávnění k editaci této pokladní knihy'
  };
};

/**
 * Kontrola, zda může uživatel zobrazit pokladní knihu
 * @param {Object} userDetail - Detail uživatele
 * @param {Object} cashbook - Objekt pokladní knihy
 * @returns {boolean}
 */
export const canViewCashbook = (userDetail, cashbook) => {
  const perms = getCashbookPermissionsObject(userDetail);

  if (perms.canReadAll) {
    return true;
  }

  const isOwner = cashbook.uzivatel_id === userDetail.id;
  return perms.canReadOwn && isOwner;
};

/**
 * Kontrola, zda může uživatel smazat položku v pokladní knize
 * @param {Object} userDetail - Detail uživatele
 * @param {Object} cashbook - Objekt pokladní knihy
 * @returns {Object} { canDelete: boolean, reason: string }
 */
export const canDeleteFromCashbook = (userDetail, cashbook) => {
  // Nejdřív zkontrolovat, zda může editovat (zahrnuje kontrolu uzamčení)
  const editCheck = canEditCashbook(userDetail, cashbook);
  if (!editCheck.canEdit) {
    return { canDelete: false, reason: editCheck.reason };
  }

  const perms = getCashbookPermissionsObject(userDetail);
  const isOwner = cashbook.uzivatel_id === userDetail.id;

  if (perms.canDeleteAll) {
    return { canDelete: true, reason: 'Máte oprávnění mazat ze všech pokladních knih' };
  }

  if (perms.canDeleteOwn && isOwner) {
    return { canDelete: true, reason: 'Můžete mazat z vlastní pokladní knihy' };
  }

  return {
    canDelete: false,
    reason: 'Nemáte oprávnění k mazání z této pokladní knihy'
  };
};

/**
 * Kontrola, zda může uživatel exportovat pokladní knihu
 * @param {Object} userDetail - Detail uživatele
 * @param {Object} cashbook - Objekt pokladní knihy
 * @returns {boolean}
 */
export const canExportCashbook = (userDetail, cashbook) => {
  const perms = getCashbookPermissionsObject(userDetail);

  if (perms.canExportAll) {
    return true;
  }

  const isOwner = cashbook.uzivatel_id === userDetail.id;
  return perms.canExportOwn && isOwner;
};

/**
 * Kontrola, zda může uživatel změnit stav uzamčení
 * @param {Object} userDetail - Detail uživatele
 * @param {Object} cashbook - Objekt pokladní knihy
 * @param {string} targetStatus - Cílový stav (open/closed/locked)
 * @returns {Object} { canChange: boolean, reason: string }
 */
export const canChangeLockStatus = (userDetail, cashbook, targetStatus) => {
  const perms = getCashbookPermissionsObject(userDetail);
  const isOwner = cashbook.uzivatel_id === userDetail.id;
  const currentStatus = cashbook.stav_uzamceni || LOCK_STATUS.OPEN;

  // MANAGE může dělat cokoli
  if (perms.canManage) {
    return { canChange: true, reason: 'Máte kompletní správu pokladních knih' };
  }

  // Uživatel může UZAVŘÍT svou vlastní knihu
  if (targetStatus === LOCK_STATUS.CLOSED && isOwner && currentStatus === LOCK_STATUS.OPEN) {
    return { canChange: true, reason: 'Můžete uzavřít vlastní pokladní knihu' };
  }

  // Uživatel může OTEVŘÍT svou vlastní UZAVŘENOU knihu
  if (targetStatus === LOCK_STATUS.OPEN && isOwner && currentStatus === LOCK_STATUS.CLOSED) {
    return { canChange: true, reason: 'Můžete otevřít vlastní uzavřenou knihu' };
  }

  // ZAMKNOUT může jen MANAGE
  if (targetStatus === LOCK_STATUS.LOCKED) {
    return {
      canChange: false,
      reason: 'Zamknout pokladní knihu může jen správce s oprávněním CASH_BOOK_MANAGE'
    };
  }

  // ODEMKNOUT LOCKED může jen MANAGE
  if (currentStatus === LOCK_STATUS.LOCKED) {
    return {
      canChange: false,
      reason: 'Odemknout zamknutou knihu může jen správce s oprávněním CASH_BOOK_MANAGE'
    };
  }

  return {
    canChange: false,
    reason: 'Nemáte oprávnění ke změně stavu této pokladní knihy'
  };
};

/**
 * Získá lidsky čitelný popis stavu uzamčení
 * @param {string} status - Stav uzamčení
 * @returns {Object} { label: string, icon: string, color: string }
 */
export const getLockStatusInfo = (status) => {
  switch (status) {
    case LOCK_STATUS.OPEN:
      return {
        label: 'Otevřená',
        icon: '🔓',
        color: 'success',
        description: 'Lze editovat'
      };
    case LOCK_STATUS.CLOSED:
      return {
        label: 'Uzavřená',
        icon: '🔒',
        color: 'warning',
        description: 'Uzavřena uživatelem - může otevřít vlastník nebo správce'
      };
    case LOCK_STATUS.LOCKED:
      return {
        label: 'Zamknuta',
        icon: '🔐',
        color: 'error',
        description: 'Zamknuta správcem - může otevřít jen správce'
      };
    default:
      return {
        label: 'Neznámý stav',
        icon: '❓',
        color: 'default',
        description: 'Neznámý stav uzamčení'
      };
  }
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  PERMISSIONS,
  LOCK_STATUS,
  getUserCashbookPermissions,
  hasPermission,
  getCashbookPermissionsObject,
  canEditCashbook,
  canViewCashbook,
  canDeleteFromCashbook,
  canExportCashbook,
  canChangeLockStatus,
  getLockStatusInfo
};
