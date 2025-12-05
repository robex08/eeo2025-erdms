# TODO Badge - Počet Nedokončených Úkolů

## 📋 Přehled
Přidání **badge s počtem nedokončených úkolů** na ikonu TODO panelu. Badge se zobrazuje pouze když je panel zavřený a existují nedokončené úkoly.

## 🎯 Požadavek
> "prosim na ikonu todo jestli by slo kdyz je okno zavrene, tak aby zobraazoval v ikone ciilko aktvinich ukoly, nedokoncenych. pokud budo vse dokoncene, nebo nejsou zadne ukoly cisilko nezobrazovat vubec."

## ✅ Implementované změny

### 1. Přidán useMemo pro výpočet nedokončených úkolů (Layout.js ~řádek 783)
```javascript
// Počet nedokončených TODO úkolů pro badge
const unfinishedTasksCount = useMemo(() => tasks.filter(t => !t.done).length, [tasks]);
```

**Důvod:**
- Optimalizace - počítá se pouze při změně `tasks`
- Vyhneme se duplicitnímu volání `filter()` v JSX

### 2. Upraveno TODO tlačítko s badge (Layout.js ~řádek 1625)
```javascript
<RoundFab 
  type="button" 
  title={todoOpen ? 'Skrýt TODO' : 'Otevřít TODO seznam'} 
  onClick={()=> setTodoOpen(o=> { 
    const next=!o; 
    if(next) { 
      setEngagedPair(true); 
      setHoveredPanel(null); 
      bringPanelFront('todo'); 
    } else if(!notesOpen && !chatOpen) { 
      setEngagedPair(false); 
    } 
    return next; 
  })} 
  style={{ background:'#2563eb', position: 'relative' }}
>
  <FontAwesomeIcon icon={faTasks} />
  
  {/* BADGE S POČTEM NEDOKONČENÝCH ÚKOLŮ */}
  {!todoOpen && unfinishedTasksCount > 0 && (
    <span style={{
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      background: '#dc2626',
      color: 'white',
      borderRadius: '50%',
      minWidth: '18px',
      height: '18px',
      fontSize: '11px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      border: '2px solid white'
    }}>
      {unfinishedTasksCount > 99 ? '99+' : unfinishedTasksCount}
    </span>
  )}
</RoundFab>
```

## 🔍 Logika zobrazení badge

### Podmínky pro zobrazení:
1. **`!todoOpen`** - Panel TODO je zavřený
2. **`unfinishedTasksCount > 0`** - Existují nedokončené úkoly

### Podmínky pro skrytí:
- Panel TODO je otevřený (`todoOpen === true`)
- Všechny úkoly jsou dokončené (`unfinishedTasksCount === 0`)
- Nejsou žádné úkoly (`tasks.length === 0`)

## 🎨 Design badge

### Vizuální vlastnosti:
- **Pozice:** Pravý horní roh ikony (`top: -6px, right: -6px`)
- **Barva:** Červená (`#dc2626`) - upozorňuje na nedokončené úkoly
- **Tvar:** Kruh (`borderRadius: 50%`)
- **Velikost:** Min 18px × 18px (automaticky roste s počtem)
- **Border:** 2px bílý rámeček - vyniká na pozadí
- **Font:** 11px, bold - čitelný i při malých rozměrech

### Limit zobrazení:
- **1-99:** Zobrazí přesný počet
- **100+:** Zobrazí `"99+"`

## 📊 Příklady

### Příklad 1: Panel zavřený, 3 nedokončené úkoly
```
[TODO ikona]
     (3)  ← červený badge
```
✅ Badge se zobrazí s číslem `3`

### Příklad 2: Panel zavřený, 0 nedokončených úkolů
```
[TODO ikona]
```
✅ Badge se NEzobrazí (všechny dokončené nebo žádné úkoly)

### Příklad 3: Panel zavřený, 150 nedokončených úkolů
```
[TODO ikona]
    (99+)  ← červený badge
```
✅ Badge se zobrazí s textem `99+`

### Příklad 4: Panel otevřený, 5 nedokončených úkolů
```
[TODO ikona - aktivní panel viditelný]
```
✅ Badge se NEzobrazí (panel je otevřený)

## 🔄 Srovnání s Chat badge

Implementace je **konzistentní** s existujícím Chat badge:

| Vlastnost | TODO Badge | Chat Badge |
|-----------|-----------|------------|
| Zobrazení | Pouze když zavřený | Pouze když zavřený |
| Barva | `#dc2626` (červená) | `#dc2626` (červená) |
| Pozice | `top: -6px, right: -6px` | `top: -6px, right: -6px` |
| Velikost | `18px × 18px` | `18px × 18px` |
| Font | `11px, bold` | `11px, bold` |
| Border | `2px solid white` | `2px solid white` |
| Limit | `99+` | `99+` |
| Trigger | `unfinishedTasksCount` | `unreadChatCount` |

## 🎯 UX Benefits

✅ **Vizuální upozornění** - Uživatel vidí počet nedokončených úkolů  
✅ **Motivace** - Červený badge motivuje k dokončení úkolů  
✅ **Konzistence** - Stejný design jako Chat badge  
✅ **Non-intrusive** - Zobrazuje se pouze když je panel zavřený  
✅ **Automatically updates** - Aktualizuje se při změně úkolů (useMemo)

## 📝 Soubory změněny

- **src/components/Layout.js**
  - Přidán `unfinishedTasksCount` useMemo
  - Upraven TODO RoundFab s badge
  - Přidán `position: 'relative'` na RoundFab style

## 🧪 Testování

### Test 1: Badge se zobrazí
1. Zavřít TODO panel
2. Mít alespoň jeden nedokončený úkol
3. **Očekávání:** Badge s číslem viditelný v pravém horním rohu ikony

### Test 2: Badge se skryje (všechny dokončené)
1. Zavřít TODO panel
2. Dokončit všechny úkoly (zaškrtnout)
3. **Očekávání:** Badge se NEzobrazuje

### Test 3: Badge se skryje (žádné úkoly)
1. Zavřít TODO panel
2. Smazat všechny úkoly
3. **Očekávání:** Badge se NEzobrazuje

### Test 4: Badge se skryje (panel otevřený)
1. Otevřít TODO panel
2. Mít nedokončené úkoly
3. **Očekávání:** Badge se NEzobrazuje (panel je otevřený)

### Test 5: Badge aktualizace
1. Zavřít TODO panel s 3 nedokončenými úkoly → Badge ukazuje `3`
2. Otevřít panel, přidat 2 nové úkoly, zavřít panel
3. **Očekávání:** Badge ukazuje `5`

### Test 6: Badge limit
1. Zavřít TODO panel
2. Vytvořit 100+ nedokončených úkolů
3. **Očekávání:** Badge ukazuje `99+`

## 🔗 Související

- Chat badge implementace (Layout.js ~řádek 1625)
- Notifications badge (NotificationBellWrapper)
- useFloatingPanels hook - tasks management

---
**Status:** ✅ DONE  
**Datum:** 19. října 2025  
**Autor:** GitHub Copilot
