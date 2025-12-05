# 🔴 KRITICKÝ PROBLÉM: Odebrání uživatele z pokladny nefunguje

## Datum: 8. listopadu 2025
## Priority: **CRITICAL** - Blokující issue

---

## ⚠️ UPŘESNĚNÍ LOGIKY (8.11.2025 - 14:00)

Existují **DVĚ různé operace**:

### 1. 💾 Uložení dialogu (BATCH SYNC)
**Kdy:** Uživatel klikne na "Uložit změny" v edit dialogu  
**Operace:** Smazat VŠECHNY uživatele pokladny a znovu přidat jen ty ze seznamu  
**Endpoint:** `/cashbox-sync-users`  
**Payload:**
```json
{
  "token": "xxx",
  "username": "user@example.com",
  "pokladna_id": 5,
  "uzivatele": [
    {
      "uzivatel_id": 10,
      "je_hlavni": 1,
      "platne_od": "2025-11-08",
      "platne_do": null,
      "poznamka": ""
    },
    {
      "uzivatel_id": 15,
      "je_hlavni": 0,
      "platne_od": "2025-11-08",
      "platne_do": null,
      "poznamka": ""
    }
  ]
}
```

**BE musí:**
```sql
-- 1. Smazat všechny přiřazení k pokladně
DELETE FROM 25a_pokladny_uzivatele WHERE pokladna_id = 5;

-- 2. Vložit nová přiřazení z payloadu
INSERT INTO 25a_pokladny_uzivatele 
(pokladna_id, uzivatel_id, je_hlavni, platne_od, platne_do, poznamka)
VALUES 
(5, 10, 1, '2025-11-08', NULL, ''),
(5, 15, 0, '2025-11-08', NULL, '');

-- DŮLEŽITÉ: platne_do = NULL znamená "platné NAVŽDY"
-- Frontend VŽDY posílá platne_od (minimálně dnešní datum)
-- platne_do může být NULL nebo konkrétní datum ukončení
```

### 2. 🗑️ Přímé odebrání v podřádku
**Kdy:** Uživatel klikne na červené tlačítko "Odebrat" v expandable řádku  
**Operace:** Smazat konkrétního uživatele podle prirazeni_id  
**Endpoint:** `/cashbox-unassign-user`  
**Payload:**
```json
{
  "token": "xxx",
  "username": "user@example.com",
  "prirazeni_id": 123,
  "platne_do": "2025-11-08"
}
```

**BE musí:**
```sql
-- Soft delete - nastavit platne_do
UPDATE 25a_pokladny_uzivatele 
SET platne_do = '2025-11-08' 
WHERE id = 123;

-- NEBO hard delete
DELETE FROM 25a_pokladny_uzivatele WHERE id = 123;
```

---

## 📋 Původní popis problému

Frontend volá API endpoint `/cashbox-unassign-user` pro odebrání uživatele z pokladny, ale operace se NEprovádí v databázi.

### Co se děje:
1. ✅ Frontend volá správné API
2. ✅ Payload je správně sestavený
3. ✅ API vrací status 200
4. ❌ **Data v DB se NEMĚNÍ** - uživatel zůstává přiřazený

---

## 🌐 API Endpoint

```
POST https://eeo.zachranka.cz/api.eeo/cashbox-unassign-user
```

---

## 📦 Payload který posíláme

```json
{
  "token": "xxx",
  "username": "user@example.com",
  "prirazeni_id": 123,
  "platne_do": "2025-11-08"
}
```

### Parametry:
- **token** (string) - Auth token ✅
- **username** (string) - Username z auth ✅
- **prirazeni_id** (number) - ID z tabulky `25a_pokladny_uzivatele.id` ✅
- **platne_do** (string) - Datum ukončení platnosti ve formátu YYYY-MM-DD ✅

---

## 💾 Databázová struktura

### Tabulka: `25a_pokladny_uzivatele`

Očekávaná operace:
```sql
UPDATE 25a_pokladny_uzivatele
SET platne_do = '2025-11-08'
WHERE id = 123;
```

NEBO (pokud chcete hard delete):
```sql
DELETE FROM 25a_pokladny_uzivatele
WHERE id = 123;
```

### Sloupce v tabulce:
- `id` - Primary key (tento dostáváte jako `prirazeni_id`)
- `pokladna_id` - Foreign key na pokladnu
- `uzivatel_id` - Foreign key na uživatele
- `je_hlavni` - 1 = hlavní, 0 = zástupce
- `platne_od` - Datum platnosti od
- `platne_do` - Datum platnosti do (NULL = aktivní)
- `poznamka` - Poznámka

---

## 🔍 Debug výstup

Po kliknutí na tlačítko "Odebrat" v konzoli uvidíte:

```
═══════════════════════════════════════════════════════
🗑️  ODEBRÁNÍ UŽIVATELE Z POKLADNY - START
═══════════════════════════════════════════════════════
📋 Assignment ID: 123
👤 Uživatel: Jan Novák
🏦 Pokladna ID: 5
🏦 Pokladna číslo: PK-001

═══════════════════════════════════════════════════════
📡 API: unassignUserFromCashbox()
═══════════════════════════════════════════════════════
🌐 Endpoint: https://eeo.zachranka.cz/api.eeo/cashbox-unassign-user
📦 Payload:
{
  "token": "xxx",
  "username": "user@example.com",
  "prirazeni_id": 123,
  "platne_do": "2025-11-08"
}
```

---

## ❌ Co je špatně

### Možné příčiny:

1. **Backend endpoint není implementován**
   - Endpoint vrací 200 OK ale nedělá nic
   - SQL query se neprovádí

2. **Špatný název parametru**
   - Backend očekává jiný název než `prirazeni_id`
   - Možná očekává `id`, `assignment_id`, nebo `uzivatel_pokladna_id`?

3. **Špatná SQL podmínka**
   - WHERE klauzule používá špatný sloupec
   - Možná se kontroluje `pokladna_id + uzivatel_id` místo `id`?

4. **Chybí kontrola oprávnění**
   - Backend může vracet úspěch i když uživatel nemá práva
   - SQL query se pak neprovede kvůli chybějícím právům

5. **Transaction rollback**
   - UPDATE se provede ale pak se rollbackne
   - Možná kvůli chybě v triggeru nebo foreign key constraint

---

## ✅ Co potřebujeme od BE

### 1. Zkontrolovat endpoint `/cashbox-unassign-user`

```php
// Očekávaný PHP kód (příklad)
case 'cashbox-unassign-user':
    $prirazeni_id = $_POST['prirazeni_id'] ?? null;
    $platne_do = $_POST['platne_do'] ?? date('Y-m-d');
    
    if (!$prirazeni_id) {
        echo json_encode(['status' => 'error', 'message' => 'Missing prirazeni_id']);
        exit;
    }
    
    // SQL UPDATE
    $sql = "UPDATE 25a_pokladny_uzivatele 
            SET platne_do = ? 
            WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$platne_do, $prirazeni_id]);
    
    echo json_encode([
        'status' => 'ok',
        'message' => 'Uživatel úspěšně odebrán',
        'affected_rows' => $stmt->rowCount()
    ]);
    break;
```

### 2. Přidat logging

```php
error_log("UNASSIGN USER: prirazeni_id=$prirazeni_id, platne_do=$platne_do");
error_log("SQL: $sql");
error_log("Affected rows: " . $stmt->rowCount());
```

### 3. Vrátit affected_rows

```json
{
  "status": "ok",
  "message": "Uživatel úspěšně odebrán",
  "affected_rows": 1
}
```

Pokud `affected_rows = 0`, znamená to, že WHERE podmínka nenašla žádný záznam.

---

## 🧪 Testování

### Manuální test v DB:

```sql
-- 1. Najít existující přiřazení
SELECT id, pokladna_id, uzivatel_id, je_hlavni, platne_od, platne_do
FROM 25a_pokladny_uzivatele
WHERE platne_do IS NULL
LIMIT 1;

-- Poznamenat si ID (např. 123)

-- 2. Zkusit UPDATE ručně
UPDATE 25a_pokladny_uzivatele
SET platne_do = '2025-11-08'
WHERE id = 123;

-- 3. Zkontrolovat
SELECT * FROM 25a_pokladny_uzivatele WHERE id = 123;
-- Mělo by mít platne_do = '2025-11-08'

-- 4. Vrátit zpět pro další test
UPDATE 25a_pokladny_uzivatele
SET platne_do = NULL
WHERE id = 123;
```

### Frontend test:
1. Otevřít konzoli prohlížeče (F12)
2. Otevřít Číselníky → Pokladní knihy
3. Rozkliknout pokladnu
4. Kliknout na červené tlačítko "Odebrat" u uživatele
5. Potvrdit dialog
6. Sledovat debug výstup v konzoli
7. Zkontrolovat DB - uživatel by měl mít `platne_do` nastaveno

---

## 📞 Kontakt

Po opravě prosím dejte vědět a pošlete:
1. Affected rows z databáze
2. Screenshot DB před a po operaci
3. BE log výstup

---

## 🆕 NOVÝ ENDPOINT: /cashbox-sync-users

### Účel
Batch synchronizace uživatelů při uložení dialogu. Smaže všechny a přidá nové.

### Request
```
POST https://eeo.zachranka.cz/api.eeo/cashbox-sync-users
```

### Payload
```json
{
  "token": "xxx",
  "username": "user@example.com",
  "pokladna_id": 5,
  "uzivatele": [
    {
      "uzivatel_id": 10,
      "je_hlavni": 1,
      "platne_od": "2025-11-08",
      "platne_do": null,
      "poznamka": ""
    }
  ]
}
```

### PHP implementace (příklad)
```php
case 'cashbox-sync-users':
    $pokladna_id = $_POST['pokladna_id'] ?? null;
    $uzivatele = $_POST['uzivatele'] ?? [];
    
    if (!$pokladna_id) {
        echo json_encode(['status' => 'error', 'message' => 'Missing pokladna_id']);
        exit;
    }
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // 1. Smazat všechny stávající přiřazení
        $sql_delete = "DELETE FROM 25a_pokladny_uzivatele WHERE pokladna_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        $stmt_delete->execute([$pokladna_id]);
        $deleted = $stmt_delete->rowCount();
        
        error_log("SYNC USERS: Deleted $deleted users from cashbox $pokladna_id");
        
        // 2. Vložit nová přiřazení
        $inserted = 0;
        if (!empty($uzivatele)) {
            $sql_insert = "INSERT INTO 25a_pokladny_uzivatele 
                          (pokladna_id, uzivatel_id, je_hlavni, platne_od, platne_do, poznamka)
                          VALUES (?, ?, ?, ?, ?, ?)";
            $stmt_insert = $conn->prepare($sql_insert);
            
            foreach ($uzivatele as $u) {
                $stmt_insert->execute([
                    $pokladna_id,
                    $u['uzivatel_id'],
                    $u['je_hlavni'] ?? 1,
                    $u['platne_od'] ?? date('Y-m-d'),
                    $u['platne_do'] ?? null,
                    $u['poznamka'] ?? ''
                ]);
                $inserted++;
            }
        }
        
        $conn->commit();
        
        error_log("SYNC USERS: Inserted $inserted new users to cashbox $pokladna_id");
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Uživatelé synchronizováni',
            'deleted' => $deleted,
            'inserted' => $inserted
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("SYNC USERS ERROR: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při synchronizaci: ' . $e->getMessage()
        ]);
    }
    break;
```

### Response
```json
{
  "status": "ok",
  "message": "Uživatelé synchronizováni",
  "deleted": 3,
  "inserted": 2
}
```

---

## ✅ EDITACE PLATNOSTI UŽIVATELE (FE implementováno 8.11.2025 - 14:30)

### Funkce v EditCashboxDialog:
1. **Tlačítko "Platnost"** u každého přiřazeného uživatele
2. **Edit mód** - zobrazí date inputy pro `platne_od` a `platne_do`
3. **Validace**:
   - `platne_od` je POVINNÉ (defaultně dneš) 
   - `platne_do` je VOLITELNÉ:
     - **Nevyplněno (prázdné)** = NULL v DB = **platné NAVŽDY** ✅
     - **Vyplněno datum** = konkrétní datum ukončení
4. **Ukládání**: Změny se aplikují lokálně, odešlou se při Save dialogu

### Logika platnosti:
```
platne_od: "2025-11-08"  +  platne_do: NULL       → Platné NAVŽDY ✅
platne_od: "2025-11-08"  +  platne_do: "2025-12-31" → Platné do 31.12.2025
```

### BE zpracování:
- V `/cashbox-sync-users` přijímá `platne_od` a `platne_do` 
- **platne_do = NULL nebo prázdný string** → uložit jako NULL v DB
- **platne_do = "YYYY-MM-DD"** → uložit jako date v DB
- Frontend garantuje že `platne_od` je vždy vyplněno

### Zobrazení:
```
Jan Novák (Hlavní)
jan.novak • Platné od: 2025-11-08 • navždy
```
nebo
```
Petr Svoboda (Zástupce)  
petr.svoboda • Platné od: 2025-11-01 • do: 2025-12-31
```

---

## 🚨 URGENTNÍ

Toto blokuje celý modul správy pokladen. Bez funkčního odebrání uživatelů nelze systém nasadit.

**Potřebujeme implementovat OBA endpointy:**
1. `/cashbox-sync-users` - pro batch sync při uložení dialogu
   - ✅ Přijímá `platne_od` (VŽDY vyplněno)
   - ✅ Přijímá `platne_do` (NULL = navždy, date = do konkrétního data)
2. `/cashbox-unassign-user` - pro přímé odebrání v podřádku

**Deadline: ASAP**
