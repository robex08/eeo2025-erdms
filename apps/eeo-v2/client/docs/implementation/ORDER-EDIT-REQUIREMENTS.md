# Požadavky na implementaci editace objednávky

## Celkový přehled
Implementace systému editace objednávek z tabulkového seznamu s podporou různých fází workflow a oprávnění.

## 1. Základní funkcionalita

### 1.1 Spuštění editace ze seznamu
- **Zdroj**: OrdersListNew.js - seznam objednávek
- **Trigger**: Tlačítko "Editovat" v řádku tabulky
- **Data**: Předání `orderId` do OrderFormComponent
- **Načítání**: Kompletní data objednávky přes API `getOrderDetailApi2`

### 1.2 Detekce editačního režimu
- **Podmínka**: `orderId` parametr není null/undefined
- **Stav**: `isEditMode = !!orderId`
- **Načítání**: Automatické načtení dat při mount pokud je `orderId`

## 2. Systém oprávnění

### 2.1 Typy oprávnění
```javascript
ORDER_EDIT_ALL        // Editace všech objednávek
ORDER_EDIT_OWN        // Editace vlastních objednávek
ORDER_EDIT_SUBORDINATE // Editace podřízených objednávek
```

### 2.2 Logika kontroly oprávnění
```javascript
function checkOrderEditPermission(order, userPermissions, currentUserId) {
  if (userPermissions.includes('ORDER_EDIT_ALL')) return true;
  if (userPermissions.includes('ORDER_EDIT_OWN') && order.createdBy === currentUserId) return true;
  if (userPermissions.includes('ORDER_EDIT_SUBORDINATE') && isSubordinate(order.createdBy)) return true;
  return false;
}
```

### 2.3 UI implementace v seznamu
- **Podmínka zobrazení**: `checkOrderEditPermission(order)`
- **Tlačítko**: "Editovat" místo "Zobrazit" pokud má oprávnění
- **Fallback**: "Zobrazit" v read-only režimu

## 3. Vizuální indikátory editace

### 3.1 Záhlaví formuláře
- **Barva pozadí**: Žlutá (`#fbbf24` nebo podobná)
- **Text**: "Editace objednávky [číslo objednávky]" místo "Nová objednávka"
- **Zobrazení čísla**: Skutečné evidenční číslo objednávky

### 3.2 Indikátor režimu
```javascript
const headerStyle = {
  backgroundColor: isEditMode ? '#fef3c7' : '#f3f4f6',
  color: isEditMode ? '#92400e' : '#374151'
};

const headerTitle = isEditMode 
  ? `Editace objednávky ${formData.cislo_objednavky || orderId}`
  : 'Nová objednávka';
```

## 4. Fázový systém workflow

### 4.1 Detekce aktuální fáze
```javascript
function getCurrentPhase(formData) {
  const hasBasicInfo = formData.predmet && formData.poApproval && formData.stredisko;
  const hasSupplierInfo = formData.dodavatel && formData.orderDetails;
  const isConfirmed = formData.sentStatus === 'odeslano' && formData.orderConfirmed;
  
  if (isConfirmed) return 3;
  if (hasSupplierInfo) return 2;
  if (hasBasicInfo) return 1;
  return 0;
}
```

### 4.2 Viditelnost sekcí podle fáze
- **Fáze 1**: Základní info + PO schválení
- **Fáze 2**: + Dodavatel + Detaily + Financování
- **Fáze 3**: + Potvrzení + Registr smluv

### 4.3 Logika zobrazení sekcí
```javascript
function getVisibleSections(currentPhase, isEditMode) {
  return {
    basic: true,
    approval: true,
    supplier: currentPhase >= 2 || isEditMode,
    details: currentPhase >= 2 || isEditMode,
    financing: currentPhase >= 2 || isEditMode,
    confirmation: currentPhase >= 3 || isEditMode,
    registry: currentPhase >= 3 || isEditMode
  };
}
```

## 5. API integrace

### 5.1 Načítání dat
- **Endpoint**: `getOrderDetailApi2(orderId)`
- **Mapování**: DB formát → form formát
- **Pole**: Všechna pole včetně relačních dat (dodavatel, středisko, atd.)

### 5.2 Ukládání dat
- **Režim CREATE**: POST na `/api/orders`
- **Režim UPDATE**: PUT na `/api/orders/${orderId}`
- **Payload**: Stejná struktura, jiný endpoint

## 6. Řešení konfliktů s koncepty

### 6.1 Detekce konfliktu
- **Scénář**: Uživatel má rozpracovaný koncept + chce editovat existující objednávku
- **Detekce**: `localStorage.getItem('orderFormDraft')` není prázdný + `orderId` existuje

### 6.2 Dialog pro vyřešení konfliktu
```javascript
if (hasExistingDraft && orderId) {
  showDialog({
    title: 'Konflikt s rozpracovaným konceptem',
    message: 'Máte rozpracovaný koncept. Co chcete udělat?',
    options: [
      { label: 'Pokračovat v editaci (zrušit koncept)', action: 'continue_edit' },
      { label: 'Uložit koncept a editovat', action: 'save_and_edit' },
      { label: 'Zrušit editaci', action: 'cancel' }
    ]
  });
}
```

## 7. Mapování dat DB ↔ Form

### 7.1 Kritická pole pro mapování
```javascript
const dbToFormMapping = {
  // Základní info
  'predmet': 'subject',
  'cislo_objednavky': 'orderNumber',
  'stav_odeslano': 'sentStatus',
  
  // Dodavatel
  'dodavatel_id': 'supplier.id',
  'dodavatel_nazev': 'supplier.name',
  'dodavatel_ico': 'supplier.ico',
  
  // Středisko
  'stredisko_id': 'center.id',
  'stredisko_nazev': 'center.name',
  
  // Financování
  'zdroj_financovani': 'financingSource',
  'lp_kod': 'lpCode',
  
  // Workflow stavy
  'po_approval': 'poApproval',
  'order_confirmed': 'orderConfirmed'
};
```

### 7.2 Enhanced loadOrder funkce
```javascript
async function loadOrder(orderId) {
  try {
    const response = await getOrderDetailApi2(orderId);
    const mappedData = mapDbDataToForm(response.data);
    setFormData(mappedData);
    setIsEditMode(true);
  } catch (error) {
    showToast('Chyba při načítání objednávky', { type: 'error' });
  }
}
```

## 8. Aktualizace UI komponent

### 8.1 Změny v nabídce
- **Badge**: Zobrazení počtu editovaných objednávek
- **Indikátor**: Vizuální označení editačního režimu

### 8.2 Změny v tlačítkách
- **Submit**: "Uložit změny" místo "Uložit objednávku"
- **Reset**: Obnovení na původní načtená data
- **Cancel**: Návrat na seznam bez uložení

## 9. Testovací scénáře

### 9.1 Základní flow
1. Otevřít seznam objednávek
2. Kliknout "Editovat" u existující objednávky
3. Ověřit načtení dat a žluté záhlaví
4. Upravit data
5. Uložit změny
6. Ověřit persistenci dat

### 9.2 Oprávnění
1. Test s `ORDER_EDIT_ALL` - editace všech objednávek
2. Test s `ORDER_EDIT_OWN` - pouze vlastní objednávky
3. Test s `ORDER_EDIT_SUBORDINATE` - podřízené objednávky
4. Test bez oprávnění - pouze zobrazení

### 9.3 Fáze workflow
1. Editace objednávky ve fázi 1 (jen základní info)
2. Editace objednávky ve fázi 2 (+ dodavatel)
3. Editace objednávky ve fázi 3 (kompletní)

## 10. Technické poznámky

### 10.1 State management
- **Loading states**: `isLoadingOrder`, `isSubmittingOrder`
- **Edit mode**: `isEditMode` boolean flag
- **Original data**: Uchování původních dat pro reset

### 10.2 Error handling
- **Načítání**: Graceful handling API chyb
- **Oprávnění**: Redirect na seznam při nedostatečných právech
- **Validace**: Zachování stávající validace

### 10.3 Performance
- **Lazy loading**: Načítání dat jen při potřebě
- **Memoization**: Optimalizace re-renderů
- **Cleanup**: Správné vyčištění při unmount

## Priorita implementace
1. **P1**: Základní editace + oprávnění + vizuální indikátory
2. **P2**: Fázový systém + kompletní mapování dat
3. **P3**: Konflikt management + pokročilé UI features

## Status
- ✅ **COMPLETED**: Implementace dokončena a testována
- ✅ **READY**: Připraveno k produkčnímu nasazení