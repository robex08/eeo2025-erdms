# Instalace notifikačních preferencí - README

## 📋 Co bylo implementováno

**Datum:** 16. prosince 2025  
**Branch:** feature/orderform25-sprint1-cleanup  
**Commits:**
- `1dd8130` - feat: Add user notification preferences (3-level control)
- `912937d` - fix: Update notification preferences for Czech table names

## ✅ Provedené změny

### 1. SQL Migrace
- **Soubor:** `/var/www/erdms-dev/ALTER_ADD_NOTIFICATION_SETTINGS.sql`
- **Stav:** ✅ Aplikováno na eeo2025 DB (10.3.172.11)
- **Výsledek:**
  - 3 globální nastavení v `25a_nastaveni_globalni`
  - Připraveno pro uživatelská nastavení v `25_uzivatel_nastaveni`

### 2. Backend API
- **Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`
- **Nové funkce:**
  - `getUserNotificationPreferences($db, $userId)` - načte preference
  - `handle_notifications_user_preferences()` - GET API
  - `handle_notifications_user_preferences_update()` - POST API
- **Upraveno:** `findNotificationRecipients()` - kontroluje preference před odesláním

### 3. API Endpointy
- **Soubor:** `apps/eeo-v2/api-legacy/api.eeo/api.php`
- **Nové routes:**
  - `GET/POST /notifications/user-preferences`
  - `POST /notifications/user-preferences/update`

### 4. Dokumentace
- **Soubor:** `docs/development/NOTIFICATION-CENTER-ARCHITECTURE.md`
- Kompletní popis 3-úrovňového systému kontroly

## 🔐 Struktura preferencí

### Globální nastavení (25a_nastaveni_globalni)
```sql
notifikace_system_povoleny = 1  -- Celý systém ON/OFF
notifikace_email_povoleny = 1   -- Email kanál
notifikace_inapp_povoleny = 1   -- In-app kanál
```

### Uživatelská nastavení (25_uzivatel_nastaveni)
```json
{
  "notifikace_povoleny": true,
  "notifikace_email_povoleny": true,
  "notifikace_inapp_povoleny": true,
  "notifikace_kategorie": {
    "objednavky": true,
    "faktury": true,
    "smlouvy": true,
    "pokladna": true
  }
}
```

## 🚀 Použití API

### Načtení preferencí
```bash
curl -X POST https://your-domain/api.eeo/notifications/user-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "username": "robert.holovsky",
    "token": "xxx"
  }'
```

### Uložení preferencí
```bash
curl -X POST https://your-domain/api.eeo/notifications/user-preferences/update \
  -H "Content-Type: application/json" \
  -d '{
    "username": "robert.holovsky",
    "token": "xxx",
    "enabled": true,
    "email_enabled": false,
    "inapp_enabled": true,
    "categories": {
      "orders": true,
      "invoices": false,
      "contracts": true,
      "cashbook": true
    }
  }'
```

**Poznámka:** API přijímá anglické klíče (`orders`, `invoices`), ale ukládá české (`objednavky`, `faktury`).

## 🔧 Automatická kontrola

Router `notificationRouter()` automaticky:
1. Zkontroluje globální nastavení (25a_nastaveni_globalni)
2. Pro každého příjemce načte jeho preference (25_uzivatel_nastaveni)
3. Přeskočí uživatele s vypnutými notifikacemi
4. Přeskočí kategorie, které má uživatel vypnuté
5. Aplikuje channel preferences (email/inapp)

## ⚠️ Důležité poznámky

1. **Existující uživatelé:** Všichni aktivní uživatelé mají výchozí preference (vše povoleno)
2. **Stará data:** Existující záznamy v `25_uzivatel_nastaveni` nejsou přepsány - admin může upravit později
3. **Mapování:** API používá anglické klíče, DB české názvy
4. **Kompatibilita:** Funguje s MySQL 5.5 (bez JSON_MERGE)

## 📝 TODO

- [ ] Frontend UI pro správu preferencí (User Profile)
- [ ] Admin panel pro globální nastavení
- [ ] Migrace stávajících user settings (přidat notifikační klíče)
- [ ] Testing s reálnými uživateli

## 🔄 Rollback

V případě problémů:
```bash
git checkout backup/before-notification-prefs-20251216-133424
```

Nebo SQL rollback:
```sql
DELETE FROM 25a_nastaveni_globalni WHERE klic LIKE 'notifikace_%';
-- Ponechat 25_uzivatel_nastaveni (stará data zůstanou)
```

## ✅ Ověření

Zkontrolovat, že všechno funguje:
```bash
# Globální nastavení
mysql -h 10.3.172.11 -u erdms_user -p'...' eeo2025 \
  -e "SELECT klic, hodnota FROM 25a_nastaveni_globalni WHERE klic LIKE 'notifikace_%';"

# PHP syntax
php -l apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php

# API test (přes curl nebo Postman)
```

---

**Status:** ✅ HOTOVO - Připraveno k testování  
**Git backup:** `backup/before-notification-prefs-20251216-133424`
