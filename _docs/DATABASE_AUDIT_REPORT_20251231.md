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

### 🟡 UPOZORNĚNÍ

#### 2. Faktury Bez Objednávky (84 záznamů)

**Problém:** V tabulce `25a_objednavky_faktury` existuje 84 faktur s `objednavka_id = NULL`.

**Detail prvních 10 faktur:**
```
id  | fa_cislo_vema | objednavka_id | stav         | dt_vytvoreni       
----|---------------|---------------|--------------|-------------------
70  | 1974-Z-001    | NULL          | ZAEVIDOVANA  | 2025-12-06 20:53:21
71  | 1979          | NULL          | ZAEVIDOVANA  | 2025-12-06 20:55:37
72  | 1979          | NULL          | ZAEVIDOVANA  | 2025-12-06 20:58:26
73  | 1976          | NULL          | STORNO       | 2025-12-06 21:01:17
74  | 1974-0015     | NULL          | ZAEVIDOVANA  | 2025-12-06 21:05:29
77  | 987           | NULL          | ZAEVIDOVANA  | 2025-12-07 21:12:17
79  | 1974-0812     | NULL          | ZAEVIDOVANA  | 2025-12-08 12:05:15
81  | 9874          | NULL          | STORNO       | 2025-12-08 20:42:44
82  | 987           | NULL          | ZAPLACENO    | 2025-12-08 20:46:54
84  | 999-01        | NULL          | ZAEVIDOVANA  | 2025-12-08 22:23:32
```

**Poznámky:**
- Tyto faktury byly vytvořeny mezi 6. - 8. prosincem 2025
- Některé jsou ve stavu STORNO
- FK constraint `fk_faktury_prilohy_objednavka` **NEBRÁNÍ** NULL hodnotám
- Je potřeba ověřit, zda je to záměrné (např. faktury bez objednávky mohou být přípustné)

**Doporučení:**
- Pokud faktury MUSÍ mít objednávku, přidat NOT NULL constraint
- Pokud NULL je přípustné, ponechat jako je
- Provést analýzu business logiky

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

### 1. Faktury Bez Objednávky
- [ ] Analyzovat business logiku - jsou NULL objednávky přípustné?
- [ ] Pokud ne, přidat NOT NULL constraint
- [ ] Pokud ano, zdokumentovat použití

### 2. Monitoring
- [ ] Nastavit monitoring pro nové sirotčí záznamy
- [ ] Pravidelná kontrola referenční integrity
- [ ] Audit před každým deployment do produkce

### 3. Prevence
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

Všechny kritické chyby byly opraveny. Zůstává pouze upozornění na 84 faktur bez objednávky, což vyžaduje business analýzu.

**Důvěryhodnost dat:** ⚠️ **Střední** - Vyžaduje business validaci faktur
**Referenční integrita:** ✅ **Vysoká** - Všechny FK constraints opraveny
**Riziko ztráty dat:** ✅ **Nízké** - Sirotčí záznamy odstraněny, FK constraints aktivní
