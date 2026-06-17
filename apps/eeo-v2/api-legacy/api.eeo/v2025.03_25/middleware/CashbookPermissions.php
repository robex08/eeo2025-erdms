<?php
/**
 * CashbookPermissions.php
 * Kontrola oprávnění pro operace s pokladními knihami
 * PHP 5.6 kompatibilní
 */

class CashbookPermissions {
    
    private $user;
    private $db;
    private $delegatedPermissionCodes;
    
    public function __construct($user, $db) {
        $this->user = $user;
        $this->db = $db;
        $this->delegatedPermissionCodes = null;
    }

    /**
     * Načte kódy práv uživatele (přímá + z rolí).
     *
     * @param int $userId
     * @return array
     */
    private function getPermissionCodesForUser($userId) {
        $uid = (int)$userId;
        if ($uid <= 0) {
            return array();
        }

        if (function_exists('_substitution_get_permission_codes_for_user')) {
            try {
                return (array)_substitution_get_permission_codes_for_user($this->db, $uid);
            } catch (Exception $e) {
                error_log('CashbookPermissions::getPermissionCodesForUser helper error: ' . $e->getMessage());
            }
        }

        $stmt = $this->db->prepare(
            "SELECT DISTINCT p.kod_prava
             FROM 25_prava p
             WHERE p.aktivni = 1
               AND (
                 p.id IN (
                   SELECT rp.pravo_id
                   FROM 25_role_prava rp
                   WHERE rp.user_id = :uid_direct
                     AND rp.aktivni = 1
                 )
                 OR p.id IN (
                   SELECT rp.pravo_id
                   FROM 25_uzivatele_role ur
                   JOIN 25_role_prava rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                   WHERE ur.uzivatel_id = :uid_role
                     AND rp.aktivni = 1
                 )
               )"
        );
        $stmt->bindValue(':uid_direct', $uid, PDO::PARAM_INT);
        $stmt->bindValue(':uid_role', $uid, PDO::PARAM_INT);
        $stmt->execute();

        $codes = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $code = strtoupper(trim((string)$row['kod_prava']));
            if ($code !== '') {
                $codes[] = $code;
            }
        }

        return array_values(array_unique($codes));
    }

    /**
     * Vrátí delegovaná cashbook oprávnění z aktivních zastupování.
     * Přenos cashbook práv je možný jen pokud je povolen cashbook_transfer
     * (fallback pro starší záznamy: module_visibility -> view).
     *
     * @return array
     */
    private function getDelegatedPermissionCodes() {
        if (is_array($this->delegatedPermissionCodes)) {
            return $this->delegatedPermissionCodes;
        }

        $this->delegatedPermissionCodes = array();

        if (!isset($this->user['id']) || !function_exists('isSubstitutionEnabled') || !isSubstitutionEnabled($this->db)) {
            return $this->delegatedPermissionCodes;
        }

        try {
            $stmt = $this->db->prepare(
                "SELECT z.zastupovany_id, z.opravneni
                 FROM 25_uzivatele_zastupovani z
                 WHERE z.zastupce_id = :uid
                   AND z.aktivni = 1
                   AND z.dt_od <= CURDATE()
                   AND z.dt_do >= CURDATE()"
            );
            $stmt->bindValue(':uid', (int)$this->user['id'], PDO::PARAM_INT);
            $stmt->execute();

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $opravneni = json_decode($row['opravneni'], true);
                if (!is_array($opravneni)) {
                    continue;
                }

                $canView = !empty($opravneni['view']);
                $canModuleVisibility = array_key_exists('module_visibility', $opravneni)
                    ? !empty($opravneni['module_visibility'])
                    : $canView;
                $canCashbookTransfer = array_key_exists('cashbook_transfer', $opravneni)
                    ? !empty($opravneni['cashbook_transfer'])
                    : $canModuleVisibility;
                if (!$canModuleVisibility) {
                    $canCashbookTransfer = false;
                }

                $canAdmin = !empty($opravneni['administrator']);
                $canSuperadmin = !empty($opravneni['superadmin']);

                if (!$canModuleVisibility && !$canAdmin && !$canSuperadmin) {
                    continue;
                }

                $targetUserId = (int)$row['zastupovany_id'];
                if ($targetUserId <= 0) {
                    continue;
                }

                $codes = $this->getPermissionCodesForUser($targetUserId);
                foreach ($codes as $code) {
                    $norm = strtoupper(trim((string)$code));
                    if ($norm === '') {
                        continue;
                    }

                    $isCashbookCode = (bool)preg_match('/^(CASH_BOOK_|CASHBOOK_REPORTS_)/', $norm);
                    if (!$isCashbookCode) {
                        continue;
                    }

                    if ($canSuperadmin || $canAdmin) {
                        $this->delegatedPermissionCodes[] = $norm;
                        continue;
                    }

                    if ($canModuleVisibility && $canCashbookTransfer) {
                        $this->delegatedPermissionCodes[] = $norm;
                    }
                }
            }

            $this->delegatedPermissionCodes = array_values(array_unique($this->delegatedPermissionCodes));
        } catch (Exception $e) {
            error_log('CashbookPermissions::getDelegatedPermissionCodes error: ' . $e->getMessage());
            $this->delegatedPermissionCodes = array();
        }

        return $this->delegatedPermissionCodes;
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
    public function hasPermission($permissionCode) {
        if (!isset($this->user['id'])) {
            return false;
        }

        $normalizedCode = strtoupper(trim((string)$permissionCode));
        if ($normalizedCode === '') {
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

        if (!empty($result['count'])) {
            return true;
        }

        // Fallback: delegovaná oprávnění přes aktivní zastupování.
        // Používá se primárně pro CASH_BOOK_* / CASHBOOK_REPORTS_* oprávnění.
        return in_array($normalizedCode, $this->getDelegatedPermissionCodes(), true);
    }
    
    /**
     * Kontrola, zda má uživatel roli
     */
    public function hasRole($roleCode) {
        if (!isset($this->user['id'])) {
            return false;
        }
        
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count
            FROM 25_uzivatele_role ur
            JOIN 25_role r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ? AND r.kod_role = ?
        ");
        $stmt->execute(array($this->user['id'], $roleCode));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['count'] > 0;
    }
    
    /**
     * Kontrola, zda má uživatel oprávnění číst pokladní knihu
     * 
     * ✅ OPRAVENO: Primární kontrola podle přiřazení k pokladně, ne podle uzivatel_id v knize
     * 
     * @param int|null $pokladnaId ID pokladny (pro kontrolu přiřazení)
     * @return bool True pokud má oprávnění
     */
    public function canReadCashbook($pokladnaId = null) {
        $currentUserId = intval($this->user['id']);
        
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
        
        // ✅ CASH_BOOK_READ_OWN - může číst knihy svých pokladen
        if ($this->hasPermission('CASH_BOOK_READ_OWN')) {
            // Pokud není specifikována pokladna, obecně má právo číst (své pokladny)
            if ($pokladnaId === null) {
                return true;
            }
            // Pokud je specifikována, zkontrolovat přiřazení
            return $this->isOwnCashbox($pokladnaId);
        }
        
        // ✅ Uživatel bez práv může číst jen knihy pokladen, ke kterým je přiřazen
        if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může editovat pokladní knihu
     * 
     * ✅ OPRAVENO: Kontrola podle přiřazení k pokladně
     * 
     * @param int|null $pokladnaId ID pokladny
     * @return bool True pokud má oprávnění
     */
    public function canEditCashbook($pokladnaId = null) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) return true;
        
        // ✅ EDIT_OWN - může editovat knihy svých pokladen
        if ($this->hasPermission('CASH_BOOK_EDIT_OWN')) {
            if ($pokladnaId === null) return true;
            return $this->isOwnCashbox($pokladnaId);
        }
        
        // ✅ Uživatel bez práv může editovat jen knihy pokladen, ke kterým je přiřazen
        if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může mazat pokladní knihu
     * 
     * ✅ OPRAVENO: Kontrola podle přiřazení k pokladně
     * 
     * @param int|null $pokladnaId ID pokladny
     * @return bool True pokud má oprávnění
     */
    public function canDeleteCashbook($pokladnaId = null) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_DELETE_ALL')) return true;
        
        // ✅ DELETE_OWN - může mazat knihy svých pokladen
        if ($this->hasPermission('CASH_BOOK_DELETE_OWN')) {
            if ($pokladnaId === null) return true;
            return $this->isOwnCashbox($pokladnaId);
        }
        
        // ✅ Uživatel bez práv může mazat jen knihy pokladen, ke kterým je přiřazen
        if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může exportovat
     * 
     * @param int $cashbookUserId ID uživatele, kterému patří kniha (z 25a_pokladni_knihy.uzivatel_id)
     * @param int|null $pokladnaId ID pokladny (volitelné, pro kontrolu přiřazení)
     * @return bool True pokud má oprávnění
     */
    public function canExportCashbook($cashbookUserId, $pokladnaId = null) {
        // 🔥 Normalizace ID na int
        $cashbookUserId = $cashbookUserId !== null ? intval($cashbookUserId) : null;
        $currentUserId = intval($this->user['id']);
        
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EXPORT_ALL')) return true;
        
        // 🔥 FIX: EXPORT_OWN - pokud není specifikován cashbookUserId (null), nebo je to stejný uživatel
        if ($this->hasPermission('CASH_BOOK_EXPORT_OWN')) {
            if ($cashbookUserId === null || $cashbookUserId === $currentUserId) {
                return true;
            }
        }
        
        // Uživatel bez globálních práv může exportovat knihy z pokladen, ke kterým je přiřazen
        if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může vytvářet záznamy (entries)
     */
    public function canCreateEntry() {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může mazat záznamy (entries)
     * Stejná logika jako canEditCashbook - může mazat, když může editovat
     * 
     * @param int $cashbookUserId ID uživatele, kterému patří kniha
     * @return bool True pokud má oprávnění
     */
    public function canDeleteEntry($cashbookUserId) {
        // Použijeme stejnou logiku jako pro editaci
        return $this->canEditCashbook($cashbookUserId);
    }
    
    /**
     * Kontrola, zda může vytvářet nové knihy
     * Pro uživatele bez MANAGE/CREATE práv kontroluje přiřazení k pokladně
     * 
     * @param int|null $pokladnaId ID pokladny (volitelné, pro kontrolu přiřazení)
     * @return bool True pokud má oprávnění
     */
    public function canCreateBook($pokladnaId = null) {
        if ($this->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
        
        // Pokud nemá obecná práva, zkontrolovat přiřazení k pokladně
        if ($pokladnaId !== null) {
            return $this->isOwnCashbox($pokladnaId);
        }
        
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

        $effectiveUserIds = array((int)$this->user['id']);
        if (function_exists('get_user_ids_with_substitution')) {
            try {
                $scopeInfo = null;
                // Preferovat explicitní cashbook_transfer
                $subIds = get_user_ids_with_substitution($this->db, (int)$this->user['id'], array('cashbook_transfer'), $scopeInfo);
                if (!is_array($subIds) || count($subIds) <= 1) {
                    // Kompatibilita: starší záznamy bez cashbook_transfer
                    $subIds = get_user_ids_with_substitution($this->db, (int)$this->user['id'], array('module_visibility'), $scopeInfo);
                }
                if (!is_array($subIds) || count($subIds) <= 1) {
                    // Legacy fallback pro nejstarší záznamy
                    $subIds = get_user_ids_with_substitution($this->db, (int)$this->user['id'], array('view'), $scopeInfo);
                }
                if (is_array($subIds) && !empty($subIds)) {
                    $effectiveUserIds = array_values(array_unique(array_map('intval', $subIds)));
                }
            } catch (Exception $e) {
                error_log('CashbookPermissions::isOwnCashbox substitution lookup error: ' . $e->getMessage());
            }
        }

        if (empty($effectiveUserIds)) {
            return false;
        }

        $placeholders = implode(',', array_fill(0, count($effectiveUserIds), '?'));
        
        // Aktivní přiřazení = platne_do je NULL nebo >= dnes
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count
            FROM 25a_pokladny_uzivatele
            WHERE pokladna_id = ? 
              AND uzivatel_id IN ($placeholders)
              AND (platne_do IS NULL OR platne_do >= CURDATE())
        ");

        $params = array_merge(array((int)$pokladnaId), $effectiveUserIds);
        $stmt->execute($params);
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
