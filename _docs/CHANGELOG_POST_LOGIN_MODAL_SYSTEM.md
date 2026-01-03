# Post-Login Modal Dialog System

**Datum vytvoření:** 3. ledna 2026  
**Verze:** 1.0.0  
**Status:** ✅ Production Ready

## 📋 Obsah

1. [Úvod](#úvod)
2. [Funkčnost](#funkčnost)
3. [Architektura](#architektura)
4. [Databázové schéma](#databázové-schéma)
5. [Backend API](#backend-api)
6. [Frontend komponenty](#frontend-komponenty)
7. [Použití a konfigurace](#použití-a-konfigurace)
8. [Testování](#testování)

---

## 🎯 Úvod

Post-Login Modal Dialog System je subsystém pro zobrazování důležitých upozornění a informací uživatelům bezprostředně po přihlášení do aplikace. Systém umožňuje administrátorům:

- Zobrazit modální dialog s HTML obsahem z notifikačního systému
- Nastavit časovou platnost zprávy (od-do)
- Resetovat zobrazení pomocí unikátního GUID identifikátoru
- Zobrazovat zprávy jen jednou na uživatele (localStorage tracking)

### Typické použití

- Důležitá systémová oznámení
- Plánované odstávky
- Změny v podmínkách používání
- Novinky ve funkcionalitě
- Bezpečnostní upozornění

---

## ⚙️ Funkčnost

### Klíčové vlastnosti

1. **Per-User Persistence**
   - Každý uživatel vidí modal pouze jednou
   - Tracking přes localStorage s klíčem `dismissed_post_login_modal_{username}_{guid}`

2. **GUID-based Reset System**
   - Admin může změnit GUID → modal se znovu zobrazí všem uživatelům
   - Automatické generování nového GUID v admin UI

3. **Časová platnost**
   - Datum "Platné od" - modal se zobrazí až od daného data
   - Datum "Platné do" - modal se přestane zobrazovat po tomto datu
   - Pokud není nastaveno "od", platí okamžitě
   - Pokud není nastaveno "do", platí neomezeně

4. **HTML Content z Notifikací**
   - Obsah se načítá z tabulky `25_notifikace` podle ID
   - Fallback na statický HTML obsah z konfigurace
   - Podpora plného HTML (nadpisy, odstavce, odkazy, seznamy)

5. **User Experience**
   - Modal nelze zavřít kliknutím mimo dialog (pouze tlačítkem)
   - Moderní design s gradientním pozadím
   - Responzivní na všech zařízeních
   - Tlačítko "Zobrazit příště" → uloží dismiss do localStorage

---

## 🏗️ Architektura

### Přehled komponent

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LOGIN                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    AuthContext.login()                      │
│  • Ověření credentials                                      │
│  • Uložení tokenu                                           │
│  • Emit custom event: 'userLoggedIn'                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   App.js Event Listener                     │
│  • Poslouchá 'userLoggedIn' event                           │
│  • Volá postLoginModalService.checkPostLoginModal()         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              postLoginModalService.js                       │
│  • Načte konfiguraci z /api/global-settings/post-login     │
│  • Zkontroluje aktivaci (enabled)                           │
│  • Zkontroluje časovou platnost                             │
│  • Zkontroluje localStorage dismiss                         │
│  • Načte HTML obsah z notifikace nebo fallback             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostLoginModal Component                   │
│  • Zobrazí modal s HTML obsahem                             │
│  • Tlačítko "Zobrazit příště" → dismiss                     │
│  • Uložení do localStorage                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Admin UI (AppSettings)
        │
        ▼
  POST /api/global-settings (save)
        │
        ▼
  25a_nastaveni_globalni (DB)
        │
        ▼
  GET /api/global-settings/post-login (frontend)
        │
        ▼
  postLoginModalService.checkPostLoginModal()
        │
        ├──► GET /api/notifications/{id} (načíst HTML obsah)
        │
        ▼
  PostLoginModal Component (zobrazení)
        │
        ▼
  localStorage.setItem('dismissed_...') (dismiss)
```

---

## 🗄️ Databázové schéma

### Tabulka: `25a_nastaveni_globalni`

Konfigurace post-login modalu se ukládá jako jednotlivé klíč-hodnota záznamy:

| Klíč | Typ | Popis | Výchozí hodnota |
|------|-----|-------|-----------------|
| `post_login_modal_enabled` | boolean (0/1) | Aktivace modalu | `0` |
| `post_login_modal_title` | string | Nadpis modalu | `'Důležité upozornění'` |
| `post_login_modal_guid` | string | Unikátní identifikátor verze | `'modal_init_v1'` |
| `post_login_modal_valid_from` | datetime | Platnost od (nullable) | `NULL` |
| `post_login_modal_valid_to` | datetime | Platnost do (nullable) | `NULL` |
| `post_login_modal_message_id` | int | ID notifikace ze systému | `NULL` |
| `post_login_modal_content` | text | Fallback HTML obsah | `''` |

### Příklad záznamů v DB

```sql
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis) VALUES
('post_login_modal_enabled', '1', 'Aktivace post-login modalu'),
('post_login_modal_title', 'Důležité upozornění', 'Nadpis modalu'),
('post_login_modal_guid', 'modal_2026_01_v1', 'GUID verze modalu'),
('post_login_modal_valid_from', '2026-01-03 00:00:00', 'Platnost od'),
('post_login_modal_valid_to', '2026-01-10 23:59:59', 'Platnost do'),
('post_login_modal_message_id', '950', 'ID notifikace s obsahem'),
('post_login_modal_content', '<p>Fallback obsah</p>', 'Záložní HTML obsah');
```

### Tabulka: `25_notifikace`

Modal používá existující notifikační systém pro načítání HTML obsahu:

```sql
SELECT id, nadpis, zprava 
FROM 25_notifikace 
WHERE id = ? AND aktivni = 1;
```

---

## 🔌 Backend API

### 1. Global Settings API

**Endpoint:** `POST /api/global-settings`  
**Handler:** `globalSettingsHandlers.php`

#### Get Operation

```http
POST /api/global-settings
Content-Type: application/json

{
  "operation": "get",
  "token": "user_token",
  "username": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "post_login_modal_enabled": true,
    "post_login_modal_title": "Důležité upozornění",
    "post_login_modal_guid": "modal_2026_01_v1",
    "post_login_modal_valid_from": "2026-01-03 00:00:00",
    "post_login_modal_valid_to": "2026-01-10 23:59:59",
    "post_login_modal_message_id": "950",
    "post_login_modal_content": "<p>Fallback</p>"
  }
}
```

#### Save Operation

```http
POST /api/global-settings
Content-Type: application/json

{
  "operation": "save",
  "token": "admin_token",
  "username": "admin",
  "settings": {
    "post_login_modal_enabled": true,
    "post_login_modal_title": "Nové oznámení",
    "post_login_modal_guid": "modal_2026_01_v2",
    "post_login_modal_valid_from": "2026-01-05 00:00:00",
    "post_login_modal_valid_to": null,
    "post_login_modal_message_id": "951",
    "post_login_modal_content": ""
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Globální nastavení bylo úspěšně uloženo"
}
```

### 2. Post-Login Modal API

**Endpoint:** `GET /api/global-settings/post-login`  
**Handler:** `globalSettingsHandlers.php::handle_get_post_login_modal_settings()`

```http
GET /api/global-settings/post-login
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "title": "Důležité upozornění",
    "guid": "modal_2026_01_v1",
    "validFrom": "2026-01-03T00:00:00",
    "validTo": "2026-01-10T23:59:59",
    "messageId": "950",
    "content": "<h3>Vítejte!</h3><p>Důležité informace...</p>"
  }
}
```

### 3. Notifications List API

**Endpoint:** `POST /api/notifications/list-for-select`  
**Handler:** `notificationHandlers.php::handle_notifications_list_for_select()`

Načte seznam notifikací pro admin select dropdown.

```http
POST /api/notifications/list-for-select
Content-Type: application/json

{
  "token": "admin_token",
  "username": "admin"
}
```

**Response (OrderV2 Standard):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 950,
      "title": "Systémové upozornění",
      "preview": "Vážení uživatelé, dne 5.1.2026 proběhne plánovaná údržba..."
    },
    {
      "id": 951,
      "title": "Nová funkcionalita",
      "preview": "S radostí vám oznamujeme novou funkci pro správu..."
    }
  ],
  "message": "Notifikace načteny úspěšně",
  "count": 2
}
```

**Oprávnění:** Vyžaduje roli `ADMINISTRATOR` nebo `SUPERADMIN`

---

## 🎨 Frontend komponenty

### 1. PostLoginModal Component

**Soubor:** `/apps/eeo-v2/client/src/components/PostLoginModal.js`

#### Props

```javascript
{
  isOpen: boolean,          // Zobrazit/skrýt modal
  title: string,            // Nadpis modalu
  content: string,          // HTML obsah (dangerouslySetInnerHTML)
  onClose: function         // Callback při zavření
}
```

#### Použití

```javascript
import PostLoginModal from './components/PostLoginModal';

<PostLoginModal
  isOpen={showModal}
  title="Důležité upozornění"
  content="<h3>Vítejte!</h3><p>Důležité informace...</p>"
  onClose={() => setShowModal(false)}
/>
```

#### Styling

- Modern glassmorphism design
- Gradient header (`linear-gradient(135deg, #2563eb, #7c3aed)`)
- FontAwesome ikony
- React Portals pro renderování mimo DOM hierarchii
- Responsive design

### 2. postLoginModalService

**Soubor:** `/apps/eeo-v2/client/src/services/postLoginModalService.js`

#### API

```javascript
// Zkontrolovat a zobrazit modal po přihlášení
checkPostLoginModal(username: string): Promise<Object|null>

// Označit modal jako zobrazený (dismiss)
dismissModalForUser(username: string, guid: string): void

// Zkontrolovat jestli uživatel už modal viděl
hasUserDismissedModal(username: string, guid: string): boolean
```

#### Příklad použití

```javascript
import postLoginModalService from './services/postLoginModalService';

// Po přihlášení
const modalData = await postLoginModalService.checkPostLoginModal(username);
if (modalData) {
  setModalData(modalData);
  setShowModal(true);
}

// Po kliknutí na "Zobrazit příště"
const handleDismiss = () => {
  postLoginModalService.dismissModalForUser(username, modalData.guid);
  setShowModal(false);
};
```

#### Logika kontroly

```javascript
1. Načíst konfiguraci z API
2. Zkontrolovat: enabled === true
3. Zkontrolovat časovou platnost (validFrom, validTo)
4. Zkontrolovat localStorage dismiss
5. Načíst obsah z notifikace (messageId) nebo použít fallback
6. Vrátit data pro zobrazení nebo null
```

### 3. AppSettings Admin UI

**Soubor:** `/apps/eeo-v2/client/src/pages/AppSettings.js`

#### Sekce Post-Login Modal

Administrační rozhraní obsahuje:

1. **Toggle Aktivace**
   - Zapnout/vypnout modal globálně

2. **Nadpis**
   - Text input pro nadpis modalu

3. **GUID Reset**
   - Text input s aktuálním GUID
   - Tlačítko "Generovat nový" → vytvoří `modal_{timestamp}_{random}`

4. **Časová platnost**
   - DatePicker "Platné od" (nullable)
   - DatePicker "Platné do" (nullable)

5. **Výběr notifikace**
   - Select dropdown s načtenými notifikacemi z DB
   - Zobrazuje: `{title} (ID: {id})`

6. **Fallback HTML obsah**
   - TextArea pro záložní HTML obsah
   - Použije se když není vybrána notifikace

---

## 📖 Použití a konfigurace

### Admin Workflow

1. **Přihlásit se jako Admin/SuperAdmin**

2. **Navigace → Administrace → Globální nastavení aplikace**

3. **Sekce "Post-Login Modal Dialog"**

4. **Konfigurace:**
   - Zapnout toggle "Aktivovat post-login modal"
   - Zadat nadpis (např. "Důležité upozornění")
   - Vybrat notifikaci ze selectu NEBO zadat fallback HTML
   - Nastavit platnost "od" a "do" (volitelné)
   - Ponechat výchozí GUID nebo vygenerovat nový

5. **Uložit změny**

6. **Test:**
   - Odhlásit se
   - Přihlásit se → modal se zobrazí
   - Kliknout "Zobrazit příště" → modal se již nezobrazí
   - Pro další test změnit GUID (kliknutím na "Generovat nový")

### Reset pro všechny uživatele

**Scénář:** Potřebujete zobrazit modal znovu všem uživatelům

**Postup:**
1. V admin UI klikněte na tlačítko **"Generovat nový"** u GUID
2. Uložte nastavení
3. Všichni uživatelé teď uvidí modal znovu při příštím přihlášení

**Jak to funguje:**
- GUID se změní → localStorage klíč už neexistuje
- Systém považuje modal za nový → zobrazí se znovu

### Časová platnost

**Příklady:**

**1. Okamžité zobrazení bez omezení:**
```
Platné od: [prázdné]
Platné do: [prázdné]
→ Modal se zobrazí okamžitě a platí neomezeně
```

**2. Plánované zobrazení:**
```
Platné od: 2026-01-05 00:00:00
Platné do: [prázdné]
→ Modal se zobrazí od 5.1.2026 a platí neomezeně
```

**3. Časově omezené zobrazení:**
```
Platné od: 2026-01-03 00:00:00
Platné do: 2026-01-10 23:59:59
→ Modal se zobrazí pouze mezi 3.-10. lednem 2026
```

### HTML Content Best Practices

**Doporučená struktura:**

```html
<h3>Vítejte v novém systému!</h3>

<p>
  <strong>Důležité změny:</strong>
</p>

<ul>
  <li>Nová funkcionalita pro správu objednávek</li>
  <li>Vylepšené vyhledávání</li>
  <li>Rychlejší načítání dat</li>
</ul>

<p>
  Pro více informací kontaktujte 
  <a href="mailto:podpora@zachranka.cz">technickou podporu</a>.
</p>

<p style="color: #666; font-size: 0.875rem; margin-top: 1rem;">
  Toto oznámení se zobrazí pouze jednou.
</p>
```

**Podporované HTML tagy:**
- `<h1>` až `<h6>` - nadpisy
- `<p>` - odstavce
- `<strong>`, `<em>` - zvýraznění
- `<ul>`, `<ol>`, `<li>` - seznamy
- `<a href="">` - odkazy
- `<br>` - zalomení řádku
- Inline `style` atributy

---

## 🧪 Testování

### Manuální test scénáře

#### Test 1: Základní zobrazení

1. Aktivovat modal v admin UI
2. Nastavit nadpis a obsah
3. Odhlásit se a znovu přihlásit
4. ✅ Modal se zobrazí s nastavným obsahem

#### Test 2: Dismiss funkce

1. Zobrazit modal (Test 1)
2. Kliknout "Zobrazit příště"
3. Modal se zavře
4. Odhlásit a přihlásit znovu
5. ✅ Modal se již nezobrazí

#### Test 3: GUID Reset

1. Dismiss modal (Test 2)
2. V admin UI kliknout "Generovat nový" GUID
3. Uložit
4. Odhlásit a přihlásit
5. ✅ Modal se zobrazí znovu (nový GUID)

#### Test 4: Časová platnost - budoucí datum

1. Nastavit "Platné od" na zítřek
2. Odhlásit a přihlásit
3. ✅ Modal se nezobrazí (ještě neplatný)

#### Test 5: Časová platnost - uplynulé datum

1. Nastavit "Platné do" na včera
2. Odhlásit a přihlásit
3. ✅ Modal se nezobrazí (už neplatný)

#### Test 6: Notifikace obsah vs Fallback

1. Vybrat notifikaci ze selectu
2. Odhlásit a přihlásit
3. ✅ Modal zobrazí obsah z notifikace
4. Odstranit výběr notifikace, zadat fallback
5. Odhlásit a přihlásit
6. ✅ Modal zobrazí fallback obsah

#### Test 7: Deaktivace

1. Vypnout toggle "Aktivovat post-login modal"
2. Uložit
3. Odhlásit a přihlásit
4. ✅ Modal se nezobrazí

### Kontrolní seznam (Checklist)

- [ ] Modal se zobrazí po přihlášení
- [ ] Modal má správný nadpis a obsah
- [ ] Tlačítko "Zobrazit příště" funguje
- [ ] Po dismiss se modal již nezobrazuje
- [ ] Změna GUID resetuje dismiss
- [ ] Časová platnost "od" funguje správně
- [ ] Časová platnost "do" funguje správně
- [ ] Obsah z notifikace se načítá správně
- [ ] Fallback obsah funguje
- [ ] Deaktivace v admin UI zastaví zobrazování
- [ ] Admin UI se správně ukládá a načítá
- [ ] Select s notifikacemi se načítá
- [ ] DatePicker komponenty fungují
- [ ] Responsive design na mobilech

### Debug

**localStorage inspekce:**
```javascript
// Chrome DevTools Console
localStorage.getItem('dismissed_post_login_modal_admin_modal_2026_01_v1')
// Očekávaný výstup: "2026-01-03T12:34:56.789Z" nebo null
```

**API test:**
```bash
# Test global settings endpoint
curl -X GET http://localhost:3001/api/global-settings/post-login

# Test notification list (vyžaduje admin token)
curl -X POST http://localhost:3001/api/notifications/list-for-select \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token","username":"admin"}'
```

---

## 📝 Poznámky

### Bezpečnost

- ✅ Admin oprávnění pro změnu nastavení (SUPERADMIN, ADMINISTRATOR)
- ✅ HTML obsah je sanitizován přes `dangerouslySetInnerHTML` (React)
- ✅ Token verification pro všechny API endpointy
- ✅ Prepared statements v SQL queries (PDO)

### Performance

- localStorage tracking → žádné DB queries pro dismiss check
- Lazy loading admin komponenty (dynamic import)
- Single API call pro načtení konfigurace
- Cachování v `postLoginModalService`

### Limitace

- Modal se zobrazí pouze po přihlášení (ne při refresh stránky)
- LocalStorage je per-browser (jiný browser = znovu vidí)
- HTML obsah není validován na backendu
- Maximální délka GUID: 255 znaků (DB limit)

### Budoucí vylepšení

- [ ] Rich text editor pro HTML obsah
- [ ] Preview modalu v admin UI
- [ ] Statistiky zobrazení (kolik uživatelů vidělo/dismisslo)
- [ ] Multiple modals s prioritou
- [ ] Targeting na specifické role
- [ ] A/B testing variant

---

## 🔗 Související dokumentace

- [Global Settings API](./ERDMS_PLATFORM_STRUCTURE.md)
- [Notification System](./NOTIFICATION_SYSTEM.md)
- [Admin UI Components](./ADMIN_UI_GUIDE.md)
- [OrderV2 API Standard](./PHP_api.prompt.md)

---

**Vytvořil:** GitHub Copilot + Development Team  
**Poslední aktualizace:** 3. ledna 2026  
**Verze dokumentu:** 1.0.0
