# PHP API Backend

REST API pro Intranet Web aplikaci.

## 🏗️ Struktura

```
api/
├── index.php           # Hlavní router
├── config/             # Konfigurace
├── lib/                # Knihovny a utility
├── handlers/           # Request handlery
└── .htaccess          # Apache rewrite rules
```

## 🔐 Autentizace

API používá Bearer token autentizaci z EntraID.

### Headers
```
Authorization: Bearer <access_token>
```

## 📡 Endpointy

### Health Check
```
GET /api/health
Response: {"status": "ok", "version": "1.0.0"}
```

### User Info
```
GET /api/user
Response: {"user": {...}}
```

## 🔧 Konfigurace

Vytvořte `.env` soubor s následující konfigurací:

```env
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASS=your-db-pass

ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
```

## 📝 Development

Používejte development server nebo Apache s mod_rewrite.
