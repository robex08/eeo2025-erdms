# VEMA Kontrola & Metadata - Implementační dokumentace

**Datum:** 2026-06-22  
**Autor:** AI Agent  
**Status:** ✅ Implementováno - Backend + SQL

---

## 📋 Přehled

Systém kontroly a metadat pro VEMA importovaná data (faktury, firmy, smlouvy). Umožňuje:
- ✅ Evidenci kontrolních záznamů
- ✅ Poznámky ke kontrole
- ✅ Statusy kontroly (nezkontrolováno, zkontrolováno, má problém...)
- ✅ Rozšiřitelná metadata přes JSON
- ✅ Provázání přes **VEMA ID** (ne naše auto_increment ID!)

---

## 🗄️ Databázová struktura

### Tabulka: `25v_kontrola_metadata`

```sql
-- Umístění SQL: /var/www/erdms-dev/apps/eeo-v2/_sql/25v_kontrola_metadata.sql

Sloupce:
- id (int, AI) - interní ID
- typ_zaznamu (enum) - 'faktura', 'firma', 'smlouva'
- vema_id (varchar) - ID z VEMA (firma/cfak/csml) ⚠️ KRITICKÉ!
- vema_id_secondary (varchar) - sekundární VEMA ID (např. firma u faktury)
- kontrola_status (enum) - 'nezkontrolovano', 'v_kontrole', 'zkontrolovano', 'ma_problem', 'pozastaveno'
- priorita (tinyint) - 0=normální, 1=vysoká, 2=kritická
- poznamka (text) - poznámka ke kontrole
- kontroloval_uzivatel_id (int) - kdo zkontroloval
- dt_kontroly (datetime) - datum kontroly
- metadata_json (longtext) - rozšiřitelná metadata
- vytvoril_uzivatel_id (int)
- dt_vytvoreni (datetime)
- upravil_uzivatel_id (int)
- dt_upravy (datetime)

Indexy:
- UNIQUE KEY (typ_zaznamu, vema_id) - jeden záznam na VEMA ID
- KEY idx_typ_zaznamu
- KEY idx_vema_id
- KEY idx_kontrola_status
- KEY idx_kontroloval
- KEY idx_dt_kontroly
```

### ⚠️ DŮLEŽITÉ - Proč VEMA ID a ne naše ID?

**Problém:** Pokud uděláme reimport VEMA dat, naše `auto_increment` ID se mohou změnit (záznamy se mažou a znovu vytváří).

**Řešení:** Ukládáme **VEMA ID** (firma/cfak/csml), která jsou stabilní a nemění se.

Příklady VEMA ID:
- **Firmy:** `firma` sloupec (např. "28460634")
- **Faktury:** `cfak` sloupec (např. "260698") + firma
- **Smlouvy:** `csml` sloupec (např. "72026") + firma

---

## 🔌 Backend API Endpointy

**Umístění:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/vemaKontrolaHandlers.php`

### 1. GET - Načíst kontrolu

```
POST /api.eeo/vema-kontrola/get

Body:
{
  "token": "...",
  "username": "...",
  "typ_zaznamu": "faktura",  // faktura|firma|smlouva
  "vema_id": "260698"         // VEMA ID (cfak/firma/csml)
}

Response 200:
{
  "status": "success",
  "data": {
    "id": 1,
    "typ_zaznamu": "faktura",
    "vema_id": "260698",
    "kontrola_status": "zkontrolovano",
    "poznamka": "Všechno OK",
    "priorita": 0,
    "kontroloval_uzivatel_id": 5,
    "kontroloval_jmeno": "Jan",
    "kontroloval_prijmeni": "Novák",
    "dt_kontroly": "2026-06-22 14:30:00",
    "metadata": { ... }  // dekódovaný JSON
  },
  "message": "Kontrola načtena"
}

Response 200 (neexistuje):
{
  "status": "success",
  "data": null,
  "message": "Kontrola neexistuje"
}
```

### 2. SAVE - Uložit/aktualizovat kontrolu

```
POST /api.eeo/vema-kontrola/save

Body:
{
  "token": "...",
  "username": "...",
  "typ_zaznamu": "faktura",
  "vema_id": "260698",
  "vema_id_secondary": "28460634",  // volitelné - firma u faktury
  "kontrola_status": "zkontrolovano",  // nezkontrolovano|v_kontrole|zkontrolovano|ma_problem|pozastaveno
  "priorita": 0,  // 0=normální, 1=vysoká, 2=kritická
  "poznamka": "Kontrola OK, částka souhlasí",
  "metadata": {  // volitelné - libovolná struktura
    "financni_kontrola": {
      "castka_ok": true,
      "prilohy_ok": true
    }
  }
}

Response 200:
{
  "status": "success",
  "data": { "id": 1 },
  "message": "Kontrola vytvořena úspěšně"  // nebo "aktualizována"
}
```

**Logika:**
- Pokud kontrola s daným `(typ_zaznamu, vema_id)` existuje → **UPDATE**
- Pokud neexistuje → **INSERT**
- Automaticky se nastaví `kontroloval_uzivatel_id` a `dt_kontroly`

### 3. LIST - Seznam kontrol

```
POST /api.eeo/vema-kontrola/list

Body:
{
  "token": "...",
  "username": "...",
  "typ_zaznamu": "faktura",  // volitelné
  "kontrola_status": "ma_problem",  // volitelné
  "limit": 100,  // volitelné (default 100)
  "offset": 0    // volitelné (default 0)
}

Response 200:
{
  "status": "success",
  "data": [
    { ... kontrola 1 ... },
    { ... kontrola 2 ... }
  ],
  "count": 2,
  "message": "Seznam kontrol načten"
}
```

### 4. STATS - Statistiky kontrol

```
POST /api.eeo/vema-kontrola/stats

Body:
{
  "token": "...",
  "username": "...",
  "typ_zaznamu": "faktura"  // volitelné
}

Response 200:
{
  "status": "success",
  "data": [
    { "kontrola_status": "nezkontrolovano", "pocet": 45 },
    { "kontrola_status": "zkontrolovano", "pocet": 120 },
    { "kontrola_status": "ma_problem", "pocet": 3 }
  ],
  "message": "Statistiky načteny"
}
```

---

## 🎨 Frontend (TODO)

**Umístění:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/VemaDenik.js`

### Plán implementace:

1. **Nový sloupec "Kontrola"** na konci každé tabulky (Firmy, Faktury, Smlouvy)
2. **Ikona se statusem:**
   - 🔍 Nezkontrolováno (šedá)
   - ⏳ V kontrole (modrá)
   - ✅ Zkontrolováno (zelená)
   - ⚠️ Má problém (červená)
3. **Kliknutí na ikonu** → otevře modal s formulářem
4. **Modal obsahuje:**
   - Dropdown: Status kontroly
   - Textarea: Poznámka
   - Radio buttons: Priorita (normální/vysoká/kritická)
   - Zobrazení: Kdo kontroloval + datum
   - Tlačítka: Uložit / Zrušit

### Příklad kódu (NÁVRH):

```javascript
// Nový sloupec pro faktury
{
  accessorKey: 'kontrola',
  header: 'Kontrola',
  size: 100,
  cell: info => {
    const row = info.row.original;
    const vema_id = row.cfak;  // nebo row.firma, row.csml
    
    return (
      <KontrolaCell 
        typZaznamu="faktura"
        vemaId={vema_id}
        vemaIdSecondary={row.firma}
      />
    );
  }
}

// Komponenta KontrolaCell
const KontrolaCell = ({ typZaznamu, vemaId, vemaIdSecondary }) => {
  const [kontrola, setKontrola] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  useEffect(() => {
    // Načíst kontrolu z API
    fetchKontrola(typZaznamu, vemaId).then(setKontrola);
  }, [typZaznamu, vemaId]);
  
  const statusIcon = {
    'nezkontrolovano': { icon: '🔍', color: '#94a3b8' },
    'v_kontrole': { icon: '⏳', color: '#3b82f6' },
    'zkontrolovano': { icon: '✅', color: '#22c55e' },
    'ma_problem': { icon: '⚠️', color: '#ef4444' },
    'pozastaveno': { icon: '⏸️', color: '#f59e0b' }
  };
  
  const status = kontrola?.kontrola_status || 'nezkontrolovano';
  const { icon, color } = statusIcon[status];
  
  return (
    <>
      <span 
        onClick={() => setModalOpen(true)}
        style={{ cursor: 'pointer', fontSize: '1.5em', color }}
        title={`Kontrola: ${status}`}
      >
        {icon}
      </span>
      
      {modalOpen && (
        <KontrolaModal
          kontrola={kontrola}
          typZaznamu={typZaznamu}
          vemaId={vemaId}
          vemaIdSecondary={vemaIdSecondary}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            // Refresh data
            fetchKontrola(typZaznamu, vemaId).then(setKontrola);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
};
```

---

## 🔒 Bezpečnost

✅ **Autentizace:** Všechny endpointy vyžadují token + username  
✅ **Validace:** Kontrola povinných parametrů  
✅ **SQL Injection:** Prepared statements  
✅ **Timezone:** Automatické nastavení české timezone  
✅ **Error handling:** Try-catch s logováním  

---

## 📊 Příklady použití metadat

```json
{
  "financni_kontrola": {
    "castka_souhlasi": true,
    "prilohy_prirazeny": false,
    "poznamka": "Chybí sken faktury"
  },
  "pravni_kontrola": {
    "smlouva_ok": true,
    "datum_kontroly": "2026-06-22"
  },
  "duplicita": {
    "je_duplicita": true,
    "duplicitni_s_id": "12345",
    "reseni": "spojit_zaznamy"
  },
  "vlastni_tagy": ["urgentni", "vip_zakaznik", "reklamace"]
}
```

---

## 🚀 Instalace

1. **SQL:**
   ```bash
   mysql eeo2025-dev < /var/www/erdms-dev/apps/eeo-v2/_sql/25v_kontrola_metadata.sql
   ```

2. **Backend:** Již je součástí `api.php` (automaticky načítá handlery)

3. **Frontend:** Implementace TODO (viz výše)

---

## ✅ Status implementace

- [x] SQL tabulka vytvořena
- [x] Backend API endpointy (4x)
- [x] Integrace do api.php
- [x] Dokumentace
- [ ] Frontend sloupec "Kontrola" (TODO)
- [ ] Frontend modal pro editaci (TODO)
- [ ] Frontend komponenta KontrolaCell (TODO)
- [ ] Testování (TODO)

---

## 📝 Poznámky

- **VEMA ID stabilita:** Systém je odolný proti reimportům (používá VEMA ID)
- **Rozšiřitelnost:** metadata_json umožňuje přidávat další data bez změny DB struktury
- **Multi-type:** Podporuje firmy, faktury, smlouvy + lze přidat další typy
- **Unique constraint:** Jeden záznam kontroly na jedno VEMA ID
- **Upsert logika:** Automatická detekce INSERT vs UPDATE
