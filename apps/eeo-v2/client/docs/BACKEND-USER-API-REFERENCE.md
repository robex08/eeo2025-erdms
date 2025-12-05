# ✅ BACKEND API DOKUMENTACE - USER DETAIL

**Datum:** 18. října 2025  
**Status:** ✅ **VYŘEŠENO - DOKUMENTACE AKTUALIZOVÁNA**  
**Ovlivněná funkcionalita:** Editace uživatelů ve FE

---

## 📋 AKTUÁLNÍ STAV

### ✅ CO FUNGUJE (po opravě BE):
- Endpoint `user/detail` odpovídá na request s `user_id`
- Vrací data přímo (ne ve wrapperu `{status: 'ok', data: {...}}`)
- ✅ **OBSAHUJE ID ČÍSELNÍKŮ:** `pozice_id`, `lokalita_id`, `usek_id`, `organizace_id`
- ✅ **ROLE MAJÍ ID:** `roles: [{"id": 1, "nazev_role": "Admin"}]`
- ✅ **PRÁVA MAJÍ ID:** `direct_rights: [{"id": 5, "kod_prava": "USER_EDIT"}]`

### ~~❌ CO NEFUNGUJE / CHYBÍ:~~ → ✅ OPRAVENO:

#### 1. **CHYBÍ ID ČÍSELNÍKŮ**
Frontend potřebuje pro editaci tyto ID, aby mohl předvyplnit selecty:
- ❌ `pozice_id` - **KRITICKÉ**
- ❌ `lokalita_id` - **KRITICKÉ**  
- ❌ `usek_id` - **KRITICKÉ**
- ❌ `organizace_id` - **KRITICKÉ**

**Důvod:** Bez těchto ID nemůže frontend předvybrat správnou hodnotu v dropdown selectech.

**Aktuální stav z konzole:**
```javascript
// API vrací:
{
    id: '5',
    username: 'jonasova',
    jmeno: 'Hana',
    prijmeni: 'Jonášová (THP)',
    titul_pred: '',
    titul_za: '',
    email: 'hana.jonasova@example.cz',
    telefon: '+420 123 456 789',
    aktivni: 1,
    // ❌ pozice_id - CHYBÍ
    // ❌ lokalita_id - CHYBÍ
    // ❌ usek_id - CHYBÍ
    // ❌ organizace_id - CHYBÍ
}
```

#### 2. **NEZNÁMÁ STRUKTURA ROLÍ A PRÁV**
Podle dokumentace vrací:
```json
"roles": [
    {
        "nazev_role": "Admin",
        "popis": "Administrátor systému",
        "rights": [...]
    }
]
```

**PROBLÉM:** Chybí `id` nebo `role_id`!

Frontend potřebuje pro zaškrtávací políčka:
```json
"roles": [
    {
        "id": 1,  // ← TOTO CHYBÍ!
        "nazev_role": "Admin",
        "popis": "Administrátor systému"
    }
]
```

Stejně tak pro `direct_rights`:
```json
"direct_rights": [
    {
        "id": 5,  // ← TOTO CHYBÍ!
        "kod_prava": "USER_EDIT",
        "nazev_prava": "Editace uživatelů"
    }
]
```

---

## 🎯 POŽADOVANÁ STRUKTURA `user/detail` RESPONSE

### Request:
```json
POST /api.eeo/api.php
Content-Type: application/json

{
    "token": "YWRtaW58MTc2MDczNDE0...",
    "username": "admin",
    "user_id": 5
}
```

### Response (POŽADOVANÝ formát):
```json
{
    "id": 5,
    "username": "jonasova",
    "jmeno": "Hana",
    "prijmeni": "Jonášová (THP)",
    "titul_pred": "",
    "titul_za": "",
    "email": "hana.jonasova@example.cz",
    "telefon": "+420 123 456 789",
    
    "pozice_id": 3,
    "lokalita_id": 2,
    "usek_id": 1,
    "organizace_id": 1,
    
    "aktivni": 1,
    "dt_vytvoreni": "2025-01-15 08:30:00",
    "dt_aktualizace": "2025-10-17 14:20:00",
    
    "roles": [
        {
            "id": 1,
            "nazev_role": "Admin",
            "popis": "Administrátor systému",
            "rights": [
                {
                    "id": 1,
                    "kod_prava": "USER_EDIT",
                    "nazev_prava": "Editace uživatelů"
                }
            ]
        }
    ],
    
    "direct_rights": [
        {
            "id": 5,
            "kod_prava": "SPECIAL_ACCESS",
            "nazev_prava": "Speciální přístup"
        }
    ]
}
```

---

## 📊 SROVNÁNÍ: `users/list` vs `user/detail`

### `users/list` - Pro tabulkový výpis (✅ OK jak je):
**Účel:** Zobrazení seznamu uživatelů v tabulce  
**Co vrací:** Rozbalené názvy pro čitelnost

```json
[{
    "id": 1,
    "username": "jan.novak",
    "jmeno": "Jan",
    "prijmeni": "Novák",
    "email": "jan@example.cz",
    
    "nazev_pozice": "IT Manager",
    "lokalita_nazev": "Praha - hlavní",
    "usek_zkr": "IT",
    "usek_nazev": "Informační technologie",
    
    "roles": [
        {
            "nazev_role": "Admin",
            "popis": "Administrátor systému",
            "rights": [...]
        }
    ]
}]
```
✅ **ID NEJSOU POTŘEBA** - tabulka jen zobrazuje názvy

---

### `user/detail` - Pro editační formulář (❌ CHYBÍ ID):
**Účel:** Načtení všech dat pro editaci uživatele  
**Co MUSÍ vrátit:** ID všech vazeb + kompletní data

```json
{
    "id": 1,
    "username": "jan.novak",
    "jmeno": "Jan",
    "prijmeni": "Novák",
    "email": "jan@example.cz",
    
    "pozice_id": 3,
    "lokalita_id": 2,
    "usek_id": 1,
    "organizace_id": 1,
    
    "roles": [
        {
            "id": 1,
            "nazev_role": "Admin"
        }
    ],
    "direct_rights": [
        {
            "id": 5,
            "kod_prava": "SPECIAL_ACCESS"
        }
    ]
}
```
❌ **ID JSOU KRITICKÁ** - bez nich nelze předvyplnit formulář

---

## 🔧 SQL DOTAZ - NÁVRH ŘEŠENÍ PRO BACKEND

Pro `user/detail` endpoint potřebujeme JOIN na tyto tabulky:

```sql
-- Základní data uživatele
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
    
    -- ⚠️ TATO ID CHYBÍ V SOUČASNÉ IMPLEMENTACI:
    u.pozice_id,
    u.lokalita_id,
    u.usek_id,
    u.organizace_id
    
FROM 25_uzivatele u
WHERE u.id = :user_id;

-- Role s ID (separátní dotaz nebo subquery)
SELECT 
    ur.role_id as id,
    r.nazev_role,
    r.popis
FROM 25_uzivatel_role ur
JOIN 25_role r ON r.id = ur.role_id
WHERE ur.uzivatel_id = :user_id;

-- Přímá práva s ID (separátní dotaz nebo subquery)
SELECT 
    up.pravo_id as id,
    p.kod_prava,
    p.nazev_prava
FROM 25_uzivatel_pravo up
JOIN 25_prava p ON p.id = up.pravo_id
WHERE up.uzivatel_id = :user_id;
```

---

## ✅ CHECKLIST PRO BACKEND VÝVOJÁŘE

### 1. Přidat do response `user/detail`:
- [ ] `pozice_id` (INT, může být NULL)
- [ ] `lokalita_id` (INT, může být NULL)
- [ ] `usek_id` (INT, může být NULL)
- [ ] `organizace_id` (INT, může být NULL)

### 2. Opravit strukturu `roles`:
- [ ] Každý objekt v poli musí obsahovat `id` nebo `role_id`
- [ ] Formát: `{"id": 1, "nazev_role": "Admin", "popis": "..."}`
- [ ] Pokud uživatel nemá přiřazené role, vrátit prázdné pole `[]`

### 3. Opravit strukturu `direct_rights`:
- [ ] Každý objekt v poli musí obsahovat `id` nebo `pravo_id`
- [ ] Formát: `{"id": 5, "kod_prava": "USER_EDIT", "nazev_prava": "..."}`
- [ ] Pokud uživatel nemá přímá práva, vrátit prázdné pole `[]`

### 4. Testování:
- [ ] Otestovat endpoint s reálným `user_id`
- [ ] Ověřit, že response obsahuje všechny ID
- [ ] Ověřit, že prázdné hodnoty jsou `null` (ne `undefined` nebo chybějící klíč)
- [ ] Otestovat uživatele BEZ rolí/práv (musí vrátit prázdná pole)
- [ ] Otestovat uživatele BEZ vazeb na číselníky (musí vrátit `null`)

---

## 🚨 PROČ TO POTŘEBUJEME

### Bez těchto ID:
- ❌ Editační formulář zůstane prázdný (selecty neukazují vybranou hodnotu)
- ❌ Nelze předvybrat role a práva (checkboxy zůstanou nezaškrtnuté)
- ❌ Uživatel nevidí, co edituje → **špatná UX, nefunkční editace**
- ❌ Frontend musí dělat dodatečné API volání → zbytečná zátěž

### S těmito ID:
- ✅ Formulář se automaticky vyplní aktuálními hodnotami
- ✅ Selecty ukážou správnou pozici, lokalitu, úsek, organizaci
- ✅ Role a práva budou správně zaškrtnuté
- ✅ Uživatel vidí, co edituje → **dobrá UX, funkční editace**
- ✅ Jedno API volání stačí → optimální výkon

---

## 📝 POZNÁMKY PRO BACKEND

### 1. Endpoint `users/list` NEMUSÍTE MĚNIT
- Je OK jak je - tabulka nepotřebuje ID, jen názvy pro zobrazení
- Můžete ponechat současnou strukturu s `nazev_pozice`, `lokalita_nazev`, atd.

### 2. Endpoint `user/detail` MUSÍ VRACET ID
- Editační formulář potřebuje předvybrat hodnoty v selectech
- Bez ID není možné správně předvyplnit formulář

### 3. Dokumentace je nekonzistentní
- Ukazuje rozbalené názvy (`nazev_pozice`), ale nezmiňuje ID (`pozice_id`)
- **Pro `user/detail` potřebujeme ID, názvy jsou volitelné**

### 4. Response formát
- `user/detail` vrací data **PŘÍMO** (ne ve wrapperu `{status: 'ok', data: {...}}`)
- Toto je správně, ponechte tento formát
- V případě chyby vraťte `{status: 'error', message: '...'}`

---

## 🧪 TESTOVACÍ PŘÍKAZ

```bash
curl -X POST http://your-domain/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YWRtaW58MTc2MDczNDE0...",
    "username": "admin",
    "user_id": 5
  }'
```

**Očekávaný response:**
- Všechna základní pole (`id`, `username`, `jmeno`, ...)
- **4 ID číselníků** (`pozice_id`, `lokalita_id`, `usek_id`, `organizace_id`)
- **Role s ID** (`roles: [{id: 1, nazev_role: "Admin"}, ...]`)
- **Práva s ID** (`direct_rights: [{id: 5, kod_prava: "USER_EDIT"}, ...]`)

---

## 📞 KONTAKT

**Frontend tým:**
- Čeká na opravu tohoto endpointu
- Po opravě potřebuje testovací response pro validaci
- Priorita: **KRITICKÁ** - editace uživatelů nefunguje

**Otázky?**
- Pokud je něco nejasného, kontaktujte FE tým
- Můžeme společně projít strukturu dat a požadavky
