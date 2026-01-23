#!/bin/bash
# Script pro vyčištění localStorage pro Orders V3
# Použij v browser console:

cat << 'EOF'
// ==================================================================
// VYČIŠTĚNÍ ORDERS V3 LOCALSTORAGE
// ==================================================================
// Zkopíruj tento kód a spusť v browser konzoli (F12)

// Najít všechny klíče související s Orders V3
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('ordersV3_columnOrder') || key.includes('ordersV3_columnVisibility'))) {
    keysToRemove.push(key);
  }
}

// Vymazat
keysToRemove.forEach(key => {
  console.log('🗑️ Removing:', key);
  localStorage.removeItem(key);
});

console.log('✅ Orders V3 localStorage cleaned!');
console.log('🔄 Refresh page to see default column order');

// ==================================================================
EOF
