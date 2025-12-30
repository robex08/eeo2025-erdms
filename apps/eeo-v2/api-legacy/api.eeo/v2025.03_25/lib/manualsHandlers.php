<?php
/**
 * Handlers pro správu manuálů a nápovědy
 * 
 * Endpointy:
 * - POST /manuals/list - Seznam dostupných PDF manuálů
 * - POST /manuals/download - Stažení konkrétního manuálu
 */

// Include necessary functions
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

require_once __DIR__ . '/TimezoneHelper.php';

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
        // 4. Cesta k manuálům
        $manuals_path = '/var/www/erdms-data/eeo-v2/manualy';
        
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
                
                // Formátování velikosti
                $size_formatted = format_file_size($size);
                
                // Formátování data
                $modified_formatted = date('d.m.Y H:i', $modified);
                
                $manuals[] = [
                    'filename' => $filename,
                    'title' => $title,
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

        // 5. Cesta k souboru
        $manuals_path = '/var/www/erdms-data/eeo-v2/manualy';
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
