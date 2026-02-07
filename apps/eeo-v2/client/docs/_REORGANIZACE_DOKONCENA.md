# 📁 Struktura klienta - Dokončená organizace

**Datum:** 19. prosince 2025  
**Status:** ✅ Reorganizace dokončena

---

## 🎯 Co bylo provedeno

### 1. **Root adresář (/apps/eeo-v2/client/)**

**PŘED:**
```
.
├── REFACTOR_PLAN.md  ← jediný volný MD soubor
├── config-overrides.js
├── maintenance.html
├── package.json
├── package-lock.json
└── ... (složky)
```

**PO:**
```
.
├── config-overrides.js     ← ponecháno (konfigurační)
├── maintenance.html         ← ponecháno (provozní)
├── package.json             ← ponecháno (závislosti)
├── package-lock.json        ← ponecháno (lock file)
└── ... (složky)
```

✅ **Výsledek:** Root je čistý - pouze konfigurační a provozní soubory

---

### 2. **Dokumentace (/docs/)**

#### **Nově vytvořené strukturované složky:**

```
docs/
├── _INDEX.md                       ← 📋 HLAVNÍ PŘEHLED (nový)
├── backend-examples/               ← 🆕 PHP backend příklady
│   ├── BACKEND-CASHBOOK-CHANGE-LOCK-STATUS-API.php
│   ├── BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php
│   └── BACKEND-CRYPTO-RATES-PROXY-API.php
├── database-scripts/               ← 🆕 SQL skripty a schémata
│   ├── DB-NOTIFICATION-TEMPLATE-ALARM-TODOS.sql
│   ├── DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql
│   ├── NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql
│   ├── SMLOUVY-DB-SCHEMA-MYSQL55.sql
│   └── SQL-ALTER-LP-TRI-TYPY.sql
├── python-scripts/                 ← 🆕 Python utility skripty
│   └── BACKEND-TODO-ALARM-WORKER-EXAMPLE.py
├── archived-old/                   ← 🆕 Archivované dokumenty
│   └── REFACTOR_PLAN.md (přesunut z rootu)
├── examples/                       ← Rozšířeno o JS soubory
│   ├── BACKGROUND-TASKS-INTEGRATION.js
│   ├── EXAMPLE-ORDERS-LIST-YEAR-PERIOD.js
│   ├── TODO-ALARM-TESTING.js
│   ├── EXAMPLE-TOOLS-BAR-COMPONENT.jsx
│   └── RACE-CONDITION-FIX-EXAMPLE.jsx
├── api/                            ← Existující API docs
├── features/                       ← Existující dokumentace features
├── fixes/                          ← Existující dokumentace bugfixů
├── implementation/                 ← Existující implementační docs
├── import/                         ← Existující import dokumenty
├── notebooks/                      ← Existující notebooky
├── testing/                        ← Existující testovací dokumentace
├── usermanagement/                 ← Existující user management
└── 450+ MD souborů                 ← Hlavní dokumentace (ponecháno)
```

---

### 3. **Scripts (/scripts/)**

**Existující struktura (neměněna):**
```
scripts/
├── README.md
├── check-notification-templates.js
├── clean-debug-logs.py
├── postbuild.js
├── prebuild.js
├── cleanup/
├── debug/
├── python/
├── shell/
├── sql/
│   ├── insert_strediska_2025-11-20.sql
│   └── migrate_limitovane_prisliby.sql
└── test/
```

---

## 📊 Statistika reorganizace

| Kategorie | Počet souborů | Akce |
|-----------|--------------|------|
| Root MD soubory | 1 | ✅ Přesunut do docs/archived-old/ |
| PHP backend příklady | 3 | ✅ Přesunuty do docs/backend-examples/ |
| SQL databázové skripty | 5 | ✅ Přesunuty do docs/database-scripts/ |
| Python skripty | 1 | ✅ Přesunut do docs/python-scripts/ |
| JavaScript příklady | 3 | ✅ Přesunuty do docs/examples/ |
| **Celkem přesunuto** | **13** | **✅ 100% dokončeno** |

---

## 🗂️ Kde co najít

### 🔧 **Backend příklady a referenční kód**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/docs/backend-examples/
ls -1 *.php
```

### 💾 **SQL skripty a database schémata**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/docs/database-scripts/
ls -1 *.sql
```

### 🐍 **Python utility skripty**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/docs/python-scripts/
ls -1 *.py
```

### 📝 **JavaScript/JSX příklady**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/docs/examples/
ls -1 *.js *.jsx
```

### 🗄️ **Archivované dokumenty**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/docs/archived-old/
```

---

## 📚 Hlavní dokumenty

### **Přehledový index:**
📋 `/docs/_INDEX.md` - Kompletní přehled struktury a dokumentace

### **Root dokumentace:**
- 📖 `/docs/README.md` - Hlavní README projektu
- ✅ `/docs/TODO.md` - Seznam úkolů

---

## ⚠️ Důležité poznámky

### **PHP soubory v backend-examples/**
- ❗ **Nejsou součástí běžícího kódu**
- ✅ Pouze referenční příklady pro backend vývojáře
- 📝 Ukazují strukturu API endpointů

### **SQL soubory v database-scripts/**
- ❗ **Nejsou automaticky spouštěny**
- ✅ Referenční schémata a šablony
- 💾 Skutečné migrace jsou v `/sql-migrations/`

### **Python skripty**
- 🔧 Utility pro maintenance
- 🧪 Testing pomocníci
- ⚙️ Background job příklady

---

## 🎨 Vizuální struktura

```
client/
├── 📄 config-overrides.js
├── 🏠 maintenance.html
├── 📦 package.json
├── 📦 package-lock.json
│
├── 📚 docs/
│   ├── 📋 _INDEX.md               ← ZAČNI TADY!
│   ├── 🔧 backend-examples/       ← PHP příklady
│   ├── 💾 database-scripts/       ← SQL skripty
│   ├── 🐍 python-scripts/         ← Python utility
│   ├── 📝 examples/               ← JS/JSX příklady
│   ├── 🗄️ archived-old/           ← Archiv
│   └── 450+ MD dokumentů
│
├── 🛠️ scripts/                    ← Build skripty
│   ├── cleanup/
│   ├── debug/
│   ├── python/
│   ├── shell/
│   ├── sql/
│   └── test/
│
├── 📂 src/                         ← Zdrojový kód
├── 🔌 plugins/                     ← Pluginy
├── 🌐 public/                      ← Statické assety
├── 💾 sql/                         ← SQL produkční
├── 🔄 sql-migrations/              ← Databázové migrace
└── 📁 tmp/                         ← Dočasné soubory
```

---

## ✅ Checklist dokončení

- [x] Root adresář vyčištěn od volných MD souborů
- [x] PHP soubory strukturovány v backend-examples/
- [x] SQL soubory strukturovány v database-scripts/
- [x] Python skripty strukturovány v python-scripts/
- [x] JavaScript příklady přesunuty do examples/
- [x] Vytvořen hlavní index (_INDEX.md)
- [x] Vytvořena složka archived-old/
- [x] Dokumentace aktualizována

---

## 🚀 Příště když budeš hledat:

1. **Backend API příklad?** → `docs/backend-examples/`
2. **SQL schéma nebo migrace?** → `docs/database-scripts/`
3. **Python utility?** → `docs/python-scripts/`
4. **JavaScript příklad?** → `docs/examples/`
5. **Starý dokument?** → `docs/archived-old/`
6. **Obecnou dokumentaci?** → `docs/` (450+ MD souborů)

---

**🎉 Reorganizace úspěšně dokončena!**

*Všechny soubory jsou nyní logicky strukturované a snadno k nalezení.*
