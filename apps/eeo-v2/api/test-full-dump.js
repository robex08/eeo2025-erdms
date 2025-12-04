const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Připojeno k databázi\n');
    console.log('🔵 SELECT * FROM erdms_users\n');
    console.log('='.repeat(150));
    
    const start = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users ORDER BY id');
    const duration = Date.now() - start;
    
    console.log(`Dokončeno za ${duration}ms | Celkem ${rows.length} uživatelů\n`);
    console.log('='.repeat(150));
    
    rows.forEach((u, idx) => {
      console.log(`\n--- [${(idx + 1).toString().padStart(3, '0')}] ID: ${u.id} ---`);
      console.log(`  Username:        ${u.username}`);
      console.log(`  Jméno:           ${u.titul_pred || ''} ${u.jmeno || ''} ${u.prijmeni || ''} ${u.titul_za || ''}`.trim());
      console.log(`  Email:           ${u.email || '(neuvedeno)'}`);
      console.log(`  Telefon:         ${u.telefon || '(neuvedeno)'}`);
      console.log(`  Pozice ID:       ${u.pozice_id || 'N/A'}`);
      console.log(`  Lokalita ID:     ${u.lokalita_id || 'N/A'}`);
      console.log(`  Organizace ID:   ${u.organizace_id}`);
      console.log(`  Úsek ID:         ${u.usek_id}`);
      console.log(`  Role:            ${u.role}`);
      console.log(`  Auth source:     ${u.auth_source}`);
      console.log(`  Aktivní:         ${u.aktivni ? '✅ ANO' : '❌ NE'}`);
      console.log(`  EntraID:         ${u.entra_id || '(není)'}`);
      console.log(`  UPN:             ${u.upn || '(není)'}`);
      console.log(`  Vytvořeno:       ${u.dt_vytvoreni}`);
      console.log(`  Aktualizováno:   ${u.dt_aktualizace || '(nikdy)'}`);
      console.log(`  Poslední akt.:   ${u.dt_posledni_aktivita || '(nikdy)'}`);
    });
    
    console.log('\n' + '='.repeat(150));
    console.log('✅ DOKONČENO');
    console.log('='.repeat(150));
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 CHYBA:', err.message);
    process.exit(1);
  }
})();
