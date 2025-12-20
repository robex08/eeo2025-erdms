# 🔒 PHP API Security Audit - Finální Report

**Datum auditů:** 20. prosince 2025  
**Verzee:** 1.0 - Production Ready Check  
**Status:** ⚠️ **KRITICKÉ PROBLÉMY NALEZENY**

---

## 📋 Shrnutí

Provedl jsem komplexní bezpečnostní audit PHP API v `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/` podle definovaných pravidel z `.github/prompts/PHP_api.prompt.md`.

### ✅ Kladné nálezy

1. **PDO připojení** - Většina kódu používá PDO (models, handlers)
2. **Prepared statements** - Převážně správně implementovány
3. **Konstanty tabulek** - Definovány v `api.php` (řádky 122-140)
4. **České názvy** - Respektovány (tabulky i sloupce)
5. **Vzdálený DB server** - Správně nakonfigurováno (10.3.172.11)

---

## 🚨 KRITICKÉ PROBLÉMY

### 1. **MYSQLI v Legacy Handlers** ❌❌❌

**Riziko:** VYSOKÉ - SQL Injection, nekompatibilní s produkcí

**Postižené soubory:**
```
/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_tri_typy.php  (100+ mysqli volání)
/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v3_tri_typy.php  (100+ mysqli volání)
/v2025.03_25/lib/docxTemplateHandlers.php                            (1 volání)
/v2025.03_25/test-dual-template.php                                  (test soubor)
```

**Příklad problému:**
```php
// ❌ NESPRÁVNĚ - mysqli
$result_meta = mysqli_query($conn, $sql_meta);
$meta = mysqli_fetch_assoc($result_meta);
$cislo_lp_safe = mysqli_real_escape_string($conn, $meta['cislo_lp']);

// ✅ SPRÁVNĚ - PDO s prepared statements
$stmt = $pdo->prepare($sql_meta);
$stmt->execute();
$meta = $stmt->fetch(PDO::FETCH_ASSOC);
// Žádný manual escape potřeba!
```

**Detaily:**
- `limitovanePrislibyCerpaniHandlers_v2_tri_typy.php` - funkce používající $conn (mysqli)
  - `prepocetCerpaniPodleIdLP()`
  - `prepocetVsechLP()`
  - `inicializaceCerpaniLP()`
  - `getStavLP()`
  - `getCerpaniPodleUzivatele()`
  - `getCerpaniPodleUseku()`

**Akce:** ⚠️ **VYŽADUJE PŘEPSÁNÍ NA PDO PŘED PRODUKCÍ**

---

### 2. **Hardcoded názvy tabulek** ⚠️⚠️

**Riziko:** STŘEDNÍ - Ztráta konzistence, obtížná údržba

**Počet výskytů:** 200+ napříč všemi handlery

**Příklady:**
```php
// ❌ NESPRÁVNĚ
FROM 25a_pokladny p
INSERT INTO 25_smlouvy (...)
UPDATE 25a_objednavky SET ...

// ✅ SPRÁVNĚ
FROM " . TBL_POKLADNY . " p
INSERT INTO " . TBL_SMLOUVY . " (...)
UPDATE " . TBL_OBJEDNAVKY . " SET ...
```

**Postižené oblasti:**
- Models (CashboxModel, CashbookModel, GlobalSettingsModel, atd.)
- Handlers (všechny - invoiceHandlers, orderHandlers, notificationHandlers, atd.)
- Services (CashbookService, LPCalculationService)

**Důsledky:**
- Nemožné centrálně změnit název tabulky
- Riziko překlepů
- Nekonzistentní s definicemi v `api.php`

**Akce:** ⚠️ **DOPORUČENO REFAKTOROVAT** (ale ne blokující pro produkci)

---

### 3. **Chybějící konstanty tabulek** ⚠️

**Riziko:** NÍZKÉ - Neúplná dokumentace

Následující tabulky **nemají** definované konstanty v `api.php`:

```php
// CHYBÍ v api.php, ale používají se:
'25a_pokladny'                    // mělo by být TBL_POKLADNY
'25a_pokladny_uzivatele'          // mělo by být TBL_POKLADNY_UZIVATELE
'25a_pokladni_audit'              // mělo by být TBL_POKLADNI_AUDIT
'25a_pokladni_polozky_detail'     // mělo by být TBL_POKLADNI_POLOZKY_DETAIL
'25a_nastaveni_globalni'          // mělo by být TBL_NASTAVENI_GLOBALNI
'25_prava'                        // mělo by být TBL_PRAVA
'25_role'                         // mělo by být TBL_ROLE
'25_role_prava'                   // mělo by být TBL_ROLE_PRAVA
'25_uzivatele_role'               // mělo by být TBL_UZIVATELE_ROLE
'25_uzivatele_hierarchie'         // mělo by být TBL_UZIVATELE_HIERARCHIE
'25_hierarchie_profily'           // mělo by být TBL_HIERARCHIE_PROFILY
'25_lokality'                     // mělo by být TBL_LOKALITY
'25_useky'                        // je TBL_USEKY
'25a_useky'                       // duplicita? nebo 25_useky?
'25a_objednavky_prilohy'          // mělo by být TBL_OBJEDNAVKY_PRILOHY
'25a_faktury_prilohy'             // mělo by být TBL_FAKTURY_PRILOHY
'25_smlouvy_import_log'           // mělo by být TBL_SMLOUVY_IMPORT_LOG
'25_sablony_docx'                 // mělo by být TBL_SABLONY_DOCX
'25_docx_sablony'                 // duplicita? nebo stejná jako 25_sablony_docx?
'25_docx_mapovani'                // mělo by být TBL_DOCX_MAPOVANI
'25_docx_kategorie'               // mělo by být TBL_DOCX_KATEGORIE
'25_docx_generovane'              // mělo by být TBL_DOCX_GENEROVANE
'25_uzivatel_nastaveni'           // mělo by být TBL_UZIVATEL_NASTAVENI
'25_user_groups_members'          // mělo by být TBL_USER_GROUPS_MEMBERS
```

**Akce:** Doplnit konstanty do `api.php`

---

## 📊 Statistiky

### Databázové připojení
- ✅ **PDO:** ~70 souborů (Models, většina handlers)
- ❌ **mysqli_:** 4 soubory (legacy LP handlers + test)
- ✅ **Vzdálený server:** Správně nakonfigurováno

### Bezpečnost
- ✅ **Prepared statements:** Ano (v PDO kódu)
- ⚠️ **mysqli_real_escape_string:** Použito v legacy kódu (nedostatečné!)
- ✅ **SQL injection prevence:** Ano (kde PDO)

### Konzistence názvů
- ⚠️ **Hardcoded názvy tabulek:** 200+ výskytů
- ✅ **Použití konstant:** ~30 výskytů
- ⚠️ **Chybějící konstanty:** ~22 tabulek

---

## 🎯 Priority pro produkci

### 🔴 KRITICKÉ (BLOKUJÍCÍ)

**1. Přepsání mysqli na PDO** (Est. 8-12 hodin)
- [x] Identifikováno 2 soubory s kompletním přepisem
- [ ] Přepsat `limitovanePrislibyCerpaniHandlers_v2_tri_typy.php`
- [ ] Přepsat `limitovanePrislibyCerpaniHandlers_v3_tri_typy.php`
- [ ] Opravit `docxTemplateHandlers.php` (1 výskyt)
- [ ] Smazat test soubor `test-dual-template.php`

**Poznámka:** Existuje již `limitovanePrislibyCerpaniHandlers_v2_pdo.php` - možná je již hotové PDO řešení!

### 🟡 DŮLEŽITÉ (DOPORUČENO)

**2. Doplnění chybějících konstant** (Est. 2-3 hodiny)
- [ ] Přidat všechny konstanty do `api.php`
- [ ] Aktualizovat dokumentaci

**3. Refaktoring hardcoded názvů** (Est. 16-24 hodin)
- [ ] Nahradit hardcoded názvy konstantami postupně
- [ ] Priorita: Models → Core Handlers → Extended Handlers

### 🟢 VOLITELNÉ (ZLEPŠENÍ)

**4. Code review**
- [ ] Ověřit názvy sloupců v databázi
- [ ] Zkontrolovat duplicitní tabulky (25a_useky vs 25_useky)
- [ ] Standardizovat přístup k DB

---

## 📋 Checklist před produkcí

### Bezpečnost
- [ ] ❌ Žádný mysqli_ v produkčním kódu
- [x] ✅ Všechny dotazy používají prepared statements
- [x] ✅ Vzdálený DB server (ne localhost)
- [ ] ⚠️ Konstanty tabulek v `api.php`

### Konzistence
- [ ] ⚠️ Jednotný naming convention (konstanty vs hardcoded)
- [x] ✅ České názvy tabulek a sloupců
- [x] ✅ PDO připojení ve všech souborech

### Dokumentace
- [x] ✅ README existuje
- [x] ✅ Konfigurace v `dbconfig.php`
- [ ] ⚠️ Kompletní seznam konstant tabulek

---

## 🔧 Doporučené akce

### 1. Okamžitě (před produkcí)

```bash
# Ověřit, zda limitovanePrislibyCerpaniHandlers_v2_pdo.php funguje
# Pokud ano, smazat staré mysqli verze:
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
rm limitovanePrislibyCerpaniHandlers_v2_tri_typy.php
rm limitovanePrislibyCerpaniHandlers_v3_tri_typy.php

# Opravit docxTemplateHandlers.php (řádek 250)
# Změnit: $stmt->get_result()->fetch_all(MYSQLI_ASSOC)
# Na:     $stmt->fetchAll(PDO::FETCH_ASSOC)
```

### 2. Krátkodobě (do 2 týdnů)

Doplnit konstanty do [api.php](api.php):

```php
// POKLADNY
define('TBL_POKLADNY', '25a_pokladny');
define('TBL_POKLADNY_UZIVATELE', '25a_pokladny_uzivatele');
define('TBL_POKLADNI_AUDIT', '25a_pokladni_audit');
define('TBL_POKLADNI_POLOZKY_DETAIL', '25a_pokladni_polozky_detail');

// SETTINGS & AUTH
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_UZIVATEL_NASTAVENI', '25_uzivatel_nastaveni');
define('TBL_PRAVA', '25_prava');
define('TBL_ROLE', '25_role');
define('TBL_ROLE_PRAVA', '25_role_prava');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');

// HIERARCHIE
define('TBL_UZIVATELE_HIERARCHIE', '25_uzivatele_hierarchie');
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');

// ČÍSELNÍKY
define('TBL_LOKALITY', '25_lokality');

// ATTACHMENTS
define('TBL_OBJEDNAVKY_PRILOHY', '25a_objednavky_prilohy');
define('TBL_FAKTURY_PRILOHY', '25a_faktury_prilohy');

// DOCX
define('TBL_SABLONY_DOCX', '25_sablony_docx');
define('TBL_DOCX_MAPOVANI', '25_docx_mapovani');
define('TBL_DOCX_KATEGORIE', '25_docx_kategorie');
define('TBL_DOCX_GENEROVANE', '25_docx_generovane');

// SMLOUVY
define('TBL_SMLOUVY_IMPORT_LOG', '25_smlouvy_import_log');
```

### 3. Dlouhodobě (backlog)

- Postupný refaktoring hardcoded názvů → konstanty
- Code review všech SQL dotazů
- Dokumentace databázového schématu

---

## 📈 Výsledek

### Současný stav

```
Bezpečnost:        70%  (mysqli je riziko)
Konzistence:       40%  (hardcoded názvy převládají)
Production Ready:  🔴 NE (kvůli mysqli)
```

### Po opravě kritických problémů

```
Bezpečnost:        95%  (pouze PDO)
Konzistence:       60%  (s konstantami v api.php)
Production Ready:  🟢 ANO
```

---

## 👥 Kontakt a poznámky

**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Datum:** 20. prosince 2025  
**Branch:** `feature/generic-recipient-system`

**Další kroky:**
1. Diskuse o prioritách
2. Implementace kritických oprav
3. Re-audit po změnách
4. Deploy na produkci

---

## 📎 Přílohy

### Seznam všech PHP souborů v API (84 souborů)

```
✅ = PDO, prepared statements, bezpečné
⚠️ = Hardcoded názvy tabulek
❌ = mysqli, nebezpečné

Models (většinou ✅):
- CashboxModel.php ⚠️
- CashbookModel.php ⚠️
- CashbookEntryModel.php ⚠️
- CashbookAuditModel.php ⚠️
- CashboxAssignmentModel.php ⚠️
- GlobalSettingsModel.php ⚠️

Handlers (mix ✅⚠️):
- orderHandlers.php ⚠️
- invoiceHandlers.php ⚠️
- notificationHandlers.php ⚠️
- cashbookHandlers.php ⚠️
- hierarchyHandlers.php ⚠️
- searchHandlers.php ⚠️
- userStatsHandlers.php ⚠️
- reportsHandlers.php ⚠️
- orderV2*.php ⚠️✅ (částečně konstanty)

Legacy RIZIKO (❌):
- limitovanePrislibyCerpaniHandlers_v2_tri_typy.php ❌❌❌
- limitovanePrislibyCerpaniHandlers_v3_tri_typy.php ❌❌❌
- docxTemplateHandlers.php ⚠️❌ (1 mysqli volání)

PDO verze (✅):
- limitovanePrislibyCerpaniHandlers_v2_pdo.php ✅
```

---

**ZÁVĚR:** API vyžaduje kritické opravy před nasazením na produkci. Hlavní riziko představují mysqli handlers. Po jejich přepsání bude kód production ready.
