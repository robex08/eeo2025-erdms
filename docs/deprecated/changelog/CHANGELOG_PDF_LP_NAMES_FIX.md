# 🔧 CHANGELOG: PDF LP Kódy - Zobrazení Názvů Místo ID

**Datum:** 2025-01-03  
**Branch:** `feature/generic-recipient-system`  
**Autor:** GitHub Copilot

---

## 🎯 Problém

V PDF finančních kontrolních košilek (FinancialControlPDF.js) se zobrazovaly **ID LP kódů** místo jejich **skutečných názvů**.

### Příklad chyby:
```
LP kódy: 3, 5, 8
LP ID: 3
```

### Očekávaný výstup:
```
LP kódy: LP-001 - Spotřeba materiálu, LP-002 - Zákonné sociální náklady
LP kód: LP-001 - Spotřeba materiálu
```

---

## 🔍 Root Cause Analysis

### Backend (orderHandlers.php)
Backend **SPRÁVNĚ obohacuje** data v `enrichOrderFinancovani()` funkci:

```php
// orderHandlers.php:616-672
function enrichOrderFinancovani($db, &$order) {
    if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
        $lp_detaily = array();
        foreach ($order['financovani']['lp_kody'] as $lp_id) {
            $lp = getLPDetaily($db, $lp_id);
            if ($lp) {
                $lp_detaily[] = array(
                    'id' => $lp_id,
                    'cislo_lp' => $lp['cislo_lp'],      // ✅ Číslo LP (např. "LP-001")
                    'nazev' => $lp['nazev_uctu']        // ✅ Název účtu
                );
            }
        }
        $order['financovani']['lp_nazvy'] = $lp_detaily;  // ✅ Přidáno do order
    }
}
```

### Frontend (FinancialControlPDF.js) - PŘED OPRAVOU
Frontend **NESPÁVNĚ používal** pouze raw IDs:

```javascript
// ❌ CHYBA #1: Řádek 795-799 - Zobrazení LP kódů v sekci financování
<Text style={styles.controlValue}>
  {financovaniData.lp_kody.join(', ')}  {/* ❌ Zobrazuje [3, 5, 8] */}
</Text>

// ❌ CHYBA #2: Řádek 908 - Zobrazení LP kódu u položek objednávky
<Text style={styles.controlValue}>
  {polozka.lp_id}  {/* ❌ Zobrazuje "3" místo "LP-001 - Spotřeba materiálu" */}
</Text>
```

---

## ✅ Implementované Řešení

### 1. Přidání `lp_nazvy` do `financovaniData` (řádek 565)

```javascript
const financovaniData = order?.zpusob_financovani ? {
  typ: order.zpusob_financovani,
  lp_kody: order.lp_kod,
  lp_kod: order.lp_kod,
  lp_nazvy: order.financovani?.lp_nazvy, // ✅ Obohacená data z backendu
  cislo_smlouvy: order.cislo_smlouvy,
  // ... další pole
} : null;
```

### 2. Helper funkce pro lookup LP názvu (řádek 578)

```javascript
// 🎯 Helper: Najít název LP kódu podle ID z enriched dat
const getLPNazevById = (lpId) => {
  if (!lpId || !financovaniData?.lp_nazvy) return lpId; // Fallback: zobrazit ID
  const lp = financovaniData.lp_nazvy.find(item => item.id === lpId);
  return lp ? `${lp.cislo_lp || lpId} - ${lp.nazev || '---'}` : lpId;
};
```

### 3. Oprava zobrazení LP kódů v sekci financování (řádek 790-803)

**PŘED:**
```javascript
<Text style={styles.controlValue}>
  {Array.isArray(financovaniData.lp_kody) 
    ? financovaniData.lp_kody.join(', ')  // ❌ [3, 5, 8]
    : financovaniData.lp_kody}
</Text>
```

**PO:**
```javascript
<Text style={styles.controlValue}>
  {financovaniData.lp_nazvy && Array.isArray(financovaniData.lp_nazvy) && financovaniData.lp_nazvy.length > 0
    ? financovaniData.lp_nazvy.map(lp => `${lp.cislo_lp || lp.id} - ${lp.nazev || '---'}`).join(', ')
    : (Array.isArray(financovaniData.lp_kody) 
        ? financovaniData.lp_kody.join(', ')  // Fallback pro staré objednávky
        : financovaniData.lp_kody || '---')}
</Text>
```

### 4. Oprava zobrazení LP kódu u položek (řádek 907-913)

**PŘED:**
```javascript
<Text style={styles.controlLabel}>LP ID:</Text>
<Text style={styles.controlValue}>
  {polozka.lp_id}  {/* ❌ Zobrazuje "3" */}
</Text>
```

**PO:**
```javascript
<Text style={styles.controlLabel}>LP kód:</Text>
<Text style={styles.controlValue}>
  {getLPNazevById(polozka.lp_id)}  {/* ✅ "LP-001 - Spotřeba materiálu" */}
</Text>
```

---

## 🧪 Testování

### Test Case 1: Objednávka s více LP kódy
**Očekávaný výstup:**
```
LP kódy: LP-001 - Spotřeba materiálu, LP-005 - Zákonné sociální náklady
```

### Test Case 2: Položka objednávky s LP kódem
**Očekávaný výstup:**
```
LP kód: LP-001 - Spotřeba materiálu
```

### Test Case 3: Fallback pro staré objednávky (bez enriched dat)
**Očekávaný výstup:**
```
LP kódy: 3, 5, 8
```

---

## 📊 Dopad Změn

### Soubory upraveny:
- `/apps/eeo-v2/client/src/components/FinancialControlPDF.js`

### Řádky upraveny:
- **565-577**: Přidání `lp_nazvy` do `financovaniData`
- **578-582**: Nová helper funkce `getLPNazevById()`
- **790-803**: Oprava zobrazení LP kódů v sekci financování
- **907-913**: Oprava zobrazení LP kódu u položek objednávky

### Backward compatibility:
✅ **Ano** - Pokud `order.financovani.lp_nazvy` neexistuje, použije se fallback na raw IDs

---

## 🔄 Related Issues

- **Problém #2:** ~~PDF LP kódy - zobrazení ID místo názvu~~ ✅ **VYŘEŠENO**
- **Problém #1:** Notifikace stále chodí 2x ⚠️ (zbývá opravit)

---

## 📝 Poznámky

1. Backend již od verze v2025.03_25 správně obohacuje `order['financovani']['lp_nazvy']`
2. Frontend PDF komponenta **NEBYLA aktualizována** při změnách backendu
3. Pokladní kniha (CashBookPage.js) **zobrazuje LP kódy správně** - tam nebyl problém
4. Problém byl **POUZE** v PDF finančních kontrolních košilek (FinancialControlPDF.js)

---

## ✅ Hotovo

- [x] Přidána `lp_nazvy` do `financovaniData`
- [x] Vytvořena helper funkce `getLPNazevById()`
- [x] Opraveno zobrazení LP kódů v sekci financování (řádek 790-803)
- [x] Opraveno zobrazení LP kódu u položek (řádek 907-913)
- [x] Zachována backward compatibility (fallback na IDs)
- [x] Změněn label z "LP ID:" na "LP kód:" pro konzistenci

