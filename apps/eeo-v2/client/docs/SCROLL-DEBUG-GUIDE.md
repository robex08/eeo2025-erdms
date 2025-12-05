# 🔍 Scroll Nefunguje - Debugging Guide

## Promiň, musíme to prozkoumat důkladněji

Změny které jsem udělal v Layout.js by měly pomoci, ale potřebuji víc informací, co se skutečně děje.

## 📋 Kroky pro debugging:

### 1. Otevři aplikaci a jdi na Orders25List

### 2. Otevři Developer Tools (F12)

### 3. Podívej se do Console záložky

### 4. Přidané debug logy

V kódu jsem přidal několik debug logů:

#### Při scrollování:
```
[ScrollState] 📍 Scroll event detected, scrollY: X
[ScrollState] 💾 Ukládám scroll state: {...}
```

#### Při ukládání ručně (změna stránky):
```
[SaveScroll] 💾 Ukládám scroll: X, scrollContainer: true/false
```

#### Při obnově po F5:
```
[ScrollState] 🔍 DEBUG: scrollContainer: <main>...</main>
[ScrollState] 🔍 DEBUG: scrollContainer overflow-y: auto/visible/scroll
[ScrollState] 🔍 DEBUG: scrollContainer scrollHeight: X
[ScrollState] 🔍 DEBUG: scrollContainer clientHeight: X
[ScrollState] ✅ Scroll PŘED: 0
[ScrollState] ✅ Scroll ZA CÍLEM: X
[ScrollState] ✅ Scroll PO NASTAVENÍ: X
[ScrollState] ✅ Scroll FUNGUJE? ✅ ANO / ❌ NE
```

### 5. Test v konzoli

Zkopíruj obsah souboru `test-scroll-debug.js` a vlož ho do konzole. Výstup pošli.

### 6. Co potřebuji vědět:

1. **Ukládá se scroll vůbec?**
   - Při scrollování vidíš logy `[ScrollState] 📍 Scroll event detected`?
   - Ukládá se hodnota větší než 0?

2. **Načítá se scroll state po F5?**
   - Po F5 vidíš log `[ScrollState] 📍 getScrollState: Načteno ze sessionStorage`?
   - Jaká hodnota scrollY tam je?

3. **Má main element správné nastavení?**
   - Log `[ScrollState] 🔍 DEBUG: scrollContainer overflow-y:` ukazuje co?
   - Je `scrollHeight` větší než `clientHeight`?

4. **Funguje nastavení scrollTop?**
   - Log `[ScrollState] ✅ Scroll FUNGUJE?` říká co?
   - Pokud NE, jaký je rozdíl mezi cílem a skutečnou hodnotou?

### 7. Možné příčiny které zjistíme:

#### A) Main element nemá overflow-y: auto
- **Zjistíme:** `overflow-y: visible` v logu
- **Řešení:** Layout.js změna nefunguje, musíme to zkontrolovat

#### B) Main element není scroll container (scrollHeight = clientHeight)
- **Zjistíme:** `scrollHeight` === `clientHeight`
- **Řešení:** Content není dost vysoký, nebo je nějaký wrapper

#### C) Scroll se ukládá jako 0
- **Zjistíme:** `[ScrollState] 💾 Ukládám scroll: 0` i když jsi scrolloval
- **Řešení:** Scroll listener není připojen ke správnému elementu

#### D) Scroll se vůbec neukládá
- **Zjistíme:** Žádné logy `[ScrollState] 📍 Scroll event detected`
- **Řešení:** Event listener není připojen, nebo je připojen k špatnému elementu

#### E) Scroll se ukládá, ale nenačítá
- **Zjistíme:** Ukládání funguje, ale po F5 není log načtení
- **Řešení:** Problem v `getScrollState` nebo sessionStorage

#### F) Scroll se načítá, ale nenastavuje
- **Zjistíme:** Načítá se správná hodnota, ale `Scroll FUNGUJE? ❌ NE`
- **Řešení:** Element nemůže scrollovat (overflow/height problem)

#### G) Něco resetuje scroll po nastavení
- **Zjistíme:** `Scroll PO NASTAVENÍ` je správně, ale potom se změní
- **Řešení:** Další useEffect nebo component resetuje scroll

## 📝 Co udělat teď:

1. ✅ Změny jsou připraveny s debug logy
2. 🔄 Obnov stránku (npm start může běžet)
3. 👀 Sleduj konzoli
4. 📋 Pošli mi co vidíš v konzoli:
   - Při scrollování
   - Po zmáčknutí F5
   - Výsledek test skriptu

## 🎯 Až budu vědět co se děje, najdu správné řešení!

Sorry že to hned nefungovalo. Budu potřebovat vidět ty logy, abych zjistil, kde přesně je problém.
