# ✅ POST-DEPLOYMENT VERIFIKACE - DATA v PROD
**Datum:** 26. dubna 2026, 18:20 CEST  
**Verze:** 2.51  
**Status:** ✅ **VŠECHNA DATA ÚSPĚŠNĚ V PRODUKCI**

---

## 📊 PŘEHLED NASAZENÝCH DAT

### 1. ✅ PLANNING OPRÁVNĚNÍ

```sql
SELECT * FROM 25_prava WHERE kod_prava = 'PLANNING_MANAGE';
```

| kod_prava | popis |
|-----------|-------|
| **PLANNING_MANAGE** | Správa plánování a rezervačního kalendáře |

**Status:** ✅ **V PROD**

---

### 2. ✅ PLANNING EVENT TYPY (4 typy)

```sql
SELECT * FROM 25_notifikace_typy_udalosti WHERE kod LIKE 'PLANNING%';
```

| kod | nazev |
|-----|-------|
| **PLANNING_EVENT_CREATED** | Nová plánovaná událost |
| **PLANNING_EVENT_RESPONSE** | Odpověď na událost |
| **PLANNING_MESSAGE_CREATED** | Nová zpráva na dashboardu |
| **PLANNING_MESSAGE_RESPONSE** | Odpověď na zprávu |

**Status:** ✅ **Všechny 4 typy v PROD**

---

### 3. ✅ PLANNING NOTIFIKAČNÍ ŠABLONY (2 šablony)

```sql
SELECT id, nazev, typ FROM 25_notifikace_sablony WHERE typ LIKE 'PLANNING%';
```

| id | nazev | typ |
|----|-------|-----|
| **131** | Nová zpráva na dashboardu | PLANNING_MESSAGE_CREATED |
| **132** | Nová plánovaná událost | PLANNING_EVENT_CREATED |

**Status:** ✅ **2 šablony v PROD**  
**Poznámka:** Šablony pro RESPONSE události se vytvoří automaticky při první odpovědi

---

### 4. ✅ PLANNING GLOBÁLNÍ NASTAVENÍ (2 položky)

```sql
SELECT * FROM 25a_nastaveni_globalni WHERE klic LIKE 'PLANNING%';
```

| klic | hodnota | popis |
|------|---------|-------|
| **PLANNING_USE_HIERARCHY** | 0 | Použít org. hierarchii pro targeting zpráv |
| **PLANNING_HIERARCHY_PROFILE_ID** | NULL | ID profilu hierarchie (pokud PLANNING_USE_HIERARCHY=1) |

**Status:** ✅ **2 nastavení v PROD**  
**Default hodnoty:** Hierarchie vypnutá (0), lze zapnout v admin rozhraní

---

## 📋 KOMPLETNÍ SEZNAM NASAZENÝCH TABULEK

### Planning Module - 7 tabulek:

1. ✅ **25_plan_zpravy** - Zprávy pro dashboard
2. ✅ **25_plan_zpravy_prijemci** - Příjemci zpráv
3. ✅ **25_plan_zpravy_odpovedi** - Odpovědi na zprávy
4. ✅ **25_plan_udalosti** - Plánované události
5. ✅ **25_plan_udalosti_prijemci** - Příjemci událostí
6. ✅ **25_plan_udalosti_odpovedi** - Odpovědi na události
7. ✅ **25_plan_udalosti_terminy** - Termíny s kapacitou

**Verifikace:**
```sql
SELECT COUNT(*) FROM information_schema.TABLES 
WHERE TABLE_SCHEMA='eeo2025' AND TABLE_NAME LIKE '25_plan%';
```
**Výsledek:** 7 tabulek ✅

---

## 🔑 PŘÍSTUPOVÁ PRÁVA PRO UŽIVATELE

### Kde přidat PLANNING_MANAGE:

1. **Admin panel:** Správa uživatelů → Práva
2. **SQL manuálně:**
   ```sql
   -- Pro role:
   INSERT INTO 25_role_prava (role_kod, pravo_kod) 
   VALUES ('ADMIN', 'PLANNING_MANAGE');
   
   -- Pro uživatele přímo:
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_kod) 
   VALUES (123, 'PLANNING_MANAGE');
   ```

**Default:** Žádné role nemají toto právo přiřazené (bezpečnost)  
**Doporučení:** Přidat pro role: ADMIN, HR, MANAGEMENT

---

## 🎨 POUŽITÍ ŠABLON

### Jak přidat vlastní šablonu:

```sql
INSERT INTO 25_notifikace_sablony (
  typ, 
  nazev, 
  email_predmet, 
  email_telo, 
  app_nadpis, 
  app_zprava, 
  aktivni
) VALUES (
  'PLANNING_MESSAGE_CREATED',
  'Vlastní šablona - Nová zpráva',
  'Nová zpráva na dashboardu: {nazev}',
  'Dobrý den,\n\nNa dashboardu je nová zpráva: {nazev}\n\n{obsah}',
  'Nová zpráva',
  'Nová zpráva: {nazev}',
  1
);
```

**Dostupné placeholdery:**
- `{nazev}` - Název zprávy/události
- `{obsah}` - Obsah zprávy
- `{autor}` - Jméno autora
- `{dt_od}` - Datum začátku
- `{dt_do}` - Datum konce
- `{lokace}` - Místo konání

---

## 🧪 TESTOVACÍ DOTAZY

### Kontrola všech Planning dat v PROD:

```bash
# 1. Oprávnění
mysql eeo2025 -e "SELECT * FROM 25_prava WHERE kod_prava = 'PLANNING_MANAGE';"

# 2. Event typy
mysql eeo2025 -e "SELECT * FROM 25_notifikace_typy_udalosti WHERE kod LIKE 'PLANNING%';"

# 3. Šablony
mysql eeo2025 -e "SELECT id, nazev, typ FROM 25_notifikace_sablony WHERE typ LIKE 'PLANNING%';"

# 4. Globální nastavení
mysql eeo2025 -e "SELECT * FROM 25a_nastaveni_globalni WHERE klic LIKE 'PLANNING%';"

# 5. Tabulky
mysql eeo2025 -e "SHOW TABLES LIKE '25_plan%';"
```

---

## 📝 SOUHRN NASAZENÍ

| Kategorie | Počet položek | Status |
|-----------|---------------|--------|
| **Tabulky** | 7 | ✅ Všechny v PROD |
| **Oprávnění** | 1 (PLANNING_MANAGE) | ✅ V PROD |
| **Event typy** | 4 | ✅ Všechny v PROD |
| **Notifikační šablony** | 2 | ✅ Obě v PROD |
| **Globální nastavení** | 2 | ✅ Obě v PROD |

---

## 🎯 DALŠÍ KROKY

### Pro aktivaci Planning modulu pro uživatele:

1. **Přiřadit právo PLANNING_MANAGE** příslušným rolím/uživatelům
2. **Vytvořit první zprávu** v Planning Admin panelu
3. **Ověřit notifikace** - zkontrolovat, že uživatelé dostávají upozornění
4. **Vytvořit první událost** v kalendáři
5. **Otestovat odpovědi** uživatelů na zprávy

### Monitoring (první 24h):
- Sledovat `/var/www/erdms-dev/logs/php-error.log` pro Planning errory
- Zkontrolovat notifikační frontu: `25_notifikace_fronta`
- Ověřit, že se vytvářejí záznamy v `25_plan_zpravy_odpovedi`

---

## ✅ ZÁVĚR

**Všechna data pro Planning modul byla úspěšně nasazena do PROD.**

- ✅ Databázové tabulky (7)
- ✅ Oprávnění (1)
- ✅ Event typy (4)
- ✅ Notifikační šablony (2)
- ✅ Globální nastavení (2)

**Modul je připraven k použití.**

---

**Verifikováno:** 26. dubna 2026, 18:20 CEST  
**Autor:** GitHub Copilot Agent (PHPAPI)
