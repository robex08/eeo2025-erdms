# 📊 REPORTY & STATISTIKY - Implementační Plán

**Datum:** 27. listopadu 2025  
**Status:** READY FOR IMPLEMENTATION  
**Priorita:** HIGH

---

## 🎯 EXECUTIVE SUMMARY

Na základě analýzy dokumentace `REPORTY-STATISTIKY-NAVRH.md` a požadavků od uživatelů navrhujeme implementovat:

1. **Reporty** - Přehledy a seznamy objednávek s pokročilým filtrováním
2. **Statistiky** - Analytické grafy, dashboardy a metriky

### Klíčové vlastnosti:
- ✅ Modulární architektura s opakovaně použitelnými komponenty
- ✅ Responsivní UI s TAB navigací
- ✅ Export dat do CSV/PDF
- ✅ Granulární oprávnění
- ✅ Cache-friendly pro optimální výkon
- ✅ Využití existujících API endpointů kde možné

---

## 📐 ARCHITEKTURA

### 1. Struktura složek

```
src/
├── pages/
│   ├── ReportsPage.js           ← Hlavní stránka Reportů
│   └── StatisticsPage.js        ← Hlavní stránka Statistik
│
├── components/
│   ├── reports/
│   │   ├── ReportLayout.js           # Layout s TABy
│   │   ├── ReportFilterBar.js        # Společné filtry
│   │   ├── ReportDataTable.js        # Tabulka s řazením a stránkováním
│   │   ├── ReportExportButton.js     # Export do CSV/PDF
│   │   ├── tabs/
│   │   │   ├── ComplianceReportsTab.js    # Kontrolní reporty
│   │   │   ├── BudgetReportsTab.js        # Rozpočtové reporty
│   │   │   ├── WorkflowReportsTab.js      # Workflow reporty
│   │   │   └── AssetReportsTab.js         # Majetkové reporty
│   │   └── reports/
│   │       ├── ToPublishReport.js         # Objednávky ke zveřejnění
│   │       ├── OverLimitReport.js         # Objednávky nad 50k Kč
│   │       ├── PublishedReport.js         # Zveřejněné objednávky
│   │       ├── InvoiceDiscrepancyReport.js # Nesrovnalosti faktur
│   │       ├── RetroactiveOrdersReport.js  # Zpětné objednávky
│   │       ├── UrgentPaymentsReport.js     # Urgentní platby
│   │       ├── PendingApprovalsReport.js   # Čekající schválení
│   │       └── LpStatusReport.js           # Stav LP
│   │
│   └── statistics/
│       ├── StatisticsLayout.js       # Layout s TABy
│       ├── StatisticsFilterBar.js    # Filtry pro statistiky
│       ├── MetricsCard.js            # Karta s metrikou
│       ├── charts/
│       │   ├── TimeSeriesChart.js        # Časové řady
│       │   ├── PieChart.js               # Koláčové grafy
│       │   ├── BarChart.js               # Sloupcové grafy
│       │   └── ChartContainer.js         # Wrapper pro grafy
│       └── tabs/
│           ├── OverviewTab.js            # Přehled - základní metriky
│           ├── UsersTab.js               # Statistiky uživatelů
│           ├── DepartmentsTab.js         # Statistiky úseků
│           └── TrendsTab.js              # Trendy a časové řady
│
├── services/
│   ├── reportsApi.js            # API pro reporty
│   └── statisticsApi.js         # API pro statistiky
│
└── hooks/
    ├── useReportData.js         # Hook pro načítání dat reportů
    ├── useReportExport.js       # Hook pro export reportů
    ├── useStatisticsData.js     # Hook pro načítání statistik
    └── useChartData.js          # Hook pro transformaci dat pro grafy
```

---

## 🔐 OPRÁVNĚNÍ

### Nová práva v databázi

```sql
-- Základní práva pro reporty
INSERT INTO `prava` (`kod_prava`, `popis`) VALUES
('REPORT_VIEW', 'Zobrazení reportů'),
('REPORT_EXPORT', 'Export reportů do CSV/PDF'),
('REPORT_MANAGE', 'Správa reportů (vytváření vlastních reportů)');

-- Základní práva pro statistiky
INSERT INTO `prava` (`kod_prava`, `popis`) VALUES
('STATISTICS_VIEW', 'Zobrazení statistik'),
('STATISTICS_EXPORT', 'Export statistik'),
('STATISTICS_MANAGE', 'Správa statistik (vytváření dashboardů)');
```

### Logika přístupu

```javascript
// Menu viditelnost
REPORT_VIEW → Vidí položku "Reporty" v menu
STATISTICS_VIEW → Vidí položku "Statistiky" v menu

// Funkce v reportech
REPORT_VIEW + REPORT_EXPORT → Může exportovat reporty
REPORT_MANAGE → Může vytvářet vlastní reporty (advanced - fáze 4)

// Funkce ve statistikách
STATISTICS_VIEW + STATISTICS_EXPORT → Může exportovat statistiky
STATISTICS_MANAGE → Může vytvářet vlastní dashboardy (advanced - fáze 4)
```

### Bezpečnost dat

**KRITICKÉ:** Reporty a statistiky musí respektovat existující oprávnění:

```javascript
// Uživatel s ORDER_VIEW_OWN vidí pouze své objednávky
// Uživatel s ORDER_VIEW_ALL vidí všechny objednávky

// V reportech a statistikách platí STEJNÁ PRAVIDLA!
// → Backend API musí filtrovat data podle oprávnění uživatele
```

---

## 🎨 UŽIVATELSKÉ ROZHRANÍ

### REPORTY - Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  📊 REPORTY                                    [📥 Export]   │
├─────────────────────────────────────────────────────────────┤
│  [Kontrolní] [Rozpočet] [Workflow] [Majetek]                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Kontrolní reporty                                        │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  Dostupné reporty:                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️  Objednávky ke zveřejnění                (15)    │    │
│  │ 💰 Objednávky nad 50 000 Kč                 (8)     │    │
│  │ 📢 Zveřejněné objednávky                    (142)   │    │
│  │ ❗ Fakturace vyšší než částka na kontrole  (3)     │    │
│  │ ⏪ Objednávky vytvořené po fakturaci       (2)     │    │
│  │ ⚡ Faktury se splatností < 5 dní           (7)     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────┐                 │
│  │ Vybraný report: Objednávky ke zveřejnění│                 │
│  ├────────────────────────────────────────┤                 │
│  │ Filtry:                                 │                 │
│  │ Období: [Q4 2025 ▼] Úsek: [Všechny ▼]│                 │
│  │ [🔍 Zobrazit] [📥 Export CSV]          │                 │
│  └────────────────────────────────────────┘                 │
│                                                               │
│  📊 Výsledky: 15 objednávek                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ID    │ Datum      │ Dodavatel        │ Částka       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 2025/│ 15.11.2025 │ ABC s.r.o.      │ 45 000 Kč   │    │
│  │ 1234 │            │                  │              │    │
│  │ ... │ ...        │ ...              │ ...          │    │
│  └─────────────────────────────────────────────────────┘    │
│  [1] [2] [3] ... [→]                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### STATISTIKY - Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  📈 STATISTIKY                                 [📥 Export]   │
├─────────────────────────────────────────────────────────────┤
│  [Přehled] [Uživatelé] [Úseky] [Trendy]                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Přehled - Základní metriky                              │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  Období: [2025 ▼]                                           │
│                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 📋 Celkem    │ │ 💰 Částka    │ │ ✅ Schváleno │        │
│  │              │ │              │ │              │        │
│  │   1,234      │ │  12,5 mil.   │ │   98%        │        │
│  │  objednávek  │ │     Kč       │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📊 Vývoj počtu objednávek v čase (2025)             │   │
│  │                                                       │   │
│  │  [Sloupcový graf: leden=98, únor=112, ... prosinec] │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │ 🥧 Rozdělení podle │  │ 👥 Top 10 uživatelů         │   │
│  │    úseků           │  │    (počet objednávek)       │   │
│  │                    │  │                             │   │
│  │ [Koláčový graf]    │  │ Jan Novák      ███████ 42   │   │
│  │                    │  │ Petra Svobodová ██████ 38   │   │
│  │                    │  │ ...                         │   │
│  └────────────────────┘  └─────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API SPECIFIKACE

### Nové endpointy pro REPORTY

```javascript
// 1. Objednávky ke zveřejnění
POST /reports/to-publish
Request: {
  username, token,
  filters: {
    period: "Q4_2025" | "2025" | "all",
    department_id: null | 5,
    limit_from: null | 50000
  },
  page: 1,
  page_size: 50
}
Response: {
  status: "ok",
  data: {
    items: [
      {
        order_id, order_number, date, supplier_name, 
        total_amount, status, section, must_publish: true
      }
    ],
    total_count: 15,
    page: 1,
    page_size: 50
  }
}

// 2. Objednávky nad limit
POST /reports/over-limit
Request: {
  username, token,
  filters: {
    limit: 50000,
    period: "Q4_2025",
    department_id: null
  }
}

// 3. Čerpání LP (existující rozšířit)
POST /reports/lp-status
Request: {
  username, token,
  filters: {
    account_id: null | 5,
    department_id: null | 3,
    year: 2025
  }
}
Response: {
  status: "ok",
  data: {
    total_limit: 10000000,
    total_spent: 8500000,
    remaining: 1500000,
    percentage: 85.0,
    by_accounts: [
      {
        account_id, account_name,
        limit: 2000000, spent: 1800000,
        remaining: 200000, percentage: 90.0
      }
    ],
    by_departments: [...]
  }
}

// 4. Nesrovnalosti ve fakturaci
POST /reports/invoice-discrepancy
Request: {
  username, token,
  filters: { period: "Q4_2025" }
}
Response: {
  status: "ok",
  data: {
    items: [
      {
        order_id, order_number,
        order_amount: 50000,
        invoiced_amount: 55000,
        difference: 5000,
        difference_pct: 10.0
      }
    ]
  }
}

// 5. Zpětné objednávky (vytvořené po fakturaci)
POST /reports/retroactive-orders
Request: { username, token, filters: { period: "Q4_2025" } }

// 6. Urgentní platby (splatnost < 5 dní)
POST /reports/urgent-payments
Request: { username, token, filters: { days: 5 } }

// 7. Zaseknuté v workflow (> 5 dní bez akce)
POST /reports/pending-approvals
Request: { username, token, filters: { days: 5 } }
```

### Nové endpointy pro STATISTIKY

```javascript
// 1. Základní metriky (dashboard)
POST /statistics/overview
Request: {
  username, token,
  filters: {
    year: 2025,
    department_id: null,
    period: "all" | "Q1_2025" | "01_2025"
  }
}
Response: {
  status: "ok",
  data: {
    total_orders: 1234,
    total_amount: 12500000,
    avg_amount: 10130,
    approved_count: 1210,
    approved_pct: 98.0,
    rejected_count: 12,
    pending_count: 12
  }
}

// 2. Časové řady
POST /statistics/timeline
Request: {
  username, token,
  filters: {
    year: 2025,
    group_by: "month" | "quarter" | "week",
    department_id: null
  }
}
Response: {
  status: "ok",
  data: {
    timeline: [
      {
        period: "2025-01",
        period_label: "Leden 2025",
        count: 98,
        total_amount: 1200000,
        avg_amount: 12244
      },
      { period: "2025-02", ... }
    ]
  }
}

// 3. Statistiky uživatelů
POST /statistics/users
Request: {
  username, token,
  filters: {
    year: 2025,
    department_id: null,
    top_n: 10
  }
}
Response: {
  status: "ok",
  data: {
    users: [
      {
        user_id, full_name,
        created_count: 42,
        approved_count: 38,
        rejected_count: 2,
        total_amount: 520000,
        avg_processing_time_hours: 48.5
      }
    ]
  }
}

// 4. Statistiky úseků
POST /statistics/departments
Request: { username, token, filters: { year: 2025 } }
Response: {
  status: "ok",
  data: {
    departments: [
      {
        department_id, department_name,
        count: 156,
        total_amount: 2300000,
        percentage_of_total: 18.4,
        avg_amount: 14744
      }
    ]
  }
}

// 5. Srovnání období (YoY, QoQ)
POST /statistics/comparison
Request: {
  username, token,
  period_a: "2025",
  period_b: "2024"
}
Response: {
  status: "ok",
  data: {
    period_a: { count: 1234, amount: 12500000 },
    period_b: { count: 1100, amount: 11200000 },
    diff_count: 134,
    diff_count_pct: 12.2,
    diff_amount: 1300000,
    diff_amount_pct: 11.6
  }
}
```

### Využití existujících API

**KRITICKÉ:** Maximálně využít existující endpointy!

```javascript
// Už máme v api25orders.js:
POST /orders25/list       → Seznam objednávek (s filtry)
POST /orders25/stats      → Základní statistiky
POST /orders25/by-user    → Objednávky podle uživatele

// Můžeme rozšířit:
POST /orders25/list + special filters = reporty!
  - filters.must_publish = true → Objednávky ke zveřejnění
  - filters.min_amount = 50000 → Objednávky nad limit
  - filters.invoice_discrepancy = true → Nesrovnalosti
```

---

## 🛠️ IMPLEMENTAČNÍ FÁZE

### FÁZE 1: Základní struktura (2-3 dny)

**Cíl:** Vytvořit menu, práva, routing a prázdné komponenty

#### 1.1 Databáze
```sql
-- Vytvořit nová práva
INSERT INTO `prava` (...)

-- Přiřadit práva k rolím (např. ADMIN, SUPERADMIN)
INSERT INTO `role_prava` (role_id, pravo_id)
SELECT r.id, p.id 
FROM roles r, prava p
WHERE r.nazev_role = 'ADMIN' 
AND p.kod_prava IN ('REPORT_VIEW', 'STATISTICS_VIEW', 'REPORT_EXPORT', 'STATISTICS_EXPORT');
```

#### 1.2 Frontend - Menu (Layout.js)
```javascript
// Přidat do Layout.js za "Přehled objednávek"
{ hasPermission && hasPermission('REPORT_VIEW') && (
  <MenuLinkLeft to="/reports" $active={isActive('/reports')}>
    <FontAwesomeIcon icon={faChartBar} /> Reporty
  </MenuLinkLeft>
) }

{ hasPermission && hasPermission('STATISTICS_VIEW') && (
  <MenuLinkLeft to="/statistics-new" $active={isActive('/statistics-new')}>
    <FontAwesomeIcon icon={faChartLine} /> Statistiky
  </MenuLinkLeft>
) }
```

#### 1.3 Frontend - Routing (App.js)
```javascript
// Přidat routes
{isLoggedIn && hasPermission && hasPermission('REPORT_VIEW') && 
  <Route path="/reports" element={<ReportsPage />} />
}
{isLoggedIn && hasPermission && hasPermission('STATISTICS_VIEW') && 
  <Route path="/statistics-new" element={<StatisticsPage />} />
}
```

#### 1.4 Frontend - Prázdné komponenty
```javascript
// src/pages/ReportsPage.js
export default function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader>
        <FontAwesomeIcon icon={faChartBar} /> Reporty
      </PageHeader>
      <Tabs>
        <Tab>Kontrolní</Tab>
        <Tab>Rozpočet</Tab>
        <Tab>Workflow</Tab>
        <Tab>Majetek</Tab>
      </Tabs>
      <PlaceholderMessage>
        📊 Reporty jsou ve vývoji...
      </PlaceholderMessage>
    </PageContainer>
  );
}

// src/pages/StatisticsPage.js
// Podobně...
```

#### 1.5 Frontend - Aktualizovat availableSections.js
```javascript
export const availableSections = [
  // ... existing
  'reports',
  'statistics',
  // ...
];
```

**Výstup fáze 1:**
- ✅ Menu items viditelné pro uživatele s právy
- ✅ Routes fungují
- ✅ Placeholder stránky s TABy
- ✅ Permissions kontrola funguje

---

### FÁZE 2: První reporty (5-7 dní)

**Cíl:** Implementovat 3-5 nejdůležitějších reportů

#### 2.1 Společné komponenty
```javascript
// src/components/reports/ReportLayout.js
// - TAB navigace
// - Filtry bar
// - Export button
// - Data table

// src/components/reports/ReportFilterBar.js
// - Období (dropdown: Q1/Q2/Q3/Q4/rok/všechno)
// - Úsek (dropdown z API)
// - Částka od-do
// - Hledat button

// src/components/reports/ReportDataTable.js
// - Použít @tanstack/react-table (již máme v projektu)
// - Řazení
// - Stránkování
// - Responzivní

// src/components/reports/ReportExportButton.js
// - Export do CSV (použít papaparse - již máme)
// - Export do PDF (budoucnost)
```

#### 2.2 Backend API
```php
// api.eeo/endpoints/reports/

// to-publish.php
// over-limit.php
// published.php
// invoice-discrepancy.php
// retroactive-orders.php
// urgent-payments.php
```

#### 2.3 Frontend Service
```javascript
// src/services/reportsApi.js
export const reportsApi = {
  async getToPublish(filters) {
    // POST /reports/to-publish
  },
  
  async getOverLimit(filters) {
    // POST /reports/over-limit
  },
  
  // ... další reporty
};
```

#### 2.4 Implementovat první reporty
```
Priority (podle důležitosti):
1. ⭐⭐⭐ Objednávky ke zveřejnění
2. ⭐⭐⭐ Objednávky nad 50k Kč
3. ⭐⭐  Čerpání LP (zbývající limit)
4. ⭐⭐  Čekající na schválení > 5 dní
5. ⭐   Zveřejněné objednávky
```

**Výstup fáze 2:**
- ✅ 3-5 funkčních reportů
- ✅ Filtry fungují
- ✅ Export do CSV funguje
- ✅ Data respektují oprávnění uživatele

---

### FÁZE 3: Statistiky - Dashboard (5-7 dní)

**Cíl:** Implementovat základní statistiky s grafy

#### 3.1 Instalace knihoven
```bash
npm install recharts
# nebo
npm install chart.js react-chartjs-2
```

**Doporučení:** `recharts` - lepší pro React, jednodušší API

#### 3.2 Backend API
```php
// api.eeo/endpoints/statistics/

// overview.php      → Základní metriky
// timeline.php      → Časové řady
// users.php         → Statistiky uživatelů
// departments.php   → Statistiky úseků
```

#### 3.3 Frontend komponenty
```javascript
// src/components/statistics/MetricsCard.js
// Karta s jednou metrikou (např. "Celkem objednávek: 1234")

// src/components/statistics/charts/TimeSeriesChart.js
// Sloupcový/čárový graf vývoje v čase

// src/components/statistics/charts/PieChart.js
// Koláčový graf rozdělení podle kategorií

// src/components/statistics/charts/BarChart.js
// Horizontální bar chart (např. TOP 10 uživatelů)
```

#### 3.4 TABy ve statistikách
```javascript
// src/components/statistics/tabs/OverviewTab.js
// - 3 metriky karty (celkem, částka, průměr)
// - Graf časové řady
// - Koláčový graf podle úseků

// src/components/statistics/tabs/UsersTab.js
// - TOP 10 uživatelů (počet objednávek)
// - TOP 10 uživatelů (částka)
// - Průměrná doba zpracování

// src/components/statistics/tabs/DepartmentsTab.js
// - Koláčový graf rozdělení podle úseků
// - Tabulka s detaily úseků

// src/components/statistics/tabs/TrendsTab.js
// - Časové řady (roky, čtvrtletí, měsíce)
// - Srovnání období (YoY, QoQ)
```

**Výstup fáze 3:**
- ✅ Dashboard s metrikami
- ✅ 3-5 grafů (čárové, sloupcové, koláčové)
- ✅ TABy fungují
- ✅ Export statistik do CSV

---

### FÁZE 4: Pokročilé funkce (budoucnost)

**Cíl:** Rozšířené funkce pro power users

#### 4.1 Custom reporty
- Uživatelé s `REPORT_MANAGE` mohou vytvářet vlastní reporty
- Ukládání filtrů a konfigurací
- Sdílení reportů s ostatními

#### 4.2 Export do PDF
- Kromě CSV i PDF export
- Šablony pro PDF reporty

#### 4.3 Automatické reporty
- Plánované generování reportů (např. každý týden)
- Email notifikace

#### 4.4 Kontingeneční tabulky
- Interaktivní pivot tabulky
- Drag & drop sloupce/řádky

---

## 📦 ZÁVISLOSTI

### NPM balíčky (nové)
```bash
npm install recharts
# nebo alternativně
npm install chart.js react-chartjs-2
```

### Již máme v projektu (využít!)
- ✅ `@tanstack/react-table` - pro tabulky
- ✅ `papaparse` - pro export CSV
- ✅ `@emotion/styled` - pro styling
- ✅ `@fortawesome` - pro ikony
- ✅ `axios` - pro API volání

---

## 🧪 TESTOVÁNÍ

### Testovací scénáře

#### Reporty
```
1. Přístup k menu
   - Uživatel s REPORT_VIEW vidí "Reporty" v menu
   - Uživatel bez práva nevidí "Reporty"

2. Filtry
   - Změna období → data se aktualizují
   - Změna úseku → data se aktualizují
   - Prázdný výsledek → zobrazit friendly message

3. Export
   - Export CSV → soubor se stáhne
   - Export obsahuje správná data
   - Export respektuje filtry

4. Oprávnění
   - Uživatel s ORDER_VIEW_OWN vidí pouze své objednávky
   - Uživatel s ORDER_VIEW_ALL vidí všechny objednávky

5. Stránkování
   - Navigace mezi stránkami funguje
   - Počet řádků odpovídá page_size
```

#### Statistiky
```
1. Grafy
   - Grafy se vykreslují správně
   - Tooltips zobrazují správná data
   - Legenda je viditelná

2. Metriky
   - Čísla jsou správně formátovaná (Kč, %, počty)
   - Barvy indikují správně (zelená/červená)

3. Responzivita
   - Grafy se přizpůsobují mobilním zařízením
   - TABy fungují na mobilu
```

---

## 🚀 DEPLOYMENT

### Kroky před nasazením do produkce

1. **Databáze**
   ```sql
   -- Production SQL skripty
   -- Vytvořit práva
   -- Přiřadit práva k rolím
   ```

2. **Backend**
   ```
   - Nahrát nové API endpoints
   - Otestovat na DEV/TEST prostředí
   - Optimalizovat SQL dotazy (indexy!)
   ```

3. **Frontend**
   ```bash
   npm run build
   # Nahrát build/ na server
   ```

4. **Dokumentace**
   ```
   - Aktualizovat uživatelskou příručku
   - Vytvořit admin guide (jak přiřazovat práva)
   ```

---

## 📊 PRIORITY REPORTŮ (podle uživatelů)

### Vysoká priorita (implementovat PRVNÍ) ⭐⭐⭐
1. Objednávky ke zveřejnění
2. Objednávky nad 50 000 Kč
3. Čerpání LP (zbývající limit)
4. Objednávky čekající na schválení > 5 dní

### Střední priorita ⭐⭐
5. Zveřejněné objednávky (podle ID zveřejnění)
6. Fakturace vyšší než částka na kontrole
7. Faktury se splatností < 5 dní
8. Statistika akceptačních objednávek

### Nízká priorita ⭐
9. Objednávky vytvořené po fakturaci (zpětné)
10. Objednávky vztahující se k majetku

---

## 💡 TECHNICKÁ DOPORUČENÍ

### Performance
- ✅ Cache API odpovědi (využít existující `ordersCacheService`)
- ✅ Optimalizovat SQL dotazy (indexy na datum, částku, stav)
- ✅ Lazy loading grafů (načíst až když uživatel otevře TAB)
- ✅ Virtualizace tabulek pro velké datasety

### Bezpečnost
- ✅ Validace všech vstupů (filtry, parametry)
- ✅ SQL injection prevence (prepared statements)
- ✅ XSS prevence (sanitize data před zobrazením)
- ✅ Rate limiting API endpoints

### UX
- ✅ Loading states pro API volání
- ✅ Error handling s friendly messages
- ✅ Prázdné stavy ("Žádná data k zobrazení")
- ✅ Tooltips pro help ikony
- ✅ Keyboard shortcuts (např. E pro Export)

### Kód kvalita
- ✅ Opakovaně použitelné komponenty
- ✅ Custom hooks pro business logiku
- ✅ TypeScript interfaces (pokud migrujeme)
- ✅ JSDoc komentáře pro složité funkce
- ✅ Unit testy pro kritické funkce

---

## 📝 OTEVŘENÉ OTÁZKY

1. **Oprávnění:**
   - ❓ Stačí `REPORT_VIEW` + `STATISTICS_VIEW`, nebo potřebujeme granulární práva pro jednotlivé reporty?
   - **Doporučení:** Začít s jednoduchými právy, rozšířit až bude potřeba

2. **Priorita reportů:**
   - ❓ Které reporty implementovat PRVNÍ?
   - **Doporučení:** Začít s "Objednávky ke zveřejnění" + "Nad 50k Kč" + "Čerpání LP"

3. **Export:**
   - ❓ CSV je OK nebo potřebujeme i PDF/Excel?
   - **Doporučení:** Začít s CSV, PDF přidat ve fázi 4

4. **Grafy:**
   - ❓ `recharts` nebo `chart.js`?
   - **Doporučení:** `recharts` - lepší pro React

5. **Backend:**
   - ❓ Nové endpointy nebo rozšířit `orders25/list`?
   - **Doporučení:** Kombinace - jednodušší reporty přes `orders25/list`, složitější nové endpointy

---

## ✅ CHECKLIST PŘED ZAČÁTKEM

- [ ] Schválení návrhu stakeholdery
- [ ] Definovat priority reportů (které PRVNÍ?)
- [ ] Rozhodnout: recharts vs chart.js
- [ ] Připravit SQL skripty pro práva
- [ ] Vytvořit testovací data (dev/test prostředí)
- [ ] Připravit mockup/wireframes pro UX review
- [ ] Allocovat čas vývojáře (12-15 dní plný úvazek)

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Odhadovaný čas:** 12-15 dní (full-time developer)  
**Rizika:** Nízká - využíváme existující patterns a technologie

---

## 📎 SOUVISEJÍCÍ DOKUMENTY

- `REPORTY-STATISTIKY-NAVRH.md` - Původní analýza a požadavky
- `BACKEND-USER-DETAIL-STATISTICS-API.md` - API pro statistiky uživatelů
- `PERMISSIONS-VIEW-ANALYSIS.md` - Analýza oprávnění v systému

---

**Připravil:** AI Assistant  
**Datum:** 27. listopadu 2025  
**Verze:** 1.0
