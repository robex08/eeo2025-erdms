# TODO Alarm Notifikace - Rychlý Přehled

## 📋 CO POTŘEBUJEME OD BACKENDU

### 1️⃣ SQL Šablony (1 minuta)
```sql
-- Spustit 3 INSERT příkazy pro notification_template
-- Soubor: docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md (řádky 20-110)
```

### 2️⃣ Background Worker (hlavní úkol)
- **Frekvence:** Každých 5 minut
- **Úkol:** Kontrola TODO alarmů a vytvoření notifikací
- **Logika:** viz pseudokód v hlavní specifikaci

### 3️⃣ Databázové úpravy (volitelné)
```sql
-- Pokud todo_alarm nemá tyto sloupce, přidat:
ALTER TABLE todo_alarm 
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_sent_at DATETIME NULL;
```

---

## 🎯 JAK TO FUNGUJE

```
TODO alarm s termínem (alarm_datetime)
          ↓
Background worker (každých 5 min)
          ↓
Detekuje alarmy blížící se termínu
          ↓
Vytvoří notifikaci pro uživatele
          ↓
Frontend zobrazí v zvonečku 🔔
```

---

## 📊 TŘI TYPY NOTIFIKACÍ

| Typ | Kdy se použije | Priorita | Email |
|-----|----------------|----------|-------|
| `alarm_todo_normal` | 10-30 min před termínem | normal | Ne |
| `alarm_todo_high` | 0-10 min před termínem | high | Ano |
| `alarm_todo_expired` | Po termínu | high | Ano |

---

## ✅ QUICK START

1. **Spustit SQL** - 3 šablony z hlavní specifikace
2. **Vytvořit worker** - skript běžící každých 5 minut
3. **Implementovat logiku:**
   ```python
   SELECT alarmy WHERE alarm_datetime <= NOW() + 30 MIN
   FOR EACH alarm:
       IF není zpracován:
           Vytvoř notifikaci
           Označ jako zpracovaný
   ```
4. **Otestovat** - vytvořit testovací TODO s alarmem za 5 min

---

## 📁 DOKUMENTACE

- **Kompletní specifikace:** `docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md`
- **SQL šablony:** viz kompletní specifikace
- **Frontend:** Již připraven, stačí vytvářet notifikace

---

## 🧪 TEST

```sql
-- Vytvoř testovací TODO s alarmem za 5 minut
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('Test alarm', 'Testovací poznámka', 1, TRUE);

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (LAST_INSERT_ID(), NOW() + INTERVAL 5 MINUTE, FALSE);

-- Počkej 5 minut, spusť worker, zkontroluj notification tabulku
```

---

## 🚀 PRIORITA: HIGH

Frontend je připraven, čeká jen na backend implementaci! 

**Otázky?** Vše je detailně popsáno v `BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md`
