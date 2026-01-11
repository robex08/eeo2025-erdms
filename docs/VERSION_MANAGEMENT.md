# 🔢 Správa Verzí Aplikace EEO v2

**Datum vytvoření:** 2. ledna 2026  
**Status:** ✅ AKTUÁLNÍ

---

## 🎯 Účel Dokumentu

Tento dokument popisuje **kompletní proces změny verze** aplikace EEO v2. Při změně verze je kritické aktualizovat **VŠECHNY** soubory uvedené níže, jinak mohou nastat problémy s verzemi v DEV/PROD buildech.

---

## ⚠️ KRITICKÉ ZJIŠTĚNÍ

### Problém

React při buildu **nepoužívá `.env`**, ale používá:
- `.env.development` pro DEV build (`npm run build:dev:explicit`)
- `.env.production` pro PROD build (`npm run build:prod`)

**Důsledek:** Pokud změníte pouze `package.json` a `.env`, buildy budou stále obsahovat starou verzi!

### Řešení

Před buildem VŽDY aktualizovat:
1. ✅ `.env.development` → pro DEV build
2. ✅ `.env.production` → pro PROD build
3. ✅ Smazat staré buildy: `rm -rf build build-prod`
4. ✅ Vytvořit nové buildy

---

## 📋 Checklist Změny Verze

### 1️⃣ Frontend Config Soubory

**Adresář:** `/var/www/erdms-dev/apps/eeo-v2/client/`

- [ ] `package.json`
  ```json
  "version": "1.94"
  ```

- [ ] `.env` (runtime DEV)
  ```bash
  REACT_APP_VERSION=1.94-DEV
  ```

- [ ] ⚠️ **KRITICKÉ:** `.env.development` (DEV build!)
  ```bash
  REACT_APP_VERSION=1.94-DEV
  ```

- [ ] ⚠️ **KRITICKÉ:** `.env.production` (PROD build!)
  ```bash
  REACT_APP_VERSION=1.94
  ```

- [ ] `.env.example` (template/dokumentace)
  ```bash
  # DEV:
  REACT_APP_VERSION=1.94-DEV
  
  # PRODUCTION:
  # REACT_APP_VERSION=1.94
  ```

### 2️⃣ Backend API Config

**Adresář:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/`

- [ ] `.env` (DEV API)
  ```bash
  REACT_APP_VERSION=1.94-DEV
  ```

- [ ] `.env.example` (template/dokumentace)
  ```bash
  # DEV:
  REACT_APP_VERSION=1.94-DEV
  
  # PRODUCTION:
  # REACT_APP_VERSION=1.94
  ```

### 3️⃣ Dokumentace

- [ ] `/var/www/erdms-dev/BUILD.md`
  - Změnit řádek: `**Verze:** 1.94`
  - Změnit řádek: `**Datum:** 2. ledna 2026`
  - Aktualizovat příklady: `REACT_APP_VERSION=1.94`

### 4️⃣ PROD Environment (po deployi)

**Adresář:** `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/`

- [ ] `.env` (PROD API)
  ```bash
  REACT_APP_VERSION=1.94
  ```

---

## 🔧 Automatický Postup

### Krok 1: Najít Aktuální Verzi

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
echo "📦 package.json:"
grep '"version"' package.json

echo -e "\n🔧 .env soubory:"
grep "REACT_APP_VERSION" .env .env.development .env.production
```

### Krok 2: Nahradit Verzi (Příklad: 1.93 → 1.94)

```bash
# Frontend
cd /var/www/erdms-dev/apps/eeo-v2/client

# package.json
sed -i 's/"version": "1.93"/"version": "1.94"/' package.json

# .env soubory
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.development
sed -i 's/REACT_APP_VERSION=1\.93/REACT_APP_VERSION=1.94/' .env.production
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.example

# Backend API
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.example
```

### Krok 3: Verifikace

```bash
echo "═══════════════════════════════════════"
echo "✅ VERIFIKACE VERZÍ"
echo "═══════════════════════════════════════"

cd /var/www/erdms-dev/apps/eeo-v2/client
echo "📦 package.json:"
grep '"version"' package.json

echo -e "\n🔧 Frontend .env:"
grep "REACT_APP_VERSION" .env .env.development .env.production

echo -e "\n🔧 Backend .env:"
grep "REACT_APP_VERSION" ../api-legacy/api.eeo/.env
```

### Krok 4: Smazat Staré Buildy ⚠️

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build build-prod
echo "🗑️ Staré buildy smazány"
```

### Krok 5: Nové Buildy

```bash
# DEV build (použije .env.development)
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit

# PROD build (použije .env.production)
npm run build:prod
```

### Krok 6: Deploy PROD

```bash
# Frontend
cp -r /var/www/erdms-dev/apps/eeo-v2/client/build-prod/* /var/www/erdms-platform/apps/eeo-v2/

# API (s opravou .env!)
rsync -av --delete --exclude='.env' \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/

# Manuálně opravit PROD API .env verzi
sed -i 's/REACT_APP_VERSION=.*/REACT_APP_VERSION=1.94/' \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

# Reload Apache
systemctl reload apache2
```

---

## 🚨 Častá Chyba

### Symptom

```
❌ PROD zobrazuje starou verzi i po buildu a deployi
❌ DEV build obsahuje starou verzi
```

### Diagnostika

```bash
# Zkontrolovat .env.development a .env.production
cd /var/www/erdms-dev/apps/eeo-v2/client
grep REACT_APP_VERSION .env.development .env.production

# Pokud ukazují starou verzi → to je problém!
```

### Oprava

```bash
# 1. Opravit .env soubory
sed -i 's/REACT_APP_VERSION=1\.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.development
sed -i 's/REACT_APP_VERSION=1\.93/REACT_APP_VERSION=1.94/' .env.production

# 2. SMAZAT staré buildy!
rm -rf build build-prod

# 3. Vytvořit nové buildy
npm run build:dev:explicit
npm run build:prod

# 4. Deploy PROD
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/

# 5. Verifikace
curl -s https://erdms.zachranka.cz/eeo-v2/ | grep -o 'static/js/main\.[^"]*\.js' | head -1
```

---

## 📊 Proč React Používá .env.development a .env.production?

React má **hierarchii .env souborů** (viz [Create React App docs](https://create-react-app.dev/docs/adding-custom-environment-variables/)):

```
Priorita při buildu (nejvyšší → nejnižší):

1. .env.production.local  (ignorováno gitem, local override)
2. .env.production         ⚠️ POUŽÍVÁ SE PŘI npm run build:prod
3. .env.development.local (ignorováno gitem, local override)
4. .env.development        ⚠️ POUŽÍVÁ SE PŘI npm run build:dev
5. .env.local             (ignorováno gitem, všechna prostředí kromě test)
6. .env                   (základní hodnoty, runtime)
```

**Důsledky:**
- `npm run build:prod` → použije `.env.production`, IGNORUJE `.env`
- `npm run build:dev:explicit` → použije `.env.development`, IGNORUJE `.env`
- `npm start` → použije `.env.development` nebo `.env`

---

## 📝 GitHub Copilot Prompt

```markdown
# 🤖 Prompt pro GitHub Copilot: Změna Verze EEO v2

Když měním verzi aplikace EEO v2, musím aktualizovat VŠECHNY tyto soubory:

## Frontend
- `/var/www/erdms-dev/apps/eeo-v2/client/package.json` → "version": "X.XX"
- `/var/www/erdms-dev/apps/eeo-v2/client/.env` → REACT_APP_VERSION=X.XX-DEV
- ⚠️ `/var/www/erdms-dev/apps/eeo-v2/client/.env.development` → REACT_APP_VERSION=X.XX-DEV
- ⚠️ `/var/www/erdms-dev/apps/eeo-v2/client/.env.production` → REACT_APP_VERSION=X.XX
- `/var/www/erdms-dev/apps/eeo-v2/client/.env.example` → REACT_APP_VERSION=X.XX-DEV / X.XX

## Backend
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env` → REACT_APP_VERSION=X.XX-DEV
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env.example` → REACT_APP_VERSION=X.XX-DEV / X.XX

## Dokumentace
- `/var/www/erdms-dev/BUILD.md` → **Verze:** X.XX, datum, příklady

## KRITICKÉ KROKY:
1. Aktualizovat .env.development a .env.production (NEJEN .env!)
2. Smazat staré buildy: `rm -rf build build-prod`
3. Vytvořit nové buildy: `npm run build:dev:explicit` a `npm run build:prod`
4. Deploy PROD včetně API .env

React při buildu NEPOUŽÍVÁ .env, ale .env.development nebo .env.production!
```

---

## ✅ Post-Deploy Verifikace

```bash
echo "═══════════════════════════════════════"
echo "🔍 VERIFIKACE VERZÍ V DEV A PROD"
echo "═══════════════════════════════════════"

# DEV
echo -e "\n📦 DEV:"
echo "   Frontend build:"
ls -lh /var/www/erdms-dev/apps/eeo-v2/client/build/index.html | awk '{print "   "$6, $7, $8}'
echo "   .env verze:"
grep REACT_APP_VERSION /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env | sed 's/^/   /'

# PROD
echo -e "\n📦 PROD:"
echo "   Frontend build:"
ls -lh /var/www/erdms-platform/apps/eeo-v2/index.html | awk '{print "   "$6, $7, $8}'
echo "   .env verze:"
grep REACT_APP_VERSION /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | sed 's/^/   /'

echo -e "\n═══════════════════════════════════════"
echo "🌐 URLs:"
echo "   DEV:  https://erdms.zachranka.cz/dev/eeo-v2/"
echo "   PROD: https://erdms.zachranka.cz/eeo-v2/"
echo "═══════════════════════════════════════"
```

---

## 📚 Reference

- **BUILD.md**: Kompletní build a deploy proces
- **React .env Docs**: https://create-react-app.dev/docs/adding-custom-environment-variables/
- **Webpack Environment Plugin**: https://webpack.js.org/plugins/environment-plugin/

---

**Autor:** Robert Holovský  
**Poslední aktualizace:** 2. ledna 2026  
**Testováno na:** EEO v2 verze 1.94
