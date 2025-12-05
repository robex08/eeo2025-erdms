# Testing Guide - Správa práv rolí

**Datum:** 17. 11. 2025  
**Status:** ✅ PŘIPRAVENO K TESTOVÁNÍ

## Prerekvizity

1. ✅ Backend endpointy implementované
2. ✅ Frontend kód připravený
3. ⏳ SQL oprava duplicit (doporučeno před testováním)

## Testovací scénáře

### 🧪 Test 1: Přidání práva k roli

1. **Otevři aplikaci:** http://localhost:3000 (nebo produkční URL)
2. **Přejdi do:** Číselníky → Role
3. **Vyber roli:** např. "Administrátor"
4. **Klikni:** Na ikonu štítu (Správa práv) v Actions sloupci
5. **V dialogu "Správa práv role":**
   - Vpravo vidíš "Dostupná práva"
   - Vlevo vidíš "Přiřazená práva"
6. **Přidej právo:**
   - Najdi nějaké právo v "Dostupných právech"
   - Klikni "➕ Přidat"
7. **Očekávaný výsledek:**
   - ✅ Toast zpráva: "Právo bylo přidáno k roli"
   - ✅ Právo se přesune z "Dostupných" do "Přiřazených"
   - ✅ Počty se aktualizují

**Kontrola v konzoli:**
```
✅ POST https://eeo.zachranka.cz/api.eeo/ciselniky/role/assign-pravo 200
✅ Response: {"status": "success", "message": "Právo bylo přiřazeno k roli"}
```

**Kontrola v DB:**
```sql
SELECT * FROM 25_role_prava 
WHERE role_id = 1 AND pravo_id = 35 AND user_id = -1;
-- Měl by se objevit nový záznam
```

---

### 🧪 Test 2: Ochrana proti duplicitám

1. **Opakuj Test 1** - zkus přidat **stejné právo** znovu
2. **Očekávaný výsledek:**
   - ✅ Toast chyba: "Právo již je přiřazeno k této roli"
   - ✅ HTTP 200 ale status: "error"
   - ✅ Data se nezmění

**Kontrola v konzoli:**
```
✅ POST https://eeo.zachranka.cz/api.eeo/ciselniky/role/assign-pravo 200
✅ Response: {"status": "error", "message": "Právo již je přiřazeno k této roli"}
```

---

### 🧪 Test 3: Odebrání práva z role

1. **V dialogu "Správa práv role":**
   - Najdi nějaké právo v "Přiřazených právech"
   - Klikni "🗑️ Odebrat"
2. **Očekávaný výsledek:**
   - ✅ Toast zpráva: "Právo bylo odebráno z role"
   - ✅ Právo se přesune z "Přiřazených" do "Dostupných"
   - ✅ Počty se aktualizují

**Kontrola v konzoli:**
```
✅ POST https://eeo.zachranka.cz/api.eeo/ciselniky/role/remove-pravo 200
✅ Response: {"status": "success", "message": "Právo bylo odebráno z role"}
```

**Kontrola v DB:**
```sql
SELECT * FROM 25_role_prava 
WHERE role_id = 1 AND pravo_id = 35 AND user_id = -1;
-- Záznam by měl zmizet
```

---

### 🧪 Test 4: Refresh a perzistence

1. **Přidej nějaké právo k roli**
2. **Zavři dialog** (klikni X nebo mimo dialog)
3. **Otevři dialog znovu** (klikni na štít)
4. **Očekávaný výsledek:**
   - ✅ Přidané právo je stále v "Přiřazených právech"
   - ✅ Data jsou správně načtená z BE

---

### 🧪 Test 5: Vyhledávání v právech

1. **Otevři dialog "Správa práv role"**
2. **V sekci "Přiřazená práva":**
   - Zadej do vyhledávání: "ORDER"
   - ✅ Zobrazí se pouze práva obsahující "ORDER"
3. **V sekci "Dostupná práva":**
   - Zadej do vyhledávání: "CASH"
   - ✅ Zobrazí se pouze práva obsahující "CASH"

---

### 🧪 Test 6: Různé role

1. **Otestuj s různými rolemi:**
   - Administrátor
   - Vedoucí
   - Účetní
   - atd.
2. **Ověř že:**
   - ✅ Každá role má svoje vlastní práva
   - ✅ Změny v jedné roli neovlivní jinou roli

---

### 🧪 Test 7: Deduplikace (po opravě DB)

1. **PŘED spuštěním SQL opravy:**
   ```sql
   SELECT role_id, pravo_id, COUNT(*) as pocet
   FROM 25_role_prava
   WHERE user_id = -1
   GROUP BY role_id, pravo_id
   HAVING pocet > 1;
   ```
   - Poznamenej si počet duplicit

2. **Spusť SQL opravu** (`fix_role_prava_duplicates.sql`)

3. **PO opravě:**
   ```sql
   -- Mělo by vrátit 0 záznamů
   SELECT role_id, pravo_id, COUNT(*) as pocet
   FROM 25_role_prava
   WHERE user_id = -1
   GROUP BY role_id, pravo_id
   HAVING pocet > 1;
   ```

4. **V aplikaci:**
   - Refresh stránku (F5)
   - Otevři "Správa práv" nějaké role
   - ✅ Žádné duplicitní práva v seznamu

**Kontrola konzole:**
```
⚠️ Deduplikace práv pro roli: Administrátor Původně: 26 Po deduplikaci: 25
```
- Po SQL opravě by toto varování **mělo zmizet**

---

### 🧪 Test 8: Ochrana uživatelských práv

**KRITICKÝ TEST! Ověř že se nemažou uživatelská práva.**

1. **Přidej testovací uživatelské právo do DB:**
   ```sql
   INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
   VALUES (5, -1, 35, 1);
   -- Uživatel #5 má individuální právo #35
   ```

2. **V aplikaci:**
   - Otevři roli
   - Přidej/odeber právo k/z role

3. **Zkontroluj DB:**
   ```sql
   SELECT * FROM 25_role_prava 
   WHERE user_id = 5 AND pravo_id = 35;
   -- Tento záznam MUSÍ stále existovat!
   ```

4. **Očekávaný výsledek:**
   - ✅ Uživatelské právo (user_id=5) NEBYLO smazáno
   - ✅ Operace se týkala pouze práv role (user_id=-1)

---

## Chybové stavy

### ❌ 404 Not Found
**Příčina:** Backend endpoint neexistuje nebo špatná cesta  
**Řešení:** Zkontroluj routing v `api.php`

### ❌ 401 Unauthorized
**Příčina:** Neplatný token nebo uživatel není přihlášen  
**Řešení:** Odhlásit se a znovu přihlásit

### ❌ 500 Internal Server Error
**Příčina:** Chyba v SQL dotazu nebo PHP kódu  
**Řešení:** Zkontroluj PHP error log

### ❌ Duplicitní klíče v konzoli
**Příčina:** Duplicity v DB ještě nejsou opravené  
**Řešení:** Spusť SQL skript `fix_role_prava_duplicates.sql`

---

## Checklist před nasazením do produkce

- [ ] ✅ Test 1: Přidání práva funguje
- [ ] ✅ Test 2: Ochrana proti duplicitám funguje
- [ ] ✅ Test 3: Odebrání práva funguje
- [ ] ✅ Test 4: Refresh a perzistence OK
- [ ] ✅ Test 5: Vyhledávání funguje
- [ ] ✅ Test 6: Různé role OK
- [ ] ✅ Test 7: SQL oprava duplicit provedena
- [ ] ✅ Test 8: Uživatelská práva chráněna
- [ ] Žádné chyby v konzoli
- [ ] Žádné chyby v PHP error logu
- [ ] Performance OK (rychlá odezva)

---

## Známé problémy a workaroundy

### FE deduplikace
**Problém:** Backend může stále vracet duplicity (pokud SQL oprava nebyla spuštěna)  
**Workaround:** ✅ FE automaticky deduplikuje data při načítání  
**Trvalé řešení:** Spustit SQL opravu duplicit

### Konzolové warningy
**Problém:** `⚠️ Deduplikace práv pro roli...`  
**Příčina:** Duplicity v DB  
**Řešení:** Spustit SQL skript

---

## SQL skripty

### Zobrazit všechny práva role
```sql
SELECT 
    r.nazev_role,
    p.kod_prava,
    p.popis,
    rp.aktivni
FROM 25_role_prava rp
JOIN 25_role r ON rp.role_id = r.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = -1
  AND rp.role_id = 1
ORDER BY p.kod_prava;
```

### Počet práv na roli
```sql
SELECT 
    r.id,
    r.nazev_role,
    COUNT(*) as pocet_prav
FROM 25_role r
LEFT JOIN 25_role_prava rp ON r.id = rp.role_id AND rp.user_id = -1
GROUP BY r.id, r.nazev_role
ORDER BY r.nazev_role;
```

### Najít duplicity (mělo by vrátit 0 po opravě)
```sql
SELECT 
    role_id,
    pravo_id,
    COUNT(*) as pocet,
    GROUP_CONCAT(id) as duplicate_ids
FROM 25_role_prava
WHERE user_id = -1
GROUP BY role_id, pravo_id
HAVING pocet > 1;
```

---

**Happy Testing! 🎉**
