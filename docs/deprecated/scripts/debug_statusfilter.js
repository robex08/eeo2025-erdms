// DEBUG skript - zkontroluje localStorage statusFilter pro aktuálního uživatele
// Spust tento kód v konzoli browseru na stránce Orders25List

console.log('=== DEBUG StatusFilter ===');

// Získej aktuální username
const username = localStorage.getItem('username');
console.log('Username:', username);

// Zkontroluj statusFilter pro aktuálního uživatele
const statusFilterKey = `orderStatusFilter_${username}`;
const statusFilter = localStorage.getItem(statusFilterKey);
console.log('StatusFilter key:', statusFilterKey);
console.log('StatusFilter value (raw):', statusFilter);

if (statusFilter) {
  try {
    const parsed = JSON.parse(statusFilter);
    console.log('StatusFilter (parsed):', parsed);
    console.log('Contains "Čeká se"?', parsed.includes('Čeká se'));
  } catch (e) {
    console.error('Parse error:', e);
  }
}

// Zkontroluj všechny orders v memory
if (window.React && window.React._internals) {
  console.log('React debug info available');
}

console.log('localStorage keys related to orders:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.includes('order') || key.includes('status') || key.includes('filter')) {
    console.log(`  ${key}: ${localStorage.getItem(key)}`);
  }
}