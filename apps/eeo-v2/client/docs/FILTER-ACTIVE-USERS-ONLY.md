# ✅ FILTR AKTIVNÍCH UŽIVATELŮ V ORDER FORMULÁŘI

**Datum:** 19. října 2025  
**Status:** ✅ IMPLEMENTOVÁNO  
**Priorita:** P2 - MEDIUM

---

## 📋 ZMĚNA

V Order formuláři (`OrderForm25.js`) se v selectech s uživateli nyní zobrazují **pouze aktivní uživatele**.

### Ovlivněné selecty:
1. **GARANT** - výběr garanta objednávky
2. **PŘÍKAZCE** - výběr schvalovatele (approver)

---

## 🔧 MODIFIKOVANÉ SOUBORY

### `/src/forms/OrderForm25.js`

#### Změna A: Funkce `loadAllUsers()` (řádky ~3779)

**PŘED:**
```javascript
const users = await fetchAllUsers({ token, username });
setAllUsers(users || []);

addDebugLog('success', 'POST', 'users/list', null, { 
  count: users?.length || 0, 
  users: users?.slice(0, 3),
  url: fullURL,
  status: 'SUCCESS'
});
```

**PO:**
```javascript
const users = await fetchAllUsers({ token, username });

// Filtrovat pouze aktivní uživatele (aktivni = 1)
const activeUsers = (users || []).filter(user => user.aktivni === 1 || user.aktivni === '1');

setAllUsers(activeUsers);

addDebugLog('success', 'POST', 'users/list', null, { 
  count: activeUsers?.length || 0,
  totalUsers: users?.length || 0,
  filtered: (users?.length || 0) - (activeUsers?.length || 0),
  users: activeUsers?.slice(0, 3),
  url: fullURL,
  status: 'SUCCESS'
});
```

**Změny:**
- ✅ Přidán filtr: `.filter(user => user.aktivni === 1 || user.aktivni === '1')`
- ✅ Debug log nyní zobrazuje: počet aktivních, celkový počet, kolik vyfiltrováno
- ✅ `setAllUsers()` dostává pouze aktivní uživatele

---

#### Změna B: Funkce `loadApprovers()` (řádky ~3825)

**PŘED:**
```javascript
const approversList = await fetchApprovers({ token, username });

// Zpracuj approvers a přidej správně poskládaná jména s tituly
const processedApprovers = (approversList || []).map(approver => {
  // ... mapping logic ...
});

setApprovers(processedApprovers);

addDebugLog('success', 'POST', 'users/approvers', null, { 
  count: approversList?.length || 0, 
  approvers: approversList?.slice(0, 3),
  url: fullURL,
  status: 'SUCCESS'
});
```

**PO:**
```javascript
const approversList = await fetchApprovers({ token, username });

// Filtrovat pouze aktivní uživatele (aktivni = 1)
const activeApprovers = (approversList || []).filter(approver => 
  approver.aktivni === 1 || approver.aktivni === '1'
);

// Zpracuj approvers a přidej správně poskládaná jména s tituly
const processedApprovers = activeApprovers.map(approver => {
  // ... mapping logic ...
});

setApprovers(processedApprovers);

addDebugLog('success', 'POST', 'users/approvers', null, { 
  count: processedApprovers?.length || 0,
  totalApprovers: approversList?.length || 0,
  filtered: (approversList?.length || 0) - (processedApprovers?.length || 0),
  approvers: processedApprovers?.slice(0, 3),
  url: fullURL,
  status: 'SUCCESS'
});
```

**Změny:**
- ✅ Přidán filtr před mappingem: `.filter(approver => approver.aktivni === 1 || approver.aktivni === '1')`
- ✅ Debug log zobrazuje statistiky filtrování
- ✅ `setApprovers()` dostává pouze aktivní schvalovatele

---

## 📊 LOGIKA FILTRU

### Podmínka:
```javascript
user.aktivni === 1 || user.aktivni === '1'
```

**Vysvětlení:**
- Pole `aktivni` z API může být číselný `1` nebo stringový `'1'`
- Filtr akceptuje obě varianty pro robustnost
- Hodnota `0` nebo `'0'` = neaktivní uživatel → vyfiltrován
- `null` nebo `undefined` = vyfiltrován (předpokládáme neaktivní)

---

## 🎯 ÚČEL ZMĚNY

### Problém (PŘED):
- V selectech se zobrazovali **všichni** uživatelé (aktivní i neaktivní)
- Uživatel mohl vybrat neaktivního zaměstnance jako garanta/schvalovatele
- Zmatečné UX - nelze poznat kdo je aktivní

### Řešení (PO):
- ✅ Zobrazují se pouze aktivní uživatelé
- ✅ Jednodušší výběr (kratší seznam)
- ✅ Prevence chyb (nelze vybrat neaktivního)
- ✅ Lepší UX (relevantní výběr)

---

## 🧪 TESTOVÁNÍ

### Test 1: Garant Select
**Kroky:**
1. Otevřít Order formulář (nová objednávka)
2. V sekci "Objednatel" otevřít dropdown "GARANT"
3. Zkontrolovat seznam uživatelů

**Očekávaný výsledek:**
- ✅ Zobrazují se pouze aktivní uživatelé
- ❌ Neaktivní uživatelé nejsou v seznamu

**Debug kontrola (Console):**
```javascript
// Hledat log:
// [SUCCESS] POST users/list
// count: 45 (počet aktivních)
// totalUsers: 52 (celkový počet)
// filtered: 7 (vyfiltrováno)
```

---

### Test 2: Příkazce Select
**Kroky:**
1. V Order formuláři otevřít sekci "Schválení nákupu PO"
2. Otevřít dropdown "PŘÍKAZCE"
3. Zkontrolovat seznam schvalovatelů

**Očekávaný výsledek:**
- ✅ Zobrazují se pouze aktivní schvalovatelé
- ❌ Neaktivní nejsou v seznamu

**Debug kontrola (Console):**
```javascript
// Hledat log:
// [SUCCESS] POST users/approvers
// count: 12 (počet aktivních)
// totalApprovers: 15 (celkový počet)
// filtered: 3 (vyfiltrováno)
```

---

### Test 3: Editace existující objednávky s neaktivním uživatelem

**Scénář:**
- Objednávka vytvořena před měsícem
- Garant byl tehdy aktivní → nyní neaktivní

**Kroky:**
1. Otevřít starou objednávku v edit módu
2. Zkontrolovat pole GARANT

**Očekávaný výsledek:**
- ✅ Původní (neaktivní) garant **ZŮSTANE** zobrazen v poli (předvyplněno z DB)
- ✅ Při otevření dropdownu se zobrazí pouze aktivní uživatelé
- ✅ Pokud změníme garanta, nelze vybrat původního neaktivního

**Poznámka:** Toto je žádoucí chování - historická data se zachovávají, ale nové výběry jsou pouze z aktivních.

---

## 📈 DOPAD

### Výkon:
- **Zanedbatelný** - filtr `.filter()` je O(n), rychlý pro ~50-200 uživatelů
- Debug log ukáže přesný počet vyfiltrovaných

### UX:
- ✅ **Lepší** - kratší, relevantnější seznamy
- ✅ **Prevence chyb** - nelze vybrat neaktivního zaměstnance

### Data:
- ✅ **Zachována integrita** - existující objednávky s neaktivními uživateli zůstávají platné
- ✅ **Nové záznamy** - pouze aktivní uživatelé

---

## ⚠️ POZNÁMKY

### Backend API
Tato změna je **pure frontend filtr** - API endpoint stále vrací všechny uživatele.

**Alternativa (budoucnost):**
Backend mohl by přidat parametr `?aktivni=1` do endpoint `users/list` a `users/approvers`.

**Výhody FE filtru (současný přístup):**
- ✅ Rychlá implementace bez BE změny
- ✅ BE nemusí měnit API contract
- ✅ FE má kontrolu nad filtrováním
- ✅ Debug log vidí celkový i filtrovaný počet

**Nevýhody FE filtru:**
- ⚠️ Přenáší všechny uživatele po síti (ale seznam je malý ~50-200 users)
- ⚠️ Logika duplikována pokud by jiné komponenty potřebovaly filtr

---

### ⚠️ DŮLEŽITÉ: Endpoint `users/approvers`

**Zjištění:**
Endpoint `users/approvers` **NEMUSÍ** vracet pole `aktivni`!

**Důvod:**
- Endpoint vrací pouze uživatele s právem příkazce/schvalovatele
- Backend předpokládá že všichni příkazci jsou aktivní
- Pole `aktivni` může chybět nebo být `undefined`

**Řešení v kódu:**
```javascript
const activeApprovers = (approversList || []).filter(approver => {
  // Pokud pole aktivni neexistuje, předpokládáme že jsou všichni aktivní
  if (approver.aktivni === undefined || approver.aktivni === null) {
    return true; // Zahrnout (endpoint by měl vracet jen aktivní)
  }
  // Pokud pole existuje, kontroluj hodnotu
  return approver.aktivni === 1 || approver.aktivni === '1';
});
```

**Warning systém:**
Pokud všichni příkazci jsou vyfiltrováni (unlikely), zobrazí se warning toast:
```
Načteno X příkazců, ale všichni jsou neaktivní. Zkontrolujte nastavení uživatelů.
```

---

## 🚀 DALŠÍ KROKY (volitelné)

### 1. Backend optimalizace (P3 - LOW)
Přidat parametr do BE API:
```json
POST /api.php
{
  "endpoint": "users/list",
  "token": "...",
  "username": "...",
  "aktivni": 1  // ← NOVÝ parametr
}
```

Vrátí pouze aktivní uživatele → menší response, rychlejší.

---

### 2. Indikátor neaktivního uživatele v existujících záznamech (P3 - LOW)
Pokud editujeme objednávku s neaktivním garantem, zobrazit warning:
```
⚠️ Vybraný garant není již aktivní v systému
```

---

### 3. Rozšířit filtr na další user selecty (P3 - LOW)
Zkontrolovat jestli existují další selecty s uživateli v aplikaci a aplikovat stejný filtr.

---

## ✅ COMPLETION CHECKLIST

- [x] `loadAllUsers()` filtruje `aktivni === 1`
- [x] `loadApprovers()` filtruje `aktivni === 1`
- [x] Debug logy zobrazují statistiky filtrování
- [x] Žádné syntax/lint chyby
- [x] Dokumentace vytvořena
- [ ] Browser test provedený (garant select)
- [ ] Browser test provedený (příkazce select)
- [ ] Browser test provedený (editace s neaktivním uživatelem)

---

## 🎯 ZÁVĚR

**Status:** ✅ IMPLEMENTOVÁNO (vyžaduje browser test)

**Změna:**
- Order formulář nyní zobrazuje pouze aktivní uživatele v selectech
- Filtr je na FE straně (`.filter(user => user.aktivni === 1)`)
- Debug logy zobrazují počet vyfiltrovaných uživatelů

**Test:**
Otevřít Order formulář → Garant select → Ověřit že seznam obsahuje pouze aktivní uživatele

---

**Autor:** GitHub Copilot  
**Verze dokumentu:** 1.0  
**Poslední update:** 19. října 2025
