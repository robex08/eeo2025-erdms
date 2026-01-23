// ==================================================================
// RESET ORDERS V3 SLOUPCŮ - KOMPLETNÍ VYČIŠTĚNÍ
// ==================================================================
// Zkopíruj tento kód a spusť v browser konzoli (F12)

console.log('🧹 Orders V3: Čištění localStorage...');

// Najít všechny klíče související s Orders V3
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (
    key.includes('ordersV3_columnOrder') || 
    key.includes('ordersV3_columnVisibility') ||
    key.includes('ordersV3_columnSizing')
  )) {
    keysToRemove.push(key);
  }
}

// Vymazat
if (keysToRemove.length === 0) {
  console.log('✅ Žádné Orders V3 klíče nenalezeny v localStorage');
} else {
  keysToRemove.forEach(key => {
    console.log('🗑️ Removing:', key);
    localStorage.removeItem(key);
  });
  console.log(`✅ Orders V3 localStorage cleaned! (${keysToRemove.length} keys removed)`);
}

console.log('');
console.log('🔄 Refresh page to see default settings (F5 nebo Ctrl+R)');
console.log('');
console.log('📋 Výchozí pořadí sloupců:');
console.log('  1. Expander');
console.log('  2. Approve');
console.log('  3. Datum');
console.log('  4. Ev. číslo');
console.log('  5. Financování ← TADY MUSÍ BÝT!');
console.log('  6. Objednatel/Garant');
console.log('  7. Příkazce/Schvalovatel');
console.log('  8. Dodavatel');
console.log('  9. Stav objednávky');
console.log(' 10. Stav registru');
console.log(' 11. Max. cena s DPH');
console.log(' 12. Cena s DPH');
console.log(' 13. Cena FA s DPH');
console.log(' 14. Actions');
console.log('');
console.log('💡 Po refreshi zkus přesunout sloupec Financování pomocí drag & drop');

// ==================================================================
