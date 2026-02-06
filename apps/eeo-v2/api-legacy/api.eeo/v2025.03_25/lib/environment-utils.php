<?php
/**
 * 🌍 ENVIRONMENT UTILITIES
 * Centrální správa environment proměnných a fallback detekce prostředí
 * 
 * ÚČEL:
 * - Eliminace hardcoded cest z kódu
 * - Inteligentní detekce DEV vs PROD prostředí
 * - Konzistentní načítání environment proměnných
 * 
 * POUŽITÍ:
 * require_once __DIR__ . '/environment-utils.php';
 * $uploadsPath = get_env_path('UPLOAD_ROOT_PATH');
 */

/**
 * Detekce, zda se jedná o DEV prostředí
 * 
 * @return bool True pokud je DEV prostředí
 */
function is_dev_environment(): bool {
    // 1. Explicitní ENV proměnná má prioritu
    $env_type = getenv('APP_ENV');
    if ($env_type) {
        return strtolower($env_type) === 'development' || strtolower($env_type) === 'dev';
    }
    
    // 2. Fallback: detekce podle REQUEST_URI
    return isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/dev/') !== false;
}

/**
 * Získá cestu z ENV proměnné s inteligentním fallbackem
 * 
 * @param string $env_var_name Název ENV proměnné (např. 'UPLOAD_ROOT_PATH')
 * @param string $dev_fallback Fallback cesta pro DEV (optional)
 * @param string $prod_fallback Fallback cesta pro PROD (optional)
 * @return string Cesta ukončená lomítkem
 */
function get_env_path(string $env_var_name, string $dev_fallback = null, string $prod_fallback = null): string {
    // 1. Priorita: ENV proměnná
    $env_path = getenv($env_var_name);
    if ($env_path) {
        return rtrim($env_path, '/') . '/';
    }
    
    // 2. Fallback podle prostředí
    $is_dev = is_dev_environment();
    
    // 3. Specifické fallbacky podle typu cesty
    switch ($env_var_name) {
        case 'UPLOAD_ROOT_PATH':
            return $is_dev 
                ? '/var/www/erdms-dev/data/eeo-v2/prilohy/'
                : '/var/www/erdms-platform/data/eeo-v2/prilohy/';
                
        case 'DOCX_TEMPLATES_PATH':
            return $is_dev 
                ? '/var/www/erdms-dev/data/eeo-v2/sablony/'
                : '/var/www/erdms-platform/data/eeo-v2/sablony/';
                
        case 'MANUALS_PATH':
            return $is_dev 
                ? '/var/www/erdms-dev/data/eeo-v2/manualy/'
                : '/var/www/erdms-platform/data/eeo-v2/manualy/';
                
        default:
            // Použij uživatelské fallbacky nebo obecný pattern
            if ($dev_fallback && $prod_fallback) {
                return $is_dev ? rtrim($dev_fallback, '/') . '/' : rtrim($prod_fallback, '/') . '/';
            }
            
            // Poslední fallback - prázdný string s varováním
            error_log("WARNING: Neznámá ENV proměnná '$env_var_name' - vracím prázdný řetězec");
            return '';
    }
}

/**
 * Získá upload root path s environment detektorem
 */
if (!function_exists('get_upload_root_path')) {
    function get_upload_root_path(): string {
        return get_env_path('UPLOAD_ROOT_PATH');
    }
}

/**
 * Získá templates path s environment detektorem
 */
if (!function_exists('get_templates_path')) {
    function get_templates_path(): string {
        return get_env_path('DOCX_TEMPLATES_PATH');
    }
}

/**
 * Získá manuals path s environment detektorem (kompatibilita s existující funkcí)
 */
if (!function_exists('get_manuals_path')) {
    function get_manuals_path(): string {
        return rtrim(get_env_path('MANUALS_PATH'), '/');
    }
}

/**
 * Debug funkce pro zobrazení všech environment cest
 */
function debug_environment_paths(): array {
    return [
        'environment' => is_dev_environment() ? 'DEV' : 'PROD',
        'upload_root_path' => get_upload_root_path(),
        'templates_path' => get_templates_path(), 
        'manuals_path' => get_manuals_path(),
        'env_vars' => [
            'APP_ENV' => getenv('APP_ENV'),
            'UPLOAD_ROOT_PATH' => getenv('UPLOAD_ROOT_PATH'),
            'DOCX_TEMPLATES_PATH' => getenv('DOCX_TEMPLATES_PATH'),
            'MANUALS_PATH' => getenv('MANUALS_PATH')
        ]
    ];
}