# 📋 Implementační plán: Rozšíření faktur pro běžné uživatele (Generic Recipient System)

**Datum:** 21. prosince 2025  
**Branch:** `feature/generic-recipient-system`  
**Autor:** System Analysis  
**Verze:** 1.0

---

## 🎯 Cíl

Rozšířit funkcionalitu modulu faktur pro uživatele, kteří nejsou INVOICE_MANAGE nebo ADMIN, s důrazem na:
1. **Omezený přístup k seznamu faktur** - pouze faktury, kde je uživatel účastníkem
2. **Věcná kontrola** - možnost potvrdit věcnou správnost faktury
3. **Zakázání editace** - tlačítko "Zaevidovat fakturu" a editační ikony budou skryté/disabled
4. **Nové právo INVOICE_VIEW** - čtení faktur s možností věcné kontroly

---

## 📊 Současný stav systému

### ✅ Co už FUNGUJE:

1. **Databázová práva** (tabulka `25_prava`):
   ```sql
   - ID 94: INVOICE_VIEW - Faktury - prohlížení všech faktur (read-only)
   - ID 95: INVOICE_MATERIAL_CORRECTNESS - Faktury - věcná správnost
   ```

2. **Backend filtrování** (`/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`):
   - ✅ Permission-based filtering už implementován
   - ✅ Non-admin uživatelé vidí pouze "své faktury" (kde jsou účastníky):
     - Faktura předána uživateli (`fa_predana_zam_id`)
     - Uživatel je garant objednávky (`garant_uzivatel_id`)
     - Uživatel je účetní (`ucetni_uzivatel_id`)
     - Uživatel je příkazce (`prikazce_id`)
     - Uživatel potvrdil věcnou správnost (`potvrdil_vecnou_spravnost_id`)
     - Uživatel vytvořil objednávku (`o.uzivatel_id`)
     - Uživatel vytvořil fakturu (`f.vytvoril_uzivatel_id`)

3. **Věcná správnost - databázová struktura** (tabulka `25a_faktury_objednavek`):
   ```sql
   - potvrzeni_vecne_spravnosti ENUM('ANO', 'NE') NULL
   - potvrdil_vecnou_spravnost_id INT(11) - ID uživatele
   - dt_potvrzeni_vecne_spravnosti DATETIME - datum potvrzení
   - vecna_spravnost_umisteni_majetku TEXT - poznámka k umístění
   - vecna_spravnost_poznamka TEXT - obecná poznámka
   ```

4. **Frontend - seznam faktur** (`Invoices25List.js`):
   - ✅ Zobrazuje všechny faktury s kolonkami:
     - Číslo faktury, dodavatel, částka, datum splatnosti
     - Stav platby (zaplaceno/nezaplaceno/po splatnosti)
     - **Předáno zaměstnanci** (fa_predana_zam_jmeno_cele)
     - **Věcnou provedl** (potvrdil_vecnou_spravnost_jmeno)
     - **Věcná kontrola** (ano/ne ikona)
     - Přílohy
   - ✅ Sloupcové filtry pro všechny pole
   - ✅ Server-side pagination

5. **Frontend - práva** (kontroly v kódu):
   ```javascript
   // Invoices25List.js řádek ~1343-1350
   const canViewAllInvoices = hasPermission('INVOICE_MANAGE') || hasPermission('ORDER_MANAGE');
   const canManageInvoices = hasPermission('INVOICE_MANAGE');
   const isAdmin = hasPermission('ADMIN');
   ```

6. **Layout menu** (`Layout.js`):
   ```javascript
   // Řádek ~2770 - Faktury jsou dostupné jen pro INVOICE_MANAGE nebo ADMIN
   { ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('INVOICE_MANAGE'))) && (
     <NavLink to="/invoices25" activeClassName="active">
       <FontAwesomeIcon icon={faFileInvoice} />
       Faktury
     </NavLink>
   )}
   ```

---

## ⚠️ Co je potřeba IMPLEMENTOVAT:

### 1. **Rozšířit přístup k menu "Faktury"** (Layout.js)

**Problém:**  
Menu "Faktury" je dostupné jen pro `INVOICE_MANAGE` nebo `ADMIN`.

**Řešení:**  
Přidat právo `INVOICE_VIEW` do podmínky zobrazení menu.

**Kód:**
```javascript
// apps/eeo-v2/client/src/components/Layout.js řádek ~2770
{ (
  (hasAdminRole && hasAdminRole()) || 
  (hasPermission && (
    hasPermission('INVOICE_MANAGE') || 
    hasPermission('INVOICE_VIEW')  // 🆕 PŘIDAT
  ))
) && (
  <NavLink to="/invoices25" activeClassName="active">
    <FontAwesomeIcon icon={faFileInvoice} />
    Faktury
  </NavLink>
)}
```

---

### 2. **Rozšířit přístup k sekci "Faktury"** (availableSections.js)

**Problém:**  
Sekce "Faktury" v nastavení uživatele je dostupná jen pro `INVOICE_MANAGE` nebo `ADMIN`.

**Řešení:**  
Přidat právo `INVOICE_VIEW` do podmínky.

**Kód:**
```javascript
// apps/eeo-v2/client/src/utils/availableSections.js řádek ~99
// FAKTURY - INVOICE_MANAGE nebo INVOICE_VIEW
if (isAdmin || (hasPermission && (
  hasPermission('INVOICE_MANAGE') || 
  hasPermission('INVOICE_VIEW')  // 🆕 PŘIDAT
))) {
  sections.push({ value: 'invoices25-list', label: 'Faktury - přehled' });
}
```

---

### 3. **Skrýt tlačítko "Zaevidovat fakturu"** (Invoices25List.js)

**Problém:**  
Tlačítko pro přidání nové faktury by mělo být dostupné jen pro `INVOICE_MANAGE` nebo `ADMIN`.

**Řešení:**  
Podmíněné zobrazení tlačítka podle práva `canManageInvoices`.

**Kód:**
```javascript
// apps/eeo-v2/client/src/pages/Invoices25List.js
// Najít tlačítko <ActionButton $primary onClick={() => navigate('/invoices25/new')}>
// Podmíněně zobrazit:

{canManageInvoices && (
  <ActionButton 
    $primary 
    onClick={() => navigate('/invoices25/new')}
    title="Zaevidovat novou fakturu"
  >
    <FontAwesomeIcon icon={faPlus} style={{ marginRight: '0.5rem' }} />
    Zaevidovat fakturu
  </ActionButton>
)}
```

**Lokace:**  
Hledat sekci s dashboard kartami nebo ActionButtons, kde je navigace na `/invoices25/new`.

---

### 4. **Upravit editační ikony v tabulce** (Invoices25List.js)

**Problém:**  
Editační ikony (tužka) by měly být:
- Pro `INVOICE_MANAGE`/`ADMIN`: aktivní a otevírají editaci faktury
- Pro `INVOICE_VIEW`: **změnit na ikonu "Potvrdit věcnou správnost"** nebo **disabled**

**Řešení A: Změnit ikonu a funkci** (preferované):

```javascript
// V tabulce - sloupec "Akce"
<ActionIconButton
  title={
    canManageInvoices 
      ? "Upravit fakturu" 
      : (inv.vecna_spravnost_potvrzeno 
          ? "Věcná správnost již potvrzena" 
          : "Potvrdit věcnou správnost")
  }
  disabled={
    !canManageInvoices && inv.vecna_spravnost_potvrzeno
  }
  onClick={() => {
    if (canManageInvoices) {
      // Otevřít editaci faktury
      navigate(`/invoices25/edit/${inv.id}`);
    } else {
      // Otevřít dialog pro potvrzení věcné správnosti
      handleOpenVecnaKontrola(inv);
    }
  }}
>
  <FontAwesomeIcon 
    icon={
      canManageInvoices 
        ? faEdit 
        : (inv.vecna_spravnost_potvrzeno ? faCheckCircle : faBoltLightning)
    } 
  />
</ActionIconButton>
```

**Řešení B: Úplně skrýt editační ikonu pro INVOICE_VIEW:**

```javascript
{canManageInvoices && (
  <ActionIconButton
    title="Upravit fakturu"
    onClick={() => navigate(`/invoices25/edit/${inv.id}`)}
  >
    <FontAwesomeIcon icon={faEdit} />
  </ActionIconButton>
)}

{/* Nová ikona pro INVOICE_VIEW - věcná kontrola */}
{!canManageInvoices && !inv.vecna_spravnost_potvrzeno && (
  <ActionIconButton
    title="Potvrdit věcnou správnost"
    onClick={() => handleOpenVecnaKontrola(inv)}
  >
    <FontAwesomeIcon icon={faBoltLightning} />
  </ActionIconButton>
)}

{/* Ikona že věcná kontrola už byla provedena */}
{!canManageInvoices && inv.vecna_spravnost_potvrzeno && (
  <ActionIconButton
    title={`Věcná správnost potvrzena (${inv.potvrdil_vecnou_spravnost_jmeno}, ${prettyDate(inv.dt_potvrzeni_vecne_spravnosti)})`}
    disabled
    style={{ color: '#10b981', cursor: 'not-allowed' }}
  >
    <FontAwesomeIcon icon={faCheckCircle} />
  </ActionIconButton>
)}
```

---

### 5. **Implementovat dialog "Potvrdit věcnou správnost"** (Invoices25List.js)

**Požadavky:**
- Otevře se po kliknutí na ikonu "Potvrdit věcnou správnost"
- Zobrazí základní info o faktuře (číslo, dodavatel, částka)
- Formulář:
  - **Umístění majetku** (textarea) - volitelné
  - **Poznámka** (textarea) - volitelné
  - **Potvrzení** - checkbox "Potvrzuji věcnou správnost faktury"
- Tlačítka: Zrušit, **Potvrdit věcnou správnost**

**Kód - přidat state:**
```javascript
const [vecnaKontrolaDialog, setVecnaKontrolaDialog] = useState({
  open: false,
  invoice: null,
  umisteniMajetku: '',
  poznamka: '',
  potvrzeno: false
});
```

**Handler pro otevření dialogu:**
```javascript
const handleOpenVecnaKontrola = useCallback((invoice) => {
  setVecnaKontrolaDialog({
    open: true,
    invoice: invoice,
    umisteniMajetku: invoice.vecna_spravnost_umisteni_majetku || '',
    poznamka: invoice.vecna_spravnost_poznamka || '',
    potvrzeno: false
  });
}, []);
```

**Handler pro potvrzení věcné správnosti:**
```javascript
const handleConfirmVecnaKontrola = useCallback(async () => {
  if (!vecnaKontrolaDialog.invoice) return;
  
  try {
    showProgress?.('Ukládám potvrzení věcné správnosti...');
    
    // API call - update faktury s věcnou správností
    await updateInvoiceV2(token, username, vecnaKontrolaDialog.invoice.id, {
      vecna_spravnost_umisteni_majetku: vecnaKontrolaDialog.umisteniMajetku,
      vecna_spravnost_poznamka: vecnaKontrolaDialog.poznamka,
      potvrzeni_vecne_spravnosti: 'ANO',
      // Backend automaticky doplní:
      // - potvrdil_vecnou_spravnost_id = current user ID
      // - dt_potvrzeni_vecne_spravnosti = NOW()
    });
    
    showToast?.('✅ Věcná správnost faktury byla potvrzena', { type: 'success' });
    
    // Zavřít dialog
    setVecnaKontrolaDialog({ open: false, invoice: null, umisteniMajetku: '', poznamka: '', potvrzeno: false });
    
    // Reload seznamu faktur
    await loadData();
    
  } catch (err) {
    console.error('❌ Chyba při potvrzování věcné správnosti:', err);
    showToast?.(translateErrorMessage(err?.message || 'Nepodařilo se potvrdit věcnou správnost'), { type: 'error' });
  } finally {
    hideProgress?.();
  }
}, [vecnaKontrolaDialog, token, username, showProgress, hideProgress, showToast, loadData]);
```

**JSX - Dialog komponenta:**
```jsx
{/* Dialog pro potvrzení věcné správnosti */}
{vecnaKontrolaDialog.open && (
  <ConfirmDialog
    title="Potvrdit věcnou správnost faktury"
    message={
      <div>
        <UserInfo>
          <strong>Faktura:</strong> {vecnaKontrolaDialog.invoice?.cislo_faktury || 'N/A'}
          <br />
          <strong>Dodavatel:</strong> {vecnaKontrolaDialog.invoice?.dodavatel_nazev || 'N/A'}
          <br />
          <strong>Částka:</strong> {formatCurrency(vecnaKontrolaDialog.invoice?.castka || 0)}
        </UserInfo>
        
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Umístění majetku (volitelné):
          </label>
          <textarea
            value={vecnaKontrolaDialog.umisteniMajetku}
            onChange={(e) => setVecnaKontrolaDialog({...vecnaKontrolaDialog, umisteniMajetku: e.target.value})}
            placeholder="Např.: Sklád C, regál 5, patro 2..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Poznámka (volitelné):
          </label>
          <textarea
            value={vecnaKontrolaDialog.poznamka}
            onChange={(e) => setVecnaKontrolaDialog({...vecnaKontrolaDialog, poznamka: e.target.value})}
            placeholder="Např.: Vše zkontrolováno, odpovídá objednávce..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="checkbox"
            id="vecnaPotvrzeni"
            checked={vecnaKontrolaDialog.potvrzeno}
            onChange={(e) => setVecnaKontrolaDialog({...vecnaKontrolaDialog, potvrzeno: e.target.checked})}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <label 
            htmlFor="vecnaPotvrzeni"
            style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: '#1e293b',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            Potvrzuji věcnou správnost faktury
          </label>
        </div>
      </div>
    }
    onConfirm={handleConfirmVecnaKontrola}
    onCancel={() => setVecnaKontrolaDialog({ open: false, invoice: null, umisteniMajetku: '', poznamka: '', potvrzeno: false })}
    confirmText="Potvrdit věcnou správnost"
    cancelText="Zrušit"
    confirmDisabled={!vecnaKontrolaDialog.potvrzeno}
  />
)}
```

---

### 6. **Backend - Update endpoint pro věcnou správnost**

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

**Akce:**  
Ověřit, že `updateInvoiceV2()` podporuje následující pole:
- `vecna_spravnost_umisteni_majetku`
- `vecna_spravnost_poznamka`
- `potvrzeni_vecne_spravnosti` (ENUM: 'ANO', 'NE')

**Automatické doplnění při uložení:**
```php
// Pokud je potvrzeni_vecne_spravnosti = 'ANO', automaticky nastavit:
if ($data['potvrzeni_vecne_spravnosti'] === 'ANO') {
    $data['potvrdil_vecnou_spravnost_id'] = $current_user_id;
    $data['dt_potvrzeni_vecne_spravnosti'] = date('Y-m-d H:i:s');
}
```

**Kontrola oprávnění:**
```php
// INVOICE_VIEW uživatel může POUZE potvrdit věcnou správnost
// NESMÍ měnit ostatní pole faktury (částka, dodavatel, datum, atd.)

$is_admin = hasRole($pdo, $user_id, 'ADMIN');
$has_invoice_manage = hasPermission($pdo, $user_id, 'INVOICE_MANAGE');
$has_invoice_view = hasPermission($pdo, $user_id, 'INVOICE_VIEW');

// Kontrola, zda jsou měněna pouze pole věcné správnosti
$allowed_fields_for_invoice_view = [
    'vecna_spravnost_umisteni_majetku',
    'vecna_spravnost_poznamka',
    'potvrzeni_vecne_spravnosti'
];

if ($has_invoice_view && !$is_admin && !$has_invoice_manage) {
    // Ověřit, že $data obsahuje POUZE povolená pole
    $forbidden_fields = array_diff(array_keys($data), $allowed_fields_for_invoice_view);
    
    if (!empty($forbidden_fields)) {
        throw new Exception('INVOICE_VIEW uživatel může měnit pouze pole věcné správnosti');
    }
}
```

---

### 7. **Backend - listInvoices25() permission check**

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

**Akce:**  
Ověřit, že funkce `listInvoices25()` už podporuje permission-based filtering.

**Očekávané chování:**
```php
// Pokud uživatel NENÍ ADMIN ani INVOICE_MANAGE
// → filtrovat jen "své faktury" (kde je účastníkem)

$is_admin = hasRole($pdo, $user_id, 'ADMIN');
$has_invoice_manage = hasPermission($pdo, $user_id, 'INVOICE_MANAGE');

if (!$is_admin && !$has_invoice_manage) {
    // Přidat WHERE podmínku:
    // AND (
    //     f.fa_predana_zam_id = :user_id
    //     OR o.garant_uzivatel_id = :user_id
    //     OR o.ucetni_uzivatel_id = :user_id
    //     OR o.prikazce_id = :user_id
    //     OR f.potvrdil_vecnou_spravnost_id = :user_id
    //     OR o.uzivatel_id = :user_id
    //     OR f.vytvoril_uzivatel_id = :user_id
    // )
}
```

**Status:** ✅ **UŽ IMPLEMENTOVÁNO** (viz `STATUS_INVOICE_FIXES_20251220.md`)

---

### 8. **Frontend - Zobrazit indikátor věcné kontroly v tabulce**

**Problém:**  
Sloupec "Věcná kontrola" už existuje, ale mohli bychom zvýraznit:
- ✅ Zelený check - věcná správnost potvrzena
- ⏳ Žlutá ikona - čeká na potvrzení
- ❌ Červený kříž - zamítnuto (pokud bude v budoucnu)

**Kód:**
```javascript
// V tabulce - sloupec "Věcná kontrola"
<TableCell>
  {inv.vecna_spravnost_potvrzeno ? (
    <TooltipWrapper 
      content={`Potvrzeno: ${inv.potvrdil_vecnou_spravnost_jmeno || 'N/A'} (${prettyDate(inv.dt_potvrzeni_vecne_spravnosti)})`}
    >
      <StatusBadge $status="paid" style={{ backgroundColor: '#10b981', padding: '0.25rem 0.5rem' }}>
        <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.25rem' }} />
        Potvrzeno
      </StatusBadge>
    </TooltipWrapper>
  ) : (
    <TooltipWrapper content="Čeká na potvrzení věcné správnosti">
      <StatusBadge $status="unpaid" style={{ backgroundColor: '#f59e0b', padding: '0.25rem 0.5rem' }}>
        <FontAwesomeIcon icon={faHourglassHalf} style={{ marginRight: '0.25rem' }} />
        Čeká
      </StatusBadge>
    </TooltipWrapper>
  )}
</TableCell>
```

---

## 📝 Implementační checklist

### Fáze 1: Frontend - Rozšíření přístupu
- [ ] **Layout.js** - Přidat `INVOICE_VIEW` do podmínky menu "Faktury"
- [ ] **availableSections.js** - Přidat `INVOICE_VIEW` do podmínky sekce
- [ ] **Invoices25List.js** - Skrýt tlačítko "Zaevidovat fakturu" pro non-managers
- [ ] Testovat: Uživatel s `INVOICE_VIEW` vidí menu "Faktury"

### Fáze 2: Frontend - Editační ikony a věcná kontrola
- [ ] **Invoices25List.js** - Upravit editační ikony podle práva
  - [ ] `canManageInvoices` → ikona tužky (faEdit) → editace faktury
  - [ ] `!canManageInvoices` → ikona blesku (faBoltLightning) → věcná kontrola
  - [ ] Ikona checkCircle pokud už potvrzeno
- [ ] **Invoices25List.js** - Vylepšit zobrazení sloupce "Věcná kontrola"
  - [ ] Badge "Potvrzeno" (zelený) vs "Čeká" (žlutý)
  - [ ] Tooltip s info o tom, kdo a kdy potvrdil

### Fáze 3: Frontend - Dialog věcné kontroly
- [ ] **Invoices25List.js** - Přidat state `vecnaKontrolaDialog`
- [ ] Implementovat handler `handleOpenVecnaKontrola(invoice)`
- [ ] Implementovat handler `handleConfirmVecnaKontrola()`
- [ ] JSX - Dialog s formulářem:
  - [ ] Info o faktuře (číslo, dodavatel, částka)
  - [ ] Textarea "Umístění majetku"
  - [ ] Textarea "Poznámka"
  - [ ] Checkbox "Potvrzuji věcnou správnost"
  - [ ] Tlačítka: Zrušit, Potvrdit (disabled pokud checkbox není zaškrtnutý)
- [ ] Testovat: Dialog se otevře, formulář funguje, checkbox required

### Fáze 4: Backend - Věcná kontrola endpoint
- [ ] **invoiceHandlers.php** - Ověřit `updateInvoiceV2()` podporuje pole:
  - [ ] `vecna_spravnost_umisteni_majetku`
  - [ ] `vecna_spravnost_poznamka`
  - [ ] `potvrzeni_vecne_spravnosti`
- [ ] Automatické doplnění při `potvrzeni_vecne_spravnosti = 'ANO'`:
  - [ ] `potvrdil_vecnou_spravnost_id` = current user ID
  - [ ] `dt_potvrzeni_vecne_spravnosti` = NOW()
- [ ] Kontrola oprávnění:
  - [ ] `INVOICE_VIEW` může měnit POUZE pole věcné správnosti
  - [ ] Ostatní pole (částka, dodavatel, datum) → throw Exception
- [ ] Testovat: `INVOICE_VIEW` uživatel může potvrdit věcnou správnost
- [ ] Testovat: `INVOICE_VIEW` uživatel NEMŮŽE editovat ostatní pole

### Fáze 5: Backend - Permission-based filtering (už hotovo)
- [x] **invoiceHandlers.php** - `listInvoices25()` filtruje faktury podle práv
- [x] Non-admin vidí pouze "své faktury" (7 typů vztahu)
- [x] Status: ✅ **UŽ IMPLEMENTOVÁNO**

### Fáze 6: Testování
- [ ] **Test 1: ADMIN uživatel**
  - [ ] Vidí menu "Faktury"
  - [ ] Vidí tlačítko "Zaevidovat fakturu"
  - [ ] Vidí všechny faktury (bez filtrování)
  - [ ] Může editovat fakturu (ikona tužky)
  - [ ] Může potvrdit věcnou správnost

- [ ] **Test 2: INVOICE_MANAGE uživatel**
  - [ ] Vidí menu "Faktury"
  - [ ] Vidí tlačítko "Zaevidovat fakturu"
  - [ ] Vidí všechny faktury v hierarchii
  - [ ] Může editovat fakturu
  - [ ] Může potvrdit věcnou správnost

- [ ] **Test 3: INVOICE_VIEW uživatel**
  - [ ] Vidí menu "Faktury"
  - [ ] **NEVIDÍ** tlačítko "Zaevidovat fakturu"
  - [ ] Vidí pouze faktury, kde je účastníkem (7 typů vztahu)
  - [ ] **NEVIDÍ** ikonu tužky (editace)
  - [ ] **VIDÍ** ikonu blesku (věcná kontrola) - pokud ještě nepotvrzeno
  - [ ] **VIDÍ** ikonu checkCircle (potvrzeno) - pokud už potvrzeno
  - [ ] Může otevřít dialog věcné kontroly
  - [ ] Může potvrdit věcnou správnost (umístění majetku + poznámka)
  - [ ] **NEMŮŽE** editovat jiná pole faktury

- [ ] **Test 4: Uživatel BEZ práv na faktury**
  - [ ] **NEVIDÍ** menu "Faktury"
  - [ ] Pokud zkusí otevřít `/invoices25` → redirect nebo 403

---

## 🔐 Databázová práva - přiřazení uživatelům

### Přiřazení práv rolím

**SQL příkazy:**
```sql
-- 1. Najít role, které by měly mít INVOICE_VIEW
SELECT * FROM 25_role WHERE nazev_role LIKE '%garant%' OR nazev_role LIKE '%ucetni%';

-- 2. Přiřadit INVOICE_VIEW právo roli (např. "Garant")
INSERT INTO 25_role_prava (role_id, pravo_id, pridelit_kym, dt_pridani)
SELECT 
    r.id AS role_id,
    p.id AS pravo_id,
    'system' AS pridelit_kym,
    NOW() AS dt_pridani
FROM 25_role r
CROSS JOIN 25_prava p
WHERE r.nazev_role = 'Garant'  -- nebo jiná role
  AND p.kod_prava = 'INVOICE_VIEW'
  AND NOT EXISTS (
      SELECT 1 FROM 25_role_prava rp 
      WHERE rp.role_id = r.id AND rp.pravo_id = p.id
  );

-- 3. Ověření - kolik uživatelů má INVOICE_VIEW
SELECT COUNT(DISTINCT ur.uzivatel_id) AS pocet_uzivatelu
FROM 25_uzivatel_role ur
JOIN 25_role_prava rp ON ur.role_id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'INVOICE_VIEW';
```

---

## 📊 Vztah uživatele k faktuře (definice "své faktury")

Uživatel vidí fakturu, pokud splňuje **alespoň jednu** z těchto podmínek:

| # | Vztah | Tabulka.Sloupec | Popis |
|---|-------|----------------|-------|
| 1 | **Předáno** | `faktury25.fa_predana_zam_id` | Faktura předána danému zaměstnanci |
| 2 | **Garant objednávky** | `objednavky_2025.garant_uzivatel_id` | Uživatel je garant na objednávce |
| 3 | **Účetní objednávky** | `objednavky_2025.ucetni_uzivatel_id` | Uživatel je účetní na objednávce |
| 4 | **Příkazce objednávky** | `objednavky_2025.prikazce_id` | Uživatel je příkazce na objednávce |
| 5 | **Věcná správnost** | `faktury25.potvrdil_vecnou_spravnost_id` | Uživatel potvrdil věcnou správnost |
| 6 | **Vytvořil objednávku** | `objednavky_2025.uzivatel_id` | Uživatel vytvořil objednávku |
| 7 | **Vytvořil fakturu** | `faktury25.vytvoril_uzivatel_id` | Uživatel zaevidoval fakturu |

**Backend SQL WHERE podmínka:**
```sql
AND (
    :is_admin = 1 
    OR f.fa_predana_zam_id = :user_id
    OR o.garant_uzivatel_id = :user_id
    OR o.ucetni_uzivatel_id = :user_id
    OR o.prikazce_id = :user_id
    OR f.potvrdil_vecnou_spravnost_id = :user_id
    OR o.uzivatel_id = :user_id
    OR f.vytvoril_uzivatel_id = :user_id
)
```

---

## 🎨 UI/UX Poznámky

### Ikony podle stavu

| Stav | Ikona | Barva | Akce |
|------|-------|-------|------|
| **INVOICE_MANAGE - editace** | `faEdit` (tužka) | `#3b82f6` | Otevře editaci faktury |
| **INVOICE_VIEW - čeká na kontrolu** | `faBoltLightning` (blesk) | `#f59e0b` | Otevře dialog věcné kontroly |
| **INVOICE_VIEW - již potvrzeno** | `faCheckCircle` (check) | `#10b981` | Disabled, tooltip s info |

### Potvrzení věcné správnosti

**Dialog:**
- Šedé pozadí (overlay)
- Bílá karta s shadow
- Ikona informace (modrá)
- Titulek: "Potvrdit věcnou správnost faktury"
- Info: číslo faktury, dodavatel, částka
- Textarea: "Umístění majetku" (3 řádky, volitelné)
- Textarea: "Poznámka" (3 řádky, volitelné)
- **Checkbox:** "Potvrzuji věcnou správnost faktury" (REQUIRED)
- Tlačítka:
  - Zrušit (šedé)
  - **Potvrdit věcnou správnost** (zelené, disabled dokud není checkbox)

---

## 🚀 Spuštění a testování

### 1. Přidat právo INVOICE_VIEW uživateli

```sql
-- Přidat právo INVOICE_VIEW konkrétnímu uživateli
-- Nejprve najít user_id a role_id
SELECT u.id AS user_id, u.username, r.id AS role_id, r.nazev_role
FROM 25a_users u
JOIN 25_uzivatel_role ur ON u.id = ur.uzivatel_id
JOIN 25_role r ON ur.role_id = r.id
WHERE u.username = 'testuser';

-- Přidat právo INVOICE_VIEW roli uživatele
INSERT INTO 25_role_prava (role_id, pravo_id, pridelit_kym, dt_pridani)
SELECT 
    <role_id>,  -- ID role z předchozího dotazu
    94,         -- ID práva INVOICE_VIEW
    'admin',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM 25_role_prava WHERE role_id = <role_id> AND pravo_id = 94
);
```

### 2. Spustit frontend

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm start
```

### 3. Testovat workflow

1. Přihlásit se jako uživatel s právem `INVOICE_VIEW`
2. Ověřit, že vidí menu "Faktury"
3. Otevřít `/invoices25`
4. Ověřit, že:
   - **NEVIDÍ** tlačítko "Zaevidovat fakturu"
   - **VIDÍ** pouze faktury, kde je účastníkem
   - **VIDÍ** ikonu blesku u faktur bez potvrzení věcné správnosti
5. Kliknout na ikonu blesku
6. Vyplnit formulář věcné kontroly
7. Potvrdit
8. Ověřit:
   - Faktura má zelený badge "Potvrzeno"
   - Ikona blesku se změnila na checkCircle
   - V DB je `potvrzeni_vecne_spravnosti = 'ANO'`
   - V DB je `potvrdil_vecnou_spravnost_id` = user ID
   - V DB je `dt_potvrzeni_vecne_spravnosti` = aktuální čas

---

## 📚 Související dokumenty

- `_docs/STATUS_INVOICE_FIXES_20251220.md` - Aktuální stav modulu faktur
- `_docs/PLAN_UNISEARCH_INVOICES_PERMISSIONS.md` - Práva v UniversalSearch
- `apps/eeo-v2/client/sql/migration_faktury_vecna_spravnost.sql` - DB migrace věcné správnosti
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php` - Backend handlers

---

## ✅ Hotovo

Po dokončení všech kroků:
- ✅ Uživatelé s právem `INVOICE_VIEW` uvidí menu "Faktury"
- ✅ Uživatelé s `INVOICE_VIEW` vidí pouze faktury, kde jsou účastníky
- ✅ Tlačítko "Zaevidovat fakturu" je skryté pro non-managers
- ✅ Editační ikony jsou nahrazeny ikonou "Potvrdit věcnou správnost"
- ✅ Dialog pro potvrzení věcné správnosti funguje
- ✅ Backend kontroluje oprávnění a umožňuje pouze úpravu věcných polí
- ✅ Permission-based filtering už funguje na backendu

---

**Autor:** AI Assistant  
**Datum:** 21. prosince 2025  
**Revize:** 1.0
