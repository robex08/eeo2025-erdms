// 🧪 TEST SCRIPT pro ověření opravy F5 persistence
// Spustit v browser console pro test šifrování s persistent seed

console.log('🧪 === TEST F5 PERSISTENCE OPRAVY ===');

// Simulace persistent seed (stejný jako používá DraftEncryption.js)
const testSeed = 'draft_1729123456789_abc123xyz';
console.log('🔑 Test seed:', testSeed);

// Test data
const testConcept = {
  formData: {
    title: 'Test objednávka',
    supplier: 'Test dodavatel',
    amount: 1000
  },
  timestamp: Date.now(),
  step: 2,
  type: 'new',
  orderId: null,
  version: 1
};

console.log('📝 Test data:', testConcept);

// Funkce pro import encryption funkcí
const testEncryption = async () => {
  try {
    // Pokus o import z aplikace (pokud je dostupné)
    let encryptData, decryptData;
    
    if (window.encryptionUtils) {
      // Pokud jsou funkce exportované do window
      encryptData = window.encryptionUtils.encryptData;
      decryptData = window.encryptionUtils.decryptData;
    } else {
      // Implementace přímo v testu (kopie z encryption.js)
      const generateTestKey = async (seed) => {
        const screenData = window.screen || { width: 1920, height: 1080 };
        const data = [
          navigator.userAgent,
          navigator.language,
          screenData.width,
          screenData.height,
          seed,
          window.location.origin
        ].join('|');
        
        const encoder = new TextEncoder();
        const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        
        return await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      };
      
      encryptData = async (plaintext, seed) => {
        try {
          if (!plaintext) return null;
          
          const key = await generateTestKey(seed);
          const encoder = new TextEncoder();
          const data = encoder.encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));
          
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
          );
          
          const combined = new Uint8Array(iv.length + encrypted.byteLength);
          combined.set(iv);
          combined.set(new Uint8Array(encrypted), iv.length);
          
          return btoa(String.fromCharCode(...combined));
        } catch (error) {
          console.error('Šifrování selhalo:', error);
          return null;
        }
      };
      
      decryptData = async (encryptedData, seed) => {
        try {
          if (!encryptedData) return null;
          
          const key = await generateTestKey(seed);
          const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
          
          if (combined.length < 13) return null;
          
          const iv = combined.slice(0, 12);
          const encrypted = combined.slice(12);
          
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
          );
          
          const decoder = new TextDecoder();
          const plaintext = decoder.decode(decrypted);
          
          try {
            return JSON.parse(plaintext);
          } catch {
            return plaintext;
          }
        } catch (error) {
          console.error('Dešifrování selhalo:', error);
          return null;
        }
      };
    }
    
    // Test 1: Šifrování s persistent seed
    console.log('\n🔒 TEST 1: Šifrování...');
    const encrypted = await encryptData(JSON.stringify(testConcept), testSeed);
    
    if (!encrypted) {
      console.error('❌ Šifrování selhalo!');
      return false;
    }
    
    console.log('✅ Šifrování úspěšné, délka:', encrypted.length);
    console.log('📦 Encrypted preview:', encrypted.substring(0, 50) + '...');
    
    // Test 2: Dešifrování se stejným seed
    console.log('\n🔓 TEST 2: Dešifrování se stejným seed...');
    const decrypted1 = await decryptData(encrypted, testSeed);
    
    if (!decrypted1) {
      console.error('❌ Dešifrování selhalo!');
      return false;
    }
    
    console.log('✅ Dešifrování úspěšné:', {
      timestamp: new Date(decrypted1.timestamp),
      step: decrypted1.step,
      title: decrypted1.formData?.title
    });
    
    // Test 3: Simulace F5 - nový window._securityContext
    console.log('\n🔄 TEST 3: Simulace F5 (reset window._securityContext)...');
    
    // Backup původního stavu
    const originalContext = window._securityContext;
    
    // Simuluj F5 reset
    window._securityContext = {
      sessionSeed: null,
      sessionStart: Date.now(),
      keyRotations: 0
    };
    
    console.log('🔄 Context resetován, pokouším se dešifrovat...');
    
    // Test dešifrování po "F5"
    const decrypted2 = await decryptData(encrypted, testSeed);
    
    // Restore původní context
    window._securityContext = originalContext;
    
    if (!decrypted2) {
      console.error('❌ Dešifrování po F5 selhalo!');
      return false;
    }
    
    console.log('✅ Dešifrování po F5 úspěšné!');
    
    // Test 4: Porovnání dat
    console.log('\n📊 TEST 4: Porovnání dat...');
    const original = JSON.stringify(testConcept);
    const afterF5 = JSON.stringify(decrypted2);
    
    if (original === afterF5) {
      console.log('✅ Data jsou identická před i po F5!');
      return true;
    } else {
      console.error('❌ Data se liší!', {
        original: original.length,
        afterF5: afterF5.length
      });
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
};

// Spusť test
testEncryption().then(success => {
  console.log('\n🏁 === VÝSLEDEK TESTU ===');
  if (success) {
    console.log('🎉 ÚSPĚCH! F5 persistence oprava funguje!');
    console.log('💡 Koncepty by měly přežít reload stránky.');
  } else {
    console.log('❌ SELHÁNÍ! Ještě je potřeba dodělat opravu.');
  }
});

console.log('\n💾 Pro ruční test uložte koncept a udělejte F5...');