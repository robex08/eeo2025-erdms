# 📊 REPORT: Nekonzistence v pojmenování uživatelských ID

**Datum:** 7. ledna 2026  
**Autor:** Analýza kódové báze eeo2025-erdms  
**Rozsah:** Frontend (React), Backend (PHP), Databáze (MySQL)

---

## 🎯 EXECUTIVE SUMMARY

V aplikaci existuje **závažná nekonzistence** v pojmenování identifikátoru uživatele napříč všemi vrstvami aplikace. Používají se **4 různé varianty**:

1. **`user_id`** - JavaScript/camelCase konvence (FE)
2. **`userId`** - JavaScript/camelCase konvence (FE)  
3. **`uzivatel_id`** - České pojmenování snake_case (DB/BE)
4. **`uzivatele_id`** - Gramaticky nesprávná plurálová forma

**Dopad:**
- ⚠️ Zvýšená chybovost při překladu mezi vrstvami
- ⚠️ Nutnost fallbackových řetězců (`user.id || user.user_id || user.uzivatel_id`)
- ⚠️ Obtížné debugování a údržba kódu
- ⚠️ Potenciální bezpečnostní rizika (neošetřené edge cases)

---

## 📈 STATISTIKA VÝSKYTŮ

### Frontend (React/JavaScript)

| Varianta | Počet výskytů | Primární použití |
|----------|---------------|------------------|
| `user_id` | **200+** | AuthContext, LocalStorage keys, API volání |
| `userId` | **50+** | Utility funkce, React props, parametry |
| `uzivatel_id` | **30+** | Data z DB/API, fallbacky |
| Kombinace fallbacků | **25+** | `user.id \|\| user.user_id \|\| user.uzivatel_id` |

**Příklady z kódu:**

```javascript
// AuthContext.js - používá user_id
const [user_id, setUserId] = useState(null);

// Orders25List.js - používá všechny 3 varianty!
const userId = user.id || user.uzivatel_id || user.user_id;
const currentUserId = useMemo(() => parseInt(user_id, 10), [user_id]);

// userStorage.js - fallback chain
const dataOwnerId = parsed.__draftOwner || parsed.user_id || parsed.userId || parsed.uzivatel_id;
```

### Backend (PHP)

| Varianta | Počet výskytů | Primární použití |
|----------|---------------|------------------|
| `user_id` | **100+** | API endpointy, parametry requestů |
| `uzivatel_id` | **200+** | Práce s DB, FK vztahy |
| `userId` | **30+** | camelCase v service vrstvě |

**Příklady z kódu:**

```php
// api.php - smíchané konvence
$user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
$requesting_user_id = isset($input['requesting_user_id']) ? (int)$input['requesting_user_id'] : null;

// SQL query - české pojmenování
WHERE o.uzivatel_id = ?
JOIN 25_uzivatele u ON k.uzivatel_id = u.id

// CashbookService.php - camelCase
public function createEntry($bookId, $data, $userId) {
```

### Databáze (MySQL)

| Tabulka | Název sloupce | Význam |
|---------|---------------|---------|
| `25_uzivatele` | `id` | Primární klíč |
| `25a_objednavky` | `uzivatel_id` | FK - kdo vytvořil |
| `25a_objednavky` | `garant_uzivatel_id` | FK - garant |
| `25a_objednavky` | `zamek_uzivatel_id` | FK - kdo zamkl |
| `25a_faktury` | `vytvoril_uzivatel_id` | FK - kdo vytvořil |
| `25a_faktury` | `aktualizoval_uzivatel_id` | FK - kdo aktualizoval |
| `25_pokladni_knihy` | `uzivatel_id` | FK - vlastník knihy |
| `25a_objednavky_prilohy` | `nahrano_uzivatel_id` | FK - kdo nahrál |

**Pozorování:**
- ✅ DB používá **konzistentně** `uzivatel_id` (česká konvence)
- ✅ Všechny FK mají suffix `_uzivatel_id` nebo `_user_id`
- ❌ Různé tabulky používají různé prefixy (`vytvoril_`, `aktualizoval_`, `nahrano_`, `zamek_`)

---

## 🔍 JAK K TOMU DOŠLO?

### 1. **Historický vývoj aplikace**

```
2020-2022: Starý systém (PHP)
  └─ České pojmenování: uzivatel_id, uzivatele
  
2023: Migrace na React/API separaci
  └─ FE programátor: JavaScript camelCase konvence
  └─ BE programátor: Zachování české DB konvence
  └─ ❌ Chybějící naming standard
  
2024-2025: Rozšiřování funkcí
  └─ Různí vývojáři + AI asistence
  └─ ❌ Kopírování existujících patterns (dobré i špatné)
  └─ ❌ Absence code review na naming
```

### 2. **Technické příčiny**

#### A) **Absence naming convention dokumentu**
- Žádný projekt nemá jasně definovaný naming standard
- Vývojáři se řídí "co vidím v okolním kódu"
- AI asistent kopíruje existující vzory

#### B) **JavaScript vs PHP konvence**
```javascript
// JavaScript Best Practice
const userId = 123;  // camelCase ✅

// PHP Best Practice  
$user_id = 123;  // snake_case ✅

// Ale při API komunikaci:
fetch('/api/orders', {
  body: JSON.stringify({ user_id: 123 })  // ❓ Která konvence?
})
```

#### C) **DB vs Frontend mapping**
```sql
-- Databáze (česky)
SELECT uzivatel_id FROM 25a_objednavky;

-- API Response (mixed)
{
  "uzivatel_id": 123,  // z DB
  "user_id": 123       // z logiky
}

-- Frontend State (anglicky)
const [user_id, setUserId] = useState(null);
```

### 3. **Propagace nekonzistence**

1. **První vývojář** napsal:
   ```javascript
   const { user_id } = useContext(AuthContext);
   ```

2. **Druhý vývojář** zkopíroval pattern, ale viděl i jinou část s `userId`:
   ```javascript
   const getUserKey = (baseKey) => `${baseKey}_user_${userId}`;
   ```

3. **AI asistent** (já) konzistentně kopíruje existující vzory:
   ```javascript
   // Vidím v OrderForm25.js: user_id
   // → Používám user_id
   
   // Vidím v utilech: userId
   // → Používám userId
   ```

4. **Výsledek**: Gradující nekonzistence

---

## 🗺️ MAPA VÝSKYTŮ V APLIKACI

### 1. **AuthContext.js** (❗ KRITICKÉ - zdroj pravdy)
```javascript
✅ Primární zdroj: user_id
const [user_id, setUserId] = useState(null);

❌ Problem: FE komponenty očekávají různé názvy
```

### 2. **API Endpoints (FE → BE)**

| Endpoint | Očekává (Request) | Vrací (Response) |
|----------|-------------------|------------------|
| `/api/login` | `username, password` | `id, user_id, token` ⚠️ |
| `/api/orders/create` | `user_id, uzivatel_id` | `uzivatel_id` |
| `/api/orders/list` | `userId` ⚠️ | `uzivatel_id` |
| `/api/invoices/create` | `user_id` | `vytvoril_uzivatel_id` |
| `/api/cashbook/create` | `userId` ⚠️ | `uzivatel_id` |
| `/api/lp/detail` | `user_id` | `user_id` (agregovaná tabulka) ⚠️ |

### 3. **LocalStorage Keys**
```javascript
// user_id dominuje
`orderDraft_${user_id}`
`invoiceForm_${user_id}`
`cashbookFilters_${user_id}`
`orders25_filters_state_${user_id || 'guest'}`

// Ale také:
const getUserKey = (baseKey) => `${baseKey}_user_${currentUserId}`;
```

### 4. **Utility Functions**

```javascript
// userStorage.js - všechny 4 varianty!
const dataOwnerId = parsed.__draftOwner || 
                    parsed.user_id || 
                    parsed.userId || 
                    parsed.uzivatel_id;

// textHelpers.js
export const getUserDisplayName = (userId, enrichedUser, usersMap) => {
  // userId ✅ parametr
  // user_id ✅ v usersMap
}

// workflowUtils.js
export const getFieldEditability = (
  workflowCode, 
  userPermissions, 
  currentUserId,  // ✅ camelCase
  orderAuthorId   // ✅ camelCase
) => {}
```

### 5. **Component Props**

```javascript
// Různé komponenty očekávají různé názvy:

<UserContextMenu 
  userId={user.id || user.username}  // ✅ camelCase
/>

<OrderForm25 
  user_id={user_id}  // ❌ snake_case
  uzivatel_id={formData.uzivatel_id}  // ❌ české
/>
```

---

## 💔 PROBLÉMY KTERÉ TO ZPŮSOBUJE

### 1. **Fallback Hell**
```javascript
// 25+ míst v kódu!
const userId = user.id || user.user_id || user.uzivatel_id;
const objednatelId = objednatelId.id || objednatelId.user_id || objednatelId.uzivatel_id;
const garantUserId = garantUserId.id || garantUserId.user_id || garantUserId.uzivatel_id;
```

**Důsledky:**
- Složité debugování ("která varianta se použila?")
- Performance overhead (3x kontrola)
- Potenciální chyby při null/undefined

### 2. **API Request/Response Mismatch**
```javascript
// Frontend posílá:
fetch('/api/lp/detail', {
  body: JSON.stringify({
    user_id: 123,      // ✅
    requesting_user_id: 456  // ❓ jiný pattern
  })
})

// Backend očekává:
$user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
$requesting_user_id = isset($input['requesting_user_id']) ? (int)$input['requesting_user_id'] : null;

// Ale DB query používá:
WHERE uzivatel_id = ?
```

### 3. **Parsing & Type Confusion**
```javascript
// String vs Number
const currentUserId = parseInt(user_id, 10);  // musíme parsovat

// Objekt vs Number
if (typeof garantUserId === 'object' && garantUserId !== null) {
  garantUserId = garantUserId.id || garantUserId.user_id || garantUserId.uzivatel_id;
}
```

### 4. **Údržba & Refaktoring**
```javascript
// Developer chce přejmenovat user_id na userId
// → Musí změnit 200+ míst
// → Riziko Breaking Changes v API
// → Migrace LocalStorage dat
```

---

## 🏗️ ARCHITEKTONICKÉ ŘEŠENÍ

### ✅ **Doporučená standardizace**

#### 1. **Definovat Naming Convention**

```markdown
# EEO2025 Naming Convention

## User Identifier

### Frontend (JavaScript/React)
- **State variable**: `userId` (camelCase)
- **Context**: `userId` (camelCase)
- **Props**: `userId` (camelCase)
- **LocalStorage keys**: `*_user_${userId}` (snake_case pro klíče)

### Backend (PHP)
- **Function parameters**: `$userId` (camelCase pro business logiku)
- **Database queries**: `uzivatel_id` (snake_case jako v DB)

### API Layer
- **Request/Response**: `user_id` (snake_case pro JSON)
- **Důvod**: Kompatibilita s DB schématem

### Database
- **Column names**: `uzivatel_id` (snake_case, české)
- **Foreign keys**: `*_uzivatel_id` (konzistentní suffix)
```

#### 2. **Mapping Layer** (KRITICKÉ!)

```javascript
// services/apiMapper.js

/**
 * Normalizuje user identifier z různých zdrojů
 */
export const normalizeUserId = (userOrId) => {
  if (typeof userOrId === 'number') return userOrId;
  if (typeof userOrId === 'string') return parseInt(userOrId, 10);
  if (typeof userOrId === 'object' && userOrId !== null) {
    return userOrId.id || 
           userOrId.user_id || 
           userOrId.userId || 
           userOrId.uzivatel_id || 
           null;
  }
  return null;
};

/**
 * Převede FE data na BE format (pre-API)
 */
export const toBackendFormat = (frontendData) => {
  return {
    user_id: normalizeUserId(frontendData.userId),
    // další pole...
  };
};

/**
 * Převede BE data na FE format (post-API)
 */
export const toFrontendFormat = (backendData) => {
  return {
    userId: normalizeUserId(backendData.user_id || backendData.uzivatel_id),
    // další pole...
  };
};
```

#### 3. **TypeScript Definitions** (doporučeno pro budoucnost)

```typescript
// types/user.ts

/**
 * User ID - ALWAYS number in memory
 */
type UserId = number;

/**
 * User object from API (backend format)
 */
interface UserApiResponse {
  id: UserId;
  user_id?: UserId;  // deprecated, use 'id'
  uzivatel_id?: UserId;  // deprecated, use 'id'
  username: string;
  // ...
}

/**
 * User object in Frontend state (normalized)
 */
interface UserFrontend {
  userId: UserId;  // ✅ STANDARD
  username: string;
  // ...
}
```

#### 4. **ESLint Rule** (pro budoucnost)

```javascript
// .eslintrc.js

rules: {
  // Zakázat snake_case v FE kódu (kromě API calls)
  'camelcase': ['error', {
    properties: 'never',
    ignoreDestructuring: true,
    allow: ['^user_id$', '^uzivatel_id$']  // jen v API vrstvě
  }]
}
```

---

## 🚀 MIGRACE PLÁN

### FÁZE 1: Dokumentace a Audit (✅ HOTOVO - tento report)
- [x] Analýza současného stavu
- [x] Identifikace všech výskytů
- [x] Definice standardu

### FÁZE 2: Příprava (1-2 dny)
- [ ] Vytvořit `apiMapper.js` s normalizačními funkcemi
- [ ] Přidat unit testy pro mapping
- [ ] Vytvořit TypeScript definitions (optional)

### FÁZE 3: AuthContext Normalizace (1 den)
```javascript
// AuthContext.js - změnit:
const [user_id, setUserId] = useState(null);

// NA:
const [userId, setUserId] = useState(null);

// ✅ Breaking change - ale je to zdroj pravdy!
```

### FÁZE 4: Component Refactoring (3-5 dnů)
```javascript
// Postupná změna všech komponent:
// OrderForm25.js, Orders25List.js, InvoiceEvidencePage.js, atd.

// PŘED:
const { user_id } = useContext(AuthContext);

// PO:
const { userId } = useContext(AuthContext);
```

### FÁZE 5: API Layer Standardizace (2-3 dny)
```javascript
// Všechny API volání použijí mapper:

// services/ordersApi.js
import { toBackendFormat, toFrontendFormat } from './apiMapper';

export const createOrder = async (orderData, token, userId) => {
  const payload = toBackendFormat({ ...orderData, userId });
  const response = await fetch('/api/orders/create', {
    body: JSON.stringify(payload)
  });
  return toFrontendFormat(await response.json());
};
```

### FÁZE 6: Backend Alignment (2-3 dny)
```php
// Standardizovat backend parametry:

// handlers.php
function createOrder($db, $data, $userId) {  // ✅ camelCase
  // ale SQL query používá DB konvenci:
  $stmt = $db->prepare("
    INSERT INTO 25a_objednavky (uzivatel_id, predmet)  -- ✅ snake_case
    VALUES (?, ?)
  ");
  $stmt->execute([$userId, $data['predmet']]);
}
```

### FÁZE 7: Testing & Rollout (2-3 dny)
- [ ] Unit testy pro všechny normalizační funkce
- [ ] Integration testy pro API volání
- [ ] Manuální QA testing kritických flow
- [ ] Monitoring errorů po nasazení

---

## 📊 EFFORT ESTIMATION

| Fáze | Effort | Risk | Priority |
|------|--------|------|----------|
| 1. Dokumentace | ✅ DONE | LOW | ✅ DONE |
| 2. Příprava | 2 dny | LOW | HIGH |
| 3. AuthContext | 1 den | **HIGH** ⚠️ | **CRITICAL** |
| 4. Components | 5 dnů | MEDIUM | HIGH |
| 5. API Layer | 3 dny | MEDIUM | HIGH |
| 6. Backend | 3 dny | LOW | MEDIUM |
| 7. Testing | 3 dny | LOW | HIGH |
| **TOTAL** | **~17 dní** | | |

**Alternativa: Postupná migrace bez breaking changes**
- Zachovat `user_id` v AuthContext
- Přidat `userId` jako alias
- Postupně měnit komponenty
- **Effort:** +5 dnů (22 dnů celkem)
- **Risk:** LOWER ✅
- **Recommended:** ✅ PRO

---

## 🎓 LESSONS LEARNED

### Co se povedlo:
✅ DB konzistence - všechny tabulky používají `uzivatel_id`  
✅ AuthContext jako single source of truth  
✅ Fallbacky zajistily funkčnost i přes nekonzistenci  

### Co se nepovedlo:
❌ Absence naming convention dokumentu  
❌ Žádná code review na naming  
❌ Kopírování špatných vzorů  
❌ AI asistent multiplikoval existující vzory (dobré i špatné)  

### Jak zabránit opakování:
1. **Dokumentovat naming conventions** před začátkem vývoje
2. **Code review checklist** - kontrola naming
3. **ESLint pravidla** pro vynucení konvencí
4. **TypeScript** - silná typová kontrola
5. **AI asistent guidelines** - jasné instrukce pro naming

---

## 📌 DOPORUČENÍ PRO DALŠÍ VÝVOJ

### Priorita 1: OKAMŽITĚ
- ✅ **Tento report** - pochopit problém
- [ ] **Naming convention dokument** - definovat standard
- [ ] **apiMapper.js** - vytvořit normalizační vrstvu

### Priorita 2: TENTO MĚSÍC
- [ ] **AuthContext standardizace** - zdroj pravdy
- [ ] **Critical components** - OrderForm25, Orders25List
- [ ] **Unit tests** - mapping layer

### Priorita 3: Q1 2026
- [ ] **Všechny komponenty** - postupná migrace
- [ ] **Backend alignment** - standardní naming
- [ ] **TypeScript migration** - silná typová kontrola

### Priorita 4: Q2 2026
- [ ] **ESLint rules** - automatická kontrola
- [ ] **Documentation update** - API docs s naming
- [ ] **Training** - team guidelines

---

## 🔗 SOUVISEJÍCÍ DOKUMENTY

- `BUILD.md` - build process
- `DEPLOYMENT_GUIDE_*.md` - deployment guides
- `ANALYSIS_*.md` - různé analýzy systému

---

## 📝 ZÁVĚR

Nekonzistence v pojmenování `user_id` / `userId` / `uzivatel_id` je **závažný technický dluh** způsobený:

1. ❌ Chybějící naming convention
2. ❌ Smíšení JavaScriptových a PHP konvencí
3. ❌ Absence code review na naming
4. ❌ Kopírování existujících vzorů bez kontroly

**Dopad:** Zvýšená složitost kódu, obtížná údržba, potenciální chyby.

**Řešení:** Postupná standardizace s mapping layer a jasná naming convention.

**Timeline:** 17-22 dní effort, doporučeno rozložit do Q1 2026.

**ROI:** Významné snížení chybovosti, lepší maintainability, jednodušší onboarding nových vývojářů.

---

**Status:** ✅ ANALYSIS COMPLETE  
**Next Action:** Vytvoření `NAMING_CONVENTION.md` a `apiMapper.js`  
**Owner:** Development Team  
**Review Date:** Q1 2026  

