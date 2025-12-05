# 📋 Frontend implementace modulu SMLOUVY

**Datum:** 23. listopadu 2025  
**Verze:** 1.0  
**Status:** ✅ KOMPLETNÍ - připraveno k testování

---

## 📦 VYTVOŘENÉ SOUBORY

### API služby
- ✅ `/src/services/apiSmlouvy.js` - API komunikace s backendem

### React komponenty
- ✅ `/src/components/dictionaries/tabs/SmlouvyTab.js` - Hlavní komponenta
- ✅ `/src/components/dictionaries/tabs/SmlouvyFormModal.js` - Formulář pro vytvoření/editaci
- ✅ `/src/components/dictionaries/tabs/SmlouvyDetailModal.js` - Detail smlouvy
- ✅ `/src/components/dictionaries/tabs/SmlouvyImportModal.js` - Import z Excel/CSV

### Integrace
- ✅ `/src/pages/DictionariesNew.js` - Přidána záložka "Smlouvy"

---

## 🎯 FUNKCIONALITA

### ✅ Seznam smluv (SmlouvyTab)
- **Filtry:**
  - Fulltextové vyhledávání (číslo, název, firma)
  - Úsek
  - Druh smlouvy (SLUŽBY, KUPNÍ, RÁMCOVÁ)
  - Stav (AKTIVNI, UKONCENA, PRERUSENA, PRIPRAVOVANA)
  - Platnost od/do
  - Zobrazit neaktivní checkbox

- **Statistiky:**
  - Počet smluv celkem / aktivních
  - Celkem čerpáno
  - Celkový limit
  - Zbývá
  - Průměrné čerpání (%)

- **Tabulka:**
  - Číslo smlouvy
  - Firma, Název smlouvy
  - Úsek, Druh
  - Platnost
  - Hodnota s DPH
  - Čerpání (progress bar + procenta)
  - Stav (barevný badge)
  - Akce (Detail, Upravit, Smazat)

- **Tlačítka:**
  - ➕ Nová smlouva
  - 📥 Import z Excel
  - ♻️ Přepočítat čerpání
  - 🔍 Filtry

### ✅ Formulář smlouvy (SmlouvyFormModal)
- **Povinná pole:**
  - Číslo smlouvy
  - Úsek (dropdown)
  - Druh smlouvy (dropdown)
  - Název firmy
  - Název smlouvy
  - Platnost od/do
  - Hodnota s DPH

- **Nepovinná pole:**
  - IČO (validace 8 číslic)
  - DIČ
  - Popis smlouvy
  - Sazba DPH (dropdown: 0%, 12%, 21%)
  - Hodnota bez DPH (auto-výpočet)
  - Číslo DMS
  - Kategorie
  - Interní poznámka
  - Aktivní checkbox
  - Stav (dropdown)

- **Validace:**
  - Povinná pole
  - Formát IČO
  - Datum do > datum od
  - Kladná hodnota s DPH
  - Auto-přepočet DPH při změně hodnot

### ✅ Detail smlouvy (SmlouvyDetailModal)
- **Progress bar čerpání:**
  - Barevný gradient podle % čerpání
  - Zelená: 0-50%
  - Modrá: 50-75%
  - Oranžová: 75-90%
  - Červená: 90%+

- **Statistické karty:**
  - Čerpáno
  - Zbývá
  - Počet objednávek

- **Sekce:**
  - Základní údaje
  - Smluvní strana (firma, IČO, DIČ)
  - Platnost a finance
  - Dodatečné informace
  - Statistiky objednávek (průměr, max, min)
  - Seznam navázaných objednávek (tabulka)
  - Metadata (vytvoření, aktualizace, poslední přepočet)

- **Tlačítka:**
  - ✏️ Upravit
  - ♻️ Přepočítat čerpání (této smlouvy)

### ✅ Import z Excel/CSV (SmlouvyImportModal)
- **Upload:**
  - Drag & drop
  - File picker
  - Podporované formáty: .xlsx, .xls, .csv

- **Šablona:**
  - Tlačítko "Stáhnout šablonu"
  - Obsahuje vzorový záznam

- **Mapování sloupců:**
  - Číslo smlouvy
  - Úsek (zkratka)
  - Druh smlouvy
  - Název firmy
  - IČO, DIČ
  - Název smlouvy
  - Popis
  - Platnost od/do
  - Hodnota bez DPH / s DPH

- **Preview:**
  - Náhled prvních 10 řádků
  - Validační varování (chybějící pole)

- **Nastavení:**
  - Checkbox "Přepsat existující smlouvy"

- **Výsledky:**
  - Celkem řádků
  - Úspěšně importováno
  - Aktualizováno
  - Přeskočeno (duplicity)
  - Počet chyb
  - Seznam chybových záznamů (řádek + error)
  - Čas importu

---

## 🔗 API ENDPOINTY

Všechny endpointy na: `https://eeo.zachranka.cz/api.eeo/ciselniky/smlouvy/`

### 1. `POST /list`
Vrací seznam smluv s filtry
```javascript
{
  username, token,
  show_inactive, usek_id, druh_smlouvy, stav,
  search, platnost_od, platnost_do, limit, offset
}
```

### 2. `POST /detail`
Vrací detail smlouvy + objednávky + statistiky
```javascript
{ username, token, id }
```

### 3. `POST /insert`
Vytvoří novou smlouvu
```javascript
{ username, token, ...smlouvaData }
```

### 4. `POST /update`
Aktualizuje existující smlouvu
```javascript
{ username, token, id, ...smlouvaData }
```

### 5. `POST /delete`
Smaže smlouvu
```javascript
{ username, token, id }
```

### 6. `POST /bulk-import`
Hromadný import
```javascript
{
  username, token,
  data: [...],
  overwrite_existing: boolean
}
```

### 7. `POST /prepocet-cerpani`
Přepočítá čerpání
```javascript
{
  username, token,
  cislo_smlouvy: null, // nebo konkrétní číslo
  usek_id: null        // nebo ID úseku
}
```

---

## 🧪 TESTOVÁNÍ

### 1. Instalace závislostí
```bash
npm install xlsx
```

### 2. Kontrola importů
Ověřte že všechny importy fungují:
- `useAuth` context
- `SmartTooltip` komponenta
- `LoadingSpinner` komponenta
- `lucide-react` ikony

### 3. Testovací scénáře

#### Test 1: Seznam smluv
1. Otevřít Číselníky → záložka "Smlouvy"
2. Ověřit zobrazení tabulky
3. Vyzkoušet filtry
4. Ověřit statistiky v headeru

#### Test 2: Vytvoření smlouvy
1. Kliknout "Nová smlouva"
2. Vyplnit povinná pole
3. Vyzkoušet auto-výpočet DPH
4. Uložit
5. Ověřit v seznamu

#### Test 3: Editace smlouvy
1. Kliknout "Upravit" u smlouvy
2. Změnit hodnoty
3. Uložit
4. Ověřit změny

#### Test 4: Detail smlouvy
1. Kliknout "Detail" u smlouvy
2. Ověřit zobrazení všech sekcí
3. Zkontrolovat progress bar čerpání
4. Ověřit seznam objednávek

#### Test 5: Import z Excelu
1. Kliknout "Import z Excel"
2. Stáhnout šablonu
3. Vyplnit testovací data
4. Nahrát soubor
5. Ověřit preview
6. Spustit import
7. Zkontrolovat výsledky

#### Test 6: Přepočet čerpání
1. Kliknout "Přepočítat čerpání" v toolbar
2. Potvrdit dialog
3. Ověřit výsledek

---

## ⚙️ KONFIGURACE

### Environment variables
```
REACT_APP_API2_BASE_URL=https://eeo.zachranka.cz/api.eeo/
```

### Oprávnění (backend potřebuje implementovat)
- `CONTRACT_VIEW` - zobrazení smluv
- `CONTRACT_CREATE` - vytvoření smlouvy
- `CONTRACT_EDIT` - editace + přepočet čerpání
- `CONTRACT_DELETE` - mazání smlouvy
- `CONTRACT_IMPORT` - hromadný import

---

## 🐛 ZNÁMÉ ISSUES / TODO

### Závislosti na BE implementaci:
- [ ] Backend musí implementovat 7 API endpointů
- [ ] Backend musí vytvořit DB tabulky (`25_smlouvy`, `25_smlouvy_import_log`)
- [ ] Backend musí vytvořit stored procedure `sp_prepocet_cerpani_smluv`
- [ ] Backend musí zjistit strukturu pole `cislo_smlouvy` v tabulce `25a_objednavky`
- [ ] Backend musí přidat oprávnění do `25_prava`

### Frontend optimalizace (low priority):
- [ ] Přidat pagination pro seznam smluv (pokud > 1000)
- [ ] Přidat export smluv do Excel
- [ ] Přidat validaci IČO kontrolním součtem
- [ ] Přidat date range picker místo dvou inputů
- [ ] Přidat loading states pro všechny operace
- [ ] Přidat confirm dialogy pro delete
- [ ] Přidat notifikace místo alert()

---

## 📝 POZNÁMKY PRO VÝVOJÁŘE

### Struktura SmlouvyTab
```
SmlouvyTab (main)
├── Filters section (collapsible)
├── Statistics bar
├── Table with data
└── Modals (conditional render):
    ├── SmlouvyFormModal
    ├── SmlouvyDetailModal
    └── SmlouvyImportModal
```

### State management
- Komponenty používají lokální state (useState)
- Žádný Redux/MobX není potřeba
- Data se načítají z API při mount a po změnách
- useAuth context pro user/token

### Styling
- Emotion styled components
- Konzistentní s ostatními tabs v DictionariesNew
- Responsive design (grid, flexbox)
- Color scheme podle stávající palety

### Excel import
- Knihovna: XLSX.js
- Parsování: sheet_to_json
- Mapování sloupců: automatické + fallback na anglické názvy
- Validace: před odesláním na BE

---

## 🚀 DEPLOYMENT CHECKLIST

- [x] Vytvořit API služby
- [x] Implementovat hlavní tab
- [x] Implementovat formulář
- [x] Implementovat detail
- [x] Implementovat import
- [x] Integrovat do DictionariesNew
- [ ] **Backend implementace (čeká na BE tým)**
- [ ] Testování s reálnými daty
- [ ] Code review
- [ ] Merge do master

---

## 📧 KONTAKT

**Frontend:** Implementace HOTOVÁ ✅  
**Backend:** Čeká na implementaci podle `SMLOUVY-BACKEND-API-SPECIFICATION.md`  
**Dokumentace:** `/docs/SMLOUVY-*` soubory

---

**Poslední update:** 23. listopadu 2025  
**Status:** Připraveno k testování po dokončení BE
