# 📊 STATS & REPORTY – Analýza Práv a Viditelnosti Sekcí

**Datum:** 13. dubna 2026  
**Soubor:** `/apps/eeo-v2/client/src/pages/StatsReportsPage.js`

---

## 📋 PŘEHLED VŠECH ZÁLOŽEK (9 SEKCÍ)

| # | ID záložky | Název | Ikona | Status práv |
|---|------------|-------|-------|-------------|
| 1 | `control` | Finanční kontrola | ⚠️ | ✅ **Má práva** |
| 2 | `vzdel` | Vzdělávání | 🎓 | ✅ **Má práva** |
| 3 | `spend` | Čerpání | 💰 | ✅ **Má práva** |
| 4 | `reports` | Reporty | 🧾 | ✅ **Má práva** |
| 5 | `stats` | Statistiky | 📈 | ✅ **Má práva** |
| 6 | `attachments` | Přílohy | 📎 | ✅ **Má práva** |
| 7 | `pivot` | Agregační tabulka - vlastní | 📊 | ✅ **Má práva** |
| 8 | `cashbook` | Přehled pokladen | 🪙 | ⚠️ **CHYBNÁ MIGRACE!** |
| 9 | `dohadne` | Dohadné položky | ⏳ | ✅ **OPRAVENO** |

---

## 🔐 DETAILNÍ MAPA PRÁV

### 1️⃣ **FINANČNÍ KONTROLA** (`control`)

**Práva:**
- `FIN_CONTROL_VIEW` - základní zobrazení
- `FIN_CONTROL_EDIT` - editace
- `FIN_CONTROL_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'control':
  return hasPermission('FIN_CONTROL_VIEW') || 
         hasPermission('FIN_CONTROL_EDIT') || 
         hasPermission('FIN_CONTROL_MANAGE');
```

**Co sekce obsahuje:**
- Faktury vyšší než schválená objednávka
- Objednávka vytvořená po doručení faktury
- Objednávky s fakturami bez příloh
- Faktury bez přílohy
- Faktury po splatnosti 14+ dní
- Zrušené a zamítnuté objednávky

---

### 2️⃣ **VZDĚLÁVÁNÍ** (`vzdel`)

**Práva:**
- `EDUCATION_VIEW` - základní zobrazení
- `EDUCATION_EDIT` - editace
- `EDUCATION_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'vzdel':
  return hasPermission('EDUCATION_VIEW') || 
         hasPermission('EDUCATION_EDIT') || 
         hasPermission('EDUCATION_MANAGE');
```

**Co sekce obsahuje:**
- Vzdělávání – kurzy zdravotnické a lékařské
- Školení – nelékařské
- Přehled dle střediska / úseku

---

### 3️⃣ **ČERPÁNÍ** (`spend`)

**Práva:**
- `SPENDING_VIEW_ALL` - zobrazení všech čerpání
- `SPENDING_VIEW_OWN` - zobrazení pouze svých čerpání
- `SPENDING_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'spend':
  return hasPermission('SPENDING_VIEW_ALL') || 
         hasPermission('SPENDING_VIEW_OWN') || 
         hasPermission('SPENDING_MANAGE');
```

**Co sekce obsahuje:**
- Čerpání s rozpadem po úsecích
- Čerpání: Úsek → Financování
- Čerpání: Druh → Financování
- Čerpání: Financování → Úsek → Druh
- Čerpání LP: podle LP kódu
- Čerpání ze Smluv

**⚠️ Speciální logika:**
- Uživatel s `SPENDING_VIEW_OWN` vidí pouze data svého úseku
- Uživatel s `SPENDING_VIEW_ALL` nebo `SPENDING_MANAGE` vidí všechna data

---

### 4️⃣ **REPORTY** (`reports`)

**Práva:**
- `REPORT_VIEW` - základní zobrazení
- `REPORT_EDIT` - editace
- `REPORT_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'reports':
  return hasPermission('REPORT_VIEW') || 
         hasPermission('REPORT_EDIT') || 
         hasPermission('REPORT_MANAGE');
```

**Co sekce obsahuje:**
- Dodavatelé → Financování → Objednávky
- Objednávky bez faktury 2+ měsíce (schváleno+)
- Objednávky s fakturou, nedokončené
- Objednávky financované z LP s fakturou bez rozkladu na LP

---

### 5️⃣ **STATISTIKY** (`stats`)

**Práva:**
- `STATISTICS_VIEW` - základní zobrazení
- `STATISTICS_EDIT` - editace
- `STATISTICS_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'stats':
  return hasPermission('STATISTICS_VIEW') || 
         hasPermission('STATISTICS_EDIT') || 
         hasPermission('STATISTICS_MANAGE');
```

**Co sekce obsahuje:**
- Vývoj částek objednávek (timeline)
- Financování – počet a částka
- Úseky – počet a částka
- Druhy objednávek – počet a částka
- LP kódy – počet a částka
- Top dodavatelé (částka)
- Top objednatelé (počet a částka)
- Koláčový: členění dle financování
- Koláčový: členění dle stavu objednávek

---

### 6️⃣ **PŘÍLOHY** (`attachments`)

**Práva:**
- `ATTACHMENTS_VIEW` - základní zobrazení
- `ATTACHMENTS_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'attachments':
  return hasPermission('ATTACHMENTS_VIEW') || 
         hasPermission('ATTACHMENTS_MANAGE');
```

**Co sekce obsahuje:**
- Přílohy objednávek podle typu
- Přílohy faktur podle typu
- Přehled všech příloh
- Objednávky bez příloh
- Faktury bez příloh

---

### 7️⃣ **AGREGAČNÍ TABULKA** (`pivot`)

**Práva:**
- `PIVOT_VIEW` - základní zobrazení
- `PIVOT_EDIT` - editace
- `PIVOT_MANAGE` - správa

**Kód kontroly:**
```javascript
case 'pivot':
  return hasPermission('PIVOT_VIEW') || 
         hasPermission('PIVOT_EDIT') || 
         hasPermission('PIVOT_MANAGE');
```

**Co sekce obsahuje:**
- Agregační tabulka (vlastní sestavy s možností pivot/group-by)

---

### 8️⃣ **PŘEHLED POKLADEN** (`cashbook`) — ⚠️ **PROBLÉM S MIGRACÍ!**

**Práva:** ✅ **SPRÁVNĚ V KÓDU**
- `CASHBOOK_REPORTS_VIEW` - základní zobrazení
- `CASHBOOK_REPORTS_MANAGE` - správa
- `CASHBOOK_REPORTS_EXPORT` - export

**Kód kontroly:** ✅ **SPRÁVNĚ**
```javascript
case 'cashbook':
  return hasPermission('CASHBOOK_REPORTS_VIEW') || 
         hasPermission('CASHBOOK_REPORTS_MANAGE') || 
         hasPermission('CASHBOOK_REPORTS_EXPORT');
```

**Co sekce obsahuje:**
- Přehled pokladen (agregovaný přehled všech pokladních knih)
- Grafy (vizualizace výdajů a příjmů)
- Detail položek jednotlivých pokladních knih
- Filtry podle roku/měsíce

**⚠️ KRITICKÝ PROBLÉM - CHYBNÁ MIGRACE:**
- Migrace `2026_03_30_cashbook_overview_permissions.sql` vytvořila **ŠPATNÁ PRÁVA**:
  - ❌ `CASHBOOK_OVERVIEW_VIEW` (místo `CASHBOOK_REPORTS_VIEW`)
  - ❌ `CASHBOOK_OVERVIEW_EXPORT` (místo `CASHBOOK_REPORTS_EXPORT`)
  - ❌ Chybí `CASHBOOK_REPORTS_MANAGE`
- Backend API i frontend používají **JINÁ** práva (`CASHBOOK_REPORTS_*`)
- **DŮSLEDEK:** Uživatelé s právy z migrace **NEVIDÍ** záložku!

**✅ ŘEŠENÍ:**
- Vytvořena opravná migrace: [migrations/2026_04_13_cashbook_reports_permissions_fix.sql](migrations/2026_04_13_cashbook_reports_permissions_fix.sql)
- Detailní analýza: [PREHLED_POKLADEN_ANALYZA.md](PREHLED_POKLADEN_ANALYZA.md)

---

### 9️⃣ **DOHADNÉ POLOŽKY** (`dohadne`) — ✅ **OPRAVENO!**

**Práva:** ✅ **IMPLEMENTOVÁNO**
- `DOHADNE_VIEW` - základní zobrazení
- `DOHADNE_EDIT` - editace
- `DOHADNE_MANAGE` - správa

**Kód kontroly:** ✅ **PŘIDÁNO**
```javascript
case 'dohadne':
  return hasPermission('DOHADNE_VIEW') || 
         hasPermission('DOHADNE_EDIT') || 
         hasPermission('DOHADNE_MANAGE');
```

**Co sekce obsahuje:**
- Dohadné položky — Limitované přísliby - dle LP účtu
- Dohadné položky — Limitované přísliby - dle LP kódu
- Dohadné položky — Smlouvy

**🎉 Záložka je nyní viditelná pro uživatele s příslušnými právy!**

---

## 🚨 ~~CHYBĚJÍCÍ PRÁVA~~ → ✅ OPRAVENO

### ~~**Dohadné položky**~~ — ✅ **IMPLEMENTOVÁNO 13.4.2026**

**Vytvořená práva:**
```sql
INSERT IGNORE INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
('DOHADNE_VIEW', 'Zobrazení dohadných položek', 1),
('DOHADNE_EDIT', 'Editace dohadných položek', 1),
('DOHADNE_MANAGE', 'Správa dohadných položek', 1);
```

**Implementovaná změna v kódu:**
```javascript
// Soubor: /apps/eeo-v2/client/src/pages/StatsReportsPage.js
// Řádek cca 2329

case 'dohadne':
  return hasPermission('DOHADNE_VIEW') || 
         hasPermission('DOHADNE_EDIT') || 
         hasPermission('DOHADNE_MANAGE');
```

**Soubory změn:**
- ✅ Frontend: `/apps/eeo-v2/client/src/pages/StatsReportsPage.js`
- ✅ Migrace DB: `/migrations/2026_04_13_stats_reports_dohadne_permissions.sql`

---

## 👥 KDO CO MŮŽE VIDĚT

### **ADMIN / SUPERADMIN**
- ✅ Vidí **VŠECHNY** záložky (včetně `dohadne`)
- ✅ Může měnit filtry úseků napříč celou aplikací

### **Uživatel s `*_MANAGE` právy**
- ✅ Vidí záložky podle přidělených práv
- ✅ Může měnit filtry úseků
- ✅ Vidí data všech úseků (pokud má `*_MANAGE`)

### **Uživatel s `*_VIEW` právy**
- ✅ Vidí záložky podle přidělených práv
- ⚠️ **Nemůže** měnit filtry úseků (zůstává fixně na svém úseku)
- ⚠️ Vidí pouze data svého úseku (platí především pro `SPENDING_VIEW_OWN`)

### **Běžný uživatel BEZ práv**
- ❌ Žádné záložky v Stats & Reporty nejsou viditelné
- ❌ Může vidět pouze admin menu položky

---

## 📊 SPECIÁLNÍ LOGIKA

### **Filtr úseků (canChangeUsekFilter)**
Uživatel může měnit filtr úseků, pokud má:
- `FIN_CONTROL_MANAGE`
- `EDUCATION_MANAGE`
- `SPENDING_MANAGE`
- `REPORT_MANAGE`
- `STATISTICS_MANAGE`
- `ATTACHMENTS_MANAGE`
- `PIVOT_MANAGE`
- `ORDER_MANAGE`
- `SPENDING_VIEW_ALL`
- nebo je **ADMIN**

**Pokud nemůže měnit filtr:**
- Filtr úseků je fixně nastaven na úsek uživatele (`userUsekId`)
- Vidí pouze data svého úseku

---

## ✅ AKČNÍ BODY

### ~~1. **Doplnit práva pro "Dohadné položky"**~~ → ✅ **HOTOVO 13.4.2026**

**✅ SQL migrace vytvořena:**
- Soubor: `/migrations/2026_04_13_stats_reports_dohadne_permissions.sql`
- Práva: `DOHADNE_VIEW`, `DOHADNE_EDIT`, `DOHADNE_MANAGE`
- Přiřazeno rolím: ADMIN, SUPERADMIN, HLAVNI_UCETNI, UCETNI, SPRAVCE_ROZPOCTU, ROZPOCTAR

**✅ Frontend úprava provedena:**
- Soubor: `/apps/eeo-v2/client/src/pages/StatsReportsPage.js`
- Přidán `case 'dohadne'` do `switch` statement

**Další kroky:**
1. ⏳ **Spustit migraci na DEV databázi**
2. ⏳ **Otestovat viditelnost záložky s různými právy**
3. ⏳ **Po validaci spustit migraci na PRODUKCI**

### 2. **Opravit práva pro "Přehled pokladen"** ⚠️ **KRITICKÉ!**

**Problém:**
- Stará migrace vytvořila **chybné** názvy práv
- Backend a frontend používají **jiná** práva
- Uživatelé s právy z migrace **nevidí** záložku

**✅ Opravná migrace vytvořena:**
- Soubor: `/migrations/2026_04_13_cashbook_reports_permissions_fix.sql`
- Opravuje práva: `CASHBOOK_OVERVIEW_*` → `CASHBOOK_REPORTS_*`
- Přiřazuje rolím: ADMIN, SUPERADMIN, HLAVNI_UCETNI, UCETNI, SPRAVCE_ROZPOCTU, ROZPOCTAR

**📋 Detailní analýza:**
- Dokument: [PREHLED_POKLADEN_ANALYZA.md](PREHLED_POKLADEN_ANALYZA.md)
- Obsahuje kompletní popis problému, endpointy API, ukázky dat

**Další kroky:**
1. ⏳ **Spustit opravenou migraci na DEV**
2. ⏳ **Ověřit, že záložka je viditelná pro příslušné role**
3. ⏳ **Přejmenovat starou migraci na DEPRECATED**
4. ⏳ **Po validaci aplikovat na PRODUKCI**

---

### 3. **Aktualizovat dokumentaci oprávnění**

Doplnit do centrálního dokumentu oprávnění všechna práva:
- Vytvořit přehlednou tabulku všech práv
- Dokumentovat, kdo má jaká práva přidělena
- Vytvořit návod pro správce na přidělování práv

### 3. **Aktualizovat dokumentaci oprávnění**

Doplnit do centrálního dokumentu oprávnění všechna práva:
- Vytvořit přehlednou tabulku všech práv
- Dokumentovat, kdo má jaká práva přidělena
- Vytvořit návod pro správce na přidělování práv

### 4. **Otestovat viditelnost záložek**

- Vytvořit testovací uživatele s různými právy
- Ověřit, že každá záložka se zobrazuje pouze uživatelům s příslušnými právy
- Ověřit filtrování dat dle úseků
- **SPECIÁLNĚ OTESTOVAT:** Přehled pokladen po opravě migrace

---

## 📝 POZNÁMKY

- Všechna práva jsou kontrolována na **frontendu** i **backendu**
- Backend API endpointy by měly mít vlastní kontrolu oprávnění
- LocalStorage klíč pro aktivní záložku: `stats_reports_active_tab_{userId}`
- LocalStorage klíč pro filtry: `stats_reports_filters_{userId}`

**⚠️ SPECIÁLNÍ POZORNOST:**
- **Dohadné položky** - nově přidaná práva, otestovat!
- **Přehled pokladen** - chybná migrace, nutná oprava!

---

## 🐛 **NALEZENÉ PROBLÉMY**

### **1. Dohadné položky - chybějící práva** ✅ OPRAVENO
- **Stav:** VYŘEŠENO 13.4.2026
- **Migrace:** `/migrations/2026_04_13_stats_reports_dohadne_permissions.sql`
- **Frontend:** Přidán `case 'dohadne'` do kontroly práv

### **2. Přehled pokladen - chybná migrace** ⚠️ ČEKÁ NA APLIKACI
- **Stav:** PŘIPRAVENO K OPRAVĚ
- **Problém:** Stará migrace vytvořila `CASHBOOK_OVERVIEW_*` místo `CASHBOOK_REPORTS_*`
- **Opravná migrace:** `/migrations/2026_04_13_cashbook_reports_permissions_fix.sql`
- **Detaily:** [PREHLED_POKLADEN_ANALYZA.md](PREHLED_POKLADEN_ANALYZA.md)
- **Akce:** Spustit opravenou migraci, otestovat, přejmenovat starou

---

## 🔗 SOUVISEJÍCÍ SOUBORY

- `/apps/eeo-v2/client/src/pages/StatsReportsPage.js` - hlavní soubor
- `/apps/eeo-v2/client/src/context/AuthContext.js` - správa oprávnění
- `/apps/eeo-v2/client/docs/REPORTY-STATISTIKY-*.md` - dokumentace
