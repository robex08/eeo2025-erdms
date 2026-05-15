# SQL OPTIMALIZACE – Order V3 (nové objednávky)

**Datum analýzy:** 21.04.2026
**Autor:** GitHub Copilot (analýza, bez modifikace kódu/DB)
**Analyzovaný endpoint:** `POST order-v3/list` (+ `order-v3/stats`, `order-v3/items`)
**Hlavní soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php`
**Podpůrné:** `orderHandlers.php` (`enrichOrderWithInvoices`), `hierarchyOrderFilters.php`

> 🔵 Tento dokument je **analýza + návrh**, NE implementace. Žádné SQL ani PHP změny nebyly provedeny.
> Vzor a styl navazují na `SQL_OPTIMIZATION_OLD_ORDERS_ANALYSIS.md` (20.04.2026).

---

## 0. Platforma

DB server (DEV i PROD): **MariaDB 11.8+** (DEV 10.3.172.11 hlásí `11.8.6-MariaDB-0+deb13u1 from Debian`).
Všechny DDL/DML statementy v tomto dokumentu jsou formulovány pro MariaDB 11.8+ a využívají:

- Generated columns (`GENERATED ALWAYS AS … STORED/VIRTUAL`) – ✅ podporováno
- Funkční indexy – ✅ nutné realizovat přes generovaný sloupec (MariaDB nemá přímé `CREATE INDEX … ((func(col)))`)
- `ALGORITHM=INPLACE, LOCK=NONE` – ✅ podporováno pro většinu `ADD INDEX` operací na InnoDB
- `JSON_TABLE`, CTE, Window functions, Invisible indexes – ✅ vše dostupné

**Všechny DDL operace musí být nejprve otestovány na DEV (`EEO-OSTRA-DEV`) před nasazením na PROD (`eeo2025`).**

---

## 1. Shrnutí (TL;DR)

Endpoint `handle_order_v3_list` má **několik vrstev N+1**, neindexované filtry a plné skeny tabulek v kritických místech:

1. **Per-order enrichment foreach** (4 funkce × 50 řádků = 200–400 dotazů/request)
2. **8 korelovaných subquery** v hlavním `SELECT`u (cca 400 micro-dotazů/request pro 50 řádků)
3. **`enrichFinancovaniV3` spouští agregaci přes celou tabulku** `25a_objednavky` pro každou objednávku se smlouvou (full scan s `JSON_EXTRACT`!)
4. **`sqlNormalizeExpression` LIKE** vytváří 15× `REPLACE(LOWER(col), ...)` → **nelze použít žádný index, plný sken** tabulky
5. **Stats query** volá 13× `JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(...)-1, ']')))` per řádek, nad celým rokem – **full scan**
6. **Chybí kritické indexy**: `dt_objednavky`, `aktivni`, `dodavatel_id`, `objednavka_id` pro některé tabulky, `smazano` v komentářích

**Odhadovaný přínos po fázi F1+F2** (bez generovaných sloupců): **50–80 % redukce TTFB** na stránce 50 řádků + výrazné zlepšení při vyhledávání s diakritikou.

**Aktuální velikost dat na DEV** (jen referenčně – PROD bude větší):
- `25a_objednavky` aktivní: **671**
- `25a_objednavky_polozky`: **1 126**
- `25a_objednavky_prilohy`: **2 577**
- `25a_objednavky_faktury` aktivní: **788**
- `25a_objednavky_komentare` nesmazané: **4 046**

---

## 2. Aktuální stav dotazu

### 2.1 Hlavní SELECT (`handle_order_v3_list`, řádky ~1553–1720)

```sql
SELECT
    o.id, o.cislo_objednavky, o.predmet, o.poznamka,
    o.dt_objednavky, o.dt_vytvoreni, /* ~30 sloupců z objednávky */
    o.dodavatel_id,
    COALESCE(o.dodavatel_nazev, d.nazev) AS dodavatel_nazev,
    COALESCE(o.dodavatel_ico, d.ico) AS dodavatel_ico,
    u1.id AS objednatel_id, u1.jmeno, u1.prijmeni, u1.titul_pred, u1.titul_za, u1.email,
    u2.*, u3.*, u4.*, u5.*, u6.*, u7.*, u8.*, u9.*, u10.*, u11.*,   -- 11 LEFT JOINů na uživatele

    -- ❌ 8 KORELOVANÝCH SUBQUERY
    (SELECT COUNT(*) FROM 25a_objednavky_polozky pol
      WHERE pol.objednavka_id = o.id) AS pocet_polozek,
    (SELECT COALESCE(SUM(pol.cena_s_dph),0) FROM 25a_objednavky_polozky pol
      WHERE pol.objednavka_id = o.id) AS cena_s_dph,
    (SELECT COUNT(*) FROM 25a_objednavky_prilohy pr
      WHERE pr.objednavka_id = o.id) AS pocet_priloh,
    (SELECT COUNT(*) FROM 25a_objednavky_faktury f
      WHERE f.objednavka_id = o.id AND f.aktivni = 1) AS pocet_faktur,
    (SELECT COALESCE(SUM(f.fa_castka),0) FROM 25a_objednavky_faktury f
      WHERE f.objednavka_id = o.id AND f.aktivni = 1) AS faktury_celkova_castka_s_dph,
    (SELECT COUNT(*) FROM 25a_objednavky_komentare kom
      WHERE kom.objednavka_id = o.id AND kom.smazano = 0) AS comments_count,
    (SELECT CONCAT(u.jmeno,' ',u.prijmeni) FROM 25a_objednavky_komentare kom
      JOIN 25_uzivatele u ON kom.user_id = u.id
      WHERE kom.objednavka_id = o.id AND kom.smazano = 0
      ORDER BY kom.dt_vytvoreni DESC LIMIT 1) AS last_comment_author,
    (SELECT kom.dt_vytvoreni FROM 25a_objednavky_komentare kom
      WHERE kom.objednavka_id = o.id AND kom.smazano = 0
      ORDER BY kom.dt_vytvoreni DESC LIMIT 1) AS last_comment_date
FROM 25a_objednavky o
LEFT JOIN 25_dodavatele d  ON o.dodavatel_id = d.id
LEFT JOIN 25_uzivatele u1  ON o.objednatel_id = u1.id
LEFT JOIN 25_uzivatele u2  ON o.garant_uzivatel_id = u2.id
LEFT JOIN 25_uzivatele u3  ON o.prikazce_id = u3.id
LEFT JOIN 25_uzivatele u4  ON o.schvalovatel_id = u4.id
LEFT JOIN 25_uzivatele u5  ON o.odesilatel_id = u5.id
LEFT JOIN 25_uzivatele u6  ON o.dodavatel_potvrdil_id = u6.id
LEFT JOIN 25_uzivatele u7  ON o.zverejnil_id = u7.id
LEFT JOIN 25_uzivatele u8  ON o.dokoncil_id = u8.id
LEFT JOIN 25_uzivatele u9  ON o.fakturant_id = u9.id
LEFT JOIN 25_uzivatele u10 ON o.potvrdil_vecnou_spravnost_id = u10.id
LEFT JOIN 25_uzivatele u11 ON o.uzivatel_akt_id = u11.id
WHERE o.aktivni = 1 AND o.id != 1
  /* + period filtr + permissions (12 role-based OR) + optional LIKE filtry */
ORDER BY o.dt_objednavky DESC
LIMIT 50 OFFSET 0;
```

### 2.2 PHP enrichment smyčka (řádky 1748–1770)

```php
foreach ($orders as &$order) {
    // JSON parse (O(1), OK)
    $order['financovani']       = parseFinancovani($order['financovani']);
    $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], []);
    // ...

    enrichFinancovaniV3($db, $order);          // 1× smlouva + 1× SUM FULL SCAN + N× LP
    enrichDodavatelV3($db, $order);            // 1× SELECT z 25_dodavatele   ← duplicitní s JOIN d
    enrichRegistrZverejneniV3($db, $order);    // 1× SELECT z 25_uzivatele    ← duplicitní s JOIN u7
    enrichOrderWithInvoices($db, $order);      // 1× loadOrderInvoices()
    enrichOrderWithAttachmentStatus($db, $order); // 2× SELECT (prilohy OBJ + FA IDs + FA prilohy)
}
```

### 2.3 Stats (`getOrderStatsWithPeriod`, ~2212)

```sql
SELECT COUNT(*) AS total,
  SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod,'$[0]')) = 'NOVA' THEN 1 ELSE 0 END) AS nove,
  SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod,
     CONCAT('$[', JSON_LENGTH(stav_workflow_kod)-1, ']'))) = 'SCHVALENA' THEN 1 ELSE 0 END) AS schvalena,
  /* … 11× další podobné CASE přes JSON_UNQUOTE(JSON_EXTRACT(...)) … */
FROM 25a_objednavky WHERE aktivni = 1 AND id != 1 AND /* period */ …
```

---

## 3. Skutečný stav indexů (DEV EEO-OSTRA-DEV)

### 3.1 `25a_objednavky`

| Index | Sloupec(e) | Kardinalita | Poznámka |
|---|---|---|---|
| PRIMARY | id | 1180 | OK |
| uzivatel_id | uzivatel_id | 62 | OK |
| uzivatel_akt_id | uzivatel_akt_id | 51 | OK |
| garant_uzivatel_id | garant_uzivatel_id | 51 | OK |
| objednatel_id | objednatel_id | 62 | OK |
| schvalovatel_id | schvalovatel_id | 20 | OK |
| prikazce_id | prikazce_id | 18 | OK |
| idx_odesilatel | odesilatel_id | 49 | OK |
| idx_potvrdil | dodavatel_potvrdil_id | 49 | OK |
| idx_fakturant | fakturant_id | 18 | OK |
| idx_dokoncil | dokoncil_id | 6 | OK |
| fk_zverejnil | zverejnil_id | 5 | OK |
| fk_potvrdil_vecnou_spravnost | potvrdil_vecnou_spravnost_id | 1 | OK |
| idx_dt_faktura_pridana | dt_faktura_pridana | 295 | OK |
| idx_dt_dokonceni | dt_dokonceni | 1180 | OK |

**🔴 Chybí zcela:**
- `dt_objednavky` (používán pro WHERE period + default ORDER BY!)
- `dt_vytvoreni` (dashboard queries)
- `dt_aktualizace` (pro fakturace_prodleni)
- `aktivni` (základní WHERE každého dotazu)
- `dodavatel_id` (LEFT JOIN na `25_dodavatele`)
- `stav_objednavky` (filtr + normalizovaný LIKE)
- `zverejnit`, `dt_zverejneni`, `registr_iddt` (filtr stav_registru)

### 3.2 `25a_objednavky_polozky`

| Index | Sloupec(e) | Cardinality |
|---|---|---|
| PRIMARY | id | 1126 |
| objednavka_id | objednavka_id | 1126 | ✅ |
| idx_polozky_lokalizace | usek_kod, budova_kod, mistnost_kod | | |
| idx_lp_id | lp_id | | |

✅ `objednavka_id` pokryt (correlated subquery `pocet_polozek`/`cena_s_dph` běží efektivně)

### 3.3 `25a_objednavky_prilohy`

| Index | Sloupec | Cardinality |
|---|---|---|
| PRIMARY | id | 2577 |
| objednavka_id | objednavka_id | 1288 | ✅ |
| nahrano_uzivatel_id | nahrano_uzivatel_id | 56 |

**🟠 Chybí:** `(objednavka_id, typ_prilohy)` – použil by `enrichOrderWithAttachmentStatus`

### 3.4 `25a_objednavky_faktury`

| Index | Sloupec | Cardinality |
|---|---|---|
| PRIMARY | id | 1822 |
| idx_objednavka | objednavka_id | 911 | ✅ |
| idx_aktivni | aktivni | 2 | ⚠️ samostatný na bool je k ničemu |
| ... | další 16 indexů | | |

**🔴 Pozorování:** 21 indexů na jedné tabulce = možný over-indexing. `idx_aktivni` (jen bool) má cardinalitu 2 → optimizer ho nikdy nepoužije jako první.
**🟠 Chybí:** `(objednavka_id, aktivni)` kompozitní pro `pocet_faktur` / `faktury_celkova_castka_s_dph`.

### 3.5 `25a_objednavky_komentare`

| Index | Sloupec | Cardinality |
|---|---|---|
| PRIMARY | id | 4047 |
| objednavka_id | objednavka_id | 674 | ✅ |
| vlozil_uzivatel_id | vlozil_uzivatel_id | 65 |

**🔴 Chybí:** `(objednavka_id, smazano, dt_vytvoreni DESC)` – přesně potřebný pro `LIMIT 1` subquery (last comment).
**Poznámka:** Skutečný sloupec v tabulce je `vlozil_uzivatel_id`, ale kód volá `kom.user_id` v subquery komentářů (ř. 1686) – **nutno ověřit, zda není ukrytý alias / chyba**. Bude ověřeno v Dodatek A.

### 3.6 `25_dodavatele`

| Index | Sloupec | Cardinality |
|---|---|---|
| PRIMARY | id | 3150 |
| idx_ico | ico | 3150 | ✅ |
| idx_dic | dic | 1575 |

**🟠 Chybí:** index na `nazev` (pro filtr dodavatele) – LIKE `%x%` stejně nevyužije, ale prefix by pomohl.

### 3.7 `25_uzivatele`

| Index | Sloupec | Cardinality |
|---|---|---|
| PRIMARY | id | 304 |
| stredisko_id | stredisko_id | 23 |
| login | login | 304 |

**🟠 Chybí:** `prijmeni`, `email` (pro filtry). Data jsou malá, není kritické.

### 3.8 `25a_objednavky_faktury_prilohy`

**Tabulka NEEXISTUJE v EEO-OSTRA-DEV!** Subagent to hlásí při inspekci.
Kód v `enrichOrderWithAttachmentStatus` ji ale volá přes `TBL_FAKTURY_PRILOHY`.

⚠️ **Nutno ověřit:** Buď je jiný skutečný název tabulky, nebo funkce `enrichOrderWithAttachmentStatus` selhává (silent `try/catch`) a `attachment_color` je `#cbd5e1` pro všechny. **To je samostatný bug – mimo rozsah této analýzy, ale v následné implementaci dát pozor**.

---

## 4. EXPLAIN plány (DEV, 671 aktivních objednávek)

### 4.1 Hlavní list query – bez LIKE filtru

```
id  select_type        table  type    key                        rows  Extra
1   PRIMARY            o      range   idx_dt_dokonceni           671   Using index condition; Using where; Using filesort
1   PRIMARY            d      eq_ref  PRIMARY                    1     Using where
1   PRIMARY            u1..u4 eq_ref  PRIMARY                    1     Using where
3   DEPENDENT SUBQUERY pol    ref     objednavka_id              1
4   DEPENDENT SUBQUERY pr     ref     objednavka_id              2
5   DEPENDENT SUBQUERY f      ref     idx_objednavka,idx_aktivni 2     Using where
6   DEPENDENT SUBQUERY k      ref     objednavka_id              6     Using where
```

**Čtení:**
- **Filesort na ORDER BY `dt_objednavky` DESC** – žádný index není k dispozici, MariaDB si musela vybrat `idx_dt_dokonceni` jen na WHERE `aktivni=1 AND id != 1` (což je chybné využití indexu, rows=671 = skoro celá tabulka, Using filesort potvrzuje řazení v RAM).
- Subquery k (komentáře) má `rows=6` – při 4046 komentářích a chybějícím `(objednavka_id, smazano, dt_vytvoreni)` indexu to s rostoucím objemem poroste.
- Na 671 řádcích je odezva ~30–80 ms, na PROD s 10k+ objednávek to bude řádově pomalejší.

### 4.2 LIKE s diakritikou (non-sargable)

```
id  select_type  table  type  key   rows  Extra
1   SIMPLE       o      ALL   NULL  1180  Using where
```

**🔴 FULL TABLE SCAN potvrzen.** `type=ALL`, `key=NULL`, `rows=1180` (celá tabulka včetně neaktivních).
Každé hledání v číslu objednávky, předmětu, dodavateli, emailu = full scan 1180 řádků + cca 15× REPLACE per row + LOWER per row + LIKE `%x%`.

### 4.3 Stats JSON extrakce

```
id  select_type  table  type  key   rows  Extra
1   SIMPLE       o      ALL   NULL  1180  Using where
```

**🔴 Rovněž full table scan.** JSON funkce nejsou indexovatelné přímo. Navíc `YEAR(dt_objednavky) = YEAR(CURDATE())` znemožňuje použití indexu (kdyby existoval na `dt_objednavky`) – nutno přepsat na `dt_objednavky BETWEEN '2026-01-01' AND '2026-12-31'`.

---

## 5. Identifikované problémy (P0–P3)

### 🔴 P0-1: PHP enrichment N+1 (největší dopad)

| Funkce | Dotazy/řádek | Poznámka |
|---|---|---|
| `enrichFinancovaniV3` (`orderV3Handlers.php:430–550`) | 1× smlouva + **1× agregace přes celou tabulku** + N× LP detail | **Plný sken 25a_objednavky per řádek** u SMLOUVA financování |
| `enrichDodavatelV3` (`orderV3Handlers.php:~580`) | 1 | Duplicita – `d` už je v hlavním JOIN |
| `enrichRegistrZverejneniV3` (`orderV3Handlers.php:~610`) | 1 | Duplicita – `u7` už je v JOIN |
| `enrichOrderWithInvoices` (`orderHandlers.php:611`) | 1+ (loadOrderInvoices) | faktury už v subquery `pocet_faktur` + SUM |
| `enrichOrderWithAttachmentStatus` (`orderV3Handlers.php:3206`) | 2–3 (prilohy OBJ + FA IDs + FA prilohy) | Možný bug – tabulka `25a_objednavky_faktury_prilohy` neexistuje |

**Celkem:** 50 objednávek × ~6–8 dotazů = **300–400 extra dotazů/request**; pro `per_page=500` **až 3 000+ dotazů**.

**Nejhorší případ – `enrichFinancovaniV3` full scan** (řádek ~490–510):
```sql
SELECT SUM(CASE WHEN o.max_cena_s_dph > 0 … )
FROM 25a_objednavky o
WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = ?
  AND o.aktivni = 1
  AND o.stav_objednavky IN (?,?,?,?,?)
  AND NOT EXISTS (SELECT 1 FROM 25a_objednavky_faktury f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
```
→ `JSON_EXTRACT` + `IN` + `NOT EXISTS` → **plný sken + korelace**, spouští se pro **každou objednávku se smlouvou** na stránce. Při 10–30 objednávkách se smlouvou = 10–30 full scanů.

---

### 🔴 P0-2: 8 korelovaných subquery v hlavním SELECTu

- `pocet_polozek`, `cena_s_dph`, `pocet_priloh`, `pocet_faktur`, `faktury_celkova_castka_s_dph`
- `comments_count`, `last_comment_author`, `last_comment_date`

50 × 8 = **400 micro-dotazů**. Každý je sám o sobě rychlý (ref index), ale kumulativně přes network round-trip (i interně) přidává 5–20 ms.

---

### 🔴 P0-3: Non-sargable LIKE s normalizací diakritiky

Funkce `sqlNormalizeExpression($col)` generuje:
```
REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(o.cislo_objednavky),'á','a'),'č','c'),'ď','d'),'é','e'),'ě','e'),'í','i'),'ň','n'),'ó','o'),'ř','r'),'š','s'),'ť','t'),'ú','u'),'ů','u'),'ý','y'),'ž','z')
LIKE '%x%'
```

Aplikováno na **8 sloupců současně** (cislo_objednavky, predmet, popis položek, dodavatel_nazev, IČO, adresa, kontakt jmeno, kontakt email) + podobné pro další filtry.
**Důsledek:** `EXPLAIN` ukazuje `type=ALL, key=NULL, rows=1180`.

---

### 🟠 P1-1: Chybějící indexy

(detail v sekci 9)

---

### 🟠 P1-2: Stats query – JSON full scan

Stats query skenuje **celou tabulku** pro kalendářní rok a provádí 13× `JSON_UNQUOTE(JSON_EXTRACT(...))` na každý řádek. Aktuálně 30–60 ms na DEV, s růstem dat poroste lineárně.

Problém: `YEAR(dt_objednavky) = YEAR(CURDATE())` znemožňuje index využít → ale jelikož žádný index na `dt_objednavky` neexistuje, je to jedno.

---

### 🟡 P2-1: `COUNT(DISTINCT o.id)` v count query

```sql
SELECT COUNT(DISTINCT o.id) AS total
FROM 25a_objednavky o
LEFT JOIN 25_dodavatele d …
LEFT JOIN 25_uzivatele u1..u4 …
WHERE $where_sql
```

Všechny JOINy jsou 1:1 přes PK → `DISTINCT` je **zbytečný** a vynucuje deduplikaci. `COUNT(*)` s odstraněním nevyužitých JOINů by stačil.

**POZOR:** Pokud se v kódu jeden z JOINů stane 1:N (např. subquery přes LP nebo položky), `COUNT(*)` začne vracet nafouknuté číslo. Proto je to v současném kódu **záměrná obrana** – nutno opatrně dokumentovat.

---

### 🟡 P2-2: 11 LEFT JOINů na `25_uzivatele`

Joiny přes PK jsou levné (`eq_ref`, rows=1), ale vrací se 5 sloupců × 11 uživatelů = **55 sloupců jen pro lidi**. Optimizer má větší složitost plánu, network payload je větší.

---

### 🟡 P2-3: Over-indexing `25a_objednavky_faktury`

21 indexů. Mnoho duplicit (`idx_aktivni` + `idx_zaplacena_splatnost` začíná stejným bool sloupcem; `idx_fa_zaplacena` duplikuje začátek `idx_zaplacena_splatnost`). Zpomaluje INSERT/UPDATE.

---

### 🟢 P3: Drobnosti
- `error_log` na každém kroku → při PROD zapnutém logu zbytečný I/O
- `handle_order_v3_items` (lazy load) – volá se jen na expand, není kritický
- Tabulka `25a_objednavky_faktury_prilohy` na DEV zřejmě **neexistuje** – funkce `enrichOrderWithAttachmentStatus` pravděpodobně silentně selhává a vrací default barvu. **Bug k ověření samostatně.**

---

## 6. Návrh optimalizace – 3 varianty

### Varianta A – bezpečná, bez DDL (doporučeno začít zde)

Pouze PHP refaktor, žádné změny schématu.

1. **`enrichDodavatelV3` – odstranit**, použít data z JOIN `d` (`d.*` už je v hlavním SELECTu). Jen přemapovat do `_enriched['dodavatel']`.
2. **`enrichRegistrZverejneniV3` – odstranit DB volání**, `u7.*` už je v SELECTu. Celá funkce se zredukuje na mapování polí.
3. **`enrichOrderWithInvoices` – batch**: místo per-order `loadOrderInvoices` udělat **jeden** dotaz `SELECT … FROM 25a_objednavky_faktury WHERE objednavka_id IN (:ids) AND aktivni=1`. V PHP seskupit podle `objednavka_id`.
4. **`enrichOrderWithAttachmentStatus` – batch 2 dotazy**:
   - `SELECT objednavka_id, typ_prilohy FROM 25a_objednavky_prilohy WHERE objednavka_id IN (:ids)`
   - Pro faktury: najít všechna `faktura_id` patřící k `:order_ids`, pak jedno `SELECT faktura_id, typ_prilohy FROM 25a_objednavky_faktury_prilohy WHERE faktura_id IN (:fids)` (resp. ověřit skutečný název tabulky!)
5. **`enrichFinancovaniV3` – batch**:
   - Všechny `cislo_smlouvy` ze stránky: jeden SELECT z `25_smlouvy`.
   - Všechny `lp_kody` agregované do unique seznamu: jeden SELECT z `25_limitovane_prisliby` + JOIN na `25_useky`, `25_uzivatele`.
   - `cerpano_v_procesu` pro všechny smlouvy najednou: `SELECT cislo_smlouvy, SUM(...) ... GROUP BY cislo_smlouvy` (jen 1 full scan místo N).

**Odhad redukce:** 300–400 dotazů → **~10 dotazů**. TTFB -50–70 %.

**Riziko:** Logika v enrichment funkcích se mění – nutné **regresní testy** (ověření, že struktura JSONu v response je shodná).

---

### Varianta B – A + indexy (doporučeno pro plný efekt)

Přidá indexy přes `ALTER TABLE ... ADD INDEX ...` (MariaDB 10.5+: default `ALGORITHM=INPLACE, LOCK=NONE` pokud je to možné – tj. čtení i zápis zůstávají funkční během DDL, pokud je table engine InnoDB).

Viz sekce 9 pro úplný seznam.

**Riziko:**
- Při tvorbě indexu se **dočasně navyšuje IO a paměť** (sortování tmp tablu) – provést **mimo špičku**.
- Některé starší verze MariaDB by mohly spadnout zpět na `LOCK=SHARED` → zamčené zápisy. Na 11.8 je riziko minimální, ale ověřit `SHOW ENGINE INNODB STATUS` během první tvorby na DEV.
- **Ztráta výkonu INSERT/UPDATE** o 1–5 % per index na `25a_objednavky` (u stats queries bude mít tabulka 20+ indexů) – přijatelné, tabulka má <2000 řádků na DEV, tudíž UPDATE je stále v řádu ms.

**Odhad redukce:** A + B = **TTFB -60–80 %** na listingu a **-90 %+** na vyhledávání s diakritikou (pokud nasadíme i `*_norm` sloupce – viz C).

---

### Varianta C – A + B + generované sloupce (maximum)

Přidá do schématu:

1. **`aktualni_stav_kod VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod)-1, ']')))) STORED`** + index.
   - Stats query přepsat na `GROUP BY aktualni_stav_kod` → běh v řádu ms.
2. **`cislo_objednavky_norm VARCHAR(64) GENERATED ALWAYS AS (LOWER(REPLACE(REPLACE(...))))) STORED`** + index.
   - Podobně pro `predmet_norm`, `dodavatel_nazev_norm`.
   - PHP query pak volá `WHERE col_norm LIKE ?` (bez normalizace v SQL) → **index se použije pro prefix**; pro leading-wildcard se nepoužije, ale odstraní overhead REPLACE × LOWER per řádek.
3. (Volitelně) Generovaný sloupec **`cislo_smlouvy VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(financovani, '$.cislo_smlouvy'))) STORED`** + index → `enrichFinancovaniV3 cerpano_v_procesu` pak může `WHERE cislo_smlouvy = ?` s indexem.

**Riziko (vyšší!):**
- `ALTER TABLE ... ADD COLUMN ... GENERATED STORED` na MariaDB **přepíše celou tabulku** → v případě větší PROD tabulky to může trvat **desítky sekund až minuty** a **tabulka je po tu dobu pro zápis zamčená** (v závislosti na verzi – na 10.6+ je to `ALGORITHM=INPLACE` pro STORED, ale check docs).
- **Před nasazením na PROD nutně zálohovat `eeo2025`** (viz `/memories/deployment-rules.md`) a otestovat na DEV.
- Generovaný sloupec `aktualni_stav_kod` – pokud se v budoucnu změní struktura `stav_workflow_kod` JSON, musí se ALTER. V kódu je pak třeba pamatovat, že tento sloupec **nelze zapisovat přímo** (jen přes JSON).
- Indexy na normalizovaných sloupcích mohou mít **inkonzistentní kolaci** s běžnými indexy – nutno použít `utf8mb4_bin` nebo `_ci`, testovat LIKE.

**Odhad:** A+B+C → TTFB **-80–95 %** napříč všemi endpointy, vyhledávání s diakritikou se změní z 500+ ms na <20 ms.

---

## 7. Doporučené indexy (pro variantu B)

> Všechny statementy jsou formulovány pro MariaDB 11.8+. Volba `ALGORITHM=INPLACE, LOCK=NONE` umožňuje tvorbu bez zamčení zápisu (pokud to daná verze podporuje – jinak automaticky fallback).

### 7.1 Kritické (P0/P1)

```sql
-- 25a_objednavky - pokrýt WHERE + default ORDER BY
ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_aktivni_dt_objednavky` (`aktivni`, `dt_objednavky`),
  ALGORITHM=INPLACE, LOCK=NONE;

ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_dodavatel_id` (`dodavatel_id`),
  ALGORITHM=INPLACE, LOCK=NONE;

ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 25a_objednavky_faktury - faktury count + sum
ALTER TABLE `25a_objednavky_faktury`
  ADD INDEX `idx_objednavka_aktivni` (`objednavka_id`, `aktivni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 25a_objednavky_komentare - last comment subquery
ALTER TABLE `25a_objednavky_komentare`
  ADD INDEX `idx_obj_smazano_dt` (`objednavka_id`, `smazano`, `dt_vytvoreni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 25a_objednavky_prilohy - attachment status per typ
ALTER TABLE `25a_objednavky_prilohy`
  ADD INDEX `idx_obj_typ` (`objednavka_id`, `typ_prilohy`),
  ALGORITHM=INPLACE, LOCK=NONE;
```

### 7.2 Volitelné (P1/P2)

```sql
-- Pokud nasadíme variantu C (generated columns):
ALTER TABLE `25a_objednavky`
  ADD COLUMN `aktualni_stav_kod` VARCHAR(64) GENERATED ALWAYS AS (
    JSON_UNQUOTE(JSON_EXTRACT(`stav_workflow_kod`, CONCAT('$[', JSON_LENGTH(`stav_workflow_kod`) - 1, ']')))
  ) STORED,
  ADD INDEX `idx_aktualni_stav_kod` (`aktualni_stav_kod`);
  -- ⚠️ NE-inplace operace; tabulka se přepíše. Spustit v údržbě.

-- Normalizované sloupce pro vyhledávání:
ALTER TABLE `25a_objednavky`
  ADD COLUMN `cislo_objednavky_norm` VARCHAR(128) GENERATED ALWAYS AS (
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(`cislo_objednavky`),
    'á','a'),'č','c'),'ď','d'),'é','e'),'ě','e'),'í','i'),'ň','n'),'ó','o'),
    'ř','r'),'š','s'),'ť','t'),'ú','u'),'ů','u'),'ý','y'),'ž','z')
  ) STORED,
  ADD INDEX `idx_cislo_objednavky_norm` (`cislo_objednavky_norm`);
-- + analogicky pro predmet_norm, dodavatel_nazev_norm
```

### 7.3 Nedělat (nebo prověřit)

- `idx_aktivni` samostatně – bool s cardinality 2, optimizer ho nikdy nepoužije.
- Další indexy na `25a_objednavky_faktury` – už je 21 indexů, přidávat jen dokumentovatelné případy.

---

## 8. 🚨 Rizika a možná poškození fungujícího stavu

### 8.1 Rizika PHP refaktoru (varianta A)

| Riziko | Závažnost | Mitigace |
|---|---|---|
| Změna struktury výstupního JSONu (např. `_enriched.dodavatel` má jiná pole než JOIN `d`) | 🔴 Vysoká | Před refaktorem zaznamenat PŘESNÝ výstup jedné objednávky (curl + jq), po refaktoru diffovat |
| Chybějící null-safe při batch mapování (order bez faktur) | 🟠 Střední | Unit test / integration test s orders bez vazeb |
| Přehozený `objednavka_id` mezi batchi (wrong grouping) | 🔴 Vysoká | Výstupní klíč mapy vždy přes `(int)$row['objednavka_id']`; testy |
| Změna pořadí klíčů v JSON zlomí frontend, pokud se na něj spoléhá | 🟡 Nízká | FE by neměl, ale ověřit |
| `enrichOrderWithAttachmentStatus` – pokud tabulka `25a_objednavky_faktury_prilohy` neexistuje, batch selže hlučně | 🟠 Střední | Wrap v `try/catch`, logovat a neblokovat |

### 8.2 Rizika indexů (varianta B)

| Riziko | Závažnost | Mitigace |
|---|---|---|
| `ALTER TABLE ADD INDEX` na PROD během vysoké zátěže | 🟠 Střední | Spouštět mimo špičku; na MariaDB 11.8 InnoDB je online INPLACE default |
| Tvorba indexu se nepodaří zvolit INPLACE (starší engine/row_format) | 🟠 Střední | Nejprve otestovat DDL na DEV, sledovat `SHOW PROCESSLIST` |
| Duplicitní index nebo překrytí existujícího | 🟡 Nízká | Zkontrolovat `SHOW INDEX FROM` před ADD; tento dokument to již pokrývá |
| Zpomalení INSERT/UPDATE o ~1–5 % per každý nový index | 🟡 Nízká | Objednávka je low-write tabulka (manuální zakládání) |
| Nafouknutí disku (index data ~10–30 % původní tabulky) | 🟡 Nízká | 671 řádků × pár indexů = jednotky MB |
| Optimizer zvolí nový index i tam, kde by starý byl lepší (regresní změna plánu) | 🟠 Střední | Po nasazení změřit TOP 10 pomalých queries (performance_schema) |
| **Nesprávný DROP starého indexu** omylem za správný | 🔴 Vysoká | NIKDY `DROP INDEX` bez explicitního potvrzení + zálohy; v této analýze jen ADD, žádný DROP |

### 8.3 Rizika generovaných sloupců (varianta C)

| Riziko | Závažnost | Mitigace |
|---|---|---|
| `ALTER TABLE … ADD COLUMN GENERATED STORED` – **přepíše celou tabulku**, na větším PROD může trvat minuty | 🔴 **Vysoká** | **VŽDY full backup** PROD DB před operací; spustit v plánované údržbě; otestovat timing na DEV |
| Změna struktury zdrojového JSONu rozbije generovaný sloupec | 🟠 Střední | Dokumentovat závislost; před refaktorem JSON otestovat |
| Zápisy do generovaného sloupce přímo selžou | 🟡 Nízká | Jen pro `STORED` sloupce – v kódu nikdy nepsat do `aktualni_stav_kod` |
| Neplatný kolace při normalizovaných sloupcích → nekonzistentní LIKE výsledky | 🟠 Střední | Specifikovat `CHARACTER SET utf8mb4 COLLATE utf8mb4_bin` u `*_norm` |
| `JSON_EXTRACT` vrací hodnotu se zachovanými uvozovkami – nutné vždy `JSON_UNQUOTE` | 🟠 Střední | Ručně ověřit: `SELECT JSON_EXTRACT('[\"A\",\"B\"]','$[1]')` → `"B"` vs. `JSON_UNQUOTE(JSON_EXTRACT(...))` → `B` |
| Rollback po ALTER ADD COLUMN = další ALTER DROP COLUMN (opět přepis tabulky) | 🟠 Střední | Naplánovat okno; zvážit `INVISIBLE INDEX` nejprve jako dry-run |

### 8.4 Obecná kritická pravidla (z `/memories/deployment-rules.md`)

> ❗ **Před jakoukoli úpravou PROD DB `eeo2025` je POVINNÝ full backup** do `/var/www/__BCK_PRODUKCE/YYYY-MM-DD/`.
> ❗ **Žádný `rsync --delete` při frontend deploymentu.**
> ❗ Testovat VŠE nejprve na `EEO-OSTRA-DEV`.

---

## 9. Rollback plán

### 9.1 Varianta A (PHP refaktor)

```bash
# Git revert jednoho commitu s refaktorem:
cd /var/www/erdms-dev
git log --oneline apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php | head
git revert <commit-hash>
# DEV: okamžité, není potřeba restart
# PROD: re-deploy přes build skript (viz BUILD.md)
```

### 9.2 Varianta B (indexy)

```sql
-- Pro každý přidaný index:
DROP INDEX `idx_aktivni_dt_objednavky` ON `25a_objednavky`;
-- Pozor: stejně re-writes index pages, v průběhu DROP tabulka může být zamčená na okamžik
```

### 9.3 Varianta C (generated columns)

```sql
-- DROP indexu pak DROP sloupce:
DROP INDEX `idx_aktualni_stav_kod` ON `25a_objednavky`;
ALTER TABLE `25a_objednavky` DROP COLUMN `aktualni_stav_kod`;
-- ⚠️ DROP COLUMN opět přepíše tabulku
```

---

## 10. Měření výkonu (before/after)

### 10.1 Session profiling (MariaDB)

```sql
SET profiling = 1;
SET profiling_history_size = 30;

-- spustit testovaný dotaz (např. přes aplikaci nebo přímo mysql)
SELECT … ;

SHOW PROFILES;
-- nebo detailně:
SHOW PROFILE CPU, BLOCK IO FOR QUERY 1;
```

### 10.2 Performance schema (globálně)

```sql
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT/1e9 AS avg_ms, SUM_ROWS_EXAMINED
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE '%25a_objednavky%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

### 10.3 Doporučený postup

1. **Před zásahem:** vyrobit baseline – zavolat 5× endpoint, zaznamenat průměrnou TTFB (Network tab v DevTools) + `SHOW PROFILES`.
2. **Po každé fázi (A, B, C):** stejný test, porovnat.
3. **KPI:**
   - TTFB pro `per_page=50, page=1` bez filtru
   - TTFB pro `per_page=50, page=1` s LIKE `cislo_objednavky=OBJ`
   - TTFB pro stats endpoint
   - Počet SQL dotazů per request (přidat dočasně `PDO::ATTR_STATEMENT_CLASS` counter, nebo `general_log` po dobu 1 minuty v dev).

---

## 11. Fázovaný checklist implementace

### Fáze F1 – Safe PHP refaktor (varianta A)

- [ ] Vytvořit git branch `feature/order-v3-sql-optimization`
- [ ] Vytvořit baseline curl test (cURL + jq) – **snapshot jedné stránky před změnou** do `/tmp/order_v3_before.json`
- [ ] Refaktor `enrichDodavatelV3` – mapování z existujících řádků, bez DB
- [ ] Refaktor `enrichRegistrZverejneniV3` – dtto
- [ ] Refaktor `enrichOrderWithInvoices` – batch `WHERE objednavka_id IN (…)` (s deduplikací IDs)
- [ ] Refaktor `enrichOrderWithAttachmentStatus` – batch (nejdřív ověřit existenci tabulky `25a_objednavky_faktury_prilohy`)
- [ ] Refaktor `enrichFinancovaniV3` – batch LP + Smlouvy + `cerpano_v_procesu` agregace
- [ ] Diff `before.json` vs `after.json` (jq) – rozdíly pouze očekávané (žádné chybějící klíče)
- [ ] Otestovat jako uživatel s různými rolemi (admin / SUPERADMIN / běžný / hierarchy)
- [ ] Změřit TTFB → cíl: **-40 %**

### Fáze F2 – Indexy (varianta B)

- [ ] Na DEV spustit 5 `ALTER TABLE ADD INDEX` z sekce 7.1, sledovat čas
- [ ] Spustit `SHOW PROFILES` na hlavní query → ověřit nový plán (`EXPLAIN`)
- [ ] Regresní test – listing + search + stats
- [ ] Backup PROD DB (`/var/www/__BCK_PRODUKCE/YYYY-MM-DD/`)
- [ ] Aplikovat indexy na PROD v okně údržby
- [ ] Změřit TTFB → cíl: **kumulativně -60–70 % vs baseline**

### Fáze F3 – Generated columns (varianta C, volitelná)

- [ ] Na DEV otestovat `ALTER TABLE ADD COLUMN … GENERATED STORED` timing
- [ ] Ověřit `JSON_EXTRACT` chování na DEV (MariaDB 11.8+)
- [ ] Přepsat stats query na `GROUP BY aktualni_stav_kod`
- [ ] Přepsat `sqlNormalizeExpression` na přímé `col_norm LIKE ?`
- [ ] Backup PROD
- [ ] Aplikovat na PROD v plánované údržbě (delší downtime možný)
- [ ] Změřit → cíl: **kumulativně -80 % vs baseline**, search **-95 %**

---

## 12. Dodatek A – Odhalené bugy při analýze (mimo rozsah)

1. **Subquery pro `last_comment_author`** (`orderV3Handlers.php:1686`):
   ```sql
   SELECT CONCAT(u.jmeno, ' ', u.prijmeni)
   FROM 25a_objednavky_komentare kom
   INNER JOIN 25_uzivatele u ON kom.user_id = u.id
   …
   ```
   ⚠️ V `SHOW INDEX FROM 25a_objednavky_komentare` figuruje sloupec `vlozil_uzivatel_id`, **nikoli `user_id`**. Nutno ověřit, zda je v tabulce i `user_id` (jinak tento subquery padá).

2. **`enrichOrderWithAttachmentStatus`** volá tabulku `TBL_FAKTURY_PRILOHY`, která odpovídá `25a_objednavky_faktury_prilohy`. Ta v DEV `EEO-OSTRA-DEV` **neexistuje** (ověřeno při `SHOW INDEX`). Funkce pravděpodobně **silentně vrací `#cbd5e1`** (default) pro všechny objednávky.

3. **Count query `COUNT(DISTINCT o.id)`** – zbytečné přes PK JOINy, ale také **nepoužije permissions filter efektivně**, protože DISTINCT vynutí materializaci.

---

## 13. Závěr a doporučení

**Doporučuji postup F1 → F2**, fáze F3 jen pokud F1+F2 nepřinesou dostatečný efekt (na DEV s 671 řádky pravděpodobně už F1 stačí, na PROD s většími objemy bude přínos výraznější).

**Před jakoukoli implementací:**
1. Opravit bug s `user_id` vs `vlozil_uzivatel_id` (Dodatek A #1) – jinak se dostaneme do stavu, kdy refaktor nebude ekvivalentní.
2. Zálohovat PROD DB.
3. Na DEV testovat vše kompletně (admin + běžný uživatel + zastupování).
4. Každou fázi nasazovat samostatně, s měřením před/po.

**Žádné změny kódu nebo DB v této analýze nebyly provedeny.**

---

*Konec dokumentu. Vytvořeno: 21.04.2026.*
