# ⚡ RYCHLÝ START - Kontextový pomocník

## 🚀 Instalace za 3 minuty

### Krok 1: SQL Oprávnění (1 min)

```bash
cd /home/holovsky/dokumenty/Jazyky/react/wObj/r-app-zzs-eeo-25
mysql -u root -p evidence_smluv < setup_contextual_helper_permissions.sql
```

**Zkontroluj výsledek:**
```sql
SELECT * FROM `25_prava` WHERE kod_prava LIKE 'HELPER_%';
```

Očekávaný výsledek:
```
| id  | kod_prava     | popis                              | aktivni |
|-----|---------------|------------------------------------|---------|
| XXX | HELPER_VIEW   | Zobrazení kontextového pomocníka   | 1       |
| XXX | HELPER_MANAGE | Správa nastavení pomocníka         | 1       |
```

---

### Krok 2: Restart aplikace (1 min)

```bash
# Zastav běžící aplikaci (Ctrl+C v terminálu)
# Pak:
npm start
```

---

### Krok 3: Přiřaď oprávnění uživateli (1 min)

**Metoda A: Přes GUI (doporučeno)**
1. Otevři **Správa uživatelů** (`/users`)
2. Vyber svého uživatele
3. V záložce **"Přímá práva"** přidej `HELPER_VIEW`
4. Ulož

**Metoda B: Přes SQL**
```sql
-- Přiřaď HELPER_VIEW sobě (změň 'tvuj.username')
INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`)
SELECT 
  (SELECT id FROM `25_uzivatele` WHERE username = 'tvuj.username'),
  (SELECT id FROM `25_prava` WHERE kod_prava = 'HELPER_VIEW')
ON DUPLICATE KEY UPDATE uzivatel_id = uzivatel_id;
```

---

### Krok 4: Test (1 min)

1. **Přihlaš se** do aplikace
2. **Otevři** Pokladní kniha (`/cash-book`)
3. **Ověř:**
   - ✓ V levém spodním rohu vidíš avatar mince
   - ✓ Klikni na avatar → zobrazí se bublina s nápovědou
   - ✓ Klikni na X → bublina zmizí

---

## 📝 Přidání do další stránky

### Jednoduchá integrace:

```jsx
// 1. Import komponenty
import ContextualHelper from '../components/ContextualHelper';

// 2. Přidej na konec JSX (před uzavírací tag)
function MojeStranka() {
  return (
    <div>
      {/* ... tvůj obsah ... */}
      
      <ContextualHelper pageContext="objednavka" />
    </div>
  );
}
```

### Dostupné kontexty:

| Context | Použij pro stránku |
|---------|---------------------|
| `pokladniKniha` | Pokladní kniha |
| `objednavka` | Detail objednávky |
| `seznamObjednavek` | Seznam objednávek |
| `faktura` | Faktury |
| `uzivatele` | Správa uživatelů |
| `ciselnik` | Číselníky |
| `adresarKontaktu` | Adresář kontaktů |
| `kalendar` | Kalendář |
| `statistiky` | Statistiky |
| `dashboard` | Hlavní stránka |

---

## 🎯 Vlastní nápověda

```jsx
<ContextualHelper 
  customTip="Tady je moje vlastní nápověda pro tuto speciální stránku!"
/>
```

---

## 🔧 Řešení problémů

### Problém: Avatar se nezobrazuje

**Řešení 1:** Ověř, že MÁŠ přiřazené oprávnění
```sql
-- Zkontroluj SVÉHO uživatele (změň 'tvuj.username')
SELECT u.username, p.kod_prava, p.popis
FROM `25_uzivatel_prava` up
JOIN `25_uzivatele` u ON up.uzivatel_id = u.id
JOIN `25_prava` p ON up.pravo_id = p.id
WHERE u.username = 'tvuj.username' AND p.kod_prava = 'HELPER_VIEW';

-- Pokud je prázdný výsledek, přiřaď oprávnění:
INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`)
SELECT 
  (SELECT id FROM `25_uzivatele` WHERE username = 'tvuj.username'),
  (SELECT id FROM `25_prava` WHERE kod_prava = 'HELPER_VIEW');
```

**Řešení 2:** Zkontroluj konzoli prohlížeče (F12)
- Chybové hlášky v Console?
- 404 na SVG soubor?

**Řešení 3:** Vymaž cache
```bash
# V prohlížeči: Ctrl+Shift+R (hard reload)
```

---

## ✅ Hotovo!

Avatar by měl být viditelný v levém spodním rohu na všech stránkách, kde jsi přidal `<ContextualHelper />`.

📚 Více info: [CONTEXTUAL-HELPER-DOCUMENTATION.md](./CONTEXTUAL-HELPER-DOCUMENTATION.md)
