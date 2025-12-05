# 🎨 Globální Tooltip Systém

Jednotný vzhled všech tooltipů napříč aplikací s automatickou ikonkou.

## 📦 Import

```javascript
import { TooltipWrapper, Tooltip, TooltipCompact, tooltipStyles, tooltipArrowStyles } from '../styles/GlobalTooltip';
```

## 🎯 Použití

### 1. TooltipWrapper (Nejjednodušší)

Nejčastější použití - obalíte element a přidáte child s třídou `.tooltip`:

```jsx
import { TooltipWrapper } from '../styles/GlobalTooltip';

<TooltipWrapper>
  <button>Najeď na mě</button>
  <div className="tooltip">
    Načteno z databáze
  </div>
</TooltipWrapper>
```

**Výsledek:** `ℹ️ Načteno z databáze` (s ikonkou info)

### 2. Ikonky v tooltipech

Tooltip automaticky přidává ikonku. Můžete ji změnit pomocí `data-icon`:

```jsx
{/* Default - info ikona */}
<div className="tooltip">Text</div>
// Výsledek: ℹ️ Text

{/* Úspěch */}
<div className="tooltip" data-icon="success">Uloženo</div>
// Výsledek: ✅ Uloženo

{/* Varování */}
<div className="tooltip" data-icon="warning">Pozor!</div>
// Výsledek: ⚠️ Pozor!

{/* Chyba */}
<div className="tooltip" data-icon="error">Chyba</div>
// Výsledek: ❌ Chyba

{/* Databáze */}
<div className="tooltip" data-icon="database">Z databáze</div>
// Výsledek: 💾 Z databáze

{/* Cache */}
<div className="tooltip" data-icon="cache">Z cache</div>
// Výsledek: ⚡ Z cache

{/* Čas */}
<div className="tooltip" data-icon="time">244ms</div>
// Výsledek: ⏱️ 244ms

{/* Kalendář */}
<div className="tooltip" data-icon="calendar">19.10.2025</div>
// Výsledek: 📅 19.10.2025

{/* Bez ikonky (pokud už máte emoji v textu) */}
<div className="tooltip" data-icon="none">💾 Text s vlastním emoji</div>
// Výsledek: 💾 Text s vlastním emoji
```

### 3. Varianty pozicování

```jsx
{/* Tooltip nahoře */}
<TooltipWrapper>
  <button>Button</button>
  <div className="tooltip top">
    Text nahoře
  </div>
</TooltipWrapper>

{/* Tooltip vpravo */}
<TooltipWrapper>
  <button>Button</button>
  <div className="tooltip right">
    Text vpravo
  </div>
</TooltipWrapper>

{/* Tooltip vlevo */}
<TooltipWrapper>
  <button>Button</button>
  <div className="tooltip left">
    Text vlevo
  </div>
</TooltipWrapper>
```
    Text vlevo
  </div>
</TooltipWrapper>

{/* Multi-line tooltip */}
<TooltipWrapper>
  <button>Button</button>
  <div className="tooltip multiline">
    Delší text, který se může zalamovat
    na více řádků
  </div>
</TooltipWrapper>
```

### 3. Samostatný Tooltip komponent

Pro custom pozicování nebo kdy už máte vlastní wrapper:

```jsx
import { Tooltip } from '../styles/GlobalTooltip';

const MyButton = styled.button`
  position: relative;
  
  &:hover .my-tooltip {
    opacity: 1;
  }
`;

<MyButton>
  Tlačítko
  <Tooltip className="my-tooltip" $position="top" $multiline>
    Custom tooltip text
  </Tooltip>
</MyButton>
```

Props pro `Tooltip`:
- `$visible` - true/false (kontroluje viditelnost)
- `$position` - 'top' | 'bottom' | 'left' | 'right'
- `$multiline` - true/false (umožní zalamování textu)

### 4. TooltipCompact

Kompaktní verze s menším paddingem:

```jsx
import { TooltipCompact } from '../styles/GlobalTooltip';

<MyElement>
  <TooltipCompact $visible={isVisible}>
    Kompaktní tooltip
  </TooltipCompact>
</MyElement>
```

### 5. CSS Mixin (pro existující styled components)

Pokud chcete aplikovat tooltip styling na existující komponentu:

```jsx
import styled from '@emotion/styled';
import { tooltipStyles, tooltipArrowStyles } from '../styles/GlobalTooltip';

const MyTooltip = styled.div`
  position: absolute;
  ${tooltipStyles}
  
  &::after {
    ${tooltipArrowStyles('bottom')}
  }
`;
```

## 🎨 Příklady z aplikace

### Cache Status Icon (Orders25List)

**Před:**
```jsx
const CacheTooltip = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  // ... spousta CSS ...
`;

<CacheStatusIconWrapper>
  <CacheStatusIcon>
    <FontAwesomeIcon icon={faDatabase} />
  </CacheStatusIcon>
  <CacheTooltip className="cache-tooltip">
    💾 Načteno z databáze
  </CacheTooltip>
</CacheStatusIconWrapper>
```

**Po (s globálním TooltipWrapper):**
```jsx
import { TooltipWrapper } from '../styles/GlobalTooltip';

const CacheStatusIconWrapper = styled(TooltipWrapper)`
  // custom styling jen pro icon wrapper
`;

<CacheStatusIconWrapper>
  <CacheStatusIcon>
    <FontAwesomeIcon icon={faDatabase} />
  </CacheStatusIcon>
  <div className="tooltip">
    💾 Načteno z databáze
  </div>
</CacheStatusIconWrapper>
```

### Button s tooltipem

```jsx
import { TooltipWrapper } from '../styles/GlobalTooltip';

<TooltipWrapper>
  <ActionButton onClick={handleRefresh}>
    <FontAwesomeIcon icon={faSyncAlt} />
  </ActionButton>
  <div className="tooltip top">
    Obnovit data z databáze
  </div>
</TooltipWrapper>
```

### Info icon s multi-line tooltipem

```jsx
<TooltipWrapper>
  <InfoIcon>
    <FontAwesomeIcon icon={faQuestionCircle} />
  </InfoIcon>
  <div className="tooltip multiline">
    📅 Poslední načtení: {new Date().toLocaleTimeString()}
    ⏱️ Doba načtení: 244ms
  </div>
</TooltipWrapper>
```

## 🔧 Migrace existujících tooltipů

### Krok 1: Najděte všechny tooltip komponenty

```bash
grep -r "tooltip" src/ --include="*.js"
```

### Krok 2: Nahraďte vlastní styled tooltips

Hledejte vzory jako:
- `const *Tooltip = styled.div`
- `position: absolute` + `opacity: 0` + `transition`
- `&:hover .tooltip` nebo podobné

### Krok 3: Použijte globální komponentu

Přidejte import:
```javascript
import { TooltipWrapper } from '../styles/GlobalTooltip';
```

Změňte wrapper na `TooltipWrapper` nebo použijte `styled(TooltipWrapper)` pro custom styling.

## 📋 Checklist pro migraci souboru

- [ ] Import `TooltipWrapper` nebo `Tooltip` ze `../styles/GlobalTooltip`
- [ ] Smazat custom tooltip styled component
- [ ] Obalit element s tooltipem do `TooltipWrapper`
- [ ] Přidat `className="tooltip"` na tooltip element
- [ ] Přidat pozici pokud potřebná: `className="tooltip top"`
- [ ] Otestovat hover efekt

## 🎨 Výhody jednotného systému

✅ **Konzistence** - Všechny tooltips vypadají stejně  
✅ **Jednoduchá údržba** - Změna stylu na jednom místě  
✅ **Menší bundle** - Méně duplicitního CSS  
✅ **Lepší UX** - Uživatel ví, co očekávat  
✅ **Rychlejší vývoj** - Copy-paste pattern  

## 🐛 Troubleshooting

### Tooltip se nezobrazuje

- ✅ Zkontrolujte, že wrapper má `position: relative`
- ✅ Ujistěte se, že tooltip má třídu `.tooltip` nebo `.cache-tooltip`
- ✅ Zkontrolujte z-index rodičovských elementů

### Tooltip je odříznuto

- ✅ Přidejte `overflow: visible` na rodiče
- ✅ Zkontrolujte `clip-path` nebo `contain` vlastnosti

### Šipka není správně zarovnaná

- ✅ Použijte správnou pozici: `top`, `bottom`, `left`, `right`
- ✅ Pro custom pozicování použijte samostatný `Tooltip` komponent
