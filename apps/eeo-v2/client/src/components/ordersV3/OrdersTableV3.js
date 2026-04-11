/**
 * OrdersTableV3.js
 * 
 * Základní tabulka pro Orders V3 s TanStack Table
 * Sloupce přesně jako v původním Orders25List.js
 * 
 * Optimalizováno pro širokoúhlé monitory s horizontal scrollem
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquare as farSquare } from '@fortawesome/free-regular-svg-icons';
import DatePicker from '../DatePicker';
import OperatorInput from '../OperatorInput';
import useExpandedRowsV3 from '../../hooks/ordersV3/useExpandedRowsV3';
import OrderExpandedRowV3 from './OrderExpandedRowV3';
import OrderCommentsTooltip from './OrderCommentsTooltip';
import ConfirmDialog from '../ConfirmDialog';
import { updateOrderV3 } from '../../services/apiOrdersV3';
import { getOrderDetailV3 } from '../../services/apiOrderV3';
import { getOrderV2 } from '../../services/apiOrderV2';
import { SmartTooltip } from '../../styles/SmartTooltip'; // ✅ Custom tooltip component
import {
  faPlus,
  faMinus,
  faCheckCircle,
  faHourglassHalf,
  faTimesCircle,
  faShield,
  faFileContract,
  faClock,
  faFlag,
  faFilePen,
  faCircleNotch,
  faTruck,
  faXmark,
  faBan,
  faEdit,
  faFileInvoice,
  faFileWord,
  faBolt,
  faBoltLightning,
  faGripVertical,
  faEyeSlash,
  faTimes,
  faUndo,
  faTrash,
  faSearch,
  faArrowsLeftRight,
  faSort,
  faSortAlphaDown,
  faComment,
  faComments,
  faCircle,
  faInfoCircle,
  faCheckSquare,
  faSync,
  faLock,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// KEYFRAMES
// ============================================================================

// 🎯 Animace pro zvýraznění řádku po schválení - inspirace Order25List
const highlightPulse = keyframes`
  0% {
    filter: brightness(1.4) saturate(1.3);
    box-shadow: 0 0 30px currentColor, 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px) scale(1.015);
  }
  15% {
    filter: brightness(1.5) saturate(1.4);
    box-shadow: 0 0 40px currentColor, 0 6px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-3px) scale(1.02);
  }
  30% {
    filter: brightness(1.3) saturate(1.2);
    box-shadow: 0 0 25px currentColor, 0 3px 12px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px) scale(1.01);
  }
  60% {
    filter: brightness(1.15) saturate(1.1);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(0) scale(1.005);
  }
  80% {
    filter: brightness(1.05) saturate(1.05);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    transform: translateY(0) scale(1.002);
  }
  100% {
    filter: brightness(1) saturate(1);
    box-shadow: none;
    transform: translateY(0) scale(1);
  }
`;

const parseWorkflowStates = (workflowCode) => {
  if (!workflowCode) return [];
  try {
    if (Array.isArray(workflowCode)) return workflowCode;
    if (typeof workflowCode === 'string') {
      const parsed = JSON.parse(workflowCode);
      return Array.isArray(parsed) ? parsed : [workflowCode];
    }
    return [workflowCode];
  } catch {
    return [workflowCode];
  }
};

const getLastWorkflowState = (workflowCode) => {
  const states = parseWorkflowStates(workflowCode);
  if (!states.length) return '';
  const lastState = states[states.length - 1];
  if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
    return String(lastState.kod_stavu || lastState.nazev_stavu).toUpperCase().trim();
  }
  return String(lastState || '').toUpperCase().trim();
};

const getMySQLDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Funkce pro formátování jména uživatele s titulem (stejná jako v OrderExpandedRowV3)
const formatUserName = (jmeno, prijmeni, titulPred, titulZa) => {
  const parts = [];
  
  if (titulPred) parts.push(titulPred);
  if (prijmeni) parts.push(prijmeni);
  if (jmeno) parts.push(jmeno);
  if (titulZa) parts.push(titulZa);
  
  return parts.length > 0 ? parts.join(' ') : '---';
};

// Funkce pro detekci časové části v datetime stringu
const hasTimePart = (dateString) => {
  if (!dateString) return false;
  if (typeof dateString !== 'string') return true;
  // MySQL: YYYY-MM-DD HH:MM:SS, ISO: YYYY-MM-DDTHH:MM:SS
  // Kontrola, zda čas není 00:00:00
  const match = dateString.match(/[T\s](\d{2}):(\d{2}):?(\d{2})?/);
  if (!match) return false;
  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] || '00';
  // Pokud je čas 00:00:00, považujeme to za datum bez času
  return !(hours === '00' && minutes === '00' && seconds === '00');
};

// Formátování data s časem nebo jen data podle obsahu
const formatSmartDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    if (hasTimePart(dateString)) {
      // S časem
      return new Intl.DateTimeFormat('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } else {
      // Jen datum
      return new Intl.DateTimeFormat('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    }
  } catch {
    return dateString;
  }
};

// Funkce pro formátování workflow tooltipů (stejná logika jako v OrderExpandedRowV3)
const formatWorkflowTooltip = (order) => {
  const steps = [];
  
  // 1. Vytvořil/Objednatel
  if (order.dt_vytvoreni) {
    const userName = (order.objednatel_jmeno || order.objednatel_prijmeni)
      ? formatUserName(order.objednatel_jmeno, order.objednatel_prijmeni, order.objednatel_titul_pred, order.objednatel_titul_za)
      : '---';
    steps.push({
      label: `1. ${order.objednatel_jmeno ? 'Objednatel' : 'Vytvořil'}:`,
      user: userName,
      date: formatSmartDate(order.dt_vytvoreni),
      color: '#3b82f6'
    });
  }
  
  // 2. Schválil
  if (order.dt_schvaleni && (order.schvalovatel_jmeno || order.schvalovatel_prijmeni)) {
    const userName = formatUserName(order.schvalovatel_jmeno, order.schvalovatel_prijmeni, order.schvalovatel_titul_pred, order.schvalovatel_titul_za);
    steps.push({
      label: '2. Schválil:',
      user: userName,
      date: formatSmartDate(order.dt_schvaleni),
      color: '#059669'
    });
  }
  
  // 3. Odeslal dodavateli
  if (order.dt_odeslani) {
    const userName = (order.odesilatel_jmeno || order.odesilatel_prijmeni)
      ? formatUserName(order.odesilatel_jmeno, order.odesilatel_prijmeni, order.odesilatel_titul_pred, order.odesilatel_titul_za)
      : '---';
    steps.push({
      label: '3. Odeslal dodavateli:',
      user: userName,
      date: formatSmartDate(order.dt_odeslani),
      color: '#0891b2'
    });
  }
  
  // 4. Dodavatel potvrdil
  if (order.dt_akceptace) {
    const userName = (order.dodavatel_potvrdil_jmeno || order.dodavatel_potvrdil_prijmeni)
      ? formatUserName(order.dodavatel_potvrdil_jmeno, order.dodavatel_potvrdil_prijmeni, order.dodavatel_potvrdil_titul_pred, order.dodavatel_potvrdil_titul_za)
      : '---';
    steps.push({
      label: '4. Dodavatel potvrdil:',
      user: userName,
      date: formatSmartDate(order.dt_akceptace),
      color: '#7c3aed'
    });
  }
  
  // 5. Zveřejnil
  if (order.dt_zverejneni) {
    const userName = (order.zverejnil_jmeno || order.zverejnil_prijmeni)
      ? formatUserName(order.zverejnil_jmeno, order.zverejnil_prijmeni, order.zverejnil_titul_pred, order.zverejnil_titul_za)
      : '---';
    steps.push({
      label: '5. Zveřejnil:',
      user: userName,
      date: formatSmartDate(order.dt_zverejneni),
      color: '#f59e0b'
    });
  }
  
  // 6-7. Přidání faktur, ověření věcné správnosti
  if (order.faktury && order.faktury.length > 0) {
    const faktury = order.faktury
      .filter(f => f.dt_vytvoreni)
      .sort((a, b) => new Date(a.dt_vytvoreni) - new Date(b.dt_vytvoreni));
      
    if (faktury.length > 0) {
      steps.push({
        label: '6.-7. Přidání faktur, ověření věcné správnosti',
        faktury: faktury,
        color: '#ea580c'
      });
    }
  }
  
  // 7. Dokončil objednávku
  if (order.dt_dokonceni) {
    const userName = (order.dokoncil_jmeno || order.dokoncil_prijmeni)
      ? formatUserName(order.dokoncil_jmeno, order.dokoncil_prijmeni, order.dokoncil_titul_pred, order.dokoncil_titul_za)
      : '---';
    steps.push({
      label: '7. Dokončil objednávku:',
      user: userName,
      date: formatSmartDate(order.dt_dokonceni),
      color: '#16a34a'
    });
  }
  
  if (steps.length === 0) return null;
  
  // Vytvoř JSX element s barevným formátováním
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '400px' }}>
      {steps.map((step, index) => {
        // Speciální rendering pro faktury
        if (step.faktury) {
          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ color: step.color, fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {step.label}
              </div>
              {step.faktury.map((faktura, fIndex) => (
                <div key={fIndex} style={{ paddingLeft: '0.5rem', borderLeft: `2px solid ${step.color}`, marginBottom: '0.5rem' }}>
                  {/* Řádek faktury */}
                  <div style={{ color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    FA VS: {faktura.fa_cislo_vema || 'N/A'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.75rem', paddingLeft: '0.5rem' }}>
                    {faktura.vytvoril_uzivatel_jmeno && faktura.vytvoril_uzivatel_prijmeni
                      ? formatUserName(faktura.vytvoril_uzivatel_jmeno, faktura.vytvoril_uzivatel_prijmeni, faktura.vytvoril_uzivatel_titul_pred, faktura.vytvoril_uzivatel_titul_za)
                      : 'Neznámý'} - {formatSmartDate(faktura.dt_vytvoreni)}
                  </div>
                  
                  {/* Věcná správnost (pokud existuje) */}
                  {faktura.dt_potvrzeni_vecne_spravnosti && (
                    <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                      <div style={{ color: '#0891b2', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>✓</span>
                        <span>Věcná správnost</span>
                      </div>
                      <div style={{ color: 'white', fontSize: '0.75rem', paddingLeft: '0.75rem' }}>
                        {faktura.potvrdil_vecnou_spravnost_jmeno && faktura.potvrdil_vecnou_spravnost_prijmeni
                          ? formatUserName(faktura.potvrdil_vecnou_spravnost_jmeno, faktura.potvrdil_vecnou_spravnost_prijmeni, faktura.potvrdil_vecnou_spravnost_titul_pred, faktura.potvrdil_vecnou_spravnost_titul_za)
                          : '---'} - {formatSmartDate(faktura.dt_potvrzeni_vecne_spravnosti)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }
        
        // Normální rendering pro běžné kroky
        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ color: step.color, fontWeight: 700, fontSize: '0.85rem' }}>
              {step.label}
            </div>
            <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              {step.user} - {step.date}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Formátuje tooltip pro stav registru (Zveřejněno / Má být zveřejněno)
 * @param {Object} order - Objednávka
 * @param {string} statusCode - Kód stavu ('UVEREJNENA' nebo 'KE_SCHVALENI')
 * @returns {JSX.Element|null} - JSX element s tooltipem nebo null
 */
const formatRegistrTooltip = (order, statusCode) => {
  if (!statusCode || statusCode === 'EMPTY') return null;
  
  const registr = order.registr_smluv;
  
  // Pro "Zveřejněno" - zobraz datum, uživatele a registr ID
  if (statusCode === 'UVEREJNENA' && registr?.dt_zverejneni) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '300px' }}>
        <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
          Zveřejněno v registru smluv
        </div>
        
        {/* Datum zveřejnění */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Datum zveřejnění:</div>
          <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
            {formatSmartDate(registr.dt_zverejneni)}
          </div>
        </div>
        
        {/* Uživatel který zveřejnil */}
        {(order.zverejnil_jmeno || order.zverejnil_prijmeni) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Zveřejnil:</div>
            <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
              {formatUserName(order.zverejnil_jmeno, order.zverejnil_prijmeni, order.zverejnil_titul_pred, order.zverejnil_titul_za)}
            </div>
          </div>
        )}
        
        {/* Registr ID */}
        {registr.registr_iddt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>ID v registru:</div>
            <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem', fontFamily: 'monospace' }}>
              {registr.registr_iddt}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Pro "Má být zveřejněno" - zobraz jen info že čeká na zveřejnění
  if (statusCode === 'KE_SCHVALENI') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
        <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
          Má být zveřejněno
        </div>
        
        <div style={{ color: 'white', fontSize: '0.8rem', fontStyle: 'italic' }}>
          Objednávka zatím nebyla zveřejněna v registru smluv.
        </div>
        
        {/* Pokud existuje zverejnit flag */}
        {registr?.zverejnit === 'ANO' && (
          <div style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            ⚠️ Označeno k zveřejnění
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

/**
 * Formátuje tooltip pro workflow stav objednávky
 * @param {Object} order - Objednávka
 * @param {string} displayStatus - Zobrazovaný text stavu
 * @param {string} statusCode - Systémový kód stavu
 * @returns {JSX.Element|null} - JSX element s tooltipem nebo null
 */
const formatWorkflowStateTooltip = (order, displayStatus, statusCode) => {
  if (!statusCode || statusCode === 'EMPTY') return null;
  
  // Mapování stavů na datum a uživatele
  const statusInfo = {
    NOVA: {
      date: order.dt_vytvoreni,
      user: formatUserName(order.objednatel_jmeno, order.objednatel_prijmeni, order.objednatel_titul_pred, order.objednatel_titul_za),
      label: 'Vytvořena'
    },
    ODESLANA_KE_SCHVALENI: {
      date: order.dt_odeslani,
      user: formatUserName(order.odesilatel_jmeno, order.odesilatel_prijmeni, order.odesilatel_titul_pred, order.odesilatel_titul_za),
      label: 'Odeslána ke schválení',
      // Fallback: pokud nemá vlastní datum/uživatele, použij z NOVA (objednatel vytvořil)
      fallbackDate: order.dt_vytvoreni,
      fallbackUser: formatUserName(order.objednatel_jmeno, order.objednatel_prijmeni, order.objednatel_titul_pred, order.objednatel_titul_za),
      fallbackAction: 'Vytvořil'
    },
    SCHVALENA: {
      date: order.dt_schvaleni,
      user: formatUserName(order.schvalovatel_jmeno, order.schvalovatel_prijmeni, order.schvalovatel_titul_pred, order.schvalovatel_titul_za),
      label: 'Schválena'
    },
    ODESLANA: {
      date: order.dt_odeslani,
      user: formatUserName(order.odesilatel_jmeno, order.odesilatel_prijmeni, order.odesilatel_titul_pred, order.odesilatel_titul_za),
      label: 'Odeslána dodavateli'
    },
    POTVRZENA: {
      date: order.dt_akceptace,
      user: formatUserName(order.dodavatel_potvrdil_jmeno, order.dodavatel_potvrdil_prijmeni, order.dodavatel_potvrdil_titul_pred, order.dodavatel_potvrdil_titul_za),
      label: 'Potvrzena dodavatelem'
    },
    K_UVEREJNENI_DO_REGISTRU: {
      date: order.dt_zverejneni,
      user: formatUserName(order.zverejnil_jmeno, order.zverejnil_prijmeni, order.zverejnil_titul_pred, order.zverejnil_titul_za),
      label: 'K uveřejnění',
      // Fallback: pokud nemá vlastní datum/uživatele, použij z POTVRZENA (dodavatel potvrdil)
      fallbackDate: order.dt_akceptace,
      fallbackUser: formatUserName(order.dodavatel_potvrdil_jmeno, order.dodavatel_potvrdil_prijmeni, order.dodavatel_potvrdil_titul_pred, order.dodavatel_potvrdil_titul_za),
      fallbackAction: 'Potvrdil'
    },
    UVEREJNENA: {
      date: order.dt_zverejneni,
      user: formatUserName(order.zverejnil_jmeno, order.zverejnil_prijmeni, order.zverejnil_titul_pred, order.zverejnil_titul_za),
      label: 'Uveřejněna'
    },
    FAKTURACE: {
      // Fallback: pokud není fakturant_id, použij prvního uživatele z faktur
      date: order.dt_faktura_pridana || (order.faktury && order.faktury[0] ? order.faktury[0].dt_vytvoreni : null),
      user: (order.fakturant_jmeno || order.fakturant_prijmeni)
        ? formatUserName(order.fakturant_jmeno, order.fakturant_prijmeni, order.fakturant_titul_pred, order.fakturant_titul_za)
        : (order.faktury && order.faktury[0] && order.faktury[0].vytvoril_uzivatel_jmeno)
          ? formatUserName(order.faktury[0].vytvoril_uzivatel_jmeno, order.faktury[0].vytvoril_uzivatel_prijmeni, order.faktury[0].vytvoril_uzivatel_titul_pred, order.faktury[0].vytvoril_uzivatel_titul_za)
          : null,
      label: 'Fakturace',
      // Fallback: PŘEDCHOZÍ WORKFLOW KROK podle workflow manageru
      // Pokud bylo zveřejněno → Zveřejnil, jinak → Dodavatel potvrdil
      fallbackDate: order.dt_zverejneni || order.dt_akceptace,
      fallbackUser: order.dt_zverejneni 
        ? formatUserName(order.zverejnil_jmeno, order.zverejnil_prijmeni, order.zverejnil_titul_pred, order.zverejnil_titul_za)
        : formatUserName(order.dodavatel_potvrdil_jmeno, order.dodavatel_potvrdil_prijmeni, order.dodavatel_potvrdil_titul_pred, order.dodavatel_potvrdil_titul_za),
      fallbackAction: order.dt_zverejneni ? 'Zveřejnil' : 'Potvrdil'
    },
    VECNA_SPRAVNOST: {
      date: order.dt_potvrzeni_vecne_spravnosti,
      user: formatUserName(order.potvrdil_vecnou_spravnost_jmeno, order.potvrdil_vecnou_spravnost_prijmeni, order.potvrdil_vecnou_spravnost_titul_pred, order.potvrdil_vecnou_spravnost_titul_za),
      label: 'Věcná správnost',
      // Fallback: PŘEDCHOZÍ WORKFLOW KROK = FAKTURACE (kdo přidal fakturu)
      fallbackDate: order.dt_faktura_pridana || (order.faktury && order.faktury[0] ? order.faktury[0].dt_vytvoreni : null),
      fallbackUser: (order.fakturant_jmeno || order.fakturant_prijmeni)
        ? formatUserName(order.fakturant_jmeno, order.fakturant_prijmeni, order.fakturant_titul_pred, order.fakturant_titul_za)
        : (order.faktury && order.faktury[0] && order.faktury[0].vytvoril_uzivatel_jmeno)
          ? formatUserName(order.faktury[0].vytvoril_uzivatel_jmeno, order.faktury[0].vytvoril_uzivatel_prijmeni, order.faktury[0].vytvoril_uzivatel_titul_pred, order.faktury[0].vytvoril_uzivatel_titul_za)
          : null,
      fallbackAction: 'Přidal fakturu'
    },
    ZKONTROLOVANA: {
      date: order.dt_potvrzeni_vecne_spravnosti,
      user: formatUserName(order.potvrdil_vecnou_spravnost_jmeno, order.potvrdil_vecnou_spravnost_prijmeni, order.potvrdil_vecnou_spravnost_titul_pred, order.potvrdil_vecnou_spravnost_titul_za),
      label: 'Zkontrolována',
      // Fallback: VĚCNÁ SPRÁVNOST z faktury (ne z přidání faktury!)
      fallbackDate: (() => {
        // Najdi fakturu s potvrzenou věcnou správností
        if (order.faktury && order.faktury.length > 0) {
          const fakturaVS = order.faktury.find(f => f.dt_potvrzeni_vecne_spravnosti);
          return fakturaVS ? fakturaVS.dt_potvrzeni_vecne_spravnosti : null;
        }
        return null;
      })(),
      fallbackUser: (() => {
        // Najdi fakturu s potvrzenou věcnou správností
        if (order.faktury && order.faktury.length > 0) {
          const fakturaVS = order.faktury.find(f => f.dt_potvrzeni_vecne_spravnosti);
          if (fakturaVS && (fakturaVS.potvrdil_vecnou_spravnost_jmeno || fakturaVS.potvrdil_vecnou_spravnost_prijmeni)) {
            return formatUserName(fakturaVS.potvrdil_vecnou_spravnost_jmeno, fakturaVS.potvrdil_vecnou_spravnost_prijmeni, fakturaVS.potvrdil_vecnou_spravnost_titul_pred, fakturaVS.potvrdil_vecnou_spravnost_titul_za);
          }
        }
        return null;
      })(),
      fallbackAction: 'Potvrdil věcnou správnost'
    },
    DOKONCENA: {
      date: order.dt_dokonceni,
      user: formatUserName(order.dokoncil_jmeno, order.dokoncil_prijmeni, order.dokoncil_titul_pred, order.dokoncil_titul_za),
      label: 'Dokončena'
    },
    ZAMITNUTA: {
      date: order.dt_schvaleni,
      user: formatUserName(order.schvalovatel_jmeno, order.schvalovatel_prijmeni, order.schvalovatel_titul_pred, order.schvalovatel_titul_za),
      label: 'Zamítnuta',
      extra: order.schvaleni_komentar || null
    },
    CEKA_SE: {
      date: order.dt_schvaleni,
      user: formatUserName(order.schvalovatel_jmeno, order.schvalovatel_prijmeni, order.schvalovatel_titul_pred, order.schvalovatel_titul_za),
      label: 'Čeká se (odložena)',
      extra: order.schvaleni_komentar || null
    },
    ZRUSENA: {
      date: order.dt_aktualizace,
      user: formatUserName(order.aktualizoval_jmeno, order.aktualizoval_prijmeni, order.aktualizoval_titul_pred, order.aktualizoval_titul_za),
      label: 'Zrušena (stornována)',
      extra: order.odeslani_storno_duvod || null
    }
  };
  
  let info = statusInfo[statusCode];
  
  // ✅ FALLBACK NA PŘEDCHOZÍ STAV: pokud současný stav nemá ani datum ani uživatele, použij fallback
  if (info && !info.date && (!info.user || info.user === '---') && (info.fallbackDate || info.fallbackUser)) {
    info = {
      ...info,
      date: info.fallbackDate || info.date,
      user: info.fallbackUser || info.user,
      action: info.fallbackAction // Pro lepší popis akce
    };
  }
  
  // Pokud nemáme info pro tento stav VŮBEC, zobraz jen obecné info
  if (!info) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
        <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
          {displayStatus}
        </div>
        <div style={{ color: 'white', fontSize: '0.8rem', fontStyle: 'italic' }}>
          Aktuální stav objednávky
        </div>
      </div>
    );
  }
  
  // ✅ OPRAVENO: i když není datum, zobraz aspoň uživatele pokud existuje
  // Zobraz detail stavu s datem a/nebo uživatelem
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '280px' }}>
      <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
        {info.label}
      </div>
      
      {/* Datum */}
      {info.date && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Datum:</div>
          <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
            {formatSmartDate(info.date)}
          </div>
        </div>
      )}
      
      {/* Uživatel */}
      {info.user && info.user !== '---' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            {/* ✅ Použij custom akci pokud je dostupná (z fallbacku) */}
            {info.action ? `${info.action}:` :
             statusCode === 'POTVRZENA' ? 'Potvrdil:' : 
             statusCode === 'SCHVALENA' ? 'Schválil:' :
             statusCode === 'DOKONCENA' ? 'Dokončil:' :
             statusCode === 'UVEREJNENA' || statusCode === 'K_UVEREJNENI_DO_REGISTRU' ? 'Zveřejnil:' :
             statusCode === 'ODESLANA' || statusCode === 'ODESLANA_KE_SCHVALENI' ? 'Odeslal:' :
             statusCode === 'FAKTURACE' ? 'Přidal fakturu:' :
             statusCode === 'VECNA_SPRAVNOST' || statusCode === 'ZKONTROLOVANA' ? 'Potvrdil věcnou správnost:' :
             statusCode === 'NOVA' ? 'Vytvořil:' :
             statusCode === 'ZAMITNUTA' ? 'Zamítl:' :
             statusCode === 'CEKA_SE' ? 'Odložil:' :
             statusCode === 'ZRUSENA' ? 'Stornoval:' :
             'Provedl:'}
          </div>
          <div style={{ color: 'white', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
            {info.user}
          </div>
        </div>
      )}
      
      {/* ✅ NOVÁ POZNÁMKA: Zobraz info že je to z předchozího stavu pokud byl použit fallback */}
      {info.action && (
        <div style={{ color: '#fbbf24', fontSize: '0.7rem', fontStyle: 'italic', marginTop: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #fbbf24' }}>
          ℹ️ Na základě předchozího kroku workflow
        </div>
      )}
      
      {/* ✅ EXTRA KOMENTÁŘ: důvod zamítnutí / odložení / zrušení */}
      {info.extra && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            {statusCode === 'ZRUSENA' ? 'Důvod zrušení:' : 'Komentář:'}
          </div>
          <div style={{
            color: '#fcd34d',
            fontSize: '0.8rem',
            paddingLeft: '0.5rem',
            paddingRight: '0.4rem',
            paddingTop: '0.3rem',
            paddingBottom: '0.3rem',
            fontStyle: 'italic',
            borderLeft: '2px solid #f59e0b',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '420px',
            maxHeight: '7em',
            overflowY: 'auto',
            lineHeight: '1.5',
            scrollbarWidth: 'thin',
            scrollbarColor: '#475569 #1e293b'
          }}>
            {info.extra}
          </div>
        </div>
      )}
      
      {/* Pokud nemáme ani datum ani uživatele, zobraz aspoň info že je to aktuální stav */}
      {!info.date && (!info.user || info.user === '---') && (
        <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
          Aktuální stav objednávky (bez dalších detailů)
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const TableWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const TableContainer = styled.div`
  width: 100%;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;

  /* Optimalizace pro širokoúhlé monitory */
  @media (min-width: 1920px) {
    font-size: 0.95rem;
  }

  @media (min-width: 2560px) {
    font-size: 1rem;
  }
  /* Skrýt normální scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
`;

const FixedScrollbarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 2px solid #cbd5e1;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 1000;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.15);

  /* Vlastní scrollbar design */
  &::-webkit-scrollbar {
    height: 14px;
  }

  &::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 0;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 0;
    border: 2px solid #e2e8f0;
    
    &:hover {
      background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
    }
    
    &:active {
      background: #1e40af;
    }
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #3b82f6 #e2e8f0;
`;

const FixedScrollbarContent = styled.div`
  height: 1px;
  pointer-events: none;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  table-layout: auto; /* Dynamická šířka sloupců */
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
`;

const TableHead = styled.thead`
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  /* Sticky nefunguje kvůli Layout overflow structure - vypnuto */
`;

const TableHeaderCell = styled.th`
  padding: 0.5rem 0.35rem;
  text-align: ${props => props.$align || 'left'};
  font-weight: 600;
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s ease;
  position: relative;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  width: ${props => props.$width || 'auto'};
  max-width: ${props => props.$width || 'none'};
  min-width: ${props => props.$width || 'auto'};

  &:hover {
    background-color: ${props => props.$sortable ? '#e2e8f0' : 'transparent'};
    
    .column-actions {
      opacity: 1;
    }
  }

  /* Drag & Drop styling */
  &[data-dragging="true"] {
    opacity: 0.5;
    background-color: #dbeafe;
  }

  &[data-drag-over="true"] {
    border-left: 3px solid #3b82f6;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    right: -8px;
    top: 0;
    height: 100%;
    width: 16px;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    background: transparent;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &::before {
      content: '';
      width: 3px;
      height: 60%;
      background: transparent;
      border-radius: 2px;
      transition: background 0.15s ease;
    }
    
    &:hover::before {
      background: #3b82f6;
    }
    
    &:active::before {
      background: #2563eb;
      width: 4px;
    }
  }

  /* Šířky sloupců */
  width: ${props => {
    if (props.$width) return props.$width;
    return 'auto';
  }};
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  align-items: ${props => {
    if (props.$align === 'center') return 'center';
    if (props.$align === 'right') return 'flex-end';
    return 'flex-start';
  }};
`;

const HeaderRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: ${props => {
    if (props.$align === 'center') return 'center';
    if (props.$align === 'right') return 'flex-end';
    return 'flex-start';
  }};
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
`;

const HeaderTextWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const HeaderText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
`;

const SortIndexBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: ${props => props.$asc ? '#3b82f6' : '#ef4444'};
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 9px;
  margin-left: 4px;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  margin-top: 4px;

  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 16px;
  height: 16px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 10px !important;
    height: 10px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.35rem 1.75rem 0.35rem 1.75rem;
  border: 1px solid ${props => props.$active ? '#f59e0b' : '#d1d5db'};
  border-radius: 4px;
  font-size: 0.7rem;
  background: ${props => props.$active ? '#fffbeb' : '#f9fafb'};
  box-shadow: ${props => props.$active ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none'};
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.15s ease;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-size: 0.7rem;
  }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  padding: 0.35rem 1.75rem 0.35rem 1.75rem;
  border: 1px solid ${props => props.$active ? '#f59e0b' : '#d1d5db'};
  border-radius: 4px;
  font-size: 0.7rem;
  background: ${props => props.$active ? '#fffbeb' : '#f9fafb'};
  box-shadow: ${props => props.$active ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none'};
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.15s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-size: 0.7rem;
  }
  
  option {
    padding: 0.5rem;
  }
`;

const TableToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  gap: 1rem;
`;

const ToolbarInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #1e293b;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 0.875rem;
  }
`;

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #3b82f6;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  margin-left: 4px;
`;

const ColumnActions = styled.div`
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: linear-gradient(90deg, transparent 0%, rgba(248, 250, 252, 0.85) 25%, rgba(248, 250, 252, 0.95) 100%);
  padding-left: 1.5rem;
  pointer-events: none;
  z-index: 10;
  
  /* Povolit klikání na tlačítka když jsou viditelné */
  button {
    pointer-events: auto;
  }
`;

const ColumnActionButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 0.85rem;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  &.hide-column:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  &.drag-handle {
    cursor: grab;
    
    &:active {
      cursor: grabbing;
    }
  }
`;

const TableBody = styled.tbody`
  /* Základní styling */
  tr {
    transition: background-color 0.15s ease;
  }

  tr:hover {
    filter: brightness(0.95);
  }
  
  /* Podřádek styling */
  tr.subrow {
    background-color: #fef3c7 !important;
    
    td {
      padding: 0;
    }
  }
`;

const TableCell = styled.td`
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: ${props => props.$align || 'left'};
  vertical-align: middle;
  color: #1e293b;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    const colors = {
      NOVA: 'rgba(219, 234, 254, 0.4)',
      KE_SCHVALENI: 'rgba(254, 226, 226, 0.4)',
      SCHVALENA: 'rgba(254, 215, 170, 0.4)',
      ZAMITNUTA: 'rgba(229, 231, 235, 0.4)',
      ROZPRACOVANA: 'rgba(254, 243, 199, 0.4)',
      ODESLANA: 'rgba(224, 231, 255, 0.4)',
      POTVRZENA: 'rgba(221, 214, 254, 0.4)',
      K_UVEREJNENI_DO_REGISTRU: 'rgba(204, 251, 241, 0.6)',
      UVEREJNENA: 'rgba(209, 250, 229, 0.4)',
      DOKONCENA: 'rgba(209, 250, 229, 0.4)',
      ZKONTROLOVANA: 'rgba(226, 232, 240, 0.6)',
      ZRUSENA: 'rgba(254, 202, 202, 0.4)',
      CANCELLED: 'rgba(254, 202, 202, 0.4)',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || 'rgba(241, 245, 249, 0.4)';
  }};
  color: ${props => {
    const colors = {
      NOVA: '#1e40af',
      KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0f766e',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZKONTROLOVANA: '#64748b',
      ZRUSENA: '#dc2626',
      CANCELLED: '#dc2626',
      EMPTY: '#64748b',
    };
    return colors[props.$status] || '#64748b';
  }};
  border: 1.5px solid ${props => {
    const colors = {
      NOVA: '#1e40af',
      KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0f766e',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZKONTROLOVANA: '#94a3b8',
      ZRUSENA: '#dc2626',
      CANCELLED: '#dc2626',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#94a3b8';
  }};
`;

const ActionMenu = styled.div`
  display: flex;
  gap: 0.10rem;
  justify-content: center;
  align-items: center;
`;

const ActionMenuButton = styled.button`
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    color: #475569;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.edit:hover:not(:disabled) {
    background: #dbeafe;
    color: #1e40af;
  }

  &.create-invoice:hover:not(:disabled) {
    background: #d1fae5;
    color: #065f46;
  }

  &.export-document:hover:not(:disabled) {
    background: #fef3c7;
    color: #92400e;
  }

  &.delete:hover:not(:disabled) {
    background: #fee2e2;
    color: #dc2626;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 1rem;
`;

const EmptyStateRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.3;
  }
  
  .empty-message {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .empty-hint {
    font-size: 0.9rem;
    color: #9ca3af;
  }
`;

const ErrorRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #ef4444;
    opacity: 0.8;
  }
  
  .error-message {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #dc2626;
  }
  
  .error-detail {
    font-size: 0.9rem;
    color: #64748b;
    margin-top: 0.5rem;
    background: #fef2f2;
    padding: 0.75rem;
    border-radius: 6px;
    display: inline-block;
    max-width: 600px;
    word-break: break-word;
  }
`;


const LoadingRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 1rem;
  }
  
  .loading-spinner {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// ============================================================================
// APPROVAL DIALOG STYLED COMPONENTS
// ============================================================================

const ApprovalDialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ApprovalDialog = styled.div`
  background: white;
  border-radius: 12px;
  max-width: ${props => props.$narrow ? '90vw' : '980px'};
  width: ${props => props.$narrow ? '520px' : '90%'};
  max-height: calc(85vh + 1em);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ApprovalDialogHeader = styled.div`
  background: ${props => props.$danger
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #10b981, #059669)'};
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: ${props => props.$danger ? '2px solid #b91c1c' : '2px solid #047857'};
`;

const ApprovalDialogIcon = styled.div`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 8px rgba(4, 120, 87, 0.5));
`;

const ApprovalDialogTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex: 1;
`;

const ApprovalDialogContent = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  padding-bottom: 0;
`;

const ApprovalTwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding-bottom: 1.25rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalLeftColumn = styled.div`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const ApprovalRightColumn = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 8px;
    margin: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #10b981, #059669);
    border-radius: 8px;
    border: 2px solid #f1f5f9;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #059669, #047857);
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #10b981 #f1f5f9;
`;

const ApprovalCompactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const ApprovalCompactItem = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ApprovalCompactLabel = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 600;
`;

const ApprovalCompactValue = styled.div`
  font-size: 0.875rem;
  color: #0f172a;
  line-height: 1.4;
  word-break: break-word;
`;

const ApprovalSection = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  
  &:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const ApprovalSectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
`;

const ApprovalDialogTopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  grid-column: 1 / -1;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalDialogSection = styled.div`
  margin-bottom: ${props => props.$fullWidth ? '1rem' : '0'};
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ApprovalDialogLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ApprovalDialogValue = styled.div`
  font-size: 0.9375rem;
  color: #0f172a;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  line-height: 1.4;
`;

const ApprovalDialogNote = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-style: italic;
  margin-top: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: #f1f5f9;
  border-left: 3px solid #cbd5e1;
  border-radius: 4px;
`;

const ApprovalDialogTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
  background: ${props => props.$hasError ? '#fef2f2' : 'white'};

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#10b981'};
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const ApprovalDialogError = styled.div`
  color: #ef4444;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:before {
    content: '⚠️';
    font-size: 0.875rem;
  }
`;

const ApprovalDialogActions = styled.div`
  display: flex;
  gap: 0.625rem;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
  flex-shrink: 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
`;

const ApprovalDialogButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => {
    if (props.$approve) {
      return `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else if (props.$reject) {
      return `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else if (props.$postpone) {
      return `
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else {
      return `
        background: #f1f5f9;
        color: #475569;
        
        &:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
      `;
    }
  }}
  
  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
    pointer-events: none;
  }
`;

const ApprovalBudgetWarning = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-size: 0.825rem;
  font-weight: 700;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  line-height: 1.3;
`;

const ApprovalLPItem = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const VProcesuDrawer = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(980px, 90vw);
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(99,102,241,0.08);
  border-radius: 0 0 12px 12px;
  border-top: 2px solid #6366f1;
  z-index: 20001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: vProcesuSlideDown 0.2s cubic-bezier(0.16,1,0.3,1);
  @keyframes vProcesuSlideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;

const ApprovalLPHeader = styled.div`
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
`;

const ApprovalLPRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  
  strong {
    color: #0f172a;
    font-size: 0.875rem;
  }
  
  ${props => props.$highlight && `
    background: #f8fafc;
    padding: 0.5rem;
    margin: 0.25rem -0.5rem;
    border-radius: 4px;
  `}
`;

// ============================================================================
// JEZEVČÍK PROGRESS BAR - pro Roční plán čerpání v Approval dialogu
// ============================================================================

const ApprJezWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 0.5rem;
`;

const ApprJezHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 4px;
  padding: 0 2px;
`;

const ApprJezPercentValue = styled.span`
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${props => props.$color || '#1e293b'};
`;

const ApprJezPercentLabel = styled.span`
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-left: 4px;
`;

const ApprJezTargetLabel = styled.span`
  display: block;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
`;

const ApprJezTargetValue = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  color: #64748b;
`;

const ApprJezBarOuter = styled.div`
  position: relative;
  height: 22px;
  width: 100%;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.5);
`;

const ApprJezBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 10;
  transition: width 0.5s ease;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$percent || 0, 100)}%;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ApprJezBarPlanned = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 5;
  opacity: 0.45;
  background-color: ${props => props.$color || '#86efac'};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.3) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.3) 50%,
    rgba(255,255,255,0.3) 75%,
    transparent 75%,
    transparent
  );
  background-size: 8px 8px;
  left: ${props => props.$left || 0}%;
  width: ${props => {
    const maxW = 100 - (props.$left || 0);
    return Math.min(props.$percent || 0, maxW);
  }}%;
`;

const ApprJezTargetLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(100, 116, 139, 0.55);
  z-index: 30;
  left: ${props => props.$percent || 0}%;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
`;

const ApprJezLegend = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3px;
  padding: 0 2px;
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Získá zobrazovací stav objednávky - PŘÍMO z DB sloupce stav_objednavky (už je to český popis)
 * @param {Object} order - Objednávka z backendu
 * @returns {string} - Český název stavu (např. "Dokončená", "Uveřejněna v registru smluv")
 */
const getOrderDisplayStatus = (order) => {
  // Backend vrací sloupec 'stav_objednavky' který JUŽ OBSAHUJE ČESKÝ POPIS
  // např. "Dokončená", "Odeslaná dodavateli", "Uveřejněna v registru smluv"
  return order.stav_objednavky || '---';
};

/**
 * Mapuje čitelný stav na systémový kód pro barvy a ikony
 */
const mapUserStatusToSystemCode = (userStatus) => {
  // Kontrola na začátek textu pro různé varianty
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
    if (userStatus.startsWith('Zkontrolovan')) return 'ZKONTROLOVANA';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Ke zveřejnění': 'K_UVEREJNENI_DO_REGISTRU',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Fakturace': 'FAKTURACE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Zkontrolovaná': 'ZKONTROLOVANA',
    'Zkontrolována': 'ZKONTROLOVANA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA',
  };
  return mapping[userStatus] || 'DEFAULT';
};

/**
 * Formátuje financování podle OrderV2 logiky
 * Vrací název typu financování (zkrácený)
 */
const getFinancovaniText = (order) => {
  // Backend vrací financovani jako objekt (už parsované)
  if (order.financovani && typeof order.financovani === 'object' && !Array.isArray(order.financovani)) {
    const fullText = order.financovani.typ_nazev || order.financovani.typ || '---';
    
    // Zkrátit víceoslovné názvy: "Limitovaný příslib" -> "Limitovaný p."
    if (fullText !== '---') {
      const words = fullText.trim().split(/\s+/);
      if (words.length > 1) {
        // První slovo celé + první písmeno dalších slov s tečkou
        return words[0] + ' ' + words.slice(1).map(w => w.charAt(0) + '.').join(' ');
      }
    }
    
    return fullText;
  }
  return '---';
};

/**
 * Získá detail financování (LP kódy, číslo smlouvy, ID individuálního schválení, atd.)
 */
const getFinancovaniDetail = (order) => {
  // Backend vrací financovani jako objekt (už parsované)
  if (!order.financovani || typeof order.financovani !== 'object' || Array.isArray(order.financovani)) {
    return '';
  }
  
  const typ = order.financovani.typ || '';
  
  // LP - zobrazit jen LP kód (bez názvu/popisu)
  if (typ === 'LP') {
    // Priorita 1: lp_nazvy array s kompletními daty - zobrazit jen kód
    if (order.financovani.lp_nazvy && Array.isArray(order.financovani.lp_nazvy) && order.financovani.lp_nazvy.length > 0) {
      const lpKody = order.financovani.lp_nazvy
        .map(lp => lp.cislo_lp || lp.kod || '')
        .filter(Boolean);
      
      if (lpKody.length > 0) {
        return lpKody.join(', ');
      }
    }
    // Fallback: lp_kody array (jen kódy bez názvů)
    else if (order.financovani.lp_kody && Array.isArray(order.financovani.lp_kody) && order.financovani.lp_kody.length > 0) {
      return order.financovani.lp_kody.join(', ');
    }
  }
  // Smlouva - zobrazit číslo smlouvy
  else if (typ === 'SMLOUVA') {
    return order.financovani.cislo_smlouvy || '';
  }
  // Pojistná událost - zobrazit číslo pojistné události
  else if (typ === 'POJISTNA_UDALOST') {
    return order.financovani.pojistna_udalost_cislo || order.financovani.poznamka || '';
  }
  // Individuální schválení - zobrazit ID individuálního schválení
  else if (typ === 'INDIVIDUALNI_SCHVALENI') {
    return order.financovani.individualni_schvaleni || '';
  }
  
  return '';
};

/**
 * Získá systémový status kód - DB sloupec 1:1
 */
const getOrderSystemStatus = (order) => {
  // Backend vrací stav_workflow_kod jako array (už parsované): ["NOVA", "KE_SCHVALENI", ...]
  if (order.stav_workflow_kod) {
    // Pokud je to array, použít přímo
    if (Array.isArray(order.stav_workflow_kod) && order.stav_workflow_kod.length > 0) {
      // Vrátit poslední stav z pole
      return order.stav_workflow_kod[order.stav_workflow_kod.length - 1];
    }
    
    // Fallback pro starý formát (JSON string) - pro zpětnou kompatibilitu
    if (typeof order.stav_workflow_kod === 'string') {
      try {
        const stavy = JSON.parse(order.stav_workflow_kod);
        if (Array.isArray(stavy) && stavy.length > 0) {
          return stavy[stavy.length - 1];
        }
      } catch (err) {
        console.warn('Failed to parse stav_workflow_kod:', err);
      }
    }
  }

  return 'NOVA';
};

/**
 * Formátuje datum
 */
const formatDateOnly = (date) => {
  if (!date) return '---';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('cs-CZ');
};

/**
 * Získá celkovou cenu s DPH - DB sloupec 1:1
 */
const getOrderTotalPriceWithDPH = (order) => {
  // Backend vrací cena_s_dph přímo z DB
  if (order.cena_s_dph != null && order.cena_s_dph !== '') {
    const value = parseFloat(order.cena_s_dph);
    if (!isNaN(value)) return value;
  }
  
  return 0;
};

// ============================================================================
// MULTISELECT PRO STAV (separátní komponenta kvůli hooks)
// ============================================================================

// ✅ Dropdown menu (portal) se custom scrollbarem
const StavDropdownMenu = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(100, 116, 139, 0.65) rgba(226, 232, 240, 0.85);

  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.85);
    border-radius: 999px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.65);
    border-radius: 999px;
    border: 2px solid rgba(226, 232, 240, 0.85);
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(71, 85, 105, 0.85);
  }
`;

const StavMultiSelect = ({ columnId, localColumnFilters, handleFilterChange, orderStatesList }) => {
  const [stavDropdownOpen, setStavDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });
  
  // Hodnota jako pole (synchronizace s filter panelem)
  const currentValue = Array.isArray(localColumnFilters[columnId]) 
    ? localColumnFilters[columnId] 
    : (localColumnFilters[columnId] ? [localColumnFilters[columnId]] : []);
  
  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const inMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!inTrigger && !inMenu) {
        setStavDropdownOpen(false);
      }
    };
    
    if (stavDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [stavDropdownOpen]);

  const updateMenuPosition = useCallback(() => {
    try {
      const el = dropdownRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      // Šířka: drž se header inputu, ale dej rozumné minimum/maximum
      const desiredWidth = Math.min(460, Math.max(320, Math.round(rect.width || 0)));
      let left = Math.round(rect.left || 0);
      const top = Math.round((rect.bottom || 0) + 2);

      const margin = 8;
      const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1200;
      if (left + desiredWidth > (vw - margin)) left = Math.max(margin, vw - desiredWidth - margin);
      if (left < margin) left = margin;

      setMenuPos({ top, left, width: desiredWidth });
    } catch {
      // ignore
    }
  }, []);

  // Při otevření: dopočítej pozici a udrž ji při scroll/resize (menu je v portálu)
  useEffect(() => {
    if (!stavDropdownOpen) return;
    updateMenuPosition();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [stavDropdownOpen, updateMenuPosition]);
  
  const handleToggleStav = useCallback((kod) => {
    const newValue = currentValue.includes(kod)
      ? currentValue.filter(v => v !== kod)
      : [...currentValue, kod];
    
    // ✅ Uložit jako POLE pro backend
    handleFilterChange(columnId, newValue.length > 0 ? newValue : '');
  }, [currentValue, columnId, handleFilterChange]);
  
  const displayText = currentValue.length === 0 
    ? 'Všechny stavy...' 
    : `Vybráno: ${currentValue.length}`;

  const isActive = currentValue.length > 0;
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginTop: '4px' }}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!stavDropdownOpen) {
            updateMenuPosition();
          }
          setStavDropdownOpen(!stavDropdownOpen);
        }}
        data-filter-active={isActive ? 'true' : 'false'}
        style={{
          width: '100%',
          padding: '0.35rem 1.5rem 0.35rem 0.5rem',
          border: isActive ? '1px solid #f59e0b' : '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '0.7rem',
          background: isActive ? '#fffbeb' : 'white',
          cursor: 'pointer',
          position: 'relative',
          color: currentValue.length > 0 ? '#1f2937' : '#9ca3af',
          fontWeight: isActive ? '600' : currentValue.length > 0 ? '500' : '400',
          boxShadow: isActive ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none',
          textTransform: 'none', // ✅ Normální velikost písmenek (ne uppercase)
        }}
      >
        {displayText}
        <svg
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '14px',
            height: '14px',
            pointerEvents: 'none'
          }}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {stavDropdownOpen && ReactDOM.createPortal(
        <StavDropdownMenu
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            minWidth: 280,
            marginTop: 0,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
            zIndex: 2147483647, // musí být NAD pagingem/overlay
            maxHeight: '300px',
            // scrollbars řeší StavDropdownMenu
          }}
        >
          {orderStatesList && orderStatesList.length > 0 && orderStatesList.map((status, idx) => {
            const kod = status.kod_stavu || status.kod || '';
            const nazev = status.label || status.displayName || status.nazev_stavu || status.nazev || 'Bez názvu';
            const isSelected = currentValue.includes(kod);

            return (
              <div
                key={status.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStav(kod);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  background: isSelected ? '#eff6ff' : 'white',
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'white';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isSelected ? '500' : '400',
                  color: isSelected ? '#2563eb' : '#1f2937',
                  textTransform: 'none'
                }}>
                  {nazev}
                </span>
              </div>
            );
          })}
        </StavDropdownMenu>,
        document.body
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrdersTableV3 - Základní tabulka s TanStack Table
 * 
 * @param {Array} data - Pole objednávek
 * @param {Array} columns - Konfigurace sloupců
 * @param {Object} sorting - Aktuální třídění
 * @param {Function} onSortingChange - Handler pro změnu třídění
 * @param {boolean} isLoading - Stav načítání
 * @param {Object} error - Error objekt pokud došlo k chybě
 */
const OrdersTableV3 = ({
  data = [],
  visibleColumns = [], // pole ID sloupců k zobrazení
  columnOrder = [], // pořadí sloupců
  columnFilters = {}, // ✅ External column filters from parent
  sorting = [],
  onSortingChange,
  onRowExpand,
  onActionClick,
  onColumnVisibilityChange,
  onColumnReorder,
  onColumnFiltersChange, // Callback pro změny filtrů
  orderStatesList = [], // ✅ Číselník stavů z API
  userId, // Přidáno pro localStorage per user
  userDetail, // 🆕 Detaily přihlášeného uživatele (pro kontrolu úseku)
  token, // 🆕 Pro API volání
  username, // 🆕 Pro API volání
  isLoading = false,
  error = null,
  canEdit = () => true,
  canCreateInvoice = () => true,
  canExportDocument = () => true,
  canDelete = () => false,
  canHardDelete = () => false,
  canGenerateFinancialControl = true, // 🔒 Kontrola oprávnění pro finanční kontrolu
  showApproveColumn = false,
  canApproveOrder = null,
  canCancelOrder = null,
  onRefreshOrders = null,
  isBudgetManagerRole = false, // 🆕 Je uživatel správce rozpočtu?
  isAdmin = false, // 🆕 Je uživatel admin (SUPERADMIN/ADMINISTRATOR)?
  hasPermission = null, // 🆕 Callback pro kontrolu oprávnění
  hasAccountingRole = false, // 🆕 Je uživatel v účetní roli (UCETNI/HLAVNI_UCETNI/VEREJNE_ZAKAZKY)?
  showRowColoring = false, // Podbarvení řádků podle stavu
  getRowBackgroundColor = null, // Funkce pro získání barvy pozadí
  highlightOrderId = null, // 🎯 ID objednávky k zvýraznění po návratu z editace
  highlightAction = null, // 🎨 Akce pro určení barvy (approve/reject/postpone)
  onHighlightOrder = null, // 🎯 Callback pro zvýraznění objednávky po schválení
  showToast = null, // 🎯 Toast notifikace
  clearCache = null, // ✅ Vyčistí cache po update operacích
  // 🆕 Kontrola a komentáře
  onToggleOrderCheck = null,
  onLoadComments = null,
  onAddComment = null,
  onDeleteComment = null,
  onTableContextMenu = null, // 🆕 Handler pro kontextové menu
}) => {
  // Hook pro expandované řádky s lazy loading a localStorage persistence
  const {
    expandedRows, // 🎯 Set of expanded row IDs
    isExpanded,
    toggleRow,
    getRowDetail,
    loadOrderDetail,
    loadingDetails,
    errors,
    refreshDetail
  } = useExpandedRowsV3({ token, username, userId });

  
  // State pro column filters (lokální - zobrazení v UI)
  const [localColumnFilters, setLocalColumnFilters] = useState(() => {
    // ✅ Při inicializaci mapuj backend formát na UI formát
    const mapped = { ...columnFilters };
    
    // Backend → UI mapování
    if (mapped.stav) {
      mapped.stav_objednavky = mapped.stav;
      delete mapped.stav;
    }
    if (mapped.datum_presne !== undefined) {
      mapped.dt_objednavky = mapped.datum_presne;
      delete mapped.datum_presne;
    }
    else if (mapped.datum_od) {
      // Pouze pokud není nastaveno datum_presne vůbec
      mapped.dt_objednavky = mapped.datum_od;
      delete mapped.datum_od;
    }
    if (mapped.objednatel_jmeno) {
      mapped.objednatel_garant = mapped.objednatel_jmeno;
      // Nemaž objednatel_jmeno, může být použito odděleně
    }
    if (mapped.prikazce_jmeno) {
      mapped.prikazce_schvalovatel = mapped.prikazce_jmeno;
      // Nemaž prikazce_jmeno, může být použito odděleně
    }
    
    return mapped;
  });
  
  // ✅ Synchronizace external columnFilters s local state s REVERSE mapováním
  useEffect(() => {
    const filterKeys = Object.keys(columnFilters);
    
    // 🐛 FIX: Zkontrolovat, jestli jsou VŠECHNY hodnoty prázdné (clear all)
    const allEmpty = filterKeys.length === 0 || filterKeys.every(key => {
      const value = columnFilters[key];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'boolean') return value === false;
      return value === '' || value === null || value === undefined;
    });
    
    if (allEmpty) {
      // Všechny filtry jsou prázdné → vymaž všechny lokální filtry
      setLocalColumnFilters({});
      return;
    }
    
    // Mapuj backend formát na UI formát (POUZE změněné hodnoty, ne celý objekt)
    const mappedFilters = {};
    
    // Procházej pouze existující filtry z backendu
    Object.keys(columnFilters).forEach(key => {
      const value = columnFilters[key];
      
      // Mapování backend → UI
      if (key === 'stav') {
        mappedFilters.stav_objednavky = value;
      } else if (key === 'datum_presne') {
        mappedFilters.dt_objednavky = value;
      } else if (key === 'datum_od' && !mappedFilters.dt_objednavky) {
        mappedFilters.dt_objednavky = value;
      } else {
        // Ostatní filtry (včetně numeric) - mapování 1:1
        mappedFilters[key] = value;
      }
    });
    
    // ⚠️ MIGRACE: Odstranit staré kombinované filtry
    if (mappedFilters.objednatel_jmeno !== undefined || mappedFilters.garant_jmeno !== undefined) {
      delete mappedFilters.objednatel_jmeno;
      delete mappedFilters.garant_jmeno;
    }
    if (mappedFilters.prikazce_jmeno !== undefined || mappedFilters.schvalovatel_jmeno !== undefined) {
      delete mappedFilters.prikazce_jmeno;
      delete mappedFilters.schvalovatel_jmeno;
    }
    
    // Merge s aktuálním stavem místo přepsání
    setLocalColumnFilters(prev => {
      const merged = { ...prev, ...mappedFilters };
      
      // Odstraň prázdné hodnoty z backend (když backend vrátí prázdný filtr)
      Object.keys(columnFilters).forEach(key => {
        const uiKey = key === 'stav' ? 'stav_objednavky' : 
                      key === 'datum_presne' ? 'dt_objednavky' : 
                      key === 'datum_od' ? 'dt_objednavky' : key;
        
        if (columnFilters[key] === '' || columnFilters[key] === null || columnFilters[key] === undefined) {
          delete merged[uiKey];
        }
      });
      
      return merged;
    });
  }, [columnFilters]);
  
  // Ref pro debounce timery
  const filterTimers = useRef({});
  
  // Refs pro fixed scrollbar synchronizaci
  const tableContainerRef = useRef(null);
  const fixedScrollbarRef = useRef(null);
  const [showFixedScrollbar, setShowFixedScrollbar] = useState(false);

  const handleTableMouseDownCapture = useCallback((e) => {
    if (e.button === 2) {
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
      }
    }
  }, []);
  
  // State pro drag & drop
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // State pro hromadné rozbalování
  const [isBulkExpanding, setIsBulkExpanding] = useState(false);
  
  // State pro schvalovací dialog
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalCommentError, setApprovalCommentError] = useState('');

  // State pro rozbalovací panel "V procesu" v approval dialogu
  // klíč: `lp_${lp_id}` nebo `smlouva_${cislo_smlouvy}`, hodnota: { loading, data, error }
  const [vProcesuPanels, setVProcesuPanels] = useState({});
  // Aktivní popup klíč pro zobrazení jako fixed overlay mimo dialog
  const [activeVProcesuKey, setActiveVProcesuKey] = useState(null);
  const [activeVProcesuTitle, setActiveVProcesuTitle] = useState('');
  const [vProcesuAnchorY, setVProcesuAnchorY] = useState(0);
  const [vProcesuBottomLimit, setVProcesuBottomLimit] = useState(null);
  // Drawer otevřený NAHORU (pro boxy na konci panelu)
  const [vProcesuOpenUpward, setVProcesuOpenUpward] = useState(false);
  const approvalActionsRef = useRef(null);

  // 🔴 Detekce přečerpání rozpočtu LP/Smluv schvalované objednávky
  const isBudgetExceeded = useMemo(() => {
    if (!orderToApprove) return false;
    const maxCena = parseFloat(orderToApprove.max_cena_s_dph) || 0;
    const lpKody = orderToApprove.financovani?.lp_kody || [];
    const lpInfo = orderToApprove._enriched?.lp_info || [];
    const lpPodil = maxCena / (lpKody.length || 1);
    for (const lp of lpInfo) {
      if (!lpKody.includes(lp.id)) continue;
      const hodnotaLP = parseFloat(lp.total_limit) || 0;
      if (hodnotaLP <= 0) continue;
      const cerpanoSkutecne = parseFloat(lp.cerpano_skutecne) || 0;
      const cerpanoPredpoklad = parseFloat(lp.cerpano_predpoklad) || 0;
      const cerpanoRezervovano = parseFloat(lp.rezervovano) || 0;
      const plannedFull = cerpanoPredpoklad + cerpanoRezervovano;
      if ((hodnotaLP - cerpanoSkutecne - plannedFull - lpPodil) < 0) return true;
    }
    const smlouvaInfo = orderToApprove._enriched?.smlouva_info;
    if (smlouvaInfo?.hodnota) {
      const hodnotaSmlouvy = parseFloat(smlouvaInfo.hodnota) || 0;
      // Smlouvy s hodnotou ≤ 10 Kč jsou bez stropové ceny – nesmí blokovat schválení
      if (hodnotaSmlouvy > 10) {
        const cerpanoPozadovano = parseFloat(
          smlouvaInfo.cerpano_v_procesu != null ? smlouvaInfo.cerpano_v_procesu : smlouvaInfo.cerpano_pozadovano
        ) || 0;
        if ((cerpanoPozadovano + maxCena) > hodnotaSmlouvy) return true;
      }
    }
    return false;
  }, [orderToApprove]);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');

  // 🔒 State pro LOCK dialog (pro schvalování)
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null);

  const handleCloseLockedOrderDialog = useCallback(() => {
    setShowLockedOrderDialog(false);
    setLockedOrderInfo(null);
  }, []);

  // 🔒 Lock-check před otevřením schvalovacího dialogu
  const ensureOrderNotLockedForApproval = useCallback(async (orderId) => {
    if (!token || !username || !orderId) return false;

    try {
      // V3 detail endpoint nemusí vracet lock_info → použij V2 endpoint, který lock_info vrací
      const dbOrder = await getOrderV2(orderId, token, username, true, 0);
      const lockInfo = dbOrder?.lock_info;

      // BE sémantika: locked=true pouze když drží JINÝ uživatel
      if (lockInfo?.locked === true && !lockInfo?.is_owned_by_me && !lockInfo?.is_expired) {
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockAgeMinutes: lockInfo.lock_age_minutes ?? null,
          lockedAt: lockInfo.locked_at || null,
          orderId
        });
        setShowLockedOrderDialog(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [OrdersTableV3] Chyba při kontrole zamčení pro schvalování:', error);
      if (showToast) {
        showToast('Chyba při kontrole zamčení objednávky – zkuste to prosím znovu.', { type: 'error' });
      }
      return false;
    }
  }, [token, username, showToast]);

  // ============================================================================
  // PROGRAMMATIC OPEN: Approval dialog (e.g. context menu)
  // ============================================================================

  const openApprovalDialogForOrderId = useCallback(async (orderId) => {
    if (!token || !username || !orderId) {
      if (showToast) {
        showToast('Chybí přihlašovací údaje nebo ID objednávky – obnovte stránku a zkuste to znovu.', { type: 'error' });
      }
      return;
    }

    try {
      const okToOpen = await ensureOrderNotLockedForApproval(orderId);
      if (!okToOpen) return;

      const orderDetail = await getOrderDetailV3({ token, username, orderId });
      setOrderToApprove(orderDetail);
      setApprovalComment(orderDetail?.schvaleni_komentar || '');
      setApprovalCommentError('');
      setShowApprovalDialog(true);
    } catch (error) {
      console.error('Chyba při načítání detailu objednávky:', error);
      if (showToast) {
        showToast(`Chyba při načítání detailu: ${error?.message || 'Neznámá chyba'}`, { type: 'error' });
      }
    }
  }, [token, username, showToast, ensureOrderNotLockedForApproval]);

  useEffect(() => {
    const handler = (event) => {
      const orderId = event?.detail?.orderId;
      if (!orderId) return;
      openApprovalDialogForOrderId(orderId);
    };

    window.addEventListener('ordersV3:openApprovalDialog', handler);
    return () => window.removeEventListener('ordersV3:openApprovalDialog', handler);
  }, [openApprovalDialogForOrderId]);
  
  // 🆕 State pro komentáře tooltip
  const [commentsTooltip, setCommentsTooltip] = useState({
    isOpen: false,
    orderId: null,
    orderNumber: null,
    orderInfo: null,
    iconRef: null,
    comments: [],
    commentsCount: 0,
    lastComment: null,
    loading: false,
    error: null,
  });
  
  // 💥 State pro animaci badge po přidání komentáře
  const [justAddedCommentId, setJustAddedCommentId] = useState(null);
  const justAddedTimerRef = React.useRef(null);

  // ✅ Přepisy počtu komentářů (bez mutace dat - triggerne re-render)
  const [commentCountOverrides, setCommentCountOverrides] = useState({});
  
  // ✅ State pro reset sloupce confirm dialog
  const [resetColumnsConfirm, setResetColumnsConfirm] = useState(false);

  
  // State pro resizing - načíst z localStorage (per user)
  const [columnSizing, setColumnSizing] = useState(() => {
    if (userId) {
      try {
        // Vymazat staré verze při prvním načtení
        localStorage.removeItem(`ordersV3_columnSizing_v2_${userId}`);
        localStorage.removeItem(`ordersV3_columnSizing_v3_${userId}`);
        
        const saved = localStorage.getItem(`ordersV3_columnSizing_v4_${userId}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  
  // Uložit column sizing do localStorage při změně (per user)
  useEffect(() => {
    if (userId && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`ordersV3_columnSizing_v4_${userId}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, userId]);
  
  // Debounced filter change - posílá změny do parent komponenty po 1000ms
  const handleFilterChange = useCallback((columnId, value) => {
    // ✅ Mapování UI column názvů na backend parametry
    const columnToBackendMapping = {
      'stav_objednavky': 'stav',
      'dt_objednavky': 'datum_presne', // Datum z column filtru
    };
    
    const backendColumnId = columnToBackendMapping[columnId] || columnId;
    
    // Update lokální state okamžitě (pro UI s UI názvy)
    setLocalColumnFilters(prev => ({
      ...prev,
      [columnId]: value  // UI column název
    }));
    
    // Debounce pro volání API (400ms pro rychlejší response)
    if (filterTimers.current[columnId]) {
      clearTimeout(filterTimers.current[columnId]);
    }
    
    filterTimers.current[columnId] = setTimeout(() => {
      // ✅ Volání parent callback pro API update - použij BACKEND column ID
      if (onColumnFiltersChange) {
        onColumnFiltersChange(backendColumnId, value, 0);
      }
    }, 400); // Sníženo z 1000ms na 400ms pro rychlejší response
  }, [onColumnFiltersChange]);
  
  // Cleanup timers při unmount
  useEffect(() => {
    return () => {
      Object.values(filterTimers.current).forEach(clearTimeout);
    };
  }, []);
  
  // Synchronizace fixed scrollbar s hlavní tabulkou
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const fixedScrollbar = fixedScrollbarRef.current;
    
    if (!tableContainer || !fixedScrollbar) return;
    
    // Zjistit, zda je potřeba scrollbar (obsah je širší než container)
    const checkScrollbarNeeded = () => {
      const isNeeded = tableContainer.scrollWidth > tableContainer.clientWidth;
      setShowFixedScrollbar(isNeeded);
      
      // Nastavit šířku obsahu fixed scrollbaru na šířku tabulky
      if (isNeeded) {
        const fixedContent = fixedScrollbar.querySelector('div');
        if (fixedContent) {
          fixedContent.style.width = `${tableContainer.scrollWidth}px`;
        }
      }
    };
    
    // Synchronizace scroll pozice: hlavní tabulka -> fixed scrollbar
    const syncFromTable = () => {
      if (fixedScrollbar && tableContainer) {
        fixedScrollbar.scrollLeft = tableContainer.scrollLeft;
      }
    };
    
    // Synchronizace scroll pozice: fixed scrollbar -> hlavní tabulka
    const syncFromScrollbar = () => {
      if (tableContainer && fixedScrollbar) {
        tableContainer.scrollLeft = fixedScrollbar.scrollLeft;
      }
    };
    
    // Observer pro změny velikosti (resize, nová data)
    const resizeObserver = new ResizeObserver(() => {
      checkScrollbarNeeded();
    });
    
    resizeObserver.observe(tableContainer);
    
    // Event listeners
    tableContainer.addEventListener('scroll', syncFromTable);
    fixedScrollbar.addEventListener('scroll', syncFromScrollbar);
    
    // Počáteční kontrola při načtení
    checkScrollbarNeeded();
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
      tableContainer.removeEventListener('scroll', syncFromTable);
      fixedScrollbar.removeEventListener('scroll', syncFromScrollbar);
    };
  }, [data]); // Re-run když se změní data
  
  // Handler pro toggle expandování
  // Handler pro rozbalení řádku s lazy loading
  const handleRowExpand = useCallback(async (orderId) => {
    toggleRow(orderId);
    
    // Pokud se řádek rozbaluje (ne sbaluje), načíst data
    if (!isExpanded(orderId)) {
      await loadOrderDetail(orderId);
    }
    
    onRowExpand?.(orderId);
  }, [toggleRow, isExpanded, loadOrderDetail, onRowExpand]);
  
  // Handler pro skrytí sloupce
  const handleHideColumn = useCallback((columnId) => {
    onColumnVisibilityChange?.(columnId, false);
  }, [onColumnVisibilityChange]);
  
  // Drag & Drop handlers
  const handleDragStart = useCallback((columnId) => {
    setDraggedColumn(columnId);
    document.body.style.cursor = 'grabbing';
  }, []);
  
  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);
  
  const handleDrop = useCallback((e, targetColumnId) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      // Předat oba parametry (from, to) do callback
      onColumnReorder?.(draggedColumn, targetColumnId);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
    document.body.style.cursor = '';
  }, [draggedColumn, onColumnReorder]);
  
  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    document.body.style.cursor = '';
  }, []);
  
  // 🆕 Handler pro otevření toolttipu s komentáři
  const handleOpenCommentsTooltip = useCallback(async (order, iconRef) => {
    if (commentsTooltip.isOpen && commentsTooltip.orderId === order.id) {
      // Zavřít pokud už je otevřený pro stejnou objednávku
      setCommentsTooltip({
        isOpen: false,
        orderId: null,
        orderNumber: null,
        orderInfo: null,
        iconRef: null,
        comments: [],
        commentsCount: 0,
        loading: false,
        error: null,
      });
      return;
    }
    
    // Sestavit orderInfo
    const objednatelName = order.objednatel_prijmeni && order.objednatel_jmeno
      ? `${order.objednatel_prijmeni} ${order.objednatel_jmeno}`
      : (order.objednatel_prijmeni || order.objednatel_jmeno || order.objednatel || null);
    const orderInfo = {
      objednatel: objednatelName,
      castka: order.max_cena_s_dph != null ? parseFloat(order.max_cena_s_dph) : (order.castka != null ? parseFloat(order.castka) : null),
    };
    
    // Otevřít tooltip
    setCommentsTooltip({
      isOpen: true,
      orderId: order.id,
      orderNumber: order.cislo_objednavky || `#${order.id}`,
      orderInfo,
      iconRef,
      comments: [],
      commentsCount: order.comments_count || 0,
      loading: true,
      error: null,
    });
    
    // Načíst komentáře
    if (onLoadComments) {
      try {
        const result = await onLoadComments(order.id);
        
        // ✅ Backend vrací buď result.data nebo result.comments (podle middleware transformace)
        const commentsArray = result.data || result.comments || [];
        
        // ✅ Najít poslední komentář (nejvyšší ID nebo nejnovější datum)
        const lastComment = commentsArray.length > 0 
          ? commentsArray.reduce((latest, c) => 
              (!latest || new Date(c.dt_vytvoreni) > new Date(latest.dt_vytvoreni)) ? c : latest
            , null)
          : null;
        
        setCommentsTooltip(prev => ({
          ...prev,
          comments: commentsArray,
          commentsCount: result.comments_count || 0,
          lastComment: lastComment,
          loading: false,
        }));
        
        // ✅ Aktualizovat last_comment info i v tabulce (pro bubble tooltip)
        const orderInTable = data.find(o => o.id === order.id);
        if (orderInTable && result.last_comment_author && result.last_comment_date) {
          orderInTable.last_comment_author = result.last_comment_author;
          orderInTable.last_comment_date = result.last_comment_date;
        }
      } catch (err) {
        console.error('❌ Chyba při načítání komentářů:', err);
        setCommentsTooltip(prev => ({
          ...prev,
          loading: false,
          error: 'Chyba při načítání komentářů',
        }));
        if (showToast) {
          showToast(err.message || 'Chyba při načítání komentářů', 'error');
        }
      }
    }
  }, [commentsTooltip, onLoadComments, data, showToast]);
  
  // 🆕 Handler pro přidání komentáře (s podporou parent_comment_id pro odpovědi)
  const handleAddCommentInternal = useCallback(async (text, parentCommentId = null) => {
    if (!commentsTooltip.orderId || !onAddComment) return;
    
    try {
      const result = await onAddComment(commentsTooltip.orderId, text, parentCommentId);
      
      // ✅ API vrací: {comment, comments_count}
      const newCount = result?.comments_count;
      
      // ✅ Aktualizovat count v commentsTooltip + ikonu v tabulce (přes state - triggerne re-render)
      if (newCount !== undefined) {
        setCommentsTooltip(prev => ({ ...prev, commentsCount: newCount }));
        setCommentCountOverrides(prev => ({ ...prev, [commentsTooltip.orderId]: newCount }));
      }

      // 💥 Animace badge - zvýraznit ikonu komentáře v tabulce
      if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
      setJustAddedCommentId(commentsTooltip.orderId);
      justAddedTimerRef.current = setTimeout(() => setJustAddedCommentId(null), 2500);

      // ✅ Toast notifikace
      if (showToast) {
        showToast(parentCommentId ? 'Odpověď byla přidána' : 'Komentář byl přidán', 'success');
      }
      
    } catch (err) {
      console.error('Chyba při přidávání komentáře:', err);
      if (showToast) {
        showToast(err.message || 'Chyba při přidávání komentáře', 'error');
      }
      throw err;
    }
  }, [commentsTooltip.orderId, onAddComment, onLoadComments, clearCache, data, showToast]);
  
  // 🆕 Handler pro smazání komentáře
  const handleDeleteCommentInternal = useCallback(async (commentId) => {
    if (!onDeleteComment) return;
    
    try {
      const result = await onDeleteComment(commentId);
      const newCount = result.comments_count;
      
      // ✅ Odstranit komentář ze seznamu v tooltipu + aktualizovat ikonu v tabulce
      const updatedCount = newCount !== undefined ? newCount : Math.max(0, commentsTooltip.commentsCount - 1);
      setCommentsTooltip(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
        commentsCount: updatedCount,
      }));
      setCommentCountOverrides(prev => ({ ...prev, [commentsTooltip.orderId]: updatedCount }));
      
      // ✅ Toast notifikace
      if (showToast) {
        showToast('Komentář byl smazán', 'success');
      }
      
    } catch (err) {
      console.error('Chyba při mazání komentáře:', err);
      if (showToast) {
        showToast(err.message || 'Chyba při mazání komentáře', 'error');
      }
      throw err;
    }
  }, [onDeleteComment, clearCache, commentsTooltip.orderId, data, showToast]);
  
  // Handler pro zpracování schválení objednávky
  const handleApprovalAction = useCallback(async (action) => {
    if (!orderToApprove) return;

    // ⚠️ VALIDACE: Pro Odložit a Zamítnout je poznámka POVINNÁ
    if ((action === 'reject' || action === 'postpone') && !approvalComment.trim()) {
      setApprovalCommentError('Poznámka je povinná pro zamítnutí nebo odložení');
      return;
    }

    // 🔒 VALIDACE ÚSEKU: Kontrola zda může uživatel schvalovat objednávku
    const isPrikazce = String(orderToApprove.prikazce_id) === String(userId);
    // Použij již existující isAdmin prop
    
    if (!isPrikazce && !isAdmin) {
      // Uživatel není přímo příkazce ani admin - zkontroluj úsek
      const myUsekId = userDetail?.usek_id || userDetail?.usek;
      const prikazceUsekId = orderToApprove?.prikazce_usek_id || orderToApprove?.prikazce?.usek_id;
      
      if (!myUsekId || !prikazceUsekId || String(myUsekId) !== String(prikazceUsekId)) {
        setApprovalCommentError('❌ Nemáte oprávnění schvalovat tuto objednávku. Příkazce je z jiného úseku.');
        if (showToast) {
          showToast('Nemáte oprávnění schvalovat objednávky z jiného úseku', { type: 'error' });
        }
        return;
      }
    }

    // Vymaž validaci pokud je vše OK
    setApprovalCommentError('');

    try {
      // Načti současný workflow stav
      let workflowStates = [];
      try {
        if (Array.isArray(orderToApprove.stav_workflow_kod)) {
          workflowStates = [...orderToApprove.stav_workflow_kod];
        } else if (typeof orderToApprove.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(orderToApprove.stav_workflow_kod);
        }
      } catch (e) {
        workflowStates = [];
      }

      // Připrav nový workflow stav podle akce
      let newWorkflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'SCHVALENA'].includes(s)
      );

      let orderUpdate = {
        schvaleni_komentar: approvalComment || '', // ✅ Ukládá se vždy - i prázdný pro schválení
        mimoradna_udalost: orderToApprove.mimoradna_udalost // ✅ ZACHOVAT status Mimořádná událost
      };

      switch (action) {
        case 'approve':
          // Schválit - přidej SCHVALENA
          newWorkflowStates.push('SCHVALENA');
          orderUpdate.stav_objednavky = 'Schválená';
          orderUpdate.schvalovatel_id = userId;
          break;

        case 'reject':
          // Zamítnout - přidej ZAMITNUTA
          newWorkflowStates.push('ZAMITNUTA');
          orderUpdate.stav_objednavky = 'Zamítnutá';
          orderUpdate.schvalovatel_id = userId;
          break;

        case 'postpone':
          // Odložit - přidej CEKA_SE (také zaznamenat kdo a kdy)
          newWorkflowStates.push('CEKA_SE');
          orderUpdate.stav_objednavky = 'Čeká se';
          orderUpdate.schvalovatel_id = userId;
          break;

        default:
          return;
      }

      orderUpdate.stav_workflow_kod = JSON.stringify(newWorkflowStates);

      // Zavři dialog
      setShowApprovalDialog(false);
      setOrderToApprove(null);
      setApprovalComment('');
      setApprovalCommentError('');
      setVProcesuPanels({});
      setActiveVProcesuKey(null);
      setVProcesuAnchorY(0);
      setVProcesuOpenUpward(false);

      // ✅ Zobraz úspěšnou zprávu s detaily
      const actionMessages = {
        approve: `✅ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla úspěšně schválena\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}`,
        reject: `❌ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla zamítnuta\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}`,
        postpone: `⏸️ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla odložena\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}`
      };
      if (showToast) {
        showToast(actionMessages[action], { type: 'success' });
      }

      // 🎯 Zvýrazni objednávku (předej ID parent komponentě)
      if (onHighlightOrder) {
        onHighlightOrder(orderToApprove.id, action); // 🎨 Předej i akci pro barvu
      }

      // � API CALL na pozadí pro update V3 - ČEKÁME NA DOKONČENÍ!
      updateOrderV3({ token, username, payload: { id: orderToApprove.id, ...orderUpdate } })
        .then(() => {
          // ✅ Po úspěšném API callu:
          // 0. VYČISTI CACHE (DŮLEŽITÉ!)
          if (clearCache) {
            clearCache();
          }
          // 1. Refreshni celý seznam
          if (onActionClick) {
            onActionClick('refresh');
          }
          // 2. Refreshni expanded detail pokud je otevřený (MUSÍ BÝT AŽ PO UPDATE!)
          if (isExpanded(orderToApprove.id)) {
            refreshDetail(orderToApprove.id);
          }
        })
        .catch(apiError => {
          console.error('API update failed:', apiError);
          if (showToast) {
            showToast('Změna byla zobrazena, ale mohlo dojít k chybě na serveru. Obnovte stránku.', { type: 'warning' });
          }
          // I při chybě vyčisti cache a refreshni seznam pro jistotu
          if (clearCache) {
            clearCache();
          }
          if (onActionClick) {
            onActionClick('refresh');
          }
        });

      // 🔔 TRIGGER NOTIFICATION na pozadí
      try {
        const eventTypeMap = {
          approve: 'ORDER_APPROVED',
          reject: 'ORDER_REJECTED', 
          postpone: 'ORDER_PENDING_APPROVAL'
        };
        
        const eventType = eventTypeMap[action];
        if (eventType) {
          const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
          fetch(`${baseURL}notifications/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              username,
              event_type: eventType,
              object_id: orderToApprove.id,
              trigger_user_id: userId,
              debug: false
            })
          }).catch(err => console.error('Notification error:', err));
        }
      } catch (notifError) {
        console.error('❌ Failed to trigger notification:', notifError);
      }
      
    } catch (error) {
      console.error('Chyba při schvalování objednávky:', error);
      setApprovalCommentError('Chyba při ukládání schválení. Zkuste to znovu.');
    }
  }, [orderToApprove, approvalComment, token, username, userId, onActionClick, showToast, onHighlightOrder]);

  const handleCancelOrder = useCallback(async () => {
    if (!orderToCancel) return;

    if (!cancelReason.trim()) {
      setCancelReasonError('Důvod storna je povinný');
      return;
    }

    setCancelReasonError('');

    let workflowStates = parseWorkflowStates(orderToCancel.stav_workflow_kod);
    workflowStates = workflowStates.filter(state => {
      const code = typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)
        ? String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim()
        : String(state || '').toUpperCase().trim();
      return ![
        'ROZPRACOVANA',
        'POTVRZENA',
        'UVEREJNIT',
        'NEUVEREJNIT',
        'UVEREJNENA',
        'FAKTURACE',
        'VECNA_SPRAVNOST',
        'ZKONTROLOVANA',
        'DOKONCENA',
        'K_DOKONCENI',
        'ZRUSENA'
      ].includes(code);
    });

    workflowStates.push('ZRUSENA');

    const orderUpdate = {
      id: orderToCancel.id,
      stav_workflow_kod: JSON.stringify(workflowStates),
      stav_objednavky: 'Zrušena',
      odeslani_storno_duvod: cancelReason.trim(),
      odesilatel_id: orderToCancel.odesilatel_id || userId,
      dt_odeslani: orderToCancel.dt_odeslani || getMySQLDate(),
      mimoradna_udalost: orderToCancel.mimoradna_udalost
    };

    setShowCancelDialog(false);
    setOrderToCancel(null);
    setCancelReason('');

    if (showToast) {
      showToast(`🛑 Objednávka ${orderToCancel.ev_cislo || orderToCancel.cislo_objednavky} byla stornována`, { type: 'success' });
    }

    if (onHighlightOrder) {
      onHighlightOrder(orderToCancel.id, 'cancel');
    }

    updateOrderV3({ token, username, payload: orderUpdate })
      .then(() => {
        if (clearCache) {
          clearCache();
        }
        if (onActionClick) {
          onActionClick('refresh');
        }
        if (isExpanded(orderToCancel.id)) {
          refreshDetail(orderToCancel.id);
        }
      })
      .catch((apiError) => {
        console.error('API update failed:', apiError);
        if (showToast) {
          showToast('Storno bylo zobrazeno, ale mohlo dojít k chybě na serveru. Obnovte stránku.', { type: 'warning' });
        }
        if (clearCache) {
          clearCache();
        }
        if (onActionClick) {
          onActionClick('refresh');
        }
      });

    try {
      const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
      fetch(`${baseURL}notifications/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          event_type: 'ORDER_CANCELLED',
          object_id: orderToCancel.id,
          trigger_user_id: userId,
          debug: false
        })
      }).catch(err => console.error('Notification error:', err));
    } catch (notifError) {
      console.error('❌ Failed to trigger notification:', notifError);
    }
  }, [orderToCancel, cancelReason, token, username, userId, onActionClick, onHighlightOrder, showToast, clearCache, isExpanded, refreshDetail]);
  
  // Handler pro globální expand/collapse všech řádků na stránce
  // MUSÍ být před useMemo pro columns, protože se v něm používá
  const handleToggleAllRows = useCallback(async () => {
    // table.getRowModel() není dostupný zde, takže použijeme data prop
    const anyExpanded = data.some(order => isExpanded(order.id));
    
    if (anyExpanded) {
      // Collapse all - okamžitě bez animace
      data.forEach(order => {
        if (isExpanded(order.id)) {
          toggleRow(order.id);
        }
      });
    } else {
      // Expand all - postupně s animací
      setIsBulkExpanding(true);
      
      const ordersToExpand = data.filter(order => !isExpanded(order.id));
      
      for (let i = 0; i < ordersToExpand.length; i++) {
        const order = ordersToExpand[i];
        await handleRowExpand(order.id);
        
        // Malá pauza pro plynulé rozbalování
        if (i < ordersToExpand.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
      
      setIsBulkExpanding(false);
    }
  }, [data, isExpanded, handleRowExpand, toggleRow]);
  
  // Definice sloupců přesně jako v původním Orders25List.js
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: 'expander',
        header: ({ table }) => {
          const rows = table.getRowModel().rows;
          const anyExpanded = rows.some(row => isExpanded(row.original.id));
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
              {onRefreshOrders && (
                <SmartTooltip text="Načíst objednávky z databáze" icon="info" preferredPosition="top">
                  <ExpandButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshOrders();
                    }}
                    title="Obnovit objednávky"
                    disabled={isLoading}
                    style={{
                      padding: '0.2rem 0.3rem',
                      fontSize: '0.75rem',
                      color: '#2563eb',
                      borderColor: '#93c5fd'
                    }}
                  >
                    <FontAwesomeIcon icon={faSync} spin={isLoading} style={{ fontSize: '0.75rem', color: '#2563eb' }} />
                  </ExpandButton>
                </SmartTooltip>
              )}
              <ExpandButton
                onClick={handleToggleAllRows}
                title={anyExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
                disabled={isBulkExpanding}
              >
                <FontAwesomeIcon 
                  icon={isBulkExpanding ? faCircleNotch : (anyExpanded ? faMinus : faPlus)} 
                  spin={isBulkExpanding}
                />
              </ExpandButton>
            </div>
          );
        },
        cell: ({ row }) => {
          const order = row.original;
          const expanded = isExpanded(order.id);
          
          return (
            <ExpandButton
              onClick={() => handleRowExpand(order.id)}
              title={expanded ? 'Sbalit' : 'Rozbalit'}
            >
              <FontAwesomeIcon icon={expanded ? faMinus : faPlus} />
            </ExpandButton>
          );
        },
        size: 50,
        enableSorting: false,
      },
      ...(showApproveColumn ? [{
        id: 'approve',
        enableSorting: false,
        header: () => (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%',
            height: '100%',
            padding: '0.25rem 0'
          }}>
            <SmartTooltip text="Schválení / storno" icon="info" preferredPosition="top">
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '0.95rem', opacity: 0.8 }} />
              </span>
            </SmartTooltip>
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;

          const canApproveThisOrder = canApproveOrder ? canApproveOrder(order) : true;
          const canCancelThisOrder = canCancelOrder ? canCancelOrder(order) : true;

          const workflowStates = parseWorkflowStates(order.stav_workflow_kod);
          const lastState = getLastWorkflowState(order.stav_workflow_kod);

          // ✅ Zjištění, zda je aktuální uživatel oprávněn schvalovat
          const isPrikazce = String(order.prikazce_id) === String(userId);
          const canUserApprove = isPrikazce || isBudgetManagerRole || isAdmin;

          // 🎯 Zjištění, zda je uživatel v privilegované roli (admin, příkazce, správce rozpočtu, účetní role)
          const isPrivilegedUser = isAdmin || isPrikazce || isBudgetManagerRole || hasAccountingRole;

          const allowedApproveStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'SCHVALENA', 'ZAMITNUTA'];
          
          // 📋 ROZŠÍŘENÝ seznam stavů pro storno (pro privilegované uživatele)
          const allowedCancelStatesExtended = [
            'ROZPRACOVANA',
            'ODESLANA',
            'POTVRZENA',
            'K_UVEREJNENI_DO_REGISTRU',
            'UVEREJNENA',
            'FAKTURACE',
            'VECNA_SPRAVNOST',
            'ZKONTROLOVANA',
            'NEUVEREJNIT',
            'ODESLANA_KE_SCHVALENI'
          ];
          
          // 📋 OMEZENÝ seznam stavů pro storno (pro běžné uživatele)
          const allowedCancelStatesBasic = [
            'ROZPRACOVANA',
            'ODESLANA',
            'POTVRZENA',
            'FAKTURACE',
            'ODESLANA_KE_SCHVALENI'
          ];
          
          // ✅ Vyber správnou sadu stavů podle role uživatele
          const allowedCancelStates = isPrivilegedUser 
            ? allowedCancelStatesExtended 
            : allowedCancelStatesBasic;

          const isAllowedApproveState = allowedApproveStates.includes(lastState);
          const isAllowedCancelState = allowedCancelStates.includes(lastState);
          
          // 🎯 KLÍČOVÁ LOGIKA: Pro ODESLANA_KE_SCHVALENI a SCHVALENA:
          // - Příkazce/správce/admin → zobrazit SCHVÁLENÍ (mohou zamítnout místo storna)
          // - Ostatní uživatelé → zobrazit STORNO
          const shouldShowApprovalForUser = isAllowedApproveState && canUserApprove;
          const shouldShowCancelForUser = isAllowedCancelState && !shouldShowApprovalForUser;

          // Pokud uživatel nemá právo na schválení ani na storno, nezobrazovat nic
          if (!shouldShowApprovalForUser && !shouldShowCancelForUser) return null;
          
          // Určení ikony podle stavu
          const pendingStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE'];
          const approvedStates = ['SCHVALENA', 'ZAMITNUTA'];
          const isPending = pendingStates.includes(lastState);
          const isApproved = approvedStates.includes(lastState);
          
          // Použití barev z STATUS_COLORS (jako v dashboardu) + křížek pro zamítnutou
          let icon, iconColor, hoverBgColor, hoverBorderColor, hoverIconColor;
          
          if (isPending) {
            // Ke schválení - červená + hodiny
            icon = faHourglassHalf;
            iconColor = '#dc2626'; // červená
            hoverBgColor = '#fecaca';
            hoverBorderColor = '#dc2626';
            hoverIconColor = '#991b1b';
          } else if (lastState === 'SCHVALENA') {
            // Schválená - oranžová + fajfka
            icon = faCheckCircle;
            iconColor = '#ea580c'; // oranžová
            hoverBgColor = '#fed7aa';
            hoverBorderColor = '#ea580c';
            hoverIconColor = '#c2410c';
          } else {
            // Zamítnutá - šedá + křížek
            icon = faTimesCircle;
            iconColor = '#6b7280'; // šedá
            hoverBgColor = '#e5e7eb';
            hoverBorderColor = '#6b7280';
            hoverIconColor = '#4b5563';
          }
          
          const approvalTooltipText = canApproveThisOrder
            ? (isPending ? 'Schválit objednávku (ke schválení)' : 'Zobrazit schválení (vyřízeno)')
            : 'Nemůžete schválit objednávku – je určena jinému příkazci.';

          const approvalTooltipIcon = canApproveThisOrder
            ? (isPending ? 'warning' : (lastState === 'SCHVALENA' ? 'success' : 'info'))
            : 'warning';

          const cancelTooltipText = canCancelThisOrder
            ? 'Stornovat objednávku'
            : 'Nemáte oprávnění ke stornu';

          const cancelTooltipIcon = canCancelThisOrder ? 'warning' : 'warning';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}>
              {shouldShowApprovalForUser && (
                <SmartTooltip 
                  text={approvalTooltipText} 
                  icon={approvalTooltipIcon} 
                  preferredPosition="top"
                >
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!canApproveThisOrder) {
                        return;
                      }
                      try {
                        const okToOpen = await ensureOrderNotLockedForApproval(order.id);
                        if (!okToOpen) return;

                        const orderDetail = await getOrderDetailV3({ token, username, orderId: order.id });
                        setOrderToApprove(orderDetail);
                        setApprovalComment(orderDetail.schvaleni_komentar || '');
                        setShowApprovalDialog(true);
                      } catch (error) {
                        console.error('Chyba při načítání detailu objednávky:', error);
                      }
                    }}
                    style={{
                      background: canApproveThisOrder ? 'transparent' : '#f3f4f6',
                      border: `1px solid ${canApproveThisOrder ? '#d1d5db' : '#e5e7eb'}`,
                      borderRadius: '4px',
                      color: canApproveThisOrder ? iconColor : '#9ca3af',
                      cursor: canApproveThisOrder ? 'pointer' : 'not-allowed',
                      padding: '0.35rem 0.5rem',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!canApproveThisOrder) return;
                      e.currentTarget.style.background = hoverBgColor;
                      e.currentTarget.style.borderColor = hoverBorderColor;
                      e.currentTarget.style.color = hoverIconColor;
                    }}
                    onMouseLeave={(e) => {
                      if (!canApproveThisOrder) return;
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.color = iconColor;
                    }}
                  >
                    <FontAwesomeIcon icon={icon} />
                  </button>
                </SmartTooltip>
              )}

              {shouldShowCancelForUser && (
                <SmartTooltip
                  text={cancelTooltipText}
                  icon={cancelTooltipIcon}
                  preferredPosition="top"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canCancelThisOrder) {
                        return;
                      }
                      setOrderToCancel(order);
                      setCancelReason(order.odeslani_storno_duvod || '');
                      setCancelReasonError('');
                      setShowCancelDialog(true);
                    }}
                    style={{
                      background: canCancelThisOrder ? 'transparent' : '#f3f4f6',
                      border: `1px solid ${canCancelThisOrder ? '#fecaca' : '#e5e7eb'}`,
                      borderRadius: '4px',
                      color: canCancelThisOrder ? '#dc2626' : '#9ca3af',
                      cursor: canCancelThisOrder ? 'pointer' : 'not-allowed',
                      padding: '0.35rem 0.5rem',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!canCancelThisOrder) return;
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#dc2626';
                      e.currentTarget.style.color = '#991b1b';
                    }}
                    onMouseLeave={(e) => {
                      if (!canCancelThisOrder) return;
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#fecaca';
                      e.currentTarget.style.color = '#dc2626';
                    }}
                  >
                    <FontAwesomeIcon icon={faBan} />
                  </button>
                </SmartTooltip>
              )}
            </div>
          );
        },
        size: 60,
        enableSorting: false,
        meta: {
          align: 'center',
          fixed: true,
        },
      }] : []),
      // 🆕 KONTROLA & KOMENTÁŘE - Dual ikony ve svislo rozděleném sloupci
      {
        id: 'kontrola_komentare',
        enableSorting: false,
        header: () => (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '0.5rem',
            fontSize: '1rem',
            color: '#475569',
            padding: '0.25rem'
          }}>
            <FontAwesomeIcon icon={faCheckSquare} title="Kontrola" />
            <FontAwesomeIcon icon={faComments} title="Komentáře" />
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;
          // ✅ Použití callback ref místo useRef hook
          let checkIconRef = null;
          let commentIconRef = null;
          
          // Parse kontrola metadata
          let isChecked = false;
          let checkedBy = null;
          let checkedDate = null;
          let checkedStavNazev = null;
          let zrusilJmeno = null;
          let zruseniDate = null;
          let stavPriZruseni = null;
          
          try {
            if (order.kontrola_metadata) {
              const metadata = typeof order.kontrola_metadata === 'string' 
                ? JSON.parse(order.kontrola_metadata) 
                : order.kontrola_metadata;
              isChecked = !!metadata.zkontrolovano;
              checkedBy = metadata.kontroloval_jmeno;
              checkedDate = metadata.dt_kontroly;
              checkedStavNazev = metadata.stav_workflow_nazev;
              zrusilJmeno = metadata.zrusil_jmeno;
              zruseniDate = metadata.dt_zruseni;
              stavPriZruseni = metadata.stav_workflow_nazev_pri_zruseni;
            }
          } catch (e) {
            // Ignore parse errors
          }
          
          // 🎨 Vypočítat stav kontroly (3 stavy):
          // 1. unchecked (false) - šedá faSquare
          // 2. ok (dt_kontroly >= dt_modifikace) - zelená faCheckSquare
          // 3. warning (dt_kontroly < dt_modifikace) - oranžová faCheckSquare
          let checkStatus = 'unchecked';
          let statusColor = canGenerateFinancialControl ? '#64748b' : '#cbd5e1';
          let statusBg = 'transparent';
          let statusBorder = canGenerateFinancialControl ? '#94a3b8' : '#e2e8f0';
          let hoverBg = '#eff6ff';
          let hoverBorder = '#3b82f6';
          let hoverColor = '#2563eb';
          let tooltipText = 'Klikněte pro označení jako zkontrolováno';
          let tooltipIcon = 'info';
          
          // Pokud byla kontrola zrušena, zobrazit info
          if (!isChecked && zruseniDate) {
            tooltipText = (
              <div style={{ fontSize: '13px', lineHeight: '1.6', background: 'rgba(0, 0, 0, 0.85)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ color: '#fca5a5', fontWeight: 600, marginBottom: '6px' }}>
                  ⛔ Kontrola zrušena
                </div>
                <div style={{ color: '#fdba74', marginBottom: '4px' }}>
                  <strong>Zrušil:</strong> {zrusilJmeno || 'Neznámý'}
                </div>
                <div style={{ color: '#fdba74', marginBottom: '4px' }}>
                  <strong>Kdy:</strong> {new Date(zruseniDate).toLocaleString('cs-CZ')}
                </div>
                {stavPriZruseni && (
                  <div style={{ color: '#fdba74', marginBottom: '8px' }}>
                    <strong>Stav při zrušení:</strong> {stavPriZruseni}
                  </div>
                )}
                {checkedDate && (
                  <div style={{ borderTop: '1px solid #475569', marginTop: '8px', paddingTop: '8px' }}>
                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '4px' }}>
                      Původně zkontroloval:
                    </div>
                    <div style={{ color: '#e2e8f0' }}>
                      {checkedBy || 'Neznámý'} ({new Date(checkedDate).toLocaleString('cs-CZ')})
                    </div>
                    {checkedStavNazev && (
                      <div style={{ color: '#e2e8f0' }}>
                        Stav při kontrole: {checkedStavNazev}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            tooltipIcon = 'info';
          }
          
          if (isChecked && checkedDate) {
            const kontrolaDt = new Date(checkedDate);
            const objednavkaDt = new Date(order.dt_modifikace || order.dt_vytvoreni);
            
            if (kontrolaDt >= objednavkaDt) {
              // ✅ Zelená - kontrola je aktuální
              checkStatus = 'ok';
              statusColor = '#10b981';
              hoverBg = '#d1fae5';
              hoverBorder = '#10b981';
              hoverColor = '#059669';
              tooltipText = (
                <div style={{ fontSize: '13px', lineHeight: '1.6', background: 'rgba(0, 0, 0, 0.85)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#86efac', fontWeight: 600, marginBottom: '6px' }}>
                    ✓ Zkontrolováno
                  </div>
                  <div style={{ color: '#d1fae5', marginBottom: '4px' }}>
                    <strong>Kontroloval:</strong> {checkedBy || 'Neznámý'}
                  </div>
                  <div style={{ color: '#d1fae5', marginBottom: '4px' }}>
                    <strong>Kdy:</strong> {new Date(checkedDate).toLocaleString('cs-CZ')}
                  </div>
                  {checkedStavNazev && (
                    <div style={{ color: '#d1fae5' }}>
                      <strong>Stav:</strong> {checkedStavNazev}
                    </div>
                  )}
                </div>
              );
              tooltipIcon = 'success';
            } else {
              // ⚠️ Oranžová - objednávka byla změněna po kontrole
              checkStatus = 'warning';
              statusColor = '#f59e0b';
              hoverBg = '#fef3c7';
              hoverBorder = '#f59e0b';
              hoverColor = '#d97706';
              tooltipText = (
                <div style={{ fontSize: '13px', lineHeight: '1.6', background: 'rgba(0, 0, 0, 0.85)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#fde047', fontWeight: 600, marginBottom: '6px' }}>
                    ⚠️ Změněno po kontrole
                  </div>
                  <div style={{ color: '#fcd34d', marginBottom: '4px' }}>
                    <strong>Kontroloval:</strong> {checkedBy || 'Neznámý'}
                  </div>
                  <div style={{ color: '#fcd34d', marginBottom: '4px' }}>
                    <strong>Kontrola:</strong> {new Date(checkedDate).toLocaleString('cs-CZ')}
                  </div>
                  <div style={{ color: '#fcd34d', marginBottom: '4px' }}>
                    <strong>Změna:</strong> {new Date(objednavkaDt).toLocaleString('cs-CZ')}
                  </div>
                  {checkedStavNazev && (
                    <div style={{ color: '#fcd34d' }}>
                      <strong>Stav při kontrole:</strong> {checkedStavNazev}
                    </div>
                  )}
                </div>
              );
              tooltipIcon = 'warning';
            }
          }
          
          // Počet komentářů
          const commentsCount = commentCountOverrides[order.id] ?? order.comments_count ?? 0;
          const badgeText = commentsCount > 9 ? '9+' : String(commentsCount);
          
          // Šedé pozadí pokud už bylo s kontrolou pracováno (pouze pro checkbox kontroly)
          const hasBeenChecked = !!(checkedDate); // Pokud existuje dt_kontroly, už bylo pracováno
          const checkboxBg = hasBeenChecked ? '#f1f5f9' : 'transparent';
          
          return (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.35rem',
              padding: '0.25rem 0'
            }}>
              {/* Checkbox ikona - horní polovina */}
              <div ref={(el) => { checkIconRef = el; }}>
                <SmartTooltip 
                  text={tooltipText}
                  icon={tooltipIcon}
                  preferredPosition="top"
                >
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      // 🔒 Kontrola permission - pokud nemá právo, nedělat nic
                      if (!canGenerateFinancialControl) {
                        if (showToast) {
                          showToast('❌ Nemáte oprávnění pro kontrolu objednávek', { type: 'error' });
                        }
                        return;
                      }
                      
                      if (onToggleOrderCheck) {
                        try {
                          const result = await onToggleOrderCheck(order.id, !isChecked);
                          if (clearCache) clearCache();
                          
                          // Zobrazit toast s metadaty
                          if (showToast && result && result.kontrola) {
                            const metadata = result.kontrola;
                            let toastMsg = '';
                            
                            if (metadata.zkontrolovano) {
                              toastMsg = `✅ Objednávka zkontrolována\n`;
                              toastMsg += `Kontroloval: ${metadata.kontroloval_jmeno}\n`;
                              toastMsg += `Čas: ${new Date(metadata.dt_kontroly).toLocaleString('cs-CZ')}\n`;
                              if (metadata.stav_workflow_nazev) {
                                toastMsg += `Stav: ${metadata.stav_workflow_nazev}`;
                              }
                            } else {
                              toastMsg = `⛔ Kontrola zrušena\n`;
                              toastMsg += `Zrušil: ${metadata.zrusil_jmeno}\n`;
                              toastMsg += `Čas: ${new Date(metadata.dt_zruseni).toLocaleString('cs-CZ')}\n`;
                              if (metadata.stav_workflow_nazev_pri_zruseni) {
                                toastMsg += `Stav při zrušení: ${metadata.stav_workflow_nazev_pri_zruseni}`;
                              }
                            }
                            
                            showToast(toastMsg, { type: 'success' });
                          }
                        } catch (err) {
                          console.error('Chyba při změně kontroly:', err);
                          if (showToast) {
                            showToast('❌ Chyba při změně kontroly', { type: 'error' });
                          }
                        }
                      }
                    }}
                    style={{
                      background: hasBeenChecked ? checkboxBg : statusBg,
                      border: `1px solid ${statusBorder}`,
                      borderRadius: '4px',
                      color: statusColor,
                      cursor: canGenerateFinancialControl ? 'pointer' : 'not-allowed',
                      opacity: canGenerateFinancialControl ? 1 : 0.5,
                      padding: '0.3rem 0.4rem',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      minWidth: '32px',
                      minHeight: '32px'
                    }}
                    onMouseEnter={(e) => {
                      if (canGenerateFinancialControl) {
                        e.currentTarget.style.background = hoverBg;
                        e.currentTarget.style.borderColor = hoverBorder;
                        e.currentTarget.style.color = hoverColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canGenerateFinancialControl) {
                        e.currentTarget.style.background = hasBeenChecked ? checkboxBg : statusBg;
                        e.currentTarget.style.borderColor = statusBorder;
                        e.currentTarget.style.color = statusColor;
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={checkStatus === 'unchecked' ? farSquare : faCheckSquare} />
                  </button>
                </SmartTooltip>
              </div>
              
              {/* Komentáře ikona - dolní polovina */}
              <div ref={(el) => { commentIconRef = el; }} style={{ position: 'relative' }}>
                <SmartTooltip 
                  text={commentsCount > 0 
                    ? (() => {
                        const lastComm = order.last_comment_author && order.last_comment_date
                          ? `\nPoslední: ${order.last_comment_author} (${new Date(order.last_comment_date).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})`
                          : '';
                        return `${commentsCount} komentář${commentsCount === 1 ? '' : (commentsCount < 5 ? 'e' : 'ů')}${lastComm}`;
                      })()
                    : 'Zatím žádné komentáře'
                  }
                  icon="info"
                  preferredPosition="top"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCommentsTooltip(order, { current: commentIconRef });
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid',
                      borderColor: commentsCount === 0 ? '#94a3b8' : (order.user_has_replied ? '#a855f7' : '#3b82f6'),
                      borderRadius: '4px',
                      color: commentsCount === 0 ? '#64748b' : (order.user_has_replied ? '#a855f7' : '#3b82f6'),
                      cursor: 'pointer',
                      padding: '0.3rem 0.4rem',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      minWidth: '32px',
                      minHeight: '32px'
                    }}
                    onMouseEnter={(e) => {
                      const hasReplied = order.user_has_replied;
                      e.currentTarget.style.background = commentsCount > 0 ? (hasReplied ? '#faf5ff' : '#eff6ff') : '#f1f5f9';
                      e.currentTarget.style.borderColor = commentsCount > 0 ? (hasReplied ? '#a855f7' : '#3b82f6') : '#475569';
                      e.currentTarget.style.color = commentsCount > 0 ? (hasReplied ? '#9333ea' : '#2563eb') : '#334155';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = commentsCount === 0 ? '#94a3b8' : (order.user_has_replied ? '#a855f7' : '#3b82f6');
                      e.currentTarget.style.color = commentsCount === 0 ? '#64748b' : (order.user_has_replied ? '#a855f7' : '#3b82f6');
                    }}
                  >
                    <FontAwesomeIcon icon={faComment} />
                    {commentsCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '0 4px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        minWidth: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {badgeText}
                      </span>
                    )}
                  </button>
                </SmartTooltip>
              </div>
            </div>
          );
        },
        size: 50,
        enableSorting: false,
        meta: {
          align: 'center',
          fixed: true,
        },
      },
      {
        accessorKey: 'dt_objednavky',
        id: 'dt_objednavky',
        header: 'Datum',
        cell: ({ row }) => {
          const order = row.original;
          const lastModified = order.dt_objednavky; // datum aktualizace
          const created = order.dt_vytvoreni || order.dt_objednavky;
          const workflowTooltip = formatWorkflowTooltip(order);
          
          return (
            <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
              {/* První řádek - datum aktualizace (bez tooltipu) */}
              <div style={{ fontWeight: 'bold' }}>{formatDateOnly(lastModified)}</div>
              
              {/* Druhý a třetí řádek - datum a čas vytvoření (s tooltipem) */}
              {workflowTooltip ? (
                <SmartTooltip text={workflowTooltip} preferredPosition="right" icon="none" interactive={true}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', cursor: 'help' }}>
                      {formatDateOnly(created)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', cursor: 'help' }}>
                      {created ? new Date(created).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </SmartTooltip>
              ) : (
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {formatDateOnly(created)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {created ? new Date(created).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              )}
            </div>
          );
        },
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'cislo_objednavky',
        id: 'cislo_objednavky',
        header: 'Evidenční číslo',
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div style={{ textAlign: 'left', whiteSpace: 'normal' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                {(order.mimoradna_udalost === 1 || order.mimoradna_udalost === '1') && (
                  <span style={{ color: '#dc2626', marginRight: '4px' }}>
                    <FontAwesomeIcon icon={faBoltLightning} />
                  </span>
                )}
                {order.cislo_objednavky || '---'}
                {order.id && (
                  <sup style={{ fontSize: '0.6rem', color: '#9ca3af', marginLeft: '2px' }}>
                    #{order.id}
                  </sup>
                )}
              </div>
              {order.predmet && (
                <SmartTooltip text={order.predmet} preferredPosition="right" multiline={true}>
                  <div style={{
                    fontSize: '1em',
                    fontWeight: 'normal',
                    color: '#1e293b',
                    marginTop: '4px',
                    paddingRight: '1em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.2',
                    cursor: 'help'
                  }}>
                    {order.predmet}
                  </div>
                </SmartTooltip>
              )}
            </div>
          );
        },
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'financovani',
        id: 'financovani',
        header: 'Financování',
        cell: ({ row }) => {
          const order = row.original;
          const financovaniText = getFinancovaniText(order); // Zkrácený název
          const detailText = getFinancovaniDetail(order);
          
          // Plný název pro title (tooltip)
          const fullName = order.financovani?.typ_nazev || order.financovani?.typ || '';
          
          return (
            <div 
              style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3' }}
              title={fullName || undefined}
            >
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>{financovaniText}</div>
              {detailText && (
                <div style={{ 
                  fontSize: '0.8em', 
                  color: '#6b7280', 
                  marginTop: '2px',
                  fontWeight: 500
                }}>
                  {detailText}
                </div>
              )}
            </div>
          );
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'objednatel_garant',
        id: 'objednatel_garant',
        header: 'Objednatel / Garant',
        cell: ({ row }) => {
          const order = row.original;
          // Příjmení Jméno (BEZ titulů)
          const objednatel = (order.objednatel_prijmeni && order.objednatel_jmeno)
            ? `${order.objednatel_prijmeni} ${order.objednatel_jmeno}`
            : (order.objednatel_prijmeni || order.objednatel_jmeno || '---');
          const garant = (order.garant_prijmeni && order.garant_jmeno)
            ? `${order.garant_prijmeni} ${order.garant_jmeno}`
            : (order.garant_prijmeni || order.garant_jmeno || '---');
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{objednatel}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{garant}</div>
            </div>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'prikazce_schvalovatel',
        id: 'prikazce_schvalovatel',
        header: 'Příkazce / Schvalovatel',
        cell: ({ row }) => {
          const order = row.original;
          // Příjmení Jméno (BEZ titulů)
          const prikazce = (order.prikazce_prijmeni && order.prikazce_jmeno)
            ? `${order.prikazce_prijmeni} ${order.prikazce_jmeno}`
            : (order.prikazce_prijmeni || order.prikazce_jmeno || '---');
          const schvalovatel = (order.schvalovatel_prijmeni && order.schvalovatel_jmeno)
            ? `${order.schvalovatel_prijmeni} ${order.schvalovatel_jmeno}`
            : (order.schvalovatel_prijmeni || order.schvalovatel_jmeno || '---');
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{prikazce}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{schvalovatel}</div>
            </div>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'dodavatel_nazev',
        id: 'dodavatel_nazev',
        header: 'Dodavatel',
        cell: ({ row }) => {
          const order = row.original;
          
          if (!order.dodavatel_nazev) {
            return <div style={{ color: '#9ca3af' }}>---</div>;
          }
          
          return (
            <div style={{ lineHeight: '1.4' }}>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '0.9em', 
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                maxWidth: '200px'
              }}>
                {order.dodavatel_nazev}
              </div>
              
              {order.dodavatel_adresa && (
                <div style={{ 
                  fontSize: '0.8em', 
                  color: '#4b5563',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px'
                }}>
                  {order.dodavatel_adresa}
                </div>
              )}
              
              {order.dodavatel_ico && (
                <div style={{ 
                  fontSize: '0.8em', 
                  color: '#6b7280',
                  fontWeight: 500
                }}>
                  IČO: {order.dodavatel_ico}
                </div>
              )}
              
              {(order.dodavatel_kontakt_jmeno || order.dodavatel_kontakt_email || order.dodavatel_kontakt_telefon) && (
                <div style={{
                  fontSize: '0.8em',
                  color: '#1f2937',
                  marginTop: '2px',
                  fontWeight: 500
                }}>
                  {order.dodavatel_kontakt_jmeno && (
                    <div>Kontakt: {order.dodavatel_kontakt_jmeno}</div>
                  )}
                  {order.dodavatel_kontakt_email && (
                    <div>{order.dodavatel_kontakt_email}</div>
                  )}
                  {order.dodavatel_kontakt_telefon && (
                    <div>{order.dodavatel_kontakt_telefon}</div>
                  )}
                </div>
              )}
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.dodavatel_nazev || '';
          const b = rowB.original.dodavatel_nazev || '';
          return a.localeCompare(b, 'cs');
        },
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_objednavky',
        id: 'stav_objednavky',
        header: 'Stav',
        cell: ({ row }) => {
          const order = row.original;
          const displayStatus = getOrderDisplayStatus(order); // Český popis PŘÍMO z DB
          const statusCode = mapUserStatusToSystemCode(displayStatus); // Převod na systémový kód pro ikonu
          
          // Mapování systémových kódů na ikony
          const iconMap = {
            NOVA: faFilePen,
            ODESLANA_KE_SCHVALENI: faClock,
            SCHVALENA: faShield,
            POTVRZENA: faCheckCircle,
            UVEREJNENA: faFileContract,
            DOKONCENA: faTruck,
            ZRUSENA: faXmark,
            ZAMITNUTA: faXmark,
            ODESLANA: faCheckCircle,
            FAKTURACE: faFileInvoice,
            VECNA_SPRAVNOST: faCheckCircle,
            ZKONTROLOVANA: faCheckCircle,
            CEKA_POTVRZENI: faClock,
            K_UVEREJNENI_DO_REGISTRU: faFileContract,
            CEKA_SE: faHourglassHalf,
          };
          
          // Vytvoř tooltip obsah
          const tooltipContent = formatWorkflowStateTooltip(order, displayStatus, statusCode);
          
          // Badge s ikonou
          const badge = (
            <StatusBadge $status={statusCode}>
              <FontAwesomeIcon icon={iconMap[statusCode] || faCircleNotch} style={{ fontSize: '12px' }} />
              <span>{displayStatus}</span>
            </StatusBadge>
          );
          
          // Pokud máme tooltip, obal badge do SmartTooltip
          if (tooltipContent) {
            return (
              <SmartTooltip text={tooltipContent} preferredPosition="right" icon="none" interactive={true}>
                {badge}
              </SmartTooltip>
            );
          }
          
          return badge;
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_registru',
        id: 'stav_registru',
        header: 'REGISTR',
        cell: ({ row }) => {
          const order = row.original;
          const registr = order.registr_smluv;
          
          let stavText = '';
          let statusCode = 'EMPTY';
          let icon = null;
          
          // Získání workflow stavu (podle OrderV2)
          let workflowStatus = null;
          if (order.stav_workflow_kod) {
            try {
              const parsed = Array.isArray(order.stav_workflow_kod) 
                ? order.stav_workflow_kod 
                : JSON.parse(order.stav_workflow_kod);
              
              if (Array.isArray(parsed) && parsed.length > 0) {
                workflowStatus = parsed[parsed.length - 1];
              } else {
                workflowStatus = parsed;
              }
            } catch (e) {
              workflowStatus = order.stav_workflow_kod;
            }
          }
          
          // Logika podle OrderV2:
          // 1. Pokud existuje dt_zverejneni A registr_iddt -> "Zveřejněno"
          // 2. Pokud workflow stav = 'UVEREJNIT' NEBO zverejnit === 'ANO' -> "Má být zveřejněno"
          // 3. Jinak -> prázdné
          
          if (registr) {
            // 1. Zveřejněno - má vyplněné oboje dt_zverejneni I registr_iddt
            if (registr.dt_zverejneni && registr.registr_iddt) {
              stavText = 'Zveřejněno';
              icon = faCheckCircle;
              statusCode = 'UVEREJNENA';
            }
            // 2. Má být zveřejněno - workflow = UVEREJNIT NEBO zverejnit === 'ANO'
            else if (workflowStatus === 'UVEREJNIT' || registr.zverejnit === 'ANO') {
              stavText = 'Má být zveřejněno';
              icon = faClock;
              statusCode = 'KE_SCHVALENI';
            }
          }
          // Kontrola i pokud registr neexistuje, ale workflow = UVEREJNIT
          else if (workflowStatus === 'UVEREJNIT') {
            stavText = 'Má být zveřejněno';
            icon = faClock;
            statusCode = 'KE_SCHVALENI';
          }
          
          // Pokud nemáme žádný stav, vrať ---
          if (!stavText) {
            return <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>---</div>;
          }
          
          // Vytvoř tooltip obsah
          const tooltipContent = formatRegistrTooltip(order, statusCode);
          
          // Badge s tooltipem (pokud existuje)
          const badge = (
            <StatusBadge $status={statusCode}>
              <FontAwesomeIcon icon={icon} style={{ fontSize: '12px' }} />
              <span>{stavText}</span>
            </StatusBadge>
          );
          
          // Pokud máme tooltip, obal badge do SmartTooltip
          if (tooltipContent) {
            return (
              <SmartTooltip text={tooltipContent} preferredPosition="right" icon="none" interactive={true}>
                {badge}
              </SmartTooltip>
            );
          }
          
          return badge;
        },
        sortingFn: (rowA, rowB) => {
          const getRegistrValue = (order) => {
            const registr = order.registr_smluv;
            let workflowStatus = null;
            
            if (order.stav_workflow_kod) {
              try {
                const parsed = Array.isArray(order.stav_workflow_kod) 
                  ? order.stav_workflow_kod 
                  : JSON.parse(order.stav_workflow_kod);
                workflowStatus = Array.isArray(parsed) && parsed.length > 0 
                  ? parsed[parsed.length - 1] 
                  : parsed;
              } catch (e) {
                workflowStatus = order.stav_workflow_kod;
              }
            }
            
            // Priority: 2 = Zveřejněno, 1 = Má být zveřejněno, 0 = prázdné
            if (registr?.dt_zverejneni && registr?.registr_iddt) return 2;
            if (workflowStatus === 'UVEREJNIT' || registr?.zverejnit === 'ANO') return 1;
            return 0;
          };
          
          const valueA = getRegistrValue(rowA.original);
          const valueB = getRegistrValue(rowB.original);
          return valueA - valueB;
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'max_cena_s_dph',
        id: 'max_cena_s_dph',
        header: 'MAX CENA DPH',
        cell: ({ row }) => {
          const maxPrice = parseFloat(row.original.max_cena_s_dph || 0);
          const fakturaPrice = parseFloat(row.original.faktury_celkova_castka_s_dph || 0);
          const isOverLimit = fakturaPrice > 0 && maxPrice > 0 && fakturaPrice > maxPrice;
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              color: isOverLimit ? '#dc2626' : 'inherit'
            }}>
              {!isNaN(maxPrice) && maxPrice > 0 
                ? `${maxPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'cena_s_dph',
        id: 'cena_s_dph',
        header: 'CENA DPH',
        cell: ({ row }) => {
          const price = getOrderTotalPriceWithDPH(row.original);
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {!isNaN(price) && price > 0 
                ? `${price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'faktury_celkova_castka_s_dph',
        id: 'faktury_celkova_castka_s_dph',
        header: 'FA CENA DPH',
        cell: ({ row }) => {
          const order = row.original;
          const price = parseFloat(order.faktury_celkova_castka_s_dph || 0);
          const maxPrice = parseFloat(order.max_cena_s_dph || 0);
          const isOverLimit = price > 0 && maxPrice > 0 && price > maxPrice;
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              color: '#059669'
            }}>
              {!isNaN(price) && price > 0 
                ? `${price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 150,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5em', position: 'relative' }}>
              {hasActiveSorting && (
                <SmartTooltip text="Zrušit třídění">
                  <div
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSortingChange([]);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = '#9ca3af';
                    }}
                  >
                    <FontAwesomeIcon 
                      icon={faSort} 
                      style={{ 
                        color: '#9ca3af',
                        fontSize: '16px',
                        transition: 'color 0.2s'
                      }}
                    />
                    <FontAwesomeIcon 
                      icon={faTimes} 
                      style={{ 
                        position: 'absolute',
                        top: '-2px',
                        right: '-8px',
                        color: '#dc2626',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                </SmartTooltip>
              )}
              <SmartTooltip text="Reset šířky sloupců">
                <div
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnSizing({});
                    if (userId) {
                      localStorage.removeItem(`ordersV3_columnSizing_v4_${userId}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#9ca3af';
                  }}
                >
                  <FontAwesomeIcon 
                    icon={faArrowsLeftRight} 
                    style={{ 
                      color: '#9ca3af',
                      fontSize: '16px',
                      transition: 'color 0.2s'
                    }}
                  />
                  <FontAwesomeIcon 
                    icon={faTimes} 
                    style={{ 
                      position: 'absolute',
                      top: '-2px',
                      right: '-8px',
                      color: '#dc2626',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </SmartTooltip>
              <SmartTooltip text="Reset zobrazených sloupců">
                <div
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (userId) {
                      setResetColumnsConfirm(true);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#9ca3af';
                  }}
                >
                  <FontAwesomeIcon 
                    icon={faEyeSlash} 
                    style={{ 
                      color: '#9ca3af',
                      fontSize: '16px',
                      transition: 'color 0.2s'
                    }}
                  />
                  <FontAwesomeIcon 
                    icon={faTimes} 
                    style={{ 
                      position: 'absolute',
                      top: '-2px',
                      right: '-8px',
                      color: '#dc2626',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </SmartTooltip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '18px' }} />
            </div>
          </div>
        ),
        meta: {
          align: 'center',
          cellStyle: {
            overflow: 'visible'
          },
          headerStyle: {
            overflow: 'visible'
          }
        },
        cell: ({ row }) => {
          const order = row.original;
          const showDelete = canDelete(order);
          const isHardDelete = canHardDelete(order);
          
          return (
            <ActionMenu>
              <ActionMenuButton
                className="edit"
                onClick={() => onActionClick?.('edit', order)}
                title="Editovat"
                disabled={!canEdit(order)}
              >
                <FontAwesomeIcon icon={faEdit} />
              </ActionMenuButton>
              
              <ActionMenuButton
                className="create-invoice"
                onClick={() => onActionClick?.('create-invoice', order)}
                title={
                  !canCreateInvoice(order)
                    ? 'Evidování faktury je dostupné pouze ve stavech: Fakturace, Věcná správnost, Zkontrolována (ne v Dokončená)'
                    : 'Evidovat fakturu k této objednávce'
                }
                disabled={!canCreateInvoice(order)}
              >
                <FontAwesomeIcon icon={faFileInvoice} />
              </ActionMenuButton>
              
              <ActionMenuButton
                className="export-document"
                onClick={() => onActionClick?.('export', order)}
                title="Generovat obj. formulář (DOCX)"
                disabled={!canExportDocument(order)}
              >
                <FontAwesomeIcon icon={faFileWord} />
              </ActionMenuButton>
              
              {showDelete && (
                <ActionMenuButton
                  className="delete"
                  onClick={() => onActionClick?.('delete', order)}
                  title={isHardDelete ? "Smazat objednávku (ADMIN: hard/soft delete)" : "Deaktivovat objednávku (soft delete)"}
                  disabled={false}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </ActionMenuButton>
              )}
            </ActionMenu>
          );
        },
        size: 140,
        enableSorting: false,
      },
    ];

    // Filtrovat pouze viditelné sloupce
    let filtered = allColumns;
    if (visibleColumns && visibleColumns.length > 0) {
      filtered = allColumns.filter(col => visibleColumns.includes(col.id));
    }
    
    // Seřadit podle columnOrder
    if (columnOrder && columnOrder.length > 0) {
      filtered = filtered.sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        
        // Pokud sloupec není v columnOrder, dát ho na konec
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
    }
    
    return filtered;
  }, [visibleColumns, columnOrder, handleRowExpand, handleToggleAllRows, onActionClick, canEdit, canCreateInvoice, canExportDocument, isExpanded, showApproveColumn, canApproveOrder, canCancelOrder, onRefreshOrders, isLoading]);

  // Filtrovat data podle columnFilters (lokální filtr v tabulce)
  // ⚠️ VYPNUTO - Filtrování se provádí na backendu v API
  // Data jsou již vyfiltrovaná, takže lokální filtr by je filtroval 2x
  const filteredData = useMemo(() => {
    // Vrátit data bez dalšího filtrování - backend už je vyfiltroval
    return data;
  }, [data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true, // Povolit 3-state sorting: asc -> desc -> none
    enableMultiSort: true, // Povolit multi-column sorting
    maxMultiSortColCount: 5, // Maximálně 5 sloupců pro třídění
    isMultiSortEvent: (e) => e.shiftKey, // Shift+click pro multi-sort
  });

  const activeFiltersCount = Object.values(localColumnFilters).filter(v => v).length;

  const isActiveColumnValue = (value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return false;
      if (/^[=<>]$/.test(trimmed)) return false;
      return true;
    }
    return Boolean(value);
  };
  const hasActiveSorting = sorting.length > 0;
  const hasData = data && data.length > 0;
  const colSpan = table.getAllColumns().length;

  return (
    <>
    {/* 🔒 Locked dialog pro schvalování (V3 quick approve) */}
    {lockedOrderInfo && (
      <ConfirmDialog
        isOpen={showLockedOrderDialog}
        onClose={handleCloseLockedOrderDialog}
        onConfirm={handleCloseLockedOrderDialog}
        title="Objednávka je zamčená"
        icon={faLock}
        variant="warning"
        confirmText="Zavřít"
        showCancel={false}
      >
        <p style={{ margin: '0.75rem 0', color: '#64748b', lineHeight: 1.6 }}>
          Nelze objednávku schválit, protože je aktuálně v editaci uživatelem:
        </p>
        <div
          style={{
            padding: '1rem',
            background: '#f8fafc',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '6px',
            margin: '0.75rem 0',
            fontWeight: 700
          }}
        >
          {lockedOrderInfo.lockedByUserName}
        </div>

        {(lockedOrderInfo.lockedByUserEmail || lockedOrderInfo.lockedByUserTelefon) && (
          <div
            style={{
              margin: '0.75rem 0',
              padding: '0.75rem',
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}
          >
            {lockedOrderInfo.lockedByUserEmail && (
              <div style={{ marginBottom: lockedOrderInfo.lockedByUserTelefon ? '0.5rem' : 0 }}>
                Email: <a href={`mailto:${lockedOrderInfo.lockedByUserEmail}`}>{lockedOrderInfo.lockedByUserEmail}</a>
              </div>
            )}
            {lockedOrderInfo.lockedByUserTelefon && (
              <div>
                Telefon: <a href={`tel:${lockedOrderInfo.lockedByUserTelefon}`}>{lockedOrderInfo.lockedByUserTelefon}</a>
              </div>
            )}
          </div>
        )}

        {lockedOrderInfo.lockAgeMinutes !== null && lockedOrderInfo.lockAgeMinutes !== undefined && (
          <div
            style={{
              margin: '0.75rem 0',
              padding: '0.75rem',
              background: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '6px',
              color: '#92400e',
              fontSize: '0.9rem'
            }}
          >
            Zamčeno před {lockedOrderInfo.lockAgeMinutes} min
          </div>
        )}

        <p style={{ margin: '0.75rem 0', color: '#64748b', lineHeight: 1.6 }}>
          Počkejte, až bude editace dokončena, nebo uživatele kontaktujte.
        </p>
      </ConfirmDialog>
    )}

    <TableWrapper>
    <TableContainer
      ref={tableContainerRef}
      data-orders-v3-table="true"
      onMouseDownCapture={handleTableMouseDownCapture}
    >
      <Table>
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const columnId = header.column.id;
                const canHide = columnId !== 'expander' && columnId !== 'actions' && columnId !== 'approve' && columnId !== 'kontrola_komentare';
                
                return (
                  <TableHeaderCell
                    key={header.id}
                    $align={header.column.columnDef.meta?.align || 'left'}
                    $sortable={header.column.getCanSort()}
                    $width={columnSizing[columnId] || (header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined)}
                    data-dragging={draggedColumn === columnId}
                    data-drag-over={dragOverColumn === columnId}
                    onDragOver={(e) => handleDragOver(e, columnId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, columnId)}
                    style={header.column.columnDef.meta?.headerStyle || {}}
                  >
                    <HeaderContent $align={header.column.columnDef.meta?.align || 'left'}>
                      {/* První řádek: název + sorting + akce */}
                      <HeaderRow $align={header.column.columnDef.meta?.align || 'left'}>
                        <HeaderTextWrapper
                          onClick={(e) => {
                            // Shift+click pro multi-column sorting
                            if (header.column.getCanSort()) {
                              const handler = header.column.getToggleSortingHandler();
                              if (handler) {
                                handler(e);
                              }
                            }
                          }}
                        >
                          <HeaderText>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (() => {
                              const sortDirection = header.column.getIsSorted();
                              const sortIndex = sorting.findIndex(s => s.id === columnId);
                              
                              if (sortDirection && sorting.length > 1 && sortIndex !== -1) {
                                // Zobrazit index třídění pokud je více sloupců
                                return (
                                  <SortIndexBadge $asc={sortDirection === 'asc'}>
                                    {sortIndex + 1}
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </SortIndexBadge>
                                );
                              } else if (sortDirection) {
                                // Zobrazit pouze šipku pokud je jeden sloupec
                                return (
                                  <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </HeaderText>
                        </HeaderTextWrapper>
                        
                        {canHide && (
                          <ColumnActions className="column-actions">
                            <ColumnActionButton
                              className="drag-handle"
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                handleDragStart(columnId);
                              }}
                              onDragEnd={handleDragEnd}
                              title="Přesunout sloupec (táhněte)"
                              style={{ cursor: 'grab' }}
                            >
                              <FontAwesomeIcon icon={faGripVertical} />
                            </ColumnActionButton>
                            <ColumnActionButton
                              className="hide-column"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHideColumn(columnId);
                              }}
                              title="Skrýt sloupec"
                            >
                              <FontAwesomeIcon icon={faEyeSlash} />
                            </ColumnActionButton>
                          </ColumnActions>
                        )}
                      </HeaderRow>
                      
                      {/* Druhý řádek: filtrovací pole v celé šířce */}
                      {header.column.getCanSort() && (() => {
                        const columnId = header.column.id;
                        
                        // Datum sloupec - DatePicker
                        if (columnId === 'dt_objednavky') {
                          const dateValue = localColumnFilters[columnId] || '';
                          return (
                            <div style={{ position: 'relative', marginTop: '4px' }}>
                              <DatePicker
                                key={`${columnId}_${dateValue || 'empty'}`} // Force re-render když se změní hodnota
                                fieldName={`${columnId}_filter`}
                                value={dateValue}
                                onChange={(value) => handleFilterChange(columnId, value)}
                                placeholder="Datum"
                                variant="compact"
                                highlight={isActiveColumnValue(dateValue)}
                              />
                            </div>
                          );
                        }
                        
                        // Stav objednávky - MULTISELECT z číselníku (načítá z DB - 25_ciselnik_stavy)
                        if (columnId === 'stav_objednavky') {
                          return (
                            <StavMultiSelect
                              columnId={columnId}
                              localColumnFilters={localColumnFilters}
                              handleFilterChange={handleFilterChange}
                              orderStatesList={orderStatesList}
                            />
                          );
                        }
                        
                        // Číselné sloupce - OperatorInput
                        if (columnId === 'max_cena_s_dph' || columnId === 'cena_s_dph' || columnId === 'faktury_celkova_castka_s_dph') {
                          return (
                            <div style={{ position: 'relative', marginTop: '4px', width: '100%' }}>
                              <OperatorInput
                                value={localColumnFilters[columnId] || ''}
                                onChange={(value) => handleFilterChange(columnId, value)}
                                placeholder={
                                  columnId === 'max_cena_s_dph' ? 'Max. cena' :
                                  columnId === 'cena_s_dph' ? 'Cena' :
                                  'Cena FA'
                                }
                                clearButton={true}
                                isActive={isActiveColumnValue(localColumnFilters[columnId])}
                                onClear={(e) => {
                                  e?.stopPropagation();
                                  handleFilterChange(columnId, '');
                                }}
                              />
                            </div>
                          );
                        }
                        
                        // Textové sloupce - standardní input
                        return (
                          <ColumnFilterWrapper>
                            <FontAwesomeIcon icon={faSearch} />
                            <ColumnFilterInput
                              type="text"
                              placeholder="Filtrovat..."
                              value={localColumnFilters[columnId] || ''}
                              onChange={(e) => handleFilterChange(columnId, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              $active={isActiveColumnValue(localColumnFilters[columnId])}
                              data-filter-active={isActiveColumnValue(localColumnFilters[columnId]) ? 'true' : 'false'}
                            />
                            {localColumnFilters[columnId] && (
                              <ColumnClearButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFilterChange(columnId, '');
                                }}
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </ColumnClearButton>
                            )}
                          </ColumnFilterWrapper>
                        );
                      })()}
                    </HeaderContent>
                    
                    {/* Resize handle */}
                    {canHide && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = e.currentTarget.parentElement.offsetWidth;
                          
                          // Přidat vizuální feedback
                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';
                          
                          const handleMouseMove = (moveEvent) => {
                            const diff = moveEvent.clientX - startX;
                            const newWidth = Math.max(50, startWidth + diff);
                            setColumnSizing(prev => ({
                              ...prev,
                              [columnId]: `${newWidth}px`
                            }));
                          };
                          
                          const handleMouseUp = () => {
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    )}
                  </TableHeaderCell>
                );
              })}
            </tr>
          ))}
        </TableHead>
        <TableBody>
          {error ? (
            <ErrorRow>
              <td colSpan={colSpan}>
                <div className="error-icon">
                  <FontAwesomeIcon icon={faTimesCircle} />
                </div>
                <div className="error-message">
                  Chyba při načítání objednávek
                </div>
                <div className="error-detail">
                  {error.message || error.toString()}
                </div>
              </td>
            </ErrorRow>
          ) : !hasData ? (
            <EmptyStateRow>
              <td colSpan={colSpan}>
                <div className="empty-icon">
                  <FontAwesomeIcon icon={faFileContract} />
                </div>
                <div className="empty-message">
                  Žádné objednávky nenalezeny
                </div>
                <div className="empty-hint">
                  Zkuste změnit filtry nebo vytvořit novou objednávku
                </div>
              </td>
            </EmptyStateRow>
          ) : (
            table.getRowModel().rows.map(row => {
              const order = row.original;
              const expanded = isExpanded(order.id);
              const rowColSpan = row.getVisibleCells().length;
              
              // Získat detail data z hooku
              const rowDetail = expanded ? getRowDetail(order.id) : null;
              const isLoadingDetail = expanded && loadingDetails.includes(order.id);
              const detailError = expanded && errors[order.id] ? errors[order.id] : null;
              
              // Získat barvu pozadí řádku
              let rowStyle = {};
              
              // 🎯 Highlight animace pro právě schválenou objednávku - NEJVYŠŠÍ PRIORITA
              const isHighlighted = highlightOrderId && order.id === highlightOrderId;
              if (isHighlighted) {
                rowStyle.animation = `${highlightPulse} 3s ease-out`;
                rowStyle.position = 'relative';
                rowStyle.zIndex = '100';
                
                // 🎨 Barvy podle akce - CELÝ ŘÁDEK
                if (highlightAction === 'approve') {
                  // ✅ ZELENÁ - Schváleno
                  rowStyle.background = 'rgba(220, 252, 231, 0.9)'; // Světle zelená
                  rowStyle.border = '3px solid #16a34a'; // Tmavě zelená
                  rowStyle.borderLeft = '6px solid #15803d'; // Ještě tmavší
                  rowStyle.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.2)';
                } else if (highlightAction === 'reject') {
                  // ❌ ČERVENÁ - Zamítnuto
                  rowStyle.background = 'rgba(254, 226, 226, 0.9)'; // Světle červená
                  rowStyle.border = '3px solid #dc2626'; // Tmavě červená
                  rowStyle.borderLeft = '6px solid #991b1b'; // Ještě tmavší
                  rowStyle.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.2)';
                } else if (highlightAction === 'postpone') {
                  // ⏸️ ORANŽOVÁ - Čeká se
                  rowStyle.background = 'rgba(254, 243, 199, 0.9)'; // Světle oranžová
                  rowStyle.border = '3px solid #f59e0b'; // Tmavě oranžová
                  rowStyle.borderLeft = '6px solid #d97706'; // Ještě tmavší
                  rowStyle.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.2)';
                } else if (highlightAction === 'cancel') {
                  rowStyle.background = 'rgba(254, 226, 226, 0.9)';
                  rowStyle.border = '3px solid #ef4444';
                  rowStyle.borderLeft = '6px solid #b91c1c';
                  rowStyle.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                } else {
                  // 🔵 DEFAULT - Zelená (fallback)
                  rowStyle.background = 'rgba(220, 252, 231, 0.9)';
                  rowStyle.border = '3px solid #16a34a';
                  rowStyle.borderLeft = '6px solid #15803d';
                  rowStyle.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.2)';
                }
              } else if (showRowColoring && getRowBackgroundColor) {
                // Běžné podbarvení podle stavu (pokud NENÍ highlight)
                const bgColor = getRowBackgroundColor(order);
                if (bgColor) {
                  rowStyle.background = `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 50%, ${bgColor} 100%)`;
                }
              } else {
                // Výchozí striping pokud není podbarvení zapnuté
                const rowIndex = table.getRowModel().rows.indexOf(row);
                rowStyle.backgroundColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
              }
              
              return (
                <React.Fragment key={row.id}>
                  <tr 
                    style={rowStyle}
                    data-order-id={order.id} // 🎯 Pro scroll targeting
                    data-order-index={table.getRowModel().rows.indexOf(row)} // 🆕 Pro context menu
                    onMouseDown={(e) => {
                      if (e.button === 2) {
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={onTableContextMenu} // 🆕 Kontextové menu
                    onDoubleClick={() => onActionClick?.('edit', order)} // 🎯 Double-click pro editaci
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        $align={cell.column.columnDef.meta?.align || 'left'}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </tr>
                  {expanded && (
                    <OrderExpandedRowV3
                      order={order}
                      detail={rowDetail}
                      loading={isLoadingDetail}
                      error={detailError}
                      onRetry={() => loadOrderDetail(order.id)}
                      onForceRefresh={async () => {
                        // 🔄 1) Refresh detail z DB (ignoruj cache)
                        await refreshDetail(order.id);
                        // 🔍 2) Refresh list, aby se znovu aplikovaly filtry a případné změny stavu
                        onRefreshOrders?.();
                      }}
                      colSpan={rowColSpan}
                      token={token}
                      username={username}
                      onActionClick={onActionClick}
                      canEdit={canEdit}
                      showToast={showToast}
                      // 💬 Komentáře (inline v podřádku)
                      onLoadComments={onLoadComments}
                      onAddComment={onAddComment}
                      onDeleteComment={onDeleteComment}
                      // 🎯 Schvalovací props
                      setOrderToApprove={setOrderToApprove}
                      setApprovalComment={setApprovalComment}
                      setShowApprovalDialog={setShowApprovalDialog}
                      canApproveOrder={canApproveOrder}
                    />
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
    </TableWrapper>
    
    {/* Fixed horizontal scrollbar - vždy na spodním okraji layoutu */}
    {showFixedScrollbar && ReactDOM.createPortal(
      <FixedScrollbarContainer ref={fixedScrollbarRef}>
        <FixedScrollbarContent />
      </FixedScrollbarContainer>,
      document.body
    )}

      {/* 🎯 Schvalovací dialog */}
      {showApprovalDialog && orderToApprove && ReactDOM.createPortal(
        <ApprovalDialogOverlay>
          <ApprovalDialog onClick={(e) => e.stopPropagation()}>
            <ApprovalDialogHeader $danger={isBudgetExceeded}>
              <ApprovalDialogTitle>
                {isBudgetExceeded ? '⛔ Nedostatek prostředků' : 'Schválení objednávky'}
                <span style={{ 
                  marginLeft: '1rem', 
                  fontSize: '0.9em', 
                  fontWeight: 700,
                  color: isBudgetExceeded ? '#fff' : '#fbbf24',
                  background: isBudgetExceeded ? '#991b1b' : '#065f46',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: isBudgetExceeded ? '2px solid #7f1d1d' : '2px solid #047857',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}>
                  {orderToApprove.stav_objednavky || '---'}
                </span>
                {(orderToApprove.mimoradna_udalost == 1 || orderToApprove.mimoradna_udalost === '1') && (
                  <span style={{ 
                    marginLeft: '0.5rem',
                    fontSize: '1.1em',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    color: '#dc2626',
                    fontWeight: 'bold'
                  }} title="Mimořádná událost">
                    <FontAwesomeIcon icon={faBoltLightning} />
                  </span>
                )}
              </ApprovalDialogTitle>
            </ApprovalDialogHeader>

            <ApprovalDialogContent>
              {/* 2-Column Layout: Levý sloupec = základní info, pravý = financování */}
              <ApprovalTwoColumnLayout>
                {/* LEVÝ SLOUPEC - Základní informace */}
                <ApprovalLeftColumn>
                  <ApprovalCompactList>
                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Číslo:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong>{orderToApprove.cislo_objednavky || orderToApprove.ev_cislo || `#${orderToApprove.id}`}</strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Předmět:</ApprovalCompactLabel>
                      <ApprovalCompactValue>{orderToApprove.predmet || '---'}</ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Objednatel:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          // V3 používá flat fields: objednatel_jmeno, objednatel_prijmeni, objednatel_titul_pred, objednatel_titul_za
                          if (orderToApprove.objednatel_jmeno || orderToApprove.objednatel_prijmeni) {
                            const titul_pred = orderToApprove.objednatel_titul_pred ? orderToApprove.objednatel_titul_pred + ' ' : '';
                            const jmeno = orderToApprove.objednatel_jmeno || '';
                            const prijmeni = orderToApprove.objednatel_prijmeni || '';
                            const titul_za = orderToApprove.objednatel_titul_za ? ', ' + orderToApprove.objednatel_titul_za : '';
                            return `${titul_pred}${jmeno} ${prijmeni}${titul_za}`.replace(/\s+/g, ' ').trim();
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Garant:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          // V3 používá flat fields: garant_jmeno, garant_prijmeni, garant_titul_pred, garant_titul_za
                          if (orderToApprove.garant_jmeno || orderToApprove.garant_prijmeni) {
                            const titul_pred = orderToApprove.garant_titul_pred ? orderToApprove.garant_titul_pred + ' ' : '';
                            const jmeno = orderToApprove.garant_jmeno || '';
                            const prijmeni = orderToApprove.garant_prijmeni || '';
                            const titul_za = orderToApprove.garant_titul_za ? ', ' + orderToApprove.garant_titul_za : '';
                            return `${titul_pred}${jmeno} ${prijmeni}${titul_za}`.replace(/\s+/g, ' ').trim();
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    {(() => {
                      // Parse strediska_kod if it's a string
                      let strediska_array = orderToApprove.strediska_kod;
                      if (typeof strediska_array === 'string') {
                        try {
                          strediska_array = JSON.parse(strediska_array);
                        } catch (e) {
                          strediska_array = null;
                        }
                      }
                      
                      if (strediska_array && Array.isArray(strediska_array) && strediska_array.length > 0) {
                        return (
                          <ApprovalCompactItem>
                            <ApprovalCompactLabel>Střediska:</ApprovalCompactLabel>
                            <ApprovalCompactValue>
                              {orderToApprove._enriched?.strediska && Array.isArray(orderToApprove._enriched.strediska) && orderToApprove._enriched.strediska.length > 0
                                ? orderToApprove._enriched.strediska.map(s => s.nazev || s.kod).join(', ')
                                : strediska_array.join(', ')}
                            </ApprovalCompactValue>
                          </ApprovalCompactItem>
                        );
                      }
                      return null;
                    })()}

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Max. cena:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>
                          {orderToApprove.max_cena_s_dph 
                            ? `${parseFloat(orderToApprove.max_cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`
                            : '---'}
                        </strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    {orderToApprove.dt_vytvoreni && (() => {
                      const daysAgo = Math.floor((Date.now() - new Date(orderToApprove.dt_vytvoreni)) / 86400000);
                      const badgeColor = daysAgo <= 2 ? { bg: '#dcfce7', color: '#166534', border: '#86efac' }
                        : daysAgo <= 7 ? { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' }
                        : { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
                      return (
                        <ApprovalCompactItem>
                          <ApprovalCompactLabel>Vytvořeno:</ApprovalCompactLabel>
                          <ApprovalCompactValue style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {formatSmartDate(orderToApprove.dt_vytvoreni)}
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px',
                              borderRadius: '10px', whiteSpace: 'nowrap',
                              background: badgeColor.bg, color: badgeColor.color,
                              border: `1px solid ${badgeColor.border}`
                            }}>
                              {daysAgo === 0 ? 'dnes' : daysAgo === 1 ? 'před 1 dnem' : `před ${daysAgo} dny`}
                            </span>
                          </ApprovalCompactValue>
                        </ApprovalCompactItem>
                      );
                    })()}
                    {orderToApprove.dt_odeslani && (
                      <ApprovalCompactItem>
                        <ApprovalCompactLabel>Odesláno ke schválení:</ApprovalCompactLabel>
                        <ApprovalCompactValue>{formatSmartDate(orderToApprove.dt_odeslani)}</ApprovalCompactValue>
                      </ApprovalCompactItem>
                    )}
                  </ApprovalCompactList>

                  {/* Poznámka ke schválení - v levém sloupci */}
                  <ApprovalSection style={{ marginTop: '1rem' }}>
                    <ApprovalSectionTitle>📝 Poznámka ke schválení (nepovinná)</ApprovalSectionTitle>
                    <ApprovalDialogTextarea
                      $hasError={!!approvalCommentError}
                      value={approvalComment}
                      onChange={(e) => {
                        setApprovalComment(e.target.value);
                        if (approvalCommentError) {
                          setApprovalCommentError('');
                        }
                      }}
                      placeholder="Nepovinná poznámka ke schválení (povinná pro Odložit/Zamítnout)..."
                    />
                    {approvalCommentError && (
                      <ApprovalDialogError>{approvalCommentError}</ApprovalDialogError>
                    )}
                  </ApprovalSection>
                </ApprovalLeftColumn>

                {/* PRAVÝ SLOUPEC - Financování (LP/Smlouvy) */}
                <ApprovalRightColumn>
                  {/* LP */}
                  {orderToApprove.financovani?.lp_kody && Array.isArray(orderToApprove.financovani.lp_kody) && orderToApprove.financovani.lp_kody.length > 0 && (() => {
                    // 🎯 SIMULACE čerpání - připočíst aktuální objednávku (pokud není schválená)
                    const maxCena = parseFloat(orderToApprove.max_cena_s_dph) || 0;
                    const lpKody = orderToApprove.financovani?.lp_kody || [];
                    const lpInfo = orderToApprove._enriched?.lp_info || [];
                    
                    return (
                    <>
                      <ApprovalSectionTitle>💰 Limitované přísliby</ApprovalSectionTitle>
                      {(() => {
                        if (lpInfo.length > 0) {
                          return lpInfo.map((lp, idx) => {
                            // Výpočet procenta čerpání (plánovaného)
                            const hodnotaLP = parseFloat(lp.total_limit) || 0;
                            const cerpanoPredpoklad = parseFloat(lp.cerpano_predpoklad) || 0;
                            const cerpanoSkutecne = parseFloat(lp.cerpano_skutecne) || 0;
                            // ✅ rezervovano = další objednávky čekající na schválení (vč. této - viz DB)
                            const cerpanoRezervovano = parseFloat(lp.rezervovano) || 0;
                            // plannedFull = celkové „v procesu“ (predpokladane + rezervovano) - stejná logika jako modul Čerpání
                            const plannedFull = cerpanoPredpoklad + cerpanoRezervovano;
                            // Podil teto objednavky na LP + simulovany % po schvaleni
                            const lpPodil = lpKody.includes(lp.id) ? maxCena / (lpKody.length || 1) : 0;
                            // Ostatní čekající ke schválení na tomto LP
                            const keSchvaleniCastka = parseFloat(lp.ke_schvaleni_castka) || 0;
                            const percentCerpani = hodnotaLP > 0 ? Math.round(((cerpanoSkutecne + plannedFull + lpPodil) / hodnotaLP) * 100) : 0;
                            const hasLimit = hodnotaLP > 0;
                            // Překročení limitu LP po schválení TÉTO objednávky
                            const lpExceeded = hodnotaLP > 0 && (hodnotaLP - cerpanoSkutecne - plannedFull - lpPodil) < 0;
                            // Varování: pokud by se schválily i všechny ostatní čekající, dojde k přečerpání
                            const lpWouldExceedIfAll = !lpExceeded && hodnotaLP > 0 && keSchvaleniCastka > 0 &&
                              (hodnotaLP - cerpanoSkutecne - plannedFull - lpPodil - keSchvaleniCastka) < 0;
                            return (
                              <ApprovalLPItem key={idx}>
                                <ApprovalLPHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{lp.kod} — {lp.nazev}</span>
                                  {hasLimit && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </ApprovalLPHeader>
                                <ApprovalLPRow>
                                  <span>Celkový limit:</span>
                                  <strong>{lp.total_limit ? parseFloat(lp.total_limit).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>
                                    V procesu
                                    {vProcesuPanels[`lp_${lp.id}`]?.loading && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>…</span>}
                                    {vProcesuPanels[`lp_${lp.id}`]?.data != null && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: activeVProcesuKey === `lp_${lp.id}` ? '#6366f1' : '#e0e7ff', color: activeVProcesuKey === `lp_${lp.id}` ? '#fff' : '#4338ca', borderRadius: '8px', padding: '1px 6px', marginLeft: '4px' }}>
                                        {vProcesuPanels[`lp_${lp.id}`].data.length}
                                      </span>
                                    )}:
                                  </span>
                                  <strong>
                                    {(() => {
                                      const panelKey = `lp_${lp.id}`;
                                      const panel = vProcesuPanels[panelKey];
                                      const isActive = activeVProcesuKey === panelKey;
                                      return (
                                        <button
                                          onClick={(e) => {
                                            if (isActive) {
                                              // toggle zavřít popup
                                              setActiveVProcesuKey(null);
                                              return;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setVProcesuAnchorY(rect.bottom + 6);
                                            setVProcesuOpenUpward(false);
                                            const actionsEl = approvalActionsRef.current;
                                            setVProcesuBottomLimit(actionsEl ? actionsEl.getBoundingClientRect().top - 8 : null);
                                            // Pokud máme data, jen otevřít popup
                                            if (panel?.data) {
                                              const lpTitle = [`${lp.kod} — ${lp.nazev}`, lp.cislo_uctu || null, lp.prikazce_jmeno || null, lp.usek_zkr || null].filter(Boolean).join(' | ');
                                              setActiveVProcesuTitle(lpTitle);
                                              setActiveVProcesuKey(panelKey);
                                              return;
                                            }
                                            // Načíst data
                                            setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: true, data: null, error: null } }));
                                            const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
                                            fetch(`${baseURL}orders-v3/lp-v-procesu`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ token, username, lp_id: lp.id }),
                                            })
                                              .then(r => r.json())
                                              .then(res => {
                                                setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: false, data: res.data || [], error: null } }));
                                                const lpTitle = [`${lp.kod} — ${lp.nazev}`, lp.cislo_uctu || null, lp.prikazce_jmeno || null, lp.usek_zkr || null].filter(Boolean).join(' | ');
                                                setActiveVProcesuTitle(lpTitle);
                                                setActiveVProcesuKey(panelKey);
                                              })
                                              .catch(() => setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: false, data: null, error: 'Chyba načítání' } })));
                                          }}
                                          title={isActive ? 'Zavřít přehled objednávek v procesu' : 'Zobrazit seznam objednávek v procesu'}
                                          style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                            fontWeight: 700, fontSize: 'inherit', color: 'inherit', textDecoration: 'underline dotted',
                                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                          }}>
                                          {plannedFull.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                        </button>
                                      );
                                    })()}
                                    {lpKody.includes(lp.id) && maxCena > 0 && (
                                      <span
                                        title={lpExceeded
                                          ? `⛔ Po schválení dojde k přečerpání LP! (+${(maxCena / (lpKody.length || 1)).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč)`
                                          : `Tato objednávka je zahrnuta v rezervaci LP (+${(maxCena / (lpKody.length || 1)).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč)`}
                                        style={{ 
                                          fontSize: '0.75rem', 
                                          color: lpExceeded ? '#991b1b' : '#10b981', 
                                          fontWeight: 700,
                                          marginLeft: '0.5rem',
                                          background: lpExceeded ? '#fee2e2' : '#d1fae5',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          border: lpExceeded ? '1px solid #fca5a5' : '1px solid #6ee7b7',
                                          cursor: 'help'
                                        }}>
                                        +{(maxCena / (lpKody.length || 1)).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                      </span>
                                    )}
                                  </strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow $highlight>
                                  <span>Volné:</span>
                                  <strong style={{ color: (hodnotaLP - cerpanoSkutecne - plannedFull) < 0 ? '#dc2626' : '#059669' }}>
                                    {(hodnotaLP - cerpanoSkutecne - plannedFull).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                  </strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>Dokončeno:</span>
                                  <strong>{cerpanoSkutecne.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                                </ApprovalLPRow>
                                
                                {/* Roční plán čerpání - Jezevčík progress bar */}
                                {hodnotaLP > 0 && (() => {
                                  const currentMonth = new Date().getMonth();
                                  const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                  // ✅ Math.round - stejné jako LimitovanePrislibyManager
                                  const targetPct = Math.round(((currentMonth + 1) / 12) * 100);
                                  // spentPct = skutečně dokončené (faktury s potv. věcnou spr.)
                                  const spentPct = (cerpanoSkutecne / hodnotaLP) * 100;
                                  // plannedPct = predpokladane + rezervovano (celé „v procesu“) - stejná logika jako modul Čerpání
                                  const plannedPct = plannedFull > 0 ? Math.min((plannedFull / hodnotaLP) * 100, Math.max(0, 100 - spentPct)) : 0;
                                  // totalPct = součet obojího - shoduje se s LimitovanePrislibyManager getJezevcikState
                                  const totalPct = spentPct + plannedPct;
                                  // ✅ isCritical: stejná logika jako modul Čerpání (skutecne >= 100% NEBO total > 2x cíl)
                                  const isCritical = totalPct > targetPct * 2 || (cerpanoSkutecne / hodnotaLP) * 100 >= 100;
                                  const isWarning = !isCritical && totalPct > targetPct * 1.3;
                                  const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                                  const barColorLight = isCritical ? '#fca5a5' : isWarning ? '#fdba74' : '#86efac';

                                  return (
                                    <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.5rem', paddingBottom: '0.25rem', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>
                                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px' }}>Roční plán čerpání</span>
                                      <ApprJezWrap>
                                        <ApprJezHeader>
                                          <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                            <ApprJezPercentValue $color={barColor}>{totalPct.toFixed(1)}%</ApprJezPercentValue>
                                            <ApprJezPercentLabel>Čerpání</ApprJezPercentLabel>
                                          </div>
                                          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                                            <ApprJezTargetLabel>Cíl k datu</ApprJezTargetLabel>
                                            <ApprJezTargetValue>{targetPct}% ({currentMonthName})</ApprJezTargetValue>
                                          </div>
                                        </ApprJezHeader>
                                        <ApprJezBarOuter title={`Čerpání: ${totalPct.toFixed(1)}% / Cíl: ${targetPct}%`}>
                                          {/* Měsíční rastr */}
                                          <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                              <div key={i} style={{
                                                flex: 1,
                                                borderRight: '1px solid rgba(203,213,225,0.3)',
                                                background: i === currentMonth ? 'rgba(100,116,139,0.05)' : 'transparent'
                                              }} />
                                            ))}
                                          </div>
                                          <ApprJezTargetLine $percent={targetPct} />
                                          <ApprJezBarFill $percent={spentPct} $color={barColor} />
                                          {plannedPct > 0 && (
                                            <ApprJezBarPlanned $left={Math.min(spentPct, 100)} $percent={plannedPct} $color={barColorLight} />
                                          )}
                                        </ApprJezBarOuter>
                                        <ApprJezLegend>
                                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: barColor }} />
                                              <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Dokončeno</span>
                                            </div>
                                            {plannedPct > 0 && (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: barColorLight, opacity: 0.7 }} />
                                                <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>V procesu</span>
                                              </div>
                                            )}
                                          </div>
                                          {isCritical && <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#ef4444' }}>⚠ Kritické přečerpání</span>}
                                        </ApprJezLegend>
                                      </ApprJezWrap>
                                    </ApprovalLPRow>
                                  );
                                })()}
                                {lp.ke_schvaleni_pocet > 0 && (() => {
                                  const ksKey = `ks_lp_${lp.id}`;
                                  const ksPanel = vProcesuPanels[ksKey];
                                  const isKsActive = activeVProcesuKey === ksKey;
                                  return (
                                    <button
                                      onClick={(e) => {
                                        if (isKsActive) { setActiveVProcesuKey(null); return; }
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        // Otevřít NAHORU – anchor = top hrany boxíku
                                        setVProcesuAnchorY(rect.top);
                                        setVProcesuOpenUpward(true);
                                        setVProcesuBottomLimit(null);
                                        if (ksPanel?.data) {
                                          setActiveVProcesuTitle(`LP ${lp.cislo_lp || lp.kod} — objednávky ke schválení`);
                                          setActiveVProcesuKey(ksKey);
                                          return;
                                        }
                                        setVProcesuPanels(prev => ({ ...prev, [ksKey]: { loading: true, data: null, error: null } }));
                                        const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
                                        fetch(`${baseURL}orders-v3/lp-ke-schvaleni`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ token, username, lp_id: lp.id, current_order_id: orderToApprove?.id || 0 }),
                                        })
                                          .then(r => r.json())
                                          .then(res => {
                                            setVProcesuPanels(prev => ({ ...prev, [ksKey]: { loading: false, data: res.data || [], error: null } }));
                                            setActiveVProcesuTitle(`LP ${lp.cislo_lp || lp.kod} — objednávky ke schválení`);
                                            setActiveVProcesuKey(ksKey);
                                          })
                                          .catch(() => setVProcesuPanels(prev => ({ ...prev, [ksKey]: { loading: false, data: null, error: 'Chyba načítání' } })));
                                      }}
                                      style={{
                                        width: '100%',
                                        backgroundColor: isKsActive ? '#fee2e2' : '#fef2f2',
                                        border: `1px solid ${isKsActive ? '#dc2626' : '#fca5a5'}`,
                                        borderRadius: '6px',
                                        padding: '6px 10px',
                                        marginTop: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s, border-color 0.15s',
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.78rem' }}>
                                          Další ke schválení ({lp.ke_schvaleni_pocet} obj.):
                                          {ksPanel?.loading && <span style={{ fontSize: '0.68rem', color: '#b45309', marginLeft: '4px' }}>…</span>}
                                        </span>
                                        <strong style={{ color: '#dc2626', fontSize: '0.78rem' }}>
                                          {parseFloat(lp.ke_schvaleni_castka).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                        </strong>
                                      </div>
                                      {lpWouldExceedIfAll && (
                                        <div style={{ fontSize: '0.68rem', color: '#991b1b', fontStyle: 'italic' }}>
                                          ⚠️ Při schválení všech dojde k přečerpání!
                                        </div>
                                      )}
                                    </button>
                                  );
                                })()}
                              </ApprovalLPItem>
                            );
                          });
                        } else {
                          return <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{orderToApprove.financovani.lp_kody.join(', ')}</div>;
                        }
                      })()}
                      {orderToApprove.financovani?.lp_poznamka && (
                        <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                          <strong>Poznámka:</strong> {orderToApprove.financovani.lp_poznamka}
                        </div>
                      )}
                    </>
                    );
                  })()}

                  {/* Smlouva */}
                  {(orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy) && (
                    <>
                      <ApprovalSectionTitle style={{ marginTop: orderToApprove.financovani?.lp_kody ? '1rem' : '0' }}>📄 Smlouva</ApprovalSectionTitle>
                      {(() => {
                        const smlouvaInfo = orderToApprove._enriched?.smlouva_info;
                        const cisloSmlouvy = orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy;
                        
                        // 🎯 SIMULACE - připočíst aktuální objednávku
                        const maxCenaSmlouva = parseFloat(orderToApprove.max_cena_s_dph) || 0;
                        
                        if (smlouvaInfo && smlouvaInfo.hodnota) {
                          const hodnotaSmlouvy = parseFloat(smlouvaInfo.hodnota) || 0;
                          // ✅ Použít dynamicky počítané cerpano_v_procesu (jen obj v procesu bez faktury)
                          let cerpanoPozadovano = parseFloat(smlouvaInfo.cerpano_v_procesu != null ? smlouvaInfo.cerpano_v_procesu : smlouvaInfo.cerpano_pozadovano) || 0;
                          
                          // ✅ Připočíst aktuální objednávku k simulaci
                          const simulovaneCerpaniSmlouva = cerpanoPozadovano + maxCenaSmlouva;
                          // Smlouvy s hodnotou ≤ 10 Kč jsou bez stropové ceny
                          const percentCerpani = hodnotaSmlouvy > 10 ? Math.round((simulovaneCerpaniSmlouva / hodnotaSmlouvy) * 100) : 0;
                          const hasStropovaCena = hodnotaSmlouvy > 10;
                          
                          return (
                            <ApprovalLPItem>
                              <ApprovalLPHeader>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{cisloSmlouvy}</span>
                                  {hasStropovaCena && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </div>
                              </ApprovalLPHeader>
                              <ApprovalLPRow>
                                <span>Hodnota smlouvy:</span>
                                <strong>{parseFloat(smlouvaInfo.hodnota).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow>
                                <span>
                                  V procesu
                                  {vProcesuPanels[`smlouva_${cisloSmlouvy}`]?.loading && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>…</span>}
                                  {vProcesuPanels[`smlouva_${cisloSmlouvy}`]?.data != null && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: activeVProcesuKey === `smlouva_${cisloSmlouvy}` ? '#6366f1' : '#e0e7ff', color: activeVProcesuKey === `smlouva_${cisloSmlouvy}` ? '#fff' : '#4338ca', borderRadius: '8px', padding: '1px 6px', marginLeft: '4px' }}>
                                      {vProcesuPanels[`smlouva_${cisloSmlouvy}`].data.length}
                                    </span>
                                  )}:
                                </span>
                                <strong>
                                  {(() => {
                                    const panelKey = `smlouva_${cisloSmlouvy}`;
                                    const panel = vProcesuPanels[panelKey];
                                    const isActive = activeVProcesuKey === panelKey;
                                    return (
                                      <button
                                        onClick={(e) => {
                                          if (isActive) {
                                            setActiveVProcesuKey(null);
                                            return;
                                          }
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setVProcesuAnchorY(rect.bottom + 6);
                                          setVProcesuOpenUpward(false);
                                          const actionsEl = approvalActionsRef.current;
                                          setVProcesuBottomLimit(actionsEl ? actionsEl.getBoundingClientRect().top - 8 : null);
                                          if (panel?.data) {
                                            setActiveVProcesuTitle(`Smlouva ${cisloSmlouvy} — objednávky v procesu`);
                                            setActiveVProcesuKey(panelKey);
                                            return;
                                          }
                                          setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: true, data: null, error: null } }));
                                          const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
                                          fetch(`${baseURL}orders-v3/smlouva-v-procesu`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ token, username, cislo_smlouvy: cisloSmlouvy }),
                                          })
                                            .then(r => r.json())
                                            .then(res => {
                                              setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: false, data: res.data || [], error: null } }));
                                              setActiveVProcesuTitle(`Smlouva ${cisloSmlouvy} — objednávky v procesu`);
                                              setActiveVProcesuKey(panelKey);
                                            })
                                            .catch(() => setVProcesuPanels(prev => ({ ...prev, [panelKey]: { loading: false, data: null, error: 'Chyba načítání' } })));
                                        }}
                                        title={isActive ? 'Zavřít přehled objednávek v procesu' : 'Zobrazit seznam objednávek v procesu'}
                                        style={{
                                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                          fontWeight: 700, fontSize: 'inherit', color: 'inherit', textDecoration: 'underline dotted',
                                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                        }}>
                                        {cerpanoPozadovano.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                      </button>
                                    );
                                  })()}
                                  {maxCenaSmlouva > 0 && (() => {
                                    const smlouvaExceeded = hodnotaSmlouvy > 10 && (hodnotaSmlouvy - simulovaneCerpaniSmlouva) < 0;
                                    return (
                                      <span
                                        title={smlouvaExceeded
                                          ? `⛔ Po schválení dojde k přečerpání smlouvy! (+${maxCenaSmlouva.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč)`
                                          : `Vč. této objednávky (+${maxCenaSmlouva.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč)`}
                                        style={{ 
                                          fontSize: '0.75rem', 
                                          color: smlouvaExceeded ? '#991b1b' : '#10b981', 
                                          fontWeight: 700,
                                          marginLeft: '0.5rem',
                                          background: smlouvaExceeded ? '#fee2e2' : '#d1fae5',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          border: smlouvaExceeded ? '1px solid #fca5a5' : '1px solid #6ee7b7',
                                          cursor: 'help'
                                        }}>
                                        +{maxCenaSmlouva.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                      </span>
                                    );
                                  })()}
                                </strong>
                              </ApprovalLPRow>
                              {hasStropovaCena && (
                                <ApprovalLPRow $highlight>
                                  <span>Volné:</span>
                                  <strong style={{ color: (hodnotaSmlouvy - simulovaneCerpaniSmlouva) < 0 ? '#dc2626' : '#059669' }}>
                                    {(hodnotaSmlouvy - simulovaneCerpaniSmlouva).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                  </strong>
                                </ApprovalLPRow>
                              )}
                              <ApprovalLPRow>
                                <span>Dokončeno:</span>
                                <strong>{smlouvaInfo.cerpano_skutecne ? parseFloat(smlouvaInfo.cerpano_skutecne).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                              </ApprovalLPRow>
                              
                              {/* Roční plán čerpání - Jezevčík progress bar */}
                              {hodnotaSmlouvy > 0 && (() => {
                                const currentMonth = new Date().getMonth();
                                const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                // ✅ Math.round - stejné jako LimitovanePrislibyManager
                                const targetPct = Math.round(((currentMonth + 1) / 12) * 100);
                                const cerpanoSkutecneSmlouva = parseFloat(smlouvaInfo.cerpano_skutecne) || 0;
                                const spentPct = (cerpanoSkutecneSmlouva / hodnotaSmlouvy) * 100;
                                const plannedRaw = simulovaneCerpaniSmlouva - cerpanoSkutecneSmlouva;
                                const plannedPct = plannedRaw > 0 ? Math.min((plannedRaw / hodnotaSmlouvy) * 100, Math.max(0, 100 - spentPct)) : 0;
                                const totalPct = spentPct + plannedPct;
                                // ✅ isCritical: skutecne >= 100% NEBO total > 2x cíl
                                const isCritical = totalPct > targetPct * 2 || (cerpanoSkutecneSmlouva / hodnotaSmlouvy) * 100 >= 100;
                                const isWarning = !isCritical && totalPct > targetPct * 1.3;
                                const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                                const barColorLight = isCritical ? '#fca5a5' : isWarning ? '#fdba74' : '#86efac';

                                return (
                                  <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.5rem', paddingBottom: '0.25rem', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px' }}>Roční plán čerpání</span>
                                    <ApprJezWrap>
                                      <ApprJezHeader>
                                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                          <ApprJezPercentValue $color={barColor}>{totalPct.toFixed(1)}%</ApprJezPercentValue>
                                          <ApprJezPercentLabel>Čerpání</ApprJezPercentLabel>
                                        </div>
                                        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                                          <ApprJezTargetLabel>Cíl k datu</ApprJezTargetLabel>
                                          <ApprJezTargetValue>{targetPct}% ({currentMonthName})</ApprJezTargetValue>
                                        </div>
                                      </ApprJezHeader>
                                      <ApprJezBarOuter title={`Čerpání: ${totalPct.toFixed(1)}% / Cíl: ${targetPct}%`}>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
                                          {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} style={{
                                              flex: 1,
                                              borderRight: '1px solid rgba(203,213,225,0.3)',
                                              background: i === currentMonth ? 'rgba(100,116,139,0.05)' : 'transparent'
                                            }} />
                                          ))}
                                        </div>
                                        <ApprJezTargetLine $percent={targetPct} />
                                        <ApprJezBarFill $percent={spentPct} $color={barColor} />
                                        {plannedPct > 0 && (
                                          <ApprJezBarPlanned $left={Math.min(spentPct, 100)} $percent={plannedPct} $color={barColorLight} />
                                        )}
                                      </ApprJezBarOuter>
                                      <ApprJezLegend>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: barColor }} />
                                            <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Dokončeno</span>
                                          </div>
                                          {plannedPct > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: barColorLight, opacity: 0.7 }} />
                                              <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>V procesu</span>
                                            </div>
                                          )}
                                        </div>
                                        {isCritical && <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#ef4444' }}>⚠ Kritické přečerpání</span>}
                                      </ApprJezLegend>
                                    </ApprJezWrap>
                                  </ApprovalLPRow>
                                );
                              })()}
                              {/* Červený box: Další ke schválení pro smlouvu */}
                              {smlouvaInfo.ke_schvaleni_pocet > 0 && (() => {
                                const ksKeyS = `ks_smlouva_${cisloSmlouvy}`;
                                const ksPanelS = vProcesuPanels[ksKeyS];
                                const isKsActiveS = activeVProcesuKey === ksKeyS;
                                const smlouvaWouldExceedIfAll = hasStropovaCena && (simulovaneCerpaniSmlouva + parseFloat(smlouvaInfo.ke_schvaleni_castka || 0)) > hodnotaSmlouvy;
                                return (
                                  <button
                                    onClick={(e) => {
                                      if (isKsActiveS) { setActiveVProcesuKey(null); return; }
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setVProcesuAnchorY(rect.top);
                                      setVProcesuOpenUpward(true);
                                      setVProcesuBottomLimit(null);
                                      if (ksPanelS?.data) {
                                        setActiveVProcesuTitle(`Smlouva ${cisloSmlouvy} — objednávky ke schválení`);
                                        setActiveVProcesuKey(ksKeyS);
                                        return;
                                      }
                                      setVProcesuPanels(prev => ({ ...prev, [ksKeyS]: { loading: true, data: null, error: null } }));
                                      const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
                                      fetch(`${baseURL}orders-v3/smlouva-ke-schvaleni`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ token, username, cislo_smlouvy: cisloSmlouvy, current_order_id: orderToApprove?.id || 0 }),
                                      })
                                        .then(r => r.json())
                                        .then(res => {
                                          setVProcesuPanels(prev => ({ ...prev, [ksKeyS]: { loading: false, data: res.data || [], error: null } }));
                                          setActiveVProcesuTitle(`Smlouva ${cisloSmlouvy} — objednávky ke schválení`);
                                          setActiveVProcesuKey(ksKeyS);
                                        })
                                        .catch(() => setVProcesuPanels(prev => ({ ...prev, [ksKeyS]: { loading: false, data: null, error: 'Chyba načítání' } })));
                                    }}
                                    style={{
                                      width: '100%',
                                      backgroundColor: isKsActiveS ? '#fee2e2' : '#fef2f2',
                                      border: `1px solid ${isKsActiveS ? '#dc2626' : '#fca5a5'}`,
                                      borderRadius: '6px',
                                      padding: '6px 10px',
                                      marginTop: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      transition: 'background 0.15s, border-color 0.15s',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.78rem' }}>
                                        Další ke schválení ({smlouvaInfo.ke_schvaleni_pocet} obj.):
                                        {ksPanelS?.loading && <span style={{ fontSize: '0.68rem', color: '#b45309', marginLeft: '4px' }}>…</span>}
                                      </span>
                                      <strong style={{ color: '#dc2626', fontSize: '0.78rem' }}>
                                        {parseFloat(smlouvaInfo.ke_schvaleni_castka).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                                      </strong>
                                    </div>
                                    {smlouvaWouldExceedIfAll && (
                                      <div style={{ fontSize: '0.68rem', color: '#991b1b', fontStyle: 'italic' }}>
                                        ⚠️ Při schválení všech dojde k přečerpání!
                                      </div>
                                    )}
                                  </button>
                                );
                              })()}
                            </ApprovalLPItem>
                          );
                        } else {
                          return (
                            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                              Číslo: <strong>{cisloSmlouvy}</strong>
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </ApprovalRightColumn>
              </ApprovalTwoColumnLayout>
            </ApprovalDialogContent>

            <ApprovalDialogActions ref={approvalActionsRef}>
              {isBudgetExceeded && (
                <ApprovalBudgetWarning>
                  ⛔ Schválením by došlo k přečerpání rozpočtu. Objednávku nelze schválit.
                </ApprovalBudgetWarning>
              )}

              <ApprovalDialogButton onClick={() => {
                setShowApprovalDialog(false);
                setOrderToApprove(null);
                setApprovalComment('');
                setApprovalCommentError('');
                setVProcesuPanels({});
                setActiveVProcesuKey(null);
                setVProcesuAnchorY(0);
              }}>
                Storno
              </ApprovalDialogButton>

              {!isBudgetExceeded && (
                <ApprovalDialogButton 
                  $postpone
                  onClick={() => handleApprovalAction('postpone')}
                >
                  ⏰ Odložit
                </ApprovalDialogButton>
              )}

              <ApprovalDialogButton 
                $reject
                onClick={() => handleApprovalAction('reject')}
              >
                ❌ Zamítnout
              </ApprovalDialogButton>

              {!isBudgetExceeded && (
                <ApprovalDialogButton 
                  $approve
                  onClick={() => handleApprovalAction('approve')}
                >
                  ✅ Schválit
                </ApprovalDialogButton>
              )}
            </ApprovalDialogActions>
          </ApprovalDialog>
        </ApprovalDialogOverlay>,
        document.body
      )}

      {/* Drawer "V procesu" - otevírá se pod řádkem V procesu */}
      {activeVProcesuKey && vProcesuPanels[activeVProcesuKey]?.data && ReactDOM.createPortal(
        <VProcesuDrawer style={vProcesuOpenUpward ? {
          // Otevřít NAHORU – bottom = viewport výška - top hrany boxíku
          bottom: window.innerHeight - vProcesuAnchorY + 6,
          top: 'auto',
          maxHeight: `${Math.min(vProcesuAnchorY - 60, 480)}px`,
          borderRadius: '12px 12px 0 0',
          borderTop: '2px solid #6366f1',
          borderBottom: 'none',
        } : {
          top: vProcesuAnchorY,
          maxHeight: vProcesuBottomLimit
            ? `${Math.max(vProcesuBottomLimit - vProcesuAnchorY, 120)}px`
            : `calc(100vh - ${vProcesuAnchorY}px - 80px)`
        }}>
          {/* Hlavička draweru */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 1rem 0.6rem 10px',
            borderBottom: '2px solid #c7d2fe',
            background: '#e0e7ff',
            flexShrink: 0,
            order: vProcesuOpenUpward ? 1 : 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#3730a3' }}>
              {activeVProcesuTitle}
            </div>
            <button
              onClick={() => setActiveVProcesuKey(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#64748b', lineHeight: 1, padding: '0 4px' }}
              title="Zavřít"
            >×</button>
          </div>
          {/* Obsah */}
          <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: '#c7d2fe #f1f5f9' }}>
            {(() => {
              const panelData = vProcesuPanels[activeVProcesuKey].data;
              if (panelData.length === 0) {
                return (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    Žádné objednávky v procesu
                  </div>
                );
              }
              return (
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Č. objednávky</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '36px' }}>💬</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Datum</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Objednatel</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Schvalovatel</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Stav</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Částka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelData.map((o, i) => (
                      <tr key={o.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', maxWidth: '200px' }}>
                          <a href={`${process.env.PUBLIC_URL}/order-form-25?edit=${o.id}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            onMouseOver={e => e.target.style.textDecoration='underline'}
                            onMouseOut={e => e.target.style.textDecoration='none'}>
                            {o.cislo_objednavky}
                          </a>
                          {o.predmet && (
                            <SmartTooltip text={o.predmet} preferredPosition="right" multiline={true}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxWidth: '180px', cursor: 'help' }}>
                                {o.predmet}
                              </div>
                            </SmartTooltip>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {(() => {
                            const oCount = commentCountOverrides[o.id] ?? o.comments_count ?? 0;
                            return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCommentsTooltip(
                                { id: o.id, cislo_objednavky: o.cislo_objednavky, comments_count: oCount, objednatel: o.objednatel, castka: o.castka },
                                { current: e.currentTarget }
                              );
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid',
                              borderColor: oCount > 0 ? '#3b82f6' : '#94a3b8',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '2px 5px',
                              color: oCount > 0 ? '#3b82f6' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = oCount > 0 ? '#eff6ff' : '#f1f5f9';
                              e.currentTarget.style.borderColor = oCount > 0 ? '#2563eb' : '#475569';
                              e.currentTarget.style.color = oCount > 0 ? '#2563eb' : '#334155';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.borderColor = oCount > 0 ? '#3b82f6' : '#94a3b8';
                              e.currentTarget.style.color = oCount > 0 ? '#3b82f6' : '#64748b';
                            }}
                            title={oCount > 0 ? `${oCount} komentářů` : 'Přidat komentář'}
                          >
                            <FontAwesomeIcon icon={faComment} style={{ fontSize: '0.75rem' }} />
                            {oCount > 0 && <span style={{ fontSize: '0.65rem' }}>{oCount}</span>}
                          </button>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{o.dt_vytvoreni ? new Date(o.dt_vytvoreni).toLocaleDateString('cs-CZ') : '—'}</td>
                        <td style={{ padding: '6px 10px', color: '#374151' }}>{o.objednatel || '—'}</td>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#374151' }}>{o.schvalovatel || '—'}</td>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>{o.stav}</span>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#0f172a' }}>
                          {o.castka ? new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(o.castka) + ' Kč' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={6} style={{ padding: '6px 10px', fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                        Celkem {panelData.length} {panelData.length === 1 ? 'objednávka' : panelData.length < 5 ? 'objednávky' : 'objednávek'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#0f172a' }}>
                        {new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
                          panelData.reduce((s, o) => s + (o.castka || 0), 0)
                        )} Kč
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>
        </VProcesuDrawer>,
        document.body
      )}

      {showCancelDialog && orderToCancel && ReactDOM.createPortal(
        <ApprovalDialogOverlay>
          <ApprovalDialog
            $narrow
            onClick={(e) => e.stopPropagation()}
            style={{ width: '525px', maxWidth: '90vw' }}
          >
            <ApprovalDialogHeader>
              <ApprovalDialogIcon $reject>
                <FontAwesomeIcon icon={faBan} />
              </ApprovalDialogIcon>
              <ApprovalDialogTitle>
                <span style={{ display: 'block' }}>Storno objednávky</span>
                <span style={{
                  display: 'block',
                  marginTop: '0.2rem',
                  fontSize: '0.9em',
                  fontWeight: 600,
                  color: '#d1fae5'
                }}>
                  Ev. č.: {orderToCancel.ev_cislo || orderToCancel.cislo_objednavky || orderToCancel.id || '---'}
                  <span style={{
                    marginLeft: '0.5rem',
                    color: '#bbf7d0'
                  }}>
                    ({orderToCancel.stav_objednavky || '---'})
                  </span>
                </span>
              </ApprovalDialogTitle>
            </ApprovalDialogHeader>
            <ApprovalDialogContent>
              <ApprovalDialogSection>
                <ApprovalSectionTitle>Důvod stornování</ApprovalSectionTitle>
                <ApprovalDialogTextarea
                  placeholder="Důvod stornování"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                {cancelReasonError && (
                  <ApprovalDialogError>{cancelReasonError}</ApprovalDialogError>
                )}
              </ApprovalDialogSection>
            </ApprovalDialogContent>

            <ApprovalDialogActions>
              <ApprovalDialogButton onClick={() => {
                setShowCancelDialog(false);
                setOrderToCancel(null);
                setCancelReason('');
                setCancelReasonError('');
              }}>
                Zrušit
              </ApprovalDialogButton>

              <ApprovalDialogButton $reject onClick={handleCancelOrder}>
                Storno objednávky
              </ApprovalDialogButton>
            </ApprovalDialogActions>
          </ApprovalDialog>
        </ApprovalDialogOverlay>,
        document.body
      )}
      
      {/* 🆕 Comments Tooltip */}
      {commentsTooltip.isOpen && ReactDOM.createPortal(
        <OrderCommentsTooltip
          orderId={commentsTooltip.orderId}
          orderNumber={commentsTooltip.orderNumber}
          orderInfo={commentsTooltip.orderInfo}
          iconRef={commentsTooltip.iconRef}
          onClose={() => setCommentsTooltip({
            isOpen: false,
            orderId: null,
            orderNumber: null,
            orderInfo: null,
            iconRef: null,
            comments: [],
            commentsCount: 0,
            loading: false,
            error: null,
          })}
          comments={commentsTooltip.comments}
          commentsCount={commentsTooltip.commentsCount}
          loading={commentsTooltip.loading}
          error={commentsTooltip.error}
          currentUserId={userId}
          onLoadComments={async () => {
            if (onLoadComments) {
              const result = await onLoadComments(commentsTooltip.orderId);
              setCommentsTooltip(prev => ({
                ...prev,
                comments: result.comments || [],
                commentsCount: result.comments_count || 0,
              }));
            }
          }}
          onAddComment={handleAddCommentInternal}
          onDeleteComment={handleDeleteCommentInternal}
          onUpdateComments={(updatedComments) => {
            // ✅ Optimalizace: Aktualizuj komentáře bez refresh
            setCommentsTooltip(prev => ({
              ...prev,
              comments: updatedComments,
              commentsCount: updatedComments.length || prev.commentsCount
            }));
          }}
          showToast={showToast}
          token={token}
          username={username}
        />,
        document.body
      )}

      {/* ✅ Confirm dialog pro reset sloupců */}
      <ConfirmDialog
        isOpen={resetColumnsConfirm}
        onClose={() => setResetColumnsConfirm(false)}
        onConfirm={() => {
          if (userId) {
            const storagePrefix = 'ordersV3_v3';
            localStorage.removeItem(`${storagePrefix}_columnVisibility_${userId}`);
            localStorage.removeItem(`${storagePrefix}_columnOrder_${userId}`);
            localStorage.removeItem(`${storagePrefix}_columnSizing_${userId}`);
            localStorage.removeItem(`${storagePrefix}_preferences_${userId}`);
            window.location.reload();
          }
          setResetColumnsConfirm(false);
        }}
        title="Reset nastavení sloupců"
        message="Resetovat všechna nastavení sloupců (viditelnost, pořadí, šířky)?"
        confirmText="Resetovat"
        cancelText="Zrušit"
        type="warning"
      />
    </>
  );
};

export default OrdersTableV3;
