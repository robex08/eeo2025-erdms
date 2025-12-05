-- ============================================================================
-- Doplnění chybějících app_title v notifikačních šablonách
-- Database: evidence_smluv
-- Table: 25_notification_templates
-- MySQL 5.5.43 compatible (bez emoji)
-- Datum: 5. listopadu 2025
-- ============================================================================

-- OBJEDNÁVKY - Stavy objednávek
-- ============================================================================

UPDATE `25_notification_templates` 
SET `app_title` = 'Odeslána dodavateli: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 6;

UPDATE `25_notification_templates` 
SET `app_title` = 'Dokončena: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 9;

UPDATE `25_notification_templates` 
SET `app_title` = 'Zrušena: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 10;

UPDATE `25_notification_templates` 
SET `app_title` = 'Smazána: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 11;

UPDATE `25_notification_templates` 
SET `app_title` = 'Koncept: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 12;

UPDATE `25_notification_templates` 
SET `app_title` = 'Čeká na zveřejnění v registru: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 13;

UPDATE `25_notification_templates` 
SET `app_title` = 'Čeká na přidání faktury: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 15;

UPDATE `25_notification_templates` 
SET `app_title` = 'Faktura přidána: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 16;

UPDATE `25_notification_templates` 
SET `app_title` = 'Faktura uhrazena: {invoice_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 18;

UPDATE `25_notification_templates` 
SET `app_title` = 'Čeká na kontrolu věcné správnosti: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 19;

UPDATE `25_notification_templates` 
SET `app_title` = 'Násilně odemknuta: {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 39;


-- TODO ALARMY A ÚKOLY
-- ============================================================================

UPDATE `25_notification_templates` 
SET `app_title` = 'Připomínka úkolu: {todo_title}', 
    `dt_updated` = NOW() 
WHERE `id` = 22;

UPDATE `25_notification_templates` 
SET `app_title` = 'Nový úkol přiřazen: {todo_title}', 
    `dt_updated` = NOW() 
WHERE `id` = 26;


-- SYSTÉMOVÉ NOTIFIKACE
-- ============================================================================

UPDATE `25_notification_templates` 
SET `app_title` = 'Plánovaná údržba systému: {maintenance_date}', 
    `dt_updated` = NOW() 
WHERE `id` = 27;

UPDATE `25_notification_templates` 
SET `app_title` = 'Údržba systému právě začíná', 
    `dt_updated` = NOW() 
WHERE `id` = 28;

UPDATE `25_notification_templates` 
SET `app_title` = 'Automatická záloha dokončena', 
    `dt_updated` = NOW() 
WHERE `id` = 30;

UPDATE `25_notification_templates` 
SET `app_title` = 'Aktualizace systému dostupná: verze {version}', 
    `dt_updated` = NOW() 
WHERE `id` = 31;

UPDATE `25_notification_templates` 
SET `app_title` = 'BEZPEČNOSTNÍ ALERT: {alert_type}', 
    `dt_updated` = NOW() 
WHERE `id` = 33;

UPDATE `25_notification_templates` 
SET `app_title` = 'Vaše relace vypršela', 
    `dt_updated` = NOW() 
WHERE `id` = 35;

UPDATE `25_notification_templates` 
SET `app_title` = 'Plánovaná údržba: {maintenance_date}', 
    `dt_updated` = NOW() 
WHERE `id` = 95;


-- KOMENTÁŘE A ZMÍNKY
-- ============================================================================

UPDATE `25_notification_templates` 
SET `app_title` = 'Byl(a) jste zmíněn(a) uživatelem {mention_author}', 
    `dt_updated` = NOW() 
WHERE `id` = 37;

UPDATE `25_notification_templates` 
SET `app_title` = 'Nový komentář k objednávce {order_number}', 
    `dt_updated` = NOW() 
WHERE `id` = 111;


-- ============================================================================
-- KONEC AKTUALIZACE
-- Celkem aktualizováno: 22 záznamů
-- ============================================================================

-- Kontrolní dotaz - zobrazí všechny aktualizované záznamy
SELECT 
    id, 
    type, 
    name, 
    app_title, 
    dt_updated 
FROM `25_notification_templates` 
WHERE id IN (6, 9, 10, 11, 12, 13, 15, 16, 18, 19, 22, 26, 27, 28, 30, 31, 33, 35, 37, 39, 95, 111)
ORDER BY id;
