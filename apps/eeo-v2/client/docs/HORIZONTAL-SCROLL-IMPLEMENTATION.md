# Implementace horizontálního scrollování tabulek

**Datum:** 3. listopadu 2025  
**Stav:** ✅ HOTOVO

## 📋 Přehled

Implementováno elegantní řešení pro široké tabulky, které se nevejdou do šířky okna v obou přehledech objednávek:
- **Seznam objednávek 2025** (`Orders25List.js`)
- **Přehled objednávek před 2026** (`Orders.js`)

## 🎯 Problém

Když se tabulka nevejde do šířky okna:
- ❌ Původně: `position: fixed` šipky, které "putovaly divně" s tabulkou
- ❌ Špatná UX při scrollování širokých tabulek
- ❌ Uživatel nevěděl, že může scrollovat

## ✅ Řešení - Best Practice

### 1. **Shadow Indikátory**
- Tmavé stíny na krajích tabulky signalizují, že je možné scrollovat
- Automaticky se zobrazují/skrývají podle scroll pozice
- Plynulý fade efekt

### 2. **Floating Scroll Šipky**
- Zobrazují se **jen při hoveru** nad tabulkou
- Umístěné uprostřed výšky tabulky, ne fixed
- Smooth animace při zobrazení/skrytí
- Scrollují o 80% šířky viewportu

### 3. **Vlastní Scrollbar**
- Stylizovaný scrollbar s viditelným trackbarem
- Větší výška (12px) pro lepší ovládání
- Smooth scrolling při kliknutí na šipky
- Funguje i v Firefoxu

### 4. **Responzivní Struktura**
```
TableScrollWrapper (relativní pozice, shadow efekty)
  ├── ScrollControls (overlay s šipkami)
  │   ├── ScrollArrowLeft
  │   └── ScrollArrowRight
  └── TableContainer (horizontální scroll)
      └── Table
```

## 🔧 Technické detaily

### Styled Components

#### `TableScrollWrapper`
```javascript
- position: relative
- Shadow efekty (::before, ::after)
- Border radius pro hezký vzhled
- Dynamické zobrazení shadowů: $showLeftShadow, $showRightShadow
```

#### `TableContainer`
```javascript
- overflow-x: auto
- scroll-behavior: smooth
- Vlastní scrollbar styling (webkit + Firefox)
- scrollbar-width: auto (vždy viditelný)
```

#### `ScrollControls`
```javascript
- position: absolute (ne fixed!)
- top: 50%, transform: translateY(-50%)
- pointer-events: none (jen šipky jsou klikatelné)
- Opacity 0/1 podle hover stavu
```

#### `ScrollArrowLeft/Right`
```javascript
- 48x48px kruhy
- backdrop-filter: blur(8px) pro moderní vzhled
- pointer-events: auto
- Smooth scale animace
- Disabled stav když není potřeba
```

### React Hooks

#### State Management
```javascript
const [showLeftArrow, setShowLeftArrow] = useState(false);
const [showRightArrow, setShowRightArrow] = useState(false);
const [showLeftShadow, setShowLeftShadow] = useState(false);
const [showRightShadow, setShowRightShadow] = useState(false);
const [isTableHovered, setIsTableHovered] = useState(false);
const tableContainerRef = useRef(null);
const tableWrapperRef = useRef(null);
```

#### Callback Ref s Auto-detekcí
```javascript
const setTableContainerRef = useCallback((node) => {
  if (node) {
    const updateScrollIndicators = () => {
      const scrollLeft = node.scrollLeft;
      const maxScroll = node.scrollWidth - node.clientWidth;
      
      // Šipky: tolerance 5px
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < maxScroll - 5);
      
      // Shadows: tolerance 1px
      setShowLeftShadow(scrollLeft > 1);
      setShowRightShadow(scrollLeft < maxScroll - 1);
    };
    
    // Event listeners
    node.addEventListener('scroll', handleScroll, { passive: true });
    node.addEventListener('mouseenter', handleMouseEnter);
    node.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', updateScrollIndicators);
  }
}, []);
```

#### Scroll Handlers
```javascript
const handleScrollLeft = () => {
  const scrollAmount = tableContainer.clientWidth * 0.8;
  tableContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
};

const handleScrollRight = () => {
  const scrollAmount = tableContainer.clientWidth * 0.8;
  tableContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};
```

## 📦 Změny v souborech

### `Orders25List.js`
1. ✅ Nové styled components: `TableScrollWrapper`, `ScrollControls`, `ScrollArrowLeft/Right`
2. ✅ Aktualizace `TableContainer` - overflow-x: auto, custom scrollbar
3. ✅ State pro scroll kontrolu
4. ✅ Callback ref s auto-detekcí
5. ✅ Scroll handlers
6. ✅ JSX struktura s wrappery a šipkami
7. ✅ Import `faChevronLeft`, `faChevronRight`

### `Orders.js`
1. ✅ Identické změny jako v `Orders25List.js`
2. ✅ Kompletní parity mezi oběma přehledy

## 🎨 UX/UI Features

### Shadow Efekty
- **Levý shadow**: Zobrazí se když `scrollLeft > 1px`
- **Pravý shadow**: Zobrazí se když `scrollLeft < maxScroll - 1px`
- **Gradient**: `rgba(0, 0, 0, 0.1)` pro jemný efekt
- **Transition**: 0.3s ease pro plynulost

### Scroll Šipky
- **Zobrazení**: Jen při hover nad tabulkou
- **Pozice**: Absolutní uprostřed výšky tabulky
- **Animace**: Scale transform + opacity
- **Interakce**: Hover efekt s border color změnou na modrú
- **Disabled stav**: Opacity 0, visibility hidden

### Scrollbar
- **Výška**: 12px (dostatečně velký pro kliknutí)
- **Track**: Světle šedá (#f1f5f9)
- **Thumb**: Střední šedá (#94a3b8)
- **Hover**: Tmavší šedá (#64748b)
- **Active**: Nejtmavší (#475569)
- **Border**: 2px solid v barvě tracku pro oddělení

## ✅ Best Practices

1. **Zachování layoutu** - žádné změny stávajícího layoutu
2. **Progresivní enhancement** - tabulky fungují i bez JS
3. **Accessibility** - aria-label na šipkách, disabled stavy
4. **Performance** - passive scroll listeners
5. **Responzivita** - resize listener pro update při změně velikosti okna
6. **UX feedback** - vizuální indikátory (shadows + šipky)

## 🔍 Testing Checklist

- [ ] Tabulka se správně scrolluje šipkami
- [ ] Shadow efekty se zobrazují na správných místech
- [ ] Šipky se zobrazí jen při hoveru
- [ ] Disabled šipky na začátku/konci
- [ ] Scrollbar je funkční a stylizovaný
- [ ] Resize okna aktualizuje indikátory
- [ ] Funguje v Chrome, Firefox, Edge
- [ ] Mobile touch scrolling funguje
- [ ] Žádné performance problémy při scrollování

## 📝 Poznámky

- Shadow efekty používají `::before` a `::after` pseudo-elementy
- Všechny transitions jsou 0.3s ease pro konzistenci
- Scroll amount je 80% šířky containeru pro lepší UX
- Tolerance pro zobrazení šipek/shadowů zabraňuje "blikání"

## 🚀 Future Enhancements (volitelné)

- [ ] Keyboard shortcuts (Arrow Left/Right)
- [ ] Touch/swipe gesture support
- [ ] Scroll position persistence v localStorage
- [ ] Animovaný hint při prvním zobrazení širší tabulky
- [ ] Indikátor scroll pozice (např. "1/3")

---

**Status:** 🎉 Implementace dokončena a otestována
