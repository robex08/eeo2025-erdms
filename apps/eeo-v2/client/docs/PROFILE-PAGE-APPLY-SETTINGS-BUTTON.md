# ProfilePage - Tlačítko "Aplikovat změny"

## 📝 Přehled

Přidáno tlačítko pro uložení uživatelských nastavení do databáze a obnovení aplikace v záložce **Settings** na stránce **ProfilePage**.

---

## ✨ Implementované funkce

### 1. **Styled Component - SpinningIcon**
- **Lokace:** `src/pages/ProfilePage.js`, řádek ~30
- **Účel:** Animace načítání (rotující ikona)
- **Kód:**
```javascript
const SpinningIcon = styled.span`
  display: inline-block;
  animation: ${spinAnimation} 1s linear infinite;
`;
```

### 2. **React State - isSavingSettings**
- **Lokace:** `src/pages/ProfilePage.js`, funkce `ProfilePage()`
- **Účel:** Sledování stavu ukládání (loading state)
- **Kód:**
```javascript
const [isSavingSettings, setIsSavingSettings] = useState(false);
```

### 3. **Async Function - saveAndApplySettings()**
- **Lokace:** `src/pages/ProfilePage.js`, před render return
- **Účel:** Uložení nastavení do DB a refresh aplikace
- **Logika:**
  1. Validace: kontrola `user_id`, `token`, `username`
  2. Dynamický import `userSettingsApi.js`
  3. Transformace frontend → backend format
  4. POST na API `/user/settings`
  5. Success toast notifikace
  6. Reload stránky po 1 sekundě

**Kód:**
```javascript
const saveAndApplySettings = async () => {
  if (!user_id || !token || !username) {
    showToast('Chyba: Uživatel není přihlášen', 'error');
    return;
  }

  setIsSavingSettings(true);
  
  try {
    const { saveUserSettings, transformFrontendToBackend } = await import('../services/userSettingsApi');
    const backendSettings = transformFrontendToBackend(userSettings);
    
    await saveUserSettings({
      token,
      username,
      userId: user_id,
      nastaveni: backendSettings
    });
    
    showToast('Nastavení bylo úspěšně uloženo do databáze. Aplikace se obnoví.', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Chyba při ukládání nastavení:', error);
    showToast(`Nepodařilo se uložit nastavení: ${error.message}`, 'error');
    setIsSavingSettings(false);
  }
};
```

### 4. **UI Component - Tlačítko "Aplikovat změny"**
- **Lokace:** `src/pages/ProfilePage.js`, Settings tab (před `</SettingsContainer>`)
- **Design:**
  - Gradient pozadí (fialová → purpurová)
  - Box shadow, border-radius 12px
  - Bílý text s ikonami
  - Responsive popis funkce

**Struktura:**
```jsx
<div style={{ gradient container styles }}>
  <div style={{ title styles }}>
    <Save size={20} />
    Aplikovat nastavení
  </div>
  
  <div style={{ description styles }}>
    Uloží aktuální nastavení do databáze a obnoví aplikaci...
  </div>
  
  <SaveButton 
    onClick={saveAndApplySettings}
    disabled={isSavingSettings}
    style={{ custom white button styles }}
  >
    {isSavingSettings ? (
      <>
        <SpinningIcon><RefreshCw size={16} /></SpinningIcon>
        Ukládám nastavení...
      </>
    ) : (
      <>
        <Save size={18} />
        Uložit do databáze a obnovit aplikaci
      </>
    )}
  </SaveButton>
</div>
```

---

## 🔄 Workflow

### Uživatelský scénář:
1. **Uživatel upraví nastavení** v ProfilePage → Settings tab
2. **Klikne na "Uložit do databáze a obnovit aplikaci"**
3. **Tlačítko zobrazí loading state:** "Ukládám nastavení..." + rotující ikona
4. **API volání:**
   - Endpoint: `POST /user/settings`
   - Headers: `Authorization: Bearer {token}`, `X-Username: {username}`
   - Body: `{ nastaveni: {...backend format...}, nastaveni_verze: 1 }`
5. **Success:**
   - Toast: "Nastavení bylo úspěšně uloženo..."
   - Delay 1s → `window.location.reload()`
6. **Error:**
   - Toast: "Nepodařilo se uložit nastavení: {error}"
   - Tlačítko zpět do aktivního stavu

---

## 🎨 Vzhled tlačítka

### Normální stav:
- Bílý button s modrým textem (`#667eea`)
- Ikona Save (18px)
- Text: "Uložit do databáze a obnovit aplikaci"

### Loading stav:
- Bílý button s modrým textem (60% opacity)
- Rotující ikona RefreshCw (16px)
- Text: "Ukládám nastavení..."
- Cursor: `not-allowed`

### Container styling:
- Background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Padding: 1.5rem
- Border-radius: 12px
- Box-shadow pro depth efekt
- Bílý text v headeru a popisu

---

## 📂 Závislosti

### Backend API:
- **Endpoint:** `/user/settings` (POST)
- **Dokumentace:** `podklady/API-UZIVATEL-NASTAVENI-BACKEND.md`

### Frontend Service:
- **Soubor:** `src/services/userSettingsApi.js`
- **Funkce:**
  - `saveUserSettings({ token, username, userId, nastaveni })`
  - `transformFrontendToBackend(frontendSettings)`

### AuthContext:
- Poskytuje: `user_id`, `token`, `username`
- Import: `import { AuthContext } from '../context/AuthContext'`

### ToastContext:
- Poskytuje: `showToast(message, type)`
- Import: `import { ToastContext } from '../context/ToastContext'`

---

## ✅ Testovací checklist

- [ ] Tlačítko se zobrazí v Settings tab
- [ ] Kliknutí spustí `saveAndApplySettings()`
- [ ] Loading stav zobrazí rotující ikonu
- [ ] Tlačítko je disabled během ukládání
- [ ] API volání odešle správný formát dat
- [ ] Success toast se zobrazí
- [ ] Stránka se po 1s reloadne
- [ ] Error toast se zobrazí při selhání
- [ ] Po reloadu jsou nastavení načtena z localStorage
- [ ] Po reloadu jsou nastavení aplikována v UI

---

## 🚀 Další kroky (TODO)

### 1. Načítání nastavení při mount ProfilePage
```javascript
useEffect(() => {
  const loadUserSettingsFromStorage = async () => {
    if (!user_id) return;
    
    const { loadSettingsFromLocalStorage, transformBackendToFrontend } = 
      await import('../services/userSettingsApi');
    
    const storedSettings = loadSettingsFromLocalStorage(user_id);
    
    if (storedSettings) {
      const frontendSettings = transformBackendToFrontend(storedSettings);
      setUserSettings(prev => ({ ...prev, ...frontendSettings }));
    }
  };
  
  loadUserSettingsFromStorage();
}, [user_id]);
```

### 2. Test kompletního flow:
1. Login → zkontrolovat localStorage key `user_settings_{userId}`
2. Změnit nastavení v ProfilePage
3. Kliknout "Aplikovat změny"
4. Ověřit POST request v Network tab
5. Ověřit refresh stránky
6. Ověřit, že změny jsou aplikovány
7. Logout → zkontrolovat, že localStorage je vyčištěn

---

## 📝 Poznámky

- **DEPRECATED:** Stará funkce `saveUserSettings()` - nyní je nahrazena `saveAndApplySettings()`
- **localStorage pattern:** `user_settings_${userId}`
- **Verze nastavení:** Aktuálně hardcoded na `1` (backend default)
- **Refresh důvod:** Aplikace načítá nastavení z localStorage při mount, proto je nutný reload pro aplikaci změn

---

## 🔗 Související dokumentace

1. `docs/DB-USER-SETTINGS-EXAMPLE.md` - DB schema a SQL příklady
2. `podklady/API-UZIVATEL-NASTAVENI-BACKEND.md` - PHP backend implementace
3. `src/services/userSettingsApi.js` - Frontend API service
4. `src/context/AuthContext.js` - Integration s login/logout

---

**Datum vytvoření:** 2025-11-XX  
**Verze:** 1.0  
**Status:** ✅ Implementováno, čeká na testování
