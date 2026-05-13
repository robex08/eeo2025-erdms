# 🐛 OPRAVA: Čerpání z pokladny se nezobrazovalo v progress baru

**Datum:** 2026-04-13
**Soubor:** `apps/eeo-v2/client/src/components/LimitovanePrislibyManager.js`
**Problém:** Čerpání z pokladny se nezapočítávalo do zobrazení "VYČERPÁNO" a progress baru

---

## 📋 POPIS PROBLÉMU

Na základě screenshotu LP "LPIA1" s:
- **Limit:** 15 000 Kč
- **Pokladna:** 4 120 Kč
- **Vyčerpáno (zobrazeno):** 0 Kč ❌
- **Zbývá:** 10 880 Kč ✅ (správně)
- **Progress:** 0.0% ❌

**Root Cause:**
Backend správně odděluje faktury (`skutecne_cerpano`) a pokladnu (`cerpano_pokladna`) do dvou sloupců.
Frontend zobrazoval jen `skutecne_cerpano` bez přičtení `cerpano_pokladna`.

---

## ✅ OPRAVENÝCH 6 MÍST

### 1. **Tooltip "Skutečně" - režim se 3 typy** (~řádek 2112)
```javascript
// ❌ PŘED
<td><strong>{formatAmount(lp.skutecne_cerpano)}</strong></td>

// ✅ PO
<td><strong>{formatAmount((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0))}</strong></td>
```
+ Přidán podmíněný řádek "z toho pokladna" v tooltipu

### 2. **Tooltip "Skutečně" - režim bez 3 typů** (~řádek 2134)
```javascript
// ❌ PŘED
<td><strong>{formatAmount(lp.skutecne_cerpano)}</strong></td>

// ✅ PO
<td><strong>{formatAmount((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0))}</strong></td>
```
+ Přidán podmíněný řádek "z toho pokladna" v tooltipu

### 3. **Progress bar výpočet - getJezevcikState** (~řádek 2203)
```javascript
// ❌ PŘED
const skutecne = lp.skutecne_cerpano || 0;

// ✅ PO
const skutecne = (lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0);
```

### 4. **Tabulka - sloupec "VYČERPÁNO"** (~řádek 2529)
```javascript
// ❌ PŘED
<MainAmount $color="#10b981" title="Potvrzené faktury + LP rozpis + pokladna">
  {formatAmount(lp.skutecne_cerpano)}
</MainAmount>

// ✅ PO
<MainAmount $color="#10b981" title="Potvrzené faktury + LP rozpis + pokladna">
  {formatAmount((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0))}
</MainAmount>
```

### 5. **Osobní LP - výpočet skutečně, zbývá, procenta** (~řádek 2360)
```javascript
// ❌ PŘED
const skutecne = parseFloat(lp.skutecne_cerpano || 0);

// ✅ PO
const skutecne = parseFloat(lp.skutecne_cerpano || 0) + parseFloat(lp.cerpano_pokladna || 0);
```

### 6. **Export/PDF - celkové statistiky (2x)** (~řádek 2796 a ~2835)
```javascript
// ❌ PŘED
const totalSkutecne = data.reduce((sum, lp) => sum + (lp.skutecne_cerpano || 0), 0);

// ✅ PO
const totalSkutecne = data.reduce((sum, lp) => sum + ((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0)), 0);
```

---

## ✅ JIŽ SPRÁVNĚ (NEMĚNĚNO)

### Backend handlers
- **limitovanePrislibyCerpaniHandlers_v2_pdo.php** - správně odděluje faktury a pokladnu
- **smlouvyHandlers.php** - správné volání stored procedure

### Frontend statistiky
- Řádek ~1969: `celkove_skutecne` - již správně počítá faktury + pokladna
```javascript
celkove_skutecne: filteredData.reduce((sum, lp) => sum + ((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0)), 0)
```

---

## 🧪 TESTOVÁNÍ

**Scénář:**
1. Otevřít modul `/cerpani`
2. Najít LP s čerpáním z pokladny (např. LPIA1)
3. **Ověřit:**
   - ✅ Sloupec "VYČERPÁNO" zobrazuje faktury + pokladna
   - ✅ Progress bar reflektuje faktury + pokladna
   - ✅ Tooltip "Skutečně" zobrazuje součet a samostatný řádek "z toho pokladna"
   - ✅ Osobní LP zobrazuje správně
   - ✅ Export/PDF obsahuje správné součty

**Příklad očekávaného výsledku:**
- **Limit:** 15 000 Kč
- **Vyčerpáno:** 4 120 Kč (dříve 0 Kč ❌)
- **Progress:** 27.5% (dříve 0% ❌)
- **Zbývá:** 10 880 Kč ✅ (stejné)

---

## 📝 POZNÁMKY

1. **Proč oddělený sloupec `cerpano_pokladna`?**
   - Backend správně odděluje faktury (účetně doložené) a pokladnu (hotovost)
   - Umožňuje sledovat odděleně a filtrovat
   - Pro zobrazení uživateli je třeba sčítat

2. **Další vylepšení tooltipů:**
   - Přidán podmíněný řádek "z toho pokladna" pouze pokud pokladna > 0
   - Šedá barva (#6b7280) pro odlišení od hlavního čísla

3. **Zpětná kompatibilita:**
   - Všechny změny zachovávají stávající API
   - Backend beze změny

---

## 🔍 SOUVISEJÍCÍ DOKUMENTACE

- `ANALYZA_CERPANI_SYSTEM.md` - kompletní analýza systému čerpání
- `ZJISTENI_A_DOPORUCENI.md` - doporučení pro údržbu
- `SOUHRN_PRO_UZIVATELE.md` - uživatelská dokumentace

---

**Autor:** GitHub Copilot
**Status:** ✅ HOTOVO - bez chyb v kódu
