# POKLADNÍ KNIHA - DOKUMENTACE OPRÁVNĚNÍ

**Datum:** 7. listopadu 2025  
**Modul:** Pokladní kniha (CashBookPage)

---

## 📋 Nová oprávnění v DB

### Přidaná práva do tabulky `25_prava`:

| ID | Kód práva | Popis | Aktivní |
|----|-----------|-------|---------|
| 34 | `CASH_BOOK_READ` | Zobrazení pokladní knihy - prohlížení záznamů | 1 |
| 35 | `CASH_BOOK_CREATE` | Vytvoření nového záznamu v pokladní knize | 1 |
| 36 | `CASH_BOOK_EDIT` | Editace záznamů v pokladní knize | 1 |
| 37 | `CASH_BOOK_DELETE` | Smazání záznamů z pokladní knihy | 1 |
| 38 | `CASH_BOOK_EXPORT` | Export pokladní knihy (CSV, PDF) | 1 |
| 39 | `CASH_BOOK_MANAGE` | Kompletní správa pokladní knihy (všechna práva) | 1 |

---

## 🔐 Hierarchie oprávnění

```
CASH_BOOK_MANAGE (Kompletní správa)
  └─ Zahrnuje všechna následující práva:
     ├─ CASH_BOOK_READ (Prohlížení)
     ├─ CASH_BOOK_CREATE (Vytváření záznamů)
     ├─ CASH_BOOK_EDIT (Editace záznamů)
     ├─ CASH_BOOK_DELETE (Mazání záznamů)
     └─ CASH_BOOK_EXPORT (Export & Tisk)
```

---

## 👥 Doporučené přiřazení rolím

### 🔴 SUPERADMIN / ADMINISTRATOR
```sql
- CASH_BOOK_MANAGE (zahrnuje vše)
```
**Může:**
- Zobrazit, vytvářet, editovat, mazat všechny záznamy
- Exportovat a tisknout
- Kompletní správa pokladní knihy

---

### 🟠 THP (Technickohospodářský pracovník)
```sql
- CASH_BOOK_READ
- CASH_BOOK_CREATE
- CASH_BOOK_EDIT
- CASH_BOOK_EXPORT
```
**Může:**
- Zobrazit pokladní knihu
- Přidávat nové záznamy (příjmy, výdaje)
- Editovat existující záznamy
- Exportovat do CSV/PDF a tisknout

**Nemůže:**
- Mazat záznamy (ochrana dat)

---

### 🟢 VEDOUCI (Vedoucí oddělení)
```sql
- CASH_BOOK_READ
- CASH_BOOK_EXPORT
```
**Může:**
- Zobrazit pokladní knihu
- Exportovat a tisknout reporty

**Nemůže:**
- Vytvářet, editovat nebo mazat záznamy

---

### 🔵 OBJEDNATEL (Běžný zaměstnanec)
```sql
- (žádná práva)
```
**Nemůže:**
- Přistupovat k pokladní knize

---

## 🎯 Implementace v kódu (CashBookPage.js)

### Kontrola oprávnění:

```javascript
// Zobrazení stránky
const canViewCashBook = hasPermission('CASH_BOOK_READ') || 
                        hasPermission('CASH_BOOK_MANAGE');

// Vytváření a editace záznamů
const canEditEntries = hasPermission('CASH_BOOK_CREATE') || 
                       hasPermission('CASH_BOOK_EDIT') || 
                       hasPermission('CASH_BOOK_MANAGE') ||
                       (userDetail?.roles && userDetail.roles.some(role => 
                         role.kod_role === 'THP' || 
                         role.kod_role === 'SUPERADMIN' || 
                         role.kod_role === 'ADMINISTRATOR'
                       ));

// Mazání záznamů
const canDeleteEntries = hasPermission('CASH_BOOK_DELETE') || 
                         hasPermission('CASH_BOOK_MANAGE');

// Export a tisk
const canExport = hasPermission('CASH_BOOK_EXPORT') || 
                  hasPermission('CASH_BOOK_MANAGE');
```

---

## 📊 Matice oprávnění

| Akce | READ | CREATE | EDIT | DELETE | EXPORT | MANAGE |
|------|------|--------|------|--------|--------|--------|
| **Zobrazit pokladní knihu** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Přidat nový záznam** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Editovat záznam** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Smazat záznam** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Export CSV/PDF** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Tisknout** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🚀 Instalace

### 1. Spuštění SQL skriptu:

```bash
mysql -u root -p evidence_smluv < add_cashbook_permissions.sql
```

### 2. Přiřazení práv rolím:

```sql
-- Příklad pro SUPERADMIN (role_id = 1)
INSERT INTO `25_prava_role` (`role_id`, `pravo_id`) 
SELECT 1, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_MANAGE';

-- Příklad pro THP (role_id = 4)
INSERT INTO `25_prava_role` (`role_id`, `pravo_id`) 
SELECT 4, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ', 
  'CASH_BOOK_CREATE', 
  'CASH_BOOK_EDIT', 
  'CASH_BOOK_EXPORT'
);
```

---

## ⚠️ Bezpečnostní poznámky

1. **CASH_BOOK_DELETE** - Rizikové oprávnění
   - Doporučujeme přiřadit pouze administrátorům
   - Možnost úplného smazání záznamů z databáze

2. **CASH_BOOK_MANAGE** - Nejvyšší oprávnění
   - Zahrnuje všechna práva
   - Pouze pro důvěryhodné uživatele

3. **Audit trail**
   - Zatím není implementován
   - Doporučení: přidat logování změn v pokladní knize

---

## 📝 TODO - Budoucí vylepšení

- [ ] Audit trail - logování všech změn v pokladní knize
- [ ] Oprávnění na úrovni měsíců (editace pouze aktuálního měsíce)
- [ ] Schvalovací workflow pro uzavření měsíce
- [ ] Export s digitálním podpisem
- [ ] Automatické zálohy pokladní knihy

---

**Poslední aktualizace:** 7. listopadu 2025
