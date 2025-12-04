<?php
/**
 * Wrapper pro DOCX handlers - převod signatury z ($input, $config, $queries) na ($mysqli, $user)
 * Pro PHP 5.6 kompatibilitu
 */

// Načtení původních handlerů
require_once __DIR__ . '/sablonaDocxHandlers.php';

/**
 * Wrapper pro autentizaci a inicializaci MySQLi připojení
 */
function sablonaDocxWrapper($originalFunction, $input, $config, $queries) {
    try {
        // TODO: Implementovat autentizaci
        // Pro test zatím dummy user
        $user = array(
            'id' => 1,
            'username' => 'test',
            'usek_zkr' => 'ALL'
        );
        
        // Vytvoření MySQLi připojení z PDO konfigurace
        $mysqli = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
        
        if ($mysqli->connect_error) {
            throw new Exception('Chyba připojení: ' . $mysqli->connect_error);
        }
        
        $mysqli->set_charset('utf8mb4');
        
        // Převod $_POST a $_GET z $input
        if (isset($input) && is_array($input)) {
            foreach ($input as $key => $value) {
                $_POST[$key] = $value;
                $_GET[$key] = $value;
            }
        }
        
        // Volání původní funkce
        $result = call_user_func($originalFunction, $mysqli, $user);
        
        $mysqli->close();
        
        // Pokud je výsledek array, pošleme jako JSON
        if (is_array($result)) {
            echo json_encode($result);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    }
}

// Wrapper funkce pro jednotlivé endpointy
function handle_sablona_docx_list_wrapper($input, $config, $queries) {
    sablonaDocxWrapper('handle_sablona_docx_list_original', $input, $config, $queries);
}

function handle_sablona_docx_by_id_wrapper($input, $config, $queries) {
    sablonaDocxWrapper('handle_sablona_docx_by_id_original', $input, $config, $queries);
}

function handle_sablona_docx_create_wrapper($input, $config, $queries) {
    sablonaDocxWrapper('handle_sablona_docx_create_original', $input, $config, $queries);
}

function handle_sablona_docx_update_wrapper($input, $config, $queries) {
    sablonaDocxWrapper('handle_sablona_docx_update_original', $input, $config, $queries);
}

function handle_sablona_docx_delete_wrapper($input, $config, $queries) {
    sablonaDocxWrapper('handle_sablona_docx_delete_original', $input, $config, $queries);
}

function handle_sablona_docx_download_wrapper($input, $config, $queries) {
    // Download je speciální - nevrací JSON ale soubor
    try {
        $user = array('id' => 1, 'username' => 'test', 'usek_zkr' => 'ALL');
        $mysqli = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
        
        if ($mysqli->connect_error) {
            throw new Exception('Chyba připojení: ' . $mysqli->connect_error);
        }
        
        $mysqli->set_charset('utf8mb4');
        
        // Převod parametrů
        if (isset($input) && is_array($input)) {
            foreach ($input as $key => $value) {
                $_POST[$key] = $value;
                $_GET[$key] = $value;
            }
        }
        
        // Download funkce výstup přímo, takže ji jen zavoláme
        handle_sablona_docx_download($input, $config, $queries);
        
        $mysqli->close();
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    }
}
?>