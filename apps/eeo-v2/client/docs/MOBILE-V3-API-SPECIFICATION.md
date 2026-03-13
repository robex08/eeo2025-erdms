# 🔌 V3 API Specification - Mobilní verze

**Datum:** 11. března 2026  
**Status:** 📋 SPECIFIKACE - K IMPLEMENTACI  
**API Version:** 3.0

---

## 🎯 Cíle V3 API

### Rozdíly oproti V2
- ✅ **RESTful design** - správné HTTP metody a status codes
- ✅ **Konzistentní response format** - jednotná struktura odpovědí
- ✅ **Built-in permissions** - oprávnění vrácené v každé response
- ✅ **Optimalizace pro mobile** - menší payloads, agregované data
- ✅ **Verzování** - jasná verze API v URL
- ✅ **Error handling** - strukturované error messages

---

## 📊 Dashboard Endpoints

### GET /api/v3/dashboard/stats

**Účel:** Agregované statistiky pro dashboard dlaždice  
**Permissions:** Automaticky dle user permissions

**Request:**
```http
GET /api/v3/dashboard/stats?year=2026
Authorization: Bearer <token>
X-Username: <username>
```

**Query parameters:**
```javascript
{
  year: number,          // Rok (default: current year)
  modules: string[]      // Optional: filtr modulů ['orders', 'invoices']
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": {
      "to_approve": {
        "count": 12,
        "total_amount": 1250000.50,
        "urgent_count": 3
      },
      "schvalena": {
        "count": 45,
        "total_amount": 5600000.00
      },
      "zamitnuta": {
        "count": 2,
        "total_amount": 150000.00
      },
      "dokoncena": {
        "count": 120,
        "total_amount": 15000000.00
      }
    },
    "invoices": {
      "unpaid": {
        "count": 8,
        "total_amount": 890000.00,
        "overdue_count": 2
      },
      "paid": {
        "count": 67,
        "total_amount": 8900000.00
      }
    },
    "cashbook": {
      "balance": 125000.00,
      "pokladny": [
        {
          "id": 1,
          "cislo": "1",
          "nazev": "Hlavní pokladna",
          "zustatek": 85000.00
        }
      ]
    },
    "annual_fees": {
      "pending": {
        "count": 5,
        "total_amount": 45000.00
      },
      "paid": {
        "count": 23,
        "total_amount": 230000.00
      }
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "year": 2026,
    "permissions": {
      "orders": ["ORDER_VIEW", "ORDER_APPROVE"],
      "invoices": ["INVOICE_VIEW"],
      "cashbook": ["CASHBOOK_VIEW"],
      "annual_fees": ["ANNUAL_FEE_VIEW"]
    },
    "modules_enabled": ["orders", "invoices", "cashbook"]
  }
}
```

**Cache:** 5 minut (Redis)  
**Performance target:** < 200ms

---

### GET /api/v3/dashboard/tiles

**Účel:** Konfigurace viditelných dlaždic pro uživatele  
**Permissions:** Automaticky dle user permissions

**Request:**
```http
GET /api/v3/dashboard/tiles?device_type=mobile
Authorization: Bearer <token>
X-Username: <username>
```

**Query parameters:**
```javascript
{
  device_type: 'mobile' | 'tablet' // Default: mobile
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "layout": {
      "columns": 2,
      "gap": 12,
      "sections": [
        {
          "id": "section-orders",
          "title": "Objednávky",
          "collapsed": false,
          "tiles": [
            {
              "id": "orders-to-approve",
              "type": "counter-amount",
              "title": "Ke schválení",
              "icon": "faClipboardCheck",
              "color": "orange",
              "order": 1,
              "click_action": "navigate",
              "click_target": "/mobile/orders/approvals",
              "visible": true
            },
            {
              "id": "orders-schvalena",
              "type": "counter-amount",
              "title": "Schválené",
              "icon": "faCheckCircle",
              "color": "green",
              "order": 2,
              "visible": true
            }
          ]
        },
        {
          "id": "section-invoices",
          "title": "Faktury",
          "collapsed": false,
          "tiles": [...]
        }
      ]
    },
    "user_preferences": {
      "sections_collapsed": ["section-annual-fees"],
      "tiles_hidden": []
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "has_admin_overrides": false,
    "has_user_overrides": false
  }
}
```

**Cache:** 10 minut nebo do změny v admin UI  
**Performance target:** < 100ms

---

## 📋 Orders Endpoints

### GET /api/v3/orders

**Účel:** Seznam objednávek s filtry  
**Permissions:** ORDER_VIEW + hierarchy filter

**Request:**
```http
GET /api/v3/orders?year=2026&status=SCHVALENA&page=1&per_page=20
Authorization: Bearer <token>
X-Username: <username>
```

**Query parameters:**
```javascript
{
  year: number,                    // Rok (required)
  status: string,                  // Workflow stav (optional)
  page: number,                    // Stránka (default: 1)
  per_page: number,                // Počet na stránku (default: 20, max: 100)
  search: string,                  // Fulltext search (optional)
  mimoradna_udalost: boolean,      // Filtr na mimořádné (optional)
  prikazce_id: number,             // Filtr na přikázce (optional)
  sort_by: string,                 // 'dt_vytvoreni' | 'castka' (default: dt_vytvoreni)
  sort_order: 'asc' | 'desc'       // Default: desc
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 123,
        "cislo_objednavky": "2026/001/OBJ",
        "ev_cislo": "EV-2026-001",
        "predmet": "Notebook Dell Latitude",
        "stav_workflow_kod": ["SCHVALENA"],
        "stav_objednavky": "Schválená",
        "max_cena_s_dph": 35000.00,
        "polozky_celkova_cena_s_dph": 34500.00,
        "faktury_celkova_castka_s_dph": 34500.00,
        "mimoradna_udalost": false,
        "dt_vytvoreni": "2026-03-01T10:00:00Z",
        "dt_schvaleni": "2026-03-05T14:30:00Z",
        "objednatel": {
          "id": 45,
          "cele_jmeno": "Jan Novák",
          "email": "jan.novak@zzssk.cz"
        },
        "prikazce": {
          "id": 12,
          "cele_jmeno": "Marie Dvořáková"
        },
        "financovani": {
          "typ": "LP",
          "nazev": "Limitovaný příslib",
          "lp_nazvy": [
            {"id": 5, "cislo_lp": "LP-2026-05", "nazev": "IT vybavení"}
          ]
        },
        "_meta": {
          "can_edit": false,
          "can_approve": false,
          "can_reject": false,
          "can_comment": true,
          "available_actions": ["comment", "view_detail"]
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 45,
      "total_pages": 3
    },
    "aggregations": {
      "total_count": 45,
      "total_amount": 5600000.00,
      "by_status": {
        "SCHVALENA": 45
      }
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "permissions": ["ORDER_VIEW"],
    "filters_applied": {
      "year": 2026,
      "status": "SCHVALENA",
      "hierarchy_enabled": true,
      "user_scope": "department"
    }
  }
}
```

**Performance target:** < 300ms

---

### GET /api/v3/orders/:id

**Účel:** Detail jedné objednávky  
**Permissions:** ORDER_VIEW + ownership/hierarchy check

**Request:**
```http
GET /api/v3/orders/123?include=items,attachments,history
Authorization: Bearer <token>
X-Username: <username>
```

**Query parameters:**
```javascript
{
  include: string[]  // ['items', 'attachments', 'invoices', 'history']
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "cislo_objednavky": "2026/001/OBJ",
    "predmet": "Notebook Dell Latitude",
    "popis": "Notebook pro správce IT",
    "stav_workflow_kod": ["SCHVALENA"],
    "stav_objednavky": "Schválená",
    "max_cena_s_dph": 35000.00,
    "mimoradna_udalost": false,
    
    "objednatel": { ... },
    "prikazce": { ... },
    "garant": { ... },
    "schvalovatel": { ... },
    
    "financovani": { ... },
    "usek": { ... },
    "lokalita": { ... },
    
    "dt_vytvoreni": "2026-03-01T10:00:00Z",
    "dt_schvaleni": "2026-03-05T14:30:00Z",
    
    "polozky": [
      {
        "id": 1,
        "nazev": "Notebook Dell Latitude 5540",
        "mnozstvi": 1,
        "mj": "ks",
        "cena_s_dph": 34500.00,
        "cena_bez_dph": 28512.40,
        "dph_sazba": 21
      }
    ],
    
    "prilohy": [
      {
        "id": 456,
        "nazev": "nabidka.pdf",
        "velikost": 124567,
        "mime_type": "application/pdf",
        "url": "/api/v3/attachments/456/download"
      }
    ],
    
    "history": [
      {
        "id": 1,
        "akce": "VYTVORENA",
        "uzivatel": "Jan Novák",
        "dt_akce": "2026-03-01T10:00:00Z",
        "komentar": null
      },
      {
        "id": 2,
        "akce": "SCHVALENA",
        "uzivatel": "Marie Dvořáková",
        "dt_akce": "2026-03-05T14:30:00Z",
        "komentar": "Schváleno dle plánu"
      }
    ],
    
    "_meta": {
      "can_edit": false,
      "can_approve": false,
      "can_reject": false,
      "can_comment": true,
      "can_change_status": false,
      "available_actions": [
        {
          "id": "comment",
          "label": "Přidat komentář",
          "icon": "faComment",
          "endpoint": "/api/v3/orders/123/comment",
          "method": "POST"
        }
      ]
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "permissions": ["ORDER_VIEW"]
  }
}
```

**Performance target:** < 200ms

---

### POST /api/v3/orders/:id/approve

**Účel:** Schválení objednávky  
**Permissions:** ORDER_APPROVE + prikazce check

**Request:**
```http
POST /api/v3/orders/123/approve
Authorization: Bearer <token>
X-Username: <username>
Content-Type: application/json

{
  "comment": "Schváleno dle plánu"
}
```

**Request body:**
```javascript
{
  comment?: string  // Optional komentář
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "cislo_objednavky": "2026/001/OBJ",
    "stav_workflow_kod": ["SCHVALENA"],
    "stav_objednavky": "Schválená",
    "dt_schvaleni": "2026-03-11T10:35:00Z",
    "schvalovatel": {
      "id": 12,
      "cele_jmeno": "Marie Dvořáková"
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z",
    "version": "3.0",
    "action": "APPROVED",
    "message": "Objednávka byla úspěšně schválena"
  }
}
```

**Error response (permission denied):**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Nemáte oprávnění ke schválení této objednávky",
    "details": {
      "reason": "not_prikazce",
      "required_permission": "ORDER_APPROVE",
      "prikazce_required": true
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z"
  }
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad request (invalid input)
- 403: Permission denied
- 404: Order not found
- 409: Conflict (already approved)

---

### POST /api/v3/orders/:id/reject

**Účel:** Zamítnutí objednávky  
**Permissions:** ORDER_APPROVE + prikazce check

**Request:**
```http
POST /api/v3/orders/123/reject
Authorization: Bearer <token>
X-Username: <username>
Content-Type: application/json

{
  "reason": "Nedostatečný rozpočet"
}
```

**Request body:**
```javascript
{
  reason: string  // REQUIRED - důvod zamítnutí
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "stav_workflow_kod": ["ZAMITNUTA"],
    "stav_objednavky": "Zamítnutá",
    "dt_zamitnuti": "2026-03-11T10:35:00Z",
    "zamital_uzivatel": {
      "id": 12,
      "cele_jmeno": "Marie Dvořáková"
    },
    "duvod_zamitnuti": "Nedostatečný rozpočet"
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z",
    "version": "3.0",
    "action": "REJECTED",
    "message": "Objednávka byla zamítnuta"
  }
}
```

---

### PATCH /api/v3/orders/:id/status

**Účel:** Změna stavu objednávky  
**Permissions:** ORDER_CHANGE_STATUS

**Request:**
```http
PATCH /api/v3/orders/123/status
Authorization: Bearer <token>
X-Username: <username>
Content-Type: application/json

{
  "status": "DOKONCENA",
  "comment": "Zboží převzato"
}
```

**Request body:**
```javascript
{
  status: string,      // Nový stav (CEKA_SE, DOKONCENA, ...)
  comment?: string     // Optional komentář
}
```

**Allowed status transitions:**
```javascript
{
  SCHVALENA: ['CEKA_SE', 'DOKONCENA', 'ZRUSENA'],
  CEKA_SE: ['SCHVALENA', 'ZAMITNUTA'],
  // ... další pravidla
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "stav_workflow_kod": ["SCHVALENA", "DOKONCENA"],
    "stav_objednavky": "Dokončená",
    "dt_upgrade": "2026-03-11T10:35:00Z"
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z",
    "version": "3.0",
    "action": "STATUS_CHANGED",
    "previous_status": "SCHVALENA",
    "new_status": "DOKONCENA"
  }
}
```

---

### POST /api/v3/orders/:id/comment

**Účel:** Přidání komentáře k objednávce  
**Permissions:** ORDER_VIEW

**Request:**
```http
POST /api/v3/orders/123/comment
Authorization: Bearer <token>
X-Username: <username>
Content-Type: application/json

{
  "text": "Požadavek na upřesnění dodacího termínu",
  "type": "internal"
}
```

**Request body:**
```javascript
{
  text: string,                      // Komentář (max 500 znaků)
  type?: 'internal' | 'public'       // Default: internal
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comment_id": 456,
    "order_id": 123,
    "text": "Požadavek na upřesnění dodacího termínu",
    "type": "internal",
    "author": {
      "id": 12,
      "cele_jmeno": "Marie Dvořáková"
    },
    "dt_vytvoreni": "2026-03-11T10:35:00Z"
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z",
    "version": "3.0",
    "action": "COMMENT_ADDED"
  }
}
```

---

## 💰 Invoices Endpoints

### GET /api/v3/invoices

**Účel:** Seznam faktur  
**Permissions:** INVOICE_VIEW

**Request:**
```http
GET /api/v3/invoices?year=2026&paid=false&page=1
Authorization: Bearer <token>
X-Username: <username>
```

**Query parameters:**
```javascript
{
  year: number,
  paid?: boolean,               // true | false
  overdue?: boolean,            // Filtr na po splatnosti
  page: number,
  per_page: number
}
```

**Response:** (Similar structure as orders)

---

### PATCH /api/v3/invoices/:id/status

**Účel:** Změna stavu faktury  
**Permissions:** INVOICE_CHANGE_STATUS

**Request:**
```http
PATCH /api/v3/invoices/456/status
Content-Type: application/json

{
  "status": "ZAPLACENA",
  "dt_uhrazeni": "2026-03-11",
  "comment": "Uhrazeno převodem"
}
```

---

## 💼 Cashbook Endpoints

### GET /api/v3/cashbook/balance

**Účel:** Aktuální zůstatky pokladen  
**Permissions:** CASHBOOK_VIEW

**Request:**
```http
GET /api/v3/cashbook/balance?year=2026&month=3
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pokladny": [
      {
        "id": 1,
        "cislo": "1",
        "nazev": "Hlavní pokladna",
        "zustatek": 85000.00,
        "prevod": 100000.00,
        "prijmy": {
          "count": 5,
          "amount": 25000.00
        },
        "vydaje": {
          "count": 12,
          "amount": 40000.00
        }
      }
    ],
    "total_balance": 85000.00
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "period": {
      "year": 2026,
      "month": 3
    }
  }
}
```

---

## 📅 Annual Fees Endpoints

### GET /api/v3/annual-fees

**Účel:** Seznam ročních poplatků  
**Permissions:** ANNUAL_FEE_VIEW

### POST /api/v3/annual-fees/:id/paid

**Účel:** Označit jako zaplacené  
**Permissions:** ANNUAL_FEE_APPROVE

---

## 🔐 Permissions Endpoint

### GET /api/v3/permissions/user

**Účel:** Načtení všech oprávnění aktuálního uživatele  
**Permissions:** Žádné (každý může načíst své vlastní)

**Request:**
```http
GET /api/v3/permissions/user
Authorization: Bearer <token>
X-Username: <username>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 12,
      "username": "marie.dvorakova",
      "cele_jmeno": "Marie Dvořáková"
    },
    "roles": [
      {
        "id": 3,
        "kod_role": "MANAGER",
        "nazev": "Manažer",
        "is_admin": false
      }
    ],
    "permissions": [
      "ORDER_VIEW",
      "ORDER_APPROVE",
      "INVOICE_VIEW",
      "CASHBOOK_VIEW"
    ],
    "modules": [
      "MODULE_ORDERS",
      "MODULE_INVOICES",
      "MODULE_CASHBOOK"
    ],
    "hierarchy": {
      "enabled": true,
      "profile_id": 2,
      "scope": "department",
      "is_immune": false
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0"
  }
}
```

---

## ⚠️ Error Handling

### Standard error codes

```javascript
{
  // Client errors (4xx)
  "BAD_REQUEST": 400,                  // Špatný formát requestu
  "UNAUTHORIZED": 401,                 // Chybí token
  "PERMISSION_DENIED": 403,            // Nedostatečná oprávnění
  "NOT_FOUND": 404,                    // Entita neexistuje
  "CONFLICT": 409,                     // Konflikt (např. už schváleno)
  "VALIDATION_ERROR": 422,             // Validační chyba
  
  // Server errors (5xx)
  "INTERNAL_ERROR": 500,               // Interní chyba serveru
  "SERVICE_UNAVAILABLE": 503           // Služba nedostupná
}
```

### Error response structure

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validační chyba vstupních dat",
    "details": {
      "field": "reason",
      "error": "Důvod zamítnutí je povinný"
    }
  },
  "meta": {
    "timestamp": "2026-03-11T10:35:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## 🚀 Performance & Caching

### Caching strategy

```javascript
{
  '/api/v3/dashboard/stats': {
    cache: 'redis',
    ttl: 300,              // 5 minut
    invalidate_on: ['order_update', 'invoice_update']
  },
  
  '/api/v3/dashboard/tiles': {
    cache: 'redis',
    ttl: 600,              // 10 minut
    invalidate_on: ['admin_config_change']
  },
  
  '/api/v3/orders': {
    cache: 'none',         // Vždy fresh data
    etag: true             // Použít ETag pro conditional requests
  },
  
  '/api/v3/permissions/user': {
    cache: 'redis',
    ttl: 1800,             // 30 minut
    invalidate_on: ['user_role_change', 'permission_change']
  }
}
```

### Response compression

```http
Content-Encoding: gzip
```

Pro payloads > 1KB automaticky gzip compression.

---

## 📊 Monitoring & Logging

### Metrics to track

- Response time per endpoint
- Error rate
- Cache hit ratio
- Most used endpoints
- Permission denied rate

### Logging format

```json
{
  "timestamp": "2026-03-11T10:35:00Z",
  "level": "info",
  "method": "POST",
  "endpoint": "/api/v3/orders/123/approve",
  "user": "marie.dvorakova",
  "status": 200,
  "duration_ms": 145,
  "request_id": "req_abc123"
}
```

---

**Status:** 📋 SPECIFIKACE PŘIPRAVENA  
**Next:** Backend implementace V3 endpointů
