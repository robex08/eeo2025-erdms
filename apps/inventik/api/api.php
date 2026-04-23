<?php
/**
 * Inventik REST API
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$endpoint = $_GET['endpoint'] ?? 'test';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($endpoint) {
        case 'test':
            echo json_encode(['success' => true, 'message' => 'Inventik API running', 'timestamp' => date('Y-m-d H:i:s')]);
            break;

        case 'majetek':
            if ($method === 'GET') {
                $cislo = $_GET['cislo'] ?? null;
                $limit = (int)($_GET['limit'] ?? 20);
                
                if ($cislo) {
                    // Detail majetku podle čísla
                    $stmt = $pdo->prepare("
                        SELECT m.id, m.cislo, m.nazev, m.cena_mj_num, m.datum_zarazeni, m.mistnost_nalezena,
                               m.budt, m.mist, m.cinv,
                               b.budovat as budova_nazev,
                               mi.mistt as mistnost_nazev,
                               iu.nazinv as inv_usek_nazev
                        FROM majetek m
                        LEFT JOIN budovy b ON m.budt = b.budt
                        LEFT JOIN mistnosti mi ON m.budt = mi.budt AND m.mist = mi.mist
                        LEFT JOIN inventarni_useky iu ON m.cinv = iu.cinv
                        WHERE m.cislo = :cislo LIMIT 1
                    ");
                    $stmt->execute(['cislo' => $cislo]);
                    $result = $stmt->fetch();
                    
                    if ($result) {
                        echo json_encode(['success' => true, 'data' => $result]);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Not found']);
                    }
                } else {
                    // Seznam majetku s informací o inventarizaci - paging + search
                    $uzivatel = $_GET['uzivatel'] ?? null;
                    $inventarizovano = $_GET['inventarizovano'] ?? null; // 'ano', 'ne', null = vse
                    $search = trim($_GET['search'] ?? '');
                    $page = max(1, (int)($_GET['page'] ?? 1));
                    $perPage = min(200, max(10, (int)($_GET['per_page'] ?? 50)));
                    $offset = ($page - 1) * $perPage;
                    
                    $where = [];
                    $params = [];
                    
                    if ($uzivatel && $uzivatel !== 'all') {
                        $where[] = "im.jmeno_uzivatele = :uzivatel";
                        $params['uzivatel'] = $uzivatel;
                    }
                    
                    if ($inventarizovano === 'ano') {
                        $where[] = "im.cislo_majetku IS NOT NULL";
                    } elseif ($inventarizovano === 'ne') {
                        $where[] = "im.cislo_majetku IS NULL";
                    }
                    
                    if ($search !== '') {
                        $where[] = "(m.nazev LIKE :search OR m.cislo LIKE :search OR b.budovat LIKE :search OR mi.mistt LIKE :search OR iu.nazinv LIKE :search)";
                        $params['search'] = '%' . $search . '%';
                    }
                    
                    $whereSql = !empty($where) ? " WHERE " . implode(' AND ', $where) : "";
                    
                    $joinSql = "
                        FROM majetek m
                        LEFT JOIN budovy b ON m.budt = b.budt
                        LEFT JOIN mistnosti mi ON m.budt = mi.budt AND m.mist = mi.mist
                        LEFT JOIN inventarni_useky iu ON m.cinv = iu.cinv
                        LEFT JOIN inventura_majetek im ON m.cislo = im.cislo_majetku
                    ";
                    
                    // Total count pro paging
                    $countStmt = $pdo->prepare("SELECT COUNT(*) " . $joinSql . $whereSql);
                    foreach ($params as $key => $value) {
                        $countStmt->bindValue(':' . $key, $value);
                    }
                    $countStmt->execute();
                    $totalCount = (int)$countStmt->fetchColumn();
                    
                    // Stats - kolik je inventarizovano/neinventarizovano (bez search filtru pro celkove statistiky)
                    $statsStmt = $pdo->prepare("
                        SELECT 
                            SUM(CASE WHEN im.cislo_majetku IS NOT NULL THEN 1 ELSE 0 END) as inventarizovano,
                            SUM(CASE WHEN im.cislo_majetku IS NULL THEN 1 ELSE 0 END) as neinventarizovano,
                            COUNT(*) as total
                        FROM majetek m
                        LEFT JOIN inventura_majetek im ON m.cislo = im.cislo_majetku
                    ");
                    $statsStmt->execute();
                    $stats = $statsStmt->fetch();
                    
                    $sql = "
                        SELECT m.id, m.cislo, m.nazev, m.cena_mj_num, m.datum_zarazeni,
                               m.budt, m.mist, m.cinv,
                               b.budovat as budova_nazev,
                               mi.mistt as mistnost_nazev,
                               iu.nazinv as inv_usek_nazev,
                               im.jmeno_uzivatele as inventarizoval_uzivatel,
                               im.datum_vytvoreni as inventarizoval_datum,
                               (SELECT COUNT(*) FROM inventura_majetek WHERE cislo_majetku = m.cislo) as inventarizace_count
                    " . $joinSql . $whereSql . " ORDER BY m.id DESC LIMIT :limit OFFSET :offset";
                    
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $key => $value) {
                        $stmt->bindValue(':' . $key, $value);
                    }
                    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
                    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                    $stmt->execute();
                    $results = $stmt->fetchAll();
                    
                    echo json_encode([
                        'success' => true, 
                        'data' => $results, 
                        'count' => count($results),
                        'pagination' => [
                            'page' => $page,
                            'per_page' => $perPage,
                            'total' => $totalCount,
                            'total_pages' => (int)ceil($totalCount / $perPage)
                        ],
                        'stats' => [
                            'total' => (int)$stats['total'],
                            'inventarizovano' => (int)$stats['inventarizovano'],
                            'neinventarizovano' => (int)$stats['neinventarizovano']
                        ]
                    ]);
                }
            }
            break;

        case 'budovy':
            $stmt = $pdo->query("SELECT budt, budovat, bmist, zaplf, koplf, datum_zapujceni, datum_ukonceni, created_at, updated_at FROM budovy ORDER BY budovat");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'mistnosti':
            $budt = $_GET['budt'] ?? null;
            if ($budt) {
                $stmt = $pdo->prepare("
                    SELECT m.id, m.budt, m.mist, m.mistt, m.zaplf, m.koplf, m.created_at, m.updated_at,
                           b.budovat as budova_nazev
                    FROM mistnosti m
                    LEFT JOIN budovy b ON m.budt = b.budt
                    WHERE m.budt = :budt 
                    ORDER BY m.mistt
                ");
                $stmt->execute(['budt' => $budt]);
            } else {
                $stmt = $pdo->query("
                    SELECT m.id, m.budt, m.mist, m.mistt, m.zaplf, m.koplf, m.created_at, m.updated_at,
                           b.budovat as budova_nazev
                    FROM mistnosti m
                    LEFT JOIN budovy b ON m.budt = b.budt
                    ORDER BY m.mistt 
                    LIMIT 500
                ");
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'inventarni_useky':
            $stmt = $pdo->query("SELECT cinv, nazinv, prac, zaplf, koplf, created_at, updated_at FROM inventarni_useky ORDER BY nazinv");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'inventura_list':
            // Seznam všech naskenovaných položek s JOINy + původní hodnoty z majetek
            if ($method === 'GET') {
                $uzivatel = $_GET['uzivatel'] ?? null;
                $limit = (int)($_GET['limit'] ?? 1000);
                
                $sql = "
                    SELECT im.*,
                           b.budovat as budova_nazev,
                           mi.mistt as mistnost_nazev,
                           iu.nazinv as inv_usek_nazev,
                           m.budt as majetek_budt_original,
                           m.mist as majetek_mist_original,
                           m.cinv as majetek_cinv_original,
                           b_orig.budovat as majetek_budova_nazev_original,
                           mi_orig.mistt as majetek_mistnost_nazev_original,
                           iu_orig.nazinv as majetek_inv_usek_nazev_original
                    FROM inventura_majetek im
                    LEFT JOIN budovy b ON im.budt = b.budt
                    LEFT JOIN mistnosti mi ON im.budt = mi.budt AND im.mist = mi.mist
                    LEFT JOIN inventarni_useky iu ON im.cinv = iu.cinv
                    LEFT JOIN majetek m ON im.cislo_majetku = m.cislo
                    LEFT JOIN budovy b_orig ON m.budt = b_orig.budt
                    LEFT JOIN mistnosti mi_orig ON m.budt = mi_orig.budt AND m.mist = mi_orig.mist
                    LEFT JOIN inventarni_useky iu_orig ON m.cinv = iu_orig.cinv
                ";
                
                if ($uzivatel && $uzivatel !== 'all') {
                    $sql .= " WHERE im.jmeno_uzivatele = :uzivatel";
                }
                
                $sql .= " ORDER BY im.datum_vytvoreni DESC LIMIT :limit";
                
                $stmt = $pdo->prepare($sql);
                if ($uzivatel && $uzivatel !== 'all') {
                    $stmt->bindValue(':uzivatel', $uzivatel);
                }
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
                
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            }
            break;

        case 'inventura_check_duplicate':
            // Kontrola, zda číslo majetku už bylo naskenováno
            if ($method === 'GET') {
                $cislo = $_GET['cislo'] ?? null;
                if (!$cislo) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing cislo parameter']);
                    break;
                }
                
                $stmt = $pdo->prepare("
                    SELECT id, jmeno_uzivatele, datum_vytvoreni, datum_modifikace
                    FROM inventura_majetek 
                    WHERE cislo_majetku = :cislo 
                    ORDER BY datum_vytvoreni DESC 
                    LIMIT 1
                ");
                $stmt->execute(['cislo' => $cislo]);
                $result = $stmt->fetch();
                
                if ($result) {
                    echo json_encode([
                        'success' => true, 
                        'exists' => true,
                        'data' => $result
                    ]);
                } else {
                    echo json_encode([
                        'success' => true, 
                        'exists' => false
                    ]);
                }
            }
            break;

        case 'inventura_users':
            // Seznam uživatelů, kteří skenovali majetek
            if ($method === 'GET') {
                $stmt = $pdo->query("
                    SELECT DISTINCT jmeno_uzivatele 
                    FROM inventura_majetek 
                    ORDER BY jmeno_uzivatele
                ");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
            }
            break;

        case 'inventura_detail':
            // Detail jedné naskenované položky podle ID
            if ($method === 'GET') {
                $id = $_GET['id'] ?? null;
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing id parameter']);
                    break;
                }
                
                $stmt = $pdo->prepare("
                    SELECT im.*,
                           b.budovat as budova_nazev,
                           mi.mistt as mistnost_nazev,
                           iu.nazinv as inv_usek_nazev
                    FROM inventura_majetek im
                    LEFT JOIN budovy b ON im.budt = b.budt
                    LEFT JOIN mistnosti mi ON im.budt = mi.budt AND im.mist = mi.mist
                    LEFT JOIN inventarni_useky iu ON im.cinv = iu.cinv
                    WHERE im.id = :id LIMIT 1
                ");
                $stmt->execute(['id' => $id]);
                $result = $stmt->fetch();
                
                if ($result) {
                    echo json_encode(['success' => true, 'data' => $result]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Not found']);
                }
            }
            break;

        case 'inventura_save':
            // Uložení/aktualizace naskenovaného majetku
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                
                if (!$input) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
                    break;
                }
                
                $id = $input['id'] ?? null;
                
                // Validace povinných polí
                if (!isset($input['cislo_majetku']) || !isset($input['jmeno_uzivatele'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
                    break;
                }
                
                if ($id) {
                    // UPDATE existující položky
                    $stmt = $pdo->prepare("
                        UPDATE inventura_majetek SET
                            cislo_majetku = :cislo_majetku,
                            nazev = :nazev,
                            datum_zarazeni = :datum_zarazeni,
                            cena_mj_num = :cena_mj_num,
                            cinv = :cinv,
                            budt = :budt,
                            mist = :mist,
                            poznamka = :poznamka,
                            seriove_cislo = :seriove_cislo,
                            ip_adresa = :ip_adresa,
                            metadata = :metadata,
                            jmeno_uzivatele = :jmeno_uzivatele
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'id' => $id,
                        'cislo_majetku' => $input['cislo_majetku'],
                        'nazev' => $input['nazev'] ?? null,
                        'datum_zarazeni' => $input['datum_zarazeni'] ?? null,
                        'cena_mj_num' => $input['cena_mj_num'] ?? null,
                        'cinv' => $input['cinv'] ?? null,
                        'budt' => $input['budt'] ?? null,
                        'mist' => $input['mist'] ?? null,
                        'poznamka' => $input['poznamka'] ?? null,
                        'seriove_cislo' => $input['seriove_cislo'] ?? null,
                        'ip_adresa' => $input['ip_adresa'] ?? null,
                        'metadata' => $input['metadata'] ?? null,
                        'jmeno_uzivatele' => $input['jmeno_uzivatele']
                    ]);
                    
                    echo json_encode(['success' => true, 'id' => $id, 'action' => 'updated']);
                } else {
                    // INSERT nové položky
                    $stmt = $pdo->prepare("
                        INSERT INTO inventura_majetek 
                        (cislo_majetku, nazev, datum_zarazeni, cena_mj_num, cinv, budt, mist, 
                         poznamka, seriove_cislo, ip_adresa, metadata, jmeno_uzivatele)
                        VALUES 
                        (:cislo_majetku, :nazev, :datum_zarazeni, :cena_mj_num, :cinv, :budt, :mist,
                         :poznamka, :seriove_cislo, :ip_adresa, :metadata, :jmeno_uzivatele)
                    ");
                    $stmt->execute([
                        'cislo_majetku' => $input['cislo_majetku'],
                        'nazev' => $input['nazev'] ?? null,
                        'datum_zarazeni' => $input['datum_zarazeni'] ?? null,
                        'cena_mj_num' => $input['cena_mj_num'] ?? null,
                        'cinv' => $input['cinv'] ?? null,
                        'budt' => $input['budt'] ?? null,
                        'mist' => $input['mist'] ?? null,
                        'poznamka' => $input['poznamka'] ?? null,
                        'seriove_cislo' => $input['seriove_cislo'] ?? null,
                        'ip_adresa' => $input['ip_adresa'] ?? null,
                        'metadata' => $input['metadata'] ?? null,
                        'jmeno_uzivatele' => $input['jmeno_uzivatele']
                    ]);
                    
                    $newId = $pdo->lastInsertId();
                    echo json_encode(['success' => true, 'id' => $newId, 'action' => 'inserted']);
                }
            }
            break;

        case 'inventura_delete':
            // Smazání naskenované položky
            if ($method === 'POST' || $method === 'DELETE') {
                $input = json_decode(file_get_contents('php://input'), true);
                $id = $input['id'] ?? $_GET['id'] ?? null;
                
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing id']);
                    break;
                }
                
                $stmt = $pdo->prepare("DELETE FROM inventura_majetek WHERE id = :id");
                $stmt->execute(['id' => $id]);
                
                echo json_encode(['success' => true, 'deleted' => $stmt->rowCount()]);
            }
            break;

        case 'majetek_inventarizace':
            // Získání všech inventarizací pro dané číslo majetku (včetně duplicit)
            if ($method === 'GET') {
                $cislo = $_GET['cislo'] ?? null;
                if (!$cislo) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing cislo parameter']);
                    break;
                }
                
                $stmt = $pdo->prepare("
                    SELECT im.*,
                           b.budovat as budova_nazev,
                           mi.mistt as mistnost_nazev,
                           iu.nazinv as inv_usek_nazev,
                           m.nazev as majetek_nazev,
                           m.cena_mj_num as majetek_cena
                    FROM inventura_majetek im
                    LEFT JOIN budovy b ON im.budt = b.budt
                    LEFT JOIN mistnosti mi ON im.budt = mi.budt AND im.mist = mi.mist
                    LEFT JOIN inventarni_useky iu ON im.cinv = iu.cinv
                    LEFT JOIN majetek m ON im.cislo_majetku = m.cislo
                    WHERE im.cislo_majetku = :cislo
                    ORDER BY im.datum_vytvoreni ASC
                ");
                $stmt->execute(['cislo' => $cislo]);
                $results = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true, 
                    'data' => $results,
                    'count' => count($results),
                    'has_duplicates' => count($results) > 1
                ]);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
?>
