# 📦 Multi-profilový systém - Seznam vytvořených souborů

**Datum:** 15. ledna 2026  
**Status:** ✅ Vše připraveno k implementaci

---

## 📚 Dokumentace

### Hlavní dokumenty (docs/hierarchy/)

| Soubor | Popis | Velikost |
|--------|-------|----------|
| **README.md** | 📖 Přehled celého systému, začni zde | Hlavní |
| **MULTI_PROFILE_VISIBILITY_SYSTEM_PLAN.md** | 📋 Kompletní plán & architektura | ~900 řádků |
| **MULTI_PROFILE_QUICKSTART_GUIDE.md** | 🚀 Krok-za-krokem implementační guide | ~500 řádků |
| **MULTI_PROFILE_TESTING_SCENARIOS.md** | 🧪 7 testovacích scénářů | ~400 řádků |

---

## 🗄️ Databázové migrace (docs/database-migrations/)

| Soubor | Účel | Status |
|--------|------|--------|
| **ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql** | Přidá `typ_profilu` do profilů | ✅ Ready |
| **ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql** | Přidá `profil_type` a `personalized_users` | ✅ Ready |
| **INSERT_TEST_DATA_MULTI_PROFILE.sql** | Vytvoří testovací data | ✅ Ready |

---

## 💻 Backend (apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/)

| Soubor | Funkce | Řádky | Status |
|--------|--------|-------|--------|
| **hierarchyVisibilityFilters.php** | Hlavní filtrovací logika | ~400 | ✅ Ready |

**Klíčové funkce:**
- `getVisibleOrderIdsForUser($userId, $pdo)` - hlavní funkce
- `getOrderIdsByCreators($userIds, $pdo)` - personifikace
- `getOrderIdsByDepartments($departmentIds, $pdo)` - úseky
- `getOrderIdsByLocations($locationIds, $pdo)` - lokality
- `canUserViewOrder($userId, $orderId, $pdo)` - kontrola přístupu

---

## 📊 Co přesně řeší

### Bod 1: Multi-profilový systém ✅
```
PROF-NOTIF-MAIN (typ_profilu = NOTIFIKACE)
VIDITELNOST-NAMESTEK (typ_profilu = VIDITELNOST)
VIDITELNOST-PRIKAZCE (typ_profilu = VIDITELNOST)

→ Všechny 3 profily mohou být aktivní současně
```

### Bod 2: Viditelnost podle úseků ✅
```sql
-- NAMESTEK vidí celý IT úsek + další úseky
usek_id = 3  -- IT úsek
rozsirene_useky = '[5, 7]'  -- HR, Marketing
```

### Bod 3: Viditelnost podle lokalit ✅
```sql
-- Vidět objednávky z Kladna a Benešova
rozsirene_lokality = '[5, 8]'  -- Kladno, Benešov
```

### Bod 4: Personifikace ✅
```sql
-- NAMESTEK vidí objednávky Holovského + Sulganové
personalized_users = '[52, 87]'  -- Holovský, Sulganová
```

---

## 🎯 Use Cases pokryté

### Use Case 1: NAMESTEK
✅ Vidí celý IT úsek  
✅ Vidí objednávky Holovského (personifikace)  
✅ Vidí objednávky Sulganové (personifikace)

**SQL:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, user_id_1, usek_id, personalized_users,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 85, 3, '[52, 87]', 'TEAM', 1
);
```

### Use Case 2: Vedoucí pobočky
✅ Vidí objednávky z Kladna  
✅ Vidí objednávky z Benešova

**SQL:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, user_id_1, rozsirene_lokality,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 100, '[5, 8]', 'LOCATION', 1
);
```

### Use Case 3: Zaměstnanec
✅ Vidí objednávky Kvapilové  
✅ Vidí objednávky Lungerové  
✅ Vidí objednávky Wlachové

**SQL:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, user_id_1, personalized_users,
  viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 91, '[45, 67, 89]', 1
);
```

---

## ⏱️ Časový plán implementace

| Fáze | Čas | Kdy | Co |
|------|-----|-----|-----|
| **Fáze 1: Databáze** | 2-3h | Sobota dopoledne | Migrace, testovací data |
| **Fáze 2: Backend** | 4-5h | Sobota odpoledne | PHP funkce, API integrace |
| **Fáze 3: Frontend** | 6-8h | Neděle | React komponenty, editor |
| **Fáze 4: Testing** | 2h | Neděle večer | E2E testy, dokumentace |
| **CELKEM** | **14-18h** | **Víkend** | **Kompletní implementace** |

---

## ✅ Checklist implementace

### Příprava (15 minut)
- [ ] Backup databáze
- [ ] Git branch `feature/multi-profile-system`
- [ ] Přečíst dokumentaci

### Databáze (2-3 hodiny)
- [ ] Spustit ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
- [ ] Spustit ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql
- [ ] Spustit INSERT_TEST_DATA_MULTI_PROFILE.sql
- [ ] Ověřit SHOW CREATE TABLE
- [ ] Otestovat SELECT dotazy

### Backend (4-5 hodin)
- [ ] Vytvořit hierarchyVisibilityFilters.php
- [ ] Rozšířit hierarchyHandlers_v2.php
- [ ] Integrovat do orderV2Endpoints.php
- [ ] Testovat API endpointy (curl)

### Frontend (6-8 hodin)
- [ ] Vytvořit EdgeConfigPanel.jsx
- [ ] Vytvořit UserMultiSelect.jsx
- [ ] Upravit HierarchyEditorPage.jsx
- [ ] Testovat v prohlížeči

### Testing (2 hodiny)
- [ ] Test 1: Personifikace
- [ ] Test 2: Úseky
- [ ] Test 3: Lokality
- [ ] Test 4: Kombinace profilů
- [ ] Test 5: Multi-profil
- [ ] Test 6: Performance
- [ ] Test 7: Edge cases

### Dokumentace (1 hodina)
- [ ] Aktualizovat README
- [ ] Vytvořit release notes
- [ ] Commit & Push

---

## 🚀 Jak začít

### Krok 1: Přečti dokumentaci
```bash
cd /var/www/erdms-dev/docs/hierarchy
cat README.md
cat MULTI_PROFILE_QUICKSTART_GUIDE.md
```

### Krok 2: Backup databáze
```bash
cd /var/www/erdms-dev
mkdir -p docs/database-backups/multi-profile-$(date +%Y%m%d)
mysqldump -u root -p eeo2025 > docs/database-backups/multi-profile-$(date +%Y%m%d)/backup.sql
```

### Krok 3: Spustit migrace
```bash
cd /var/www/erdms-dev/docs/database-migrations
mysql -u root -p eeo2025 < ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
mysql -u root -p eeo2025 < ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql
mysql -u root -p eeo2025 < INSERT_TEST_DATA_MULTI_PROFILE.sql
```

### Krok 4: Vytvořit backend soubor
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
# Soubor hierarchyVisibilityFilters.php je již vytvořen v projektu
ls -la hierarchyVisibilityFilters.php
```

### Krok 5: Testovat
```bash
cd /var/www/erdms-dev/docs/hierarchy
cat MULTI_PROFILE_TESTING_SCENARIOS.md
```

---

## 📁 Struktura souborů

```
/var/www/erdms-dev/
├── docs/
│   ├── hierarchy/
│   │   ├── README.md ⭐ ZAČNI TADY
│   │   ├── MULTI_PROFILE_VISIBILITY_SYSTEM_PLAN.md
│   │   ├── MULTI_PROFILE_QUICKSTART_GUIDE.md
│   │   ├── MULTI_PROFILE_TESTING_SCENARIOS.md
│   │   └── INDEX.md (tento soubor)
│   │
│   └── database-migrations/
│       ├── ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
│       ├── ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql
│       └── INSERT_TEST_DATA_MULTI_PROFILE.sql
│
└── apps/
    └── eeo-v2/
        └── api-legacy/
            └── api.eeo/
                └── v2025.03_25/
                    └── lib/
                        └── hierarchyVisibilityFilters.php ⭐ NOVÝ
```

---

## 🎯 Klíčové změny

### Databáze
| Tabulka | Změna | Typ |
|---------|-------|-----|
| `25_hierarchie_profily` | `+ typ_profilu ENUM(...)` | Nový sloupec |
| `25_hierarchie_vztahy` | `+ profil_type ENUM(...)` | Nový sloupec |
| `25_hierarchie_vztahy` | `+ personalized_users JSON` | Nový sloupec |

### Backend
| Soubor | Změna | Status |
|--------|-------|--------|
| `hierarchyVisibilityFilters.php` | Nový soubor | ✅ Created |
| `hierarchyHandlers_v2.php` | Rozšíření | 🔄 To update |
| `orderV2Endpoints.php` | Integrace | 🔄 To update |

### Frontend
| Komponenta | Změna | Status |
|------------|-------|--------|
| `EdgeConfigPanel.jsx` | Nová komponenta | 🔄 To create |
| `UserMultiSelect.jsx` | Nová komponenta | 🔄 To create |
| `HierarchyEditorPage.jsx` | Rozšíření | 🔄 To update |

---

## 📊 Statistiky

| Metriky | Hodnota |
|---------|---------|
| **Dokumentační soubory** | 4 hlavní + 1 index |
| **SQL migrace** | 3 soubory |
| **Backend soubory** | 1 nový + 2 úpravy |
| **Frontend komponenty** | 2 nové + 1 úprava |
| **Řádky kódu (celkem)** | ~2000+ |
| **Řádky dokumentace** | ~2500+ |
| **Testovací scénáře** | 7 hlavních |
| **Odhadovaný čas** | 14-18 hodin |

---

## 🎉 Závěr

✅ **Kompletní dokumentace** připravena  
✅ **SQL migrace** ready to run  
✅ **Backend kód** implementován  
✅ **Testovací scénáře** definovány  
✅ **Časový plán** stanoven

💪 **Můžeme začít implementovat o víkendu!**

---

## 📞 Kontakt

**Autor:** Robert Novák (robex08)  
**Datum:** 15. ledna 2026  
**Git branch:** `feature/multi-profile-system` (doporučeno)

**Pro dotazy:**
- Přečti [README.md](README.md)
- Projdi [QUICKSTART_GUIDE.md](MULTI_PROFILE_QUICKSTART_GUIDE.md)
- Testuj podle [TESTING_SCENARIOS.md](MULTI_PROFILE_TESTING_SCENARIOS.md)
