# User-Specific localStorage Isolation

## Datum implementace
15. října 2025

## Popis problému
localStorage je sdílený napříč všemi záložkami stejného browseru a domény. Pokud se v jedné záložce přihlásí uživatel A a v druhé záložce uživatel B, mohli by sdílet koncepty objednávek, nastavení a další data, což je **bezpečnostní riziko**.

## Řešení
Implementován systém pro **izolaci dat jednotlivých uživatelů** v localStorage:

### 1. Nový utility modul: `src/utils/userStorage.js`

Obsahuje funkce pro správu user-specific localStorage:

- `getCurrentUserId()` - Získá ID aktuálně přihlášeného uživatele
- `setCurrentUserId(userId)` - Nastaví ID aktuálního uživatele
- `clearUserData(userId)` - Vyčistí všechna data konkrétního uživatele
- `checkAndCleanUserChange(newUserId)` - Detekuje změnu uživatele a vyčistí data předchozího
- `clearAllUserData()` - Vyčistí všechna user-specific data (při odhlášení)
- `migrateOldUserData(userId)` - Migrace starých klíčů bez user_id

### 2. Integrace do AuthContext

**Přihlášení (`login`):**
```javascript
// Zkontroluj změnu uživatele a vyčisti data předchozího uživatele
const userChanged = checkAndCleanUserChange(loginData.id);

// Migrace starých dat bez user_id na nové s user_id
migrateOldUserData(loginData.id);
```

**Odhlášení (`logout`):**
```javascript
// Vyčistit všechna user-specific data z localStorage
clearAllUserData();
```

**Inicializace aplikace:**
```javascript
// Zkontroluj, jestli je to stále stejný uživatel
checkAndCleanUserChange(storedUser.id);
```

### 3. Oprava localStorage klíčů

**OrderForm25.js:**
- ✅ `order25-draft-${user_id}` - koncept objednávky
- ✅ `order25-sections-${user_id}` - stav sekcí
- ✅ `order25-scroll-${user_id}` - pozice scrollu
- ✅ `order25-phase2-unlocked-${user_id}` - unlock stav
- ✅ `highlightOrderId-${user_id}` - zvýraznění objednávky (OPRAVENO)

**Orders25List.js:**
- ✅ `highlightOrderId-${user_id}` - čtení zvýrazněné objednávky (OPRAVENO)

### 4. Bezpečnostní mechanismus

#### Detekce změny uživatele:
1. Při každém přihlášení se zkontroluje `app_current_user_id` v localStorage
2. Pokud je jiný než nově přihlášený uživatel → **vyčistí se všechna data předchozího uživatele**
3. Nastaví se nový `app_current_user_id`

#### Vyčištění dat:
Při detekci změny uživatele se smažou všechny klíče obsahující:
- `order25-draft-{OLD_USER_ID}`
- `order25-sections-{OLD_USER_ID}`
- `order25-scroll-{OLD_USER_ID}`
- `order25-phase2-unlocked-{OLD_USER_ID}`
- `highlightOrderId-{OLD_USER_ID}`
- a další user-specific klíče

#### Při odhlášení:
- Vyčistí se **všechna data aktuálního uživatele**
- Odstraní se `app_current_user_id`
- Vyčistí se i obecné klíče (`highlightOrderId`, `order_draft`, atd.)

### 5. Migrace starých dat

Pro zpětnou kompatibilitu se při přihlášení migrují stará data:
```
order_draft → order25-draft-{user_id}
order_sections → order25-sections-{user_id}
order_scroll → order25-scroll-{user_id}
```

## Výhody řešení

✅ **Bezpečnost**: Každý uživatel má izolovaná data
✅ **Multi-tab support**: Uživatel může mít více záložek s různými uživateli
✅ **Automatické čištění**: Data se automaticky čistí při změně uživatele
✅ **Zpětná kompatibilita**: Migrace starých dat bez user_id
✅ **Konzistence**: Všechny klíče jsou vázány na user_id

## Scénáře použití

### Scénář 1: Přepnutí uživatele ve stejném prohlížeči
1. Uživatel A je přihlášen → `app_current_user_id = 123`
2. Uživatel A se odhlásí → vyčistí se data uživatele 123
3. Uživatel B se přihlásí → `app_current_user_id = 456`
4. ✅ Uživatel B nevidí koncepty uživatele A

### Scénář 2: Více záložek se stejným uživatelem
1. Záložka 1: Uživatel A je přihlášen → `app_current_user_id = 123`
2. Záložka 2: Uživatel A načte stránku → zjistí `app_current_user_id = 123` → **SDÍLÍ DATA**
3. ✅ Uživatel A vidí své koncepty v obou záložkách

### Scénář 3: Více záložek s různými uživateli
1. Záložka 1: Uživatel A je přihlášen → `app_current_user_id = 123`
2. Záložka 2: Uživatel B se přihlásí → detekuje změnu → vyčistí data 123 → `app_current_user_id = 456`
3. Záložka 1: Obnoví se → detekuje změnu → data uživatele A jsou již vyčištěna
4. ✅ Každý uživatel má svá vlastní data

## Změněné soubory

1. **src/utils/userStorage.js** (NOVÝ) - Utility pro správu user-specific localStorage
2. **src/context/AuthContext.js** - Integrace detekce změny uživatele
3. **src/forms/OrderForm25.js** - Oprava `highlightOrderId` na user-specific
4. **src/pages/Orders25List.js** - Oprava čtení `highlightOrderId` na user-specific

## Testování

### Manuální test:
1. Přihlaste se jako Uživatel A
2. Vytvořte koncept objednávky
3. Odhlaste se
4. Přihlaste se jako Uživatel B
5. ✅ Ověřte, že Uživatel B nevidí koncept Uživatele A
6. Vytvořte koncept jako Uživatel B
7. Otevřte novou záložku a přihlaste se jako Uživatel A
8. ✅ Ověřte, že data Uživatele B byla vyčištěna

### Dev console test:
```javascript
// Zkontroluj aktuálního uživatele
localStorage.getItem('app_current_user_id')

// Zkontroluj všechny order25 klíče
Object.keys(localStorage).filter(k => k.includes('order25'))
```

## Poznámky

- **sessionStorage**: Token a citlivá data zůstávají v sessionStorage (automaticky se mažou při zavření okna)
- **localStorage**: Používá se pro koncepty, preference a nastavení (perzistentní)
- **Šifrování**: Data v localStorage mohou být šifrovaná (podle `encryptionConfig.js`)

## Možná vylepšení (budoucnost)

1. **Broadcast Channel API**: Komunikace mezi záložkami pro real-time sync
2. **IndexedDB**: Pro větší množství dat (přílohy, cache)
3. **Server-side storage**: Ukládání konceptů na server místo localStorage
