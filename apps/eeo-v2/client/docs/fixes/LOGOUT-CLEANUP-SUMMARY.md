# LOGOUT CLEANUP - POZNÁMKY A TODO

## PROBLÉM
Po odhlášení zůstávaly POZNÁMKY a TODO v localStorage a zobrazovaly se novému uživateli.

## ŘEŠENÍ

### 1. Vylepšení logout cleanup mechanismu

#### `/src/context/AuthContext.js`
- ✅ Přidáno více logování pro sledování cleanup procesu
- ✅ Vylepšen fallback cleanup s explicitním mazáním TODO/POZNÁMKY klíčů
- ✅ Přidáno uložení TODO před odhlášením pomocí `flushTasksSave()`

#### `/src/utils/logoutCleanup.js`
- ✅ Přidáno debug logování pro TODO/POZNÁMKY klíče
- ✅ Implementován explicitní cleanup jako záloha pro případ selhání pattern matchingu
- ✅ Vylepšeno logování celého cleanup procesu

#### `/src/hooks/useFloatingPanels.js`
- ✅ Přidána funkce `flushTasksSave()` pro explicitní uložení TODO před odhlášením
- ✅ Exportována funkce pro použití v Layout komponente

#### `/src/components/Layout.js`
- ✅ Přidáno volání `flushTasksSave()` před odhlášením
- ✅ Přidán debug panel s informacemi o TODO/POZNÁMKY klíčích v localStorage
- ✅ Asynchronní logout s kratkou паузou pro dokončení ukládání

### 2. Test scripty

#### `/test-logout-cleanup.js`
- ✅ Node.js test script pro ověření pattern matching mechanismu
- ✅ Simuluje localStorage a testuje cleanup logic

#### `/public/test-logout.js`
- ✅ Browser test script pro manuální testování
- ✅ Funkce pro vytvoření testovacích dat a ověření cleanup

### 3. Klíče které se nyní mažou při odhlášení

```javascript
// TODO a POZNÁMKY
'layout_tasks_*'     // TODO úkoly uživatele  
'layout_notes_*'     // Poznámky uživatele
'todo_items_*'       // TODO položky
'notes_text_*'       // Text poznámek
'chat_messages_*'    // Chat zprávy

// Auth data
'auth_*'
'token'
'user'
'userDetail'
'userPermissions'
```

### 4. Data která se zachovávají

```javascript
// Drafty a šablony
'order_draft_*'
'order_templates*'

// UI preference
'ui_theme'
'ui_language'
'lastVisitedSection'

// Cache veřejných dat
'suppliers_cache*'
'ciselniky_*'
```

## TESTOVÁNÍ

### V prohlížeči:
1. Otevři browser console
2. Spusť `testLogoutBefore()` - vytvoří testovací data
3. Odhlásí se
4. Spusť `testLogoutAfter()` - zkontroluje jestli se data smazala

### V debug panelu:
- Debug panel nyní zobrazuje všechne TODO/POZNÁMKY klíče v localStorage
- Každý klíč má tlačítko × pro manuální smazání

## OČEKÁVANÝ VÝSLEDEK

Po odhlášení by se měly smazat:
- ✅ Všechny TODO úkoly (`layout_tasks_*`)
- ✅ Všechny poznámky (`layout_notes_*`)  
- ✅ Font nastavení pro TODO/poznámky
- ✅ Auth data (token, user info)

A zachovat by se měly:
- ✅ Rozpracované objednávky
- ✅ UI preference a nastavení
- ✅ Cache dodavatelů a číselníků