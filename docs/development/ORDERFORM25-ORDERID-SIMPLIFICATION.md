# OrderForm25 - Zjednodušení orderID logiky

**Datum**: 10.12.2025  
**Cíl**: Redukce 4 ID variant na 2 esenciální

---

## 🔍 Současný stav

### ID Varianty (4×):
1. **`editOrderId`** - ID z URL/metadata pro otevření objednávky
2. **`savedOrderId`** - ID uložené objednávky (state)
3. **`sourceOrderIdForUnlock`** - ID pro unlock při cancel (state)
4. **unlockOrderIdRef`** - Ref kopie pro cleanup (useRef)

### Problémy:
- ❌ `savedOrderId` je **redundantní** s `formData.id`
- ❌ `sourceOrderIdForUnlock` je **redundantní** s `savedOrderId`
- ❌ `unlockOrderIdRef` je **zbytečná** kopie
- ❌ 3× useEffect synchronizace mezi těmito hodnotami
- ❌ Složitá logika: `sourceOrderIdForUnlock || savedOrderId || formData.id`

---

## ✅ Cílový stav (Zjednodušený)

### ID Varianty (2×):
1. **`editOrderId`** - ID z URL/metadata (read-only, computed)
   - Zdroj: `urlParams.get('edit') || draftManager.getMetadata().editOrderId`
   - Účel: Routing, načtení objednávky při mount
   
2. **`formData.id`** - ID objednávky v DB (state v formData)
   - Zdroj: Backend API po CREATE/UPDATE
   - Účel: Identifikace uložené objednávky, isNewOrder, unlock

### Přínos:
- ✅ **-2 state proměnné** (savedOrderId, sourceOrderIdForUnlock)
- ✅ **-1 useRef** (unlockOrderIdRef)
- ✅ **-3 useEffect** synchronizace
- ✅ **Jednodušší logika**: `formData.id` je single source of truth
- ✅ **Méně bug-prone**: Žádná synchronizace mezi duplikáty

---

## 🔧 Migrace

### Krok 1: Odstranit `savedOrderId` state
```javascript
// ❌ BEFORE
const [savedOrderId, setSavedOrderId] = useState(null);
const isNewOrder = useMemo(() => !formData.id && !savedOrderId, [formData.id, savedOrderId]);

// ✅ AFTER
const isNewOrder = useMemo(() => !formData.id, [formData.id]);
```

### Krok 2: Nahradit všechny `savedOrderId` za `formData.id`
- `setSavedOrderId(id)` → přímo nastavit `formData.id`
- `savedOrderId || formData.id` → pouze `formData.id`
- unlock logika: `formData.id` místo `savedOrderId`

### Krok 3: Odstranit `sourceOrderIdForUnlock` state
```javascript
// ❌ BEFORE
const [sourceOrderIdForUnlock, setSourceOrderIdForUnlock] = useState(null);
const unlockId = sourceOrderIdForUnlock || savedOrderId;

// ✅ AFTER
const unlockId = formData.id; // Jednoduše!
```

### Krok 4: Odstranit `unlockOrderIdRef` useRef
```javascript
// ❌ BEFORE
const unlockOrderIdRef = useRef(null);
useEffect(() => {
  unlockOrderIdRef.current = sourceOrderIdForUnlock || savedOrderId;
}, [sourceOrderIdForUnlock, savedOrderId]);

// ✅ AFTER
// Žádný useRef, žádný useEffect - použij přímo formData.id
```

---

## ⚠️ Rizika a kontrolní body

### 1. Externí odkazy (Orders25List, notifications)
- **Kontrola**: Všechny odkazy používají `?edit={id}` parametr
- **Řešení**: `editOrderId` zůstává beze změny → **BEZ DOPADU**

### 2. Draft persistence
- **Kontrola**: DraftManager ukládá `savedOrderId` do metadata
- **Řešení**: Změnit na `formData.id` v metadata
- **Dopad**: **MINIMÁLNÍ** - jen změna klíče v metadata

### 3. Unlock logika
- **Kontrola**: Unlock při cancel/close používá `unlockOrderIdRef.current`
- **Řešení**: Použít `formData.id` přímo
- **Dopad**: **BEZ DOPADU** - stejné ID, jen jiná cesta

### 4. isNewOrder detection
- **Kontrola**: `!formData.id && !savedOrderId`
- **Řešení**: `!formData.id` (jednodušší!)
- **Dopad**: **BEZ DOPADU** - logika zůstává stejná

---

## 📝 Implementační plán

### Sprint 2.5 (15 minut, LOW RISK)
1. ✅ Odstranit `savedOrderId` state a všechny `setSavedOrderId()` cally
2. ✅ Nahradit `savedOrderId` za `formData.id` (find & replace)
3. ✅ Odstranit `sourceOrderIdForUnlock` state a setter
4. ✅ Odstranit `unlockOrderIdRef` useRef a synchronizační useEffect
5. ✅ Aktualizovat unlock logiku na `formData.id`
6. ✅ Aktualizovat draftManager metadata na `formData.id`
7. ✅ Git commit

### Testování:
- [ ] Otevřít objednávku z Orders25List (?edit=123) ✅
- [ ] Vytvořit novou objednávku ✅
- [ ] Uložit objednávku → zkontrolovat formData.id ✅
- [ ] Refresh stránky → objednávka se načte ✅
- [ ] Cancel → unlock proběhne správně ✅

---

## 📊 Metriky

### Redukce složitosti:
- **-3 state proměnné** (savedOrderId, sourceOrderIdForUnlock, unlockOrderIdRef)
- **-4 useEffect** (synchronizace ID)
- **~30 řádků kódu** odstraněno
- **Cykl odmatická složitost**: 4 → 2 (50% redukce)

### Zlepšení čitelnosti:
- Single source of truth: `formData.id`
- Žádná synchronizace mezi duplikáty
- Jasná role: `editOrderId` (input), `formData.id` (state)
