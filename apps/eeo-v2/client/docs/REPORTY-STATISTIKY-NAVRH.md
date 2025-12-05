# 📊 NÁVRH: Reporty a Statistiky - Analýza a Implementační Plán

**Datum:** 27. listopadu 2025  
**Status:** DRAFT - K projednání  
**Autor:** Analýza systému a požadavků uživatelů

---

## 🎯 ZADÁNÍ

### Požadavky
1. Vytvořit nové menuítemy v hlavním menu za "Přehled objednávek":
   - **Reporty** 
   - **Statistiky** (zatím "V přípravě")

2. Vytvořit systém oprávnění:
   - `REPORT_MANAGE` (nebo podobně)
   - `STATISTICS_MANAGE` (nebo podobně)

3. Reporty a Statistiky budou vycházet z objednávek:
   - Počty, částky, čerpání ze smluv
   - Statistiky na hlavu uživatelů (kdo kolik vytvořil, schválil)
   - Různé filtry a pohledy

---

## 📋 ANALÝZA SOUČASNÉHO STAVU

### Existující struktura menu (Layout.js)
Aktuální pořadí v hlavním menu (levá část):
1. **Nová objednávka** (`/order-form-25`) - Dostupné pro všechny přihlášené
2. **Přehled objednávek** (`/orders25-list`) - Podmínka: `ORDER_MANAGE` nebo `ORDER_2025`
3. **Adresář** (`/address-book`) - Podmínka: `CONTACT_MANAGE`
4. **Uživatelé** (`/users`) - Podmínka: `USER_MANAGE`
5. **Objednávky před 2026** (`/orders`) - Podmínka: `ORDER_MANAGE` nebo `ORDER_OLD`
6. **Pokladní kniha** (`/cash-book`) - Podmínka: Admin/SuperAdmin nebo `CASH_BOOK_*` práva
7. **Číselníky** (`/dictionaries`) - Podmínka: `SETTINGS_MANAGE`
8. **Debug** (`/debug`) - Podmínka: Role `SUPERADMIN`

### Existující permissions pattern
Systém používá konzistentní vzor pojmenování:
- `<ENTITA>_<AKCE>` - např. `ORDER_MANAGE`, `USER_MANAGE`, `CONTACT_MANAGE`
- `<ENTITA>_<AKCE>_<SCOPE>` - např. `ORDER_EDIT_ALL`, `ORDER_EDIT_OWN`
- Speciální práva: `SETTINGS_MANAGE`, `CASH_BOOK_MANAGE`

### Současná práva v systému (identifikovaná)
```
ORDER_*:
- ORDER_MANAGE (globální správa objednávek)
- ORDER_2025 (přístup k novému systému objednávek)
- ORDER_OLD (přístup ke starému systému objednávek)
- ORDER_CREATE, ORDER_EDIT, ORDER_APPROVE
- ORDER_*_ALL, ORDER_*_OWN (editace, mazání, čtení)

USER_*:
- USER_MANAGE

CONTACT_*:
- CONTACT_MANAGE
- CONTACT_READ
- CONTACT_EDIT

CASH_BOOK_*:
- CASH_BOOK_MANAGE
- CASH_BOOK_READ_ALL, CASH_BOOK_READ_OWN
- CASH_BOOK_EDIT_ALL, CASH_BOOK_EDIT_OWN
- CASH_BOOK_DELETE_ALL, CASH_BOOK_DELETE_OWN
- CASH_BOOK_EXPORT_ALL, CASH_BOOK_EXPORT_OWN
- CASH_BOOK_CREATE

SETTINGS_*:
- SETTINGS_MANAGE (číselníky)
```

---

## 📊 KATEGORIZACE POŽADAVKŮ OD UŽIVATELŮ

### KATEGORIE 1: REPORTY OBJEDNÁVEK
**Zaměření:** Přehledy a seznamy objednávek s pokročilým filtrováním

#### 1.1 Kontrolní reporty (Compliance)
- ✅ **Objednávky ke zveřejnění** - objednávky, které se mají zveřejnit, ale ještě nejsou
- ✅ **Objednávky nad 50 000 Kč bez DPH** - hlídání limitů
- ✅ **Zveřejněné objednávky** - podle ID zveřejnění
- ✅ **Fakturace vyšší než částka na kontrole** - nesrovnalosti mezi objednávkou a fakturou
- ✅ **Objednávky vytvořené po fakturaci** - zpětné objednávky (rizikové)
- ✅ **Faktury se splatností kratší než 5 dní** - urgentní platby

#### 1.2 Workflow reporty
- ✅ **Objednávky čekající na potvrzení > 5 dní** - zaseknuté v workflow
- ✅ **Objednávky podle stavů** - přehled rozpracovaných objednávek

#### 1.3 Majetkové reporty
- ✅ **Objednávky vztahující se k majetku** - filtr podle druhu objednávky "majetek"

---

### KATEGORIE 2: REPORTY ROZPOČTU A SMLUV
**Zaměření:** Finanční přehledy, čerpání limitů

#### 2.1 Limitované příslíby (LP)
- ✅ **Zbývající limit LP** - podle účtů a úseků (v Kč i v %)
- ✅ **Aktuální čerpání LP** - v Kč i v %
- ✅ **Statistika akceptačních objednávek** - kolik jich chybí, za jaké období

#### 2.2 Rozpočtové přehledy
- ✅ **Čerpání podle účtů** - agregované sumy
- ✅ **Čerpání podle úseků** - agregované sumy
- ✅ **Čerpání podle období** - časové řady

---

### KATEGORIE 3: STATISTIKY UŽIVATELŮ
**Zaměření:** Produktivita, analýza aktivit

#### 3.1 Produktivita uživatelů
- ✅ **Počet vytvořených objednávek na uživatele**
- ✅ **Počet schválených objednávek na uživatele**
- ✅ **Průměrná doba zpracování objednávky na uživatele**
- ✅ **Aktivita uživatelů v čase** - grafy časových řad

#### 3.2 Výkonnost týmů
- ✅ **Statistiky podle úseků** - produktivita celých oddělení
- ✅ **Srovnání výkonnosti** - mezi úseky, uživateli

---

### KATEGORIE 4: ANALYTICKÉ GRAFY A TABULKY
**Zaměření:** Vizualizace dat, trendy

#### 4.1 Grafy
- ✅ **Časové řady** - vývoj počtu objednávek, částek v čase
- ✅ **Koláčové grafy** - rozdělení podle kategorií (účty, úseky, dodavatelé)
- ✅ **Sloupcové grafy** - srovnání období, uživatelů, úseků

#### 4.2 Kontingeneční tabulky
- ✅ **Křížové tabulky** - např. uživatel × měsíc, úsek × kategorie
- ✅ **Pivot tabulky** - interaktivní analýzy

---

## 🎨 NÁVRH STRUKTURY MENU

### Varianta A: Dvě samostatné položky menu (DOPORUČENO)
```
Menu:
├── Nová objednávka
├── Přehled objednávek
├── 📊 Reporty            ← NOVÉ
├── 📈 Statistiky         ← NOVÉ
├── Adresář
├── Uživatelé
├── ...
```

**Výhody:**
- ✅ Jasné oddělení funkcionalit
- ✅ Konzistentní s existující strukturou menu
- ✅ Snadná navigace
- ✅ Možnost různých oprávnění pro Reporty a Statistiky

**Nevýhody:**
- ⚠️ Zabírá více místa v menu

---

### Varianta B: Jedna položka s podmenu
```
Menu:
├── Nová objednávka
├── Přehled objednávek
├── 📊 Analýzy           ← NOVÉ (dropdown)
│   ├── Reporty
│   └── Statistiky
├── Adresář
├── ...
```

**Výhody:**
- ✅ Úspora místa v menu
- ✅ Logické seskupení analytických nástrojů

**Nevýhody:**
- ⚠️ Systém aktuálně nepoužívá dropdown menu
- ⚠️ Vyžaduje přepracování Layout.js
- ⚠️ Složitější implementace

---

## 🔐 NÁVRH OPRÁVNĚNÍ

### Varianta 1: Samostatná práva (DOPORUČENO)

```javascript
// Základní práva pro přístup
REPORT_VIEW          // Zobrazení reportů
REPORT_EXPORT        // Export reportů do CSV/PDF
STATISTICS_VIEW      // Zobrazení statistik
STATISTICS_EXPORT    // Export statistik

// Administrátorská práva
REPORT_MANAGE        // Správa reportů (vytváření vlastních reportů)
STATISTICS_MANAGE    // Správa statistik (vytváření dashboardů)
```

**Logika přístupu:**
- `REPORT_VIEW` → Vidí základní sadu reportů
- `REPORT_EXPORT` → Může exportovat data z reportů
- `REPORT_MANAGE` → Může vytvářet vlastní reporty (advanced)
- Podobně pro `STATISTICS_*`

**Implementace v kódu:**
```javascript
// Layout.js - menu
{ hasPermission && hasPermission('REPORT_VIEW') && (
  <MenuLinkLeft to="/reports" $active={isActive('/reports')}>
    <FontAwesomeIcon icon={faChartBar} /> Reporty
  </MenuLinkLeft>
) }

{ hasPermission && hasPermission('STATISTICS_VIEW') && (
  <MenuLinkLeft to="/statistics" $active={isActive('/statistics')}>
    <FontAwesomeIcon icon={faChartLine} /> Statistiky
  </MenuLinkLeft>
) }

// App.js - routes
{isLoggedIn && hasPermission && hasPermission('REPORT_VIEW') && 
  <Route path="/reports" element={<ReportsPage />} />
}
{isLoggedIn && hasPermission && hasPermission('STATISTICS_VIEW') && 
  <Route path="/statistics-new" element={<StatisticsPage />} />
}
```

---

### Varianta 2: Hierarchická práva

```javascript
// Základní přístup
ANALYTICS_VIEW       // Přístup k analytické sekci obecně
ANALYTICS_EXPORT     // Export dat z analýz

// Specifická práva
ANALYTICS_REPORT_*   // Konkrétní reporty
ANALYTICS_STAT_*     // Konkrétní statistiky

// Admin práva
ANALYTICS_MANAGE     // Správa analytických nástrojů
```

**Výhody:**
- ✅ Více granulární kontrola
- ✅ Možnost přidělovat práva po jednotlivých reportech

**Nevýhody:**
- ⚠️ Složitější správa
- ⚠️ Více práv = více complexity

---

## 📱 NÁVRH UŽIVATELSKÉHO ROZHRANÍ

### Reporty - Struktura s TABy

```
┌─────────────────────────────────────────────────────────┐
│  📊 REPORTY                                              │
├─────────────────────────────────────────────────────────┤
│  [Kontrolní] [Rozpočet] [Majetek] [Workflow]            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📋 Objednávky ke zveřejnění                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Filtry:                                           │  │
│  │ [Období: ▼] [Úsek: ▼] [Částka od-do]            │  │
│  │ [🔍 Hledat] [📥 Export CSV]                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Tabulka výsledků                                  │  │
│  │ [ID] [Datum] [Dodavatel] [Částka] [Stav] [Akce] │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  💡 Nalezeno: 23 objednávek                            │
└─────────────────────────────────────────────────────────┘
```

**TABy v Reportech:**
1. **Kontrolní** - compliance reporty (zveřejnění, limity)
2. **Rozpočet** - LP, čerpání, sumy
3. **Majetek** - majetkové objednávky
4. **Workflow** - zaseknuté objednávky, stavy

---

### Statistiky - Dashboard s GRAFY

```
┌─────────────────────────────────────────────────────────┐
│  📈 STATISTIKY                                           │
├─────────────────────────────────────────────────────────┤
│  [Přehled] [Uživatelé] [Úseky] [Trendy]                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 📊 Celkem        │  │ 💰 Celková částka│            │
│  │                  │  │                  │            │
│  │   1,234 obj.     │  │   12,5 mil. Kč   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📊 Vývoj počtu objednávek v čase                 │  │
│  │ [Sloupcový graf: měsíc × počet]                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────┐   │
│  │ 🥧 Rozdělení podle │  │ 👥 Top 10 uživatelů     │   │
│  │    úseků           │  │    (počet objednávek)   │   │
│  │ [Koláčový graf]    │  │ [Horizontální bar]      │   │
│  └────────────────────┘  └─────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**TABy ve Statistikách:**
1. **Přehled** - základní metriky, agregované sumy
2. **Uživatelé** - produktivita, aktivita jednotlivých uživatelů
3. **Úseky** - výkonnost týmů, srovnání oddělení
4. **Trendy** - časové řady, vývoj v čase

---

## 🛠️ TECHNICKÁ IMPLEMENTACE

### Fáze 1: Základní struktura (NYNÍ)
```
1. ✅ Vytvořit práva v databázi:
   - REPORT_VIEW
   - REPORT_EXPORT
   - STATISTICS_VIEW
   - STATISTICS_EXPORT

2. ✅ Přidat do menu (Layout.js):
   - MenuItem "Reporty" s podmínkou REPORT_VIEW
   - MenuItem "Statistiky" s podmínkou STATISTICS_VIEW
   
3. ✅ Vytvořit route v App.js:
   - /reports
   - /statistics-new (aby nekolidovalo s existující /statistics)
   
4. ✅ Vytvořit prázdné komponenty s "V přípravě":
   - src/pages/ReportsPage.js
   - src/pages/StatisticsPage.js
   
5. ✅ Aktualizovat availableSections.js:
   - Přidat 'reports' a 'statistics' do seznamu sekcí
```

### Fáze 2: Reporty - První implementace
```
1. 📋 Vytvořit TAB strukturu v ReportsPage.js:
   - Kontrolní, Rozpočet, Majetek, Workflow
   
2. 📋 Implementovat první reporty:
   - Objednávky ke zveřejnění
   - Objednávky nad 50k Kč
   - Zveřejněné objednávky
   
3. 📋 Společné komponenty:
   - ReportFilterBar (filtry: období, úsek, částka)
   - ReportDataTable (tabulka s řazením, stránkováním)
   - ReportExportButton (export do CSV)
```

### Fáze 3: Statistiky - Dashboard
```
1. 📈 Vytvořit TAB strukturu v StatisticsPage.js
   
2. 📈 Základní metriky:
   - Celkový počet objednávek
   - Celková částka
   - Průměrná hodnota objednávky
   
3. 📈 Grafy (knihovna: recharts nebo chart.js):
   - Časové řady
   - Koláčové grafy
   - Sloupcové grafy
   
4. 📈 Kontingeneční tabulky:
   - React-pivottable nebo vlastní implementace
```

### Fáze 4: Pokročilé funkce
```
1. 🔧 Custom reporty:
   - Uživatelé s REPORT_MANAGE mohou vytvářet vlastní reporty
   - Ukládání filtrů a konfigurací
   
2. 🔧 Export do PDF:
   - Kromě CSV i PDF export
   
3. 🔧 Automatické reporty:
   - Plánované generování reportů (např. každý týden)
   - Email notifikace
```

---

## 📊 DATOVÝ ZDROJ

Všechny reporty a statistiky budou vycházet z:
- **Tabulka objednávky** (`orders25`)
- **Tabulka uživatelé** (`users`)
- **Tabulka účty** (`accounts`)
- **Tabulka úseky** (`departments`)
- **Tabulka smlouvy** (`contracts`)
- **Tabulka limitované příslíby** (`lp`)

API endpointy (existující nebo nové):
```javascript
// Existující
POST /orders25/list           // Všechny objednávky
POST /orders25/detail/:id     // Detail objednávky

// Nové (budou potřeba)
POST /reports/to-publish      // Objednávky ke zveřejnění
POST /reports/over-limit      // Objednávky nad limit
POST /reports/budget-summary  // Souhrnné čerpání rozpočtu
POST /reports/lp-status       // Stav LP

POST /statistics/user-stats   // Statistiky uživatelů
POST /statistics/department   // Statistiky úseků
POST /statistics/timeline     // Časové řady
```

---

## 🎯 DOPORUČENÍ PRO IMPLEMENTACI

### Priority:
1. **VYSOKÁ** - Fáze 1: Menu, práva, základní komponenty
2. **STŘEDNÍ** - Fáze 2: První reporty (kontrolní)
3. **STŘEDNÍ** - Fáze 3: Základní statistiky
4. **NÍZKÁ** - Fáze 4: Pokročilé funkce

### Postup:
1. ✅ **NYNÍ** - Vytvořit strukturu menu, práva, prázdné komponenty
2. ⏳ **PŘÍŠTĚ** - Implementovat první 3-5 reportů (podle priorit uživatelů)
3. ⏳ **POZDĚJI** - Přidat grafy a statistiky
4. ⏳ **BUDOUCNOST** - Custom reporty, automatizace

### Technologie:
- **Grafy:** `recharts` (React friendly, dobrá dokumentace)
- **Tabulky:** Stávající `@tanstack/react-table` (už používáme v Orders25List)
- **Export:** `papaparse` pro CSV (už používáme)
- **PDF:** `jspdf` + `jspdf-autotable` (pokud bude potřeba)
- **Pivot tabulky:** `react-pivottable` (pokud bude potřeba)

---

## 💡 OTÁZKY K DISKUZI

1. **Oprávnění:**
   - Chceme samostatná práva `REPORT_VIEW` + `STATISTICS_VIEW`, nebo jedno společné `ANALYTICS_VIEW`?
   - Potřebujeme granulární práva pro jednotlivé reporty?

2. **Menu:**
   - Varianta A (dvě položky) nebo B (dropdown)?
   - Pořadí v menu - za "Přehled objednávek" je OK?

3. **Priorita reportů:**
   - Které reporty jsou nejdůležitější? Implementovat jako první?
   - Kontrolní > Rozpočet > Workflow > Majetek?

4. **Statistiky:**
   - Které grafy jsou prioritní?
   - Potřebujeme interaktivní dashboardy nebo stačí statické reporty?

5. **Export:**
   - CSV je OK nebo potřebujeme i PDF/Excel?

6. **Backend:**
   - Budeme potřebovat nové API endpointy nebo dokážeme použít stávající?
   - Výpočty na frontendu nebo backendu?

---

## 📝 POZNÁMKY

- Reporty a Statistiky budou **read-only** - žádné editace, pouze zobrazení a export
- Všechna data vycházejí z objednávek → nutná kontrola oprávnění (ORDER_*_OWN vs ORDER_*_ALL)
- Cache strategie - reporty a statistiky mohou být **cache-friendly** (agregovaná data)
- Responzivita - grafy a tabulky musí fungovat i na mobilních zařízeních

---

**Status:** ✅ PŘIPRAVENO K DISKUZI  
**Další krok:** Projednat s týmem, schválit návrh, zahájit implementaci Fáze 1
