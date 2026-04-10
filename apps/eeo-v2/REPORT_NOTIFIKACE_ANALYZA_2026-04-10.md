# 📋 KOMPLETNÍ ANALÝZA NOTIFIKAČNÍHO SYSTÉMU
**Datum:** 10. dubna 2026  
**Analýza pro:** Dashboard notifikace + NotificationsPage  
**Status:** 🔴 KRITICKÉ PROBLÉMY NALEZENY

---

## 🎯 SHRNUTÍ PROBLÉMŮ

### 🔴 KRITICKÉ CHYBY V DASHBOARD WIDGETU:
1. ❌ **Backend nevrací `data_json`** - chybí strukturovaná data pro prokliky
2. ❌ **Backend nevrací `objekt_id`** - nelze spolehlivě prokliknout na objekt
3. ❌ **Frontend parsuje zprávy REGEXEM** - nespolehlivé, křehké řešení
4. ❌ **Neexistující sloupec** `vytvoril_uzivatel_id` - SQL chyba

### ⚠️ PROBLÉMY V NotificationsPage:
- ✅ Má správnou logiku pro navigaci
- ✅ Používá `objekt_id` a `data.order_id`
- ⚠️ Ale pokud backend nevrací `data_json` správně, prokliky nefungují

---

## 📊 STRUKTURA DATABÁZE

### Tabulka: `25_notifikace`
```sql
CREATE TABLE 25_notifikace (
    id INT PRIMARY KEY AUTO_INCREMENT,
    typ VARCHAR(100),                    -- ORDER_CREATED, INVOICE_CREATED, etc.
    nadpis VARCHAR(500),                 -- Nadpis notifikace
    zprava TEXT,                         -- HTML zpráva (může obsahovat čísla)
    data_json TEXT,                      -- 🎯 JSON data: {order_id, order_number, invoice_id, ...}
    od_uzivatele_id INT,                 -- Kdo vytvořil notifikaci
    pro_uzivatele_id INT,                -- Pro koho (může být NULL pokud pro_vsechny=1)
    prijemci_json TEXT,                  -- JSON pole ID uživatelů
    pro_vsechny TINYINT(1),             -- 1 = pro všechny uživatele
    priorita ENUM('low','normal','high','urgent'),
    kategorie VARCHAR(100),              -- general, order, invoice, todo, alarm
    odeslat_email TINYINT(1),
    objekt_typ VARCHAR(50),              -- 🎯 'order', 'faktura', 'smlouva', etc.
    objekt_id INT,                       -- 🎯 ID objektu (objednávky, faktury)
    dt_created DATETIME,
    dt_expires DATETIME,
    aktivni TINYINT(1) DEFAULT 1
);
```

### Tabulka: `25_notifikace_precteni`
```sql
CREATE TABLE 25_notifikace_precteni (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notifikace_id INT,                   -- FK na 25_notifikace
    uzivatel_id INT,                     -- FK na 25_uzivatele
    precteno TINYINT(1) DEFAULT 0,
    dt_precteno DATETIME,
    skryto TINYINT(1) DEFAULT 0,
    dt_skryto DATETIME,
    smazano TINYINT(1) DEFAULT 0,
    dt_smazano DATETIME
);
```

---

## 🔍 JAK FUNGUJE SPRÁVNÝ SYSTÉM (NotificationsPage)

### Backend: `notificationHandlers.php` - funkce `handle_notifications_list()`

```php
// ✅ SPRÁVNĚ - vrací všechna potřebná data:
$select_columns = "n.id,
    n.typ,
    n.nadpis,
    n.zprava,
    n.priorita,
    n.kategorie,
    n.objekt_typ,           // ✅ Typ objektu
    n.objekt_id,            // ✅ ID objektu
    n.data_json,            // ✅ JSON data
    n.dt_created,
    nr.precteno,
    nr.dt_precteno,
    nr.skryto,
    nr.dt_skryto";

// Formátování pro frontend:
$item = array(
    'objekt_typ' => $notif['objekt_typ'],
    'objekt_id' => $notif['objekt_id'] ? (int)$notif['objekt_id'] : null,
    'data' => $notif['data_json'] ? json_decode($notif['data_json'], true) : null,
    // ...
);
```

### Frontend: `NotificationsPage.js` - navigace na objednávku

```javascript
// ✅ SPRÁVNĚ - používá objekt_id a data.order_id:
const data = notification.data || {};
const orderId = data.order_id || notification.objekt_id;

if (notification.typ && notification.typ.includes('order') && orderId) {
    // Kontrola zamčení...
    navigate(`/order-form-25?edit=${targetOrderId}`, { 
        state: { returnTo: '/notifications' } 
    });
}
```

### Příklad `data_json` obsahu:
```json
{
    "order_id": 12345,
    "order_number": "0-0142/75030926/2026/IT",
    "old_status": "NOVA",
    "new_status": "KE_SCHVALENI",
    "changed_by_user_id": 67,
    "changed_by_username": "jan.novak"
}
```

---

## ❌ CO JE ŠPATNĚ V DASHBOARD WIDGETU

### Backend: `dashboardHandlers.php` - funkce `_dashboard_get_notifications_recent()`

```php
// ❌ ŠPATNĚ - chybí data_json:
$stmt = $db->prepare("
    SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
           n.objekt_typ, n.objekt_id, n.dt_created,  // ✅ objekt_typ a objekt_id jsou
           nr.precteno, nr.skryto, nr.dt_precteno
           // ❌ CHYBÍ: n.data_json                    
    FROM `" . TBL_NOTIFIKACE . "` n
    ...
");

// ❌ NEVRACÍ parsovaný data_json jako 'data'
return $stmt->fetchAll(PDO::FETCH_ASSOC);
```

### Frontend: `DashboardPage.js` - NotificationsWidget

```javascript
// ❌ ŠPATNĚ - parsuje zprávu regexem místo použití data/objekt_id:
const parseNotificationMessage = (n) => {
    const text = n.nadpis || n.zprava || '';
    
    // ❌ Regex pro číslo objednávky
    const orderRegex = /(0-\d{4}\/\d+\/\d{4}\/[A-Z]+)/;
    const orderMatch = text.match(orderRegex);
    
    return {
        orderNumber: orderMatch ? orderMatch[1] : null,
        // ❌ Ale co když zpráva nemá číslo? Co když je formát jiný?
    };
};

// ❌ Podmínka je křehká:
if (parsed.orderNumber && n.objekt_typ === 'objednavka' && n.objekt_id) {
    // Proklik funguje JEN pokud regex najde číslo VE SPRÁVNÉM FORMÁTU
}
```

---

## 🎯 CO CHYBÍ / CO JE ŠPATNĚ

### 1. Backend `_dashboard_get_notifications_recent()`:
- ❌ Nevrací `data_json`
- ❌ Neparsuje `data_json` na `data` objekt (jako v `handle_notifications_list`)
- ⚠️ Vrací `objekt_typ` a `objekt_id` - to je dobře, ale NESTAČÍ to

### 2. Frontend `NotificationsWidget`:
- ❌ Spoléhá se na REGEX parsování zpráv místo použití `data.order_number`
- ❌ Nepouzívá `data.order_id` jako fallback
- ❌ Ignoruje `data.invoice_id` a další možnosti
- ❌ Když regex selže, proklik nefunguje i když máme `objekt_id`

### 3. Nekonzistence názvů:
- Backend někde používá: `objekt_typ = 'order'`
- Frontend někdy testuje: `objekt_typ === 'objednavka'`
- **Není jasné, co je správně!**

---

## ✅ KOMPLETNÍ ŘEŠENÍ

### KROK 1: Opravit Backend `_dashboard_get_notifications_recent()`

```php
/**
 * Notifikace za posledních N dní (včetně přečtených)
 * Vrací pole s příznakem precteno pro FE styling (přečtené = zeslabené)
 */
function _dashboard_get_notifications_recent($db, $user_id, $days = 7, $limit = 15) {
    $stmt = $db->prepare("
        SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
               n.objekt_typ, n.objekt_id, n.data_json, n.dt_created,
               nr.precteno, nr.skryto, nr.dt_precteno
        FROM `" . TBL_NOTIFIKACE . "` n
        INNER JOIN `" . TBL_NOTIFIKACE_PRECTENI . "` nr 
            ON n.id = nr.notifikace_id
        WHERE n.aktivni = 1
          AND nr.uzivatel_id = ?
          AND nr.smazano = 0
          AND nr.skryto = 0
          AND (n.dt_expires IS NULL OR n.dt_expires > NOW())
          AND n.dt_created >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY nr.precteno ASC, n.dt_created DESC
        LIMIT " . (int)$limit . "
    ");
    $stmt->execute([$user_id, (int)$days]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ✅ Parsuj data_json na 'data' objekt (stejně jako v handle_notifications_list)
    return array_map(function($notif) {
        return [
            'id' => (int)$notif['id'],
            'typ' => $notif['typ'],
            'nadpis' => $notif['nadpis'],
            'zprava' => $notif['zprava'],
            'priorita' => $notif['priorita'],
            'kategorie' => $notif['kategorie'],
            'objekt_typ' => $notif['objekt_typ'],
            'objekt_id' => $notif['objekt_id'] ? (int)$notif['objekt_id'] : null,
            'data' => $notif['data_json'] ? json_decode($notif['data_json'], true) : null,
            'precteno' => $notif['precteno'],
            'dt_precteno' => $notif['dt_precteno'],
            'dt_created' => $notif['dt_created']
        ];
    }, $notifications);
}
```

### KROK 2: Přepsat Frontend `NotificationsWidget` - ŽÁDNÝ REGEX!

```javascript
function NotificationsWidget({ notifications, navigate }) {
  if (!notifications || notifications.length === 0) {
    return <WidgetBody><EmptyState>Žádné notifikace za posledních 7 dní</EmptyState></WidgetBody>;
  }

  const unreadCount = notifications.filter(n => !n.precteno || n.precteno === '0' || n.precteno === 0).length;

  const getDaysAge = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // ✅ SPRÁVNÁ NAVIGACE - stejně jako NotificationsPage
  const handleNotificationClick = (n) => {
    const data = n.data || {};
    const orderId = data.order_id || n.objekt_id;
    
    // Notifikace objednávek - proklik na detail
    if (n.objekt_typ && (n.objekt_typ === 'order' || n.objekt_typ === 'objednavka') && orderId) {
      navigate(`/order-form-25?edit=${orderId}`, { state: { returnTo: '/dashboard' } });
    }
    // Notifikace faktur - proklik na evidenci
    else if (n.objekt_typ && n.objekt_typ === 'faktura' && n.objekt_id) {
      navigate('/invoice-evidence', { state: { editInvoiceId: n.objekt_id, returnTo: '/dashboard' } });
    }
    // Ostatní - na seznam notifikací
    else {
      navigate('/notifications');
    }
  };

  // ✅ Zobraz číslo objednávky/faktury z data.order_number, ne z regexu zprávy
  const getObjectInfo = (n) => {
    const data = n.data || {};
    if (data.order_number) {
      return { type: 'Obj', number: data.order_number };
    }
    if (data.invoice_number) {
      return { type: 'FA', number: data.invoice_number };
    }
    return null;
  };

  return (
    <WidgetBody>
      {unreadCount > 0 && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${theme.colors.gray100}` }}>
          <strong style={{ color: '#1d4ed8' }}>{unreadCount}</strong> nepřečten{unreadCount === 1 ? 'á' : unreadCount < 5 ? 'é' : 'ých'}
        </div>
      )}
      {notifications.map(n => {
        const isRead = n.precteno && n.precteno !== '0' && n.precteno !== 0;
        const daysAge = getDaysAge(n.dt_created);
        const objectInfo = getObjectInfo(n);
        
        return (
          <ListItem 
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            style={{ opacity: isRead ? 0.5 : 1 }}
          >
            <ListItemLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListItemTitle style={{ fontWeight: isRead ? 400 : 500 }}>
                  {n.nadpis || n.zprava}
                </ListItemTitle>
                {!isRead && (
                  <span style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: '#3b82f6', 
                    flexShrink: 0 
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.3rem' }}>
                {daysAge !== null && (
                  <Badge
                    $bg={daysAge > 7 ? '#fee2e2' : (daysAge > 2 ? '#dbeafe' : '#dcfce7')}
                    $color={daysAge > 7 ? '#dc2626' : (daysAge > 2 ? '#1d4ed8' : '#16a34a')}
                  >
                    {daysAge === 0 ? 'dnes' : (daysAge === 1 ? 'včera' : `před ${daysAge} d`)}
                  </Badge>
                )}
                {objectInfo && (
                  <ListItemMeta style={{ margin: 0 }}>
                    {objectInfo.type}: {objectInfo.number}
                  </ListItemMeta>
                )}
              </div>
            </ListItemLeft>
            <ListItemRight>
              <NotifDot $color={isRead ? '#cbd5e1' : getNotifColor(n.priorita)} />
            </ListItemRight>
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/notifications')}>
          Všechny notifikace <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}
```

---

## 🔍 DODATEČNÉ ZJIŠTĚNÍ - KONZISTENCE NÁZVŮ

### Otázka: Co je správně - 'order' nebo 'objednavka'?

**Kontrola v kódu:**

```bash
grep -r "objekt_typ.*order" apps/eeo-v2/api-legacy/**/*.php
grep -r "objekt_typ.*objednavka" apps/eeo-v2/api-legacy/**/*.php
```

**Výsledek:** Backend používá **`'order'`** (anglicky)

**Frontend musí testovat OBOJÍ** (kvůli legacy datům):
```javascript
if (n.objekt_typ === 'order' || n.objekt_typ === 'objednavka')
```

---

## 📋 AKČNÍ PLÁN - PRIORITA

### 🔴 VYSOKÁ PRIORITA (okamžitě):
1. ✅ Opravit `_dashboard_get_notifications_recent()` - přidat `data_json` + parsování
2. ✅ Přepsat `NotificationsWidget` - odstranit REGEX, použít `data` a `objekt_id`
3. ✅ Otestovat prokliky na objednávky a faktury

### ⚠️ STŘEDNÍ PRIORITA (brzy):
4. Zkontrolovat NotificationsPage - jestli tam fungují prokliky (pokud backend vrací správná data)
5. Unifikovat názvy: všude používat 'order' nebo všude 'objednavka'

### 📝 NÍZKÁ PRIORITA (později):
6. Přidat info "od koho" notifikace přišla (vyžaduje JOIN na 25_uzivatele přes `od_uzivatele_id`)
7. Zvážit cache pro notifikace (redis?)

---

## 🎯 ZÁVĚR

**HLAVNÍ PROBLÉM:** Dashboard widget parsuje zprávy regexem místo použití strukturovaných dat z `data_json` a `objekt_id`.

**ŘEŠENÍ:** 
1. Backend musí vracet `data_json` (parsovaný jako `data`)
2. Frontend musí používat `data.order_id`, `data.order_number`, `objekt_id` - NE regex

**DŮSLEDEK:** Po opravě budou prokliky fungovat 100% spolehlivě podle typu objektu, ne podle formátu zprávy.

---

**Vytvořil:** GitHub Copilot  
**Datum:** 2026-04-10  
**Status:** 🔴 ČEKÁ NA IMPLEMENTACI
