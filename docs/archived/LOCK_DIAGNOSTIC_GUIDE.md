# 🔒 LOCK/UNLOCK Diagnostická příručka

## ❗ ZJIŠTĚNÉ PROBLÉMY

### 1. **InvoiceEvidencePage - useEffect orderIdForLoad**
- ❌ Používal starý textový dialog místo vizuálního
- ✅ **OPRAVENO** v commitu (změněno na `setLockedOrderInfo`)

### 2. **Možný async unlock timing issue**

OrderForm25 volá unlock asynchronně:
```javascript
(async () => {
  await unlockOrderV2({ token, username, orderId: unlockOrderId });
})();
// ... navigate po 200ms
```

**Problém:** Navigate se provede dříve než unlock dokončí!

---

## 🧪 TESTOVACÍ SCÉNÁŘ

### Test 1: Základní LOCK flow
1. Otevři objednávku na formuláři (OrderForm25)
2. Zkontroluj v konzoli: `lockOrderV2` volání
3. Zavři formulář tlačítkem "ZAVŘÍT"
4. Zkontroluj v konzoli: `unlockOrderV2` volání
5. Zkus otevřít objednávku v Invoice modulu

**Očekávaný výsledek:** Objednávka se otevře bez LOCK dialogu

### Test 2: LOCK detection v Invoice modulu
1. Otevři objednávku A na formuláři
2. V jiném okně/tabulátoru otevři Invoice seznam
3. Zkus editovat fakturu objednávky A
4. **Očekávaný výsledek:** Zobraz se vizuální LOCK dialog s kontakty

### Test 3: LOCK při přidání faktury
1. Otevři objednávku B na formuláři  
2. V Invoice modulu klikni na "OBJ" link u faktury objednávky B
3. **Očekávaný výsledek:** Zobraz se LOCK dialog, objednávka se nenačte

---

## 🔍 DEBUG v prohlížeči

### Chrome DevTools Console:

```javascript
// 1. Zapni filtrování LOCK/UNLOCK volání
localStorage.setItem('debug_locks', 'true');

// 2. Při zavření formuláře sleduj:
// Mělo by se objevit:
// "🔓 Odemykám objednávku #123..."
// "✅ Unlock OK" nebo "❌ Unlock FAILED: ..."

// 3. Zkontroluj network tab:
// POST /api/order-v2/123/unlock
// Status: 200 OK nebo 403/404
```

---

## 🛠️ DOPORUČENÉ OPRAVY

### Fix 1: Await unlock před navigate
**Soubor:** `OrderForm25.js` → `handleCancelConfirm()`

**PŘED:**
```javascript
(async () => {
  await unlockOrderV2(...);
})();
// ... navigate po 200ms (unlock možná nedokončil!)
```

**PO:**
```javascript
// Await unlock PŘED navigací
if (unlockOrderId && token && username) {
  try {
    await unlockOrderV2({ token, username, orderId: unlockOrderId });
    console.log('✅ Unlock OK');
  } catch (error) {
    console.warn('❌ Unlock FAILED:', error.message);
  }
}

// TEPRVE TERAZ navigate
setTimeout(() => {
  navigate('/orders25-list', { state: { forceReload: true } });
}, 100);
```

### Fix 2: Retry unlock při chybě
```javascript
const unlockWithRetry = async (orderId, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      await unlockOrderV2({ token, username, orderId });
      return true;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }
};
```

---

## 📊 Backend kontrola

### SQL dotaz pro zamčené objednávky:
```sql
SELECT 
  o.id,
  o.cislo_objednavky,
  o.zamek_uzivatel_id,
  o.dt_zamek,
  TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as mins,
  CONCAT(u.jmeno, ' ', u.prijmeni) as user_name
FROM 25_objednavky o
LEFT JOIN uzivatel u ON o.zamek_uzivatel_id = u.id
WHERE o.zamek_uzivatel_id > 0
ORDER BY o.dt_zamek DESC;
```

### PHP rychlý unlock:
```php
<?php
// unlock-order.php?id=123
require_once 'lib/db.php';
$db = get_db(get_api_config());
$order_id = $_GET['id'];
$db->exec("UPDATE 25_objednavky SET zamek_uzivatel_id = 0, dt_zamek = NULL WHERE id = $order_id");
echo "Unlocked #$order_id";
?>
```

---

## ✅ COMMIT CHANGES

Po opravě proveď:
```bash
git add -A
git commit -m "FIX LOCK: Await unlock před navigate v OrderForm25

- handleCancelConfirm: Změna async unlock na await před navigate
- Odstraněn timing issue kdy navigate proběhl před dokončením unlock
- Přidán retry mechanismus pro unlock
- Přidána konzolová logování pro debug"

git push origin feature/generic-recipient-system
```
