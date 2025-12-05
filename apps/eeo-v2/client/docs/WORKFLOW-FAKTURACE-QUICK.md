# 🎯 FAKTURACE - Rychlý přehled & Rozhodnutí

> **Pro:** Diskusi o dalším postupu  
> **Datum:** 26. října 2025

---

## 📊 SITUACE

### ✅ Co MÁME:
- ✅ **DB tabulka** `25a_objednavky_faktury` připravena
- ✅ **Backend** připravuje SQL endpointy
- ✅ **Frontend** sekce připravena (zatím skryta)
- ✅ **UI návrh** podle obrázku v přílohách

### 🔧 Co ZBÝVÁ:
- Backend dokončit API endpointy
- Frontend aktivovat a propojit s BE
- Rozhodnout workflow pravidla

---

## 🔄 VIZUALIZACE WORKFLOW

```
┌────────────────────────────────────────────────────────────────┐
│  WORKFLOW OBJEDNÁVKY - Kdy se zobrazí FAKTURACE?               │
└────────────────────────────────────────────────────────────────┘

Stav objednávky:

1. NOVA                     → ❌ Sekce SKRYTA
   ├─ Příprava
   └─ Editace

2. ODESLANA_KE_SCHVALENI   → ❌ Sekce SKRYTA
   ├─ Čeká na schválení
   └─ Příkazce rozhoduje

3. SCHVALENA                → ❌ Sekce SKRYTA
   ├─ Schváleno příkazcem
   └─ Doplnění dodavatele

4. CEKA_POTVRZENI          → ⚠️ Varianta B: ✅ Sekce VIDITELNÁ
   ├─ Odeslána dodavateli       Varianta A: ❌ Sekce SKRYTA
   └─ Čeká na odpověď

5. POTVRZENA               → ✅ Sekce VIDITELNÁ (obě varianty)
   ├─ Dodavatel potvrdil
   └─ 📄 Přidávání FAKTUR

6. DOKONCENA               → ✅ Sekce VIDITELNÁ
   ├─ Objednávka splněna
   └─ 📄 Faktury dokončeny


┌────────────────────────────────────────────────────────────────┐
│  SEKCE FAKTURACE - Struktura                                   │
└────────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  7) Fakturace                                    [Collapse ▼]┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                ┃
┃  📋 Seznam faktur (2)                                          ┃
┃                                                                ┃
┃  ┌────────────────────────────────────────────────────────┐   ┃
┃  │ ✅ Fa: 2025/0100 | 12 500 Kč | Doručena              │   ┃
┃  │    Středisko: Technický úsek                          │   ┃
┃  │    Přidáno: 15.10.2025 (Jan Novák)                   │   ┃
┃  │    [✏️ Upravit] [🗑️ Smazat]                            │   ┃
┃  └────────────────────────────────────────────────────────┘   ┃
┃                                                                ┃
┃  ┌────────────────────────────────────────────────────────┐   ┃
┃  │ ❌ Fa: 2025/0101 | 8 750 Kč | Nedoručena             │   ┃
┃  │    Poznámka: Čekáme na potvrzení                     │   ┃
┃  │    Přidáno: 20.10.2025 (Marie Svobodová)             │   ┃
┃  │    [✏️ Upravit] [🗑️ Smazat]                            │   ┃
┃  └────────────────────────────────────────────────────────┘   ┃
┃                                                                ┃
┃  [➕ Přidat další fakturu]                                     ┃
┃                                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


Po kliknutí na "Přidat fakturu":

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ➕ Nová faktura                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                ┃
┃  ⚠️ Částka faktury (15 000 Kč) je vyšší než maximální cena    ┃
┃     objednávky (12 500 Kč). Rozdíl: 2 500 Kč (20.0%).        ┃
┃                                                                ┃
┃  ☑️ Faktura doručena na ZZS SK                                ┃
┃                                                                ┃
┃  ČÍSLO FA/VPD Z VEMA *                                        ┃
┃  ┌──────────────────────┐                                     ┃
┃  │ 2025/0123            │                                     ┃
┃  └──────────────────────┘                                     ┃
┃                                                                ┃
┃  ČÁSTKA (Kč) *                                                ┃
┃  ┌──────────────────────┐                                     ┃
┃  │           15000.00   │                                     ┃
┃  └──────────────────────┘                                     ┃
┃                                                                ┃
┃  STŘEDISKO                                                    ┃
┃  ┌──────────────────────────────────────────────────────┐    ┃
┃  │ Technický úsek                                       │    ┃
┃  └──────────────────────────────────────────────────────┘    ┃
┃                                                                ┃
┃  POZNÁMKA/VZKAZ                                               ┃
┃  ┌──────────────────────────────────────────────────────┐    ┃
┃  │ Faktura za hardware                                  │    ┃
┃  │                                                       │    ┃
┃  └──────────────────────────────────────────────────────┘    ┃
┃                                                                ┃
┃              [❌ Zrušit]         [💾 Uložit fakturu]          ┃
┃                                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## ❓ KLÍČOVÁ ROZHODNUTÍ

### 🔴 URGENTNÍ - Potřebujeme rozhodnout:

#### 1. **Kdy zobrazit sekci fakturace?**

**VARIANTA A: Po potvrzení dodavatele** ⭐ DOPORUČENO
```javascript
['POTVRZENA', 'DOKONCENA'].includes(stav)
```
- ✅ Logický flow podle obrázku
- ✅ Jasná provázanost: dodavatel potvrdil → přijde faktura
- ❌ Méně flexibilní (faktura někdy přijde dříve)

**VARIANTA B: Po odeslání objednávky**
```javascript
['CEKA_POTVRZENI', 'POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA'].includes(stav)
```
- ✅ Flexibilnější (faktura může přijít kdykoliv)
- ✅ Pokrývá všechny reálné scénáře
- ❌ Méně přísný workflow

**→ DOPORUČENÍ: Varianta A (podle obrázku)**

---

#### 2. **Může být více faktur k jedné objednávce?**

- ✅ **ANO** - DB tabulka to podporuje (více řádků s `objednavka_id`)
- ✅ Reálný use case: dodávky po částech, opravné faktury, zálohy
- ✅ UI navrženo pro seznam faktur

**→ DOPORUČENÍ: ANO, více faktur**

---

#### 3. **Validace částky faktury vs. max_cena_s_dph**

**VARIANTA A: Upozornění (warning)** ⭐ DOPORUČENO
```
⚠️ Částka faktury je vyšší než max cena objednávky
→ UMOŽNÍ ULOŽIT (jen varování)
```

**VARIANTA B: Chyba (error)**
```
❌ Částka faktury nesmí být vyšší než max cena
→ NELZE ULOŽIT
```

**→ DOPORUČENÍ: Varianta A (warning) - reálně může přijít vyšší částka**

---

#### 4. **Kdo může přidávat/editovat faktury?**

**VARIANTA A: Autor + garant** ⭐ DOPORUČENO
- Autor objednávky
- Garant objednávky
- Admin (vždy)

**VARIANTA B: Kdokoliv**
- Kdokoliv s přístupem k detail objednávky

**→ DOPORUČENÍ: Varianta A (autor + garant + admin)**

---

## 📋 BACKEND TODO

### API Endpointy k vytvoření:

```php
POST /api.eeo/faktury/list       // Seznam faktur
POST /api.eeo/faktury/create     // Přidat fakturu  
POST /api.eeo/faktury/update     // Upravit fakturu
POST /api.eeo/faktury/delete     // Smazat fakturu (soft delete)
```

### SQL operace:

```sql
-- LIST
SELECT f.*, u.jmeno, u.prijmeni 
FROM 25a_objednavky_faktury f
LEFT JOIN 25_uzivatel u ON f.vytvoril_uzivatel_id = u.id
WHERE f.objednavka_id = ? AND f.aktivni = 1
ORDER BY f.dt_vytvoreni DESC

-- CREATE
INSERT INTO 25a_objednavky_faktury (
  objednavka_id, fa_dorucena, fa_castka, fa_cislo_vema, 
  fa_stredisko, fa_poznamka, vytvoril_uzivatel_id, 
  dt_vytvoreni, aktivni
) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)

-- UPDATE
UPDATE 25a_objednavky_faktury 
SET fa_dorucena = ?, fa_castka = ?, fa_cislo_vema = ?,
    fa_stredisko = ?, fa_poznamka = ?, dt_aktualizace = NOW()
WHERE id = ?

-- DELETE (soft)
UPDATE 25a_objednavky_faktury 
SET aktivni = 0, dt_aktualizace = NOW()
WHERE id = ?
```

---

## 🚀 FRONTEND TODO

### 1. API Service (`src/services/api25orders.js`)
```javascript
export async function getFaktury25({ token, username, objednavkaId })
export async function createFaktura25({ token, username, fakturaData })
export async function updateFaktura25({ token, username, fakturaId, fakturaData })
export async function deleteFaktura25({ token, username, fakturaId })
```

### 2. Komponenty (nové soubory)
```
src/components/FakturaForm.js      // Formulář pro fakturu
src/components/FakturaCard.js      // Karta s fakturou  
src/components/FakturyList.js      // Seznam faktur
src/utils/fakturaValidation.js    // Validace
```

### 3. Integrace (`src/forms/OrderForm25.js`)
```javascript
// Změnit řádek ~16536:
{false && ... → {shouldShowFakturace() && ...

// Přidat funkci:
const shouldShowFakturace = () => {
  return ['POTVRZENA', 'DOKONCENA'].includes(formData.stav_schvaleni_kod);
};

// Upravit obsah sekce (řádek ~16556):
<FakturyList 
  objednavkaId={orderId}
  maxCenaObjednavky={formData.max_cena_s_dph}
/>
```

---

## 📐 STRUKTURA DAT

### Frontend → Backend (CREATE/UPDATE):
```json
{
  "objednavka_id": 123,
  "fa_dorucena": false,
  "fa_castka": 15000.50,
  "fa_cislo_vema": "2025/0123",
  "fa_stredisko": "Technický úsek",
  "fa_poznamka": "Faktura za hardware"
}
```

### Backend → Frontend (LIST):
```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "objednavka_id": 123,
      "fa_dorucena": 1,
      "fa_castka": 12500.00,
      "fa_cislo_vema": "2025/0100",
      "fa_stredisko": "Technický úsek",
      "fa_poznamka": "",
      "vytvoril_uzivatel_id": 5,
      "vytvoril_jmeno": "Jan Novák",
      "dt_vytvoreni": "2025-10-15 14:30:00",
      "dt_aktualizace": null,
      "aktivni": 1
    }
  ]
}
```

---

## ⏱️ ČASOVÝ ODHAD

### Backend (PHP + SQL):
- **Čas:** 4-6 hodin
- **Úkoly:**
  - Vytvořit 4 endpointy
  - Validace dat
  - Error handling
  - Testování Postman

### Frontend (React):
- **Čas:** 8-10 hodin
- **Úkoly:**
  - API service funkce (1h)
  - Validační utils (1h)
  - FakturaForm komponenta (2-3h)
  - FakturaCard komponenta (1h)
  - FakturyList komponenta (2-3h)
  - Integrace do OrderForm25 (1h)
  - Testování (2h)

### **CELKEM: 12-16 hodin práce**

---

## 📖 DOKUMENTACE

Vytvořené dokumenty:

1. **`WORKFLOW-FAKTURACE-NAVRH.md`**
   - Kompletní návrh workflow
   - Otázky k rozhodnutí
   - Vizuální návrh UI

2. **`WORKFLOW-FAKTURACE-TECH-SPEC.md`** 
   - Detailní technická specifikace
   - Kompletní kód všech komponent
   - Backend API specifikace
   - Testovací scénáře

3. **`WORKFLOW-FAKTURACE-QUICK.md`** (tento soubor)
   - Rychlý přehled
   - Vizualizace workflow
   - Klíčová rozhodnutí

---

## 🎯 DALŠÍ KROKY

### 1. **ROZHODNOUT** (teď hned!)
- [ ] Kdy zobrazit sekci? (Varianta A/B)
- [ ] Více faktur? (ANO)
- [ ] Validace částky? (Warning/Error)
- [ ] Kdo může editovat? (Autor+garant/Kdokoliv)

### 2. **BACKEND** (BE tým)
- [ ] Implementovat 4 endpointy
- [ ] Otestovat v Postman
- [ ] Informovat FE tým o dokončení

### 3. **FRONTEND** (po dokončení BE)
- [ ] Implementovat API funkce
- [ ] Vytvořit komponenty
- [ ] Integrovat do OrderForm25
- [ ] Otestovat celý workflow

### 4. **TESTOVÁNÍ**
- [ ] Unit testy
- [ ] Integration testy
- [ ] Manuální testování
- [ ] User acceptance testing

---

## ✅ DOPORUČENÍ

**Základní workflow:**
- ✅ Sekce se zobrazí po POTVRZENA (Varianta A)
- ✅ Více faktur k jedné objednávce
- ✅ Validace částky = WARNING (lze uložit i vyšší)
- ✅ Editace: autor + garant + admin

**Priorita:**
1. 🔴 VYSOKÁ - Backend endpointy (kritické)
2. 🟡 STŘEDNÍ - Frontend komponenty
3. 🟢 NÍZKÁ - Notifikace při přidání faktury

---

**Připraveno k diskusi a implementaci! 🚀**
