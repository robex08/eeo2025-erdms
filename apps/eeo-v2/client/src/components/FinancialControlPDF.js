import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import '../utils/pdfFonts'; // 🔥 Automatická registrace Roboto fontů
import { ASSETS } from '../config/assets';

// Styly pro PDF dokument
const styles = StyleSheet.create({
  // Základní nastavení stránky A4 na výšku
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 55,
    fontFamily: 'Roboto',
    fontSize: 9,
  },

  // Hlavička s logem a názvem
  header: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 10,
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
    marginLeft: 20,
  },

  headerOrganization: {
    fontSize: 9,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#059669',
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 8,
    fontWeight: 400,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  // Datum generování vpravo nahoře
  headerDate: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },

  dateLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },

  dateValue: {
    fontSize: 10,
    fontWeight: 600,
    color: '#374151',
  },

  // Sekce objednávky
  section: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    borderLeftStyle: 'solid',
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#047857',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Informační řádky
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },

  infoLabel: {
    width: '35%',
    fontSize: 9,
    fontWeight: 700,
    color: '#374151',
  },

  infoValue: {
    width: '65%',
    fontSize: 10,
    fontWeight: 400,
    color: '#1f2937',
  },

  infoValueHighlight: {
    fontSize: 11,
    fontWeight: 700,
    color: '#059669',
  },

  // Sekce kontroly před vznikem závazku
  controlSection: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    borderLeftStyle: 'solid',
  },

  controlTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 8,
    textAlign: 'center',
  },

  controlRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },

  controlLabel: {
    width: '40%',
    fontSize: 9,
    fontWeight: 600,
    color: '#1e40af',
  },

  controlValue: {
    width: '60%',
    fontSize: 9,
    fontWeight: 400,
    color: '#1f2937',
  },

  // Sekce kontroly po vzniku závazku
  postControlSection: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderLeftStyle: 'solid',
  },

  postControlTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 8,
    textAlign: 'center',
  },

  // Sekce schválení schvalovatelem
  approvalSection: {
    marginTop: 25,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
  },

  approvalTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },

  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },

  signatureBlock: {
    width: '45%',
    flexDirection: 'column',
    alignItems: 'center',
  },

  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    marginBottom: 5,
    height: 30,
  },

  signatureLabel: {
    fontSize: 8,
    fontWeight: 500,
    color: '#475569',
    textAlign: 'center',
  },

  // Právní informace - patička
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },

  footerText: {
    fontSize: 6,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 2,
  },

  footerReference: {
    fontSize: 6,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Zveřejnění v registru smluv sekce
  registrySection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderTopWidth: 2,
    borderTopColor: '#0284c7',
    borderTopStyle: 'solid',
  },

  registryTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#0369a1',
    marginBottom: 6,
  },

  registryRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  registryLabel: {
    width: '30%',
    fontSize: 8,
    fontWeight: 600,
    color: '#0c4a6e',
  },

  registryValue: {
    width: '70%',
    fontSize: 8,
    fontWeight: 400,
    color: '#1f2937',
  },

  // Variabilní symbol box
  variableSymbolBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fefce8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde047',
    borderStyle: 'solid',
  },

  variableSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  variableSymbolLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#854d0e',
    marginRight: 8,
  },

  variableSymbolValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#a16207',
  },

  // 📊 Tabulka DPH
  dphTable: {
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
  },

  dphTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#9ca3af',
    padding: 8,
  },

  dphTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },

  dphTableRowTotal: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderTopWidth: 2,
    borderTopColor: '#059669',
  },

  dphTableCell: {
    fontSize: 9,
    color: '#374151',
  },

  dphTableCellHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1f2937',
  },

  dphTableCellNumber: {
    fontSize: 9,
    color: '#374151',
    textAlign: 'right',
  },

  dphTableCellTotal: {
    fontSize: 10,
    fontWeight: 700,
    color: '#047857',
    textAlign: 'right',
  },

  dphColSazba: {
    width: '20%',
  },

  dphColBezDph: {
    width: '27%',
  },

  dphColDph: {
    width: '27%',
  },

  dphColSvDph: {
    width: '26%',
  },
});

// Pomocné funkce
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '---';
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return '---';
  }
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' Kč';
};

const formatDate = (dateString) => {
  if (!dateString) return '---';
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

const formatDateTime = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Komponenta pro generování PDF dokumentu "Záznam o předběžné řídící kontrole"
 * 
 * Podle zákona č. 320/2001 Sb., o finanční kontrole ve veřejné správě
 * 
 * @param {Object} order - Objednávka s kompletními daty
 * @param {Object} generatedBy - Informace o generátorovi {fullName, position}
 * @param {Object} organizace - Vizitka organizace (nazev_organizace, ico, adresa, email, telefon)
 * @param {Object} strediskaMap - Mapa středisek {kod: nazev} pro převod kódů na názvy
 */
const FinancialControlPDF = ({ order, generatedBy, organizace, strediskaMap = {} }) => {
  const currentDate = new Date().toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ========================================
  // 📋 EXTRAKCE DAT Z OBJEDNÁVKY
  // ========================================
  // POZNÁMKA: Backend /enriched endpoint nahraje enriched data přímo do order objektu
  // Používáme order.uzivatel, order.garant_uzivatel, order.schvalovatel_uzivatel, atd.
  // (NE order._enriched.*!)

  // 🔴 Helper pro označení chybějících dat
  const MISSING = '---';
  const getMissingStyle = (value) => value === MISSING ? { color: '#6b7280', fontWeight: 400 } : {};

  // Základní údaje
  const objednavkaCislo = order?.cislo_objednavky || MISSING;
  const datumVytvoreni = order?.dt_objednavky || order?.datum_obj_od || MISSING;
  const predmet = order?.predmet || MISSING;
  
  // 👤 Helper funkce pro formátování jmen (PŘÍJMENÍ + JMÉNO + tituly)
  const formatUserName = (user) => {
    if (!user) return MISSING;
    
    // Pokud má už hotové cele_jmeno, použij ho
    if (user.cele_jmeno) return user.cele_jmeno;
    
    // Jinak sestať z jednotlivých polí: titul před + příjmení + jméno + titul za
    const titul_pred = user.titul_pred || '';
    const prijmeni = user.prijmeni || '';
    const jmeno = user.jmeno || '';
    const titul_za = user.titul_za || '';
    
    const fullName = `${titul_pred} ${prijmeni} ${jmeno} ${titul_za}`.replace(/\s+/g, ' ').trim();
    return fullName || MISSING;
  };
  
  // 👤 Uživatelé - všichni ve formátu PŘÍJMENÍ JMÉNO
  const vyrizuje = formatUserName(order?.objednatel || order?.uzivatel);
  const garant = formatUserName(order?.garant_uzivatel || order?.garant);
  const schvalovatel = formatUserName(order?.schvalovatel || order?.prikazce);
  
  // 📅 Datum vytvoření (dt_vytvoreni) - zobrazí se pod "Vyřizuje"
  const dtVytvoreni = order?.dt_vytvoreni || MISSING;
  
  // 👤 Uzavřel (dokončil) objednávku - je to aktuální uživatel, který potvrzuje dokončení
  const dokoncil = generatedBy?.fullName || formatUserName(order?.dokoncil) || MISSING;
  const datumDokonceni = order?.dt_dokonceni || new Date().toLocaleString('cs-CZ');

  // 💰 Ceny - VÝPOČET Z POLOŽEK podle sazeb DPH
  // Projdeme všechny položky a seskupíme podle sazby DPH
  const dphBreakdown = (() => {
    const polozky = order?.polozky || [];
    if (!Array.isArray(polozky) || polozky.length === 0) {
      return [];
    }

    // Seskupení podle sazby DPH
    const grouped = {};
    polozky.forEach(item => {
      const sazba = parseFloat(item.sazba_dph) || 0;
      const cenaBezDph = parseFloat(item.cena_bez_dph) || 0;
      const cenaSvDph = parseFloat(item.cena_s_dph) || 0;
      const dphCastka = cenaSvDph - cenaBezDph;

      if (!grouped[sazba]) {
        grouped[sazba] = {
          sazba: sazba,
          cenaBezDph: 0,
          dphCastka: 0,
          cenaSvDph: 0,
        };
      }

      grouped[sazba].cenaBezDph += cenaBezDph;
      grouped[sazba].dphCastka += dphCastka;
      grouped[sazba].cenaSvDph += cenaSvDph;
    });

    // Převod na array a seřazení podle sazby (od nejvyšší)
    return Object.values(grouped).sort((a, b) => b.sazba - a.sazba);
  })();

  // Celkové součty
  const cenaBezDPH = dphBreakdown.reduce((sum, item) => sum + item.cenaBezDph, 0);
  const celkovaDPH = dphBreakdown.reduce((sum, item) => sum + item.dphCastka, 0);
  const cenaSvDPH = dphBreakdown.reduce((sum, item) => sum + item.cenaSvDph, 0);

  // ========================================
  // 🔵 KONTROLA PŘED VZNIKEM ZÁVAZKU
  // ========================================
  
  const komentar = order?.schvaleni_komentar || '';
  const schvalenoDne = order?.dt_schvaleni || MISSING;
  
  // Financování - Backend posílá enriched data v order.financovani (vnořený objekt)
  // OPRAVA: Používej order.financovani místo flat struktury
  const financovani = order?.financovani?.typ_nazev || order?.financovani?.typ || order?.zpusob_financovani || MISSING;
  
  // Použít data přímo z order.financovani (backend již obohatil)
  const financovaniData = {
    typ: order?.zpusob_financovani || '',
    lp_kody: order?.lp_kod || [], // ✅ Přímo z order objektu
    lp_kod: order?.lp_kod || [],  
    lp_nazvy: order?.lp_nazvy || [], // ✅ Enriched data přímo z order objektu
    lp_poznamka: order?.lp_poznamka || '',
    cislo_smlouvy: order?.cislo_smlouvy || '',
    smlouva_poznamka: order?.smlouva_poznamka || '',
    individualni_schvaleni: order?.individualni_schvaleni || '',
    individualni_poznamka: order?.individualni_poznamka || '',
    pojistna_udalost_cislo: order?.pojistna_udalost_cislo || '',
    pojistna_udalost_poznamka: order?.pojistna_udalost_poznamka || ''
  };
  

  
  // 💰 Maximální cena s DPH (z objednávky)
  const maxCenaSvDph = order?.max_cena_s_dph ? parseFloat(order.max_cena_s_dph) : null;
  
  // 🏢 Dodavatel (přímo v order)
  const dodavatelNazev = order?.dodavatel_nazev || MISSING;
  const dodavatelAdresa = order?.dodavatel_adresa || MISSING;
  const dodavatelICO = order?.dodavatel_ico || MISSING;
  const dodavatelDIC = order?.dodavatel_dic || MISSING;
  const odeslanoDodavateli = order?.dt_odeslani || MISSING;

  // ========================================
  // 🟡 KONTROLA PO VZNIKU ZÁVAZKU
  // ========================================
  
  const variabilniSymbol = order?.variabilni_symbol || MISSING;
  
  // 📄 FA VS - číslo faktury z prvního záznamu faktury
  const faCisloVema = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      return order.faktury[0].fa_cislo_vema || MISSING;
    }
    return MISSING;
  })();
  
  // 🏛️ Střediska z faktury - fa_strediska_kod
  const faStrediska = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      const fa = order.faktury[0];
      if (fa.fa_strediska_kod && Array.isArray(fa.fa_strediska_kod) && fa.fa_strediska_kod.length > 0) {
        return fa.fa_strediska_kod.join(', ');
      }
    }
    return MISSING;
  })();
  
  // 📅 Splatnost faktury - datum splatnosti z faktury
  const splatnost = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      return order.faktury[0].fa_datum_splatnosti || MISSING;
    }
    return order?.splatnost_faktury || MISSING;
  })();
  
  // 📊 Datum vystaveni faktury - pro pole "Dne"
  const datumVystaveniFaktury = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      return order.faktury[0].fa_datum_vystaveni || MISSING;
    }
    return order?.dt_vecna_spravnost || MISSING;
  })();
  
  // 💰 Částka z faktury (fa_castka)
  const faCastka = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      const castka = order.faktury[0].fa_castka;
      return castka ? parseFloat(castka) : null;
    }
    return null;
  })();
  
  // 🏛️ Střediska objednávky (z order.strediska_kod)
  // Backend vrací strediska_kod jako array strings ["901_VEDENI_ZZS_SK", "100_POLIKLINIKA"]
  // Použijeme strediskaMap pro převod kódů na názvy
  const objednavkaStrediska = (() => {
    if (order?.strediska_kod && Array.isArray(order.strediska_kod) && order.strediska_kod.length > 0) {
      // Použij mapu pro převod kódů na názvy
      return order.strediska_kod.map(kod => strediskaMap[kod] || kod).join(', ');
    }
    return MISSING;
  })();

  // 🏛️ DEPRECATED: Stará proměnná stredisko (ponecháno pro kompatibilitu)
  const stredisko = (() => {
    // 1. Priorita: enriched střediska s plnými názvy
    if (order?._enriched?.strediska && Array.isArray(order._enriched.strediska) && order._enriched.strediska.length > 0) {
      return order._enriched.strediska.map(s => s.nazev || s.kod).join(', ');
    }
    // 2. Fallback: pouze kódy z order.strediska_kod s mapováním
    if (order?.strediska_kod && Array.isArray(order.strediska_kod) && order.strediska_kod.length > 0) {
      return order.strediska_kod.map(kod => strediskaMap[kod] || kod).join(', ');
    }
    return MISSING;
  })();

  // 👤 Kontrolu věcné správnosti provedl - NOVĚ: z přidružených faktur
  const kontroluVecneSpravnostiProvedl = (() => {
    if (order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
      // Projít faktury a najít unikátní uživatele, kteří provedli věcnou kontrolu
      const uzivateleVecneKontroly = new Map();
      
      order.faktury.forEach(faktura => {
        if (faktura.potvrdil_vecnou_spravnost) {
          const userId = faktura.potvrdil_vecnou_spravnost.id || faktura.potvrdil_vecnou_spravnost_id;
          const userName = formatUserName(faktura.potvrdil_vecnou_spravnost);
          if (userId && userName !== MISSING) {
            uzivateleVecneKontroly.set(userId, userName);
          }
        }
      });
      
      // Pokud je jen jeden uživatel, vrátit jméno
      if (uzivateleVecneKontroly.size === 1) {
        return Array.from(uzivateleVecneKontroly.values())[0];
      }
      // Pokud je víc uživatelů, vrátit seznam
      if (uzivateleVecneKontroly.size > 1) {
        return Array.from(uzivateleVecneKontroly.values()).join(', ');
      }
    }
    
    // Fallback na starý způsob z objednávky
    return formatUserName(order?.potvrdil_vecnou_spravnost) || MISSING;
  })();

  // 📅 Datum potvrzení věcné správnosti
  const datumPotvrzeniVecneSpravnosti = order?.dt_potvrzeni_vecne_spravnosti || MISSING;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={true}>
        {/* Hlavička s logem */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              src={ASSETS.LOGO_ZZS_MAIN}
              style={styles.logo}
            />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerOrganization}>
              Zdravotnická záchranná služba Středočeského kraje, p.o.
            </Text>
            <Text style={styles.headerTitle}>
              Záznam o předběžné řídící kontrole
            </Text>
            <Text style={styles.headerSubtitle}>
              Podle zákona č. 320/2001 Sb., o finanční kontrole ve veřejné správě
            </Text>
          </View>

          <View style={styles.headerDate}>
            <Text style={styles.dateLabel}>Vygenerováno dne:</Text>
            <Text style={styles.dateValue}>{currentDate}</Text>
          </View>
        </View>

        {/* Základní informace o objednávce */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Objednávka č.:</Text>
            <Text style={[styles.infoValue, styles.infoValueHighlight, getMissingStyle(objednavkaCislo)]}>
              {objednavkaCislo}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vyřizuje:</Text>
            <Text style={[styles.infoValue, getMissingStyle(vyrizuje)]}>{vyrizuje}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Datum vytvoření:</Text>
            <Text style={[styles.infoValue, getMissingStyle(dtVytvoreni)]}>{formatDate(dtVytvoreni)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Garant:</Text>
            <Text style={[styles.infoValue, getMissingStyle(garant)]}>{garant}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Předmět:</Text>
            <Text style={[styles.infoValue, getMissingStyle(predmet)]}>{predmet}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Střediska:</Text>
            <Text style={[styles.infoValue, getMissingStyle(objednavkaStrediska)]}>{objednavkaStrediska}</Text>
          </View>
        </View>

        {/* Kontrola před vznikem závazku */}
        <View style={styles.controlSection}>
          <Text style={styles.controlTitle}>Kontrola před vznikem závazku</Text>

          {/* Komentář - zobrazit pouze pokud má hodnotu */}
          {komentar && komentar !== '---' && komentar.trim() !== '' && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Komentář:</Text>
              <Text style={[styles.controlValue, getMissingStyle(komentar)]}>{komentar}</Text>
            </View>
          )}

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Schvalovatel:</Text>
            <Text style={[styles.controlValue, getMissingStyle(schvalovatel)]}>{schvalovatel}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Schváleno dne:</Text>
            <Text style={styles.controlValue}>{formatDate(schvalenoDne)}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Financování:</Text>
            <Text style={[styles.controlValue, getMissingStyle(financovani)]}>
              {(() => {
                // Zobraz typ financování
                let result = financovani;
                
                // Pokud je LP a máme názvy, přidej je
                if ((financovaniData?.typ === 'LP' || financovaniData?.typ === 'LIMITOVANY_PRISLIB') && 
                    financovaniData.lp_nazvy && Array.isArray(financovaniData.lp_nazvy) && financovaniData.lp_nazvy.length > 0) {
                  const lpNazvy = financovaniData.lp_nazvy.map(lp => {
                    const kod = lp.cislo_lp || lp.kod || lp.id;
                    const nazev = lp.nazev || '';
                    return kod && nazev ? `${kod} - ${nazev}` : (kod || nazev);
                  }).join(', ');
                  result += ` (${lpNazvy})`;
                }
                
                return result;
              })()}
            </Text>
          </View>

          {/* Detaily financování podle typu */}
          {financovaniData && (
            <>
              {(financovaniData.typ === 'LP' || financovaniData.typ === 'LIMITOVANY_PRISLIB') && financovaniData.lp_poznamka && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Poznámka k LP:</Text>
                  <Text style={styles.controlValue}>{financovaniData.lp_poznamka}</Text>
                </View>
              )}

              {/* Číslo smlouvy - POUZE pokud je typ financování SMLOUVA */}
              {(financovaniData.typ === 'SMLOUVA' || financovaniData.typ === 'SMLOUVA_O_DILO') && financovaniData.cislo_smlouvy && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Číslo smlouvy:</Text>
                  <Text style={styles.controlValue}>{financovaniData.cislo_smlouvy}</Text>
                </View>
              )}
              {(financovaniData.typ === 'SMLOUVA' || financovaniData.typ === 'SMLOUVA_O_DILO') && financovaniData.smlouva_poznamka && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Poznámka ke smlouvě:</Text>
                  <Text style={styles.controlValue}>{financovaniData.smlouva_poznamka}</Text>
                </View>
              )}

              {/* Individuální schválení - POUZE pokud je typ INDIVIDUALNI_SCHVALENI */}
              {(financovaniData.typ === 'INDIVIDUALNI_SCHVALENI' || financovaniData.typ === 'INDIVIDUALNI') && financovaniData.individualni_schvaleni && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Individuální schválení:</Text>
                  <Text style={styles.controlValue}>{financovaniData.individualni_schvaleni}</Text>
                </View>
              )}
              {(financovaniData.typ === 'INDIVIDUALNI_SCHVALENI' || financovaniData.typ === 'INDIVIDUALNI') && financovaniData.individualni_poznamka && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Poznámka k individ. schválení:</Text>
                  <Text style={styles.controlValue}>{financovaniData.individualni_poznamka}</Text>
                </View>
              )}

              {/* Pojistná událost - POUZE pokud je typ POJISTNA_UDALOST */}
              {(financovaniData.typ === 'POJISTNA_UDALOST' || financovaniData.typ === 'POJISTENI') && financovaniData.pojistna_udalost_cislo && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Číslo pojistné události:</Text>
                  <Text style={styles.controlValue}>{financovaniData.pojistna_udalost_cislo}</Text>
                </View>
              )}
              {(financovaniData.typ === 'POJISTNA_UDALOST' || financovaniData.typ === 'POJISTENI') && financovaniData.pojistna_udalost_poznamka && (
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Poznámka k pojistné události:</Text>
                  <Text style={styles.controlValue}>{financovaniData.pojistna_udalost_poznamka}</Text>
                </View>
              )}
            </>
          )}

          {maxCenaSvDph && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Maximální cena s DPH:</Text>
              <Text style={styles.controlValue}>{formatCurrency(maxCenaSvDph)}</Text>
            </View>
          )}

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Dodavatel:</Text>
            <Text style={[styles.controlValue, getMissingStyle(dodavatelNazev)]}>{dodavatelNazev}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Adresa:</Text>
            <Text style={[styles.controlValue, getMissingStyle(dodavatelAdresa)]}>{dodavatelAdresa}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>IČO:</Text>
            <Text style={[styles.controlValue, getMissingStyle(dodavatelICO)]}>{dodavatelICO}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>DIČ:</Text>
            <Text style={[styles.controlValue, getMissingStyle(dodavatelDIC)]}>{dodavatelDIC}</Text>
          </View>

          {/* Položky objednávky */}
          {order?.polozky && Array.isArray(order.polozky) && order.polozky.length > 0 && (
            <View style={{ marginTop: 12, marginBottom: 12 }}>
              <Text style={[styles.controlLabel, { fontSize: 11, fontWeight: 700, marginBottom: 8, color: '#059669' }]}>
                Položky objednávky:
              </Text>
              
              {order.polozky.map((polozka, index) => {
                // LP ID zobrazit JEN když je financování typu LP (limitovaný příslib)
                const jeFinancovaniLP = financovaniData?.typ === 'LP' || financovaniData?.typ === 'LIMITOVANY_PRISLIB';
                
                return (
                  <View key={polozka.id || index} style={{
                    marginBottom: 6,
                    paddingLeft: 10,
                    borderLeftWidth: 2,
                    borderLeftColor: '#d1fae5',
                    borderLeftStyle: 'solid'
                  }}>
                    <View style={styles.controlRow}>
                      <Text style={[styles.controlLabel, { width: '30%' }]}>Popis:</Text>
                      <Text style={[styles.controlValue, { width: '70%' }]}>{polozka.popis || polozka.nazev || MISSING}</Text>
                    </View>
                    <View style={styles.controlRow}>
                      <Text style={[styles.controlLabel, { width: '30%' }]}>Cena s DPH:</Text>
                      <Text style={[styles.controlValue, { width: '70%' }]}>
                        {polozka.cena_s_dph ? formatCurrency(parseFloat(polozka.cena_s_dph)) : MISSING}
                      </Text>
                    </View>
                    {jeFinancovaniLP && polozka.lp_id && (
                      <View style={styles.controlRow}>
                        <Text style={[styles.controlLabel, { width: '30%' }]}>LP kód:</Text>
                        <Text style={[styles.controlValue, { width: '70%' }]}>
                          {(() => {
                            // Zkus najít LP kód z enriched dat
                            if (financovaniData?.lp_nazvy) {
                              const lp = financovaniData.lp_nazvy.find(item => item.id === polozka.lp_id);
                              if (lp) {
                                const kod = lp.cislo_lp || lp.kod || lp.id;
                                const nazev = lp.nazev || '';
                                return kod && nazev ? `${kod} - ${nazev}` : (kod || nazev);
                              }
                            }
                            // Fallback: zobraz jen ID
                            return `LP ID: ${polozka.lp_id}`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Odesláno dodavateli:</Text>
            <Text style={styles.controlValue}>{formatDate(odeslanoDodavateli)}</Text>
          </View>
        </View>

        {/* Kontrola po vzniku závazku */}
        <View style={styles.postControlSection}>
          <Text style={styles.postControlTitle}>Kontrola po vzniku závazku</Text>

          {/* Faktury - opakování pro každou fakturu */}
          {order?.faktury && Array.isArray(order.faktury) && order.faktury.length > 0 ? (
            order.faktury.map((faktura, index) => (
              <View key={faktura.id || index} style={{ marginBottom: index < order.faktury.length - 1 ? 8 : 0 }}>
                {/* Titulek faktury s variabilním symbolem a pořadovým číslem */}
                <Text style={[styles.controlLabel, { fontSize: 11, fontWeight: 700, marginBottom: 8, color: '#059669' }]}>
                  Faktura č. {index + 1} - VS: {faktura.fa_cislo_vema || 'N/A'}
                </Text>

                {/* Faktura variabilní symbol */}
                {faktura.fa_cislo_vema && faktura.fa_cislo_vema !== '---' && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Faktura variabilní symbol:</Text>
                    <Text style={styles.controlValue}>{faktura.fa_cislo_vema}</Text>
                  </View>
                )}

                {/* Střediska */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Střediska:</Text>
                  <Text style={styles.controlValue}>
                    {faktura.fa_strediska_kod && Array.isArray(faktura.fa_strediska_kod) && faktura.fa_strediska_kod.length > 0
                      ? faktura.fa_strediska_kod.map(kod => strediskaMap[kod] || kod).join(', ')
                      : MISSING
                    }
                  </Text>
                </View>

                {/* Splatnost */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Splatnost:</Text>
                  <Text style={styles.controlValue}>
                    {faktura.fa_datum_splatnosti ? formatDate(faktura.fa_datum_splatnosti) : MISSING}
                  </Text>
                </View>

                {/* Cena faktury */}
                {faktura.fa_castka && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Cena faktury s DPH:</Text>
                    <Text style={styles.controlValue}>{formatCurrency(parseFloat(faktura.fa_castka))}</Text>
                  </View>
                )}

                {/* Financování pro tuto fakturu z rozsirujici_data */}
                {(() => {
                  let fakturaFinancovani = MISSING;
                  try {
                    if (faktura.rozsirujici_data) {
                      const data = typeof faktura.rozsirujici_data === 'string' 
                        ? JSON.parse(faktura.rozsirujici_data) 
                        : faktura.rozsirujici_data;
                      // Zkusit získat financování z různých možných vlastností
                      fakturaFinancovani = data.typ || data.zpusob_financovani || data.financovani || data.typ_platby || MISSING;
                    }
                  } catch (e) {
                    // JSON parsing failed, keep MISSING
                  }
                  return fakturaFinancovani !== MISSING ? (
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Financování:</Text>
                      <Text style={[styles.controlValue, getMissingStyle(fakturaFinancovani)]}>{fakturaFinancovani}</Text>
                    </View>
                  ) : null;
                })()}

                {/* Věcná kontrola pro tuto fakturu */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Kontrolu věcné správnosti provedl:</Text>
                  <Text style={[styles.controlValue, getMissingStyle(formatUserName(faktura.potvrdil_vecnou_spravnost) || MISSING)]}>
                    {formatUserName(faktura.potvrdil_vecnou_spravnost) || MISSING}
                  </Text>
                </View>

                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Kontrola dne:</Text>
                  <Text style={styles.controlValue}>
                    {faktura.dt_potvrzeni_vecne_spravnosti ? formatDate(faktura.dt_potvrzeni_vecne_spravnosti) : MISSING}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic' }}>Žádné faktury</Text>
          )}

          {/* Oddělení před uzavřením */}
          <View style={{ borderBottomWidth: 2, borderBottomColor: '#374151', marginVertical: 10 }} />

          {/* Uzavření objednávky - zobrazí se jednou na konci */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Uzavřel:</Text>
            <Text style={[styles.controlValue, getMissingStyle(dokoncil)]}>{dokoncil}</Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Uzavřeno dne:</Text>
            <Text style={[styles.controlValue, getMissingStyle(datumDokonceni)]}>{formatDate(datumDokonceni)}</Text>
          </View>
        </View>

        {/* Zveřejnění v registru smluv (pokud existuje) */}
        {(order?.zverejnil_id && order?.dt_zverejneni && order?.registr_iddt) && (
          <View style={styles.registrySection}>
            <Text style={styles.registryTitle}>Zveřejnění v registru smluv</Text>
            
            {/* Datum zveřejnění */}
            {order.dt_zverejneni && (
              <View style={styles.registryRow}>
                <Text style={styles.registryLabel}>Datum zveřejnění:</Text>
                <Text style={styles.registryValue}>{formatDate(order.dt_zverejneni)}</Text>
              </View>
            )}

            {/* Zveřejnil - celé jméno včetně titulů */}
            {order.zverejnil && (
              <View style={styles.registryRow}>
                <Text style={styles.registryLabel}>Zveřejnil:</Text>
                <Text style={styles.registryValue}>
                  {formatUserName(order._enriched?.zverejnil || order.zverejnil)}
                </Text>
              </View>
            )}

            {/* Kód ID v registru smluv */}
            {order.registr_iddt && (
              <View style={styles.registryRow}>
                <Text style={styles.registryLabel}>Kód ID:</Text>
                <Text style={styles.registryValue}>{order.registr_iddt}</Text>
              </View>
            )}
          </View>
        )}

        {/* Patička s právními informacemi */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {organizace?.nazev_organizace || organizace?.nazev || 'Zdravotnická záchranná služba Středočeského kraje, příspěvková organizace'}
          </Text>
          <Text style={styles.footerText}>
            IČO: {organizace?.ico || '70859981'} | e-mail: {organizace?.email || 'podatelna@zachranka.cz'}
          </Text>
          <Text style={styles.footerText}>
            {organizace?.ulice_cislo && organizace?.mesto && organizace?.psc 
              ? `${organizace.ulice_cislo}, ${organizace.psc} ${organizace.mesto}`
              : organizace?.adresa || 'Vančurova 1544, 272 01 Kladno'
            }
          </Text>
          {organizace?.spisova_znacka && (
            <Text style={styles.footerReference}>
              Spisová značka: {organizace.spisova_znacka}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default FinancialControlPDF;
