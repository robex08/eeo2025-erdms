# Test filtrů a localStorage - Orders V3

## 🧪 Test uložení filtrů do localStorage

### 1. Otevři konzoli prohlížeče (F12)

### 2. Test nastavení filtrů

```javascript
// Zkontroluj aktuální stav localStorage
console.log('📦 Current filters:', JSON.parse(localStorage.getItem('ordersV3_columnFilters_1')));

// Nastav testovací filtry přes UI:
// - Vyber nějaké objednatele (multi-select)
// - Vyber některé stavy (multi-select)
// - Nastav datum Od/Do
// - Nastav cenové rozmezí
// - Zaškrtni checkboxy (Registry status, Mimořádné události)

// Po změně zkontroluj localStorage:
setTimeout(() => {
  const savedFilters = JSON.parse(localStorage.getItem('ordersV3_columnFilters_1'));
  console.log('💾 Saved filters:', savedFilters);
  
  // Ověř všechny typy:
  console.log('✅ Multi-select (objednatel):', savedFilters.objednatel);
  console.log('✅ Multi-select (stav):', savedFilters.stav);
  console.log('✅ Date range:', { from: savedFilters.dateFrom, to: savedFilters.dateTo });
  console.log('✅ Price range:', { from: savedFilters.amountFrom, to: savedFilters.amountTo });
  console.log('✅ Checkboxy:', { 
    maBytZverejneno: savedFilters.maBytZverejneno,
    byloZverejneno: savedFilters.byloZverejneno,
    mimoradneObjednavky: savedFilters.mimoradneObjednavky
  });
}, 1000);
```

### 3. Test reload stránky (F5)

```javascript
// Po reloadu zkontroluj, že se filtry obnovily:
const savedFilters = JSON.parse(localStorage.getItem('ordersV3_columnFilters_1'));
console.log('🔄 Filters po reloadu:', savedFilters);

// Ověř, že UI zobrazuje správné hodnoty
```

### 4. Test vymazání filtrů

```javascript
// Před kliknutím na "Vymazat filtry":
console.log('📦 Před vymazáním:', JSON.parse(localStorage.getItem('ordersV3_columnFilters_1')));

// Klikni na tlačítko "Vymazat filtry" v UI

// Zkontroluj po vymazání:
setTimeout(() => {
  const cleared = localStorage.getItem('ordersV3_columnFilters_1');
  console.log('🧹 Po vymazání:', cleared);
  
  if (cleared === null) {
    console.log('✅ LocalStorage správně vymazán!');
  } else {
    console.error('❌ LocalStorage nebyl vymazán!', JSON.parse(cleared));
  }
}, 500);
```

### 5. Automatický test

```javascript
// Spusť kompletní test:
(async function testFilters() {
  console.log('🧪 Začínám test filtrů...\n');
  
  // 1. Vymaž localStorage
  localStorage.removeItem('ordersV3_columnFilters_1');
  console.log('1️⃣ LocalStorage vymazán');
  
  // 2. Nastav testovací filtry (simulace)
  const testFilters = {
    objednatel: ['1', '2'],
    garant: ['3'],
    prikazce: [],
    schvalovatel: ['4', '5'],
    stav: ['NOVA', 'SCHVALENA'],
    dateFrom: '2026-01-01',
    dateTo: '2026-12-31',
    amountFrom: 1000,
    amountTo: 50000,
    maBytZverejneno: true,
    byloZverejneno: false,
    mimoradneObjednavky: true
  };
  
  localStorage.setItem('ordersV3_columnFilters_1', JSON.stringify(testFilters));
  console.log('2️⃣ Testovací filtry nastaveny:', testFilters);
  
  // 3. Načti zpět
  await new Promise(resolve => setTimeout(resolve, 100));
  const loaded = JSON.parse(localStorage.getItem('ordersV3_columnFilters_1'));
  console.log('3️⃣ Načteno z localStorage:', loaded);
  
  // 4. Ověř integrity
  const isValid = 
    Array.isArray(loaded.objednatel) && loaded.objednatel.length === 2 &&
    Array.isArray(loaded.stav) && loaded.stav.length === 2 &&
    loaded.dateFrom === '2026-01-01' &&
    loaded.amountFrom === 1000 &&
    loaded.maBytZverejneno === true &&
    loaded.mimoradneObjednavky === true;
  
  if (isValid) {
    console.log('✅ Test úspěšný! Všechny filtry správně uloženy a načteny.\n');
  } else {
    console.error('❌ Test selhal! Některé filtry nejsou správné.\n');
  }
  
  // 5. Vyčisti
  localStorage.removeItem('ordersV3_columnFilters_1');
  console.log('5️⃣ Test dokončen, localStorage vyčištěn.');
})();
```

## 📋 Checklist funkcionality

Po spuštění testů ověř:

- [ ] **Multi-select pole** se ukládají jako pole ID (objednatel, garant, prikazce, schvalovatel, stav)
- [ ] **Date range** se ukládá (dateFrom, dateTo)
- [ ] **Price range** se ukládá (amountFrom, amountTo)
- [ ] **Boolean checkboxy** se ukládají (maBytZverejneno, byloZverejneno, mimoradneObjednavky)
- [ ] Po **reloadu (F5)** se všechny filtry obnoví
- [ ] Tlačítko **"Vymazat filtry"** vymaže:
  - [ ] Sloupcové filtry (panel)
  - [ ] Dashboard filtry (dlaždice)
  - [ ] LocalStorage klíč `ordersV3_columnFilters_{userId}`
  - [ ] Reset na první stránku
- [ ] Po **hard reloadu (Ctrl+Shift+R)** se zobrazí inicializační overlay a pak fade-in

## 🐛 Známé problémy a jejich řešení

### Problém: Filtry se neukládají po změně
**Řešení:** Zkontroluj, že `userId` je definováno v useEffect:
```javascript
useEffect(() => {
  if (userId && columnFilters) {
    localStorage.setItem(`ordersV3_columnFilters_${userId}`, JSON.stringify(columnFilters));
  }
}, [userId, columnFilters]);
```

### Problém: Vymazání filtrů nemaže localStorage
**Řešení:** Zkontroluj, že `handleClearFilters` obsahuje:
```javascript
if (userId) {
  localStorage.removeItem(`ordersV3_columnFilters_${userId}`);
}
```

### Problém: Po reloadu se některé filtry neobnoví
**Řešení:** Zkontroluj inicializaci `columnFilters` statu:
```javascript
const [columnFilters, setColumnFilters] = useState(() => {
  if (userId) {
    const saved = localStorage.getItem(`ordersV3_columnFilters_${userId}`);
    if (saved) return JSON.parse(saved);
  }
  return { /* výchozí hodnoty */ };
});
```
