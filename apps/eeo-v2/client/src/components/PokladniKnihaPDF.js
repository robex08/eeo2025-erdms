import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import '../utils/pdfFonts'; // 🔥 Automatická registrace Roboto fontů
import { ASSETS } from '../config/assets';

// Styly pro PDF dokument
const styles = StyleSheet.create({
  // Základní nastavení stránky
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    paddingBottom: 60, // Více místa pro patičku
    fontFamily: 'Roboto',
    fontSize: 9,
  },

  // Hlavička dokumentu
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },

  logoContainer: {
    width: 60,
    height: 60,
  },

  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  headerContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },

  headerOrganization: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 10,
    fontWeight: 400,
    color: '#6b7280',
    marginBottom: 2,
  },

  headerInfo: {
    fontSize: 9,
    fontWeight: 400,
    color: '#6b7280',
  },

  // Měsíc a rok vpravo nahoře
  headerPeriod: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },

  periodMonth: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
  },

  periodYear: {
    fontSize: 16,
    fontWeight: 500,
    color: '#374151',
  },

  // Souhrn (summary block)
  summaryBlock: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    gap: 8,
  },

  summaryItem: {
    flex: 1,
    minWidth: 0,
  },

  summaryLabel: {
    fontSize: 7,
    fontWeight: 400,
    color: '#6b7280',
    marginBottom: 2,
  },

  summaryValue: {
    fontSize: 11,
    fontWeight: 700,
  },

  summaryValuePositive: {
    color: '#10b981',
  },

  summaryValueNegative: {
    color: '#ef4444',
  },

  summaryValueNeutral: {
    color: '#1e40af',
  },

  // Vizitka stavu knihy
  bookStatusCard: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderLeftStyle: 'solid',
  },

  bookStatusCardClosed: {
    backgroundColor: '#fef3c7',
    borderLeftColor: '#eab308',
  },

  bookStatusCardLocked: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },

  bookStatusTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 4,
  },

  bookStatusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#78716c',
  },

  bookStatusInfoItem: {
    flexDirection: 'row',
    gap: 4,
  },

  bookStatusLabel: {
    fontWeight: 500,
  },

  bookStatusValue: {
    fontWeight: 400,
    color: '#1c1917',
  },

  // Tabulka
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  tableRow: {
    flexDirection: 'row',
  },

  // Hlavička tabulky
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
  },

  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 700,
    color: '#ffffff',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#d1d5db',
    textAlign: 'center',
    verticalAlign: 'middle',
  },

  // Buňky tabulky
  tableCell: {
    padding: 5,
    fontSize: 8,
    fontWeight: 400,
    color: '#1f2937',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#d1d5db',
  },

  tableCellAlternate: {
    backgroundColor: '#f9fafb',
  },

  // Specifické šířky sloupců
  colNumber: {
    width: '4%',
    textAlign: 'center',
  },

  colDate: {
    width: '8%',
    textAlign: 'center',
  },

  colDocNumber: {
    width: '8%',
    textAlign: 'center',
  },

  colDescription: {
    width: '22%',
    textAlign: 'left',
  },

  colPerson: {
    width: '15%',
    textAlign: 'left',
  },

  colIncome: {
    width: '10%',
    textAlign: 'right',
    fontWeight: 700,
    color: '#10b981',
  },

  colExpense: {
    width: '10%',
    textAlign: 'right',
    fontWeight: 700,
    color: '#ef4444',
  },

  colBalance: {
    width: '11%',
    textAlign: 'right',
    fontWeight: 700,
    color: '#1e40af',
  },

  colLpCode: {
    width: '7%',
    textAlign: 'center',
  },

  colNote: {
    width: '15%',
    textAlign: 'left',
    fontSize: 7,
  },

  // Speciální styly pro hlavičky sloupců s čísly (vycentrované)
  colHeaderIncome: {
    width: '10%',
    textAlign: 'center',
  },

  colHeaderExpense: {
    width: '10%',
    textAlign: 'center',
  },

  colHeaderBalance: {
    width: '11%',
    textAlign: 'center',
  },

  // Patička
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
});

// Komponenta pro formátování měny
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return '';
  }
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' Kč';
};

// Komponenta pro formátování data
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
};

// Hlavní komponenta PDF dokumentu
const PokladniKnihaPDF = ({
  organizationInfo,
  carryOverAmount,
  totals,
  entries,
  generatedBy, // Informace o tom, kdo generoval: { fullName, usekZkr, lokalita }
  bookStatus // Stav knihy: { status: 'aktivni'|'uzavrena_uzivatelem'|'zamknuta_spravcem', closedDate, closedBy, lockedDate, lockedBy }
}) => {
  const currentDate = new Date().toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Hlavička s logem */}
        <View style={styles.header}>
          {/* Logo vlevo */}
          <View style={styles.logoContainer}>
            <Image
              src={ASSETS.LOGO_ZZS_MAIN}
              style={styles.logo}
            />
          </View>

          {/* Textový obsah hlavičky */}
          <View style={styles.headerContent}>
            <Text style={styles.headerOrganization}>
              {organizationInfo.organizationName || 'Zdravotnická záchranná služba Středočeského kraje, p.o.'}
            </Text>
            <Text style={styles.headerTitle}>POKLADNÍ KNIHA</Text>
            <Text style={styles.headerInfo}>
              Pracoviště: {organizationInfo.workplace || 'Příbram'} | Pokladna č. {organizationInfo.cashboxNumber || '600'}
            </Text>
          </View>

          {/* Měsíc a rok vpravo nahoře */}
          <View style={styles.headerPeriod}>
            <Text style={styles.periodMonth}>
              {(organizationInfo.month || 'listopad').toUpperCase()}
            </Text>
            <Text style={styles.periodYear}>
              {organizationInfo.year || '2025'}
            </Text>
          </View>
        </View>

        {/* Vizitka stavu knihy (pouze pokud je uzavřená nebo zamčená) */}
        {bookStatus && (bookStatus.status === 'uzavrena_uzivatelem' || bookStatus.status === 'zamknuta_spravcem') && (
          <View style={[
            styles.bookStatusCard,
            bookStatus.status === 'uzavrena_uzivatelem' && styles.bookStatusCardClosed,
            bookStatus.status === 'zamknuta_spravcem' && styles.bookStatusCardLocked,
          ]}>
            {/* Řádek 1: Titulek */}
            <Text style={styles.bookStatusTitle}>
              {bookStatus.status === 'uzavrena_uzivatelem' ? '🔒 KNIHA UZAVŘENA' : '🔐 KNIHA ZAMČENA'}
            </Text>

            {/* Řádek 2: Informace v jednom řádku */}
            <View style={styles.bookStatusInfo}>
              {bookStatus.status === 'uzavrena_uzivatelem' && (
                <>
                  {bookStatus.closedDate && (
                    <View style={styles.bookStatusInfoItem}>
                      <Text style={styles.bookStatusLabel}>Uzavřeno dne:</Text>
                      <Text style={styles.bookStatusValue}>{formatDate(bookStatus.closedDate)}</Text>
                    </View>
                  )}
                  {bookStatus.closedBy && (
                    <View style={styles.bookStatusInfoItem}>
                      <Text style={styles.bookStatusLabel}>Uzavřel:</Text>
                      <Text style={styles.bookStatusValue}>{bookStatus.closedBy}</Text>
                    </View>
                  )}
                </>
              )}

              {bookStatus.status === 'zamknuta_spravcem' && (
                <>
                  {bookStatus.lockedDate && (
                    <View style={styles.bookStatusInfoItem}>
                      <Text style={styles.bookStatusLabel}>Zamčeno dne:</Text>
                      <Text style={styles.bookStatusValue}>{formatDate(bookStatus.lockedDate)}</Text>
                    </View>
                  )}
                  {bookStatus.lockedBy && (
                    <View style={styles.bookStatusInfoItem}>
                      <Text style={styles.bookStatusLabel}>Zamkl:</Text>
                      <Text style={styles.bookStatusValue}>{bookStatus.lockedBy}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Souhrn */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Převod z předchozího měsíce:
              </Text>
              <Text style={[styles.summaryValue, styles.summaryValueNeutral]}>
                {formatCurrency(carryOverAmount)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Celkové příjmy:
              </Text>
              <Text style={[styles.summaryValue, styles.summaryValuePositive]}>
                {formatCurrency(totals.totalIncome)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Celkové výdaje:
              </Text>
              <Text style={[styles.summaryValue, styles.summaryValueNegative]}>
                {formatCurrency(totals.totalExpenses)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Aktuální zůstatek:
              </Text>
              <Text style={[
                styles.summaryValue,
                totals.currentBalance >= 0
                  ? styles.summaryValuePositive
                  : styles.summaryValueNegative
              ]}>
                {formatCurrency(totals.currentBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabulka */}
        <View style={styles.table}>
          {/* Hlavička tabulky */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colNumber]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Datum</Text>
            <Text style={[styles.tableHeaderCell, styles.colDocNumber]}>Doklad č.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Obsah zápisu</Text>
            <Text style={[styles.tableHeaderCell, styles.colPerson]}>Komu/Od koho</Text>
            <Text style={[styles.tableHeaderCell, styles.colHeaderIncome]}>Příjmy (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colHeaderExpense]}>Výdaje (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colHeaderBalance]}>Zůstatek (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colLpCode]}>LP kód</Text>
            <Text style={[styles.tableHeaderCell, styles.colNote]}>Poznámka</Text>
          </View>

          {/* Řádky tabulky */}
          {entries.map((entry, index) => (
            <View
              key={entry.id || index}
              style={[
                styles.tableRow,
                index % 2 === 1 && styles.tableCellAlternate
              ]}
            >
              <Text style={[styles.tableCell, styles.colNumber]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, styles.colDate]}>
                {formatDate(entry.date)}
              </Text>
              <Text style={[styles.tableCell, styles.colDocNumber]}>
                {entry.documentNumber || ''}
              </Text>
              <Text style={[styles.tableCell, styles.colDescription]}>
                {entry.description || ''}
              </Text>
              <Text style={[styles.tableCell, styles.colPerson]}>
                {entry.person || ''}
              </Text>
              <Text style={[styles.tableCell, styles.colIncome]}>
                {entry.income ? formatCurrency(entry.income) : ''}
              </Text>
              <Text style={[styles.tableCell, styles.colExpense]}>
                {entry.expense ? formatCurrency(entry.expense) : ''}
              </Text>
              <Text style={[styles.tableCell, styles.colBalance]}>
                {formatCurrency(entry.balance)}
              </Text>
              <Text style={[styles.tableCell, styles.colLpCode]}>
                {entry.lpCode || ''}
              </Text>
              <Text style={[styles.tableCell, styles.colNote]}>
                {entry.note || ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Patička */}
        <View style={styles.footer} fixed>
          <Text>
            {generatedBy?.fullName || ''} | {generatedBy?.usekZkr || ''} | {generatedBy?.lokalita || organizationInfo.workplace || ''}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Strana ${pageNumber} z ${totalPages}`
            }
          />
          <Text>Vygenerováno: {currentDate}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PokladniKnihaPDF;
