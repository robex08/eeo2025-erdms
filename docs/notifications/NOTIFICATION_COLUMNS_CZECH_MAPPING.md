# Analýza přejmenování sloupců notifikačních tabulek na češtinu

## 📊 Souhrn rozsahu změn

**Celkový počet výskytů anglických názvů v PHP kódu: ~650+**

- `notificationHandlers.php`: 2047 řádků, ~450 výskytů
- `notificationTemplatesHandlers.php`: ~150 výskytů  
- `notificationHelpers.php`: ~50 výskytů

---

## 1️⃣ Tabulka: `25_notifikace` (hlavní)

### Anglické sloupce → České ekvivalenty

| Anglicky | Česky | Výskytů v PHP | Poznámka |
|----------|-------|---------------|----------|
| `type` | `typ` | 74 | **Nejvyšší priorita** - klíčový sloupec |
| `title` | `nadpis` | 34 | Zobrazovaný text |
| `message` | `zprava` | 48 | Hlavní obsah notifikace |
| `data_json` | `data_json` | 10 | **Ponechat** - technický JSON |
| `from_user_id` | `od_uzivatele_id` | 4 | Reference na odesílatele |
| `to_user_id` | `pro_uzivatele_id` | 13 | Reference na příjemce |
| `to_users_json` | `prijemci_json` | 4 | JSON seznam příjemců |
| `to_all_users` | `pro_vsechny` | 13 | Boolean flag |
| `priority` | `priorita` | 35 | ENUM hodnota |
| `category` | `kategorie` | 52 | **Vysoká priorita** |
| `send_email` | `odeslat_email` | 23 | Boolean flag |
| `email_sent` | `email_odeslan` | 5 | Boolean flag |
| `email_sent_at` | `email_odeslan_kdy` | 1 | Datetime |
| `related_object_type` | `objekt_typ` | 11 | Typ souvisejícího objektu |
| `related_object_id` | `objekt_id` | 12 | ID souvisejícího objektu |
| `active` | `aktivni` | 40 | Boolean flag |

**Ponechat beze změny:**
- `id` - primární klíč
- `dt_created`, `dt_expires` - už jsou české

---

## 2️⃣ Tabulka: `25_notifikace_precteni` (read state)

### Anglické sloupce → České ekvivalenty

| Anglicky | Česky | Výskytů v PHP | Poznámka |
|----------|-------|---------------|----------|
| `notification_id` | `notifikace_id` | 48 | Foreign key |
| `user_id` | `uzivatel_id` | 127 | **Nejvyšší priorita** |
| `is_read` | `precteno` | 12 | Boolean flag |
| `dt_read` | `dt_precteno` | - | Datetime |
| `is_dismissed` | `skryto` | 15 | Boolean flag |
| `dt_dismissed` | `dt_skryto` | - | Datetime |
| `is_deleted` | `smazano` | 8 | Soft delete flag |
| `dt_deleted` | `dt_smazano` | - | Datetime |

**Ponechat beze změny:**
- `id`, `dt_created` - už je české

---

## 3️⃣ Tabulka: `25_notifikace_sablony` (templates)

### Anglické sloupce → České ekvivalenty

| Anglicky | Česky | Výskytů v PHP | Poznámka |
|----------|-------|---------------|----------|
| `type` | `typ` | 74 | Sdílí s hlavní tabulkou |
| `name` | `nazev` | - | Lidsky čitelný název |
| `email_subject` | `email_predmet` | 22 | Email subject line |
| `email_body` | `email_telo` | 23 | HTML email content |
| `send_email_default` | `email_vychozi` | 14 | Boolean default |
| `app_title` | `app_nadpis` | 25 | In-app notifikace |
| `app_message` | `app_zprava` | 25 | In-app content |
| `priority_default` | `priorita_vychozi` | 14 | ENUM default |
| `active` | `aktivni` | 40 | Sdílí s hlavní |

**Ponechat beze změny:**
- `id`, `dt_created`, `dt_updated` - už jsou české

---

## 4️⃣ Ostatní tabulky (už jsou české)

✅ **`25_notifikace_typy_udalosti`** - už má české názvy  
✅ **`25_notifikace_fronta`** - už má české názvy  
✅ **`25_notifikace_audit`** - už má české názvy  
✅ **`25_notifikace_uzivatele_nastaveni`** - už má české názvy

---

## 🔍 Posouzení proveditelnosti

### ✅ PROS (Výhody)

1. **Konzistence** - sjednocení s ostatními tabulkami (typy_udalosti, fronta, audit)
2. **Čitelnost** - české názvy jsou přirozenější pro český tým
3. **Údržba** - jednodušší orientace v kódu pro české vývojáře
4. **Standardizace** - dodržení českého naming v celém systému

### ⚠️ CONS (Rizika)

1. **Rozsah změn**: ~650+ výskytů v PHP kódu
2. **CRUD operace**: 
   - SELECT dotazy: ~200 výskytů
   - INSERT dotazy: ~50 výskytů
   - UPDATE dotazy: ~100 výskytů
   - WHERE podmínky: ~300 výskytů
3. **Testování**: nutné otestovat všechny notifikační endpointy
4. **Regrese**: riziko narušení existující funkcionality
5. **Rollback**: složitější než přejmenování tabulek

### 📋 Nejkritičtější sloupce (podle frekvence)

1. **`user_id`** → `uzivatel_id` (127×) 🔴 Nejvyšší riziko
2. **`type`** → `typ` (74×) 🔴 Sdíleno 2 tabulkami
3. **`category`** → `kategorie` (52×) 🟠
4. **`notification_id`** → `notifikace_id` (48×) 🟠
5. **`message`** → `zprava` (48×) 🟠
6. **`active`** → `aktivni` (40×) 🟠 Sdíleno 2 tabulkami

---

## 💡 Doporučení

### Varianta A: Kompletní přejmenování (optimální dlouhodobě)

**Postup:**
1. Vytvořit ALTER TABLE skripty pro všechny 3 tabulky
2. Použít `sed` pro hromadnou náhradu v PHP (podobně jako u konstant)
3. Testovat na dev prostředí před nasazením
4. Provést v maintenance window

**Riziko:** Vysoké (650+ změn)  
**Benefit:** Nejvyšší konzistence  
**Čas:** 2-3 hodiny implementace + testování

### Varianta B: Postupné přejmenování (bezpečnější)

**Postup:**
1. Začít s nejméně používanými sloupci (email_sent_at, from_user_id)
2. Postupně přejít na středně používané (priority, title, message)
3. Nakonec nejvíce používané (user_id, type, category)

**Riziko:** Střední (rozložené v čase)  
**Benefit:** Kontrolovatelné  
**Čas:** Několik iterací

### Varianta C: Aliasy (dočasné řešení)

**Postup:**
1. Vytvořit VIEW s českými názvy
2. Postupně migrovat kód na VIEW
3. Poté provést RENAME sloupců

**Riziko:** Nízké  
**Benefit:** Zero-downtime  
**Čas:** Nejdelší (3-4 týdny)

---

## 🎯 Moje doporučení: **Varianta A s opatrností**

**Důvody:**
- Už máme zkušenost s rename tabulek + konstant
- Sed scripty jsou efektivní a ověřené
- Lepší to udělat najednou než po částech
- Už jsme v dev prostředí, můžeme testovat

**Kritické kroky:**
1. ✅ Git commit před změnami (checkpoint)
2. 🔧 Vytvořit ALTER TABLE skripty
3. 🔧 Vytvořit sed replace skripty pro PHP
4. ✅ Spustit PHP syntax check
5. ✅ Testovat všechny endpointy
6. ✅ Commit po úspěšném testu
7. 📝 Dokumentovat změny

---

## 🚀 Implementační plán (pokud schváleno)

1. **Backup** - git commit současného stavu
2. **ALTER TABLE** - přejmenovat sloupce v DB (3 tabulky, ~25 sloupců)
3. **PHP Replace** - sed náhrady v notificationHandlers.php
4. **PHP Replace** - sed náhrady v notificationTemplatesHandlers.php
5. **PHP Replace** - sed náhrady v notificationHelpers.php
6. **Syntax Check** - php -l na všechny soubory
7. **Apache Reload** - načíst nový PHP kód
8. **Testing** - otestovat /notifications/* endpointy
9. **Commit** - uložit funkční stav

**Odhadovaný čas: 60-90 minut**

