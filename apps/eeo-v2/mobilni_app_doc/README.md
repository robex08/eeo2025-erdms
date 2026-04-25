# 📱 EEO API - Dokumentace pro mobilní aplikace

Tato složka obsahuje kompletní dokumentaci API endpointů pro integraci mobilních aplikací s EEO systémem.

---

## 📚 Obsah dokumentace

### 🔐 [1. Login & Autentizace](MOBILE_API_LOGIN_DOCUMENTATION.md)
**Endpoint:** `POST /api.eeo/login`

Dokumentace přihlašování, tokenů a jejich refreshe.

**Obsahuje:**
- Login endpoint s username/password
- Token struktura a životnost (24h)
- Token refresh endpoint
- Autentizace v dalších API calls
- Error handling
- Příklady kódu pro iOS, Android, React Native

---

### 👤 [2. Detail uživatele](MOBILE_API_USER_DETAIL_DOCUMENTATION.md)
**Endpoint:** `POST /api.eeo/user/detail`

Načtení detailních informací o uživateli včetně rolí, oprávnění a statistik.

**Obsahuje:**
- Načtení vlastního profilu
- Načtení jiného uživatele
- Kompletní struktura response (60+ polí)
- Role a oprávnění
- Organizační struktura (organizace, pozice, lokalita, úsek)
- Statistiky objednávek uživatele
- Příklady kódu pro iOS, Android, React Native

---

### 📊 [3. Statistiky objednávek](MOBILE_API_ORDER_STATS_DOCUMENTATION.md)
**Endpoint:** `POST /api.eeo/order-v3/stats`

Načtení statistik objednávek s podporou oprávnění a filtrování podle období.

**Obsahuje:**
- Podporovaná období (all, current-year, current-month, last-month, last-quarter)
- Počty podle stavů workflow (nové, ke schválení, rozpracované, atd.)
- Částky (celková, rozpracované, dokončené)
- Oprávnění (admin vidí vše, běžní uživatelé jen své objednávky)
- Dashboard layout příklady
- Příklady kódu pro iOS, Android, React Native

---

### 📋 [4. Seznam a detail objednávek](MOBILE_API_ORDER_LIST_DETAIL_DOCUMENTATION.md) ⭐ **NOVÉ**
**Endpointy:** 
- `POST /api.eeo/order-v3/list` - Seznam objednávek s pagingem
- `POST /api.eeo/order-v3/items` - Detail položek objednávky

Načtení seznamu objednávek a jejich detailů s lazy loadingem.

**Obsahuje:**
- **Práva a viditelnost** (admin vidí všechny, user jen vlastní objednávky)
- **Filtrování podle stavů** (NOVA, KE_SCHVALENI, SCHVALENA, POTVRZENA, atd.)
- **Paging pro mobil** (doporučeno: 5 objednávek na stránku)
- **Dvoustupňové načítání:** 
  - 1. krok: Seznam objednávek (základní údaje bez položek)
  - 2. krok: Detail položek konkrétní objednávky (lazy loading)
- **Kompletní struktura response** (60+ polí na objednávku)
- **Položky, přílohy, poznámky**
- UI komponenty pro mobilní design (cards, toggle tagy, load more)
- Příklady kódu pro iOS, Android, React Native
- FAQ (infinite scroll, filtrování, ceny, stahování příloh)

---

## 🔒 Autentizace

Všechny chráněné endpointy vyžadují:
```json
{
  "token": "base64_encoded_token",
  "username": "username",
  ...další parametry...
}
```

**⚠️ DŮLEŽITÉ:** Token a username se posílají v **POST body**, **NIKDY v HTTP headers**!

---

## 🌐 URL Endpointy

### **DEV prostředí:**
```
https://erdms.zachranka.cz/dev/api.eeo/
```

### **PRODUCTION prostředí:**
```
https://erdms.zachranka.cz/api.eeo/
```

---

## 📋 Quick Start

### 1. Přihlášení
```javascript
const loginResponse = await fetch('https://erdms.zachranka.cz/api.eeo/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'jan.novak',
    password: 'heslo123'
  })
});
const user = await loginResponse.json();
// Ulož user.token a user.username
```

### 2. Načtení profilu
```javascript
const profileResponse = await fetch('https://erdms.zachranka.cz/api.eeo/user/detail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: savedToken,
    username: savedUsername
  })
});
const profile = await profileResponse.json();
```

### 3. Načtení statistik
```javascript
const statsResponse = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: savedToken,
    username: savedUsername,
    period: 'current-year'
  })
});
const stats = await statsResponse.json();
```

### 4. Načtení seznamu objednávek (s pagingem)
```javascript
const ordersResponse = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: savedToken,
    username: savedUsername,
    page: 1,
    per_page: 5, // Mobilní paging
    filters: {
      stav: ["SCHVALENA"] // Filtr podle stavu
    }
  })
});
const ordersData = await ordersResponse.json();
// ordersData.data.orders = pole objednávek
// ordersData.data.pagination = info o stránkování

// 💡 DŮLEŽITÉ: Dynamické zobrazení částky podle fáze
ordersData.data.orders.forEach(order => {
  // Zjisti, kterou částku zobrazit podle stavu objednávky
  let displayPrice, priceLabel;
  
  if (order.pocet_faktur > 0 && order.faktury_celkova_castka_s_dph > 0) {
    displayPrice = order.faktury_celkova_castka_s_dph;
    priceLabel = "Fakturováno";
  } else if (order.pocet_polozek > 0 && order.cena_s_dph > 0) {
    displayPrice = order.cena_s_dph;
    priceLabel = "Cena položek";
  } else {
    displayPrice = order.max_cena_s_dph;
    priceLabel = "Max. cena";
  }
  
  console.log(`${order.cislo_objednavky}: ${priceLabel} = ${displayPrice} Kč`);
});
```

### 5. Načtení detailu objednávky (lazy loading)
```javascript
const detailResponse = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: savedToken,
    username: savedUsername,
    order_id: 415
  })
});
const detail = await detailResponse.json();
// detail.data.items = pole položek (podřádků)
// detail.data.attachments = pole příloh
// detail.data.notes = poznámky
```

---

## ✅ Checklist pro implementaci

- [ ] Implementovat login flow s token storage (Keychain/KeyStore)
- [ ] Implementovat token refresh (před expirací 24h)
- [ ] Implementovat automatické odhlášení při HTTP 401
- [ ] Načíst user profil při startu aplikace
- [ ] Zobrazit dashboard se statistikami objednávek
- [ ] Implementovat seznam objednávek s pagingem (5 záznamů na mobilu)
- [ ] Implementovat filtrování podle stavů (toggle tagy)
- [ ] Implementovat lazy loading detailu objednávky (položky, přílohy)
- [ ] Implementovat infinite scroll nebo "Load more" tlačítko
- [ ] Zobrazit počty objednávek podle stavů (statistiky)
- [ ] Implementovat error handling pro všechny endpointy
- [ ] Testovat v DEV prostředí
- [ ] Nasadit do produkce s HTTPS

---

## 🔧 Doporučené knihovny

### **iOS (Swift):**
- URLSession (built-in)
- Keychain (pro bezpečné ukládání tokenů)

### **Android (Kotlin):**
- OkHttp nebo Retrofit
- Gson nebo Moshi (JSON parsing)
- EncryptedSharedPreferences (pro bezpečné ukládání tokenů)

### **React Native / Expo:**
- fetch (built-in)
- expo-secure-store (pro bezpečné ukládání tokenů)
- AsyncStorage (pro ne-citlivá data)

---

## 📞 Kontakt a podpora

- **Dokumentace:** `/var/www/erdms-dev/apps/eeo-v2/mobilni_app_doc/`
- **API verze:** `v2025.03_25`
- **Frontend verze:** `2.40`
- **Support:** Kontaktuj vývojový tým

---

**Vytvořeno:** 25. dubna 2026  
**Poslední aktualizace:** 25. dubna 2026
