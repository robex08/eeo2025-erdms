# ✅ Tooltip Ikonky + UserContextMenu Ikona Podle Práv

## 🎨 1. Přidány ikonky do tooltipů

### GlobalTooltip.js - Automatická ikonka
Všechny tooltips teď mají **automaticky ikonku ℹ️** na začátku.

**CSS změny:**
```css
.tooltip::before {
  content: 'ℹ️';
  font-size: 1rem;
  flex-shrink: 0;
}

/* Flexbox layout pro ikonku + text */
display: flex;
align-items: center;
gap: 0.5rem;
```

### Varianty ikon pomocí data-icon atributu

| data-icon | Ikona | Použití |
|-----------|-------|---------|
| (default) | ℹ️ | Obecná informace |
| `info` | ℹ️ | Explicitní info |
| `success` | ✅ | Úspěch, potvrzení |
| `warning` | ⚠️ | Varování |
| `error` | ❌ | Chyba |
| `database` | 💾 | Data z databáze |
| `cache` | ⚡ | Data z cache |
| `time` | ⏱️ | Časové údaje |
| `calendar` | 📅 | Datum |
| `none` | (žádná) | Vlastní emoji v textu |

### Příklady použití

```jsx
{/* Default - automatická ℹ️ */}
<div className="tooltip">
  Text tooltipů
</div>
// Výsledek: ℹ️ Text tooltipů

{/* Úspěch */}
<div className="tooltip" data-icon="success">
  Uloženo
</div>
// Výsledek: ✅ Uloženo

{/* Bez ikonky (už máte emoji) */}
<div className="tooltip" data-icon="none">
  💾 Načteno z databáze
</div>
// Výsledek: 💾 Načteno z databáze
```

### Migrace existujících tooltipů

**Orders25List.js a Orders.js:**
```jsx
// Přidáno data-icon="none" protože text už má emoji
<div className="tooltip" data-icon="none">
  ⚡ Načteno z cache (paměti) - rychlé zobrazení bez dotazu na databázi
</div>
```

## 🗑️ 2. UserContextMenu - Ikona podle práv

### Problém
Položka "Smazat" měla vždy ikonu koše (`faTrash`), i když uživatel neměl právo USER_DELETE a akce jen deaktivovala.

### Řešení

**UserContextMenu.js - Dynamická ikona a text:**

```jsx
<MenuItem 
  danger
  onClick={() => { onDelete(user); onClose(); }}
  title={
    !canDelete 
      ? 'Nemáte oprávnění ke smazání - uživatel bude pouze deaktivován' 
      : 'Trvale smazat uživatele z databáze'
  }
>
  <FontAwesomeIcon icon={canDelete ? faTrash : faUserMinus} />
  <MenuLabel>{canDelete ? 'Smazat uživatele' : 'Deaktivovat uživatele'}</MenuLabel>
</MenuItem>
```

### Stavy

| Právo USER_DELETE | Ikona | Text | Akce |
|-------------------|-------|------|------|
| ✅ ANO | 🗑️ `faTrash` | "Smazat uživatele" | Hard delete z DB |
| ❌ NE | 👤➖ `faUserMinus` | "Deaktivovat uživatele" | Soft delete (aktivni=0) |

### Změny v importech

```javascript
import { 
  faEdit, 
  faTrash,        // Košťák - hard delete
  faUserCheck,    // Povolit
  faUserSlash,    // Zakázat
  faUserMinus,    // Deaktivovat (soft delete)
  faBan          // Pro budoucí použití
} from '@fortawesome/free-solid-svg-icons';
```

### Odebrán disabled stav

**Před:**
```jsx
<MenuItem 
  danger 
  disabled={!canDelete}  // ← bylo disabled
  onClick={() => { if (canDelete) { onDelete(user); onClose(); } }}
>
```

**Po:**
```jsx
<MenuItem 
  danger
  onClick={() => { onDelete(user); onClose(); }}  // ← vždy aktivní
>
```

**Důvod:** I bez práva USER_DELETE má smysl kliknout - provede soft delete (deaktivaci).

## 📊 Vizuální výsledek

### Tooltip s ikonkou
```
┌─────────────────────────────────┐
│ ℹ️ Obecná informace             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ Úspěšně uloženo               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠️ Varování: kontrola dat       │
└─────────────────────────────────┘
```

### Context menu s právy
```
┌──────────────────────────────┐
│ ✏️  Editovat uživatele       │
├──────────────────────────────┤
│ ✅  Povolit uživatele         │
├──────────────────────────────┤
│ 🗑️  Smazat uživatele          │  ← Má USER_DELETE
└──────────────────────────────┘

┌──────────────────────────────┐
│ ✏️  Editovat uživatele       │
├──────────────────────────────┤
│ ❌  Zakázat uživatele         │
├──────────────────────────────┤
│ 👤➖ Deaktivovat uživatele    │  ← Nemá USER_DELETE
└──────────────────────────────┘
```

## 🧪 Testování

### 1. Tooltips s ikonkami
1. Otevřete Orders25List nebo Orders
2. Najeďte na ikonu cache/database v hlavičce
3. Měli byste vidět tooltip **BEZ** extra ℹ️ (protože má `data-icon="none"`)

### 2. Context menu ikony
1. Otevřete Users stránku
2. Pravý klik na uživatele:
   - **S právem USER_DELETE**: Měli byste vidět 🗑️ "Smazat uživatele"
   - **Bez práva USER_DELETE**: Měli byste vidět 👤➖ "Deaktivovat uživatele"

## 📝 Soubory změněny

1. ✅ `/src/styles/GlobalTooltip.js` - Přidána ikonka a data-icon varianty
2. ✅ `/src/styles/TOOLTIP-USAGE.md` - Aktualizována dokumentace
3. ✅ `/src/components/UserContextMenu.js` - Dynamická ikona podle práv
4. ✅ `/src/pages/Orders25List.js` - Přidán `data-icon="none"`
5. ✅ `/src/pages/Orders.js` - Přidán `data-icon="none"`

## 🎯 Co to přináší

✅ **Tooltips:** Jednotný vzhled s info ikonkou  
✅ **UX:** Jasně viditelné varování/úspěch/chyby  
✅ **Context menu:** Vizuálně rozpoznatelné práva  
✅ **Konzistence:** Ikona = akce (koš = smazat, user minus = deaktivovat)  
✅ **Přístupnost:** Lepší pochopení toho, co se stane při kliku
