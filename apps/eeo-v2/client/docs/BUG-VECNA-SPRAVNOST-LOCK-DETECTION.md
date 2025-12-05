# 🐛 BUG: Falešná detekce zamčení ve fázi "Věcná správnost"

**Datum analýzy:** 27. listopadu 2025  
**Datum implementace:** 27. listopadu 2025  
**Fáze:** Věcná správnost (fáze 7)  
**Symptom:** Toast hlášení "Objednávka je zamčena jiným uživatelem" při ukládání vlastní objednávky  
**Status:** ✅ OPRAVENO - Git commit: 44d427a

---

## 📋 Popis problému

Při ukládání objednávky ve fázi **"Věcná správnost"** (fáze 7) se zobrazuje toast s chybou:

> ❌ "Nelze uložit změny. Objednávka je zamčena uživatelem [vlastní jméno]"

...i když uživatel edituje **svou vlastní** objednávku, kterou má legitimně zamčenou.

### 🔍 Kde se to děje

- **Komponenta:** `OrderForm25.js`
- **Funkce:** `handleSaveOrder()` - catch blok
- **Řádky:** ~10159-10168

---

## 🔬 Analýza příčiny

### 1. **Správné chování podle dokumentace (LOCK-FIX-IMPLEMENTATION.md)**

Backend **by měl** vracet:

```javascript
{
  lock_info: {
    locked: false,           // ← FALSE pro vlastní objednávku!
    is_owned_by_me: true,    // ← TRUE = moje zamčená
    locked_by_user_fullname: "Jan Novák",
    locked_by_user_id: 123,
    lock_age_minutes: 5
  }
}
```

**Klíčové:**
- `locked: false` = "můžu editovat" (volná NEBO moje zamčená)
- `locked: true` = "zamčeno JINÝM uživatelem" (nemohu editovat)

### 2. **Aktuální problém v kódu**

#### ❌ Problem #1: `apiOrderV2.js` NEPŘIPOJUJE `lock_info` k error objektu

**Soubor:** `src/services/apiOrderV2.js`  
**Funkce:** `updateOrderV2()` - catch blok  
**Řádky:** ~595-645

```javascript
// ❌ CHYBÍ: Připojení lock_info k error objektu
if (errorData.error_code === 'ORDER_LOCKED') {
  throw new Error(`Objednávka je zamčená uživatelem ${errorData.details?.locked_by_name}`);
  // ⚠️ PROBLÉM: error.lock_info není nastaveno!
}
```

**Správně by mělo být (jako v `api25orders.js`):**

```javascript
if (errorData.error_code === 'ORDER_LOCKED') {
  const err = new Error(`Objednávka je zamčená uživatelem ${errorData.details?.locked_by_name}`);
  
  // ✅ PŘIPOJIT lock_info z backendu
  if (errorData.lock_info || errorData.details?.lock_info) {
    err.lock_info = errorData.lock_info || errorData.details.lock_info;
  }
  
  throw err;
}
```

#### ❌ Problem #2: Frontend spoléhá na `error.lock_info`

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `handleSaveOrder()` - catch blok  
**Řádky:** ~10159-10168

```javascript
catch (error) {
  // Zpracovat HTTP 423 error (zamčeno jiným uživatelem)
  if (error.lock_info) {
    const lockInfo = error.lock_info;
    const userName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
    
    showToast(
      `Nelze uložit změny. Objednávka je zamčena uživatelem ${userName}`,
      { type: 'error' }
    );
  }
}
```

**Problém:**
- Kód předpokládá, že když `error.lock_info` existuje, je objednávka zamčená JINÝM uživatelem
- Ale **NEKONTROLUJE** `lock_info.locked` (true/false) ani `lock_info.is_owned_by_me`

---

## 🎯 Root Cause (Hlavní příčina)

1. **Backend vrací `lock_info` i pro vlastní objednávky** (což je správně)
2. **`apiOrderV2.js` NEPŘIPOJUJE `lock_info` k error objektu** (chybí propagace)
3. **Frontend NEKONTROLUJE `locked: true/false`** (předpokládá že přítomnost `lock_info` = zamčeno jiným)

### 🔥 Kritický scénář

```
Uživatel → Otevře svou objednávku (locked=false, is_owned_by_me=true)
         → Edituje ve fázi 7 (Věcná správnost)
         → Klikne Uložit
         → Backend vrací error.lock_info (i když je to JEHO objednávka!)
         → apiOrderV2.js NEZPROPAGUJE lock_info
         → Frontend vidí error.lock_info a zobrazí falešné hlášení
```

---

## ✅ Řešení

### Fix #1: Opravit `apiOrderV2.js` - připojit `lock_info` k error objektu

**Soubor:** `src/services/apiOrderV2.js`  
**Funkce:** `updateOrderV2()` - catch blok  
**Řádky:** ~608-611

```javascript
// ORDER_LOCKED
if (errorData.error_code === 'ORDER_LOCKED') {
  const err = new Error(`Objednávka je zamčená uživatelem ${errorData.details?.locked_by_name} od ${errorData.details?.locked_at}`);
  
  // ✅ FIX: Připojit lock_info z backendu
  if (errorData.lock_info) {
    err.lock_info = errorData.lock_info;
  } else if (errorData.details?.lock_info) {
    err.lock_info = errorData.details.lock_info;
  }
  
  throw err;
}
```

### Fix #2: Opravit `OrderForm25.js` - kontrolovat `locked: true`

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `handleSaveOrder()` - catch blok  
**Řádky:** ~10159-10168

```javascript
catch (error) {
  // Zpracovat HTTP 423 error (zamčeno jiným uživatelem)
  if (error.lock_info) {
    const lockInfo = error.lock_info;
    
    // ✅ FIX: Kontrolovat POUZE locked === true (= zamčeno JINÝM)
    if (lockInfo.locked === true) {
      const userName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
      const lockAge = lockInfo.lock_age_minutes
        ? ` (zamčeno před ${lockInfo.lock_age_minutes} minutami)`
        : '';

      showToast(
        `Nelze uložit změny. Objednávka je zamčena uživatelem ${userName}${lockAge}`,
        { type: 'error' }
      );
    } else {
      // locked === false → MOJE objednávka, zobraz obecnou chybu
      const errorMsg = translateErrorMessageShort(error.message);
      showToast(`Nepodařilo se uložit objednávku: ${errorMsg}`, { type: 'error' });
    }
  } else {
    const errorMsg = translateErrorMessageShort(error.message);
    showToast(`Nepodařilo se uložit objednávku: ${errorMsg}`, { type: 'error' });
  }
}
```

---

## 📊 Rozhodovací tabulka (opravená)

| `lock_info` exists | `locked` | `is_owned_by_me` | **Zobrazit toast o zamčení** |
|-------------------|----------|------------------|------------------------------|
| ❌ Ne | - | - | ❌ Ne (obecná chyba) |
| ✅ Ano | `true` | `false` | ✅ **ANO** (zamčeno JINÝM) |
| ✅ Ano | `false` | `true` | ❌ Ne (moje objednávka) |
| ✅ Ano | `false` | `false` | ❌ Ne (volná objednávka) |

---

## 🧪 Test scénáře

### ✅ Test 1: Vlastní objednávka (KLÍČOVÝ TEST)
1. Přihlásit se jako uživatel A
2. Otevřít objednávku ve fázi 7 (Věcná správnost)
3. Změnit nějaké pole
4. Kliknout **Uložit**
5. **Očekáváno:** 
   - ✅ Uložení proběhne úspěšně
   - ✅ Toast: "Objednávka byla úspěšně uložena"
   - ❌ **NE:** Toast o zamčení

### ✅ Test 2: Cizí objednávka
1. Uživatel A zamkne objednávku
2. Uživatel B se pokusí otevřít a uložit
3. **Očekáváno:**
   - ❌ Uložení selhá
   - ✅ Toast: "Objednávka je zamčena uživatelem A"

### ✅ Test 3: Obecná chyba (ne zamčení)
1. Simulovat chybu (např. validační)
2. **Očekáváno:**
   - ❌ Uložení selhá
   - ✅ Toast: "Nepodařilo se uložit: [validační chyba]"

---

## 📝 Checklist implementace

- [x] **Fix #1:** Opravit `apiOrderV2.js` - připojit `lock_info` ✅ HOTOVO (27.11.2025)
- [x] **Fix #2:** Opravit `OrderForm25.js` - kontrolovat `locked === true` ✅ HOTOVO (27.11.2025)
- [ ] **Test #1:** Vlastní objednávka (fáze 7) 🔄 Čeká na manuální test
- [ ] **Test #2:** Cizí objednávka 🔄 Čeká na manuální test
- [ ] **Test #3:** Obecná chyba 🔄 Čeká na manuální test
- [x] **Dokumentace:** Aktualizovat dokumentaci ✅ HOTOVO
- [x] **Git commit:** Zacommitovat změny ✅ HOTOVO (commit 44d427a)
- [ ] **Deploy:** Nasadit na produkci 🔄 Čeká na testování

---

## 🔗 Související soubory

- `src/services/apiOrderV2.js` - error handling pro `ORDER_LOCKED`
- `src/forms/OrderForm25.js` - catch blok v `handleSaveOrder()`
- `src/services/api25orders.js` - referenční implementace (správná)
- `docs/LOCK-FIX-IMPLEMENTATION.md` - dokumentace lock logiky

---

## 🚨 Priorita

**HIGH** - Ovlivňuje UX ve fázi 7 (Věcná správnost), způsobuje matoucí chybová hlášení

---

## 📞 Kontakt

**Autor analýzy:** GitHub Copilot  
**Datum:** 27.11.2025  
**Backend kontakt:** Backend tým (ověřit strukturu `error.lock_info`)

---

**Status:** ✅ **OPRAVENO - Čeká na manuální testování**

---

## 🎉 Implementované změny (27.11.2025)

### Fix #1: `apiOrderV2.js` (řádky 608-621)
```javascript
// ORDER_LOCKED
if (errorData.error_code === 'ORDER_LOCKED') {
  const err = new Error(`Objednávka je zamčená...`);
  
  // ✅ NOVĚ: Připojení lock_info k error objektu
  if (errorData.lock_info) {
    err.lock_info = errorData.lock_info;
  } else if (errorData.details?.lock_info) {
    err.lock_info = errorData.details.lock_info;
  }
  
  throw err;
}
```

### Fix #2: `OrderForm25.js` (řádky 10159-10188)
```javascript
if (error.lock_info) {
  const lockInfo = error.lock_info;
  
  // ✅ NOVĚ: Kontrola locked === true
  if (lockInfo.locked === true) {
    // ❌ Zamčeno JINÝM - zobrazit toast
    showToast(`Nelze uložit změny. Objednávka je zamčena...`);
  } else {
    // ✅ locked === false → MOJE objednávka
    showToast(`Nepodařilo se uložit objednávku: ${errorMsg}`);
  }
}
```

**Git commit:** `44d427a`  
**Branch:** `LISTOPAD-VIKEND`
