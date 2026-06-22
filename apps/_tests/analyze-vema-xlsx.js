#!/usr/bin/env node
/**
 * Analýza XLSX souborů - VEMA Podklady
 * Vypíše strukturu sloupců a ukázková data
 */

const XLSX = require('../eeo-v2/client/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const VEMA_DIR = '/var/www/erdms-dev/apps/eeo-v2/podklady/vema';
const FILES = ['firmyupl.xlsx', 'fpazahl.xlsx', 'smla.xlsx'];

console.log('='.repeat(80));
console.log('ANALÝZA XLSX SOUBORŮ - VEMA PODKLADY');
console.log('='.repeat(80));
console.log('');

FILES.forEach(filename => {
    const filePath = path.join(VEMA_DIR, filename);
    
    console.log('━'.repeat(80));
    console.log(`📄 SOUBOR: ${filename}`);
    console.log('━'.repeat(80));
    
    try {
        // Načtení souboru
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Převod na JSON (header: 1 = pole polí)
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        if (data.length === 0) {
            console.log('⚠️  Soubor je prázdný');
            console.log('');
            return;
        }
        
        // První řádek = názvy sloupců
        const headers = data[0];
        const sampleRows = data.slice(1, 3); // 2 ukázkové řádky
        
        console.log(`📊 Počet sloupců: ${headers.length}`);
        console.log(`📊 Počet řádků dat: ${data.length - 1}`);
        console.log('');
        
        console.log('📋 STRUKTURA SLOUPCŮ:');
        console.log('-'.repeat(80));
        
        headers.forEach((header, index) => {
            const columnLetter = XLSX.utils.encode_col(index);
            
            // Získání vzorových hodnot pro určení datového typu
            const sampleValues = sampleRows
                .map(row => row[index])
                .filter(val => val !== null && val !== undefined && val !== '');
            
            // Určení datového typu
            let dataType = 'TEXT';
            if (sampleValues.length > 0) {
                const firstVal = sampleValues[0];
                
                if (typeof firstVal === 'number') {
                    dataType = Number.isInteger(firstVal) ? 'INTEGER' : 'DECIMAL';
                } else if (typeof firstVal === 'boolean') {
                    dataType = 'BOOLEAN';
                } else if (firstVal instanceof Date) {
                    dataType = 'DATE';
                } else if (typeof firstVal === 'string') {
                    // Kontrola, jestli vypadá jako datum
                    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(firstVal)) {
                        dataType = 'DATE (TEXT)';
                    }
                    // Kontrola, jestli vypadá jako číslo
                    else if (/^-?\d+([.,]\d+)?$/.test(firstVal.trim())) {
                        dataType = 'DECIMAL (TEXT)';
                    }
                    else {
                        const maxLen = Math.max(...sampleValues.map(v => String(v).length));
                        dataType = `VARCHAR(${Math.min(maxLen * 2, 255)})`;
                    }
                }
            }
            
            console.log(`${String(index + 1).padStart(2, '0')}. [${columnLetter}] "${header || '(bez názvu)'}"`);
            console.log(`    └─ Typ: ${dataType}`);
            console.log(`    └─ Vzorová hodnota: ${sampleValues[0] !== undefined ? JSON.stringify(sampleValues[0]) : '(null)'}`);
        });
        
        console.log('');
        console.log('📝 UKÁZKOVÁ DATA (první 2 řádky):');
        console.log('-'.repeat(80));
        
        sampleRows.forEach((row, rowIndex) => {
            console.log(`Řádek ${rowIndex + 1}:`);
            headers.forEach((header, colIndex) => {
                const value = row[colIndex];
                if (value !== null && value !== undefined && value !== '') {
                    console.log(`  "${header}": ${JSON.stringify(value)}`);
                }
            });
            console.log('');
        });
        
    } catch (error) {
        console.error(`❌ CHYBA při zpracování souboru: ${error.message}`);
    }
    
    console.log('');
});

console.log('='.repeat(80));
console.log('✅ ANALÝZA DOKONČENA');
console.log('='.repeat(80));
