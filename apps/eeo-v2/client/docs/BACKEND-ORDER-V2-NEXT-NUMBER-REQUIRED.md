# 🚨 KRITICKÉ: Chybějící Backend Endpoint

**Datum:** 30. října 2025  
**Priorita:** 🔴 VYSOKÁ  
**Status:** ❌ MISSING

---

## 📋 Problém

Frontend volá endpoint `/order-v2/next-number`, ale backend tento endpoint **neimplementoval**.

### Chybová zpráva:
```
POST https://eeo.zachranka.cz/api.eeo/order-v2/next-number 404 (Not Found)
```

### Frontend očekává:
```javascript
// Volání z OrderForm25.js
const result = await getNextOrderNumberV2(token, username);
// URL: POST https://eeo.zachranka.cz/api.eeo/order-v2/next-number
```

---

## ✅ Požadovaný Backend Endpoint

### Endpoint:
```
POST /order-v2/next-number
```

### Base URL:
```
https://eeo.zachranka.cz/api.eeo/
```

### Plná URL:
```
https://eeo.zachranka.cz/api.eeo/order-v2/next-number
```

---

## 📥 Request Structure

### Headers:
```json
{
  "Content-Type": "application/json"
}
```

### Body (POST):
```json
{
  "token": "user_auth_token",
  "username": "user_username"
}
```

### Příklad:
```javascript
POST /order-v2/next-number
Content-Type: application/json

{
  "token": "abc123def456",
  "username": "holovsky"
}
```

---

## 📤 Response Structure

### Úspěšná odpověď (200 OK):
```json
{
  "status": "ok",
  "data": {
    "last_used_number": 14,
    "next_number": 15,
    "formatted_last_used": "0014",
    "formatted_next": "0015",
    "ico": "12345678",
    "usek_zkr": "IT",
    "current_year": "2025",
    "last_used_order_string": "O-0014/12345678/2025/IT",
    "next_order_string": "O-0015/12345678/2025/IT",
    "order_number_string": "O-0015/12345678/2025/IT",
    "note": "Toto číslo je pouze pro náhled. Backend přidělí finální číslo při CREATE."
  },
  "meta": {
    "version": "v2",
    "standardized": true,
    "timestamp": "2025-10-30T10:30:00Z"
  }
}
```

### Chybová odpověď (400/401/500):
```json
{
  "status": "error",
  "error_code": "AUTH_ERROR",
  "message": "Neplatný autentizační token",
  "meta": {
    "version": "v2",
    "timestamp": "2025-10-30T10:30:00Z"
  }
}
```

---

## 🔧 Logika Endpointu

### Co endpoint dělá:

1. **Ověří uživatele** pomocí `token` a `username`
2. **Získá údaje o uživateli:**
   - ICO organizace (`ico`)
   - Zkratka úseku (`usek_zkr`)
3. **Vyhledá poslední použité pořadové číslo** pro danou kombinaci:
   ```sql
   SELECT MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(ev_cislo, '-', 2), '/', -1) AS UNSIGNED)) as last_number
   FROM 25a_objednavky
   WHERE ev_cislo LIKE CONCAT('O-%/', ico, '/', YEAR(NOW()), '/', usek_zkr)
     AND aktivni = 1
   ```
4. **Vypočítá další číslo:**
   ```php
   $next_number = ($last_number ?? 0) + 1;
   ```
5. **Formátuje odpověď** podle struktury výše

---

## 📝 Důležité poznámky

### ⚠️ Toto číslo je POUZE pro NÁHLED!

**Frontend používá toto číslo POUZE pro zobrazení v UI!**

**NIKDY se toto číslo neposílá v CREATE/UPDATE requestu!**

Backend **vždy přidělí finální číslo sám** při CREATE operaci (v endpointu `/order-v2/create`).

### Proč?

Mezi načtením náhledového čísla a uložením objednávky může:
- Jiný uživatel vytvořit objednávku se stejným číslem
- Uživatel může změnit středisko/úsek
- Rok se může změnit (např. 23:59:59 31.12.)

Proto backend musí přidělit finální číslo **atomicky při INSERT** operaci!

---

## 🎯 Reference - Starý Endpoint

Starý endpoint `/orders25/next-number` už existuje a funguje:

```
POST /orders25/next-number
```

**Nový endpoint `/order-v2/next-number` by měl mít STEJNOU logiku, jen V2 response strukturu!**

### Implementační tip:
Můžete **použít stejnou logiku** jako u `/orders25/next-number`, jen změnit:
1. URL z `/orders25/next-number` → `/order-v2/next-number`
2. Response strukturu na V2 formát (s `meta` objektem)

---

## 📚 Související Dokumenty

- **MIGRATION-ORDER-V2-API.md** - Přehled migrace na V2 API
- **src/services/apiOrderV2.js** - Frontend implementace
- **src/services/api25orders.js** - Starý endpoint (referenční implementace)

---

## ✅ Checklist pro Backend Team

- [ ] Implementovat endpoint `POST /order-v2/next-number`
- [ ] Použít V2 response strukturu (s `meta`)
- [ ] Otestovat s Postman/cURL
- [ ] Nasadit na test prostředí
- [ ] Otestovat z frontendu
- [ ] Nasadit na produkci
- [ ] Aktualizovat backend dokumentaci

---

## 🧪 Testování

### cURL příkaz:
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/order-v2/next-number \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "username": "YOUR_USERNAME"
  }'
```

### Očekávaný výstup:
```json
{
  "status": "ok",
  "data": {
    "next_number": 15,
    "next_order_string": "O-0015/12345678/2025/IT",
    ...
  },
  "meta": {
    "version": "v2",
    "standardized": true,
    "timestamp": "2025-10-30T..."
  }
}
```

---

## 🔗 Kontakt

**Frontend Developer:** Robert Holovský  
**Potřebuje:** Backend implementaci `/order-v2/next-number`  
**Deadline:** Co nejdříve (blokuje práci s novými objednávkami)

---

**Status: ❌ ČEKÁ NA BACKEND IMPLEMENTACI**
