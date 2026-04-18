#!/usr/bin/env node
/**
 * Generátor favicon ve všech potřebných velikostech
 * Použití: node generate-favicons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const SOURCE_LOGO = path.join(PUBLIC_DIR, 'logo512.png');

// Definice velikostí které potřebujeme
const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-64x64.png', size: 64 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'logo192.png', size: 192 }
  // logo512.png už existuje jako source, nepřepisujeme
];

async function generateFavicons() {
  console.log('🔄 Generuji favicon v různých velikostech...\n');
  
  // Kontrola zda existuje zdrojový soubor
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Zdrojový soubor nenalezen: ${SOURCE_LOGO}`);
    process.exit(1);
  }

  try {
    // Načtení info o zdrojovém obrázku
    const metadata = await sharp(SOURCE_LOGO).metadata();
    console.log(`📷 Zdrojový obrázek: ${metadata.width}×${metadata.height}px\n`);

    // Generování všech velikostí
    for (const { name, size } of SIZES) {
      const outputPath = path.join(PUBLIC_DIR, name);
      
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${name} (${size}×${size}px)`);
    }

    console.log('\n✨ Všechny favicon úspěšně vygenerovány!');
    console.log('\n⚠️  POZOR: Pro favicon.ico s více velikostmi použijte online nástroj:');
    console.log('   https://www.favicon-generator.org/');
    console.log('   nebo');
    console.log('   https://realfavicongenerator.net/');
    console.log('\n📝 Nezapomeňte aktualizovat manifest.json a index.html!');

  } catch (error) {
    console.error('❌ Chyba při generování:', error.message);
    process.exit(1);
  }
}

generateFavicons();
