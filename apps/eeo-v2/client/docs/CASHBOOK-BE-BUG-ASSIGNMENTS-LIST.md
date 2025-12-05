# 🐛 CASHBOOK BE BUG - Endpoint `/cashbox-assignments-list`

**Datum:** 8. listopadu 2025  
**Priorita:** 🔴 VYSOKÁ  
**Status:** ⏳ ČEKÁ NA OPRAVU BE

---

## 📋 Popis problému

Endpoint `/api.eeo/cashbox-assignments-list` má **2 kritické chyby**:

### 1. ❌ Chyba: Hledání neexistující tabulky

```
SQLSTATE[42S02]: Base table or view not found: 
1146 Table 'evidence_smluv.25a_user_permissions' doesn't exist
```

**Problém:** BE kód se snaží ověřit oprávnění z tabulky `25a_user_permissions`, která **neexistuje**.

### 2. ❌ Chyba: Vrací jen přiřazení aktuálního uživatele

Endpoint **vždy vrací jen přiřazení aktuálního uživatele**, i když:
- FE posílá `uzivatel_id: null`
- FE očekává **všechna přiřazení** (pro číselník administrace)

---

## 🔍 Jak to zjistit

### Test 1: Console v prohlížeči

```bash
# 1. Otevřít Developer Tools (F12) → Console
# 2. Přejít na Přehled číselníků → Cashbook
# 3. Sledovat network tab:

POST /api.eeo/cashbox-assignments-list
Request: { uzivatel_id: null, active_only: false }
Response: 500 Internal Server Error
Error: Table 'evidence_smluv.25a_user_permissions' doesn't exist
```

### Test 2: Databáze

```sql
-- V DB je 4 přiřazení:
SELECT * FROM 25a_pokladny_uzivatele;
-- Vrací:
-- id=1, uzivatel_id=1, cislo_pokladny=100
-- id=2, uzivatel_id=102, cislo_pokladny=100
-- id=3, uzivatel_id=105, cislo_pokladny=101
-- id=4, uzivatel_id=100, cislo_pokladny=102

-- Ale endpoint vrací jen 1 řádek (pro uživatele ID=1)
```

---

## ✅ Co očekává FE

### Request:
```json
POST /api.eeo/cashbox-assignments-list
{
  "username": "admin",
  "token": "...",
  "uzivatel_id": null,     // ← null = vrátit VŠECHNA přiřazení
  "active_only": false     // ← false = včetně neaktivních
}
```

### Očekávaná response:
```json
{
  "status": "ok",
  "data": {
    "assignments": [
      {
        "id": "1",
        "uzivatel_id": "1",
        "uzivatel_jmeno": "Admin",
        "uzivatel_prijmeni": "Systémový",
        "cislo_pokladny": "100",
        "ciselna_rada_vpd": "599",
        "ciselna_rada_ppd": "499",
        "je_hlavni": "1",
        "platne_od": "2025-11-08",
        "platne_do": null,
        "aktivni": true
      },
      {
        "id": "2",
        "uzivatel_id": "102",
        "uzivatel_jmeno": "Jan",
        "uzivatel_prijmeni": "Novák",
        ...
      },
      {
        "id": "3",
        ...
      },
      {
        "id": "4",
        ...
      }
    ]
  }
}
```

---

## 🔧 Jak opravit (BE strana)

### Oprava 1: Odstranit kontrolu `25a_user_permissions`

```php
// ❌ ŠPATNĚ - hledá neexistující tabulku:
if ($uzivatel_id == 0) {
    $query = "SELECT * FROM 25a_user_permissions WHERE ..."; // ← TABULKA NEEXISTUJE!
}

// ✅ SPRÁVNĚ - jednoduché SQL dotazy:
if ($uzivatel_id === null) {
    // Vrátit VŠECHNA přiřazení (pro admin číselník)
    $query = "SELECT 
        pu.*,
        u.jmeno as uzivatel_jmeno,
        u.prijmeni as uzivatel_prijmeni
    FROM 25a_pokladny_uzivatele pu
    LEFT JOIN uzivatele u ON u.id = pu.uzivatel_id";
    
    if ($active_only) {
        $query .= " WHERE (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())";
    }
} else {
    // Vrátit jen přiřazení konkrétního uživatele
    $query = "SELECT 
        pu.*,
        u.jmeno as uzivatel_jmeno,
        u.prijmeni as uzivatel_prijmeni
    FROM 25a_pokladny_uzivatele pu
    LEFT JOIN uzivatele u ON u.id = pu.uzivatel_id
    WHERE pu.uzivatel_id = ?";
    
    if ($active_only) {
        $query .= " AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())";
    }
}
```

### Oprava 2: Správná interpretace `uzivatel_id: null`

```php
// ❌ ŠPATNĚ - ignoruje null a použije aktuálního uživatele:
$uzivatel_id = $request['uzivatel_id'] ?? $current_user_id;

// ✅ SPRÁVNĚ - rozlišuje null (všechna) vs konkrétní ID:
if (!isset($request['uzivatel_id'])) {
    // Parametr vůbec nepřišel → použít aktuálního uživatele
    $uzivatel_id = $current_user_id;
} elseif ($request['uzivatel_id'] === null) {
    // Explicitně null → vrátit všechna přiřazení
    $uzivatel_id = null;
} else {
    // Konkrétní ID → vrátit pro toho uživatele
    $uzivatel_id = $request['uzivatel_id'];
}
```

---

## 🧪 Testování opravy

### Test 1: Všechna přiřazení (admin)
```bash
# Request:
POST /api.eeo/cashbox-assignments-list
{ "uzivatel_id": null, "active_only": false }

# Očekávaný výsledek:
✅ Status: 200 OK
✅ Vrátí 4 přiřazení (všechna z DB)
✅ Každý objekt má: id, uzivatel_id, uzivatel_jmeno, uzivatel_prijmeni, cislo_pokladny, ciselna_rada_vpd, ciselna_rada_ppd
```

### Test 2: Jen vlastní přiřazení (běžný uživatel)
```bash
# Request:
POST /api.eeo/cashbox-assignments-list
{ "uzivatel_id": 1, "active_only": true }

# Očekávaný výsledek:
✅ Status: 200 OK
✅ Vrátí jen přiřazení pro uživatele ID=1
```

### Test 3: Žádný parametr (default)
```bash
# Request:
POST /api.eeo/cashbox-assignments-list
{ "active_only": true }
# (uzivatel_id není vůbec v payloadu)

# Očekávaný výsledek:
✅ Status: 200 OK
✅ Vrátí přiřazení aktuálního uživatele
```

---

## 📝 Aktuální stav FE

**FE implementace:** ✅ Hotová a commitnutá
- CashbookTab.js volá: `listAssignments(null, false)`
- FE posílá správný payload: `{ uzivatel_id: null }`
- FE očekává všechna přiřazení pro zobrazení v číselníku

**Commit:** `75e2f1d` - "fix(cashbook): CashbookTab číselník - odstranění debug logů, BE musí opravit endpoint"

**FE workaround:** Žádný možný - musí být opraveno na BE.

---

## 🔗 Související dokumentace

- **FE Požadavky:** `CASHBOOK-FE-IMPLEMENTATION-PLAN.md` (KROK 6-7)
- **BE Požadavky:** `CASHBOOK-BE-REQUIREMENTS-KROK-3-4.md`
- **DB Schema:** Tabulka `25a_pokladny_uzivatele`

---

## 📞 Kontakt

**FE odpovědný:** @robex08  
**Git branch:** `RH-DOMA-DOCX-01`  
**Datum zjištění:** 8. listopadu 2025, 18:30

---

## ✅ Checklist pro BE tým

- [ ] Odstranit kontrolu tabulky `25a_user_permissions`
- [ ] Opravit interpretaci `uzivatel_id: null` → vrátit všechna přiřazení
- [ ] Otestovat endpoint s parametry: `null`, `1`, `undefined` (bez parametru)
- [ ] Ověřit, že JOIN s `uzivatele` vrací `jmeno` a `prijmeni`
- [ ] Commit + push
- [ ] Oznámit FE týmu, že je hotovo

**Očekávaný čas opravy:** 15-30 minut
