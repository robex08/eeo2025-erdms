# 🔧 Oprava PDF dokumentu finanční kontroly

**Datum:** 22. ledna 2026  
**Soubor:** `/apps/eeo-v2/client/src/components/FinancialControlPDF.js`

---

## 🐛 Problémy které byly opraveny

### 1. **Střediska zobrazována jako kódy místo názvů**
- **Problém:** V sekci "Kontrola po vzniku závazku" u faktur se zobrazovaly kódy středisek (např. `102_RLP_RAKOVNIK`) místo jejich názvů z databázového číselníku
- **Řešení:** 
  - Opraveno na řádku 609-616 - funkce `faStrediska` nyní používá `strediskaMap` pro převod kódů na názvy
  - Stejná oprava již byla dříve aplikována na střediska objednávky (řádek 652-672) a u faktur v sekci věcné kontroly (řádek 978-983)

**Před:**
```javascript
return fa.fa_strediska_kod.join(', ');
// Výstup: "102_RLP_RAKOVNIK, 106_VS_NOVE_STRASECI"
```

**Po:**
```javascript
return fa.fa_strediska_kod.map(kod => strediskaMap[kod] || kod).join(', ');
// Výstup: "RLP Rakovník, VS Nové Strašecí"
```

---

### 2. **Chybné zobrazení financování u faktur**
- **Problém:** 
  - V části "Kontrola po vzniku závazku" u každé faktury se zobrazovalo "Financování: faktura" 
  - Data byla čtena z `rozsirujici_data.typ` což byl špatný zdroj
  - Chybně se zobrazovalo generické "faktura" místo konkrétních LP kódů s částkami
  
- **Řešení:** 
  - Odstraněno čtení z `rozsirujici_data.typ` (řádky 1009-1024)
  - Implementováno správné zobrazení LP kódů a částek z věcné kontroly
  - Data se nyní čtou z položek objednávky (`order.polozky`) kde je `lp_id` a `cena_s_dph`
  - Částky se agregují podle LP kódu a zobrazují ve formátu: `LPXXX - Název LP: 12 345,00 Kč`

**Před:**
```javascript
// Čtení z rozsirujici_data
fakturaFinancovani = data.typ || data.zpusob_financovani || ...
// Výstup: "Financování: faktura" nebo "Financování: ---"
```

**Po:**
```javascript
// Agregace LP kódů z položek objednávky
const lpMap = {}; 
order.polozky.forEach(polozka => {
  if (polozka.lp_id && polozka.cena_s_dph) {
    // Najít LP kód a název z financovaniData.lp_nazvy
    // Sečíst částky pro každý LP kód
    lpMap[lpId].castka += castka;
  }
});
// Výstup: "102_RLP_RAKOVNIK - RLP Rakovník: 8 888,00 Kč
//          106_VS_NOVE_STRASECI - VS Nové Strašecí: 4 444,00 Kč"
```

---

## ✅ Co nyní PDF správně zobrazuje

### Sekce "Kontrola před vznikem závazku":
- ✅ **Střediska:** Názvy z číselníku (ne kódy)
- ✅ **Financování:** LP kódy s názvy z schvalovacího bloku

### Sekce "Kontrola po vzniku závazku" (faktury):
- ✅ **Střediska:** Názvy z číselníku (ne kódy) 
- ✅ **Financování:** LP kódy s částkami rozdělené z věcné kontroly
  - Formát: `LPXXX - Název: 12 345,00 Kč`
  - Více LP kódů na samostatných řádcích
  - Částky jsou sečteny podle LP kódu z položek objednávky

---

## 📊 Testovací scénáře

### Test 1: Jedna faktura, jeden LP kód
```
Objednávka: O-0170/75030926/2026/IT
Položky: 
  - Testovací objednávka: 8 888,00 Kč (LP ID: 1)

Očekávaný výstup v PDF:
  Financování: 102_RLP_RAKOVNIK - RLP Rakovník: 8 888,00 Kč
  Střediska: RLP Rakovník, VS Nové Strašecí
```

### Test 2: Jedna faktura, více LP kódů
```
Objednávka: O-XXXX
Položky: 
  - Položka 1: 5 000,00 Kč (LP ID: 1 - LPIT1)
  - Položka 2: 3 000,00 Kč (LP ID: 2 - LPIT2)
  - Položka 3: 2 000,00 Kč (LP ID: 1 - LPIT1)

Očekávaný výstup v PDF:
  Financování: 
    LPIT1 - IT Infrastruktura: 7 000,00 Kč
    LPIT2 - IT Software: 3 000,00 Kč
```

---

## 🔍 Technické detaily

### Použité proměnné:
- `strediskaMap` - Mapa převodu kódu střediska na název (načteno z API)
- `financovaniData.lp_nazvy` - Array LP s ID, kódem (`cislo_lp`) a názvem
- `order.polozky` - Položky objednávky s `lp_id` a `cena_s_dph`

### Agregace LP částek:
```javascript
const lpMap = {}; // {lp_id: {kod, nazev, castka}}

order.polozky.forEach(polozka => {
  if (polozka.lp_id && polozka.cena_s_dph) {
    if (!lpMap[lpId]) {
      lpMap[lpId] = {
        kod: lpKod,
        nazev: lpNazev,
        castka: 0
      };
    }
    lpMap[lpId].castka += parseFloat(polozka.cena_s_dph);
  }
});
```

---

## 📝 Poznámky

- Opravy byly provedeny v `/apps/eeo-v2/client/src/components/FinancialControlPDF.js`
- Všechny změny jsou zpětně kompatibilní
- Pokud LP data nejsou dostupná, zobrazí se `LP ID: X` jako fallback
- Formátování částek používá `formatCurrency()` funkci pro konzistentní zobrazení
- Multi-line zobrazení LP kódů používá `\n` separator

---

**Autor:** GitHub Copilot  
**Review:** robex08  
**Status:** ✅ HOTOVO
