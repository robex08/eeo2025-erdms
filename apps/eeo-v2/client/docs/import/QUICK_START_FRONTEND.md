# 🚀 Quick Start - Import Starých Objednávek

## ✅ Co je hotové

Frontend implementace pro import starých objednávek ze DEMO databáze do nového systému orders25.

## 📁 Upravené soubory

1. **`src/services/api25orders.js`** - Přidána funkce `importOldOrders25()`
2. **`src/components/ImportOldOrdersModal.js`** - NOVÁ komponenta pro import modal
3. **`src/pages/Orders.js`** - Integrace modalu + handlery

## 🎯 Jak to použít

### Uživatelská perspektiva:

1. Jdi na stránku `/orders`
2. Označ checkboxy u objednávek, které chceš importovat
3. Klikni na tlačítko **"Převést do nového seznamu"** (vedle refresh)
4. V modalu klikni **"Importovat (X)"**
5. Sleduj progress bar
6. Zkontroluj výsledky v modalu
7. Zavři modal → seznam se automaticky refreshne

### Vývojářská perspektiva:

```javascript
// Import service
import { importOldOrders25 } from '../services/api25orders';

// Použití
const result = await importOldOrders25({
  token,
  username,
  oldOrderIds: [1, 25, 33],
  tabulkaObj: 'DEMO_objednavky_2025',
  tabulkaOpriloh: 'DEMO_pripojene_odokumenty'
});

// Response
{
  success: true,
  imported_count: 2,
  failed_count: 1,
  results: [
    { old_id: 1, new_id: 156, status: 'OK', ... },
    { old_id: 25, new_id: null, status: 'ERROR', error: '...' }
  ]
}
```

## 🎨 Features

- ✅ Moderní gradient design
- ✅ Animovaný progress bar
- ✅ Real-time feedback
- ✅ Detailní výsledky pro každou objednávku
- ✅ Statistiky (úspěšných/selhání)
- ✅ Error handling
- ✅ Auto-refresh po importu
- ✅ Responsive (mobile friendly)

## 🧪 Testování

```bash
# 1. Spustit backend (musí běžet API endpoint /orders25/import-oldies)
# 2. Spustit frontend
npm start

# 3. Otevřít http://localhost:3000/orders
# 4. Vybrat objednávky checkboxy
# 5. Kliknout "Převést do nového seznamu"
# 6. Sledovat import modal
```

## 📚 Dokumentace

- **Backend API:** `docs/import/IMPORT_OLDIES_API_DOCUMENTATION.md`
- **Frontend Spec:** `docs/import/FE_PROMPT_IMPORT_OLDIES.md`
- **Implementace Detail:** `docs/import/FRONTEND_IMPORT_IMPLEMENTATION.md`

## ⚠️ Požadavky

- Backend musí obsahovat endpoint `POST /orders25/import-oldies`
- V `.env` nastavit `REACT_APP_DB_ORDER_KEY=DEMO_objednavky_2025`
- User musí být přihlášen (token + username z AuthContext)
- V localStorage musí být `user_id`

## 🐛 Možné problémy

| Problém | Řešení |
|---------|--------|
| "Chybí ID uživatele" | Zkontroluj `localStorage.getItem('user_id')` |
| "Token expired" | Odhlásit/přihlásit znovu |
| "Parametr old_order_ids musí být pole" | Backend neobdržel správný formát |
| "Objednávka již existuje" | Duplikát v nové DB - OK, přeskočí se |

## 🎉 Status

✅ **READY FOR TESTING**

Vše je implementováno a připraveno k testování!
