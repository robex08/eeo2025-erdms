# 🔧 FIX: LP čerpání u věcné kontroly faktur - Testovací plán

**Datum**: 26. března 2026  
**Problém**: Po uložení LP rozložení u věcné kontroly faktury se data po znovuotevření nezobrazovala (prázdný formulář).

---

## 🐛 Identifikovaná chyba

### Příčina
- **Cache problém** v `loadedFakturyRef` (React useRef)
- Ref se nikdy neresetoval po uložení dat
- Při znovuotevření faktury se podmínka `!loadedFakturyRef.current.has(fakturaId)` vyhodnotila jako `false`
- **Výsledek**: Data se nenačetla z databáze → prázdný formulář pro LP rozložení

### Technické detaily
```javascript
// ❌ PŘED OPRAVOU:
const loadFakturaLPCerpani = useCallback(async (fakturaId) => {
  if (!fakturaId || loadedFakturyRef.current.has(fakturaId) || !token || !username) return;
  // ... načtení dat
}, [token, username]);

// ✅ PO OPRAVĚ:
const loadFakturaLPCerpani = useCallback(async (fakturaId, forceReload = false) => {
  if (!forceReload && loadedFakturyRef.current.has(fakturaId)) {
    return;
  }
  // ... načtení dat s možností force reload
}, [token, username]);
```

---

## ✅ Provedené změny

### 1. **Funkce `loadFakturaLPCerpani` (řádek ~4481)**
- ✅ Přidán parametr `forceReload` pro vynucené načtení z DB
- ✅ Přidán debug log pro sledování načítání

### 2. **Podmínka načítání LP dat (řádek ~25158)**
- ✅ Odstraněna duplicitní kontrola `loadedFakturyRef`
- ✅ Spoléhá se pouze na `lpData.loaded` ze state

### 3. **Reset cache při změně objednávky (řádek ~7313)**
- ✅ Reset `fakturyLPCerpani` state
- ✅ Vyčištění `loadedFakturyRef` při změně `editOrderId`

### 4. **Reset cache při inicializaci (řádek ~13292)**
- ✅ Vyčištění cache při spuštění `initializeForm()`

### 5. **Reload po uložení (řádek ~8660)**
- ✅ Po úspěšném uložení: smazání z cache + force reload z DB
- ✅ Zajišťuje konzistenci mezi UI a databází

### 6. **Autosave včetně LP dat (řádek ~7890, ~12864)**
- ✅ LP čerpání se ukládá do localStorage draftu
- ✅ Zachování dat při F5/refresh

---

## 🧪 Testovací scénáře

### ✅ TEST 1: Základní funkčnost - Jeden LP kód
**Kroky:**
1. Vytvořit novou objednávku s LP financováním (1 LP kód)
2. Přidat fakturu s částkou (např. 10 000 Kč)
3. Otevřít věcnou kontrolu faktury
4. **Ověřit**: LP rozložení je auto-fillnuto (10 000 Kč na jediný LP kód)
5. Uložit objednávku
6. Zavřít a znovu otevřít objednávku
7. **Ověřit**: LP rozložení se zobrazuje správně

**Očekávaný výsledek:**
- ✅ Auto-fill funguje pro jeden LP kód
- ✅ Data se zachovají po reload

---

### ✅ TEST 2: Více LP kódů - Ruční rozdělení
**Kroky:**
1. Vytvořit objednávku s LP financováním (více LP kódů, např. LPIT1, LPIT2)
2. Přidat fakturu s částkou 15 000 Kč
3. Otevřít věcnou kontrolu faktury
4. Rozdělit částku mezi LP kódy:
   - LPIT1: 10 000 Kč
   - LPIT2: 5 000 Kč
5. Uložit objednávku
6. **F5 refresh** stránky
7. **Ověřit**: LP rozložení se zobrazuje (10k/5k)

**Očekávaný výsledek:**
- ✅ Ruční rozdělení je uloženo do DB
- ✅ Data přežijí refresh (načtou se z draftu)
- ✅ Po zavření a znovuotevření se načtou z DB

---

### ✅ TEST 3: Editace existujícího rozložení
**Kroky:**
1. Otevřít objednávku s již uloženým LP rozložením
2. **Ověřit**: Zobrazuje se současné rozložení z DB
3. Změnit částky:
   - LPIT1: 12 000 Kč (původně 10 000)
   - LPIT2: 3 000 Kč (původně 5 000)
4. Uložit změny
5. Zavřít a znovu otevřít
6. **Ověřit**: Nové hodnoty jsou zobrazeny (12k/3k)

**Očekávaný výsledek:**
- ✅ Původní data se načtou správně
- ✅ Změny se uloží do DB
- ✅ Aktualizovaná data se zobrazí po reload

---

### ✅ TEST 4: Přepínání mezi objednávkami
**Kroky:**
1. Otevřít objednávku A s LP rozložením (např. 10k/5k)
2. **Ověřit**: Data objednávky A se zobrazují
3. Otevřít jinou objednávku B (přes notifikace nebo search)
4. **Ověřit**: LP rozložení objednávky B se načte (ne A!)
5. Vrátit se k objednávce A
6. **Ověřit**: LP rozložení objednávky A je stále správné

**Očekávaný výsledek:**
- ✅ Cache se resetuje při změně `editOrderId`
- ✅ Data se nemíchají mezi objednávkami
- ✅ Každá objednávka má své vlastní LP rozložení

---

### ✅ TEST 5: Validace - Překročení částky faktury
**Kroky:**
1. Vytvořit fakturu s částkou 10 000 Kč
2. Zkusit rozdělit:
   - LPIT1: 8 000 Kč
   - LPIT2: 5 000 Kč (součet 13 000 Kč!)
3. Zkusit uložit objednávku
4. **Ověřit**: Zobrazí se chyba "Součet LP čerpání překračuje částku faktury"

**Očekávaný výsledek:**
- ✅ Backend validace odmítne uložení
- ✅ Uživatel vidí chybovou hlášku
- ✅ Data nejsou uložena do DB

---

### ✅ TEST 6: Zálohová faktura (0 Kč)
**Kroky:**
1. Vytvořit fakturu s částkou 0 Kč (záloha)
2. LP rozložení:
   - LPIT1: 0 Kč
   - LPIT2: 0 Kč
3. Uložit objednávku
4. **Ověřit**: Data se uloží a zobrazí správně

**Očekávaný výsledek:**
- ✅ 0 Kč je validní hodnota
- ✅ Zálohové faktury fungují správně

---

### ✅ TEST 7: Odpojení LP kódu z objednávky
**Kroky:**
1. Vytvořit objednávku s LP: LPIT1, LPIT2
2. Rozdělit fakturu mezi oba LP kódy
3. Uložit objednávku
4. ZMĚNIT financování objednávky - odstranit LPIT2
5. Zkusit znovu otevřít věcnou kontrolu
6. **Ověřit**: Backend validace odmítne LP kód, který není v objednávce

**Očekávaný výsledek:**
- ✅ Backend validuje LP kódy proti objednávce
- ✅ Nekompatibilní LP kódy jsou odmítnuty

---

## 🔍 Debug kroky při problémech

### Krok 1: Console logy
Otevřít DevTools Console (F12) a sledovat:

```javascript
// ✅ Hledejte tyto logy:
[LP] Cache resetována při inicializaci formuláře
[LP] Načteno LP čerpání pro fakturu XXX : [...]
[LP] Úspěšně uloženo a znovu načteno LP čerpání pro fakturu XXX
```

### Krok 2: Kontrola localStorage
```javascript
// V Console:
const draft = JSON.parse(localStorage.getItem('orderForm25Draft_userID'));
console.log(draft.fakturyLPCerpani);
// Mělo by zobrazit: { fakturaId: { lpCerpani: [...], loaded: true } }
```

### Krok 3: Kontrola databáze
```sql
-- Zkontrolovat uložená data v DB:
SELECT * FROM 25a_faktury_lp_cerpani WHERE faktura_id = XXX;

-- Mělo by vrátit řádky s lp_cislo, castka, atd.
```

### Krok 4: Network tab
Otevřít DevTools → Network tab:
- Hledat requesty na `/faktury/lp-cerpani/get`
- Ověřit response: `{ status: "ok", data: { lp_cerpani: [...] } }`

### Krok 5: React DevTools
1. Nainstalovat React DevTools extension
2. Najít komponentu `OrderForm25`
3. Zkontrolovat state: `fakturyLPCerpani`
4. Mělo by obsahovat: `{ [fakturaId]: { lpCerpani: [...], loaded: true } }`

---

## 🚨 Známé limitace

1. **Temp faktury** - LP rozložení se neukládá pro faktury s `id` začínajícím na `temp-`
2. **Backend validace** - LP kódy MUSÍ být v seznamu LP kódů objednávky
3. **Součet částek** - Nesmí překročit `fa_castka` faktury
4. **LP povinnost** - Pro LP financování MUSÍ být přiřazen min. 1 LP kód

---

## 📊 Checklist pro produkční nasazení

### Před nasazením:
- [ ] Otestovat všech 7 scénářů výše
- [ ] Zkontrolovat console logy (žádné errory)
- [ ] Ověřit, že data přežijí F5 refresh
- [ ] Zkontrolovat DB tabulku `25a_faktury_lp_cerpani`
- [ ] Otestovat s více uživateli současně
- [ ] Ověřit správnou cache invalidaci mezi objednávkami

### Po nasazení:
- [ ] Monitorovat console errory v produkci
- [ ] Zkontrolovat DB logy (MySQL slow query)
- [ ] Sledovat user feedback
- [ ] Připravit rollback plán

---

## 🔗 Relevantní soubory

| Soubor | Popis |
|--------|-------|
| `apps/eeo-v2/client/src/forms/OrderForm25.js` | Hlavní formulář objednávky |
| `apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js` | Komponenta pro LP rozložení |
| `apps/eeo-v2/client/src/services/apiFakturyLPCerpani.js` | API služba pro LP čerpání |
| `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php` | Backend handlery |

---

## 📝 Poznámky

- **Cache strategie**: `loadedFakturyRef` + `lpData.loaded` work together
  - `loadedFakturyRef` - prevence multiple requests (JS runtime)
  - `lpData.loaded` - React state pro render logiku
  
- **Force reload**: Po uložení vždy `forceReload=true` pro verifikaci DB stavu

- **Debug mode**: Přidat do console `localStorage.setItem('debug_lp_cerpani', 'true')` pro extra logy

---

## 🎯 Kam dál

### Vylepšení pro budoucnost:
1. **Optimalizace**: Batch loading více faktur najednou
2. **UI feedback**: Loading spinner během načítání LP rozložení
3. **Validace v reálném čase**: Kontrola součtu při psaní
4. **History tracking**: Log změn LP rozložení (kdo, kdy, co změnil)
5. **Export/Report**: Přehled LP čerpání per objednávka/období

### Performance monitoring:
```javascript
// Přidat do kódu:
console.time('LP_load_' + fakturaId);
await getFakturaLPCerpani(fakturaId, token, username);
console.timeEnd('LP_load_' + fakturaId);
```

---

**Kontakt pro reporting bugů**: robex08@github  
**Posledn aktualizace**: 2026-03-26
