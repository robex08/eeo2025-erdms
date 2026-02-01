# 👥 MANUÁL: Jak přiřadit práva pro Evidence ročních poplatků

**Datum:** 1. února 2026  
**Pro:** Administrátory systému

---

## 🎯 Rychlý přehled práv

| Právo | Kód | Co umožňuje |
|-------|-----|-------------|
| **Super právo** | `ANNUAL_FEES_MANAGE` | Všechna práva (jako admin) |
| **Zobrazení** | `ANNUAL_FEES_VIEW` | Pouze čtení (seznam + detail) |
| **Vytváření** | `ANNUAL_FEES_CREATE` | Vytváření nových poplatků |
| **Editace** | `ANNUAL_FEES_EDIT` | Úprava existujících poplatků |
| **Mazání** | `ANNUAL_FEES_DELETE` | Mazání poplatků (vyžaduje i EDIT) |
| **Položky - vytvoření** | `ANNUAL_FEES_ITEM_CREATE` | Přidávání položek |
| **Položky - editace** | `ANNUAL_FEES_ITEM_UPDATE` | Úprava položek |
| **Položky - platba** | `ANNUAL_FEES_ITEM_PAYMENT` | Označení k zaplacení |

---

## 📋 Typické scénáře přiřazení práv

### 🔰 Scénář 1: Běžný uživatel (pouze čtení)

**Uživatel:** Zaměstnanec, který potřebuje vidět roční poplatky

**Přiřadit právo:**
```
ANNUAL_FEES_VIEW
```

**Co může:**
- ✅ Vidět seznam ročních poplatků
- ✅ Otevřít detail poplatku
- ✅ Vidět statistiky

**Co NEMŮŽE:**
- ❌ Vytvářet nové poplatky
- ❌ Editovat existující
- ❌ Mazat
- ❌ Přidávat/měnit položky

---

### 📝 Scénář 2: Ekonom (vytváření a editace)

**Uživatel:** Ekonom, který spravuje roční poplatky

**Přiřadit práva:**
```
ANNUAL_FEES_VIEW
ANNUAL_FEES_CREATE
ANNUAL_FEES_EDIT
ANNUAL_FEES_ITEM_CREATE
ANNUAL_FEES_ITEM_UPDATE
ANNUAL_FEES_ITEM_PAYMENT
```

**Co může:**
- ✅ Vidět seznam a detail
- ✅ Vytvářet nové poplatky
- ✅ Editovat existující poplatky
- ✅ Přidávat položky
- ✅ Označovat položky k zaplacení
- ✅ Měnit částky a datumy

**Co NEMŮŽE:**
- ❌ Mazat poplatky (potřebuje ještě DELETE právo)

---

### 🗑️ Scénář 3: Vedoucí ekonomického oddělení (plná správa)

**Uživatel:** Vedoucí, který má plnou kontrolu

**Přiřadit právo:**
```
ANNUAL_FEES_MANAGE
```

**Co může:**
- ✅ Vše (vytváření, editace, mazání, položky, statistiky)
- ✅ Funguje jako "mini-admin" pro roční poplatky

---

### 💳 Scénář 4: Účetní (pouze označování plateb)

**Uživatel:** Účetní, který označuje zaplacené položky

**Přiřadit práva:**
```
ANNUAL_FEES_VIEW
ANNUAL_FEES_ITEM_PAYMENT
```

**Co může:**
- ✅ Vidět seznam poplatků
- ✅ Označovat položky jako zaplacené
- ✅ Vyplnit datum a číslo dokladu

**Co NEMŮŽE:**
- ❌ Vytvářet nebo editovat poplatky
- ❌ Měnit částky
- ❌ Přidávat položky

---

## 🛠️ Jak přiřadit práva v systému

### Varianta A: Přes roli

1. Přejděte do **Číselníky → Role**
2. Vyberte roli (např. "Ekonom")
3. V sekci **Práva** zaškrtněte požadovaná práva:
   - `ANNUAL_FEES_VIEW`
   - `ANNUAL_FEES_CREATE`
   - atd.
4. **Uložte změny**
5. Všichni uživatelé s touto rolí získají tato práva

### Varianta B: Přímo uživateli

1. Přejděte do **Uživatelé**
2. Otevřete detail uživatele
3. V sekci **Přímá práva** přidejte:
   - `ANNUAL_FEES_VIEW`
   - `ANNUAL_FEES_CREATE`
   - atd.
4. **Uložte změny**
5. Uživatel získá práva okamžitě (po refreshi stránky)

---

## 🔍 Kontrola, zda práva fungují

### Pro uživatele:

1. **Odhlaste se a znovu přihlaste** (nebo refresh stránky F5)
2. V menu zkontrolujte:
   - Pokud vidíte **"Beta funkce"** → menu se zobrazilo správně
   - Uvnitř "Beta funkce" by měla být položka **"Evidence ročních poplatků"**
3. Klikněte na "Evidence ročních poplatků"
4. Zkontrolujte viditelnost tlačítek:
   - **"+ Nový poplatek"** = máte CREATE právo
   - **Edit ikona (tužka)** = máte EDIT právo
   - **Delete ikona (koš)** = máte DELETE právo

### Pro administrátora:

1. Otevřete **Developer Tools** (F12)
2. V sekci **Console** by neměly být žádné chyby 403 Forbidden
3. V sekci **Network**:
   - Zavolejte API endpoint `/annual-fees/list`
   - Response by měla být `200 OK` (ne `403 Forbidden`)

---

## ⚠️ Důležité poznámky

### 1. Admin role

- Uživatelé s rolí **ADMINISTRATOR** nebo **SUPERADMIN** mají automaticky přístup ke všemu
- Není nutné jim přiřazovat jednotlivá práva

### 2. DELETE právo

- **DELETE vyžaduje i EDIT právo!**
- Pokud přiřadíte pouze `ANNUAL_FEES_DELETE`, nebude fungovat
- Správně: `ANNUAL_FEES_DELETE` + `ANNUAL_FEES_EDIT`

### 3. PAYMENT právo

- `ANNUAL_FEES_ITEM_PAYMENT` vyžaduje alespoň `ANNUAL_FEES_VIEW`
- Nejlépe: `ANNUAL_FEES_VIEW` + `ANNUAL_FEES_ITEM_PAYMENT`

### 4. Refresh po změně práv

- Po přiřazení nových práv musí uživatel:
  - Obnovit stránku (F5) NEBO
  - Odhlásit se a znovu přihlásit

---

## 🚨 Troubleshooting

### Problém: Uživatel nevidí menu "Evidence ročních poplatků"

**Řešení:**
1. Zkontrolujte, zda má uživatel alespoň jedno z těchto práv:
   - `ANNUAL_FEES_MANAGE`
   - `ANNUAL_FEES_VIEW`
   - `ANNUAL_FEES_CREATE`
   - `ANNUAL_FEES_EDIT`
2. Odhlaste uživatele a znovu přihlaste
3. Vyčistěte cache prohlížeče (Ctrl+Shift+Delete)

### Problém: Uživatel vidí menu, ale po kliknutí dostane chybu 403

**Řešení:**
1. Otevřete Developer Tools (F12) → Console
2. Zkontrolujte chybové hlášky
3. Pravděpodobně má právo na frontend, ale ne na backend
4. Přidejte právo `ANNUAL_FEES_VIEW` (minimálně)

### Problém: Uživatel má práva, ale tlačítka nejsou viditelná

**Řešení:**
1. Zkontrolujte JavaScript console (F12)
2. Ověřte, že `hasPermission()` funkce vrací `true`
3. Pravděpodobně je potřeba refresh stránky (F5)
4. Vyčistěte localStorage (F12 → Application → Local Storage → Clear)

---

## 📞 Kontakt

V případě problémů kontaktujte:
- **IT Support**
- **Správce systému**

---

**Vytvořeno:** 1. února 2026  
**Autor:** GitHub Copilot  
**Verze:** 1.0
