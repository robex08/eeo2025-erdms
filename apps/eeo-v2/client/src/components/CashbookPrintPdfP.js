import React, { useMemo } from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import '../utils/pdfFonts';
import { ASSETS } from '../config/assets';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    paddingBottom: 56,
    fontFamily: 'Roboto',
    fontSize: 9,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  logoContainer: {
    width: 56,
    height: 56,
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
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 3,
  },
  headerInfo: {
    fontSize: 9,
    color: '#6b7280',
  },
  headerPeriod: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },
  periodMonth: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  periodYear: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  summaryBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#0f172a',
  },
  table: {
    display: 'table',
    width: 'auto',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    padding: 5,
    fontSize: 8,
    fontWeight: 700,
    color: '#ffffff',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#d1d5db',
    textAlign: 'center',
  },
  tableCell: {
    padding: 4,
    fontSize: 8,
    color: '#1f2937',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#d1d5db',
  },
  tableFirstCol: {
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
    borderLeftStyle: 'solid',
  },
  colNum: { width: '4%', textAlign: 'center' },
  colDate: { width: '8%', textAlign: 'center' },
  colDoc: { width: '8%', textAlign: 'center' },
  colDesc: { width: '22%' },
  colPerson: { width: '15%' },
  colIncome: { width: '10%', textAlign: 'right' },
  colExpense: { width: '10%', textAlign: 'right' },
  colBalance: { width: '11%', textAlign: 'right' },
  colLpCode: { width: '7%', textAlign: 'left', fontSize: 7 },
  colNote: { width: '15%' },

  prikazceSection: {
    marginTop: 14,
  },
  prikazceTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1e3a8a',
    marginBottom: 6,
  },
  miniTable: {
    display: 'table',
    width: 'auto',
  },
  miniHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  miniRow: {
    flexDirection: 'row',
  },
  miniHeadCell: {
    padding: 5,
    fontSize: 8,
    fontWeight: 700,
    color: '#0f172a',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#cbd5e1',
  },
  miniCell: {
    padding: 5,
    fontSize: 8,
    color: '#1f2937',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#cbd5e1',
  },
  miniPrikazce: { width: '38%' },
  miniLpKod: { width: '14%', textAlign: 'center' },
  miniSoucet: { width: '18%', textAlign: 'right' },
  miniSign: { width: '30%' },
  miniPrikazceNoLines: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    backgroundColor: '#ffffff',
  },
  miniPrikazceGroupEnd: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  miniSignEmpty: { backgroundColor: '#ffffff' },
  miniSignNoLines: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    backgroundColor: '#ffffff',
  },
  miniFirstCol: {
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
    borderLeftStyle: 'solid',
  },
  miniTotalBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  miniSignGroupEnd: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  miniTotalRow: {
    backgroundColor: '#ffffff',
  },
  miniTotalLabel: {
    fontWeight: 700,
    textAlign: 'right',
  },
  miniTotalAmount: {
    fontWeight: 700,
  },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

const formatCurrency = (amount) => {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return '';
  return `${new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)} Kč`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CashbookPrintPdfP = ({
  organizationInfo,
  carryOverAmount,
  totals,
  entries,
  generatedBy,
  prikazceLpSummary,
}) => {
  const currentDate = new Date().toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const summaryGroups = useMemo(() => {
    const grouped = new Map();
    (prikazceLpSummary || []).forEach((row) => {
      const prikazce = row.prikazce || 'Neurčeno';
      const prikazceKey = row.prikazceKey || prikazce;
      const sortKey = row.prikazceSortKey || prikazce;

      if (!grouped.has(prikazceKey)) {
        grouped.set(prikazceKey, { prikazce, sortKey, rows: [] });
      }
      grouped.get(prikazceKey).rows.push(row);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        const bySortKey = String(a.sortKey || '').localeCompare(String(b.sortKey || ''), 'cs-CZ');
        if (bySortKey !== 0) return bySortKey;
        return String(a.prikazce || '').localeCompare(String(b.prikazce || ''), 'cs-CZ');
      })
      .map((group) => ({
        prikazce: group.prikazce,
        rows: [...group.rows]
          .sort((a, b) => String(a.lpKod || '').localeCompare(String(b.lpKod || ''), 'cs-CZ'))
      }));
  }, [prikazceLpSummary]);

  const totalLpAmount = useMemo(() => {
    return summaryGroups.reduce((sum, group) => {
      const groupSum = group.rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      return sum + groupSum;
    }, 0);
  }, [summaryGroups]);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={ASSETS.LOGO_ZZS_MAIN} style={styles.logo} />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerOrganization}>
              {organizationInfo.organizationName || 'Zdravotnická záchranná služba Středočeského kraje, p.o.'}
            </Text>
            <Text style={styles.headerTitle}>POKLADNÍ KNIHA</Text>
            <Text style={styles.headerInfo}>
              Pracoviště: {organizationInfo.workplace || 'Pokladna'} | Pokladna č. {organizationInfo.cashboxNumber || '-'}
            </Text>
          </View>

          <View style={styles.headerPeriod}>
            <Text style={styles.periodMonth}>{(organizationInfo.month || '').toUpperCase()}</Text>
            <Text style={styles.periodYear}>{organizationInfo.year || ''}</Text>
          </View>
        </View>

        <View style={styles.summaryBlock}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Převod z předchozího měsíce</Text>
              <Text style={styles.summaryValue}>{formatCurrency(carryOverAmount)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Celkové příjmy</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals?.totalIncome)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Celkové výdaje</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals?.totalExpenses)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Aktuální zůstatek</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals?.currentBalance)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.tableHeaderCell, styles.colNum, styles.tableFirstCol]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Datum</Text>
            <Text style={[styles.tableHeaderCell, styles.colDoc]}>Doklad č.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Obsah zápisu</Text>
            <Text style={[styles.tableHeaderCell, styles.colPerson]}>Komu/Od koho</Text>
            <Text style={[styles.tableHeaderCell, styles.colIncome]}>Příjmy (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colExpense]}>Výdaje (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colBalance]}>Zůstatek (Kč)</Text>
            <Text style={[styles.tableHeaderCell, styles.colLpCode]}>LP kód</Text>
            <Text style={[styles.tableHeaderCell, styles.colNote]}>Poznámka</Text>
          </View>

          {(entries || []).map((entry, index) => (
            <View key={entry.id || index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, styles.colNum, styles.tableFirstCol]}>{index + 1}</Text>
              <Text style={[styles.tableCell, styles.colDate]}>{formatDate(entry.date)}</Text>
              <Text style={[styles.tableCell, styles.colDoc]}>{entry.documentNumber || ''}</Text>
              <Text style={[styles.tableCell, styles.colDesc]}>{entry.description || ''}</Text>
              <Text style={[styles.tableCell, styles.colPerson]}>{entry.person || ''}</Text>
              <Text style={[styles.tableCell, styles.colIncome]}>{entry.income ? formatCurrency(entry.income) : ''}</Text>
              <Text style={[styles.tableCell, styles.colExpense]}>{entry.expense ? formatCurrency(entry.expense) : ''}</Text>
              <Text style={[styles.tableCell, styles.colBalance]}>{formatCurrency(entry.balance)}</Text>
              <Text style={[styles.tableCell, styles.colLpCode]}>
                {entry.detailItems && entry.detailItems.length > 0
                  ? entry.detailItems.map((item) => `${item.lp_kod}: ${formatCurrency(item.castka)}`).join('\n')
                  : (entry.lpCode || '')}
              </Text>
              <Text style={[styles.tableCell, styles.colNote]}>{entry.note || ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.prikazceSection}>
          <Text style={styles.prikazceTitle}>Souhrn LP dle příkazce</Text>
          <View style={styles.miniTable}>
            <View style={styles.miniHeader} fixed>
              <Text style={[styles.miniHeadCell, styles.miniPrikazce, styles.miniFirstCol]}>Příkazce</Text>
              <Text style={[styles.miniHeadCell, styles.miniLpKod]}>LP kód</Text>
              <Text style={[styles.miniHeadCell, styles.miniSoucet]}>Součet</Text>
              <Text style={[styles.miniHeadCell, styles.miniSign]}>Podpis</Text>
            </View>

            {summaryGroups.length === 0 ? (
              <View style={styles.miniRow}>
                <Text style={[styles.miniCell, styles.miniPrikazce, styles.miniPrikazceNoLines, styles.miniFirstCol, styles.miniPrikazceGroupEnd]}>-</Text>
                <Text style={[styles.miniCell, styles.miniLpKod]}>-</Text>
                <Text style={[styles.miniCell, styles.miniSoucet]}>0,00 Kč</Text>
                <View style={[styles.miniCell, styles.miniSign, styles.miniSignNoLines, styles.miniSignGroupEnd]} />
              </View>
            ) : summaryGroups.map((group, groupIdx) => (
              <View key={`${group.prikazce}_${groupIdx}`} wrap={false}>
                {group.rows.map((row, rowIdx) => {
                  const isFirst = rowIdx === 0;
                  const isLast = rowIdx === group.rows.length - 1;
                  return (
                    <View
                      key={`${group.prikazce}_${row.lpKod}_${rowIdx}`}
                      style={styles.miniRow}
                    >
                      <Text style={[
                        styles.miniCell,
                        styles.miniPrikazce,
                        styles.miniPrikazceNoLines,
                        styles.miniFirstCol,
                        isLast ? styles.miniPrikazceGroupEnd : null,
                      ]}>{isFirst ? group.prikazce : ''}</Text>
                      <Text style={[styles.miniCell, styles.miniLpKod]}>{row.lpKod || ''}</Text>
                      <Text style={[styles.miniCell, styles.miniSoucet]}>{formatCurrency(row.amount)}</Text>
                      <View style={[
                        styles.miniCell,
                        styles.miniSign,
                        styles.miniSignEmpty,
                        styles.miniSignNoLines,
                        isLast ? styles.miniSignGroupEnd : null,
                      ]} />
                    </View>
                  );
                })}
              </View>
            ))}

            {summaryGroups.length > 0 && (
              <View style={[styles.miniRow, styles.miniTotalRow]} wrap={false}>
                <Text style={[styles.miniCell, styles.miniPrikazce, styles.miniPrikazceNoLines, styles.miniFirstCol, styles.miniTotalBottom]} />
                <Text style={[styles.miniCell, styles.miniLpKod, styles.miniTotalLabel]}>Celkem</Text>
                <Text style={[styles.miniCell, styles.miniSoucet, styles.miniTotalAmount]}>{formatCurrency(totalLpAmount)}</Text>
                <View style={[styles.miniCell, styles.miniSign, styles.miniSignEmpty, styles.miniSignNoLines, styles.miniTotalBottom]} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{generatedBy?.fullName || ''} | {generatedBy?.usekZkr || ''} | {generatedBy?.lokalita || organizationInfo.workplace || ''}</Text>
          <Text>Vygenerováno: {currentDate}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default CashbookPrintPdfP;
