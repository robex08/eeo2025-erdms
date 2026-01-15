# ✅ Multi-profilový systém - Testovací scénáře

**Datum:** 15. ledna 2026  
**Status:** Ready for testing

---

## 🎯 Test 1: Personifikace - konkrétní uživatelé

### Scénář
Jan Černohorský (user_id=85) vidí objednávky:
- Holovského (user_id=52)
- Sulganové (user_id=87)

### Setup
```sql
-- Vytvořit profil
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-PERSONIFIKACE', 'VIDITELNOST', 1);

SET @profil = LAST_INSERT_ID();

-- Vytvořit vztah s personalized_users
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users, viditelnost_objednavky, aktivni
) VALUES (
  @profil, 'VIDITELNOST', 'user-user', 85,
  '[52, 87]', 1, 1
);
```

### Test query
```sql
-- Mělo by vrátit objednávky vytvořené Holovským nebo Sulganovou
SELECT o.id, o.ev_cislo, o.predmet, u.jmeno, u.prijmeni
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
WHERE o.vytvoril IN (52, 87)
ORDER BY o.dt_vytvoreno DESC
LIMIT 10;
```

### Backend test
```bash
curl -X POST http://localhost/api.eeo/order/v2/list \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_CERNOHORSKEHO",
    "username": "cernohorsky"
  }' | jq '.data[] | {id, ev_cislo, vytvoril_jmeno}'
```

### Očekávaný výsledek
- ✅ Černohorský vidí objednávky Holovského
- ✅ Černohorský vidí objednávky Sulganové
- ❌ Černohorský NEVIDÍ objednávky ostatních (pokud nemá jiná práva)

### Cleanup
```sql
DELETE FROM 25_hierarchie_vztahy WHERE profil_id = @profil;
DELETE FROM 25_hierarchie_profily WHERE id = @profil;
```

---

## 🎯 Test 2: Viditelnost podle úseku

### Scénář
Černohorský (NAMESTEK) vidí všechny objednávky z IT úseku.

### Setup
```sql
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-USEK', 'VIDITELNOST', 1);

SET @profil = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, aktivni
) VALUES (
  @profil, 'VIDITELNOST', 'user-department', 85, 3,
  'TEAM', 1, 1
);
```

### Test query
```sql
-- Všichni z IT úseku
SELECT u.id, u.jmeno, u.prijmeni, u.username, us.usek_nazev
FROM 25_uzivatele u
JOIN 25_useky us ON u.usek_id = us.id
WHERE u.usek_id = 3
ORDER BY u.prijmeni;

-- Objednávky z IT úseku
SELECT o.id, o.ev_cislo, u.jmeno, u.prijmeni, us.usek_nazev
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
JOIN 25_useky us ON u.usek_id = us.id
WHERE u.usek_id = 3
ORDER BY o.dt_vytvoreno DESC
LIMIT 20;
```

### Backend test
```bash
curl -X POST http://localhost/api.eeo/order/v2/list \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_CERNOHORSKEHO",
    "username": "cernohorsky",
    "filters": {}
  }' | jq '.data[] | {ev_cislo, vytvoril_usek}'
```

### Očekávaný výsledek
- ✅ Černohorský vidí objednávky VŠECH z IT úseku
- ✅ Počet objednávek odpovídá COUNT z test query
- ❌ Nevidí objednávky z jiných úseků (HR, Marketing, atd.)

---

## 🎯 Test 3: Viditelnost podle lokality

### Scénář
Vedoucí pobočky vidí objednávky z Kladna a Benešova.

### Setup
```sql
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-LOKALITY', 'VIDITELNOST', 1);

SET @profil = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  rozsirene_lokality, scope, viditelnost_objednavky, aktivni
) VALUES (
  @profil, 'VIDITELNOST', 'user-location', 100,
  '[5, 8]', 'LOCATION', 1, 1
);
```

### Test query
```sql
-- Uživatelé z Kladna a Benešova
SELECT u.id, u.jmeno, u.prijmeni, l.nazev AS lokalita
FROM 25_uzivatele u
JOIN 25_lokality l ON u.lokalita_id = l.id
WHERE u.lokalita_id IN (5, 8)
ORDER BY l.nazev, u.prijmeni;

-- Objednávky z těchto lokalit
SELECT o.id, o.ev_cislo, u.jmeno, u.prijmeni, l.nazev AS lokalita
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
JOIN 25_lokality l ON u.lokalita_id = l.id
WHERE u.lokalita_id IN (5, 8)
ORDER BY o.dt_vytvoreno DESC
LIMIT 20;
```

### Očekávaný výsledek
- ✅ Vedoucí vidí objednávky z Kladna
- ✅ Vedoucí vidí objednávky z Benešova
- ❌ Nevidí objednávky z jiných lokalit (Praha, Brno, atd.)

---

## 🎯 Test 4: Kombinace více profilů

### Scénář
Černohorský má 2 aktivní profily:
1. VIDITELNOST-NAMESTEK (IT úsek)
2. VIDITELNOST-PERSONIFIKACE (Holovský, Sulganová)

### Setup
```sql
-- Profil 1: IT úsek
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-COMBO-1', 'VIDITELNOST', 1);
SET @profil1 = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, aktivni
) VALUES (
  @profil1, 'VIDITELNOST', 'user-department', 85, 3,
  'TEAM', 1, 1
);

-- Profil 2: Personifikace
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-COMBO-2', 'VIDITELNOST', 1);
SET @profil2 = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users, viditelnost_objednavky, aktivni
) VALUES (
  @profil2, 'VIDITELNOST', 'user-user', 85,
  '[52, 87]', 1, 1
);
```

### Test query
```sql
-- Mělo by vrátit UNION obou podmínek
SELECT DISTINCT o.id, o.ev_cislo, u.jmeno, u.prijmeni, 
  us.usek_nazev,
  CASE 
    WHEN u.usek_id = 3 THEN 'IT úsek'
    WHEN u.id IN (52, 87) THEN 'Personifikace'
    ELSE 'Jiné'
  END AS zdroj
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE u.usek_id = 3 OR u.id IN (52, 87)
ORDER BY o.dt_vytvoreno DESC;
```

### Očekávaný výsledek
- ✅ Černohorský vidí objednávky z IT úseku
- ✅ + vidí objednávky Holovského
- ✅ + vidí objednávky Sulganové
- ✅ Deduplikace (pokud Holovský je z IT, nevidí jeho obj. 2x)

---

## 🎯 Test 5: Multi-profil NOTIFIKACE + VIDITELNOST

### Scénář
Černohorský má:
- Profil NOTIFIKACE (dostává notifikace od Holovského)
- Profil VIDITELNOST (vidí IT úsek)

### Setup
```sql
-- Profil 1: Notifikace
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-NOTIF', 'NOTIFIKACE', 1);
SET @profil_notif = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, user_id_2,
  notifikace_inapp, notifikace_email, aktivni
) VALUES (
  @profil_notif, 'NOTIFIKACE', 'user-user', 85, 52,
  1, 1, 1
);

-- Profil 2: Viditelnost
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-VIS', 'VIDITELNOST', 1);
SET @profil_vis = LAST_INSERT_ID();

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, aktivni
) VALUES (
  @profil_vis, 'VIDITELNOST', 'user-department', 85, 3,
  'TEAM', 1, 1
);
```

### Test - Notifikace
```sql
-- Vztahy pro notifikace
SELECT v.id, v.profil_type, v.user_id_1, v.user_id_2,
  v.notifikace_inapp, v.notifikace_email
FROM 25_hierarchie_vztahy v
WHERE v.user_id_1 = 85
  AND v.profil_type IN ('NOTIFIKACE', 'ALL')
  AND v.aktivni = 1;
```

### Test - Viditelnost
```sql
-- Vztahy pro viditelnost
SELECT v.id, v.profil_type, v.usek_id, v.scope,
  v.viditelnost_objednavky
FROM 25_hierarchie_vztahy v
WHERE v.user_id_1 = 85
  AND v.profil_type IN ('VIDITELNOST', 'PRAVA', 'ALL')
  AND v.aktivni = 1;
```

### Očekávaný výsledek
- ✅ Černohorský dostává notifikace od Holovského (profil_type=NOTIFIKACE)
- ✅ Černohorský vidí objednávky IT úseku (profil_type=VIDITELNOST)
- ✅ Oba profily jsou aktivní současně
- ✅ Profily se NEKOMBINUJÍ (notifikace ≠ viditelnost)

---

## 🎯 Test 6: Performance test

### Scénář
Test rychlosti dotazu pro uživatele s mnoha vztahy.

### Setup
```sql
-- Vytvořit profil s 5 vztahy
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('TEST-PERF', 'VIDITELNOST', 1);
SET @profil = LAST_INSERT_ID();

-- Vztah 1: Personifikace (3 uživatelé)
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users, viditelnost_objednavky, aktivni
) VALUES (@profil, 'VIDITELNOST', 'user-user', 85, '[52,87,91]', 1, 1);

-- Vztah 2: IT úsek
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, aktivni
) VALUES (@profil, 'VIDITELNOST', 'user-department', 85, 3, 'TEAM', 1, 1);

-- Vztah 3: HR úsek
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, aktivni
) VALUES (@profil, 'VIDITELNOST', 'user-department', 85, 5, 'TEAM', 1, 1);

-- Vztah 4: Kladno lokalita
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  rozsirene_lokality, scope, viditelnost_objednavky, aktivni
) VALUES (@profil, 'VIDITELNOST', 'user-location', 85, '[5]', 'LOCATION', 1, 1);

-- Vztah 5: Benešov lokalita
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  rozsirene_lokality, scope, viditelnost_objednavky, aktivni
) VALUES (@profil, 'VIDITELNOST', 'user-location', 85, '[8]', 'LOCATION', 1, 1);
```

### Performance test
```sql
-- Zapnout profiling
SET profiling = 1;

-- Test dotaz (simulace getVisibleOrderIdsForUser)
SELECT DISTINCT o.id
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
WHERE (
  u.id IN (52, 87, 91)  -- Personifikace
  OR u.usek_id IN (3, 5)  -- IT + HR
  OR u.lokalita_id IN (5, 8)  -- Kladno + Benešov
);

-- Zobrazit čas
SHOW PROFILES;
```

### Očekávaný výsledek
- ✅ Dotaz by měl trvat < 100ms (pro <10k objednávek)
- ✅ EXPLAIN ukazuje použití indexů
- ⚠️ Pokud > 100ms → optimalizovat indexy

### EXPLAIN output
```sql
EXPLAIN SELECT DISTINCT o.id
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
WHERE (
  u.id IN (52, 87, 91)
  OR u.usek_id IN (3, 5)
  OR u.lokalita_id IN (5, 8)
);
```

---

## 🎯 Test 7: Edge cases

### Test 7a: Žádný aktivní profil
```sql
UPDATE 25_hierarchie_profily SET aktivni = 0;

-- Backend by měl vrátit prázdné pole
-- Uživatel vidí pouze své objednávky (standardní práva)
```

### Test 7b: Prázdný personalized_users
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users, viditelnost_objednavky, aktivni
) VALUES (1, 'VIDITELNOST', 'user-user', 85, '[]', 1, 1);

-- Mělo by být ignorováno (prázdné pole)
```

### Test 7c: NULL hodnoty
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users, rozsirene_lokality, rozsirene_useky,
  viditelnost_objednavky, aktivni
) VALUES (1, 'VIDITELNOST', 'user-user', 85, NULL, NULL, NULL, 1, 1);

-- Mělo by být ignorováno
```

### Test 7d: Neplatné JSON
```sql
UPDATE 25_hierarchie_vztahy 
SET personalized_users = 'invalid json'
WHERE id = 123;

-- Backend by měl gracefully failovat (skip tento vztah)
```

---

## ✅ Test Checklist

### Před testováním
- [ ] Zálohovat databázi
- [ ] Ověřit že migrace proběhly
- [ ] Mít připravené user IDs pro test

### Funkční testy
- [ ] Test 1: Personifikace
- [ ] Test 2: Viditelnost podle úseku
- [ ] Test 3: Viditelnost podle lokality
- [ ] Test 4: Kombinace více profilů
- [ ] Test 5: Multi-profil NOTIFIKACE + VIDITELNOST
- [ ] Test 6: Performance test
- [ ] Test 7: Edge cases

### Backend API testy
- [ ] `/api/order/v2/list` vrací správné objednávky
- [ ] `/api/order/v2/get/:id` kontroluje přístup
- [ ] `/api/hierarchy/save` ukládá nová pole
- [ ] `/api/hierarchy/structure` načítá nová pole

### Frontend testy
- [ ] Editor hierarchie zobrazuje nová pole
- [ ] Ukládání funguje
- [ ] Filtrování profilů podle typu funguje
- [ ] UserMultiSelect funguje

### Performance testy
- [ ] Dotaz < 100ms pro < 10k objednávek
- [ ] Cache funguje (pokud implementováno)
- [ ] Indexy jsou použity (EXPLAIN)

---

## 📞 Kontakt

**Autor:** Robert Novák  
**Datum:** 15. ledna 2026
