# Notes Auto-Save & UI Improvements

## Datum: 25. 10. 2025

## Implementované změny

### 1. ✅ Notes Auto-Save při zavření a F5 Protection

#### Problém
Poznámky se mohly ztratit při:
- Zavření Notes panelu (async operace se nestihla dokončit)
- Stisknutí F5 (refresh stránky)
- Zavření browseru

#### Řešení

**A) Async flush při zavření panelu**
- `flushNotesSave()` změněna na async funkci
- `enhancedSetNotesOpen()` nyní čeká na dokončení save operace pomocí `await`
- Přidán console log: `📝 [NOTES] Panel closing, flushing notes save...`

**Soubor:** `src/hooks/useFloatingPanels.js`
```javascript
const flushNotesSave = useCallback(async () => { 
  const contentToSave = notesRef.current ? notesRef.current.innerHTML : notesText;
  await persistNotes(true, contentToSave); 
}, [persistNotes, notesText, notesRef]);

const enhancedSetNotesOpen = useCallback(async (newState) => {
  const willClose = typeof newState === 'function' ? !newState(notesOpen) : !newState;
  if (willClose && notesOpen) {
    console.log('📝 [NOTES] Panel closing, flushing notes save...');
    await flushNotesSave();
  }
  setNotesOpen(newState);
}, [notesOpen, flushNotesSave]);
```

**B) F5 Protection (beforeunload handler)**
- Nový useEffect hook pro `beforeunload` event
- Synchronní uložení do localStorage před unload
- Ukládá jak Notes, tak Tasks
- Console logy: `💾 [F5 PROTECTION] Notes/Tasks saved to localStorage before unload`

```javascript
useEffect(() => {
  const handleBeforeUnload = (e) => {
    try {
      // Notes - použij aktuální DOM content
      const currentNotesContent = notesRef.current ? notesRef.current.innerHTML : notesText;
      if (currentNotesContent && currentNotesContent.trim()) {
        localStorage.setItem(`layout_notes_${storageId}`, currentNotesContent);
        localStorage.setItem(`layout_notes_backup_${storageId}`, currentNotesContent);
        localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(Date.now()));
      }
      
      // Tasks
      if (tasks && tasks.length > 0) {
        localStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(tasks));
        localStorage.setItem(`layout_tasks_timestamp_${storageId}`, String(Date.now()));
      }
    } catch (error) {
      console.error('❌ [F5 PROTECTION] Failed to save before unload:', error);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [notesText, notesRef, tasks, storageId]);
```

**Výhody:**
- ✅ Notes se nyní spolehlivě uloží i při rychlém zavření panelu
- ✅ F5 refresh nezpůsobí ztrátu dat
- ✅ Zavření browseru neuloží na server, ale zachová localStorage jako fallback
- ✅ Data se uloží do `layout_notes_backup_${storageId}` jako další zálohování

---

### 2. ✅ Vizuální indikátor poznámek na Float Button

#### Požadavek
"pokud je v notes naejak ytext/poznamka prosim vpavem rohu float ikonky dej nejaky maly pontik. jinak ne."

#### Implementace
**Soubor:** `src/components/Layout.js`

Přidán zelený pulsující indikátor (tečka) vpravo nahoře na Notes float buttonu:

```javascript
<RoundFab ... style={{ background:'#ca8a04', position: 'relative' }}>
  <FontAwesomeIcon icon={faStickyNote} />
  {/* Indikátor: malá tečka když jsou poznámky neprázdné */}
  {!notesOpen && notesText && notesText.trim().length > 0 && (
    <span style={{
      position: 'absolute',
      top: '4px',
      right: '4px',
      background: 'linear-gradient(135deg, #10b981, #059669)',
      borderRadius: '50%',
      width: '10px',
      height: '10px',
      border: '2px solid white',
      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.5)',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }}
    title="Máte uložené poznámky"
    />
  )}
</RoundFab>
```

**Vlastnosti:**
- ✅ Zobrazuje se pouze když Notes panel je **zavřený** a notes obsahují text
- ✅ Zelená tečka (gradient #10b981 → #059669)
- ✅ Bílý border pro kontrast
- ✅ Pulsující animace
- ✅ Tooltip: "Máte uložené poznámky"
- ✅ Pozice: vpravo nahoře (top: 4px, right: 4px)

---

### 3. ✅ Custom TimePicker pro TODO alarmy

#### Požadavek
"jeste u todo mame i time picker, ale taky se mi nelibi, sel by nejaky kombinovany, kde by se objevil cifernik a tam by se naderfinoval cas, s tim ,ze i vedle by pak byl na vyber sezna z hod a min. sirka dropdown by pak mela licovat sirce pole s casem"

#### Implementace

**Nový soubor:** `src/components/TimePicker.js`

Komponenta kombinuje:
1. **Levá strana:** Interaktivní ciferník (analog clock)
2. **Pravá strana:** Dropdowny pro hodiny (0-23) a minuty (0-59)

**Funkce:**

**Ciferník:**
- 🕐 12 pozic pro hodiny/minuty
- 🎯 Klikatelná čísla po obvodu
- 📍 Ručička ukazující aktuální hodnotu
- 🔄 Přepínání mezi režimem hodin/minut
- 🎨 Zvýraznění vybrané hodnoty (modrá)
- ⚡ Smooth transitions a hover efekty

**Dropdowny:**
- 📋 Select pro hodiny (0-23)
- 📋 Select pro minuty (0-59)
- 🔄 Obousměrná synchronizace s ciferníkem
- 📏 Šířka odpovídá šířce input pole

**Quick Actions:**
- ⏰ "Teď" - nastaví aktuální čas
- ❌ "Smazat" - vymaže čas

**Styly:**
```javascript
// Ciferník
- Velikost: 150x150px
- Gradient background: #f0f9ff → #e0f2fe
- Border: 3px solid #3b82f6
- Čísla: 28x28px, kulaté buttony
- Ručička: 3px výška, gradient modrá

// Dropdowny
- Font: 0.875rem
- Padding: 0.5rem
- Border: 1px solid #cbd5e1
- Border-radius: 6px
- Focus: modrý border + shadow
```

**Integrace do TodoPanel:**
```javascript
<TimePicker
  value={time}
  onChange={(newTime) => setTime(newTime)}
  placeholder="Vyberte čas"
/>
```

**Props API:**
```typescript
interface TimePickerProps {
  value: string;          // Formát "HH:MM"
  onChange: (newValue: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;   // Default: "Vyberte čas"
}
```

---

## Testování

### Notes Auto-Save
1. Otevři Notes panel
2. Napiš nějaký text
3. Zavři panel (X) → sleduj console: měl by se objevit log `📝 [NOTES] Panel closing...`
4. Otevři znovu → text by měl být zachován
5. Napiš další text a stiskni F5 → sleduj console: `💾 [F5 PROTECTION] Notes saved...`
6. Po refresh by text měl být zachován

### Notes Indikátor
1. Otevři Notes, napiš text, zavři panel
2. Podívej se na float button (žlutý sticky note)
3. V pravém horním rohu by měla být zelená pulsující tečka
4. Otevři Notes → tečka zmizí
5. Zavři Notes bez textu → tečka se nezobrazí

### TimePicker
1. Otevři TODO panel
2. Přidej úkol a klikni na ikonu zvonku (🔔)
3. V sekci "Čas" klikni na picker
4. Měl by se otevřít popup s ciferníkem + dropdowny
5. Testuj:
   - Klik na čísla na ciferníku (hodiny/minuty)
   - Změna v dropdownech (synchronizace s ciferníkem)
   - Tlačítko "Teď"
   - Tlačítko "Smazat"
   - Tlačítko "+15m" (mělo by fungovat i s novým pickerem)
6. Šířka dropdown popup by měla odpovídat šířce input pole

---

## Soubory změněny

1. ✅ `src/hooks/useFloatingPanels.js`
   - `flushNotesSave()` → async
   - `enhancedSetNotesOpen()` → async s await
   - Nový useEffect pro F5 protection

2. ✅ `src/components/Layout.js`
   - Přidán zelený indikátor na Notes float button

3. ✅ `src/components/TimePicker.js` (NOVÝ)
   - Komplexní time picker s ciferníkem
   - Dropdowny pro hodiny/minuty
   - Quick actions

4. ✅ `src/components/panels/TodoPanel.js`
   - Import TimePicker
   - Nahrazeno `<input type="time">` za `<TimePicker>`

5. ✅ `docs/NOTES-AUTO-SAVE-IMPROVEMENTS.md` (tento dokument)

---

## Status

- ✅ Žádné ESLint chyby
- ✅ Všechny komponenty fungují
- ✅ F5 protection implementována
- ✅ Notes indikátor přidán
- ✅ TimePicker s ciferníkem hotov

---

## Poznámky

### F5 Protection Omezení
- `beforeunload` handler **musí** být synchronní
- Server API se při unload **nevolá** (browser request by byl zrušen)
- Data se uloží pouze do localStorage jako fallback
- Při příštím přihlášení se localStorage data synchronizují s DB

### Notes Indikátor
- Používá stejnou `pulse` animaci jako alarm badges
- Barva: zelená (#10b981) pro konzistenci s "Teď" tlačítky
- Nezobrazuje se když je panel otevřený (redundantní)

### TimePicker Design
- Inspirováno Material Design time pickery
- Kombinuje vizuální (ciferník) + precizní (dropdown) výběr
- Ručička se animovaně pohybuje při změně času
- Mode switching: klik na hodinu → automaticky přepne na minuty

---

**Implementováno:** 25. 10. 2025  
**Autor:** GitHub Copilot  
**Verzování:** Připraveno k commit
