# PHP to Node.js API Migration Plan

**Datum:** 5. prosince 2025  
**Autor:** Technická dokumentace ERDMS  
**Účel:** Kompletní migrace PHP EEO API na Node.js se zachováním 100% response kompatibility

---

## 📋 Obsah

1. [Executive Summary](#executive-summary)
2. [Současný stav PHP API](#současný-stav-php-api)
3. [Inventář všech endpointů](#inventář-všech-endpointů)
4. [Migrační strategie](#migrační-strategie)
5. [Technická architektura](#technická-architektura)
6. [Response Compatibility Layer](#response-compatibility-layer)
7. [Implementační plán](#implementační-plán)
8. [Testing Strategy](#testing-strategy)
9. [Deployment & Rollback](#deployment--rollback)

---

## Executive Summary

### Důvod migrace

**Problémy současného PHP API:**
- 69 PHP souborů v legacy struktuře
- Smíšená architektura (procedurální + OOP)
- Těžko testovatelné (žádné unit testy)
- Složitá autentizace (custom token system)
- Omezená podpora pro async operace
- Komplikované deployment (PHP-FPM, Apache)

**Výhody Node.js migrace:**
- Jednotný jazyk (JavaScript) pro frontend i backend
- Moderní async/await patterns
- Jednodušší deployment (systemd, PM2)
- Lepší integrace s Entra ID
- Snadnější testování (Jest, Supertest)
- TypeScript support pro type safety

### 🎯 **KRITICKÉ POŽADAVKY**

✅ **100% Response Compatibility** - Každý endpoint musí vracet **identickou** strukturu JSON  
✅ **Žádné breaking changes** - Frontend nesmí poznat rozdíl  
✅ **Postupná migrace** - Možnost běžet PHP i Node.js paralelně  
✅ **Git záloha** - Před každou změnou commit + tag  
✅ **Testing** - Automatické testy porovnávající PHP vs Node.js responses  

---

## Současný stav PHP API

### Struktura souborů

```
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/
├── api.php                          # Hlavní routing (4673 řádků)
├── v2025.03_25/
│   ├── lib/
│   │   ├── handlers.php             # Business logika (7149 řádků)
│   │   ├── dbconfig.php             # DB konfigurace
│   │   └── queries.php              # SQL dotazy
│   └── data/
│       └── namedays.json            # Jmeniny data
└── uploads/                         # File uploads
```

### Database Schema

**Hlavní tabulky:**
- `25_uzivatele` - Uživatelé (25+ custom polí)
- `25_objednavky` - Objednávky
- `25_faktury` - Faktury
- `25_dodavatele` - Dodavatelé
- `25_lokality` - Lokality
- `25_pozice` - Pozice
- `25_organizace` - Organizace
- `25_role` - Role
- `25_prava` - Práva
- `25_stavy` - Stavy
- `25_useky` - Úseky
- `25_hierarchie` - Hierarchie
- `25_zastupovani` - Zástupování
- `25_sablony` - Šablony
- `25_prilohy` - Přílohy
- `25_notifikace` - Notifikace
- `25_todo` - Todo poznámky
- `25_chat_konverzace` - Chat
- `25_chat_zpravy` - Chat zprávy

### Autentizace

**Token formát:**
```php
$token = base64_encode($username . '|' . time());
```

**Validace:**
```php
$auth_result = verify_token_v2($username, $token);
if (!$auth_result) {
    http_response_code(401);
    echo json_encode(['err' => 'Nepřihlášen']);
    exit;
}
```

---

## Inventář všech endpointů

### 📊 Statistika

- **Celkem endpointů:** ~180
- **POST endpoints:** ~170
- **GET endpoints:** ~10
- **Vyžadující auth:** ~175
- **Public endpoints:** ~5

### Kategorie endpointů

#### 1. **Authentication & User Management** (15 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `login` | POST | ❌ | Přihlášení uživatele | P0 |
| `entra-login` | POST | ❌ | Entra bridge (nový) | P0 |
| `user/detail` | POST | ✅ | Detail uživatele | P0 |
| `user/profile` | POST | ✅ | Profil aktuálního uživatele | P1 |
| `user/settings` | POST | ✅ | Nastavení uživatele | P1 |
| `user/change-password` | POST | ✅ | Změna hesla | P1 |
| `user/active` | POST | ✅ | Aktivní uživatelé | P1 |
| `user/update-activity` | POST | ✅ | Update last activity | P2 |
| `users/list` | POST | ✅ | Seznam všech uživatelů | P0 |
| `users/create` | POST | ✅ | Vytvoření uživatele | P1 |
| `users/update` | POST | ✅ | Update uživatele | P1 |
| `users/partial-update` | POST | ✅ | Částečný update | P1 |
| `users/deactivate` | POST | ✅ | Deaktivace uživatele | P1 |
| `users/approvers` | POST | ✅ | Seznam schvalovatelů | P2 |

**Request příklad (`login`):**
```json
{
  "username": "jan.novak",
  "password": "heslo123"
}
```

**Response příklad (`login`):**
```json
{
  "id": 42,
  "username": "jan.novak",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "email": "jan.novak@zachranka.cz",
  "telefon": "+420 123 456 789",
  "pozice": "Vedoucí IT",
  "oddeleni": "IT oddělení",
  "token": "amFuLm5vdmFrfDE3MzM0MDAwMDA=",
  "aktivni": 1,
  "created_at": "2024-01-15 10:30:00"
}
```

#### 2. **Orders (Objednávky)** (35 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `orders/list` | POST | ✅ | Seznam objednávek (deprecated) | P0 |
| `orders/list-raw` | POST | ✅ | Raw data bez enrichment | P0 |
| `orders/list-enriched` | POST | ✅ | S JOIN daty | P0 |
| `order/detail` | POST | ✅ | Detail objednávky | P0 |
| `order/create` | POST | ✅ | Vytvoření objednávky | P0 |
| `order/update` | POST | ✅ | Update objednávky | P0 |
| `order/check-number` | POST | ✅ | Kontrola čísla objednávky | P1 |
| `orders/next-number` | POST | ✅ | Další volné číslo | P1 |
| `orders25/list` | POST | ✅ | Orders v2 - seznam | P0 |
| `orders25/by-id` | POST | ✅ | Detail podle ID | P0 |
| `orders25/by-user` | POST | ✅ | Orders uživatele | P1 |
| `orders25/insert` | POST | ✅ | Vytvoření nové | P0 |
| `orders25/update` | POST | ✅ | Update existující | P0 |
| `orders25/delete` | POST | ✅ | Hard delete | P2 |
| `orders25/soft-delete` | POST | ✅ | Soft delete (deaktivace) | P1 |
| `orders25/restore` | POST | ✅ | Obnovení smazané | P2 |
| `orders25/next-number` | POST | ✅ | Generování čísla | P1 |
| `orders25/check-number` | POST | ✅ | Kontrola dostupnosti | P1 |
| `orders25/partial-insert` | POST | ✅ | Částečné vytvoření | P1 |
| `orders25/partial-update` | POST | ✅ | Částečný update | P1 |
| `orders25/status-by-id-and-user` | POST | ✅ | Stav pro uživatele | P1 |
| `orders25/select-for-edit` | POST | ✅ | Načtení pro editaci | P0 |
| `orders25/lock` | POST | ✅ | Zamknutí objednávky | P1 |
| `orders25/unlock` | POST | ✅ | Odemknutí | P1 |
| `orders25/count-by-user` | POST | ✅ | Počet orders uživatele | P2 |
| `orders25/send-to-supplier` | POST | ✅ | Odeslání dodavateli | P1 |
| `orders25/cancel-order` | POST | ✅ | Storno objednávky | P1 |
| `orders25/confirm-acceptance` | POST | ✅ | Potvrzení převzetí | P1 |
| `orders25/add-invoice` | POST | ✅ | Přidání faktury | P1 |
| `orders25/complete-order` | POST | ✅ | Dokončení objednávky | P1 |
| `order-v2/list` | POST | ✅ | Order V2 listing | P0 |
| `order-v2/list-enriched` | POST | ✅ | Order V2 enriched | P0 |
| `order-v2/create` | POST | ✅ | Order V2 create | P0 |
| `order-v2/next-number` | POST | ✅ | Order V2 next number | P1 |
| `order-v2/check-number` | POST | ✅ | Order V2 check number | P1 |

**Request příklad (`orders25/list`):**
```json
{
  "username": "jan.novak",
  "token": "amFuLm5vdmFrfDE3MzM0MDAwMDA=",
  "filters": {
    "stav": "NEW",
    "rok": 2025,
    "useky": ["01", "02"]
  },
  "limit": 100,
  "offset": 0,
  "sort": {
    "field": "datum_vytvoreni",
    "order": "DESC"
  }
}
```

**Response příklad (`orders25/list`):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1523,
      "cislo_objednavky": "OBJ-2025-001523",
      "nazev": "Nákup kancelářských potřeb",
      "popis": "Tiskárna, papíry, tonery",
      "castka": 25000.50,
      "mena": "CZK",
      "stav": "NEW",
      "stav_nazev": "Nová",
      "vytvoril_user_id": 42,
      "vytvoril_username": "jan.novak",
      "vytvoril_jmeno": "Jan",
      "vytvoril_prijmeni": "Novák",
      "dodavatel_id": 15,
      "dodavatel_nazev": "ABC Supplies s.r.o.",
      "dodavatel_ico": "12345678",
      "usek_id": 1,
      "usek_nazev": "IT oddělení",
      "usek_zkratka": "IT",
      "datum_vytvoreni": "2025-12-01 10:30:00",
      "datum_upravy": "2025-12-02 14:15:00",
      "poznamka": "Urgentní dodávka",
      "aktivni": 1
    }
  ],
  "total": 1523,
  "limit": 100,
  "offset": 0
}
```

#### 3. **Invoices (Faktury)** (15 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `invoices25/list` | POST | ✅ | Seznam faktur | P0 |
| `invoices25/by-order` | POST | ✅ | Faktury k objednávce | P0 |
| `invoices25/by-id` | POST | ✅ | Detail faktury | P0 |
| `invoices25/create` | POST | ✅ | Vytvoření faktury | P0 |
| `invoices25/create-with-attachment` | POST | ✅ | Create + příloha | P1 |
| `invoices25/update` | POST | ✅ | Update faktury | P0 |
| `invoices25/delete` | POST | ✅ | Smazání faktury | P1 |
| `invoices25/attachments/by-invoice` | POST | ✅ | Přílohy faktury | P1 |
| `invoices25/attachments/by-order` | POST | ✅ | Přílohy k objednávce | P1 |
| `invoices25/attachments/by-id` | POST | ✅ | Příloha podle ID | P1 |
| `invoices25/attachments/upload` | POST | ✅ | Nahrání přílohy | P0 |
| `invoices25/attachments/download` | GET | ✅ | Stažení přílohy | P0 |
| `invoices25/attachments/update` | POST | ✅ | Update přílohy | P2 |
| `invoices25/attachments/delete` | POST | ✅ | Smazání přílohy | P1 |

**Response příklad (`invoices25/by-order`):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 856,
      "objednavka_id": 1523,
      "cislo_faktury": "FA-2025-123456",
      "dodavatel_id": 15,
      "dodavatel_nazev": "ABC Supplies s.r.o.",
      "castka": 25000.50,
      "castka_bez_dph": 20661.16,
      "dph_sazba": 21,
      "dph_castka": 4339.34,
      "mena": "CZK",
      "datum_vystaveni": "2025-12-10",
      "datum_splatnosti": "2025-12-24",
      "datum_zdanitelneho_plneni": "2025-12-10",
      "variabilni_symbol": "1523",
      "cislo_uctu": "123456789/0100",
      "poznamka": "",
      "stav": "ISSUED",
      "stav_nazev": "Vystavená",
      "aktivni": 1,
      "prilohy_count": 1,
      "vytvoril_user_id": 42,
      "datum_vytvoreni": "2025-12-10 11:00:00",
      "datum_upravy": "2025-12-10 11:00:00"
    }
  ],
  "total": 1
}
```

#### 4. **Suppliers (Dodavatelé)** (10 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `dodavatele/list` | POST | ✅ | Seznam dodavatelů | P0 |
| `dodavatele/detail` | POST | ✅ | Detail dodavatele | P0 |
| `dodavatele/search` | POST | ✅ | Hledání dodavatelů | P1 |
| `dodavatele/search-ico` | POST | ✅ | Hledání podle IČO | P1 |
| `dodavatele/search-nazev` | POST | ✅ | Hledání podle názvu | P1 |
| `dodavatele/contacts` | POST | ✅ | Kontakty dodavatele | P1 |
| `dodavatele/create` | POST | ✅ | Vytvoření dodavatele | P0 |
| `dodavatele/update` | POST | ✅ | Update dodavatele | P0 |
| `dodavatele/update-by-ico` | POST | ✅ | Update podle IČO | P2 |
| `dodavatele/delete` | POST | ✅ | Smazání dodavatele | P1 |

**Response příklad (`dodavatele/list`):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 15,
      "nazev": "ABC Supplies s.r.o.",
      "ico": "12345678",
      "dic": "CZ12345678",
      "ulice": "Hlavní 123",
      "mesto": "Praha",
      "psc": "11000",
      "email": "info@abcsupplies.cz",
      "telefon": "+420 222 333 444",
      "web": "https://abcsupplies.cz",
      "cislo_uctu": "123456789/0100",
      "poznamka": "",
      "aktivni": 1,
      "datum_vytvoreni": "2024-01-10 09:00:00",
      "datum_upravy": "2025-11-15 14:30:00"
    }
  ],
  "total": 156
}
```

#### 5. **Číselníky (Codebooks)** (40+ endpointů)

##### Lokality (5 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `lokality/list` | POST | ✅ | Seznam lokalit | P1 |
| `lokality/detail` | POST | ✅ | Detail lokality | P1 |
| `lokality/create` | POST | ✅ | Vytvoření lokality | P2 |
| `lokality/update` | POST | ✅ | Update lokality | P2 |
| `lokality/delete` | POST | ✅ | Smazání lokality | P2 |

##### Pozice (5 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `pozice/list` | POST | ✅ | Seznam pozic | P1 |
| `pozice/detail` | POST | ✅ | Detail pozice | P1 |
| `pozice/create` | POST | ✅ | Vytvoření pozice | P2 |
| `pozice/update` | POST | ✅ | Update pozice | P2 |
| `pozice/delete` | POST | ✅ | Smazání pozice | P2 |

##### Organizace (5 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `organizace/list` | POST | ✅ | Seznam organizací | P1 |
| `organizace/detail` | POST | ✅ | Detail organizace | P1 |
| `organizace/create` | POST | ✅ | Vytvoření organizace | P2 |
| `organizace/update` | POST | ✅ | Update organizace | P2 |
| `organizace/delete` | POST | ✅ | Smazání organizace | P2 |

##### Úseky (8 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `useky/list` | POST | ✅ | Seznam úseků | P0 |
| `useky/list_hierarchy` | POST | ✅ | Hierarchický seznam | P1 |
| `useky/detail` | POST | ✅ | Detail úseku | P0 |
| `useky/by-zkr` | POST | ✅ | Úsek podle zkratky | P1 |
| `useky/create` | POST | ✅ | Vytvoření úseku | P2 |
| `useky/update` | POST | ✅ | Update úseku | P2 |
| `useky/delete` | POST | ✅ | Smazání úseku | P2 |

##### Role a práva (12 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `role/list` | POST | ✅ | Seznam rolí | P1 |
| `role/detail` | POST | ✅ | Detail role | P1 |
| `ciselniky/role/list` | POST | ✅ | Role v2 | P1 |
| `ciselniky/role/list-enriched` | POST | ✅ | Role s právy | P1 |
| `ciselniky/role/by-id` | POST | ✅ | Role podle ID | P1 |
| `ciselniky/role/insert` | POST | ✅ | Vytvoření role | P2 |
| `ciselniky/role/update` | POST | ✅ | Update role | P2 |
| `ciselniky/role/assign-pravo` | POST | ✅ | Přiřazení práva | P2 |
| `ciselniky/role/remove-pravo` | POST | ✅ | Odebrání práva | P2 |
| `ciselniky/role/cleanup-duplicates` | POST | ✅ | Cleanup duplicit | P3 |
| `ciselniky/role/bulk-update-prava` | POST | ✅ | Hromadný update | P3 |
| `prava/list` | POST | ✅ | Seznam práv | P1 |

##### Stavy (5 endpointů)
| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `stavy/list` | POST | ✅ | Seznam stavů | P0 |
| `states25/list` | POST | ✅ | Stavy v2 | P0 |
| `states25/by-id` | POST | ✅ | Stav podle ID | P1 |
| `states25/by-type-and-code` | POST | ✅ | Stav podle typu a kódu | P1 |
| `states25/by-parent-code` | POST | ✅ | Child stavy | P1 |

#### 6. **Hierarchie & Zástupování** (9 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `hierarchy/subordinates` | POST | ✅ | Podřízení uživatelé | P1 |
| `hierarchy/superiors` | POST | ✅ | Nadřízení uživatelé | P1 |
| `hierarchy/add` | POST | ✅ | Přidání do hierarchie | P2 |
| `hierarchy/remove` | POST | ✅ | Odebrání z hierarchie | P2 |
| `substitution/list` | POST | ✅ | Seznam zástupování | P1 |
| `substitution/create` | POST | ✅ | Vytvoření zástupování | P1 |
| `substitution/update` | POST | ✅ | Update zástupování | P1 |
| `substitution/deactivate` | POST | ✅ | Deaktivace zástupování | P1 |
| `substitution/current` | POST | ✅ | Aktuální zástupy | P1 |

#### 7. **Přílohy & Attachments** (20 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `attachments/upload` | POST | ✅ | Nahrání přílohy | P0 |
| `attachments/list` | POST | ✅ | Seznam příloh | P0 |
| `attachments/verify` | POST | ✅ | Verifikace přílohy | P1 |
| `attachments/download` | GET | ✅ | Stažení přílohy | P0 |
| `attachments/delete` | POST | ✅ | Smazání přílohy | P1 |
| `attachments/deactivate` | POST | ✅ | Deaktivace přílohy | P1 |
| `attachments/update` | POST | ✅ | Update přílohy | P2 |
| `orders25/attachments/upload` | POST | ✅ | Upload k objednávce | P0 |
| `orders25/attachments/list` | POST | ✅ | Přílohy objednávky | P0 |
| `orders25/attachments/download` | GET | ✅ | Download přílohy | P0 |
| `orders25/attachments/delete` | POST | ✅ | Delete přílohy | P1 |
| `orders25/attachments/update` | POST | ✅ | Update přílohy | P2 |
| `orders25/attachments/verify` | POST | ✅ | Verifikace přílohy | P2 |
| `invoices25/attachments/by-invoice` | POST | ✅ | Přílohy faktury | P1 |
| `invoices25/attachments/by-order` | POST | ✅ | Přílohy dle objednávky | P1 |
| `invoices25/attachments/by-id` | POST | ✅ | Příloha podle ID | P1 |
| `invoices25/attachments/upload` | POST | ✅ | Upload faktury | P0 |
| `invoices25/attachments/download` | GET | ✅ | Download faktury | P0 |
| `invoices25/attachments/update` | POST | ✅ | Update přílohy faktury | P2 |
| `invoices25/attachments/delete` | POST | ✅ | Delete přílohy faktury | P1 |

#### 8. **Notifikace** (15 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `notifications/list` | POST | ✅ | Seznam notifikací | P1 |
| `notifications/unread-count` | POST | ✅ | Počet nepřečtených | P1 |
| `notifications/mark-read` | POST | ✅ | Označit jako přečtené | P1 |
| `notifications/mark-all-read` | POST | ✅ | Vše jako přečtené | P1 |
| `notifications/create` | POST | ✅ | Vytvoření notifikace | P1 |
| `notifications/dismiss` | POST | ✅ | Dismiss notifikace | P2 |
| `notifications/dismiss-all` | POST | ✅ | Dismiss všech | P2 |
| `notifications/restore` | POST | ✅ | Obnovení notifikace | P2 |
| `notifications/delete` | POST | ✅ | Smazání notifikace | P2 |
| `notifications/delete-all` | POST | ✅ | Smazání všech | P2 |
| `notifications/preview` | POST | ✅ | Preview notifikace | P2 |
| `notifications/templates` | POST | ✅ | Šablony notifikací | P2 |
| `notifications/send-bulk` | POST | ✅ | Hromadné odeslání | P2 |

#### 9. **Todo Notes** (8 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `todonotes/load` | POST | ✅ | Načtení todo | P2 |
| `todonotes/save` | POST | ✅ | Uložení todo | P2 |
| `todonotes/delete` | POST | ✅ | Smazání todo | P2 |
| `todonotes/by-id` | POST | ✅ | Todo podle ID | P2 |
| `todonotes/search` | POST | ✅ | Hledání v todo | P2 |
| `todonotes/with-details` | POST | ✅ | Todo s detaily | P2 |
| `todonotes/recent` | POST | ✅ | Poslední todo | P2 |
| `todonotes/stats` | POST | ✅ | Statistiky todo | P2 |

#### 10. **Chat** (7 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `chat/conversations` | POST | ✅ | Seznam konverzací | P2 |
| `chat/messages` | POST | ✅ | Zprávy konverzace | P2 |
| `chat/messages/new` | POST | ✅ | Nové zprávy | P2 |
| `chat/messages/send` | POST | ✅ | Odeslání zprávy | P2 |
| `chat/mentions/unread` | POST | ✅ | Nepřečtené zmínky | P2 |
| `chat/status/update` | POST | ✅ | Update statusu | P2 |
| `chat/search` | POST | ✅ | Hledání v chatu | P2 |

#### 11. **Šablony & Templates** (10 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `templates/list` | POST | ✅ | Seznam šablon | P2 |
| `templates/create` | POST | ✅ | Vytvoření šablony | P2 |
| `templates/update` | POST | ✅ | Update šablony | P2 |
| `templates/delete` | POST | ✅ | Smazání šablony | P2 |
| `sablona_docx/list` | POST | ✅ | DOCX šablony | P2 |
| `sablona_docx/by-id` | POST | ✅ | DOCX detail | P2 |
| `sablona_docx/create` | POST | ✅ | DOCX create | P2 |
| `sablona_docx/update` | POST | ✅ | DOCX update | P2 |
| `sablona_docx/update-partial` | POST | ✅ | DOCX partial update | P2 |

#### 12. **Reports & Analytics** (3 endpointy)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `reports/urgent-payments` | POST | ✅ | Urgentní platby | P1 |
| `limitovane_prisliby` | POST | ✅ | Limitované přísliby | P2 |
| `approval/permissions` | POST | ✅ | Schvalovací oprávnění | P1 |

#### 13. **Miscellaneous** (5 endpointů)

| Endpoint | Method | Auth | Popis | Priority |
|----------|--------|------|-------|----------|
| `nameday` | GET | ❌ | Jmeniny podle data | P3 |
| `ciselniky` | POST | ✅ | Všechny číselníky | P1 |
| `notify/email` | POST | ✅ | Odeslání emailu | P2 |
| `old/react` | POST | ✅ | Legacy React data | P3 |
| `load` | POST | ✅ | Generic load | P3 |
| `save` | POST | ✅ | Generic save | P3 |

---

## Migrační strategie

### Fáze migrace

#### **Fáze 0: Příprava a analýza** (1 týden)

✅ **Hotovo:**
- ✅ Inventář všech PHP endpointů
- ✅ Analýza token systému
- ✅ Dokumentace response formátů
- ✅ Git záloha současného stavu

🔄 **Zbývá:**
- [ ] Setup testovacího prostředí
- [ ] Vytvoření response comparison toolingu
- [ ] Výběr testing frameworku (Jest + Supertest)

#### **Fáze 1: Infrastruktura** (1-2 týdny)

**Cíl:** Vytvořit Node.js API strukturu s autentizací

- [ ] Setup Node.js projektu `/var/www/erdms-dev/apps/eeo-v2/api-nodejs/`
- [ ] Express.js routing framework
- [ ] MariaDB connection pool (mysql2/promise)
- [ ] Authentication middleware
  - [ ] PHP token compatibility (`verify_token_v2`)
  - [ ] Entra session validation
  - [ ] Dual-mode authentication
- [ ] Error handling middleware
- [ ] Logging (Winston nebo Pino)
- [ ] Environment configuration (.env)
- [ ] Database service layer
- [ ] Response formatter middleware (zajistí 100% kompatibilitu)

**Struktura projektu:**
```
apps/eeo-v2/api-nodejs/
├── package.json
├── .env.production
├── src/
│   ├── index.js                 # Entry point
│   ├── app.js                   # Express app
│   ├── config/
│   │   ├── database.js          # DB config
│   │   └── auth.js              # Auth config
│   ├── middleware/
│   │   ├── auth.js              # Token verification
│   │   ├── errorHandler.js     # Error handling
│   │   ├── logger.js            # Request logging
│   │   └── responseFormatter.js # Response compatibility
│   ├── services/
│   │   ├── db.js                # Database service
│   │   └── auth.js              # Auth service
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.js              # Auth routes
│   │   ├── users.js             # User routes
│   │   ├── orders.js            # Order routes
│   │   ├── invoices.js          # Invoice routes
│   │   ├── suppliers.js         # Supplier routes
│   │   ├── codebooks.js         # Codebook routes
│   │   └── ...
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── orderController.js
│   │   └── ...
│   ├── models/
│   │   ├── User.js
│   │   ├── Order.js
│   │   ├── Invoice.js
│   │   └── ...
│   └── utils/
│       ├── tokenGenerator.js    # PHP-compatible token
│       ├── responseBuilder.js   # Response formatter
│       └── validators.js        # Input validation
└── tests/
    ├── integration/
    │   └── php-compatibility.test.js
    └── unit/
        └── ...
```

#### **Fáze 2: Priority 0 Endpoints** (2-3 týdny)

**Kritické endpointy pro základní funkcionalitu:**

1. **Authentication** (1 týden)
   - [ ] `POST /login` - PHP compatible login
   - [ ] `POST /entra-login` - Entra bridge
   - [ ] `POST /user/detail` - User detail
   - [ ] `POST /users/list` - User listing

2. **Orders Core** (1 týden)
   - [ ] `POST /orders25/list` - Order listing
   - [ ] `POST /orders25/by-id` - Order detail
   - [ ] `POST /orders25/insert` - Create order
   - [ ] `POST /orders25/update` - Update order
   - [ ] `POST /orders25/select-for-edit` - Edit mode

3. **Orders Extended** (1 týden)
   - [ ] `POST /order-v2/list` - V2 listing
   - [ ] `POST /order-v2/list-enriched` - Enriched listing
   - [ ] `POST /order-v2/create` - V2 create

4. **Supporting** (rozloženo)
   - [ ] `POST /useky/list` - Departments list
   - [ ] `POST /useky/detail` - Department detail
   - [ ] `POST /stavy/list` - States list
   - [ ] `POST /dodavatele/list` - Suppliers list
   - [ ] `POST /dodavatele/detail` - Supplier detail

**Testing kritéria:**
- ✅ Response structure match 100%
- ✅ Data types match
- ✅ Error responses match
- ✅ Performance < 200ms (stejně jako PHP)

#### **Fáze 3: Priority 1 Endpoints** (3-4 týdny)

**Běžně používané funkce:**

1. **Invoices** (1 týden)
   - [ ] Všechny `invoices25/*` endpointy

2. **Attachments** (1 týden)
   - [ ] File upload handling (multer)
   - [ ] Všechny `attachments/*` endpointy
   - [ ] Všechny `orders25/attachments/*`
   - [ ] Všechny `invoices25/attachments/*`

3. **User Management** (1 týden)
   - [ ] `users/create`, `update`, `partial-update`
   - [ ] `user/change-password`
   - [ ] `users/deactivate`

4. **Codebooks** (1 týden)
   - [ ] Lokality, Pozice, Organizace
   - [ ] Role a práva
   - [ ] Hierarchie a zástupování

#### **Fáze 4: Priority 2 Endpoints** (2 týdny)

**Méně kritické funkce:**

- [ ] Notifications
- [ ] Todo notes
- [ ] Chat
- [ ] Templates
- [ ] Reports

#### **Fáze 5: Priority 3 Endpoints** (1 týden)

**Nice-to-have funkce:**

- [ ] Nameday
- [ ] Old/react
- [ ] Generic load/save

### Paralelní běh PHP a Node.js

**Apache routing strategie:**

```apache
# /etc/apache2/sites-available/erdms-proxy-production.inc

# Node.js API (nové endpointy)
ProxyPass /api/eeo/v2 http://localhost:4002/api/eeo
ProxyPassReverse /api/eeo/v2 http://localhost:4002/api/eeo

# PHP API (fallback pro nemigované endpointy)
ProxyPass /api.eeo http://localhost/api.eeo
ProxyPassReverse /api.eeo http://localhost/api.eeo
```

**Frontend routing:**

```javascript
// apiService.js
const API_VERSION = process.env.VITE_API_VERSION || 'v2'; // 'v2' = Node.js, 'v1' = PHP

const getBaseUrl = (endpoint) => {
    // Migrated endpoints use Node.js
    const migratedEndpoints = [
        'login', 'entra-login', 'user/detail',
        'orders25/list', 'orders25/by-id', 'orders25/insert'
        // ... další migrované
    ];
    
    if (API_VERSION === 'v2' && migratedEndpoints.includes(endpoint)) {
        return '/api/eeo/v2';
    }
    
    // Fallback na PHP
    return '/api.eeo';
};
```

---

## Technická architektura

### Database Layer

**Connection Pool:**
```javascript
// src/config/database.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

export default pool;
```

**Database Service:**
```javascript
// src/services/db.js
import pool from '../config/database.js';

class DatabaseService {
    async query(sql, params = []) {
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    
    async transaction(callback) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new DatabaseService();
```

### Authentication Middleware

**PHP Token Compatibility:**
```javascript
// src/middleware/auth.js
import db from '../services/db.js';

export const verifyToken = async (req, res, next) => {
    const { username, token } = req.body;
    
    if (!username || !token) {
        return res.status(401).json({
            err: 'Chybí username nebo token'
        });
    }
    
    try {
        // Dekódování base64 tokenu
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split('|');
        
        if (parts.length !== 2) {
            return res.status(401).json({ err: 'Neplatný token' });
        }
        
        const [tokenUsername, timestamp] = parts;
        
        // Kontrola username match
        if (tokenUsername !== username) {
            return res.status(401).json({ err: 'Username neodpovídá tokenu' });
        }
        
        // Kontrola expirace (24 hodin)
        const now = Math.floor(Date.now() / 1000);
        if (now - parseInt(timestamp) > 86400) {
            return res.status(401).json({ err: 'Token vypršel' });
        }
        
        // Ověření existence uživatele
        const [user] = await db.query(
            'SELECT id, username FROM 25_uzivatele WHERE username = ? AND aktivni = 1',
            [username]
        );
        
        if (!user) {
            return res.status(401).json({ err: 'Uživatel nenalezen' });
        }
        
        // Přidání uživatele do requestu
        req.auth = {
            id: user.id,
            username: user.username
        };
        
        next();
        
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ err: 'Neplatný token' });
    }
};
```

### Response Compatibility Layer

**PHP Response Formatter:**
```javascript
// src/middleware/responseFormatter.js

export const formatPhpResponse = (req, res, next) => {
    // Přepis res.json() pro zachování PHP formátu
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
        // Pokud je to error (má property 'err'), vrať as-is
        if (data && data.err) {
            return originalJson(data);
        }
        
        // Standardní success response
        const formatted = {
            status: 'success',
            data: data,
            ...(data.total !== undefined && { total: data.total }),
            ...(data.limit !== undefined && { limit: data.limit }),
            ...(data.offset !== undefined && { offset: data.offset })
        };
        
        return originalJson(formatted);
    };
    
    next();
};
```

### Error Handler

```javascript
// src/middleware/errorHandler.js

export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // MySQL errors
    if (err.code && err.code.startsWith('ER_')) {
        return res.status(500).json({
            err: 'Chyba databáze',
            code: 'DB_ERROR',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            err: err.message,
            code: 'VALIDATION_ERROR'
        });
    }
    
    // Generic error
    res.status(err.status || 500).json({
        err: err.message || 'Interní chyba serveru',
        code: err.code || 'INTERNAL_ERROR'
    });
};
```

---

## Response Compatibility Layer

### Automatické testování kompatibility

**PHP vs Node.js Response Comparison:**

```javascript
// tests/integration/php-compatibility.test.js
import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const PHP_API = 'http://localhost/api.eeo';
const NODE_API = 'http://localhost:4002/api/eeo';

const testCredentials = {
    username: 'test.user',
    token: 'dGVzdC51c2VyfDE3MzM0MDAwMDA='
};

describe('PHP to Node.js Compatibility', () => {
    
    it('should return identical response structure for orders25/list', async () => {
        const requestData = {
            ...testCredentials,
            filters: { rok: 2025 },
            limit: 10,
            offset: 0
        };
        
        // PHP response
        const phpRes = await axios.post(`${PHP_API}/orders25/list`, requestData);
        
        // Node.js response
        const nodeRes = await axios.post(`${NODE_API}/orders25/list`, requestData);
        
        // Porovnání struktury
        expect(Object.keys(phpRes.data).sort()).toEqual(
            Object.keys(nodeRes.data).sort()
        );
        
        // Porovnání data typů
        expect(typeof phpRes.data.status).toBe(typeof nodeRes.data.status);
        expect(Array.isArray(phpRes.data.data)).toBe(Array.isArray(nodeRes.data.data));
        
        // Pokud jsou data, porovnej strukturu prvního záznamu
        if (phpRes.data.data.length > 0 && nodeRes.data.data.length > 0) {
            expect(Object.keys(phpRes.data.data[0]).sort()).toEqual(
                Object.keys(nodeRes.data.data[0]).sort()
            );
        }
    });
    
    it('should handle errors identically', async () => {
        const invalidRequest = {
            username: 'invalid',
            token: 'invalid'
        };
        
        let phpError, nodeError;
        
        try {
            await axios.post(`${PHP_API}/orders25/list`, invalidRequest);
        } catch (err) {
            phpError = err.response;
        }
        
        try {
            await axios.post(`${NODE_API}/orders25/list`, invalidRequest);
        } catch (err) {
            nodeError = err.response;
        }
        
        expect(phpError.status).toBe(nodeError.status);
        expect(phpError.data).toHaveProperty('err');
        expect(nodeError.data).toHaveProperty('err');
    });
    
});
```

### Response Snapshot Testing

```javascript
// tests/integration/response-snapshots.test.js
import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

describe('Response Snapshot Tests', () => {
    
    it('matches snapshot for orders25/list response', async () => {
        const response = await axios.post('http://localhost:4002/api/eeo/orders25/list', {
            username: 'test.user',
            token: 'dGVzdC51c2VyfDE3MzM0MDAwMDA=',
            limit: 1
        });
        
        // Anonymizuj dynamické hodnoty
        const sanitized = {
            ...response.data,
            data: response.data.data.map(order => ({
                ...order,
                datum_vytvoreni: 'DYNAMIC',
                datum_upravy: 'DYNAMIC'
            }))
        };
        
        expect(sanitized).toMatchSnapshot();
    });
    
});
```

---

## Implementační plán

### Week 1: Infrastruktura

**Day 1-2: Project Setup**
- [ ] Vytvoření projektu `/var/www/erdms-dev/apps/eeo-v2/api-nodejs/`
- [ ] `npm init` a instalace dependencies
- [ ] Git repository setup
- [ ] Basic Express app structure

**Day 3-4: Database & Auth**
- [ ] Database connection pool
- [ ] Auth middleware (PHP token compatibility)
- [ ] Response formatter middleware

**Day 5: Testing Setup**
- [ ] Jest configuration
- [ ] PHP compatibility test suite
- [ ] CI/CD basic setup

### Week 2-3: Priority 0 Endpoints

**Week 2: Authentication**
- [ ] Day 1-2: `login` endpoint
- [ ] Day 3: `entra-login` endpoint
- [ ] Day 4: `user/detail` endpoint
- [ ] Day 5: `users/list` endpoint

**Week 3: Orders Core**
- [ ] Day 1-2: `orders25/list` + `orders25/by-id`
- [ ] Day 3: `orders25/insert`
- [ ] Day 4: `orders25/update`
- [ ] Day 5: `orders25/select-for-edit`

### Week 4-5: Priority 0 Extended

**Week 4: Orders V2**
- [ ] Day 1-2: `order-v2/list` + `order-v2/list-enriched`
- [ ] Day 3: `order-v2/create`
- [ ] Day 4-5: Testing a bugfixing

**Week 5: Supporting Endpoints**
- [ ] Day 1: Useky (departments)
- [ ] Day 2: Stavy (states)
- [ ] Day 3: Dodavatele (suppliers)
- [ ] Day 4-5: Integration testing

### Week 6-9: Priority 1 Endpoints

*... pokračování podle seznamu*

---

## Testing Strategy

### Testing Pyramid

```
       ┌─────────────┐
       │  E2E Tests  │  (10%)
       │  Selenium   │
       └─────────────┘
     ┌─────────────────┐
     │ Integration     │  (30%)
     │ PHP Compat      │
     └─────────────────┘
   ┌───────────────────────┐
   │  Unit Tests           │  (60%)
   │  Controllers, Models  │
   └───────────────────────┘
```

### Test Coverage Goals

- **Unit tests:** > 80% coverage
- **Integration tests:** Všechny migrated endpointy
- **PHP compatibility tests:** 100% endpointů
- **E2E tests:** Critical user flows

### Continuous Testing

```bash
# Pre-commit hook
#!/bin/bash
npm run test:unit
npm run lint
```

```bash
# CI/CD pipeline
npm run test:all
npm run test:compatibility
npm run lint
npm run build
```

---

## Deployment & Rollback

### Deployment Strategy

**Blue-Green Deployment:**

1. **Setup Node.js service:**
```bash
# /etc/systemd/system/erdms-eeo-nodejs-api.service
[Unit]
Description=ERDMS EEO Node.js API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/erdms-dev/apps/eeo-v2/api-nodejs
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

2. **Apache routing s feature flag:**
```apache
# Fallback na PHP
ProxyPass /api.eeo http://localhost/api.eeo

# Node.js API (opt-in)
<If "%{HTTP:X-API-Version} == 'v2'">
    ProxyPass /api.eeo http://localhost:4002/api/eeo
    ProxyPassReverse /api.eeo http://localhost:4002/api/eeo
</If>
```

3. **Frontend feature flag:**
```javascript
// .env
VITE_USE_NODEJS_API=false  // Initially false

// Frontend
const useNodeAPI = import.meta.env.VITE_USE_NODEJS_API === 'true';
```

### Rollback Plan

**Immediate Rollback (< 5 minut):**

```bash
# 1. Zastavit Node.js API
sudo systemctl stop erdms-eeo-nodejs-api

# 2. Restore Apache config
sudo cp /etc/apache2/sites-available/erdms-proxy-production.inc.backup \
        /etc/apache2/sites-available/erdms-proxy-production.inc
sudo systemctl reload apache2

# 3. Frontend fallback
# Změnit .env nebo feature flag v admin panelu
VITE_USE_NODEJS_API=false
```

**Git Rollback:**

```bash
# Tag před každou migrací
git tag -a migration-phase-1 -m "Before Phase 1 migration"
git push origin migration-phase-1

# Rollback
git checkout migration-phase-1
npm install
npm run build
sudo systemctl restart erdms-eeo-nodejs-api
```

### Monitoring

**Health Checks:**
```javascript
// src/routes/health.js
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: process.env.npm_package_version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
```

**Metrics to Monitor:**
- Response time (avg, p95, p99)
- Error rate (%)
- Request rate (req/s)
- Database connection pool usage
- Memory usage
- CPU usage

---

## Git Záloha - Checklist

### Před začátkem migrace

```bash
cd /var/www/erdms-dev

# 1. Commit současného stavu
git add .
git commit -m "Pre-migration snapshot: Complete PHP API"

# 2. Create backup branch
git branch backup/php-api-2025-12-05
git push origin backup/php-api-2025-12-05

# 3. Tag release
git tag -a v1.0.0-php-final -m "Final PHP API version before Node.js migration"
git push origin v1.0.0-php-final

# 4. Create migration branch
git checkout -b feature/nodejs-migration
```

### Před každou fází

```bash
# Commit phase completion
git add .
git commit -m "Migration Phase 1 complete: Infrastructure"
git tag -a migration-phase-1 -m "Infrastructure setup complete"
git push origin feature/nodejs-migration --tags
```

### Database Backup

```bash
# Backup production DB
mysqldump -h 10.3.172.11 -u erdms_user -p eeo_db > eeo_db_backup_2025-12-05.sql
gzip eeo_db_backup_2025-12-05.sql

# Store backup
cp eeo_db_backup_2025-12-05.sql.gz /var/backups/erdms/
```

---

## Shrnutí - Next Steps

### 1. **Schválení plánu**
- Review tohoto dokumentu
- Odsouhlasení priorit endpointů
- Alokace času a zdrojů

### 2. **Přípravné kroky**
- [ ] Git záloha (hotovo podle checklistu výše)
- [ ] Database backup
- [ ] Setup testovacího prostředí
- [ ] Vytvoření Node.js projektu

### 3. **Kickoff migrace**
- [ ] Week 1: Infrastructure setup
- [ ] První migrated endpoint: `login`
- [ ] PHP compatibility tests

### 4. **Continuous Integration**
- [ ] Parallel run PHP + Node.js
- [ ] Postupné přepínání endpointů
- [ ] Monitoring a alerting

---

**Status:** 📝 **DRAFT - Awaiting Approval**  
**Next Action:** Schválení plánu → Git backup → Start Phase 0

**Autor:** GitHub Copilot  
**Verze dokumentu:** 1.0  
**Datum:** 5. prosince 2025
