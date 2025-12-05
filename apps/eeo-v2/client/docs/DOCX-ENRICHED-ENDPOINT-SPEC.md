# DOCX Enriched Endpoint - Specifikace

## 🎯 Účel
Nový backend endpoint pro poskytnutí **KOMPLETNÍCH dat** pro generování DOCX dokumentů.

---

## 📍 Endpoint

**URL:** `POST /sablona_docx/order-enriched-data`

**Nahrazuje:** `sablona_docx/order-data` (starý endpoint bez enriched dat)

---

## 📥 REQUEST

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "username": "admin",
  "objednavka_id": 11306
}
```

---

## 📤 RESPONSE - Kompletní struktura

```json
{
  "status": "ok",
  "data": {
    // ============================================
    // 1. ZÁKLADNÍ DATA OBJEDNÁVKY
    // ============================================
    "id": 11306,
    "cislo_objednavky": "O-1765/75030926/2025/PTN - dílny",
    "dt_objednavky": "2025-11-15 10:30:00",
    "predmet": "nákup provozních kapalin",
    "max_cena_s_dph": "10000.00",
    "poznamka": "Urgentní objednávka",
    "strediska_kod": ["12345"],
    "financovani": {"typ": "LP"},
    "druh_objednavky_kod": "IT",
    "stav_workflow_kod": "SCHVALENO",
    "dt_predpokladany_termin_dodani": "2025-11-17",
    "misto_dodani": "Autodílna Benešov",
    "zaruka": "dle obchodních podmínek",
    
    // ============================================
    // 2. ENRICHED UŽIVATELÉ (s kompletními daty)
    // ============================================
    
    // 🎯 GARANT
    "garant_uzivatel_id": 1,
    "garant_uzivatel": {
      "id": 1,
      "cele_jmeno": "Ing. Jan Novák Ph.D.",
      "jmeno": "Jan",
      "prijmeni": "Novák",
      "titul_pred": "Ing.",
      "titul_za": "Ph.D.",
      "email": "jan.novak@firma.cz",
      "telefon": "+420 123 456 789",
      "lokalita": {
        "id": 5,
        "nazev": "Praha",
        "kod": "PHA"
      }
    },
    
    // 🎯 PŘÍKAZCE
    "prikazce_id": 2,
    "prikazce_uzivatel": {
      "id": 2,
      "cele_jmeno": "Mgr. Marie Svobodová",
      "jmeno": "Marie",
      "prijmeni": "Svobodová",
      "titul_pred": "Mgr.",
      "titul_za": "",
      "email": "marie.svobodova@firma.cz",
      "telefon": "+420 987 654 321",
      "lokalita": {
        "id": 5,
        "nazev": "Praha",
        "kod": "PHA"
      }
    },
    
    // 🎯 SCHVALOVATEL
    "schvalovatel_id": 3,
    "schvalovatel": {
      "id": 3,
      "cele_jmeno": "Bc. Petr Dvořák",
      "jmeno": "Petr",
      "prijmeni": "Dvořák",
      "titul_pred": "Bc.",
      "titul_za": "",
      "email": "petr.dvorak@firma.cz",
      "telefon": "+420 111 222 333",
      "lokalita": {
        "id": 8,
        "nazev": "Brno",
        "kod": "BRN"
      }
    },
    
    // 🎯 OBJEDNATEL (uzivatel)
    "uzivatel_id": 4,
    "uzivatel": {
      "id": 4,
      "cele_jmeno": "Anna Nováková",
      "jmeno": "Anna",
      "prijmeni": "Nováková",
      "titul_pred": "",
      "titul_za": "",
      "email": "anna.novakova@firma.cz",
      "telefon": "+420 444 555 666",
      "lokalita": {
        "id": 5,
        "nazev": "Praha",
        "kod": "PHA"
      }
    },
    
    // 🎯 ODESÍLATEL
    "odesilatel_id": 77,
    "odesilatel": {
      "id": 77,
      "cele_jmeno": "Hana Sochůrková",
      "jmeno": "Hana",
      "prijmeni": "Sochůrková",
      "titul_pred": "",
      "titul_za": "",
      "email": "hana.sochur@firma.cz",
      "telefon": "+420 777 888 999",
      "lokalita": {
        "id": 12,
        "nazev": "Benešov",
        "kod": "BEN"
      }
    },
    
    // 🎯 FAKTURANT
    "fakturant_id": 5,
    "fakturant": {
      "id": 5,
      "cele_jmeno": "Lukáš Černý",
      "jmeno": "Lukáš",
      "prijmeni": "Černý",
      "titul_pred": "",
      "titul_za": "",
      "email": "lukas.cerny@firma.cz",
      "telefon": "+420 222 333 444",
      "lokalita": null
    },
    
    // ... další uživatelé (dodavatel_potvrdil, potvrdil_vecnou_spravnost, dokoncil)
    
    // ============================================
    // 3. DODAVATEL
    // ============================================
    "dodavatel_id": 123,
    "dodavatel_nazev": "J + M autodíly, s.r.o.",
    "dodavatel_adresa": "Pod višňovkou 1661/31, Krč, 14000 Praha 4",
    "dodavatel_ico": "29141281",
    "dodavatel_dic": "CZ29141281",
    "dodavatel_zastoupeny": "Pavel Novák",
    "dodavatel_kontakt_jmeno": "Pavel Novák",
    "dodavatel_kontakt_email": "info@jm.cz",
    "dodavatel_kontakt_telefon": "111222333",
    
    // ============================================
    // 4. POLOŽKY OBJEDNÁVKY
    // ============================================
    "polozky": [
      {
        "id": 1,
        "nazev": "Motorový olej 5W-30",
        "mnozstvi": 10,
        "mj": "ks",
        "cena_bez_dph": "826.45",
        "cena_s_dph": "1000.00",
        "sazba_dph": 21,
        "poznamka": ""
      }
    ],
    "polozky_count": 1,
    
    // ============================================
    // 5. PŘÍLOHY
    // ============================================
    "prilohy": [
      {
        "id": 1,
        "nazev_souboru": "navrh_smlouvy.pdf",
        "typ_prilohy": "SMLOUVA",
        "velikost": 125000
      },
      {
        "id": 2,
        "nazev_souboru": "cenova_nabidka.xlsx",
        "typ_prilohy": "CENOVA_NABIDKA",
        "velikost": 45000
      }
    ],
    "prilohy_count": 2,
    
    // ============================================
    // 6. 🧮 VYPOČÍTANÉ HODNOTY (backend vypočítá)
    // ============================================
    "vypocitane": {
      // 💰 CENY - RAW formát (pro výpočty)
      "celkova_cena_bez_dph": "8264.46",
      "celkova_cena_s_dph": "10000.00",
      "vypoctene_dph": "1735.54",
      
      // 💰 CENY - S FORMÁTOVÁNÍM (pro DOCX)
      "celkova_cena_bez_dph_kc": "8 264.46 Kč",
      "celkova_cena_s_dph_kc": "10 000.00 Kč",
      "vypoctene_dph_kc": "1 735.54 Kč",
      
      // 📊 STATISTIKY
      "pocet_polozek": 1,
      "pocet_priloh": 2,
      
      // 📅 DATUM A ČAS
      "datum_generovani": "16.11.2025",
      "cas_generovani": "14:30",
      "datum_cas_generovani": "16.11.2025 14:30",
      
      // 🎯 KOMBINACE JMEN - pro různé formáty podpisů
      
      // GARANT
      "garant_jmeno_prijmeni": "Jan Novák",
      "garant_prijmeni_jmeno": "Novák Jan",
      "garant_cele_jmeno_s_tituly": "Ing. Jan Novák Ph.D.",
      "garant_jmeno": "Jan",
      "garant_prijmeni": "Novák",
      
      // PŘÍKAZCE
      "prikazce_jmeno_prijmeni": "Marie Svobodová",
      "prikazce_prijmeni_jmeno": "Svobodová Marie",
      "prikazce_cele_jmeno_s_tituly": "Mgr. Marie Svobodová",
      "prikazce_jmeno": "Marie",
      "prikazce_prijmeni": "Svobodová",
      
      // SCHVALOVATEL
      "schvalovatel_jmeno_prijmeni": "Petr Dvořák",
      "schvalovatel_prijmeni_jmeno": "Dvořák Petr",
      "schvalovatel_cele_jmeno_s_tituly": "Bc. Petr Dvořák",
      
      // OBJEDNATEL (uzivatel)
      "objednatel_jmeno_prijmeni": "Anna Nováková",
      "objednatel_prijmeni_jmeno": "Nováková Anna",
      "objednatel_cele_jmeno": "Anna Nováková",
      
      // ODESÍLATEL
      "odesilatel_jmeno_prijmeni": "Hana Sochůrková",
      "odesilatel_prijmeni_jmeno": "Sochůrková Hana",
      "odesilatel_cele_jmeno": "Hana Sochůrková",
      
      // ... další kombinace pro všechny uživatele
    },
    
    // ============================================
    // 7. 👥 SEZNAM UŽIVATELŮ PRO VÝBĚR PODPISU
    // ============================================
    "dostupni_uzivatele_pro_podpis": [
      {
        "id": 1,
        "cele_jmeno": "Ing. Jan Novák Ph.D.",
        "role": "Garant",
        "lokalita_nazev": "Praha"
      },
      {
        "id": 2,
        "cele_jmeno": "Mgr. Marie Svobodová",
        "role": "Příkazce",
        "lokalita_nazev": "Praha"
      },
      {
        "id": 3,
        "cele_jmeno": "Bc. Petr Dvořák",
        "role": "Schvalovatel",
        "lokalita_nazev": "Brno"
      },
      {
        "id": 4,
        "cele_jmeno": "Anna Nováková",
        "role": "Objednatel",
        "lokalita_nazev": "Praha"
      },
      {
        "id": 77,
        "cele_jmeno": "Hana Sochůrková",
        "role": "Odesílatel",
        "lokalita_nazev": "Benešov"
      }
    ]
  }
}
```

---

## 🔧 BACKEND POŽADAVKY

### 1. Enriched uživatelé
Každý uživatel MUSÍ obsahovat:
- ✅ `id` (int)
- ✅ `cele_jmeno` (string) - kompletní jméno s tituly
- ✅ `jmeno` (string)
- ✅ `prijmeni` (string)
- ✅ `titul_pred` (string, může být prázdný)
- ✅ `titul_za` (string, může být prázdný)
- ✅ `email` (string)
- ✅ `telefon` (string)
- ✅ `lokalita` (object nebo null):
  - `id` (int)
  - `nazev` (string)
  - `kod` (string)

### 2. Vypočítané hodnoty
Backend MUSÍ vypočítat:
- ✅ Celkovou cenu bez DPH (součet všech položek)
- ✅ Celkovou cenu s DPH (součet všech položek)
- ✅ Vypočtené DPH (rozdíl)
- ✅ Formátované verze s "Kč" a mezerami
- ✅ Kombinace jmen pro všechny uživatele
- ✅ Počty položek a příloh
- ✅ Aktuální datum a čas generování

### 3. Seznam pro výběr podpisu
Vrátit POUZE uživatele, kteří jsou součástí objednávky:
- ✅ Garant (pokud existuje)
- ✅ Příkazce (pokud existuje)
- ✅ Schvalovatel (pokud existuje)
- ✅ Objednatel (pokud existuje)
- ✅ Odesílatel (pokud existuje)
- ✅ Fakturant (pokud existuje)
- ✅ atd.

---

## 📋 FRONTEND IMPLEMENTACE

### API Service

```javascript
// src/services/apiDocxOrders.js

/**
 * Načte ENRICHED data objednávky pro DOCX generování
 * @param {object} params
 * @param {string} params.token - JWT token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<object>} - Kompletní enriched data
 */
export async function getDocxOrderEnrichedData({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      objednavka_id: parseInt(objednavka_id)
    };

    const response = await apiDocxOrders.post(
      'sablona_docx/order-enriched-data', 
      payload, 
      { timeout: 10000 }
    );

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání enriched dat');
    }

    const data = response.data;

    if (data.err) {
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    console.error('❌ Chyba při načítání DOCX enriched data:', error);
    throw new Error(error.response?.data?.err || error.message);
  }
}
```

### DOCX Generátor

```javascript
// src/utils/docx/newDocxGenerator.js

import { getDocxOrderEnrichedData } from '../../services/apiDocxOrders';

export async function generateDocxDocument({
  templateId,
  orderId,
  token,
  username,
  template,
  selectedUserId = null
}) {
  try {
    // === KROK 1: Načtení ENRICHED DAT z nového endpointu ===
    console.log('📊 Načítám ENRICHED data z backendu...');
    
    const enrichedData = await getDocxOrderEnrichedData({
      token,
      username,
      objednavka_id: orderId
    });

    console.log('✅ Enriched data načtena:', {
      polozky: enrichedData.polozky?.length,
      prilohy: enrichedData.prilohy?.length,
      dostupni_uzivatele: enrichedData.dostupni_uzivatele_pro_podpis?.length,
      ma_garant_uzivatel: !!enrichedData.garant_uzivatel,
      ma_vypocitane: !!enrichedData.vypocitane
    });

    // === KROK 2: Najdi vybraného uživatele (pokud byl vybrán) ===
    if (selectedUserId && enrichedData.vypocitane) {
      const vybranyUzivatel = enrichedData.dostupni_uzivatele_pro_podpis?.find(
        u => u.id === selectedUserId
      );
      
      if (vybranyUzivatel) {
        console.log(`✅ Vybraný uživatel nalezen: ${vybranyUzivatel.cele_jmeno} (${vybranyUzivatel.role})`);
        
        // Přidej do vypočítaných hodnot
        enrichedData.vypocitane.vybrany_uzivatel_cele_jmeno = vybranyUzivatel.cele_jmeno;
        enrichedData.vypocitane.vybrany_uzivatel_role = vybranyUzivatel.role;
        enrichedData.vypocitane.vybrany_uzivatel_lokalita = vybranyUzivatel.lokalita_nazev;
      }
    }

    // === KROK 3: Generování DOCX ===
    // enrichedData obsahuje VŠE co potřebujeme!
    // Žádné mergování, žádné složité transformace
    
    const fieldMapping = createFieldMappingForDocx(enrichedData, templateMapping);
    const filledXml = fillXmlWithData(documentXml, fieldMapping);
    
    // ... zbytek generování
  } catch (error) {
    console.error('❌ Chyba při generování DOCX:', error);
    throw error;
  }
}
```

### Modal pro výběr uživatele

```javascript
// src/components/DocxGeneratorModal.js

const [availableUsers, setAvailableUsers] = useState([]);
const [selectedUserId, setSelectedUserId] = useState(null);

// Načti dostupné uživatele z enriched dat
useEffect(() => {
  if (order?.dostupni_uzivatele_pro_podpis) {
    setAvailableUsers(order.dostupni_uzivatele_pro_podpis);
  }
}, [order]);

// Dropdown s uživateli
<Select
  value={selectedUserId}
  onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
>
  <option value="">Vyberte uživatele pro podpis...</option>
  {availableUsers.map(user => (
    <option key={user.id} value={user.id}>
      {user.cele_jmeno} ({user.role}) - {user.lokalita_nazev}
    </option>
  ))}
</Select>
```

---

## ✅ VÝHODY NOVÉHO ŘEŠENÍ

| Aspekt | Staré řešení | Nové řešení |
|--------|--------------|-------------|
| **Enriched data** | ❌ Muselo se mergovat | ✅ Vše v jednom endpointu |
| **Vypočítané hodnoty** | ❌ Frontend počítal | ✅ Backend vypočítá |
| **Výběr uživatele** | ❌ Složitý JS kód | ✅ Seznam z backendu |
| **Kombinace jmen** | ❌ Frontend skládal | ✅ Backend připraví |
| **Složitost FE kódu** | ❌ Vysoká | ✅ Nízká |
| **Maintenance** | ❌ Složitý | ✅ Jednoduchý |
| **Performance** | ❌ Více API calls | ✅ Jeden call |

---

## 🚀 IMPLEMENTAČNÍ PLÁN

### Backend (PHP):
1. ✅ Vytvořit endpoint `sablona_docx/order-enriched-data`
2. ✅ Načíst všechny enriched uživatele s lokalitami
3. ✅ Vypočítat ceny a DPH
4. ✅ Vytvořit kombinace jmen
5. ✅ Sestavit seznam dostupných uživatelů
6. ✅ Vrátit kompletní JSON

### Frontend (React):
1. ✅ Vytvořit novou funkci `getDocxOrderEnrichedData()`
2. ✅ Zjednodušit `generateDocxDocument()` - odstranit mergování
3. ✅ Odstranit `addCalculatedVariables()` - backend to dělá
4. ✅ Upravit modal - použít `dostupni_uzivatele_pro_podpis`
5. ✅ Testování

---

## 📝 TESTOVÁNÍ

### Backend test:
```bash
curl -X POST "http://your-api/sablona_docx/order-enriched-data" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "...",
    "username": "admin",
    "objednavka_id": 11306
  }'
```

### Frontend test:
1. Otevřít detail objednávky
2. Kliknout na "Generovat DOCX"
3. Zkontrolovat, že dropdown obsahuje uživatele
4. Vybrat uživatele
5. Vygenerovat DOCX
6. Ověřit, že všechna pole jsou vyplněna správně

---

## 🎯 ZÁVĚR

Nové řešení je **JEDNODUŠŠÍ, RYCHLEJŠÍ a UDRŽOVATELNÉ**:
- ✅ Backend dělá těžkou práci (enriched data, výpočty)
- ✅ Frontend jen zobrazuje a generuje DOCX
- ✅ Žádné složité mergování
- ✅ Konzistentní data napříč aplikací
