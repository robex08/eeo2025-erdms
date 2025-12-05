# 📬 TODO Alarm Notifikace - Shrnutí pro Backend

**Datum:** 25. října 2025  
**Status:** PŘIPRAVENO K IMPLEMENTACI  
**Priorita:** HIGH

---

## 🎯 CO TO JE

Automatický systém, který:
1. ✅ Kontroluje nadcházející TODO alarmy
2. ✅ Vytváří notifikace pro uživatele
3. ✅ Zobrazuje je v notifikačním zvonečku 🔔

**Frontend je 100% připraven!** Stačí vytvářet notifikace a ony se automaticky zobrazí.

---

## 📋 CO POTŘEBUJEME OD TEBE

### 1. SQL Šablony (⏱️ 2 minuty)

**Soubor:** `docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql`

```bash
# Spustit celý soubor v MySQL
mysql -u user -p database < docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql
```

Nebo ručně 3 INSERT příkazy:
- `alarm_todo_normal` - normální priorita
- `alarm_todo_high` - vysoká priorita  
- `alarm_todo_expired` - po termínu

### 2. Background Worker (⏱️ hlavní úkol)

**Co má dělat:**
- Běžet každých **5 minut** (nebo častěji)
- Najít TODO alarmy, které se blíží nebo prošly
- Vytvořit pro ně notifikace
- Označit jako zpracované

**Pseudokód:**
```python
def check_alarms():
    # Najdi alarmy <= NOW() + 30 minut
    alarms = db.query("""
        SELECT * FROM todo_alarm 
        WHERE alarm_datetime <= NOW() + INTERVAL 30 MINUTE
          AND notification_sent = FALSE
          AND is_completed = FALSE
    """)
    
    for alarm in alarms:
        # Urči typ notifikace podle času
        if alarm.datetime < NOW():
            type = 'alarm_todo_expired'
        elif alarm.datetime < NOW() + 10min:
            type = 'alarm_todo_high'
        else:
            type = 'alarm_todo_normal'
        
        # Vytvoř notifikaci
        create_notification(
            user_id=alarm.user_id,
            template_type=type,
            placeholders={
                'todo_title': alarm.title,
                'alarm_datetime': format(alarm.datetime),
                'todo_note': alarm.note
            }
        )
        
        # Označ jako zpracované
        alarm.notification_sent = True
        alarm.save()
```

### 3. Databázové sloupce (volitelné)

Pokud `todo_alarm` tabulka ještě nemá:

```sql
ALTER TABLE todo_alarm 
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_sent_at DATETIME NULL;
```

Pokud přidat nemůžeš, lze kontrolovat existenci notifikace jinak (viz hlavní spec).

---

## 📚 DOKUMENTACE

Připravili jsme 4 dokumenty:

1. **BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md** ⭐
   - Kompletní specifikace se vším
   - Pseudokód, příklady, testování
   
2. **BACKEND-TODO-ALARM-QUICK-START.md**
   - Rychlý přehled pro start
   
3. **DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql**
   - SQL šablony k import
   
4. **TODO-ALARM-NOTIFICATION-BELL-SUMMARY.md** (tento soubor)
   - Shrnutí pro rychlou orientaci

---

## 🔔 JAK TO VYPADÁ V UI

Frontend zobrazí:

```
🔔 [3]  ← Badge s počtem nepřečtených

Po kliknutí:
┌─────────────────────────────────┐
│ Notifikace (3 nepřečtené)       │
├─────────────────────────────────┤
│ ⚠️ URGENTNÍ úkol                │
│ Kontaktovat dodavatele -        │
│ VYŽADUJE POZORNOST!             │
│ před 2 minutami                 │
├─────────────────────────────────┤
│ 📋 Připomínka úkolu             │
│ Připravit cenovou nabídku -     │
│ termín 25.10.2025 14:30         │
│ před hodinou                    │
└─────────────────────────────────┘
```

---

## 🧪 RYCHLÝ TEST

### Vytvoř testovací alarm:

```sql
-- Vytvoř TODO
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('TEST ALARM', 'Testovací poznámka', 1, TRUE);

SET @todo_id = LAST_INSERT_ID();

-- Vytvoř alarm za 5 minut
INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed, notification_sent)
VALUES (@todo_id, NOW() + INTERVAL 5 MINUTE, FALSE, FALSE);
```

### Počkej 5 minut a spusť worker

### Zkontroluj notifikaci:

```sql
SELECT * FROM notification 
WHERE template_type LIKE 'alarm_todo_%'
ORDER BY dt_created DESC 
LIMIT 5;
```

### Přihlaš se ve frontendu jako user_id=1
→ Měl bys vidět notifikaci v zvonečku 🔔

---

## 💡 TIP: Co je nejdůležitější

1. **SQL šablony** - bez nich to nebude fungovat
2. **Background worker** - srdce celého systému
3. **Testování** - ověř, že vše funguje správně

Frontend už **vše umí**, stačí vytvářet notifikace standardním způsobem!

---

## ❓ FAQ

**Q: Jak často má worker běžet?**  
A: Každých 5 minut je ideální. Můžeš i častěji (1 minuta), ale není to nutné.

**Q: Co když todo_alarm nemá sloupec notification_sent?**  
A: Můžeš kontrolovat existenci notifikace v tabulce notification (viz hlavní spec).

**Q: Jak poznat, která notifikace je urgent?**  
A: Podle času - méně než 10 minut do termínu = HIGH, po termínu = EXPIRED.

**Q: Musím posílat emaily?**  
A: Ne! Normální priority nemá email. HIGH a EXPIRED mají, ale to je na tobě.

**Q: Co když user už TODO dokončil?**  
A: Proto kontroluješ `is_completed = FALSE` v SELECT query.

---

## ✅ CHECKLIST

Pro tvého team leada / project managera:

- [ ] SQL šablony naimportovány (2 min)
- [ ] Background worker vytvořen (2-4 hodiny)
- [ ] Logika implementována (2-4 hodiny)
- [ ] Testování na dev prostředí (30 min)
- [ ] Deployment na produkci (30 min)
- [ ] Monitoring nastaveno (30 min)

**Celkem:** Asi 6-10 hodin práce

---

## 🚀 READY TO GO!

Vše je připraveno:
- ✅ Frontend kompletní
- ✅ SQL šablony připraveny
- ✅ Dokumentace napsána
- ✅ Testovací scénáře hotové

**Stačí implementovat background worker a je to!** 🎉

---

**Máš otázky?** Kompletní odpovědi najdeš v:
→ `docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md`

**Potřebuješ SQL?** Vše je v:
→ `docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql`

**Chceš rychlý start?** Podívej se na:
→ `docs/BACKEND-TODO-ALARM-QUICK-START.md`
