# 🔧 BE REQUEST: Lokality - Počítat VŠECHNY uživatele (ne jen aktivní)

**Datum:** 8. listopadu 2025  
**Priorita:** LOW  
**Typ:** Enhancement

---

## 📋 Požadavek

V číselníku **Lokality** chceme zobrazovat **celkový počet uživatelů** (aktivní + neaktivní), ne jen aktivní uživatele.

### ❌ Současný stav (BE)

```php
SELECT 
  l.*,
  COUNT(DISTINCT CASE WHEN u.aktivni = 1 THEN u.id END) as pocet_uzivatelu
FROM 25_lokality l
LEFT JOIN 25_uzivatele u ON u.lokalita_id = l.id
GROUP BY l.id
```

**Problém:** Počítá jen `u.aktivni = 1` → neaktivní uživatelé se nezapočítávají.

### ✅ Požadovaný stav

```php
SELECT 
  l.*,
  COUNT(DISTINCT u.id) as pocet_uzivatelu
FROM 25_lokality l
LEFT JOIN 25_uzivatele u ON u.lokalita_id = l.id
GROUP BY l.id
```

**Výsledek:** Počítá VŠECHNY uživatele bez ohledu na `aktivni` stav.

---

## 🎯 Důvod

**Use case:** Admin chce vidět **celkový počet přiřazených uživatelů** k lokalitě, ne jen kolik z nich je aktuálně aktivních.

**Příklad:**
- Lokalita "Praha 1" má 10 uživatelů (8 aktivních, 2 neaktivní)
- **Současný výsledek:** 8 uživatelů ❌
- **Požadovaný výsledek:** 10 uživatelů ✅

Pokud admin potřebuje vědět **kolik je aktivních**, může to vidět ve sloupci detail uživatelů nebo v separátním sloupci (např. `pocet_aktivnich_uzivatelu`).

---

## 📊 Frontend

**Frontend je připravený** - pouze čte hodnotu `pocet_uzivatelu` z BE response:

```javascript
// LokalityTab.js řádky 684-700
{
  accessorKey: 'pocet_uzivatelu',
  header: 'Počet uživatelů',
  cell: ({ row }) => (
    <UserCountBadge>
      <Users size={12} />
      {row.original.pocet_uzivatelu}  // ← Zobrazí cokoliv co vrátí BE
    </UserCountBadge>
  )
}
```

**Endpoint:** `POST /api.eeo/ciselniky/lokality/list`

---

## 🔧 Implementace (BE)

### Varianta 1: Počítat všechny uživatele (preferováno)

```php
COUNT(DISTINCT u.id) as pocet_uzivatelu
```

### Varianta 2: Vrátit obě hodnoty (pokud je potřeba rozlišení)

```php
COUNT(DISTINCT u.id) as pocet_uzivatelu,
COUNT(DISTINCT CASE WHEN u.aktivni = 1 THEN u.id END) as pocet_aktivnich_uzivatelu
```

Frontend pak může zobrazit:
- **"10 uživatelů"** (celkem)
- **"8 aktivních"** (tooltip nebo separátní badge)

---

## ✅ Testování

Po úpravě BE ověřit v číselníku Lokality:
1. Vytvořit lokalitu s 3 uživateli (2 aktivní, 1 neaktivní)
2. Zkontrolovat sloupec "Počet uživatelů"
3. **Očekávaný výsledek:** 3 (ne 2)

---

## 📝 Poznámky

- Tento požadavek **neblokuje funkčnost** - je to enhancement
- Frontend není potřeba měnit, stačí upravit BE SQL query
- Konzistentní s jinými číselníky kde se počítají všechny entity bez filtru na `aktivni`

---

**Status:** ⏳ Čeká na implementaci BE  
**Related:** BE-FIX-LOKALITY-JOIN.md (již implementováno - LEFT JOIN pro performance)
