// DOČASNÝ FIX - reset statusFilter pro prikazce.0000
// Spustit v console browseru na stránce Orders25List

const username = 'prikazce.0000';

// Všechny možné localStorage klíče pro statusFilter
const keys = [
  `orderStatusFilter_${username}`,
  `orders25List_statusFilter_${username}`,
  'orders25List_statusFilter',
  'orderStatusFilter'
];

console.log('🔧 RESET statusFilter pro uživatele:', username);

keys.forEach(key => {
  const current = localStorage.getItem(key);
  if (current) {
    console.log(`❌ Odstraňuji klíč: ${key} = ${current}`);
    localStorage.removeItem(key);
  }
});

// Nastav prázdný statusFilter (zobrazí všechny stavy)
const resetKey = `orders25List_statusFilter_${username}`;
localStorage.setItem(resetKey, JSON.stringify([]));
console.log(`✅ Nastaven prázdný statusFilter: ${resetKey} = []`);

console.log('🔄 Nyní proveď refresh stránky (F5)');