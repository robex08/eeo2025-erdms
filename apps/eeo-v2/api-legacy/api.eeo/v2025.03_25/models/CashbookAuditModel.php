<?php
/**
 * CashbookAuditModel.php
 * Model pro audit logging pokladních knih (25a_pokladni_audit)
 * PHP 5.6 kompatibilní
 */

class CashbookAuditModel {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Zalogovat akci
     */
    public function logAction($entityType, $entityId, $action, $userId, $oldValues = null, $newValues = null, $request = null) {
        $ipAddress = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
        $userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
        
        $stmt = $this->db->prepare("
            INSERT INTO 25a_pokladni_audit (
                typ_entity, entita_id, akce, uzivatel_id,
                stare_hodnoty, nove_hodnoty, ip_adresa, user_agent, vytvoreno
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        return $stmt->execute(array(
            $entityType,
            $entityId,
            $action,
            $userId,
            $oldValues ? json_encode($oldValues) : null,
            $newValues ? json_encode($newValues) : null,
            $ipAddress,
            $userAgent
        ));
    }
    
    /**
     * Získat audit log pro entitu
     */
    public function getAuditLog($entityType, $entityId, $limit = 50) {
        $limit = intval($limit); // Bezpečná konverze
        $stmt = $this->db->prepare("
            SELECT 
                a.*,
                u.username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS user_name
            FROM 25a_pokladni_audit a
            LEFT JOIN 25_uzivatele u ON a.uzivatel_id = u.id
            WHERE a.typ_entity = ? AND a.entita_id = ?
            ORDER BY a.vytvoreno DESC
            LIMIT " . $limit . "
        ");
        $stmt->execute(array($entityType, $entityId));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat všechny audit logy pro knihu (včetně položek)
     */
    public function getBookAuditLog($bookId, $limit = 100) {
        $limit = intval($limit); // Bezpečná konverze
        // Nejdřív get audit log pro samotnou knihu
        $stmt = $this->db->prepare("
            SELECT 
                a.*,
                u.username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS user_name
            FROM 25a_pokladni_audit a
            LEFT JOIN 25_uzivatele u ON a.uzivatel_id = u.id
            WHERE (a.typ_entity = 'kniha' AND a.entita_id = ?)
               OR (a.typ_entity = 'polozka' AND a.entita_id IN (
                   SELECT id FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = ?
               ))
            ORDER BY a.vytvoreno DESC
            LIMIT " . $limit . "
        ");
        $stmt->execute(array($bookId, $bookId));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
