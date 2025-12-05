import React from 'react';
import PropTypes from 'prop-types';
import './BookStatusBadge.css';

/**
 * BookStatusBadge - komponenta pro zobrazení stavu pokladní knihy
 *
 * Stavy:
 * - aktivni: Zelená - kniha je otevřená pro editaci
 * - uzavrena_uzivatelem: Žlutá - uzavřená uživatelem, může odemknout admin
 * - zamknuta_spravcem: Červená - zamčená správcem, nelze editovat
 */
const BookStatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'aktivni':
        return {
          label: 'Aktivní',
          className: 'status-badge status-active',
          icon: '✓',
          description: 'Kniha je otevřená pro zápis'
        };
      case 'uzavrena_uzivatelem':
        return {
          label: 'Uzavřena uživatelem',
          className: 'status-badge status-closed',
          icon: '⏸',
          description: 'Měsíc uzavřen, lze odemknout správcem'
        };
      case 'zamknuta_spravcem':
        return {
          label: 'Zamčena správcem',
          className: 'status-badge status-locked',
          icon: '🔒',
          description: 'Zamčeno správcem, nelze editovat'
        };
      default:
        return {
          label: 'Neznámý stav',
          className: 'status-badge status-unknown',
          icon: '?',
          description: status || 'Stav není definován'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={config.className} title={config.description}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-label">{config.label}</span>
    </div>
  );
};

BookStatusBadge.propTypes = {
  status: PropTypes.oneOf(['aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem']).isRequired
};

export default BookStatusBadge;
