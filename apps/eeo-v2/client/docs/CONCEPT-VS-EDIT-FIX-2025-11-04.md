# Oprava: Koncept vs Editace - Správné rozlišení
**Datum:** 4. listopadu 2025  
**Soubory:** 
- `src/pages/Orders25List.js`

**Závažnost:** 🟡 **STŘEDNÍ** - Chyba v UX logice

---

## 📋 Popis problému

Při kliknutí na ikonu "Pokračovat v editaci" u **konceptu objednávky** v tabulce se:
1. ❌ **ŠPATNĚ** používal parametr `edit=<id>&archivovano=1` 
2. ❌ Změnil se stav z "Koncept" na "Editace"
3. ❌ Koncept byl chybně interpretován jako editovaná DB objednávka

### Důsledky
- Uživatelé viděli "Editace" místo "Koncept"
- URL parametry byly chybné pro koncepty
- Nekonzistentní chování s menu bar tlačítkem "Nová objednávka"

---

## 🎯 Správná logika: KONCEPT vs EDITACE

### KONCEPT (isDraft === true)
- **Objekt NENÍ V DATABÁZI**
- Uložen POUZE v localStorage (order25DraftStorageService)
- **URL:** `/order-form-25?mode=concept`
- **Stav:** "Koncept" (NIKDY "Editace"!)
- **Tooltip:** "Vrátit se ke konceptu objednávky"

### EDITACE (hasLocalDraftChanges === true)
- **Objekt JE V DATABÁZI** (má objednavka_id)
- Má uložené změny v localStorage
- **URL:** `/order-form-25?edit=<objednavka_id>`
- **Stav:** "Editace"
- **Tooltip:** "Pokračovat v editaci"

---

## ✅ Implementované změny

### 1. Oprava `handleEdit` funkce (řádek ~6724)

**PŘED:**
```javascript
// Pokud je objednávka již v konceptu, rovnou přesměruj
if (order.isDraft || order.hasLocalDraftChanges) {
  navigate(`/order-form-25?edit=${order.id || order.objednavka_id}&archivovano=1`);
  return;
}
```

**PO:**
```javascript
// ✅ KONCEPT - pokračovat v tvorbě nové objednávky (není v DB)
if (order.isDraft && !order.objednavka_id) {
  navigate(`/order-form-25?mode=concept`);
  return;
}

// ✅ EDITACE - pokračovat v editaci existující DB objednávky (má lokální změny)
if (order.hasLocalDraftChanges && order.objednavka_id) {
  navigate(`/order-form-25?edit=${order.objednavka_id}`);
  return;
}
```

### 2. Oprava tooltip textu (řádek ~5854)

**PŘED:**
```javascript
title={(row.original.isDraft || row.original.hasLocalDraftChanges) ? "Pokračovat v editaci" : "Editovat"}
```

**PO:**
```javascript
title={
  row.original.isDraft 
    ? "Vrátit se ke konceptu objednávky" 
    : row.original.hasLocalDraftChanges 
      ? "Pokračovat v editaci" 
      : "Editovat"
}
```

---

## 🧪 Testování

### Test Case 1: Koncept objednávky (není v DB)
**Kroky:**
1. Vytvořit novou objednávku (menu bar → "Nová objednávka")
2. Vyplnit nějaká pole
3. Zavřít formulář bez uložení
4. V tabulce kliknout na ikonu editace u konceptu

**Očekávaný výsledek:**
- ✅ Tooltip: "Vrátit se ke konceptu objednávky"
- ✅ URL: `/order-form-25?mode=concept`
- ✅ Stav v formuláři: "Koncept"
- ✅ Data jsou načtena z localStorage

### Test Case 2: Editovaná DB objednávka (má změny)
**Kroky:**
1. Otevřít existující objednávku k editaci
2. Změnit nějaká pole
3. Zavřít formulář bez uložení
4. V tabulce kliknout na ikonu editace u editované objednávky

**Očekávaný výsledek:**
- ✅ Tooltip: "Pokračovat v editaci"
- ✅ URL: `/order-form-25?edit=<objednavka_id>`
- ✅ Stav v formuláři: "Editace"
- ✅ Data kombinují DB + lokální změny

### Test Case 3: Běžná objednávka (bez změn)
**Kroky:**
1. Kliknout na ikonu editace u běžné objednávky

**Očekávaný výsledek:**
- ✅ Tooltip: "Editovat"
- ✅ URL: `/order-form-25?edit=<objednavka_id>`
- ✅ Stav v formuláři: "Editace"
- ✅ Data načtena z DB

---

## 📊 Impact Assessment

| Metrika | Hodnota |
|---------|---------|
| **Postižení funkce** | Pouze koncepty v tabulce |
| **Závažnost** | 🟡 Střední (UX issue) |
| **Ovlivněné komponenty** | Orders25List |
| **Riziko regrese** | 🟢 Nízké (izolovaná změna) |
| **Zpětná kompatibilita** | ✅ Ano |

---

## 🔍 Komentáře ke kódu

Přidány detailní komentáře v `handleEdit` funkci vysvětlující rozdíl mezi:
- **KONCEPT** (isDraft, bez objednavka_id, localStorage only)
- **EDITACE** (hasLocalDraftChanges, s objednavka_id, DB + localStorage)

Tento komentář pomáhá vývojářům pochopit kritickou logiku a předejít podobným chybám v budoucnu.

---

## ✅ Status

- **Implementováno:** ✅ Ano
- **Testováno:** ⏳ Čeká na manuální test
- **Dokumentováno:** ✅ Ano
- **Code review:** ⏳ Pending

---

**Autor:** GitHub Copilot  
**Reviewer:** TBD  
**Datum implementace:** 4. listopadu 2025
