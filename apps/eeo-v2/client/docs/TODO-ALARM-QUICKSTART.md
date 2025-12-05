# ⏰ TODO Alarm Systém - Quick Start

## 🚀 Co je nového?

TODO úkoly mají nyní pokročilý alarm systém s prioritami!

## 📝 Jak používat

### 1. Nastavit Alarm

1. Otevři TODO panel
2. Klikni na ikonu 🔔 u úkolu
3. Vyber:
   - **Datum** kdy má alarm vyprštět
   - **Čas** (můžeš použít +15m pro rychlé nastavení)
   - **Prioritu**:
     - `NORMAL` 🔔 → Notifikace do zvonečku
     - `HIGH` 🚨 → Vyskakovací okénko

### 2. Vizuální Označení

Řádky se automaticky barví podle priority:
- 🟦 **Bez alarmu**: Modrá
- 🟨 **NORMAL**: Žlutá
- 🟥 **HIGH**: Světle červená

### 3. Co se stane když alarm vyprší?

#### NORMAL Priority 🔔
- Zobrazí se v notifikacích (zvonek nahoře)
- Neklade vysoké nároky na pozornost

#### HIGH Priority 🚨
- Zobrazí se floating popup okénko
- Můžeš ho přesouvat po obrazovce
- Více oken může být otevřeno najednou
- Okénka se automaticky rozmístí

## 🎮 Ovládání Floating Popup

- **Přesunout**: Chyť okénko myší a táhni
- **Zavřít**: Klikni na ✕ nebo tlačítko "Zavřít"
- **Dokončit**: Klikni "Označit hotové" ✓

## ⚙️ Technické Detaily

- Background kontrola: **každou minutu**
- Alarmy uloženy v **šifrovaném localStorage**
- Funguje i po obnovení stránky (F5)
- Každý alarm se odpálí pouze **jednou**

## 📦 Upravené Soubory

```
src/
  components/
    ├── FloatingAlarmPopup.js        [NOVÝ] Floating popup komponenta
    ├── Layout.js                    [UPRAVENO] Integrace alarmů
    └── panels/
        └── TodoPanel.js             [UPRAVENO] Modal s prioritou
  hooks/
    └── useTodoAlarms.js             [UPRAVENO] Podpora priorit
```

## 🎨 Datová Struktura

```javascript
{
  id: "task-123",
  text: "Důležitý úkol",
  done: false,
  alarm: {
    time: 1234567890,        // Timestamp
    priority: "HIGH",        // "NORMAL" nebo "HIGH"
    fired: false,            // Zda už alarm odpálil
    acknowledged: false      // Zda uživatel potvrdil
  }
}
```

## 🐛 Známé Limitace

- Funguje pouze po přihlášení
- Kontrola každou minutu (ne sekundu)
- Bez podpory pro opakující se alarmy

## 📚 Další Dokumentace

Kompletní dokumentace: `TODO-ALARM-SYSTEM.md`

---

**Verze**: 1.0  
**Datum**: 19.10.2025
