# 🔍 QUICK TEST GUIDE - Delete Invoice Debug

## 🚀 Jak Testovat

### 1. Spustit Aplikaci
```bash
npm start
```

### 2. Otevřít DevTools Console
- `F12` nebo `Ctrl+Shift+I`
- Záložka **Console**
- Vyčistit log: `Clear console` (🗑️ ikona)

### 3. Otevřít Objednávku s Fakturou
- Najdi objednávku, která má fakturu
- Otevři ji v OrderForm25

### 4. Kliknout na "Smazat Fakturu"
- Zobrazí se confirm dialog
- Potvrdit smazání

### 5. Sledovat Console Output

**Očekávaný výstup při CHYBĚ:**

```
🔴 [DELETE_INVOICE_DEBUG] ========================================
🔴 [DELETE_INVOICE_DEBUG] Payload: {
  "token": "abcd1234...",
  "username": "jan.novak",
  "id": 123,
  "hard_delete": 1
}
🔴 [DELETE_INVOICE_DEBUG] Token length: 64
🔴 [DELETE_INVOICE_DEBUG] Username: jan.novak
🔴 [DELETE_INVOICE_DEBUG] Faktura ID: 123
🔴 [DELETE_INVOICE_DEBUG] URL: https://eeo.zachranka.cz/api.eeo/invoices25/delete

🔴 [DELETE_INVOICE_DEBUG] Auth error detected, but NOT triggering auto-logout
🔴 [DELETE_INVOICE_DEBUG] HTTP Status: 401
🔴 [DELETE_INVOICE_DEBUG] This allows user to see the actual error message

🔴 [DELETE_INVOICE_DEBUG] ========================================
🔴 [DELETE_INVOICE_DEBUG] ERROR CAUGHT: Request failed with status code 401
🔴 [DELETE_INVOICE_DEBUG] HTTP Status: 401
🔴 [DELETE_INVOICE_DEBUG] HTTP StatusText: Unauthorized
🔴 [DELETE_INVOICE_DEBUG] Response Data: {
  "status": "error",
  "message": "Token expired" <-- ❗ TOTO JE DŮLEŽITÉ!
}
🔴 [DELETE_INVOICE_DEBUG] Response Headers: {
  "content-type": "application/json",
  "date": "Fri, 31 Oct 2025 10:30:00 GMT",
  ...
}
🔴 [DELETE_INVOICE_DEBUG] Config URL: invoices25/delete
🔴 [DELETE_INVOICE_DEBUG] Config Method: post
🔴 [DELETE_INVOICE_DEBUG] Config Data: {"token":"...","username":"...","id":123,"hard_delete":1}
🔴 [DELETE_INVOICE_DEBUG] ========================================
```

---

## 📋 CO POSLAT BACKEND TÝMU

### 1. Screenshot Console Output
- Celý output mezi `========================================`
- Zvláště důležité: **Response Data**

### 2. Network Tab Info
- `F12` → záložka **Network**
- Najít request: `invoices25/delete`
- Pravý klik → **Copy** → **Copy as cURL**
- Poslat BE týmu

### 3. Odpovědi na Otázky

```
❓ HTTP Status Code: _____
❓ Error Message z Response Data: _____
❓ Token Length: _____
❓ Username: _____
❓ Funguje mazání příloh faktury? (ANO/NE)
❓ Funguje upload příloh faktury? (ANO/NE)
❓ Funguje list příloh faktury? (ANO/NE)
```

---

## 🎯 OČEKÁVANÉ VÝSLEDKY

### Scénář A: Token Expired (Timezone Issue)
```json
{
  "status": "error",
  "message": "Token expired"
}
```
**Řešení:** BE musí opravit timezone check

---

### Scénář B: Permission Denied
```json
{
  "status": "error",
  "message": "Nemáte oprávnění mazat faktury"
}
```
**Řešení:** BE musí přidat permission check nebo povolit delete

---

### Scénář C: Token Invalid
```json
{
  "status": "error",
  "message": "Invalid token"
}
```
**Řešení:** BE musí použít stejnou token validaci jako ostatní endpointy

---

### Scénář D: Jiný Error
```json
{
  "status": "error",
  "message": "Něco jiného"
}
```
**Řešení:** Poslat celý output BE týmu

---

## 🔧 CO SE ZMĚNILO V KÓDU

### 1. Přidán Debug Logging
**Soubor:** `src/services/api25invoices.js`
- Loguje celý request payload
- Loguje celou response (včetně error)
- Prefix: `🔴 [DELETE_INVOICE_DEBUG]`

### 2. Vypnuto Auto-Logout pro Delete Invoice
**Důvod:** Aby uživatel viděl skutečnou chybu místo "Vaše přihlášení vypršelo"

**Soubor:** `src/services/api25invoices.js` - interceptor

**Změna:**
```javascript
// PŘED: Každý 401/403 = auto-logout
if (error.response?.status === 401 || error.response?.status === 403) {
  window.dispatchEvent(new CustomEvent('authError', { ... }));
}

// PO: Pouze pro NON-delete endpointy
const isDeleteInvoice = error.config?.url?.includes('invoices25/delete');
if (isDeleteInvoice) {
  // NEPROVÁDĚT auto-logout, vrátit error
  return Promise.reject(error);
}
// Pro ostatní zachovat auto-logout
```

---

## ⚠️ DŮLEŽITÉ

### Auto-Logout je DOČASNĚ VYPNUTÝ pouze pro `invoices25/delete`

**Proč:**
- Abys viděl skutečnou chybu z BE
- Abys mohl poslat přesné error message BE týmu
- Aby aplikace neodhlásila uživatele při debug testování

**Ostatní endpointy:**
- ✅ Stále mají auto-logout při 401/403
- ✅ Security není ohroženo

**Po opravě BE:**
- 🔧 Vrátit auto-logout pro všechny endpointy
- 🗑️ Odstranit debug logy

---

## 📞 CO DĚLAT DÁLE

### 1. Testovat (TY)
```bash
npm start
# Zkusit smazat fakturu
# Zkopírovat console output
```

### 2. Poslat Info BE (TY)
```
- Console output (screenshot)
- Network → Copy as cURL
- Odpovědi na otázky výše
```

### 3. Opravit (BE TÝM)
```php
// Zkontrolovat:
- Token validation v invoices25/delete
- Timezone nastavení
- Permission check
- Porovnat s order-v2/* endpointy
```

### 4. Cleanup (TY po opravě)
```bash
# Odstranit debug logy
# Vrátit auto-logout pro všechny endpointy
git revert HEAD
```

---

## 🎯 CÍLE TESTU

- ✅ Zjistit přesný HTTP status (401, 403, 500?)
- ✅ Zjistit přesnou error message z BE
- ✅ Potvrdit, že token je platný (funguje pro jiné endpointy)
- ✅ Poslat kompletní info BE týmu
- ✅ Neodhlásit uživatele během testování

---

**Připraveno:** 31. října 2025  
**Autor:** GitHub Copilot  
**Urgence:** 🔴 CRITICAL
