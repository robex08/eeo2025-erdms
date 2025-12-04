<?php
/**
 * CashbookPermissions.php
 * Kontrola oprávnění pro operace s pokladními knihami
 * PHP 5.6 kompatibilní
 */

class CashbookPermissions {
    
    private $user;
    private $db;
    
    public function __construct($user, $db) {
        $this->user = $user;
        $this->db = $db;
    }
    
    /**
     * Kontrola, zda je uživatel super admin
     */
    private function isSuperAdmin() {
        return isset($this->user['super_admin']) && $this->user['super_admin'] == 1;
    }
    
    /**
     * Kontrola, zda má uživatel oprávnění
     * Kontroluje přímá práva + práva z rolí
     * 
     * Struktura: 25_role_prava (user_id, role_id, pravo_id, aktivni)
     * - user_id = -1 => právo přiřazené k roli
     * - user_id > 0  => přímé právo uživatele
     */
    private function hasPermission($permissionCode) {
        if (!isset($this->user['id'])) {
            return false;
        }
        
        // Oprávnění z queries.php: 'uzivatele_prava_direct_by_user'
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count
            FROM 25_prava p
            WHERE p.kod_prava = ?
            AND p.aktivni = 1
            AND (
                p.id IN (
                    -- Přímá práva uživatele (user_id > 0, role_id = -1)
                    SELECT rp.pravo_id 
                    FROM 25_role_prava rp 
                    WHERE rp.user_id = ? AND rp.aktivni = 1
                )
                OR p.id IN (
                    -- Práva z rolí (user_id = -1, role_id = role.id)
                    SELECT rp.pravo_id 
                    FROM 25_uzivatele_role ur
                    JOIN 25_role_prava rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                    WHERE ur.uzivatel_id = ? AND rp.aktivni = 1
                )
            )
        ");
        $stmt->execute(array($permissionCode, $this->user['id'], $this->user['id']));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['count'] > 0;
    }
    
    /**
     * Kontrola, zda má uživatel oprávnění číst pokladní knihu
     */
    public function canReadCashbook($cashbookUserId) {
        // Super admin může vše
        if ($this->isSuperAdmin()) {
            return true;
        }
        
        // CASH_BOOK_MANAGE může vše
        if ($this->hasPermission('CASH_BOOK_MANAGE')) {
            return true;
        }
        
        // CASH_BOOK_READ_ALL může číst všechny knihy
        if ($this->hasPermission('CASH_BOOK_READ_ALL')) {
            return true;
        }
        
        // CASH_BOOK_READ_OWN může číst pouze své knihy
        if ($this->hasPermission('CASH_BOOK_READ_OWN') && $cashbookUserId == $this->user['id']) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může editovat
     */
    public function canEditCashbook($cashbookUserId) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_OWN') && $cashbookUserId == $this->user['id']) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může mazat
     */
    public function canDeleteEntry($cashbookUserId) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_DELETE_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_DELETE_OWN') && $cashbookUserId == $this->user['id']) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může exportovat
     */
    public function canExportCashbook($cashbookUserId) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EXPORT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EXPORT_OWN') && $cashbookUserId == $this->user['id']) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může vytvářet záznamy
     */
    public function canCreateEntry() {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může vytvářet nové knihy
     */
    public function canCreateBook() {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může uzavírat knihy
     * 
     * @param int $pokladnaId ID pokladny, ke které kniha patří
     * @return bool True pokud má oprávnění
     */
    public function canCloseBook($pokladnaId) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_OWN') && $this->isOwnCashbox($pokladnaId)) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může otevírat uzavřené knihy
     * Rozlišuje mezi uzavřenou uživatelem (může vlastník s EDIT_OWN/EDIT_ALL) 
     * a zamčenou správcem (jen admin s MANAGE)
     * 
     * @param string $bookStatus Stav knihy ('uzavrena_uzivatelem' nebo 'zamknuta_spravcem')
     * @param int $pokladnaId ID pokladny, ke které kniha patří
     * @return bool True pokud má oprávnění
     */
    public function canReopenBook($bookStatus, $pokladnaId) {
        // Super admin může vždy
        if ($this->isSuperAdmin()) return true;
        
        // Admin s MANAGE může odemknout cokoliv
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        
        // Zamčená správcem - jen admin
        if ($bookStatus === 'zamknuta_spravcem') {
            return false;
        }
        
        // Uzavřená uživatelem - může otevřít:
        // 1. Uživatel s EDIT_ALL (editace všech pokladen)
        // 2. Uživatel s EDIT_OWN + je to jeho vlastní pokladna
        if ($bookStatus === 'uzavrena_uzivatelem') {
            // EDIT_ALL může otevřít jakoukoli uzavřenou knihu
            if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) {
                return true;
            }
            
            // EDIT_OWN může otevřít pouze svou vlastní knihu
            if ($this->hasPermission('CASH_BOOK_EDIT_OWN')) {
                return $this->isOwnCashbox($pokladnaId);
            }
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda je pokladna přiřazená k aktuálnímu uživateli
     * 
     * @param int $pokladnaId ID pokladny
     * @return bool True pokud je to vlastní pokladna
     */
    private function isOwnCashbox($pokladnaId) {
        if (!isset($this->user['id'])) {
            return false;
        }
        
        // Aktivní přiřazení = platne_do je NULL nebo >= dnes
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count
            FROM 25a_pokladny_uzivatele
            WHERE pokladna_id = ? 
              AND uzivatel_id = ? 
              AND (platne_do IS NULL OR platne_do >= CURDATE())
        ");
        $stmt->execute(array($pokladnaId, $this->user['id']));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['count'] > 0;
    }
    
    /**
     * Kontrola, zda má plná admin práva (CASH_BOOK_MANAGE)
     * Pro správu přiřazení pokladen, globální nastavení, zamykání knih
     */
    public function canManageCashbooks() {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může vidět všechny pokladny (CASH_BOOK_READ_ALL)
     * Pro admin přístup ke všem přiřazením a knihám
     */
    public function canSeeAllCashboxes() {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_READ_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        return false;
    }
}
