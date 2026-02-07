import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBug,
  faUserCog,
  faFileAlt,
  faIcons,
  faBell,
  faDatabase,
  faPaperclip,
  faPalette,
  faFileInvoice,
  faEnvelope,
  faClipboardList,
  faBookOpen,
  faDownload,
  faSpinner,
  faExclamationTriangle,
  faCode
} from '@fortawesome/free-solid-svg-icons';
import { getStatusIcon, getStatusEmoji } from '../utils/iconMapping';
import { AuthContext } from '../context/AuthContext';
import OrderV2TestPanel from './OrderV2TestPanel';
import NotificationTestPanel from './NotificationTestPanel';
import AttachmentsV2TestPanel from './AttachmentsV2TestPanel';
import ModalStylesPanel from './ModalStylesPanel';
import InvoiceAttachmentsTestPanel from './InvoiceAttachmentsTestPanel';
import MailTestPanelV2 from './MailTestPanelV2';

const Container = styled.div`
  max-width: 100%;
  margin: 0;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  padding: 26px 39px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

  h1 {
    margin: 0;
    font-size: 28px;
    display: flex;
    align-items: center;
    gap: 13px;

    svg {
      font-size: 32px;
    }
  }

  p {
    margin: 8px 0 0 0;
    opacity: 0.95;
    font-size: 16px;
  }
`;

const TabsContainer = styled.div`
  background: white;
  border-bottom: 2px solid #e5e7eb;
  padding: 0 26px;
  display: flex;
  gap: 8px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const Tab = styled.button`
  padding: 16px 24px;
  border: none;
  background: transparent;
  color: ${props => props.$active ? '#dc2626' : '#64748b'};
  font-size: 16px;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 3px solid ${props => props.$active ? '#dc2626' : 'transparent'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;

  svg {
    font-size: 18px;
  }

  &:hover {
    color: ${props => props.$active ? '#dc2626' : '#1f2937'};
    background: ${props => props.$active ? 'transparent' : '#f9fafb'};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
`;

const IconsPanel = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 39px;
`;

const SearchBox = styled.div`
  position: relative;
  margin: 26px 0;

  svg:first-of-type {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 18px;
  }

  input {
    width: 100%;
    padding: 16px 52px 16px 48px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  button {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #94a3b8;
    transition: color 0.2s ease;

    &:hover {
      color: #dc2626;
    }

    svg {
      font-size: 16px;
    }
  }
`;

const CategorySection = styled.div`
  margin-bottom: 52px;
`;

const CategoryTitle = styled.h3`
  color: #1f2937;
  font-size: 20px;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
`;

const IconCard = styled.div`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 26px;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    transform: translateY(-2px);
  }

  svg {
    font-size: 48px;
    color: #3b82f6;
    margin-bottom: 13px;
  }

  .icon-name {
    font-size: 14px;
    color: #64748b;
    font-family: 'Courier New', monospace;
    word-break: break-all;
  }
`;

const SectionTitle = styled.h2`
  color: #1f2937;
  font-size: 24px;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 13px;
`;

const SectionDescription = styled.p`
  color: #64748b;
  font-size: 16px;
  margin: 0;
`;

const ComingSoonPanel = styled.div`
  max-width: 800px;
  margin: 100px auto;
  padding: 52px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  text-align: center;

  svg {
    font-size: 80px;
    color: #94a3b8;
    margin-bottom: 26px;
  }

  h2 {
    color: #1f2937;
    font-size: 32px;
    margin: 0 0 13px 0;
  }

  p {
    color: #64748b;
    font-size: 18px;
    margin: 0;
  }
`;

// Rozšířený seznam ikon z FontAwesome @fortawesome/free-solid-svg-icons
// 🎯 O25L Dashboard Status Icons & Colors
const o25lDashboardStatuses = {
  'Základní stavy (používané)': [
    { status: 'nova', label: 'Nová', color: '#2563eb', desc: 'Nově vytvořená objednávka' },
    { status: 'ke_schvaleni', label: 'Ke schválení', color: '#f59e0b', desc: 'Čeká na schválení' },
    { status: 'schvalena', label: 'Schválena', color: '#10b981', desc: 'Byla schválena' },
    { status: 'zamitnuta', label: 'Zamítnuta', color: '#dc2626', desc: 'Byla zamítnuta' },
    { status: 'rozpracovana', label: 'Rozpracovaná', color: '#6366f1', desc: 'Draft/koncept' },
  ],
  'Pracovní stavy (používané)': [
    { status: 'odeslana', label: 'Odeslaná', color: '#0891b2', desc: 'Odesláno dodavateli' },
    { status: 'potvrzena', label: 'Potvrzená', color: '#059669', desc: 'Dodavatel potvrdil' },
    { status: 'uverejnena', label: 'Uveřejněná', color: '#7c3aed', desc: 'Zveřejněno v registru' },
    { status: 'dokoncena', label: 'Dokončená', color: '#15803d', desc: 'Kompletně dokončeno' },
    { status: 'ceka_potvrzeni', label: 'Čeká potvrzení', color: '#ea580c', desc: 'Čeká na potvrzení' },
    { status: 'ceka_se', label: 'Čeká se', color: '#d97706', desc: 'Obecné čekání' },
    { status: 'zrusena', label: 'Zrušená', color: '#991b1b', desc: 'Stornováno' },
    { status: 'archivovano', label: 'Archivováno', color: '#64748b', desc: 'V archivu' },
  ],
  'Kontrolní stavy (používané)': [
    { status: 'kontrola_ceka', label: 'Čeká kontrola', color: '#f59e0b', desc: 'Čeká na kontrolu' },
    { status: 'kontrola_potvrzena', label: 'Věcná správnost', color: '#10b981', desc: 'Kontrola OK' },
  ],
  'Dodatečné stavy (dostupné pro budoucnost)': [
    { status: 'koncept', label: 'Koncept', color: '#8b5cf6', desc: 'Neuložený koncept' },
    { status: 'smazana', label: 'Smazaná', color: '#78716c', desc: 'Smazána z DB' },
    { status: 'registr_zverejnena', label: 'Registr zveřejněna', color: '#7c3aed', desc: 'Alt. verze uveřejněna' },
    { status: 'pozastavena', label: 'Pozastavená', color: '#f97316', desc: 'Dočasně pozastaveno' },
    { status: 'verejna_soutez', label: 'Veřejná soutěž', color: '#06b6d4', desc: 'Režim veř. soutěže' },
    { status: 'zmena_objednavky', label: 'Změna objednávky', color: '#84cc16', desc: 'Probíhá změna' },
  ],
  'Prioritní varianty (pro notifikace/urgence)': [
    { status: 'urgent', label: '🚨 Urgentní', color: '#dc2626', desc: 'Nejvyšší priorita' },
    { status: 'high', label: '⚠️ Vysoká', color: '#ea580c', desc: 'Vysoká priorita' },
    { status: 'normal', label: '🔔 Normální', color: '#0891b2', desc: 'Běžná priorita' },
    { status: 'low', label: 'ℹ️ Nízká', color: '#64748b', desc: 'Nízká priorita' },
  ],
  'Fakturační stavy (pro budoucí integraci)': [
    { status: 'faktura_ceka', label: 'Čeká faktura', color: '#f59e0b', desc: 'Čeká na vystavení' },
    { status: 'faktura_vystavena', label: 'Faktura vystavena', color: '#3b82f6', desc: 'Faktura vystavena' },
    { status: 'faktura_uhrazena', label: 'Faktura uhrazena', color: '#10b981', desc: 'Faktura zaplacena' },
    { status: 'faktura_po_splatnosti', label: 'Po splatnosti', color: '#dc2626', desc: 'Faktura po splatnosti' },
  ],
  'Varování & Výstrahy (barevné varianty)': [
    { status: 'warning_red', label: '🔴 Kritická chyba', color: '#dc2626', desc: 'Kritické upozornění' },
    { status: 'warning_orange', label: '🟠 Varování', color: '#ea580c', desc: 'Důležité varování' },
    { status: 'warning_yellow', label: '🟡 Upozornění', color: '#f59e0b', desc: 'Běžné upozornění' },
    { status: 'info_blue', label: '🔵 Informace', color: '#3b82f6', desc: 'Informativní zpráva' },
    { status: 'info_cyan', label: '🟢 OK', color: '#10b981', desc: 'Vše v pořádku' },
    { status: 'question_purple', label: '🟣 Dotaz', color: '#8b5cf6', desc: 'Vyžaduje akci' },
  ],
  'Dokumenty & Office (rozšířené)': [
    { status: 'doc_smlouva', label: '📜 Smlouva', color: '#7c3aed', desc: 'Smluvní dokument' },
    { status: 'doc_priloha', label: '📎 Příloha', color: '#0891b2', desc: 'Přiložený soubor' },
    { status: 'doc_faktura', label: '🧾 Faktura', color: '#059669', desc: 'Fakturační doklad' },
    { status: 'doc_doklad', label: '📋 Doklad', color: '#3b82f6', desc: 'Účetní doklad' },
    { status: 'doc_certifikat', label: '🎓 Certifikát', color: '#ea580c', desc: 'Osvědčení' },
    { status: 'doc_protokol', label: '📄 Protokol', color: '#64748b', desc: 'Protokol/zápis' },
  ],
};

// Kategorizováno pro lepší přehlednost
const iconCategories = {
  'Používané v Aplikaci': [
    { name: 'faFileInvoice', icon: require('@fortawesome/free-solid-svg-icons').faFileInvoice },
    { name: 'faUsers', icon: require('@fortawesome/free-solid-svg-icons').faUsers },
    { name: 'faUser', icon: require('@fortawesome/free-solid-svg-icons').faUser },
    { name: 'faBook', icon: require('@fortawesome/free-solid-svg-icons').faBook },
    { name: 'faCog', icon: require('@fortawesome/free-solid-svg-icons').faCog },
    { name: 'faSignOutAlt', icon: require('@fortawesome/free-solid-svg-icons').faSignOutAlt },
    { name: 'faBell', icon: require('@fortawesome/free-solid-svg-icons').faBell },
    { name: 'faCalendar', icon: require('@fortawesome/free-solid-svg-icons').faCalendar },
    { name: 'faAddressBook', icon: require('@fortawesome/free-solid-svg-icons').faAddressBook },
    { name: 'faKey', icon: require('@fortawesome/free-solid-svg-icons').faKey },
    { name: 'faBug', icon: require('@fortawesome/free-solid-svg-icons').faBug },
    { name: 'faDatabase', icon: require('@fortawesome/free-solid-svg-icons').faDatabase },
  ],
  'Akce & Tlačítka': [
    { name: 'faPlus', icon: require('@fortawesome/free-solid-svg-icons').faPlus },
    { name: 'faEdit', icon: require('@fortawesome/free-solid-svg-icons').faEdit },
    { name: 'faTrash', icon: require('@fortawesome/free-solid-svg-icons').faTrash },
    { name: 'faSave', icon: require('@fortawesome/free-solid-svg-icons').faSave },
    { name: 'faSearch', icon: require('@fortawesome/free-solid-svg-icons').faSearch },
    { name: 'faFilter', icon: require('@fortawesome/free-solid-svg-icons').faFilter },
    { name: 'faCheck', icon: require('@fortawesome/free-solid-svg-icons').faCheck },
    { name: 'faTimes', icon: require('@fortawesome/free-solid-svg-icons').faTimes },
    { name: 'faDownload', icon: require('@fortawesome/free-solid-svg-icons').faDownload },
    { name: 'faUpload', icon: require('@fortawesome/free-solid-svg-icons').faUpload },
    { name: 'faPrint', icon: require('@fortawesome/free-solid-svg-icons').faPrint },
    { name: 'faSync', icon: require('@fortawesome/free-solid-svg-icons').faSync },
    { name: 'faRedo', icon: require('@fortawesome/free-solid-svg-icons').faRedo },
    { name: 'faUndo', icon: require('@fortawesome/free-solid-svg-icons').faUndo },
    { name: 'faCopy', icon: require('@fortawesome/free-solid-svg-icons').faCopy },
    { name: 'faPaste', icon: require('@fortawesome/free-solid-svg-icons').faPaste },
    { name: 'faPlusCircle', icon: require('@fortawesome/free-solid-svg-icons').faPlusCircle },
    { name: 'faMinusCircle', icon: require('@fortawesome/free-solid-svg-icons').faMinusCircle },
    { name: 'faTimesCircle', icon: require('@fortawesome/free-solid-svg-icons').faTimesCircle },
    { name: 'faCheckCircle', icon: require('@fortawesome/free-solid-svg-icons').faCheckCircle },
  ],
  'Navigace & Směry': [
    { name: 'faChevronDown', icon: require('@fortawesome/free-solid-svg-icons').faChevronDown },
    { name: 'faChevronUp', icon: require('@fortawesome/free-solid-svg-icons').faChevronUp },
    { name: 'faChevronLeft', icon: require('@fortawesome/free-solid-svg-icons').faChevronLeft },
    { name: 'faChevronRight', icon: require('@fortawesome/free-solid-svg-icons').faChevronRight },
    { name: 'faArrowUp', icon: require('@fortawesome/free-solid-svg-icons').faArrowUp },
    { name: 'faArrowDown', icon: require('@fortawesome/free-solid-svg-icons').faArrowDown },
    { name: 'faArrowLeft', icon: require('@fortawesome/free-solid-svg-icons').faArrowLeft },
    { name: 'faArrowRight', icon: require('@fortawesome/free-solid-svg-icons').faArrowRight },
    { name: 'faAngleDoubleLeft', icon: require('@fortawesome/free-solid-svg-icons').faAngleDoubleLeft },
    { name: 'faAngleDoubleRight', icon: require('@fortawesome/free-solid-svg-icons').faAngleDoubleRight },
    { name: 'faBars', icon: require('@fortawesome/free-solid-svg-icons').faBars },
    { name: 'faHome', icon: require('@fortawesome/free-solid-svg-icons').faHome },
    { name: 'faExternalLinkAlt', icon: require('@fortawesome/free-solid-svg-icons').faExternalLinkAlt },
    { name: 'faLink', icon: require('@fortawesome/free-solid-svg-icons').faLink },
    { name: 'faUnlink', icon: require('@fortawesome/free-solid-svg-icons').faUnlink },
  ],
  'Soubory & Dokumenty': [
    { name: 'faFile', icon: require('@fortawesome/free-solid-svg-icons').faFile },
    { name: 'faFileAlt', icon: require('@fortawesome/free-solid-svg-icons').faFileAlt },
    { name: 'faFilePdf', icon: require('@fortawesome/free-solid-svg-icons').faFilePdf },
    { name: 'faFileWord', icon: require('@fortawesome/free-solid-svg-icons').faFileWord },
    { name: 'faFileExcel', icon: require('@fortawesome/free-solid-svg-icons').faFileExcel },
    { name: 'faFileImage', icon: require('@fortawesome/free-solid-svg-icons').faFileImage },
    { name: 'faFileArchive', icon: require('@fortawesome/free-solid-svg-icons').faFileArchive },
    { name: 'faFileCode', icon: require('@fortawesome/free-solid-svg-icons').faFileCode },
    { name: 'faFolder', icon: require('@fortawesome/free-solid-svg-icons').faFolder },
    { name: 'faFolderOpen', icon: require('@fortawesome/free-solid-svg-icons').faFolderOpen },
    { name: 'faClipboard', icon: require('@fortawesome/free-solid-svg-icons').faClipboard },
    { name: 'faClipboardCheck', icon: require('@fortawesome/free-solid-svg-icons').faClipboardCheck },
    { name: 'faClipboardList', icon: require('@fortawesome/free-solid-svg-icons').faClipboardList },
    { name: 'faFileContract', icon: require('@fortawesome/free-solid-svg-icons').faFileContract },
    { name: 'faFileInvoice', icon: require('@fortawesome/free-solid-svg-icons').faFileInvoice },
    { name: 'faFileInvoiceDollar', icon: require('@fortawesome/free-solid-svg-icons').faFileInvoiceDollar },
    { name: 'faReceipt', icon: require('@fortawesome/free-solid-svg-icons').faReceipt },
    { name: 'faStamp', icon: require('@fortawesome/free-solid-svg-icons').faStamp },
    { name: 'faCertificate', icon: require('@fortawesome/free-solid-svg-icons').faCertificate },
    { name: 'faFileSignature', icon: require('@fortawesome/free-solid-svg-icons').faFileSignature },
  ],
  'Komunikace': [
    { name: 'faEnvelope', icon: require('@fortawesome/free-solid-svg-icons').faEnvelope },
    { name: 'faEnvelopeOpen', icon: require('@fortawesome/free-solid-svg-icons').faEnvelopeOpen },
    { name: 'faPhone', icon: require('@fortawesome/free-solid-svg-icons').faPhone },
    { name: 'faPhoneAlt', icon: require('@fortawesome/free-solid-svg-icons').faPhoneAlt },
    { name: 'faComment', icon: require('@fortawesome/free-solid-svg-icons').faComment },
    { name: 'faComments', icon: require('@fortawesome/free-solid-svg-icons').faComments },
    { name: 'faCommentDots', icon: require('@fortawesome/free-solid-svg-icons').faCommentDots },
    { name: 'faInbox', icon: require('@fortawesome/free-solid-svg-icons').faInbox },
    { name: 'faPaperPlane', icon: require('@fortawesome/free-solid-svg-icons').faPaperPlane },
    { name: 'faSms', icon: require('@fortawesome/free-solid-svg-icons').faSms },
  ],
  'Bezpečnost': [
    { name: 'faLock', icon: require('@fortawesome/free-solid-svg-icons').faLock },
    { name: 'faUnlock', icon: require('@fortawesome/free-solid-svg-icons').faUnlock },
    { name: 'faLockOpen', icon: require('@fortawesome/free-solid-svg-icons').faLockOpen },
    { name: 'faShieldAlt', icon: require('@fortawesome/free-solid-svg-icons').faShieldAlt },
    { name: 'faUserShield', icon: require('@fortawesome/free-solid-svg-icons').faUserShield },
    { name: 'faEye', icon: require('@fortawesome/free-solid-svg-icons').faEye },
    { name: 'faEyeSlash', icon: require('@fortawesome/free-solid-svg-icons').faEyeSlash },
    { name: 'faFingerprint', icon: require('@fortawesome/free-solid-svg-icons').faFingerprint },
    { name: 'faIdBadge', icon: require('@fortawesome/free-solid-svg-icons').faIdBadge },
    { name: 'faIdCard', icon: require('@fortawesome/free-solid-svg-icons').faIdCard },
  ],
  'Upozornění & Stavy': [
    { name: 'faExclamationTriangle', icon: require('@fortawesome/free-solid-svg-icons').faExclamationTriangle },
    { name: 'faExclamationCircle', icon: require('@fortawesome/free-solid-svg-icons').faExclamationCircle },
    { name: 'faInfoCircle', icon: require('@fortawesome/free-solid-svg-icons').faInfoCircle },
    { name: 'faQuestionCircle', icon: require('@fortawesome/free-solid-svg-icons').faQuestionCircle },
    { name: 'faBan', icon: require('@fortawesome/free-solid-svg-icons').faBan },
    { name: 'faCheckDouble', icon: require('@fortawesome/free-solid-svg-icons').faCheckDouble },
    { name: 'faHourglassHalf', icon: require('@fortawesome/free-solid-svg-icons').faHourglassHalf },
    { name: 'faSpinner', icon: require('@fortawesome/free-solid-svg-icons').faSpinner },
    { name: 'faCircleNotch', icon: require('@fortawesome/free-solid-svg-icons').faCircleNotch },
    { name: 'faExclamation', icon: require('@fortawesome/free-solid-svg-icons').faExclamation },
    { name: 'faQuestion', icon: require('@fortawesome/free-solid-svg-icons').faQuestion },
    { name: 'faInfo', icon: require('@fortawesome/free-solid-svg-icons').faInfo },
    { name: 'faLightbulb', icon: require('@fortawesome/free-solid-svg-icons').faLightbulb },
    { name: 'faBolt', icon: require('@fortawesome/free-solid-svg-icons').faBolt },
    { name: 'faFire', icon: require('@fortawesome/free-solid-svg-icons').faFire },
    { name: 'faRadiation', icon: require('@fortawesome/free-solid-svg-icons').faRadiation },
    { name: 'faSkull', icon: require('@fortawesome/free-solid-svg-icons').faSkull },
  ],
  'Business & Finanční': [
    { name: 'faBuilding', icon: require('@fortawesome/free-solid-svg-icons').faBuilding },
    { name: 'faDollarSign', icon: require('@fortawesome/free-solid-svg-icons').faDollarSign },
    { name: 'faEuroSign', icon: require('@fortawesome/free-solid-svg-icons').faEuroSign },
    { name: 'faMoneyBillWave', icon: require('@fortawesome/free-solid-svg-icons').faMoneyBillWave },
    { name: 'faMoneyCheckAlt', icon: require('@fortawesome/free-solid-svg-icons').faMoneyCheckAlt },
    { name: 'faCreditCard', icon: require('@fortawesome/free-solid-svg-icons').faCreditCard },
    { name: 'faWallet', icon: require('@fortawesome/free-solid-svg-icons').faWallet },
    { name: 'faChartLine', icon: require('@fortawesome/free-solid-svg-icons').faChartLine },
    { name: 'faChartBar', icon: require('@fortawesome/free-solid-svg-icons').faChartBar },
    { name: 'faChartPie', icon: require('@fortawesome/free-solid-svg-icons').faChartPie },
    { name: 'faReceipt', icon: require('@fortawesome/free-solid-svg-icons').faReceipt },
    { name: 'faShoppingCart', icon: require('@fortawesome/free-solid-svg-icons').faShoppingCart },
    { name: 'faCalculator', icon: require('@fortawesome/free-solid-svg-icons').faCalculator },
  ],
  'Místa & Navigace': [
    { name: 'faMapMarkerAlt', icon: require('@fortawesome/free-solid-svg-icons').faMapMarkerAlt },
    { name: 'faMapMarker', icon: require('@fortawesome/free-solid-svg-icons').faMapMarker },
    { name: 'faMap', icon: require('@fortawesome/free-solid-svg-icons').faMap },
    { name: 'faMapPin', icon: require('@fortawesome/free-solid-svg-icons').faMapPin },
    { name: 'faGlobe', icon: require('@fortawesome/free-solid-svg-icons').faGlobe },
    { name: 'faCompass', icon: require('@fortawesome/free-solid-svg-icons').faCompass },
    { name: 'faCity', icon: require('@fortawesome/free-solid-svg-icons').faCity },
    { name: 'faStore', icon: require('@fortawesome/free-solid-svg-icons').faStore },
  ],
  'Čas & Kalendář': [
    { name: 'faClock', icon: require('@fortawesome/free-solid-svg-icons').faClock },
    { name: 'faCalendarAlt', icon: require('@fortawesome/free-solid-svg-icons').faCalendarAlt },
    { name: 'faCalendarDay', icon: require('@fortawesome/free-solid-svg-icons').faCalendarDay },
    { name: 'faCalendarWeek', icon: require('@fortawesome/free-solid-svg-icons').faCalendarWeek },
    { name: 'faCalendarCheck', icon: require('@fortawesome/free-solid-svg-icons').faCalendarCheck },
    { name: 'faCalendarPlus', icon: require('@fortawesome/free-solid-svg-icons').faCalendarPlus },
    { name: 'faCalendarMinus', icon: require('@fortawesome/free-solid-svg-icons').faCalendarMinus },
    { name: 'faStopwatch', icon: require('@fortawesome/free-solid-svg-icons').faStopwatch },
    { name: 'faHistory', icon: require('@fortawesome/free-solid-svg-icons').faHistory },
  ],
  'Média & Ovládání': [
    { name: 'faPlay', icon: require('@fortawesome/free-solid-svg-icons').faPlay },
    { name: 'faPause', icon: require('@fortawesome/free-solid-svg-icons').faPause },
    { name: 'faStop', icon: require('@fortawesome/free-solid-svg-icons').faStop },
    { name: 'faForward', icon: require('@fortawesome/free-solid-svg-icons').faForward },
    { name: 'faBackward', icon: require('@fortawesome/free-solid-svg-icons').faBackward },
    { name: 'faStepForward', icon: require('@fortawesome/free-solid-svg-icons').faStepForward },
    { name: 'faStepBackward', icon: require('@fortawesome/free-solid-svg-icons').faStepBackward },
    { name: 'faVolumeUp', icon: require('@fortawesome/free-solid-svg-icons').faVolumeUp },
    { name: 'faVolumeDown', icon: require('@fortawesome/free-solid-svg-icons').faVolumeDown },
    { name: 'faVolumeMute', icon: require('@fortawesome/free-solid-svg-icons').faVolumeMute },
    { name: 'faMicrophone', icon: require('@fortawesome/free-solid-svg-icons').faMicrophone },
    { name: 'faMicrophoneSlash', icon: require('@fortawesome/free-solid-svg-icons').faMicrophoneSlash },
    { name: 'faVideo', icon: require('@fortawesome/free-solid-svg-icons').faVideo },
    { name: 'faVideoSlash', icon: require('@fortawesome/free-solid-svg-icons').faVideoSlash },
    { name: 'faImage', icon: require('@fortawesome/free-solid-svg-icons').faImage },
    { name: 'faCamera', icon: require('@fortawesome/free-solid-svg-icons').faCamera },
  ],
  'UI Elementy': [
    { name: 'faStar', icon: require('@fortawesome/free-solid-svg-icons').faStar },
    { name: 'faHeart', icon: require('@fortawesome/free-solid-svg-icons').faHeart },
    { name: 'faThumbsUp', icon: require('@fortawesome/free-solid-svg-icons').faThumbsUp },
    { name: 'faThumbsDown', icon: require('@fortawesome/free-solid-svg-icons').faThumbsDown },
    { name: 'faFlag', icon: require('@fortawesome/free-solid-svg-icons').faFlag },
    { name: 'faBookmark', icon: require('@fortawesome/free-solid-svg-icons').faBookmark },
    { name: 'faTag', icon: require('@fortawesome/free-solid-svg-icons').faTag },
    { name: 'faTags', icon: require('@fortawesome/free-solid-svg-icons').faTags },
    { name: 'faList', icon: require('@fortawesome/free-solid-svg-icons').faList },
    { name: 'faListUl', icon: require('@fortawesome/free-solid-svg-icons').faListUl },
    { name: 'faListOl', icon: require('@fortawesome/free-solid-svg-icons').faListOl },
    { name: 'faTable', icon: require('@fortawesome/free-solid-svg-icons').faTable },
    { name: 'faColumns', icon: require('@fortawesome/free-solid-svg-icons').faColumns },
    { name: 'faGripHorizontal', icon: require('@fortawesome/free-solid-svg-icons').faGripHorizontal },
    { name: 'faGripVertical', icon: require('@fortawesome/free-solid-svg-icons').faGripVertical },
    { name: 'faEllipsisH', icon: require('@fortawesome/free-solid-svg-icons').faEllipsisH },
    { name: 'faEllipsisV', icon: require('@fortawesome/free-solid-svg-icons').faEllipsisV },
  ],
  'Nástroje & Nastavení': [
    { name: 'faTools', icon: require('@fortawesome/free-solid-svg-icons').faTools },
    { name: 'faWrench', icon: require('@fortawesome/free-solid-svg-icons').faWrench },
    { name: 'faScrewdriver', icon: require('@fortawesome/free-solid-svg-icons').faScrewdriver },
    { name: 'faHammer', icon: require('@fortawesome/free-solid-svg-icons').faHammer },
    { name: 'faCogs', icon: require('@fortawesome/free-solid-svg-icons').faCogs },
    { name: 'faSliders', icon: require('@fortawesome/free-solid-svg-icons').faSlidersH },
    { name: 'faPalette', icon: require('@fortawesome/free-solid-svg-icons').faPalette },
    { name: 'faPaintBrush', icon: require('@fortawesome/free-solid-svg-icons').faPaintBrush },
    { name: 'faMagic', icon: require('@fortawesome/free-solid-svg-icons').faMagic },
  ],
  'Různé': [
    { name: 'faLightbulb', icon: require('@fortawesome/free-solid-svg-icons').faLightbulb },
    { name: 'faFire', icon: require('@fortawesome/free-solid-svg-icons').faFire },
    { name: 'faBolt', icon: require('@fortawesome/free-solid-svg-icons').faBolt },
    { name: 'faTrophy', icon: require('@fortawesome/free-solid-svg-icons').faTrophy },
    { name: 'faGift', icon: require('@fortawesome/free-solid-svg-icons').faGift },
    { name: 'faCrown', icon: require('@fortawesome/free-solid-svg-icons').faCrown },
    { name: 'faRocket', icon: require('@fortawesome/free-solid-svg-icons').faRocket },
    { name: 'faPuzzlePiece', icon: require('@fortawesome/free-solid-svg-icons').faPuzzlePiece },
    { name: 'faGraduationCap', icon: require('@fortawesome/free-solid-svg-icons').faGraduationCap },
    { name: 'faCertificate', icon: require('@fortawesome/free-solid-svg-icons').faCertificate },
    { name: 'faMedal', icon: require('@fortawesome/free-solid-svg-icons').faMedal },
    { name: 'faAward', icon: require('@fortawesome/free-solid-svg-icons').faAward },
    { name: 'faAtom', icon: require('@fortawesome/free-solid-svg-icons').faAtom },
    { name: 'faDna', icon: require('@fortawesome/free-solid-svg-icons').faDna },
    { name: 'faFlask', icon: require('@fortawesome/free-solid-svg-icons').faFlask },
  ],
};

const DebugPanel = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [iconSearch, setIconSearch] = useState('');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'invoices':
        return <InvoiceAttachmentsTestPanel />;

      case 'order-v2':
        return <OrderV2TestPanel />;

      case 'attachments':
        return <AttachmentsV2TestPanel />;

      case 'notifications':
        return <NotificationTestPanel />;

      case 'modal-styles':
        return <ModalStylesPanel />;

      case 'mail':
        return <MailTestPanelV2 />;

      case 'html-templates':
        return <HtmlTemplatesPanel />;

      case 'email-previews':
        return (
          <IconsPanel>
            <SectionTitle>
              <FontAwesomeIcon icon={faEnvelope} />
              Email šablony - Náhledy (order_status_ke_schvaleni)
            </SectionTitle>
            <SectionDescription>
              Zobrazeno <strong>3 varianty</strong> email šablon z DB pro "Nová objednávka ke schválení"
            </SectionDescription>

            <CategorySection>
              <CategoryTitle>⚡ APPROVER_URGENT (Červená - High Priority)</CategoryTitle>
              <div style={{ 
                background: '#ffffff',
                border: '3px solid #dc2626',
                borderRadius: '8px',
                padding: '0',
                marginBottom: '30px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  padding: '30px',
                  textAlign: 'center'
                }}>
                  <h1 style={{ 
                    margin: 0,
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    ⚡ Nová objednávka ke schválení
                  </h1>
                </div>
                <div style={{ padding: '30px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Použití:</strong> Urgentní objednávky vyžadující okamžité schválení
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Ikona v předmětu:</strong> ⚡ (blesk - jako "Mimořádně" na dashboardu)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Příjemce:</strong> Schvalovatel (APPROVER)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Priorita:</strong> HIGH (červená)
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                    <strong>Placeholder DB:</strong> APPROVER_URGENT
                  </p>
                </div>
              </div>
            </CategorySection>

            <CategorySection>
              <CategoryTitle>❗ APPROVER_NORMAL (Oranžová - Normal Priority)</CategoryTitle>
              <div style={{ 
                background: '#ffffff',
                border: '3px solid #f97316',
                borderRadius: '8px',
                padding: '0',
                marginBottom: '30px',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #f97316, #fb923c)',
                  padding: '30px',
                  textAlign: 'center'
                }}>
                  <h1 style={{ 
                    margin: 0,
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    ❗ Nová objednávka ke schválení
                  </h1>
                </div>
                <div style={{ padding: '30px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Použití:</strong> Standardní objednávky běžné priority
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Ikona v předmětu:</strong> ❗ (vykřičník)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Příjemce:</strong> Schvalovatel (APPROVER)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Priorita:</strong> NORMAL (oranžová)
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                    <strong>Placeholder DB:</strong> APPROVER_NORMAL
                  </p>
                </div>
              </div>
            </CategorySection>

            <CategorySection>
              <CategoryTitle>✅ SUBMITTER (Zelená - Confirmation)</CategoryTitle>
              <div style={{ 
                background: '#ffffff',
                border: '3px solid #059669',
                borderRadius: '8px',
                padding: '0',
                marginBottom: '30px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  padding: '30px',
                  textAlign: 'center'
                }}>
                  <h1 style={{ 
                    margin: 0,
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    ✅ Objednávka odeslána ke schválení
                  </h1>
                </div>
                <div style={{ padding: '30px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Použití:</strong> Potvrzení pro zadavatele objednávky
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Ikona v předmětu:</strong> ✅ (zatím bez ikony v DB)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Příjemce:</strong> Zadavatel/Autor (SUBMITTER)
                  </p>
                  <p style={{ margin: '0 0 15px 0' }}>
                    <strong>Priorita:</strong> INFO (zelená)
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                    <strong>Placeholder DB:</strong> SUBMITTER
                  </p>
                </div>
              </div>
            </CategorySection>

            <div style={{ 
              background: '#f0f9ff',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '30px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#1e40af', fontSize: '18px' }}>
                📋 Placeholders v šablonách
              </h3>
              <div style={{ fontSize: '13px', color: '#374151', fontFamily: 'monospace', lineHeight: '1.8' }}>
                <div><strong>{`{order_number}`}</strong> - Evidenční číslo objednávky</div>
                <div><strong>{`{predmet}`}</strong> - Předmět objednávky</div>
                <div><strong>{`{strediska}`}</strong> - Seznam středisek</div>
                <div><strong>{`{financovani}`}</strong> - Zdroj financování</div>
                <div><strong>{`{financovani_poznamka}`}</strong> - Poznámka k financování</div>
                <div><strong>{`{amount}`}</strong> - Cena s DPH</div>
                <div><strong>{`{date}`}</strong> - Datum vytvoření</div>
                <div><strong>{`{approver_name}`}</strong> - Jméno schvalovatele</div>
                <div><strong>{`{user_name}`}</strong> - Jméno zadavatele</div>
                <div><strong>{`{order_id}`}</strong> - DB ID objednávky</div>
              </div>
            </div>

            <div style={{ 
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#92400e', fontSize: '16px' }}>
                ⚠️ Důležité poznámky
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#78350f', lineHeight: '1.8' }}>
                <li>V DB <strong>NENÍ pole dodavatel</strong> - nepoužívat {`{dodavatel_nazev}`}</li>
                <li>Ikony zatím <strong>pouze v hlavičce</strong>, ne v email předmětu</li>
                <li>SQL update připraven v: <code>docs/setup/update-notification-icons.sql</code></li>
                <li>Testování v: <strong>Mail Test tab → 3 barevná tlačítka</strong></li>
              </ul>
            </div>
          </IconsPanel>
        );

      case 'users':
        return (
          <ComingSoonPanel>
            <FontAwesomeIcon icon={faUserCog} />
            <h2>Users Debug Panel</h2>
            <p>Testování uživatelského API - připravujeme</p>
          </ComingSoonPanel>
        );

      case 'o25l-dashboard':
        const totalStatuses = Object.values(o25lDashboardStatuses).reduce((sum, statuses) => sum + statuses.length, 0);

        return (
          <IconsPanel>
            <SectionTitle>
              <FontAwesomeIcon icon={faClipboardList} />
              O25L Dashboard - Stavy objednávek
            </SectionTitle>
            <SectionDescription>
              Zobrazeno <strong>{totalStatuses} stavů</strong> používaných v Orders25List dashboardu s ikonami a barvami
            </SectionDescription>

            {Object.entries(o25lDashboardStatuses).map(([category, statuses]) => (
              <CategorySection key={category}>
                <CategoryTitle>{category} ({statuses.length})</CategoryTitle>
                <IconsGrid>
                  {statuses.map(({ status, label, color, desc }) => {
                    const icon = getStatusIcon(status);
                    const emoji = getStatusEmoji(status);
                    return (
                      <IconCard key={status} style={{ borderColor: color, minHeight: '180px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <FontAwesomeIcon icon={icon} style={{ color, fontSize: '2rem' }} />
                          <div style={{ fontSize: '1.5rem' }}>{emoji}</div>
                        </div>
                        <div className="icon-name" style={{ color }}>{label}</div>
                        {desc && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic', textAlign: 'center' }}>
                            {desc}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{status}</div>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          color: '#94a3b8', 
                          marginTop: '4px',
                          fontFamily: 'monospace',
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>{color}</div>
                      </IconCard>
                    );
                  })}
                </IconsGrid>
              </CategorySection>
            ))}
          </IconsPanel>
        );

      case 'spisovka':
        return <SpisovkaPanel />;

      case 'icons':
        const filteredCategories = {};
        Object.entries(iconCategories).forEach(([category, icons]) => {
          const filtered = icons.filter(({ name }) =>
            name.toLowerCase().includes(iconSearch.toLowerCase())
          );
          if (filtered.length > 0) {
            filteredCategories[category] = filtered;
          }
        });

        const totalIcons = Object.values(iconCategories).reduce((sum, icons) => sum + icons.length, 0);

        return (
          <IconsPanel>
            <SectionTitle>
              <FontAwesomeIcon icon={faIcons} />
              FontAwesome Icons Library
            </SectionTitle>
            <SectionDescription>
              Zobrazeno <strong>{totalIcons} ikon</strong> z balíku @fortawesome/free-solid-svg-icons (celkem přes 2000 dostupných)
            </SectionDescription>

            <SearchBox>
              <FontAwesomeIcon icon={require('@fortawesome/free-solid-svg-icons').faSearch} />
              <input
                type="text"
                placeholder="Hledat ikonu podle názvu..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
              />
              {iconSearch && (
                <button onClick={() => setIconSearch('')}>
                  <FontAwesomeIcon icon={require('@fortawesome/free-solid-svg-icons').faTimes} />
                </button>
              )}
            </SearchBox>

            {Object.entries(filteredCategories).map(([category, icons]) => (
              <CategorySection key={category}>
                <CategoryTitle>{category} ({icons.length})</CategoryTitle>
                <IconsGrid>
                  {icons.map(({ name, icon }) => (
                    <IconCard key={name}>
                      <FontAwesomeIcon icon={icon} />
                      <div className="icon-name">{name}</div>
                    </IconCard>
                  ))}
                </IconsGrid>
              </CategorySection>
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <div style={{ textAlign: 'center', padding: '52px', color: '#94a3b8' }}>
                Žádné ikony nenalezeny pro "{iconSearch}"
              </div>
            )}
          </IconsPanel>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <h1>
          <FontAwesomeIcon icon={faBug} />
          DEBUG Panel
        </h1>
        <p>Testování a ladění API endpointů a komponent</p>
      </Header>

      <TabsContainer>
        <Tab
          $active={activeTab === 'invoices'}
          onClick={() => setActiveTab('invoices')}
        >
          <FontAwesomeIcon icon={faFileInvoice} />
          Faktury Test
        </Tab>

        <Tab
          $active={activeTab === 'order-v2'}
          onClick={() => setActiveTab('order-v2')}
        >
          <FontAwesomeIcon icon={faDatabase} />
          Order V2 API
        </Tab>

        <Tab
          $active={activeTab === 'attachments'}
          onClick={() => setActiveTab('attachments')}
        >
          <FontAwesomeIcon icon={faPaperclip} />
          Attachments V2
        </Tab>

        <Tab
          $active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
        >
          <FontAwesomeIcon icon={faBell} />
          Notifications
        </Tab>

        <Tab
          $active={activeTab === 'mail'}
          onClick={() => setActiveTab('mail')}
        >
          <FontAwesomeIcon icon={faEnvelope} />
          Mail Test
        </Tab>

        <Tab
          $active={activeTab === 'modal-styles'}
          onClick={() => setActiveTab('modal-styles')}
        >
          <FontAwesomeIcon icon={faPalette} />
          Modal Styles
        </Tab>

        <Tab
          $active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        >
          <FontAwesomeIcon icon={faUserCog} />
          Users API
        </Tab>

        <Tab
          $active={activeTab === 'o25l-dashboard'}
          onClick={() => setActiveTab('o25l-dashboard')}
        >
          <FontAwesomeIcon icon={faClipboardList} />
          O25L Dashboard
        </Tab>

        <Tab
          $active={activeTab === 'spisovka'}
          onClick={() => setActiveTab('spisovka')}
        >
          <FontAwesomeIcon icon={faBookOpen} />
          Spisovka
        </Tab>

        <Tab
          $active={activeTab === 'icons'}
          onClick={() => setActiveTab('icons')}
        >
          <FontAwesomeIcon icon={faIcons} />
          Icons Library
        </Tab>

        <Tab
          $active={activeTab === 'html-templates'}
          onClick={() => setActiveTab('html-templates')}
        >
          <FontAwesomeIcon icon={faCode} />
          HTML Šablony
        </Tab>
      </TabsContainer>

      <Content>
        {renderTabContent()}
      </Content>
    </Container>
  );
};

// ============================================================
// SPISOVKA PANEL - Faktury ze spisovky
// ============================================================
const SpisovkaPanel = () => {
  const [faktury, setFaktury] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, rok: 2025 });

  const fetchFaktury = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/faktury?limit=${pagination.limit}&offset=${pagination.offset}&rok=${pagination.rok}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setFaktury(data.data);
        setPagination(data.pagination);
      } else {
        throw new Error(data.message || 'Nepodařilo se načíst faktury');
      }
    } catch (err) {
      setError(err.message);
      // ...existing code...
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaktury();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SpisovkaContainer>
      <SectionTitle>
        <FontAwesomeIcon icon={faBookOpen} />
        Faktury ze Spisovky (Databáze: spisovka350)
      </SectionTitle>
      
      <SectionDescription>
        Zobrazení faktur z produkční spisovky na serveru 10.1.1.253 s download odkazy na přílohy.
      </SectionDescription>

      <InfoBox>
        <strong>Celkem faktur v roce {pagination.rok}:</strong> {pagination.total} | 
        <strong> Zobrazeno:</strong> {faktury.length} z {pagination.total}
      </InfoBox>

      {loading && (
        <LoadingBox>
          <FontAwesomeIcon icon={faSpinner} spin />
          Načítám faktury ze spisovky...
        </LoadingBox>
      )}

      {error && (
        <ErrorBox>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          Chyba: {error}
        </ErrorBox>
      )}

      {!loading && !error && faktury.length > 0 && (
        <TableContainer>
          <StyledTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>JID</th>
                <th>Název faktury</th>
                <th>Číslo jednací</th>
                <th>Datum vzniku</th>
                <th>Datum vyřízení</th>
                <th>Stav</th>
                <th>Přílohy</th>
              </tr>
            </thead>
            <tbody>
              {faktury.map((faktura) => (
                <React.Fragment key={faktura.dokument_id}>
                  <tr>
                    <td>{faktura.dokument_id}</td>
                    <td><code>{faktura.jid}</code></td>
                    <td><strong>{faktura.nazev}</strong></td>
                    <td>{faktura.cislo_jednaci}</td>
                    <td>{formatDate(faktura.datum_vzniku)}</td>
                    <td>{formatDate(faktura.datum_vyrizeni)}</td>
                    <td>
                      <StatusBadge $stav={faktura.stav}>
                        {faktura.stav === 5 ? 'Vyřízeno' : `Stav ${faktura.stav}`}
                      </StatusBadge>
                    </td>
                    <td>
                      <strong>{faktura.pocet_priloh}</strong>
                    </td>
                  </tr>
                  {faktura.prilohy && faktura.prilohy.length > 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: 0 }}>
                        <PrilohaContainer>
                          <PrilohaTitle>📎 Přílohy ({faktura.prilohy.length}):</PrilohaTitle>
                          {faktura.prilohy.map((priloha) => {
                            const isPdf = priloha.mime_type === 'application/pdf';
                            return (
                              <PrilohaItem key={priloha.file_id}>
                                <PrilohaInfo>
                                  <PrilohaName>
                                    {isPdf && '📄 '}{priloha.filename}
                                  </PrilohaName>
                                  <PrilohaMeta>
                                    {priloha.mime_type} • {formatFileSize(priloha.size)}
                                  </PrilohaMeta>
                                </PrilohaInfo>
                                <DownloadButton
                                  href={priloha.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <FontAwesomeIcon icon={isPdf ? faFileAlt : faDownload} />
                                  {isPdf ? 'Zobrazit PDF' : 'Stáhnout'}
                                </DownloadButton>
                              </PrilohaItem>
                            );
                          })}
                        </PrilohaContainer>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </StyledTable>
        </TableContainer>
      )}
    </SpisovkaContainer>
  );
};

// Styled components pro Spisovka Panel
const SpisovkaContainer = styled.div`
  padding: 26px;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: #1e40af;
  
  strong {
    font-weight: 600;
    margin-right: 8px;
  }
`;

const LoadingBox = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #6b7280;
  
  svg {
    margin-right: 10px;
    color: #3b82f6;
  }
`;

const ErrorBox = styled.div`
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: #dc2626;
  
  svg {
    margin-right: 10px;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    background: #f9fafb;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
    font-size: 14px;
  }
  
  tbody tr {
    border-bottom: 1px solid #e5e7eb;
    transition: background 0.15s;
    
    &:hover {
      background: #f9fafb;
    }
  }
  
  td {
    padding: 12px 16px;
    color: #1f2937;
    font-size: 14px;
    
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Courier New', monospace;
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.$stav === 5 ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$stav === 5 ? '#166534' : '#92400e'};
`;

const PrilohaContainer = styled.div`
  background: #f9fafb;
  padding: 16px;
  border-top: 2px solid #e5e7eb;
`;

const PrilohaTitle = styled.div`
  font-weight: 600;
  margin-bottom: 12px;
  color: #374151;
`;

const PrilohaItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PrilohaInfo = styled.div`
  flex: 1;
`;

const PrilohaName = styled.div`
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
`;

const PrilohaMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const DownloadButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
  }
  
  svg {
    font-size: 14px;
  }
`;

// ============================================================
// HTML TEMPLATES PANEL - HTML šablony s odesláním na mail
// ============================================================
const HtmlTemplatesPanel = () => {
  const { token, username } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [generatingPasswords, setGeneratingPasswords] = useState(false);
  const [passwordResults, setPasswordResults] = useState([]);
  
  // Emailové šablony z databáze pro výběr
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Vyhledávání v seznamu uživatelů
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Templates pro zobrazení - načítají se z emailTemplates (DB)
  const [templates, setTemplates] = useState([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Welcome preview state
  const [welcomePreviewHtml, setWelcomePreviewHtml] = useState('');
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);
  const [welcomeSelectedId, setWelcomeSelectedId] = useState(null);

  // Načtení uživatelů při mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token || !username) return;
      
      setLoadingUsers(true);
      try {
        const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const response = await fetch(`${API_BASE_URL}users/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            username,
            aktivni: 1  // Načíst jen aktivní uživatele
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // API vrací přímo pole uživatelů
          if (Array.isArray(data)) {
            // Seřadit podle jména
            const sortedUsers = data.sort((a, b) => {
              const nameA = `${a.jmeno || ''} ${a.prijmeni || ''}`.trim();
              const nameB = `${b.jmeno || ''} ${b.prijmeni || ''}`.trim();
              return nameA.localeCompare(nameB, 'cs');
            });
            setUsers(sortedUsers);
          }
        }
      } catch (error) {
        // Tichá chyba
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [token, username]);

  // Načtení emailových šablon z DB
  useEffect(() => {
    const fetchEmailTemplates = async () => {
      if (!token || !username) return;
      
      setLoadingTemplates(true);
      try {
        const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const url = `${API_BASE_URL}notifications/templates/list`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            username
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'ok' && Array.isArray(data.data)) {
            setEmailTemplates(data.data);
            // Automaticky vybrat uvítací šablonu (welcome_new_user)
            const welcomeTemplate = data.data.find(t => t.typ === 'welcome_new_user');
            if (welcomeTemplate) {
              setSelectedTemplateId(welcomeTemplate.id);
            }
          }
        }
      } catch (error) {
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchEmailTemplates();
  }, [token, username]);

  // Transformace emailTemplates do formátu templates pro zobrazení
  useEffect(() => {
    if (emailTemplates.length > 0) {
      const transformedTemplates = emailTemplates.map(template => ({
        id: template.id,
        name: template.nazev || template.email_predmet || `Šablona ${template.id}`,
        subject: template.email_predmet || 'Bez předmětu',
        html: template.email_telo || ''
      }));
      setTemplates(transformedTemplates);
    }
  }, [emailTemplates]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleGeneratePasswords = async () => {
    if (selectedUsers.length === 0) {
      setMessage({ type: 'error', text: 'Vyberte alespoň jednoho uživatele' });
      return;
    }

    if (!selectedTemplateId) {
      setMessage({ type: 'error', text: 'Vyberte emailovou šablonu' });
      return;
    }

    setGeneratingPasswords(true);
    setMessage({ type: '', text: '' });
    setPasswordResults([]);

    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
      const response = await fetch(`${API_BASE_URL}users/generate-temp-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          user_ids: selectedUsers,
          template_id: selectedTemplateId
        })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        setPasswordResults(data.results || []);
        setMessage({ 
          type: 'success', 
          text: `Úspěšně vygenerováno ${data.results.length} hesel a odesláno uvítacích emailů` 
        });
        setSelectedUsers([]);
      } else {
        throw new Error(data.err || 'Nepodařilo se vygenerovat hesla');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      // ...existing code...
    } finally {
      setGeneratingPasswords(false);
    }
  };


  const handleSendEmail = async (template) => {
    if (!emailTo || !emailTo.includes('@')) {
      setMessage({ type: 'error', text: 'Zadejte platnou emailovou adresu' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${process.env.REACT_APP_API2_BASE_URL}v2025.03_25/debug-mail.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailTo,
          subject: template.subject,
          html: template.html,
          template_name: template.name
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage({ type: 'success', text: `Email odeslán na ${emailTo}` });
        setEmailTo('');
      } else {
        throw new Error(data.message || 'Nepodařilo se odeslat email');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      // ...existing code...
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async (template) => {
    // Vždy načti aktuální data z DB před zobrazením náhledu
    setLoadingTemplates(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
      const url = `${API_BASE_URL}notifications/templates/list`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'ok' && Array.isArray(data.data)) {
          // Najdi aktuální verzi šablony podle ID
          const freshTemplate = data.data.find(t => t.id === template.id);
          if (freshTemplate) {
            const transformedTemplate = {
              id: freshTemplate.id,
              name: freshTemplate.nazev || freshTemplate.email_predmet || `Šablona ${freshTemplate.id}`,
              subject: freshTemplate.email_predmet || 'Bez předmětu',
              html: freshTemplate.email_telo || ''
            };
            setSelectedTemplate(transformedTemplate);
          } else {
            setSelectedTemplate(template);
          }
        } else {
          setSelectedTemplate(template);
        }
      } else {
        setSelectedTemplate(template);
      }
    } catch (error) {
      setSelectedTemplate(template);
    } finally {
      setLoadingTemplates(false);
    }
  };

  return (
    <IconsPanel>
      <SectionTitle>
        <FontAwesomeIcon icon={faCode} />
        HTML Email Šablony
      </SectionTitle>
      <SectionDescription>
        Správa a testování HTML email šablon s možností odeslání na testovací adresu
      </SectionDescription>

      {message.text && (
        <div style={{
          padding: '15px 20px',
          margin: '20px 0',
          borderRadius: '8px',
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* GENEROVÁNÍ DOČASNÝCH HESEL A UVÍTACÍCH EMAILŮ */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        marginTop: '20px',
        border: '2px solid #1d4ed8'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '20px', fontWeight: '700' }}>
          🎉 Generování dočasných hesel a uvítacích emailů
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#e0f2fe', fontSize: '14px' }}>
          Vyberte uživatele, kterým chcete vygenerovat dočasné heslo a odeslat uvítací email
        </p>

        {loadingUsers ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
            Načítám uživatele...
          </div>
        ) : (
          <>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '20px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <strong style={{ color: '#1f2937', fontSize: '15px' }}>
                  👥 Seznam uživatelů ({users.filter(u => {
                    if (!userSearchQuery) return true;
                    const query = userSearchQuery.toLowerCase();
                    const fullName = `${u.jmeno || ''} ${u.prijmeni || ''}`.toLowerCase();
                    const username = (u.username || '').toLowerCase();
                    const email = (u.email || '').toLowerCase();
                    return fullName.includes(query) || username.includes(query) || email.includes(query);
                  }).length})
                </strong>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>
                  Vybráno: {selectedUsers.length}
                </span>
              </div>

              {/* Vyhledávací pole */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="🔍 Hledat uživatele (jméno, username, email)..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#1f2937',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {users.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  Žádní uživatelé
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.filter(user => {
                    // Filtrování podle vyhledávacího dotazu
                    if (!userSearchQuery) return true;
                    const query = userSearchQuery.toLowerCase();
                    const fullName = `${user.jmeno || ''} ${user.prijmeni || ''}`.toLowerCase();
                    const username = (user.username || '').toLowerCase();
                    const email = (user.email || '').toLowerCase();
                    return fullName.includes(query) || username.includes(query) || email.includes(query);
                  }).map(user => {
                    const fullName = `${user.jmeno || ''} ${user.prijmeni || ''}`.trim() || 'Bez jména';
                    const isSelected = selectedUsers.includes(user.id);
                    
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserToggle(user.id)}
                        style={{
                          padding: '12px 16px',
                          background: isSelected ? '#dbeafe' : 'white',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            color: '#1f2937', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            marginBottom: '4px'
                          }}>
                            {fullName}
                          </div>
                          <div style={{ 
                            color: '#6b7280', 
                            fontSize: '12px',
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <span>👤 {user.username}</span>
                            <span>📧 {user.email || 'Bez emailu'}</span>
                            <span style={{ 
                              background: '#f3f4f6', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {user.roles && user.roles.length > 0 
                                ? user.roles.map(r => r.nazev_role).join(', ')
                                : 'Bez role'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* VÝBĚR EMAILOVÉ ŠABLONY */}
            <div style={{
              marginTop: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <FontAwesomeIcon icon={faEnvelope} style={{ color: '#3b82f6' }} />
                <strong style={{ color: '#1f2937', fontSize: '15px' }}>
                  Vyberte emailovou šablonu
                </strong>
              </div>
              
              {loadingTemplates ? (
                <div style={{ padding: '12px', color: '#6b7280', textAlign: 'center' }}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                  Načítám šablony...
                </div>
              ) : (
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="">-- Vyberte šablonu --</option>
                  {emailTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.nazev || template.email_predmet || `Šablona ${template.id}`}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedTemplateId && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f0f9ff',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                  fontSize: '13px',
                  color: '#0c4a6e'
                }}>
                  ℹ️ Vybraná šablona bude použita pro odeslání emailu všem zvoleným uživatelům
                </div>
              )}
            </div>

            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button
                onClick={handleGeneratePasswords}
                disabled={generatingPasswords || selectedUsers.length === 0 || !selectedTemplateId}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: generatingPasswords || selectedUsers.length === 0 || !selectedTemplateId
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: generatingPasswords || selectedUsers.length === 0 || !selectedTemplateId ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: generatingPasswords || selectedUsers.length === 0 || !selectedTemplateId
                    ? 'none' 
                    : '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                {generatingPasswords ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                    Generuji hesla a odesílám emaily...
                  </>
                ) : (
                  <>🔑 Vygenerovat hesla a odeslat uvítací emaily ({selectedUsers.length})</>
                )}
              </button>
            </div>

            {passwordResults.length > 0 && (
              <div style={{
                marginTop: '16px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <strong style={{ color: '#1f2937', fontSize: '14px', display: 'block', marginBottom: '12px' }}>
                  ✅ Výsledky generování:
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {passwordResults.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: result.success ? '#d1fae5' : '#fee2e2',
                        border: `1px solid ${result.success ? '#10b981' : '#ef4444'}`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: result.success ? '#065f46' : '#991b1b'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>
                        {result.success ? '✓' : '✗'} {result.user_name} ({result.username})
                      </div>
                      {result.success && (
                        <div style={{ fontSize: '12px', marginTop: '4px', fontFamily: 'monospace' }}>
                          Heslo: <strong>{result.temp_password}</strong> | Email odeslán na: {result.email}
                        </div>
                      )}
                      {!result.success && (
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Chyba: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* NÁHLED WELCOME EMAIL ŠABLONY Z DATABÁZE */}
      {emailTemplates.filter(t => t.typ && t.typ.startsWith('welcome_')).length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginTop: '26px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '18px' }}>
            👁️ Náhled welcome šablon z databáze
          </h3>

          <div style={{ marginBottom: '16px' }}>
            {emailTemplates.filter(t => t.typ && t.typ.startsWith('welcome_')).map((template) => (
              <div key={template.id} style={{
                background: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                      {template.nazev || template.email_predmet}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Typ: <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{template.typ}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!template.email_telo) {
                        alert('⚠️ CHYBA: Šablona nemá vyplněné email_telo v databázi!');
                        return;
                      }
                      
                      const placeholders = {
                        '{uzivatelske_jmeno}': 'jan.novak',
                        '{docasne_heslo}': 'Test1234!',
                        '{cele_jmeno}': 'Jan Novák',
                        '{jmeno}': 'Jan',
                        '{prijmeni}': 'Novák',
                        '{email}': 'jan.novak@zachranka.cz'
                      };
                      let html = template.email_telo || '';
                      
                      Object.entries(placeholders).forEach(([placeholder, value]) => {
                        html = html.replaceAll(placeholder, value);
                      });
                      
                      setWelcomePreviewHtml(html);
                      setShowWelcomePreview(true);
                      setWelcomeSelectedId(template.id);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    👁️ Zobrazit náhled
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {showWelcomePreview && welcomePreviewHtml && (
            <div style={{
              marginTop: '16px',
              padding: '10px',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <strong>📧 Náhled šablony - TADY JE NÁHLED!!!</strong>
                <button
                  onClick={() => {
                    setShowWelcomePreview(false);
                    setWelcomePreviewHtml('');
                    setWelcomeSelectedId(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✕ Zavřít
                </button>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                maxHeight: '600px',
                overflowY: 'auto'
              }} dangerouslySetInnerHTML={{ __html: welcomePreviewHtml }} />
            </div>
          )}

          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #bae6fd',
            fontSize: '13px',
            color: '#0c4a6e'
          }}>
            ℹ️ Tyto šablony se načítají přímo z databáze (tabulka: <code>25_notifikace_sablony</code>, typ začíná na: <code>welcome_</code>)
          </div>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginTop: '26px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '18px' }}>
          📧 Email pro testování
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="email"
            placeholder="vas.email@example.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Sem se pošlou testovací emaily
          </div>
        </div>
      </div>

      <CategorySection>
        <CategoryTitle>
          📋 Dostupné šablony ({templates.length})
        </CategoryTitle>

        {templates.map((template) => (
          <div key={template.id} style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>
                  {template.name}
                </h4>
                <div style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
                  Předmět: {template.subject}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handlePreview(template)}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  👁️ Náhled
                </button>
                <button
                  onClick={() => handleSendEmail(template)}
                  disabled={sending || !emailTo}
                  style={{
                    padding: '8px 16px',
                    background: sending || !emailTo ? '#cbd5e1' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: sending || !emailTo ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  {sending ? '📤 Odesílám...' : '📧 Odeslat'}
                </button>
              </div>
            </div>
            
            {selectedTemplate?.id === template.id && (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ color: '#1f2937' }}>Náhled šablony:</strong>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    style={{
                      padding: '4px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Zavřít
                  </button>
                </div>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }} dangerouslySetInnerHTML={{ __html: template.html }} />
              </div>
            )}
          </div>
        ))}
      </CategorySection>

      <div style={{
        background: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '26px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#92400e', fontSize: '16px' }}>
          ℹ️ Jak na to
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#78350f', lineHeight: '1.8' }}>
          <li>Zadejte testovací email adresu do pole nahoře</li>
          <li>Klikněte na "Náhled" pro zobrazení šablony</li>
          <li>Klikněte na "Odeslat" pro odeslání na testovací email</li>
        </ul>
      </div>

      <div style={{
        background: '#e0f2fe',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '16px' }}>
          📋 Placeholders v šabloně "Uvítací email"
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.8', fontFamily: 'monospace' }}>
          <li><strong>{'{docasne_heslo}'}</strong> - Dočasné heslo pro první přihlášení (např. U0xxxxx)</li>
        </ul>
        <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#1e3a8a' }}>
          Odkaz na aplikaci: <strong>https://erdms.zachranka.cz/eeo-v2</strong>
        </p>
      </div>
    </IconsPanel>
  );
};

export default DebugPanel;
