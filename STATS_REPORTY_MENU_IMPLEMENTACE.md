# 📊 STATS & REPORTY - Implementace Menu

**Datum:** 13. dubna 2026  
**Status:** ✅ **IMPLEMENTOVÁNO**

---

## 🎯 **CÍL IMPLEMENTACE**

Zviditelnit menu položku **"Statistika a reporty"** v hlavním menu aplikace tak, aby:
1. ✅ Byla viditelná pro uživatele s **ALESPOŇ JEDNÍM** příslušným právem
2. ✅ Automaticky filtrovala data podle úseků uživatele
3. ✅ Podporovala všechna práva včetně nových (`CASHBOOK_REPORTS_*`, `DOHADNE_*`)

---

## 📍 **UMÍSTĚNÍ V MENU**

### **Navigace:**
```
Top Menu Bar
  └─ "Manažerské analýzy" (dropdown) 📊
      ├─ Čerpání 💰
      └─ Statistika a reporty 📊 ← **TADY**
```

### **URL cesta:**
```
/stats-reports
```

---

## 🔐 **KONTROLA PRÁV**

### **Implementace v Layout.js**

#### **1. useMemo hook `hasAnalyticsManagePermission`** (řádek 1914-1929)

```javascript
const hasAnalyticsManagePermission = useMemo(() => {
  if (!hasPermission) return false;

  return (
    (typeof hasAdminRole === 'function' && hasAdminRole()) ||
    hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
    hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
    hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
    hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
    hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
    hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
    hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE') ||
    hasPermission('CASHBOOK_REPORTS_VIEW') || hasPermission('CASHBOOK_REPORTS_MANAGE') || hasPermission('CASHBOOK_REPORTS_EXPORT') ||  // ✨ NOVĚ
    hasPermission('DOHADNE_VIEW') || hasPermission('DOHADNE_EDIT') || hasPermission('DOHADNE_MANAGE')  // ✨ NOVĚ
  );
}, [hasPermission, hasAdminRole]);
```

#### **2. Menu položka "Statistika a reporty"** (řádek 3772-3790)

```javascript
{/* Statistika a reporty - nový modul nahrazující Reporty + Statistiky */}
{((typeof hasAdminRole === 'function' && hasAdminRole()) || (
  hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
  hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
  hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
  hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
  hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
  hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
  hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE') ||
  hasPermission('CASHBOOK_REPORTS_VIEW') || hasPermission('CASHBOOK_REPORTS_MANAGE') || hasPermission('CASHBOOK_REPORTS_EXPORT') ||  // ✨ NOVĚ
  hasPermission('DOHADNE_VIEW') || hasPermission('DOHADNE_EDIT') || hasPermission('DOHADNE_MANAGE')  // ✨ NOVĚ
)) && moduleSettings.module_stats_reports_visible && (
  <MenuDropdownItem 
    to="/stats-reports" 
    onClick={() => setAnalyticsMenuOpen(false)}
  >
    <FontAwesomeIcon icon={faChartBar} /> Statistika a reporty
  </MenuDropdownItem>
)}
```

---

## 👥 **KDO VIDÍ MENU**

### **✅ Viditelné pro:**

| Právo | Úroveň | Popis |
|-------|--------|-------|
| **ADMIN / SUPERADMIN** | Vše | Vidí vše automaticky |
| **FIN_CONTROL_*** | VIEW/EDIT/MANAGE | Finanční kontrola |
| **EDUCATION_*** | VIEW/EDIT/MANAGE | Vzdělávání |
| **ATTACHMENTS_*** | VIEW/MANAGE | Přílohy |
| **PIVOT_*** | VIEW/EDIT/MANAGE | Agregační tabulka |
| **REPORT_*** | VIEW/EDIT/MANAGE | Reporty |
| **STATISTICS_*** | VIEW/EDIT/MANAGE | Statistiky |
| **SPENDING_*** | VIEW_ALL/VIEW_OWN/MANAGE | Čerpání |
| **CASHBOOK_REPORTS_*** | VIEW/MANAGE/EXPORT | Přehled pokladen ✨ |
| **DOHADNE_*** | VIEW/EDIT/MANAGE | Dohadné položky ✨ |

### **❌ Skryté pro:**
- Uživatele **BEZ** jakéhokoli z výše uvedených práv
- Když je `module_stats_reports_visible = '0'` v globálních nastaveních

---

## 🔒 **OMEZENÍ PODLE ÚSEKŮ**

### **Automatické filtrování v StatsReportsPage.js**

```javascript
// Má uživatel jakékoliv *_MANAGE právo? → může měnit filtr úseků
const canChangeUsekFilter = useMemo(() => {
  if (isAdminUser) return true;
  if (typeof hasPermission !== 'function') return false;
  return hasPermission('FIN_CONTROL_MANAGE') || hasPermission('EDUCATION_MANAGE') ||
    hasPermission('SPENDING_MANAGE') || hasPermission('REPORT_MANAGE') ||
    hasPermission('STATISTICS_MANAGE') || hasPermission('ATTACHMENTS_MANAGE') ||
    hasPermission('PIVOT_MANAGE') || hasPermission('ORDER_MANAGE') ||
    hasPermission('SPENDING_VIEW_ALL');
}, [isAdminUser, hasPermission]);
```

### **Pravidla:**

| Práva uživatele | Vidí úseky | Může měnit filtr |
|-----------------|------------|------------------|
| `*_MANAGE` | ✅ Všechny | ✅ Ano |
| `SPENDING_VIEW_ALL` | ✅ Všechny | ✅ Ano |
| `SPENDING_VIEW_OWN` | ⚠️ Jen svůj | ❌ Ne |
| `*_VIEW` (ostatní) | ⚠️ Jen svůj | ❌ Ne |
| **ADMIN** | ✅ Všechny | ✅ Ano |

---

## ⚙️ **GLOBÁLNÍ NASTAVENÍ**

### **Database: `25_app_global_settings`**

```sql
setting_key: 'module_stats_reports_visible'
setting_value: '1'  -- '1' = viditelné, '0' = skryté
description: 'Viditelnost modulu Statistika a reporty v menu'
```

### **Default hodnota v kódu:**
```php
// globalSettingsHandlers.php
'module_stats_reports_visible' => ($settings['module_stats_reports_visible'] ?? '1') === '1'
```

→ **Default: AKTIVNÍ** (`'1'`)

---

## 📝 **ZMĚNĚNÉ SOUBORY**

### **1. Frontend - Layout.js**
**Soubor:** `/apps/eeo-v2/client/src/components/Layout.js`

**Změny:**
- ✅ Přidána práva `CASHBOOK_REPORTS_*` do `hasAnalyticsManagePermission` (řádek 1914-1929)
- ✅ Přidána práva `DOHADNE_*` do `hasAnalyticsManagePermission`
- ✅ Přidána stejná práva do podmínky menu položky (řádek 3772-3790)

### **2. Database migrace**
**Soubor:** `/migrations/2026_04_13_stats_reports_module_activation.sql`

**Účel:**
- Zajišťuje existenci `module_stats_reports_visible = '1'` v databázi
- Použití: `ON DUPLICATE KEY UPDATE` (safe pro opakované spuštění)

---

## 🧪 **TESTOVÁNÍ**

### **Test 1: Viditelnost menu**

1. **Přihlásit se jako ADMIN**
   - ✅ Menu "Manažerské analýzy" by mělo být viditelné
   - ✅ Položka "Statistika a reporty" by měla být v dropdownu

2. **Přihlásit se jako HLAVNI_UCETNI**
   - ✅ Měl by vidět "Manažerské analýzy"
   - ✅ Měl by vidět "Statistika a reporty" (má DOHADNE_VIEW + CASHBOOK_REPORTS_VIEW)

3. **Přihlásit se jako běžný uživatel BEZ práv**
   - ❌ Neměl by vidět "Manažerské analýzy"
   - ❌ Neměl by mít přístup k `/stats-reports`

### **Test 2: Filtrace podle úseků**

1. **ADMIN**
   - ✅ Může změnit filtr úseků
   - ✅ Vidí data všech úseků

2. **Uživatel s SPENDING_VIEW_OWN**
   - ⚠️ Filtr fixně nastaven na jeho úsek
   - ❌ Nemůže měnit filtr
   - ⚠️ Vidí jen data svého úseku

3. **Uživatel s SPENDING_MANAGE**
   - ✅ Může změnit filtr úseků
   - ✅ Vidí data všech úseků

### **Test 3: Globální nastavení**

1. **Deaktivovat modul:**
   ```sql
   UPDATE `25_app_global_settings` 
   SET `setting_value` = '0' 
   WHERE `setting_key` = 'module_stats_reports_visible';
   ```
   - ❌ Menu by se **NEMĚLO** zobrazit (ani adminům)

2. **Aktivovat modul:**
   ```sql
   UPDATE `25_app_global_settings` 
   SET `setting_value` = '1' 
   WHERE `setting_key` = 'module_stats_reports_visible';
   ```
   - ✅ Menu by se mělo **ZOBRAZIT** (uživatelům s právy)

---

## 📊 **SHRNUTÍ**

### ✅ **Co bylo implementováno:**

1. ✅ Rozšířena kontrola práv v `hasAnalyticsManagePermission`
2. ✅ Přidána práva `CASHBOOK_REPORTS_*` a `DOHADNE_*`
3. ✅ Aktualizována podmínka menu položky "Statistika a reporty"
4. ✅ Vytvořena migrace pro aktivaci modulu v DB
5. ✅ Automatické filtrování podle úseků uživatele

### 🎯 **Výsledek:**

- Menu "Statistika a reporty" je **viditelné** pro uživatele s příslušnými právy
- Automaticky se **filtrují data** podle úseku uživatele (pokud nemá `*_MANAGE` nebo `*_VIEW_ALL`)
- Globální nastavení `module_stats_reports_visible` ovládá viditelnost modulu
- **9 sekcí** (záložek) s granulární kontrolou práv

---

## 🚀 **DALŠÍ KROKY**

1. ⏳ **Spustit migraci aktivace:**
   ```bash
   mysql -u root -p EEO-OSTRA-DEV < migrations/2026_04_13_stats_reports_module_activation.sql
   ```

2. ⏳ **Otestovat viditelnost menu** s různými rolemi

3. ⏳ **Ověřit filtrování podle úseků**

4. ⏳ **Po validaci aplikovat na PRODUKCI**

---

## 🔗 **SOUVISEJÍCÍ DOKUMENTY**

- [STATS_REPORTY_PRAVA_ANALYZA.md](STATS_REPORTY_PRAVA_ANALYZA.md) - Kompletní přehled práv
- [PREHLED_POKLADEN_ANALYZA.md](PREHLED_POKLADEN_ANALYZA.md) - Analýza sekce Přehled pokladen
- `/migrations/2026_04_13_stats_reports_dohadne_permissions.sql` - Práva pro Dohadné položky
- `/migrations/2026_04_13_cashbook_reports_permissions_fix.sql` - Oprava práv pro Přehled pokladen
- `/migrations/2026_04_13_stats_reports_module_activation.sql` - Aktivace modulu v DB
