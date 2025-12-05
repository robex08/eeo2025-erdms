# 📄 ISDOC Automatické zpracování - Rychlý přehled

## Co bylo implementováno?

✅ **Automatická detekce ISDOC faktur** při nahrávání  
✅ **Automatická klasifikace** na typ "FAKTURA"  
✅ **Dialog s náhledem dat** a možností vyplnit fakturu  
✅ **Datum doručení** nastaveno vždy na aktuální datum  
✅ **Info tooltip** s detaily z ISDOC (počet položek, dodavatel, částky)

---

## Jak to funguje?

### 1. Uživatel nahraje ISDOC soubor

```
Drag & Drop nebo File Picker
↓
Systém detekuje příponu .isdoc
↓
Automaticky naparsuje XML
↓
Zobrazí dialog s náhledem
```

### 2. Dialog nabídne 3 možnosti

```
┌────────────────────────────────────┐
│ 📄 Detekován ISDOC formát!         │
├────────────────────────────────────┤
│ Číslo faktury: FA-2025-001         │
│ Dodavatel: Firma s.r.o.            │
│ Částka: 125 000,00 Kč              │
│ Počet položek: 3                   │
├────────────────────────────────────┤
│ [Vyplnit údaje faktury]            │ ← Extrahuje data
│ [Nahrát bez extrakce]              │ ← Jen nahraje soubor
│ [Zrušit]                           │ ← Zruší upload
└────────────────────────────────────┘
```

### 3. Systém vyplní fakturu

```
✓ Číslo Fa/VPD
✓ Datum vystavení
✓ Datum splatnosti
✓ Datum doručení (= DNEŠNÍ DATUM)
✓ Částka s DPH
✓ Částka bez DPH
✓ DPH
✓ Střediska (z objednávky)
```

---

## Soubory

| Soubor | Popis |
|--------|-------|
| `src/utils/isdocParser.js` | Parser ISDOC XML souborů |
| `src/components/invoices/ISDOCParsingDialog.js` | Dialog pro potvrzení |
| `src/components/invoices/InvoiceAttachmentsCompact.js` | Upload logika + ISDOC detekce |
| `src/forms/OrderForm25.js` | Handler pro vyplnění faktury |
| `docs/ISDOC-AUTO-PARSING-FEATURE.md` | Kompletní dokumentace |

---

## Testování

### Základní test:
1. Otevři objednávku ve FÁZI 5
2. Klikni na fakturu → Edituj
3. Nahraj ISDOC soubor (např. `Faktura_250100528.isdoc`)
4. Ověř, že se zobrazil dialog
5. Klikni "Vyplnit údaje faktury"
6. Ověř, že pole jsou vyplněná
7. **Zkontroluj datum doručení = dnešní datum** ✅
8. Ověř, že ISDOC soubor je v přílohách s typem "FAKTURA"

### Test bez extrakce:
1-4. Stejné jako výše
5. Klikni "Nahrát bez extrakce"
6. Ověř, že pole zůstala prázdná
7. Ověř, že ISDOC soubor je v přílohách

---

## Poznámky

⚠️ **Datum doručení** je vždy aktuální datum (podle zadání)  
⚠️ **Klasifikace** na "FAKTURA" je automatická  
⚠️ Pokud parsing selže → Běžný upload bez extrakce dat  
⚠️ Tooltip vedle "FAKTURA 1" zobrazí detaily z ISDOC

---

**Status:** ✅ HOTOVO  
**Datum:** 27. října 2025  
**Testováno:** Ne - čeká na testování v prohlížeči
