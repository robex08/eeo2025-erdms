# 🔄 Hierarchie OR logika - Fix 2026-01-19

## 📋 Problém

Organizační hierarchie byla implementována jako **REPLACE** logika:
- Pokud byl uživatel **V hierarchii** → aplikovala se POUZE hierarchie, role-based filtr byl ignorován
- Pokud uživatel **NEBYL v hierarchii** → aplikoval se role-based filtr

**Důsledek:**
- Uživatel, který měl viditelnost objednávek přes role-based filtr (např. jako schvalovatel)
- Po přidání do hierarchie **ZTRATIL** viditelnost těchto objednávek (pokud nebyly v hierarchickém profilu)
- = Hierarchie **odebrala** práva místo jejich rozšíření

## ✅ Řešení

Změna na **skutečnou OR logiku** (ADDITIVE):
- Role-based filtr (12 polí) = **ZÁKLAD** (base viditelnost)
- Hierarchie = **ROZŠÍŘENÍ** (přidává viditelnost OR metodou)
- Department subordinate = **ROZŠÍŘENÍ** (přidává viditelnost OR metodou)

**Výsledek:**
```
Viditelnost = (role-based) OR (hierarchie) OR (department)
```

## 🎯 Co to znamená?

### Před opravou (REPLACE):
```
Uživatel má:
- role: schvalovatel_id v objednávce ID=123
- NENÍ v hierarchii

✅ Vidí objednávku 123 (přes role-based filtr)

Po přidání do hierarchie:
❌ NEVIDÍ objednávku 123 (hierarchie nahradila role-based filtr)
```

### Po opravě (OR):
```
Uživatel má:
- role: schvalovatel_id v objednávce ID=123
- JE v hierarchii, která obsahuje objednávky 200-250

✅ Vidí objednávku 123 (role-based)
✅ Vidí objednávky 200-250 (hierarchie)
= Hierarchie ROZŠÍŘILA viditelnost, NEODEBRALA práva
```

## 🔧 Technické detaily

### Soubor: `orderV2Endpoints.php`

#### Původní kód (REPLACE):
```php
// Hierarchie
if ($hierarchyFilter !== null) {
    $whereConditions[] = $hierarchyFilter;
    $hierarchyApplied = true;
}

// Department
if ($departmentCondition) {
    $whereConditions[] = $departmentCondition;
}

// Role-based (JEN pokud není hierarchie ani department!)
if (!$hierarchyApplied && !$departmentFilterApplied) {
    $whereConditions[] = $roleBasedCondition;
}
```

#### Nový kód (OR):
```php
$visibilityConditions = [];

// 1. Role-based (VŽDY jako základ)
$visibilityConditions[] = $roleBasedCondition;

// 2. Hierarchie (pokud existuje)
if ($hierarchyFilter !== null) {
    $visibilityConditions[] = $hierarchyFilter;
}

// 3. Department (pokud existuje)
if ($departmentCondition) {
    $visibilityConditions[] = $departmentCondition;
}

// 4. Spojit s OR
$whereConditions[] = "(" . implode(" OR ", $visibilityConditions) . ")";
```

## 📊 SQL výsledek

### Před:
```sql
WHERE 
    (hierarchie_filter)  -- POUZE hierarchie
    AND stav != 'ARCHIVOVANO'
```

### Po:
```sql
WHERE 
    (
        (role-based: schvalovatel_id = 71 OR ...)
        OR
        (hierarchie: uzivatel_id IN (1,2,3) OR ...)
        OR
        (department: uzivatel_id IN (15 colleagues) OR ...)
    )
    AND stav != 'ARCHIVOVANO'
```

## 🎯 Nastavení hierarchie

```sql
SELECT klic, hodnota FROM 25a_nastaveni_globalni 
WHERE klic LIKE '%hier%';
```

| Klíč | Hodnota | Popis |
|------|---------|-------|
| `hierarchy_enabled` | `1` | Hierarchie zapnuta |
| `hierarchy_logic` | `OR` | OR logika (additive) |
| `hierarchy_profile_id` | `12` | Aktivní profil "PRIKAZCI" |

**hierarchy_logic:**
- `OR` (výchozí) = ADDITIVE - hierarchie rozšiřuje viditelnost
- `AND` (rezerva) = RESTRICTIVE - všechny podmínky musí platit současně (nepoužívá se)

## 🧪 Testování

### Test 1: Uživatel V hierarchii
```
Uživatel 71:
- role: uzivatel_id=71 v objednávkách 1-50
- hierarchie: vidí uživatele 34,47,69 → objednávky 51-80
- očekávaný výsledek: 1-80 (role + hierarchie)
```

### Test 2: Uživatel MIMO hierarchii
```
Uživatel 100:
- role: garant_id=100 v objednávkách 20-30
- hierarchie: není v profilu
- očekávaný výsledek: 20-30 (pouze role)
```

### Test 3: Kombinace všech filtrů
```
Uživatel 71:
- role: uzivatel_id=71 → objednávky A
- hierarchie: user-user vztah → objednávky B
- department: ORDER_EDIT_SUBORDINATE + 15 kolegů → objednávky C
- očekávaný výsledek: A ∪ B ∪ C (sjednocení všech)
```

## 🚀 Deployment

```bash
# Restart PHP-FPM
systemctl restart php8.4-fpm

# Verify
systemctl status php8.4-fpm
```

## 📝 Changelog

**2026-01-19:**
- ✅ Změna z REPLACE na OR logiku
- ✅ Role-based filtr je VŽDY aplikován jako základ
- ✅ Hierarchie a department subordinate PŘIDÁVAJÍ viditelnost
- ✅ Zachována možnost AND logiky (pro budoucí použití)
- ✅ Uživatelé v hierarchii již neztrácejí viditelnost svých role-based objednávek

## 🔗 Související dokumenty

- `FIX_USER71_ORDER_READ_ALL_2026-01-19.md` - Fix pro ORDER_READ_ALL permission bypass
- `hierarchyOrderFilters.php` - Implementace hierarchického filtru
- `orderV2Endpoints.php` - Hlavní endpoint pro listing objednávek
