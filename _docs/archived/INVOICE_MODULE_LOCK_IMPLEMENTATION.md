# 🔒 Implementace LOCK/UNLOCK pro modul faktur

## 📋 Přehled

Implementace zamykání objednávek při práci s fakturami v modulu InvoiceEvidencePage.

## ✅ HOTOVO - Frontend

### 1. API funkce (apiOrderV2.js)
- ✅ `lockOrderV2(orderId, token, username, force)` - Zamkne objednávku
- ✅ `unlockOrderV2(orderId, token, username)` - Odemkne objednávku

### 2. InvoiceEvidencePage.js
- ✅ Import `lockOrderV2` a `unlockOrderV2`
- ✅ `loadOrderData()` - Zamyká objednávku při načtení (`await lockOrderV2(...)`)
- ✅ `useEffect` cleanup - Odemyká objednávku při unmount komponenty

### 3. Kontrola zamčení
- ✅ `handleSelectOrder()` - Už má kontrolu `orderCheck?.lock_info?.locked`
- ✅ Dialog upozornění když je objednávka zamčená jiným uživatelem

## 🚧 ZBÝVÁ DOKONČIT - Backend

### Backend endpointy (PHP)

Potřebujete vytvořit 2 nové endpointy v `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/`:

#### 1. Endpoint POST /order-v2/{id}/lock

**Soubor:** orderHandlers.php nebo nový lockHandlers.php

```php
function handle_order_v2_lock($db, $token_data, $order_id, $post_data) {
    $uzivatel_id = $token_data['uzivatel_id'];
    $force = isset($post_data['force']) && $post_data['force'] === true;
    
    // Kontrola oprávnění - může editovat objednávku?
    if (!canEditOrder($order_id, $uzivatel_id, $token_data)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k editaci této objednávky'
        ]);
        return;
    }
    
    // Kontrola zda je objednávka již zamčená
    $check_stmt = $db->prepare("
        SELECT zamek_uzivatel_id, dt_zamek,
               CONCAT(u.jmeno, ' ', u.prijmeni) as locked_by_name
        FROM " . get_orders_table_name() . " o
        LEFT JOIN 25_uzivatele u ON u.id = o.zamek_uzivatel_id
        WHERE o.id = :order_id
    ");
    $check_stmt->execute([':order_id' => $order_id]);
    $lock_info = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($lock_info && $lock_info['zamek_uzivatel_id'] && $lock_info['zamek_uzivatel_id'] != $uzivatel_id) {
        // Už je zamčená jiným uživatelem
        if (!$force) {
            http_response_code(423); // 423 Locked
            echo json_encode([
                'status' => 'error',
                'code' => 'LOCKED',
                'message' => 'Objednávka je zamčená uživatelem: ' . $lock_info['locked_by_name'],
                'lock_info' => [
                    'locked_by_user_id' => $lock_info['zamek_uzivatel_id'],
                    'locked_by_user_fullname' => $lock_info['locked_by_name'],
                    'locked_at' => $lock_info['dt_zamek']
                ]
            ]);
            return;
        }
        
        // Force unlock - pouze pro SUPERADMIN/ADMINISTRATOR
        if (!isAdmin($token_data)) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Pouze administrátor může převzít zamčenou objednávku'
            ]);
            return;
        }
    }
    
    // Zamkni objednávku
    $lock_stmt = $db->prepare(lockOrderQuery());
    $lock_stmt->execute([
        ':id' => $order_id,
        ':user_id' => $uzivatel_id
    ]);
    
    echo json_encode([
        'status' => 'ok',
        'message' => 'Objednávka zamčena pro editaci',
        'data' => [
            'order_id' => $order_id,
            'locked_by_user_id' => $uzivatel_id,
            'locked_at' => date('Y-m-d H:i:s')
        ]
    ]);
}
```

#### 2. Endpoint POST /order-v2/{id}/unlock

```php
function handle_order_v2_unlock($db, $token_data, $order_id) {
    $uzivatel_id = $token_data['uzivatel_id'];
    
    // Kontrola zda má uživatel právo odemknout
    $check_stmt = $db->prepare("
        SELECT zamek_uzivatel_id
        FROM " . get_orders_table_name() . "
        WHERE id = :order_id
    ");
    $check_stmt->execute([':order_id' => $order_id]);
    $lock_info = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Může odemknout pouze ten, kdo zamkl, nebo admin
    if ($lock_info && $lock_info['zamek_uzivatel_id'] != $uzivatel_id && !isAdmin($token_data)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemůžete odemknout objednávku zamčenou jiným uživatelem'
        ]);
        return;
    }
    
    // Odemkni
    $unlock_stmt = $db->prepare(unlockOrderQuery());
    $unlock_stmt->execute([':id' => $order_id]);
    
    echo json_encode([
        'status' => 'ok',
        'message' => 'Objednávka odemčena',
        'data' => [
            'order_id' => $order_id,
            'unlocked_at' => date('Y-m-d H:i:s')
        ]
    ]);
}
```

#### 3. Přidat routing v main handler

Najděte soubor, kde se routují `/order-v2/*` endpointy (pravděpodobně main index.php nebo router.php) a přidejte:

```php
// POST /order-v2/{id}/lock
if ($method === 'POST' && preg_match('/^\/order-v2\/(\d+)\/lock$/', $path, $matches)) {
    $order_id = (int)$matches[1];
    $post_data = json_decode(file_get_contents('php://input'), true);
    handle_order_v2_lock($db, $token_data, $order_id, $post_data);
    exit;
}

// POST /order-v2/{id}/unlock
if ($method === 'POST' && preg_match('/^\/order-v2\/(\d+)\/unlock$/', $path, $matches)) {
    $order_id = (int)$matches[1];
    handle_order_v2_unlock($db, $token_data, $order_id);
    exit;
}
```

## 🔄 Flow

### Přidání faktury
1. Uživatel vybere objednávku v InvoiceEvidencePage
2. `handleSelectOrder()` zkontroluje `lock_info` - je zamčená? → Dialog
3. Pokud ne, `loadOrderData()` zavolá `lockOrderV2()` → zamkne
4. Uživatel pracuje s fakturami
5. Při zavření/opuštění `useEffect cleanup` → `unlockOrderV2()`

### Editace faktury v náhledu objednávky
1. Uživatel otevře objednávku v OrderForm25 → zamčena pro editaci
2. Klikne na "Upravit" fakturu v náhledu
3. **CHYBÍ:** Kontrola zda je objednávka zamčená jiným
4. Přesměrování do InvoiceEvidencePage
5. InvoiceEvidencePage se pokusí zamknout → **konflikt?**

## ⚠️ TODO

### OrderFormReadOnly.js - Kontrola LOCK před editací
Potřebujete přidat do `onEditInvoice` callbacku:

```javascript
const handleEditInvoice = async (faktura) => {
  // 🚨 KONTROLA: Je objednávka zamčená?
  try {
    const orderCheck = await getOrderV2(faktura.objednavka_id, token, username, false);
    
    if (orderCheck?.lock_info?.locked === true) {
      const lockInfo = orderCheck.lock_info;
      const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
      
      // Zobraz warning dialog
      showToast(`⚠️ Objednávka je právě editována uživatelem ${lockedByUserName}. Nelze upravit fakturu!`, 'error');
      return;
    }
  } catch (err) {
    console.warn('⚠️ Nepodařilo se zkontrolovat lock status:', err);
  }
  
  // Pokračuj s editací...
  onEditInvoice(faktura);
};
```

## 🧪 Testování

1. **Základní flow:**
   - Otevři InvoiceEvidencePage
   - Vyber objednávku → měla by se zamknout
   - Zkontroluj v DB: `SELECT dt_zamek, zamek_uzivatel_id FROM 25_objednavky WHERE id = X`
   - Zavři stránku → měla by se odemknout

2. **Konflikt - 2 uživatelé:**
   - Uživatel A: Otevře InvoiceEvidencePage s objednávkou #123
   - Uživatel B: Zkusí otevřít stejnou objednávku → měl by dostat warning dialog
   
3. **Admin force unlock:**
   - Uživatel A: Zamkne objednávku
   - Admin: Otevře stejnou objednávku s `force=true` → měl by převzít zámek

## 📊 Databázové sloupce

Tabulka `25_objednavky` již obsahuje:
- `dt_zamek` - DATETIME - čas zamčení
- `zamek_uzivatel_id` - INT - ID uživatele, který zamkl

## 🚀 Nasazení

1. Vytvořte backend endpointy (viz výše)
2. Přidejte routing
3. Otestujte pomocí Postman/cURL:
   ```bash
   # Lock
   curl -X POST "http://localhost/order-v2/123/lock" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Username: admin" \
     -H "Content-Type: application/json" \
     -d '{"force": false}'
   
   # Unlock
   curl -X POST "http://localhost/order-v2/123/unlock" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Username: admin"
   ```
4. Otestujte v prohlížeči kompletní flow

## 📝 Poznámky

- LOCK se automaticky odemyká při `window.beforeunload` (useEffect cleanup)
- Admin může převzít zámek s `force=true`
- Backend vrací HTTP 423 (Locked) když je objednávka zamčená jiným
- Frontend ukazuje dialog s kontakty na uživatele, který drží zámek
