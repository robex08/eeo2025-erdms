import React from 'react';
import styled from 'styled-components';
import { SmartTooltip } from '../../styles/SmartTooltip';

/**
 * 🎯 SubstitutionBadge - Komponenta pro zobrazení ikony zastoupení
 * 
 * Zobrazí ikonu 👥 vedle jména, pokud byla akce provedena v zastoupení.
 * Tooltip ukazuje: "Schváleno v zastoupení za [jméno zastupovaného], [čas]"
 * 
 * Použití:
 * <SubstitutionBadge
 *   substitutionInfo={{
 *     is_substitution: true,
 *     zastupovany_id: 100,
 *     zastupovany_jmeno: 'Jan Vokál',
 *     dt_akce: '2026-06-13 18:25:22'
 *   }}
 *   actionLabel="Schváleno"
 * />
 * 
 * Bez substituce: komponent vrací null (nic se nezobrazí)
 */
const formatPersonName = (person = {}) => {
  const parts = [];
  if (person.titul_pred) parts.push(person.titul_pred);
  if (person.prijmeni) parts.push(person.prijmeni);
  if (person.jmeno) parts.push(person.jmeno);
  if (person.titul_za) parts.push(person.titul_za);
  return parts.length > 0 ? parts.join(' ') : '---';
};

const normalizeSubstitutionInfo = (raw) => {
  if (!raw) return null;

  const zastupovany = {
    jmeno: raw.zastupovany_jmeno,
    prijmeni: raw.zastupovany_prijmeni,
    titul_pred: raw.zastupovany_titul_pred,
    titul_za: raw.zastupovany_titul_za,
  };

  const zastupce = {
    jmeno: raw.zastupce_jmeno,
    prijmeni: raw.zastupce_prijmeni,
    titul_pred: raw.zastupce_titul_pred,
    titul_za: raw.zastupce_titul_za,
  };

  const hasSubstitutionHint = Boolean(
    raw.is_substitution ||
      raw.zastupovany_id !== null && raw.zastupovany_id !== undefined ||
      raw.zastupovany_jmeno ||
      raw.zastupovany_prijmeni ||
      raw.zastupce_jmeno ||
      raw.zastupce_prijmeni
  );

  if (!hasSubstitutionHint) return null;

  return {
    is_substitution: true,
    dt_akce: raw.dt_akce,
    zastupovany,
    zastupce,
  };
};

function SubstitutionBadge({ substitutionInfo, actionLabel = 'Provedeno', actorName = '' }) {
  const normalizedInfo = normalizeSubstitutionInfo(substitutionInfo);

  if (!normalizedInfo) {
    return null;
  }

  // Formátuj čas na čitelnější formát
  const formatDateTime = (dt) => {
    if (!dt) return '';
    try {
      const date = new Date(dt.replace(' ', 'T'));
      return date.toLocaleString('cs-CZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dt;
    }
  };

  const zastupovanyName = formatPersonName(normalizedInfo.zastupovany);
  const rawZastupceName = formatPersonName(normalizedInfo.zastupce);
  const zastupceName = rawZastupceName !== '---' ? rawZastupceName : (actorName || '---');
  const actionDate = formatDateTime(normalizedInfo.dt_akce);

  const tooltipContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '290px', maxWidth: '420px' }}>
      <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
        Akce v zastoupení
      </div>

      <div style={{ fontSize: '0.8rem', color: 'white', lineHeight: 1.45 }}>
        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{actionLabel}:</span> v zastoupení za
        <span style={{ color: '#fde68a', fontWeight: 700 }}> {zastupovanyName}</span>
      </div>

      <div style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.45 }}>
        Provedl zástupce:
        <span style={{ color: '#bfdbfe', fontWeight: 600 }}> {zastupceName}</span>
      </div>

      {actionDate && (
        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.45 }}>
          Čas akce: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{actionDate}</span>
        </div>
      )}

      <div style={{ color: '#fcd34d', fontSize: '0.7rem', fontStyle: 'italic', borderLeft: '2px solid #f59e0b', paddingLeft: '0.5rem' }}>
        Akce byla provedena v době aktivního zástupu.
      </div>
    </div>
  );

  return (
    <SmartTooltip text={tooltipContent} preferredPosition="top" icon="none" interactive={true}>
      <BadgeIcon title={`${actionLabel} v zastoupení`}>👥</BadgeIcon>
    </SmartTooltip>
  );
}

const BadgeIcon = styled.span`
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.9em;
  cursor: help;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`;

export default SubstitutionBadge;
