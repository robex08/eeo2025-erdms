# ============================================================================
# MIGRATION: Práva pro modul Ročních poplatků (Annual Fees)
# ============================================================================
#
# 📝 POPIS: 
# Přidání práv pro nový modul správy ročních poplatků podle standardního
# vzoru ostatních modulů (MANAGE + CRUD operace)
#
# 🔧 APLIKACE:
# - DEV databáze: EEO-OSTRA-DEV 
# - PROD databáze: eeo2025 (po schválení)
#
# 📅 DATUM: 2026-01-31
# ============================================================================

USE `EEO-OSTRA-DEV`;

-- ============================================================================
-- 1. PŘIDÁNÍ PRÁV PRO ROČNÍ POPLATKY
-- ============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES 
-- MANAGE právo (kompletní správa modulu)
('ANNUAL_FEES_MANAGE', 'Kompletní správa ročních poplatků (všechna práva)', 1),

-- CRUD práva (detailní oprávnění)
('ANNUAL_FEES_CREATE', 'Vytváření nových ročních poplatků', 1),
('ANNUAL_FEES_VIEW', 'Zobrazení ročních poplatků (read-only)', 1), 
('ANNUAL_FEES_EDIT', 'Editace existujících ročních poplatků', 1),
('ANNUAL_FEES_DELETE', 'Mazání ročních poplatků', 1),

-- Speciální práva pro položky
('ANNUAL_FEES_ITEM_CREATE', 'Přidávání položek do ročních poplatků', 1),
('ANNUAL_FEES_ITEM_UPDATE', 'Editace položek ročních poplatků (změna stavu, částky)', 1),
('ANNUAL_FEES_ITEM_DELETE', 'Mazání položek ročních poplatků', 1),
('ANNUAL_FEES_ITEM_PAYMENT', 'Označování položek ročních poplatků jako zaplaceno/nezaplaceno', 1);

-- ============================================================================
-- 2. OVĚŘENÍ PŘIDANÝCH PRÁV
-- ============================================================================

SELECT 'ANNUAL FEES PRÁVA - KONTROLA:' as Status;
SELECT id, kod_prava, popis, aktivni 
FROM `25_prava` 
WHERE kod_prava LIKE 'ANNUAL_FEES_%' 
ORDER BY kod_prava;

-- ============================================================================
-- 3. POZNÁMKY K IMPLEMENTACI
-- ============================================================================

/*
📋 HIERARCHIE PRÁV:

1. ANNUAL_FEES_MANAGE - Superuser právo
   ✅ Může vše (vytváření, editace, mazání, správa položek)
   ✅ Vidí všechny roční poplatky všech útvarů
   ✅ Může měnit stavy položek
   ✅ Může regenerovat položky

2. ANNUAL_FEES_CREATE - Vytváření 
   ✅ Může vytvářet nové roční poplatky
   ✅ Automaticky generuje položky podle typu platby

3. ANNUAL_FEES_READ - Čtení
   ✅ Zobrazení seznamu a detailů
   ✅ Omezeno podle hierarchie uživatele (vlastní útvar + podřízené)
   
4. ANNUAL_FEES_UPDATE - Editace
   ✅ Editace hlavních údajů (název, částka, poznámka)
   ✅ Změna roku, druhu, typu platby
   
5. ANNUAL_FEES_DELETE - Mazání
   ✅ Mazání celých ročních poplatků
   ✅ Pouze pokud nejsou zaplacené položky

6. ANNUAL_FEES_ITEM_* - Položky
   ✅ ITEM_CREATE: Přidávání nových položek
   ✅ ITEM_UPDATE: Změna stavu, částky, dat
   ✅ ITEM_DELETE: Mazání nezaplacených položek

🔧 IMPLEMENTACE V KÓDU:
- Backend: annualFeesHandlers.php (kontroly práv)
- Frontend: AnnualFeesPage.js (zobrazení/skrytí tlačítek)
- API: auth middleware před každým endpointem
- Menu: podmíněné zobrazení odkazu
*/

-- ============================================================================
-- 4. PŘIŘAZENÍ PRÁV ADMIN ROLÍM (DOČASNĚ PRO TESTOVÁNÍ)
-- ============================================================================

-- Admin role dostane MANAGE právo (předpokládám že admin má role_id = 1)
INSERT IGNORE INTO `25_role_prava` (`role_id`, `pravo_id`)
SELECT 1, p.id 
FROM `25_prava` p 
WHERE p.kod_prava = 'ANNUAL_FEES_MANAGE';

SELECT 'PRÁVA PŘIŘAZENA ADMIN ROLI' as Status;

-- ============================================================================
-- 5. FINALIZACE
-- ============================================================================

SELECT 'MIGRACE PRÁV PRO ROČNÍ POPLATKY DOKONČENA ✅' as Status;
SELECT CONCAT('Přidáno práv: ', COUNT(*)) as Statistika
FROM `25_prava` 
WHERE kod_prava LIKE 'ANNUAL_FEES_%';