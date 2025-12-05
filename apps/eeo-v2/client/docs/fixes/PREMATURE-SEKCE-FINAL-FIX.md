# Oprava: Premature zobrazení rozšířených sekcí - FINAL FIX

## 🎯 **Problém**
Rozšířené sekce se zobrazovaly okamžitě po zaškrtnutí "schváleno" místo až po manuálním kliknutí na tlačítko "ULOŽIT/AKTUALIZOVAT".

## 🔧 **Řešení**
Přidána nová state proměnná `isManuallySubmitted`, která se nastaví pouze při manuálním kliknutí na tlačítko SAVE/UPDATE.

### Změny v `/src/forms/OrderForm25.js`:

#### 1. Nová state proměnná:
```javascript
const [isManuallySubmitted, setIsManuallySubmitted] = useState(false); // Pouze pro manuální ULOŽIT/AKTUALIZOVAT
```

#### 2. Nastavení při manuálním uložení:
```javascript
const handleSaveOrder = async () => {
  // ...
  setIsManuallySubmitted(true); // 🔥 KLÍČOVÁ ZMĚNA
  await saveOrderToAPI();
}
```

#### 3. Reset při vytvoření nové objednávky:
```javascript
// Reset stavů uložené objednávky
setIsOrderSaved(false);
setSavedOrderId(null);
setIsManuallySubmitted(false); // 🔥 RESET
```

#### 4. Nová podmínka pro rozšířené sekce:
```javascript
/* PŘED */
{isOrderSaved && savedOrderId && formData.stav_schvaleni === 'schvaleno' && (

/* PO */
{isManuallySubmitted && isOrderSaved && savedOrderId && formData.stav_schvaleni === 'schvaleno' && (
```

## ✅ **Výsledný workflow:**

### Scénář 1: Auto-save (NESPOUŠTÍ rozšířené sekce)
```
1. Zaškrtnutí "schváleno" → Auto-save pouze do localStorage
2. isManuallySubmitted = false
3. Rozšířené sekce se NEZOBRAZÍ ❌
```

### Scénář 2: Manuální Save (SPOUŠTÍ rozšířené sekce)  
```
1. Zaškrtnutí "schváleno" → žádná změna UI
2. Kliknutí "ULOŽIT/AKTUALIZOVAT" → 
   - setIsManuallySubmitted(true) ✅
   - setIsOrderSaved(true) ✅
   - setSavedOrderId(id) ✅
3. Rozšířené sekce se ZOBRAZÍ ✅
4. Původní sekce se uzamknou ✅
```

## 🛡️ **Bezpečnostní logika:**

| Akce | isManuallySubmitted | isOrderSaved | Rozšířené sekce | Uzamčené sekce |
|------|-------------------|--------------|----------------|----------------|
| Auto-save konceptu | ❌ false | ❌ false | ❌ Skryté | ❌ Odemčené |
| Zaškrtnutí "schváleno" | ❌ false | ❌ false | ❌ Skryté | ❌ Odemčené |  
| Manuální SAVE/UPDATE | ✅ true | ✅ true | ✅ Viditelné | ✅ Uzamčené |

## 🔍 **Separace logik:**
- **`isOrderSaved`**: Pro uzamčení původních sekcí (při jakémkoliv uložení do DB)
- **`isManuallySubmitted`**: Pro zobrazení rozšířených sekcí (pouze po manuální akci)

Tímto je zajištěno, že se rozšířené sekce zobrazí skutečně až po explicitní akci uživatele na tlačítko ULOŽIT/AKTUALIZOVAT! 🎉