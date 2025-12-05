# 🔧 Oprava mapování ID na názvy - Souhrn změn

## 📋 Problém
Funkce `resolveIdToName` v NotesPanel nekázala správně mapovat ID na názvy pro:
- Příkazce PO (`prikazce_id`, `po_kod`, `po`)
- Garant (`garant_uzivatel_id`, `guarantUserId`)
- Střediska (`strediska`, `center`)

## ✅ Implementované opravy

### 1. **Rozšíření cache klíčů pro PO mapování**
```javascript
// PŘED
const cacheKeys = ['cached_approvers', 'approvers_cache', 'po_options'];

// PO
const cacheKeys = [
  'cached_approvers', 'approvers_cache', 'po_options', 
  'cached_users', 'users_cache', 'userCache',
  'po_approvers', 'approvers'
];
```

### 2. **Zlepšené vyhledávání v cache objektech**
```javascript
// Přidáno vyhledávání pro objekty i pole
if (Array.isArray(data)) {
  found = data.find(item => 
    String(item.id) === String(value) || 
    String(item.value) === String(value) ||
    String(item.code) === String(value) ||
    String(item.kod) === String(value) ||
    String(item.po_kod) === String(value) ||
    String(item.prikazce_id) === String(value) ||
    item === value
  );
} else if (typeof data === 'object' && data[value]) {
  found = data[value];
}
```

### 3. **Rozšíření fallback map pro PO**
```javascript
const poCodeMap = { 
  'EN': 'Jan Černohorský (EN)', 
  'PTU': 'PTU - Provoz technických účast.', 
  'IT': 'IT - Informační technologie', 
  'PN': 'PN - Poskytování náhradních',
  '3': 'Příkazce č. 3',
  '1': 'Middle střediska'
};
```

### 4. **Rozšíření cache klíčů pro garant mapování**
```javascript
const cacheKeys = [
  'cached_garants', 'garants_cache', 'userCache', 'users_cache', 
  'cached_users', 'cached_approvers', 'approvers_cache',
  'garant_options', 'guarantors'
];
```

### 5. **Zlepšené sestavování jmen pro garanti**
```javascript
// Zkusíme různé kombinace jméno/příjmení
let name = found.label || found.name || found.nazev;

if (!name && (found.jmeno || found.prijmeni)) {
  name = `${found.jmeno || ''} ${found.prijmeni || ''}`.trim();
}

if (!name && (found.firstName || found.lastName)) {
  name = `${found.firstName || ''} ${found.lastName || ''}`.trim();
}
```

### 6. **Rozšíření cache klíčů pro střediska**
```javascript
const centersCacheKeys = [
  'cached_centers', 'locations_cache', 'centers_cache',
  'center_options', 'strediska_cache', 'cached_locations'
];
```

### 7. **Rozšíření fallback map pro střediska**
```javascript
const centerMap = {
  'Kladno': 'Kladno - ZZS SK',
  'Kolín': 'Kolín - ZZS SK', 
  'Beroun': 'Beroun - ZZS SK',
  'Příbram': 'Příbram - ZZS SK',
  'Kutná Hora': 'Kutná Hora - ZZS SK',
  // Možné kódy středisek
  'KL': 'Kladno (KL)',
  'KO': 'Kolín (KO)',
  'BE': 'Beroun (BE)',
  'PR': 'Příbram (PR)',
  'KH': 'Kutná Hora (KH)',
  '1': 'Middle střediska (1)'
};
```

### 8. **Přidání debug logování**
- Každé mapování nyní loguje průběh do konzole
- Zobrazuje které cache klíče se našly
- Ukazuje proces hledání a fallback mapování
- Usnadňuje diagnostiku problémů

## 🧪 Testování

### Pro testování v browser konzoli:
1. Načtěte soubor `debug-browser-mapping.js` v konzoli
2. Spusťte `debugFormMapping()` pro analýzu cache
3. Načtěte soubor `test-id-mapping-fix.js` v konzoli  
4. Spusťte `runFullIdMappingTest()` pro kompletní test

### Pro testování exportu:
1. Otevřete NotesPanel
2. Klikněte na ikonu 📋 (Export formuláře)
3. Sledujte console logy pro debug informace
4. Ověřte, že se zobrazují názvy místo ID

## 🎯 Očekávané výsledky

**PŘED opravou:**
```
Příkazce PO: EN
Garant: 1  
Střediska: Kladno, 1
```

**PO opravě:**
```
Příkazce PO: Jan Černohorský (EN)
Garant: Karel Novák (1)
Střediska: Kladno - ZZS SK (Kladno), Middle střediska (1)
```

## 🔄 Další kroky

1. **Testování v reálné aplikaci** - Ověření funkčnosti s reálnými daty
2. **Optimalizace cache klíčů** - Na základě skutečné struktury dat
3. **Rozšíření fallback map** - Přidání více známých hodnot
4. **Error handling** - Lepší zpracování chyb při načítání cache

## 💡 Tip pro debugging

Pokud mapování stále nefunguje, zkontrolujte v browser konzoli:
```javascript
// Zkontrolujte dostupné cache klíče
Object.keys(localStorage).filter(k => k.includes('cache') || k.includes('cached'))

// Zkontrolujte strukturu konkrétního cache
JSON.parse(localStorage.getItem('cached_approvers'))

// Zkontrolujte formData strukturu
JSON.parse(localStorage.getItem('order_draft_' + userId))
```