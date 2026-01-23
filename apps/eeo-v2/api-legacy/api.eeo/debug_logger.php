<?php
/**
 * DEBUG LOGGING HELPER pro DEV prostředí
 * Obchází problém s nefunkčním error_log() v PHP 8.4 FPM
 * 
 * Použití:
 *   debug_log("Zpráva do logu");
 *   debug_log("User ID: " . $user_id);
 * 
 * Log soubor: /var/www/erdms-dev/logs/php-debug.log
 */

function debug_log($message, $data = null) {
    // Pouze pro DEV prostředí
    if (!defined('IS_DEV_ENV') || !IS_DEV_ENV) {
        return false;
    }
    
    $log_file = '/var/www/erdms-dev/logs/php-debug.log';
    $timestamp = date('Y-m-d H:i:s');
    
    // Získej informace o volajícím
    $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
    $caller = isset($backtrace[1]) ? basename($backtrace[1]['file']) . ':' . $backtrace[1]['line'] : 'unknown';
    
    // Formátuj zprávu
    $log_message = "[{$timestamp}] [{$caller}] {$message}";
    
    // Přidej data, pokud jsou poskytnutá
    if ($data !== null) {
        $log_message .= " | Data: " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    
    $log_message .= "\n";
    
    // Zapiš do souboru
    try {
        return file_put_contents($log_file, $log_message, FILE_APPEND | LOCK_EX) !== false;
    } catch (Exception $e) {
        // Pokud selže zápis, zkus to do stderr
        error_log("debug_log failed: " . $e->getMessage());
        return false;
    }
}

/**
 * Loguj výjimku s plným stack trace
 */
function debug_log_exception($exception, $context = '') {
    if (!defined('IS_DEV_ENV') || !IS_DEV_ENV) {
        return false;
    }
    
    $message = "EXCEPTION";
    if ($context) {
        $message .= " [{$context}]";
    }
    $message .= ": " . $exception->getMessage();
    
    $data = [
        'type' => get_class($exception),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ];
    
    return debug_log($message, $data);
}

/**
 * Loguj SQL query
 */
function debug_log_sql($query, $params = null, $execution_time = null) {
    if (!defined('IS_DEV_ENV') || !IS_DEV_ENV) {
        return false;
    }
    
    $message = "SQL: " . preg_replace('/\s+/', ' ', trim($query));
    
    $data = [];
    if ($params !== null) {
        $data['params'] = $params;
    }
    if ($execution_time !== null) {
        $data['time_ms'] = round($execution_time * 1000, 2);
    }
    
    return debug_log($message, $data);
}

// Inicializace log souboru při prvním includování
if (defined('IS_DEV_ENV') && IS_DEV_ENV) {
    $log_file = '/var/www/erdms-dev/logs/php-debug.log';
    $log_dir = dirname($log_file);
    
    // Vytvoř adresář, pokud neexistuje
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0775, true);
        @chown($log_dir, 'www-data');
        @chgrp($log_dir, 'www-data');
    }
    
    // Vytvoř soubor, pokud neexistuje
    if (!file_exists($log_file)) {
        @file_put_contents($log_file, "");
        @chmod($log_file, 0666);
    }
    
    // Loguj start scriptu
    debug_log("=== SCRIPT START ===", [
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? ''
    ]);
}
