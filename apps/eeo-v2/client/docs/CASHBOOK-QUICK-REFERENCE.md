# 📋 POKLADNÍ KNIHA - RYCHLÝ PŘEHLED ROZHODNUTÍ

**Datum:** 8. listopadu 2025  
**Status:** ✅ SCHVÁLENO

---

## ✅ FINÁLNÍ ROZHODNUTÍ

### 1️⃣ Číslo pokladny
- **Řešení:** Číselník přiřazení `25a_pokladny_uzivatele`
- **Důvod:** Podpora více pokladen + zástupy
- **Varianta 2** ✅

### 2️⃣ Prefix dokladů
- **S prefixem:** `V591-001`, `P491-001`
- **Bez prefixu:** `V001`, `P001`
- **Globální nastavení:** `cashbook_use_prefix` (ON/OFF)
- **Číslování:** Od začátku roku do konce roku (neresetuje se měsíčně)

### 3️⃣ Offline mode
- **localStorage + okamžitá synchronizace**
- Při potvrzení (Shift+Enter) → propagace do DB
- Priorita: konzistence dat ✅

### 4️⃣ Uzavírání knih
- **Dvoustupňové:**
  1. Uživatel uzavře měsíc (`uzavrena_uzivatelem`)
  2. Notifikace správci
  3. Správce zamkne (`zamknuta_spravcem`)
- **Odemčení:** ANO, správce může odemknout
- **Zásahy správce:** ANO, i do otevřené knihy (dotace, korekce)

### 5️⃣ Notifikace
- **In-app notifikace** ✅
- Email později pokud potřeba

### 6️⃣ Export
- **PDF + Excel** ✅
- Zatím pouze celá kniha

### 7️⃣ Archivace
- **Nemazat nikdy** ✅
- Ruční promazání později

### 8️⃣ Multi-pokladna
- **ANO** - více pokladen per-user ✅
- Podpora zástupů

---

## 📊 DATABÁZOVÁ STRUKTURA

### 5 tabulek

| # | Tabulka | Popis |
|---|---------|-------|
| 1 | `25a_pokladny_uzivatele` | Přiřazení pokladen k uživatelům |
| 2 | `25a_pokladni_knihy` | Měsíční knihy |
| 3 | `25a_pokladni_polozky` | Jednotlivé záznamy |
| 4 | `25a_pokladni_audit` | Audit trail |
| 5 | `25a_nastaveni_globalni` | Globální konfigurace |

### Vazby

```
25a_uzivatele (existující)
    ↓ 1:N
25a_pokladny_uzivatele
    ↓ 1:N
25a_pokladni_knihy
    ↓ 1:N
25a_pokladni_polozky
    ↓ 1:N
25a_pokladni_audit
```

---

## 🎯 IMPLEMENTAČNÍ ČASY

| Fáze | Popis | Dny |
|------|-------|-----|
| **Fáze 1** | Příprava DB + SQL skripty | 1-2 |
| **Fáze 2** | Backend API (14 endpointů) | 3-5 |
| **Fáze 3** | Frontend migrace | 2-3 |
| **Fáze 4** | Testování | 2-3 |
| **Fáze 5** | Nasazení + migrace dat | 1 |
| **Rozšíření** | Offline sync, notifikace, atd. | +11 |
| | **CELKEM BASE:** | **9-14 dní** |
| | **CELKEM S ROZŠÍŘENÍMI:** | **20-25 dní** |

---

## 🔢 LOGIKA ČÍSLOVÁNÍ

### Algoritmus

```php
// Globální nastavení: cashbook_use_prefix (1/0)

if (cashbook_use_prefix == 1) {
    // S PREFIXEM
    $vydaj = "V{ciselna_rada_vpd}-{cislo}";  // V591-001
    $prijem = "P{ciselna_rada_ppd}-{cislo}"; // P491-001
} else {
    // BEZ PREFIXU
    $vydaj = "V{cislo}";  // V001
    $prijem = "P{cislo}"; // P001
}

// Číslo běží od začátku roku do konce roku
// Per-user (ne globálně)
```

### Příklad v roce 2025

| Měsíc | Datum | Typ | S prefixem | Bez prefixu |
|-------|-------|-----|------------|-------------|
| Leden | 05.01 | Výdaj | V591-001 | V001 |
| Leden | 12.01 | Příjem | P491-001 | P001 |
| Únor | 03.02 | Výdaj | V591-002 | V002 |
| Únor | 15.02 | Příjem | P491-002 | P002 |
| ... | ... | ... | ... | ... |

---

## 🔐 OPRÁVNĚNÍ

### Nová oprávnění (10 ks)

```
CASH_BOOK_MANAGE         -- Správa (nejvyšší)
CASH_BOOK_CREATE         -- Vytváření
CASH_BOOK_READ_ALL       -- Čtení všech
CASH_BOOK_EDIT_ALL       -- Editace všech
CASH_BOOK_DELETE_ALL     -- Mazání všech
CASH_BOOK_EXPORT_ALL     -- Export všech
CASH_BOOK_READ_OWN       -- Čtení vlastní
CASH_BOOK_EDIT_OWN       -- Editace vlastní
CASH_BOOK_DELETE_OWN     -- Mazání vlastní
CASH_BOOK_EXPORT_OWN     -- Export vlastní
```

### Hierarchie

```
SUPER_ADMIN
    ↓
CASH_BOOK_MANAGE (správce pokladen)
    ↓
CASH_BOOK_CREATE
    ↓
CASH_BOOK_*_ALL
    ↓
CASH_BOOK_*_OWN
```

---

## 📝 STAVY KNIHY

| Stav | Popis | Kdo může editovat |
|------|-------|-------------------|
| `aktivni` | Normální práce | Uživatel |
| `uzavrena_uzivatelem` | Čeká na správce | Správce |
| `zamknuta_spravcem` | Definitivně zamknuta | Pouze správce |

**Přechody:**
- `aktivni` → `uzavrena_uzivatelem` (uživatel)
- `uzavrena_uzivatelem` → `zamknuta_spravcem` (správce)
- `zamknuta_spravcem` → `aktivni` (správce - odemčení)

---

## 🚀 PŘÍKLAD PŘIŘAZENÍ POKLADNY

```sql
-- Jan Novák má pokladnu č. 1 v Hradci Králové
INSERT INTO 25a_pokladny_uzivatele VALUES 
(NULL, 42, 1, 'HK', 'Hradec Králové', '591', '491', 1, 
 '2025-01-01', NULL, 'Hlavní pokladna', NOW(), 1);

-- Marie Dvořáková zastupuje v únoru pokladnu č. 2
INSERT INTO 25a_pokladny_uzivatele VALUES 
(NULL, 43, 2, 'ME', 'Metličany', '521', '421', 0, 
 '2025-02-01', '2025-02-28', 'Zástup za kolegu', NOW(), 1);
```

---

## 📄 SOUBORY

### Dokumentace
- ✅ `docs/CASHBOOK-DB-MIGRATION-ANALYSIS.md` - Kompletní analýza
- ✅ `docs/CASHBOOK-BACKEND-PROMPT.md` - Prompt pro backend
- ✅ `docs/CASHBOOK-CESKE-NAZVY-SLOUPCU.md` - Mapování názvů
- ✅ `docs/CASHBOOK-QUICK-REFERENCE.md` - Tento dokument

### SQL skripty
- ✅ `create_cashbook_tables.sql` - CREATE TABLE statements

### Backend (TODO)
- `api/v2/cashbook/CashbookController.php`
- `api/v2/cashbook/CashbookModel.php`
- `api/v2/cashbook/CashbookService.php`
- `api/v2/cashbook/CashbookPermissions.php`

### Frontend (TODO)
- `src/services/cashbookService.js` - API komunikace
- `src/utils/cashbookMigration.js` - Migrace z localStorage
- `src/pages/CashBookPage.js` - UI (úprava existujícího)

---

## ✅ DALŠÍ KROKY

1. ✅ **Schválení návrhu** - HOTOVO
2. ⏳ **Vytvoření SQL skriptů** - HOTOVO
3. ⏳ **Spuštění SQL v DB** - čeká na spuštění
4. ⏳ **Implementace BE API** - čeká na backend tým
5. ⏳ **Úprava FE** - čeká na frontend
6. ⏳ **Testování** - čeká na QA
7. ⏳ **Nasazení** - čeká na deploy
8. ⏳ **Migrace dat** - čeká na uživatele

---

**🎉 Vše je připraveno k implementaci!**
