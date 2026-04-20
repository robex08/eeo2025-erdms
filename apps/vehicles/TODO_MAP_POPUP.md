# 🚗 TODO - Map Popup Vylepšení

## 📋 Plánované funkce pro popup okno vozidel

### 1️⃣ Proklik na detail objednávky v EEO
- [ ] Přidat odkaz z čísla objednávky přímo do EEO aplikace
- [ ] Formát: `ev. číslo objednávky` → kliknutelný link
- [ ] Target URL: `https://erdms.zachranka.cz/eeo-v2/#/orders/{order_id}`
- [ ] Otevírání v novém tabu (`target="_blank"`)

**Implementace:**
```javascript
<a href="https://erdms.zachranka.cz/eeo-v2/#/orders/${o.id}" 
   target="_blank" 
   style="color:#4338ca;font-weight:700;text-decoration:underline;">
  ${o.cislo_objednavky}
</a>
```

---

### 2️⃣ Celková suma servisních prací za aktuální rok
- [ ] Přidat řádek s celkovou sumou všech servisních objednávek
- [ ] Filtrovat pouze objednávky z aktuálního roku (2026)
- [ ] Zobrazit formátovanou částku (např. "123 456,78 Kč")
- [ ] Umístění: Pod seznam objednávek, před footer

**Implementace:**
```javascript
// Výpočet sumy za aktuální rok
const currentYear = new Date().getFullYear();
const currentYearOrders = orders.filter(o => {
  const year = new Date(o.dt_odeslani || o.dt_akceptace).getFullYear();
  return year === currentYear;
});
const totalCost = currentYearOrders.reduce((sum, o) => sum + parseFloat(o.castka_celkem || 0), 0);

// HTML
<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 8px;margin-top:6px;border-radius:4px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:600;color:#92400e;font-size:0.75rem;">Celkem ${currentYear}:</span>
    <span style="font-weight:700;color:#92400e;font-size:0.8rem;">${formatPrice(totalCost)}</span>
  </div>
</div>
```

---

### 3️⃣ Predikce dosažení 250 000 km
- [ ] Zobrazit **POUZE** pokud aktuální nájezd < 250 000 km
- [ ] Vypočítat průměrný měsíční nájezd (za posledních X měsíců)
- [ ] Predikovat datum, kdy vozidlo dosáhne 250K km
- [ ] Zobrazit jako info box pod hlavními údaji

**Výpočet:**
```javascript
// Pokud pos_km < 250000
const currentKm = parseInt(vehicle.pos_km);
if (currentKm < 250000) {
  // Získat historii nájezdů z posledních 6 měsíců (API endpoint?)
  // Vypočítat průměr: avgKmPerMonth
  const remainingKm = 250000 - currentKm;
  const monthsToGo = Math.ceil(remainingKm / avgKmPerMonth);
  const predictedDate = new Date();
  predictedDate.setMonth(predictedDate.getMonth() + monthsToGo);
  
  // HTML
  <div style="background:#fef3c7;border-left:3px solid #eab308;padding:5px 7px;margin-bottom:6px;border-radius:4px;">
    <div style="font-size:0.72rem;color:#854d0e;display:flex;justify-content:space-between;">
      <span>📊 Predikce 250K km:</span>
      <span style="font-weight:700;">${formatDate(predictedDate)}</span>
    </div>
    <div style="font-size:0.65rem;color:#a16207;margin-top:2px;">
      Průměr: ${avgKmPerMonth.toLocaleString()} km/měs
    </div>
  </div>
}
```

**Poznámky:**
- Potřeba API endpoint pro historii nájezdů: `action=vehicleKmHistory&carid={id}&months=6`
- Alternativa: Použít existující data z `w_pos_km_month` (pokud je dostupné)

---

### 4️⃣ Speciální barva pro referenční vozidla (REF)
- [ ] Vozidla s typem "REF" (referenčák) mají mít výraznou jinou barvu než šedivou
- [ ] Aktuálně: REF vozidla mají stejnou šedou barvu jako ostatní
- [ ] Návrh: Použít oranžovou/zlatou barvu pro lepší rozlišení (#f59e0b nebo #ea580c)
- [ ] Změnit barvu ikony vozidla na mapě i pozadí v popupu

**Implementace:**
```javascript
// V StationsMapBlock.js - funkce updateVehicleMarkers()
const typ = vehicle.zzs_typ || 'Ostatní';
let color = '#94a3b8'; // default šedá

if (typ === 'RLP' || typ === 'RZP') {
  color = '#3b82f6'; // modrá
} else if (typ === 'REF') {
  color = '#ea580c'; // oranžová pro referenčáky
}

// Použít v ikonce:
background: ${color}
```

**Soubor:** `StationsMapBlock.js` - řádky cca 720-750 (funkce `updateVehicleMarkers`)

---

## 🔧 Technické poznámky

### Soubor k editaci:
- `/var/www/erdms-dev/apps/vehicles/src/components/vehicles/StationsMapBlock.js`
- Funkce: `generateServiceHistoryHtml()` a `generatePopupContent()`

### Potřebné API změny:
1. **Pro proklik:** Ujistit se, že API vrací `order_id` nebo `id_objednavky`
2. **Pro predikci:** Nový endpoint nebo rozšířit stávající o historii nájezdů

### Testing:
- [ ] Otestovat proklik na EEO detail objednávky
- [ ] Ověřit správnost výpočtu celkové sumy
- [ ] Zkontrolovat predikci na vozidlech s různými nájezdy (< 100K, 150K, 240K)
- [ ] Mobile responsivita

---

## 📅 Priorita implementace

1. **Vysoká:** Proklik na detail objednávky (nejjednodušší, vysoká hodnota)
2. **Vysoká:** Speciální barva pro REF vozidla (rychlá oprava, lepší UX)
3. **Střední:** Celková suma za rok (užitečné, rychlá implementace)
4. **Nízká:** Predikce 250K km (vyžaduje dodatečná data, nice-to-have)

---

_Vytvořeno: 19.04.2026_
_Soubor: StationsMapBlock.js_
