# 🔧 CASHBOOK BACKEND API - ZMĚNY PRO NORMALIZOVANOU STRUKTURU

**Datum:** 8. listopadu 2025  
**Priorita:** 🔥 **VYSOKÁ**  
**Status:** ⏳ Čeká na implementaci

---

## 📋 PŘEHLED ZMĚN

Po aplikaci SQL refactoringu (`refactor_cashbook_normalized_structure.sql`) je potřeba upravit endpointy:

### 🎯 NOVÝ PŘÍSTUP - ČÍSELNÍKY:
**Zobrazení:** Tabulka pokladen (master) + rozbalovací seznam uživatelů pro každou pokladnu

| Endpoint | Účel | Priorita |
|----------|------|----------|
| `/cashbox-list` | 🆕 Seznam pokladen + přiřazení uživatelé | 🔥 Vysoká |
| `/cashbox-create` | 🆕 Vytvořit novou pokladnu | 🔥 Vysoká |
| `/cashbox-update` | 🆕 Upravit parametry pokladny | 🔥 Vysoká |
| `/cashbox-delete` | 🆕 Smazat pokladnu | 🟡 Střední |
| `/cashbox-assign-user` | 🆕 Přiřadit uživatele k pokladně | 🔥 Vysoká |
| `/cashbox-unassign-user` | 🆕 Odebrat uživatele z pokladny | 🔥 Vysoká |

### 📦 STARÉ ENDPOINTY (zachovat pro kompatibilitu):
| Endpoint | Změna | Priorita |
|----------|-------|----------|
| `/cashbox-assignments-list` | JOIN na `25a_pokladny` | � Střední |
| `/cashbox-assignment-create` | Deprecated → použít nové | � Střední |
| `/cashbox-assignment-update` | Deprecated → použít nové | 🟡 Střední |

---

## 🆕 NOVÉ ENDPOINTY PRO ČÍSELNÍKY

---

## 1️⃣ HLAVNÍ ENDPOINT: `/cashbox-list` 🆕

### 📝 Popis:
Seznam všech pokladen (master) + pro každou pokladnu seznam přiřazených uživatelů.

**Použití:** Hlavní tabulka v číselníkách → řádek = pokladna, expandable = uživatelé

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "active_only": true,
  "include_users": true
}
```

### 💾 SQL
```php
// Krok 1: Načíst pokladny
$query_pokladny = "
  SELECT 
    p.id,
    p.cislo_pokladny,
    p.nazev,
    p.kod_pracoviste,
    p.nazev_pracoviste,
    p.ciselna_rada_vpd,
    p.vpd_od_cislo,
    p.ciselna_rada_ppd,
    p.ppd_od_cislo,
    p.aktivni,
    p.poznamka,
    p.vytvoreno,
    p.aktualizovano,
    
    -- Kdo vytvořil/upravil
    vytvoril_u.jmeno AS vytvoril_jmeno,
    vytvoril_u.prijmeni AS vytvoril_prijmeni,
    aktualizoval_u.jmeno AS aktualizoval_jmeno,
    aktualizoval_u.prijmeni AS aktualizoval_prijmeni,
    
    -- Počet aktivních přiřazení
    (SELECT COUNT(*) 
     FROM 25a_pokladny_uzivatele pu 
     WHERE pu.pokladna_id = p.id 
       AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
    ) AS pocet_uzivatelu
    
  FROM 25a_pokladny p
  LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = p.vytvoril
  LEFT JOIN 25_uzivatele aktualizoval_u ON aktualizoval_u.id = p.aktualizoval
  WHERE p.aktivni = 1
  ORDER BY p.cislo_pokladny
";

// Krok 2: Pro každou pokladnu načíst přiřazené uživatele
$query_uzivatele = "
  SELECT 
    pu.id AS prirazeni_id,
    pu.uzivatel_id,
    pu.je_hlavni,
    pu.platne_od,
    pu.platne_do,
    pu.poznamka,
    pu.vytvoreno,
    
    -- Data uživatele
    u.username,
    u.jmeno AS uzivatel_jmeno,
    u.prijmeni AS uzivatel_prijmeni,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno,
    
    -- Kdo vytvořil přiřazení
    vytvoril_u.jmeno AS vytvoril_jmeno,
    vytvoril_u.prijmeni AS vytvoril_prijmeni
    
  FROM 25a_pokladny_uzivatele pu
  JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
  LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
  WHERE pu.pokladna_id = ?
    AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
  ORDER BY pu.je_hlavni DESC, u.prijmeni, u.jmeno
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "pokladny": [
      {
        "id": "1",
        "cislo_pokladny": "100",
        "nazev": "Sdílená pokladna IT",
        "kod_pracoviste": "IT",
        "nazev_pracoviste": "IT oddělení",
        "ciselna_rada_vpd": "599",
        "vpd_od_cislo": "1",
        "ciselna_rada_ppd": "499",
        "ppd_od_cislo": "1",
        "aktivni": true,
        "pocet_uzivatelu": 2,
        "poznamka": "",
        "vytvoreno": "2025-11-08 10:00:00",
        "aktualizovano": "2025-11-08 12:30:00",
        "vytvoril_jmeno": "Super",
        "vytvoril_prijmeni": "ADMIN",
        
        "uzivatele": [
          {
            "prirazeni_id": "1",
            "uzivatel_id": "1",
            "username": "admin",
            "uzivatel_cele_jmeno": "Super ADMIN",
            "je_hlavni": true,
            "platne_od": "2025-11-08",
            "platne_do": null,
            "poznamka": "",
            "vytvoreno": "2025-11-08 10:00:00"
          },
          {
            "prirazeni_id": "2",
            "uzivatel_id": "102",
            "username": "bezouskova_t",
            "uzivatel_cele_jmeno": "Tereza Bezoušková",
            "je_hlavni": false,
            "platne_od": "2025-11-08",
            "platne_do": null,
            "poznamka": "Sdílená pokladna",
            "vytvoreno": "2025-11-08 11:15:00"
          }
        ]
      },
      {
        "id": "2",
        "cislo_pokladny": "101",
        "nazev": "Testovací pokladna",
        "kod_pracoviste": "EN",
        "ciselna_rada_vpd": "598",
        "vpd_od_cislo": "50",
        "ciselna_rada_ppd": "498",
        "ppd_od_cislo": "25",
        "pocet_uzivatelu": 1,
        "uzivatele": [
          {
            "uzivatel_id": "105",
            "uzivatel_cele_jmeno": "Tereza Bezoušková THP",
            "je_hlavni": true
          }
        ]
      }
    ]
  }
}
```

### 🎯 POUŽITÍ V UI:
```jsx
// Hlavní tabulka - řádky jsou POKLADNY
<Table>
  {pokladny.map(pokladna => (
    <Row key={pokladna.id}>
      <Cell>{pokladna.cislo_pokladny}</Cell>
      <Cell>{pokladna.nazev}</Cell>
      <Cell>{pokladna.ciselna_rada_vpd}</Cell>
      <Cell>{pokladna.ciselna_rada_ppd}</Cell>
      <Cell>{pokladna.pocet_uzivatelu} uživatelů</Cell>
      <Cell>
        <ExpandButton /> {/* Rozbalit seznam uživatelů */}
        <EditButton />   {/* Upravit VPD/PPD */}
        <DeleteButton /> {/* Smazat pokladnu */}
      </Cell>
    </Row>
    
    {/* Expandable - seznam uživatelů */}
    {expanded && (
      <SubRow>
        <UserList>
          {pokladna.uzivatele.map(user => (
            <UserItem>
              {user.uzivatel_cele_jmeno}
              {user.je_hlavni && <Badge>Hlavní</Badge>}
              <RemoveButton /> {/* Odebrat uživatele */}
            </UserItem>
          ))}
          <AddUserButton /> {/* Přiřadit uživatele */}
        </UserList>
      </SubRow>
    )}
  ))}
</Table>
```

---

## 2️⃣ ENDPOINT: `/cashbox-create` 🆕

### 📝 Popis:
Vytvoří novou pokladnu (bez přiřazení uživatelů).

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "cislo_pokladny": 103,
  "nazev": "Nová pokladna OI",
  "kod_pracoviste": "OI",
  "nazev_pracoviste": "Oddělení informatiky",
  "ciselna_rada_vpd": "597",
  "vpd_od_cislo": 1,
  "ciselna_rada_ppd": "497",
  "ppd_od_cislo": 1,
  "poznamka": "Vytvořeno pro OI"
}
```

### 💾 SQL
```php
// Zkontrolovat duplicitu čísla pokladny
$query_check = "
  SELECT id FROM 25a_pokladny 
  WHERE cislo_pokladny = ?
  LIMIT 1
";

if (existuje) {
  return error("Pokladna s číslem $cislo_pokladny již existuje");
}

// Vytvořit pokladnu
$query = "
  INSERT INTO 25a_pokladny (
    cislo_pokladny,
    nazev,
    kod_pracoviste,
    nazev_pracoviste,
    ciselna_rada_vpd,
    vpd_od_cislo,
    ciselna_rada_ppd,
    ppd_od_cislo,
    aktivni,
    poznamka,
    vytvoreno,
    vytvoril
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?)
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Pokladna byla vytvořena",
    "pokladna_id": 3,
    "cislo_pokladny": 103
  }
}
```

---

## 3️⃣ ENDPOINT: `/cashbox-update` 🆕

### 📝 Popis:
Upraví parametry pokladny (VPD/PPD, název, pracoviště).

**⚠️ POZOR:** Ovlivní **všechny uživatele** přiřazené k této pokladně!

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "pokladna_id": 1,
  "nazev": "Nový název pokladny",
  "ciselna_rada_vpd": "598",
  "vpd_od_cislo": 75,
  "ciselna_rada_ppd": "498",
  "ppd_od_cislo": 50,
  "kod_pracoviste": "IT",
  "nazev_pracoviste": "IT oddělení",
  "poznamka": "Upraveno 8.11.2025"
}
```

### 💾 SQL
```php
// Spočítat kolik uživatelů to ovlivní
$query_count = "
  SELECT COUNT(*) as pocet
  FROM 25a_pokladny_uzivatele
  WHERE pokladna_id = ?
    AND (platne_do IS NULL OR platne_do >= CURDATE())
";

// UPDATE pokladny
$query = "
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
    aktualizoval = ?
  WHERE id = ?
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Pokladna byla aktualizována",
    "pokladna_id": 1,
    "affected_users": 2,
    "warning": "Tato změna ovlivnila 2 uživatele"
  }
}
```

### 🎯 DOPORUČENÍ:
- UI: Zobrazit varování před uložením: "Tato změna ovlivní 2 uživatele"
- UI: Vyžadovat potvrzení
- BE: Logovat změnu do audit logu

---

## 4️⃣ ENDPOINT: `/cashbox-delete` 🆕

### 📝 Popis:
Smaže pokladnu (pouze pokud nemá přiřazené uživatele nebo knihy).

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "pokladna_id": 3
}
```

### 💾 SQL
```php
// Zkontrolovat závislosti
$query_check_users = "
  SELECT COUNT(*) as pocet FROM 25a_pokladny_uzivatele
  WHERE pokladna_id = ?
";

$query_check_knihy = "
  SELECT COUNT(*) as pocet FROM 25a_pokladni_knihy
  WHERE pokladna_id = ?
";

if (pocet_users > 0 || pocet_knihy > 0) {
  return error("Nelze smazat pokladnu s přiřazenými uživateli nebo knihami");
}

// Soft delete nebo hard delete
$query = "
  UPDATE 25a_pokladny
  SET aktivni = 0
  WHERE id = ?
";

// Nebo hard delete:
// DELETE FROM 25a_pokladny WHERE id = ?
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Pokladna byla smazána"
  }
}
```

---

## 5️⃣ ENDPOINT: `/cashbox-assign-user` 🆕

### 📝 Popis:
Přiřadí uživatele k existující pokladně.

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "pokladna_id": 1,
  "uzivatel_id": 105,
  "je_hlavni": false,
  "platne_od": "2025-11-08",
  "platne_do": null,
  "poznamka": "Zástup za kolegu"
}
```

### 💾 SQL
```php
// Zkontrolovat duplicitu
$query_check = "
  SELECT id FROM 25a_pokladny_uzivatele
  WHERE pokladna_id = ?
    AND uzivatel_id = ?
    AND (platne_do IS NULL OR platne_do >= CURDATE())
  LIMIT 1
";

if (existuje) {
  return error("Uživatel je již přiřazen k této pokladně");
}

// Vytvořit přiřazení
$query = "
  INSERT INTO 25a_pokladny_uzivatele (
    pokladna_id,
    uzivatel_id,
    je_hlavni,
    platne_od,
    platne_do,
    poznamka,
    vytvoreno,
    vytvoril
  ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Uživatel byl přiřazen k pokladně",
    "prirazeni_id": 5,
    "pokladna_id": 1,
    "uzivatel_id": 105
  }
}
```

---

## 6️⃣ ENDPOINT: `/cashbox-unassign-user` 🆕

### 📝 Popis:
Odebere uživatele z pokladny (ukončí platnost přiřazení).

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "prirazeni_id": 5,
  "platne_do": "2025-11-08"
}
```

### 💾 SQL
```php
// Soft delete - nastavit platne_do
$query = "
  UPDATE 25a_pokladny_uzivatele
  SET platne_do = ?
  WHERE id = ?
";

// Nebo hard delete:
// DELETE FROM 25a_pokladny_uzivatele WHERE id = ?
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Uživatel byl odebrán z pokladny"
  }
}
```

---

## 📊 STARÉ ENDPOINTY (zachovat pro kompatibilitu)

---

## 7️⃣ ENDPOINT: `/cashbox-assignments-list` (DEPRECATED)

### 📥 Request (beze změny)
```json
{
  "username": "admin",
  "token": "xyz",
  "uzivatel_id": 1,
  "active_only": true
}
```

### 🔄 ZMĚNA SQL DOTAZU

#### ❌ PŘED (starý):
```php
$query = "
  SELECT 
    pu.*,
    u.jmeno AS uzivatel_jmeno,
    u.prijmeni AS uzivatel_prijmeni,
    vytvoril_u.jmeno AS vytvoril_jmeno,
    vytvoril_u.prijmeni AS vytvoril_prijmeni
  FROM 25a_pokladny_uzivatele pu
  LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
  LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
  WHERE pu.uzivatel_id = ?
  ORDER BY pu.cislo_pokladny, pu.platne_od DESC
";
```

#### ✅ PO (nový):
```php
$query = "
  SELECT 
    pu.id,
    pu.pokladna_id,
    pu.uzivatel_id,
    pu.je_hlavni,
    pu.platne_od,
    pu.platne_do,
    pu.poznamka,
    pu.vytvoreno,
    pu.vytvoril,
    
    -- Data z tabulky pokladen
    p.cislo_pokladny,
    p.nazev AS nazev_pokladny,
    p.kod_pracoviste,
    p.nazev_pracoviste,
    p.ciselna_rada_vpd,
    p.vpd_od_cislo,
    p.ciselna_rada_ppd,
    p.ppd_od_cislo,
    p.aktivni AS pokladna_aktivni,
    
    -- Data uživatele
    u.jmeno AS uzivatel_jmeno,
    u.prijmeni AS uzivatel_prijmeni,
    
    -- Kdo vytvořil přiřazení
    vytvoril_u.jmeno AS vytvoril_jmeno,
    vytvoril_u.prijmeni AS vytvoril_prijmeni
    
  FROM 25a_pokladny_uzivatele pu
  
  -- ✅ NOVÝ JOIN na pokladny
  INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
  
  LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
  LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
  
  WHERE pu.uzivatel_id = ?
  ORDER BY p.cislo_pokladny, pu.platne_od DESC
";
```

### 📤 Response (struktura beze změny)
```json
{
  "status": "ok",
  "data": {
    "assignments": [
      {
        "id": "1",
        "pokladna_id": "1",
        "uzivatel_id": "1",
        "cislo_pokladny": "100",
        "nazev_pokladny": "Sdílená pokladna IT",
        "kod_pracoviste": "IT",
        "nazev_pracoviste": "IT oddělení",
        "ciselna_rada_vpd": "599",
        "vpd_od_cislo": "1",
        "ciselna_rada_ppd": "499",
        "ppd_od_cislo": "1",
        "je_hlavni": "1",
        "platne_od": "2025-11-08",
        "platne_do": null,
        "aktivni": true,
        "uzivatel_jmeno": "Super",
        "uzivatel_prijmeni": "ADMIN"
      }
    ]
  }
}
```

### 🎯 POZNÁMKA:
- Response struktura zůstává **stejná** (kompatibilní s frontend)
- Frontend čte: `ciselna_rada_vpd`, `vpd_od_cislo`, `ppd_od_cislo` → funguje bez změn
- Rozdíl: data nyní přichází z **JOIN na `25a_pokladny`** místo z `25a_pokladny_uzivatele`

---

### ⚠️ Poznámka:
Tento endpoint lze zachovat pro **view uživatelů** (můj profil → moje pokladny).  
Pro **admin číselníky** použít **nové endpointy výše**.

---

## 8️⃣ ENDPOINT: `/cashbox-assignment-create` (DEPRECATED)

### 📥 Request (beze změny)
```json
{
  "username": "admin",
  "token": "xyz",
  "uzivatel_id": 102,
  "cislo_pokladny": 100,
  "kod_pracoviste": "IT",
  "nazev_pracoviste": "IT oddělení",
  "ciselna_rada_vpd": "599",
  "vpd_od_cislo": 1,
  "ciselna_rada_ppd": "499",
  "ppd_od_cislo": 1,
  "je_hlavni": 0,
  "platne_od": "2025-11-08",
  "poznamka": "Sdílená pokladna"
}
```

### 🔄 ZMĚNA LOGIKY

#### ❌ PŘED (starý):
```php
// Jednoduše INSERT všech dat
$query = "
  INSERT INTO 25a_pokladny_uzivatele (
    uzivatel_id, cislo_pokladny, kod_pracoviste, nazev_pracoviste,
    ciselna_rada_vpd, vpd_od_cislo, ciselna_rada_ppd, ppd_od_cislo,
    je_hlavni, platne_od, poznamka, vytvoreno, vytvoril
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
";
```

#### ✅ PO (nový - 2 kroky):

```php
// KROK 1: Najít nebo vytvořit pokladnu v 25a_pokladny
// =====================================================

// 1a) Zkusit najít existující pokladnu podle čísla
$query_find = "
  SELECT id FROM 25a_pokladny 
  WHERE cislo_pokladny = ?
  LIMIT 1
";
$stmt = $pdo->prepare($query_find);
$stmt->execute([$cislo_pokladny]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    // Pokladna již existuje
    $pokladna_id = $existing['id'];
    
    // ⚠️ VOLITELNĚ: Zkontrolovat, zda VPD/PPD sedí
    // Pokud ne, buď UPDATE nebo ERROR (záleží na business logice)
    
} else {
    // 1b) Vytvořit novou pokladnu
    $query_create_pokladna = "
      INSERT INTO 25a_pokladny (
        cislo_pokladny,
        nazev,
        kod_pracoviste,
        nazev_pracoviste,
        ciselna_rada_vpd,
        vpd_od_cislo,
        ciselna_rada_ppd,
        ppd_od_cislo,
        aktivni,
        vytvoreno,
        vytvoril
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)
    ";
    
    $stmt = $pdo->prepare($query_create_pokladna);
    $stmt->execute([
        $cislo_pokladny,
        "Pokladna $cislo_pokladny", // Nebo z requestu
        $kod_pracoviste,
        $nazev_pracoviste,
        $ciselna_rada_vpd,
        $vpd_od_cislo,
        $ciselna_rada_ppd,
        $ppd_od_cislo,
        $current_user_id
    ]);
    
    $pokladna_id = $pdo->lastInsertId();
}

// KROK 2: Vytvořit přiřazení uživatele k pokladně
// ================================================

$query_create_assignment = "
  INSERT INTO 25a_pokladny_uzivatele (
    pokladna_id,
    uzivatel_id,
    je_hlavni,
    platne_od,
    platne_do,
    poznamka,
    vytvoreno,
    vytvoril
  ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
";

$stmt = $pdo->prepare($query_create_assignment);
$stmt->execute([
    $pokladna_id,        // ← ID pokladny (z kroku 1)
    $uzivatel_id,
    $je_hlavni,
    $platne_od,
    $platne_do,
    $poznamka,
    $current_user_id
]);

$assignment_id = $pdo->lastInsertId();
```

### 📤 Response (beze změny)
```json
{
  "status": "ok",
  "data": {
    "message": "Přiřazení pokladny bylo vytvořeno",
    "assignment_id": 5,
    "pokladna_id": 1
  }
}
```

### 🎯 BUSINESS LOGIKA:

**Scénář A: Přiřadit existující pokladnu**
```
User chce přiřadit pokladnu 100 uživateli 102
→ Pokladna 100 již existuje v DB (má VPD=599, PPD=499)
→ Použít stávající pokladnu (pokladna_id=1)
→ Vytvořit pouze přiřazení
```

**Scénář B: Vytvořit novou pokladnu**
```
User chce vytvořit pokladnu 103
→ Pokladna 103 neexistuje
→ Vytvořit novou pokladnu s VPD/PPD z requestu
→ Vytvořit přiřazení
```

**Scénář C: Konflikt VPD/PPD (volitelné)**
```
User chce přiřadit pokladnu 100 s VPD=598
→ Ale v DB má pokladna 100 VPD=599
→ MOŽNOSTI:
  a) ERROR: "Pokladna 100 již existuje s jiným VPD"
  b) UPDATE: Upravit VPD v 25a_pokladny (ovlivní všechny)
  c) IGNORE: Použít stávající VPD=599
```

---

### ⚠️ Poznámka:
Pro novou strukturu použít **`/cashbox-assign-user`** místo tohoto endpointu.

---

## 9️⃣ ENDPOINT: `/cashbox-assignment-update` (DEPRECATED)

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "assignment_id": 1,
  "vpd_cislo": "598",
  "vpd_od_cislo": 75,
  "ppd_cislo": "498",
  "ppd_od_cislo": 50,
  "platne_od": "2025-11-08",
  "platne_do": null
}
```

### 🔄 ZMĚNA LOGIKY

#### ❌ PŘED (starý):
```php
// UPDATE přímo v 25a_pokladny_uzivatele
$query = "
  UPDATE 25a_pokladny_uzivatele
  SET 
    ciselna_rada_vpd = ?,
    vpd_od_cislo = ?,
    ciselna_rada_ppd = ?,
    ppd_od_cislo = ?,
    platne_od = ?,
    platne_do = ?
  WHERE id = ?
";
```

#### ✅ PO (nový - 2 možnosti):

### **MOŽNOST A: Upravit pokladnu (ovlivní všechny uživatele)**

Vhodné, když chceme změnit VPD/PPD pro **všechny uživatele** sdílené pokladny.

```php
// Krok 1: Načíst pokladna_id z přiřazení
$query_get = "
  SELECT pokladna_id FROM 25a_pokladny_uzivatele
  WHERE id = ?
";
$stmt = $pdo->prepare($query_get);
$stmt->execute([$assignment_id]);
$assignment = $stmt->fetch(PDO::FETCH_ASSOC);
$pokladna_id = $assignment['pokladna_id'];

// Krok 2: UPDATE pokladny (ovlivní VŠECHNY uživatele)
$query_update_pokladna = "
  UPDATE 25a_pokladny
  SET 
    ciselna_rada_vpd = ?,
    vpd_od_cislo = ?,
    ciselna_rada_ppd = ?,
    ppd_od_cislo = ?,
    aktualizovano = NOW(),
    aktualizoval = ?
  WHERE id = ?
";
$stmt = $pdo->prepare($query_update_pokladna);
$stmt->execute([
    $vpd_cislo,
    $vpd_od_cislo,
    $ppd_cislo,
    $ppd_od_cislo,
    $current_user_id,
    $pokladna_id
]);

// Krok 3: UPDATE přiřazení (pouze datumy)
$query_update_assignment = "
  UPDATE 25a_pokladny_uzivatele
  SET 
    platne_od = ?,
    platne_do = ?
  WHERE id = ?
";
$stmt = $pdo->prepare($query_update_assignment);
$stmt->execute([$platne_od, $platne_do, $assignment_id]);
```

### **MOŽNOST B: Vytvořit novou pokladnu (oddělení)**

Vhodné, když chceme změnit VPD/PPD **jen pro tohoto uživatele** (oddělit ho od sdílené pokladny).

```php
// Krok 1: Vytvořit novou pokladnu s novými VPD/PPD
// (stejný kód jako v /cashbox-assignment-create)

// Krok 2: UPDATE přiřazení na novou pokladnu
$query_update_assignment = "
  UPDATE 25a_pokladny_uzivatele
  SET 
    pokladna_id = ?,
    platne_od = ?,
    platne_do = ?
  WHERE id = ?
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "message": "Přiřazení bylo aktualizováno",
    "assignment_id": 1,
    "affected_users": 2
  }
}
```

### 🎯 DOPORUČENÍ:

**Pro MOŽNOST A** (upravit sdílenou pokladnu):
- Zobrazit varování v UI: "Tato změna ovlivní 3 uživatele"
- Vyžadovat potvrzení
- Logovat změnu do audit logu

**Pro MOŽNOST B** (oddělit uživatele):
- Vytvořit novou pokladnu s jiným číslem
- Nebo použít dialog: "Chcete oddělit tohoto uživatele?"

---

---

## 🔄 DODATEČNÉ HELPER ENDPOINTY

---

## 🔟 ENDPOINT: `/cashbox-available-users` 🆕

### 📝 Popis:
Seznam uživatelů, kteří **nejsou** přiřazeni k dané pokladně (pro dropdown).

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "pokladna_id": 1,
  "search": "Tereza"
}
```

### 💾 SQL
```php
$query = "
  SELECT 
    u.id,
    u.username,
    u.jmeno,
    u.prijmeni,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS cele_jmeno,
    u.email
  FROM 25_uzivatele u
  WHERE u.id NOT IN (
    SELECT uzivatel_id 
    FROM 25a_pokladny_uzivatele
    WHERE pokladna_id = ?
      AND (platne_do IS NULL OR platne_do >= CURDATE())
  )
  AND u.aktivni = 1
  AND (
    u.jmeno LIKE ? OR 
    u.prijmeni LIKE ? OR 
    u.username LIKE ?
  )
  ORDER BY u.prijmeni, u.jmeno
  LIMIT 20
";
```

### 📤 Response
```json
{
  "status": "ok",
  "data": {
    "uzivatele": [
      {
        "id": "105",
        "username": "bezouskova_thp",
        "cele_jmeno": "Tereza Bezoušková THP",
        "email": "tereza.b@example.cz"
      }
    ]
  }
}
```---

## 5️⃣ MIGRACE EXISTUJÍCÍCH DAT (pokud jsou)

Pokud v DB již existují data v **staré struktuře** `25a_pokladny_uzivatele`, před aplikací refactoringu:

### 📦 Skript pro migraci:

```sql
-- 1. Zálohovat
CREATE TABLE 25a_pokladny_uzivatele_backup AS 
SELECT * FROM 25a_pokladny_uzivatele;

-- 2. Extrahovat unikátní pokladny
INSERT INTO 25a_pokladny (
  cislo_pokladny, kod_pracoviste, nazev_pracoviste,
  ciselna_rada_vpd, vpd_od_cislo, ciselna_rada_ppd, ppd_od_cislo,
  aktivni, vytvoreno, vytvoril
)
SELECT DISTINCT
  cislo_pokladny,
  kod_pracoviste,
  nazev_pracoviste,
  ciselna_rada_vpd,
  COALESCE(vpd_od_cislo, 1),
  ciselna_rada_ppd,
  COALESCE(ppd_od_cislo, 1),
  1,
  MIN(vytvoreno),
  MIN(vytvoril)
FROM 25a_pokladny_uzivatele_backup
GROUP BY cislo_pokladny;

-- 3. Přemigrovat přiřazení
INSERT INTO 25a_pokladny_uzivatele (
  pokladna_id, uzivatel_id, je_hlavni, platne_od, platne_do,
  poznamka, vytvoreno, vytvoril
)
SELECT 
  p.id AS pokladna_id,
  old.uzivatel_id,
  old.je_hlavni,
  old.platne_od,
  old.platne_do,
  old.poznamka,
  old.vytvoreno,
  old.vytvoril
FROM 25a_pokladny_uzivatele_backup old
JOIN 25a_pokladny p ON p.cislo_pokladny = old.cislo_pokladny;
```

---

## 🔍 TESTOVÁNÍ

### Test 1: Načtení přiřazení
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbox-assignments-list \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"xxx","uzivatel_id":1}'
```

**Očekávaný výsledek:** Pole `assignments` s daty z JOIN na `25a_pokladny`

### Test 2: Vytvoření sdíleného přiřazení
```bash
# User 1 má pokladnu 100
curl -X POST .../cashbox-assignment-create -d '{...cislo_pokladny: 100...}'

# User 2 TAKÉ pokladna 100 (sdílená)
curl -X POST .../cashbox-assignment-create -d '{...cislo_pokladny: 100...}'
```

**Očekávaný výsledek:** 
- 1x záznam v `25a_pokladny` (id=1, cislo=100)
- 2x záznamy v `25a_pokladny_uzivatele` (oba s pokladna_id=1)

### Test 3: Změna VPD sdílené pokladny
```bash
curl -X POST .../cashbox-assignment-update \
  -d '{"assignment_id":1,"vpd_cislo":"598"}'
```

**Očekávaný výsledek:**
- UPDATE v `25a_pokladny` (1 řádek)
- Oba uživatelé mají nové VPD=598

---

## ✅ CHECKLIST PRO BACKEND TÝM

### 📦 KROK 1: Databáze
- [ ] 1.1. Zálohovat existující data (`25a_pokladny_uzivatele_backup`)
- [ ] 1.2. Aplikovat SQL refactoring (`refactor_cashbook_normalized_structure.sql`)
- [ ] 1.3. Ověřit strukturu tabulek (SHOW TABLES, DESCRIBE)
- [ ] 1.4. Ověřit testovací data (SELECT z nových tabulek)

### 🆕 KROK 2: Nové endpointy (priorita)
- [ ] 2.1. **`/cashbox-list`** - Seznam pokladen + uživatelé (hlavní endpoint)
- [ ] 2.2. **`/cashbox-create`** - Vytvořit pokladnu
- [ ] 2.3. **`/cashbox-update`** - Upravit pokladnu (s varováním)
- [ ] 2.4. **`/cashbox-assign-user`** - Přiřadit uživatele
- [ ] 2.5. **`/cashbox-unassign-user`** - Odebrat uživatele
- [ ] 2.6. **`/cashbox-available-users`** - Dropdown dostupných uživatelů
- [ ] 2.7. **`/cashbox-delete`** - Smazat pokladnu (optional)

### 🔄 KROK 3: Staré endpointy (kompatibilita)
- [ ] 3.1. Upravit `/cashbox-assignments-list` (přidat JOIN na `25a_pokladny`)
- [ ] 3.2. Označit `/cashbox-assignment-create` jako DEPRECATED
- [ ] 3.3. Označit `/cashbox-assignment-update` jako DEPRECATED

### 🧪 KROK 4: Testování
- [ ] 4.1. Test: Načíst seznam pokladen s uživateli
- [ ] 4.2. Test: Vytvořit novou pokladnu
- [ ] 4.3. Test: Přiřadit 2 uživatele ke stejné pokladně (sdílená)
- [ ] 4.4. Test: Změnit VPD pokladny → ověřit že se projeví u obou uživatelů
- [ ] 4.5. Test: Odebrat uživatele z pokladny
- [ ] 4.6. Test: Smazat pokladnu (s/bez přiřazení)
- [ ] 4.7. Test: Response kompatibilita se starým frontendem

### 📋 KROK 5: Dokumentace a komunikace
- [ ] 5.1. Informovat frontend tým o nových endpointech
- [ ] 5.2. Připravit příklady curl requestů pro testování
- [ ] 5.3. Zdokumentovat změny v API dokumentaci
- [ ] 5.4. Changelog: Co se změnilo, co je deprecated

---

## 🎯 SHRNUTÍ PRO FRONTEND

### Co se mění v UI:

**❌ STARÉ (nyní):**
```
Tabulka: Řádek = Uživatel + parametry jeho pokladny
│ Uživatel │ Číslo pokladny │ VPD │ PPD │ Akce │
│ Admin    │ 100            │ 599 │ 499 │ Edit │
│ Tereza   │ 100            │ 599 │ 499 │ Edit │ ← duplicita!
```

**✅ NOVÉ (cíl):**
```
Tabulka: Řádek = Pokladna + seznam uživatelů
│ Číslo │ Název          │ VPD │ PPD │ Uživatelů │ Akce         │
│ 100   │ Sdílená IT     │ 599 │ 499 │ 2         │ Edit Delete  │
  └─ Expandable:
     • Admin (hlavní)
     • Tereza Bezoušková [Odebrat]
     • [+ Přidat uživatele]
```

### Výhody:
- ✅ Žádná duplicita VPD/PPD dat
- ✅ Jasně vidět sdílené pokladny
- ✅ Změna VPD → automaticky u všech uživatelů
- ✅ Přehlednější správa přiřazení

---

**Připraveno pro backend implementaci!** 🚀  
**Datum specifikace:** 8. listopadu 2025  
**Vytvořil:** Robert Holovský + GitHub Copilot
