# 🔒 Ochrana dat TODO a Poznámek

## Problém
Při pádu prohlížeče nebo neočekávaném ukončení mohlo dojít ke ztrátě dat v TODO a Poznámkách kvůli:
- Neúplně uloženým datům v localStorage (torzo)
- Konfliktu mezi localStorage a databází
- Chybějící kontrole "čerstvosti" dat

## Řešení

### 1. **Priorita databáze při přihlášení**
- ✅ Při každém přihlášení se **vždy preferují data z databáze**
- ✅ localStorage slouží pouze jako rychlá cache mezi ukládáními
- ✅ Data z DB mají přednost před lokálními verzemi

### 2. **Timestamp tracking**
Každé uložení nyní zahrnuje timestamp:
```javascript
localStorage.setItem(`layout_tasks_timestamp_${userId}`, String(Date.now()));
localStorage.setItem(`layout_notes_timestamp_${userId}`, String(Date.now()));
```

### 3. **Detekce starých dat**
Při přihlášení se kontroluje stáří lokálních dat:
- Data starší než **7 dní** jsou považována za zastaralá
- Automaticky se nahradí aktuálními daty z DB
- Varování se zobrazí v konzoli

### 4. **Bezpečné ukládání**
- **Auto-save každých 15 sekund** (debounced)
- **Okamžité uložení při:**
  - Před odhlášením (logout)
  - Při skrytí stránky (tab switch)
  - Při `beforeunload` události
- **Backup verze** pro F5 refresh recovery

### 5. **Recovery mechanismus**
Pokud dojde k problému, uživatel může:
1. **Ruční refresh** (🔄 tlačítko) - načte aktuální data z DB
2. **Restart prohlížeče** - při přihlášení se načtou DB data
3. **Manuální smazání** - tlačítko "Vymazat vše" pokud chce začít znovu

## Bezpečnostní záruky

### ✅ CO SE STANE PŘI PÁDU PROHLÍŽEČE
1. Data z posledního auto-save (max 15s staré) jsou v DB
2. Při příštím přihlášení se načtou z DB
3. Lokální torzo dat se přepíše databázovými daty

### ✅ CO SE STANE PŘI KONFLIKTU DAT
1. **DB data mají vždy přednost** při přihlášení
2. Lokální data se přepíšou, pokud jsou různá
3. Varování v konzoli, pokud jsou lokální data novější

### ✅ CO SE STANE PŘI PRÁZDNÉ DB
- Pokud DB vrací NULL/prázdno, ale lokálně jsou data:
  - **NEMAZAT automaticky** lokální data
  - Zobrazit varování v konzoli
  - Uživatel může ručně smazat nebo použít refresh

### ✅ CO SE STANE P�I REGULÁRNÍM ODHLÁŠENÍ
1. Data se uloží do DB (flush před logout)
2. Krátká pauza (100ms) pro dokončení ukládání
3. Logout proběhne až po úspěšném uložení

## Workflow

### Nový uživatel / První přihlášení
```
1. Login → 
2. Kontrola DB (prázdná) → 
3. Kontrola localStorage (prázdná) → 
4. Začátek s prázdnými daty
```

### Běžné použití
```
1. Uživatel přidá TODO/poznámku →
2. Auto-save každých 15s do DB + localStorage →
3. Timestamp se aktualizuje →
4. Data jsou v bezpečí
```

### Pád prohlížeče
```
1. CRASH (poslední save před max 15s) →
2. Restart & Login →
3. Načtení z DB (s předností) →
4. Data obnovena z posledního save
```

### Konflikt localStorage vs DB
```
1. Login →
2. Detekce rozdílu mezi localStorage a DB →
3. Timestamp check (< 7 dní?) →
4. Preferuj DB data →
5. Přepiš localStorage →
6. Uživatel má aktuální data z DB
```

## Debugging

### Console log messages
- `🔄 Bezpečná synchronizace při přihlášení` - začátek sync
- `📥 Načítám poznámky/TODO z DB` - data načtena z DB
- `✅ Data z DB jsou shodné s lokálními` - bez změn
- `⚠️ DB data jsou prázdné, používám lokální` - fallback na lokální
- `⚠️ Lokální data jsou starší než týden` - detekce starých dat

### Klíče v localStorage
```javascript
// Data
layout_notes_{userId}           // Aktuální poznámky
layout_tasks_{userId}           // Aktuální TODO
layout_notes_backup_{userId}    // Backup pro F5 recovery
layout_tasks_backup_{userId}    // Backup pro F5 recovery

// Metadata
layout_notes_timestamp_{userId}  // Timestamp posledního save
layout_tasks_timestamp_{userId}  // Timestamp posledního save
layout_notes_meta_{userId}       // Metadata (hash, délka)
```

## Doporučení pro uživatele

1. **Pravidelně se odhlašujte** - zajistí plné uložení do DB
2. **Při pochybnostech použijte 🔄 Refresh** - načte aktuální data z DB
3. **Nekombinujte více zařízení současně** - může dojít ke konfliktům
4. **Při podezření na problém**: Logout → Login → Refresh

## Technické detaily

### Autosave interval
- **Notes**: 15 sekund (debounced)
- **TODO**: 15 sekund (pravidelný check)

### Timestamp validace
- Stáří dat: **< 7 dní** = OK
- Stáří dat: **> 7 dní** = varování + preferuj DB

### Ukládání při odhlášení
```javascript
1. flushNotesSave() - okamžité uložení poznámek
2. flushTasksSave() - okamžité uložení TODO
3. setTimeout(100ms) - pauza pro dokončení
4. logout() - skutečné odhlášení
```

## Změny v kódu

### useFloatingPanels.js
1. ✅ Přidán timestamp tracking při každém save
2. ✅ Nová funkce `safeLoginSync()` při přihlášení
3. ✅ Kontrola stáří dat (7 dní)
4. ✅ Preferování DB dat před localStorage
5. ✅ Lepší logování pro debugging
6. ✅ Ochrana proti automatickému mazání dat

### Layout.js
- ✅ Flush save před logout (již existovalo)
- ✅ Timeout 100ms pro dokončení save

## Testování

### Test 1: Pád prohlížeče
1. Přihlásit se
2. Vytvořit TODO a poznámku
3. Počkat 15s (auto-save)
4. Násilně ukončit prohlížeč (kill process)
5. Restart & login
6. **Očekávaný výsledek**: Data jsou obnovena

### Test 2: Konflikt dat
1. Login na zařízení A
2. Vytvořit TODO "Test A"
3. Logout
4. Login na zařízení B
5. **Očekávaný výsledek**: Vidí "Test A" z DB

### Test 3: Stará localStorage data
1. Vytvořit data v localStorage se starým timestampem
2. Login
3. **Očekávaný výsledek**: Preferují se DB data, varování v konzoli

---

**Poslední aktualizace**: 24. října 2025
**Status**: ✅ Implementováno a otestováno
