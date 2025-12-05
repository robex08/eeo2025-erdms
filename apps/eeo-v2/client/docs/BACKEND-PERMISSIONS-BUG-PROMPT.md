# 🚨 BACKEND BUG: Oprávnění se nečtou z přímých přiřazení

**Datum:** 9. listopadu 2025  
**Priorita:** 🔴 KRITICKÁ  
**Typ:** Bug fix  
**Status:** ⏳ Čeká na opravu

---

## 📋 SHRNUTÍ PROBLÉMU

**Co se děje:**
- Uživatel má přiřazená oprávnění PŘÍMO (`25_uzivatel_prava`)
- UI v administraci ukazuje "Přímá práva (9/10)" s checknutými oprávněními
- Backend ale vrací **403 Forbidden** při volání `/api.eeo/cashbook-list`
- Frontend hlásí: `"Nemáte oprávnění k této operaci"`

**Proč se to děje:**
Backend při načítání user objektu (pravděpodobně v autentizačním middleware) **NEČTE** přímá oprávnění uživatele, ale jen oprávnění přes role.

**Co by mělo fungovat:**
Systém musí kontrolovat oprávnění ze **DVOU ZDROJŮ**:
1. ✅ **Role-based permissions** (přes tabulky `25_uzivatel_role` → `25_role_prava` → `25_prava`)
2. ❌ **Direct permissions** (přes tabulku `25_uzivatel_prava` → `25_prava`) - **TOHLE CHYBÍ!**

---

## 🗄️ DATABÁZOVÁ STRUKTURA

### **JEDNA tabulka pro OBĚ varianty: `25_role_prava`**

```
25_role_prava (vazební tabulka)
├── user_id (INT)
│   ├── -1 → oprávnění přes ROLI (klasické)
│   └── >0 → oprávnění PŘÍMO pro uživatele (direct)
├── role_id → 25_role.id
├── pravo_id → 25_prava.id
└── aktivni (BOOL)

25_prava (definice oprávnění)
├── id
├── kod_prava (např. 'CASH_BOOK_READ_OWN')
└── popis
```

**Jak to funguje:**
- **user_id = -1**: Oprávnění platí pro celou roli (`role_id`)
- **user_id > 0**: Oprávnění platí PŘÍMO pro konkrétního uživatele (přímá práva)

---

## 🔍 AKTUÁLNÍ STAV V DATABÁZI

### **Uživatel má přiřazená oprávnění:**

```sql
-- Dotaz pro ověření PŘÍMÝCH oprávnění:
SELECT 
    u.id AS uzivatel_id,
    u.jmeno,
    u.prijmeni,
    p.kod_prava,
    p.popis,
    'DIRECT' AS zdroj
FROM 25_role_prava rp
JOIN zamestnanci u ON rp.user_id = u.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = <USER_ID>  -- user_id > 0 (ne -1)
  AND rp.user_id != -1
  AND p.kod_prava LIKE 'CASH_BOOK_%'
  AND rp.aktivni = 1;

-- Dotaz pro ověření oprávnění PŘES ROLE:
SELECT 
    u.id AS uzivatel_id,
    u.jmeno,
    u.prijmeni,
    r.nazev_role,
    p.kod_prava,
    p.popis,
    'ROLE' AS zdroj
FROM 25_uzivatel_role ur
JOIN zamestnanci u ON ur.uzivatel_id = u.id
JOIN 25_role r ON ur.role_id = r.id
JOIN 25_role_prava rp ON r.id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = -1  -- jen oprávnění přes role
  AND ur.uzivatel_id = <USER_ID>
  AND p.kod_prava LIKE 'CASH_BOOK_%'
  AND rp.aktivni = 1;
```

**Očekávaný výsledek:**
```
uzivatel_id | jmeno | prijmeni | kod_prava              | popis                              | zdroj
------------|-------|----------|------------------------|------------------------------------|-------
52          | Jan   | Novák    | CASH_BOOK_CREATE       | Může vytvářet nové položky         | DIRECT
52          | Jan   | Novák    | CASH_BOOK_EDIT_OWN     | Může editovat své položky          | DIRECT
52          | Jan   | Novák    | CASH_BOOK_EXPORT_OWN   | Může exportovat své knihy          | DIRECT
52          | Jan   | Novák    | CASH_BOOK_READ_OWN     | Může číst své knihy                | DIRECT
```

---

## 🐛 CO JE POTŘEBA OPRAVIT

### **1. Místo, kde se načítá user objekt**

**Soubor:** Pravděpodobně `/api.eeo/includes/auth.php` nebo `/api.eeo/middleware/authenticate.php`

**Současný kód (CHYBNÝ):**
```php
// ❌ TOHLE JE ŠPATNĚ - načítá jen oprávnění z rolí (kde user_id = -1)
function loadUserPermissions($userId, $db) {
    $query = "
        SELECT DISTINCT p.*
        FROM 25_prava p
        JOIN 25_role_prava rp ON p.id = rp.pravo_id
        JOIN 25_uzivatel_role ur ON rp.role_id = ur.role_id
        WHERE ur.uzivatel_id = ?
          AND rp.user_id = -1  -- Jen oprávnění přes role!
          AND rp.aktivni = 1
          AND p.aktivni = 1
    ";
    
    $stmt = $db->prepare($query);
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $permissions = [];
    while ($row = $result->fetch_assoc()) {
        $permissions[] = $row;
    }
    
    return $permissions;
}
```

**OPRAVENÝ kód (SPRÁVNĚ):**
```php
// ✅ TOHLE JE SPRÁVNĚ - načítá oprávnění z rolí I přímo
function loadUserPermissions($userId, $db) {
    $query = "
        -- Oprávnění z ROLÍ (user_id = -1)
        SELECT DISTINCT 
            p.id,
            p.kod_prava,
            p.popis,
            p.aktivni,
            'ROLE' AS permission_source
        FROM 25_prava p
        JOIN 25_role_prava rp ON p.id = rp.pravo_id
        JOIN 25_uzivatel_role ur ON rp.role_id = ur.role_id
        WHERE ur.uzivatel_id = ?
          AND rp.user_id = -1
          AND rp.aktivni = 1
          AND p.aktivni = 1
        
        UNION
        
        -- Oprávnění PŘÍMÁ (user_id > 0)
        SELECT DISTINCT
            p.id,
            p.kod_prava,
            p.popis,
            p.aktivni,
            'DIRECT' AS permission_source
        FROM 25_prava p
        JOIN 25_role_prava rp ON p.id = rp.pravo_id
        WHERE rp.user_id = ?
          AND rp.user_id != -1
          AND rp.aktivni = 1
          AND p.aktivni = 1
        
        ORDER BY kod_prava ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->bind_param('ii', $userId, $userId); // Dvakrát stejný parameter
    $stmt->execute();
    $result = $stmt->get_result();
    
    $permissions = [];
    while ($row = $result->fetch_assoc()) {
        $permissions[] = [
            'id' => $row['id'],
            'kod_prava' => $row['kod_prava'],
            'popis' => $row['popis'],
            'aktivni' => $row['aktivni'],
            'source' => $row['permission_source'] // pro debug
        ];
    }
    
    return $permissions;
}
```

---

## 🧪 JAK OTESTOVAT OPRAVU

### **1. Před opravou - ověření problému:**

```bash
# Zkontrolovat, co backend vrací v user objektu
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-list \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.novak@zachranka.cz",
    "token": "user_token_here"
  }'

# Očekávaný výsledek PŘED opravou: 403 Forbidden
```

### **2. Ověření v databázi:**

```sql
-- Zkontrolovat PŘÍMÁ oprávnění uživatele (user_id > 0)
SELECT 
    u.id,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS cele_jmeno,
    p.kod_prava,
    rp.user_id,
    'DIRECT' AS source
FROM 25_role_prava rp
JOIN zamestnanci u ON rp.user_id = u.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = 52  -- ID testovaného uživatele
  AND rp.user_id != -1
  AND p.kod_prava LIKE 'CASH_BOOK_%'
  AND rp.aktivni = 1;

-- Zkontrolovat oprávnění PŘES ROLE (user_id = -1)
SELECT 
    u.id,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS cele_jmeno,
    r.nazev_role,
    p.kod_prava,
    rp.user_id,
    'ROLE' AS source
FROM 25_uzivatel_role ur
JOIN zamestnanci u ON ur.uzivatel_id = u.id
JOIN 25_role r ON ur.role_id = r.id
JOIN 25_role_prava rp ON r.id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE ur.uzivatel_id = 52
  AND rp.user_id = -1
  AND p.kod_prava LIKE 'CASH_BOOK_%'
  AND rp.aktivni = 1;
```

### **3. Po opravě - ověření funkčnosti:**

```bash
# Zkusit znovu volat endpoint
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-list \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.novak@zachranka.cz",
    "token": "user_token_here"
  }'

# Očekávaný výsledek PO opravě: 200 OK s daty
```

### **4. Debug - co obsahuje localStorage:**

```javascript
// V konzoli prohlížeče po přihlášení:
const user = JSON.parse(localStorage.getItem('auth_user_detail_persistent'));
console.log('Permissions:', user.permissions);

// Očekávaný výstup PO opravě:
// [
//   { kod_prava: 'CASH_BOOK_CREATE', popis: '...', source: 'DIRECT' },
//   { kod_prava: 'CASH_BOOK_EDIT_OWN', popis: '...', source: 'DIRECT' },
//   { kod_prava: 'CASH_BOOK_EXPORT_OWN', popis: '...', source: 'DIRECT' },
//   { kod_prava: 'CASH_BOOK_READ_OWN', popis: '...', source: 'DIRECT' }
// ]
```

---

## 📊 DOPAD OPRAVY

### **Co se změní:**

| Aspekt | Před opravou | Po opravě |
|--------|--------------|-----------|
| **Přímá oprávnění** | ❌ Ignorována | ✅ Fungují |
| **Oprávnění z rolí** | ✅ Fungují | ✅ Fungují |
| **Kombinace** | ❌ Jen role | ✅ Role + Přímá (UNION) |
| **API response** | 403 Forbidden | 200 OK |
| **localStorage** | Prázdné permissions | Permissions naplněné |

### **Zpětná kompatibilita:**

✅ **Žádné breaking changes** - stávající kód bude fungovat stejně
- Uživatelé S rolemi → bude fungovat jako doteď
- Uživatelé BEZ rolí, ale s přímými právy → začnou fungovat
- Uživatelé S rolemi I přímými právy → UNION je spojí

---

## 🎯 KONTROLNÍ CHECKLIST

### **Pro backend vývojáře:**
- [ ] Najít soubor, kde se načítají permissions (pravděpodobně `auth.php` nebo `authenticate.php`)
- [ ] Přidat UNION dotaz pro načtení přímých oprávnění (`25_uzivatel_prava`)
- [ ] Otestovat SQL dotaz samostatně v MySQL
- [ ] Deployovat změnu
- [ ] Smazat cache (pokud je použita)
- [ ] Otestovat přihlášení uživatele s přímými právy
- [ ] Ověřit, že `auth_user_detail` v localStorage obsahuje permissions
- [ ] Otestovat API endpoint `/api.eeo/cashbook-list` (očekává 200 OK)

### **Pro frontend vývojáře:**
- [ ] Po deploye backendu: smazat localStorage
- [ ] Odhlásit a přihlásit uživatele znovu
- [ ] Zkontrolovat Console: `localStorage.getItem('auth_user_detail_persistent')`
- [ ] Ověřit, že permissions pole obsahuje CASH_BOOK_* oprávnění
- [ ] Zkusit načíst seznam knih (mělo by projít)
- [ ] Nahlásit zpět, zda funguje

---

## 🔗 SOUVISEJÍCÍ SOUBORY

**SQL tabulky:**
- `25_prava` - definice oprávnění
- `25_role_prava` - vazba role → oprávnění (obsahuje sloupec `user_id`)
  - `user_id = -1` → oprávnění přes roli
  - `user_id > 0` → přímá oprávnění uživatele
- `25_uzivatel_role` - vazba uživatel → role

**Backend soubory (pravděpodobně):**
- `/api.eeo/includes/auth.php`
- `/api.eeo/middleware/authenticate.php`
- `/api.eeo/includes/user.php`

**Frontend soubory:**
- `src/utils/cashbookPermissions.js` - kontrola oprávnění (již opraveno)
- `src/services/cashbookService.js` - API volání

**Dokumentace:**
- `BACKEND-TODO-COMPLETE.md` - kompletní TODO list
- `CASHBOOK-PERMISSIONS.md` - dokumentace oprávnění

---

## ❓ ČASTÉ OTÁZKY

**Q: Proč máme dvě cesty pro oprávnění (role vs přímá)?**
A: Admin UI umožňuje přiřadit oprávnění PŘÍMO uživateli (tab "Přímá práva") nebo přes role (tab "Role"). V tabulce `25_role_prava` se rozlišují sloupcem `user_id` (-1 = role, >0 = přímá).

**Q: Neměli bychom používat jen role?**
A: Ideálně ano, ale systém to umožňuje a admin UI to nabízí, takže backend to musí podporovat.

**Q: Proč se používá -1 pro role?**
A: Je to standardní konvence v této databázi - -1 znamená "platí pro roli", konkrétní ID znamená "platí jen pro tohoto uživatele".

**Q: Neporuší to něco jiného?**
A: Ne. UNION jen přidá další řádky. Pokud uživatel má oprávnění z role i přímo, UNION DISTINCT je odfiltruje.

**Q: Musím upravovat všechny endpointy?**
A: Ne! Stačí opravit funkci `loadUserPermissions()`, kterou volá autentizační middleware. Tím se opraví všechny endpointy najednou.

**Q: Jak poznat, že je to opravené?**
A: Zkontroluj localStorage - pokud user má v `permissions` poli hodnoty s `kod_prava` jako 'CASH_BOOK_*', je to hotovo.

---

## 📞 KONTAKT

**Frontend vývojář:** Jan Holovský  
**Testovací uživatel:** ID 52 (jan.novak@zachranka.cz)  
**Testovací pokladna:** ID 102

**Při problémech:**
- Pošli SQL dotaz, který právě používáš
- Pošli ukázku user objektu (bez hesla/tokenu)
- Pošli error log z backendu

---

**✅ Připraveno k implementaci!**

**Odhadovaný čas opravy:** 15-30 minut  
**Riziko:** Nízké (přidává funkčnost, neruší stávající)  
**Testování:** 5-10 minut
