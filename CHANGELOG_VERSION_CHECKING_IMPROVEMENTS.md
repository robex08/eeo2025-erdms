# CHANGELOG - Version Checking System Improvements

**Datum:** 1. února 2026  
**Verze:** 2.21-DEV  
**Autor:** GitHub Copilot

## 📋 Shrnutí změn

Automatizace a vylepšení version checking systému pro zajištění správné detekce nových verzí a zabránění opakovaným notifikacím.

## 🔧 Technické změny

### 1. Build Script - Automatická kontrola hashů
**Soubor:** `/docs/scripts-shell/build-eeo-v2.sh`

**Změna:**
- Přidána automatická kontrola synchronizace hashů po každém buildu
- Build SELŽE pokud `index.html` hash ≠ `version.json` hash
- Přidáno potvrzení před PROD deployem

**Příklad výstupu:**
```bash
🔍 Kontroluji synchronizaci build hashů...
✅ Build hashe synchronizované: c7a2487ddeef
⏰ Build time: 2026-02-01T01:39:00Z
```

### 2. VersionChecker - Správná aktualizace hashe po reloadu
**Soubor:** `/apps/eeo-v2/client/src/utils/versionChecker.js`

**Změny:**
- `reloadApp()`: Před reloadem se smaže `app_build_hash` z localStorage
- `handleUpdateDetected()`: Po detekci se uloží nový hash do localStorage
- Zajištění že po reloadu se notifikace NEZOBRAZÍ znovu

**Opravený kód:**
```javascript
reloadApp() {
  // Smaž starý hash
  localStorage.removeItem('app_build_hash');
  window.location.reload(true);
}

handleUpdateDetected(versionData) {
  this.notificationShown = true;
  // Ulož nový hash pro příští načtení
  localStorage.setItem('app_build_hash', versionData.buildHash);
  // ...
}
```

### 3. Oprava version.json
**Soubor:** `/apps/eeo-v2/client/build/version.json`

**Změna:**
- Hash opraven z `a809c7e85b795c47` → `c7a2487ddeef`
- Synchronizace s `index.html` build-hash meta tagem

## 📚 Nová dokumentace

### 1. QUICK_BUILD_REFERENCE.md
- Rychlý přehled build systému
- Jasné rozlišení: Build Hash vs Číslo Verze
- Časté chyby a řešení
- Flowchart procesu

### 2. Aktualizace BUILD.md
- Sekce "VERSION CHECKING SYSTEM"
- Automatická kontrola hashů
- Deploy workflow pro DEV i PROD
- Troubleshooting

### 3. Aktualizace VERSION_CHECKING_GUIDE.md
- Upozornění na rozdíl mezi verzí a hashem
- Praktické příklady
- Best practices
- Deploy checklist

### 4. Helper Script
**Soubor:** `/check_build_hashes.sh`
- Manuální kontrola synchronizace hashů
- Použití: `./check_build_hashes.sh [build-dir]`

## 🎯 Důležitá upozornění pro uživatele

### ⚠️ Build Hash ≠ Číslo Verze

```
Číslo verze:    2.21-DEV (manuální změna v .env)
Build hash:     c7a2487ddeef (automaticky při buildu)

Malá změna CSS → Verze zůstane 2.21-DEV
                → Build hash SE ZMĚNÍ
                → Uživatelé DOSTANOU notifikaci!
```

### ✅ Co to znamená v praxi

1. **Notifikace "nová verze" ≠ změna čísla verze**
   - Zobrazí se i při drobných změnách (CSS, texty, bugfixy)
   - I když verze zůstane např. 2.21-DEV

2. **Build hash se mění automaticky**
   - NELZE nastavit manuálně
   - Generuje se z obsahu main.*.js souboru
   - Každý build = nový hash

3. **Notifikace se zobrazí pouze jednou**
   - Po kliknutí "Obnovit" se hash aktualizuje
   - Další kontrola už najde shodu → žádná notifikace

## 🔍 Testování

### Test 1: Automatická kontrola hashů
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev --explicit
# → ✅ Build hashe synchronizované
```

### Test 2: Ověření na serveru
```bash
curl http://localhost/dev/eeo-v2/version.json
# → {"buildHash":"c7a2487ddeef",...}

grep 'build-hash' /var/www/erdms-dev/apps/eeo-v2/client/build/index.html
# → content="c7a2487ddeef"

# MUSÍ BÝT STEJNÉ! ✅
```

### Test 3: Notifikace se nezobrazuje pořád
```
1. Otevři aplikaci s hashem A
2. Deploy nový build s hashem B
3. Po 60s → Notifikace "Je dostupná nová verze"
4. Klikni "Obnovit"
5. Aplikace se reloadne s hashem B
6. Po 60s → ŽÁDNÁ notifikace ✅
```

## 🚀 Deployment Notes

### DEV Deployment
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev --explicit
# → Automatická kontrola
# → Stays in /var/www/erdms-dev/
```

### PROD Deployment
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --all --deploy
# → Automatická kontrola
# → Potvrzení před deployem
# → Deploy do /var/www/erdms-platform/
```

## 📝 Migration Guide

**Pro existující instalace:**

1. **Aktualizuj build script:**
   ```bash
   cd /var/www/erdms-dev
   git pull origin main
   ```

2. **Oprav aktuální build (pokud je problém):**
   ```bash
   cd /var/www/erdms-dev
   ./check_build_hashes.sh
   # Pokud FAIL → rebuild
   ```

3. **Test:**
   ```bash
   ./build-eeo-v2.sh --dev --explicit
   # Musí projít ✅
   ```

## 🔗 Related Issues

- Notifikace "nová verze" se zobrazovala pořád i po reloadu
- Hashe v `index.html` a `version.json` se neshodovaly
- Chyběla automatická kontrola při buildu

## ✅ Výsledek

- ✅ Build script automaticky kontroluje hashe
- ✅ Notifikace se zobrazí pouze jednou
- ✅ Po reloadu se hash správně aktualizuje
- ✅ PROD deployment má potvrzení
- ✅ Kompletní dokumentace

---

**Status:** ✅ IMPLEMENTOVÁNO  
**Tested:** ✅ ANO  
**Production Ready:** ✅ ANO
