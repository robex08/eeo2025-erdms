# Funkce vytěžování formuláře do poznámek

## Popis funkce

Nová funkce umožňuje "vytěžit" (exportovat) data z rozpracovaného formuláře objednávky do poznámek ve formě přehledné HTML tabulky. 

## Umístění

- **Komponenta**: `src/components/panels/NotesPanel.js`
- **Tlačítko**: V toolbaru poznámek, hned za tlačítkem TODO (ikona tabulky 📊)
- **Tooltip**: "Vytěžit rozpracovaný formulář do poznámky (HTML tabulka)"

## Jak to funguje

### 1. Detekce rozpracovaného formuláře
Funkce automaticky vyhledává rozpracovaný formulář v následujícím pořadí:
1. **User-specific draft**: `order_draft_${userId}` v localStorage
2. **Generic draft**: `order_draft` v localStorage  
3. **Záložkové drafty**: klíče obsahující `order_` a `formData`

### 2. Zpracování dat
Funkce extrahuje a formátuje následující pole:

#### Základní informace (priorita 1-2)
- Předmět objednávky
- Číslo objednávky  
- Příkazce PO
- Střediska

#### Dodavatel (priorita 3)
- Název dodavatele
- Adresa dodavatele
- IČO/DIČ dodavatele

#### Objednávka (priorita 4-6)
- Druh objednávky
- Ceny (s DPH, bez DPH, maximální cena)
- Zdroj financování
- Číslo smlouvy

#### Dodání (priorita 7-8)
- Předpokládaný termín dodání
- Místo dodání
- Záruka

#### Poznámky (priorita 9)
- Poznámky a popis

#### Položky (priorita 10)
- Seznam všech položek s cenami a DPH

### 3. HTML výstup
Vytvoří přehlednou HTML tabulku s:
- **Hlavička**: Obsahuje datum/čas vytěžení a zdroj dat
- **Tabulka**: Dvousloupcová (název pole : hodnota)
- **Styling**: Profesionální vzhled s bordery a barvami
- **Metadata**: Informace o zdroji dat (uživatelský/obecný/záložkový draft)

## Příklad použití

### Postup:
1. Otevřete formulář objednávky a vyplňte nějaká pole
2. Otevřete panel poznámek
3. Klikněte na ikonu tabulky (📊) v toolbaru
4. Data se automaticky vloží do poznámky jako HTML tabulka

### Příklad výstupu:
```html
📋 Vytěžená data formuláře (uživatelský draft)
7. 10. 2025 14:30

┌─────────────────────┬──────────────────────────────┐
│ Předmět:           │ Nákup kancelářského vybavení │
│ Příkazce PO:       │ PO12345                      │  
│ Dodavatel název:   │ ACME Corporation s.r.o.      │
│ Max. cena s DPH:   │ 50000 Kč                     │
│ ...                │ ...                          │
└─────────────────────┴──────────────────────────────┘
```

## Chybové stavy

### Žádný formulář nenalezen
```
📝 Žádný rozpracovaný formulář nenalezen
Tip: Otevřete formulář objednávky a vyplňte nějaká pole
```

### Formulář prázdný
```  
📝 Formulář neobsahuje žádná vyplněná pole
Zdroj: uživatelský draft
```

### Chyba načítání
```
❌ Nepodařilo se načíst data formuláře
```

## Technické detaily

### Implementace
- **Funkce**: `buildFormDataHtml()` callback v `NotesPanel.js`
- **Závislosti**: `storageId` pro identifikaci uživatele
- **Bezpečnost**: HTML escaping pro všechny uživatelské hodnoty
- **Kompatibilita**: Podporuje starší i nové formáty polí

### Mapování polí
Funkce rozpoznává jak české názvy polí (`predmet`, `dodavatel_nazev`) tak anglické (`subject`, `supplierName`) kvůli zpětné kompatibilitě.

### Prioritizace
Pole jsou seřazena podle důležitosti (priorita 1-10), takže nejdůležitější informace jsou vždy nahoře.

## Testování

Pro testování je k dispozici soubor `test-form-export.js` s funkcemi:
- `createTestDraft()` - vytvoří testovací draft
- `removeTestDraft()` - odstraní testovací draft  
- `testFormExport()` - test HTML generování

## Integrace

Funkce je plně integrována do existujícího systému poznámek a automaticky:
- Detekuje změny v `storageId`
- Používá stejný styling jako ostatní toolbar tlačítka
- Vkládá obsah na pozici kurzoru
- Aktualizuje stav poznámek pro auto-save

## Budoucí rozšíření

Možná vylepšení:
- Export do jiných formátů (Markdown, JSON)
- Filtrování polí podle důležitosti
- Možnost editace před vložením
- Export i z uložených (ne pouze rozpracovaných) objednávek