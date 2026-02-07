# 📋 ZMĚNOVÝ LOG - Oprávnění Faktur pro Roli UCETNI

**Datum:** 8. ledna 2026  
**Verze:** 2.05  
**Modul:** Faktury (Invoices)  
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

---

## 🎯 SHRNUTÍ ZMĚN

Upraveno oprávnění pro zobrazení faktur tak, aby:
1. ✅ Role **UCETNI** má automatický přístup ke **VŠEM** fakturám (stejně jako SUPERADMIN/ADMINISTRATOR)
2. ✅ Běžní uživatelé (bez admin/UCETNI role) vidí pouze faktury, kde jsou **účastníky**
3. ✅ Kontrola viditelnosti podle **fa_predana_zam_id** (faktury předané zaměstnanci)

---

## 📝 DETAILNÍ POPIS ZMĚN

### 1. Přidání Role UCETNI do Admin Kontroly

**Původní kód (řádek 1257):**
```php
// 🔥 ADMIN CHECK: SUPERADMIN nebo ADMINISTRATOR = plný přístup (vidí VŠE)
$is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
```

**Nový kód:**
```php
// 🔥 ADMIN CHECK: SUPERADMIN, ADMINISTRATOR nebo UCETNI = plný přístup (vidí VŠE)
// Role UCETNI má automatický přístup ke všem fakturám pro účetní operace
$is_admin = in_array('SUPERADMIN', $user_roles) || 
            in_array('ADMINISTRATOR', $user_roles) || 
            in_array('UCETNI', $user_roles);
```

**Důvod změny:**
- Účetní potřebují vidět všechny faktury pro:
  - Kontrolu účetních dokladů
  - Zpracování úhrad
  - Finanční reporty
  - Audit účetních operací

---

## 🔐 OPRÁVNĚNÍ PO ZMĚNĚ

### Role s Plným Přístupem (Vidí VŠECHNY Faktury)

| Role | Popis | Důvod Přístupu |
|------|-------|----------------|
| **SUPERADMIN** | Správce systému | Plná administrativa systému |
| **ADMINISTRATOR** | Administrátor | Správa všech modulů |
| **UCETNI** | Účetní | Potřeba pro účetní operace, kontroly a reporty |

### Běžní Uživatelé (Omezený Přístup)

Vidí pouze faktury, kde platí **ALESPOŇ JEDNA** z těchto podmínek:

#### 1️⃣ Faktury k Objednávkám - Kde je Uživatel Účastníkem

Kontrolované sloupce v tabulce `25a_objednavky`:
- ✅ `uzivatel_id` - vytvořil objednávku
- ✅ `garant_uzivatel_id` - je garant objednávky
- ✅ `objednatel_id` - je objednavatel
- ✅ `schvalovatel_id` - je schvalovatel
- ✅ `prikazce_id` - je příkazce objednávky
- ✅ `potvrdil_vecnou_spravnost_id` - potvrdil věcnou správnost
- ✅ `fakturant_id` - je fakturant

**Pokud je faktura navázána na objednávku (`objednavka_id` IS NOT NULL) a uživatel je v některé z výše uvedených rolí → faktura je viditelná**

#### 2️⃣ Faktury Předané k Věcné Kontrole

Kontrolované sloupce v tabulce `25a_objednavky_faktury`:
- ✅ `fa_predana_zam_id` - faktura předána tomuto zaměstnanci k věcné kontrole

**Pokud `fa_predana_zam_id` = ID uživatele → faktura je viditelná**

#### 3️⃣ Faktury Potvrzené Uživatelem

Kontrolované sloupce v tabulce `25a_objednavky_faktury`:
- ✅ `potvrdil_vecnou_spravnost_id` - uživatel potvrdil věcnou správnost faktury

**Pokud `potvrdil_vecnou_spravnost_id` = ID uživatele → faktura je viditelná**

#### 4️⃣ Faktury Vytvořené Uživatelem

Kontrolované sloupce v tabulce `25a_objednavky_faktury`:
- ✅ `vytvoril_uzivatel_id` - uživatel vytvořil záznam faktury

**Pokud `vytvoril_uzivatel_id` = ID uživatele → faktura je viditelná**

#### 5️⃣ Faktury ke Smlouvám (Podle Úseku)

Kontrola pro faktury **BEZ** objednávky (pod smlouvou nebo bez přiřazení):
- ✅ Faktura má `smlouva_id` IS NOT NULL
- ✅ Smlouva je přiřazena k úseku uživatele (`sm.usek_id` = `user.usek_id`)

**Pokud je faktura pod smlouvou přiřazenou k úseku uživatele → faktura je viditelná**

---

## 🚀 IMPLEMENTACE V KÓDU

### Backend Query (invoiceHandlers.php, řádky 1277-1327)

```php
if (!$is_admin) {
    // ROZŠÍŘENÁ LOGIKA PRO BĚŽNÉ UŽIVATELE
    $user_access_conditions = array();
    $user_access_params = array();
    
    // 1️⃣ OBJEDNÁVKY - kde je uživatel účastníkem
    $user_orders_sql = "
        SELECT DISTINCT o.id 
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE (
            o.uzivatel_id = ?
            OR o.garant_uzivatel_id = ?
            OR o.objednatel_id = ?
            OR o.schvalovatel_id = ?
            OR o.prikazce_id = ?
            OR o.potvrdil_vecnou_spravnost_id = ?
            OR o.fakturant_id = ?
        )
    ";
    // ... získání ID objednávek ...
    
    // 2️⃣ FAKTURY K OBJEDNÁVKÁM
    if (!empty($user_order_ids)) {
        $user_access_conditions[] = 'f.objednavka_id IN (' . implode(',', $user_order_ids) . ')';
    }
    
    // 3️⃣ FAKTURY PŘEDANÉ K VĚCNÉ KONTROLE
    $user_access_conditions[] = 'f.fa_predana_zam_id = ?';
    $user_access_params[] = $user_id;
    
    // 4️⃣ FAKTURY POTVRZENÉ UŽIVATELEM
    $user_access_conditions[] = 'f.potvrdil_vecnou_spravnost_id = ?';
    $user_access_params[] = $user_id;
    
    // 5️⃣ FAKTURY KTERÉ SAM VYTVOŘIL
    $user_access_conditions[] = 'f.vytvoril_uzivatel_id = ?';
    $user_access_params[] = $user_id;
    
    // 6️⃣ SMLOUVY - k úseku uživatele
    if ($user_usek_id) {
        $user_access_conditions[] = '(f.smlouva_id IS NOT NULL AND sm.usek_id = ?)';
        $user_access_params[] = $user_usek_id;
    }
    
    // Sestavit finální podmínku (OR mezi všemi podmínkami)
    $where_conditions[] = '(' . implode(' OR ', $user_access_conditions) . ')';
    $params = array_merge($params, $user_access_params);
}
```

---

## 📊 DATABÁZOVÁ STRUKTURA

### Tabulka: `25a_objednavky_faktury`

Klíčové sloupce pro oprávnění:

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `objednavka_id` | INT | ID objednávky (NULL = faktura bez objednávky) |
| `smlouva_id` | INT | ID smlouvy (NULL = faktura bez smlouvy) |
| `fa_predana_zam_id` | INT | ID zaměstnance, kterému byla FA předána k věcné kontrole |
| `potvrdil_vecnou_spravnost_id` | INT | ID uživatele, který potvrdil věcnou správnost |
| `vytvoril_uzivatel_id` | INT | ID uživatele, který vytvořil záznam faktury |
| `aktivni` | TINYINT | 1 = aktivní, 0 = smazaná (soft delete) |

### Tabulka: `25a_objednavky`

Klíčové sloupce pro kontrolu účastnictví:

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `uzivatel_id` | INT | Tvůrce objednávky |
| `garant_uzivatel_id` | INT | Garant objednávky |
| `objednatel_id` | INT | Objednavatel |
| `schvalovatel_id` | INT | Schvalovatel |
| `prikazce_id` | INT | Příkazce objednávky |
| `potvrdil_vecnou_spravnost_id` | INT | Potvrdil věcnou správnost |
| `fakturant_id` | INT | Fakturant |
| `aktivni` | TINYINT | 1 = aktivní, 0 = smazaná |

---

## ✅ TESTOVÁNÍ

### Test 1: Role UCETNI Vidí Všechny Faktury

**Scénář:**
1. Přihlásit se jako uživatel s rolí UCETNI
2. Otevřít modul Faktur
3. Ověřit, že se zobrazují VŠECHNY faktury (bez omezení)

**Očekávaný výsledek:**
- ✅ Uživatel vidí všechny faktury v systému
- ✅ Filtry fungují normálně
- ✅ Žádné omezení podle účastnictví

### Test 2: Běžný Uživatel Vidí Pouze Své Faktury

**Scénář:**
1. Přihlásit se jako běžný uživatel (bez role ADMIN/UCETNI)
2. Otevřít modul Faktur
3. Ověřit, že se zobrazují pouze faktury, kde je uživatel účastníkem

**Očekávaný výsledek:**
- ✅ Uživatel vidí faktury k objednávkám, kde je garant/objednavatel/schvalovatel/atd.
- ✅ Uživatel vidí faktury předané k věcné kontrole (`fa_predana_zam_id`)
- ✅ Uživatel vidí faktury, které sám vytvořil
- ✅ Uživatel vidí faktury ke smlouvám svého úseku
- ❌ Uživatel NEVIDÍ cizí faktury (kde není účastníkem)

### Test 3: Faktura Předaná k Věcné Kontrole

**Scénář:**
1. V Evidenci faktur předat fakturu zaměstnanci k věcné kontrole
2. Zadat `fa_predana_zam_id` = ID testovacího uživatele
3. Přihlásit se jako tento uživatel
4. Otevřít modul Faktur

**Očekávaný výsledek:**
- ✅ Uživatel vidí fakturu, která mu byla předána
- ✅ I když NENÍ účastníkem objednávky

---

## 🔍 DEBUG LOGOVÁNÍ

Backend loguje do error logu (`/var/log/apache2/error.log`):

```
Invoices25 LIST: User 123 roles: UCETNI, ORDER_READ_OWN
Invoices25 LIST: User usek_id: 5, usek_zkr: EKO
Invoices25 LIST: Is admin (SUPERADMIN/ADMINISTRATOR/UCETNI): YES
Invoices25 LIST: User 123 IS ADMIN - showing ALL invoices WITHOUT user filter
```

Pro běžného uživatele:

```
Invoices25 LIST: User 456 roles: ORDER_READ_OWN, ORDER_CREATE
Invoices25 LIST: User usek_id: 3, usek_zkr: IT
Invoices25 LIST: Is admin (SUPERADMIN/ADMINISTRATOR/UCETNI): NO
Invoices25 LIST: User 456 has access to 15 orders
Invoices25 LIST: User 456 - applying EXTENDED user isolation with 6 access conditions
```

---

## 📚 SOUVISEJÍCÍ DOKUMENTACE

- `FAKTURY_PRAVA_A_PRAVIDLA_ZOBRAZENI.md` - Kompletní analýza oprávnění pro faktury
- `PERMISSIONS_SYSTEM_REPORT.md` - Přehled všech rolí a oprávnění v systému
- `CHANGELOG_v2.00_PRODUCTION_DEPLOYMENT.md` - Deployment historie verze 2.00

---

## 🔄 VERZE A ZMĚNY

| Verze | Datum | Změna |
|-------|-------|-------|
| **2.05** | 8.1.2026 | Přidána role UCETNI do admin kontroly (plný přístup ke všem fakturám) |
| 2.00 | 4.1.2026 | Původní implementace user isolation pro faktury |

---

## 👤 AUTOR

**Robert Holovský**  
Datum: 8. ledna 2026  
Verze: 2.05
