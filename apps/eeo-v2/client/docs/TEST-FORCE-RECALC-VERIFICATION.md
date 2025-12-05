# ✅ Test: Verifikace force_recalc implementace

## 🎯 Cíl
Ověřit, že **backend správně přepočítává převod z předchozího měsíce** při změnách a že frontend tyto hodnoty správně zobrazuje.

---

## 📋 Testovací scénáře

### ✅ Test 1: Základní převod mezi měsíci

**Kroky:**
1. **Říjen 2025:**
   - Vytvoř knihu pro Říjen 2025
   - Přidej příjem: 10000 Kč
   - Ulož změny (tlačítko "Uložit změny")
   - ✅ Zkontroluj: **Koncový stav = 10000 Kč**

2. **Listopad 2025:**
   - Přepni na Listopad 2025 (vytvoří se nová kniha)
   - ✅ Zkontroluj: **Převod z předchozího = 10000 Kč**
   - ✅ Zkontroluj: **Počáteční stav = 10000 Kč**

**Očekávaný výsledek:**
- ✅ Převod v Listopadu = koncový stav z Října (10000)

---

### ✅ Test 2: Úprava předchozího měsíce + auto-refresh

**Kroky:**
1. **Říjen 2025:**
   - Vrať se zpět na Říjen
   - Přidej výdaj: 3500 Kč
   - Ulož změny
   - ✅ Zkontroluj: **Koncový stav = 6500 Kč** (10000 - 3500)

2. **Listopad 2025 (návrat):**
   - Přepni na Listopad
   - ✅ Zkontroluj: **Převod z předchozího = 6500 Kč** (AKTUALIZOVÁNO!)
   - ✅ Zkontroluj: **Počáteční stav = 6500 Kč**

**Očekávaný výsledek:**
- ✅ Převod v Listopadu se automaticky aktualizoval na 6500
- ✅ Frontend zavolal `getBook(bookId, force_recalc=1)`
- ✅ Backend přepočítal a vrátil novou hodnotu

---

### ✅ Test 3: F5 Refresh

**Kroky:**
1. **Listopad 2025:**
   - Buď na stránce Listopad
   - Zmáčkni **F5** (refresh stránky)
   - ✅ Zkontroluj: **Převod z předchozího stále = 6500 Kč**

**Očekávaný výsledek:**
- ✅ Po F5 se správně načte aktuální převod z DB

---

### ✅ Test 4: Auto-refresh při návratu do okna

**Kroky:**
1. **Říjen 2025:**
   - Přepni na Říjen
   - Přidej další výdaj: 500 Kč
   - Ulož změny
   - ✅ Zkontroluj: **Koncový stav = 6000 Kč** (6500 - 500)

2. **Přepni do jiného okna:**
   - Přepni se do jiné aplikace (Alt+Tab / Cmd+Tab)
   - Počkej 2-3 sekundy

3. **Vrať se zpět:**
   - Přepni zpět na Listopad v prohlížeči
   - Měla by se objevit notifikace: "Data aktualizována z DB"
   - ✅ Zkontroluj: **Převod z předchozího = 6000 Kč** (REFRESHNUTO!)

**Očekávaný výsledek:**
- ✅ Při návratu do okna se automaticky volá `getBook(force_recalc=1)`
- ✅ Toast notifikace "Data aktualizována z DB"
- ✅ Převod se aktualizoval

---

### ✅ Test 5: První měsíc (bez předchozího)

**Kroky:**
1. **Leden 2025:**
   - Vytvoř novou pokladnu
   - Přejdi na Leden 2025 (první měsíc)
   - ✅ Zkontroluj: **Převod z předchozího = 0 Kč**
   - ✅ Zkontroluj: **Počáteční stav = 0 Kč**

**Očekávaný výsledek:**
- ✅ První měsíc má převod = 0 (žádný předchozí měsíc)

---

### ✅ Test 6: Přechod roku (Prosinec → Leden)

**Kroky:**
1. **Prosinec 2024:**
   - Vytvoř knihu pro Prosinec 2024
   - Přidej příjem: 15000 Kč
   - Ulož změny
   - ✅ Zkontroluj: **Koncový stav = 15000 Kč**

2. **Leden 2025:**
   - Přepni na Leden 2025 (rok se změnil!)
   - ✅ Zkontroluj: **Převod z předchozího = 15000 Kč**
   - ✅ Zkontroluj: **Počáteční stav = 15000 Kč**

**Očekávaný výsledek:**
- ✅ Přechod roku funguje správně (Prosinec 2024 → Leden 2025)

---

### ✅ Test 7: Více uživatelů (izolace dat)

**Kroky:**
1. **Uživatel 1 (Admin):**
   - Říjen: Příjem 10000 → Koncový stav = 10000
   - Listopad: Převod = 10000 ✅

2. **Uživatel 2 (Běžný uživatel):**
   - Říjen: Příjem 5000 → Koncový stav = 5000
   - Listopad: Převod = 5000 ✅

3. **Zpět na Uživatel 1:**
   - Přepni zpět na Admin
   - ✅ Zkontroluj: **Převod stále = 10000** (ne 5000!)

**Očekávaný výsledek:**
- ✅ Každý uživatel má svůj vlastní převod
- ✅ Data se NEMÍCHAJÍ mezi uživateli

---

## 🔍 Jak sledovat co se děje

### 1️⃣ Network Tab (Developer Tools)

**Otevři:**
1. Zmáčkni `F12`
2. Záložka **Network**
3. Filtr: `cashbook-get`

**Co sledovat:**
```javascript
// Request:
POST /api.eeo/cashbook-get
{
  "book_id": 11,
  "force_recalc": 1  // ✅ MĚLO BY BÝT TADY
}

// Response:
{
  "status": "ok",
  "data": {
    "book": {
      "prevod_z_predchoziho": "6500.00",  // ✅ AKTUALIZOVANÁ HODNOTA
      "pocatecni_stav": "6500.00"
    }
  }
}
```

### 2️⃣ Console Log

**Hledej tyto výpisy:**
```
📘 Načítání detailu knihy včetně položek (s force_recalc pro aktuální převod)
📘 Převod z předchozího měsíce: 6500
```

### 3️⃣ UI Kontrola

**Zkontroluj tyto hodnoty na stránce:**
- 📊 **Převod z předchozího:** (zelené pole nahoře)
- 📊 **Počáteční stav:** (stejná hodnota jako převod)
- 📊 **Koncový stav:** (počáteční + příjmy - výdaje)

---

## ✅ Checklist

- [ ] Test 1: Základní převod mezi měsíci ✅
- [ ] Test 2: Úprava předchozího měsíce + auto-refresh ✅
- [ ] Test 3: F5 Refresh ✅
- [ ] Test 4: Auto-refresh při návratu do okna ✅
- [ ] Test 5: První měsíc (bez předchozího) ✅
- [ ] Test 6: Přechod roku (Prosinec → Leden) ✅
- [ ] Test 7: Více uživatelů (izolace dat) ✅

---

## 🐛 Co dělat při problémech

### ❌ Převod se neaktualizuje

**Zkontroluj:**
1. Network tab: Je tam `force_recalc: 1`?
2. Response: Vrací backend novou hodnotu?
3. Console: Jsou tam chyby?

**Řešení:**
- Hard refresh: `Ctrl+Shift+R` (vymaže cache)
- Zkontroluj backend log: `/cashbook-get` endpoint

### ❌ Zobrazuje se stará hodnota

**Zkontroluj:**
1. localStorage: `Ctrl+Shift+I` → Application → Local Storage
2. Smaž klíč: `cashbook_*` 
3. Refresh stránky

### ❌ Data se mícháj mezi uživateli

**Zkontroluj:**
1. SQL dotaz v backendu obsahuje `uzivatel_id = ?`
2. localStorage obsahuje `user_id` v klíči

---

## 📅 Status testování

**Datum:** 9. listopadu 2025  
**Tester:** _________  
**Verze:** v2.0 (force_recalc implementováno)  
**Výsledek:** 
- ✅ PASS
- ❌ FAIL (specifikuj problém)

**Poznámky:**
```
[Zde zapiš jakékoliv problémy nebo pozorování]
```
