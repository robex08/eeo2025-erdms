-- ════════════════════════════════════════════════════════════════════════════════
-- Generic Recipient System - JSON Migration
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- ÚČEL:
-- Přidání dvou nových polí do structure_json.edges[].data pro podporu
-- univerzálního Generic Recipient System:
--   1) recipient_type - TYP příjemce (KDO)
--   2) scope_filter - FILTR rozsahu (JAK)
--
-- MOTIVACE:
-- Nahrazení hardcoded rolí (AUTHOR_INFO, GUARANTOR_INFO) univerzálním systémem
-- který funguje pro všechny moduly (objednávky, faktury, TODOs, pokladna, ...).
--
-- DŮLEŽITÉ: 
-- Tabulka 25_hierarchie_vztahy již NEEXISTUJE!
-- Data jsou uložena v 25_hierarchie_profily.structure_json jako:
-- {
--   "nodes": [...],
--   "edges": [
--     {
--       "id": "edge-123",
--       "source": "template-id",
--       "target": "user-id",
--       "data": {
--         "recipientRole": "EXCEPTIONAL",
--         "sendEmail": true,
--         "sendInApp": true,
--         "onlyOrderParticipants": false,
--         "recipient_type": "USER",           ← PŘIDÁME
--         "scope_filter": "NONE"              ← PŘIDÁME
--       }
--     }
--   ]
-- }
--
-- DATUM: 2025-12-17
-- ════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- ℹ️  INFORMACE O HODNOTÁCH
-- ─────────────────────────────────────────────────────────────────────────────────
-- 
-- HODNOTY recipient_type (KDO dostane notifikaci):
--   • USER           - Konkrétní uživatel (existující funkcionalita)
--   • ROLE           - Všichni uživatelé s danou rolí (existující)
--   • GROUP          - Skupina uživatelů (existující)
--   • TRIGGER_USER   - Kdo akci vyvolal (nové - generic) ⭐
--   • ENTITY_AUTHOR  - Autor entity (tvůrce objednávky/faktury/...) (nové) ⭐
--   • ENTITY_OWNER   - Vlastník entity (garant/příkazce/...) (nové) ⭐
--   • ENTITY_GUARANTOR - Garant entity (nové) ⭐
--   • ENTITY_APPROVER  - Schvalovatel entity (nové) ⭐
-- 
-- HODNOTY scope_filter (JAK filtrovat příjemce):
--   • NONE                - Bez filtru (default pro zpětnou kompatibilitu)
--   • ALL                 - Všichni uživatelé daného typu
--   • LOCATION            - Jen z lokality entity
--   • DEPARTMENT          - Jen z úseku entity
--   • ENTITY_PARTICIPANTS - JEN účastníci TÉTO konkrétní entity ⭐ KLÍČOVÉ
-- 
-- ─────────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════════
-- ⚠️  POZNÁMKA PRO IMPLEMENTACI
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Protože data jsou v JSON, migrace se provede BACKEND KÓDEM:
--
-- 1. PHP skript načte všechny profily
-- 2. Pro každý profil:
--    a) Dekóduj structure_json
--    b) Pro každý edge v edges[]:
--       - Detekuj recipient_type z target node typu
--       - Nastav scope_filter na 'NONE' (default)
--       - Pokud edge.data.onlyOrderParticipants = true → scope_filter = 'ENTITY_PARTICIPANTS'
--    c) Enkóduj a ulož zpět
-- 3. Verifikace
--
-- ════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- KROK 1: Zobrazit aktuální stav (před migrací)
-- ─────────────────────────────────────────────────────────────────────────────────

SELECT 
  id,
  nazev,
  aktivni,
  JSON_LENGTH(structure_json, '$.nodes') as pocet_nodes,
  JSON_LENGTH(structure_json, '$.edges') as pocet_edges,
  CASE 
    WHEN structure_json IS NULL THEN '❌ NULL'
    WHEN structure_json = '' THEN '❌ PRÁZDNÉ'
    WHEN structure_json = '{"nodes":[],"edges":[]}' THEN '⚠️ PRÁZDNÁ STRUKTURA'
    ELSE '✅ DATA'
  END as structure_status
FROM 25_hierarchie_profily
ORDER BY aktivni DESC, nazev ASC;

-- ─────────────────────────────────────────────────────────────────────────────────
-- KROK 2: Testovací query - zjistit které edges mají recipientRole
-- ─────────────────────────────────────────────────────────────────────────────────

SELECT 
  p.id,
  p.nazev,
  edge.edge_id,
  edge.recipient_role,
  edge.only_order_participants,
  target_node.node_type as target_node_type
FROM 25_hierarchie_profily p
CROSS JOIN JSON_TABLE(
  p.structure_json,
  '$.edges[*]' COLUMNS(
    edge_id VARCHAR(100) PATH '$.id',
    target_id VARCHAR(100) PATH '$.target',
    recipient_role VARCHAR(50) PATH '$.data.recipientRole',
    only_order_participants BOOLEAN PATH '$.data.onlyOrderParticipants'
  )
) AS edge
LEFT JOIN JSON_TABLE(
  p.structure_json,
  '$.nodes[*]' COLUMNS(
    node_id VARCHAR(100) PATH '$.id',
    node_type VARCHAR(50) PATH '$.data.type'
  )
) AS target_node ON target_node.node_id = edge.target_id
WHERE p.aktivni = 1
LIMIT 50;

-- ════════════════════════════════════════════════════════════════════════════════
-- ⚠️  ROLLBACK (pokud by bylo potřeba):
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Nelze rollback v SQL, protože data jsou v JSON.
-- Použij GIT: git checkout HEAD -- 25_hierarchie_profily
-- Nebo RESTORE z backupu: BACKUP_GENERIC_RECIPIENT_*.sql
-- 
-- ════════════════════════════════════════════════════════════════════════════════
