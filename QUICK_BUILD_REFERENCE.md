# 🚀 QUICK REFERENCE - Build & Version System

## 📝 Základní Pravidla

### ✅ Build Hash vs Číslo Verze

| | Číslo Verze | Build Hash |
|---|---|---|
| **Příklad** | `2.21-DEV` | `c7a2487ddeef` |
| **Kde nastavit** | `.env` → `REACT_APP_VERSION` | Automaticky generováno |
| **Kdy změnit** | Významné změny | VŽDY při buildu |
| **Manuální změna** | ANO | NE! |
| **Detekuje novou verzi** | NE | ANO ✅ |

### ⚠️ DŮLEŽITÉ

```
Malá změna v kódu (např. CSS) → Build hash SE ZMĚNÍ
→ Uživatelé DOSTANOU notifikaci "Je dostupná nová verze"
→ I když číslo verze ZŮSTANE stejné (2.21-DEV)!
```

## 🔨 Build Commands

### DEV Build
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev
# → Automatická kontrola hashů
# → DB: EEO-OSTRA-DEV
# → URL: /dev/eeo-v2
```

### PROD Build
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --all --deploy
# → Automatická kontrola hashů
# → Potvrzení před deployem
# → DB: eeo2025
# → URL: /eeo-v2
```

## 🔍 Kontrola Hashů

### Automatická (součást build scriptu)
```bash
./build-eeo-v2.sh --dev
# → ✅ Build hashe synchronizované: c7a2487ddeef
# → ⏰ Build time: 2026-02-01T01:39:00Z
```

### Manuální (volitelná)
```bash
cd /var/www/erdms-dev
./check_build_hashes.sh
```

### Na serveru
```bash
# DEV:
curl http://localhost/dev/eeo-v2/version.json

# PROD:
curl https://erdms.zachranka.cz/eeo-v2/version.json
```

## ❌ Časté Chyby

### 1. Manuální spuštění generate-build-info.sh
```bash
# ❌ NIKDY NEDĚLEJ:
npm run build:dev:explicit
./scripts/generate-build-info.sh build  # ← Vytvoří ŠPATNÝ hash!

# ✅ SPRÁVNĚ:
npm run build:dev:explicit  # Script se volá automaticky
```

### 2. Notifikace se zobrazuje pořád
```bash
ŘEŠENÍ:
1. Zkontroluj hashe: ./check_build_hashes.sh
2. Pokud NESOUHLASÍ → rebuild:
   ./build-eeo-v2.sh --dev --explicit
3. V prohlížeči: localStorage.clear() + F5
```

### 3. Build selže - hashe nesouhlasí
```bash
❌ CRITICAL ERROR: Build hashe se NESHODUJÍ!

ŘEŠENÍ:
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build build-prod
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev
```

## 📚 Dokumentace

- [BUILD.md](BUILD.md) - Kompletní build guide
- [VERSION_CHECKING_GUIDE.md](VERSION_CHECKING_GUIDE.md) - Detailní průvodce
- [check_build_hashes.sh](check_build_hashes.sh) - Helper script

## 🎯 Flowchart

```
Změna v kódu
      ↓
npm run build (automatický post-build script)
      ↓
Generování hash z main.*.js
      ↓
Hash → index.html + version.json
      ↓
Build script ověří synchronizaci
      ↓
✅ OK → Hotovo    ❌ FAIL → Exit
      ↓
Deploy
      ↓
Uživatel má starou verzi (hash A)
      ↓
Server má novou verzi (hash B)
      ↓
Po 60s: Kontrola → hash A != hash B?
      ↓
ANO → Notifikace "Je dostupná nová verze"
      ↓
Uživatel klikne "Obnovit"
      ↓
Reload → localStorage.removeItem('app_build_hash')
      ↓
Načte novou verzi s hashem B
      ↓
Po 60s: Kontrola → hash B == hash B?
      ↓
ANO → Žádná notifikace ✅
```

---

**Poslední update:** 1. února 2026  
**Automatická kontrola hashů:** Od verze 2.21-DEV
