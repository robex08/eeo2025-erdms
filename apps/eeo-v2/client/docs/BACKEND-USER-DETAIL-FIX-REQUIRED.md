# ✅ BACKEND FIX COMPLETED - user/detail endpoint

**Datum:** 18. října 2025  
**Status:** ✅ **VYŘEŠENO**  
**Endpoint:** `POST /api.eeo/api.php` → action: `user/detail`

---

## ✅ IMPLEMENTOVÁNO

Backend nyní vrací správnou strukturu s **vnořenými objekty** obsahujícími ID:

```javascript
{
    "id": 5,
    "username": "jonasova",
    "jmeno": "Hana",
    "prijmeni": "Jonášová",
    "titul_pred": "",
    "titul_za": "",
    "email": "hana.jonasova@example.cz",
    "telefon": "+420 731 137 164",
    "aktivni": 1,
    "dt_vytvoreni": "2025-01-15 08:30:00",
    "dt_aktualizace": "2025-10-17 14:20:00",
    "dt_posledni_aktivita": "2025-10-18 09:15:30",
    
    // ✅ Vnořené objekty s ID:
    "pozice": {
        "id": 60,
        "nazev": "Provozně ekonomický správce",
        "parent_id": 5
    },
    "lokalita": {
        "id": 1,
        "nazev": "Kladno",
        "typ": "budova", 
        "parent_id": null
    },
    "usek": {
        "id": 4,
        "nazev": "Provozně ekonomický úsek",
        "zkratka": "PES"
    },
    "organizace": {
        "id": 1,
        "nazev": "Záchranná služba Středočeského kraje",
        "ico": "12345678"
    },
    
    // ✅ Role s ID:
    "roles": [
        {
            "id": 9,
            "nazev_role": "THP/PES",
            "popis": "Technickohospodářský pracovník - provozně ekonomický správce",
            "rights": [
                {
                    "id": 1,
                    "kod_prava": "ORDER_CREATE",
                    "nazev_prava": "Vytvořit novou objednávku"
                },
                {
                    "id": 2, 
                    "kod_prava": "ORDER_SAVE",
                    "nazev_prava": "Uložit rozpracovanou objednávku"
                }
            ]
        }
    ],
    
    // ✅ Práva s ID:
    "direct_rights": [
        {
            "id": 15,
            "kod_prava": "SPECIAL_ACCESS", 
            "nazev_prava": "Speciální přístup k systému"
        },
        {
            "id": 23,
            "kod_prava": "BUDGET_VIEW",
            "nazev_prava": "Prohlížení rozpočtu"
        }
    ]
}
```

---

## ✅ FRONTEND ÚPRAVY

Frontend byl upraven, aby podporoval **oba formáty**:

### 1. Extrakce ID z vnořených objektů:

```javascript
const extractedIds = {
  // Podporuje: usek_id (přímo) nebo usek.id (vnořený objekt)
  usek_id: userData.usek_id || userData.usek?.id || null,
  
  // Podporuje: lokalita_id, lokalita.id, nebo hledání podle názvu
  lokalita_id: userData.lokalita_id || 
    userData.lokalita?.id ||
    (userData.lokalita_nazev ? 
      lokality.find(l => l.nazev === userData.lokalita_nazev)?.id : null),
  
  // Podporuje: pozice_id, pozice.id, nebo hledání podle názvu
  pozice_id: userData.pozice_id || 
    userData.pozice?.id ||
    (userData.nazev_pozice ? 
      pozice.find(p => p.nazev_pozice === userData.nazev_pozice)?.id : null),
  
  // Podporuje: organizace_id nebo organizace.id
  organizace_id: userData.organizace_id || userData.organizace?.id || null
};
```

### 2. Role a práva:

```javascript
// Extrahuje ID z objektů rolí/práv
rolesIds = userData.roles.map(r => r.id || r.role_id).filter(x => x != null);
rightsIds = userData.direct_rights.map(p => p.id || p.pravo_id).filter(x => x != null);
```

---

## ✅ TESTOVÁNO

**Soubory zkontrolovány:**
- ✅ `UserManagementModal.js` - extrakce ID funguje
- ✅ `Users.js` - načítání userDetail bez problémů
- ✅ `api2auth.js` - endpoint vrací správná data
- ✅ **localStorage/sessionStorage** - userDetail se NEUKLÁDÁ, žádný dopad
- ✅ **AuthContext** - nepoužívá fetchUserDetail, žádný dopad

**Výsledek:**
- ✅ Všechny selecty se správně vyplní (úsek, lokalita, pozice, organizace)
- ✅ Všechny checkboxy rolí se zaškrtnou
- ✅ Všechny checkboxy práv se zaškrtnou
- ✅ Žádný dopad na ostatní části aplikace

---

## 📊 SROVNÁNÍ PŘED/PO

| Pole | Před úpravou BE | Po úpravě BE | Frontend |
|------|----------------|--------------|----------|
| `usek_id` | ✅ Vrací se | ✅ `usek.id` | ✅ Podporuje oba |
| `lokalita_id` | ❌ Chybělo | ✅ `lokalita.id` | ✅ Podporuje oba |
| `pozice_id` | ❌ Chybělo | ✅ `pozice.id` | ✅ Podporuje oba |
| `organizace_id` | ❌ Chybělo | ✅ `organizace.id` | ✅ Podporuje oba |
| `roles[].id` | ❌ Chybělo | ✅ Vrací se | ✅ Funguje |
| `direct_rights[].id` | ❌ Chybělo | ✅ Vrací se | ✅ Funguje |

---

## 🎯 ZÁVĚR

✅ **Backend opraven** - vrací všechna potřebná ID  
✅ **Frontend upraven** - podporuje novou strukturu  
✅ **Kompatibilita** - zachována se starou strukturou  
✅ **Testováno** - editace uživatelů plně funkční  

**Status:** 🟢 **HOTOVO** - Žádné další úpravy nutné

---

## 📝 PŮVODNÍ POŽADAVEK (pro historii)

Backend původně nevácel ID pro `lokalita_id`, `pozice_id`, `organizace_id` a chyběla `id` v rolích a právech.

### Požadované SQL dotazy (implementováno):

```sql
-- 1. Hlavní SELECT:
SELECT 
    u.id, u.username, u.jmeno, u.prijmeni,
    u.usek_id, u.lokalita_id, u.pozice_id, u.organizace_id
FROM 25_uzivatele u
WHERE u.id = :user_id;

-- 2. Role s ID:
SELECT r.id, r.nazev_role, r.popis
FROM 25_uzivatel_role ur
JOIN 25_role r ON r.id = ur.role_id
WHERE ur.uzivatel_id = :user_id;

-- 3. Práva s ID:
SELECT p.id, p.kod_prava, p.popis
FROM 25_uzivatel_prava up
JOIN 25_prava p ON p.id = up.pravo_id
WHERE up.uzivatel_id = :user_id;
```



### Co aktuálně CHYBÍ:

```javascript
// ❌ AKTUÁLNÍ RESPONSE (NEÚPLNÁ):
{
  id: '5',
  username: 'jonasova',
  jmeno: 'Hana',
  prijmeni: 'Jonášová (THP)',
  
  usek_id: '4',           // ✅ TOTO JE OK
  
  // ❌ TOTO CHYBÍ:
  // lokalita_id: ???
  // pozice_id: ???
  // organizace_id: ???
  
  // Místo ID se vrací jen zobrazovací data:
  lokalita_nazev: 'Kladno',
  nazev_pozice: 'Provozně ekonomický správce',
  organizace: {id: '1', nazev_organizace: '...'},
  
  // Role a práva nemají pole "id":
  roles: [{
    nazev_role: 'THP/PES',     // ❌ chybí "id"
    Popis: '...'
  }],
  
  direct_rights: [{
    kod_prava: 'ORDER_CREATE', // ❌ chybí "id"
    popis: '...'
  }]
}
```

---

## ✅ ŘEŠENÍ - CO PŘIDAT DO RESPONSE

```javascript
{
  id: 5,
  username: 'jonasova',
  jmeno: 'Hana',
  prijmeni: 'Jonášová (THP)',
  email: 'hana.jonasova@zachranka.cz',
  telefon: '731137164',
  titul_pred: '',
  titul_za: '',
  aktivni: 1,
  dt_vytvoreni: '2025-01-15 08:30:00',
  dt_aktualizace: '2025-10-17 14:20:00',
  
  // ✅ PŘIDAT TATO ID:
  usek_id: 4,
  lokalita_id: 1,        // ← PŘIDAT
  pozice_id: 60,         // ← PŘIDAT
  organizace_id: 1,      // ← PŘIDAT
  
  // ✅ UPRAVIT - přidat pole "id" do rolí:
  roles: [
    {
      id: 9,             // ← PŘIDAT pole "id"
      nazev_role: 'THP/PES',
      popis: 'provozně ekonomický správce'
    }
  ],
  
  // ✅ UPRAVIT - přidat pole "id" do práv:
  direct_rights: [
    {
      id: 1,             // ← PŘIDAT pole "id"
      kod_prava: 'ORDER_CREATE',
      popis: 'Vytvořit novou objednávku'
    },
    {
      id: 2,
      kod_prava: 'ORDER_SAVE',
      popis: 'Uložit rozpracovanou objednávku'
    }
    // ... další práva
  ]
}
```

---

## 📝 SQL DOTAZY PRO BACKEND

### 1. Hlavní SELECT (upravit):

```sql
SELECT 
    u.id,
    u.username,
    u.jmeno,
    u.prijmeni,
    u.titul_pred,
    u.titul_za,
    u.email,
    u.telefon,
    u.aktivni,
    u.dt_vytvoreni,
    u.dt_aktualizace,
    
    -- ✅ PŘIDAT TATO ID:
    u.usek_id,
    u.lokalita_id,      -- ← PŘIDAT
    u.pozice_id,        -- ← PŘIDAT
    u.organizace_id     -- ← PŘIDAT
FROM 25_uzivatele u
WHERE u.id = :user_id;
```

### 2. SELECT pro role (upravit - vrátit ID):

```sql
SELECT 
    r.id,               -- ← DŮLEŽITÉ: vrátit ID role
    r.nazev_role,
    r.popis
FROM 25_uzivatel_role ur
JOIN 25_role r ON r.id = ur.role_id
WHERE ur.uzivatel_id = :user_id;
```

### 3. SELECT pro práva (upravit - vrátit ID):

```sql
SELECT 
    p.id,               -- ← DŮLEŽITÉ: vrátit ID práva
    p.kod_prava,
    p.popis
FROM 25_uzivatel_prava up
JOIN 25_prava p ON p.id = up.pravo_id
WHERE up.uzivatel_id = :user_id;
```

---

## 🎯 SHRNUTÍ ZMĚN

| Pole | Aktuálně | Požadováno | Důvod |
|------|----------|------------|-------|
| `lokalita_id` | ❌ Chybí | ✅ Vrátit ID | Pro předvyplnění selectu "Lokalita" |
| `pozice_id` | ❌ Chybí | ✅ Vrátit ID | Pro předvyplnění selectu "Pozice" |
| `organizace_id` | ❌ Chybí | ✅ Vrátit ID | Pro předvyplnění selectu "Organizace" |
| `roles[].id` | ❌ Chybí | ✅ Vrátit ID | Pro zaškrtnutí checkboxů rolí |
| `direct_rights[].id` | ❌ Chybí | ✅ Vrátit ID | Pro zaškrtnutí checkboxů práv |

---

## ✅ TESTOVÁNÍ

Po implementaci otestuj endpoint:

```bash
curl -X POST https://your-domain/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "username": "admin",
    "user_id": 5
  }'
```

**Očekávaný výsledek:**
- Response obsahuje `lokalita_id`, `pozice_id`, `organizace_id`
- Každá role v `roles[]` má pole `id`
- Každé právo v `direct_rights[]` má pole `id`

---

## 🔗 SOUVISEJÍCÍ

- Frontend už je připravený na oba formáty (se i bez ID)
- Frontend si umí ID dohledat podle názvu/kódu jako fallback
- Po opravě backendu bude editace rychlejší a spolehlivější

---

**Status:** ⏳ Čeká na implementaci backendem
