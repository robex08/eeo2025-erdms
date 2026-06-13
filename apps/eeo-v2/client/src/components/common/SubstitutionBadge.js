import React from 'react';
import styled from 'styled-components';
import { Tooltip } from '@mui/material';

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
function SubstitutionBadge({ substitutionInfo, actionLabel = 'Provedeno' }) {
  if (!substitutionInfo || !substitutionInfo.is_substitution) {
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

  const tooltipText = `${actionLabel} v zastoupení za ${substitutionInfo.zastupovany_jmeno || '---'}\nČas: ${formatDateTime(substitutionInfo.dt_akce)}`;

  return (
    <Tooltip title={tooltipText} arrow placement="top">
      <BadgeIcon title={tooltipText}>👥</BadgeIcon>
    </Tooltip>
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
