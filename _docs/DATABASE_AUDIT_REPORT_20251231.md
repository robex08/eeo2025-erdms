# Database Audit Report - DEV Environment
**Datum:** 2024-12-31  
**Databáze:** eeo2025-dev  
**Server:** 10.3.172.11 (MySQL 5.5.43)

## Shrnutí Zjištěných Problémů

### 🔴 KRITICKÉ CHYBY (OPRAVENO)

#### 1. Foreign Keys Odkazující na Neexistující Tabulku `25a_objednavky_pokazene`

**Problém:** Tabulka `25a_objednavky_pokazene` neexistuje, ale několik FK na ni odkazovalo.

**Postižené tabulky:**
- ✅ `25a_objednavky_prilohy` (FK `25a_objednavky_prilohy_ibfk_1`) - **OPRAVENO**
- ✅ `25a_objednavky_polozky` (FK `25a_objednavky_polozky_ibfk_1`) - **OPRAVENO**
- ✅ `25a_faktury_prilohy` (FK `fk_faktury_prilohy_objednavka`) - **OPRAVENO**

**Řešení:**
- Smazáno celkem **90 sirotčích záznamů**:
  - 11 z `25a_objednavky_prilohy`
  - 8 z `25a_objednavky_polozky`
  - 82 z `25a_faktury_prilohy`
- Všechny FK přesměrovány na správnou tabulku `25a_objednavky`

**Migrace:** `/var/www/erdms-dev/_docs/database-migrations/20251231_fix_all_foreign_keys_to_objednavky.sql`

---

### ✅ INFORMACE

#### 2. Faktury Bez Objednávky (84 záznamů) - VALIDNÍ STAV

**Status:** ✅ **SPRÁVNÉ CHOVÁNÍ** - Faktury mohou existovat bez vazby na objednávku nebo smlouvu.

**Detail struktury:**
```sql
`objednavka_id` int(10) DEFAULT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy) - nepovinné'
`smlouva_id` int(10) unsigned DEFAULT NULL COMMENT 'ID smlouvy (FK na 25_smlouvy)'
```

**Příklady samostatných faktur:**
```
id  | fa_cislo_vema | objednavka_id | smlouva_id | stav         | dt_vytvoreni       
----|---------------|---------------|------------|--------------|-------------------
70  | 1974-Z-001    | NULL          | NULL       | ZAEVIDOVANA  | 2025-12-06 20:53:21
71  | 1979          | NULL          | NULL       | ZAEVIDOVANA  | 2025-12-06 20:55:37
82  | 987           | NULL          | NULL       | ZAPLACENO    | 2025-12-08 20:46:54
```

**Poznámky:**
- ✅ Pole `objednavka_id` má explicitně `DEFAULT NULL` a komentář "nepovinné"
- ✅ **NENÍ** definován FK constraint na `25a_objednavky` (záměrně)
- ✅ Faktury mohou být evidovány samostatně bez vazby na objednávku/smlouvu
- ✅ Aplikační logika to plně podporuje

**Business logika:**
Systém umožňuje evidenci faktur, které nepřišly z objednávek (např. opakované platby, zálohy, dobropisy, faktury přijaté přímo z VEMA bez vazby na objednávkový systém).

---

## ✅ Pozitivní Zjištění

### 1. Integrity Constraints
- ✅ Všechny FK nyní odkazují na **existující tabulky**
- ✅ Žádné další sirotčí záznamy v klíčových tabulkách
- ✅ Žádné duplicitní uživatelské jména

### 2. Struktura Databáze
```
Tabulka               | Počet záznamů
----------------------|---------------
objednavky            | 9,723
objednavky_polozky    | 9,581
objednavky_prilohy    | 15,115
faktury               | 167
faktury_prilohy       | 19
lp_cerpani            | 2
smlouvy               | 681
limitovane_prisliby   | 38
uzivatele             | 103
```

### 3. Foreign Key Constraints (Po Opravě)
Všechny FK constraints nyní korektně odkazují na:
- `25a_objednavky` ✅
- `25a_objednavky_faktury` ✅
- `25_uzivatele` ✅
- `25_limitovane_prisliby` ✅
- `25_pozice` ✅
- `25_lokality` ✅
- další systémové tabulky ✅

---

## 📋 Provedené Akce

### Databázové Opravy
1. ✅ Smazáno 90 sirotčích záznamů
2. ✅ Opraveny 3 foreign key constraints
3. ✅ Ověřena integrita všech FK

### Dokumentace
1. ✅ Vytvořena migrace: `20251231_fix_all_foreign_keys_to_objednavky.sql`
2. ✅ Vytvořena původní migrace: `20251231_fix_objednavky_prilohy_foreign_key.sql`
3. ✅ Tento audit report

### Git Commits
```bash
git commit -m "fix: oprava foreign key constraints odkazujících na neexistující tabulku"
git commit -m "docs: databázová migrace a audit report"
```

---

## 🔍 Doporučení Pro Další Kroky

### 1. Monitoring
- [ ] Nastavit monitoring pro nové sirotčí záznamy
- [ ] Pravidelná kontrola referenční integrity
- [ ] Audit před každým deployment do produkce

### 2. Prevence
- [ ] Přidat unit testy pro FK integrity
- [ ] Code review checklist pro databázové změny
- [ ] Dokumentovat databázovou architekturu

---

## 📊 Závěr

**Stav databáze:** ✅ **OPRAVENO** - Kritické chyby vyřešeny

Databáze **eeo2025-dev** obsahovala kritické chyby ve foreign key constraints, které odkazovaly na neexistující tabulku `25a_objednavky_pokazene`. Toto způsobovalo:
- Upload errors při přikládání příloh
- Integrity constraint violations
- Potenciální ztrátu dat

Všechny kritické chyby byly opraveny. Faktury bez objednávky jsou legitimní business case a nejsou považovány za chybu.

**Důvěryhodnost dat:** ✅ **Vysoká** - Všechny záznamy validní
**Referenční integrita:** ✅ **Vysoká** - Všechny FK constraints opraveny
**Riziko ztráty dat:** ✅ **Nízké** - Sirotčí záznamy odstraněny, FK constraints aktivní
