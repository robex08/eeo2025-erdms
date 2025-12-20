# 📋 PLÁN: Centralizace Konfigurace a Oddělení Dev/Prod Prostředí

**Datum:** 20. prosince 2025  
**Autor:** Claude Sonnet 4.5  
**Status:** 🟡 Připraveno k implementaci

---

## 🎯 CÍL

Vytvořit **centralizovaný konfigurační systém** pro ERDMS projekt s jasným oddělením:
- **Development** prostředí (erdms-dev)
- **Production** prostředí (erdms-platforma)
- **Bezpečné úložiště credentials** (mimo Git)
- **Snadný deployment** a přepínání mezi prostředími

---

## 🚨 SOUČASNÉ PROBLÉMY

### 1. Hardcoded Credentials
```php
// v2025.03_25/lib/dbconfig.php
'host' => '10.3.172.11',           // ⚠️ Hardcoded IP
'username' => 'erdms_user',        // ⚠️ Hardcoded username
'password' => 'CHANGE_ME_DB_PASSWORD', // ⚠️ Password v plain textu!
'database' => 'eeo2025'            // ⚠️ Stejná DB pro dev i prod
```

### 2. Roztroušené Konstanty
- `api.php` - 15+ table definitions
- `test-lp-init.php` - duplicitní definice
- `dbconfig.php` - upload paths
- Žádná centrální správa

### 3. Sdílené Datové Úložiště
```
/var/www/erdms-data/eeo-v2/prilohy/
```
- ⚠️ **Stejná složka pro dev i produkci!**
- Riziko přepsání produkčních souborů při testování
- Žádná izolace dat

### 4. Žádná Environment Separace
- Není způsob, jak jednodušše přepnout mezi dev/prod
- Deploy = manuální změny v kódu
- Vysoké riziko chyb

---

## ✅ ŘEŠENÍ: Nový Konfigurační Systém

### Struktura v `erdms-dev/apps/eeo-v2/api-legacy/api.eeo/`

```
api.eeo/
├── .env                          # 🔐 Lokální env (GITIGNORE!)
├── .env.example                  # Šablona pro tým
├── api.php                       # Upraveno - použije AppConfig
├── config/                       # 🆕 NOVÁ SLOŽKA
│   ├── AppConfig.php            # Singleton config loader
│   ├── constants.php            # Všechny konstanty (tabulky, limity)
│   └── environments/
│       ├── development.php      # Dev konfigurace
│       ├── production.php       # Prod konfigurace
│       └── testing.php          # Test konfigurace
└── v2025.03_25/
    └── lib/
        ├── dbconfig.php         # DEPRECATED - nahradit AppConfig
        └── ...
```

---

## 📝 IMPLEMENTACE - SOUBORY

### 1. `.env` (Gitignored)

```bash
# ===========================================
# ERDMS API Configuration
# Environment: development | production | testing
# ===========================================

APP_ENV=development
APP_DEBUG=true
APP_TIMEZONE=Europe/Prague

# ===========================================
# DATABASE CONNECTION
# ===========================================
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=erdms_dev
DB_USER=erdms_dev_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_czech_ci

# ===========================================
# STORAGE PATHS - DEVELOPMENT
# ===========================================
STORAGE_UPLOADS_PATH=/var/www/erdms-data/eeo-v2-dev/prilohy/
STORAGE_UPLOADS_URL=https://erdms-dev.zachranka.cz/eeo-v2/prilohy/
STORAGE_TEMPLATES_PATH=/var/www/erdms-data/eeo-v2-dev/sablony/
STORAGE_BACKUPS_PATH=/var/www/erdms-shared/backups/dev/

# ===========================================
# API ENDPOINTS
# ===========================================
API_BASE_URL=https://erdms-dev.zachranka.cz/api
API_TIMEOUT=30
API_RATE_LIMIT_ENABLED=false

# ===========================================
# AUTH SETTINGS
# ===========================================
AUTH_TOKEN_LIFETIME=86400
AUTH_SESSION_LIFETIME=28800

# ===========================================
# MAIL SETTINGS (Dev - disabled)
# ===========================================
MAIL_ENABLED=false
MAIL_FROM_ADDRESS=dev@erdms.zachranka.cz
MAIL_FROM_NAME=ERDMS Development
```

### 2. `config/AppConfig.php`

```php
<?php
/**
 * ERDMS Application Configuration Manager
 * 
 * Singleton class pro správu konfigurace aplikace.
 * Načítá .env soubor a environment-specific konfiguraci.
 * 
 * @author ERDMS Team
 * @version 1.0.0
 */

class AppConfig {
    private static $instance = null;
    private $config = [];
    private $environment = 'development';
    
    private function __construct() {
        $this->loadEnvironment();
        $this->loadConstants();
        $this->loadConfig();
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Načte .env soubor a nastaví $_ENV proměnné
     */
    private function loadEnvironment() {
        $envFile = __DIR__ . '/../.env';
        
        if (!file_exists($envFile)) {
            throw new RuntimeException(
                "Missing .env file! Copy .env.example to .env and configure it."
            );
        }
        
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                    $value = $matches[2];
                }
                
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
        
        // Určení prostředí
        $this->environment = $_ENV['APP_ENV'] ?? 'development';
        
        // Validace prostředí
        $validEnvironments = ['development', 'production', 'testing'];
        if (!in_array($this->environment, $validEnvironments)) {
            throw new RuntimeException(
                "Invalid APP_ENV: {$this->environment}. Must be one of: " 
                . implode(', ', $validEnvironments)
            );
        }
    }
    
    /**
     * Načte konstanty (tabulky, limity)
     */
    private function loadConstants() {
        require_once __DIR__ . '/constants.php';
    }
    
    /**
     * Načte environment-specific konfiguraci
     */
    private function loadConfig() {
        $envConfigFile = __DIR__ . '/environments/' . $this->environment . '.php';
        
        if (!file_exists($envConfigFile)) {
            throw new RuntimeException(
                "Missing environment config: $envConfigFile"
            );
        }
        
        $this->config = require $envConfigFile;
    }
    
    /**
     * Získá konfigurační hodnotu
     * 
     * @param string $key Tečková notace pro vnořené hodnoty (např. 'database.host')
     * @param mixed $default Výchozí hodnota
     * @return mixed
     */
    public function get($key, $default = null) {
        $keys = explode('.', $key);
        $value = $this->config;
        
        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return $default;
            }
            $value = $value[$k];
        }
        
        return $value;
    }
    
    /**
     * Získá celou konfigurační sekci
     */
    public function getSection($section) {
        return $this->config[$section] ?? [];
    }
    
    /**
     * Aktuální prostředí
     */
    public function getEnvironment() {
        return $this->environment;
    }
    
    /**
     * Je produkční prostředí?
     */
    public function isProduction() {
        return $this->environment === 'production';
    }
    
    /**
     * Je development prostředí?
     */
    public function isDevelopment() {
        return $this->environment === 'development';
    }
    
    /**
     * Je testing prostředí?
     */
    public function isTesting() {
        return $this->environment === 'testing';
    }
    
    /**
     * Je debug mód zapnutý?
     */
    public function isDebug() {
        return $this->get('app.debug', false);
    }
}
```

### 3. `config/constants.php`

```php
<?php
/**
 * ERDMS - Centralizované Konstanty
 * 
 * Všechny konstanty aplikace na jednom místě.
 * Žádné define() v jiných souborech!
 * 
 * @author ERDMS Team
 * @version 1.0.0
 */

// ============================================
// APPLICATION INFO
// ============================================
define('APP_VERSION', 'v2025.03_25');
define('API_VERSION', '2.0');

// ============================================
// DATABASE TABLE NAMES - LP ČERPÁNÍ
// ============================================
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');

// ============================================
// DATABASE TABLE NAMES - CORE ENTITIES
// ============================================
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_SMLOUVY', '25_smlouvy');
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_FAKTURY_PRILOHY', '25a_faktury_prilohy');
define('TBL_DODAVATELE', '25_dodavatele');
define('TBL_OBJEDNAVKY_PRILOHY', '25a_objednavky_prilohy');

// ============================================
// DATABASE TABLE NAMES - ČÍSELNÍKY
// ============================================
define('TBL_POZICE', '25_pozice');
define('TBL_CISELNIK_STAVY', '25_ciselnik_stavy');
define('TBL_USEKY', '25_useky');

// ============================================
// DATABASE TABLE NAMES - NOTIFICATIONS
// ============================================
define('TBL_NOTIFICATIONS', '25_notifications');
define('TBL_NOTIFICATION_TEMPLATES', '25_notification_templates');
define('TBL_NOTIFICATION_PREFERENCES', '25_notification_preferences');

// ============================================
// DATABASE TABLE NAMES - HIERARCHY
// ============================================
define('TBL_HIERARCHY', '25_hierarchy');
define('TBL_USER_HIERARCHY', '25_user_hierarchy');

// ============================================
// DATABASE TABLE NAMES - SPISOVKA
// ============================================
define('TBL_SPISOVKA_DOKUMENTY', '25_spisovka_dokumenty');
define('TBL_SPISOVKA_PRILOHY', '25_spisovka_prilohy');
define('TBL_SPISOVKA_ZPRACOVANI', '25_spisovka_zpracovani');

// ============================================
// FILE UPLOAD LIMITS
// ============================================
define('MAX_UPLOAD_SIZE_BYTES', 20 * 1024 * 1024); // 20MB
define('MAX_UPLOAD_SIZE_MB', 20);
define('ALLOWED_FILE_EXTENSIONS', [
    // Dokumenty
    'pdf', 'doc', 'docx', 'rtf', 'odt',
    // Tabulky
    'xls', 'xlsx', 'ods', 'csv',
    // Prezentace
    'ppt', 'pptx', 'odp',
    // Text
    'txt', 'md',
    // Obrázky
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
    // Archivy
    'zip', 'rar', '7z', 'tar', 'gz'
]);

// ============================================
// FILE NAME PREFIXES
// ============================================
define('FILE_PREFIX_FAKTURA', 'fa-');
define('FILE_PREFIX_OBJEDNAVKA', 'obj-');
define('FILE_PREFIX_SMLOUVA', 'sm-');
define('FILE_PREFIX_SPISOVKA', 'spis-');

// ============================================
// DATE/TIME FORMATS
// ============================================
define('DATE_FORMAT_CZ', 'd.m.Y');
define('DATETIME_FORMAT_CZ', 'd.m.Y H:i:s');
define('DATE_FORMAT_DB', 'Y-m-d');
define('DATETIME_FORMAT_DB', 'Y-m-d H:i:s');

// ============================================
// PAGINATION
// ============================================
define('DEFAULT_PAGE_SIZE', 50);
define('MAX_PAGE_SIZE', 500);

// ============================================
// CACHE
// ============================================
define('CACHE_TTL_SHORT', 300);    // 5 minut
define('CACHE_TTL_MEDIUM', 1800);  // 30 minut
define('CACHE_TTL_LONG', 3600);    // 1 hodina
```

### 4. `config/environments/development.php`

```php
<?php
/**
 * DEVELOPMENT Environment Configuration
 */

return [
    'app' => [
        'name' => 'ERDMS Development',
        'debug' => filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN),
        'log_level' => 'debug',
        'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Europe/Prague',
        'version' => APP_VERSION
    ],
    
    'database' => [
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'port' => (int)($_ENV['DB_PORT'] ?? 3306),
        'name' => $_ENV['DB_NAME'] ?? 'erdms_dev',
        'username' => $_ENV['DB_USER'] ?? 'erdms_dev_user',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
        'collation' => $_ENV['DB_COLLATION'] ?? 'utf8mb4_czech_ci',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    ],
    
    'storage' => [
        'uploads' => [
            'root_path' => $_ENV['STORAGE_UPLOADS_PATH'] ?? '/var/www/erdms-data/eeo-v2-dev/prilohy/',
            'web_url' => $_ENV['STORAGE_UPLOADS_URL'] ?? 'https://erdms-dev.zachranka.cz/eeo-v2/prilohy/',
            'max_size' => MAX_UPLOAD_SIZE_BYTES,
            'allowed_extensions' => ALLOWED_FILE_EXTENSIONS,
            'directory_structure' => [
                'by_date' => false,      // Plochá struktura
                'by_order' => false,
                'by_user' => false
            ]
        ],
        'templates' => [
            'path' => $_ENV['STORAGE_TEMPLATES_PATH'] ?? '/var/www/erdms-data/eeo-v2-dev/sablony/',
            'docx_templates' => true
        ],
        'backups' => [
            'path' => $_ENV['STORAGE_BACKUPS_PATH'] ?? '/var/www/erdms-shared/backups/dev/',
            'retention_days' => 7
        ],
        'logs' => [
            'path' => '/var/www/erdms-dev/apps/eeo-v2/api-legacy/logs/',
            'max_files' => 10
        ]
    ],
    
    'api' => [
        'base_url' => $_ENV['API_BASE_URL'] ?? 'https://erdms-dev.zachranka.cz/api',
        'timeout' => (int)($_ENV['API_TIMEOUT'] ?? 30),
        'rate_limit' => [
            'enabled' => filter_var($_ENV['API_RATE_LIMIT_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'requests_per_hour' => 10000,
            'requests_per_minute' => 1000
        ]
    ],
    
    'auth' => [
        'token_lifetime' => (int)($_ENV['AUTH_TOKEN_LIFETIME'] ?? 86400), // 24 hodin
        'session_lifetime' => (int)($_ENV['AUTH_SESSION_LIFETIME'] ?? 28800), // 8 hodin
        'refresh_enabled' => true
    ],
    
    'mail' => [
        'enabled' => filter_var($_ENV['MAIL_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? 'dev@erdms.zachranka.cz',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'ERDMS Development',
        'sandbox' => true // Všechny maily jdou do log souboru
    ],
    
    'security' => [
        'cors_enabled' => true,
        'allowed_origins' => [
            'https://erdms-dev.zachranka.cz',
            'http://localhost:3000',
            'http://localhost:5173'
        ],
        'ssl_required' => false, // Pro local development
        'csrf_protection' => false // Vypnuto pro API
    ],
    
    'cache' => [
        'enabled' => false, // Vypnuto pro development
        'driver' => 'file',
        'path' => '/tmp/erdms-cache-dev/'
    ],
    
    'features' => [
        'maintenance_mode' => false,
        'new_ui_enabled' => true,
        'beta_features' => true
    ]
];
```

### 5. `config/environments/production.php`

```php
<?php
/**
 * PRODUCTION Environment Configuration
 */

return [
    'app' => [
        'name' => 'ERDMS Production',
        'debug' => false, // VŽDY FALSE v produkci!
        'log_level' => 'error',
        'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Europe/Prague',
        'version' => APP_VERSION
    ],
    
    'database' => [
        'host' => $_ENV['DB_HOST'] ?? '10.3.172.11',
        'port' => (int)($_ENV['DB_PORT'] ?? 3306),
        'name' => $_ENV['DB_NAME'] ?? 'erdms_production',
        'username' => $_ENV['DB_USER'] ?? 'erdms_prod_user',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
        'collation' => $_ENV['DB_COLLATION'] ?? 'utf8mb4_czech_ci',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    ],
    
    'storage' => [
        'uploads' => [
            'root_path' => $_ENV['STORAGE_UPLOADS_PATH'] ?? '/var/www/erdms-platforma/data/eeo-v2/prilohy/',
            'web_url' => $_ENV['STORAGE_UPLOADS_URL'] ?? 'https://erdms.zachranka.cz/eeo-v2/prilohy/',
            'max_size' => MAX_UPLOAD_SIZE_BYTES,
            'allowed_extensions' => ALLOWED_FILE_EXTENSIONS,
            'directory_structure' => [
                'by_date' => false,
                'by_order' => false,
                'by_user' => false
            ]
        ],
        'templates' => [
            'path' => $_ENV['STORAGE_TEMPLATES_PATH'] ?? '/var/www/erdms-platforma/data/eeo-v2/sablony/',
            'docx_templates' => true
        ],
        'backups' => [
            'path' => $_ENV['STORAGE_BACKUPS_PATH'] ?? '/var/www/erdms-shared/backups/production/',
            'retention_days' => 30
        ],
        'logs' => [
            'path' => '/var/www/erdms-platforma/apps/eeo-v2/shared/logs/',
            'max_files' => 30
        ]
    ],
    
    'api' => [
        'base_url' => $_ENV['API_BASE_URL'] ?? 'https://erdms.zachranka.cz/api',
        'timeout' => (int)($_ENV['API_TIMEOUT'] ?? 15),
        'rate_limit' => [
            'enabled' => true,
            'requests_per_hour' => 1000,
            'requests_per_minute' => 100
        ]
    ],
    
    'auth' => [
        'token_lifetime' => (int)($_ENV['AUTH_TOKEN_LIFETIME'] ?? 28800), // 8 hodin
        'session_lifetime' => (int)($_ENV['AUTH_SESSION_LIFETIME'] ?? 14400), // 4 hodiny
        'refresh_enabled' => true
    ],
    
    'mail' => [
        'enabled' => true,
        'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? 'erdms@zachranka.cz',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'ERDMS',
        'sandbox' => false
    ],
    
    'security' => [
        'cors_enabled' => true,
        'allowed_origins' => [
            'https://erdms.zachranka.cz'
        ],
        'ssl_required' => true,
        'csrf_protection' => false
    ],
    
    'cache' => [
        'enabled' => true,
        'driver' => 'file',
        'path' => '/var/www/erdms-platforma/apps/eeo-v2/shared/cache/'
    ],
    
    'features' => [
        'maintenance_mode' => false,
        'new_ui_enabled' => true,
        'beta_features' => false
    ]
];
```

---

## 🔄 MIGRACE EXISTUJÍCÍHO KÓDU

### Před:
```php
// api.php (starý způsob)
$_config = require __DIR__ . '/' . VERSION . '/lib/dbconfig.php';
$config = $_config['mysql'];

$conn = new mysqli(
    $config['host'],
    $config['username'],
    $config['password'],
    $config['database']
);

$uploadPath = '/var/www/erdms-data/eeo-v2/prilohy/';
```

### Po:
```php
// api.php (nový způsob)
require_once __DIR__ . '/config/AppConfig.php';
$appConfig = AppConfig::getInstance();

// Database connection
$dbConfig = $appConfig->get('database');
$conn = new mysqli(
    $dbConfig['host'],
    $dbConfig['username'],
    $dbConfig['password'],
    $dbConfig['name']
);

// Storage paths
$uploadPath = $appConfig->get('storage.uploads.root_path');
$templatesPath = $appConfig->get('storage.templates.path');

// Environment-specific behavior
if ($appConfig->isProduction()) {
    ini_set('display_errors', 0);
    error_log("Production mode active");
} else {
    ini_set('display_errors', 1);
    error_log("Development mode active");
}

// Debug info
if ($appConfig->isDebug()) {
    error_log("Request: " . json_encode($_REQUEST));
}
```

---

## 📦 DEPLOYMENT PROCESS

### 1. Development → Production Deployment

```bash
# V erdms-dev/
./deploy/deploy.sh eeo-v2 --version 2.1.0 --target production

# Co se stane:
# 1. Build aplikace
# 2. Zkopíruje .env.production → .env
# 3. Vytvoří release v erdms-platforma/apps/eeo-v2/releases/v2.1.0/
# 4. Přepne symlink 'current'
# 5. Restartuje služby
```

### 2. Rollback

```bash
./deploy/rollback.sh eeo-v2 --version 2.0.9
```

---

## ✅ VÝHODY TOHOTO PŘÍSTUPU

1. **Bezpečnost**
   - Credentials v `.env` (gitignored)
   - Žádné hesla v kódu
   - Oddělené databáze pro dev/prod

2. **Flexibilita**
   - Snadné přepínání prostředí
   - Různé nastavení pro různá prostředí
   - Environment variables override

3. **Údržba**
   - Všechny konstanty na jednom místě
   - Jednoduchý deployment
   - Verzování konfigurace

4. **Bezpečné Testování**
   - Oddělená data pro dev
   - Nelze omylem přepsat produkční soubory
   - Izolované prostředí

---

## 📋 CHECKLIST IMPLEMENTACE

- [ ] Vytvořit `config/` strukturu
- [ ] Implementovat `AppConfig.php`
- [ ] Přesunout konstanty do `constants.php`
- [ ] Vytvořit environment soubory (development, production)
- [ ] Vytvořit `.env.example`
- [ ] Přidat `.env` do `.gitignore`
- [ ] Refaktorovat `api.php` na nový config
- [ ] Refaktorovat všechny handler soubory
- [ ] Vytvořit deployment skripty
- [ ] Otestovat v dev prostředí
- [ ] Připravit produkční `.env`
- [ ] Deploy do produkce
- [ ] Dokumentace pro tým

---

## 🚀 DALŠÍ KROKY

Po dokončení konfigurace:
1. Vytvořit `erdms-platforma` strukturu
2. Nastavit separátní datové složky
3. Připravit Apache konfigurace
4. Vytvořit deployment skripty
5. Otestovat celý flow

---

**Poznámka:** Tento dokument slouží jako plán. Implementace bude provedena postupně po schválení struktury.
