# 📐 Mobilní V3 - Architektonický diagram

**Datum:** 11. března 2026  
**Status:** 🎯 Plánování

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER DEVICES                                  │
│  📱 Mobile (iOS/Android)  |  📱 Tablet  |  💻 Desktop                   │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ HTTPS (SSL)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APACHE WEB SERVER                                │
│                  (akd-dev-web01.aktiv-develab.cz)                       │
│                                                                           │
│  ┌─────────────────────┐          ┌─────────────────────┐              │
│  │  VirtualHost :443   │          │  VirtualHost :443   │              │
│  │  ServerName: main   │          │  Location: /mobile  │              │
│  │                     │          │                     │              │
│  │  ProxyPass /api     │          │  ProxyPass /mobile  │              │
│  │  → :3001            │          │  → :5174            │              │
│  └─────────────────────┘          └─────────────────────┘              │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               │                            │
┌──────────────▼─────────────────┐ ┌───────▼────────────────────────────┐
│   BACKEND (Node.js + Express)  │ │  MOBILE FRONTEND (Vite + React)    │
│   Port: 3001 (PM2: backend)    │ │  Port: 5174 (PM2: mobile-dev)      │
│                                 │ │                                    │
│  /api/v3/dashboard/stats       │ │  apps/eeo-v2-mobile/               │
│  /api/v3/dashboard/tiles       │ │  ├── src/                          │
│  /api/v3/orders/list           │ │  │   ├── components/               │
│  /api/v3/orders/:id            │ │  │   │   ├── dashboard/           │
│  /api/v3/orders/:id/approve    │ │  │   │   ├── orders/              │
│  /api/v3/orders/:id/reject     │ │  │   │   └── shared/              │
│  /api/v3/invoices/list         │ │  │   ├── services/apiV3/          │
│  /api/v3/cashbook/summary      │ │  │   ├── hooks/mobile/            │
│  /api/v3/annual-fees/list      │ │  │   ├── config/                  │
│  /api/v3/permissions           │ │  │   │   ├── tiles.config.js      │
│                                 │ │  │   │   └── permissions.config.js│
│  Auth: JWT validation          │ │  │   └── utils/                   │
│  Cache: Redis (10-60s TTL)     │ │  ├── vite.config.js               │
│                                 │ │  └── package.json                 │
└──────────────┬──────────────────┘ └────────────────────────────────────┘
               │
               │ SQL Queries
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MySQL DATABASE                                 │
│                                                                           │
│  Tables:                                                                  │
│  ├── objednavky (orders)                                                │
│  ├── faktury (invoices)                                                 │
│  ├── pokladny (cashbook)                                                │
│  ├── rocni_poplatky (annual fees)                                       │
│  ├── ciselniky_stavu (workflow states)                                  │
│  ├── uzivatel (users)                                                   │
│  ├── role_pravo (permissions)                                           │
│  └── mobile_tiles_config (🆕 nová tabulka)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow - Příklad: Dashboard Load

```
┌──────────┐
│  USER    │
│  📱     │
└────┬─────┘
     │
     │ 1. GET https://akd-dev-web01.../mobile/dashboard
     ▼
┌────────────────┐
│  Apache :443   │
│  SSL Terminate │
└────┬───────────┘
     │
     │ 2. ProxyPass → :5174/mobile/dashboard
     ▼
┌──────────────────┐
│  Vite Dev Server │
│  Port: 5174      │  ← Serving React app
└────┬─────────────┘
     │
     │ 3. React Router: /mobile/dashboard → <MobileDashboard />
     │ 4. Component mount → useEffect()
     ▼
┌──────────────────────┐
│  React Component     │
│  MobileDashboard.jsx │
└────┬─────────────────┘
     │
     │ 5. Call: dashboardAPI.getStats()
     │    → axios.get('/api/v3/dashboard/stats')
     ▼
┌────────────────┐
│  Apache :443   │  ← Request goes back through apache
└────┬───────────┘
     │
     │ 6. ProxyPass → :3001/api/v3/dashboard/stats
     ▼
┌──────────────────┐
│  Express Backend │
│  Port: 3001      │
└────┬─────────────┘
     │
     │ 7. Auth Middleware (JWT validation)
     ▼
┌──────────────────┐
│  Permission      │
│  Check           │  ← Verify user has 'mobile.dashboard.view'
└────┬─────────────┘
     │
     │ 8. Redis Cache check
     ▼
┌──────────────────┐
│  Redis           │
│  Cache           │  ← Cache key: 'dashboard:stats:user:123'
└────┬─────────────┘
     │
     │ 9. Cache MISS → query database
     ▼
┌──────────────────┐
│  MySQL           │
│  Database        │  ← SELECT ... FROM objednavky, faktury, ...
└────┬─────────────┘
     │
     │ 10. Return data
     ▼
┌──────────────────┐
│  Express Backend │  ← Format response, set cache
└────┬─────────────┘
     │
     │ 11. JSON Response
     │     { "success": true, "data": {...} }
     ▼
┌──────────────────────┐
│  React Component     │  ← setState(data)
│  MobileDashboard.jsx │  ← Render tiles
└──────────────────────┘
```

---

## 🎨 Tile Configuration Flow

```
┌──────────────────┐
│  ADMIN USER      │  (Desktop application)
│  🧑‍💼           │
└────┬─────────────┘
     │
     │ 1. Open Admin Panel → Tile Configuration UI
     ▼
┌──────────────────────────────────────┐
│  Desktop App: Tile Config UI         │
│  /admin/mobile-tiles                 │
│                                       │
│  ┌────────────────────────────────┐  │
│  │ Available Tiles:               │  │
│  │  [ ] Dashboard Overview        │  │
│  │  [✓] Pending Orders            │  │
│  │  [✓] My Orders                 │  │
│  │  [ ] Active Invoices           │  │
│  │  ...                           │  │
│  └────────────────────────────────┘  │
│                                       │
│  User: [John Doe ▼]                  │
│  Device: [ Mobile ▼]                 │
│                                       │
│  [Save Configuration]                │
└────┬──────────────────────────────────┘
     │
     │ 2. POST /api/v3/dashboard/tiles/config
     │    { userId: 123, device: 'mobile', tiles: [...] }
     ▼
┌──────────────────┐
│  Express Backend │
└────┬─────────────┘
     │
     │ 3. Validate permissions
     │ 4. INSERT INTO mobile_tiles_config
     ▼
┌──────────────────┐
│  MySQL Database  │
│                  │
│  mobile_tiles_config:
│  ┌─────┬────────┬──────────┬─────────────────────┐
│  │ id  │ userId │ device   │ tiles               │
│  ├─────┼────────┼──────────┼─────────────────────┤
│  │ 1   │ 123    │ mobile   │ ["pending", "my"]   │
│  │ 2   │ 123    │ tablet   │ ["pending","my"]    │
│  └─────┴────────┴──────────┴─────────────────────┘
└──────────────────┘

┌──────────────────┐
│  MOBILE USER     │  (Later, on mobile device)
│  📱 John Doe    │
└────┬─────────────┘
     │
     │ 5. Load dashboard
     ▼
┌──────────────────────┐
│  MobileDashboard.jsx │
└────┬─────────────────┘
     │
     │ 6. GET /api/v3/dashboard/tiles?userId=123&device=mobile
     ▼
┌──────────────────┐
│  Express Backend │  ← Query mobile_tiles_config
└────┬─────────────┘
     │
     │ 7. Return configured tiles
     │    { "tiles": ["pending_orders", "my_orders"] }
     ▼
┌──────────────────────┐
│  MobileDashboard.jsx │  ← Filter AVAILABLE_TILES by config
│                      │  ← Render only configured tiles
│  ┌────────────────┐  │
│  │ Pending Orders │  │
│  │   (5 items)    │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ My Orders      │  │
│  │   (12 items)   │  │
│  └────────────────┘  │
└──────────────────────┘
```

---

## 🔐 Permissions Flow

```
┌──────────────────┐
│  USER LOGIN      │
│  📱             │
└────┬─────────────┘
     │
     │ 1. POST /api/auth/login
     ▼
┌──────────────────┐
│  Auth Service    │
└────┬─────────────┘
     │
     │ 2. Validate credentials
     │ 3. Query user permissions
     ▼
┌──────────────────┐
│  MySQL           │
│                  │
│  SELECT r.nazev, p.kod
│  FROM uzivatel u
│  JOIN uzivatel_role ur ON u.id = ur.uzivatel_id
│  JOIN role r ON ur.role_id = r.id
│  JOIN role_pravo rp ON r.id = rp.role_id
│  JOIN pravo p ON rp.pravo_id = p.id
│  WHERE u.id = ?
└────┬─────────────┘
     │
     │ 4. Return JWT with permissions
     │    eyJhbGci... {
     │      userId: 123,
     │      roles: ['editor'],
     │      permissions: [
     │        'mobile.orders.view',
     │        'mobile.orders.approve',
     │        'mobile.invoices.view',
     │        ...
     │      ]
     │    }
     ▼
┌──────────────────────┐
│  Mobile App          │
│  Store JWT in:       │
│  - localStorage      │
│  - AuthContext       │
└────┬─────────────────┘
     │
     │ 5. Every API request includes JWT
     ▼
┌──────────────────────────────────────┐
│  Any Protected Endpoint              │
│  (e.g., /api/v3/orders/123/approve)  │
└────┬─────────────────────────────────┘
     │
     │ 6. Auth Middleware
     ▼
┌──────────────────────────────────────┐
│  JWT Validation                      │
│  - Verify signature                  │
│  - Check expiration                  │
│  - Extract permissions               │
└────┬─────────────────────────────────┘
     │
     │ 7. Permission Check
     ▼
┌──────────────────────────────────────┐
│  if (!hasPermission(                 │
│      user,                           │
│      'mobile.orders.approve'         │
│  )) {                                │
│    return 403 Forbidden              │
│  }                                   │
└────┬─────────────────────────────────┘
     │
     │ 8. Execute business logic
     ▼
┌──────────────────┐
│  Update Order    │
│  Return Success  │
└──────────────────┘

Frontend Permission Check (UX only):
┌──────────────────────────────────────┐
│  MobileDashboard.jsx                 │
│                                       │
│  const canApprove = hasPermission(   │
│    user,                             │
│    'mobile.orders.approve'           │
│  );                                  │
│                                       │
│  {canApprove && (                    │
│    <button onClick={handleApprove}>  │
│      Schválit                        │
│    </button>                         │
│  )}                                  │
└──────────────────────────────────────┘
```

---

## 🔄 Mini-Edit Action Flow

```
┌──────────────────┐
│  USER            │
│  📱             │
└────┬─────────────┘
     │
     │ 1. View order detail
     ▼
┌──────────────────────────────────────┐
│  OrderDetailPage.jsx                 │
│                                       │
│  Order #ORD-2026-123                 │
│  Status: Čeká na schválení           │
│                                       │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  Schválit   │  │  Zamítnout  │   │  ← Mini-edit actions
│  └─────────────┘  └─────────────┘   │
└────┬─────────────────────────────────┘
     │
     │ 2. Click "Schválit"
     ▼
┌──────────────────────────────────────┐
│  Confirm Dialog                      │
│                                       │
│  Opravdu chcete schválit tuto        │
│  objednávku?                         │
│                                       │
│  [Zrušit]  [Potvrdit]                │
└────┬─────────────────────────────────┘
     │
     │ 3. Click "Potvrdit"
     ▼
┌──────────────────────────────────────┐
│  orderAPI.approve(orderId, comment)  │
│                                       │
│  POST /api/v3/orders/123/approve     │
│  {                                   │
│    "comment": "Schváleno"            │
│  }                                   │
└────┬─────────────────────────────────┘
     │
     │ 4. Send request with JWT
     ▼
┌──────────────────┐
│  Express Backend │
└────┬─────────────┘
     │
     │ 5. Validate: user has 'mobile.orders.approve'
     ▼
┌──────────────────┐
│  MySQL           │
│                  │
│  START TRANSACTION
│  UPDATE objednavky
│  SET stav_id = 4,  -- Schváleno
│      schvalil_id = 123,
│      schvaleno_at = NOW()
│  WHERE id = 123
│  
│  INSERT INTO objednavky_log
│  (objednavka_id, akce, uzivatel_id, komentar)
│  VALUES (123, 'approved', 123, 'Schváleno')
│  COMMIT
└────┬─────────────┘
     │
     │ 6. Return success
     │    { "success": true, "data": {...} }
     ▼
┌──────────────────────────────────────┐
│  OrderDetailPage.jsx                 │
│                                       │
│  ✅ Objednávka úspěšně schválena     │
│                                       │
│  Order #ORD-2026-123                 │
│  Status: Schváleno                   │  ← Updated
│                                       │
│  [OK]                                │
└──────────────────────────────────────┘
```

---

## 📦 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION SERVER                         │
│              (akd-dev-web01.aktiv-develab.cz)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  /var/www/erdms-dev/                                        │
│                                                              │
│  ├── apps/eeo-v2/                     ← Desktop app         │
│  │   └── client/                                            │
│  │       └── dist/                    ← Built static files │
│  │                                                           │
│  ├── apps/eeo-v2-mobile/              ← 🆕 Mobile app       │
│  │   ├── dist/                        ← Built static files │
│  │   ├── node_modules/                                      │
│  │   ├── package.json                                       │
│  │   └── vite.config.js                                     │
│  │                                                           │
│  └── scripts/                                               │
│      ├── build-mobile.sh              ← Build script        │
│      ├── deploy-mobile.sh             ← Deploy script       │
│      └── rollback-mobile.sh           ← Rollback script     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PM2 Process Manager                                         │
│                                                              │
│  ┌────────────────┬──────┬────────┬───────────────────┐    │
│  │ Name           │ Mode │ Port   │ Status            │    │
│  ├────────────────┼──────┼────────┼───────────────────┤    │
│  │ backend        │ fork │ 3001   │ ● online (stable) │    │
│  │ desktop-dev    │ fork │ 5173   │ ● online (dev)    │    │
│  │ mobile-dev     │ fork │ 5174   │ ● online (dev)    │    │  🆕
│  └────────────────┴──────┴────────┴───────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Apache Configuration                                        │
│  /etc/apache2/sites-available/erdms-dev.conf               │
│                                                              │
│  <VirtualHost *:443>                                        │
│    ServerName akd-dev-web01.aktiv-develab.cz               │
│                                                              │
│    # Desktop app (static files)                            │
│    DocumentRoot /var/www/erdms-dev/apps/eeo-v2/client/dist │
│                                                              │
│    # Mobile app (proxy to Vite dev)                        │
│    ProxyPass /mobile http://localhost:5174/mobile          │  🆕
│    ProxyPassReverse /mobile http://localhost:5174/mobile   │
│                                                              │
│    # Backend API                                            │
│    ProxyPass /api http://localhost:3001/api                │
│    ProxyPassReverse /api http://localhost:3001/api         │
│                                                              │
│    # SSL Configuration                                      │
│    SSLEngine on                                             │
│    SSLCertificateFile /etc/letsencrypt/.../fullchain.pem   │
│    SSLCertificateKeyFile /etc/letsencrypt/.../privkey.pem  │
│  </VirtualHost>                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Build & Deploy Flow

```
┌─────────────────┐
│  DEVELOPER      │
│  💻            │
└────┬────────────┘
     │
     │ 1. git push origin main
     ▼
┌─────────────────┐
│  GitLab/GitHub  │
│  Repository     │
└────┬────────────┘
     │
     │ 2. Webhook trigger (optional)
     ▼
┌─────────────────┐
│  CI/CD Pipeline │
│  (optional)     │
└────┬────────────┘
     │
     │ 3. SSH to server + git pull
     ▼
┌──────────────────────────────────────────┐
│  Production Server                        │
│  /var/www/erdms-dev/                     │
└────┬─────────────────────────────────────┘
     │
     │ 4. Run build script
     │    ./scripts/build-mobile.sh
     ▼
┌──────────────────────────────────────────┐
│  Build Process                           │
│                                           │
│  #!/bin/bash                             │
│  cd apps/eeo-v2-mobile                   │
│  npm install                             │
│  npm run build                           │  ← Vite build
│  # Output: dist/ folder                 │
│  # Size check: < 500KB gzipped          │
└────┬─────────────────────────────────────┘
     │
     │ 5. Backup current version
     │    mv dist/ dist.backup-$(date)
     ▼
┌──────────────────────────────────────────┐
│  Backup Created                          │
│  dist.backup-2026-03-11-14-30-00/        │
└────┬─────────────────────────────────────┘
     │
     │ 6. Run deploy script
     │    ./scripts/deploy-mobile.sh
     ▼
┌──────────────────────────────────────────┐
│  Deploy Process                          │
│                                           │
│  - Copy dist/ to production              │
│  - Update Apache config (if needed)      │
│  - Restart PM2 mobile-dev process        │
│  - Run smoke tests                       │
└────┬─────────────────────────────────────┘
     │
     │ 7. Smoke tests
     │    ./scripts/smoke-test-mobile.sh
     ▼
┌──────────────────────────────────────────┐
│  Smoke Tests                             │
│                                           │
│  ✅ Test 1: Mobile app loads             │
│  ✅ Test 2: API /v3/dashboard responds   │
│  ✅ Test 3: Auth flow works              │
│  ✅ Test 4: Tiles render                 │
└────┬─────────────────────────────────────┘
     │
     │ 8. All tests passed ✅
     ▼
┌──────────────────────────────────────────┐
│  ✅ DEPLOYMENT SUCCESSFUL                │
│                                           │
│  Mobile app is now live at:              │
│  https://akd-dev-web01.../mobile         │
└──────────────────────────────────────────┘

IF TESTS FAIL ❌:
     │
     │ 9. Auto-rollback
     │    ./scripts/rollback-mobile.sh
     ▼
┌──────────────────────────────────────────┐
│  Rollback Process                        │
│                                           │
│  - Stop PM2 mobile-dev                   │
│  - Restore dist.backup-*                 │
│  - Restart PM2 mobile-dev                │
│  - Notify team                           │
└──────────────────────────────────────────┘
```

---

## 📊 Monitoring Architecture

```
┌──────────────────────────────────────────────────────┐
│  Mobile App (Frontend)                               │
│                                                       │
│  Custom Metrics Collection:                          │
│  - Page load time                                    │
│  - API response time                                 │
│  - Error rate                                        │
│  - User actions (approvals, rejections, etc.)       │
│                                                       │
│  → Send to: /api/v3/metrics (POST)                  │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  Backend (Express)                                   │
│                                                       │
│  Metrics Endpoint: /api/v3/metrics                   │
│  - Store in database                                 │
│  - Aggregate metrics                                 │
│  - Alert on thresholds                               │
│                                                       │
│  Health Check: /api/v3/health                        │
│  - Database connectivity                             │
│  - Redis connectivity                                │
│  - API response time                                 │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  Monitoring Dashboard (Optional - Future)            │
│                                                       │
│  Grafana / Kibana / Custom Dashboard                 │
│  - Real-time metrics                                 │
│  - Error tracking                                    │
│  - Performance graphs                                │
│  - Alert configuration                               │
└──────────────────────────────────────────────────────┘

Alert Triggers:
┌──────────────────────────────────────────┐
│  ⚠️ ERROR RATE > 5%                      │
│  ⚠️ API RESPONSE TIME > 3s               │
│  ⚠️ DATABASE CONNECTION FAILED           │
│  ⚠️ PM2 PROCESS CRASHED                  │
│                                           │
│  → Send email / Slack notification       │
└──────────────────────────────────────────┘
```

---

## 🔄 Development Workflow

```
┌──────────────────┐
│  DEVELOPER       │
│  💻  Local PC   │
└────┬─────────────┘
     │
     │ 1. git clone
     │ 2. cd apps/eeo-v2-mobile
     │ 3. npm install
     │ 4. npm run dev
     ▼
┌──────────────────────────┐
│  Local Dev Server        │
│  http://localhost:5174   │  ← Vite HMR enabled
└────┬─────────────────────┘
     │
     │ 5. Code changes → Hot reload
     │ 6. Test in browser/device
     ▼
┌──────────────────────────┐
│  Local Testing           │
│  - Chrome DevTools       │
│  - React DevTools        │
│  - Network tab           │
│  - Mobile emulator       │
└────┬─────────────────────┘
     │
     │ 7. git commit -m "feat: ..."
     │ 8. git push origin feature/xxx
     ▼
┌──────────────────────────┐
│  Pull Request            │
│  - Code review           │
│  - CI tests (optional)   │
│  - Approval              │
└────┬─────────────────────┘
     │
     │ 9. Merge to main
     ▼
┌──────────────────────────┐
│  Staging Deployment      │
│  https://staging.../     │
│  - QA testing            │
│  - UAT                   │
└────┬─────────────────────┘
     │
     │ 10. Approve for production
     ▼
┌──────────────────────────┐
│  Production Deployment   │
│  https://akd-dev-web01..│
└──────────────────────────┘
```

---

## 📱 Device Detection & Responsive Design

```
┌──────────────────────────────────────────────────────┐
│  User visits: https://akd-dev-web01.../             │
└────┬─────────────────────────────────────────────────┘
     │
     │ 1. Apache serves index.html
     ▼
┌──────────────────────────────────────────────────────┐
│  React App Bootstrap                                 │
│  - Load AuthContext                                  │
│  - Check JWT token                                   │
│  - Initialize useDevice hook                         │
└────┬─────────────────────────────────────────────────┘
     │
     │ 2. useDevice() hook executes
     ▼
┌──────────────────────────────────────────────────────┐
│  Device Detection Logic                              │
│                                                       │
│  const width = window.innerWidth;                    │
│  const isTouchDevice = 'ontouchstart' in window;     │
│  const userAgent = navigator.userAgent;              │
│                                                       │
│  if (width < 768) → 'mobile'                         │
│  else if (width < 1024) → 'tablet'                   │
│  else → 'desktop'                                    │
└────┬─────────────────────────────────────────────────┘
     │
     │ 3. Routing decision
     ▼
┌──────────────────────────────────────────────────────┐
│  React Router                                        │
│                                                       │
│  if (device === 'mobile' || device === 'tablet') {   │
│    <Route path="/" element={<MobileDashboard />} />  │
│  } else {                                            │
│    <Route path="/" element={<DesktopDashboard />} /> │
│  }                                                   │
└────┬─────────────────────────────────────────────────┘
     │
     │ 4. Render appropriate UI
     ▼
┌──────────────────────────────────────────────────────┐
│  📱 MOBILE (<768px)         💻 DESKTOP (>1024px)    │
│  - Vertical layout          - Horizontal layout      │
│  - Single column            - Multi-column           │
│  - Touch-optimized          - Mouse-optimized        │
│  - Simplified navigation    - Full navigation        │
│  - Limited tiles            - All features           │
└──────────────────────────────────────────────────────┘
```

---

## 🔗 Related Documents

- [V3 Architecture Plan](./MOBILE-V3-ARCHITECTURE-PLAN.md) - Detailed planning
- [V3 API Specification](./MOBILE-V3-API-SPECIFICATION.md) - API contract
- [V3 Deployment Guide](./MOBILE-V3-DEPLOYMENT-GUIDE.md) - Deployment procedures
- [Mobile README](./MOBILE-README.md) - Main documentation hub

---

**Poslední update:** 11. března 2026  
**Created by:** GitHub Copilot (Claude Sonnet 4.5)
