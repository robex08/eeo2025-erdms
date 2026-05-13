# 📊 ANALÝZA A KONTROLA SYSTÉMU ČERPÁNÍ

**Datum:** 13. května 2026  
**Verze:** 1.0  
**Status:** ✅ Připraveno k použití

---

## 🎯 ÚČEL

Tento balíček obsahuje kompletní analýzu systému čerpání LP (limitovaných příslibů) a smluv v projektu ERDMS, včetně nástrojů pro kontrolu a opravu dat.

---

## 📁 OBSAH BALÍČKU

### 🚀 **ZAČNĚTE TADY** → [SOUHRN_PRO_UZIVATELE.md](SOUHRN_PRO_UZIVATELE.md)
Přehledný návod krok za krokem:
- Co bylo provedeno
- Jak postupovat
- Rychlý start
- Očekávané výsledky

### 📖 **Dokumentace**

1. **[ANALYZA_CERPANI_SYSTEM.md](ANALYZA_CERPANI_SYSTEM.md)**
   - Jak funguje systém čerpání
   - Dva fáze (LP → Smlouvy)
   - Tři typy čerpání (Rezervace, Předpoklad, Skutečné)
   - Struktura databáze
   - Klíčové soubory v projektu

2. **[ZJISTENI_A_DOPORUCENI.md](ZJISTENI_A_DOPORUCENI.md)**
   - Přehled zjištění
   - Kontrolní checklist
   - Doporučené akce
   - Známé problémy a řešení

### 🔧 **Nástroje**

3. **[KONTROLA_CERPANI_SQL.sql](KONTROLA_CERPANI_SQL.sql)**
   - SQL skripty pro kontrolu dat
   - Najde nekonzistentní záznamy
   - Zobrazí statistiky
   - Identifikuje problémy

4. **[OPRAVA_CERPANI_SQL.sql](OPRAVA_CERPANI_SQL.sql)**
   - SQL skripty pro opravu dat
   - Automatické zálohování
   - Oprava záporných hodnot
   - Synchronizace sloupců
   - Rollback instrukce

5. **[check_cerpani.sh](check_cerpani.sh)** ⭐ **DOPORUČENO**
   - Bash skript s interaktivním menu
   - Kontrola → Oprava → Přepočet
   - Automatické zálohy
   - Barevný výstup
   - Bezpečnostní potvrzení

---

## 🚀 RYCHLÝ START

### Option 1: Bash skript (nejjednodušší) ⭐

```bash
# 1. Editovat konfiguraci
nano check_cerpani.sh
# Doplnit: DB_PASS, TOKEN

# 2. Spustit
./check_cerpani.sh

# 3. Vybrat akci z menu:
#    1 = Kontrola
#    2 = Oprava (se zálohováním)
#    3 = Přepočet přes API
#    4 = Vše najednou
```

### Option 2: Manuálně krok za krokem

```bash
# Krok 1: Kontrola
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > vysledky.txt
less vysledky.txt

# Krok 2: Oprava (pokud se našly problémy)
# ⚠️ NEJPRVE ZÁLOHA!
mysqldump -u root -p EEO-OSTRA-DEV \
  25_limitovane_prisliby_cerpani 25_smlouvy > backup.sql
mysql -u root -p EEO-OSTRA-DEV < OPRAVA_CERPANI_SQL.sql

# Krok 3: Přepočet přes API
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"limitovane-prisliby/prepocet","rok":2025,"username":"admin","token":"..."}'

curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"ciselniky/smlouvy/inicializace","username":"admin","token":"..."}'

# Krok 4: Kontrola znovu
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > vysledky_po.txt
diff vysledky.txt vysledky_po.txt
```

---

## 📊 DVĚ FÁZE ČERPÁNÍ (SHRNUTÍ)

### FÁZE 1: Limitované příslíby (LP)

**SEKCE A - Před fakturací:**
- 🔵 **Rezervace** = max_cena_s_dph (pesimistický odhad)
- 🟢 **Předpoklad** = suma položek (reálný odhad)

**SEKCE B - Po fakturaci:**
- 🟡 **Skutečné** = faktury + pokladna (finální čerpání)

### FÁZE 2: Smlouvy

- 🔵 **Požadováno** = položky BEZ faktury
- 🟢 **Plánováno** = zatím = požadováno
- 🟡 **Skutečně** = faktury (přes obj. nebo přímé)

---

## ✅ CO BYLO OVĚŘENO

### Backend ✅
- LP handlers: Správná logika třech typů
- Smlouvy stored procedure: Opraveno dvojité počítání
- Filtry na věcnou správnost faktur
- Multi-LP objednávky

### Frontend ✅
- LP Manager: Správné sčítání skutečného čerpání
- Smlouvy Tab: Správné výpočty statistik
- Procenta čerpání

### Databáze ⏳
- Možné historické nekonzistence
- Použijte kontrolní skripty!

---

## ⚠️ DŮLEŽITÁ UPOZORNĚNÍ

1. **VŽDY ZÁLOHOVAT** před spuštěním opravných skriptů
2. **NEJPRVE KONTROLA**, pak oprava
3. **TESTOVAT** na dev prostředí před produkci
4. **POROVNAT** statistiky před a po
5. **ROLLBACK** je možný ze zálohy

---

## 📊 OČEKÁVANÉ VÝSLEDKY

### Před opravou (možné problémy)
- ⚠️ Smlouvy s čerpáním 4000%
- ⚠️ LP s překročením > 200%
- ⚠️ Záporné zůstatky
- ⚠️ Položky počítané dvakrát

### Po opravě
- ✅ Čerpání smluv < 150%
- ✅ LP reálné procento
- ✅ Žádné záporné hodnoty
- ✅ Každá objednávka jen jednou

---

## 🔗 STRUKTURA PROJEKTU

### Backend
```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
├── limitovanePrislibyCerpaniHandlers_v2_pdo.php  # LP výpočty
└── smlouvyHandlers.php                           # Smlouvy výpočty
```

### Frontend
```
apps/eeo-v2/client/src/
├── pages/CerpaniPage.js                          # Hlavní stránka
├── components/
│   ├── LimitovanePrislibyManager.js              # LP komponenta
│   └── dictionaries/tabs/SmlouvyTab.js           # Smlouvy komponenta
```

### Databáze
```
Stored procedures:
- sp_prepocet_cerpani_smluv        # Přepočet smluv
- sp_prepocet_lp_cerpani_faktury   # Přepočet LP (pokud existuje)
```

---

## 📞 PODPORA

### Máte problém?

1. Otevřete [SOUHRN_PRO_UZIVATELE.md](SOUHRN_PRO_UZIVATELE.md)
2. Projděte [ZJISTENI_A_DOPORUCENI.md](ZJISTENI_A_DOPORUCENI.md)
3. Přečtěte plnou dokumentaci v [ANALYZA_CERPANI_SYSTEM.md](ANALYZA_CERPANI_SYSTEM.md)

### Chcete vrátit změny?

```sql
-- Rollback ze zálohy
mysql -u root -p EEO-OSTRA-DEV < backup_YYYYMMDD.sql
```

---

## 📈 STATISTIKY

| Soubor | Účel | Řádků |
|--------|------|-------|
| ANALYZA_CERPANI_SYSTEM.md | Kompletní dokumentace | ~500 |
| KONTROLA_CERPANI_SQL.sql | Kontrolní SQL skripty | ~450 |
| OPRAVA_CERPANI_SQL.sql | Opravné SQL skripty | ~250 |
| ZJISTENI_A_DOPORUCENI.md | Shrnutí zjištění | ~400 |
| SOUHRN_PRO_UZIVATELE.md | Návod pro uživatele | ~300 |
| check_cerpani.sh | Bash automatizace | ~300 |
| README_CERPANI.md | Tento soubor | ~250 |

**Celkem:** ~2 500 řádků dokumentace a kódu

---

## 🎓 DOPORUČENÝ POSTUP PRO NOVÉ UŽIVATELE

1. **Čtení (15 min)**
   - Přečíst tento README
   - Přečíst SOUHRN_PRO_UZIVATELE.md

2. **Příprava (5 min)**
   - Editovat check_cerpani.sh
   - Doplnit DB_PASS a TOKEN

3. **Kontrola (5 min)**
   - Spustit: `./check_cerpani.sh kontrola`
   - Prohlédnout výsledky

4. **Rozhodnutí**
   - Problémy nalezeny? → Pokračovat krokem 5
   - Vše OK? → Hotovo! ✅

5. **Oprava (10 min)**
   - Spustit: `./check_cerpani.sh oprava`
   - Potvrdit změny
   - Zkontrolovat výsledky

6. **Ověření (5 min)**
   - Spustit kontrolu znovu
   - Porovnat před/po

**Celkový čas: 30-40 minut**

---

## ✅ ZÁVĚR

✨ **Systém čerpání je správně implementován!**

Pokud existují problémy, jsou v **datech**, ne v **kódu**.

🔧 **Řešení je připraveno** - stačí spustit skripty!

---

**Vytvořeno:** 13. května 2026  
**Autor:** GitHub Copilot  
**Verze:** 1.0

**Pro začátek otevřete:** [SOUHRN_PRO_UZIVATELE.md](SOUHRN_PRO_UZIVATELE.md) 🚀
