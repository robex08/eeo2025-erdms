# DB změny – log (DEV → později PROD)

> Účel: evidovat všechny zásahy do DB v rámci úprav EEO v2, aby šly následně bezpečně přenést do produkce (po potvrzení).

---

## 2026-02-14 – Komentáře objednávek: event typy + šablony notifikací

**Cíl:** aby se v org-hierarchii/Notification Center zobrazovaly typy událostí pro komentáře (ne jen reply) a aby existovaly šablony.

**DB:** DEV `EEO-OSTRA-DEV`

**Tabulky:**
- `25_notifikace_typy_udalosti`
- `25_notifikace_sablony`

**Operace:** Upsert (INSERT … ON DUPLICATE KEY UPDATE) pro:
- `ORDER_COMMENT_ADDED` (přidání komentáře k objednávce)
- `COMMENT_REPLY` (odpověď na komentář)

**SQL podklad:** viz [eeo-v2/SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql](SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql)

**Poznámky / výsledek:**
- Před i po operaci byly oba záznamy v DEV DB již přítomné (operace byla idempotentní).
- Byl použit bezpečnostní guard proti omylem cílení na produkci: pokud `DB_NAME=eeo2025`, operace se ukončí.

**Ověření (SELECT):**
- `SELECT id,kod,nazev,aktivni FROM 25_notifikace_typy_udalosti WHERE kod IN ('ORDER_COMMENT_ADDED','COMMENT_REPLY');`
- `SELECT id,typ,nazev,aktivni FROM 25_notifikace_sablony WHERE typ IN ('ORDER_COMMENT_ADDED','COMMENT_REPLY');`

---

## 2026-02-14 – PRODUKCE: full backup DB (před aplikací změn)

**DB:** PROD `eeo2025`

**Operace:** full dump DB (gzip)

**Výstup:**
- `/var/www/__BCK_PRODUKCE/eeo2025-full-20260214-150320/db-eeo2025-20260214-150320.sql.gz`

**Navazující krok (čeká na dokončení/ověření):**

## 2026-02-14 – PRODUKCE: aplikace komentářových notifikací (event types + šablony)

**DB:** PROD `eeo2025`

**Operace:** UPSERT (INSERT … ON DUPLICATE KEY UPDATE)
- `25_notifikace_typy_udalosti`: `ORDER_COMMENT_ADDED`, `COMMENT_REPLY`
- `25_notifikace_sablony`: `ORDER_COMMENT_ADDED`, `COMMENT_REPLY`

**SQL podklad:** viz [eeo-v2/SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql](SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql)

**Ověření (SELECT výstup OK):**
- Oba event typy existují a jsou `aktivni=1`
- Obě šablony existují a jsou `aktivni=1`

---

## 2026-02-14 – Oprava „�“ na začátku notifikace (odesláno dodavateli)

**Projev:** V hlavičce notifikace se na začátku objevoval rozbitý znak `�` (šlo o emoji `📤`), např.:
`� Odeslána dodavateli: ...`

**Příčina:** Emoji bylo přímo natvrdo v `app_nadpis` šablony `order_status_odeslana`.

**DB:** DEV `EEO-OSTRA-DEV` + PROD `eeo2025`

**Tabulka:** `25_notifikace_sablony`

**Změna:**
- `typ = 'order_status_odeslana'`
- `app_nadpis`: z `📤 Odeslána dodavateli: {order_number}` → `Odeslána dodavateli: {order_number}`

**SQL:**
- `UPDATE 25_notifikace_sablony SET app_nadpis = 'Odeslána dodavateli: {order_number}' WHERE typ = 'order_status_odeslana' LIMIT 1;`

---

## 2026-02-14 – Hromadné vyčištění emoji z in-app šablon (prevence „�“)

**Cíl:** odstranit emoji prefixy z `app_nadpis` / `app_zprava` u in-app šablon, aby se v některých prostředích neukazoval rozbitý znak `�`.

**DB:** DEV `EEO-OSTRA-DEV` + PROD `eeo2025`

**Tabulka:** `25_notifikace_sablony`

**Změna (bez zásahu do placeholderů):** odstranění prefixů jako `⚠️ `, `✅ `, `❌ `, `⏳ `, `📤 `, `🔒 `, `🔓 ` na začátku textu.

**Dotčené typy (minimálně):**
- `order_status_ceka_potvrzeni`
- `order_status_potvrzena`
- `order_status_kontrola_potvrzena`
- `order_status_kontrola_zamitnuta`
- `alarm_todo_high`
- `alarm_todo_expired`
- `todo_completed`
- `system_maintenance_finished`
- `system_update_installed`
- `system_user_login_alert`
- `system_storage_warning`
- `order_vecna_spravnost_zamitnuta`
- `invoice_returned`
- `cashbook_month_locked`

**Ověření:** po updatech vyšel počet šablon s emoji v `app_nadpis` a `app_zprava` na 0 (kontrola přes REGEXP).
