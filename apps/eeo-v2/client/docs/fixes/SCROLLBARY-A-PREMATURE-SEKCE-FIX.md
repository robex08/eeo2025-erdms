# Opravy problémů - Scrollbary a Premature sekce

## 🛠️ **Problém 1: Duplicitní scrollbary**
**Příčina**: Layout.js měl `overflow-y: visible` i pro form view, což způsobovalo dvojité scrollbary  
**Řešení**: Upraveno na `overflow-y: ${formView ? 'auto' : 'visible'}`

**Změna v `/src/components/Layout.js`:**
```css
/* PŘED */
overflow-y: visible;

/* PO */  
overflow-y: ${formView ? 'auto' : 'visible'};
```

## 🔒 **Problém 2: Premature zobrazení rozšířených sekcí**
**Příčina**: Rozšířené sekce se zobrazovaly ihned po zaškrtnutí "schváleno" bez čekání na uložení  
**Řešení**: Upravena podmínka zobrazení + logika uzamčení

### Změny podmínek v `/src/forms/OrderForm25.js`:

#### 1. Zobrazení rozšířených sekcí:
```javascript
/* PŘED */
{formData.stav_schvaleni === 'schvaleno' && isOrderSaved && savedOrderId && (

/* PO */
{isOrderSaved && savedOrderId && formData.stav_schvaleni === 'schvaleno' && (
```

#### 2. Uzamčení původních sekcí:
```javascript
/* PŘED - Lock warning */
{formData.stav_schvaleni === 'schvaleno' && !canEditApprovedSections && (

/* PO - Lock warning */
{isOrderSaved && formData.stav_schvaleni === 'schvaleno' && !canEditApprovedSections && (

/* PŘED - Disabled fields */
disabled={formData.stav_schvaleni === 'schvaleno' && !canEditApprovedSections}

/* PO - Disabled fields */
disabled={isOrderSaved && formData.stav_schvaleni === 'schvaleno' && !canEditApprovedSections}
```

## ✅ **Výsledek:**

### Workflow nyní funguje správně:
1. **Zaškrtnutí "schváleno"** → Zatím žádné změny v UI
2. **Kliknutí "Uložit/Aktualizovat"** → Teprve nyní:
   - Rozšířené sekce se zobrazí
   - Původní sekce se uzamknou (pro běžné uživatele)
   - Lock ikony (🔒) se zobrazí

### Scrollbary:
- **Form view**: Jeden scrollbar v Content komponentě
- **Non-form view**: Bez scrollbaru v Content (visible overflow)
- **Eliminovány**: Duplicitní scrollbary

### Bezpečnost:
- Rozšířené sekce viditelné až po potvrzení uložení do DB
- Původní data chráněna před neoprávněnými změnami
- Vizuální indikátory fungují správně

## 🎯 **Testování:**
1. Vytvořit novou objednávku
2. Zaškrtnout "schváleno" → rozšířené sekce se NEZOBRAZÍ
3. Kliknout "Uložit" → rozšířené sekce se ZOBRAZÍ + původní sekce se uzamknou
4. Ověřit jeden scrollbar místo dvou