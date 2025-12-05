# ✅ TODO Alarm Notifikace - Project Checklist

**Projekt:** Automatické notifikace pro TODO alarmy  
**Datum zadání:** 25. října 2025  
**Priorita:** HIGH  
**Odhadovaný čas:** 6-10 hodin (backend)

---

## 📊 STATUS PŘEHLED

| Část | Status | Zodpovědnost | Čas |
|------|--------|--------------|-----|
| Frontend | ✅ HOTOVO | Frontend tým | - |
| Dokumentace | ✅ HOTOVO | Frontend tým | - |
| SQL Šablony | ⏳ ČEKÁ | Backend tým | 2 min |
| Background Worker | ⏳ ČEKÁ | Backend tým | 4-8 h |
| Testing | ⏳ ČEKÁ | Backend tým | 30 min |
| Deployment | ⏳ ČEKÁ | DevOps/Backend | 30 min |

---

## 📋 BACKEND TASK BREAKDOWN

### Task 1: SQL Šablony Import ⏱️ 2 minuty
**Zodpovědnost:** Backend Developer  
**Priorita:** Critical (bez tohoto nic nefunguje)

**Co udělat:**
```bash
# Spustit SQL soubor
mysql -u user -p database < docs/DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql
```

**Ověření:**
```sql
SELECT type, name, priority_default 
FROM notification_template 
WHERE type LIKE 'alarm_todo_%';
-- Mělo by vrátit 3 řádky
```

**Status:**
- [ ] SQL soubor spuštěn
- [ ] Šablony ověřeny v databázi
- [ ] Dokumentace zkontrolována

---

### Task 2: Databázová struktura ⏱️ 5 minut
**Zodpovědnost:** Backend Developer  
**Priorita:** High

**Co udělat:**
1. Zkontrolovat strukturu `todo_alarm` tabulky
2. Přidat sloupce pokud chybí:
```sql
ALTER TABLE todo_alarm 
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_sent_at DATETIME NULL,
ADD INDEX idx_notification_sent (notification_sent, alarm_datetime);
```

**Alternativa:** Pokud nelze upravit tabulku, použít jiný způsob kontroly (viz spec)

**Status:**
- [ ] Struktura tabulky zkontrolována
- [ ] Sloupce přidány nebo alternativa zvolena
- [ ] Indexy vytvořeny

---

### Task 3: Background Worker - Core Logic ⏱️ 2-3 hodiny
**Zodpovědnost:** Backend Developer  
**Priorita:** Critical

**Co implementovat:**
1. ✅ Funkce pro načtení čekajících alarmů
2. ✅ Logika určení typu notifikace (normal/high/expired)
3. ✅ Vytváření notifikací
4. ✅ Označování alarmů jako zpracované

**Reference:**
- `docs/BACKEND-TODO-ALARM-WORKER-EXAMPLE.py` (vzorový kód)
- `docs/BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md` (pseudokód)

**Status:**
- [ ] SQL query pro výběr alarmů implementován
- [ ] Logika určení typu notifikace implementována
- [ ] Funkce pro vytvoření notifikace implementována
- [ ] Funkce pro označení alarmu implementována
- [ ] Unit testy napsány

---

### Task 4: Background Worker - Integration ⏱️ 1-2 hodiny
**Zodpovědnost:** Backend Developer + DevOps  
**Priorita:** High

**Co udělat:**
1. Integrovat worker do existující architektury
2. Nastavit scheduling (cron job / systemd timer)
3. Přidat logging
4. Přidat error handling

**Doporučené nastavení:**
- Frekvence: každých 5 minut
- Timeout: 2 minuty
- Retry: 3x při selhání

**Status:**
- [ ] Worker integrován do systému
- [ ] Cron job / scheduler nastaven
- [ ] Logging implementován
- [ ] Error handling přidán
- [ ] Konfigurace zdokumentována

---

### Task 5: Testing ⏱️ 30 minut
**Zodpovědnost:** Backend Developer + QA  
**Priorita:** Critical

**Test scénáře:**

**Scénář 1: Normal Priority**
```sql
-- Vytvoř TODO s alarmem za 25 minut
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('Test Normal Priority', 'Test', 1, TRUE);

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (LAST_INSERT_ID(), NOW() + INTERVAL 25 MINUTE, FALSE);

-- Počkat a spustit worker
-- Očekávám: notification s template 'alarm_todo_normal', priority 'normal'
```

**Scénář 2: High Priority**
```sql
-- Vytvoř TODO s alarmem za 5 minut
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('Test High Priority', 'Urgentní test', 1, TRUE);

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (LAST_INSERT_ID(), NOW() + INTERVAL 5 MINUTE, FALSE);

-- Očekávám: notification s template 'alarm_todo_high', priority 'high'
```

**Scénář 3: Expired**
```sql
-- Vytvoř TODO s alarmem v minulosti
INSERT INTO todo (title, note, user_id, is_active)
VALUES ('Test Expired', 'Prošlý termín', 1, TRUE);

INSERT INTO todo_alarm (todo_id, alarm_datetime, is_completed)
VALUES (LAST_INSERT_ID(), NOW() - INTERVAL 5 MINUTE, FALSE);

-- Očekávám: notification s template 'alarm_todo_expired', priority 'high'
```

**Scénář 4: Duplicita**
```sql
-- Ověř, že se nevytvoří duplicitní notifikace
-- Spusť worker 2x pro stejný alarm
-- Očekávám: pouze 1 notifikace
```

**Status:**
- [ ] Scénář 1 - Normal priority ✅
- [ ] Scénář 2 - High priority ✅
- [ ] Scénář 3 - Expired ✅
- [ ] Scénář 4 - Duplicita ✅
- [ ] Frontend test - zobrazení notifikace ✅
- [ ] Test dokumentace vytvořena

---

### Task 6: Monitoring Setup ⏱️ 30 minut
**Zodpovědnost:** DevOps  
**Priorita:** Medium

**Co monitorovat:**
1. Počet zpracovaných alarmů
2. Chyby při zpracování
3. Zpoždění notifikací
4. Doba běhu workeru

**Nástroje:**
- Logy: `/var/log/todo-alarm-worker.log`
- Metriky: Prometheus / vlastní monitoring
- Alerts: při selhání workeru

**Status:**
- [ ] Logging nastaven
- [ ] Metriky implementovány
- [ ] Alerting nakonfigurován
- [ ] Dashboard vytvořen (volitelné)

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Všechny testy prošly
- [ ] Code review dokončen
- [ ] Dokumentace aktualizována
- [ ] SQL šablony připraveny pro produkci

### Deployment Steps
1. [ ] **Dev prostředí:**
   - [ ] SQL šablony import
   - [ ] Worker deployment
   - [ ] Testing
   
2. [ ] **Staging prostředí:**
   - [ ] SQL šablony import
   - [ ] Worker deployment
   - [ ] Testing
   - [ ] UAT (User Acceptance Testing)
   
3. [ ] **Production prostředí:**
   - [ ] SQL šablony import (POZOR: běží na živých datech!)
   - [ ] Worker deployment
   - [ ] Monitoring zapnut
   - [ ] Smoke tests

### Post-Deployment
- [ ] Monitoring kontrola (první 24 hodin)
- [ ] Uživatelský feedback
- [ ] Performance metriky
- [ ] Bug tracking

---

## 📞 KOMUNIKACE

### Daily Stand-up Updates
**Co reportovat:**
- Task status (dokončeno, in progress, blocked)
- Objevené problémy
- Odhadovaný čas dokončení

### Eskalace
**Kdy eskalovat:**
- Blokující problém > 2 hodiny
- Chybějící informace v dokumentaci
- Technický problém s architekturou

**Komu:**
- Tech Lead: [jméno]
- Frontend tým: [kontakt]
- DevOps: [kontakt]

---

## 📊 METRIKY ÚSPĚCHU

### Technické metriky:
- [ ] Worker běží bez chyb 99.9% času
- [ ] Notifikace vytvořeny do 1 minuty od alarmu
- [ ] 0% duplicitních notifikací
- [ ] < 5 sekund doba zpracování workeru

### Business metriky:
- [ ] Uživatelé dostávají notifikace včas
- [ ] Snížení zapomenutých TODO úkolů
- [ ] Pozitivní uživatelský feedback

---

## 🎯 MILESTONES

| Milestone | Termín | Status |
|-----------|--------|--------|
| SQL šablony import | Den 1 | ⏳ |
| Core logic implementace | Den 1-2 | ⏳ |
| Integration a testing | Den 2-3 | ⏳ |
| Deployment na dev | Den 3 | ⏳ |
| Deployment na staging | Den 4 | ⏳ |
| Deployment na production | Den 5 | ⏳ |
| Post-deploy monitoring | Den 5-6 | ⏳ |

---

## 📎 ODKAZY NA DOKUMENTACI

- [TODO-ALARM-NOTIFICATIONS-INDEX.md](TODO-ALARM-NOTIFICATIONS-INDEX.md) - Hlavní index
- [TODO-ALARM-NOTIFICATION-BELL-SUMMARY.md](TODO-ALARM-NOTIFICATION-BELL-SUMMARY.md) - Shrnutí
- [BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md](BACKEND-TODO-ALARM-NOTIFICATIONS-SPEC.md) - Technická spec
- [BACKEND-TODO-ALARM-WORKER-EXAMPLE.py](BACKEND-TODO-ALARM-WORKER-EXAMPLE.py) - Vzorový kód
- [DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql](DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql) - SQL šablony

---

## ✅ SIGN-OFF

### Backend Developer:
- [ ] Implementace dokončena
- [ ] Testy prošly
- [ ] Dokumentace aktualizována
- **Jméno:** ________________
- **Datum:** ________________

### Tech Lead:
- [ ] Code review dokončen
- [ ] Architektura schválena
- [ ] Ready for deployment
- **Jméno:** ________________
- **Datum:** ________________

### DevOps:
- [ ] Deployment dokončen
- [ ] Monitoring aktivní
- [ ] Production ready
- **Jméno:** ________________
- **Datum:** ________________

---

**Aktualizováno:** 25. října 2025  
**Status:** READY TO START 🚀
