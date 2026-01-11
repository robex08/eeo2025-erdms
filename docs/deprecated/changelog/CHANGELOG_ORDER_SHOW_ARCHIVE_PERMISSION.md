# CHANGELOG: Přidání práva ORDER_SHOW_ARCHIVE

**Datum:** 4. ledna 2026  
**Autor:** Robert Holovský  
**Verze:** 1.96

---

## 📋 Popis změny

Přidáno nové právo `ORDER_SHOW_ARCHIVE` pro kontrolu viditelnosti checkboxu **ARCHIV** v seznamu objednávek.

### ✅ Co bylo implementováno

1. **Nové právo v databázi:**
   - Kód práva: `ORDER_SHOW_ARCHIVE`
   - Popis: "Zobrazení checkboxu ARCHIV v seznamu objednávek"
   - Aktivní: ANO
   - **NENÍ automaticky přiřazeno žádné roli**

2. **Frontend kontrola:**
   - Checkbox ARCHIV v titulku Orders25List je nyní viditelný **POUZE** pro uživatele s právem `ORDER_SHOW_ARCHIVE`
   - Podmínka: `hasPermission('ORDER_SHOW_ARCHIVE')`

---

## 🗄️ Databázové změny

### DEV databáze (eeo2025-dev):
✅ Právo vytvořeno - ID: 97

### PROD databáze (eeo2025):
⚠️ **ČEKÁ NA NASAZENÍ**

**Pro nasazení na PROD použij:**
```bash
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 < add_order_show_archive_permission_PROD.sql
```

---

## 📝 SQL Skripty

### Soubory:
1. `add_order_show_archive_permission.sql` - DEV databáze (✅ aplikováno)
2. `add_order_show_archive_permission_PROD.sql` - PROD databáze (⏳ čeká)

### SQL kód:
```sql
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ORDER_SHOW_ARCHIVE', 'Zobrazení checkboxu ARCHIV v seznamu objednávek', 1
WHERE NOT EXISTS (
    SELECT 1 FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
);
```

---

## 🔐 Manuální přiřazení práva

### Pro konkrétního uživatele:
```sql
-- Přiřadit právo uživateli ID=123
INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
SELECT 123, id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM 25_uzivatel_prava 
    WHERE uzivatel_id = 123 AND pravo_id = (
        SELECT id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
    )
);
```

### Pro roli:
```sql
-- Přiřadit právo roli ID=5 (např. "Vedoucí oddělení")
INSERT INTO 25_role_prava (role_id, pravo_id)
SELECT 5, id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM 25_role_prava 
    WHERE role_id = 5 AND pravo_id = (
        SELECT id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
    )
);
```

---

## 💻 Kódové změny

### Frontend: Orders25List.js

**Před:**
```javascript
{/* Checkbox pro zobrazení archivovaných objednávek */}
<div style={{ ... }}>
  <MonthDropdownButton>
    <input type="checkbox" checked={showArchived} ... />
    ARCHIV
  </MonthDropdownButton>
</div>
```

**Po:**
```javascript
{/* Checkbox pro zobrazení archivovaných objednávek - POUZE PRO UŽIVATELE S PRÁVEM */}
{hasPermission && hasPermission('ORDER_SHOW_ARCHIVE') && (
  <div style={{ ... }}>
    <MonthDropdownButton>
      <input type="checkbox" checked={showArchived} ... />
      ARCHIV
    </MonthDropdownButton>
  </div>
)}
```

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

1. **NIKDY NEPŘIDÁVAT AUTOMATICKY:**
   - Právo `ORDER_SHOW_ARCHIVE` **NENÍ** přiřazeno žádné roli automaticky
   - Ani SUPERADMIN ani ADMIN nemá toto právo automaticky
   - Musí být přiřazeno manuálně podle potřeby

2. **Důvod existence:**
   - Zobrazení archivu má dopad na výkon (načítání archivovaných dat)
   - Není vhodné pro běžné uživatele (THP, atd.)
   - Mělo by být dostupné pouze pro administrátory nebo vedoucí

3. **Chování bez práva:**
   - Checkbox ARCHIV se **nezobrazí**
   - Uživatel **nemůže** zaškrtnout archiv
   - Stále vidí **aktuální nearchivované** objednávky

---

## 🧪 Testování

### DEV prostředí:
1. ✅ Právo vytvořeno v DB
2. ✅ Frontend zkompilován s kontrolou
3. ⏳ **TODO:** Ověřit na DEV URL, že checkbox NENÍ viditelný pro běžné uživatele

### PROD prostředí:
⏳ **ČEKÁ NA NASAZENÍ**

---

## 📦 Deployment checklist

- [x] SQL skript pro DEV vytvořen
- [x] SQL skript pro PROD vytvořen
- [x] SQL skript spuštěn na DEV
- [ ] SQL skript spuštěn na PROD
- [x] Frontend kód upraven
- [x] Frontend zkompilován (DEV)
- [ ] Frontend zkompilován (PROD)
- [ ] Manuální test na DEV
- [ ] Manuální test na PROD

---

## 🔗 Související změny

Tento changelog navazuje na:
- Přidání fakturant_id do faktur (ORDER_INVOICE_ADD)
- Workflow faktury v Orders25List

---

## 📞 Kontakt

Pro dotazy ohledně této změny kontaktuj: Robert Holovský
