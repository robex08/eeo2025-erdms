# 🔒 Ochrana faktur ve stavu DOKONCENA + Race Condition Fix

**Datum:** 4. února 2026  
**Verze:** 2.23-DEV  
**Branch:** feature/generic-recipient-system

---

## 📋 PŘEHLED ZMĚN

Implementovány tři důležité bezpečnostní a stability úpravy:

1. **🛡️ Kompletní READ-ONLY ochrana faktur ve stavu DOKONCENA**
2. **🔒 Ochrana příloh faktur ve stavu DOKONCENA**
3. **⚡ Ochrana Save tlačítka proti dvojkliku (race condition prevention)**

---

## 1️⃣ KOMPLETNÍ READ-ONLY OCHRANA FAKTUR VE STAVU DOKONCENA

### 🎯 Účel
Zamezit **jakékoliv editaci** faktury ve stavu **DOKONCENA** - všechna pole jsou pouze pro čtení.

### ✅ Kdo je ovlivněn
- ❌ **Všichni uživatelé včetně SUPERADMIN, ADMINISTRATOR, UCETNI**
- ✅ Nikdo nemůže editovat fakturu ve stavu DOKONCENA (kromě zobrazení)

### 📝 Co je chráněno

#### **Všechny formulářové prvky jsou disabled:**
- Datum doručení, vystavení, splatnosti
- Typ faktury (Zálohová, Konečná, ...)
- Variabilní symbol
- Částka vč. DPH
- Středisko
- Poznámka
- Předmět objednávky
- Všechna další pole formuláře

#### **Tlačítko "Aktualizovat fakturu" je disabled**

### 📝 Implementované změny

#### **Frontend - InvoiceEvidencePage.js**

**1. Logika `isInvoiceEditable` (řádek ~2098):**  
**Soubor:** [apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js](apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js#L2098)

```javascript
// 🔥 KONTROLA STAVU FAKTURY: Pokud je faktura DOKONČENÁ, nelze ji editovat
// ⚠️ READ-ONLY pro VŠECHNY včetně ADMIN/UCETNI
if (originalFormData.stav === 'DOKONCENA') {
  return false; // ❌ Fakturu nelze editovat - je DOKONČENÁ
}
```

**2. Tlačítko "Aktualizovat fakturu" (řádek ~6655):**  
**Soubor:** [apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js](apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js#L6655)

```javascript
<Button 
  $variant="primary" 
  onClick={handleSubmit} 
  disabled={
    loading || 
    hasOnlyViewPermission ||
    // 🔥 NOVÉ: Faktura se stavem DOKONCENA nelze editovat (jen READ-ONLY)
    (originalFormData?.stav === 'DOKONCENA') ||
    // ... další disabled logika
  }
  title={
    originalFormData?.stav === 'DOKONCENA'
      ? '🔒 Faktura je DOKONČENÁ a nelze ji editovat. Všechna pole jsou pouze pro čtení.'
      : // ... další tooltip texty
  }
>
```

**3. Visual indikace (Badge + Info box):**

**Badge v hlavičce:**
```javascript
{originalFormData?.stav === 'DOKONCENA' && (
  <span style={{ 
    background: 'rgba(220, 38, 38, 0.15)',
    border: '2px solid #dc2626',
    color: '#dc2626',
    fontWeight: 700,
    textTransform: 'uppercase'
  }}>
    <FontAwesomeIcon icon={faLock} />
    DOKONČENÁ - READ-ONLY
  </span>
)}
```

**Info box před formulářem:**
```javascript
{originalFormData?.stav === 'DOKONCENA' && (
  <div style={{
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    border: '3px solid #dc2626',
    // ... další styling
  }}>
    🔒 FAKTURA JE DOKONČENÁ
    <br/>
    ❌ Nelze upravovat žádná pole faktury
    ❌ Nelze mazat ani měnit klasifikaci příloh
    ✅ Můžete pouze zobrazit data a přílohy
  </div>
)}
```

### 🧪 Testování

1. Otevřít fakturu se stavem `DOKONCENA` v **Upravit fakturu** dialogu
2. **Badge v hlavičce** by měl zobrazit: _"🔒 DOKONČENÁ - READ-ONLY"_
3. **Info box** by měl být viditelný s červeným rámečkem a upozorněním
4. **Všechna pole** by měla být **disabled** (šedá, neaktivní)
5. **Tlačítko "Aktualizovat fakturu"** by mělo být **disabled** s tooltipem
6. Hover na tlačítko → zobrazí se: _"🔒 Faktura je DOKONČENÁ a nelze ji editovat..."_

---

## 2️⃣ OCHRANA PŘÍLOH FAKTUR VE STAVU DOKONCENA

### ✅ Kdo je ovlivněn
- ❌ **Všichni uživatelé včetně SUPERADMIN, ADMINISTRATOR, UCETNI**
- ✅ Nikdo nemůže mazat/upravovat přílohy u dokončené faktury

### 📝 Implementované změny

#### **Frontend - InvoiceAttachmentsCompact.js**
**Soubor:** [apps/eeo-v2/client/src/components/invoices/InvoiceAttachmentsCompact.js](apps/eeo-v2/client/src/components/invoices/InvoiceAttachmentsCompact.js#L577)

```javascript
// 🛡️ Kontrola oprávnění pro editaci/mazání přílohy
const canEditAttachment = useCallback((attachment) => {
  if (!attachment) return false;
  
  // 🔒 KRITICKÁ KONTROLA: Pokud je faktura ve stavu DOKONCENA, 
  // NIKDO nemůže mazat/editovat přílohy
  // (včetně SUPERADMIN, ADMINISTRATOR, UCETNI)
  if (faktura?.stav === 'DOKONCENA') {
    return false;
  }
  
  // ... zbytek kontroly oprávnění
}, [faktura, allUsers, userDetail]);
```

**UI změny:**
- Tlačítko 🗑️ Trash je **disabled** a skryté
- Zobrazí se 🔒 ikona s popisem: _"Faktura je ve stavu DOKONCENA - nelze upravovat přílohy"_

#### **Backend - orderV2InvoiceAttachmentHandlers.php**

**DELETE handler:**  
**Soubor:** [apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php#L540)

```php
// 🔒 KRITICKÁ KONTROLA: Nelze smazat přílohu faktury ve stavu DOKONCENA
if ($attachment['stav'] === 'DOKONCENA') {
    http_response_code(403);
    echo json_encode(array(
        'status' => 'error',
        'message' => 'Nelze smazat přílohu faktury ve stavu DOKONCENA',
        'reason' => 'Faktura je dokončena a nelze ji upravovat'
    ));
    error_log("❌ DELETE BLOCKED: Faktura #{$invoice_id} je ve stavu DOKONCENA");
    return;
}
```

**UPDATE handler:**  
**Soubor:** [apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php#L750)

```php
// 🔒 KRITICKÁ KONTROLA: Nelze upravit přílohu faktury ve stavu DOKONCENA
if ($attachment['stav'] === 'DOKONCENA') {
    http_response_code(403);
    echo json_encode(array(
        'success' => false,
        'error' => 'Nelze upravit klasifikaci přílohy faktury ve stavu DOKONCENA',
        'reason' => 'Faktura je dokončena a nelze ji upravovat'
    ));
    error_log("❌ UPDATE BLOCKED: Faktura #{$invoice_id} je ve stavu DOKONCENA");
    return;
}
```

### 🧪 Testování

```bash
# 1. Vytvořit fakturu ve stavu DOKONCENA
mysql> UPDATE 25a_objednavky_faktury SET stav = 'DOKONCENA' WHERE id = XXX;

# 2. Pokus o mazání přílohy
curl -X POST https://eeo-dev/api.eeo/order-v2/invoices/XXX/attachments/YYY/delete \
  -H "Content-Type: application/json" \
  -d '{"token":"...","username":"...","invoice_id":XXX,"attachment_id":YYY}'

# Očekávaná odpověď:
{
  "status": "error",
  "message": "Nelze smazat přílohu faktury ve stavu DOKONCENA"
}
```

### 📊 Vliv na workflow

| Akce | Před změnou | Po změně |
|------|-------------|----------|
| **Editace pole faktury (DOKONCENA)** | ✅ Povoleno (ADMIN/UCETNI) | ❌ Zakázáno (všem) - READ-ONLY |
| **Aktualizovat fakturu (DOKONCENA)** | ✅ Povoleno (ADMIN/UCETNI) | ❌ Zakázáno (všem) - tlačítko disabled |
| **DELETE přílohy (DOKONCENA)** | ✅ Povoleno (ADMIN) | ❌ Zakázáno (všem) |
| **UPDATE klasifikace přílohy (DOKONCENA)** | ✅ Povoleno (ADMIN) | ❌ Zakázáno (všem) |
| **Zobrazení faktury (DOKONCENA)** | ✅ Povoleno | ✅ Nezměněno - READ-ONLY režim |
| **Editace faktury (jiné stavy)** | ✅ Povoleno (podle oprávnění) | ✅ Nezměněno |
| **DELETE přílohy (jiné stavy)** | ✅ Povoleno (podle oprávnění) | ✅ Nezměněno |

---

## 3️⃣ OCHRANA SAVE TLAČÍTKA PROTI DVOJKLIKU

### 🎯 Účel
Zabránit **race condition** při rychlém dvojkliku na tlačítko "ULOŽIT" v OrderForm25.

### ❗ Problém
- Uživatel rychle klikne na Save 2x → dva requesty běží paralelně
- Může dojít k nekonzistentnímu stavu dat nebo nežádoucím změnám

### ✅ Řešení
Přidána kontrola `isSaving` stavu na začátek funkce `handleSaveOrder()`.

#### **Frontend - OrderForm25.js**
**Soubor:** [apps/eeo-v2/client/src/forms/OrderForm25.js](apps/eeo-v2/client/src/forms/OrderForm25.js#L17945)

```javascript
const handleSaveOrder = async () => {
  // 🔒 OCHRANA PROTI DVOJKLIKU (race condition prevention)
  if (isSaving) {
    console.warn('⚠️ Ukládání již probíhá, ignoruji duplicitní požadavek');
    return;
  }

  // Vymazat debug konzoli před uložením
  clearDebugLogs();
  addDebugLog('info', 'SAVE', 'order-save-start', 'Začínám ukládání objednávky...');

  // Zavolej naši API funkci
  await saveOrderToAPI();
};
```

### 🎯 Jak to funguje

1. **První klik:** `isSaving = false` → pokračuje s ukládáním
2. **Funkce `saveOrderToAPI()` nastaví:** `setIsSaving(true)`
3. **Druhý klik (během ukládání):** `isSaving = true` → ignoruje a vrátí `return`
4. **Po dokončení:** `setIsSaving(false)` → Save je opět povoleno

### 🧪 Testování

```javascript
// V Chrome DevTools Console:
// 1. Otevřít OrderForm25
// 2. Rychle kliknout na Save 2x
// 3. V konzoli by se mělo objevit:
⚠️ Ukládání již probíhá, ignoruji duplicitní požadavek
```

### 📊 Vliv na UX

| Scénář | Před změnou | Po změně |
|--------|-------------|----------|
| **Jeden klik na Save** | ✅ Uloží | ✅ Uloží |
| **Dvojklik na Save** | ❌ Dva requesty paralelně | ✅ Druhý klik ignorován |
| **Klik během ukládání** | ❌ Další request | ✅ Ignorován s varováním |

---

## 🔧 TECHNICKÉ DETAILY

### Bezpečnostní vrstvy

#### **Frontend (InvoiceAttachmentsCompact.js)**
- ✅ Disable tlačítek DELETE/EDIT
- ✅ Zobrazení 🔒 ikony s popisem
- ✅ `canEditAttachment()` vrací `false` pro DOKONCENA

#### **Backend (orderV2InvoiceAttachmentHandlers.php)**
- ✅ HTTP 403 Forbidden při pokusu o DELETE
- ✅ HTTP 403 Forbidden při pokusu o UPDATE
- ✅ Error logging pro monitoring

### Affected Files

```
✅ apps/eeo-v2/client/src/forms/OrderForm25.js
   - Řádek ~17945: handleSaveOrder() - přidána ochrana proti dvojkliku

✅ apps/eeo-v2/client/src/components/invoices/InvoiceAttachmentsCompact.js
   - Řádek ~577: canEditAttachment() - přidána kontrola stavu DOKONCENA
   - Řádek ~643: getPermissionReasonText() - aktualizován text důvodu
   - Řádek ~2750: Tooltip pro 🔒 ikonu - aktualizován text

✅ apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php
   - Řádek ~585: handle_order_v2_delete_invoice_attachment() - přidána kontrola
   - Řádek ~815: handle_order_v2_update_invoice_attachment() - přidána kontrola
```

---

## 🚀 DEPLOYMENT

### DEV Environment
```bash
cd /var/www/erdms-dev
git status
# Zkontrolovat změny:
# - OrderForm25.js
# - InvoiceAttachmentsCompact.js
# - orderV2InvoiceAttachmentHandlers.php

# Frontend build není potřeba (React hot reload v DEV)
# Backend je připraven okamžitě
```

### PRODUCTION (po testování v DEV)
```bash
# 1. Commit změn
git add apps/eeo-v2/client/src/forms/OrderForm25.js
git add apps/eeo-v2/client/src/components/invoices/InvoiceAttachmentsCompact.js
git add apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php
git commit -m "🔒 Ochrana příloh faktur DOKONCENA + race condition fix"

# 2. Build frontendu
cd apps/eeo-v2/client/
npm run build

# 3. Deploy do produkce
# ... podle standardního deployment procesu
```

---

## 📝 CHANGELOG ENTRY

```markdown
## [2.23-DEV] - 2026-02-04

### 🔒 Security
- Zamezeno mazání a úpravám příloh faktur ve stavu DOKONCENA (všechny role včetně ADMIN)
- Backend API vrací HTTP 403 při pokusu o DELETE/UPDATE přílohy dokončené faktury
- Frontend disable tlačítek DELETE/EDIT + zobrazení 🔒 ikony s vysvětlením

### 🐛 Bug Fixes
- Opravena race condition při rychlém dvojkliku na Save button v OrderForm25
- Přidána ochrana proti paralelním save requestům (isSaving check)

### 📝 Documentation
- Vytvořena analýza možných příčin mazání příloh: ANALYZ_MAZANI_PRILOH_FAKTUR.md
- Dokumentace změn: CHANGELOG_INVOICE_ATTACHMENTS_PROTECTION.md
```

---

## 🔍 MONITORING

### Backend Logs
```bash
# Sledovat pokusy o neoprávněné operace:
tail -f /var/log/php8.1-fpm.log | grep "DELETE BLOCKED\|UPDATE BLOCKED"

# Očekávaný výstup:
❌ DELETE BLOCKED: Faktura #123 je ve stavu DOKONCENA - mazání přílohy zamítnuto
❌ UPDATE BLOCKED: Faktura #456 je ve stavu DOKONCENA - úprava přílohy zamítnuta
```

### Frontend Console
```javascript
// Při dvojkliku na Save:
⚠️ Ukládání již probíhá, ignoruji duplicitní požadavek
```

---

## ✅ TESTOVACÍ SCÉNÁŘE

### Test 1: Mazání přílohy (DOKONCENA)
1. ✅ Vytvořit fakturu ve stavu DOKONCENA
2. ✅ Otevřít fakturu v OrderForm25
3. ✅ Zkontrolovat, že tlačítko 🗑️ je skryté
4. ✅ Zkontrolovat, že je zobrazena 🔒 ikona
5. ✅ Pokusit se o DELETE přes API → očekávám HTTP 403

### Test 2: Úprava klasifikace (DOKONCENA)
1. ✅ Vytvořit fakturu ve stavu DOKONCENA
2. ✅ Pokusit se změnit typ přílohy přes API → očekávám HTTP 403

### Test 3: Dvojklik na Save
1. ✅ Otevřít objednávku v OrderForm25
2. ✅ Rychle kliknout 2x na "ULOŽIT"
3. ✅ V konzoli by měl být warning o ignorování
4. ✅ Na serveru by měl být pouze JEDEN request

### Test 4: Běžné operace (nezměněno)
1. ✅ Mazání příloh u faktur v jiných stavech → funguje
2. ✅ Upload nových příloh u DOKONCENA → funguje
3. ✅ Stahování příloh u DOKONCENA → funguje

---

## 📞 KONTAKT

**Pro otázky nebo problémy:**
- Backend: Zkontrolovat PHP error log
- Frontend: Zkontrolovat browser console
- Git: `git log --oneline --grep="Ochrana příloh"`

**Related Issues:**
- Race condition při ukládání objednávek
- Nežádoucí mazání příloh faktur

**Related Files:**
- [ANALYZ_MAZANI_PRILOH_FAKTUR.md](ANALYZ_MAZANI_PRILOH_FAKTUR.md)
