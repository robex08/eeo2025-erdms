# 🔧 Plán refaktoringu konstant tabulek

**Datum:** 20. prosince 2025  
**Status:** ✅ Fáze 1 HOTOVO | 🔄 Fáze 2 V PŘÍPRAVĚ

---

## ✅ Fáze 1: Přidání konstant (HOTOVO)

Přidáno **22 nových konstant** do `api.php` (řádky 122-171):

### Nově přidané konstanty:

#### POKLADNY (3)
```php
TBL_POKLADNY                   = '25a_pokladny'
TBL_POKLADNY_UZIVATELE        = '25a_pokladny_uzivatele'
TBL_POKLADNI_AUDIT            = '25a_pokladni_audit'
TBL_POKLADNI_POLOZKY_DETAIL   = '25a_pokladni_polozky_detail'
```

#### PŘÍLOHY (2)
```php
TBL_OBJEDNAVKY_PRILOHY        = '25a_objednavky_prilohy'
TBL_FAKTURY_PRILOHY           = '25a_faktury_prilohy'
```

#### AUTORIZACE & ROLE (5)
```php
TBL_PRAVA                     = '25_prava'
TBL_ROLE                      = '25_role'
TBL_ROLE_PRAVA                = '25_role_prava'
TBL_UZIVATELE_ROLE            = '25_uzivatele_role'
TBL_USER_GROUPS_MEMBERS       = '25_user_groups_members'
```

#### HIERARCHIE (2)
```php
TBL_UZIVATELE_HIERARCHIE      = '25_uzivatele_hierarchie'
TBL_HIERARCHIE_PROFILY        = '25_hierarchie_profily'
```

#### NASTAVENÍ (2)
```php
TBL_NASTAVENI_GLOBALNI        = '25a_nastaveni_globalni'
TBL_UZIVATEL_NASTAVENI        = '25_uzivatel_nastaveni'
```

#### ČÍSELNÍKY (1)
```php
TBL_LOKALITY                  = '25_lokality'
```

#### DOCX ŠABLONY (5)
```php
TBL_SABLONY_DOCX              = '25_sablony_docx'
TBL_DOCX_SABLONY              = '25_docx_sablony'  // alternativní
TBL_DOCX_MAPOVANI             = '25_docx_mapovani'
TBL_DOCX_KATEGORIE            = '25_docx_kategorie'
TBL_DOCX_GENEROVANE           = '25_docx_generovane'
```

#### SMLOUVY (1)
```php
TBL_SMLOUVY_IMPORT_LOG        = '25_smlouvy_import_log'
```

---

## 🔄 Fáze 2: Refaktoring hardcoded názvů

**Rozsah:** ~200 výskytů napříč 70+ soubory

### Priorita refaktoringu:

#### 🔴 PRIORITA 1: Models (kritické, nejvíce duplicit)
```
Soubory (6):
- models/CashboxModel.php              (~15 výskytů)
- models/CashbookModel.php             (~20 výskytů)
- models/CashbookEntryModel.php        (~10 výskytů)
- models/CashbookAuditModel.php        (~5 výskytů)
- models/CashboxAssignmentModel.php    (~15 výskytů)
- models/GlobalSettingsModel.php       (~5 výskytů)

Celkem: ~70 výskytů
Čas: 2-3 hodiny
```

#### 🟡 PRIORITA 2: Core Handlers (vysoká využitelnost)
```
Soubory (8):
- lib/invoiceHandlers.php              (~20 výskytů)
- lib/notificationHandlers.php         (~10 výskytů)
- lib/orderV2Endpoints.php             (~8 výskytů)
- lib/orderV2InvoiceHandlers.php       (~10 výskytů)
- lib/hierarchyHandlers.php            (~15 výskytů)
- lib/hierarchyOrderFilters.php        (~12 výskytů)
- lib/hierarchyPermissions.php         (~5 výskytů)
- lib/globalSettingsHandlers.php       (~5 výskytů)

Celkem: ~85 výskytů
Čas: 3-4 hodiny
```

#### 🟢 PRIORITA 3: Extended Handlers (nižší riziko)
```
Soubory (15):
- lib/searchQueries.php
- lib/searchHelpers.php
- lib/userStatsHandlers.php
- lib/cashbookHandlers.php
- lib/cashbookHandlersExtended.php
- lib/cashboxByPeriodHandler.php
- lib/ciselnikyHandlers.php
- lib/sablonaDocxHandlers.php
- lib/docxOrderDataHandlers.php
- lib/docxTemplateHandlers.php
- lib/userSettingsHandlers.php
- lib/importHandlers.php
- lib/smlouvyHandlers.php
- validators/EntryValidator.php
- services/LPCalculationService.php

Celkem: ~45 výskytů
Čas: 2-3 hodiny
```

---

## 📋 Refactoring Checklist

### Před začátkem každé priority:
- [ ] Git commit aktuálního stavu
- [ ] Vytvoření nové větve (volitelně)
- [ ] Zálohování souborů

### Pro každý soubor:
- [ ] Identifikovat všechny hardcoded názvy
- [ ] Najít odpovídající konstantu v api.php
- [ ] Nahradit přes multi_replace_string_in_file
- [ ] Ověřit syntaxi: `php -l soubor.php`
- [ ] Spustit základní testy (pokud existují)

### Po dokončení priority:
- [ ] Commit změn s popisným message
- [ ] Push do remote
- [ ] Aktualizovat tento dokument

---

## 🎯 Strategie nahrazování

### Pravidla:
1. **Vždy používat concatenation:**
   ```php
   // ❌ ŠPATNĚ
   SELECT * FROM TBL_OBJEDNAVKY
   
   // ✅ SPRÁVNĚ
   SELECT * FROM " . TBL_OBJEDNAVKY . "
   ```

2. **Zachovat aliasy:**
   ```php
   // ❌ PŘED
   FROM 25a_objednavky o
   
   // ✅ PO
   FROM " . TBL_OBJEDNAVKY . " o
   ```

3. **V prepared statements:**
   ```php
   // ❌ PŘED
   $sql = "SELECT * FROM 25a_objednavky WHERE id = ?";
   
   // ✅ PO
   $sql = "SELECT * FROM " . TBL_OBJEDNAVKY . " WHERE id = ?";
   ```

4. **Víceřádkové SQL:**
   ```php
   // ✅ SPRÁVNĚ
   $sql = "
       SELECT *
       FROM " . TBL_OBJEDNAVKY . " o
       LEFT JOIN " . TBL_UZIVATELE . " u ON o.uzivatel_id = u.id
       WHERE o.aktivni = 1
   ";
   ```

---

## 🔍 Testování

### Po každé prioritě:
1. **Syntax check:**
   ```bash
   find apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/ -name "*.php" -exec php -l {} \;
   ```

2. **Grep check (neměly by být žádné výsledky):**
   ```bash
   # Kontrola models
   grep -r "FROM 25[a_]" apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/
   grep -r "INSERT INTO 25[a_]" apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/
   grep -r "UPDATE 25[a_]" apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/
   ```

3. **API smoke test:**
   ```bash
   # Test základních endpointů
   curl -X GET http://localhost/api/health
   curl -X GET http://localhost/api/orders
   ```

---

## 📊 Progress Tracking

| Priorita | Soubory | Výskyty | Status | Čas | Commit |
|----------|---------|---------|--------|-----|--------|
| 1 - Models | 6 | ~70 | ⏳ Čeká | - | - |
| 2 - Core Handlers | 8 | ~85 | ⏳ Čeká | - | - |
| 3 - Extended | 15 | ~45 | ⏳ Čeká | - | - |
| **CELKEM** | **29** | **~200** | **0%** | **0h** | - |

---

## 🚀 Jak začít?

### Spustit Prioritu 1:
```
User: "Začni s refaktoringem Priority 1 - Models"
```

Copilot:
1. Vytvoří backup
2. Postupně refaktoruje všechny models
3. Testuje syntaxi
4. Commituje změny
5. Aktualizuje tento dokument

---

## 💡 Tipy

1. **Postupně:** Nedělej všechno najednou
2. **Testuj:** Po každém souboru zkontroluj syntaxi
3. **Commituj:** Malé commity jsou lepší než velké
4. **Kontroluj:** Použij grep pro ověření
5. **Dokumentuj:** Aktualizuj progress table

---

## 📝 Notes

- Existují 2 potenciální duplicity: `25_docx_sablony` vs `25_sablony_docx`
- Tabulka `25a_useky` - zkontrolovat, zda to není překlep (`25_useky` je správně)
- Některé soubory již částečně používají konstanty (např. orderV2PolozkyLPHandlers.php)

---

**Status:** Připraveno k začátku Fáze 2 🚀
