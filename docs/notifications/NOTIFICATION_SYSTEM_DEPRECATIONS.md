# Notification System - Deprecated Features (17.12.2025)

## 📋 Přehled

Po implementaci **Generic Recipient System** jsou některé staré funkce označeny jako deprecated.
Jsou zachovány pro **zpětnou kompatibilitu**, ale neměly by se používat v novém kódu.

---

## 🚫 Deprecated Features

### 1. **ENTITY_PARTICIPANTS scope_filter** (Backend)

**Soubor:** `notificationHandlers.php` → `applyScopeFilter()`

**Problém:**
- Používá `array_intersect()` místo nahrazení příjemců
- Nekonzistentní s novým Generic Recipient System

**Místo toho použít:**
```php
// ❌ DEPRECATED
scope_filter: 'ENTITY_PARTICIPANTS'

// ✅ NOVÝ ZPŮSOB
scope_filter: 'PARTICIPANTS_ALL'  // Nahradí target users všemi účastníky entity
```

**Kdy bude odstraněno:** Po migraci všech hierarchií na nový systém

---

### 2. **onlyOrderParticipants / onlyOrderLocation** (Frontend + Backend)

**Soubory:**
- `OrganizationHierarchy.js` (checkboxy v edge editoru)
- `OrderForm25.js` (komentáře)
- `migrate-generic-recipient-system.php`

**Problém:**
- Booleovské checkboxy nahrazeny flexibilním `scope_filter` enumem
- Omezené možnosti (jen ANO/NE)

**Místo toho použít:**
```javascript
// ❌ DEPRECATED
edge.data.onlyOrderParticipants = true;
edge.data.onlyOrderLocation = true;

// ✅ NOVÝ ZPŮSOB
edge.data.scope_filter = 'PARTICIPANTS_ALL';    // Všichni účastníci
edge.data.scope_filter = 'PARTICIPANTS_PRIKAZCE'; // Jen příkazce
edge.data.scope_filter = 'PARTICIPANTS_GARANT';   // Jen garant
edge.data.scope_filter = 'LOCATION';              // Jen z lokality objednávky
edge.data.scope_filter = 'DEPARTMENT';            // Jen z úseku objednávky
```

**Kdy bude odstraněno:** Po migraci všech hierarchií (UI checkboxy už odstraněny 17.12.2025)

---

### 3. **getNotificationEmoji()** (Frontend)

**Soubor:** `utils/iconMapping.js`

**Problém:**
- Emoji ikony nahrazeny FontAwesome ikonami s lepší viditelností
- Emoji neměly barevné pozadí, špatně čitelné

**Místo toho použít:**
```javascript
// ❌ DEPRECATED
import { getNotificationEmoji } from '../utils/iconMapping';
<NotificationIcon>{getNotificationEmoji(type, priority)}</NotificationIcon>

// ✅ NOVÝ ZPŮSOB (NotificationsPage.js)
const getPriorityIconComponent = (priority) => {
  switch (priority.toUpperCase()) {
    case 'EXCEPTIONAL':
    case 'URGENT':
      return <FontAwesomeIcon icon={faBolt} />;  // ⚡ Blesk
    case 'APPROVAL':
    case 'HIGH':
      return <FontAwesomeIcon icon={faExclamation} />;  // ❗ Vykřičník
    case 'INFO':
    case 'NORMAL':
    default:
      return <FontAwesomeIcon icon={faInfoCircle} />;  // ℹ️ Info kruh
  }
};
```

**Nový styl:**
- Ikony mají kulaté barevné pozadí podle priority
- Lepší viditelnost a konzistence s Material Design

**Kdy bude odstraněno:** Funkce ponechána pro zpětnou kompatibilitu, ale nepoužívá se

---

## 🔄 Migrační Cesta

### Pro existující hierarchie:

1. **Otevřít hierarchii v editoru**
   - Admin → Organizační struktura

2. **Kliknout na EDGE (šipku) mezi template a user/role**
   - Otevře se Edge Config Panel

3. **Změnit scope_filter:**
   ```
   Starý checkbox: ☑️ Pouze účastníci objednávky
   Nový dropdown:  ⭐ Všichni účastníci (PARTICIPANTS_ALL)
   ```

4. **Uložit hierarchii**
   - Tlačítko "Uložit strukturu" v pravém panelu

### Pro nový kód:

**NEPOUŽÍVAT:**
- `onlyOrderParticipants`
- `onlyOrderLocation`
- `ENTITY_PARTICIPANTS`
- `getNotificationEmoji()` v nových komponentech

**POUŽÍT:**
- `scope_filter` enum s hodnotami: `PARTICIPANTS_ALL`, `PARTICIPANTS_PRIKAZCE`, `LOCATION`, atd.
- `recipient_type` enum: `USER`, `ROLE`, `GROUP`, `ENTITY_AUTHOR`, atd.
- FontAwesome ikony místo emoji

---

## 📊 Status Migrace

### ✅ Hotovo (17.12.2025):
- [x] Generic Recipient System implementován
- [x] Scope filter enum vytvořen
- [x] SQL column errors opraveny
- [x] FontAwesome ikony implementovány
- [x] Deprecated UI checkboxy odstraněny z frontendu
- [x] Deprecation warnings přidány do kódu

### ⏳ Zbývá udělat:
- [ ] Migrovat všechny existující hierarchie na nový systém
- [ ] Otestovat se starými hierarchiemi (zpětná kompatibilita)
- [ ] Vytvořit admin nástroj pro hromadnou migraci
- [ ] Odstranit deprecated kód po dokončení migrace

---

## 🛠️ Technické Detaily

### Mapování starého → nového systému:

| Starý systém | Nový systém | Poznámka |
|-------------|-------------|----------|
| `onlyOrderParticipants=true` | `scope_filter='PARTICIPANTS_ALL'` | Všichni účastníci |
| `onlyOrderParticipants=false` | `scope_filter='NONE'` | Bez filtru |
| `onlyOrderLocation=true` | `scope_filter='LOCATION'` | Jen z lokality |
| `ENTITY_PARTICIPANTS` | `PARTICIPANTS_ALL` | Nový název + nová logika |
| Emoji ikony | FontAwesome ikony | Lepší UX |

### Priority mapping:

| recipientRole | DB priorita | Ikona | Barva |
|--------------|-------------|-------|-------|
| `EXCEPTIONAL` | `EXCEPTIONAL` | ⚡ faBolt | 🔴 Červená |
| `APPROVAL` | `APPROVAL` | ❗ faExclamation | 🟠 Oranžová |
| `INFO` | `INFO` | ℹ️ faInfoCircle | 🔵 Modrá |

---

## 📞 Kontakt

V případě problémů s migrací kontaktujte vývojový tým.

**Datum:** 17. prosince 2025  
**Verze:** v2025.03_25  
**Branch:** feature/generic-recipient-system
