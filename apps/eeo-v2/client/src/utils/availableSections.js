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
  
  // ADRESÁŘ - CONTACT_MANAGE
  if (hasPermission && hasPermission('CONTACT_MANAGE')) {
    sections.push({ value: 'addressbook', label: 'Adresář' });
  }
  
  // KONTAKTY - PHONEBOOK_VIEW nebo ADMIN
  const isAdminForContacts = userDetail?.roles && userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
  if (isAdminForContacts || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) {
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
  
  // DODAVATELÉ - CONTACT_MANAGE (podle menu v Layout)
  if (hasPermission && hasPermission('CONTACT_MANAGE')) {
    sections.push({ value: 'suppliers', label: 'Dodavatelé' });
  }
  
  // NOTIFIKACE - zatím všichni (není v Layout podmínka)
  sections.push({ value: 'notifications', label: 'Notifikace' });
  
  // OBJEDNÁVKY PŘED 2026 - ORDER_MANAGE (pro starý systém)
  if (hasPermission && hasPermission('ORDER_MANAGE')) {
    sections.push({ value: 'orders-old', label: 'Objednávky před 2026' });
  }
  
  // REPORTY - pouze pro SUPERADMIN/ADMINISTRATOR (práva ještě nejsou v DB)
  const isAdminForReports = userDetail?.roles && userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
  if (isAdminForReports) {
    sections.push({ value: 'reports', label: 'Reporty' });
  }
  
  // STATISTIKY - pouze pro SUPERADMIN/ADMINISTRATOR (práva ještě nejsou v DB)
  const isAdminForStats = userDetail?.roles && userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
  if (isAdminForStats) {
    sections.push({ value: 'statistics', label: 'Statistiky' });
  }
  
  // NASTAVENÍ APLIKACE - pouze pro SUPERADMIN/ADMINISTRATOR
  const isAdminForSettings = userDetail?.roles && userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
  if (isAdminForSettings) {
    sections.push({ value: 'app-settings', label: 'Nastavení aplikace' });
  }
  
  // POKLADNA - Cash Book - Admin/SuperAdmin NEBO jakékoliv CASH_BOOK oprávnění
  const isCashBookAllowed = 
    (userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR')) ||
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
    sections.push({ value: 'cashbook', label: 'Pokladní kniha' });
  }
  
  // PROFIL UŽIVATELE - vždy dostupný pro všechny přihlášené
  sections.push({ value: 'profile', label: 'Profil uživatele' });
  
  // OBJEDNÁVKY - ORDER_MANAGE nebo ORDER_2025
  if (hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025'))) {
    sections.push({ value: 'orders', label: 'Seznam objednávek' });
  }
  
  // FAKTURY - INVOICE_MANAGE nebo INVOICE_VIEW
  if (hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_VIEW'))) {
    sections.push({ value: 'invoices', label: 'Přehled faktur' });
  }
  
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
