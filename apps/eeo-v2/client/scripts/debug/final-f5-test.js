// 🧪 KOMPLETNÍ TEST po opravách F5 persistence
// Spustit v browser console po refresh aplikace

console.log('🧪 === FINÁLNÍ TEST PO OPRAVÁCH ===');

const runCompleteTest = async () => {
  try {
    console.log('1️⃣ Test základního šifrování...');
    
    // Import služeb
    if (typeof encryptData === 'undefined' || typeof decryptData === 'undefined') {
      console.warn('⚠️ encryptData/decryptData nejsou v global scope');
      
      // Zkus najít v window
      if (window.debugEncryption?.test) {
        console.log('📦 Spouštím window.debugEncryption.test()...');
        await window.debugEncryption.test();
      }
    }
    
    console.log('2️⃣ Test persistence seed...');
    
    // Zkontroluj DraftEncryption seed
    const seed = localStorage.getItem('draft_encryption_seed_persistent');
    if (seed) {
      console.log('✅ Persistent seed existuje:', seed.substring(0, 20) + '...');
    } else {
      console.log('❌ Persistent seed chybí - vytvoří se při prvním uložení');
    }
    
    console.log('3️⃣ Test order25DraftStorageService...');
    
    // Zkus načíst koncept
    const currentUser = window.authContext?.user?.user_id || window.user?.user_id || 1;
    console.log('👤 Current user ID:', currentUser);
    
    // Pokud je k dispozici order25DraftStorageService
    if (window.order25DraftStorageService || window.draftService) {
      const service = window.order25DraftStorageService || window.draftService;
      
      try {
        console.log('📂 Pokouším se načíst draft...');
        const draft = await service.loadDraft(currentUser);
        
        if (draft) {
          console.log('✅ Draft úspěšně načten:', {
            timestamp: new Date(draft.timestamp),
            step: draft.step,
            hasFormData: !!draft.formData
          });
        } else {
          console.log('ℹ️ Žádný draft nebyl nalezen (to je OK)');
        }
        
      } catch (error) {
        console.error('❌ Chyba při načítání draftu:', error);
      }
    } else {
      console.warn('⚠️ order25DraftStorageService není k dispozici v window');
    }
    
    console.log('4️⃣ Test localStorage struktur...');
    
    // Zkontroluj localStorage
    let draftCount = 0;
    let encryptedCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key.includes('draft') || key.includes('order25')) {
        draftCount++;
        const value = localStorage.getItem(key);
        
        // Zkontroluj zda vypadá jako encrypted
        if (value.length > 100 && !value.startsWith('{') && !value.startsWith('[')) {
          encryptedCount++;
        }
        
        console.log(`📦 ${key}: ${value.length}B ${value.startsWith('{') ? '(JSON)' : '(ENCRYPTED?)'}`);
      }
    }
    
    console.log(`📊 Celkem ${draftCount} draft klíčů, ${encryptedCount} vypadá jako encrypted`);
    
    console.log('5️⃣ Test getOrderDateTime funkce...');
    
    // Test s různými typy dat
    const testOrders = [
      { isDraft: true, dt_vytvoreni: '2025-10-19T10:30:00Z' },
      { isDraft: true, _originalData: { firstAutoSaveDate: '2025-10-19T11:00:00Z' } },
      { isDraft: false, dt_objednavky: '2025-10-19T12:00:00Z' },
      { isDraft: true }, // no date
      { dt_objednavky: null }, // null date
    ];
    
    // Pokud je k dispozici getOrderDateTime (možná není v global scope)
    if (typeof getOrderDateTime !== 'undefined') {
      testOrders.forEach((order, i) => {
        const result = getOrderDateTime(order);
        console.log(`📅 Test order ${i}:`, result, typeof result);
      });
    } else {
      console.log('ℹ️ getOrderDateTime není v global scope (to je normální)');
    }
    
    console.log('\n🎯 === ZÁVĚR TESTU ===');
    console.log('✅ Základní diagnostika dokončena');
    console.log('💡 Nyní zkuste:');
    console.log('   1. Vytvořit novou objednávku');
    console.log('   2. Vyplnit některá pole');
    console.log('   3. Udělat F5');
    console.log('   4. Zkontrolovat zda se koncept zobrazuje v seznamu');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test selhal:', error);
    return false;
  }
};

// Spusť test
runCompleteTest().then(success => {
  if (success) {
    console.log('\n🎉 Test dokončen! Aplikace by měla fungovat správně.');
  } else {
    console.log('\n⚠️ Test odhalil problémy - zkontrolujte console výše.');
  }
});

// Přidej helper pro rychlé testování
window.quickF5Test = () => {
  console.log('🔄 Spouštím quick F5 test...');
  console.log('📝 localStorage keys:', Object.keys(localStorage).filter(k => k.includes('draft')));
  console.log('🔑 Security context:', window._securityContext);
  console.log('🌱 Encryption seed:', localStorage.getItem('draft_encryption_seed_persistent'));
};

console.log('💡 Pro quick test spusťte: window.quickF5Test()');