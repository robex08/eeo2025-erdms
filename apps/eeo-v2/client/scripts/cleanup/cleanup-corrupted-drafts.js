// Rychlý cleanup pro poškozené drafty v localStorage
console.log('🗑️ Cleaning up corrupted drafts...');

// Seznam všech klíčů v localStorage
const allKeys = Object.keys(localStorage);
let removedCount = 0;

// Najdi všechny draft klíče
const draftKeys = allKeys.filter(key => key.includes('draft'));

console.log(`Found ${draftKeys.length} draft-related keys:`, draftKeys);

// Pokus se načíst každý draft - pokud selže, smaž ho
draftKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key);
    if (value) {
      // Pokus se parsovat jako JSON
      JSON.parse(value);
      console.log(`✓ ${key} - OK`);
    }
  } catch (error) {
    console.log(`❌ ${key} - CORRUPTED, removing...`);
    localStorage.removeItem(key);
    removedCount++;
  }
});

console.log(`🎯 Cleanup complete! Removed ${removedCount} corrupted drafts.`);

// Regeneruj draft encryption seed
localStorage.removeItem('draft_encryption_seed_persistent');
console.log('🔑 Draft encryption seed reset - new seed will be created on next use');
