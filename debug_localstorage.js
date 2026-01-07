// Zkontroluj localStorage statusFilter pro uživatele
const username = 'jakub.dohnal'; // nebo jak se přesně jmenuje

// Možné klíče v localStorage
const keys = [
  `orderStatusFilter_${username}`,
  `orders25List_statusFilter_${username}`,
  'orders25List_statusFilter',
  'orderStatusFilter'
];

console.log('=== KONTROLA localStorage statusFilter ===');

keys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`Key: ${key}`);
    console.log(`Value: ${value}`);
    try {
      const parsed = JSON.parse(value);
      console.log(`Parsed:`, parsed);
      if (Array.isArray(parsed)) {
        console.log(`Contains "Čeká se": ${parsed.includes('Čeká se')}`);
      }
    } catch (e) {
      console.log(`Parse error:`, e);
    }
    console.log('---');
  }
});

// Kompletní dump všech localStorage klíčů
console.log('Všechny localStorage klíče:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  if (key.toLowerCase().includes('status') || key.toLowerCase().includes('filter')) {
    console.log(`${key}: ${value}`);
  }
}