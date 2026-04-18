#!/usr/bin/env node
/**
 * Generátor favicon.ico s více velikostmi
 */

const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');

async function generateFaviconIco() {
  console.log('🔄 Generuji favicon.ico s více velikostmi...\n');
  
  try {
    // Načtení PNG souborů v různých velikostech
    const files = [
      fs.readFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png')),
      fs.readFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png')),
      fs.readFileSync(path.join(PUBLIC_DIR, 'favicon-48x48.png')),
      fs.readFileSync(path.join(PUBLIC_DIR, 'favicon-64x64.png'))
    ];

    console.log('📦 Načteny PNG soubory: 16x16, 32x32, 48x48, 64x64');

    // Konverze na ICO
    const ico = await toIco(files);
    
    // Uložení
    const outputPath = path.join(PUBLIC_DIR, 'favicon.ico');
    fs.writeFileSync(outputPath, ico);
    
    const stats = fs.statSync(outputPath);
    console.log(`\n✅ favicon.ico vytvořen (${stats.size} bajtů)`);
    console.log('   Obsahuje velikosti: 16×16, 32×32, 48×48, 64×64\n');

  } catch (error) {
    console.error('❌ Chyba při generování ICO:', error.message);
    process.exit(1);
  }
}

generateFaviconIco();
