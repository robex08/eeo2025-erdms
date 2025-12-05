# 🔧 FIX: Odstranění neexistujícího sloupce `storno_uzivatel_id`

**Datum:** 17. listopadu 2025  
**Branch:** LISTOPAD-VIKEND  
**Status:** ✅ HOTOVO

---

## 🔴 Problém

Frontend se pokoušel ukládat pole `storno_uzivatel_id`, které **neexistuje v databázové tabulce `objednavky_2025`**.

### Chyba:
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'storno_uzivatel_id' in 'field list'
```

---

## ✅ Řešení

Pole `storno_uzivatel_id` bylo **redundantní** - jeho funkci již plní existující pole `odesilatel_id`.

### Logika ukládání odeslání/storna v DB:

| Pole | Typ | Význam |
|------|-----|--------|
| `odesilatel_id` | INT | ID uživatele který odeslal NEBO stornoval objednávku |
| `dt_odeslani` | DATE | Datum odeslání NEBO storna (společné pole) |
| `odeslani_storno_duvod` | TEXT | **ROZLIŠOVACÍ POLE:** prázdný = odeslání, vyplněný = storno |
| `storno_provedl` | VARCHAR | Celé jméno uživatele (pro UI zobrazení) |

### Klíčová logika:

```javascript
// ✅ Rozlišení typu akce:
if (odeslani_storno_duvod === '' || odeslani_storno_duvod === null) {
  // → Objednávka ODESLÁNA
} else if (odeslani_storno_duvod.trim().length > 0) {
  // → Objednávka STORNOVÁNA
}
```

---

## 📝 Provedené změny

### 1. **OrderForm25.js**

#### Odstraněno z inicializace state:
```javascript
// ❌ PŘED:
storno_uzivatel_id: '', // ID uživatele, který provedl storno

// ✅ PO:
// odesilatel_id (v DB) ukládá ID uživatele pro OBOJÍ (odeslání i storno)
// Rozlišení: odeslani_storno_duvod prázdný = odeslání, vyplněný = storno
```

#### Odstraněno z `directCopyFields`:
```javascript
// ❌ PŘED:
const directCopyFields = [
  'datum_storna',
  'odeslani_storno_duvod',
  'identifikator',
  'dt_odeslani',
  'storno_uzivatel_id',  // ❌ ODSTRANĚNO
  'storno_provedl'
];

// ✅ PO:
const directCopyFields = [
  'datum_storna',
  'odeslani_storno_duvod',
  'identifikator',
  'dt_odeslani',
  'storno_provedl'
];
```

#### Odstraněno z handleSaveOrder:
```javascript
// ❌ PŘED:
if (formData.stav_stornovano) {
  if (formData.storno_uzivatel_id) orderData.storno_uzivatel_id = formData.storno_uzivatel_id;
  if (formData.storno_provedl) orderData.storno_provedl = formData.storno_provedl;
}

// ✅ PO:
if (formData.stav_stornovano) {
  if (formData.storno_provedl) orderData.storno_provedl = formData.storno_provedl;
  // odesilatel_id se nastaví níže (společné pro odeslání i storno)
}
```

#### Odstraněno z handleInputChange:
```javascript
// ❌ PŘED:
if (value === true && !prev.datum_storna) {
  newData.datum_storna = getCurrentDate();
  
  if (user_id && !prev.storno_uzivatel_id) {
    newData.storno_uzivatel_id = user_id;  // ❌ ODSTRANĚNO
  }
  
  if (userDetail && !prev.storno_provedl) {
    newData.storno_provedl = jmeno;
  }
}

// ✅ PO:
if (value === true && !prev.datum_storna) {
  newData.datum_storna = getCurrentDate();
  
  if (userDetail && !prev.storno_provedl) {
    newData.storno_provedl = jmeno;
  }
  // odesilatel_id se nastaví automaticky při uložení
}
```

#### Odstraněno z reset funkcí:
```javascript
// ❌ PŘED:
handleInputChange('storno_uzivatel_id', '');

// ✅ PO:
// (pole neexistuje, není potřeba mazat)
```

### 2. **useWorkflowManager.js**

#### Odstraněno z resetStornoData:
```javascript
// ❌ PŘED:
updatedFormData: {
  ...formData,
  stav_odeslano: false,
  datum_odeslani: '',
  stav_stornovano: false,
  datum_storna: '',
  storno_uzivatel_id: '',  // ❌ ODSTRANĚNO
  storno_provedl: '',
  odeslani_storno_duvod: '',
  stav_workflow_kod: newWorkflowCode,
}

// ✅ PO:
updatedFormData: {
  ...formData,
  stav_odeslano: false,
  datum_odeslani: '',
  stav_stornovano: false,
  datum_storna: '',
  storno_provedl: '',
  odeslani_storno_duvod: '',
  stav_workflow_kod: newWorkflowCode,
}
```

---

## 🎯 Výsledek

### ✅ Co nyní funguje:

1. **`odesilatel_id`** ukládá ID uživatele pro **OBOJÍ** (odeslání i storno)
2. **`dt_odeslani`** ukládá datum pro **OBOJÍ** (odeslání i storno)
3. **`odeslani_storno_duvod`** rozlišuje typ akce:
   - Prázdný nebo NULL = **ODESLÁNÍ**
   - Vyplněný text = **STORNO** (povinný!)
4. **`storno_provedl`** obsahuje celé jméno pro zobrazení v UI
5. **Žádné SQL chyby** - všechna ukládaná pole existují v DB

### 🔍 Backend logika (připomínka):

Backend při načtení objednávky rozhoduje:
```php
if (empty($row['odeslani_storno_duvod'])) {
    $stav[] = 'ODESLANA';
} else {
    $stav[] = 'STORNOVANA';
}
```

---

## 📊 Testování

### Test 1: Odeslání objednávky
1. ✅ Zaškrtnout "Odeslána"
2. ✅ Uložit objednávku
3. ✅ Ověřit v DB: `odesilatel_id` = ID uživatele, `odeslani_storno_duvod` = ''

### Test 2: Storno objednávky
1. ✅ Zaškrtnout "Stornována"
2. ✅ Vyplnit důvod storna (povinné!)
3. ✅ Uložit objednávku
4. ✅ Ověřit v DB: `odesilatel_id` = ID uživatele, `odeslani_storno_duvod` = vyplněný text

### Test 3: Přepnutí storno → odeslání
1. ✅ Z již stornované objednávky zaškrtnout "Odeslána"
2. ✅ Uložit objednávku
3. ✅ Ověřit v DB: `odeslani_storno_duvod` = '' (vymazáno)

---

## 🔗 Související soubory

- `src/forms/OrderForm25.js` - hlavní formulář
- `src/forms/OrderForm25/hooks/useWorkflowManager.js` - workflow management
- `src/services/apiOrderV2.js` - API komunikace
- `docs/BACKEND-ORDER-V2-USER-ROLES-FILTER.md` - backend dokumentace rolí

---

## ✅ Checklist

- [x] Odstraněno `storno_uzivatel_id` z inicializace state
- [x] Odstraněno z `directCopyFields`
- [x] Odstraněno z `handleSaveOrder`
- [x] Odstraněno z `handleInputChange`
- [x] Odstraněno z reset funkcí
- [x] Odstraněno z `useWorkflowManager.js`
- [x] Přidány komentáře vysvětlující logiku
- [x] Žádné ESLint chyby
- [x] Žádné TypeScript chyby
- [x] Dokumentace vytvořena

---

## 📌 Poznámky

- **`odesilatel_id`** je součástí 12 rolí pro filtrování objednávek (viz `BACKEND-ORDER-V2-USER-ROLES-FILTER.md`)
- Pole **NEMĚNÍ** svůj význam - vždy obsahuje ID toho, kdo provedl akci (odeslal nebo stornoval)
- Rozlišení typu akce je **POUZE** podle `odeslani_storno_duvod`
