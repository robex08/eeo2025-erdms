# 🔔 Organizational Hierarchy & Notifications - Status & Diskuzní Body

**Autor:** Robert Holovsky (RH)  
**Datum:** 17. prosince 2025  
**Účel:** Příprava na diskuzi - současný stav, problémy, požadované řešení

---

## 📊 Současný Stav Implementace

### ✅ CO FUNGUJE

#### 1. **Základní Notification System**
- ✅ Notifikace se vytvářejí přes `/notifications/trigger` API
- ✅ Event types (ORDER_SENT_FOR_APPROVAL, ORDER_APPROVED, ORDER_REJECTED atd.)
- ✅ Read table (`25_notifikace_precteni`) - tracking přečtených notifikací
- ✅ Unread count API (`/notifications/unread-count`)
- ✅ Background task (60s interval) pro zvoneček badge
- ✅ Template system s placeholders

#### 2. **Organizational Hierarchy UI**
- ✅ React Flow editor s drag & drop
- ✅ 4 typy nodes: Template, User, Role, Group
- ✅ Edge configuration panel
- ✅ Recipient roles: EXCEPTIONAL, APPROVAL, INFO
- ✅ Checkbox: **onlyOrderParticipants** (filtr na účastníky objednávky)
- ✅ Checkbox: **onlyOrderLocation** (filtr na lokalitu/úsek)
- ✅ Email/In-App toggle
- ✅ Ukládání do DB (`25_hierarchie_profily.structure_json`)

#### 3. **Backend Logic**
- ✅ `findNotificationRecipients()` - najde příjemce podle hierarchie
- ✅ Filtr **onlyOrderParticipants** s automatickým rozdělením:
  - APPROVAL role → pouze schvalovatelé + příkazce
  - INFO role → pouze autor + garant
  - EXCEPTIONAL role → všichni účastníci
- ✅ Priority mapping: EXCEPTIONAL→urgent, APPROVAL→high, INFO→normal
- ✅ User notification preferences (Global Settings + User Profile)
- ✅ `loadOrderPlaceholders()` - načítá data objednávky z DB

---

## ❌ ZNÁMÉ PROBLÉMY

### 🐛 Problém 1: Placeholdery se Nenahrazují Konzistentně

**Symptom:**
- První 2 notifikace: ✅ "Ke schválení: **O-1984/75030926/2025/IT**" (plný text)
- Další notifikace: ❌ "Ke schválení: **O-1961/75030926/2025/IT**" (torzo, chybí detaily)

**Možné Příčiny:**
1. `loadOrderPlaceholders()` se nevolá pro všechny edges?
2. Template má špatně definované placeholders v `app_nadpis`?
3. Race condition při načítání z DB?

**Debug Kroky:**
```bash
tail -f /var/log/php/error.log | grep -E "loadOrderPlaceholders|Merged placeholders"
```

**Očekávaný Output:**
```
📊 [NotificationRouter] Merged placeholders: {
  "order_number": "O-1984/75030926/2025/IT",
  "order_subject": "Test objednávka",
  "creator_name": "Robert Holovsky",
  ...
}
```

**Požadované Řešení:**
- ✅ Zkontrolovat, že `loadOrderPlaceholders()` se volá **před** každou notifikací
- ✅ Ověřit strukturu DB dat (objednávka má všechny sloupce?)
- ✅ Přidat fallback hodnoty pro chybějící placeholders

---

### 🐛 Problém 2: Zvoneček Badge Nerefreshuje Automaticky

**Symptom:**
- Notifikace se vytvoří v DB (✅ read záznam existuje, precteno=0)
- Background task běží každých 60s (✅ console logy viditelné)
- API `/notifications/unread-count` vrací správný count (✅ např. "1")
- Ale zvoneček badge **se neaktualizuje** bez refresh stránky ❌

**Možné Příčiny:**
1. BackgroundTasksContext.unreadNotificationsCount se nenastavuje?
2. React state update se nepropaguje do Layout.js?
3. Background task callback `onUnreadCountChange()` není správně napojen?

**Debug Kroky:**
```javascript
// V browser console:
// 1. Zkontroluj že background task běží
🔔 [BTask checkNotifications] START
   → Volám getUnreadCount()...
   ✅ Unread count: 1
   → Volám onUnreadCountChange(1)

// 2. Zkontroluj BackgroundTasksContext state
// (přidat debug do BackgroundTasksContext.js)
console.log('🔄 handleUnreadCountChange:', count);
console.log('   Current state:', unreadNotificationsCount);
```

**Požadované Řešení:**
- ✅ Přidat debug logging do `handleUnreadCountChange()`
- ✅ Zkontrolovat React DevTools - BackgroundTasksContext má správnou hodnotu?
- ✅ Ověřit že Layout.js dostává prop přes useBgTasksContext()

---

### 🐛 Problém 3: Skupiny (např. Účetní) Nedostanou Notifikace

**Symptom:**
- Edge: Template → **Role: Účetní**
- Checkbox: ✅ **onlyOrderParticipants: ANO**
- Výsledek: ❌ Účetní nedostanou notifikace (filtr je odstraní, protože nejsou účastníci)

**Root Cause:**
```php
if ($onlyParticipants) {
    // Filtruje jen autor, garant, schvalovatelé, příkazce
    // → Všichni mimo tuto skupinu jsou vyřazeni!
}
```

**Současná Logika:**
- `onlyOrderParticipants=ANO` → filtr **VŽDY** redukuje na účastníky objednávky
- Není možné poslat notifikaci **celé skupině** (např. všem účetním)

**Diskuzní Body:**

#### **Varianta A: Checkbox Ovládá Filtrování** (současný stav)
```
Edge #1: Template → Role Schvalovatelé
  ✅ onlyOrderParticipants: ANO
  → Pošle JEN schvalovatelům TÉTO objednávky

Edge #2: Template → Role Účetní  
  ❌ onlyOrderParticipants: VYPNUTO
  → Pošle VŠEM účetním v systému (bez filtru)
```

**Výhody:**
- ✅ Flexibilní - můžeš poslat i skupinám mimo účastníky
- ✅ Explicitní kontrola přes checkbox

**Nevýhody:**
- ❌ User musí vědět kdy zapnout/vypnout checkbox
- ❌ Riziko chyby - zapomene vypnout a pošle všem

#### **Varianta B: Automatická Detekce Podle Target Node**
```
Edge #1: Template → User/Role (konkrétní schvalovatel)
  → Backend AUTOMATICKY filtruje na účastníky
  
Edge #2: Template → Group (obecná skupina)
  → Backend NEFILTRUJE, pošle celé skupině
```

**Výhody:**
- ✅ Automatické - není potřeba checkbox
- ✅ Intuitivnější - "pošli schvalovatelům" vs "pošli účetním"

**Nevýhody:**
- ❌ Méně flexibilní
- ❌ Co když chci poslat celé skupině schvalovatelů (i když nejsou na TÉTO objednávce)?

#### **Varianta C: Dva Typy Checkboxů**
```
Edge #1: Template → Role Schvalovatelé
  ✅ onlyOrderParticipants: ANO
  ❌ sendToAllRoleMembers: NE
  
Edge #2: Template → Role Účetní
  ❌ onlyOrderParticipants: NE  
  ✅ sendToAllRoleMembers: ANO
```

**Výhody:**
- ✅ Explicitní kontrola
- ✅ Flexibilní

**Nevýhody:**
- ❌ Složitější UI
- ❌ Více checkboxů → větší riziko chyby

---

### 🐛 Problém 4: HTML Varianty Šablon

**Symptom:**
- Template má 3 HTML varianty:
  1. **Schvalovatel (oranžová - normál)** → normalVariant
  2. **Schvalovatel (červená - urgentní)** → urgentVariant
  3. **Autor objednávky (zelená - info)** → infoVariant

- Backend kód:
```php
if ($recipientRole === 'EXCEPTIONAL') {
    $variant = $node['data']['urgentVariant'] ?? 'urgentVariant';
} elseif ($recipientRole === 'INFO') {
    $variant = $node['data']['infoVariant'] ?? 'infoVariant';
} else {
    $variant = $node['data']['normalVariant'] ?? 'normalVariant';
}
```

**Diskuzní Bod:**
- ✅ Opraveno - čtou se z template node config
- ⚠️ Ale: Pokud template nemá definované varianty v DB, použije se fallback
- ❓ **Otázka:** Jak se varianty ukládají do `structure_json`? Potřebuje frontend editor pro nastavení variant?

---

## 🎯 POŽADOVANÉ ŘEŠENÍ (Diskuze)

### 1. **Placeholdery**
- [ ] Proč se nenahrazují konzistentně?
- [ ] Debug session - spustit testovací objednávku a sledovat error_log
- [ ] Možná potřeba přidat retry logic nebo fallback hodnoty?

### 2. **Zvoneček Badge**
- [ ] Debug React state flow: BackgroundTasksContext → Layout.js
- [ ] Ověřit že `onUnreadCountChange()` callback funguje
- [ ] Možná bug v React useCallback dependencies?

### 3. **Filtrování Skupin**
- [ ] **ROZHODNOUT:** Varianta A, B nebo C? (viz Problém 3)
- [ ] Implementovat zvolené řešení
- [ ] Otestovat edge cases:
  - Pošli všem účetním
  - Pošli jen schvalovatelům TÉTO objednávky
  - Pošli jen autorovi

### 4. **HTML Varianty**
- [ ] Ověřit že se čtou správně z DB
- [ ] Frontend editor pro nastavení variant? (nebo manuálně v JSON?)
- [ ] Test s reálnými templates

---

## 📋 Action Items pro Další Vývoj

### **Vysoká Priorita**

1. **Debug Placeholdery** (1-2h)
   - Spustit testovací objednávku
   - Sledovat PHP error_log
   - Najít kde se placeholdery ztrácejí
   - Fix + test

2. **Debug Zvoneček** (1h)
   - Přidat console.log do BackgroundTasksContext
   - Sledovat React DevTools
   - Najít kde se state nepropaguje
   - Fix + test

3. **Rozhodnout o Filtrování Skupin** (diskuze 30min)
   - Zvolit Variantu A/B/C
   - Implementovat (1-2h)
   - Test edge cases

### **Střední Priorita**

4. **HTML Varianty Šablon** (2-3h)
   - Ověřit čtení z DB
   - Možná přidat UI editor pro varianty?
   - Test s reálnými templates

5. **Dokumentace pro Uživatele** (1h)
   - Jak vytvořit hierarchii
   - Jak nastavit edges
   - Příklady use-cases

### **Nízká Priorita**

6. **Performance Optimalizace**
   - Cache hierarchie structure (aby se nečetla při každém triggeru)
   - Batch notification creation (pokud je více příjemců)

7. **Error Handling**
   - Co když template neexistuje?
   - Co když objednávka nemá schvalovatele?
   - Fallback hodnoty

---

## 🧪 Testovací Scénáře

### **Test Case 1: Základní Flow**
1. Vytvoř objednávku (autor=user_100, garant=user_100, schvalovatel=user_1)
2. Odešli ke schválení
3. **Očekáváno:**
   - Schvalovatel (user_1) dostane APPROVAL notifikaci
   - Autor (user_100) dostane INFO notifikaci
   - Garant (user_100) dostane INFO notifikaci (možná duplicitní, protože autor=garant)
4. **Ověř:**
   - Placeholdery nahrazeny (order_number, creator_name atd.)
   - Zvoneček badge ukazuje count
   - Správná HTML varianta použita

### **Test Case 2: Skupiny**
1. Vytvoř edge: Template → Role Účetní
2. Nastav `onlyOrderParticipants=false`
3. Odešli objednávku ke schválení
4. **Očekáváno:**
   - VŠICHNI účetní v systému dostanou notifikaci
5. **Ověř:**
   - SQL query: `SELECT COUNT(*) FROM 25_notifikace WHERE kategorie='orders' AND dt_created > NOW() - INTERVAL 1 MINUTE`

### **Test Case 3: Lokality**
1. Vytvoř edge: Template → Role Schvalovatelé
2. Nastav `onlyOrderParticipants=true` + `onlyOrderLocation=true`
3. Vytvoř objednávku pro lokalitu X
4. **Očekáváno:**
   - Jen schvalovatelé s oprávněními pro lokalitu X dostanou notifikaci

---

## 📞 Kontakty & Další Kroky

**Připraveno pro diskuzi:**
- ✅ Současný stav dokumentován
- ✅ Problémy identifikovány
- ✅ Návrhy řešení připraveny
- ✅ Testovací scénáře definovány

**Na diskuzi probereme:**
1. Prioritizace problémů
2. Výběr varianty filtrování skupin
3. Timeline implementace
4. Rozdělení úkolů

**Poznámky:**
- Veškerý kód commitnutý: `feature/orderform25-sprint1-cleanup`
- Pushed na GitHub: `robex08/eeo2025-erdms`
- SQL testovací skripty: `TEST_AUTHOR_GUARANTOR_NOTIFICATIONS.sql`
- Debug guide: `NOTIFICATION_DEBUGGING_ZVONICEK.md`

---

**RH / 17.12.2025**
