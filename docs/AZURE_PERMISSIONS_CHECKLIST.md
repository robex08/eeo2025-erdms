# ✅ Azure Portal - Checklist oprávnění pro Graph API

**Pro:** Admin Azure/Entra ID  
**Aplikace:** ERDMS (92eaadde-7e3e-4ad1-8c45-3b875ff5c76b)  
**Cíl:** Povolit načítání uživatelů, skupin, organizační struktury z Microsoft Entra ID

---

## 🎯 Co potřebujeme získat z Entra ID

| **Data** | **Příklad** | **K čemu slouží** |
|----------|-------------|-------------------|
| 👤 **Uživatelé** | Jméno, email, telefon, pozice, oddělení, GUID | Kompletní profil zaměstnance |
| 🏢 **Organizační jednotky (OU)** | Oddělení, pracoviště, lokace | Struktura organizace |
| 🔐 **Skupiny** | Název, GUID, typ (Security/Mail/M365) | Oprávnění a členství |
| 👥 **Členové skupin** | Kdo je ve které skupině | Správa přístupů |
| 🧑‍💼 **Manažer (nadřízený)** | Kdo je čí šéf | Organizační hierarchie |
| 👨‍👩‍👧‍👦 **Podřízení** | Kolik má kdo podřízených | Hierarchie vedení |
| 📋 **Atributy uživatele** | Všechny vlastní atributy | Rozšířené informace |

---

## 📝 Postup v Azure Portal

### Krok 1️⃣: Přihlášení

```
URL: https://portal.azure.com
```

Přihlaš se účtem s **Global Administrator** nebo **Application Administrator** rolí.

---

### Krok 2️⃣: Najdi aplikaci ERDMS

**Navigace:**
```
Microsoft Entra ID 
  → App registrations 
  → All applications
  → Najdi: "ERDMS"
```

**Ověř Application ID:**
```
92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
```

---

### Krok 3️⃣: Otevři API permissions

**Navigace:**
```
[ERDMS aplikace] → API permissions
```

**Aktuální stav:** Pravděpodobně máš jen `User.Read` (Delegated)

---

### Krok 4️⃣: Přidej Application permissions

⚠️ **DŮLEŽITÉ:** Musí být **Application permissions**, NE Delegated!

**Postup:**
1. Klikni **"+ Add a permission"**
2. Vyber **"Microsoft Graph"**
3. Vyber **"Application permissions"** ⚠️
4. Zaškrtni následující oprávnění:

#### ✅ MINIMÁLNÍ oprávnění (pro základní funkčnost):

```
┌─────────────────────────────────────────────────────────────┐
│ User.Read.All                                               │
│ ├─ Číst profily všech uživatelů                            │
│ ├─ Získat jméno, email, telefon, pozice, oddělení          │
│ └─ Číst organizační strukturu (manager, direct reports)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Group.Read.All                                              │
│ ├─ Číst všechny skupiny                                     │
│ ├─ Získat GUID, název, popis, typ skupiny                   │
│ └─ Zjistit členství uživatele ve skupinách                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GroupMember.Read.All                                        │
│ ├─ Číst členy všech skupin                                  │
│ └─ Zjistit, kdo je ve které skupině                         │
└─────────────────────────────────────────────────────────────┘
```

#### 🌟 DOPORUČENÁ oprávnění (pro pokročilé funkce):

```
┌─────────────────────────────────────────────────────────────┐
│ Directory.Read.All                                          │
│ ├─ Číst celý adresář Entra ID                              │
│ ├─ Zahrnuje všechna výše uvedená oprávnění                  │
│ ├─ + Organizační jednotky (OU)                              │
│ ├─ + Vlastní atributy (custom attributes)                   │
│ ├─ + Administrativní jednotky                                │
│ └─ + Kompletní organizační struktura                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OrgContact.Read.All                                         │
│ ├─ Číst organizační kontakty                                │
│ └─ Externí kontakty v adresáři                              │
└─────────────────────────────────────────────────────────────┘
```

5. Klikni **"Add permissions"**

---

### Krok 5️⃣: Grant Admin Consent (KRITICKÉ! 🚨)

⚠️ **BEZ TOHOTO KROKU API NEBUDE FUNGOVAT!**

**Postup:**
1. V sekci **API permissions** uvidíš tlačítko:
   ```
   ⚠️ Grant admin consent for [Zachranka]
   ```
2. Klikni na něj
3. Vyskakovací okno: potvrď **"Yes"**
4. Počkej na dokončení (1-2 sekundy)

**Ověř výsledek:**
- Ve sloupci **"Status"** musí být **zelené zatržítko ✓** u VŠECH oprávnění
- Text: **"Granted for [Zachranka]"**

---

### Krok 6️⃣: Ověř oprávnění

**Očekávaný výsledek:**

| API / Permission Name | Type | Status |
|-----------------------|------|--------|
| Microsoft Graph |  |  |
| ├─ User.Read | Delegated | ✅ Granted |
| ├─ User.Read.All | **Application** | ✅ **Granted** |
| ├─ Group.Read.All | **Application** | ✅ **Granted** |
| ├─ GroupMember.Read.All | **Application** | ✅ **Granted** |
| └─ Directory.Read.All | **Application** | ✅ **Granted** *(volitelné)* |

---

## 🧪 Test (pro IT admina)

Po nastavení oprávnění můžeš otestovat:

### Test 1: Základní připojení
```bash
ssh root@akd-www-web01.zachranka.cz
cd /var/www/eeo2025/server
node test-graph-api.js
```

**Očekávaný výstup:**
```
✅ EntraService initialized
✅ Testování getUserById...
✅ User loaded: Holovský Robert | ZZSSK
✅ Testování getUserGroups...
✅ Nalezeno 8 skupin
```

### Test 2: API endpoint
```bash
# Na serveru (po spuštění aplikace)
systemctl restart eeo2025-api.service
systemctl status eeo2025-api.service
```

### Test 3: Dashboard
1. Otevři: https://eeo2025.zachranka.cz
2. Přihlaš se přes Microsoft
3. Měl bys vidět:
   - ✅ **EntraID (GUID)** v pravé části
   - ✅ **Členství ve skupinách** s GUID
   - ✅ **Nadřízený** (pokud má uživatel managera)
   - ✅ **Podřízení** (pokud má podřízené)
   - ✅ **Tab "Zaměstnanci"** se seznamem prvních 50 kolegů

---

## 🔒 Bezpečnost

### Co tato oprávnění UMOŽŇUJÍ:
✅ Aplikace může **číst** všechny uživatele a skupiny  
✅ Aplikace získá GUID, jména, emaily, pozice, oddělení  
✅ Aplikace uvidí organizační strukturu (kdo je čí šéf)  

### Co tato oprávnění NEUMOŽŇUJÍ:
❌ **Zapisovat** nebo měnit uživatele  
❌ **Mazat** uživatele nebo skupiny  
❌ **Měnit** hesla  
❌ **Měnit** členství ve skupinách  
❌ **Přidávat** nové uživatele  

**Oprávnění jsou pouze pro ČTENÍ (Read.All)!**

---

## 🐛 Řešení problémů

### ❌ Chyba: "Insufficient privileges to complete the operation"

**Příčina:** Chybí Admin Consent

**Řešení:**
1. Azure Portal → API permissions
2. Klikni **"Grant admin consent for [Tenant]"**
3. Potvrď "Yes"
4. Restart serveru: `systemctl restart eeo2025-api.service`

---

### ❌ Dashboard neukazuje skupiny

**Příčina:** Buď chybí oprávnění, nebo starý token v session

**Řešení:**
1. Zkontroluj oprávnění v Azure Portal (zelené zatržítko?)
2. Odhlásit se z aplikace
3. Smazat cookies
4. Znovu se přihlásit

---

### ❌ "Application permissions need to be consented by an administrator"

**Příčina:** Application permissions VŽDY vyžadují admin consent

**Řešení:**
1. Musí schválit Global Admin nebo Application Admin
2. V Azure Portal: "Grant admin consent"

---

## 📞 Kontakt

Pokud máš dotazy nebo problém:
- **IT Admin:** Robert Holovský (u03924@zachranka.cz)
- **Server:** akd-www-web01.zachranka.cz
- **Aplikace:** https://eeo2025.zachranka.cz

---

## ✅ Checklist pro dokončení

- [ ] Přihlášen do Azure Portal
- [ ] Našel aplikaci ERDMS (92eaadde-7e3e-4ad1-8c45-3b875ff5c76b)
- [ ] Přidáno oprávnění: **User.Read.All** (Application)
- [ ] Přidáno oprávnění: **Group.Read.All** (Application)
- [ ] Přidáno oprávnění: **GroupMember.Read.All** (Application)
- [ ] Volitelně: **Directory.Read.All** (Application)
- [ ] Kliknuto: **"Grant admin consent"** ✅
- [ ] Ověřeno: Zelené zatržítko u všech oprávnění
- [ ] Test: `node test-graph-api.js` funguje
- [ ] Test: Dashboard zobrazuje skupiny s GUID
- [ ] Test: Tab "Zaměstnanci" zobrazuje seznam

---

**Dokumentaci vytvořil:** GitHub Copilot  
**Datum:** 3. prosince 2025  
**Verze:** 1.0
