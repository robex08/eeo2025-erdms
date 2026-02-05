# 📊 ANALÝZA: Sledování uživatelské aktivity

**Datum:** 5. února 2026  
**Požadavek:** Rozšíření sledování aktivity uživatelů o IP adresu a aktuální modul

---

## 🎯 SOUČASNÝ STAV

### Databázová struktura

**Tabulka: `25_uzivatele`**
```sql
CREATE TABLE 25_uzivatele (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  -- ... další sloupce ...
  dt_posledni_aktivita DATETIME NOT NULL,  -- ✅ Existuje
  -- ... další sloupce ...
);
```

**Aktualizace:**
```php
// /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php (řádek 241)
$queries['uzivatele_update_last_activity'] = "
  UPDATE 25_uzivatele 
  SET dt_posledni_aktivita = NOW() 
  WHERE id = :id
";
```

**Současné použití:**
- ✅ Aktualizuje se při každém API requestu
- ✅ Používá se v handlers (user/settings, user/detail, user/stats)
- ❌ Obsahuje POUZE timestamp (bez IP, bez modulu)

### Session Management

**Tabulka: `erdms_sessions`** (v databázi `erdms`, NE v `eeo2025`)
```sql
CREATE TABLE erdms_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  entra_access_token TEXT,
  entra_refresh_token TEXT,
  entra_id_token TEXT,
  token_expires_at DATETIME NOT NULL,
  ip_address VARCHAR(45),           -- ✅ JIŽ EXISTUJE!
  user_agent VARCHAR(255),          -- ✅ JIŽ EXISTUJE!
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,  -- ✅ Aktualizuje se
  FOREIGN KEY (user_id) REFERENCES erdms_users(id)
);
```

**Location:** `/apps/eeo-v2/api/src/services/authService.js`

**Současné sledování v session:**
- ✅ IP adresa se ukládá při login
- ✅ User agent se ukládá při login
- ✅ Last activity se aktualizuje
- ❌ ŽÁDNÉ sledování aktivního modulu

### Frontend Routing

**Hlavní moduly (z analýzy):**
```javascript
// Layout.js - Menu struktura
const routes = {
  '/dashboard': 'Dashboard',
  '/orders25-list': 'Objednávky',
  '/order-form-25': 'Formulář objednávky',
  '/invoices25-list': 'Faktury',
  '/invoice-evidence': 'Evidence faktury',
  '/cash-book': 'Pokladna',
  '/dictionaries': 'Číselníky',
  '/address-book': 'Adresář',
  '/notifications': 'Notifikace',
  '/reports': 'Reporty',
  '/statistics': 'Statistiky',
  '/profile': 'Profil',
  '/users': 'Správa uživatelů',
  '/debug': 'Debug panel'
};
```

---

## 🎯 POŽADOVANÉ ZMĚNY

### 1. **Sledování IP adresy**
- ✅ JIŽ FUNGUJE v `erdms_sessions`
- ⚠️ NENÍ v `25_uzivatele`

### 2. **Sledování aktuálního modulu**
- ❌ NEEXISTUJE nikde
- ⚠️ Potřeba implementovat tracking na FE i BE

### 3. **JSON formát pro flexibilitu**
- 💡 Dobrý nápad pro rozšiřitelnost
- 📦 Umožní budoucí rozšíření bez ALTER TABLE

---

## 💡 NÁVRH ŘEŠENÍ

### Varianta A: **JSON sloupec v `25_uzivatele`** (DOPORUČENO)

**Výhody:**
- ✅ Flexibilní struktura
- ✅ Snadné rozšíření
- ✅ Jeden dotaz pro čtení
- ✅ Kompatibilní s MySQL 5.5

**Nevýhody:**
- ⚠️ Nelze indexovat JSON pole
- ⚠️ Složitější dotazy při filtrování

**Implementace:**

```sql
-- Migrace
ALTER TABLE 25_uzivatele 
ADD COLUMN aktivita_metadata TEXT COMMENT 'JSON: IP, modul, historie' 
AFTER dt_posledni_aktivita;

-- Příklad dat:
{
  "last_ip": "10.3.172.45",
  "last_module": "orders25-list",
  "last_module_path": "/orders25-list",
  "last_user_agent": "Mozilla/5.0...",
  "session_id": "abc-123-def",
  "history": [
    {
      "timestamp": "2026-02-05 14:30:22",
      "ip": "10.3.172.45",
      "module": "orders25-list",
      "path": "/orders25-list"
    },
    {
      "timestamp": "2026-02-05 14:28:15",
      "ip": "10.3.172.45", 
      "module": "dashboard",
      "path": "/dashboard"
    }
  ]
}
```

### Varianta B: **Separátní sloupce v `25_uzivatele`**

**Výhody:**
- ✅ Snadnější SQL dotazy
- ✅ Možnost indexování

**Nevýhody:**
- ❌ Méně flexibilní
- ❌ Každé rozšíření = ALTER TABLE
- ❌ Více sloupců = větší tabulka

```sql
ALTER TABLE 25_uzivatele 
ADD COLUMN last_ip_address VARCHAR(45) AFTER dt_posledni_aktivita,
ADD COLUMN last_module VARCHAR(100) AFTER last_ip_address,
ADD COLUMN last_module_path VARCHAR(255) AFTER last_module,
ADD COLUMN last_user_agent VARCHAR(255) AFTER last_module_path;
```

### Varianta C: **Separátní tabulka pro historii**

**Výhody:**
- ✅ Plná historie aktivit
- ✅ Možnost analýz
- ✅ Indexovatelné

**Nevýhody:**
- ❌ Komplexnější implementace
- ❌ Více JOIN dotazů
- ❌ Vyšší zátěž DB

```sql
CREATE TABLE 25_uzivatele_aktivita_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45),
  module_name VARCHAR(100),
  module_path VARCHAR(255),
  user_agent VARCHAR(255),
  session_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_uzivatel_id (uzivatel_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ✅ DOPORUČENÉ ŘEŠENÍ

**Kombinace Varianta A + C (hybridní přístup):**

1. **`25_uzivatele.aktivita_metadata`** (JSON) 
   - Pro **aktuální stav** (last IP, last module)
   - Rychlý přístup bez JOINů

2. **`25_uzivatele_aktivita_log`** (separátní tabulka)
   - Pro **historii** a **analýzy**
   - Čistí se automaticky (retention 90 dní)

**Proč?**
- ✅ Nejlepší z obou světů
- ✅ Rychlé čtení aktuálního stavu
- ✅ Možnost analýz z historie
- ✅ Flexibilní pro budoucí rozšíření

---

## 📋 DETAILNÍ IMPLEMENTACE

### **FÁZE 1: Databázové změny**

#### 1.1 Migrace pro `25_uzivatele`

```sql
-- Soubor: migrations/2026-02-05_add_activity_tracking.sql

-- Přidat JSON sloupec pro aktivitu metadata
ALTER TABLE 25_uzivatele 
ADD COLUMN aktivita_metadata TEXT COMMENT 'JSON: {last_ip, last_module, last_path, last_user_agent, session_id}'
AFTER dt_posledni_aktivita;

-- Vytvoření tabulky pro log historie
CREATE TABLE IF NOT EXISTS 25_uzivatele_aktivita_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45),
  module_name VARCHAR(100),
  module_path VARCHAR(255),
  user_agent VARCHAR(255),
  session_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_uzivatel_id (uzivatel_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log uživatelské aktivity - retention 90 dní';

-- Stored procedure pro čištění starých záznamů
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_clean_activity_log()
BEGIN
  DELETE FROM 25_uzivatele_aktivita_log 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
END //
DELIMITER ;
```

#### 1.2 Test migrace (DEV)

```sql
-- Testovací zápis
UPDATE 25_uzivatele 
SET aktivita_metadata = '{"last_ip":"10.3.172.45","last_module":"orders25-list","last_path":"/orders25-list","last_user_agent":"Mozilla/5.0","session_id":"test-123"}' 
WHERE id = 1;

-- Čtení
SELECT 
  id,
  username,
  dt_posledni_aktivita,
  aktivita_metadata
FROM 25_uzivatele
WHERE id = 1;
```

---

### **FÁZE 2: Backend - PHP API**

#### 2.1 Nový query v `queries.php`

```php
// Soubor: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php

// ✅ NOVÝ: Update aktivity s metadata
$queries['uzivatele_update_activity_with_metadata'] = "
  UPDATE 25_uzivatele 
  SET 
    dt_posledni_aktivita = NOW(),
    aktivita_metadata = :metadata
  WHERE id = :id
";

// ✅ NOVÝ: Insert do activity log
$queries['uzivatele_activity_log_insert'] = "
  INSERT INTO 25_uzivatele_aktivita_log 
  (uzivatel_id, ip_address, module_name, module_path, user_agent, session_id) 
  VALUES 
  (:uzivatel_id, :ip_address, :module_name, :module_path, :user_agent, :session_id)
";

// ✅ NOVÝ: Získání historie aktivity
$queries['uzivatele_activity_log_select'] = "
  SELECT 
    id,
    ip_address,
    module_name,
    module_path,
    user_agent,
    session_id,
    created_at
  FROM 25_uzivatele_aktivita_log
  WHERE uzivatel_id = :uzivatel_id
  ORDER BY created_at DESC
  LIMIT :limit
";
```

#### 2.2 Nová helper funkce v `handlers.php`

```php
// Soubor: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php

/**
 * Aktualizace aktivity uživatele s metadata
 * 
 * @param PDO $db
 * @param array $queries
 * @param int $user_id
 * @param array $metadata [ip, module, path, user_agent, session_id]
 */
function update_user_activity_with_metadata($db, $queries, $user_id, $metadata) {
    try {
        // 1. Připrav JSON metadata
        $json_metadata = json_encode([
            'last_ip' => $metadata['ip'] ?? null,
            'last_module' => $metadata['module'] ?? null,
            'last_path' => $metadata['path'] ?? null,
            'last_user_agent' => $metadata['user_agent'] ?? null,
            'session_id' => $metadata['session_id'] ?? null,
            'updated_at' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);

        // 2. Update 25_uzivatele
        $stmt = $db->prepare($queries['uzivatele_update_activity_with_metadata']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':metadata', $json_metadata, PDO::PARAM_STR);
        $stmt->execute();

        // 3. Insert do activity log
        $stmt_log = $db->prepare($queries['uzivatele_activity_log_insert']);
        $stmt_log->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
        $stmt_log->bindParam(':ip_address', $metadata['ip'], PDO::PARAM_STR);
        $stmt_log->bindParam(':module_name', $metadata['module'], PDO::PARAM_STR);
        $stmt_log->bindParam(':module_path', $metadata['path'], PDO::PARAM_STR);
        $stmt_log->bindParam(':user_agent', $metadata['user_agent'], PDO::PARAM_STR);
        $stmt_log->bindParam(':session_id', $metadata['session_id'], PDO::PARAM_STR);
        $stmt_log->execute();

        return true;
    } catch (Exception $e) {
        error_log("update_user_activity_with_metadata error: " . $e->getMessage());
        return false;
    }
}

/**
 * Získání IP adresy klienta
 */
function get_client_ip() {
    $ip = '';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    return $ip;
}
```

#### 2.3 Nový endpoint pro tracking

```php
// Soubor: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php

/**
 * POST /user/activity/track
 * Zaznamenává aktivitu uživatele (modul, path)
 */
function handle_user_activity_track($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $module = isset($input['module']) ? $input['module'] : '';
    $path = isset($input['path']) ? $input['path'] : '';
    
    if (!$token || !$username) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token, $config);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Získej metadata
        $metadata = [
            'ip' => get_client_ip(),
            'module' => $module,
            'path' => $path,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'session_id' => $input['session_id'] ?? null
        ];

        // Aktualizuj aktivitu
        update_user_activity_with_metadata($db, $queries, $token_data['id'], $metadata);

        echo json_encode([
            'status' => 'ok',
            'message' => 'Aktivita zaznamenána'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba serveru: ' . $e->getMessage()]);
    }
}
```

#### 2.4 Registrace endpointu v `index.php`

```php
// Soubor: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/index.php

// ... existující kód ...

case 'POST':
    // ... existující endpointy ...
    
    if ($path === '/user/activity/track') {
        handle_user_activity_track($input, $config, $queries);
        exit;
    }
    
    // ... zbytek kódu ...
```

---

### **FÁZE 3: Frontend - React**

#### 3.1 Nový hook pro tracking

```javascript
// Soubor: /apps/eeo-v2/client/src/hooks/useActivityTracking.js

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Hook pro sledování uživatelské aktivity
 * - Automaticky trackuje změny route
 * - Throttluje requesty (max 1x za 30s)
 */
export const useActivityTracking = () => {
  const location = useLocation();
  const { user, token, isLoggedIn } = useAuth();
  const lastTrackRef = useRef(0);
  const trackingEnabledRef = useRef(true);

  // Mapování route na název modulu
  const getModuleName = (pathname) => {
    const moduleMap = {
      '/dashboard': 'Dashboard',
      '/orders25-list': 'Objednávky',
      '/order-form-25': 'Formulář objednávky',
      '/invoices25-list': 'Faktury',
      '/invoice-evidence': 'Evidence faktury',
      '/cash-book': 'Pokladna',
      '/dictionaries': 'Číselníky',
      '/address-book': 'Adresář',
      '/notifications': 'Notifikace',
      '/reports': 'Reporty',
      '/statistics': 'Statistiky',
      '/profile': 'Profil',
      '/users': 'Správa uživatelů',
      '/debug': 'Debug panel'
    };

    return moduleMap[pathname] || 'Neznámý modul';
  };

  const trackActivity = async (module, path) => {
    if (!isLoggedIn || !user || !token) return;
    if (!trackingEnabledRef.current) return;

    // Throttling - max 1x za 30 sekund
    const now = Date.now();
    if (now - lastTrackRef.current < 30000) return;
    lastTrackRef.current = now;

    try {
      const response = await fetch(`/api-legacy/api.eeo/v2025.03_25/index.php/user/activity/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          username: user.username,
          module,
          path,
          session_id: sessionStorage.getItem('erdms_session') || null
        })
      });

      if (!response.ok) {
        console.warn('Activity tracking failed:', response.status);
      }
    } catch (error) {
      console.warn('Activity tracking error:', error);
    }
  };

  // Automatický tracking při změně route
  useEffect(() => {
    if (!isLoggedIn) return;

    const module = getModuleName(location.pathname);
    const path = location.pathname + location.search;

    // Debounce - počkat 1s než uživatel opravdu zůstane na stránce
    const timer = setTimeout(() => {
      trackActivity(module, path);
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search, isLoggedIn]);

  return {
    trackActivity: (module, path) => trackActivity(module, path),
    enableTracking: () => { trackingEnabledRef.current = true; },
    disableTracking: () => { trackingEnabledRef.current = false; }
  };
};
```

#### 3.2 Integrace do Layout.js

```javascript
// Soubor: /apps/eeo-v2/client/src/components/Layout.js

import { useActivityTracking } from '../hooks/useActivityTracking';

export function Layout({ children }) {
  // ... existující kód ...

  // ✅ NOVÉ: Activity tracking
  useActivityTracking();

  // ... zbytek komponenty ...
}
```

#### 3.3 Manuální tracking pro speciální případy

```javascript
// Příklad: Tracking při otevření modalu
import { useActivityTracking } from '../hooks/useActivityTracking';

function OrderForm25() {
  const { trackActivity } = useActivityTracking();

  const handleOpenModal = () => {
    // Manuální tracking
    trackActivity('Formulář objednávky - Modal detail', '/order-form-25?modal=detail');
    setModalOpen(true);
  };

  // ... zbytek komponenty ...
}
```

---

### **FÁZE 4: Zobrazení dat v UI**

#### 4.1 Rozšíření user detail API

```php
// Soubor: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php

// Upravit existující dotaz
$queries['uzivatele_detail'] = "
    SELECT 
        u.id,
        u.username,
        -- ... existující sloupce ...
        u.dt_posledni_aktivita,
        u.aktivita_metadata,  -- ✅ NOVÉ
        -- ... zbytek ...
    FROM 25_uzivatele u
    -- ... JOINy ...
    WHERE u.id = :id
";
```

#### 4.2 Parsování JSON na FE

```javascript
// Soubor: /apps/eeo-v2/client/src/components/UniversalSearch/EntityDetailViews.js

export const UserDetailView = ({ data, hasAdminRole }) => {
  // Parsování activity metadata
  const activityMeta = useMemo(() => {
    if (!data.aktivita_metadata) return null;
    
    try {
      return JSON.parse(data.aktivita_metadata);
    } catch (e) {
      return null;
    }
  }, [data.aktivita_metadata]);

  return (
    <DetailViewWrapper>
      {/* ... existující obsah ... */}

      {/* ✅ NOVÁ SEKCE: Aktivita */}
      {(data.dt_posledni_aktivita || activityMeta) && (
        <DetailSection>
          <SectionTitle>Poslední aktivita</SectionTitle>
          <InfoGrid>
            {data.dt_posledni_aktivita && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faClock} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Čas</InfoLabel>
                  <InfoValue>
                    {new Date(data.dt_posledni_aktivita).toLocaleString('cs-CZ')}
                  </InfoValue>
                </InfoContent>
              </InfoRow>
            )}

            {activityMeta?.last_module && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faDesktop} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Modul</InfoLabel>
                  <InfoValue>{activityMeta.last_module}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}

            {activityMeta?.last_ip && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faNetworkWired} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>IP adresa</InfoLabel>
                  <InfoValue>{activityMeta.last_ip}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {/* ... zbytek ... */}
    </DetailViewWrapper>
  );
};
```

#### 4.3 Admin view - historie aktivity

```javascript
// Nová komponenta pro adminy
// Soubor: /apps/eeo-v2/client/src/components/UserActivityHistory.js

import React, { useState, useEffect } from 'react';
import { getUserActivityHistory } from '../services/apiUsers';

export const UserActivityHistory = ({ userId, token, username }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getUserActivityHistory(userId, token, username);
        setHistory(data);
      } catch (error) {
        console.error('Failed to load activity history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userId, token, username]);

  if (loading) return <div>Načítám historii...</div>;

  return (
    <div>
      <h3>Historie aktivity (posledních 100 záznamů)</h3>
      <table>
        <thead>
          <tr>
            <th>Čas</th>
            <th>Modul</th>
            <th>IP adresa</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.created_at).toLocaleString('cs-CZ')}</td>
              <td>{item.module_name}</td>
              <td>{item.ip_address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 🔒 GDPR & BEZPEČNOST

### Právní aspekty

**⚠️ DŮLEŽITÉ:** Sledování IP adres a aktivity je **osobní údaj** dle GDPR!

**Požadavky:**
1. ✅ Informovat uživatele v Zásadách ochrany osobních údajů
2. ✅ Zajistit oprávněný účel (bezpečnost, auditní log)
3. ✅ Retention policy (max 90 dní)
4. ✅ Přístup pouze pro adminy
5. ✅ Právo na výmaz (GDPR čl. 17)

**Doporučení:**
```sql
-- Automatické čištění starých záznamů (90 dní)
CREATE EVENT IF NOT EXISTS evt_clean_activity_log
ON SCHEDULE EVERY 1 DAY
DO
  CALL sp_clean_activity_log();
```

### Zabezpečení dat

1. **Šifrování v DB:** ✅ MySQL connection přes TLS
2. **Přístupová práva:** ❌ IMPLEMENTOVAT check pro admin role
3. **Anonymizace:** ✅ Mazání po 90 dnech
4. **Audit log:** ✅ Kdo přistupoval k activity logu

---

## 📋 IMPLEMENTAČNÍ PLÁN

### **KROK 1: Databáze (DEV)**
- [ ] Spustit migraci `2026-02-05_add_activity_tracking.sql` na DEV
- [ ] Ověřit funkčnost tabulek
- [ ] Otestovat stored procedure

### **KROK 2: Backend (DEV)**
- [ ] Přidat queries do `queries.php`
- [ ] Implementovat helper funkce v `handlers.php`
- [ ] Přidat endpoint `/user/activity/track`
- [ ] Testovat POST requesty (Postman/curl)

### **KROK 3: Frontend (DEV)**
- [ ] Vytvořit hook `useActivityTracking.js`
- [ ] Integrovat do `Layout.js`
- [ ] Otestovat tracking při navigaci
- [ ] Ověřit throttling (dev console)

### **KROK 4: UI zobrazení (DEV)**
- [ ] Upravit user detail API response
- [ ] Přidat sekci "Poslední aktivita" do `EntityDetailViews.js`
- [ ] Vytvořit komponentu `UserActivityHistory.js` (admin)
- [ ] Otestovat zobrazení dat

### **KROK 5: GDPR compliance (DEV + PROD)**
- [ ] Aktualizovat dokument "Zásady ochrany osobních údajů"
- [ ] Implementovat retention policy (90 dní)
- [ ] Přidat admin-only přístup k activity logu
- [ ] Dokumentovat účel zpracování

### **KROK 6: Testování (DEV)**
- [ ] Smoke testy - základní funkce
- [ ] Performance testy - zátěž DB
- [ ] UI testy - zobrazení dat
- [ ] Security testy - přístupová práva

### **KROK 7: Deployment (PROD)**
- [ ] Backup DB před migrací
- [ ] Spustit migraci na PROD
- [ ] Deploy BE změn
- [ ] Deploy FE změn (build)
- [ ] Monitoring - sledovat chyby 24h

---

## 📊 OČEKÁVANÉ VÝSLEDKY

### Uživatelská perspektiva
- ✅ **Admin:** Vidí, kdo se kdy a odkud přihlásil
- ✅ **Admin:** Vidí, v jakém modulu uživatel právě pracuje
- ✅ **User:** Vidí vlastní poslední aktivitu v profilu

### Technická perspektiva
- ✅ **JSON metadata:** Flexibilní struktura pro budoucí rozšíření
- ✅ **Activity log:** Historie pro analýzy a audit
- ✅ **Performance:** Throttling limituje zátěž DB
- ✅ **GDPR:** Automatické čištění po 90 dnech

### Bezpečnostní perspektiva
- ✅ **Audit trail:** Kdo, kdy, odkud, co dělal
- ✅ **Detekce anomálií:** Přihlášení z neobvyklé IP
- ✅ **Session management:** Propojení s `erdms_sessions`

---

## ❓ OTÁZKY K DISKUSI

1. **Retention policy:** 90 dní je OK? Nebo kratší/delší?
2. **Throttling:** 30 sekund mezi tracky je dostatečné?
3. **Admin permissions:** Mají vidět všichni admini, nebo pouze určité role?
4. **Performance:** Měřit zátěž DB po nasazení?
5. **GDPR:** Potřebujeme právní konzultaci před nasazením?

---

## 🎯 DOPORUČENÍ

**ANO, je to realizovatelné!** ✅

**Doporučený přístup:**
1. ✅ Použít **JSON sloupec** v `25_uzivatele` pro aktuální stav
2. ✅ Použít **separátní tabulku** pro historii (90 dní retention)
3. ✅ Implementovat **throttling** na FE (max 1x/30s)
4. ✅ Zajistit **GDPR compliance** (informace + retention)
5. ✅ Nejdřív nasadit na **DEV**, pak testovat, pak **PROD**

**Časový odhad:**
- Backend: **3-4 hodiny**
- Frontend: **2-3 hodiny**
- Testing: **2 hodiny**
- Documentation: **1 hodina**
- **Celkem: ~8-10 hodin** (1-2 pracovní dny)

**Rizika:**
- ⚠️ GDPR - nutno konzultovat s právníkem
- ⚠️ Performance - sledovat zátěž DB po nasazení
- ⚠️ Privacy - citlivá data (IP adresy)

---

**✅ ZÁVĚR:** Implementace je **technicky jednoduchá**, ale vyžaduje **pečlivé ošetření GDPR a bezpečnosti**.
