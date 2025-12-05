# 🔒 SECURITY FIX: Background Task User Filtering
**Datum:** 4. listopadu 2025  
**Priorita:** 🔴 **VYSOKÁ** - Critical Security Issue  
**Soubor:** `src/services/backgroundTasks.js`

---

## 🚨 KRITICKÝ SECURITY BUG

### Popis problému
Background task pro automatické obnovení objednávek (každých 10 minut) používal **STAROU API funkci** `getOrdersList25()`, která **NEFILTROVALA podle uživatelských práv**.

### Důsledek
- ✅ **Normální F5 reload** → Správně filtrované objednávky (jen ty na které má uživatel právo)
- ❌ **Background refresh** → VŠECHNY objednávky (včetně těch, na které uživatel NEMÁ právo)

### Bezpečnostní riziko
**Omezený uživatel** (bez práva `ORDER_READ_ALL`) viděl po background refreshi **VŠECHNY objednávky v systému**, včetně:
- Objednávek jiných oddělení
- Citlivých dat jiných uživatelů
- Objednávek mimo jeho kompetence

---

## ✅ ŘEŠENÍ

### Změna API volání

**PŘED (NESPRÁVNĚ):**
```javascript
import { getOrdersList25 } from './api25orders';

// ...

const response = await getOrdersList25({ 
  token, 
  username: user.username,
  filters: {} // ❌ Tato stará API funkce NEFUNGUJE správně s právy!
});
```

**PO (SPRÁVNĚ):**
```javascript
import { listOrdersV2 } from './apiOrderV2';

// ...

// ✅ Použití STEJNÉHO API jako při normálním F5 reloadu
const apiResult = await listOrdersV2(
  {}, // Prázdné filtry - backend si vše vyřeší sám podle tokenu
  token,
  user.username,
  true, // returnFullResponse=true pro získání meta dat
  true  // enriched=true pro kompletní data (stejně jako při F5)
);

const response = apiResult?.data || [];
```

---

## 🔐 Jak funguje backend filtrování

### Order V2 API Endpoint
`/order-v2/list-enriched`

### Automatické WHERE klauzule podle tokenu

Backend **AUTOMATICKY** aplikuje WHERE klauzuli podle oprávnění uživatele v tokenu:

#### 1. **Admin / ORDER_MANAGE**
```sql
-- Vidí VŠECHNY objednávky (žádné WHERE omezení)
SELECT * FROM objednavky25;
```

#### 2. **Omezený uživatel** (např. `ORDER_READ_OWN`)
```sql
-- Vidí JEN objednávky kde má nějakou roli (12 polí!)
SELECT * FROM objednavky25
WHERE 
  uzivatel_id = :user_id                    -- autor
  OR objednatel_id = :user_id               -- objednatel
  OR garant_uzivatel_id = :user_id          -- garant
  OR schvalovatel_uzivatel_id = :user_id    -- schvalovatel
  OR prikazce_id = :user_id                 -- příkazce
  OR editor_uzivatel_id = :user_id          -- editor
  OR odesilatel_uzivatel_id = :user_id      -- odesílatel
  OR potvrzovatel_uzivatel_id = :user_id    -- potvrzovatel
  OR zverejnovatel_uzivatel_id = :user_id   -- zveřejňovatel
  OR fakturator_uzivatel_id = :user_id      -- fakturátor
  OR konatel_uzivatel_id = :user_id         -- dokončovatel
  OR kontrolor_uzivatel_id = :user_id;      -- kontrolor
```

---

## 🧪 Testování

### Test Case 1: Admin uživatel
**Před i po:**
- ✅ Vidí všechny objednávky (bez změny)

### Test Case 2: Omezený uživatel - normální F5
**Před i po:**
- ✅ Vidí jen své objednávky (fungovalo správně)

### Test Case 3: Omezený uživatel - background refresh (každých 10 min)
**Před:**
- ❌ Viděl VŠECHNY objednávky (SECURITY BUG!)

**Po:**
- ✅ Vidí jen své objednávky (OPRAVENO!)

### Test Case 4: Omezený uživatel - více rolí
**Scénář:** Uživatel je:
- Autor objednávky #101
- Garant objednávky #202
- Schvalovatel objednávky #303

**Po opravě:**
- ✅ Background refresh vrátí objednávky: #101, #202, #303
- ✅ Žádné další objednávky nejsou viditelné

---

## 📊 Dopad

| Metrika | Hodnota |
|---------|---------|
| **Postižení uživatelé** | Všichni omezení uživatelé |
| **Závažnost** | 🔴 Kritická (data leak) |
| **Trvání** | Od migrace na Order V2 API |
| **Riziko regrese** | 🟢 Nízké (použití standardní API) |

---

## 🔗 Související dokumenty

- `BACKEND-ORDER-V2-USER-ROLES-FILTER.md` - Dokumentace backend filtrování
- `BACKGROUND-RELOAD-USER-FILTER-FIX-2025-11-04.md` - Předchozí pokus o fix (neúplný)

---

## 📝 Lessons Learned

### Co se povedlo
- ✅ Rychlá identifikace root cause
- ✅ Použití stejné API jako Orders25List (konzistence)
- ✅ Minimální změna kódu (jen náhrada API funkce)

### Co zlepšit
- 🔧 **Unit testy pro background tasks** - automaticky testovat security
- 🔧 **Backend audit log** - logovat kdo vidí jaké objednávky
- 🔧 **E2E testy** - testovat background refresh s omezeným uživatelem

### Preventivní opatření
```javascript
// Budoucí improvement: Centrální API wrapper s automatickou kontrolou práv
export async function fetchOrdersWithAuth(token, username, filters = {}) {
  // Vždy použij Order V2 API
  // Nikdy nepouštěj staré API pro production data
  
  if (process.env.NODE_ENV === 'production') {
    // Force use of V2 API
    return listOrdersV2(filters, token, username, false, true);
  }
  
  // ...
}
```

---

## ✅ Status

- **Identifikováno:** ✅ Ano (4. listopadu 2025)
- **Opraveno:** ✅ Ano (commit `bbfd167`)
- **Testováno:** ⏳ Čeká na manuální test
- **Dokumentováno:** ✅ Ano
- **Deploy:** ⏳ Čeká na deploy

---

## 🚀 Deployment Checklist

### Před deploym
- [ ] Manuální test s admin účtem
- [ ] Manuální test s omezeným účtem (čekat 10 min na background refresh)
- [ ] Ověřit že omezený uživatel nevidí cizí objednávky
- [ ] Code review

### Po deployu
- [ ] Monitoring prvních 24 hodin
- [ ] Kontrola chybových logů
- [ ] Feedback od omezených uživatelů

---

**Autor:** GitHub Copilot + Developer  
**Reviewer:** TBD  
**Datum implementace:** 4. listopadu 2025  
**Commit:** `bbfd167`
