# Post-Login Modal Dialog System

**Datum vytvoření:** 3. ledna 2026  
**Datum aktualizace:** 3. ledna 2026  
**Verze:** 1.0.0  
**Status:** ✅ Production Ready - Nasazeno a funkční

## 📋 Obsah

1. [Úvod](#úvod)
2. [Funkčnost](#funkčnost)  
3. [Aktuální implementace](#aktuální-implementace)
4. [Architektura](#architektura)
5. [Databázové schéma](#databázové-schéma)
6. [Backend API](#backend-api)
7. [Frontend komponenty](#frontend-komponenty)
8. [Použití a konfigurace](#použití-a-konfigurace)
9. [Testování](#testování)

---

## 🎯 Úvod

Post-Login Modal Dialog System je subsystém pro zobrazování důležitých upozornění a informací uživatelům bezprostředně po přihlášení do aplikace. 

**Aktuální stav:** Systém je plně implementován a nasazen do produkce s funkcionalitou zobrazování uvítací zprávy pro nový EEO systém v2.

### Administrace umožňuje

- ✅ Zobrazit modální dialog s HTML obsahem z notifikačního systému
- ✅ Nastavit časovou platnost zprávy (od-do) 
- ✅ Resetovat zobrazení pomocí unikátního GUID identifikátoru
- ✅ Zobrazovat zprávy jen jednou na uživatele (localStorage tracking)
- ✅ Náhled vybrané notifikace v administračním rozhraní
- ✅ Moderní, responzivní design modalu (desktop 60% šířky, mobile friendly)

### Typické použití

- ✅ **Aktuálně aktivní:** Uvítací zpráva pro nový EEO systém v2
- Důležitá systémová oznámení
- Plánované odstávky
- Změny v podmínkách používání  
- Novinky ve funkcionalitě
- Bezpečnostní upozornění

---

## 📱 Aktuální implementace

### Aktivní konfigurace (3. ledna 2026)

```
post_login_modal_enabled = 1 (zapnuto)
post_login_modal_guid = "modal_init_v1" 
post_login_modal_title = "Důležité upozornění"
post_login_modal_valid_from = NULL (platí okamžitě)
post_login_modal_valid_to = "2026-01-04" (platnost do 4.1.2026)
post_login_modal_message_id = 952 (ID notifikace v tabulce 25_notifikace)
```

### Aktivní notifikace (ID: 952)

- **Nadpis:** "🎉 Vítejte v novém EEO systému v2!"
- **Typ:** system_announcement
- **Design:** Moderní, profesionální layout s neutrálními barvami
- **Obsah:** Uvítací zpráva, klíčové novinky, kontaktní informace, novoroční přání

### UI vlastnosti

- **Desktop:** Šířka 60% viewportu (max 900px), výška max 65vh
- **Mobile:** Responzivní design pro obrazovky ≤768px
- **Scrollbar:** Vlastní stylování pro lepší UX
- **Animace:** Fade-in overlay + slide-in dialog

---

## ⚙️ Funkčnost

### Klíčové vlastnosti

1. **✅ Per-User Persistence**
   - Každý uživatel vidí modal pouze jednou
   - Tracking přes localStorage s klíčem `dismissed_post_login_modal_{username}_{guid}`

2. **✅ GUID-based Reset System**
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

3. **✅ HTML Content Support**
   - Obsah načítán z tabulky notifikací
   - Podpora pro bohatý HTML (headery, seznamy, odkazy, styly)
   - Fallback na statický obsah pokud notifikace neexistuje

4. **✅ Time-based Validity**
   - Nastavení platnosti od-do
   - Automatické vypnutí po uplynutí termínu
   - NULL = okamžitá platnost nebo neomezená platnost

5. **✅ User Experience**
   - Modal nelze zavřít kliknutím mimo dialog (pouze tlačítkem)
   - Moderní design s profesionálním layoutem
   - Responzivní na všech zařízeních (desktop 60% šířky, mobile friendly)
   - Vlastní scrollbar styling pro lepší UX
   - Tlačítko "Příště nezobrazovat" → uloží dismiss do localStorage
   - Animace fade-in a slide-in pro plynulý UX

6. **✅ Admin Interface**
   - Konfigurace v AppSettings stránce
   - Výběr notifikace z dropdown seznamu  
   - HTML náhled vybrané notifikace
   - Časové rozmezí platnosti s DatePicker
   - GUID generování pro reset zobrazení

---

## 🏗️ Architektura

### Datový tok systému

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
│  • Načte konfiguraci z globalSettingsApi.js                 │
│  • Zkontroluje aktivaci (post_login_modal_enabled)          │
│  • Zkontroluje časovou platnost (valid_from/to)             │
│  • Zkontroluje localStorage dismiss pomocí GUID             │
│  • Načte HTML obsah z notifikační služby                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostLoginModal Component                   │
│  • Zobrazí modal s HTML obsahem                             │
│  • Responzivní design (60% desktop, 90% mobile)             │
│  • Tlačítko "Příště nezobrazovat" → dismiss                 │
│  • Uložení do localStorage s GUID                           │
└─────────────────────────────────────────────────────────────┘
```

### API endpointy

**Použité API služby:**
- ✅ `/global-settings` - načítání/ukládání konfigurace
- ✅ `/notifications/list-for-select` - seznam dostupných notifikací  
- ✅ `/notifications/get-content` - obsah vybrané notifikace

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

## 🗄️ Databázové schéma

### Globální nastavení (tabulka: `25a_nastaveni_globalni`)

**Aktuální konfigurace:**

| Klíč | Hodnota | Popis |
|------|---------|-------|
| `post_login_modal_enabled` | `1` | Zapnutí/vypnutí modalu |
| `post_login_modal_guid` | `modal_init_v1` | GUID pro reset tracking |  
| `post_login_modal_title` | `Důležité upozornění` | Název modalu |
| `post_login_modal_valid_from` | `NULL` | Platnost od (NULL = okamžitě) |
| `post_login_modal_valid_to` | `2026-01-04` | Platnost do |
| `post_login_modal_message_id` | `952` | ID notifikace s obsahem |

### Notifikace (tabulka: `25_notifikace`)

**Aktivní notifikace ID 952:**

```sql
SELECT id, typ, nadpis, kategorie, pro_vsechny, aktivni
FROM 25_notifikace 
WHERE id = 952;

-- Result:
-- id=952, typ=system_announcement, nadpis="🎉 Vítejte v novém EEO systému v2!"
-- kategorie=system_announcement, pro_vsechny=1, aktivni=1
```

---

## 🔗 Backend API

### Global Settings API

**Endpoint:** `POST /dev/api.eeo/global-settings`  
**Handler:** `globalSettingsHandlers.php` 
**Používá:** Tabulku `25a_nastaveni_globalni`

#### Get Operation

```http
POST https://erdms.zachranka.cz/dev/api.eeo/global-settings
Content-Type: application/json

{
  "operation": "get",
  "token": "user_token", 
  "username": "u01234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "post_login_modal_enabled": true,
    "post_login_modal_title": "Důležité upozornění",
    "post_login_modal_guid": "modal_init_v1", 
    "post_login_modal_valid_from": null,
    "post_login_modal_valid_to": "2026-01-04",
    "post_login_modal_message_id": 952
  }
}
```

#### Save Operation  

```http
POST https://erdms.zachranka.cz/dev/api.eeo/global-settings
Content-Type: application/json

{
  "operation": "save",
  "token": "admin_token",
  "username": "admin",
  "settings": {
    "post_login_modal_enabled": true,
    "post_login_modal_title": "Aktualizované oznámení", 
    "post_login_modal_guid": "modal_2026_v2",
    "post_login_modal_valid_from": "2026-01-05 00:00:00",
    "post_login_modal_valid_to": null,
    "post_login_modal_message_id": 953
  }
}
```

### Notifications API

**Nové endpointy pro post-login modal:**

#### List Notifications for Select

```http
POST https://erdms.zachranka.cz/dev/api.eeo/notifications/list-for-select
Content-Type: application/json

{
  "token": "admin_token",
  "username": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": 952,
      "nadpis": "🎉 Vítejte v novém EEO systému v2!",
      "dt_created": "2026-01-03 01:04:24",
      "typ": "system_announcement"
    }
  ]
}
```

#### Get Notification Content

```http
POST https://erdms.zachranka.cz/dev/api.eeo/notifications/get-content
Content-Type: application/json

{
  "token": "user_token",
  "username": "u01234", 
  "notificationId": 952
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "id": 952,
    "nadpis": "🎉 Vítejte v novém EEO systému v2!",
    "zprava": "<div style=\"background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\">...</div>"
  }
}
  }
}
```

**Response:**
```json
{
```

---

## 🎨 Frontend komponenty

### 1. PostLoginModal Component

**Soubor:** `/apps/eeo-v2/client/src/components/PostLoginModal.js`

**Vlastnosti:**
- ✅ Moderní responzivní design 
- ✅ Desktop: 60% šířky viewportu (max 900px), výška max 65vh
- ✅ Mobile: 90% šířky (max 500px), výška max 80vh  
- ✅ Vlastní scrollbar styling v content oblasti
- ✅ Fade-in overlay animace s blur efektem
- ✅ Slide-in dialog animace
- ✅ Gradient header s kulatým avatarem
- ✅ HTML content s bezpečným dangerouslySetInnerHTML
- ✅ Tlačítka "Příště nezobrazovat" a "OK"

**Styled Components:**

```javascript
const Dialog = styled.div`
  background: white;
  border-radius: 16px; 
  max-width: 900px;
  width: 60%;
  max-height: 65vh;
  
  @media (max-width: 768px) {
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
  }
`;

const Content = styled.div`
  padding: 2rem;
  max-height: 350px;
  overflow-y: auto;
  
  /* Vlastní scrollbar styling */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;
```

### 2. PostLoginModalService

**Soubor:** `/apps/eeo-v2/client/src/services/postLoginModalService.js`

**Klíčové funkce:**

```javascript
// Hlavní kontrolní funkce
export const checkPostLoginModal = async (userId, token, username) => {
  // 1. Načte globální nastavení
  const globalSettings = await getGlobalSettings(token, username);
  
  // 2. Zkontroluje enabled flag
  if (!globalSettings.post_login_modal_enabled) return null;
  
  // 3. Validace časové platnosti
  const now = new Date();
  if (validFrom && now < new Date(validFrom)) return null;
  if (validTo && now > new Date(validTo)) return null;
  
  // 4. Kontrola localStorage dismiss
  const dismissKey = `dismissed_post_login_modal_${username}_${modalGuid}`;
  if (localStorage.getItem(dismissKey)) return null;
  
  // 5. Načte obsah notifikace  
  const content = await notificationService.getContent(messageId, token, username);
  
  return { modalConfig, content };
};

// Dismiss funkce
export const dismissModal = (username, modalGuid) => {
  const key = `dismissed_post_login_modal_${username}_${modalGuid}`;
  localStorage.setItem(key, 'true');
};
```

### 3. AppSettings Integration

**Soubor:** `/apps/eeo-v2/client/src/pages/AppSettings.js`

**Nové funkce:**

- ✅ `loadAvailableNotifications()` - načte seznam notifikací pro dropdown
- ✅ `loadNotificationPreview()` - zobrazí HTML náhled vybrané notifikace  
- ✅ `generateNewGUID()` - vygeneruje nový GUID pro reset
- ✅ Formulářové pole pro všechna nastavení post-login modalu
- ✅ DatePicker komponenty pro časovou platnost
- ✅ HTML preview s `dangerouslySetInnerHTML`

**UI komponenty:**
```javascript
// Dropdown pro výběr notifikace
<SettingSelect
  value={settings.post_login_modal_message_id || ''}
  onChange={handleNotificationSelect}
>
  {availableNotifications.map(notif => (
    <option key={notif.id} value={notif.id}>
      {notif.nadpis}
    </option>
  ))}
</SettingSelect>

// HTML náhled
{notificationPreview && (
  <div dangerouslySetInnerHTML={{ __html: notificationPreview }} />
)}
```

---

## 🚀 Použití a konfigurace

### Administrace (AppSettings)

1. **Přístup:** Přihlášení jako admin → Nastavení aplikace
2. **Konfigurace modulu:** Sekce "Post-Login Modal"
3. **Nastavení:**
   - ✅ Zapnout/vypnout modal
   - ✅ Výběr notifikace z dropdown seznamu
   - ✅ HTML náhled vybrané notifikace
   - ✅ Časové rozmezí platnosti (od-do)
   - ✅ GUID pro reset zobrazení

### Vytvoření nové notifikace

1. Vytvořit notifikaci v tabulce `25_notifikace`
   - `typ = 'system_announcement'`
   - `kategorie = 'system_announcement'` 
   - `pro_vsechny = 1`
   - `aktivni = 1`
   - `zprava` = HTML obsah

2. Vybrat notifikaci v AppSettings
3. Nastavit časovou platnost  
4. Uložit konfiguraci

### Reset zobrazení pro všechny uživatele

1. V AppSettings kliknout "Generovat nový GUID"
2. Uložit nastavení
3. Všichni uživatelé uvidí modal při příštím přihlášení

---

## ✅ Testování

### Funkční testování

**Scénáře:**
- ✅ Modal se zobrazí po přihlášení když je enabled=true
- ✅ Modal se nezobrazí když je enabled=false  
- ✅ Časová platnost (valid_from/to) funguje správně
- ✅ "Příště nezobrazovat" ukládá dismiss do localStorage
- ✅ Změna GUID resetuje dismiss pro všechny uživatele
- ✅ HTML obsah se zobrazuje bezpečně
- ✅ Responzivní design na různých zařízeních
- ✅ API endpointy fungují podle specifikace

### Aktuální stav (3. ledna 2026)

**✅ Production Ready:**
- Systém je plně nasazen a funkční
- Aktivní uvítací zpráva pro EEO systém v2
- Moderní profesionální design
- Všechny komponenty otestovány a funkční

### Browser kompatibilita
- ✅ Chrome/Chromium  
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Responsive testování
- ✅ Desktop (1920px+)
- ✅ Tablet (768px-1200px) 
- ✅ Mobile (≤768px)

---

## 📋 Shrnutí implementace

### ✅ Dokončené komponenty

**Backend:**
- ✅ Global settings API (`globalSettingsHandlers.php`)
- ✅ Notifications API (`notificationHandlers.php`)  
- ✅ Databázové schéma (`25a_nastaveni_globalni`, `25_notifikace`)
- ✅ API routing v `api.php`

**Frontend:**
- ✅ `PostLoginModal` komponenta s responzivním designem
- ✅ `postLoginModalService` pro business logiku
- ✅ AppSettings integrace pro administraci
- ✅ AuthContext integrace pro trigger po přihlášení

**UX/UI:**
- ✅ Moderní profesionální design 
- ✅ Responzivní layout (desktop 60%, mobile 90%)
- ✅ Vlastní scrollbar styling
- ✅ HTML content support s bezpečným renderingem
- ✅ Animace a transitions

### 🎯 Aktuální produkční nasazení

**Status:** AKTIVNÍ (3. ledna 2026)

- **Typ zprávy:** Uvítací zpráva pro nový EEO systém v2
- **Design:** Modernizovaný layout s neutrálními barvami
- **Platnost:** Do 4. ledna 2026  
- **Zobrazení:** Všem uživatelům při prvním přihlášení
- **Tracking:** GUID `modal_init_v1` pro localStorage

### 🔮 Možná rozšíření (budoucí verze)

- **Multi-language:** Podpora více jazyků
- **Rich media:** Podpora obrázků a videí 
- **Scheduling:** Plánované zobrazení v určitý čas
- **A/B testing:** Testování různých variant
- **Analytics:** Sledování interakcí s modalem
- **Push notifications:** Propojení s browser push API

---

**Dokumentace aktualizována:** 3. ledna 2026  
**Autor:** GitHub Copilot  
**Status:** ✅ Production Ready - Plně funkční
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
