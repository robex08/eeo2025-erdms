# Implementační plán: Objednávky placené z pokladny bez faktury

**Datum:** 15. května 2026  
**Verze:** 1.0  
**Status:** 🟡 Ke schválení  
**Odhad:** 14-17 dní (1 vývojář) | 10-12 dní (paralelní vývoj)

---

## 📌 Executive Summary

### Co implementujeme?
Rozšíření systému o možnost platit schválené objednávky (s čerpáním z LP **FINKP**) přímo z pokladny místo standardní fakturace.

### Proč?
**Reálný use case:** Objednatel vytvoří objednávku s předpokladem faktury, ale dodavatel pošle zboží na dobírku nebo vyžaduje platbu na místě. Pokladník potřebuje možnost uhradit objednávku z pokladny a systém musí správně započítat čerpání LP.

### Klíčové vlastnosti:
- ✅ **Reaktivní rozhodnutí** - způsob platby se určuje až při skutečné platbě, ne při vytváření objednávky
- ✅ **Ochrana dat** - objednávka placená z pokladny nemůže mít fakturu (a naopak)
- ✅ **Čerpání LP** - pokladní platby se započítávají do čerpání stejně jako faktury
- ✅ **Obousměrné vazby** - smazání objednávky smaže pokladnu, smazání pokladny uvolní objednávku

---

## 🎯 Přijatá klíčová rozhodnutí

| Oblast | Rozhodnutí |
|--------|-----------|
| **Databáze** | Přidat `objednavka_id INT(11) NULL` do `25a_pokladni_polozky` |
| **Workflow stav** | `POKLADNA` (přidá se až při přiřazení) |
| **Podmínka** | Pouze objednávky ≥ `SCHVALENA` |
| **Blokovací stavy** | `VECNA_SPRAVNOST`, `ZKONTROLOVANA` → nelze k pokladně |
| **Oprávnění** | Pokladník + účastník (objednatel/garant/příkazce) |
| **Částky** | Nižší OK, vyšší → upozornění + povolit |
| **Částečné platby** | NE - vždy celá částka |
| **Smazání** | Obousměrné (OBJ↔pokladna) |
| **Notifikace** | Org hierarchie nebo Objednatel+Garant+Schvalovatel |
| **Audit** | Připravit do budoucna |
| **Dokončení** | BEZE ZMĚNY - stávající logika |

---

## 🗄️ Databázové změny

### Migrace SQL

```sql
-- Soubor: SQL_MIGRATION_POKLADNA_OBJEDNAVKY.sql
-- Datum: 2026-05-15

-- Přidat sloupec pro vazbu na objednávku
ALTER TABLE 25a_pokladni_polozky 
ADD COLUMN objednavka_id INT(11) NULL DEFAULT NULL 
AFTER pokladni_kniha_id
COMMENT 'Vazba na objednávku placenou z pokladny (bez faktury)';

-- Index pro rychlé vyhledávání
CREATE INDEX idx_objednavka_id 
ON 25a_pokladni_polozky(objednavka_id);

-- Foreign key constraint
ALTER TABLE 25a_pokladni_polozky
ADD CONSTRAINT fk_pokladni_objednavka
FOREIGN KEY (objednavka_id) 
REFERENCES 25a_objednavky(id)
ON DELETE SET NULL;
```

### Verifikace

```sql
-- Kontrola struktury
DESCRIBE 25a_pokladni_polozky;

-- Kontrola dat (mělo by vrátit 0)
SELECT COUNT(*) FROM 25a_pokladni_polozky 
WHERE objednavka_id IS NOT NULL;

-- Kontrola indexů
SHOW INDEX FROM 25a_pokladni_polozky 
WHERE Key_name = 'idx_objednavka_id';
```

**⚠️ Rizika migrace:**
- Může trvat déle na velké tabulce
- Foreign key vyžaduje InnoDB engine

---

## 🔧 Backend změny

### Soubory k úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `lib/cashbookHandlers.php` | ✏️ Nový/Rozšířit | Naseptávač + uložení |
| `lib/invoiceHandlers.php` | ✏️ Upravit | Blokace faktury |
| `lib/orderHandlers.php` | ✏️ Upravit | Obousměrné smazání |
| `lib/lpHandlers.php` | ✏️ Upravit | Prepočet LP |
| `api.php` | ✏️ Upravit | Routing |

### Nové/upravované endpointy

#### 1. `POST cashbook/suggest-orders` (NOVÝ)
Vrátí objednávky, které může pokladník přiřadit k pokladní položce.

**Parametry:**
```json
{
  "token": "xxx",
  "username": "pokladnik",
  "uzivatel_id": 123,
  "lp_kod": "FINKP",
  "search": "kancelář"
}
```

**Response:**
```json
{
  "status": "ok",
  "orders": [
    {
      "id": 123,
      "cislo_objednavky": "OBJ-2026-123",
      "predmet": "Nákup materiálu",
      "max_cena_s_dph": 5000.00,
      "lp_kody": ["FINKP"],
      "uzivatel_jmeno": "Jan Novák",
      "dt_objednavky": "2026-05-10",
      "stav_workflow": ["SCHVALENA", "ODESLANA"]
    }
  ],
  "count": 1
}
```

**Filtrování (SQL WHERE):**
- Pokladník je účastník: `(o.uzivatel_id = :uid OR o.garant_id = :uid OR o.prikazce_id = :uid)`
- LP kód FINKP: `JSON_CONTAINS(o.financovani, JSON_OBJECT('lp_kod', 'FINKP'))`
- Workflow ≥ SCHVALENA: `JSON_CONTAINS(o.stav_workflow_kod, '"SCHVALENA"')`
- **Blokovací stavy:** `NOT JSON_CONTAINS(o.stav_workflow_kod, '"VECNA_SPRAVNOST"')` a podobně pro další
- Není v pokladně: `NOT EXISTS (SELECT 1 FROM 25a_pokladni_polozky pp WHERE pp.objednavka_id = o.id AND pp.smazano = 0)`
- Nemá fakturu: `NOT EXISTS (SELECT 1 FROM 25a_objednavky_faktury of WHERE of.objednavka_id = o.id AND of.aktivni = 1)`
- Je aktivní: `o.aktivni = 1`

#### 2. `POST cashbook/save-item` (ROZŠÍŘENÍ)
Uložit položku s vazbou na objednávku.

**Nový parametr:**
```json
{
  "objednavka_id": 123
}
```

**8 validací:**
1. ✅ Objednávka existuje
2. ✅ Pokladník je účastník (objednatel/garant/příkazce)
3. ✅ Není už zaplacena z pokladny
4. ✅ Nemá fakturu
5. ✅ Obsahuje LP FINKP
6. ✅ Workflow ≥ SCHVALENA
7. ✅ Nemá blokovací stavy (`VECNA_SPRAVNOST`, `ZKONTROLOVANA`, `FAKTURACE_CEKA`, `FAKTURA_PRIRAZENA`)
8. ✅ Kontrola částky (vyšší → varování)

**Akce při úspěchu:**
```php
// 1. Uložit položku s objednavka_id
INSERT INTO 25a_pokladni_polozky (..., objednavka_id) VALUES (..., 123);

// 2. Přidat stav POKLADNA do workflow
$workflow = json_decode($order['stav_workflow_kod'], true);
$workflow[] = 'POKLADNA';
UPDATE 25a_objednavky SET stav_workflow_kod = :workflow WHERE id = :id;

// 3. Odeslat notifikace (objednatel + garant + schvalovatel)
send_notification([...], 'Objednávka uhrazena z pokladny');

// 4. Připravit audit (do budoucna)
// audit_log('cashbook_order_assigned', [...]);
```

**Response:**
```json
{
  "status": "ok",
  "message": "Položka uložena a objednávka přiřazena",
  "warning": "⚠️ Částka v pokladně (5500 Kč) je vyšší než objednávka (5000 Kč)",
  "pokladni_polozka_id": 456,
  "objednavka_cislo": "OBJ-2026-123"
}
```

#### 3. `POST cashbook/delete-item` (ROZŠÍŘENÍ)
Smazání položky → uvolnit objednávku.

**Nová logika:**
```php
// Před smazáním položky
if ($polozka['objednavka_id']) {
    // Odstranit stav POKLADNA z objednávky
    $workflow = json_decode($order['stav_workflow_kod'], true);
    $workflow = array_filter($workflow, fn($s) => $s !== 'POKLADNA');
    
    UPDATE 25a_objednavky 
    SET stav_workflow_kod = :workflow 
    WHERE id = :objednavka_id;
    
    // Notifikace
    send_notification([...], 'Platba z pokladny zrušena');
}

// Smazat položku
UPDATE 25a_pokladni_polozky SET smazano = 1 WHERE id = :id;
```

#### 4. `POST orders/delete` (ROZŠÍŘENÍ)
Smazání objednávky → smazat pokladní položku.

**Nová logika:**
```php
// Před smazáním objednávky
UPDATE 25a_pokladni_polozky 
SET smazano = 1 
WHERE objednavka_id = :objednavka_id AND smazano = 0;

// Pak smazat objednávku
UPDATE 25a_objednavky SET aktivni = 0 WHERE id = :id;
```

#### 5. `POST invoice/assign` (ROZŠÍŘENÍ)
Blokace přiřazení faktury.

**Nová validace:**
```php
// Kontrola, zda není v pokladně
$stmt = $db->prepare("
  SELECT COUNT(*) as cnt 
  FROM 25a_pokladni_polozky 
  WHERE objednavka_id = :id AND smazano = 0
");
$stmt->execute([':id' => $objednavka_id]);

if ($stmt->fetch()['cnt'] > 0) {
  http_response_code(400);
  echo json_encode([
    'status' => 'error',
    'message' => 'K této objednávce nelze přiřadit fakturu - byla již zaplacena z pokladny'
  ]);
  exit;
}
```

### Prepočet LP čerpání

**Soubor:** `lib/lpHandlers.php`  
**Funkce:** `prepocetCerpaniPodleIdLP_PDO()` (rozšíření)

**PŘED:**
```sql
SELECT SUM(flc.castka) 
FROM 25a_faktury_lp_cerpani flc
WHERE flc.lp_kod = :lp_kod
```

**PO:**
```sql
SELECT 
    IFNULL(SUM(flc.castka), 0) + IFNULL(SUM(pp.castka_vydaj), 0) as celkem_cerpano
FROM 25a_faktury_lp_cerpani flc
LEFT JOIN 25a_pokladni_polozky pp 
  ON pp.lp_kod = :lp_kod 
  AND pp.smazano = 0
  AND pp.objednavka_id IS NOT NULL
WHERE flc.lp_kod = :lp_kod
```

---

## 🎨 Frontend změny

### Soubory k úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `pages/CashbookPage.js` | ✏️ Upravit | Naseptávač + auto-fill |
| `pages/OrderDetailPage.js` | ✏️ Upravit | Badge pokladna |
| `pages/InvoiceFormPage.js` | ✏️ Upravit | Blokace |
| `services/cashbookService.js` | ✏️ Upravit | API calls |

### UI změny

#### 1. Modul Pokladna - Formulář položky

**Nové UI prvky:**
```jsx
<FormSection>
  <Checkbox 
    label="Platba za objednávku (bez faktury)"
    onChange={handleToggleOrderPayment}
  />
  
  {showOrderPicker && (
    <>
      <SearchInput
        placeholder="🔍 Vyhledat objednávku..."
        onChange={handleSearchOrders}
      />
      
      <OrderList>
        {orders.map(order => (
          <OrderItem key={order.id}>
            <div>{order.cislo_objednavky} | {order.predmet}</div>
            <div>{formatPrice(order.max_cena_s_dph)} | {order.lp_kody.join(', ')}</div>
            <Button onClick={() => handleSelectOrder(order)}>Vybrat</Button>
          </OrderItem>
        ))}
      </OrderList>
      
      {selectedOrder && (
        <>
          <Input 
            label="Popis" 
            value={`Platba za ${selectedOrder.cislo_objednavky}`} 
            readOnly 
          />
          <Input 
            label="Částka" 
            value={selectedOrder.max_cena_s_dph} 
          />
          <Input 
            label="LP kód" 
            value="FINKP" 
            readOnly 
          />
          
          {warning && <Warning>{warning}</Warning>}
        </>
      )}
    </>
  )}
  
  <ButtonGroup>
    <Button type="submit">Uložit</Button>
    <Button type="button" onClick={handleCancel}>Zrušit</Button>
  </ButtonGroup>
</FormSection>
```

**Logika:**
1. Checkbox aktivuje naseptávač
2. API call `cashbook/suggest-orders`
3. Výběr objednávky → auto-fill polí
4. Varování při vyšší částce
5. Uložení → validace + update workflow

#### 2. Detail objednávky

**Nová sekce:**
```jsx
{order.stav_workflow_kod.includes('POKLADNA') && (
  <PaymentSection>
    <SectionTitle>💰 Platba z pokladny</SectionTitle>
    <InfoGrid>
      <InfoRow>
        <Label>Status:</Label>
        <Value>✅ Zaplaceno</Value>
      </InfoRow>
      <InfoRow>
        <Label>Položka:</Label>
        <Value>{cashbookItem.cislo}</Value>
      </InfoRow>
      <InfoRow>
        <Label>Částka:</Label>
        <Value>{formatPrice(cashbookItem.castka)} Kč</Value>
      </InfoRow>
      <InfoRow>
        <Label>Datum:</Label>
        <Value>{formatDate(cashbookItem.datum)}</Value>
      </InfoRow>
    </InfoGrid>
    
    <Warning>⚠️ Faktura NEBUDE vystavena</Warning>
    
    <Button onClick={handleShowCashbookItem}>
      🔗 Zobrazit pokladní položku
    </Button>
  </PaymentSection>
)}
```

#### 3. Formulář faktur

**Nová validace:**
```jsx
const validateOrderBeforeInvoice = async (orderId) => {
  // API call - kontrola, zda není v pokladně
  const response = await checkOrderCashbookStatus(orderId);
  
  if (response.is_cashbook_paid) {
    setError('Tuto objednávku nelze fakturovat - byla již zaplacena z pokladny');
    return false;
  }
  
  return true;
};
```

---

## 📅 Implementační fáze

| # | Fáze | Popis | Dny | Závislosti |
|---|------|-------|-----|------------|
| **1** | 🗄️ Databáze | Migrace, indexy, testování | 1-2 | - |
| **2** | 🔍 BE: Naseptávač | Endpoint `suggest-orders` | 2 | Fáze 1 |
| **3** | 💾 BE: Uložení | Rozšíření `save-item`, validace, workflow | 2-3 | Fáze 1, 2 |
| **4** | 🗑️ BE: Smazání | Obousměrné vazby, blokace faktury | 1 | Fáze 3 |
| **5** | 📊 BE: LP | Prepočet čerpání o pokladnu | 2 | Fáze 3 |
| **6** | 🎨 FE: Pokladna | Naseptávač UI, checkbox, auto-fill | 3 | Fáze 2, 3 |
| **7** | 🖼️ FE: Detail | Badge v detailu OBJ, blokace FA | 2 | Fáze 4, 6 |
| **8** | ✅ Testování | Unit + integrační testy, dokumentace | 1-2 | Všechny |

**📊 Celkem:** 14-17 dní (sekvenční) | **10-12 dní** (paralelní BE+FE)

### Příklad harmonogramu (3 týdny)

**Týden 1: Backend foundation**
- Den 1-2: Migrace DB + Fáze 1
- Den 3-4: Naseptávač (Fáze 2)
- Den 5: Příprava na Fázi 3

**Týden 2: Backend + Frontend paralelně**
- Den 6-8: BE uložení + validace (Fáze 3) | FE naseptávač (Fáze 6)
- Den 9: BE smazání (Fáze 4) | FE pokračování
- Den 10: BE LP prepočet (Fáze 5) | FE detail (Fáze 7)

**Týden 3: Dokončení + testování**
- Den 11-12: FE dokončení
- Den 13-15: Testování (Fáze 8)
- Den 16-17: Bug fixing + code review

---

## ⚠️ Rizika a závislosti

### Technická rizika

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|--------|-----------------|-------|----------|
| **Výkon SQL dotazu** (JSON_CONTAINS) | 🟡 Střední | 🟡 Střední | Index na workflow, limit výsledků, EXPLAIN analýza |
| **Race condition** (2 pokladníci, stejná OBJ) | 🟢 Nízká | 🔴 Vysoký | Transakce + `SELECT FOR UPDATE` |
| **Migrace na prod** (velká tabulka) | 🟡 Střední | 🟡 Střední | Testovat na dev, scheduled downtime |
| **Notifikace spam** (velká org hierarchie) | 🟢 Nízká | 🟢 Nízký | Batch notifikace, user preferences |

### Závislosti

#### Interní:
- ✅ Existující endpoint pro uložení pokladní položky
- ✅ Existující notifikační systém
- ✅ Existující prepočet LP čerpání
- ✅ Workflow management v objednávkách

#### Externí:
- ⚠️ **Org hierarchie** - pokud není implementována, použít fallback
- ⚠️ **Audit systém** - připravit místo, ale zatím neimplementovat

### Blokovací faktory

| Faktor | Status | Řešení |
|--------|--------|--------|
| DB přístup na prod | ❓ Ověřit | Vyžaduje schválení + scheduled window |
| Testovací data | ❓ Ověřit | Připravit objednávky s FINKP |
| Code review kapacita | ❓ Ověřit | Alokovat reviewery předem |

---

## ✅ Kritéria úspěchu

### Funkční požadavky

- [ ] Pokladník může přiřadit schválenou objednávku k pokladní položce
- [ ] Systém automaticky přidá stav `POKLADNA` k objednávce
- [ ] K objednávce v pokladně NELZE přiřadit fakturu (error 400)
- [ ] Objednávky ve stavech `VECNA_SPRAVNOST`/`ZKONTROLOVANA` NELZE přiřadit
- [ ] Pokladní položky se započítávají do čerpání LP
- [ ] Smazání objednávky automaticky smaže pokladní položku
- [ ] Smazání pokladní položky automaticky uvolní objednávku
- [ ] Notifikace jsou odesílány (objednatel + garant + schvalovatel)
- [ ] Kontrola částek: nižší OK, vyšší s upozorněním
- [ ] Dokončení objednávky funguje standardně

### Technické požadavky

- [ ] DB migrace proběhla bez chyb (dev + prod)
- [ ] Všechny endpointy mají validaci a error handling
- [ ] Response formáty: JSON s `status`, `data`, `message`
- [ ] Autentizace: POST body (`token` + `username`)
- [ ] Frontend: ENV variables (žádné hardcoded URL)
- [ ] Audit log připravený
- [ ] Unit testy ≥80% coverage
- [ ] Integrační testy OK
- [ ] Dokumentace kompletní
- [ ] Performance: naseptávač <500ms, uložení <300ms

### Akceptační testy

#### Test 1: Základní flow
1. Vytvořit objednávku s LP FINKP
2. Schválit objednávku
3. Otevřít modul pokladna
4. Vybrat objednávku z naseptávače
5. Uložit položku
6. **✅ Očekáváno:** Objednávka má stav `POKLADNA`, LP čerpání se zvýšilo

#### Test 2: Blokace faktury
1. Vytvořit objednávku placenou z pokladny
2. Zkusit přiřadit fakturu
3. **✅ Očekáváno:** Error "Nelze přiřadit fakturu"

#### Test 3: Blokovací stavy
1. Vytvořit objednávku ve stavu `VECNA_SPRAVNOST`
2. Otevřít naseptávač
3. **✅ Očekáváno:** Objednávka se nezobrazí

#### Test 4: Obousměrné smazání
1. Vytvořit objednávku placenou z pokladny
2. Smazat pokladní položku
3. **✅ Očekáváno:** Objednávka nemá stav `POKLADNA`

#### Test 5: Kontrola částek
1. Vytvořit objednávku 5000 Kč
2. Přiřadit k položce 5500 Kč
3. **✅ Očekáváno:** Varování, ale POVOLÍ uložení

---

## 📊 Odhad zdrojů

### Lidské zdroje

| Role | Úkoly | Hodiny |
|------|-------|--------|
| **Backend developer** | Endpointy, validace, prepočty, migrace | 80-100 h |
| **Frontend developer** | UI komponenty, validace, API integrace | 60-80 h |
| **QA engineer** | Testovací scénáře, automatické testy | 30-40 h |
| **Tech lead** | Code review, konzultace, architektura | 20-30 h |
| **DBA** | Migrace prod, monitoring | 10-15 h |

**Celkem:** ~200-265 hodin (= 25-33 dní při 8h/den, 1 člověk)

### Technické zdroje

- ✅ Dev server (k dispozici)
- ✅ Dev databáze `EEO-OSTRA-DEV` (k dispozici)
- ⚠️ Prod scheduled downtime (~30 min pro migraci)
- ⚠️ Testovací účty (pokladník, objednatel, garant)

---

## 🔄 Workflow diagram

```
┌─────────────────────────────────────────────────────────────┐
│  1. Vytvoření objednávky (s předpokladem faktury)          │
│     ↓                                                        │
│  2. Schválení (workflow ≥ SCHVALENA)                       │
│     ↓                                                        │
│  3. Realizace objednávky                                    │
│     ↓                                                        │
│  ┌────────────────────────┐                                │
│  │ Jak dodavatel doručí?  │                                │
│  └─────────┬──────────────┘                                │
│            ↓                                                 │
│   ┌────────┴─────────┐                                     │
│   │                  │                                      │
│ A) FAKTURA      B) DOBÍRKA/HOTOVOST                       │
│   │                  │                                      │
│   │                  ⚡ Pokladník přiřadí k položce         │
│   │                  ↓                                      │
│   │              Stav: POKLADNA                             │
│   │              (blokace faktury)                          │
│   │                  │                                      │
│   ↓                  ↓                                      │
│ DOKONCENA      DOKONCENA                                    │
│ (s fakturou)   (bez faktury)                               │
│                ✅ účetní právo                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Související dokumentace

### Existující (k prostudování)
- `/_docs/PHP_API_SECURITY_AUDIT_20251220.md` - bezpečnostní standardy
- `/_docs/ERDMS_PLATFORM_STRUCTURE.md` - struktura platformy
- `/apps/eeo-v2/api-legacy/api.eeo/api.php` - konstanty tabulek
- `/apps/eeo-v2/DB_CHANGES_LOG.md` - historie DB změn

### Nová (vytvořit po implementaci)
- `API_CASHBOOK_ORDERS_INTEGRATION.md` - API dokumentace
- `USER_GUIDE_POKLADNA_OBJEDNAVKY.md` - uživatelská příručka
- `SQL_MIGRATION_POKLADNA_OBJEDNAVKY.sql` - migrační skript

---

## 🚦 Next Steps

### Pro rozhodnutí (nyní)
1. ✅ **Schválení plánu** vedením/product ownerem
2. ✅ **Alokace vývojářů** (backend + frontend)
3. ✅ **Stanovení deadline** (doporučeno: 3 týdny)
4. ✅ **Schválení downtime** pro prod migraci

### První kroky po schválení
1. **Den 1:** Vytvoření tasku v issue trackeru (Jira/GitHub)
2. **Den 1:** Příprava testovacích dat na dev DB
3. **Den 1-2:** Fáze 1 - Databázová migrace na dev
4. **Den 2-4:** Fáze 2 - Backend naseptávač
5. **Den 3-7:** Fáze 3 - Backend uložení + validace

### Komunikace
- **Daily standup:** Krátký update o progress
- **Mid-sprint review:** Den 7 - demo naseptávače
- **Pre-deploy review:** Den 14 - kompletní code review
- **Post-deploy monitoring:** Den 18-21 - error logy, performance

---

## ❓ Otevřené otázky

### Pro vedení:
- [ ] Alokovat 2 vývojáře (paralelně) nebo 1 sekvenčně?
- [ ] Kdy scheduled downtime?
- [ ] Potřebujeme user testing před prod?
- [ ] Jaký je deadline?

### Pro DBA:
- [ ] Kolik řádků má `25a_pokladni_polozky` na prod? (odhad času migrace)
- [ ] Je nastavený InnoDB engine? (pro foreign key)
- [ ] Kdy můžeme udělat migraci na prod?

### Pro QA:
- [ ] Máme testovací účty s různými rolemi?
- [ ] Potřebujeme nové testovací LP s kódem FINKP?
- [ ] Kdo bude dělat acceptance testy?

### Pro development team:
- [ ] Kdo vezme backend?
- [ ] Kdo vezme frontend?
- [ ] Kdy začínáme?

---

## 📞 Kontakty

**Product owner:**  
ZZSSK, p.o.

**Technický lead & Vývojář:**  
Robert Holovský  
📞 731 137 077  
✉️ (kontakt v DB)

**QA engineer:**  
Robert Holovský  
📞 731 137 077

**DBA:**  
Robert Holovský  
📞 731 137 077

**Garant, Poradce, EKO:**  
Tereza Bezoušková  
📞 737 851 735  
✉️ tereza.bezouskova@zachranka.cz

---

## 📝 Change Log

| Datum | Verze | Změna | Autor |
|-------|-------|-------|-------|
| 2026-05-15 | 1.0 | Iniciální verze plánu | AI Planning |

---

**🟢 Status: Připraveno ke konzultaci a rozhodnutí**

_Tento dokument je živý - bude aktualizován na základě feedbacku týmu a průběhu implementace._
