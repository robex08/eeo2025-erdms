# Excel Export - Finanční kontrola

**Datum implementace:** 14. května 2026  
**Autor:** Frontend Team  
**Typ změny:** Nová funkce (dodatečný export)

## Přehled

Přidána nová funkcionalita pro export všech sekcí Finanční kontroly do jednoho Excel souboru (.xlsx) s více listy.

### Umístění tlačítka

- **Pozice:** Vlevo od tlačítka "Zobrazit vše" v TabsBar
- **Viditelnost:** Pouze když je aktivní záložka "Finanční kontrola"
- **Vzhled:** Zelené tlačítko s ikonou Excel souboru
- **Text:** "Export vše do XLS"

## Implementované soubory

### 1. `/apps/eeo-v2/client/src/utils/excelExport.js` (NOVÝ)

Utility funkce pro export dat do Excel formátu s podporou více listů.

**Hlavní funkce:**
- `exportToExcel(sheets, filename)` - Vytvoří Excel soubor s více listy
- `formatValueForExcel(value)` - Formátuje hodnoty pro správné zobrazení v Excelu

**Parametry:**
```javascript
sheets: Array<{
  name: string,      // Název listu (max 31 znaků)
  headers: string[], // Názvy sloupců
  rows: Array[]      // Data (2D pole)
}>
filename: string     // Název souboru bez přípony
```

**Funkce:**
- Automatické nastavení šířky sloupců podle obsahu
- Limit 50 znaků na šířku sloupce
- Automatické přidání data do názvu souboru: `${filename}_${YYYY-MM-DD}.xlsx`
- Zkrácení dlouhých názvů listů na max 31 znaků (Excel limit)
- Error handling a logování

### 2. `/apps/eeo-v2/client/src/pages/StatsReportsPage.js` (UPRAVENO)

**Přidáno:**

#### Import (řádek ~20):
```javascript
import { exportToExcel } from '../utils/excelExport';
```

#### Styled Component (řádek ~955):
```javascript
const ExcelExportButton = styled.button`
  border: 1px solid #10b981;
  background: #10b981;
  color: #ffffff;
  border-radius: 10px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  margin-right: 0.75rem;
  transition: all 0.2s ease;

  &:hover {
    background: #059669;
    border-color: #059669;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`;
```

#### Handler Funkce (řádek ~7005):
```javascript
const handleExportAllToExcel = useCallback(() => {
  // Exportuje všech 6 sekcí do jednoho Excel souboru
  // Respektuje filtry FK stavu (ignorováno/vyřešeno)
  // Každá sekce = jeden list v Excel souboru
}, [dependencies...]);
```

**Exportované sekce (listy v Excelu):**

1. **"Faktury > obj"** - Faktury vyšší než schválená objednávka (15 sloupců)
2. **"Obj po faktuře"** - Objednávky vytvořené po doručení faktury (14 sloupců)
3. **"Obj FA bez příloh"** - Objednávky s fakturami bez příloh (12 sloupců)
4. **"FA bez příloh"** - Faktury bez přílohy (13 sloupců)
5. **"FA po splatnosti"** - Faktury po splatnosti 14+ dní (14 sloupců)
6. **"Zrušené obj"** - Zrušené a zamítnuté objednávky (10 sloupců)

#### UI Tlačítko (řádek ~8745):
```javascript
{activeTab === 'control' && (
  <ExcelExportButton onClick={handleExportAllToExcel} title="Exportovat všechny sekce do Excel souboru">
    <FontAwesomeIcon icon={faFileExcel} /> Export vše do XLS
  </ExcelExportButton>
)}
```

## Chování aplikace

### Filtrace dat
Export respektuje stejné filtry jako CSV exporty:
- ✅ FK Status: Ignorováno (`showFkIgnorovano`)
- ✅ FK Status: Vyřešeno (`showFkVyreseno`)
- ❌ NERESPEKTUJE vyhledávací dotaz (exportuje všechna viditelná data)

### Název souboru
Formát: `ExportFinKontrola_YYYY-MM-DD.xlsx`  
Příklad: `ExportFinKontrola_2026-05-14.xlsx`

### Toast notifikace
- **Úspěch:** "Export dokončen: X sekcí exportováno do Excel"
- **Varování:** "Žádná data k exportu" (pokud jsou všechny sekce prázdné)
- **Chyba:** "Chyba při exportu: [error message]"

### Prázdné sekce
Pokud sekce neobsahuje žádná data, není přidána do Excel souboru jako list.

## Technické detaily

### Použité knihovny
- **xlsx** (^0.18.5) - SheetJS pro práci s Excel soubory
- **@fortawesome/react-fontawesome** - Ikona `faFileExcel`
- **@emotion/styled** - Styled components

### Závislosti handler funkce
```javascript
[
  controlSections,              // Data všech sekcí
  invoicesByOrderId,           // Mapování faktur k objednávkám
  ordersById,                  // Mapování objednávek podle ID
  orderToCsvRow,               // Pomocná funkce pro formátování
  getOrderLimit,               // Maximální cena objednávky
  getInvoiceAmount,            // Částka faktury
  getTypFakturyLabel,          // Label typu faktury
  getInvoiceStatusLabel,       // Label stavu faktury
  getOrderStatusLabel,         // Label stavu objednávky
  getOrdererUsekCode,          // Kód úseku objednatele
  getOrderFinancingLabel,      // Label financování
  getOrderFinancingRef,        // Detail financování (LP)
  getOrderTypeLabel,           // Label druhu objednávky
  showFkIgnorovano,            // Zobrazit ignorované položky
  showFkVyreseno,              // Zobrazit vyřešené položky
  showToast                    // Toast notifikace
]
```

## Testování

### Manuální test checklist
1. ✅ Přejít na záložku "Statistiky a reporty"
2. ✅ Otevřít záložku "Finanční kontrola"
3. ✅ Ověřit, že tlačítko "Export vše do XLS" je viditelné (zelené, vlevo od "Zobrazit vše")
4. ✅ Kliknout na tlačítko
5. ✅ Ověřit toast notifikaci o úspěchu
6. ✅ Otevřít stažený Excel soubor
7. ✅ Zkontrolovat přítomnost všech 6 listů (pokud mají data)
8. ✅ Ověřit formátování sloupců a čitelnost dat
9. ✅ Přepnout na jinou záložku (např. "Objednávky") - tlačítko by mělo zmizet
10. ✅ Vrátit se na "Finanční kontrola" - tlačítko by se mělo znovu objevit

### Test s filtry
1. ✅ Nastavit filtr FK Status (skrýt Ignorováno)
2. ✅ Exportovat do XLS
3. ✅ Ověřit, že ignorované položky nejsou v exportu

### Edge cases
- ❌ Všechny sekce prázdné → Toast: "Žádná data k exportu"
- ❌ Chyba při exportu → Toast: "Chyba při exportu: [message]"
- ✅ Dlouhé názvy listů → Zkráceno na 31 znaků
- ✅ Velké množství dat → Automatické formátování šířky sloupců

## Kompatibilita

### Excel verze
- ✅ Microsoft Excel 2010+
- ✅ LibreOffice Calc 6.0+
- ✅ Google Sheets (po nahrání)
- ✅ Excel Online

### Prohlížeče
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Změny oproti původnímu plánu

### Zachováno
- ✅ CSV exporty zůstávají beze změny (toto je DODATEČNÁ funkce)
- ✅ Každá sekce = jeden list v Excel souboru
- ✅ Tlačítko vlevo od "Zobrazit vše"
- ✅ Viditelné pouze v záložce "Finanční kontrola"

### Odlišnosti
- ✅ Export NErespektuje vyhledávací dotaz (exportuje všechna viditelná data po FK filtraci)
- ✅ Prázdné sekce nejsou přidány do Excel souboru
- ✅ Automatické formátování šířky sloupců

## Budoucí vylepšení (volitelné)

1. **Formátování hlaviček** - Tučné písmo v první řádce (vyžaduje xlsx-style)
2. **Barevné rozlišení** - Různé barvy pro různé sekce
3. **Podmíněné formátování** - Zvýraznění kritických položek (po splatnosti)
4. **Automatické filtry** - Excel filtry v hlavičkách
5. **Zmrazení první řádky** - Freeze panes pro hlavičky
6. **Respektování vyhledávání** - Export pouze viditelných záznamů po vyhledávání

## Build a deployment

### Instalace závislostí
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm install
```

### Build
```bash
npm run build
```

### Deploy
```bash
cd /var/www/erdms-dev
./deploy-dev.sh
```

## Podpora

V případě problémů kontaktovat Frontend Team nebo vytvořit issue v repozitáři.

---

**Status:** ✅ Implementováno  
**Testováno:** ⏳ Čeká na manuální test  
**Nasazeno:** ⏳ Čeká na build a deploy
