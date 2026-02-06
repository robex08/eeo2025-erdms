<?php
/**
 * Handlers pro správu manuálů a nápovědy
 * 
 * Endpointy:
 * - POST /manuals/list - Seznam dostupných PDF manuálů
 * - POST /manuals/download - Stažení konkrétního manuálu
 * - POST /manuals/upload - Nahrání nového manuálu (admin)
 * - POST /manuals/delete - Smazání manuálu (admin)
 */

// Include necessary functions
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/environment-utils.php';

/**
 * Získá cestu k manuálům s automatickou detekcí prostředí
 * Používá centrální environment utility pro konzistentní správu cest
 */
function get_manuals_path() {
    return rtrim(get_env_path('MANUALS_PATH'), '/');
}

/**
 * POST - Vrátí seznam dostupných PDF manuálů
 * Endpoint: manuals/list
 * POST: {token, username}
 * Response: {status, data: [{filename, size, modified, title}], message}
 */
function handle_manuals_list($input, $config) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Parametry z body
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        // 4. Cesta k manuálům z .env
        $manuals_path = get_manuals_path();
        
        if (!is_dir($manuals_path)) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Adresář s manuály nebyl nalezen'
            ]);
            return;
        }

        // 5. Načtení seznamu PDF souborů
        $files = glob($manuals_path . '/*.pdf');
        $manuals = [];

        foreach ($files as $file) {
            if (is_file($file)) {
                $filename = basename($file);
                $size = filesize($file);
                $modified = filemtime($file);
                
                // Získání názvu z názvu souboru (bez .pdf)
                $title = str_replace('.pdf', '', $filename);
                $title = str_replace('_', ' ', $title);
                $title = str_replace('-', ' ', $title);
                
                // Speciální úprava pro EEO 2.0 → EEO v2
                if ($filename === 'Uživatelský manuál EEO 2.0.pdf') {
                    $title = 'Uživatelský manuál EEO v2';
                }
                
                // Formátování velikosti
                $size_formatted = format_file_size($size);
                
                // Formátování data
                $modified_formatted = date('d.m.Y H:i', $modified);
                
                // Popis manuálu
                $description = 'Detailní návod pro práci se systémem EEO v2.';
                if ($filename === 'Jak poprvé pracovat s Pokladnou.pdf') {
                    $description = 'Komplexní průvodce pro správu pokladní knihy, vedení příjmů a výdajů.';
                } elseif ($filename === 'Návod pro první spuštění.pdf') {
                    $description = 'První kroky v systému EEO v2, nastavení účtu a základní orientace.';
                } elseif ($filename === 'Uživatelský manuál EEO 2.0.pdf') {
                    $description = 'Detailní návod pro práci se systémem EEO v2.';
                }
                
                $manuals[] = [
                    'filename' => $filename,
                    'title' => $title,
                    'description' => $description,
                    'size' => $size,
                    'size_formatted' => $size_formatted,
                    'modified' => $modified,
                    'modified_formatted' => $modified_formatted
                ];
            }
        }

        // Seřadit podle názvu
        usort($manuals, function($a, $b) {
            return strcmp($a['title'], $b['title']);
        });

        // 6. Úspěšná odpověď
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $manuals,
            'count' => count($manuals),
            'message' => 'Seznam manuálů načten úspěšně'
        ]);

    } catch (Exception $e) {
        // 7. Error handling
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání manuálů: ' . $e->getMessage()
        ]);
    }
}

/**
 * POST - Stáhne konkrétní manuál
 * Endpoint: manuals/download
 * POST: {token, username, filename}
 * Response: PDF file nebo error JSON
 */
function handle_manuals_download($input, $config) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Parametry z body
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $filename = $input['filename'] ?? '';
    
    if (!$token || !$username || !$filename) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí povinné parametry']);
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        // 4. Bezpečnostní kontrola - pouze soubory .pdf a bez path traversal
        // Povolit: písmena (i s diakritikou), číslice, mezery, pomlčky, podtržítka, tečky
        if (!preg_match('/^[\p{L}\p{N}\s_\-\.]+\.pdf$/ui', $filename)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Neplatný název souboru'
            ]);
            return;
        }
        
        // Dodatečná ochrana proti path traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Neplatný název souboru - zakázané znaky'
            ]);
            return;
        }

        // 5. Cesta k souboru z .env
        $manuals_path = get_manuals_path();
        $file_path = $manuals_path . '/' . $filename;

        // 6. Kontrola existence
        if (!file_exists($file_path) || !is_file($file_path)) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Soubor nebyl nalezen'
            ]);
            return;
        }

        // 7. Odeslání souboru
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($file_path));
        header('Cache-Control: public, max-age=3600');
        
        readfile($file_path);
        exit;

    } catch (Exception $e) {
        // 8. Error handling
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při stahování souboru: ' . $e->getMessage()
        ]);
    }
}

/**
 * Pomocná funkce pro formátování velikosti souboru
 */
function format_file_size($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' B';
    }
}

/**
 * POST - Nahraje nový PDF manuál (pouze pro adminy)
 * Endpoint: manuals/upload
 * POST (multipart/form-data): {token, username, file}
 * Response: {status, message, filename}
 * STANDARD V2: Stejný vzor jako orderV2AttachmentHandlers
 */
function handle_manuals_upload($input, $config) {
    // DEBUG - zkontrolovat co přijde
    $debug_info = array();
    // 1. Token authentication - STANDARD V2
    // Pro multipart/form-data používáme $_POST místo $input
    $token = isset($_POST['token']) ? $_POST['token'] : '';
    $username = isset($_POST['username']) ? $_POST['username'] : '';
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chybí token'
        ));
        return;
    }
    if (empty($username)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chybí username'
        ));
        return;
    }
    
    $db = get_db($config);
    $token_data = verify_token_v2($username, $token, $db);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Neplatný nebo chybějící token'
        ));
        return;
    }
    // 2. Kontrola admin práv
    if (empty($token_data['is_admin'])) {
        http_response_code(403);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Nedostatečná oprávnění - pouze administrátoři mohou nahrávat manuály'
        ));
        return;
    }
    // 3. Kontrola uploaded file - STANDARD V2
    if (!isset($_FILES['file']) || empty($_FILES['file']['name'])) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chybí soubor k nahrání'
        ));
        return;
    }

    try {
        // 4. Cesta k manuálům z ENV
        $manuals_path = get_manuals_path();
        if (!is_dir($manuals_path)) {
            // Pokus o vytvoření adresáře
            if (!mkdir($manuals_path, 0755, true)) {
                http_response_code(500);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'Nelze vytvořit adresář pro manuály'
                ));
                return;
            }
        }

        // 5. Validace souboru
        $file = $_FILES['file'];
        $filename = basename($file['name']);
        $fileExt = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Kontrola chyby uploadu
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba při nahrávání souboru'));
            return;
        }

        // Kontrola, že je to PDF
        if ($fileExt !== 'pdf') {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Pouze PDF soubory jsou povoleny'));
            return;
        }

        // Kontrola velikosti (max 50 MB)
        $maxSize = 50 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Soubor je příliš velký (max 50 MB)'));
            return;
        }

        // Bezpečnostní kontrola názvu souboru
        if (!preg_match('/^[\p{L}\p{N}\s_\-\.]+\.pdf$/ui', $filename)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatný název souboru'));
            return;
        }

        // 6. Cílová cesta
        $targetPath = $manuals_path . '/' . $filename;
        
        // DEBUG - Výpis cest pro frontend
        // Kontrola, že soubor už neexistuje
        if (file_exists($targetPath)) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Soubor s tímto názvem už existuje'
            ));
            return;
        }

        // 7. Přesun souboru - STANDARD V2
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(500);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nelze uložit soubor'
            ));
            return;
        }
        // 8. Úspěch - STANDARD V2
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'success' => true,
            'message' => 'Manuál byl úspěšně nahrán',
            'filename' => $filename
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při nahrávání manuálu: ' . $e->getMessage()
        ));
    }
}

/**
 * POST - Smaže PDF manuál (pouze pro adminy)
 * Endpoint: manuals/delete
 * POST: {token, username, filename}
 * Response: {status, message}
 */
function handle_manuals_delete($input, $config) {
    // DEBUG
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Parametry z body
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $filename = $input['filename'] ?? '';
    
    if (empty($token) || empty($username)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (empty($filename)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí název souboru']);
        return;
    }

    // 3. Ověření tokenu přes verify_token_v2 (vrací i role)
    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    // 4. Kontrola admin práv (verify_token_v2 vrací 'is_admin')
    if (empty($token_data['is_admin'])) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nedostatečná oprávnění - pouze administrátoři mohou mazat manuály'
        ]);
        return;
    }

    try {
        // 5. Bezpečnostní kontrola názvu souboru
        $filename = basename($filename);
        
        if (!preg_match('/^[\p{L}\p{N}\s_\-\.]+\.pdf$/ui', $filename)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Neplatný název souboru'
            ]);
            return;
        }

        // 6. Cesta k souboru z .env
        $manuals_path = get_manuals_path();
        $filePath = $manuals_path . '/' . $filename;

        // 7. Kontrola existence
        if (!file_exists($filePath) || !is_file($filePath)) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Soubor nebyl nalezen'
            ]);
            return;
        }

        // 8. Smazat soubor
        if (!unlink($filePath)) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Nepodařilo se smazat soubor'
            ]);
            return;
        }

        // 9. Úspěch
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'success' => true,
            'message' => 'Manuál byl úspěšně smazán',
            'filename' => $filename
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání manuálu: ' . $e->getMessage()
        ]);
    }
}
