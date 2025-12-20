# Status: Invoice Module & UniversalSearch Fixes

**Datum**: 20. prosince 2025  
**Branch**: `feature/generic-recipient-system`

## ✅ HOTOVO

### 1. Oprava 500 Error - Modul Faktur
**Problém**: `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'pocet_priloh' in 'WHERE'`

**Řešení** (commit `cbc85a6`):
- `pocet_priloh` je agregovaný sloupec (`COUNT(DISTINCT prilohy.id)`)
- Nelze použít v WHERE klauzuli
- Přesunut filtr `filter_ma_prilohy` z WHERE do HAVING
- SQL struktura: `WHERE ... GROUP BY f.id HAVING COUNT(...) ORDER BY ...`

**Soubor**: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

---

### 2. Nová práva v databázi
**Přidáno do tabulky `25_prava`**:

| ID | Kód práva | Popis |
|----|-----------|-------|
| 94 | INVOICE_VIEW | Faktury - prohlížení všech faktur (read-only) |
| 95 | INVOICE_VECNA_KONTROLA | Faktury - věcná kontrola faktur |

**Příkaz**:
```sql
INSERT INTO 25_prava (kod_prava, popis, aktivni) VALUES 
('INVOICE_VIEW', 'Faktury - prohlížení všech faktur (read-only)', 1),
('INVOICE_VECNA_KONTROLA', 'Faktury - věcná kontrola faktur', 1)
ON DUPLICATE KEY UPDATE popis = VALUES(popis), aktivni = VALUES(aktivni);
```

**DB Připojení**: 
- Host: `10.3.172.11`
- User: `erdms_user`
- Pass: `AhchohTahnoh7eim` (z dbconfig.php)
- DB: `eeo2025`

---

### 3. Rozšíření UniversalSearch - Nová pole faktur
**Přidáno do SQL** (commit `9c8cdbb`):

**Nová SELECT pole**:
- `f.fa_zaplacena` - Zaplaceno (1/0)
- `f.fa_dorucena` - Doručena (1/0)
- `f.fa_predana_zam_id` - ID zaměstnance kterému předána
- `f.vytvoril_uzivatel_id` - ID uživatele který vytvořil fakturu
- `predano_kym` - Celé jméno zaměstnance (CONCAT u_predana)
- `stav_platby` - CASE: 'zaplaceno', 'po_splatnosti', 'nezaplaceno'

**Nový JOIN**:
```sql
LEFT JOIN " . TBL_UZIVATELE . " u_predana ON f.fa_predana_zam_id = u_predana.id
```

**Nová vyhledávací pole v WHERE**:
- `f.fa_typ` - Typ faktury (BEZNA, ZALOHA, KONECNA, atd.)

**Nové highlight labels**:
- `fa_typ` → 'Typ faktury'
- `predano_kym` → 'Předáno komu'
- `nahrano_kym` → 'Zaevidoval'

**Soubory**:
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchQueries.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchHelpers.php`

---

## ⏳ ZBÝVÁ IMPLEMENTOVAT

### 1. Permission-based Filtering
**Požadavek**: Non-admin uživatelé vidí pouze "své faktury"

**Definice "své faktury"**:
1. Faktura je předdána danému uživateli (`f.fa_predana_zam_id = user_id`)
2. Faktura je součástí objednávky kde je uživatel v jakékoli pozici:
   - Garant (`o.garant_uzivatel_id`)
   - Účetní (`o.ucetni_uzivatel_id`)
   - Příkazce (`o.prikazce_id`)
   - Věcná kontrola (`f.potvrdil_vecnou_spravnost_id`)
   - Vytvořil objednávku (`o.uzivatel_id`)

**Implementace**:
```sql
-- Přidat do WHERE klauzule v searchQueries.php::getSqlSearchInvoices()
AND (
    :is_admin = 1 
    OR f.fa_predana_zam_id = :user_id
    OR o.garant_uzivatel_id = :user_id
    OR o.ucetni_uzivatel_id = :user_id
    OR o.prikazce_id = :user_id
    OR f.potvrdil_vecnou_spravnost_id = :user_id
    OR o.uzivatel_id = :user_id
    OR f.vytvoril_uzivatel_id = :user_id
)
```

**Změny v kódu**:
- `searchHandlers.php::searchInvoices()` - přidat parametr `$userId`
- `searchHandlers.php::handle_universal_search()` - získat user_id z tokenu
- `searchQueries.php::getSqlSearchInvoices()` - přidat `:user_id` parametr
- `searchHandlers.php::searchInvoices()` - bind `:user_id` parametr

---

### 2. Rozšíření vyhledávání - Textová pole
**Požadované vyhledávání v**:

1. **Typ faktury** (`f.fa_typ`): ✅ ČÁSTEČNĚ (WHERE přidáno, chybí CASE match_type)
   - Hodnoty: BEZNA, ZALOHA, KONECNA, PROFORMA, DOBROPIS, STORNOVACI
   
2. **Předáno komu** (`u_predana.jmeno`, `u_predana.prijmeni`): ❌ CHYBÍ
   - Přidat do WHERE s CONCAT + diacritics normalization

3. **Kdo zaevidoval** (`u.jmeno`, `u.prijmeni`): ❌ CHYBÍ  
   - Přidat do WHERE s CONCAT + diacritics normalization

4. **Zaplaceno/Nezaplaceno** - speciální handling: ❌ CHYBÍ
   - Pokud query obsahuje "zaplacen", filtrovat `f.fa_zaplacena = 1`
   - Pokud obsahuje "nezaplacen", filtrovat `f.fa_zaplacena = 0`

5. **Po splatnosti** - kalkulované pole: ❌ CHYBÍ
   - Pokud query obsahuje "po splatnosti", filtrovat:
   ```sql
   f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE()
   ```

**Implementace**:
Přidat do WHERE sekce v `searchQueries.php`:
```sql
OR CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni) LIKE :query
OR CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query
OR (f.fa_zaplacena = 1 AND 'zaplaceno' LIKE :query)
OR (f.fa_zaplacena = 0 AND 'nezaplaceno' LIKE :query)
OR (f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE() AND 'po splatnosti' LIKE :query)
```

Přidat CASE podmínky pro match_type:
```sql
WHEN CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni) LIKE :query THEN 'predano_kym'
WHEN CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query THEN 'nahrano_kym'
WHEN f.fa_typ LIKE :query THEN 'fa_typ'
```

---

### 3. Diacritics-insensitive Search
Pro všechna nová textová pole přidat normalizaci s `:query_normalized`:

```sql
OR REPLACE(...CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni)...) LIKE :query_normalized
OR REPLACE(...CONCAT(u.jmeno, ' ', u.prijmeni)...) LIKE :query_normalized
OR REPLACE(...f.fa_typ...) LIKE :query_normalized
```

---

## 📝 TODO Seznam

### Vysoká priorita:
- [ ] Implementovat permission filtering v `searchInvoices()`
- [ ] Přidat vyhledávání v jménech (předáno, zaevidoval)
- [ ] Přidat vyhledávání ve stavu faktury (zaplaceno/nezaplaceno/po splatnosti)
- [ ] Přidat match_type pro nová pole

### Střední priorita:
- [ ] Otestovat permission logic s non-admin uživatelem
- [ ] Ověřit že ADMIN vidí všechny faktury
- [ ] Ověřit že INVOICE_VIEW uživatel vidí jen své faktury

### Nízká priorita:
- [ ] Dokumentace změn pro ostatní vývojáře
- [ ] Update _docs/PLAN_UNISEARCH_INVOICES_PERMISSIONS.md

---

## 🔗 Relevantní soubory

| Soubor | Účel | Status |
|--------|------|--------|
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchHandlers.php` | Main search orchestration | ⏳ Potřebuje update |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchQueries.php` | SQL query builder | ⏳ Potřebuje update |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchHelpers.php` | Helper functions | ✅ Aktualizováno |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php` | Invoice list API | ✅ Opraveno (HAVING) |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php` | DB credentials | ✅ Platné |

---

## 🐛 Známé problémy

### OPRAVENO:
- ✅ 500 Error: pocet_priloh in WHERE (fixed via HAVING)

### AKTIVNÍ:
- ⚠️ **Permission filtering není implementováno** - všichni vidí všechny faktury
- ⚠️ **Vyhledávání v jménech nefunguje** - chybí WHERE podmínky
- ⚠️ **Vyhledávání ve stavech nefunguje** - chybí speciální logic

---

## 📊 Git Status

```bash
# Poslední 3 commits:
9c8cdbb feat: rozšíření UniversalSearch faktur - nová pole a práva v DB
cbc85a6 fix: 500 error - pocet_priloh filter moved from WHERE to HAVING clause
99d04ff docs: comprehensive changelog for UniversalSearch invoice expansion
```

**Branch**: `feature/generic-recipient-system`  
**Ahead of origin**: 16 commits

---

## 🎯 Následující kroky

1. **Implementovat permission filtering** - nejvyšší priorita, bezpečnostní požadavek
2. **Přidat vyhledávání v jménech a stavech** - funkční požadavek
3. **Testovat s reálnými daty** - ověřit že vše funguje
4. **Commit & Push** - nasadit na server

---

*Vygenerováno: 20. prosince 2025 22:30*  
*Autor: GitHub Copilot*
