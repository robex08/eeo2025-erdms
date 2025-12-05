# 📘 SMLOUVY API - Dokumentace pro Frontend

**Verze:** 1.1 (OPRAVENO)  
**Datum:** 23. listopadu 2025  
**Backend:** PHP 5.6 + MySQL 5.5.43  
**Base URL:** `https://eeo.zachranka.cz/api.eeo/`

---

## ⚠️ DŮLEŽITÁ UPOZORNĚNÍ - AKTUALIZACE DB STRUKTURY

**Poslední změna:** 23. listopadu 2025

### ✅ **PLATNÁ POLE (aktuální DB struktura):**

| Pole | Typ | Popis |
|------|-----|-------|
| `cislo_smlouvy` | string | Číslo smlouvy (unique) |
| `usek_id` | integer | ID útvaru |
| `usek_zkr` | string | Zkratka útvaru |
| `druh_smlouvy` | enum | SLUŽBY / KUPNÍ / RÁMCOVÁ |
| `nazev_firmy` | string | ✏️ Název dodavatele |
| `ico` | string | ✏️ IČO (8 číslic) |
| `dic` | string | ✅ DIČ (volitelné) |
| `nazev_smlouvy` | string | Název/předmět smlouvy |
| `popis_smlouvy` | text | Popis smlouvy |
| `platnost_od` | date | Začátek platnosti |
| `platnost_do` | date | Konec platnosti |
| `hodnota_bez_dph` | decimal | ✅ Hodnota bez DPH |
| `hodnota_s_dph` | decimal | ✏️ Hodnota s DPH (dříve `castka_celkem`) |
| `sazba_dph` | decimal | ✅ Sazba DPH (0/12/15/21) |
| `cerpano_celkem` | decimal | Čerpáno celkem (auto) |
| `zbyva` | decimal | Zbývá (auto) |
| `procento_cerpani` | decimal | % čerpání (auto) |
| `aktivni` | boolean | Aktivní/smazáno |
| `stav` | enum | ✅ AKTIVNI / UKONCENA / PRERUSENA / PRIPRAVOVANA |
| `poznamka` | text | Interní poznámka |
| `cislo_dms` | string | ✅ Číslo v DMS systému |
| `kategorie` | string | ✅ Kategorie smlouvy |
| `dt_vytvoreni` | datetime | Datum vytvoření |
| `dt_aktualizace` | datetime | Datum poslední změny |
| `vytvoril_user_id` | integer | ID uživatele, který vytvořil |
| `upravil_user_id` | integer | ID uživatele, který naposledy upravil |
| `posledni_prepocet` | datetime | Datum posledního přepočtu čerpání |

### ❌ **ODSTRANĚNÁ POLE:**
- ~~`zpusob_financovani`~~ - **SMAZÁNO z DB**
- ~~`dodavatel`~~ - **přejmenováno na `nazev_firmy`**
- ~~`ico_dodavatele`~~ - **přejmenováno na `ico`**
- ~~`castka_celkem`~~ - **přejmenováno na `hodnota_s_dph`**

---

## 🔐 Autentizace

Všechny endpointy vyžadují:
```json
{
  "username": "uzivatelske_jmeno",
  "token": "authentifikacni_token"
}
```

---

## 📋 Oprávnění (Permissions)

| Kód práva | Popis | Potřeba pro endpoint |
|-----------|-------|---------------------|
| `CONTRACT_VIEW` | Zobrazení seznamu a detailu | `/list`, `/detail` |
| `CONTRACT_CREATE` | Vytváření nových smluv | `/insert` |
| `CONTRACT_EDIT` | Editace existujících smluv | `/update`, `/prepocet-cerpani` |
| `CONTRACT_DELETE` | Smazání smluv | `/delete` |
| `CONTRACT_IMPORT` | Hromadný import | `/bulk-import` |

---

## 🌐 API Endpointy

### 1️⃣ Seznam smluv - `POST /ciselniky/smlouvy/list`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  
  // Filtry (všechny volitelné)
  "show_inactive": false,
  "usek_id": 5,
  "druh_smlouvy": "SLUŽBY",
  "stav": "AKTIVNI",
  "search": "Nemocnice",
  "platnost_od": "2025-01-01",
  "platnost_do": "2025-12-31",
  
  // Paginace
  "limit": 1000,
  "offset": 0
}
```

#### Response
```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_id": 10,
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "dic": null,
      "nazev_smlouvy": "Smlouva o poskytování poradenských služeb",
      "popis_smlouvy": "Smlouva o poskytování poradenských a konzultačních služeb",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00,
      "sazba_dph": 21.00,
      "cerpano_celkem": 150000.00,
      "zbyva": 455000.00,
      "procento_cerpani": 24.79,
      "aktivni": 1,
      "stav": "AKTIVNI",
      "dt_vytvoreni": "2025-11-23T10:00:00",
      "dt_aktualizace": "2025-11-23T10:00:00",
      "vytvoril_user_id": 1,
      "upravil_user_id": null,
      "posledni_prepocet": "2025-11-23T09:30:00",
      "poznamka": null,
      "cislo_dms": null,
      "kategorie": null,
      "pocet_objednavek": 3
    }
  ],
  "meta": {
    "total": 45,
    "limit": 1000,
    "offset": 0,
    "returned": 45
  }
}
```

---

### 2️⃣ Detail smlouvy - `POST /ciselniky/smlouvy/detail`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  "id": 1
}
```

#### Response
```json
{
  "status": "ok",
  "data": {
    "smlouva": {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      // ... všechna pole jako v /list
    },
    "objednavky": [
      {
        "id": 123,
        "ev_cislo": "2025/001",
        "predmet": "Konzultace ekonomika",
        "castka_s_dph": 50000.00,
        "dt_prirazeni": "2025-11-01T10:00:00",
        "stav": "SCHVALENA"
      }
    ],
    "statistiky": {
      "pocet_objednavek": 3,
      "celkem_cerpano": 150000.00,
      "prumerna_objednavka": 50000.00,
      "nejvetsi_objednavka": 80000.00,
      "nejmensi_objednavka": 20000.00
    }
  }
}
```

---

### 3️⃣ Vytvoření smlouvy - `POST /ciselniky/smlouvy/insert`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  
  // REQUIRED pole
  "cislo_smlouvy": "S-124/750309/2025",
  "usek_id": 10,
  "druh_smlouvy": "RÁMCOVÁ",
  "nazev_firmy": "Firma s.r.o.",
  "ico": "12345678",
  "nazev_smlouvy": "Název smlouvy",
  "platnost_od": "2025-01-01",
  "platnost_do": "2025-12-31",
  "hodnota_s_dph": 1210000.00,
  
  // OPTIONAL pole
  "dic": "CZ12345678",
  "popis_smlouvy": "Popis smlouvy...",
  "hodnota_bez_dph": 1000000.00,
  "sazba_dph": 21.00,
  "aktivni": 1,
  "stav": "PRIPRAVOVANA",
  "poznamka": "Interní poznámka",
  "cislo_dms": "DMS-2025-123",
  "kategorie": "IT"
}
```

#### Response - SUCCESS
```json
{
  "status": "ok",
  "data": {
    "id": 15,
    "message": "Smlouva byla úspěšně vytvořena"
  }
}
```

#### Response - ERROR
```json
{
  "status": "error",
  "message": "IČO musí obsahovat přesně 8 číslic"
}
```

---

### 4️⃣ Aktualizace smlouvy - `POST /ciselniky/smlouvy/update`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  "id": 15,
  
  // Posílejte jen pole, která chcete změnit
  "nazev_firmy": "Nový dodavatel",
  "hodnota_s_dph": 1500000.00,
  "stav": "AKTIVNI"
}
```

#### Response
```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně aktualizována"
  }
}
```

---

### 5️⃣ Smazání smlouvy - `POST /ciselniky/smlouvy/delete`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  "id": 15
}
```

#### Response
```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně smazána"
  }
}
```

⚠️ **Soft delete** - smlouva se neodstraní, nastaví se `aktivni = 0`

---

### 6️⃣ Hromadný import - `POST /ciselniky/smlouvy/bulk-import`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  "data": [
    {
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "nazev_smlouvy": "Smlouva o poskytování služeb",
      "popis_smlouvy": "...",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00
    }
  ],
  "overwrite_existing": false
}
```

#### Response
```json
{
  "status": "ok",
  "data": {
    "celkem_radku": 150,
    "uspesne_importovano": 145,
    "aktualizovano": 0,
    "preskoceno_duplicit": 5,
    "chyb": 0,
    "chybove_zaznamy": [],
    "import_log_id": 5,
    "cas_importu_ms": 2500
  }
}
```

---

### 7️⃣ Přepočet čerpání - `POST /ciselniky/smlouvy/prepocet-cerpani`

#### Request
```json
{
  "username": "admin",
  "token": "TOKEN",
  
  // OPTIONAL
  "cislo_smlouvy": "S-147/750309/26/23",  // Jen jedna smlouva
  "usek_id": 5                              // Jen jeden útvar
  // Bez parametrů = všechny aktivní smlouvy
}
```

#### Response
```json
{
  "status": "ok",
  "data": {
    "prepocitano_smluv": 45,
    "cas_vypoctu_ms": 1250,
    "dt_prepoctu": "2025-11-23T10:30:00"
  }
}
```

---

## 🎨 UI Implementace - Příklady

### Formulář s DPH kalkulací
```javascript
const [formData, setFormData] = useState({
  hodnota_bez_dph: 0,
  hodnota_s_dph: 0,
  sazba_dph: 21
});

const handleHodnotaChange = (field, value) => {
  const numValue = parseFloat(value) || 0;
  const sazba = formData.sazba_dph / 100;
  
  if (field === 'hodnota_bez_dph') {
    setFormData({
      ...formData,
      hodnota_bez_dph: numValue,
      hodnota_s_dph: numValue * (1 + sazba)
    });
  } else if (field === 'hodnota_s_dph') {
    setFormData({
      ...formData,
      hodnota_s_dph: numValue,
      hodnota_bez_dph: numValue / (1 + sazba)
    });
  }
};
```

### Stav badges
```javascript
const getStavColor = (stav) => {
  const colors = {
    'AKTIVNI': '#10b981',
    'UKONCENA': '#6b7280',
    'PRERUSENA': '#f59e0b',
    'PRIPRAVOVANA': '#3b82f6'
  };
  return colors[stav] || '#6b7280';
};

<Badge color={getStavColor(smlouva.stav)}>
  {smlouva.stav}
</Badge>
```

---

## ⚠️ Error Handling

### Standardní error response
```json
{
  "status": "error",
  "message": "Chybová zpráva"
}
```

### HTTP Status Codes
- `200` - OK (i při `status: "error"`)
- `401` - Unauthorized (neplatný token)
- `403` - Forbidden (nedostatečná oprávnění)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🧪 Testování

```bash
# Test list endpoint
curl -X POST https://eeo.zachranka.cz/api.eeo/ciselniky/smlouvy/list \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"TOKEN","limit":1}'

# Test insert s novými poli
curl -X POST https://eeo.zachranka.cz/api.eeo/ciselniky/smlouvy/insert \
  -H "Content-Type: application/json" \
  -d '{
    "username":"admin",
    "token":"TOKEN",
    "cislo_smlouvy":"TEST-2025-001",
    "nazev_firmy":"Test Dodavatel",
    "ico":"12345678",
    "druh_smlouvy":"SLUŽBY",
    "usek_id":10,
    "nazev_smlouvy":"Test smlouva",
    "hodnota_s_dph":121000,
    "hodnota_bez_dph":100000,
    "sazba_dph":21,
    "stav":"PRIPRAVOVANA",
    "platnost_od":"2025-01-01",
    "platnost_do":"2025-12-31"
  }'
```

---

## 📝 Poznámky

1. ✅ **Pole jsou PŘEJMENOVÁNA** - použijte `nazev_firmy`, `ico`, `hodnota_s_dph` místo starých názvů
2. ✅ **Nová povinná pole** - `hodnota_bez_dph`, `sazba_dph`, `stav`
3. ❌ **Pole `zpusob_financovani` NEEXISTUJE** v nové DB struktuře
4. 🔄 **Automatický přepočet** - čerpání se přepočítá po změně objednávky
5. 🗑️ **Soft delete** - `aktivni = 0`, záznam zůstává v DB

---

**Verze:** 1.1 (opraveno dle BE specifikace)  
**Poslední update:** 23. listopadu 2025  
**Status:** ✅ Sladěno s backend API
