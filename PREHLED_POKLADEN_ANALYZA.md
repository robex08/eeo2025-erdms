# 🪙 PŘEHLED POKLADEN - Detailní Analýza

**Datum:** 13. dubna 2026  
**Sekce:** Přehled pokladen (cashbook) - 8. záložka v Stats & Reporty modulu

---

## ⚠️ **KRITICKÝ PROBLÉM IDENTIFIKOVÁN!**

### 🔴 **NESOULAD V NÁZVECH PRÁV**

Nalezen **vážný nesoulad** mezi migrací a implementací:

#### **Migrace (2026_03_30_cashbook_overview_permissions.sql):**
```sql
'CASHBOOK_OVERVIEW_VIEW'    ❌ ŠPATNĚ
'CASHBOOK_OVERVIEW_EXPORT'  ❌ ŠPATNĚ
```

#### **Backend API (cashbookHandlersExtended.php):**
```php
'CASHBOOK_REPORTS_VIEW'    ✅ SPRÁVNĚ
'CASHBOOK_REPORTS_MANAGE'  ✅ SPRÁVNĚ
'CASHBOOK_REPORTS_EXPORT'  ✅ SPRÁVNĚ
```

#### **Frontend (StatsReportsPage.js):**
```javascript
'CASHBOOK_REPORTS_VIEW'    ✅ SPRÁVNĚ
'CASHBOOK_REPORTS_MANAGE'  ✅ SPRÁVNĚ
'CASHBOOK_REPORTS_EXPORT'  ✅ SPRÁVNĚ
```

**🚨 DŮSLEDEK:** Migrace vytvořila **ŠPATNÁ PRÁVA**, která nikdo nepoužívá!  
→ Uživatelé s právy z migrace **NEVIDÍ** záložku Přehled pokladen!

---

## 🔐 **SPRÁVNÁ PRÁVA (podle implementace)**

| Kód práva | Popis | Použití |
|-----------|-------|---------|
| `CASHBOOK_REPORTS_VIEW` | Zobrazení přehledu pokladen | Čtení dat, zobrazení tabulek |
| `CASHBOOK_REPORTS_MANAGE` | Správa reportů pokladen | Plný přístup ke všem datům |
| `CASHBOOK_REPORTS_EXPORT` | Export dat do CSV/Excel | Stahování reportů |

---

## 📊 **CO SEKCE OBSAHUJE**

### **1. Přehled pokladen (cashbookOverview)**
- Agregovaný přehled všech pokladních knih
- Filtr podle roku / měsíce
- Summary: celkové výdaje, příjmy, počet operací
- Rozbalovací řádky s detaily jednotlivých pokladen

#### **Zobrazená data:**
```
┌─────────────────────────────────────────────────────┐
│  📊 PŘEHLED POKLADEN                    [Filtry]    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Celkové výdaje:   -1 234 567,89 Kč                 │
│  Celkové příjmy:   +987 654,32 Kč                   │
│  Operací celkem:   1 234                             │
│                                                       │
│  ┌───────────────────────────────────────────┐      │
│  │ [+] Pokladna ABC - 248 operací            │      │
│  │     Výdaje: -56 789 Kč | Příjmy: +12 345  │      │
│  └───────────────────────────────────────────┘      │
│                                                       │
│  ┌───────────────────────────────────────────┐      │
│  │ [-] Pokladna XYZ - 156 operací            │      │
│  │     Výdaje: -34 567 Kč | Příjmy: +8 901   │      │
│  │                                             │      │
│  │   Detail položek:                           │      │
│  │   ┌─────────────────────────────────────┐ │      │
│  │   │ Datum | Č. dokladu | Obsah | LP kód │ │      │
│  │   ├─────────────────────────────────────┤ │      │
│  │   │ 15.1. │ PK-001 │ Nákup │ 123456     │ │      │
│  │   │ 16.1. │ PK-002 │ Příjem │ -         │ │      │
│  │   └─────────────────────────────────────┘ │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### **2. Grafy (cashbookCharts)**
- Vizualizace dat z pokladen
- Grafy výdajů a příjmů v čase
- Porovnání jednotlivých pokladen

---

## 🔧 **BACKEND API ENDPOINTY**

### **1. POST /cashbook-overview/list**
**Kontrola práv:**
```php
WHERE p.kod_prava IN ('CASHBOOK_REPORTS_VIEW', 
                      'CASHBOOK_REPORTS_MANAGE', 
                      'CASHBOOK_REPORTS_EXPORT')
```

**Vstupní parametry:**
```javascript
{
  username: string,
  token: string,
  rok: number,          // required
  mesic: number|null,   // 1-12 nebo null pro celý rok
  pokladna_ids: array,  // optional filtr
  stav_knihy: string    // optional
}
```

**Odpověď:**
```javascript
{
  status: 'success',
  data: {
    books: [
      {
        pokladna_id: 1,
        pokladna_nazev: 'Pokladna ABC',
        cislo_pokladny: '001',
        kniha_id: 123,
        rok: 2026,
        mesic: 1,
        pocet_zaznamu: 248,
        celkove_vydaje: 56789.00,
        celkove_prijmy: 12345.00,
        hlavni_uzivatel: 'Jan Novák',
        mesice: [...] // pro roční agregaci
      }
    ],
    summary: {
      celkem_vydaje: 1234567.89,
      celkem_prijmy: 987654.32,
      celkem_zaznamu: 1234
    },
    filters: {
      rok: 2026,
      mesic: null
    }
  }
}
```

### **2. POST /cashbook-overview/entries**
**Kontrola práv:** Stejná jako /list

**Vstupní parametry:**
```javascript
{
  username: string,
  token: string,
  kniha_id: number,
  page: number,     // default: 1
  limit: number     // default: 50
}
```

**Odpověď:**
```javascript
{
  status: 'success',
  data: {
    entries: [
      {
        id: 1,
        datum_zapisu: '2026-01-15',
        cislo_dokladu: 'PK-001',
        obsah_zapisu: 'Nákup kancelářských potřeb',
        komu_od_koho: 'Dodavatel ABC s.r.o.',
        castka_vydaj: 1234.50,
        castka_prijem: 0,
        lp_kod: '123456',
        detail_items: [...]
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 248,
      total_pages: 5
    }
  }
}
```

---

## 👥 **KDO MŮŽE SEKCI VIDĚT**

### **✅ Uživatelé s právy:**
1. **ADMIN / SUPERADMIN** → vidí vše automaticky
2. Uživatelé s právem `CASHBOOK_REPORTS_VIEW` → základní zobrazení
3. Uživatelé s právem `CASHBOOK_REPORTS_MANAGE` → plný přístup
4. Uživatelé s právem `CASHBOOK_REPORTS_EXPORT` → zobrazení + export

### **❌ Uživatelé BEZ práv:**
- Sekce Přehled pokladen je pro ně **SKRYTÁ**
- V menu Stats & Reporty nevidí záložku "Přehled pokladen"

---

## 🛠️ **ŘEŠENÍ PROBLÉMU**

### **1. Opravená migrace**

Vytvořit novou migraci s **SPRÁVNÝMI** názvy práv:

```sql
-- STARÁ (ŠPATNÁ) MIGRACE - NEPOUŽÍVAT!
-- 2026_03_30_cashbook_overview_permissions.sql
-- Vytvořila CASHBOOK_OVERVIEW_* místo CASHBOOK_REPORTS_*

-- NOVÁ (SPRÁVNÁ) MIGRACE
-- 2026_04_13_cashbook_reports_permissions_fix.sql

USE `EEO-OSTRA-DEV`;

-- 1. Vymazat špatná práva (pokud existují)
DELETE FROM `25_role_prava` 
WHERE pravo_id IN (
  SELECT id FROM `25_prava` 
  WHERE kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASHBOOK_OVERVIEW_EXPORT')
);

DELETE FROM `25_prava` 
WHERE kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASHBOOK_OVERVIEW_EXPORT');

-- 2. Vytvořit SPRÁVNÁ práva
INSERT IGNORE INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
('CASHBOOK_REPORTS_VIEW', 'Zobrazení přehledu pokladen v reportech', 1),
('CASHBOOK_REPORTS_MANAGE', 'Správa reportů pokladen', 1),
('CASHBOOK_REPORTS_EXPORT', 'Export přehledu pokladen do CSV/Excel', 1);

-- 3. Přiřadit práva administrátorům
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava IN ('CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT');

-- 4. Přiřadit VIEW hlavnímu účetnímu a účetním
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('HLAVNI_UCETNI', 'UCETNI')
  AND p.kod_prava = 'CASHBOOK_REPORTS_VIEW';

-- 5. Přiřadit MANAGE + EXPORT hlavnímu účetnímu
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'HLAVNI_UCETNI'
  AND p.kod_prava IN ('CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT');
```

### **2. Verifikace**

Po spuštění migrace zkontrolovat:

```sql
-- Zobrazit všechna práva CASHBOOK_*
SELECT 
    p.kod_prava,
    p.popis,
    COUNT(DISTINCT rp.role_id) AS 'Počet rolí',
    GROUP_CONCAT(DISTINCT r.nazev_role ORDER BY r.nazev_role SEPARATOR ', ') AS 'Role'
FROM `25_prava` p
LEFT JOIN `25_role_prava` rp ON p.id = rp.pravo_id AND rp.user_id = -1 AND rp.aktivni = 1
LEFT JOIN `25_role` r ON rp.role_id = r.id
WHERE p.kod_prava LIKE 'CASHBOOK_%'
GROUP BY p.id, p.kod_prava, p.popis
ORDER BY p.kod_prava;
```

---

## 📝 **SHRNUTÍ**

### **Co je špatně:**
- ❌ Migrace z 30.3.2026 vytvořila práva s **NESPRÁVNÝMI** názvy
- ❌ Backend a frontend používají **jiná** práva než migrace
- ❌ Uživatelé s právy z migrace **NEVIDÍ** záložku

### **Co je potřeba opravit:**
1. ⏳ Vytvořit novou migraci se správnými právy (`CASHBOOK_REPORTS_*`)
2. ⏳ Smazat stará špatná práva (`CASHBOOK_OVERVIEW_*`)
3. ⏳ Přiřadit správná práva příslušným rolím
4. ⏳ Otestovat viditelnost záložky

### **Soubory k úpravě:**
- ✅ **NOVÝ**: `/migrations/2026_04_13_cashbook_reports_permissions_fix.sql`
- ⚠️ **DEPRECATED**: `/migrations/2026_03_30_cashbook_overview_permissions.sql`

---

## 🔗 **SOUVISEJÍCÍ SOUBORY**

- **Frontend:** `/apps/eeo-v2/client/src/pages/StatsReportsPage.js` (řádek 2326-2327)
- **Backend API:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/cashbookHandlersExtended.php`
- **API Service:** `/apps/eeo-v2/client/src/services/apiCashbookOverview.js`
- **Migrace (špatná):** `/migrations/2026_03_30_cashbook_overview_permissions.sql`
