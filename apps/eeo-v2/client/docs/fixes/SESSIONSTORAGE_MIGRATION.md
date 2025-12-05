# Migrace tokenů z localStorage na sessionStorage - Implementační plán

## Přehled změn

Cílem je zvýšit bezpečnost aplikace přechodem z `localStorage` na `sessionStorage` pro ukládání citlivých autentifikačních dat (tokeny, uživatelská data). 

## Výhody sessionStorage vs localStorage

- **Bezpečnost**: Data se automaticky smažou po zavření prohlížeče
- **Ochrana před XSS**: Kratší doba života dat snižuje riziko útoků
- **Lepší privacy**: Uživatelé se musí znovu přihlásit po restartu prohlížeče

## Implementované změny

### 1. Nový utility modul: `src/utils/authStorage.js`

Vytvoření centralizované správy pro:
- Ukládání tokenů a user dat do `sessionStorage`
- Automatická migrace starých dat z `localStorage`
- Helper funkce pro bezpečný přístup k datům
- Fallback mechanismy pro chyby

### 2. Aktualizovaný AuthContext

**Hlavní změny:**
- Import nového `authStorage` modulu
- Nahrazení `localStorage` operací za `sessionStorage` operace
- Automatická migrace při prvním načtení
- Vylepšené error handling

**Klíčové funkce:**
- `saveAuthData.token()` - ukládání tokenu
- `saveAuthData.user()` - ukládání uživatelských dat  
- `loadAuthData.token()` - načítání tokenu
- `clearAuthData.all()` - vymazání všech auth dat

### 3. Migrace existujících dat

Automatická migrace se spustí při prvním načtení aplikace:

```javascript
// Migrace z localStorage do sessionStorage
migrateAuthDataToSessionStorage();
```

## Implementace v ostatních souborech

### OrderFormComponent.js

**Před:**
```javascript
const storedUser = localStorage.getItem('user');
const username = storedUser ? JSON.parse(storedUser).username : null;
```

**Po:**
```javascript
import { getStoredUsername } from '../utils/authStorage';
const username = getStoredUsername();
```

### Ostatní soubory používající localStorage pro auth data

Všechny soubory používající následující patterny je třeba aktualizovat:

1. `localStorage.getItem('token')`
2. `localStorage.getItem('user')`  
3. `localStorage.getItem('userDetail')`
4. `localStorage.getItem('userPermissions')`

**Náhrada pomocí helper funkcí:**
```javascript
import { loadAuthData, getStoredUsername, getStoredUserId } from '../utils/authStorage';

// Místo localStorage.getItem('token')
const token = loadAuthData.token();

// Místo localStorage.getItem('user')
const user = loadAuthData.user();
const username = getStoredUsername();
const userId = getStoredUserId();

// Místo localStorage.getItem('userDetail')
const userDetail = loadAuthData.userDetail();

// Místo localStorage.getItem('userPermissions')
const permissions = loadAuthData.userPermissions();
```

## Postup kompletní implementace

### Fáze 1: Základní infrastruktura ✅
- [x] Vytvoření `authStorage.js` utility
- [x] Aktualizace `AuthContext.js`
- [x] Automatická migrace dat

### Fáze 2: Aktualizace komponent ✅
- [x] Aktualizace `OrderFormComponent.js` (všech 8+ míst)
- [x] Aktualizace ostatních komponent používajících auth localStorage

### Fáze 3: Testování
- [ ] Test přechodu mezi sessionStorage/localStorage
- [ ] Test automatické migrace
- [ ] Test funkcionality po restartu prohlížeče
- [ ] Test logout/login cyklu

### Fáze 4: Deployment
- [ ] Rollout s monitoringem
- [ ] Ověření migrace na produkci

## Fallback strategie

V případě problémů lze rychle vrátit změny:

1. **Dočasný rollback**: Změnit `sessionStorage` zpět na `localStorage` v `authStorage.js`
2. **Úplný rollback**: Použít starý `AuthContext.js` ze zálohy

## Bezpečnostní aspekty

### Co se zlepší:
- Tokeny se automaticky smažou po zavření prohlížeče
- Kratší doba života citlivých dat
- Lepší ochrana před long-term XSS útoky

### Co zůstává:
- `localStorage` se nadále používá pro:
  - Drafty objednávek
  - Uživatelské preference
  - UI nastavení
  - Cache dat (ne citlivých)

## Testing checklist

- [ ] Login → token se uloží do sessionStorage
- [ ] Refresh stránky → uživatel zůstane přihlášen
- [ ] Restart prohlížeče → uživatel se musí znovu přihlásit
- [ ] Logout → všechna auth data se smažou ze sessionStorage
- [ ] Migrace → stará data z localStorage se přesunou do sessionStorage
- [ ] Error handling → aplikace nepadá při chybách storage

## Poznámky k implementaci

1. **Backwards compatibility**: Migrace je automatická a transparentní
2. **Error handling**: Všechny storage operace mají try-catch
3. **Performance**: Minimální dopad na výkon aplikace
4. **UX**: Uživatelé se musí přihlásit po restartu prohlížeče (zamýšlené chování)

## Soubory k aktualizaci

### Priorita 1 (kritické):
- `src/context/AuthContext.js` ✅
- `src/utils/authStorage.js` ✅

### Priorita 2 (časté použití):
- `src/forms/OrderFormComponent.js` 
- `src/pages/Login.js`
- `src/components/Layout.js`

### Priorita 3 (méně časté):
- Ostatní komponenty používající auth localStorage data

## CLI příkazy pro hledání souborů k aktualizaci

```bash
# Najít všechny soubory používající localStorage pro auth data
grep -r "localStorage.getItem.*token" src/
grep -r "localStorage.getItem.*user" src/
grep -r "localStorage.setItem.*token" src/
grep -r "localStorage.setItem.*user" src/
```