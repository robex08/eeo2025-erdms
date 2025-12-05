/**
 * 🔍 TEST SCROLLU - Zkopíruj a vlož do konzole prohlížeče na stránce Orders25List
 * 
 * Tento skript otestuje, jestli <main> element umí scrollovat
 */

console.log('🧪 === TEST SCROLLU ZAČÍNÁ ===');

// 1. Najdi main element
const main = document.querySelector('main');
console.log('1️⃣ Main element:', main);

if (!main) {
  console.error('❌ CHYBA: Main element nenalezen!');
} else {
  // 2. Zkontroluj computed styles
  const styles = window.getComputedStyle(main);
  console.log('2️⃣ Main element computed styles:');
  console.log('   - overflow:', styles.overflow);
  console.log('   - overflow-x:', styles.overflowX);
  console.log('   - overflow-y:', styles.overflowY);
  console.log('   - position:', styles.position);
  console.log('   - height:', styles.height);
  
  // 3. Zkontroluj scroll rozměry
  console.log('3️⃣ Main element scroll properties:');
  console.log('   - scrollHeight:', main.scrollHeight);
  console.log('   - clientHeight:', main.clientHeight);
  console.log('   - scrollTop:', main.scrollTop);
  console.log('   - Can scroll?', main.scrollHeight > main.clientHeight ? '✅ ANO' : '❌ NE');
  
  // 4. Zkus nastavit scroll
  if (main.scrollHeight > main.clientHeight) {
    const targetScroll = 500;
    console.log('4️⃣ Zkouším nastavit scrollTop na:', targetScroll);
    
    const beforeScroll = main.scrollTop;
    main.scrollTop = targetScroll;
    const afterScroll = main.scrollTop;
    
    console.log('   - PŘED:', beforeScroll);
    console.log('   - PO:', afterScroll);
    console.log('   - FUNGUJE?', Math.abs(afterScroll - targetScroll) < 5 ? '✅ ANO' : '❌ NE');
    
    // Vrať scroll zpět
    setTimeout(() => {
      main.scrollTop = beforeScroll;
      console.log('   - Scroll vrácen na:', beforeScroll);
    }, 2000);
  } else {
    console.warn('⚠️ Main element nemá dost obsahu pro scroll');
  }
  
  // 5. Zkontroluj sessionStorage
  console.log('5️⃣ SessionStorage kontrola:');
  const scrollKeys = Object.keys(sessionStorage).filter(k => k.includes('scroll_user'));
  console.log('   - Nalezené scroll keys:', scrollKeys);
  scrollKeys.forEach(key => {
    try {
      const data = JSON.parse(sessionStorage.getItem(key));
      console.log('   - Key:', key);
      console.log('     Data:', data);
    } catch (e) {
      console.warn('   - Chyba parsování:', key);
    }
  });
}

// 6. Zkontroluj window scroll (fallback)
console.log('6️⃣ Window scroll properties:');
console.log('   - scrollY:', window.scrollY);
console.log('   - innerHeight:', window.innerHeight);
console.log('   - document.documentElement.scrollHeight:', document.documentElement.scrollHeight);

console.log('🧪 === TEST SCROLLU DOKONČEN ===');
console.log('📋 Zkopíruj výstup a pošli ho pro analýzu');
