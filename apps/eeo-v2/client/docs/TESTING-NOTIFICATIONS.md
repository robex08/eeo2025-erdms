# 🔔 Testování Notifikačního Systému

**Datum:** 15. října 2025, 23:15  
**Status:** ✅ Frontend připraven | ✅ 30 typů notifikací | ✅ Test panel funkční  
**Auth:** 🔐 Používá šifrované údaje z localStorage

---

## 📊 Podporované typy notifikací

Systém nyní podporuje **30 různých typů notifikací** z DB tabulky `25_notification_templates`:

- **12 typů** - Stavy objednávek (order_status_*)
- **6 typů** - Obecné notifikace (order_*, user_mention, deadline_reminder)
- **12 typů** - Systémové notifikace (system_*)

**Kompletní přehled všech 30 typů viz:** [NOTIFICATION-STATUS-UPDATE.md](./features/NOTIFICATION-STATUS-UPDATE.md)

---

## 📋 Rychlý přehled

### Co funguje:
✅ **Ikona zvonečku** v menu baru (vedle profilu)  
✅ **Badge** s počtem nepřečtených notifikací  
✅ **Dropdown** s notifikacemi po kliknutí  
✅ **Prázdný stav** "Žádné nové notifikace"  
✅ **Background task** - automatická aktualizace každých 60s  
✅ **Označení jako přečtené** (mark as read)  
✅ **Smazání notifikace** (dismiss)  
✅ **Navigace** na detail objednávky po kliknutí  

### Co chybí:
❌ Backend endpoint: `POST /api/notifications/create`  
❌ Backend endpoint: `GET /api/notifications/list`  
❌ DB tabulka: `25_notifications` (pravděpodobně neobsahuje data)  

---

## 🚀 Jak testovat NYNÍ (3 metody)

### Metoda 1: Testovací React Stránka (NEJJEDNODUŠŠÍ) ⭐

**Toto je nejlepší metoda - běží přímo v aplikaci s plným přístupem k šifrování!**

1. **Přihlas se do aplikace:**
   ```
   http://localhost:3000
   ```

2. **Otevři testovací stránku:**
   ```

   ```
   
3. **Klikni na tlačítko** pro vytvoření notifikace:
   - ✅ "Objednávka schválena" → vytvoří zelenou notifikaci
   - ❌ "Objednávka zamítnuta" → vytvoří červenou notifikaci
   - 📋 "Nová objednávka" → vytvoří modrou notifikaci
   - atd.

4. **Počkej 5-10 sekund** (background task aktualizuje)

5. **Zkontroluj ikonku zvonečku** → měl by se zobrazit červený badge

**✅ Výhody této metody:**
- Běží přímo v aplikaci (stejný origin)
- Plný přístup k šifrovaným údajům
- Automatická autentizace
- Žádné CORS problémy
- Pouze pro development mode

---

### ~~Metoda 1: Testovací HTML Panel~~ (DEPRECATED)

**⚠️ Tato metoda nefunguje kvůli šifrování! Použij Metodu 1 výše.**

<details>
<summary>Klikni pro zobrazení staré metody (nefunkční)</summary>

1. **Otevři testovací panel:**
   ```
   file:///home/holovsky/dokumenty/Jazyky/react/wObj/r-app-zzs-eeo-25/test-debug/test-notification-panel.html
   ```

**❌ Problém:** HTML soubor na `file://` protokolu nemá přístup k localStorage z `http://localhost:3000`

</details>

---

### Metoda 2: Console v prohlížeči

1. **Přihlas se do aplikace**

2. **Otevři DevTools** (F12)

3. **Přejdi na Console**

4. **Zkopíruj a spusť** celý soubor:
   ```javascript
   // Zkopíruj obsah z:
   test-debug/test-create-notification.js
   ```

5. **Spusť příkaz:**
   ```javascript
   createTestNotification('order_created')
   ```

6. **Další příkazy:**
   ```javascript
   // Nápověda
   notificationHelp()
   
   // Jednotlivé typy
   createTestNotification('order_approved')
   createTestNotification('order_rejected')
   createTestNotification('deadline_reminder')
   
   // Všechny najednou
   createAllTestNotifications()
   ```

---

### Metoda 3: Mock data v kódu (BEZ BACKENDU)

Pokud backend endpoint ještě neexistuje, můžeš použít mock data:

1. **Otevři soubor:**
   ```
   src/services/notificationsApi.js
   ```

2. **Na začátek funkce `getNotificationsList` přidej:**
   ```javascript
   export const getNotificationsList = async (params = {}) => {
     // 🧪 MOCK DATA PRO TESTOVÁNÍ (odstranit až bude backend)
     if (process.env.NODE_ENV === 'development') {
       return {
         success: true,
         data: [
           {
             id: 1,
             type: 'order_created',
             title: 'Nová objednávka k schválení',
             message: 'Objednávka č. 2025-003 čeká na schválení.',
             priority: 'normal',
             category: 'orders',
             is_read: 0,
             is_dismissed: 0,
             dt_created: new Date().toISOString(),
             data_json: JSON.stringify({
               order_id: 3,
               order_number: '2025-003'
             })
           },
           {
             id: 2,
             type: 'deadline_reminder',
             title: 'Upozornění na termín',
             message: 'Blíží se termín dodání objednávky 2025-004 (zbývá 3 dny)',
             priority: 'high',
             category: 'reminders',
             is_read: 0,
             is_dismissed: 0,
             dt_created: new Date(Date.now() - 3600000).toISOString(),
             data_json: JSON.stringify({
               order_id: 4,
               order_number: '2025-004'
             })
           }
         ],
         total: 2,
         unread_count: 2
       };
     }
     // ... zbytek původního kódu
   ```

3. **Ulož soubor** a reload aplikaci

4. **Klikni na zvoněček** → měly by se zobrazit 2 testovací notifikace

---

## 🔍 Co očekávat po kliknutí na zvoněček

### Když NEMÁŠ notifikace:
```
┌────────────────────────────────────┐
│ Notifikace                    ✕    │
├────────────────────────────────────┤
│                                    │
│          🔔                        │
│   Žádné nové notifikace            │
│                                    │
└────────────────────────────────────┘
```

### Když MÁŠ notifikace:
```
┌────────────────────────────────────┐
│ Notifikace (2)        ✓✓      ✕    │
├────────────────────────────────────┤
│ 📋 Nová objednávka k schválení     │
│    Objednávka č. 2025-003 čeká...  │
│    Před 2 min                      │
│                               ✕    │
├────────────────────────────────────┤
│ ⏰ Upozornění na termín            │
│    Blíží se termín dodání...       │
│    Před 1 h                        │
│                               ✕    │
├────────────────────────────────────┤
│ Zobrazit všechny notifikace        │
└────────────────────────────────────┘
```

---

## 🎨 Jak vypadá ikona zvonečku

### V normálním stavu (0 notifikací):
```
🔔 (šedá ikona, bez badge)
```

### S nepřečtenými notifikacemi:
```
🔔 (modrá ikona + červený badge "3")
 ³
```

### Badge zobrazení:
- **1-99**: Zobrazí přesný počet (`3`)
- **100+**: Zobrazí `99+`

---

## 🐛 Troubleshooting

### Problém: "Kliknu na zvoněček a nic se nestane"

**Řešení:**
1. Otevři DevTools Console (F12)
2. Podívej se na chyby (červené texty)
3. Pravděpodobně:
   ```
   Failed to load notifications: 404 Not Found
   ```
4. **Příčina:** Backend endpoint `/api/notifications/list` neexistuje
5. **Řešení:** Použij Metodu 3 (mock data) výše

---

### Problém: "Badge neukazuje počet notifikací"

**Kontrola:**
1. Otevři Console a spusť:
   ```javascript
   // Kontrola background tasks
   const bgTasks = JSON.parse(localStorage.getItem('backgroundTasks') || '{}');
   console.log('Unread count:', bgTasks.unreadNotificationsCount);
   ```

2. Pokud je `undefined` nebo `0`:
   - Background task ještě nenačetl data
   - Backend nevrátil správný `unread_count`
   - Použij mock data (Metoda 3)

---

### Problém: "Dropdown se nezobrazí"

**Kontrola:**
1. Zkontroluj CSS z-index:
   ```javascript
   // V Console
   const dropdown = document.querySelector('[class*="Dropdown"]');
   console.log('Dropdown visible:', dropdown ? 'YES' : 'NO');
   console.log('Z-index:', dropdown ? getComputedStyle(dropdown).zIndex : 'N/A');
   ```

2. Pokud dropdown **existuje**, ale není vidět:
   - Zkontroluj překrývání jinými elementy
   - Z-index by měl být `1000`

3. Pokud dropdown **neexistuje**:
   - `dropdownOpen` state je `false`
   - Zkontroluj, jestli `toggleDropdown` funguje:
     ```javascript
     // Najdi button a simuluj kliknutí
     document.querySelector('[title*="Notifikace"]').click();
     ```

---

## 📊 Backend požadavky

Pro plnou funkčnost notifikací potřebuješ následující backend endpointy:

### 1. Načtení notifikací
```http
GET /api/notifications/list?limit=10&unread_only=false

Headers:
  Authorization: Bearer {token}
  X-Username: {username}

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "order_created",
      "title": "Nová objednávka k schválení",
      "message": "Objednávka č. 2025-003 čeká na schválení.",
      "priority": "normal",
      "category": "orders",
      "is_read": 0,
      "is_dismissed": 0,
      "dt_created": "2025-01-15T10:30:00Z",
      "from_user_name": "Jan",
      "from_user_surname": "Novák",
      "data_json": "{\"order_id\": 3, \"order_number\": \"2025-003\"}"
    }
  ],
  "total": 1,
  "unread_count": 1
}
```

### 2. Počet nepřečtených
```http
GET /api/notifications/unread-count

Headers:
  Authorization: Bearer {token}
  X-Username: {username}

Response:
{
  "success": true,
  "unread_count": 3
}
```

### 3. Označit jako přečtenou
```http
POST /api/notifications/{id}/mark-read

Headers:
  Authorization: Bearer {token}
  X-Username: {username}

Response:
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 4. Smazat notifikaci
```http
POST /api/notifications/{id}/dismiss

Headers:
  Authorization: Bearer {token}
  X-Username: {username}

Response:
{
  "success": true,
  "message": "Notification dismissed"
}
```

### 5. Označit všechny jako přečtené
```http
POST /api/notifications/mark-all-read

Headers:
  Authorization: Bearer {token}
  X-Username: {username}

Response:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 6. Vytvořit notifikaci (pro testování)
```http
POST /api/notifications/create

Headers:
  Authorization: Bearer {token}
  X-Username: {username}
  Content-Type: application/json

Body:
{
  "type": "order_created",
  "title": "Nová objednávka k schválení",
  "message": "Objednávka č. 2025-003 čeká na schválení.",
  "priority": "normal",
  "category": "orders",
  "data_json": "{\"order_id\": 3, \"order_number\": \"2025-003\"}"
}

Response:
{
  "success": true,
  "id": 123,
  "message": "Notification created"
}
```

---

## 📊 Přehled všech 30 typů notifikací

### 📦 STAVY OBJEDNÁVEK (12 typů)

| Typ | Název | Ikona | Priorita | Email | Příjemci |
|-----|-------|-------|----------|-------|----------|
| `order_status_nova` | Objednávka vytvořena | 📝 | low | ❌ | - |
| `order_status_ke_schvaleni` | Ke schválení | 📋 | normal | ✅ | GARANT + PŘÍKAZCE |
| `order_status_schvalena` | Schválena | ✅ | normal | ✅ | VLASTNÍK |
| `order_status_zamitnuta` | Zamítnuta | ❌ | high | ✅ | VLASTNÍK |
| `order_status_ceka_se` | Čeká | ⏸️ | low | ❌ | VLASTNÍK |
| `order_status_odeslana` | Odeslána | 📤 | normal | ✅ | GARANT + PŘÍKAZCE |
| `order_status_potvrzena` | Potvrzena | ✔️ | normal | ✅ | GARANT + PŘÍKAZCE |
| `order_status_dokoncena` | Dokončena | 🎉 | normal | ✅ | VŠICHNI |
| `order_status_zrusena` | Zrušena | 🚫 | high | ✅ | VLASTNÍK |
| `order_status_ceka_potvrzeni` | Čeká na potvrzení | ⏳ | normal | ❌ | GARANT + PŘÍKAZCE |
| `order_status_smazana` | Smazána | 🗑️ | high | ✅ | VLASTNÍK |
| `order_status_rozpracovana` | Rozpracována | 🔄 | low | ❌ | GARANT + PŘÍKAZCE |

### 📋 OBECNÉ (6 typů - deprecated)

| Typ | Název | Ikona | Priorita |
|-----|-------|-------|----------|
| `order_approved` | Objednávka schválena | ✅ | normal |
| `order_rejected` | Objednávka zamítnuta | ❌ | high |
| `order_created` | Nová objednávka | 📋 | normal |
| `system_maintenance` | Systémová údržba | 🔧 | normal |
| `user_mention` | Zmínka v komentáři | 👤 | low |
| `deadline_reminder` | Upozornění na termín | ⏰ | high |

### 🖥️ SYSTÉMOVÉ (12 typů)

| Typ | Název | Ikona | Priorita |
|-----|-------|-------|----------|
| `system_maintenance_scheduled` | Plánovaná údržba | 📅 | high |
| `system_maintenance_starting` | Údržba začíná | 🔧 | urgent |
| `system_maintenance_finished` | Údržba dokončena | ✅ | normal |
| `system_backup_started` | Zálohování systému | 💾 | low |
| `system_backup_completed` | Zálohování dokončeno | ✔️ | low |
| `system_database_backup` | Záloha databáze | 🗄️ | low |
| `system_update_available` | Dostupná aktualizace | 🆕 | normal |
| `system_update_installed` | Systém aktualizován | 🎉 | normal |
| `system_security_alert` | Bezpečnostní upozornění | 🚨 | urgent |
| `system_user_login_alert` | Neobvyklé přihlášení | 🔐 | high |
| `system_session_expired` | Relace vypršela | ⏱️ | normal |
| `system_storage_warning` | Nedostatek místa | 💿 | high |

**Poznámka:** Kompletní dokumentace včetně helper funkcí a placeholderů viz [NOTIFICATION-STATUS-UPDATE.md](./features/NOTIFICATION-STATUS-UPDATE.md)

---

## ✅ Checklist pro kompletní testování

- [ ] Otevřít testovací HTML panel
- [ ] Přihlásit se do aplikace
- [ ] Vytvořit testovací notifikaci
- [ ] Zkontrolovat červený badge na zvonečku
- [ ] Kliknout na zvoněček → otevře se dropdown
- [ ] Vidět seznam notifikací
- [ ] Kliknout na notifikaci → označí se jako přečtená
- [ ] Kliknout na X → smaže notifikaci
- [ ] Kliknout na ✓✓ → označí všechny jako přečtené
- [ ] Badge zmizí, když jsou všechny přečtené
- [ ] Kliknout na "Zobrazit všechny" → naviguje na /notifications
- [ ] Kliknout mimo dropdown → zavře se

---

## 📞 Potřebuješ pomoc?

**Frontend:** Tomáš Holoský  
**Backend:** [Doplň jméno backend developera]  
**Dokumentace:** `docs/NOTIFICATION-TEMPLATES-PLACEHOLDERS.md`

---

**Poslední aktualizace:** 15. října 2025
