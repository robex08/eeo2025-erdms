# Quick Reference - Notification System Implementation

**Status:** ✅ Frontend DONE | ⏳ Backend PENDING CONFIRMATION

---

## 🎯 Co bylo implementováno

### Frontend komponenty:
1. **NotificationBell** (`src/components/NotificationBell.js`)
   - Zvoneček s badge v headeru
   - Dropdown s posledními 10 notifikacemi
   - Mark as read / Mark all / Dismiss akce
   - Navigace na detail objednávky při kliknutí

2. **NotificationsAPI** (`src/services/notificationsApi.js`)
   - Wrapper pro všechny BE endpointy
   - Error handling
   - Typy notifikací + ikony + barvy

3. **Background Tasks** (`src/services/backgroundTasks.js`)
   - `notificationCheck` - každých 60s
   - `ordersRefresh` - každých 10 min
   - `postOrderAction` - okamžitě po uložení objednávky

4. **Context** (`src/context/BackgroundTasksContext.js`)
   - Sdílení unread count mezi komponentami
   - Callback koordinace pro refresh

5. **Integrace:**
   - `Layout.js` - zobrazení zvonečku
   - `Orders25List.js` - auto-refresh bez reload
   - `OrderForm25.js` - trigger po save
   - `App.js` - provider + registrace tasks

---

## 📡 BE Endpointy (z dokumentace)

| Endpoint | Method | Účel | Status |
|----------|--------|------|--------|
| `/notifications/list` | POST | Načíst seznam notifikací | ❓ |
| `/notifications/unread-count` | POST | Počet nepřečtených | ❓ |
| `/notifications/mark-read` | POST | Označit jako přečtenou | ❓ |
| `/notifications/mark-all-read` | POST | Označit všechny | ❓ |
| `/notifications/dismiss` | POST | Skrýt notifikaci | ❓ |

**❓ = Čeká na potvrzení BE teamu**

---

## 🔔 Workflow - Kdy vytvořit notifikaci

### 1️⃣ Nová objednávka (`order_created`)
**Trigger:** `POST /orders25/partial-insert`  
**Komu:**
- GARANT (garant_uzivatel_id)
- PŘÍKAZCE (prikazce_id)

**Message:**  
"Jan Novák vytvořil objednávku 'Nákup potřeb' (max. 15 000 Kč)"

---

### 2️⃣ Objednávka schválena (`order_approved`)
**Trigger:** `POST /orders25/partial-update` + změna `stav_workflow_kod` → `SCHVALENA`  
**Komu:**
- GARANT
- OBJEDNATEL (vlastník objednávky)

**Message:**  
"Pavel Svoboda schválil objednávku 'Nákup potřeb'"

---

### 3️⃣ Objednávka zamítnuta (`order_rejected`)
**Trigger:** `POST /orders25/partial-update` + změna `stav_workflow_kod` → `ZAMITNUTA`  
**Komu:**
- OBJEDNATEL

**Message:**  
"Pavel Svoboda zamítl objednávku 'Nákup potřeb' - Důvod: [komentar]"

---

## ⏱️ Časování (Frontend)

| Akce | Interval | Podmínka |
|------|----------|----------|
| Check notifikací | 60s | Přihlášený uživatel |
| Refresh objednávek | 10 min | Stránka Orders25List |
| Po uložení objednávky | Okamžitě | Po save v OrderForm25 |

---

## 🧪 Testing Checklist

### Frontend (✅ Done):
- [x] Zvoneček se zobrazuje
- [x] Badge s unread count
- [x] Dropdown otevírání/zavírání
- [x] Kliknutí naviguje na detail
- [x] Mark as read
- [x] Mark all as read
- [x] Dismiss
- [x] Background refresh 60s
- [x] Orders refresh 10 min
- [x] Trigger po save objednávky

### Backend (❓ Pending):
- [ ] `/notifications/list` funguje
- [ ] `/notifications/unread-count` vrací správný počet
- [ ] `/notifications/mark-read` aktualizuje DB
- [ ] `/notifications/mark-all-read` aktualizuje všechny
- [ ] `/notifications/dismiss` skrývá notifikaci
- [ ] Vytvoření objednávky → notifikace
- [ ] Schválení objednávky → notifikace
- [ ] Zamítnutí objednávky → notifikace

---

## 📝 Data struktura

### Request (typický):
```json
{
  "token": "...",
  "username": "...",
  "limit": 10,
  "offset": 0,
  "unread_only": false
}
```

### Response (očekávaná):
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "user_id": 42,
      "type": "order_created",
      "priority": "normal",
      "title": "Nová objednávka #2025-001",
      "message": "Jan Novák vytvořil objednávku...",
      "data_json": "{\"order_id\": 5678, \"order_number\": \"2025-001\"}",
      "is_read": 0,
      "is_dismissed": 0,
      "created_at": "2025-01-15 10:30:00"
    }
  ]
}
```

---

## 🔍 Debugging

### Console logs patterns:
```
[NotificationBell] ...         → UI komponenta
[NotificationsAPI] ...         → API volání
[BackgroundTask:notificationCheck] ... → Background task
[Orders25List] Background refresh ... → Auto-refresh
[OrderForm25] Background task trigger ... → Trigger po save
```

### Debugování BE:
1. Otevřít DevTools → Network tab
2. Filtr: "notifications"
3. Po uložení objednávky sledovat:
   - POST /orders25/partial-insert nebo partial-update
   - POST /notifications/unread-count (za 60s)
   - POST /notifications/list (za 60s)

---

## ❓ Otázky pro BE team

1. **Jsou všechny endpointy funkční?** (`/notifications/*`)
2. **Je implementován workflow?** (vytvoření → notifikace pro GARANT + PŘÍKAZCE)
3. **Jakou prioritu používáte?** (urgent/high/normal/low)
4. **Řešíte deduplikaci?** (GARANT = PŘÍKAZCE = jedna notifikace?)
5. **Indexy v DB?** (user_id, is_read, created_at)

---

## 📞 Kontakt

**Dokumentace:** `/docs/BACKEND-NOTIFICATION-WORKFLOW-REQUIREMENTS.md` (detaily)  
**Implementace FE:** 2025-01-15  
**Status:** Čeká na BE potvrzení + testování

---

## 🚀 Next Steps

1. BE team potvrdí funkčnost endpointů
2. BE team implementuje workflow notifikací (nebo potvrdí že funguje)
3. Společné testování FE + BE
4. Bug fixing
5. Release do produkce
