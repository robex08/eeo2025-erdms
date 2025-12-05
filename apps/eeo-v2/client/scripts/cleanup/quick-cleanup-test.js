// 🧹 RYCHLÉ VYČIŠTĚNÍ pro testování F5 persistence
// Spustit v browser console před testem

console.log('🧹 Rychlé vyčištění localStorage...');

// Vyčisti všechny draft klíče
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.includes('draft') || key.includes('order25')) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`🗑️ Odstraněn: ${key}`);
});

// Vyčisti i security context
if (window._securityContext) {
  window._securityContext.sessionSeed = null;
  console.log('🔄 Security context reset');
}

console.log(`✅ Vyčištěno ${keysToRemove.length} klíčů`);
console.log('💡 Nyní můžete testovat uložení a F5...');