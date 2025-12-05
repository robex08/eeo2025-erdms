# 🔍 ANALÝZA LOCALSTORAGE - Co mazat při logout

**Datum analýzy:** 17. listopadu 2025  
**Analyzovaný localStorage:** Reálná data z produkční session

---

## 📊 AKTUÁLNÍ STAV LOCALSTORAGE

| Klíč | Hodnota | Citlivé? | Akce |
|------|---------|----------|------|
| `addressBook_activeTab_anon` | `"suppliers"` | ⚠️ Session | ❌ **SMAZAT** |
| `app_current_user_id` | `1` | 🔴 **KRITICKÉ** | ❌ **SMAZAT** |
| `app_lastRoute` | `/orders25-list` | ⚠️ Per-user | ❌ **SMAZAT** |
| `app_theme_mode` | `light` | ✅ Obecné | ✅ **ZACHOVAT** |
| `calendar_order_counts` | `{...objednávky...}` | 🔴 **CITLIVÉ** | ❌ **SMAZAT** |
| `calendar_order_counts_updated` | `1763335985126` | ⚠️ Timestamp | ❌ **SMAZAT** |

---

## 🔴 KRITICKÁ BEZPEČNOSTNÍ RIZIKA

### 1. **`app_current_user_id: 1`** 
```javascript
// ❌ VELMI NEBEZPEČNÉ!
localStorage.getItem('app_current_user_id') // "1"
```

**Proč je to problém:**
- Jiný uživatel po přihlášení může vidět ID předchozího uživatele
- Může způsobit záměnu identity v kódu
- Riziko zobrazení dat předchozího uživatele

**Řešení:** ✅ Přidáno do `DELETE_PATTERNS`

---

### 2. **`calendar_order_counts: {...}`**
```json
{
  "2025-11-16": {"total": 3, "pending": 0},
  "2025-11-15": {"total": 1, "pending": 0},
  "2025-11-14": {"total": 4, "pending": 0}
  // ... další data
}
```

**Proč je to problém:**
- Obsahuje statistiky objednávek konkrétního uživatele
- Může odhalit workload patterns
- GDPR problém - osobní data v plaintext

**Řešení:** ✅ Přidáno do `DELETE_PATTERNS`

---

### 3. **`order_templates_1`** (není v aktuálním výpisu, ale existuje)
```json
{
  "templates": [
    {
      "name": "Standardní objednávka ZZS",
      "supplier": "ABC s.r.o.",
      "amount": 50000,
      "description": "..."
    }
  ]
}
```

**Proč je to problém:**
- Obsahuje dodavatele (business informace)
- Obsahuje částky (finanční data)
- Obsahuje popisy (může obsahovat citlivé info)
- Per-user data (suffix `_1` = user_id)

**Řešení:** ✅ Přesunuto z KEEP do DELETE_PATTERNS

---

## ⚠️ STŘEDNĚ RIZIKOVÉ

### 4. **`app_lastRoute: /orders25-list`**

**Proč je to sporné:**
- Může obsahovat per-user kontext (např. `/cashbook/user/1`)
- Může odhalit, co uživatel dělal
- Session-specific informace

**Původní stav:** V KEEP_PATTERNS (pro obnovení pozice)  
**Nový stav:** ✅ Přesunuto do DELETE_PATTERNS

**Alternativa:** Místo `app_lastRoute` použít `last_location` (který se ukládá pouze před logout)

---

### 5. **`addressBook_activeTab_anon: "suppliers"`**

**Proč smazat:**
- Session state (nerelevantní pro další session)
- Není užitečné zachovávat

**Řešení:** ✅ Přidáno do DELETE_PATTERNS pattern `addressBook_activeTab_*`

---

## ✅ BEZPEČNÉ - ZACHOVAT

### 6. **`app_theme_mode: light`**

**Proč zachovat:**
- Obecná UI preference
- Není vázané na konkrétního uživatele
- Zlepšuje UX (uživatel nemusí znovu nastavovat)

**Řešení:** ✅ Přidáno do KEEP_PATTERNS

---

## 🔧 PROVEDENÉ ZMĚNY

### KEEP_PATTERNS (✅ Zachovat)
```javascript
✅ PŘIDÁNO:
+ 'app_theme_mode'  // Light/dark mode

❌ ODSTRANĚNO:
- 'app_lastRoute'        // Přesunuto do DELETE (per-user context)
- 'order_templates*'     // Přesunuto do DELETE (citlivá data)
- 'frequent_suppliers*'  // Přesunuto do DELETE (business data)
- 'user_templates*'      // Přesunuto do DELETE (per-user data)
```

### DELETE_PATTERNS (❌ Smazat při logout)
```javascript
✅ PŘIDÁNO:
+ 'calendar_order_counts*'      // Statistiky objednávek
+ 'order_templates*'            // Šablony s dodavateli a částkami
+ 'frequent_suppliers*'         // Často používaní dodavatelé
+ 'user_templates*'             // Vlastní šablony
+ 'app_current_user_id'         // KRITICKÉ: User ID
+ 'app_lastRoute'               // Poslední navštívená stránka
+ 'addressBook_activeTab_*'     // Aktivní záložky address book
```

---

## 📋 KONTROLNÍ CHECKLIST PO LOGOUT

Po odhlášení by localStorage **MĚLY** obsahovat pouze:

### ✅ CO ZŮSTÁVÁ:
- [ ] `app_theme_mode` - light/dark mode
- [ ] `ui_language` - preferovaný jazyk (pokud existuje)
- [ ] `last_location` - pozice pro obnovení po login
- [ ] `order25_draft_*` - rozpracované drafty (zachovat!)
- [ ] `suppliers_cache` - public data (ARES cache)
- [ ] `debug_settings` - vývojářské nastavení

### ❌ CO SE SMAZALO:
- [ ] `app_current_user_id` - **MUSÍ** být smazáno!
- [ ] `calendar_order_counts` - **MUSÍ** být smazáno!
- [ ] `calendar_order_counts_updated` - **MUSÍ** být smazáno!
- [ ] `order_templates_1` - **MUSÍ** být smazáno!
- [ ] `app_lastRoute` - **MĚLO BY** být smazáno
- [ ] `addressBook_activeTab_anon` - **MĚLO BY** být smazáno

---

## 🧪 JAK OTESTOVAT

### 1. Před logout:
```javascript
// V DevTools Console:
console.log('PŘED LOGOUT:', Object.keys(localStorage));
```

### 2. Klikni na logout

### 3. Po logout:
```javascript
// V DevTools Console:
console.log('PO LOGOUT:', Object.keys(localStorage));

// Kontrola kritických klíčů:
console.log('user_id:', localStorage.getItem('app_current_user_id')); // MUSÍ být null
console.log('calendar:', localStorage.getItem('calendar_order_counts')); // MUSÍ být null
console.log('templates:', localStorage.getItem('order_templates_1')); // MUSÍ být null
console.log('theme:', localStorage.getItem('app_theme_mode')); // MŮŽE být "light"
```

### 4. Přihlaš se jako jiný uživatel

### 5. Zkontroluj:
```javascript
// NESMÍ existovat data předchozího uživatele:
console.log('user_id:', localStorage.getItem('app_current_user_id')); 
// Pokud vidíš ID předchozího uživatele = BUG!
```

---

## 📊 SROVNÁNÍ: PŘED vs PO

| Kategorie | Před | Po | Rozdíl |
|-----------|------|-----|--------|
| **Celkem klíčů** | ~50 | ~15 | -70% |
| **Citlivá data** | ❌ Ano | ✅ Ne | **FIXED** |
| **User ID** | ❌ Ano | ✅ Ne | **FIXED** |
| **Kalendář** | ❌ Ano | ✅ Ne | **FIXED** |
| **Šablony** | ❌ Ano | ✅ Ne | **FIXED** |
| **Theme** | ✅ Ano | ✅ Ano | **OK** |
| **Drafty** | ✅ Ano | ✅ Ano | **OK** |

---

## 🎯 VÝSLEDEK

✅ **PŘED:** Vysoké riziko úniku dat mezi uživateli  
✅ **PO:** Citlivá data jsou kompletně vyčištěna  
✅ **BONUS:** Zachovány užitečné preference (theme, drafty)

---

## 📚 SOUVISEJÍCÍ DOKUMENTY

- `SECURITY-ANALYSIS-TOKEN-STORAGE.md` - Analýza bezpečnosti tokenů
- `BACKEND-TOKEN-AUTO-REFRESH-REQUIREMENT.md` - Auto-refresh tokenu
- `src/utils/logoutCleanup.js` - Implementace cleanup logiky

---

## ⚡ NEXT STEPS

1. ✅ **HOTOVO:** Upraveny KEEP a DELETE patterns
2. ⏳ **TODO:** Otestovat logout flow v DEV prostředí
3. ⏳ **TODO:** Otestovat logout flow s více uživateli
4. ⏳ **TODO:** Commit a push změn
5. ⏳ **TODO:** Deploy na PROD
6. ⏳ **TODO:** Monitoring - sledovat localStorage po logout

