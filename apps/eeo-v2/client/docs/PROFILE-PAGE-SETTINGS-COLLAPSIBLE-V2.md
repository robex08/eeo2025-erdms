# ProfilePage Settings - Collapsible sekce a rozdělení tlačítek

## 📝 Přehled změn

Implementováno rozdělení funkcionalit uložení a aplikace nastavení + sbalovací sekce v Settings tabu.

---

## ✨ Nové funkce

### 1. **Rozdělení tlačítek**

#### **Tlačítko 1: "Uložit nastavení"**
- **Barva:** Modrý gradient (#3b82f6 → #2563eb)
- **Funkce:** `saveSettingsToDatabase()`
- **Chování:** 
  - Uloží nastavení do DB přes API POST
  - **NEREFRESHUJE** stránku
  - Toast: "Nastavení bylo úspěšně uloženo do databáze"
- **Použití:** Uložit změny bez restartu aplikace

#### **Tlačítko 2: "Aplikovat změny"**
- **Barva:** Fialový gradient (#667eea → #764ba2)
- **Funkce:** `applySettings()`
- **Chování:**
  - Načte nastavení z DB do localStorage
  - **REFRESHUJE** stránku po 800ms
  - Toast: "Aplikuji nastavení z databáze..."
- **Použití:** Načíst uložená nastavení z DB a restartovat aplikaci

---

### 2. **Sbalovací sekce (Collapsible Sections)**

#### **Implementované sekce:**
1. **Chování a předvolby aplikace** - klíč: `chovani`
2. **Zobrazení stavových dlaždic** - klíč: `dlazice`
3. **Export a formáty dat** - klíč: `export`

#### **UI elementy:**
- **Ikona:** `ChevronDown` (když je sbaleno) / `ChevronUp` (když je rozbaleno)
- **Pozice:** Vpravo v `SettingsSectionTitle`
- **Interakce:** Kliknutí na celý title toggle stav

#### **localStorage persistence:**
- **Klíč:** `settings_collapsed_sections_{userId}`
- **Formát:** `{ "chovani": false, "dlazice": true, "export": false }`
- **Autoload:** Při mount komponenty načte z localStorage
- **Autosave:** Při změně stavu okamžitě ukládá

---

## 🎨 Styled Components

### **SpinningIcon**
```javascript
const SpinningIcon = styled.span`
  display: inline-block;
  animation: ${spinAnimation} 1s linear infinite;
`;
```

### **CollapsibleContent**
```javascript
const CollapsibleContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '5000px'};
  overflow: hidden;
  transition: max-height 0.4s ease-in-out;
  opacity: ${props => props.$collapsed ? '0' : '1'};
  transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out;
`;
```

### **SettingsSectionTitle (upraveno)**
```javascript
const SettingsSectionTitle = styled.h3`
  /* ... existing styles ... */
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    color: #3b82f6;
  }

  svg:last-child {
    margin-left: auto;
    transition: transform 0.3s ease;
  }
`;
```

---

## 🔧 React State

### **Collapsed sections state:**
```javascript
const [collapsedSections, setCollapsedSections] = useState(() => {
  try {
    const saved = localStorage.getItem(`settings_collapsed_sections_${user_id || 'default'}`);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
});
```

### **Toggle function:**
```javascript
const toggleSection = (sectionKey) => {
  setCollapsedSections(prev => {
    const newState = { ...prev, [sectionKey]: !prev[sectionKey] };
    try {
      localStorage.setItem(`settings_collapsed_sections_${user_id || 'default'}`, JSON.stringify(newState));
    } catch (e) {
      console.error('Chyba při ukládání collapsed state:', e);
    }
    return newState;
  });
};
```

### **Loading states:**
```javascript
const [isSavingSettings, setIsSavingSettings] = useState(false);
const [isApplyingSettings, setIsApplyingSettings] = useState(false);
```

---

## 📡 API funkce

### **saveSettingsToDatabase() - Uložit bez reloadu**
```javascript
const saveSettingsToDatabase = async () => {
  if (!user?.id || !token || !user?.username) {
    showToast('Chyba: Není k dispozici uživatel nebo token', 'error');
    return;
  }

  setIsSavingSettings(true);

  try {
    const { saveUserSettings, transformFrontendToBackend } = await import('../services/userSettingsApi');
    const backendData = transformFrontendToBackend(userSettings);

    await saveUserSettings({
      token,
      username: user.username,
      userId: user.id,
      nastaveni: backendData
    });

    showToast('Nastavení bylo úspěšně uloženo do databáze', 'success');
  } catch (error) {
    console.error('Chyba při ukládání nastavení:', error);
    showToast('Chyba při ukládání nastavení: ' + (error.message || 'Neznámá chyba'), 'error');
  } finally {
    setIsSavingSettings(false);
  }
};
```

### **applySettings() - Načíst z DB a reload**
```javascript
const applySettings = async () => {
  if (!user?.id || !token || !user?.username) {
    showToast('Chyba: Není k dispozici uživatel nebo token', 'error');
    return;
  }

  setIsApplyingSettings(true);

  try {
    const { fetchUserSettings } = await import('../services/userSettingsApi');

    // Načti nastavení z DB do localStorage
    await fetchUserSettings({
      token,
      username: user.username,
      userId: user.id
    });

    showToast('Aplikuji nastavení z databáze...', 'success');

    // Reload aplikace po 800ms
    setTimeout(() => {
      window.location.reload();
    }, 800);

  } catch (error) {
    console.error('Chyba při aplikování nastavení:', error);
    showToast('Chyba při aplikování nastavení: ' + (error.message || 'Neznámá chyba'), 'error');
    setIsApplyingSettings(false);
  }
};
```

---

## 🎯 Použití v JSX

### **Collapsible sekce pattern:**
```jsx
<SettingsSection>
  <SettingsSectionTitle onClick={() => toggleSection('chovani')}>
    <Sliders size={22} />
    Chování a předvolby aplikace
    {collapsedSections.chovani ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
  </SettingsSectionTitle>

  <CollapsibleContent $collapsed={collapsedSections.chovani}>
    <SettingsGrid>
      {/* Obsah sekce */}
    </SettingsGrid>
  </CollapsibleContent>
</SettingsSection>
```

### **Tlačítka:**
```jsx
<div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
  
  {/* Tlačítko 1: Uložit */}
  <div style={{ flex: '1', minWidth: '300px', /* modrý gradient */ }}>
    <SaveButton onClick={saveSettingsToDatabase} disabled={isSavingSettings}>
      {isSavingSettings ? 'Ukládám...' : 'Uložit do databáze'}
    </SaveButton>
  </div>

  {/* Tlačítko 2: Aplikovat */}
  <div style={{ flex: '1', minWidth: '300px', /* fialový gradient */ }}>
    <SaveButton onClick={applySettings} disabled={isApplyingSettings}>
      {isApplyingSettings ? 'Aplikuji...' : 'Obnovit aplikaci'}
    </SaveButton>
  </div>

</div>
```

---

## 🔄 Workflow

### **Scénář 1: Uložení bez restartu**
1. Uživatel upraví nastavení v UI
2. Klikne "Uložit nastavení" (modrý button)
3. API POST → DB update
4. Toast "Nastavení bylo úspěšně uloženo"
5. **Stránka zůstane stejná** (bez reloadu)
6. Změny se NEPROJEVÍ v aplikaci (např. filtry, dlaždice)

### **Scénář 2: Aplikování změn**
1. Uživatel má uložená nastavení v DB
2. Klikne "Aplikovat změny" (fialový button)
3. API GET → načte z DB do localStorage
4. Toast "Aplikuji nastavení z databáze..."
5. Po 800ms → `window.location.reload()`
6. Aplikace načte nastavení z localStorage
7. **Změny jsou aktivní** (viditelné dlaždice, filtry, CSV sloupce atd.)

### **Scénář 3: Collapsible sections**
1. Uživatel klikne na "Chování a předvolby aplikace"
2. Sekce se sbalí (animace: max-height 0, opacity 0)
3. Stav uložen do localStorage: `{ "chovani": true }`
4. Při refresh/mount → sekce zůstane sbalená
5. Další klik → sekce se rozbalí

---

## 📂 Závislosti

### **Nové importy:**
```javascript
import { ChevronDown, ChevronUp } from 'lucide-react';
```

### **API services:**
- `saveUserSettings()` - POST nastavení do DB
- `fetchUserSettings()` - GET nastavení z DB
- `transformFrontendToBackend()` - Transformace formátu

### **localStorage keys:**
- `settings_collapsed_sections_{userId}` - Stav sbalení sekcí
- `user_settings_{userId}` - Samotná nastavení (z API)

---

## ✅ Testovací checklist

- [ ] Kliknutí na title sekce toggle collapsed state
- [ ] Ikona šipky se mění (ChevronDown ↔ ChevronUp)
- [ ] Collapsed state se ukládá do localStorage
- [ ] Po reloadu zůstanou sekce ve stejném stavu
- [ ] "Uložit nastavení" uloží do DB bez reloadu
- [ ] Toast se zobrazí po úspěšném uložení
- [ ] "Aplikovat změny" načte z DB a refreshne
- [ ] Po aplikaci jsou změny viditelné (dlaždice, filtry)
- [ ] Loading state zobrazí spinner
- [ ] Tlačítka jsou disabled během operace
- [ ] Obě tlačítka fungují nezávisle
- [ ] Responsive design (flex-wrap na malých obrazovkách)

---

## 🚀 Další možná vylepšení

### **1. Batch operace**
Kombinovat Save + Apply do jedné operace:
```javascript
const saveAndApply = async () => {
  await saveSettingsToDatabase();
  await applySettings();
};
```

### **2. Expand/Collapse All**
Přidat globální tlačítko pro sbalení/rozbalení všech sekcí:
```javascript
const expandAll = () => setCollapsedSections({});
const collapseAll = () => setCollapsedSections({ chovani: true, dlazice: true, export: true });
```

### **3. Smooth scroll**
Po rozbalení sekce scrollovat na její začátek:
```javascript
const toggleSection = (key) => {
  // ... toggle logic ...
  if (!newState[key]) {
    // Rozbaleno - scrolluj
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth' });
  }
};
```

### **4. Unsaved changes warning**
Varovat před refreshem když jsou neuložené změny:
```javascript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Máte neuložené změny. Opravdu chcete opustit stránku?';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

---

## 📸 Screenshot reference

### **Tlačítka (vedle sebe):**
```
┌─────────────────────────────┬─────────────────────────────┐
│   💾 Uložit nastavení       │   🔄 Aplikovat změny        │
│   (modrý gradient)          │   (fialový gradient)        │
│                             │                             │
│   Uloží do DB bez reload    │   Načte z DB + reload       │
│   ┌───────────────────────┐ │   ┌───────────────────────┐ │
│   │ Uložit do databáze    │ │   │ Obnovit aplikaci      │ │
│   └───────────────────────┘ │   └───────────────────────┘ │
└─────────────────────────────┴─────────────────────────────┘
```

### **Collapsible section (rozbaleno):**
```
┌─────────────────────────────────────────────────────────┐
│ 🎚️ Chování a předvolby aplikace         🔼            │
├─────────────────────────────────────────────────────────┤
│ [Zapamatovat filtry]          [Toggle switch ON]       │
│ [Výchozí sekce]               [Dropdown: Orders]       │
│ [Výchozí filtry stavů]        [MultiSelect]            │
└─────────────────────────────────────────────────────────┘
```

### **Collapsible section (sbaleno):**
```
┌─────────────────────────────────────────────────────────┐
│ 🎚️ Chování a předvolby aplikace         🔽            │
└─────────────────────────────────────────────────────────┘
```

---

**Datum vytvoření:** 18. 11. 2025  
**Verze:** 2.0 (Rozdělení funkcí + Collapsible UI)  
**Status:** ✅ Implementováno a připraveno k testování
