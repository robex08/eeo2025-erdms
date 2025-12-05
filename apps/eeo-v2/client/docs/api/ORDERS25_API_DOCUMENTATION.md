# ORDERS25 API Dokumentace

> **Verze:** v2025.03_25  
> **Databázové tabulky:** 25a_objednavky, 25a_objednavky_polozky, 25a_objednavky_prilohy  
> **PHP kompatibilita:** 5.6.33+  
> **Datum:** 8. října 2025

## 🔗 Base URL
```
POST /api.eeo/api.php
```

## 🔐 Autentifikace
Všechny endpointy vyžadují:
```json
{
    "token": "YOUR_JWT_TOKEN",
    "username": "your_username"
}
```

---

## 📋 1. LIST - Zobrazení všech objednávek

### Endpoint
```
POST /api.eeo/api.php
```

### Request Body
```json
{
    "endpoint": "orders25/list",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin"
}
```

### Response (Success)
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "cislo_objednavky": "O-001/2025/EEO",
            "dt_objednavky": "2025-10-08",
            "predmet": "Nákup kancelářských potřeb",
            "strediska_kod": "12345",
            "max_cena_s_dph": "50000.00",
            "financovani": "{\"rozpocet\": \"provozni\", \"rok\": 2025}",
            "druh_objednavky_kod": "STANDARD",
            "stav_workflow_kod": "DRAFT",
            "uzivatel_id": 5,
            "uzivatel_akt_id": 5,
            "garant_uzivatel_id": null,
            "objednatel_id": null,
            "schvalovatel_id": null,
            "prikazce_id": null,
            "dt_schvaleni": null,
            "schvaleni_komentar": null,
            "dodavatel_id": null,
            "dodavatel_nazev": "ABC s.r.o.",
            "dodavatel_adresa": "Praha 1",
            "dodavatel_ico": "12345678",
            "dodavatel_dic": "CZ12345678",
            "dodavatel_zastoupeny": "Jan Novák",
            "dodavatel_kontakt_jmeno": "Pavel Dvořák",
            "dodavatel_kontakt_email": "pavel@abc.cz",
            "dodavatel_kontakt_telefon": "123456789",
            "dt_predpokladany_termin_dodani": "2025-11-08",
            "misto_dodani": "Sklad Praha",
            "zaruka": "24 měsíců",
            "registr_iddt": null,
            "poznamka": "Poznámka k objednávce",
            "aktivni": 1,
            "dt_vytvoreni": "2025-10-08 10:30:45",
            "dt_aktualizace": "2025-10-08 10:30:45"
        }
    ]
}
```

### Response (Error)
```json
{
    "err": "Neplatný nebo chybějící token"
}
```

---

## 🔍 2. BY-ID - Detail objednávky podle ID

### Request Body
```json
{
    "endpoint": "orders25/by-id",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "id": 1
}
```

### Response (Success)
```json
{
    "status": "ok",
    "data": {
        "id": 1,
        "cislo_objednavky": "O-001/2025/EEO",
        // ... (stejná struktura jako u LIST)
    }
}
```

### Response (Error)
```json
{
    "err": "Objednávka nebyla nalezena"
}
```

---

## 👤 3. BY-USER - Objednávky podle uživatele

### Request Body
```json
{
    "endpoint": "orders25/by-user",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "user_id": 5
}
```

### Response (Success)
```json
{
    "status": "ok",
    "data": [
        // Array objednávek pro daného uživatele
    ]
}
```

---

## ➕ 4. INSERT - Vytvoření nové objednávky

### Request Body
```json
{
    "endpoint": "orders25/insert",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "cislo_objednavky": "O-002/2025/EEO",
    "dt_objednavky": "2025-10-08",
    "predmet": "Nákup IT vybavení",
    "strediska_kod": "12345",
    "max_cena_s_dph": "100000.00",
    "financovani": "{\"rozpocet\": \"investicni\", \"rok\": 2025}",
    "druh_objednavky_kod": "IT",
    "stav_workflow_kod": "DRAFT",
    "dodavatel_nazev": "IT Company s.r.o.",
    "dodavatel_ico": "87654321",
    "poznamka": "Urgentní objednávka"
}
```

### Povinné parametry
- `predmet` - předmět objednávky
- `strediska_kod` - kód střediska
- `max_cena_s_dph` - maximální cena s DPH

### Volitelné parametry
Všechny ostatní parametry jsou volitelné. Systém automaticky nastaví:
- `uzivatel_id` - podle přihlášeného uživatele
- `uzivatel_akt_id` - podle přihlášeného uživatele  
- `aktivni` - 1
- `stav_workflow_kod` - "DRAFT" (pokud není uvedeno)
- `dt_vytvoreni` - aktuální čas

### Response (Success)
```json
{
    "status": "ok",
    "message": "Objednávka byla úspěšně vytvořena",
    "inserted_id": 15
}
```

---

## 📝 5. UPDATE - Aktualizace objednávky

### Request Body
```json
{
    "endpoint": "orders25/update",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "id": 1,
    "predmet": "Aktualizovaný předmět",
    "max_cena_s_dph": "120000.00",
    "stav_workflow_kod": "APPROVED",
    "poznamka": "Upravená poznámka"
}
```

### Povinné parametry
- `id` - ID objednávky k aktualizaci

### Response (Success)
```json
{
    "status": "ok",
    "message": "Objednávka byla úspěšně aktualizována"
}
```

---

## 🗑️ 6. DELETE - Smazání objednávky

### Request Body
```json
{
    "endpoint": "orders25/delete",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "id": 1
}
```

### Response (Success)
```json
{
    "status": "ok",
    "message": "Objednávka byla úspěšně smazána",
    "deleted_files": 3
}
```

⚠️ **POZOR:** DELETE operace smaže:
1. Všechny přílohy objednávky z databáze
2. Všechny položky objednávky z databáze
3. Samotnou objednávku z databáze
4. Všechny soubory příloh z disku

---

## 🔢 7. NEXT-NUMBER - Generování dalšího čísla objednávky

### Request Body
```json
{
    "endpoint": "orders25/next-number",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin"
}
```

### Response (Success)
```json
{
    "status": "ok",
    "data": {
        "next_number": "O-015/2025/EEO",
        "year": 2025,
        "sequence": 15,
        "org_kod": "EEO"
    }
}
```

---

## ✅ 8. CHECK-NUMBER - Kontrola dostupnosti čísla objednávky

### Request Body
```json
{
    "endpoint": "orders25/check-number",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "cislo_objednavky": "O-020/2025/EEO",
    "suggest": true
}
```

### Parametry
- `cislo_objednavky` - číslo k ověření
- `suggest` (volitelné) - pokud true a číslo není dostupné, vrátí návrh nového čísla

### Response (Available)
```json
{
    "status": "ok",
    "data": {
        "cislo_objednavky": "O-020/2025/EEO",
        "available": true,
        "can_use": true
    }
}
```

### Response (Not Available with Suggestion)
```json
{
    "status": "ok",
    "data": {
        "cislo_objednavky": "O-005/2025/EEO",
        "available": false,
        "can_use": false,
        "existing_order_id": 3,
        "suggestion": "O-015/2025/EEO"
    }
}
```

---

## 📦 9. PARTIAL-INSERT - Částečné vytvoření objednávky

### Použití
Pro workflow, kde uživatel vyplňuje objednávku postupně přes více kroků.

### Request Body
```json
{
    "endpoint": "orders25/partial-insert",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "predmet": "Částečně vyplněná objednávka",
    "strediska_kod": "12345",
    "auto_assign_number": true
}
```

### Speciální parametry
- `auto_assign_number` - pokud true, systém automaticky přiřadí číslo objednávky
- `cislo_objednavky` - můžete specifikovat vlastní číslo (pokud není nastaveno auto_assign_number)

### Validace
- Kontroluje se, že číslo objednávky není již použito
- Automaticky nastavuje povinné hodnoty

### Response (Success)
```json
{
    "status": "ok",
    "message": "Objednávka byla úspěšně vytvořena",
    "inserted_id": 16,
    "assigned_number": "O-016/2025/EEO"
}
```

---

## 🔄 10. PARTIAL-UPDATE - Částečná aktualizace objednávky

### Request Body
```json
{
    "endpoint": "orders25/partial-update",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "username": "admin",
    "id": 16,
    "dodavatel_nazev": "Nový dodavatel",
    "dodavatel_ico": "99887766",
    "dt_predpokladany_termin_dodani": "2025-12-15"
}
```

### Vlastnosti
- Aktualizuje pouze poskytnuté parametry
- Ostatní hodnoty zůstávají beze změny
- Automaticky aktualizuje `dt_aktualizace` a `uzivatel_akt_id`

### Response (Success)
```json
{
    "status": "ok",
    "message": "Objednávka byla úspěšně aktualizována",
    "updated_fields": ["dodavatel_nazev", "dodavatel_ico", "dt_predpokladany_termin_dodani"]
}
```

---

## 🚫 HTTP Status Codes

| Kód | Význam | Kdy se objevuje |
|-----|---------|-----------------|
| **200** | OK | Úspěšná operace |
| **400** | Bad Request | Chybí povinné parametry |
| **401** | Unauthorized | Neplatný token nebo username |
| **403** | Forbidden | Uživatel nemá oprávnění |
| **404** | Not Found | Objednávka nebyla nalezena |
| **405** | Method Not Allowed | Použita jiná HTTP metoda než POST |
| **409** | Conflict | Číslo objednávky už existuje |
| **500** | Internal Server Error | Chyba serveru/databáze |

---

## 🗂️ Databázová struktura

### Tabulka: 25a_objednavky
```sql
CREATE TABLE `25a_objednavky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cislo_objednavky` varchar(50) DEFAULT NULL,
  `dt_objednavky` date DEFAULT NULL,
  `predmet` text,
  `strediska_kod` varchar(20) DEFAULT NULL,
  `max_cena_s_dph` decimal(15,2) DEFAULT NULL,
  `financovani` text, -- JSON format
  `druh_objednavky_kod` varchar(50) DEFAULT NULL,
  `stav_workflow_kod` varchar(50) DEFAULT 'DRAFT',
  `uzivatel_id` int(11) UNSIGNED DEFAULT NULL,
  `uzivatel_akt_id` int(11) UNSIGNED DEFAULT NULL,
  `garant_uzivatel_id` int(11) UNSIGNED DEFAULT NULL,
  `objednatel_id` int(11) UNSIGNED DEFAULT NULL,
  `schvalovatel_id` int(11) UNSIGNED DEFAULT NULL,
  `prikazce_id` int(11) UNSIGNED DEFAULT NULL,
  `dt_schvaleni` datetime DEFAULT NULL,
  `schvaleni_komentar` text,
  `dodavatel_id` int(11) DEFAULT NULL,
  `dodavatel_nazev` varchar(255) DEFAULT NULL,
  `dodavatel_adresa` text,
  `dodavatel_ico` varchar(20) DEFAULT NULL,
  `dodavatel_dic` varchar(30) DEFAULT NULL,
  `dodavatel_zastoupeny` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_jmeno` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_email` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_telefon` varchar(50) DEFAULT NULL,
  `dt_predpokladany_termin_dodani` date DEFAULT NULL,
  `misto_dodani` text,
  `zaruka` varchar(255) DEFAULT NULL,
  `registr_iddt` varchar(50) DEFAULT NULL,
  `poznamka` text,
  `aktivni` tinyint(1) DEFAULT '1',
  `dt_vytvoreni` timestamp DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_uzivatel` (`uzivatel_id`),
  KEY `fk_uzivatel_akt` (`uzivatel_akt_id`),
  KEY `fk_garant` (`garant_uzivatel_id`),
  KEY `fk_objednatel` (`objednatel_id`),
  KEY `fk_schvalovatel` (`schvalovatel_id`),
  KEY `fk_prikazce` (`prikazce_id`),
  CONSTRAINT `fk_uzivatel` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_uzivatel_akt` FOREIGN KEY (`uzivatel_akt_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_garant` FOREIGN KEY (`garant_uzivatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_objednatel` FOREIGN KEY (`objednatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_schvalovatel` FOREIGN KEY (`schvalovatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_prikazce` FOREIGN KEY (`prikazce_id`) REFERENCES `25_uzivatele` (`id`)
);
```

---

## 💡 Tipy pro frontend vývojáře

### 1. Workflow pro vytváření objednávky
```javascript
// Krok 1: Získej nové číslo objednávky
const numberResponse = await fetch('/api.eeo/api.php', {
    method: 'POST',
    body: JSON.stringify({
        endpoint: 'orders25/next-number',
        token: userToken,
        username: username
    })
});

// Krok 2: Vytvoř částečnou objednávku
const createResponse = await fetch('/api.eeo/api.php', {
    method: 'POST', 
    body: JSON.stringify({
        endpoint: 'orders25/partial-insert',
        token: userToken,
        username: username,
        cislo_objednavky: numberResponse.data.next_number,
        predmet: 'Základní info',
        strediska_kod: '12345'
    })
});

// Krok 3: Postupně aktualizuj další údaje
const updateResponse = await fetch('/api.eeo/api.php', {
    method: 'POST',
    body: JSON.stringify({
        endpoint: 'orders25/partial-update', 
        token: userToken,
        username: username,
        id: createResponse.inserted_id,
        dodavatel_nazev: 'Kompletní dodavatel',
        max_cena_s_dph: '50000.00'
    })
});
```

### 2. Kontrola dostupnosti čísla
```javascript
const checkNumber = async (orderNumber) => {
    const response = await fetch('/api.eeo/api.php', {
        method: 'POST',
        body: JSON.stringify({
            endpoint: 'orders25/check-number',
            token: userToken,
            username: username,
            cislo_objednavky: orderNumber,
            suggest: true
        })
    });
    
    if (!response.data.available) {
        alert(`Číslo ${orderNumber} není dostupné. Navrhujeme: ${response.data.suggestion}`);
    }
};
```

### 3. Error handling
```javascript
const handleApiResponse = async (response) => {
    const data = await response.json();
    
    if (data.err) {
        switch (response.status) {
            case 401:
                // Redirect to login
                window.location.href = '/login';
                break;
            case 404:
                alert('Objednávka nebyla nalezena');
                break;
            case 409:
                alert('Číslo objednávky již existuje');
                break;
            default:
                alert(`Chyba: ${data.err}`);
        }
        return null;
    }
    
    return data;
};
```

---

## 📞 Podpora

V případě problémů kontaktujte:
- **API Issues:** Zkontrolujte error logy serveru
- **Database Issues:** Ověřte foreign key constraints  
- **Authentication:** Zkontrolujte platnost JWT tokenu

**Verze dokumentace:** 1.0  
**Poslední aktualizace:** 8. října 2025