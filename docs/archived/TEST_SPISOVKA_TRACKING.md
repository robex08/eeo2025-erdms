# 🧪 Test Spisovka Tracking System

## ✅ Co bylo opraveno:

1. **API** - odstraněny JOINy na cizí DB (dokument_priloha z 10.1.1.253)
2. **Auto-tracking** - opraveno propojení podle dokument_id a názvu přílohy
3. **Badge zobrazení** - připraveno v SpisovkaInboxPanel

## 📋 Jak otestovat:

### Test 1: Automatické označení při vytvoření faktury

1. **Otevři Spisovka InBox panel** (plovoucí okno vpravo)
2. **Vyber dokument** ze Spisovky (např. "fa č. 2530910840 oprava ČSR 4715")
3. **Drag & drop přílohu** z dokumentu do formuláře faktury
   - ⚠️ **POZOR**: První pokus může selhat - zkus 2x
4. **Vyplň fakturu** a klikni "Uložit fakturu"
5. **Sleduj console**:
   ```
   ✅ Spisovka dokument označen jako zpracovaný:
   {
     dokument_id: 108663,
     faktura_id: 12345,
     fa_cislo_vema: "..."
   }
   ```
6. **Objev stránku** (F5)
7. **Ověř že se zobrazí badge** "✓ Zaevidováno" u zpracovaného dokumentu

### Test 2: Ruční označení

```javascript
// V console browseru:
const response = await fetch('/api.eeo/spisovka-zpracovani/mark', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    token: 'YWRtaW58MTc2NjA5MjEwNw==', // Tvůj token
    dokument_id: 108663, // ID dokumentu ze Spisovky
    faktura_id: 123,
    fa_cislo_vema: 'TEST-001',
    stav: 'ZAEVIDOVANO'
  })
});
const data = await response.json();
console.log(data);
```

### Test 3: Kontrola v DB

```bash
php << 'EOF'
<?php
$pdo = new PDO("mysql:host=10.3.172.11;dbname=eeo2025", "erdms_user", "CHANGE_ME_DB_PASSWORD");
$stmt = $pdo->query("SELECT * FROM 25_spisovka_zpracovani_log ORDER BY id DESC LIMIT 5");
while($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "\n=== Záznam #{$r['id']} ===\n";
    echo "Dokument: {$r['dokument_id']}\n";
    echo "Faktura: {$r['faktura_id']}\n";
    echo "Číslo FA: {$r['fa_cislo_vema']}\n";
    echo "Stav: {$r['stav']}\n";
    echo "Kdy: {$r['zpracovano_kdy']}\n";
}
EOF
```

## 🐛 Známé problémy:

### 1. Drag & Drop selhává na první pokus
**Příčina**: Chybí `event.preventDefault()` v `onDragOver` handleru

**Řešení**: Přidat do formuláře faktury:
```javascript
onDragOver={(e) => {
  e.preventDefault();
  e.stopPropagation();
}}
```

### 2. Badge se nezobrazuje i když je tracking v DB
**Příčina**: Frontend cache nebo chyba v `zpracovaneIds` Set

**Debug**:
```javascript
// V console:
console.log('Zpracované IDs:', Array.from(zpracovaneIds));
console.log('Aktuální dokument ID:', faktura.dokument_id);
console.log('Je zpracovaný?:', zpracovaneIds.has(faktura.dokument_id));
```

## 📊 Očekávaný výsledek:

Po úspěšném testu by měl Spisovka InBox panel vypadat:

```
┌─────────────────────────────────────┐
│ 📋 SPISOVKA INBOX                   │
├─────────────────────────────────────┤
│ fa č. 2530910840...   ✓ Zaevidováno│ ← Badge viditelný!
│ #108663                             │
│ JID: OSS-63460-ES5-108663           │
│ Datum vzniku: 19. 12. 2025 09:09:23│
│                                     │
│ 📎 Přílohy (5)                      │
│ 📄 zprava.txt          [TXT] [DL]   │
│ ...                                 │
└─────────────────────────────────────┘
```

## 🔍 Debug checklist:

- [ ] API endpoint `/api.eeo/spisovka-zpracovani/list` vrací 200 OK
- [ ] Response obsahuje `data` array se záznamy
- [ ] Každý záznam má `dokument_id` matching Spisovka dokumentu
- [ ] `zpracovaneIds` Set obsahuje správné ID
- [ ] Badge se renderuje v JSX
- [ ] `zpracovaneIds.has(faktura.dokument_id)` vrací `true`
