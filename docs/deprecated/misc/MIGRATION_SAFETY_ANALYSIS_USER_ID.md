# 🛡️ ANALÝZA BEZPEČNOSTI: Migrace user_id pojmenování

**Datum:** 7. ledna 2026  
**Účel:** Vyhodnocení rizik a návrh bezpečného přístupu k refaktoringu  
**Status:** ⚠️ VYSOKÉ RIZIKO - DOPORUČENA POSTUPNÁ MIGRACE

---

## 🎯 EXECUTIVE SUMMARY

**Tvoje obavy jsou zcela oprávněné!** Přímý refaktoring by byl **velmi riskantní**. Našel jsem však **bezpečnou cestu** s minimálním rizikem.

### Klíčová zjištění:

✅ **DOBRÉ ZPRÁVY:**
- AuthContext je SINGLE SOURCE OF TRUTH (user_id)
- Backend používá konzistentně `$user_id` parametry
- Existují fallbacky na kritických místech
- LocalStorage klíče jsou izolovány per-user

⚠️ **RIZIKA:**
- 200+ míst ve FE používá `user_id` z AuthContext
- 50+ míst používá `userId` v props/parametrech
- 30+ míst má fallback chains (`user.id || user.user_id || user.uzivatel_id`)
- DB konzistentně používá `uzivatel_id` (nelze měnit)

🎯 **DOPORUČENÍ:**
- ❌ NEDĚLAT breaking changes v AuthContext
- ✅ VYTVOŘIT normalizační vrstvu (mapper)
- ✅ POSTUPNÁ migrace bez přerušení provozu
- ✅ Zachovat zpětnou kompatibilitu po dobu 6 měsíců

---

## 📊 DETAILNÍ ANALÝZA KRITICKÝCH MÍST

### 1. **AuthContext.js** (⚠️ NEJVYŠŠÍ PRIORITA)

**Současný stav:**
```javascript
// ✅ SINGLE SOURCE OF TRUTH
const [user_id, setUserId] = useState(null);

// Export:
return { user_id, ...rest };
```

**Riziko změny:** 🔴 **KRITICKÉ**
- 200+ komponent čte `user_id` z AuthContext
- Breaking change by rozbil celou aplikaci okamžitě
- Nelze provést atomic change (příliš mnoho míst)

**Bezpečné řešení:**
```javascript
// ✅ SAFE: Přidat alias, zachovat user_id
const [user_id, setUserId] = useState(null);

// Export BOTH (zpětná kompatibilita)
return { 
  user_id,      // ✅ Legacy - zachovat
  userId: user_id, // ✅ NEW - alias
  ...rest 
};
```

---

### 2. **API Volání** (⚠️ VYSOKÁ PRIORITA)

**Zjištěné vzory:**

#### A) Frontend → Backend payload
```javascript
// ✅ KONZISTENTNÍ: FE posílá user_id
fetch('/api/orders/create', {
  body: JSON.stringify({
    user_id: user_id,  // ← snake_case
    ...orderData
  })
})
```

#### B) Backend očekávání
```php
// ✅ KONZISTENTNÍ: BE očekává user_id
$user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
```

#### C) DB queries
```php
// ✅ KONZISTENTNÍ: DB používá uzivatel_id
WHERE o.uzivatel_id = ?
```

**Riziko změny:** 🟡 **STŘEDNÍ**
- Většina API volání je konzistentní
- Backend parsing je robustní (isset checks)
- Problém: Při změně FE musíme měnit i BE

**Bezpečné řešení:** ✅ **MAPPING LAYER**
```javascript
// services/apiMapper.js
export const toBackendFormat = (data) => ({
  user_id: data.userId || data.user_id, // ✅ Fallback
  ...data
});
```

---

### 3. **LocalStorage Keys** (🟢 NÍZKÉ RIZIKO)

**Současný stav:**
```javascript
// ✅ KONZISTENTNÍ vzor
`orderDraft_${user_id}`
`invoiceForm_${user_id}`
`orders25_filters_state_${user_id || 'guest'}`
```

**Riziko změny:** 🟢 **NÍZKÉ**
- Klíče jsou per-user izolované
- Změna nevyžaduje migraci (stačí nové klíče)
- Staré klíče se časem vyčistí samy

**Bezpečné řešení:**
```javascript
// ✅ Helper funkce
const getUserStorageKey = (base) => {
  const uid = userId || user_id; // ✅ Fallback
  return `${base}_${uid || 'anon'}`;
};
```

---

### 4. **Fallback Chains** (⚠️ PROBLÉMOVÁ OBLAST)

**Zjištěné pattterny:**

```javascript
// ❌ ANTI-PATTERN: 25+ míst
const userId = user.id || user.user_id || user.uzivatel_id;
const garantId = garant.id || garant.user_id || garant.uzivatel_id;
```

**Proč vznikly:**
- Různé API verze vracejí různé názvy
- Obranný programming (defensive)
- Kopírování existujících vzorů

**Riziko:** 🟡 **STŘEDNÍ**
- Složité debugování
- Performance overhead
- Skrývají reálné problémy

**Bezpečné řešení:**
```javascript
// ✅ CENTRALIZED normalizace
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
```

---

## 🚨 KRITICKÁ MÍSTA (Business Impact)

### 🔴 TIER 1: NESMÍ SELHAT (autentizace, autorizace)

#### 1. **Login Flow**
```javascript
// AuthContext.js login()
const loginData = await loginApi2(username, password);
setUserId(loginData.id); // ← KRITICKÉ

// ✅ IMPACT: Selhání = nikdo se nemůže přihlásit
```

**Test scenario:**
```javascript
// MUST PASS:
1. Přihlásit se jako běžný user
2. Zkontrolovat user_id v AuthContext
3. Ověřit, že Orders25List vidí správná data
```

#### 2. **Permissions Check**
```javascript
// Všude v aplikaci:
hasPermission(permissionCode, userId)

// ✅ IMPACT: Selhání = špatná autorizace (security risk!)
```

---

### 🟡 TIER 2: VYSOKÝ IMPACT (data loss risk)

#### 3. **Order Creation**
```javascript
// OrderForm25.js
const payload = {
  user_id: user_id,        // ← Kdo vytváří
  uzivatel_id: objednatelId || user_id, // ← Objednatel
  garant_uzivatel_id: garantId
};
```

**Test scenario:**
```javascript
// MUST PASS:
1. Vytvořit novou objednávku
2. Zkontrolovat v DB: uzivatel_id = správný user
3. Ověřit, že se objednávka zobrazí v seznamu
```

#### 4. **Invoice Assignment**
```javascript
// InvoiceEvidencePage.js
const invoicePayload = {
  user_id: user_id, // ← Kdo přiřazuje fakturu
  vytvoril_uzivatel_id: user_id
};
```

---

### 🟢 TIER 3: STŘEDNÍ IMPACT (UX issues, non-critical)

#### 5. **Draft Management**
```javascript
// DraftManager.js
const draftKey = `orderDraft_${user_id}`;
localStorage.setItem(draftKey, JSON.stringify(draft));
```

**Impact:** Ztráta draftu - uživatel může ručně obnovit data

#### 6. **Filter State**
```javascript
// Orders25List.js
const filterKey = `orders25_filters_state_${user_id || 'guest'}`;
```

**Impact:** Resetnutí filtrů - mírná nepříjemnost

---

## 🛡️ BEZPEČNÁ STRATEGIE MIGRACE

### FÁZE 0: PŘÍPRAVA (1-2 dny, 0% riziko)

#### 1. Vytvoř normalizační vrstvu
```javascript
// services/userIdMapper.js

/**
 * Normalizuje user ID z různých zdrojů na number
 * @param {*} userOrId - User object, ID, nebo undefined
 * @returns {number|null}
 */
export const normalizeUserId = (userOrId) => {
  // Null/undefined
  if (userOrId == null) return null;
  
  // Already a number
  if (typeof userOrId === 'number') return userOrId;
  
  // String number
  if (typeof userOrId === 'string') {
    const parsed = parseInt(userOrId, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  // Object - try all possible keys
  if (typeof userOrId === 'object') {
    return userOrId.id || 
           userOrId.user_id || 
           userOrId.userId || 
           userOrId.uzivatel_id || 
           null;
  }
  
  return null;
};

/**
 * Získá user ID z AuthContext s fallbackem
 */
export const getUserIdFromContext = (authContext) => {
  return normalizeUserId(authContext.user_id || authContext.userId);
};

/**
 * Vytvoří LocalStorage klíč s user ID
 */
export const createUserStorageKey = (baseKey, userId) => {
  const normalizedId = normalizeUserId(userId);
  return `${baseKey}_${normalizedId || 'anon'}`;
};

/**
 * Převede FE data do BE formátu (user_id → user_id)
 */
export const prepareForBackend = (data) => {
  const { userId, user_id, ...rest } = data;
  return {
    ...rest,
    user_id: normalizeUserId(userId || user_id)
  };
};

/**
 * Převede BE data do FE formátu (zpětná kompatibilita)
 */
export const prepareFromBackend = (data) => {
  return {
    ...data,
    userId: normalizeUserId(data.user_id || data.uzivatel_id),
    user_id: normalizeUserId(data.user_id || data.uzivatel_id) // ✅ Keep both
  };
};
```

#### 2. Unit testy
```javascript
// services/__tests__/userIdMapper.test.js

describe('userIdMapper', () => {
  describe('normalizeUserId', () => {
    it('should handle number input', () => {
      expect(normalizeUserId(123)).toBe(123);
    });

    it('should handle string input', () => {
      expect(normalizeUserId('123')).toBe(123);
      expect(normalizeUserId('abc')).toBe(null);
    });

    it('should handle object with id', () => {
      expect(normalizeUserId({ id: 123 })).toBe(123);
    });

    it('should handle object with user_id', () => {
      expect(normalizeUserId({ user_id: 123 })).toBe(123);
    });

    it('should handle object with userId', () => {
      expect(normalizeUserId({ userId: 123 })).toBe(123);
    });

    it('should handle object with uzivatel_id', () => {
      expect(normalizeUserId({ uzivatel_id: 123 })).toBe(123);
    });

    it('should prioritize id over others', () => {
      expect(normalizeUserId({ 
        id: 123, 
        user_id: 456 
      })).toBe(123);
    });

    it('should handle null/undefined', () => {
      expect(normalizeUserId(null)).toBe(null);
      expect(normalizeUserId(undefined)).toBe(null);
    });
  });
});
```

---

### FÁZE 1: AUTHCONTEXT ALIAS (1 den, 5% riziko)

```javascript
// context/AuthContext.js

// ✅ ZACHOVAT user_id state
const [user_id, setUserId] = useState(null);

// ✅ PŘIDAT computed userId alias
const userId = user_id; // Simple alias, no re-render

// ✅ Export BOTH
return {
  user_id,      // ✅ Legacy - MUST keep
  userId,       // ✅ New - alias
  setUserId,    // ✅ Keep original setter
  ...rest
};
```

**Testing:**
```bash
# ✅ Regression test
npm test -- AuthContext
npm run build
# ✅ Manual test: Login a zkontrolovat Orders25List
```

**Rollback plan:**
```javascript
// Jen odeber userId z exportu - zero impact
return { user_id, ...rest };
```

---

### FÁZE 2: POSTUPNÁ MIGRACE KOMPONENT (2-4 týdny, 10% riziko)

**Priorita komponent:**

#### Week 1: Non-critical utility komponenty
```javascript
// components/ModernHelper.js
// PŘED:
const { user_id } = useContext(AuthContext);

// PO:
const { userId } = useContext(AuthContext);
// ✅ user_id stále funguje (backward compatible)
```

**Test:** ModernHelper, TemplateDropdown, ContactManagement

#### Week 2: Medium-impact pages
```javascript
// pages/ReportsPage.js
// pages/StatisticsPage.js
// pages/ProfilePage.js
```

**Test:** Generate report, view stats, edit profile

#### Week 3: Critical pages (s extra opatrností)
```javascript
// pages/Orders25List.js
// PŘED:
const { user_id } = useContext(AuthContext);

// PO:
const { userId } = useContext(AuthContext);

// ⚠️ KRITICKÉ: Důkladné testování!
```

**Rozsáhlé testy:**
- Login → List orders → Create order → Edit order → Delete order
- Zkontrolovat permissions (ORDER_READ_OWN vs ORDER_READ_ALL)
- Draft save/load
- Filter state persistence

#### Week 4: Super-critical pages
```javascript
// pages/InvoiceEvidencePage.js
// forms/OrderForm25.js
```

---

### FÁZE 3: REPLACE FALLBACK CHAINS (1 týden, 15% riziko)

```javascript
// PŘED:
const userId = user.id || user.user_id || user.uzivatel_id;

// PO:
import { normalizeUserId } from './services/userIdMapper';
const userId = normalizeUserId(user);

// ✅ Benefit: Centralized logic, easier to debug
```

**Migrace po částech:**
- Day 1: Orders25List.js (5 fallbacks)
- Day 2: InvoiceEvidencePage.js (3 fallbacks)
- Day 3: Ostatní komponenty (17 fallbacks)

---

### FÁZE 4: CLEANUP (1 týden, 20% riziko)

```javascript
// ⚠️ POUZE PO 3 MĚSÍCÍCH STABILNÍHO PROVOZU!

// context/AuthContext.js
// Odstranit user_id alias (keep only userId)

// ❌ PŘED:
return { user_id, userId, ...rest };

// ✅ PO:
return { userId, ...rest };
```

**Migration notice v kódu:**
```javascript
// ⚠️ DEPRECATED: use 'userId' instead
// Will be removed in v2.1.0 (Q2 2026)
const { user_id } = useContext(AuthContext);
```

---

## 📋 TESTING CHECKLIST

### Pre-Migration Tests (must pass)
```
□ Login as admin → Orders list loads
□ Login as user → Orders list shows only own orders
□ Create new order → uzivatel_id correct in DB
□ Edit order → permissions check works
□ Create invoice → vytvoril_uzivatel_id correct
□ Save draft → localStorage key correct
□ Logout → AuthContext clears properly
```

### Post-Migration Tests (after each phase)
```
□ All pre-migration tests still pass
□ No console errors
□ LocalStorage keys format correct
□ API payloads contain user_id
□ Permissions still work
□ Multi-tab sync still works
```

### Critical Regression Tests
```
□ User A can't see User B's orders (unless admin)
□ Garant receives notification (hierarchy)
□ LP calculation includes correct user_id
□ Cashbook assignments work
□ Order locking works (zamek_uzivatel_id)
```

---

## 🎓 LESSONS LEARNED & PREVENTION

### Co způsobilo nekonzistenci:

1. **Chybějící naming convention dokument**
   - ✅ FIX: Vytvoř `NAMING_CONVENTIONS.md`

2. **Různí vývojáři + různé konvence**
   - ✅ FIX: Code review checklist

3. **Kopírování existujících vzorů**
   - ✅ FIX: ESLint rules

4. **AI asistent multiplikoval špatné vzory**
   - ✅ FIX: Guidelines pro AI

### Preventivní opatření:

```javascript
// .eslintrc.js
rules: {
  'camelcase': ['error', {
    properties: 'never',
    allow: ['^user_id$', '^uzivatel_id$'] // Only in API layer
  }],
  
  // Custom rule: enforce AuthContext naming
  'no-restricted-syntax': [
    'error',
    {
      selector: 'MemberExpression[object.name="useContext"][property.name="user_id"]',
      message: 'Use "userId" from AuthContext instead of deprecated "user_id"'
    }
  ]
}
```

---

## 🚀 DOPORUČENÝ TIMELINE

### Scénář A: BEZPEČNÝ (doporučeno)

```
Week 1-2:  FÁZE 0 - Příprava (mapper, testy)
           Risk: 0% | Effort: 2 dny
           
Week 3:    FÁZE 1 - AuthContext alias
           Risk: 5% | Effort: 1 den
           Status: ✅ Backward compatible
           
Week 4-7:  FÁZE 2 - Postupná migrace komponent
           Risk: 10% | Effort: 2-4 týdny
           Status: ⚠️ Důkladné testování každé komponenty
           
Week 8:    FÁZE 3 - Replace fallback chains
           Risk: 15% | Effort: 1 týden
           Status: ⚠️ Centralizace logiky
           
Q2 2026:   FÁZE 4 - Cleanup (odstranit user_id)
           Risk: 20% | Effort: 1 týden
           Status: ⚠️ POUZE po 3 měsících stable provozu
```

**TOTAL: 8 týdnů + 3 měsíce stabilizace**

---

### Scénář B: AGRESIVNÍ (NEdoporučeno)

```
Week 1:    Breaking change v AuthContext
           Risk: 🔴 95% | Effort: 1 den
           Impact: 🔴 Aplikace nefunguje!
           
Week 2-4:  Emergency fixes
           Risk: 🔴 90% | Effort: 3 týdny
           Impact: 🔴 Production outage
```

**❌ NEDOPORUČUJI! Příliš riskantní.**

---

## 💰 COST-BENEFIT ANALÝZA

### BENEFITS (po dokončení migrace):

✅ Lepší maintainability (odhadovaná úspora: 20% času na debugging)  
✅ Jednodušší onboarding nových vývojářů  
✅ Snížení chybovosti (odstranění fallback hell)  
✅ Modernější kód (camelCase konzistence)  
✅ Lepší TypeScript readiness  

**ROI:** Vysoký (po 6 měsících se vyplatí)

---

### COSTS:

⏰ **Effort:** 8 týdnů development + 3 měsíce stabilizace  
💰 **Risk:** Střední (5-20% risk per fázi)  
🧪 **Testing:** Rozsáhlé QA testing po každé fázi  
📚 **Documentation:** Aktualizace všech dokumentů  

**Total cost:** ~50-60 developer days

---

## 🎯 FINÁLNÍ DOPORUČENÍ

### ✅ CO DĚLAT:

1. **HNED:**
   - Vytvoř `services/userIdMapper.js` s normalizační logikou
   - Napiš unit testy
   - Přidej alias `userId` do AuthContext (zpětná kompatibilita)

2. **TENTO MĚSÍC:**
   - Migruj non-critical komponenty
   - Důkladné testování

3. **Q1 2026:**
   - Postupná migrace všech komponent
   - Replace fallback chains
   - Rozsáhlé regression testing

4. **Q2 2026:**
   - Cleanup (odstranit user_id) - POUZE pokud je vše stabilní

---

### ❌ CO NEDĚLAT:

- ❌ Breaking change v AuthContext bez přechodového období
- ❌ Měnit všechny komponenty najednou
- ❌ Migrovat bez unit testů
- ❌ Odstranit user_id před stabilizací
- ❌ Měnit API payload formát (user_id → userId) - backend by selhal

---

## 📊 RISK MATRIX

| Fáze | Risk | Impact | Mitigation |
|------|------|--------|------------|
| Příprava (mapper) | 🟢 LOW | 🟢 LOW | Unit testy |
| AuthContext alias | 🟢 LOW | 🟡 MEDIUM | Backward compatible |
| Migrate components | 🟡 MEDIUM | 🟡 MEDIUM | Postupně, testovat každou |
| Replace fallbacks | 🟡 MEDIUM | 🟡 MEDIUM | Centralizace, regression tests |
| Cleanup (remove user_id) | 🟠 HIGH | 🟠 HIGH | Pouze po 3 měsících stable |

---

## 🔍 MONITORING & ROLLBACK

### Co sledovat po každé fázi:

```javascript
// Error tracking
if (userId == null && process.env.NODE_ENV === 'production') {
  Sentry.captureMessage('userId is null in AuthContext', {
    level: 'error',
    extra: { authContext }
  });
}

// Analytics
if (typeof window !== 'undefined') {
  window.dataLayer.push({
    event: 'auth_userId_usage',
    userId: normalizeUserId(userId),
    source: 'AuthContext'
  });
}
```

### Rollback plán:

**FÁZE 1-2:** Easy rollback (jen revert commit)  
**FÁZE 3:** Medium rollback (restore fallback chains)  
**FÁZE 4:** Hard rollback (restore user_id everywhere)

---

## ✅ ZÁVĚR

### Tvoje obavy jsou oprávněné!

Přímý refaktoring by byl **velmi riskantní**. Našel jsem ale **bezpečnou cestu**:

1. ✅ **Vytvoř normalizační vrstvu** (0% risk)
2. ✅ **Přidej alias do AuthContext** (5% risk, backward compatible)
3. ✅ **Postupná migrace** (10-15% risk, testovat každou komponentu)
4. ✅ **Cleanup až po stabilizaci** (20% risk, ale s fallback možností)

### Timeline:
- **SAFE:** 8 týdnů + 3 měsíce stabilizace
- **BENEFIT:** Významné zlepšení maintainability
- **RISK:** Střední (kontrolovatelné s dobrým testováním)

### Next Steps:
1. Review tento dokument s týmem
2. Schválení management (50-60 developer days)
3. Start s FÁZE 0 (příprava)
4. Postupná implementace

---

**Status:** ✅ READY FOR REVIEW  
**Reviewer:** Development Team Lead  
**Decision needed by:** Q1 2026 kickoff
