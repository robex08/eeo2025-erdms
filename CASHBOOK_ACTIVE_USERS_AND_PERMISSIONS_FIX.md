# 🔧 Oprava: Nabízení pouze aktivních uživatelů + oprávnění k vytváření knih

**Datum:** 2026-01-04  
**Autor:** Development Team

---

## 🎯 Problém

### 1. **Nabízeli se neaktivní uživatelé**
Při přiřazování uživatelů k pokladně se nabízeli všichni uživatelé, včetně **neaktivních** (aktivni=0).

### 2. **Chybějící kontrola přiřazení při vytváření knihy**
Uživatel, který je **hlavním správcem** pokladny, dostával chybu:
```
Nemáte oprávnění k této operaci
```

**Důvod:** Backend kontroloval pouze obecná oprávnění (`CASH_BOOK_CREATE`, `CASH_BOOK_MANAGE`), ale **nekontroloval přiřazení k pokladně**.

---

## ✅ Řešení

### 1. Filtrování aktivních uživatelů

#### Frontend změny

**Soubory:**
- `apps/eeo-v2/client/src/services/api2auth.js`
- `apps/eeo-v2/client/src/components/cashbook/CreateCashboxDialog.js`
- `apps/eeo-v2/client/src/components/cashbook/EditCashboxDialog.js`
- `apps/eeo-v2/client/src/components/cashbook/AddAssignmentDialog.js`

**api2auth.js** - Přidán parametr `show_inactive`:
```javascript
export async function fetchAllUsers({ token, username, _cacheBust, show_inactive }) {
  const payload = { token, username };

  // Filter by active/inactive users (defaults to active only)
  if (show_inactive !== undefined) {
    payload.aktivni = show_inactive ? 0 : 1;
  } else {
    payload.aktivni = 1; // Default: pouze aktivní uživatelé
  }

  const response = await api2.post('users/list', payload);
  // ...
}
```

**CreateCashboxDialog.js** - Načítání pouze aktivních:
```javascript
const [usersResult, usekyResult] = await Promise.all([
  fetchAllUsers({
    token: token,
    username: user.username,
    show_inactive: false // Pouze aktivní uživatelé
  }),
  // ...
]);
```

**EditCashboxDialog.js** - Stejná úprava:
```javascript
const result = await fetchAllUsers({
  token: token,
  username: user.username,
  show_inactive: false // Pouze aktivní uživatelé
});
```

**AddAssignmentDialog.js** - Stejná úprava:
```javascript
const usersData = await fetchAllUsers({
  token,
  username: user.username,
  show_inactive: false // Pouze aktivní uživatelé
});
```

#### Backend (již fungoval správně)

Backend endpoint `/users/list` již podporoval parametr `aktivni`:

```php
// v2025.03_25/lib/handlers.php - handle_users_list()

if ($has_aktivni_filter) {
    $aktivni_value = (int)$input['aktivni'];
    $sql = "
        SELECT ...
        FROM 25_uzivatele u
        WHERE u.id > 0 AND u.aktivni = :aktivni
        ...
    ";
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':aktivni', $aktivni_value, PDO::PARAM_INT);
    $stmt->execute();
}
```

---

### 2. Kontrola přiřazení k pokladně při vytváření knihy

#### Backend změny

**Soubor:** `v2025.03_25/middleware/CashbookPermissions.php`

**PŘED:**
```php
public function canCreateBook() {
    if ($this->isSuperAdmin()) return true;
    if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
    if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
    return false;
}
```

**PO:**
```php
/**
 * Kontrola, zda může vytvářet nové knihy
 * Pro uživatele bez MANAGE/CREATE práv kontroluje přiřazení k pokladně
 * 
 * @param int|null $pokladnaId ID pokladny (volitelné, pro kontrolu přiřazení)
 * @return bool True pokud má oprávnění
 */
public function canCreateBook($pokladnaId = null) {
    if ($this->isSuperAdmin()) return true;
    if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
    if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
    
    // Pokud nemá obecná práva, zkontrolovat přiřazení k pokladně
    if ($pokladnaId !== null) {
        return $this->isOwnCashbox($pokladnaId);
    }
    
    return false;
}
```

**Využívá existující metodu:**
```php
private function isOwnCashbox($pokladnaId) {
    // Kontroluje aktivní přiřazení = platne_do je NULL nebo >= dnes
    $stmt = $this->db->prepare("
        SELECT COUNT(*) as count
        FROM 25a_pokladny_uzivatele
        WHERE pokladna_id = ? 
          AND uzivatel_id = ? 
          AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute(array($pokladnaId, $this->user['id']));
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result['count'] > 0;
}
```

---

**Soubor:** `v2025.03_25/lib/cashbookHandlers.php`

**handle_cashbook_create_post()** - Pořadí změněno:

**PŘED:**
```php
// 1. Kontrola oprávnění
$permissions = new CashbookPermissions($userData, $db);
if (!$permissions->canCreateBook()) {
    return api_error(403, 'Nedostatečná oprávnění');
}

// 2. Validace dat (získání pokladna_id)
$validator = new CashbookValidator();
$data = $validator->validateCreate($input);
```

**PO:**
```php
// 1. Validace dat nejdříve (potřebujeme pokladna_id)
$validator = new CashbookValidator();
$data = $validator->validateCreate($input);

// 2. Kontrola oprávnění - nyní s pokladna_id
$permissions = new CashbookPermissions($userData, $db);
if (!$permissions->canCreateBook($data['pokladna_id'])) {
    return api_error(403, 'Nedostatečná oprávnění. Musíte mít CASH_BOOK_CREATE nebo být přiřazeni k pokladně.');
}
```

---

## 📊 Logika oprávnění

### Kdo může vytvořit pokladní knihu?

1. **Super admin** (`super_admin = 1`) → ✅ vždy
2. **Uživatel s `CASH_BOOK_MANAGE`** → ✅ pro všechny pokladny
3. **Uživatel s `CASH_BOOK_CREATE`** → ✅ pro všechny pokladny
4. **Uživatel PŘIŘAZENÝ k pokladně** (`25a_pokladny_uzivatele`) → ✅ pro svou pokladnu
   - Je hlavním správcem (`je_hlavni = 1`) nebo zástupcem
   - Přiřazení je aktivní: `platne_do IS NULL` nebo `>= CURDATE()`

### Příklad:

```
Uživatel: Jan Novák (ID=45)
Oprávnění: žádná speciální
Přiřazení:
  - pokladna_id=10, je_hlavni=1, platne_od='2025-01-01', platne_do=NULL

✅ Může vytvořit knihu pro pokladnu 10
❌ Nemůže vytvořit knihu pro pokladnu 11
```

---

## 🧪 Testování

### Test 1: Nabízení pouze aktivních uživatelů

1. Deaktivovat uživatele v administraci (`aktivni = 0`)
2. Otevřít dialog "Nová pokladna"
3. Kliknout na dropdown "Vyberte uživatele"

**✅ Očekávaný výsledek:**
- Deaktivovaný uživatel se v seznamu **neobjeví**

---

### Test 2: Vytvoření knihy hlavním správcem

**Příprava:**
```sql
-- Přiřadit uživatele k pokladně jako hlavního
INSERT INTO 25a_pokladny_uzivatele (uzivatel_id, pokladna_id, je_hlavni, platne_od)
VALUES (45, 10, 1, '2025-01-01');

-- Ověřit, že uživatel NEMÁ CASH_BOOK_CREATE oprávnění
SELECT * FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = 45 AND p.kod_prava = 'CASH_BOOK_CREATE';
-- Mělo by vrátit 0 řádků
```

**Test:**
1. Přihlásit se jako uživatel ID=45 (Jan Novák)
2. Otevřít cashbook stránku
3. Vybrat pokladnu ID=10
4. Kliknout "Vytvořit novou knihu"

**✅ Očekávaný výsledek:**
- Kniha se vytvoří úspěšně
- **Bez chyby** "Nemáte oprávnění"

---

### Test 3: Pokus o vytvoření knihy pro cizí pokladnu

**Test:**
1. Přihlásit se jako uživatel ID=45
2. Pokusit se vytvořit knihu pro pokladnu ID=11 (kde NENÍ přiřazen)

**✅ Očekávaný výsledek:**
- Chyba 403: "Nedostatečná oprávnění"

---

## 📝 SQL kontrola přiřazení

```sql
-- Ověřit přiřazení uživatele k pokladně
SELECT 
    u.id as uzivatel_id,
    CONCAT(u.jmeno, ' ', u.prijmeni) as uzivatel,
    p.cislo_pokladny,
    pu.je_hlavni,
    pu.platne_od,
    pu.platne_do,
    CASE 
        WHEN pu.platne_do IS NULL OR pu.platne_do >= CURDATE() THEN 'AKTIVNÍ'
        ELSE 'NEAKTIVNÍ'
    END as status
FROM 25_uzivatele u
JOIN 25a_pokladny_uzivatele pu ON pu.uzivatel_id = u.id
JOIN 25a_pokladny p ON p.id = pu.pokladna_id
WHERE u.id = 45
ORDER BY p.cislo_pokladny;
```

---

## 🔄 Kompatibilita

### Zpětná kompatibilita

✅ **Ano** - změny jsou zpětně kompatibilní:
- Frontend: `show_inactive` je volitelný parametr, výchozí hodnota = aktivní pouze
- Backend: `canCreateBook($pokladnaId)` má volitelný parametr, pokud není předán, kontroluje pouze obecná práva

### Vliv na existující kód

- ❌ **Žádný breaking change** - funkce `canCreateBook()` funguje i bez parametru
- ⚠️ **Doporučení:** V budoucnu všude předávat `$pokladnaId` pro správnou kontrolu

---

## 📚 Související soubory

### Frontend
- `apps/eeo-v2/client/src/services/api2auth.js` - přidán parametr `show_inactive`
- `apps/eeo-v2/client/src/components/cashbook/CreateCashboxDialog.js`
- `apps/eeo-v2/client/src/components/cashbook/EditCashboxDialog.js`
- `apps/eeo-v2/client/src/components/cashbook/AddAssignmentDialog.js`

### Backend
- `v2025.03_25/middleware/CashbookPermissions.php` - `canCreateBook($pokladnaId)`
- `v2025.03_25/lib/cashbookHandlers.php` - `handle_cashbook_create_post()`
- `v2025.03_25/lib/handlers.php` - `handle_users_list()` (již fungoval správně)

---

## 🎓 Klíčové body

1. **Frontend nyní výslovně požaduje pouze aktivní uživatele** pomocí `show_inactive: false`
2. **Backend kontroluje přiřazení k pokladně** pro uživatele bez speciálních oprávnění
3. **Hlavní správce pokladny může vytvořit knihu** i bez obecného oprávnění `CASH_BOOK_CREATE`
4. **Deaktivovaní uživatelé se nenabízejí** při přiřazování k pokladně

---

**Konec dokumentu**
