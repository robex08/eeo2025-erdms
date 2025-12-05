# ⏱️ RYCHLÝ SOUHRN - Časování notifikací a ID kontrola

**Datum:** 15. října 2025, 22:45

---

## 🎯 Tvoje otázky a odpovědi

### 1️⃣ "ID: N/A" - je to správně?

**❌ NE, není to správně!**

Backend **MUSÍ** vracet ID vytvořené notifikace v response:

```json
{
  "status": "ok",
  "notification_id": 123  // ← TOTO CHYBÍ (preferováno)
}
```

**Nebo alternativně (fallback):**
```json
{
  "status": "ok",
  "id": 123  // ← Toto také funguje
}
```

**⚠️ Priorita:** Frontend hledá `notification_id` jako první, pak `id` jako fallback.

---

### 2️⃣ Jak dlouho čekat, než se notifikace zobrazí?

**⏱️ Maximálně 60 sekund**

| Událost | Čas |
|---------|-----|
| Klikneš na tlačítko | 0s |
| Backend vytvoří notifikaci | ~1s |
| **Background task načte notifikace** | **0-60s** |
| Badge se zobrazí na zvonečku | ihned po načtení |

**Průměrná čekací doba: ~30 sekund**

---

## 🔧 Co bylo upraveno?

### 1. Testovací panel - Lepší debug výstup

**PŘED:**
```
✅ SUCCESS: Notification created! ID: N/A
```

**PO:**
```
📦 Backend response: {"status":"ok","message":"Created"}
⚠️ WARNING: Notification created but ID not returned!
💡 Backend should return { status: 'ok', id: 123 }
🔔 Notification will appear in bell icon within 60 seconds
```

### 2. Přidány info bloky v panelu

- ⏱️ **Časování:** Vysvětluje 60-sekundový interval
- ⚠️ **Backend kontrola:** Checklist pro backend vývojáře
- 📦 **Response debug:** Zobrazuje celou odpověď z backendu

### 3. Dokumentace rozšířena

- Časování background tasku
- Debug kroky pro "ID: N/A" problém
- SQL dotazy pro kontrolu DB
- Očekávaný formát response

---

## 📊 Debug - Co se zobrazí v logu

### ✅ Správná response (s ID):
```
[22:45:10] Creating notification: order_created
[22:45:10] Sending POST request to https://eeo.zachranka.cz/api.eeo/notifications/create...
[22:45:11] 📦 Backend response: {"status":"ok","notification_id":123}
[22:45:11] ✅ SUCCESS: Notification created! ID: 123
[22:45:11] 🔔 Notification will appear in bell icon within 60 seconds
```

### ⚠️ Response bez ID:
```
[22:45:10] Creating notification: order_created
[22:45:10] Sending POST request to https://eeo.zachranka.cz/api.eeo/notifications/create...
[22:45:11] 📦 Backend response: {"status":"ok","message":"Created"}
[22:45:11] ⚠️ WARNING: Notification created but ID not returned!
[22:45:11] 💡 Backend should return { status: 'ok', notification_id: 123 }
[22:45:11] 🔔 Notification will appear in bell icon within 60 seconds
```

### ❌ Chyba (endpoint neexistuje):
```
[22:45:10] Creating notification: order_created
[22:45:10] Sending POST request to https://eeo.zachranka.cz/api.eeo/notifications/create...
[22:45:11] ❌ ERROR: Unexpected token '<', "<!doctype "... is not valid JSON
[22:45:11] ⚠️ Backend endpoint might not exist yet.
[22:45:11] 💡 Ask backend developer to implement: POST https://eeo.zachranka.cz/api.eeo/notifications/create
```

---

## 🚀 Jak testovat NYNÍ

1. **Otevři:** http://localhost:3000/test-notifications

2. **Klikni na:** "Nová objednávka" (modré tlačítko)

3. **Sleduj log:**
   - Řádek `📦 Backend response:` → zkontroluj jestli obsahuje `id`
   - Pokud **ANO** → ✅ Backend v pořádku
   - Pokud **NE** → ⚠️ Backend musí přidat `id` do response

4. **Počkej 60 sekund** (max.)

5. **Zkontroluj zvoněček** v menu (vedle profilu)
   - Měl by mít **červený badge** s číslem
   - Klikni na něj → zobrazí se dropdown

---

## 📝 Pro backend vývojáře

### ✅ Co backend MUSÍ vrátit:

```php
// PHP příklad
$notification_id = insertNotification($data); // Uloží do DB

return json_encode([
    'status' => 'ok',
    'notification_id' => $notification_id,  // ← TOTO JE DŮLEŽITÉ
    'message' => 'Notification created successfully'
]);
```

### 🔍 SQL kontrola:

```sql
-- Zkontroluj, jestli se notifikace uložila
SELECT 
    id, 
    user_id, 
    type, 
    title, 
    is_read, 
    created_at 
FROM 25_notifications 
WHERE user_id = [CURRENT_USER_ID]
ORDER BY created_at DESC 
LIMIT 5;

-- Počet nepřečtených
SELECT COUNT(*) as unread_count
FROM 25_notifications 
WHERE user_id = [CURRENT_USER_ID] 
AND is_read = false;
```

---

## ✅ Status změn

- [x] Frontend zobrazuje celou backend response
- [x] Kontrola `id` a `notification_id` v response
- [x] Varování pokud ID chybí
- [x] Info o 60-sekundovém intervalu
- [x] Backend checklist v testovacím panelu
- [x] Dokumentace aktualizována
- [ ] **Čeká na backend:** Přidání `id` do response

---

## 📚 Soubory změněny

1. ✅ `src/pages/NotificationTestPanel.js` - Lepší debug + info bloky
2. ✅ `docs/fixes/NOTIFICATION-API-FIX.md` - Sekce o časování a ID
3. ✅ `docs/fixes/TIMING-AND-ID-CHECK.md` - Tento souhrn

---

**🎯 Hlavní zjištění:**
- Notifikace se zobrazí **do 60 sekund** (průměrně 30s)
- Backend **musí** vracet `id` v response
- Frontend nyní zobrazuje debug info pro kontrolu

