# Hierarchie - Rozšířená oprávnění (Lokality & Útvary)

## Přehled

Systém hierarchie podporuje nejen vztahy user→user, ale i **rozšířená oprávnění** pomocí lokalit a útvarů.

## Typy uzlů na canvasu

1. **User** - klasický uživatel (`userId`)
2. **Location** - lokalita (`locationId`)
3. **Department** - útvar/oddělení (`departmentId`)

## Typy vztahů (edges)

### 1. User → User (Přímý vztah)
```
Jan Černohorský → Hana Jonášová
```
**Význam:** Jan je přímý nadřízený Hany

**Ukládání do DB:**
- `nadrizeny_id` = 85 (Jan)
- `podrizeny_id` = 52 (Hana)
- `typ_vztahu` = 'prime'
- `rozsirene_lokality` = []
- `rozsirene_useky` = []

---

### 2. User → Location (Vidí celou lokalitu)
```
Jan Černohorský → Benešov
```
**Význam:** Jan vidí VŠE v lokalitě Benešov (všechny objednávky, faktury atd. z Benešova)

**Ukládání do DB:**
- `nadrizeny_id` = 85 (Jan)
- `podrizeny_id` = NULL
- `typ_vztahu` = 'rozsirene'
- `rozsirene_lokality` = [5] (ID lokality Benešov)
- `rozsirene_useky` = []

**Použití:**
- Jan uvidí objednávky/faktury VŠECH uživatelů z lokality Benešov
- Rozšíření základního oprávnění

---

### 3. User → Department (Vidí celý útvar)
```
Jan Černohorský → Oddělení IT
```
**Význam:** Jan vidí VŠE z oddělení IT (napříč všemi lokalitami)

**Ukládání do DB:**
- `nadrizeny_id` = 85 (Jan)
- `podrizeny_id` = NULL
- `typ_vztahu` = 'rozsirene'
- `rozsirene_lokality` = []
- `rozsirene_useky` = [3] (ID útvaru IT)

---

### 4. Location → User (Lokální nadřízený)
```
Benešov → Jan Černohorský
```
**Význam:** Jan je nadřízený pro VŠECHNY uživatele v lokalitě Benešov

**Ukládání do DB:**
- `nadrizeny_id` = NULL
- `podrizeny_id` = 85 (Jan)
- `typ_vztahu` = 'rozsirene'
- `rozsirene_lokality` = [5] (ID lokality Benešov)
- `rozsirene_useky` = []

**Použití:**
- Automaticky vytvoří vztah mezi Janem a všemi uživateli z Benešova
- Dynamické - při přidání nového uživatele do Benešova automaticky získá Jana jako nadřízeného

---

### 5. Department → User (Útvarový nadřízený)
```
Oddělení IT → Jan Černohorský
```
**Význam:** Jan je nadřízený pro VŠECHNY z oddělení IT (ve všech lokalitách)

**Ukládání do DB:**
- `nadrizeny_id` = NULL
- `podrizeny_id` = 85 (Jan)
- `typ_vztahu` = 'rozsirene'
- `rozsirene_lokality` = []
- `rozsirene_useky` = [3] (ID útvaru IT)

---

### 6. Location ↔ Department (Kombinované oprávnění)
```
Benešov → Oddělení IT
```
**Význam:** Speciální oprávnění pro konkrétní kombinaci lokality+útvaru

**Ukládání do DB:**
- `nadrizeny_id` = NULL
- `podrizeny_id` = NULL
- `typ_vztahu` = 'rozsirene'
- `rozsirene_lokality` = []
- `rozsirene_useky` = []
- `rozsirene_kombinace` = [{"locationId": 5, "departmentId": 3}]

---

## Databázová struktura

### Tabulka: `25_uzivatele_hierarchie`

**Klíčové sloupce pro rozšířená oprávnění:**

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `nadrizeny_id` | int NULL | User ID nadřízeného (NULL pro location/dept → user) |
| `podrizeny_id` | int NULL | User ID podřízeného (NULL pro user → location/dept) |
| `typ_vztahu` | enum | 'prime', 'rozsirene', 'zastupovani', 'delegovani' |
| `rozsirene_lokality` | JSON | Array lokalit IDs `[1,2,3]` |
| `rozsirene_useky` | JSON | Array útvarů IDs `[1,2,3]` |
| `rozsirene_kombinace` | JSON | Array kombinací `[{"locationId":1,"departmentId":2}]` |

**Unique constraint:** `(nadrizeny_id, podrizeny_id, profil_id)`

---

## Příklady použití

### Příklad 1: Vedoucí pobočky
```
Vztah: Benešov → Karel Novák
Význam: Karel je vedoucí pobočky Benešov
Výsledek: Karel vidí VŠE a VŠECHNY z Benešova
```

### Příklad 2: Ředitel IT
```
Vztah 1: Jan Černohorský → Oddělení IT
Vztah 2: Oddělení IT → Jan Černohorský

Význam: Jan je ředitel IT
- Vztah 1: Jan vidí VŠE z IT (faktury, objednávky...)
- Vztah 2: Jan je nadřízený VŠECH z IT

Výsledek: Kompletní kontrola nad oddělením IT
```

### Příklad 3: Regionální manažer
```
Vztah 1: Petr → Benešov
Vztah 2: Petr → Kladno
Vztah 3: Petr → Praha

Význam: Petr vidí data ze 3 lokalit
Výsledek: Multi-lokalitní oprávnění
```

### Příklad 4: Specialista pro konkrétní oddělení v lokalitě
```
Vztah: Benešov + Oddělení IT → Specialista

Význam: Specialista má oprávnění jen pro IT v Benešově
Výsledek: Velmi granulární oprávnění
```

---

## Frontend implementace

### Vytvoření vztahu na canvasu

1. Přetáhnout User z levého panelu → vytvoří se User node
2. Přetáhnout Location/Department → vytvoří se Location/Department node
3. Spojit šipkou (edge) pomocí handles (🟢 a 🔵)

### Ukládání do DB

Frontend automaticky detekuje typ vztahu podle typu uzlů a správně mapuje do DB struktury:

```javascript
if (sourceType === 'user' && targetType === 'location') {
  // user → location
  result.source = userId;
  result.target = null;
  result.permissions.extended.locations = [locationId];
}
```

---

## Backend API

### Endpoint: `POST /hierarchy/save`

**Payload:**
```json
{
  "token": "...",
  "username": "admin",
  "profile_id": 1,
  "nodes": [...],
  "edges": [
    {
      "source": 85,
      "target": null,
      "type": "rozsirene",
      "permissions": {
        "extended": {
          "locations": [5],
          "departments": [],
          "combinations": []
        }
      }
    }
  ]
}
```

### Zpracování v PHP

```php
$sourceId = $edge['source']; // může být NULL
$targetId = $edge['target']; // může být NULL
$extended = $edge['permissions']['extended'];

// Uložení do DB
INSERT INTO 25_uzivatele_hierarchie (
    nadrizeny_id, 
    podrizeny_id, 
    rozsirene_lokality,
    rozsirene_useky,
    rozsirene_kombinace
) VALUES (
    $sourceId,
    $targetId,
    json_encode($extended['locations']),
    json_encode($extended['departments']),
    json_encode($extended['combinations'])
);
```

---

## Načítání a zobrazení

### Backend: `GET /hierarchy/structure`

Vrací všechny vztahy včetně rozšířených:

```json
{
  "nodes": [...],
  "edges": [
    {
      "source": "85",
      "target": "52",
      "type": "prime",
      "permissions": {...}
    },
    {
      "source": "85",
      "target": null,
      "type": "rozsirene",
      "permissions": {
        "extended": {
          "locations": [5]
        }
      }
    }
  ]
}
```

### Frontend rekonstrukce

Frontend musí z edge s `source=85, target=null, locations=[5]` vytvořit:
1. User node (id=85)
2. Location node (locationId=5)
3. Edge mezi nimi

---

## Oprávnění - Aplikační logika

### Kontrola oprávnění pro zobrazení objednávky

```php
function canViewOrder($userId, $orderId) {
    $order = getOrder($orderId);
    
    // 1. Přímý vztah - je můj podřízený?
    if (isSubordinate($userId, $order->createdBy)) {
        return true;
    }
    
    // 2. Rozšířené lokality - mám oprávnění na jeho lokalitu?
    $extendedLocations = getExtendedLocations($userId);
    if (in_array($order->locationId, $extendedLocations)) {
        return true;
    }
    
    // 3. Rozšířené útvary - mám oprávnění na jeho útvar?
    $extendedDepartments = getExtendedDepartments($userId);
    if (in_array($order->departmentId, $extendedDepartments)) {
        return true;
    }
    
    // 4. Kombinace
    $combinations = getExtendedCombinations($userId);
    foreach ($combinations as $combo) {
        if ($combo['locationId'] == $order->locationId && 
            $combo['departmentId'] == $order->departmentId) {
            return true;
        }
    }
    
    return false;
}
```

---

## Výhody systému

✅ **Flexibilní** - podporuje různé organizační struktury  
✅ **Škálovatelný** - nové kombinace bez změny kódu  
✅ **Intuitivní** - vizuální editor na canvasu  
✅ **Dynamický** - automaticky se aplikuje na nové uživatele  
✅ **Granulární** - od celé organizace po konkrétní kombinaci lokalita+útvar

---

## Poznámky pro vývojáře

1. **NULL hodnoty** jsou povolené v `nadrizeny_id` a `podrizeny_id`
2. **Unique constraint** zajišťuje konzistenci
3. **JSON sloupce** umožňují arrays a komplexní struktury
4. **Frontend detekce** typu vztahu je automatická podle typu uzlů
5. **Backend validace** kontroluje že má edge alespoň source NEBO target NEBO extended

---

## Changelog

- **2025-12-12**: Iniciální implementace rozšířených oprávnění
- Úprava DB schema - NULL hodnoty v nadrizeny_id/podrizeny_id
- Frontend logika pro detekci typu vztahu
- Backend podpora pro ukládání rozšířených vztahů
