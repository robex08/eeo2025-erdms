# Faktury - Definice vlivu položek na workflow

**Datum:** 8. prosince 2025  
**Databáze:** eeo2025 @ 10.3.172.11  
**Tabulka:** `25a_objednavky_faktury`

---

## 📊 Kompletní výpis položek z databáze

```sql
DESCRIBE 25a_objednavky_faktury;
```

| # | Field | Type | Null | Key | Default | Extra |
|---|-------|------|------|-----|---------|-------|
| 1 | **id** | int(10) | NO | PRI | NULL | auto_increment |
| 2 | **objednavka_id** | int(10) | YES | MUL | NULL | |
| 3 | **fa_dorucena** | tinyint(1) | YES | | 0 | |
| 4 | **fa_zaplacena** | tinyint(1) | NO | MUL | 0 | |
| 5 | **fa_datum_vystaveni** | date | YES | MUL | NULL | |
| 6 | **fa_datum_splatnosti** | date | YES | MUL | NULL | |
| 7 | **fa_datum_doruceni** | date | YES | MUL | NULL | |
| 8 | **fa_castka** | decimal(15,2) | NO | | NULL | |
| 9 | **fa_cislo_vema** | varchar(100) | NO | MUL | NULL | |
| 10 | **fa_typ** | varchar(32) | YES | MUL | BEZNA | |
| 11 | **potvrdil_vecnou_spravnost_id** | int(11) | YES | MUL | NULL | |
| 12 | **dt_potvrzeni_vecne_spravnosti** | datetime | YES | MUL | NULL | |
| 13 | **vecna_spravnost_umisteni_majetku** | text | YES | | NULL | |
| 14 | **vecna_spravnost_poznamka** | text | YES | | NULL | |
| 15 | **vecna_spravnost_potvrzeno** | tinyint(1) | YES | MUL | 0 | |
| 16 | **fa_strediska_kod** | text | YES | | NULL | |
| 17 | **fa_poznamka** | text | YES | | NULL | |
| 18 | **rozsirujici_data** | text | YES | | NULL | |
| 19 | **vytvoril_uzivatel_id** | int(10) | NO | MUL | NULL | |
| 20 | **dt_vytvoreni** | datetime | NO | | NULL | |
| 21 | **dt_aktualizace** | datetime | YES | | NULL | |
| 22 | **aktivni** | tinyint(1) | YES | MUL | 1 | |

---

## 🎯 WORKFLOW DEFINICE - Tabulka k vyplnění

> **Instrukce:** Označ `✅` nebo `❌` pro každou položku podle toho, zda její změna vyžaduje akci.

### Legenda:
- **Změna** = Editace existující hodnoty faktury
- **Znovu Věcnou** = Vyžaduje znovu schválení věcné správnosti
- **Znovu Obj** = Vyžaduje znovu otevření objednávky (pokud je dokončená)
- **Chráněno** = Nelze editovat po schválení věcné správnosti

---

| # | Pole faktury | Typ dat | Popis | Znovu Věcnou | Znovu Obj | Chráněno | Poznámka |
|---|-------------|---------|-------|--------------|-----------|----------|----------|
| 1 | `id` | INT | ID faktury | - | - | ✅ | System field |
| 2 | `objednavka_id` | INT | Vazba na obj | - | - | ✅ | System field |
| 3 | `fa_dorucena` | BOOL | Doručena ANO/NE | ❓ | ❓ | ❓ | Změna 1→0 nebo 0→1? |
| 4 | `fa_zaplacena` | BOOL | Zaplacena ANO/NE | ❓ | ❓ | ❓ | Změna 1→0 nebo 0→1? |
| 5 | `fa_datum_vystaveni` | DATE | Datum vystavení FA | ❓ | ❓ | ❓ | Editace data |
| 6 | `fa_datum_splatnosti` | DATE | Datum splatnosti FA | ❓ | ❓ | ❓ | Editace data |
| 7 | `fa_datum_doruceni` | DATE | Datum doručení FA | ❓ | ❓ | ❓ | Editace data |
| 8 | `fa_castka` | DECIMAL | **Částka FA** | ❓ | ❓ | ❓ | **DŮLEŽITÉ - částka** |
| 9 | `fa_cislo_vema` | VARCHAR | **Číslo FA/VPD** | ❓ | ❓ | ❓ | **DŮLEŽITÉ - ID faktury** |
| 10 | `fa_typ` | VARCHAR | Typ FA (BEZNA, ZALOHOVA...) | ❓ | ❓ | ❓ | Změna typu |
| 11 | `potvrdil_vecnou_spravnost_id` | INT | Kdo potvrdil | - | - | ✅ | System field (auto) |
| 12 | `dt_potvrzeni_vecne_spravnosti` | DATETIME | Kdy potvrdil | - | - | ✅ | System field (auto) |
| 13 | `vecna_spravnost_umisteni_majetku` | TEXT | Umístění majetku | ❓ | ❓ | ❓ | Text field |
| 14 | `vecna_spravnost_poznamka` | TEXT | Poznámka věcná | ❓ | ❓ | ❓ | Text field |
| 15 | `vecna_spravnost_potvrzeno` | BOOL | Potvrzeno ANO/NE | - | - | ✅ | System field (auto) |
| 16 | `fa_strediska_kod` | TEXT | **Středisko** | ❓ | ❓ | ❓ | **DŮLEŽITÉ - účetní** |
| 17 | `fa_poznamka` | TEXT | Poznámka k FA | ❓ | ❓ | ❓ | Text field |
| 18 | `rozsirujici_data` | TEXT | JSON rozšíření | ❓ | ❓ | ❓ | JSON field |
| 19 | `vytvoril_uzivatel_id` | INT | Kdo vytvořil | - | - | ✅ | System field |
| 20 | `dt_vytvoreni` | DATETIME | Kdy vytvořeno | - | - | ✅ | System field |
| 21 | `dt_aktualizace` | DATETIME | Kdy aktualizováno | - | - | ✅ | System field (auto) |
| 22 | `aktivni` | BOOL | Aktivní záznam | - | - | ✅ | System field (soft delete) |

---

## 📝 Scénáře k rozmyšlení

### **Scénář 1: Změna částky faktury**
```
Stav: FA schválená věcně, obj dokončená
Akce: User změní fa_castka z 10000 Kč na 15000 Kč
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 2: Změna čísla faktury (fa_cislo_vema)**
```
Stav: FA schválená věcně
Akce: User změní fa_cislo_vema z "FA2024001" na "FA2024002"
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 3: Změna střediska (fa_strediska_kod)**
```
Stav: FA schválená věcně
Akce: User změní středisko z "123" na "456"
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 4: Změna data splatnosti**
```
Stav: FA schválená věcně
Akce: User změní fa_datum_splatnosti z "2024-12-31" na "2025-01-15"
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 5: Odznačení zaplacení (fa_zaplacena 1→0)**
```
Stav: FA zaplacená (fa_zaplacena=1), obj dokončená
Akce: User odznačí "Zaplacena" (změní 1→0)
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 6: Změna poznámky (fa_poznamka)**
```
Stav: FA schválená věcně
Akce: User přidá/změní poznámku
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 7: Změna typu faktury (fa_typ)**
```
Stav: FA schválená věcně
Akce: User změní typ z "BEZNA" na "ZALOHOVA"
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

### **Scénář 8: Změna umístění majetku (vecna_spravnost_umisteni_majetku)**
```
Stav: FA schválená věcně
Akce: User změní umístění majetku
Otázka: Co se má stát?
```
- [ ] ✅ Znovu schválit věcnou správnost
- [ ] ✅ Znovu otevřít objednávku
- [ ] ❌ Nic (povolit změnu)
- [ ] 🔒 Zakázat editaci (pole chráněno)

---

## 🔧 Doporučení k implementaci

### **Varianta A: Striktní režim**
- Po schválení věcné správnosti jsou **všechna klíčová pole chráněná**
- Změna vyžaduje **odemčení** nebo **novou verzi** faktury
- **Výhoda:** Audit trail, jasná historie
- **Nevýhoda:** Méně flexibilní

### **Varianta B: Flexibilní režim**
- Některá pole lze editovat i po schválení
- Změna **kritických polí** (částka, číslo FA, středisko) → znovu schválit
- Změna **organizačních polí** (poznámka, data) → bez re-schválení
- **Výhoda:** Uživatelsky přívětivé
- **Nevýhoda:** Složitější logika

### **Varianta C: Automatická detekce**
- System automaticky detekuje změnu klíčových polí
- Automaticky nastaví `vecna_spravnost_potvrzeno = 0`
- Notifikace schvalovateli o nutnosti znovu schválit
- **Výhoda:** Transparentní proces
- **Nevýhoda:** Může být překvapivé pro uživatele

---

## 📋 Akční checklist

### Krok 1: Definice polí
- [ ] Projít tabulku výše a označit každé pole
- [ ] Určit, která pole vyžadují re-schválení věcné správnosti
- [ ] Určit, která pole vyžadují re-otevření objednávky
- [ ] Určit, která pole jsou chráněná (read-only po schválení)

### Krok 2: Business rules
- [ ] Definovat konkrétní pravidla pro každý scénář
- [ ] Určit, kdo má právo editovat jaká pole
- [ ] Určit, zda je možné "odemknout" FA pro editaci

### Krok 3: Implementace
- [ ] Implementovat validační logiku v PHP API
- [ ] Implementovat UI logiku v React (disabled fields)
- [ ] Implementovat notifikace pro schvalovatele
- [ ] Implementovat audit log změn

---

## ✅ FINÁLNÍ WORKFLOW PRAVIDLA (8. prosince 2025)

### A) ZNOVU SCHVÁLIT VĚCNOU SPRÁVNOST ⚠️
**Při změně těchto polí se VYNULUJE `vecna_spravnost_potvrzeno = 0`**

| # | Pole | Důvod |
|---|------|-------|
| 1 | `fa_castka` | Změna částky vyžaduje nové schválení |
| 2 | `fa_cislo_vema` | Změna čísla FA vyžaduje nové schválení |
| 3 | `fa_strediska_kod` | Změna střediska vyžaduje nové schválení |
| 4 | `fa_typ` | Změna typu FA vyžaduje nové schválení |
| 6 | `fa_datum_vystaveni` | Změna data má význam pro objednatele |
| 7 | `fa_datum_splatnosti` | Změna data má význam pro objednatele |
| 8 | `fa_datum_doruceni` | Změna data má význam pro objednatele |

---

### B) ZNOVU OTEVŘÍT OBJEDNÁVKU 🔄
**ŽÁDNÉ POLE** - Znovuotevření obj se řídí stavem objednávky (jak je už definované)

---

### C) VOLNĚ EDITOVATELNÁ POLE (bez vlivu na věcnou správnost) ✅

| # | Pole | Důvod |
|---|------|-------|
| 5 | `fa_zaplacena` | Podstatné pro EKO úsek, ne pro věcnou správnost |
| 9 | `fa_dorucena` | Organizační pole |
| 12 | `fa_poznamka` | Volný text, bez vlivu |
| 13 | `rozsirujici_data` | JSON rozšíření, bez vlivu |

---

### D) VĚCNÁ SPRÁVNOST POLOŽKY (10, 11) ℹ️
**NEŘEŠÍ SE U FA PŘEHLEDU**
- `vecna_spravnost_umisteni_majetku` - Řeší se na straně objednávky
- `vecna_spravnost_poznamka` - Řeší se na straně objednávky

**Poznámka:** Později vznikne varianta, že FA bude pod smlouvou (ne obj), 
pak se bude věcná správnost řešit zde v modulu FA.

---

### E) OBECNÉ PRAVIDLO 📋
✅ **Flexibilní editace s automatickou detekcí**
- Pole lze editovat i po schválení věcné správnosti
- Změna kritických polí (1-4, 6-8) automaticky vynuluje `vecna_spravnost_potvrzeno = 0`
- Pole (5, 9, 12, 13) lze editovat bez vlivu na věcnou správnost
- Žádná pole nejsou hard-locked (read-only)

---

## 🔧 IMPLEMENTAČNÍ PLÁN

### 1. **PHP API změny** (`orderV2InvoiceHandlers.php`)

```php
// Pole vyžadující re-schválení věcné správnosti
$fields_requiring_reapproval = array(
    'fa_castka',
    'fa_cislo_vema', 
    'fa_strediska_kod',
    'fa_typ',
    'fa_datum_vystaveni',
    'fa_datum_splatnosti',
    'fa_datum_doruceni'
);

// Detekce změny kritických polí
$requires_reapproval = false;
foreach ($fields_requiring_reapproval as $field) {
    if (isset($input[$field]) && isset($current_invoice[$field])) {
        if ($input[$field] != $current_invoice[$field]) {
            $requires_reapproval = true;
            break;
        }
    }
}

// Automatické vynulování věcné správnosti
if ($requires_reapproval && $current_invoice['vecna_spravnost_potvrzeno'] == 1) {
    $updateFields[] = 'vecna_spravnost_potvrzeno = ?';
    $updateValues[] = 0;
    $updateFields[] = 'potvrdil_vecnou_spravnost_id = ?';
    $updateValues[] = null;
    $updateFields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
    $updateValues[] = null;
}
```

---

### 2. **React UI změny** (`InvoiceEvidencePage.js`)

```javascript
// Pole vyžadující re-schválení
const FIELDS_REQUIRING_REAPPROVAL = [
  'fa_castka',
  'fa_cislo_vema',
  'fa_strediska_kod',
  'fa_typ',
  'fa_datum_vystaveni',
  'fa_datum_splatnosti',
  'fa_datum_doruceni'
];

// Detekce změny kritických polí
const hasChangedCriticalField = (oldData, newData) => {
  return FIELDS_REQUIRING_REAPPROVAL.some(field => 
    oldData[field] !== newData[field]
  );
};

// Varování před uložením
if (hasChangedCriticalField(originalInvoice, invoiceData) && 
    originalInvoice.vecna_spravnost_potvrzeno === 1) {
  showToast('⚠️ Změna vyžaduje nové schválení věcné správnosti!', { 
    type: 'warning' 
  });
}
```

---

### 3. **Notifikace schvalovateli**

Po změně kritických polí:
- Poslat notifikaci schvalovateli
- Zobrazit badge "Čeká na schválení" u FA
- Log změn do audit trail

---

**Připraveno k implementaci! 🚀**
