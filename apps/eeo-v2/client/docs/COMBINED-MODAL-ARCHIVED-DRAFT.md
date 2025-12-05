# Kombinovaný Modal - Archivovaná Objednávka + Draft

## 📋 Přehled
Implementace **jednoho kombinovaného modalu** místo dvou samostatných modalů při editaci archivované objednávky, když už existuje rozpracovaný koncept.

## 🎯 Problém
**PŘED:**
- Při kliknutí na "Editovat" u archivované objednávky (když existuje draft):
  1. Zobrazil se modal "Varování - Importovaná objednávka"
  2. Po potvrzení se zobrazil druhý modal "Upozornění - Rozpracovaná objednávka"
  3. **→ Blikaly dva modaly za sebou (špatná UX)**

**PO:**
- Zobrazí se **JEDEN kombinovaný modal** s oběma varováními najednou
- Uživatel vidí všechny informace na jednom místě
- Jedna akce → jasné rozhodnutí

## ✅ Implementované změny

### 1. Přidán nový state (řádek ~2648)
```javascript
const [showArchivedWithDraftWarningModal, setShowArchivedWithDraftWarningModal] = useState(false);
```

### 2. Upravena logika v `handleEdit()` (řádek ~4882)
```javascript
// KONTROLA: Pokud je objednávka ARCHIVOVANO a zároveň existuje koncept
if (order.stav_objednavky === 'ARCHIVOVANO' && shouldShowConfirmDialog) {
  setOrderToEdit(order);
  setShowArchivedWithDraftWarningModal(true); // Zobraz KOMBINOVANÝ modal
  return;
}

// KONTROLA: Pokud je objednávka ARCHIVOVANO (bez konceptu)
if (order.stav_objednavky === 'ARCHIVOVANO') {
  setOrderToEdit(order);
  setShowArchivedWarningModal(true);
  return;
}
```

**Klíčové:**
- Nejprve kontrola na `ARCHIVOVANO + draft` → kombinovaný modal
- Pak kontrola jen na `ARCHIVOVANO` → původní archived modal
- Pak kontrola jen na `draft` → původní draft modal

### 3. Vytvořen kombinovaný modal (řádek ~8043)
```javascript
{showArchivedWithDraftWarningModal && ReactDOM.createPortal(
  <ModalOverlay onClick={() => { 
    setShowArchivedWithDraftWarningModal(false); 
    setOrderToEdit(null); 
  }}>
    <ModalDialog onClick={e => e.stopPropagation()}>
      <ModalHeader>
        <ModalIcon style={{ background: '#fed7aa', color: '#ea580c' }}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </ModalIcon>
        <ModalTitle>Důležité varování</ModalTitle>
      </ModalHeader>
      
      <ModalContent>
        <p>
          Chystáte se editovat archivovanou objednávku 
          <strong>"{orderToEdit?.cislo_objednavky || orderToEdit?.ev_cislo}"</strong>.
        </p>
        
        {/* VAROVÁNÍ 1: Archivovaná objednávka */}
        <div style={{ background: '#fef3c7', padding: '0.75rem', ... }}>
          <strong>⚠️ VAROVÁNÍ - ARCHIVOVÁNO:</strong><br />
          Tato objednávka byla importována z původního systému EEO a má stav 
          <strong>ARCHIVOVÁNO</strong>. 
          Editace může být přepsána při opakovaném importu dat.
        </div>
        
        {/* VAROVÁNÍ 2: Ztráta rozpracované objednávky */}
        <div style={{ background: '#fee2e2', padding: '0.75rem', ... }}>
          <strong>🗑️ ZTRÁTA KONCEPTU:</strong><br />
          Máte rozpracovanou objednávku, která bude při pokračování 
          <strong>ZTRACENA</strong> a nelze ji obnovit!
        </div>
        
        <p style={{ marginTop: '1rem' }}>
          <strong>Co se stane po pokračování:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Váš rozpracovaný koncept bude <strong>trvale smazán</strong></li>
          <li>Otevřete archivovanou objednávku k editaci</li>
          <li>Změny mohou být přepsány při budoucím importu</li>
        </ul>
        
        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#dc2626' }}>
          Opravdu chcete pokračovat a ztratit rozpracovanou objednávku?
        </p>
      </ModalContent>
      
      <ModalActions>
        <ModalButton onClick={() => { 
          setShowArchivedWithDraftWarningModal(false); 
          setOrderToEdit(null); 
        }}>
          Ne, zrušit
        </ModalButton>
        <ModalButton $variant="primary" onClick={(e) => { 
          e.preventDefault(); 
          handleArchivedWithDraftConfirm(); 
        }}>
          Ano, rozumím a chci pokračovat
        </ModalButton>
      </ModalActions>
    </ModalDialog>
  </ModalOverlay>,
  document.body
)}
```

**Design:**
- **Žluté varování (⚠️)** - riziko archivované objednávky
- **Červené varování (🗑️)** - ztráta konceptu
- Seznam důsledků (co se stane)
- Jasné CTA tlačítko s potvrzením

### 4. Vytvořen handler `handleArchivedWithDraftConfirm()` (řádek ~4978)
```javascript
const handleArchivedWithDraftConfirm = () => {
  // 1. Zavři kombinovaný modal
  setShowArchivedWithDraftWarningModal(false);
  
  // 2. Smaž existující draft z localStorage
  const draftKey = `order25-draft-${user_id}`;
  localStorage.removeItem(draftKey);
  
  console.log('🗑️ Draft smazán kvůli editaci archivované objednávky');
  
  // 3. Edituj archivovanou objednávku (s parametrem archivovano=1)
  if (orderToEdit) {
    handleEditConfirm(orderToEdit);
  }
};
```

**Kroky:**
1. Zavřít kombinovaný modal
2. **Smazat draft z localStorage** (důležité!)
3. Spustit `handleEditConfirm(orderToEdit)` - načte archivovanou objednávku s `archivovano=1`

## 🔍 Flow diagram

```
Kliknutí na "Editovat"
          ↓
    handleEdit(order)
          ↓
┌─────────────────────────────────────┐
│ Je ARCHIVOVANO + existuje draft?    │
└─────────────────────────────────────┘
          ↓ ANO
┌─────────────────────────────────────┐
│ Zobraz KOMBINOVANÝ modal            │
│ (archivováno + draft warning)       │
└─────────────────────────────────────┘
          ↓ Uživatel potvrdí
┌─────────────────────────────────────┐
│ handleArchivedWithDraftConfirm()    │
│ 1. Smaž draft                       │
│ 2. Edituj archivovanou objednávku   │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ handleEditConfirm(orderToEdit)      │
│ → načte s archivovano=1             │
└─────────────────────────────────────┘
          ↓
    navigate("/order-form-25?edit=123&archivovano=1")
```

## 🎨 UX vylepšení

### PŘED (špatné):
```
[Modal 1: Archivováno warning] → klik "Ano"
  ↓ (bliknutí)
[Modal 2: Draft warning] → klik "Ano"
  ↓
Editace objednávky
```

### PO (dobré):
```
[JEDEN kombinovaný modal]
- ⚠️ Archivováno warning
- 🗑️ Draft warning
- Seznam důsledků
  ↓ klik "Ano"
Editace objednávky
```

## 📊 Výhody

✅ **Lepší UX** - Žádné blikání modalů  
✅ **Srozumitelnější** - Všechny informace na jednom místě  
✅ **Rychlejší** - Jeden klik místo dvou  
✅ **Bezpečnější** - Jasně viditelné varování o ztrátě dat  
✅ **Přehlednější** - Barevně odlišená varování (žlutá/červená)

## 🔧 Testování

### Test 1: Kombinovaný modal
1. Vytvořit draft/koncept (začít novou objednávku)
2. Vrátit se na seznam objednávek
3. Kliknout "Editovat" na archivované objednávce (ARCHIVOVANO stav)
4. **Očekávání:** Zobrazí se JEDEN kombinovaný modal s oběma varováními
5. Kliknout "Ano, rozumím a chci pokračovat"
6. **Očekávání:** Draft smazán, otevře se archivovaná objednávka

### Test 2: Pouze archivovaná (bez draftu)
1. Ujistit se, že není žádný draft v localStorage
2. Kliknout "Editovat" na archivované objednávce
3. **Očekávání:** Zobrazí se POUZE archivovaný warning modal (původní)

### Test 3: Pouze draft (bez archivované)
1. Vytvořit draft/koncept
2. Kliknout "Editovat" na normální objednávce (ne archivované)
3. **Očekávání:** Zobrazí se POUZE draft warning modal (původní)

## 📝 Soubory změněny

- **src/pages/Orders25List.js**
  - Přidán state `showArchivedWithDraftWarningModal`
  - Upravena logika v `handleEdit()`
  - Přidán kombinovaný modal JSX
  - Přidán handler `handleArchivedWithDraftConfirm()`

## 🔗 Související

- `FIX-ARCHIVOVANO-EDIT.md` - Implementace `archivovano=1` parametru
- `ROLE-RIGHTS-FIX.md` - Celková oprava práv a editace objednávek

---
**Status:** ✅ DONE  
**Datum:** 2025-01-XX  
**Autor:** GitHub Copilot
