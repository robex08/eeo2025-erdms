# Analýza CSV souborů - Inventik

## 📊 Přehled dat

### Počty záznamů:
- **Budovy:** 68 záznamů
- **Inventární úseky:** 89 záznamů
- **Místnosti:** 2,098 záznamů
- **Majetek:** 17,101 položek

---

## 🗂️ Struktura CSV souborů

### 1. **budovy.csv** (68 záznamů)
Číselník budov/objektů

| Sloupec | Popis | Příklad |
|---------|-------|---------|
| `budt` | Kód budovy (PK) | 101, 104, 105 |
| `budovat` | Název budovy | "Rakovník", "Roztoky u Křivoklátu" |
| `zaplf` | Datum zapůjčení | 1.9.2022 |
| `koplf` | Datum ukončení půjčky | 1.9.2022 |
| `bmist` | ? (prázdné) | |

**Vzorová data:**
```
101;Rakovník;;;
104;Roztoky u Křivoklátu;;1.9.2022;
105;Roztoky u Prahy;;;
```

---

### 2. **inv-usek.csv** (89 záznamů)
Číselník inventárních úseků (organizační jednotky)

| Sloupec | Popis | Příklad |
|---------|-------|---------|
| `cinv` | Kód inv. úseku (PK) | 100, 101, 102 |
| `prac` | Kód pracovníka? | 100, 101, 102 |
| `nazinv` | Název inv. úseku | "správa Kladno", "RLP Kladno" |
| `zaplf` | Datum zapůjčení | 1.9.2023 |
| `koplf` | Datum ukončení | 1.12.2021 |

**Vzorová data:**
```
100;100;správa Kladno;;
101;101;RLP Kladno;;
102;102;RLP Rakovník;;
```

---

### 3. **mistnostni.csv** (2,098 záznamů)
Číselník místností

| Sloupec | Popis | Příklad |
|---------|-------|---------|
| `budt` | Kód budovy (FK -> budovy) | 101 |
| `mist` | Číslo místnosti (PK s budt) | 1, 2, 3 |
| `mistt` | Popis místnosti | "vedoucí řidič (102)", "bývalá čekárna LPS" |
| `zaplf` | Datum zapůjčení | 1.9.2022 |
| `koplf` | Datum ukončení | 1.12.2022 |

**Vzorová data:**
```
101;1;vedoucí řidič (102);;
101;2;bývalá čekárna LPS (102);;
101;218;stojany na mapy;;
```

**Vztah:** Místnost patří do budovy (budt)

---

### 4. **26-04-22-ppsa.csv** (17,101 záznamů)
Hlavní tabulka majetku - 43 sloupců!

#### Klíčové sloupce:

| Sloupec | Popis | Příklad |
|---------|-------|---------|
| `cinv` | **Inv. úsek (FK)** | 101 |
| `cislo` | **Inv. číslo (PK)** | D01040076 |
| `budt` | **Budova (FK)** | 903 |
| `mist` | **Místnost (FK)** | 218 |
| `nazev` | **Název majetku** | "stojany na mapy" |
| `datzar` | Datum zařazení | 14.10.2003 |
| `cenamj` | Pořizovací cena | 22211,40 |
| `mj` | Měrná jednotka | ks |
| `cmnoz` | Množství | 1,000 |

#### Další sloupce:
- `zapl` - datum zapůjčení
- `poh` - pohyb? (861)
- `nomenkl` - nomenklátor
- `kat` - kategorie
- `typmajet` - typ majetku (1)
- `ucet` - účet (86, 85, 81)
- `trida` - třída (85, 86, 81)
- `czcpa` - ?
- `skp` - SKP kód
- `cdok` - číslo dokladu
- `vyrcis` - výrobní číslo
- `pozn` - poznámka
- `obr`, `prilohy` - přílohy/obrázky

---

## 🔗 Vztahy mezi tabulkami

### Zjištěné vazby:

```
BUDOVY (68)
   ↑
   |
   └─── MÍSTNOSTI (2,098)
           ↑
           |
           └─── MAJETEK (17,101)
                   ↑
                   |
         INV.ÚSEKY (89) ──┘
```

### Detail vazeb:

1. **MAJETEK -> BUDOVY**
   - Sloupec: `budt` (kód budovy)
   - Cca 60+ různých budov v majetku
   
2. **MAJETEK -> MÍSTNOSTI**
   - Sloupec: `mist` (číslo místnosti)
   - Společně s `budt` jednoznačně identifikuje místnost
   
3. **MAJETEK -> INV.ÚSEKY**
   - Sloupec: `cinv` (kód inv. úseku)
   - 61 různých inv. úseků v datech majetku

4. **MÍSTNOSTI -> BUDOVY**
   - Sloupec: `budt` (kód budovy)
   - 65 různých budov má místnosti

---

## 💡 Návrh databázové struktury

### Doporučení:

#### ✅ **4 hlavní tabulky:**

1. **`budovy`** (číselník)
   - PK: `budt` (VARCHAR)
   - Název, data zapůjčení/ukončení

2. **`inventarni_useky`** (číselník)
   - PK: `cinv` (VARCHAR/INT)
   - Název, pracovník, data

3. **`mistnosti`** (číselník)
   - PK: `budt` + `mist` (composite key)
   - FK: `budt` -> budovy
   - Popis, data

4. **`majetek`** (hlavní tabulka)
   - PK: `cislo` (inventární číslo, VARCHAR)
   - FK: `cinv` -> inventarni_useky
   - FK: `budt` -> budovy
   - FK: `budt` + `mist` -> mistnosti
   - Všechny ostatní atributy (název, cena, datum zařazení, atd.)

---

## ❓ Otázky k diskusi

1. **Duplicity v datech:**
   - Budovy v `budovy.csv` (68) vs budovy v `mistnostni.csv` (65) - OK?
   - Některé budovy nemají místnosti?

2. **Vztah místnost -> majetek:**
   - Je vždy `budt` + `mist` unikátní identifikátor místnosti?
   - Co když je `mist` prázdné u nějakého majetku?

3. **Sloupce v majetku:**
   - Které sloupce jsou POVINNÉ?
   - Které můžeme ignorovat/sjednotit?
   - Co znamená `osc`, `zapl`, `poh`, `nomenkl` atd.?

4. **Import strategie:**
   - Importovat všech 43 sloupců nebo vybrat jen klíčové?
   - Datum formát: DD.MM.YYYY -> MySQL DATE?
   - Decimal separator: čárka -> tečka?

5. **Budoucí funkce:**
   - Sledování historie změn?
   - Inventury (stav vs. skutečnost)?
   - Export/import nových dat?

---

## 🚀 Navržený postup

1. **Vytvořit databázové schéma** (4 tabulky)
2. **Import číselníků** (budovy, inv.úseky, místnosti)
3. **Import majetku** s vazbami na číselníky
4. **Validace** - kontrola integrity dat
5. **Test queries** - ověření funkčnosti

---

**Datum analýzy:** 22. dubna 2026  
**Celkem řádků k importu:** 19,356
