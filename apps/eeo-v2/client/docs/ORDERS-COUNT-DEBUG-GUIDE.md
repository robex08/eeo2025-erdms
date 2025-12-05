# SHRNUTÍ ZMĚN - Users.js

## Implementované změny:

### 1. ✅ TELEFON ZA EMAILEM
- Telefon je již správně umístěn jako sloupec za emailem v tabulce
- Mapování: `user.phone || user.telefon || 'N/A'`

### 2. ✅ POČTY OBJEDNÁVEK Z API
- Implementován sloupec "Objednávky" s načítáním z API `/orders25/count-by-user`
- Optimalizované načítání s live update
- Lepší indikace loading stavu s animací
- Debug informace pro troubleshooting

### 3. ✅ VYLEPŠENÍ UX
- Tlačítko pro manuální obnovení počtů objednávek
- Animace loading (pulse efekt)
- Statistiky objednávek v dashboard
- Detailní debug informace

### 4. ✅ TEST NÁSTROJE  
- Vytvořen test soubor `test-debug/test-orders-count-api.js`
- Tlačítko "Test API" pro rychlé testování
- Konzolové funkce pro debug

## Možné příčiny problému "Nenačítají se počty":

### 1. 🔍 API ENDPOINT PROBLÉMY
```
Možné příčiny:
- API endpoint `/orders25/count-by-user` neexistuje nebo vrací chybu
- Chybný token nebo username
- CORS problémy
- Chybné user_id (null, undefined)
```

### 2. 🔍 SÍŤOVÉ/PERFORMANCE PROBLÉMY  
```
Možné příčiny:
- Pomalé API (volá se pro každého uživatele zvlášť)
- Timeout requestů
- Rate limiting na serveru
- Síťové výpadky
```

### 3. 🔍 FRONTEND PROBLÉMY
```
Možné příčiny:
- React state se neaktualizuje správně  
- useEffect se nespouští (chybné dependencies)
- Chyby v konzoli blokují execution
- Mapování user.id vs API očekává jiné ID
```

## DOPORUČENÝ DEBUGGING POSTUP:

### Krok 1: Zkontrolujte konzoli
```javascript
// Otevřete F12 a hledejte:
// ✅ "Users > Starting to fetch orders counts for X users"
// ❌ Chybové zprávy červeně
```

### Krok 2: Test API manuálně
```javascript
// V konzoli spusťte:
testOrdersCountAPI()
// nebo zkopírujte kód z test-debug/test-orders-count-api.js
```

### Krok 3: Zkontrolujte auth data
```javascript
// V konzoli:
const auth = JSON.parse(localStorage.getItem('auth') || '{}');
console.log('Auth:', { hasToken: !!auth.token, username: auth.username });
```

### Krok 4: Zkontrolujte user IDs
```javascript
// V debug panelu (tlačítko "Debug data") se podívejte na:
// - Jsou všichni uživatelé načtení?
// - Mají platné ID?
// - Odpovídá API struktura očekávané?
```

### Krok 5: Network tab
```
1. Otevřete F12 → Network tab
2. Klikněte "Obnovit" nebo "Objednávky" 
3. Hledejte requesty na "count-by-user"
4. Zkontrolujte status codes a responses
```

## RYCHLÉ OPRAVY:

### Pokud API neexistuje:
```javascript
// Dočasně v fetchOrdersCounts přidejte:
counts[user.id] = Math.floor(Math.random() * 50); // Mock data
```

### Pokud jsou chybné user_id:
```javascript
// Zkontrolujte v debug panelu mapování ID
// Případně upravte v fetchOrdersCounts:
user_id: user.user_id || user.id
```

### Pokud je API pomalé:
```javascript
// Přidejte paralelní zpracování místo sekvenčního:
const promises = users.map(user => getOrdersCountByUser(...));
const results = await Promise.allSettled(promises);
```

## KONTAKTNÍ BODY PRO PODPORU:

1. **Backend tým**: Zkontrolovat API endpoint `/orders25/count-by-user`
2. **DB tým**: Ověřit tabulku objednávek a user_id references  
3. **DevOps**: Zkontrolovat logy serveru pro rate limiting/chyby

## TESTING COMMANDS:
```javascript
// V konzoli:
testOrdersCountAPI()              // Test jednoho uživatele
testMultipleUsersOrdersCount()    // Test více uživatelů  
testUsingImportedFunction()       // Test přes importovanou funkci
```