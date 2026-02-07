// Skript pro vymazání uložených šířek sloupců v OrdersV3
// Spustit v konzoli prohlížeče (F12)

console.log('🔍 Hledám uložené šířky sloupců OrdersV3...');

let cleared = 0;
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('ordersV3_columnSizing_')) {
    console.log(`🗑️  Mažu: ${key}`);
    localStorage.removeItem(key);
    cleared++;
  }
}

console.log(`✅ Vymazáno ${cleared} uložených konfigurací šířek sloupců`);
console.log('🔄 Refresh stránku (F5) pro načtení nových defaultních šířek');
