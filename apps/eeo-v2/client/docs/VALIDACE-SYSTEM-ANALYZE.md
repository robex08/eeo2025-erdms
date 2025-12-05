# ANAL<br>ÝZA VALIDAČNÍHO SYSTÉMU - OrderForm25

## 🔴 HLAVNÍ PROBLÉM
Červené rámečky kolem nevalidních polí **MIZÍ** po druhém pokusu o uložení, i když pole stále není validní.

## 📊 SOUČASNÝ STAV - KOMPONENTY SYSTÉMU

### 1. State Management
```javascript
// Řádek 4861-4862
const [validationErrors, setValidationErrors] = useState({});
const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);
```

**Zodpovědnost:**
- `validationErrors` - obsahuje chybové zprávy pro jednotlivá pole
- `hasTriedToSubmit` - flag pro zobrazení červených rámečků (musí být TRUE pro zobrazení)

### 2. Validační Funkce

#### A) `validateFormForSave()` - Řádek 14900
**Účel:** Hlavní validace před uložením do DB
**Kdy se volá:** Při kliknutí na "Uložit"
**Co dělá:**
1. Nastaví `hasTriedToSubmit = true` (pomocí `flushSync`)
2. Volá `validateWorkflowData()` (z utils/workflowUtils.js)
3. Validuje dynamická pole podle financování
4. **🆕 Validuje ÚSEK, BUDOVA, MÍSTNOST pro majetkové objednávky**
5. Validuje faktury
6. Nastavuje `validationErrors`
7. Vrací `true/false`

**Lokace validace lokací:**
- Řádek 15046-15077 (první validační funkce)

#### B) `validateFormSilently()` - Řádek 15160
**Účel:** Tichá validace bez toast zpráv
**Kdy se volá:** Při změnách polí (onBlur, onChange)
**Co dělá:** Stejné jako `validateFormForSave()` ale BEZ toast notifikací

**Lokace validace lokací:**
- Řádek 15233-15250 (druhá validační funkce)

### 3. Resetování Validačního Stavu

#### 🔴 PROBLÉM #1: Reset po "úspěšném" uložení
```javascript
// Řádek 9671 (CREATE) a 10181 (UPDATE)
setHasTriedToSubmit(false); // Reset validace po úspěšném uložení
```

**Problém:** Tento kód se volá po úspěšném CREATE/UPDATE, ALE je v `saveOrderToAPI()` funkci, která se NEVOLÁ když validace selže (kvůli early return na řádku 8316).

**Důkaz:**
```javascript
// Řádek 8311-8318
const isValid = validateFormForSave();
if (!isValid) {
  console.log('❌ VALIDACE SELHALA - neukládám');
  setIsSaving(false);
  return; // ⬅️ KONEC - `setHasTriedToSubmit(false)` se NEVOLÁ
}
```

#### 🔴 PROBLÉM #2: Mazání chyb při onBlur (VYŘEŠENO)
```javascript
// Řádek 11550-11560 - ZAKOMENTOVÁNO
// ❌ REMOVED: Automatické mazání chyb při blur
// if (validationErrors[fieldName] && value) {
//   setValidationErrors(prev => {
//     const { [fieldName]: removed, ...rest } = prev;
//     return rest;
//   });
// }
```

**Status:** ✅ Vyřešeno - chyby se už nemažou při blur

#### 🔴 PROBLÉM #3: Reset při načtení objednávky
```javascript
// Řádek 6300 - useEffect při změně formData.id
if (!hasTriedToSubmit) {
  setValidationErrors({});
  setTouchedSelectFields(new Set());
}
```

**Problém:** Pokud `hasTriedToSubmit = true` a uživatel zkusí znovu uložit STEJNOU objednávku, validační chyby se NEMAŽOU. Ale když se změní ID (načte se jiná objednávka), chyby se vymažou.

## 🎯 DŮVOD MIZENÍ ČERVENÝCH RÁMEČKŮ

### Hypotéza #1: Validace lokací není v správné části kódu
**Status:** ✅ VYŘEŠENO
- Validace byla UVNITŘ bloku `if (nazev.includes('Limitovan'))` - spouštěla se jen při LP financování
- **FIX:** Přesunuto MIMO blok financování (řádky 15046, 15233)

### Hypotéza #2: Multiple re-renders způsobují reset
**Možná příčina:**
1. První pokus o uložení: `hasTriedToSubmit = true`, `validationErrors` se naplní
2. Červené rámečky se zobrazí ✅
3. Druhý pokus o uložení: Spustí se validace ZNOVU
4. Validace nastaví NOVÝ objekt `validationErrors`
5. **Pokud validace lokací NESELHALA (protože druh_objednavky_kod není MAJETEK nebo jiný důvod), chyby se nepřidají**
6. Červené rámečky zmizí ❌

### Hypotéza #3: useEffect interferuje
**K ověření:** Existuje useEffect který by mohl resetovat `hasTriedToSubmit` nebo `validationErrors`?

**Nalezené useEffects s resetem:**
1. Řádek 6300 - Reset při změně ID (OK - jen když se mění objednávka)
2. Řádek 10734 - Reset při vytvoření nové objednávky (OK)
3. Řádek 10976 - Reset při inicializaci nové objednávky (OK)
4. Řádek 14907 - Reset pro archivované objednávky (OK)

## 🔍 DEBUG LOG ANALÝZA (z konzole uživatele)

```
OrderForm25.js:8311 🔥 VOLÁM validateFormForSave před uložením...
OrderForm25.js:15130 🔍 VALIDAČNÍ CHYBY: {
  dodavatel_nazev: '...',
  dodavatel_adresa: '...',
  dodavatel_ico: '...',
  polozka_0_popis: '...',
  polozka_0_cena_bez_dph: '...',
  ...
}
OrderForm25.js:15131 🔍 Počet chyb: 10
OrderForm25.js:8313 🔥 Výsledek validace: false
OrderForm25.js:8316 ❌ VALIDACE SELHALA - neukládám
```

**Závěr:** 
- Validace SE spouští ✅
- Chyby SE detekují ✅
- Uložení SE zamítne ✅
- **ALE v chybách NEJSOU `polozka_0_usek_kod`, `polozka_0_budova_kod`, `polozka_0_mistnost_kod`** ❌

## 🐛 ROOT CAUSE

**Validace lokací se NESPOUŠTÍ, protože:**

1. ✅ **VYŘEŠENO:** Byla uvnitř bloku LP financování
2. ❓ **K OVĚŘENÍ:** `formData.druh_objednavky_kod` není "MAJETEK" nebo neobsahuje "MAJETEK"
3. ❓ **K OVĚŘENÍ:** `formData.polozky_objednavky` je prázdné nebo nemá požadovanou strukturu

## 🔧 DOPORUČENÁ ŘEŠENÍ

### Řešení A: Debug Logging (IMPLEMENTOVÁNO)
```javascript
// Řádek 15046
console.log('🔍 VALIDACE LOKACE:', {
  druh_objednavky_kod: formData.druh_objednavky_kod,
  isMaterialOrder,
  polozkyCount: formData.polozky_objednavky?.length
});
```

**Status:** ✅ V kódu - čeká na test uživatelem

### Řešení B: Odstranit reset při blur (IMPLEMENTOVÁNO)
**Status:** ✅ Zakomentováno na řádku 11550-11560

### Řešení C: Přesunout validaci lokací MIMO blok financování (IMPLEMENTOVÁNO)
**Status:** ✅ Přesunuto na řádky 15046 a 15233

### Řešení D: Ověřit hodnotu `formData.druh_objednavky_kod`
**Akce:** Potřeba DEBUG LOG od uživatele - jakou hodnotu má `druh_objednavky_kod`?

## 📋 DALŠÍ KROKY

1. ✅ Uživatel refreshne stránku
2. ✅ Zkusí uložit objednávku s prázdnými lokacemi
3. ✅ Pošle výstup z konzole
4. ❓ Analyzovat, proč validace lokací neselhala
5. ❓ Opravit podmínku pro detekci majetkové objednávky

## 🎯 OČEKÁVANÝ VÝSLEDEK

Po oprávě by měl výstup konzole vypadat:
```
🔍 VALIDACE LOKACE: {
  druh_objednavky_kod: "OBJ_MAJETEK",  // nebo jiný kód obsahující MAJETEK
  isMaterialOrder: true,
  polozkyCount: 2
}
🔍 Položka 0: {usek_kod: "", budova_kod: "", mistnost_kod: ""}
❌ Přidán error pro usek_kod položky 0
❌ Přidán error pro budova_kod položky 0
❌ Přidán error pro mistnost_kod položky 0
🔍 VALIDAČNÍ CHYBY: {
  ...ostatní chyby...,
  polozka_0_usek_kod: "Položka 1: Úsek je povinný u majetkových objednávek",
  polozka_0_budova_kod: "Položka 1: Budova je povinná u majetkových objednávek",
  polozka_0_mistnost_kod: "Položka 1: Místnost je povinná u majetkových objednávek"
}
```

---

**Datum:** 29.11.2025  
**Autor:** GitHub Copilot  
**Status:** 🔄 Čeká na feedback od uživatele s console logs
