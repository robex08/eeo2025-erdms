# POŽADAVEK PRO BACKEND: TODO Alarm Notifikace

**Datum:** 25. října 2025  
**Zadavatel:** Frontend tým  
**Priorita:** HIGH  

---

## 📋 ZADÁNÍ

Potřebujeme implementovat automatické notifikace pro TODO alarmy, které se budou zobrazovat v notifikačním zvonečku v aplikaci.

---

## 🎯 CO POTŘEBUJEME

### 1. Databázové šablony notifikací

Prosím **spusťte tento SQL** v databázi:

```sql
-- NORMAL priority - standardní připomínka
INSERT INTO notification_template (
  type,
  name,
  email_subject,
  email_body,
  app_title,
  app_message,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'alarm_todo_normal',
  'Připomínka TODO úkolu',
  'Připomínka: {todo_title}',
  'Upozornění na nadcházející úkol:\n\nÚkol: {todo_title}\nTermín: {alarm_datetime}\nPoznámka: {todo_note}\n\nProsím zkontrolujte a dokončete tento úkol včas.',
  'Připomínka úkolu',
  '{todo_title} - termín {alarm_datetime}',
  0,
  'normal',
  1,
  NOW(),
  NOW()
);

-- HIGH priority - urgentní upozornění
INSERT INTO notification_template (
  type,
  name,
  email_subject,
  email_body,
  app_title,
  app_message,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'alarm_todo_high',
  'URGENTNÍ: TODO úkol vyžaduje pozornost',
  '⚠️ URGENTNÍ: {todo_title}',
  '⚠️ URGENTNÍ UPOZORNĚNÍ ⚠️\n\nÚkol vyžaduje okamžitou pozornost:\n\nÚkol: {todo_title}\nTermín: {alarm_datetime}\nPoznámka: {todo_note}\n\nTento úkol je urgentní a měl by být dokončen co nejdříve!',
  '⚠️ URGENTNÍ úkol',
  '{todo_title} - VYŽADUJE POZORNOST!',
  1,
  'high',
  1,
  NOW(),
  NOW()
);

-- EXPIRED - po termínu (volitelné, ale doporučené)
INSERT INTO notification_template (
  type,
  name,
  email_subject,
  email_body,
  app_title,
  app_message,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'alarm_todo_expired',
  'TODO úkol po termínu',
  '🔴 Prošlý termín: {todo_title}',
  '🔴 PROŠLÝ TERMÍN 🔴\n\nÚkol nebyl dokončen včas:\n\nÚkol: {todo_title}\nTermín byl: {alarm_datetime}\nPoznámka: {todo_note}\n\nProsím dokončete tento úkol co nejdříve nebo aktualizujte jeho stav.',
  '🔴 Prošlý termín úkolu',
  '{todo_title} - termín již prošel',
  1,
  'high',
  1,
  NOW(),
  NOW()
);
```

---

## ⚙️ CO MUSÍ BACKEND DĚLAT

### 2. Cron Job / Scheduler

Potřebujeme **pravidelnou kontrolu** TODO alarmů (každou minutu nebo každých 5 minut).

**Algoritmus:**

```
KAŽDOU MINUTU nebo KAŽDÝCH 5 MINUT:

1. Načti všechny TODO alarmy, kde:
   - alarm_datetime IS NOT NULL
   - done = 0 (není dokončeno)
   - alarm_datetime je v budoucnosti nebo nedávné minulosti

2. Pro každý alarm zkontroluj:
   
   a) Je 30 minut před termínem?
      → Vytvoř notifikaci typu 'alarm_todo_normal'
   
   b) Je 5 minut před termínem?
      → Vytvoř notifikaci typu 'alarm_todo_high'
   
   c) Už termín prošel (je 5+ minut po termínu)?
      → Vytvoř notifikaci typu 'alarm_todo_expired'

3. DŮLEŽITÉ: Zaznamenej si, že notifikace byla vytvořena
   (aby se nevytvářela znovu každou minutu!)
   
   Možnosti:
   - Přidat sloupec `notification_sent_at` do TODO tabulky
   - Vytvořit vazební tabulku `todo_notifications_sent`
   - Kontrolovat existenci notifikace v `notifications` tabulce
```

---

## 📊 PŘÍKLAD KÓDU (Python)

```python
from datetime import datetime, timedelta
from notifications import create_notification

def check_todo_alarms():
    """
    Pravidelná kontrola TODO alarmů a vytváření notifikací
    Spouštět každou minutu (cron job)
    """
    
    now = datetime.now()
    
    # Načti všechny aktivní TODO s alarmem
    todos = db.query("""
        SELECT 
            t.id,
            t.user_id,
            t.text as title,
            t.note,
            t.alarm_datetime,
            t.done
        FROM todos t
        WHERE t.alarm_datetime IS NOT NULL
          AND t.done = 0
          AND t.alarm_datetime >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
          AND t.alarm_datetime <= DATE_ADD(NOW(), INTERVAL 60 MINUTE)
    """).fetchall()
    
    for todo in todos:
        alarm_time = todo['alarm_datetime']
        time_diff = (alarm_time - now).total_seconds() / 60  # minuty
        
        # Už notifikace byla vytvořena?
        existing_notification = db.query("""
            SELECT id FROM notifications 
            WHERE user_id = %s 
              AND type LIKE 'alarm_todo%%'
              AND JSON_EXTRACT(meta_data, '$.todo_id') = %s
              AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            LIMIT 1
        """, [todo['user_id'], todo['id']]).fetchone()
        
        if existing_notification:
            continue  # Už jsme poslali notifikaci
        
        # Připrav placeholders
        placeholders = {
            'todo_title': todo['title'],
            'todo_note': todo['note'] or '(Bez poznámky)',
            'alarm_datetime': alarm_time.strftime('%d. %m. %Y %H:%M'),
            'alarm_date': alarm_time.strftime('%d. %m. %Y'),
            'alarm_time': alarm_time.strftime('%H:%M'),
            'user_name': get_user_name(todo['user_id']),
            'todo_id': str(todo['id'])
        }
        
        # Rozhodnutí o typu notifikace
        if time_diff < -5:
            # Už 5+ minut po termínu
            notification_type = 'alarm_todo_expired'
            placeholders['time_remaining'] = f'{abs(int(time_diff))} minut po termínu'
            
        elif -5 <= time_diff <= 5:
            # 5 minut před nebo po termínu
            notification_type = 'alarm_todo_high'
            placeholders['time_remaining'] = '5 minut'
            
        elif 5 < time_diff <= 30:
            # 5-30 minut před termínem
            notification_type = 'alarm_todo_high'
            placeholders['time_remaining'] = f'{int(time_diff)} minut'
            
        else:
            # 30+ minut před termínem
            notification_type = 'alarm_todo_normal'
            placeholders['time_remaining'] = f'{int(time_diff)} minut'
        
        # Vytvoř notifikaci
        create_notification(
            recipient_user_id=todo['user_id'],
            template_type=notification_type,
            placeholders=placeholders,
            meta_data={
                'todo_id': todo['id'],
                'action': 'open_todo_panel'
            }
        )
        
        print(f"✓ Vytvořena notifikace {notification_type} pro TODO #{todo['id']}")

# Spustit v cron jobu každou minutu:
# */1 * * * * python check_todo_alarms.py
```

---

## 🔧 PLACEHOLDERY

Tyto hodnoty musí backend nahradit v šablonách:

| Placeholder | Příklad | Zdroj |
|------------|---------|-------|
| `{todo_title}` | "Zavolat klientovi" | `todos.text` |
| `{todo_note}` | "Projednat nabídku XY" | `todos.note` |
| `{alarm_datetime}` | "25. 10. 2025 14:30" | `todos.alarm_datetime` |
| `{alarm_date}` | "25. 10. 2025" | `todos.alarm_datetime` (pouze datum) |
| `{alarm_time}` | "14:30" | `todos.alarm_datetime` (pouze čas) |
| `{user_name}` | "Jan Novák" | `users.name` |
| `{time_remaining}` | "30 minut" | Vypočítat rozdíl |
| `{todo_id}` | "12345" | `todos.id` |

---

## 📱 METADATA PRO FRONTEND

Při vytváření notifikace prosím přidej do `meta_data`:

```json
{
  "todo_id": 12345,
  "action": "open_todo_panel"
}
```

Frontend pak využije `todo_id` pro:
- Otevření TODO panelu
- Zvýraznění konkrétního úkolu
- Označení notifikace jako přečtené

---

## ⏰ ČASOVÁNÍ NOTIFIKACÍ

| Typ | Kdy poslat | Priority | Email |
|-----|-----------|----------|-------|
| `alarm_todo_normal` | **30 minut** před termínem | normal | NE |
| `alarm_todo_high` | **5 minut** před termínem | high | ANO |
| `alarm_todo_expired` | **5 minut** po termínu | high | ANO |

---

## ✅ CHECKLIST PRO BACKEND

- [ ] **Spustit SQL** - vytvořit 3 šablony v `notification_template`
- [ ] **Vytvořit cron job** - kontrola alarmů každou minutu
- [ ] **Implementovat logiku** - rozhodování o typu notifikace
- [ ] **Přidat metadata** - `todo_id` a `action` pro frontend
- [ ] **Testovat** - vytvořit TODO s alarmem za 30 min a ověřit notifikaci
- [ ] **Ošetřit duplicity** - neposlat stejnou notifikaci vícekrát
- [ ] **Logování** - zaznamenat úspěšné vytvoření notifikace

---

## 🧪 JAK OTESTOVAT

### Test 1: Normal priority
1. Vytvoř TODO s alarmem za 30 minut
2. Počkej, až cron job poběží
3. Zkontroluj, že se objevila notifikace typu `alarm_todo_normal`

### Test 2: High priority
1. Vytvoř TODO s alarmem za 5 minut
2. Počkej, až cron job poběží
3. Zkontroluj, že se objevila notifikace typu `alarm_todo_high`

### Test 3: Expired
1. Vytvoř TODO s alarmem v minulosti (před 10 minutami)
2. Počkej, až cron job poběží
3. Zkontroluj, že se objevila notifikace typu `alarm_todo_expired`

### SQL pro ověření:
```sql
-- Zkontroluj vytvořené notifikace
SELECT 
    n.id,
    n.type,
    n.user_id,
    n.app_title,
    n.app_message,
    n.priority,
    n.read_at,
    n.created_at
FROM notifications n
WHERE n.type LIKE 'alarm_todo%'
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## 📞 KONTAKT

Pokud máte dotazy k implementaci:
- Frontend: Kontaktujte náš tým
- SQL template: `docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql`

---

## 🚀 PRIORITA

**HIGH** - Potřebujeme co nejdříve, je to základní funkcionalita pro TODO systém.

Děkujeme! 🙏
