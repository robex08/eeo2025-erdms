# 📱 Mobilní část aplikace - Dokumentace

**Datum:** 11. března 2026  
**Status:** ✅ Analýza dokončena + 🎯 V3 Architektura připravena

---

## 📚 Dokumenty - Přehled

### 🎯 **V3 ARCHITEKTURA** (NOVÉ - Priorita 1)

#### 1. [MOBILE-V3-ARCHITECTURE-PLAN.md](./MOBILE-V3-ARCHITECTURE-PLAN.md)
**Komplexní architektonický plán pro mobilní V3**

Klíčové body:
- ✅ **Oddělený build** - samostatná mobile aplikace
- ✅ **Path-based routing** - `/mobile` URL struktura
- ✅ **V3 API integrace** - nové RESTful endpointy
- ✅ **Konfigurovatelné dlaždice** - admin UI + per-user customizace
- ✅ **Globální permissions** - respektování práv a rolí
- ✅ **Mini-edit funkce** - schvalování, komentáře, změny stavů
- 📋 7-fázový implementační plán (10 týdnů)

**→ Začněte zde pro V3 refactoring!**

---

#### 2. [MOBILE-V3-API-SPECIFICATION.md](./MOBILE-V3-API-SPECIFICATION.md)
**Detailní specifikace V3 API endpointů**

Obsah:
- 📊 Dashboard endpoints (`/api/v3/dashboard/stats`, `/tiles`)
- 📋 Orders endpoints (list, detail, approve, reject, comment)
- 💰 Invoices endpoints
- 💼 Cashbook endpoints
- 📅 Annual fees endpoints
- 🔐 Permissions endpoint
- ⚠️ Error handling & status codes
- 🚀 Performance & caching strategie

**→ Pro backend team a API integraci**

---

#### 3. [MOBILE-V3-DEPLOYMENT-GUIDE.md](./MOBILE-V3-DEPLOYMENT-GUIDE.md)
**Deployment strategie a runbook**

Obsah:
- 🏗️ Server architektura
- 🔧 Apache/Nginx konfigurace
- 📦 Build a deploy scripty
- 🔄 PM2 setup pro dev/staging
- 🧪 Testing a smoke tests
- 📊 Monitoring a alerting
- 🔙 Rollback procedury
- 🆘 Troubleshooting guide

**→ Pro DevOps a deployment**

---

#### 🆕 4. [MOBILE-V3-ARCHITECTURE-DIAGRAM.md](./MOBILE-V3-ARCHITECTURE-DIAGRAM.md)
**Vizuální архитектура а flow diagramy**

Obsah:
- 🏗️ High-level architecture diagram
- 🔄 Request flow (Dashboard load příklad)
- 🎨 Tile configuration flow
- 🔐 Permissions flow
- ⚡ Mini-edit action flow
- 📦 Deployment architecture
- 🚀 Build & deploy flow
- 📊 Monitoring architecture
- 📱 Device detection & responsive design

**→ Pro vizuální pochopení systému**

---

#### 📋 5. [MOBILE-V3-IMPLEMENTATION-CHECKLIST.md](./MOBILE-V3-IMPLEMENTATION-CHECKLIST.md)
**Detailní implementační checklist**

Obsah:
- ✅ Fáze 1: Příprava (detailní kroky)
- ✅ Fáze 2: V3 API Backend (všechny endpointy)
- ✅ Fáze 3: Permissions System
- ✅ Fáze 4: Konfigurovatelné dlaždice
- ✅ Fáze 5: Mini-edit funkce
- ✅ Fáze 6: Testing (unit, integration, e2e)
- ✅ Fáze 7: Deployment
- 📊 Progress tracking tabulka
- ✍️ Sign-off sekce

**→ Pro project management a tracking**

---

### 📖 **V2 REFACTORING** (Současný stav - Reference)

#### 6. [MOBILE-LAYOUT-ANALYSIS.md](./MOBILE-LAYOUT-ANALYSIS.md)
**Kompletní analýza současné V2 mobilní části**

Obsah:
- 📊 Přehled struktury mobilních komponent (17 souborů)
- 🔴 Kritické problémy (MobileDashboard 1389 řádků, 18 useState)
- ✅ Co funguje dobře (useDevice, mobileDataService)
- 🎯 Detailní refactoring návrhy pro V2
- 📋 Implementační plán V2 (7 fází, 12-16 dní)
- 📊 Očekávané metriky zlepšení

**→ Pro pochopení současného stavu V2**

---

#### 7. [MOBILE-REFACTORING-IMPLEMENTATION-GUIDE.md](./MOBILE-REFACTORING-IMPLEMENTATION-GUIDE.md)
**Praktický implementační průvodce V2**

Obsah:
- 🎯 Quick Start s konkrétními příklady kódu
- 📝 Hotové utility funkce připravené k použití
- 🧪 Testing checklist a příklady testů
- 💡 Pro Tips pro postupnou migraci
- ✅ Detailní checklist pro každou fázi

**→ Pro V2 refactoring (lze aplikovat i na V3)**

---

## 🚀 Quick Start

### 🎯 **Pro V3 Implementaci (DOPORUČENO):**

1. **Přečtěte V3 Architecture Plan**
   ```bash
   cat docs/MOBILE-V3-ARCHITECTURE-PLAN.md
   ```
   - Pochopte oddělený build systém
   - Rozhodněte: Monorepo vs Separate apps
   - Vyberte routing strategii (path-based vs subdomain)

2. **Prostudujte V3 API Specification**
   ```bash
   cat docs/MOBILE-V3-API-SPECIFICATION.md
   ```
   - Seznamte backend team s endpointy
   - Dohodněte API kontrakt
   - Plánujte implementaci endpointů

3. **Setup nového projektu**
   ```bash
   # Vytvořit novou složku pro mobile V3
   mkdir -p apps/eeo-v2-mobile
   cd apps/eeo-v2-mobile
   npm init -y
   # ... další setup
   ```

4. **Deployment příprava**
   ```bash
   cat docs/MOBILE-V3-DEPLOYMENT-GUIDE.md
   ```

---

### 📖 **Pro V2 Refactoring (Legacy):**

1. **Přečtěte analýzu**
   ```bash
   cat docs/MOBILE-LAYOUT-ANALYSIS.md
   ```

2. **Projděte implementation guide**
   ```bash
   cat docs/MOBILE-REFACTORING-IMPLEMENTATION-GUIDE.md
   ```

3. **Začněte s Fází 1: Utility functions**
   - Zkopírujte kód z implementation guide
   - Vytvořte soubory v `utils/` složce
   - Otestujte každou funkci

---

## 📊 Současný stav (V2 vs V3 Plán)

### V2 - Současná implementace
```
apps/eeo-v2/client/src/components/mobile/
├── MobileDashboard.jsx      1,389 řádků ⚠️
├── MobileDashboard.css      1,199 řádků ⚠️
├── MobileHeader.jsx           200 řádků ✅
├── MobileMenu.jsx             164 řádků ✅
├── MobileLoginPage.jsx        122 řádků ✅
├── OrderApprovalCard.jsx      257 řádků ✅
└── ... další komponenty
```

**Problémy V2:**
- 🔴 Monolitická komponenta (1389 řádků)
- 🔴 18 useState hooks
- 🔴 Nekonzistentní breakpointy
- 🔴 Duplikace logiky s desktop verzí
- 🔴 Používá starší V2 API

---

### V3 - Plánovaná architektura
```
apps/eeo-v2-mobile/                    # 🆕 NOVÝ PROJEKT
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── invoices/
│   │   ├── cashbook/
│   │   └── annual-fees/
│   ├── services/apiV3/                # 🆕 V3 API clients
│   ├── hooks/mobile/
│   ├── config/
│   │   ├── tiles.config.js            # 🆕 Konfigurovatelné dlaždice
│   │   └── permissions.config.js      # 🆕 Permissions systém
│   └── utils/                         # Sdílené s desktop
├── vite.config.js                     # 🆕 Oddělený build (port 5174)
└── package.json
```

**Vylepšení V3:**
- ✅ Oddělený build proces
- ✅ V3 API integrace
- ✅ Konfigurovatelné dlaždice
- ✅ Globální permissions systém
- ✅ Mini-edit funkce
- ✅ Path-based routing (`/mobile`)

---

## 🎯 Implementační plány

### 📱 **V3 Implementation Plan** (PRIORITA)

#### Fáze 1: Příprava (Týden 1-2)
- Vytvoření `apps/eeo-v2-mobile` projektu
- Setup build systému (Vite + routing)
- Apache/Nginx konfigurace
- Migrace existujících komponent

#### Fáze 2: V3 API (Týden 3-4)
- Backend: Vytvoření V3 endpointů
- Frontend: API client services
- Error handling a testování

#### Fáze 3: Permissions (Týden 5)
- Permission service
- Tile visibility logic
- Admin UI pro konfiguraci (desktop)

#### Fáze 4: Konfigurovatelné dlaždice (Týden 6-7)
- Tile configuration system
- Dynamic tile rendering
- Layout customizace

#### Fáze 5: Mini-edit funkce (Týden 8)
- Action config system
- Mini-edit panel
- Dialogy a success handling

#### Fáze 6-7: Testing & Deploy (Týden 9-10)
- Testování (unit, integration, e2e)
- Staging deployment
- Production rollout

**Celkem: ~10 týdnů**

→ **Detail:** [V3 Architecture Plan](./MOBILE-V3-ARCHITECTURE-PLAN.md)

---

### 📖 **V2 Refactoring Plan** (Legacy)

#### Fáze 1-7: Component refactoring (12-16 dní)
- Utility funkce
- Custom hooks
- Context API
- Component splitting
- CSS refactoring
- Testování
- Dokumentace

→ **Detail:** [V2 Analysis](./MOBILE-LAYOUT-ANALYSIS.md)

---

## 📈 Očekávané výsledky

### V3 vs V2 - Srovnání

| Metrika | V2 (Aktuální) | V3 (Cíl) | Zlepšení |
|---------|---------------|----------|----------|
| **Build separace** | Společný build | Samostatný build | ✅ Izolace |
| **API verze** | V2 (legacy) | V3 (REST) | ✅ Modernizace |
| **Bundle size** | ~800 KB | ~400 KB | ⬇️ 50% |
| **Initial load** | ~3.5s | ~1.8s | ⬇️ 48% |
| **FCP** | ~2.1s | ~1.0s | ⬇️ 52% |
| **LCP** | ~3.8s | ~1.9s | ⬇️ 50% |
| **Permissions** | Frontend-only | Backend validated | ✅ Bezpečnost |
| **Konfigurace** | Hardcoded | DB-driven | ✅ Flexibilita |
| **Mini-edit** | ❌ Není | ✅ Ano | ✅ UX |
| **Dlaždice** | Statické | Konfigurovatelné | ✅ Customizace |

---

## 🔐 Permissions systém (V3)

### Globální permissions
```javascript
// apps/eeo-v2-mobile/src/config/permissions.config.js
export const MOBILE_PERMISSIONS = {
  VIEW_ORDERS: 'mobile.orders.view',
  APPROVE_ORDERS: 'mobile.orders.approve',
  VIEW_INVOICES: 'mobile.invoices.view',
  VIEW_CASHBOOK: 'mobile.cashbook.view',
  VIEW_ANNUAL_FEES: 'mobile.annual_fees.view',
  EDIT_ORDERS: 'mobile.orders.edit',
  // ... atd.
};
```

### Tile visibility kontrola
```javascript
// Dlaždice jen pro uživatele s odpovídajícími právy
const visibleTiles = AVAILABLE_TILES.filter(tile => {
  return hasPermission(user, TILE_PERMISSIONS[tile.id]);
});
```

→ **Detail:** [V3 Architecture Plan - Permissions](./MOBILE-V3-ARCHITECTURE-PLAN.md#permissions-system)

---

## 🎨 Konfigurovatelné dlaždice (V3)

### Dostupné dlaždice
- 📊 Dashboard Overview
- 📋 Čekající objednávky
- ✅ Schválené objednávky
- ❌ Zamítnuté objednávky
- 💰 Aktivní faktury
- 📅 Blížící se splatnosti
- 💼 Moje objednávky
- 📥 Příchozí faktury
- 💳 Cashbook overview
- 📅 Roční poplatky
- 🔔 Notifikace
- ... atd.

### Per-user customizace
```javascript
// API endpoint: GET /api/v3/dashboard/tiles?userId=123
{
  "success": true,
  "data": {
    "layout": {
      "mobile": ["dashboard_overview", "pending_orders", "my_orders"],
      "tablet": ["dashboard_overview", "pending_orders", "approved_orders", "my_orders"]
    }
  }
}
```

→ **Detail:** [V3 Architecture Plan - Tiles System](./MOBILE-V3-ARCHITECTURE-PLAN.md#configurable-tiles-system)

---

## ⚡ Mini-edit funkce (V3)

### Podporované akce
```javascript
const MINI_EDIT_ACTIONS = {
  approve: { label: 'Schválit', icon: 'check', permission: 'mobile.orders.approve' },
  reject: { label: 'Zamítnout', icon: 'times', permission: 'mobile.orders.reject' },
  comment: { label: 'Komentář', icon: 'comment', permission: 'mobile.orders.comment' },
  changeStatus: { label: 'Změnit stav', icon: 'edit', permission: 'mobile.orders.edit' },
  // Neplánováno: Vytvořit novou objednávku, Vytvořit fakturu, ...
};
```

### Limitace
- ❌ **NENÍ** plnohodnotný editor
- ❌ **NENÍ** vytváření nových záznamů
- ✅ **JE** schvalování/zamítání
- ✅ **JE** změna stavů
- ✅ **JE** přidávání komentářů

→ **Detail:** [V3 Architecture Plan - Mini-edit](./MOBILE-V3-ARCHITECTURE-PLAN.md#mini-edit-functionality)

---

## 🏗️ Technical Stack

### Frontend (V3)
- **Framework:** React 18 + Hooks
- **Build:** Vite 5 (samostatný config)
- **Routing:** React Router 6 (path-based `/mobile`)
- **State:** Context API + Custom Hooks
- **Styling:** CSS Modules + CSS Variables
- **API Client:** Axios + interceptors
- **Icons:** FontAwesome 6

### Backend (V3 API)
- **Framework:** Express.js (existing)
- **API Style:** RESTful `/api/v3/...`
- **Auth:** JWT tokens (existing system)
- **Validation:** Joi/Yup schemas
- **Database:** MySQL (existing)
- **Caching:** Redis (nový pro mobile)

### DevOps & Deployment
- **Web Server:** Apache 2.4 + mod_proxy
- **Process Manager:** PM2 (dev/staging)
- **Build Server:** Vite dev (port 5174)
- **Monitoring:** Custom metrics endpoint
- **SSL:** Let's Encrypt (existing)

→ **Detail:** [V3 Deployment Guide](./MOBILE-V3-DEPLOYMENT-GUIDE.md)

---

## 🔗 Související dokumenty

### V3 Architektura (NOVÉ) - START HERE! 🎯
1. 📐 [V3 Architecture Plan](./MOBILE-V3-ARCHITECTURE-PLAN.md) - **Hlavní plán - Čtěte první!**
2. 🔌 [V3 API Specification](./MOBILE-V3-API-SPECIFICATION.md) - API kontrakt pro backend
3. 🚀 [V3 Deployment Guide](./MOBILE-V3-DEPLOYMENT-GUIDE.md) - Deployment procedury
4. 🎨 [V3 Architecture Diagram](./MOBILE-V3-ARCHITECTURE-DIAGRAM.md) - Vizuální diagramy
5. ✅ [V3 Implementation Checklist](./MOBILE-V3-IMPLEMENTATION-CHECKLIST.md) - Detailní todo list

### V2 Reference (Legacy)
- 📊 [V2 Layout Analysis](./MOBILE-LAYOUT-ANALYSIS.md) - Současný stav
- 🛠️ [V2 Implementation Guide](./MOBILE-REFACTORING-IMPLEMENTATION-GUIDE.md) - Praktické příklady

### Relevantní soubory v projektu
```
apps/eeo-v2/client/src/
├── components/mobile/           # V2 komponenty
├── hooks/useDevice.js          # Device detection (reuse)
├── services/mobileDataService.js  # V2 service (migrate)
└── App.jsx                     # Routing config

apps/eeo-v2-mobile/             # 🆕 V3 NOVÝ PROJEKT
├── src/
├── vite.config.js
└── package.json
```

---

## 👥 Doporučené role

### Pro V3 implementaci
- **Backend team:** V3 API endpointy (`/api/v3/...`)
- **Frontend team:** Mobile komponenty + Tile system
- **DevOps:** Apache config + PM2 + deployment
- **Designer:** UX/UI pro dlaždice a mini-edit
- **QA:** Testing strategie + smoke tests
- **PO/PM:** Prioritizace dlaždic + permissions design

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

### 🚨 Status: **POUZE PLÁNOVÁNÍ**
```
❌ ZATÍM NEIMPLEMENTOVAT
✅ DOKUMENTACE HOTOVÁ
⏳ ČEKÁ NA REVIEW A SCHVÁLENÍ
```

Citace uživatele:
> "zatim jen planovat prosim, zadna implementace !!!!"

### 📋 Další kroky
1. **Team review** - Projít V3 Architecture Plan s týmem
2. **Rozhodnout:** Monorepo vs separate apps?
3. **Rozhodnout:** Path-based vs subdomain routing?
4. **Prioritizovat:** Které dlaždice implementovat první?
5. **Backend assignment:** Kdo bude dělat V3 API?
6. **Timeline:** Realistický odhad 10 týdnů?
7. **Approval:** Schválení architektury vedením

→ **Po schválení:** Začít s Fází 1 (Setup projektu)

---

## 📞 Kontakt a help

**Pro otázky k dokumentaci:**
- Přečíst si nejprve [V3 Architecture Plan](./MOBILE-V3-ARCHITECTURE-PLAN.md)
- Konzultovat s vedoucím projektu
- Pull request s návrhy zlepšení

**Užitečné odkazy:**
- Vite docs: https://vitejs.dev/
- React Router: https://reactrouter.com/
- PM2 docs: https://pm2.keymetrics.io/

---

**Poslední update:** 11. března 2026  
**Next review:** Po přečtení týmem  
**Created by:** GitHub Copilot (Claude Sonnet 4.5)
