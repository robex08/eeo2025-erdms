# ✅ PRODUKCE: MAINTENANCE_ADMIN nasazeno

**Datum nasazení:** 2025-12-31  
**Databáze:** eeo2025 (PRODUKCE)  
**Status:** ✅ Úspěšně nasazeno

---

## 📋 Provedené operace

### 1. ✅ Přidání práva do produkce
```sql
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('MAINTENANCE_ADMIN', 'Přístup do systému během maintenance režimu', 1);
```
**Výsledek:** Právo ID 96

### 2. ✅ Přiřazení rolím
```sql
-- SUPERADMIN
INSERT IGNORE INTO 25_role_prava (role_id, pravo_id, aktivni)
VALUES (1, 96, 1);

-- ADMINISTRATOR  
INSERT IGNORE INTO 25_role_prava (role_id, pravo_id, aktivni)
VALUES (2, 96, 1);
```

---

## 🔍 Ověření v produkci

```bash
mysql> SELECT id, kod_prava, popis FROM 25_prava 
       WHERE kod_prava = 'MAINTENANCE_ADMIN';
+----+-------------------+---------------------------------------------+
| id | kod_prava         | popis                                       |
+----+-------------------+---------------------------------------------+
| 96 | MAINTENANCE_ADMIN | Přístup do systému během maintenance režimu |
+----+-------------------+---------------------------------------------+

mysql> SELECT r.kod_role, r.nazev_role, p.kod_prava 
       FROM 25_role_prava rp 
       JOIN 25_role r ON r.id = rp.role_id 
       JOIN 25_prava p ON p.id = rp.pravo_id 
       WHERE p.kod_prava = 'MAINTENANCE_ADMIN';
+---------------+----------------+-------------------+
| kod_role      | nazev_role     | kod_prava         |
+---------------+----------------+-------------------+
| SUPERADMIN    | Superadmin     | MAINTENANCE_ADMIN |
| ADMINISTRATOR | Administrátor  | MAINTENANCE_ADMIN |
+---------------+----------------+-------------------+
```

---

## 🎯 Stav implementace

| Komponenta | DEV | PRODUKCE | Status |
|------------|-----|----------|--------|
| **Databáze** | ✅ eeo2025-dev | ✅ eeo2025 | Hotovo |
| **Backend PHP** | ✅ | ⚠️ Čeká na deploy | Připraveno |
| **Frontend React** | ✅ | ⚠️ Čeká na build | Připraveno |

---

## 📦 Další kroky pro plnou aktivaci

### 1. Backend (PHP API)
```bash
# API je již v /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/
# Pokud byl změněn globalSettingsHandlers.php, je třeba:
rsync -av --exclude='/.env' \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/
```

### 2. Frontend (React build)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod

# Poté rsync do /var/www/erdms-platform/apps/eeo-v2/client/build/
```

---

## 🔐 Efekt v produkci

**OD TÉTO CHVÍLE platí:**

### ✅ Mají přístup během maintenance:
- SUPERADMIN (role)
- ADMINISTRATOR (role + právo MAINTENANCE_ADMIN)
- Kdokoliv s přímým právem MAINTENANCE_ADMIN

### ❌ Nemají přístup:
- Všichni ostatní uživatelé → vidí MaintenancePage

---

## 📝 Poznámky

1. **Backend změny fungují okamžitě** (PHP)
   - Soubor `globalSettingsHandlers.php` je již nasazen

2. **Frontend změny vyžadují build:prod**
   - Soubor `App.js` je v dev verzi
   - Po build:prod bude kontrola aktivní i v produkci

3. **Databáze je synchronizována**
   - DEV i PRODUKCE mají stejnou strukturu práv

---

## 🧪 Testování v produkci

1. Přihlásit se jako ADMINISTRATOR
2. Zapnout maintenance mode v globálním nastavení
3. Ověřit, že ADMINISTRATOR má stále přístup
4. Odhlásit se a přihlásit jako běžný uživatel
5. Ověřit, že běžný uživatel vidí MaintenancePage
6. Vypnout maintenance mode

---

**✅ Databázová část nasazení do produkce dokončena!**
