# ✅ Mobilní V3 - Implementační Checklist

**Datum:** 11. března 2026  
**Status:** 🎯 Plánování - **NEIMPLEMENTOVAT BEZ SCHVÁLENÍ**

---

## ⚠️ PŘED ZAČÁTKEM

```
❌ ZATÍM NEIMPLEMENTOVAT!
✅ Dokumentace je kompletní
⏳ Čeká na team review a schválení
```

**Citace uživatele:**
> "zatim jen planovat prosim, zadna implementace !!!!"

### Před implementací je potřeba:
- [ ] **Team review** - Projít celou dokumentaci s týmem
- [ ] **Rozhodnutí:** Monorepo vs separate apps?
- [ ] **Rozhodnutí:** Path-based (`/mobile`) vs subdomain routing?
- [ ] **Prioritizace:** Které dlaždice implementovat první?
- [ ] **Backend assignment:** Kdo implementuje V3 API?
- [ ] **Timeline approval:** Je 10 týdnů reálné?
- [ ] **Budget approval:** Jsou resources dostupné?
- [ ] **Architecture approval:** Schválení vedením

---

## 📋 FÁZE 1: Příprava (Týden 1-2)

### 1.1 Rozhodnutí o architektuře
- [ ] Rozhodnuto: **Monorepo** nebo **Separate apps**?
- [ ] Rozhodnuto: **Path-based** nebo **Subdomain** routing?
- [ ] Vytvořen project brief document
- [ ] Schválen budget a timeline

### 1.2 Vytvoření projektu

#### Varianta A: Monorepo (doporučeno)
```bash
- [ ] mkdir -p apps/eeo-v2-mobile
- [ ] cd apps/eeo-v2-mobile
- [ ] npm init -y
- [ ] npm install vite react react-dom react-router-dom axios
- [ ] Vytvořit vite.config.js (port 5174)
- [ ] Vytvořit src/ strukturu
```

#### Varianta B: Separate repo
```bash
- [ ] Vytvořit nový GitLab/GitHub repo: eeo-mobile-v3
- [ ] git clone
- [ ] npm init
- [ ] ... stejné jako výše
```

### 1.3 Základní struktura
```
apps/eeo-v2-mobile/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── shared/
│   │   └── layouts/
│   ├── services/
│   │   └── apiV3/
│   ├── hooks/
│   │   └── mobile/
│   ├── config/
│   │   ├── tiles.config.js
│   │   └── permissions.config.js
│   ├── utils/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── vite.config.js
├── package.json
└── README.md
```

- [ ] Vytvořena složková struktura
- [ ] Vytvořen vite.config.js
- [ ] Vytvořen package.json
- [ ] Git initialized (pokud separate repo)

### 1.4 Migrace existujících komponent
```bash
- [ ] Zkopírovat useDevice.js z eeo-v2
- [ ] Zkopírovat MobileHeader.jsx
- [ ] Zkopírovat MobileMenu.jsx
- [ ] Zkopírovat MobileLoginPage.jsx
- [ ] Adaptovat imports na novou strukturu
```

### 1.5 Build systém
- [ ] `npm run dev` funguje (port 5174)
- [ ] `npm run build` funguje
- [ ] Bundle size check < 500KB gzipped
- [ ] Source maps generovány

### 1.6 Apache/Nginx konfigurace
```apache
- [ ] Backup current config
- [ ] Přidat ProxyPass /mobile → :5174
- [ ] Přidat ProxyPassReverse /mobile → :5174
- [ ] Test configuration: apachectl configtest
- [ ] Reload: systemctl reload apache2
- [ ] Verify: curl https://akd-dev-web01.../mobile
```

### 1.7 PM2 setup
```bash
- [ ] Přidat mobile-dev do ecosystem.config.js
- [ ] pm2 start ecosystem.config.js --only mobile-dev
- [ ] pm2 save
- [ ] Verify: pm2 status
```

---

## 📋 FÁZE 2: V3 API Backend (Týden 3-4)

### 2.1 Database změny
```sql
- [ ] Vytvořit tabulku mobile_tiles_config
- [ ] Přidat mobile permissions do role_pravo
- [ ] Migration script napsán
- [ ] Migration testován na dev DB
- [ ] Migration aplicován na staging
```

### 2.2 Dashboard API

#### GET /api/v3/dashboard/stats
- [ ] Route vytvořen
- [ ] Auth middleware připojen
- [ ] Permission check: 'mobile.dashboard.view'
- [ ] Query data z DB (orders, invoices, cashbook, annual-fees)
- [ ] Calculate stats (pending, approved, rejected counts)
- [ ] Format response
- [ ] Error handling
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation (Swagger/OpenAPI)

#### GET /api/v3/dashboard/tiles
- [ ] Route vytvořen
- [ ] Query mobile_tiles_config
- [ ] Return user-specific layout
- [ ] Default fallback pokud není config
- [ ] Error handling
- [ ] Tests
- [ ] Documentation

### 2.3 Orders API

#### GET /api/v3/orders/list
- [ ] Route vytvořen
- [ ] Pagination support (limit, offset)
- [ ] Filtering (status, dateFrom, dateTo)
- [ ] Sorting (field, direction)
- [ ] Permission check
- [ ] Tests
- [ ] Documentation

#### GET /api/v3/orders/:id
- [ ] Route vytvořen
- [ ] Permission check
- [ ] Return full order detail
- [ ] Include related data (ciselniky, users)
- [ ] Tests
- [ ] Documentation

#### POST /api/v3/orders/:id/approve
- [ ] Route vytvořen
- [ ] Permission check: 'mobile.orders.approve'
- [ ] Validation (status must be pending)
- [ ] Update order status
- [ ] Log action to objednavky_log
- [ ] Return updated order
- [ ] Error handling (already approved, etc.)
- [ ] Tests
- [ ] Documentation

#### POST /api/v3/orders/:id/reject
- [ ] Route vytvořen
- [ ] Permission check: 'mobile.orders.reject'
- [ ] Validation
- [ ] Update order status
- [ ] Log action
- [ ] Return updated order
- [ ] Error handling
- [ ] Tests
- [ ] Documentation

#### POST /api/v3/orders/:id/comment
- [ ] Route vytvořen
- [ ] Permission check: 'mobile.orders.comment'
- [ ] Insert into objednavky_log
- [ ] Return success
- [ ] Tests
- [ ] Documentation

#### PATCH /api/v3/orders/:id/status
- [ ] Route vytvořen
- [ ] Permission check: 'mobile.orders.edit'
- [ ] Validation (allowed status transitions)
- [ ] Update order
- [ ] Log action
- [ ] Tests
- [ ] Documentation

### 2.4 Invoices API
- [ ] GET /api/v3/invoices/list
- [ ] GET /api/v3/invoices/:id
- [ ] Tests + Documentation

### 2.5 Cashbook API
- [ ] GET /api/v3/cashbook/summary
- [ ] GET /api/v3/cashbook/:bookId
- [ ] Tests + Documentation

### 2.6 Annual Fees API
- [ ] GET /api/v3/annual-fees/list
- [ ] GET /api/v3/annual-fees/:id
- [ ] Tests + Documentation

### 2.7 Permissions API
- [ ] GET /api/v3/permissions
- [ ] Return user's mobile permissions
- [ ] Cacheable response
- [ ] Tests + Documentation

### 2.8 Redis Caching
- [ ] Install Redis (if not already)
- [ ] Configure caching layer
- [ ] Cache dashboard stats (TTL: 60s)
- [ ] Cache tiles config (TTL: 300s)
- [ ] Cache orders list (TTL: 30s)
- [ ] Invalidation strategy on updates
- [ ] Tests

### 2.9 Error Handling
- [ ] Standardní error response format
- [ ] HTTP status codes správně nastaveny
- [ ] Error logging (winston/morgan)
- [ ] Sentry integration (optional)
- [ ] Tests

### 2.10 API Documentation
- [ ] Swagger/OpenAPI spec vytvořen
- [ ] Endpoints dokumentovány
- [ ] Příklady requestů/responses
- [ ] Error cases dokumentovány
- [ ] Hosted na /api-docs

---

## 📋 FÁZE 3: Permissions System (Týden 5)

### 3.1 Backend Permissions
- [ ] Permission constants definovány
- [ ] Permission check middleware
- [ ] Role-based permissions v DB
- [ ] Tests

### 3.2 Frontend Permission Service
```javascript
- [ ] Vytvořit PermissionService.js
- [ ] hasPermission(user, permissionCode)
- [ ] hasAnyPermission(user, permissionCodes[])
- [ ] hasAllPermissions(user, permissionCodes[])
- [ ] Tests
```

### 3.3 Permission Context
```jsx
- [ ] Vytvořit PermissionContext.jsx
- [ ] PermissionProvider component
- [ ] usePermission hook
- [ ] Tests
```

### 3.4 Tile Visibility Logic
```javascript
- [ ] TILE_PERMISSIONS config
- [ ] Filter tiles based on permissions
- [ ] Tests
```

### 3.5 Admin UI (Desktop app)
- [ ] Stránka /admin/mobile-tiles
- [ ] UI pro výběr dlaždic
- [ ] Per-user configuration
- [ ] Per-device configuration (mobile/tablet)
- [ ] Save configuration
- [ ] Tests

---

## 📋 FÁZE 4: Konfigurovatelné dlaždice (Týden 6-7)

### 4.1 Tile Configuration
```javascript
// apps/eeo-v2-mobile/src/config/tiles.config.js
- [ ] AVAILABLE_TILES definovány (15+ tiles)
- [ ] DEFAULT_LAYOUT pro mobile
- [ ] DEFAULT_LAYOUT pro tablet
- [ ] Tile metadata (id, title, icon, permission)
```

### 4.2 Tile Components
- [ ] TileContainer.jsx (wrapper)
- [ ] DashboardTile.jsx (generic)
- [ ] OrdersTile.jsx
- [ ] InvoicesTile.jsx
- [ ] CashbookTile.jsx
- [ ] AnnualFeesTile.jsx
- [ ] NotificationsTile.jsx
- [ ] ... další tiles

### 4.3 Dynamic Tile Rendering
```jsx
- [ ] MobileDashboard.jsx
- [ ] Fetch user's tile config
- [ ] Filter AVAILABLE_TILES by config
- [ ] Render tiles dynamically
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Tests
```

### 4.4 Tile Layout System
- [ ] CSS Grid layout
- [ ] Responsive breakpoints
- [ ] Tile ordering
- [ ] Tile sizing (1x1, 2x1, etc.)
- [ ] Tests

### 4.5 Tile Data Service
```javascript
- [ ] tileDataService.js
- [ ] getTileData(tileId)
- [ ] Fetch data from V3 API
- [ ] Caching
- [ ] Error handling
- [ ] Tests
```

---

## 📋 FÁZE 5: Mini-edit funkce (Týden 8)

### 5.1 Action Configuration
```javascript
// apps/eeo-v2-mobile/src/config/actions.config.js
- [ ] MINI_EDIT_ACTIONS definovány
- [ ] Action permissions mapped
- [ ] Action metadata (label, icon, color)
```

### 5.2 Action Components
- [ ] ActionButton.jsx
- [ ] ActionSheet.jsx (pro mobile)
- [ ] ActionDialog.jsx
- [ ] ConfirmDialog.jsx

### 5.3 Order Actions
```jsx
- [ ] ApproveButton.jsx
- [ ] RejectButton.jsx
- [ ] CommentButton.jsx
- [ ] ChangeStatusButton.jsx
- [ ] Integration s V3 API
- [ ] Success/Error handling
- [ ] Tests
```

### 5.4 Mini-edit Panel
```jsx
- [ ] MiniEditPanel.jsx (bottom sheet na mobile)
- [ ] Show available actions based on permissions
- [ ] Show available actions based on order status
- [ ] Handle action clicks
- [ ] Show loading states
- [ ] Tests
```

### 5.5 Success/Error Handling
- [ ] Toast notifications
- [ ] Success messages
- [ ] Error messages
- [ ] Retry logic
- [ ] Tests

---

## 📋 FÁZE 6: Testing (Týden 9)

### 6.1 Unit Tests
```bash
- [ ] Utils functions (100% coverage)
- [ ] Custom hooks (80%+ coverage)
- [ ] Services (80%+ coverage)
- [ ] Permission logic (100% coverage)
- [ ] Run: npm test
```

### 6.2 Integration Tests
```bash
- [ ] Component + hooks
- [ ] API client + backend
- [ ] Tile rendering + data fetching
- [ ] Action flows
- [ ] Run: npm run test:integration
```

### 6.3 E2E Tests (Cypress/Playwright)
```bash
- [ ] Login flow
- [ ] Dashboard load
- [ ] Tile interaction
- [ ] Order approval flow
- [ ] Order rejection flow
- [ ] Comment adding flow
- [ ] Logout flow
- [ ] Run: npm run test:e2e
```

### 6.4 Performance Testing
- [ ] Lighthouse audit (Mobile score > 85)
- [ ] Bundle size check (< 500KB gzipped)
- [ ] API response time (< 500ms p95)
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] TTI < 3.5s

### 6.5 Cross-browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (iOS)
- [ ] Chrome Mobile (Android)
- [ ] Samsung Internet

### 6.6 Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 12/13/14 (medium screen)
- [ ] iPhone Pro Max (large screen)
- [ ] Android (various sizes)
- [ ] Tablet (iPad, Android tablets)

---

## 📋 FÁZE 7: Deployment (Týden 10)

### 7.1 Staging Deployment
```bash
- [ ] Build production bundle: npm run build
- [ ] Bundle size check passed
- [ ] Deploy to staging: ./scripts/deploy-mobile.sh staging
- [ ] Smoke tests: ./scripts/smoke-test-mobile.sh staging
- [ ] QA testing na staging
- [ ] UAT (User Acceptance Testing)
```

### 7.2 Production Preparation
- [ ] Backup production DB
- [ ] Backup current mobile app (if exists)
- [ ] Apache config update připraven
- [ ] PM2 config update připraven
- [ ] Rollback plan připraven
- [ ] Monitoring setup done
- [ ] Alert rules configured

### 7.3 Production Deployment
```bash
- [ ] Announce downtime (if needed)
- [ ] Run migration: npm run db:migrate
- [ ] Build: npm run build
- [ ] Deploy: ./scripts/deploy-mobile.sh production
- [ ] Smoke tests: ./scripts/smoke-test-mobile.sh production
- [ ] Monitor metrics for 1 hour
- [ ] Verify logs (no errors)
```

### 7.4 Post-deployment
- [ ] Announce to users (email, Slack)
- [ ] Update documentation
- [ ] Monitor for 24 hours
- [ ] Collect feedback
- [ ] Bug triage meeting

### 7.5 Rollback (if needed)
```bash
- [ ] Execute: ./scripts/rollback-mobile.sh
- [ ] Verify rollback successful
- [ ] Investigate issues
- [ ] Fix and re-deploy
```

---

## 📋 POST-IMPLEMENTATION

### Documentation Updates
- [ ] Update MOBILE-README.md
- [ ] Update V3 Architecture Plan (actual vs planned)
- [ ] Create User Guide
- [ ] Create Admin Guide
- [ ] Update API documentation
- [ ] Update troubleshooting guide

### Knowledge Transfer
- [ ] Team presentation (demo)
- [ ] Developer onboarding doc
- [ ] QA testing guide
- [ ] Support team training

### Monitoring & Maintenance
- [ ] Setup alerts:
  - [ ] Error rate > 5%
  - [ ] API response time > 3s
  - [ ] PM2 process down
  - [ ] Database connection failed
- [ ] Weekly metrics review
- [ ] Monthly performance review

### Future Enhancements
- [ ] Prioritizovat další dlaždice
- [ ] Plánovat další mini-edit features
- [ ] User feedback integration
- [ ] A/B testing setup (optional)

---

## 🎯 KPI Tracking

### Post-Launch Metrics (měřit po 2 týdnech)
- [ ] **Adoption Rate:** % uživatelů, kteří používají mobile
- [ ] **Daily Active Users:** Kolik uživatelů denně?
- [ ] **Session Duration:** Průměrná délka session
- [ ] **Action Rate:** % users které approve/reject orders
- [ ] **Error Rate:** < 1%
- [ ] **API Response Time:** p95 < 500ms
- [ ] **Bundle Size:** < 500 KB gzipped
- [ ] **Lighthouse Score:** Mobile > 85

### User Satisfaction (survey po 1 měsíci)
- [ ] Survey vytvořen
- [ ] Survey rozeslán
- [ ] Feedback aggregován
- [ ] Action items z feedbacku

---

## ✅ SIGN-OFF

### Phase 1: Příprava
- [ ] **Completed by:** ___________ (name)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (team lead)

### Phase 2: V3 API
- [ ] **Completed by:** ___________ (backend dev)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (team lead)

### Phase 3: Permissions
- [ ] **Completed by:** ___________ (name)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (team lead)

### Phase 4: Konfigurovatelné dlaždice
- [ ] **Completed by:** ___________ (frontend dev)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (team lead)

### Phase 5: Mini-edit funkce
- [ ] **Completed by:** ___________ (frontend dev)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (team lead)

### Phase 6: Testing
- [ ] **Completed by:** ___________ (QA)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (QA lead)

### Phase 7: Deployment
- [ ] **Completed by:** ___________ (DevOps)
- [ ] **Date:** ___________ 
- [ ] **Approved by:** ___________ (CTO/Team lead)

---

## 📊 Progress Tracking

| Fáze | Status | Start Date | End Date | Assignee | Notes |
|------|--------|------------|----------|----------|-------|
| 1. Příprava | ⏳ Not Started | | | | |
| 2. V3 API | ⏳ Not Started | | | | |
| 3. Permissions | ⏳ Not Started | | | | |
| 4. Dlaždice | ⏳ Not Started | | | | |
| 5. Mini-edit | ⏳ Not Started | | | | |
| 6. Testing | ⏳ Not Started | | | | |
| 7. Deployment | ⏳ Not Started | | | | |

**Legend:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- ⏸️ Paused

---

## 📞 Kontakty

**Project Owner:** ___________  
**Tech Lead:** ___________  
**Backend Lead:** ___________  
**Frontend Lead:** ___________  
**DevOps:** ___________  
**QA Lead:** ___________

---

**Created:** 11. března 2026  
**Last Updated:** 11. března 2026  
**Version:** 1.0
