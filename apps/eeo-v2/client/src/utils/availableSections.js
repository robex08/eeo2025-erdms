/**
 * Helper funkce pro zjištění dostupných sekcí podle oprávnění uživatele
 */

/**
 * Vrátí seznam sekcí dostupných pro daného uživatele podle jeho oprávnění
 * @param {Function} hasPermission - Funkce pro kontrolu oprávnění
 * @param {Object} userDetail - Detail uživatele (pro kontrolu rolí)
 * @returns {Array} - Pole dostupných sekcí { value, label }
 */
export const getAvailableSections = (hasPermission, userDetail) => {
  const sections = [];
  
  // Helper pro kontrolu admin role (sjednoceno s route guardy v App.js)
  const hasAdminRoleByUserDetail = !!(userDetail?.roles && userDetail.roles.some(role =>
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  ));
  const hasSuperAdminRoleByUserDetail = !!(userDetail?.roles && userDetail.roles.some(role =>
    role.kod_role === 'SUPERADMIN'
  ));

  const isAdmin = !!(hasAdminRoleByUserDetail || (hasPermission && hasPermission('ADMIN')));
  const isSuperAdmin = !!(hasSuperAdminRoleByUserDetail || (hasPermission && hasPermission('SUPERADMIN')));
  const hasBetaTesterPermission = !!(hasPermission && hasPermission('BETA_TESTER'));

  // 🏠 DASHBOARD - vždy dostupný pro všechny přihlášené
  sections.push({ value: 'dashboard', label: 'Domovská stránka' });
  
  // 🔒 KRITICKÉ: Načíst module visibility settings z localStorage cache
  let moduleSettings = {};
  try {
    const cached = localStorage.getItem('app_moduleSettings');
    if (cached) {
      moduleSettings = JSON.parse(cached);
    }
  } catch (error) {
    console.warn('⚠️ Chyba při načítání module settings:', error);
  }
  
  // ✅ PRIORITA 1: OBJEDNÁVKY - jakékoliv ORDER oprávnění (většina uživatelů)
  const hasOrderPermission = hasPermission && (
    hasPermission('ORDER_MANAGE') ||
    hasPermission('ORDER_2025') ||
    hasPermission('ORDER_READ_ALL') || hasPermission('ORDER_VIEW_ALL') || hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_DELETE_ALL') ||
    hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN') || hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_DELETE_OWN')
  );
  
  // ✅ Kontrola module visibility - při vypnutí vidí modul admin/BETA_TESTER
  if (hasOrderPermission && (moduleSettings.module_orders_visible || isAdmin || hasBetaTesterPermission)) {
    sections.push({ value: 'orders25-list', label: 'Objednávky - přehled' });
  }
  
  // 🚀 OBJEDNÁVKY V3 - logika:
  // 1. Pokud je modul GLOBÁLNĚ POVOLENÝ → dostupné VŠEM s ORDER permissí
  // 2. Pokud je modul ZAKÁZANÝ → dostupné POUZE pro admin/BETA_TESTER
  const isV3GloballyEnabled = moduleSettings.module_orders_v3_visible;
  
  if (isV3GloballyEnabled && hasOrderPermission) {
    // Modul je globálně povolený → dostupný všem s ORDER permissí
    sections.push({ value: 'orders25-list-v3', label: 'Objednávky V3 (BETA)' });
  } else if (!isV3GloballyEnabled && hasOrderPermission && (isAdmin || hasBetaTesterPermission)) {
    // Modul je zakázaný → dostupný pouze admin/BETA_TESTER
    sections.push({ value: 'orders25-list-v3', label: 'Objednávky V3 (BETA)' });
  }

  // Objednávky <2026 - respektuje globální viditelnost modulu
  if (hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_OLD')) &&
      (moduleSettings.module_orders_old_visible || isAdmin || hasBetaTesterPermission)) {
    sections.push({ value: 'orders-old', label: 'Objednávky (<2026)' });
  }
  
  // 💰 ROČNÍ POPLATKY - stejné podmínky jako route guard v App.js
  const hasAnnualFeesPermission = hasPermission && (
    hasPermission('ANNUAL_FEES_MANAGE') ||
    hasPermission('ANNUAL_FEES_VIEW') ||
    hasPermission('ANNUAL_FEES_CREATE') ||
    hasPermission('ANNUAL_FEES_EDIT') ||
    hasPermission('ADMIN')
  );
  if ((hasAnnualFeesPermission || isAdmin || hasBetaTesterPermission) &&
      (moduleSettings.module_annual_fees_visible || isAdmin || hasBetaTesterPermission)) {
    sections.push({ value: 'annual-fees', label: 'Roční poplatky' });
  }
  
  // FAKTURY - stejné podmínky jako route guard (modul visible nebo admin/beta)
  if (moduleSettings.module_invoices_visible || isAdmin || hasBetaTesterPermission) {
    sections.push({ value: 'invoices25-list', label: 'Faktury - přehled' });
  }
  
  // ADRESÁŘ - stejné podmínky jako route guard
  const canAccessAddressBook = isAdmin || (hasPermission && (
      hasPermission('SUPPLIER_MANAGE') || hasPermission('SUPPLIER_VIEW') ||
      hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_CREATE') ||
      hasPermission('PHONEBOOK_MANAGE')
  ));
  if (canAccessAddressBook) {
    sections.push({ value: 'address-book', label: 'Adresář' });
  }

  // EEO vs VEMA - stejné podmínky jako route guard
  if ((moduleSettings.module_contacts_visible || isAdmin || hasBetaTesterPermission) &&
      (isAdmin || (hasPermission && hasPermission('VEMA_VIEW')))) {
    sections.push({ value: 'vema-denik', label: 'EEO vs VEMA' });
  }
  
  // ČÍSELNÍKY - stejné podmínky jako route guard v App.js
  if (isAdmin || (hasPermission && (
      hasPermission('DICT_MANAGE') ||
      hasPermission('LOCATIONS_VIEW') || hasPermission('LOCATIONS_CREATE') || hasPermission('LOCATIONS_EDIT') || hasPermission('LOCATIONS_DELETE') ||
      hasPermission('POSITIONS_VIEW') || hasPermission('POSITIONS_CREATE') || hasPermission('POSITIONS_EDIT') || hasPermission('POSITIONS_DELETE') ||
      hasPermission('CONTRACT_VIEW') || hasPermission('CONTRACT_CREATE') || hasPermission('CONTRACT_EDIT') || hasPermission('CONTRACT_DELETE') ||
      hasPermission('ORGANIZATIONS_VIEW') || hasPermission('ORGANIZATIONS_CREATE') || hasPermission('ORGANIZATIONS_EDIT') || hasPermission('ORGANIZATIONS_DELETE') ||
      hasPermission('DEPARTMENTS_VIEW') || hasPermission('DEPARTMENTS_CREATE') || hasPermission('DEPARTMENTS_EDIT') || hasPermission('DEPARTMENTS_DELETE') ||
      hasPermission('STATES_VIEW') || hasPermission('STATES_CREATE') || hasPermission('STATES_EDIT') || hasPermission('STATES_DELETE') ||
      hasPermission('ROLES_VIEW') || hasPermission('ROLES_CREATE') || hasPermission('ROLES_EDIT') || hasPermission('ROLES_DELETE') ||
      hasPermission('PERMISSIONS_VIEW') || hasPermission('PERMISSIONS_CREATE') || hasPermission('PERMISSIONS_EDIT') || hasPermission('PERMISSIONS_DELETE') ||
      hasPermission('DOCX_TEMPLATES_VIEW') || hasPermission('DOCX_TEMPLATES_CREATE') || hasPermission('DOCX_TEMPLATES_EDIT') || hasPermission('DOCX_TEMPLATES_DELETE') ||
      hasPermission('CASH_BOOKS_VIEW') || hasPermission('CASH_BOOKS_CREATE') || hasPermission('CASH_BOOKS_EDIT') || hasPermission('CASH_BOOKS_DELETE')
  ))) {
    sections.push({ value: 'dictionaries', label: 'Číselníky' });
  }
  
  // DEBUG - pouze pro SUPERADMIN
  if (isSuperAdmin) {
    sections.push({ value: 'debug', label: 'Debug panel' });
  }
  
  // DODAVATELÉ - alias na adresář
  if (canAccessAddressBook) {
    sections.push({ value: 'suppliers', label: 'Dodavatelé' });
  }
  
  // NOTIFIKACE - všichni přihlášení (není podmínka v Layout)
  sections.push({ value: 'notifications', label: 'Notifikace' });
  
  // 🚀 BETA SEKCE - dostupné pro admin a BETA_TESTER
  const hasBetaAccess = isAdmin || hasBetaTesterPermission;
  
  // PŘEHLED MAJETKU - admin nebo uživatel s ASSET oprávněním
  if ((moduleSettings.module_assets_visible || hasBetaAccess) &&
      (isAdmin || (hasPermission && (
        hasPermission('ASSET_VIEW') || hasPermission('ASSET_MANAGE') || hasPermission('ASSET_EXPORT')
  )))) {
    sections.push({ value: 'majetek-overview', label: 'Přehled majetku' });
  }
  
  // STATISTIKA A REPORTY - stejné podmínky jako route guard
  if ((moduleSettings.module_stats_reports_visible || hasBetaAccess) &&
      (isAdmin || (hasPermission && (
    hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
    hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
    hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
    hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
    hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
    hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
    hasPermission('STATS_SPENDING_VIEW') || hasPermission('STATS_SPENDING_EDIT') || hasPermission('STATS_SPENDING_MANAGE') ||
    hasPermission('CASHBOOK_REPORTS_VIEW') || hasPermission('CASHBOOK_REPORTS_MANAGE') || hasPermission('CASHBOOK_REPORTS_EXPORT') ||
    hasPermission('DEFERRALS_VIEW') || hasPermission('DEFERRALS_EDIT') || hasPermission('DEFERRALS_MANAGE')
  )))) {
    sections.push({ value: 'stats-reports', label: 'Statistika a reporty' });
  }
  
  // ČERPÁNÍ - admin NEBO uživatel s oprávněním SPENDING/LP/CONTRACT
  const canAccessCerpani = isAdmin || (hasPermission && (
    hasPermission('SPENDING_MANAGE') || hasPermission('LP_MANAGE') || hasPermission('CONTRACT_MANAGE') ||
    hasPermission('SPEDNIG_MANAGE') || hasPermission('SPNDING_MANAGE') ||
    hasPermission('SPEDNIG_VIEW_ALL') || hasPermission('SPNDING_VIEW_ALL') ||
    hasPermission('SPEDNING_VIEW_ALL') || hasPermission('SPENDING_VIEW_ALL') ||
    hasPermission('SPEDNIG_VIEW_OWN') || hasPermission('SPNDING_VIEW_OWN') ||
    hasPermission('SPEDNING_VIEW_OWN') || hasPermission('SPENDING_VIEW_OWN') ||
    hasPermission('SPENDING_CONTRACT_VIEW_ALL') || hasPermission('SPENDING_CONTRACT_VIEW_OWN') ||
    hasPermission('SPENDING_LP_VIEW_ALL') || hasPermission('SPENDING_LP_VIEW_OWN') ||
    hasPermission('CERPANI_VIEW_ALL') || hasPermission('CERPANI_VIEW_OWN') ||
    hasPermission('LP_VIEW_ALL') || hasPermission('LP_VIEW_OWN') ||
    hasPermission('CONTRACT_VIEW_ALL') || hasPermission('CONTRACT_VIEW_OWN')
  ));
  
  if ((moduleSettings.module_cerpani_visible || hasBetaAccess) && canAccessCerpani) {
    sections.push({ value: 'cerpani', label: 'Čerpání' });
  }
  
  // REPORTY a STATISTIKY - staré samostatné sekce ODSTRANĚNY
  // Nyní vše přes nový modul "Statistika a reporty" (/stats-reports)
  // Uživatelé s REPORT_VIEW vidí tab Reporty, se STATISTICS_VIEW vidí tab Statistiky
  
  // NASTAVENÍ APLIKACE - pouze pro ADMIN
  if (isAdmin) {
    sections.push({ value: 'app-settings', label: 'Nastavení aplikace' });
  }
  
  // SYSTÉM WORKFLOW A NOTIFIKACÍ (HIERARCHIE) - pouze pro SUPERADMIN
  if (isSuperAdmin) {
    sections.push({ value: 'organization-hierarchy', label: 'Systém workflow a notifikací' });
  }

  // Plánování - explicitní oprávnění
  if (hasPermission && hasPermission('PLANNING_MANAGE')) {
    sections.push({ value: 'planning', label: 'Plánování' });
  }
  
  // POKLADNA - Admin/SuperAdmin NEBO jakékolé CASH_BOOK oprávnění
  const isCashBookAllowed = 
    isAdmin ||
    (hasPermission && (
      hasPermission('CASH_BOOK_MANAGE') ||
      hasPermission('CASH_BOOK_READ_ALL') ||
      hasPermission('CASH_BOOK_READ_OWN') ||
      hasPermission('CASH_BOOK_EDIT_ALL') ||
      hasPermission('CASH_BOOK_EDIT_OWN') ||
      hasPermission('CASH_BOOK_DELETE_ALL') ||
      hasPermission('CASH_BOOK_DELETE_OWN') ||
      hasPermission('CASH_BOOK_EXPORT_ALL') ||
      hasPermission('CASH_BOOK_EXPORT_OWN') ||
      hasPermission('CASH_BOOK_CREATE')
    ));
  
  if (isCashBookAllowed) {
    sections.push({ value: 'cash-book', label: 'Pokladní kniha' });
  }

  // Kontakty - respektuje globální viditelnost modulu kontaktů
  if ((moduleSettings.module_contacts_visible || hasBetaAccess) &&
      (isAdmin || (hasPermission && hasPermission('PHONEBOOK_VIEW')))) {
    sections.push({ value: 'contacts', label: 'Kontakty' });
  }
  
  // PROFIL UŽIVATELE - vždy dostupný pro všechny přihlášené
  sections.push({ value: 'profile', label: 'Profil uživatele' });
  
  // NÁPOVĚDA - vždy dostupná pro všechny přihlášené
  sections.push({ value: 'help', label: 'Nápověda' });
  
  // UŽIVATELÉ - USER_VIEW nebo USER_MANAGE
  if (hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE'))) {
    sections.push({ value: 'users', label: 'Uživatelé' });
  }
  
  return sections;
};

/**
 * Zkontroluje, zda je daná sekce dostupná pro uživatele
 * @param {string} sectionValue - Hodnota sekce ('orders', 'cashbook', atd.)
 * @param {Function} hasPermission - Funkce pro kontrolu oprávnění
 * @param {Object} userDetail - Detail uživatele
 * @returns {boolean} - True pokud je sekce dostupná
 */
export const isSectionAvailable = (sectionValue, hasPermission, userDetail) => {
  const availableSections = getAvailableSections(hasPermission, userDetail);
  return availableSections.some(section => section.value === sectionValue);
};

/**
 * Vrátí první dostupnou sekci pro uživatele (fallback když má nastavenou nedostupnou sekci)
 * @param {Function} hasPermission - Funkce pro kontrolu oprávnění
 * @param {Object} userDetail - Detail uživatele
 * @returns {string} - Value první dostupné sekce
 */
export const getFirstAvailableSection = (hasPermission, userDetail) => {
  const sections = getAvailableSections(hasPermission, userDetail);
  
  // ✅ ULTIMATE FALLBACK: Použij výchozí homepage z global settings
  if (sections.length === 0) {
    // Pokud není žádná sekce dostupná, vrať profile
    return 'profile';
  }
  
  // 🔒 KRITICKÉ: Pokud první sekce je orders25-list nebo orders25-list-v3,
  // ověř že je modul skutečně dostupný. Pokud ne, použij global homepage.
  const firstSection = sections[0].value;
  
  if (firstSection === 'orders25-list' || firstSection === 'orders25-list-v3') {
    try {
      const cached = localStorage.getItem('app_moduleSettings');
      if (cached) {
        const moduleSettings = JSON.parse(cached);
        const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
        );
        
        // Pokud není admin a modul není visible, použij global homepage
        if (!isAdmin) {
          if (firstSection === 'orders25-list' && !moduleSettings.module_orders_visible) {
            return moduleSettings.module_default_homepage || 'profile';
          }
          if (firstSection === 'orders25-list-v3' && !moduleSettings.module_orders_v3_visible) {
            return moduleSettings.module_default_homepage || 'profile';
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Chyba při kontrole module visibility:', error);
    }
  }
  
  return firstSection;
};
