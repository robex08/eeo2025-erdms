# 🎯 Context Menu - Fix Poskakování (4. listopadu 2025)

## 🐛 Problém

Kontextové menu **"poskakuje"** (flicker) při otevření, zejména když se nevejde na spodní nebo pravou stranu obrazovky.

### Proč se to děje?

**Původní flow:**
1. Menu se **ZOBRAZÍ** na pozici kurzoru (x, y)
2. React **VYKRESLÍ** menu → DOM má element
3. Funkce `adjustedPosition()` **SPOČÍTÁ** pozici pomocí `getBoundingClientRect()`
4. Menu se **PŘESUNE** na novou pozici

→ Uživatel vidí **poskakování** mezi kroky 1 a 4 ⚡️

---

## ✅ Řešení

**Nový flow s dvou-fázovým renderem:**

1. Menu se vykreslí **SKRYTÉ** (`opacity: 0`)
2. `useEffect` **SPOČÍTÁ** správnou pozici pomocí `getBoundingClientRect()`
3. Uloží pozici do `menuPosition` state
4. Nastaví `isPositioned = true`
5. Menu se **ZOBRAZÍ** (`opacity: 1`) na již správné pozici

→ Žádné poskakování! ✨

---

## 🛠️ Implementované změny

### Soubor: `src/components/OrderContextMenu.js`

#### 1. Nové state proměnné

```javascript
const [menuPosition, setMenuPosition] = useState({ left: x, top: y });
const [isPositioned, setIsPositioned] = useState(false);
```

#### 2. useEffect pro výpočet pozice

```javascript
useEffect(() => {
  if (menuRef.current && !isPositioned) {
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x;
    let top = y;

    // Kontrola přesahu pravého okraje
    if (x + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 10;
    }

    // Kontrola přesahu spodního okraje
    if (y + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 10;
    }

    // Aktualizuj pozici a označ jako positioned
    setMenuPosition({ left, top });
    setIsPositioned(true);
  }
}, [x, y, isPositioned]);
```

#### 3. Render se skrytím během měření

```javascript
<MenuContainer
  ref={menuRef}
  style={{
    left: `${menuPosition.left}px`,
    top: `${menuPosition.top}px`,
    // Skryj menu, dokud není správně umístěno
    opacity: isPositioned ? 1 : 0,
    pointerEvents: isPositioned ? 'auto' : 'none'
  }}
>
```

#### 4. Úprava stylu - plynulá transition místo keyframe animace

**PŘED:**
```javascript
animation: fadeIn 0.15s ease-out;

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
```

**PO:**
```javascript
transition: opacity 0.15s ease-out;
```

---

## 🎯 Výsledek

### ✅ Co nyní funguje:

1. **Žádné poskakování** - menu se zobrazí až na správné pozici
2. **Plynulý fade-in** - smooth transition opacity 0 → 1
3. **Správné umístění** - kontrola pravého i spodního okraje viewportu
4. **Prevence klikání** - `pointerEvents: 'none'` během měření

### 📊 Timeline:

```
0ms    → Menu render (opacity: 0, skryté)
0ms    → useEffect spustí výpočet pozice
~1ms   → getBoundingClientRect() vrátí rozměry
~1ms   → setMenuPosition() + setIsPositioned(true)
~2ms   → Re-render s opacity: 1
~150ms → Transition dokončena (plně viditelné)
```

### 🧪 Test cases:

| Pozice kurzoru | Očekávané chování |
|----------------|-------------------|
| Uprostřed obrazovky | Menu se zobrazí přímo pod kurzorem |
| Pravý dolní roh | Menu se posune doleva a nahoru, aby se vešlo |
| Pravý okraj | Menu se posune doleva |
| Spodní okraj | Menu se posune nahoru |

---

## 📁 Změněné soubory

- ✅ `src/components/OrderContextMenu.js`
  - Přidány state: `menuPosition`, `isPositioned`
  - Přidán useEffect pro výpočet pozice
  - Upraven render s podmíněným `opacity` a `pointerEvents`
  - Změněn styl z `animation` na `transition`

---

## 🚀 Status

**✅ HOTOVO** - Kontextové menu se nyní zobrazuje bez poskakování

**Klíčová technika:** Dvou-fázový render se skrytím během měření rozměrů

---

**Autor:** AI Assistant  
**Datum:** 4. listopadu 2025  
**Branch:** `feature/orders-list-v2-api-migration`
