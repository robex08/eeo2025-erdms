# ✅ Kompletní refactoring hierarchie - 16. prosince 2025

## 🎯 Co bylo opraveno

### 1. **PHP Backend**

#### ✅ `hierarchyHandlers.php`
- Opravena funkce `handle_hierarchy_profiles_list()` - počítá vztahy ze `structure_json` místo `25_hierarchie_vztahy`
- Opravena funkce `handle_hierarchy_profiles_delete()` - odstraněn pokus o mazání ze staré tabulky
- Aktualizovány komentáře na novou strukturu

#### ✅ `api.php`
- Přesměrovány staré endpointy:
  - `hierarchy/structure` → volá `handle_hierarchy_profiles_load_structure()`
  - `hierarchy/save` → volá `handle_hierarchy_profiles_save_structure()`

#### ✅ `queries.php`
- Zakomentovány konstanty `TABLE_HIERARCHIE_VZTAHY` a `TABLE_UZIVATELE_HIERARCHIE`
- Aktualizovány komentáře

### 2. **Frontend**

#### ✅ `OrganizationHierarchy.js`
- Změněno v `handleProfileChange()`: používá `/hierarchy/profiles/load-structure` místo `/hierarchy/structure`
- Zjednodušena logika načítání - `structure_json` už má správný formát ReactFlow
- Odstraněna stará transformační logika (apiRelations, nodePositions)
- Všechny endpointy používají nové API:
  - `/hierarchy/profiles/list` ✅
  - `/hierarchy/profiles/load-structure` ✅
  - `/hierarchy/profiles/save-structure` ✅
  - `/hierarchy/profiles/create` ✅
  - `/hierarchy/profiles/delete` ✅

### 3. **Databáze**

#### ✅ SQL Skripty vytvořeny:
- `FIX_HIERARCHY_PROFILES_TABLE.sql` - zajistí správnou strukturu tabulky
- `MIGRATE_OLD_HIERARCHY_DATA.sql` - vyplní prázdné `structure_json`
- `HIERARCHY_ORDERS_NOTE.sql` - poznámka k hierarchii pro objednávky

#### ✅ Spuštěno na vzdálené DB:
```bash
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 < FIX_HIERARCHY_PROFILES_TABLE.sql
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 < MIGRATE_OLD_HIERARCHY_DATA.sql
```

## 🚨 DŮLEŽITÉ: Hierarchie pro objednávky

**⚠️ PROBLÉM:**  
`hierarchyOrderFilters.php` stále používá starou tabulku `25_hierarchie_vztahy` pro filtrování objednávek podle hierarchie.

**🔧 ŘEŠENÍ:**  
Dočasně vypnout hierarchické filtrování pro objednávky:

```sql
UPDATE 25a_nastaveni_globalni 
SET hodnota = '0' 
WHERE klic = 'hierarchy_enabled';
```

**PROČ:**
- Notifikační hierarchie používá `structure_json` (funguje ✅)
- Hierarchie objednávek používá starou strukturu (nefunguje ❌)
- Kompletní refactoring `hierarchyOrderFilters.php` vyžaduje více času

## ✅ Co funguje

1. ✅ **Dropdown profilů** - zobrazuje všechny profily z DB
2. ✅ **Načítání profilu** - načítá `structure_json` z DB
3. ✅ **Ukládání profilu** - ukládá do `structure_json`
4. ✅ **Save As** - vytváří nový profil a ukládá strukturu
5. ✅ **Mazání profilu** - maže profil z DB
6. ✅ **Aktivace/deaktivace** - přepíná `aktivni` flag
7. ✅ **Notifikační hierarchie** - používá `structure_json`

## ❌ Co nefunguje (dočasně vypnuto)

1. ❌ **Hierarchické filtrování objednávek** - vypnuto (`hierarchy_enabled = 0`)
   - Standardní filtrování podle rolí funguje normálně

## 📁 Soubory ke smazání (zastaralé)

Tyto soubory už nejsou potřeba a způsobují konflikty:

```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers_v2.php
```

**Poznámka:** Nemažte zatím `hierarchyOrderFilters.php` - bude potřeba pro budoucí refactoring.

## 🎉 Výsledek

- ✅ Organizační hierarchie pro **notifikace** plně funkční
- ✅ Všechna data v `structure_json`
- ✅ Frontend korektně komunikuje s backendem
- ✅ Žádné SQL chyby kvůli neexistující tabulce
- ⚠️ Hierarchie pro **objednávky** dočasně vypnuta (čeká na refactoring)
