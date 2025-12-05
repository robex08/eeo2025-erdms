# 📋 SMLOUVY - Dokumentace a implementační materiály

**Datum vytvoření:** 23. listopadu 2025  
**Verze:** 1.0  
**Status:** ✅ Připraveno k implementaci

---

## 🎯 PŘEHLED PROJEKTU

Implementace modulu **Smlouvy** do systému EEO 2025:
- Správa smluv v číselníkách
- Hromadný import z Excel/CSV
- Sledování čerpání ze smluv
- Dokončení sekce Limitované přísliby
- Budoucí hlídání čerpání v OrderForm

---

## 📚 DOKUMENTY V TOMTO BALÍKU

### 1. **SMLOUVY-KOMPLETNI-ANALYZA-A-NAVRH.md**
**Hlavní dokument** - Komplexní analýza a plán implementace

**Obsah:**
- 🎯 Zadání a požadavky
- 🗄️ Databázová struktura (3 tabulky)
- 🔌 API Endpointy (8 endpointů)
- 🎨 Frontend komponenty
- 📊 Limitované přísliby - dokončení sekce
- 🚦 Hlídání čerpání v OrderForm (budoucnost)
- 📝 Implementační plán (11-14 dní)
- 🔒 Oprávnění
- 📋 Checklisty pro backend a frontend tým

**Kdy použít:** Pro celkový přehled projektu, plánování, koordinaci týmů

---

### 2. **SMLOUVY-DB-SCHEMA-MYSQL55.sql**
**SQL skript** - Databázové schéma pro MySQL 5.5.43

**Obsah:**
```sql
-- 1. Tabulka 25_smlouvy (hlavní)
-- 2. Tabulka 25_smlouvy_import_log (historie importů)
-- 3. Rozšíření tabulky 25a_objednavky (pole cislo_smlouvy)
-- 4. Triggery pro automatický přepočet čerpání (na tabulce objednávek!)
-- 5. Inicializační data (demo)
-- 6. Pohledy (views)
-- 7. Indexy pro optimalizaci
-- 8. Oprávnění
-- 9. Stored procedures
-- 10. Kontrolní dotazy
```

**Kdy použít:** 
- Při vytváření tabulek v DB
- Pro migraci na produkci
- Jako referenční dokumentace struktury

**Jak použít:**
```bash
# DEV prostředí
mysql -u root -p eeo_dev < SMLOUVY-DB-SCHEMA-MYSQL55.sql

# PRODUKCE (opatrně!)
mysql -u root -p eeo_production < SMLOUVY-DB-SCHEMA-MYSQL55.sql
```

---

### 3. **SMLOUVY-BACKEND-API-SPECIFICATION.md**
**Backend API dokumentace** - Detailní specifikace pro backend tým

**Obsah:**
- 🌐 8 API endpointů s kompletními příklady
- 📥 Request/Response formáty
- 🔧 PHP implementace (kód snippety)
- ✅ Validace dat
- 🔒 Oprávnění a autorizace
- ⚠️ Error handling
- 📊 Performance optimalizace
- 🧪 Testování
- 📝 TODO checklist

**Endpointy:**
1. `POST /ciselniky/smlouvy/list` - Seznam smluv
2. `POST /ciselniky/smlouvy/detail` - Detail smlouvy
3. `POST /ciselniky/smlouvy/insert` - Vytvoření smlouvy
4. `POST /ciselniky/smlouvy/update` - Aktualizace smlouvy
5. `POST /ciselniky/smlouvy/delete` - Smazání smlouvy
6. `POST /ciselniky/smlouvy/bulk-import` - Hromadný import
7. `POST /ciselniky/smlouvy/prepocet-cerpani` - Přepočet čerpání
8. ~~`POST /ciselniky/smlouvy/prirad-objednavku`~~ - (deprecated - řešeno v OrderForm)

**Kdy použít:** 
- Při implementaci backend API
- Pro testování endpointů
- Jako referenční dokumentace

---

## 🚀 QUICK START

### Pro Backend vývojáře

1. **Přečíst:**
   - `SMLOUVY-KOMPLETNI-ANALYZA-A-NAVRH.md` (sekce Backend)
   - `SMLOUVY-BACKEND-API-SPECIFICATION.md` (celý dokument)

2. **Vytvořit databázi:**
   ```bash
   mysql -u root -p < SMLOUVY-DB-SCHEMA-MYSQL55.sql
   ```

3. **Implementovat API:**
   - Začít s `list` a `detail` endpointy
   - Pak `insert`, `update`, `delete`
   - Nakonec `bulk-import` a `prepocet-cerpani`

4. **Testovat:**
   - Unit testy pro validaci
   - Integrační testy pro flow
   - Performance testy pro import

### Pro Frontend vývojáře

1. **Přečíst:**
   - `SMLOUVY-KOMPLETNI-ANALYZA-A-NAVRH.md` (sekce Frontend)
   - Backend API spec pro pochopení endpointů

2. **Připravit API služby:**
   - Rozšířit `src/services/apiv2Dictionaries.js`
   - Přidat funkce pro všechny endpointy

3. **Implementovat komponenty:**
   - `SmlouvyTab.js` - hlavní tab
   - `SmlouvyTable.js` - tabulka
   - `SmlouvaFormModal.js` - formulář
   - `SmlouvyImportModal.js` - import

4. **Integrovat:**
   - Přidat tab do `DictionariesNew.js`
   - Nastavit ikony a navigaci
   - Ošetřit oprávnění

---

## 📊 ČASOVÝ PLÁN

| Fáze | Časový odhad | Priorita | Odpovědnost |
|------|--------------|----------|-------------|
| Backend DB + API | 3-4 dny | VYSOKÁ | Backend tým |
| Frontend číselníky | 4-5 dní | VYSOKÁ | Frontend tým |
| LP dokončení | 2 dny | STŘEDNÍ | Frontend + Backend |
| Hlídání v OrderForm | 2-3 dny | NÍZKÁ (má čas) | Frontend tým |
| Testování | 2 dny | STŘEDNÍ | Oba týmy |
| **CELKEM** | **11-14 dní** | | |

---

## 📋 CHECKLISTY

### Backend tým

#### Databáze
- [ ] Vytvořit tabulku `25_smlouvy`
- [ ] Vytvořit tabulku `25_smlouvy_import_log`
- [ ] Přidat pole `cislo_smlouvy` do tabulky `25a_objednavky` (pokud neexistuje)
- [ ] Vytvořit triggery pro automatický přepočet
- [ ] Vytvořit stored procedure `sp_prepocet_cerpani_smluv`
- [ ] Vytvořit pohledy (views)
- [ ] Migrace pro produkční DB

#### API Endpointy
- [ ] `POST /ciselniky/smlouvy/list`
- [ ] `POST /ciselniky/smlouvy/detail`
- [ ] `POST /ciselniky/smlouvy/insert`
- [ ] `POST /ciselniky/smlouvy/update`
- [ ] `POST /ciselniky/smlouvy/delete`
- [ ] `POST /ciselniky/smlouvy/bulk-import`
- [ ] `POST /ciselniky/smlouvy/prepocet-cerpani`
- [ ] ~~`POST /ciselniky/smlouvy/prirad-objednavku`~~ (deprecated - skip)

#### LP CRUD API
- [ ] `POST /ciselniky/limitovane-prisliby/insert`
- [ ] `POST /ciselniky/limitovane-prisliby/update`
- [ ] `POST /ciselniky/limitovane-prisliby/delete`

#### Oprávnění
- [ ] Přidat práva `SMLOUVY_*` do tabulky `25_prava`
- [ ] Přidat právo `LP_MANAGE`
- [ ] Implementovat kontroly oprávnění v API

#### Testování
- [ ] Unit testy validace
- [ ] Integrační testy flow
- [ ] Performance test importu 1000 smluv
- [ ] API dokumentace

---

### Frontend tým

#### API služby
- [ ] Rozšířit `apiv2Dictionaries.js` o funkce pro smlouvy
- [ ] Rozšířit o CRUD funkce pro LP
- [ ] TypeScript typy (pokud používáte)

#### Komponenty - Smlouvy
- [ ] `SmlouvyTab.js` - hlavní tab
- [ ] `SmlouvyTable.js` - tabulka se smlouvami
- [ ] `SmlouvaFormModal.js` - formulář create/edit
- [ ] `SmlouvyImportModal.js` - import z Excel/CSV
- [ ] `SmlouvaDetailModal.js` - detail s objednávkami

#### Komponenty - LP
- [ ] `LimitovanePrislibyTab.js` - tab v číselníkách
- [ ] CRUD formuláře pro LP
- [ ] Zobrazení 3 typů čerpání

#### Import funkcionalita
- [ ] Excel parser (XLSX.js)
- [ ] CSV parser
- [ ] Validace importovaných dat
- [ ] Náhled před importem
- [ ] Error handling a reporting

#### Integrace
- [ ] Přidat tab "Smlouvy" do `DictionariesNew.js`
- [ ] Přidat tab "Limitované přísliby" do `DictionariesNew.js`
- [ ] Ikony a navigace
- [ ] Oprávnění v UI (podmíněné zobrazení)

#### Budoucnost (má čas)
- [ ] `useCerpaniValidation` hook pro OrderForm
- [ ] Warning bannery v OrderForm
- [ ] Select pro výběr smlouvy
- [ ] Zobrazení zbývající částky
- [ ] Progress bary čerpání

---

## 🔗 SOUVISEJÍCÍ DOKUMENTY

V projektu již existují tyto dokumenty, které jsou relevantní:

1. **`API-LIMITOVANE-PRISLIBY-DOKUMENTACE-V3.md`**
   - Aktuální API dokumentace pro LP
   - Čtení stavu, přepočet, inicializace

2. **`BACKEND-LP-CERPANI-IMPLEMENTATION.md`**
   - Implementace 3 typů čerpání LP
   - Tabulka `25_limitovane_prisliby_cerpani`
   - SQL dotazy a logika

3. **`USER_MANAGEMENT_API_DOCUMENTATION.md`**
   - Správa oprávnění v systému
   - Struktura práv a rolí

4. **`apiv2Dictionaries.js`**
   - Existující API služby pro číselníky
   - Vzor pro implementaci nových funkcí

---

## 🎨 STRUKTURA DAT ZE SCREENSHOTU

Jak mapovat sloupce z obrázku do DB:

| Sloupec z obrázku | DB sloupec | Typ | Poznámka |
|-------------------|------------|-----|----------|
| ČÍSLO SML | `cislo_smlouvy` | VARCHAR(100) | Unikátní |
| ÚSEK | `usek_zkr` | VARCHAR(50) | Zkratka úseku |
| DRUH | `druh_smlouvy` | VARCHAR(100) | SLUŽBY, KUPNÍ, RÁMCOVÁ |
| NÁZEV FIRMY | `nazev_firmy` | VARCHAR(255) | Dodavatel |
| IČO | `ico` | VARCHAR(20) | 8 číslic |
| NÁZEV SML | `nazev_smlouvy` | VARCHAR(500) | Předmět smlouvy |
| POPIS SML | `popis_smlouvy` | TEXT | Detailní popis |
| DATUM OD | `platnost_od` | DATE | Platnost od |
| DATUM DO | `platnost_do` | DATE | Platnost do |
| HODNOTA | `hodnota_bez_dph` | DECIMAL(15,2) | Bez DPH |
| HODNOTA S DPH | `hodnota_s_dph` | DECIMAL(15,2) | S DPH |
| ČERPÁNÍ | `cerpano_celkem` | DECIMAL(15,2) | Agregované |

---

## 💡 TIPY PRO IMPLEMENTACI

### Backend

1. **Použít transaction** při bulk importu
2. **Triggery** automaticky přepočítají čerpání
3. **Stored procedure** pro hromadný přepočet
4. **Indexy** jsou klíčové pro performance
5. **Validace** IČO kontrolním součtem

### Frontend

1. **XLSX.js** pro parsing Excelu
2. **Validace** před importem (náhled)
3. **Progress bar** pro dlouhý import
4. **Error list** s čísly řádků
5. **Confirmation dialog** před smazáním

### Testování

1. **Import 1000 záznamů** - musí být rychlý
2. **Duplicitní čísla smluv** - musí hlásit chybu
3. **Triggery** - správně přepočítají čerpání
4. **Oprávnění** - nelze bez práva

---

## ❓ FAQ

### Q: Proč 3 tabulky místo jedné?

**A:** Separace zodpovědností:
- `25_smlouvy` - master data smluv
- `25_smlouvy_import_log` - auditní záznam importů
- `25a_objednavky.cislo_smlouvy` - vazba 1:N (pole v objednávce)

### Q: Jak funguje automatický přepočet čerpání?

**A:** Pomocí **triggerů** na tabulce `25a_objednavky` (při INSERT/UPDATE/DELETE objednávky se smlouvou):
- INSERT trigger → přepočítat
- UPDATE trigger → přepočítat
- DELETE trigger → přepočítat

Triggery jsou v SQL souboru.

### Q: Co když backend není hotový?

**A:** Frontend může:
1. Mockovat data
2. Použít `json-server` pro dev API
3. Implementovat UI bez API volání

### Q: Jak testovat import bez backendu?

**A:** Použít `console.log()` a zkontrolovat:
- Parsing souboru
- Validaci dat
- Náhled tabulky
- Error handling

### Q: Kdy implementovat hlídání v OrderForm?

**A:** Až po dokončení:
- Backend API smlouvy ✅
- Frontend číselníky smlouvy ✅
- LP dokončení ✅

Pak má smysl dělat hlídání čerpání.

---

## 📞 KONTAKT

**Otázky k implementaci?**
- Backend: [backend-team@example.com]
- Frontend: [frontend-team@example.com]
- Architekt: [architect@example.com]

**Git repository:**
```
Branch: feature/smlouvy-modul
```

---

## 📅 TIMELINE

```
Týden 1 (25.11 - 29.11):
├─ Backend: DB + základní API (list, detail, insert)
└─ Frontend: Příprava komponent

Týden 2 (2.12 - 6.12):
├─ Backend: Dokončení API (update, delete, import)
├─ Frontend: Smlouvy tab + import modal
└─ LP: Dokončení CRUD

Týden 3 (9.12 - 13.12):
├─ Testování
├─ Bugfixing
└─ Dokumentace pro uživatele

POZDĚJI (Q1 2026):
└─ Hlídání čerpání v OrderForm
```

---

## ✅ KRITÉRIA SPLNĚNÍ

Projekt je hotový, když:

- [x] ✅ Databázové tabulky vytvořeny a otestovány
- [x] ✅ Všech 8 API endpointů funguje
- [x] ✅ Frontend tab "Smlouvy" v číselníkách
- [x] ✅ Hromadný import z Excel/CSV funguje
- [x] ✅ LP tab v číselníkách s CRUD
- [x] ✅ Oprávnění správně fungují
- [x] ✅ Testy prošly (unit + integrační)
- [x] ✅ Dokumentace pro uživatele

---

**Verze:** 1.0  
**Status:** ✅ Připraveno k implementaci  
**Datum poslední aktualizace:** 23. listopadu 2025

---

**Hodně úspěchů při implementaci! 🚀**
