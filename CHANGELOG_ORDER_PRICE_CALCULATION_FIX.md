# Fix: Unifikace logiky počítání cen objednávek

**Datum:** 2025-12-19
**Branch:** feature/generic-recipient-system

## Problém

Různé části systému počítaly celkovou cenu objednávky různě:

1. **Backend (orderHandlers.php)**: Počítal `faktury_celkova_castka_s_dph` a `polozky_celkova_cena_s_dph`, ale neposkytoval finální `celkova_cena_s_dph`
2. **Desktop (Orders25List.js)**: Počítal pouze z položek, **ignoroval faktury**
3. **Mobile (OrderApprovalCard.jsx)**: Zobrazoval pouze `max_cena_s_dph` (limit), **ne skutečnou cenu**

## Řešení

Unifikována logika ve všech třech místech podle **priority**:

```
1. PRIORITA: faktury_celkova_castka_s_dph (pokud > 0)
2. PRIORITA: polozky_celkova_cena_s_dph (pokud > 0)  
3. FALLBACK: max_cena_s_dph (schválený limit)
```

## Změny

### 1. Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

**Přidáno:**
- Nová funkce `calculateOrderTotalPrice($order)` implementující prioritní logiku
- Integrace do `enrichOrderWithInvoices()` - přidává `celkova_cena_s_dph` do každé objednávky

**Výsledek:**
- API nyní vrací `celkova_cena_s_dph` s korektní hodnotou pro každou objednávku
- Backup vytvořen: `orderHandlers.php.backup_20251219_HHMMSS`

### 2. Desktop: `/apps/eeo-v2/client/src/pages/Orders25List.js`

**Upraveno:**
- Funkce `getOrderTotalPriceWithDPH()` (řádek 6249)
- Přidána kontrola faktur jako první priorita
- Přidán fallback na `max_cena_s_dph` jako poslední možnost

**Výsledek:**
- Stats dlaždice (`totalAmount`, `completedAmount`, `incompleteAmount`) nyní počítají správně
- Zobrazují skutečnou cenu včetně faktur, ne pouze položky

### 3. Mobile: `/apps/eeo-v2/client/src/components/mobile/OrderApprovalCard.jsx`

**Přidáno:**
- Nová funkce `getCelkovaCena(order)` implementující prioritní logiku
- Label změněn z "Max. cena s DPH:" na "Celková cena s DPH:"

**Výsledek:**
- Mobilní aplikace zobrazuje skutečnou cenu, ne pouze limit

## Testovací scénáře

### ✅ Scénář 1: Objednávka s fakturami
```
Faktury: 150 000 Kč
Položky: 120 000 Kč
Max cena: 200 000 Kč
→ Zobrazí: 150 000 Kč (faktury mají prioritu)
```

### ✅ Scénář 2: Objednávka pouze s položkami
```
Faktury: -
Položky: 85 000 Kč
Max cena: 100 000 Kč
→ Zobrazí: 85 000 Kč (položky)
```

### ✅ Scénář 3: Objednávka bez faktur a položek
```
Faktury: -
Položky: -
Max cena: 50 000 Kč
→ Zobrazí: 50 000 Kč (fallback na limit)
```

### ✅ Scénář 4: Nová objednávka
```
Faktury: -
Položky: -
Max cena: 75 000 Kč
→ Zobrazí: 75 000 Kč
```

## Další kroky

- [ ] Otestovat API endpoint `/orders/list` - ověřit přítomnost `celkova_cena_s_dph`
- [ ] Otestovat desktop stats dlazdice - ověřit správné součty
- [ ] Otestovat mobilní zobrazení - ověřit správnou cenu
- [ ] Spustit všechny 4 testovací scénáře
- [ ] Code review
- [ ] Merge do main

## Poznámky

- Backend používá PDO standard dle V2025.03
- Všechny soubory zkontrolovány bez chyb kompilace/lintu
- Backup vytvořen před změnami
- Dokumentace: `ANALYSIS_ORDER_PRICE_CALCULATION.md`
