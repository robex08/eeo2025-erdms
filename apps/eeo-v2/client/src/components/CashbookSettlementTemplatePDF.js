import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import liberationRegular from 'pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf';
import liberationBold from 'pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf';
import { ASSETS } from '../config/assets';

let cashbookSettlementFontsRegistered = false;
if (!cashbookSettlementFontsRegistered) {
  Font.register({
    family: 'LiberationSansPdf',
    fonts: [
      { src: liberationRegular, fontWeight: 400 },
      { src: liberationBold, fontWeight: 700 },
    ],
  });
  cashbookSettlementFontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 18,
    fontSize: 9,
    color: '#111111',
    fontFamily: 'LiberationSansPdf',
    lineHeight: 1.15,
  },
  footerPageNumber: {
    position: 'absolute',
    bottom: 11,
    left: 18,
    right: 18,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 400,
    color: '#111111',
  },
  outerBorder: {
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
    padding: 0,
  },
  headerTop: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
  },
  logoWrap: {
    width: 88,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: {
    width: 54,
    height: 54,
    objectFit: 'contain',
  },
  orgWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  orgTitle: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  docTitleRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    paddingTop: 4,
    paddingBottom: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
  },
  unitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    minHeight: 27,
  },
  unitLabelCell: {
    width: 195,
    borderRightWidth: 1,
    borderRightColor: '#111111',
    borderRightStyle: 'solid',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: 700,
  },
  unitValueCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#111111',
    borderRightStyle: 'solid',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unitPeriodCell: {
    width: 130,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unitValue: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  unitPeriodValue: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: 'center',
  },
  spacerRow: {
    minHeight: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
  },
  table: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 22,
  },
  tableHeadRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    minHeight: 30,
  },
  c1: { width: 42, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  c2: { width: 84, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  c3: { width: 80, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  c4: { flex: 1, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 5, paddingVertical: 1 },
  c5: { width: 118, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 6 },
  hc1: { width: 42, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 2 },
  hc2: { width: 84, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 2 },
  hc3: { width: 80, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 2 },
  hc4: { flex: 1, borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 2 },
  hc5: { width: 118, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 2 },
  thText: { fontSize: 8.2, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 },
  tdText: { fontSize: 8.5, lineHeight: 1.15 },
  tdNum: { fontSize: 8.5, fontWeight: 700, lineHeight: 1.15 },
  summaryWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    marginBottom: 2,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1.2,
    paddingRight: 6,
  },
  summaryValueBox: {
    width: 130,
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  summaryValueText: {
    fontSize: 9.5,
    fontWeight: 700,
  },
  attachmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    marginTop: 4,
    marginBottom: 4,
  },
  attachmentsLabel: {
    fontSize: 9.5,
    marginRight: 4,
  },
  attachmentsValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#a50034',
    marginHorizontal: 4,
  },
  attachmentsSuffix: {
    fontSize: 9.5,
    marginLeft: 4,
  },
  sectionTitleRow: {
    borderTopWidth: 1,
    borderTopColor: '#111111',
    borderTopStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    minHeight: 23,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  signHeadRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    minHeight: 22,
  },
  signHeadName: { width: '37%', borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', paddingHorizontal: 6 },
  signHeadDate: { width: '43%', borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center' },
  signHeadSign: { width: '20%', justifyContent: 'center', alignItems: 'center' },
  signRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    minHeight: 30,
  },
  signNameCell: { width: '37%', borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', paddingHorizontal: 6 },
  signDateCell: { width: '43%', borderRightWidth: 1, borderRightColor: '#111111', justifyContent: 'center', alignItems: 'center' },
  signSignCell: { width: '20%', justifyContent: 'center', alignItems: 'center' },
  signRed: { color: '#a50034', fontWeight: 700, fontSize: 9.5, lineHeight: 1.2 },
  signText: { fontSize: 9.5, lineHeight: 1.2 },
});

const paginateRows = (rows = [], fullPageRows = 28) => {
  const safeFull = Number(fullPageRows) > 0 ? Number(fullPageRows) : 28;
  if (!Array.isArray(rows) || rows.length === 0) return [[]];

  const pages = [];
  for (let i = 0; i < rows.length; i += safeFull) {
    pages.push(rows.slice(i, i + safeFull));
  }
  return pages;
};

const buildRows = (entries = [], totalRows = 15) => {
  if (Array.isArray(entries) && entries.length > 0) {
    return entries.map((entry, idx) => ({
      idx: idx + 1,
      datum: entry.datum || '',
      lpKod: entry.lpKod || '',
      ucel: entry.ucel || '',
      castka: entry.castka || '',
    }));
  }
  return Array.from({ length: totalRows }, (_, i) => ({
    idx: i + 1,
    datum: '',
    lpKod: '',
    ucel: '',
    castka: '',
  }));
};

const formatCurrencyPdf = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '';
  return `${num.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
};

function Header({ utvarNazev, cashbookPeriodLabel }) {
  return (
    <>
      <View style={styles.headerTop}>
        <View style={styles.logoWrap}>
          <Image src={ASSETS.LOGO_ZZS} style={styles.logo} />
        </View>
        <View style={styles.orgWrap}>
          <Text style={styles.orgTitle}>Zdravotnická záchranná služba Středočeského kraje, p.o.</Text>
        </View>
      </View>

      <View style={styles.docTitleRow}>
        <Text style={styles.docTitle}>Vyúčtování drobného vydání</Text>
      </View>

      <View style={styles.unitRow}>
        <View style={styles.unitLabelCell}>
          <Text style={styles.unitLabel}>Název a číslo pokladny:</Text>
        </View>
        <View style={styles.unitValueCell}>
          <Text style={styles.unitValue}>{utvarNazev || ' '}</Text>
        </View>
        <View style={styles.unitPeriodCell}>
          <Text style={styles.unitPeriodValue}>{cashbookPeriodLabel || ' '}</Text>
        </View>
      </View>

      <View style={styles.spacerRow} />
    </>
  );
}

function Table({ rows }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeadRow]}>
        <View style={styles.hc1}><Text style={styles.thText}>Poř.{"\n"}číslo</Text></View>
        <View style={styles.hc2}><Text style={styles.thText}>Datum</Text></View>
        <View style={styles.hc3}><Text style={styles.thText}>limitovaný{"\n"}příslib č.</Text></View>
        <View style={styles.hc4}><Text style={styles.thText}>Účel vydání</Text></View>
        <View style={styles.hc5}><Text style={styles.thText}>Cena včetně DPH</Text></View>
      </View>

      {rows.map((row) => (
        <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: '#111111', borderBottomStyle: 'solid' }]} key={`row_${row.idx}`}>
          <View style={styles.c1}><Text style={styles.tdText}>{row.idx}</Text></View>
          <View style={styles.c2}><Text style={styles.tdText}>{row.datum}</Text></View>
          <View style={styles.c3}><Text style={styles.tdText}>{row.lpKod}</Text></View>
          <View style={styles.c4}><Text style={styles.tdText}>{row.ucel}</Text></View>
          <View style={styles.c5}><Text style={styles.tdNum}>{row.castka}</Text></View>
        </View>
      ))}
    </View>
  );
}

function LastPageSections({
  totalAmount = 0,
  providedAdvance = 0,
  toSettle = 0,
  attachmentsCount = 0,
  preparedBy = '',
  preparedDate = '',
  prikazceName = '',
}) {
  return (
    <>
      <View style={styles.summaryWrap}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Celková částka:</Text>
          <View style={styles.summaryValueBox}><Text style={styles.summaryValueText}>{formatCurrencyPdf(totalAmount)}</Text></View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Poskytnutá záloha:</Text>
          <View style={styles.summaryValueBox}><Text style={styles.summaryValueText}>{formatCurrencyPdf(providedAdvance)}</Text></View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>K vyúčtování:</Text>
          <View style={styles.summaryValueBox}><Text style={styles.summaryValueText}>{formatCurrencyPdf(toSettle)}</Text></View>
        </View>

        <View style={styles.attachmentsRow}>
          <Text style={styles.attachmentsLabel}>Připojuji</Text>
          <Text style={styles.attachmentsValue}>{attachmentsCount || 0}</Text>
          <Text style={styles.attachmentsSuffix}>dokladů</Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Datum a podpis osoby, která vyúčtování vyhotovuje:</Text>
      </View>
      <View style={styles.signHeadRow}>
        <View style={styles.signHeadName}><Text style={styles.signText}>jméno</Text></View>
        <View style={styles.signHeadDate}><Text style={styles.signText}>datum</Text></View>
        <View style={styles.signHeadSign}><Text style={styles.signText}>podpis</Text></View>
      </View>
      <View style={styles.signRow}>
        <View style={styles.signNameCell}><Text style={styles.signText}>{preparedBy || ' '}</Text></View>
        <View style={styles.signDateCell}><Text style={styles.signRed}>{preparedDate || ' '}</Text></View>
        <View style={styles.signSignCell}><Text style={styles.signText}> </Text></View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Příkazce operace:</Text>
      </View>
      <View style={styles.signHeadRow}>
        <View style={styles.signHeadName}><Text style={styles.signText}>jméno</Text></View>
        <View style={styles.signHeadDate}><Text style={styles.signText}>datum</Text></View>
        <View style={styles.signHeadSign}><Text style={styles.signText}>podpis</Text></View>
      </View>
      <View style={styles.signRow}>
        <View style={styles.signNameCell}><Text style={styles.signRed}>{prikazceName || ' '}</Text></View>
        <View style={styles.signDateCell}><Text style={styles.signText}> </Text></View>
        <View style={styles.signSignCell}><Text style={styles.signText}> </Text></View>
      </View>
    </>
  );
}

export default function CashbookSettlementTemplatePDF({
  utvarNazev = '',
  cashbookPeriodLabel = '',
  entries = [],
  totalRows = 15,
  fullPageRows = 28,
  lastPageRows = 12,
  totalAmount = 0,
  providedAdvance = 0,
  toSettle = 0,
  attachmentsCount = 0,
  preparedBy = '',
  preparedDate = '',
  prikazceName = '',
}) {
  const rows = buildRows(entries, totalRows);
  const dataPages = paginateRows(rows, fullPageRows);
  const lastDataPageSize = dataPages.length ? dataPages[dataPages.length - 1].length : 0;
  const summaryOnDataLastPage = lastDataPageSize <= lastPageRows;
  const totalPages = summaryOnDataLastPage ? dataPages.length : (dataPages.length + 1);

  return (
    <Document>
      {dataPages.map((pageRows, pageIndex) => {
        const isLastDataPage = pageIndex === dataPages.length - 1;
        const renderSummaryHere = summaryOnDataLastPage && isLastDataPage;
        return (
          <Page size="A4" style={styles.page} key={`cashbook_page_${pageIndex + 1}`}>
            <View style={styles.outerBorder}>
              <Header utvarNazev={utvarNazev} cashbookPeriodLabel={cashbookPeriodLabel} />
              <Table rows={pageRows} />
              {renderSummaryHere ? (
                <LastPageSections
                  totalAmount={totalAmount}
                  providedAdvance={providedAdvance}
                  toSettle={toSettle}
                  attachmentsCount={attachmentsCount}
                  preparedBy={preparedBy}
                  preparedDate={preparedDate}
                  prikazceName={prikazceName}
                />
              ) : null}
            </View>
            <Text
              style={styles.footerPageNumber}
            >{`Strana ${pageIndex + 1}/${totalPages}`}</Text>
          </Page>
        );
      })}

      {!summaryOnDataLastPage && (
        <Page size="A4" style={styles.page} key="cashbook_summary_page">
          <View style={styles.outerBorder}>
            <Header utvarNazev={utvarNazev} cashbookPeriodLabel={cashbookPeriodLabel} />
            <Table rows={[]} />
            <LastPageSections
              totalAmount={totalAmount}
              providedAdvance={providedAdvance}
              toSettle={toSettle}
              attachmentsCount={attachmentsCount}
              preparedBy={preparedBy}
              preparedDate={preparedDate}
              prikazceName={prikazceName}
            />
          </View>
          <Text style={styles.footerPageNumber}>{`Strana ${totalPages}/${totalPages}`}</Text>
        </Page>
      )}
    </Document>
  );
}
