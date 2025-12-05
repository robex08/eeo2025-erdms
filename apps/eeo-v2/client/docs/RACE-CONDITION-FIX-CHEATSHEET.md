# 🎯 Race Condition Fix - Quick Reference (Cheat Sheet)

## Problem
```javascript
// ❌ BAD: Data load before dictionaries
useEffect(() => {
  loadData(); // Runs immediately
}, []);

useEffect(() => {
  loadDictionaries(); // Also runs immediately
}, []);

// Result: Data arrives with categoryId=5, but categories=[] 
// → <select> is empty!
```

## Solution Pattern (Copy & Paste Ready)

### Step 1: Add States
```javascript
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
```

### Step 2: Add Promise Refs
```javascript
const dictionariesReadyPromiseRef = useRef(null);
const dictionariesReadyResolveRef = useRef(null);

useEffect(() => {
  dictionariesReadyPromiseRef.current = new Promise((resolve) => {
    dictionariesReadyResolveRef.current = resolve;
  });
}, []);
```

### Step 3: Load Dictionaries FIRST
```javascript
useEffect(() => {
  const loadDictionaries = async () => {
    setIsLoadingCiselniky(true);
    try {
      const data = await fetchDictionaries();
      setDictionaries(data);
      setIsLoadingCiselniky(false);
      dictionariesReadyResolveRef.current?.(true); // ✅ RESOLVE!
    } catch (error) {
      setIsLoadingCiselniky(false);
      dictionariesReadyResolveRef.current?.(false);
    }
  };
  loadDictionaries();
}, []);
```

### Step 4: Load Data AFTER (with await)
```javascript
useEffect(() => {
  const loadData = async () => {
    await dictionariesReadyPromiseRef.current; // ⏳ WAIT HERE!
    setIsLoadingFormData(true);
    try {
      const data = await fetchData();
      setFormData(data); // ✅ Dictionaries are ready!
      setIsLoadingFormData(false);
    } catch (error) {
      setIsLoadingFormData(false);
    }
  };
  if (dataId) loadData();
}, [dataId]);
```

### Step 5: Loading Gate
```javascript
const isFormLoading = useMemo(() => {
  if (isLoadingCiselniky) return true;
  if (isEditMode && isLoadingFormData) return true;
  return false;
}, [isLoadingCiselniky, isEditMode, isLoadingFormData]);

if (isFormLoading) {
  return <Spinner message="Loading..." />;
}

return <Form />; // ✅ Data is GUARANTEED to be ready!
```

## Timeline Comparison

### ❌ Before (Race Condition)
```
0ms   ├─ Start dictionaries
      ├─ Start data
100ms ├─ Data loaded → setFormData({ cityId: 5 })
      │  Render: <select value={5}> options={[]} ❌ EMPTY!
500ms ├─ Dictionaries loaded → setDictionaries([...])
      │  <select value={5}> options={[...]} ❌ STILL EMPTY!
```

### ✅ After (Fixed)
```
0ms   ├─ Start dictionaries
      │  🚫 Data loading is BLOCKED (await)
500ms ├─ Dictionaries loaded ✅
      │  Promise.resolve() → Data loading UNBLOCKED
550ms ├─ Start data
650ms ├─ Data loaded → setFormData({ cityId: 5 })
      │  Render: <select value={5}> options={[...]} ✅ CORRECT!
```

## Key Points

✅ **ALWAYS load dictionaries FIRST**  
✅ **Use Promise to BLOCK data loading**  
✅ **Set loading states at right moments**  
✅ **Loading Gate prevents premature render**  
✅ **useMemo for Loading Gate optimization**  

## Common Mistakes

❌ **Forget to await Promise**
```javascript
// BAD: No await → race condition still exists!
const loadData = async () => {
  setIsLoadingFormData(true);
  // Missing: await dictionariesReadyPromiseRef.current;
  const data = await fetchData();
};
```

❌ **Forget to resolve Promise**
```javascript
// BAD: Promise never resolves → infinite loading!
const loadDictionaries = async () => {
  const data = await fetchDictionaries();
  setIsLoadingCiselniky(false);
  // Missing: dictionariesReadyResolveRef.current?.(true);
};
```

❌ **Wrong Loading Gate condition**
```javascript
// BAD: Always shows loading for new forms!
const isFormLoading = isLoadingCiselniky || isLoadingFormData;

// GOOD: Check edit mode
const isFormLoading = isLoadingCiselniky || (isEditMode && isLoadingFormData);
```

## Testing Checklist

- [ ] New form: dictionaries load, then empty form renders
- [ ] Edit form: dictionaries load, then data loads, then form with filled selects
- [ ] Slow network (Slow 3G): selects are filled correctly after loading
- [ ] Fast network: no flicker, smooth transition from loading to form
- [ ] Error handling: errors don't cause infinite loading

## Copy-Paste Template

```javascript
function MyForm({ itemId }) {
  // 1. States
  const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  
  // 2. Promise
  const dictionariesReadyPromiseRef = useRef(null);
  const dictionariesReadyResolveRef = useRef(null);
  useEffect(() => {
    dictionariesReadyPromiseRef.current = new Promise((resolve) => {
      dictionariesReadyResolveRef.current = resolve;
    });
  }, []);
  
  // 3. Load Dictionaries
  useEffect(() => {
    const load = async () => {
      setIsLoadingCiselniky(true);
      try {
        const data = await fetchDictionaries();
        setDictionaries(data);
        setIsLoadingCiselniky(false);
        dictionariesReadyResolveRef.current?.(true);
      } catch (error) {
        setIsLoadingCiselniky(false);
        dictionariesReadyResolveRef.current?.(false);
      }
    };
    load();
  }, []);
  
  // 4. Load Data
  useEffect(() => {
    const load = async () => {
      await dictionariesReadyPromiseRef.current;
      setIsLoadingFormData(true);
      try {
        const data = await fetchData(itemId);
        setFormData(data);
        setIsLoadingFormData(false);
      } catch (error) {
        setIsLoadingFormData(false);
      }
    };
    if (itemId) load();
  }, [itemId]);
  
  // 5. Loading Gate
  const isFormLoading = useMemo(() => {
    if (isLoadingCiselniky) return true;
    if (itemId && isLoadingFormData) return true;
    return false;
  }, [isLoadingCiselniky, itemId, isLoadingFormData]);
  
  if (isFormLoading) return <Spinner />;
  return <Form />;
}
```

---

**Remember:** Dictionaries FIRST, Data SECOND, Render LAST!
