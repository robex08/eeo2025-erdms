# Analýza faktur ve spisovce (databáze spisovka350)

**Datum analýzy:** 8. prosince 2025  
**Databáze:** `spisovka350` na serveru `10.1.1.253`  
**Tabulka:** `dokument`

## 📊 Základní statistiky

### Celkový počet faktur
- **Celkem dokumentů typu "faktura":** 26 808
- **Kritérium:** `nazev LIKE 'fa č. %'`

### Rozdělení podle roku

| Rok  | Počet faktur |
|------|--------------|
| 2025 | 3 972        |
| 2024 | 3 971        |
| 2023 | 3 102        |
| 2022 | 3 021        |
| 2021 | 2 636        |
| 2020 | 3 464        |
| 2019 | 3 535        |
| 2018 | 3 106        |
| 2009 | 1            |

### Stavy faktur

| Stav | Počet  | Popis           |
|------|--------|-----------------|
| 5    | 26 803 | Vyřízeno        |
| 6    | 5      | Neznámý stav    |

## 🔍 SQL dotazy pro filtrování faktur

### 1. Základní filtr - všechny faktury
```sql
SELECT * 
FROM dokument 
WHERE nazev LIKE 'fa č. %'
ORDER BY id DESC;
```

### 2. Faktury za aktuální rok (2025)
```sql
SELECT 
    id,
    jid,
    nazev,
    cislo_jednaci,
    datum_vzniku,
    datum_vyrizeni,
    stav
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND YEAR(datum_vzniku) = 2025
ORDER BY datum_vzniku DESC;
```

### 3. Počet faktur podle roku
```sql
SELECT 
    YEAR(datum_vzniku) as rok, 
    COUNT(*) as pocet 
FROM dokument 
WHERE nazev LIKE 'fa č. %' 
GROUP BY YEAR(datum_vzniku) 
ORDER BY rok DESC;
```

### 4. Faktury s detailem vlastníka
```sql
SELECT 
    d.id,
    d.jid,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku,
    d.stav,
    d.owner_user_id,
    d.owner_orgunit_id
FROM dokument d
WHERE d.nazev LIKE 'fa č. %'
ORDER BY d.id DESC
LIMIT 50;
```

### 5. Nevyřízené faktury
```sql
SELECT 
    id,
    jid,
    nazev,
    cislo_jednaci,
    datum_vzniku,
    lhuta,
    stav
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND stav != 5
ORDER BY datum_vzniku DESC;
```

### 6. Faktury podle střediska (z popisu)
```sql
SELECT 
    id,
    nazev,
    cislo_jednaci,
    datum_vzniku,
    CASE 
        WHEN nazev LIKE '%ZZS KL%' THEN 'Kladno'
        WHEN nazev LIKE '%ZZS RA%' THEN 'Rakovník'
        WHEN nazev LIKE '%ZZS BE%' THEN 'Beroun'
        WHEN nazev LIKE '%ZZS KO%' THEN 'Kolín'
        WHEN nazev LIKE '%ZZS MB%' THEN 'Mladá Boleslav'
        WHEN nazev LIKE '%ZZS NB%' THEN 'Nymburk'
        WHEN nazev LIKE '%ZZS PB%' THEN 'Příbram'
        ELSE 'Neurčeno'
    END as stredisko
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND YEAR(datum_vzniku) = 2025
ORDER BY datum_vzniku DESC;
```

### 7. Faktury s hodnotou z pole popis (pokud obsahuje částku)
```sql
SELECT 
    id,
    nazev,
    cislo_jednaci,
    datum_vzniku,
    LEFT(popis, 200) as popis_kratky
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND popis IS NOT NULL
  AND popis != ''
ORDER BY datum_vzniku DESC
LIMIT 100;
```

### 8. Měsíční statistika faktur pro rok 2025
```sql
SELECT 
    MONTH(datum_vzniku) as mesic,
    COUNT(*) as pocet_faktur
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND YEAR(datum_vzniku) = 2025
GROUP BY MONTH(datum_vzniku)
ORDER BY mesic;
```

### 9. Faktury s časovou analýzou vyřízení
```sql
SELECT 
    id,
    nazev,
    datum_vzniku,
    datum_vyrizeni,
    DATEDIFF(datum_vyrizeni, datum_vzniku) as dnu_do_vyrizeni
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND datum_vyrizeni IS NOT NULL
  AND YEAR(datum_vzniku) = 2025
ORDER BY dnu_do_vyrizeni DESC
LIMIT 50;
```

### 10. Full-text vyhledávání v názvech faktur
```sql
SELECT 
    id,
    nazev,
    cislo_jednaci,
    datum_vzniku
FROM dokument 
WHERE nazev LIKE 'fa č. %'
  AND nazev LIKE '%léky%'
ORDER BY datum_vzniku DESC;
```

## 📝 Příklad reálných záznamů (poslední faktury)

```
ID: 108116 | JID: OSS-83460-ESS-108116 | fa č. 20251447 rám podvozku ZZS Beroun
ID: 108115 | JID: OSS-83460-ESS-108115 | fa č. 20251446 kluzná folie ZZS BE
ID: 108114 | JID: OSS-83460-ESS-108114 | fa č. 250087 úpravca PD při provádění stavby ZZS NB
ID: 108113 | JID: OSS-83460-ESS-108113 | fa č. FV10625/80537 pracovnělékařské služby ZZS KO
ID: 108111 | JID: OSS-83460-ESS-108111 | fa č. 42025823 nájem NP ZZS RA
```

## 🔗 Struktura klíčových polí

### Název faktury (pattern)
```
fa č. [ČÍSLO_FAKTURY] [POPIS] [STŘEDISKO]
```

Příklady:
- `fa č. 20251447 rám podvozku ZZS Beroun`
- `fa č. 2567351668 léky`
- `fa č. FV10625/80537 pracovnělékařské služby ZZS KO`

### JID (Jednací identifikátor)
```
OSS-83460-ESS-[ID_DOKUMENTU]
```

### Číslo jednací
```
ZZSSK/[PORADOVE_CISLO]/[ROK]
```
Příklad: `ZZSSK/015576/2025`

## 🎯 Možnosti integrace do EEO v2

### 1. Read-only přístup k fakturám
- Zobrazení seznamu faktur
- Detail faktury z spisovky
- Odkazy na přílohy (pokud existují)

### 2. Synchronizace metadat
- Import čísla jednacího do faktury v EEO
- Vazba na JID spisovky

### 3. Reporting
- Statistiky faktur podle období
- Přehled podle středisek
- Analýza lhůt vyřízení

## 📌 Poznámky

1. **Všechny faktury mají stav 5 (vyřízeno)** - pouze 5 výjimek
2. **JID je unikátní** identifikátor dokumentu
3. **Číslo jednací** se generuje automaticky (podací deník)
4. **Datum vzniku** != datum přidání do spisovky
5. **Střediska** jsou v názvu faktury jako zkratky (ZZS KL, ZZS RA, atd.)

## 📎 Vazba na přílohy (FILES)

### Struktura vazby
```
dokument (id) 
    ↓
dokument_to_file (dokument_id, file_id, active)
    ↓
file (id, nazev, real_name, real_path, mime_type, size)
```

### Tabulka: dokument_to_file
| Pole        | Typ              | Popis                          |
|-------------|------------------|--------------------------------|
| id          | int(11)          | PK, auto_increment             |
| dokument_id | int(11)          | FK → dokument.id               |
| file_id     | int(11)          | FK → file.id                   |
| user_id     | int(10) unsigned | Uživatel, který přidal přílohu |
| active      | tinyint(4)       | 1 = aktivní, 0 = smazáno       |
| date_added  | datetime         | Datum přidání                  |

### Tabulka: file
| Pole          | Typ              | Popis                           |
|---------------|------------------|---------------------------------|
| id            | int(11)          | PK, auto_increment              |
| stav          | tinyint(4)       | Stav souboru (1 = aktivní)      |
| nazev         | varchar(255)     | Název souboru v systému         |
| popis         | varchar(255)     | Popis souboru                   |
| mime_type     | varchar(100)     | MIME typ (application/pdf, ...) |
| real_name     | varchar(255)     | Původní název souboru           |
| real_path     | varchar(255)     | Cesta k souboru na disku        |
| date_created  | datetime         | Datum vytvoření                 |
| user_created  | int(10) unsigned | Uživatel, který vytvořil        |
| date_modified | datetime         | Datum poslední změny            |
| user_modified | int(10) unsigned | Uživatel, který změnil          |
| guid          | varchar(45)      | Globálně unikátní identifikátor |
| md5_hash      | varchar(45)      | MD5 hash souboru                |
| size          | int(11)          | Velikost v bajtech              |

### 📊 Statistiky příloh

- **Faktury s přílohami:** 7 831 z 26 808 (29,2%)
- **Celkem příloh:** 17 765

#### Rozdělení podle počtu příloh
| Počet příloh | Počet faktur |
|--------------|--------------|
| 1            | 2 665        |
| 2            | 3 135        |
| 3            | 1 137        |
| 4            | 460          |
| 5+           | 434          |

#### Typy souborů (MIME types)
| MIME Type                     | Počet   |
|-------------------------------|---------|
| application/pdf               | 10 741  |
| text/plain                    | 5 060   |
| image/png                     | 868     |
| application/xml               | 408     |
| image/jpeg                    | 271     |
| audio/x-mp4a-latm             | 187     |
| Excel (xlsx)                  | 60      |
| Ostatní                       | 170     |

## 🔍 SQL dotazy s JOIN (včetně příloh)

### 11. Faktury s přílohami - kompletní informace
```sql
SELECT 
    d.id as dokument_id,
    d.jid,
    d.nazev as faktura,
    d.cislo_jednaci,
    d.datum_vzniku,
    f.id as file_id,
    f.nazev as file_nazev,
    f.real_name,
    f.real_path,
    f.mime_type,
    f.size,
    f.md5_hash,
    dtf.date_added as priloha_pridana
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
  AND YEAR(d.datum_vzniku) = 2025
ORDER BY d.id DESC, dtf.date_added DESC;
```

### 12. Počet příloh pro každou fakturu
```sql
SELECT 
    d.id,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku,
    COUNT(dtf.file_id) as pocet_priloh
FROM dokument d
LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
WHERE d.nazev LIKE 'fa č. %'
  AND YEAR(d.datum_vzniku) = 2025
GROUP BY d.id
ORDER BY pocet_priloh DESC;
```

### 13. Faktury BEZ příloh
```sql
SELECT 
    d.id,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku
FROM dokument d
LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.id IS NULL
  AND YEAR(d.datum_vzniku) = 2025
ORDER BY d.datum_vzniku DESC;
```

### 14. Faktury pouze s PDF přílohami
```sql
SELECT 
    d.id,
    d.nazev,
    d.cislo_jednaci,
    GROUP_CONCAT(f.real_name SEPARATOR '; ') as pdf_soubory,
    COUNT(f.id) as pocet_pdf
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
  AND f.mime_type = 'application/pdf'
  AND YEAR(d.datum_vzniku) = 2025
GROUP BY d.id
ORDER BY pocet_pdf DESC;
```

### 15. Detail konkrétní faktury s přílohami (podle ID)
```sql
SELECT 
    d.id as dokument_id,
    d.jid,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku,
    d.datum_vyrizeni,
    d.popis,
    f.id as file_id,
    f.nazev as file_nazev,
    f.real_name,
    f.real_path,
    f.mime_type,
    ROUND(f.size / 1024, 2) as size_kb,
    f.md5_hash,
    dtf.date_added as priloha_pridana,
    dtf.user_id as pridal_user_id
FROM dokument d
LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
LEFT JOIN file f ON dtf.file_id = f.id
WHERE d.id = 108116;
```

### 16. Statistika velikosti příloh podle faktur
```sql
SELECT 
    d.id,
    d.nazev,
    COUNT(f.id) as pocet_priloh,
    SUM(f.size) as celkova_velikost_bytes,
    ROUND(SUM(f.size) / 1024 / 1024, 2) as celkova_velikost_mb,
    ROUND(AVG(f.size) / 1024, 2) as prumerna_velikost_kb
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
  AND YEAR(d.datum_vzniku) = 2025
GROUP BY d.id
HAVING SUM(f.size) > 1048576  -- větší než 1 MB
ORDER BY celkova_velikost_bytes DESC;
```

### 17. Typy příloh u faktur (podle MIME)
```sql
SELECT 
    f.mime_type,
    COUNT(*) as pocet,
    ROUND(SUM(f.size) / 1024 / 1024, 2) as celkova_velikost_mb
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
GROUP BY f.mime_type
ORDER BY pocet DESC;
```

### 18. Najdi duplicitní přílohy podle MD5 hash
```sql
SELECT 
    f.md5_hash,
    f.real_name,
    COUNT(DISTINCT d.id) as pouzito_u_faktur,
    GROUP_CONCAT(DISTINCT d.id SEPARATOR ', ') as faktury_ids
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
GROUP BY f.md5_hash
HAVING COUNT(DISTINCT d.id) > 1
ORDER BY pouzito_u_faktur DESC;
```

### 19. Příklad reálného záznamu s přílohami
```sql
-- Faktura ID 108116 s přílohami
-- fa č. 20251447 rám podvozku ZZS Beroun
-- JID: OSS-83460-ESS-108116
-- Příloha: Prodej - faktura_20251447_20251208_143822.pdf (74 KB)
```

### 20. Full export faktury s přílohami (pro API)
```sql
SELECT 
    d.id,
    d.jid,
    d.nazev,
    d.popis,
    d.cislo_jednaci,
    d.datum_vzniku,
    d.datum_vyrizeni,
    d.stav,
    d.owner_user_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'file_id', f.id,
            'nazev', f.nazev,
            'real_name', f.real_name,
            'real_path', f.real_path,
            'mime_type', f.mime_type,
            'size', f.size,
            'md5_hash', f.md5_hash,
            'date_added', dtf.date_added
        )
    ) as prilohy
FROM dokument d
LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
LEFT JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND d.id = 108116
GROUP BY d.id;
```

### 21. Generování download URL pro přílohy ⭐
```sql
SELECT 
    d.id as dokument_id,
    d.jid,
    d.nazev as faktura,
    d.cislo_jednaci,
    f.id as file_id,
    f.real_name,
    f.mime_type,
    ROUND(f.size / 1024, 2) as size_kb,
    CONCAT(
        'https://spisovka.zachranka.cz/dokumenty/',
        d.id,
        '/download?file=',
        f.id
    ) as download_url
FROM dokument d
INNER JOIN dokument_to_file dtf ON d.id = dtf.dokument_id
INNER JOIN file f ON dtf.file_id = f.id
WHERE d.nazev LIKE 'fa č. %'
  AND dtf.active = 1
  AND YEAR(d.datum_vzniku) = 2025
ORDER BY d.id DESC;
```

**URL Pattern:**
```
https://spisovka.zachranka.cz/dokumenty/{dokument_id}/download?file={file_id}
```

**Příklad:**
```
Dokument: 108116
File: 206425
URL: https://spisovka.zachranka.cz/dokumenty/108116/download?file=206425
```

### 22. JSON API Response formát (s download URL)
```sql
SELECT 
    d.id,
    d.jid,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku,
    JSON_OBJECT(
        'dokument_id', d.id,
        'jid', d.jid,
        'nazev', d.nazev,
        'cislo_jednaci', d.cislo_jednaci,
        'datum_vzniku', d.datum_vzniku,
        'prilohy', (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'file_id', f.id,
                    'nazev', f.real_name,
                    'mime_type', f.mime_type,
                    'size', f.size,
                    'download_url', CONCAT(
                        'https://spisovka.zachranka.cz/dokumenty/',
                        d.id,
                        '/download?file=',
                        f.id
                    )
                )
            )
            FROM dokument_to_file dtf
            INNER JOIN file f ON dtf.file_id = f.id
            WHERE dtf.dokument_id = d.id
              AND dtf.active = 1
        )
    ) as json_data
FROM dokument d
WHERE d.nazev LIKE 'fa č. %'
  AND d.id = 108116;
```

## 🌐 Integrace s EEO v2 - Download URL

### URL struktura pro stahování příloh

**Base URL:**
```
https://spisovka.zachranka.cz
```

**Endpoint pattern:**
```
/dokumenty/{dokument_id}/download?file={file_id}
```

### Příklady reálných URL

```
https://spisovka.zachranka.cz/dokumenty/108116/download?file=206425
https://spisovka.zachranka.cz/dokumenty/108115/download?file=206423
https://spisovka.zachranka.cz/dokumenty/108114/download?file=206419
```

### HTTP Response

```
HTTP/1.1 200 OK
Server: Apache/2.2.22 (Debian)
X-Powered-By: Nette Framework
Content-Type: application/pdf (nebo jiný MIME type)
```

### Implementace v React komponente

```javascript
// Generování download URL
const generateDownloadUrl = (dokumentId, fileId) => {
  return `https://spisovka.zachranka.cz/dokumenty/${dokumentId}/download?file=${fileId}`;
};

// Příklad použití
const downloadUrl = generateDownloadUrl(108116, 206425);
// https://spisovka.zachranka.cz/dokumenty/108116/download?file=206425
```

### SQL dotaz pro React API endpoint

```sql
-- Endpoint: GET /api/spisovka/faktury/:id
SELECT 
    d.id,
    d.jid,
    d.nazev,
    d.cislo_jednaci,
    d.datum_vzniku,
    d.datum_vyrizeni,
    d.stav,
    f.id as file_id,
    f.real_name as filename,
    f.mime_type,
    f.size,
    CONCAT(
        'https://spisovka.zachranka.cz/dokumenty/',
        d.id,
        '/download?file=',
        f.id
    ) as download_url
FROM dokument d
LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
LEFT JOIN file f ON dtf.file_id = f.id
WHERE d.id = ?;  -- parametr z URL
```

### Node.js API Response Format

```javascript
{
  "id": 108116,
  "jid": "OSS-83460-ESS-108116",
  "nazev": "fa č. 20251447 rám podvozku ZZS Beroun",
  "cislo_jednaci": "ZZSSK/015576/2025",
  "datum_vzniku": "2025-12-08T14:39:55.000Z",
  "datum_vyrizeni": "2025-12-08T15:03:56.000Z",
  "stav": 5,
  "prilohy": [
    {
      "file_id": 206425,
      "filename": "Prodej - faktura_20251447_20251208_143822.pdf",
      "mime_type": "application/pdf",
      "size": 74351,
      "size_kb": 72.61,
      "download_url": "https://spisovka.zachranka.cz/dokumenty/108116/download?file=206425"
    }
  ]
}
```

## 🔐 Přístupové údaje

### Databáze (READ-ONLY)
```
Host: 10.1.1.253
User: erdms_spis
Password: SpisRO2024!
Database: spisovka350
```

**Oprávnění:** SELECT only

### Spisovka Web (Download)
```
URL: https://spisovka.zachranka.cz
Autentizace: Vyžaduje session (cookies)
```

**Poznámka:** Download endpoint vyžaduje aktivní session v spisovce. Pro API integraci bude potřeba:
1. Session sharing mezi aplikacemi
2. Nebo proxy endpoint v EEO API s autentizací
