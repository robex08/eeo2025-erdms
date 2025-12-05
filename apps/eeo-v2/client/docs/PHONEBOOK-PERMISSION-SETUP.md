# 📞 Telefonní seznam - Nové právo PHONEBOOK_VIEW

**Datum:** 29. listopadu 2025  
**Verze:** 1.0  
**Status:** Připraveno k implementaci (Frontend hotový, Backend čeká)

---

## 🎯 Účel

Zavádíme novou sekci **Telefonní seznam** pro snadné vyhledávání kontaktů v systému.

### Funkce:
- 📱 Vyhledávání podle **jména/názvu**, **telefonu**, **emailu**
- 👥 U **zaměstnanců**: zobrazení lokality a úseku
- 🏢 U **dodavatelů**: IČO, adresa, kontaktní osoba
- 👁️ **Pouze čtení** (VIEW) - žádné editace

---

## ✅ Frontend - Hotovo

### Změny v kódu:

1. **`src/utils/availableSections.js`**
   - Přidána kontrola práva `PHONEBOOK_VIEW`
   - Sekce "Telefonní seznam" se zobrazí uživatelům s tímto právem

2. **`src/App.js`**
   - Routing: `/phonebook` s kontrolou `hasPermission('PHONEBOOK_VIEW')`
   - Placeholder komponenta (TODO: dokončit PhonebookPage)

3. **`src/components/Layout.js`**
   - Menu položka "📞 Telefonní seznam"
   - Ikona `faPhone` přidána do importů

---

## 🔧 Backend - TODO

### 1. Přidání práva do databáze

**Tabulka:** `prava` (nebo `permissions`)

```sql
INSERT INTO prava (kod_prava, popis, aktivni) 
VALUES ('PHONEBOOK_VIEW', 'Přístup k telefonnímu seznamu (pouze čtení)', 1);
```

### 2. Přiřazení práva Admin rolím

**Role, které by měly mít toto právo automaticky:**
- `SUPERADMIN`
- `ADMINISTRATOR`

```sql
-- Získat ID práva
SET @pravo_id = (SELECT id FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW');

-- Přiřadit SUPERADMIN roli
INSERT INTO role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM role r
WHERE r.kod_role = 'SUPERADMIN';

-- Přiřadit ADMINISTRATOR roli
INSERT INTO role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM role r
WHERE r.kod_role = 'ADMINISTRATOR';
```

### 3. API Endpoint (volitelné)

Pokud bude třeba nový endpoint pro telefonní seznam:

```
POST /api.eeo/phonebook/list
Body: { username, token }
Response: {
  "status": "ok",
  "data": [
    {
      "typ": "zamestnanec",
      "jmeno": "Jan Novák",
      "email": "jan.novak@firma.cz",
      "telefon": "+420 123 456 789",
      "lokalita": "Praha",
      "usek": "IT oddělení"
    },
    {
      "typ": "dodavatel",
      "nazev": "ABC s.r.o.",
      "email": "info@abc.cz",
      "telefon": "+420 987 654 321",
      "ico": "12345678",
      "adresa": "Hlavní 1, Praha",
      "kontaktni_osoba": "Petr Svoboda"
    }
  ]
}
```

---

## 📋 Kontrolní seznam

### Backend úkoly:

- [ ] Přidat právo `PHONEBOOK_VIEW` do tabulky `prava`
- [ ] Přiřadit právo rolím `SUPERADMIN` a `ADMINISTRATOR`
- [ ] Ověřit, že právo se správně vrací v API `/auth/detail` nebo `/users/detail`
- [ ] (Volitelné) Vytvořit endpoint `/phonebook/list` pro spojené data zaměstnanců + dodavatelů

### Frontend úkoly:

- [x] Přidat kontrolu práva `PHONEBOOK_VIEW` do `availableSections.js`
- [x] Přidat routing `/phonebook` do `App.js`
- [x] Přidat menu položku do `Layout.js`
- [x] Přidat ikonu `faPhone`
- [ ] **TODO:** Vytvořit komponentu `PhonebookPage.js`
- [ ] **TODO:** Implementovat vyhledávání a filtrování
- [ ] **TODO:** Implementovat zobrazení zaměstnanců vs dodavatelů

---

## 🔐 Oprávnění - Logika

```javascript
// Kontrola práva ve frontendu
const hasPhonebookAccess = hasPermission('PHONEBOOK_VIEW');

// Hierarchie oprávnění:
// - Admin role (SUPERADMIN, ADMINISTRATOR) → automaticky mají právo
// - Ostatní uživatelé → pouze pokud mají explicitně přiřazeno PHONEBOOK_VIEW
```

---

## 📝 Poznámky

1. **Pouze čtení:** Telefonní seznam je READ-ONLY, žádné editace
2. **Data z více zdrojů:** Zaměstnanci (tabulka `users`) + Dodavatelé (tabulka `dodavatele`)
3. **Vyhledávání:** Mělo by fungovat "začíná" i "obsahuje" pro všechna pole
4. **Výkon:** Zvážit indexy na `email`, `telefon` pro rychlé vyhledávání

---

## 🚀 Testování

Po implementaci backendu otestovat:

1. Přihlásit se jako **SUPERADMIN** → vidět menu "Telefonní seznam"
2. Přihlásit se jako běžný uživatel **bez** `PHONEBOOK_VIEW` → nevidět menu
3. Přiřadit právo běžnému uživateli → vidět menu

---

## 📞 Kontakt

**Frontend:** Hotovo ✅  
**Backend:** Čeká na implementaci SQL + API

Otázky? Kontaktujte frontend nebo backend tým.
