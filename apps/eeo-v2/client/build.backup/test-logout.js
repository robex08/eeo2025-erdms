/**
 * Browser test script pro ověření TODO/POZNÁMKY cleanup
 * Spusť v browser console před a po odhlášení
 */

// Test před odhlášením - vytvoří testovací data
window.testLogoutBefore = () => {
  console.log('🧪 Vytvářím testovací TODO a POZNÁMKY...');
  
  // Simuluj přihlášeného uživatele s ID 1
  const userId = 1;
  
  // Vytvoř testovací TODO
  const testTasks = [
    {id: Date.now(), text: 'Test úkol před odhlášením', done: false, createdAt: Date.now()},
    {id: Date.now() + 1, text: 'Další test úkol', done: true, createdAt: Date.now()}
  ];
  localStorage.setItem(`layout_tasks_${userId}`, JSON.stringify(testTasks));
  localStorage.setItem(`layout_tasks_font_${userId}`, '0.85');
  
  // Vytvoř testovací POZNÁMKY
  localStorage.setItem(`layout_notes_${userId}`, 'Testovací poznámky před odhlášením - tyto by se měly smazat!');
  localStorage.setItem(`layout_notes_font_${userId}`, '0.80');
  
  // Další citlivá data
  localStorage.setItem(`todo_items_${userId}`, JSON.stringify([{text: 'Citlivý TODO'}]));
  localStorage.setItem(`notes_text_${userId}`, 'Citlivý text poznámek');
  
  console.log('✅ Testovací data vytvořena:');
  console.log('📝 TODO:', localStorage.getItem(`layout_tasks_${userId}`));
  console.log('💭 Poznámky:', localStorage.getItem(`layout_notes_${userId}`));
  console.log('');
  console.log('🚪 Nyní se odhlašte a pak spusťte testLogoutAfter()');
};

// Test po odhlášení - zkontroluj jestli se data smazala
window.testLogoutAfter = () => {
  console.group('🔍 Test po odhlášení');
  
  const userId = 1;
  const keys = [
    `layout_tasks_${userId}`,
    `layout_tasks_font_${userId}`,
    `layout_notes_${userId}`,
    `layout_notes_font_${userId}`,
    `todo_items_${userId}`,
    `notes_text_${userId}`
  ];
  
  let foundData = [];
  let clearedData = [];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      foundData.push({key, value});
    } else {
      clearedData.push(key);
    }
  });
  
  console.log('✅ Správně smazáno (' + clearedData.length + '):', clearedData);
  console.log('❌ PROBLÉM - stále existuje (' + foundData.length + '):', foundData);
  
  // Kontrola všech TODO/POZNÁMKY klíčů v localStorage
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('layout_tasks_') ||
      key.includes('layout_notes_') ||
      key.includes('todo_') ||
      key.includes('notes_')
    )) {
      allKeys.push(key);
    }
  }
  
  if (allKeys.length > 0) {
    console.warn('⚠️ Nalezeny další TODO/POZNÁMKY klíče:', allKeys);
  } else {
    console.log('🎉 Žádné TODO/POZNÁMKY klíče nenalezeny - cleanup proběhl správně!');
  }
  
  // Celkové hodnocení
  if (foundData.length === 0 && allKeys.length === 0) {
    console.log('🏆 ÚSPĚCH: Cleanup funguje správně!');
  } else {
    console.log('💥 PROBLÉM: Cleanup neproběhl správně!');
    
    // Pokus o manuální cleanup
    console.log('🔧 Pokusím se vyčistit ručně...');
    [...keys, ...allKeys].forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log('✅ Ručně smazáno:', key);
      } catch (e) {
        console.warn('❌ Nepodařilo se smazat:', key, e);
      }
    });
  }
  
  console.groupEnd();
};

// Quick test - celý flow
window.testFullLogoutFlow = () => {
  console.log('🚀 Spouštím celý test logout flow...');
  testLogoutBefore();
  
  setTimeout(() => {
    alert('Nyní se prosím odhlašte a pak v console spusťte: testLogoutAfter()');
  }, 1000);
};

console.log('🛠️ Logout test funkce jsou připraveny:');
console.log('• testLogoutBefore() - vytvoří testovací data');
console.log('• testLogoutAfter() - zkontroluje cleanup');
console.log('• testFullLogoutFlow() - celý test');