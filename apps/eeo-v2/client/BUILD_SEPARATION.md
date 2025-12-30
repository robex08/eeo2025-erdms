# Build Separation - DEV vs PRODUCTION

## 📋 Přehled

Tento dokument popisuje oddělení DEV a PRODUCTION buildů pro zabránění konfliktům a nechtěné výměně konfigurací.

## 🎯 Cíle

1. ✅ DEV build a PRODUCTION build mají **oddělené adresáře**
2. ✅ DEV build používá **DEV API** (`/dev/api.eeo/`)
3. ✅ PRODUCTION build používá **PRODUCTION API** (`/api.eeo/`)
4. ✅ Není možné přepsat jeden build druhým
5. ✅ Jasné a jednoduché příkazy pro build

---

## 📂 Struktura Build Adresářů

```
/var/www/erdms-dev/apps/eeo-v2/client/
├── build/              ← DEV build (Apache směruje sem)
├── build-prod/         ← PRODUCTION build (kopíruje se na erdms-platform)
├── build_temp/         ← Dočasný build pro maintenance
├── .env.production     ← Config pro PRODUCTION
└── .env.development    ← Config pro DEV
```

**📍 Deploy flow:**
- DEV: `build/` → Apache servíruje přímo odtud
- PRODUCTION: `build-prod/` → kopíruje se na `/var/www/erdms-platform/eeo-v2/`

---

## 🛠️ Build Příkazy

### 1️⃣ **Development Build** (pro testovací server)

```bash
npm run build:dev
```

- **Výstup:** `build/`
- **API:** `https://erdms.zachranka.cz/dev/api.eeo/`
- **Public URL:** `/dev/eeo-v2`
- **Config:** `.env.development`
- **Deploy:** Apache už směruje do `build/`, není potřeba kopírovat

---

### 2️⃣ **Production Build** (pro ostrou verzi)

```bash
npm run build:prod
```

- **Výstup:** `build-prod/`
- **API:** `https://erdms.zachranka.cz/api.eeo/`
- **Public URL:** `/eeo-v2`
- **Config:** `.env.production`

**Deploy na production server:**

🚨 **KRITICKÉ PRAVIDLO: NIKDY bez explicitního potvrzení!** 🚨

```bash
# ⚠️ DŮLEŽITÉ: 
# 1. NIKDY nepoužívat --delete flag (smaže api-legacy/)
# 2. Deploy jen po EXPLICITNÍM POTVRZENÍ
# 3. Produkční .env NIKDY neměnit automaticky!

# SPRÁVNĚ - bez --delete:
rsync -avz build-prod/ /var/www/erdms-platform/apps/eeo-v2/

# NEBO pomocí cp:
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/

# ❌ ZAKÁZÁNO:
# rsync -avz --delete build-prod/ /var/www/erdms-platform/apps/eeo-v2/
```

**API Legacy Deploy** (pouze když je to nutné):
```bash
# ⚠️ Vždy potvrdit před nasazením!
# Produkční .env NESMÍ být přepsán!
rsync -avz /var/www/erdms-dev/apps/eeo-v2/api-legacy/ \
            /var/www/erdms-platform/apps/eeo-v2/api-legacy/ \
            --exclude='.git' --exclude='api.eeo/.env'

# Po deploy VŽDY restartovat PHP-FPM:
systemctl restart php8.4-fpm && systemctl restart apache2
```

---

### 3️⃣ **Default Build** (starý způsob - PRODUCTION)

```bash
npm run build
```

- **Výstup:** `build/`
- **API:** PRODUCTION API (z `.env.production`)
- **Poznámka:** Stejné jako `npm run build:prod`

---

## 🔄 Workflow

### Scénář 1: Vývoj a testování na DEV serveru

```bash
# 1. Vývoj lokálně
npm start

# 2. Build pro DEV server
npm run build:dev

# 3. Apache servíruje přímo z build/
# Nic nekopírovat - build/ je už dostupný na https://erdms.zachranka.cz/dev/eeo-v2/

# 4. Testování na DEV serveru
```

---

### Scénář 2: Nasazení na PRODUCTION

```bash
# 1. Build pro PRODUCTION
npm run build:prod

# 2. Kontrola buildu v build-prod/
ls -la build-prod/

# 3. Zkopírovat na produkční server
cp -r build-prod/* /var/www/erdms-platform/eeo-v2/

# 4. Ověření na https://erdms.zachranka.cz/eeo-v2/
```

---

## ⚙️ Konfigurační Soubory

### `.env.development` (DEV)
```env
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/
```

### `.env.production` (PRODUCTION)
```env
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/
```

---

## 🚨 Důležité Poznámky

### ✅ Co dělat:
- Vždy použít **správný příkaz** pro správné prostředí
- Kontrolovat build adresář před deployem
- Testovat na DEV před nasazením na PRODUCTION

### ❌ Co nedělat:
- ~~`npm run build` pro DEV~~ → použít `npm run build:dev`
- ~~Manuálně editovat build soubory~~
- ~~Kopírovat build-dev/ do production složky~~

---

## 📊 Shrnutí Příkazů

| Příkaz | Výstup | API | Použití |
|--------|--------|-----|---------|
| `npm start` | localhost:3000 | DEV API | Lokální vývoj |
| `npm run build:dev` | `build/` | DEV API | DEV server (Apache) |
| `npm run build:prod` | `build-prod/` | PROD API | Kopírovat na erdms-platform |
| `npm run build` | `build/` | DEV API | Výchozí (DEV) |

---

## 🔧 Technické Detaily

### package.json scripts:
```json
{
  "scripts": {
    "start": "NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired start",
    "build": "NODE_OPTIONS=--max_old_space_size=8192 BUILD_PATH=build react-app-rewired build",
    "build:dev": "NODE_ENV=development BUILD_PATH=build PUBLIC_URL=/dev/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:prod": "NODE_ENV=production BUILD_PATH=build-prod PUBLIC_URL=/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

### Proměnné prostředí:
- `NODE_ENV` - určuje, který `.env` soubor se použije
- `BUILD_PATH` - určuje výstupní adresář
- `PUBLIC_URL` - určuje cestu na serveru

---

## 📅 Changelog

- **2025-12-30 (v2)**: Upravena struktura - PRODUCTION build jde do `build-prod/`
  - `build/` → DEV (Apache směruje sem)
  - `build-prod/` → PRODUCTION (kopíruje se na erdms-platform)
- **2025-12-30 (v1)**: Vytvořena separace DEV a PRODUCTION buildů
  - Odděleny build adresáře
  - Přidány příkazy: `build:prod` a `build:dev`

---

## 🆘 Troubleshooting

### Problém: Build se vytváří do špatného adresáře
**Řešení:** Zkontroluj použitý příkaz - `build:dev` → `build-dev/`, `build:prod` → `build/`

### Problém: Build používá špatné API
**Řešení:** Zkontroluj `.env.development` nebo `.env.production` a použij správný build příkaz

### Problém: Stará verze buildu se nezmaže
**Řešení:** 
```bash
# Pro DEV
rm -rf build-dev/ && npm run build:dev

# Pro PRODUCTION
rm -rf build/ && npm run build:prod
```

---

**Autor:** Robert Hoffmann  
**Datum:** 30.12.2025  
**Verze:** 1.0
