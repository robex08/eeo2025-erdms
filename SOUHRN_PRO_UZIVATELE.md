# ✅ KOMPLETNÍ ANALÝZA SYSTÉMU ČERPÁNÍ - SOUHRN

**Datum:** 13. května 2026  
**Autor:** GitHub Copilot  
**Status:** ✅ Analýza dokončena, připraveno k akci

---

## 🎯 CO BYLO PROVEDENO

Provedl jsem kompletní analýzu systému čerpání v projektu ERDMS a připravil jsem vše potřebné pro kontrolu a případnou opravu výpočtů.

---

## 📊 DVĚ FÁZE ČERPÁNÍ (jak jste požadovali)

### FÁZE 1: Čerpání z limitovaných příslibů - DVĚ SEKCE

#### **SEKCE A: Před fakturací (Plánování)**
1. **REZERVACE** - Pesimistický odhad
   - Co: Maximální ceny schválených objednávek
   - Kdy: Objednávka schválená, ale ještě bez faktur a položek
   - Účel: "Co kdyby všechno bylo co nejdražší"

2. **PŘEDPOKLAD** - Reálný odhad
   - Co: Suma položek z odeslaných objednávek
   - Kdy: Objednávka odeslána dodavateli, ale ještě bez potvrzené faktury
   - Účel: Přesnější odhad než rezervace

#### **SEKCE B: Po fakturaci (Skutečnost)**
3. **SKUTEČNÉ ČERPÁNÍ**
   - Co: Faktury + Pokladna
   - Kdy: Faktura má potvrze nóu věcnou správnost
   - Účel: Finální čerpání

### FÁZE 2: Čerpání ze smluv (TŘI TYPY)

Podobná logika jako u LP:
1. **POŽADOVÁNO** - položky objednávek BEZ faktury
2. **PLÁNOVÁNO** - zatím stejné jako požadováno
3. **SKUTEČNĚ** - faktury (přes objednávku nebo přímé)

---

## ✅ ZJIŠTĚNÍ

### Backend ✅ SPRÁVNĚ IMPLEMENTOVÁN

Všechny výpočty v backendu jsou **správně navržené**:

- ✅ LP: Správná logika třech typů čerpání
- ✅ LP: Každá objednávka se počítá jen jednou
- ✅ LP: Pokladna oddělená od faktur
- ✅ Smlouvy: Opravena stored procedure proti dvojitému počítání
- ✅ Smlouvy: Položky S fakturou se nepočítají do požadováno

### Frontend ✅ SPRÁVNĚ IMPLEMENTOVÁN

- ✅ LP Manager: Správné sčítání `skutecne_cerpano + cerpano_pokladna`
- ✅ Smlouvy Tab: Správné výpočty statistik
- ✅ Oba: Správné procento čerpání

### Možné problémy v DATECH ⚠️

Pokud existují **historická nekonzistentní data** (před opravou stored procedure):
- Objednávky počítané dvakrát
- Smlouvy s čerpáním 4000%
- Záporné zůstatky
- Nelogická procenta

---

## 📁 VYTVOŘENÉ SOUBORY

### 1. **ANALYZA_CERPANI_SYSTEM.md** 📖
Kompletní dokumentace systému čerpání:
- Jak fungují výpočty
- Struktura databáze
- Klíčové soubory
- API endpointy

### 2. **KONTROLA_CERPANI_SQL.sql** 🔍
SQL skripty pro kontrolu dat:
- Najde objednávky počítané dvakrát
- Najde smlouvy s extrémním čerpáním
- Najde nekonzistentní data
- Zobrazí statistiky

### 3. **OPRAVA_CERPANI_SQL.sql** 🔧
SQL skripty pro opravu dat:
- Vytvoří zálohu
- Opraví záporné hodnoty
- Synchronizuje sloupce
- Přepočítá všechna data

### 4. **ZJISTENI_A_DOPORUCENI.md** 📋
Přehledné shrnutí:
- Co je správně
- Co může být problém
- Jak to opravit
- Checklist

### 5. **check_cerpani.sh** 🚀
Bash skript pro jednoduché spuštění:
- Interaktivní menu
- Kontrola → Oprava → Přepočet
- Automatické zálohy
- Barevný výstup

---

## 🚀 JAK POSTUPOVAT

### Krok 1: Zkontrolovat data ✅ ZAČNĚTE TADY

```bash
cd /var/www/erdms-dev

# Spustit kontrolní skripty
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > vysledky.txt

# Nebo použít bash skript (doporučeno)
./check_cerpani.sh kontrola
```

**Co to udělá:**
- Najde problematické záznamy
- Zobrazí statistiky
- Uloží výsledky do souboru

### Krok 2: Pokud se najdou problémy ⚠️

```bash
# ⚠️ VŽDY ZÁLOHOVAT PŘED SPUŠTĚNÍM!
./check_cerpani.sh oprava

# Nebo manuálně:
mysqldump -u root -p EEO-OSTRA-DEV \
  25_limitovane_prisliby_cerpani \
  25_smlouvy \
  > backup_$(date +%Y%m%d).sql

mysql -u root -p EEO-OSTRA-DEV < OPRAVA_CERPANI_SQL.sql
```

**Co to udělá:**
- Vytvoří zálohu
- Opraví nekonzistentní data
- Nuluje záporné hodnoty
- Synchronizuje sloupce

### Krok 3: Přepočítat všechna data 🔄

```bash
# Přes bash skript (doporučeno)
./check_cerpani.sh prepocet

# Nebo manuálně přes API:
# LP
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"limitovane-prisliby/prepocet","rok":2025,"username":"admin","token":"..."}'

# Smlouvy
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"ciselniky/smlouvy/inicializace","username":"admin","token":"..."}'
```

**Co to udělá:**
- Přepočítá všechny LP pro rok 2025
- Přepočítá všechny smlouvy
- Použije opravenou logiku

### Krok 4: Zkontrolovat znovu ✅

```bash
./check_cerpani.sh kontrola

# Nebo:
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > vysledky_po_oprave.txt

# Porovnat
diff vysledky.txt vysledky_po_oprave.txt
```

---

## 🎯 RYCHLÝ START

**Nejjednodušší způsob - vše najednou:**

```bash
cd /var/www/erdms-dev

# Editovat check_cerpani.sh a doplnit:
# - DB_PASS (heslo k databázi)
# - TOKEN (API token)

nano check_cerpani.sh

# Spustit kompletní proces
./check_cerpani.sh vse
```

To provede:
1. ✅ Kontrolu dat
2. ⚠️ Opravu (po potvrzení)
3. 🔄 Přepočet
4. ✅ Finální kontrolu

---

## 📊 OČEKÁVANÉ VÝSLEDKY

### Pokud je vše v pořádku ✅

```
Kontrola LP:
- ✅ Žádné LP s překročeným limitem > 150%
- ✅ Žádné záporné hodnoty
- ✅ Procenta v rozsahu 0-999%

Kontrola smluv:
- ✅ Žádné smlouvy s čerpáním > 200%
- ✅ Žádné položky počítané dvakrát
- ✅ cerpano_celkem = pozadovano + skutecne
```

### Pokud se najdou problémy ⚠️

Skripty vám ukážou:
- Které objednávky jsou počítané dvakrát
- Které smlouvy mají nereálné čerpání
- Které LP mají záporné zůstatky
- Statistiky před a po opravě

---

## 📞 PODPORA

Všechny soubory obsahují:
- Komentáře v češtině
- Vysvětlení logiky
- Příklady použití
- Rollback instrukce

**Důležité:**
- ⚠️ Vždy zálohovat před opravou!
- ✅ Nejprve kontrola, pak oprava
- 📊 Porovnat statistiky před a po
- 🔄 Rollback je možný ze zálohy

---

## 🎓 NAUČENÉ LEKCE

### Co fungovalo dobře:
1. ✅ Oddělení tří typů čerpání
2. ✅ Samostatné sloupce pro faktury a pokladnu
3. ✅ PDO prepared statements
4. ✅ Agregační tabulka pro LP

### Co bylo opraveno:
1. ✅ Stored procedure pro smlouvy (dvojité počítání)
2. ✅ Filtr na věcnou správnost faktur
3. ✅ Správný výpočet zůstatků (sčítání, ne max)

---

## 📄 DALŠÍ DOKUMENTACE

Všechny vytvořené soubory najdete v:
```
/var/www/erdms-dev/
├── ANALYZA_CERPANI_SYSTEM.md          # Kompletní dokumentace
├── KONTROLA_CERPANI_SQL.sql           # Kontrolní dotazy
├── OPRAVA_CERPANI_SQL.sql             # Opravné skripty
├── ZJISTENI_A_DOPORUCENI.md           # Shrnutí
├── SOUHRN_PRO_UZIVATELE.md            # Tento soubor
└── check_cerpani.sh                   # Bash skript
```

---

## ✅ ZÁVĚR

**Systém čerpání je správně navržen!** 🎉

Pokud existují problémy, jsou pravděpodobně v **historických datech** z období před opravou stored procedure.

**Řešení je jednoduché:**
1. Spustit kontrolu
2. Opravit data (se zálohováním)
3. Přepočítat vše
4. Ověřit výsledky

**Připraven k akci!** 🚀

---

**Připraveno:** 13. května 2026  
**Autor:** GitHub Copilot  
**Kontakt:** Pro podporu otevřete vytvořené dokumenty
