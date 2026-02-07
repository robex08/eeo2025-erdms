# 📊 ANALÝZA PRÁV A PRAVIDEL PRO MODUL FAKTUR
## Datum: 8. ledna 2026

---

## 🎯 SHRNUTÍ

Modul faktur implementuje **vícevrstvý systém oprávnění** založený na:
1. **Rolích uživatele** (SUPERADMIN, ADMINISTRATOR, běžní uživatelé)
2. **Specifických právech** (INVOICE_MANAGE, ORDER_MANAGE, INVOICE_MATERIAL_CORRECTNESS)
3. **Vztahu uživatele k objednávkám a smlouvám**
4. **Vztahu k fakturám** (vytvoření, věcná kontrola, předání)

---

## 🔐 STRUKTURA OPRÁVNĚNÍ

### 1. SUPERADMIN a ADMINISTRATOR

**Plný přístup ke VŠEM fakturám v systému**

```php
// Backend: invoiceHandlers.php (řádek 1226-1227)
$is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
// Pokud $is_admin = true → ŽÁDNÉ OMEZENÍ
```

**Co vidí:**
- ✅ Všechny faktury bez omezení
- ✅ Všechny organizace
- ✅ Všechny objednávky
- ✅ Všechny smlouvy

**Oprávnění:**
- ✅ Zobrazení všech faktur
- ✅ Úprava všech faktur
- ✅ Mazání faktur (soft i hard delete)
- ✅ Přístup ke všem filtrům a statistikám

---

### 2. Uživatelé s právem INVOICE_MANAGE

**Manažeři faktur - rozšířený přístup**

```javascript
// Frontend: InvoiceEvidencePage.js (řádek 1420-1422)
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');
```

```javascript
// Frontend: Invoices25List.js (řádek 1234-1236)
const canManageInvoices = React.useMemo(() => {
  return hasPermission && hasPermission('INVOICE_MANAGE');
}, [hasPermission]);
```

**Co vidí:**
- ✅ Všechny faktury (stejně jako ADMIN)
- ✅ Všechny objednávky

**Oprávnění:**
- ✅ Zobrazení všech faktur
- ✅ Vytváření nových faktur
- ✅ Úprava faktur
- ✅ Soft delete faktur
- ❌ NEMŮŽE hard delete faktury (pouze ADMIN)
- ✅ Správa příloh
- ✅ Předávání faktur k věcné kontrole

---

### 3. Uživatelé s právem ORDER_MANAGE

**Manažeři objednávek**

```javascript
// Frontend: InvoiceEvidencePage.js (řádek 1420-1422)
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');
```

**Co vidí:**
- ✅ Všechny faktury přiřazené k objednávkám
- ⚠️ Možná omezená možnost editace (primárně pro objednávky, ne faktury)

**Oprávnění:**
- ✅ Zobrazení všech faktur k objednávkám
- ⚠️ Editace pouze v kontextu objednávky

---

### 4. Uživatelé s právem INVOICE_MATERIAL_CORRECTNESS

**Režim pouze pro čtení s věcnou kontrolou**

```javascript
// Frontend: InvoiceEvidencePage.js (řádek 1491)
const isReadOnlyMode = !hasPermission('INVOICE_MANAGE') && 
                       hasPermission('INVOICE_MATERIAL_CORRECTNESS');
```

**Co vidí:**
- ✅ Faktury přiřazené k jejich objednávkám
- ✅ Faktury předané jim k věcné kontrole

**Oprávnění:**
- ✅ Pouze ČTENÍ faktur
- ✅ Potvrzení věcné správnosti
- ❌ NEMŮŽE editovat fakturu
- ❌ NEMŮŽE mazat fakturu
- ❌ NEMŮŽE měnit přiřazení

---

### 5. BĚŽNÍ UŽIVATELÉ (bez speciálních práv)

**Nejvíce omezený přístup - vidí pouze SVÉ faktury**

#### 🔍 Pravidla přístupu pro běžné uživatele

Backend implementuje **ROZŠÍŘENÝ FILTR** který kontroluje 6 kategorií přístupu:

```php
// Backend: invoiceHandlers.php (řádky 1232-1332)
// NON-ADMIN UŽIVATEL VIDÍ FAKTURY POKUD:
```

#### 1️⃣ **Faktury k objednávkám kde je účastníkem**

Uživatel vidí faktury k objednávkám, kde má některou z následujících rolí:

```sql
-- Backend SQL dotaz na objednávky uživatele
SELECT DISTINCT o.id 
FROM `25a_objednavky` o
WHERE (
    o.uzivatel_id = ?                     -- vytvořil objednávku
    OR o.garant_uzivatel_id = ?           -- je garant objednávky  
    OR o.objednatel_id = ?                -- je objednavatel
    OR o.schvalovatel_id = ?              -- je schvalovatel
    OR o.prikazce_id = ?                  -- je příkazce objednávky
    OR o.potvrdil_vecnou_spravnost_id = ? -- potvrdil věcnou správnost objednávky
    OR o.fakturant_id = ?                 -- je fakturant
)
```

**Znamená to:**
- ✅ Uživatel vidí faktury k objednávkám, které vytvořil
- ✅ Uživatel vidí faktury k objednávkám, kde je garantem
- ✅ Uživatel vidí faktury k objednávkám, kde je objednavatelem
- ✅ Uživatel vidí faktury k objednávkám, kde je schvalovatelem
- ✅ Uživatel vidí faktury k objednávkám, kde je příkazcem
- ✅ Uživatel vidí faktury k objednávkám, kde potvrdil věcnou správnost
- ✅ Uživatel vidí faktury k objednávkám, kde je fakturantem

---

#### 2️⃣ **Faktury předané k věcné kontrole**

```php
// Backend: invoiceHandlers.php (řádek 1297-1298)
$user_access_conditions[] = 'f.fa_predana_zam_id = ?';
$user_access_params[] = $user_id;
```

**Znamená to:**
- ✅ Pokud je faktura předána uživateli (sloupec `fa_predana_zam_id` = user_id)
- ✅ Uživatel ji vidí bez ohledu na to, zda je účastníkem objednávky

---

#### 3️⃣ **Faktury kde potvrdil věcnou správnost**

```php
// Backend: invoiceHandlers.php (řádek 1301-1302)
$user_access_conditions[] = 'f.potvrdil_vecnou_spravnost_id = ?';
$user_access_params[] = $user_id;
```

**Znamená to:**
- ✅ Pokud uživatel potvrdil věcnou správnost faktury (sloupec `potvrdil_vecnou_spravnost_id` = user_id)
- ✅ Vidí ji i po dokončení kontroly

---

#### 4️⃣ **Faktury které sám vytvořil**

```php
// Backend: invoiceHandlers.php (řádek 1305-1306)
$user_access_conditions[] = 'f.vytvoril_uzivatel_id = ?';
$user_access_params[] = $user_id;
```

**Znamená to:**
- ✅ Uživatel vždy vidí faktury, které sám zaevidoval
- ✅ I když už není účastníkem objednávky

---

#### 5️⃣ **Faktury k smlouvám přiřazeným k úseku uživatele**

```php
// Backend: invoiceHandlers.php (řádek 1309-1312)
if ($user_usek_id) {
    $user_access_conditions[] = '(f.smlouva_id IS NOT NULL AND sm.usek_id = ?)';
    $user_access_params[] = $user_usek_id;
}
```

**Znamená to:**
- ✅ Pokud je faktura přiřazena ke smlouvě (má `smlouva_id`)
- ✅ A smlouva patří k úseku uživatele (`sm.usek_id` = user_usek_id)
- ✅ Uživatel ji vidí

---

#### 6️⃣ **ŽÁDNÝ PŘÍSTUP = Prázdný seznam**

```php
// Backend: invoiceHandlers.php (řádek 1316-1327)
if (empty($user_access_conditions)) {
    // Uživatel nemá přístup k žádným fakturám
    error_log("Invoices25 LIST: User $user_id has NO access to any invoices - returning empty list");
    http_response_code(200);
    echo json_encode(array(
        'status' => 'ok', 
        'faktury' => array(),
        // ... prázdná data
    ));
    return;
}
```

**Znamená to:**
- ❌ Pokud uživatel nesplňuje ŽÁDNOU z podmínek 1️⃣-5️⃣
- ❌ Vidí **PRÁZDNÝ seznam** faktur
- ⚠️ NENÍ to chyba - systém vrací HTTP 200 OK s prázdným polem

---

## 📋 DODATEČNÁ PRAVIDLA FILTROVÁNÍ

### ✅ Kontrola aktivních záznamů

Backend automaticky filtruje:

```php
// Backend: invoiceHandlers.php (řádek 1198-1206)
$where_conditions[] = '(
    (f.objednavka_id IS NULL OR o.aktivni = 1)
    AND
    (f.smlouva_id IS NULL OR sm.aktivni = 1)
)';
```

**Znamená to:**
- ✅ Pokud je faktura přiřazena k objednávce → objednávka MUSÍ být aktivní (`aktivni = 1`)
- ✅ Pokud je faktura přiřazena ke smlouvě → smlouva MUSÍ být aktivní (`aktivni = 1`)
- ✅ Faktury bez přiřazení (objednavka_id/smlouva_id = NULL) → zobrazí se normálně
- ❌ Faktury neaktivních objednávek/smluv **se nezobrazí**

---

### 🔍 Filtr "Moje faktury" (filter_status = 'my_invoices')

Speciální filtr pro ADMIN a INVOICE_MANAGE uživatele:

```javascript
// Frontend: Invoices25List.js - Dashboard karta "Moje faktury"
// Backend: invoiceHandlers.php - filter_status = 'my_invoices'
```

**Pravidla:**
- ✅ Viditelné pouze pro uživatele s `INVOICE_MANAGE` nebo `ADMIN`
- ✅ Zobrazí pouze faktury kde `vytvoril_uzivatel_id = current_user_id`
- ⚠️ Pro běžné uživatele tento filtr NEMÁ VÝZNAM (vidí jen své faktury)

---

## 📊 SOUHRN OPRÁVNĚNÍ

| Role / Právo | Vidí všechny faktury | Vidí své faktury | Editace | Mazání | Věcná kontrola |
|-------------|---------------------|------------------|---------|---------|----------------|
| **SUPERADMIN** | ✅ Vše | - | ✅ | ✅ (soft + hard) | ✅ |
| **ADMINISTRATOR** | ✅ Vše | - | ✅ | ✅ (soft + hard) | ✅ |
| **INVOICE_MANAGE** | ✅ Vše | - | ✅ | ✅ (pouze soft) | ✅ |
| **ORDER_MANAGE** | ✅ Vše | - | ⚠️ Omezená | ❌ | ⚠️ |
| **INVOICE_MATERIAL_CORRECTNESS** | ❌ | ✅ | ❌ (read-only) | ❌ | ✅ |
| **Běžný uživatel** | ❌ | ✅ (6 kategorií) | ⚠️ Velmi omezená | ❌ | ⚠️ |

---

## 🎯 PRAKTICKÉ PŘÍKLADY

### Příklad 1: Běžný uživatel "Jan Novák"

**Jan Novák:**
- Není admin
- Není INVOICE_MANAGE
- Je v úseku "IT"
- Vytvořil objednávku #123
- Je schvalovatelem objednávky #456
- Má předanou fakturu #789 k věcné kontrole

**Co vidí:**
1. ✅ Všechny faktury k objednávce #123 (vytvořil ji)
2. ✅ Všechny faktury k objednávce #456 (je schvalovatel)
3. ✅ Fakturu #789 (předána mu k věcné kontrole)
4. ✅ Všechny faktury ke smlouvám úseku "IT"
5. ✅ Všechny faktury které sám zaevidoval
6. ❌ NEVIDÍ faktury jiných objednávek
7. ❌ NEVIDÍ faktury jiných uživatelů

---

### Příklad 2: Uživatel s INVOICE_MATERIAL_CORRECTNESS

**Marie Kováčová:**
- Má právo `INVOICE_MATERIAL_CORRECTNESS`
- Je garantem objednávky #999

**Co vidí:**
- ✅ Všechny faktury k objednávce #999
- ✅ Faktury předané jí k věcné kontrole

**Co může dělat:**
- ✅ Zobrazit faktury (read-only mode)
- ✅ Potvrdit věcnou správnost
- ❌ NEMŮŽE editovat částku, datum, číslo faktury
- ❌ NEMŮŽE smazat fakturu
- ❌ NEMŮŽE nahrát/smazat přílohy

```javascript
// Frontend: InvoiceEvidencePage.js (řádek 1491)
const isReadOnlyMode = !hasPermission('INVOICE_MANAGE') && 
                       hasPermission('INVOICE_MATERIAL_CORRECTNESS');
```

---

### Příklad 3: Manažer s INVOICE_MANAGE

**Petr Svoboda:**
- Má právo `INVOICE_MANAGE`
- Není SUPERADMIN ani ADMINISTRATOR

**Co vidí:**
- ✅ **VŠE** - všechny faktury v systému (stejně jako admin)

**Co může dělat:**
- ✅ Zobrazit všechny faktury
- ✅ Editovat všechny faktury
- ✅ Vytvořit nové faktury
- ✅ **Soft delete** faktury (`aktivni = 0`)
- ❌ **NEMŮŽE hard delete** (fyzické smazání z DB)
- ✅ Spravovat přílohy
- ✅ Předávat faktury k věcné kontrole

---

## 🔄 WORKFLOW VĚCNÉ KONTROLY

### Proces předání faktury k věcné kontrole:

1. **Uživatel s INVOICE_MANAGE** vytvoří fakturu
2. Nastaví pole `fa_predana_zam_id` = ID zaměstnance
3. Zaměstnanec **automaticky vidí** fakturu ve svém seznamu
4. Zaměstnanec potvrdí věcnou správnost
5. Nastaví se `potvrdil_vecnou_spravnost_id` = ID zaměstnance
6. Faktura zůstane viditelná zaměstnanci (i po potvrzení)

```php
// Backend kontrola přístupu zahrnuje OBA stadia:
// 1. Předáno k věcné kontrole (fa_predana_zam_id)
// 2. Potvrzeno věcnou správnost (potvrdil_vecnou_spravnost_id)
```

---

## ⚠️ KRITICKÉ BEZPEČNOSTNÍ BODY

### 1. ✅ Isolace uživatelů je SPRÁVNĚ implementována

```php
// Backend používá whitelist přístup - uživatel vidí POUZE TO, CO MÁ:
if (!$is_admin) {
    // 6 kategorií přístupu pomocí OR podmínek
    // Pokud ŽÁDNÁ nesedí → prázdný seznam
}
```

### 2. ✅ Neaktivní záznamy se automaticky filtrují

```php
// Faktury neaktivních objednávek/smluv se nezobrazí
$where_conditions[] = '(
    (f.objednavka_id IS NULL OR o.aktivni = 1)
    AND
    (f.smlouva_id IS NULL OR sm.aktivni = 1)
)';
```

### 3. ✅ Token a username se vždy ověřují

```php
$token_data = verify_token($token);
if ($token_data['username'] !== $request_username) {
    http_response_code(403);
    return;
}
```

### 4. ⚠️ Frontend trust backend

```javascript
// Frontend: InvoiceEvidencePage.js (řádek 2460)
return canViewAllOrders || true; // ⚠️ Trust backend filtrování
```

**Bezpečnost:**
- ✅ Backend **vždy** aplikuje user isolation
- ✅ Frontend nemůže obejít backend filtry
- ✅ API endpoint ověřuje token před jakoukoliv operací

---

## 📝 ZÁVĚR

Systém implementuje **komplexní vícevrstovou autorizaci** s:

1. ✅ **Rolí-based access control** (SUPERADMIN, ADMINISTRATOR)
2. ✅ **Permission-based access** (INVOICE_MANAGE, ORDER_MANAGE, INVOICE_MATERIAL_CORRECTNESS)
3. ✅ **Relationship-based access** (účastník objednávky, vlastník faktury, předání k věcné kontrole)
4. ✅ **Organizational access** (úsek, smlouvy)

**Bezpečnost:**
- ✅ Uživatelé vidí pouze faktury, ke kterým mají oprávnění
- ✅ Admini mají plný přístup
- ✅ Manažeři mají rozšířený přístup
- ✅ Běžní uživatelé vidí pouze své faktury

**Pokud uživatel nevidí očekávané faktury:**
1. Zkontrolovat, zda má roli ADMIN nebo INVOICE_MANAGE
2. Zkontrolovat, zda je účastníkem objednávky (garant, objednavatel, schvalovatel, atd.)
3. Zkontrolovat, zda mu byla faktura předána k věcné kontrole
4. Zkontrolovat, zda objednávka/smlouva je aktivní (`aktivni = 1`)
5. Zkontrolovat, zda faktura není smazaná (`aktivni = 1`)

---

**Dokumentace vytvořena:** 8. ledna 2026  
**Analyzované soubory:**
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
- `/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`
- `/apps/eeo-v2/client/src/pages/Invoices25List.js`
- `/apps/eeo-v2/client/docs/api/BACKEND-INVOICES25-LIST-REQUIRED.md`
