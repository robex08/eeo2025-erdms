# LP Čerpání na Fakturách - Implementace & Testování

**Datum:** 22. ledna 2026  
**Status:** ✅ Implementováno  
**Autor:** GitHub Copilot + robex08

---

## 📋 Přehled

Implementace funkcionality pro rozdělení částky faktury mezi více LP kódů (Limitované Příslíby). Uživatelé mohou dynamicky přidávat/odebírat LP řádky a alokovat částky na jednotlivé LP kódy.

---

## 🎯 Hlavní Změny

### 1. **OrderForm25 - Modul Objednávek**

#### A) Odstranění Auto-Save
- **Původní chování:** LP čerpání se ukládalo okamžitě při každé změně (debounce 800ms)
- **Nové chování:** LP čerpání se ukládá AŽ při zavření objednávky

**Soubory:**
- `/var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js`
  - Řádek ~24240: Odstraněn auto-save z `onChange` handleru
  - Přidán komentář: "LP čerpání se neukládá auto-save, ale až při zavření objednávky"

#### B) Bulk Save při Zavření
- **Nová funkce:** `saveAllFakturyLPCerpani()`
  - Projde všechny faktury v objednávce
  - Validuje LP data (lp_cislo + castka > 0)
  - Ukládá validní řádky přes API
  - Loguje výsledky (success/failed/skipped)

- **Volání funkce:**
  - `handleCancelOrder()` - při zavření dokončené objednávky (řádek ~16675)
  - `handleCancelConfirm()` - při zavření konceptu s potvrzením (řádek ~16828)

**Validace před uložením:**
```javascript
const validRows = lpCerpaniData.filter(row => {
  const hasLpCislo = row.lp_cislo && String(row.lp_cislo).trim() !== '';
  const hasCastka = row.castka && parseFloat(row.castka) > 0;
  return hasLpCislo && hasCastka;
}).map(row => ({
  lp_cislo: String(row.lp_cislo).trim(),
  lp_id: row.lp_id ? parseInt(row.lp_id, 10) : null,
  castka: parseFloat(row.castka),
  poznamka: row.poznamka || ''
}));
```

#### C) Zrušení Debounce Timers
- Odstraněn `lpSaveTimersRef` (už nepoužívaný)

---

### 2. **InvoiceEvidencePage - Modul Fakturace**

✅ **Už bylo implementováno!**
- LP čerpání se ukládá při potvrzení věcné správnosti
- Validace dat před uložením
- Error handling s detailními zprávami

**Soubor:**
- `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`
  - Řádky 4041-4049: Uložení LP při věcné správnosti

---

### 3. **LPCerpaniEditor - Komponenta**

#### A) Fix Flickeringu (Blikání)
- **Problém:** Při přidání nového LP řádku docházelo k zbytečnému překreslení
- **Řešení:** Vylepšena deep comparison v `useEffect`

**Změny:**
```javascript
// PŘED: Porovnávání nerozlišovalo prázdné řádky
prevRow.castka !== newRow.castka

// PO: Ignorování prázdných řádků při porovnání
const isPrevEmpty = !prevRow.lp_id && (!prevRow.castka || prevRow.castka === 0);
const isNewEmpty = !newRow.lp_id && (!newRow.castka || newRow.castka === 0);

if (isPrevEmpty && isNewEmpty) {
  return false; // Oba jsou prázdné → žádná změna
}
```

**Výsledek:**
- Prázdné řádky (bez lp_id a castka = 0) se považují za stejné
- Zmenšen počet zbytečných rerenderů
- Plynulejší UX při přidávání/odebírání řádků

---

## 🔍 Backend Validace

### Endpoint: `/api.eeo/faktury/lp-cerpani/save`

**Handler:** `fakturyLpCerpaniHandlers.php`

**Validační pravidla:**
1. ✅ Token + username povinné (autentizace)
2. ✅ `faktura_id` povinné (>0)
3. ✅ `lp_cerpani` musí být array
4. ✅ Pro LP financování MUSÍ být min. 1 LP kód
5. ✅ Každý řádek musí mít:
   - `lp_cislo` (neprázdný string)
   - `castka` (>0)
6. ✅ Součet částek nesmí překročit `fa_castka`
7. ✅ LP kódy MUSÍ být ze seznamu LP kódů objednávky

**Chybové stavy (400 Bad Request):**
- "Chybí faktura_id"
- "Chybí lp_cerpani array"
- "Pro LP financování je povinné přiřadit alespoň jeden LP kód"
- "Všechny částky musí být > 0"
- "Chybí lp_cislo"
- "Součet LP čerpání překračuje částku faktury"
- "LP kód není přiřazen k objednávce"

---

## 📊 Datový Tok

### OrderForm25 (Modul Objednávek)

```
┌─────────────────────────────────────────────────────────────┐
│ Uživatel přidá/upraví LP řádek v LPCerpaniEditor          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ onChange(newLpCerpani)                                      │
│ → Aktualizuje LOCAL state (fakturyLPCerpani)               │
│ → NEPOSÍLÁ na backend (auto-save vypnut)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Uživatel klikne "Zavřít" objednávku                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ handleCancelOrder() / handleCancelConfirm()                 │
│ → Zavolá saveAllFakturyLPCerpani()                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Pro každou fakturu:                                         │
│ 1. Filtruje validní řádky (lp_cislo + castka > 0)         │
│ 2. Normalizuje data (string/int/float)                     │
│ 3. Volá saveFakturaLPCerpani(fakturaId, validRows)        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: POST /api.eeo/faktury/lp-cerpani/save            │
│ → Validace (pravidla viz výše)                             │
│ → DELETE staré záznamy                                      │
│ → INSERT nové záznamy                                       │
│ → COMMIT transaction                                        │
└─────────────────────────────────────────────────────────────┘
```

### InvoiceEvidencePage (Modul Fakturace)

```
┌─────────────────────────────────────────────────────────────┐
│ Uživatel upraví LP řádky                                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ onChange() → Aktualizuje LOCAL state                        │
│ (NEPOSÍLÁ na backend)                                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Uživatel klikne "Potvrdit věcnou správnost"                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Uložení LP čerpání PŘED potvrzením věcné správnosti        │
│ (řádky 4041-4049 v InvoiceEvidencePage.js)                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: POST /api.eeo/faktury/lp-cerpani/save            │
│ → Validace + Uložení                                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Potvrzení věcné správnosti (vecna_spravnost_potvrzeno=1)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testovací Scénáře

### ✅ Test 1: OrderForm25 - Přidání LP Řádků
**Kroky:**
1. Otevřít objednávku s LP financováním
2. Přidat fakturu
3. Kliknout "+ Přidat další LP kód"
4. Vybrat LP kód z dropdownu
5. Zadat částku
6. Přidat další LP řádek
7. Vyplnit druhý řádek

**Očekávaný výsledek:**
- ✅ Řádky se přidávají plynule bez flickeringu
- ✅ Žádný API call při přidání řádku
- ✅ Žádný API call při výběru LP kódu
- ✅ Žádný API call při zadání částky
- ✅ Data zůstávají v LOCAL state
- ✅ Console log: "🔄 [LP] onChange spuštěn, data: ..."

**Status:** 🟡 K TESTU (flickering by měl být vyřešen)

---

### ✅ Test 2: OrderForm25 - Uložení při Zavření
**Kroky:**
1. Otevřít objednávku s LP financováním
2. Přidat fakturu s LP řádky
3. Kliknout "Zavřít"
4. Potvrdit zavření

**Očekávaný výsledek:**
- ✅ Console log: "💾 [LP] Ukládám všechna LP čerpání před zavřením..."
- ✅ Console log: "📤 [LP] Odesílám validní řádky: [...]"
- ✅ API call: POST /api.eeo/faktury/lp-cerpani/save
- ✅ Console log: "✅ [LP] Uloženo: X, Selhalo: 0, Přeskočeno: 0"
- ✅ Objednávka se zavře
- ✅ Redirect na seznam objednávek

**Status:** 🟡 K TESTU

---

### ✅ Test 3: OrderForm25 - Validace
**Kroky:**
1. Přidat LP řádek bez vyplnění LP kódu
2. Kliknout "Zavřít"

**Očekávaný výsledek:**
- ✅ Console log: "⚠️ [LP] Žádné validní řádky k uložení, přeskakuji API call"
- ✅ API call se NEVOLÁ
- ✅ Objednávka se zavře bez chyby

**Status:** 🟡 K TESTU

---

### ✅ Test 4: InvoiceEvidencePage - Věcná Správnost
**Kroky:**
1. Otevřít evidenci faktur
2. Vybrat fakturu s LP financováním
3. Přidat LP řádky
4. Kliknout "Potvrdit věcnou správnost"

**Očekávaný výsledek:**
- ✅ API call: POST /api.eeo/faktury/lp-cerpani/save (PŘED věcnou správností)
- ✅ Toast: "✅ Věcná správnost faktury XY byla úspěšně potvrzena"
- ✅ LP data uložena v DB
- ✅ Věcná správnost potvrzena

**Status:** ✅ FUNGUJE (už bylo implementováno)

---

### ✅ Test 5: Backend Validace - 400 Chyby
**Kroky:**
1. Přidat LP řádek s částkou = 0
2. Pokusit se uložit

**Očekávaný výsledek:**
- ❌ 400 Bad Request
- ❌ Backend vrátí: "Všechny částky musí být > 0"
- ✅ Frontend filtruje nevalidní řádky PŘED odesláním → API call se nevolá

**Status:** ✅ FUNGUJE (frontend validace)

---

### ✅ Test 6: Součet Částek > Faktura
**Kroky:**
1. Faktura má částku 10 000 Kč
2. Přidat LP řádek: 6 000 Kč
3. Přidat LP řádek: 5 000 Kč (součet = 11 000 Kč)
4. Kliknout "Zavřít" (OrderForm25) nebo "Potvrdit věcnou správnost" (InvoiceEvidencePage)

**Očekávaný výsledek:**
- ❌ 400 Bad Request
- ❌ Backend: "Součet LP čerpání (11 000,00 Kč) překračuje částku faktury (10 000,00 Kč)"
- ✅ Toast: "Nepodařilo se uložit LP čerpání: ..."
- ✅ Console log: "❌ [LP] Response data: {status: 'error', message: '...'}"

**Status:** 🟡 K TESTU

---

### ✅ Test 7: LP Kód není na Objednávce
**Kroky:**
1. Objednávka má LP kódy: LPIT1, LPIT3
2. Pokus přidat LP řádek s LPIT2 (není na objednávce)

**Očekávaný výsledek:**
- ❌ 400 Bad Request
- ❌ Backend: "LP kód "LPIT2" není přiřazen k objednávce. Povolené LP kódy: LPIT1, LPIT3"

**Poznámka:** Frontend by měl zobrazovat POUZE povolené LP kódy v dropdownu → tento stav by neměl nastat

**Status:** ✅ FUNGUJE (frontend filtruje LP kódy)

---

### ✅ Test 8: Temp Faktura (bez DB ID)
**Kroky:**
1. Přidat novou fakturu (temp-XYZ)
2. Přidat LP řádky
3. Kliknout "Zavřít"

**Očekávaný výsledek:**
- ✅ Console log: "⚠️ [LP] Nelze uložit LP čerpání pro temp fakturu"
- ✅ API call se NEVOLÁ
- ✅ Objednávka se zavře bez chyby

**Status:** 🟡 K TESTU

---

### ✅ Test 9: Flickering při Rychlém Přidávání
**Kroky:**
1. Rychle kliknout "+ Přidat další LP kód" 5x

**Očekávaný výsledek:**
- ✅ Plynulé přidávání řádků
- ✅ Žádné blikání/flickering
- ✅ Deep comparison ignoruje prázdné řádky

**Status:** 🟡 K TESTU (opraveno v této verzi)

---

### ✅ Test 10: Načtení Uložených LP Dat
**Kroky:**
1. Uložit LP čerpání (zavřít objednávku)
2. Znovu otevřít objednávku
3. Zkontrolovat LP řádky

**Očekávaný výsledek:**
- ✅ API call: GET /api.eeo/faktury/lp-cerpani/get?faktura_id=XY
- ✅ LP řádky se načtou z DB
- ✅ Zobrazí se správné LP kódy a částky

**Status:** ✅ FUNGUJE (loadFakturaLPCerpani)

---

## 🐛 Známé Problémy

### 0. ✅ LP Čerpání se Volá i pro Non-LP Objednávky
**Status:** 🟢 VYŘEŠENO (22. ledna 2026 - večer)

**Symptom:**
- LP čerpání se ukládalo i pro objednávky bez LP financování
- Zbytečné API cally při zavření objednávky
- Možné 400 Bad Request pokud backend vyžaduje LP kódy

**Příčina:**
- `saveAllFakturyLPCerpani()` nekontrololovalo typ financování
- LP editor se renderoval bez ohledu na typ financování (v některých místech)

**Fix:**

1. **Guard v `saveAllFakturyLPCerpani()` (OrderForm25):**
   ```javascript
   const isLPFinancing = formData?.financovani?.typ === 'LP' || 
                        (formData?.zpusob_financovani && String(formData.zpusob_financovani).toLowerCase().includes('lp'));
   
   if (!isLPFinancing) {
     console.log('⏭️ [LP] Objednávka není LP financování, přeskakuji uložení LP čerpání');
     return { success: 0, failed: 0, skipped: 0 };
   }
   ```

2. **Guard při ukládání věcné správnosti (InvoiceEvidencePage):**
   ```javascript
   const isLPFinancing = orderData?.financovani?.typ === 'LP' || 
                        (orderData?.zpusob_financovani && String(orderData.zpusob_financovani).toLowerCase().includes('lp'));
   
   if (isLPFinancing && lpCerpani && lpCerpani.length > 0) {
     // Uložit LP čerpání
   }
   ```

3. **Podmíněné renderování LP editoru (konzistentní v obou modulech):**
   - OrderForm25: Kontrola `fin?.typ === 'LP'` nebo `fin.typ_financovani.includes('LP')`
   - InvoiceEvidencePage: Kontrola `fin?.typ === 'LP'`

**Výsledek:**
- ✅ LP editor se zobrazuje POUZE pro LP financování
- ✅ API cally se volají POUZE pro LP financování
- ✅ Žádné chyby při zavření non-LP objednávek
- ✅ Konzistentní chování v obou modulech

**Testování:** ✅ READY TO TEST

---

### 1. ❌ 400 Bad Request při Validních Datech
**Status:** 🟡 ČÁSTEČNĚ VYŘEŠENO (lepší logging)

**Symptom:**
- API vrací 400 i když data vypadají validně
- Potřeba zkontrolovat přesnou chybovou zprávu v `error.response.data`

**Fix:**
- Přidán detailní logging:
  ```javascript
  console.error('❌ [LP] Response data:', error.response?.data);
  console.error('❌ [LP] Odeslané data byly:', JSON.stringify(validRows, null, 2));
  ```

**Akce:** Zkontrolovat console logy při příštím výskytu

---

### 2. ✅ Flickering při Přidání LP Řádku
**Status:** 🟢 VYŘEŠENO (22. ledna 2026 - večer)

**Symptom:**
- Při kliknutí "+ Přidat další LP kód" došlo k vizuálnímu bliknutí
- useEffect se spouštěl zbytečně často při každé změně

**Příčina:**
- Deep comparison v `useEffect` nerozlišovala prázdné řádky
- Dependency array obsahovala nestabilní reference (`onChange`, `rows.length`)
- Považovala prázdný řádek za změnu → spustila rerender

**Fix (v 3 krocích):**

1. **Stabilizace lpCerpani pomocí useMemo:**
   ```javascript
   const lpCerpaniKey = useMemo(() => {
     if (!lpCerpani || lpCerpani.length === 0) return 'empty';
     return lpCerpani.map(lp => `${lp.lp_id}_${lp.castka}`).join('|');
   }, [lpCerpani]);
   ```

2. **Optimalizace dependency array:**
   ```javascript
   // PŘED: [lpCerpani, faktura?.id, ..., onChange, rows.length]
   // PO:   [lpCerpaniKey, faktura?.id, faktura?.fa_castka, isLPFinancing]
   // + eslint-disable-next-line react-hooks/exhaustive-deps
   ```

3. **Vylepšená deep comparison - ignoruje prázdné řádky:**
   ```javascript
   const isPrevEmpty = !prevRow.lp_id && (!prevRow.castka || prevRow.castka === 0);
   const isNewEmpty = !newRow.lp_id && (!newRow.castka || newRow.castka === 0);
   if (isPrevEmpty && isNewEmpty) return false;
   
   // Porovnat konkrétní hodnoty (ID NEPOČÍTAT - může se generovat nové)
   return prevRow.lp_id !== newRow.lp_id ||
          prevRow.castka !== newRow.castka ||
          prevRow.lp_cislo !== newRow.lp_cislo;
   ```

4. **Ošetření non-LP financování:**
   ```javascript
   // Pokud lpCerpani je prázdné a není LP financování, vyčistit rows
   else if (!isLPFinancing && rows.length > 0) {
     setRows([]);
   }
   ```

**Výsledek:**
- ✅ Žádné zbytečné rerendery
- ✅ Plynulé přidávání řádků
- ✅ Stabilní reference v dependency array
- ✅ Bezpečné pro non-LP objednávky

**Testování:** ✅ READY TO TEST

---

## 📝 Poznámky k Testování

### Console Logy k Sledování

```javascript
// Přidání řádku
"🔄 [LP] onChange spuštěn, data: [{...}]"

// Validace před uložením
"📤 [LP] Odesílám validní řádky: [{...}]"

// Prázdné řádky
"⚠️ [LP] Žádné validní řádky k uložení, přeskakuji API call"

// Temp faktura
"⚠️ [LP] Nelze uložit LP čerpání pro temp fakturu"

// Bulk save výsledky
"✅ [LP] Uloženo: X, Selhalo: 0, Přeskočeno: Y"

// Chyby
"❌ [LP] Chyba při ukládání LP čerpání: ..."
"❌ [LP] Response data: {...}"
"❌ [LP] Odeslané data byly: [{...}]"
```

### Monitoring v Network Tab (DevTools)

**Endpoint:** `POST http://localhost:3000/api.eeo/faktury/lp-cerpani/save`

**Request Body:**
```json
{
  "token": "...",
  "username": "...",
  "faktura_id": 182,
  "lp_cerpani": [
    {
      "lp_cislo": "LPIT1",
      "lp_id": 6,
      "castka": 2500.00,
      "poznamka": ""
    },
    {
      "lp_cislo": "LPIT3",
      "lp_id": 7,
      "castka": 6388.00,
      "poznamka": ""
    }
  ]
}
```

**Response (Success - 200):**
```json
{
  "status": "ok",
  "message": "LP čerpání uloženo",
  "data": {
    "faktura_id": 182,
    "pocet_radku": 2,
    "suma": 8888.00
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "message": "Součet LP čerpání (11 000,00 Kč) překračuje částku faktury (10 000,00 Kč)"
}
```

---

## 🔗 Související Soubory

### Frontend
- `/var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js`
  - Funkce: `saveFakturaLPCerpaniData()`, `saveAllFakturyLPCerpani()`, `handleCancelOrder()`, `handleCancelConfirm()`
- `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`
  - Řádky: 4041-4049 (LP save při věcné správnosti)
- `/var/www/erdms-dev/apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js`
  - useEffect s deep comparison (řádky 590-610)
- `/var/www/erdms-dev/apps/eeo-v2/client/src/services/apiFakturyLPCerpani.js`
  - API client

### Backend
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php`
  - Funkce: `handle_save_faktura_lp_cerpani()`, `handle_get_faktura_lp_cerpani()`
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/faktury-api.php`
  - Routing endpointů

### Databáze
- Tabulka: `25a_faktury_lp_cerpani`
  - Sloupce: `id`, `faktura_id`, `lp_cislo`, `lp_id`, `castka`, `poznamka`, `datum_pridani`, `pridal_user_id`

---

## ✨ Další Vylepšení (TODO)

1. **Optimalizace:** Přidat bulk endpoint pro uložení všech LP čerpání najednou (místo jednotlivých callů)
2. **UX:** Toast notifikace při úspěšném uložení LP čerpání
3. **Validace:** Real-time validace součtu částek (zobrazit error pokud > fa_castka)
4. **Historie:** Audit log změn LP čerpání (kdo, kdy, co změnil)
5. **Export:** Export LP čerpání do CSV/Excel

---

## 📝 Changelog

### 22. ledna 2026 - Večer (21:00)

**Oprava LocalStorage - OrderForm25:**

1. ✅ **LP čerpání se nyní ukládá do LocalStorage:**
   - useEffect sleduje změny v `fakturyLPCerpani`
   - Ukládá jako `order25_lpCerpani_{user_id}`
   - Automatické ukládání při každé změně

2. ✅ **Načítání po reloadu stránky:**
   - LP data se obnovují z LocalStorage při mount
   - Žádná ztráta dat při F5

3. ✅ **Vyčištění LS při dokončení:**
   - Po uložení objednávky
   - Při zavření objednávky
   - Při smazání draftu

**Soubory:**
- `/apps/eeo-v2/client/src/forms/OrderForm25.js` - LocalStorage persistence

---

### 22. ledna 2026 - Večer (20:30)

**Opravy flickeringu a bezpečnosti:**

1. ✅ **Flickering fix v LPCerpaniEditor:**
   - Přidán `useMemo` pro stabilizaci lpCerpani reference (`lpCerpaniKey`)
   - Optimalizace dependency array v `useEffect` (odstranění `onChange`, `rows.length`)
   - Vylepšená deep comparison (ignoruje ID, které se mění)
   - Ošetření non-LP financování

2. ✅ **Podmíněné ukládání LP čerpání:**
   - Guard v `saveAllFakturyLPCerpani()` - kontrola LP financování
   - Guard v `InvoiceEvidencePage` - kontrola před uložením věcné správnosti
   - Zabráněno zbytečným API callům pro non-LP objednávky

3. ✅ **Konzistence mezi moduly:**
   - OrderForm25 a InvoiceEvidencePage používají stejnou logiku pro kontrolu LP financování
   - Sjednocené error handling

**Soubory:**
- `/apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js` - flickering fix
- `/apps/eeo-v2/client/src/forms/OrderForm25.js` - guards pro LP financování
- `/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js` - konzistentní kontroly

---

### 22. ledna 2026 - Odpoledne

**Původní implementace:**

## 📞 Kontakt

Pro otázky nebo problémy:
- **Tým:** EEO 2025
- **Dokumentace:** `/var/www/erdms-dev/docs/`
- **Git Branch:** `feature/generic-recipient-system`

---

**Poslední aktualizace:** 22. ledna 2026, 21:00 (flickering fix + LP financování guards + LocalStorage fix)
