/**
 * 🚨 EMERGENCY DRAFT CLEANUP
 * 
 * Spusť v browser console:
 * 1. Otevři Developer Tools (F12)
 * 2. Jdi na Console tab
 * 3. Zkopíruj a vlož celý tento kód
 * 4. Stiskni Enter
 */

console.log('🗑️ Starting emergency draft cleanup...');

// Funkcja pro cleanup poškozených draftů
function cleanupCorruptedDrafts() {
  const allKeys = Object.keys(localStorage);
  const draftKeys = allKeys.filter(key => 
    key.includes('draft') || key.includes('order25')
  );
  
  console.log(`📊 Found ${draftKeys.length} draft-related keys:`, draftKeys);
  
  let removedCount = 0;
  let keptCount = 0;
  
  // Kontrola každého klíče
  draftKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        console.log(`🔧 ${key} - EMPTY, removing...`);
        localStorage.removeItem(key);
        removedCount++;
        return;
      }
      
      // Pokus se parsovat jako JSON
      const parsed = JSON.parse(value);
      
      // Pokud obsahuje neočekávané znaky na začátku (encryption fail)
      if (typeof value === 'string' && value.match(/^[^{"\[a-zA-Z0-9]/)) {
        console.log(`💀 ${key} - CORRUPTED (invalid start), removing...`);
        localStorage.removeItem(key);
        removedCount++;
        return;
      }
      
      console.log(`✅ ${key} - OK`);
      keptCount++;
      
    } catch (error) {
      console.log(`❌ ${key} - CORRUPTED (parse error), removing...`);
      localStorage.removeItem(key);
      removedCount++;
    }
  });
  
  // Reset encryption seed - nový se vytvoří automaticky
  if (localStorage.getItem('draft_encryption_seed_persistent')) {
    localStorage.removeItem('draft_encryption_seed_persistent');
    console.log('🔑 Draft encryption seed reset');
  }
  
  console.log(`🎯 Cleanup complete!`);
  console.log(`   - Kept: ${keptCount} drafts`);
  console.log(`   - Removed: ${removedCount} corrupted drafts`);
  console.log(`   - Encryption seed: reset`);
  
  return {
    kept: keptCount,
    removed: removedCount,
    success: true
  };
}

// Spustit cleanup
const result = cleanupCorruptedDrafts();

console.log('🔄 Please refresh the page to see if draft detection works now.');
console.log('📋 If you still see encryption errors, the draft data was created with old keys and cannot be recovered.');

// Výsledek
result;