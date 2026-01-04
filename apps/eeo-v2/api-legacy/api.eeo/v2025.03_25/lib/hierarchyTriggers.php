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
        
        // 4. NAJÍT EDGES které mají tento eventType (nový systém 2025.03_25)
        // ✅ SUPPORT: Edges s eventTypes (nový) + fallback na template nodes (starý systém)
        $matchingEdges = [];
        
        // PRIORITY 1: Hledat edges s eventTypes (nový systém)
        foreach ($structure['edges'] as $edge) {
            if (!isset($edge['data']['eventTypes']) || empty($edge['data']['eventTypes'])) {
                continue;
            }
            
            $edgeEventTypes = $edge['data']['eventTypes'];
            
            // ✅ SUPPORT: Both ID (1) and STRING ("ORDER_PENDING_APPROVAL") formats
            $hasEventType = false;
            foreach ($edgeEventTypes as $edgeEventType) {
                if ($edgeEventType === $eventTypeId || $edgeEventType === $eventType) {
                    $hasEventType = true;
                    break;
                }
            }
            
            if ($hasEventType) {
                $matchingEdges[] = $edge;
            }
        }
        
        // FALLBACK: Pokud nejsou edges s eventTypes, hledej template nodes (starý systém)
        if (empty($matchingEdges)) {
            error_log("HIERARCHY TRIGGER: No edges with eventTypes found, trying template nodes (legacy mode)");
            
            $templateNodes = [];
            foreach ($structure['nodes'] as $node) {
                $nodeType = $node['type'] ?? $node['typ'] ?? null;
                if ($nodeType === 'template' && isset($node['data']['eventTypes'])) {
                    $nodeEventTypes = $node['data']['eventTypes'];
                    
                    $hasEventType = false;
                    foreach ($nodeEventTypes as $nodeEventType) {
                        if ($nodeEventType === $eventTypeId || $nodeEventType === $eventType) {
                            $hasEventType = true;
                            break;
                        }
                    }
                    
                    if ($hasEventType) {
                        $templateNodes[] = $node;
                    }
                }
            }
            
            // Převést template nodes na edges
            foreach ($templateNodes as $templateNode) {
                $templateEdges = array_filter($structure['edges'], function($edge) use ($templateNode) {
                    return $edge['source'] === $templateNode['id'];
                });
                $matchingEdges = array_merge($matchingEdges, $templateEdges);
            }
        }
        
        if (empty($matchingEdges)) {
            error_log("HIERARCHY TRIGGER: No edges found for event type '$eventType' (ID: $eventTypeId)");
            return false;
        }
        
        error_log("HIERARCHY TRIGGER: Found " . count($matchingEdges) . " edges for event '$eventType'");
        
        // 5. PRO KAŽDÝ EDGE RESOLVE PŘÍJEMCE
        $allRecipients = [];
        $variantId = null;
        $priority = 'WARNING'; // Default
        
        foreach ($matchingEdges as $edge) {
            // Najít SOURCE TEMPLATE pro variant resolution
            $templateNode = null;
            foreach ($structure['nodes'] as $node) {
                $nodeType = $node['type'] ?? $node['typ'] ?? null;
                if ($node['id'] === $edge['source'] && $nodeType === 'template') {
                    $templateNode = $node;
                    break;
                }
            }
            
            if (!$templateNode) {
                error_log("HIERARCHY TRIGGER: Template node '{$edge['source']}' not found for edge");
                continue;
            }
            // RESOLVE PRIORITY z edge
            $edgePriority = $edge['data']['priority'] ?? 'WARNING';
            if ($edgePriority === 'AUTO') {
                $edgePriority = resolveAutoPriority($eventData);
            }
            
            // POUŽÍT TEMPLATE ID (ne varianty - ty jsou jen názvy!)
            if ($variantId === null && isset($templateNode['data']['templateId'])) {
                $variantId = (int)$templateNode['data']['templateId'];
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
                error_log("HIERARCHY TRIGGER: Resolved " . count($recipients) . " recipients from node '{$targetNode['id']}' (Priority: $edgePriority)");
                foreach ($recipients as $r) {
                    error_log("  → User {$r['user_id']}: {$r['email']}");
                }
                // Přidat priority k KAŽDÉMU příjemci z tohoto edge
                foreach ($recipients as &$recipient) {
                    $recipient['priority'] = $edgePriority;
                }
                unset($recipient); // MUSÍ být - jinak reference kontaminuje další foreach!
                $allRecipients = array_merge($allRecipients, $recipients);
            }
        }
        
        // DEDUPLIKACE příjemců (stejný user_id může být v několika rolích/úsecích)
        // POZOR: Zachovat nejvyšší prioritu pokud user je víckrát!
        $uniqueRecipients = [];
        $seenUsers = [];
        
        error_log("HIERARCHY TRIGGER: Starting deduplication with " . count($allRecipients) . " total recipients");
        foreach ($allRecipients as $i => $r) {
            error_log("  allRecipients[$i]: user_id={$r['user_id']}, email={$r['email']}, priority={$r['priority']}");
        }
        
        foreach ($allRecipients as $recipient) {
            $userId = $recipient['user_id'];
            error_log("  Processing User $userId...");
            
            if (!isset($seenUsers[$userId])) {
                error_log("    → NEW user, adding to list");
                $seenUsers[$userId] = $recipient;
            } else {
                error_log("    → DUPLICATE user, merging delivery settings");
                // Sloučit delivery (OR logic - pokud jeden má email=true, zachovat true)
                $existing = $seenUsers[$userId];
                $seenUsers[$userId]['delivery']['email'] = ($existing['delivery']['email'] ?? false) || ($recipient['delivery']['email'] ?? false);
                $seenUsers[$userId]['delivery']['inApp'] = ($existing['delivery']['inApp'] ?? false) || ($recipient['delivery']['inApp'] ?? false);
                $seenUsers[$userId]['delivery']['sms'] = ($existing['delivery']['sms'] ?? false) || ($recipient['delivery']['sms'] ?? false);
                
                // Zachovat nejvyšší prioritu (URGENT > WARNING > INFO)
                $priorityOrder = ['INFO' => 1, 'WARNING' => 2, 'URGENT' => 3];
                $existingPrio = $priorityOrder[$existing['priority'] ?? 'INFO'] ?? 1;
                $newPrio = $priorityOrder[$recipient['priority'] ?? 'INFO'] ?? 1;
                if ($newPrio > $existingPrio) {
                    $seenUsers[$userId]['priority'] = $recipient['priority'];
                }
            }
        }
        
        $uniqueRecipients = array_values($seenUsers);
        $priority = 'WARNING'; // Default pro zpětnou kompatibilitu
        
        error_log("HIERARCHY TRIGGER: Total unique recipients: " . count($uniqueRecipients) . ", Template ID: $variantId");
        
        return [
            'recipients' => $uniqueRecipients,
            'variant_id' => $variantId,
            'variant_key' => $priority,
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
    
    // READ DELIVERY SETTINGS (pouze 'delivery', žádná duplikace!)
    $delivery = $nodeData['delivery'] ?? ['email' => true, 'inApp' => true, 'sms' => false];
    
    // ✅ SCOPE COMPATIBILITY: Auto-add roleId if missing but nodeData['roleId'] exists
    $scopeDef = $nodeData['scopeDefinition'] ?? ['type' => 'ALL'];
    if (!isset($scopeDef['roleId']) && isset($nodeData['roleId'])) {
        $scopeDef['roleId'] = $nodeData['roleId'];
    }
    $scopeType = $scopeDef['type'];
    
    try {
        if ($nodeType === 'role') {
            // ✅ ROLEID COMPATIBILITY: Try scopeDefinition.roleId first, fallback to nodeData.roleId
            $roleId = $scopeDef['roleId'] ?? $nodeData['roleId'] ?? null;
            if (!$roleId) {
                error_log("HIERARCHY TRIGGER: Role node missing roleId (checked both scopeDefinition and nodeData)");
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
                // ✅ NOVÝ SYSTÉM 2025.03_25: Podpora pro MULTI-FIELD (fields array)
                // Dynamicky z entity field(s) - podporuje 'field' (starý) i 'fields' (nový)
                
                // ZPĚTNÁ KOMPATIBILITA: Podpora pro starý formát {field: "prikazce_id"}
                $fields = [];
                if (isset($scopeDef['fields']) && is_array($scopeDef['fields']) && !empty($scopeDef['fields'])) {
                    // NOVÝ FORMÁT: {fields: ["prikazce_id", "objednatel_id", "garant_uzivatel_id"]}
                    $fields = $scopeDef['fields'];
                    error_log("HIERARCHY TRIGGER: DYNAMIC - using MULTI-FIELD mode with " . count($fields) . " fields");
                } elseif (isset($scopeDef['field']) && $scopeDef['field']) {
                    // STARÝ FORMÁT: {field: "prikazce_id"} - převést na array
                    $fields = [$scopeDef['field']];
                    error_log("HIERARCHY TRIGGER: DYNAMIC - using SINGLE-FIELD mode (legacy)");
                } else {
                    error_log("HIERARCHY TRIGGER: DYNAMIC - no field(s) specified in scopeDefinition");
                    return [];
                }
                
                // Projít všechny fieldy a vyresolvovat uživatele
                $processedUserIds = []; // Zabránit duplicitám v rámci jednoho nodu
                foreach ($fields as $field) {
                    if (!isset($eventData[$field])) {
                        error_log("HIERARCHY TRIGGER: DYNAMIC - field '$field' not found in event data, skipping");
                        continue;
                    }
                    
                    $userId = (int)$eventData[$field];
                    
                    // Přeskočit pokud už byl zpracován (v rámci tohoto nodu)
                    if (in_array($userId, $processedUserIds)) {
                        error_log("HIERARCHY TRIGGER: DYNAMIC - userId=$userId from field='$field' already processed, skipping");
                        continue;
                    }
                    
                    error_log("HIERARCHY TRIGGER: DYNAMIC - field='$field', userId=$userId");
                    
                    if ($userId > 0) {
                        // ZKONTROLOVAT že user má danou roli!
                        $stmt = $pdo->prepare("
                            SELECT u.id as user_id, u.email, u.username
                            FROM " . TBL_UZIVATELE . " u
                            INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON u.id = ur.uzivatel_id
                            WHERE u.id = ? AND ur.role_id = ? AND u.aktivni = 1
                        ");
                        $stmt->execute([$userId, $roleId]);
                        
                        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $recipients[] = [
                                'user_id' => (int)$row['user_id'],
                                'email' => $row['email'],
                                'username' => $row['username'],
                                'delivery' => $delivery
                            ];
                            $processedUserIds[] = $userId;
                            error_log("HIERARCHY TRIGGER: DYNAMIC - User $userId from field '$field' added");
                        } else {
                            error_log("HIERARCHY TRIGGER: DYNAMIC - User $userId from field '$field' does not have role $roleId");
                        }
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
