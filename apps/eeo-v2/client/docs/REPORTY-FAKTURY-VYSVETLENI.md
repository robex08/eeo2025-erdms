# 🔍 REPORTY - Detailní vysvětlení problematických případů

**Datum:** 27. listopadu 2025  
**Status:** CLARIFICATION  

---

## ❓ OTÁZKY K OBJASNĚNÍ

Jsou zde 3 reporty, které vyžadují bližší vysvětlení a upřesnění požadavků:

---

## 1. ❗ NESROVNALOSTI VE FAKTURACI

### 🎯 Co tento report hlídá?

**Problém:** Objednávka má jinou částku než faktura od dodavatele.

### 📋 Příklad situace:

```
Objednávka 2025/1234:
- Objednaná částka:     50 000 Kč bez DPH
- Faktura od dodavatele: 55 000 Kč bez DPH
- ❌ NESROVNALOST:       +5 000 Kč (+10%)
```

### 🔍 Co se děje v systému:

V tabulce **objednávky** (`orders25`) máme:
```sql
cislo_objednavky: "2025/1234"
cena_celkem_bez_dph: 50000.00      -- Objednaná částka
fakturovana_cena_bez_dph: 55000.00 -- Skutečná částka z faktury
```

### ⚠️ Kdy k tomu dochází?

1. **Dodavatel dodá více než bylo objednáno**
   - Objednali jsme 10 ks × 5000 Kč = 50 000 Kč
   - Dodavatel dodal 11 ks × 5000 Kč = 55 000 Kč
   - Vyfakturoval 55 000 Kč

2. **Změna ceny od dodavatele**
   - Objednali jsme za 50 000 Kč
   - Dodavatel zvýšil cenu (inflace, kurzové rozdíly)
   - Vyfakturoval 55 000 Kč

3. **Dodatečné služby/náklady**
   - Objednali jsme zboží za 50 000 Kč
   - Dodavatel přidal dopravu 5 000 Kč
   - Vyfakturoval celkem 55 000 Kč

### 📊 Co report zobrazí?

```
| Objednávka | Dodavatel    | Objednáno | Fakturováno | Rozdíl  | Rozdíl % |
|------------|--------------|-----------|-------------|---------|----------|
| 2025/1234  | ABC s.r.o.   | 50 000 Kč | 55 000 Kč   | +5 000  | +10%     |
| 2025/1567  | XYZ a.s.     | 100 000   | 95 000 Kč   | -5 000  | -5%      |
```

### 💡 Proč to hlídat?

- ✅ **Kontrola rozpočtu** - překročení objednávky
- ✅ **Compliance** - nesoulad objednávka vs faktura
- ✅ **Audit** - odhalení podezřelých případů
- ✅ **Plánování** - korekce budoucích objednávek

### 🔧 Implementace

**Varianta A: Frontend filtering** (pokud data jsou v `orders25`)
```javascript
const discrepancies = allOrders.filter(order => {
  const objednano = parseFloat(order.cena_celkem_bez_dph || 0);
  const fakturovano = parseFloat(order.fakturovana_cena_bez_dph || 0);
  
  // Hlídáme pouze fakturované objednávky
  if (!fakturovano || fakturovano === 0) return false;
  
  // Rozdíl větší než 1% (tolerance)
  const rozdil = Math.abs(fakturovano - objednano);
  const procento = (rozdil / objednano) * 100;
  
  return procento > 1; // Větší než 1% rozdíl
});
```

**Varianta B: Backend endpoint** (pokud potřebujeme složitější logiku)
```sql
SELECT 
  o.cislo_objednavky,
  o.dodavatel_nazev,
  o.cena_celkem_bez_dph as objednano,
  o.fakturovana_cena_bez_dph as fakturovano,
  (o.fakturovana_cena_bez_dph - o.cena_celkem_bez_dph) as rozdil,
  ((o.fakturovana_cena_bez_dph - o.cena_celkem_bez_dph) / o.cena_celkem_bez_dph * 100) as procento
FROM orders25 o
WHERE o.fakturovana_cena_bez_dph IS NOT NULL
  AND o.fakturovana_cena_bez_dph > 0
  AND ABS(o.fakturovana_cena_bez_dph - o.cena_celkem_bez_dph) / o.cena_celkem_bez_dph > 0.01
ORDER BY procento DESC
```

### ✅ DOPORUČENÍ

**Pokud máme pole `fakturovana_cena_bez_dph` v tabulce `orders25`:**
→ **FRONTEND FILTERING** - žádný nový BE endpoint!

**Pokud je to v samostatné tabulce faktury:**
→ Potřebujeme nový BE endpoint s JOIN

---

## 2. ⏪ ZPĚTNÉ OBJEDNÁVKY (Retroaktivní objednávky)

### 🎯 Co tento report hlídá?

**Problém:** Objednávka byla vytvořena **PO TOM**, co už přišla faktura od dodavatele.

### 📋 Příklad situace:

```
❌ ŠPATNĚ (zpětná objednávka):

15.10.2025  - Dodavatel dodal zboží a vystavil fakturu
20.10.2025  - Někdo vytvořil objednávku (5 dní POZDĚJI!)

Správný workflow by měl být:
1. Vytvoříme objednávku
2. Objednávku schválíme
3. Dodavatel dodá zboží
4. Zadáme fakturu do systému
```

### 🔍 Co se děje v systému:

```sql
-- Objednávka
datum_vytvoreni: 2025-10-20 10:00:00

-- Faktura (v téže objednávce)
fa_datum_vystaveni: 2025-10-15 12:00:00

-- ❌ datum_vytvoreni > fa_datum_vystaveni
-- = ZPĚTNÁ OBJEDNÁVKA!
```

### ⚠️ Kdy k tomu dochází?

1. **Urgentní nákup bez procesu**
   - Někdo rychle objednal zboží telefonem
   - Dodavatel okamžitě dodal a vyfakturoval
   - Až pak někdo zadal objednávku do systému

2. **Zapomenutí na objednávku**
   - Dodavatel dodal zboží
   - Přišla faktura
   - Teprve pak si někdo vzpomněl, že chybí objednávka

3. **Obcházení systému**
   - Někdo úmyslně objednal bez procesu
   - Dodatečně vytvořil objednávku "na papíře"

### 💡 Proč to hlídat?

- ✅ **Compliance** - porušení pravidel veřejných zakázek
- ✅ **Kontrola** - odhalení obcházení procesů
- ✅ **Audit** - rizikové případy pro kontrolu
- ✅ **Prevence** - sankce za porušení zákona o veřejných zakázkách

### 🔧 Implementace

**Problém:** Potřebujeme data z **faktury**, která může být:
- A) V samostatné tabulce `faktury`
- B) V tabulce `orders25` jako pole `fa_datum_vystaveni`

**Varianta A: Frontend filtering** (pokud je `fa_datum_vystaveni` v `orders25`)
```javascript
const retroactiveOrders = allOrders.filter(order => {
  const datumVytvoreni = new Date(order.datum_vytvoreni);
  const datumFaktury = order.fa_datum_vystaveni ? new Date(order.fa_datum_vystaveni) : null;
  
  // Pouze fakturované objednávky
  if (!datumFaktury) return false;
  
  // Objednávka vytvořena POZDĚJI než faktura
  return datumVytvoreni > datumFaktury;
});
```

**Varianta B: Backend endpoint** (pokud je v samostatné tabulce)
```sql
SELECT 
  o.cislo_objednavky,
  o.datum_vytvoreni,
  f.fa_datum_vystaveni,
  DATEDIFF(o.datum_vytvoreni, f.fa_datum_vystaveni) as dnu_zpozdeni
FROM orders25 o
JOIN faktury f ON f.objednavka_id = o.id
WHERE o.datum_vytvoreni > f.fa_datum_vystaveni
ORDER BY dnu_zpozdeni DESC
```

### ✅ DOPORUČENÍ

**Pokud máme pole `fa_datum_vystaveni` v tabulce `orders25`:**
→ **FRONTEND FILTERING** - žádný nový BE endpoint!

**Pokud je v samostatné tabulce faktury:**
→ Potřebujeme nový BE endpoint s JOIN

---

## 3. ⚡ URGENTNÍ PLATBY (Splatnost < 5 dní)

### 🎯 Co tento report hlídá?

**Problém:** Faktury, které je potřeba zaplatit v nejbližších dnech (riziko penále).

### 📋 Příklad situace:

```
Dnes:       27.11.2025

Faktura A:  Splatnost 29.11.2025 → ⚡ Za 2 dny!
Faktura B:  Splatnost 01.12.2025 → ⚡ Za 4 dny!
Faktura C:  Splatnost 10.12.2025 → ✅ V pořádku (za 13 dní)
```

### 🔍 Co se děje v systému:

```sql
-- Objednávka s fakturou
cislo_objednavky: "2025/1234"
fa_datum_splatnosti: 2025-11-29    -- Splatnost za 2 dny
fa_zaplaceno: 0                     -- Ještě NEZAPLACENO
```

### ⚠️ Proč to hlídat?

- ✅ **Cash-flow management** - plánování plateb
- ✅ **Prevence penále** - pozdní platby = sankce
- ✅ **Prioritizace** - které faktury zaplatit první
- ✅ **Vztahy s dodavateli** - včasné platby

### 💡 Use case:

**Pracovník účtárny:**
> "Každé ráno si chci zobrazit faktury, které musím zaplatit do 5 dnů, 
> abych je stihla připravit k úhradě a vyhnula se penále."

### 🔧 Implementace

**Varianta A: Frontend filtering** (pokud je `fa_datum_splatnosti` v `orders25`)
```javascript
const urgentPayments = allOrders.filter(order => {
  const splatnost = order.fa_datum_splatnosti ? new Date(order.fa_datum_splatnosti) : null;
  const zaplaceno = order.fa_zaplaceno;
  
  // Pouze NEZAPLACENÉ faktury
  if (!splatnost || zaplaceno === 1) return false;
  
  // Splatnost do X dní
  const daysLimit = 5;
  const daysToPayment = Math.floor(
    (splatnost.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return daysToPayment <= daysLimit && daysToPayment >= 0;
});

// Seřadit podle splatnosti (nejbližší první)
urgentPayments.sort((a, b) => {
  const dateA = new Date(a.fa_datum_splatnosti);
  const dateB = new Date(b.fa_datum_splatnosti);
  return dateA - dateB;
});
```

**Varianta B: Backend endpoint** (pokud je v samostatné tabulce)
```sql
SELECT 
  o.cislo_objednavky,
  o.dodavatel_nazev,
  f.fa_cislo,
  f.fa_datum_splatnosti,
  DATEDIFF(f.fa_datum_splatnosti, CURDATE()) as dnu_do_splatnosti,
  o.fakturovana_cena_s_dph as castka
FROM orders25 o
JOIN faktury f ON f.objednavka_id = o.id
WHERE f.fa_zaplaceno = 0
  AND f.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)
ORDER BY f.fa_datum_splatnosti ASC
```

### ✅ DOPORUČENÍ

**Pokud máme pole `fa_datum_splatnosti` a `fa_zaplaceno` v tabulce `orders25`:**
→ **FRONTEND FILTERING** - žádný nový BE endpoint!

**Pokud je v samostatné tabulce faktury:**
→ Potřebujeme nový BE endpoint s JOIN

---

## 📊 SHRNUTÍ - Potřebujeme nový BE?

### Klíčová otázka: Jsou fakturační data v tabulce `orders25`?

Pokud **ANO** (data jsou přímo v objednávce):
```javascript
orders25 {
  id,
  cislo_objednavky,
  cena_celkem_bez_dph,           // Objednaná částka
  fakturovana_cena_bez_dph,      // Fakturovaná částka
  fa_datum_vystaveni,             // Datum vystavení faktury
  fa_datum_splatnosti,            // Splatnost
  fa_zaplaceno,                   // 0/1 - zaplaceno?
  datum_vytvoreni                 // Datum vytvoření objednávky
}
```

→ **Všechny 3 reporty lze implementovat na FRONTENDU!** ✅

---

Pokud **NE** (data jsou v samostatné tabulce `faktury`):
```javascript
orders25 {
  id,
  cislo_objednavky,
  cena_celkem_bez_dph,
  datum_vytvoreni
}

faktury {
  id,
  objednavka_id,              // FK → orders25.id
  fa_cislo,
  fa_datum_vystaveni,
  fa_datum_splatnosti,
  fa_castka_bez_dph,
  fa_zaplaceno
}
```

→ **Potřebujeme 3 nové BE endpointy s JOIN** ⚠️

---

## ❓ OTÁZKY K ZODPOVĚZENÍ

1. **Jsou fakturační data v tabulce `orders25`?**
   - Pole: `fakturovana_cena_bez_dph`, `fa_datum_vystaveni`, `fa_datum_splatnosti`, `fa_zaplaceno`
   - Nebo jsou v samostatné tabulce `faktury`?

2. **Máme samostatnou tabulku faktury?**
   - Může být jedna objednávka mít více faktur?
   - Nebo je vždy 1:1 vztah (1 objednávka = 1 faktura)?

3. **Jak se ukládají faktury v systému?**
   - Vidím komponentu `InvoiceAttachmentsCompact` - faktury jako přílohy?
   - Nebo jsou faktury samostatné záznamy v DB?

---

## 💡 DOPORUČENÍ

**Pokud jsou data v `orders25`:**
→ Implementovat všechny 3 reporty na **FRONTENDU** (žádný nový BE!)

**Pokud jsou v samostatné tabulce:**
→ Vytvořit 3 nové BE endpointy:
- `POST /reports/invoice-discrepancy`
- `POST /reports/retroactive-orders`  
- `POST /reports/urgent-payments`

---

**Připravil:** AI Assistant  
**Datum:** 27. listopadu 2025  
**Status:** WAITING FOR CLARIFICATION
