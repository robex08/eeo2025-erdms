# 📊 PODROBNÁ ANALÝZA FAKTURY V EEO-V2

## 1️⃣ DB STRUKTURA FAKTURY

### 🗄️ Tabulky s Fakturami

```sql
-- Hlavní tabulka faktury (objednávky)
TBL_FAKTURY = '25a_faktury_objednavek'    -- Faktury vázané na objednávky

-- Přílohy faktury
TBL_FAKTURY_PRILOHY = '25a_faktury_prilohy'  -- Soubory přidělené k faktuře

-- LP čerpání na fakturách
TBL_FAKTURY_LP_CERPANI = '25a_faktury_lp_cerpani'  -- Rozdělení LP kódů na faktuře
```

### 📋 Sloupce tabulky `25a_faktury_objednavek`

| Sloupec | Typ | Popis | Zdroj |
|---------|-----|-------|-------|
| `id` | INT | Primární klíč | - |
| `objednavka_id` | INT | FK na `25a_objednavky` | - |
| `fa_cislo_vema` | VARCHAR | Číslo faktury od dodavatele | - |
| `fa_castka` | DECIMAL(10,2) | Cena faktury Kč | - |
| `fa_datum_splatnosti` | DATE | Splatnost faktury | - |
| `fa_dorucena` | TINYINT | Je dodána (0/1) | - |
| **`potvrzeni_vecne_spravnosti`** | ENUM('ANO','NE') | **Věcná správnost (ANO/NE/NULL=neověřeno)** | Migration |
| **`potvrzeno_uzivatel_id`** | INT | **ID uživatele, který potvrdil VS** | Migration |
| **`potvrzeno_datum`** | DATETIME | **Datum potvrzení VS** | Migration |
| **`vecna_spravnost_umisteni_majetku`** | TEXT | **Poznámka k umístění majetku** | Migration |
| **`vecna_spravnost_poznamka`** | TEXT | **Obecná poznámka k VS faktury** | Migration |
| `rozsirujici_data` | JSON | Další data (kontrola řádku) | - |
| `aktivni` | TINYINT | Soft delete flag (1=aktiv) | - |
| `dt_vytvoreni` | TIMESTAMP | Čas vytvoření | - |
| `dt_aktualizace` | TIMESTAMP | Čas poslední změny | - |

### 🔗 Tabulka `25a_faktury_prilohy`

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | INT | Primární klíč |
| `faktura_id` | INT | FK na `25a_faktury_objednavek` |
| `objednavka_id` | INT | FK na `25a_objednavky` (pro optimalizaci) |
| `guid` | VARCHAR(50) | GUID pro jedinečnost |
| `typ_prilohy` | VARCHAR(50) | Klasifikace: `FAKTURA`, `ISDOC`, `DOPLNEK_FA` |
| `originalni_nazev_souboru` | VARCHAR(255) | Jméno souboru |
| `systemova_cesta` | VARCHAR(255) | Cesta na disku |
| `velikost_souboru_b` | INT | Velikost v bytech |
| `je_isdoc` | TINYINT | Je ISDOC soubor (0/1) |
| `isdoc_parsed` | TINYINT | ISDOC data extrahována (0/1) |
| `isdoc_data_json` | TEXT | Extrahovaná ISDOC data |
| `nahrano_uzivatel_id` | INT | Uživatel, který nahrál |
| `dt_vytvoreni` | TIMESTAMP | Čas vytvoření |
| `dt_aktualizace` | TIMESTAMP | Čas poslední aktualizace |

### 🔗 Tabulka `25a_faktury_lp_cerpani`

Připojuje LP kódy k faktuře pro sledování skutečného čerpání:
- `faktura_id` → ID faktury
- `lp_id` → ID LP kódu
- `castka` → Částka čerpána z daného LP
- `poznamka` → Poznámka k čerpání

### ⚙️ Stavy faktury (ENUM v `25a_objednavky_faktury.stav`)

```php
define('INVOICE_STATUS_REGISTERED', 'ZAEVIDOVANA');      // Nově vložená z podatelny
define('INVOICE_STATUS_VERIFICATION', 'VECNA_SPRAVNOST'); // Poslaná k potvrzení VS
define('INVOICE_STATUS_IN_PROGRESS', 'V_RESENI');         // Čeká se na dořešení
define('INVOICE_STATUS_HANDOVER_PO', 'PREDANA_PO');       // Fyzicky na ředitelství
define('INVOICE_STATUS_TO_PAY', 'K_ZAPLACENI');           // Předáno HÚ k úhradě
define('INVOICE_STATUS_PAID', 'ZAPLACENO');               // Uhrazeno
define('INVOICE_STATUS_CANCELLED', 'STORNO');             // Stažena dodavatelem
```

### 🔗 Připojení mezi objednávkou a fakturou

```
25a_objednavky (objednávka)
    ↓
    faktura_id (FK)
    ↓
25a_faktury_objednavek (faktura)
    ↓
    objednavka_id (zpětná vazba)
    ↓
(jedna objednávka → N faktur)
```

---

## 2️⃣ AKTUÁLNÍ KÓD FAKTURY

### 📌 Backend Handlery (API Endpointy)

| Handler | Soubor | Endpointy | Stav |
|---------|--------|-----------|------|
| **invoiceHandlers.php** | `/lib/invoiceHandlers.php` | 8 endpointů (invoices25/*) | 🚨 **DEPRECATED** - pouze pro backward compatibility |
| **orderV2InvoiceHandlers.php** | `/lib/orderV2InvoiceHandlers.php` | ✅ **PRIMÁRNÍ API** - order-v2/* endpointy | ✅ AKTIVNÍ |
| **invoiceCheckHandlers.php** | `/lib/invoiceCheckHandlers.php` | `invoices/toggle-check`, `invoices/get-checks` | ✅ AKTIVNÍ |
| **invoiceAttachmentHandlers.php** | `/lib/invoiceAttachmentHandlers.php` | Přílohy faktury (legacy) | 🚨 DEPRECATED |
| **orderV2InvoiceAttachmentHandlers.php** | `/lib/orderV2InvoiceAttachmentHandlers.php` | Přílohy faktury (V2 API) | ✅ AKTIVNÍ |
| **fakturyLpCerpaniHandlers.php** | `/lib/fakturyLpCerpaniHandlers.php` | `faktury/lp-cerpani/*` | ✅ AKTIVNÍ |

### 📋 LEGACY Endpointy (invoices25/* - DEPRECATED)

```php
// ❌ NEPOUŽÍVAT - DEPRECATED od 21.12.2025
handle_invoices25_by_order($input, $config, $queries)          // POST invoices25/by-order
handle_invoices25_by_id($input, $config, $queries)             // POST invoices25/by-id
handle_invoices25_create($input, $config, $queries)            // POST invoices25/create
handle_invoices25_create_with_attachment(...)                  // POST invoices25/create-with-attachment
handle_invoices25_update($input, $config, $queries)            // POST invoices25/update
handle_invoices25_delete($input, $config, $queries)            // POST invoices25/delete
handle_invoices25_restore($input, $config, $queries)           // POST invoices25/restore
handle_invoices25_list($input, $config, $queries)              // POST invoices25/list
```

**Migrace na ORDER-V2:**
```
invoices25/create  →  order-v2/invoices/create 
                      NEBO order-v2/{order_id}/invoices/create

invoices25/update  →  order-v2/invoices/{invoice_id}/update

invoices25/delete  →  order-v2/invoices/{invoice_id}/delete

invoices25/attachments/*  →  order-v2/invoices/{id}/attachments/*
```

### ✅ AKTIVNÍ ENDPOINTY (orderV2InvoiceHandlers.php)

```php
// Získání faktur objednávky
getOrderInvoices($order_id, $config)
  POST order-v2/{order_id}/invoices/list
  
// Detail faktury
getInvoiceDetail($faktura_id, $config)
  POST order-v2/invoices/{invoice_id}/get

// Vytvoření faktury
createInvoiceV2($input, $config, $queries)
  POST order-v2/invoices/create
  POST order-v2/{order_id}/invoices/create

// Aktualizace faktury
updateInvoiceV2($input, $config, $queries)
  POST order-v2/invoices/{invoice_id}/update

// Smazání faktury
deleteInvoiceV2($input, $config, $queries)
  POST order-v2/invoices/{invoice_id}/delete
```

### 🔍 KONTROLA FAKTURY (invoiceCheckHandlers.php)

```php
handle_invoice_toggle_check($input, $config)
  POST /invoices/toggle-check
  Přepne stav kontroly faktury (zaškrtnout/odškrtnout)
  
handle_get_invoice_checks($input, $config)
  POST /invoices/get-checks
  Načte stavy kontrol pro více faktur
```

**Ukládá se do JSON:**
```json
{
  "kontrola_radku": {
    "kontrolovano": true,
    "kontroloval_user_id": 123,
    "kontroloval_username": "novak",
    "kontroloval_cele_jmeno": "Novák Jan",
    "dt_kontroly": "2026-01-20 15:30:00"
  }
}
```

### 💰 LP ČERPÁNÍ NA FAKTURÁCH (fakturyLpCerpaniHandlers.php)

```php
handle_save_faktura_lp_cerpani($input, $config, $queries)
  POST /faktury/lp-cerpani/save
  
  INPUT:
  {
    "username": "novak",
    "token": "...",
    "faktura_id": 182,
    "lp_cerpani": [
      {"lp_cislo": "6", "lp_id": 6, "castka": 50000.00, "poznamka": ""},
      {"lp_cislo": "7", "lp_id": 7, "castka": 25000.00, "poznamka": ""}
    ]
  }
  
  Validace:
  - Součet částek MUSÍ být ≤ fa_castka
  - Pokud je financování typu LP, MUSÍ být min. 1 LP kód
  - Každá částka > 0
  - LP kódy faktury MUSÍ být ze seznamu LP kódů objednávky

handle_get_faktura_lp_cerpani($input, $config, $queries)
  POST /faktury/lp-cerpani/get
  Načte LP čerpání pro konkrétní fakturu
```

### 📎 PŘÍLOHY FAKTURY (orderV2InvoiceAttachmentHandlers.php)

```php
// V2 API
uploadInvoiceAttachmentV2($input, $config)
  POST order-v2/invoices/{invoice_id}/attachments/upload
  
getInvoiceAttachmentsV2($invoice_id, $config)
  POST order-v2/invoices/{invoice_id}/attachments/list
  
deleteInvoiceAttachmentV2($input, $config)
  POST order-v2/invoices/{invoice_id}/attachments/{attachment_id}/delete
```

---

## 3️⃣ FRONTEND KOMPONENTY

### 🎨 Hlavní Stránky/Komponenty

| Komponenta | Soubor | Účel |
|------------|--------|------|
| **Invoices25List** | `/pages/Invoices25List.js` | Hlavní seznam všech faktur v systému |
| **InvoiceEvidencePage** | `/pages/InvoiceEvidencePage.jsx` | Evidence nových faktur (z podatelny) |
| **FinancialControlModal** | `/components/FinancialControlModal.js` | Dialog pro kontrolu věcné správnosti (PDF preview) |
| **FinancialControlConfirmationModal** | `/components/FinancialControlConfirmationModal.js` | Konfirmace a tisk VS |

### 📱 API Service Soubory

| Service | Soubor | Endpointy |
|---------|--------|-----------|
| **api25invoices.js** | `/services/api25invoices.js` | Legacy invoices25/* endpointy |
| **apiInvoiceV2.js** | `/services/apiInvoiceV2.js` | Order-v2 invoice API |
| **apiInvoiceCheck.js** | `/services/apiInvoiceCheck.js` | Kontrola faktury (toggle-check) |
| **apiFakturyLPCerpani.js** | `/services/apiFakturyLPCerpani.js` | LP čerpání na fakturách |

### 🎯 Přílohy Faktury - Komponenty

```
/components/invoices/
  ├── InvoiceAttachmentItem.js           -- Jednosloupcový řádek v seznamu
  ├── InvoiceAttachmentsCompact.js       -- Kompaktní náhled příloh
  ├── InvoiceAttachmentsSection.js       -- Plný editor příloh
  ├── InvoiceAttachmentsTooltip.js       -- Tooltip s podrobnostmi
  ├── InvoiceAttachmentUploadButton.js   -- Tlačítko pro upload
  ├── AttachmentViewer.js                -- Náhled dokumentu
```

### 🎯 OrderForm25 - Faktury v Objednávce

```jsx
// V OrderForm25 se faktury zobrazují v sekcích:
// 1. FÁZE 6 - Faktury - seznam všech faktur
// 2. FÁZE 7 - Věcná správnost - detail + potvrzení VS
// 3. FÁZE 8 - Dokončení objednávky - finální kontrola
```

---

## 4️⃣ VĚCNÁ SPRÁVNOST IMPLEMENTACE

### 🎯 Co je Věcná Správnost?

**Věcná správnost faktury** = kontrola, zda se faktury shodují s tím, co bylo objednáno a dodáno.

Konkrétně se kontroluje:
- ✅ Shoduje se obsah faktury s položkami objednávky?
- ✅ Jsou ceny správné?
- ✅ Jsou všechny střediska správně přiřazena?
- ✅ Je majetek umístěn správně?

### 📊 DB Sloupce Věcné Správnosti

```sql
ALTER TABLE `25a_faktury_objednavek` ADD (
  -- Potvrzení věcné správnosti
  `potvrzeni_vecne_spravnosti` ENUM('ANO', 'NE') NULL DEFAULT NULL,
  
  -- Kdo potvrdil
  `potvrzeno_uzivatel_id` INT(11) NULL DEFAULT NULL,
  FOREIGN KEY (`potvrzeno_uzivatel_id`) REFERENCES `25a_users` (`id`),
  
  -- Kdy potvrdil
  `potvrzeno_datum` DATETIME NULL DEFAULT NULL,
  
  -- Umístění majetku (pro poznámku)
  `vecna_spravnost_umisteni_majetku` TEXT NULL,
  
  -- Obecná poznámka
  `vecna_spravnost_poznamka` TEXT NULL
);

-- Indexy pro optimalizaci
CREATE INDEX `idx_faktury_vecna_spravnost` 
  ON `25a_faktury_objednavek` (`potvrzeni_vecne_spravnosti`);
```

### 🖥️ Frontend UI - Věcná Správnost (OrderForm25)

**Fáze 7 - Věcná Správnost objednávky:**

```jsx
{/* Grid 2 sloupce: OBJEDNÁVKA vs FAKTURA */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
  {/* LEVÝ SLOUPEC - OBJEDNÁVKA */}
  <div style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
    <h3>📄 OBJEDNÁVKA</h3>
    <div>Max. cena s DPH</div>
    <div>Střediska</div>
    <div>Položky objednávky</div>
  </div>
  
  {/* PRAVÝ SLOUPEC - FAKTURY */}
  <div style={{ border: '2px solid #8b5cf6', background: '#f5f3ff' }}>
    <h3>🧾 FAKTURY</h3>
    <div>Celková cena všech faktur</div>
    <div>Střediska na fakturách</div>
    <div>Položky faktury (z ISDOC)</div>
  </div>
</div>

{/* UMÍSTĚNÍ MAJETKU */}
<TextArea
  label="Umístění majetku"
  value={formData.vecna_spravnost_umisteni_majetku || ''}
  placeholder="Popisy lokací, skladů, místností..."
/>

{/* POZNÁMKA */}
<TextArea
  label="Poznámka k věcné správnosti"
  value={formData.vecna_spravnost_poznamka || ''}
  placeholder="Jakékoli poznatky nebo problémy..."
/>

{/* POTVRZOVACÍ CHECKBOX */}
<Checkbox
  label="Potvrzuji, že věcná správnost je OK"
  checked={formData.potvrzeni_vecne_spravnosti === 1}
  onChange={(e) => {
    handleInputChange('potvrzeni_vecne_spravnosti', e.target.checked ? 1 : 0);
    // Automaticky nastavit uživatele a čas
    if (e.target.checked) {
      handleInputChange('potvrdil_vecnou_spravnost_id', user.id);
      handleInputChange('dt_potvrzeni_vecne_spravnosti', new Date().toISOString());
    }
  }}
/>
```

### 🎬 Automatický Workflow - Věcná Správnost

```javascript
// Pokud uživatel zaškrtne potvrzení VS:
if (formData.potvrzeni_vecne_spravnosti === 1) {
  // ✅ Odebrat ze workflow 'KONTROLA' - kontrola je hotová
  workflowStates = workflowStates.filter(s => s !== 'KONTROLA');
  
  // 🆕 Automaticky nastavit ID uživatele + čas (jen při prvním potvrzení)
  if (!formData.potvrdil_vecnou_spravnost_id) {
    orderData.potvrdil_vecnou_spravnost_id = user_id;
    orderData.dt_potvrzeni_vecne_spravnosti = getCzechDateTime('Y-m-d H:i:s');
  }
} else {
  // Pokud checkbox NENÍ zaškrtnutý
  if (!workflowStates.includes('KONTROLA')) {
    workflowStates.push('KONTROLA');  // Přidat zpět kontrolu
  }
  
  // Smazat údaje o potvrzení
  orderData.potvrdil_vecnou_spravnost_id = null;
  orderData.dt_potvrzeni_vecne_spravnosti = null;
}
```

### 📄 Dialog pro Věcnou Správnost

**FinancialControlModal.js:**
- Otevírá se na kliknutí "Kontrola věcné správnosti"
- Zobrazuje **PDF s fakturou a objednávkou vedle sebe** (OrderForm25)
- Umožňuje přidávat poznámky
- Na úspěch generuje PDF zprávu

**FinancialControlConfirmationModal.js:**
- Konfirmace a finální tisk zprávy
- Zobrazuje údaje o tom, kdo a kdy potvrdil
- Možnost stažení/tisku PDF

### 📊 Kontrola Jednotlivého Řádku (Invoice Check)

Oddělená funkcionalita - **kontrola konkrétní faktury** (řádku v seznamu):

```javascript
// POST /invoices/toggle-check
{
  "username": "novak",
  "token": "...",
  "faktura_id": 182,
  "kontrolovano": true  // Zaškrtnout/odškrtnout kontrolu
}

// Ukládá se do rozsirujici_data JSON:
{
  "kontrola_radku": {
    "kontrolovano": true,
    "kontroloval_user_id": 123,
    "kontroloval_username": "novak",
    "kontroloval_cele_jmeno": "Novák Jan",
    "dt_kontroly": "2026-01-20 15:30:00"
  }
}
```

---

## 5️⃣ ORDERFORM25 FAKTURY

### 📋 OrderForm25 - Obecně

`OrderForm25` = Detailní formulář pro **jednu objednávku** s více fázemi:

```
FÁZE 1  ✅ Základní údaje
FÁZE 2  ✅ Položky objednávky (LP kódy, ceny)
FÁZE 3  ✅ Střediska a alokace
FÁZE 4  ✅ Smlouvy
FÁZE 5  ✅ Přílohy
FÁZE 6  ✅ FAKTURY     ← V TOMTO OBSAHU JE SEZNAM FAKTUR
FÁZE 7  ✅ VĚCNÁ SPRÁVNOST ← KONTROLA FAKTURY VS OBJEDNÁVKY
FÁZE 8  ✅ DOKONČENÍ   ← FINÁLNÍ POTVRZENÍ
```

### 📍 Faktury v OrderForm25

#### FÁZE 6 - Faktury (seznam)

```jsx
{/* Seznam všech faktur objednávky */}
{detail.faktury && detail.faktury.length > 0 && (
  <div className="faktury-seznam">
    {detail.faktury.map(faktura => (
      <div key={faktura.id} className="faktura-radek">
        <div>Číslo: {faktura.fa_cislo_vema}</div>
        <div>Částka: {faktura.fa_castka} Kč</div>
        <div>Splatnost: {faktura.fa_datum_splatnosti}</div>
        <div>Stav: {faktura.stav}</div>
        {/* Přílohy faktury */}
        <InvoiceAttachmentsTooltip 
          faktura_id={faktura.id} 
          objednavka_id={detail.id}
        />
      </div>
    ))}
  </div>
)}
```

#### FÁZE 7 - Věcná Správnost (Detail + Potvrzení)

```jsx
{/* Hlavní sekce - VS */}
<div className="vecna-spravnost-kontrola">
  {/* Porovnání OBJEDNÁVKA vs FAKTURY */}
  <VsControlComparison 
    order={detail}
    invoices={detail.faktury}
  />
  
  {/* Textové pole - umístění majetku */}
  <TextArea
    label="Umístění majetku"
    value={formData.vecna_spravnost_umisteni_majetku}
  />
  
  {/* Textové pole - poznámka */}
  <TextArea
    label="Poznámka k VS"
    value={formData.vecna_spravnost_poznamka}
  />
  
  {/* CHECKBOX - POTVRZENÍ */}
  <Checkbox
    label="Potvrzuji věcnou správnost"
    checked={formData.potvrzeni_vecne_spravnosti === 1}
  />
  
  {/* Tlačítko - Otevřít dialog s PDF */}
  <Button 
    onClick={openFinancialControlModal}
    icon="print"
  >
    Kontrola věcné správnosti (PDF)
  </Button>
</div>
```

#### FÁZE 8 - Dokončení (Finální potvrzení)

```jsx
{/* Finální kontrola - je vše OK? */}
<div className="faze-8-dokonceni">
  <h3>Finální potvrzení dokončení objednávky</h3>
  
  {/* Shrnutí - je vše splněno? */}
  <div className="checklist">
    <div>
      ✅ Objednávka má faktury: {detail.faktury?.length > 0 ? 'ANO' : 'NE'}
    </div>
    <div>
      ✅ Věcná správnost potvrzena: {formData.potvrzeni_vecne_spravnosti === 1 ? 'ANO' : 'NE'}
    </div>
    <div>
      ✅ Všechny faktury jsou zaplaceny: {checkAllInvoicesPaid(detail.faktury) ? 'ANO' : 'NE'}
    </div>
  </div>
  
  {/* Poznámka */}
  <TextArea
    label="Poznámka ke kontrole"
    value={formData.dokonceni_poznamka}
  />
  
  {/* FINÁLNÍ CHECKBOX */}
  <Checkbox
    label="Potvrzuji, že objednávka je DOKONČENA"
    checked={formData.potvrzeni_dokonceni_objednavky === 1}
  />
</div>
```

### 📦 Data Struktura OrderForm25 Faktury

```javascript
// Při načítání objednávky z DB:
const formData = {
  // ... ostatní pole ...
  
  // FÁZE 6 - Faktury
  faktury: [
    {
      id: 182,
      fa_cislo_vema: "2025/001",
      fa_castka: 75000.00,
      fa_datum_splatnosti: "2025-12-31",
      fa_dorucena: 1,
      stav: "VECNA_SPRAVNOST",
      
      // Věcná správnost
      potvrzeni_vecne_spravnosti: null,      // ANO/NE
      potvrzeno_uzivatel_id: null,            // ID uživatele
      potvrzeno_datum: null,                  // Čas potvrzení
      vecna_spravnost_umisteni_majetku: "",   // Text
      vecna_spravnost_poznamka: "",           // Text
      
      // Přílohy
      prilohy: [
        {
          id: 1,
          guid: "abc123",
          typ_prilohy: "ISDOC",
          originalni_nazev_souboru: "FA-2025-001.xml",
          je_isdoc: 1,
          isdoc_parsed: 1,
          isdoc_data_json: {...}
        }
      ]
    }
  ],
  
  // FÁZE 7 - Věcná Správnost
  vecna_spravnost_umisteni_majetku: "Sklad č. 3, Polic A-12",
  vecna_spravnost_poznamka: "Kontrola OK, shoduje se s dohodou",
  potvrzeni_vecne_spravnosti: 1,    // 0/1 - checkbox
  potvrdil_vecnou_spravnost_id: 123, // User ID
  dt_potvrzeni_vecne_spravnosti: "2026-01-20T15:30:00Z",
  
  // FÁZE 8 - Dokončení
  potvrzeni_dokonceni_objednavky: 0,  // 0/1 - checkbox
  dokonceni_poznamka: "",
  dokoncil_id: null,
  dt_dokonceni: null
};
```

### 🔄 OrderForm25 - Aktualizace Faktury

Při uložení OrderForm25 se faktury **NEAKTUALIZUJÍ přímo v tabulce faktury**, ale:

1. **Přímo v objednávce** se uloží VS údaje:
   ```javascript
   // Do 25a_objednavky se uloží:
   orderData.vecna_spravnost_umisteni_majetku = "...";
   orderData.vecna_spravnost_poznamka = "...";
   orderData.potvrzeni_vecne_spravnosti = 1;
   ```

2. **LP čerpání** se uloží **do 25a_faktury_lp_cerpani**:
   ```php
   POST /faktury/lp-cerpani/save
   {
     "faktura_id": 182,
     "lp_cerpani": [
       {"lp_cislo": "6", "castka": 50000},
       {"lp_cislo": "7", "castka": 25000}
     ]
   }
   ```

3. **Metadata faktury** zůstávají v `25a_faktury_objednavek`

---

## 📊 SHRNUTÍ - Klíčové Poznatky

| Aspekt | Detail |
|--------|--------|
| **Hlavní tabulka faktury** | `25a_faktury_objednavek` |
| **Přílohy** | `25a_faktury_prilohy` (ISDOC, PDF) |
| **LP čerpání** | `25a_faktury_lp_cerpani` (rozdělení LP kódů) |
| **Věcná správnost** | 5 sloupců v `25a_faktury_objednavek` + migration |
| **Backend API** | `orderV2InvoiceHandlers.php` (aktivní), `invoiceHandlers.php` (deprecated) |
| **Control API** | `invoiceCheckHandlers.php` (toggle-check, get-checks) |
| **LP API** | `fakturyLpCerpaniHandlers.php` (save, get) |
| **Frontend stránka** | `Invoices25List.js` (seznam), `InvoiceEvidencePage.jsx` (evidence) |
| **OrderForm25** | Fáze 6 (seznam), Fáze 7 (VS), Fáze 8 (dokončení) |
| **VS Dialog** | `FinancialControlModal.js` (kontrola), `FinancialControlConfirmationModal.js` (tisk) |
| **Workflow** | ZAEVIDOVANA → VECNA_SPRAVNOST → V_RESENI → PREDANA_PO → K_ZAPLACENI → ZAPLACENO |
| **OrderForm25 Faktury** | Načítá se z objednávky, řídí workflow, potvrzuje VS |

---

**POZNÁMKA:** Toto je **PODROBNÁ ANALÝZA bez spekulací** - vše je z kódu, migration scriptů a frontend komponent.
