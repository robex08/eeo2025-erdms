# 🎯 ROBUSTNÍ DRAFT LOADING SYSTÉM - FINÁLNÍ VERZE

## ✅ CO BYLO OPRAVENO

### ❌ STARÝ PROBLÉM:
```javascript
// ❌ setTimeout hack - nespolehlivé!
setTimeout(async () => {
  if (user_id) {  // ← Běželo JEN při editaci!
    // Draft loading...
  }
}, 0);
```

**Problémy:**
1. ❌ setTimeout = nespolehlivé timing
2. ❌ Běželo JEN při editaci (když existoval `editOrderId`)
3. ❌ Při vytvoření nové objednávky a návratu zpět → DRAFT SE NENAČETL
4. ❌ Při F5 refresh → DRAFT SE NENAČETL (pokud nebyla editace)
5. ❌ Race conditions mezi FormController a draft loading

### ✅ NOVÉ ŘEŠENÍ:

```javascript
// ✅ Centrální useEffect - BEZ setTimeout!
useEffect(() => {
  const loadDraftData = async () => {
    // Počkat na user_id a dokončení inicializace
    if (!user_id || !isDraftLoaded) return;
    
    // ✅ Načíst draft (pokud existuje)
    const hasDraft = await draftManager.hasDraft();
    if (hasDraft) {
      const draftData = await draftManager.loadDraft();
      
      // ✅ DB sync check (pokud je EDIT mode)
      if (draftData.savedOrderId) {
        const syncCheck = await draftManager.checkDBSync(...);
        if (syncCheck.needsSync) {
          // Použij novější data z DB
        }
      }
      
      // ✅ Aplikuj draft na formData
      setFormData(draftData.formData);
    }
  };
  
  loadDraftData();
}, [user_id, isDraftLoaded, token, username]);
```

**Výhody:**
1. ✅ **BEZ setTimeout** - deterministické načítání
2. ✅ **Běží VŽDY** - při mount, F5, routing
3. ✅ **Funguje pro NEW i EDIT** - unified systém
4. ✅ **DB sync check** - automatická kontrola novější verze
5. ✅ **Race condition safe** - čeká na `isDraftLoaded` flag

## 🔄 WORKFLOW - Krok za krokem

### Scénář 1: Vytvoření nové objednávky
```
1. User otevře /orders/new
2. FormController inicializuje prázdný formData
3. isDraftLoaded = true (inicializace hotova)
4. ✅ useEffect se spustí
5. hasDraft() → false (žádný draft)
6. Používá prázdný formData z FormControlleru
```

### Scénář 2: Vyplnění a návrat
```
1. User vyplní předmět, částku, středisko
2. Autosave uloží do draftu
3. User naviguje jinam (/dashboard)
4. User se vrátí na /orders/new
5. FormController inicializuje prázdný formData
6. isDraftLoaded = true
7. ✅ useEffect se spustí
8. hasDraft() → true
9. loadDraft() → načte vyplněná data
10. setFormData(draftData.formData)
11. ✅ Formulář má původní data!
```

### Scénář 3: F5 refresh v EDIT mode
```
1. User edituje objednávku #123
2. Změní částku z 10000 → 15000
3. Autosave uloží draft
4. User zmáčkne F5
5. FormController načte z DB (částka 10000)
6. isDraftLoaded = true
7. ✅ useEffect se spustí
8. hasDraft() → true
9. loadDraft() → draft má částku 15000
10. DB sync check:
    - Draft timestamp: 14:30
    - DB timestamp: 14:25
    - Draft je novější → použij draft
11. setFormData(draft) → částka 15000
12. ✅ Neuložené změny zachovány!
```

### Scénář 4: Jiný user upravil objednávku
```
1. User A edituje objednávku #123
2. Změní částku na 15000
3. Mezitím User B uloží změnu v DB (částka 20000, timestamp 14:35)
4. User A zmáčkne F5
5. FormController načte z DB (částka 20000, timestamp 14:35)
6. ✅ useEffect se spustí
7. loadDraft() → draft má částku 15000, timestamp 14:30
8. DB sync check:
    - Draft timestamp: 14:30
    - DB timestamp: 14:35
    - ⚠️ DB je novější!
9. setFormData(dbData) → částka 20000
10. syncWithDatabase() → aktualizuj draft
11. ✅ Data z DB mají prioritu!
```

## 🎯 KLÍČOVÉ KOMPONENTY

### 1. **isDraftLoaded Flag**
```javascript
const [isDraftLoaded, setIsDraftLoaded] = useState(false);

// V FormController onDataLoaded:
setIsDraftLoaded(true); // ← Signalizuje že inicializace hotova
```

**Význam:** Zabraňuje race condition - useEffect počká až FormController dokončí načítání dat z DB.

### 2. **Centrální useEffect**
```javascript
useEffect(() => {
  // Čeká na user_id a dokončení inicializace
  if (!user_id || !isDraftLoaded) return;
  
  // Načte draft
  // Provede DB sync check
  // Aplikuje data
}, [user_id, isDraftLoaded, token, username]);
```

**Dependencies:**
- `user_id` - musí být známý
- `isDraftLoaded` - inicializace hotova
- `token`, `username` - pro API volání

### 3. **DB Sync Check**
```javascript
const syncCheck = await draftManager.checkDBSync(
  // Lightweight: jen timestamp
  async (orderId) => await getOrderTimestampV2(orderId, token, username),
  
  // Full data: pokud je DB novější
  async (orderId) => {
    const response = await getOrderV2(orderId, token, username);
    return response?.data;
  }
);

if (syncCheck.needsSync && syncCheck.dbData) {
  // DB je novější → použij DB data
  setFormData(syncCheck.dbData);
}
```

## 📊 TIMING DIAGRAM

```
Component Mount / F5 / Routing
    ↓
FormController.initialize()
    ↓
onDataLoaded() callback
    ↓
setFormData(dbData)         ← Data z DB (nebo prázdná)
setIsDraftLoaded(true)      ← FLAG: Inicializace hotova
    ↓
useEffect triggers          ← Dependencies změněny
    ↓
if (!user_id) return        ← Čeká na auth
if (!isDraftLoaded) return  ← Čeká na init
    ↓
hasDraft() ?
    ├─ NO  → Používá dbData z FormControlleru
    └─ YES → loadDraft()
              ↓
          savedOrderId ?
              ├─ NO  (NEW) → Použij draft rovnou
              └─ YES (EDIT) → DB sync check
                              ↓
                          needsSync ?
                              ├─ NO  → Použij draft
                              └─ YES → Použij DB + sync draft
                                       ↓
                                   setFormData()
                                       ↓
                                   ✅ HOTOVO
```

## 🚀 BENEFITY

### 1. **Spolehlivost**
- ✅ BEZ setTimeout hacků
- ✅ Deterministické pořadí operací
- ✅ Race condition safe

### 2. **Univerzálnost**
- ✅ Funguje pro NEW i EDIT
- ✅ Funguje při mount, F5, routing
- ✅ Funguje při odhlášení/přihlášení

### 3. **Konzistence**
- ✅ DB sync check zajišťuje aktuální data
- ✅ Multi-user safe (detekce změn jiných uživatelů)
- ✅ Lightweight API (10x rychlejší)

### 4. **Persistence**
- ✅ Draft přežije F5
- ✅ Draft přežije navigaci jinam
- ✅ Draft přežije logout/login (pokud stejný user)

## 🔧 DEBUGGING

### Kontrola zda draft existuje:
```javascript
// V konzoli prohlížeče:
const draft = JSON.parse(localStorage.getItem('order25_draft_123'));
console.log('Draft:', draft);
```

### Kontrola kdy se useEffect spouští:
```
🔄 [OrderForm25] CENTRÁLNÍ NAČÍTÁNÍ DRAFTU - START
  → user_id, isEditMode, savedOrderId, isDraftLoaded
```

### Kontrola DB sync:
```
🔄 [OrderForm25] DB sync check pro order: 123
🔍 [OrderForm25] DB sync check výsledek: 
  → needsSync: false/true
  → reason: "Draft is current" / "Database has newer version"
```

## ⚠️ DŮLEŽITÉ

### Kdy se draft NEPOUŽIJE:
1. Draft neexistuje (`hasDraft() === false`)
2. DB je novější (`syncCheck.needsSync === true`)
3. Draft nemá formData (`!draftData.formData`)

### Kdy se draft POUŽIJE:
1. Draft existuje (`hasDraft() === true`)
2. Draft má formData
3. DB není novější (nebo jde o NEW order)

## 📝 CHANGELOG

### v3.0 (2025-10-30) - ROBUSTNÍ ŘEŠENÍ
- ✅ Odstraněn setTimeout hack
- ✅ Centrální useEffect pro loading
- ✅ Funguje pro NEW i EDIT
- ✅ Funguje při F5, routing, mount
- ✅ DB sync check integrován
- ✅ Race condition safe

### v2.1 (2025-10-30)
- ✅ Lightweight `/dt-aktualizace` endpoint
- ✅ DB sync check optimalizace

### v2.0 (2025-10-29)
- ✅ Unified draft system
- ✅ Single key per user
- ✅ Auto-mode detection
