# API Specifikace: User Detail + Statistiky Objednávek

## Endpoint
**POST** `/api.eeo/api.php`

## Request Body
```json
{
  "action": "user",
  "operation": "detail",
  "username": "u03924",
  "token": "auth_token_here",
  "user_id": 100
}
```

## Response Structure

### Požadovaná struktura odpovědi

```json
{
  "status": "ok",
  "data": {
    "uzivatel_id": 100,
    "login": "u03924",
    "username": "u03924",
    "jmeno": "Robert",
    "prijmeni": "Holovský",
    "email": "robert.holovsky@example.com",
    "telefon": "+420 123 456 789",
    "titul_pred": "Ing.",
    "titul_za": "Ph.D.",
    "aktivni": 1,
    "dt_vytvoreni": "2020-01-15 10:30:00",
    "dt_aktualizace": "2025-11-10 14:25:30",
    "dt_posledni_aktivita": "2025-11-11 09:15:00",
    
    "usek": {
      "id": 5,
      "nazev": "Oddělení informačních technologií",
      "zkratka": "IT",
      "popis": "Správa a vývoj informačních systémů"
    },
    
    "pozice": {
      "id": 12,
      "nazev": "Programátor",
      "parent_id": 8
    },
    
    "lokalita": {
      "id": 3,
      "nazev": "Kladno",
      "typ": "provozovna",
      "parent_id": 1
    },
    
    "organizace": {
      "id": 1,
      "nazev": "Zdravotnická záchranná služba Středočeského kraje, p.o.",
      "ico": "75030926",
      "dic": "CZ75030926",
      "ulice_cislo": "Vancurova 1544",
      "mesto": "Kladno",
      "psc": "27201",
      "zastoupeny": "MUDr. Jan Novák",
      "datova_schranka": "abc123xyz",
      "email": "info@zachranka.cz",
      "telefon": "+420 312 234 567"
    },
    
    "nadrizeny": {
      "id": 85,
      "cely_jmeno": "Ing. Pavel Dvořák"
    },
    
    "roles": [
      {
        "id": 3,
        "nazev_role": "Uživatel",
        "popis": "Základní role pro všechny uživatele",
        "rights": [
          {
            "id": 10,
            "kod_prava": "orders.view",
            "popis": "Prohlížení objednávek"
          },
          {
            "id": 11,
            "kod_prava": "orders.create",
            "popis": "Vytváření objednávek"
          }
        ]
      }
    ],
    
    "direct_rights": [
      {
        "id": 25,
        "kod_prava": "admin.users.manage",
        "popis": "Správa uživatelů"
      }
    ],
    
    "statistiky_objednavek": {
      "celkem": 147,
      "aktivni": 12,
      "zruseno_storno": 7,
      "stavy": {
        "NOVA": 0,
        "KE_SCHVALENI": 2,
        "SCHVALENA": 5,
        "ZAMITNUTA": 0,
        "ROZPRACOVANA": 3,
        "ODESLANA": 1,
        "POTVRZENA": 1,
        "UVEREJNENA": 0,
        "CEKA_POTVRZENI": 0,
        "DOKONCENA": 128,
        "ZRUSENA": 3,
        "SMAZANA": 1,
        "ARCHIVOVANO": 3
      }
    }
  }
}
```

## Popis polí

### Základní údaje uživatele
- `uzivatel_id` (int): ID uživatele v systému
- `login` (string): Přihlašovací jméno
- `username` (string): Alias pro login (může být stejný jako login)
- `jmeno` (string): Křestní jméno
- `prijmeni` (string): Příjmení
- `email` (string): E-mailová adresa
- `telefon` (string): Telefonní číslo
- `titul_pred` (string|null): Titul před jménem
- `titul_za` (string|null): Titul za jménem
- `aktivni` (int): 1 = aktivní, 0 = neaktivní
- `dt_vytvoreni` (datetime): Datum a čas vytvoření účtu
- `dt_aktualizace` (datetime): Datum a čas poslední aktualizace
- `dt_posledni_aktivita` (datetime): Datum a čas poslední aktivity

### Úsek (usek)
**Objekt**, ne string!
- `id` (int): ID úseku
- `nazev` (string): Plný název úseku
- `zkratka` (string): Zkratka úseku (např. "IT")
- `popis` (string): Popis úseku

### Pozice (pozice)
**Objekt**, ne string!
- `id` (int): ID pozice
- `nazev` (string): Název pozice (např. "Programátor")
- `parent_id` (int|null): ID nadřazené pozice

### Lokalita (lokalita)
**Objekt**, ne string!
- `id` (int): ID lokality
- `nazev` (string): Název lokality
- `typ` (string): Typ lokality (např. "provozovna", "centrala")
- `parent_id` (int|null): ID nadřazené lokality

### Organizace (organizace)
**Objekt s kompletními údaji!**
- `id` (int): ID organizace
- `nazev` (string): Název organizace
- `ico` (string): IČO organizace
- `dic` (string|null): DIČ organizace
- `ulice_cislo` (string): Ulice a číslo popisné
- `mesto` (string): Město
- `psc` (string): PSČ
- `zastoupeny` (string|null): Kým je organizace zastoupena
- `datova_schranka` (string|null): ID datové schránky
- `email` (string): Kontaktní e-mail organizace
- `telefon` (string): Kontaktní telefon organizace

### Nadřízený (nadrizeny)
- `id` (int): ID nadřízeného
- `cely_jmeno` (string): Celé jméno nadřízeného včetně titulů

### Role (roles)
**Pole objektů**
- `id` (int): ID role
- `nazev_role` (string): Název role
- `popis` (string): Popis role
- `rights` (array): Pole práv přiřazených k roli
  - `id` (int): ID práva
  - `kod_prava` (string): Kód práva (např. "orders.view")
  - `popis` (string): Popis práva

### Přímá práva (direct_rights)
**Pole objektů** - práva přiřazená přímo uživateli (mimo role)
- `id` (int): ID práva
- `kod_prava` (string): Kód práva
- `popis` (string): Popis práva

### Statistiky objednávek (statistiky_objednavek)
**NOVÉ! Očekáváme v response**

Objekt se třemi hlavními poli:

1. **`celkem` (int)**: Celkový počet všech objednávek vytvořených uživatelem (součet všech stavů)

2. **`aktivni` (int)**: Počet aktivních objednávek
   - Výpočet: `celkem - ZRUSENA - SMAZANA - ARCHIVOVANO`
   
3. **`zruseno_storno` (int)**: Počet zrušených/smazaných objednávek
   - Výpočet: `ZRUSENA + SMAZANA + ARCHIVOVANO`

4. **`stavy` (object)**: Rozpis podle jednotlivých stavů objednávky (system codes - UPPERCASE)
   - `NOVA` (int): Nové/Koncept objednávky
   - `KE_SCHVALENI` (int): Odeslané ke schválení
   - `SCHVALENA` (int): Schválené objednávky
   - `ZAMITNUTA` (int): Zamítnuté objednávky
   - `ROZPRACOVANA` (int): Rozpracované objednávky
   - `ODESLANA` (int): Odeslané dodavateli
   - `POTVRZENA` (int): Potvrzené dodavatelem
   - `UVEREJNENA` (int): Uveřejněné
   - `CEKA_POTVRZENI` (int): Čeká na potvrzení
   - `DOKONCENA` (int): Dokončené objednávky
   - `ZRUSENA` (int): Zrušené objednávky
   - `SMAZANA` (int): Smazané objednávky
   - `ARCHIVOVANO` (int): Archivované objednávky

**Poznámka**: Frontend si z pole `stavy` sám vezme potřebné hodnoty pro dashboard dlaždice.

## Důležité poznámky

1. **Vnořené objekty**: `usek`, `pozice`, `lokalita`, `organizace` MUSÍ být objekty, ne stringy!
   
2. **Kompletní organizace**: Všechna pole organizace musí být v response, ne jen `id` a `nazev`.

3. **Statistiky objednávek**: Nové pole `statistiky_objednavek` - backend spočítá statistiky pro daného uživatele.

4. **Práva**: Rozlišujeme mezi právy z rolí (`roles[].rights`) a přímými právy (`direct_rights`).

5. **Datum formát**: ISO datetime formát `YYYY-MM-DD HH:MM:SS`

6. **NULL hodnoty**: Pokud pole nemá hodnotu, pošlete `null`, ne prázdný string (platí pro `titul_za`, `dic`, `zastoupeny`, `datova_schranka`, `parent_id`).

## Error Response

```json
{
  "status": "error",
  "err": "Uživatel nebyl nalezen",
  "code": 404
}
```

## Testovací data

Pro vývojové účely prosím vraťte testovací data s následujícími hodnotami:
- Uživatel ID: 100
- Login: u03924
- Organizace: Kompletní údaje ZZS SK
- Statistiky: Alespoň nějaké nenulové hodnoty pro testování UI

---

**Datum vytvoření**: 11.11.2025  
**Autor**: Frontend Team  
**Verze**: 1.0
