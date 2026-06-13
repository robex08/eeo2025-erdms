# 📋 SYSTÉM ZASTUPOVÁNÍ – Kompletní briefing pro vývoj

> **Projekt:** ERDMS / EEO v2  
> **Větev:** `feature/v3-development`  
> **Aktualizováno:** 13. 6. 2026  
> **Stav:** Plná integrace do dashboardu, notifikací a UI systému ✅

---

## 🆕 AKTUALIZACE 06/2026 – Co bylo nově dokončeno

### 1. Admin audit log zastupování v UI (SubstitutionTab)
- Přidán přepínač v Přehledu systému: „Přehled zastupování“ / „Auditní log“.
- Audit log je dostupný pouze pro role SUPERADMIN/ADMINISTRATOR.
- Přidána stránkovaná tabulka audit logu včetně pagination ve stylu Order list V3.
- Nový FE endpoint wrapper: `fetchSubstitutionAuditLog()`.
- Nový BE endpoint: `substitution/audit-log` (router + handler + queries).

### 2. Polidštění audit logu
- Akce v auditu jsou mapovány na čitelné české názvy.
- Identifikátor objektu je „lidský“:
  - objednávka → evidenční číslo,
  - faktura → variabilní symbol.
- Popisy akcí se vrací česky a se jmény místo technických ID.

### 3. PDF „Záznam o předběžné řídící kontrole“
- V řádku „Schvalovatel“ se při zastoupení zobrazuje text ve formátu:
  - „{zástupce} v zastoupení za {zastupovaného}“.
- Přenos substitučních dat byl dotažen přes `OrderForm25` → `FinancialControlConfirmationModal` → `FinancialControlPDF`.

### 4. Stabilita záložky Profilu „Zastupování“ po F5
- Opraven race condition při reloadu profilu.
- Persistovaná záložka `substitution` se nepřepisuje na `info` před dokončením async načtení práv.
- Přidán guard `substitutionAccessLoaded`.

### 5. Faktury – věcná správnost a zastupování
- Upozornění ve formuláři VS nyní rozlišuje běžný případ vs. potvrzení v aktivním zastoupení.
- Při potvrzení zástupcem má upozornění oranžový (méně agresivní) styl.
- Oprávnění VS bylo rozšířeno: aktivní zastoupení má přednost před omezením „stejný úsek“.
- Potvrzení/zamítnutí VS faktury v zastoupení se nyní zapisuje do `25_zastupovani_akce_log`.
- Do seznamu faktur byl doplněn `SubstitutionBadge` (SmartTooltip) i v master řádku ve sloupci „Věcnou provedl“.
- Pro historická data bez audit záznamu je přidán fallback detekce zastoupení podle aktivního zástupu v čase akce.

---

## 🗺️ PŘEHLED ARCHITEKTURY

```
ProfilePage.js
  └─ SubstitutionTab.js (React komponenta – správa zastupování)
       └─ services/apiSubstitution.js (HTTP volání)
            └─ api.eeo/api.php (router)
                 └─ hierarchyHandlers.php (business logika)
                      ├─ queries.php (SQL)
                      └─ DB: 25_uzivatele_zastupovani
                              25_zastupovani_akce_log

DashboardPage.js
  ├─ WelcomeWidget (vizuální indikátory zastupování – ikony + tooltips)
  │   └─ data: substituting (koho zastupuji) + mySubstitutions (kdo mě zastupuje)
  └─ NotificationsWidget (standardizovaný formát notifikací)
       └─ dashboardHandlers.php → from_user_name z DB

NotifikaceDashboardPage.js, App.js, modály
  └─ Konzistentní zobrazení odesílatele bez hardcoded fallbacků
```

---

## � INTEGRACE DO UI SYSTÉMU (Implementováno 14. 4. 2026)

### 1. Dashboard – Ikony zastupování ve WelcomeWidget

**Umístění:** [DashboardPage.js](../client/src/pages/DashboardPage.js) – funkce `WelcomeWidget`

**Funkce:** Vizuální indikace stavu zastupování přímo vedle jména uživatele

#### Příklad zobrazení

```
┌─────────────────────────────────────────────────────┐
│  Dobrý den, Jan Novák 👥🟣 👥🔵                     │  ← Obě ikony
│  Administrátor — Ekonomické oddělení                │
│                                                     │
│  Svátek má: Ida                                     │
└─────────────────────────────────────────────────────┘

🟣 = Zastupuji někoho (fialová #a855f7)
🔵 = Někdo mě zastupuje (tyrkysová #0891b2)
```

#### Duální ikona systém
```
🟣 Fialová ikona (faUserFriends) – Když ZASTUPUJI někoho jiného
    Tooltip formát:
    ┌─────────────────────────────────────┐
    │ Zastupuji: Jan Novák                │
    │ Od: 12.04.2026 Do: 15.04.2026       │
    │ Email: jan.novak@example.cz         │
    │ Telefon: +420 123 456 789           │
    └─────────────────────────────────────┘

🔵 Tyrkysová ikona (faUserFriends) – Když MĚ někdo zastupuje
    Tooltip formát:
    ┌─────────────────────────────────────┐
    │ Zástupce: Petr Svoboda              │
    │ Od: 12.04.2026 Do: 15.04.2026       │
    │ Email: petr.svoboda@example.cz      │
    │ Telefon: +420 987 654 321           │
    └─────────────────────────────────────┘
```

**Obě ikony mohou být zobrazeny současně** (uživatel může současně zastupovat i být zastupován)

#### Implementační detaily
```javascript
// Props komponenty:
function WelcomeWidget({ 
  user, rolesDetected, nameday, newsSinceLogin, myStats, 
  navigate, substituting, mySubstitutions 
})

// Detekce aktivního zastupování:
const todayStr = new Date().toISOString().split('T')[0];
const activeSubstitutions = (substituting || []).filter(s => 
  s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
);
const activeBeingSubstituted = (mySubstitutions || []).filter(s => 
  s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
);

// Tooltip helper:
const formatCzDate = (isoDateStr) => {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('T')[0].split('-');
  return `${d}.${m}.${y}`;
};

// Display:
<FontAwesomeIcon 
  icon={faUserFriends} 
  title={substitutionTooltip}
  style={{ marginLeft: '0.5rem', color: '#a855f7', cursor: 'help' }}  // fialová
/>
<FontAwesomeIcon 
  icon={faUserFriends} 
  title={beingSubstitutedTooltip}
  style={{ marginLeft: '0.5rem', color: '#0891b2', cursor: 'help' }}  // tyrkysová
/>
```

---

### 2. Role Display – Inteligentní zobrazení rolí

**Problém:** Uživatelé bez capability-based oprávnění (admin, příkazce, atd.) měli pouze `pozice` a chyběly jim skutečné role z DB.

**Řešení:** Prioritní logika zobrazení rolí

```javascript
const roleLabels = [];
if (rolesDetected?.is_admin) roleLabels.push('Administrátor');
if (rolesDetected?.has_order_approve) roleLabels.push('Příkazce');
if (rolesDetected?.has_spending) roleLabels.push('Správce rozpočtu');
if (rolesDetected?.has_invoice_manage) roleLabels.push('Účetní');

// ✅ NOVĚ: Pokud žádné capability role → zobraz skutečné DB role
let userRolesDisplay = null;
if (roleLabels.length === 0 && user?.roles && Array.isArray(user.roles)) {
  userRolesDisplay = user.roles.map(r => r.nazev_role).join(' · ');
}

// Display priorita:
{roleLabels.length > 0 
  ? roleLabels.join(' · ')               // 1. Capability role
  : (userRolesDisplay || user?.pozice || 'Uživatel')  // 2. DB role → 3. Pozice → 4. Fallback
}
```

**Příklad:**
- Admin: "Administrátor — Ekonomické oddělení"
- Robert Holovský (bez special permissions): "THP · PES — Záchranář"

---

### 3. Notifikace – Standardizace formátu "Row 3"

**Problém:** Různé typy notifikací měly nekonzistentní zobrazení odesílatele a času.

**Požadavek uživatele:** _"ja chci po tobe jen jedno, at je vzdy styl a struktura tech zprav stejna"_

#### Standardní formát Row 3 (všechny typy notifikací)
```
┌────────────────────────────────────┐
│ Row 1: Nadpis notifikace (bold)   │
│ Row 2: Popis / zpráva              │
│ Row 3: Od: Jméno • dd.mm.rrrr hh:mm│  ← STANDARDIZOVÁNO ✅
└────────────────────────────────────┘
```

#### Implementace v DashboardPage.js

**Pro všechny typy: MSG, ZASTUP, KOM:**
```jsx
<div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
  {details.sender && `Od: ${details.sender} • `}{details.timeFormatted}
</div>
```

**ADMIN_MESSAGE (MSG):**
```javascript
const sender = (() => {
  try {
    const ph = typeof n.placeholder_data === 'string' 
      ? JSON.parse(n.placeholder_data) 
      : (n.placeholder_data || {});
    return ph.sender_name || placeholders.sender_name || n.from_user_name || null;
  } catch (e) {
    return placeholders.sender_name || n.from_user_name || null;
  }
})();
// ✅ ŽÁDNÝ FALLBACK NA 'Administrátor' – pouze null pokud není známo
```

**KOMENTÁŘE (KOM):**
```javascript
const komCreatedDate = n.dt_created || n.vytvoren_kdy;
const komTimeFormatted = komCreatedDate ? new Date(komCreatedDate).toLocaleString('cs-CZ', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';
return {
  type: 'KOM',
  sender: authorMatch || n.from_user_name || null,
  timeFormatted: komTimeFormatted
};
```

---

### 4. Backend – from_user_name v Dashboard notifikacích

**Problém:** Dashboard zobrazoval "Administrátor" místo skutečného jména odesílatele.

**Řešení:** Přidány LEFT JOIN dotazy do `dashboardHandlers.php`

#### Funkce: `_dashboard_get_notifications_unread()`
```php
SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
       n.objekt_typ, n.objekt_id, n.dt_created, n.od_uzivatele_id,
       nr.precteno, nr.skryto,
       from_user.jmeno as from_user_jmeno, 
       from_user.prijmeni as from_user_prijmeni
FROM `25_notifikace` n
INNER JOIN `25_notifikace_precteni` nr ON n.id = nr.notifikace_id
LEFT JOIN `25_uzivatele` from_user ON n.od_uzivatele_id = from_user.id
WHERE ...

// Mapování:
if ($notif['from_user_jmeno']) {
    $notif['from_user_name'] = trim($notif['from_user_jmeno'] . ' ' . ($notif['from_user_prijmeni'] ?? ''));
}
```

#### Funkce: `_dashboard_get_notifications_recent()`
Identická LEFT JOIN logika, vrací `from_user_name` v result array.

---

### 5. Frontend – Odstranění hardcoded fallbacků

**Změněné soubory:**

#### [App.js](../client/src/App.js) – Real-time notifikace
```javascript
// PŘED:
from_user_name: notification.from_user_name || placeholderData.sender_name || 'Administrátor'

// PO:
from_user_name: notification.from_user_name || placeholderData.sender_name || null
```

#### [HighPriorityNotificationModal.js](../client/src/components/HighPriorityNotificationModal.js)
```javascript
// PŘED:
const senderName = notification.from_user_name || 'Administrátor';
<Subtitle>📨 Od: <strong>{senderName}</strong></Subtitle>

// PO:
const senderName = notification.from_user_name || null;
<Subtitle>
  {senderName && <span>📨 Od: <strong>{senderName}</strong></span>}
  {notification.dt_created && (
    <span>{senderName && ' • '}{formatDateTime(notification.dt_created)}</span>
  )}
</Subtitle>
```

#### [NotificationsPage.js](../client/src/pages/NotificationsPage.js)
```javascript
// Podmíněné zobrazení badge:
{detailMode && notification.typ === 'ADMIN_MESSAGE' && notification.from_user_name && (
  <TypeBadge style={{ background: '#fef3c7', color: '#d97706' }}>
    👤 {notification.from_user_name}
  </TypeBadge>
)}
```

#### [NotificationDropdown.js](../client/src/components/NotificationDropdown.js)
Identická logika jako NotificationsPage.js

---

### 6. Souhrn změn

| Komponenta | Co bylo změněno | Dopad |
|---|---|---|
| **WelcomeWidget** | Duální ikony (fialová/tyrkysová) + tooltips | ✅ Okamžitá vizuální info o stavu zastupování |
| **WelcomeWidget** | Role display logika | ✅ Skutečné DB role pro všechny uživatele |
| **NotificationsWidget** | Standardizace Row 3 (MSG, ZASTUP, KOM) | ✅ Konzistentní formát napříč všemi typy |
| **dashboardHandlers.php** | LEFT JOIN na `25_uzivatele` | ✅ Skutečná jména odesílatelů |
| **5 FE souborů** | Odstranění 'Administrátor' fallbacků | ✅ Žádné hardcoded texty |

---

## �🗄️ DATABÁZE

### Tabulka: `25_uzivatele_zastupovani`
Hlavní tabulka zastupování.

| Sloupec | Typ | Popis |
|---|---|---|
| `id` | int UNSIGNED PK | Auto increment |
| `zastupovany_id` | int UNSIGNED FK | Uživatel, který je zastupován (→ `25_uzivatele.id`) |
| `zastupce_id` | int UNSIGNED FK | Uživatel, který zastupuje (→ `25_uzivatele.id`) |
| `dt_od` | date | Začátek zastupování |
| `dt_do` | date | Konec zastupování |
| `opravneni` | longtext JSON | JSON objekt oprávnění (viz sekce Oprávnění) |
| `popis` | varchar(500) | Volitelná poznámka (důvod: dovolená, nemoc…) |
| `vytvoril_user_id` | int UNSIGNED FK | Kdo záznam vytvořil |
| `aktivni` | tinyint(1) | 1 = aktivní (i budoucí), 0 = ručně deaktivováno |
| `dt_vytvoreni` | datetime | Datum vytvoření |
| `dt_aktualizace` | datetime NULL | Datum poslední úpravy |

### Tabulka: `25_zastupovani_akce_log`
Audit trail – loguje akce zástupce. **Klíčová tabulka pro průkaznost!**

| Sloupec | Typ | Popis |
|---|---|---|
| `id` | int PK | Auto increment |
| `zastupovani_id` | int FK | ID záznamu z `25_uzivatele_zastupovani` |
| `zastupce_id` | int FK | Zástupce, který akci provedl |
| `zastupovany_id` | int FK | Zastupovaný (čí jménem byla akce) |
| `akce_typ` | varchar(100) | Typ akce (viz konstanty níže) |
| `objekt_typ` | varchar(50) | Na co byla akce aplikována (např. `objednavka`, `faktura`) |
| `objekt_id` | int | ID objektu (ID objednávky, faktury…) |
| `popis_akce` | text NULL | Textový popis akce (lidsky čitelný) |
| `dt_akce` | datetime | Čas akce (DEFAULT: current_timestamp) |

### Konstanty tabulek (v `api.php`)
```php
define('TBL_UZIVATELE_ZASTUPOVANI', '25_uzivatele_zastupovani');
define('TBL_ZASTUPOVANI_AKCE_LOG',  '25_zastupovani_akce_log');
```

---

## 🔍 AUDIT TRAIL – ANALÝZA PRŮKAZNOSTI (12. 4. 2026)

### Klíčový požadavek
Musí být prokazatelné: **„Objednávku X schválil uživatel YYY v době, kdy zastupoval uživatele ZZZ."**
Toto musí fungovat BEZ změny tabulek objednávek, faktur a dalších dokladů.

### Jak se dnes ukládá kdo schválil

V tabulce `25a_objednavky` existují sloupce:
- `schvalil_uzivatel_id` / `schvalovatel_id` – ID přihlášeného uživatele v době schválení (= **fyzická osoba u klávesnice**, může to být zástupce!)
- `datum_schvaleni` – čas schválení
- `updated_by_uzivatel_id` – kdo naposledy měnil záznam

**Problém:** Pokud zástupce (ID 42) schválí objednávku jménem zastupovaného (ID 33), do `schvalovatel_id` se uloží **ID zástupce (42)**. Systém ale nijak neoznačí, zda 42 jednal jako zástupce 33.

### Řešení – BEZ změny tabulek objednávek/faktur ✅

Tabulka `25_zastupovani_akce_log` je k tomuto přesně určena. Propojení funguje takto:

```
objednavka.schvalovatel_id = 42  (fyzická osoba – KDO schválil)
  ↓ dotaz do audit logu
25_zastupovani_akce_log
  WHERE zastupce_id = 42
    AND objekt_typ = 'objednavka'
    AND objekt_id = 123
  → zastupovany_id = 33  (V ČÍ zastoupení jednal)
  → zastupovani_id = 7   → JOIN 25_uzivatele_zastupovani (platnost dt_od/dt_do)
```

**Auditní SQL dotaz (příklad):**
```sql
SELECT
  o.cislo_objednavky,
  o.datum_schvaleni,
  CONCAT(z_zastupce.jmeno, ' ', z_zastupce.prijmeni)  AS schvalil_fyzicky,
  CONCAT(z_zast.jmeno,    ' ', z_zast.prijmeni)        AS zastupoval_koho,
  zu.dt_od,
  zu.dt_do,
  log.popis_akce
FROM 25a_objednavky o
JOIN 25_zastupovani_akce_log log
  ON log.objekt_typ = 'objednavka' AND log.objekt_id = o.id
JOIN 25_uzivatele_zastupovani zu ON zu.id = log.zastupovani_id
JOIN 25_uzivatele z_zastupce ON z_zastupce.id = log.zastupce_id
JOIN 25_uzivatele z_zast     ON z_zast.id     = log.zastupovany_id
WHERE o.id = :objednavka_id;
```

### Konstanty typů akcí (`akce_typ`)
```
ZASTUPOVANI_VYTVORENO         – vznik záznamu zastupování
ZASTUPOVANI_ZRUSENO           – ruční deaktivace záznamu
ZASTUPOVANI_AKTUALIZOVANO     – změna dat (data, oprávnění)
SCHVALENI_OBJEDNAVKY          – zástupce schválil objednávku
ZAMITNUTI_OBJEDNAVKY          – zástupce zamítl objednávku
POTVRZENI_OBJEDNAVKY          – zástupce potvrdil objednávku
SCHVALENI_FAKTURY             – zástupce schválil fakturu
(rozšiřovat dle potřeby dalších dokladů)
```

### ⚠️ Jak BE pozná, že uživatel jedná jako zástupce

BE při každé akci (schválení apod.) zkontroluje v `25_uzivatele_zastupovani`:
```sql
SELECT id, zastupovany_id
FROM 25_uzivatele_zastupovani
WHERE zastupce_id = :token_user_id
  AND aktivni = 1
  AND dt_od <= CURDATE()
  AND dt_do >= CURDATE()
LIMIT 1
```
Pokud záznam existuje → zapsat do `log_zastupovani_akce()`.  
Pokud ne → uživatel nejedná jako zástupce, logovat není třeba.

> **Alternativa:** FE explicitně předá `zastupuji_za_id` v requestu (čistší, méně DB dotazů). Rozhodnutí odloženo na dobu implementace audit logu v BE.

---

## 📡 API ENDPOINTY

Všechny endpointy jsou `POST`, autentizace přes `token` + `username` v body.

### Základní endpointy (pro běžného uživatele)

| Endpoint | Handler | Popis | Kdo může |
|---|---|---|---|
| `substitution/list` | `handle_substitution_list()` | Moje zastupování (jako zastupovaný) | user s `USER_SUBSTITUTE_SET` |
| `substitution/create` | `handle_substitution_create()` | Vytvoří nové zastupování | user s `USER_SUBSTITUTE_SET` nebo admin |
| `substitution/update` | `handle_substitution_update()` | Aktualizuje existující zastupování | owner nebo admin |
| `substitution/deactivate` | `handle_substitution_deactivate()` | Deaktivuje (zruší) zastupování | owner nebo admin |
| `substitution/current` | `handle_substitution_current()` | Kdo mě nyní zastupuje | autentizovaný user |
| `substitution/candidates` | `handle_substitution_candidates()` | Seznam možných zástupců | autentizovaný user |

### Admin endpointy

| Endpoint | Handler | Popis | Kdo může |
|---|---|---|---|
| `substitution/admin-list` | `handle_substitution_admin_list()` | Všechna zastupování v systému | ADMIN / SUPERADMIN |
| `substitution/manageable-users` | `handle_substitution_manageable_users()` | Uživatelé, za které admin může nastavit zastupování | ADMIN |

### Příklady request body

```json
// substitution/create (běžný uživatel)
{
  "token": "...",
  "username": "jnovak",
  "zastupce_id": 42,
  "dt_od": "2026-04-15",
  "dt_do": "2026-04-22",
  "opravneni": { "view": 1, "approve": 0, "confirm": 0, "notify_zastupce": 1 },
  "popis": "Dovolená"
}

// substitution/create (admin override – nastaví za jiného uživatele)
{
  "token": "...",
  "username": "admin",
  "zastupovany_id": 55,
  "zastupce_id": 42,
  "dt_od": "2026-04-15",
  "dt_do": "2026-04-22",
  "opravneni": { "view": 1, "approve": 1 },
  "popis": "Admin nastavil"
}

// substitution/deactivate
{
  "token": "...",
  "username": "jnovak",
  "id": 7
}
```

### Response formát (úspěch)
```json
{
  "status": "ok",
  "message": "Zastupování bylo úspěšně nastaveno",
  "data": {
    "id": 7,
    "zastupovany_id": 33,
    "zastupce_id": 42,
    "dt_od": "2026-04-15",
    "dt_do": "2026-04-22",
    "opravneni": { "view": 1 },
    "popis": "Dovolená"
  }
}
```

---

## 🔐 SYSTÉM OPRÁVNĚNÍ

### DB práva (v tabulce `25_prava` / `25_role_prava`)

| Kód práva | Popis |
|---|---|
| `USER_SUBSTITUTE_SET` | Uživatel může nastavit vlastního zástupce |
| `USER_SUBSTITUTE` | Uživatel může být zástupcem (v candidates) |

### Klíče v JSON poli `opravneni`

```json
{
  "view":            1,  // Může prohlížet doklady zastupovaného
  "approve":         0,  // Může schvalovat doklady
  "confirm":         0,  // Může potvrzovat doklady
  "administrator":   0,  // Zástupce dostane admin práva (jen ADMIN může nastavit)
  "superadmin":      0,  // Zástupce dostane superadmin práva (jen SUPERADMIN může nastavit)
  "notify_zastupce": 1   // Příznak: zda byl zástupce informován
}
```

### FE `OPRAVNENI_META` – definice v `SubstitutionTab.js`

```js
const OPRAVNENI_META = [
  { key: 'view',          label: 'Prohlížení',    visible: () => true,           ... },
  { key: 'approve',       label: 'Schvalování',   visible: () => true,           ... },
  { key: 'confirm',       label: 'Potvrzování',   visible: () => true,           ... },
  { key: 'administrator', label: 'Admin práva',   visible: (isAdmin) => isAdmin, ... },
  { key: 'superadmin',    label: 'Superadmin',    visible: (_, isSA) => isSA,    ... },
];
```

---

## 🎨 UI REDESIGN – PLÁN (schváleno 12. 4. 2026)

### Motivace
Stávající UI nevyužívá celou šíři stránky. Karty jsou malé, formulář inline je nepřehledný.

### Navrhované změny

#### 1. Fullwidth layout
- Odstraní `max-width: 900px` na `Container`
- Tabulka se roztáhne na celou dostupnou plochu

#### 2. Modální dialog pro přidání/editaci
- Stejný styl jako `UserManagementModal` (blur backdrop `backdrop-filter: blur(12px)`, gradient header, `max-width: 640px`)
- Otevírá se tlačítkem „+ Přidat zastupování"
- Obsah: zástupce, datum od/do, oprávnění (toggle switche), notifikace, poznámka
- Admin verze: přidá navíc pole „Zastupovaný uživatel"

#### 3. Tabulka místo karet
Sloupce: **Zástupce | Období | Oprávnění | Stav | Akce**

| Stav záznamu | Editace (tužka) | Smazání/Zrušení (koš) |
|---|---|---|
| `future` – dt_od > dnes | ✅ Ano | ✅ Ano |
| `active` – právě probíhá | ❌ Ne | ✅ Ano (zrušit) |
| `past` – vypršelo nebo deaktivováno | ❌ Ne | ❌ Ne |

> **Logika:** Zastupování je editovatelné pouze pokud `dt_od > TODAY()`. Jakmile interval začal, záznam je historický a neměnný – i pro účely průkaznosti auditního logu.

#### 4. Admin sekce
- Přepínač nad tabulkou: **„Moje zastupování" / „Přehled systému"**
- V režimu „Přehled systému": tabulka všech zastupování + možnost admin deaktivace

### Soubory k změně
- `SubstitutionTab.js` – přepis layoutu (fullwidth, modal, tabulka, přepínač)
- `apiSubstitution.js` – přidat `updateSubstitution()`

---

## 🧩 FRONTEND – Přehled komponent

### SubstitutionTab.js

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/components/SubstitutionTab.js`

#### Props komponenty

```jsx
<SubstitutionTab
  token={token}
  username={username}
  showToast={showToast}             // fn(msg, type)
  hasPermission={hasPermission}     // fn(kod_prava) → bool
  isSuperAdmin={bool}
/>
```

#### Podmínka zobrazení záložky (ProfilePage.js)

```jsx
{hasPermission && (hasPermission('USER_SUBSTITUTE_SET') || hasPermission('ADMIN')) && (
  <TabContent $active={activeTab === 'substitution'}>
    <SubstitutionTab ... />
  </TabContent>
)}
```

---

### DashboardPage.js – WelcomeWidget

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/DashboardPage.js`  
**Funkce:** `WelcomeWidget` (řádky cca 2975-3090)  
**Aktualizováno:** 14. 4. 2026

#### Props
```javascript
function WelcomeWidget({ 
  user,           // Objekt uživatele s jméno, příjmení, pozice, oddeleni, roles
  rolesDetected,  // Capability-based role detekce (is_admin, has_order_approve, atd.)
  nameday,        // Svátek dnes
  newsSinceLogin, // Počet nových zpráv od posledního přihlášení
  myStats,        // Statistiky uživatele
  navigate,       // React Router navigate fn
  substituting,   // Array - koho zastupuji (where ja = zastupce)
  mySubstitutions // Array - kdo mě zastupuje (where ja = zastupovaný)
})
```

#### Klíčové funkce

**1. Duální ikona systém:**
```javascript
// Fialová ikona (zastupuji někoho)
const activeSubstitutions = (substituting || []).filter(s => 
  s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
);
// Tyrkysová ikona (někdo mě zastupuje)
const activeBeingSubstituted = (mySubstitutions || []).filter(s => 
  s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
);
```

**2. Role display priorita:**
```javascript
// Pořadí: capability role → DB roles → pozice → 'Uživatel'
if (roleLabels.length === 0 && user?.roles && user.roles.length > 0) {
  userRolesDisplay = user.roles.map(r => r.nazev_role).join(' · ');
}
```

**3. Tooltip formátování:**
```javascript
const formatCzDate = (isoDateStr) => {
  const [y, m, d] = isoDateStr.split('T')[0].split('-');
  return `${d}.${m}.${y}`;
};
```

---

### DashboardPage.js – NotificationsWidget

**Funkce:** `NotificationsWidget` (řádky cca 3500-4100)  
**Aktualizováno:** 14. 4. 2026

#### Standardizovaný formát Row 3

**Všechny typy notifikací (MSG, ZASTUP, KOM) mají jednotný Row 3:**
```jsx
<div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
  {details.sender && `Od: ${details.sender} • `}{details.timeFormatted}
</div>
```

**ADMIN_MESSAGE parsing (řádky 3585-3608):**
```javascript
const sender = (() => {
  try {
    const ph = JSON.parse(n.placeholder_data || '{}');
    return ph.sender_name || placeholders.sender_name || n.from_user_name || null;
  } catch (e) {
    return placeholders.sender_name || n.from_user_name || null;
  }
})();
// ✅ NIKDY fallback na 'Administrátor'
```

**KOM (komentáře) parsing (řádky 3695-3700):**
```javascript
const komCreatedDate = n.dt_created || n.vytvoren_kdy;
const komTimeFormatted = komCreatedDate ? new Date(komCreatedDate).toLocaleString('cs-CZ', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';
return {
  type: 'KOM',
  sender: authorMatch || n.from_user_name || null,
  timeFormatted: komTimeFormatted
};
```

---

### Notifikační komponenty (odstranění fallbacků)

**Aktualizováno:** 14. 4. 2026

#### App.js
**Řádky:** 700-713  
**Změna:** Real-time notifikace – `from_user_name` fallback změněn z `'Administrátor'` na `null`

#### HighPriorityNotificationModal.js
**Řádky:** 245-251, 285-291  
**Změna:** 
- `senderName = notification.from_user_name || null`
- Podmíněné zobrazení "Od:" pouze pokud `senderName` existuje

#### NotificationsPage.js
**Řádky:** 3244-3252  
**Změna:** Přidána podmínka `&& notification.from_user_name &&` pro ADMIN_MESSAGE badge

#### NotificationDropdown.js
**Řádky:** 810-823  
**Změna:** Identická logika jako NotificationsPage.js

---

## 🧪 TESTOVÁNÍ ZASTUPOVÁNÍ

### Manuální test checklist

**Dashboard – WelcomeWidget:**
- [ ] Uživatel bez zastupování: žádné ikony
- [ ] Uživatel zastupuje někoho: fialová ikona s tooltip (jméno, datum, email, tel)
- [ ] Uživatel je zastoupený: tyrkysová ikona s tooltip
- [ ] Obě situace současně: obě ikony vedle sebe
- [ ] Role display: admin vidí "Administrátor", běžný user své DB role nebo pozici

**Notifikace – Formát:**
- [ ] ADMIN_MESSAGE: Row 3 zobrazuje skutečné jméno nebo nic (ne "Administrátor")
- [ ] ZASTUP: Row 3 "Od: Jméno • dd.mm.rrrr hh:mm"
- [ ] KOM: Row 3 "Od: Jméno • dd.mm.rrrr hh:mm"
- [ ] Real-time popup: Zobrazuje jméno nebo žádný sender (ne "Administrátor")

**API endpointy:**
- [ ] `substitution/list` vrací mé záznamy jako zastupovaný
- [ ] `substitution/current` vrací koho právě zastupuji (aktivní dnes)
- [ ] `substitution/create` vytvoří nový záznam
- [ ] `substitution/deactivate` deaktivuje záznam

---

## 🔬 BE SOUBORY – PŘEHLED

### `hierarchyHandlers.php`
**Cesta:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php`

- `_substitution_auth($data, $pdo)` – ověří token
- `_substitution_has_right($token_data, $kod_prava)` – kontrola práv
- `_substitution_decode_opravneni($raw)` – parsuje JSON oprávnění
- `log_substitution_action($pdo, ...)` – zápis do audit logu (aktivně používáno při akcích v zastoupení)

### `dashboardHandlers.php`
**Cesta:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dashboardHandlers.php`

**Aktualizováno:** 14. 4. 2026

- `_dashboard_get_notifications_unread()` – Vrací nepřečtené notifikace pro uživatele
  - **✅ NOVĚ:** LEFT JOIN na `25_uzivatele` přes `od_uzivatele_id`
  - Vrací `from_user_name` (jméno + příjmení odesílatele)
  
- `_dashboard_get_notifications_recent()` – Vrací posledních 7 dní notifikací
  - **✅ NOVĚ:** LEFT JOIN na `25_uzivatele` přes `od_uzivatele_id`
  - Vrací `from_user_name` v result array

**Účel změn:** Odstranění hardcoded fallbacků ve FE ("Administrátor"), zobrazení skutečných jmen odesílatelů.

### `queries.php`

```
substitution_get_active       – aktivní zastupování pro zástupce
substitution_get_by_user      – zastupování dle zastupovaného
substitution_create           – INSERT
substitution_update           – UPDATE
substitution_deactivate       – SET aktivni=0
substitution_check_current    – kdo mě nyní zastupuje
substitution_my_active        – moje zastupování (vč. budoucích a ukončených)
substitution_candidates       – možní zástupci
substitution_get_all          – ADMIN: všechna zastupování
substitution_manageable_users – ADMIN: uživatelé pod správou admina
substitution_log_action       – INSERT do audit logu
substitution_log_get          – SELECT z audit logu
```

---

## ✅ STAV IMPLEMENTACE

| Funkce | Status | Poznámka |
|---|---|---|
| DB tabulka `25_uzivatele_zastupovani` | ✅ Hotovo | Produkce i dev |
| DB tabulka `25_zastupovani_akce_log` | ✅ Hotovo | Stačí pro audit, bez změn jiných tabulek |
| BE: queries.php – všechny SQL queries | ✅ Hotovo | |
| BE: hierarchyHandlers.php – CRUD | ✅ Hotovo | |
| BE: hierarchyHandlers.php – admin endpointy | ✅ Hotovo | |
| BE: api.php – routing 8 endpointů | ✅ Hotovo | |
| BE: dashboardHandlers.php – from_user_name | ✅ Hotovo (14.4.2026) | LEFT JOIN na 25_uzivatele |
| FE: apiSubstitution.js – volání API | ✅ Hotovo | |
| FE: SubstitutionTab.js – formulář | ✅ Hotovo | Bude přepracován (modal + tabulka) |
| FE: SubstitutionTab.js – admin sekce | ✅ Hotovo | Bude přepracována (přepínač) |
| **FE: WelcomeWidget – duální ikony** | ✅ Hotovo (14.4.2026) | Fialová/tyrkysová, tooltips s email/tel |
| **FE: WelcomeWidget – role display** | ✅ Hotovo (14.4.2026) | Priorita: capability → DB roles → pozice |
| **FE: Notifikace – Row 3 standardizace** | ✅ Hotovo (14.4.2026) | MSG, ZASTUP, KOM – jednotný formát |
| **FE: Odstranění 'Administrátor' fallbacků** | ✅ Hotovo (14.4.2026) | App.js, DashboardPage, modals, stránky |
| **Audit log – volání `log_zastupovani_akce()`** | 🔴 KRITICKÉ | Bez toho průkaznost nefunguje |
| **UI redesign** | 📋 PLÁNOVÁNO | Modal + tabulka + fullwidth |
| Notifikace zástupci (BE odeslání) | ❌ CHYBÍ | |
| `substitution/update` v FE | ❌ CHYBÍ | |
| Overlap check (BE) | ❌ CHYBÍ | |
| Admin deaktivace z přehledové tabulky | ❌ CHYBÍ | |
| Mobilní responsivita | ⚠️ Částečně | |

---

## 📝 TODO – Prioritní seznam

### 🔴 #1 – Audit log (KRITICKÉ pro průkaznost)

**Problém:** `log_zastupovani_akce()` existuje, ale **nikde není volána**. Bez toho nelze dokázat „kdo co schválil v zastoupení koho".

**Co udělat:**

**A) V `hierarchyHandlers.php`** – volat při CRUD:
```php
log_zastupovani_akce($pdo,
  zastupovani_id: $new_id,
  zastupce_id:    $zastupce_id,
  zastupovany_id: $zastupovany_id,
  akce_typ:       'ZASTUPOVANI_VYTVORENO',
  objekt_typ:     'zastupovani',
  objekt_id:      $new_id,
  popis_akce:     "Zastupování nastaveno od $dt_od do $dt_do"
);
```
- `handle_substitution_create()` → `ZASTUPOVANI_VYTVORENO`
- `handle_substitution_update()` → `ZASTUPOVANI_AKTUALIZOVANO`
- `handle_substitution_deactivate()` → `ZASTUPOVANI_ZRUSENO`

**B) V `handlers.php`** – při schválení objednávky (hledej `schvalovatel_id = :schvalovatel_id`):
```php
// Po úspěšném UPDATE objednávky:
$checkStmt = $pdo->prepare("
  SELECT id, zastupovany_id FROM 25_uzivatele_zastupovani
  WHERE zastupce_id = ? AND aktivni = 1
    AND dt_od <= CURDATE() AND dt_do >= CURDATE()
  LIMIT 1
");
$checkStmt->execute([$token_data['id']]);
$zastupovaaniRow = $checkStmt->fetch();
if ($zastupovaaniRow) {
  log_zastupovani_akce($pdo,
    zastupovani_id: $zastupovaaniRow['id'],
    zastupce_id:    $token_data['id'],
    zastupovany_id: $zastupovaaniRow['zastupovany_id'],
    akce_typ:       'SCHVALENI_OBJEDNAVKY',
    objekt_typ:     'objednavka',
    objekt_id:      $order_id,
    popis_akce:     "Objednávka schválena zástupcem"
  );
}
```
Totéž pro zamítnutí, potvrzení, faktury.

---

### 🔴 #2 – UI Redesign

Viz sekce UI REDESIGN výše. Pořadí kroků:
1. Fullwidth Container
2. Modal pro přidání/editaci (FE + `updateSubstitution()` do apiSubstitution.js)
3. Tabulka zastupování s logikou editovatelnosti
4. Admin přepínač Moje/Systém

---

### 🟡 #3 – Notifikace (BE)

Po `handle_substitution_create()` zkontrolovat `$opravneni_arr['notify_zastupce']`, pokud 1 → odeslat in-app notifikaci zástupci.

---

### 🟡 #4 – Overlap check (BE)

```sql
SELECT COUNT(*) FROM 25_uzivatele_zastupovani
WHERE zastupovany_id = ? AND zastupce_id = ? AND aktivni = 1
AND NOT (dt_do < ? OR dt_od > ?)
```
Pokud > 0 → chyba `'Pro tuto dvojici již existuje překrývající se zastupování'`.

---

### 🟢 #5 – Admin: deaktivace z tabulky

Do admin tabulky přidat sloupec „Akce" s tlačítkem Trash pro aktivní záznamy.

---

### 🟢 #6 – Responsivita

Přidat CSS breakpoint pro mobil/tablet na grid layout.

---

## � CHANGELOG – Historie implementací

### 14. dubna 2026 – UX/UI Integrační sprint ✅

**Kontext:** Systematická standardizace zobrazování notifikací a vizuálních indikátorů zastupování napříč celým systémem.

**Backend změny:**
- ✅ `dashboardHandlers.php` – Přidán LEFT JOIN na `25_uzivatele` pro získání `from_user_name`
  - Funkce: `_dashboard_get_notifications_unread()` (řádky 1536-1567)
  - Funkce: `_dashboard_get_notifications_recent()` (řádky 1563-1690)
- ✅ Apache reload pro aplikaci změn

**Frontend změny:**
- ✅ **DashboardPage.js – WelcomeWidget:**
  - Duální ikona systém (fialová pro zastupuji, tyrkysová pro jsem zastupován)
  - Ikona: `faUserFriends` (dvě postavy)
  - Tooltips ve formátu kalendáře s email/telefon
  - Role display logika: capability → DB roles → pozice → fallback
  
- ✅ **DashboardPage.js – NotificationsWidget:**
  - Standardizace Row 3 pro KOM (komentáře): přidán formát "Od: jméno • datum+čas"
  - ADMIN_MESSAGE: odstraněn fallback na 'Administrátor', používá `from_user_name || null`
  - ZASTUP: již měl správný formát
  
- ✅ **App.js:** Odstranění `|| 'Administrátor'` fallbacků v real-time notifikacích (řádky 707, 710)
  
- ✅ **HighPriorityNotificationModal.js:**
  - Změna `senderName` logiky na `|| null` místo `|| 'Administrátor'`
  - Podmíněné zobrazení "Od:" pouze pokud `senderName` existuje
  
- ✅ **NotificationsPage.js:** 
  - Podmíněné zobrazení sender badge pro ADMIN_MESSAGE (pouze pokud `from_user_name` existuje)
  
- ✅ **NotificationDropdown.js:**
  - Identická úprava jako NotificationsPage.js

**Celkem změněných souborů:** 1 BE + 5 FE = **6 souborů**

**User feedback quote:** _"ja chci po tobe jen jedno, at je vzdy styl a struktura tech zprav stejna. pokazdy kdyz delame novou notifkaci, tak to udelas uplne na picu."_

**Výsledek:** Kompletně jednotný formát notifikací bez hardcoded textů, vizuální indikátory zastupování s detailními kontakty.

---

### 12. dubna 2026 – Audit trail analýza a plánování

**Dokumentováno:**
- Řešení průkaznosti akcí zástupců BEZ změny existujících tabulek dokladů
- Audit SQL dotazy pro zjištění "kdo co schválil v zastoupení koho"
- Konstanty typů akcí (`SCHVALENI_OBJEDNAVKY`, `ZASTUPOVANI_VYTVORENO`, atd.)
- Návrh UI redesignu (fullwidth layout, modální dialog, tabulková struktura)

**Stav:** Dokumentace + plán, implementace audit logování PENDING.

---
## 💡 POZNÁMKY PRO BUDOUCÍ VÝVOJ

### ✅ CO JE HOTOVÉ A FUNGUJE

**Backend:**
- ✅ Kompletní CRUD operace pro zastupování (create, list, update, deactivate)
- ✅ Admin endpointy (systémový přehled, správa uživatelů)
- ✅ Dashboard notifikace s `from_user_name` z databáze
- ✅ Databázové tabulky (`25_uzivatele_zastupovani`, `25_zastupovani_akce_log`)

**Frontend:**
- ✅ SubstitutionTab s formulářem a správou vlastních zastupování
- ✅ Admin sekce pro přehled všech zastupování
- ✅ WelcomeWidget s duálními ikonami (fialová/tyrkysová) + detailní tooltips
- ✅ Konzistentní formát notifikací (Row 3: "Od: jméno • datum+čas")
- ✅ Žádné hardcoded fallbacky ('Administrátor', 'Systém')
- ✅ Role display logika (capability → DB roles → pozice)

**Dokumentace:**
- ✅ Tento soubor ZASTUPOVANI_SYSTEM_BRIEFING.md
- ✅ Changelog s detailními změnami

### 🔴 CO JEŠTĚ CHYBÍ (KRITICKÉ)

**1. Audit Log Volání** – NEJVYŠŠÍ PRIORITA  
Funkce `log_zastupovani_akce()` existuje, ale **není nikde volána**. Bez toho:
- ❌ Není průkaznost "kdo co schválil v zastoupení koho"
- ❌ Není audit trail pro compliance

**Místa kde přidat:**
- `hierarchyHandlers.php`: při create/update/deactivate zastupování
- `orderHandlers.php`: při schvalování/zamítání/potvrzování objednávek zástupcem
- `invoiceHandlers.php`: při schvalování faktur zástupcem

**2. UI Redesign SubstitutionTab**  
Stávající karty → nový design:
- Modal dialog místo inline formuláře
- Tabulka místo karet
- Fullwidth layout
- Přepínač "Moje zastupování" / "Přehled systému" pro adminy

**3. Notifikace zástupci (BE)**  
Po vytvoření zastupování zkontrolovat `opravneni.notify_zastupce === 1` → odeslat in-app notifikaci.

### ⚠️ CO BY BYLO DOBRÉ DOPLNIT

- Overlap check (zabránit překrývajícím se záznamům pro stejnou dvojici uživatelů)
- `substitution/update` endpoint integrace do FE
- Admin deaktivace z tabulkového přehledu (jedno tlačítko místo klikání do detailu)
- Mobilní responsivita (breakpointy pro menší obrazovky)
- E-mail notifikace zástupci (ne jen in-app)
- Export audit logu do CSV/Excel

### 📋 DEVELOPMENT WORKFLOW

**Při práci na zastupování:**
1. **Vždy** čti tento dokument před začátkem práce
2. Používej definované konstanty tabulek (`TBL_UZIVATELE_ZASTUPOVANI`, `TBL_ZASTUPOVANI_AKCE_LOG`)
3. Všechny nové akce loguj do audit logu pomocí `log_zastupovani_akce()`
4. Dodržuj standardní formát notifikací (Row 3: "Od: jméno • datum+čas")
5. Žádné hardcoded fallbacky – vždy `|| null` místo `|| 'text'`
6. Update tento soubor po dokončení většího feature

**Testování:**
- Dev prostředí: `/var/www/erdms-dev/`
- Dev databáze: `eeo2025-dev`
- Před deploy do produkce: úplný test audit logu!

---
## �🚀 QUICK START PRO NOVÉ VÝVOJÁŘE

Pracuj vždy v DEV prostředí (`/var/www/erdms-dev/apps`).  
Používej prepared statements, české error messages, POST metodu.  
Čti tento soubor pro detaily architektury před každou změnou v oblasti zastupování.
