# ❗ PROBLÉM: Prohlížeč má starou verzi JavaScriptu v cache

## Symptomy:
- Žlutý badge "👤 Akce: Robert Holovský" místo fialového
- Chybí ID objednávky jako superscript (#11463)
- Staré formátování místo nového

## Řešení:

### 1. Hard Refresh (nejrychlejší)
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### 2. Vymazat cache (pokud hard refresh nepomůže)
- **Chrome/Edge**: `Ctrl + Shift + Delete` → vybrat "Cached images and files" → Clear data
- **Firefox**: `Ctrl + Shift + Delete` → vybrat "Cache" → Clear Now
- **Mac**: `Cmd + Shift + Delete`

### 3. Incognito/Private Window (jako test)
- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Mac**: `Cmd + Shift + N`

## Co by mělo být po vymazání cache:

✅ **Fialový badge** `#f3e8ff` / `#6b21a8`
✅ **Bez "Akce:"**, jen: `👤 Robert Holovský`
✅ **ID jako superscript**: `O-2004/75030926/2025/IT #11463`
✅ **Klikatelný odkaz** na číslo objednávky
