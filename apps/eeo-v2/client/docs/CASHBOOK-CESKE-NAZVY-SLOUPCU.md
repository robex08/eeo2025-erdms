# 🇨🇿 České názvy sloupců - Pokladní kniha

**Datum aktualizace:** 8. listopadu 2025

## 📋 MAPOVÁNÍ: Anglický → Český název

### Tabulka: `25a_pokladni_knihy`

| Anglicky (původní) | Česky (nově) | Typ | Popis |
|-------------------|--------------|-----|-------|
| `user_id` | `uzivatel_id` | INT | ID uživatele (majitel) |
| `year` | `rok` | SMALLINT | Rok (2025) |
| `month` | `mesic` | TINYINT | Měsíc (1-12) |
| `cashbox_number` | `cislo_pokladny` | INT | Číslo pokladny (600) |
| `workplace_code` | `kod_pracoviste` | VARCHAR(50) | Kód pracoviště (HK) |
| `workplace_name` | `nazev_pracoviste` | VARCHAR(255) | Název pracoviště |
| `carry_over_amount` | `prevod_z_predchoziho` | DECIMAL(10,2) | Převod z předchozího měsíce |
| `opening_balance` | `pocatecni_stav` | DECIMAL(10,2) | Počáteční stav |
| `closing_balance` | `koncovy_stav` | DECIMAL(10,2) | Konečný stav měsíce |
| `total_income` | `celkove_prijmy` | DECIMAL(10,2) | Celkové příjmy |
| `total_expense` | `celkove_vydaje` | DECIMAL(10,2) | Celkové výdaje |
| `entry_count` | `pocet_zaznamu` | INT | Počet záznamů |
| `is_closed` | `uzavrena` | TINYINT(1) | Uzavřená kniha (0/1) |
| `closed_at` | `uzavrena_kdy` | DATETIME | Datum uzavření |
| `closed_by` | `uzavrena_kym` | INT | Kdo uzavřel |
| `notes` | `poznamky` | TEXT | Poznámky |
| `created_at` | `vytvoreno` | DATETIME | Datum vytvoření |
| `updated_at` | `aktualizovano` | DATETIME | Datum aktualizace |
| `created_by` | `vytvoril` | INT | Kdo vytvořil |
| `updated_by` | `aktualizoval` | INT | Kdo upravil |

---

### Tabulka: `25a_pokladni_polozky`

| Anglicky (původní) | Česky (nově) | Typ | Popis |
|-------------------|--------------|-----|-------|
| `cashbook_id` | `pokladni_kniha_id` | INT | ID pokladní knihy (FK) |
| `entry_date` | `datum_zapisu` | DATE | Datum zápisu |
| `document_number` | `cislo_dokladu` | VARCHAR(20) | Číslo dokladu (P001) |
| `document_type` | `typ_dokladu` | ENUM | 'prijem' / 'vydaj' |
| `description` | `obsah_zapisu` | VARCHAR(500) | Obsah zápisu |
| `person_name` | `komu_od_koho` | VARCHAR(255) | Komu/Od koho |
| `income_amount` | `castka_prijem` | DECIMAL(10,2) | Příjem (Kč) |
| `expense_amount` | `castka_vydaj` | DECIMAL(10,2) | Výdaj (Kč) |
| `balance_after` | `zustatek_po_operaci` | DECIMAL(10,2) | Zůstatek po operaci |
| `lp_code` | `lp_kod` | VARCHAR(50) | Kód LP |
| `lp_description` | `lp_popis` | VARCHAR(255) | Popis LP kódu |
| `note` | `poznamka` | TEXT | Poznámka |
| `row_order` | `poradi_radku` | INT | Pořadí řádku |
| `is_deleted` | `smazano` | TINYINT(1) | Smazáno (0/1) |
| `deleted_at` | `smazano_kdy` | DATETIME | Datum smazání |
| `deleted_by` | `smazano_kym` | INT | Kdo smazal |
| `created_at` | `vytvoreno` | DATETIME | Datum vytvoření |
| `updated_at` | `aktualizovano` | DATETIME | Datum aktualizace |
| `created_by` | `vytvoril` | INT | Kdo vytvořil |
| `updated_by` | `aktualizoval` | INT | Kdo upravil |

---

### Tabulka: `25a_pokladni_audit`

| Anglicky (původní) | Česky (nově) | Typ | Popis |
|-------------------|--------------|-----|-------|
| `entity_type` | `typ_entity` | ENUM | 'kniha' / 'polozka' |
| `entity_id` | `entita_id` | INT | ID entity |
| `action` | `akce` | ENUM | viz níže |
| `user_id` | `uzivatel_id` | INT | ID uživatele |
| `old_values` | `stare_hodnoty` | TEXT | Staré hodnoty (JSON) |
| `new_values` | `nove_hodnoty` | TEXT | Nové hodnoty (JSON) |
| `ip_address` | `ip_adresa` | VARCHAR(45) | IP adresa |
| `user_agent` | `user_agent` | VARCHAR(255) | User agent (ponecháno) |
| `created_at` | `vytvoreno` | DATETIME | Datum akce |

**ENUM hodnoty pro `akce`:**
- `vytvoreni` (create)
- `uprava` (update)
- `smazani` (delete)
- `obnoveni` (restore)
- `uzavreni` (close)
- `otevreni` (reopen)

---

## 🔑 Indexy a Constraints

### Indexy - nové názvy:

| Původní | Nový název |
|---------|-----------|
| `unique_user_period` | `unique_uzivatel_obdobi` |
| `idx_user_id` | `idx_uzivatel_id` |
| `idx_year_month` | `idx_rok_mesic` |
| `idx_is_closed` | `idx_uzavrena` |
| `idx_cashbook_id` | `idx_pokladni_kniha_id` |
| `idx_entry_date` | `idx_datum_zapisu` |
| `idx_document_number` | `idx_cislo_dokladu` |
| `idx_document_type` | `idx_typ_dokladu` |
| `idx_is_deleted` | `idx_smazano` |
| `idx_lp_code` | `idx_lp_kod` |
| `idx_entity` | `idx_entita` |
| `idx_action` | `idx_akce` |
| `idx_created_at` | `idx_vytvoreno` |

### Foreign Keys - nové názvy:

| Původní | Nový název |
|---------|-----------|
| `fk_cashbooks_user` | `fk_pokladni_knihy_uzivatel` |
| `fk_cashbooks_closed_by` | `fk_pokladni_knihy_uzavrena_kym` |
| `fk_entries_cashbook` | `fk_polozky_pokladni_kniha` |
| `fk_entries_deleted_by` | `fk_polozky_smazano_kym` |
| `fk_audit_user` | `fk_audit_uzivatel` |

### Constraints - nové názvy:

| Původní | Nový název |
|---------|-----------|
| `chk_amount_valid` | `chk_castka_platna` |

---

## 🔄 Triggery

| Původní | Nový název |
|---------|-----------|
| `tr_cashbooks_before_update` | `tr_pokladni_knihy_before_update` |
| `tr_entries_before_update` | `tr_pokladni_polozky_before_update` |

---

## ✅ Výhody českých názvů

1. **Čitelnost** - okamžitě jasné co sloupec obsahuje
2. **Konzistence** - celá DB má české názvy (25a_users, 25a_objednavky...)
3. **Maintenance** - jednodušší pro české vývojáře
4. **Dokumentace** - není nutné překládat v dokumentaci
5. **SQL dotazy** - srozumitelnější pro celý tým

---

## 📚 Reference dokumenty

- `CASHBOOK-DB-MIGRATION-ANALYSIS.md` - kompletní analýza s českými názvy
- `CASHBOOK-BACKEND-PROMPT.md` - backend implementace s českými názvy

---

**Všechny názvy jsou nyní v češtině! 🇨🇿**
