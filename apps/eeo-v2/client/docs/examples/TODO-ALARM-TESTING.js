/**
 * TESTOVACÍ NÁVOD - TODO ALARM NOTIFIKACE
 * 
 * Jak otestovat, že notifikace fungují správně
 */

// =============================================================================
// KROK 1: VYTVOŘ TESTOVACÍ TODO S ALARMEM
// =============================================================================

/*
1. V aplikaci otevři TODO panel (horní menu - ikona úkolů)
2. Vytvoř nový úkol:
   - Text: "TEST - Notifikace za 2 minuty"
   - Nastav alarm na čas za 2 minuty (např. pokud je teď 14:30, nastav 14:32)
   - Priorita: NORMAL (pro základní test)
3. Ulož úkol
*/

// =============================================================================
// KROK 2: POČKEJ, AŽ ALARM VYPRŠÍ
// =============================================================================

/*
- Za 2 minuty by se mělo stát:
  ✅ V konzoli uvidíš: "✅ [useTodoAlarms] TODO alarm notifikace odeslána na BE:"
  ✅ NotificationBell (zvonek vpravo nahoře) zobrazí červený badge
  ✅ Kliknutím na zvonek se otevře dropdown s notifikací
*/

// =============================================================================
// KROK 3: ZKONTROLUJ BACKEND
// =============================================================================

/*
Přihlaš se na server a zkontroluj DB:

1. Zkontroluj, že notifikace byla vytvořena:
   SELECT * FROM 25_notifications 
   WHERE type LIKE '%alarm_todo%' 
   ORDER BY dt_created DESC 
   LIMIT 10;

2. Zkontroluj read status:
   SELECT * FROM 25_notifications_read 
   WHERE user_id = [TVOJE_USER_ID]
   ORDER BY id DESC 
   LIMIT 10;

3. Očekávaný výsledek:
   - V 25_notifications je záznam s:
     * type = 'alarm_todo_normal' (nebo 'alarm_todo_high')
     * title = text ze šablony s placeholdery
     * message = text ze šablony s placeholdery
     * data = JSON s todo_title, alarm_datetime, atd.
   
   - V 25_notifications_read je záznam s:
     * notification_id = ID z 25_notifications
     * user_id = tvoje ID
     * is_read = 0 (nepřečtené)
*/

// =============================================================================
// KROK 4: OTESTUJ RŮZNÉ TYPY
// =============================================================================

/*
1. NORMAL priorita (základní):
   - Vytvoř TODO s alarmem za 1 minutu
   - Priorita: NORMAL
   - Očekávání: alarm_todo_normal typ, email NENÍ poslán

2. HIGH priorita (urgentní):
   - Vytvoř TODO s alarmem za 1 minutu
   - Priorita: HIGH
   - Očekávání: alarm_todo_high typ, email JE poslán (pokud BE má email)

3. EXPIRED (prošlý termín):
   - Vytvoř TODO s alarmem v minulosti (např. včera)
   - Počkej, až se kontrola spustí (každou minutu)
   - Očekávání: alarm_todo_expired typ, email JE poslán
*/

// =============================================================================
// KROK 5: DEBUG V KONZOLI
// =============================================================================

/*
Otevři Developer Tools (F12) a sleduj konzoli.

Měl bys vidět:
✅ [useTodoAlarms] TODO alarm notifikace odeslána na BE: {notification_id: 123, ...}

Pokud vidíš:
❌ [useTodoAlarms] Chyba při odesílání TODO alarm notifikace na BE: ...

Možné příčiny:
1. Backend není dostupný (REACT_APP_API2_BASE_URL není správně)
2. JWT token expiroval (odhlásit se a znovu přihlásit)
3. Backend endpoint /notifications/create neexistuje
4. Chybí šablona v DB (alarm_todo_normal, alarm_todo_high)
*/

// =============================================================================
// KROK 6: RUČNÍ TEST API (v konzoli prohlížeče)
// =============================================================================

/*
Otevři konzoli a zkus ručně poslat notifikaci:

import { notifyTodoAlarmNormal } from './services/notificationsApi';

notifyTodoAlarmNormal(5, {
  todo_title: 'TEST notifikace',
  todo_note: 'Testovací poznámka',
  alarm_datetime: '25. 10. 2025 14:30',
  alarm_date: '25. 10. 2025',
  alarm_time: '14:30',
  user_name: 'Test User',
  time_remaining: '5 minut',
  todo_id: '999'
})
.then(result => console.log('✅ Notifikace vytvořena:', result))
.catch(error => console.error('❌ Chyba:', error));

Očekávaný výsledek:
{
  status: "ok",
  message: "Notifikace byla vytvořena",
  notification_id: 123,
  recipients_count: 1,
  email_sent: false
}
*/

// =============================================================================
// CHECKLIST
// =============================================================================

/*
✅ [ ] TODO alarm se spustí ve správný čas
✅ [ ] Konzole ukazuje "✅ TODO alarm notifikace odeslána na BE"
✅ [ ] NotificationBell zobrazí červený badge
✅ [ ] Dropdown zobrazí notifikaci s textem
✅ [ ] V DB je záznam v 25_notifications
✅ [ ] V DB je záznam v 25_notifications_read
✅ [ ] Typ notifikace odpovídá (alarm_todo_normal / alarm_todo_high / alarm_todo_expired)
✅ [ ] Data obsahují todo_title, alarm_datetime, atd.
✅ [ ] Email je/není poslán podle priority (HIGH a EXPIRED = email)
*/

// =============================================================================
// ČASTÉ PROBLÉMY A ŘEŠENÍ
// =============================================================================

/*
PROBLÉM 1: "Missing authentication data"
ŘEŠENÍ: Odhlásit se a znovu přihlásit (JWT token expiroval)

PROBLÉM 2: "Endpoint /notifications/create not found"
ŘEŠENÍ: Backend nemá implementovaný endpoint - kontaktuj BE

PROBLÉM 3: "Neznámý typ notifikace: alarm_todo_normal"
ŘEŠENÍ: Backend nemá šablonu v DB - kontaktuj BE, aby spustil migraci

PROBLÉM 4: Notifikace se nezobrazí v zvonečku
ŘEŠENÍ: Zkontroluj, že NotificationBell načítá data z BE (polling)

PROBLÉM 5: V DB není záznam
ŘEŠENÍ: 
  - Zkontroluj konzoli - je tam ✅ nebo ❌?
  - Zkontroluj REACT_APP_API2_BASE_URL v .env
  - Zkontroluj, že backend má správné endpointy
*/

// =============================================================================
// READY! 🚀
// =============================================================================

console.log('📋 Testovací návod načten. Postupuj podle kroků výše.');
