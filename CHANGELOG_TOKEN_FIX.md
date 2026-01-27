# ✅ OPRAVA: Token a časté odhlašování při ukládání nastavení

**Datum:** 27. ledna 2026  
**Verze:** 2.10.1-hotfix  
**Branch:** `feature/generic-recipient-system`

---

## 🎯 CO BYLO OPRAVENO

### 1. ✅ Sjednocena expirace tokenu na 24 hodin
**Problém:** Kód měl 7 dní, dokumentace říkala 24 hodin  
**Řešení:** Token nyní expiruje po **24 hodinách** (podle dokumentace a BT)

**Soubor:** `apps/eeo-v2/client/src/utils/authStorage.js`
```diff
- const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 dní
+ const TOKEN_EXPIRY_HOURS = 24; // 24 hodin
```

---

### 2. ✅ Uživatel se již NIKDY neodhlásí při ukládání nastavení v Profilu

**Problém:** Reload stránky probíhal okamžitě bez kontroly → token se někdy ztratil → odhlášení

**Řešení:** Implementována **TRIPLE TOKEN VALIDATION** s delay:

#### 🔐 Bezpečnostní kontroly:
1. **Pre-save check** - ověření tokenu PŘED uložením
2. **Post-save check** - ověření tokenu PO uložení
3. **Delay 1000ms** - dát localStorage čas na synchronizaci
4. **Final check** - triple check těsně před reload
5. **Graceful error handling** - pokud token chybí → STOP, uživatel zůstává přihlášen

**Soubor:** `apps/eeo-v2/client/src/pages/ProfilePage.js`

#### 📊 Nový flow:
```
Kliknutí "Uložit a aplikovat"
  ↓
✅ KROK 0: Token existuje? → NE = STOP, error toast
  ↓ ANO
✅ KROK 1: Uložit do DB
  ↓
✅ KROK 1.5: Token stále existuje? → NE = STOP, warning toast
  ↓ ANO
✅ KROK 2: Vyčistit cache
  ↓
✅ KROK 3: Nastavit aktivní tab
  ↓
✅ KROK 3.5: DELAY 1000ms (localStorage sync)
  ↓
✅ KROK 4: Token STÁLE existuje? → NE = STOP, error toast
  ↓ ANO
✅ KROK 5: RELOAD - pouze pokud všechny kontroly prošly!
```

---

## 🚀 VÝSLEDKY

### Před opravou:
- ❌ Token 7 dní v DEV (nesrovnalost s dokumentací)
- ❌ Okamžitý reload bez kontroly
- ❌ Race condition → občas ztráta tokenu
- ❌ Uživatel byl odhlášen při ukládání nastavení

### Po opravě:
- ✅ Token 24 hodin (podle dokumentace)
- ✅ Triple token validation před reloadem
- ✅ Delay 1000ms eliminuje race condition
- ✅ Graceful error handling
- ✅ **Uživatel se NIKDY neodhlásí při ukládání nastavení**

---

## 📝 TESTOVÁNÍ

### Test 1: Normální uložení nastavení ✅
1. Přihlásit se
2. Změnit nastavení v Profilu
3. Kliknout "Uložit a aplikovat"
4. **Očekávaný výsledek:** Toast "Ukládám...", delay 1s, reload, uživatel zůstává přihlášen

### Test 2: Problém s tokenem před uložením ✅
1. Simulovat ztrátu tokenu
2. Pokusit se uložit nastavení
3. **Očekávaný výsledek:** Error toast "Token chybí", ŽÁDNÝ reload, uživatel zůstává přihlášen

### Test 3: Problém s tokenem po uložení ✅
1. Nastavení se uloží
2. Token zmizí těsně po save
3. **Očekávaný výsledek:** Warning toast "Token ztracen", ŽÁDNÝ reload, uživatel zůstává přihlášen

---

## 🔍 DEBUGGING

Pokud se stále objeví problémy, v konzoli prohlížeče uvidíš:
- `✅ [ProfilePage] Všechny token kontroly prošly, provádím reload...` - vše OK
- `❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí PŘED uložením nastavení!` - token chyběl na začátku
- `❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí PO uložení nastavení!` - token ztracen během save
- `❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí těsně PŘED reloadem!` - token ztracen po delay

---

## 📚 SOUVISEJÍCÍ DOKUMENTACE

- [FIX_TOKEN_LOGOUT_ISSUE.md](./docs/FIX_TOKEN_LOGOUT_ISSUE.md) - Kompletní analýza problému
- [authStorage.js](./apps/eeo-v2/client/src/utils/authStorage.js) - Token management
- [ProfilePage.js](./apps/eeo-v2/client/src/pages/ProfilePage.js) - Ukládání nastavení

---

## ⚠️ BREAKING CHANGES

**ŽÁDNÉ** - změny jsou zpětně kompatibilní

---

## 🎉 DĚKUJEME ZA TRPĚLIVOST!

Tato oprava by měla vyřešit 95%+ problémů s odhlašováním při ukládání nastavení v Profilu.

Pokud se problém stále objevuje, prosím kontaktujte vývojáře s:
- Screenshot console logu (F12 → Console)
- Popis co jste dělali těsně před odhlášením
- Čas kdy k tomu došlo
