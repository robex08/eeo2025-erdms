# Backend Implementace: TODO Alarm Notifikace

**Datum:** 25. října 2025  
**Priorita:** HIGH  
**Status:** Čeká na implementaci

---

## 📋 ÚVOD

Tento dokument obsahuje **kompletní specifikaci** pro implementaci automatického systému notifikací pro TODO alarmy. Systém bude pravidelně kontrolovat nadcházející TODO alarmy a automaticky vytvářet notifikace pro uživatele.

---

## 🎯 CÍL

Vytvořit **background service**, který:
1. Pravidelně kontroluje TODO alarmy v databázi
2. Detekuje alarmy, které se blíží nebo jsou po termínu
3. Automaticky vytváří notifikace pro příslušné uživatele
4. Zajistí, aby každý alarm byl zpracován pouze jednou

---

## 📊 DATABÁZOVÉ ŠABLONY

### Krok 1: Spuštění SQL skriptu

Prosím **spusťte následující SQL** pro vytvoření notifikačních šablon:

```sql
-- ===================================================================
-- TODO ALARM NOTIFICATIONS - Database Templates
-- ===================================================================

-- Šablona 1: Normální priorita (standardní upozornění)
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

-- Šablona 2: Vysoká priorita (urgentní upozornění)
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

-- Šablona 3: Prošlý termín (volitelné)
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

### Placeholdery v šablonách:
- `{todo_title}` - název TODO úkolu
- `{alarm_datetime}` - datum a čas alarmu (formát: DD.MM.YYYY HH:MM)
- `{todo_note}` - poznámka k TODO úkolu
- `{user_name}` - jméno uživatele (volitelné)

---

## 🔧 IMPLEMENTACE BACKGROUND SERVISU

### Architektura

```
Background Worker (cron/scheduled task)
  ↓
[Kontrola TODO alarmů]
  ↓
[Detekce alarmů k zpracování]
  ↓
[Vytvoření notifikací]
  ↓
[Označení alarmů jako zpracovaných]
```

### Doporučený interval běhu

- **Každých 5 minut** (nebo častěji, pokud je potřeba)
- Alternativně: každou minutu pro přesnost

---

## 📝 ALGORITMUS

### Pseudokód:

```python
def process_todo_alarms():
    """
    Zpracování TODO alarmů a vytvoření notifikací
    """
    current_time = NOW()
    
    # 1. Najít všechny TODO alarmy, které:
    #    - alarm_datetime <= NOW() + 30 minut (blíží se)
    #    - notification_sent = FALSE (ještě nebyly odeslány)
    #    - is_completed = FALSE (úkol není dokončený)
    
    pending_alarms = SELECT 
        ta.id,
        ta.todo_id,
        ta.alarm_datetime,
        ta.is_completed,
        t.title as todo_title,
        t.note as todo_note,
        t.user_id,
        t.order_id
    FROM todo_alarm ta
    JOIN todo t ON ta.todo_id = t.id
    WHERE ta.alarm_datetime <= (NOW() + INTERVAL 30 MINUTE)
      AND ta.notification_sent = FALSE
      AND ta.is_completed = FALSE
      AND t.is_active = TRUE
    
    # 2. Pro každý alarm určit prioritu notifikace
    for alarm in pending_alarms:
        time_diff = alarm.alarm_datetime - current_time
        
        if time_diff < 0:
            # Alarm již prošel - EXPIRED
            template_type = 'alarm_todo_expired'
            priority = 'high'
        elif time_diff < 10 minutes:
            # Méně než 10 minut - HIGH priority
            template_type = 'alarm_todo_high'
            priority = 'high'
        else:
            # 10-30 minut - NORMAL priority
            template_type = 'alarm_todo_normal'
            priority = 'normal'
        
        # 3. Vytvořit notifikaci
        create_notification(
            user_id=alarm.user_id,
            template_type=template_type,
            priority=priority,
            placeholders={
                'todo_title': alarm.todo_title,
                'alarm_datetime': format_datetime(alarm.alarm_datetime),
                'todo_note': alarm.todo_note or 'Bez poznámky'
            },
            related_entity='todo',
            related_id=alarm.todo_id,
            order_id=alarm.order_id  # pro napojení na objednávku
        )
        
        # 4. Označit alarm jako zpracovaný
        UPDATE todo_alarm 
        SET notification_sent = TRUE,
            notification_sent_at = NOW()
        WHERE id = alarm.id
    
    return len(pending_alarms)
```

---

## 🗄️ DATABÁZOVÉ ZMĚNY

### Možnost 1: Přidání sloupců do `todo_alarm`

Pokud tabulka `todo_alarm` **již neobsahuje** následující sloupce, přidejte je:

```sql
ALTER TABLE todo_alarm 
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_sent_at DATETIME NULL,
ADD COLUMN last_notification_id INT NULL,
ADD INDEX idx_notification_sent (notification_sent, alarm_datetime);
```

### Možnost 2: Kontrola stavu

Pokud nemůžete upravit tabulku `todo_alarm`, můžete kontrolovat existenci notifikace v tabulce `notification`:

```sql
-- Najít alarmy, které ještě nemají notifikaci
SELECT ta.*
FROM todo_alarm ta
LEFT JOIN notification n ON (
    n.related_entity = 'todo' 
    AND n.related_id = ta.todo_id
    AND n.template_type LIKE 'alarm_todo_%'
)
WHERE ta.alarm_datetime <= (NOW() + INTERVAL 30 MINUTE)
  AND ta.is_completed = FALSE
  AND n.id IS NULL;
```

---

## 🎨 FRONTEND INTEGRACE

Frontend je **již připraven**. Notifikace se automaticky zobrazí v:

- **Notifikačním zvonečku** (ikona 🔔 v hlavičce)
- **Badge s počtem nepřečtených notifikací**
- **Modal s detailem notifikace**

Frontend pravidelně **volá API** pro načtení notifikací:
- `GET /api/notifications/unread` - nepřečtené notifikace
- `GET /api/notifications` - všechny notifikace

---

## 🔗 NAPOJENÍ NA OBJEDNÁVKY

Pokud je TODO úkol svázán s objednávkou (`order_id`), notifikace by měla obsahovat:
- Odkaz na detail objednávky
- Číslo objednávky
- Související informace

V notifikaci:
```javascript
{
  "related_entity": "todo",
  "related_id": 123,
  "order_id": 456,  // <-- důležité pro napojení
  "metadata": {
    "order_number": "ZZS-2025-0456",
    "todo_title": "Kontaktovat dodavatele"
  }
}
```

---

## ✅ CHECKLIST PRO IMPLEMENTACI

- [ ] **Krok 1:** Spustit SQL šablony (3 INSERT statements výše)
- [ ] **Krok 2:** Ověřit strukturu tabulky `todo_alarm` (má sloupce `notification_sent`?)
- [ ] **Krok 3:** Případně přidat chybějící sloupce do `todo_alarm`
- [ ] **Krok 4:** Vytvořit background worker/cron job
- [ ] **Krok 5:** Implementovat logiku pro detekci alarmů
- [ ] **Krok 6:** Implementovat vytváření notifikací
- [ ] **Krok 7:** Otestovat na testovacích datech
- [ ] **Krok 8:** Nasadit do produkce
- [ ] **Krok 9:** Monitorovat běh služby (logy, chyby)

---

## 🧪 TESTOVÁNÍ

### Test 1: Vytvoření testovacího TODO alarmu

```sql
-- Vytvoř TODO s alarmem za 5 minut
INSERT INTO todo (title, note, order_id, user_id, is_active)
VALUES ('Testovací úkol', 'Test notifikace', 1, 1, TRUE);

SET @todo_id = LAST_INSERT_ID();

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (@todo_id, NOW() + INTERVAL 5 MINUTE, FALSE);
```

### Test 2: Ruční spuštění workeru

Po vytvoření testovacího alarmu:
1. Počkej 5 minut
2. Spusť background worker
3. Zkontroluj, zda se vytvořila notifikace:

```sql
SELECT * FROM notification 
WHERE template_type LIKE 'alarm_todo_%'
ORDER BY dt_created DESC 
LIMIT 10;
```

### Test 3: Frontend kontrola

1. Přihlaš se jako uživatel, který má alarm
2. Zkontroluj notifikační zvonek (měl by zobrazit novou notifikaci)
3. Otevři notifikaci a ověř obsah

---

## 🚨 MOŽNÉ PROBLÉMY

### Problém 1: Duplicitní notifikace

**Řešení:** Vždy kontroluj `notification_sent` flag nebo existenci notifikace před vytvořením nové.

### Problém 2: Časová zóna

**Řešení:** Ujisti se, že `alarm_datetime` a `NOW()` používají stejnou časovou zónu (UTC nebo lokální).

### Problém 3: Výkon

**Řešení:** Index na `(notification_sent, alarm_datetime)` pro rychlé dotazy.

---

## 📊 MONITORING

### Co monitorovat:

1. **Počet zpracovaných alarmů** za běh
2. **Chyby při vytváření notifikací**
3. **Doba běhu workeru** (neměla by být příliš dlouhá)
4. **Zpoždění notifikací** (rozdíl mezi `alarm_datetime` a `notification_sent_at`)

### Doporučené metriky:

```sql
-- Kolik alarmů čeká na zpracování?
SELECT COUNT(*) as pending_alarms
FROM todo_alarm
WHERE alarm_datetime <= (NOW() + INTERVAL 30 MINUTE)
  AND notification_sent = FALSE
  AND is_completed = FALSE;

-- Průměrné zpoždění notifikací
SELECT AVG(TIMESTAMPDIFF(MINUTE, alarm_datetime, notification_sent_at)) as avg_delay_minutes
FROM todo_alarm
WHERE notification_sent = TRUE;
```

---

## 📞 KONTAKT

Pokud máte **jakékoliv dotazy** k implementaci:
- Frontend tým je připraven na integraci
- Testovací data můžeme připravit
- Dokumentace API je dostupná

**Status:** Čeká na backend implementaci 🚀

---

## 📎 PŘÍLOHY

### Příklad notifikace JSON (jak bude vypadat v databázi):

```json
{
  "id": 789,
  "user_id": 1,
  "template_type": "alarm_todo_high",
  "priority": "high",
  "app_title": "⚠️ URGENTNÍ úkol",
  "app_message": "Kontaktovat dodavatele - VYŽADUJE POZORNOST!",
  "email_subject": "⚠️ URGENTNÍ: Kontaktovat dodavatele",
  "email_body": "...",
  "is_read": false,
  "is_sent": true,
  "related_entity": "todo",
  "related_id": 123,
  "order_id": 456,
  "dt_created": "2025-10-25 14:30:00",
  "dt_read": null
}
```

### Příklad notification metadata (volitelné):

```json
{
  "todo_title": "Kontaktovat dodavatele",
  "alarm_datetime": "25.10.2025 14:30",
  "todo_note": "Urgentní - potřebujeme cenovou nabídku",
  "order_number": "ZZS-2025-0456",
  "order_title": "Nákup zdravotnického materiálu"
}
```

---

**Konec specifikace** ✅
