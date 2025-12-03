/**
 * Test Microsoft Graph API - EntraService
 */
require('dotenv').config();
const entraService = require('./src/services/entraService');

async function testGraphAPI() {
  console.log('🔵 Microsoft Graph API Test');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Inicializace
    console.log('\n📌 Test 1: Inicializace');
    await entraService.initialize();
    console.log('✅ EntraService initialized');
    
    // Test 2: Získat všechny skupiny
    console.log('\n📌 Test 2: Získat všechny skupiny v tenantovi');
    const groups = await entraService.getAllGroups();
    console.log(`✅ Nalezeno ${groups.length} skupin`);
    
    if (groups.length > 0) {
      console.log('\nPrvních 5 skupin:');
      groups.slice(0, 5).forEach((group, idx) => {
        console.log(`  ${idx + 1}. ${group.displayName}`);
        console.log(`     GUID: ${group.id}`);
        console.log(`     Type: ${group.securityEnabled ? 'Security' : ''} ${group.mailEnabled ? 'Mail' : ''}`);
      });
    }
    
    // Test 3: Vyhledat uživatele
    const testEmail = process.argv[2] || process.env.TEST_USER_EMAIL;
    
    if (testEmail) {
      console.log(`\n📌 Test 3: Vyhledat uživatele: ${testEmail}`);
      const user = await entraService.searchUserByEmail(testEmail);
      
      if (user) {
        console.log('✅ Uživatel nalezen:');
        console.log(`   Jméno: ${user.displayName}`);
        console.log(`   GUID: ${user.id}`);
        console.log(`   Email: ${user.mail}`);
        
        // Test 4: Získat skupiny uživatele
        console.log('\n📌 Test 4: Skupiny uživatele');
        const userGroups = await entraService.getUserGroups(user.id);
        console.log(`✅ Uživatel je členem ${userGroups.length} skupin`);
        
        userGroups.forEach((group, idx) => {
          console.log(`  ${idx + 1}. ${group.displayName}`);
          console.log(`     GUID: ${group.id}`);
        });
        
        // Test 5: Manager
        console.log('\n📌 Test 5: Nadřízený (Manager)');
        const manager = await entraService.getUserManager(user.id);
        
        if (manager) {
          console.log('✅ Manager nalezen:');
          console.log(`   Jméno: ${manager.displayName}`);
          console.log(`   GUID: ${manager.id}`);
          console.log(`   Pozice: ${manager.jobTitle || 'N/A'}`);
        } else {
          console.log('⚪ Uživatel nemá nadřízeného');
        }
        
        // Test 6: Podřízení
        console.log('\n📌 Test 6: Podřízení (Direct Reports)');
        const reports = await entraService.getUserDirectReports(user.id);
        
        if (reports.length > 0) {
          console.log(`✅ Uživatel má ${reports.length} podřízených:`);
          reports.forEach((person, idx) => {
            console.log(`  ${idx + 1}. ${person.displayName} (${person.jobTitle || 'N/A'})`);
          });
        } else {
          console.log('⚪ Uživatel nemá podřízené');
        }
        
      } else {
        console.log('❌ Uživatel nenalezen');
      }
    } else {
      console.log('\n⚠️  Pro test uživatele spusť: node test-graph-api.js <email>');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ VŠECHNY TESTY DOKONČENY');
    console.log('='.repeat(60));
    process.exit(0);
    
  } catch (err) {
    console.error('\n🔴 TEST FAILED:', err.message);
    console.error('🔴 Code:', err.code);
    
    if (err.message.includes('Insufficient privileges')) {
      console.error('\n⚠️  CHYBA: Nedostatečná oprávnění');
      console.error('📖 Řešení: Zkontroluj docs/ENTRA_GRAPH_API_SETUP.md');
      console.error('   1. Přidej Application permissions v Azure Portal');
      console.error('   2. Udělej Admin Consent');
    }
    
    if (err.message.includes('Invalid client')) {
      console.error('\n⚠️  CHYBA: Neplatný client secret nebo tenant ID');
      console.error('📖 Řešení: Zkontroluj .env soubor');
      console.error('   - ENTRA_CLIENT_ID');
      console.error('   - ENTRA_TENANT_ID');
      console.error('   - ENTRA_CLIENT_SECRET');
    }
    
    process.exit(1);
  }
}

testGraphAPI();
