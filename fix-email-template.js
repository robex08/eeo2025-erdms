const fs = require('fs');

// Načíst aktuální šablony z emailTemplatesFromDB.js
const content = fs.readFileSync('./apps/eeo-v2/client/src/pages/emailTemplatesFromDB.js', 'utf8');

// Extrahovat jednotlivé šablony pomocí regulárních výrazů
const normalMatch = content.match(/export const DB_TEMPLATE_APPROVER_NORMAL = `([\s\S]*?)`;/);
const urgentMatch = content.match(/export const DB_TEMPLATE_APPROVER_URGENT = `([\s\S]*?)`;/);
const submitterMatch = content.match(/export const DB_TEMPLATE_SUBMITTER = `([\s\S]*?)`;/);

if (!normalMatch || !urgentMatch || !submitterMatch) {
  console.error('❌ Nepodařilo se extrahovat šablony');
  process.exit(1);
}

// Sestavit kombinovanou šablonu se správnými delimitery
const combined = 
  '<!-- RECIPIENT: APPROVER_NORMAL -->\n' + normalMatch[1] + 
  '\n\n<!-- RECIPIENT: APPROVER_URGENT -->\n' + urgentMatch[1] + 
  '\n\n<!-- RECIPIENT: SUBMITTER -->\n' + submitterMatch[1];

// Uložit do dočasného souboru
fs.writeFileSync('/tmp/email-template-fixed.html', combined, 'utf8');
console.log('✅ Šablona připravena v /tmp/email-template-fixed.html');
console.log('Délka:', combined.length, 'znaků');

// Vytvořit SQL update
const sqlEscaped = combined.replace(/'/g, "''").replace(/\n/g, '\\n');
const sql = `UPDATE 25_notification_templates SET email_body = '${sqlEscaped}' WHERE type = 'order_status_ke_schvaleni';`;
fs.writeFileSync('/tmp/update-email-template.sql', sql, 'utf8');
console.log('✅ SQL update vytvořen v /tmp/update-email-template.sql');
