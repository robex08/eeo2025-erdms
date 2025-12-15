/**
 * 🔐 Služba pro hierarchické rozšíření oprávnění
 * 
 * PRINCIP:
 * - Hierarchie ROZŠIŘUJE existující práva (OWN → ALL)
 * - Hierarchie POSILUJE existující práva (READ → EDIT)
 * - Hierarchie NEVYTVÁŘÍ práva z ničeho
 * 
 * PŘÍKLADY:
 * ✅ ORDER_READ_OWN + hierarchie → ORDER_READ_ALL
 * ✅ ORDER_READ_ALL + hierarchie → ORDER_EDIT_ALL
 * ❌ Žádné právo + hierarchie → NIČEHO
 * 
 * @author GitHub Copilot & robex08
 * @date 15. prosince 2025
 * @version 1.0
 */

/**
 * 📋 Mapování rozšíření práv podle hierarchie
 * 
 * Struktura: 
 * {
 *   'MODULE_ACTION_SCOPE': {
 *     expand: 'MODULE_ACTION_EXPANDED_SCOPE',  // Rozšíření rozsahu (OWN → ALL)
 *     upgrade: 'MODULE_HIGHER_ACTION_SCOPE'    // Povýšení akce (READ → EDIT)
 *   }
 * }
 */
const PERMISSION_HIERARCHY_MAP = {
  // ============================================
  // OBJEDNÁVKY (ORDERS)
  // ============================================
  
  // READ permissions
  'ORDER_READ_OWN': {
    expand: 'ORDER_READ_ALL',      // Rozšíření: vidí objednávky podřízených
    upgrade: 'ORDER_EDIT_OWN'      // Povýšení: může editovat svoje
  },
  'ORDER_VIEW_OWN': {
    expand: 'ORDER_VIEW_ALL',
    upgrade: 'ORDER_EDIT_OWN'
  },
  'ORDER_READ_ALL': {
    expand: null,                  // Už je ALL
    upgrade: 'ORDER_EDIT_ALL'      // Může povýšit na editaci všech
  },
  'ORDER_VIEW_ALL': {
    expand: null,
    upgrade: 'ORDER_EDIT_ALL'
  },
  
  // EDIT permissions
  'ORDER_EDIT_OWN': {
    expand: 'ORDER_EDIT_ALL',      // Rozšíření: může editovat i jiné
    upgrade: 'ORDER_DELETE_OWN'    // Povýšení: může mazat svoje
  },
  'ORDER_EDIT_ALL': {
    expand: null,                  // Už je ALL
    upgrade: 'ORDER_DELETE_ALL'    // Může povýšit na mazání všech
  },
  
  // DELETE permissions
  'ORDER_DELETE_OWN': {
    expand: 'ORDER_DELETE_ALL',    // Rozšíření: může mazat i jiné
    upgrade: 'ORDER_MANAGE'        // Povýšení: plná správa
  },
  'ORDER_DELETE_ALL': {
    expand: null,                  // Už je ALL
    upgrade: 'ORDER_MANAGE'        // Povýšení: plná správa
  },
  
  // CREATE permission (rozšíření nemá smysl, ale může povýšit)
  'ORDER_CREATE': {
    expand: null,                  // CREATE je globální
    upgrade: 'ORDER_EDIT_OWN'      // Může získat i editaci
  },
  
  // APPROVE permission
  'ORDER_APPROVE': {
    expand: null,                  // APPROVE je globální
    upgrade: 'ORDER_MANAGE'        // Může získat plnou správu
  },
  
  // ============================================
  // FAKTURY (INVOICES) - připraveno pro Sprint 3
  // ============================================
  'INVOICE_READ_OWN': {
    expand: 'INVOICE_READ_ALL',
    upgrade: 'INVOICE_EDIT_OWN'
  },
  'INVOICE_READ_ALL': {
    expand: null,
    upgrade: 'INVOICE_EDIT_ALL'
  },
  'INVOICE_EDIT_OWN': {
    expand: 'INVOICE_EDIT_ALL',
    upgrade: 'INVOICE_DELETE_OWN'
  },
  'INVOICE_EDIT_ALL': {
    expand: null,
    upgrade: 'INVOICE_DELETE_ALL'
  },
  
  // ============================================
  // POKLADNA (CASHBOOK) - připraveno pro Sprint 2
  // ============================================
  'CASHBOOK_READ_OWN': {
    expand: 'CASHBOOK_READ_ALL',
    upgrade: 'CASHBOOK_EDIT_OWN'
  },
  'CASHBOOK_READ_ALL': {
    expand: null,
    upgrade: 'CASHBOOK_EDIT_ALL'
  },
  'CASHBOOK_EDIT_OWN': {
    expand: 'CASHBOOK_EDIT_ALL',
    upgrade: 'CASHBOOK_DELETE_OWN'
  },
  'CASHBOOK_EDIT_ALL': {
    expand: null,
    upgrade: 'CASHBOOK_DELETE_ALL'
  }
};

/**
 * 🔍 Zjistí, zda uživatel má základní právo (z role/uživatele)
 * 
 * @param {string} permission - Kód oprávnění (např. 'ORDER_READ_OWN')
 * @param {Array<string>} basePermissions - Pole základních oprávnění uživatele
 * @returns {boolean}
 */
const hasBasePermission = (permission, basePermissions) => {
  if (!permission || !Array.isArray(basePermissions)) return false;
  return basePermissions.includes(permission);
};

/**
 * 🏢 Rozšíří základní práva o hierarchická rozšíření
 * 
 * @param {Array<string>} basePermissions - Základní práva z role/uživatele
 * @param {boolean} hierarchyEnabled - Je hierarchie zapnutá?
 * @param {boolean} allowExpand - Povolit rozšíření rozsahu (OWN → ALL)?
 * @param {boolean} allowUpgrade - Povolit povýšení akce (READ → EDIT)?
 * @returns {Array<string>} - Rozšířená práva
 */
export const expandPermissionsWithHierarchy = (
  basePermissions = [],
  hierarchyEnabled = false,
  allowExpand = true,
  allowUpgrade = true
) => {
  if (!hierarchyEnabled) {
    // Hierarchie vypnutá → pouze základní práva
    return [...basePermissions];
  }
  
  if (!Array.isArray(basePermissions) || basePermissions.length === 0) {
    // Žádná základní práva → hierarchie nic nepřidá
    return [];
  }
  
  const expandedPermissions = new Set([...basePermissions]);
  
  // Projdi všechna základní práva a aplikuj hierarchii
  for (const basePerm of basePermissions) {
    const hierarchyMap = PERMISSION_HIERARCHY_MAP[basePerm];
    
    if (!hierarchyMap) {
      // Pro toto právo není definováno hierarchické rozšíření
      continue;
    }
    
    // Rozšíření rozsahu (OWN → ALL)
    if (allowExpand && hierarchyMap.expand) {
      expandedPermissions.add(hierarchyMap.expand);
    }
    
    // Povýšení akce (READ → EDIT)
    if (allowUpgrade && hierarchyMap.upgrade) {
      expandedPermissions.add(hierarchyMap.upgrade);
    }
  }
  
  return Array.from(expandedPermissions);
};

/**
 * 🎯 Vytvoří funkci hasPermission s podporou hierarchie
 * 
 * @param {Array<string>} basePermissions - Základní práva z role/uživatele
 * @param {Object} hierarchyConfig - Konfigurace hierarchie z hierarchyService
 * @returns {Function} - Funkce hasPermission(permissionCode)
 */
export const createHierarchicalPermissionChecker = (basePermissions = [], hierarchyConfig = {}) => {
  const hierarchyEnabled = Boolean(hierarchyConfig.enabled && hierarchyConfig.profileId);
  
  // Rozšíř práva podle hierarchie
  const expandedPermissions = expandPermissionsWithHierarchy(
    basePermissions,
    hierarchyEnabled,
    true, // allowExpand
    true  // allowUpgrade
  );
  
  /**
   * 🔍 Kontrola, zda uživatel má dané právo
   * 
   * @param {string} permissionCode - Kód oprávnění (např. 'ORDER_READ_ALL')
   * @returns {boolean}
   */
  return (permissionCode) => {
    if (!permissionCode) return false;
    
    // Zkontroluj v rozšířených právech
    const hasPermission = expandedPermissions.includes(permissionCode);
    
    if (process.env.NODE_ENV === 'development') {
      if (!hasPermission && basePermissions.includes(permissionCode)) {
        console.warn(`⚠️ [PermissionHierarchy] Právo ${permissionCode} je v base, ale ne v expanded!`);
      }
    }
    
    return hasPermission;
  };
};

/**
 * 🔍 Zjistí, zda má uživatel právo VIEW nebo READ pro objednávky
 * 
 * @param {Function} hasPermission - Funkce pro kontrolu práv
 * @returns {{ canView: boolean, canViewOwn: boolean, canViewAll: boolean }}
 */
export const getOrderViewPermissions = (hasPermission) => {
  if (!hasPermission) {
    return { canView: false, canViewOwn: false, canViewAll: false };
  }
  
  const canViewOwn = hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN');
  const canViewAll = hasPermission('ORDER_READ_ALL') || 
                     hasPermission('ORDER_VIEW_ALL') ||
                     hasPermission('ORDER_MANAGE') ||
                     hasPermission('ORDER_EDIT_ALL') ||
                     hasPermission('ORDER_DELETE_ALL');
  
  return {
    canView: canViewOwn || canViewAll,
    canViewOwn,
    canViewAll
  };
};

/**
 * 🔍 Zjistí, zda má uživatel právo EDIT pro objednávky
 * 
 * @param {Function} hasPermission - Funkce pro kontrolu práv
 * @returns {{ canEdit: boolean, canEditOwn: boolean, canEditAll: boolean }}
 */
export const getOrderEditPermissions = (hasPermission) => {
  if (!hasPermission) {
    return { canEdit: false, canEditOwn: false, canEditAll: false };
  }
  
  const canEditOwn = hasPermission('ORDER_EDIT_OWN');
  const canEditAll = hasPermission('ORDER_EDIT_ALL') ||
                     hasPermission('ORDER_MANAGE') ||
                     hasPermission('ORDER_DELETE_ALL');
  
  return {
    canEdit: canEditOwn || canEditAll,
    canEditOwn,
    canEditAll
  };
};

/**
 * 🔍 Zjistí, zda má uživatel právo CREATE pro objednávky
 * 
 * @param {Function} hasPermission - Funkce pro kontrolu práv
 * @returns {boolean}
 */
export const getOrderCreatePermission = (hasPermission) => {
  if (!hasPermission) return false;
  
  return hasPermission('ORDER_CREATE') || 
         hasPermission('ORDER_MANAGE');
};

/**
 * 🔍 Zjistí, zda má uživatel právo DELETE pro objednávky
 * 
 * @param {Function} hasPermission - Funkce pro kontrolu práv
 * @param {number} currentUserId - ID aktuálního uživatele
 * @param {number} orderAuthorId - ID autora objednávky
 * @returns {boolean}
 */
export const getOrderDeletePermission = (hasPermission, currentUserId, orderAuthorId) => {
  if (!hasPermission) return false;
  
  const canDeleteAll = hasPermission('ORDER_DELETE_ALL') || hasPermission('ORDER_MANAGE');
  if (canDeleteAll) return true;
  
  const canDeleteOwn = hasPermission('ORDER_DELETE_OWN');
  if (canDeleteOwn && currentUserId === orderAuthorId) return true;
  
  return false;
};

/**
 * 📊 Vrátí přehled všech práv pro debugging
 * 
 * @param {Array<string>} basePermissions - Základní práva
 * @param {Object} hierarchyConfig - Konfigurace hierarchie
 * @returns {Object}
 */
export const getPermissionsSummary = (basePermissions = [], hierarchyConfig = {}) => {
  const hierarchyEnabled = Boolean(hierarchyConfig.enabled && hierarchyConfig.profileId);
  const expandedPermissions = expandPermissionsWithHierarchy(basePermissions, hierarchyEnabled);
  
  return {
    hierarchyEnabled,
    profileId: hierarchyConfig.profileId,
    profileName: hierarchyConfig.profileName,
    basePermissions,
    expandedPermissions,
    addedByHierarchy: expandedPermissions.filter(p => !basePermissions.includes(p)),
    summary: {
      baseCount: basePermissions.length,
      expandedCount: expandedPermissions.length,
      addedCount: expandedPermissions.length - basePermissions.length
    }
  };
};

/**
 * 🧪 Testovací funkce pro ověření hierarchie
 */
export const testPermissionHierarchy = () => {
  console.group('🧪 Test hierarchie práv');
  
  // Test 1: Bez hierarchie
  console.log('\n📋 Test 1: BEZ hierarchie');
  const basePerms1 = ['ORDER_READ_OWN', 'ORDER_CREATE'];
  const expanded1 = expandPermissionsWithHierarchy(basePerms1, false);
  console.log('Base:', basePerms1);
  console.log('Expanded:', expanded1);
  console.log('Mělo by být stejné:', JSON.stringify(basePerms1) === JSON.stringify(expanded1));
  
  // Test 2: S hierarchií - rozšíření
  console.log('\n📋 Test 2: S hierarchií - rozšíření');
  const basePerms2 = ['ORDER_READ_OWN', 'ORDER_CREATE'];
  const expanded2 = expandPermissionsWithHierarchy(basePerms2, true, true, true);
  console.log('Base:', basePerms2);
  console.log('Expanded:', expanded2);
  console.log('Mělo přidat ORDER_READ_ALL, ORDER_EDIT_OWN');
  
  // Test 3: Žádná práva + hierarchie = pořád nic
  console.log('\n📋 Test 3: Žádná práva + hierarchie');
  const basePerms3 = [];
  const expanded3 = expandPermissionsWithHierarchy(basePerms3, true);
  console.log('Base:', basePerms3);
  console.log('Expanded:', expanded3);
  console.log('Mělo zůstat prázdné:', expanded3.length === 0);
  
  // Test 4: Plná práva
  console.log('\n📋 Test 4: Plná práva');
  const basePerms4 = ['ORDER_MANAGE'];
  const expanded4 = expandPermissionsWithHierarchy(basePerms4, true);
  console.log('Base:', basePerms4);
  console.log('Expanded:', expanded4);
  
  console.groupEnd();
};

// Export všech funkcí
const permissionHierarchyService = {
  expandPermissionsWithHierarchy,
  createHierarchicalPermissionChecker,
  getOrderViewPermissions,
  getOrderEditPermissions,
  getOrderCreatePermission,
  getOrderDeletePermission,
  getPermissionsSummary,
  testPermissionHierarchy,
  PERMISSION_HIERARCHY_MAP
};

export default permissionHierarchyService;
