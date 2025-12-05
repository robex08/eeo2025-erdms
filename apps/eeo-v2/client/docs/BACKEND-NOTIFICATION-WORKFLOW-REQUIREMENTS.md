# Backend - Požadavky na workflow notifikací

**Datum:** 2025-01-15  
**Implementace FE:** Dokončena  
**Status BE:** Čeká na potvrzení/implementaci

---

## 1. Přehled implementace

Frontend má **plně implementovaný systém notifikací** s těmito komponenty:

### ✅ Implementované FE komponenty:
- **NotificationBell** - UI komponenta se zvonečkem a dropdownem
- **NotificationsAPI** - Wrapper pro všechny BE endpointy
- **Background tasks** - Automatické načítání notifikací každých 60 sekund
- **Context** - Sdílení stavu mezi komponentami (unread count)
- **Auto-refresh objednávek** - Každých 10 minut na stránkách se seznamem objednávek

### 🔧 Integrace:
- Layout.js: Zobrazuje zvoneček s počtem nepřečtených notifikací
- OrderForm25.js: Po uložení objednávky spouští refresh notifikací + seznamu objednávek
- Orders25List.js: Automaticky se aktualizuje bez reload stránky

---

## 2. Endpointy API - Potvrzení funkcionality

Frontend využívá tyto endpointy (podle dodané dokumentace):

### 2.1 `POST /notifications/list`
**Request:**
```json
{
  "token": "...",
  "username": "...",
  "limit": 10,
  "offset": 0,
  "unread_only": false,
  "type_filter": null,
  "priority_filter": null,
  "category_filter": null
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "user_id": 42,
      "type": "order_created",
      "priority": "normal",
      "category": "orders",
      "title": "Nová objednávka",
      "message": "Byla vytvořena nová objednávka #2025-001",
      "data_json": "{\"order_id\": 5678, \"order_number\": \"2025-001\"}",
      "is_read": 0,
      "is_dismissed": 0,
      "created_at": "2025-01-15 10:30:00",
      "read_at": null
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

**❓ Prosím potvrdit:**
- ✅ Je endpoint funkční?
- ✅ Odpovídá response struktura dokumentaci?
- ✅ Funguje filtrování (unread_only, type_filter, priority_filter)?

---

### 2.2 `POST /notifications/unread-count`
**Request:**
```json
{
  "token": "...",
  "username": "..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "unread_count": 3
}
```

**❓ Prosím potvrdit:**
- ✅ Je endpoint funkční?
- ✅ Vrací správný počet nepřečtených notifikací pro uživatele?

---

### 2.3 `POST /notifications/mark-read`
**Request:**
```json
{
  "token": "...",
  "username": "...",
  "notification_id": 123
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notifikace označena jako přečtená"
}
```

**❓ Prosím potvrdit:**
- ✅ Je endpoint funkční?
- ✅ Aktualizuje DB (nastaví is_read=1, read_at=NOW())?

---

### 2.4 `POST /notifications/mark-all-read`
**Request:**
```json
{
  "token": "...",
  "username": "..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Všechny notifikace označeny jako přečtené",
  "affected_rows": 5
}
```

**❓ Prosím potvrdit:**
- ✅ Je endpoint funkční?
- ✅ Označuje všechny nepřečtené notifikace uživatele?

---

### 2.5 `POST /notifications/dismiss`
**Request:**
```json
{
  "token": "...",
  "username": "...",
  "notification_id": 123
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notifikace skryta"
}
```

**❓ Prosím potvrdit:**
- ✅ Je endpoint funkční?
- ✅ Nastaví is_dismissed=1 v DB?
- ✅ Skryté notifikace se NEvrací v /notifications/list?

---

## 3. Workflow notifikací - Požadavky na BE

### 3.1 Kdy vytvořit notifikace: **Nová objednávka**

**Trigger:** Při volání `POST /orders25/partial-insert` (vytvoření nové objednávky)

**Komu poslat notifikaci:**
1. **GARANT** (garant_uzivatel_id z objednávky)
2. **Příkazce operace** (prikazce_id z objednávky)

**Typ notifikace:** `order_created`

**Priorita:** `normal` nebo `high` (podle ceny objednávky?)

**Příklad data_json:**
```json
{
  "order_id": 5678,
  "order_number": "2025-001",
  "predmet": "Nákup kancelářských potřeb",
  "max_cena_s_dph": 15000,
  "objednatel_fullname": "Jan Novák",
  "stav": "NOVA"
}
```

**Zpráva:**
- **Title:** "Nová objednávka #2025-001"
- **Message:** "Jan Novák vytvořil objednávku 'Nákup kancelářských potřeb' (max. 15 000 Kč)"

**❓ Prosím potvrdit:**
- ❓ Je toto implementováno na BE?
- ❓ Pokud NE, potřebujete pomoc s SQL/PHP kódem?

---

### 3.2 Kdy vytvořit notifikace: **Objednávka schválena**

**Trigger:** Při volání `POST /orders25/partial-update` kde se mění `stav_workflow_kod` na `SCHVALENA`

**Komu poslat notifikaci:**
1. **GARANT** (garant_uzivatel_id z objednávky)
2. **Vlastník objednávky** (objednatel_id / uzivatel_id z objednávky)

**Typ notifikace:** `order_approved`

**Priorita:** `high`

**Příklad data_json:**
```json
{
  "order_id": 5678,
  "order_number": "2025-001",
  "predmet": "Nákup kancelářských potřeb",
  "schvalovatel_fullname": "Pavel Svoboda",
  "dt_schvaleni": "2025-01-15 14:30:00"
}
```

**Zpráva:**
- **Title:** "Objednávka #2025-001 schválena"
- **Message:** "Pavel Svoboda schválil objednávku 'Nákup kancelářských potřeb'"

**❓ Prosím potvrdit:**
- ❓ Je toto implementováno na BE?
- ❓ Pokud NE, potřebujete pomoc s implementací?

---

### 3.3 Kdy vytvořit notifikace: **Objednávka zamítnuta**

**Trigger:** Při volání `POST /orders25/partial-update` kde se mění `stav_workflow_kod` na `ZAMITNUTA`

**Komu poslat notifikaci:**
1. **Vlastník objednávky** (objednatel_id z objednávky)

**Typ notifikace:** `order_rejected`

**Priorita:** `urgent`

**Příklad data_json:**
```json
{
  "order_id": 5678,
  "order_number": "2025-001",
  "predmet": "Nákup kancelářských potřeb",
  "schvalovatel_fullname": "Pavel Svoboda",
  "komentar": "Nedostatečné zdůvodnění nákladu"
}
```

**Zpráva:**
- **Title:** "Objednávka #2025-001 zamítnuta"
- **Message:** "Pavel Svoboda zamítl objednávku 'Nákup kancelářských potřeb' - Důvod: Nedostatečné zdůvodnění nákladu"

**❓ Prosím potvrdit:**
- ❓ Je toto implementováno na BE?

---

## 4. Typy notifikací - Kompletní seznam

Frontend podporuje tyto typy notifikací (viz NOTIFICATION_CONFIG v notificationsApi.js):

| Type | Icon | Color | Kategorie | Popis |
|------|------|-------|-----------|-------|
| `order_created` | 📋 | blue | orders | Nová objednávka |
| `order_approved` | ✅ | green | orders | Objednávka schválena |
| `order_rejected` | ❌ | red | orders | Objednávka zamítnuta |
| `order_cancelled` | 🚫 | gray | orders | Objednávka zrušena |
| `order_updated` | 📝 | blue | orders | Objednávka aktualizována |
| `order_reminder` | ⏰ | orange | reminders | Připomínka objednávky |
| `system` | ℹ️ | gray | system | Systémová notifikace |

**❓ Prosím potvrdit:**
- ❓ Jsou všechny tyto typy vytvářeny na BE?
- ❓ Chybí nějaký typ, který byste chtěli přidat?

---

## 5. Priority notifikací

Frontend podporuje tyto priority:

| Priority | Badge Color | Použití |
|----------|-------------|---------|
| `urgent` | Red | Kritické akce (zamítnutí, chyby) |
| `high` | Orange | Důležité (schválení, připomínky) |
| `normal` | Gray | Běžné (nová objednávka, aktualizace) |
| `low` | Light gray | Informativní |

**❓ Prosím potvrdit:**
- ❓ Jakou prioritu používáte pro jednotlivé typy notifikací?

---

## 6. Časování notifikací (Frontend)

### Auto-refresh:
- **Notifikace:** Každých **60 sekund** (volá `/notifications/unread-count` + `/notifications/list`)
- **Objednávky:** Každých **10 minut** (volá `/orders25/by-user`)
- **Po uložení objednávky:** **Okamžitý** refresh (notifikace + objednávky)

### Podmínky:
- Background tasky běží **pouze když je uživatel přihlášen**
- Refresh objednávek běží **pouze na stránkách Orders25List** (ne na formuláři)
- Po kliknutí na notifikaci → navigace na detail objednávky

---

## 7. Databázová struktura - Očekávání

Frontend očekává tuto strukturu notifikací v DB:

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,  -- order_created, order_approved, ...
  priority VARCHAR(20) NOT NULL,  -- urgent, high, normal, low
  category VARCHAR(50) NOT NULL,  -- orders, reminders, system
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data_json TEXT,  -- JSON s order_id, order_number, ...
  is_read TINYINT DEFAULT 0,
  is_dismissed TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_is_dismissed (is_dismissed),
  INDEX idx_created_at (created_at)
);
```

**❓ Prosím potvrdit:**
- ✅ Odpovídá tato struktura vaší DB?
- ✅ Jsou všechny indexy vytvořeny pro výkon?

---

## 8. Co ještě chybí / není jasné?

### 8.1 Duplicitní notifikace
**Otázka:** Co když GARANT = PŘÍKAZCE = OBJEDNATEL?  
**Řešení:** Měl by dostat jednu notifikaci nebo tři?  
**Návrh FE:** Deduplikace - jedna notifikace, v message zmínit všechny role.

### 8.2 Notifikace pro schvalovatel
**Otázka:** Dostává schvalovatel notifikaci při vytvoření objednávky?  
**Návrh FE:** ANO - přidat `order_pending_approval` typ.

### 8.3 Notifikace při změně stavu
**Otázka:** Mají se vytvářet notifikace při:
- Odeslání objednávky dodavateli (ODESLANA)?
- Zrušení objednávky (ZRUSENA)?
- Aktualizaci detailů objednávky?

**Návrh FE:** ANO pro ODESLANA/ZRUSENA, NE pro běžné aktualizace.

### 8.4 Hromadné notifikace
**Otázka:** Pokud uživatel schválí 10 objednávek najednou, vytvoří se 10 notifikací?  
**Návrh FE:** ANO - každá objednávka = samostatná notifikace (lepší tracking).

---

## 9. Testování - Checklist

### Frontend testing (✅ Done):
- [x] Zvoneček se zobrazuje v headeru
- [x] Unread count se aktualizuje
- [x] Dropdown se otevírá/zavírá
- [x] Kliknutí na notifikaci naviguje na detail
- [x] Mark as read funguje
- [x] Mark all as read funguje
- [x] Dismiss funguje
- [x] Background refresh běží každých 60s
- [x] Orders refresh běží každých 10 min

### Backend testing (❓ Pending):
- [ ] POST /notifications/list vrací data
- [ ] POST /notifications/unread-count vrací správný počet
- [ ] POST /notifications/mark-read aktualizuje DB
- [ ] POST /notifications/mark-all-read aktualizuje všechny
- [ ] POST /notifications/dismiss skrývá notifikaci
- [ ] Vytvoření objednávky → notifikace pro GARANT + PŘÍKAZCE
- [ ] Schválení objednávky → notifikace pro GARANT + OBJEDNATEL
- [ ] Zamítnutí objednávky → notifikace pro OBJEDNATEL

---

## 10. Další kroky

### Akce pro Backend team:
1. **Potvrdit** funkčnost všech 5 endpointů (seznam výše)
2. **Implementovat** workflow notifikací (vytvoření, schválení, zamítnutí)
3. **Otestovat** deduplikaci (GARANT = PŘÍKAZCE?)
4. **Potvrdit** DB strukturu a indexy
5. **Sdělit** prioritu pro jednotlivé typy notifikací

### Akce pro Frontend team:
1. ✅ Implementace hotová - čeká na BE potvrzení
2. Připravit bug reporting pro vývojové prostředí
3. Dokumentovat edge cases (timeout, chyby API, ...)

---

## 11. Kontakt

**Frontend Developer:** GitHub Copilot  
**Datum implementace FE:** 2025-01-15  
**Dokumentace:** `/docs/BACKEND-NOTIFICATION-WORKFLOW-REQUIREMENTS.md`

**Prosím o potvrzení statusu BE implementace a případné dotazy.**

---

## Přílohy

### A. Příklad notification object (pro testování):
```json
{
  "id": 123,
  "user_id": 42,
  "type": "order_approved",
  "priority": "high",
  "category": "orders",
  "title": "Objednávka #2025-001 schválena",
  "message": "Pavel Svoboda schválil objednávku 'Nákup kancelářských potřeb'",
  "data_json": "{\"order_id\": 5678, \"order_number\": \"2025-001\", \"predmet\": \"Nákup kancelářských potřeb\", \"schvalovatel_fullname\": \"Pavel Svoboda\", \"dt_schvaleni\": \"2025-01-15 14:30:00\"}",
  "is_read": 0,
  "is_dismissed": 0,
  "created_at": "2025-01-15 14:30:05",
  "read_at": null
}
```

### B. Frontend log patterns (pro debugging):
- `[NotificationBell] ...` - UI komponenta
- `[NotificationsAPI] ...` - API volání
- `[BackgroundTask:notificationCheck] ...` - Background task
- `[Orders25List] Background refresh ...` - Auto-refresh objednávek
- `[OrderForm25] Background task trigger ...` - Trigger po uložení
