# API Dokumentace - TODO a Poznámky

## Přehled

Nové API endpointy pro ukládání a načítání TODO a poznámek uživatelů. API je navrženo s důrazem na bezpečnost a jednoduchost použití.

## Endpointy

### 1. LOAD - Načítání dat
**URL:** `/api.eeo/load`  
**Metoda:** `POST`  
**Content-Type:** `application/json`

#### Parametry
```json
{
  "token": "string",     // Povinný - uživatelský token
  "username": "string",  // Povinný - uživatelské jméno
  "typ": "string"        // Povinný - 'TODO' nebo 'NOTES'
}
```

#### Odpověď při úspěchu
```json
{
  "status": "ok",
  "data": {
    // Pro TODO - přímo pole objektů:
    [
      {
        "id": 1667123456789,
        "text": "Dokončit projekt", 
        "done": false,
        "createdAt": 1667123456789
      }
    ],
    
    // Pro NOTES - objekt s metadaty:
    {
      "content": "Obsah poznámek...",
      "lastModified": 1667123456789,
      "length": 18,
      "type": "text/plain"
    }
  }
}
```

#### Odpověď při chybě
```json
{
  "status": "error",
  "message": "Popis chyby"
}
```

### 2. SAVE - Ukládání dat
**URL:** `/api.eeo/save`  
**Metoda:** `POST`  
**Content-Type:** `application/json`

#### Parametry
```json
{
  "token": "string",     // Povinný - uživatelský token
  "username": "string",  // Povinný - uživatelské jméno
  "typ": "string",       // Povinný - 'TODO' nebo 'NOTES'
  "obsah": "mixed"       // Povinný - data k uložení (Array pro TODO, String/Object pro NOTES)
}
```

#### Příklad TODO dat
```json
{
  "token": "abc123...",
  "username": "user123",
  "typ": "TODO",
  "obsah": [
    {
      "id": 1667123456789,
      "text": "Dokončit projekt",
      "done": false,
      "createdAt": 1667123456789
    },
    {
      "id": 1667123456790,
      "text": "Zavolat klientovi",
      "done": true,
      "createdAt": 1667123456790
    }
  ]
}
```

#### Příklad NOTES dat
```json
{
  "token": "abc123...",
  "username": "user123",
  "typ": "NOTES",
  "obsah": {
    "content": "Tyto poznámky budou uloženy na server...",
    "lastModified": 1667123456789,
    "length": 45,
    "type": "text/plain"
  }
}
```

**Poznámka:** Poznámky se automaticky zabalí do JSON objektu s metadaty. Backend přijímá typ proměnné TEXT, ale obsah musí být validní JSON.

#### Odpověď při úspěchu
```json
{
  "status": "ok",
  "message": "TODO úspěšně uloženo" // nebo "NOTES úspěšně uloženo"
}
```

## Chybové kódy

| HTTP Status | Popis | Řešení |
|-------------|-------|--------|
| 200 | Úspěch | - |
| 400 | Neplatné parametry | Zkontrolujte formát a kompletnost dat |
| 401 | Neplatný token | Přihlaste se znovu |
| 403 | Nedostatečná oprávnění | Kontaktujte administrátora |
| 404 | Data nenalezena | Při načítání - data ještě neexistují |
| 500 | Chyba serveru | Zkuste později nebo kontaktujte podporu |

## Bezpečnost

### Ověření tokenu
- Všechny požadavky vyžadují platný token
- Token se ověřuje proti databázi aktivních sessions
- Kontroluje se shoda username z tokenu s username z požadavku

### Validace vstupů
- Typ musí být přesně 'TODO' nebo 'NOTES' (case-sensitive)
- Obsah nesmí být null nebo undefined
- Maximální velikost obsahu: 1MB

### Rate limiting
- Maximálně 100 požadavků za minutu na uživatele
- Při překročení: HTTP 429 Too Many Requests

## JavaScript API

### Základní použití

```javascript
// Import funkcí
import { loadTodoData, saveTodoData, loadNotesData, saveNotesData } from './services/api2auth.js';

// Načtení TODO
try {
  const todoData = await loadTodoData({ 
    token: 'user_token', 
    username: 'username' 
  });
  console.log('TODO data:', todoData);
} catch (error) {
  console.error('Chyba při načítání TODO:', error.message);
}

// Uložení TODO
const newTodos = [
  { id: Date.now(), text: 'Nový úkol', done: false, createdAt: Date.now() }
];

try {
  await saveTodoData({ 
    token: 'user_token', 
    username: 'username', 
    obsah: newTodos 
  });
  console.log('TODO uloženo');
} catch (error) {
  console.error('Chyba při ukládání TODO:', error.message);
}

// Načtení poznámek
try {
  const notesData = await loadNotesData({ 
    token: 'user_token', 
    username: 'username' 
  });
  console.log('Poznámky:', notesData);
} catch (error) {
  console.error('Chyba při načítání poznámek:', error.message);
}

// Uložení poznámek
try {
  await saveNotesData({ 
    token: 'user_token', 
    username: 'username', 
    obsah: 'Obsah poznámek...' 
  });
  console.log('Poznámky uloženy');
} catch (error) {
  console.error('Chyba při ukládání poznámek:', error.message);
}
```

### Použití třídy NotesAPI

```javascript
import { NotesAPI } from './services/NotesAPI.js';

// Vytvoření instance
const api = new NotesAPI('user_token', 'username');

// Načtení a uložení TODO
const todoData = await api.loadTodo();
await api.saveTodo([
  { id: 1, text: 'Úkol 1', done: false, createdAt: Date.now() },
  { id: 2, text: 'Úkol 2', done: true, createdAt: Date.now() }
]);

// Načtení a uložení poznámek
const notesData = await api.loadNotes();
await api.saveNotes('Nové poznámky...');

// Synchronizace s lokálními daty
const syncResult = await api.syncTodos(localTodosArray);
if (syncResult.saved) {
  console.log('TODO synchronizovány');
} else if (syncResult.error) {
  console.error('Chyba při synchronizaci:', syncResult.error);
}
```

### Pokročilé funkce

```javascript
// Manuální synchronizace (v Layout komponenta)
const handleManualSync = async () => {
  try {
    const result = await manualServerSync();
    console.log('Synchronizace dokončena:', result);
  } catch (error) {
    console.error('Chyba při synchronizaci:', error);
  }
};

// Sledování stavu synchronizace
console.log('Stav synchronizace:', serverSyncStatus);
// {
//   notes: { syncing: false, lastSync: 1667123456789, error: null },
//   todo: { syncing: false, lastSync: 1667123456789, error: null }
// }

// Kontrola dostupnosti server API
if (hasServerAPI) {
  console.log('Server API je dostupné');
} else {
  console.log('Pracujeme v offline režimu');
}
```

## Integrace do stávající aplikace

### 1. Automatická synchronizace
- Data se automaticky synchronizují při přihlášení uživatele
- Poznámky se ukládají na server při každé změně (600ms debounce)
- TODO se ukládá při odhlášení nebo zavření aplikace

### 2. Fallback mechanismus
- Pokud server není dostupný, data se ukládají pouze lokálně
- Při obnovení spojení se data automaticky synchronizují
- Uživatel je informován o stavu synchronizace

### 3. Offline podpora
- Aplikace funguje plně i bez připojení k serveru
- Lokální data jsou zachována v localStorage/secureStorage
- Po obnovení spojení se automaticky synchronizuje

## Migrace stávajících dat

Stávající aplikace automaticky migruje data:

1. **LocalStorage → Server**: Při prvním přihlášení se lokální data nahrají na server
2. **Bezpečné úložiště**: Citlivá data se postupně přesunou do šifrovaného úložiště
3. **Zachování kompatibility**: Stará data zůstávají funkční během migrace

## Testování

### Curl příklady

```bash
# Načtení TODO
curl -X POST "https://eeo.zachranka.cz/api.eeo/load" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_token_here",
    "username": "your_username", 
    "typ": "TODO"
  }'

# Uložení poznámek
curl -X POST "https://eeo.zachranka.cz/api.eeo/save" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_token_here",
    "username": "your_username",
    "typ": "NOTES",
    "obsah": "Testovací poznámky..."
  }'
```

### JavaScript testování

```javascript
// Test načítání a ukládání
async function testAPI() {
  const token = 'your_token';
  const username = 'your_username';
  
  try {
    // Test TODO
    console.log('Testování TODO...');
    const todos = await loadTodoData({ token, username });
    console.log('Načtené TODO:', todos);
    
    await saveTodoData({ 
      token, 
      username, 
      obsah: [{ id: Date.now(), text: 'Test úkol', done: false, createdAt: Date.now() }]
    });
    console.log('TODO uloženo');
    
    // Test Notes
    console.log('Testování poznámek...');
    const notes = await loadNotesData({ token, username });
    console.log('Načtené poznámky:', notes);
    
    await saveNotesData({ 
      token, 
      username, 
      obsah: 'Testovací poznámky z ' + new Date().toLocaleString() 
    });
    console.log('Poznámky uloženy');
    
  } catch (error) {
    console.error('Test selhal:', error);
  }
}

// Spuštění testu
testAPI();
```

## Podpora a řešení problémů

### Časté problémy

1. **"Neplatný přístupový token"**
   - Řešení: Přihlaste se znovu
   - Příčina: Token vypršel nebo je neplatný

2. **"Chyba na serveru"** 
   - Řešení: Zkuste později nebo kontaktujte podporu
   - Příčina: Dočasný výpadek serveru

3. **"Neplatný typ dat"**
   - Řešení: Použijte přesně 'TODO' nebo 'NOTES'
   - Příčina: Chyba v parametru typ

### Logování a debugging

```javascript
// Zapnutí podrobného logování
window.localStorage.setItem('api_debug', 'true');

// Sledování API volání
window.addEventListener('apiDebug', (event) => {
  console.log('API Debug:', event.detail);
});
```

---

*Dokumentace vytvořena pro EEO 2025 - API verze 1.0.0*