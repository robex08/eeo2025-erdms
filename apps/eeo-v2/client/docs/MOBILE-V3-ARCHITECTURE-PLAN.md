# 📱 Mobilní verze - Architektura a plán (V3)

**Datum:** 11. března 2026  
**Status:** 📋 PLÁN - ZATÍM NEIMPLEMENTOVÁNO  
**Verze:** 3.0 (samostatný modul)

---

## 🎯 Cíle refactoringu

### 1. Oddělená mobile aplikace
- ✅ Samostatný build proces
- ✅ Sdílená DNS (eeo.zzssk.cz) s routingem
- ✅ Podpora variant: `/mobile`, `/tablet`
- ✅ Nezávislá na hlavní aplikaci (může se buildovat samostatně)

### 2. V3 API integrace
- ✅ Migrace na novější V3 endpointy
- ✅ Unifikované API volání napříč moduly
- ✅ Konzistentní error handling

### 3. Globální permissions systém
- ✅ Viditelnost dlaždic dle práv a rolí
- ✅ Feature flags pro moduly
- ✅ User-specific vs Role-based visibility

### 4. Konfigurovatelné dlaždice
- ✅ Admin UI pro konfiguraci layoutu
- ✅ Per-user customizace (volitelné)
- ✅ Responsive layout system

### 5. Mini-editace
- ✅ Změna stavů (objednávky, faktury)
- ✅ Poznámky a komentáře
- ✅ Schvalování/zamítání
- ❌ **NE**: Plné editace, vytváření nových záznamů

---

## 🏗️ Architektura - Oddělená mobile app

### Současná struktura
```
apps/eeo-v2/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── mobile/        ← Mobile komponenty
│   │   │   └── ...            ← Desktop komponenty
│   │   └── ...
│   ├── package.json
│   └── vite.config.js         ← Společný build
```

### Navrhovaná struktura (Varianta A: Oddělené projekty)
```
apps/
├── eeo-v2/                        # Desktop aplikace
│   ├── client/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── vite.config.js
│   └── ...
│
├── eeo-v2-mobile/                 # 📱 Mobilní aplikace (NOVÝ)
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── cashbook/
│   │   │   ├── annual-fees/
│   │   │   └── shared/
│   │   ├── services/
│   │   │   ├── apiV3/            # V3 API clients
│   │   │   ├── permissions/
│   │   │   └── config/
│   │   ├── hooks/
│   │   ├── utils/                 # Sdílené utility (symlink/npm package)
│   │   ├── config/
│   │   │   ├── tiles.config.js    # Konfigurace dlaždic
│   │   │   └── routes.config.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
└── shared/                        # Sdílené mezi desktop i mobile
    ├── utils/
    ├── constants/
    ├── types/
    └── package.json               # NPM workspace package
```

### Varianta B: Monorepo s Nx/Turborepo
```
apps/
├── eeo-v2-desktop/
├── eeo-v2-mobile/
├── eeo-v2-tablet/  (optional)
└── shared/
    ├── utils/
    ├── api-clients/
    └── components/
```

**Doporučení:** Varianta A je jednodušší pro začátek, Varianta B vhodná pro dlouhodobý růst.

---

## 🌐 Routing a DNS strategie

### Současný stav
```
https://eeo.zzssk.cz/           → Desktop + Mobile detection
```

### Navrhovaný stav

#### Option 1: Path-based routing (DOPORUČENO)
```
https://eeo.zzssk.cz/                    → Desktop aplikace
https://eeo.zzssk.cz/mobile/             → Mobilní aplikace
https://eeo.zzssk.cz/tablet/             → Tablet varianta (optional)
https://eeo.zzssk.cz/api/v3/             → V3 API
```

**Apache/Nginx konfigurace:**
```apache
# Desktop app (default)
<Location />
    ProxyPass http://localhost:5173/
    ProxyPassReverse http://localhost:5173/
</Location>

# Mobile app (port 5174)
<Location /mobile>
    ProxyPass http://localhost:5174/
    ProxyPassReverse http://localhost:5174/
</Location>

# Tablet app (port 5175 - optional)
<Location /tablet>
    ProxyPass http://localhost:5175/
    ProxyPassReverse http://localhost:5175/
</Location>

# API
<Location /api>
    ProxyPass http://localhost:3000/api
    ProxyPassReverse http://localhost:3000/api
</Location>
```

#### Option 2: Subdomain routing
```
https://eeo.zzssk.cz/              → Desktop
https://mobile.eeo.zzssk.cz/       → Mobile
https://tablet.eeo.zzssk.cz/       → Tablet
```

**Výhody Option 1 (path-based):**
- ✅ Jednodušší SSL certifikáty
- ✅ Sdílené cookies/session
- ✅ Snazší deployment

**Výhody Option 2 (subdomain):**
- ✅ Úplně oddělené aplikace
- ✅ Nezávislé caching
- ✅ Různé CDN strategie

**→ Doporučuji Option 1** pro začátek, později lze přejít na Option 2.

---

## 🔧 Build systém

### package.json (root workspace)
```json
{
  "name": "eeo-v2-workspace",
  "private": true,
  "workspaces": [
    "apps/eeo-v2/client",
    "apps/eeo-v2-mobile",
    "apps/shared"
  ],
  "scripts": {
    "dev:desktop": "cd apps/eeo-v2/client && npm run dev",
    "dev:mobile": "cd apps/eeo-v2-mobile && npm run dev",
    "dev:all": "concurrently \"npm run dev:desktop\" \"npm run dev:mobile\"",
    
    "build:desktop": "cd apps/eeo-v2/client && npm run build",
    "build:mobile": "cd apps/eeo-v2-mobile && npm run build",
    "build:all": "npm run build:desktop && npm run build:mobile",
    
    "deploy:mobile": "npm run build:mobile && ./deploy-mobile.sh"
  }
}
```

### vite.config.js (mobile)
```javascript
// apps/eeo-v2-mobile/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Base path pro /mobile URL
  base: '/mobile/',
  
  // Port pro dev server
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  
  // Build konfigurace
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    
    // Optimalizace pro mobile
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs v produkci
        drop_debugger: true
      }
    },
    
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@fortawesome/react-fontawesome'],
          'utils': ['./src/utils/index.js']
        }
      }
    }
  },
  
  // Aliasy pro sdílené resources
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@config': path.resolve(__dirname, './src/config')
    }
  }
});
```

### Deploy script (deploy-mobile.sh)
```bash
#!/bin/bash
# Deploy mobilní aplikace

echo "📱 Deploying Mobile App..."

# Build
cd apps/eeo-v2-mobile
npm run build

# Copy do production složky
cp -r dist/* /var/www/eeo-v2/mobile/

# Restart Apache/Nginx
systemctl reload apache2

echo "✅ Mobile app deployed!"
```

---

## 🔌 V3 API Integration

### API Structure
```
api/
├── v3/
│   ├── orders/
│   │   ├── GET    /api/v3/orders              # List objednávek
│   │   ├── GET    /api/v3/orders/:id          # Detail objednávky
│   │   ├── PATCH  /api/v3/orders/:id/status   # Změna stavu
│   │   ├── POST   /api/v3/orders/:id/comment  # Přidat komentář
│   │   └── POST   /api/v3/orders/:id/approve  # Schválit
│   ├── invoices/
│   │   ├── GET    /api/v3/invoices
│   │   ├── GET    /api/v3/invoices/:id
│   │   ├── PATCH  /api/v3/invoices/:id/status
│   │   └── POST   /api/v3/invoices/:id/comment
│   ├── cashbook/
│   │   ├── GET    /api/v3/cashbook
│   │   └── GET    /api/v3/cashbook/:id
│   ├── annual-fees/
│   │   ├── GET    /api/v3/annual-fees
│   │   ├── GET    /api/v3/annual-fees/:id
│   │   └── PATCH  /api/v3/annual-fees/:id/status
│   ├── dashboard/
│   │   ├── GET    /api/v3/dashboard/stats     # Agregované statistiky
│   │   └── GET    /api/v3/dashboard/tiles     # Konfigurace dlaždic
│   └── permissions/
│       ├── GET    /api/v3/permissions/user    # Oprávnění uživatele
│       └── GET    /api/v3/permissions/tiles   # Viditelné dlaždice
```

### API Client služby (mobile)

```javascript
// services/apiV3/ordersApiV3.js
class OrdersApiV3 {
  constructor(token, username) {
    this.token = token;
    this.username = username;
    this.baseUrl = '/api/v3/orders';
  }
  
  async list(params = {}) {
    // GET /api/v3/orders?year=2026&status=SCHVALENA
  }
  
  async getById(id) {
    // GET /api/v3/orders/:id
  }
  
  async updateStatus(id, status, comment) {
    // PATCH /api/v3/orders/:id/status
  }
  
  async approve(id, comment) {
    // POST /api/v3/orders/:id/approve
  }
  
  async reject(id, reason) {
    // POST /api/v3/orders/:id/reject
  }
  
  async addComment(id, comment) {
    // POST /api/v3/orders/:id/comment
  }
}
```

### API Response format (standardizovaný)
```javascript
// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z",
    "version": "3.0",
    "permissions": ["ORDER_VIEW", "ORDER_APPROVE"]
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Nemáte oprávnění k této akci",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-03-11T10:30:00Z"
  }
}
```

---

## 🔐 Permissions & Visibility System

### Permissions konfigurace

```javascript
// config/permissions.config.js

/**
 * Globální konfigurace oprávnění pro mobilní verzi
 */
export const MOBILE_PERMISSIONS = {
  // Modules
  MODULES: {
    ORDERS: 'MODULE_ORDERS',
    INVOICES: 'MODULE_INVOICES',
    CASHBOOK: 'MODULE_CASHBOOK',
    ANNUAL_FEES: 'MODULE_ANNUAL_FEES'
  },
  
  // Actions
  ACTIONS: {
    VIEW: 'VIEW',
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    COMMENT: 'COMMENT',
    CHANGE_STATUS: 'CHANGE_STATUS'
  },
  
  // Special roles
  ROLES: {
    ADMIN: 'SUPERADMIN',
    MANAGER: 'MANAGER',
    USER: 'USER'
  }
};

/**
 * Mapování oprávnění na viditelnost dlaždic
 */
export const TILE_PERMISSIONS = {
  'orders-to-approve': {
    requiredPermissions: ['ORDER_VIEW', 'ORDER_APPROVE'],
    requiredModule: 'MODULE_ORDERS'
  },
  
  'orders-schvalena': {
    requiredPermissions: ['ORDER_VIEW'],
    requiredModule: 'MODULE_ORDERS'
  },
  
  'invoices-unpaid': {
    requiredPermissions: ['INVOICE_VIEW'],
    requiredModule: 'MODULE_INVOICES'
  },
  
  'cashbook-balance': {
    requiredPermissions: ['CASHBOOK_VIEW'],
    requiredModule: 'MODULE_CASHBOOK'
  },
  
  'annual-fees-pending': {
    requiredPermissions: ['ANNUAL_FEE_VIEW'],
    requiredModule: 'MODULE_ANNUAL_FEES'
  }
};
```

### Permission checker služba

```javascript
// services/permissions/PermissionService.js

class PermissionService {
  constructor(userDetail) {
    this.userDetail = userDetail;
    this.permissions = this.extractPermissions(userDetail);
    this.modules = this.extractModules(userDetail);
  }
  
  /**
   * Kontrola zda má uživatel oprávnění
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }
  
  /**
   * Kontrola zda má přístup k modulu
   */
  hasModule(module) {
    return this.modules.includes(module);
  }
  
  /**
   * Kontrola viditelnosti dlaždice
   */
  canViewTile(tileId) {
    const config = TILE_PERMISSIONS[tileId];
    if (!config) return false;
    
    // Kontrola modulu
    if (config.requiredModule && !this.hasModule(config.requiredModule)) {
      return false;
    }
    
    // Kontrola oprávnění (všechna musí být splněna)
    if (config.requiredPermissions) {
      return config.requiredPermissions.every(p => this.hasPermission(p));
    }
    
    return true;
  }
  
  /**
   * Získá seznam viditelných dlaždic pro uživatele
   */
  getVisibleTiles(allTiles) {
    return allTiles.filter(tile => this.canViewTile(tile.id));
  }
  
  /**
   * Kontrola zda může provést akci
   */
  canPerformAction(module, action) {
    const permissionCode = `${module}_${action}`;
    return this.hasPermission(permissionCode);
  }
}
```

---

## 🎨 Konfigurovatelné dlaždice

### Tile Configuration System

```javascript
// config/tiles.config.js

/**
 * Definice všech možných dlaždic
 */
export const AVAILABLE_TILES = [
  // OBJEDNÁVKY
  {
    id: 'orders-to-approve',
    category: 'orders',
    title: 'Ke schválení',
    icon: 'faClipboardCheck',
    color: 'orange',
    type: 'counter',
    apiEndpoint: '/api/v3/orders/to-approve',
    requiredPermissions: ['ORDER_VIEW', 'ORDER_APPROVE'],
    requiredModule: 'MODULE_ORDERS',
    clickAction: 'navigate',
    clickTarget: '/mobile/orders/approvals',
    enabled: true,
    order: 1
  },
  
  {
    id: 'orders-schvalena',
    category: 'orders',
    title: 'Schválené',
    icon: 'faCheckCircle',
    color: 'green',
    type: 'counter-amount',
    apiEndpoint: '/api/v3/orders?status=SCHVALENA',
    requiredPermissions: ['ORDER_VIEW'],
    requiredModule: 'MODULE_ORDERS',
    clickAction: 'navigate',
    clickTarget: '/mobile/orders?filter=schvalena',
    enabled: true,
    order: 2
  },
  
  {
    id: 'orders-zamitnuta',
    category: 'orders',
    title: 'Zamítnuté',
    icon: 'faTimesCircle',
    color: 'red',
    type: 'counter',
    apiEndpoint: '/api/v3/orders?status=ZAMITNUTA',
    requiredPermissions: ['ORDER_VIEW'],
    requiredModule: 'MODULE_ORDERS',
    enabled: true,
    order: 3
  },
  
  // FAKTURY
  {
    id: 'invoices-unpaid',
    category: 'invoices',
    title: 'Nezaplacené',
    icon: 'faFileInvoiceDollar',
    color: 'orange',
    type: 'counter-amount',
    apiEndpoint: '/api/v3/invoices?paid=false',
    requiredPermissions: ['INVOICE_VIEW'],
    requiredModule: 'MODULE_INVOICES',
    enabled: true,
    order: 11
  },
  
  {
    id: 'invoices-paid',
    category: 'invoices',
    title: 'Zaplacené',
    icon: 'faCheckCircle',
    color: 'green',
    type: 'counter-amount',
    apiEndpoint: '/api/v3/invoices?paid=true',
    requiredPermissions: ['INVOICE_VIEW'],
    requiredModule: 'MODULE_INVOICES',
    enabled: true,
    order: 12
  },
  
  // POKLADNA
  {
    id: 'cashbook-balance',
    category: 'cashbook',
    title: 'Zůstatek',
    icon: 'faWallet',
    color: 'blue',
    type: 'amount',
    apiEndpoint: '/api/v3/cashbook/balance',
    requiredPermissions: ['CASHBOOK_VIEW'],
    requiredModule: 'MODULE_CASHBOOK',
    enabled: true,
    order: 21
  },
  
  // ROČNÍ POPLATKY
  {
    id: 'annual-fees-pending',
    category: 'annual-fees',
    title: 'Čekající platby',
    icon: 'faCalendarAlt',
    color: 'purple',
    type: 'counter-amount',
    apiEndpoint: '/api/v3/annual-fees?status=pending',
    requiredPermissions: ['ANNUAL_FEE_VIEW'],
    requiredModule: 'MODULE_ANNUAL_FEES',
    enabled: true,
    order: 31
  }
];

/**
 * Výchozí layout dlaždic (admin může změnit)
 */
export const DEFAULT_LAYOUT = {
  mobile: {
    columns: 2, // 2 sloupce na mobilu
    gap: 12,
    sections: [
      {
        id: 'section-orders',
        title: 'Objednávky',
        tiles: ['orders-to-approve', 'orders-schvalena', 'orders-zamitnuta'],
        collapsed: false
      },
      {
        id: 'section-invoices',
        title: 'Faktury',
        tiles: ['invoices-unpaid', 'invoices-paid'],
        collapsed: false
      },
      {
        id: 'section-cashbook',
        title: 'Pokladna',
        tiles: ['cashbook-balance'],
        collapsed: false
      },
      {
        id: 'section-annual-fees',
        title: 'Roční poplatky',
        tiles: ['annual-fees-pending'],
        collapsed: true // Defaultně sbaleno
      }
    ]
  },
  
  tablet: {
    columns: 3, // 3 sloupce na tabletu
    gap: 16,
    sections: [
      // Stejná struktura jako mobile
    ]
  }
};

/**
 * Admin konfigurace (uložená v DB)
 */
export const ADMIN_TILE_SETTINGS = {
  // Globální nastavení viditelnosti dlaždic
  globalVisibility: {
    'orders-to-approve': true,
    'orders-schvalena': true,
    'orders-zamitnuta': false, // Skrytá všem
    'invoices-unpaid': true,
    'annual-fees-pending': true
  },
  
  // Per-user overrides (optional)
  userOverrides: {
    'user123': {
      'orders-zamitnuta': true // Tento user vidí zamítnuté
    }
  },
  
  // Layout overrides
  layoutOverrides: {
    mobile: {
      sections: [
        {
          id: 'section-orders',
          title: 'Moje objednávky', // Custom název
          tiles: ['orders-to-approve', 'orders-schvalena'],
          collapsed: false
        }
      ]
    }
  }
};
```

### Tile Component

```javascript
// components/dashboard/Tile.jsx

/**
 * Univerzální komponenta dlaždice
 * 
 * Podporované typy:
 * - counter: Jen počet (např. 5)
 * - amount: Jen částka (např. 125 000 Kč)
 * - counter-amount: Počet + částka (např. 5 ks / 125 000 Kč)
 */
const Tile = ({ config, data, onClick }) => {
  const { icon, color, title, type } = config;
  
  const renderContent = () => {
    switch (type) {
      case 'counter':
        return <TileCounter count={data.count} />;
      
      case 'amount':
        return <TileAmount amount={data.amount} />;
      
      case 'counter-amount':
        return (
          <>
            <TileCounter count={data.count} />
            <TileAmount amount={data.amount} />
          </>
        );
      
      default:
        return <div>N/A</div>;
    }
  };
  
  return (
    <div 
      className={`tile tile-${color}`}
      onClick={onClick}
    >
      <div className="tile-header">
        <TileIcon icon={icon} />
        <TileTitle text={title} />
      </div>
      <div className="tile-content">
        {renderContent()}
      </div>
    </div>
  );
};
```

---

## ✏️ Mini-edit funkcionality

### Podporované akce

```javascript
// config/actions.config.js

export const MOBILE_ACTIONS = {
  // OBJEDNÁVKY
  orders: {
    approve: {
      endpoint: '/api/v3/orders/:id/approve',
      method: 'POST',
      requiredPermission: 'ORDER_APPROVE',
      confirmDialog: true,
      successMessage: 'Objednávka schválena'
    },
    
    reject: {
      endpoint: '/api/v3/orders/:id/reject',
      method: 'POST',
      requiredPermission: 'ORDER_APPROVE',
      requireReason: true,
      confirmDialog: true,
      successMessage: 'Objednávka zamítnuta'
    },
    
    changeStatus: {
      endpoint: '/api/v3/orders/:id/status',
      method: 'PATCH',
      requiredPermission: 'ORDER_CHANGE_STATUS',
      allowedStatuses: ['CEKA_SE', 'DOKONCENA'],
      requireComment: true
    },
    
    addComment: {
      endpoint: '/api/v3/orders/:id/comment',
      method: 'POST',
      requiredPermission: 'ORDER_VIEW',
      maxLength: 500
    }
  },
  
  // FAKTURY
  invoices: {
    changeStatus: {
      endpoint: '/api/v3/invoices/:id/status',
      method: 'PATCH',
      requiredPermission: 'INVOICE_CHANGE_STATUS',
      allowedStatuses: ['ZAPLACENA', 'STORNOVANA']
    },
    
    addNote: {
      endpoint: '/api/v3/invoices/:id/note',
      method: 'POST',
      requiredPermission: 'INVOICE_VIEW',
      maxLength: 200
    }
  },
  
  // ROČNÍ POPLATKY
  annualFees: {
    markPaid: {
      endpoint: '/api/v3/annual-fees/:id/paid',
      method: 'POST',
      requiredPermission: 'ANNUAL_FEE_APPROVE',
      confirmDialog: true
    }
  }
};
```

### Mini-edit komponenty

```javascript
// components/shared/MiniEditPanel.jsx

/**
 * Univerzální panel pro mini-editace
 * Zobrazuje se jako slide-in panel zdola
 */
const MiniEditPanel = ({ 
  entityType, // 'order' | 'invoice' | 'annual-fee'
  entityId, 
  availableActions,
  onClose 
}) => {
  return (
    <div className="mini-edit-panel">
      <div className="panel-header">
        <h3>Akce</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="panel-actions">
        {availableActions.map(action => (
          <ActionButton 
            key={action.id}
            action={action}
            entityId={entityId}
            entityType={entityType}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Tlačítko akce s handlerem
 */
const ActionButton = ({ action, entityId, entityType }) => {
  const handleClick = async () => {
    // Pokud vyžaduje dialog, zobraz ho
    if (action.confirmDialog) {
      const confirmed = await showConfirmDialog(action);
      if (!confirmed) return;
    }
    
    // Pokud vyžaduje reason/comment, zobraz input
    let additionalData = {};
    if (action.requireReason || action.requireComment) {
      const text = await showTextInputDialog(action);
      if (!text) return;
      additionalData = { [action.requireReason ? 'reason' : 'comment']: text };
    }
    
    // Proveď akci
    await performAction(entityType, entityId, action.id, additionalData);
  };
  
  return (
    <button 
      className={`action-btn action-${action.variant}`}
      onClick={handleClick}
    >
      <Icon icon={action.icon} />
      <span>{action.label}</span>
    </button>
  );
};
```

---

## 📊 Dashboard konfigurace

### Admin UI pro konfiguraci (desktop verze)

```
Desktop Admin Panel > Nastavení > Mobilní dashboard
│
├── Globální viditelnost dlaždic
│   ├── [✓] Objednávky ke schválení
│   ├── [✓] Schválené objednávky
│   ├── [ ] Zamítnuté objednávky
│   └── ...
│
├── Layout konfigurace
│   ├── Počet sloupců (mobile): 2
│   ├── Počet sloupců (tablet): 3
│   └── Mezery mezi dlaždicemi: 12px
│
├── Sekce
│   ├── [↑↓] Objednávky
│   │    ├── [✓] Ke schválení
│   │    ├── [✓] Schválené
│   │    └── [ ] Zamítnuté
│   │
│   ├── [↑↓] Faktury
│   │    ├── [✓] Nezaplacené
│   │    └── [✓] Zaplacené
│   │
│   └── [+ Přidat sekci]
│
└── Per-user overrides
    └── [Vyhledat uživatele a nastavit custom layout]
```

### API pro konfiguraci

```javascript
// GET /api/v3/dashboard/config
{
  "success": true,
  "data": {
    "layout": {
      "mobile": { ... },
      "tablet": { ... }
    },
    "globalVisibility": { ... },
    "userOverrides": { ... }
  }
}

// POST /api/v3/dashboard/config (admin only)
{
  "layout": { ... },
  "globalVisibility": { ... }
}

// GET /api/v3/dashboard/config/user/:userId (per-user)
{
  "success": true,
  "data": {
    "visibleTiles": [...],
    "layout": { ... }
  }
}
```

---

## 🚀 Deployment strategie

### Fázovaný rollout

#### Fáze 1: Příprava (Týden 1-2)
- [ ] Vytvoření nové složky `apps/eeo-v2-mobile`
- [ ] Setup build systému (Vite config)
- [ ] Konfigurace routingu (Apache/Nginx)
- [ ] Vytvoření základní struktury
- [ ] Migrace existujících mobile komponent

#### Fáze 2: V3 API (Týden 3-4)
- [ ] Vytvoření V3 endpointů (backend)
- [ ] API client services (frontend)
- [ ] Testování API volání
- [ ] Error handling

#### Fáze 3: Permissions systém (Týden 5)
- [ ] Permission service
- [ ] Tile visibility logic
- [ ] Admin UI pro konfiguraci (desktop)
- [ ] DB migrace pro ukládání konfigurace

#### Fáze 4: Konfigurovatelné dlaždice (Týden 6-7)
- [ ] Tile configuration system
- [ ] Dynamic tile rendering
- [ ] Admin UI pro customizaci layoutu
- [ ] Per-user overrides

#### Fáze 5: Mini-edit funkce (Týden 8)
- [ ] Action config system
- [ ] Mini-edit panel komponenta
- [ ] Dialogy pro confirm/input
- [ ] Success/error handling

#### Fáze 6: Testování (Týden 9)
- [ ] Unit testy
- [ ] Integration testy
- [ ] E2E testy
- [ ] Performance testing

#### Fáze 7: Production deploy (Týden 10)
- [ ] Staging deployment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitoring

---

## 📁 File structure - Finální

```
apps/eeo-v2-mobile/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Tile.jsx
│   │   │   ├── TileGrid.jsx
│   │   │   └── Section.jsx
│   │   ├── orders/
│   │   │   ├── OrderApprovalCard.jsx
│   │   │   ├── OrdersList.jsx
│   │   │   └── OrderMiniEdit.jsx
│   │   ├── invoices/
│   │   │   ├── InvoiceCard.jsx
│   │   │   └── InvoiceMiniEdit.jsx
│   │   ├── cashbook/
│   │   │   └── CashbookSummary.jsx
│   │   ├── annual-fees/
│   │   │   ├── AnnualFeeCard.jsx
│   │   │   └── AnnualFeeMiniEdit.jsx
│   │   └── shared/
│   │       ├── Header.jsx
│   │       ├── Menu.jsx
│   │       ├── MiniEditPanel.jsx
│   │       ├── ConfirmDialog.jsx
│   │       └── SuccessAnimation.jsx
│   │
│   ├── services/
│   │   ├── apiV3/
│   │   │   ├── ordersApiV3.js
│   │   │   ├── invoicesApiV3.js
│   │   │   ├── cashbookApiV3.js
│   │   │   ├── annualFeesApiV3.js
│   │   │   └── dashboardApiV3.js
│   │   ├── permissions/
│   │   │   └── PermissionService.js
│   │   └── config/
│   │       └── ConfigService.js
│   │
│   ├── hooks/
│   │   ├── useDashboard.js
│   │   ├── usePermissions.js
│   │   ├── useTileConfig.js
│   │   └── useMiniEdit.js
│   │
│   ├── config/
│   │   ├── tiles.config.js
│   │   ├── permissions.config.js
│   │   ├── actions.config.js
│   │   └── routes.config.js
│   │
│   ├── utils/                    # Sdílené s desktop (symlink nebo npm package)
│   │   ├── orderWorkflowUtils.js
│   │   ├── dateTimeUtils.js
│   │   ├── currencyUtils.js
│   │   └── permissionUtils.js
│   │
│   ├── styles/
│   │   ├── variables.css
│   │   ├── dashboard.css
│   │   ├── tiles.css
│   │   └── mini-edit.css
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── router.jsx
│
├── public/
│   └── mobile-logo.png
│
├── package.json
├── vite.config.js
├── .env
├── .env.production
└── README.md
```

---

## 🎯 Prioritizace features

### Must Have (Launch MVP)
- ✅ Oddělený build systém
- ✅ Path-based routing (/mobile)
- ✅ V3 API pro objednávky
- ✅ Basic permissions (module level)
- ✅ Static tile configuration
- ✅ Schvalování/zamítání objednávek
- ✅ Přidání komentářů

### Should Have (v1.1)
- ✅ Admin UI pro konfiguraci dlaždic
- ✅ V3 API pro faktury a pokladny
- ✅ Dynamická viditelnost dlaždic
- ✅ Per-user layout overrides
- ✅ Změna stavů

### Nice to Have (v1.2+)
- ✅ Tablet varianta (/tablet URL)
- ✅ PWA features (offline mode)
- ✅ Push notifications
- ✅ Dark mode per-device
- ✅ Roční poplatky modul

---

## 📝 Next Steps - Action Items

### Pro implementaci:
1. **Review tento plán** s týmem
2. **Schválení architektury** (monorepo vs separate apps)
3. **Definice V3 API kontraktu** (backend tým)
4. **Setup nového projektu** (eeo-v2-mobile folder)
5. **Konfigurace build systému** (Vite + routing)
6. **Začít s Fází 1** podle timeline

### Otázky k zodpovězení:
- [ ] **Monorepo** (Nx/Turborepo) nebo **separate apps**?
- [ ] **Path-based** (/mobile) nebo **subdomain** (mobile.eeo.zzssk.cz)?
- [ ] Kdy je deadline pro MVP?
- [ ] Kdo bude dělat V3 API backend?
- [ ] Jaká je priorita tablet verze?

---

**Status:** 📋 PLÁN PŘIPRAVEN - ČEKÁ NA SCHVÁLENÍ  
**Datum:** 11. března 2026  
**Next:** Team review meeting
