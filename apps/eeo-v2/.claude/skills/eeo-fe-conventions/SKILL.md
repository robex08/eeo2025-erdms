---
name: eeo-fe-conventions
description: React/JS konvence pro eeo-v2 frontend (apps/eeo-v2/client/src) - state management, async/await, a hlavně vzhled/chování datových tabulek (hlavička, vyhledávače, paginace, floating header). Použij při úpravě nebo tvorbě React komponent, zejména tabulek se seznamy dat.
---

# EEO v2 — Frontend konvence

## State a async

- Update stavu ze starého stavu vždy přes funkci:
  ```js
  // ✅ SPRÁVNĚ
  setCount(prevCount => prevCount + 1);
  // ❌ ŠPATNĚ
  setCount(count + 1);
  ```
- Řetězení asynchronních operací vždy `async/await`, nikdy `.then()`/callbacky.
- Minimalizuj `useEffect` a `setTimeout` — nejdřív zvaž, jestli operace nejde udělat synchronně.
- Pokud musí být `useEffect` asynchronní, vždy s cleanup funkcí.
- Po každé úpravě zkontroluj ESLint chyby.

## Tabulky se seznamy dat

Vzorová implementace: `src/.../Order25List.js` — z ní vycházej u vzhledu i chování nových/upravovaných tabulek.

Pravidla:
- Hlavička přes `<th>` (kvůli gradient podbarvení), **dva řádky**: 1. názvy sloupců, 2. vyhledávací pole ("hledáčky") pro filtrování ve sloupci.
- Pod tabulkou vždy naše standardní paginace.
- Poslední sloupec je vždy "Akce" — hlavička je ikona blesku, akční ikonky drobné, v odstínech šedé (nebarvené).
- Po jakékoli změně layoutu tabulky ověř, že se vyhledávací pole (hledáčky) přesunula správně a filtrují ve svém sloupci.
- Pokud je hledací pole datum, použij náš standardní datepicker, ale **bez** ikonek "dnes"/"smazat" (obvykle se tam nevejdou a vypadá to špatně) — a ověř, že filtrování podle data skutečně funguje.

### Floating header (pro dlouhé tabulky)

Při scrollu dlouhé tabulky zobraz plovoucí hlavičku nad obsahem:
- `IntersectionObserver` sleduje přímo `thead` element (ne sentinel), threshold `0`, porovnává `entry.boundingClientRect.bottom` proti výšce fixního headeru aplikace (app header + menu bar, typicky 144px).
- Šířky sloupců změř přes `headerCells.map(cell => cell.offsetWidth)` a předej floating hlavičce přes `colgroup`, ať sedí se zbytkem tabulky.
- Renderuj přes `ReactDOM.createPortal` (import `ReactDOM from 'react-dom'`, ne named `createPortal`) do `document.body`.
- Zkopíruj **oba** řádky hlavičky (názvy i hledáčky) a zachovej funkčnost event handlerů.
- `z-index: 9999`, plynulý fade/slide přechod (`opacity`/`transform`).

## API volání

Nikdy hardcoded absolutní produkční URL jako fallback — viz skill `eeo-build-troubleshoot` (sekce "Frontend konvence pro API base URL").

## Jazyk

Komunikuj a piš uživatelské texty/chybové hlášky v UI česky.
