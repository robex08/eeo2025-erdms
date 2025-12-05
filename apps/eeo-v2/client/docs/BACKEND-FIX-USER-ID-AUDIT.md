# 🐛 FIX: Chybějící `vytvoril`/`upravil` při editaci pokladen

## ❌ Problém
Při vytváření/editaci pokladen v číselníkách se do DB ukládá `vytvoril = 0` a `upravil = 0` místo ID přihlášeného uživatele.

## 🔍 Analýza

### Frontend ✅ OPRAVENO
**Soubor:** `src/services/cashbookService.js`

**Před:**
```javascript
const getAuthData = async () => {
  return {
    username: user.username,
    token: token
  };
};
```

**Po:**
```javascript
const getAuthData = async () => {
  return {
    username: user.username,
    token: token,
    user_id: user.id // 🆕 Pro vytvoril/upravil pole v DB
  };
};
```

Nyní **všechny API requesty** automaticky obsahují `user_id`:
- `/cashbox-create` → Posílá `user_id`
- `/cashbox-update` → Posílá `user_id`
- `/cashbox-assign-user` → Posílá `user_id`
- atd.

---

## 🔧 Backend - Požadované úpravy

### 1️⃣ Endpoint: `/cashbox-create`

**Přijímaná data:**
```json
{
  "username": "admin",
  "token": "xyz",
  "user_id": 123,  // 🆕 NOVĚ přichází z frontendu
  "nazev": "Pokladna 600",
  "ciselna_rada_vpd": "598",
  ...
}
```

**SQL INSERT:**
```sql
INSERT INTO 25a_pokladny (
  nazev,
  kod_pracoviste,
  nazev_pracoviste,
  ciselna_rada_vpd,
  vpd_od_cislo,
  ciselna_rada_ppd,
  ppd_od_cislo,
  poznamka,
  aktivni,
  vytvoreno,
  vytvoril,           -- 🔧 Použít $_POST['user_id']
  aktualizovano,
  aktualizoval        -- 🔧 Použít $_POST['user_id']
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?, NOW(), ?)
```

**PHP kód:**
```php
// ❌ ŠPATNĚ (původní)
$vytvoril = 0;
$aktualizoval = 0;

// ✅ SPRÁVNĚ (opravené)
$vytvoril = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
$aktualizoval = $vytvoril;
```

---

### 2️⃣ Endpoint: `/cashbox-update`

**Přijímaná data:**
```json
{
  "username": "admin",
  "token": "xyz",
  "user_id": 123,        // 🆕 NOVĚ přichází z frontendu
  "pokladna_id": 1,
  "nazev": "Nový název",
  ...
}
```

**SQL UPDATE:**
```sql
UPDATE 25a_pokladny
SET 
  nazev = ?,
  kod_pracoviste = ?,
  nazev_pracoviste = ?,
  ciselna_rada_vpd = ?,
  vpd_od_cislo = ?,
  ciselna_rada_ppd = ?,
  ppd_od_cislo = ?,
  poznamka = ?,
  aktualizovano = NOW(),
  aktualizoval = ?      -- 🔧 Použít $_POST['user_id']
WHERE id = ?
```

**PHP kód:**
```php
// ❌ ŠPATNĚ
$aktualizoval = 0;

// ✅ SPRÁVNĚ
$aktualizoval = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
```

---

### 3️⃣ Endpoint: `/cashbox-assign-user`

**Přijímaná data:**
```json
{
  "username": "admin",
  "token": "xyz",
  "user_id": 123,        // 🆕 Kdo přiřazuje (admin)
  "pokladna_id": 1,
  "uzivatel_id": 105,    // Koho přiřazujeme
  "je_hlavni": true,
  ...
}
```

**SQL INSERT:**
```sql
INSERT INTO 25a_pokladny_uzivatele (
  pokladna_id,
  uzivatel_id,
  je_hlavni,
  platne_od,
  platne_do,
  poznamka,
  vytvoreno,
  vytvoril,           -- 🔧 Kdo vytvořil přiřazení = $_POST['user_id']
  aktualizovano,
  aktualizoval
) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
```

---

## 📋 Checklist pro backend

### `/cashbox-create`
- [ ] Přijímá `user_id` z `$_POST['user_id']`
- [ ] Ukládá `vytvoril = user_id`
- [ ] Ukládá `aktualizoval = user_id`
- [ ] Fallback na `0` pokud `user_id` chybí

### `/cashbox-update`
- [ ] Přijímá `user_id` z `$_POST['user_id']`
- [ ] Ukládá `aktualizoval = user_id`
- [ ] Fallback na `0` pokud `user_id` chybí

### `/cashbox-assign-user`
- [ ] Přijímá `user_id` z `$_POST['user_id']` (= admin co přiřazuje)
- [ ] Ukládá `vytvoril = user_id`
- [ ] Ukládá `aktualizoval = user_id`
- [ ] Fallback na `0` pokud `user_id` chybí

### `/cashbox-unassign-user`
- [ ] Přijímá `user_id` z `$_POST['user_id']`
- [ ] UPDATE: `aktualizoval = user_id`

### `/cashbox-sync-users`
- [ ] Přijímá `user_id` z `$_POST['user_id']`
- [ ] Při DELETE: `aktualizoval = user_id`
- [ ] Při INSERT: `vytvoril = user_id`

---

## 🧪 Testování

### Test 1: Vytvoření nové pokladny
1. Přihlásit se jako admin (ID: 123)
2. Otevřít Číselníky → Pokladny
3. Vytvořit novou pokladnu
4. Ověřit v DB:
```sql
SELECT id, nazev, vytvoril, aktualizoval 
FROM 25a_pokladny 
ORDER BY id DESC LIMIT 1;
```
**Očekávaný výsledek:** `vytvoril = 123`, `aktualizoval = 123`

### Test 2: Úprava existující pokladny
1. Přihlásit se jako admin (ID: 123)
2. Editovat pokladnu č. 600
3. Změnit název nebo VPD
4. Uložit
5. Ověřit v DB:
```sql
SELECT id, nazev, vytvoril, aktualizoval, aktualizovano
FROM 25a_pokladny 
WHERE id = 1;
```
**Očekávaný výsledek:** `aktualizoval = 123`, `aktualizovano = NOW()`

### Test 3: Přiřazení uživatele
1. Přihlásit se jako admin (ID: 123)
2. Přiřadit uživatele k pokladně
3. Ověřit v DB:
```sql
SELECT prirazeni_id, pokladna_id, uzivatel_id, vytvoril, aktualizoval
FROM 25a_pokladny_uzivatele
ORDER BY prirazeni_id DESC LIMIT 1;
```
**Očekávaný výsledek:** `vytvoril = 123`, `aktualizoval = 123`

---

## 📊 Databázová struktura

### Tabulka: `25a_pokladny`
```sql
CREATE TABLE `25a_pokladny` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nazev` VARCHAR(255) DEFAULT NULL,
  ...
  `vytvoreno` DATETIME DEFAULT NULL,
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL,  -- FK -> 25_uzivatele.id
  `aktualizovano` DATETIME DEFAULT NULL,
  `aktualizoval` INT(10) UNSIGNED DEFAULT NULL,  -- FK -> 25_uzivatele.id
  PRIMARY KEY (`id`)
);
```

### Tabulka: `25a_pokladny_uzivatele`
```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `prirazeni_id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pokladna_id` INT(10) UNSIGNED NOT NULL,
  `uzivatel_id` INT(10) UNSIGNED NOT NULL,
  ...
  `vytvoreno` DATETIME DEFAULT NULL,
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL,  -- Kdo vytvořil přiřazení
  `aktualizovano` DATETIME DEFAULT NULL,
  `aktualizoval` INT(10) UNSIGNED DEFAULT NULL,  -- Kdo upravil přiřazení
  PRIMARY KEY (`prirazeni_id`)
);
```

---

## 🎯 Priorita
🔴 **VYSOKÁ** - Bez tohoto fix nelze auditovat změny v pokladnách

## 📅 Status
- ✅ Frontend opraveno (2025-11-09)
- ⏳ Backend čeká na implementaci

