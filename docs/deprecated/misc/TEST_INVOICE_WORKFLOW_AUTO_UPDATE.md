# 🧪 TEST PLAN: Automatická změna workflow při věcné kontrole faktur

**Datum:** 09.01.2026  
**Funkce:** Automatická změna stavu objednávky při potvrzení věcné správnosti všech faktur  
**Soubor:** `orderV2InvoiceHandlers.php`

---

## 📋 CO BYLO IMPLEMENTOVÁNO

### ✅ 1. UPDATE faktury (handle_order_v2_update_invoice)

**PRAVIDLO 1: Potvrzení věcné správnosti**
- Když uživatel potvrdí `vecna_spravnost_potvrzeno = 1` u faktury
- → Systém zkontroluje VŠECHNY faktury objednávky
- → Pokud VŠECHNY mají `vecna_spravnost_potvrzeno = 1` → přidá `ZKONTROLOVANA` do workflow
- → Pokud NE všechny → odebere `ZKONTROLOVANA` z workflow

**PRAVIDLO 2: Změna kritických polí**
- Když se změní kritické pole (`fa_castka`, `fa_cislo_vema`, `fa_strediska_kod`, atd.)
- → Systém automaticky vrátí objednávku z `ZKONTROLOVANA` na `VECNA_SPRAVNOST`

### ✅ 2. CREATE faktury (handle_order_v2_create_invoice)

**PRAVIDLO: Přidání nové faktury**
- Když se přidá nová faktura k objednávce
- → Ujistí se, že má `FAKTURACE` a `VECNA_SPRAVNOST`
- → Pokud měla objednávka `ZKONTROLOVANA` → vrátí na `VECNA_SPRAVNOST`

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### TEST 1: Potvrzení poslední faktury → ZKONTROLOVANA

**Příprava:**
1. Vytvoř objednávku ve stavu `VECNA_SPRAVNOST`
2. Přidej 3 faktury
3. Potvrď věcnou správnost u 2 faktur

**Akce:**
4. V modulu Faktury otevři 3. fakturu
5. Zaškrtni checkbox "Věcná správnost potvrzena"
6. Ulož fakturu

**Očekávaný výsledek:**
- ✅ Faktura uložena
- ✅ Objednávka automaticky posunuta na stav `ZKONTROLOVANA`
- ✅ V log souboru: `✅ INVOICE MODULE: Všechny faktury (3x) objednávky #XXX jsou zkontrolované → přidán stav ZKONTROLOVANA`

**Kontrola:**
```sql
-- Zkontroluj workflow objednávky
SELECT id, stav_workflow_kod, stav_objednavky 
FROM 25a_objednavky 
WHERE id = <order_id>;

-- Očekáváno:
-- stav_workflow_kod obsahuje "ZKONTROLOVANA"
-- stav_objednavky = "Zkontrolována"
```

---

### TEST 2: Změna faktury ve stavu ZKONTROLOVANA → návrat na VECNA_SPRAVNOST

**Příprava:**
1. Použij objednávku z TEST 1 (stav `ZKONTROLOVANA`)
2. Všechny 3 faktury mají potvrzenou věcnou správnost

**Akce:**
3. V modulu Faktury otevři libovolnou fakturu
4. Změň kritické pole (např. `fa_castka` nebo `fa_cislo_vema`)
5. Ulož fakturu

**Očekávaný výsledek:**
- ✅ Faktura uložena
- ✅ U faktury automaticky vynulováno `vecna_spravnost_potvrzeno = 0`
- ✅ Objednávka automaticky vrácena na stav `VECNA_SPRAVNOST`
- ✅ V log souboru: `🔙 INVOICE MODULE: Kritická pole faktury #XXX byla změněna → objednávka #XXX vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST`

**Kontrola:**
```sql
-- Zkontroluj workflow objednávky
SELECT id, stav_workflow_kod, stav_objednavky 
FROM 25a_objednavky 
WHERE id = <order_id>;

-- Očekáváno:
-- stav_workflow_kod NEobsahuje "ZKONTROLOVANA"
-- stav_workflow_kod obsahuje "VECNA_SPRAVNOST"
-- stav_objednavky = "Věcná správnost"
```

---

### TEST 3: Přidání nové faktury k objednávce ve stavu ZKONTROLOVANA

**Příprava:**
1. Použij objednávku z TEST 1 (stav `ZKONTROLOVANA`)
2. Všechny faktury mají potvrzenou věcnou správnost

**Akce:**
3. V modulu Faktury přidej novou (4.) fakturu k objednávce
4. Vyplň povinná pole
5. Ulož fakturu

**Očekávaný výsledek:**
- ✅ Faktura vytvořena
- ✅ Objednávka automaticky vrácena na stav `VECNA_SPRAVNOST`
- ✅ V log souboru: `🔙 INVOICE CREATE: Přidána nová faktura → objednávka #XXX vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST`

**Kontrola:**
```sql
-- Zkontroluj workflow objednávky
SELECT id, stav_workflow_kod, stav_objednavky 
FROM 25a_objednavky 
WHERE id = <order_id>;

-- Očekáváno:
-- stav_workflow_kod NEobsahuje "ZKONTROLOVANA"
-- stav_workflow_kod obsahuje "VECNA_SPRAVNOST"
-- stav_objednavky = "Věcná správnost"
```

---

### TEST 4: Odškrtnutí věcné správnosti → odebrání ZKONTROLOVANA

**Příprava:**
1. Použij objednávku z TEST 1 (stav `ZKONTROLOVANA`)
2. Všechny 3 faktury mají potvrzenou věcnou správnost

**Akce:**
3. V modulu Faktury otevři libovolnou fakturu
4. Odškrtni checkbox "Věcná správnost potvrzena"
5. Ulož fakturu

**Očekávaný výsledek:**
- ✅ Faktura uložena s `vecna_spravnost_potvrzeno = 0`
- ✅ Objednávka automaticky vrácena na stav `VECNA_SPRAVNOST`
- ✅ V log souboru: `🔓 INVOICE MODULE: Ne všechny faktury objednávky #XXX jsou zkontrolované → odebrán stav ZKONTROLOVANA`

---

## 🔍 KONTROLA LOGŮ

Zkontroluj Apache error log pro ověření funkčnosti:

```bash
# Sleduj log v reálném čase
tail -f /var/log/apache2/error.log | grep "INVOICE MODULE\|INVOICE CREATE"

# Nebo hledej konkrétní zprávy
grep -E "INVOICE MODULE|INVOICE CREATE" /var/log/apache2/error.log | tail -20
```

**Očekávané log zprávy:**

```
✅ INVOICE MODULE: Všechny faktury (3x) objednávky #11248 jsou zkontrolované → přidán stav ZKONTROLOVANA
🔓 INVOICE MODULE: Ne všechny faktury objednávky #11248 jsou zkontrolované → odebrán stav ZKONTROLOVANA
🔙 INVOICE MODULE: Kritická pole faktury #456 byla změněna → objednávka #11248 vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST
🔙 INVOICE CREATE: Přidána nová faktura → objednávka #11248 vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST
📋 INVOICE MODULE: Workflow objednávky #11248 aktualizováno: NOVA → SCHVALENA → ... → VECNA_SPRAVNOST
```

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

1. **OrderForm25.js NEBYL ZMĚNĚN** - logika tam zůstává stejná a funguje paralelně
2. **Non-blocking** - pokud selže update workflow, faktura se přesto uloží (chyba se jen zaloguje)
3. **Konzistence** - kontrola všech faktur probíhá při každém UPDATE s `vecna_spravnost_potvrzeno`
4. **Automatická validace** - kritická pole automaticky vynulují věcnou správnost a vrátí workflow

---

## 📊 OČEKÁVANÉ VÝSLEDKY

| Akce | Stav před | Stav po | Workflow změna |
|------|-----------|---------|----------------|
| Potvrdit poslední fakturu | VECNA_SPRAVNOST | ZKONTROLOVANA | ✅ Přidána ZKONTROLOVANA |
| Změnit kritické pole | ZKONTROLOVANA | VECNA_SPRAVNOST | 🔙 Odebrána ZKONTROLOVANA |
| Přidat novou fakturu | ZKONTROLOVANA | VECNA_SPRAVNOST | 🔙 Odebrána ZKONTROLOVANA |
| Odškrtnout věcnou správnost | ZKONTROLOVANA | VECNA_SPRAVNOST | 🔙 Odebrána ZKONTROLOVANA |

---

## ✅ CHECKLIST PRO PRODUKCI

- [ ] Všechny 4 testy prošly úspěšně
- [ ] Log zprávy se zobrazují v error.log
- [ ] Workflow se mění korektně v databázi
- [ ] Frontend správně zobrazuje změněný stav objednávky
- [ ] Notifikace se odesílají správně (pokud implementováno)
- [ ] Performance test - změna workflow je okamžitá (< 1s)

---

## 🐛 ZNÁMÉ PROBLÉMY / LIMITACE

1. **Race condition:** Pokud dva uživatelé upravují faktury současně, může dojít k nekonzistenci (řešitelné DB transakcemi)
2. **Frontend refresh:** Po uložení faktury je potřeba reload objednávky, aby se zobrazil nový stav
3. **Notifikace:** Momentálně se neodesílají notifikace při automatické změně workflow (lze doplnit)

---

**Status:** ✅ IMPLEMENTOVÁNO - připraveno k testování  
**Testováno:** ❌ NE  
**Produkce:** ❌ NE
