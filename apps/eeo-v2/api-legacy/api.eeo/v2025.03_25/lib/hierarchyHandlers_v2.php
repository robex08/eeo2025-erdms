<?php
/**
 * NOVÝ REFACTORED SYSTÉM PRO HIERARCHII
 * Jednoduché, přímočaré API pro ukládání a načítání vztahů
 */

require_once __DIR__ . '/queries.php';

/**
 * Uložení hierarchie - NOVÁ VERZE
 * Frontend posílá pole vztahů (edges) s jejich pozicemi
 */
function handle_hierarchy_save_v2($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username mismatch');
    }
    
    try {
        $pdo->beginTransaction();
        
        $relations = isset($data['relations']) ? $data['relations'] : array();
        $userId = $token_data['id'];
        $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : 1;
        
        // Smazat všechny vztahy v profilu
        $stmt = $pdo->prepare("DELETE FROM ".TBL_HIERARCHIE_VZTAHY." WHERE profil_id = ?");
        $stmt->execute(array($profilId));
        
        // Vložit nové vztahy
        if (!empty($relations)) {
            $sql = "
                INSERT INTO ".TBL_HIERARCHIE_VZTAHY." (
                    profil_id, typ_vztahu,
                    user_id_1, user_id_2, lokalita_id, usek_id, template_id, role_id,
                    pozice_node_1, pozice_node_2,
                    uroven_opravneni, druh_vztahu,
                    viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
                    viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
                    modules, permission_level, extended_data,
                    notifikace_email, notifikace_inapp, notifikace_typy, notifikace_recipient_role,
                    node_settings,
                    upravil_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $stmt = $pdo->prepare($sql);
            
            foreach ($relations as $rel) {
                $stmt->execute(array(
                    $profilId,
                    $rel['type'], // 'user-user', 'location-user', 'template-user', etc.
                    isset($rel['user_id_1']) ? (int)$rel['user_id_1'] : null,
                    isset($rel['user_id_2']) ? (int)$rel['user_id_2'] : null,
                    isset($rel['lokalita_id']) ? (int)$rel['lokalita_id'] : null,
                    isset($rel['usek_id']) ? (int)$rel['usek_id'] : null,
                    isset($rel['template_id']) ? (int)$rel['template_id'] : null,
                    isset($rel['role_id']) ? (int)$rel['role_id'] : null,
                    json_encode(isset($rel['position_1']) ? $rel['position_1'] : null),
                    json_encode(isset($rel['position_2']) ? $rel['position_2'] : null),
                    isset($rel['level']) ? (int)$rel['level'] : 1,
                    isset($rel['relationshipType']) ? $rel['relationshipType'] : (isset($rel['druh_vztahu']) ? $rel['druh_vztahu'] : 'prime'),
                    isset($rel['visibility']['objednavky']) ? (int)$rel['visibility']['objednavky'] : 0,
                    isset($rel['visibility']['faktury']) ? (int)$rel['visibility']['faktury'] : 0,
                    isset($rel['visibility']['smlouvy']) ? (int)$rel['visibility']['smlouvy'] : 0,
                    isset($rel['visibility']['pokladna']) ? (int)$rel['visibility']['pokladna'] : 0,
                    isset($rel['visibility']['uzivatele']) ? (int)$rel['visibility']['uzivatele'] : 0,
                    isset($rel['visibility']['lp']) ? (int)$rel['visibility']['lp'] : 0,
                    json_encode(isset($rel['modules']) ? $rel['modules'] : array()),
                    json_encode(isset($rel['permissionLevel']) ? $rel['permissionLevel'] : array()),
                    json_encode(isset($rel['extended']) ? $rel['extended'] : array()),
                    isset($rel['notifications']['email']) ? (int)$rel['notifications']['email'] : 0,
                    isset($rel['notifications']['inapp']) ? (int)$rel['notifications']['inapp'] : 0,
                    json_encode(isset($rel['notifications']['types']) ? $rel['notifications']['types'] : array()),
                    isset($rel['notifications']['recipientRole']) ? $rel['notifications']['recipientRole'] : 'APPROVAL',
                    json_encode(isset($rel['node_settings']) ? $rel['node_settings'] : array()),
                    $userId
                ));
            }
        }
        
        $pdo->commit();
        
        return array(
            'success' => true,
            'message' => 'Hierarchie ulozena',
            'saved_relations' => count($relations),
            'profile_id' => $profilId
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("HIERARCHY SAVE V2 ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri ukladani', 'details' => $e->getMessage());
    }
}

/**
 * Načtení hierarchie - NOVÁ VERZE
 * Vrací seznam vztahů s detaily všech zapojených nodes
 */
function handle_hierarchy_structure_v2($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $token_data = verify_token($token, $pdo);
    
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny token');
    }
    
    $profilId = isset($data['profilId']) ? (int)$data['profilId'] : null;
    
    // Pokud není zadán profil, použít aktivní
    if (!$profilId) {
        $stmt = $pdo->query("SELECT id FROM ".TBL_HIERARCHIE_PROFILY." WHERE aktivni = 1 LIMIT 1");
        $activeProfile = $stmt->fetch(PDO::FETCH_ASSOC);
        $profilId = $activeProfile ? (int)$activeProfile['id'] : 1;
    }
    
    try {
        // Načíst všechny vztahy
        $sql = "
            SELECT 
                v.id,
                v.typ_vztahu,
                v.user_id_1,
                v.user_id_2,
                v.lokalita_id,
                v.usek_id,
                v.role_id,
                v.pozice_node_1,
                v.pozice_node_2,
                v.uroven_opravneni,
                v.viditelnost_objednavky,
                v.viditelnost_faktury,
                v.viditelnost_smlouvy,
                v.viditelnost_pokladna,
                v.viditelnost_uzivatele,
                v.viditelnost_lp,
                v.druh_vztahu,
                v.modules,
                v.permission_level,
                v.extended_data,
                v.notifikace_email,
                v.notifikace_inapp,
                v.notifikace_typy,
                v.notifikace_recipient_role,
                v.node_settings,
                u1.jmeno as user1_jmeno,
                u1.prijmeni as user1_prijmeni,
                u1.pozice_id as user1_pozice_id,
                p1.nazev_pozice as user1_pozice,
                u1.lokalita_id as user1_lokalita_id,
                l1.nazev as user1_lokalita,
                u1.usek_id as user1_usek_id,
                us1.usek_nazev as user1_usek,
                u2.jmeno as user2_jmeno,
                u2.prijmeni as user2_prijmeni,
                u2.pozice_id as user2_pozice_id,
                p2.nazev_pozice as user2_pozice,
                u2.lokalita_id as user2_lokalita_id,
                l2.nazev as user2_lokalita,
                u2.usek_id as user2_usek_id,
                us2.usek_nazev as user2_usek,
                l.nazev as lokalita_nazev,
                us.usek_nazev as usek_nazev,
                v.template_id,
                t.name as template_name,
                r.nazev_role as role_nazev,
                r.Popis as role_popis
            FROM ".TBL_HIERARCHIE_VZTAHY." v
            LEFT JOIN ".TBL_UZIVATELE." u1 ON v.user_id_1 = u1.id
            LEFT JOIN ".TBL_POZICE." p1 ON u1.pozice_id = p1.id
            LEFT JOIN ".TBL_LOKALITY." l1 ON u1.lokalita_id = l1.id
            LEFT JOIN ".TBL_USEKY." us1 ON u1.usek_id = us1.id
            LEFT JOIN ".TBL_UZIVATELE." u2 ON v.user_id_2 = u2.id
            LEFT JOIN ".TBL_POZICE." p2 ON u2.pozice_id = p2.id
            LEFT JOIN ".TBL_LOKALITY." l2 ON u2.lokalita_id = l2.id
            LEFT JOIN ".TBL_USEKY." us2 ON u2.usek_id = us2.id
            LEFT JOIN ".TBL_LOKALITY." l ON v.lokalita_id = l.id
            LEFT JOIN ".TBL_USEKY." us ON v.usek_id = us.id
            LEFT JOIN ".TABLE_NOTIFIKACE_SABLONY." t ON v.template_id = t.id
            LEFT JOIN 25_role r ON v.role_id = r.id
            WHERE v.profil_id = ? AND v.aktivni = 1
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array($profilId));
        
        $relations = array();
        $nodes = array();
        $nodeIds = array(); // Pro deduplikaci
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Vytvořit vztah
            $relation = array(
                'id' => $row['id'],
                'type' => $row['typ_vztahu'],
                'level' => (int)$row['uroven_opravneni'],
                'relationshipType' => $row['druh_vztahu'] ?: 'prime',
                'druh_vztahu' => $row['druh_vztahu'] ?: 'prime',
                'visibility' => array(
                    'objednavky' => (bool)$row['viditelnost_objednavky'],
                    'faktury' => (bool)$row['viditelnost_faktury'],
                    'smlouvy' => (bool)$row['viditelnost_smlouvy'],
                    'pokladna' => (bool)$row['viditelnost_pokladna'],
                    'uzivatele' => (bool)$row['viditelnost_uzivatele'],
                    'lp' => (bool)$row['viditelnost_lp']
                ),
                'modules' => $row['modules'] ? json_decode($row['modules'], true) : array(),
                'permissionLevel' => $row['permission_level'] ? json_decode($row['permission_level'], true) : array(),
                'extended' => $row['extended_data'] ? json_decode($row['extended_data'], true) : array(
                    'locations' => array(),
                    'departments' => array(),
                    'combinations' => array()
                ),
                'notifications' => array(
                    'email' => (bool)$row['notifikace_email'],
                    'inapp' => (bool)$row['notifikace_inapp'],
                    'types' => $row['notifikace_typy'] ? json_decode($row['notifikace_typy'], true) : array(),
                    'recipientRole' => $row['notifikace_recipient_role'] ?: 'APPROVAL'
                ),
                'node_settings' => $row['node_settings'] ? json_decode($row['node_settings'], true) : array(),
                'node_1' => null,
                'node_2' => null,
                'position_1' => $row['pozice_node_1'] ? json_decode($row['pozice_node_1'], true) : null,
                'position_2' => $row['pozice_node_2'] ? json_decode($row['pozice_node_2'], true) : null
            );
            
            // Určit node_1 podle typu vztahu
            $relationType = $row['typ_vztahu'];
            $parts = explode('-', $relationType);
            $type1 = $parts[0]; // 'user', 'location', 'department'
            
            // Přidat node 1 detaily podle prvního typu ve vztahu
            if ($type1 === 'user' && $row['user_id_1']) {
                $nodeId = 'user-' . $row['user_id_1'];
                $relation['node_1'] = $nodeId;
                $relation['user_id_1'] = (int)$row['user_id_1'];
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'user',
                        'userId' => (int)$row['user_id_1'],
                        'name' => trim($row['user1_jmeno'] . ' ' . $row['user1_prijmeni']),
                        'position' => $row['user1_pozice'] ?: 'Neuvedeno',
                        'initials' => mb_strtoupper(
                            mb_substr($row['user1_jmeno'], 0, 1, 'UTF-8') .
                            mb_substr($row['user1_prijmeni'], 0, 1, 'UTF-8'),
                            'UTF-8'
                        ),
                        'metadata' => array(
                            'location' => $row['user1_lokalita'] ?: null,
                            'department' => $row['user1_usek'] ?: null
                        )
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type1 === 'location' && $row['lokalita_id']) {
                $nodeId = 'location-' . $row['lokalita_id'];
                $relation['node_1'] = $nodeId;
                $relation['lokalita_id'] = (int)$row['lokalita_id'];
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'location',
                        'locationId' => (int)$row['lokalita_id'],
                        'name' => $row['lokalita_nazev']
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type1 === 'department' && $row['usek_id']) {
                $nodeId = 'department-' . $row['usek_id'];
                $relation['node_1'] = $nodeId;
                $relation['usek_id'] = (int)$row['usek_id'];
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'department',
                        'departmentId' => (int)$row['usek_id'],
                        'name' => $row['usek_nazev']
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type1 === 'template' && $row['template_id']) {
                $nodeId = 'template-' . $row['template_id'];
                $relation['node_1'] = $nodeId;
                $relation['template_id'] = (int)$row['template_id'];
                
                if (!isset($nodeIds[$nodeId])) {
                    // Extrahovat node_settings pro source node
                    $nodeSettings = $row['node_settings'] ? json_decode($row['node_settings'], true) : array();
                    $sourceSettings = isset($nodeSettings['source']) ? $nodeSettings['source'] : array();
                    
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'template',
                        'templateId' => (int)$row['template_id'],
                        'name' => $row['template_name'],
                        'settings' => array(
                            'normalVariant' => isset($sourceSettings['normalVariant']) ? $sourceSettings['normalVariant'] : null,
                            'urgentVariant' => isset($sourceSettings['urgentVariant']) ? $sourceSettings['urgentVariant'] : null,
                            'infoVariant' => isset($sourceSettings['infoVariant']) ? $sourceSettings['infoVariant'] : null,
                            'previewVariant' => isset($sourceSettings['previewVariant']) ? $sourceSettings['previewVariant'] : null
                        )
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type1 === 'role' && $row['role_id']) {
                $nodeId = 'role-' . $row['role_id'];
                $relation['node_1'] = $nodeId;
                $relation['role_id'] = (int)$row['role_id'];
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'role',
                        'roleId' => (int)$row['role_id'],
                        'name' => $row['role_nazev'],
                        'popis' => $row['role_popis'] ?: ''
                    );
                    $nodeIds[$nodeId] = true;
                }
            }
            
            // Určit node_2 podle typu vztahu
            $type2 = isset($parts[1]) ? $parts[1] : 'user'; // druhý typ ve vztahu
            
            // Přidat node 2 detaily podle druhého typu ve vztahu
            if ($type2 === 'user' && $row['user_id_2']) {
                $nodeId = 'user-' . $row['user_id_2'];
                $relation['node_2'] = $nodeId;
                $relation['user_id_2'] = (int)$row['user_id_2'];
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'user',
                        'userId' => (int)$row['user_id_2'],
                        'name' => trim($row['user2_jmeno'] . ' ' . $row['user2_prijmeni']),
                        'position' => $row['user2_pozice'] ?: 'Neuvedeno',
                        'initials' => mb_strtoupper(
                            mb_substr($row['user2_jmeno'], 0, 1, 'UTF-8') .
                            mb_substr($row['user2_prijmeni'], 0, 1, 'UTF-8'),
                            'UTF-8'
                        ),
                        'metadata' => array(
                            'location' => $row['user2_lokalita'] ?: null,
                            'department' => $row['user2_usek'] ?: null
                        )
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type2 === 'location' && $row['lokalita_id']) {
                $nodeId = 'location-' . $row['lokalita_id'];
                $relation['node_2'] = $nodeId;
                if (!isset($relation['lokalita_id'])) {
                    $relation['lokalita_id'] = (int)$row['lokalita_id'];
                }
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'location',
                        'locationId' => (int)$row['lokalita_id'],
                        'name' => $row['lokalita_nazev']
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type2 === 'department' && $row['usek_id']) {
                $nodeId = 'department-' . $row['usek_id'];
                $relation['node_2'] = $nodeId;
                if (!isset($relation['usek_id'])) {
                    $relation['usek_id'] = (int)$row['usek_id'];
                }
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'department',
                        'departmentId' => (int)$row['usek_id'],
                        'name' => $row['usek_nazev']
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type2 === 'template' && $row['template_id']) {
                $nodeId = 'template-' . $row['template_id'];
                $relation['node_2'] = $nodeId;
                if (!isset($relation['template_id'])) {
                    $relation['template_id'] = (int)$row['template_id'];
                }
                
                if (!isset($nodeIds[$nodeId])) {
                    // Extrahovat node_settings pro target node
                    $nodeSettings = $row['node_settings'] ? json_decode($row['node_settings'], true) : array();
                    $targetSettings = isset($nodeSettings['target']) ? $nodeSettings['target'] : array();
                    
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'template',
                        'templateId' => (int)$row['template_id'],
                        'name' => $row['template_name'],
                        'settings' => array(
                            'normalVariant' => isset($targetSettings['normalVariant']) ? $targetSettings['normalVariant'] : null,
                            'urgentVariant' => isset($targetSettings['urgentVariant']) ? $targetSettings['urgentVariant'] : null,
                            'infoVariant' => isset($targetSettings['infoVariant']) ? $targetSettings['infoVariant'] : null,
                            'previewVariant' => isset($targetSettings['previewVariant']) ? $targetSettings['previewVariant'] : null
                        )
                    );
                    $nodeIds[$nodeId] = true;
                }
            } elseif ($type2 === 'role' && $row['role_id']) {
                $nodeId = 'role-' . $row['role_id'];
                $relation['node_2'] = $nodeId;
                if (!isset($relation['role_id'])) {
                    $relation['role_id'] = (int)$row['role_id'];
                }
                
                if (!isset($nodeIds[$nodeId])) {
                    $nodes[] = array(
                        'id' => $nodeId,
                        'type' => 'role',
                        'roleId' => (int)$row['role_id'],
                        'name' => $row['role_nazev'],
                        'popis' => $row['role_popis'] ?: ''
                    );
                    $nodeIds[$nodeId] = true;
                }
            }
            
            $relations[] = $relation;
        }
        
        return array(
            'success' => true,
            'data' => array(
                'nodes' => $nodes,
                'relations' => $relations
            ),
            'counts' => array(
                'nodes' => count($nodes),
                'relations' => count($relations)
            )
        );
        
    } catch (PDOException $e) {
        error_log("HIERARCHY STRUCTURE V2 ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri nacitani', 'details' => $e->getMessage());
    }
}
