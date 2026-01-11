# Analýza pro vyčištění produkční databáze eeo2025

**Datum:** 20. prosince 2025  
**Účel:** Příprava produkční databáze na první reálný test (4.1.2026)

---

## 📊 KATEGORIZACE TABULEK

### ✅ ČÍSELNÍKY - NEMAZAT (obsahují konfigurační data)

```sql
-- Základní číselníky
25_pozice                           -- Pozice uživatelů (ředitel, vedoucí, ...)
25_ciselnik_stavy                   -- Stavy objednávek
25_useky                            -- Úseky/oddělení
25_lokality                         -- Lokality/místa
25_role                             -- Role v systému
25_prava                            -- Definice práv
25_dodavatele                       -- Seznam dodavatelů

-- Číselníky smluv
druh_smlouvy                        -- Druhy smluv
garant                              -- Garanti smluv

-- Geo data
okresy                              -- Seznam okresů
map_okresy                          -- Mapování okresů

-- Šablony a konfigurace
25_sablony_docx                     -- DOCX šablony
25_sablony_objednavek               -- Šablony objednávek
25_notifikace_sablony               -- Šablony notifikací
25_notifikace_typy_udalosti         -- Typy událostí pro notifikace

-- Globální nastavení
25a_nastaveni_globalni              -- Globální nastavení aplikace

-- Legacy číselníky
umisteni                            -- Umístění
locations                           -- Lokality (legacy)
menu                                -- Definice menu
```

### 🗑️ DATOVÉ TABULKY - VYČISTIT (obsahují uživatelská/testovací data)

```sql
-- Objednávky EEO v2
25a_objednavky                      -- Hlavní tabulka objednávek
25a_objednavky_polozky              -- Položky objednávek
25a_objednavky_prilohy              -- Přílohy k objednávkám
25a_objednavky_faktury              -- Faktury
25a_faktury_prilohy                 -- Přílohy faktur

-- Pokladny
25a_pokladny                        -- Definice pokladen
25a_pokladny_uzivatele              -- Uživatelé pokladen
25a_pokladni_knihy                  -- Pokladní knihy
25a_pokladni_polozky                -- Položky v pokladně
25a_pokladni_polozky_detail         -- Detail položek
25a_pokladni_audit                  -- Audit operací

-- Smlouvy
25_smlouvy                          -- Smlouvy
25_smlouvy_import_log               -- Log importů smluv

-- Limitované přísliby
25_limitovane_prisliby              -- Přísliby rozpočtu
25_limitovane_prisliby_cerpani      -- Čerpání příslibů
25_limitovane_prisliby_zaloha       -- Zálohy příslibů

-- Notifikace (runtime data)
25_notifikace                       -- Odeslané notifikace
25_notifikace_fronta                -- Fronta k odeslání
25_notifikace_audit                 -- Audit notifikací
25_notifikace_precteni              -- Přečtené notifikace

-- Chat (runtime data)
25_chat_konverzace                  -- Konverzace
25_chat_zpravy                      -- Zprávy
25_chat_ucastnici                   -- Účastníci chatu
25_chat_reakce                      -- Reakce na zprávy
25_chat_prectene_zpravy             -- Přečtené zprávy
25_chat_online_status               -- Online status
25_chat_mentions                    -- Zmínky v chatu

-- Audit a logy
25_auditni_zaznamy                  -- Auditní záznamy
25_spisovka_zpracovani_log          -- Log zpracování spisovky
debug_api_log                       -- Debug API logů
debug_notification_log              -- Debug notifikací

-- Spisovka/dokumenty
pripojene_dokumenty                 -- Připojené dokumenty
pripojene_mdokumenty                -- M-dokumenty
pripojene_odokumenty                -- O-dokumenty
```

### ⚠️ UŽIVATELÉ - SPECIÁLNÍ OŠETŘENÍ

```sql
25_uzivatele                        -- Uživatelé (ponechat adminy/testovací)
25_uzivatele_role                   -- Role uživatelů
25_uzivatele_poznamky               -- Poznámky k uživatelům
25_uzivatel_nastaveni               -- Nastavení uživatelů
25_notifikace_uzivatele_nastaveni   -- Nastavení notifikací
25_hierarchie_profily               -- Hierarchie profilů
```

**DOPORUČENÍ:** Ponechat 1-2 admin účty pro testování, smazat ostatní testovací.

### 🚫 LEGACY/BACKUP TABULKY - IGNOROVAT (nemazat, netýká se v2)

```sql
-- Staré objednávky
objednavky                          -- Legacy objednávky
objednavky0103                      -- Backup
objednavky0103bck0121               -- Backup
objednavky0121                      -- Backup
objednavky0121sss                   -- Backup
objednavky0123                      -- Backup
objednavky0123_bck14032024          -- Backup
objednavky_bck23                    -- Backup

-- Staré připojené dokumenty
pripojene_odokumenty0103            -- Legacy backup
pripojene_odokumenty0121            -- Legacy backup
pripojene_odokumenty0123            -- Legacy backup

-- Reporting tabulky (readonly)
r_LP                                -- Reporting
r_LP_old                            -- Reporting old
r_objMetaData                       -- Reporting metadata
r_objednavky                        -- Reporting objednávky
r_pripojene_odokumenty              -- Reporting dokumenty
r_userRoles                         -- Reporting role

-- Legacy tabulky
smlouvy                             -- Legacy smlouvy (máme 25_smlouvy)
partner                             -- Legacy partneři
parnteri_duplicity                  -- Legacy duplicity
majetek                             -- Legacy majetek
majetek_duvod                       -- Legacy důvody majetku
users                               -- Legacy users (máme 25_uzivatele)
groups                              -- Legacy groups
user_location                       -- Legacy user location
rights                              -- Legacy rights (máme 25_prava)
```

---

## 🎯 DOPORUČENÁ STRATEGIE ČIŠTĚNÍ

### Fáze 1: Bezpečné vymazání runtime dat
- Chat zprávy, notifikace, audit logy
- Tyto data nejsou kritická a lze je kdykoliv smazat

### Fáze 2: Vymazání testovacích objednávek
- Objednávky a jejich vazby (položky, přílohy, faktury)
- **POZOR:** Smazat CASCADE všechny vazby

### Fáze 3: Vyčištění uživatelů
- Ponechat 1-2 admin účty
- Smazat testovací účty
- Zachovat vazby admin účtů

### Fáze 4: Vymazání pokladen a smluv
- Testovací pokladny a jejich data
- Testovací smlouvy

### Fáze 5: Reset AUTO_INCREMENT
- Všechny vyčištěné tabulky resetovat na 1

---

## ⚠️ BEZPEČNOSTNÍ KONTROLY

Před spuštěním SQL scriptu:

1. ✅ Backup celé databáze
2. ✅ Otestovat na DEV databázi
3. ✅ Zkontrolovat foreign key constraints
4. ✅ Připravit rollback plán
5. ✅ Informovat tým o plánovaném čištění

---

## 📝 POZNÁMKY

- **První čištění:** Nyní (20.12.2025) - příprava na test
- **Druhé čištění:** 4.1.2026 - před ostrým spuštěním
- Script musí být idempotentní (lze spustit opakovaně)
- Všechny DELETE operace budou s WHERE klauzulí pro bezpečnost
