# 🚀 Notifikační systém - PŘIPRAVEN K POUŽITÍ!

**Datum:** 29. října 2025  
**Status:** ✅ BACKEND HOTOV + ✅ FRONTEND INTEGRACE HOTOVÁ  
**Commity:** 
- Backend: `3a28a99` - FEATURE: Rozsireni notifikacniho systemu
- Frontend: `a24abd7` - Frontend: Notifikační systém - Kompletní integrace

---

## 🎯 Co je HOTOVO

### ✅ Backend (BE developer)
- **30 notification templates** v DB (`25_notification_templates`)
- **Automatické placeholdery** - stačí poslat `order_id`, backend naplní 50+ placeholderů
- **4 nové API endpointy:**
  - `/notifications/create` - Vytvoření notifikace
  - `/notifications/preview` - Náhled před odesláním
  - `/notifications/templates` - Seznam templates (admin)
  - `/notifications/send-bulk` - Hromadné odeslání
- **Email notifikace** připraveny (PHPMailer)

### ✅ Frontend (FE developer)
- **notificationService.js** - Service pro práci s API
- **notificationTypes.js** - Konstanty a helpery
- **NotificationTester.jsx** - Testovací komponenta
- **FRONTEND-NOTIFICATION-INTEGRATION.md** - Kompletní dokumentace

---

## 📋 Rychlý start (5 minut)

### 1. Testování v DEV prostředí

#### A) Přidej NotificationTester do App.js (dočasně)

```javascript
// src/App.js
import NotificationTester from './components/NotificationTester';

function App() {
  // ... existující kód
  
  return (
    <div className="App">
      {/* ... existující komponenty ... */}
      
      {/* 🧪 TESTOVACÍ KOMPONENTA - odstranit v produkci */}
      {user && (
        <NotificationTester
          token={token}
          username={username}
          userId={user.id}
        />
      )}
    </div>
  );
}
```

#### B) Spusť aplikaci a otestuj

1. **Přihlaš se** do aplikace
2. **V pravém horním rohu** uvidíš testovací panel
3. **Zadej** existující Order ID (např. 123)
4. **Vyber** typ notifikace (např. "Objednávka schválena")
5. **Klikni "Náhled"** → Uvidíš, jak bude notifikace vypadat
6. **Zadej** Recipient User ID (komu poslat)
7. **Klikni "Odeslat"** → Notifikace se vytvoří v DB

---

## 🔧 Integrace do OrderForm25.js

### Krok 1: Import

```javascript
// Na začátek OrderForm25.js přidej:
import notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes';
```

### Krok 2: Schválení objednávky

```javascript
// V funkci handleApproveOrder (nebo podobné)

const handleApproveOrder = async () => {
  try {
    // 1. Schválit objednávku v DB
    await api.post('/orders/approve', {
      token: userToken,
      username: username,
      order_id: savedOrderId
    });
    
    // 2. Odeslat notifikaci tvůrci ⭐ NOVÉ
    await notificationService.notifyOrderApproved({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      creator_id: formData.objednatel_id
    });
    
    showToast('Objednávka schválena a notifikace odeslána!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba při schvalování:', error);
    showToast('Chyba při schvalování objednávky', { type: 'error' });
  }
};
```

### Krok 3: Zamítnutí objednávky

```javascript
const handleRejectOrder = async (rejectionReason) => {
  try {
    // 1. Zamítnout objednávku
    await api.post('/orders/reject', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      rejection_reason: rejectionReason
    });
    
    // 2. Odeslat notifikaci s důvodem ⭐ NOVÉ
    await notificationService.notifyOrderRejected({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      creator_id: formData.objednatel_id,
      rejection_reason: rejectionReason
    });
    
    showToast('Objednávka zamítnuta a notifikace odeslána!', { type: 'info' });
    
  } catch (error) {
    console.error('Chyba při zamítání:', error);
    showToast('Chyba při zamítání objednávky', { type: 'error' });
  }
};
```

### Krok 4: Odeslání ke schválení

```javascript
const handleSendToApproval = async () => {
  try {
    // 1. Změnit stav
    await api.post('/orders/update', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      stav_schvaleni: 'ceka_na_schvaleni'
    });
    
    // 2. Notifikovat garanta ⭐ NOVÉ
    await notificationService.notifyPendingApproval({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      garant_id: formData.garant_uzivatel_id
    });
    
    showToast('Objednávka odeslána ke schválení!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba:', error);
    showToast('Chyba při odesílání', { type: 'error' });
  }
};
```

### Krok 5: Věcná správnost (NOVÁ FÁZE)

```javascript
const handleConfirmVecnaSpravnost = async () => {
  try {
    // 1. Potvrdit věcnou správnost
    await api.post('/orders/update', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      potvrzeni_vecne_spravnosti: 1,
      potvrdil_vecnou_spravnost_id: user_id,
      dt_potvrzeni_vecne_spravnosti: new Date().toISOString()
    });
    
    // 2. Notifikovat garanta a příkazce ⭐ NOVÉ
    const recipients = [
      formData.garant_uzivatel_id,
      formData.prikazce_id
    ].filter(Boolean);
    
    await notificationService.notifyVecnaSpravnostConfirmed({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      recipients
    });
    
    showToast('Věcná správnost potvrzena!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba:', error);
    showToast('Chyba při potvrzování', { type: 'error' });
  }
};
```

---

## 📊 Dostupné helper funkce

Service `notificationService` má **11 ready-to-use funkcí**:

### Základní workflow (FÁZE 1-4)
```javascript
// Schválení
notificationService.notifyOrderApproved({ token, username, order_id, action_user_id, creator_id })

// Zamítnutí
notificationService.notifyOrderRejected({ token, username, order_id, action_user_id, creator_id, rejection_reason })

// Ke schválení
notificationService.notifyPendingApproval({ token, username, order_id, action_user_id, garant_id })

// Vrácena k přepracování
notificationService.notifyWaitingForChanges({ token, username, order_id, action_user_id, creator_id, waiting_reason })

// Odeslána dodavateli
notificationService.notifySentToSupplier({ token, username, order_id, action_user_id, recipients })

// Potvrzena dodavatelem
notificationService.notifyConfirmedBySupplier({ token, username, order_id, action_user_id, recipients })
```

### NOVÉ FÁZE (5-7)
```javascript
// FÁZE 5: Registr smluv
notificationService.notifyRegistryPublished({ token, username, order_id, action_user_id, recipients })

// FÁZE 6: Fakturace
notificationService.notifyInvoiceAdded({ token, username, order_id, action_user_id, garant_id })
notificationService.notifyInvoiceApproved({ token, username, order_id, action_user_id, creator_id })
notificationService.notifyInvoicePaid({ token, username, order_id, action_user_id, recipients })

// FÁZE 7: Věcná správnost
notificationService.notifyVecnaSpravnostConfirmed({ token, username, order_id, action_user_id, recipients })
notificationService.notifyVecnaSpravnostRejected({ token, username, order_id, action_user_id, recipients, rejection_reason })
```

---

## 🔍 Kontrola v databázi

### SQL dotaz: Notifikace pro objednávku

```sql
SELECT 
  n.id,
  n.user_id,
  u.username,
  u.email,
  n.order_id,
  o.cislo_objednavky,
  n.message,
  n.is_read,
  n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
LEFT JOIN 25_objednavky o ON n.order_id = o.id
WHERE n.order_id = 123  -- Tvoje Order ID
ORDER BY n.created_at DESC;
```

### SQL dotaz: Statistika notifikací

```sql
SELECT 
  type,
  COUNT(*) as pocet,
  COUNT(CASE WHEN is_read = 1 THEN 1 END) as precteno,
  COUNT(CASE WHEN is_read = 0 THEN 1 END) as neprecteno
FROM 25_notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY type
ORDER BY pocet DESC;
```

---

## ⚡ Co backend automaticky dělá

Když pošleš `order_id`, backend **automaticky načte a naplní**:

### 📦 Základní info objednávky
- `{order_number}` - Číslo objednávky (např. "2025-123")
- `{order_id}` - ID v databázi
- `{order_subject}` - Předmět objednávky
- `{max_price_with_dph}` - Částka s DPH (formátováno: "25 000")
- `{workflow_state}` - Stav workflow (slovně)

### 👤 Osoby
- `{creator_name}` - Jméno tvůrce
- `{garant_name}` - Jméno garanta
- `{prikazce_name}` - Jméno příkazce
- `{supplier_name}` - Název dodavatele
- `{supplier_contact}` - Kontakt na dodavatele

### 🎬 Akce
- `{action_performed_by}` - Kdo provedl akci
- `{action_performed_by_label}` - Label ("Schválil", "Zamítl")
- `{action_icon}` - Ikona (✅, ❌, 📤)
- `{action_date}` - Datum a čas (formát: "29.10.2025 19:45")

### 📋 Položky
- `{items_count}` - Počet položek
- `{items_total_s_dph}` - Celková cena položek s DPH
- `{items_summary}` - Stručný přehled položek

### 🆕 NOVÉ FÁZE (registr, fakturace, věcná správnost)
- `{registr_iddt}` - ID v registru smluv
- `{dt_zverejneni}` - Datum zveřejnění
- `{invoice_number}` - Číslo faktury
- `{invoice_amount}` - Částka faktury
- `{asset_location}` - Umístění majetku
- `{kontroloval_name}` - Jméno kontrolora

**Celkem 50+ placeholderů!**

---

## ✅ Checklist implementace

### 1. Testování (DEV) - 10 minut
- [ ] Přidat NotificationTester do App.js
- [ ] Spustit aplikaci
- [ ] Otestovat "Náhled" notifikace
- [ ] Otestovat "Odeslání" notifikace
- [ ] Zkontrolovat notifikaci v DB

### 2. Integrace do OrderForm25.js - 30 minut
- [ ] Import notificationService a NOTIFICATION_TYPES
- [ ] Přidat notifikaci do schválení objednávky
- [ ] Přidat notifikaci do zamítnutí objednávky
- [ ] Přidat notifikaci do odeslání ke schválení
- [ ] Přidat notifikaci do věcné správnosti (NOVÁ FÁZE)

### 3. Testování integrace - 20 minut
- [ ] Test schválení objednávky
- [ ] Test zamítnutí objednávky
- [ ] Test odeslání ke schválení
- [ ] Test věcné správnosti
- [ ] Kontrola notifikací v DB
- [ ] Kontrola, že příjemci dostali notifikace

### 4. Rozšíření (volitelné) - 1 hodina
- [ ] Registr smluv - notifikace při zveřejnění
- [ ] Fakturace - notifikace při přidání/schválení/uhrazení
- [ ] Další workflow stavy podle potřeby

---

## 🐛 Troubleshooting

### Notifikace se nevytvořila
**Kontrola:**
1. Je backend spuštěný? (`http://localhost:5000`)
2. Je token platný?
3. Existuje order_id v DB?
4. Existuje recipient user_id v DB?

**SQL kontrola:**
```sql
-- Existuje objednávka?
SELECT id, cislo_objednavky FROM 25_objednavky WHERE id = 123;

-- Existuje uživatel?
SELECT id, username, email FROM 25_users WHERE id = 10;
```

### Notifikace má prázdné placeholdery
**Řešení:**
- Backend nemůže načíst data z objednávky
- Zkontroluj, že objednávka má všechna potřebná pole vyplněná
- Použij `/notifications/preview` pro debug

### Email se neodeslal
**Kontrola:**
1. Je email nakonfigurován na backendu? (PHPMailer)
2. Má uživatel vyplněný email?
3. Je `send_email_default = 1` v templatu?

**SQL kontrola:**
```sql
-- Má uživatel email?
SELECT id, username, email FROM 25_users WHERE id = 10;

-- Má template email zapnutý?
SELECT type, send_email_default FROM 25_notification_templates 
WHERE type = 'order_status_schvalena';
```

---

## 📚 Dokumentace

### Kompletní dokumenty
1. **FRONTEND-NOTIFICATION-INTEGRATION.md** - Hlavní integr ační guide
2. **BACKEND-CURRENT-NOTIFICATIONS-STATUS.md** - Analýza BE systému
3. **NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql** - SQL struktura (pro BE admina)

### Code soubory
1. **src/services/notificationService.js** - Service
2. **src/constants/notificationTypes.js** - Konstanty
3. **src/components/NotificationTester.jsx** - Tester

---

## 🎯 Priority

### 🔴 VYSOKÁ (implementovat TEĎ)
1. ✅ Schválení objednávky
2. ✅ Zamítnutí objednávky
3. ✅ Odeslání ke schválení
4. ✅ Věcná správnost potvrzena

### 🟠 STŘEDNÍ (implementovat do týdne)
1. 🔄 Registr smluv - zveřejnění
2. 🔄 Fakturace - přidání/schválení/uhrazení
3. 🔄 Odeslání a potvrzení dodavatelem

### 🟢 NÍZKÁ (nice to have)
1. 💡 Vrácení k přepracování
2. 💡 Věcná správnost zamítnuta (reklamace)
3. 💡 Custom notifikace podle potřeby

---

## 🚀 Next Steps

### Dnes (29.10.2025)
1. ✅ Otestovat NotificationTester
2. ✅ Zkontrolovat, že backend běží
3. ✅ Otestovat náhled a odeslání notifikace

### Zítra (30.10.2025)
1. 🔄 Integrovat do OrderForm25.js (schválení, zamítnutí)
2. 🔄 Otestovat s reálnými daty
3. 🔄 Zkontrolovat notifikace v DB

### Tento týden
1. 🔄 Dokončit všechny základní workflow notifikace
2. 🔄 Přidat NOVÉ FÁZE (registr, fakturace, věcná správnost)
3. 🔄 Odstranit NotificationTester před produkcí

---

**Máš dotaz? Něco nefunguje?**  
Podívej se do dokumentace nebo použij NotificationTester pro debug! 🐛

---

**Vypracoval:** GitHub Copilot  
**Datum:** 29. října 2025  
**Status:** ✅ **READY TO USE!** 🚀
