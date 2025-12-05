# 🔧 Backend Fix: Attachments API - SQL Column Error

**Datum:** 31. října 2025  
**Problém:** SQL chyba v endpointu `/order-v2/attachments/list`  
**Error:** `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'a.velikost_souboru' in 'field list'`

---

## 🐛 Problém

Backend endpoint `/order-v2/attachments/list` (globální seznam příloh) používá **ČESKÝ** název sloupce `velikost_souboru`, ale v databázi **NEEXISTUJE**.

### Chybný SQL dotaz (předpoklad):

```sql
SELECT 
    a.id,
    a.order_id,
    a.original_name,
    a.velikost_souboru,  -- ❌ TENTO SLOUPEC NEEXISTUJE!
    a.mime_type,
    a.created_at,
    a.updated_at
FROM order_attachments a
```

---

## ✅ Řešení

### Varianta 1: Sloupec má **ANGLICKÝ** název

Pokud je sloupec v DB jako `file_size`:

```sql
SELECT 
    a.id,
    a.order_id,
    a.original_name,
    a.file_size,  -- ✅ SPRÁVNÝ NÁZEV
    a.mime_type,
    a.created_at,
    a.updated_at
FROM order_attachments a
```

### Varianta 2: Sloupec má **JINÝ** název

Zkontrolujte skutečnou strukturu tabulky:

```sql
SHOW COLUMNS FROM order_attachments;
-- nebo
DESCRIBE order_attachments;
```

Možné názvy:
- `file_size`
- `size`
- `velikost`
- `velikost_souboru_b` (v bajtech)

---

## 📋 Které endpointy jsou postiženy

### ❌ Nefungují (mají SQL chybu):

1. **POST** `/order-v2/attachments/list` - Globální seznam Order attachments
2. **POST** `/order-v2/invoices/attachments/list` - Globální seznam Invoice attachments

### ✅ Fungují (měly by fungovat):

1. **POST** `/order-v2/{order_id}/attachments/upload` - Upload přílohy
2. **GET** `/order-v2/{order_id}/attachments` - Seznam příloh konkrétní objednávky
3. **GET** `/order-v2/{order_id}/attachments/{attachment_id}` - Download přílohy
4. **DELETE** `/order-v2/{order_id}/attachments/{attachment_id}` - Smazání přílohy
5. **PUT** `/order-v2/{order_id}/attachments/{attachment_id}` - Update metadat
6. **POST** `/order-v2/{order_id}/attachments/verify` - Ověření integrity

---

## 🔍 Diagnostika

### 1. Zjistěte skutečnou strukturu tabulky

```sql
-- Přihlaste se do MySQL/MariaDB
mysql -u username -p

-- Vyberte databázi
USE your_database_name;

-- Zobrazte strukturu tabulky
SHOW CREATE TABLE order_attachments;
```

### 2. Možné struktury

#### Struktura A: Anglické názvy
```sql
CREATE TABLE order_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    original_name VARCHAR(255),
    system_guid VARCHAR(255),
    file_size BIGINT,  -- ← TENTO NÁZEV
    mime_type VARCHAR(100),
    created_at DATETIME,
    updated_at DATETIME
);
```

#### Struktura B: České názvy
```sql
CREATE TABLE order_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    puvodni_nazev VARCHAR(255),
    system_guid VARCHAR(255),
    velikost_souboru BIGINT,  -- ← TENTO NÁZEV
    mime_type VARCHAR(100),
    created_at DATETIME,
    updated_at DATETIME
);
```

#### Struktura C:混合 (mix)
```sql
CREATE TABLE order_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    original_name VARCHAR(255),
    system_guid VARCHAR(255),
    velikost_souboru_b BIGINT,  -- ← MOŽNÁ TENTO NÁZEV (s příponou _b)
    mime_type VARCHAR(100),
    created_at DATETIME,
    updated_at DATETIME
);
```

---

## 🛠️ Oprava v PHP backendu

### Soubor: `/api.eeo/order-v2-endpoints.php` (nebo podobný)

Najděte funkci `handle_list_all_attachments()` nebo podobnou:

```php
function handle_list_all_attachments($conn, $token, $username, $limit, $offset) {
    // ❌ CHYBNÝ KÓD
    $sql = "SELECT 
                a.id,
                a.order_id,
                a.original_name,
                a.system_path,
                a.velikost_souboru,  -- ❌ ŠPATNĚ
                a.mime_type,
                a.created_at,
                a.updated_at,
                a.uploaded_by_user_id,
                o.order_number,
                o.order_name
            FROM order_attachments a
            LEFT JOIN orders o ON a.order_id = o.id
            LIMIT ? OFFSET ?";
    
    // ... rest of code
}
```

**OPRAVIT NA:**

```php
function handle_list_all_attachments($conn, $token, $username, $limit, $offset) {
    // ✅ OPRAVENÝ KÓD
    $sql = "SELECT 
                a.id,
                a.order_id,
                a.original_name,
                a.system_path,
                a.file_size,  -- ✅ SPRÁVNĚ (podle skutečného názvu sloupce)
                a.mime_type,
                a.created_at,
                a.updated_at,
                a.uploaded_by_user_id,
                o.order_number,
                o.order_name
            FROM order_attachments a
            LEFT JOIN orders o ON a.order_id = o.id
            LIMIT ? OFFSET ?";
    
    // ... rest of code
}
```

---

## 📊 Response struktura (po opravě)

Po opravě by endpoint měl vracet:

```json
{
    "status": "success",
    "data": [
        {
            "id": 123,
            "order_id": 456,
            "original_name": "smlouva.pdf",
            "system_path": "/var/www/eeo2025/doc/prilohy/order-v2/2025/10/order_456/file.pdf",
            "file_size": 245678,  // ← TOTO POLE
            "mime_type": "application/pdf",
            "created_at": "2025-10-31 14:30:00",
            "updated_at": null,
            "uploaded_by_user_id": 5,
            "order_number": "OBJ-2025-001",
            "order_name": "Testovací objednávka"
        }
    ],
    "pagination": {
        "total": 245,
        "limit": 100,
        "offset": 0,
        "returned": 1
    },
    "timestamp": "2025-10-31T16:30:00+01:00"
}
```

---

## 🧪 Testování po opravě

### 1. Test v MySQL konzoli

```sql
-- Otestujte SQL dotaz přímo
SELECT 
    a.id,
    a.order_id,
    a.original_name,
    a.file_size,  -- nebo a.velikost_souboru podle skutečného názvu
    a.mime_type
FROM order_attachments a
LIMIT 10;
```

### 2. Test přes API

```bash
# Test endpointu
curl -X POST "https://your-domain.cz/api.eeo/order-v2/attachments/list" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "token": "your_token_here",
    "limit": 10,
    "offset": 0
  }'
```

### 3. Test ve frontendu

Po opravě backendu otestujte tlačítko:
- **🌐 LIST ALL Order Attachments** v `OrderV2TestPanel`

---

## 📝 Checklist pro backend vývojáře

- [ ] Zkontrolovat skutečnou strukturu tabulky `order_attachments`
- [ ] Zjistit přesný název sloupce pro velikost souboru
- [ ] Opravit SQL dotaz v `/order-v2/attachments/list`
- [ ] Opravit SQL dotaz v `/order-v2/invoices/attachments/list` (stejný problém)
- [ ] Otestovat dotaz v MySQL konzoli
- [ ] Otestovat endpoint přes curl/Postman
- [ ] Otestovat ve frontendu (OrderV2TestPanel)
- [ ] Aktualizovat dokumentaci s **skutečnými** názvy sloupců

---

## 🎯 Quick Fix (1 minuta)

```bash
# 1. Zjistit názvy sloupců
mysql -u root -p -e "DESCRIBE your_db.order_attachments;"

# 2. Najít problémový soubor
grep -r "velikost_souboru" /var/www/api.eeo/

# 3. Nahradit všude "velikost_souboru" za "file_size" (nebo správný název)
sed -i 's/a\.velikost_souboru/a.file_size/g' /var/www/api.eeo/order-v2-endpoints.php

# 4. Restartovat PHP (pokud používáte PHP-FPM)
sudo systemctl restart php-fpm
```

---

## 📧 Kontakt

**Frontend:**  
- ✅ Připravený k testování
- ✅ Všechny funkce implementovány podle dokumentace
- ⏳ Čeká na opravu backendu

**Backend:**  
- ❌ SQL chyba v globálních list endpointech
- 🔧 Vyžaduje opravu názvů sloupců v SQL dotazech

---

**Priority:** 🔥 HIGH (blokuje testování Attachments API)  
**Estimate:** ⏱️ 5-10 minut (zjistit názvy sloupců + opravit SQL)

