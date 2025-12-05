# 📧 TODO Alarm Notifikace - Email pro Backend

**Komu:** Backend tým  
**Od:** Frontend tým  
**Datum:** 25. října 2025  
**Předmět:** Nový úkol: TODO Alarm Notifikace (6-10 hodin práce)

---

## 👋 Ahoj Backend týme!

Připravili jsme pro vás **nový feature request** - automatické notifikace pro TODO alarmy.

**Frontend je již hotový**, potřebujeme od vás vytvořit **background worker**, který bude kontrolovat alarmy a vytvářet notifikace. 

---

## 🎯 CO TO JE

Když uživatel vytvoří TODO úkol s alarmem, chceme mu automaticky poslat notifikaci do aplikace (zvonek 🔔 v hlavičce) před termínem úkolu.

**Příklad:**
- Uživatel vytvoří TODO: "Zavolat klientovi" s alarmem na 14:30
- V 14:00 dostane notifikaci: "Připomínka: Zavolat klientovi - termín za 30 minut"
- V 14:25 dostane urgentní notifikaci: "⚠️ URGENTNÍ: Zavolat klientovi - termín za 5 minut"

---

## 📦 CO JSME PŘIPRAVILI

Vytvořili jsme pro vás **kompletní dokumentaci**:

### 📄 Hlavní dokumenty:
1. **README** - úvodní přehled (3 min čtení)
2. **FULL SPEC** - technická specifikace s pseudokódem (15 min)
3. **PYTHON EXAMPLE** - vzorový kód workeru (ready to use!)
4. **SQL TEMPLATES** - šablony připravené k import (2 min práce)
5. **PROJECT CHECKLIST** - task breakdown pro PM

### 🔗 Kde to najdete:
Všechny soubory jsou v adresáři:
```
docs/TODO-ALARM-*
```

**Nebo začněte tady:**
```
docs/TODO-ALARM-NOTIFICATIONS-README.md
```

---

## ⏱️ ODHAD ČASU

| Task | Čas |
|------|-----|
| SQL šablony import | 2 min |
| Background worker implementace | 4-8 hodin |
| Testing | 30 min |
| Deployment | 30 min |
| **CELKEM** | **6-10 hodin** |

---

## 🚀 QUICK START

### Krok 1: SQL Šablony (2 minuty)
```bash
mysql -u user -p database < docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql
```

### Krok 2: Worker (4-8 hodin)
- Otevřete: `docs/BACKEND-TODO-ALARM-WORKER-EXAMPLE.py`
- Obsahuje vzorový Python kód, který můžete přímo použít
- Přizpůsobte svému ORM a framework

### Krok 3: Cron Job (5 minut)
```bash
# Spouštět každých 5 minut
*/5 * * * * /path/to/worker.py >> /var/log/todo-alarms.log 2>&1
```

### Krok 4: Test (30 minut)
```sql
-- Vytvoř testovací alarm za 5 minut
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('TEST', 'Test', 1, TRUE);

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (LAST_INSERT_ID(), NOW() + INTERVAL 5 MINUTE, FALSE);

-- Počkej 5 minut a zkontroluj notification tabulku
```

---

## 📋 TŘI TYPY NOTIFIKACÍ

Worker musí rozlišovat 3 typy podle času:

| Typ | Kdy | SQL Template |
|-----|-----|--------------|
| Normal | 10-30 min před termínem | `alarm_todo_normal` |
| High | 0-10 min před termínem | `alarm_todo_high` |
| Expired | Po termínu | `alarm_todo_expired` |

---

## 💡 JAK TO FUNGUJE

```python
# Pseudokód (kompletní verze v dokumentaci)

def process_alarms():
    # 1. Najdi alarmy blížící se termínu (30 min dopředu)
    alarms = db.query("""
        SELECT * FROM todo_alarm 
        WHERE alarm_datetime <= NOW() + INTERVAL 30 MINUTE
          AND notification_sent = FALSE
          AND is_completed = FALSE
    """)
    
    # 2. Pro každý alarm:
    for alarm in alarms:
        # Urči typ notifikace
        if alarm.datetime < NOW():
            type = 'alarm_todo_expired'
        elif alarm.datetime < NOW() + 10min:
            type = 'alarm_todo_high'
        else:
            type = 'alarm_todo_normal'
        
        # Vytvoř notifikaci
        create_notification(user_id, type, placeholders)
        
        # Označ jako zpracované
        alarm.notification_sent = True
```

---

## 📚 DOKUMENTACE

### Pro vývojáře:
1. **README:** `docs/TODO-ALARM-NOTIFICATIONS-README.md`
2. **SPEC:** `docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md`
3. **CODE:** `docs/BACKEND-TODO-ALARM-WORKER-EXAMPLE.py`

### Pro managera:
1. **SUMMARY:** `docs/TODO-ALARM-NOTIFICATION-BELL-SUMMARY.md`
2. **CHECKLIST:** `docs/BACKEND-TODO-ALARM-PROJECT-CHECKLIST.md`

---

## ✅ FRONTEND JE HOTOVÝ

Frontend už vše umí:
- ✅ Notifikační zvonek s badge
- ✅ Modal s detaily notifikací
- ✅ API integrace (GET /api/notifications)
- ✅ Automatické načítání každých 30 sekund
- ✅ UI pro zobrazení všech typů priorit

**Stačí vytvářet notifikace standardním způsobem a ony se automaticky zobrazí!**

---

## 🧪 TEST

Po implementaci:
1. Vytvoř testovací TODO s alarmem za 5 minut (SQL výše)
2. Spusť worker (nebo počkej na cron)
3. Přihlaš se ve frontendu
4. Měl by svítit zvonek 🔔 s číslem [1]
5. Klikni na zvonek → měla by být vidět notifikace

---

## ❓ OTÁZKY?

### Q: Kde začít?
A: Otevři `docs/TODO-ALARM-NOTIFICATIONS-README.md` (3 minuty čtení)

### Q: Je to složité?
A: Ne! Máte vzorový Python kód, stačí přizpůsobit. ~6 hodin práce.

### Q: Co když něco není jasné?
A: Dokumentace má 7 souborů, všechno je tam detailně popsáno. Pokud stále nejasné, napište!

### Q: Je frontend opravdu hotový?
A: ANO! 100%. Stačí vytvářet notifikace.

---

## 👥 KONTAKT

**Frontend tým je k dispozici pro:**
- Konzultaci API
- Testování integrace
- Debugging
- Jakékoliv dotazy

**Napište nám kdykoliv!** 🤝

---

## 📅 PRIORITA

**HIGH** - Uživatelé tuto funkci aktivně očekávají.

Ale není to rush - máte kvalitní dokumentaci a vzorový kód, takže by to mělo jít hladce.

---

## 🎁 BONUS

V dokumentaci najdete:
- ✅ Kompletní pseudokód algoritmu
- ✅ Python vzorový kód (400+ řádků)
- ✅ SQL šablony ready to import
- ✅ Test scénáře
- ✅ Troubleshooting guide
- ✅ Monitoring setup
- ✅ FAQ

**Vše je připravené, stačí implementovat!** 🚀

---

## 📎 PŘÍLOHY

### Začněte tady:
```
docs/TODO-ALARM-NOTIFICATIONS-README.md
```

### Nebo rychlé shrnutí:
```
docs/TODO-ALARM-NOTIFICATION-BELL-SUMMARY.md
```

### Technická spec:
```
docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md
```

### Vzorový kód:
```
docs/BACKEND-TODO-ALARM-WORKER-EXAMPLE.py
```

### SQL šablony:
```
docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql
```

---

## 🎯 TL;DR

**Co potřebujeme:**
Background worker (Python/Node/...), který každých 5 minut:
1. Najde TODO alarmy blížící se termínu
2. Vytvoří pro ně notifikace
3. Označí jako zpracované

**Co máte:**
Kompletní dokumentaci + vzorový kód + SQL šablony

**Čas:**
~6-10 hodin celkem

**Priorita:**
HIGH

---

**Děkujeme a těšíme se na spolupráci!** 🙌

*Frontend tým*

---

**P.S.** Pokud máte jakékoliv dotazy, neváhejte se ozvat! Rádi pomůžeme. 😊
