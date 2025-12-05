# 🧪 Test Alarm Preview & Výrazné Ikony

## ✅ Implementované Změny

### 1. **Výrazná Ikona Zvonečku** 🔔

#### Když JE alarm nastaven:
- **NORMAL priorita**:
  - Gradient pozadí: oranžový (`#fed7aa` → `#fdba74`)
  - Border: 1.5px solid oranžový (`#ea580c`)
  - Barva ikony: tmavě oranžová (`#9a3412`)
  - Font size: 1rem (větší)
  - Font weight: 700 (bold)
  - Box shadow: `0 2px 6px rgba(0,0,0,0.15)`
  - Transform: `scale(1.05)` (zvětšení o 5%)
  - Drop shadow na ikoně: `0 1px 2px rgba(0,0,0,0.2)`

- **HIGH priorita**:
  - Gradient pozadí: červený (`#fee2e2` → `#fecaca`)
  - Border: 1.5px solid červený (`#dc2626`)
  - Barva ikony: tmavě červená (`#991b1b`)
  - Font size: 1rem (větší)
  - Font weight: 700 (bold)
  - Box shadow: `0 2px 6px rgba(0,0,0,0.15)`
  - Transform: `scale(1.05)` (zvětšení o 5%)
  - Drop shadow na ikoně: `0 1px 2px rgba(0,0,0,0.2)`
  - **Extra**: Ikona 🚨 vedle zvonečku

#### Hover efekt:
```css
transform: scale(1.1);        /* Zvětší se na 110% */
box-shadow: 0 4px 8px rgba(0,0,0,0.2);  /* Větší stín */
```

#### Když NENÍ alarm nastaven:
- Transparentní pozadí
- Žádný border
- Šedá ikona (`#64748b`)
- Font size: 0.85rem (menší)
- Font weight: 400 (normální)
- Žádný stín

### 2. **Preview Floating Popup** 👁️

#### Kdy se zobrazí tlačítko:
```javascript
{priority === 'HIGH' && (
  <button onClick={() => setShowPreview(!showPreview)}>
    {showPreview ? '🙈 Skrýt náhled' : '👁️ Zobrazit náhled popup okénka'}
  </button>
)}
```

#### Co zobrazí:
- Mini verze floating popup okénka (85% velikost)
- Obsahuje:
  - Ikona 🚨 v červeném gradientu
  - Titulek "HIGH Alarm TODO"
  - Formátovaný datum a čas z formuláře
  - Text úkolu ve žlutém boxu
  - Tlačítka "Zavřít" a "✓ Hotové"
  - Hint: "💡 Okénko lze přesouvat myší po obrazovce"

#### Design:
```
┌─────────────────────────────────────┐
│ ⚡ Náhled HIGH Priority Alarmu      │
│ ┌──────────────────────────────────┐│
│ │ [🚨] HIGH Alarm TODO             ││
│ │      20.10.2025 14:30            ││
│ │ ┌──────────────────────────────┐ ││
│ │ │ Text úkolu zde...            │ ││
│ │ └──────────────────────────────┘ ││
│ │ [Zavřít] [✓ Hotové]              ││
│ └──────────────────────────────────┘│
│ 💡 Okénko lze přesouvat myší...     │
└─────────────────────────────────────┘
```

## 📋 Test Checklist

### Test 1: Výraznost Ikon
- [ ] 1. Otevři TODO panel
- [ ] 2. Vytvoř nový úkol bez alarmu
- [ ] 3. Ověř, že ikona 🔔 je šedá a transparentní
- [ ] 4. Klikni na ikonu 🔔 a nastav NORMAL alarm
- [ ] 5. **Ověř**: Ikona je teď oranžová s gradientem, má border a je větší
- [ ] 6. Nastav HIGH alarm
- [ ] 7. **Ověř**: Ikona je červená s gradientem + ikona 🚨
- [ ] 8. Najeď myší na ikonu
- [ ] 9. **Ověř**: Ikona se zvětší na 110% a má větší stín

### Test 2: Preview Floating Popup
- [ ] 1. Otevři alarm dialog
- [ ] 2. **Ověř**: Při NORMAL prioritě není tlačítko preview
- [ ] 3. Vyber HIGH prioritu
- [ ] 4. **Ověř**: Objeví se tlačítko "👁️ Zobrazit náhled popup okénka"
- [ ] 5. Klikni na tlačítko preview
- [ ] 6. **Ověř**: Zobrazí se mini verze floating okénka
- [ ] 7. **Ověř**: Okénko obsahuje aktuální datum/čas z formuláře
- [ ] 8. **Ověř**: Okénko obsahuje text úkolu
- [ ] 9. Klikni znovu na tlačítko (teď "🙈 Skrýt náhled")
- [ ] 10. **Ověř**: Preview zmizí

### Test 3: Integrace
- [ ] 1. Nastav HIGH alarm s preview
- [ ] 2. Ulož alarm
- [ ] 3. **Ověř**: Dialog se zavře
- [ ] 4. **Ověř**: Ikona 🔔 je červená + ikona 🚨
- [ ] 5. Klikni znovu na ikonu
- [ ] 6. **Ověř**: Dialog se otevře s HIGH prioritou
- [ ] 7. **Ověř**: Tlačítko preview je viditelné
- [ ] 8. Zobraz preview
- [ ] 9. **Ověř**: Preview funguje správně

## 🐛 Možné Problémy

### Problém: Preview se nezobrazí
**Možné příčiny**:
1. `showPreview` state není správně inicializován
2. Podmínka `priority === 'HIGH'` není splněna
3. JSX je špatně strukturovaný
4. CSS způsobuje, že je preview skrytý (display: none)

**Debug kroky**:
```javascript
// Přidat do AlarmModal:
console.log('Priority:', priority);
console.log('ShowPreview:', showPreview);
console.log('Condition:', showPreview && priority === 'HIGH');
```

### Problém: Ikona není výrazná
**Možné příčiny**:
1. CSS styly nejsou aplikovány
2. `t.alarm` je null/undefined
3. `alarmPriority` není správně vypočítán
4. Inline styles jsou přepsány jiným CSS

**Debug kroky**:
```javascript
// V TodoItemEditable:
console.log('Task alarm:', t.alarm);
console.log('Alarm priority:', alarmPriority);
```

## 🎨 CSS Hodnoty pro Referenci

### Barvy NORMAL:
```css
background: linear-gradient(135deg, #fed7aa, #fdba74);
border: 1.5px solid #ea580c;
color: #9a3412;
```

### Barvy HIGH:
```css
background: linear-gradient(135deg, #fee2e2, #fecaca);
border: 1.5px solid #dc2626;
color: #991b1b;
```

### Preview Box:
```css
border: 2px dashed #cbd5e1;
background: #f8fafc;
box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
transform: scale(0.85);
```

## 📝 Poznámky

- Ikona je **5% větší** když je alarm nastaven
- Na hover se **zvětší na 110%**
- Preview se zobrazuje **pouze pro HIGH prioritu**
- Preview je **85% velikost** skutečného okénka
- Používá **React.useState** pro showPreview

---

**Status**: ✅ Implementováno
**Testováno**: ⏳ Čeká na test
**Datum**: 19.10.2025
