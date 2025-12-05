# Backend - Oprávnění pro Limitované Přísliby

**Datum:** 21. listopadu 2025  
**Verze:** 1.0  
**Systém:** Limitované přísliby (LP)

---

## 🔐 NOVÉ OPRÁVNĚNÍ

### `LP_MANAGE` - Správa limitovaných příslibů

**Kód oprávnění:** `LP_MANAGE`  
**Název:** Správa limitovaných příslibů  
**Kategorie:** Finanční řízení  
**Priorita:** VYSOKÁ

### `ORDER_APPROVAL` - Příkazce operací (zobrazení LP)

**Kód oprávnění:** `ORDER_APPROVAL`  
**Název:** Příkazce operací  
**Kategorie:** Objednávky  
**Souvislost s LP:** Uživatelé s tímto právem vidí LP kódy svého úseku (zjednodušený pohled)  
**Důležité:** Vidí pouze LP svého úseku (filtr podle `usek_id` z tabulky `25_uzivatele`)

---

## 📋 CO OPRÁVNĚNÍ UMOŽŇUJE

### ✅ Povolené akce:

1. **Inicializace čerpání LP** (`/limitovane-prisliby/inicializace`)
   - Smazání všech existujících záznamů čerpání pro daný rok
   - Kompletní přebudování tabulky čerpání od nuly
   - KRITICKÁ operace - trvá 15-30 sekund

2. **Globální přepočet všech LP** (`/limitovane-prisliby/prepocet`)
   - Aktualizace čerpání všech LP kódů
   - Přepočet tří typů čerpání (rezervace, předpoklad, skutečnost)
   - Operace trvající 5-10 sekund

3. **Přepočet jednotlivých LP**
   - Rychlý přepočet konkrétního LP kódu
   - Aktualizace po schválení objednávky

### 🚫 BEZ tohoto oprávnění:

#### S právem `ORDER_APPROVAL` (běžný uživatel):
- ✅ Uživatel VIDÍ LP svého úseku a kolik zbývá (zjednodušený pohled)
- ✅ Uživatel VIDÍ sloupce: Kód, Kategorie, Název, Zbývá, Stav
- ❌ Uživatel NEVIDÍ LP jiných úseků (filtr podle `usek_id`)
- ❌ Uživatel NEVIDÍ statistiky a celkové součty
- ❌ Uživatel NEVIDÍ tlačítko "Inicializovat"
- ❌ Uživatel NEVIDÍ tlačítko "Přepočítat vše"

#### BEZ `ORDER_APPROVAL`:
- ❌ Uživatel NEVIDÍ sekci Limitované přísliby vůbec

---

## 👥 KDO BY MĚL MÍT TOTO OPRÁVNĚNÍ

### ✅ `LP_MANAGE` - plná správa:

- **ADMINISTRATOR** - automaticky (hasPermission('ADMIN') = true)
- **SUPERADMIN** - automaticky (hasPermission('ADMIN') = true)
- **Ekonom** - přiřadit právo LP_MANAGE
- **Finanční ředitel** - přiřadit právo LP_MANAGE
- **Hlavní účetní** - přiřadit právo LP_MANAGE

### ✅ `ORDER_APPROVAL` - zobrazení vlastních LP:

- **Příkazci operací** - běžní uživatelé, kteří objednávají
- **Vedoucí oddělení** - pokud schvalují objednávky
- **Referenti** - pokud vytvářejí objednávky

### ⚠️ Bez oprávnění:

- Uživatelé bez práva ORDER_APPROVAL ani LP_MANAGE → nevidí sekci LP vůbec

---

## 🗄️ SQL PRO BACKEND

### 1. Vložení oprávnění do tabulky `25_prava`

```sql
-- Kontrola, zda právo už neexistuje
SELECT * FROM 25_prava WHERE kod_prava = 'LP_MANAGE';

-- Pokud neexistuje, vložit:
INSERT INTO 25_prava (
  kod_prava, 
  nazev_prava, 
  popis_prava, 
  kategorie, 
  aktivni
) VALUES (
  'LP_MANAGE',
  'Správa limitovaných příslibů',
  'Umožňuje inicializaci a přepočet čerpání limitovaných příslibů. Kritické operace pro finanční řízení.',
  'FINANCE',
  1
);
```

### 2. Přiřazení práva roli ADMINISTRATOR

```sql
-- Získat ID práva
SELECT id FROM 25_prava WHERE kod_prava = 'LP_MANAGE';
-- Předpokládejme ID = 50 (upravte podle skutečnosti)

-- Získat ID role ADMINISTRATOR
SELECT id FROM 25_role WHERE kod_role = 'ADMINISTRATOR';
-- Předpokládejme role_id = 1

-- Přiřadit právo roli (user_id = -1 značí přiřazení celé roli)
INSERT INTO 25_role_prava (role_id, pravo_id, user_id)
VALUES (1, 50, -1);
```

### 3. Přiřazení práva konkrétnímu uživateli

```sql
-- Příklad: Přiřadit LP_MANAGE uživateli s ID 64 (Jan Novák - ekonom)
INSERT INTO 25_role_prava (role_id, pravo_id, user_id)
VALUES (
  (SELECT role_id FROM 25_uzivatele WHERE id = 64), -- role uživatele
  (SELECT id FROM 25_prava WHERE kod_prava = 'LP_MANAGE'),
  64 -- user_id konkrétního uživatele
);
```

---

## 🔧 FRONTEND IMPLEMENTACE

### Kontrola oprávnění v komponentě:

```javascript
// src/components/LimitovanePrislibyManager.js

const { hasPermission } = useContext(AuthContext);

// Kontrola oprávnění pro správu LP
const canManageLP = hasPermission && (
  hasPermission('LP_MANAGE') || 
  hasPermission('ADMIN')
);

// Použití v JSX
{canManageLP && (
  <Button onClick={handleInitializace}>
    Inicializovat
  </Button>
)}
```

### Logika oprávnění:

```javascript
// hasPermission('LP_MANAGE') → kontrola práva LP_MANAGE (true/false)
// hasPermission('ADMIN') → SPECIÁLNÍ ALIAS (NENÍ PRÁVO!)
//                          Kontroluje role: ADMINISTRATOR nebo SUPERADMIN
//                          Definováno v AuthContext.js
```

---

## 📊 BACKEND API VALIDACE

### Endpoint: `/limitovane-prisliby/inicializace`

```php
<?php
// api.eeo/api.php

// Kontrola oprávnění na backendu
// is_admin() kontroluje role ADMINISTRATOR nebo SUPERADMIN (NE právo!)
if (!has_permission($username, 'LP_MANAGE') && !is_admin($username)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nedostatečná oprávnění. Vyžadováno: právo LP_MANAGE nebo role ADMIN.',
        'error_code' => 'PERMISSION_DENIED'
    ]);
    http_response_code(403);
    exit;
}

// Pokračovat s inicializací...
```

### Endpoint: `/limitovane-prisliby/prepocet`

```php
<?php
// api.eeo/api.php

// Pokud je lp_id zadáno, může přepočítat i běžný uživatel (své LP)
// Pokud lp_id NENÍ (přepočet všech), vyžadovat LP_MANAGE

if (!isset($_POST['lp_id']) || empty($_POST['lp_id'])) {
    // Přepočet VŠECH LP - vyžaduje oprávnění
    if (!has_permission($username, 'LP_MANAGE') && !is_admin($username)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Nedostatečná oprávnění pro přepočet všech LP.',
            'error_code' => 'PERMISSION_DENIED'
        ]);
        http_response_code(403);
        exit;
    }
}
```

---

## 🧪 TESTOVÁNÍ

### 1. Test s oprávněním:

```bash
# Uživatel s LP_MANAGE nebo ADMIN
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "limitovane-prisliby/inicializace",
    "username": "ekonom",
    "token": "...",
    "rok": 2025
  }'

# Očekávaný výsledek: 200 OK, inicializace proběhne
```

### 2. Test BEZ oprávnění:

```bash
# Běžný uživatel
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "limitovane-prisliby/inicializace",
    "username": "novak",
    "token": "...",
    "rok": 2025
  }'

# Očekávaný výsledek: 403 Forbidden
# {
#   "status": "error",
#   "message": "Nedostatečná oprávnění. Vyžadováno: LP_MANAGE nebo ADMIN.",
#   "error_code": "PERMISSION_DENIED"
# }
```

---

## 📝 CHECKLIST PRO IMPLEMENTACI

### Backend:
- [ ] Vložit právo `LP_MANAGE` do tabulky `25_prava`
- [ ] Přiřadit právo roli `ADMINISTRATOR`
- [ ] Přiřadit právo roli `SUPERADMIN`
- [ ] Přiřadit právo dalším rolím dle potřeby (EKONOM, atd.)
- [ ] Implementovat kontrolu `has_permission('LP_MANAGE')` v endpointech
- [ ] Otestovat s uživatelem s oprávněním
- [ ] Otestovat s uživatelem bez oprávnění (očekáván 403)

### Frontend:
- [x] Import `hasPermission` z `AuthContext`
- [x] Definice `canManageLP` pomocí `hasPermission('LP_MANAGE')` nebo `ORDER_APPROVAL`
- [x] Definice `isBasicUser` pro zjednodušené zobrazení
- [x] Podmíněné zobrazení tlačítka Inicializovat (jen LP_MANAGE/ADMIN)
- [x] Filtrování LP podle `usek_id` pro ORDER_APPROVAL uživatele
- [x] Použití endpointu `/cerpani-podle-useku` pro básic users
- [x] Skrytí statistik a filtrů pro basic users
- [x] Nová záložka "Limitované přísliby" v ProfilePage
- [ ] UI indikace pro uživatele bez oprávnění (tooltip?)
- [ ] Testování v prohlížeči

---

## 🔗 SOUVISEJÍCÍ DOKUMENTACE

- **API-LIMITOVANE-PRISLIBY-DOKUMENTACE-V3.md** - API dokumentace
- **BACKEND-LP-CERPANI-IMPLEMENTATION.md** - Backend implementace
- **ADMIN-ROLE-QUICK-REFERENCE.md** - Přehled rolí a práv

---

**Připravil:** GitHub Copilot  
**Datum:** 21. listopadu 2025
