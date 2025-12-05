/**
 * 🔍 ISDOC Parser Utility
 *
 * Parsuje ISDOC XML soubory a extrahuje data pro faktury
 * Inspirováno: plugins/ISDOC/isdoc-to-pdf.js
 */

/**
 * Parsuje ISDOC XML soubor a vrací strukturovaná data
 * @param {File} file - ISDOC soubor
 * @returns {Promise<Object>} - Naparsovaná data faktury
 */
export async function parseISDOCFile(file) {
  try {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // Zkontroluj parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Chyba při parsování ISDOC XML: ' + parserError.textContent);
    }

    // Extrahuj invoice root element
    const invoice = xmlDoc.querySelector('Invoice') || xmlDoc.documentElement;

    // === ZÁKLADNÍ ÚDAJE FAKTURY ===
    const invoiceId = getTextContent(invoice, 'ID');
    const issueDate = getTextContent(invoice, 'IssueDate');
    const taxPointDate = getTextContent(invoice, 'TaxPointDate');

    // 🔧 Datum splatnosti - více variant selektorů pro různé ISDOC verze
    const dueDate = getTextContent(invoice, [
      'PaymentMeans Payment Details PaymentDueDate',
      'PaymentMeans Payment Details DueDate',
      'PaymentMeans Payment PaymentDueDate',
      'PaymentMeans PaymentDueDate',
      'DueDate',
      'PaymentDueDate'
    ].join(', '));

    const note = getTextContent(invoice, 'Note');

    // === DODAVATEL (AccountingSupplierParty) ===
    const supplier = invoice.querySelector('AccountingSupplierParty Party');
    const supplierName = getTextContent(supplier, 'PartyName Name');
    const supplierICO = getTextContent(supplier, 'PartyIdentification RegisterIdentificationID, PartyIdentification ID');
    const supplierDIC = getTextContent(supplier, 'PartyTaxScheme CompanyID, TaxRegistration');
    const supplierAddress = supplier ? extractAddress(supplier.querySelector('PostalAddress')) : null;

    // === ODBĚRATEL (AccountingCustomerParty) ===
    const customer = invoice.querySelector('AccountingCustomerParty Party');
    const customerName = getTextContent(customer, 'PartyName Name');
    const customerICO = getTextContent(customer, 'PartyIdentification RegisterIdentificationID, PartyIdentification ID');
    const customerDIC = getTextContent(customer, 'PartyTaxScheme CompanyID');
    const customerAddress = customer ? extractAddress(customer.querySelector('PostalAddress')) : null;

    // 🆕 === KONTAKTNÍ ÚDAJE (Email pro směrování) ===
    const electronicMail = getTextContent(customer, 'Contact ElectronicMail') ||
                           getTextContent(invoice, 'AccountingCustomerParty Party Contact ElectronicMail') ||
                           getTextContent(invoice, 'Contact ElectronicMail');

    // === POLOŽKY FAKTURY (InvoiceLines) ===
    const items = [];
    const invoiceLines = invoice.querySelectorAll('InvoiceLine');

    invoiceLines.forEach((line) => {
      // 🔧 Extrahuj popis položky (NIKDY NE SellersItemIdentification/ID!)
      const itemElement = line.querySelector('Item');
      let popis = '';
      if (itemElement) {
        // Preferuj Description, pak Name - ale NIKDY ne SellersItemIdentification
        const descElement = itemElement.querySelector(':scope > Description');
        const nameElement = itemElement.querySelector(':scope > Name');
        popis = (descElement?.textContent || nameElement?.textContent || '').trim();
      }

      const item = {
        id: getTextContent(line, 'ID'),
        popis: popis,
        mnozstvi: parseFloat(getTextContent(line, 'InvoicedQuantity')) || 1,
        jednotka: getTextContent(line, 'InvoicedQuantity').match(/unitCode="([^"]+)"/)?.[1] || 'ks',
        cena_za_jednotku: parseFloat(getTextContent(line, 'Item ClassifiedTaxCategory UnitPricePrimaryAmount, UnitPrice')) || 0,
        cena_celkem_bez_dph: parseFloat(getTextContent(line, 'LineExtensionAmount')) || 0,
        sazba_dph: parseFloat(getTextContent(line, 'Item ClassifiedTaxCategory Percent')) || 21,
        cena_celkem_s_dph: 0 // Vypočteme později
      };

      // Vypočti cenu s DPH
      item.cena_celkem_s_dph = item.cena_celkem_bez_dph * (1 + item.sazba_dph / 100);

      items.push(item);
    });

    // === CELKOVÉ ČÁSTKY (TaxTotal, LegalMonetaryTotal) ===
    const taxTotal = parseFloat(getTextContent(invoice, 'TaxTotal TaxAmount')) || 0;
    const taxExclusiveAmount = parseFloat(getTextContent(invoice, 'LegalMonetaryTotal TaxExclusiveAmount')) || 0;
    const taxInclusiveAmount = parseFloat(getTextContent(invoice, 'LegalMonetaryTotal TaxInclusiveAmount')) || 0;
    const payableAmount = parseFloat(getTextContent(invoice, 'LegalMonetaryTotal PayableAmount')) || taxInclusiveAmount;

    // 🎯 === SLEVY (AllowanceCharge, AllowanceTotalAmount) ===
    const allowanceTotalAmount = parseFloat(getTextContent(invoice, 'LegalMonetaryTotal AllowanceTotalAmount')) || 0;
    const chargeTotalAmount = parseFloat(getTextContent(invoice, 'LegalMonetaryTotal ChargeTotalAmount')) || 0;

    // Extrahuj jednotlivé slevy/příplatky
    const allowanceCharges = [];
    const allowanceChargeElements = invoice.querySelectorAll('AllowanceCharge');
    allowanceChargeElements.forEach((ac) => {
      const chargeIndicator = getTextContent(ac, 'ChargeIndicator') === 'true';
      const amount = parseFloat(getTextContent(ac, 'Amount')) || 0;
      const reason = getTextContent(ac, 'AllowanceChargeReason');

      if (amount > 0) {
        allowanceCharges.push({
          typ: chargeIndicator ? 'PRIPLATEK' : 'SLEVA',
          castka: amount,
          duvod: reason
        });
      }
    });

    // 🎯 Vypočti skutečnou slevu (rozdíl mezi součtem položek a finální částkou)
    const itemsTotalWithVat = items.reduce((sum, item) => sum + item.cena_celkem_s_dph, 0);
    const calculatedDiscount = itemsTotalWithVat - payableAmount;
    const actualDiscount = calculatedDiscount > 0 ? calculatedDiscount : allowanceTotalAmount;

    // 🎯 Vypočti procento slevy
    const discountPercent = itemsTotalWithVat > 0 ? (actualDiscount / itemsTotalWithVat) * 100 : 0;

    // === BANKOVNÍ ÚDAJE (PaymentMeans) ===
    const paymentMeans = invoice.querySelector('PaymentMeans');
    const bankAccount = getTextContent(paymentMeans, 'PayeeFinancialAccount ID, PayeeFinancialAccount AccountNumber');
    const bankCode = getTextContent(paymentMeans, 'PayeeFinancialAccount FinancialInstitutionBranch ID, PayeeFinancialAccount BankCode');
    const iban = getTextContent(paymentMeans, 'PayeeFinancialAccount IBAN');
    const swift = getTextContent(paymentMeans, 'PayeeFinancialAccount FinancialInstitutionBranch FinancialInstitution ID, PayeeFinancialAccount SWIFT');

    // 🎯 Variabilní symbol - více variant selektorů pro různé ISDOC verze
    const variableSymbol = getTextContent(paymentMeans, [
      'Payment Details VariableSymbol',
      'Payment VariableSymbol',
      'Details VariableSymbol',
      'VariableSymbol'
    ].join(', '));

    const constantSymbol = getTextContent(paymentMeans, [
      'Payment Details ConstantSymbol',
      'Payment ConstantSymbol',
      'Details ConstantSymbol',
      'ConstantSymbol'
    ].join(', '));

    const specificSymbol = getTextContent(paymentMeans, [
      'Payment Details SpecificSymbol',
      'Payment SpecificSymbol',
      'Details SpecificSymbol',
      'SpecificSymbol'
    ].join(', '));

    // === VRÁCENÍ STRUKTUROVANÝCH DAT ===
    return {
      // Základní údaje
      cislo_faktury: invoiceId,
      datum_vystaveni: issueDate,
      datum_zdanitelneho_plneni: taxPointDate || issueDate,
      datum_splatnosti: dueDate,
      poznamka: note,

      // Dodavatel
      dodavatel: {
        nazev: supplierName,
        ico: supplierICO,
        dic: supplierDIC,
        adresa: supplierAddress
      },

      // Odběratel (pro kontrolu)
      odberatel: {
        nazev: customerName,
        ico: customerICO,
        dic: customerDIC,
        adresa: customerAddress,
        email: electronicMail // 🆕 Email pro směrování
      },

      // Položky
      polozky: items,
      pocet_polozek: items.length,

      // Částky
      castka_bez_dph: taxExclusiveAmount,
      dph_celkem: taxTotal,
      castka_s_dph: payableAmount,

      // 🎯 Slevy a příplatky
      sleva_celkem: actualDiscount,
      sleva_procenta: discountPercent,
      sleva_deklarovana: allowanceTotalAmount,
      priplatek_celkem: chargeTotalAmount,
      slevy_a_priplatky: allowanceCharges,
      ma_slevu: actualDiscount > 0 || allowanceTotalAmount > 0,
      soucet_polozek_s_dph: itemsTotalWithVat,

      // Platební údaje
      platba: {
        bankovni_ucet: bankAccount,
        kod_banky: bankCode,
        iban: iban,
        swift: swift,
        variabilni_symbol: variableSymbol,
        konstantni_symbol: constantSymbol,
        specificky_symbol: specificSymbol
      },

      // Meta
      _parsed: true,
      _parsedAt: new Date().toISOString(),
      _fileName: file.name
    };

  } catch (error) {
    throw new Error(`Nepodařilo se naparsovat ISDOC soubor: ${error.message}`);
  }
}

/**
 * Pomocná funkce pro získání textového obsahu elementu
 * Podporuje CSS selektory s fallback
 */
function getTextContent(parent, selector) {
  if (!parent) return '';

  const selectors = selector.split(',').map(s => s.trim());

  for (const sel of selectors) {
    const element = parent.querySelector(sel);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  return '';
}

/**
 * Extrahuje adresu z PostalAddress elementu
 */
function extractAddress(postalAddress) {
  if (!postalAddress) return null;

  const street = getTextContent(postalAddress, 'StreetName');
  const buildingNumber = getTextContent(postalAddress, 'BuildingNumber');
  const city = getTextContent(postalAddress, 'CityName');
  const zip = getTextContent(postalAddress, 'PostalZone');
  const country = getTextContent(postalAddress, 'Country IdentificationCode, Country Name');

  const parts = [
    street && buildingNumber ? `${street} ${buildingNumber}` : (street || buildingNumber),
    zip && city ? `${zip} ${city}` : (zip || city),
    country
  ].filter(Boolean);

  return parts.join(', ') || null;
}

/**
 * Formátuje ISDOC položky do tabulkové podoby pro poznámku
 * @param {Array} polozky - Pole položek z ISDOC
 * @returns {string} - Textová tabulka
 */
function formatPolozkyToTable(polozky) {
  if (!polozky || polozky.length === 0) return '';

  const lines = [
    '=== FAKTUROVANÉ POLOŽKY ===',
    ''
  ];

  polozky.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.popis || 'Položka'}`);
    lines.push(`   Množství: ${item.mnozstvi} ${item.jednotka}`);
    lines.push(`   Cena/jedn.: ${item.cena_za_jednotku.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`);
    lines.push(`   Celkem bez DPH: ${item.cena_celkem_bez_dph.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`);
    lines.push(`   DPH ${item.sazba_dph}%: ${((item.cena_celkem_s_dph - item.cena_celkem_bez_dph)).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`);
    lines.push(`   Celkem s DPH: ${item.cena_celkem_s_dph.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Mapuje ISDOC data na strukturu faktury v našem systému
 * @param {Object} isdocData - Data z parseISDOCFile
 * @param {Object} formData - Aktuální formData z OrderForm25
 * @returns {Object} - Namapovaná data pro fakturu
 */
export function mapISDOCToFaktura(isdocData, formData = {}, useVariableSymbol = true) {
  const dnesniDatum = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 🆕 Sestavit poznámku POUZE s položkami (ZRUŠIT původní poznámku z ISDOC)
  const polozkyText = formatPolozkyToTable(isdocData.polozky);

  // 🎯 NOVÁ LOGIKA: Výběr mezi číslem faktury nebo variabilním symbolem
  const cisloFaVpd = useVariableSymbol
    ? (isdocData.platba?.variabilni_symbol || isdocData.cislo_faktury || '')
    : (isdocData.cislo_faktury || '');

  return {
    // Číslo faktury - podle volby uživatele (číslo FA nebo variabilní symbol)
    fa_cislo_vema: cisloFaVpd,

    // Data
    fa_datum_vystaveni: isdocData.datum_vystaveni || '',
    fa_datum_zdanitelneho_plneni: isdocData.datum_zdanitelneho_plneni || isdocData.datum_vystaveni || '',
    fa_datum_splatnosti: isdocData.datum_splatnosti || '',
    fa_datum_doruceni: dnesniDatum, // 🎯 DŮLEŽITÉ: Aktuální datum doručení

    // Částky
    fa_castka: isdocData.castka_s_dph || 0,
    fa_castka_bez_dph: isdocData.castka_bez_dph || 0,
    fa_dph: isdocData.dph_celkem || 0,

    // Poznámka - JEN položky, BEZ původní poznámky z ISDOC
    fa_poznamka: polozkyText,

    // Střediska - zkopírujeme z objednávky
    fa_strediska_kod: formData.strediska_kod || [],

    // 🆕 ISDOC raw JSON pro uložení do DB
    isdoc_data_json: JSON.stringify(isdocData),

    // Platební údaje (pro tooltip/info)
    _isdoc_platba: isdocData.platba,

    // Položky (pro tooltip/info)
    _isdoc_polozky: isdocData.polozky,
    _isdoc_pocet_polozek: isdocData.pocet_polozek,

    // Dodavatel (pro kontrolu)
    _isdoc_dodavatel: isdocData.dodavatel,

    // 🆕 Email směrování (pro info bublinu)
    _isdoc_email: isdocData.odberatel?.email,

    // 🆕 Původní hodnoty pro info
    _isdoc_cislo_faktury: isdocData.cislo_faktury,
    _isdoc_variabilni_symbol: isdocData.platba?.variabilni_symbol,

    // Meta
    _isdoc_parsed: true,
    _isdoc_parsed_at: isdocData._parsedAt,
    _isdoc_file_name: isdocData._fileName
  };
}

/**
 * Zjistí, zda je soubor ISDOC
 * @param {File} file - Soubor k ověření
 * @returns {boolean}
 */
export function isISDOCFile(file) {
  if (!file) return false;
  const extension = file.name.split('.').pop().toLowerCase();
  return extension === 'isdoc';
}

/**
 * Vytvoří souhrn ISDOC dat pro zobrazení v dialogu
 * @param {Object} isdocData - Data z parseISDOCFile
 * @returns {Object} - Souhrn pro UI
 */
export function createISDOCSummary(isdocData) {
  return {
    cislo_faktury: isdocData.cislo_faktury || '---',
    variabilni_symbol: isdocData.platba?.variabilni_symbol || '---',
    datum_vystaveni: isdocData.datum_vystaveni || '---',
    dodavatel: isdocData.dodavatel?.nazev || '---',
    castka_s_dph: isdocData.castka_s_dph
      ? `${parseFloat(isdocData.castka_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
      : '---',
    pocet_polozek: isdocData.pocet_polozek || 0,
    celkova_castka_polozek: isdocData.polozky?.reduce((sum, p) => sum + (p.cena_celkem_s_dph || 0), 0) || 0,
    polozky: isdocData.polozky || [], // 🎯 Přidat položky pro zobrazení
    // 🎯 Slevy
    ma_slevu: isdocData.ma_slevu || false,
    sleva_celkem: isdocData.sleva_celkem || 0,
    sleva_procenta: isdocData.sleva_procenta || 0,
    slevy_a_priplatky: isdocData.slevy_a_priplatky || []
  };
}
