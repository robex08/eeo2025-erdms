# Organizační hierarchie - PHP API dokumentace

## Přehled

PHP API endpointy pro správu organizační hierarchie v systému EEO2025.

**Base URL:** `/api.eeo`  
**Autentifikace:** Token v POST body (`token` field)  
**Content-Type:** `application/json`

## Databázové tabulky

- `25_uzivatele` - Uživatelé systému
- `25_uzivatele_hierarchie` - Vztahy nadřízený-podřízený s rozšířenými oprávněními
- `25_lokality` - Lokality/pobočky
- `25_useky` - Úseky/oddělení

## API Endpointy

### 1. GET Seznam uživatelů
**Endpoint:** `POST /api.eeo/hierarchy/users`

Vrací seznam všech aktivních uživatelů včetně jejich pozic a příslušností.

**Request:**
```json
{
  "token": "user_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Jan Novák",
      "position": "Ředitel",
      "location": "Praha",
      "department": "Vedení",
      "initials": "JN",
      "email": "jan.novak@example.com"
    }
  ],
  "count": 102
}
```

---

### 2. GET Seznam lokalit
**Endpoint:** `POST /api.eeo/hierarchy/locations`

Vrací seznam všech lokalit s počtem uživatelů.

**Request:**
```json
{
  "token": "user_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Praha - Hlavní pobočka",
      "address": "Ulice 123, Praha",
      "userCount": 45
    }
  ],
  "count": 5
}
```

---

### 3. GET Seznam úseků
**Endpoint:** `POST /api.eeo/hierarchy/departments`

Vrací seznam všech úseků/oddělení s počtem uživatelů.

**Request:**
```json
{
  "token": "user_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "IT oddělení",
      "description": "Informační technologie",
      "userCount": 15
    }
  ],
  "count": 8
}
```

---

### 4. GET Hierarchická struktura
**Endpoint:** `POST /api.eeo/hierarchy/structure`

Vrací kompletní hierarchickou strukturu včetně všech vztahů a oprávnění.

**Request:**
```json
{
  "token": "user_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "1",
        "name": "Jan Novák",
        "position": "Ředitel",
        "initials": "JN",
        "metadata": {
          "location": "Praha",
          "department": "Vedení"
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2",
        "type": "prime",
        "permissions": {
          "level": 3,
          "visibility": {
            "objednavky": true,
            "faktury": true,
            "smlouvy": false,
            "pokladna": false,
            "uzivatele": false,
            "lp": false
          },
          "notifications": {
            "email": true,
            "inapp": true,
            "types": ["order_created", "order_approved"]
          },
          "extended": {
            "locations": [1, 2],
            "departments": [3, 4]
          }
        },
        "validity": {
          "from": "2025-01-01",
          "to": null
        }
      }
    ]
  },
  "counts": {
    "users": 102,
    "relationships": 45
  }
}
```

**Typy vztahů:**
- `prime` - Přímý nadřízený
- `zastupovani` - Zastupování
- `delegovani` - Delegování oprávnění
- `rozsirene` - Rozšířené oprávnění

**Úrovně oprávnění:**
- `1` - Základní (pouze zobrazení)
- `2` - Rozšířené (editace)
- `3` - Plné (schvalování)

---

### 5. POST Uložit hierarchii
**Endpoint:** `POST /api.eeo/hierarchy/save`

Uloží kompletní hierarchickou strukturu. Vyžaduje admin oprávnění.

**Request:**
```json
{
  "token": "user_auth_token",
  "nodes": [
    {
      "id": "1",
      "position": { "x": 100, "y": 50 },
      "data": {
        "name": "Jan Novák",
        "position": "Ředitel",
        "initials": "JN"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "type": "prime",
      "permissions": {
        "level": 3,
        "visibility": {
          "objednavky": true,
          "faktury": true,
          "smlouvy": false,
          "pokladna": false,
          "uzivatele": false,
          "lp": false
        },
        "notifications": {
          "email": true,
          "inapp": true,
          "types": ["order_created"]
        },
        "extended": {
          "locations": [1, 2],
          "departments": []
        }
      },
      "validity": {
        "from": "2025-01-01",
        "to": null
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hierarchie úspěšně uložena",
  "saved": {
    "relationships": 45
  }
}
```

**Chybová odpověď:**
```json
{
  "success": false,
  "error": "Nemáte oprávnění ke správě hierarchie"
}
```

---

### 6. GET Typy notifikací
**Endpoint:** `POST /api.eeo/hierarchy/notification-types`

Vrací seznam dostupných typů notifikací pro konfiguraci.

**Request:**
```json
{
  "token": "user_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_created",
      "name": "Nová objednávka",
      "category": "orders"
    },
    {
      "id": "order_approved",
      "name": "Schválená objednávka",
      "category": "orders"
    },
    {
      "id": "invoice_created",
      "name": "Nová faktura",
      "category": "invoices"
    }
  ]
}
```

**Kategorie notifikací:**
- `orders` - Objednávky
- `invoices` - Faktury
- `contracts` - Smlouvy
- `finance` - Finance
- `general` - Obecné

---

## Oprávnění

Všechny endpointy vyžadují autentifikaci pomocí tokenu.

**Editační oprávnění (`hierarchy/save`):**
- Vyžaduje oprávnění `HIERARCHY_MANAGE`
- Typicky přístupné pouze pro adminy

---

## Implementační soubory

**Backend (PHP):**
- `/apps/eeo-v2/api-legacy/api.eeo/api.php` - Routing
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php` - Handler funkce

**Frontend (React):**
- `/apps/eeo-v2/client/src/pages/OrganizationHierarchy.js` - UI komponenta

---

## Příklad použití z React

```javascript
const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
const token = localStorage.getItem('token');

// Načtení dat
const response = await fetch(`${apiBase}/hierarchy/structure`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const data = await response.json();
if (data.success) {
  console.log('Hierarchie:', data.data);
}
```

---

## Testování

**Testovací curl požadavek:**
```bash
curl -X POST https://erdms.zachranka.cz/api.eeo/hierarchy/users \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'
```

---

## Poznámky

1. **Autentifikace:** Token se posílá v POST body, ne v Authorization headeru
2. **Response formát:** Všechny nové endpointy používají `success` místo `status`
3. **JSON pole:** `notifikace_typy`, `rozsirene_lokality`, `rozsirene_useky` jsou uloženy jako JSON v DB
4. **Časová platnost:** Vztahy s `dt_od` a `dt_do` jsou automaticky filtrovány podle aktuálního data
5. **Soft delete:** Deaktivované vztahy mají `aktivni = 0`, nejsou mazány fyzicky

---

## Changelog

**2025-12-11** - Vytvoření PHP API endpointů pro organizační hierarchii
- Přidány endpointy: users, locations, departments, structure, save, notification-types
- Implementace v `hierarchyHandlers.php`
- Integrace do `api.php` routingu
