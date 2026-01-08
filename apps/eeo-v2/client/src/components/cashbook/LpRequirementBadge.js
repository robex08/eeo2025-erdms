import React from 'react';
import PropTypes from 'prop-types';
import './LpRequirementBadge.css';

/**
 * LpRequirementBadge - komponenta pro zobrazení povinnosti LP kódu u pokladny
 *
 * Stavy:
 * - true: LP kód je povinný (červený badge)
 * - false: LP kód je volitelný (šedý badge)
 */
const LpRequirementBadge = ({ isRequired }) => {
  const config = isRequired
    ? {
        label: 'LP povinné',
        className: 'lp-badge lp-required',
        icon: '⚠',
        description: 'U výdajů z této pokladny je LP kód povinný'
      }
    : {
        label: 'LP volitelné',
        className: 'lp-badge lp-optional',
        icon: 'ⓘ',
        description: 'LP kód u výdajů z této pokladny je volitelný'
      };

  return (
    <div className={config.className} title={config.description}>
      <span className="lp-icon">{config.icon}</span>
      <span className="lp-label">{config.label}</span>
    </div>
  );
};

LpRequirementBadge.propTypes = {
  isRequired: PropTypes.bool.isRequired
};

export default LpRequirementBadge;
