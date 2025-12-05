# 🔴 BE POŽADAVEK: Hard Delete pro odebrání uživatele z pokladny

## Datum: 8. listopadu 2025
## Priorita: HIGH

---

## 📋 Problém

Endpoint `/cashbox-unassign-user` momentálně dělá **soft delete** (UPDATE platne_do), ale tlačítko "Odebrat" v UI by mělo dělat **hard delete** (DELETE FROM).

### Současné chování:
```sql
UPDATE 25a_pokladny_uzivatele 
SET platne_do = '2025-11-08' 
WHERE id = 123;
```

### Požadované chování:
```sql
DELETE FROM 25a_pokladny_uzivatele 
WHERE id = 123;
```

---

## 🎯 Požadavek

Upravit endpoint `/cashbox-unassign-user`, aby dělal **hard delete** místo soft delete.

### Důvody:
1. **Tlačítko "Odebrat"** = skutečné smazání přiřazení
2. **Editace platnosti** (datum od/do) = soft delete (UPDATE platne_do)
3. **Dvě různé operace** v UI:
   - Červené tlačítko "Odebrat" → smazat záznam
   - Tlačítko "Přiřazená" (editace) → změnit platne_od/platne_do

---

## 📡 Endpoint: `/cashbox-unassign-user`

### Request:
```json
POST https://eeo.zachranka.cz/api.eeo/cashbox-unassign-user

{
  "token": "xxx",
  "username": "admin",
  "prirazeni_id": 123
}
```

### Změna v BE:
```sql
-- STARÝ kód (soft delete):
UPDATE 25a_pokladny_uzivatele 
SET platne_do = ? 
WHERE id = ?;

-- NOVÝ kód (hard delete):
DELETE FROM 25a_pokladny_uzivatele 
WHERE id = ?;
```

### Response (očekávaná):
```json
{
  "status": "ok",
  "data": {
    "message": "Uživatel byl odebrán z pokladny",
    "prirazeni_id": "123",
    "affected_rows": 1
  }
}
```

---

## 🔐 Oprávnění (budoucí)

V budoucnu může být rozlišení podle role:

### Admin:
- Může používat **hard delete** (skutečné smazání)
- Endpoint: `/cashbox-unassign-user` → DELETE FROM

### Non-admin (pokud budou mít přístup):
- Může používat jen **soft delete** (nastavení platne_do)
- Endpoint: `/cashbox-update-user-validity` → UPDATE platne_do

---

## 🧪 Testovací scénář

1. Přiřadit uživatele k pokladně (prirazeni_id = 5)
2. Kliknout na červené tlačítko "Odebrat"
3. Zkontrolovat DB:
   ```sql
   SELECT * FROM 25a_pokladny_uzivatele WHERE id = 5;
   -- Očekávaný výsledek: 0 rows (záznam smazán)
   ```

---

## 📝 Poznámky

- Frontend je připravený (kontroluje `affected_rows`)
- Frontend zobrazuje jen uživatele s `platne_do = NULL` nebo `platne_do > dnes`
- Po smazání se uživatel okamžitě zmizí z UI po refresh

---

## ✅ Kontrolní seznam

- [ ] Změnit SQL v `/cashbox-unassign-user` z UPDATE na DELETE
- [ ] Otestovat s prirazeni_id
- [ ] Zkontrolovat affected_rows (mělo by být 1)
- [ ] Nasadit na produkci
