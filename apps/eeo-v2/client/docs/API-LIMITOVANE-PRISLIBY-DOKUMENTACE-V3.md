# API LIMITOVANÉ PŘÍSLIBY - KOMPLETNÍ DOKUMENTACE PRO FRONTEND

**Verze:** 3.0  
**Datum:** 21. listopadu 2025  
**Backend:** PHP 5.6, MySQL 5.5.43  
**Base URL:** `https://eeo.zachranka.cz/api.eeo/api.php`  
**Architektura:** Inline implementace v api.php (Order V2 Pattern)

---

## 📋 OBSAH

1. [Přehled endpointů](#přehled-endpointů)
2. [Autentizace](#autentizace)
3. [Tři typy čerpání](#tři-typy-čerpání)
4. [Endpointy - detailní popis](#endpointy---detailní-popis)
5. [Časté use-case scénáře](#časté-use-case-scénáře)
6. [Error handling](#error-handling)

---

## ⚠️ ZMĚNA ARCHITEKTURY

API bylo **přepsáno** z externích handler souborů na **inline implementaci** přímo v `api.php`:

- ❌ SMAZÁNO: Externí handler soubory
- ✅ NOVĚ: Veškerá logika inline v api.php
- ✅ PATTERN: Stejný styl jako Order V2 - mysqli, verify_token_v2, standardizované {status, data, meta}

---

## PŘEHLED ENDPOINTŮ

Všechny endpointy používají **POST** metodu na `https://eeo.zachranka.cz/api.eeo/api.php` s parametrem `endpoint` v body.

| Endpoint | Metoda | Účel | Rychlost | Kdy použít |
|----------|--------|------|----------|------------|
| `limitovane-prisliby/stav` | POST | Čtení dat (seznam/detail) | ⚡ Velmi rychlé | Kdykoliv pro zobrazení |
| `limitovane-prisliby/prepocet` | POST | Přepočet čerpání | 🐌 Pomalé (5-10s) | Jednou denně nebo po změnách |
| `limitovane-prisliby/inicializace` | POST | Úplné přebudování | 🐌🐌 Velmi pomalé (15-30s) | Jednou měsíčně nebo při problémech |
| `limitovane-prisliby/cerpani-podle-uzivatele` | POST | Detail čerpání po uživatelích | ⚡ Rychlé | Pro drill-down detail |

---

## AUTENTIZACE

**Všechny endpointy vyžadují:**

```json
{
  "endpoint": "limitovane-prisliby/stav",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA=="
}
```

**Získání tokenu:**
```javascript
// POST /api.php s endpoint: 'user/login'
const response = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'user/login',
    username: 'admin',
    password: 'heslo123'
  })
});

const data = await response.json();
// data.token pro další requesty
```

**Poznámka:** Token má časovou platnost. Backend automaticky ověřuje platnost pomocí `verify_token_v2()`.

---

## TŘI TYPY ČERPÁNÍ

### 1. **REZERVACE** (`rezervovano`)
- **Co to je:** Pesimistický odhad - "co kdyby všechny objednávky byly co nejdražší"
- **Výpočet:** `MAX(cena_s_dph)` z každé objednávky
- **Použití:** Prevence překročení limitu před fakturací
- **Kdy sledovat:** Při plánování dalších objednávek

### 2. **PŘEDPOKLAD** (`predpokladane_cerpani`)
- **Co to je:** Realistický odhad - "co se asi vyfakturuje"
- **Výpočet:** `SUM(položky.cena_s_dph)` z objednávek BEZ faktury
- **Použití:** Odhad skutečného čerpání před vystavením faktur
- **Kdy sledovat:** Pro finanční plánování

### 3. **SKUTEČNOST** (`skutecne_cerpano`)
- **Co to je:** Finální čerpání - "co se opravdu vyčerpalo"
- **Výpočet:** `SUM(faktury) + SUM(pokladna)`
- **Použití:** Skutečné čerpání po vystavení faktur
- **Kdy sledovat:** Pro compliance a reporting

**Vztah typů:**
```
REZERVACE ≥ PŘEDPOKLAD ≥ SKUTEČNOST
```

---

## ENDPOINTY - DETAILNÍ POPIS

---

### 1. `limitovane-prisliby/stav` (ČTENÍ DAT)

**Účel:** Získání aktuálního stavu čerpání (bez přepočtu)

**Base URL:** `https://eeo.zachranka.cz/api.eeo/api.php`

#### **A) Jeden konkrétní LP podle ID**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/stav",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "lp_id": 1
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": 1,
    "cislo_lp": "LPIA1",
    "kategorie": "LPIA",
    "usek_id": 10,
    "celkovy_limit": 10000.00,
    "cislo_uctu": "2345/0100",
    "nazev_uctu": "Příjmový účet LPIA",
    
    "rezervovano": 252499.00,
    "predpokladane_cerpani": 15760.00,
    "skutecne_cerpano": 195506.50,
    "cerpano_pokladna": 3750.00,
    
    "zbyva_rezervace": -242499.00,
    "zbyva_predpoklad": -5760.00,
    "zbyva_skutecne": -185506.50,
    
    "procento_rezervace": 2524.99,
    "procento_predpoklad": 157.60,
    "procento_skutecne": 1955.07,
    
    "je_prekroceno_rezervace": true,
    "je_prekroceno_predpoklad": true,
    "je_prekroceno_skutecne": true,
    
    "pocet_zaznamu": 1,
    "ma_navyseni": false,
    "rok": 2025,
    "posledni_prepocet": "2025-11-21 13:37:56",
    
    "spravce": {
      "prijmeni": "Novák",
      "jmeno": "Jan"
    },
    "usek_nazev": "Oddělení IT"
  },
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "timestamp": "2025-11-21 14:23:45"
  }
}
```

#### **B) Všechna LP pro uživatele**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/stav",
  "username": "novak",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "user_id": 64
}
```

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "cislo_lp": "LPIA1",
      "kategorie": "LPIA",
      "celkovy_limit": 10000.00,
      "rezervovano": 252499.00,
      "predpokladane_cerpani": 15760.00,
      "skutecne_cerpano": 195506.50,
      "zbyva_skutecne": -185506.50,
      "procento_skutecne": 1955.07,
      "je_prekroceno_skutecne": true
    },
    {
      "id": 2,
      "cislo_lp": "LPIA2",
      "kategorie": "LPIA",
      "celkovy_limit": 5000.00,
      "rezervovano": 4200.00,
      "predpokladane_cerpani": 3800.00,
      "skutecne_cerpano": 3500.00,
      "zbyva_skutecne": 1500.00,
      "procento_skutecne": 70.00,
      "je_prekroceno_skutecne": false
    }
  ],
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "count": 2,
    "timestamp": "2025-11-21 14:23:45"
  }
}
```

#### **C) Všechna LP pro úsek**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/stav",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "usek_id": 10
}
```

**Response:** Stejný formát jako B)

#### **D) Všechna LP (admin)**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/stav",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "isAdmin": true
}
```

**Response:** Pole všech LP v systému

---

### 2. `limitovane-prisliby/prepocet` (PŘEPOČET)

**Účel:** Aktualizace čerpání (INSERT nebo UPDATE do tabulky `25_limitovane_prisliby_cerpani`)

**Base URL:** `https://eeo.zachranka.cz/api.eeo/api.php`

#### **A) Přepočet všech LP**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/prepocet",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "rok": 2025
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "rok": 2025,
    "updated": 38,
    "failed": 0,
    "statistika": {
      "celkem_kodu": 38,
      "celkovy_limit": 47388519.00,
      "celkem_rezervovano": 35245123.50,
      "celkem_predpoklad": 28456789.25,
      "celkem_skutecne": 25123456.75,
      "celkem_pokladna": 3750.00
    }
  },
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "timestamp": "2025-11-21 13:38:52"
  },
  "message": "Přepočet LP dokončen"
}
```

**⏱️ Trvání:** ~5-10 sekund

#### **B) Přepočet jednoho LP**

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/prepocet",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "lp_id": 1,
  "rok": 2025
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Přepočet dokončen",
  "cislo_lp": "LPIA1",
  "rok": 2025,
  "data": {
    "cislo_lp": "LPIA1",
    "kategorie": "LPIA",
    "usek_id": 10,
    "user_id": 64,
    "rok": 2025,
    "celkovy_limit": 10000.00,
    "rezervovano": 252499.00,
    "predpokladane_cerpani": 15760.00,
    "skutecne_cerpano": 195506.50,
    "cerpano_pokladna": 3750.00,
    "zbyva_rezervace": -242499.00,
    "zbyva_predpoklad": -5760.00,
    "zbyva_skutecne": -185506.50,
    "procento_rezervace": 2524.99,
    "procento_predpoklad": 157.60,
    "procento_skutecne": 1955.07,
    "pocet_zaznamu": 1,
    "ma_navyseni": 0,
    "posledni_prepocet": "2025-11-21 13:37:56"
  },
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "timestamp": "2025-11-21 13:37:56"
  }
}
```

**⏱️ Trvání:** ~0.5 sekundy

---

### 3. `limitovane-prisliby/inicializace` (RESET)

**Účel:** Smazání a kompletní přebudování tabulky čerpání

**Base URL:** `https://eeo.zachranka.cz/api.eeo/api.php`

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/inicializace",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "rok": 2025
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "rok": 2025,
    "updated": 38,
    "failed": 0,
    "statistika": {
      "celkem_kodu": 38,
      "celkovy_limit": 47388519.00,
      "celkem_rezervovano": 35245123.50,
      "celkem_predpoklad": 28456789.25,
      "celkem_skutecne": 25123456.75,
      "celkem_pokladna": 3750.00,
      "prekroceno_rezervace": 12,
      "prekroceno_predpoklad": 8,
      "prekroceno_skutecne": 5
    },
    "log": [
      "Vymazáno 38 starých záznamů čerpání pro rok 2025",
      "Přepočítáno 38 kódů LP pro rok 2025",
      "Inicializace dokončena"
    ]
  },
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "timestamp": "2025-11-21 14:30:00"
  },
  "message": "Inicializace čerpání LP úspěšně dokončena"
}
```

**⏱️ Trvání:** ~15-30 sekund  
**⚠️ Pozor:** Smaže všechna data pro daný rok a přepočítá od nuly!

---

### 4. `limitovane-prisliby/cerpani-podle-uzivatele` (NOVÝ!)

**Účel:** Detail čerpání podle uživatelů pro konkrétní LP

**Base URL:** `https://eeo.zachranka.cz/api.eeo/api.php`

**Request:**
```json
POST https://eeo.zachranka.cz/api.eeo/api.php
Content-Type: application/json

{
  "endpoint": "limitovane-prisliby/cerpani-podle-uzivatele",
  "username": "admin",
  "token": "YWRtaW46MTczMjE4NjQwMA==",
  "lp_id": 1
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "lp_info": {
      "lp_id": 1,
      "cislo_lp": "LPIA1",
      "kategorie": "LPIA",
      "celkovy_limit": 10000.00,
      "prikazce_user_id": 64,
      "prikazce_prijmeni": "Novák",
      "prikazce_jmeno": "Jan",
      "usek_id": 10,
      "rok": 2025
    },
    "cerpani_podle_uzivatelu": [
      {
        "user_id": 12,
        "prijmeni": "Svoboda",
        "jmeno": "Petr",
        "pocet_objednavek": 5,
        "rezervovano": 125000.00,
        "predpokladane_cerpani": 8500.00,
        "skutecne_cerpano": 95000.00,
        "procento_rezervace": 1250.00,
        "procento_predpoklad": 85.00,
        "procento_skutecne": 950.00
      },
      {
        "user_id": 15,
        "prijmeni": "Nováková",
        "jmeno": "Marie",
        "pocet_objednavek": 3,
        "rezervovano": 75000.00,
        "predpokladane_cerpani": 5000.00,
        "skutecne_cerpano": 60000.00,
        "procento_rezervace": 750.00,
        "procento_predpoklad": 50.00,
        "procento_skutecne": 600.00
      },
      {
        "user_id": 18,
        "prijmeni": "Dvořák",
        "jmeno": "Pavel",
        "pocet_objednavek": 3,
        "rezervovano": 52499.00,
        "predpokladane_cerpani": 2260.00,
        "skutecne_cerpano": 40506.50,
        "procento_rezervace": 524.99,
        "procento_predpoklad": 22.60,
        "procento_skutecne": 405.07
      }
    ],
    "cerpano_pokladna": 3750.00,
    "celkem": {
      "pocet_uzivatelu": 3,
      "pocet_objednavek": 11,
      "rezervovano": 252499.00,
      "predpokladane_cerpani": 15760.00,
      "skutecne_cerpano": 199256.50,
      "procento_rezervace": 2524.99,
      "procento_predpoklad": 157.60,
      "procento_skutecne": 1992.57
    }
  },
  "meta": {
    "version": "v3.0",
    "timestamp": "2025-11-21 14:45:00"
  }
}
```

**💡 Použití:**
- Zjistit, který zaměstnanec nejvíc čerpá z LP
- Detail pro drill-down v tabulce
- Reporting po uživatelích

---

## ČASTÉ USE-CASE SCÉNÁŘE

### 📊 **Scenario 1: Zobrazení přehledu LP na FE**

```javascript
// 1. Načíst seznam LP pro uživatele
const response = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'limitovane-prisliby/stav',
    username: currentUser.username,
    token: currentUser.token,
    user_id: currentUser.id
  })
});

const data = await response.json();
// data.data = pole LP s čerpáním

// 2. Zobrazit v tabulce
data.data.forEach(lp => {
  console.log(`${lp.cislo_lp}: ${lp.skutecne_cerpano} / ${lp.celkovy_limit}`);
  
  // Barevné upozornění
  if (lp.je_prekroceno_skutecne) {
    showWarning(`LP ${lp.cislo_lp} je překročeno!`);
  }
});
```

---

### 🔄 **Scenario 2: Přepočet po schválení objednávky**

```javascript
// Po schválení objednávky ID=123, která má LP ID=1
async function afterOrderApproval(orderId, lpId) {
  // 1. Přepočítat jen konkrétní LP (rychlé)
  await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'limitovane-prisliby/prepocet',
      username: 'admin',
      token: adminToken,
      lp_id: lpId,
      rok: 2025
    })
  });
  
  // 2. Refreshnout detail LP na FE
  const updated = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'limitovane-prisliby/stav',
      username: currentUser.username,
      token: currentUser.token,
      lp_id: lpId
    })
  });
  
  const lpData = await updated.json();
  updateUIWithNewData(lpData.data);
}
```

---

### 📅 **Scenario 3: Denní automatický přepočet (cron)**

```bash
#!/bin/bash
# /etc/cron.d/lp-prepocet
# Každý den ve 23:00

0 23 * * * curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint":"limitovane-prisliby/prepocet",
    "username":"admin",
    "token":"YWRtaW46MTczMjE4NjQwMA==",
    "rok":2025
  }'
```

---

### 🔍 **Scenario 4: Drill-down detail po uživatelích**

```javascript
// Uživatel klikne na řádek s LP v tabulce
async function showUserBreakdown(lpId) {
  const response = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'limitovane-prisliby/cerpani-podle-uzivatele',
      username: currentUser.username,
      token: currentUser.token,
      lp_id: lpId
    })
  });
  
  const data = await response.json();
  
  // Zobrazit v modalu
  showModal({
    title: `Detail čerpání ${data.data.lp_info.cislo_lp}`,
    users: data.data.cerpani_podle_uzivatelu,
    total: data.data.celkem
  });
  
  // Příklad UI
  data.data.cerpani_podle_uzivatelu.forEach(user => {
    console.log(`${user.jmeno} ${user.prijmeni}: ${user.pocet_objednavek} obj., ${user.skutecne_cerpano} Kč`);
  });
}
```

---

### 🛠️ **Scenario 5: První setup systému**

```javascript
// Jednorázové spuštění pro inicializaci
async function setupLP() {
  console.log('Inicializace LP systému...');
  
  const response = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'limitovane-prisliby/inicializace',
      username: 'admin',
      token: adminToken,
      rok: 2025
    })
  });
  
  const result = await response.json();
  console.log(`Inicializováno ${result.data.updated} LP`);
  console.log(result.data.log);
}
```

---

## ERROR HANDLING

### Chybové stavy

| HTTP Status | Příklad odpovědi | Řešení |
|-------------|------------------|--------|
| **401** | `{"status":"error","message":"Nepřihlášen"}` | Token vypršel → znovu přihlásit |
| **400** | `{"status":"error","message":"Chybí parametr lp_id"}` | Doplnit povinné parametry |
| **404** | `{"status":"error","message":"LP s tímto ID neexistuje"}` | Zkontrolovat `lp_id` |
| **500** | `{"status":"error","message":"Chyba připojení k databázi"}` | Backend problém → kontaktovat admina |

### JavaScript error handling

```javascript
async function safeFetchLP(lpId) {
  try {
    const response = await fetch('https://eeo.zachranka.cz/api.eeo/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'limitovane-prisliby/stav',
        username: currentUser.username,
        token: currentUser.token,
        lp_id: lpId
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token vypršel
        redirectToLogin();
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      showError(data.message);
      return null;
    }
    
    return data.data;
    
  } catch (error) {
    console.error('Chyba při načítání LP:', error);
    showError('Nepodařilo se načíst data. Zkuste to později.');
    return null;
  }
}
```

---

## 📌 DOPORUČENÍ PRO FE TÝM

### ✅ DO's
- ✅ Používat `/stav` pro zobrazení (rychlé)
- ✅ Cachovat data na FE (5-10 minut)
- ✅ Přepočítat jen konkrétní LP po změně (`lp_id`)
- ✅ Zobrazovat všechny 3 typy čerpání v UI
- ✅ Zvýraznit červeně překročené LP (`je_prekroceno_*`)
- ✅ Použít `/cerpani-podle-uzivatele` pro drill-down
- ✅ Všechny requesty posílat jako POST na `api.php` s parametrem `endpoint`

### ❌ DON'Ts
- ❌ Nevolat `/prepocet` při každém načtení stránky
- ❌ Nevolat `/inicializace` bez souhlasu admina
- ❌ Ignorovat chybové stavy (401, 400, 404)
- ❌ Zobrazovat jen `skutecne_cerpano` (zobraz všechny 3!)
- ❌ Ukládat hesla v plain-text (použít token)
- ❌ Nepoužívat GET metodu (pouze POST)

---

## 🔧 FRONTEND IMPLEMENTACE

### Axios instance (doporučeno)

```javascript
// src/services/api2auth.js
import axios from 'axios';

const api2 = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/',
  headers: { 'Content-Type': 'application/json' }
});

// Fetch LP
export async function fetchLimitovanePrisliby({ token, username, user_id }) {
  try {
    const response = await api2.post('api.php', {
      endpoint: 'limitovane-prisliby/stav',
      token,
      username,
      user_id
    });
    
    if (response.data && response.data.data) {
      return Array.isArray(response.data.data) 
        ? response.data.data 
        : [response.data.data];
    }
    
    return [];
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('ℹ️ Uživatel nemá oprávnění k LP kódům');
      return [];
    }
    throw error;
  }
}
```

### Native Fetch (alternativa)

```javascript
// src/components/LimitovanePrislibyManager.js
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';

async function loadLPData() {
  const response = await fetch(`${API_BASE_URL}api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'limitovane-prisliby/stav',
      username: user.username,
      token: user.token,
      user_id: user.id
    })
  });
  
  const result = await response.json();
  return result.data;
}
```

---

## 🗄️ DATABÁZOVÉ TABULKY

### `25_limitovane_prisliby` (MASTER)
Obsahuje základní definice LP kódů:
- `id`, `cislo_lp`, `kategorie`, `nazev_uctu`, `cislo_uctu`
- `vyse_financniho_kryti` (celkový limit)
- `user_id` (příkazce), `usek_id`
- `platne_od`, `platne_do`

### `25_limitovane_prisliby_cerpani` (ČERPÁNÍ)
Obsahuje vypočítaná data čerpání:
- `cislo_lp`, `rok`
- `rezervovano`, `predpokladane_cerpani`, `skutecne_cerpano`
- `cerpano_pokladna`
- `zbyva_*`, `procento_*`
- `posledni_prepocet`

---

## 🔗 DALŠÍ DOKUMENTACE

- **FRONTEND-BE-API-CONTRACT-LP-TRI-TYPY.md** - Technická specifikace BE implementace
- **BACKEND-LP-CERPANI-IMPLEMENTATION.md** - Backend implementační detaily
- **FRONTEND-LP-TRI-TYPY-CERPANI.md** - Frontend implementace
- **CASHBOOK_DB_STRUCTURE.md** - DB struktura

---

## 📝 CHANGELOG

### v3.0 (21.11.2025)
- ✅ Přepsáno na inline implementaci v api.php (Order V2 pattern)
- ✅ Všechny endpointy používají POST s parametrem `endpoint`
- ✅ Standardizovaná response struktura {status, data, meta}
- ✅ Tři typy čerpání: rezervace, předpoklad, skutečnost
- ✅ Nový endpoint: `cerpani-podle-uzivatele`

### v2.0 (15.11.2025)
- Přidán přepočet čerpání
- Implementace inicializace

### v1.0 (01.11.2025)
- Původní implementace s externími handlery

---

**Kontakt:** holovsky@zachranka.cz  
**Support:** Vytvořit issue v GitLabu  
**Připravil:** GitHub Copilot
