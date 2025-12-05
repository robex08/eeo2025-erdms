# TODO Seznam - 14. listopadu 2025

## 🔴 Implementace - Priorita VYSOKÁ

### 1. Implementovat hromadné generování DOCX
- Dokončit funkci pro hromadné generování DOCX dokumentů z vybraných objednávek
- Aktuálně jen `console.log` + `alert`, potřeba napojit na API pro generování
- **Soubor:** `/src/pages/Orders25List.js`, řádek cca **14150**
- Použít vybrané šablony z `bulkDocxTemplates` a podepisovatele z `bulkDocxSigners`

### 2. Implementovat hromadné schvalování
- Dokončit funkci pro hromadné schvalování objednávek
- Aktuálně je skeleton kód v `Orders25List.js` (`bulkApprovalOrders`, `showBulkApprovalDialog`)
- Potřeba implementovat update stavu workflow na `SCHVALENA` pro více objednávek najednou

---

## 🟡 Testování - Priorita STŘEDNÍ

### 3. Ověřit hromadné generování DOCX
- Otestovat generování DOCX pro více objednávek najednou
- Zkontrolovat správné dosazení dat, podepisovatelů a šablon
- Ověřit chybové stavy (chybějící šablona/podepisovatel)

### 4. Ověřit hromadné schvalování
- Otestovat hromadné schvalování více objednávek
- Zkontrolovat správnou změnu stavu, aktualizaci workflow, oprávnění uživatelů
- Ověřit notifikace a logy

### 5. Ověřit generování DOCX a mapování vypočítaných polí
- Otestovat individuální i hromadné generování DOCX
- Zkontrolovat správné mapování vypočítaných polí:
  - `vypocitane.vybrany_uzivatel_cele_jmeno`
  - `vypocitane.vypoctene_dph`
- Ověřit pole v generovaných dokumentech: `OJMENO`, `OEMAIL`, `OTELEFON`, `DPH`

### 6. Vyzkoušet hromadné mazání objednávek
- Otestovat hromadné mazání s volbou hard/soft delete
- Ověřit správné zobrazení dialogu pro adminy vs. běžné uživatele
- Zkontrolovat správné smazání/označení jako neaktivní
- Test pro více objednávek najednou
- **Soubor:** `/src/pages/Orders25List.js`, `BulkDeleteDialog` komponenta

### 7. Ověřit FAKTURY - přílohy a jejich klasifikace
- Otestovat modul faktur - nahrávání příloh
- Jejich klasifikaci (původní faktura, opravná faktura, doklad atd.)
- **HLAVNĚ:** Zkontrolovat změnu klasifikace u existujících příloh
- Ověřit správné ukládání do DB tabulky `faktury_prilohy`

---

## ✅ HOTOVO

### 8. ✅ Opraveno: Datepicker zelené podbarvení odstraněno
- `DateTodayButton` změněn z zelené (#10b981) na bílou
- `CalendarDate` odstraněno zelené podbarvení pro dnešní den (isToday)
- **Soubor:** `/src/pages/Orders25List.js`

### 9. ✅ Opraveno: Filtr 'Ke schválení' pokrývá oba stavy
- Upraven `filterByStatusArray` v `/src/utils/orderFiltersAdvanced.js`
- `'KE_SCHVALENI'` nyní filtruje jak `'KE_SCHVALENI'` tak `'ODESLANA_KE_SCHVALENI'`
- Obě varianty stavů jsou nyní korektně filtrovány

---

## 📝 Poznámky

- Branch: `LISTOPAD-VIKEND`
- Poslední commit: "RH: CHECKBOX VYBER - Checkbox sloupec pro vyber objednavek..."
- Poslední push: force push na origin
