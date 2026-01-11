# Rozdílná logika počítání ceny: Desktop vs Backend/Mobile

## Problém
V tabulce Orders25List se zobrazují **dva sloupce**:
- **"Cena s DPH"** - skutečná cena (faktury nebo položky)  
- **"Max. cena s DPH"** - schválený limit

Pro objednávky **"KE SCHVÁLENÍ"** (bez položek a faktur) se původně zobrazovala **stejná hodnota v obou sloupcích**, což bylo matoucí.

## Řešení

### Desktop Tabulka (Orders25List.js)
**Sloupec "Cena s DPH"** - `getOrderTotalPriceWithDPH()`:
```javascript
1. Faktury (pokud > 0)
2. Položky (pokud > 0)
3. ❌ BEZ fallbacku na max_cena_s_dph
4. Vrátí 0 (zobrazí "---")
```

**Výsledek:**
- Objednávky "KE SCHVÁLENÍ": Cena s DPH = **prázdno/0**, Max. cena = **hodnota**
- Objednávky s položkami: Cena s DPH = **součet položek**, Max. cena = **limit**
- Objednávky s fakturami: Cena s DPH = **součet faktur**, Max. cena = **limit**

### Backend API (orderHandlers.php)
**Pole `celkova_cena_s_dph`** - `calculateOrderTotalPrice()`:
```php
1. Faktury (pokud > 0)
2. Položky (pokud > 0)
3. ✅ Fallback na max_cena_s_dph
```

**Důvod:** API vrací jednu hodnotu "celková cena", ne dva sloupce. Pro objednávky bez položek je správné vrátit max_cena jako orientační hodnotu.

### Mobile (OrderApprovalCard.jsx)
**Zobrazení "Celková cena s DPH"** - `getCelkovaCena()`:
```javascript
1. Faktury (pokud > 0)
2. Položky (pokud > 0)
3. ✅ Fallback na max_cena_s_dph
```

**Důvod:** Mobilní karta zobrazuje jednu hodnotu "Celková cena s DPH", ne oddělené sloupce. Pro objednávky "KE SCHVÁLENÍ" je vhodné zobrazit max_cena jako orientační limit.

## Shrnutí

| Komponenta | Fallback na max_cena? | Důvod |
|------------|----------------------|-------|
| **Desktop sloupec "Cena s DPH"** | ❌ NE | Oddělené sloupce - uživatel vidí limit v "Max. cena" |
| **Backend API** | ✅ ANO | Jedno pole - vrací nejlepší dostupnou hodnotu |
| **Mobile karta** | ✅ ANO | Jedna hodnota - zobrazí orientační cenu |

## Testovací scénář

### Objednávka "KE SCHVÁLENÍ" (bez položek/faktur)
- **Desktop:**
  - Sloupec "Cena s DPH": `---` (prázdno)
  - Sloupec "Max. cena s DPH": `2 500 Kč` ✓
- **Mobile:**
  - Zobrazí: "Celková cena s DPH: 2 500 Kč" ✓
- **Backend API:**
  - Vrací: `celkova_cena_s_dph: 2500` ✓

### Objednávka s položkami (27 500 Kč)
- **Desktop:**
  - Sloupec "Cena s DPH": `27 500 Kč` ✓
  - Sloupec "Max. cena s DPH": `27 500 Kč` ✓
- **Mobile:**
  - Zobrazí: "Celková cena s DPH: 27 500 Kč" ✓
- **Backend API:**
  - Vrací: `celkova_cena_s_dph: 27500` ✓
