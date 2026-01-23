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
  
  // Helper pro kontrolu admin role
  const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
  
  // ✅ PRIORITA 1: OBJEDNÁVKY - jakékoliv ORDER oprávnění (většina uživatelů)
  const hasOrderPermission = hasPermission && (
    hasPermission('ORDER_MANAGE') ||
    hasPermission('ORDER_2025') ||
    hasPermission('ORDER_READ_ALL') || hasPermission('ORDER_VIEW_ALL') || hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_DELETE_ALL') ||
    hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN') || hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_DELETE_OWN')
  );
  
  if (hasOrderPermission) {
    sections.push({ value: 'orders25-list', label: 'Objednávky - přehled' });
  }
  
  // 🚀 OBJEDNÁVKY V3 - pouze pro ADMIN (beta verze)
  if (isAdmin) {
    sections.push({ value: 'orders25-list-v3', label: 'Objednávky V3 (BETA)' });
  }
  
  // FAKTURY - INVOICE_MANAGE nebo INVOICE_VIEW
  if (isAdmin || (hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_VIEW')))) {
    sections.push({ value: 'invoices25-list', label: 'Faktury - přehled' });
  }
  
  // ADRESÁŘ - SUPPLIER_MANAGE nebo SUPPLIER_VIEW/EDIT/CREATE
  if (hasPermission && (hasPermission('SUPPLIER_MANAGE') || hasPermission('SUPPLIER_VIEW') || 
      hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_CREATE'))) {
    sections.push({ value: 'address-book', label: 'Adresář' });
  }
  
  // KONTAKTY - PHONEBOOK_VIEW nebo ADMIN
  if (isAdmin || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) {
    sections.push({ value: 'contacts', label: 'Kontakty' });
  }
  
  // ČÍSELNÍKY - DICT_VIEW nebo DICT_MANAGE
  if (hasPermission && (hasPermission('DICT_VIEW') || hasPermission('DICT_MANAGE'))) {
    sections.push({ value: 'dictionaries', label: 'Číselníky' });
  }
  
  // DEBUG - pouze pro SUPERADMIN
  if (userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN')) {
    sections.push({ value: 'debug', label: 'Debug panel' });
  }
  
  // DODAVATELÉ - všichni přihlášení (není podmínka v Layout)
  sections.push({ value: 'suppliers', label: 'Dodavatelé' });
  
  // NOTIFIKACE - všichni přihlášení (není podmínka v Layout)
  sections.push({ value: 'notifications', label: 'Notifikace' });
  
  // OBJEDNÁVKY PŘED 2026 - ORDER_MANAGE nebo ORDER_OLD
  if (hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_OLD'))) {
    sections.push({ value: 'orders-old', label: 'Objednávky (<2026)' });
  }
  
  // REPORTY - pouze pro ADMIN (v menu Layout je to hasAdminRole())
  if (isAdmin) {
    sections.push({ value: 'reports', label: 'Reporty' });
  }
  
  // STATISTIKY - pouze pro ADMIN (v menu Layout je to hasAdminRole())
  if (isAdmin) {
    sections.push({ value: 'statistics', label: 'Statistiky' });
  }
  
  // NASTAVENÍ APLIKACE - pouze pro ADMIN
  if (isAdmin) {
    sections.push({ value: 'app-settings', label: 'Nastavení aplikace' });
  }
  
  // SYSTÉM WORKFLOW A NOTIFIKACÍ (HIERARCHIE) - pouze pro ADMIN
  if (isAdmin) {
    sections.push({ value: 'organization-hierarchy', label: 'Systém workflow a notifikací' });
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
  return sections.length > 0 ? sections[0].value : 'profile'; // Fallback na profil (vždy dostupný)
};
