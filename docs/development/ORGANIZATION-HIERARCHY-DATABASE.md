# 🗄️ Databázová struktura - Rozšíření pro organizační řád

> **Datum:** 11. prosince 2025  
> **Status:** ✅ Implementováno  
> **Databáze:** eeo2025 @ 10.3.172.11

---

## ✅ Vytvořené/upravené tabulky

### 1️⃣ **`25_uzivatele_hierarchie`** - ROZŠÍŘENO

Přidané sloupce pro metadata vztahu:

```sql
-- Nové sloupce:
typ_vztahu              ENUM('prime', 'zastupovani', 'delegovani', 'rozsirene')
uroven_opravneni        TINYINT(1) DEFAULT 1
viditelnost_objednavky  TINYINT(1) DEFAULT 1
viditelnost_faktury     TINYINT(1) DEFAULT 0
notifikace_email        TINYINT(1) DEFAULT 0
notifikace_inapp        TINYINT(1) DEFAULT 0
notifikace_typy         JSON NULL
upravil_user_id         INT UNSIGNED NULL
dt_upraveno             TIMESTAMP NULL
```

**Význam sloupců:**

- **`typ_vztahu`**:
  - `prime` - přímé podřízení (nadřízený → podřízený)
  - `zastupovani` - dočasné zastupování
  - `delegovani` - delegované oprávnění
  - `rozsirene` - rozšířené vidění (např. controller vidí všechny úseky)

- **`uroven_opravneni`**: 1-5, úroveň vlivu nadřízeného

- **`viditelnost_*`**: Zda nadřízený vidí data podřízeného

- **`notifikace_*`**: Zda dostávat notifikace o činnosti podřízeného

- **`notifikace_typy`**: JSON pole typů notifikací, např:
  ```json
  ["order_created", "order_approved", "invoice_received"]
  ```

---

### 2️⃣ **`25_uzivatele_lokality`** - NOVÁ

Dodatečné přiřazení lokalit mimo výchozí `lokalita_id` v tabulce `25_uzivatele`.

```sql
CREATE TABLE 25_uzivatele_lokality (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id INT UNSIGNED NOT NULL,
  lokalita_id INT UNSIGNED NOT NULL,
  
  -- Oprávnění v lokalitě
  viditelnost_objednavky  TINYINT(1) DEFAULT 1,
  viditelnost_faktury     TINYINT(1) DEFAULT 1,
  viditelnost_smlouvy     TINYINT(1) DEFAULT 0,
  viditelnost_pokladna    TINYINT(1) DEFAULT 0,
  viditelnost_uzivatele   TINYINT(1) DEFAULT 0,
  
  -- Notifikace
  notifikace_email        TINYINT(1) DEFAULT 0,
  notifikace_inapp        TINYINT(1) DEFAULT 0,
  
  -- Metadata
  dt_od                   DATE NOT NULL DEFAULT (CURDATE()),
  dt_do                   DATE NULL,
  aktivni                 TINYINT(1) NOT NULL DEFAULT 1,
  poznamka                TEXT NULL,
  vytvoril_user_id        INT UNSIGNED NULL,
  dt_vytvoreni            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  upravil_user_id         INT UNSIGNED NULL,
  dt_upraveno             TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE,
  FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id) ON DELETE CASCADE,
  
  UNIQUE KEY uniq_uzivatel_lokalita (uzivatel_id, lokalita_id),
  INDEX idx_uzivatel (uzivatel_id, aktivni),
  INDEX idx_lokalita (lokalita_id)
);
```

**Použití:**
```sql
-- Např: Karel Dvořák má výchozí lokalitu Praha,
-- ale chceme, aby viděl i objednávky a faktury z Brna

INSERT INTO 25_uzivatele_lokality 
  (uzivatel_id, lokalita_id, viditelnost_objednavky, viditelnost_faktury)
VALUES 
  (123, 2, 1, 1); -- user 123, Brno (id=2), vidí objednávky + faktury
```

---

### 3️⃣ **`25_uzivatele_useky`** - NOVÁ

Dodatečné přiřazení úseků mimo výchozí `usek_id` v tabulce `25_uzivatele`.

```sql
CREATE TABLE 25_uzivatele_useky (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id INT UNSIGNED NOT NULL,
  usek_id INT NOT NULL,
  
  -- Oprávnění v úseku
  viditelnost_objednavky  TINYINT(1) DEFAULT 1,
  viditelnost_faktury     TINYINT(1) DEFAULT 1,
  viditelnost_smlouvy     TINYINT(1) DEFAULT 0,
  viditelnost_pokladna    TINYINT(1) DEFAULT 0,
  viditelnost_uzivatele   TINYINT(1) DEFAULT 0,
  viditelnost_lp          TINYINT(1) DEFAULT 0,
  
  -- Notifikace
  notifikace_email        TINYINT(1) DEFAULT 0,
  notifikace_inapp        TINYINT(1) DEFAULT 0,
  
  -- Metadata
  dt_od                   DATE NOT NULL DEFAULT (CURDATE()),
  dt_do                   DATE NULL,
  aktivni                 TINYINT(1) NOT NULL DEFAULT 1,
  poznamka                TEXT NULL,
  vytvoril_user_id        INT UNSIGNED NULL,
  dt_vytvoreni            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  upravil_user_id         INT UNSIGNED NULL,
  dt_upraveno             TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE,
  FOREIGN KEY (usek_id) REFERENCES 25_useky(id) ON DELETE CASCADE,
  
  UNIQUE KEY uniq_uzivatel_usek (uzivatel_id, usek_id),
  INDEX idx_uzivatel (uzivatel_id, aktivni),
  INDEX idx_usek (usek_id)
);
```

**Použití:**
```sql
-- Např: Eva Černá je z úseku Obchod,
-- ale chceme, aby viděla i faktury a LP kódy z úseku Finance

INSERT INTO 25_uzivatele_useky 
  (uzivatel_id, usek_id, viditelnost_faktury, viditelnost_lp)
VALUES 
  (456, 3, 1, 1); -- user 456, Finance (id=3), vidí faktury + LP
```

---

## 📊 Příklady JOIN dotazů

### Získání úplného profilu uživatele s rozšířeními

```sql
SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as cely_jmeno,
    u.email,
    
    -- Výchozí lokalita
    l.nazev as vychozi_lokalita,
    
    -- Výchozí úsek
    us.usek_nazev as vychozi_usek,
    
    -- Počet dodatečných lokalit
    (SELECT COUNT(*) FROM 25_uzivatele_lokality ul 
     WHERE ul.uzivatel_id = u.id AND ul.aktivni = 1) as pocet_dod_lokalit,
    
    -- Počet dodatečných úseků
    (SELECT COUNT(*) FROM 25_uzivatele_useky uu 
     WHERE uu.uzivatel_id = u.id AND uu.aktivni = 1) as pocet_dod_useku,
    
    -- Počet podřízených
    (SELECT COUNT(*) FROM 25_uzivatele_hierarchie h 
     WHERE h.nadrizeny_id = u.id AND h.aktivni = 1) as pocet_podrizenych,
    
    -- Nadřízený
    CONCAT(nadr.jmeno, ' ', nadr.prijmeni) as nadrizeny_jmeno
    
FROM 25_uzivatele u
LEFT JOIN 25_lokality l ON u.lokalita_id = l.id
LEFT JOIN 25_useky us ON u.usek_id = us.id
LEFT JOIN 25_uzivatele_hierarchie h ON u.id = h.podrizeny_id AND h.aktivni = 1
LEFT JOIN 25_uzivatele nadr ON h.nadrizeny_id = nadr.id
WHERE u.id = :user_id;
```

---

### Získání všech lokalit uživatele (výchozí + dodatečné)

```sql
-- Výchozí lokalita
SELECT 
    l.id as lokalita_id,
    l.nazev as lokalita_nazev,
    'vychozi' as typ,
    1 as viditelnost_objednavky,
    1 as viditelnost_faktury,
    1 as viditelnost_smlouvy,
    1 as viditelnost_pokladna,
    1 as viditelnost_uzivatele
FROM 25_uzivatele u
JOIN 25_lokality l ON u.lokalita_id = l.id
WHERE u.id = :user_id

UNION

-- Dodatečné lokality
SELECT 
    l.id as lokalita_id,
    l.nazev as lokalita_nazev,
    'dodatecna' as typ,
    ul.viditelnost_objednavky,
    ul.viditelnost_faktury,
    ul.viditelnost_smlouvy,
    ul.viditelnost_pokladna,
    ul.viditelnost_uzivatele
FROM 25_uzivatele_lokality ul
JOIN 25_lokality l ON ul.lokalita_id = l.id
WHERE ul.uzivatel_id = :user_id
  AND ul.aktivni = 1
  AND (ul.dt_do IS NULL OR ul.dt_do >= CURDATE())
ORDER BY typ, lokalita_nazev;
```

---

### Získání všech úseků uživatele (výchozí + dodatečné)

```sql
-- Výchozí úsek
SELECT 
    us.id as usek_id,
    us.usek_zkr,
    us.usek_nazev,
    'vychozi' as typ,
    1 as viditelnost_objednavky,
    1 as viditelnost_faktury,
    1 as viditelnost_lp
FROM 25_uzivatele u
JOIN 25_useky us ON u.usek_id = us.id
WHERE u.id = :user_id

UNION

-- Dodatečné úseky
SELECT 
    us.id as usek_id,
    us.usek_zkr,
    us.usek_nazev,
    'dodatecny' as typ,
    uu.viditelnost_objednavky,
    uu.viditelnost_faktury,
    uu.viditelnost_lp
FROM 25_uzivatele_useky uu
JOIN 25_useky us ON uu.usek_id = us.id
WHERE uu.uzivatel_id = :user_id
  AND uu.aktivni = 1
  AND (uu.dt_do IS NULL OR uu.dt_do >= CURDATE())
ORDER BY typ, usek_nazev;
```

---

### Kontrola viditelnosti objednávky pro uživatele

```sql
-- Vrátí 1 pokud má uživatel právo vidět objednávku, jinak 0
SELECT 
    CASE 
        -- Vlastní objednávka
        WHEN o.uzivatel_id = :user_id THEN 1
        
        -- Objednávka z výchozí lokality a úseku
        WHEN o.lokalita_id = (SELECT lokalita_id FROM 25_uzivatele WHERE id = :user_id)
         AND o.usek_id = (SELECT usek_id FROM 25_uzivatele WHERE id = :user_id) THEN 1
        
        -- Objednávka z dodatečné lokality
        WHEN EXISTS (
            SELECT 1 FROM 25_uzivatele_lokality ul
            WHERE ul.uzivatel_id = :user_id
              AND ul.lokalita_id = o.lokalita_id
              AND ul.viditelnost_objednavky = 1
              AND ul.aktivni = 1
              AND (ul.dt_do IS NULL OR ul.dt_do >= CURDATE())
        ) THEN 1
        
        -- Objednávka z dodatečného úseku
        WHEN EXISTS (
            SELECT 1 FROM 25_uzivatele_useky uu
            WHERE uu.uzivatel_id = :user_id
              AND uu.usek_id = o.usek_id
              AND uu.viditelnost_objednavky = 1
              AND uu.aktivni = 1
              AND (uu.dt_do IS NULL OR uu.dt_do >= CURDATE())
        ) THEN 1
        
        -- Objednávka podřízeného (přes hierarchii)
        WHEN EXISTS (
            SELECT 1 FROM 25_uzivatele_hierarchie h
            WHERE h.nadrizeny_id = :user_id
              AND h.podrizeny_id = o.uzivatel_id
              AND h.viditelnost_objednavky = 1
              AND h.aktivni = 1
              AND (h.dt_do IS NULL OR h.dt_do >= CURDATE())
        ) THEN 1
        
        ELSE 0
    END as ma_pristup
FROM 25a_objednavky o
WHERE o.id = :order_id;
```

---

### Získání hierarchie s metadaty vztahu

```sql
SELECT 
    -- Nadřízený
    h.nadrizeny_id,
    CONCAT(nadr.jmeno, ' ', nadr.prijmeni) as nadrizeny_jmeno,
    nadr_us.usek_nazev as nadrizeny_usek,
    
    -- Podřízený
    h.podrizeny_id,
    CONCAT(podr.jmeno, ' ', podr.prijmeni) as podrizeny_jmeno,
    podr_us.usek_nazev as podrizeny_usek,
    
    -- Metadata vztahu
    h.typ_vztahu,
    h.uroven_opravneni,
    h.viditelnost_objednavky,
    h.viditelnost_faktury,
    h.notifikace_email,
    h.notifikace_inapp,
    h.notifikace_typy,
    h.dt_od,
    h.dt_do,
    h.aktivni,
    h.poznamka,
    
    -- Upravil
    CONCAT(upr.jmeno, ' ', upr.prijmeni) as upravil_jmeno,
    h.dt_upraveno

FROM 25_uzivatele_hierarchie h
JOIN 25_uzivatele nadr ON h.nadrizeny_id = nadr.id
JOIN 25_uzivatele podr ON h.podrizeny_id = podr.id
LEFT JOIN 25_useky nadr_us ON nadr.usek_id = nadr_us.id
LEFT JOIN 25_useky podr_us ON podr.usek_id = podr_us.id
LEFT JOIN 25_uzivatele upr ON h.upravil_user_id = upr.id
WHERE h.aktivni = 1
  AND (h.dt_do IS NULL OR h.dt_do >= CURDATE())
ORDER BY nadr.prijmeni, podr.prijmeni;
```

---

## 🎯 Výhody tohoto řešení

### ✅ **Výkon (Performance):**
- Vše joinovatelné přes FK
- Indexy na důležitých sloupcích
- Minimum poddotazů

### ✅ **Flexibilita:**
- Časová platnost (dt_od, dt_do)
- Soft delete (aktivni)
- Různé typy vztahů (typ_vztahu)
- Audit trail (vytvoril_user_id, upravil_user_id)

### ✅ **Jednoduchá správa:**
- UNIQUE constraints zabraňují duplikátům
- CASCADE DELETE automaticky čistí
- JSON pro komplexní data (notifikace_typy)

### ✅ **Rozšiřitelnost:**
- Snadné přidání nových typů viditelnosti
- Snadné přidání nových typů vztahů
- Snadné přidání dalších metadat

---

## 📝 Migrace existujících dat

Pokud už máš nějaké vztahy v `25_uzivatele_hierarchie`, výchozí hodnoty se nastaví automaticky:

```sql
-- Zkontroluj existující data
SELECT 
    nadrizeny_id,
    podrizeny_id,
    typ_vztahu,          -- 'prime' (výchozí)
    uroven_opravneni,    -- 1 (výchozí)
    viditelnost_objednavky, -- 1 (výchozí)
    notifikace_email,    -- 0 (výchozí)
    notifikace_inapp     -- 0 (výchozí)
FROM 25_uzivatele_hierarchie;
```

---

## 🚀 Další kroky

1. ✅ Databáze připravena
2. 🔨 Vytvořit API endpointy (GET/POST/PUT/DELETE)
3. 🔨 Implementovat UI editor
4. 🔨 Integrovat do systému oprávnění
5. 🔨 Integrovat do notifikačního systému

---

**Status:** ✅ Databázová struktura kompletní a připravená!
