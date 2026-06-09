# 📊 ČERPÁNÍ - Dva Oddělené Moduly s Různými Právy

**Datum:** 8. června 2026  
**Účel:** Vyjasnit rozdíl mezi samostatným modulem `/cerpani` a sekci v "Statistika a reporty"

---

## 🎯 DVAKRÁT "ČERPÁNÍ" - ALE JSOU TO RŮZNÉ VĚCI!

### MODUL 1️⃣: Samostatný Modul "ČERPÁNÍ" (`/cerpani`)

**URL:** `/cerpani`  
**Menu:** Hlavní menu → "Čerpání" (samostatná položka)  
**Komponenta:** `CerpaniPage.js`  

#### Práva pro přístup:

| Kategorie | Práva | Přístup | Popis |
|-----------|-------|---------|-------|
| **Čerpání LP** | `LP_MANAGE` | ⚙️ Správa | Správa čerpání LP |
| **Čerpání LP** | `LP_VIEW_ALL` | 👥 Všechny | Zobrazení všech LP |
| **Čerpání LP** | `LP_VIEW_OWN` | 👤 Jen své | Zobrazení jen svého LP |
| **Čerpání Smluv** | `CONTRACT_MANAGE` | ⚙️ Správa | Správa čerpání smluv |
| **Čerpání Smluv** | `CONTRACT_VIEW_ALL` | 👥 Všechny | Zobrazení všech smluv |
| **Čerpání Smluv** | `CONTRACT_VIEW_OWN` | 👤 Jen své | Zobrazení jen svých smluv |
| **Obecné** | `SPENDING_MANAGE` | ⚙️ Správa | Obecné právo na čerpání |

**Přístup v kódu** (availableSections.js):
```javascript
const canAccessCerpani = isAdmin || (hasPermission && (
  hasPermission('SPENDING_MANAGE') || 
  hasPermission('LP_MANAGE') || 
  hasPermission('CONTRACT_MANAGE') ||
  hasPermission('SPENDING_VIEW_ALL') || 
  hasPermission('SPENDING_VIEW_OWN') ||
  hasPermission('LP_VIEW_ALL') || 
  hasPermission('LP_VIEW_OWN') ||
  hasPermission('CONTRACT_VIEW_ALL') || 
  hasPermission('CONTRACT_VIEW_OWN')
));
```

**Obsah modulu:**
- Limitované přísliby (LP) - detailní správa
- Čerpání ze smluv
- Tabulky s daty
- Detail po uživatelích / úsecích

---

### MODUL 2️⃣: Sekce v "Statistika a Reporty" (`/stats-reports?tab=spend`)

**URL:** `/stats-reports` (s tab=spend)  
**Menu:** Manažerské analýzy → "Statistika a reporty" → tab "Čerpání"  
**Komponenta:** Součást `StatsReportsPage.js`  

#### Práva pro přístup:

| Právo | Přístup | Popis |
|-------|---------|-------|
| `SPENDING_VIEW_OWN` | 👤 Jen svůj úsek | Zobrazení čerpání - omezeno na úsek |
| `SPENDING_VIEW_ALL` | 👥 Všechny úseky | Zobrazení čerpání - všechna data |
| `SPENDING_MANAGE` | ⚙️ Správa | Plná správa + změna filtrů |

**Přístup v kódu** (StatsReportsPage.js):
```javascript
case 'spend':
  return hasPermission('SPENDING_VIEW_ALL') || 
         hasPermission('SPENDING_VIEW_OWN') || 
         hasPermission('SPENDING_MANAGE');
```

**Obsah sekce:**
- Čerpání s rozpadem po úsecích
- Čerpání: Úsek → Financování
- Čerpání: Druh → Financování
- Čerpání: Financování → Úsek → Druh
- Čerpání LP: podle LP kódu
- Čerpání ze Smluv (agregované)
- Grafy a statistiky

---

## 🔍 POROVNÁNÍ: Jaký Modul Použít?

| Aspekt | Modul `/cerpani` | Sekce v Stats & Reports |
|--------|------------------|------------------------|
| **URL** | `/cerpani` | `/stats-reports?tab=spend` |
| **Menu** | Samostatná položka | V "Manažerské analýzy" |
| **Práva** | `LP_*`, `CONTRACT_*` | `SPENDING_*` |
| **Účel** | Detail + správa | Analýzy + statistiky |
| **Uživatelé** | Správci LP, objednatelé | Analytici, manažeři |
| **Vizualizace** | Tabulky + detail | Grafy + agregované přehledy |

---

## ⚠️ KONFLIKT? NENÍ!

**Nejde o duplicitu, jsou to RŮZNÉ MODULY s RŮZNÝMI PRÁVAMI!**

- `/cerpani` = **Detail a správa** konkrétních LP/smluv
- `/stats-reports?tab=spend` = **Agregované analýzy a reporty** čerpání

**Stejný terminologický název ("Čerpání"), ale různé funkce.**

---

## ✅ OVĚŘENÍ: Má ČERPÁNÍ Správné PRÁVO?

### 1. Modul `/cerpani` ✅

**Práva existují v DB?** Ano - `LP_MANAGE`, `LP_VIEW_ALL`, `LP_VIEW_OWN`, `CONTRACT_MANAGE`, atd.

### 2. Sekce v "Statistika a reporty" ✅

**Práva existují v DB?** Ano - `SPENDING_VIEW_OWN`, `SPENDING_VIEW_ALL`, `SPENDING_MANAGE`

**Přiřazena uživatelům/rolím?** Ověřit SQL:
```sql
-- Kontrola přiřazení SPENDING práv
SELECT r.nazev_role, rp.kod_prava
FROM 25_role r
JOIN 25_role_prava rp ON r.id_role = rp.id_role
WHERE rp.kod_prava LIKE 'SPENDING_%'
ORDER BY r.nazev_role;
```

---

## 📋 SHRNUTÍ

| # | Modul | Typ | Práva | Status |
|----|--------|------|-------|--------|
| 1 | **Čerpání** (`/cerpani`) | Správa + Detail | `LP_*`, `CONTRACT_*` | ✅ Hotovo |
| 2 | **Čerpání** v Stats & Reports | Analýzy | `SPENDING_*` | ✅ Hotovo |

**Celkem:** 2 moduly, 10+ práv, 0 konfliktů

---

## 🛠️ NOVÝ PŘEHLED: "UŠI" V MODULU /stats-reports

Návrat k původní otázce - v modulu "/stats-reports" máme **9 "oušek"**:

| # | Sekce | ID | Práva | Modul |
|----|--------|-----|--------|---------|
| 1 | Finanční kontrola | `control` | `FIN_CONTROL_*` | Nový |
| 2 | Vzdělávání | `vzdel` | `EDUCATION_*` | Nový |
| 3 | **Čerpání** | `spend` | `SPENDING_*` | ← **Sem patří `/stats-reports` verze** |
| 4 | Reporty | `reports` | `REPORT_*` | Nový |
| 5 | Statistiky | `stats` | `STATISTICS_*` | Nový |
| 6 | Přílohy | `attachments` | `ATTACHMENTS_*` | Nový |
| 7 | Agregační tabulka | `pivot` | `PIVOT_*` | Nový |
| 8 | Přehled pokladen | `cashbook` | `CASHBOOK_REPORTS_*` | Nový |
| 9 | Dohadné položky | `dohadne` | `DOHADNE_*` | Nový |

**Samostatný modul:**
- **Čerpání** (`/cerpani`) | `LP_*`, `CONTRACT_*` | Starší, ale stále fungující

---

**Vypracoval:** GitHub Copilot  
**Zdroj:** Analýza `availableSections.js` + `StatsReportsPage.js` + `CerpaniPage.js`
