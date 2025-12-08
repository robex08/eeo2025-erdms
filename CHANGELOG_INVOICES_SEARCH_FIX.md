# Oprava vyhledávacích polí v tabulce faktur

## Datum: 8. prosince 2025

## Provedené změny

### Backend (invoiceHandlers.php)

#### 1. Globální vyhledávání (search_term) - ROZŠÍŘENO
Přidána nová pole do fulltextového vyhledávání (celkem **12 polí**):

**Původní pole:**
- Číslo faktury (fa_cislo_vema)
- Číslo objednávky (o.cislo_objednavky)
- Název organizace (org.nazev_organizace)
- Zkratka úseku (us_obj.usek_zkr)
- Celé jméno uživatele (u_vytvoril)
- Poznámka (fa_poznamka)
- Střediska (fa_strediska_kod)

**✅ NOVĚ PŘIDANÁ POLE:**
- **Číslo smlouvy** (sm.cislo_smlouvy)
- **Název smlouvy** (sm.nazev_smlouvy)
- **Věcnou provedl** - celé jméno (u_vecna)
- **Předáno zaměstnanci** - celé jméno (u_predana)
- **Typ faktury** (fa_typ)

#### 2. Sloupcový filtr "Objednávka/Smlouva" - UNIVERZÁLNÍ
Filtr `cislo_objednavky` nyní hledá **V OBOU polích současně**:
- Číslo objednávky (o.cislo_objednavky) - LIKE
- Číslo smlouvy (sm.cislo_smlouvy) - LIKE

```php
// PŘED:
$where_conditions[] = 'LOWER(o.cislo_objednavky) LIKE ?';

// PO:
$where_conditions[] = '(LOWER(o.cislo_objednavky) LIKE ? OR LOWER(sm.cislo_smlouvy) LIKE ?)';
```

#### 3. Stats SQL - Oprava JOINů
Přidány chybějící JOINy do statistického SQL dotazu pro podporu všech filtrů:
- `LEFT JOIN 25_smlouvy sm` - pro vyhledávání v číslech smluv
- `LEFT JOIN 25_uzivatele u_vecna` - pro filtr "věcnou provedl"
- `LEFT JOIN 25_uzivatele u_predana` - pro filtr "předáno zaměstnanci"

### Frontend (Invoices25List.js)

#### 1. Placeholder filtru změněn
- **PŘED:** "Číslo obj..."
- **PO:** "Obj/Sml..." + tooltip "Hledá v číslech objednávek i smluv"

## Výsledek

### Globální vyhledávání (horní search bar)
Nyní vyhledává v:
1. ✅ Číslo faktury
2. ✅ Číslo objednávky
3. ✅ **Číslo smlouvy** (NOVÉ)
4. ✅ **Název smlouvy** (NOVÉ)
5. ✅ Organizace
6. ✅ Úsek
7. ✅ Uživatel (vytvořil)
8. ✅ **Uživatel (věcnou provedl)** (NOVÉ)
9. ✅ **Zaměstnanec (předána)** (NOVÉ)
10. ✅ Poznámka
11. ✅ Střediska
12. ✅ **Typ faktury** (NOVÉ)

### Sloupcový filtr "Objednávka/Smlouva"
- ✅ Hledá v číslech **objednávek**
- ✅ Hledá v číslech **smluv**
- ✅ Částečná shoda (LIKE)
- ✅ Case-insensitive

## Testování

```bash
# Restartovat backend (pokud je potřeba)
cd /var/www/erdms-dev
# Refresh frontend aplikace v prohlížeči
```

### Test scénáře:
1. **Globální vyhledávání:** Zadej číslo smlouvy → mělo by najít faktury
2. **Sloupcový filtr:** Zadej číslo smlouvy do filtru "Obj/Sml" → mělo by najít faktury
3. **Kombinace:** Globální search + sloupcový filtr současně
4. **Jména uživatelů:** Hledej jméno uživatele, který provedl věcnou kontrolu

