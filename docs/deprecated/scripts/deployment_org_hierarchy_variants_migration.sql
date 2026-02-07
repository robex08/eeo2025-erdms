-- ═══════════════════════════════════════════════════════════════════
-- ORGANIZAČNÍ HIERARCHIE - MIGRACE NA NOVOU STRUKTURU VARIANT
-- ═══════════════════════════════════════════════════════════════════
-- Datum: 2026-01-03
-- Účel: Refaktoring notifikační architektury
--       NODE obsahuje varianty (WARNING, URGENT, INFO)
--       EDGE určuje která varianta se použije
-- ═══════════════════════════════════════════════════════════════════

USE eeo2025_dev;

-- ═══════════════════════════════════════════════════════════════════
-- 1. BACKUP SOUČASNÉHO STAVU
-- ═══════════════════════════════════════════════════════════════════

-- Vytvořit backup tabulku
CREATE TABLE IF NOT EXISTS 25_notifikace_hierarchie_profily_backup_20260103 
SELECT * FROM 25_notifikace_hierarchie_profily;

SELECT 
    '✅ Backup vytvořen' AS status,
    COUNT(*) AS pocet_zaznamu 
FROM 25_notifikace_hierarchie_profily_backup_20260103;

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRACE SOUČASNÉ STRUKTURY NA NOVOU
-- ═══════════════════════════════════════════════════════════════════

-- Aktualizovat aktivní profil - přidat variants do NODE struktur
UPDATE 25_notifikace_hierarchie_profily
SET structure_json = JSON_SET(
    structure_json,
    '$.migrated_to_variants',
    TRUE
),
updated_at = NOW()
WHERE aktivni = 1;

-- ═══════════════════════════════════════════════════════════════════
-- 3. VYTVOŘENÍ EXAMPLE STRUKTURY S VARIANTAMI
-- ═══════════════════════════════════════════════════════════════════

-- Příklad nové struktury pro reference:
/*
{
  "nodes": [
    {
      "id": "node-template-schvalena",
      "typ": "template",
      "position": { "x": 100, "y": 100 },
      "data": {
        "name": "Objednávka schválena",
        "description": "Notifikace při schválení objednávky",
        "eventTypes": ["order_status_schvalena"],
        
        "variants": {
          "WARNING": {
            "templateId": 123,
            "name": "Schválení - kritická urgentní",
            "htmlVariant": "APPROVER_URGENT",
            "priority": "critical",
            "color": "#ef4444",
            "icon": "⚠️"
          },
          "URGENT": {
            "templateId": 124,
            "name": "Schválení - urgentní",
            "htmlVariant": "APPROVER_NORMAL",
            "priority": "urgent",
            "color": "#f59e0b",
            "icon": "🔶"
          },
          "INFO": {
            "templateId": 125,
            "name": "Schválení - informační",
            "htmlVariant": "SUBMITTER",
            "priority": "info",
            "color": "#10b981",
            "icon": "ℹ️"
          }
        },
        
        "defaultVariant": "INFO",
        
        "metadata": {
          "created_at": "2026-01-03",
          "migrated_from_old_structure": true
        }
      }
    }
  ],
  
  "edges": [
    {
      "id": "edge-1",
      "source": "node-template-schvalena",
      "target": "node-role-schvalovatel",
      "data": {
        "recipient_type": "ENTITY_APPROVER",
        "scope_filter": "PARTICIPANTS_ALL",
        
        "variant": "WARNING",
        
        "conditions": {
          "amount_gte": 100000,
          "lp_required": true
        },
        
        "sendEmail": true,
        "sendInApp": true,
        
        "source_info_recipients": {
          "enabled": false
        },
        
        "metadata": {
          "created_at": "2026-01-03",
          "description": "Schvalovatelé - WARNING pro částky >= 100k"
        }
      }
    },
    {
      "id": "edge-2",
      "source": "node-template-schvalena",
      "target": "node-entity-garant",
      "data": {
        "recipient_type": "ENTITY_GUARANTOR",
        "variant": "INFO",
        "sendEmail": true,
        "sendInApp": true
      }
    }
  ]
}
*/

-- ═══════════════════════════════════════════════════════════════════
-- 4. OVĚŘENÍ
-- ═══════════════════════════════════════════════════════════════════

SELECT 
    id,
    nazev,
    aktivni,
    JSON_EXTRACT(structure_json, '$.migrated_to_variants') AS migrovano,
    created_at,
    updated_at
FROM 25_notifikace_hierarchie_profily
WHERE aktivni = 1;

-- ═══════════════════════════════════════════════════════════════════
-- 5. POZNÁMKY PRO MANUÁLNÍ MIGRACI
-- ═══════════════════════════════════════════════════════════════════

/*
POSTUP MANUÁLNÍ MIGRACE:

1. Pro každý TEMPLATE NODE:
   - Zachovat eventTypes
   - Převést normalVariant → variants.INFO.htmlVariant
   - Převést urgentVariant → variants.URGENT.htmlVariant
   - Převést infoVariant → variants.INFO.htmlVariant (pokud jiný než normalVariant)
   - Přidat templateId pro každou variantu (z DB 25_notification_templates)

2. Pro každý EDGE:
   - Přidat property "variant": "WARNING" | "URGENT" | "INFO"
   - Podle recipientRole určit výchozí variantu:
     * EXCEPTIONAL → WARNING
     * APPROVAL → URGENT
     * INFO → INFO
   - Volitelně přidat "conditions" pro podmíněné použití

3. Odstranit z EDGE:
   - recipientRole (nahrazeno "variant")
   - Nepotřebné reference na varianty (jsou na NODE)

PŘÍKLAD TRANSFORMACE:

PŘED:
node.data = {
  name: "Schvalovatel",
  normalVariant: "APPROVER_NORMAL",
  urgentVariant: "APPROVER_URGENT",
  infoVariant: "SUBMITTER",
  eventTypes: ["order_status_schvalena"]
}

edge.data = {
  recipientRole: "APPROVAL"
}

PO:
node.data = {
  name: "Objednávka schválena",  // ZMĚNA NÁZVU!
  eventTypes: ["order_status_schvalena"],
  variants: {
    URGENT: { templateId: 124, htmlVariant: "APPROVER_NORMAL" },
    INFO: { templateId: 125, htmlVariant: "SUBMITTER" }
  },
  defaultVariant: "INFO"
}

edge.data = {
  variant: "URGENT"  // Místo recipientRole
}
*/

-- ═══════════════════════════════════════════════════════════════════
-- 6. ROLLBACK (POKUD POTŘEBA)
-- ═══════════════════════════════════════════════════════════════════

/*
-- Vrátit data z backupu
UPDATE 25_notifikace_hierarchie_profily dest
INNER JOIN 25_notifikace_hierarchie_profily_backup_20260103 src ON dest.id = src.id
SET 
    dest.structure_json = src.structure_json,
    dest.updated_at = NOW()
WHERE dest.aktivni = 1;

-- Smazat backup tabulku
-- DROP TABLE 25_notifikace_hierarchie_profily_backup_20260103;
*/

-- ═══════════════════════════════════════════════════════════════════
-- KONEC MIGRACE
-- ═══════════════════════════════════════════════════════════════════

SELECT '✅ Migrace připravena - pokračuj implementací backendu a frontendu' AS status;
