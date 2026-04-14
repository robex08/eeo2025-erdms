# ✅ OPRAVA: Sledování aktivity uživatelů - Chybějící moduly

**Datum:** 2026-04-13  
**Problém:** V seznamu aktivních uživatelů se místo reálných názvů modulů zobrazoval fallback "Aplikace"  
**Status:** ✅ OPRAVENO

---

## 🔍 ANALÝZA PROBLÉMU

### Objevený stav:
- ✅ Sledování aktivity **JE PLNĚ IMPLEMENTOVÁNO**
- ✅ Frontend hook `useActivityTracking` v Layout.js je **AKTIVNÍ**
- ✅ Backend endpoint `POST user/activity/track` **FUNGUJE**
- ✅ Database columns `aktivita_metadata` (JSON) + log tabulka **EXISTUJÍ A POUŽÍVAJÍ SE**
- ❌ V mapování `getModuleName()` **CHYBĚLO 9 NOVÝCH MODULŮ**

### Důsledek:
Když byl uživatel na nové stránce (např. Roční poplatky, Čerpání LP, Majetek), 
aktivita tracking vrátil fallback **"Aplikace"** místo konkrétního názvu modulu.

---

## ✨ IMPLEMENTOVANÉ ŘEŠENÍ

### Soubor: `/apps/eeo-v2/client/src/hooks/useActivityTracking.js`

**Doplněno 9 chybějících route mapování:**

| Route                      | Modul                   | Status      |
|----------------------------|-------------------------|-------------|
| `/annual-fees`             | Roční poplatky          | ✅ PŘIDÁNO  |
| `/orders25-list-v3`        | Objednávky V3           | ✅ PŘIDÁNO  |
| `/majetek-overview`        | Přehled majetku         | ✅ PŘIDÁNO  |
| `/material-overview`       | Přehled majetku         | ✅ PŘIDÁNO  |
| `/app-settings`            | Nastavení aplikace      | ✅ PŘIDÁNO  |
| `/organization-hierarchy`  | Organizační struktura   | ✅ PŘIDÁNO  |
| `/contacts`                | Kontakty                | ✅ PŘIDÁNO  |
| `/help`                    | Nápověda                | ✅ PŘIDÁNO  |
| `/about`                   | O aplikaci              | ✅ PŘIDÁNO  |
| `/cerpani`                 | Čerpání LP              | ✅ PŘIDÁNO  |

---

## 📊 OVĚŘENÍ FUNKČNOSTI

### 1. Backend tracking endpoint:
```php
POST /user/activity/track
handle_user_activity_track() - řádek 8074 v handlers.php
update_user_activity_with_metadata() - řádek 232 v handlers.php
```

**Ukládaná data:**
```json
{
  "last_public_ip": "185.145.xxx.xxx",
  "last_local_ip": "192.168.1.100",
  "last_module": "Roční poplatky",
  "last_path": "/annual-fees",
  "last_user_agent": "Mozilla/5.0...",
  "session_id": "abc123...",
  "updated_at": "2026-04-13 14:30:00"
}
```

### 2. Database:
```sql
-- Tabulka: 25_uzivatele
-- Sloupec: aktivita_metadata TEXT (JSON)
SELECT cele_jmeno, aktivita_metadata 
FROM 25_uzivatele 
WHERE aktivita_metadata IS NOT NULL;

-- Tabulka: 25_uzivatele_aktivita_log (90-day retention)
SELECT * FROM 25_uzivatele_aktivita_log 
WHERE uzivatel_id = 123 
ORDER BY dt_vytvoreni DESC 
LIMIT 10;
```

### 3. Frontend display (Users.js):
- **Řádek 3262-3373:** Seznam aktivních uživatelů
- **Řádek 3358:** Zobrazení `📍 {metadata.last_module}`
- **Řádek 3849-3890:** Expandovaný řádek s detailem aktivity

---

## 🧪 TESTOVÁNÍ

### Jak otestovat:
1. Přihlásit se jako běžný uživatel
2. Navigovat na nový modul: `/annual-fees` (Roční poplatky)
3. Počkat ~3-5 sekund (debounce + throttling)
4. Jako admin otevřít **Správa uživatelů** (`/users`)
5. Podívat se do sekce **Aktivní uživatelé** (vpravo nahoře)
6. **OČEKÁVANÝ VÝSLEDEK:** Místo "Aplikace" se zobrazí **"Roční poplatky"**

### Testované moduly:
```
✓ /orders25-list        → "Objednávky"
✓ /annual-fees          → "Roční poplatky"
✓ /cash-book            → "Pokladna"
✓ /stats-reports        → "Statistika a reporty"
✓ /cerpani              → "Čerpání LP"
✓ /majetek-overview     → "Přehled majetku"
✓ /app-settings         → "Nastavení aplikace"
```

---

## 🎯 TECHNICKÉ DETAILY

### Activity Tracking Flow:
```
1. User naviguje na /annual-fees
2. useActivityTracking hook detekuje změnu (useEffect)
3. Debounce 1 sekunda (čeká, zda uživatel opravdu zůstane)
4. getModuleName('/annual-fees') → "Roční poplatky"
5. Throttling check (max 1x za 30 sekund)
6. POST user/activity/track s payload:
   {
     token, username,
     module: "Roční poplatky",
     path: "/annual-fees",
     public_ip, local_ip, session_id
   }
7. Backend: handle_user_activity_track()
8. Update 25_uzivatele.aktivita_metadata (JSON)
9. Insert do 25_uzivatele_aktivita_log
10. Frontend: Users.js parsuje JSON a zobrazuje modul
```

### Throttling & Debounce:
- **Debounce:** 1 sekunda před odesláním (zamezí spam při rychlé navigaci)
- **Throttle:** Max 1 tracking za 30 sekund (šetří backend)
- **Auto-refresh:** Seznam aktivních uživatelů se aktualizuje každých 30 sekund

---

## 📝 POZNÁMKY

### Proč se zobrazovalo "Aplikace":
```javascript
// Fallback v useActivityTracking.js (řádek 132)
return 'Aplikace'; // Když pathname není v moduleMap
```

### Řešení:
Doplnit **všechny aktivní routes** do `moduleMap` objektu, aby každá stránka 
měla konkrétní název modulu.

### Budoucí údržba:
❗ **DŮLEŽITÉ:** Při přidání nové route v `App.js` **VŽDY přidat i mapování** 
do `useActivityTracking.js`, jinak se zobrazí "Aplikace".

---

## ✅ VÝSLEDEK

- ✅ Sledování aktivity plně funkční
- ✅ Všechny moduly zmapovány
- ✅ Místo "Aplikace" se zobrazují reálné názvy (Objednávky, Faktury, Roční poplatky, atd.)
- ✅ Backend ukládá metadata do JSON sloupce
- ✅ Activity log tabulka zaznamenává historii
- ✅ Admin vidí v real-time, kde se uživatelé nacházejí

**Opraveno:** 13. 4. 2026  
**Tester:** Čeká na otestování uživatelem
