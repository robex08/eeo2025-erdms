# Chybějící app_title v notifikačních šablonách

## Přehled šablon bez app_title

| ID | Type | Name | Email Subject | App Title | Status |
|---|---|---|---|---|---|
| **6** | `order_status_odeslana` | Objednávka odeslána dodavateli | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **9** | `order_status_dokoncena` | Objednávka dokončena | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **10** | `order_status_zrusena` | Objednávka zrušena | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **11** | `order_status_smazana` | Objednávka smazána | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **12** | `order_status_rozpracovana` | Objednávka rozpracována (koncept) | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **13** | `order_status_registr_ceka` | Objednávka čeká na zveřejnění v registru | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **15** | `order_status_faktura_ceka` | Objednávka čeká na přidání faktury | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **16** | `order_status_faktura_pridana` | K objednávce byla přidána faktura | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **18** | `order_status_faktura_uhrazena` | Faktura uhrazena | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **19** | `order_status_kontrola_ceka` | Objednávka čeká na kontrolu věcné správnosti | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **22** | `alarm_todo_normal` | TODO Alarm - Běžná připomínka | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **26** | `todo_assigned` | TODO - Nový úkol přiřazen | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **27** | `system_maintenance_scheduled` | Plánovaná údržba systému | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **28** | `system_maintenance_starting` | Údržba systému začíná | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **30** | `system_backup_completed` | Automatické zálohování dokončeno | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **31** | `system_update_available` | Dostupná aktualizace systému | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **33** | `system_security_alert` | Bezpečnostní upozornění | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **35** | `system_session_expired` | Relace vypršela | Vaše relace v systému vypršela | **❌ CHYBÍ** | Aktivní |
| **37** | `user_mention` | Zmínka v komentáři | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **39** | `order_unlock_forced` | Objednávka násilně odemknuta | *(prázdné)* | **❌ CHYBÍ** | Aktivní |
| **95** | `system_maintenance` | Plánovaná údržba systému | Plánovaná údržba systému - {maintenance_date} | **❌ CHYBÍ** | Aktivní |
| **111** | `order_comment_new` | Nový komentář k objednávce | Nový komentář - objednávka č. {order_number} | **❌ CHYBÍ** | Aktivní |

---

## Návrhy app_title pro chybějící šablony

### 📦 Objednávky (Orders)

| ID | Type | Navrhovaný app_title |
|---|---|---|
| 6 | `order_status_odeslana` | `📤 Odeslána dodavateli: {order_number}` |
| 9 | `order_status_dokoncena` | `✅ Dokončena: {order_number}` |
| 10 | `order_status_zrusena` | `❌ Zrušena: {order_number}` |
| 11 | `order_status_smazana` | `🗑️ Smazána: {order_number}` |
| 12 | `order_status_rozpracovana` | `✏️ Koncept: {order_number}` |
| 13 | `order_status_registr_ceka` | `📋 Čeká na registr: {order_number}` |
| 15 | `order_status_faktura_ceka` | `💰 Čeká na fakturu: {order_number}` |
| 16 | `order_status_faktura_pridana` | `📄 Faktura přidána: {order_number}` |
| 18 | `order_status_faktura_uhrazena` | `✅ Faktura uhrazena: {invoice_number}` |
| 19 | `order_status_kontrola_ceka` | `🔍 Čeká na kontrolu: {order_number}` |
| 39 | `order_unlock_forced` | `🔓 Násilně odemknuta: {order_number}` |

### 📌 TODO alarmy

| ID | Type | Navrhovaný app_title |
|---|---|---|
| 22 | `alarm_todo_normal` | `📌 Připomínka: {todo_title}` |
| 26 | `todo_assigned` | `📋 Nový úkol: {todo_title}` |

### 🔧 Systémové notifikace

| ID | Type | Navrhovaný app_title |
|---|---|---|
| 27 | `system_maintenance_scheduled` | `🔧 Plánovaná údržba: {maintenance_date}` |
| 28 | `system_maintenance_starting` | `⚠️ Údržba právě začíná` |
| 30 | `system_backup_completed` | `💾 Záloha dokončena` |
| 31 | `system_update_available` | `🆕 Aktualizace dostupná: {version}` |
| 33 | `system_security_alert` | `🚨 Bezpečnostní alert: {alert_type}` |
| 35 | `system_session_expired` | `⏱️ Relace vypršela` |
| 95 | `system_maintenance` | `🔧 Údržba: {maintenance_date}` |

### 💬 Ostatní

| ID | Type | Navrhovaný app_title |
|---|---|---|
| 37 | `user_mention` | `@️ Zmínka od {mention_author}` |
| 111 | `order_comment_new` | `💬 Nový komentář: {order_number}` |

---

## SQL dotaz pro doplnění app_title

```sql
-- Objednávky
UPDATE `25_notification_templates` SET `app_title` = '📤 Odeslána dodavateli: {order_number}' WHERE `id` = 6;
UPDATE `25_notification_templates` SET `app_title` = '✅ Dokončena: {order_number}' WHERE `id` = 9;
UPDATE `25_notification_templates` SET `app_title` = '❌ Zrušena: {order_number}' WHERE `id` = 10;
UPDATE `25_notification_templates` SET `app_title` = '🗑️ Smazána: {order_number}' WHERE `id` = 11;
UPDATE `25_notification_templates` SET `app_title` = '✏️ Koncept: {order_number}' WHERE `id` = 12;
UPDATE `25_notification_templates` SET `app_title` = '📋 Čeká na registr: {order_number}' WHERE `id` = 13;
UPDATE `25_notification_templates` SET `app_title` = '💰 Čeká na fakturu: {order_number}' WHERE `id` = 15;
UPDATE `25_notification_templates` SET `app_title` = '📄 Faktura přidána: {order_number}' WHERE `id` = 16;
UPDATE `25_notification_templates` SET `app_title` = '✅ Faktura uhrazena: {invoice_number}' WHERE `id` = 18;
UPDATE `25_notification_templates` SET `app_title` = '🔍 Čeká na kontrolu: {order_number}' WHERE `id` = 19;
UPDATE `25_notification_templates` SET `app_title` = '🔓 Násilně odemknuta: {order_number}' WHERE `id` = 39;

-- TODO
UPDATE `25_notification_templates` SET `app_title` = '📌 Připomínka: {todo_title}' WHERE `id` = 22;
UPDATE `25_notification_templates` SET `app_title` = '📋 Nový úkol: {todo_title}' WHERE `id` = 26;

-- Systém
UPDATE `25_notification_templates` SET `app_title` = '🔧 Plánovaná údržba: {maintenance_date}' WHERE `id` = 27;
UPDATE `25_notification_templates` SET `app_title` = '⚠️ Údržba právě začíná' WHERE `id` = 28;
UPDATE `25_notification_templates` SET `app_title` = '💾 Záloha dokončena' WHERE `id` = 30;
UPDATE `25_notification_templates` SET `app_title` = '🆕 Aktualizace dostupná: {version}' WHERE `id` = 31;
UPDATE `25_notification_templates` SET `app_title` = '🚨 Bezpečnostní alert: {alert_type}' WHERE `id` = 33;
UPDATE `25_notification_templates` SET `app_title` = '⏱️ Relace vypršela' WHERE `id` = 35;
UPDATE `25_notification_templates` SET `app_title` = '🔧 Údržba: {maintenance_date}' WHERE `id` = 95;

-- Ostatní
UPDATE `25_notification_templates` SET `app_title` = '@️ Zmínka od {mention_author}' WHERE `id` = 37;
UPDATE `25_notification_templates` SET `app_title` = '💬 Nový komentář: {order_number}' WHERE `id` = 111;
```

---

## Statistika

- **Celkem šablon**: 48
- **Aktivních šablon**: 45
- **Šablon s app_title**: 26
- **❌ Šablon BEZ app_title**: 22
- **Deprecated šablony** (neaktivní): 3 (ID: 40, 41, 42)

---

## Poznámky

1. **app_title** se zobrazuje v notifikační bublině v aplikaci (zvoneček, NotificationDropdown)
2. **email_subject** se používá pro emailové notifikace
3. **app_message** je detailní text zprávy v aplikaci
4. Používám emoji ikony pro lepší vizuální rozlišení typů notifikací
5. Placeholdery typu `{order_number}`, `{todo_title}` atd. se automaticky nahrazují backend systémem
