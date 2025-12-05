/**
 * =============================================================================
 * CHECK NOTIFICATION TEMPLATES
 * =============================================================================
 * 
 * Tento skript zobrazí všechny dostupné notifikační templaty z databáze.
 * Použij ho k zjištění, jaké templaty máme a které chybí.
 * 
 * POUŽITÍ:
 * node scripts/check-notification-templates.js
 * 
 * POŽADAVKY:
 * - Backend API musí běžet
 * - Musíš být přihlášený (token a username)
 */

const axios = require('axios');

// =============================================================================
// KONFIGURACE
// =============================================================================

const API_BASE_URL = 'http://localhost/api.eeo'; // Změň pokud je backend jinde
const TOKEN = 'tvuj-token'; // ⚠️ DOPLŇ SVŮJ TOKEN
const USERNAME = 'tvuj-username'; // ⚠️ DOPLŇ SVÉ USERNAME

// =============================================================================
// OČEKÁVANÉ TEMPLATY (podle dokumentace)
// =============================================================================

const EXPECTED_TEMPLATES = {
  // OBJEDNÁVKY - Základní stavy (10 typů)
  'order_status_nova': 'Nová objednávka (draft)',
  'order_status_ke_schvaleni': 'Čeká na schválení',
  'order_status_schvalena': 'Schválena',
  'order_status_zamitnuta': 'Zamítnuta',
  'order_status_ceka_se': 'Vrácena k přepracování',
  'order_status_odeslana_dodavateli': 'Odeslána dodavateli',
  'order_status_potvrzena_dodavatelem': 'Potvrzena dodavatelem',
  'order_status_realizovana': 'Realizována',
  'order_status_zkontrolovana': 'Zkontrolována',
  'order_status_dokoncena': 'Dokončena',
  
  // REGISTR SMLUV (2 typy)
  'order_status_registr_ceka': 'Čeká na registr smluv',
  'order_status_registr_zverejnena': 'Zveřejněna v registru',
  
  // FAKTURACE (4 typy)
  'order_status_faktura_ceka': 'Čeká na přiřazení faktury',
  'order_status_faktura_prirazena': 'Faktura přiřazena',
  'order_status_faktura_schvalena': 'Faktura schválena',
  'order_status_faktura_zaplacena': 'Faktura zaplacena',
  
  // VĚCNÁ SPRÁVNOST (3 typy)
  'order_vecna_spravnost_ke_kontrole': 'Věcná správnost - ke kontrole',
  'order_vecna_spravnost_schvalena': 'Věcná správnost - schválena',
  'order_vecna_spravnost_zamitnuta': 'Věcná správnost - zamítnuta (reklamace)',
  
  // TODO ALARMY (3 typy)
  'alarm_todo_normal': 'TODO alarm - normální priorita',
  'alarm_todo_high': 'TODO alarm - vysoká priorita',
  'alarm_todo_expired': 'TODO alarm - po termínu',
  
  // SYSTÉMOVÉ (minimálně 5 typů)
  'system_maintenance': 'Systémová údržba',
  'user_mention': 'Zmínka v komentáři',
  'deadline_reminder': 'Připomínka termínu',
  'order_unlock_forced': 'Objednávka násilně odemčena',
  'order_comment_new': 'Nový komentář k objednávce'
};

// =============================================================================
// HLAVNÍ FUNKCE
// =============================================================================

async function checkTemplates() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 KONTROLA NOTIFIKAČNÍCH TEMPLATES');
  console.log('='.repeat(80) + '\n');
  
  // Zkontroluj konfiguraci
  if (TOKEN === 'tvuj-token' || USERNAME === 'tvuj-username') {
    console.error('❌ CHYBA: Prosím nastavte TOKEN a USERNAME v souboru!');
    console.log('\n📝 Jak na to:');
    console.log('1. Otevři tento soubor: scripts/check-notification-templates.js');
    console.log('2. Najdi řádky s TOKEN a USERNAME');
    console.log('3. Doplň své přihlašovací údaje');
    console.log('4. Spusť skript znovu\n');
    return;
  }
  
  try {
    // Zavolej API
    console.log('📡 Načítám templates z backendu...');
    console.log(`   URL: ${API_BASE_URL}/notifications/templates`);
    console.log(`   User: ${USERNAME}\n`);
    
    const response = await axios.post(`${API_BASE_URL}/notifications/templates`, {
      token: TOKEN,
      username: USERNAME,
      active_only: false // Načíst i neaktivní
    });
    
    const templates = response.data || [];
    
    console.log(`✅ Načteno ${templates.length} templates z databáze\n`);
    
    // Rozdělení templates podle kategorií
    const categories = {
      'Objednávky - Základní stavy': [],
      'Registr smluv': [],
      'Fakturace': [],
      'Věcná správnost': [],
      'TODO Alarmy': [],
      'Systémové': [],
      'Ostatní': []
    };
    
    templates.forEach(template => {
      const type = template.type;
      
      if (type.startsWith('order_status_')) {
        if (type.includes('registr')) {
          categories['Registr smluv'].push(template);
        } else if (type.includes('faktura')) {
          categories['Fakturace'].push(template);
        } else {
          categories['Objednávky - Základní stavy'].push(template);
        }
      } else if (type.startsWith('order_vecna_spravnost_')) {
        categories['Věcná správnost'].push(template);
      } else if (type.startsWith('alarm_todo_')) {
        categories['TODO Alarmy'].push(template);
      } else if (type.startsWith('system_') || type.startsWith('user_') || type.startsWith('deadline_') || type.startsWith('order_unlock_') || type.startsWith('order_comment_')) {
        categories['Systémové'].push(template);
      } else {
        categories['Ostatní'].push(template);
      }
    });
    
    // Výpis podle kategorií
    console.log('📋 DOSTUPNÉ TEMPLATES (podle kategorií):');
    console.log('='.repeat(80) + '\n');
    
    Object.entries(categories).forEach(([categoryName, categoryTemplates]) => {
      if (categoryTemplates.length > 0) {
        console.log(`\n📁 ${categoryName} (${categoryTemplates.length}):`);
        console.log('-'.repeat(80));
        
        categoryTemplates.forEach(template => {
          const status = template.active ? '✅' : '❌';
          console.log(`${status} ${template.type}`);
          console.log(`   📝 ${template.name}`);
          console.log(`   📱 ${template.app_title || '(bez titulku)'}`);
          console.log(`   💬 ${template.app_message || '(bez zprávy)'}`);
          console.log(`   📧 Email: ${template.send_email_default ? 'ANO' : 'NE'}`);
          console.log(`   ⚡ Priorita: ${template.priority_default || 'normal'}`);
          console.log('');
        });
      }
    });
    
    // Kontrola chybějících templates
    console.log('\n' + '='.repeat(80));
    console.log('🔍 KONTROLA CHYBĚJÍCÍCH TEMPLATES:');
    console.log('='.repeat(80) + '\n');
    
    const existingTypes = templates.map(t => t.type);
    const missingTemplates = Object.entries(EXPECTED_TEMPLATES)
      .filter(([type]) => !existingTypes.includes(type));
    
    if (missingTemplates.length === 0) {
      console.log('✅ Všechny očekávané templaty jsou v databázi!\n');
    } else {
      console.log(`❌ CHYBÍ ${missingTemplates.length} templates:\n`);
      
      missingTemplates.forEach(([type, description]) => {
        console.log(`   ❌ ${type}`);
        console.log(`      ${description}\n`);
      });
      
      console.log('\n📝 CO DĚLAT:');
      console.log('1. Zkopíruj chybějící typy výše');
      console.log('2. Požádej backend vývojáře, aby přidal SQL INSERT do databáze');
      console.log('3. Nebo si prohlédni dokumentaci v docs/NOTIFICATION-TEMPLATES-PLACEHOLDERS.md\n');
    }
    
    // Neočekávané templaty
    const unexpectedTemplates = templates
      .filter(t => !Object.keys(EXPECTED_TEMPLATES).includes(t.type));
    
    if (unexpectedTemplates.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('ℹ️  NEOČEKÁVANÉ TEMPLATES (v DB, ale ne v dokumentaci):');
      console.log('='.repeat(80) + '\n');
      
      unexpectedTemplates.forEach(template => {
        console.log(`   ℹ️  ${template.type}`);
        console.log(`      ${template.name}\n`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ CHYBA PŘI NAČÍTÁNÍ TEMPLATES:');
    console.error('   Důvod:', error.message);
    
    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      console.error('   Backend odpověď:', error.response.data);
    }
    
    console.log('\n📝 MOŽNÉ PŘÍČINY:');
    console.log('   - Backend API neběží');
    console.log('   - Špatný TOKEN nebo USERNAME');
    console.log('   - Špatná URL k API');
    console.log('   - Endpoint /notifications/templates neexistuje\n');
  }
}

// =============================================================================
// SPUŠTĚNÍ
// =============================================================================

checkTemplates();
