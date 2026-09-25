import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SmartTooltip } from '../styles/SmartTooltip';

const formatKc = (value) =>
  `${(Number(value) || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;

/**
 * Výstražný trojúhelník u částky "V procesu" smlouvy.
 * Zobrazí se, když objednávka počítaná do "V procesu" (nedokončená OBJ, nebo Dokončená OBJ
 * s nedokončenou FA) má faktury, jejichž součet převyšuje částku objednávky.
 *
 * @param {Array} prekroceni - [{ cislo_objednavky, stav_objednavky, castka_objednavky, fakturovano, rozdil }]
 */
const SmlouvyPrekroceniWarning = ({ prekroceni, size = '0.8rem' }) => {
  if (!Array.isArray(prekroceni) || prekroceni.length === 0) return null;

  const text = [
    'Fakturace převyšuje částku objednávky:',
    ...prekroceni.map(p =>
      `• ${p.cislo_objednavky} (${p.stav_objednavky}): objednávka ${formatKc(p.castka_objednavky)}, `
      + `fakturováno ${formatKc(p.fakturovano)} (+${formatKc(p.rozdil)})`
    ),
    'Dokud nejsou objednávka i všechny její faktury dokončené, počítá se do „V procesu“ částka objednávky.'
  ].join('\n');

  return (
    <SmartTooltip text={text} icon="warning" multiline maxWidth="460px">
      <span style={{ display: 'inline-flex', alignItems: 'center', color: '#dc2626', cursor: 'help' }}>
        <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: size }} />
      </span>
    </SmartTooltip>
  );
};

export default SmlouvyPrekroceniWarning;
