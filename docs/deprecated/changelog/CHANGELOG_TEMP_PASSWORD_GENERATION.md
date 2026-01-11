# CHANGELOG: Generování dočasných hesel a uvítací emaily

**Datum:** 28. prosince 2025  
**Autor:** GitHub Copilot  
**Typ změny:** Feature (nová funkcionalita)

## 📋 Popis změny

Implementována nová funkcionalita pro hromadné generování dočasných hesel a automatické odesílání uvítacích emailů novým uživatelům EEO systému.

## ✨ Co bylo přidáno

### 1. Frontend - HTML Šablony (Debug Panel)

**Soubor:** `apps/eeo-v2/client/src/pages/DebugPanel.js`

Přidána nová sekce v záložce "HTML Šablony":

- **Seznam uživatelů** s checkboxy pro výběr
- Zobrazení: Celé jméno, username, email, role
- Tlačítko pro generování hesel a odeslání emailů
- Zobrazení výsledků generování s detaily (heslo, email)
- Načítání uživatelů přes API endpoint `/users/list`

**Komponenty:**
- State management pro vybrané uživatele
- Loading states pro načítání uživatelů a generování hesel
- Zobrazení výsledků s úspěchem/chybami pro každého uživatele

### 2. Backend - API Handler

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/userHandlers.php`

Nová funkce: `handle_users_generate_temp_password()`

**Funkčnost:**
1. Ověření tokenu a oprávnění (pouze admin a superadmin)
2. Validace vybraných uživatelů
3. Načtení uvítací email šablony z DB
4. Pro každého vybraného uživatele:
   - Kontrola existence a aktivního stavu
   - Kontrola existence emailu
   - Generování 8-znakového dočasného hesla (alfanumerické + speciální znaky)
   - Hash hesla pomocí `password_hash()`
   - Update DB: nastavení nového hesla + `vynucena_zmena_hesla = 1`
   - Nahrazení placeholderů v email šabloně
   - Odeslání uvítacího emailu
   - Rollback v případě selhání odeslání emailu

**Parametry:**
- `token` - autentizační token
- `username` - username přihlášeného uživatele
- `user_ids` - array ID uživatelů pro generování hesel

**Response:**
```json
{
  "status": "ok",
  "results": [
    {
      "success": true,
      "user_id": 1,
      "username": "u12345",
      "user_name": "Jan Novák",
      "email": "jan.novak@zachranka.cz",
      "temp_password": "A3K8N@2P"
    }
  ]
}
```

### 3. API Routing

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/api.php`

Přidán nový endpoint:
- `POST /users/generate-temp-password`

### 4. Email šablona

**Soubor:** `_docs/scripts-sql/insert-welcome-email-template.sql`

Vytvořena a vložena do DB nová email šablona:
- **Typ:** `welcome_new_user`
- **Název:** "Uvítací email - Nový uživatel EEO systému"
- **Předmět:** "Váš přístup do EEO systému správy objednávek"
- **ID v DB:** 112

**Placeholder:**
- `{docasne_heslo}` - bude nahrazen vygenerovaným heslem

**Design:**
- Moderní HTML email s inline CSS
- Responsivní layout
- Modrý gradient header
- Box s přihlašovacími údaji
- Odkaz na aplikaci (https://erdms.zachranka.cz/eeo-v2)
- 4-krokový návod "Jak začít"
- Kontaktní informace (IT hotline, Robert Holovský)
- Footer s informací o automatickém odeslání

## 🔒 Bezpečnost

1. **Oprávnění:** Pouze admin (role_id=1) a superadmin (role_id=2)
2. **Generování hesla:** 
   - 8 znaků
   - Alfanumerické znaky (bez podobných: I, l, 1, O, 0)
   - Speciální znaky: !@#$%
3. **Hashování:** `password_hash()` s DEFAULT algoritmem
4. **Vynucená změna:** `vynucena_zmena_hesla = 1` automaticky nastaven
5. **Rollback:** Pokud se email nepodaří odeslat, vynucená změna hesla se zruší

## 📊 Flow

```
1. Admin otevře Debug Panel → HTML Šablony
2. Načtou se všichni aktivní uživatelé
3. Admin vybere uživatele (checkboxy)
4. Klikne "Vygenerovat hesla a odeslat uvítací emaily"
5. Backend pro každého uživatele:
   a) Vygeneruje dočasné heslo
   b) Uloží do DB (hash)
   c) Nastaví vynucena_zmena_hesla = 1
   d) Odešle uvítací email s heslem
6. Zobrazí se výsledky (úspěch/chyba pro každého)
```

## 🧪 Testování

### Manuální test:
1. Přihlásit se jako admin
2. Otevřít `/debug` → záložka "HTML Šablony"
3. Vybrat testovacího uživatele (s platným emailem)
4. Kliknout "Vygenerovat hesla a odeslat uvítací emaily"
5. Ověřit:
   - Email dorazil na uvedenou adresu
   - Heslo v emailu funguje pro přihlášení
   - Po přihlášení je vyžadována změna hesla
   - V tabulce `25_uzivatele` je `vynucena_zmena_hesla = 1`

### Databáze kontrola:
```sql
-- Zkontroluj vynucenou změnu hesla
SELECT id, username, jmeno, prijmeni, vynucena_zmena_hesla 
FROM 25_uzivatele 
WHERE id IN (seznam_testovanych_ID);
```

## 📁 Změněné soubory

1. ✅ `apps/eeo-v2/client/src/pages/DebugPanel.js` - nová sekce pro generování hesel
2. ✅ `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/userHandlers.php` - nový handler
3. ✅ `apps/eeo-v2/api-legacy/api.eeo/api.php` - nový routing endpoint
4. ✅ `_docs/scripts-sql/insert-welcome-email-template.sql` - SQL skript pro email šablonu

## 🔗 Related Issues

- Původní problém: Tabulka uživatelů nezobrazovala stav vynucené změny hesla
- Fix: Přidáno pole `vynucena_zmena_hesla` do SQL dotazu v `handlers.php`

## 📝 TODO / Budoucí vylepšení

- [ ] Přidat hromadný export hesel do CSV (pro administrátory)
- [ ] Přidat možnost vlastního nastavení délky hesla
- [ ] Přidat možnost výběru všech uživatelů najednou
- [ ] Přidat filtrování uživatelů podle role
- [ ] Přidat preview uvítacího emailu před odesláním
- [ ] Přidat log všech vygenerovaných hesel (audit trail)

## ⚙️ Konfigurace

Žádná další konfigurace není potřeba. Funkce je okamžitě dostupná pro všechny adminy.

## 📖 Dokumentace pro uživatele

**Jak vygenerovat dočasné heslo pro nového uživatele:**

1. Přejděte na `/debug` (pouze pro adminy)
2. Klikněte na záložku **"HTML Šablony"**
3. V sekci "Generování dočasných hesel" najdete seznam všech aktivních uživatelů
4. Zaškrtněte uživatele, kterým chcete vygenerovat heslo
5. Klikněte na tlačítko **"Vygenerovat hesla a odeslat uvítací emaily"**
6. Každý vybraný uživatel obdrží email s dočasným heslem
7. Po přihlášení bude uživatel vyzván ke změně hesla

## ⚠️ Důležité upozornění

- Dočasná hesla jsou zobrazena pouze jednou po vygenerování
- Ujistěte se, že uživatel má platnou emailovou adresu v systému
- Heslo je platné okamžitě po vygenerování
- Uživatel MUSÍ změnit heslo při prvním přihlášení

---

**Status:** ✅ Implementováno a otestováno  
**Verze API:** v2025.03_25  
**Frontend verze:** React 18
