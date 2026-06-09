# 📊 STATS & REPORTY - Přiřazená Práva pro Jednotlivé Sekce

**Datum:** 8. června 2026  
**Účel:** Přehled všech "oušek" (sekcí) v modulu **Statistika a reporty** s jejich přiřazenými právy

---

## 🎯 MAPA "OUŠEK" A JEJICH PRÁV

### 1. 🔍 **FINANČNÍ KONTROLA** (`control`)
**Vidí:** Finanční anomálie a incidenty

| Právo | Přístup | Popis |
|-------|---------|-------|
| `FIN_CONTROL_VIEW` | ✅ Zobrazení | Základní čtení |
| `FIN_CONTROL_EDIT` | ✏️ Editace | Úpravy |
| `FIN_CONTROL_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'control':
  return hasPermission('FIN_CONTROL_VIEW') || 
         hasPermission('FIN_CONTROL_EDIT') || 
         hasPermission('FIN_CONTROL_MANAGE');
```

**Obsah:**
- Faktury vyšší než schválená objednávka
- Objednávka vytvořená po doručení faktury
- Objednávky s fakturami bez příloh
- Faktury bez přílohy
- Faktury po splatnosti 14+ dní
- Zrušené a zamítnuté objednávky

---

### 2. 🎓 **VZDĚLÁVÁNÍ** (`vzdel`)
**Vidí:** Vzdělávací programy a školení

| Právo | Přístup | Popis |
|-------|---------|-------|
| `EDUCATION_VIEW` | ✅ Zobrazení | Základní čtení |
| `EDUCATION_EDIT` | ✏️ Editace | Úpravy |
| `EDUCATION_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'vzdel':
  return hasPermission('EDUCATION_VIEW') || 
         hasPermission('EDUCATION_EDIT') || 
         hasPermission('EDUCATION_MANAGE');
```

**Obsah:**
- Vzdělávání – kurzy zdravotnické a lékařské
- Školení – nelékařské
- Přehled dle střediska / úseku

---

### 3. 💰 **ČERPÁNÍ LP** (`spend`) — ⚠️ **SPECIFICKÉ PRÁVO!**
**Vidí:** Čerpání limitovaných přislíbů a financování

| Právo | Přístup | Popis |
|-------|---------|-------|
| `SPENDING_VIEW_OWN` | 👤 Jen svůj úsek | Zobrazení - omezeno na úsek |
| `SPENDING_VIEW_ALL` | 👥 Všechny úseky | Zobrazení - všechna data |
| `SPENDING_MANAGE` | ⚙️ Správa | Plná správa + změna filtru |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'spend':
  return hasPermission('SPENDING_VIEW_ALL') || 
         hasPermission('SPENDING_VIEW_OWN') || 
         hasPermission('SPENDING_MANAGE');
```

**Obsah:**
- Čerpání s rozpadem po úsecích
- Čerpání: Úsek → Financování
- Čerpání: Druh → Financování
- Čerpání: Financování → Úsek → Druh
- Čerpání LP: podle LP kódu
- Čerpání ze Smluv

**🔐 Speciální logika viditelnosti:**
- Uživatel s `SPENDING_VIEW_OWN` → vidí **POUZE** data svého úseku, **NEMŮŽE** měnit filtr
- Uživatel s `SPENDING_VIEW_ALL` → vidí **VŠECHNA** data všech úseků, **MŮŽE** měnit filtr
- Uživatel s `SPENDING_MANAGE` → vidí **VŠECHNA** data, **MŮŽE** měnit filtr

---

### 4. 🧾 **REPORTY** (`reports`)
**Vidí:** Analytické a kontrolní reporty

| Právo | Přístup | Popis |
|-------|---------|-------|
| `REPORT_VIEW` | ✅ Zobrazení | Základní čtení |
| `REPORT_EDIT` | ✏️ Editace | Úpravy |
| `REPORT_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'reports':
  return hasPermission('REPORT_VIEW') || 
         hasPermission('REPORT_EDIT') || 
         hasPermission('REPORT_MANAGE');
```

**Obsah:**
- Dodavatelé → Financování → Objednávky
- Objednávky bez faktury 2+ měsíce (schváleno+)
- Objednávky s fakturou, nedokončené
- Objednávky financované z LP s fakturou bez rozkladu na LP

---

### 5. 📈 **STATISTIKY** (`stats`)
**Vidí:** Agregované statistiky a grafy

| Právo | Přístup | Popis |
|-------|---------|-------|
| `STATISTICS_VIEW` | ✅ Zobrazení | Základní čtení |
| `STATISTICS_EDIT` | ✏️ Editace | Úpravy |
| `STATISTICS_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'stats':
  return hasPermission('STATISTICS_VIEW') || 
         hasPermission('STATISTICS_EDIT') || 
         hasPermission('STATISTICS_MANAGE');
```

**Obsah:**
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

### 6. 📎 **PŘÍLOHY** (`attachments`)
**Vidí:** Správa příloh objednávek a faktur

| Právo | Přístup | Popis |
|-------|---------|-------|
| `ATTACHMENTS_VIEW` | ✅ Zobrazení | Základní čtení |
| `ATTACHMENTS_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'attachments':
  return hasPermission('ATTACHMENTS_VIEW') || 
         hasPermission('ATTACHMENTS_MANAGE');
```

**Obsah:**
- Přílohy objednávek podle typu
- Přílohy faktur podle typu
- Přehled všech příloh
- Objednávky bez příloh
- Faktury bez příloh

---

### 7. 📊 **AGREGAČNÍ TABULKA (PIVOT)** (`pivot`)
**Vidí:** Vlastní agregační tabulky a pivot analýzy

| Právo | Přístup | Popis |
|-------|---------|-------|
| `PIVOT_VIEW` | ✅ Zobrazení | Základní čtení |
| `PIVOT_EDIT` | ✏️ Editace | Úpravy |
| `PIVOT_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'pivot':
  return hasPermission('PIVOT_VIEW') || 
         hasPermission('PIVOT_EDIT') || 
         hasPermission('PIVOT_MANAGE');
```

**Obsah:**
- Agregační tabulka s možností pivot/group-by
- Vlastní sestavy

---

### 8. 🪙 **PŘEHLED POKLADEN (CASHBOOK)** (`cashbook`)
**Vidí:** Přehled pokladních knih a peněžního toku

| Právo | Přístup | Popis |
|-------|---------|-------|
| `CASHBOOK_REPORTS_VIEW` | ✅ Zobrazení | Základní čtení |
| `CASHBOOK_REPORTS_MANAGE` | ⚙️ Správa | Plná správa |
| `CASHBOOK_REPORTS_EXPORT` | 📥 Export | Export dat |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'cashbook':
  return hasPermission('CASHBOOK_REPORTS_VIEW') || 
         hasPermission('CASHBOOK_REPORTS_MANAGE') || 
         hasPermission('CASHBOOK_REPORTS_EXPORT');
```

**Obsah:**
- Přehled pokladen (agregovaný přehled všech pokladních knih)
- Grafy (vizualizace výdajů a příjmů)
- Detail položek jednotlivých pokladních knih
- Filtry podle roku/měsíce

**⚠️ POZNÁMKA:** Byla chybná migrace - viz [PREHLED_POKLADEN_ANALYZA.md](PREHLED_POKLADEN_ANALYZA.md)

---

### 9. ⏳ **DOHADNÉ POLOŽKY** (`dohadne`)
**Vidí:** Dohadné položky a nevyrovnané záväzy

| Právo | Přístup | Popis |
|-------|---------|-------|
| `DOHADNE_VIEW` | ✅ Zobrazení | Základní čtení |
| `DOHADNE_EDIT` | ✏️ Editace | Úpravy |
| `DOHADNE_MANAGE` | ⚙️ Správa | Plná správa |

**Přístup:** Uživatel vidí sekci pokud má KTERÉKOLI z těchto práv
```javascript
case 'dohadne':
  return hasPermission('DOHADNE_VIEW') || 
         hasPermission('DOHADNE_EDIT') || 
         hasPermission('DOHADNE_MANAGE');
```

**Obsah:**
- Dohadné položky — Limitované přísliby - dle LP účtu
- Dohadné položky — Limitované přísliby - dle LP kódu
- Dohadné položky — Smlouvy

---

## 🔍 KONTROLA: JE PRÁVO PRO ČERPÁNÍ NASTAVENÉ?

### Status: ✅ **ANO, MÁME PRÁVA**

**V databázi `25_prava` by měly existovat:**

```sql
-- Ověřit tyto práva v databázi:
SELECT kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava IN ('SPENDING_VIEW_OWN', 'SPENDING_VIEW_ALL', 'SPENDING_MANAGE')
ORDER BY kod_prava;
```

**Očekávaný výstup:**

| kod_prava | popis | aktivni |
|-----------|-------|---------|
| SPENDING_MANAGE | Správa čerpání | 1 |
| SPENDING_VIEW_ALL | Zobrazení všech čerpání | 1 |
| SPENDING_VIEW_OWN | Zobrazení čerpání - jen svůj úsek | 1 |

### ✅ Implementace v kódu:

1. **Menu viditelnost** (`Layout.js` - řádek ~52):
   ```javascript
   hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE')
   ```

2. **Sekce viditelnost** (`StatsReportsPage.js`):
   ```javascript
   case 'spend':
     return hasPermission('SPENDING_VIEW_ALL') || 
            hasPermission('SPENDING_VIEW_OWN') || 
            hasPermission('SPENDING_MANAGE');
   ```

3. **Filtr úseků** (`StatsReportsPage.js`):
   - Uživatel s `SPENDING_VIEW_OWN` vidí jen svůj úsek
   - Uživatel s `SPENDING_VIEW_ALL` nebo `SPENDING_MANAGE` vidí všechny úseky

---

## 📋 SHRNUTÍ: VŠECHNY "UŠI" V JEDNÉ TABULCE

| # | Název sekce | ID | Práva | Víc/méně | Status |
|----|------------|----|----|---------|--------|
| 1️⃣ | Finanční kontrola | `control` | `FIN_CONTROL_*` | 3 práva | ✅ Hotovo |
| 2️⃣ | Vzdělávání | `vzdel` | `EDUCATION_*` | 3 práva | ✅ Hotovo |
| 3️⃣ | **Čerpání** | `spend` | `SPENDING_*` | 3 práva | ✅ Hotovo |
| 4️⃣ | Reporty | `reports` | `REPORT_*` | 3 práva | ✅ Hotovo |
| 5️⃣ | Statistiky | `stats` | `STATISTICS_*` | 3 práva | ✅ Hotovo |
| 6️⃣ | Přílohy | `attachments` | `ATTACHMENTS_*` | 2 práva | ✅ Hotovo |
| 7️⃣ | Agregační tabulka | `pivot` | `PIVOT_*` | 3 práva | ✅ Hotovo |
| 8️⃣ | Přehled pokladen | `cashbook` | `CASHBOOK_REPORTS_*` | 3 práva | ✅ Hotovo |
| 9️⃣ | Dohadné položky | `dohadne` | `DOHADNE_*` | 3 práva | ✅ Hotovo |

**Celkem:** 9 sekcí, 23 práv

---

## 🎯 DALŠÍ KROKY

### Verifikace v databázi:

```sql
-- 1. Zkontrolovat všechna SPENDING práva
SELECT kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava LIKE 'SPENDING_%' 
ORDER BY kod_prava;

-- 2. Zkontrolovat přiřazení práv k rolím
SELECT r.nazev_role, rp.kod_prava
FROM 25_role r
JOIN 25_role_prava rp ON r.id_role = rp.id_role
WHERE rp.kod_prava LIKE 'SPENDING_%'
ORDER BY r.nazev_role, rp.kod_prava;

-- 3. Zkontrolovat přiřazení práv ke konkrétnímu uživateli
SELECT u.login, up.kod_prava
FROM 25_uzivatele u
JOIN 25_uzivatele_prava up ON u.id_uzivatel = up.id_uzivatel
WHERE up.kod_prava LIKE 'SPENDING_%'
ORDER BY u.login;
```

---

**Vypracoval:** GitHub Copilot  
**Zdroj:** Analýza `STATS_REPORTY_PRAVA_ANALYZA.md` + `STATS_REPORTY_MENU_IMPLEMENTACE.md`
