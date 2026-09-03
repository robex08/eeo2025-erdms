# 🔄 Version Checking System - Kompletní Průvodce

## 📋 Co je Version Checking?

ERDMS automaticky detekuje novou verzi aplikace a zobrazí notifikaci uživateli. Systém je založený na **build hash** (MD5 hash hlavního JS souboru).

## ⚠️ KRITICKÉ: Build Hash vs Číslo Verze

### 🔢 Číslo verze (např. 2.21-DEV)
- Číselná verze zobrazovaná uživatelům
- Nastavuje se manuálně v `.env` → `REACT_APP_VERSION=2.21-DEV`
- Mění se při **významných změnách** (nové funkce, velké opravy)
- Uživatelé vidí v patičce: "verze 2.21-DEV"

### 🔨 Build Hash (např. c7a2487ddeef)
- **Automaticky generovaný** MD5 hash při KAŽDÉM buildu
- Mění se i při **drobných změnách** (CSS, text, bugfix)
- Používá se pro **detekci nové verze** v prohlížeči
- **NELZE nastavit manuálně!** - generuje se ze souboru

### 💡 Praktický příklad

```bash
# Situace 1: Drobná oprava CSS
git commit -m "fix: Oprava zarovnání tlačítka"
npm run build:dev:explicit

Verze:      2.21-DEV → 2.21-DEV (beze změny)
Build hash: c7a2487ddeef → d8e3f9a12b45 (ZMĚNIL SE!)
Notifikace: ✅ ANO - "Je dostupná nová verze v2.21-DEV"

# Situace 2: Velká změna - nová funkce
git commit -m "feat: Přidán export do PDF"
# Změň .env: REACT_APP_VERSION=2.22-DEV
npm run build:dev:explicit

Verze:      2.21-DEV → 2.22-DEV (ZMĚNILA SE)
Build hash: d8e3f9a12b45 → f1a2b3c4d5e6 (ZMĚNIL SE)
Notifikace: ✅ ANO - "Je dostupná nová verze v2.22-DEV"
```

**ZÁVĚR:** Notifikace "nová verze" se zobrazí i když se **číslo verze nezmění**, protože build hash se mění při každém buildu!

## 🎯 Jak to funguje?

### 1. Build Process
```
npm run build:dev:explicit
↓
1. React vytvoří minifikované soubory (main.f528abc3.js)
2. Zkopíruje index.html s placeholderem __BUILD_HASH__
3. Post-build script:
   - Spočítá MD5 hash z main.*.js (prvních 12 znaků)
   - Nahradí __BUILD_HASH__ v index.html → c7a2487ddeef
   - Vytvoří version.json se STEJNÝM hashem
```

### 2. Runtime Detection
```
Aplikace načte hash z <meta name="build-hash">
                ↓
Po přihlášení zkontroluje /dev/eeo-v2/version.json okamžitě
                ↓
Po načtení libovolné stránky provede první kontrolu za 10 sekund
                ↓
Potom kontroluje každých 10 minut (leader tab)
                ↓
Porovná: currentHash vs serverHash
                ↓
Pokud RŮZNÉ → Zobrazí notifikaci
                ↓
Uživatel potvrdí → Reload stránky
                ↓
Nová verze načtena! ✅
```

## ⚠️ PROBLÉM: Pořád se zobrazuje notifikace

### Příčina #1: Nesynchronizované hashe

**PŘÍKLAD:**
```bash
# index.html má:
<meta name="build-hash" content="c7a2487ddeef">

# version.json má:
{"buildHash": "a809c7e85b795c47"}

❌ NESHODUJÍ SE!
```

**DŮVOD:**
Script `generate-build-info.sh` byl spuštěn **manuálně po buildu**, což vygenerovalo jiný hash.

**ŘEŠENÍ:**
```bash
# Zkontroluj hashe
cd /var/www/erdms-dev
./check_build_hashes.sh

# Pokud se NESHODUJÍ, oprav version.json:
cd apps/eeo-v2/client
HASH=$(grep -o 'build-hash" content="[^"]*"' build/index.html | cut -d'"' -f3)
cat > build/version.json << EOF
{
  "buildHash": "$HASH",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "generated": "$(date)"
}
EOF

# Ověř
./check_build_hashes.sh
```

### Příčina #2: Starý hash v localStorage

**PŘÍKLAD:**
```javascript
// localStorage v prohlížeči obsahuje:
app_build_hash: "c7a2487ddeef"  // Starý hash

// Nový build má:
<meta name="build-hash" content="d8e3f9a12b45">  // Nový hash
version.json: "d8e3f9a12b45"  // Nový hash

// VersionChecker porovná:
currentHash (z localStorage) vs serverHash
"c7a2487ddeef" !== "d8e3f9a12b45"
❌ Detekuje změnu → Notifikace
```

**ŘEŠENÍ:**
```javascript
// V DevTools Console:
localStorage.removeItem('app_build_hash');
location.reload();

// Nebo použij Ctrl+Shift+R (hard reload)
```

### Příčina #3: Reload neaktualizoval hash

**PŮVODNÍ KÓD (BUG):**
```javascript
reloadApp() {
  window.location.reload(true);
  // ❌ localStorage hash zůstal starý!
}
```

**OPRAVENÝ KÓD:**
```javascript
reloadApp() {
  // ✅ Smaž starý hash před reloadem
  localStorage.removeItem('app_build_hash');
  window.location.reload(true);
}
```

## 🔧 Troubleshooting

### Krok 1: Zkontroluj synchronizaci hashů

```bash
cd /var/www/erdms-dev
./check_build_hashes.sh
```

**Očekávaný výstup:**
```
✅ SUCCESS: Hashe jsou synchronizované!
ℹ️  Build hash: c7a2487ddeef
⏰ Build time: 2026-02-01T01:39:00Z
```

### Krok 2: Zkontroluj localStorage v prohlížeči

```javascript
// F12 → Console
console.log('Build hash v HTML:', document.querySelector('meta[name="build-hash"]')?.content);
console.log('Build hash v localStorage:', localStorage.getItem('app_build_hash'));

// Měly by být STEJNÉ!
```

### Krok 3: Ověř version.json na serveru

```bash
curl -H "Cache-Control: no-cache" http://erdms.zachranka.cz/dev/eeo-v2/version.json
# nebo
curl -H "Cache-Control: no-cache" http://localhost/dev/eeo-v2/version.json
```

### Krok 4: Hard reload

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

## ✅ Best Practices

### 1. NIKDY nespouštěj generate-build-info.sh manuálně
```bash
# ❌ ŠPATNĚ:
npm run build:dev:explicit
./scripts/generate-build-info.sh build  # ← Vygeneruje JINÝ hash!

# ✅ SPRÁVNĚ:
npm run build:dev:explicit  # Script se spustí automaticky
```

### 2. Build script automaticky kontroluje hashe
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev

# → Automatická kontrola:
# ✅ Build hashe synchronizované: c7a2487ddeef
# ⏰ Build time: 2026-02-01T01:39:00Z

# Pokud FAIL:
# ❌ CRITICAL ERROR: Build hashe se NESHODUJÍ!
# ⚠️  Build byl NEÚSPĚŠNÝ - nelze deployovat!
```

### 3. Po deployu ověř version.json na serveru
```bash
# DEV:
curl http://localhost/dev/eeo-v2/version.json

# PROD:
curl https://erdms.zachranka.cz/eeo-v2/version.json

# Hash MUSÍ být stejný jako v buildu!
```

### 4. Malé změny = Nová notifikace (i bez změny čísla verze)
```bash
# Příklad: Oprava překlep u textu
git commit -m "fix: Typo in button label"
./build-eeo-v2.sh --dev --explicit

# ✅ Build hash SE ZMĚNÍ → Uživatelé dostanou notifikaci
# Verze zůstane 2.21-DEV, ALE notifikace se zobrazí!
```

## 📊 Debug Log

Pro debugging zapni console logy:

```javascript
// V VersionChecker je automatický logging pro development:
if (process.env.NODE_ENV === 'development') {
  console.log('[VersionChecker] Initialized:', {
    currentHash: this.currentHash,
    endpoint: this.versionEndpoint,
    checkInterval: this.checkInterval,
    gracePeriod: this.gracePeriod
  });
}
```

**Očekávaný výstup:**
```
[VersionChecker] Initialized: {
  currentHash: "c7a2487ddeef",
  endpoint: "/dev/eeo-v2/version.json",
  checkInterval: 300000,  // 5 minut
  gracePeriod: 60000      // 60 sekund
}

[VersionChecker] Started monitoring

// Po 60 sekundách:
[VersionChecker] Check result: {
  current: "c7a2487ddeef",
  server: "c7a2487ddeef",
  changed: false
}
```

## 🚀 Deploy Checklist

### DEV Deployment
```bash
# 1. Build (automatická kontrola hashů)
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev
# → Script AUTOMATICKY zkontroluje hashe
# → ✅ Pokud OK → pokračuj
# → ❌ Pokud FAIL → oprav a buildni znovu

# 2. Ověř version.json na serveru
curl http://localhost/dev/eeo-v2/version.json
# → Hash MUSÍ být stejný jako v build/index.html

# 3. Test v prohlížeči
# - Načti aplikaci: http://localhost/dev/eeo-v2
# - F12 → Console
# - Zkontroluj [VersionChecker] logy
# - Počkej 60s → NEMĚLA by se zobrazit notifikace

# 4. Test nové verze (simulace)
# - Udělej další build (i s malou změnou)
# - Počkej 60s
# - MĚLA by se zobrazit notifikace "Je dostupná nová verze"
# - Klikni "Obnovit"
# - Po reloadu NEMĚLA by se zobrazit znovu! ✅
```

### PRODUCTION Deployment
```bash
# 1. Build PROD (automatická kontrola + potvrzení)
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --all --deploy

# Script se zeptá:
# ⚠️  PRODUCTION DEPLOYMENT CONFIRMATION REQUIRED
#    Build hash: c7a2487ddeef
#    Build time: 2026-02-01T01:39:00Z
#    Deploy to PRODUCTION? (yes/no): yes

# 2. Po deployu OVĚŘ
curl https://erdms.zachranka.cz/eeo-v2/version.json
# → Očekávaný hash: c7a2487ddeef (stejný jako build!)

# 3. Test v prohlížeči
# - Otevři aplikaci: https://erdms.zachranka.cz/eeo-v2
# - Počkej 60s
# - Pokud byl předchozí build jiný → zobrazí se notifikace
# - Klikni "Obnovit"
# - Po reloadu ŽÁDNÁ další notifikace! ✅

# 4. Monitoring
# - Sleduj uživatelské reporty
# - Zkontroluj, že se notifikace NEZOBRAZUJE pořád
# - Pokud ANO → viz Troubleshooting níže
```

## 📚 Odkazy

- [BUILD.md](BUILD.md) - Kompletní build guide
- [VersionChecker.js](apps/eeo-v2/client/src/utils/versionChecker.js) - Implementace
- [useVersionChecker.js](apps/eeo-v2/client/src/hooks/useVersionChecker.js) - React hook
- [generate-build-info.sh](apps/eeo-v2/client/scripts/generate-build-info.sh) - Post-build script

---

**Poslední update:** 1. února 2026  
**Verze:** 2.21-DEV
