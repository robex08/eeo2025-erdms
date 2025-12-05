# Souhrn implementace editace objednávek

## Implementované funkce

### 1. Základní funkcionalita editace ✅

#### 1.1 Spuštění editace ze seznamu
- ✅ Tlačítko "Editovat" v OrdersListNew.js funguje
- ✅ Předání `orderId` do OrderFormComponent pomocí localStorage
- ✅ Načítání dat přes API `getOrderDetailApi2`

#### 1.2 Detekce editačního režimu
- ✅ `isEditMode = !!orderId` při načítání objednávky
- ✅ Automatické načtení dat při mount pokud je `orderId`

### 2. Systém oprávnění ✅

#### 2.1 Typy oprávnění
- ✅ `ORDER_EDIT_ALL` - Editace všech objednávek
- ✅ `ORDER_EDIT_OWN` - Editace vlastních objednávek  
- ✅ `ORDER_EDIT_SUBORDINATE` - Editace podřízených objednávek

#### 2.2 Logika kontroly oprávnění
- ✅ Funkce `checkOrderEditPermission()` v OrdersListNew.js
- ✅ Kontrola objednatel_id, garant_uzivatel_id, vytvoril_uzivatel_id
- ✅ UI implementace - zobrazení tlačítka "Editovat" vs "Zobrazit"

### 3. Vizuální indikátory editace ✅

#### 3.1 Záhlaví formuláře
- ✅ Žluté pozadí (`#fef3c7`) pro editační režim
- ✅ Text "Editace objednávky [číslo]" místo "Nová objednávka"
- ✅ Zobrazení skutečného evidenčního čísla objednávky

#### 3.2 Indikátor fáze workflow
```javascript
// ✅ Implementováno
const getCurrentPhase = (data) => {
  const hasBasicInfo = data.predmet && data.prikazce_id && data.stredisko;
  const hasSupplierInfo = data.dodavatel_nazev && (data.druh_objednavky || data.polozky?.length > 0);
  const isConfirmed = data.sentStatus === 'odeslano' && data.orderConfirmed;
  
  if (isConfirmed) return 3;
  if (hasSupplierInfo) return 2;
  if (hasBasicInfo) return 1;
  return 0;
};
```

### 4. Enhanced mapování dat ✅

#### 4.1 Načítání dat z DB
- ✅ Kompletní mapování všech polí z API odpovědi
- ✅ Podpora pro snake_case i camelCase názvy
- ✅ Fallback hodnoty pro chybějící data

#### 4.2 Uložení originálních dat
- ✅ `originalFormData` state pro reset funkcionalitu
- ✅ Automatické uložení při načtení v editačním režimu

### 5. Vylepšené UI komponenty ✅

#### 5.1 Tlačítko Submit
- ✅ "Uložit změny" místo "Uložit objednávku" v editačním režimu
- ✅ Upravený tooltip text

#### 5.2 Tlačítko Reset  
- ✅ "Obnovit původní" místo "Reset" v editačním režimu
- ✅ Obnovení na `originalFormData` místo `initialState`

#### 5.3 Indikátor fáze
- ✅ Zobrazení aktuální fáze workflow (1-4)
- ✅ Barevné rozlišení podle stavu

### 6. API integrace ✅

#### 6.1 Správné API volání
- ✅ `shouldUseUpdate` logika již implementována
- ✅ `updateOrder` pro editaci, `createOrder` pro nové objednávky
- ✅ Předání `orderId` v payload pro update

### 7. Konflikt management ✅

#### 7.1 Detekce konfliktu
- ✅ Kontrola existujícího draftu při otevření editace
- ✅ Toast dialog s možnostmi řešení

## Použité technologie a vzory

### State Management
```javascript
const [isEditMode, setIsEditMode] = useState(false);
const [originalFormData, setOriginalFormData] = useState(null);
const currentPhase = getCurrentPhase(formData);
```

### Mapování dat
```javascript
const mappedFormData = {
  // Basic info
  predmet: src.predmet || src.subject || src.nazev || '',
  stredisko: src.stredisko_nazev || src.center?.name || '',
  
  // Supplier info  
  dodavatel_nazev: src.dodavatel_nazev || src.supplier?.name || '',
  
  // Legacy fallbacks
  subject: src.predmet || src.subject || src.nazev || '',
  supplier: src.dodavatel_nazev ? { name: src.dodavatel_nazev } : (src.supplier || {}),
};
```

### Vizuální indikátory
```javascript
// Container background
backgroundColor: isEditMode ? '#fef3c7' : '#ffffff'

// Header color  
color: isEditMode ? '#92400e' : '#374151'

// Phase indicator
color: currentPhase >= 3 ? '#059669' : 
       currentPhase >= 2 ? '#d97706' : 
       currentPhase >= 1 ? '#2563eb' : '#6b7280'
```

## Testovací scénáře

### ✅ Základní editace
1. Otevřít seznam objednávek (/orders-list-new)
2. Kliknout "Editovat" u existující objednávky
3. Ověřit žluté pozadí a správný titul
4. Upravit data a uložit
5. Ověřit persistenci změn

### ✅ Oprávnění
- Uživatel s `ORDER_EDIT_ALL` vidí tlačítko "Editovat" u všech objednávek
- Uživatel s `ORDER_EDIT_OWN` vidí "Editovat" jen u svých objednávek
- Uživatel bez oprávnění vidí jen "Zobrazit detail"

### ✅ Fáze workflow
- Objednávka s básickými daty → Fáze 1: Schváleno
- Objednávka s dodavatelem → Fáze 2: Dodavatel  
- Potvrzená objednávka → Fáze 3: Potvrzeno

## Kompatibilita s existujícím kódem

✅ Všechny změny jsou zpětně kompatibilní
✅ Zachována podpora pro camelCase i snake_case názvy polí
✅ Existující funkcionalita pro nové objednávky zůstává beze změn
✅ API volání respektují stávající strukturu

## Budoucí vylepšení

### Navržené funkce (neimplementovány)
- [ ] Batch edit více objednávek současně
- [ ] Historie změn s diff view
- [ ] Automatické uložení draftu během editace
- [ ] Pokročilé workflow řízení podle organizační struktury
- [ ] Export/import objednávek s editačními údaji

## Soubory změněné

### `/src/forms/OrderFormComponent.js`
- ✅ Přidána detekce editačního režimu
- ✅ Enhanced mapování dat z API
- ✅ Vizuální indikátory (pozadí, barvy, texty)
- ✅ Fázový systém workflow
- ✅ Vylepšená reset funkcionalita
- ✅ Konflikt management

### `/src/pages/OrdersListNew.js`
- ✅ Systém oprávnění již implementován
- ✅ Tlačítka "Editovat" / "Zobrazit" podle oprávnění

## Klíčové implementační detaily

### Detekce editačního režimu
```javascript
// Při otevření z seznamu
localStorage.setItem('order_open_for_edit_mode', 'edit');

// V OrderFormComponent
useEffect(() => {
  const handler = async (e) => {
    const effectiveMode = e?.detail?.mode || storedMode;
    if (effectiveMode) setIsEditMode(effectiveMode === 'edit');
  };
  window.addEventListener('orderOpenFromList', handler);
}, []);
```

### Mapování dat s fallbacky
```javascript
const mappedFormData = {
  // Preferujeme snake_case, fallback na camelCase, pak prázdný řetězec
  dodavatel_nazev: src.dodavatel_nazev || src.supplier?.name || src.supplierName || '',
  cislo_objednavky: src.cislo_objednavky || src.cislo || src.orderNumber || src.ev_cislo || '',
};
```

### Konflik s drafty
```javascript
if (mode === 'edit' && existingDraft && parsed.__draftMeaningful) {
  const proceed = await showToastDialog('Konflikt s konceptem', options);
  if (!proceed) { navigate('/orders-list-new'); return; }
}
```

Implementace je kompletní a připravená k produkčnímu nasazení! 🚀