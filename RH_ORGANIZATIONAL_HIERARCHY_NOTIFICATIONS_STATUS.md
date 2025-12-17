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

### ✅ ~~Problém 1: Jméno Uživatele se Nezobrazovalo~~ **VYŘEŠENO**

**Symptom:**
- Notifikace zobrazovaly jen **"user"** místo jména osoby, která akci provedla
- Badge zobrazoval: `👤 user` ❌

**Root Cause:**
- Backend neukládal jméno trigger usera do `data_json`
- Frontend očekával `action_performed_by` ale backend to neposílal

**Řešení:**
```php
// Backend: notificationHandlers.php
if ($triggerUserId) {
    $stmt = $db->prepare("SELECT CONCAT(name, ' ', surname) as full_name FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $triggerUserId]);
    $triggerUser = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($triggerUser) {
        $placeholderData['action_performed_by'] = $triggerUser['full_name'];
    }
}
```

```javascript
// Frontend: NotificationDropdown.js
{notificationData.action_performed_by ? (
  <span>👤 {notificationData.action_performed_by}</span>
) : ...}
```

**Status:** ✅ Opraveno commit `6362846`

---

### 🐛 Problém 2: Placeholdery se Nenahrazují Konzistentně

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
  "action_performed_by": "Robert Holovsky",  ← NOVĚ!
  ...
}
```

**Požadované Řešení:**
- ⏳ Zkontrolovat, že `loadOrderPlaceholders()` se volá **před** každou notifikací
- ⏳ Ověřit strukturu DB dat (objednávka má všechny sloupce?)
- ⏳ Přidat fallback hodnoty pro chybějící placeholders

---

### 🐛 Problém 3: Zvoneček Badge Nerefreshuje Automaticky

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

### 🐛 Problém 4: Skupiny (např. Účetní) Nedostanou Notifikace

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

### 🐛 Problém 5: HTML Varianty Šablon

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

---

# 🎯 DISKUZE: Priority Notifikací & Oprávnění/Scope

**Datum:** 17. prosince 2025 (pokračování)  
**Téma:** Analýza současného stavu priorit a návrh na vylepšení + Scope/Permissions systém

---

## A) SYSTÉM PRIORIT NOTIFIKACÍ

### 📊 JAK TO MÁME TEĎ

#### 1. **recipientRole v Organizational Hierarchy**

Definovali jsme 3 základní úrovně:

| recipientRole | UI Label | Barva | DB Priorita | Template Varianta | Význam |
|---------------|----------|-------|-------------|-------------------|--------|
| `EXCEPTIONAL` | 🔴 Mimořádná událost | Červená | `EXCEPTIONAL` | `urgentVariant` | Příkazce/Registr MUSÍ schválit IHNED |
| `APPROVAL` | 🟠 Důležitá notifikace | Oranžová | `APPROVAL` | `normalVariant` | Karta je u příjemce, vyžaduje pozornost |
| `INFO` | 🟢 Informační oznámení | Modrá | `INFO` | `infoVariant` | Jen pro vědomí, FYI |

**Speciální role (interní mapping):**
- `AUTHOR_INFO` → mapuje se na `INFO` (modrá)
- `GUARANTOR_INFO` → mapuje se na `INFO` (modrá)

#### 2. **Backend Implementace**

```php
// notificationHandlers.php - řádek 1447
function mapRecipientRoleToPriority($recipientRole) {
    switch ($recipientRole) {
        case 'EXCEPTIONAL':
            return 'EXCEPTIONAL';  // Urgentní (červená)
        case 'APPROVAL':
            return 'APPROVAL';     // Ke schválení (oranžová)
        case 'INFO':
        case 'AUTHOR_INFO':        // ← Pro autora objednávky
        case 'GUARANTOR_INFO':     // ← Pro garanta objednávky
            return 'INFO';         // Informativní (modrá)
        default:
            return 'INFO';         // Fallback
    }
}
```

#### 3. **DB Struktura (25_notifikace.priorita)**

```sql
-- ALTER_NOTIFICATION_PRIORITA_ENUM.sql
ALTER TABLE `25_notifikace` 
MODIFY COLUMN `priorita` ENUM(
    'low',          -- ⚪ Nízká (legacy)
    'normal',       -- 🟢 Běžná (legacy)
    'high',         -- 🟠 Vysoká (legacy)
    'urgent',       -- 🔴 Kritické (legacy)
    'EXCEPTIONAL',  -- 🔴 Výjimečná priorita (org-hierarchy)
    'APPROVAL',     -- 🟠 Schvalovací proces (org-hierarchy)
    'INFO'          -- 🟢 Informativní (org-hierarchy)
) NOT NULL DEFAULT 'normal';
```

**Problém:** Máme **DUPLICITNÍ** priority systémy:
- Legacy: `low`, `normal`, `high`, `urgent`
- Org-Hierarchy: `EXCEPTIONAL`, `APPROVAL`, `INFO`

#### 4. **Frontend Vizualizace**

**NotificationDropdown.js (řádek 278):**
```javascript
/* Priority coloring */
${props => props.$priority === 'high' && `
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-left-color: #ef4444;
`}

${props => props.$priority === 'urgent' && `
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-left-color: #dc2626;
`}
```

**Problém:** Frontend reaguje na legacy hodnoty (`high`, `urgent`), ale backend posílá org-hierarchy hodnoty (`EXCEPTIONAL`, `APPROVAL`, `INFO`)!

#### 5. **Event Types - Příklady Mapování**

```php
// CREATE_NOTIFICATION_SYSTEM_TABLES.sql
$eventTypes = [
    [
        'code' => 'ORDER_SENT_FOR_APPROVAL',
        'nazev' => 'Objednávka odeslána ke schválení',
        'uroven_nahlhavosti' => 'NORMAL',
        'role_prijemcu' => ['APPROVAL', 'INFO']
    ],
    [
        'code' => 'ORDER_REJECTED',
        'nazev' => 'Objednávka zamítnuta',
        'uroven_nahlhavosti' => 'EXCEPTIONAL',
        'role_prijemcu' => ['EXCEPTIONAL', 'INFO']
    ]
];
```

---

### 🐛 CO NEFUNGUJE DOBŘE

#### **Problém 1: Duplicitní Priority Systémy**

**Současný stav:**
- Máme 2 rozdílné sady hodnot (legacy + org-hierarchy)
- Frontend očekává `high`/`urgent`, backend posílá `APPROVAL`/`EXCEPTIONAL`
- DB má ENUM s oběma sadami → zmatenost

**Důsledek:**
```javascript
// V NotificationDropdown.js:
if (notification.priorita === 'APPROVAL') {
  // ❌ Tento kód NEFUNGUJE, protože frontend hledá 'high'
  return <OrangeBackground />
}
```

#### **Problém 2: recipientRole ≠ Priorita (ale skoro)**

**Současný stav:**
- `recipientRole` určuje **KOMU** notifikace patří (schvalovatel vs info)
- `priorita` určuje **JAK DŮLEŽITÉ** to je (urgent vs normal)
- Ale... v praxi je to **totéž**:
  - `recipientRole=EXCEPTIONAL` → `priorita=EXCEPTIONAL`
  - `recipientRole=APPROVAL` → `priorita=APPROVAL`
  - `recipientRole=INFO` → `priorita=INFO`

**Otázka:** Potřebujeme opravdu **dva** koncepty, nebo stačí jeden?

#### **Problém 3: Chybí Granularita**

**Současný stav:**
- `EXCEPTIONAL` = červená (nejkritičtější)
- `APPROVAL` = oranžová (důležitá)
- `INFO` = modrá (informativní)

**Co chybí:**
- Co když chci **INFO notifikaci**, ale **URGENTNÍ**? (např. "Faktura byla zaplacena IHNED")
- Co když chci **APPROVAL notifikaci**, ale **LOW priority**? (např. "Schval tuto změnu až budeš mít čas")

**Příklad z praxe:**
```
Událost: "Objednávka odeslána dodavateli"
- Pro nákupčího: APPROVAL (musí to ověřit) → oranžová
- Pro autora: INFO (jen pro vědomí) → modrá

Ale co když je to URGENTNÍ objednávka?
- Pro nákupčího: APPROVAL + URGENT → měla by být ČERVENÁ, ne oranžová!
- Pro autora: INFO + URGENT → měla by být oranžová, ne modrá!
```

#### **Problém 4: Template Varianty jsou "Vázané" na recipientRole**

**Současný stav:**
- `recipientRole=EXCEPTIONAL` → vždy `urgentVariant`
- `recipientRole=APPROVAL` → vždy `normalVariant`
- `recipientRole=INFO` → vždy `infoVariant`

**Problém:**
- Nemůžeš poslat `APPROVAL` notifikaci s `urgentVariant` šablonou
- Nemůžeš poslat `INFO` notifikaci s `urgentVariant` šablonou

---

### 💡 NÁVRHY NA VYLEPŠENÍ

#### **Varianta A: UNIFIKACE - Jeden Priority Systém**

**Návrh:**
1. **Zahodit** legacy hodnoty (`low`, `normal`, `high`, `urgent`)
2. **Používat pouze** org-hierarchy hodnoty (`EXCEPTIONAL`, `APPROVAL`, `INFO`)
3. **Frontend upravit**, aby reagoval na nové hodnoty

**DB ENUM:**
```sql
ALTER TABLE `25_notifikace` 
MODIFY COLUMN `priorita` ENUM(
    'INFO',         -- 🟢 Informativní (modrá)
    'APPROVAL',     -- 🟠 Ke schválení (oranžová)
    'EXCEPTIONAL'   -- 🔴 Kritické (červená)
) NOT NULL DEFAULT 'INFO';
```

**Frontend:**
```javascript
const getPriorityStyle = (priorita) => {
  switch(priorita) {
    case 'EXCEPTIONAL':
      return { background: '#fecaca', borderColor: '#dc2626' }; // Červená
    case 'APPROVAL':
      return { background: '#fed7aa', borderColor: '#f59e0b' }; // Oranžová
    case 'INFO':
    default:
      return { background: '#dbeafe', borderColor: '#3b82f6' }; // Modrá
  }
};
```

**Výhody:**
- ✅ Jednodušší - jeden systém
- ✅ Konzistentní s org-hierarchy
- ✅ Méně záměn

**Nevýhody:**
- ❌ Breaking change - musíme přemigrovat staré notifikace
- ❌ Stále nemáme granularitu (INFO+URGENT nejde)

---

#### **Varianta B: ODDĚLENÍ recipientRole a Priority**

**Návrh:**
1. **recipientRole** zůstává (určuje **komu** a **co** se zobrazí)
2. **priorita** se stává **nezávislá** (určuje **jak důležité** to je)
3. **Přidáme mapping** v org-hierarchy editoru

**Org-Hierarchy Edge Config:**
```javascript
{
  recipientRole: 'APPROVAL',        // KDO → Schvalovatel
  priority: 'urgent',               // JAK DŮLEŽITÉ → Urgentní
  templateVariant: 'urgentVariant'  // JAKÁ ŠABLONA → Červená
}
```

**Backend Logic:**
```php
// notificationRouter()
$recipientRole = $edge['notifications']['recipientRole'];  // APPROVAL
$priority = $edge['notifications']['priority'];            // urgent (explicitně)
$variant = $edge['notifications']['templateVariant'];      // urgentVariant (explicitně)

// NEBO automaticky podle kombinace:
if ($priority === 'urgent') {
    $variant = 'urgentVariant';
} elseif ($recipientRole === 'INFO') {
    $variant = 'infoVariant';
} else {
    $variant = 'normalVariant';
}
```

**DB ENUM (sjednoceno):**
```sql
ALTER TABLE `25_notifikace` 
MODIFY COLUMN `priorita` ENUM(
    'low',       -- ⚪ Nízká
    'normal',    -- 🟢 Běžná
    'high',      -- 🟠 Vysoká
    'urgent'     -- 🔴 Kritické
) NOT NULL DEFAULT 'normal';

-- recipientRole zůstává samostatně (v data_json nebo nový sloupec)
ALTER TABLE `25_notifikace` 
ADD COLUMN `recipient_role` ENUM('EXCEPTIONAL', 'APPROVAL', 'INFO') NULL AFTER `priorita`;
```

**Výhody:**
- ✅ Granularita - můžeš mít INFO+URGENT
- ✅ Flexibilní - každá notifikace může mít jinou kombinaci
- ✅ Explicitní kontrola v UI

**Nevýhody:**
- ❌ Složitější UI (více checkboxů/selectů)
- ❌ Větší riziko chyby uživatele

---

#### **Varianta C: HYBRID - recipientRole Určuje Výchozí Prioritu**

**Návrh:**
1. **recipientRole** má výchozí prioritu (jako teď)
2. **Přidáme checkbox** "Override Priority" → pokud zaškrtneš, můžeš nastavit vlastní
3. **Template varianta** se volí automaticky podle finální priority

**Org-Hierarchy Edge Config:**
```javascript
{
  recipientRole: 'APPROVAL',           // → výchozí priorita = 'high'
  overridePriority: true,              // ← NOVÝ checkbox
  customPriority: 'urgent',            // ← NOVÝ select (jen pokud override=true)
  // templateVariant se určí automaticky podle finální priority
}
```

**Mapping:**
```javascript
const getDefaultPriority = (recipientRole) => {
  switch(recipientRole) {
    case 'EXCEPTIONAL': return 'urgent';
    case 'APPROVAL': return 'high';
    case 'INFO': return 'normal';
  }
};

const finalPriority = overridePriority 
  ? customPriority 
  : getDefaultPriority(recipientRole);
```

**Výhody:**
- ✅ Výchozí chování jednoduché (jako teď)
- ✅ Pokročilá kontrola pro power-users
- ✅ Granularita dostupná jen když potřebuješ

**Nevýhody:**
- ❌ Složitější UI (skrytý panel)
- ❌ Uživatelé možná neobjeví override možnost

---

### 🤔 MŮJ NÁZOR (GitHub Copilot)

**Doporučení: Varianta A (Unifikace) + Budoucí Extension**

**Fáze 1: Unifikace (teď)**
1. Zahodit legacy priority systém
2. Používat pouze: `INFO`, `APPROVAL`, `EXCEPTIONAL`
3. Frontend upravit na nové hodnoty
4. Migrace starých notifikací:
   ```sql
   UPDATE 25_notifikace SET priorita = 'INFO' WHERE priorita IN ('low', 'normal');
   UPDATE 25_notifikace SET priorita = 'APPROVAL' WHERE priorita = 'high';
   UPDATE 25_notifikace SET priorita = 'EXCEPTIONAL' WHERE priorita = 'urgent';
   ```

**Fáze 2: Granularita (později, pokud bude potřeba)**
- Přidat "Override Priority" checkbox (Varianta C)
- Nebo rozšířit ENUM na více úrovní: `INFO_LOW`, `INFO_NORMAL`, `INFO_URGENT`, `APPROVAL_NORMAL`, `APPROVAL_URGENT`, atd.

**Důvody:**
1. **KISS princip** - teď to není potřeba, většina notifikací má jasnou prioritu
2. **Méně chyb** - jednodušší UI = méně možností pro blbost
3. **Evolvable** - můžeme přidat granularitu později bez breaking changes

---

## B) SYSTÉM OPRÁVNĚNÍ (SCOPE/PERMISSIONS)

### 📊 JAK TO MÁME TEĎ

#### 1. **Organizational Hierarchy - relationshipScope**

**V React Flow editoru:**
```javascript
const [relationshipScope, setRelationshipScope] = useState('OWN'); 
// Možné hodnoty: OWN, TEAM, LOCATION, ALL
```

**Význam:**
- `OWN` = Vlastní objednávky (user je autor/garant)
- `TEAM` = Objednávky týmu (user je vedoucí)
- `LOCATION` = Objednávky lokality/úseku
- `ALL` = Všechny objednávky v systému

**DB Struktura:**
```sql
-- 25_hierarchie_vztahy
druh_vztahu ENUM('prime', 'zastupovani', 'delegovani', 'rozsirene')
scope VARCHAR(50) -- 'OWN', 'TEAM', 'LOCATION', 'ALL'
```

#### 2. **Checkbox Filtry v Org-Hierarchy**

**onlyOrderParticipants:**
```javascript
if (onlyOrderParticipants) {
    // Filtruj jen na účastníky objednávky:
    // - APPROVAL role → jen schvalovatelé + příkazce
    // - INFO role → jen autor + garant
    // - EXCEPTIONAL role → všichni účastníci
}
```

**onlyOrderLocation:**
```javascript
if (onlyOrderLocation) {
    // Filtruj jen na uživatele s oprávněními pro lokalitu objednávky
    // TODO: NENÍ PLNĚ IMPLEMENTOVÁNO!
}
```

#### 3. **Users - Lokality/Úseky**

**Současný stav:**
- `users` tabulka má sloupec `usek_id` (FK do `25_useky`)
- Každý user patří k jednomu úseku
- Každý úsek patří k jedné lokalitě (IT, Ústí, apod.)

**Problém:**
- User může mít oprávnění pro **více lokalit** (např. ředitel má IT + Ústí)
- Současná struktura to nepodporuje (1 user = 1 úsek)

#### 4. **Orders - Lokality/Úseky**

**Současný stav:**
- `25_objednavky` má sloupec `usek_id`
- Objednávka patří k jednomu úseku

**Použití:**
```sql
-- Najdi objednávky pro lokalitu IT
SELECT o.* FROM 25_objednavky o
JOIN 25_useky u ON o.usek_id = u.id
WHERE u.lokalita_id = 1; -- IT
```

---

### 🐛 CO NEFUNGUJE DOBŘE

#### **Problém 1: onlyOrderLocation není Plně Implementován**

**Současný stav:**
```php
// notificationRouter() kolem řádku 1800
if ($onlyOrderLocation) {
    // ⚠️ TODO: Implementovat filtr podle lokality
    // Zatím se přeskakuje nebo ignoruje
}
```

**Důsledek:**
- Checkbox v UI existuje, ale nedělá nic
- Notifikace se posílají všem bez ohledu na lokalitu

#### **Problém 2: User Může Mít Oprávnění pro Více Lokalit**

**Use Case:**
```
User: Ředitel (user_id=5)
Oprávnění: IT + Ústí + Praha

Objednávka #123: lokalita=IT
→ Ředitel MUSÍ dostat notifikaci ✅

Objednávka #456: lokalita=Brno
→ Ředitel NESMÍ dostat notifikaci ❌
```

**Současný problém:**
- `users.usek_id` = jen 1 úsek
- Není tabulka pro M:N vztah (user ↔ lokality)

#### **Problém 3: Schvalovatelé vs Lokality**

**Use Case:**
```
User: Příkazce (user_id=10)
Role: Schvalovatel pro lokalitu IT

Objednávka #789: lokalita=IT, autor=user_100
Edge config: 
  - recipientRole=APPROVAL
  - onlyOrderParticipants=true
  - onlyOrderLocation=true

Očekávané chování:
→ Notifikaci dostanou JEN schvalovatelé s oprávněním pro IT ✅
```

**Současný problém:**
- Není jasné, kde se ukládá "Uživatel X je schvalovatel pro lokalitu Y"
- `users.usek_id`? Nebo nějaká jiná tabulka?

#### **Problém 4: relationshipScope vs onlyOrderLocation**

**Zmatek:**
- `relationshipScope=LOCATION` → user má vztah k lokalitě
- `onlyOrderLocation=true` → filtruj notifikace podle lokality objednávky

**Otázka:**
- Jsou to **totéž**?
- Nebo je `relationshipScope` obecnější (týká se vztahů v org-hierarchy)?
- A `onlyOrderLocation` je specifický filtr pro notifikace?

---

### 💡 NÁVRHY NA VYLEPŠENÍ

#### **Varianta A: M:N Tabulka - User Lokality**

**Návrh:**
1. Vytvořit tabulku `25_users_lokality` (M:N vztah)
2. Ukládat oprávnění pro více lokalit

**DB Struktura:**
```sql
CREATE TABLE `25_users_lokality` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `lokalita_id` INT(11) NOT NULL,
  `role` ENUM('viewer', 'editor', 'approver', 'admin') DEFAULT 'viewer',
  `dt_created` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_location` (`user_id`, `lokalita_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`lokalita_id`) REFERENCES `25_lokality`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Backend Logic:**
```php
// findNotificationRecipients()
if ($onlyOrderLocation) {
    $orderLocationId = getOrderLocationId($db, $objectId);
    
    $targetUserIds = array_filter($targetUserIds, function($userId) use ($db, $orderLocationId) {
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt FROM 25_users_lokality 
            WHERE user_id = :user_id AND lokalita_id = :location_id
        ");
        $stmt->execute([':user_id' => $userId, ':location_id' => $orderLocationId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['cnt'] > 0;
    });
}
```

**Výhody:**
- ✅ Flexibilní - user může mít neomezený počet lokalit
- ✅ Granulární role (viewer vs approver)
- ✅ Snadno rozšiřitelné

**Nevýhody:**
- ❌ Nová tabulka = migrace dat
- ❌ Složitější queries
- ❌ UI pro správu oprávnění (kde zobrazit?)

---

#### **Varianta B: JSON Pole v users.opravneni_lokality**

**Návrh:**
1. Přidat sloupec `users.opravneni_lokality` (JSON)
2. Ukládat pole lokalit: `[1, 2, 5]` nebo `[{id: 1, role: 'approver'}, ...]`

**DB Struktura:**
```sql
ALTER TABLE `users` 
ADD COLUMN `opravneni_lokality` JSON NULL COMMENT 'Pole ID lokalit s oprávněními';

-- Příklad hodnoty:
-- [1, 2, 5] (jednoduché)
-- NEBO
-- [{"lokalita_id": 1, "role": "approver"}, {"lokalita_id": 2, "role": "viewer"}]
```

**Backend Logic:**
```php
if ($onlyOrderLocation) {
    $orderLocationId = getOrderLocationId($db, $objectId);
    
    $targetUserIds = array_filter($targetUserIds, function($userId) use ($db, $orderLocationId) {
        $stmt = $db->prepare("SELECT opravneni_lokality FROM users WHERE id = :user_id");
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $locations = json_decode($user['opravneni_lokality'], true);
        return in_array($orderLocationId, $locations);
    });
}
```

**Výhody:**
- ✅ Jednodušší - žádná nová tabulka
- ✅ Rychlé přidání oprávnění
- ✅ Méně JOINů v queries

**Nevýhody:**
- ❌ JSON queries jsou pomalejší
- ❌ Nemůžeš mít granulární role (viewer vs approver)
- ❌ Složitější indexování

---

#### **Varianta C: Rozšířit 25_hierarchie_vztahy**

**Návrh:**
1. Využít existující tabulku `25_hierarchie_vztahy`
2. Přidat filtry přímo do edge config

**DB Struktura:**
```sql
-- 25_hierarchie_vztahy už existuje:
scope VARCHAR(50) -- 'OWN', 'TEAM', 'LOCATION', 'ALL'
filter_lokality JSON -- ← NOVÝ sloupec: [1, 2, 5]
```

**Backend Logic:**
```php
// findNotificationRecipients()
foreach ($edges as $edge) {
    if ($edge['scope'] === 'LOCATION') {
        $allowedLocations = json_decode($edge['filter_lokality'], true);
        $orderLocationId = getOrderLocationId($db, $objectId);
        
        if (!in_array($orderLocationId, $allowedLocations)) {
            continue; // Skip tento edge
        }
    }
}
```

**Výhody:**
- ✅ Využívá existující strukturu
- ✅ Edge-specifické filtry (flexibilní)
- ✅ Žádná změna v `users` tabulce

**Nevýhody:**
- ❌ Nemění user oprávnění globálně
- ❌ Musíš nastavit v každém edge zvlášť

---

### 🤔 MŮJ NÁZOR (GitHub Copilot)

**Doporučení: Varianta A (M:N Tabulka) + Implementace onlyOrderLocation**

**Fáze 1: Implementovat onlyOrderLocation (teď)**
1. Dokončit backend logic v `notificationRouter()`
2. Použít **současnou strukturu** (`users.usek_id`)
3. Filtrovat podle: `user.usek_id → usek.lokalita_id === order.usek_id → usek.lokalita_id`

```php
if ($onlyOrderLocation) {
    // Načti lokalitu objednávky
    $stmt = $db->prepare("
        SELECT u.lokalita_id FROM 25_objednavky o
        JOIN 25_useky u ON o.usek_id = u.id
        WHERE o.id = :object_id
    ");
    $stmt->execute([':object_id' => $objectId]);
    $orderLocation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Filtruj users podle lokality
    $targetUserIds = array_filter($targetUserIds, function($userId) use ($db, $orderLocation) {
        $stmt = $db->prepare("
            SELECT u.lokalita_id FROM users usr
            JOIN 25_useky u ON usr.usek_id = u.id
            WHERE usr.id = :user_id
        ");
        $stmt->execute([':user_id' => $userId]);
        $userLocation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $userLocation['lokalita_id'] === $orderLocation['lokalita_id'];
    });
}
```

**Fáze 2: M:N Tabulka (později)**
- Až budeme mít use-case, kde user potřebuje více lokalit
- Pak vytvoříme `25_users_lokality`
- Migrujeme data z `users.usek_id`

**Důvody:**
1. **Fungující řešení teď** - onlyOrderLocation checkbox začne fungovat
2. **Evolvable** - později rozšíříme na M:N
3. **Praktické** - většina uživatelů má 1 lokalitu

---

## 🎯 SHRNUTÍ - CO DISKUTOVAT

### Priority Notifikací:
1. **Sjednotit nebo oddělit** recipientRole vs priorita?
2. **Zahodit legacy** priority systém? (low/normal/high/urgent)
3. **Potřebujeme granularitu** (INFO+URGENT)?

### Oprávnění/Scope:
1. **Dokončit onlyOrderLocation** implementaci?
2. **M:N tabulka** pro user-lokality? (teď nebo později?)
3. **Vztah mezi** relationshipScope a onlyOrderLocation?

**Co se ti nelíbí? Co bys chtěl změnit?**

---

## C) GENERIC RECIPIENT SYSTEM - Event-Driven Approach

### 🎯 KLÍČOVÝ KONCEPT

**Problém současného stavu:**
- Hardcoded role specifické pro objednávky (AUTHOR_INFO, GUARANTOR_INFO, ...)
- Systém není univerzální pro jiné entity (faktury, úkoly, reporty, ...)
- Svázaný s doménou objednávek

**Nový přístup:**
```
UDÁLOST (Event) 
  → TRIGGER USER (kdo to vyvolal)
  → PŘÍJEMCI (1-N) definovaní pomocí:
      a) Generic role (TRIGGER_USER, ENTITY_AUTHOR, ENTITY_OWNER)
      b) Specifické role (Schvalovatelé, Účetní, ...)
      c) Konkrétní users (User ID=100)
```

### 📊 DVĚ DIMENZE FILTROVÁNÍ

#### **Dimenze 1: KDO je příjemce** (Recipient Type)

| Typ | Popis | Příklad |
|-----|-------|---------|
| **Generic Recipient** | Dynamicky určený podle entity | `TRIGGER_USER`, `ENTITY_AUTHOR`, `ENTITY_OWNER` |
| **Role Recipient** | Všichni v roli | `Role: Schvalovatelé`, `Role: Účetní` |
| **Group Recipient** | Všichni ve skupině | `Group: IT tým`, `Group: Management` |
| **Specific User** | Konkrétní uživatel | `User: Robert (ID=100)` |

#### **Dimenze 2: JAK filtrovat** (Scope Filter)

| Filtr | Význam | Použití |
|-------|--------|---------|
| **ALL** | Všichni daného typu | Všichni schvalovatelé v celém systému |
| **LOCATION** | Jen z dané lokality | Jen schvalovatelé z lokality IT |
| **DEPARTMENT** | Jen z daného úseku | Jen schvalovatelé z úseku Finance |
| **ENTITY_PARTICIPANTS** | Jen účastníci entity | **Jen Robert, protože je příkazce TÉTO objednávky** |

---

### 💡 PRAKTICKÉ PŘÍKLADY

#### **Příklad 1: Notifikace pro Příkazce (jen toho z objednávky)**

```javascript
// Org-Hierarchy Edge Config:
{
  recipientType: 'ENTITY_OWNER',          // Generic: "Odpovědný za entitu"
  scopeFilter: 'ENTITY_PARTICIPANTS',     // ← KLÍČOVÉ: JEN účastníci této entity
  recipientRole: 'EXCEPTIONAL'            // Priorita notifikace
}

// Runtime vyhodnocení:
Event: ORDER_SENT_FOR_APPROVAL
Trigger User: user_id=100 (Robert - autor)
Entity: Order #123
  - author_id: 100 (Robert)
  - guarantor_id: 100 (Robert)
  - prikazce_id: 50 (Jan)        ← ENTITY_OWNER = Jan
  - approver_id: 10 (Petr)

→ Notifikaci dostane JEN Jan (user_id=50), protože:
  - recipientType=ENTITY_OWNER → Jan je příkazce
  - scopeFilter=ENTITY_PARTICIPANTS → Jan je účastník TÉTO objednávky
  
→ Ostatní příkazci v systému (např. user_id=60, 70) nedostanou nic ✅
```

---

#### **Příklad 2: Notifikace pro Všechny Schvalovatele z Lokality**

```javascript
// Org-Hierarchy Edge Config:
{
  recipientType: 'ROLE',                  // Role: Schvalovatelé
  roleId: 5,                              // ID role "Schvalovatel"
  scopeFilter: 'LOCATION',                // ← Filtruj podle lokality entity
  recipientRole: 'APPROVAL'
}

// Runtime vyhodnocení:
Event: ORDER_SENT_FOR_APPROVAL
Entity: Order #123
  - usek_id: 10 → lokalita_id: 1 (IT)

→ Najdi všechny users s rolí "Schvalovatel"
→ Filtruj: jen ti z lokality IT
→ Výsledek: [user_id=10, user_id=15, user_id=20]
→ Všichni tři dostanou notifikaci ✅
```

---

#### **Příklad 3: Notifikace pro Trigger User (kdo to vyvolal)**

```javascript
// Org-Hierarchy Edge Config:
{
  recipientType: 'TRIGGER_USER',          // Generic: Ten, kdo akci provedl
  scopeFilter: 'NONE',                    // Bez filtru (vždy jen 1 user)
  recipientRole: 'INFO'                   // Jen pro vědomí
}

// Runtime vyhodnocení:
Event: ORDER_APPROVED
Trigger User: user_id=50 (Jan - příkazce schválil)

→ Notifikaci dostane Jan (user_id=50)
→ Text: "✅ Schválil jsi objednávku O-123/2025"
```

---

#### **Příklad 4: Notifikace pro Autora + Všechny Účetní**

```javascript
// Edge #1: Pro autora objednávky
{
  recipientType: 'ENTITY_AUTHOR',         // Generic: Autor
  scopeFilter: 'ENTITY_PARTICIPANTS',     // Jen pokud je účastník
  recipientRole: 'INFO'
}

// Edge #2: Pro všechny účetní v systému
{
  recipientType: 'ROLE',                  // Role: Účetní
  roleId: 8,
  scopeFilter: 'ALL',                     // ← VŠICHNI účetní (bez filtru)
  recipientRole: 'INFO'
}

// Runtime vyhodnocení:
Event: ORDER_SENT_TO_ACCOUNTING
Entity: Order #123
  - author_id: 100 (Robert)

→ Edge #1: Notifikaci dostane Robert (author)
→ Edge #2: Notifikaci dostanou VŠICHNI účetní [user_id=30, 35, 40, 45, ...]
```

---

### 🏗️ IMPLEMENTACE - DB Struktura

#### **Rozšíření 25_hierarchie_vztahy**

```sql
ALTER TABLE `25_hierarchie_vztahy` 
ADD COLUMN `recipient_type` ENUM(
  'TRIGGER_USER',        -- Kdo událost vyvolal
  'ENTITY_AUTHOR',       -- Autor/tvůrce entity
  'ENTITY_OWNER',        -- Vlastník/odpovědný (garant, příkazce, ...)
  'SPECIFIC_USER',       -- Konkrétní user (podle cil_uzivatel_id)
  'ROLE',                -- Role (podle cil_role_id)
  'GROUP'                -- Skupina (podle cil_skupina_id)
) DEFAULT 'SPECIFIC_USER' AFTER `notifikace_recipient_role`;

ALTER TABLE `25_hierarchie_vztahy`
ADD COLUMN `scope_filter` ENUM(
  'NONE',                -- Bez filtru
  'ALL',                 -- Všichni daného typu
  'LOCATION',            -- Jen z lokality entity
  'DEPARTMENT',          -- Jen z úseku entity
  'ENTITY_PARTICIPANTS'  -- Jen účastníci této konkrétní entity
) DEFAULT 'NONE' AFTER `recipient_type`;
```

---

### 🔧 IMPLEMENTACE - Backend Logic

```php
/**
 * Vyhodnotí příjemce podle recipient_type a scope_filter
 */
function resolveRecipients($db, $edge, $triggerUserId, $placeholders, $objectId) {
    $recipientType = $edge['recipient_type'];
    $scopeFilter = $edge['scope_filter'];
    $recipientIds = [];
    
    // Krok 1: Najdi potenciální příjemce podle TYPU
    switch ($recipientType) {
        case 'TRIGGER_USER':
            $recipientIds = [$triggerUserId];
            break;
            
        case 'ENTITY_AUTHOR':
            $authorId = $placeholders['author_id'] 
                     ?? $placeholders['creator_id'] 
                     ?? null;
            if ($authorId) {
                $recipientIds = [$authorId];
            }
            break;
            
        case 'ENTITY_OWNER':
            $ownerId = $placeholders['owner_id'] 
                    ?? $placeholders['guarantor_id'] 
                    ?? $placeholders['prikazce_id']
                    ?? null;
            if ($ownerId) {
                $recipientIds = [$ownerId];
            }
            break;
            
        case 'SPECIFIC_USER':
            $recipientIds = [$edge['cil_uzivatel_id']];
            break;
            
        case 'ROLE':
            // Najdi všechny users s touto rolí
            $stmt = $db->prepare("
                SELECT user_id FROM user_roles 
                WHERE role_id = :role_id
            ");
            $stmt->execute([':role_id' => $edge['cil_role_id']]);
            $recipientIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            break;
            
        case 'GROUP':
            // Najdi všechny users v této skupině
            $stmt = $db->prepare("
                SELECT user_id FROM group_members 
                WHERE group_id = :group_id
            ");
            $stmt->execute([':group_id' => $edge['cil_skupina_id']]);
            $recipientIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            break;
    }
    
    // Krok 2: Aplikuj SCOPE FILTER
    $recipientIds = applyScopeFilter(
        $db, 
        $recipientIds, 
        $scopeFilter, 
        $placeholders, 
        $objectId
    );
    
    return $recipientIds;
}

/**
 * Aplikuje scope filter na seznam příjemců
 */
function applyScopeFilter($db, $recipientIds, $scopeFilter, $placeholders, $objectId) {
    switch ($scopeFilter) {
        case 'NONE':
        case 'ALL':
            // Bez filtru - vrať všechny
            return $recipientIds;
            
        case 'LOCATION':
            // Filtruj jen users z lokality entity
            $entityLocationId = getEntityLocationId($db, $objectId);
            return array_filter($recipientIds, function($userId) use ($db, $entityLocationId) {
                $userLocationId = getUserLocationId($db, $userId);
                return $userLocationId === $entityLocationId;
            });
            
        case 'DEPARTMENT':
            // Filtruj jen users z úseku entity
            $entityDeptId = getEntityDepartmentId($db, $objectId);
            return array_filter($recipientIds, function($userId) use ($db, $entityDeptId) {
                $userDeptId = getUserDepartmentId($db, $userId);
                return $userDeptId === $entityDeptId;
            });
            
        case 'ENTITY_PARTICIPANTS':
            // Filtruj jen účastníky této konkrétní entity
            $participantIds = getEntityParticipants($db, $objectId, $placeholders);
            return array_intersect($recipientIds, $participantIds);
            
        default:
            return $recipientIds;
    }
}

/**
 * Najde všechny účastníky entity (autor, garant, schvalovatel, příkazce, ...)
 */
function getEntityParticipants($db, $objectId, $placeholders) {
    $participants = [];
    
    // Přidej všechny ID z placeholders (author, guarantor, approver, ...)
    $participantKeys = [
        'author_id', 'creator_id', 'guarantor_id', 'owner_id',
        'approver_id', 'prikazce_id', 'nakladatel_id', 'accountant_id'
    ];
    
    foreach ($participantKeys as $key) {
        if (isset($placeholders[$key]) && $placeholders[$key]) {
            $participants[] = (int)$placeholders[$key];
        }
    }
    
    // Případně načti i z DB (schvalovatelé mohou být více)
    // TODO: Pokud máme tabulku order_approvers, načti je tady
    
    return array_unique($participants);
}
```

---

### 🎨 IMPLEMENTACE - Frontend UI

#### **Nový Node Type: "Generic Recipient"**

```javascript
// V OrganizationHierarchy.js - přidat nový typ node

const nodeTypes = useMemo(() => ({
  template: TemplateNode,
  user: UserNode,
  role: RoleNode,
  group: GroupNode,
  genericRecipient: GenericRecipientNode  // ← NOVÝ!
}), []);

// GenericRecipientNode komponent:
function GenericRecipientNode({ data }) {
  return (
    <NodeWrapper color="#9333ea" icon="🎯">
      <NodeTitle>{data.label}</NodeTitle>
      <NodeSubtitle>
        {data.recipientType === 'TRIGGER_USER' && '🎯 Trigger User'}
        {data.recipientType === 'ENTITY_AUTHOR' && '✍️ Entity Author'}
        {data.recipientType === 'ENTITY_OWNER' && '👤 Entity Owner'}
      </NodeSubtitle>
      <Handle type="target" position="left" />
    </NodeWrapper>
  );
}
```

#### **Edge Detail Panel - Rozšíření**

```javascript
// V DetailPanel pro edge config

<FormSection>
  <Label>Typ příjemce</Label>
  <Select value={recipientType} onChange={setRecipientType}>
    <optgroup label="Generic (dynamické)">
      <option value="TRIGGER_USER">🎯 Trigger User (kdo to vyvolal)</option>
      <option value="ENTITY_AUTHOR">✍️ Entity Author (autor/tvůrce)</option>
      <option value="ENTITY_OWNER">👤 Entity Owner (garant/příkazce)</option>
    </optgroup>
    <optgroup label="Specifické">
      <option value="SPECIFIC_USER">👤 Konkrétní uživatel</option>
      <option value="ROLE">👥 Role</option>
      <option value="GROUP">🏢 Skupina</option>
    </optgroup>
  </Select>
</FormSection>

<FormSection>
  <Label>Scope filtr</Label>
  <Select value={scopeFilter} onChange={setScopeFilter}>
    <option value="NONE">Bez filtru</option>
    <option value="ALL">Všichni daného typu</option>
    <option value="LOCATION">Jen z lokality entity</option>
    <option value="DEPARTMENT">Jen z úseku entity</option>
    <option value="ENTITY_PARTICIPANTS">⭐ Jen účastníci TÉTO entity</option>
  </Select>
  
  <HelpText>
    {scopeFilter === 'ENTITY_PARTICIPANTS' && (
      <>
        ✅ Příklad: Pokud je příjemce "Entity Owner" (příkazce) a filtr je 
        "ENTITY_PARTICIPANTS", notifikaci dostane JEN příkazce TÉTO objednávky,
        ne všichni příkazci v systému.
      </>
    )}
  </HelpText>
</FormSection>

<FormSection>
  <Label>Priorita notifikace</Label>
  <Select value={recipientRole} onChange={setRecipientRole}>
    <option value="EXCEPTIONAL">🔴 Exceptional</option>
    <option value="APPROVAL">🟠 Approval</option>
    <option value="INFO">🟢 Info</option>
  </Select>
</FormSection>
```

---

### 📋 MIGRACE SOUČASNÝCH EDGES

**Současný stav → Nový systém:**

```sql
-- Edge 1: Template → User (Robert)
-- BYLO:
cil_uzivatel_id = 100
recipient_role = 'APPROVAL'

-- BUDE:
recipient_type = 'SPECIFIC_USER'
cil_uzivatel_id = 100
scope_filter = 'NONE'
recipient_role = 'APPROVAL'

-- Edge 2: AUTHOR_INFO (hardcoded)
-- BYLO:
(hardcoded logika v backendu)

-- BUDE:
recipient_type = 'ENTITY_AUTHOR'
scope_filter = 'ENTITY_PARTICIPANTS'
recipient_role = 'INFO'

-- Edge 3: GUARANTOR_INFO (hardcoded)
-- BYLO:
(hardcoded logika v backendu)

-- BUDE:
recipient_type = 'ENTITY_OWNER'
scope_filter = 'ENTITY_PARTICIPANTS'
recipient_role = 'INFO'

-- Edge 4: Role Schvalovatelé (jen z této objednávky)
-- BYLO:
cil_role_id = 5
onlyOrderParticipants = true

-- BUDE:
recipient_type = 'ROLE'
cil_role_id = 5
scope_filter = 'ENTITY_PARTICIPANTS'  ← Nahrazuje onlyOrderParticipants
recipient_role = 'APPROVAL'

-- Edge 5: Všichni účetní (bez omezení)
-- BYLO:
cil_role_id = 8
onlyOrderParticipants = false

-- BUDE:
recipient_type = 'ROLE'
cil_role_id = 8
scope_filter = 'ALL'  ← Žádný filtr, všichni
recipient_role = 'INFO'
```

---

### ✅ CO ZÍSKÁME

1. **Univerzálnost** - Funguje pro orders, invoices, todos, reports, ...
2. **Explicitnost** - Jasně vidíš v UI, kdo dostane notifikaci a proč
3. **Flexibilita** - Kombinace recipient_type + scope_filter pokrývá všechny případy
4. **Zpětná kompatibilita** - Stávající edges lze migrovat bez ztráty funkcionality
5. **Čitelnost** - Konec hardcoded logiky typu AUTHOR_INFO, GUARANTOR_INFO

---

### 🎯 KONKRÉTNÍ USE-CASE: Robert jako Příkazce

```javascript
// Požadavek:
// "Když je objednávka odeslána ke schválení, notifikaci dostane 
//  JEN příkazce TÉTO objednávky (Robert), ne všichni příkazci."

// Org-Hierarchy Edge:
{
  source: 'TEMPLATE_ORDER_SENT_FOR_APPROVAL',
  target: 'GENERIC_RECIPIENT_NODE',
  data: {
    recipient_type: 'ENTITY_OWNER',           // ← Dynamicky najde příkazce
    scope_filter: 'ENTITY_PARTICIPANTS',       // ← Jen pokud je účastník
    recipient_role: 'EXCEPTIONAL'              // ← Červená priorita
  }
}

// Runtime:
Event: ORDER_SENT_FOR_APPROVAL
Entity: Order #123
  - prikazce_id: 50 (Robert)

Backend:
1. recipient_type='ENTITY_OWNER' → najde prikazce_id=50
2. scope_filter='ENTITY_PARTICIPANTS' → zkontroluje, že 50 je účastník order #123
3. ✅ Výsledek: [50]
4. Odešle notifikaci Robertovi (user_id=50)

Ostatní příkazci (user_id=60, 70, 80, ...) nedostanou nic! ✅
```

---

### 🚀 IMPLEMENTAČNÍ PLÁN

**Fáze 1: DB Migration (30 min)**
```sql
ALTER TABLE 25_hierarchie_vztahy 
ADD COLUMN recipient_type ENUM(...),
ADD COLUMN scope_filter ENUM(...);
```

**Fáze 2: Backend Logic (2-3h)**
- Implementovat `resolveRecipients()`
- Implementovat `applyScopeFilter()`
- Implementovat `getEntityParticipants()`
- Odstranit hardcoded AUTHOR_INFO/GUARANTOR_INFO logiku

**Fáze 3: Frontend UI (2-3h)**
- Přidat GenericRecipientNode komponent
- Rozšířit EdgeDetailPanel
- Přidat helper text pro scope filters

**Fáze 4: Migrace Dat (1h)**
- Migrovat existující edges na nový systém
- Otestovat na testovací objednávce

**Fáze 5: Testing (1-2h)**
- Test: TRIGGER_USER dostane notifikaci
- Test: ENTITY_OWNER (příkazce) dostane notifikaci
- Test: ENTITY_PARTICIPANTS filtr funguje správně
- Test: LOCATION filtr funguje správně

**Celkem: ~7-10 hodin práce**

---

### ⚠️ KRITICKÉ PŘIPOMÍNKY Z OBRÁZKU

**Viz screenshot notifikací:**

![Notifikace s prázdnými placeholdery](./screenshot-notifications-empty.png)

**Problém:**
```
✅ Poslední řádek (starý systém): "Ke schválení: O-1961/75030926/2025/IT" - PLNÝ TEXT
❌ Nové notifikace (org-hierarchy): "Ke schválení: O-1961/75030926/2025/IT" - PRÁZDNÉ/TORZO
```

**Root Cause:**
- `loadOrderPlaceholders()` se **nevolá konzistentně** pro každou notifikaci
- Template má placeholdery typu `{{order_number}}`, ale data se nenačítají z DB
- První notifikace fungují, další už mají prázdné hodnoty

**FIX Required:**
```php
// V notificationRouter() - PŘED KAŽDOU notifikací:
foreach ($edges as $edge) {
    // ✅ VŽDY načíst placeholders ZNOVU pro každý edge
    $placeholders = loadOrderPlaceholders($db, $objectId);
    
    // ✅ MERGE s trigger user info
    if ($triggerUserId) {
        $placeholders['action_performed_by'] = getTriggerUserName($db, $triggerUserId);
    }
    
    // Teprve pak proces šablonu
    $processedTitle = replacePlaceholders($template['app_nadpis'], $placeholders);
    $processedMessage = replacePlaceholders($template['app_zprava'], $placeholders);
}
```

**Testing:**
```bash
# Po implementaci otestovat:
1. Vytvořit objednávku
2. Odeslat ke schválení
3. Zkontrolovat VŠECHNY notifikace - musí mít plný text!
```

---

### 📋 TECHNICKÉ POŽADAVKY

#### **Environment & Standards:**
- ✅ **GIT:** Průběžně commitovat + pushovat do feature branch
- ✅ **API:** V2 standard (`/api/v2/...`)
- ✅ **DB Connection:** PDO (ne mysqli!)
- ✅ **Config:** DB credentials v `dbconfig.php`
- ✅ **Server:** Produkční server (NE localhost!)
- ✅ **Compatibility:** Nerozbít existující API endpointy
- ✅ **Error Handling:** Try-catch bloky, error_log() pro debugging

#### **Coding Standards:**
```php
// ✅ SPRÁVNĚ:
try {
    $stmt = $db->prepare("SELECT ...");
    $stmt->execute([':param' => $value]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result) {
        error_log("⚠️ [NotificationRouter] Entity not found: ID=$objectId");
        return null;
    }
} catch (PDOException $e) {
    error_log("❌ [NotificationRouter] DB Error: " . $e->getMessage());
    throw $e;
}

// ❌ ŠPATNĚ:
$result = mysqli_query($conn, "SELECT ...");
```

#### **File Locations:**
```
Backend:
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
    - notificationHandlers.php      (router, trigger logic)
    - hierarchyHandlers_v2.php      (org-hierarchy CRUD)

Frontend:
  /var/www/erdms-dev/apps/eeo-v2/client/src/
    - pages/OrganizationHierarchy.js  (React Flow editor)
    - components/NotificationDropdown.js  (zvoneček UI)
    - services/notificationsApi.js    (API volání)

Database:
  Tabulky:
    - 25_notifikace                 (notifikace)
    - 25_notifikace_precteni        (read tracking)
    - 25_hierarchie_profily         (hierarchy profiles)
    - 25_hierarchie_vztahy          (edges - relationships)
    - 25_notifikace_sablony         (templates)
    - 25_notifikace_typy_udalosti   (event types)
```

---

### 🚀 IMPLEMENTAČNÍ PLÁN - Generic Recipient System

#### **FÁZE 0: PŘÍPRAVA (15 min)**

**0.1. Vytvoř feature branch**
```bash
cd /var/www/erdms-dev
git checkout feature/orderform25-sprint1-cleanup
git pull origin feature/orderform25-sprint1-cleanup
git checkout -b feature/generic-recipient-system
```

**0.2. Backup současného stavu**
```bash
# Backup DB tabulek
mysqldump eeo2025 25_hierarchie_vztahy > BACKUP_hierarchie_vztahy_$(date +%Y%m%d_%H%M%S).sql
mysqldump eeo2025 25_hierarchie_profily > BACKUP_hierarchie_profily_$(date +%Y%m%d_%H%M%S).sql

# Backup PHP souborů
cp apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php \
   apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php.backup-$(date +%Y%m%d_%H%M%S)
```

**0.3. Vytvoř SQL migration soubor**
```bash
touch ALTER_ADD_GENERIC_RECIPIENT_SYSTEM.sql
```

---

#### **FÁZE 1: DB MIGRATION (30 min)**

**1.1. Rozšíř 25_hierarchie_vztahy tabulku**

```sql
-- ALTER_ADD_GENERIC_RECIPIENT_SYSTEM.sql

-- ═══════════════════════════════════════════════════════════════════════
-- Generic Recipient System - DB Migration
-- ═══════════════════════════════════════════════════════════════════════
-- DATUM: 2025-12-17
-- AUTOR: Robert Holovsky
-- ÚČEL: Přidat recipient_type a scope_filter pro univerzální notifikace
-- ═══════════════════════════════════════════════════════════════════════

-- Krok 1: Přidat sloupec recipient_type
ALTER TABLE `25_hierarchie_vztahy` 
ADD COLUMN `recipient_type` ENUM(
    'TRIGGER_USER',        -- Uživatel, který událost vyvolal
    'ENTITY_AUTHOR',       -- Autor/tvůrce entity (order.author_id, invoice.creator_id)
    'ENTITY_OWNER',        -- Vlastník/odpovědný (order.prikazce_id, order.guarantor_id)
    'SPECIFIC_USER',       -- Konkrétní user (podle cil_uzivatel_id) - DEFAULT pro zpětnou kompatibilitu
    'ROLE',                -- Role (podle cil_role_id)
    'GROUP'                -- Skupina (podle cil_skupina_id)
) DEFAULT 'SPECIFIC_USER' 
COMMENT 'Typ příjemce notifikace'
AFTER `notifikace_recipient_role`;

-- Krok 2: Přidat sloupec scope_filter
ALTER TABLE `25_hierarchie_vztahy`
ADD COLUMN `scope_filter` ENUM(
    'NONE',                -- Bez filtru (výchozí)
    'ALL',                 -- Všichni daného typu
    'LOCATION',            -- Jen z lokality entity
    'DEPARTMENT',          -- Jen z úseku entity
    'ENTITY_PARTICIPANTS'  -- Jen účastníci této konkrétní entity (nahrazuje onlyOrderParticipants)
) DEFAULT 'NONE'
COMMENT 'Filtr pro omezení příjemců'
AFTER `recipient_type`;

-- Krok 3: Nastavit recipient_type pro existující edges podle current logiky
UPDATE `25_hierarchie_vztahy` SET 
    recipient_type = 'SPECIFIC_USER',
    scope_filter = CASE 
        WHEN pouze_ucastnici_objednavky = 1 THEN 'ENTITY_PARTICIPANTS'
        ELSE 'NONE'
    END
WHERE cil_uzivatel_id IS NOT NULL;

UPDATE `25_hierarchie_vztahy` SET 
    recipient_type = 'ROLE',
    scope_filter = CASE 
        WHEN pouze_ucastnici_objednavky = 1 THEN 'ENTITY_PARTICIPANTS'
        ELSE 'ALL'
    END
WHERE cil_role_id IS NOT NULL;

UPDATE `25_hierarchie_vztahy` SET 
    recipient_type = 'GROUP',
    scope_filter = CASE 
        WHEN pouze_ucastnici_objednavky = 1 THEN 'ENTITY_PARTICIPANTS'
        ELSE 'ALL'
    END
WHERE cil_skupina_id IS NOT NULL;

-- Krok 4: Verify migrace
SELECT 
    id,
    zdroj_node_id,
    cil_node_id,
    recipient_type,
    scope_filter,
    notifikace_recipient_role,
    pouze_ucastnici_objednavky
FROM `25_hierarchie_vztahy`
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════
-- PROVEDENO: 2025-12-17 [ČASOVÝ ÚDAJ]
-- Server: 10.3.172.11
-- Database: eeo2025
-- ═══════════════════════════════════════════════════════════════════════
```

**1.2. Spustit migraci**
```bash
# Připojit se k DB serveru
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < ALTER_ADD_GENERIC_RECIPIENT_SYSTEM.sql
```

**1.3. Commit**
```bash
git add ALTER_ADD_GENERIC_RECIPIENT_SYSTEM.sql
git commit -m "feat: Add recipient_type and scope_filter to 25_hierarchie_vztahy

- Add recipient_type ENUM (TRIGGER_USER, ENTITY_AUTHOR, ENTITY_OWNER, SPECIFIC_USER, ROLE, GROUP)
- Add scope_filter ENUM (NONE, ALL, LOCATION, DEPARTMENT, ENTITY_PARTICIPANTS)
- Migrate existing edges to new structure
- Replace pouze_ucastnici_objednavky with scope_filter=ENTITY_PARTICIPANTS"

git push origin feature/generic-recipient-system
```

---

#### **FÁZE 2: BACKEND - Helper Functions (1.5h)**

**2.1. Vytvořit helper funkce v notificationHandlers.php**

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

```php
/**
 * ═══════════════════════════════════════════════════════════════════════
 * GENERIC RECIPIENT SYSTEM - Helper Functions
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Najde všechny účastníky entity (autor, garant, schvalovatel, příkazce, ...)
 * 
 * @param PDO $db
 * @param int $objectId - ID entity (order, invoice, ...)
 * @param array $placeholders - Již načtené placeholders z entity
 * @return array - Pole user IDs
 */
function getEntityParticipants($db, $objectId, $placeholders) {
    $participants = [];
    
    // Přidej všechny user IDs z placeholders
    $participantKeys = [
        'author_id', 'creator_id', 'guarantor_id', 'owner_id',
        'approver_id', 'prikazce_id', 'nakladatel_id', 'accountant_id',
        'garant_id', 'schvalovatel_id', 'zadavatel_id'
    ];
    
    foreach ($participantKeys as $key) {
        if (isset($placeholders[$key]) && $placeholders[$key]) {
            $userId = (int)$placeholders[$key];
            if ($userId > 0) {
                $participants[] = $userId;
            }
        }
    }
    
    // Odstraň duplicity
    $participants = array_unique($participants);
    
    error_log("   📋 [getEntityParticipants] Entity ID=$objectId → Participants: " . implode(', ', $participants));
    
    return $participants;
}

/**
 * Najde lokalitu entity
 */
function getEntityLocationId($db, $objectId, $objectType = 'order') {
    try {
        if ($objectType === 'order') {
            $stmt = $db->prepare("
                SELECT u.lokalita_id 
                FROM " . TABLE_OBJEDNAVKY . " o
                JOIN 25_useky u ON o.usek_id = u.id
                WHERE o.id = :object_id
            ");
            $stmt->execute([':object_id' => $objectId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? $result['lokalita_id'] : null;
        }
        // TODO: Přidat support pro invoice, todo, ...
        return null;
    } catch (PDOException $e) {
        error_log("❌ [getEntityLocationId] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Najde úsek entity
 */
function getEntityDepartmentId($db, $objectId, $objectType = 'order') {
    try {
        if ($objectType === 'order') {
            $stmt = $db->prepare("
                SELECT usek_id 
                FROM " . TABLE_OBJEDNAVKY . "
                WHERE id = :object_id
            ");
            $stmt->execute([':object_id' => $objectId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? $result['usek_id'] : null;
        }
        return null;
    } catch (PDOException $e) {
        error_log("❌ [getEntityDepartmentId] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Najde lokalitu uživatele
 */
function getUserLocationId($db, $userId) {
    try {
        $stmt = $db->prepare("
            SELECT u.lokalita_id 
            FROM users usr
            JOIN 25_useky u ON usr.usek_id = u.id
            WHERE usr.id = :user_id
        ");
        $stmt->execute([':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['lokalita_id'] : null;
    } catch (PDOException $e) {
        error_log("❌ [getUserLocationId] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Najde úsek uživatele
 */
function getUserDepartmentId($db, $userId) {
    try {
        $stmt = $db->prepare("SELECT usek_id FROM users WHERE id = :user_id");
        $stmt->execute([':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['usek_id'] : null;
    } catch (PDOException $e) {
        error_log("❌ [getUserDepartmentId] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Aplikuje scope filter na seznam příjemců
 * 
 * @param PDO $db
 * @param array $recipientIds - Pole user IDs
 * @param string $scopeFilter - NONE, ALL, LOCATION, DEPARTMENT, ENTITY_PARTICIPANTS
 * @param array $placeholders
 * @param int $objectId
 * @param string $objectType
 * @return array - Filtrované pole user IDs
 */
function applyScopeFilter($db, $recipientIds, $scopeFilter, $placeholders, $objectId, $objectType = 'order') {
    error_log("   🔍 [applyScopeFilter] Input: " . count($recipientIds) . " recipients, filter='$scopeFilter'");
    
    switch ($scopeFilter) {
        case 'NONE':
        case 'ALL':
            // Bez filtru - vrať všechny
            error_log("   ✅ [applyScopeFilter] No filter → " . count($recipientIds) . " recipients");
            return $recipientIds;
            
        case 'LOCATION':
            // Filtruj jen users z lokality entity
            $entityLocationId = getEntityLocationId($db, $objectId, $objectType);
            if (!$entityLocationId) {
                error_log("   ⚠️ [applyScopeFilter] Entity has no location → returning all");
                return $recipientIds;
            }
            
            $filtered = array_filter($recipientIds, function($userId) use ($db, $entityLocationId) {
                $userLocationId = getUserLocationId($db, $userId);
                return $userLocationId === $entityLocationId;
            });
            
            error_log("   ✅ [applyScopeFilter] LOCATION filter (location_id=$entityLocationId) → " . 
                      count($filtered) . " recipients");
            return array_values($filtered);
            
        case 'DEPARTMENT':
            // Filtruj jen users z úseku entity
            $entityDeptId = getEntityDepartmentId($db, $objectId, $objectType);
            if (!$entityDeptId) {
                error_log("   ⚠️ [applyScopeFilter] Entity has no department → returning all");
                return $recipientIds;
            }
            
            $filtered = array_filter($recipientIds, function($userId) use ($db, $entityDeptId) {
                $userDeptId = getUserDepartmentId($db, $userId);
                return $userDeptId === $entityDeptId;
            });
            
            error_log("   ✅ [applyScopeFilter] DEPARTMENT filter (dept_id=$entityDeptId) → " . 
                      count($filtered) . " recipients");
            return array_values($filtered);
            
        case 'ENTITY_PARTICIPANTS':
            // Filtruj jen účastníky této konkrétní entity
            $participantIds = getEntityParticipants($db, $objectId, $placeholders);
            $filtered = array_intersect($recipientIds, $participantIds);
            
            error_log("   ✅ [applyScopeFilter] ENTITY_PARTICIPANTS filter → " . 
                      count($filtered) . " recipients (from " . count($participantIds) . " participants)");
            return array_values($filtered);
            
        default:
            error_log("   ⚠️ [applyScopeFilter] Unknown filter '$scopeFilter' → returning all");
            return $recipientIds;
    }
}

/**
 * Vyhodnotí příjemce podle recipient_type a scope_filter
 * 
 * @param PDO $db
 * @param array $edge - Edge data z hierarchie
 * @param int $triggerUserId - User ID, který událost vyvolal
 * @param array $placeholders - Placeholders z entity
 * @param int $objectId - ID entity
 * @param string $objectType - Typ entity (order, invoice, ...)
 * @return array - Pole user IDs
 */
function resolveRecipients($db, $edge, $triggerUserId, $placeholders, $objectId, $objectType = 'order') {
    $recipientType = $edge['recipient_type'] ?? 'SPECIFIC_USER';
    $scopeFilter = $edge['scope_filter'] ?? 'NONE';
    $recipientIds = [];
    
    error_log("🎯 [resolveRecipients] Type='$recipientType', Filter='$scopeFilter'");
    
    // Krok 1: Najdi potenciální příjemce podle TYPU
    switch ($recipientType) {
        case 'TRIGGER_USER':
            $recipientIds = [$triggerUserId];
            error_log("   → TRIGGER_USER: [" . $triggerUserId . "]");
            break;
            
        case 'ENTITY_AUTHOR':
            $authorId = $placeholders['author_id'] 
                     ?? $placeholders['creator_id']
                     ?? $placeholders['zadavatel_id']
                     ?? null;
            if ($authorId) {
                $recipientIds = [(int)$authorId];
                error_log("   → ENTITY_AUTHOR: [" . $authorId . "]");
            } else {
                error_log("   ⚠️ ENTITY_AUTHOR: No author found in placeholders");
            }
            break;
            
        case 'ENTITY_OWNER':
            $ownerId = $placeholders['owner_id'] 
                    ?? $placeholders['guarantor_id']
                    ?? $placeholders['garant_id']
                    ?? $placeholders['prikazce_id']
                    ?? $placeholders['nakladatel_id']
                    ?? null;
            if ($ownerId) {
                $recipientIds = [(int)$ownerId];
                error_log("   → ENTITY_OWNER: [" . $ownerId . "]");
            } else {
                error_log("   ⚠️ ENTITY_OWNER: No owner found in placeholders");
            }
            break;
            
        case 'SPECIFIC_USER':
            if (isset($edge['cil_uzivatel_id']) && $edge['cil_uzivatel_id']) {
                $recipientIds = [(int)$edge['cil_uzivatel_id']];
                error_log("   → SPECIFIC_USER: [" . $edge['cil_uzivatel_id'] . "]");
            }
            break;
            
        case 'ROLE':
            if (isset($edge['cil_role_id']) && $edge['cil_role_id']) {
                // Najdi všechny users s touto rolí
                try {
                    $stmt = $db->prepare("
                        SELECT user_id FROM user_roles 
                        WHERE role_id = :role_id AND active = 1
                    ");
                    $stmt->execute([':role_id' => $edge['cil_role_id']]);
                    $recipientIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    error_log("   → ROLE (id=" . $edge['cil_role_id'] . "): [" . 
                              implode(', ', $recipientIds) . "]");
                } catch (PDOException $e) {
                    error_log("   ❌ ROLE query failed: " . $e->getMessage());
                }
            }
            break;
            
        case 'GROUP':
            if (isset($edge['cil_skupina_id']) && $edge['cil_skupina_id']) {
                // Najdi všechny users v této skupině
                try {
                    $stmt = $db->prepare("
                        SELECT user_id FROM group_members 
                        WHERE group_id = :group_id AND active = 1
                    ");
                    $stmt->execute([':group_id' => $edge['cil_skupina_id']]);
                    $recipientIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    error_log("   → GROUP (id=" . $edge['cil_skupina_id'] . "): [" . 
                              implode(', ', $recipientIds) . "]");
                } catch (PDOException $e) {
                    error_log("   ❌ GROUP query failed: " . $e->getMessage());
                }
            }
            break;
            
        default:
            error_log("   ⚠️ Unknown recipient_type: '$recipientType'");
    }
    
    // Krok 2: Aplikuj SCOPE FILTER
    if (!empty($recipientIds)) {
        $recipientIds = applyScopeFilter(
            $db, 
            $recipientIds, 
            $scopeFilter, 
            $placeholders, 
            $objectId,
            $objectType
        );
    }
    
    error_log("✅ [resolveRecipients] Final: " . count($recipientIds) . " recipients → [" . 
              implode(', ', $recipientIds) . "]");
    
    return $recipientIds;
}
```

**2.2. Commit**
```bash
git add apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
git commit -m "feat: Add generic recipient resolution functions

- Add resolveRecipients() - main resolver
- Add applyScopeFilter() - LOCATION, DEPARTMENT, ENTITY_PARTICIPANTS filters
- Add getEntityParticipants() - find all participants of entity
- Add helper functions for location/department lookup
- Comprehensive error logging for debugging"

git push origin feature/generic-recipient-system
```

---

#### **FÁZE 3: BACKEND - Integration do notificationRouter (2h)**

**3.1. Upravit findNotificationRecipients() funkci**

**Najdi funkci v:** `notificationHandlers.php` (cca řádek 1600-1900)

```php
// PŮVODNÍ funkce findNotificationRecipients() - NAHRADIT

function findNotificationRecipients($db, $profileId, $eventType, $objectType, $objectId, $triggerUserId) {
    error_log("\n🔍 ═══════════════════════════════════════════════════════════════");
    error_log("🔍 [findNotificationRecipients] START");
    error_log("   Profile ID: $profileId");
    error_log("   Event Type: $eventType");
    error_log("   Object Type: $objectType");
    error_log("   Object ID: $objectId");
    error_log("   Trigger User ID: $triggerUserId");
    
    $recipients = [];
    
    try {
        // 1. Načti hierarchii z DB
        $stmt = $db->prepare("
            SELECT structure_json 
            FROM 25_hierarchie_profily 
            WHERE id = :profile_id
        ");
        $stmt->execute([':profile_id' => $profileId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile || !$profile['structure_json']) {
            error_log("⚠️ [findNotificationRecipients] Profile not found or empty");
            return [];
        }
        
        $structure = json_decode($profile['structure_json'], true);
        $nodes = $structure['nodes'] ?? [];
        $edges = $structure['edges'] ?? [];
        
        error_log("📊 [findNotificationRecipients] Loaded " . count($nodes) . " nodes, " . 
                  count($edges) . " edges");
        
        // 2. ✅ KRITICKÉ: Načti placeholders JEDNOU na začátku
        $placeholders = loadOrderPlaceholders($db, $objectId);
        
        // 3. ✅ KRITICKÉ: Přidej trigger user info do placeholders
        if ($triggerUserId) {
            $stmt = $db->prepare("
                SELECT CONCAT(name, ' ', surname) as full_name 
                FROM users 
                WHERE id = :user_id
            ");
            $stmt->execute([':user_id' => $triggerUserId]);
            $triggerUser = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($triggerUser) {
                $placeholders['action_performed_by'] = $triggerUser['full_name'];
                $placeholders['trigger_user_id'] = $triggerUserId;
                $placeholders['trigger_user_name'] = $triggerUser['full_name'];
            }
        }
        
        error_log("📋 [findNotificationRecipients] Loaded placeholders: " . 
                  json_encode(array_keys($placeholders)));
        
        // 4. Najdi template nodes pro tento event type
        $templateNodes = array_filter($nodes, function($node) use ($eventType) {
            return $node['type'] === 'template' 
                && isset($node['data']['eventTypes'])
                && in_array($eventType, $node['data']['eventTypes']);
        });
        
        error_log("🎯 [findNotificationRecipients] Found " . count($templateNodes) . 
                  " template nodes for event '$eventType'");
        
        // 5. Pro každý template node, projdi jeho edges
        foreach ($templateNodes as $templateNode) {
            $templateId = $templateNode['id'];
            error_log("\n📧 [findNotificationRecipients] Processing template: $templateId");
            
            // Najdi edges vycházející z tohoto template
            $templateEdges = array_filter($edges, function($edge) use ($templateId) {
                return $edge['source'] === $templateId;
            });
            
            error_log("   → Found " . count($templateEdges) . " outgoing edges");
            
            foreach ($templateEdges as $edge) {
                error_log("\n   ┌─ Edge: " . $edge['id']);
                
                // Načti edge data z DB (obsahuje recipient_type, scope_filter)
                $stmt = $db->prepare("
                    SELECT * FROM 25_hierarchie_vztahy
                    WHERE zdroj_node_id = :source AND cil_node_id = :target
                    AND profil_id = :profile_id
                ");
                $stmt->execute([
                    ':source' => $edge['source'],
                    ':target' => $edge['target'],
                    ':profile_id' => $profileId
                ]);
                $edgeData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$edgeData) {
                    error_log("   ⚠️ Edge data not found in DB");
                    continue;
                }
                
                // ✅ NOVÝ SYSTÉM: Použij resolveRecipients()
                $recipientIds = resolveRecipients(
                    $db,
                    $edgeData,
                    $triggerUserId,
                    $placeholders,
                    $objectId,
                    $objectType
                );
                
                if (empty($recipientIds)) {
                    error_log("   ⏩ No recipients after resolution");
                    continue;
                }
                
                // Určit variantu šablony podle recipientRole
                $recipientRole = $edgeData['notifikace_recipient_role'] ?? 'APPROVAL';
                $variant = 'normalVariant';
                
                if ($recipientRole === 'EXCEPTIONAL') {
                    $variant = $templateNode['data']['urgentVariant'] ?? 'urgentVariant';
                } elseif ($recipientRole === 'INFO') {
                    $variant = $templateNode['data']['infoVariant'] ?? 'infoVariant';
                } else {
                    $variant = $templateNode['data']['normalVariant'] ?? 'normalVariant';
                }
                
                error_log("   📄 Template variant: '$variant' (role=$recipientRole)");
                
                // Načti template z DB
                $stmt = $db->prepare("
                    SELECT * FROM 25_notifikace_sablony 
                    WHERE kod = :kod
                ");
                $stmt->execute([':kod' => $variant]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$template) {
                    error_log("   ❌ Template variant '$variant' not found");
                    continue;
                }
                
                // ✅ KRITICKÉ: Proces placeholdery (používáme společné $placeholders)
                $processedTitle = replacePlaceholders($template['app_nadpis'], $placeholders);
                $processedMessage = replacePlaceholders($template['app_zprava'], $placeholders);
                
                error_log("   ✉️ Title: " . substr($processedTitle, 0, 100));
                
                // Zkontroluj user preferences
                $sendEmail = $edgeData['notifikace_email'] ?? false;
                $sendInApp = $edgeData['notifikace_inapp'] ?? true;
                
                // Přidej příjemce do výsledku
                foreach ($recipientIds as $userId) {
                    // Zkontroluj user notification preferences
                    $userPrefs = getUserNotificationPreferences($db, $userId);
                    
                    // Override podle user preferences
                    $finalSendEmail = $sendEmail && ($userPrefs['email_enabled'] ?? true);
                    $finalSendInApp = $sendInApp && ($userPrefs['inapp_enabled'] ?? true);
                    
                    $recipients[] = [
                        'uzivatel_id' => $userId,
                        'recipientRole' => $recipientRole,
                        'templateCode' => $variant,
                        'title' => $processedTitle,
                        'message' => $processedMessage,
                        'sendEmail' => $finalSendEmail,
                        'sendInApp' => $finalSendInApp,
                        'templateData' => $template,
                        'placeholders' => $placeholders  // ✅ Sdílené placeholders
                    ];
                    
                    error_log("   ✅ Added recipient: user_id=$userId, role=$recipientRole");
                }
            }
        }
        
        error_log("\n✅ [findNotificationRecipients] DONE - " . count($recipients) . " total recipients");
        error_log("🔍 ═══════════════════════════════════════════════════════════════\n");
        
        return $recipients;
        
    } catch (PDOException $e) {
        error_log("❌ [findNotificationRecipients] DB Error: " . $e->getMessage());
        error_log($e->getTraceAsString());
        return [];
    } catch (Exception $e) {
        error_log("❌ [findNotificationRecipients] Error: " . $e->getMessage());
        error_log($e->getTraceAsString());
        return [];
    }
}
```

**3.2. Commit**
```bash
git add apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
git commit -m "refactor: Integrate generic recipient system into notificationRouter

- Replace hardcoded AUTHOR_INFO/GUARANTOR_INFO logic with resolveRecipients()
- Load placeholders ONCE at start, share across all edges
- Use recipient_type and scope_filter from DB
- Fix placeholder replacement - ensure all notifications have full data
- Comprehensive logging for debugging"

git push origin feature/generic-recipient-system
```

---

#### **FÁZE 4: FRONTEND - UI Support (2-3h)**

**4.1. Přidat GenericRecipientNode komponent**

**Soubor:** `apps/eeo-v2/client/src/pages/OrganizationHierarchy.js`

*(Tato část bude pokračovat v dalším commitu - frontend UI změny)*

---

#### **FÁZE 5: TESTING & VERIFICATION (1-2h)**

**5.1. Test scénář 1: TRIGGER_USER**
```bash
# 1. Vytvoř test objednávku (user_id=100)
# 2. Odešli ke schválení
# 3. Zkontroluj notifikace:
SELECT * FROM 25_notifikace 
WHERE dt_created > NOW() - INTERVAL 5 MINUTE
ORDER BY dt_created DESC;

# Očekáváno: Notifikace pro user_id=100 s plným textem
```

**5.2. Test scénář 2: ENTITY_OWNER + ENTITY_PARTICIPANTS**
```bash
# 1. Vytvoř objednávku s příkazcem=user_id=50
# 2. Odešli ke schválení
# 3. Zkontroluj: JEN user_id=50 dostane notifikaci
# 4. Ostatní příkazci (60, 70, ...) NEDOSTANOU nic
```

**5.3. Verify placeholders**
```bash
# Zkontroluj že VŠECHNY notifikace mají plný text (ne prázdné placeholdery)
tail -f /var/log/php/error.log | grep "Title:"
```

---

### ⏱️ ČASOVÝ ODHAD

| Fáze | Úkon | Čas |
|------|------|-----|
| 0 | Příprava + Git branch | 15 min |
| 1 | DB Migration | 30 min |
| 2 | Backend Helper Functions | 1.5h |
| 3 | Backend Integration | 2h |
| 4 | Frontend UI | 2-3h |
| 5 | Testing & Fixes | 1-2h |
| **CELKEM** | | **7.5-10h** |

---

### ✅ CHECKLIST PŘED SPUŠTĚNÍM

- [ ] Git branch vytvořen: `feature/generic-recipient-system`
- [ ] DB backup proveden
- [ ] PHP soubory zálohované
- [ ] SQL migration soubor připraven
- [ ] dbconfig.php credentials ověřeny
- [ ] PHP error_log cesta známa: `/var/log/php/error.log`
- [ ] Testovací objednávka připravena

---

### 🚦 START IMPLEMENTACE

**Připraven k zahájení implementace!**

Začínáme s **Fází 0** nebo chceš ještě něco probrat/upravit?

---

## D) SCOPE APLIKACE - Moduly pro Notifikace & Oprávnění

### 📊 PŘEHLED MODULŮ (Seřazeno dle priority implementace)

---

### **🥇 PRIORITA 1: Objednávky V2** ⭐⭐⭐

**Stav:** ✅ Částečně implementováno (75%)

**Event Types:**
```javascript
ORDER_SENT_FOR_APPROVAL         // Odeslána ke schválení
ORDER_APPROVED                  // Schválena příkazcem
ORDER_REJECTED                  // Zamítnuta
ORDER_WAITING_FOR_CHANGES       // Vrácena k doplnění
ORDER_SENT_TO_SUPPLIER          // Odeslána dodavateli
ORDER_DELIVERED                 // Dodána
ORDER_REGISTERED                // Zaevidována v registru
ORDER_COMPLETED                 // Dokončena
ORDER_CANCELLED                 // Stornována
```

**Recipient Types:**
- `TRIGGER_USER` - Ten, kdo akci provedl
- `ENTITY_AUTHOR` - Autor objednávky (zadavatel)
- `ENTITY_OWNER` - Garant/Příkazce objednávky
- `SPECIFIC_USER` - Konkrétní schvalovatel
- `ROLE` - Schvalovatelé, Nákupčí, Registr IT/Ústí

**Scope Filters potřebné:**
- ✅ `ENTITY_PARTICIPANTS` - Jen účastníci TÉTO objednávky
- ✅ `LOCATION` - Jen z lokality objednávky (IT, Ústí, Praha, ...)
- ✅ `DEPARTMENT` - Jen z úseku objednávky
- ⚠️ `ALL` - Všichni (např. všichni registrátoři)

**Oprávnění/Role:**
```
- Zadavatel (author) → Může vytvořit, editovat své objednávky
- Garant → Odpovídá za objednávku
- Příkazce/Schvalovatel → Schvaluje objednávky své lokality
- Nákupčí → Zpracovává schválené objednávky
- Registr (IT/Ústí) → Eviduje dodání
- Admin → Vše
```

**Co implementovat:**
1. ✅ Generic Recipient System (FÁZE 1-3)
2. ✅ ENTITY_PARTICIPANTS filtr
3. ✅ LOCATION filtr
4. ⏳ DEPARTMENT filtr (pokud potřeba)
5. ⏳ Oprávnění podle lokality (M:N tabulka `25_users_lokality` - později)

**Časový odhad:** 8-10h (Generic system pokrývá 90%)

---

### **🥈 PRIORITA 2: Faktury** ⭐⭐

**Stav:** ❌ Neimplementováno (0%)

**Event Types (navrhované):**
```javascript
INVOICE_CREATED                 // Faktura vytvořena
INVOICE_SENT_FOR_APPROVAL       // Odeslána ke schválení
INVOICE_APPROVED                // Schválena
INVOICE_REJECTED                // Zamítnuta
INVOICE_SENT_FOR_PAYMENT        // Odeslána k úhradě
INVOICE_PAID                    // Zaplacena
INVOICE_OVERDUE                 // Po splatnosti
INVOICE_CANCELLED               // Stornována
```

**Recipient Types:**
- `TRIGGER_USER` - Ten, kdo akci provedl
- `ENTITY_AUTHOR` - Kdo fakturu vytvořil/nahrál
- `ENTITY_OWNER` - Odpovědný účetní
- `SPECIFIC_USER` - Konkrétní schvalovatel/ředitel
- `ROLE` - Účetní, Ředitel, Finance tým

**Scope Filters potřebné:**
- ✅ `ENTITY_PARTICIPANTS` - Jen účastníci TÉTO faktury
- ✅ `LOCATION` - Jen z lokality faktury
- ✅ `ALL` - Všichni účetní

**Oprávnění/Role:**
```
- Účetní (viewer) → Může prohlížet faktury
- Účetní (editor) → Může vytvářet/editovat faktury
- Účetní (approver) → Může schvalovat faktury
- Ředitel → Schvaluje faktury nad limit
- Finance tým → Zpracovává platby
```

**Co implementovat:**
1. ✅ Event types pro faktury (DB + backend constants)
2. ✅ Placeholders pro faktury (`invoice_number`, `supplier_name`, `amount`, `due_date`, ...)
3. ✅ `loadInvoicePlaceholders()` funkce
4. ⏳ UI templates pro fakturové notifikace
5. ⏳ Role-based permissions (kdo může schválit faktury)

**Časový odhad:** 3-4h (využije Generic system)

**Závislosti:**
- Generic Recipient System musí být hotový ✅

---

### **🥉 PRIORITA 3: TODO & Alarmy** ⭐

**Stav:** ✅ Částečně implementováno (60% - funguje mimo org-hierarchy)

**Event Types (existující):**
```javascript
TODO_ALARM_NORMAL               // Normální alarm
TODO_ALARM_HIGH                 // Vysoká priorita alarm
TODO_ALARM_EXPIRED              // Prošlý termín
TODO_CREATED                    // TODO vytvořeno
TODO_COMPLETED                  // TODO dokončeno
TODO_ASSIGNED                   // TODO přiřazeno jinému uživateli
```

**Recipient Types:**
- `ENTITY_OWNER` - Vlastník TODO úkolu
- `TRIGGER_USER` - Kdo TODO vytvořil/upravil
- `SPECIFIC_USER` - Konkrétní přiřazený uživatel

**Scope Filters potřebné:**
- ✅ `NONE` - Jen přiřazený uživatel (1:1)
- ⚠️ `TEAM` - Všichni v týmu (budoucí feature)

**Oprávnění/Role:**
```
- Owner → Může spravovat své TODO
- Assigned User → Dostane notifikaci o přiřazení
- Team Leader → Vidí TODO svého týmu
```

**Co implementovat:**
1. ⏳ Integrace TODO alarmů do org-hierarchy systému (optional)
2. ⏳ Team-based TODO notifikace
3. ⏳ Eskalace prošlých TODO nadřízenému

**Časový odhad:** 2-3h (mostly works, jen rozšíření)

**Poznámka:**
- TODO alarmy už fungují přes `notifyTodoAlarm()` API
- Nepotřebují org-hierarchy (1:1 user → notification)
- Rozšíření na team/manager notifikace je optional

---

### **🏅 PRIORITA 4: Pokladna** 

**Stav:** ❌ Neimplementováno (0%)

**Event Types (navrhované):**
```javascript
CASHBOOK_ENTRY_CREATED          // Záznam v pokladně vytvořen
CASHBOOK_ENTRY_APPROVED         // Záznam schválen
CASHBOOK_ENTRY_REJECTED         // Záznam zamítnut
CASHBOOK_BALANCE_LOW            // Nízký stav pokladny (warning)
CASHBOOK_DAILY_CLOSE            // Denní uzávěrka
CASHBOOK_MONTHLY_CLOSE          // Měsíční uzávěrka
```

**Recipient Types:**
- `TRIGGER_USER` - Kdo záznam vytvořil
- `ENTITY_OWNER` - Odpovědný pokladní
- `ROLE` - Všichni pokladní, Účetní vedoucí
- `SPECIFIC_USER` - Schvalovatel (vedoucí)

**Scope Filters potřebné:**
- ✅ `LOCATION` - Jen pokladní z dané lokality
- ✅ `ALL` - Všichni pokladní (pro uzávěrky)

**Oprávnění/Role:**
```
- Pokladní → Může vytvářet záznamy ve své pokladně
- Vedoucí pokladny → Schvaluje záznamy
- Účetní vedoucí → Dostává notifikace o uzávěrkách
```

**Co implementovat:**
1. Event types pro pokladnu
2. Placeholders (`cashbook_entry_amount`, `cashbook_balance`, `date`, ...)
3. `loadCashbookPlaceholders()` funkce
4. UI templates
5. Role-based permissions

**Časový odhad:** 3-4h

**Poznámka:**
- Nízká priorita - lze odložit
- Využije Generic Recipient System ✅

---

### **🔧 PRIORITA 5: Správa Uživatelů**

**Stav:** ❌ Neimplementováno (0%)

**Event Types (navrhované):**
```javascript
USER_CREATED                    // Nový uživatel vytvořen
USER_UPDATED                    // Uživatel upraven
USER_DEACTIVATED                // Uživatel deaktivován
USER_ROLE_CHANGED               // Role změněna
USER_PASSWORD_RESET             // Heslo resetováno
USER_LOGIN_FAILED               // Neúspěšné přihlášení (security)
```

**Recipient Types:**
- `TRIGGER_USER` - Admin, který změnu provedl
- `ENTITY_OWNER` - Daný uživatel (pokud má email)
- `ROLE` - HR tým, IT Admin
- `SPECIFIC_USER` - IT vedoucí

**Scope Filters potřebné:**
- ✅ `ALL` - Všichni HR/IT admins
- ⚠️ `NONE` - Jen konkrétní admin

**Oprávnění/Role:**
```
- IT Admin → Může spravovat všechny uživatele
- HR Manager → Může vytvářet/deaktivovat uživatele
- User → Dostane notifikaci o změně svého účtu
```

**Co implementovat:**
1. Event types pro user management
2. Placeholders (`user_name`, `user_email`, `role_changed_from`, `role_changed_to`, ...)
3. Security notifikace (failed logins, suspicious activity)
4. Audit log integrace

**Časový odhad:** 2-3h

**Poznámka:**
- Nízká priorita - mainly informační notifikace
- Security alerts můžou být urgentní

---

## 📋 SHRNUTÍ IMPLEMENTACE

### **Fáze 1: Generic System (7-10h)** 🚀
**Cíl:** Fungující univerzální notifikační systém

**Deliverables:**
- ✅ DB Migration (`recipient_type`, `scope_filter`)
- ✅ Backend functions (`resolveRecipients`, `applyScopeFilter`, ...)
- ✅ Integration do `notificationRouter()`
- ✅ FIX prázdných placeholderů
- ✅ Testing na objednávkách V2

**Po dokončení:** Objednávky V2 fungují 100% ✅

---

### **Fáze 2: Faktury (3-4h)** 📄
**Cíl:** Notifikace pro fakturační workflow

**Deliverables:**
- Event types pro faktury
- `loadInvoicePlaceholders()`
- UI templates
- Testing

**Využije:** Generic Recipient System ✅

---

### **Fáze 3: TODO Rozšíření (2-3h)** ⏰
**Cíl:** Team/Manager notifikace pro TODO

**Deliverables:**
- Integrace do org-hierarchy (optional)
- Team-based notifications
- Eskalace prošlých úkolů

**Využije:** Generic Recipient System ✅

---

### **Fáze 4: Pokladna (3-4h)** 💰
**Cíl:** Notifikace pro pokladní operace

**Deliverables:**
- Event types
- Placeholders
- Templates

**Využije:** Generic Recipient System ✅

---

### **Fáze 5: User Management (2-3h)** 👥
**Cíl:** Informační & security notifikace

**Deliverables:**
- Event types
- Security alerts
- Audit log

**Využije:** Generic Recipient System ✅

---

## 🎯 ČASOVÝ PLÁN

| Fáze | Modul | Čas | Kumulativně |
|------|-------|-----|-------------|
| **1** | **Generic System + Objednávky V2** | **7-10h** | **7-10h** ✅ |
| 2 | Faktury | 3-4h | 10-14h |
| 3 | TODO Rozšíření | 2-3h | 12-17h |
| 4 | Pokladna | 3-4h | 15-21h |
| 5 | User Management | 2-3h | 17-24h |

**CELKEM:** ~17-24 hodin práce (rozloženo do 3-4 dnů)

---

## 🚀 DOPORUČENÍ

**START NOW:**
1. **Fáze 1 (Generic System)** - 7-10h
   - Toto je kritické
   - Odblokuje všechny ostatní moduly
   - Po dokončení máme fungující objednávky V2 ✅

**THEN:**
2. **Fáze 2 (Faktury)** - 3-4h
   - Vysoká priorita pro business
   - Rychle implementovatelné (využije Generic system)

**LATER:**
3. Fáze 3-5 podle potřeby
   - TODO, Pokladna, User Management
   - Nižší priorita
   - Lze dělat postupně

---

## ✅ AKČNÍ PLÁN

**Dnes (17.12.2025):**
- [ ] Start Fáze 1 - Generic Recipient System
- [ ] DB Migration (30 min)
- [ ] Backend Helper Functions (1.5h)
- [ ] Backend Integration (2h)

**Zítra (18.12.2025):**
- [ ] Frontend UI (2-3h)
- [ ] Testing & Fixes (1-2h)
- [ ] ✅ DONE: Objednávky V2 fungují 100%

**Následující týden:**
- [ ] Fáze 2: Faktury (3-4h)
- [ ] Testování v produkci

---

**RH / 17.12.2025 - Scope aplikace & Implementační priority**

---

## E) UI REFACTOR - NODE vs EDGE Panels

### 🎨 SOUČASNÝ PROBLÉM

**Jeden DetailPanel pro všechno:**
```javascript
<DetailPanel>
  {selectedNode && (
    // NODE config - Template, User, Role, Group
    // + Notifikační nastavení pro template node
    // + Role permissions
    // + User info
  )}
  
  {selectedEdge && (
    // EDGE config - Relationship type, Scope, Filters
    // + Notifikační recipient role
    // + Email/InApp toggle
    // + Extended locations/departments
  )}
</DetailPanel>
```

**Problémy:**
1. ❌ **Zmatenost** - Nevíš, co patří k NODE a co k EDGE
2. ❌ **Duplicity** - Notifikační nastavení na obou místech
3. ❌ **Špatná vazba** - Není jasné, co ovlivňuje co
4. ❌ **Těžká údržba** - 2000+ řádků kódu v jednom komponentu

---

### 💡 NAVRHOVANÉ ŘEŠENÍ

#### **Koncept: Separace odpovědností**

```
┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATIONAL HIERARCHY              │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         ┌──────▼──────┐        ┌──────▼──────┐
         │   NODES     │        │   EDGES     │
         │  (Kdo/Co)   │        │  (Jak/Kdy)  │
         └─────────────┘        └─────────────┘
```

---

### 🔷 NODE PANEL - "KDO/CO"

**Odpovědnost:** Definuje **ENTITU** (kdo, co, jaká role)

**Typy nodes:**
1. **Template Node** - Notifikační šablona
2. **User Node** - Konkrétní uživatel
3. **Role Node** - Role (schvalovatelé, účetní, ...)
4. **Group Node** - Skupina uživatelů
5. **Generic Recipient Node** - Dynamický příjemce (TRIGGER_USER, ENTITY_AUTHOR, ...)

---

#### **Template Node Config:**

```javascript
<NodePanel type="template">
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 1: ZÁKLADNÍ INFO                          */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Základní informace">
    <Field label="Název šablony" value={template.name} readOnly />
    <Field label="Kategorie" value={template.kategorie} readOnly />
    <Field label="Typ události" value={template.event_type} readOnly />
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 2: TEMPLATE VARIANTY                      */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Template varianty">
    <Info>
      Šablona má různé HTML varianty podle typu příjemce.
      Tyto varianty se přiřazují na EDGE (vztah).
    </Info>
    
    <VariantPreview>
      <VariantCard color="red">
        🔴 Urgentní varianta (urgentVariant)
        <PreviewButton>Náhled HTML</PreviewButton>
      </VariantCard>
      
      <VariantCard color="orange">
        🟠 Normální varianta (normalVariant)
        <PreviewButton>Náhled HTML</PreviewButton>
      </VariantCard>
      
      <VariantCard color="green">
        🟢 Info varianta (infoVariant)
        <PreviewButton>Náhled HTML</PreviewButton>
      </VariantCard>
    </VariantPreview>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 3: EVENT TYPES (které události spustí)   */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Události (triggers)">
    <MultiSelect
      label="Jaké události spustí tuto šablonu?"
      value={template.eventTypes}
      options={allEventTypes}
      placeholder="Vyberte události..."
    />
    
    <Info>
      Když nastane jedna z vybraných událostí, 
      tato šablona se použije pro vytvoření notifikací.
    </Info>
  </Section>
</NodePanel>
```

**Co Template Node NEOBSAHUJE:**
- ❌ Recipient role (EXCEPTIONAL/APPROVAL/INFO) → TO JE NA EDGE!
- ❌ Email/InApp toggle → TO JE NA EDGE!
- ❌ Filters (onlyOrderParticipants, onlyOrderLocation) → TO JE NA EDGE!

---

#### **User Node Config:**

```javascript
<NodePanel type="user">
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 1: ZÁKLADNÍ INFO                          */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Základní informace">
    <Field label="Jméno" value={user.name} readOnly />
    <Field label="Email" value={user.email} readOnly />
    <Field label="Pozice" value={user.position} readOnly />
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 2: LOKALITY & ÚSEKY                       */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Přiřazení">
    <Field label="Lokalita" value={user.lokalita_name} readOnly />
    <Field label="Úsek" value={user.usek_name} readOnly />
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 3: ROLE                                   */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Role">
    <RoleList>
      {user.roles.map(role => (
        <RoleTag key={role.id}>{role.name}</RoleTag>
      ))}
    </RoleList>
  </Section>
</NodePanel>
```

**Co User Node NEOBSAHUJE:**
- ❌ Relationship type (prime, zastupovani, ...) → TO JE NA EDGE!
- ❌ Scope (OWN, TEAM, LOCATION) → TO JE NA EDGE!
- ❌ Notifikační nastavení → TO JE NA EDGE!

---

#### **Role Node Config:**

```javascript
<NodePanel type="role">
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 1: ZÁKLADNÍ INFO                          */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Základní informace">
    <Field label="Název role" value={role.name} readOnly />
    <Field label="Popis" value={role.description} readOnly />
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 2: UŽIVATELÉ S TOUTO ROLÍ                 */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Uživatelé s touto rolí">
    <UserList>
      {usersWithRole.map(user => (
        <UserCard key={user.id} onClick={() => selectUser(user)}>
          👤 {user.name}
          <span>{user.position}</span>
        </UserCard>
      ))}
    </UserList>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 3: OPRÁVNĚNÍ MODULŮ                       */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Oprávnění modulů">
    <PermissionList>
      <Permission enabled={role.permissions.orders}>
        📦 Objednávky {role.permissions.orders ? '✅' : '❌'}
      </Permission>
      <Permission enabled={role.permissions.invoices}>
        📄 Faktury {role.permissions.invoices ? '✅' : '❌'}
      </Permission>
      <Permission enabled={role.permissions.cashbook}>
        💰 Pokladna {role.permissions.cashbook ? '✅' : '❌'}
      </Permission>
    </PermissionList>
  </Section>
</NodePanel>
```

---

#### **Generic Recipient Node Config (NOVÝ):**

```javascript
<NodePanel type="genericRecipient">
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 1: TYP PŘÍJEMCE                           */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Typ příjemce">
    <Select
      label="Vyberte typ"
      value={genericType}
      onChange={setGenericType}
    >
      <optgroup label="Dynamické (Generic)">
        <option value="TRIGGER_USER">🎯 Trigger User (kdo to vyvolal)</option>
        <option value="ENTITY_AUTHOR">✍️ Entity Author (autor/tvůrce)</option>
        <option value="ENTITY_OWNER">👤 Entity Owner (garant/příkazce)</option>
      </optgroup>
    </Select>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 2: POPIS                                  */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Co to znamená?">
    <Info>
      {genericType === 'TRIGGER_USER' && (
        <>
          <strong>🎯 Trigger User</strong><br/>
          Notifikaci dostane uživatel, který akci provedl.
          Např. pokud Robert odešle objednávku ke schválení,
          dostane info notifikaci "Tvoje objednávka byla odeslána".
        </>
      )}
      
      {genericType === 'ENTITY_AUTHOR' && (
        <>
          <strong>✍️ Entity Author</strong><br/>
          Notifikaci dostane autor entity (objednávky, faktury, ...).
          Např. pokud je Robert autor objednávky, dostane notifikaci
          o všech změnách stavu.
        </>
      )}
      
      {genericType === 'ENTITY_OWNER' && (
        <>
          <strong>👤 Entity Owner</strong><br/>
          Notifikaci dostane vlastník/odpovědný za entitu
          (garant, příkazce, ...). Např. pokud je Jan příkazce
          objednávky, dostane notifikaci ke schválení.
        </>
      )}
    </Info>
  </Section>
</NodePanel>
```

**Co Generic Recipient Node NEOBSAHUJE:**
- ❌ Scope filter → TO JE NA EDGE!
- ❌ Recipient role → TO JE NA EDGE!

---

### 🔶 EDGE PANEL - "JAK/KDY"

**Odpovědnost:** Definuje **VZTAH** mezi nodes (jak, kdy, za jakých podmínek)

**Co Edge určuje:**
1. Recipient Type (z target node)
2. Recipient Role (EXCEPTIONAL/APPROVAL/INFO)
3. Scope Filter (ENTITY_PARTICIPANTS, LOCATION, DEPARTMENT, ALL)
4. Notifikační kanály (Email, InApp)
5. Extended Locations/Departments (pro rozšíření)

---

#### **Edge Config (REFACTORED):**

```javascript
<EdgePanel>
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 1: VZTAH (kdo → komu)                     */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Vztah">
    <RelationshipInfo>
      <NodePreview>{sourceNode.data.label}</NodePreview>
      →
      <NodePreview>{targetNode.data.label}</NodePreview>
    </RelationshipInfo>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 2: TYP PŘÍJEMCE (z target node)           */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Typ příjemce">
    <ReadOnlyField>
      {targetNode.type === 'user' && '👤 Konkrétní uživatel'}
      {targetNode.type === 'role' && '👥 Role'}
      {targetNode.type === 'group' && '🏢 Skupina'}
      {targetNode.type === 'genericRecipient' && (
        targetNode.data.genericType === 'TRIGGER_USER' ? '🎯 Trigger User' :
        targetNode.data.genericType === 'ENTITY_AUTHOR' ? '✍️ Entity Author' :
        '👤 Entity Owner'
      )}
    </ReadOnlyField>
    
    <Info>
      ℹ️ Typ příjemce je určen cílovým node (→).
      Zde nastavuješ JEN jak se má s příjemci pracovat.
    </Info>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 3: SCOPE FILTER ⭐ KLÍČOVÁ SEKCE          */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Scope filtr" highlight>
    <Select
      label="Jak filtrovat příjemce?"
      value={scopeFilter}
      onChange={setScopeFilter}
    >
      <option value="NONE">Bez filtru</option>
      <option value="ALL">Všichni daného typu</option>
      <option value="LOCATION">Jen z lokality entity</option>
      <option value="DEPARTMENT">Jen z úseku entity</option>
      <option value="ENTITY_PARTICIPANTS">⭐ Jen účastníci TÉTO entity</option>
    </Select>
    
    <ScopeExplanation>
      {scopeFilter === 'ENTITY_PARTICIPANTS' && (
        <Alert type="success">
          ✅ <strong>Doporučeno pro většinu případů!</strong><br/>
          Notifikaci dostane JEN ten konkrétní uživatel, který je
          účastníkem TÉTO objednávky/faktury/...<br/><br/>
          <strong>Příklad:</strong><br/>
          Pokud je cíl "Entity Owner" (příkazce) a filtr je 
          "ENTITY_PARTICIPANTS", notifikaci dostane JEN příkazce
          TÉTO konkrétní objednávky (např. Jan), ne všichni
          příkazci v systému.
        </Alert>
      )}
      
      {scopeFilter === 'ALL' && (
        <Alert type="warning">
          ⚠️ <strong>Všichni uživatelé daného typu!</strong><br/>
          Notifikaci dostanou VŠICHNI uživatelé odpovídající
          cílovému node (např. všichni schvalovatelé, všichni účetní).<br/><br/>
          <strong>Použití:</strong> Broadcast notifikace, uzávěrky, ...
        </Alert>
      )}
      
      {scopeFilter === 'LOCATION' && (
        <Alert type="info">
          🏢 <strong>Filtr podle lokality</strong><br/>
          Notifikaci dostanou jen uživatelé z LOKALITY entity.<br/><br/>
          <strong>Příklad:</strong><br/>
          Objednávka je z lokality IT → notifikaci dostanou
          jen schvalovatelé z lokality IT.
        </Alert>
      )}
    </ScopeExplanation>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 4: RECIPIENT ROLE (priorita notifikace)  */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Priorita notifikace">
    <Select
      label="Jaký typ notifikace?"
      value={recipientRole}
      onChange={setRecipientRole}
    >
      <option value="EXCEPTIONAL">🔴 Mimořádná událost (kritické schválení)</option>
      <option value="APPROVAL">🟠 Důležitá notifikace (karta u příjemce)</option>
      <option value="INFO">🟢 Informační oznámení (jen pro vědomí)</option>
    </Select>
    
    <Info>
      💡 <strong>Důležité:</strong> Typ notifikace určuje barvu/prioritu
      ve zvonečku, NE workflow tlačítko.<br/>
      • EXCEPTIONAL = příkazce/registr musí schválit<br/>
      • APPROVAL = důležitá notifikace (karta je u příjemce)<br/>
      • INFO = jen pro vědomí (FYI)
    </Info>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 5: NOTIFIKAČNÍ KANÁLY                     */}
  {/* ═══════════════════════════════════════════════ */}
  <Section title="Notifikační kanály">
    <Checkbox
      label="📧 Poslat i email"
      checked={sendEmail}
      onChange={setSendEmail}
    />
    
    <Checkbox
      label="🔔 In-App notifikace (zvoneček)"
      checked={sendInApp}
      onChange={setSendInApp}
    />
    
    <Info>
      ℹ️ Finální rozhodnutí respektuje i user preferences.
      Pokud má user vypnuté emaily, nedostane email i když
      je zde zaškrtnuto.
    </Info>
  </Section>
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 6: RELATIONSHIP TYPE (jen pro user→user)  */}
  {/* ═══════════════════════════════════════════════ */}
  {isUserToUserRelation && (
    <Section title="Druh vztahu">
      <Select
        label="Jaký druh vztahu?"
        value={relationshipType}
        onChange={setRelationshipType}
      >
        <option value="prime">Primární (přímý)</option>
        <option value="zastupovani">Zastupování</option>
        <option value="delegovani">Delegování</option>
        <option value="rozsirene">Rozšířené</option>
      </Select>
    </Section>
  )}
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 7: RELATIONSHIP SCOPE (jen pro user→user) */}
  {/* ═══════════════════════════════════════════════ */}
  {isUserToUserRelation && (
    <Section title="Rozsah oprávnění">
      <Select
        label="Jaký rozsah?"
        value={relationshipScope}
        onChange={setRelationshipScope}
      >
        <option value="OWN">Vlastní objednávky</option>
        <option value="TEAM">Objednávky týmu</option>
        <option value="LOCATION">Objednávky lokality</option>
        <option value="ALL">Všechny objednávky</option>
      </Select>
      
      <Info>
        ℹ️ Vztah funguje jen pokud má uživatel globální právo
        (např. ORDER_EDIT_OWN).
      </Info>
    </Section>
  )}
  
  {/* ═══════════════════════════════════════════════ */}
  {/* SEKCE 8: EXTENDED LOCATIONS/DEPARTMENTS         */}
  {/* ═══════════════════════════════════════════════ */}
  {showExtended && (
    <>
      <Section title="Rozšířené lokality">
        <MultiSelect
          value={extendedLocations}
          onChange={setExtendedLocations}
          options={allLocations}
          placeholder="Vyberte lokality..."
        />
      </Section>
      
      <Section title="Rozšířené úseky">
        <MultiSelect
          value={extendedDepartments}
          onChange={setExtendedDepartments}
          options={allDepartments}
          placeholder="Vyberte úseky..."
        />
      </Section>
    </>
  )}
</EdgePanel>
```

---

### 🔗 VAZBY NODE ↔ EDGE

#### **Matice odpovědností:**

| Co určuješ | NODE | EDGE |
|------------|------|------|
| **KDO** je příjemce (user/role/group) | ✅ | ❌ |
| **TYP** příjemce (TRIGGER_USER/ENTITY_AUTHOR/...) | ✅ (Generic node) | ❌ |
| **JAK** filtrovat (ENTITY_PARTICIPANTS/LOCATION/...) | ❌ | ✅ |
| **PRIORITA** notifikace (EXCEPTIONAL/APPROVAL/INFO) | ❌ | ✅ |
| **KANÁLY** (Email/InApp) | ❌ | ✅ |
| **RELATIONSHIP** type (prime/zastupovani/...) | ❌ | ✅ |
| **SCOPE** (OWN/TEAM/LOCATION/ALL) | ❌ | ✅ |
| **TEMPLATE** varianty (HTML) | ✅ | ❌ |
| **EVENT** types (kdy spustit) | ✅ (Template node) | ❌ |

---

### 📦 IMPLEMENTAČNÍ PLÁN - UI Refactor

#### **Fáze 1: Vytvoř separátní komponenty (2-3h)**

**Soubory:**
```
/apps/eeo-v2/client/src/components/OrganizationHierarchy/
  ├── NodePanels/
  │   ├── TemplateNodePanel.jsx      (Template config)
  │   ├── UserNodePanel.jsx          (User info)
  │   ├── RoleNodePanel.jsx          (Role + permissions)
  │   ├── GroupNodePanel.jsx         (Group members)
  │   └── GenericRecipientNodePanel.jsx  (Generic type selector)
  │
  └── EdgePanels/
      ├── EdgePanel.jsx              (Main edge config)
      ├── ScopeFilterSection.jsx     (Scope filter + explanation)
      ├── RecipientRoleSection.jsx   (Priority selector)
      └── RelationshipSection.jsx    (Relationship type/scope)
```

**Struktura komponentu:**
```javascript
// TemplateNodePanel.jsx
export const TemplateNodePanel = ({ node, onUpdate }) => {
  return (
    <PanelContainer>
      <BasicInfoSection node={node} />
      <TemplateVariantsSection node={node} />
      <EventTypesSection node={node} onUpdate={onUpdate} />
    </PanelContainer>
  );
};

// EdgePanel.jsx
export const EdgePanel = ({ edge, sourceNode, targetNode, onUpdate }) => {
  return (
    <PanelContainer>
      <RelationshipInfo source={sourceNode} target={targetNode} />
      <RecipientTypeSection targetNode={targetNode} />
      <ScopeFilterSection 
        value={edge.scopeFilter} 
        onChange={(val) => onUpdate({ scopeFilter: val })}
      />
      <RecipientRoleSection 
        value={edge.recipientRole}
        onChange={(val) => onUpdate({ recipientRole: val })}
      />
      <NotificationChannelsSection edge={edge} onUpdate={onUpdate} />
      {isUserToUser && (
        <RelationshipSection edge={edge} onUpdate={onUpdate} />
      )}
    </PanelContainer>
  );
};
```

---

#### **Fáze 2: Refactor hlavního DetailPanel (1-2h)**

**OrganizationHierarchy.js:**
```javascript
// PŘED:
{showDetailPanel && (selectedNode || selectedEdge) && (
  <DetailPanel>
    {/* 2000+ řádků mixu NODE + EDGE configu */}
  </DetailPanel>
)}

// PO:
{showDetailPanel && selectedNode && (
  <DetailPanel>
    <DetailHeader title="Detail uzlu" />
    {selectedNode.type === 'template' && (
      <TemplateNodePanel node={selectedNode} onUpdate={updateNode} />
    )}
    {selectedNode.type === 'user' && (
      <UserNodePanel node={selectedNode} onUpdate={updateNode} />
    )}
    {selectedNode.type === 'role' && (
      <RoleNodePanel node={selectedNode} onUpdate={updateNode} />
    )}
    {selectedNode.type === 'genericRecipient' && (
      <GenericRecipientNodePanel node={selectedNode} onUpdate={updateNode} />
    )}
  </DetailPanel>
)}

{showDetailPanel && selectedEdge && (
  <DetailPanel>
    <DetailHeader title="Detail vztahu" />
    <EdgePanel 
      edge={selectedEdge}
      sourceNode={getNodeById(selectedEdge.source)}
      targetNode={getNodeById(selectedEdge.target)}
      onUpdate={updateEdge}
    />
  </DetailPanel>
)}
```

---

#### **Fáze 3: Testing & Polish (1h)**

**Test cases:**
1. ✅ Vyber template node → zobrazí se TemplateNodePanel
2. ✅ Vyber edge → zobrazí se EdgePanel
3. ✅ Změň scope filter → uloží se do edge
4. ✅ Změň recipient role → uloží se do edge
5. ✅ Save → data se správně uloží do DB

---

### ✅ VÝHODY REFACTORU

1. **Jasnost** - Víš přesně, co patří kam
2. **Údržba** - Každý panel je samostatný komponent (200-300 řádků)
3. **Testování** - Můžeš testovat každý panel zvlášť
4. **Rozšiřitelnost** - Přidání nového typu node = nový panel
5. **Performance** - Renderuje se jen aktivní panel
6. **UX** - Uživatel ví, co nastavuje a kde

---

### 📊 ČASOVÝ ODHAD

| Fáze | Úkon | Čas |
|------|------|-----|
| 1 | Vytvoř separátní komponenty | 2-3h |
| 2 | Refactor hlavního DetailPanel | 1-2h |
| 3 | Testing & Polish | 1h |
| **CELKEM** | | **4-6h** |

---

### 🎯 DOPORUČENÍ

**POŘADÍ:**
1. **První:** Generic Recipient System (Backend) - 7-10h
2. **Druhé:** UI Refactor (Frontend) - 4-6h
3. **Třetí:** Faktury modul - 3-4h

**Proč v tomto pořadí:**
- Backend Generic System odblokuje vše ostatní
- UI Refactor zjednoduší práci s Generic Recipient Nodes
- Faktury pak budou rychle implementovatelné

---

**RH / 17.12.2025 - UI Refactor NODE vs EDGE Panels**

---

**RH / 17.12.2025 - Scope aplikace & Implementační priority**

---

**RH / 17.12.2025 - Implementační plán Generic Recipient System**

---

**RH / 17.12.2025 - Generic Recipient System Design**

---

**RH / 17.12.2025 - Analýza priorit a oprávnění**
