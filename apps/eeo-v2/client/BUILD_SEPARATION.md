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
├── build/              ← PRODUCTION build (ostrá verze)
├── build-dev/          ← DEV build (vývojová verze)
├── build_temp/         ← Dočasný build pro maintenance
└── .env.production     ← Config pro PRODUCTION
└── .env.development    ← Config pro DEV
```

---

## 🛠️ Build Příkazy

### 1️⃣ **Development Build** (pro testovací server)

```bash
npm run build:dev
```

- **Výstup:** `build-dev/`
- **API:** `https://erdms.zachranka.cz/dev/api.eeo/`
- **Public URL:** `/dev/eeo-v2`
- **Config:** `.env.development`

**Deploy na server:**
```bash
# Zkopírovat build-dev/ do /dev/eeo-v2/ na serveru
rsync -avz build-dev/ user@server:/var/www/erdms/dev/eeo-v2/
```

---

### 2️⃣ **Production Build** (pro ostrou verzi)

```bash
npm run build:prod
```

- **Výstup:** `build/`
- **API:** `https://erdms.zachranka.cz/api.eeo/`
- **Public URL:** `/eeo-v2`
- **Config:** `.env.production`

**Deploy na server:**
```bash
# Zkopírovat build/ do /eeo-v2/ na serveru
rsync -avz build/ user@server:/var/www/erdms/eeo-v2/
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

# 3. Deploy na /dev/eeo-v2/
# (manuální nebo automatický deploy)

# 4. Testování na https://erdms.zachranka.cz/dev/eeo-v2/
```

---

### Scénář 2: Nasazení na PRODUCTION

```bash
# 1. Build pro PRODUCTION
npm run build:prod

# 2. Kontrola buildu v build/
ls -la build/

# 3. Deploy na /eeo-v2/
# (manuální nebo automatický deploy)

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
| `npm run build:dev` | `build-dev/` | DEV API | Deploy na /dev/eeo-v2/ |
| `npm run build:prod` | `build/` | PROD API | Deploy na /eeo-v2/ |
| `npm run build` | `build/` | PROD API | Výchozí (PRODUCTION) |

---

## 🔧 Technické Detaily

### package.json scripts:
```json
{
  "scripts": {
    "start": "NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired start",
    "build": "NODE_OPTIONS=--max_old_space_size=8192 BUILD_PATH=build react-app-rewired build",
    "build:prod": "NODE_ENV=production BUILD_PATH=build NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:dev": "NODE_ENV=development BUILD_PATH=build-dev PUBLIC_URL=/dev/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

### Proměnné prostředí:
- `NODE_ENV` - určuje, který `.env` soubor se použije
- `BUILD_PATH` - určuje výstupní adresář
- `PUBLIC_URL` - určuje cestu na serveru

---

## 📅 Changelog

- **2025-12-30**: Vytvořena separace DEV a PRODUCTION buildů
- Odděleny build adresáře: `build/` (prod) a `build-dev/` (dev)
- Přidány příkazy: `build:prod` a `build:dev`
- Aktualizován `.gitignore` pro ignorování obou build adresářů

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
