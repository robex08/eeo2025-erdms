# 📋 Návod: Setup oprávnění pro pokladní knihu

## 🎯 Účel
Tento dokument popisuje, jak nasadit oprávnění pro sekci Pokladní knihy do databáze.

---

## 📁 Soubory

### 1. **setup_cashbook_permissions.sql** (DOPORUČENÝ)
- ✅ **Kompletní idempotentní skript**
- Lze spustit vícekrát bez problémů
- Obsahuje INSERT s ON DUPLICATE KEY UPDATE
- Smaže staré přiřazení a vytvoří nové
- Obsahuje kontrolní dotazy na konci

### 2. **add_cashbook_permissions.sql**
- Přidá pouze oprávnění do tabulky `25_prava`
- Neřeší přiřazení k rolím

### 3. **assign_cashbook_permissions_to_roles.sql**
- Přiřadí oprávnění k rolím
- Vyžaduje, aby oprávnění už existovala v `25_prava`

---

## 🚀 Rychlé spuštění (DOPORUČENO)

### Krok 1: Zkontrolujte ID rolí v databázi

```sql
SELECT id, kod_role, nazev_role FROM `25_role`;
```

**Očekáváné výsledky:**
```
| id | kod_role        | nazev_role           |
|----|-----------------|----------------------|
| 1  | SUPERADMIN      | Super Admin          |
| 2  | ADMINISTRATOR   | Administrátor        |
| 3  | VEDOUCI         | Vedoucí              |
| 4  | THP             | THP                  |
| 5  | UCETNI          | Účetní               |
| 6  | HLAVNI_UCETNI   | Hlavní účetní        |
```

⚠️ **POZOR:** Pokud se ID liší, upravte je v `setup_cashbook_permissions.sql` před spuštěním!

---

### Krok 2: Spusťte hlavní skript

**Z příkazové řádky:**
```bash
mysql -u root -p evidence_smluv < setup_cashbook_permissions.sql
```

**Nebo v MySQL Workbench / phpMyAdmin:**
1. Otevřete soubor `setup_cashbook_permissions.sql`
2. Spusťte celý skript (Execute)

---

### Krok 3: Ověřte instalaci

Skript automaticky zobrazí na konci kontrolní výstupy:

**A) Seznam přidaných oprávnění:**
```sql
SELECT id, kod_prava, popis, aktivni 
FROM `25_prava` 
WHERE kod_prava LIKE 'CASH_BOOK_%';
```

**Očekávaných 6 záznamů:**
- CASH_BOOK_READ
- CASH_BOOK_CREATE
- CASH_BOOK_EDIT
- CASH_BOOK_DELETE
- CASH_BOOK_EXPORT
- CASH_BOOK_MANAGE

**B) Přiřazení práv k rolím:**
```sql
-- Zobrazí, které role mají jaká práva
```

**C) Matice práv (přehledná tabulka):**
```
| kod_role       | MANAGE | READ | CREATE | EDIT | DELETE | EXPORT |
|----------------|--------|------|--------|------|--------|--------|
| SUPERADMIN     | ✓      |      |        |      |        |        |
| ADMINISTRATOR  | ✓      |      |        |      |        |        |
| THP            |        | ✓    | ✓      | ✓    | ✓      | ✓      |
| HLAVNI_UCETNI  |        | ✓    | ✓      | ✓    | ✓      | ✓      |
| UCETNI         |        | ✓    | ✓      | ✓    |        | ✓      |
| VEDOUCI        |        | ✓    |        |      |        | ✓      |
```

---

## 📊 Hierarchie oprávnění

### 1. **CASH_BOOK_MANAGE** (Super právo)
- Zahrnuje **všechna** práva pokladní knihy
- Přiřazeno: SUPERADMIN, ADMINISTRATOR
- Když má uživatel toto právo, ignorují se ostatní CASH_BOOK_* práva

### 2. **Granulární práva**

| Právo                | Popis                                      | Role                          |
|----------------------|--------------------------------------------|-------------------------------|
| CASH_BOOK_READ       | Zobrazení/prohlížení záznamů              | Všichni                       |
| CASH_BOOK_CREATE     | Vytvoření nového záznamu                  | THP, UCETNI, HLAVNI_UCETNI   |
| CASH_BOOK_EDIT       | Editace existujících záznamů              | THP, UCETNI, HLAVNI_UCETNI   |
| CASH_BOOK_DELETE     | Smazání záznamů                           | THP, HLAVNI_UCETNI            |
| CASH_BOOK_EXPORT     | Export CSV/PDF, tisk                      | Všichni kromě bez práv        |

---

## 🔒 Bezpečnostní poznámky

### ⚠️ **CASH_BOOK_DELETE**
- **Rizikové právo** - umožňuje mazat záznamy
- Doporučeno pouze pro:
  - Administrátory (přes MANAGE)
  - THP (správci pokladní knihy)
  - Hlavní účetní (kontrola a opravy)

### ✅ **CASH_BOOK_MANAGE**
- Nejsilnější právo - kompletní kontrola
- Pouze pro administrátory
- Zahrnuje všechna ostatní práva automaticky

---

## 🔧 Pokročilé - Úprava přiřazení

Pokud chcete změnit, která role má jaké právo:

### Příklad: Přidat DELETE pro UCETNI (role_id = 5)

```sql
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 5, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_DELETE'
ON DUPLICATE KEY UPDATE role_id = role_id;
```

### Příklad: Odebrat DELETE pro THP (role_id = 4)

```sql
DELETE FROM `25_role_prava`
WHERE role_id = 4 
  AND pravo_id = (SELECT id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_DELETE');
```

---

## 🐛 Troubleshooting

### Problém: "Duplicate entry" chyba
**Řešení:** Ignorujte - skript používá ON DUPLICATE KEY UPDATE, chyba je OK.

### Problém: "Unknown column 'kod_prava'"
**Řešení:** Vaše databáze má jiné názvy sloupců. Zkontrolujte strukturu tabulky:
```sql
DESCRIBE `25_prava`;
```

### Problém: Práva nefungují v aplikaci
**Řešení:**
1. Zkontrolujte, že uživatel má přiřazenou správnou roli
2. Ověřte v tabulce `25_role_prava`, že role má správné pravo_id
3. Odhlaste se a přihlaste znovu (refresh JWT tokenu)

---

## 📝 Changelog

**2025-11-07:**
- ✅ Přidány základní oprávnění (READ, CREATE, EDIT, DELETE, EXPORT, MANAGE)
- ✅ Přiřazení k rolím (SUPERADMIN, ADMIN, THP, VEDOUCI, UCETNI, HLAVNI_UCETNI)
- ✅ Vytvořen idempotentní setup skript
- ✅ Přidány kontrolní dotazy

---

## 🎓 Pro vývojáře

Po úspěšném nasazení SQL skriptů je třeba implementovat kontrolu oprávnění v aplikaci:

**Frontend: `CashBookPage.js`**
```javascript
const { hasPermission, userDetail } = useContext(AuthContext);

// Kontrola hierarchie
const isSuperAdmin = userDetail?.roles?.some(r => 
  r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR'
);

const canManage = isSuperAdmin || hasPermission('CASH_BOOK_MANAGE');

const canEdit = canManage || hasPermission('CASH_BOOK_EDIT');
const canDelete = canManage || hasPermission('CASH_BOOK_DELETE');
// atd...
```

Implementace v aplikaci bude provedena v dalším kroku.

---

**✅ Po spuštění tohoto návodu budete mít v databázi kompletní oprávnění pro pokladní knihu!**
