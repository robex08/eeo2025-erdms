# 🐛 UserContextMenu - Fix dynamické změny textu "Povolit/Zakázat"

## Problém
Context menu uživatelů se sice správně otevírá, ale text položky se dynamicky nemění podle stavu uživatele (Povolit vs. Zakázat).

## Příčina
Detekce stavu uživatele v `UserContextMenu.js` kontrolovala pouze `is_active` a `aktivni`, ale v `Users.js` jsou data namapována do pole `active` (boolean).

## Řešení

### 1. Opravena detekce stavu v UserContextMenu.js

**Před:**
```javascript
const isActive = user?.is_active === 1 || user?.is_active === true || user?.aktivni === 1 || user?.aktivni === true;
```

**Po:**
```javascript
const isActive = 
  user?.active === true ||       // ← PŘIDÁNO - primární pole z Users.js
  user?.active === 1 || 
  user?.is_active === 1 || 
  user?.is_active === true || 
  user?.aktivni === 1 || 
  user?.aktivni === true;
```

### 2. Přidán debug log pro kontrolu

**UserContextMenu.js:**
```javascript
console.log('🔍 UserContextMenu - Detekce stavu:', {
  username: user?.username,
  active: user?.active,
  is_active: user?.is_active,
  aktivni: user?.aktivni,
  isActive: isActive
});
```

**Users.js:**
```javascript
console.log('🖱️ Users.js - Context menu opened for user:', {
  username: user.username,
  active: user.active,
  fullUser: user
});
```

## Testování

### 1. Otevřete Users stránku
Navigujte na stránku se seznamem uživatelů.

### 2. Zkuste pravý klik na aktivního uživatele
- Měl by se objevit text: **"Zakázat uživatele"** ❌
- Ikona: `faUserSlash` (červená)
- V konzoli by mělo být: `isActive: true`

### 3. Zkuste pravý klik na neaktivního uživatele
- Měl by se objevit text: **"Povolit uživatele"** ✅
- Ikona: `faUserCheck` (zelená)
- V konzoli by mělo být: `isActive: false`

### 4. Zkontrolujte konzoli
V DevTools konzoli byste měli vidět:
```
🖱️ Users.js - Context menu opened for user: { username: "...", active: true/false, ... }
🔍 UserContextMenu - Detekce stavu: { username: "...", active: true/false, isActive: true/false }
```

## Mapování dat v Users.js

V `fetchUsers()` funkci na řádku ~1079:
```javascript
const processedData = data.map((user) => ({
  // ...
  active: user.aktivni === 1 || user.aktivni === '1' || user.aktivni === true || user.active === 'a' || user.active === true,
  // ...
}));
```

Data z API (`aktivni`) jsou převedena na `active` (boolean).

## Varianty polí

UserContextMenu teď podporuje všechny možné varianty:
- ✅ `active` - používá Users.js
- ✅ `is_active` - může přijít z jiných API
- ✅ `aktivni` - původní API pole

## Očekávaný výsledek

| Stav uživatele | Text v menu | Ikona | Barva |
|----------------|-------------|-------|-------|
| Aktivní (`active: true`) | "Zakázat uživatele" | faUserSlash | Červená |
| Neaktivní (`active: false`) | "Povolit uživatele" | faUserCheck | Zelená |

## Odstranění debug logů

Po ověření funkčnosti můžete odstranit console.log:
```bash
# V UserContextMenu.js - řádky ~128-135
# V Users.js - řádky ~1862-1867
```

Nebo ponechejte pro debugging budoucích problémů.
