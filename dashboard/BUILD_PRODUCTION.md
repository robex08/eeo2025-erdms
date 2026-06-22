# 🚀 ERDMS Dashboard - Build a Deploy do Produkce

> **Produkční server:** `erdms.zachranka.cz`  
> **Cesta:** `/var/www/erdms-platform/apps/dashboard/`  
> **Tech stack:** React 19.2 + Vite 7.2 + MSAL (Microsoft Entra ID)

---

## 📋 Před buildem - Checklist

### 1. Aktualizace verze
Verze se nastavuje **pouze na jednom místě**:

```bash
# Edituj verzi
nano /var/www/erdms-dev/dashboard/.env.production
```

```bash
# Application version
VITE_APP_VERSION=1.95   # ← Změň tuto verzi
```

Verze se automaticky použije:
- ✅ V hlavičce dashboardu: `ERDMS portál aplikací v1.95`
- ✅ V URL pro SSO: `?sso=auto&v=1.95`

### 2. Kontrola konfigurace

Ověř hodnoty v `.env.production`:

| Proměnná | Hodnota | Popis |
|----------|---------|-------|
| `VITE_API_URL` | `https://erdms.zachranka.cz` | Base API URL |
| `VITE_ENTRA_CLIENT_ID` | `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b` | MS Entra Client ID |
| `VITE_ENTRA_TENANT_ID` | `2bd7827b-4550-48ad-bd15-62f9a17990f1` | MS Entra Tenant ID |
| `VITE_REDIRECT_URI` | `https://erdms.zachranka.cz` | OAuth redirect |

---

## 🔨 Build Process

### Metoda 1: Automatický build (doporučeno)

```bash
cd /var/www/erdms-dev/docs/scripts-shell
bash build-dashboard.sh --prod --deploy
```

**Co tento skript dělá:**
1. ✅ Vyčistí cache a staré buildy
2. ✅ Nainstaluje dependencies (pokud chybí)
3. ✅ Build s production configem
4. ✅ Vytvoří zálohu současné produkce
5. ✅ Nasadí nový build do `/var/www/erdms-platform/apps/dashboard/`
6. ✅ Nastaví správná oprávnění (`www-data:www-data`)
7. ✅ Reload Apache2

---

### Metoda 2: Manuální build (krok po kroku)

#### Krok 1: Příprava a čištění

```bash
cd /var/www/erdms-dev/dashboard

# Vyčisti cache (doporučeno před každým buildem)
rm -rf node_modules/.vite .vite dist build

# Zkontroluj že máš node_modules
# Pokud ne, spusť:
npm ci
```

#### Krok 2: Production Build

```bash
# Build s production environment
npm run build

# Výsledek: /var/www/erdms-dev/dashboard/build/
```

**Co build vytvoří:**
```
build/
├── index.html
├── assets/
│   ├── index-[hash].css    (~60 KB)
│   └── index-[hash].js     (~286 KB)
└── logo-ZZS.png
```

#### Krok 3: Záloha aktuální produkce

```bash
# Vytvoř timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Záloha
cp -r /var/www/erdms-platform/apps/dashboard \
      /var/www/erdms-platform/backups/dashboard-backup-${TIMESTAMP}

echo "✅ Záloha vytvořena: dashboard-backup-${TIMESTAMP}"
```

#### Krok 4: Deploy do produkce

```bash
# Smaž staré soubory
rm -rf /var/www/erdms-platform/apps/dashboard/*

# Zkopíruj nový build
cp -r /var/www/erdms-dev/dashboard/build/* \
      /var/www/erdms-platform/apps/dashboard/

# Nastav oprávnění
chown -R www-data:www-data /var/www/erdms-platform/apps/dashboard/
```

#### Krok 5: Restart Apache

```bash
# Reload Apache pro aplikování změn
systemctl reload apache2

# nebo (pokud reload nefunguje):
systemctl restart apache2
```

---

## ✅ Verifikace nasazení

### 1. Kontrola souborů

```bash
# Zobraz obsah produkční složky
ls -lh /var/www/erdms-platform/apps/dashboard/

# Měl bys vidět:
# - index.html (aktuální datum)
# - assets/ (aktuální datum)
# - logo-ZZS.png
```

### 2. Kontrola verze v buildu

```bash
# Zkontroluj že nová verze je v buildu
grep -o "v[0-9]\+\.[0-9]\+" /var/www/erdms-platform/apps/dashboard/assets/*.js | head -1

# Výstup: v1.95 (nebo tvoje aktuální verze)
```

### 3. Test v prohlížeči

1. **Otevři:** `https://erdms.zachranka.cz`
2. **Hard refresh:** `Ctrl + Shift + R` (Chrome/Firefox) nebo `Cmd + Shift + R` (Mac)
3. **Zkontroluj:**
   - ✅ Verze v hlavičce: `ERDMS portál aplikací v1.95`
   - ✅ Nové dlaždice (např. Portal HR / Vema)
   - ✅ Přihlášení funguje
   - ✅ Aplikace se otevírají

### 4. Browser Console

```javascript
// Otevři Console (F12) a zadej:
console.log(window.location.href);

// Klikni na aplikaci (např. EEO) a zkontroluj URL:
// https://erdms.zachranka.cz/eeo-v2/?sso=auto&v=1.95
```

---

## 🔧 Troubleshooting

### Problém: Starý build se stále zobrazuje

**Řešení:**
```bash
# 1. Vyčisti browser cache (Ctrl + Shift + Delete)
# 2. Hard refresh (Ctrl + Shift + R)
# 3. Zkus inkognito okno
# 4. Pokud problém přetrvává:
systemctl restart apache2
```

### Problém: 404 nebo prázdná stránka

**Kontrola Apache config:**
```bash
# Zkontroluj konfiguraci
cat /etc/apache2/sites-available/erdms-platform.conf | grep -A 5 "dashboard"

# Mělo by obsahovat:
# Alias /dashboard /var/www/erdms-platform/apps/dashboard
# <Directory /var/www/erdms-platform/apps/dashboard>
#     Options -Indexes +FollowSymLinks
#     AllowOverride All
#     Require all granted
# </Directory>
```

### Problém: Chyba oprávnění (403 Forbidden)

**Oprava oprávnění:**
```bash
# Rekurzivně nastav správného vlastníka
chown -R www-data:www-data /var/www/erdms-platform/apps/dashboard/

# Nastav správná práva
find /var/www/erdms-platform/apps/dashboard/ -type d -exec chmod 755 {} \;
find /var/www/erdms-platform/apps/dashboard/ -type f -exec chmod 644 {} \;
```

### Problém: Build failuje

**Vyčisti vše a zkus znovu:**
```bash
cd /var/www/erdms-dev/dashboard

# Kompletní reset
rm -rf node_modules package-lock.json build dist .vite

# Reinstalace
npm install

# Build
npm run build
```

### Problém: MS Entra login nefunguje

**Kontrola redirect URI v Azure:**
1. Přihlaš se do [Azure Portal](https://portal.azure.com)
2. **Microsoft Entra ID** → **App registrations** → **ERDMS**
3. **Authentication** → Zkontroluj redirect URIs:
   - ✅ `https://erdms.zachranka.cz`
   - ✅ `https://erdms.zachranka.cz/dashboard`

---

## 🔄 Rollback (návrat k předchozí verzi)

Pokud něco pokazíš, vrať se k záloze:

```bash
# 1. Zjisti datum poslední zálohy
ls -lh /var/www/erdms-platform/backups/ | grep dashboard

# 2. Obnov zálohu (nahraď TIMESTAMP)
rm -rf /var/www/erdms-platform/apps/dashboard/*
cp -r /var/www/erdms-platform/backups/dashboard-backup-TIMESTAMP/* \
      /var/www/erdms-platform/apps/dashboard/

# 3. Oprávnění
chown -R www-data:www-data /var/www/erdms-platform/apps/dashboard/

# 4. Reload
systemctl reload apache2

echo "✅ Rollback dokončen"
```

---

## 📝 Změnový log

### Verze 1.95 (2026-06-22)
- ✅ Přidána dlaždice **Portal HR / Vema** (https://portal.zachranka.cz)
  - Ikona: Group/HR icon
  - Popis: Mzdy, personalistika, docházka, cestovní příkazy
  - Barva: Fialový gradient
  - Pozice: První v druhé řadě (před Vzdělávací platformou)
- ✅ Refaktoring: Verze načítána dynamicky z `.env.production`
  - `APP_VERSION` константа
  - Použito v hlavičce a URL parametrech

### Verze 1.91 (předchozí)
- Základní dashboard s aplikacemi
- MS Entra ID autentizace
- Dark mode

---

## 📚 Užitečné příkazy

```bash
# Rychlý status produkce
ls -lh /var/www/erdms-platform/apps/dashboard/

# Zobraz poslední zálohy
ls -lt /var/www/erdms-platform/backups/ | head -5

# Sleduj Apache error log
tail -f /var/log/apache2/error.log

# Sleduj Apache access log
tail -f /var/log/apache2/access.log | grep dashboard

# Zkontroluj velikost buildu
du -sh /var/www/erdms-dev/dashboard/build/

# Zkontroluj verzi v produkci
grep -oP 'v\d+\.\d+' /var/www/erdms-platform/apps/dashboard/assets/*.js | head -1
```

---

## 🎯 Doporučený workflow

1. **Změny v kódu:** Editace v `/var/www/erdms-dev/dashboard/src/`
2. **Dev test:** `npm run dev` (localhost:5173)
3. **Verze:** Aktualizuj v `.env.production`
4. **Build:** `bash build-dashboard.sh --prod --deploy`
5. **Test:** Hard refresh na `https://erdms.zachranka.cz`
6. **Commit:** `git add . && git commit -m "Dashboard v1.95 - Portal HR"`

---

## ⚠️ Důležité poznámky

- ❗ **Vždy** vytvoř zálohu před deployem
- ❗ **Nikdy** neměň soubory přímo v `/var/www/erdms-platform/` (pouze přes build)
- ❗ Verze se mění **pouze** v `.env.production` (ne v kódu)
- ❗ Po změně `.env.*` je nutný rebuild
- ❗ Apache config změny vyžadují `systemctl reload apache2`
- ✅ Build automaticky používá production env (`.env.production`)
- ✅ Zálohy se ukládají s timestampem pro snadný rollback

---

**Autor:** ERDMS Dev Team  
**Poslední aktualizace:** 2026-06-22
