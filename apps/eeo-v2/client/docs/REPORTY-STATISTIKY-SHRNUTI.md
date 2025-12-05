# 📊 REPORTY & STATISTIKY - Shrnutí a Další Kroky

**Datum:** 27. listopadu 2025  
**Status:** READY TO START  

---

## ✅ CO BYLO VYTVOŘENO

### 1. Dokumentace

#### REPORTY-STATISTIKY-IMPLEMENTACNI-PLAN.md
**Komplexní implementační plán obsahující:**
- 📐 Architektura systému (strukturu složek, komponenty)
- 🔐 Návrh oprávnění (REPORT_VIEW, STATISTICS_VIEW, atd.)
- 🎨 Wireframes UI (Reporty + Statistiky)
- 🔌 API specifikace (endpointy pro reporty a statistiky)
- 🛠️ Implementační fáze (1-4)
- 📦 Závislosti a technologie
- 🧪 Testovací scénáře
- 📊 Priority reportů podle důležitosti

#### REPORTY-STATISTIKY-TECHNICKA-SPECIFIKACE.md
**Detailní technická specifikace obsahující:**
- 🎨 Frontend komponenty (kompletní kód)
  - ReportsPage.js
  - ComplianceReportsTab.js
  - ReportCard.js
  - ReportModal.js
  - ReportDataTable.js (s @tanstack/react-table)
- 🔌 Backend PHP endpoints (kompletní kód)
  - to-publish.php
  - lp-status.php
- 🎣 Custom React hooks (kompletní kód)
  - useReportData
  - useReportExport
- 📦 Services (reportsApi.js)
- 🎨 Styling patterns a theme colors
- ✅ Checklist pro implementaci

---

## 📋 ANALÝZA POŽADAVKŮ

### Z dokumentu REPORTY-STATISTIKY-NAVRH.md jsme identifikovali:

#### Kategorie 1: Reporty objednávek
- ⚠️ Objednávky ke zveřejnění (priorita: ⭐⭐⭐)
- 💰 Objednávky nad 50 000 Kč (priorita: ⭐⭐⭐)
- 📢 Zveřejněné objednávky (priorita: ⭐⭐)
- ❗ Fakturace vyšší než částka na kontrole (priorita: ⭐⭐)
- ⏪ Objednávky vytvořené po fakturaci (priorita: ⭐)
- ⚡ Faktury se splatností < 5 dní (priorita: ⭐⭐)
- ⏳ Objednávky čekající na schválení > 5 dní (priorita: ⭐⭐⭐)

#### Kategorie 2: Reporty rozpočtu a smluv
- 💰 Zbývající limit LP (priorita: ⭐⭐⭐)
- 📊 Aktuální čerpání LP (priorita: ⭐⭐⭐)
- 📋 Statistika akceptačních objednávek (priorita: ⭐⭐)
- 📈 Čerpání podle účtů/úseků (priorita: ⭐⭐)

#### Kategorie 3: Statistiky uživatelů
- 👤 Počet vytvořených objednávek na uživatele
- ✅ Počet schválených objednávek na uživatele
- ⏱️ Průměrná doba zpracování objednávky
- 📊 Aktivita uživatelů v čase

#### Kategorie 4: Analytické grafy
- 📈 Časové řady (vývoj v čase)
- 🥧 Koláčové grafy (rozdělení podle kategorií)
- 📊 Sloupcové grafy (srovnání období)

---

## 🎯 DOPORUČENÝ POSTUP IMPLEMENTACE

### FÁZE 1: Základy (2-3 dny) 🚀 **ZAČÍT TADY**

**Cíl:** Vytvořit funkční strukturu s právy a menu

#### Kroky:
1. **Databáze** (30 min)
   ```sql
   -- Vytvořit práva
   INSERT INTO prava (kod_prava, popis) VALUES
   ('REPORT_VIEW', 'Zobrazení reportů'),
   ('REPORT_EXPORT', 'Export reportů'),
   ('STATISTICS_VIEW', 'Zobrazení statistik'),
   ('STATISTICS_EXPORT', 'Export statistik');
   
   -- Přiřadit ADMIN roli
   INSERT INTO role_prava (role_id, pravo_id)
   SELECT r.id, p.id 
   FROM roles r, prava p
   WHERE r.nazev_role IN ('ADMIN', 'SUPERADMIN')
   AND p.kod_prava IN ('REPORT_VIEW', 'STATISTICS_VIEW', 'REPORT_EXPORT', 'STATISTICS_EXPORT');
   ```

2. **Frontend - Menu** (1 hodina)
   - Upravit `src/Layout.js` - přidat menu items
   - Ikony: `faChartBar` pro Reporty, `faChartLine` pro Statistiky

3. **Frontend - Routes** (30 min)
   - Upravit `src/App.js` - přidat routes
   - Import komponent ReportsPage, StatisticsPage

4. **Frontend - Placeholder komponenty** (2 hodiny)
   - Vytvořit `src/pages/ReportsPage.js` - s TABy
   - Vytvořit `src/pages/StatisticsPage.js` - s TABy
   - Použít kód z technické specifikace

5. **Testování** (1 hodina)
   - Otestovat viditelnost menu podle práv
   - Otestovat routing
   - Otestovat TAB navigaci

**Výstup:**
- ✅ Menu items viditelné pro uživatele s právy
- ✅ Routes fungují
- ✅ Placeholder stránky s TABy zobrazují "V přípravě"

---

### FÁZE 2: První reporty (5-7 dní)

**Cíl:** Implementovat 3 nejdůležitější reporty

#### Priority:
1. **Objednávky ke zveřejnění** (⭐⭐⭐)
2. **Objednávky nad 50k Kč** (⭐⭐⭐)
3. **Čerpání LP** (⭐⭐⭐)

#### Kroky:

**Backend** (2-3 dny):
1. Vytvořit `api.eeo/endpoints/reports/` strukturu
2. Implementovat `to-publish.php` (kód je ve specifikaci)
3. Implementovat `over-limit.php`
4. Implementovat `lp-status.php`
5. Otestovat API endpointy v Postmanu

**Frontend** (3-4 dny):
1. Vytvořit `src/services/reportsApi.js` (kód je ve specifikaci)
2. Vytvořit `src/hooks/useReportData.js` (kód je ve specifikaci)
3. Vytvořit `src/hooks/useReportExport.js` (kód je ve specifikaci)
4. Vytvořit společné komponenty:
   - `ReportCard.js`
   - `ReportModal.js`
   - `ReportFilterBar.js`
   - `ReportDataTable.js`
5. Implementovat `ComplianceReportsTab.js`
6. Otestovat celý flow (klik na report → modal → data → export)

**Výstup:**
- ✅ 3 funkční reporty
- ✅ Filtry fungují (období, úsek)
- ✅ Export do CSV funguje
- ✅ Data respektují oprávnění uživatele

---

### FÁZE 3: Statistiky (5-7 dní)

**Cíl:** Implementovat dashboard se základními statistikami

#### Kroky:

**Instalace** (10 min):
```bash
npm install recharts
```

**Backend** (2-3 dny):
1. Vytvořit `api.eeo/endpoints/statistics/` strukturu
2. Implementovat `overview.php` (základní metriky)
3. Implementovat `timeline.php` (časové řady)
4. Implementovat `users.php` (statistiky uživatelů)
5. Implementovat `departments.php` (statistiky úseků)

**Frontend** (3-4 dny):
1. Vytvořit `src/services/statisticsApi.js`
2. Vytvořit `src/hooks/useStatisticsData.js`
3. Vytvořit `src/hooks/useChartData.js`
4. Vytvořit komponenty:
   - `MetricsCard.js` (karta s metrikou)
   - `charts/TimeSeriesChart.js` (sloupcový/čárový)
   - `charts/PieChart.js` (koláčový)
   - `charts/BarChart.js` (horizontální)
5. Implementovat TABy:
   - `OverviewTab.js`
   - `UsersTab.js`
   - `DepartmentsTab.js`
   - `TrendsTab.js`

**Výstup:**
- ✅ Dashboard s 3-5 metrikami
- ✅ 3-5 grafů (čárové, sloupcové, koláčové)
- ✅ TABy fungují
- ✅ Export statistik do CSV

---

### FÁZE 4: Rozšíření (budoucnost)

**Pokročilé funkce:**
- Custom reporty (uživatel vytváří vlastní)
- Export do PDF
- Automatické reporty (plánované)
- Email notifikace
- Kontingeneční tabulky (pivot)

---

## 🔧 TECHNOLOGIE

### Již máme v projektu (využít!)
- ✅ `@tanstack/react-table` - pro tabulky
- ✅ `papaparse` - pro CSV export
- ✅ `@emotion/styled` - pro styling
- ✅ `@fortawesome` - pro ikony
- ✅ `axios` - pro API

### Potřebujeme doinstalovat
- 📦 `recharts` - pro grafy (nebo `chart.js react-chartjs-2`)

### Doporučení
- **Grafy:** `recharts` - lepší integrace s Reactem, jednodušší API
- **Tabulky:** `@tanstack/react-table` - už používáme v Orders25List
- **Export:** `papaparse` - už používáme

---

## 🎯 PRIORITY REPORTŮ

### Implementovat PRVNÍ (Fáze 2) ⭐⭐⭐
1. ⚠️ Objednávky ke zveřejnění
2. 💰 Objednávky nad 50 000 Kč
3. 💰 Čerpání LP (zbývající limit)

### Implementovat DRUHÉ (Fáze 2 rozšíření) ⭐⭐
4. ⏳ Objednávky čekající na schválení > 5 dní
5. 📢 Zveřejněné objednávky
6. ⚡ Faktury se splatností < 5 dní

### Implementovat POZDĚJI ⭐
7. ❗ Fakturace vyšší než částka na kontrole
8. ⏪ Objednávky vytvořené po fakturaci
9. 📋 Statistika akceptačních objednávek

---

## 📊 DATOVÉ ZDROJE

### Tabulky v databázi
- `orders25` - hlavní tabulka objednávek
- `users` - uživatelé
- `useky` - úseky/oddělení
- `ucty` - účty
- `lp` - limitované příslíby
- `dodavatele` - dodavatelé
- `roles`, `prava`, `role_prava` - oprávnění

### Existující API endpointy (využít!)
```javascript
POST /orders25/list       // Seznam objednávek s filtry
POST /orders25/stats      // Základní statistiky
POST /orders25/by-user    // Objednávky podle uživatele
```

**Strategie:** Kde možné, rozšířit existující endpointy místo vytváření nových

---

## 🔒 BEZPEČNOST - KRITICKÉ!

### Oprávnění musí být respektována VŽDY!

```javascript
// Uživatel s ORDER_VIEW_OWN
// → Vidí pouze své objednávky v reportech i statistikách

// Uživatel s ORDER_VIEW_ALL
// → Vidí všechny objednávky

// Backend MUSÍ kontrolovat oprávnění v KAŽDÉM endpointu!
```

### Kontrola v PHP endpointech
```php
// Vždy kontrolovat
if (!hasPermission($auth['user_id'], 'REPORT_VIEW')) {
    http_response_code(403);
    exit;
}

// Filtrovat data podle oprávnění
if (!hasPermission($auth['user_id'], 'ORDER_VIEW_ALL')) {
    $where[] = "vytvoril_user_id = ?";
    $params[] = $auth['user_id'];
}
```

---

## 🧪 TESTOVÁNÍ

### Testovací scénáře (Fáze 1)
```
1. Přihlásit se jako ADMIN
   ✅ Vidím "Reporty" v menu
   ✅ Vidím "Statistiky" v menu

2. Kliknout na "Reporty"
   ✅ Otevře se stránka s TABy
   ✅ TABy: Kontrolní, Rozpočet, Workflow, Majetek

3. Přihlásit se jako běžný uživatel
   ❌ Nevidím "Reporty" v menu (nemám právo)

4. Přiřadit právo REPORT_VIEW
   ✅ Vidím "Reporty" v menu
```

### Testovací scénáře (Fáze 2)
```
1. Otevřít "Reporty" → "Kontrolní"
   ✅ Vidím karty reportů
   ✅ Karty zobrazují počet záznamů

2. Kliknout na "Objednávky ke zveřejnění"
   ✅ Otevře se modal
   ✅ Vidím filtry (období, úsek)
   ✅ Vidím tabulku s daty

3. Změnit filtr "Období" na "Q4 2025"
   ✅ Data se aktualizují
   ✅ Počet záznamů se změní

4. Kliknout "Export CSV"
   ✅ Stáhne se CSV soubor
   ✅ CSV obsahuje data podle filtrů

5. Přihlásit se jako uživatel s ORDER_VIEW_OWN
   ✅ Vidím pouze své objednávky v reportu
```

---

## 📝 CHECKLIST PŘED ZAČÁTKEM

- [x] ✅ Analýza požadavků dokončena
- [x] ✅ Dokumentace připravena (implementační plán + technická specifikace)
- [ ] 📋 Schválení návrhu stakeholdery
- [ ] 📋 Alokace času vývojáře (12-15 dní)
- [ ] 📋 Příprava testovacích dat (dev/test prostředí)
- [ ] 📋 Review UI wireframes s UX týmem

---

## 🚀 DALŠÍ KROKY

### Pro začátek (NYNÍ):

1. **Projednat návrh** (30 min)
   - Schválit architekturu
   - Schválit priority reportů
   - Rozhodnout: recharts vs chart.js

2. **Připravit prostředí** (1 hodina)
   - Vytvořit dev/test databázi
   - Připravit testovací data
   - Nastavit API endpoint (dev)

3. **Začít s Fází 1** (2-3 dny)
   - SQL skripty → databáze
   - Layout.js → menu
   - App.js → routes
   - ReportsPage.js → placeholder

### Po dokončení Fáze 1:

4. **Review a testování** (0.5 dne)
   - Otestovat menu a routing
   - Otestovat oprávnění
   - Připravit se na Fázi 2

5. **Začít s Fází 2** (5-7 dní)
   - Backend API endpointy
   - Frontend komponenty
   - První 3 reporty

---

## 💡 TIPY PRO IMPLEMENTACI

### Performance
- Používat cache (existující `ordersCacheService`)
- Optimalizovat SQL (indexy!)
- Lazy loading grafů (načíst až když potřeba)

### UX
- Loading states pro API volání
- Error handling s friendly messages
- Prázdné stavy ("Žádná data k zobrazení")
- Tooltips pro nápovědu

### Kód kvalita
- Opakovaně použitelné komponenty
- Custom hooks pro business logiku
- JSDoc komentáře
- Console logging pro debug

---

## 📚 SOUVISEJÍCÍ DOKUMENTY

1. **REPORTY-STATISTIKY-NAVRH.md**
   - Původní analýza a požadavky od uživatelů

2. **REPORTY-STATISTIKY-IMPLEMENTACNI-PLAN.md**
   - Komplexní implementační plán
   - Architektura, API, fáze implementace

3. **REPORTY-STATISTIKY-TECHNICKA-SPECIFIKACE.md**
   - Detailní technická specifikace
   - Kompletní kód komponent, hooks, API

4. **BACKEND-USER-DETAIL-STATISTICS-API.md**
   - API pro statistiky uživatelů (již existuje)

5. **PERMISSIONS-VIEW-ANALYSIS.md**
   - Analýza oprávnění v systému

---

## ✅ VÝSTUPY

Po dokončení budeme mít:

### Fáze 1 (základy)
- ✅ Funkční menu s novými položkami
- ✅ Oprávnění v databázi
- ✅ Routes v aplikaci
- ✅ Placeholder stránky s TABy

### Fáze 2 (první reporty)
- ✅ 3 funkční reporty:
  - Objednávky ke zveřejnění
  - Objednávky nad 50k Kč
  - Čerpání LP
- ✅ Filtry (období, úsek)
- ✅ Export do CSV
- ✅ Respektování oprávnění

### Fáze 3 (statistiky)
- ✅ Dashboard s metrikami
- ✅ 3-5 grafů (časové řady, koláčové, sloupcové)
- ✅ TABy se statistikami
- ✅ Export statistik

---

## 🎉 ZÁVĚR

Máme kompletní dokumentaci pro implementaci systému Reportů a Statistik:

1. ✅ **Jasné požadavky** - víme co implementovat
2. ✅ **Architektura** - víme jak to sestavit
3. ✅ **Technická specifikace** - máme kód komponent
4. ✅ **API návrh** - víme jak bude backend fungovat
5. ✅ **Fázová implementace** - víme v jakém pořadí postupovat
6. ✅ **Testovací scénáře** - víme jak otestovat

**Jsme připraveni začít implementaci!** 🚀

---

**Připravil:** AI Assistant  
**Datum:** 27. listopadu 2025  
**Status:** ✅ READY TO START  
**Odhadovaný čas:** 12-15 dní (full-time developer)
