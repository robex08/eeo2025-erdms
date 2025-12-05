# Stav Registru a Notifikace - Fix 2025-11-04

## 📋 Přehled změn

### 1. ✅ Štítek "Má být zveřejněno" ve sloupci Stav registru

**Problém:**
- Objednávky ve workflow stavu `UVEREJNIT` neměly štítek ve sloupci "Stav registru"
- Štítek se zobrazoval pouze pokud byla v `registr_smluv.zverejnit` hodnota `'ANO'`

**Řešení:**
Přidána helper funkce `getOrderWorkflowStatus()` která extrahuje aktuální workflow stav z:
- `order.stav_workflow_kod` (pole objektů nebo JSON string)
- `order.stav_workflow.kod_stavu` (fallback)

**Logika sloupce "Stav registru":**
```javascript
// 1. ZVEŘEJNĚNO - má dt_zverejneni A registr_iddt
if (registr.dt_zverejneni && registr.registr_iddt) {
  stavText = 'Zveřejněno';
  stavIcon = faCheckCircle;
  statusCode = 'UVEREJNENA'; // zelená
}
// 2. MÁ BÝT ZVEŘEJNĚNO - workflow stav UVEREJNIT NEBO zverejnit: 'ANO'
else if (workflowStatus === 'UVEREJNIT' || registr?.zverejnit === 'ANO') {
  stavText = 'Má být zveřejněno';
  stavIcon = faClock;
  statusCode = 'ODESLANA_KE_SCHVALENI'; // oranžová
}
```

**Tři workflow stavy registru:**
1. **UVEREJNIT** - má být zveřejněno (oranžový štítek s hodinami)
2. **UVEREJNENA** - již zveřejněno (zelený štítek se zaškrtnutím)
3. **NEUVEREJNIT** - nebude se zveřejňovat (žádný štítek)

---

### 2. ✅ Filtry registru - OR logika (oboje najednou)

**Problém:**
- Checkboxy "Má být zveřejněno" a "Bylo již zveřejněno" se vzájemně vypínaly
- Nebylo možné zobrazit oboje najednou

**Řešení:**
Odstraněna vzájemná exkluze checkboxů + upravena logika filtrování:

```javascript
// Pokud jsou zaškrtnuté OBĚ → OR logika
if (filterMaBytZverejneno && filterByloZverejneno) {
  // Zobraz objednávky které splňují ALESPOŇ JEDNO:
  // - Má být zveřejněno (ale ještě není) NEBO
  // - Už je zveřejněno
  const splnujeFilter = (maZverejnit && !jeZverejneno) || jeZverejneno;
}
// Pokud je zaškrtnutý jen jeden → původní AND logika
```

**Použití:**
- ☑️ **Má být zveřejněno** - zobrazí neschválené objednávky k zveřejnění
- ☑️ **Bylo již zveřejněno** - zobrazí již zveřejněné objednávky
- ☑️☑️ **Oboje** - zobrazí oboje (OR) pro úplný přehled

---

### 3. ✅ Stav objednávky v notifikacích

**Problém:**
- Notifikace zobrazovaly: Předmět, Cena, Příkazce, Schvalovatel
- **CHYBĚL STAV OBJEDNÁVKY** → uživatel nevěděl v jakém stavu je objednávka

**Řešení:**
Přidáno pole **"Stav"** do všech zobrazení order notifikací:

**Před:**
```
Předmět: ... | Cena: ... | Příkazce: ... | Schvalovatel: ...
```

**Po:**
```
Předmět: ... | Stav: ... | Cena: ... | Příkazce: ... | Schvalovatel: ...
```

**Upravená místa v `NotificationsPage.js`:**
1. **Hlavní notifikace** (řádek ~1674)
2. **Starší notifikace** v expanded view (řádek ~1900)
3. **Collapsed notifikace** v detailu (řádek ~2083)

**Data z notifikace:**
```javascript
mainNotification.data.order_status || 'N/A'
```

---

## 🔧 Technické detaily

### Soubory upravené:

#### `src/pages/Orders25List.js`
- ➕ Přidána funkce `getOrderWorkflowStatus(order)`
- 🔄 Upravena definice sloupce "Stav registru" (accessorKey: 'stav_registru')
- 🔄 Upravena logika filtrování pro OR podporu
- 🔄 Odstraněna vzájemná exkluze checkboxů filtrů
- 📦 Přidány dependencies: `getOrderWorkflowStatus` do `columns` a `filteredData`

#### `src/pages/NotificationsPage.js`
- ➕ Přidáno pole **"Stav:"** do 3 míst zobrazení order notifikací
- 🎯 Použití: `notification.data.order_status`
- 🔄 Změněny UI labely: "🔕 Nezobrazuje se ve zvonečku"
- 🔄 Aktualizovány tooltips pro lepší UX

#### `src/services/notificationsApi.js`
- ➕ Přidány 6 nových NOTIFICATION_TYPES konstant (mapováno na existující DB templates)
- ➕ Přidána 6 helper funkcí: `notifyOrderToBePublished()`, `notifyOrderPublished()`, atd.
- ➕ Přidán `order_status` do notification data v `notifyOrderStatusChange()`
- ➕ Přidány statusConfig mapování pro nové workflow stavy

**Mapování workflow stavů na DB templates:**

| Konstanta v kódu | Workflow stav | DB template | DB ID |
|-----------------|---------------|-------------|-------|
| `ORDER_STATUS_UVEREJNIT` | UVEREJNIT | `order_status_registr_ceka` | 13 |
| `ORDER_STATUS_UVEREJNENA` | UVEREJNENA | `order_status_registr_zverejnena` | 14 |
| `ORDER_STATUS_FAKTURACE` | FAKTURACE | `order_status_faktura_prirazena` | 60 |
| `ORDER_STATUS_VECNA_SPRAVNOST` | VECNA_SPRAVNOST | `order_status_zkontrolovana` | ? |
| `ORDER_STATUS_ZKONTROLOVANA` | ZKONTROLOVANA | `order_status_kontrola_ceka` | 19 |
| `ORDER_STATUS_NEUVEREJNIT` | NEUVEREJNIT | `order_status_neuverejnit` | ⚠️ **CHYBÍ v DB** |

---

## 📊 Use Cases

### UC1: Zobrazení štítku pro UVEREJNIT stav
**Vstup:** Objednávka má `stav_workflow_kod` s posledním stavem `UVEREJNIT`  
**Výstup:** Ve sloupci "Stav registru" se zobrazí oranžový štítek "Má být zveřejněno" 🕒

### UC2: Zobrazení štítku pro zverejnit: 'ANO'
**Vstup:** Objednávka má v `registr_smluv.zverejnit` hodnotu `'ANO'`  
**Výstup:** Ve sloupci "Stav registru" se zobrazí oranžový štítek "Má být zveřejněno" 🕒

### UC3: Filtr obou stavů registru najednou
**Vstup:** Uživatel zaškrtne ☑️ "Má být zveřejněno" + ☑️ "Bylo již zveřejněno"  
**Výstup:** Zobrazí se objednávky které mají být zveřejněny **NEBO** už jsou zveřejněné

### UC4: Zobrazení stavu v notifikaci
**Vstup:** Uživatel otevře stránku notifikací  
**Výstup:** V detailu každé order notifikace vidí aktuální stav objednávky (např. "Schválená", "Rozpracovaná", atd.)

---

## ⚠️ Poznámky

### Backend závislosti
Pro plnou funkčnost je potřeba, aby backend vkládal do notifikací pole `order_status`:

```javascript
notification.data = {
  order_id: 123,
  order_number: "O-2025-001",
  order_subject: "Dodávka materiálu",
  order_status: "Schválená", // ⬅️ DŮLEŽITÉ
  max_price: 50000,
  creator_name: "Jan Novák",
  action_performed_by: "Petr Svoboda"
}
```

Pokud backend neposílá `order_status`, zobrazí se `'N/A'`.

### Workflow stavy registru
Systém podporuje tři explicitní workflow stavy:
- `UVEREJNIT` - čeká na zveřejnění
- `UVEREJNENA` - již zveřejněno
- `NEUVEREJNIT` - nebude zveřejňováno

Samostatně funguje i kontrola `registr_smluv.zverejnit === 'ANO'` jako fallback.

---

## 🧪 Testování

### Test 1: Štítek UVEREJNIT
1. Vytvoř objednávku a posuň ji do stavu `UVEREJNIT`
2. Otevři seznam objednávek
3. ✅ Ověř, že ve sloupci "Stav registru" vidíš oranžový štítek "Má být zveřejněno" 🕒

### Test 2: Filtr obou checkboxů
1. Zaškrtni ☑️ "Má být zveřejněno"
2. Zaškrtni ☑️ "Bylo již zveřejněno"
3. ✅ Ověř, že se zobrazí OBĚ skupiny objednávek

### Test 3: Stav v notifikaci
1. Vytvoř notifikaci pro order (např. změnou stavu)
2. Otevři stránku `/notifications`
3. ✅ Ověř, že v detailu notifikace vidíš pole **"Stav: ..."**

---

## 📅 Datum implementace
**4. listopadu 2025**

## 👤 Autor změn
GitHub Copilot + @holovsky
