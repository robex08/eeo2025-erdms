# Kompletní mapa kódu - Kde je co?

**Datum:** 4. prosince 2025  
**Status:** ⚠️ SUPERSEDED - Viz ERDMS-PLATFORM-ARCHITECTURE.md  

---

## ⚠️ POZNÁMKA
Tento dokument byl nahrazen finálním návrhem **ERDMS Platform Architecture**.

**Finální rozhodnutí:**
- Reorganizace na ERDMS platformu
- Auth API jako samostatná služba
- EEO v2 jako aplikace v `apps/eeo-v2/`
- Dashboard pro výběr aplikací

👉 **Viz:** `ERDMS-PLATFORM-ARCHITECTURE.md`

---

## 🗺️ Současný stav - Co máme a kde to je (archiv)

### 1. 🔐 EntraID Autentizace (v `/var/www/eeo2025/`)

#### Server-side komponenty (Node.js)
```
/var/www/eeo2025/server/src/
├── config/
│   └── entraConfig.js          # ✅ MSAL konfigurace, scopes
│
├── services/
│   ├── authService.js          # ✅ DB operace (findUserByEntraId, syncUser)
│   └── entraService.js         # ✅ Graph API (getUserProfile, getAllUsers)
│
├── routes/
│   ├── auth.js                 # ✅ /api/auth/* endpoints (login, callback, logout)
│   ├── entra.js                # ✅ /api/entra/* endpoints (sync users)
│   └── protected.js            # ✅ Chráněné endpointy (demo)
│
└── middleware/
    └── authMiddleware.js       # ✅ JWT validace, session checks
```

#### Client-side komponenty (React)
```
/var/www/eeo2025/client/src/
├── config/
│   └── authConfig.js           # ✅ MSAL browser config
│
├── components/
│   ├── LoginPage.jsx           # ✅ Login UI s Entra button
│   ├── Dashboard.jsx           # ✅ Protected page
│   └── HomePage.jsx            # ✅ Public page
│
└── main.jsx                    # ✅ MsalProvider setup
```

**🎯 Závěr:** EntraID autentizace JE v `eeo2025/` projektu (client + server)

---

### 2. 📋 EEO2025 Aplikace (Evidence smluv)

#### Co máme hotovo
```
/var/www/eeo2025/
├── client/                     # ✅ React frontend s EntraID
├── server/                     # ✅ Node.js API s EntraID
├── docs/                       # ✅ Dokumentace
└── dev-start.sh               # ✅ Dev workflow
```

#### Co chybí
- ❌ Business logika pro EEO (orders, invoices, cashbook)
- ❌ API endpointy pro EEO data
- ❌ React komponenty pro EEO funkce

---

### 3. 🗂️ Legacy PHP API

```
/var/www/erdms_oldapi/          # ⚠️ PŘEJMENOVAT na eeo2025-legacy-php/
└── api.eeo/
    ├── api.php                 # PHP 5.6 → 8.4 kód
    └── v2025.03_25/
        ├── lib/handlers.php    # 7,148 řádků business logiky
        ├── lib/orderHandlers.php
        └── lib/dbconfig.php    # ✅ Už aktualizováno na novou DB
```

---

### 4. 📂 Build artefakty (rozházené)

```
/var/www/erdms/                 # ⚠️ Starý build - SMAZAT
└── [statické soubory z minulého testu]
```

---

## 🎯 CO CHYBÍ - Potřebujeme vytvořit

### A) Struktura pro builds
```
/var/www/eeo2025-builds/        # ❌ NEEXISTUJE - vytvořit
├── dev/                        # Pro erdms-dev.zachranka.cz
└── releases/                   # Pro produkční verze
```

### B) Skripty pro deploy
```
/var/www/eeo2025/scripts/       # ❌ NEEXISTUJE - vytvořit
├── build-dev.sh
├── build-prod.sh
├── deploy-prod.sh
└── rollback.sh
```

### C) Systemd services
```
/etc/systemd/system/
├── eeo2025-dev-api.service     # ❌ NEEXISTUJE - vytvořit
└── eeo2025-prod-api.service    # ❌ NEEXISTUJE - vytvořit
```

### D) NGINX konfigurace
```
/etc/nginx/sites-available/
├── erdms-dev.zachranka.cz      # ❌ NEEXISTUJE - vytvořit
└── erdms.zachranka.cz          # ⚠️ Existuje, ale třeba upravit
```

---

## 🔧 Správná finální architektura

### Varianta 1: EntraID v EEO2025 (současný stav)

**Výhoda:** Vše na jednom místě  
**Nevýhoda:** Při dalších aplikacích musíš kopírovat EntraID kód

```
/var/www/
├── eeo2025/                    # ✅ JE
│   ├── client/                 # React + EntraID
│   ├── server/                 # Node.js API + EntraID services
│   │   ├── services/
│   │   │   ├── authService.js      # ← EntraID DB logika
│   │   │   ├── entraService.js     # ← Graph API
│   │   │   └── eeoService.js       # ← EEO business logika
│   │   └── routes/
│   │       ├── auth.js             # ← EntraID endpoints
│   │       └── eeo.js              # ← EEO endpoints
│   └── scripts/                # ❌ CHYBÍ
│
├── eeo2025-builds/             # ❌ CHYBÍ
├── eeo2025-current -> ...      # ❌ CHYBÍ
├── eeo2025-legacy-php/         # ⚠️ Přejmenovat erdms_oldapi
└── shared/                     # ❌ CHYBÍ
```

---

### Varianta 2: Samostatný EntraID projekt (best practice)

**Výhoda:** Znovu použitelné pro Intranet a další aplikace  
**Nevýhoda:** Složitější setup

```
/var/www/
├── erdms-auth/                 # 🔐 SAMOSTATNÝ AUTH PROJEKT
│   ├── server/
│   │   ├── services/
│   │   │   ├── authService.js      # EntraID DB logika
│   │   │   └── entraService.js     # Graph API
│   │   └── routes/
│   │       └── auth.js             # /api/auth/* endpoints
│   ├── client-lib/             # Shared React komponenty
│   │   └── AuthProvider.jsx
│   └── docs/
│
├── eeo2025/                    # 📋 EEO APLIKACE
│   ├── client/                 # React (používá erdms-auth)
│   ├── server/                 # Node.js API (volá erdms-auth)
│   │   └── services/
│   │       └── eeoService.js       # POUZE EEO logika
│   └── legacy-php/
│
└── intranet/                   # 🏢 BUDOUCÍ APLIKACE
    ├── client/                 # Také používá erdms-auth
    └── server/
```

---

## 💬 OTÁZKA: Kterou variantu chceš?

### Varianta 1: Nechat jak je (jednodušší TEĎ)
```bash
# Jen reorganizace složek + vytvoření build struktury
✅ Rychlé (30 minut)
⚠️ Později musíš vyextrahovat EntraID pro Intranet
```

### Varianta 2: Rozdělit TEĎ (lepší dlouhodobě)
```bash
# Vytvořit erdms-auth/ + refactor eeo2025/
⏰ Delší (2-3 hodiny)
✅ Připraveno pro budoucí aplikace
```

---

## 🎬 Můj doporučený postup

### FÁZE A: Quick Win (TEĎ - 30 minut)
1. ✅ Reorganizace složek
2. ✅ Vytvoření build struktury
3. ✅ První dev build + test
4. ✅ Dokumentace

→ **Můžeš pokračovat ve vývoji EEO funkcí**

### FÁZE B: Refactoring (později - před Intranetem)
1. Vytvoření `erdms-auth/`
2. Přesun EntraID kódu
3. Aktualizace `eeo2025/` aby volalo `erdms-auth/`
4. Test všeho

→ **Připraveno pro Intranet**

---

## 🚀 Co navrhuji udělat TEĎ

### Krok 1: Reorganizace (TERAZ)
```bash
# 1. Přejmenovat PHP API
sudo mv /var/www/erdms_oldapi /var/www/eeo2025-legacy-php

# 2. Vyčistit starý build
sudo rm -rf /var/www/erdms

# 3. Vytvořit build strukturu
sudo mkdir -p /var/www/eeo2025-builds/{dev,releases}
sudo mkdir -p /var/www/shared/{uploads,doc/prilohy,logs}

# 4. Nastavit práva
sudo chown -R www-data:www-data /var/www/eeo2025-builds
sudo chown -R www-data:www-data /var/www/shared
```

### Krok 2: Vytvořit deploy skripty
```bash
cd /var/www/eeo2025
mkdir -p scripts
# Vytvoříme build-dev.sh, build-prod.sh, deploy-prod.sh
```

### Krok 3: První build test
```bash
./scripts/build-dev.sh
# Otestuje že build proces funguje
```

---

## ❓ Co říkáš?

1. **Jdeme na Variantu 1?** (nechat EntraID v eeo2025)
   - Rychlejší
   - Později refactor před Intranetem

2. **Nebo Varianta 2?** (vytvořit erdms-auth TEĎ)
   - Delší
   - Ale správně od začátku

3. **Můžu začít s reorganizací?** (Krok 1)

---

**Status:** 🤔 Čekám na rozhodnutí  
**Doporučení:** Varianta 1 (Quick Win) → později refactor
