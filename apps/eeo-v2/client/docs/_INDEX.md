# 📚 Dokumentace - Struktura a organizace

**Datum poslední aktualizace:** 19. prosince 2025

## 📁 Struktura složek

### `/backend-examples/` - PHP Backend příklady
Obsahuje ukázkové PHP soubory pro backend API implementace:
- `BACKEND-CASHBOOK-CHANGE-LOCK-STATUS-API.php` - API pro změnu stavu zámku pokladní knihy
- `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php` - API pro správu přiřazení pokladen
- `BACKEND-CRYPTO-RATES-PROXY-API.php` - Proxy API pro kurzovní lístky kryptoměn

### `/database-scripts/` - SQL Skripty
Databázové migrace a šablony:
- `DB-NOTIFICATION-TEMPLATE-*.sql` - Notifikační šablony
- `NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql` - Struktura notifikačních šablon
- `SMLOUVY-DB-SCHEMA-MYSQL55.sql` - Schema pro smlouvy (MySQL 5.5 kompatibilní)
- `SQL-ALTER-LP-TRI-TYPY.sql` - Migrace limitovaných příslibů

### `/python-scripts/` - Python Skripty
- `BACKEND-TODO-ALARM-WORKER-EXAMPLE.py` - Příklad workera pro TODO alarmy

### `/examples/` - JavaScript Příklady
Frontend kód příklady a ukázky:
- `BACKGROUND-TASKS-INTEGRATION.js` - Integrace background tasků
- `EXAMPLE-ORDERS-LIST-YEAR-PERIOD.js` - Příklad filtrace objednávek
- `TODO-ALARM-TESTING.js` - Test TODO alarmů
- `EXAMPLE-TOOLS-BAR-COMPONENT.jsx` - Ukázka toolbar komponenty
- `RACE-CONDITION-FIX-EXAMPLE.jsx` - Příklad řešení race conditions

### `/archived-old/` - Archivované dokumenty
Staré dokumenty, které již nejsou aktuální:
- `REFACTOR_PLAN.md` - Původní refaktoring plán (z rootu projektu)

### `/api/` - API Dokumentace
Dokumentace API endpointů a specifikace

### `/features/` - Dokumentace funkcí
Dokumentace jednotlivých features a modulů systému

### `/fixes/` - Dokumentace oprav
Historie bugfixů a jejich řešení

### `/implementation/` - Implementační dokumenty
Návody na implementaci nových funkcí

### `/import/` - Import dokumenty
Dokumenty týkající se importu dat

### `/notebooks/` - Jupyter Notebooky
Analytické notebooky (pokud existují)

### `/testing/` - Testovací dokumentace
Testy, test plány a QA dokumenty

### `/usermanagement/` - User Management
Dokumentace správy uživatelů a oprávnění

---

## 📝 Hlavní dokumenty v rootu `/docs/`

### 🔴 Kritické dokumenty
- `README.md` - Hlavní dokumentace projektu
- `TODO.md` - Seznam úkolů

### 📊 Backend dokumentace
- `BACKEND-*.md` - Backend specifikace a požadavky (450+ souborů)
  - Cashbook (pokladní kniha)
  - Notifikace
  - API specifikace
  - Oprávnění a role
  - TODO alarmy

### 🎨 Frontend dokumentace
- Cache systém
- Komponenty
- Workflow
- Performance optimalizace

### 🗄️ Databáze
- Schema dokumenty
- Migrace
- Analýzy

---

## 🔍 Jak najít dokumentaci

### Podle tématu:

**Pokladní kniha (Cashbook):**
```bash
ls -1 docs/CASHBOOK-*.md | head -10
```

**Notifikace:**
```bash
ls -1 docs/*NOTIFICATION*.md | head -10
```

**Backend API:**
```bash
ls -1 docs/BACKEND-*.md | head -20
```

**Cache systém:**
```bash
ls -1 docs/CACHE-*.md
```

**TODO Alarmy:**
```bash
ls -1 docs/TODO-ALARM-*.md
```

---

## 📦 Soubory mimo docs/

### `/scripts/` - Build a pomocné skripty
- `prebuild.js`, `postbuild.js` - Build hooky
- `cleanup/` - Cleanup skripty
- `debug/` - Debug utility
- `python/` - Python utility
- `shell/` - Shell skripty
- `sql/` - SQL migrace mimo docs
- `test/` - Testovací skripty

### `/sql/` - Hlavní SQL složka
Produkční SQL skripty a migrace

### `/sql-migrations/` - Databázové migrace
Verzované migrace databáze

---

## 🎯 Quick Links

- 🚀 **Quick Start:** `docs/README.md`
- 📖 **API Dokumentace:** `docs/api/`
- 🐛 **Bug Fixes:** `docs/fixes/`
- 🧪 **Testing:** `docs/testing/`
- 👥 **User Management:** `docs/usermanagement/`

---

## 📝 Poznámky

- Většina MD souborů obsahuje technickou dokumentaci, specifikace a implementační návody
- PHP soubory v `backend-examples/` jsou **POUZE PŘÍKLADY** - nejsou součástí běžícího kódu
- SQL soubory v `database-scripts/` jsou referenční - skutečné migrace jsou v `/sql-migrations/`
- Python skripty jsou utility pro maintenance a testing

---

**Autor:** AI Assistant  
**Projekt:** ERDMS EEO v2  
**Repository:** eeo2025-erdms
