# ⚡ QUICK START - Microsoft Graph API

## Co teď udělat?

### ✅ Krok 1: Otevři Azure Portal

```
https://portal.azure.com
```

### ✅ Krok 2: Naviguj na aplikaci

```
Microsoft Entra ID 
  → App registrations 
  → ERDMS (92eaadde-7e3e-4ad1-8c45-3b875ff5c76b)
  → API permissions
```

### ✅ Krok 3: Přidej oprávnění

Klikni **"Add a permission"**:
1. Vyber **Microsoft Graph**
2. Vyber **Application permissions** ⚠️ (NE Delegated!)
3. Zaškrtni:
   - ✅ `User.Read.All`
   - ✅ `Group.Read.All`
   - ✅ `GroupMember.Read.All`
4. Klikni **"Add permissions"**

### ✅ Krok 4: Grant Admin Consent (KRITICKÉ!)

1. Klikni **"Grant admin consent for [Zachranka]"**
2. Potvrď **"Yes"**
3. ✅ Zkontroluj zelené zatržítko u všech oprávnění

### ✅ Krok 5: Test

```bash
cd /var/www/eeo2025/server
node test-graph-api.js
```

Měl bys vidět:
```
✅ EntraService initialized
✅ Nalezeno X skupin
```

### ✅ Krok 6: Restart serveru

```bash
systemctl restart eeo2025-api.service
```

### ✅ Krok 7: Otevři Dashboard

Přihlaš se a měl bys vidět:
- 🔐 Členství ve skupinách (s GUID)
- 🧑‍💼 Nadřízený
- 👥 Podřízení

---

## 🚨 Nejčastější chyba

### "Insufficient privileges"

**Příčina:** Zapomněl jsi na Admin Consent

**Řešení:**
1. Azure Portal → API permissions
2. Tlačítko **"Grant admin consent"**
3. Restart serveru

---

## 📖 Kompletní návod

`docs/ENTRA_GRAPH_API_SETUP.md`

---

**Hotovo za 5 minut! 🚀**
