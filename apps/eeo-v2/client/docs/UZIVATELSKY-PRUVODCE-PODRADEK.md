# 📱 Uživatelský Průvodce - Nový Podřádek Objednávek

**Verze:** 2.0  
**Datum:** 2. listopadu 2025  
**Pro:** Koncoví uživatelé systému

---

## 🎯 Co je nového?

Kompletně přepracovaný **detailní pohled na objednávku** (rozbalený řádek) s:
- ✅ Přehlednějším uspořádáním informací
- ✅ Všemi cenovými údaji včetně DPH
- ✅ Detailními informacemi o položkách a fakturách
- ✅ Snadným přístupem k přílohám

---

## 📋 Jak Rozbalit Podřádek

Klikněte na **tlačítko "+" nebo "-"** na levé straně řádku objednávky:

```
┌────┬──────────────┬──────────────┬─────────┐
│ +  │ O-11250      │ Notebook...  │ ...     │
└────┴──────────────┴──────────────┴─────────┘
      ↑
      Klikněte zde pro rozbalení
```

Po rozbalení se zobrazí **10 přehledných sekcí** s detailními informacemi.

---

## 🗂️ Přehled Sekcí

### 1️⃣ Základní údaje objednávky
**Co zde najdete:**
- 📋 Číslo objednávky (O-11250)
- 🆔 ID objednávky (#11250)
- 📝 Předmět objednávky
- 🟢 Aktuální stav (SCHVÁLENA, NOVÁ, atd.)
- 📅 Všechny důležité datumy
  - Datum objednávky
  - Datum vytvoření
  - Poslední změna
  - Datum schválení (pokud je schválena)
  - Termín dodání (pokud je uveden)

**Tip:** Stav je barevně odlišen pro snadnou identifikaci.

---

### 2️⃣ Odpovědné osoby
**Co zde najdete:**
- 👤 **Objednatel** - kdo objednávku vytvořil
- 👔 **Garant** - kdo zajišťuje realizaci
- ⚖️ **Příkazce** - kdo je pověřen plněním
- ✅ **Schvalovatel** - kdo objednávku schvaluje

**NOVĚ:** U každé osoby je uveden **e-mail** (pokud je k dispozici)

---

### 3️⃣ Dodavatel
**Co zde najdete:**
- 🏢 Název firmy (tučně)
- 🔢 IČO
- 📍 Adresa
- 👤 Kontaktní osoba
- 📧 E-mail
- 📞 Telefon

**Tip:** Všechny kontaktní údaje jsou na jednom místě.

---

### 4️⃣ Finanční údaje ⭐ NOVĚ
**Co zde najdete:**

#### Hlavní ceny (velké, barevně odlišené)
- 💰 **Max. cena s DPH** (zelená, největší) - maximální povolená cena
- 💳 **Celková cena s DPH** (modrá, velká) - skutečná celková cena
- 🟠 **Celková DPH** (oranžová) - celková částka DPH

#### Detailní rozpis
- 📊 Celková cena bez DPH
- 💱 Měna (pokud není CZK)
- 📦 Počet položek (např. "5 ks")
- 📦 Cena položek s DPH (modrá)
- 🧾 Počet faktur (např. "2 ks")
- 🧾 Cena faktur s DPH (fialová)
- 📋 Druh objednávky

**Tip:** Hlavní hodnoty jsou **tučně a barevně** - nenajdete je rychleji!

**Příklad:**
```
💰 Max. cena s DPH: 100 000 Kč   (zelená, velká)
💳 Celková cena s DPH: 78 650 Kč  (modrá, velká)
🟠 Celková DPH: 13 350 Kč         (oranžová)

📊 Celková cena bez DPH: 65 300 Kč

📦 Počet položek: 5 ks
📦 Cena položek s DPH: 78 650 Kč  (modrá)

🧾 Počet faktur: 2 ks
🧾 Cena faktur s DPH: 50 000 Kč   (fialová)
```

---

### 5️⃣ Střediska a financování
**Co zde najdete:**
- 🏢 Seznam středisek (např. "KLADNO, BEROUN")
- 💰 Způsob financování (LP, Smlouva, atd.)
- 📋 LP kódy (pokud je financování z LP)
- 📍 Místo dodání
- ⚡ Záruka

---

### 6️⃣ Položky objednávky ⭐ NOVĚ
**Co zde najdete u každé položky:**

#### Hlavička
- 📝 **Název položky** (tučně)
- 💰 **Cena s DPH** (zelená, vpravo) - finální cena položky

#### Detaily (na dalším řádku, menším písmem)
- 🔢 Počet: 2 ks
- 💵 Jedn. bez DPH: 25 000 Kč - cena za 1 kus bez DPH
- 💶 Jedn. s DPH: 30 250 Kč - cena za 1 kus s DPH
- 📊 Bez DPH: 50 000 Kč (šedá) - celková cena bez DPH
- 🟠 DPH: 21% (oranžová) - sazba DPH
- 🟠 DPH částka: 10 500 Kč (oranžová) - částka DPH

#### Poznámka (pokud je)
- 💬 Poznámka k položce (např. "Pro budovu A, místnost 301")

**Tip:** Zobrazuje se prvních **10 položek**, pokud je jich více, je to indikováno textem "... a dalších X položek"

**Příklad:**
```
┌────────────────────────────────────────────────┐
│ 📝 Notebook Dell Latitude      💰 60 500 Kč    │
│                                                 │
│ 🔢 Počet: 2 ks                                 │
│ 💵 Jedn. bez DPH: 25 000 Kč                    │
│ 💶 Jedn. s DPH: 30 250 Kč                      │
│ 📊 Bez DPH: 50 000 Kč   🟠 DPH: 21%           │
│ 🟠 DPH částka: 10 500 Kč                       │
└────────────────────────────────────────────────┘
```

---

### 7️⃣ Faktury ⭐ NOVĚ
**Co zde najdete u každé faktury:**

#### Hlavička
- 🧾 **Číslo faktury** (tučně)
- 🟢 **ZAPLACENA** nebo 🟡 **NEZAPLACENA** (badge)

#### Detaily
- 📅 Vystavena: 30.10.2025
- ⏰ Splatnost: 13.11.2025
- 📊 Bez DPH: 10 000 Kč (šedá)
- 🟠 DPH: 2 100 Kč (oranžová)
- 💰 **S DPH: 12 100 Kč** (zelená, tučně) - hlavní hodnota

#### Střediska faktury (pokud jsou)
- 🏢 Střediska: KLADNO, BEROUN

#### Přílohy faktury
- 📎 Každá příloha s možností **stažení** (modrá ikona ⬇️)
- Zobrazena velikost souboru v KB

**Příklad:**
```
┌────────────────────────────────────────────────┐
│ 🧾 F-2025-1234               🟡 NEZAPLACENA    │
│                                                 │
│ 📅 Vystavena: 30.10.2025                       │
│ ⏰ Splatnost: 13.11.2025                       │
│ 📊 Bez DPH: 10 000 Kč                          │
│ 🟠 DPH: 2 100 Kč                               │
│ 💰 S DPH: 12 100 Kč ✓                          │
│                                                 │
│ 🏢 Střediska: KLADNO, BEROUN                   │
│                                                 │
│ ─────── Přílohy ───────                        │
│ 📎 faktura.pdf (245 KB)               ⬇️       │
└────────────────────────────────────────────────┘
```

---

### 8️⃣ Přílohy objednávky
**Co zde najdete:**
- 📎 Název souboru (tučně)
- 📅 Datum nahrání
- 📝 Popis přílohy (pokud je)
- 💾 Velikost v KB
- ⬇️ **Ikona stažení** (modrá, klikněte pro stažení)

**Tip:** Zobrazuje se prvních **10 příloh**, pokud je jich více, je to indikováno textem "... a dalších X příloh"

---

### 9️⃣ Dodatečné dokumenty
**Co zde najdete:**
- 📄 Název dokumentu (tučně)
- 📅 Datum nahrání
- 📝 Popis dokumentu (pokud je)
- 💾 Velikost v KB
- ⬇️ **Ikona stažení** (modrá, klikněte pro stažení)

---

### 🔟 Poznámky
**Co zde najdete:**
- 📝 **Popis** - obecný popis objednávky
- 💬 **Poznámka** - další poznámky k objednávce
- 📋 **Odůvodnění** - odůvodnění objednávky

**Tip:** Každá poznámka je v samostatném, přehledném boxu.

---

## 🎨 Barevné Kódování

Pro snadnou orientaci používáme **barevné kódování**:

- 🟢 **Zelená** - Finální ceny s DPH, zaplacené faktury
- 🔵 **Modrá** - Položky, odkazy ke stažení
- 🟣 **Fialová** - Faktury
- 🟠 **Oranžová** - DPH částky a sazby
- ⚫ **Šedá** - Ceny bez DPH, doplňkové informace
- 🔴 **Červená** - Nezaplacené faktury, upozornění

---

## 💡 Tipy a Triky

### Rychlé stažení přílohy
Klikněte na **modrou ikonu ⬇️** vedle názvu souboru.

### Zjištění celkové ceny
Podívejte se na **největší zelenou hodnotu** v sekci "Finanční údaje" - to je hlavní cena objednávky.

### Kontrola DPH
Všechny **oranžové hodnoty** jsou DPH - procenta i částky.

### Zjištění stavu faktury
Badge **🟢 ZAPLACENA** nebo **🟡 NEZAPLACENA** je hned vedle čísla faktury.

### Kontakt na dodavatele
Všechny kontaktní údaje (e-mail, telefon) najdete v sekci "Dodavatel".

---

## 📱 Responzivní Design

Podřádek se automaticky přizpůsobuje **šířce obrazovky**:
- **Široké obrazovky** (desktop) - 2-3 sloupce
- **Střední obrazovky** (tablet) - 2 sloupce
- **Úzké obrazovky** (mobil) - 1 sloupec

---

## ❓ Často Kladené Otázky

### Q: Kde najdu celkovou cenu objednávky?
**A:** V sekci **"Finanční údaje"**, největší zelená hodnota "Celková cena s DPH".

### Q: Jak stáhnu přílohu?
**A:** Klikněte na **modrou ikonu ⬇️** vedle názvu souboru.

### Q: Kde vidím, kolik je DPH?
**A:** V sekci **"Finanční údaje"** je oranžová hodnota "Celková DPH". U každé položky a faktury je také uvedena DPH částka.

### Q: Jak zjistím, zda je faktura zaplacena?
**A:** U každé faktury je **badge** s textem "ZAPLACENA" (zelený) nebo "NEZAPLACENA" (žlutý).

### Q: Proč nevidím všechny položky?
**A:** Zobrazuje se prvních **10 položek/příloh** pro přehlednost. Pokud je jich více, je to indikováno textem "... a dalších X položek".

### Q: Kde najdu e-mail na objednatele?
**A:** V sekci **"Odpovědné osoby"**, pod jménem objednatele je uvedený e-mail (pokud je k dispozici).

---

## 🎉 Výhody Nového Podřádku

1. ✅ **Všechny informace na jednom místě** - žádné hledání v jiných modulech
2. ✅ **Jasná vizuální hierarchie** - hlavní hodnoty jsou větší a barevné
3. ✅ **Kompletní finanční přehled** - ceny bez/s DPH, DPH částky
4. ✅ **Snadný přístup k přílohám** - jedno kliknutí na stažení
5. ✅ **Profesionální vzhled** - čisté, moderní UI
6. ✅ **Rychlá orientace** - barevné kódování a ikonky

---

**Potřebujete pomoc?** Kontaktujte podporu nebo se podívejte do kompletní dokumentace.
