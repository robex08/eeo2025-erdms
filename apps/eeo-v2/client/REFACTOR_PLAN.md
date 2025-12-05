# OrderFormReadOnly - Kompletní Refaktor podle OF25

## Data z BE (z console.log):
```javascript
{
  zverejnit: "1",  // ← SPRÁVNÉ POLE!
  dt_zverejneni: "2025-11-28",
  registr_iddt: null,
  dt_odeslani: "2025-11-28 12:08:33",
  dt_akceptace: "2025-11-28 12:08:51",
  dt_pridani_faktury: "2025-11-28 12:21:06",
  dt_potvrzeni_vecne_spravnosti: "2025-11-28 12:22:10",
  dt_dokonceni: "2025-11-28 12:23:55",
  
  _enriched: {
    uzivatel, garant_uzivatel, objednatel, prikazce, schvalovatel,
    odesilatel, dodavatel_potvrdil, zverejnil,
    potvrdil_vecnou_spravnost, fakturant, dokoncil,
    strediska[], stav_workflow[], druh_objednavky
  }
}
```

## Sekce v OF25 (pořadí):
1. ✅ Objednatel (user icon, modrá)
2. ✅ Schválení nákupu PO (clipboard icon, zelená)
3. ✅ Dodavatel (building icon, šedá)
4. ✅ Detaily objednávky - položky (box icon, fialová)
5. ✅ Dodání (truck icon, oranžová)
6. ❌ CHYBÍ: Stav odeslání dodavateli
7. ❌ CHYBÍ: Potvrzení objednávky dodavatelem
8. ✅ Registr smluv - rozhodnutí (file-contract, modrá)
9. ✅ Registr smluv - vyplnění (file-contract, fialová)
10. ✅ Fakturace (money icon)
11. ✅ Věcná správnost (check-circle)
12. ✅ Dokončení (check, zelená)
13. ❌ CHYBÍ: Poznámky
14. ❌ CHYBÍ: Přílohy

## Co opravit:

### 1. Barevná schémata podle OF25
- Objednatel: modrá
- Schválení: zelená
- Dodavatel: šedá
- Detaily: fialová
- Dodání: oranžová
- Odeslání: modrá
- Potvrzení: zelená
- Registr rozhodnutí: modrá
- Registr vyplnění: fialová
- Fakturace: modrá
- Věcná správnost: zelená
- Dokončení: zelená

### 2. Chybějící sekce:
- Stav odeslání dodavateli (dt_odeslani, odesilatel)
- Potvrzení objednávky (dt_akceptace, dodavatel_potvrdil)
- Poznámky (poznamka)
- Přílohy (prilohy_count)

### 3. Pole `zverejnit` místo `ma_byt_zverejnena`

### 4. Tlačítko sbalit/rozbalit vše
