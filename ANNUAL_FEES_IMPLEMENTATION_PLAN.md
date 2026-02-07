# 🔥 PRIORITNÍ IMPLEMENTACE PRÁV - Roční poplatky

## 📋 AKTUÁLNÍ STAV
✅ **Práva v DB** - Všech 8 práv přidáno  
✅ **Admin role** - Má ANNUAL_FEES_MANAGE  
✅ **SQL migrace** - Připravena i pro PROD

## 🚀 PRIORITY IMPLEMENTACE

### PRIORITY 1 - KRITICKÉ (nutné před spuštěním)
```
1. Backend API kontroly práv v annualFeesHandlers.php  
2. Frontend hasPermission kontroly v AnnualFeesPage.js
3. Menu podmínka - skrýt odkaz bez práv
```

### PRIORITY 2 - DŮLEŽITÉ (bezpečnost)  
```
4. Hierarchické filtrování dat podle organizace
5. Error handling pro nedostatečná práva
6. Testy s různými uživateli
```

### PRIORITY 3 - NICE TO HAVE
```
7. Detailní audit log změn
8. Granulární práva pro různé typy poplatků  
9. Bulk operace s kontrolou práv
```

## 📁 SOUBORY K ÚPRAVĚ

### Backend (PHP)
```
📄 apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php
   - handleAnnualFeesList() - READ práva + hierarchie
   - handleAnnualFeesCreate() - CREATE práva  
   - handleAnnualFeesUpdate() - UPDATE práva
   - handleAnnualFeesDelete() - DELETE práva
   - handleAnnualFeesCreateItem() - ITEM_CREATE práva
   - handleAnnualFeesUpdateItem() - ITEM_UPDATE práva
   - handleAnnualFeesDeleteItem() - ITEM_DELETE práva

📄 apps/eeo-v2/api-legacy/api.eeo/api.php
   - Všechny annual-fees/* endpointy - základní auth kontrola
```

### Frontend (React)
```
📄 apps/eeo-v2/client/src/pages/AnnualFeesPage.js
   - hasPermission() kontroly pro všechna tlačítka
   - Podmíněné zobrazení formulářů
   - Error handling pro 403 Forbidden

📄 apps/eeo-v2/client/src/components/Navigation.js (nebo podobný)
   - Podmíněné zobrazení menu linku
```

## 🛠️ IMPLEMENTAČNÍ PATTERN

### Backend pattern:
```php
function handleAnnualFeesCreate($pdo, $data, $user) {
    // 1. Kontrola práv
    if (!hasAnyPermission($user, ['ANNUAL_FEES_CREATE', 'ANNUAL_FEES_MANAGE'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Nedostatečná oprávnění']);
        return;
    }
    
    // 2. Hierarchie (pokud není MANAGE)
    if (!hasPermission($user, 'ANNUAL_FEES_MANAGE')) {
        // Kontrola jestli může vytvořit pro danou organizaci
        if (!canAccessOrganization($user, $data['organizace_id'])) {
            http_response_code(403);
            return;
        }
    }
    
    // 3. Pokračuj s funkcí...
}
```

### Frontend pattern:
```jsx
// V AnnualFeesPage.js
const { hasPermission } = usePermissions();

// Tlačítka s podmínkou
{hasPermission(['ANNUAL_FEES_CREATE', 'ANNUAL_FEES_MANAGE']) && (
    <CreateButton onClick={handleCreate}>
        Nový poplatek
    </CreateButton>
)}
```

## 🔄 DALŠÍ KROKY

1. **Začni s backend kontrolami** - nejdříve zabezpečit API
2. **Pak frontend skrývání** - UX aby uživatel neviděl nedostupné akce  
3. **Testování** - s různými rolemi a právy
4. **PROD migrace** - až bude vše otestované

Chceš začít implementovat nějakou konkrétní část? Doporučuji začít s backend API kontrolami...