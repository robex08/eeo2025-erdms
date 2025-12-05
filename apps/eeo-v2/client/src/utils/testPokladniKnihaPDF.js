/**
 * TESTOVACÍ PŘÍKLAD PRO POKLADNÍ KNIHU PDF
 *
 * Tento soubor demonstruje, jak použít PokladniKnihaPDF komponentu
 * pro generování PDF s testovacími daty.
 *
 * Použití v konzoli prohlížeče nebo v jiné komponentě.
 */

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import PokladniKnihaPDF from '../components/PokladniKnihaPDF';

// Testovací data
export const sampleData = {
  organizationInfo: {
    workplace: 'Příbram',
    cashboxNumber: '600',
    month: 'listopad',
    year: 2025,
  },

  carryOverAmount: 1500.00,

  totals: {
    totalIncome: 12345.67,
    totalExpenses: 8900.50,
    currentBalance: 4945.17,
  },

  entries: [
    {
      id: 1,
      date: '2025-11-01',
      documentNumber: 'DOK001',
      description: 'Platba za poskytnuté služby - sanitní doprava',
      person: 'Jan Novák',
      income: 1000.00,
      expense: null,
      balance: 2500.00,
      lpCode: 'LP01',
      note: 'Uhrazeno v hotovosti dne 1.11.2025'
    },
    {
      id: 2,
      date: '2025-11-02',
      documentNumber: 'DOK002',
      description: 'Nákup kancelářských potřeb',
      person: 'Papírnictví U Nováků s.r.o.',
      income: null,
      expense: 450.00,
      balance: 2050.00,
      lpCode: 'LP02',
      note: 'Faktura č. 2025/0234'
    },
    {
      id: 3,
      date: '2025-11-03',
      documentNumber: 'DOK003',
      description: 'Příjem z poplatků - školení první pomoci',
      person: 'Marie Svobodová',
      income: 2500.00,
      expense: null,
      balance: 4550.00,
      lpCode: 'LP03',
      note: 'Kurz první pomoci 5.11.2025'
    },
    {
      id: 4,
      date: '2025-11-05',
      documentNumber: 'DOK004',
      description: 'Oprava sanitního vozidla - výměna pneumatik',
      person: 'AutoServis Rychlý s.r.o.',
      income: null,
      expense: 3200.00,
      balance: 1350.00,
      lpCode: 'LP04',
      note: 'Zimní pneumatiky + montáž'
    },
    {
      id: 5,
      date: '2025-11-07',
      documentNumber: 'DOK005',
      description: 'Dotace od města Příbram na provoz',
      person: 'Městský úřad Příbram',
      income: 8000.00,
      expense: null,
      balance: 9350.00,
      lpCode: 'LP05',
      note: 'Dotace na 4. čtvrtletí 2025'
    },
    {
      id: 6,
      date: '2025-11-10',
      documentNumber: 'DOK006',
      description: 'Úhrada pohonných hmot - listopad',
      person: 'ČS Benzina a.s.',
      income: null,
      expense: 1850.50,
      balance: 7499.50,
      lpCode: 'LP06',
      note: 'Natural 95 a Diesel'
    },
    {
      id: 7,
      date: '2025-11-12',
      documentNumber: 'DOK007',
      description: 'Příjem ze záchranných akcí - horská služba',
      person: 'Horská služba Brdy',
      income: 845.67,
      expense: null,
      balance: 8345.17,
      lpCode: 'LP07',
      note: 'Spolupráce na akci 10.11.2025'
    },
    {
      id: 8,
      date: '2025-11-15',
      documentNumber: 'DOK008',
      description: 'Nákup zdravotnického materiálu',
      person: 'MediSupply s.r.o.',
      income: null,
      expense: 3400.00,
      balance: 4945.17,
      lpCode: 'LP08',
      note: 'Obvazy, dezinfekce, rukavice'
    },
  ]
};

/**
 * Funkce pro generování PDF s testovacími daty
 */
export const generateTestPDF = async () => {
  try {
    console.log('📄 Generování testovacího PDF...');

    const blob = await pdf(
      <PokladniKnihaPDF
        organizationInfo={sampleData.organizationInfo}
        carryOverAmount={sampleData.carryOverAmount}
        totals={sampleData.totals}
        entries={sampleData.entries}
      />
    ).toBlob();

    // Vytvoření URL a stažení
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEST_Pokladni_kniha_Pribram_listopad_2025.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ PDF úspěšně vygenerováno!');
    return true;
  } catch (error) {
    console.error('❌ Chyba při generování PDF:', error);
    return false;
  }
};

/**
 * Funkce pro otevření PDF v novém okně místo stažení
 */
export const previewTestPDF = async () => {
  try {
    console.log('👁️ Náhled testovacího PDF...');

    const blob = await pdf(
      <PokladniKnihaPDF
        organizationInfo={sampleData.organizationInfo}
        carryOverAmount={sampleData.carryOverAmount}
        totals={sampleData.totals}
        entries={sampleData.entries}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    console.log('✅ Náhled PDF otevřen v novém okně!');
    return true;
  } catch (error) {
    console.error('❌ Chyba při náhledu PDF:', error);
    return false;
  }
};

/**
 * Funkce pro test s velkým množstvím dat (stránkování)
 */
export const generateLargePDF = async () => {
  try {
    console.log('📄 Generování velkého PDF s testovacími daty...');

    // Vytvoříme 50 testovacích záznamů
    const largeEntries = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      date: new Date(2025, 10, (index % 28) + 1).toISOString(),
      documentNumber: `DOK${String(index + 1).padStart(3, '0')}`,
      description: `Testovací zápis č. ${index + 1} - ${
        index % 2 === 0 ? 'Příjem' : 'Výdaj'
      }`,
      person: `Osoba ${index + 1}`,
      income: index % 2 === 0 ? (Math.random() * 5000).toFixed(2) : null,
      expense: index % 2 === 1 ? (Math.random() * 3000).toFixed(2) : null,
      balance: (Math.random() * 10000).toFixed(2),
      lpCode: `LP${String((index % 10) + 1).padStart(2, '0')}`,
      note: index % 3 === 0 ? `Poznámka k záznamu ${index + 1}` : '',
    }));

    const blob = await pdf(
      <PokladniKnihaPDF
        organizationInfo={sampleData.organizationInfo}
        carryOverAmount={sampleData.carryOverAmount}
        totals={sampleData.totals}
        entries={largeEntries}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEST_LARGE_Pokladni_kniha.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Velké PDF úspěšně vygenerováno (50 záznamů)!');
    return true;
  } catch (error) {
    console.error('❌ Chyba při generování velkého PDF:', error);
    return false;
  }
};

/**
 * Test diakritiky
 */
export const testDiacriticsData = {
  organizationInfo: {
    workplace: 'Příbram',
    cashboxNumber: '600',
    month: 'listopad',
    year: 2025,
  },
  carryOverAmount: 1500.00,
  totals: {
    totalIncome: 5000.00,
    totalExpenses: 3000.00,
    currentBalance: 3500.00,
  },
  entries: [
    {
      id: 1,
      date: '2025-11-01',
      documentNumber: 'ČŘŽ001',
      description: 'Česká, řeč, ž žirafou začíná - test diakritiky',
      person: 'Žofie Čápová',
      income: 1000.00,
      expense: null,
      balance: 2500.00,
      lpCode: 'ČŘŽ',
      note: 'Všechny české znaky: á č ď é ě í ň ó ř š ť ú ů ý ž Á Č Ď É Ě Í Ň Ó Ř Š Ť Ú Ů Ý Ž'
    },
    {
      id: 2,
      date: '2025-11-02',
      documentNumber: 'EUR€',
      description: 'Test symbolu měny: € $ £ ¥ Kč',
      person: 'Střížek & Spol.',
      income: null,
      expense: 500.00,
      balance: 2000.00,
      lpCode: '€$£',
      note: 'Symbol Kč by měl být správně: Kč (ne K  )'
    },
  ]
};

/**
 * Test s diakritikou
 */
export const testDiacritics = async () => {
  try {
    console.log('🔤 Test diakritiky v PDF...');

    const blob = await pdf(
      <PokladniKnihaPDF
        organizationInfo={testDiacriticsData.organizationInfo}
        carryOverAmount={testDiacriticsData.carryOverAmount}
        totals={testDiacriticsData.totals}
        entries={testDiacriticsData.entries}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    console.log('✅ Test diakritiky dokončen - zkontrolujte PDF!');
    console.log('ℹ️ Měly by být vidět všechny české znaky včetně: á č ď é ě í ň ó ř š ť ú ů ý ž');
    console.log('ℹ️ Symbol měny by měl být "Kč" (ne "K  ")');
    return true;
  } catch (error) {
    console.error('❌ Chyba při testu diakritiky:', error);
    return false;
  }
};

// Export pro použití v konzoli nebo jiných komponentách
export default {
  sampleData,
  generateTestPDF,
  previewTestPDF,
  generateLargePDF,
  testDiacriticsData,
  testDiacritics,
};

/**
 * POUŽITÍ V KONZOLI PROHLÍŽEČE:
 *
 * import testPDF from './utils/testPokladniKnihaPDF';
 *
 * // Základní test
 * testPDF.generateTestPDF();
 *
 * // Náhled v prohlížeči
 * testPDF.previewTestPDF();
 *
 * // Test s velkým množstvím dat
 * testPDF.generateLargePDF();
 *
 * // Test diakritiky
 * testPDF.testDiacritics();
 */
