import React, { useState } from 'react';
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
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import { getStatusIcon, getStatusEmoji } from '../utils/iconMapping';
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
          $active={activeTab === 'icons'}
          onClick={() => setActiveTab('icons')}
        >
          <FontAwesomeIcon icon={faIcons} />
          Icons Library
        </Tab>
      </TabsContainer>

      <Content>
        {renderTabContent()}
      </Content>
    </Container>
  );
};

export default DebugPanel;
