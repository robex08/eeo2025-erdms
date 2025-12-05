# 🔒 Implementace FIX: Lock Dialog - Nová BE sémantika

**Datum implementace:** 24. října 2025  
**Backend dokumentace:** Aplikována podle BE týmu  
**Status:** ✅ IMPLEMENTOVÁNO

---

## 📋 Provedené změny

### 1. **Orders25List.js** - Kontrola při otevírání objednávky k editaci

**Soubor:** `src/pages/Orders25List.js`  
**Funkce:** `handleEdit()`  
**Řádky:** ~5189-5250

#### ✅ PŘED (stará logika):
```javascript
// ❌ Kontrolovala locked_by_user_id !== user_id
if (dbOrder.lock_info && dbOrder.lock_info.locked_by_user_id && dbOrder.lock_info.locked_by_user_id !== user_id) {
  // Zobraz lock dialog
}
```

#### ✅ PO (nová logika):
```javascript
// ✅ Kontroluje POUZE pole locked (true = zamčeno JINÝM)
if (dbOrder.lock_info?.locked === true) {
  // ❌ Zamčená JINÝM uživatelem - ZOBRAZ dialog a BLOKUJ editaci
  setShowLockedOrderDialog(true);
  return;
} else {
  // ✅ locked === false znamená můžu editovat (volná NEBO moje zamčená)
  if (dbOrder.lock_info?.is_owned_by_me === true) {
    console.log('✅ Objednávka je již zamčená aktuálním uživatelem');
  }
}
```

**Přidáno debugging:**
```javascript
console.log('🔍 Lock info check:', {
  orderId: orderIdToCheck,
  locked: dbOrder.lock_info?.locked,
  lock_status: dbOrder.lock_info?.lock_status,
  is_owned_by_me: dbOrder.lock_info?.is_owned_by_me,
  locked_by: dbOrder.lock_info?.locked_by_user_fullname
});
```

---

### 2. **OrderForm25.js** - Kontrola při načítání formuláře

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `useEffect` při načítání editované objednávky  
**Řádky:** ~3394-3428

#### ✅ PŘED (stará logika):
```javascript
if (dbOrder.lock_info && dbOrder.lock_info.locked_by_user_id && dbOrder.lock_info.locked_by_user_id !== user_id) {
  // Přesměruj zpět
}
```

#### ✅ PO (nová logika):
```javascript
if (dbOrder.lock_info?.locked === true) {
  // ❌ Zamčená JINÝM uživatelem - BLOKUJ a přesměruj
  showToast('Objednávka je zamčena uživatelem XY. Nelze ji otevřít pro editaci.', 'warning');
  window.location.href = '/orders25-list';
  return;
} else if (dbOrder.lock_info?.is_owned_by_me === true) {
  // ✅ Moje zamčená objednávka - pokračuj v editaci
  console.log('✅ Objednávka je zamčená aktuálním uživatelem');
}
```

**Přidáno debugging:**
```javascript
console.log('🔍 Lock info check (OrderForm25):', {
  orderId: editOrderId,
  locked: dbOrder.lock_info?.locked,
  lock_status: dbOrder.lock_info?.lock_status,
  is_owned_by_me: dbOrder.lock_info?.is_owned_by_me,
  locked_by: dbOrder.lock_info?.locked_by_user_fullname
});
```

---

### 3. **api25orders.js** - Aktualizace dokumentace

**Soubor:** `src/services/api25orders.js`  
**Funkce:** `lockOrder25()` - JSDoc komentář  
**Řádky:** ~673-710

#### ✅ Aktualizovaná dokumentace:
```javascript
/**
 * KLÍČOVÁ ZMĚNA: locked: true znamená "zamčeno JINÝM uživatelem"
 *                locked: false znamená "můžu editovat" (volná NEBO moje zamčená)
 * 
 * Nové pole: is_owned_by_me: true/false
 */
```

---

## 🎯 Rozhodovací tabulka (implementováno)

| `lock_info.locked` | `is_owned_by_me` | **Akce FE** |
|-------------------|------------------|-------------|
| `true` | `false` | ❌ **ZOBRAZIT lock dialog + BLOKOVAT editaci** |
| `false` | `true` | ✅ Povolit editaci (moje zamčená) + SKRÝT dialog |
| `false` | `false` | ✅ Povolit editaci (volná) + SKRÝT dialog |

---

## 🧪 Testovací scénáře

### ✅ Test 1: Volná objednávka
1. Otevřít objednávku, která není zamčená
2. **Očekáváno:** Lock dialog NENÍ zobrazen, editace povolena
3. **Kontrola konzole:** `locked: false, is_owned_by_me: false`

### ✅ Test 2: Moje zamčená objednávka (KLÍČOVÝ TEST)
1. Otevřít objednávku, zamknout ji
2. Refresh stránky (F5)
3. Otevřít stejnou objednávku znovu
4. **Očekáváno:** Lock dialog **NENÍ** zobrazen, editace povolena
5. **Kontrola konzole:** `locked: false, is_owned_by_me: true`

### ✅ Test 3: Cizí zamčená objednávka
1. Uživatel A zamkne objednávku
2. Uživatel B se pokusí otevřít stejnou objednávku
3. **Očekáváno:** Lock dialog **JE** zobrazen, editace blokována
4. **Kontrola konzole:** `locked: true, is_owned_by_me: false`

---

## 🐛 Debugging

### Jak zjistit, zda fix funguje:

1. **Otevřít DevTools Console** (F12)
2. **Najít log:** `🔍 Lock info check:`
3. **Zkontrolovat hodnoty:**
   ```javascript
   {
     orderId: 123,
     locked: false,           // ← Pro MOJI objednávku musí být FALSE!
     lock_status: "owned",
     is_owned_by_me: true,    // ← Musí být TRUE
     locked_by: "Já (Jan Novák)"
   }
   ```

### Pokud Lock dialog se stále zobrazuje:

1. **Clear browser cache:** Ctrl+Shift+R
2. **Zkontrolovat Network tab:**
   - Najít request `/orders25/by-id`
   - Zkontrolovat response → `lock_info.locked` musí být `false` pro vlastní objednávku
3. **Zkontrolovat verzi BE:**
   - Backend musí být **24.10.2025** nebo novější
   - Starší verze BE nevrací správnou sémantiku

---

## 📊 Změny v kódu - Přehled

| Soubor | Funkce/Místo | Typ změny | Řádky |
|--------|--------------|-----------|-------|
| `Orders25List.js` | `handleEdit()` | ✅ Logika + debug | ~5189-5250 |
| `OrderForm25.js` | `useEffect` (edit load) | ✅ Logika + debug | ~3394-3428 |
| `api25orders.js` | `lockOrder25()` JSDoc | 📝 Dokumentace | ~673-710 |

**Celkem změněno:** 3 soubory  
**Přidáno řádků:** ~60  
**Upraveno řádků:** ~30  
**Breaking changes:** ❌ Žádné

---

## ✅ Checklist

- [x] **Orders25List.js:** Změna kontroly na `locked === true`
- [x] **OrderForm25.js:** Změna kontroly na `locked === true`
- [x] **api25orders.js:** Aktualizace dokumentace
- [x] **Debugging logy:** Přidáno `console.log` s detaily `lock_info`
- [x] **Dokumentace:** Vytvořen tento soubor
- [ ] **Testování:** Manuální test všech 3 scénářů
- [ ] **Git commit:** Zacommitovat změny
- [ ] **Deploy:** Nasadit na produkci

---

## 🚀 Další kroky

1. **Manuální testování:**
   - Test 1: Volná objednávka ✅
   - Test 2: Moje zamčená objednávka (refresh) ✅ ← **KLÍČOVÝ**
   - Test 3: Cizí zamčená objednávka ✅

2. **Refactoring (volitelné):**
   - Zvážit vytvoření utility funkce `shouldShowLockDialog(lock_info)`
   - Centralizovat lock checking logiku

3. **Monitoring:**
   - Sledovat Console logy v produkci první týden
   - Kontrolovat, zda uživatelé nenahlásí další problémy

---

## 📞 Kontakt

**Autor:** Frontend tým  
**Datum:** 24.10.2025  
**Backend dokumentace:** Aplikována podle BE týmu  

Pokud problém přetrvává:
1. Poslat screenshot Network tab (`/orders25/by-id` response)
2. Poslat screenshot Console (výstup `🔍 Lock info check:`)
3. Ověřit verzi BE (musí být >= 24.10.2025)

---

## 📝 Poznámky

- ✅ **Backwards compatible:** Starý kód bude fungovat i nadále
- ✅ **Nová pole volitelná:** `is_owned_by_me` není nutné používat (stačí `locked`)
- ✅ **Jednoduché řešení:** Stačí kontrolovat `if (locked)` místo složitých podmínek
- ⚡ **Performance:** Žádný dopad na výkon
- 🔒 **Security:** Žádné změny v bezpečnosti (BE vrací správná data)

---

**Status:** ✅ **HOTOVO - Čeká na testování**
