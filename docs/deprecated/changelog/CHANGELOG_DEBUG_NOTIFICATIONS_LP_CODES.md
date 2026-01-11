# 🔧 CHANGELOG: Debug Duplikátních Notifikací + LP Kódy v PDF

**Datum:** 2025-01-03  
**Branch:** `feature/generic-recipient-system`  
**Autor:** GitHub Copilot

---

## 🎯 Problémy

### 1. LP kódy chybí v PDF finančních kontrolních košilek
- **Symptom:** V PDF se nezobrazuje sekce "LP kódy" s názvy LP kódů
- **Očekáváno:** Zobrazení LP kódů ve formátu "LP-001 - Spotřeba materiálu"

### 2. Duplikátní notifikace při schválení
- **Symptom:** Notifikace se posílají 2x
- **Původní hypotéza:** INSERT + UPDATE posílá notifikaci dvakrát (❌ CHYBNÁ)
- **Správná analýza:** 
  - INSERT se volá jen při vytvoření objednávky (stav: NOVA → ODESLANA_KE_SCHVALENI)
  - UPDATE se volá až při změnách (např. ODESLANA_KE_SCHVALENI → SCHVALENA)
  - Notifikace by měla být poslána **POUZE při změně stavu**, ne při každém uložení

---

## 🔍 Provedené Změny

### 1. Přidány DEBUG logy pro LP kódy v PDF

**Soubor:** `/apps/eeo-v2/client/src/components/FinancialControlPDF.js`  
**Řádky:** 579-582

```javascript
// 🔍 DEBUG: Zkontroluj, co backend poslal
console.log('🔍 [FinancialControlPDF] order.financovani:', order?.financovani);
console.log('🔍 [FinancialControlPDF] order.lp_kod:', order?.lp_kod);
console.log('🔍 [FinancialControlPDF] financovaniData:', financovaniData);
```

**Účel:** Zjistit, zda backend posílá `order.financovani.lp_nazvy` enriched data

---

### 2. Přidány DEBUG logy pro duplikátní notifikace

#### Frontend - OrderForm25.js
**Řádky:** 11205-11228

```javascript
console.log('🔍 [NOTIFICATION DEBUG] SCHVALENA check:', {
  hasSchvalena,
  hadSchvalena,
  result_workflow: result.stav_workflow_kod,
  old_workflow: oldWorkflowKod,
  formData_id: formData.id,
  order_number: orderNumber
});

if (hasSchvalena && !hadSchvalena) {
  console.log('✅ [NOTIFICATION] Posílám notifikaci SCHVALENA pro:', orderNumber);
  // ... odeslání notifikace
} else {
  console.log('⏭️ [NOTIFICATION] Přeskakuji SCHVALENA notifikaci - stav se nezměnil');
}
```

**Účel:** Zjistit, kdy přesně se notifikace posílá a proč dvakrát

#### Backend - notificationHandlers.php
**Řádky:** 4210-4230

```php
error_log("║  Call Stack (first 3 frames):                                  ║");

// 🔍 DEBUG: Zobraz call stack pro identifikaci duplikátů
$backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5);
foreach (array_slice($backtrace, 1, 3) as $idx => $trace) {
    $function = isset($trace['function']) ? $trace['function'] : 'unknown';
    $file = isset($trace['file']) ? basename($trace['file']) : 'unknown';
    $line = isset($trace['line']) ? $trace['line'] : 'unknown';
    error_log("║  #" . ($idx + 1) . " {$file}:{$line} -> {$function}()");
}
```

**Účel:** Zobrazit call stack při každém volání `triggerNotification()`, aby bylo vidět, odkud se volá dvakrát

---

## 🧪 Testovací Scénář

### Test 1: LP kódy v PDF
1. Vytvoř objednávku s financováním "Limitovaný příslib"
2. Přiřaď LP kódy (např. LP-001, LP-005)
3. Dokončit objednávku
4. Generovat PDF finanční kontrolu
5. **Zkontroluj browser console** - měly by se zobrazit debug logy:
   ```
   🔍 [FinancialControlPDF] order.financovani: { lp_nazvy: [...], ... }
   🔍 [FinancialControlPDF] order.lp_kod: [1, 5]
   🔍 [FinancialControlPDF] financovaniData: { lp_nazvy: [...], ... }
   ```

### Test 2: Duplikátní notifikace
1. Vytvoř objednávku (stav: NOVA → ODESLANA_KE_SCHVALENI)
2. Schválit objednávku (stav: ODESLANA_KE_SCHVALENI → SCHVALENA)
3. **Zkontroluj browser console** - měl by se zobrazit log:
   ```
   🔍 [NOTIFICATION DEBUG] SCHVALENA check: { hasSchvalena: true, hadSchvalena: false, ... }
   ✅ [NOTIFICATION] Posílám notifikaci SCHVALENA pro: O-0019/75030926/2026/EN
   ```
4. **Zkontroluj backend error_log** (`/var/log/apache2/error.log` nebo `/var/www/erdms-dev/logs/`):
   ```
   🔔 NOTIFICATION TRIGGER CALLED!
   Event Type: order_status_schvalena
   Object ID: 123
   Call Stack:
     #1 orderV2Endpoints.php:XXX -> handle_order_v2_update()
     #2 ...
   ```
5. **Očekávaný výsledek:** Notifikace by měla být poslána **POUZE JEDNOU**

---

## 📊 Možné Příčiny Duplikátů (pro další analýzu)

1. **Frontend volá handleSave() dvakrát** - např. při double-click nebo debounce fail
2. **Backend triggerNotification() je volaný dvakrát** z různých míst v kódu
3. **notificationRouter()** posílá notifikaci víckrát kvůli logice příjemců
4. **Hierarchické notifikace** - možná se notifikace posílá jak tvůrci, tak nadřízenému

---

## ✅ Next Steps

1. **Vygeneruj PDF** s testovací objednávkou → zkontroluj console logy
2. **Proveď schválení** testovací objednávky → zkontroluj browser console + backend error_log
3. **Pošli logy** uživateli pro analýzu
4. **Podle výsledků** implementuj finální opravu

---

## 📝 Poznámky

- Debug logy jsou **TEMPORARY** - po vyřešení problému je ODSTRANIT
- Backend call stack pomůže identifikovat přesné místo, odkud se notifikace volá dvakrát
- Frontend console logy ukážou, zda se problém děje na straně frontendu (dvakrát uložení) nebo backendu (dvakrát trigger)

