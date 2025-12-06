# PHP API Communication Pattern

## 📋 Základní pravidla komunikace s PHP Backend API

Dokumentace standardního způsobu komunikace mezi React frontendem a PHP backend API v projektu ERDMS.

**Datum vytvoření:** 6. prosince 2025  
**Platnost:** Všechny PHP API endpointy v `api-legacy/`

---

## 🔑 Autentizace a autorizace

### Povinné parametry pro VŠECHNY PHP API requesty:

```javascript
// ✅ SPRÁVNĚ - Vždy POST metoda s token + username
const response = await axios.post('/endpoint', {
  token: token,        // Auth token z AuthContext
  username: username   // Username z AuthContext
  // ... další parametry
});

// ❌ ŠPATNĚ - GET metoda nebo chybějící credentials
const response = await axios.get('/endpoint?token=xyz'); // NIKDY!
```

### Struktura axios instance:

```javascript
const apiInstance = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});
```

---

## 📤 HTTP Metoda - POUZE POST

**DŮLEŽITÉ:** Všechny requesty na PHP API používají **POST metodu**, i pro operace čtení dat (GET-like).

### Příklady:

```javascript
// 1. Seznam (list) - POST, ne GET
export async function listInvoices25(yearFilter, token, username) {
  const response = await api25invoices.post('invoices25/list', {
    token,
    username,
    year: yearFilter
  });
  return response.data;
}

// 2. Detail (get by ID) - POST, ne GET
export async function getInvoiceDetail(invoiceId, token, username) {
  const response = await api25invoices.post(`invoices25/detail/${invoiceId}`, {
    token,
    username
  });
  return response.data;
}

// 3. Update - POST
export async function updateInvoiceV2(invoiceId, updateData, token, username) {
  const response = await api25invoices.post(`order-v2/invoices/${invoiceId}/update`, {
    token,
    username,
    ...updateData  // fa_zaplacena, fa_datum_uhrazeni, etc.
  });
  return response.data;
}

// 4. Delete - POST
export async function deleteInvoiceV2(invoiceId, token, username, hardDelete = false) {
  const response = await api25invoices.post('invoices25/delete', {
    token,
    username,
    invoice_id: invoiceId,
    hard_delete: hardDelete
  });
  return response.data;
}

// 5. Upload file - POST s multipart/form-data
export async function uploadInvoiceAttachment(formData, token, username) {
  formData.append('token', token);
  formData.append('username', username);
  
  const response = await api25invoices.post('invoices25/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}
```

---

## 🎯 Best Practices

### 1. Vždy destrukturuj credentials z AuthContext

```javascript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function MyComponent() {
  const { token, username } = useContext(AuthContext);
  
  const handleAction = async () => {
    await someApiCall(token, username);
  };
}
```

### 2. Error handling pattern

```javascript
try {
  const response = await api25invoices.post('endpoint', {
    token,
    username,
    ...params
  });
  
  // Success
  return response.data;
  
} catch (err) {
  // Normalize error message
  const errorMsg = err.response?.data?.message 
    || err.response?.data?.error 
    || err.message 
    || 'Neočekávaná chyba';
    
  throw new Error(errorMsg);
}
```

### 3. Response interceptor pro token expiration

```javascript
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto-logout on 401/403
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('authError', {
        detail: { message: 'Vaše přihlášení vypršelo.' }
      }));
    }
    return Promise.reject(error);
  }
);
```

---

## 📂 Umístění API service souborů

```
apps/eeo-v2/client/src/services/
├── api25invoices.js      - Invoice API calls
├── api25orders.js        - Order API calls
├── api25workflows.js     - Workflow API calls
└── api25users.js         - User API calls
```

---

## ⚠️ Časté chyby

### ❌ **CHYBA 1**: Použití GET metody
```javascript
// ŠPATNĚ
axios.get(`/invoices/${id}?token=${token}`);

// SPRÁVNĚ
axios.post(`/invoices/${id}`, { token, username });
```

### ❌ **CHYBA 2**: Chybějící credentials
```javascript
// ŠPATNĚ - chybí username
axios.post('/invoices', { token });

// SPRÁVNĚ - vždy token + username
axios.post('/invoices', { token, username });
```

### ❌ **CHYBA 3**: Query parameters místo body
```javascript
// ŠPATNĚ
axios.post(`/invoices?year=${year}`, { token, username });

// SPRÁVNĚ - vše v body
axios.post('/invoices', { token, username, year });
```

---

## 🔍 Debugging tipy

### Console log pattern pro API calls:

```javascript
console.log('📤 [API] Calling:', endpoint);
console.log('📤 [API] Payload:', { token: '***', username, ...otherParams });

try {
  const response = await api.post(endpoint, payload);
  console.log('✅ [API] Success:', response.data);
  return response.data;
} catch (err) {
  console.error('❌ [API] Error:', err.response?.data || err.message);
  throw err;
}
```

---

## 📚 Reference files

- **API Service Examples:** 
  - `/apps/eeo-v2/client/src/services/api25invoices.js`
  - `/apps/eeo-v2/client/src/services/api25orders.js`

- **Backend API Handlers:**
  - `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
  - `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

- **AuthContext:**
  - `/apps/eeo-v2/client/src/contexts/AuthContext.jsx`

---

## ✅ Checklist pro nový API endpoint

- [ ] Metoda: POST (ne GET)
- [ ] Body obsahuje: `token`, `username`
- [ ] Axios instance má správnou baseURL
- [ ] Error handling s normalize pattern
- [ ] Response interceptor pro 401/403
- [ ] Console logs pro debugging
- [ ] JSDoc komentář s popisem parametrů
- [ ] Export funkce z service souboru
- [ ] Import v komponentě a použití s credentials z AuthContext

---

**Poznámka:** Tento pattern platí pro všechny PHP API endpointy v `api-legacy/`. Pro nové Node.js API v `apps/eeo-v2/api/` může být pattern jiný (REST standard s GET/POST/PUT/DELETE).
