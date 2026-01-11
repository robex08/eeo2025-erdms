# ✅ Hierarchie modul - Notifikační šablony

## Datum: 15. prosince 2025

## Jak funguje načítání šablon v modulu Hierarchie

### Automatické načítání

Modul **OrganizationHierarchy.js** automaticky načítá všechny aktivní notifikační šablony při otevření stránky.

**Proces:**
1. **useEffect hook** (řádek ~1922) zavolá API: `fetchData('notifications/templates/list')`
2. **Backend** (`notificationTemplatesHandlers.php`) vrací všechny šablony z DB kde `active = 1`
3. **Frontend** uloží do state: `setAllNotificationTemplates(templatesData.data || [])`
4. **Filtr** (řádek 4477) umožňuje hledat podle `name` nebo `description`
5. **Zobrazení** v sidebaru pod sekcí "NOTIFIKAČNÍ ŠABLONY"

### Struktura dat

Každá šablona má následující strukturu:
```javascript
{
  id: 3,
  type: 'order_status_schvalena',
  name: 'Objednávka schválena',
  email_subject: '✅ Objednávka {order_number} byla schválena',
  email_body: '<!-- RECIPIENT: RECIPIENT -->...',
  app_title: '✅ Schválena: {order_number}',
  app_message: 'Objednávka {order_number}...',
  send_email_default: true,
  priority_default: 'normal',
  active: true,
  dt_created: '2025-10-29 20:46:18',
  dt_updated: '2025-12-15 23:11:32'
}
```

---

## ✅ Nové šablony Fáze 1 - JIŽ DOSTUPNÉ

### V databázi:
| ID | Type | Name | Active | Body Length |
|----|------|------|--------|-------------|
| 3 | order_status_schvalena | Objednávka schválena | ✅ | 14 066 B |
| 4 | order_status_zamitnuta | Objednávka zamítnuta | ✅ | 13 981 B |
| 5 | order_status_ceka_se | Objednávka vrácena k doplnění | ✅ | 14 107 B |

### V modulu Hierarchie:

**Zobrazení:**
- Šablony se zobrazují v levém sidebaru pod sekcí **"NOTIFIKAČNÍ ŠABLONY (N)"**
- Každá šablona má:
  - ✅ Checkbox pro výběr
  - 🔔 Ikonku notifikace (oranžový gradient)
  - Název šablony
  - `type` kód (např. `order_status_schvalena`)
  - Prioritu (normal/high/urgent)
  - Ikonu 📧 pokud se odesílá email

**Drag & Drop:**
- Šablony lze přetahovat do workflow diagramu
- Při přetažení se vytvoří notifikační node
- Node obsahuje informace o šabloně a typu příjemce

**Hromadný výběr:**
- Tlačítko "☑ Vybrat vše" / "☐ Zrušit vše"
- Tlačítko "➕ Přidat vybrané" pod sidebarém
- Vybrané šablony mají žlutý background (#fef3c7)

---

## Refresh/Znovunačtení šablon

### Automatický refresh:
Šablony se načítají automaticky při:
1. **Prvním otevření stránky** modulu Hierarchie
2. **Změně aktivního profilu** (dropdown nahoře)
3. **Hard refresh** (Ctrl+F5 / Cmd+Shift+R)

### Manuální refresh:
Pokud potřebuješ znovu načíst šablony bez refreshe celé stránky:
1. Změň profil v dropdownu a pak ho změň zpět
2. Nebo hard refresh celé stránky (F5)

### Bez refreshe se zobrazí:
- ✅ Všechny šablony s `active = 1` z DB
- ✅ Včetně nových šablon Fáze 1:
  - Objednávka schválena
  - Objednávka zamítnuta
  - Objednávka vrácena k doplnění

---

## Testování

### Krok za krokem:

1. **Otevřít modul Hierarchie:**
   ```
   https://erdms.zachranka.cz/eeo-v2/organization-hierarchy
   ```

2. **Zkontrolovat levý sidebar:**
   - Posunout se dolů k sekci "NOTIFIKAČNÍ ŠABLONY"
   - Kliknout na šipku pro rozbalení (pokud je skryta)
   
3. **Ověřit nové šablony:**
   - ✅ "Objednávka schválena" (order_status_schvalena)
   - ❌ "Objednávka zamítnuta" (order_status_zamitnuta)
   - ⏸️ "Objednávka vrácena k doplnění" (order_status_ceka_se)

4. **Testovat Drag & Drop:**
   - Kliknout na šablonu a přetáhnout do canvasu
   - Měl by se vytvořit node s názvem šablony
   - Node má oranžový gradient a ikonu 🔔

5. **Testovat hromadný výběr:**
   - Zaškrtnout checkboxy u nových šablon
   - Kliknout "➕ Přidat vybrané" dole
   - Měly by se přidat všechny vybrané šablony najednou

---

## Zobrazení v sidebaru

### Současný stav:

```
┌─────────────────────────────────────┐
│ 🔍 Hledat šablony...                │
├─────────────────────────────────────┤
│ ☑ Vybrat vše                        │
├─────────────────────────────────────┤
│ ☐ 🔔 Nová objednávka vytvořena      │
│     order_status_nova               │
│     normal                          │
├─────────────────────────────────────┤
│ ☐ 🔔 Objednávka ke schválení        │
│     order_status_ke_schvaleni       │
│     📧 Email | high                 │
├─────────────────────────────────────┤
│ ☐ 🔔 Objednávka schválena      ← ✅ │
│     order_status_schvalena          │
│     📧 Email | normal               │
├─────────────────────────────────────┤
│ ☐ 🔔 Objednávka zamítnuta      ← ✅ │
│     order_status_zamitnuta          │
│     📧 Email | high                 │
├─────────────────────────────────────┤
│ ☐ 🔔 Objednávka vrácena...     ← ✅ │
│     order_status_ceka_se            │
│     📧 Email | high                 │
├─────────────────────────────────────┤
│ ... další šablony ...               │
└─────────────────────────────────────┘
```

---

## Řešení problémů

### Šablony se nezobrazují:

**1. Zkontrolovat databázi:**
```sql
SELECT id, type, name, active 
FROM 25_notification_templates 
WHERE type IN ('order_status_schvalena', 'order_status_zamitnuta', 'order_status_ceka_se');
```
Ověř, že všechny tři šablony mají `active = 1`.

**2. Zkontrolovat API response:**
- Otevřít DevTools (F12)
- Přejít na tab Network
- Reload stránky (F5)
- Najít request `notifications/templates/list`
- Zkontrolovat Response - měl by obsahovat všechny 3 nové šablony

**3. Hard refresh:**
```
Windows/Linux: Ctrl + Shift + R nebo Ctrl + F5
Mac: Cmd + Shift + R
```

**4. Clear cache:**
- Otevřít DevTools (F12)
- Kliknout pravým na reload button → "Empty Cache and Hard Reload"

**5. Zkontrolovat konzoli:**
- DevTools → Console tab
- Hledat errory typu:
  - `Failed to fetch`
  - `401 Unauthorized`
  - `500 Internal Server Error`

---

## Backend API endpoint

### Request:
```http
POST /api.eeo/notifications/templates/list
Content-Type: application/json

{
  "token": "...",
  "username": "...",
  "active_only": true
}
```

### Response:
```json
{
  "status": "ok",
  "data": [
    {
      "id": 3,
      "type": "order_status_schvalena",
      "name": "Objednávka schválena",
      "email_subject": "✅ Objednávka {order_number} byla schválena",
      "email_body": "<!-- RECIPIENT: RECIPIENT -->...",
      "app_title": "✅ Schválena: {order_number}",
      "app_message": "Objednávka {order_number}...",
      "send_email_default": true,
      "priority_default": "normal",
      "active": true,
      "dt_created": "2025-10-29 20:46:18",
      "dt_updated": "2025-12-15 23:11:32"
    },
    ...
  ],
  "total": 45
}
```

---

## Používání v workflow

### Přidání šablony do workflow:

1. **Metoda 1: Drag & Drop**
   - Uchopit šablonu z levého sidebaru
   - Přetáhnout na canvas
   - Pustit myš
   - Node se vytvoří automaticky

2. **Metoda 2: Hromadný výběr**
   - Zaškrtnout checkboxy u šablon
   - Kliknout "➕ Přidat vybrané"
   - Všechny vybrané šablony se přidají najednou

### Node obsahuje:
- **Název šablony**
- **Type** (order_status_schvalena)
- **Template ID** (3)
- **Priorita** (normal/high/urgent)
- **Email flag** (true/false)

### Propojení:
- Z notifikačního node vede hrana k příjemci:
  - Uživatel
  - Lokace
  - Oddělení
  - Role

---

## Důležité poznámky

### ⚠️ Rozdíl oproti starším šablonám:

**Stará struktura (order_status_ke_schvaleni):**
- 3 varianty: APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER

**Nová struktura (Fáze 1 šablony):**
- 2 varianty: RECIPIENT, SUBMITTER
- Žádná URGENT varianta

### 🔄 Varianta se určuje automaticky:

Backend při odeslání notifikace:
1. Načte šablonu z DB
2. Určí typ příjemce (RECIPIENT vs SUBMITTER)
3. Extrahuje správnou HTML sekci pomocí `<!-- RECIPIENT: TYPE -->`
4. Nahradí placeholdery
5. Odešle email + in-app notifikaci

---

## Status

### ✅ Hotovo:
- Šablony v databázi (ID 3, 4, 5)
- Backend API vrací všechny šablony
- Frontend automaticky načítá šablony
- Drag & Drop funguje
- Hromadný výběr funguje

### 🔄 Automaticky funguje:
- Zobrazení v modulu Hierarchie
- Filtrování podle názvu
- Výběr checkboxem
- Přidání do workflow

### 📝 Není potřeba:
- Žádné další změny v kódu
- Žádný restart serveru
- Žádné migrace DB
- Pouze refresh stránky (F5)

---

**Závěr:** Nové šablony jsou plně funkční a zobrazují se automaticky v modulu Hierarchie. Stačí otevřít stránku a šablony by měly být viditelné v levém sidebaru pod sekcí "NOTIFIKAČNÍ ŠABLONY". 🎉
