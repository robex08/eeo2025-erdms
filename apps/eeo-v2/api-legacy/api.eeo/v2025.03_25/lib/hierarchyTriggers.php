<?php
/**
 * HIERARCHY NOTIFICATION TRIGGERS
 * 
 * Resolving příjemců notifikací na základě org. hierarchie workflow
 * 
 * @package ERDMS
 * @version 2025.03_25
 * @author Development Team
 */

/**
 * Hlavní funkce pro resolve příjemců notifikace podle hierarchie
 * 
 * WORKFLOW:
 * 1. Načte aktivní profil hierarchie z Global Settings
 * 2. Najde TEMPLATE nodes s daným eventType
 * 3. Pro každý template projde jeho EDGES
 * 4. Resolve priority (AUTO → dynamická z entity, jinak statická)
 * 5. Najde TARGET NODEs (role/department/user)
 * 6. Resolve příjemce podle scopeDefinition (ALL/SELECTED/DYNAMIC)
 * 7. Aplikuje delivery preferences (email/inApp/sms)
 * 
 * @param string $eventType - EVENT_TYPE string (např. "ORDER_APPROVED")
 * @param array $eventData - Data z události (objednávka, faktura, etc.)
 * @param PDO $pdo - Database connection
 * @return array|false ['recipients' => [...], 'variant_id' => X, 'priority' => 'URGENT'] nebo false pokud hierarchie není aktivní
 */
function resolveHierarchyNotificationRecipients($eventType, $eventData, $pdo) {
    try {
        // 1. ZKONTROLOVAT GLOBAL SETTINGS - je hierarchie zapnutá?
        $settingsStmt = $pdo->query("
            SELECT klic, hodnota 
            FROM " . TBL_NASTAVENI_GLOBALNI . " 
            WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
        ");
        
        $settings = [];
        while ($row = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['klic']] = $row['hodnota'];
        }
        
        // Pokud hierarchie není zapnutá, vrátit false
        if (empty($settings['hierarchy_enabled']) || $settings['hierarchy_enabled'] !== '1') {
            error_log("HIERARCHY TRIGGER: Hierarchy is disabled in global settings");
            return false;
        }
        
        // Pokud není vybraný profil, vrátit false
        if (empty($settings['hierarchy_profile_id'])) {
            error_log("HIERARCHY TRIGGER: No profile selected in global settings");
            return false;
        }
        
        $profileId = (int)$settings['hierarchy_profile_id'];
        
        // 2. NAČÍST STRUCTURE_JSON z profilu
        $stmt = $pdo->prepare("
            SELECT structure_json, nazev 
            FROM " . TBL_HIERARCHIE_PROFILY . " 
            WHERE id = ? AND aktivni = 1
        ");
        $stmt->execute([$profileId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile) {
            error_log("HIERARCHY TRIGGER: Profile $profileId not found or inactive");
            return false;
        }
        
        $structure = json_decode($profile['structure_json'], true);
        if (!$structure || !isset($structure['nodes']) || !isset($structure['edges'])) {
            error_log("HIERARCHY TRIGGER: Invalid structure_json in profile $profileId");
            return false;
        }
        
        error_log("HIERARCHY TRIGGER: Using profile '{$profile['nazev']}' (ID: $profileId)");
        
        // 3. NAJÍT EVENT_TYPE ID z názvu (kod sloupec)
        $eventTypeStmt = $pdo->prepare("
            SELECT id 
            FROM " . TBL_NOTIFIKACE_TYPY_UDALOSTI . " 
            WHERE kod = ?
        ");
        $eventTypeStmt->execute([$eventType]);
        $eventTypeRow = $eventTypeStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$eventTypeRow) {
            error_log("HIERARCHY TRIGGER: Event type '$eventType' not found in database");
            return false;
        }
        
        $eventTypeId = (int)$eventTypeRow['id'];
        
        // 4. NAJÍT TEMPLATE NODES které mají tento eventType
        $templateNodes = [];
        foreach ($structure['nodes'] as $node) {
            // Support both 'type' (new) and 'typ' (old) for backward compatibility
            $nodeType = $node['type'] ?? $node['typ'] ?? null;
            if ($nodeType === 'template' && isset($node['data']['eventTypes'])) {
                $nodeEventTypes = $node['data']['eventTypes'];
                if (in_array($eventTypeId, $nodeEventTypes)) {
                    $templateNodes[] = $node;
                }
            }
        }
        
        if (empty($templateNodes)) {
            error_log("HIERARCHY TRIGGER: No template nodes found for event type '$eventType' (ID: $eventTypeId)");
            return false;
        }
        
        error_log("HIERARCHY TRIGGER: Found " . count($templateNodes) . " template nodes for event '$eventType'");
        
        // 5. PRO KAŽDÝ TEMPLATE PROJÍT JEHO EDGES a RESOLVE PŘÍJEMCE
        $allRecipients = [];
        $variantId = null;
        $priority = 'WARNING'; // Default
        
        foreach ($templateNodes as $templateNode) {
            // Najít edges které vycházejí z tohoto template
            $templateEdges = array_filter($structure['edges'], function($edge) use ($templateNode, $eventTypeId) {
                // Edge musí vycházet z template
                if ($edge['source'] !== $templateNode['id']) {
                    return false;
                }
                
                // Edge musí mít tento eventType (nebo žádný = všechny)
                if (isset($edge['data']['eventTypes']) && !empty($edge['data']['eventTypes'])) {
                    return in_array($eventTypeId, $edge['data']['eventTypes']);
                }
                
                // Pokud edge nemá eventTypes, platí pro všechny eventTypes z template
                return true;
            });
            
            if (empty($templateEdges)) {
                error_log("HIERARCHY TRIGGER: No edges found for template '{$templateNode['id']}'");
                continue;
            }
            
            error_log("HIERARCHY TRIGGER: Found " . count($templateEdges) . " edges for template '{$templateNode['id']}'");
            
            // Pro každý edge resolve příjemce
            foreach ($templateEdges as $edge) {
                // RESOLVE PRIORITY z edge
                $edgePriority = $edge['data']['priority'] ?? 'WARNING';
                if ($edgePriority === 'AUTO') {
                    $edgePriority = resolveAutoPriority($eventData);
                }
                
                // První edge určuje prioritu (můžeme později rozšířit o merge logic)
                if ($priority === 'WARNING') {
                    $priority = $edgePriority;
                }
                
                // RESOLVE VARIANT z template podle priority
                $variantKey = strtolower($edgePriority) . 'Variant';
                if (isset($templateNode['data'][$variantKey])) {
                    $variantId = (int)$templateNode['data'][$variantKey];
                }
                
                // Najít TARGET NODE
                $targetNodeId = $edge['target'];
                $targetNode = null;
                foreach ($structure['nodes'] as $node) {
                    if ($node['id'] === $targetNodeId) {
                        $targetNode = $node;
                        break;
                    }
                }
                
                if (!$targetNode) {
                    error_log("HIERARCHY TRIGGER: Target node '$targetNodeId' not found");
                    continue;
                }
                
                // RESOLVE PŘÍJEMCE podle typu TARGET NODE
                $recipients = resolveTargetNodeRecipients($targetNode, $eventData, $pdo);
                
                if (!empty($recipients)) {
                    error_log("HIERARCHY TRIGGER: Resolved " . count($recipients) . " recipients from node '{$targetNode['id']}'");
                    $allRecipients = array_merge($allRecipients, $recipients);
                }
            }
        }
        
        // DEDUPLIKACE příjemců (stejný user_id může být v několika rolích/úsecích)
        $uniqueRecipients = [];
        $seenUserIds = [];
        
        foreach ($allRecipients as $recipient) {
            $userId = $recipient['user_id'];
            if (!in_array($userId, $seenUserIds)) {
                $seenUserIds[] = $userId;
                $uniqueRecipients[] = $recipient;
            }
        }
        
        error_log("HIERARCHY TRIGGER: Total unique recipients: " . count($uniqueRecipients) . ", Priority: $priority, Variant ID: $variantId");
        
        return [
            'recipients' => $uniqueRecipients,
            'variant_id' => $variantId,
            'priority' => $priority,
            'profile_id' => $profileId,
            'profile_name' => $profile['nazev']
        ];
        
    } catch (Exception $e) {
        error_log("HIERARCHY TRIGGER ERROR: " . $e->getMessage());
        return false;
    }
}

/**
 * Resolve AUTO priority podle mimoradna_udalost fieldu
 * 
 * @param array $eventData - Data entity (objednávka, faktura, etc.)
 * @return string 'URGENT' nebo 'WARNING'
 */
function resolveAutoPriority($eventData) {
    // Zkontrolovat pole mimoradna_udalost
    if (isset($eventData['mimoradna_udalost']) && $eventData['mimoradna_udalost'] == 1) {
        return 'URGENT';
    }
    
    return 'WARNING';
}

/**
 * Resolve příjemce z TARGET NODE podle jeho scopeDefinition
 * 
 * @param array $targetNode - Node objekt z structure JSON
 * @param array $eventData - Data entity pro DYNAMIC resolution
 * @param PDO $pdo - Database connection
 * @return array Pole příjemců [{user_id, delivery: {email, inApp, sms}}]
 */
function resolveTargetNodeRecipients($targetNode, $eventData, $pdo) {
    // Support both 'type' (new) and 'typ' (old) for backward compatibility
    $nodeType = $targetNode['type'] ?? $targetNode['typ'] ?? null;
    $nodeData = $targetNode['data'] ?? [];
    $recipients = [];
    
    if (!$nodeType) {
        error_log("HIERARCHY TRIGGER: Node missing type/typ field");
        return [];
    }
    
    // Delivery preferences z NODE (default: email + inApp)
    $delivery = $nodeData['delivery'] ?? ['email' => true, 'inApp' => true, 'sms' => false];
    
    // Scope definition
    $scopeDef = $nodeData['scopeDefinition'] ?? ['type' => 'ALL'];
    $scopeType = $scopeDef['type'];
    
    try {
        if ($nodeType === 'role') {
            $roleId = $nodeData['roleId'] ?? null;
            if (!$roleId) {
                error_log("HIERARCHY TRIGGER: Role node missing roleId");
                return [];
            }
            
            if ($scopeType === 'ALL') {
                // Všichni uživatelé s touto rolí
                $stmt = $pdo->prepare("
                    SELECT DISTINCT u.id as user_id, u.email, u.username
                    FROM " . TBL_UZIVATELE . " u
                    INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON u.id = ur.uzivatel_id
                    WHERE ur.role_id = ? AND u.aktivni = 1
                ");
                $stmt->execute([$roleId]);
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $recipients[] = [
                        'user_id' => (int)$row['user_id'],
                        'email' => $row['email'],
                        'username' => $row['username'],
                        'delivery' => $delivery
                    ];
                }
                
            } elseif ($scopeType === 'SELECTED') {
                // Jen vybraní uživatelé z selectedIds
                $selectedIds = $scopeDef['selectedIds'] ?? [];
                if (empty($selectedIds)) {
                    return [];
                }
                
                $placeholders = implode(',', array_fill(0, count($selectedIds), '?'));
                $stmt = $pdo->prepare("
                    SELECT id as user_id, email, username
                    FROM " . TBL_UZIVATELE . "
                    WHERE id IN ($placeholders) AND aktivni = 1
                ");
                $stmt->execute($selectedIds);
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $recipients[] = [
                        'user_id' => (int)$row['user_id'],
                        'email' => $row['email'],
                        'username' => $row['username'],
                        'delivery' => $delivery
                    ];
                }
                
            } elseif ($scopeType === 'DYNAMIC_FROM_ENTITY') {
                // Dynamicky z entity field
                $field = $scopeDef['field'] ?? null;
                if (!$field || !isset($eventData[$field])) {
                    error_log("HIERARCHY TRIGGER: DYNAMIC field '$field' not found in event data");
                    return [];
                }
                
                $userId = (int)$eventData[$field];
                if ($userId > 0) {
                    $stmt = $pdo->prepare("
                        SELECT id as user_id, email, username
                        FROM " . TBL_UZIVATELE . "
                        WHERE id = ? AND aktivni = 1
                    ");
                    $stmt->execute([$userId]);
                    
                    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $recipients[] = [
                            'user_id' => (int)$row['user_id'],
                            'email' => $row['email'],
                            'username' => $row['username'],
                            'delivery' => $delivery
                        ];
                    }
                }
            }
            
        } elseif ($nodeType === 'department') {
            $departmentId = $nodeData['departmentId'] ?? null;
            if (!$departmentId) {
                error_log("HIERARCHY TRIGGER: Department node missing departmentId");
                return [];
            }
            
            if ($scopeType === 'ALL') {
                // Všichni uživatelé v tomto úseku
                $stmt = $pdo->prepare("
                    SELECT id as user_id, email, username
                    FROM " . TBL_UZIVATELE . "
                    WHERE usek_id = ? AND aktivni = 1
                ");
                $stmt->execute([$departmentId]);
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $recipients[] = [
                        'user_id' => (int)$row['user_id'],
                        'email' => $row['email'],
                        'username' => $row['username'],
                        'delivery' => $delivery
                    ];
                }
                
            } elseif ($scopeType === 'SELECTED') {
                // Jen vybraní uživatelé z selectedIds
                $selectedIds = $scopeDef['selectedIds'] ?? [];
                if (empty($selectedIds)) {
                    return [];
                }
                
                $placeholders = implode(',', array_fill(0, count($selectedIds), '?'));
                $stmt = $pdo->prepare("
                    SELECT id as user_id, email, username
                    FROM " . TBL_UZIVATELE . "
                    WHERE id IN ($placeholders) AND aktivni = 1
                ");
                $stmt->execute($selectedIds);
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $recipients[] = [
                        'user_id' => (int)$row['user_id'],
                        'email' => $row['email'],
                        'username' => $row['username'],
                        'delivery' => $delivery
                    ];
                }
                
            } elseif ($scopeType === 'DYNAMIC_FROM_ENTITY') {
                // Stejná logika jako u role
                $field = $scopeDef['field'] ?? null;
                if (!$field || !isset($eventData[$field])) {
                    error_log("HIERARCHY TRIGGER: DYNAMIC field '$field' not found in event data");
                    return [];
                }
                
                $userId = (int)$eventData[$field];
                if ($userId > 0) {
                    $stmt = $pdo->prepare("
                        SELECT id as user_id, email, username
                        FROM " . TBL_UZIVATELE . "
                        WHERE id = ? AND aktivni = 1
                    ");
                    $stmt->execute([$userId]);
                    
                    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $recipients[] = [
                            'user_id' => (int)$row['user_id'],
                            'email' => $row['email'],
                            'username' => $row['username'],
                            'delivery' => $delivery
                        ];
                    }
                }
            }
            
        } elseif ($nodeType === 'user') {
            // Konkrétní uživatel
            $userId = $nodeData['userId'] ?? null;
            if (!$userId) {
                error_log("HIERARCHY TRIGGER: User node missing userId");
                return [];
            }
            
            $stmt = $pdo->prepare("
                SELECT id as user_id, email, username
                FROM " . TBL_UZIVATELE . "
                WHERE id = ? AND aktivni = 1
            ");
            $stmt->execute([$userId]);
            
            if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $recipients[] = [
                    'user_id' => (int)$row['user_id'],
                    'email' => $row['email'],
                    'username' => $row['username'],
                    'delivery' => $delivery
                ];
            }
        }
        
    } catch (Exception $e) {
        error_log("HIERARCHY TRIGGER: Error resolving recipients for node type '$nodeType': " . $e->getMessage());
    }
    
    return $recipients;
}

/**
 * Helper funkce pro získání aktivního profilu hierarchie
 * 
 * @param PDO $pdo
 * @return int|null ID aktivního profilu nebo null
 */
function getActiveHierarchyProfileId($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT hodnota 
            FROM " . TBL_NASTAVENI_GLOBALNI . " 
            WHERE klic = 'hierarchy_profile_id'
        ");
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['hodnota'])) {
            return (int)$row['hodnota'];
        }
    } catch (Exception $e) {
        error_log("Error getting active hierarchy profile: " . $e->getMessage());
    }
    
    return null;
}

/**
 * Helper funkce pro kontrolu zda je hierarchie zapnutá
 * 
 * @param PDO $pdo
 * @return bool
 */
function isHierarchyEnabled($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT hodnota 
            FROM " . TBL_NASTAVENI_GLOBALNI . " 
            WHERE klic = 'hierarchy_enabled'
        ");
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row && $row['hodnota'] === '1';
    } catch (Exception $e) {
        error_log("Error checking hierarchy enabled: " . $e->getMessage());
    }
    
    return false;
}
