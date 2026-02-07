# 🚫 Systémová objednávka ID = 1

## ⚠️ DŮLEŽITÉ PRAVIDLO

**Objednávka s `id = 1` je SYSTÉMOVÁ ŠABLONA a MUSÍ BÝT IGNOROVÁNA ve všech výpisech, statistikách a operacích!**

## 📍 Kde implementováno

### ✅ Mobilní dashboard
**Soubor:** `src/components/mobile/MobileDashboard.jsx`
```javascript
// Funkce: loadPendingApprovals()
const pending = orders.filter(order => {
  if (!order.id || order.id <= 1) return false; // Vyřaď koncepty a systémovou obj
  // ...
});
```

### ✅ Mobile Data Service
**Soubor:** `src/services/mobileDataService.js`
```javascript
// Funkce: calculateOrdersStats()
const validOrders = orders.filter(o => o.id && o.id > 1 && !o.isLocalConcept);
```

### ✅ Orders25List (Desktop)
**Soubor:** `src/pages/Orders25List.js`
```javascript
// 🚫 FILTR: Odstraň systémové šablony (ID <= 1)
const orderId = parseInt(o.id, 10);
return !isNaN(orderId) && orderId > 1;
```

## 🎯 Důvod
- ID = 1 slouží jako **systémová šablona** pro výchozí strukturu objednávky
- **Nesmí** se zobrazovat v seznamech uživatelům
- **Nesmí** být zahrnuta do statistik (počty, částky)
- **Nesmí** být editovatelná běžnými uživateli

## ✅ Checklist při implementaci nových funkcí

Při práci s objednávkami **VŽDY** kontroluj:
- [ ] Filtruj `order.id > 1` nebo `order.id && order.id !== 1`
- [ ] V seznamech: `.filter(o => o.id && o.id > 1)`
- [ ] Ve statistikách: započítávej pouze objednávky s `id > 1`
- [ ] V exportech: vynechávej objednávku s `id = 1`

## 📝 Poznámky
- Totéž platí pro koncepty (`!o.isLocalConcept`)
- Kombinace: `o.id && o.id > 1 && !o.isLocalConcept`

---
**Datum vytvoření:** 15. prosince 2025  
**Autor:** System Documentation
