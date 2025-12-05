# RoleTab - Vysvětlení počtů uživatelů

## ✅ AKTUALIZACE: Backend API byl rozšířen! (24. října 2025)

**Backend nyní poskytuje novou statistiku `pocet_uzivatelu_celkem`**, která zobrazuje celkový počet všech uživatelů s danou rolí!

---

## Sloupce v tabulce RoleTab

| Sloupec | Význam | Zdroj dat | Příklad |
|---------|--------|-----------|---------|
| **Název role** | Název a popis role | `nazev_role`, `popis` | "Vedoucí oddělení" |
| **Status** | Aktivní/Neaktivní | `aktivni` (0/1) | "Aktivní" ✅ |
| **Globální práva** | Počet práv platných pro všechny | `statistiky.pocet_prav_globalnich` | 3 |
| **Celkem uživatelů** | 🆕 Celkový počet uživatelů s rolí | `statistiky.pocet_uzivatelu_celkem` | 47 |
| **S extra právy** | Počet uživatelů s personalizovanými právy | `statistiky.pocet_uzivatelu_s_personalizaci` | 2 |
| **Celkem extra práv** | Součet všech extra práv | `statistiky.celkem_personalizovanych_prav` | 5 |
| **⚡ Akce** | Expand/Edit/Delete tlačítka | - | - |

---

## 🎯 Příklad: Role "Vedoucí oddělení"

### Statistiky v tabulce:
```
Globální práva:    3
Celkem uživatelů:  47  ← VŠICHNI uživatelé s touto rolí
S extra právy:     2   ← Jen tito 2 mají personalizovaná práva navíc
Celkem extra práv: 5   ← Těch 2 uživatelů má dohromady 5 extra práv
```

### Co to znamená?
- **47 uživatelů** má přiřazenou roli "Vedoucí oddělení"
- **Všech 47** má automaticky **3 globální práva** role
- **2 uživatelé** (Jan Novák a Marie Svobodová) mají navíc **5 personalizovaných práv**
- **Zbylých 45 uživatelů** má pouze ty 3 globální práva, nic víc

---

## 📊 Datová struktura z API (v1.1)

```javascript
{
  id: 2,
  nazev_role: "Vedoucí oddělení",
  aktivni: 1,
  prava_globalni: [
    { kod_prava: "orders.create", ... },
    { kod_prava: "orders.approve", ... },
    { kod_prava: "orders.view.department", ... }
  ],
  prava_personalizovana: [
    {
      user_id: 123,
      username: "novak.jan",
      jmeno: "Jan",
      prijmeni: "Novák",
      prava: [
        { kod_prava: "budget.view.extended", ... },
        { kod_prava: "orders.approve.special", ... },
        { kod_prava: "reports.advanced", ... }
      ]
    },
    {
      user_id: 456,
      username: "svobodova.marie",
      jmeno: "Marie",
      prijmeni: "Svobodová",
      prava: [
        { kod_prava: "reports.confidential", ... },
        { kod_prava: "audit.view", ... }
      ]
    }
  ],
  statistiky: {
    pocet_prav_globalnich: 3,              // 3 globální práva
    pocet_uzivatelu_celkem: 47,            // 🆕 Celkem 47 uživatelů má tuto roli
    pocet_uzivatelu_s_personalizaci: 2,   // Z těch 47 mají 2 extra práva
    celkem_personalizovanych_prav: 5       // Těch 2 uživatelů má dohromady 5 extra práv (3+2)
  }
}
```

---

## 🔍 Rozdíl mezi "Celkem uživatelů" a "S extra právy"

### **Celkem uživatelů** (`pocet_uzivatelu_celkem`)
- Zobrazuje **VŠECHNY** uživatele, kteří mají v `25_uzivatele.role_id` tuto roli
- Zahrnuje i uživatele, kteří mají pouze globální práva
- Odpověď na otázku: *"Kolik lidí má tuto roli?"*

### **S extra právy** (`pocet_uzivatelu_s_personalizaci`)
- Zobrazuje pouze uživatele, kteří mají v `25_role_prava` záznamy s `user_id != -1`
- Jde o **výjimky** - uživatele s personalizovanými právy nad rámec globálních
- Odpověď na otázku: *"Kolik lidí má speciální práva?"*

### **Celkem extra práv** (`celkem_personalizovanych_prav`)
- Součet všech personalizovaných práv všech uživatelů
- Odpověď na otázku: *"Kolik extra práv bylo celkem přiděleno?"*

---

## 💡 Proč je to užitečné?

### Před aktualizací (v1.0):
```
❌ "Tato role má 2 uživatele s extra právy"
   → Ale nevíš, kolik je jich CELKEM!
```

### Po aktualizaci (v1.1):
```
✅ "Tato role má 47 uživatelů, z toho 2 mají extra práva"
   → Jasný přehled o celkovém využití role!
```

---

## 🎨 Vizuální indikace pomocí barev gradientů

V RoleTab jsou sloupce vizuálně odlišené pomocí barevných gradientů:

| Sloupec | Gradient | Význam |
|---------|----------|--------|
| **Globální práva** | 🔵 Modrá (`#3b82f6 → #2563eb`) | Základní práva pro všechny |
| **Celkem uživatelů** | 🔷 Cyan (`#06b6d4 → #0891b2`) | Celkový počet uživatelů |
| **S extra právy** | 🟣 Fialová (`#8b5cf6 → #7c3aed`) | Uživatelé s výjimkami |
| **Celkem extra práv** | 🟢 Zelená (`#10b981 → #059669`) | Součet personalizovaných práv |

---

## 🎯 Jak vidět detaily?

Kliknutím na **⚡ Akce → šipka expand (⬇️)** se zobrazí:

1. **Globální práva** - seznam práv, která mají VŠICHNI uživatelé s rolí
2. **Extra práva pro uživatele** - konkrétní uživatelé (Jan Novák, Marie Svobodová) s jejich personalizovanými právy

---

## 📋 SQL Logika

```sql
-- Celkem uživatelů s rolí
SELECT COUNT(*) 
FROM 25_uzivatele 
WHERE role_id = 2 AND aktivni = 1;
-- Výsledek: 47

-- Uživatelé s personalizovanými právy
SELECT COUNT(DISTINCT user_id) 
FROM 25_role_prava 
WHERE role_id = 2 AND user_id != -1 AND aktivni = 1;
-- Výsledek: 2

-- Celkem personalizovaných práv
SELECT COUNT(*) 
FROM 25_role_prava 
WHERE role_id = 2 AND user_id != -1 AND aktivni = 1;
-- Výsledek: 5
```

---

## ✅ Závěr

**Backend API verze 1.1** nyní poskytuje kompletní přehled:
- ✅ Kolik uživatelů má roli celkem (`pocet_uzivatelu_celkem`)
- ✅ Kolik z nich má extra práva (`pocet_uzivatelu_s_personalizaci`)
- ✅ Kolik extra práv bylo celkem přiděleno (`celkem_personalizovanych_prav`)

To umožňuje ve frontendu zobrazit úplný přehled o využití rolí v systému! 🎉

---

**Poslední aktualizace:** 24. října 2025  
**API verze:** 1.1  
**Frontend verze:** RoleTab v3.1
